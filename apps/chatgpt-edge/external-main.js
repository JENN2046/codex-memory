#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { reject, sha256 } = require('../../packages/chatgpt-r4-contracts');
const { createExternalEdgeRuntime } = require('./external-http-runtime');

const DEFAULT_SECRET_ROOT = '/run/secrets/codex-memory-r4';
const DEFAULT_LOCKFILE_PATH = path.resolve(__dirname, '../../package-lock.json');
const DEFAULT_BUILD_SOURCE_FILE = path.resolve(__dirname, '../../.build-source-commit');

function loadExternalEdgeRuntimeFromEnvironment(environment = process.env, {
  secretRoot = DEFAULT_SECRET_ROOT,
  lockfilePath = DEFAULT_LOCKFILE_PATH,
  buildSourceFile = DEFAULT_BUILD_SOURCE_FILE,
  readFileSync = fs.readFileSync,
  statSync = fs.statSync,
  realpathSync = fs.realpathSync
} = {}) {
  let buildSourceCommit;
  try {
    buildSourceCommit = normalizeBuildSourceCommit(readFileSync(buildSourceFile, 'utf8'));
  } catch (error) {
    if (error?.code === 'edge_runtime_build_source_invalid') throw error;
    reject('edge_runtime_build_source_unavailable');
  }
  validateSupplyChainEnvironment(environment, { lockfilePath, buildSourceCommit, readFileSync });
  const edgePrivateKeyPem = readSecretReference(
    getEnvironment(environment, 'CODEX_MEMORY_R4_EDGE_SIGNING_PRIVATE_KEY'),
    { secretRoot, readFileSync, statSync, realpathSync }
  );
  const edgePublicKeyPem = readSecretReference(
    getEnvironment(environment, 'CODEX_MEMORY_R4_EDGE_SIGNING_PUBLIC_KEY'),
    { secretRoot, readFileSync, statSync, realpathSync }
  );
  const relayPublicKeyPem = readSecretReference(
    getEnvironment(environment, 'CODEX_MEMORY_R4_RELAY_SIGNING_PUBLIC_KEY'),
    { secretRoot, readFileSync, statSync, realpathSync }
  );
  const relayAuthToken = readSecretReference(
    getEnvironment(environment, 'CODEX_MEMORY_R4_RELAY_AUTH_TOKEN'),
    { secretRoot, readFileSync, statSync, realpathSync }
  );

  let edgePrivateKey;
  let edgePublicKey;
  let relayPublicKey;
  try {
    edgePrivateKey = crypto.createPrivateKey(edgePrivateKeyPem);
    edgePublicKey = createStrictEd25519PublicKey(edgePublicKeyPem, 'edge_runtime_public_key_material_invalid');
    relayPublicKey = createStrictEd25519PublicKey(relayPublicKeyPem, 'edge_runtime_public_key_material_invalid');
  } catch {
    reject('edge_runtime_key_material_invalid');
  }
  assertEd25519KeyPair(edgePrivateKey, edgePublicKey, 'edge_runtime_signing_key_pair_mismatch');
  const edgeSigningKeyId = getEnvironment(environment, 'CODEX_MEMORY_R4_EDGE_SIGNING_KEY_ID');
  const relaySigningKeyId = getEnvironment(environment, 'CODEX_MEMORY_R4_RELAY_SIGNING_KEY_ID');
  assertDistinctEd25519Authorities(
    edgePublicKey,
    relayPublicKey,
    edgeSigningKeyId,
    relaySigningKeyId
  );

  return createExternalEdgeRuntime({
    publicOrigin: getEnvironment(environment, 'CODEX_MEMORY_R4_PUBLIC_ORIGIN'),
    issuer: getEnvironment(environment, 'CODEX_MEMORY_R4_AUTH0_ISSUER'),
    jwksUri: getEnvironment(environment, 'CODEX_MEMORY_R4_AUTH0_JWKS_URI'),
    oauthClientId: getEnvironment(environment, 'CODEX_MEMORY_R4_OAUTH_CLIENT_ID'),
    operatorSubjectFingerprint: getEnvironment(
      environment,
      'CODEX_MEMORY_R4_OPERATOR_SUBJECT_FINGERPRINT'
    ),
    edgeSigning: {
      privateKey: edgePrivateKey,
      keyId: edgeSigningKeyId
    },
    relaySigningPublicKey: relayPublicKey,
    relaySigningKeyId,
    relayAuthToken: normalizeSingleLineSecret(relayAuthToken),
    bindHost: environment.CODEX_MEMORY_R4_EDGE_BIND_HOST || '0.0.0.0',
    bindPort: parseIntegerEnvironment(environment.CODEX_MEMORY_R4_EDGE_PORT || '8080', 'edge_bind_port_invalid'),
    containerLoopbackPublishRequired: environment.CODEX_MEMORY_R4_CONTAINER_LOOPBACK_PUBLISH_REQUIRED === 'true',
    requestTtlSeconds: parseIntegerEnvironment(
      environment.CODEX_MEMORY_R4_REQUEST_TTL_SECONDS || '30',
      'edge_request_ttl_invalid'
    ),
    maxInFlight: parseIntegerEnvironment(
      environment.CODEX_MEMORY_R4_MAX_IN_FLIGHT || '32',
      'edge_inflight_limit_invalid'
    )
  });
}

function assertEd25519KeyPair(privateKey, publicKey, code) {
  if (privateKey?.type !== 'private' || privateKey.asymmetricKeyType !== 'ed25519' ||
      publicKey?.type !== 'public' || publicKey.asymmetricKeyType !== 'ed25519') reject(code);
  const derived = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'der' });
  const bound = publicKey.export({ type: 'spki', format: 'der' });
  if (!derived.equals(bound)) reject(code);
  return true;
}

function assertDistinctEd25519Authorities(edgePublicKey, relayPublicKey, edgeKeyId, relayKeyId) {
  if (edgePublicKey?.type !== 'public' || edgePublicKey.asymmetricKeyType !== 'ed25519' ||
      relayPublicKey?.type !== 'public' || relayPublicKey.asymmetricKeyType !== 'ed25519') {
    reject('edge_runtime_signing_authority_invalid');
  }
  const edgeDer = edgePublicKey.export({ type: 'spki', format: 'der' });
  const relayDer = relayPublicKey.export({ type: 'spki', format: 'der' });
  if (edgeDer.equals(relayDer)) reject('edge_runtime_signing_authority_reused');
  if (edgeKeyId === relayKeyId) reject('edge_runtime_signing_key_id_reused');
  return true;
}

function createStrictEd25519PublicKey(value, code) {
  if (typeof value !== 'string' || value.includes('\r') ||
      !/^-----BEGIN PUBLIC KEY-----\n(?:[A-Za-z0-9+/]{1,64}={0,2}\n)+-----END PUBLIC KEY-----\n?$/u.test(value)) {
    reject(code);
  }
  let key;
  try {
    key = crypto.createPublicKey(value);
  } catch {
    reject(code);
  }
  if (key.type !== 'public' || key.asymmetricKeyType !== 'ed25519') reject(code);
  return key;
}

function validateSupplyChainEnvironment(environment, {
  lockfilePath = DEFAULT_LOCKFILE_PATH,
  buildSourceCommit = environment?.CODEX_MEMORY_R4_BUILD_SOURCE_COMMIT,
  readFileSync = fs.readFileSync
} = {}) {
  const requiredOpaqueReferences = [
    'CODEX_MEMORY_R4_OPERATOR_REFERENCE',
    'CODEX_MEMORY_R4_HOST_PROJECT_REFERENCE',
    'CODEX_MEMORY_R4_PREVIOUS_BINDING_REFERENCE'
  ];
  for (const name of requiredOpaqueReferences) {
    const value = getEnvironment(environment, name);
    if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]{2,255}$/u.test(value) || /placeholder|example|todo/iu.test(value)) {
      reject('edge_runtime_binding_reference_invalid');
    }
  }
  assertDigest(
    getEnvironment(environment, 'CODEX_MEMORY_R4_BINDING_DIGEST'),
    /^sha256:[a-f0-9]{64}$/u,
    'edge_runtime_binding_digest_invalid'
  );
  const expectedLockfileDigest = getEnvironment(environment, 'CODEX_MEMORY_R4_LOCKFILE_SHA256');
  assertDigest(
    expectedLockfileDigest,
    /^sha256:[a-f0-9]{64}$/u,
    'edge_runtime_lockfile_digest_invalid'
  );
  let actualLockfileDigest;
  try {
    actualLockfileDigest = sha256(readFileSync(lockfilePath));
  } catch {
    reject('edge_runtime_lockfile_unavailable');
  }
  if (actualLockfileDigest !== expectedLockfileDigest) reject('edge_runtime_lockfile_digest_mismatch');
  assertDigest(
    getEnvironment(environment, 'CODEX_MEMORY_R4_EDGE_ARTIFACT_SHA256'),
    /^sha256:[a-f0-9]{64}$/u,
    'edge_runtime_artifact_digest_invalid'
  );
  const expectedSourceCommit = getEnvironment(environment, 'CODEX_MEMORY_R4_SOURCE_COMMIT');
  assertDigest(
    expectedSourceCommit,
    /^[a-f0-9]{40}$/u,
    'edge_runtime_source_commit_invalid'
  );
  const actualSourceCommit = normalizeBuildSourceCommit(buildSourceCommit);
  if (actualSourceCommit !== expectedSourceCommit) reject('edge_runtime_source_commit_mismatch');
  return true;
}

function normalizeBuildSourceCommit(value) {
  if (typeof value !== 'string') reject('edge_runtime_build_source_invalid');
  const normalized = value.endsWith('\n') ? value.slice(0, -1) : value;
  if (!/^[a-f0-9]{40}$/u.test(normalized) || /^(.)\1+$/u.test(normalized)) {
    reject('edge_runtime_build_source_invalid');
  }
  return normalized;
}

function readSecretReference(reference, {
  secretRoot = DEFAULT_SECRET_ROOT,
  readFileSync = fs.readFileSync,
  statSync = fs.statSync,
  realpathSync = fs.realpathSync
} = {}) {
  if (typeof reference !== 'string' || !reference.startsWith('file:')) {
    reject('edge_secret_reference_invalid');
  }
  const requested = reference.slice(5);
  if (!path.isAbsolute(requested)) reject('edge_secret_reference_invalid');
  let root;
  let target;
  try {
    root = realpathSync(secretRoot);
    target = realpathSync(requested);
  } catch {
    reject('edge_secret_reference_unavailable');
  }
  const relative = path.relative(root, target);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    reject('edge_secret_reference_outside_root');
  }
  let stat;
  let rootStat;
  try {
    rootStat = statSync(root);
    stat = statSync(target);
  } catch {
    reject('edge_secret_reference_unavailable');
  }
  const currentUid = typeof process.getuid === 'function' ? process.getuid() : null;
  if (!rootStat.isDirectory() || (rootStat.mode & 0o077) !== 0 ||
      (currentUid !== null && rootStat.uid !== currentUid) ||
      !stat.isFile() || (stat.mode & 0o077) !== 0 ||
      (currentUid !== null && stat.uid !== currentUid) || stat.size < 1 || stat.size > 16_384) {
    reject('edge_secret_file_security_invalid');
  }
  const value = readFileSync(target, 'utf8');
  if (typeof value !== 'string' || value.length < 1 || value.length > 16_384 || value.includes('\0')) {
    reject('edge_secret_value_invalid');
  }
  return value;
}

function normalizeSingleLineSecret(value) {
  if (typeof value !== 'string' || value.includes('\r')) reject('edge_secret_value_invalid');
  const normalized = value.endsWith('\n') ? value.slice(0, -1) : value;
  if (!normalized || normalized.includes('\n') || normalized.trim() !== normalized) {
    reject('edge_secret_value_invalid');
  }
  return normalized;
}

function getEnvironment(environment, name) {
  const value = environment?.[name];
  if (typeof value !== 'string' || value.length < 1 || value.length > 16_384 || value.trim() !== value) {
    reject('edge_runtime_environment_missing');
  }
  return value;
}

function parseIntegerEnvironment(value, code) {
  if (!/^(?:0|[1-9][0-9]{0,5})$/u.test(value)) reject(code);
  return Number(value);
}

function assertDigest(value, pattern, code) {
  if (!pattern.test(value)) reject(code);
  const body = value.includes(':') ? value.slice(value.indexOf(':') + 1) : value;
  if (/^(.)\1+$/u.test(body)) reject(`${code}_placeholder`);
}

async function main() {
  const runtime = loadExternalEdgeRuntimeFromEnvironment();
  await runtime.start();
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await runtime.stop();
  };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
}

if (require.main === module) {
  main().catch(error => {
    const code = typeof error?.code === 'string' && /^[a-z][a-z0-9_]{0,79}$/u.test(error.code)
      ? error.code
      : 'edge_runtime_start_failed';
    process.stderr.write(`${code}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_SECRET_ROOT,
  DEFAULT_LOCKFILE_PATH,
  DEFAULT_BUILD_SOURCE_FILE,
  assertDigest,
  assertDistinctEd25519Authorities,
  assertEd25519KeyPair,
  createStrictEd25519PublicKey,
  loadExternalEdgeRuntimeFromEnvironment,
  normalizeBuildSourceCommit,
  normalizeSingleLineSecret,
  parseIntegerEnvironment,
  readSecretReference,
  getEnvironment,
  validateSupplyChainEnvironment
};
