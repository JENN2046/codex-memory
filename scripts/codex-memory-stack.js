#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { builtinModules } = require('node:module');
const { parseEnv } = require('node:util');
const acorn = require('acorn');
const {
  execFile,
  execFileSync,
  spawn
} = require('node:child_process');
const {
  MANIFEST_SCHEMA_VERSION,
  inspectControllerSourceManifest
} = require('./codex-memory-controller-source-manifest');
const {
  CHATGPT_EDGE_DATA_SCHEMA_VERSION,
  EDGE_REQUEST_SCHEMA_VERSION,
  EDGE_RESPONSE_SCHEMA_VERSION
} = require('../packages/chatgpt-r4-contracts/constants');
const {
  GOVERNED_READ_ATTEMPT_PROTOCOL
} = require('../packages/chatgpt-r4-contracts/governed-read-attempt');
const {
  COMMAND_SHAPES,
  DECISIONS,
  EVIDENCE_STATUS,
  classifyManagedCommandShape: classifyProcessCommandShape,
  scanManagedProcesses
} = require('./codex-memory-process-observer');
const {
  VCP_RUNTIME_CONTRACT_PROJECTION,
  VCP_RUNTIME_CONTRACT_EVIDENCE_SCHEMA_VERSION,
  VCP_RUNTIME_CONTRACT_SCHEMA_VERSION,
  VCP_RUNTIME_IDENTITY_SCHEMA_VERSION,
  VCP_RUNTIME_OPAQUE_LOCAL_PACKAGE_ROOTS,
  VCP_RUNTIME_SECURITY_ROOTS
} = require('../src/core/VcpRuntimeContract');
const {
  canonicalGovernedNativeClient,
  canonicalMemoryVisibility
} = require('../src/core/MemoryAccessContract');
const {
  isSafeReferenceName
} = require('../src/core/VcpToolBoxSafeReference');
const {
  AUTHORITY_RECORD_PATH,
  IMAGE_BUILD_MANIFEST_PATH,
  IMAGE_PROFILE_KEYS,
  IMAGE_RUNTIME_ROOT,
  IMAGE_VCP_ROOT,
  PROVIDER_RECEIPT_PATH,
  PROFILE_SCHEMA_VERSION: IMAGE_PROFILE_SCHEMA_VERSION,
  VCP_IMAGE_RUNTIME_IDENTITY_SCHEMA_VERSION,
  VCP_PROVIDER_ENVIRONMENT_MAX_BYTES,
  VCP_PROVIDER_HOST_MODE,
  VCP_PROVIDER_HOST_UID,
  VCP_PROVIDER_RUNTIME_ENVIRONMENT_PATH,
  VCP_PROVIDER_RUNTIME_GID,
  buildManifestDigest,
  parseVcpProviderEnvironment,
  profileAuthorityComponents,
  profileV7MigrationCandidate,
  readBoundedBuffer,
  readBoundedJson,
  validateAuthorityRecord,
  validateBuildManifest,
  validateEdgeReceipt,
  validateImageProfile,
  validateProviderReceipt,
  validateRuntimeSelfEvidence,
  vcpImageRuntimeAuthorityDigest,
  vcpProviderEnvironmentRuntimeAccess,
  vcpProviderConfigDigest: sharedVcpProviderConfigDigest
} = require('../src/runtime/native-image/runtime-authority');

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT_PATH = path.resolve(__filename);
const PROFILE_SCHEMA_VERSION = 6;
const EXACT_HEAD_PROFILE_SCHEMA_VERSION = 5;
const LEGACY_PROFILE_SCHEMA_VERSION = 4;
const EDGE_CONTRACT_STATUS = Object.freeze({
  dataResponseSchemaVersion:
    CHATGPT_EDGE_DATA_SCHEMA_VERSION,
  requestEnvelopeSchemaVersion:
    EDGE_REQUEST_SCHEMA_VERSION,
  responseEnvelopeSchemaVersion:
    EDGE_RESPONSE_SCHEMA_VERSION,
  governedReadAttemptProtocol:
    GOVERNED_READ_ATTEMPT_PROTOCOL,
  legacyV1Accepted: false
});
const PROFILE_FILENAME = 'full-stack-control.json';
const RUNTIME_DIRECTORY_NAME = 'codex-memory-full-stack-001';
const EDGE_CONTAINER_DEFAULT = 'codex-memory-full-stack-001-edge';
const PROVIDER_CONTAINER_DEFAULT = 'new-api-wsl';
const GOVERNED_READ_SHIM_PORT = 7616;
const CANONICAL_CODEX_MCP_ENDPOINT = Object.freeze({
  host: '127.0.0.1',
  path: '/mcp/codex-memory',
  port: 7625,
  role: 'canonical_client'
});
const LEGACY_ROLLBACK_MCP_ENDPOINT = Object.freeze({
  host: '127.0.0.1',
  path: '/mcp/codex-memory',
  port: 7605,
  role: 'legacy_rollback'
});
const CANONICAL_CODEX_MCP_TOOL_NAMES = Object.freeze([
  'audit_memory',
  'memory_overview',
  'prepare_memory_context',
  'propose_memory_delta',
  'search_memory'
]);
const UNIX_PEER_CREDENTIAL_HELPER_PATH = '/usr/bin/python3';
const UNIX_PEER_CREDENTIAL_HELPER_SOURCE = [
  'import socket,struct',
  'peer=struct.unpack("3i",socket.socket(fileno=3).getsockopt(socket.SOL_SOCKET,socket.SO_PEERCRED,12))',
  'print(f"{peer[0]}:{peer[1]}:{peer[2]}")'
].join(';');
const CONTROLLER_CHANGE_PATHS = new Set([
  'apps/local-recall-relay/outbound-https-client.js',
  'apps/local-recall-relay/outbound-main.js',
  'apps/local-recall-relay/outbound-runtime.js',
  'apps/local-recall-relay/relay-runtime.js',
  'apps/local-recall-relay/runtime-authority.js',
  'apps/local-recall-relay/uds-transport.js',
  'docs/CODEX_MEMORY_FULL_STACK_CONTROL.md',
  'scripts/codex-memory-stack.js',
  'src/adapters/codex-mcp/http.js',
  'src/cli/vcp-toolbox-native-mcp-shim.js',
  'src/core/VcpRuntimeContract.js',
  'tests/mcp-http.test.js',
  'tests/codex-memory-stack-cli.test.js',
  'tests/chatgpt-r4/local-integration.test.js',
  'tests/chatgpt-r4/outbound-relay.test.js'
]);
const V5_CONTROLLER_SOURCE_UPGRADE_COMMITS = new Set([
  '48ecfe1c74e1cf5b6be9a56ffa82998eeb26567e'
]);
const COMPONENTS = Object.freeze({
  shim: Object.freeze({
    pidFile: 'vcp-native-shim.pid',
    logFile: 'vcp-native-shim.log',
    mode: '_run-shim'
  }),
  http: Object.freeze({
    pidFile: 'codex-memory-http.pid',
    logFile: 'codex-memory-http.log',
    mode: '_run-http'
  }),
  governance: Object.freeze({
    pidFile: 'governance.pid',
    logFile: 'governance.log',
    mode: '_run-governance'
  }),
  relay: Object.freeze({
    pidFile: 'relay.pid',
    logFile: 'relay.log',
    mode: '_run-relay'
  })
});
const MANAGED_STOP_WAIT_MS = Object.freeze({
  shim: 45_000,
  http: 45_000,
  governance: 10_000,
  relay: 120_000
});
const LEGACY_PROFILE_KEYS = Object.freeze([
  'edgeContainer',
  'edgeContainerId',
  'governanceEnvironment',
  'privateRoot',
  'providerContainer',
  'providerContainerId',
  'providerImageId',
  'providerRevision',
  'relayEnvironment',
  'retainedBinding',
  'retainedBindingSource',
  'runtimeBaseline',
  'runtimeRepository',
  'schemaVersion'
]);
const V5_PROFILE_KEYS = Object.freeze([
  ...LEGACY_PROFILE_KEYS,
  'controllerSourceCommit',
  'governanceEnvironmentConfigDigest',
  'relayEnvironmentConfigDigest',
  'vcpProviderConfigDigest',
  'vcpRuntimeBaseline',
  'vcpRuntimeRepository',
  'vcpRuntimeScopeDigest'
]);
const LEGACY_V6_PROFILE_KEYS = Object.freeze([
  ...LEGACY_PROFILE_KEYS,
  'adoptedRepositoryHead',
  'controllerSourceManifestDigest',
  'controllerSourceManifestVersion',
  'governanceEnvironmentConfigDigest',
  'relayEnvironmentConfigDigest',
  'vcpProviderConfigDigest',
  'vcpRuntimeBaseline',
  'vcpRuntimeRepository',
  'vcpRuntimeScopeDigest'
]);
const PROFILE_KEYS = Object.freeze([
  ...LEGACY_V6_PROFILE_KEYS,
  'vcpRuntimeContractDigest',
  'vcpRuntimeIdentitySchemaVersion'
]);
const PRIVATE_FILE_MAX_BYTES = 262_144;
const SAFE_GIT_OBJECT = /^[a-f0-9]{40}$/u;
const SAFE_SHA256_DIGEST = /^sha256:[a-f0-9]{64}$/u;
const SAFE_CONTAINER_ID = /^[a-f0-9]{64}$/u;
const SAFE_IMAGE_ID = /^sha256:[a-f0-9]{64}$/u;
const SAFE_CONTAINER_NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/u;
const SAFE_OPAQUE_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{2,255}$/u;
const SAFE_CODE = /^[a-z][a-z0-9_]{0,95}$/u;
const SAFE_CHILD_PATH = '/usr/bin:/bin';
const SAFE_MANAGED_ENVIRONMENT_NAME =
  /^CODEX_MEMORY_R(?:4|5)_[A-Z0-9_]{1,96}$/u;
const SENSITIVE_MANAGED_ENVIRONMENT_NAME =
  /(?:^|_)(?:PASSWORD|PRIVATE_KEY|SECRET|TOKEN)(?:_|$)/u;
const HTTP_TRUSTED_SCOPE_MANAGED_ENVIRONMENT_NAMES = Object.freeze({
  projectId: 'CODEX_MEMORY_R5_TRUSTED_SCOPE_PROJECT_ID',
  workspaceId: 'CODEX_MEMORY_R5_TRUSTED_SCOPE_WORKSPACE_ID',
  scopeId: 'CODEX_MEMORY_R5_TRUSTED_SCOPE_SCOPE_ID',
  clientId: 'CODEX_MEMORY_R5_TRUSTED_SCOPE_CLIENT_ID',
  visibility: 'CODEX_MEMORY_R5_TRUSTED_SCOPE_VISIBILITY'
});
const HTTP_TRUSTED_SCOPE_CHILD_ENVIRONMENT_NAMES = Object.freeze({
  projectId: 'CODEX_MEMORY_PROJECT_ID',
  workspaceId: 'CODEX_MEMORY_WORKSPACE_ID',
  scopeId: 'CODEX_MEMORY_SCOPE_ID',
  clientId: 'CODEX_MEMORY_CLIENT_ID',
  visibility: 'CODEX_MEMORY_VISIBILITY'
});
const PROVIDER_CONFIG_IDENTITY_FILENAME =
  'vcp-provider-config.identity.json';
const GOVERNANCE_SECRET_IDENTITY_FILENAME =
  'governance-private-files.identity.json';
const RELAY_SECRET_IDENTITY_FILENAME =
  'relay-secret-files.identity.json';
const GOVERNANCE_PRIVATE_REFERENCE_NAMES = Object.freeze({
  contextSigningPrivateKey:
    'CODEX_MEMORY_R4_CONTEXT_SIGNING_PRIVATE_KEY_REFERENCE',
  diaryScopeMapping: 'CODEX_MEMORY_R4_DIARY_SCOPE_MAPPING_REFERENCE',
  edgeSigningPublicKey: 'CODEX_MEMORY_R4_EDGE_SIGNING_PUBLIC_KEY',
  nativeHttpToken: 'CODEX_MEMORY_R4_NATIVE_HTTP_TOKEN_REFERENCE',
  operatorSubjectFingerprint:
    'CODEX_MEMORY_R4_OPERATOR_SUBJECT_FINGERPRINT_REFERENCE',
  projectRegistry: 'CODEX_MEMORY_R4_PROJECT_REGISTRY_REFERENCE'
});
const RELAY_SECRET_REFERENCE_NAMES = Object.freeze({
  edgeSigningPublicKey: 'CODEX_MEMORY_R4_EDGE_SIGNING_PUBLIC_KEY',
  relayAuthToken: 'CODEX_MEMORY_R4_RELAY_AUTH_TOKEN',
  relaySigningPrivateKey: 'CODEX_MEMORY_R4_RELAY_SIGNING_PRIVATE_KEY',
  relaySigningPublicKey: 'CODEX_MEMORY_R4_RELAY_SIGNING_PUBLIC_KEY'
});
const MANAGED_PRIVATE_FILE_REFERENCE_NAMES = new Set([
  ...Object.values(GOVERNANCE_PRIVATE_REFERENCE_NAMES),
  ...Object.values(RELAY_SECRET_REFERENCE_NAMES)
]);
const VCP_RUNTIME_BASELINE_BY_CODEX_BASELINE = Object.freeze({
  '3a0ca59fe2c0f3721d46513d7d6593cbe55b1118':
    '555b3b538f6eb736e530c2912de678c5941f9985'
});
const VCP_RUNTIME_SOURCE_PATHS = Object.freeze([
  'EmbeddingUtils.js',
  'EPAModule.js',
  'KnowledgeBaseManager.js',
  'ResultDeduplicator.js',
  'ResidualPyramid.js',
  'TagMemoEngine.js',
  'TextChunker.js',
  'package-lock.json',
  'package.json',
  'rag_params.json',
  'rust-vexus-lite'
]);
const VCP_RUNTIME_BUILD_SCHEMA_VERSION = 1;
const VCP_RUNTIME_CLASSIFICATIONS = Object.freeze({
  IMAGE_AUTHORITY_MATCH: 'VCP_RUNTIME_IMAGE_AUTHORITY_MATCH',
  CONTRACT_MATCH: 'VCP_RUNTIME_CONTRACT_MATCH',
  CONTRACT_MATCH_BUILD_CHANGED:
    'VCP_RUNTIME_CONTRACT_MATCH_BUILD_CHANGED',
  CONTRACT_MISMATCH: 'VCP_RUNTIME_CONTRACT_MISMATCH',
  CONTRACT_UNAVAILABLE: 'VCP_RUNTIME_CONTRACT_UNAVAILABLE',
  BUILD_UNTRUSTED: 'VCP_RUNTIME_BUILD_UNTRUSTED',
  LEGACY_IDENTITY_MATCH: 'VCP_RUNTIME_LEGACY_IDENTITY_MATCH',
  LEGACY_REACCEPTANCE_REQUIRED:
    'VCP_RUNTIME_LEGACY_REACCEPTANCE_REQUIRED',
  IDENTITY_SCHEMA_UNSUPPORTED:
    'VCP_RUNTIME_IDENTITY_SCHEMA_UNSUPPORTED'
});

function codedError(code) {
  const safe = SAFE_CODE.test(code || '') ? code : 'codex_memory_stack_failed';
  return Object.assign(new Error(safe), { code: safe });
}

function safeCode(error, fallback = 'codex_memory_stack_failed') {
  const candidate = error?.code || error?.message;
  return SAFE_CODE.test(candidate || '') ? candidate : fallback;
}

function profileHttpEndpoint(profile) {
  if ([PROFILE_SCHEMA_VERSION, IMAGE_PROFILE_SCHEMA_VERSION]
    .includes(profile?.schemaVersion)) {
    return CANONICAL_CODEX_MCP_ENDPOINT;
  }
  if ([
    LEGACY_PROFILE_SCHEMA_VERSION,
    EXACT_HEAD_PROFILE_SCHEMA_VERSION
  ].includes(profile?.schemaVersion)) {
    return LEGACY_ROLLBACK_MCP_ENDPOINT;
  }
  throw codedError('stack_profile_http_endpoint_invalid');
}

function childProfileSchemaVersion(environment = process.env) {
  const rawSchemaVersion =
    environment.CODEX_MEMORY_STACK_PROFILE_SCHEMA_VERSION;
  const schemaVersion = rawSchemaVersion === undefined
    ? LEGACY_PROFILE_SCHEMA_VERSION
    : Number(rawSchemaVersion);
  profileHttpEndpoint({ schemaVersion });
  return schemaVersion;
}

function childHttpEndpoint(environment = process.env) {
  return profileHttpEndpoint({
    schemaVersion: childProfileSchemaVersion(environment)
  });
}

function exactKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index]);
}

function canonicalObject(value) {
  if (Array.isArray(value)) return value.map(canonicalObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).sort().map(key => [key, canonicalObject(value[key])])
  );
}

function sha256Projection(value) {
  return `sha256:${crypto.createHash('sha256').update(
    JSON.stringify(canonicalObject(value)),
    'utf8'
  ).digest('hex')}`;
}

function validateVcpRuntimeStaticPolicyProjection(projection) {
  if (!exactKeys(projection, [
    'capabilitySurface',
    'componentBindingContract',
    'globalSearchPolicy',
    'manifestSchemaVersion',
    'memoryReadPolicy',
    'memoryWritePolicy',
    'nativeShimProtocol',
    'providerPolicy',
    'repositoryBinding',
    'schemaVersion'
  ]) ||
      projection.schemaVersion !== VCP_RUNTIME_IDENTITY_SCHEMA_VERSION ||
      projection.manifestSchemaVersion !== 1 ||
      ![
        projection.memoryReadPolicy,
        projection.memoryWritePolicy,
        projection.globalSearchPolicy,
        projection.providerPolicy,
        projection.repositoryBinding,
        projection.nativeShimProtocol
      ].every(value => typeof value === 'string' && value.length > 0) ||
      !exactKeys(projection.componentBindingContract, [
        'embeddingModule',
        'knowledgeBaseModule'
      ]) ||
      !Object.values(projection.componentBindingContract).every(
        value => typeof value === 'string' && value.length > 0
      ) ||
      !Array.isArray(projection.capabilitySurface) ||
      projection.capabilitySurface.length < 1 ||
      !projection.capabilitySurface.every(
        (value, index, values) =>
          typeof value === 'string' && value.length > 0 &&
          (index === 0 || values[index - 1] < value)
      )) {
    throw codedError('stack_vcp_runtime_contract_invalid');
  }
  return projection;
}

function vcpRuntimeContractDigest({
  staticPolicyProjection = VCP_RUNTIME_CONTRACT_PROJECTION,
  vcpContractEvidenceDigest
} = {}) {
  validateVcpRuntimeStaticPolicyProjection(staticPolicyProjection);
  if (!SAFE_SHA256_DIGEST.test(vcpContractEvidenceDigest || '')) {
    throw codedError('stack_vcp_runtime_contract_invalid');
  }
  return sha256Projection({
    schemaVersion: VCP_RUNTIME_CONTRACT_SCHEMA_VERSION,
    staticPolicyProjection,
    vcpContractEvidenceDigest,
    vcpContractEvidenceSchemaVersion:
      VCP_RUNTIME_CONTRACT_EVIDENCE_SCHEMA_VERSION
  });
}

function profileVcpRuntimeIdentityMode(profile) {
  if (!profileHasRuntimeBinding(profile)) return 'none';
  const hasSchema = Object.hasOwn(
    profile,
    'vcpRuntimeIdentitySchemaVersion'
  );
  const hasDigest = Object.hasOwn(profile, 'vcpRuntimeContractDigest');
  if (!hasSchema && !hasDigest) {
    return profile.schemaVersion === IMAGE_PROFILE_SCHEMA_VERSION
      ? 'unsupported'
      : 'legacy';
  }
  if (hasSchema && hasDigest &&
      profile.schemaVersion === PROFILE_SCHEMA_VERSION &&
      profile.vcpRuntimeIdentitySchemaVersion ===
        VCP_RUNTIME_IDENTITY_SCHEMA_VERSION &&
      SAFE_SHA256_DIGEST.test(profile.vcpRuntimeContractDigest || '')) {
    return 'contract_v1';
  }
  if (hasSchema && hasDigest &&
      profile.schemaVersion === IMAGE_PROFILE_SCHEMA_VERSION &&
      profile.vcpRuntimeIdentitySchemaVersion ===
        VCP_IMAGE_RUNTIME_IDENTITY_SCHEMA_VERSION &&
      SAFE_SHA256_DIGEST.test(profile.vcpRuntimeContractDigest || '')) {
    return 'image_authority_v1';
  }
  return 'unsupported';
}

function profileHasRuntimeBinding(profile) {
  return [
    EXACT_HEAD_PROFILE_SCHEMA_VERSION,
    PROFILE_SCHEMA_VERSION,
    IMAGE_PROFILE_SCHEMA_VERSION
  ].includes(profile?.schemaVersion);
}

function profileControllerIdentityReceipt(profile) {
  if (profile?.schemaVersion === IMAGE_PROFILE_SCHEMA_VERSION) {
    return Object.freeze({
      controllerSourceCommit: profile.runtimeBaseline,
      runtimeBuildManifestDigest: profile.runtimeBuildManifestDigest,
      schemaVersion: 3
    });
  }
  if (profile?.schemaVersion === PROFILE_SCHEMA_VERSION) {
    return Object.freeze({
      controllerSourceManifestDigest:
        profile.controllerSourceManifestDigest,
      controllerSourceManifestVersion:
        profile.controllerSourceManifestVersion,
      schemaVersion: 2
    });
  }
  if (profile?.schemaVersion === EXACT_HEAD_PROFILE_SCHEMA_VERSION) {
    return Object.freeze({
      controllerSourceCommit: profile.controllerSourceCommit,
      schemaVersion: 1
    });
  }
  throw codedError('stack_profile_controller_identity_invalid');
}

function controllerIdentityReceiptMatches(receipt, profile) {
  if (profile?.schemaVersion === IMAGE_PROFILE_SCHEMA_VERSION) {
    return receipt?.schemaVersion === 3 &&
      receipt.controllerSourceCommit === profile.runtimeBaseline &&
      receipt.runtimeBuildManifestDigest ===
        profile.runtimeBuildManifestDigest;
  }
  if (profile?.schemaVersion === PROFILE_SCHEMA_VERSION) {
    return receipt?.schemaVersion === 2 &&
      receipt.controllerSourceManifestVersion ===
        profile.controllerSourceManifestVersion &&
      receipt.controllerSourceManifestDigest ===
        profile.controllerSourceManifestDigest;
  }
  if (profile?.schemaVersion === EXACT_HEAD_PROFILE_SCHEMA_VERSION) {
    return receipt?.schemaVersion === 1 &&
      receipt.controllerSourceCommit === profile.controllerSourceCommit;
  }
  return false;
}

function validateControllerIdentityReceipt(value, failureCode) {
  if (value?.schemaVersion === 1 &&
      SAFE_GIT_OBJECT.test(value.controllerSourceCommit || '')) {
    return Object.freeze({
      keys: Object.freeze(['controllerSourceCommit']),
      projection: Object.freeze({
        controllerSourceCommit: value.controllerSourceCommit
      })
    });
  }
  if (value?.schemaVersion === 2 &&
      value.controllerSourceManifestVersion === MANIFEST_SCHEMA_VERSION &&
      SAFE_SHA256_DIGEST.test(
        value.controllerSourceManifestDigest || ''
      )) {
    return Object.freeze({
      keys: Object.freeze([
        'controllerSourceManifestDigest',
        'controllerSourceManifestVersion'
      ]),
      projection: Object.freeze({
        controllerSourceManifestDigest:
          value.controllerSourceManifestDigest,
        controllerSourceManifestVersion:
          value.controllerSourceManifestVersion
      })
    });
  }
  if (value?.schemaVersion === 3 &&
      SAFE_GIT_OBJECT.test(value.controllerSourceCommit || '') &&
      SAFE_SHA256_DIGEST.test(value.runtimeBuildManifestDigest || '')) {
    return Object.freeze({
      keys: Object.freeze([
        'controllerSourceCommit',
        'runtimeBuildManifestDigest'
      ]),
      projection: Object.freeze({
        controllerSourceCommit: value.controllerSourceCommit,
        runtimeBuildManifestDigest: value.runtimeBuildManifestDigest
      })
    });
  }
  throw codedError(failureCode);
}

function currentUid() {
  if (typeof process.getuid !== 'function') throw codedError('stack_owner_uid_unavailable');
  return process.getuid();
}

function defaultPrivateRoot(environment = process.env) {
  const dataHome = environment.XDG_DATA_HOME ||
    path.join(os.homedir(), '.local', 'share');
  return path.resolve(dataHome, 'codex-memory');
}

function assertPrivateRootBoundary(privateRoot, {
  environment = process.env,
  fsModule = fs
} = {}) {
  let boundary;
  let resolvedPrivateRoot;
  try {
    boundary = fsModule.realpathSync(defaultPrivateRoot(environment));
    resolvedPrivateRoot = fsModule.realpathSync(privateRoot);
  } catch {
    throw codedError('stack_private_root_boundary_unavailable');
  }
  const relation = path.relative(boundary, resolvedPrivateRoot);
  if (!relation || relation.startsWith('..') || path.isAbsolute(relation)) {
    throw codedError('stack_private_root_outside_boundary');
  }
  return resolvedPrivateRoot;
}

function discoverPrivateRoot(files, {
  environment = process.env,
  fsModule = fs
} = {}) {
  if (!Array.isArray(files) || files.length < 1) {
    throw codedError('stack_private_root_discovery_invalid');
  }
  let searchBoundary;
  try {
    searchBoundary = fsModule.realpathSync(defaultPrivateRoot(environment));
  } catch {
    throw codedError('stack_private_root_boundary_unavailable');
  }
  const resolvedFiles = files.map(file => assertOwnerOnlyFile(file, { fsModule }));
  if (resolvedFiles.some(file => {
    const relation = path.relative(searchBoundary, file);
    return !relation || relation.startsWith('..') || path.isAbsolute(relation);
  })) {
    throw codedError('stack_private_root_discovery_outside_boundary');
  }
  let candidate = path.dirname(resolvedFiles[0]);
  while (candidate !== searchBoundary && candidate.startsWith(`${searchBoundary}${path.sep}`)) {
    const containsAll = resolvedFiles.every(file => {
      const relation = path.relative(candidate, file);
      return relation && !relation.startsWith('..') && !path.isAbsolute(relation);
    });
    if (containsAll) {
      const binding = path.join(candidate, 'r5m-exact-head', 'private-binding.json');
      try {
        assertOwnerOnlyDirectory(candidate, { fsModule });
        assertOwnerOnlyFile(binding, { fsModule });
        return candidate;
      } catch {}
    }
    candidate = path.dirname(candidate);
  }
  throw codedError('stack_private_root_discovery_failed');
}

function profilePath(environment = process.env) {
  if (environment.CODEX_MEMORY_STACK_PROFILE) {
    if (!path.isAbsolute(environment.CODEX_MEMORY_STACK_PROFILE)) {
      throw codedError('stack_profile_path_invalid');
    }
    return path.resolve(environment.CODEX_MEMORY_STACK_PROFILE);
  }
  const configHome = environment.XDG_CONFIG_HOME ||
    path.join(os.homedir(), '.config');
  return path.resolve(configHome, 'codex-memory', PROFILE_FILENAME);
}

function runtimeDirectory(environment = process.env) {
  const root = environment.XDG_RUNTIME_DIR ||
    path.join('/run/user', String(currentUid()));
  if (!path.isAbsolute(root)) throw codedError('stack_runtime_root_invalid');
  return path.resolve(root, RUNTIME_DIRECTORY_NAME);
}

function runtimeSocketPaths(environment = process.env) {
  const root = runtimeDirectory(environment);
  return Object.freeze({
    data: path.join(root, 'governance-data.sock'),
    control: path.join(root, 'governance-control.sock')
  });
}

function assertOwnerOnlyDirectory(directory, {
  create = false,
  fsModule = fs
} = {}) {
  if (!path.isAbsolute(directory) || path.resolve(directory) !== directory) {
    throw codedError('stack_owner_directory_invalid');
  }
  if (create) {
    fsModule.mkdirSync(directory, { recursive: true, mode: 0o700 });
    fsModule.chmodSync(directory, 0o700);
  }
  let resolved;
  let stat;
  try {
    resolved = fsModule.realpathSync(directory);
    stat = fsModule.statSync(resolved);
  } catch {
    throw codedError('stack_owner_directory_unavailable');
  }
  if (resolved !== directory || !stat.isDirectory() ||
      stat.uid !== currentUid() || (stat.mode & 0o077) !== 0) {
    throw codedError('stack_owner_directory_security_invalid');
  }
  return resolved;
}

function assertOwnerRepositoryDirectory(directory, {
  fsModule = fs
} = {}) {
  if (!path.isAbsolute(directory) || path.resolve(directory) !== directory) {
    throw codedError('stack_runtime_repository_invalid');
  }
  let resolved;
  let stat;
  try {
    resolved = fsModule.realpathSync(directory);
    stat = fsModule.statSync(resolved);
  } catch {
    throw codedError('stack_runtime_repository_unavailable');
  }
  if (resolved !== directory || !stat.isDirectory() ||
      stat.uid !== currentUid() || (stat.mode & 0o022) !== 0) {
    throw codedError('stack_runtime_repository_security_invalid');
  }
  return resolved;
}

function assertOwnerOnlyFile(file, {
  maximumBytes = PRIVATE_FILE_MAX_BYTES,
  fsModule = fs
} = {}) {
  if (!path.isAbsolute(file) || path.resolve(file) !== file) {
    throw codedError('stack_owner_file_invalid');
  }
  let resolved;
  let stat;
  let linkStat;
  try {
    linkStat = fsModule.lstatSync(file);
    resolved = fsModule.realpathSync(file);
    stat = fsModule.statSync(resolved);
  } catch {
    throw codedError('stack_owner_file_unavailable');
  }
  if (resolved !== file || linkStat.isSymbolicLink() || !stat.isFile() ||
      stat.uid !== currentUid() || (stat.mode & 0o077) !== 0 ||
      stat.size < 1 || stat.size > maximumBytes) {
    throw codedError('stack_owner_file_security_invalid');
  }
  return resolved;
}

function assertRelativeReference(value) {
  if (typeof value !== 'string' || !value || value.includes('\0') ||
      path.isAbsolute(value) || path.normalize(value) !== value ||
      value === '..' || value.startsWith(`..${path.sep}`)) {
    throw codedError('stack_profile_reference_invalid');
  }
  return value;
}

function resolvePrivateReference(profile, reference, options = {}) {
  const relative = assertRelativeReference(reference);
  const root = assertOwnerOnlyDirectory(profile.privateRoot, options);
  const target = path.resolve(root, relative);
  const relation = path.relative(root, target);
  if (!relation || relation.startsWith('..') || path.isAbsolute(relation)) {
    throw codedError('stack_profile_reference_outside_root');
  }
  return assertOwnerOnlyFile(target, options);
}

function privateReferencePath(reference, privateRoot, options = {}) {
  if (typeof reference !== 'string' || !reference.startsWith('file:')) {
    throw codedError('stack_private_reference_invalid');
  }
  const requested = reference.slice(5);
  if (!path.isAbsolute(requested)) {
    throw codedError('stack_private_reference_invalid');
  }
  const root = assertOwnerOnlyDirectory(privateRoot, options);
  const target = path.resolve(requested);
  const relation = path.relative(root, target);
  if (!relation || relation.startsWith('..') || path.isAbsolute(relation)) {
    throw codedError('stack_private_reference_outside_root');
  }
  return assertOwnerOnlyFile(target, options);
}

function readRetainedBindingFile(file, {
  fsModule = fs
} = {}) {
  const target = assertOwnerOnlyFile(file, {
    maximumBytes: PRIVATE_FILE_MAX_BYTES,
    fsModule
  });
  let binding;
  try {
    binding = JSON.parse(fsModule.readFileSync(target, 'utf8'));
  } catch {
    throw codedError('stack_retained_binding_invalid');
  }
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) {
    throw codedError('stack_retained_binding_invalid');
  }
  return binding;
}

function loadManagedEnvironmentFile(file, {
  fsModule = fs,
  parse = parseEnv
} = {}) {
  const target = assertOwnerOnlyFile(file, {
    maximumBytes: PRIVATE_FILE_MAX_BYTES,
    fsModule
  });
  let parsed;
  try {
    parsed = parse(fsModule.readFileSync(target, 'utf8'));
  } catch {
    throw codedError('stack_managed_environment_invalid');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw codedError('stack_managed_environment_invalid');
  }
  for (const [name, value] of Object.entries(parsed)) {
    if (!SAFE_MANAGED_ENVIRONMENT_NAME.test(name) ||
        typeof value !== 'string' || value.length > 16_384 ||
        value.includes('\0')) {
      throw codedError('stack_managed_environment_key_forbidden');
    }
  }
  return Object.freeze({ ...parsed });
}

function managedEnvironmentConfigDigest(environment) {
  if (!environment ||
      typeof environment !== 'object' ||
      Array.isArray(environment)) {
    throw codedError('stack_managed_environment_invalid');
  }
  const entries = Object.entries(environment).sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0
  );
  const digestInput = [];
  for (const [name, value] of entries) {
    if (!SAFE_MANAGED_ENVIRONMENT_NAME.test(name) ||
        typeof value !== 'string' ||
        value.length > 16_384 ||
        value.includes('\0')) {
      throw codedError('stack_managed_environment_invalid');
    }
    const privateFileReference =
      MANAGED_PRIVATE_FILE_REFERENCE_NAMES.has(name);
    if (privateFileReference &&
        (!value.startsWith('file:') ||
          !path.isAbsolute(value.slice(5)))) {
      throw codedError('stack_managed_environment_invalid');
    }
    const sensitiveValue = SENSITIVE_MANAGED_ENVIRONMENT_NAME.test(name) &&
      !name.endsWith('_REFERENCE') &&
      !name.endsWith('_KEY_ID') &&
      !privateFileReference;
    digestInput.push(
      `${name}\0${sensitiveValue ? '<secret-value-present>' : value}\n`
    );
  }
  return `sha256:${crypto.createHash('sha256').update(
    digestInput.join(''),
    'utf8'
  ).digest('hex')}`;
}

function managedEnvironmentConfigDigests(
  governanceEnvironmentFile,
  relayEnvironmentFile,
  { fsModule = fs } = {}
) {
  return Object.freeze({
    governanceEnvironmentConfigDigest: managedEnvironmentConfigDigest(
      loadManagedEnvironmentFile(governanceEnvironmentFile, { fsModule })
    ),
    relayEnvironmentConfigDigest: managedEnvironmentConfigDigest(
      loadManagedEnvironmentFile(relayEnvironmentFile, { fsModule })
    )
  });
}

function profileManagedEnvironmentConfigMatches(
  profile,
  governanceEnvironmentFile,
  relayEnvironmentFile,
  options = {}
) {
  try {
    if (!profileHasRuntimeBinding(profile)) return false;
    const current = managedEnvironmentConfigDigests(
      governanceEnvironmentFile,
      relayEnvironmentFile,
      options
    );
    return current.governanceEnvironmentConfigDigest ===
        profile.governanceEnvironmentConfigDigest &&
      current.relayEnvironmentConfigDigest ===
        profile.relayEnvironmentConfigDigest;
  } catch {
    return false;
  }
}

function readVcpProviderEnvironment(file, {
  fsModule = fs,
  parse = parseEnv
} = {}) {
  const target = assertOwnerOnlyFile(file, {
    maximumBytes: PRIVATE_FILE_MAX_BYTES,
    fsModule
  });
  try {
    return parseVcpProviderEnvironment(
      fsModule.readFileSync(target),
      { parse }
    );
  } catch {
    throw codedError('stack_vcp_provider_environment_invalid');
  }
}

function runtimeProviderEnvironmentIdentity(stat) {
  return Object.freeze(Object.fromEntries([
    ['device', stat.dev],
    ['inode', stat.ino],
    ['size', stat.size],
    ['mtimeNs', stat.mtimeNs ?? Math.trunc(stat.mtimeMs * 1_000_000)],
    ['ctimeNs', stat.ctimeNs ?? Math.trunc(stat.ctimeMs * 1_000_000)]
  ].map(([name, value]) => [name, String(value)])));
}

function sameRuntimeProviderEnvironmentIdentity(left, right) {
  return ['dev', 'ino', 'size', 'mtimeMs', 'ctimeMs'].every(name =>
    left[name] === right[name]
  );
}

function assertRootControlledRuntimeReadableProviderEnvironment(file, {
  fsModule = fs
} = {}) {
  if (file !== VCP_PROVIDER_RUNTIME_ENVIRONMENT_PATH ||
      path.resolve(file || '') !== file) {
    throw codedError('stack_runtime_provider_environment_path_invalid');
  }
  for (const current of ['/', '/run', '/run/secrets']) {
    let stat;
    try { stat = fsModule.lstatSync(current); } catch {
      throw codedError('stack_runtime_provider_environment_unavailable');
    }
    if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== 0 ||
        (stat.mode & 0o022) !== 0) {
      throw codedError('stack_runtime_provider_environment_parent_invalid');
    }
  }
  let linkStat;
  let real;
  try {
    linkStat = fsModule.lstatSync(file);
    real = fsModule.realpathSync(file);
  } catch {
    throw codedError('stack_runtime_provider_environment_unavailable');
  }
  if (real !== file || linkStat.isSymbolicLink() || !linkStat.isFile() ||
      linkStat.uid !== VCP_PROVIDER_HOST_UID ||
      linkStat.gid !== VCP_PROVIDER_RUNTIME_GID ||
      (linkStat.mode & 0o777) !== VCP_PROVIDER_HOST_MODE ||
      linkStat.size < 1 || linkStat.size > VCP_PROVIDER_ENVIRONMENT_MAX_BYTES) {
    throw codedError('stack_runtime_provider_environment_security_invalid');
  }
  let descriptor;
  try {
    descriptor = fsModule.openSync(
      file,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0)
    );
    const before = fsModule.fstatSync(descriptor);
    if (!before.isFile() || before.uid !== VCP_PROVIDER_HOST_UID ||
        before.gid !== VCP_PROVIDER_RUNTIME_GID ||
        (before.mode & 0o777) !== VCP_PROVIDER_HOST_MODE ||
        before.dev !== linkStat.dev || before.ino !== linkStat.ino ||
        before.size < 1 || before.size > VCP_PROVIDER_ENVIRONMENT_MAX_BYTES) {
      throw codedError('stack_runtime_provider_environment_security_invalid');
    }
    const bytes = fsModule.readFileSync(descriptor);
    const after = fsModule.fstatSync(descriptor);
    const runtimeAccess = vcpProviderEnvironmentRuntimeAccess(after);
    if (!sameRuntimeProviderEnvironmentIdentity(before, after) || !after.isFile() ||
        after.uid !== VCP_PROVIDER_HOST_UID ||
        after.gid !== VCP_PROVIDER_RUNTIME_GID ||
        (after.mode & 0o777) !== VCP_PROVIDER_HOST_MODE ||
        !runtimeAccess.runtimeCanRead || runtimeAccess.runtimeCanWrite) {
      throw codedError('stack_runtime_provider_environment_identity_changed');
    }
    let providerEnvironment;
    try { providerEnvironment = parseVcpProviderEnvironment(bytes); } catch {
      throw codedError('stack_vcp_provider_environment_invalid');
    }
    return Object.freeze({
      fileIdentity: runtimeProviderEnvironmentIdentity(after),
      providerEnvironment,
      replaceableByRuntime: false,
      ...runtimeAccess
    });
  } catch (error) {
    if (error?.code?.startsWith?.('stack_')) throw error;
    throw codedError('stack_runtime_provider_environment_unavailable');
  } finally {
    if (descriptor !== undefined) fsModule.closeSync(descriptor);
  }
}

function ownerFileIdentity(file, {
  fsModule = fs,
  maximumBytes = PRIVATE_FILE_MAX_BYTES
} = {}) {
  const target = assertOwnerOnlyFile(file, {
    maximumBytes,
    fsModule
  });
  let stat;
  try {
    stat = fsModule.statSync(target, { bigint: true });
  } catch {
    throw codedError('stack_provider_config_identity_unavailable');
  }
  const values = {
    device: stat.dev,
    inode: stat.ino,
    size: stat.size,
    mtimeNs: stat.mtimeNs,
    ctimeNs: stat.ctimeNs
  };
  if (Object.values(values).some(value => typeof value !== 'bigint')) {
    throw codedError('stack_provider_config_identity_unavailable');
  }
  return Object.freeze(Object.fromEntries(
    Object.entries(values).map(([name, value]) => [name, String(value)])
  ));
}

function fileIdentityMatches(left, right) {
  return Boolean(
    left && right &&
    ['device', 'inode', 'size', 'mtimeNs', 'ctimeNs'].every(name =>
      /^[0-9]{1,40}$/u.test(left[name] || '') &&
      left[name] === right[name]
    )
  );
}

function readVcpProviderEnvironmentSnapshot(file, options = {}) {
  const before = ownerFileIdentity(file, options);
  const providerEnvironment = readVcpProviderEnvironment(file, options);
  const after = ownerFileIdentity(file, options);
  if (!fileIdentityMatches(before, after)) {
    throw codedError('stack_provider_config_identity_changed');
  }
  return Object.freeze({
    fileIdentity: after,
    providerEnvironment
  });
}

function readRuntimeVcpProviderEnvironmentSnapshot(file, options = {}) {
  return assertRootControlledRuntimeReadableProviderEnvironment(file, options);
}

function validateProviderConfigIdentityReceipt(value) {
  const controller = validateControllerIdentityReceipt(
    value, 'stack_provider_config_receipt_invalid'
  );
  const shimPid = parsePid(value?.shimPid);
  if (!exactKeys(value, [
    ...controller.keys,
    'providerConfigIdentity',
    'schemaVersion',
    'shimPid',
    'shimProcessStartTicks'
  ]) ||
      shimPid === null ||
      value.shimPid !== shimPid ||
      !/^[1-9][0-9]{0,39}$/u.test(
        value.shimProcessStartTicks || ''
      ) ||
      !exactKeys(value.providerConfigIdentity, [
        'ctimeNs',
        'device',
        'inode',
        'mtimeNs',
        'size'
      ]) ||
      !fileIdentityMatches(
        value.providerConfigIdentity,
        value.providerConfigIdentity
      )) {
    throw codedError('stack_provider_config_receipt_invalid');
  }
  return Object.freeze({
    ...controller.projection,
    providerConfigIdentity: Object.freeze({
      ...value.providerConfigIdentity
    }),
    schemaVersion: value.schemaVersion,
    shimPid,
    shimProcessStartTicks: value.shimProcessStartTicks
  });
}

function ownerIdentityReceiptPath(runtimeRoot, filename, {
  fsModule = fs
} = {}) {
  if (![
    PROVIDER_CONFIG_IDENTITY_FILENAME,
    GOVERNANCE_SECRET_IDENTITY_FILENAME,
    RELAY_SECRET_IDENTITY_FILENAME
  ]
    .includes(filename)) {
    throw codedError('stack_identity_receipt_name_invalid');
  }
  const root = assertOwnerOnlyDirectory(runtimeRoot, { fsModule });
  const directory = assertOwnerOnlyDirectory(
    path.join(root, 'pids'),
    { fsModule }
  );
  return path.join(directory, filename);
}

function writeOwnerIdentityReceipt(
  receipt,
  runtimeRoot,
  { filename, validate, failureCode, fsModule = fs }
) {
  const validated = validate(receipt);
  const file = ownerIdentityReceiptPath(
    runtimeRoot,
    filename,
    { fsModule }
  );
  const temporary = path.join(
    path.dirname(file),
    `.${filename}.${process.pid}.` +
      `${crypto.randomBytes(6).toString('hex')}.tmp`
  );
  let descriptor;
  try {
    descriptor = fsModule.openSync(
      temporary,
      fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        fs.constants.O_WRONLY |
        (fs.constants.O_CLOEXEC || 0) |
        (fs.constants.O_NOFOLLOW || 0),
      0o600
    );
    fsModule.writeFileSync(
      descriptor,
      `${JSON.stringify(validated)}\n`,
      'utf8'
    );
    fsModule.fsyncSync(descriptor);
    fsModule.closeSync(descriptor);
    descriptor = undefined;
    fsModule.renameSync(temporary, file);
    fsModule.chmodSync(file, 0o600);
  } catch {
    if (descriptor !== undefined) {
      try {
        fsModule.closeSync(descriptor);
      } catch {}
    }
    try {
      fsModule.unlinkSync(temporary);
    } catch {}
    throw codedError(failureCode);
  }
  return validated;
}

function readOwnerIdentityReceipt(
  runtimeRoot,
  { filename, validate, failureCode, fsModule = fs }
) {
  const file = ownerIdentityReceiptPath(
    runtimeRoot,
    filename,
    { fsModule }
  );
  assertOwnerOnlyFile(file, { maximumBytes: 4096, fsModule });
  try {
    return validate(
      JSON.parse(fsModule.readFileSync(file, 'utf8'))
    );
  } catch (error) {
    if (error?.code?.startsWith?.('stack_')) throw error;
    throw codedError(failureCode);
  }
}

function writeProviderConfigIdentityReceipt(receipt, runtimeRoot, options = {}) {
  return writeOwnerIdentityReceipt(receipt, runtimeRoot, {
    ...options,
    filename: PROVIDER_CONFIG_IDENTITY_FILENAME,
    validate: validateProviderConfigIdentityReceipt,
    failureCode: 'stack_provider_config_receipt_write_failed'
  });
}

function readProviderConfigIdentityReceipt(runtimeRoot, options = {}) {
  return readOwnerIdentityReceipt(runtimeRoot, {
    ...options,
    filename: PROVIDER_CONFIG_IDENTITY_FILENAME,
    validate: validateProviderConfigIdentityReceipt,
    failureCode: 'stack_provider_config_receipt_invalid'
  });
}

function providerCredentialFreshnessMatches({
  profile,
  providerConfigIdentity = null,
  providerConfigFile,
  runtimeRoot,
  shimPid
}, {
  fsModule = fs,
  readStartTicks = readLinuxProcessStartTicks
} = {}) {
  try {
    if (!profileHasRuntimeBinding(profile) ||
        parsePid(shimPid) === null) {
      return false;
    }
    const receipt = readProviderConfigIdentityReceipt(
      runtimeRoot,
      { fsModule }
    );
    return controllerIdentityReceiptMatches(receipt, profile) &&
      receipt.shimPid === shimPid &&
      receipt.shimProcessStartTicks ===
        readStartTicks(shimPid, { fsModule }) &&
      fileIdentityMatches(
        receipt.providerConfigIdentity,
        providerConfigIdentity ||
          ownerFileIdentity(providerConfigFile, { fsModule })
      );
  } catch {
    return false;
  }
}

function privateReferenceFileIdentities(
  environment,
  privateRoot,
  referenceNames,
  {
    fsModule = fs,
    maximumBytes = 16_384
  } = {}
) {
  const identities = {};
  for (const [identityName, environmentName] of Object.entries(
    referenceNames
  )) {
    const target = privateReferencePath(
      environment?.[environmentName],
      privateRoot,
      { fsModule, maximumBytes }
    );
    identities[identityName] = ownerFileIdentity(target, {
      fsModule,
      maximumBytes
    });
  }
  return Object.freeze(Object.fromEntries(
    Object.entries(identities).map(([name, identity]) => [
      name,
      Object.freeze(identity)
    ])
  ));
}

function governancePrivateFileIdentities(environment, privateRoot, options = {}) {
  return privateReferenceFileIdentities(
    environment,
    privateRoot,
    GOVERNANCE_PRIVATE_REFERENCE_NAMES,
    {
      ...options,
      maximumBytes: PRIVATE_FILE_MAX_BYTES
    }
  );
}

function relaySecretFileIdentities(environment, privateRoot, options = {}) {
  return privateReferenceFileIdentities(
    environment,
    privateRoot,
    RELAY_SECRET_REFERENCE_NAMES,
    options
  );
}

function fileIdentitySetMatches(
  left,
  right,
  referenceNames = RELAY_SECRET_REFERENCE_NAMES
) {
  return Boolean(
    left && right &&
    exactKeys(left, Object.keys(referenceNames)) &&
    exactKeys(right, Object.keys(referenceNames)) &&
    Object.keys(referenceNames).every(name =>
      fileIdentityMatches(left[name], right[name])
    )
  );
}

function validateGovernancePrivateIdentityReceipt(value) {
  const controller = validateControllerIdentityReceipt(
    value, 'stack_governance_private_receipt_invalid'
  );
  const governancePid = parsePid(value?.governancePid);
  if (!exactKeys(value, [
    ...controller.keys,
    'governancePid',
    'governanceProcessStartTicks',
    'privateFileIdentities',
    'schemaVersion'
  ]) ||
      governancePid === null ||
      value.governancePid !== governancePid ||
      !/^[1-9][0-9]{0,39}$/u.test(
        value.governanceProcessStartTicks || ''
      ) ||
      !fileIdentitySetMatches(
        value.privateFileIdentities,
        value.privateFileIdentities,
        GOVERNANCE_PRIVATE_REFERENCE_NAMES
      )) {
    throw codedError('stack_governance_private_receipt_invalid');
  }
  return Object.freeze({
    ...controller.projection,
    governancePid,
    governanceProcessStartTicks: value.governanceProcessStartTicks,
    privateFileIdentities: Object.freeze(Object.fromEntries(
      Object.entries(value.privateFileIdentities).map(([name, identity]) => [
        name,
        Object.freeze({ ...identity })
      ])
    )),
    schemaVersion: value.schemaVersion
  });
}

function writeGovernancePrivateIdentityReceipt(
  receipt,
  runtimeRoot,
  options = {}
) {
  return writeOwnerIdentityReceipt(receipt, runtimeRoot, {
    ...options,
    filename: GOVERNANCE_SECRET_IDENTITY_FILENAME,
    validate: validateGovernancePrivateIdentityReceipt,
    failureCode: 'stack_governance_private_receipt_write_failed'
  });
}

function readGovernancePrivateIdentityReceipt(runtimeRoot, options = {}) {
  return readOwnerIdentityReceipt(runtimeRoot, {
    ...options,
    filename: GOVERNANCE_SECRET_IDENTITY_FILENAME,
    validate: validateGovernancePrivateIdentityReceipt,
    failureCode: 'stack_governance_private_receipt_invalid'
  });
}

function governanceCredentialFreshnessMatches({
  governanceEnvironmentFile,
  governancePid,
  profile,
  runtimeRoot
}, {
  fsModule = fs,
  readStartTicks = readLinuxProcessStartTicks
} = {}) {
  try {
    if (!profileHasRuntimeBinding(profile) ||
        parsePid(governancePid) === null) {
      return false;
    }
    const environment = loadManagedEnvironmentFile(
      governanceEnvironmentFile,
      { fsModule }
    );
    const receipt = readGovernancePrivateIdentityReceipt(
      runtimeRoot,
      { fsModule }
    );
    return controllerIdentityReceiptMatches(receipt, profile) &&
      receipt.governancePid === governancePid &&
      receipt.governanceProcessStartTicks ===
        readStartTicks(governancePid, { fsModule }) &&
      fileIdentitySetMatches(
        receipt.privateFileIdentities,
        governancePrivateFileIdentities(
          environment,
          profile.privateRoot,
          { fsModule }
        ),
        GOVERNANCE_PRIVATE_REFERENCE_NAMES
      );
  } catch {
    return false;
  }
}

function validateRelaySecretIdentityReceipt(value) {
  const controller = validateControllerIdentityReceipt(
    value, 'stack_relay_secret_receipt_invalid'
  );
  const relayPid = parsePid(value?.relayPid);
  if (!exactKeys(value, [
    ...controller.keys,
    'relayPid',
    'relayProcessStartTicks',
    'schemaVersion',
    'secretFileIdentities'
  ]) ||
      relayPid === null ||
      value.relayPid !== relayPid ||
      !/^[1-9][0-9]{0,39}$/u.test(
        value.relayProcessStartTicks || ''
      ) ||
      !fileIdentitySetMatches(
        value.secretFileIdentities,
        value.secretFileIdentities
      )) {
    throw codedError('stack_relay_secret_receipt_invalid');
  }
  return Object.freeze({
    ...controller.projection,
    relayPid,
    relayProcessStartTicks: value.relayProcessStartTicks,
    schemaVersion: value.schemaVersion,
    secretFileIdentities: Object.freeze(Object.fromEntries(
      Object.entries(value.secretFileIdentities).map(([name, identity]) => [
        name,
        Object.freeze({ ...identity })
      ])
    ))
  });
}

function writeRelaySecretIdentityReceipt(receipt, runtimeRoot, options = {}) {
  return writeOwnerIdentityReceipt(receipt, runtimeRoot, {
    ...options,
    filename: RELAY_SECRET_IDENTITY_FILENAME,
    validate: validateRelaySecretIdentityReceipt,
    failureCode: 'stack_relay_secret_receipt_write_failed'
  });
}

function readRelaySecretIdentityReceipt(runtimeRoot, options = {}) {
  return readOwnerIdentityReceipt(runtimeRoot, {
    ...options,
    filename: RELAY_SECRET_IDENTITY_FILENAME,
    validate: validateRelaySecretIdentityReceipt,
    failureCode: 'stack_relay_secret_receipt_invalid'
  });
}

function relayCredentialFreshnessMatches({
  profile,
  relayEnvironmentFile,
  relayPid,
  runtimeRoot
}, {
  fsModule = fs,
  readStartTicks = readLinuxProcessStartTicks
} = {}) {
  try {
    if (!profileHasRuntimeBinding(profile) ||
        parsePid(relayPid) === null) {
      return false;
    }
    const environment = loadManagedEnvironmentFile(
      relayEnvironmentFile,
      { fsModule }
    );
    const receipt = readRelaySecretIdentityReceipt(
      runtimeRoot,
      { fsModule }
    );
    return controllerIdentityReceiptMatches(receipt, profile) &&
      receipt.relayPid === relayPid &&
      receipt.relayProcessStartTicks ===
        readStartTicks(relayPid, { fsModule }) &&
      fileIdentitySetMatches(
        receipt.secretFileIdentities,
        relaySecretFileIdentities(
          environment,
          profile.privateRoot,
          { fsModule }
        )
      );
  } catch {
    return false;
  }
}

function vcpProviderConfigDigest(providerEnvironment) {
  try {
    return sharedVcpProviderConfigDigest(providerEnvironment);
  } catch {
    throw codedError('stack_vcp_provider_environment_invalid');
  }
}

function profileVcpProviderConfigMatches(profile, providerEnvironment) {
  try {
    return profileHasRuntimeBinding(profile) &&
      SAFE_SHA256_DIGEST.test(profile?.vcpProviderConfigDigest || '') &&
      vcpProviderConfigDigest(providerEnvironment) ===
        profile.vcpProviderConfigDigest;
  } catch {
    return false;
  }
}

function validateRetainedBindingPayload(binding, expectedSource) {
  if (!SAFE_GIT_OBJECT.test(expectedSource || '') ||
      binding?.sourceCommit !== expectedSource ||
      binding?.governanceBindingFinalized !== true ||
      binding?.defaultClosed !== true ||
      binding?.primaryMemoryWriteEnabled !== false ||
      binding?.publicWriteSurfaceEnabled !== false ||
      binding?.formalIsolatedShimTargetRequired !== true ||
      binding?.temporaryEndpointOverrideAllowed !== false) {
    throw codedError('stack_retained_binding_invalid');
  }
  return true;
}

function profileRetainedBindingMatches(profile, {
  fsModule = fs
} = {}) {
  try {
    const file = resolvePrivateReference(profile, profile.retainedBinding, {
      fsModule
    });
    const binding = readRetainedBindingFile(file, { fsModule });
    return validateRetainedBindingPayload(
      binding,
      profile.retainedBindingSource
    ) === true;
  } catch {
    return false;
  }
}

function validateProfile(value) {
  if (value?.schemaVersion === IMAGE_PROFILE_SCHEMA_VERSION) {
    try { return validateImageProfile(value); } catch {
      throw codedError('stack_profile_invalid');
    }
  }
  const v6IdentityMode = value?.schemaVersion === PROFILE_SCHEMA_VERSION
    ? profileVcpRuntimeIdentityMode(value)
    : null;
  const keys = value?.schemaVersion === LEGACY_PROFILE_SCHEMA_VERSION
    ? LEGACY_PROFILE_KEYS
    : value?.schemaVersion === EXACT_HEAD_PROFILE_SCHEMA_VERSION
      ? V5_PROFILE_KEYS
      : v6IdentityMode === 'legacy'
        ? LEGACY_V6_PROFILE_KEYS
        : PROFILE_KEYS;
  if (!exactKeys(value, keys) ||
      ![
        LEGACY_PROFILE_SCHEMA_VERSION,
        EXACT_HEAD_PROFILE_SCHEMA_VERSION,
        PROFILE_SCHEMA_VERSION
      ].includes(value.schemaVersion) ||
      !SAFE_GIT_OBJECT.test(value.runtimeBaseline || '') ||
      !SAFE_GIT_OBJECT.test(value.retainedBindingSource || '') ||
      !SAFE_CONTAINER_NAME.test(value.edgeContainer || '') ||
      !SAFE_CONTAINER_ID.test(value.edgeContainerId || '') ||
      value.providerContainer !== PROVIDER_CONTAINER_DEFAULT ||
      !SAFE_CONTAINER_ID.test(value.providerContainerId || '') ||
      !SAFE_IMAGE_ID.test(value.providerImageId || '') ||
      !SAFE_GIT_OBJECT.test(value.providerRevision || '') ||
      typeof value.privateRoot !== 'string' ||
      !path.isAbsolute(value.privateRoot) ||
      path.resolve(value.privateRoot) !== value.privateRoot ||
      typeof value.runtimeRepository !== 'string' ||
      !path.isAbsolute(value.runtimeRepository) ||
      path.resolve(value.runtimeRepository) !== value.runtimeRepository) {
    throw codedError('stack_profile_invalid');
  }
  if (value.schemaVersion === EXACT_HEAD_PROFILE_SCHEMA_VERSION &&
      (
        !SAFE_GIT_OBJECT.test(value.controllerSourceCommit || '') ||
        !SAFE_SHA256_DIGEST.test(
          value.governanceEnvironmentConfigDigest || ''
        ) ||
        !SAFE_SHA256_DIGEST.test(
          value.relayEnvironmentConfigDigest || ''
        ) ||
        !SAFE_GIT_OBJECT.test(value.vcpRuntimeBaseline || '') ||
        !SAFE_SHA256_DIGEST.test(value.vcpProviderConfigDigest || '') ||
        !SAFE_SHA256_DIGEST.test(value.vcpRuntimeScopeDigest || '') ||
        typeof value.vcpRuntimeRepository !== 'string' ||
        !path.isAbsolute(value.vcpRuntimeRepository) ||
        path.resolve(value.vcpRuntimeRepository) !==
          value.vcpRuntimeRepository
      )) {
    throw codedError('stack_profile_invalid');
  }
  if (value.schemaVersion === PROFILE_SCHEMA_VERSION &&
      (
        !['legacy', 'contract_v1'].includes(v6IdentityMode) ||
        !SAFE_GIT_OBJECT.test(value.adoptedRepositoryHead || '') ||
        value.controllerSourceManifestVersion !== MANIFEST_SCHEMA_VERSION ||
        !SAFE_SHA256_DIGEST.test(
          value.controllerSourceManifestDigest || ''
        ) ||
        !SAFE_SHA256_DIGEST.test(
          value.governanceEnvironmentConfigDigest || ''
        ) ||
        !SAFE_SHA256_DIGEST.test(
          value.relayEnvironmentConfigDigest || ''
        ) ||
        !SAFE_GIT_OBJECT.test(value.vcpRuntimeBaseline || '') ||
        !SAFE_SHA256_DIGEST.test(value.vcpProviderConfigDigest || '') ||
        !SAFE_SHA256_DIGEST.test(value.vcpRuntimeScopeDigest || '') ||
        typeof value.vcpRuntimeRepository !== 'string' ||
        !path.isAbsolute(value.vcpRuntimeRepository) ||
        path.resolve(value.vcpRuntimeRepository) !==
          value.vcpRuntimeRepository
      )) {
    throw codedError('stack_profile_invalid');
  }
  assertRelativeReference(value.governanceEnvironment);
  assertRelativeReference(value.relayEnvironment);
  assertRelativeReference(value.retainedBinding);
  return Object.freeze({ ...value });
}

function readProfile({
  environment = process.env,
  fsModule = fs
} = {}) {
  const file = profilePath(environment);
  assertOwnerOnlyFile(file, { maximumBytes: 16_384, fsModule });
  let parsed;
  try {
    parsed = JSON.parse(fsModule.readFileSync(file, 'utf8'));
  } catch {
    throw codedError('stack_profile_json_invalid');
  }
  const profile = validateProfile(parsed);
  assertPrivateRootBoundary(profile.privateRoot, { environment, fsModule });
  assertOwnerOnlyDirectory(profile.privateRoot, { fsModule });
  assertOwnerRepositoryDirectory(profile.runtimeRepository, { fsModule });
  resolvePrivateReference(profile, profile.governanceEnvironment, { fsModule });
  resolvePrivateReference(profile, profile.relayEnvironment, { fsModule });
  resolvePrivateReference(profile, profile.retainedBinding, { fsModule });
  return profile;
}

function writeProfile(profile, {
  environment = process.env,
  fsModule = fs,
  replace = false
} = {}) {
  const validated = validateProfile(profile);
  assertPrivateRootBoundary(validated.privateRoot, { environment, fsModule });
  const file = profilePath(environment);
  const directory = path.dirname(file);
  assertOwnerOnlyDirectory(directory, { create: true, fsModule });
  if (!replace && fsModule.existsSync(file)) {
    throw codedError('stack_profile_already_exists');
  }
  const temporary = path.join(
    directory,
    `.${PROFILE_FILENAME}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`
  );
  const body = `${JSON.stringify(validated, null, 2)}\n`;
  let descriptor;
  try {
    descriptor = fsModule.openSync(
      temporary,
      fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY,
      0o600
    );
    fsModule.writeFileSync(descriptor, body, 'utf8');
    fsModule.fsyncSync(descriptor);
    fsModule.closeSync(descriptor);
    descriptor = undefined;
    fsModule.chmodSync(temporary, 0o600);
    fsModule.renameSync(temporary, file);
  } catch (error) {
    if (descriptor !== undefined) {
      try {
        fsModule.closeSync(descriptor);
      } catch {}
    }
    try {
      fsModule.unlinkSync(temporary);
    } catch {}
    throw error;
  }
  return validated;
}

function ensureRuntimeDirectories(environment = process.env) {
  const root = runtimeDirectory(environment);
  assertOwnerOnlyDirectory(path.dirname(root));
  assertOwnerOnlyDirectory(root, { create: true });
  for (const name of ['data', 'logs', 'pids', 'store']) {
    assertOwnerOnlyDirectory(path.join(root, name), { create: true });
  }
  return root;
}

function componentPaths(name, environment = process.env) {
  const component = COMPONENTS[name];
  if (!component) throw codedError('stack_component_invalid');
  const root = runtimeDirectory(environment);
  return Object.freeze({
    pid: path.join(root, 'pids', component.pidFile),
    log: path.join(root, 'logs', component.logFile)
  });
}

function lifecycleLockPath(environment = process.env) {
  return path.join(runtimeDirectory(environment), 'pids', 'lifecycle.lock');
}

function readLinuxProcessStartTicks(pid, {
  fsModule = fs
} = {}) {
  const normalizedPid = parsePid(pid);
  if (normalizedPid === null) {
    throw codedError('stack_process_start_identity_invalid');
  }
  let value;
  try {
    value = fsModule.readFileSync(
      `/proc/${normalizedPid}/stat`,
      'utf8'
    );
  } catch {
    throw codedError('stack_process_start_identity_unavailable');
  }
  if (typeof value !== 'string' ||
      value.length < 8 ||
      value.length > 16_384) {
    throw codedError('stack_process_start_identity_invalid');
  }
  const closing = value.lastIndexOf(') ');
  if (!value.startsWith(`${normalizedPid} (`) || closing < 3) {
    throw codedError('stack_process_start_identity_invalid');
  }
  const fields = value.slice(closing + 2).trim().split(/\s+/u);
  const startTicks = fields[19];
  if (!/^[1-9][0-9]{0,39}$/u.test(startTicks || '')) {
    throw codedError('stack_process_start_identity_invalid');
  }
  return startTicks;
}

function validateLifecycleLockRecord(value) {
  const pid = parsePid(value?.pid);
  if (!exactKeys(value, ['pid', 'schemaVersion', 'startTicks']) ||
      value.schemaVersion !== 1 ||
      pid === null ||
      value.pid !== pid ||
      !/^[1-9][0-9]{0,39}$/u.test(value.startTicks || '')) {
    throw codedError('stack_lifecycle_lock_invalid');
  }
  return Object.freeze({
    pid,
    schemaVersion: 1,
    startTicks: value.startTicks
  });
}

function attachLifecycleLockProvenance(error, {
  cleanupPhase = null,
  lifecycleLockAcquired = false,
  lifecycleLockReleaseAttempted = false,
  lifecycleLockReleased = true,
  residualLockPossible = false,
  primaryErrorCode = null,
  cleanupErrorCode = null
} = {}) {
  return Object.assign(error, {
    cleanupPhase,
    lifecycleLockAcquired,
    lifecycleLockReleaseAttempted,
    lifecycleLockReleased,
    residualLockPossible,
    primaryErrorCode,
    cleanupErrorCode
  });
}

function lifecycleAcquisitionCleanupError({
  cleanupPhase,
  primaryErrorCode,
  cleanupErrorCode
}) {
  return attachLifecycleLockProvenance(
    codedError('stack_lifecycle_acquisition_cleanup_failed'),
    {
      cleanupPhase,
      lifecycleLockAcquired: true,
      lifecycleLockReleaseAttempted: true,
      lifecycleLockReleased: false,
      residualLockPossible: true,
      primaryErrorCode,
      cleanupErrorCode
    }
  );
}

function acquireOwnerLock(file, {
  fsModule = fs,
  kill = process.kill,
  readStartTicks = readLinuxProcessStartTicks,
  retry = true
} = {}) {
  const parent = assertOwnerOnlyDirectory(path.dirname(file), { fsModule });
  if (path.dirname(file) !== parent) throw codedError('stack_lifecycle_lock_path_invalid');
  const flags = fs.constants.O_CREAT |
    fs.constants.O_EXCL |
    fs.constants.O_WRONLY |
    (fs.constants.O_CLOEXEC || 0) |
    (fs.constants.O_NOFOLLOW || 0);
  let descriptor;
  try {
    descriptor = fsModule.openSync(file, flags, 0o600);
  } catch (error) {
    if (error?.code !== 'EEXIST') throw codedError('stack_lifecycle_lock_failed');
    let existing;
    let owner;
    try {
      existing = fsModule.lstatSync(file);
      if (!existing.isFile() || existing.isSymbolicLink() ||
          existing.uid !== currentUid() || (existing.mode & 0o077) !== 0 ||
          existing.size < 1 || existing.size > 256) {
        throw codedError('stack_lifecycle_lock_invalid');
      }
      owner = validateLifecycleLockRecord(
        JSON.parse(fsModule.readFileSync(file, 'utf8'))
      );
    } catch (inspectionError) {
      if (inspectionError?.code?.startsWith?.('stack_')) throw inspectionError;
      throw codedError('stack_lifecycle_lock_invalid');
    }
    if (isPidRunning(owner.pid, kill)) {
      let currentStartTicks;
      try {
        currentStartTicks = readStartTicks(owner.pid, { fsModule });
      } catch {
        throw codedError('stack_lifecycle_busy');
      }
      if (currentStartTicks === owner.startTicks) {
        throw codedError('stack_lifecycle_busy');
      }
    }
    if (!retry) throw codedError('stack_lifecycle_lock_recovery_failed');
    let current;
    try {
      current = fsModule.lstatSync(file);
    } catch {
      throw codedError('stack_lifecycle_lock_identity_changed');
    }
    if (current.dev !== existing.dev || current.ino !== existing.ino ||
        current.uid !== existing.uid || !current.isFile() ||
        current.isSymbolicLink()) {
      throw codedError('stack_lifecycle_lock_identity_changed');
    }
    try {
      fsModule.unlinkSync(file);
    } catch {
      throw codedError('stack_lifecycle_lock_recovery_failed');
    }
    return acquireOwnerLock(file, {
      fsModule,
      kill,
      readStartTicks,
      retry: false
    });
  }
  let identity;
  try {
    const owner = validateLifecycleLockRecord({
      pid: process.pid,
      schemaVersion: 1,
      startTicks: readStartTicks(process.pid, { fsModule })
    });
    fsModule.writeFileSync(
      descriptor,
      `${JSON.stringify(owner)}\n`,
      'utf8'
    );
    fsModule.fsyncSync(descriptor);
    identity = fsModule.fstatSync(descriptor);
    fsModule.closeSync(descriptor);
    descriptor = undefined;
    fsModule.chmodSync(file, 0o600);
  } catch (initializationError) {
    const primaryErrorCode = safeCode(
      initializationError,
      'stack_lifecycle_lock_failed'
    );
    let cleanupErrorCode = null;
    let cleanupIdentity = identity;
    if (!cleanupIdentity && descriptor !== undefined) {
      try {
        cleanupIdentity = fsModule.fstatSync(descriptor);
      } catch {
        cleanupErrorCode = 'stack_lifecycle_lock_identity_unavailable';
      }
    }
    let descriptorClosed = descriptor === undefined;
    if (descriptor !== undefined) {
      try {
        fsModule.closeSync(descriptor);
        descriptorClosed = true;
      } catch {
        cleanupErrorCode ||= 'stack_lifecycle_lock_close_failed';
      }
    }
    if (!descriptorClosed) {
      cleanupErrorCode ||= 'stack_lifecycle_lock_close_failed';
    } else if (!cleanupIdentity) {
      cleanupErrorCode ||= 'stack_lifecycle_lock_identity_unavailable';
    } else {
      let current;
      try {
        current = fsModule.lstatSync(file);
      } catch {
        cleanupErrorCode ||= 'stack_lifecycle_lock_identity_changed';
      }
      if (current && (
        !current.isFile() || current.isSymbolicLink() ||
        current.uid !== currentUid() ||
        current.dev !== cleanupIdentity.dev ||
        current.ino !== cleanupIdentity.ino
      )) {
        cleanupErrorCode ||= 'stack_lifecycle_lock_identity_changed';
      }
      if (!cleanupErrorCode && current) {
        try {
          fsModule.unlinkSync(file);
        } catch {
          cleanupErrorCode = 'stack_lifecycle_lock_unlink_failed';
        }
      }
    }
    if (cleanupErrorCode) {
      throw lifecycleAcquisitionCleanupError({
        cleanupPhase: 'owner_lock_initialization',
        primaryErrorCode,
        cleanupErrorCode
      });
    }
    throw attachLifecycleLockProvenance(codedError(primaryErrorCode), {
      cleanupPhase: 'owner_lock_initialization',
      lifecycleLockAcquired: true,
      lifecycleLockReleaseAttempted: true,
      lifecycleLockReleased: true,
      residualLockPossible: false,
      primaryErrorCode,
      cleanupErrorCode: null
    });
  }
  let released = false;
  return Object.freeze({
    release() {
      if (released) return false;
      let current;
      try {
        current = fsModule.lstatSync(file);
      } catch {
        throw codedError('stack_lifecycle_lock_identity_changed');
      }
      if (!current.isFile() || current.isSymbolicLink() ||
          current.uid !== currentUid() ||
          current.dev !== identity.dev || current.ino !== identity.ino) {
        throw codedError('stack_lifecycle_lock_identity_changed');
      }
      try {
        fsModule.unlinkSync(file);
      } catch {
        throw codedError('stack_lifecycle_lock_release_failed');
      }
      released = true;
      return true;
    }
  });
}

function acquireLifecycleProfile({
  environment = process.env,
  ensureRuntime = ensureRuntimeDirectories,
  acquireLock = acquireOwnerLock,
  read = readProfile
} = {}) {
  ensureRuntime(environment);
  const lifecycleLock = acquireLock(lifecycleLockPath(environment));
  try {
    const profile = read({ environment });
    return Object.freeze({
      profile,
      release: () => lifecycleLock.release()
    });
  } catch (error) {
    try {
      lifecycleLock.release();
    } catch (releaseError) {
      throw lifecycleAcquisitionCleanupError({
        cleanupPhase: 'lifecycle_profile_acquisition',
        primaryErrorCode: safeCode(
          error,
          'stack_lifecycle_profile_acquisition_failed'
        ),
        cleanupErrorCode: safeCode(
          releaseError,
          'stack_lifecycle_lock_release_failed'
        )
      });
    }
    throw attachLifecycleLockProvenance(error, {
      cleanupPhase: 'lifecycle_profile_acquisition',
      lifecycleLockAcquired: true,
      lifecycleLockReleaseAttempted: true,
      lifecycleLockReleased: true,
      residualLockPossible: false,
      primaryErrorCode: safeCode(
        error,
        'stack_lifecycle_profile_acquisition_failed'
      ),
      cleanupErrorCode: null
    });
  }
}

function parsePid(value) {
  const normalized = String(value || '').trim();
  if (!/^[1-9][0-9]{0,9}$/u.test(normalized)) return null;
  const pid = Number(normalized);
  return Number.isSafeInteger(pid) && pid > 1 ? pid : null;
}

function readPidFile(file, fsModule = fs) {
  try {
    const stat = fsModule.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() ||
        stat.uid !== currentUid() || (stat.mode & 0o077) !== 0 ||
        stat.size < 1 || stat.size > 32) {
      return null;
    }
    return parsePid(fsModule.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function inspectPidFile(file, fsModule = fs) {
  let stat;
  try {
    stat = fsModule.lstatSync(file);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return Object.freeze({ present: false, valid: true, pid: null });
    }
    return Object.freeze({ present: true, valid: false, pid: null });
  }
  if (!stat.isFile() || stat.isSymbolicLink() ||
      stat.uid !== currentUid() || (stat.mode & 0o077) !== 0 ||
      stat.size < 1 || stat.size > 32) {
    return Object.freeze({ present: true, valid: false, pid: null });
  }
  let value;
  try {
    value = fsModule.readFileSync(file, 'utf8');
  } catch {
    return Object.freeze({ present: true, valid: false, pid: null });
  }
  const pid = parsePid(value);
  return Object.freeze({
    present: true,
    valid: pid !== null,
    pid
  });
}

function isPidRunning(pid, kill = process.kill) {
  if (!Number.isSafeInteger(pid) || pid <= 1) return false;
  try {
    kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === 'EPERM') return true;
    return false;
  }
}

function readProcessCommand(pid, fsModule = fs) {
  if (!isPidRunning(pid)) return [];
  try {
    const value = fsModule.readFileSync(`/proc/${pid}/cmdline`);
    return value.toString('utf8').split('\0').filter(Boolean);
  } catch {
    return [];
  }
}

function readProcessIdentity(pid, fsModule = fs) {
  if (!isPidRunning(pid)) return null;
  try {
    const command = readProcessCommand(pid, fsModule);
    const executable = fsModule.realpathSync(`/proc/${pid}/exe`);
    const cwd = fsModule.realpathSync(`/proc/${pid}/cwd`);
    if (command.length < 2 || !path.isAbsolute(executable) ||
        !path.isAbsolute(cwd)) {
      return null;
    }
    return Object.freeze({ command, executable, cwd });
  } catch {
    return null;
  }
}

function processEnvironmentExactlyMatches(pid, expected, {
  fsModule = fs,
  maximumBytes = PRIVATE_FILE_MAX_BYTES
} = {}) {
  const normalizedPid = parsePid(pid);
  if (normalizedPid === null ||
      !expected ||
      typeof expected !== 'object' ||
      Array.isArray(expected) ||
      !Number.isSafeInteger(maximumBytes) ||
      maximumBytes < 1) {
    return false;
  }
  const expectedNames = Object.keys(expected);
  if (expectedNames.some(name =>
    !/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name) ||
    typeof expected[name] !== 'string' ||
    expected[name].includes('\0')
  )) {
    return false;
  }
  let value;
  try {
    value = fsModule.readFileSync(`/proc/${normalizedPid}/environ`);
  } catch {
    return false;
  }
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  if (buffer.length < 1 ||
      buffer.length > maximumBytes ||
      buffer[buffer.length - 1] !== 0) {
    return false;
  }
  const seen = new Set();
  let start = 0;
  while (start < buffer.length) {
    const end = buffer.indexOf(0, start);
    if (end < start || end === start) return false;
    const separator = buffer.indexOf(0x3D, start);
    if (separator <= start || separator >= end) return false;
    const name = buffer.subarray(start, separator).toString('utf8');
    if (!Object.hasOwn(expected, name) || seen.has(name)) return false;
    const expectedEntry = Buffer.from(`${name}=${expected[name]}`, 'utf8');
    if (!buffer.subarray(start, end).equals(expectedEntry)) return false;
    seen.add(name);
    start = end + 1;
  }
  return seen.size === expectedNames.length;
}

function nodeProcessIdentityMatches(identity, {
  fsModule = fs,
  canonicalNodePath = null
} = {}) {
  if (!identity) return false;
  try {
    const expected = canonicalNodePath || fsModule.realpathSync(process.execPath);
    return identity.executable === expected;
  } catch {
    return false;
  }
}

function expectedComponentEnvironmentFile(name, profile) {
  const reference = name === 'relay'
    ? profile.relayEnvironment
    : profile.governanceEnvironment;
  const target = path.resolve(
    profile.privateRoot,
    assertRelativeReference(reference)
  );
  const relation = path.relative(profile.privateRoot, target);
  if (!relation || relation.startsWith('..') || path.isAbsolute(relation)) {
    throw codedError('stack_profile_reference_outside_root');
  }
  return target;
}

function resolveCommandPath(value, cwd) {
  if (typeof value !== 'string' || !value || value.includes('\0')) return null;
  return path.resolve(cwd, value);
}

function componentCommandShapeKind(name, command, {
  executable,
  cwd,
  profile,
  environment = process.env
} = {}) {
  const component = COMPONENTS[name];
  if (!component || !profile || !Array.isArray(command) ||
      !command.every(value => typeof value === 'string') ||
      typeof command[0] !== 'string' || command[0].length === 0) {
    return null;
  }
  let environmentFile;
  try {
    environmentFile = expectedComponentEnvironmentFile(name, profile);
  } catch {
    return null;
  }
  const shapeCwd = typeof cwd === 'string' && path.isAbsolute(cwd)
    ? cwd
    : profile.runtimeRepository;
  const controllerCommand = [
    command[0],
    path.join(profile.runtimeRepository, 'scripts', 'codex-memory-stack.js'),
    component.mode,
    `--stack-environment=${environmentFile}`
  ];
  if (command.length === controllerCommand.length &&
      command.every((value, index) => value === controllerCommand[index])) {
    return 'controller';
  }
  const runtimeRoot = runtimeDirectory(environment);
  if (name === 'shim') {
    const legacy = [
      command[0],
      path.join(
        profile.runtimeRepository,
        'src',
        'cli',
        'vcp-toolbox-native-mcp-shim.js'
      ),
      '--host',
      '127.0.0.1',
      '--port',
      '7615',
      '--vcp-root',
      path.resolve(profile.runtimeRepository, '..', '..', 'runtime', 'VCPToolBox'),
      '--kb-store',
      path.join(runtimeRoot, 'store')
    ];
    return command.length === legacy.length &&
      command.every((value, index) =>
        index === 1
          ? resolveCommandPath(value, shapeCwd) === legacy[index]
          : value === legacy[index]
      )
      ? 'legacy'
      : null;
  }
  if (name === 'http') {
    return command.length === 2 &&
      resolveCommandPath(command[1], shapeCwd) ===
        path.join(profile.runtimeRepository, 'src', 'http-index.js')
      ? 'legacy'
      : null;
  }
  const legacyRunner = path.join(runtimeRoot, `${name}-runner.js`);
  return command.length === 3 &&
    command[1] === `--env-file=${environmentFile}` &&
    resolveCommandPath(command[2], shapeCwd) === legacyRunner
    ? 'legacy'
    : null;
}

function componentCommandKind(name, command, {
  executable,
  cwd,
  profile,
  environment = process.env,
  fsModule = fs,
  canonicalNodePath = null
} = {}) {
  if (cwd !== profile?.runtimeRepository ||
      !nodeProcessIdentityMatches(
        { executable, cwd, command },
        { fsModule, canonicalNodePath }
      )) {
    return null;
  }
  return componentCommandShapeKind(name, command, {
    executable,
    cwd,
    profile,
    environment
  });
}

function commandMatchesComponent(name, command, options = {}) {
  return componentCommandKind(name, command, options) !== null;
}

function controllerCommandMatchesComponent(name, command, options = {}) {
  return componentCommandKind(name, command, options) === 'controller';
}

function classifyManagedCommandShape(command, {
  profile,
  environment = process.env
} = {}) {
  if (!profile || typeof profile.runtimeRepository !== 'string') {
    return COMMAND_SHAPES.AMBIGUOUS;
  }
  const script = path.join(
    profile.runtimeRepository,
    'scripts',
    'codex-memory-stack.js'
  );
  const modes = new Set(Object.values(COMPONENTS).map(component =>
    component.mode
  ));
  const legacyHints = [
    path.join(profile.runtimeRepository, 'src', 'http-index.js'),
    path.join(
      profile.runtimeRepository,
      'src',
      'cli',
      'vcp-toolbox-native-mcp-shim.js'
    )
  ];
  return classifyProcessCommandShape(command, {
    matchComponents(argv) {
      return Object.keys(COMPONENTS).filter(name =>
        componentCommandShapeKind(name, argv, {
          profile,
          environment
        }) !== null
      );
    },
    hasManagedShapeHint(argv) {
      return argv.some(value =>
        modes.has(value) ||
        value === script ||
        value.startsWith('--stack-environment=') ||
        legacyHints.includes(value) ||
        value.startsWith('--env-file=')
      );
    }
  });
}

function inspectProcessIdentity(name, {
  environment = process.env,
  fsModule = fs
} = {}) {
  if (!COMPONENTS[name]) throw codedError('stack_component_invalid');
  const { pid: pidFile } = componentPaths(name, environment);
  const pid = readPidFile(pidFile, fsModule);
  const running = isPidRunning(pid);
  const identity = running ? readProcessIdentity(pid, fsModule) : null;
  return Object.freeze({
    pid,
    running,
    identity
  });
}

function deriveRuntimeRepositoryFromHttpIdentity(identity, {
  fsModule = fs
} = {}) {
  if (!nodeProcessIdentityMatches(identity, { fsModule })) {
    throw codedError('stack_adoption_http_identity_invalid');
  }
  const command = identity.command;
  if (command.length !== 4 ||
      command[2] !== '_run-http' ||
      !command[3].startsWith('--stack-environment=')) {
    throw codedError('stack_adoption_http_identity_invalid');
  }
  extractEnvFileArgument(command);
  const script = resolveCommandPath(command[1], identity.cwd);
  if (path.basename(script || '') !== 'codex-memory-stack.js' ||
      path.basename(path.dirname(script)) !== 'scripts') {
    throw codedError('stack_adoption_http_identity_invalid');
  }
  const repository = path.resolve(script, '..', '..');
  if (identity.cwd !== repository) {
    throw codedError('stack_adoption_http_identity_invalid');
  }
  return assertOwnerRepositoryDirectory(repository, { fsModule });
}

function assertAdoptionRepositoryMatch(
  runtimeRepository,
  controllerRepository = REPO_ROOT
) {
  if (typeof runtimeRepository !== 'string' ||
      runtimeRepository.length === 0 ||
      typeof controllerRepository !== 'string' ||
      controllerRepository.length === 0 ||
      path.resolve(runtimeRepository) !== path.resolve(controllerRepository)) {
    throw codedError('stack_adoption_repository_mismatch');
  }
  return true;
}

function inspectManagedProcess(name, {
  environment = process.env,
  fsModule = fs,
  profile
} = {}) {
  const state = inspectProcessIdentity(name, { environment, fsModule });
  const commandKind = state.running
    ? componentCommandKind(
      name,
      state.identity?.command,
      {
        executable: state.identity?.executable,
        cwd: state.identity?.cwd,
        profile,
        environment,
        fsModule
      }
    )
    : null;
  let controllerEnvironmentBound = false;
  if (state.running && commandKind === 'controller') {
    try {
      const environmentFile = expectedComponentEnvironmentFile(name, profile);
      const governanceState = name === 'relay'
        ? inspectProcessIdentity('governance', { environment, fsModule })
        : null;
      const expectedGovernancePid = governanceState?.running === true
        ? governanceState.pid
        : null;
      const expectedEnvironment = buildControllerChildEnvironment(
        environmentFile,
        {
          profile,
          environment,
          expectedGovernancePid,
          fsModule
        }
      );
      controllerEnvironmentBound = processEnvironmentExactlyMatches(
        state.pid,
        expectedEnvironment,
        { fsModule }
      );
    } catch {}
  }
  return Object.freeze({
    pid: state.pid,
    running: state.running,
    managed: state.running && commandKind !== null,
    controllerManaged: state.running &&
      commandKind === 'controller' &&
      controllerEnvironmentBound
  });
}

function extractEnvFileArgument(command) {
  if (!Array.isArray(command)) throw codedError('stack_process_command_invalid');
  for (let index = 0; index < command.length; index += 1) {
    const argument = command[index];
    if (argument.startsWith('--stack-environment=')) {
      const value = argument.slice('--stack-environment='.length);
      if (!path.isAbsolute(value)) throw codedError('stack_process_env_file_invalid');
      return path.resolve(value);
    }
    if (argument.startsWith('--env-file=')) {
      const value = argument.slice('--env-file='.length);
      if (!path.isAbsolute(value)) throw codedError('stack_process_env_file_invalid');
      return path.resolve(value);
    }
    if (argument === '--env-file') {
      const value = command[index + 1];
      if (!value || !path.isAbsolute(value)) {
        throw codedError('stack_process_env_file_invalid');
      }
      return path.resolve(value);
    }
  }
  throw codedError('stack_process_env_file_missing');
}

function gitText(args, {
  repoRoot = REPO_ROOT,
  exec = execFileSync
} = {}) {
  try {
    return String(exec('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })).trim();
  } catch {
    throw codedError('stack_git_preflight_failed');
  }
}

function vcpRuntimeRepository() {
  if (process.env.CODEX_MEMORY_CONTAINER_SUPERVISOR === '1') {
    return IMAGE_VCP_ROOT;
  }
  return path.resolve(REPO_ROOT, '..', '..', 'runtime', 'VCPToolBox');
}

const NODE_BUILTIN_MODULES = new Set([
  ...builtinModules,
  ...builtinModules.map(name => `node:${name}`)
]);

function normalizedVcpRelativePath(value) {
  if (typeof value !== 'string' || value.length < 1 || value.includes('\\') ||
      value.includes('\0') || path.posix.isAbsolute(value)) {
    throw codedError('stack_vcp_runtime_contract_path_invalid');
  }
  const normalized = path.posix.normalize(value);
  if (normalized !== value || normalized === '..' ||
      normalized.startsWith('../')) {
    throw codedError('stack_vcp_runtime_contract_path_invalid');
  }
  return normalized;
}

function vcpExternalPackageName(specifier) {
  if (NODE_BUILTIN_MODULES.has(specifier)) return null;
  if (typeof specifier !== 'string' || specifier.length < 1 ||
      specifier.startsWith('.') || specifier.startsWith('/')) {
    throw codedError('stack_vcp_runtime_contract_dependency_invalid');
  }
  const parts = specifier.split('/');
  return specifier.startsWith('@')
    ? parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null
    : parts[0];
}

const VCP_DEPENDENCY_ANALYSIS_STATUS = Object.freeze({
  AMBIGUOUS: 'AMBIGUOUS',
  COMPLETE: 'COMPLETE',
  PARSE_FAILED: 'PARSE_FAILED',
  UNSUPPORTED_INDIRECTION: 'UNSUPPORTED_INDIRECTION'
});

function parseVcpStaticDependencies(source) {
  const rejected = (status, stableErrorCode) => Object.freeze({
    specifiers: Object.freeze([]),
    stableErrorCode,
    status
  });
  if (typeof source !== 'string') {
    return rejected(
      VCP_DEPENDENCY_ANALYSIS_STATUS.PARSE_FAILED,
      'stack_vcp_runtime_contract_dependency_parse_failed'
    );
  }
  let program;
  try {
    program = acorn.parse(source, {
      allowHashBang: true,
      ecmaVersion: 'latest',
      sourceType: 'script'
    });
  } catch {
    try {
      program = acorn.parse(source, {
        allowHashBang: true,
        ecmaVersion: 'latest',
        sourceType: 'module'
      });
    } catch {
      return rejected(
        VCP_DEPENDENCY_ANALYSIS_STATUS.PARSE_FAILED,
        'stack_vcp_runtime_contract_dependency_parse_failed'
      );
    }
  }

  const children = node => Object.entries(node).flatMap(([key, value]) => {
    if (key === 'start' || key === 'end' || key === 'loc' || key === 'range') {
      return [];
    }
    if (Array.isArray(value)) {
      return value.filter(candidate => candidate?.type);
    }
    return value?.type ? [value] : [];
  });
  const walk = (node, visit, parent = null) => {
    visit(node, parent);
    for (const child of children(node)) walk(child, visit, node);
  };
  const boundNames = new Set();
  const collectPatternNames = pattern => {
    if (!pattern) return;
    if (pattern.type === 'Identifier') {
      boundNames.add(pattern.name);
      return;
    }
    if (pattern.type === 'RestElement') {
      collectPatternNames(pattern.argument);
      return;
    }
    if (pattern.type === 'AssignmentPattern') {
      collectPatternNames(pattern.left);
      return;
    }
    if (pattern.type === 'ArrayPattern') {
      for (const element of pattern.elements) collectPatternNames(element);
      return;
    }
    if (pattern.type === 'ObjectPattern') {
      for (const property of pattern.properties) {
        collectPatternNames(
          property.type === 'RestElement' ? property.argument : property.value
        );
      }
    }
  };
  walk(program, node => {
    if (node.type === 'VariableDeclarator') collectPatternNames(node.id);
    if (node.type === 'FunctionDeclaration' ||
        node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression') {
      collectPatternNames(node.id);
      for (const parameter of node.params) collectPatternNames(parameter);
    }
    if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
      collectPatternNames(node.id);
    }
    if (node.type === 'ImportSpecifier' ||
        node.type === 'ImportDefaultSpecifier' ||
        node.type === 'ImportNamespaceSpecifier') {
      collectPatternNames(node.local);
    }
    if (node.type === 'CatchClause') collectPatternNames(node.param);
  });
  if (boundNames.has('require') || boundNames.has('module')) {
    return rejected(
      VCP_DEPENDENCY_ANALYSIS_STATUS.AMBIGUOUS,
      'stack_vcp_runtime_contract_dependency_analysis_ambiguous'
    );
  }

  const specifiers = new Set();
  let failure = null;
  const fail = (status, stableErrorCode) => {
    if (!failure) failure = { stableErrorCode, status };
  };
  const literalSpecifier = node =>
    node?.type === 'Literal' &&
    typeof node.value === 'string' &&
    node.value.length > 0
      ? node.value
      : null;
  const propertyName = node => {
    if (!node || node.type !== 'MemberExpression') return null;
    if (!node.computed && node.property.type === 'Identifier') {
      return node.property.name;
    }
    return node.computed && node.property.type === 'Literal' &&
      typeof node.property.value === 'string'
      ? node.property.value
      : null;
  };
  const isIdentifier = (node, name) =>
    node?.type === 'Identifier' && node.name === name;
  const isModuleRequire = node =>
    node?.type === 'MemberExpression' &&
    !node.computed &&
    node.optional !== true &&
    isIdentifier(node.object, 'module') &&
    propertyName(node) === 'require';
  const isDirectLoaderCall = node =>
    node?.type === 'CallExpression' &&
    node.optional !== true &&
    (isIdentifier(node.callee, 'require') || isModuleRequire(node.callee));
  const isPropertyPosition = (node, parent) =>
    (parent?.type === 'MemberExpression' && parent.property === node &&
     !parent.computed) ||
    (parent?.type === 'Property' && parent.key === node && !parent.computed &&
     parent.shorthand !== true);

  walk(program, (node, parent) => {
    if (failure) return;
    if (node.type === 'ImportDeclaration' ||
        node.type === 'ExportNamedDeclaration' ||
        node.type === 'ExportAllDeclaration') {
      if (node.source) {
        const specifier = literalSpecifier(node.source);
        if (!specifier) {
          fail(
            VCP_DEPENDENCY_ANALYSIS_STATUS.UNSUPPORTED_INDIRECTION,
            'stack_vcp_runtime_contract_dependency_indirection_unsupported'
          );
        } else {
          specifiers.add(specifier);
        }
      }
      return;
    }
    if (node.type === 'ImportExpression') {
      const specifier = literalSpecifier(node.source);
      if (!specifier) {
        fail(
          VCP_DEPENDENCY_ANALYSIS_STATUS.UNSUPPORTED_INDIRECTION,
          'stack_vcp_runtime_contract_dependency_indirection_unsupported'
        );
      } else {
        specifiers.add(specifier);
      }
      return;
    }
    if (isDirectLoaderCall(node)) {
      const specifier = node.arguments.length === 1
        ? literalSpecifier(node.arguments[0])
        : null;
      if (!specifier) {
        fail(
          VCP_DEPENDENCY_ANALYSIS_STATUS.UNSUPPORTED_INDIRECTION,
          'stack_vcp_runtime_contract_dependency_indirection_unsupported'
        );
      } else {
        specifiers.add(specifier);
      }
      return;
    }
    if (node.type === 'NewExpression' && isIdentifier(node.callee, 'Function')) {
      fail(
        VCP_DEPENDENCY_ANALYSIS_STATUS.UNSUPPORTED_INDIRECTION,
        'stack_vcp_runtime_contract_execution_indirection_unsupported'
      );
      return;
    }
    if (node.type === 'CallExpression' && isIdentifier(node.callee, 'eval')) {
      fail(
        VCP_DEPENDENCY_ANALYSIS_STATUS.UNSUPPORTED_INDIRECTION,
        'stack_vcp_runtime_contract_execution_indirection_unsupported'
      );
      return;
    }
    if (node.type === 'MemberExpression') {
      const name = propertyName(node);
      if (name === 'createRequire') {
        fail(
          VCP_DEPENDENCY_ANALYSIS_STATUS.UNSUPPORTED_INDIRECTION,
          'stack_vcp_runtime_contract_dependency_indirection_unsupported'
        );
        return;
      }
      if (name?.startsWith('runIn') && isIdentifier(node.object, 'vm')) {
        fail(
          VCP_DEPENDENCY_ANALYSIS_STATUS.UNSUPPORTED_INDIRECTION,
          'stack_vcp_runtime_contract_execution_indirection_unsupported'
        );
        return;
      }
      if (['eval', 'Function'].includes(name) &&
          (isIdentifier(node.object, 'global') ||
           isIdentifier(node.object, 'globalThis'))) {
        fail(
          VCP_DEPENDENCY_ANALYSIS_STATUS.UNSUPPORTED_INDIRECTION,
          'stack_vcp_runtime_contract_execution_indirection_unsupported'
        );
        return;
      }
      if (name === 'mainModule' && isIdentifier(node.object, 'process')) {
        fail(
          VCP_DEPENDENCY_ANALYSIS_STATUS.UNSUPPORTED_INDIRECTION,
          'stack_vcp_runtime_contract_execution_indirection_unsupported'
        );
        return;
      }
      if (name === 'require' &&
          (isIdentifier(node.object, 'global') ||
           isIdentifier(node.object, 'globalThis') ||
           node.object?.type === 'MemberExpression' &&
           isIdentifier(node.object.object, 'process') &&
           propertyName(node.object) === 'mainModule')) {
        fail(
          VCP_DEPENDENCY_ANALYSIS_STATUS.UNSUPPORTED_INDIRECTION,
          'stack_vcp_runtime_contract_execution_indirection_unsupported'
        );
        return;
      }
      if (isModuleRequire(node) &&
          !isDirectLoaderCall(parent)) {
        fail(
          VCP_DEPENDENCY_ANALYSIS_STATUS.UNSUPPORTED_INDIRECTION,
          'stack_vcp_runtime_contract_dependency_indirection_unsupported'
        );
      }
      return;
    }
    if (node.type === 'Property' && parent?.type === 'ObjectPattern' &&
        propertyName({
          computed: node.computed,
          object: null,
          property: node.key,
          type: 'MemberExpression'
        }) === 'createRequire') {
      fail(
        VCP_DEPENDENCY_ANALYSIS_STATUS.UNSUPPORTED_INDIRECTION,
        'stack_vcp_runtime_contract_dependency_indirection_unsupported'
      );
      return;
    }
    if (node.type === 'Identifier' && node.name === 'createRequire') {
      if (isPropertyPosition(node, parent)) return;
      fail(
        VCP_DEPENDENCY_ANALYSIS_STATUS.UNSUPPORTED_INDIRECTION,
        'stack_vcp_runtime_contract_dependency_indirection_unsupported'
      );
      return;
    }
    if (node.type === 'Identifier' && node.name === 'eval' &&
        !isPropertyPosition(node, parent)) {
      fail(
        VCP_DEPENDENCY_ANALYSIS_STATUS.UNSUPPORTED_INDIRECTION,
        'stack_vcp_runtime_contract_execution_indirection_unsupported'
      );
      return;
    }
    if (node.type === 'Identifier' && node.name === 'Function' &&
        !isPropertyPosition(node, parent)) {
      fail(
        VCP_DEPENDENCY_ANALYSIS_STATUS.UNSUPPORTED_INDIRECTION,
        'stack_vcp_runtime_contract_execution_indirection_unsupported'
      );
      return;
    }
    if (node.type === 'Identifier' && ['global', 'globalThis'].includes(node.name) &&
        !(parent?.type === 'MemberExpression' && parent.object === node)) {
      fail(
        VCP_DEPENDENCY_ANALYSIS_STATUS.UNSUPPORTED_INDIRECTION,
        'stack_vcp_runtime_contract_execution_indirection_unsupported'
      );
      return;
    }
    if (node.type === 'Identifier' && node.name === 'vm' &&
        !(parent?.type === 'MemberExpression' && parent.object === node)) {
      fail(
        VCP_DEPENDENCY_ANALYSIS_STATUS.UNSUPPORTED_INDIRECTION,
        'stack_vcp_runtime_contract_execution_indirection_unsupported'
      );
      return;
    }
    if (node.type === 'Identifier' && node.name === 'require' &&
        !isDirectLoaderCall(parent) &&
        !isPropertyPosition(node, parent)) {
      fail(
        VCP_DEPENDENCY_ANALYSIS_STATUS.UNSUPPORTED_INDIRECTION,
        'stack_vcp_runtime_contract_dependency_indirection_unsupported'
      );
      return;
    }
    if (node.type === 'Identifier' && node.name === 'module') {
      const canonicalMember = parent?.type === 'MemberExpression' &&
        parent.object === node && !parent.computed &&
        ['exports', 'require'].includes(propertyName(parent));
      if (!canonicalMember && !isPropertyPosition(node, parent)) {
        fail(
          VCP_DEPENDENCY_ANALYSIS_STATUS.UNSUPPORTED_INDIRECTION,
          'stack_vcp_runtime_contract_dependency_indirection_unsupported'
        );
      }
    }
  });
  if (failure) return rejected(failure.status, failure.stableErrorCode);
  return Object.freeze({
    specifiers: Object.freeze([...specifiers].sort()),
    stableErrorCode: null,
    status: VCP_DEPENDENCY_ANALYSIS_STATUS.COMPLETE
  });
}

function inspectVcpRuntimeContractEvidence(repoRoot, {
  exec = execFileSync,
  fsModule = fs
} = {}) {
  const rejected = stableErrorCode => Object.freeze({
    complete: false,
    dependencyFileCount: 0,
    evidenceDigest: null,
    externalDependencyCount: 0,
    projection: null,
    securityFileCount: 0,
    stableErrorCode
  });
  const git = args => gitText(args, { repoRoot, exec });
  const absoluteFor = relativePath => {
    const normalized = normalizedVcpRelativePath(relativePath);
    const absolute = path.resolve(repoRoot, ...normalized.split('/'));
    if (absolute === repoRoot || !absolute.startsWith(`${repoRoot}${path.sep}`)) {
      throw codedError('stack_vcp_runtime_contract_path_invalid');
    }
    return { absolute, relativePath: normalized };
  };
  const inspectFile = relativePath => {
    const resolved = absoluteFor(relativePath);
    const linkStat = fsModule.lstatSync(resolved.absolute);
    const real = fsModule.realpathSync(resolved.absolute);
    if (!linkStat.isFile() || linkStat.isSymbolicLink() ||
        real !== resolved.absolute) {
      throw codedError('stack_vcp_runtime_contract_input_invalid');
    }
    const tracked = git([
      'ls-files',
      '--error-unmatch',
      '--',
      resolved.relativePath
    ]);
    if (tracked !== resolved.relativePath) {
      throw codedError('stack_vcp_runtime_contract_input_untracked');
    }
    const blobId = git(['rev-parse', `HEAD:${resolved.relativePath}`]);
    const worktreeBlobId = git([
      'hash-object',
      '--no-filters',
      '--',
      resolved.relativePath
    ]);
    const treeEntry = git(['ls-tree', 'HEAD', '--', resolved.relativePath]);
    const parsedTreeEntry = treeEntry.match(
      /^([0-7]{6}) blob ([a-f0-9]{40})\t(.+)$/u
    );
    if (!SAFE_GIT_OBJECT.test(blobId) || worktreeBlobId !== blobId ||
        !parsedTreeEntry || parsedTreeEntry[2] !== blobId ||
        parsedTreeEntry[3] !== resolved.relativePath) {
      throw codedError('stack_vcp_runtime_contract_blob_mismatch');
    }
    const bytes = fsModule.readFileSync(resolved.absolute);
    return Object.freeze({
      contentSha256: `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`,
      gitBlobId: blobId,
      mode: parsedTreeEntry[1],
      relativePath: resolved.relativePath,
      source: /\.(?:c?js|mjs)$/u.test(resolved.relativePath)
        ? bytes.toString('utf8')
        : null
    });
  };
  const opaqueRootFor = relativePath =>
    VCP_RUNTIME_OPAQUE_LOCAL_PACKAGE_ROOTS.find(root =>
      relativePath === root || relativePath.startsWith(`${root}/`)
    ) || null;
  const listOpaquePackageFiles = opaqueRoot => {
    const output = git(['ls-files', '--', `${opaqueRoot}/`]);
    const files = output.split('\n').filter(Boolean).map(
      normalizedVcpRelativePath
    ).filter(candidate =>
      candidate.startsWith(`${opaqueRoot}/`)
    ).sort();
    if (files.length < 1) {
      throw codedError('stack_vcp_runtime_contract_dependency_unavailable');
    }
    return files;
  };
  const resolveLocalDependency = (fromRelativePath, specifier) => {
    const fromDirectory = path.posix.dirname(fromRelativePath);
    const baseRelative = normalizedVcpRelativePath(
      path.posix.normalize(path.posix.join(fromDirectory, specifier))
    );
    const base = absoluteFor(baseRelative);
    let baseStat = null;
    try {
      baseStat = fsModule.lstatSync(base.absolute);
    } catch {}
    if (baseStat?.isDirectory()) {
      const opaqueRoot = opaqueRootFor(base.relativePath);
      if (opaqueRoot === base.relativePath) {
        return Object.freeze({
          entryPaths: Object.freeze(listOpaquePackageFiles(opaqueRoot)),
          opaqueRoot
        });
      }
      const packageRelative = `${base.relativePath}/package.json`;
      try {
        const packageEvidence = inspectFile(packageRelative);
        const packageManifest = JSON.parse(
          fsModule.readFileSync(absoluteFor(packageRelative).absolute, 'utf8')
        );
        if (!packageManifest || typeof packageManifest.main !== 'string') {
          throw codedError('stack_vcp_runtime_contract_dependency_invalid');
        }
        const mainRelative = normalizedVcpRelativePath(
          path.posix.join(base.relativePath, packageManifest.main)
        );
        return Object.freeze({
          entryPaths: Object.freeze([
            packageEvidence.relativePath,
            ...resolveLocalDependency(packageRelative, `./${packageManifest.main}`)
              .entryPaths
          ]),
          opaqueRoot: null
        });
      } catch (error) {
        if (error?.code) throw error;
      }
    }
    const candidates = [
      base.relativePath,
      `${base.relativePath}.js`,
      `${base.relativePath}.json`,
      `${base.relativePath}.node`,
      `${base.relativePath}/index.js`,
      `${base.relativePath}/index.json`,
      `${base.relativePath}/index.node`
    ];
    for (const candidate of candidates) {
      try {
        const file = absoluteFor(candidate);
        const stat = fsModule.lstatSync(file.absolute);
        if (stat.isFile() && !stat.isSymbolicLink()) {
          return Object.freeze({
            entryPaths: Object.freeze([file.relativePath]),
            opaqueRoot: opaqueRootFor(file.relativePath)
          });
        }
      } catch {}
    }
    throw codedError('stack_vcp_runtime_contract_dependency_unavailable');
  };
  const requiredInterface = (root, fileEvidence) => {
    const source = fileEvidence.source || '';
    const valid = root.relativePath === 'EmbeddingUtils.js'
      ? /async function getEmbeddingsBatch\s*\(/u.test(source) &&
        /module\.exports\s*=\s*\{\s*getEmbeddingsBatch\s*,\s*cosineSimilarity\s*\}/u.test(source)
      : root.relativePath === 'KnowledgeBaseManager.js'
        ? /async initialize\s*\(/u.test(source) &&
          /async shutdown\s*\(/u.test(source) &&
          /module\.exports\s*=\s*new KnowledgeBaseManager\s*\(\s*\)/u.test(source)
        : false;
    if (!valid) {
      throw codedError('stack_vcp_runtime_contract_interface_invalid');
    }
    return Object.freeze({
      interfaceShapeDigest: sha256Projection({
        relativePath: root.relativePath,
        requiredExports: root.requiredExports
      }),
      relativePath: root.relativePath,
      requiredExports: root.requiredExports
    });
  };
  try {
    const packageEvidence = inspectFile('package.json');
    const packageManifest = JSON.parse(
      fsModule.readFileSync(absoluteFor('package.json').absolute, 'utf8')
    );
    if (!packageManifest || typeof packageManifest !== 'object' ||
        Array.isArray(packageManifest) || packageManifest.name !== 'vcptoolbox' ||
        typeof packageManifest.version !== 'string' ||
        !/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?$/u.test(
          packageManifest.version
        )) {
      return rejected('stack_vcp_runtime_contract_input_invalid');
    }
    const queue = VCP_RUNTIME_SECURITY_ROOTS.map(root => root.relativePath);
    const rootPaths = new Set(queue);
    const files = new Map();
    const opaqueRoots = new Set();
    const externalPackageNames = new Set();
    while (queue.length > 0) {
      const relativePath = normalizedVcpRelativePath(queue.shift());
      if (files.has(relativePath)) continue;
      const evidence = inspectFile(relativePath);
      files.set(relativePath, evidence);
      if (!evidence.source || opaqueRootFor(relativePath)) continue;
      const parsed = parseVcpStaticDependencies(evidence.source);
      if (parsed.status !== VCP_DEPENDENCY_ANALYSIS_STATUS.COMPLETE) {
        return rejected(parsed.stableErrorCode);
      }
      for (const specifier of parsed.specifiers) {
        if (specifier.startsWith('.')) {
          const dependency = resolveLocalDependency(relativePath, specifier);
          if (dependency.opaqueRoot) opaqueRoots.add(dependency.opaqueRoot);
          for (const entryPath of dependency.entryPaths) {
            if (!files.has(entryPath)) queue.push(entryPath);
          }
        } else {
          const packageName = vcpExternalPackageName(specifier);
          if (packageName) externalPackageNames.add(packageName);
        }
      }
    }
    for (const opaqueRoot of [...opaqueRoots].sort()) {
      for (const relativePath of listOpaquePackageFiles(opaqueRoot)) {
        if (!files.has(relativePath)) files.set(relativePath, inspectFile(relativePath));
      }
    }
    const requiredInterfaces = VCP_RUNTIME_SECURITY_ROOTS.map(root => {
      const evidence = files.get(root.relativePath);
      if (!evidence) {
        throw codedError('stack_vcp_runtime_contract_interface_unavailable');
      }
      return requiredInterface(root, evidence);
    }).sort((left, right) => left.relativePath.localeCompare(right.relativePath));
    let relevantExternalDependencies = [];
    if (externalPackageNames.size > 0) {
      inspectFile('package-lock.json');
      const lock = JSON.parse(
        fsModule.readFileSync(absoluteFor('package-lock.json').absolute, 'utf8')
      );
      if (!lock || lock.lockfileVersion !== 3 ||
          !lock.packages || typeof lock.packages !== 'object') {
        throw codedError('stack_vcp_runtime_contract_lock_invalid');
      }
      relevantExternalDependencies = [...externalPackageNames].sort().map(
        packageName => {
          const entry = lock.packages[`node_modules/${packageName}`];
          if (!entry || typeof entry.version !== 'string' ||
              typeof entry.integrity !== 'string' ||
              !/^sha512-[A-Za-z0-9+/]+={0,2}$/u.test(entry.integrity)) {
            throw codedError('stack_vcp_runtime_contract_dependency_unavailable');
          }
          return Object.freeze({
            integrity: entry.integrity,
            packageName,
            version: entry.version
          });
        }
      );
    }
    const securityFiles = [...files.values()].map(file => Object.freeze({
      contentSha256: file.contentSha256,
      gitBlobId: file.gitBlobId,
      mode: file.mode,
      relativePath: file.relativePath
    })).sort((left, right) => left.relativePath.localeCompare(right.relativePath));
    const projectionWithoutDigest = Object.freeze({
      governedProtocol: Object.freeze({
        protocolVersion: VCP_RUNTIME_CONTRACT_PROJECTION.nativeShimProtocol
      }),
      relevantExternalDependencies: Object.freeze(relevantExternalDependencies),
      repositoryBinding: Object.freeze({
        canonicalRootDigest: sha256Projection({ canonicalRoot: repoRoot }),
        repositoryIdentity: packageManifest.name
      }),
      requiredInterfaces: Object.freeze(requiredInterfaces),
      schemaVersion: VCP_RUNTIME_CONTRACT_EVIDENCE_SCHEMA_VERSION,
      securityFiles: Object.freeze(securityFiles)
    });
    const evidenceDigest = sha256Projection(projectionWithoutDigest);
    const projection = Object.freeze({
      ...projectionWithoutDigest,
      evidenceDigest
    });
    return Object.freeze({
      complete: true,
      dependencyFileCount: securityFiles.filter(
        file => !rootPaths.has(file.relativePath)
      ).length,
      evidenceDigest,
      externalDependencyCount: relevantExternalDependencies.length,
      projection,
      securityFileCount: securityFiles.length,
      stableErrorCode: null
    });
  } catch (error) {
    return rejected(
      SAFE_CODE.test(error?.code || '')
        ? error.code
        : 'stack_vcp_runtime_contract_input_unavailable'
    );
  }
}

function inspectVcpRuntimeIdentity(profile, {
  repoRoot = vcpRuntimeRepository(),
  expectedRepository = null,
  canonicalRepository = vcpRuntimeRepository(),
  exec = execFileSync,
  fsModule = fs,
  inspectContractEvidence = inspectVcpRuntimeContractEvidence,
  observedAt = new Date().toISOString()
} = {}) {
  const identityMode = profile?.schemaVersion === LEGACY_PROFILE_SCHEMA_VERSION
    ? 'bootstrap_legacy'
    : profileVcpRuntimeIdentityMode(profile);
  const expectedRevision = profileHasRuntimeBinding(profile)
    ? profile.vcpRuntimeBaseline
    : VCP_RUNTIME_BASELINE_BY_CODEX_BASELINE[profile?.runtimeBaseline] || null;
  const boundRepository = expectedRepository ||
    (
      profileHasRuntimeBinding(profile)
        ? profile.vcpRuntimeRepository
        : canonicalRepository
    );
  const rejected = overrides => Object.freeze({
    admissionAllowed: false,
    buildChanged: null,
    buildDigest: null,
    buildIdentity: null,
    classification: VCP_RUNTIME_CLASSIFICATIONS.CONTRACT_UNAVAILABLE,
    contractComplete: false,
    contractDigest: null,
    contractEvidenceDigest: null,
    contractEvidenceSummary: null,
    contractMatch: false,
    identityMode,
    manifestDigest: null,
    recognized: false,
    revision: null,
    repository: null,
    currentMain: false,
    repositoryMatch: false,
    scopeClean: false,
    scopeComplete: false,
    scopeDigest: null,
    stableErrorCode: 'stack_vcp_runtime_identity_unavailable',
    ...overrides
  });
  if ((['bootstrap_legacy', 'legacy'].includes(identityMode) &&
       !SAFE_GIT_OBJECT.test(expectedRevision || '')) ||
      identityMode === 'unsupported' ||
      typeof boundRepository !== 'string' ||
      !path.isAbsolute(boundRepository) ||
      path.resolve(boundRepository) !== boundRepository) {
    return rejected({
      classification: identityMode === 'unsupported'
        ? VCP_RUNTIME_CLASSIFICATIONS.IDENTITY_SCHEMA_UNSUPPORTED
        : VCP_RUNTIME_CLASSIFICATIONS.CONTRACT_UNAVAILABLE
    });
  }
  let inspectedRepository;
  try {
    inspectedRepository = assertOwnerRepositoryDirectory(
      path.resolve(repoRoot),
      { fsModule }
    );
  } catch {
    return rejected();
  }
  const options = { repoRoot: inspectedRepository, exec };
  try {
    const repositoryText = gitText(
      ['rev-parse', '--show-toplevel'],
      options
    );
    if (!path.isAbsolute(repositoryText)) return rejected();
    const repository = path.resolve(repositoryText);
    const head = gitText(['rev-parse', 'HEAD^{commit}'], options);
    const originMain = gitText(
      ['rev-parse', 'refs/remotes/origin/main^{commit}'],
      options
    );
    const worktreeStatus = gitText([
      'status',
      '--porcelain=v1',
      '--untracked-files=all'
    ], options);
    const treeObject = gitText(['rev-parse', 'HEAD^{tree}'], options);
    const packageObject = gitText(
      ['rev-parse', 'HEAD:package.json'],
      options
    );
    const scopeObjects = [];
    const scopeComplete = VCP_RUNTIME_SOURCE_PATHS.every(candidate => {
      try {
        const objectId = gitText(
          ['rev-parse', `HEAD:${candidate}`],
          options
        );
        if (!SAFE_GIT_OBJECT.test(objectId)) return false;
        scopeObjects.push([candidate, objectId]);
        return true;
      } catch {
        return false;
      }
    });
    const scopeDigest = scopeComplete
      ? `sha256:${crypto.createHash('sha256').update(
        scopeObjects
          .map(([candidate, objectId]) => `${candidate}\0${objectId}\n`)
          .join(''),
        'utf8'
      ).digest('hex')}`
      : null;
    const buildDigest = SAFE_GIT_OBJECT.test(treeObject)
      ? sha256Projection({ repositoryTree: treeObject, schemaVersion: 1 })
      : null;
    const manifestDigest = SAFE_GIT_OBJECT.test(packageObject)
      ? sha256Projection({ packageManifestObject: packageObject })
      : null;
    const repositoryMatch = repository === inspectedRepository &&
      inspectedRepository === path.resolve(boundRepository) &&
      path.resolve(boundRepository) === path.resolve(canonicalRepository);
    const currentMain = head === originMain;
    const scopeClean = worktreeStatus === '';
    const contractEvidence = repositoryMatch && currentMain && scopeClean
      ? inspectContractEvidence(inspectedRepository, { exec, fsModule })
      : null;
    const contractComplete = contractEvidence?.complete === true &&
      SAFE_SHA256_DIGEST.test(contractEvidence?.evidenceDigest || '') &&
      SAFE_SHA256_DIGEST.test(buildDigest || '') &&
      SAFE_SHA256_DIGEST.test(manifestDigest || '') &&
      scopeComplete;
    const contractDigest = contractComplete
      ? vcpRuntimeContractDigest({
        vcpContractEvidenceDigest: contractEvidence.evidenceDigest
      })
      : null;
    const contractMatch = identityMode === 'contract_v1' &&
      contractDigest === profile.vcpRuntimeContractDigest;
    const buildChanged = SAFE_GIT_OBJECT.test(head) &&
      SAFE_SHA256_DIGEST.test(scopeDigest || '')
      ? head !== profile?.vcpRuntimeBaseline ||
        scopeDigest !== profile?.vcpRuntimeScopeDigest
      : null;
    let classification;
    let admissionAllowed = false;
    let stableErrorCode = null;
    if (!repositoryMatch) {
      classification = VCP_RUNTIME_CLASSIFICATIONS.CONTRACT_UNAVAILABLE;
      stableErrorCode = 'stack_vcp_runtime_contract_unavailable';
    } else if (!currentMain || !scopeClean) {
      classification = VCP_RUNTIME_CLASSIFICATIONS.BUILD_UNTRUSTED;
      stableErrorCode = 'stack_vcp_runtime_build_untrusted';
    } else if (!contractComplete) {
      classification = VCP_RUNTIME_CLASSIFICATIONS.CONTRACT_UNAVAILABLE;
      stableErrorCode = contractEvidence?.stableErrorCode ||
        'stack_vcp_runtime_contract_unavailable';
    } else if (['bootstrap_legacy', 'legacy'].includes(identityMode)) {
      admissionAllowed = head === expectedRevision &&
        (identityMode === 'bootstrap_legacy' ||
          scopeDigest === profile.vcpRuntimeScopeDigest);
      classification = admissionAllowed
        ? VCP_RUNTIME_CLASSIFICATIONS.LEGACY_IDENTITY_MATCH
        : VCP_RUNTIME_CLASSIFICATIONS.LEGACY_REACCEPTANCE_REQUIRED;
      stableErrorCode = admissionAllowed
        ? null
        : 'stack_vcp_runtime_legacy_reacceptance_required';
    } else if (identityMode === 'contract_v1' && contractMatch) {
      admissionAllowed = true;
      classification = buildChanged
        ? VCP_RUNTIME_CLASSIFICATIONS.CONTRACT_MATCH_BUILD_CHANGED
        : VCP_RUNTIME_CLASSIFICATIONS.CONTRACT_MATCH;
    } else if (identityMode === 'contract_v1') {
      classification = VCP_RUNTIME_CLASSIFICATIONS.CONTRACT_MISMATCH;
      stableErrorCode = 'stack_vcp_runtime_contract_mismatch';
    } else {
      classification = VCP_RUNTIME_CLASSIFICATIONS.IDENTITY_SCHEMA_UNSUPPORTED;
      stableErrorCode = 'stack_vcp_runtime_identity_schema_unsupported';
    }
    const buildIdentity = contractComplete
      ? Object.freeze({
        buildDigest,
        contractDigest,
        manifestDigest,
        observedAt,
        repositoryHead: head,
        schemaVersion: VCP_RUNTIME_BUILD_SCHEMA_VERSION,
        worktreeClean: scopeClean
      })
      : null;
    return Object.freeze({
      admissionAllowed,
      buildChanged,
      buildDigest,
      buildIdentity,
      classification,
      contractComplete,
      contractDigest,
      contractEvidenceDigest: contractEvidence?.evidenceDigest || null,
      contractEvidenceSummary: contractComplete
        ? Object.freeze({
          dependencyFileCount: contractEvidence.dependencyFileCount,
          externalDependencyCount: contractEvidence.externalDependencyCount,
          schemaVersion: VCP_RUNTIME_CONTRACT_EVIDENCE_SCHEMA_VERSION,
          securityFileCount: contractEvidence.securityFileCount
        })
        : null,
      contractMatch,
      identityMode,
      manifestDigest,
      recognized: admissionAllowed,
      revision: SAFE_GIT_OBJECT.test(head) ? head : null,
      repository,
      currentMain,
      repositoryMatch,
      scopeClean,
      scopeComplete,
      scopeDigest,
      stableErrorCode
    });
  } catch {
    return rejected();
  }
}

function profileVcpRuntimeIdentityMatches(profile, identity) {
  const identityMode = profileVcpRuntimeIdentityMode(profile);
  if (identityMode === 'image_authority_v1') {
    return Boolean(
      profile?.schemaVersion === IMAGE_PROFILE_SCHEMA_VERSION &&
      SAFE_GIT_OBJECT.test(profile?.vcpRuntimeBaseline || '') &&
      SAFE_SHA256_DIGEST.test(profile?.vcpRuntimeContractDigest || '') &&
      SAFE_SHA256_DIGEST.test(profile?.vcpRuntimeScopeDigest || '') &&
      identity?.admissionAllowed === true &&
      identity?.authorityVerified === true &&
      identity?.imageAuthorityDigest === profile.vcpRuntimeContractDigest &&
      identity?.revision === profile.vcpRuntimeBaseline &&
      identity?.repository === IMAGE_VCP_ROOT &&
      identity?.repositoryMatch === true
    );
  }
  const acceptedIdentityMatches = identityMode === 'legacy'
    ? identity?.revision === profile?.vcpRuntimeBaseline &&
      identity?.scopeDigest === profile?.vcpRuntimeScopeDigest
    : identityMode === 'contract_v1'
      ? identity?.contractComplete === true &&
        identity?.contractDigest === profile?.vcpRuntimeContractDigest
      : false;
  return Boolean(
    profileHasRuntimeBinding(profile) &&
    SAFE_GIT_OBJECT.test(profile?.vcpRuntimeBaseline || '') &&
    SAFE_SHA256_DIGEST.test(profile?.vcpRuntimeScopeDigest || '') &&
    acceptedIdentityMatches &&
    identity?.admissionAllowed === true &&
    identity?.repository === profile.vcpRuntimeRepository &&
    identity?.currentMain === true &&
    identity?.repositoryMatch === true &&
    identity?.scopeClean === true &&
    identity?.scopeComplete === true
  );
}

function vcpRuntimeContractMigrationCandidate(profile, identity, {
  expectedCurrentFingerprint,
  profilePath
} = {}) {
  const currentProfile = validateProfile(profile);
  const canonicalCurrentFingerprint = sha256Projection(currentProfile);
  if (profile?.schemaVersion !== PROFILE_SCHEMA_VERSION ||
      profileVcpRuntimeIdentityMode(profile) !== 'legacy' ||
      !SAFE_SHA256_DIGEST.test(expectedCurrentFingerprint || '') ||
      expectedCurrentFingerprint !== canonicalCurrentFingerprint ||
      typeof profilePath !== 'string' || !path.isAbsolute(profilePath) ||
      path.resolve(profilePath) !== profilePath ||
      identity?.contractComplete !== true ||
      !SAFE_SHA256_DIGEST.test(identity?.contractEvidenceDigest || '') ||
      !identity?.contractEvidenceSummary ||
      identity?.repository !== profile.vcpRuntimeRepository ||
      identity?.repositoryMatch !== true ||
      identity?.currentMain !== true ||
      identity?.scopeClean !== true ||
      identity?.scopeComplete !== true ||
      !SAFE_GIT_OBJECT.test(identity?.revision || '') ||
      !SAFE_SHA256_DIGEST.test(identity?.buildDigest || '') ||
      !SAFE_SHA256_DIGEST.test(identity?.scopeDigest || '') ||
      !SAFE_SHA256_DIGEST.test(identity?.contractDigest || '')) {
    throw codedError('stack_vcp_runtime_migration_candidate_invalid');
  }
  const nextProfile = validateProfile({
    ...profile,
    vcpRuntimeBaseline: identity.revision,
    vcpRuntimeContractDigest: identity.contractDigest,
    vcpRuntimeIdentitySchemaVersion: VCP_RUNTIME_IDENTITY_SCHEMA_VERSION,
    vcpRuntimeScopeDigest: identity.scopeDigest
  });
  const transaction = Object.freeze({
    expectedCurrentFingerprint,
    nextProfile,
    profilePath
  });
  return Object.freeze({
    current: Object.freeze({
      acceptedRuntimeIdentityDigest: profile.runtimeBaseline,
      expectedCurrentFingerprint,
      profileMode: 'LEGACY_EXACT_BUILD'
    }),
    nextProfile,
    observedBuild: Object.freeze({
      buildDigest: identity.buildDigest,
      contractDigest: identity.contractDigest,
      manifestDigest: identity.manifestDigest,
      repositoryHead: identity.revision,
      schemaVersion: VCP_RUNTIME_BUILD_SCHEMA_VERSION,
      worktreeClean: identity.scopeClean
    }),
    observedContract: Object.freeze({
      contractDigest: identity.contractDigest,
      contractEvidenceDigest: identity.contractEvidenceDigest,
      contractSchemaVersion: VCP_RUNTIME_CONTRACT_SCHEMA_VERSION,
      dependencyFileCount:
        identity.contractEvidenceSummary.dependencyFileCount,
      externalDependencyCount:
        identity.contractEvidenceSummary.externalDependencyCount,
      securityFileCount:
        identity.contractEvidenceSummary.securityFileCount
    }),
    schemaVersion: 1,
    transaction
  });
}

function legacyVcpRuntimeBootstrapMatches(profile, identity) {
  const expectedRevision =
    VCP_RUNTIME_BASELINE_BY_CODEX_BASELINE[profile?.runtimeBaseline] || null;
  return Boolean(
    profile?.schemaVersion === LEGACY_PROFILE_SCHEMA_VERSION &&
    SAFE_GIT_OBJECT.test(expectedRevision || '') &&
    identity?.recognized === true &&
    identity?.revision === expectedRevision &&
    identity?.repository === vcpRuntimeRepository() &&
    identity?.currentMain === true &&
    identity?.repositoryMatch === true &&
    identity?.scopeClean === true &&
    identity?.scopeComplete === true &&
    SAFE_SHA256_DIGEST.test(identity?.scopeDigest || '')
  );
}

function profileWithControllerManifestBinding(
  profile,
  identity,
  providerEnvironment,
  source,
  environmentConfigDigests
) {
  const legacyV4 = profile?.schemaVersion === LEGACY_PROFILE_SCHEMA_VERSION;
  const legacyV5 =
    profile?.schemaVersion === EXACT_HEAD_PROFILE_SCHEMA_VERSION;
  if ((!legacyV4 && !legacyV5) ||
      (legacyV4 && !legacyVcpRuntimeBootstrapMatches(profile, identity)) ||
      (legacyV5 && !profileVcpRuntimeIdentityMatches(profile, identity)) ||
      source?.upgradeEligible !== true ||
      source?.manifestVersion !== MANIFEST_SCHEMA_VERSION ||
      !SAFE_SHA256_DIGEST.test(source?.manifestDigest || '') ||
      !SAFE_GIT_OBJECT.test(source?.head || '') ||
      identity?.contractComplete !== true ||
      !SAFE_SHA256_DIGEST.test(identity?.contractDigest || '')) {
    throw codedError('stack_vcp_runtime_identity_mismatch');
  }
  const {
    controllerSourceCommit: _controllerSourceCommit,
    ...baseProfile
  } = profile;
  return validateProfile({
    ...baseProfile,
    schemaVersion: PROFILE_SCHEMA_VERSION,
    adoptedRepositoryHead: source.head,
    controllerSourceManifestDigest: source.manifestDigest,
    controllerSourceManifestVersion: source.manifestVersion,
    governanceEnvironmentConfigDigest:
      environmentConfigDigests?.governanceEnvironmentConfigDigest,
    relayEnvironmentConfigDigest:
      environmentConfigDigests?.relayEnvironmentConfigDigest,
    vcpProviderConfigDigest:
      vcpProviderConfigDigest(providerEnvironment),
    vcpRuntimeBaseline: identity.revision,
    vcpRuntimeContractDigest: identity.contractDigest,
    vcpRuntimeIdentitySchemaVersion: VCP_RUNTIME_IDENTITY_SCHEMA_VERSION,
    vcpRuntimeRepository: identity.repository,
    vcpRuntimeScopeDigest: identity.scopeDigest
  });
}

function sourceManifestRebindEligible(profile, source) {
  return Boolean(
    profile?.schemaVersion === PROFILE_SCHEMA_VERSION &&
    source?.identityMode === 'manifest_v1' &&
    source?.clean === true &&
    source?.baselineExists === true &&
    source?.currentMain === true &&
    source?.repositoryMatch === true &&
    source?.manifestRecognized === true &&
    source?.manifestVersion === MANIFEST_SCHEMA_VERSION &&
    SAFE_SHA256_DIGEST.test(source?.manifestDigest || '') &&
    source?.manifestComplete === true &&
    source?.manifestScopeClean === true &&
    source?.adoptedHeadReadable === true &&
    source?.adoptedHeadAncestor === true &&
    SAFE_GIT_OBJECT.test(source?.head || '') &&
    source.head !== profile.adoptedRepositoryHead &&
    source.manifestDigest !== profile.controllerSourceManifestDigest &&
    source?.controllerSourceMatch === false &&
    source?.compatible === false
  );
}

function profileWithSourceManifestRebinding(profile, source) {
  if (!sourceManifestRebindEligible(profile, source)) {
    throw codedError('stack_source_manifest_rebind_ineligible');
  }
  return validateProfile({
    ...profile,
    adoptedRepositoryHead: source.head,
    controllerSourceManifestDigest: source.manifestDigest,
    controllerSourceManifestVersion: source.manifestVersion
  });
}

function inspectSourceCompatibility(profile, options = {}) {
  const inspectedRepository = path.resolve(options.repoRoot || REPO_ROOT);
  const head = gitText(['rev-parse', 'HEAD^{commit}'], options);
  const originMain = gitText(['rev-parse', 'origin/main^{commit}'], options);
  const clean = gitText(['status', '--porcelain', '--untracked-files=all'], options) === '';
  const baselineExists = (() => {
    try {
      gitText(['cat-file', '-e', `${profile.runtimeBaseline}^{commit}`], options);
      return true;
    } catch {
      return false;
    }
  })();
  let changedPaths = [];
  if (baselineExists) {
    const changed = gitText(
      ['diff', '--name-only', `${profile.runtimeBaseline}..${head}`, '--'],
      options
    );
    changedPaths = changed ? changed.split('\n').filter(Boolean) : [];
  }
  const controllerOnlyChanges = baselineExists &&
    changedPaths.every(candidate => CONTROLLER_CHANGE_PATHS.has(candidate));
  const repositoryMatch = inspectedRepository === profile.runtimeRepository;
  const inspectManifest = options.inspectControllerManifest ||
    inspectControllerSourceManifest;
  const manifest = inspectManifest({
    repoRoot: inspectedRepository,
    exec: options.exec,
    fsModule: options.fsModule
  });
  const manifestRecognized = manifest?.recognized === true &&
    manifest?.manifestVersion === MANIFEST_SCHEMA_VERSION &&
    SAFE_SHA256_DIGEST.test(manifest?.manifestDigest || '') &&
    manifest?.manifestComplete === true &&
    manifest?.manifestScopeClean === true;
  const adoptedRepositoryHead =
    profile.schemaVersion === PROFILE_SCHEMA_VERSION
      ? profile.adoptedRepositoryHead
      : profile.schemaVersion === EXACT_HEAD_PROFILE_SCHEMA_VERSION
        ? profile.controllerSourceCommit
        : null;
  const adoptedHeadReadable = adoptedRepositoryHead === null
    ? true
    : (() => {
        try {
          gitText(
            ['cat-file', '-e', `${adoptedRepositoryHead}^{commit}`],
            options
          );
          return true;
        } catch {
          return false;
        }
      })();
  const adoptedHeadAncestor = adoptedRepositoryHead === null
    ? true
    : adoptedHeadReadable && (() => {
        try {
          gitText(
            ['merge-base', '--is-ancestor', adoptedRepositoryHead, head],
            options
          );
          return true;
        } catch {
          return false;
        }
      })();
  const controllerSourceMatch = profile.schemaVersion === PROFILE_SCHEMA_VERSION
    ? manifestRecognized &&
      profile.controllerSourceManifestVersion === manifest.manifestVersion &&
      profile.controllerSourceManifestDigest === manifest.manifestDigest
    : profile.schemaVersion === EXACT_HEAD_PROFILE_SCHEMA_VERSION
      ? SAFE_GIT_OBJECT.test(profile.controllerSourceCommit || '') &&
        head === profile.controllerSourceCommit
      : controllerOnlyChanges;
  const commonCompatible = clean && baselineExists && head === originMain &&
    repositoryMatch && adoptedHeadReadable && adoptedHeadAncestor;
  const compatible = commonCompatible && controllerSourceMatch &&
    (
      profile.schemaVersion === PROFILE_SCHEMA_VERSION
        ? manifestRecognized
        : controllerOnlyChanges
    );
  const upgradeEligible = commonCompatible && manifestRecognized && (
    profile.schemaVersion === LEGACY_PROFILE_SCHEMA_VERSION
      ? SAFE_GIT_OBJECT.test(
          VCP_RUNTIME_BASELINE_BY_CODEX_BASELINE[
            profile.runtimeBaseline
          ] || ''
        )
      : profile.schemaVersion === EXACT_HEAD_PROFILE_SCHEMA_VERSION &&
        V5_CONTROLLER_SOURCE_UPGRADE_COMMITS.has(
          profile.controllerSourceCommit
        )
  );
  return Object.freeze({
    head,
    originMain,
    clean,
    baselineExists,
    currentMain: head === originMain,
    repositoryMatch,
    controllerOnlyChanges,
    controllerSourceMatch,
    identityMode: profile.schemaVersion === PROFILE_SCHEMA_VERSION
      ? 'manifest_v1'
      : profile.schemaVersion === EXACT_HEAD_PROFILE_SCHEMA_VERSION
        ? 'exact_commit_v5'
        : 'legacy_v4',
    manifestRecognized,
    manifestVersion: manifestRecognized ? manifest.manifestVersion : null,
    manifestDigest: manifestRecognized ? manifest.manifestDigest : null,
    manifestComplete: manifest?.manifestComplete === true,
    manifestScopeClean: manifest?.manifestScopeClean === true,
    adoptedHeadReadable,
    adoptedHeadAncestor,
    upgradeEligible,
    compatible
  });
}

function adoptionSourceCompatible(source) {
  return Boolean(
    source?.clean === true &&
    source?.baselineExists === true &&
    source?.controllerSourceMatch === true &&
    source?.currentMain === true &&
    source?.repositoryMatch === true &&
    source?.adoptedHeadReadable === true &&
    source?.adoptedHeadAncestor === true &&
    (
      source?.identityMode === 'manifest_v1'
        ? source?.manifestRecognized === true
        : source?.controllerOnlyChanges === true
    ) &&
    source?.compatible === true
  );
}

function dockerText(args, {
  exec = execFileSync,
  failureCode = 'stack_docker_inspection_failed'
} = {}) {
  try {
    return String(exec('docker', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })).trim();
  } catch {
    throw codedError(failureCode);
  }
}

function publishedPortsLoopbackOnly(portMap, {
  requiredContainerPort,
  requiredHostPort = null,
  requiredHostIp = null,
  requireSingleBinding = false,
  allowEmptyHostPort = false
} = {}) {
  if (!portMap ||
      typeof portMap !== 'object' ||
      Array.isArray(portMap) ||
      !/^[1-9][0-9]{0,4}\/(?:tcp|udp|sctp)$/u.test(
        requiredContainerPort || ''
      ) ||
      (
        requiredHostIp !== null &&
        !['127.0.0.1', '::1'].includes(requiredHostIp)
      )) {
    return false;
  }
  const requiredBindings = portMap[requiredContainerPort];
  if (!Array.isArray(requiredBindings) ||
      requiredBindings.length < 1 ||
      (requireSingleBinding && requiredBindings.length !== 1)) {
    return false;
  }
  for (const [containerPort, bindings] of Object.entries(portMap)) {
    if (!/^[1-9][0-9]{0,4}\/(?:tcp|udp|sctp)$/u.test(containerPort)) {
      return false;
    }
    if (bindings === null) continue;
    if (!Array.isArray(bindings) || bindings.length < 1) return false;
    for (const binding of bindings) {
      const hostPort = binding?.HostPort;
      const numericPort = Number(hostPort);
      const deferredHostPort = allowEmptyHostPort && hostPort === '';
      if (!['127.0.0.1', '::1'].includes(binding?.HostIp) ||
          (
            !deferredHostPort &&
            (
              !/^[1-9][0-9]{0,4}$/u.test(hostPort || '') ||
              !Number.isInteger(numericPort) ||
              numericPort > 65_535
            )
          )) {
        return false;
      }
    }
  }
  return (
    requiredHostPort === null ||
    requiredBindings.every(binding =>
      binding.HostPort === requiredHostPort
    )
  ) && (
    requiredHostIp === null ||
    requiredBindings.every(binding =>
      binding.HostIp === requiredHostIp
    )
  );
}

function inspectProviderContainer(name, options = {}) {
  if (name !== PROVIDER_CONTAINER_DEFAULT) {
    throw codedError('stack_provider_container_name_invalid');
  }
  const query = format => dockerText(
    ['inspect', '--format', format, name],
    { ...options, failureCode: 'stack_provider_container_unavailable' }
  );
  const id = query('{{ .Id }}');
  const imageId = query('{{ .Image }}');
  const imageName = query('{{ .Config.Image }}');
  const revision = query(
    '{{ index .Config.Labels "org.opencontainers.image.revision" }}'
  );
  const source = query(
    '{{ index .Config.Labels "org.opencontainers.image.source" }}'
  );
  const composeProject = query(
    '{{ index .Config.Labels "com.docker.compose.project" }}'
  );
  const composeService = query(
    '{{ index .Config.Labels "com.docker.compose.service" }}'
  );
  const portBindingsText = query('{{ json .NetworkSettings.Ports }}');
  let portMap;
  try {
    portMap = JSON.parse(portBindingsText);
  } catch {
    portMap = null;
  }
  const hostLoopbackOnly = publishedPortsLoopbackOnly(portMap, {
    requiredContainerPort: '3000/tcp',
    requiredHostPort: '3000',
    requiredHostIp: '127.0.0.1',
    requireSingleBinding: true
  });
  const running = query('{{ .State.Running }}') === 'true';
  const recognized = SAFE_CONTAINER_ID.test(id) &&
    SAFE_IMAGE_ID.test(imageId) &&
    SAFE_GIT_OBJECT.test(revision) &&
    imageName === 'calciumion/new-api:latest' &&
    source === 'https://github.com/QuantumNous/new-api' &&
    composeProject === 'new-api-wsl' &&
    composeService === 'new-api' &&
    hostLoopbackOnly;
  return Object.freeze({
    id,
    imageId,
    revision,
    running,
    hostLoopbackOnly,
    recognized
  });
}

function profileProviderIdentityMatches(profile, provider) {
  const acceptedImage = profile?.schemaVersion === IMAGE_PROFILE_SCHEMA_VERSION
    ? profile?.providerDaemonImageIdentity
    : profile?.providerImageId;
  return Boolean(
    provider?.recognized === true &&
    provider?.running === true &&
    provider?.id === profile?.providerContainerId &&
    provider?.imageId === acceptedImage &&
    provider?.revision === profile?.providerRevision
  );
}

function inspectEdgeContainer(name, options = {}) {
  if (!SAFE_CONTAINER_NAME.test(name || '')) {
    throw codedError('stack_edge_container_name_invalid');
  }
  const query = format => dockerText(
    ['inspect', '--format', format, name],
    { ...options, failureCode: 'stack_edge_container_unavailable' }
  );
  const id = query('{{ .Id }}');
  const revision = query('{{ index .Config.Labels "org.opencontainers.image.revision" }}');
  const user = query('{{ .Config.User }}');
  const readOnlyRoot = query('{{ .HostConfig.ReadonlyRootfs }}') === 'true';
  const restartPolicy = query('{{ .HostConfig.RestartPolicy.Name }}') || 'no';
  const logDriver = query('{{ .HostConfig.LogConfig.Type }}');
  const secretMountReadOnly = query(
    '{{ range .Mounts }}{{ if eq .Destination "/run/secrets/codex-memory-r4" }}{{ not .RW }}{{ end }}{{ end }}'
  ) === 'true';
  const configuredPortBindingsText = query(
    '{{ json .HostConfig.PortBindings }}'
  );
  let configuredPortMap;
  try {
    configuredPortMap = JSON.parse(configuredPortBindingsText);
  } catch {
    configuredPortMap = null;
  }
  const configuredHostLoopbackOnly = publishedPortsLoopbackOnly(
    configuredPortMap,
    {
      requiredContainerPort: '8080/tcp',
      allowEmptyHostPort: true
    }
  );
  const activePortBindingsText = query('{{ json .NetworkSettings.Ports }}');
  let activePortMap;
  try {
    activePortMap = JSON.parse(activePortBindingsText);
  } catch {
    activePortMap = null;
  }
  const hostLoopbackOnly = publishedPortsLoopbackOnly(activePortMap, {
    requiredContainerPort: '8080/tcp'
  });
  const running = query('{{ .State.Running }}') === 'true';
  const health = query('{{ if .State.Health }}{{ .State.Health.Status }}{{ else }}none{{ end }}');
  const nonRoot = user === 'node' || (/^[1-9][0-9]*$/u.test(user) && user !== '0');
  const configurationSecure = SAFE_CONTAINER_ID.test(id) &&
    SAFE_GIT_OBJECT.test(revision) &&
    nonRoot && readOnlyRoot &&
    restartPolicy === 'no' && logDriver === 'none' &&
    secretMountReadOnly && configuredHostLoopbackOnly;
  return Object.freeze({
    id,
    revision,
    running,
    healthy: health === 'healthy',
    nonRoot,
    readOnlyRoot,
    restartPolicy,
    logDriver,
    secretMountReadOnly,
    configuredHostLoopbackOnly,
    hostLoopbackOnly,
    configurationSecure,
    secure: configurationSecure && (!running || hostLoopbackOnly)
  });
}

function profileEdgeLifecycleIdentityMatches(profile, edge) {
  return Boolean(
    edge?.configurationSecure === true &&
    edge?.id === profile?.edgeContainerId &&
    edge?.revision === profile?.runtimeBaseline
  );
}

function profileEdgeIdentityMatches(profile, edge) {
  return Boolean(
    edge?.secure === true &&
    edge?.id === profile?.edgeContainerId &&
    edge?.revision === profile?.runtimeBaseline
  );
}

function requireProfileEdgeIdentity(profile, edge) {
  if (!profileEdgeIdentityMatches(profile, edge)) {
    throw codedError('stack_edge_identity_mismatch');
  }
  return true;
}

function runDocker(args, {
  exec = execFileSync
} = {}) {
  try {
    exec('docker', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'ignore', 'pipe']
    });
  } catch {
    throw codedError('stack_edge_container_action_failed');
  }
}

function portListening(port, host = '127.0.0.1', timeoutMs = 500) {
  return new Promise(resolve => {
    const socket = net.createConnection({ host, port });
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(timeoutMs, () => finish(false));
  });
}

function processOwnsLoopbackTcpListener(pid, port, {
  fsModule = fs
} = {}) {
  const normalizedPid = parsePid(pid);
  if (normalizedPid === null ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65_535) {
    return false;
  }
  const portHex = port.toString(16).toUpperCase().padStart(4, '0');
  const expectedAddress = `0100007F:${portHex}`;
  let table;
  let descriptorNames;
  try {
    table = String(fsModule.readFileSync('/proc/net/tcp', 'utf8'));
    descriptorNames = fsModule.readdirSync(`/proc/${normalizedPid}/fd`);
  } catch {
    return false;
  }
  const listenerInodes = new Set();
  for (const line of table.split('\n')) {
    const fields = line.trim().split(/\s+/u);
    if (fields.length < 10 ||
        fields[1] !== expectedAddress ||
        fields[3] !== '0A' ||
        !/^[1-9][0-9]*$/u.test(fields[9])) {
      continue;
    }
    listenerInodes.add(fields[9]);
  }
  if (listenerInodes.size === 0) return false;
  const ownedSocketInodes = new Set();
  for (const descriptorName of descriptorNames) {
    if (!/^[0-9]+$/u.test(String(descriptorName))) continue;
    try {
      const target = String(fsModule.readlinkSync(
        `/proc/${normalizedPid}/fd/${descriptorName}`
      ));
      const match = /^socket:\[([1-9][0-9]*)\]$/u.exec(target);
      if (match) ownedSocketInodes.add(match[1]);
    } catch {}
  }
  return [...listenerInodes].every(inode => ownedSocketInodes.has(inode));
}

function processOwnsUnixListener(pid, socketPath, {
  fsModule = fs
} = {}) {
  const normalizedPid = parsePid(pid);
  if (normalizedPid === null ||
      typeof socketPath !== 'string' ||
      !path.isAbsolute(socketPath) ||
      path.resolve(socketPath) !== socketPath ||
      socketPath.includes('\0') ||
      Buffer.byteLength(socketPath, 'utf8') > 512) {
    return false;
  }
  let socketStat;
  let table;
  let descriptorNames;
  try {
    socketStat = fsModule.lstatSync(socketPath);
    table = String(fsModule.readFileSync('/proc/net/unix', 'utf8'));
    descriptorNames = fsModule.readdirSync(`/proc/${normalizedPid}/fd`);
  } catch {
    return false;
  }
  if (!socketStat.isSocket() ||
      socketStat.isSymbolicLink?.() ||
      socketStat.uid !== currentUid() ||
      (socketStat.mode & 0o077) !== 0) {
    return false;
  }
  const listenerInodes = new Set();
  for (const line of table.split('\n')) {
    const fields = line.trim().split(/\s+/u);
    if (fields.length < 8 ||
        fields[3] !== '00010000' ||
        fields[4] !== '0001' ||
        fields[5] !== '01' ||
        !/^[1-9][0-9]*$/u.test(fields[6]) ||
        fields.slice(7).join(' ') !== socketPath) {
      continue;
    }
    listenerInodes.add(fields[6]);
  }
  if (listenerInodes.size === 0) return false;
  const ownedSocketInodes = new Set();
  for (const descriptorName of descriptorNames) {
    if (!/^[0-9]+$/u.test(String(descriptorName))) continue;
    try {
      const target = String(fsModule.readlinkSync(
        `/proc/${normalizedPid}/fd/${descriptorName}`
      ));
      const match = /^socket:\[([1-9][0-9]*)\]$/u.exec(target);
      if (match) ownedSocketInodes.add(match[1]);
    } catch {}
  }
  return [...listenerInodes].every(inode => ownedSocketInodes.has(inode));
}

function connectedUnixPeerOwnedByPid(socket, pid, {
  exec = execFileSync
} = {}) {
  const normalizedPid = parsePid(pid);
  const descriptor = socket?._handle?.fd;
  if (normalizedPid === null ||
      !Number.isSafeInteger(descriptor) ||
      descriptor < 0 ||
      typeof exec !== 'function' ||
      typeof process.getuid !== 'function' ||
      typeof process.getgid !== 'function') {
    return false;
  }
  let peerCredentials;
  try {
    peerCredentials = String(exec(
      UNIX_PEER_CREDENTIAL_HELPER_PATH,
      [
        '-I',
        '-S',
        '-c',
        UNIX_PEER_CREDENTIAL_HELPER_SOURCE
      ],
      {
        encoding: 'utf8',
        env: Object.freeze({
          LC_ALL: 'C',
          PATH: '/usr/bin:/bin'
        }),
        maxBuffer: 4096,
        stdio: ['ignore', 'pipe', 'ignore', descriptor],
        timeout: 1000
      }
    ));
  } catch {
    return false;
  }
  const match = /^([1-9][0-9]{0,9}):([0-9]{1,10}):([0-9]{1,10})\n?$/u
    .exec(peerCredentials);
  return match !== null &&
    parsePid(match[1]) === normalizedPid &&
    Number(match[2]) === process.getuid() &&
    Number(match[3]) === process.getgid();
}

function connectOwnedLoopbackTcpListener(pid, port, {
  timeoutMs = 1000,
  fsModule = fs
} = {}) {
  if (!processOwnsLoopbackTcpListener(pid, port, { fsModule })) {
    return Promise.reject(codedError('stack_http_listener_identity_mismatch'));
  }
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    let settled = false;
    const fail = () => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(codedError('stack_http_listener_identity_mismatch'));
    };
    socket.once('connect', () => {
      if (!processOwnsLoopbackTcpListener(pid, port, { fsModule })) {
        fail();
        return;
      }
      settled = true;
      socket.setTimeout(0);
      resolve(socket);
    });
    socket.once('error', fail);
    socket.setTimeout(timeoutMs, fail);
  });
}

function httpPolicyFailureCode(value) {
  const access = value?.access;
  const auth = value?.auth;
  const policy = value?.policyGates;
  if (!exactKeys(access, [
    'mode',
    'selectedProjection',
    'selectedProjectionVersion',
    'bearerTokenRequiredForMcpTools',
    'tokenMaterialReturned',
    'filesystemPathsReturned',
    'rawStoreFieldsReturned',
    'rawMemoryFieldsReturned',
    'embeddingFingerprintReturned',
    'runtimeDetailLevel'
  ])) {
    return 'stack_http_access_shape_invalid';
  }
  if (!exactKeys(auth, ['required', 'warning'])) {
    return 'stack_http_auth_shape_invalid';
  }
  if (!exactKeys(policy, [
    'activeMemoryAutoRebuildEnabled',
    'bridgeGateMode',
    'candidateCacheEnabled',
    'controlledMutationToolsExposed',
    'securityProfile',
    'softReadPolicyEnabled',
    'lifecycleReadPolicyEnabled',
    'writePreflightEnabled',
    'externalProviderAllowed',
    'governedNativeBridgeWarnings',
    'mcpPublicToolSurface',
    'nativeReadDelegationMode',
    'nativeWriteDelegationMode',
    'publicToolCount',
    'publicToolNames',
    'shadowAutoRebuildEnabled',
    'shadowWritesEnabled',
    'vectorIndexEnabled',
    'writeToolsExposed'
  ])) {
    return 'stack_http_policy_shape_invalid';
  }
  if (access.mode !== 'health_full' ||
      access.selectedProjection !== false ||
      access.selectedProjectionVersion !== 1 ||
      access.bearerTokenRequiredForMcpTools !== true ||
      access.tokenMaterialReturned !== false ||
      access.filesystemPathsReturned !== false ||
      access.rawStoreFieldsReturned !== false ||
      access.rawMemoryFieldsReturned !== false ||
      access.embeddingFingerprintReturned !== false ||
      access.runtimeDetailLevel !== 'bounded') {
    return 'stack_http_access_policy_invalid';
  }
  if (auth.required !== true || auth.warning !== null) {
    return 'stack_http_auth_policy_invalid';
  }
  if (policy.securityProfile !== 'hardened') {
    return 'stack_http_security_profile_invalid';
  }
  if (policy.softReadPolicyEnabled !== true) {
    return 'stack_http_soft_read_policy_invalid';
  }
  if (policy.lifecycleReadPolicyEnabled !== true) {
    return 'stack_http_lifecycle_read_policy_invalid';
  }
  if (policy.writePreflightEnabled !== true) {
    return 'stack_http_write_preflight_policy_invalid';
  }
  if (policy.candidateCacheEnabled !== false ||
      policy.shadowWritesEnabled !== false ||
      policy.vectorIndexEnabled !== false ||
      policy.shadowAutoRebuildEnabled !== false ||
      policy.activeMemoryAutoRebuildEnabled !== false) {
    return 'stack_http_storage_mutation_policy_invalid';
  }
  if (policy.mcpPublicToolSurface !== 'read_only' ||
      policy.controlledMutationToolsExposed !== false ||
      policy.writeToolsExposed !== false ||
      policy.nativeWriteDelegationMode !== 'off') {
    return 'stack_http_write_surface_policy_invalid';
  }
  if (policy.bridgeGateMode !== 'strict' ||
      policy.nativeReadDelegationMode !== 'primary') {
    return 'stack_http_native_read_policy_invalid';
  }
  if (policy.publicToolCount !== CANONICAL_CODEX_MCP_TOOL_NAMES.length ||
      !Array.isArray(policy.publicToolNames) ||
      policy.publicToolNames.length !== CANONICAL_CODEX_MCP_TOOL_NAMES.length ||
      !policy.publicToolNames.every(
        (toolName, index) =>
          toolName === CANONICAL_CODEX_MCP_TOOL_NAMES[index]
      )) {
    return 'stack_http_public_tool_contract_invalid';
  }
  if (policy.externalProviderAllowed !== false) {
    return 'stack_http_external_provider_policy_invalid';
  }
  if (!Array.isArray(policy.governedNativeBridgeWarnings) ||
      policy.governedNativeBridgeWarnings.length !== 0) {
    return 'stack_http_native_bridge_policy_invalid';
  }
  return null;
}

function projectHttpHealthPayload(value, statusCode) {
  const policyFailureCode = httpPolicyFailureCode(value);
  return Object.freeze({
    reachable: statusCode === 200,
    statusCode: Number.isInteger(statusCode) ? statusCode : null,
    ok: value?.ok === true,
    authRequired: value?.auth?.required === true ||
      value?.authentication?.required === true,
    policyAccepted: policyFailureCode === null,
    policyFailureCode
  });
}

function getJsonHealth({
  host = '127.0.0.1',
  port,
  pathname = '/health',
  timeoutMs = 1000,
  bearerToken = '',
  connectedSocket = null
}) {
  return new Promise(resolve => {
    let connectionAgent = null;
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      connectionAgent?.destroy();
      resolve(value);
    };
    const options = {
      host,
      port,
      path: pathname,
      timeout: timeoutMs,
      headers: bearerToken
        ? { Authorization: `Bearer ${bearerToken}` }
        : undefined
    };
    if (connectedSocket) {
      connectionAgent = new http.Agent({ keepAlive: false });
      connectionAgent.createConnection = () => connectedSocket;
      options.agent = connectionAgent;
    }
    let request;
    try {
      request = http.get(options, response => {
        let bytes = 0;
        const chunks = [];
        response.on('data', chunk => {
          bytes += chunk.length;
          if (bytes > 32_768) {
            request.destroy();
            return;
          }
          chunks.push(chunk);
        });
        response.once('end', () => {
          try {
            const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            finish(projectHttpHealthPayload(value, response.statusCode));
          } catch {
            finish(projectHttpHealthPayload(null, response.statusCode));
          }
        });
      });
    } catch {
      finish(projectHttpHealthPayload(null, null));
      return;
    }
    request.once('timeout', () => request.destroy());
    request.once('error', () =>
      finish(projectHttpHealthPayload(null, null)));
  });
}

function socketJsonRequest(socketPath, request, {
  maximumBytes = 16_384,
  timeoutMs = 1500
} = {}) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(socketPath);
    const chunks = [];
    let bytes = 0;
    let settled = false;
    const fail = code => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(codedError(code));
    };
    socket.once('connect', () => {
      socket.write(`${JSON.stringify(request)}\n`);
    });
    socket.on('data', chunk => {
      if (settled) return;
      bytes += chunk.length;
      if (bytes > maximumBytes) return fail('stack_socket_response_too_large');
      chunks.push(chunk);
    });
    socket.once('end', () => {
      if (settled) return;
      settled = true;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(codedError('stack_socket_response_invalid'));
      }
    });
    socket.once('error', () => fail('stack_socket_unavailable'));
    socket.setTimeout(timeoutMs, () => fail('stack_socket_timeout'));
  });
}

function probeUnixSocket(socketPath, {
  connect = net.createConnection,
  timeoutMs = 500
} = {}) {
  return new Promise(resolve => {
    let socket;
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      socket?.destroy();
      resolve(value);
    };
    try {
      socket = connect(socketPath);
    } catch {
      finish('uncertain');
      return;
    }
    socket.once('connect', () => finish('active'));
    socket.once('error', error => {
      if (error?.code === 'ECONNREFUSED') return finish('stale');
      if (error?.code === 'ENOENT') return finish('absent');
      return finish('uncertain');
    });
    socket.setTimeout(timeoutMs, () => finish('uncertain'));
  });
}

async function prepareStaleOwnerSocket(socketPath, privateRoot, {
  fsModule = fs,
  probeSocket = probeUnixSocket
} = {}) {
  if (typeof socketPath !== 'string' || !path.isAbsolute(socketPath) ||
      path.resolve(socketPath) !== socketPath || socketPath.includes('\0') ||
      Buffer.byteLength(socketPath, 'utf8') > 512) {
    throw codedError('stack_governance_socket_path_invalid');
  }
  const root = assertOwnerOnlyDirectory(privateRoot, { fsModule });
  const parent = path.dirname(socketPath);
  const relation = path.relative(root, parent);
  if (relation.startsWith('..') || path.isAbsolute(relation)) {
    throw codedError('stack_governance_socket_outside_private_root');
  }
  const resolvedParent = assertOwnerOnlyDirectory(parent, { fsModule });
  if (resolvedParent !== parent) {
    throw codedError('stack_governance_socket_parent_invalid');
  }
  let initial;
  try {
    initial = fsModule.lstatSync(socketPath);
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw codedError('stack_governance_socket_inspection_failed');
  }
  if (!initial.isSocket() || initial.isSymbolicLink?.() ||
      initial.uid !== currentUid() || (initial.mode & 0o077) !== 0) {
    throw codedError('stack_governance_socket_candidate_invalid');
  }
  const probe = await probeSocket(socketPath);
  if (probe === 'active') throw codedError('stack_governance_socket_active');
  if (probe === 'absent') return false;
  if (probe !== 'stale') throw codedError('stack_governance_socket_probe_uncertain');
  assertOwnerOnlyDirectory(parent, { fsModule });
  let current;
  try {
    current = fsModule.lstatSync(socketPath);
  } catch {
    throw codedError('stack_governance_socket_identity_changed');
  }
  if (!current.isSocket() || current.isSymbolicLink?.() ||
      current.uid !== currentUid() ||
      current.dev !== initial.dev || current.ino !== initial.ino) {
    throw codedError('stack_governance_socket_identity_changed');
  }
  try {
    fsModule.unlinkSync(socketPath);
  } catch {
    throw codedError('stack_governance_stale_socket_cleanup_failed');
  }
  return true;
}

function buildControllerChildEnvironment(environmentFile, {
  profile,
  environment = process.env,
  expectedGovernancePid = null,
  expectedHttpPid = null,
  fsModule = fs
} = {}) {
  const managedEnvironment = loadManagedEnvironmentFile(
    environmentFile,
    { fsModule }
  );
  const childEnvironment = {
    ...childBaseEnvironment(environment),
    ...managedEnvironment,
    CODEX_MEMORY_STACK_CHILD: '1',
    CODEX_MEMORY_STACK_PRIVATE_ROOT: profile.privateRoot,
    CODEX_MEMORY_STACK_RUNTIME_BASELINE: profile.runtimeBaseline,
    CODEX_MEMORY_STACK_RUNTIME_DIR: runtimeDirectory(environment),
    CODEX_MEMORY_STACK_RETAINED_BINDING_FILE:
      resolvePrivateReference(profile, profile.retainedBinding),
    CODEX_MEMORY_STACK_RETAINED_BINDING_SOURCE:
      profile.retainedBindingSource
  };
  if ([PROFILE_SCHEMA_VERSION, IMAGE_PROFILE_SCHEMA_VERSION]
    .includes(profile.schemaVersion)) {
    childEnvironment.CODEX_MEMORY_STACK_CONTROLLER_SOURCE_MANIFEST_DIGEST =
      profile.controllerSourceManifestDigest;
    childEnvironment.CODEX_MEMORY_STACK_CONTROLLER_SOURCE_MANIFEST_VERSION =
      String(profile.controllerSourceManifestVersion);
    childEnvironment.CODEX_MEMORY_STACK_PROFILE_SCHEMA_VERSION =
      String(profile.schemaVersion);
    childEnvironment.CODEX_MEMORY_STACK_VCP_PROVIDER_CONFIG_DIGEST =
      profile.vcpProviderConfigDigest;
    childEnvironment.CODEX_MEMORY_STACK_VCP_RUNTIME_BASELINE =
      profile.vcpRuntimeBaseline;
    childEnvironment.CODEX_MEMORY_STACK_VCP_RUNTIME_REPOSITORY =
      profile.vcpRuntimeRepository;
    childEnvironment.CODEX_MEMORY_STACK_VCP_RUNTIME_SCOPE_DIGEST =
      profile.vcpRuntimeScopeDigest;
    if (['contract_v1', 'image_authority_v1'].includes(
      profileVcpRuntimeIdentityMode(profile)
    )) {
      childEnvironment.CODEX_MEMORY_STACK_VCP_RUNTIME_CONTRACT_DIGEST =
        profile.vcpRuntimeContractDigest;
      childEnvironment.CODEX_MEMORY_STACK_VCP_RUNTIME_IDENTITY_SCHEMA_VERSION =
        String(profile.vcpRuntimeIdentitySchemaVersion);
    }
    if (profile.schemaVersion === IMAGE_PROFILE_SCHEMA_VERSION) {
      childEnvironment.CODEX_MEMORY_CONTAINER_SUPERVISOR = '1';
      childEnvironment.CODEX_MEMORY_RUNTIME_BUILD_MANIFEST_DIGEST =
        profile.runtimeBuildManifestDigest;
      childEnvironment.CODEX_MEMORY_STACK_ADOPTED_REPOSITORY_HEAD =
        profile.runtimeBaseline;
      childEnvironment.VCP_ROOT = IMAGE_VCP_ROOT;
      childEnvironment.VCPTOOLBOX_ROOT = IMAGE_VCP_ROOT;
      const sockets = runtimeSocketPaths(environment);
      childEnvironment.CODEX_MEMORY_R4_RELAY_UDS_PATH = sockets.data;
      childEnvironment.CODEX_MEMORY_R4_SESSION_CONTROL_UDS_PATH = sockets.control;
    }
  } else if (profile.schemaVersion === EXACT_HEAD_PROFILE_SCHEMA_VERSION) {
    childEnvironment.CODEX_MEMORY_STACK_CONTROLLER_SOURCE_COMMIT =
      profile.controllerSourceCommit;
    childEnvironment.CODEX_MEMORY_STACK_PROFILE_SCHEMA_VERSION =
      String(EXACT_HEAD_PROFILE_SCHEMA_VERSION);
    childEnvironment.CODEX_MEMORY_STACK_VCP_PROVIDER_CONFIG_DIGEST =
      profile.vcpProviderConfigDigest;
    childEnvironment.CODEX_MEMORY_STACK_VCP_RUNTIME_BASELINE =
      profile.vcpRuntimeBaseline;
    childEnvironment.CODEX_MEMORY_STACK_VCP_RUNTIME_REPOSITORY =
      profile.vcpRuntimeRepository;
    childEnvironment.CODEX_MEMORY_STACK_VCP_RUNTIME_SCOPE_DIGEST =
      profile.vcpRuntimeScopeDigest;
  }
  if (expectedHttpPid !== null) {
    const pid = parsePid(expectedHttpPid);
    if (pid === null) throw codedError('stack_http_listener_identity_missing');
    childEnvironment.CODEX_MEMORY_STACK_EXPECTED_HTTP_PID = String(pid);
  }
  if (expectedGovernancePid !== null) {
    const pid = parsePid(expectedGovernancePid);
    if (pid === null) {
      throw codedError('stack_governance_listener_identity_missing');
    }
    childEnvironment.CODEX_MEMORY_STACK_EXPECTED_GOVERNANCE_PID =
      String(pid);
  }
  return Object.freeze(childEnvironment);
}

function childVcpRuntimeProfileFields(environment = process.env) {
  const fields = {
    vcpProviderConfigDigest:
      environment.CODEX_MEMORY_STACK_VCP_PROVIDER_CONFIG_DIGEST,
    vcpRuntimeBaseline:
      environment.CODEX_MEMORY_STACK_VCP_RUNTIME_BASELINE,
    vcpRuntimeRepository:
      environment.CODEX_MEMORY_STACK_VCP_RUNTIME_REPOSITORY,
    vcpRuntimeScopeDigest:
      environment.CODEX_MEMORY_STACK_VCP_RUNTIME_SCOPE_DIGEST
  };
  const schema = environment
    .CODEX_MEMORY_STACK_VCP_RUNTIME_IDENTITY_SCHEMA_VERSION;
  const digest = environment.CODEX_MEMORY_STACK_VCP_RUNTIME_CONTRACT_DIGEST;
  if (schema !== undefined || digest !== undefined) {
    fields.vcpRuntimeContractDigest = digest;
    fields.vcpRuntimeIdentitySchemaVersion = Number(schema);
  }
  return fields;
}

function runChildProbe(mode, environmentFile, {
  profile,
  environment = process.env,
  expectedHttpPid = null,
  exec = execFileSync
} = {}) {
  const childEnvironment = buildControllerChildEnvironment(
    environmentFile,
    {
      profile,
      environment,
      expectedHttpPid: mode === '_probe-http' ? expectedHttpPid : null
    }
  );
  try {
    const output = exec(process.execPath, [
      SCRIPT_PATH,
      mode,
      `--stack-environment=${environmentFile}`
    ], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env: childEnvironment,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5000,
      maxBuffer: 32_768
    });
    return JSON.parse(String(output).trim());
  } catch {
    return null;
  }
}

function runOwnedUnixProbe(
  name,
  mode,
  environmentFile,
  socketPath,
  {
    profile,
    environment = process.env
  } = {}
) {
  const before = inspectManagedProcess(name, { environment, profile });
  if (!before.managed ||
      !processOwnsUnixListener(before.pid, socketPath)) {
    return null;
  }
  const result = runChildProbe(mode, environmentFile, {
    profile,
    environment
  });
  const after = inspectManagedProcess(name, { environment, profile });
  if (!after.managed ||
      after.pid !== before.pid ||
      !processOwnsUnixListener(after.pid, socketPath)) {
    return null;
  }
  return result;
}

function lowDisclosureHttpProjection(value) {
  const policyFailureCode = SAFE_CODE.test(value?.policyFailureCode || '')
    ? value.policyFailureCode
    : 'stack_http_policy_unavailable';
  return Object.freeze({
    reachable: value?.reachable === true,
    ok: value?.ok === true,
    authRequired: value?.authRequired === true,
    policyAccepted: value?.policyAccepted === true,
    policyFailureCode: value?.policyAccepted === true
      ? null
      : policyFailureCode
  });
}

function lowDisclosureGovernanceProjection(value) {
  const observation = value?.observation;
  const safe = value?.accepted === true &&
    value?.default_closed === true &&
    value?.activation_status === 'inactive' &&
    value?.durable_state_written === false &&
    observation?.schema_version === 3 &&
    observation?.primary_memory_writes === 0 &&
    observation?.raw_memory_recorded === false &&
    observation?.durable_observation_state_written === false;
  return Object.freeze({
    reachable: safe,
    defaultClosed: value?.default_closed === true,
    activationStatus: value?.activation_status || 'unknown',
    observationSchema: Number.isInteger(observation?.schema_version)
      ? observation.schema_version
      : null,
    sessionsStarted: Number.isInteger(observation?.sessions_started)
      ? observation.sessions_started
      : null,
    providerCalls: Number.isInteger(observation?.provider_calls)
      ? observation.provider_calls
      : null,
    nativeInvocations: Number.isInteger(observation?.native_invocations)
      ? observation.native_invocations
      : null,
    primaryMemoryWrites: Number.isInteger(observation?.primary_memory_writes)
      ? observation.primary_memory_writes
      : null,
    rawMemoryRecorded: observation?.raw_memory_recorded === true
  });
}

function lowDisclosureRelayProjection(value) {
  const observation = value?.observation;
  const safe = value?.schema_version === 1 &&
    value?.operation === 'snapshot' &&
    observation?.schema_version === 1 &&
    observation?.component === 'outbound_relay' &&
    observation?.request_identifiers_retained === false &&
    observation?.response_bodies_retained === false &&
    observation?.raw_memory_retained === false &&
    observation?.secret_values_retained === false;
  return Object.freeze({
    reachable: safe,
    schemaVersion: Number.isInteger(observation?.schema_version)
      ? observation.schema_version
      : null,
    completionState: observation?.completion_state || 'unknown',
    claimsReceived: Number.isInteger(observation?.claims_received)
      ? observation.claims_received
      : null,
    requestsFailed: Number.isInteger(observation?.requests_failed)
      ? observation.requests_failed
      : null,
    rawMemoryRetained: observation?.raw_memory_retained === true,
    secretValuesRetained: observation?.secret_values_retained === true
  });
}

function computeRuntimeAccepted({
  profile,
  processes,
  managedEnvironmentConfigMatch,
  provider,
  vcpProviderConfigMatch,
  vcpProviderCredentialFresh,
  vcpRuntime,
  shimListenerOwned,
  governedReadShimListenerOwned,
  httpListenerOwned,
  governanceListenerOwned,
  governanceDataListenerOwned,
  relayListenerOwned,
  httpHealth,
  governance,
  governanceCredentialFresh,
  relay,
  relayCredentialFresh,
  edge,
  retainedBindingMatch
}) {
  return Boolean(
    retainedBindingMatch === true &&
    managedEnvironmentConfigMatch === true &&
    provider?.reachable === true &&
    profileProviderIdentityMatches(profile, provider) &&
    vcpProviderConfigMatch === true &&
    vcpProviderCredentialFresh === true &&
    profileVcpRuntimeIdentityMatches(profile, vcpRuntime) &&
    Object.keys(COMPONENTS).every(name =>
      processes?.[name]?.controllerManaged === true
    ) &&
    shimListenerOwned === true &&
    governedReadShimListenerOwned === true &&
    httpListenerOwned === true &&
    governanceListenerOwned === true &&
    governanceDataListenerOwned === true &&
    relayListenerOwned === true &&
    httpHealth?.reachable === true &&
    httpHealth?.ok === true &&
    httpHealth?.authRequired === true &&
    httpHealth?.policyAccepted === true &&
    processes?.governance?.managed === true &&
    governance?.reachable === true &&
    governanceCredentialFresh === true &&
    processes?.relay?.managed === true &&
    relay?.reachable === true &&
    relayCredentialFresh === true &&
    edge?.running === true &&
    edge?.healthy === true &&
    profileEdgeIdentityMatches(profile, edge)
  );
}

function computeStackAccepted(options) {
  return Boolean(
    options?.profile?.schemaVersion === PROFILE_SCHEMA_VERSION &&
    options?.source?.compatible === true &&
    computeRuntimeAccepted(options)
  );
}

async function inspectStack({
  environment = process.env,
  profile = readProfile({ environment })
} = {}) {
  const httpEndpoint = profileHttpEndpoint(profile);
  const source = inspectSourceCompatibility(profile);
  const processes = Object.fromEntries(
    Object.keys(COMPONENTS).map(name => [
      name,
      inspectManagedProcess(name, { environment, profile })
    ])
  );
  const governanceEnvironment = resolvePrivateReference(
    profile,
    profile.governanceEnvironment
  );
  const relayEnvironment = resolvePrivateReference(profile, profile.relayEnvironment);
  let governanceEnvironmentConfigMatch = false;
  let relayEnvironmentConfigMatch = false;
  if (profileHasRuntimeBinding(profile)) {
    try {
      const environmentConfigDigests = managedEnvironmentConfigDigests(
        governanceEnvironment,
        relayEnvironment
      );
      governanceEnvironmentConfigMatch =
        environmentConfigDigests.governanceEnvironmentConfigDigest ===
          profile.governanceEnvironmentConfigDigest;
      relayEnvironmentConfigMatch =
        environmentConfigDigests.relayEnvironmentConfigDigest ===
          profile.relayEnvironmentConfigDigest;
    } catch {}
  }
  const managedEnvironmentConfigMatch =
    governanceEnvironmentConfigMatch && relayEnvironmentConfigMatch;
  let providerContainer;
  try {
    providerContainer = inspectProviderContainer(profile.providerContainer);
  } catch {
    providerContainer = Object.freeze({
      id: null,
      imageId: null,
      revision: null,
      running: false,
      hostLoopbackOnly: false,
      recognized: false
    });
  }
  const providerPort = await portListening(3000);
  const provider = Object.freeze({
    ...providerContainer,
    reachable: providerPort
  });
  let vcpProviderConfigMatch = false;
  let providerConfigIdentity = null;
  const providerConfigFile = path.join(
    vcpRuntimeRepository(),
    'config.env'
  );
  if (profileHasRuntimeBinding(profile)) {
    try {
      const providerConfigSnapshot = readVcpProviderEnvironmentSnapshot(
        providerConfigFile
      );
      providerConfigIdentity = providerConfigSnapshot.fileIdentity;
      vcpProviderConfigMatch = profileVcpProviderConfigMatches(
        profile,
        providerConfigSnapshot.providerEnvironment
      );
    } catch {}
  }
  const vcpRuntime = inspectVcpRuntimeIdentity(profile);
  const vcpProviderCredentialFresh = providerCredentialFreshnessMatches({
    profile,
    providerConfigIdentity,
    providerConfigFile,
    runtimeRoot: runtimeDirectory(environment),
    shimPid: processes.shim.pid
  });
  const shimListenerOwned = processes.shim.controllerManaged &&
    processOwnsLoopbackTcpListener(processes.shim.pid, 7615);
  const governedReadShimListenerOwned =
    processes.shim.controllerManaged &&
    processOwnsLoopbackTcpListener(
      processes.shim.pid,
      GOVERNED_READ_SHIM_PORT
    );
  const httpListenerOwned = processes.http.controllerManaged &&
    processOwnsLoopbackTcpListener(
      processes.http.pid,
      httpEndpoint.port
    );
  const httpHealth = httpListenerOwned
    ? lowDisclosureHttpProjection(runChildProbe(
      '_probe-http',
      governanceEnvironment,
      {
        profile,
        environment,
        expectedHttpPid: processes.http.pid
      }
    ))
    : lowDisclosureHttpProjection(null);
  let governanceSocketPath = null;
  let governanceDataSocketPath = null;
  let relayDataSocketPath = null;
  try {
    const governanceChildEnvironment = buildControllerChildEnvironment(
      governanceEnvironment,
      { profile, environment }
    );
    governanceSocketPath =
      governanceChildEnvironment.CODEX_MEMORY_R4_SESSION_CONTROL_UDS_PATH;
    governanceDataSocketPath =
      governanceChildEnvironment.CODEX_MEMORY_R4_RELAY_UDS_PATH;
    relayDataSocketPath = buildControllerChildEnvironment(
      relayEnvironment,
      { profile, environment }
    ).CODEX_MEMORY_R4_RELAY_UDS_PATH;
  } catch {}
  const governanceListenerOwned = processes.governance.managed &&
    processOwnsUnixListener(
      processes.governance.pid,
      governanceSocketPath
    );
  const governanceDataListenerOwned =
    governanceDataSocketPath === relayDataSocketPath &&
    processes.governance.managed &&
    processOwnsUnixListener(
      processes.governance.pid,
      governanceDataSocketPath
    );
  const governanceCredentialFresh = governanceCredentialFreshnessMatches({
    governanceEnvironmentFile: governanceEnvironment,
    governancePid: processes.governance.pid,
    profile,
    runtimeRoot: runtimeDirectory(environment)
  });
  const governance = Object.freeze({
    ...(
      governanceListenerOwned
        ? lowDisclosureGovernanceProjection(runOwnedUnixProbe(
          'governance',
          '_probe-governance',
          governanceEnvironment,
          governanceSocketPath,
          { profile, environment }
        ))
        : lowDisclosureGovernanceProjection(null)
    ),
    listenerIdentityMatch: governanceListenerOwned,
    dataListenerIdentityMatch: governanceDataListenerOwned,
    credentialFresh: governanceCredentialFresh
  });
  const relaySocketPath = path.join(
    runtimeDirectory(environment),
    'relay-observer.sock'
  );
  const relayListenerOwned = processes.relay.managed &&
    processOwnsUnixListener(processes.relay.pid, relaySocketPath);
  const relayCredentialFresh = relayCredentialFreshnessMatches({
    profile,
    relayEnvironmentFile: relayEnvironment,
    relayPid: processes.relay.pid,
    runtimeRoot: runtimeDirectory(environment)
  });
  const relay = Object.freeze({
    ...(
      relayListenerOwned
        ? lowDisclosureRelayProjection(runOwnedUnixProbe(
          'relay',
          '_probe-relay',
          relayEnvironment,
          relaySocketPath,
          { profile, environment }
        ))
        : lowDisclosureRelayProjection(null)
    ),
    listenerIdentityMatch: relayListenerOwned,
    credentialFresh: relayCredentialFresh
  });
  let edge;
  try {
    edge = inspectEdgeContainer(profile.edgeContainer);
  } catch {
    edge = Object.freeze({
      revision: null,
      id: null,
      running: false,
      healthy: false,
      secure: false
    });
  }
  const processProjection = Object.fromEntries(
    Object.entries(processes).map(([name, value]) => [
      name,
      Object.freeze({
        running: value.running,
        managed: value.managed,
        controllerManaged: value.controllerManaged
      })
    ])
  );
  const retainedBindingMatch = profileRetainedBindingMatches(profile);
  const runtimeAccepted = computeRuntimeAccepted({
    profile,
    processes,
    managedEnvironmentConfigMatch,
    provider,
    vcpProviderConfigMatch,
    vcpProviderCredentialFresh,
    vcpRuntime,
    shimListenerOwned,
    governedReadShimListenerOwned,
    httpListenerOwned,
    governanceListenerOwned,
    governanceDataListenerOwned,
    relayListenerOwned,
    httpHealth,
    governance,
    governanceCredentialFresh,
    relay,
    relayCredentialFresh,
    edge,
    retainedBindingMatch
  });
  const accepted = computeStackAccepted({
    profile,
    source,
    processes,
    managedEnvironmentConfigMatch,
    provider,
    vcpProviderConfigMatch,
    vcpProviderCredentialFresh,
    vcpRuntime,
    shimListenerOwned,
    governedReadShimListenerOwned,
    httpListenerOwned,
    governanceListenerOwned,
    governanceDataListenerOwned,
    relayListenerOwned,
    httpHealth,
    governance,
    governanceCredentialFresh,
    relay,
    relayCredentialFresh,
    edge,
    retainedBindingMatch
  });
  return Object.freeze({
    accepted,
    runtimeAccepted,
    configured: true,
    profileSchemaVersion: profile.schemaVersion,
    profileUpgradeRequired:
      profile.schemaVersion !== PROFILE_SCHEMA_VERSION,
    runtimeBaseline: profile.runtimeBaseline,
    source: Object.freeze({
      clean: source.clean,
      currentMain: source.currentMain,
      controllerIdentityMatch: source.controllerSourceMatch,
      identityMode: source.identityMode,
      manifestVersion: source.manifestVersion,
      manifestComplete: source.manifestComplete,
      manifestScopeClean: source.manifestScopeClean,
      adoptedHeadReadable: source.adoptedHeadReadable,
      adoptedHeadAncestor: source.adoptedHeadAncestor,
      upgradeEligible: source.upgradeEligible,
      sourceManifestRebindEligible:
        sourceManifestRebindEligible(profile, source),
      repositoryMatch: source.repositoryMatch,
      compatible: source.compatible
    }),
    retainedBinding: Object.freeze({ identityMatch: retainedBindingMatch }),
    runtimeConfiguration: Object.freeze({
      governanceIdentityMatch: governanceEnvironmentConfigMatch,
      relayIdentityMatch: relayEnvironmentConfigMatch
    }),
    processes: Object.freeze(processProjection),
    provider: Object.freeze({
      reachable: provider.reachable,
      running: provider.running,
      recognized: provider.recognized,
      loopbackOnly: provider.hostLoopbackOnly,
      identityMatch: profileProviderIdentityMatches(profile, provider)
    }),
    vcpRuntime: Object.freeze({
      identityMatch: profileVcpRuntimeIdentityMatches(profile, vcpRuntime),
      classification: vcpRuntime.classification,
      contractMatch: vcpRuntime.contractMatch,
      buildChanged: vcpRuntime.buildChanged,
      providerConfigIdentityMatch: vcpProviderConfigMatch,
      providerCredentialFresh: vcpProviderCredentialFresh,
      currentMain: vcpRuntime.currentMain,
      scopeClean: vcpRuntime.scopeClean,
      scopeComplete: vcpRuntime.scopeComplete
    }),
    shim: Object.freeze({
      reachable:
        shimListenerOwned &&
        governedReadShimListenerOwned,
      listenerIdentityMatch: shimListenerOwned,
      governedReadAttemptListenerIdentityMatch:
        governedReadShimListenerOwned,
      governedReadAttemptProtocol:
        GOVERNED_READ_ATTEMPT_PROTOCOL
    }),
    httpMcp: Object.freeze({
      reachable: httpHealth.reachable,
      healthy: httpHealth.ok,
      authRequired: httpHealth.authRequired,
      listenerIdentityMatch: httpListenerOwned,
      endpointRole: httpEndpoint.role,
      canonicalClientEndpoint:
        httpEndpoint === CANONICAL_CODEX_MCP_ENDPOINT,
      policyAccepted: httpHealth.policyAccepted,
      policyFailureCode: httpHealth.policyFailureCode
    }),
    governance,
    relay,
    edge: Object.freeze({
      running: edge.running,
      healthy: edge.healthy,
      secure: edge.secure,
      revisionMatch: edge.revision === profile.runtimeBaseline,
      identityMatch: profileEdgeIdentityMatches(profile, edge),
      ...EDGE_CONTRACT_STATUS
    }),
    secretValuesReturned: false,
    rawMemoryReturned: false
  });
}

function writePidFile(file, pid) {
  if (!Number.isSafeInteger(pid) || pid <= 1) {
    throw codedError('stack_pid_invalid');
  }
  const descriptor = fs.openSync(
    file,
    fs.constants.O_CREAT |
      fs.constants.O_TRUNC |
      fs.constants.O_WRONLY |
      (fs.constants.O_CLOEXEC || 0) |
      (fs.constants.O_NOFOLLOW || 0),
    0o600
  );
  try {
    fs.writeFileSync(descriptor, `${pid}\n`, 'utf8');
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  fs.chmodSync(file, 0o600);
}

async function waitForProcessGroupExit(pid, {
  kill = process.kill,
  wait = delay => new Promise(resolve => setTimeout(resolve, delay)),
  attempts = 100,
  intervalMs = 100
} = {}) {
  if (!Number.isSafeInteger(pid) || pid <= 1 ||
      !Number.isSafeInteger(attempts) || attempts < 1 ||
      !Number.isSafeInteger(intervalMs) || intervalMs < 0) {
    return false;
  }
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      kill(-pid, 0);
    } catch (error) {
      if (error?.code === 'ESRCH') return true;
      return false;
    }
    if (attempt + 1 < attempts) await wait(intervalMs);
  }
  return false;
}

async function finalizeManagedSpawn(child, pidFile, {
  writePid = writePidFile,
  kill = process.kill,
  waitForExit = waitForProcessGroupExit
} = {}) {
  try {
    writePid(pidFile, child?.pid);
  } catch {
    if (!Number.isSafeInteger(child?.pid) || child.pid <= 1) {
      throw codedError('stack_pid_file_cleanup_failed');
    }
    let exited = false;
    try {
      kill(-child.pid, 'SIGTERM');
    } catch (error) {
      exited = error?.code === 'ESRCH';
    }
    if (!exited) {
      try {
        exited = await waitForExit(child.pid, { kill });
      } catch {
        exited = false;
      }
    }
    if (!exited) {
      throw codedError('stack_pid_file_cleanup_failed');
    }
    throw codedError('stack_pid_file_write_failed');
  }
  child.unref();
  return true;
}

async function spawnManaged(name, mode, environmentFile, {
  profile,
  environment = process.env,
  expectedGovernancePid = null
}) {
  const existing = inspectManagedProcess(name, { environment, profile });
  if (existing.running) {
    if (!existing.managed) throw codedError('stack_unmanaged_process_detected');
    return Object.freeze({ started: false, pid: existing.pid });
  }
  ensureRuntimeDirectories(environment);
  const locations = componentPaths(name, environment);
  const logDescriptor = fs.openSync(
    locations.log,
    fs.constants.O_CREAT | fs.constants.O_APPEND | fs.constants.O_WRONLY,
    0o600
  );
  fs.chmodSync(locations.log, 0o600);
  const childEnvironment = buildControllerChildEnvironment(
    environmentFile,
    { profile, environment, expectedGovernancePid }
  );
  let child;
  try {
    child = spawn(process.execPath, [
      SCRIPT_PATH,
      mode,
      `--stack-environment=${environmentFile}`
    ], {
      cwd: REPO_ROOT,
      detached: true,
      env: childEnvironment,
      stdio: ['ignore', logDescriptor, logDescriptor]
    });
  } finally {
    fs.closeSync(logDescriptor);
  }
  await finalizeManagedSpawn(child, locations.pid);
  return Object.freeze({ started: true, pid: child.pid });
}

async function waitFor(check, {
  attempts = 60,
  intervalMs = 250,
  failureCode = 'stack_start_timeout'
} = {}) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await check()) return true;
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw codedError(failureCode);
}

async function stopManaged(name, {
  environment = process.env,
  profile
} = {}) {
  const locations = componentPaths(name, environment);
  const state = inspectManagedProcess(name, { environment, profile });
  if (!state.running) {
    try {
      fs.unlinkSync(locations.pid);
    } catch {}
    return false;
  }
  if (!state.managed) throw codedError('stack_unmanaged_process_detected');
  const current = inspectManagedProcess(name, { environment, profile });
  if (!current.running || !current.managed || current.pid !== state.pid) {
    throw codedError('stack_process_identity_changed');
  }
  try {
    process.kill(current.pid, 'SIGTERM');
  } catch {
    throw codedError('stack_process_stop_failed');
  }
  await waitFor(
    () => !isPidRunning(current.pid),
    managedStopWaitOptions(name)
  );
  try {
    fs.unlinkSync(locations.pid);
  } catch {}
  return true;
}

function managedStopWaitOptions(name) {
  const budgetMs = MANAGED_STOP_WAIT_MS[name];
  const intervalMs = 200;
  if (!Number.isSafeInteger(budgetMs) ||
      budgetMs < intervalMs ||
      budgetMs % intervalMs !== 0) {
    throw codedError('stack_component_invalid');
  }
  return Object.freeze({
    attempts: (budgetMs / intervalMs) + 1,
    intervalMs,
    failureCode: 'stack_process_stop_timeout'
  });
}

async function rollbackStarted(started, profile, environment) {
  const failures = [];
  for (const name of ['relay', 'governance', 'http', 'shim']) {
    if (!started.has(name)) continue;
    try {
      await stopManaged(name, { environment, profile });
    } catch {
      failures.push(name);
    }
  }
  if (started.has('edge')) {
    try {
      const edge = inspectEdgeContainer(profile.edgeContainerId);
      if (!profileEdgeLifecycleIdentityMatches(profile, edge)) {
        throw codedError('stack_edge_identity_mismatch');
      }
      runDocker(['stop', '--time', '10', profile.edgeContainerId]);
    } catch {
      failures.push('edge');
    }
  }
  return failures;
}

function startOutcomeWithEvidence(outcome, started) {
  return Object.freeze({
    outcome,
    startedComponents: Object.freeze([...started])
  });
}

async function startStackWithProfile(storedProfile, {
  environment = process.env,
  containerEvidence = null
} = {}) {
  let profile = storedProfile;
  const containerMode = containerEvidence !== null;
  if (containerMode && storedProfile.schemaVersion !==
      IMAGE_PROFILE_SCHEMA_VERSION) {
    throw codedError('stack_container_profile_schema_invalid');
  }
  const source = containerMode
    ? Object.freeze({
      adoptedHeadAncestor: true,
      adoptedHeadReadable: true,
      clean: true,
      compatible: true,
      controllerSourceMatch: true,
      currentMain: true,
      head: containerEvidence.buildManifest.codexMemoryCommit,
      identityMode: 'digest_pinned_read_only_image',
      manifestComplete: true,
      manifestDigest: containerEvidence.authority.buildManifestDigest,
      manifestRecognized: true,
      manifestScopeClean: true,
      manifestVersion: MANIFEST_SCHEMA_VERSION,
      repositoryMatch: true,
      upgradeEligible: false
    })
    : inspectSourceCompatibility(storedProfile);
  const transitionRequired =
    ![PROFILE_SCHEMA_VERSION, IMAGE_PROFILE_SCHEMA_VERSION]
      .includes(storedProfile.schemaVersion);
  if (
    (!transitionRequired && !source.compatible) ||
    (transitionRequired && !source.upgradeEligible)
  ) {
    throw codedError('stack_source_compatibility_failed');
  }
  if (!profileRetainedBindingMatches(profile)) {
    throw codedError('stack_retained_binding_identity_mismatch');
  }
    const governanceEnvironment = resolvePrivateReference(
      profile,
      profile.governanceEnvironment
    );
    const relayEnvironment = resolvePrivateReference(
      profile,
      profile.relayEnvironment
    );
    const environmentConfigDigests = managedEnvironmentConfigDigests(
      governanceEnvironment,
      relayEnvironment
    );
    if (profileHasRuntimeBinding(profile) &&
        (
          environmentConfigDigests.governanceEnvironmentConfigDigest !==
            profile.governanceEnvironmentConfigDigest ||
          environmentConfigDigests.relayEnvironmentConfigDigest !==
            profile.relayEnvironmentConfigDigest
        )) {
      throw codedError('stack_managed_environment_identity_mismatch');
    }
    const vcpRuntime = containerMode
      ? deriveContainerVcpRuntimeIdentity(profile, containerEvidence)
      : inspectVcpRuntimeIdentity(profile);
    const vcpProviderConfigFile = containerMode
      ? VCP_PROVIDER_RUNTIME_ENVIRONMENT_PATH
      : path.join(vcpRuntimeRepository(), 'config.env');
    const vcpProviderConfigSnapshot = containerMode
      ? readRuntimeVcpProviderEnvironmentSnapshot(vcpProviderConfigFile)
      : readVcpProviderEnvironmentSnapshot(vcpProviderConfigFile);
    const vcpProviderEnvironment =
      vcpProviderConfigSnapshot.providerEnvironment;
    if (profileHasRuntimeBinding(profile)) {
      if (!profileVcpRuntimeIdentityMatches(profile, vcpRuntime)) {
        throw codedError('stack_vcp_runtime_identity_mismatch');
      }
      if (!profileVcpProviderConfigMatches(
        profile,
        vcpProviderEnvironment
      )) {
        throw codedError('stack_vcp_provider_config_identity_mismatch');
      }
      if ([PROFILE_SCHEMA_VERSION, IMAGE_PROFILE_SCHEMA_VERSION]
        .includes(profile.schemaVersion)) {
        profile = storedProfile;
      } else {
        profile = profileWithControllerManifestBinding(
          profile,
          vcpRuntime,
          vcpProviderEnvironment,
          source,
          environmentConfigDigests
        );
      }
    } else if (legacyVcpRuntimeBootstrapMatches(profile, vcpRuntime)) {
      profile = profileWithControllerManifestBinding(
        profile,
        vcpRuntime,
        vcpProviderEnvironment,
        source,
        environmentConfigDigests
      );
    } else {
      throw codedError('stack_vcp_runtime_identity_mismatch');
    }
    const activeSource = containerMode
      ? source
      : inspectSourceCompatibility(profile);
    if (!activeSource.compatible) {
      throw codedError('stack_source_compatibility_failed');
    }
    const provider = containerMode
      ? Object.freeze({
        hostLoopbackOnly: true,
        id: containerEvidence.providerReceipt.providerContainerId,
        imageId: containerEvidence.providerReceipt.providerDaemonImageIdentity,
        reachable: true,
        recognized: true,
        revision: containerEvidence.providerReceipt.providerRevision,
        running: true
      })
      : inspectProviderContainer(profile.providerContainer);
    if (!profileProviderIdentityMatches(profile, provider)) {
      throw codedError('stack_provider_dependency_identity_mismatch');
    }
    if (!await portListening(3000)) {
      throw codedError('stack_provider_dependency_unavailable');
    }
    const edgeBefore = containerMode
      ? Object.freeze({
        configurationSecure: true,
        healthy: true,
        id: profile.edgeContainerId,
        revision: profile.runtimeBaseline,
        running: true,
        secure: true
      })
      : inspectEdgeContainer(profile.edgeContainer);
    requireProfileEdgeIdentity(profile, edgeBefore);
    const governanceChildEnvironment = buildControllerChildEnvironment(
      governanceEnvironment,
      { profile, environment }
    );
    const relayChildEnvironment = buildControllerChildEnvironment(
      relayEnvironment,
      { profile, environment }
    );
    const governanceControlSocket =
      governanceChildEnvironment.CODEX_MEMORY_R4_SESSION_CONTROL_UDS_PATH;
    const governanceDataSocket =
      governanceChildEnvironment.CODEX_MEMORY_R4_RELAY_UDS_PATH;
    const relayDataSocket =
      relayChildEnvironment.CODEX_MEMORY_R4_RELAY_UDS_PATH;
    if (!path.isAbsolute(governanceControlSocket || '')) {
      throw codedError('stack_governance_control_socket_invalid');
    }
    if (!path.isAbsolute(governanceDataSocket || '')) {
      throw codedError('stack_governance_data_socket_invalid');
    }
    if (governanceDataSocket === governanceControlSocket) {
      throw codedError('stack_governance_socket_paths_reused');
    }
    if (relayDataSocket !== governanceDataSocket) {
      throw codedError('stack_relay_data_socket_binding_mismatch');
    }
    const httpEndpoint = profileHttpEndpoint(profile);
    const httpPreflightState = inspectManagedProcess(
      'http',
      { environment, profile }
    );
    if (httpPreflightState.controllerManaged &&
        !processOwnsLoopbackTcpListener(
          httpPreflightState.pid,
          httpEndpoint.port
        )) {
      throw codedError('stack_http_listener_identity_mismatch');
    }
    if (!httpPreflightState.running &&
        await portListening(httpEndpoint.port)) {
      throw codedError('stack_unmanaged_http_listener');
    }
    const relayObserverSocket = path.join(
      runtimeDirectory(environment),
      'relay-observer.sock'
    );
    if (Object.keys(COMPONENTS).some(name => {
      const state = inspectManagedProcess(name, { environment, profile });
      return state.running && !state.controllerManaged;
    })) {
      throw codedError('stack_controlled_transition_required');
    }
    const governanceBefore = inspectManagedProcess(
      'governance',
      { environment, profile }
    );
    if (governanceBefore.running &&
        !governanceCredentialFreshnessMatches({
          governanceEnvironmentFile: governanceEnvironment,
          governancePid: governanceBefore.pid,
          profile,
          runtimeRoot: runtimeDirectory(environment)
        })) {
      throw codedError('stack_governance_credential_stale');
    }
    const relayBefore = inspectManagedProcess(
      'relay',
      { environment, profile }
    );
    if (relayBefore.running &&
        !relayCredentialFreshnessMatches({
          profile,
          relayEnvironmentFile: relayEnvironment,
          relayPid: relayBefore.pid,
          runtimeRoot: runtimeDirectory(environment)
        })) {
      throw codedError('stack_relay_credential_stale');
    }
    const started = new Set();
    try {
      const shimState = inspectManagedProcess('shim', { environment, profile });
      if (!shimState.running && await portListening(7615)) {
        throw codedError('stack_unmanaged_shim_listener');
      }
      if (!shimState.running &&
          await portListening(GOVERNED_READ_SHIM_PORT)) {
        throw codedError(
          'stack_unmanaged_governed_read_shim_listener'
        );
      }
      const shim = await spawnManaged('shim', '_run-shim', governanceEnvironment, {
        profile,
        environment
      });
      if (shim.started) started.add('shim');
      await waitFor(() => {
        const state = inspectManagedProcess('shim', { environment, profile });
        return state.controllerManaged &&
          state.pid === shim.pid &&
          processOwnsLoopbackTcpListener(state.pid, 7615) &&
          processOwnsLoopbackTcpListener(
            state.pid,
            GOVERNED_READ_SHIM_PORT
          );
      }, {
        failureCode: 'stack_shim_start_timeout'
      });
      if (!providerCredentialFreshnessMatches({
        profile,
        providerConfigIdentity: vcpProviderConfigSnapshot.fileIdentity,
        providerConfigFile: path.join(
          containerMode ? '/run/secrets' : profile.vcpRuntimeRepository,
          containerMode ? 'codex-memory-vcp-provider.env' : 'config.env'
        ),
        runtimeRoot: runtimeDirectory(environment),
        shimPid: shim.pid
      })) {
        throw codedError('stack_vcp_provider_credential_stale');
      }

      const httpState = inspectManagedProcess('http', { environment, profile });
      if (!httpState.running && await portListening(httpEndpoint.port)) {
        throw codedError('stack_unmanaged_http_listener');
      }
      const httpProcess = await spawnManaged(
        'http',
        '_run-http',
        governanceEnvironment,
        { profile, environment }
      );
      if (httpProcess.started) started.add('http');
      await waitFor(() => {
        const state = inspectManagedProcess('http', { environment, profile });
        if (!state.controllerManaged ||
            state.pid !== httpProcess.pid ||
            !processOwnsLoopbackTcpListener(
              state.pid,
              httpEndpoint.port
            )) {
          return false;
        }
        const health = lowDisclosureHttpProjection(runChildProbe(
          '_probe-http',
          governanceEnvironment,
          {
            profile,
            environment,
            expectedHttpPid: state.pid
          }
        ));
        return health.reachable && health.ok && health.authRequired &&
          health.policyAccepted;
      }, { failureCode: 'stack_http_start_timeout' });

      const governanceState = inspectManagedProcess(
        'governance',
        { environment, profile }
      );
      const shimBeforeGovernance = inspectManagedProcess(
        'shim',
        { environment, profile }
      );
      if (!shimBeforeGovernance.controllerManaged ||
          shimBeforeGovernance.pid !== shim.pid ||
          !processOwnsLoopbackTcpListener(
            shimBeforeGovernance.pid,
            7615
          ) ||
          !processOwnsLoopbackTcpListener(
            shimBeforeGovernance.pid,
            GOVERNED_READ_SHIM_PORT
          )) {
        throw codedError('stack_shim_listener_identity_mismatch');
      }
      if (!governanceState.running) {
        const preparedSockets = runChildProbe(
          '_prepare-governance-sockets',
          governanceEnvironment,
          { profile, environment }
        );
        if (preparedSockets?.accepted !== true) {
          throw codedError('stack_governance_socket_preparation_failed');
        }
      }
      const governanceProcess = await spawnManaged(
        'governance',
        '_run-governance',
        governanceEnvironment,
        { profile, environment }
      );
      if (governanceProcess.started) started.add('governance');
      await waitFor(() => {
        const state = inspectManagedProcess(
          'governance',
          { environment, profile }
        );
        if (!state.controllerManaged ||
            state.pid !== governanceProcess.pid ||
            !processOwnsUnixListener(state.pid, governanceDataSocket)) {
          return false;
        }
        const result = runOwnedUnixProbe(
          'governance',
          '_probe-governance',
          governanceEnvironment,
          governanceControlSocket,
          { profile, environment }
        );
        return lowDisclosureGovernanceProjection(result).reachable;
      }, { failureCode: 'stack_governance_start_timeout' });
      if (!governanceCredentialFreshnessMatches({
        governanceEnvironmentFile: governanceEnvironment,
        governancePid: governanceProcess.pid,
        profile,
        runtimeRoot: runtimeDirectory(environment)
      })) {
        throw codedError('stack_governance_credential_stale');
      }

      if (!containerMode && !edgeBefore.running) {
        runDocker(['start', profile.edgeContainerId]);
        started.add('edge');
      }
      if (!containerMode) await waitFor(() => {
        try {
          const edge = inspectEdgeContainer(profile.edgeContainer);
          return edge.running && edge.healthy &&
            profileEdgeIdentityMatches(profile, edge);
        } catch {
          return false;
        }
      }, {
        attempts: 80,
        intervalMs: 500,
        failureCode: 'stack_edge_start_timeout'
      });

      const relayProcess = await spawnManaged(
        'relay',
        '_run-relay',
        relayEnvironment,
        {
          profile,
          environment,
          expectedGovernancePid: governanceProcess.pid
        }
      );
      if (relayProcess.started) started.add('relay');
      await waitFor(() => {
        const state = inspectManagedProcess(
          'relay',
          { environment, profile }
        );
        if (!state.controllerManaged ||
            state.pid !== relayProcess.pid) {
          return false;
        }
        const result = runOwnedUnixProbe(
          'relay',
          '_probe-relay',
          relayEnvironment,
          relayObserverSocket,
          { profile, environment }
        );
        return lowDisclosureRelayProjection(result).reachable;
      }, { failureCode: 'stack_relay_start_timeout' });
      if (!relayCredentialFreshnessMatches({
        profile,
        relayEnvironmentFile: relayEnvironment,
        relayPid: relayProcess.pid,
        runtimeRoot: runtimeDirectory(environment)
      })) {
        throw codedError('stack_relay_credential_stale');
      }

      const result = containerMode
        ? Object.freeze({
          accepted: true,
          runtimeAccepted: true,
          configured: true,
          profileSchemaVersion: IMAGE_PROFILE_SCHEMA_VERSION,
          profileUpgradeRequired: false,
          source: Object.freeze({
            clean: true,
            compatible: true,
            controllerIdentityMatch: true,
            currentMain: true,
            identityMode: 'digest_pinned_read_only_image',
            repositoryMatch: true
          }),
          runtimeImage: Object.freeze({
            authorityDigest: containerEvidence.runtimeEvidence.authorityDigest,
            buildManifestDigest:
              containerEvidence.runtimeEvidence.buildManifestDigest,
            identityMatch: true
          }),
          secretValuesReturned: false,
          rawMemoryReturned: false
        })
        : await inspectStack({ environment, profile });
      if (!result.accepted) throw codedError('stack_final_acceptance_failed');
      if (transitionRequired) {
        return startOutcomeWithEvidence(
          Object.freeze({
            ...result,
            accepted: false,
            runtimeAccepted: false,
            transitionRuntimeAccepted: true,
            profileUpgradeRequired: true,
            action: started.size === 0
              ? 'profile_upgrade_required'
              : 'started_profile_upgrade_required',
            failClosedRollbackRequired: false
          }),
          started
        );
      }
      return startOutcomeWithEvidence(
        Object.freeze({
          ...result,
          action: started.size === 0 ? 'already_running' : 'started',
          failClosedRollbackRequired: false
        }),
        started
      );
    } catch (error) {
      const rollbackFailures = await rollbackStarted(started, profile, environment);
      if (rollbackFailures.length > 0) {
        throw codedError('stack_fail_closed_rollback_incomplete');
      }
      throw error;
    }
}

async function startStack({
  environment = process.env
} = {}) {
  const lifecycle = acquireLifecycleProfile({ environment });
  try {
    const startRecord = await startStackWithProfile(
      lifecycle.profile,
      { environment }
    );
    return startRecord.outcome;
  } finally {
    lifecycle.release();
  }
}

async function stopStack({
  environment = process.env
} = {}) {
  const lifecycle = acquireLifecycleProfile({ environment });
  const profile = lifecycle.profile;
  try {
    if (!profileRetainedBindingMatches(profile)) {
      throw codedError('stack_retained_binding_identity_mismatch');
    }
    const edge = inspectEdgeContainer(profile.edgeContainer);
    requireProfileEdgeIdentity(profile, edge);
    const stopped = [];
    for (const name of ['relay', 'governance', 'http', 'shim']) {
      if (await stopManaged(name, { environment, profile })) stopped.push(name);
    }
    if (edge.running) {
      requireProfileEdgeIdentity(
        profile,
        inspectEdgeContainer(profile.edgeContainerId)
      );
      runDocker(['stop', '--time', '10', profile.edgeContainerId]);
      stopped.push('edge');
    }
    return Object.freeze({
      accepted: true,
      action: stopped.length === 0 ? 'already_stopped' : 'stopped',
      stoppedComponents: stopped,
      containerRemoved: false,
      autostartInstalled: false,
      secretValuesReturned: false,
      rawMemoryReturned: false
    });
  } finally {
    lifecycle.release();
  }
}

async function adoptRunningStack({
  environment = process.env,
  replace = false
} = {}) {
  ensureRuntimeDirectories(environment);
  const lifecycleLock = acquireOwnerLock(lifecycleLockPath(environment));
  try {
    const identities = Object.fromEntries(
      Object.keys(COMPONENTS).map(name => [
        name,
        inspectProcessIdentity(name, { environment })
      ])
    );
    if (Object.values(identities).some(value =>
      !value.running || !value.identity
    )) {
      throw codedError('stack_adoption_processes_unavailable');
    }
    const governanceFile = assertOwnerOnlyFile(
      extractEnvFileArgument(identities.governance.identity.command)
    );
    const relayFile = assertOwnerOnlyFile(
      extractEnvFileArgument(identities.relay.identity.command)
    );
    const privateRoot = discoverPrivateRoot(
      [governanceFile, relayFile],
      { environment }
    );
    const environmentConfigDigests = managedEnvironmentConfigDigests(
      governanceFile,
      relayFile
    );
    const relative = file => {
      const value = path.relative(privateRoot, file);
      if (!value || value.startsWith('..') || path.isAbsolute(value)) {
        throw codedError('stack_adoption_environment_outside_private_root');
      }
      return assertRelativeReference(value);
    };
    const retainedBinding = assertRelativeReference(
      path.join('r5m-exact-head', 'private-binding.json')
    );
    const retainedBindingFile = assertOwnerOnlyFile(
      path.resolve(privateRoot, retainedBinding)
    );
    const retainedBindingPayload = readRetainedBindingFile(retainedBindingFile);
    const retainedBindingSource = retainedBindingPayload?.sourceCommit;
    validateRetainedBindingPayload(
      retainedBindingPayload,
      retainedBindingSource
    );
    const provider = inspectProviderContainer(PROVIDER_CONTAINER_DEFAULT);
    if (!provider.recognized || !provider.running ||
        !await portListening(3000)) {
      throw codedError('stack_adoption_provider_invalid');
    }
    const edge = inspectEdgeContainer(EDGE_CONTAINER_DEFAULT);
    if (!edge.secure || !edge.running || !edge.healthy) {
      throw codedError('stack_adoption_edge_invalid');
    }
    const runtimeRepository = deriveRuntimeRepositoryFromHttpIdentity(
      identities.http.identity
    );
    assertAdoptionRepositoryMatch(runtimeRepository);
    const controllerManifest = inspectControllerSourceManifest({
      repoRoot: runtimeRepository
    });
    const adoptedRepositoryHead = gitText(
      ['rev-parse', 'HEAD^{commit}'],
      { repoRoot: runtimeRepository }
    );
    const controllerSource = inspectSourceCompatibility({
      schemaVersion: PROFILE_SCHEMA_VERSION,
      runtimeBaseline: edge.revision,
      runtimeRepository,
      adoptedRepositoryHead,
      controllerSourceManifestDigest:
        controllerManifest.manifestDigest,
      controllerSourceManifestVersion:
        controllerManifest.manifestVersion
    });
    if (!adoptionSourceCompatible(controllerSource)) {
      throw codedError('stack_adoption_source_incompatible');
    }
    const vcpBootstrapProfile = {
      schemaVersion: LEGACY_PROFILE_SCHEMA_VERSION,
      runtimeBaseline: edge.revision
    };
    const vcpRuntime = inspectVcpRuntimeIdentity(vcpBootstrapProfile);
    if (!legacyVcpRuntimeBootstrapMatches(
      vcpBootstrapProfile,
      vcpRuntime
    )) {
      throw codedError('stack_adoption_vcp_runtime_identity_unproven');
    }
    const vcpProviderConfigSnapshot = readVcpProviderEnvironmentSnapshot(
      path.join(vcpRuntimeRepository(), 'config.env')
    );
    const vcpProviderEnvironment =
      vcpProviderConfigSnapshot.providerEnvironment;
    const profile = validateProfile({
      schemaVersion: PROFILE_SCHEMA_VERSION,
      adoptedRepositoryHead,
      controllerSourceManifestDigest:
        controllerManifest.manifestDigest,
      controllerSourceManifestVersion:
        controllerManifest.manifestVersion,
      governanceEnvironmentConfigDigest:
        environmentConfigDigests.governanceEnvironmentConfigDigest,
      relayEnvironmentConfigDigest:
        environmentConfigDigests.relayEnvironmentConfigDigest,
      runtimeBaseline: edge.revision,
      runtimeRepository,
      privateRoot,
      providerContainer: PROVIDER_CONTAINER_DEFAULT,
      providerContainerId: provider.id,
      providerImageId: provider.imageId,
      providerRevision: provider.revision,
      governanceEnvironment: relative(governanceFile),
      relayEnvironment: relative(relayFile),
      retainedBinding,
      retainedBindingSource,
      edgeContainerId: edge.id,
      edgeContainer: EDGE_CONTAINER_DEFAULT,
      vcpProviderConfigDigest:
        vcpProviderConfigDigest(vcpProviderEnvironment),
      vcpRuntimeBaseline: vcpRuntime.revision,
      vcpRuntimeContractDigest: vcpRuntime.contractDigest,
      vcpRuntimeIdentitySchemaVersion: VCP_RUNTIME_IDENTITY_SCHEMA_VERSION,
      vcpRuntimeRepository: vcpRuntime.repository,
      vcpRuntimeScopeDigest: vcpRuntime.scopeDigest
    });
    if (!profileVcpRuntimeIdentityMatches(profile, vcpRuntime)) {
      throw codedError('stack_adoption_vcp_runtime_identity_unproven');
    }
    if (!profileVcpProviderConfigMatches(
      profile,
      vcpProviderEnvironment
    )) {
      throw codedError('stack_adoption_vcp_provider_config_unproven');
    }
    for (const name of Object.keys(COMPONENTS)) {
      const managedState = inspectManagedProcess(
        name,
        { profile, environment }
      );
      if (managedState.pid !== identities[name].pid ||
          !managedState.controllerManaged) {
        throw codedError(
          name === 'http'
            ? 'stack_adoption_http_storage_binding_unproven'
            : 'stack_adoption_controller_binding_unproven'
        );
      }
    }
    const source = inspectSourceCompatibility(profile);
    if (!adoptionSourceCompatible(source)) {
      throw codedError('stack_adoption_source_incompatible');
    }
    const runtimeSource = inspectSourceCompatibility(profile, {
      repoRoot: runtimeRepository
    });
    if (!runtimeSource.compatible) {
      throw codedError('stack_adoption_runtime_repository_incompatible');
    }
    const inspection = await inspectStack({ environment, profile });
    if (!inspection.accepted) {
      throw codedError('stack_adoption_runtime_acceptance_failed');
    }
    writeProfile(profile, { environment, replace });
    return Object.freeze({
      accepted: true,
      action: 'adopted',
      profileStored: true,
      ownerOnlyProfile: true,
      runtimeBaseline: profile.runtimeBaseline,
      secretValuesStored: false,
      secretValuesReturned: false,
      rawMemoryReturned: false
    });
  } finally {
    lifecycleLock.release();
  }
}

function assertSourceManifestRebindStopped(
  profile,
  processIdentities,
  edge
) {
  const componentNames = Object.keys(COMPONENTS);
  if (profile?.schemaVersion !== PROFILE_SCHEMA_VERSION ||
      !processIdentities ||
      !exactKeys(processIdentities, componentNames) ||
      componentNames.some(name =>
        typeof processIdentities[name]?.running !== 'boolean'
      ) ||
      componentNames.some(name => processIdentities[name].running) ||
      !profileEdgeLifecycleIdentityMatches(profile, edge) ||
      edge?.running !== false) {
    throw codedError('stack_source_manifest_rebind_stack_not_stopped');
  }
  return true;
}

function inspectStoppedStateForOwnerProfileTransition(profile, {
  environment = process.env,
  fsModule = fs,
  inspectEdge = name => inspectEdgeContainer(name),
  readPidFileState = name =>
    inspectPidFile(componentPaths(name, environment).pid, fsModule),
  scanProcesses = scanManagedProcesses,
  controllerPid = process.pid
} = {}) {
  const componentNames = Object.keys(COMPONENTS);
  if (profile?.schemaVersion !== PROFILE_SCHEMA_VERSION ||
      typeof profile.runtimeRepository !== 'string') {
    throw codedError('stopped_profile_transition_schema_unsupported');
  }
  const pidFiles = Object.fromEntries(componentNames.map(name => {
    let state;
    try {
      state = readPidFileState(name);
    } catch {
      throw codedError('stack_process_pid_file_invalid');
    }
    if (!state || state.valid !== true) {
      throw codedError('stack_process_pid_file_invalid');
    }
    return [name, state];
  }));
  const knownPidsByComponent = Object.fromEntries(componentNames.map(name => [
    name,
    pidFiles[name].pid
  ]));
  let scan;
  try {
    scan = scanProcesses({
      runtimeRepository: profile.runtimeRepository,
      controllerPid,
      knownPidsByComponent,
      classifyCommandShape: command =>
        classifyManagedCommandShape(command, { profile, environment }),
      exactComponentMatcher: (command, { canonicalNode, evidence }) => {
        if (canonicalNode?.status !== EVIDENCE_STATUS.RESOLVED ||
            evidence?.executable?.status !== EVIDENCE_STATUS.READABLE ||
            evidence?.cwd?.status !== EVIDENCE_STATUS.READABLE) {
          return null;
        }
        const matches = componentNames.filter(name =>
          commandMatchesComponent(name, command, {
            executable: evidence.executable.path,
            cwd: evidence.cwd.path,
            profile,
            environment,
            fsModule,
            canonicalNodePath: canonicalNode.path
          })
        );
        if (matches.length > 1) {
          throw codedError('stack_process_identity_ambiguous');
        }
        return matches[0] || null;
      }
    });
  } catch {
    throw codedError('stack_process_identity_unavailable');
  }
  if (!scan || typeof scan !== 'object' ||
      !Object.values(DECISIONS).includes(scan.decision) ||
      !Array.isArray(scan.componentMatches)) {
    throw codedError('stack_process_identity_unavailable');
  }
  if (scan.decision === DECISIONS.FAIL_CLOSED) {
    if (scan.reason === 'PROCESS_ENUMERATION_UNAVAILABLE') {
      throw codedError('stack_process_enumeration_unavailable');
    }
    if (scan.reason === 'START_IDENTITY_UNAVAILABLE') {
      throw codedError('stack_process_start_identity_unavailable');
    }
    if (scan.reason === 'KNOWN_PID_RUNNING') {
      throw codedError('stack_process_running');
    }
    throw codedError('stack_process_identity_unavailable');
  }
  const byComponent = Object.fromEntries(componentNames.map(name => [
    name,
    scan.componentMatches.filter(match => match.component === name)
  ]));
  const orphanInspection = Object.fromEntries(componentNames.map(name => {
    const matches = byComponent[name];
    const knownPid = pidFiles[name].pid;
    return [name, Object.freeze({
      orphanDetected: matches.some(match => match.pid !== knownPid),
      matchingPidCount: matches.length,
      knownPidPresent: knownPid !== null &&
        matches.some(match => match.pid === knownPid)
    })];
  }));
  if (scan.decision === DECISIONS.EXACT) {
    if (Object.values(orphanInspection).some(state =>
      state.matchingPidCount > 1 || state.orphanDetected
    )) {
      throw codedError('stack_managed_orphan_process');
    }
    throw codedError('stack_process_running');
  }
  const processIdentities = Object.freeze(Object.fromEntries(
    componentNames.map(name => [name, Object.freeze({
      pid: pidFiles[name].pid,
      running: false
    })])
  ));
  const edge = inspectEdge(profile.edgeContainer);
  assertSourceManifestRebindStopped(profile, processIdentities, edge);
  return Object.freeze({
    processIdentities,
    edge,
    orphanInspection: Object.freeze(orphanInspection),
    processDecision: scan.decision,
    canonicalNodeStatus: scan.canonicalNodeStatus,
    inspectionComplete: true
  });
}

function coordinateStoppedOwnerProfileTransition({
  candidateBinding,
  environment = process.env
} = {}) {
  const {
    canonicalProfileFingerprint,
    commitOwnerProfileTransaction
  } = require('./codex-memory-owner-profile-transaction');
  const {
    coordinateStoppedOwnerProfileTransition: coordinate
  } = require('./codex-memory-stopped-profile-transition');
  return coordinate({
    candidateBinding,
    profilePath: profilePath(environment),
    manifestSchemaVersion: MANIFEST_SCHEMA_VERSION,
    acquireLifecycleProfile: () => acquireLifecycleProfile({ environment }),
    inspectSourceCompatibility: profile => inspectSourceCompatibility(profile, {
      repoRoot: profile.runtimeRepository
    }),
    inspectStoppedState: profile =>
      inspectStoppedStateForOwnerProfileTransition(profile, { environment }),
    validateProfile,
    canonicalProfileFingerprint,
    commitOwnerProfileTransaction
  });
}

async function coordinateSourceManifestRebind({
  candidateProfile,
  persistCandidate,
  rollbackCandidate,
  startCandidate
}) {
  if (typeof persistCandidate !== 'function' ||
      typeof rollbackCandidate !== 'function' ||
      typeof startCandidate !== 'function') {
    throw codedError('stack_source_manifest_rebind_contract_invalid');
  }
  let validatedCandidate;
  try {
    validatedCandidate = validateProfile(candidateProfile);
  } catch {
    throw codedError('stack_source_manifest_rebind_contract_invalid');
  }
  const startRecord = await startCandidate(validatedCandidate);
  const allowedStartedComponents = new Set([
    ...Object.keys(COMPONENTS),
    'edge'
  ]);
  if (!exactKeys(startRecord, ['outcome', 'startedComponents']) ||
      !startRecord.outcome ||
      typeof startRecord.outcome !== 'object' ||
      Array.isArray(startRecord.outcome) ||
      !Array.isArray(startRecord.startedComponents) ||
      new Set(startRecord.startedComponents).size !==
        startRecord.startedComponents.length ||
      startRecord.startedComponents.some(name =>
        typeof name !== 'string' ||
        !allowedStartedComponents.has(name)
      )) {
    throw codedError('stack_source_manifest_rebind_contract_invalid');
  }
  const outcome = startRecord.outcome;
  const startedComponents = Object.freeze([
    ...startRecord.startedComponents
  ]);
  const rollback = async () => {
    try {
      const failures = await rollbackCandidate(
        validatedCandidate,
        startedComponents
      );
      return Array.isArray(failures) && failures.length === 0;
    } catch {
      return false;
    }
  };
  if (outcome.accepted !== true ||
      outcome.runtimeAccepted !== true ||
      outcome.action !== 'started' ||
      startedComponents.length === 0 ||
      outcome.profileSchemaVersion !== PROFILE_SCHEMA_VERSION ||
      outcome.source?.controllerIdentityMatch !== true ||
      outcome.source?.compatible !== true) {
    if (startedComponents.length > 0 && !await rollback()) {
      throw codedError('stack_source_manifest_rebind_rollback_incomplete');
    }
    throw codedError('stack_source_manifest_rebind_runtime_rejected');
  }
  try {
    await persistCandidate(validatedCandidate);
  } catch {
    if (!await rollback()) {
      throw codedError('stack_source_manifest_rebind_rollback_incomplete');
    }
    throw codedError('stack_source_manifest_rebind_profile_commit_failed');
  }
  return Object.freeze({
    ...outcome,
    action: 'source_manifest_rebound',
    profileStored: true,
    sourceManifestRebound: true,
    failClosedRollbackRequired: false
  });
}

async function rebindSourceManifestStack({
  environment = process.env
} = {}) {
  const lifecycle = acquireLifecycleProfile({ environment });
  try {
    const storedProfile = lifecycle.profile;
    const source = inspectSourceCompatibility(storedProfile);
    const candidateProfile = profileWithSourceManifestRebinding(
      storedProfile,
      source
    );
    const processIdentities = Object.fromEntries(
      Object.keys(COMPONENTS).map(name => [
        name,
        inspectProcessIdentity(name, { environment })
      ])
    );
    const edge = inspectEdgeContainer(storedProfile.edgeContainer);
    assertSourceManifestRebindStopped(
      storedProfile,
      processIdentities,
      edge
    );
    return await coordinateSourceManifestRebind({
      candidateProfile,
      startCandidate: () => startStackWithProfile(
        candidateProfile,
        { environment }
      ),
      persistCandidate: async () => {
        const finalSource = inspectSourceCompatibility(candidateProfile);
        if (!adoptionSourceCompatible(finalSource)) {
          throw codedError(
            'stack_source_manifest_rebind_source_changed'
          );
        }
        const finalInspection = await inspectStack({
          environment,
          profile: candidateProfile
        });
        if (!finalInspection.accepted ||
            !finalInspection.runtimeAccepted) {
          throw codedError(
            'stack_source_manifest_rebind_runtime_changed'
          );
        }
        return writeProfile(
          candidateProfile,
          { environment, replace: true }
        );
      },
      rollbackCandidate: (_profile, startedComponents) => rollbackStarted(
        new Set(startedComponents),
        candidateProfile,
        environment
      )
    });
  } finally {
    lifecycle.release();
  }
}

function readPrivateText(reference, privateRoot, maximumBytes = 16_384) {
  const { readPrivateReference } = require(
    '../src/runtime/chatgpt-r4/governance-runtime-authority'
  );
  const value = readPrivateReference(reference, {
    privateRoot,
    readFileSync: fs.readFileSync,
    statSync: fs.statSync,
    realpathSync: fs.realpathSync
  });
  if (Buffer.byteLength(value, 'utf8') > maximumBytes) {
    throw codedError('stack_private_reference_too_large');
  }
  return value;
}

function childBaseEnvironment() {
  return { PATH: SAFE_CHILD_PATH };
}

function buildShimChildEnvironment(environment, {
  token,
  runtimeRoot,
  vcpRoot,
  mappingPath,
  providerEnvironment,
  runtimeBindingDigest,
  providerConfigPath = path.join(vcpRoot, 'config.env')
}) {
  if (!providerEnvironment || typeof providerEnvironment.apiKey !== 'string' ||
      typeof providerEnvironment.model !== 'string' ||
      typeof providerEnvironment.dimension !== 'string' ||
      !SAFE_SHA256_DIGEST.test(runtimeBindingDigest || '')) {
    throw codedError('stack_vcp_provider_environment_invalid');
  }
  return {
    ...childBaseEnvironment(environment),
    SHIM_HOST: '127.0.0.1',
    SHIM_PORT: '7615',
    WSL_NEWAPI_HOST: '127.0.0.1',
    VCP_ROOT: vcpRoot,
    VCPTOOLBOX_ROOT: vcpRoot,
    VCP_CONFIG_ENV: providerConfigPath,
    API_Key: providerEnvironment.apiKey,
    API_URL: 'http://127.0.0.1:3000',
    WhitelistEmbeddingModel: providerEnvironment.model,
    VECTORDB_DIMENSION: providerEnvironment.dimension,
    KB_ROOT: '',
    KNOWLEDGEBASE_ROOT_PATH: '',
    KB_STORE: path.join(runtimeRoot, 'store'),
    KNOWLEDGEBASE_STORE_PATH: path.join(runtimeRoot, 'store'),
    CODEX_MEMORY_DIARY_SCOPE_MAPPING_PATH: mappingPath,
    CODEX_MEMORY_VCP_NATIVE_HTTP_TOKEN: token,
    CODEX_MEMORY_GOVERNED_READ_SHIM_PORT:
      String(GOVERNED_READ_SHIM_PORT),
    CODEX_MEMORY_GOVERNED_READ_LEASE_ROOT:
      path.join(runtimeRoot, 'governed-read-leases'),
    CODEX_MEMORY_GOVERNED_READ_RUNTIME_BINDING_DIGEST:
      runtimeBindingDigest,
    CODEX_MEMORY_DERIVED_RUNTIME_MUTATION_POLICY:
      'isolated_derived_runtime_mutation_v1',
    ENABLE_REAL_ROOT_WRITE: '0'
  };
}

function validateManagedHttpTrustedScope(environment) {
  const trustedScope = Object.fromEntries(
    Object.entries(HTTP_TRUSTED_SCOPE_MANAGED_ENVIRONMENT_NAMES).map(
      ([fieldName, environmentName]) => [
        fieldName,
        typeof environment?.[environmentName] === 'string'
          ? environment[environmentName].trim()
          : ''
      ]
    )
  );
  const identifierFields = ['projectId', 'workspaceId', 'scopeId'];
  if (!identifierFields.some(fieldName => trustedScope[fieldName])) {
    throw codedError('stack_http_trusted_scope_identifier_missing');
  }
  for (const fieldName of identifierFields) {
    if (trustedScope[fieldName] && !isSafeReferenceName(trustedScope[fieldName])) {
      throw codedError('stack_http_trusted_scope_reference_invalid');
    }
  }
  if (!isSafeReferenceName(trustedScope.clientId) ||
      canonicalGovernedNativeClient(trustedScope.clientId) === null) {
    throw codedError('stack_http_trusted_scope_client_invalid');
  }
  const visibility = canonicalMemoryVisibility(trustedScope.visibility);
  if (visibility === null) {
    throw codedError('stack_http_trusted_scope_visibility_invalid');
  }
  return Object.freeze({
    ...trustedScope,
    visibility
  });
}

function projectManagedHttpTrustedScope(environment) {
  const trustedScope = validateManagedHttpTrustedScope(environment);
  return Object.freeze(Object.fromEntries(
    Object.entries(HTTP_TRUSTED_SCOPE_CHILD_ENVIRONMENT_NAMES)
      .filter(([fieldName]) => trustedScope[fieldName])
      .map(([fieldName, environmentName]) => [
        environmentName,
        trustedScope[fieldName]
      ])
  ));
}

function buildHttpChildEnvironment(environment, {
  token,
  runtimeRoot,
  profileSchemaVersion = PROFILE_SCHEMA_VERSION
}) {
  const httpEndpoint = profileHttpEndpoint({
    schemaVersion: profileSchemaVersion
  });
  const isolatedDiaryRoot = path.join(runtimeRoot, 'data', 'no-primary-memory');
  return {
    ...childBaseEnvironment(environment),
    ...projectManagedHttpTrustedScope(environment),
    CODEX_MEMORY_HTTP_HOST: httpEndpoint.host,
    CODEX_MEMORY_HTTP_PORT: String(httpEndpoint.port),
    CODEX_MEMORY_HTTP_PATH: httpEndpoint.path,
    CODEX_MEMORY_HTTP_TOKEN: token,
    CODEX_MEMORY_BASE_PATH: runtimeRoot,
    CODEX_MEMORY_DATA_DIR: path.join(runtimeRoot, 'data'),
    CODEX_MEMORY_LOGS_DIR: path.join(runtimeRoot, 'logs'),
    CODEX_MEMORY_DIARY_PATH: isolatedDiaryRoot,
    CODEX_MEMORY_ACTIVE_MEMORY_ROOT: '',
    CODEX_MEMORY_VCHAT_DATA_ROOT: '',
    CODEX_MEMORY_SECURITY_PROFILE: 'hardened',
    CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER:
      VCP_RUNTIME_CONTRACT_PROJECTION.providerPolicy ===
        'governed_embedding_child_only'
        ? 'false'
        : 'true',
    CODEX_MEMORY_ENABLE_SOFT_READ_POLICY: 'true',
    CODEX_MEMORY_ENABLE_LIFECYCLE_READ_POLICY: 'true',
    CODEX_MEMORY_ENABLE_WRITE_PREFLIGHT: 'true',
    CODEX_MEMORY_ENABLE_CANDIDATE_CACHE: 'false',
    CODEX_MEMORY_ENABLE_SHADOW_WRITES: 'false',
    CODEX_MEMORY_ENABLE_VECTOR_INDEX: 'false',
    CODEX_MEMORY_AUTO_REBUILD: 'false',
    CODEX_MEMORY_AUTO_REBUILD_ACTIVE_MEMORY: 'false',
    CODEX_MEMORY_RECORD_MEMORY_AUTH_MODE: 'off',
    CODEX_MEMORY_MCP_PUBLIC_TOOL_SURFACE: 'read_only',
    CODEX_MEMORY_MCP_PUBLIC_TOOLS: '',
    CODEX_MEMORY_EXPOSE_CONTROLLED_MUTATION_TOOLS: 'false',
    CODEX_MEMORY_EXPOSE_WRITE_TOOLS:
      VCP_RUNTIME_CONTRACT_PROJECTION.memoryWritePolicy === 'disabled'
        ? 'false'
        : 'true',
    CODEX_MEMORY_VCP_NATIVE_RUNTIME_PROFILE: 'wsl-newapi-prod',
    CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_ENDPOINT:
      'http://127.0.0.1:7615/mcp/vcp-native',
    CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_TOKEN: token,
    CODEX_MEMORY_GOVERNED_MCP_VCP_NATIVE_BRIDGE_GATE_MODE: 'strict',
    CODEX_MEMORY_GOVERNED_MCP_VCP_NATIVE_READ_DELEGATION_MODE:
      VCP_RUNTIME_CONTRACT_PROJECTION.memoryReadPolicy ===
        'project_scoped_allowlisted_diaries'
        ? 'primary'
        : 'off',
    CODEX_MEMORY_GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATION_MODE:
      VCP_RUNTIME_CONTRACT_PROJECTION.memoryWritePolicy === 'disabled'
        ? 'off'
        : 'primary',
    CODEX_MEMORY_EXPECTED_DIARY_SCOPE_MAPPING_REFERENCE:
      environment.CODEX_MEMORY_R4_EXPECTED_MAPPING_REFERENCE || '',
    CODEX_MEMORY_EXPECTED_DIARY_SCOPE_MAPPING_DIGEST:
      environment.CODEX_MEMORY_R4_EXPECTED_MAPPING_DIGEST || ''
  };
}

function validateExpectedMappingEnvironment(environment) {
  const reference = environment.CODEX_MEMORY_R4_EXPECTED_MAPPING_REFERENCE;
  const digest = environment.CODEX_MEMORY_R4_EXPECTED_MAPPING_DIGEST;
  if (reference !== 'jenn-vcp-diary-scope-v1' ||
      !/^sha256:[a-f0-9]{64}$/u.test(digest || '') ||
      /^(.)\1+$/u.test(String(digest).slice(7))) {
    throw codedError('stack_expected_mapping_binding_invalid');
  }
  return true;
}

function singleLineSecret(value) {
  const normalized = value.endsWith('\n') ? value.slice(0, -1) : value;
  if (!normalized || normalized.includes('\r') || normalized.includes('\n') ||
      normalized.trim() !== normalized) {
    throw codedError('stack_secret_reference_invalid');
  }
  return normalized;
}

function childPrivateRoot() {
  return assertOwnerOnlyDirectory(process.env.CODEX_MEMORY_STACK_PRIVATE_ROOT || '');
}

function governanceSocketRootForSchema(schemaVersion, {
  privateRoot,
  runtimeRoot
} = {}) {
  return schemaVersion === IMAGE_PROFILE_SCHEMA_VERSION
    ? runtimeRoot
    : privateRoot;
}

function assertChildMode() {
  if (process.env.CODEX_MEMORY_STACK_CHILD !== '1') {
    throw codedError('stack_child_mode_not_authorized');
  }
  process.umask(0o077);
}

function childControllerProfileFields() {
  const schemaVersion = Number(
    process.env.CODEX_MEMORY_STACK_PROFILE_SCHEMA_VERSION
  );
  const controllerSourceManifestVersion = Number(
    process.env.CODEX_MEMORY_STACK_CONTROLLER_SOURCE_MANIFEST_VERSION
  );
  const controllerSourceManifestDigest =
    process.env.CODEX_MEMORY_STACK_CONTROLLER_SOURCE_MANIFEST_DIGEST;
  const adoptedRepositoryHead = schemaVersion === IMAGE_PROFILE_SCHEMA_VERSION
    ? process.env.CODEX_MEMORY_STACK_ADOPTED_REPOSITORY_HEAD
    : null;
  const runtimeBaseline = schemaVersion === IMAGE_PROFILE_SCHEMA_VERSION
    ? process.env.CODEX_MEMORY_STACK_RUNTIME_BASELINE
    : null;
  const runtimeBuildManifestDigest =
    schemaVersion === IMAGE_PROFILE_SCHEMA_VERSION
      ? process.env.CODEX_MEMORY_RUNTIME_BUILD_MANIFEST_DIGEST
      : null;
  if (![PROFILE_SCHEMA_VERSION, IMAGE_PROFILE_SCHEMA_VERSION]
      .includes(schemaVersion) ||
      controllerSourceManifestVersion !== MANIFEST_SCHEMA_VERSION ||
      !SAFE_SHA256_DIGEST.test(controllerSourceManifestDigest || '') ||
      (schemaVersion === IMAGE_PROFILE_SCHEMA_VERSION &&
        (!SAFE_GIT_OBJECT.test(adoptedRepositoryHead || '') ||
          !SAFE_GIT_OBJECT.test(runtimeBaseline || '') ||
          !SAFE_SHA256_DIGEST.test(runtimeBuildManifestDigest || '')))) {
    throw codedError('stack_child_controller_identity_invalid');
  }
  return Object.freeze({
    adoptedRepositoryHead: schemaVersion === IMAGE_PROFILE_SCHEMA_VERSION
      ? adoptedRepositoryHead
      : gitText(['rev-parse', 'HEAD^{commit}']),
    controllerSourceManifestDigest,
    controllerSourceManifestVersion,
    ...(schemaVersion === IMAGE_PROFILE_SCHEMA_VERSION
      ? { runtimeBaseline, runtimeBuildManifestDigest }
      : {}),
    schemaVersion
  });
}

function managedShimArguments({ vcpRoot, runtimeRoot } = {}) {
  if (typeof vcpRoot !== 'string' ||
      !path.isAbsolute(vcpRoot) ||
      typeof runtimeRoot !== 'string' ||
      !path.isAbsolute(runtimeRoot)) {
    throw codedError('stack_shim_runtime_paths_invalid');
  }
  return Object.freeze([
    '--host',
    '127.0.0.1',
    '--port',
    '7615',
    '--vcp-root',
    vcpRoot,
    '--kb-root',
    path.join(vcpRoot, 'dailynote'),
    '--kb-store',
    path.join(runtimeRoot, 'store'),
    '--source-kb-store',
    path.join(vcpRoot, 'VectorStore'),
    '--selected-diary-hydration',
    '--governed-read-attempts',
    '--governed-read-port',
    String(GOVERNED_READ_SHIM_PORT),
    '--governed-read-lease-root',
    path.join(runtimeRoot, 'governed-read-leases')
  ]);
}

async function runShimChild() {
  assertChildMode();
  const imageMode = process.env.CODEX_MEMORY_CONTAINER_SUPERVISOR === '1';
  const profile = {
    ...childControllerProfileFields(),
    runtimeRepository: REPO_ROOT,
    runtimeBaseline: process.env.CODEX_MEMORY_STACK_RUNTIME_BASELINE,
    ...childVcpRuntimeProfileFields(process.env)
  };
  if (!imageMode) {
    const source = inspectSourceCompatibility(profile);
    if (!source.compatible) {
      throw codedError('stack_source_compatibility_failed');
    }
    const vcpRuntime = inspectVcpRuntimeIdentity(profile);
    if (!profileVcpRuntimeIdentityMatches(profile, vcpRuntime)) {
      throw codedError('stack_vcp_runtime_identity_mismatch');
    }
  } else if (profile.schemaVersion !== IMAGE_PROFILE_SCHEMA_VERSION ||
      profileVcpRuntimeIdentityMode(profile) !== 'image_authority_v1' ||
      profile.vcpRuntimeRepository !== IMAGE_VCP_ROOT ||
      profile.runtimeRepository !== REPO_ROOT) {
    throw codedError('stack_container_runtime_identity_mismatch');
  }
  const privateRoot = childPrivateRoot();
  const runtimeRoot = assertOwnerOnlyDirectory(
    process.env.CODEX_MEMORY_STACK_RUNTIME_DIR || ''
  );
  const mappingPath = privateReferencePath(
    process.env.CODEX_MEMORY_R4_DIARY_SCOPE_MAPPING_REFERENCE,
    privateRoot
  );
  const vcpRoot = vcpRuntimeRepository();
  const providerConfigFile = imageMode
    ? VCP_PROVIDER_RUNTIME_ENVIRONMENT_PATH
    : path.join(vcpRoot, 'config.env');
  const providerConfigSnapshot = imageMode
    ? readRuntimeVcpProviderEnvironmentSnapshot(providerConfigFile)
    : readVcpProviderEnvironmentSnapshot(providerConfigFile);
  const providerEnvironment = providerConfigSnapshot.providerEnvironment;
  if (!profileVcpProviderConfigMatches(profile, providerEnvironment)) {
    throw codedError('stack_vcp_provider_config_identity_mismatch');
  }
  const token = singleLineSecret(readPrivateText(
    process.env.CODEX_MEMORY_R4_NATIVE_HTTP_TOKEN_REFERENCE,
    privateRoot
  ));
  assertOwnerOnlyDirectory(
    path.join(runtimeRoot, 'governed-read-leases'),
    { create: true }
  );
  const shimEnvironment = buildShimChildEnvironment(process.env, {
    token,
    runtimeRoot,
    vcpRoot,
    mappingPath,
    providerEnvironment,
    providerConfigPath: imageMode
      ? '/run/secrets/codex-memory-vcp-provider.env'
      : path.join(vcpRoot, 'config.env'),
    runtimeBindingDigest:
      process.env.CODEX_MEMORY_R4_GOVERNANCE_BINDING_DIGEST
  });
  writeProviderConfigIdentityReceipt({
    ...profileControllerIdentityReceipt(profile),
    providerConfigIdentity: providerConfigSnapshot.fileIdentity,
    shimPid: process.pid,
    shimProcessStartTicks: readLinuxProcessStartTicks(process.pid)
  }, runtimeRoot);
  for (const name of Object.keys(process.env)) delete process.env[name];
  Object.assign(process.env, shimEnvironment);
  const { main: runShim } = require(
    '../src/cli/vcp-toolbox-native-mcp-shim'
  );
  await runShim(managedShimArguments({ vcpRoot, runtimeRoot }), process.env);
}

function runHttpChild() {
  assertChildMode();
  const privateRoot = childPrivateRoot();
  const token = singleLineSecret(readPrivateText(
    process.env.CODEX_MEMORY_R4_NATIVE_HTTP_TOKEN_REFERENCE,
    privateRoot
  ));
  const runtimeRoot = assertOwnerOnlyDirectory(
    process.env.CODEX_MEMORY_STACK_RUNTIME_DIR || ''
  );
  const isolatedDiaryRoot = path.join(runtimeRoot, 'data', 'no-primary-memory');
  assertOwnerOnlyDirectory(isolatedDiaryRoot, { create: true });
  const loadedEnvironment = { ...process.env };
  validateExpectedMappingEnvironment(loadedEnvironment);
  const safeEnvironment = buildHttpChildEnvironment(loadedEnvironment, {
    token,
    runtimeRoot,
    profileSchemaVersion: childProfileSchemaVersion(loadedEnvironment)
  });
  for (const name of Object.keys(process.env)) delete process.env[name];
  Object.assign(process.env, safeEnvironment);
  require('../src/http-index.js');
}

function validateRetainedBinding(privateRoot) {
  const file = process.env.CODEX_MEMORY_STACK_RETAINED_BINDING_FILE;
  const target = privateReferencePath(`file:${file}`, privateRoot);
  const binding = readRetainedBindingFile(target);
  return validateRetainedBindingPayload(
    binding,
    process.env.CODEX_MEMORY_STACK_RETAINED_BINDING_SOURCE
  );
}

function requireShimListenerForGovernanceChild(privateRoot) {
  const runtimeRoot = assertOwnerOnlyDirectory(
    process.env.CODEX_MEMORY_STACK_RUNTIME_DIR || ''
  );
  const inspectionEnvironment = {
    ...process.env,
    XDG_RUNTIME_DIR: path.dirname(runtimeRoot)
  };
  if (runtimeDirectory(inspectionEnvironment) !== runtimeRoot) {
    throw codedError('stack_shim_listener_identity_mismatch');
  }
  const environmentFile = extractEnvFileArgument(process.argv);
  const environmentReference = assertRelativeReference(
    path.relative(privateRoot, environmentFile)
  );
  const retainedBindingFile = assertOwnerOnlyFile(
    process.env.CODEX_MEMORY_STACK_RETAINED_BINDING_FILE || ''
  );
  const retainedBinding = assertRelativeReference(
    path.relative(privateRoot, retainedBindingFile)
  );
  const controllerProfile = childControllerProfileFields();
  const profile = {
    ...controllerProfile,
    governanceEnvironment: environmentReference,
    privateRoot,
    retainedBinding,
    retainedBindingSource:
      process.env.CODEX_MEMORY_STACK_RETAINED_BINDING_SOURCE,
    runtimeBaseline: process.env.CODEX_MEMORY_STACK_RUNTIME_BASELINE,
    runtimeRepository: REPO_ROOT,
    ...childVcpRuntimeProfileFields(process.env)
  };
  if (!SAFE_GIT_OBJECT.test(profile.adoptedRepositoryHead || '') ||
      profile.controllerSourceManifestVersion !== MANIFEST_SCHEMA_VERSION ||
      !SAFE_SHA256_DIGEST.test(
        profile.controllerSourceManifestDigest || ''
      ) ||
      !SAFE_GIT_OBJECT.test(profile.runtimeBaseline || '') ||
      !SAFE_GIT_OBJECT.test(profile.retainedBindingSource || '') ||
      !SAFE_SHA256_DIGEST.test(profile.vcpProviderConfigDigest || '') ||
      !SAFE_GIT_OBJECT.test(profile.vcpRuntimeBaseline || '') ||
      !SAFE_SHA256_DIGEST.test(profile.vcpRuntimeScopeDigest || '') ||
      (profileVcpRuntimeIdentityMode(profile) === 'unsupported') ||
      profile.vcpRuntimeRepository !== vcpRuntimeRepository()) {
    throw codedError('stack_shim_listener_identity_mismatch');
  }
  const state = inspectManagedProcess('shim', {
    environment: inspectionEnvironment,
    profile
  });
  if (!state.controllerManaged ||
      !processOwnsLoopbackTcpListener(state.pid, 7615) ||
      !processOwnsLoopbackTcpListener(
        state.pid,
        GOVERNED_READ_SHIM_PORT
      )) {
    throw codedError('stack_shim_listener_identity_mismatch');
  }
  return state.pid;
}

async function runGovernanceChild() {
  assertChildMode();
  const privateRoot = childPrivateRoot();
  const runtimeRoot = assertOwnerOnlyDirectory(
    process.env.CODEX_MEMORY_STACK_RUNTIME_DIR || ''
  );
  validateRetainedBinding(privateRoot);
  const baseline = process.env.CODEX_MEMORY_STACK_RUNTIME_BASELINE;
  if (!SAFE_GIT_OBJECT.test(baseline || '')) {
    throw codedError('stack_runtime_baseline_invalid');
  }
  requireShimListenerForGovernanceChild(privateRoot);
  const privateFileIdentitiesBefore = governancePrivateFileIdentities(
    process.env,
    privateRoot
  );
  const token = singleLineSecret(readPrivateText(
    process.env.CODEX_MEMORY_R4_NATIVE_HTTP_TOKEN_REFERENCE,
    privateRoot
  ));
  const {
    preparePrivateRuntimeEnvironment
  } = require('../src/runtime/chatgpt-r4/private-runtime-preparation');
  const {
    loadGovernanceRuntimeFromEnvironment
  } = require('../src/runtime/chatgpt-r4/governance-runtime-authority');
  const runtimeSocketRoot = governanceSocketRootForSchema(
    childProfileSchemaVersion(process.env),
    { privateRoot, runtimeRoot }
  );
  const prepared = await preparePrivateRuntimeEnvironment({
    baseEnvironment: process.env,
    isolatedShimTarget: {
      schema_version: 1,
      target_reference: `full-stack-${baseline.slice(0, 12)}`,
      bind_host: '127.0.0.1',
      bind_port: 7615,
      mcp_path: '/mcp/vcp-native',
      listener_observed: true,
      loopback_only: true,
      native_write_enabled: false
    },
    capabilityBearerToken: token
  });
  const receipt = prepared.receipt;
  if (receipt?.isolated_shim_target_bound !== true ||
      receipt?.capability_preflight_completed !== true ||
      receipt?.transport_authorization_enforced !== true ||
      receipt?.initialize_capability_verified !== true ||
      receipt?.tools_list_capability_verified !== true ||
      receipt?.mapping_binding_fingerprint_matched !== true ||
      receipt?.selected_diary_search_supported !== true ||
      receipt?.provider_calls_during_preflight !== 0 ||
      receipt?.native_invocations_during_preflight !== 0 ||
      receipt?.primary_memory_writes_during_preflight !== 0 ||
      receipt?.unscoped_native_searches_during_preflight !== 0) {
    throw codedError('stack_governance_preparation_invalid');
  }
  const runtime = await loadGovernanceRuntimeFromEnvironment(
    prepared.private_environment,
    { privateRoot, runtimeSocketRoot }
  );
  const privateFileIdentitiesAfter = governancePrivateFileIdentities(
    prepared.private_environment,
    privateRoot
  );
  if (!fileIdentitySetMatches(
    privateFileIdentitiesBefore,
    privateFileIdentitiesAfter,
    GOVERNANCE_PRIVATE_REFERENCE_NAMES
  )) {
    throw codedError('stack_governance_private_identity_changed');
  }
  const started = await runtime.start();
  const snapshot = runtime.snapshot();
  const observation = snapshot.session_control?.private_dogfood_observation;
  if (started.owner_only_socket !== true ||
      started.session_control_started !== true ||
      snapshot.session_activation_default_closed !== true ||
      snapshot.session_control?.activation?.activation_status !== 'inactive' ||
      observation?.sessions_started !== 0 ||
      observation?.provider_calls !== 0 ||
      observation?.primary_memory_writes !== 0 ||
      observation?.unrestricted_native_searches !== 0) {
    await runtime.stop().catch(() => {});
    throw codedError('stack_governance_default_closed_invalid');
  }
  try {
    writeGovernancePrivateIdentityReceipt({
      ...profileControllerIdentityReceipt(
        childControllerProfileFields()
      ),
      governancePid: process.pid,
      governanceProcessStartTicks: readLinuxProcessStartTicks(process.pid),
      privateFileIdentities: privateFileIdentitiesAfter
    }, runtimeRoot);
  } catch (error) {
    await runtime.stop().catch(() => {});
    throw error;
  }
  process.stdout.write(`${JSON.stringify({
    accepted: true,
    component: 'governance',
    defaultClosed: true,
    activationStatus: 'inactive',
    secretValuesReturned: false,
    rawMemoryReturned: false
  })}\n`);
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    try {
      await runtime.stop();
      process.exit(0);
    } catch {
      process.exit(1);
    }
  };
  process.once('SIGINT', () => void stop());
  process.once('SIGTERM', () => void stop());
}

async function runRelayChild() {
  assertChildMode();
  const privateRoot = childPrivateRoot();
  validateRetainedBinding(privateRoot);
  const runtimeRoot = assertOwnerOnlyDirectory(
    process.env.CODEX_MEMORY_STACK_RUNTIME_DIR || ''
  );
  const governancePid = parsePid(
    process.env.CODEX_MEMORY_STACK_EXPECTED_GOVERNANCE_PID
  );
  if (governancePid === null) {
    throw codedError('stack_governance_data_listener_identity_mismatch');
  }
  const governanceProcessStartTicks =
    readLinuxProcessStartTicks(governancePid);
  const governanceDataSocket =
    process.env.CODEX_MEMORY_R4_RELAY_UDS_PATH;
  const verifyUdsListenerOwner = candidate => {
    try {
      return candidate === governanceDataSocket &&
        readLinuxProcessStartTicks(governancePid) ===
          governanceProcessStartTicks &&
        processOwnsUnixListener(governancePid, candidate);
    } catch {
      return false;
    }
  };
  const verifyConnectedUdsPeer = (socket, candidate) => {
    try {
      return candidate === governanceDataSocket &&
        readLinuxProcessStartTicks(governancePid) ===
          governanceProcessStartTicks &&
        connectedUnixPeerOwnedByPid(socket, governancePid);
    } catch {
      return false;
    }
  };
  if (!verifyUdsListenerOwner(governanceDataSocket)) {
    throw codedError('stack_governance_data_listener_identity_mismatch');
  }
  process.env.CODEX_MEMORY_R5_RELAY_OBSERVER_UDS_PATH =
    path.join(runtimeRoot, 'relay-observer.sock');
  const secretFileIdentitiesBefore = relaySecretFileIdentities(
    process.env,
    privateRoot
  );
  const {
    createCanonicalOutboundRelayService
  } = require('../apps/local-recall-relay/outbound-main');
  const {
    loadOutboundRelayRuntimeFromEnvironment
  } = require('../apps/local-recall-relay/runtime-authority');
  const service = createCanonicalOutboundRelayService({
    environment: process.env,
    loadRuntime(environment, options) {
      return loadOutboundRelayRuntimeFromEnvironment(environment, {
        ...options,
        secretRoot: privateRoot,
        verifyUdsListenerOwner,
        verifyConnectedUdsPeer
      });
    }
  });
  const secretFileIdentitiesAfter = relaySecretFileIdentities(
    process.env,
    privateRoot
  );
  if (!fileIdentitySetMatches(
    secretFileIdentitiesBefore,
    secretFileIdentitiesAfter
  )) {
    throw codedError('stack_relay_secret_identity_changed');
  }
  writeRelaySecretIdentityReceipt({
    ...profileControllerIdentityReceipt(
      childControllerProfileFields()
    ),
    relayPid: process.pid,
    relayProcessStartTicks: readLinuxProcessStartTicks(process.pid),
    secretFileIdentities: secretFileIdentitiesAfter
  }, runtimeRoot);
  process.stdout.write(`${JSON.stringify({
    accepted: true,
    component: 'outbound_relay',
    outboundOnly: true,
    secretValuesReturned: false,
    rawMemoryReturned: false
  })}\n`);
  process.once('SIGINT', () => service.stop());
  process.once('SIGTERM', () => service.stop());
  await service.run();
}

async function probeHttpChild() {
  assertChildMode();
  const expectedHttpPid = parsePid(
    process.env.CODEX_MEMORY_STACK_EXPECTED_HTTP_PID
  );
  if (expectedHttpPid === null) {
    throw codedError('stack_http_listener_identity_mismatch');
  }
  const httpEndpoint = childHttpEndpoint(process.env);
  const connectedSocket = await connectOwnedLoopbackTcpListener(
    expectedHttpPid,
    httpEndpoint.port
  );
  const privateRoot = childPrivateRoot();
  const token = singleLineSecret(readPrivateText(
    process.env.CODEX_MEMORY_R4_NATIVE_HTTP_TOKEN_REFERENCE,
    privateRoot
  ));
  const health = await getJsonHealth({
    port: httpEndpoint.port,
    bearerToken: token,
    connectedSocket
  });
  process.stdout.write(`${JSON.stringify(health)}\n`);
}

async function probeGovernanceChild() {
  assertChildMode();
  const socketPath = process.env.CODEX_MEMORY_R4_SESSION_CONTROL_UDS_PATH;
  if (!path.isAbsolute(socketPath || '')) {
    throw codedError('stack_governance_control_socket_invalid');
  }
  const value = await socketJsonRequest(socketPath, {
    schema_version: 3,
    operation: 'status',
    request_id: `op_${crypto.randomBytes(16).toString('hex')}`
  });
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

async function probeRelayChild() {
  assertChildMode();
  const runtimeRoot = assertOwnerOnlyDirectory(
    process.env.CODEX_MEMORY_STACK_RUNTIME_DIR || ''
  );
  const value = await socketJsonRequest(
    path.join(runtimeRoot, 'relay-observer.sock'),
    { schema_version: 1, operation: 'snapshot' },
    { maximumBytes: 4096 }
  );
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

async function prepareGovernanceSocketsChild() {
  assertChildMode();
  const privateRoot = childPrivateRoot();
  const schemaVersion = childProfileSchemaVersion(process.env);
  const socketRoot = governanceSocketRootForSchema(schemaVersion, {
    privateRoot,
    runtimeRoot: schemaVersion === IMAGE_PROFILE_SCHEMA_VERSION
      ? assertOwnerOnlyDirectory(
        process.env.CODEX_MEMORY_STACK_RUNTIME_DIR || ''
      )
      : null
  });
  const dataSocket = process.env.CODEX_MEMORY_R4_RELAY_UDS_PATH;
  const controlSocket = process.env.CODEX_MEMORY_R4_SESSION_CONTROL_UDS_PATH;
  if (dataSocket === controlSocket) {
    throw codedError('stack_governance_socket_paths_reused');
  }
  const controlCleaned = await prepareStaleOwnerSocket(controlSocket, socketRoot);
  const dataCleaned = await prepareStaleOwnerSocket(dataSocket, socketRoot);
  process.stdout.write(`${JSON.stringify({
    accepted: true,
    staleControlSocketRemoved: controlCleaned,
    staleDataSocketRemoved: dataCleaned,
    activeSocketRemoved: false,
    secretValuesReturned: false,
    rawMemoryReturned: false
  })}\n`);
}

function containerSupervisorAuthorityMatchesProfile(profile, authority) {
  try {
    validateImageProfile(profile, profileAuthorityComponents(authority));
    return true;
  } catch {
    return false;
  }
}

function deriveContainerVcpRuntimeIdentity(profile, {
  authority,
  buildManifest
} = {}) {
  const components = profileAuthorityComponents(authority);
  const manifest = validateBuildManifest(buildManifest);
  const imageAuthorityDigest = vcpImageRuntimeAuthorityDigest(components);
  if (profileVcpRuntimeIdentityMode(profile) !== 'image_authority_v1' ||
      buildManifestDigest(manifest) !== components.buildManifestDigest ||
      manifest.vcpCommit !== components.vcpCommit ||
      profile.vcpRuntimeContractDigest !== imageAuthorityDigest) {
    throw codedError('stack_container_vcp_image_authority_mismatch');
  }
  try {
    validateImageProfile(profile, components);
  } catch {
    throw codedError('stack_container_vcp_image_authority_mismatch');
  }
  return Object.freeze({
    admissionAllowed: true,
    authorityVerified: true,
    buildChanged: false,
    buildDigest: components.buildManifestDigest,
    classification: VCP_RUNTIME_CLASSIFICATIONS.IMAGE_AUTHORITY_MATCH,
    contractComplete: true,
    contractDigest: imageAuthorityDigest,
    contractMatch: true,
    currentMain: null,
    identityMode: 'image_authority_v1',
    imageAuthorityDigest,
    manifestDigest: components.buildManifestDigest,
    recognized: true,
    repository: IMAGE_VCP_ROOT,
    repositoryMatch: true,
    revision: components.vcpCommit,
    scopeClean: true,
    scopeComplete: true,
    scopeDigest: profile.vcpRuntimeScopeDigest
  });
}

function loadContainerSupervisorEvidence({
  environment = process.env,
  fsModule = fs,
  runtimeRoot = REPO_ROOT,
  vcpRoot = IMAGE_VCP_ROOT,
  dockerSocketExists = fs.existsSync
} = {}) {
  const authorityPath = environment.CODEX_MEMORY_CONTAINER_AUTHORITY_PATH ||
    AUTHORITY_RECORD_PATH;
  const buildManifestPath =
    environment.CODEX_MEMORY_RUNTIME_BUILD_MANIFEST_PATH ||
    IMAGE_BUILD_MANIFEST_PATH;
  const edgeReceiptPath = environment.CODEX_MEMORY_EDGE_RECEIPT_PATH ||
    '/run/codex-memory/edge-receipt.json';
  const providerReceiptPath = environment.CODEX_MEMORY_PROVIDER_RECEIPT_PATH ||
    PROVIDER_RECEIPT_PATH;
  const profileFile = environment.CODEX_MEMORY_STACK_PROFILE_PATH ||
    '/run/codex-memory/profile.json';
  const authority = validateAuthorityRecord(readBoundedJson(authorityPath, {
    fsModule
  }));
  const buildManifest = validateBuildManifest(readBoundedJson(
    buildManifestPath, { fsModule }
  ));
  let bootId;
  try {
    bootId = fsModule.readFileSync(
      '/proc/sys/kernel/random/boot_id', 'utf8'
    ).trim();
  } catch {
    throw codedError('stack_container_boot_identity_unavailable');
  }
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/u.test(bootId)) {
    throw codedError('stack_container_boot_identity_invalid');
  }
  const edgeReceipt = validateEdgeReceipt(readBoundedJson(edgeReceiptPath, {
    fsModule
  }), authority, { bootId });
  const providerReceipt = validateProviderReceipt(readBoundedJson(
    providerReceiptPath, { fsModule }
  ), authority, { bootId });
  const profileBytes = readBoundedBuffer(profileFile, { fsModule });
  let profile;
  try { profile = validateProfile(JSON.parse(profileBytes.toString('utf8'))); } catch {
    throw codedError('stack_container_profile_invalid');
  }
  const nativeClosure = readBoundedJson(
    '/opt/codex-memory-runtime/native-closure.json', { fsModule }
  );
  if (!containerSupervisorAuthorityMatchesProfile(profile, authority)) {
    throw codedError('stack_container_authority_profile_mismatch');
  }
  const runtimeEvidence = validateRuntimeSelfEvidence({
    authority,
    buildManifest,
    edgeReceipt,
    nativeClosure,
    profileBytes,
    providerReceipt,
    runtimeRoot,
    vcpRoot,
    dockerSocketExists
  });
  if (buildManifestDigest(buildManifest) !== profile.runtimeBuildManifestDigest) {
    throw codedError('stack_container_build_manifest_mismatch');
  }
  const vcpRuntimeIdentity = deriveContainerVcpRuntimeIdentity(profile, {
    authority,
    buildManifest
  });
  return Object.freeze({
    authority,
    buildManifest,
    edgeReceipt,
    providerReceipt,
    profile,
    runtimeEvidence,
    vcpRuntimeIdentity
  });
}

async function stopContainerManaged(profile, environment) {
  const stopped = [];
  for (const name of ['relay', 'governance', 'http', 'shim']) {
    if (await stopManaged(name, { environment, profile })) stopped.push(name);
  }
  return Object.freeze(stopped);
}

async function superviseContainedRuntime(evidence, {
  environment = process.env,
  waitIntervalMs = 1_000,
  startStack = startStackWithProfile,
  inspectProcess = inspectManagedProcess,
  stopStack = stopContainerManaged
} = {}) {
  const startRecord = await startStack(evidence.profile, {
    containerEvidence: evidence,
    environment
  });
  if (startRecord.outcome?.accepted !== true ||
      startRecord.outcome?.runtimeAccepted !== true) {
    throw codedError('stack_container_runtime_start_rejected');
  }
  let stopping = false;
  let resolveStop;
  const stopRequested = new Promise(resolve => { resolveStop = resolve; });
  const requestStop = () => {
    if (!stopping) {
      stopping = true;
      resolveStop('signal');
    }
  };
  process.once('SIGTERM', requestStop);
  process.once('SIGINT', requestStop);
  const monitor = setInterval(() => {
    if (stopping) return;
    const healthy = Object.keys(COMPONENTS).every(name => {
      const state = inspectProcess(name, {
        environment,
        profile: evidence.profile
      });
      return state.running && state.controllerManaged;
    });
    if (!healthy) {
      stopping = true;
      resolveStop('child_exit');
    }
  }, waitIntervalMs);
  // The managed children are deliberately detached and unreferenced. This
  // monitor is therefore the supervisor's liveness anchor and must remain
  // referenced; a pending Promise alone does not keep the Node event loop
  // alive. Unref'ing it makes the container entrypoint exit 0 immediately
  // after admission even though all managed children were just started.
  const reason = await stopRequested;
  clearInterval(monitor);
  const stopped = await stopStack(evidence.profile, environment);
  if (reason !== 'signal') throw codedError('stack_container_child_exited');
  return Object.freeze({
    accepted: true,
    action: 'stopped',
    edgeStopped: false,
    providerStopped: false,
    stoppedComponents: stopped
  });
}

async function runContainerSupervisor({
  environment = process.env,
  evidence = null,
  admissionOnly = environment
    .CODEX_MEMORY_CONTAINER_SUPERVISOR_ADMISSION_ONLY === '1'
} = {}) {
  if (environment.CODEX_MEMORY_CONTAINER_SUPERVISOR !== '1') {
    throw codedError('stack_container_supervisor_not_authorized');
  }
  process.umask(0o077);
  const accepted = evidence || loadContainerSupervisorEvidence({ environment });
  if (admissionOnly) {
    return Object.freeze({
      accepted: true,
      action: 'container_supervisor_admission',
      ...accepted.runtimeEvidence,
      listenerPolicy: 'loopback_only',
      mutableCheckoutRuntimeAuthority: false,
      dockerSocketMounted: false,
      secretValuesReturned: false,
      rawMemoryReturned: false
    });
  }
  return superviseContainedRuntime(accepted, { environment });
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function usage() {
  return [
    'Usage: node scripts/codex-memory-stack.js <start|status|stop|rebind-source>',
    '       node scripts/codex-memory-stack.js adopt-running [--replace]',
    '',
    'start         Start the adopted full stack and fail closed on validation errors.',
    'status        Print a low-disclosure health, socket, observer, and baseline summary.',
    'stop          Stop only managed processes and the retained Edge container.',
    'rebind-source Start a stopped schema-v6 stack under a new accepted source manifest and atomically replace its profile.',
    'adopt-running Create an owner-only, reference-only profile from the live accepted stack.'
  ].join('\n');
}

async function main(argv = process.argv.slice(2)) {
  const command = argv[0] || 'status';
  if (command === '_run-shim') return runShimChild();
  if (command === '_run-http') return runHttpChild();
  if (command === '_run-governance') return runGovernanceChild();
  if (command === '_run-relay') return runRelayChild();
  if (command === '_probe-http') return probeHttpChild();
  if (command === '_probe-governance') return probeGovernanceChild();
  if (command === '_probe-relay') return probeRelayChild();
  if (command === '_prepare-governance-sockets') {
    return prepareGovernanceSocketsChild();
  }
  if (command === '_container-supervisor') {
    if (argv.length !== 1) throw codedError('stack_cli_argument_invalid');
    return printJson(await runContainerSupervisor());
  }
  if (command === 'start') {
    if (argv.length !== 1) throw codedError('stack_cli_argument_invalid');
    return printJson(await startStack());
  }
  if (command === 'status') {
    if (argv.length !== 1) throw codedError('stack_cli_argument_invalid');
    return printJson(await inspectStack());
  }
  if (command === 'stop') {
    if (argv.length !== 1) throw codedError('stack_cli_argument_invalid');
    return printJson(await stopStack());
  }
  if (command === 'rebind-source') {
    if (argv.length !== 1) throw codedError('stack_cli_argument_invalid');
    return printJson(await rebindSourceManifestStack());
  }
  if (command === 'adopt-running') {
    const extra = argv.slice(1);
    if (extra.some(value => value !== '--replace')) {
      throw codedError('stack_cli_argument_invalid');
    }
    return printJson(await adoptRunningStack({
      replace: extra.includes('--replace')
    }));
  }
  if (command === '--help' || command === '-h' || command === 'help') {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  throw codedError('stack_cli_command_invalid');
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`${safeCode(error)}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  CANONICAL_CODEX_MCP_TOOL_NAMES,
  CANONICAL_CODEX_MCP_ENDPOINT,
  CONTROLLER_CHANGE_PATHS,
  EDGE_CONTRACT_STATUS,
  EXACT_HEAD_PROFILE_SCHEMA_VERSION,
  GOVERNED_READ_SHIM_PORT,
  IMAGE_PROFILE_KEYS,
  IMAGE_PROFILE_SCHEMA_VERSION,
  PROFILE_KEYS,
  PROFILE_SCHEMA_VERSION,
  LEGACY_ROLLBACK_MCP_ENDPOINT,
  LEGACY_V6_PROFILE_KEYS,
  V5_CONTROLLER_SOURCE_UPGRADE_COMMITS,
  V5_PROFILE_KEYS,
  VCP_RUNTIME_BASELINE_BY_CODEX_BASELINE,
  VCP_RUNTIME_BUILD_SCHEMA_VERSION,
  VCP_RUNTIME_CLASSIFICATIONS,
  VCP_RUNTIME_CONTRACT_PROJECTION,
  VCP_RUNTIME_IDENTITY_SCHEMA_VERSION,
  VCP_IMAGE_RUNTIME_IDENTITY_SCHEMA_VERSION,
  VCP_RUNTIME_SOURCE_PATHS,
  acquireLifecycleProfile,
  acquireOwnerLock,
  adoptionSourceCompatible,
  adoptRunningStack,
  assertAdoptionRepositoryMatch,
  assertPrivateRootBoundary,
  assertRelativeReference,
  assertSourceManifestRebindStopped,
  buildHttpChildEnvironment,
  buildShimChildEnvironment,
  buildControllerChildEnvironment,
  childBaseEnvironment,
  childHttpEndpoint,
  childProfileSchemaVersion,
  governanceSocketRootForSchema,
  classifyManagedCommandShape,
  commandMatchesComponent,
  computeRuntimeAccepted,
  computeStackAccepted,
  connectOwnedLoopbackTcpListener,
  connectedUnixPeerOwnedByPid,
  coordinateStoppedOwnerProfileTransition,
  coordinateSourceManifestRebind,
  controllerCommandMatchesComponent,
  deriveRuntimeRepositoryFromHttpIdentity,
  deriveContainerVcpRuntimeIdentity,
  discoverPrivateRoot,
  exactKeys,
  extractEnvFileArgument,
  finalizeManagedSpawn,
  inspectEdgeContainer,
  inspectPidFile,
  inspectStoppedStateForOwnerProfileTransition,
  inspectProviderContainer,
  inspectSourceCompatibility,
  inspectVcpRuntimeIdentity,
  inspectVcpRuntimeContractEvidence,
  assertRootControlledRuntimeReadableProviderEnvironment,
  isPidRunning,
  legacyVcpRuntimeBootstrapMatches,
  getJsonHealth,
  loadManagedEnvironmentFile,
  managedStopWaitOptions,
  managedShimArguments,
  managedEnvironmentConfigDigest,
  lowDisclosureGovernanceProjection,
  lowDisclosureRelayProjection,
  ownerFileIdentity,
  parsePid,
  prepareStaleOwnerSocket,
  privateReferencePath,
  processEnvironmentExactlyMatches,
  profileControllerIdentityReceipt,
  processOwnsLoopbackTcpListener,
  processOwnsUnixListener,
  profileHttpEndpoint,
  runtimeSocketPaths,
  profileEdgeIdentityMatches,
  profileEdgeLifecycleIdentityMatches,
  profileManagedEnvironmentConfigMatches,
  profileProviderIdentityMatches,
  profileVcpProviderConfigMatches,
  profileWithControllerManifestBinding,
  profileWithSourceManifestRebinding,
  projectManagedHttpTrustedScope,
  profileVcpRuntimeIdentityMode,
  profileVcpRuntimeIdentityMatches,
  containerSupervisorAuthorityMatchesProfile,
  loadContainerSupervisorEvidence,
  runContainerSupervisor,
  superviseContainedRuntime,
  stopContainerManaged,
  profileV7MigrationCandidate,
  governanceCredentialFreshnessMatches,
  governancePrivateFileIdentities,
  providerCredentialFreshnessMatches,
  projectHttpHealthPayload,
  probeUnixSocket,
  relayCredentialFreshnessMatches,
  relaySecretFileIdentities,
  rebindSourceManifestStack,
  readLinuxProcessStartTicks,
  readPidFile,
  readVcpProviderEnvironmentSnapshot,
  readRuntimeVcpProviderEnvironmentSnapshot,
  safeCode,
  sourceManifestRebindEligible,
  validateExpectedMappingEnvironment,
  validateManagedHttpTrustedScope,
  validateRetainedBindingPayload,
  validateProfile,
  vcpProviderConfigDigest,
  vcpRuntimeContractDigest,
  vcpRuntimeContractMigrationCandidate,
  vcpRuntimeRepository,
  writeGovernancePrivateIdentityReceipt,
  writeProviderConfigIdentityReceipt,
  writeRelaySecretIdentityReceipt,
  waitForProcessGroupExit
};
