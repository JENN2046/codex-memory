'use strict';

const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const { validateMapping } = require('./DiaryScopeMapping');

const PACKAGE_SCHEMA_VERSION = 1;
const PACKAGE_KIND = 'codex_memory_owner_only_mapping_package';
const MAX_MAPPING_BYTES = 262_144;
const MAX_METADATA_BYTES = 65_536;
const NO_REPLACE_HELPER_MAX_BYTES = 65_536;
const NO_REPLACE_HELPER_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'scripts',
  'owner-mapping-rename-noreplace.py'
);
const PYTHON_EXECUTABLE = '/usr/bin/python3';
const NO_REPLACE_TARGET_EXISTS_EXIT = 17;
const MAPPING_FILE_NAME = 'diary-scope-mapping.json';
const BINDING_FILE_NAME = 'mapping-binding.json';
const ENVIRONMENT_FILE_NAME = 'mapping-binding.env';
const PACKAGE_FILE_NAMES = Object.freeze([
  BINDING_FILE_NAME,
  ENVIRONMENT_FILE_NAME,
  MAPPING_FILE_NAME
]);
const EXPORTED_ENVIRONMENT_NAMES = Object.freeze([
  'CODEX_MEMORY_DIARY_SCOPE_MAPPING_PATH',
  'CODEX_MEMORY_EXPECTED_DIARY_SCOPE_MAPPING_REFERENCE',
  'CODEX_MEMORY_EXPECTED_DIARY_SCOPE_MAPPING_DIGEST',
  'CODEX_MEMORY_R4_DIARY_SCOPE_MAPPING_REFERENCE',
  'CODEX_MEMORY_R4_EXPECTED_MAPPING_REFERENCE',
  'CODEX_MEMORY_R4_EXPECTED_MAPPING_DIGEST'
]);
const PACKAGE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u;
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const BINDING_KEYS = Object.freeze([
  'completeRuntimeConfiguration',
  'environmentFile',
  'exports',
  'kind',
  'mappingDigest',
  'mappingFile',
  'mappingReference',
  'memoryWriteEnabled',
  'r4PrivateRootExported',
  'schemaVersion'
]);

function createError(code, effects = undefined) {
  const error = new Error(code);
  error.code = code;
  if (effects) error.effects = Object.freeze({ ...effects });
  return error;
}

function reject(code, effects = undefined) {
  throw createError(code, effects);
}

function currentUid() {
  if (typeof process.getuid !== 'function') reject('owner_mapping_owner_identity_unavailable');
  return process.getuid();
}

function repositoryRoot() {
  return fs.realpathSync(path.resolve(__dirname, '..', '..'));
}

function requireDescriptorPlatform(fsImpl = fs, platform = process.platform) {
  if (platform !== 'linux' ||
      !Number.isInteger(fsImpl.constants.O_NOFOLLOW) ||
      !Number.isInteger(fsImpl.constants.O_DIRECTORY) ||
      !Number.isInteger(fsImpl.constants.O_NONBLOCK)) {
    reject('owner_mapping_descriptor_platform_unsupported');
  }
}

function isWithin(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative === '' ||
    (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function hasDeniedPrivateSegment(value) {
  return path.resolve(value).split(path.sep).includes('state-private');
}

function validateAbsolutePathInput(value, code) {
  if (typeof value !== 'string' ||
      value.length < 1 ||
      value.length > 4096 ||
      /[\u0000-\u001f\u007f]/u.test(value) ||
      !path.isAbsolute(value)) {
    reject(code);
  }
  const resolved = path.resolve(value);
  if (hasDeniedPrivateSegment(resolved)) reject('owner_mapping_private_boundary_denied');
  return resolved;
}

function validatePackageName(packageName) {
  if (typeof packageName !== 'string' || !PACKAGE_NAME_PATTERN.test(packageName)) {
    reject('owner_mapping_package_name_invalid');
  }
  return packageName;
}

function sameIdentity(left, right) {
  return left && right && left.dev === right.dev && left.ino === right.ino;
}

function sameStableStat(left, right) {
  return sameIdentity(left, right) &&
    left.uid === right.uid &&
    left.mode === right.mode &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs &&
    left.ctimeMs === right.ctimeMs;
}

function sameSecurityIdentity(left, right) {
  return sameIdentity(left, right) &&
    left.uid === right.uid &&
    left.mode === right.mode;
}

function assertOwnerOnlyDirectoryStat(stat, {
  code,
  requireWrite = false,
  exactMode = null
} = {}) {
  const ownerMode = stat.mode & 0o700;
  if (!stat.isDirectory() ||
      stat.isSymbolicLink?.() === true ||
      stat.uid !== currentUid() ||
      (stat.mode & 0o077) !== 0 ||
      (stat.mode & 0o7000) !== 0 ||
      (exactMode !== null && (stat.mode & 0o7777) !== exactMode) ||
      (ownerMode & 0o500) !== 0o500 ||
      (requireWrite && (ownerMode & 0o300) !== 0o300)) {
    reject(code);
  }
}

function assertOwnerOnlyFileStat(stat, {
  maxBytes,
  code,
  exactMode = null
} = {}) {
  if (!stat.isFile() ||
      stat.isSymbolicLink?.() === true ||
      stat.uid !== currentUid() ||
      (stat.mode & 0o077) !== 0 ||
      (stat.mode & 0o7000) !== 0 ||
      (exactMode !== null && (stat.mode & 0o7777) !== exactMode) ||
      stat.size < 1 ||
      stat.size > maxBytes) {
    reject(code);
  }
}

function assertOutsideRepository(candidate, repoRoot, fsImpl = fs) {
  let resolvedRepository;
  try {
    resolvedRepository = fsImpl.realpathSync(repoRoot);
  } catch {
    reject('owner_mapping_repository_root_unavailable');
  }
  if (isWithin(candidate, resolvedRepository)) reject('owner_mapping_path_in_repository');

  let cursor = candidate;
  while (true) {
    try {
      fsImpl.lstatSync(path.join(cursor, '.git'));
      reject('owner_mapping_path_in_repository');
    } catch (error) {
      if (error?.code?.startsWith?.('owner_mapping_')) throw error;
      if (!['ENOENT', 'ENOTDIR'].includes(error?.code)) {
        reject('owner_mapping_repository_boundary_unavailable');
      }
    }
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
}

function descriptorEntryPath(directoryFd, entryName) {
  if (!Number.isInteger(directoryFd) ||
      typeof entryName !== 'string' ||
      !entryName ||
      entryName.includes('/') ||
      entryName.includes('\\') ||
      entryName === '.' ||
      entryName === '..') {
    reject('owner_mapping_descriptor_entry_invalid');
  }
  return `/proc/self/fd/${directoryFd}/${entryName}`;
}

function openVerifiedOwnerDirectory(directoryPath, {
  fsImpl = fs,
  repoRoot = repositoryRoot(),
  requireWrite = false,
  platform = process.platform
} = {}) {
  requireDescriptorPlatform(fsImpl, platform);
  const absolute = validateAbsolutePathInput(
    directoryPath,
    'owner_mapping_private_root_invalid'
  );
  assertOutsideRepository(absolute, repoRoot, fsImpl);

  let pathStat;
  let real;
  try {
    pathStat = fsImpl.lstatSync(absolute);
    real = fsImpl.realpathSync(absolute);
  } catch {
    reject('owner_mapping_private_root_unavailable');
  }
  if (path.resolve(real) !== absolute || pathStat.isSymbolicLink()) {
    reject('owner_mapping_private_root_symlink_denied');
  }
  assertOwnerOnlyDirectoryStat(pathStat, {
    code: 'owner_mapping_private_root_security_invalid',
    requireWrite
  });

  let fd = null;
  try {
    fd = fsImpl.openSync(
      absolute,
      fsImpl.constants.O_RDONLY |
        fsImpl.constants.O_DIRECTORY |
        fsImpl.constants.O_NOFOLLOW
    );
    const descriptorStat = fsImpl.fstatSync(fd);
    const postOpenStat = fsImpl.lstatSync(absolute);
    assertOwnerOnlyDirectoryStat(descriptorStat, {
      code: 'owner_mapping_private_root_security_invalid',
      requireWrite
    });
    assertOwnerOnlyDirectoryStat(postOpenStat, {
      code: 'owner_mapping_private_root_security_invalid',
      requireWrite
    });
    if (!sameIdentity(pathStat, descriptorStat) ||
        !sameIdentity(descriptorStat, postOpenStat) ||
        pathStat.uid !== descriptorStat.uid ||
        pathStat.mode !== descriptorStat.mode ||
        descriptorStat.uid !== postOpenStat.uid ||
        descriptorStat.mode !== postOpenStat.mode) {
      reject('owner_mapping_private_root_identity_changed');
    }
    return Object.freeze({
      fd,
      path: absolute,
      requireWrite,
      stat: descriptorStat
    });
  } catch (error) {
    if (fd !== null) {
      try {
        fsImpl.closeSync(fd);
      } catch {}
    }
    if (error?.code?.startsWith?.('owner_mapping_')) throw error;
    reject('owner_mapping_private_root_descriptor_unavailable');
  }
}

function closeDescriptor(fd, fsImpl = fs) {
  if (fd === null || fd === undefined) return;
  try {
    fsImpl.closeSync(fd);
  } catch {}
}

function openProbeParentDirectory(root, fsImpl = fs) {
  const parentPath = path.dirname(root.path);
  const rootName = path.basename(root.path);
  let fd = null;
  try {
    fd = fsImpl.openSync(
      parentPath,
      fsImpl.constants.O_RDONLY |
        fsImpl.constants.O_DIRECTORY |
        fsImpl.constants.O_NOFOLLOW
    );
    const parentStat = fsImpl.fstatSync(fd);
    const namedRootStat = fsImpl.lstatSync(
      descriptorEntryPath(fd, rootName)
    );
    if (!parentStat.isDirectory() ||
        parentStat.dev !== root.stat.dev ||
        namedRootStat.isSymbolicLink() ||
        !sameSecurityIdentity(root.stat, namedRootStat)) {
      reject('owner_mapping_noreplace_primitive_unavailable');
    }
    return Object.freeze({
      fd,
      rootName
    });
  } catch (error) {
    closeDescriptor(fd, fsImpl);
    if (error?.code?.startsWith?.('owner_mapping_')) throw error;
    reject('owner_mapping_noreplace_primitive_unavailable');
  }
}

function assertOpenRootIdentity(root, fsImpl = fs) {
  let descriptorStat;
  let observed;
  try {
    descriptorStat = fsImpl.fstatSync(root.fd);
    observed = fsImpl.lstatSync(root.path);
  } catch {
    reject('owner_mapping_private_root_identity_changed');
  }
  assertOwnerOnlyDirectoryStat(descriptorStat, {
    code: 'owner_mapping_private_root_security_invalid',
    requireWrite: root.requireWrite
  });
  assertOwnerOnlyDirectoryStat(observed, {
    code: 'owner_mapping_private_root_security_invalid',
    requireWrite: root.requireWrite
  });
  if (observed.isSymbolicLink() ||
      !sameIdentity(root.stat, descriptorStat) ||
      !sameIdentity(descriptorStat, observed) ||
      root.stat.uid !== descriptorStat.uid ||
      root.stat.mode !== descriptorStat.mode ||
      descriptorStat.uid !== observed.uid ||
      descriptorStat.mode !== observed.mode) {
    reject('owner_mapping_private_root_identity_changed');
  }
}

function readExactDescriptor(fd, stat, {
  fsImpl = fs,
  code,
  identityCode = 'owner_mapping_file_identity_changed'
} = {}) {
  const bytes = Buffer.alloc(stat.size);
  let offset = 0;
  while (offset < bytes.length) {
    const count = fsImpl.readSync(fd, bytes, offset, bytes.length - offset, offset);
    if (count < 1) reject(code);
    offset += count;
  }
  const after = fsImpl.fstatSync(fd);
  if (!sameIdentity(stat, after) ||
      after.size !== stat.size ||
      after.mtimeMs !== stat.mtimeMs ||
      after.ctimeMs !== stat.ctimeMs) {
    reject(identityCode);
  }
  return bytes;
}

function readOwnerOnlyPath(filePath, {
  fsImpl = fs,
  repoRoot = repositoryRoot(),
  maxBytes = MAX_MAPPING_BYTES,
  platform = process.platform
} = {}) {
  requireDescriptorPlatform(fsImpl, platform);
  const absolute = validateAbsolutePathInput(filePath, 'owner_mapping_source_invalid');
  assertOutsideRepository(absolute, repoRoot, fsImpl);

  const parent = path.dirname(absolute);
  let parentStat;
  let pathStat;
  let realParent;
  let realFile;
  try {
    parentStat = fsImpl.lstatSync(parent);
    pathStat = fsImpl.lstatSync(absolute);
    realParent = fsImpl.realpathSync(parent);
    realFile = fsImpl.realpathSync(absolute);
  } catch {
    reject('owner_mapping_source_unavailable');
  }
  if (path.resolve(realParent) !== parent ||
      path.resolve(realFile) !== absolute ||
      parentStat.isSymbolicLink() ||
      pathStat.isSymbolicLink()) {
    reject('owner_mapping_source_symlink_denied');
  }
  assertOwnerOnlyDirectoryStat(parentStat, {
    code: 'owner_mapping_source_parent_security_invalid'
  });
  assertOwnerOnlyFileStat(pathStat, {
    maxBytes,
    code: 'owner_mapping_source_security_invalid'
  });

  let parentFd = null;
  let fd = null;
  try {
    parentFd = fsImpl.openSync(
      parent,
      fsImpl.constants.O_RDONLY |
        fsImpl.constants.O_DIRECTORY |
        fsImpl.constants.O_NOFOLLOW
    );
    const parentDescriptorStat = fsImpl.fstatSync(parentFd);
    assertOwnerOnlyDirectoryStat(parentDescriptorStat, {
      code: 'owner_mapping_source_parent_security_invalid'
    });
    if (!sameIdentity(parentStat, parentDescriptorStat)) {
      reject('owner_mapping_source_parent_identity_changed');
    }
    fd = fsImpl.openSync(
      descriptorEntryPath(parentFd, path.basename(absolute)),
      fsImpl.constants.O_RDONLY |
        fsImpl.constants.O_NOFOLLOW |
        fsImpl.constants.O_NONBLOCK
    );
    const descriptorStat = fsImpl.fstatSync(fd);
    assertOwnerOnlyFileStat(descriptorStat, {
      maxBytes,
      code: 'owner_mapping_source_security_invalid'
    });
    if (!sameIdentity(pathStat, descriptorStat)) {
      reject('owner_mapping_source_identity_changed');
    }
    const bytes = readExactDescriptor(fd, descriptorStat, {
      fsImpl,
      code: 'owner_mapping_source_read_failed'
    });
    const postReadStat = fsImpl.lstatSync(
      descriptorEntryPath(parentFd, path.basename(absolute))
    );
    assertOwnerOnlyFileStat(postReadStat, {
      maxBytes,
      code: 'owner_mapping_source_security_invalid'
    });
    if (!sameStableStat(descriptorStat, postReadStat)) {
      reject('owner_mapping_source_identity_changed');
    }
    const postReadParentStat = fsImpl.fstatSync(parentFd);
    assertOwnerOnlyDirectoryStat(postReadParentStat, {
      code: 'owner_mapping_source_parent_security_invalid'
    });
    if (!sameIdentity(parentDescriptorStat, postReadParentStat) ||
        parentDescriptorStat.uid !== postReadParentStat.uid ||
        parentDescriptorStat.mode !== postReadParentStat.mode) {
      reject('owner_mapping_source_parent_identity_changed');
    }
    return bytes;
  } catch (error) {
    if (error?.code?.startsWith?.('owner_mapping_')) throw error;
    reject('owner_mapping_source_descriptor_unavailable');
  } finally {
    closeDescriptor(fd, fsImpl);
    closeDescriptor(parentFd, fsImpl);
  }
}

function parseMappingBytes(bytes) {
  let mapping;
  try {
    mapping = JSON.parse(bytes.toString('utf8'));
  } catch {
    reject('owner_mapping_json_invalid');
  }
  const state = validateMapping(mapping);
  if (!state.accepted) reject('owner_mapping_contract_invalid');
  if (state.mapping.entries.some((entry) => entry.writeEligible === true)) {
    reject('owner_mapping_write_eligible_denied');
  }
  if (!DIGEST_PATTERN.test(state.mappingDigest || '')) {
    reject('owner_mapping_digest_invalid');
  }
  return state;
}

function canonicalMappingBytes(state) {
  return Buffer.from(`${JSON.stringify(state.mapping, null, 2)}\n`, 'utf8');
}

function buildBinding(state) {
  return Object.freeze({
    schemaVersion: PACKAGE_SCHEMA_VERSION,
    kind: PACKAGE_KIND,
    mappingFile: MAPPING_FILE_NAME,
    environmentFile: ENVIRONMENT_FILE_NAME,
    mappingReference: state.mappingReference,
    mappingDigest: state.mappingDigest,
    exports: [...EXPORTED_ENVIRONMENT_NAMES],
    r4PrivateRootExported: false,
    completeRuntimeConfiguration: false,
    memoryWriteEnabled: false
  });
}

function canonicalJsonBytes(value) {
  const output = {};
  for (const key of Object.keys(value).sort()) output[key] = value[key];
  return Buffer.from(`${JSON.stringify(output, null, 2)}\n`, 'utf8');
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\"'\"'")}'`;
}

function environmentValues(packagePath, state) {
  const mappingPath = path.join(packagePath, MAPPING_FILE_NAME);
  return Object.freeze({
    CODEX_MEMORY_DIARY_SCOPE_MAPPING_PATH: mappingPath,
    CODEX_MEMORY_EXPECTED_DIARY_SCOPE_MAPPING_REFERENCE: state.mappingReference,
    CODEX_MEMORY_EXPECTED_DIARY_SCOPE_MAPPING_DIGEST: state.mappingDigest,
    CODEX_MEMORY_R4_DIARY_SCOPE_MAPPING_REFERENCE: `file:${mappingPath}`,
    CODEX_MEMORY_R4_EXPECTED_MAPPING_REFERENCE: state.mappingReference,
    CODEX_MEMORY_R4_EXPECTED_MAPPING_DIGEST: state.mappingDigest
  });
}

function environmentBytes(packagePath, state) {
  const values = environmentValues(packagePath, state);
  const lines = [
    '# Owner-only mapping package. This is not a complete runtime configuration.',
    ...EXPORTED_ENVIRONMENT_NAMES.map((name) =>
      `export ${name}=${shellQuote(values[name])}`
    ),
    ''
  ];
  return Buffer.from(lines.join('\n'), 'utf8');
}

function assertExactKeys(value, keys, code) {
  if (!value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) {
    reject(code);
  }
}

function validateBinding(binding, state) {
  assertExactKeys(binding, BINDING_KEYS, 'owner_mapping_binding_fields_invalid');
  if (binding.schemaVersion !== PACKAGE_SCHEMA_VERSION ||
      binding.kind !== PACKAGE_KIND ||
      binding.mappingFile !== MAPPING_FILE_NAME ||
      binding.environmentFile !== ENVIRONMENT_FILE_NAME ||
      binding.mappingReference !== state.mappingReference ||
      binding.mappingDigest !== state.mappingDigest ||
      JSON.stringify(binding.exports) !== JSON.stringify(EXPORTED_ENVIRONMENT_NAMES) ||
      binding.r4PrivateRootExported !== false ||
      binding.completeRuntimeConfiguration !== false ||
      binding.memoryWriteEnabled !== false) {
    reject('owner_mapping_binding_mismatch');
  }
}

function readDescriptorFile(directoryFd, fileName, {
  fsImpl = fs,
  maxBytes,
  code
} = {}) {
  let fd = null;
  try {
    const entryPath = descriptorEntryPath(directoryFd, fileName);
    fd = fsImpl.openSync(
      entryPath,
      fsImpl.constants.O_RDONLY |
        fsImpl.constants.O_NOFOLLOW |
        fsImpl.constants.O_NONBLOCK
    );
    const stat = fsImpl.fstatSync(fd);
    assertOwnerOnlyFileStat(stat, {
      maxBytes,
      code,
      exactMode: 0o600
    });
    const bytes = readExactDescriptor(fd, stat, {
      fsImpl,
      code,
      identityCode: 'owner_mapping_package_file_identity_changed'
    });
    const postReadStat = fsImpl.lstatSync(entryPath);
    if (postReadStat.isSymbolicLink() || !sameStableStat(stat, postReadStat)) {
      reject('owner_mapping_package_file_identity_changed');
    }
    return Object.freeze({
      bytes,
      stat
    });
  } catch (error) {
    if (error?.code?.startsWith?.('owner_mapping_')) throw error;
    reject(code);
  } finally {
    closeDescriptor(fd, fsImpl);
  }
}

function openPackageDirectory(root, packageName, {
  fsImpl = fs
} = {}) {
  let fd = null;
  try {
    const entryPath = descriptorEntryPath(root.fd, packageName);
    const pathStat = fsImpl.lstatSync(entryPath);
    if (pathStat.isSymbolicLink()) {
      reject('owner_mapping_package_directory_security_invalid');
    }
    fd = fsImpl.openSync(
      entryPath,
      fsImpl.constants.O_RDONLY |
        fsImpl.constants.O_DIRECTORY |
        fsImpl.constants.O_NOFOLLOW
    );
    const stat = fsImpl.fstatSync(fd);
    assertOwnerOnlyDirectoryStat(stat, {
      code: 'owner_mapping_package_directory_security_invalid',
      exactMode: 0o700
    });
    const postOpenStat = fsImpl.lstatSync(entryPath);
    if (!sameStableStat(pathStat, stat) ||
        !sameStableStat(stat, postOpenStat)) {
      reject('owner_mapping_package_identity_changed');
    }
    return Object.freeze({ fd, stat });
  } catch (error) {
    if (fd !== null) closeDescriptor(fd, fsImpl);
    if (error?.code?.startsWith?.('owner_mapping_')) throw error;
    reject('owner_mapping_package_unavailable');
  }
}

function assertOpenPackageIdentity(root, packageName, packageDirectory, fsImpl = fs) {
  let observed;
  try {
    observed = fsImpl.lstatSync(descriptorEntryPath(root.fd, packageName));
  } catch {
    reject('owner_mapping_package_identity_changed');
  }
  if (observed.isSymbolicLink() ||
      !sameStableStat(packageDirectory.stat, observed)) {
    reject('owner_mapping_package_identity_changed');
  }
}

function assertNamedOwnerDirectoryIdentity(directoryFd, entryName, expectedStat, {
  fsImpl = fs,
  code,
  requireWrite = false,
  exactMode = null
} = {}) {
  let observed;
  try {
    observed = fsImpl.lstatSync(descriptorEntryPath(directoryFd, entryName));
  } catch {
    reject(code);
  }
  assertOwnerOnlyDirectoryStat(observed, {
    code,
    requireWrite,
    exactMode
  });
  if (observed.isSymbolicLink() || !sameStableStat(expectedStat, observed)) {
    reject(code);
  }
}

function verifyPackageDescriptor(packageFd, packagePath, {
  fsImpl = fs
} = {}) {
  const initialDirectoryStat = fsImpl.fstatSync(packageFd);
  assertOwnerOnlyDirectoryStat(initialDirectoryStat, {
    code: 'owner_mapping_package_directory_security_invalid',
    exactMode: 0o700
  });
  let entries;
  try {
    entries = fsImpl.readdirSync(`/proc/self/fd/${packageFd}`).sort();
  } catch {
    reject('owner_mapping_package_listing_failed');
  }
  if (JSON.stringify(entries) !== JSON.stringify([...PACKAGE_FILE_NAMES].sort())) {
    reject('owner_mapping_package_file_set_invalid');
  }

  const mappingFile = readDescriptorFile(packageFd, MAPPING_FILE_NAME, {
    fsImpl,
    maxBytes: MAX_MAPPING_BYTES,
    code: 'owner_mapping_package_mapping_invalid'
  });
  const state = parseMappingBytes(mappingFile.bytes);
  const bindingFile = readDescriptorFile(packageFd, BINDING_FILE_NAME, {
    fsImpl,
    maxBytes: MAX_METADATA_BYTES,
    code: 'owner_mapping_package_binding_invalid'
  });
  let binding;
  try {
    binding = JSON.parse(bindingFile.bytes.toString('utf8'));
  } catch {
    reject('owner_mapping_package_binding_invalid');
  }
  validateBinding(binding, state);

  const environmentFile = readDescriptorFile(packageFd, ENVIRONMENT_FILE_NAME, {
    fsImpl,
    maxBytes: MAX_METADATA_BYTES,
    code: 'owner_mapping_package_environment_invalid'
  });
  const expectedEnvironment = environmentBytes(packagePath, state);
  if (!environmentFile.bytes.equals(expectedEnvironment)) {
    reject('owner_mapping_package_environment_mismatch');
  }

  const fileSnapshots = new Map([
    [MAPPING_FILE_NAME, mappingFile.stat],
    [BINDING_FILE_NAME, bindingFile.stat],
    [ENVIRONMENT_FILE_NAME, environmentFile.stat]
  ]);
  let finalEntries;
  try {
    finalEntries = fsImpl.readdirSync(`/proc/self/fd/${packageFd}`).sort();
    for (const [fileName, expectedStat] of fileSnapshots) {
      const observedStat = fsImpl.lstatSync(
        descriptorEntryPath(packageFd, fileName)
      );
      if (observedStat.isSymbolicLink() ||
          !sameStableStat(expectedStat, observedStat)) {
        reject('owner_mapping_package_file_identity_changed');
      }
    }
  } catch (error) {
    if (error?.code?.startsWith?.('owner_mapping_')) throw error;
    reject('owner_mapping_package_identity_changed');
  }
  const finalDirectoryStat = fsImpl.fstatSync(packageFd);
  if (JSON.stringify(finalEntries) !== JSON.stringify(entries) ||
      !sameStableStat(initialDirectoryStat, finalDirectoryStat)) {
    reject('owner_mapping_package_identity_changed');
  }

  return Object.freeze({
    state,
    binding
  });
}

function inspectTargetAbsent(rootFd, packageName, fsImpl = fs) {
  try {
    fsImpl.lstatSync(descriptorEntryPath(rootFd, packageName));
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    reject('owner_mapping_package_target_inspection_failed');
  }
  reject('owner_mapping_package_exists');
}

function stagingNameFor(packageName) {
  return `.${packageName}.staging`;
}

function inspectStagingAbsent(rootFd, packageName, fsImpl = fs) {
  try {
    fsImpl.lstatSync(descriptorEntryPath(rootFd, stagingNameFor(packageName)));
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    reject('owner_mapping_staging_inspection_failed');
  }
  reject('owner_mapping_staging_reconciliation_required', {
    config_write_performed: false,
    cleanup_performed: false,
    durably_committed: false,
    reconciliation_required: true
  });
}

function assertNoReplaceHelper(fsImpl = fs) {
  let helperStat;
  let helperRealPath;
  let pythonStat;
  try {
    helperStat = fsImpl.lstatSync(NO_REPLACE_HELPER_PATH);
    helperRealPath = fsImpl.realpathSync(NO_REPLACE_HELPER_PATH);
    pythonStat = fsImpl.statSync(PYTHON_EXECUTABLE);
  } catch {
    reject('owner_mapping_noreplace_primitive_unavailable');
  }
  if (helperRealPath !== NO_REPLACE_HELPER_PATH ||
      helperStat.isSymbolicLink() ||
      !helperStat.isFile() ||
      helperStat.uid !== currentUid() ||
      (helperStat.mode & 0o022) !== 0 ||
      helperStat.size < 1 ||
      helperStat.size > NO_REPLACE_HELPER_MAX_BYTES ||
      !pythonStat.isFile() ||
      pythonStat.uid !== 0 ||
      (pythonStat.mode & 0o022) !== 0) {
    reject('owner_mapping_noreplace_primitive_unavailable');
  }
}

function runNoReplaceHelper(rootFd, arguments_, {
  fsImpl = fs,
  platform = process.platform,
  probeParentFd = null,
  spawnSyncImpl = childProcess.spawnSync
} = {}) {
  requireDescriptorPlatform(fsImpl, platform);
  assertNoReplaceHelper(fsImpl);

  let result;
  try {
    const stdio = ['ignore', 'ignore', 'ignore', rootFd];
    if (probeParentFd !== null) stdio.push(probeParentFd);
    result = spawnSyncImpl(
      PYTHON_EXECUTABLE,
      ['-I', NO_REPLACE_HELPER_PATH, ...arguments_],
      {
        env: {
          LANG: 'C',
          LC_ALL: 'C'
        },
        stdio,
        timeout: 30_000,
        windowsHide: true
      }
    );
  } catch {
    reject('owner_mapping_noreplace_primitive_unavailable');
  }
  return result;
}

function probeNoReplacePrimitive(root, {
  fsImpl = fs,
  platform = process.platform,
  spawnSyncImpl = childProcess.spawnSync
} = {}) {
  const parent = openProbeParentDirectory(root, fsImpl);
  try {
    const result = runNoReplaceHelper(root.fd, ['--probe', parent.rootName], {
      fsImpl,
      platform,
      probeParentFd: parent.fd,
      spawnSyncImpl
    });
    if (result?.status === 0 && !result.error && result.signal === null) return;
    reject('owner_mapping_noreplace_primitive_unavailable');
  } finally {
    closeDescriptor(parent.fd, fsImpl);
  }
}

function renameDirectoryNoReplace(rootFd, sourceName, targetName, {
  fsImpl = fs,
  platform = process.platform,
  spawnSyncImpl = childProcess.spawnSync
} = {}) {
  descriptorEntryPath(rootFd, sourceName);
  descriptorEntryPath(rootFd, targetName);
  const result = runNoReplaceHelper(rootFd, [sourceName, targetName], {
    fsImpl,
    platform,
    spawnSyncImpl
  });
  if (result?.status === 0 && !result.error && result.signal === null) return;
  if (result?.status === NO_REPLACE_TARGET_EXISTS_EXIT) {
    reject('owner_mapping_package_exists');
  }
  reject('owner_mapping_noreplace_primitive_failed');
}

function lowDisclosureReport(status, command, overrides = {}) {
  return Object.freeze({
    status,
    command,
    mapping_validated: false,
    private_root_validated: false,
    package_binding_matched: false,
    package_target_available: false,
    private_config_write_confirmed: false,
    config_write_performed: false,
    cleanup_performed: false,
    durably_committed: false,
    reconciliation_required: false,
    private_material_disclosed: false,
    runtime_started: false,
    provider_calls: 0,
    memory_reads: 0,
    primary_memory_writes: 0,
    readiness_claimed: false,
    ...overrides
  });
}

function planMappingPackage({
  mappingSource,
  privateRoot,
  packageName,
  fsImpl = fs,
  repoRoot = repositoryRoot(),
  platform = process.platform,
  spawnSyncImpl = childProcess.spawnSync
} = {}) {
  const name = validatePackageName(packageName);
  const root = openVerifiedOwnerDirectory(privateRoot, {
    fsImpl,
    repoRoot,
    requireWrite: true,
    platform
  });
  try {
    inspectTargetAbsent(root.fd, name, fsImpl);
    inspectStagingAbsent(root.fd, name, fsImpl);
    probeNoReplacePrimitive(root, {
      fsImpl,
      platform,
      spawnSyncImpl
    });
    const state = parseMappingBytes(readOwnerOnlyPath(mappingSource, {
      fsImpl,
      repoRoot,
      platform
    }));
    assertOpenRootIdentity(root, fsImpl);
    return lowDisclosureReport('PLAN_VALID', 'plan', {
      mapping_validated: state.accepted,
      private_root_validated: true,
      package_target_available: true
    });
  } finally {
    closeDescriptor(root.fd, fsImpl);
  }
}

function writeAll(fd, bytes, fsImpl = fs) {
  let offset = 0;
  while (offset < bytes.length) {
    const written = fsImpl.writeSync(fd, bytes, offset, bytes.length - offset, offset);
    if (written < 1) reject('owner_mapping_package_write_failed');
    offset += written;
  }
}

function writeExclusiveDescriptorFile(directoryFd, fileName, bytes, {
  fsImpl = fs,
  maxBytes
} = {}) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 1 || bytes.length > maxBytes) {
    reject('owner_mapping_package_write_size_invalid');
  }
  let fd = null;
  try {
    fd = fsImpl.openSync(
      descriptorEntryPath(directoryFd, fileName),
      fsImpl.constants.O_WRONLY |
        fsImpl.constants.O_CREAT |
        fsImpl.constants.O_EXCL |
        fsImpl.constants.O_NOFOLLOW,
      0o600
    );
    fsImpl.fchmodSync(fd, 0o600);
    writeAll(fd, bytes, fsImpl);
    fsImpl.fsyncSync(fd);
    const stat = fsImpl.fstatSync(fd);
    if (!stat.isFile() ||
        stat.uid !== currentUid() ||
        (stat.mode & 0o777) !== 0o600 ||
        stat.size !== bytes.length) {
      reject('owner_mapping_package_written_file_invalid');
    }
  } catch (error) {
    if (error?.code?.startsWith?.('owner_mapping_')) throw error;
    reject('owner_mapping_package_write_failed');
  } finally {
    closeDescriptor(fd, fsImpl);
  }
  const observed = readDescriptorFile(directoryFd, fileName, {
    fsImpl,
    maxBytes,
    code: 'owner_mapping_package_readback_failed'
  });
  if (!observed.bytes.equals(bytes)) {
    reject('owner_mapping_package_readback_mismatch');
  }
}

function createStagingDirectory(rootFd, packageName, {
  fsImpl = fs
} = {}) {
  const stagingName = stagingNameFor(packageName);
  try {
    fsImpl.mkdirSync(descriptorEntryPath(rootFd, stagingName), {
      mode: 0o700
    });
  } catch (error) {
    if (error?.code === 'EEXIST') {
      reject('owner_mapping_staging_reconciliation_required', {
        config_write_performed: false,
        cleanup_performed: false,
        durably_committed: false,
        reconciliation_required: true
      });
    }
    reject('owner_mapping_staging_directory_create_failed');
  }
  let fd = null;
  try {
    fd = fsImpl.openSync(
      descriptorEntryPath(rootFd, stagingName),
      fsImpl.constants.O_RDONLY |
        fsImpl.constants.O_DIRECTORY |
        fsImpl.constants.O_NOFOLLOW
    );
    fsImpl.fchmodSync(fd, 0o700);
    const stat = fsImpl.fstatSync(fd);
    assertOwnerOnlyDirectoryStat(stat, {
      code: 'owner_mapping_staging_directory_security_invalid',
      requireWrite: true
    });
    return Object.freeze({
      fd,
      name: stagingName,
      stat
    });
  } catch (error) {
    closeDescriptor(fd, fsImpl);
    let cleanupPerformed = false;
    try {
      fsImpl.rmdirSync(descriptorEntryPath(rootFd, stagingName));
      fsImpl.fsyncSync(rootFd);
      cleanupPerformed = true;
    } catch {}
    const observedError = error?.code?.startsWith?.('owner_mapping_')
      ? error
      : createError('owner_mapping_staging_directory_create_failed');
    throw attachEffects(observedError, {
      config_write_performed: true,
      cleanup_performed: cleanupPerformed,
      durably_committed: false,
      reconciliation_required: !cleanupPerformed
    });
  }
}

function cleanupStaging(rootFd, staging, {
  fsImpl = fs
} = {}) {
  let stagingFd = null;
  try {
    const stagingPath = descriptorEntryPath(rootFd, staging.name);
    const pathStat = fsImpl.lstatSync(stagingPath);
    stagingFd = fsImpl.openSync(
      stagingPath,
      fsImpl.constants.O_RDONLY |
        fsImpl.constants.O_DIRECTORY |
        fsImpl.constants.O_NOFOLLOW
    );
    const descriptorStat = fsImpl.fstatSync(stagingFd);
    assertOwnerOnlyDirectoryStat(descriptorStat, {
      code: 'owner_mapping_staging_directory_security_invalid',
      requireWrite: true
    });
    if (!sameSecurityIdentity(staging.stat, pathStat) ||
        !sameSecurityIdentity(pathStat, descriptorStat)) {
      return false;
    }
    const entries = fsImpl.readdirSync(`/proc/self/fd/${stagingFd}`);
    if (entries.some((entry) => !PACKAGE_FILE_NAMES.includes(entry))) {
      return false;
    }
    for (const entry of entries) {
      fsImpl.unlinkSync(descriptorEntryPath(stagingFd, entry));
    }
    const postCleanupStat = fsImpl.lstatSync(stagingPath);
    if (!sameSecurityIdentity(descriptorStat, postCleanupStat)) {
      return false;
    }
  } catch {
    return false;
  } finally {
    closeDescriptor(stagingFd, fsImpl);
  }
  try {
    fsImpl.rmdirSync(descriptorEntryPath(rootFd, staging.name));
    fsImpl.fsyncSync(rootFd);
    return true;
  } catch {
    return false;
  }
}

function attachEffects(error, effects) {
  const existing = error?.effects || {};
  const combinedEffects = {
    config_write_performed:
      existing.config_write_performed === true ||
      effects.config_write_performed === true,
    cleanup_performed:
      existing.cleanup_performed === true ||
      effects.cleanup_performed === true,
    durably_committed:
      existing.durably_committed === true ||
      effects.durably_committed === true,
    reconciliation_required:
      existing.reconciliation_required === true ||
      effects.reconciliation_required === true
  };
  if (error?.code?.startsWith?.('owner_mapping_')) {
    error.effects = Object.freeze(combinedEffects);
    return error;
  }
  return createError('owner_mapping_package_apply_failed', combinedEffects);
}

function applyMappingPackage({
  mappingSource,
  privateRoot,
  packageName,
  confirmed = false,
  fsImpl = fs,
  repoRoot = repositoryRoot(),
  platform = process.platform,
  renameNoReplace = renameDirectoryNoReplace
} = {}) {
  if (confirmed !== true) reject('owner_mapping_private_config_confirmation_required');
  const name = validatePackageName(packageName);
  const root = openVerifiedOwnerDirectory(privateRoot, {
    fsImpl,
    repoRoot,
    requireWrite: true,
    platform
  });
  let staging = null;
  let committed = false;
  let writePerformed = false;
  try {
    inspectTargetAbsent(root.fd, name, fsImpl);
    inspectStagingAbsent(root.fd, name, fsImpl);
    probeNoReplacePrimitive(root, { fsImpl, platform });
    const state = parseMappingBytes(readOwnerOnlyPath(mappingSource, {
      fsImpl,
      repoRoot,
      platform
    }));
    const mappingBytes = canonicalMappingBytes(state);
    if (mappingBytes.length > MAX_MAPPING_BYTES) {
      reject('owner_mapping_normalized_size_invalid');
    }
    assertOpenRootIdentity(root, fsImpl);
    staging = createStagingDirectory(root.fd, name, { fsImpl });
    writePerformed = true;
    const packagePath = path.join(root.path, name);
    const bindingBytes = canonicalJsonBytes(buildBinding(state));
    const envBytes = environmentBytes(packagePath, state);

    writeExclusiveDescriptorFile(staging.fd, MAPPING_FILE_NAME, mappingBytes, {
      fsImpl,
      maxBytes: MAX_MAPPING_BYTES
    });
    writeExclusiveDescriptorFile(staging.fd, BINDING_FILE_NAME, bindingBytes, {
      fsImpl,
      maxBytes: MAX_METADATA_BYTES
    });
    writeExclusiveDescriptorFile(staging.fd, ENVIRONMENT_FILE_NAME, envBytes, {
      fsImpl,
      maxBytes: MAX_METADATA_BYTES
    });
    fsImpl.fsyncSync(staging.fd);
    verifyPackageDescriptor(staging.fd, packagePath, { fsImpl });
    staging = Object.freeze({
      ...staging,
      stat: fsImpl.fstatSync(staging.fd)
    });

    inspectTargetAbsent(root.fd, name, fsImpl);
    assertOpenRootIdentity(root, fsImpl);
    assertNamedOwnerDirectoryIdentity(root.fd, staging.name, staging.stat, {
      fsImpl,
      code: 'owner_mapping_staging_identity_changed',
      requireWrite: true
    });
    renameNoReplace(root.fd, staging.name, name, {
      fsImpl,
      platform
    });
    committed = true;
    fsImpl.fsyncSync(root.fd);
    assertOpenRootIdentity(root, fsImpl);

    verifyPackageDescriptor(staging.fd, packagePath, { fsImpl });
    const committedStat = fsImpl.fstatSync(staging.fd);
    assertNamedOwnerDirectoryIdentity(root.fd, name, committedStat, {
      fsImpl,
      code: 'owner_mapping_package_identity_changed',
      exactMode: 0o700
    });
    assertOpenRootIdentity(root, fsImpl);
    closeDescriptor(staging.fd, fsImpl);
    staging = Object.freeze({ ...staging, fd: null, stat: committedStat });

    return lowDisclosureReport('APPLIED', 'apply', {
      mapping_validated: true,
      private_root_validated: true,
      package_binding_matched: true,
      package_target_available: true,
      private_config_write_confirmed: true,
      config_write_performed: true,
      durably_committed: true
    });
  } catch (error) {
    closeDescriptor(staging?.fd, fsImpl);
    let cleanupPerformed = false;
    if (staging && !committed) {
      cleanupPerformed = cleanupStaging(root.fd, staging, { fsImpl });
    }
    throw attachEffects(error, {
      config_write_performed: writePerformed,
      cleanup_performed: cleanupPerformed,
      durably_committed: false,
      reconciliation_required: committed || (writePerformed && !cleanupPerformed)
    });
  } finally {
    closeDescriptor(root.fd, fsImpl);
  }
}

function checkMappingPackage({
  privateRoot,
  packageName,
  fsImpl = fs,
  repoRoot = repositoryRoot(),
  platform = process.platform
} = {}) {
  const name = validatePackageName(packageName);
  const root = openVerifiedOwnerDirectory(privateRoot, {
    fsImpl,
    repoRoot,
    requireWrite: false,
    platform
  });
  try {
    const packageDirectory = openPackageDirectory(root, name, { fsImpl });
    try {
      verifyPackageDescriptor(
        packageDirectory.fd,
        path.join(root.path, name),
        { fsImpl }
      );
      assertOpenPackageIdentity(root, name, packageDirectory, fsImpl);
    } finally {
      closeDescriptor(packageDirectory.fd, fsImpl);
    }
    assertOpenRootIdentity(root, fsImpl);
    return lowDisclosureReport('VALID', 'check', {
      mapping_validated: true,
      private_root_validated: true,
      package_binding_matched: true
    });
  } finally {
    closeDescriptor(root.fd, fsImpl);
  }
}

module.exports = {
  BINDING_FILE_NAME,
  ENVIRONMENT_FILE_NAME,
  EXPORTED_ENVIRONMENT_NAMES,
  MAPPING_FILE_NAME,
  MAX_MAPPING_BYTES,
  PACKAGE_KIND,
  PACKAGE_SCHEMA_VERSION,
  applyMappingPackage,
  checkMappingPackage,
  lowDisclosureReport,
  planMappingPackage,
  renameDirectoryNoReplace
};
