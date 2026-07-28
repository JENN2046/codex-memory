#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { parseEnv } = require('node:util');
const {
  execFile,
  execFileSync,
  spawn
} = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT_PATH = path.resolve(__filename);
const PROFILE_SCHEMA_VERSION = 5;
const LEGACY_PROFILE_SCHEMA_VERSION = 4;
const PROFILE_FILENAME = 'full-stack-control.json';
const RUNTIME_DIRECTORY_NAME = 'codex-memory-full-stack-001';
const EDGE_CONTAINER_DEFAULT = 'codex-memory-full-stack-001-edge';
const PROVIDER_CONTAINER_DEFAULT = 'new-api-wsl';
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
  'tests/mcp-http.test.js',
  'tests/codex-memory-stack-cli.test.js',
  'tests/chatgpt-r4/local-integration.test.js',
  'tests/chatgpt-r4/outbound-relay.test.js'
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
const PROFILE_KEYS = Object.freeze([
  ...LEGACY_PROFILE_KEYS,
  'controllerSourceCommit',
  'governanceEnvironmentConfigDigest',
  'relayEnvironmentConfigDigest',
  'vcpProviderConfigDigest',
  'vcpRuntimeBaseline',
  'vcpRuntimeRepository',
  'vcpRuntimeScopeDigest'
]);
const PRIVATE_FILE_MAX_BYTES = 262_144;
const SAFE_GIT_OBJECT = /^[a-f0-9]{40}$/u;
const SAFE_SHA256_DIGEST = /^sha256:[a-f0-9]{64}$/u;
const SAFE_CONTAINER_ID = /^[a-f0-9]{64}$/u;
const SAFE_IMAGE_ID = /^sha256:[a-f0-9]{64}$/u;
const SAFE_CONTAINER_NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/u;
const SAFE_CODE = /^[a-z][a-z0-9_]{0,95}$/u;
const SAFE_CHILD_PATH = '/usr/bin:/bin';
const SAFE_MANAGED_ENVIRONMENT_NAME =
  /^CODEX_MEMORY_R(?:4|5)_[A-Z0-9_]{1,96}$/u;
const SENSITIVE_MANAGED_ENVIRONMENT_NAME =
  /(?:^|_)(?:PASSWORD|PRIVATE_KEY|SECRET|TOKEN)(?:_|$)/u;
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

function codedError(code) {
  const safe = SAFE_CODE.test(code || '') ? code : 'codex_memory_stack_failed';
  return Object.assign(new Error(safe), { code: safe });
}

function safeCode(error, fallback = 'codex_memory_stack_failed') {
  const candidate = error?.code || error?.message;
  return SAFE_CODE.test(candidate || '') ? candidate : fallback;
}

function exactKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index]);
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
    if (profile?.schemaVersion !== PROFILE_SCHEMA_VERSION) return false;
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
  let parsed;
  try {
    parsed = parse(fsModule.readFileSync(target, 'utf8'));
  } catch {
    throw codedError('stack_vcp_provider_environment_invalid');
  }
  const apiKey = singleLineSecret(parsed?.API_Key || '');
  const model = parsed?.WhitelistEmbeddingModel;
  const dimension = parsed?.VECTORDB_DIMENSION;
  if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/u.test(model || '') ||
      !/^[1-9][0-9]{0,5}$/u.test(dimension || '')) {
    throw codedError('stack_vcp_provider_environment_invalid');
  }
  return Object.freeze({ apiKey, model, dimension });
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

function validateProviderConfigIdentityReceipt(value) {
  const shimPid = parsePid(value?.shimPid);
  if (!exactKeys(value, [
    'controllerSourceCommit',
    'providerConfigIdentity',
    'schemaVersion',
    'shimPid',
    'shimProcessStartTicks'
  ]) ||
      value.schemaVersion !== 1 ||
      !SAFE_GIT_OBJECT.test(value.controllerSourceCommit || '') ||
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
    controllerSourceCommit: value.controllerSourceCommit,
    providerConfigIdentity: Object.freeze({
      ...value.providerConfigIdentity
    }),
    schemaVersion: 1,
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
    if (profile?.schemaVersion !== PROFILE_SCHEMA_VERSION ||
        parsePid(shimPid) === null) {
      return false;
    }
    const receipt = readProviderConfigIdentityReceipt(
      runtimeRoot,
      { fsModule }
    );
    return receipt.controllerSourceCommit === profile.controllerSourceCommit &&
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
  const governancePid = parsePid(value?.governancePid);
  if (!exactKeys(value, [
    'controllerSourceCommit',
    'governancePid',
    'governanceProcessStartTicks',
    'privateFileIdentities',
    'schemaVersion'
  ]) ||
      value.schemaVersion !== 1 ||
      !SAFE_GIT_OBJECT.test(value.controllerSourceCommit || '') ||
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
    controllerSourceCommit: value.controllerSourceCommit,
    governancePid,
    governanceProcessStartTicks: value.governanceProcessStartTicks,
    privateFileIdentities: Object.freeze(Object.fromEntries(
      Object.entries(value.privateFileIdentities).map(([name, identity]) => [
        name,
        Object.freeze({ ...identity })
      ])
    )),
    schemaVersion: 1
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
    if (profile?.schemaVersion !== PROFILE_SCHEMA_VERSION ||
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
    return receipt.controllerSourceCommit === profile.controllerSourceCommit &&
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
  const relayPid = parsePid(value?.relayPid);
  if (!exactKeys(value, [
    'controllerSourceCommit',
    'relayPid',
    'relayProcessStartTicks',
    'schemaVersion',
    'secretFileIdentities'
  ]) ||
      value.schemaVersion !== 1 ||
      !SAFE_GIT_OBJECT.test(value.controllerSourceCommit || '') ||
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
    controllerSourceCommit: value.controllerSourceCommit,
    relayPid,
    relayProcessStartTicks: value.relayProcessStartTicks,
    schemaVersion: 1,
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
    if (profile?.schemaVersion !== PROFILE_SCHEMA_VERSION ||
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
    return receipt.controllerSourceCommit === profile.controllerSourceCommit &&
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
  const model = providerEnvironment?.model;
  const dimension = providerEnvironment?.dimension;
  if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/u.test(model || '') ||
      !/^[1-9][0-9]{0,5}$/u.test(dimension || '')) {
    throw codedError('stack_vcp_provider_environment_invalid');
  }
  return `sha256:${crypto.createHash('sha256').update(
    `model\0${model}\ndimension\0${dimension}\n`,
    'utf8'
  ).digest('hex')}`;
}

function profileVcpProviderConfigMatches(profile, providerEnvironment) {
  try {
    return profile?.schemaVersion === PROFILE_SCHEMA_VERSION &&
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
  const keys = value?.schemaVersion === LEGACY_PROFILE_SCHEMA_VERSION
    ? LEGACY_PROFILE_KEYS
    : PROFILE_KEYS;
  if (!exactKeys(value, keys) ||
      ![LEGACY_PROFILE_SCHEMA_VERSION, PROFILE_SCHEMA_VERSION].includes(
        value.schemaVersion
      ) ||
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
  if (value.schemaVersion === PROFILE_SCHEMA_VERSION &&
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
    fsModule.renameSync(temporary, file);
    fsModule.chmodSync(file, 0o600);
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
  } catch {
    if (descriptor !== undefined) {
      try {
        fsModule.closeSync(descriptor);
      } catch {}
    }
    try {
      fsModule.unlinkSync(file);
    } catch {}
    throw codedError('stack_lifecycle_lock_failed');
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
    lifecycleLock.release();
    throw error;
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
  fsModule = fs
} = {}) {
  if (!identity) return false;
  try {
    return identity.executable === fsModule.realpathSync(process.execPath);
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

function componentCommandKind(name, command, {
  executable,
  cwd,
  profile,
  environment = process.env,
  fsModule = fs
} = {}) {
  const component = COMPONENTS[name];
  if (!component || !profile || !Array.isArray(command) ||
      !command.every(value => typeof value === 'string') ||
      cwd !== profile.runtimeRepository ||
      !nodeProcessIdentityMatches({ executable, cwd, command }, { fsModule })) {
    return null;
  }
  let environmentFile;
  try {
    environmentFile = expectedComponentEnvironmentFile(name, profile);
  } catch {
    return null;
  }
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
          ? resolveCommandPath(value, cwd) === legacy[index]
          : value === legacy[index]
      )
      ? 'legacy'
      : null;
  }
  if (name === 'http') {
    return command.length === 2 &&
      resolveCommandPath(command[1], cwd) ===
        path.join(profile.runtimeRepository, 'src', 'http-index.js')
      ? 'legacy'
      : null;
  }
  const legacyRunner = path.join(runtimeRoot, `${name}-runner.js`);
  return command.length === 3 &&
    command[1] === `--env-file=${environmentFile}` &&
    resolveCommandPath(command[2], cwd) === legacyRunner
    ? 'legacy'
    : null;
}

function commandMatchesComponent(name, command, options = {}) {
  return componentCommandKind(name, command, options) !== null;
}

function controllerCommandMatchesComponent(name, command, options = {}) {
  return componentCommandKind(name, command, options) === 'controller';
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
  return path.resolve(REPO_ROOT, '..', '..', 'runtime', 'VCPToolBox');
}

function inspectVcpRuntimeIdentity(profile, {
  repoRoot = vcpRuntimeRepository(),
  expectedRepository = null,
  canonicalRepository = vcpRuntimeRepository(),
  exec = execFileSync,
  fsModule = fs
} = {}) {
  const expectedRevision = profile?.schemaVersion === PROFILE_SCHEMA_VERSION
    ? profile.vcpRuntimeBaseline
    : VCP_RUNTIME_BASELINE_BY_CODEX_BASELINE[profile?.runtimeBaseline] || null;
  const boundRepository = expectedRepository ||
    (
      profile?.schemaVersion === PROFILE_SCHEMA_VERSION
        ? profile.vcpRuntimeRepository
        : canonicalRepository
    );
  const rejected = overrides => Object.freeze({
    recognized: false,
    revision: null,
    repository: null,
    currentMain: false,
    repositoryMatch: false,
    scopeClean: false,
    scopeComplete: false,
    scopeDigest: null,
    ...overrides
  });
  if (!SAFE_GIT_OBJECT.test(expectedRevision || '') ||
      typeof boundRepository !== 'string' ||
      !path.isAbsolute(boundRepository) ||
      path.resolve(boundRepository) !== boundRepository) {
    return rejected();
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
    const scopedStatus = gitText([
      'status',
      '--porcelain=v1',
      '--untracked-files=all',
      '--',
      ...VCP_RUNTIME_SOURCE_PATHS
    ], options);
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
    const repositoryMatch = repository === inspectedRepository &&
      inspectedRepository === path.resolve(boundRepository) &&
      path.resolve(boundRepository) === path.resolve(canonicalRepository);
    const currentMain = head === originMain;
    const scopeClean = scopedStatus === '';
    const recognized = repositoryMatch &&
      currentMain &&
      scopeClean &&
      scopeComplete &&
      head === expectedRevision;
    return Object.freeze({
      recognized,
      revision: SAFE_GIT_OBJECT.test(head) ? head : null,
      repository,
      currentMain,
      repositoryMatch,
      scopeClean,
      scopeComplete,
      scopeDigest
    });
  } catch {
    return rejected();
  }
}

function profileVcpRuntimeIdentityMatches(profile, identity) {
  return Boolean(
    profile?.schemaVersion === PROFILE_SCHEMA_VERSION &&
    SAFE_GIT_OBJECT.test(profile?.vcpRuntimeBaseline || '') &&
    SAFE_SHA256_DIGEST.test(profile?.vcpRuntimeScopeDigest || '') &&
    identity?.recognized === true &&
    identity?.revision === profile.vcpRuntimeBaseline &&
    identity?.repository === profile.vcpRuntimeRepository &&
    identity?.scopeDigest === profile.vcpRuntimeScopeDigest &&
    identity?.currentMain === true &&
    identity?.repositoryMatch === true &&
    identity?.scopeClean === true &&
    identity?.scopeComplete === true
  );
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

function profileWithVcpRuntimeBinding(
  profile,
  identity,
  providerEnvironment,
  controllerSourceCommit,
  environmentConfigDigests
) {
  if (!legacyVcpRuntimeBootstrapMatches(profile, identity)) {
    throw codedError('stack_vcp_runtime_identity_mismatch');
  }
  return validateProfile({
    ...profile,
    schemaVersion: PROFILE_SCHEMA_VERSION,
    controllerSourceCommit,
    governanceEnvironmentConfigDigest:
      environmentConfigDigests?.governanceEnvironmentConfigDigest,
    relayEnvironmentConfigDigest:
      environmentConfigDigests?.relayEnvironmentConfigDigest,
    vcpProviderConfigDigest:
      vcpProviderConfigDigest(providerEnvironment),
    vcpRuntimeBaseline: identity.revision,
    vcpRuntimeRepository: identity.repository,
    vcpRuntimeScopeDigest: identity.scopeDigest
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
  const controllerSourceMatch =
    profile.schemaVersion === PROFILE_SCHEMA_VERSION
      ? SAFE_GIT_OBJECT.test(profile.controllerSourceCommit || '') &&
        head === profile.controllerSourceCommit
      : controllerOnlyChanges;
  return Object.freeze({
    head,
    originMain,
    clean,
    baselineExists,
    currentMain: head === originMain,
    repositoryMatch,
    controllerOnlyChanges,
    controllerSourceMatch,
    compatible: clean && baselineExists && head === originMain &&
      repositoryMatch && controllerOnlyChanges && controllerSourceMatch
  });
}

function adoptionSourceCompatible(source) {
  return Boolean(
    source?.clean === true &&
    source?.baselineExists === true &&
    source?.controllerOnlyChanges === true &&
    source?.controllerSourceMatch === true &&
    source?.currentMain === true &&
    source?.repositoryMatch === true &&
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
  return Boolean(
    provider?.recognized === true &&
    provider?.running === true &&
    provider?.id === profile?.providerContainerId &&
    provider?.imageId === profile?.providerImageId &&
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
    'candidateCacheEnabled',
    'controlledMutationToolsExposed',
    'securityProfile',
    'softReadPolicyEnabled',
    'lifecycleReadPolicyEnabled',
    'writePreflightEnabled',
    'externalProviderAllowed',
    'governedNativeBridgeWarnings',
    'mcpPublicToolSurface',
    'nativeWriteDelegationMode',
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
  if (profile.schemaVersion === PROFILE_SCHEMA_VERSION) {
    childEnvironment.CODEX_MEMORY_STACK_CONTROLLER_SOURCE_COMMIT =
      profile.controllerSourceCommit;
    childEnvironment.CODEX_MEMORY_STACK_PROFILE_SCHEMA_VERSION =
      String(PROFILE_SCHEMA_VERSION);
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
    options?.source?.compatible === true &&
    computeRuntimeAccepted(options)
  );
}

async function inspectStack({
  environment = process.env,
  profile = readProfile({ environment })
} = {}) {
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
  if (profile.schemaVersion === PROFILE_SCHEMA_VERSION) {
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
  if (profile.schemaVersion === PROFILE_SCHEMA_VERSION) {
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
  const httpListenerOwned = processes.http.controllerManaged &&
    processOwnsLoopbackTcpListener(processes.http.pid, 7605);
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
    runtimeBaseline: profile.runtimeBaseline,
    source: Object.freeze({
      clean: source.clean,
      currentMain: source.currentMain,
      controllerIdentityMatch: source.controllerSourceMatch,
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
      providerConfigIdentityMatch: vcpProviderConfigMatch,
      providerCredentialFresh: vcpProviderCredentialFresh,
      currentMain: vcpRuntime.currentMain,
      scopeClean: vcpRuntime.scopeClean,
      scopeComplete: vcpRuntime.scopeComplete
    }),
    shim: Object.freeze({
      reachable: shimListenerOwned,
      listenerIdentityMatch: shimListenerOwned
    }),
    httpMcp: Object.freeze({
      reachable: httpHealth.reachable,
      healthy: httpHealth.ok,
      authRequired: httpHealth.authRequired,
      listenerIdentityMatch: httpListenerOwned,
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
      identityMatch: profileEdgeIdentityMatches(profile, edge)
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

async function startStack({
  environment = process.env
} = {}) {
  const lifecycle = acquireLifecycleProfile({ environment });
  const storedProfile = lifecycle.profile;
  try {
    let profile = storedProfile;
    const source = inspectSourceCompatibility(storedProfile);
    if (!source.compatible) {
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
    if (profile.schemaVersion === PROFILE_SCHEMA_VERSION &&
        (
          environmentConfigDigests.governanceEnvironmentConfigDigest !==
            profile.governanceEnvironmentConfigDigest ||
          environmentConfigDigests.relayEnvironmentConfigDigest !==
            profile.relayEnvironmentConfigDigest
        )) {
      throw codedError('stack_managed_environment_identity_mismatch');
    }
    const vcpRuntime = inspectVcpRuntimeIdentity(profile);
    const vcpProviderConfigSnapshot = readVcpProviderEnvironmentSnapshot(
      path.join(vcpRuntimeRepository(), 'config.env')
    );
    const vcpProviderEnvironment =
      vcpProviderConfigSnapshot.providerEnvironment;
    if (profile.schemaVersion === PROFILE_SCHEMA_VERSION) {
      if (!profileVcpRuntimeIdentityMatches(profile, vcpRuntime)) {
        throw codedError('stack_vcp_runtime_identity_mismatch');
      }
      if (!profileVcpProviderConfigMatches(
        profile,
        vcpProviderEnvironment
      )) {
        throw codedError('stack_vcp_provider_config_identity_mismatch');
      }
      profile = storedProfile;
    } else if (legacyVcpRuntimeBootstrapMatches(profile, vcpRuntime)) {
      profile = profileWithVcpRuntimeBinding(
        profile,
        vcpRuntime,
        vcpProviderEnvironment,
        source.head,
        environmentConfigDigests
      );
    } else {
      throw codedError('stack_vcp_runtime_identity_mismatch');
    }
    const provider = inspectProviderContainer(profile.providerContainer);
    if (!profileProviderIdentityMatches(profile, provider)) {
      throw codedError('stack_provider_dependency_identity_mismatch');
    }
    if (!await portListening(3000)) {
      throw codedError('stack_provider_dependency_unavailable');
    }
    const edgeBefore = inspectEdgeContainer(profile.edgeContainer);
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
      const shim = await spawnManaged('shim', '_run-shim', governanceEnvironment, {
        profile,
        environment
      });
      if (shim.started) started.add('shim');
      await waitFor(() => {
        const state = inspectManagedProcess('shim', { environment, profile });
        return state.controllerManaged &&
          state.pid === shim.pid &&
          processOwnsLoopbackTcpListener(state.pid, 7615);
      }, {
        failureCode: 'stack_shim_start_timeout'
      });
      if (!providerCredentialFreshnessMatches({
        profile,
        providerConfigFile: path.join(
          profile.vcpRuntimeRepository,
          'config.env'
        ),
        runtimeRoot: runtimeDirectory(environment),
        shimPid: shim.pid
      })) {
        throw codedError('stack_vcp_provider_credential_stale');
      }

      const httpState = inspectManagedProcess('http', { environment, profile });
      if (!httpState.running && await portListening(7605)) {
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
            !processOwnsLoopbackTcpListener(state.pid, 7605)) {
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
          !processOwnsLoopbackTcpListener(shimBeforeGovernance.pid, 7615)) {
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

      if (!edgeBefore.running) {
        runDocker(['start', profile.edgeContainerId]);
        started.add('edge');
      }
      await waitFor(() => {
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

      const result = await inspectStack({ environment, profile });
      if (!result.accepted) throw codedError('stack_final_acceptance_failed');
      if (storedProfile.schemaVersion === LEGACY_PROFILE_SCHEMA_VERSION) {
        return Object.freeze({
          ...result,
          accepted: false,
          runtimeAccepted: false,
          transitionRuntimeAccepted: true,
          profileUpgradeRequired: true,
          action: started.size === 0
            ? 'profile_upgrade_required'
            : 'started_profile_upgrade_required',
          failClosedRollbackRequired: false
        });
      }
      return Object.freeze({
        ...result,
        action: started.size === 0 ? 'already_running' : 'started',
        failClosedRollbackRequired: false
      });
    } catch (error) {
      const rollbackFailures = await rollbackStarted(started, profile, environment);
      if (rollbackFailures.length > 0) {
        throw codedError('stack_fail_closed_rollback_incomplete');
      }
      throw error;
    }
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
    const controllerSource = inspectSourceCompatibility({
      schemaVersion: LEGACY_PROFILE_SCHEMA_VERSION,
      runtimeBaseline: edge.revision,
      runtimeRepository
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
      controllerSourceCommit: controllerSource.head,
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
  providerEnvironment
}) {
  if (!providerEnvironment || typeof providerEnvironment.apiKey !== 'string' ||
      typeof providerEnvironment.model !== 'string' ||
      typeof providerEnvironment.dimension !== 'string') {
    throw codedError('stack_vcp_provider_environment_invalid');
  }
  return {
    ...childBaseEnvironment(environment),
    SHIM_HOST: '127.0.0.1',
    SHIM_PORT: '7615',
    WSL_NEWAPI_HOST: '127.0.0.1',
    VCP_ROOT: vcpRoot,
    VCPTOOLBOX_ROOT: vcpRoot,
    VCP_CONFIG_ENV: path.join(vcpRoot, 'config.env'),
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
    CODEX_MEMORY_DERIVED_RUNTIME_MUTATION_POLICY:
      'isolated_derived_runtime_mutation_v1',
    ENABLE_REAL_ROOT_WRITE: '0'
  };
}

function buildHttpChildEnvironment(environment, {
  token,
  runtimeRoot
}) {
  const isolatedDiaryRoot = path.join(runtimeRoot, 'data', 'no-primary-memory');
  return {
    ...childBaseEnvironment(environment),
    CODEX_MEMORY_HTTP_HOST: '127.0.0.1',
    CODEX_MEMORY_HTTP_PORT: '7605',
    CODEX_MEMORY_HTTP_TOKEN: token,
    CODEX_MEMORY_BASE_PATH: runtimeRoot,
    CODEX_MEMORY_DATA_DIR: path.join(runtimeRoot, 'data'),
    CODEX_MEMORY_LOGS_DIR: path.join(runtimeRoot, 'logs'),
    CODEX_MEMORY_DIARY_PATH: isolatedDiaryRoot,
    CODEX_MEMORY_ACTIVE_MEMORY_ROOT: '',
    CODEX_MEMORY_VCHAT_DATA_ROOT: '',
    CODEX_MEMORY_SECURITY_PROFILE: 'hardened',
    CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: 'false',
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
    CODEX_MEMORY_EXPOSE_WRITE_TOOLS: 'false',
    CODEX_MEMORY_VCP_NATIVE_RUNTIME_PROFILE: 'wsl-newapi-prod',
    CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_ENDPOINT:
      'http://127.0.0.1:7615/mcp/vcp-native',
    CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_TOKEN: token,
    CODEX_MEMORY_GOVERNED_MCP_VCP_NATIVE_BRIDGE_GATE_MODE: 'strict',
    CODEX_MEMORY_GOVERNED_MCP_VCP_NATIVE_READ_DELEGATION_MODE: 'primary',
    CODEX_MEMORY_GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATION_MODE: 'off',
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

function assertChildMode() {
  if (process.env.CODEX_MEMORY_STACK_CHILD !== '1') {
    throw codedError('stack_child_mode_not_authorized');
  }
  process.umask(0o077);
}

async function runShimChild() {
  assertChildMode();
  const profile = {
    controllerSourceCommit:
      process.env.CODEX_MEMORY_STACK_CONTROLLER_SOURCE_COMMIT,
    runtimeRepository: REPO_ROOT,
    schemaVersion: Number(
      process.env.CODEX_MEMORY_STACK_PROFILE_SCHEMA_VERSION
    ),
    runtimeBaseline: process.env.CODEX_MEMORY_STACK_RUNTIME_BASELINE,
    vcpProviderConfigDigest:
      process.env.CODEX_MEMORY_STACK_VCP_PROVIDER_CONFIG_DIGEST,
    vcpRuntimeBaseline:
      process.env.CODEX_MEMORY_STACK_VCP_RUNTIME_BASELINE,
    vcpRuntimeRepository:
      process.env.CODEX_MEMORY_STACK_VCP_RUNTIME_REPOSITORY,
    vcpRuntimeScopeDigest:
      process.env.CODEX_MEMORY_STACK_VCP_RUNTIME_SCOPE_DIGEST
  };
  const source = inspectSourceCompatibility(profile);
  if (!source.compatible) {
    throw codedError('stack_source_compatibility_failed');
  }
  const vcpRuntime = inspectVcpRuntimeIdentity(profile);
  if (!profileVcpRuntimeIdentityMatches(profile, vcpRuntime)) {
    throw codedError('stack_vcp_runtime_identity_mismatch');
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
  const providerConfigSnapshot = readVcpProviderEnvironmentSnapshot(
    path.join(vcpRoot, 'config.env')
  );
  const providerEnvironment = providerConfigSnapshot.providerEnvironment;
  if (!profileVcpProviderConfigMatches(profile, providerEnvironment)) {
    throw codedError('stack_vcp_provider_config_identity_mismatch');
  }
  const token = singleLineSecret(readPrivateText(
    process.env.CODEX_MEMORY_R4_NATIVE_HTTP_TOKEN_REFERENCE,
    privateRoot
  ));
  const shimEnvironment = buildShimChildEnvironment(process.env, {
    token,
    runtimeRoot,
    vcpRoot,
    mappingPath,
    providerEnvironment
  });
  writeProviderConfigIdentityReceipt({
    controllerSourceCommit: profile.controllerSourceCommit,
    providerConfigIdentity: providerConfigSnapshot.fileIdentity,
    schemaVersion: 1,
    shimPid: process.pid,
    shimProcessStartTicks: readLinuxProcessStartTicks(process.pid)
  }, runtimeRoot);
  for (const name of Object.keys(process.env)) delete process.env[name];
  Object.assign(process.env, shimEnvironment);
  const { main: runShim } = require(
    '../src/cli/vcp-toolbox-native-mcp-shim'
  );
  await runShim([
    '--host',
    '127.0.0.1',
    '--port',
    '7615',
    '--vcp-root',
    vcpRoot,
    '--kb-store',
    path.join(runtimeRoot, 'store')
  ], process.env);
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
    runtimeRoot
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
  const schemaVersion = Number(
    process.env.CODEX_MEMORY_STACK_PROFILE_SCHEMA_VERSION
  );
  const profile = {
    controllerSourceCommit:
      process.env.CODEX_MEMORY_STACK_CONTROLLER_SOURCE_COMMIT,
    governanceEnvironment: environmentReference,
    privateRoot,
    retainedBinding,
    retainedBindingSource:
      process.env.CODEX_MEMORY_STACK_RETAINED_BINDING_SOURCE,
    runtimeBaseline: process.env.CODEX_MEMORY_STACK_RUNTIME_BASELINE,
    runtimeRepository: REPO_ROOT,
    schemaVersion,
    vcpProviderConfigDigest:
      process.env.CODEX_MEMORY_STACK_VCP_PROVIDER_CONFIG_DIGEST,
    vcpRuntimeBaseline:
      process.env.CODEX_MEMORY_STACK_VCP_RUNTIME_BASELINE,
    vcpRuntimeRepository:
      process.env.CODEX_MEMORY_STACK_VCP_RUNTIME_REPOSITORY,
    vcpRuntimeScopeDigest:
      process.env.CODEX_MEMORY_STACK_VCP_RUNTIME_SCOPE_DIGEST
  };
  if (schemaVersion !== PROFILE_SCHEMA_VERSION ||
      !SAFE_GIT_OBJECT.test(profile.controllerSourceCommit || '') ||
      !SAFE_GIT_OBJECT.test(profile.runtimeBaseline || '') ||
      !SAFE_GIT_OBJECT.test(profile.retainedBindingSource || '') ||
      !SAFE_SHA256_DIGEST.test(profile.vcpProviderConfigDigest || '') ||
      !SAFE_GIT_OBJECT.test(profile.vcpRuntimeBaseline || '') ||
      !SAFE_SHA256_DIGEST.test(profile.vcpRuntimeScopeDigest || '') ||
      profile.vcpRuntimeRepository !== vcpRuntimeRepository()) {
    throw codedError('stack_shim_listener_identity_mismatch');
  }
  const state = inspectManagedProcess('shim', {
    environment: inspectionEnvironment,
    profile
  });
  if (!state.controllerManaged ||
      !processOwnsLoopbackTcpListener(state.pid, 7615)) {
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
    { privateRoot }
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
      controllerSourceCommit:
        process.env.CODEX_MEMORY_STACK_CONTROLLER_SOURCE_COMMIT,
      governancePid: process.pid,
      governanceProcessStartTicks: readLinuxProcessStartTicks(process.pid),
      privateFileIdentities: privateFileIdentitiesAfter,
      schemaVersion: 1
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
    controllerSourceCommit:
      process.env.CODEX_MEMORY_STACK_CONTROLLER_SOURCE_COMMIT,
    relayPid: process.pid,
    relayProcessStartTicks: readLinuxProcessStartTicks(process.pid),
    schemaVersion: 1,
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
  const connectedSocket = await connectOwnedLoopbackTcpListener(
    expectedHttpPid,
    7605
  );
  const privateRoot = childPrivateRoot();
  const token = singleLineSecret(readPrivateText(
    process.env.CODEX_MEMORY_R4_NATIVE_HTTP_TOKEN_REFERENCE,
    privateRoot
  ));
  const health = await getJsonHealth({
    port: 7605,
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
  const dataSocket = process.env.CODEX_MEMORY_R4_RELAY_UDS_PATH;
  const controlSocket = process.env.CODEX_MEMORY_R4_SESSION_CONTROL_UDS_PATH;
  if (dataSocket === controlSocket) {
    throw codedError('stack_governance_socket_paths_reused');
  }
  const controlCleaned = await prepareStaleOwnerSocket(controlSocket, privateRoot);
  const dataCleaned = await prepareStaleOwnerSocket(dataSocket, privateRoot);
  process.stdout.write(`${JSON.stringify({
    accepted: true,
    staleControlSocketRemoved: controlCleaned,
    staleDataSocketRemoved: dataCleaned,
    activeSocketRemoved: false,
    secretValuesReturned: false,
    rawMemoryReturned: false
  })}\n`);
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function usage() {
  return [
    'Usage: node scripts/codex-memory-stack.js <start|status|stop|adopt-running> [--replace]',
    '',
    'start         Start the adopted full stack and fail closed on validation errors.',
    'status        Print a low-disclosure health, socket, observer, and baseline summary.',
    'stop          Stop only managed processes and the retained Edge container.',
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
  if (command === 'start') return printJson(await startStack());
  if (command === 'status') return printJson(await inspectStack());
  if (command === 'stop') return printJson(await stopStack());
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
  CONTROLLER_CHANGE_PATHS,
  PROFILE_KEYS,
  VCP_RUNTIME_BASELINE_BY_CODEX_BASELINE,
  VCP_RUNTIME_SOURCE_PATHS,
  acquireLifecycleProfile,
  acquireOwnerLock,
  adoptionSourceCompatible,
  adoptRunningStack,
  assertAdoptionRepositoryMatch,
  assertPrivateRootBoundary,
  assertRelativeReference,
  buildHttpChildEnvironment,
  buildShimChildEnvironment,
  buildControllerChildEnvironment,
  childBaseEnvironment,
  commandMatchesComponent,
  computeRuntimeAccepted,
  computeStackAccepted,
  connectOwnedLoopbackTcpListener,
  connectedUnixPeerOwnedByPid,
  controllerCommandMatchesComponent,
  deriveRuntimeRepositoryFromHttpIdentity,
  discoverPrivateRoot,
  exactKeys,
  extractEnvFileArgument,
  finalizeManagedSpawn,
  inspectEdgeContainer,
  inspectProviderContainer,
  inspectSourceCompatibility,
  inspectVcpRuntimeIdentity,
  isPidRunning,
  legacyVcpRuntimeBootstrapMatches,
  getJsonHealth,
  loadManagedEnvironmentFile,
  managedStopWaitOptions,
  managedEnvironmentConfigDigest,
  lowDisclosureGovernanceProjection,
  lowDisclosureRelayProjection,
  ownerFileIdentity,
  parsePid,
  prepareStaleOwnerSocket,
  privateReferencePath,
  processEnvironmentExactlyMatches,
  processOwnsLoopbackTcpListener,
  processOwnsUnixListener,
  profileEdgeIdentityMatches,
  profileEdgeLifecycleIdentityMatches,
  profileManagedEnvironmentConfigMatches,
  profileProviderIdentityMatches,
  profileVcpProviderConfigMatches,
  profileWithVcpRuntimeBinding,
  profileVcpRuntimeIdentityMatches,
  governanceCredentialFreshnessMatches,
  governancePrivateFileIdentities,
  providerCredentialFreshnessMatches,
  projectHttpHealthPayload,
  probeUnixSocket,
  relayCredentialFreshnessMatches,
  relaySecretFileIdentities,
  readLinuxProcessStartTicks,
  readPidFile,
  readVcpProviderEnvironmentSnapshot,
  safeCode,
  validateExpectedMappingEnvironment,
  validateRetainedBindingPayload,
  validateProfile,
  vcpProviderConfigDigest,
  vcpRuntimeRepository,
  writeGovernancePrivateIdentityReceipt,
  writeProviderConfigIdentityReceipt,
  writeRelaySecretIdentityReceipt,
  waitForProcessGroupExit
};
