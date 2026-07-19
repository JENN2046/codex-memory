'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const {
  assertCanonicalIssuer,
  assertCanonicalPublicOrigin,
  reject
} = require('../../packages/chatgpt-r4-contracts');
const { createOutboundRelayRuntime } = require('./outbound-runtime');

const DEFAULT_RELAY_SECRET_ROOT = '/run/secrets/codex-memory-r4-relay';

function loadOutboundRelayRuntimeFromEnvironment(environment = process.env, {
  secretRoot = DEFAULT_RELAY_SECRET_ROOT,
  readFileSync = fs.readFileSync,
  statSync = fs.statSync,
  realpathSync = fs.realpathSync,
  edgeRequest
} = {}) {
  validateBindingEnvironment(environment);
  const edgeOrigin = getEnvironment(environment, 'CODEX_MEMORY_R4_PUBLIC_ORIGIN');
  const issuer = getEnvironment(environment, 'CODEX_MEMORY_R4_AUTH0_ISSUER');
  assertCanonicalPublicOrigin(edgeOrigin);
  assertCanonicalIssuer(issuer);

  const edgePublicKeyPem = readSecretReference(
    getEnvironment(environment, 'CODEX_MEMORY_R4_EDGE_SIGNING_PUBLIC_KEY'),
    { secretRoot, readFileSync, statSync, realpathSync }
  );
  const relayPrivateKeyPem = readSecretReference(
    getEnvironment(environment, 'CODEX_MEMORY_R4_RELAY_SIGNING_PRIVATE_KEY'),
    { secretRoot, readFileSync, statSync, realpathSync }
  );
  const relayPublicKeyPem = readSecretReference(
    getEnvironment(environment, 'CODEX_MEMORY_R4_RELAY_SIGNING_PUBLIC_KEY'),
    { secretRoot, readFileSync, statSync, realpathSync }
  );
  const relayAuthToken = normalizeSingleLineSecret(readSecretReference(
    getEnvironment(environment, 'CODEX_MEMORY_R4_RELAY_AUTH_TOKEN'),
    { secretRoot, readFileSync, statSync, realpathSync }
  ));

  let edgePublicKey;
  let relayPrivateKey;
  let relayPublicKey;
  try {
    edgePublicKey = createStrictEd25519PublicKey(edgePublicKeyPem, 'relay_runtime_public_key_material_invalid');
    relayPrivateKey = crypto.createPrivateKey(relayPrivateKeyPem);
    relayPublicKey = createStrictEd25519PublicKey(relayPublicKeyPem, 'relay_runtime_public_key_material_invalid');
  } catch {
    reject('relay_runtime_key_material_invalid');
  }
  if (edgePublicKey.asymmetricKeyType !== 'ed25519' || relayPrivateKey.asymmetricKeyType !== 'ed25519' ||
      relayPublicKey.asymmetricKeyType !== 'ed25519') {
    reject('relay_runtime_signing_algorithm_invalid');
  }
  const relayPublicDer = crypto.createPublicKey(relayPrivateKey).export({ type: 'spki', format: 'der' });
  const boundRelayPublicDer = relayPublicKey.export({ type: 'spki', format: 'der' });
  if (!relayPublicDer.equals(boundRelayPublicDer)) reject('relay_runtime_signing_key_pair_mismatch');
  const edgePublicDer = edgePublicKey.export({ type: 'spki', format: 'der' });
  if (relayPublicDer.equals(edgePublicDer)) reject('relay_runtime_signing_authority_reused');

  const edgeKeyId = keyId(environment, 'CODEX_MEMORY_R4_EDGE_SIGNING_KEY_ID');
  const relayKeyId = keyId(environment, 'CODEX_MEMORY_R4_RELAY_SIGNING_KEY_ID');
  if (edgeKeyId === relayKeyId) reject('relay_runtime_signing_key_id_reused');
  const relayId = environment.CODEX_MEMORY_R4_RELAY_ID === undefined
    ? undefined
    : keyId(environment, 'CODEX_MEMORY_R4_RELAY_ID');

  return createOutboundRelayRuntime({
    edgeOrigin,
    relayAuthToken,
    socketPath: validateSocketPath(getEnvironment(environment, 'CODEX_MEMORY_R4_RELAY_UDS_PATH')),
    relayId,
    expectedIssuer: issuer,
    expectedAudience: edgeOrigin,
    resolveRequestPublicKey: candidate => candidate === edgeKeyId ? edgePublicKey : null,
    resolvePrincipalPublicKey: candidate =>
      candidate?.issuer === issuer && candidate?.key_id === edgeKeyId ? edgePublicKey : null,
    responseSigning: { privateKey: relayPrivateKey, keyId: relayKeyId },
    edgeTimeoutMs: integerEnvironment(environment.CODEX_MEMORY_R4_RELAY_EDGE_TIMEOUT_MS || '5000', 10, 30_000),
    udsTimeoutMs: integerEnvironment(environment.CODEX_MEMORY_R4_RELAY_UDS_TIMEOUT_MS || '2000', 10, 30_000),
    cancelPollMs: integerEnvironment(environment.CODEX_MEMORY_R4_RELAY_CANCEL_POLL_MS || '250', 1, 1000),
    edgeRequest
  });
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

function validateBindingEnvironment(environment) {
  for (const name of [
    'CODEX_MEMORY_R4_OPERATOR_REFERENCE',
    'CODEX_MEMORY_R4_HOST_PROJECT_REFERENCE',
    'CODEX_MEMORY_R4_BINDING_REFERENCE',
    'CODEX_MEMORY_R4_PREVIOUS_BINDING_REFERENCE',
    'CODEX_MEMORY_R4_PREVIOUS_HOST_CONFIG_REFERENCE'
  ]) {
    const value = getEnvironment(environment, name);
    if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]{2,255}$/u.test(value) || /placeholder|example|todo/iu.test(value)) {
      reject('relay_runtime_binding_reference_invalid');
    }
  }
  const digest = getEnvironment(environment, 'CODEX_MEMORY_R4_BINDING_DIGEST');
  if (!/^sha256:[a-f0-9]{64}$/u.test(digest) || /^(.)\1+$/u.test(digest.slice(7))) {
    reject('relay_runtime_binding_digest_invalid');
  }
  return true;
}

function readSecretReference(reference, {
  secretRoot = DEFAULT_RELAY_SECRET_ROOT,
  readFileSync = fs.readFileSync,
  statSync = fs.statSync,
  realpathSync = fs.realpathSync
} = {}) {
  if (typeof reference !== 'string' || !reference.startsWith('file:')) {
    reject('relay_secret_reference_invalid');
  }
  const requested = reference.slice(5);
  if (!path.isAbsolute(requested)) reject('relay_secret_reference_invalid');
  let root;
  let target;
  try {
    root = realpathSync(secretRoot);
    target = realpathSync(requested);
  } catch {
    reject('relay_secret_reference_unavailable');
  }
  const relative = path.relative(root, target);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    reject('relay_secret_reference_outside_root');
  }
  let rootStat;
  let stat;
  try {
    rootStat = statSync(root);
    stat = statSync(target);
  } catch {
    reject('relay_secret_reference_unavailable');
  }
  const currentUid = typeof process.getuid === 'function' ? process.getuid() : null;
  if (!rootStat.isDirectory() || (rootStat.mode & 0o077) !== 0 ||
      (currentUid !== null && rootStat.uid !== currentUid) ||
      !stat.isFile() || (stat.mode & 0o077) !== 0 ||
      (currentUid !== null && stat.uid !== currentUid) || stat.size < 1 || stat.size > 16_384) {
    reject('relay_secret_file_security_invalid');
  }
  const value = readFileSync(target, 'utf8');
  if (typeof value !== 'string' || value.length < 1 || value.length > 16_384 || value.includes('\0')) {
    reject('relay_secret_value_invalid');
  }
  return value;
}

function normalizeSingleLineSecret(value) {
  if (typeof value !== 'string' || value.includes('\r')) reject('relay_secret_value_invalid');
  const normalized = value.endsWith('\n') ? value.slice(0, -1) : value;
  if (!normalized || normalized.includes('\n') || normalized.trim() !== normalized) {
    reject('relay_secret_value_invalid');
  }
  return normalized;
}

function getEnvironment(environment, name) {
  const value = environment?.[name];
  if (typeof value !== 'string' || value.length < 1 || value.length > 16_384 || value.trim() !== value) {
    reject('relay_runtime_environment_missing');
  }
  return value;
}

function keyId(environment, name) {
  const value = getEnvironment(environment, name);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/u.test(value)) reject('relay_runtime_key_id_invalid');
  return value;
}

function validateSocketPath(value) {
  if (!path.isAbsolute(value) || value.includes('\0') || value.length > 512) {
    reject('relay_uds_path_invalid');
  }
  return value;
}

function integerEnvironment(value, minimum, maximum) {
  if (!/^(?:0|[1-9][0-9]{0,5})$/u.test(value)) reject('relay_runtime_integer_invalid');
  const parsed = Number(value);
  if (parsed < minimum || parsed > maximum) reject('relay_runtime_integer_invalid');
  return parsed;
}

module.exports = {
  createStrictEd25519PublicKey,
  DEFAULT_RELAY_SECRET_ROOT,
  getEnvironment,
  integerEnvironment,
  keyId,
  loadOutboundRelayRuntimeFromEnvironment,
  normalizeSingleLineSecret,
  readSecretReference,
  validateBindingEnvironment,
  validateSocketPath
};
