#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const MANIFEST_SCHEMA_VERSION = 1;
const MANIFEST_RELATIVE_PATH =
  'schemas/codex-memory-controller-runtime-manifest-v1.json';
const GIT_ATTRIBUTES_RELATIVE_PATH = '.gitattributes';
const REQUIRED_GIT_ATTRIBUTES_BYTES = Buffer.from(
  '* text=auto eol=lf\n\n*.ps1 text eol=crlf\n',
  'utf8'
);
const CONTENT_ATTRIBUTE_NAMES = Object.freeze([
  'text',
  'eol',
  'ident',
  'filter',
  'working-tree-encoding',
  'crlf'
]);
const SAFE_SHA256_DIGEST = /^sha256:[a-f0-9]{64}$/u;
const SAFE_MANIFEST_PATH =
  /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/u;
const MAXIMUM_MANIFEST_FILES = 2_048;
const REQUIRED_PATHS = Object.freeze([
  GIT_ATTRIBUTES_RELATIVE_PATH,
  'apps/local-recall-relay',
  'package-lock.json',
  'package.json',
  'packages/chatgpt-r4-contracts',
  MANIFEST_RELATIVE_PATH,
  'scripts',
  'src'
].sort());

function codedError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function exactKeys(value, keys) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join('\0') === [...keys].sort().join('\0')
  );
}

function sortedUniquePaths(values) {
  return Array.isArray(values) &&
    values.length > 0 &&
    values.length <= 64 &&
    values.every(value =>
      typeof value === 'string' &&
      SAFE_MANIFEST_PATH.test(value) &&
      path.posix.normalize(value) === value
    ) &&
    values.every((value, index) =>
      index === 0 || values[index - 1] < value
    );
}

function validateManifest(value) {
  if (!exactKeys(value, ['paths', 'schemaVersion']) ||
      value.schemaVersion !== MANIFEST_SCHEMA_VERSION ||
      !sortedUniquePaths(value.paths) ||
      value.paths.join('\0') !== REQUIRED_PATHS.join('\0')) {
    throw codedError('controller_source_manifest_invalid');
  }
  return Object.freeze({
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    paths: Object.freeze([...value.paths])
  });
}

function assertWithinRepository(file, repoRoot) {
  const relative = path.relative(repoRoot, file);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw codedError('controller_source_manifest_path_escape');
  }
  const normalized = relative.split(path.sep).join('/');
  if (!SAFE_MANIFEST_PATH.test(normalized) ||
      path.posix.normalize(normalized) !== normalized) {
    throw codedError('controller_source_manifest_path_invalid');
  }
  return normalized;
}

function fileIdentityMatches(left, right) {
  return Boolean(
    left &&
    right &&
    ['ctimeNs', 'dev', 'ino', 'mode', 'mtimeNs', 'size'].every(key =>
      typeof left[key] === 'bigint' &&
      left[key] === right[key]
    )
  );
}

function readStableRegularFile(file, {
  fsModule = fs
} = {}) {
  const noFollow = fsModule.constants?.O_NOFOLLOW;
  const readOnly = fsModule.constants?.O_RDONLY;
  if (!Number.isInteger(noFollow) || !Number.isInteger(readOnly)) {
    throw codedError('controller_source_manifest_no_follow_unavailable');
  }
  let pathBefore;
  try {
    pathBefore = fsModule.lstatSync(file, { bigint: true });
  } catch {
    throw codedError('controller_source_manifest_file_missing');
  }
  if (!pathBefore.isFile() || pathBefore.isSymbolicLink()) {
    throw codedError('controller_source_manifest_file_type_invalid');
  }
  let descriptor;
  try {
    descriptor = fsModule.openSync(file, readOnly | noFollow);
  } catch {
    throw codedError('controller_source_manifest_file_open_failed');
  }
  try {
    const descriptorBefore = fsModule.fstatSync(descriptor, {
      bigint: true
    });
    if (!descriptorBefore.isFile() ||
        !fileIdentityMatches(pathBefore, descriptorBefore)) {
      throw codedError('controller_source_manifest_file_identity_changed');
    }
    const bytes = fsModule.readFileSync(descriptor);
    const descriptorAfter = fsModule.fstatSync(descriptor, {
      bigint: true
    });
    let pathAfter;
    try {
      pathAfter = fsModule.lstatSync(file, { bigint: true });
    } catch {
      throw codedError('controller_source_manifest_file_identity_changed');
    }
    if (!pathAfter.isFile() ||
        pathAfter.isSymbolicLink() ||
        !fileIdentityMatches(descriptorBefore, descriptorAfter) ||
        !fileIdentityMatches(descriptorAfter, pathAfter) ||
        BigInt(bytes.length) !== descriptorAfter.size) {
      throw codedError('controller_source_manifest_file_identity_changed');
    }
    return Object.freeze({
      bytes,
      stat: descriptorAfter
    });
  } finally {
    fsModule.closeSync(descriptor);
  }
}

function discoverManifestFiles(manifest, {
  fsModule = fs,
  repoRoot = REPO_ROOT
} = {}) {
  const validated = validateManifest(manifest);
  const pending = validated.paths
    .map(relative => path.resolve(repoRoot, relative))
    .sort();
  const files = [];
  while (pending.length > 0) {
    const candidate = pending.shift();
    const relative = assertWithinRepository(candidate, repoRoot);
    let stat;
    try {
      stat = fsModule.lstatSync(candidate);
    } catch {
      throw codedError('controller_source_manifest_file_missing');
    }
    if (stat.isSymbolicLink()) {
      throw codedError('controller_source_manifest_file_type_invalid');
    }
    if (stat.isDirectory()) {
      let children;
      try {
        children = fsModule.readdirSync(candidate);
      } catch {
        throw codedError('controller_source_manifest_directory_invalid');
      }
      if (!Array.isArray(children) ||
          children.some(child =>
            typeof child !== 'string' ||
            child.length === 0 ||
            child === '.' ||
            child === '..'
          )) {
        throw codedError('controller_source_manifest_directory_invalid');
      }
      for (const child of [...children].sort().reverse()) {
        pending.unshift(path.join(candidate, child));
      }
      continue;
    }
    if (!stat.isFile()) {
      throw codedError('controller_source_manifest_file_type_invalid');
    }
    files.push(relative);
    if (files.length > MAXIMUM_MANIFEST_FILES) {
      throw codedError('controller_source_manifest_file_budget_exceeded');
    }
  }
  const sorted = [...new Set(files)].sort();
  if (sorted.length !== files.length) {
    throw codedError('controller_source_manifest_path_overlap');
  }
  return Object.freeze(sorted);
}

function loadManifest({
  fsModule = fs,
  repoRoot = REPO_ROOT
} = {}) {
  const file = path.resolve(repoRoot, MANIFEST_RELATIVE_PATH);
  let parsed;
  try {
    parsed = JSON.parse(
      readStableRegularFile(file, { fsModule }).bytes.toString('utf8')
    );
  } catch {
    throw codedError('controller_source_manifest_json_invalid');
  }
  return validateManifest(parsed);
}

function gitText(args, {
  exec = execFileSync,
  repoRoot = REPO_ROOT
} = {}) {
  return String(exec('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })).trim();
}

function gitBytes(args, input, {
  exec = execFileSync,
  repoRoot = REPO_ROOT
} = {}) {
  const output = exec('git', args, {
    cwd: repoRoot,
    encoding: null,
    env: {
      ...process.env,
      GIT_ATTR_NOSYSTEM: '1'
    },
    input,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  return Buffer.isBuffer(output)
    ? output
    : Buffer.from(String(output), 'utf8');
}

function gitManifestEntries(paths, options = {}) {
  const output = gitText(
    ['ls-tree', '-r', '--full-tree', 'HEAD', '--', ...paths],
    options
  );
  const entries = new Map();
  for (const line of output.split('\n').filter(Boolean)) {
    const match = /^([0-9]{6}) blob ([a-f0-9]{40})\t(.+)$/u.exec(line);
    if (!match || entries.has(match[3])) {
      throw codedError('controller_source_manifest_git_entry_invalid');
    }
    entries.set(match[3], Object.freeze({
      mode: match[1],
      objectId: match[2]
    }));
  }
  return entries;
}

function gitManifestAttributes(files, options = {}) {
  const output = gitBytes([
    '-c',
    'core.attributesFile=/dev/null',
    'check-attr',
    '--source=HEAD',
    '-z',
    '--stdin',
    ...CONTENT_ATTRIBUTE_NAMES
  ], Buffer.from(`${files.join('\0')}\0`, 'utf8'), options);
  const fields = output.toString('utf8').split('\0');
  if (fields.pop() !== '' ||
      fields.length !== files.length * CONTENT_ATTRIBUTE_NAMES.length * 3) {
    throw codedError('controller_source_manifest_git_attributes_invalid');
  }
  const attributes = new Map();
  let offset = 0;
  for (const expectedFile of files) {
    const values = {};
    for (const expectedName of CONTENT_ATTRIBUTE_NAMES) {
      const file = fields[offset++];
      const name = fields[offset++];
      const value = fields[offset++];
      if (file !== expectedFile ||
          name !== expectedName ||
          typeof value !== 'string' ||
          value.length === 0) {
        throw codedError('controller_source_manifest_git_attributes_invalid');
      }
      values[name] = value;
    }
    attributes.set(expectedFile, Object.freeze(values));
  }
  return attributes;
}

function gitBlobObjectId(bytes) {
  const body = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  return crypto.createHash('sha1')
    .update(`blob ${body.length}\0`, 'utf8')
    .update(body)
    .digest('hex');
}

function gitBlobMatchesWorkingTreeBytes(
  expectedObjectId,
  relativeFile,
  bytes,
  attributes
) {
  if (gitBlobObjectId(bytes) === expectedObjectId) return true;
  if (!relativeFile.endsWith('.ps1') ||
      !exactKeys(attributes, CONTENT_ATTRIBUTE_NAMES) ||
      attributes.text !== 'set' ||
      attributes.eol !== 'crlf' ||
      attributes.ident !== 'unspecified' ||
      attributes.filter !== 'unspecified' ||
      attributes['working-tree-encoding'] !== 'unspecified' ||
      attributes.crlf !== 'unspecified' ||
      bytes.includes(0) ||
      !bytes.includes(Buffer.from('\r\n', 'ascii'))) {
    return false;
  }
  const normalized = Buffer.from(
    bytes.toString('latin1').replace(/\r\n/g, '\n'),
    'latin1'
  );
  if (normalized.includes(Buffer.from('\r\n', 'ascii')) ||
      gitBlobObjectId(normalized) !== expectedObjectId) {
    return false;
  }
  const checkoutBytes = Buffer.from(
    normalized.toString('latin1').replace(/\n/g, '\r\n'),
    'latin1'
  );
  return checkoutBytes.equals(bytes);
}

function validateGitAttributesPolicy(files, {
  fsModule = fs,
  repoRoot = REPO_ROOT
} = {}) {
  if (!files.includes(GIT_ATTRIBUTES_RELATIVE_PATH) ||
      files.some(file =>
        file !== GIT_ATTRIBUTES_RELATIVE_PATH &&
        file.endsWith('/.gitattributes')
      )) {
    throw codedError('controller_source_manifest_git_attributes_invalid');
  }
  const file = path.resolve(repoRoot, GIT_ATTRIBUTES_RELATIVE_PATH);
  const { bytes } = readStableRegularFile(file, { fsModule });
  if (!bytes.equals(REQUIRED_GIT_ATTRIBUTES_BYTES)) {
    throw codedError('controller_source_manifest_git_attributes_invalid');
  }
}

function computeManifestDigest(manifest, {
  fsModule = fs,
  repoRoot = REPO_ROOT,
  ...gitOptions
} = {}) {
  const files = discoverManifestFiles(manifest, { fsModule, repoRoot });
  validateGitAttributesPolicy(files, { fsModule, repoRoot });
  const entries = gitManifestEntries(manifest.paths, {
    repoRoot,
    ...gitOptions
  });
  const attributes = gitManifestAttributes(files, {
    repoRoot,
    ...gitOptions
  });
  const trackedFiles = [...entries.keys()].sort();
  if (files.join('\0') !== trackedFiles.join('\0')) {
    throw codedError('controller_source_manifest_git_entry_mismatch');
  }
  const digestInput = [];
  for (const relativeFile of files) {
    const file = path.resolve(repoRoot, relativeFile);
    const stable = readStableRegularFile(file, { fsModule });
    const entry = entries.get(relativeFile);
    if (!['100644', '100755'].includes(entry.mode)) {
      throw codedError('controller_source_manifest_git_mode_invalid');
    }
    const actualMode = (stable.stat.mode & 0o111n) !== 0n
      ? '100755'
      : '100644';
    if (actualMode !== entry.mode) {
      throw codedError('controller_source_manifest_worktree_mode_mismatch');
    }
    const { bytes } = stable;
    if (!gitBlobMatchesWorkingTreeBytes(
      entry.objectId,
      relativeFile,
      bytes,
      attributes.get(relativeFile)
    )) {
      throw codedError('controller_source_manifest_worktree_blob_mismatch');
    }
    const fileDigest = crypto.createHash('sha256')
      .update(bytes)
      .digest('hex');
    digestInput.push(`${relativeFile}\0${entry.mode}\0${fileDigest}\n`);
  }
  return `sha256:${crypto.createHash('sha256')
    .update(digestInput.join(''), 'utf8')
    .digest('hex')}`;
}

function inspectControllerSourceManifest(options = {}) {
  const rejected = () => Object.freeze({
    recognized: false,
    manifestVersion: null,
    manifestDigest: null,
    manifestComplete: false,
    manifestScopeClean: false,
    fileCount: 0
  });
  try {
    const manifest = loadManifest(options);
    const files = discoverManifestFiles(manifest, options);
    const manifestDigest = computeManifestDigest(manifest, options);
    if (!SAFE_SHA256_DIGEST.test(manifestDigest)) return rejected();
    const manifestScopeClean = gitText([
      'status',
      '--porcelain=v1',
      '--untracked-files=all',
      '--',
      ...manifest.paths
    ], options) === '';
    return Object.freeze({
      recognized: manifestScopeClean,
      manifestVersion: manifest.schemaVersion,
      manifestDigest,
      manifestComplete: true,
      manifestScopeClean,
      fileCount: files.length
    });
  } catch {
    return rejected();
  }
}

function main(argv = process.argv.slice(2)) {
  if (argv.length === 1 && argv[0] === '--print-files') {
    const manifest = loadManifest();
    process.stdout.write(`${JSON.stringify(
      discoverManifestFiles(manifest),
      null,
      2
    )}\n`);
    return;
  }
  if (argv.length === 1 && argv[0] === '--verify') {
    const result = inspectControllerSourceManifest();
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (!result.recognized) process.exitCode = 1;
    return;
  }
  process.stderr.write(
    'Usage: node scripts/codex-memory-controller-source-manifest.js ' +
    '<--print-files|--verify>\n'
  );
  process.exitCode = 1;
}

if (require.main === module) main();

module.exports = {
  CONTENT_ATTRIBUTE_NAMES,
  GIT_ATTRIBUTES_RELATIVE_PATH,
  MANIFEST_RELATIVE_PATH,
  MANIFEST_SCHEMA_VERSION,
  MAXIMUM_MANIFEST_FILES,
  REQUIRED_PATHS,
  computeManifestDigest,
  discoverManifestFiles,
  gitBlobObjectId,
  gitBlobMatchesWorkingTreeBytes,
  gitManifestAttributes,
  inspectControllerSourceManifest,
  loadManifest,
  readStableRegularFile,
  validateManifest
};
