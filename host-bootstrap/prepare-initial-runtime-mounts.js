#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  AUTHORITY_SCHEMA,
  canonicalJson,
  profileAuthorityComponents,
  readBoundedBuffer,
  validateAuthorityRecord,
  validateImageProfile
} = require('../src/runtime/native-image/runtime-authority');

const PLACEHOLDER_SCHEMA = 'codex-memory-initial-bootstrap-mount-placeholder/v1';
const RECEIPT_PLACEHOLDER_SCHEMA = 'codex-memory-ephemeral-receipt-placeholder/v1';
const EDGE_RECEIPT_PATH = '/run/codex-memory/edge-receipt.json';
const PROVIDER_RECEIPT_PATH = '/run/codex-memory/provider-receipt.json';
const RECEIPT_MAX_BYTES = 64 * 1024;
const PLACEHOLDER_MODE = 0o644;
const ROOT_MODE = 0o700;
const CANDIDATE_MAX_BYTES = 2 * 1024 * 1024;
const DEFAULT_CANONICAL_BASE = '/etc/codex-memory/bootstrap';

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function sha256(bytes) {
  return `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;
}

function generationName(value) {
  if (!/^[a-f0-9]{40}$|^[a-f0-9]{64}$/u.test(value || '')) {
    fail('initial_bootstrap_generation_invalid');
  }
  return value;
}

function regularStat(file, {
  fsModule = fs,
  uid = 0,
  gid = 0,
  mode = undefined,
  maxBytes = undefined
} = {}) {
  let stat;
  try { stat = fsModule.lstatSync(file); } catch { fail('bootstrap_staging_source_unavailable'); }
  if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== uid ||
      (gid !== undefined && stat.gid !== gid) || (stat.mode & 0o022) !== 0 ||
      (mode !== undefined && (stat.mode & 0o777) !== mode) ||
      (maxBytes !== undefined && (stat.size < 1 || stat.size > maxBytes))) {
    fail('bootstrap_staging_source_unsafe');
  }
  let real;
  try { real = fsModule.realpathSync(file); } catch { fail('bootstrap_staging_source_unavailable'); }
  if (real !== file) fail('bootstrap_staging_source_unsafe');
  return stat;
}

function secureDirectory(directory, {
  fsModule = fs,
  uid = 0,
  gid = 0,
  create = false,
  requiredMode = undefined
} = {}) {
  if (create) fsModule.mkdirSync(directory, { recursive: true, mode: ROOT_MODE });
  let stat;
  try { stat = fsModule.lstatSync(directory); } catch { fail('bootstrap_staging_root_unavailable'); }
  if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== uid ||
      stat.gid !== gid || (stat.mode & 0o022) !== 0 ||
      (requiredMode !== undefined && (stat.mode & 0o777) !== requiredMode) ||
      fsModule.realpathSync(directory) !== path.resolve(directory)) {
    fail('bootstrap_staging_root_unsafe');
  }
  return stat;
}

function ensureDirectory(directory, options = {}) {
  const fsModule = options.fsModule || fs;
  try {
    return secureDirectory(directory, { ...options, create: false });
  } catch (error) {
    if (error?.code !== 'bootstrap_staging_root_unavailable' || options.create !== true) {
      throw error;
    }
    fsModule.mkdirSync(directory, { recursive: true, mode: ROOT_MODE });
    return secureDirectory(directory, { ...options, create: false });
  }
}

function prepareCanonicalBase(canonicalBase, { fsModule = fs, uid = 0, gid = 0 } = {}) {
  const parent = path.dirname(canonicalBase);
  // The trusted parent must already exist. It is never created or repaired by
  // this tool, so a clean host cannot recursively bootstrap /etc/codex-memory
  // or any higher directory.
  try {
    secureDirectory(parent, { fsModule, uid, gid });
  } catch {
    fail('BLOCKED_BOOTSTRAP_CANONICAL_PARENT_UNSAFE');
  }
  try {
    return secureDirectory(canonicalBase, { fsModule, uid, gid });
  } catch (error) {
    if (error?.code !== 'bootstrap_staging_root_unavailable') throw error;
  }
  // Create exactly one directory level, never recursively. If a concurrent
  // creator wins with EEXIST, the resulting object is revalidated below; an
  // existing object is never chmod-repaired.
  let created = false;
  try {
    fsModule.mkdirSync(canonicalBase, { mode: ROOT_MODE });
    created = true;
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
  }
  if (created) {
    fsModule.chmodSync(canonicalBase, ROOT_MODE);
    const descriptor = fsModule.openSync(parent, fs.constants.O_RDONLY);
    try { fsModule.fsyncSync(descriptor); } finally { fsModule.closeSync(descriptor); }
  }
  return secureDirectory(canonicalBase, { fsModule, uid, gid });
}

function writeExclusive(file, bytes, {
  fsModule = fs,
  uid = 0,
  gid = 0,
  mode = PLACEHOLDER_MODE
} = {}) {
  let descriptor;
  try {
    descriptor = fsModule.openSync(file,
      fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL |
        (fs.constants.O_NOFOLLOW || 0), mode);
    fsModule.writeFileSync(descriptor, bytes);
    fsModule.fchownSync(descriptor, uid, gid);
    fsModule.fchmodSync(descriptor, mode);
    fsModule.fsyncSync(descriptor);
  } catch (error) {
    if (error?.code === 'EEXIST') fail('bootstrap_staging_source_conflict');
    fail('bootstrap_staging_source_create_failed');
  } finally {
    if (descriptor !== undefined) fsModule.closeSync(descriptor);
  }
  regularStat(file, { fsModule, uid, gid, mode, maxBytes: CANDIDATE_MAX_BYTES });
}

function placeholderBytes(generation, role) {
  return Buffer.from(canonicalJson({
    generation,
    placeholder: true,
    role,
    schemaVersion: PLACEHOLDER_SCHEMA
  }));
}

function receiptPlaceholderBytes() {
  return Buffer.from(canonicalJson({
    placeholder: true,
    schemaVersion: RECEIPT_PLACEHOLDER_SCHEMA
  }));
}

function readExact(file, options = {}) {
  const bytes = readBoundedBuffer(file, {
    fsModule: options.fsModule || fs,
    maximumBytes: options.maximumBytes || CANDIDATE_MAX_BYTES,
    requireRootOwner: options.requireRootOwner !== false,
    requireRootOwnedParent: options.requireRootOwnedParent !== false
  });
  return bytes;
}

function inspectPlaceholder(file, generation, role, options = {}) {
  const fsModule = options.fsModule || fs;
  const uid = options.uid === undefined ? 0 : options.uid;
  const gid = options.gid === undefined ? 0 : options.gid;
  const stat = regularStat(file, { fsModule, uid, gid, mode: PLACEHOLDER_MODE });
  let parsed;
  try { parsed = JSON.parse(readExact(file, {
    fsModule,
    requireRootOwner: options.requireRootOwner,
    requireRootOwnedParent: options.requireRootOwnedParent
  }).toString('utf8')); } catch { fail('bootstrap_placeholder_invalid'); }
  if (parsed.generation !== generation || parsed.role !== role ||
      parsed.placeholder !== true || parsed.schemaVersion !== PLACEHOLDER_SCHEMA) {
    fail('bootstrap_staging_source_conflict');
  }
  return { stat, status: 'preserved' };
}

function ensureStagedFile(file, bytes, generation, role, options = {}) {
  const fsModule = options.fsModule || fs;
  const uid = options.uid === undefined ? 0 : options.uid;
  const gid = options.gid === undefined ? 0 : options.gid;
  try {
    fsModule.lstatSync(file);
    try {
      const final = JSON.parse(readExact(file, {
        fsModule,
        requireRootOwner: options.requireRootOwner,
        requireRootOwnedParent: options.requireRootOwnedParent
      }).toString('utf8'));
      // Final records are accepted only by the pair-level check in `stage`.
      // A single valid-looking file must never make a partial pair idempotent.
      void final;
    } catch {}
    return inspectPlaceholder(file, generation, role, options);
  } catch (error) {
    if (error?.code && error.code !== 'ENOENT') throw error;
  }
  writeExclusive(file, bytes, { fsModule, uid, gid, mode: PLACEHOLDER_MODE });
  return { status: 'created' };
}

function ensureReceipt(file, options = {}) {
  const fsModule = options.fsModule || fs;
  const uid = options.uid === undefined ? 0 : options.uid;
  const gid = options.gid === undefined ? 0 : options.gid;
  try {
    regularStat(file, { fsModule, uid, gid, mode: 0o644, maxBytes: RECEIPT_MAX_BYTES });
    // A pre-existing safe receipt source is preserved for the launcher to
    // replace atomically before Runtime start. It is never treated as a fresh
    // current-generation receipt by this tool.
    return 'preserved_not_fresh';
  } catch (error) {
    if (error?.code && error.code !== 'bootstrap_staging_source_unavailable') throw error;
  }
  writeExclusive(file, receiptPlaceholderBytes(), {
    fsModule, uid, gid, mode: PLACEHOLDER_MODE
  });
  return 'created_placeholder_not_fresh';
}

function assertRoot(options = {}) {
  if (options.requireRoot !== false &&
      (typeof process.getuid !== 'function' || process.getuid() !== 0)) {
    fail('initial_bootstrap_root_required');
  }
}

function stage({ generation, root, fsModule = fs, requireRoot = true,
  uid = 0, gid = 0, edgeReceiptPath = EDGE_RECEIPT_PATH,
  providerReceiptPath = PROVIDER_RECEIPT_PATH,
  canonicalBase = DEFAULT_CANONICAL_BASE } = {}) {
  assertRoot({ requireRoot });
  generation = generationName(generation);
  canonicalBase = path.resolve(canonicalBase);
  root = path.resolve(root || path.join(canonicalBase, generation));
  if (root !== path.join(canonicalBase, generation)) {
    fail('initial_bootstrap_generation_root_mismatch');
  }
  prepareCanonicalBase(canonicalBase, { fsModule, uid, gid });
  ensureDirectory(root, { fsModule, uid, gid, create: true });
  secureDirectory(root, { fsModule, uid, gid, requiredMode: ROOT_MODE });
  const authority = path.join(root, 'runtime-authority.json');
  const profile = path.join(root, 'profile-v7.json');
  let materialized = null;
  try {
    const authorityValue = validateAuthorityRecord(JSON.parse(readExact(authority, {
      fsModule, requireRootOwner: requireRoot, requireRootOwnedParent: requireRoot
    }).toString('utf8')));
    const profileValue = validateImageProfile(JSON.parse(readExact(profile, {
      fsModule, requireRootOwner: requireRoot, requireRootOwnedParent: requireRoot
    }).toString('utf8')), profileAuthorityComponents(authorityValue));
    const profileBytes = Buffer.from(canonicalJson(profileValue));
    if (authorityValue.codexMemoryCommit === generation &&
        authorityValue.profilePath === profile &&
        authorityValue.runtimeMountSources?.authority === authority &&
        authorityValue.runtimeMountSources?.profile === profile &&
        authorityValue.runtimeMountSources?.edgeReceipt === edgeReceiptPath &&
        authorityValue.runtimeMountSources?.providerReceipt === providerReceiptPath &&
        authorityValue.profileSha256 === sha256(profileBytes)) {
      materialized = true;
    }
  } catch {}
  if (materialized) {
    ensureDirectory(path.dirname(edgeReceiptPath), { fsModule, uid, gid, create: true });
    const edgeStatus = ensureReceipt(edgeReceiptPath, { fsModule, uid, gid });
    const providerStatus = ensureReceipt(providerReceiptPath, { fsModule, uid, gid });
    return Object.freeze({
      generation,
      authoritySource: { path: authority, status: 'already_materialized' },
      profileSource: { path: profile, status: 'already_materialized' },
      edgeReceiptSource: { path: edgeReceiptPath, status: edgeStatus },
      providerReceiptSource: { path: providerReceiptPath, status: providerStatus },
      productionAuthorityValid: true,
      productionProfileValid: true,
      freshEdgeReceipt: false,
      freshProviderReceipt: false,
      runtimeCreated: false,
      runtimeStarted: false,
      secretValuesReturned: false
    });
  }
  const authorityResult = ensureStagedFile(
    authority, placeholderBytes(generation, 'authority'), generation, 'authority',
    { fsModule, uid, gid, requireRootOwner: requireRoot, requireRootOwnedParent: requireRoot }
  );
  const profileResult = ensureStagedFile(
    profile, placeholderBytes(generation, 'profile'), generation, 'profile',
    { fsModule, uid, gid, requireRootOwner: requireRoot, requireRootOwnedParent: requireRoot }
  );
  ensureDirectory(path.dirname(edgeReceiptPath), { fsModule, uid, gid, create: true });
  const edgeResult = ensureReceipt(edgeReceiptPath, { fsModule, uid, gid });
  const providerResult = ensureReceipt(providerReceiptPath, { fsModule, uid, gid });
  const directory = fsModule.openSync(root, fs.constants.O_RDONLY);
  try { fsModule.fsyncSync(directory); } finally { fsModule.closeSync(directory); }
  return Object.freeze({
    generation,
    authoritySource: { path: authority, status: authorityResult.status },
    profileSource: { path: profile, status: profileResult.status },
    edgeReceiptSource: { path: edgeReceiptPath, status: edgeResult },
    providerReceiptSource: { path: providerReceiptPath, status: providerResult },
    productionAuthorityValid: false,
    productionProfileValid: false,
    freshEdgeReceipt: false,
    freshProviderReceipt: false,
    runtimeCreated: false,
    runtimeStarted: false,
    secretValuesReturned: false
  });
}

function atomicReplace(file, bytes, options = {}) {
  const fsModule = options.fsModule || fs;
  const directory = path.dirname(file);
  const temporary = path.join(directory,
    `.${path.basename(file)}.${crypto.randomBytes(12).toString('hex')}.tmp`);
  const expectedPlaceholder = options.expectedPlaceholder;
  if (expectedPlaceholder) {
    const current = regularStat(file, {
      fsModule,
      uid: options.uid === undefined ? 0 : options.uid,
      gid: options.gid === undefined ? 0 : options.gid,
      mode: PLACEHOLDER_MODE,
      maxBytes: CANDIDATE_MAX_BYTES
    });
    let parsed;
    try {
      parsed = JSON.parse(readExact(file, {
        fsModule,
        requireRootOwner: options.requireRootOwner,
        requireRootOwnedParent: options.requireRootOwnedParent
      }).toString('utf8'));
    } catch {
      fail('bootstrap_staging_source_conflict');
    }
    if (canonicalJson(parsed) !== canonicalJson(expectedPlaceholder)) {
      fail('bootstrap_staging_source_conflict');
    }
    options.expectedIdentity = current;
  }
  // Any failure after the temporary file exists must not leave staging debris
  // behind, so the temporary path is always removed unless the rename consumed it.
  let renamed = false;
  try {
    writeExclusive(temporary, bytes, options);
    if (expectedPlaceholder) {
      const current = regularStat(file, {
        fsModule,
        uid: options.uid === undefined ? 0 : options.uid,
        gid: options.gid === undefined ? 0 : options.gid,
        mode: PLACEHOLDER_MODE,
        maxBytes: CANDIDATE_MAX_BYTES
      });
      if (current.dev !== options.expectedIdentity.dev ||
          current.ino !== options.expectedIdentity.ino ||
          current.size !== options.expectedIdentity.size ||
          current.mtimeMs !== options.expectedIdentity.mtimeMs) {
        fail('bootstrap_staging_source_changed');
      }
    }
    fsModule.renameSync(temporary, file);
    renamed = true;
    const descriptor = fsModule.openSync(directory, fs.constants.O_RDONLY);
    try { fsModule.fsyncSync(descriptor); } finally { fsModule.closeSync(descriptor); }
  } finally {
    if (!renamed) {
      try { fsModule.unlinkSync(temporary); } catch {}
    }
  }
}

function targetState(file, generation, role, options = {}) {
  const bytes = readExact(file, options);
  let value;
  try { value = JSON.parse(bytes.toString('utf8')); } catch {
    fail('bootstrap_staging_source_conflict');
  }
  if (value.placeholder === true) {
    if (value.generation !== generation || value.role !== role ||
        value.schemaVersion !== PLACEHOLDER_SCHEMA) {
      fail('bootstrap_staging_source_conflict');
    }
    return { kind: 'placeholder', value };
  }
  if (role === 'authority') {
    return { kind: 'final', value: validateAuthorityRecord(value) };
  }
  return { kind: 'final', value: validateImageProfile(value) };
}

function materialize({ candidate, generation, root, fsModule = fs,
  requireRoot = true, uid = 0, gid = 0,
  edgeReceiptPath = EDGE_RECEIPT_PATH,
  providerReceiptPath = PROVIDER_RECEIPT_PATH,
  canonicalBase = DEFAULT_CANONICAL_BASE } = {}) {
  assertRoot({ requireRoot });
  generation = generationName(generation);
  canonicalBase = path.resolve(canonicalBase);
  root = path.resolve(root || path.join(canonicalBase, generation));
  if (root !== path.join(canonicalBase, generation)) {
    fail('initial_bootstrap_generation_root_mismatch');
  }
  secureDirectory(canonicalBase, { fsModule, uid, gid });
  secureDirectory(root, { fsModule, uid, gid, requiredMode: ROOT_MODE });
  const authorityPath = path.join(root, 'runtime-authority.json');
  const profilePath = path.join(root, 'profile-v7.json');
  const input = JSON.parse(readExact(candidate, {
    fsModule,
    requireRootOwner: requireRoot,
    requireRootOwnedParent: requireRoot
  }).toString('utf8'));
  if (!input || typeof input !== 'object' || input.authority === undefined ||
      input.profile === undefined || typeof input.profileSha256 !== 'string') {
    fail('bootstrap_materialization_candidate_invalid');
  }
  const authority = validateAuthorityRecord(input.authority);
  const components = profileAuthorityComponents(authority);
  const profile = validateImageProfile(input.profile, components);
  const profileBytes = Buffer.from(canonicalJson(profile));
  if (sha256(profileBytes) !== input.profileSha256 ||
      authority.profileSha256 !== input.profileSha256 ||
      authority.codexMemoryCommit !== generation ||
      authority.profilePath !== profilePath ||
      authority.runtimeMountSources?.authority !== authorityPath ||
      authority.runtimeMountSources?.profile !== profilePath ||
      authority.runtimeMountSources?.edgeReceipt !== edgeReceiptPath ||
      authority.runtimeMountSources?.providerReceipt !== providerReceiptPath) {
    fail('blocked_bootstrap_materialization_binding_mismatch');
  }
  const targetOptions = {
    fsModule, uid, gid, requireRootOwner: requireRoot, requireRootOwnedParent: requireRoot
  };
  const authorityState = targetState(authorityPath, generation, 'authority', targetOptions);
  const profileState = targetState(profilePath, generation, 'profile', targetOptions);
  if (authorityState.kind === 'final' && profileState.kind === 'final') {
    if (canonicalJson(authorityState.value) !== canonicalJson(authority) ||
        canonicalJson(profileState.value) !== canonicalJson(profile)) {
      fail('blocked_bootstrap_materialization_binding_mismatch');
    }
    return Object.freeze({
      generation, authorityPath, profilePath,
      authorityDigest: sha256(Buffer.from(canonicalJson(authority))),
      profileSha256: input.profileSha256,
      atomic: false, twoFileCommitNotAtomic: false,
      perFileAtomicReplacement: false, installed: false,
      alreadyMaterialized: true, runtimeStarted: false, secretValuesReturned: false
    });
  }
  if (authorityState.kind === 'final' &&
      canonicalJson(authorityState.value) !== canonicalJson(authority)) {
    fail('blocked_bootstrap_materialization_binding_mismatch');
  }
  if (profileState.kind === 'final' &&
      canonicalJson(profileState.value) !== canonicalJson(profile)) {
    fail('blocked_bootstrap_materialization_binding_mismatch');
  }
  if (authorityState.kind === 'placeholder') {
    atomicReplace(authorityPath, Buffer.from(canonicalJson(authority)), {
      fsModule, uid, gid, mode: PLACEHOLDER_MODE,
      requireRootOwner: requireRoot, requireRootOwnedParent: requireRoot,
      expectedPlaceholder: authorityState.value
    });
  }
  if (profileState.kind === 'placeholder') {
    atomicReplace(profilePath, profileBytes, {
      fsModule, uid, gid, mode: PLACEHOLDER_MODE,
      requireRootOwner: requireRoot, requireRootOwnedParent: requireRoot,
      expectedPlaceholder: profileState.value
    });
  }
  return Object.freeze({
    generation,
    authorityPath,
    profilePath,
    authorityDigest: sha256(Buffer.from(canonicalJson(authority))),
    profileSha256: input.profileSha256,
    atomic: false,
    twoFileCommitNotAtomic: true,
    perFileAtomicReplacement: true,
    installed: true,
    runtimeStarted: false,
    secretValuesReturned: false
  });
}

function parse(argv) {
  const values = {};
  for (const argument of argv) {
    if (!argument.startsWith('--') && values._ === undefined) {
      values._ = argument;
      continue;
    }
    const match = /^--([a-z0-9-]+)=(.+)$/u.exec(argument);
    if (!match) fail('initial_bootstrap_argument_invalid');
    values[match[1]] = match[2];
  }
  return values;
}

function main(argv = process.argv.slice(2)) {
  const args = parse(argv);
  const action = args.action || args._;
  if (action === 'stage') return process.stdout.write(canonicalJson(stage({
    generation: args.generation,
    root: args.root,
    requireRoot: true
  })));
  if (action === 'materialize') return process.stdout.write(canonicalJson(materialize({
    candidate: args.candidate,
    generation: args.generation,
    root: args.root,
    requireRoot: true
  })));
  fail('initial_bootstrap_action_invalid');
}

if (require.main === module) {
  try { main(); } catch (error) {
    process.stderr.write(`${error?.code || error?.message || 'initial_bootstrap_failed'}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  EDGE_RECEIPT_PATH,
  PROVIDER_RECEIPT_PATH,
  PLACEHOLDER_SCHEMA,
  RECEIPT_PLACEHOLDER_SCHEMA,
  materialize,
  parse,
  stage
};
