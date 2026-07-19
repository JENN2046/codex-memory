'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { sha256 } = require('../../packages/chatgpt-r4-contracts');
const {
  assertDistinctEd25519Authorities,
  assertEd25519KeyPair,
  createStrictEd25519PublicKey,
  readSecretReference,
  validateSupplyChainEnvironment
} = require('../../apps/chatgpt-edge/external-main');

test('D2A runtime authority accepts only owner-only file references and non-placeholder identity', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-r4d-secrets-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const secretFile = path.join(root, 'relay-token');
  fs.writeFileSync(secretFile, 'synthetic-secret-value-not-a-live-token', { mode: 0o600 });
  assert.equal(readSecretReference(`file:${secretFile}`, { secretRoot: root }), 'synthetic-secret-value-not-a-live-token');

  const outside = path.join(os.tmpdir(), `codex-memory-r4d-outside-${crypto.randomUUID()}`);
  fs.writeFileSync(outside, 'synthetic-outside-value', { mode: 0o600 });
  t.after(() => fs.rmSync(outside, { force: true }));
  assert.throws(() => readSecretReference(`file:${outside}`, { secretRoot: root }), {
    code: 'edge_secret_reference_outside_root'
  });
  assert.throws(() => readSecretReference('synthetic-plaintext-token', { secretRoot: root }), {
    code: 'edge_secret_reference_invalid'
  });

  fs.chmodSync(secretFile, 0o644);
  assert.throws(() => readSecretReference(`file:${secretFile}`, { secretRoot: root }), {
    code: 'edge_secret_file_security_invalid'
  });

  const environment = supplyChainEnvironment();
  assert.equal(validateSupplyChainEnvironment(environment, {
    buildSourceCommit: environment.CODEX_MEMORY_R4_SOURCE_COMMIT
  }), true);
  for (const mutation of [
    { CODEX_MEMORY_R4_BINDING_DIGEST: `sha256:${'0'.repeat(64)}` },
    { CODEX_MEMORY_R4_SOURCE_COMMIT: 'abcdef1234567890abcdef1234567890abcdef12' },
    { CODEX_MEMORY_R4_LOCKFILE_SHA256: sha256('wrong-lockfile') },
    { CODEX_MEMORY_R4_EDGE_ARTIFACT_SHA256: 'placeholder' },
    { CODEX_MEMORY_R4_PREVIOUS_BINDING_REFERENCE: 'todo' }
  ]) {
    assert.throws(() => validateSupplyChainEnvironment({ ...environment, ...mutation }, {
      buildSourceCommit: environment.CODEX_MEMORY_R4_SOURCE_COMMIT
    }));
  }
  assert.throws(() => validateSupplyChainEnvironment(environment, {
    buildSourceCommit: 'abcdef1234567890abcdef1234567890abcdef12'
  }), { code: 'edge_runtime_source_commit_mismatch' });

  const signing = crypto.generateKeyPairSync('ed25519');
  assert.doesNotThrow(() => createStrictEd25519PublicKey(
    signing.publicKey.export({ type: 'spki', format: 'pem' }),
    'edge_runtime_public_key_material_invalid'
  ));
  assert.throws(() => createStrictEd25519PublicKey(
    signing.privateKey.export({ type: 'pkcs8', format: 'pem' }),
    'edge_runtime_public_key_material_invalid'
  ), { code: 'edge_runtime_public_key_material_invalid' });
  assert.equal(assertEd25519KeyPair(
    signing.privateKey,
    signing.publicKey,
    'edge_runtime_signing_key_pair_mismatch'
  ), true);
  const other = crypto.generateKeyPairSync('ed25519');
  assert.throws(() => assertEd25519KeyPair(
    signing.privateKey,
    other.publicKey,
    'edge_runtime_signing_key_pair_mismatch'
  ), { code: 'edge_runtime_signing_key_pair_mismatch' });
  assert.equal(assertDistinctEd25519Authorities(
    signing.publicKey,
    other.publicKey,
    'edge-key-v1',
    'relay-key-v1'
  ), true);
  assert.throws(() => assertDistinctEd25519Authorities(
    signing.publicKey,
    signing.publicKey,
    'edge-key-v1',
    'relay-key-v1'
  ), { code: 'edge_runtime_signing_authority_reused' });
  assert.throws(() => assertDistinctEd25519Authorities(
    signing.publicKey,
    other.publicKey,
    'shared-key-v1',
    'shared-key-v1'
  ), { code: 'edge_runtime_signing_key_id_reused' });
});

test('D2A Docker build context is narrow and base image is digest-pinned', () => {
  const dockerfile = fs.readFileSync(path.join(__dirname, '../../apps/chatgpt-edge/Dockerfile'), 'utf8');
  const dockerignore = fs.readFileSync(path.join(__dirname, '../../.dockerignore'), 'utf8');
  const dockerContextAllowlist = dockerignore.split(/\r?\n/u).filter(line => line.startsWith('!'));
  const expectedDockerContextAllowlist = [
    '!package.json',
    '!package-lock.json',
    '!apps/',
    '!apps/chatgpt-edge/',
    '!apps/chatgpt-edge/Dockerfile',
    '!apps/chatgpt-edge/auth0-token-verifier.js',
    '!apps/chatgpt-edge/candidate-tool-profile.js',
    '!apps/chatgpt-edge/external-http-runtime.js',
    '!apps/chatgpt-edge/external-main.js',
    '!apps/chatgpt-edge/external-mcp.js',
    '!apps/chatgpt-edge/index.js',
    '!apps/chatgpt-edge/loopback-runtime.js',
    '!apps/chatgpt-edge/package-boundary.json',
    '!apps/chatgpt-edge/request-envelope.js',
    '!apps/chatgpt-edge/transient-request-broker.js',
    '!apps/chatgpt-memory-scope-widget/',
    '!apps/chatgpt-memory-scope-widget/index.js',
    '!apps/chatgpt-memory-scope-widget/package-boundary.json',
    '!apps/chatgpt-memory-scope-widget/src/',
    '!apps/chatgpt-memory-scope-widget/src/bridge.js',
    '!apps/chatgpt-memory-scope-widget/src/dto.js',
    '!apps/chatgpt-memory-scope-widget/src/html.js',
    '!apps/chatgpt-memory-scope-widget/src/resource.js',
    '!packages/',
    '!packages/chatgpt-r4-contracts/',
    '!packages/chatgpt-r4-contracts/builders.js',
    '!packages/chatgpt-r4-contracts/canonical.js',
    '!packages/chatgpt-r4-contracts/constants.js',
    '!packages/chatgpt-r4-contracts/errors.js',
    '!packages/chatgpt-r4-contracts/external-runtime-preflight.js',
    '!packages/chatgpt-r4-contracts/index.js',
    '!packages/chatgpt-r4-contracts/package.json',
    '!packages/chatgpt-r4-contracts/replay-guard.js',
    '!packages/chatgpt-r4-contracts/schemas.js',
    '!packages/chatgpt-r4-contracts/self-hosted-binding-amendment.js',
    '!packages/chatgpt-r4-contracts/signatures.js',
    '!packages/chatgpt-r4-contracts/validators.js'
  ];
  assert.match(dockerfile, /^FROM node:22\.23\.1-bookworm-slim@sha256:[a-f0-9]{64}$/mu);
  assert.match(dockerfile, /npm ci --omit=dev --ignore-scripts/u);
  assert.match(dockerfile, /> \/app\/\.build-source-commit/u);
  assert.match(dockerfile, /chmod 0444 \/app\/package\.json \/app\/package-lock\.json \/app\/\.build-source-commit/u);
  assert.doesNotMatch(dockerfile, /COPY --chown=node:node/u);
  assert.match(dockerfile, /^USER node$/mu);
  assert.match(dockerfile, /HEALTHCHECK/u);
  assert.match(dockerfile, /ENTRYPOINT \["node", "apps\/chatgpt-edge\/external-main\.js"\]/u);
  assert.match(dockerignore, /^\*\*$/mu);
  assert.deepEqual(dockerContextAllowlist, expectedDockerContextAllowlist);
  assert.equal(dockerContextAllowlist.every(entry => !entry.includes('*')), true);
  assert.equal(dockerContextAllowlist.some(entry => /(?:^|\/)(?:\.env|logs?|tmp|scratch)(?:[./]|$)/u.test(entry)), false);
});

function supplyChainEnvironment() {
  return {
    CODEX_MEMORY_R4_OPERATOR_REFERENCE: 'operator:jenn-owner',
    CODEX_MEMORY_R4_HOST_PROJECT_REFERENCE: 'host:private-development',
    CODEX_MEMORY_R4_PREVIOUS_BINDING_REFERENCE: 'binding:previous-v1',
    CODEX_MEMORY_R4_BINDING_DIGEST: sha256('binding'),
    CODEX_MEMORY_R4_LOCKFILE_SHA256: sha256(fs.readFileSync(path.join(__dirname, '../../package-lock.json'))),
    CODEX_MEMORY_R4_EDGE_ARTIFACT_SHA256: sha256('artifact'),
    CODEX_MEMORY_R4_SOURCE_COMMIT: '1234567890abcdef1234567890abcdef12345678'
  };
}
