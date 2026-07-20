'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const {
  assertCanonicalIssuer,
  assertCanonicalPublicOrigin,
  canonicalJson,
  deepFreeze,
  sha256,
  reject
} = require('../../../packages/chatgpt-r4-contracts');
const { createCodexMemoryApplication } = require('../../app');
const { loadDiaryScopeMapping } = require('../../core/DiaryScopeMappingLoader');
const { resolveRead } = require('../../core/DiaryScopeMapping');
const {
  createR4GovernanceRuntime,
  R4_LIVE_READ_MODE
} = require('../../adapters/chatgpt-r4/governed-live-read-runtime');
const { validateProjectRegistry } = require('../../adapters/chatgpt-r4/project-registry');
const { createGovernanceUdsServer } = require('./governance-uds-server');

const DEFAULT_PRIVATE_ROOT = '/run/secrets/codex-memory-r4-governance';
const MAX_PRIVATE_FILE_BYTES = 262_144;

function getEnvironment(environment, name) {
  const value = environment?.[name];
  if (typeof value !== 'string' || !value || value.trim() !== value || value.length > 4096) {
    reject('r4_governance_environment_missing');
  }
  return value;
}

function validatePrivateRoot(root, { statSync = fs.statSync, realpathSync = fs.realpathSync } = {}) {
  let resolved;
  let stat;
  try {
    resolved = realpathSync(root);
    stat = statSync(resolved);
  } catch {
    reject('r4_governance_private_root_unavailable');
  }
  const currentUid = typeof process.getuid === 'function' ? process.getuid() : null;
  if (!stat.isDirectory() || (stat.mode & 0o077) !== 0 ||
      (currentUid !== null && stat.uid !== currentUid)) {
    reject('r4_governance_private_root_security_invalid');
  }
  return resolved;
}

function readPrivateReference(reference, {
  privateRoot,
  readFileSync = fs.readFileSync,
  statSync = fs.statSync,
  realpathSync = fs.realpathSync
} = {}) {
  if (typeof reference !== 'string' || !reference.startsWith('file:')) {
    reject('r4_governance_private_reference_invalid');
  }
  const root = validatePrivateRoot(privateRoot, { statSync, realpathSync });
  let target;
  let stat;
  try {
    target = realpathSync(reference.slice(5));
    stat = statSync(target);
  } catch {
    reject('r4_governance_private_reference_unavailable');
  }
  const relative = path.relative(root, target);
  const currentUid = typeof process.getuid === 'function' ? process.getuid() : null;
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) ||
      !stat.isFile() || (stat.mode & 0o077) !== 0 ||
      (currentUid !== null && stat.uid !== currentUid) ||
      stat.size < 1 || stat.size > MAX_PRIVATE_FILE_BYTES) {
    reject('r4_governance_private_reference_security_invalid');
  }
  const value = readFileSync(target, 'utf8');
  if (typeof value !== 'string' || value.includes('\0') ||
      Buffer.byteLength(value, 'utf8') > MAX_PRIVATE_FILE_BYTES) {
    reject('r4_governance_private_value_invalid');
  }
  return value;
}

function parsePrivateJson(value, code) {
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) reject(code);
    return parsed;
  } catch (error) {
    if (error?.code === code) throw error;
    reject(code);
  }
}

function normalizeSingleLineSecret(value) {
  if (typeof value !== 'string' || value.includes('\r')) reject('r4_governance_secret_invalid');
  const normalized = value.endsWith('\n') ? value.slice(0, -1) : value;
  if (!normalized || normalized.includes('\n') || normalized.trim() !== normalized) {
    reject('r4_governance_secret_invalid');
  }
  return normalized;
}

function parseEd25519PrivateKey(value) {
  let key;
  try {
    key = crypto.createPrivateKey(value);
  } catch {
    reject('r4_governance_context_key_invalid');
  }
  if (key.type !== 'private' || key.asymmetricKeyType !== 'ed25519') {
    reject('r4_governance_context_key_invalid');
  }
  return key;
}

function parseEd25519PublicKey(value) {
  let key;
  try {
    key = crypto.createPublicKey(value);
  } catch {
    reject('r4_governance_edge_key_invalid');
  }
  if (key.type !== 'public' || key.asymmetricKeyType !== 'ed25519') {
    reject('r4_governance_edge_key_invalid');
  }
  return key;
}

function assertDigest(value, code) {
  if (!/^sha256:[a-f0-9]{64}$/u.test(value) || /^(.)\1+$/u.test(value.slice(7))) reject(code);
  return value;
}

function assertSafeReference(value, code) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(value) ||
      /placeholder|example|todo|secret|token/iu.test(value)) reject(code);
  return value;
}

function governanceBindingPayload(environment) {
  return {
    schemaVersion: 1,
    bindingReference: getEnvironment(environment, 'CODEX_MEMORY_R4_GOVERNANCE_BINDING_REFERENCE'),
    rollbackReference: getEnvironment(environment, 'CODEX_MEMORY_R4_GOVERNANCE_ROLLBACK_REFERENCE'),
    counterMode: getEnvironment(environment, 'CODEX_MEMORY_R4_COUNTER_MODE'),
    liveReadEnabled: getEnvironment(environment, 'CODEX_MEMORY_R4_GOVERNANCE_LIVE_READ_ENABLED'),
    mappingFileReference: getEnvironment(environment, 'CODEX_MEMORY_R4_DIARY_SCOPE_MAPPING_REFERENCE'),
    registryFileReference: getEnvironment(environment, 'CODEX_MEMORY_R4_PROJECT_REGISTRY_REFERENCE'),
    contextSigningKeyReference: getEnvironment(
      environment,
      'CODEX_MEMORY_R4_CONTEXT_SIGNING_PRIVATE_KEY_REFERENCE'
    ),
    edgeSigningKeyReference: getEnvironment(environment, 'CODEX_MEMORY_R4_EDGE_SIGNING_PUBLIC_KEY'),
    nativeTokenReference: getEnvironment(environment, 'CODEX_MEMORY_R4_NATIVE_HTTP_TOKEN_REFERENCE'),
    expectedMappingReference: getEnvironment(environment, 'CODEX_MEMORY_R4_EXPECTED_MAPPING_REFERENCE'),
    expectedMappingDigest: getEnvironment(environment, 'CODEX_MEMORY_R4_EXPECTED_MAPPING_DIGEST'),
    expectedRegistryReference: getEnvironment(environment, 'CODEX_MEMORY_R4_EXPECTED_REGISTRY_REFERENCE'),
    expectedRegistryDigest: getEnvironment(environment, 'CODEX_MEMORY_R4_EXPECTED_REGISTRY_DIGEST'),
    selectedProjectAlias: getEnvironment(environment, 'CODEX_MEMORY_R4_LIVE_READ_PROJECT_ALIAS'),
    publicOrigin: getEnvironment(environment, 'CODEX_MEMORY_R4_PUBLIC_ORIGIN'),
    issuer: getEnvironment(environment, 'CODEX_MEMORY_R4_AUTH0_ISSUER'),
    edgeSigningKeyId: getEnvironment(environment, 'CODEX_MEMORY_R4_EDGE_SIGNING_KEY_ID'),
    contextSigningKeyId: getEnvironment(environment, 'CODEX_MEMORY_R4_CONTEXT_SIGNING_KEY_ID'),
    stateRoot: getEnvironment(environment, 'CODEX_MEMORY_R4_GOVERNANCE_STATE_ROOT'),
    socketPath: getEnvironment(environment, 'CODEX_MEMORY_R4_RELAY_UDS_PATH'),
    nativeTargetReference: getEnvironment(environment, 'CODEX_MEMORY_R4_NATIVE_TARGET_REFERENCE'),
    nativeEndpoint: getEnvironment(environment, 'CODEX_MEMORY_R4_NATIVE_HTTP_ENDPOINT')
  };
}

function computeGovernanceRuntimeBindingDigest(environment) {
  return sha256(canonicalJson(governanceBindingPayload(environment)));
}

function validateLoopbackEndpoint(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    reject('r4_governance_native_endpoint_invalid');
  }
  if (parsed.protocol !== 'http:' || !['127.0.0.1', '::1', 'localhost'].includes(parsed.hostname) ||
      parsed.username || parsed.password || parsed.search || parsed.hash) {
    reject('r4_governance_native_endpoint_invalid');
  }
  return parsed.href;
}

function validateOwnedDirectoryWithinRoot(value, root, { statSync = fs.statSync, realpathSync = fs.realpathSync } = {}) {
  let resolved;
  let stat;
  try {
    resolved = realpathSync(value);
    stat = statSync(resolved);
  } catch {
    reject('r4_governance_state_root_unavailable');
  }
  const relative = path.relative(root, resolved);
  const currentUid = typeof process.getuid === 'function' ? process.getuid() : null;
  if ((!relative && resolved !== root) || relative.startsWith('..') || path.isAbsolute(relative) ||
      !stat.isDirectory() || (stat.mode & 0o077) !== 0 ||
      (currentUid !== null && stat.uid !== currentUid)) {
    reject('r4_governance_state_root_security_invalid');
  }
  return resolved;
}

async function loadGovernanceRuntimeFromEnvironment(environment = process.env, {
  privateRoot = environment.CODEX_MEMORY_R4_GOVERNANCE_PRIVATE_ROOT || DEFAULT_PRIVATE_ROOT,
  readFileSync = fs.readFileSync,
  statSync = fs.statSync,
  realpathSync = fs.realpathSync,
  appFactory = createCodexMemoryApplication
} = {}) {
  if ((environment.CODEX_MEMORY_R4_COUNTER_MODE || 'zero_memory') !== R4_LIVE_READ_MODE ||
      environment.CODEX_MEMORY_R4_GOVERNANCE_LIVE_READ_ENABLED !== 'true') {
    reject('r4_governance_live_read_disabled');
  }
  const resolvedPrivateRoot = validatePrivateRoot(privateRoot, { statSync, realpathSync });
  const readReference = name => readPrivateReference(getEnvironment(environment, name), {
    privateRoot: resolvedPrivateRoot,
    readFileSync,
    statSync,
    realpathSync
  });
  const mapping = parsePrivateJson(
    readReference('CODEX_MEMORY_R4_DIARY_SCOPE_MAPPING_REFERENCE'),
    'r4_governance_mapping_json_invalid'
  );
  const mappingState = deepFreeze(loadDiaryScopeMapping({ mapping }));
  const registry = parsePrivateJson(
    readReference('CODEX_MEMORY_R4_PROJECT_REGISTRY_REFERENCE'),
    'r4_governance_registry_json_invalid'
  );
  const registryState = validateProjectRegistry(registry, mappingState, {
    resolveDiaryRead: resolveRead
  });
  const selectedProjectAlias = assertSafeReference(
    getEnvironment(environment, 'CODEX_MEMORY_R4_LIVE_READ_PROJECT_ALIAS'),
    'r4_governance_selected_project_alias_invalid'
  );
  if (!registryState.registry.projects.some(project =>
    project.safeProjectAlias === selectedProjectAlias)) {
    reject('r4_governance_selected_project_unregistered');
  }
  if (getEnvironment(environment, 'CODEX_MEMORY_R4_EXPECTED_MAPPING_REFERENCE') !== mappingState.mappingReference ||
      assertDigest(getEnvironment(environment, 'CODEX_MEMORY_R4_EXPECTED_MAPPING_DIGEST'),
        'r4_governance_expected_mapping_digest_invalid') !== mappingState.mappingDigest ||
      getEnvironment(environment, 'CODEX_MEMORY_R4_EXPECTED_REGISTRY_REFERENCE') !== registryState.registryReference ||
      assertDigest(getEnvironment(environment, 'CODEX_MEMORY_R4_EXPECTED_REGISTRY_DIGEST'),
        'r4_governance_expected_registry_digest_invalid') !== registryState.registryDigest) {
    reject('r4_governance_expected_binding_mismatch');
  }
  assertSafeReference(getEnvironment(environment, 'CODEX_MEMORY_R4_GOVERNANCE_BINDING_REFERENCE'),
    'r4_governance_binding_reference_invalid');
  assertSafeReference(getEnvironment(environment, 'CODEX_MEMORY_R4_GOVERNANCE_ROLLBACK_REFERENCE'),
    'r4_governance_rollback_reference_invalid');

  const publicOrigin = getEnvironment(environment, 'CODEX_MEMORY_R4_PUBLIC_ORIGIN');
  const issuer = getEnvironment(environment, 'CODEX_MEMORY_R4_AUTH0_ISSUER');
  assertCanonicalPublicOrigin(publicOrigin);
  assertCanonicalIssuer(issuer);
  const expectedAudience = `${publicOrigin}/mcp`;
  const edgePublicKey = parseEd25519PublicKey(
    readReference('CODEX_MEMORY_R4_EDGE_SIGNING_PUBLIC_KEY')
  );
  const contextPrivateKey = parseEd25519PrivateKey(
    readReference('CODEX_MEMORY_R4_CONTEXT_SIGNING_PRIVATE_KEY_REFERENCE')
  );
  const edgeKeyId = assertSafeReference(
    getEnvironment(environment, 'CODEX_MEMORY_R4_EDGE_SIGNING_KEY_ID'),
    'r4_governance_edge_key_id_invalid'
  );
  const contextKeyId = assertSafeReference(
    getEnvironment(environment, 'CODEX_MEMORY_R4_CONTEXT_SIGNING_KEY_ID'),
    'r4_governance_context_key_id_invalid'
  );
  if (edgeKeyId === contextKeyId) reject('r4_governance_signing_authority_reused');
  const stateRoot = validateOwnedDirectoryWithinRoot(
    getEnvironment(environment, 'CODEX_MEMORY_R4_GOVERNANCE_STATE_ROOT'),
    resolvedPrivateRoot,
    { statSync, realpathSync }
  );
  const socketPath = getEnvironment(environment, 'CODEX_MEMORY_R4_RELAY_UDS_PATH');
  const socketParent = validateOwnedDirectoryWithinRoot(
    path.dirname(socketPath),
    resolvedPrivateRoot,
    { statSync, realpathSync }
  );
  if (path.dirname(socketPath) !== socketParent) reject('r4_governance_socket_path_invalid');

  const nativeTargetReference = assertSafeReference(
    getEnvironment(environment, 'CODEX_MEMORY_R4_NATIVE_TARGET_REFERENCE'),
    'r4_governance_native_target_reference_invalid'
  );
  const nativeEndpoint = validateLoopbackEndpoint(
    getEnvironment(environment, 'CODEX_MEMORY_R4_NATIVE_HTTP_ENDPOINT')
  );
  const nativeToken = normalizeSingleLineSecret(
    readReference('CODEX_MEMORY_R4_NATIVE_HTTP_TOKEN_REFERENCE')
  );
  const expectedGovernanceBindingDigest = assertDigest(
    getEnvironment(environment, 'CODEX_MEMORY_R4_GOVERNANCE_BINDING_DIGEST'),
    'r4_governance_binding_digest_invalid'
  );
  if (computeGovernanceRuntimeBindingDigest(environment) !== expectedGovernanceBindingDigest) {
    reject('r4_governance_binding_digest_mismatch');
  }

  const app = appFactory({
    projectBasePath: stateRoot,
    dailyNoteRootPath: path.join(stateRoot, 'no-primary-memory'),
    dataDir: path.join(stateRoot, 'data'),
    logsDir: path.join(stateRoot, 'receipts'),
    securityProfile: 'hardened',
    allowExternalProvider: false,
    autoRebuildShadowOnStart: false,
    autoRebuildActiveMemoryOnStart: false,
    enableCandidateCache: false,
    defaultClientId: 'ChatGPT',
    governedMcpVcpNativeBridgeGateMode: 'strict',
    governedMcpVcpNativeReadDelegationMode: 'primary',
    governedMcpVcpNativeWriteDelegationMode: 'off',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: nativeTargetReference,
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeHttpMcpTarget: {
      targetReferenceName: nativeTargetReference,
      endpoint: nativeEndpoint,
      bearerToken: nativeToken,
      requestTimeoutMs: 30_000,
      mcpToolNameByAction: {
        search_memory: 'knowledge_base.search',
        memory_overview: 'memory_overview',
        audit_memory: 'audit_memory'
      }
    },
    governedMcpVcpNativeReadShapeProbeHttpMcpTarget: {},
    expectedDiaryScopeMappingReference: mappingState.mappingReference,
    expectedDiaryScopeMappingDigest: mappingState.mappingDigest
  });
  let appClosed = false;
  const closeApp = async () => {
    if (appClosed) return;
    appClosed = true;
    await app.close();
  };
  try {
    await app.initialize();
  } catch (error) {
    await closeApp().catch(() => {});
    throw error;
  }

  const governanceRuntime = createR4GovernanceRuntime({
    expectedIssuer: issuer,
    expectedAudience,
    resolveRequestPublicKey: keyId => keyId === edgeKeyId ? edgePublicKey : null,
    resolvePrincipalPublicKey: candidate =>
      candidate?.issuer === issuer && candidate?.key_id === edgeKeyId ? edgePublicKey : null,
    registryState,
    mappingState,
    selectedProjectAlias,
    resolveDiaryRead: resolveRead,
    contextSigning: { privateKey: contextPrivateKey, keyId: contextKeyId },
    callGovernedTool: (toolName, args, requestContext) =>
      app.callTool(toolName, args, requestContext)
  });
  const udsServer = createGovernanceUdsServer({ socketPath, governanceRuntime, statSync });

  return Object.freeze({
    async start() {
      try {
        return await udsServer.start();
      } catch (error) {
        await closeApp().catch(() => {});
        throw error;
      }
    },
    async stop() {
      await udsServer.stop();
      await closeApp();
    },
    snapshot() {
      return Object.freeze({
        activated: udsServer.snapshot().started,
        mode: R4_LIVE_READ_MODE,
        registry_bound: true,
        mapping_bound: true,
        governance_binding_bound: true,
        rollback_reference_retained: true,
        startup_only_binding: true,
        public_write_surface_enabled: false,
        readiness_claimed: false,
        uds: udsServer.snapshot(),
        context: governanceRuntime.snapshot()
      });
    }
  });
}

module.exports = {
  DEFAULT_PRIVATE_ROOT,
  MAX_PRIVATE_FILE_BYTES,
  assertDigest,
  computeGovernanceRuntimeBindingDigest,
  governanceBindingPayload,
  loadGovernanceRuntimeFromEnvironment,
  normalizeSingleLineSecret,
  parseEd25519PrivateKey,
  parseEd25519PublicKey,
  readPrivateReference,
  validateLoopbackEndpoint,
  validateOwnedDirectoryWithinRoot,
  validatePrivateRoot
};
