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
const PROFILE_SCHEMA_VERSION = 4;
const PROFILE_FILENAME = 'full-stack-control.json';
const RUNTIME_DIRECTORY_NAME = 'codex-memory-full-stack-001';
const EDGE_CONTAINER_DEFAULT = 'codex-memory-full-stack-001-edge';
const PROVIDER_CONTAINER_DEFAULT = 'new-api-wsl';
const CONTROLLER_CHANGE_PATHS = new Set([
  'docs/CODEX_MEMORY_FULL_STACK_CONTROL.md',
  'scripts/codex-memory-stack.js',
  'tests/codex-memory-stack-cli.test.js'
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
const PROFILE_KEYS = Object.freeze([
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
const PRIVATE_FILE_MAX_BYTES = 262_144;
const SAFE_GIT_OBJECT = /^[a-f0-9]{40}$/u;
const SAFE_CONTAINER_ID = /^[a-f0-9]{64}$/u;
const SAFE_IMAGE_ID = /^sha256:[a-f0-9]{64}$/u;
const SAFE_CONTAINER_NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/u;
const SAFE_CODE = /^[a-z][a-z0-9_]{0,95}$/u;
const SAFE_CHILD_PATH = '/usr/bin:/bin';
const SAFE_MANAGED_ENVIRONMENT_NAME =
  /^CODEX_MEMORY_R(?:4|5)_[A-Z0-9_]{1,96}$/u;

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

function privateReferencePath(reference, privateRoot) {
  if (typeof reference !== 'string' || !reference.startsWith('file:')) {
    throw codedError('stack_private_reference_invalid');
  }
  const requested = reference.slice(5);
  if (!path.isAbsolute(requested)) {
    throw codedError('stack_private_reference_invalid');
  }
  const root = assertOwnerOnlyDirectory(privateRoot);
  const target = path.resolve(requested);
  const relation = path.relative(root, target);
  if (!relation || relation.startsWith('..') || path.isAbsolute(relation)) {
    throw codedError('stack_private_reference_outside_root');
  }
  return assertOwnerOnlyFile(target);
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
  if (!exactKeys(value, PROFILE_KEYS) ||
      value.schemaVersion !== PROFILE_SCHEMA_VERSION ||
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

function acquireOwnerLock(file, {
  fsModule = fs,
  kill = process.kill,
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
    let pid;
    try {
      existing = fsModule.lstatSync(file);
      if (!existing.isFile() || existing.isSymbolicLink() ||
          existing.uid !== currentUid() || (existing.mode & 0o077) !== 0 ||
          existing.size < 1 || existing.size > 32) {
        throw codedError('stack_lifecycle_lock_invalid');
      }
      pid = parsePid(fsModule.readFileSync(file, 'utf8'));
      if (pid === null) throw codedError('stack_lifecycle_lock_invalid');
    } catch (inspectionError) {
      if (inspectionError?.code?.startsWith?.('stack_')) throw inspectionError;
      throw codedError('stack_lifecycle_lock_invalid');
    }
    if (isPidRunning(pid, kill)) throw codedError('stack_lifecycle_busy');
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
    return acquireOwnerLock(file, { fsModule, kill, retry: false });
  }
  let identity;
  try {
    fsModule.writeFileSync(descriptor, `${process.pid}\n`, 'utf8');
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

function commandMatchesComponent(name, command, {
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
    return false;
  }
  let environmentFile;
  try {
    environmentFile = expectedComponentEnvironmentFile(name, profile);
  } catch {
    return false;
  }
  const controllerCommand = [
    command[0],
    path.join(profile.runtimeRepository, 'scripts', 'codex-memory-stack.js'),
    component.mode,
    `--stack-environment=${environmentFile}`
  ];
  if (command.length === controllerCommand.length &&
      command.every((value, index) => value === controllerCommand[index])) {
    return true;
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
      );
  }
  if (name === 'http') {
    return command.length === 2 &&
      resolveCommandPath(command[1], cwd) ===
        path.join(profile.runtimeRepository, 'src', 'http-index.js');
  }
  const legacyRunner = path.join(runtimeRoot, `${name}-runner.js`);
  return command.length === 3 &&
    command[1] === `--env-file=${environmentFile}` &&
    resolveCommandPath(command[2], cwd) === legacyRunner;
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
  let script;
  if (command.length === 2) {
    script = resolveCommandPath(command[1], identity.cwd);
    if (path.basename(script || '') !== 'http-index.js' ||
        path.basename(path.dirname(script)) !== 'src') {
      throw codedError('stack_adoption_http_identity_invalid');
    }
  } else if (command.length === 4 && command[3] === '_run-http') {
    script = resolveCommandPath(command[2], identity.cwd);
    if (path.basename(script || '') !== 'codex-memory-stack.js' ||
        path.basename(path.dirname(script)) !== 'scripts') {
      throw codedError('stack_adoption_http_identity_invalid');
    }
  } else if (command.length === 4 &&
      command[2] === '_run-http' &&
      command[3].startsWith('--stack-environment=')) {
    extractEnvFileArgument(command);
    script = resolveCommandPath(command[1], identity.cwd);
    if (path.basename(script || '') !== 'codex-memory-stack.js' ||
        path.basename(path.dirname(script)) !== 'scripts') {
      throw codedError('stack_adoption_http_identity_invalid');
    }
  } else {
    throw codedError('stack_adoption_http_identity_invalid');
  }
  const repository = path.resolve(script, '..', '..');
  if (identity.cwd !== repository) {
    throw codedError('stack_adoption_http_identity_invalid');
  }
  return assertOwnerRepositoryDirectory(repository, { fsModule });
}

function inspectManagedProcess(name, {
  environment = process.env,
  fsModule = fs,
  profile
} = {}) {
  const state = inspectProcessIdentity(name, { environment, fsModule });
  return Object.freeze({
    pid: state.pid,
    running: state.running,
    managed: state.running && commandMatchesComponent(
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
  return Object.freeze({
    head,
    originMain,
    clean,
    baselineExists,
    currentMain: head === originMain,
    repositoryMatch,
    controllerOnlyChanges,
    compatible: clean && baselineExists && head === originMain &&
      repositoryMatch && controllerOnlyChanges
  });
}

function adoptionSourceCompatible(source) {
  return Boolean(
    source?.clean === true &&
    source?.baselineExists === true &&
    source?.controllerOnlyChanges === true
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
  const portBindingsText = query(
    '{{ json (index .NetworkSettings.Ports "3000/tcp") }}'
  );
  let portBindings;
  try {
    portBindings = JSON.parse(portBindingsText);
  } catch {
    portBindings = null;
  }
  const hostLoopbackOnly = Array.isArray(portBindings) &&
    portBindings.length === 1 &&
    ['127.0.0.1', '::1'].includes(portBindings[0]?.HostIp) &&
    portBindings[0]?.HostPort === '3000';
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
  const portBindingsText = query('{{ json (index .NetworkSettings.Ports "8080/tcp") }}');
  let portBindings;
  try {
    portBindings = JSON.parse(portBindingsText);
  } catch {
    portBindings = null;
  }
  const hostLoopbackOnly = Array.isArray(portBindings) && portBindings.length > 0 &&
    portBindings.every(binding =>
      ['127.0.0.1', '::1'].includes(binding?.HostIp) &&
      /^[1-9][0-9]{0,4}$/u.test(binding?.HostPort || '')
    );
  const running = query('{{ .State.Running }}') === 'true';
  const health = query('{{ if .State.Health }}{{ .State.Health.Status }}{{ else }}none{{ end }}');
  const nonRoot = user === 'node' || (/^[1-9][0-9]*$/u.test(user) && user !== '0');
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
    hostLoopbackOnly,
    secure: SAFE_CONTAINER_ID.test(id) && SAFE_GIT_OBJECT.test(revision) &&
      nonRoot && readOnlyRoot &&
      restartPolicy === 'no' && logDriver === 'none' &&
      secretMountReadOnly && hostLoopbackOnly
  });
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
    'securityProfile',
    'softReadPolicyEnabled',
    'lifecycleReadPolicyEnabled',
    'writePreflightEnabled',
    'externalProviderAllowed',
    'governedNativeBridgeWarnings'
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
  bearerToken = ''
}) {
  return new Promise(resolve => {
    const request = http.get({
      host,
      port,
      path: pathname,
      timeout: timeoutMs,
      headers: bearerToken
        ? { Authorization: `Bearer ${bearerToken}` }
        : undefined
    }, response => {
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
          resolve(projectHttpHealthPayload(value, response.statusCode));
        } catch {
          resolve(projectHttpHealthPayload(null, response.statusCode));
        }
      });
    });
    request.once('timeout', () => request.destroy());
    request.once('error', () =>
      resolve(projectHttpHealthPayload(null, null)));
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

function runChildProbe(mode, environmentFile, {
  profile,
  environment = process.env,
  exec = execFileSync
} = {}) {
  const managedEnvironment = loadManagedEnvironmentFile(environmentFile);
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
  provider,
  shimPort,
  httpHealth,
  governance,
  relay,
  edge,
  retainedBindingMatch
}) {
  return Boolean(
    retainedBindingMatch === true &&
    provider?.reachable === true &&
    profileProviderIdentityMatches(profile, provider) &&
    processes?.shim?.managed === true && shimPort === true &&
    processes?.http?.managed === true &&
    httpHealth?.reachable === true &&
    httpHealth?.ok === true &&
    httpHealth?.authRequired === true &&
    httpHealth?.policyAccepted === true &&
    processes?.governance?.managed === true &&
    governance?.reachable === true &&
    processes?.relay?.managed === true &&
    relay?.reachable === true &&
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
  const [providerPort, shimPort] = await Promise.all([
    portListening(3000),
    portListening(7615)
  ]);
  const provider = Object.freeze({
    ...providerContainer,
    reachable: providerPort
  });
  const httpHealth = processes.http.managed
    ? lowDisclosureHttpProjection(runChildProbe(
      '_probe-http',
      governanceEnvironment,
      { profile, environment }
    ))
    : lowDisclosureHttpProjection(null);
  const governance = processes.governance.managed
    ? lowDisclosureGovernanceProjection(runChildProbe(
      '_probe-governance',
      governanceEnvironment,
      { profile, environment }
    ))
    : lowDisclosureGovernanceProjection(null);
  const relay = processes.relay.managed
    ? lowDisclosureRelayProjection(runChildProbe(
      '_probe-relay',
      relayEnvironment,
      { profile, environment }
    ))
    : lowDisclosureRelayProjection(null);
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
      Object.freeze({ running: value.running, managed: value.managed })
    ])
  );
  const retainedBindingMatch = profileRetainedBindingMatches(profile);
  const runtimeAccepted = computeRuntimeAccepted({
    profile,
    processes,
    provider,
    shimPort,
    httpHealth,
    governance,
    relay,
    edge,
    retainedBindingMatch
  });
  const accepted = computeStackAccepted({
    profile,
    source,
    processes,
    provider,
    shimPort,
    httpHealth,
    governance,
    relay,
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
      repositoryMatch: source.repositoryMatch,
      compatible: source.compatible
    }),
    retainedBinding: Object.freeze({ identityMatch: retainedBindingMatch }),
    processes: Object.freeze(processProjection),
    provider: Object.freeze({
      reachable: provider.reachable,
      running: provider.running,
      recognized: provider.recognized,
      loopbackOnly: provider.hostLoopbackOnly,
      identityMatch: profileProviderIdentityMatches(profile, provider)
    }),
    shim: Object.freeze({ reachable: shimPort }),
    httpMcp: Object.freeze({
      reachable: httpHealth.reachable,
      healthy: httpHealth.ok,
      authRequired: httpHealth.authRequired,
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

function finalizeManagedSpawn(child, pidFile, {
  writePid = writePidFile,
  kill = process.kill
} = {}) {
  try {
    writePid(pidFile, child?.pid);
  } catch {
    let terminated = false;
    if (Number.isSafeInteger(child?.pid) && child.pid > 1) {
      try {
        kill(-child.pid, 'SIGTERM');
        terminated = true;
      } catch (error) {
        terminated = error?.code === 'ESRCH';
      }
    }
    if (!terminated && typeof child?.kill === 'function') {
      try {
        terminated = child.kill('SIGTERM') === true;
      } catch {}
    }
    if (!terminated &&
        child?.exitCode === null &&
        child?.signalCode === null) {
      throw codedError('stack_pid_file_cleanup_failed');
    }
    throw codedError('stack_pid_file_write_failed');
  }
  child.unref();
  return true;
}

function spawnManaged(name, mode, environmentFile, {
  profile,
  environment = process.env
}) {
  const existing = inspectManagedProcess(name, { environment, profile });
  if (existing.running) {
    if (!existing.managed) throw codedError('stack_unmanaged_process_detected');
    return Object.freeze({ started: false, pid: existing.pid });
  }
  const root = ensureRuntimeDirectories(environment);
  const locations = componentPaths(name, environment);
  const logDescriptor = fs.openSync(
    locations.log,
    fs.constants.O_CREAT | fs.constants.O_APPEND | fs.constants.O_WRONLY,
    0o600
  );
  fs.chmodSync(locations.log, 0o600);
  const managedEnvironment = loadManagedEnvironmentFile(environmentFile);
  const childEnvironment = {
    ...childBaseEnvironment(environment),
    ...managedEnvironment,
    CODEX_MEMORY_STACK_CHILD: '1',
    CODEX_MEMORY_STACK_PRIVATE_ROOT: profile.privateRoot,
    CODEX_MEMORY_STACK_RUNTIME_BASELINE: profile.runtimeBaseline,
    CODEX_MEMORY_STACK_RUNTIME_DIR: root,
    CODEX_MEMORY_STACK_RETAINED_BINDING_FILE:
      resolvePrivateReference(profile, profile.retainedBinding),
    CODEX_MEMORY_STACK_RETAINED_BINDING_SOURCE:
      profile.retainedBindingSource
  };
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
  finalizeManagedSpawn(child, locations.pid);
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
  await waitFor(() => !isPidRunning(current.pid), {
    attempts: 50,
    intervalMs: 200,
    failureCode: 'stack_process_stop_timeout'
  });
  try {
    fs.unlinkSync(locations.pid);
  } catch {}
  return true;
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
      requireProfileEdgeIdentity(
        profile,
        inspectEdgeContainer(profile.edgeContainerId)
      );
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
  const profile = readProfile({ environment });
  const source = inspectSourceCompatibility(profile);
  if (!source.compatible) throw codedError('stack_source_compatibility_failed');
  ensureRuntimeDirectories(environment);
  const lifecycleLock = acquireOwnerLock(lifecycleLockPath(environment));
  try {
    if (!profileRetainedBindingMatches(profile)) {
      throw codedError('stack_retained_binding_identity_mismatch');
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
    const governanceEnvironment = resolvePrivateReference(
      profile,
      profile.governanceEnvironment
    );
    const relayEnvironment = resolvePrivateReference(
      profile,
      profile.relayEnvironment
    );
    const started = new Set();
    try {
      const shimState = inspectManagedProcess('shim', { environment, profile });
      if (!shimState.running && await portListening(7615)) {
        throw codedError('stack_unmanaged_shim_listener');
      }
      const shim = spawnManaged('shim', '_run-shim', governanceEnvironment, {
        profile,
        environment
      });
      if (shim.started) started.add('shim');
      await waitFor(() => portListening(7615), {
        failureCode: 'stack_shim_start_timeout'
      });

      const httpState = inspectManagedProcess('http', { environment, profile });
      if (!httpState.running && await portListening(7605)) {
        throw codedError('stack_unmanaged_http_listener');
      }
      const httpProcess = spawnManaged('http', '_run-http', governanceEnvironment, {
        profile,
        environment
      });
      if (httpProcess.started) started.add('http');
      await waitFor(() => {
        const health = lowDisclosureHttpProjection(runChildProbe(
          '_probe-http',
          governanceEnvironment,
          { profile, environment }
        ));
        return health.reachable && health.ok && health.authRequired &&
          health.policyAccepted;
      }, { failureCode: 'stack_http_start_timeout' });

      const governanceState = inspectManagedProcess(
        'governance',
        { environment, profile }
      );
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
      const governanceProcess = spawnManaged(
        'governance',
        '_run-governance',
        governanceEnvironment,
        { profile, environment }
      );
      if (governanceProcess.started) started.add('governance');
      await waitFor(() => {
        const result = runChildProbe('_probe-governance', governanceEnvironment, {
          profile,
          environment
        });
        return lowDisclosureGovernanceProjection(result).reachable;
      }, { failureCode: 'stack_governance_start_timeout' });

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

      const relayProcess = spawnManaged('relay', '_run-relay', relayEnvironment, {
        profile,
        environment
      });
      if (relayProcess.started) started.add('relay');
      await waitFor(() => {
        const result = runChildProbe('_probe-relay', relayEnvironment, {
          profile,
          environment
        });
        return lowDisclosureRelayProjection(result).reachable;
      }, { failureCode: 'stack_relay_start_timeout' });

      const result = await inspectStack({ environment, profile });
      if (!result.accepted) throw codedError('stack_final_acceptance_failed');
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
    lifecycleLock.release();
  }
}

async function stopStack({
  environment = process.env
} = {}) {
  const profile = readProfile({ environment });
  ensureRuntimeDirectories(environment);
  const lifecycleLock = acquireOwnerLock(lifecycleLockPath(environment));
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
    lifecycleLock.release();
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
    const profile = validateProfile({
      schemaVersion: PROFILE_SCHEMA_VERSION,
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
      edgeContainer: EDGE_CONTAINER_DEFAULT
    });
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
    if (!inspection.runtimeAccepted) {
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

function childBaseEnvironment(environment = process.env) {
  const result = { ...environment };
  for (const name of Object.keys(result)) {
    if (name.startsWith('CODEX_MEMORY_') ||
        name.startsWith('BASH_FUNC_') ||
        name.startsWith('NODE_') ||
        [
          'API_Key',
          'API_URL',
          'BASHOPTS',
          'BASH_ENV',
          'BASH_XTRACEFD',
          'CDPATH',
          'ENABLE_REAL_ROOT_WRITE',
          'ENV',
          'GLOBIGNORE',
          'IFS',
          'KB_ROOT',
          'KNOWLEDGEBASE_ROOT_PATH',
          'KNOWLEDGEBASE_STORE_PATH',
          'LD_LIBRARY_PATH',
          'LD_PRELOAD',
          'PROMPT_COMMAND',
          'PS4',
          'SHELLOPTS',
          'VCP_CONFIG_ENV',
          'VCP_ROOT',
          'VCPTOOLBOX_ROOT',
          'VECTORDB_DIMENSION',
          'WhitelistEmbeddingModel',
          'WSL_NEWAPI_HOST'
        ].includes(name)) {
      delete result[name];
    }
  }
  result.PATH = SAFE_CHILD_PATH;
  return result;
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

function forwardChild(child) {
  let stopping = false;
  const stop = signal => {
    if (stopping) return;
    stopping = true;
    try {
      child.kill(signal);
    } catch {}
  };
  process.once('SIGTERM', () => stop('SIGTERM'));
  process.once('SIGINT', () => stop('SIGINT'));
  child.once('error', () => {
    process.exitCode = 1;
  });
  child.once('exit', (code, signal) => {
    if (signal) process.exitCode = 1;
    else process.exitCode = Number.isInteger(code) ? code : 1;
  });
}

async function runShimChild() {
  assertChildMode();
  const privateRoot = childPrivateRoot();
  const token = singleLineSecret(readPrivateText(
    process.env.CODEX_MEMORY_R4_NATIVE_HTTP_TOKEN_REFERENCE,
    privateRoot
  ));
  const runtimeRoot = assertOwnerOnlyDirectory(
    process.env.CODEX_MEMORY_STACK_RUNTIME_DIR || ''
  );
  const mappingPath = privateReferencePath(
    process.env.CODEX_MEMORY_R4_DIARY_SCOPE_MAPPING_REFERENCE,
    privateRoot
  );
  const vcpRoot = path.resolve(REPO_ROOT, '..', '..', 'runtime', 'VCPToolBox');
  const providerEnvironment = readVcpProviderEnvironment(
    path.join(vcpRoot, 'config.env')
  );
  const child = spawn(process.execPath, [
    path.join(REPO_ROOT, 'src', 'cli', 'vcp-toolbox-native-mcp-shim.js'),
    '--host',
    '127.0.0.1',
    '--port',
    '7615',
    '--vcp-root',
    vcpRoot,
    '--kb-store',
    path.join(runtimeRoot, 'store')
  ], {
    cwd: REPO_ROOT,
    env: buildShimChildEnvironment(process.env, {
      token,
      runtimeRoot,
      vcpRoot,
      mappingPath,
      providerEnvironment
    }),
    stdio: 'inherit'
  });
  forwardChild(child);
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

async function runGovernanceChild() {
  assertChildMode();
  const privateRoot = childPrivateRoot();
  validateRetainedBinding(privateRoot);
  const baseline = process.env.CODEX_MEMORY_STACK_RUNTIME_BASELINE;
  if (!SAFE_GIT_OBJECT.test(baseline || '')) {
    throw codedError('stack_runtime_baseline_invalid');
  }
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
  process.env.CODEX_MEMORY_R5_RELAY_OBSERVER_UDS_PATH =
    path.join(runtimeRoot, 'relay-observer.sock');
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
        secretRoot: privateRoot
      });
    }
  });
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
  const privateRoot = childPrivateRoot();
  const token = singleLineSecret(readPrivateText(
    process.env.CODEX_MEMORY_R4_NATIVE_HTTP_TOKEN_REFERENCE,
    privateRoot
  ));
  const health = await getJsonHealth({
    port: 7605,
    bearerToken: token
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
  acquireOwnerLock,
  adoptionSourceCompatible,
  adoptRunningStack,
  assertPrivateRootBoundary,
  assertRelativeReference,
  buildHttpChildEnvironment,
  buildShimChildEnvironment,
  childBaseEnvironment,
  commandMatchesComponent,
  computeRuntimeAccepted,
  computeStackAccepted,
  deriveRuntimeRepositoryFromHttpIdentity,
  discoverPrivateRoot,
  exactKeys,
  extractEnvFileArgument,
  finalizeManagedSpawn,
  inspectEdgeContainer,
  inspectProviderContainer,
  inspectSourceCompatibility,
  isPidRunning,
  loadManagedEnvironmentFile,
  lowDisclosureGovernanceProjection,
  lowDisclosureRelayProjection,
  parsePid,
  prepareStaleOwnerSocket,
  privateReferencePath,
  profileEdgeIdentityMatches,
  profileProviderIdentityMatches,
  projectHttpHealthPayload,
  probeUnixSocket,
  readPidFile,
  safeCode,
  validateExpectedMappingEnvironment,
  validateRetainedBindingPayload,
  validateProfile
};
