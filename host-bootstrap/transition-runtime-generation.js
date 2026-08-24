#!/usr/bin/env node
'use strict';
// POST_PR106_RUNTIME_GENERATION_TRANSITION_SOURCE_REPAIR — Repair B
//
// Coherent host generation transition primitive (root administrative tool).
//
// It is NOT a steady-state runtime launcher and it is NOT the new bundle's
// launcher pretending to be its own trust root. It is a trusted root
// controller that performs the OLD bundle + OLD authority -> NEW bundle +
// NEW authority handoff as a single orchestrated transaction:
//
//   verify OLD pair
//   -> verify NEW candidate pair
//   -> prepare missing ephemeral receipt mount placeholders
//   -> durable PREPARED journal
//   -> preserve OLD authority bytes + OLD bundle bytes
//   -> publish NEW bundle (exact 7-file topology, atomically per file)
//   -> invoke NEW INSTALLED launcher activate NEW authority
//   -> NEW installed launcher verifies NEW active authority
//   -> durable COMMITTED journal
//
// Fixed production targets are hard-coded and cannot be supplied by callers.
// Tests redirect them exclusively through dependency injection (never through
// CLI arguments). The forward activation write always goes through the
// installed host-launcher's activateAuthority()/atomicRootReceipt(); this
// controller only owns bundle state, transaction state, orchestration, and
// rollback/recovery. The one exception is interrupted OLD+NEW recovery, which
// restores the digest-verified, preserved OLD authority bytes directly and
// then re-verifies the restored pair through the installed launcher.
//
// Crash model (documented, not overstated):
//   concurrent mutation safe        : true  (flock lifecycle lock)
//   handled process error rollback  : true
//   interrupted process recoverable : true  (journal + actual pair)
//   pair power-loss atomic          : false (two filesystem objects)

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  AUTHORITY_SCHEMA,
  canonicalJson,
  digest,
  hostTrustBundleDigest,
  readBoundedBuffer,
  sha256Buffer,
  validateAuthorityRecord,
  validateImageProfile,
  profileAuthorityComponents
} = require('../src/runtime/native-image/runtime-authority');
const {
  dockerInspect: hostDockerInspect,
  prepareEphemeralReceiptMountSources,
  requireLifecycleLock
} = require('../deploy/native-runtime/host-launcher');

// ---------------------------------------------------------------------------
// Fixed production targets (caller cannot override these via CLI).
// ---------------------------------------------------------------------------
const INSTALLED_BUNDLE_ROOT = '/usr/local/lib/codex-memory-native-runtime';
const CONTROL_AUTHORITY = '/etc/codex-memory/native-runtime-authority.json';
const LIFECYCLE_LOCK = '/run/codex-memory/host-lifecycle.lock';
const ADMITTED_NODE = '/opt/nodejs/node-v22.23.1/bin/node';
const JOURNAL_ROOT = '/var/lib/codex-memory/generation-transition';
const INSTALLED_LAUNCHER =
  '/usr/local/lib/codex-memory-native-runtime/deploy/native-runtime/host-launcher.js';

// Exact 7-file Host Trust Bundle topology (install-relative paths).
const BUNDLE_FILES = Object.freeze([
  'deploy/native-runtime/host-launcher.js',
  'src/runtime/native-image/runtime-authority.js',
  'src/runtime/native-image/container-policy.js',
  'src/runtime/native-image/native-closure.js',
  'src/runtime/native-image/edge-image-authority.js',
  'src/runtime/native-image/provider-image-authority.js',
  'src/runtime/native-image/tar-archive.js'
]);

const JOURNAL_SCHEMA = 'codex-memory-generation-transition-journal/v1';
const JOURNAL_STATES = Object.freeze([
  'PREPARED', 'BUNDLE_PUBLISHED', 'AUTHORITY_ACTIVATED', 'COMMITTED', 'ROLLED_BACK'
]);
const CANDIDATE_MAX_BYTES = 2 * 1024 * 1024;
const RECOVERY_UNKNOWN = 'generation_transition_recovery_state_invalid';

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function sha256(bytes) {
  return `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;
}

function isSha256(value) {
  return /^sha256:[a-f0-9]{64}$/u.test(value || '');
}

function transactionId(randomBytes = crypto.randomBytes) {
  return randomBytes(12).toString('hex');
}

function parseBoolean(value) {
  return value === 'true';
}

function missingReceiptMountSources(authority, fsModule) {
  const sources = authority?.runtimeMountSources;
  const paths = [sources?.edgeReceipt, sources?.providerReceipt];
  if (paths.some(file => typeof file !== 'string' || path.dirname(file) !== '/run/codex-memory')) {
    fail('generation_transition_receipt_bootstrap_path_invalid');
  }
  return paths.filter(file => {
    try {
      fsModule.lstatSync(file);
      return false;
    } catch (error) {
      if (error?.code === 'ENOENT') return true;
      fail('generation_transition_receipt_bootstrap_observe_failed');
    }
  });
}

function cleanupFailedReceiptBootstrap(files, fsModule) {
  const directories = new Set();
  for (const file of files) {
    let pathStat;
    try { pathStat = fsModule.lstatSync(file); } catch (error) {
      if (error?.code === 'ENOENT') continue;
      fail('generation_transition_receipt_bootstrap_cleanup_failed');
    }
    if (!pathStat.isFile() || pathStat.isSymbolicLink() ||
        pathStat.uid !== 0 || pathStat.gid !== 0 || (pathStat.mode & 0o022) !== 0) {
      fail('generation_transition_receipt_bootstrap_cleanup_failed');
    }
    let descriptor;
    let opened;
    try {
      descriptor = fsModule.openSync(
        file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0)
      );
      opened = fsModule.fstatSync(descriptor);
    } catch {
      fail('generation_transition_receipt_bootstrap_cleanup_failed');
    } finally {
      if (descriptor !== undefined) fsModule.closeSync(descriptor);
    }
    if (!opened.isFile() || opened.uid !== 0 || opened.gid !== 0 ||
        (opened.mode & 0o022) !== 0 || opened.dev !== pathStat.dev ||
        opened.ino !== pathStat.ino) {
      fail('generation_transition_receipt_bootstrap_cleanup_failed');
    }
    let current;
    try { current = fsModule.lstatSync(file); } catch {
      fail('generation_transition_receipt_bootstrap_cleanup_failed');
    }
    if (!current.isFile() || current.isSymbolicLink() ||
        current.dev !== opened.dev || current.ino !== opened.ino) {
      fail('generation_transition_receipt_bootstrap_cleanup_failed');
    }
    try { fsModule.unlinkSync(file); } catch {
      fail('generation_transition_receipt_bootstrap_cleanup_failed');
    }
    directories.add(path.dirname(file));
  }
  for (const directory of directories) {
    let descriptor;
    try {
      descriptor = fsModule.openSync(directory, fs.constants.O_RDONLY);
      fsModule.fsyncSync(descriptor);
    } catch {
      fail('generation_transition_receipt_bootstrap_cleanup_failed');
    } finally {
      if (descriptor !== undefined) fsModule.closeSync(descriptor);
    }
  }
}

function prepareReceiptMountSourcesForTransition(authority, {
  fsModule = fs,
  prepareReceiptMountSources = prepareEphemeralReceiptMountSources
} = {}) {
  const missingBefore = missingReceiptMountSources(authority, fsModule);
  try {
    return prepareReceiptMountSources(authority, { fsModule });
  } catch (error) {
    cleanupFailedReceiptBootstrap(missingBefore, fsModule);
    throw error;
  }
}

function regularStat(file, {
  fsModule = fs, uid = 0, gid = 0, mode = undefined, maxBytes = undefined
} = {}) {
  let stat;
  try { stat = fsModule.lstatSync(file); } catch { fail('generation_transition_source_unavailable'); }
  if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== uid ||
      (gid !== undefined && stat.gid !== gid) || (stat.mode & 0o022) !== 0 ||
      (mode !== undefined && (stat.mode & 0o777) !== mode) ||
      (maxBytes !== undefined && (stat.size < 1 || stat.size > maxBytes))) {
    fail('generation_transition_source_unsafe');
  }
  let real;
  try { real = fsModule.realpathSync(file); } catch { fail('generation_transition_source_unavailable'); }
  if (real !== file) fail('generation_transition_source_unsafe');
  return stat;
}

function secureDirectory(directory, {
  fsModule = fs, uid = 0, gid = 0, create = false, requiredMode = undefined
} = {}) {
  if (create) fsModule.mkdirSync(directory, { recursive: true, mode: 0o700 });
  let stat;
  try { stat = fsModule.lstatSync(directory); } catch { fail('generation_transition_root_unavailable'); }
  if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== uid ||
      stat.gid !== gid || (stat.mode & 0o022) !== 0 ||
      (requiredMode !== undefined && (stat.mode & 0o777) !== requiredMode) ||
      fsModule.realpathSync(directory) !== path.resolve(directory)) {
    fail('generation_transition_root_unsafe');
  }
  return stat;
}

// Root-owned journal root: create if absent, then require the exact security
// posture (0700, root-owned, no group/other writable bits).
function ensureJournalRoot({
  fsModule = fs, journalRoot = JOURNAL_ROOT
} = {}) {
  fsModule.mkdirSync(journalRoot, { recursive: true, mode: 0o700 });
  secureDirectory(journalRoot, { fsModule, uid: 0, gid: 0, requiredMode: 0o700 });
  return journalRoot;
}

// Atomic root-owned file write (temp + fsync + rename + parent fsync).
function atomicRootWrite(file, value, {
  fsModule = fs, uid = 0, gid = 0, mode = 0o600
} = {}) {
  const directory = path.dirname(file);
  secureDirectory(directory, { fsModule, uid, gid });
  const temporary = path.join(
    directory, `.${path.basename(file)}.${crypto.randomBytes(12).toString('hex')}.tmp`
  );
  const descriptor = fsModule.openSync(
    temporary,
    fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY |
      (fs.constants.O_NOFOLLOW || 0),
    mode
  );
  try {
    fsModule.writeFileSync(descriptor, value, 'utf8');
    fsModule.fsyncSync(descriptor);
    fsModule.fchownSync(descriptor, uid, gid);
    fsModule.fchmodSync(descriptor, mode);
  } finally {
    fsModule.closeSync(descriptor);
  }
  fsModule.renameSync(temporary, file);
  const dirDescriptor = fsModule.openSync(directory, fs.constants.O_RDONLY);
  try { fsModule.fsyncSync(dirDescriptor); } finally { fsModule.closeSync(dirDescriptor); }
}

function readRootFile(file, {
  fsModule = fs, maximumBytes = CANDIDATE_MAX_BYTES
} = {}) {
  let bytes;
  try {
    bytes = readBoundedBuffer(file, {
      fsModule, maximumBytes,
      requireRootOwner: true, requireRootOwnedParent: true
    });
  } catch { fail('generation_transition_root_file_unavailable'); }
  return bytes;
}

function readAuthority(file, { fsModule = fs } = {}) {
  const bytes = readRootFile(file, { fsModule });
  let value;
  try { value = JSON.parse(bytes.toString('utf8')); } catch {
    fail('generation_transition_authority_invalid');
  }
  try { return validateAuthorityRecord(value); } catch {
    fail('generation_transition_authority_invalid');
  }
}

// ---------------------------------------------------------------------------
// Bundle digest helpers (content-based; independent of which code is loaded).
// ---------------------------------------------------------------------------
function bundleDigestFromFiles(files, { fsModule = fs } = {}) {
  return hostTrustBundleDigest({
    launcherFile: files['deploy/native-runtime/host-launcher.js'],
    authorityModuleFile: files['src/runtime/native-image/runtime-authority.js'],
    policyModuleFile: files['src/runtime/native-image/container-policy.js'],
    nativeClosureModuleFile: files['src/runtime/native-image/native-closure.js'],
    edgeImageAuthorityModuleFile:
      files['src/runtime/native-image/edge-image-authority.js'],
    providerImageAuthorityModuleFile:
      files['src/runtime/native-image/provider-image-authority.js'],
    tarArchiveModuleFile: files['src/runtime/native-image/tar-archive.js'],
    fsModule
  });
}

function installedBundleDigest({ fsModule = fs } = {}) {
  const files = {};
  for (const relative of BUNDLE_FILES) {
    files[relative] = path.join(INSTALLED_BUNDLE_ROOT, relative);
  }
  return bundleDigestFromFiles(files, { fsModule });
}

// Validate a staged bundle candidate root: exact 7-file topology, regular
// root-owned files, no extra entries. Returns the digest.
function stagedBundleDigest(root, { fsModule = fs } = {}) {
  const files = {};
  const seen = new Set();
  for (const relative of BUNDLE_FILES) {
    const file = path.join(root, relative);
    regularStat(file, { fsModule, uid: 0, gid: 0 });
    files[relative] = file;
    seen.add(relative);
  }
  // Reject any extra regular file/symlink under the staged root.
  const stack = [root];
  while (stack.length > 0) {
    const directory = stack.pop();
    let entries;
    try { entries = fsModule.readdirSync(directory, { withFileTypes: true }); }
    catch { fail('generation_transition_staged_bundle_unreadable'); }
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute);
      if (entry.isDirectory()) {
        stack.push(absolute);
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        if (!seen.has(relative.replaceAll(path.sep, '/'))) {
          fail('generation_transition_staged_bundle_extra_file');
        }
      } else {
        fail('generation_transition_staged_bundle_unsafe_entry');
      }
    }
  }
  return bundleDigestFromFiles(files, { fsModule });
}

// ---------------------------------------------------------------------------
// Docker observation (read-only; never starts/stops containers).
// ---------------------------------------------------------------------------
function containerRunning(dockerInspect, id) {
  if (!id) return false;
  let inspect;
  // Canonical host-launcher dockerInspect(id) signature: the transition only
  // ever observes containers, so the observer is called with the container id
  // directly. All container-ID validation, /usr/bin/docker invocation, inspect
  // parsing and failure semantics come from the one canonical implementation.
  try { inspect = dockerInspect(id); } catch { return false; }
  return inspect?.State?.Running === true;
}

// ---------------------------------------------------------------------------
// Pair verification (candidate mode + pre-transaction checks).
// ---------------------------------------------------------------------------
function verifyOldPair({
  oldAuthorityDigest,
  oldBundleDigest,
  fsModule = fs,
  dockerInspect
} = {}) {
  const authority = readAuthority(CONTROL_AUTHORITY, { fsModule });
  if (digest(authority) !== oldAuthorityDigest) {
    fail('generation_transition_old_authority_digest_mismatch');
  }
  if (installedBundleDigest({ fsModule }) !== oldBundleDigest) {
    fail('generation_transition_old_bundle_digest_mismatch');
  }
  if (containerRunning(dockerInspect, authority.expectedRuntimeContainerId)) {
    fail('generation_transition_old_runtime_active');
  }
  return Object.freeze({ authority, authorityDigest: digest(authority),
    bundleDigest: oldBundleDigest });
}

function verifyNewCandidate({
  newAuthorityCandidate,
  newAuthorityDigest,
  newBundleRoot,
  newBundleDigest,
  fsModule = fs,
  dockerInspect
} = {}) {
  const bytes = readRootFile(newAuthorityCandidate, { fsModule });
  let candidate;
  try { candidate = validateAuthorityRecord(JSON.parse(bytes.toString('utf8'))); }
  catch { fail('generation_transition_new_authority_invalid'); }
  if (digest(candidate) !== newAuthorityDigest) {
    fail('generation_transition_new_authority_digest_mismatch');
  }
  const candidateBundleDigest = stagedBundleDigest(newBundleRoot, { fsModule });
  if (candidateBundleDigest !== newBundleDigest) {
    fail('generation_transition_new_bundle_digest_mismatch');
  }
  if (candidate.hostLauncherDigest !== newBundleDigest) {
    fail('generation_transition_new_authority_bundle_incoherent');
  }
  if (containerRunning(dockerInspect, candidate.expectedRuntimeContainerId)) {
    fail('generation_transition_new_runtime_active');
  }
  // The new profile must exist, be root-owned, and be bound by the candidate.
  let profileBytes;
  try {
    profileBytes = readRootFile(candidate.profilePath, { fsModule });
  } catch { fail('generation_transition_new_profile_unavailable'); }
  if (sha256Buffer(profileBytes) !== candidate.profileSha256) {
    fail('generation_transition_new_profile_sha_mismatch');
  }
  let profile;
  try { profile = JSON.parse(profileBytes.toString('utf8')); }
  catch { fail('generation_transition_new_profile_invalid'); }
  try {
    validateImageProfile(profile, profileAuthorityComponents(candidate));
  } catch { fail('generation_transition_new_profile_authority_mismatch'); }
  return Object.freeze({ candidate, candidateBytes: bytes,
    candidateBundleDigest });
}

function verifyLifecycle({
  dockerInspect,
  edgeContainerId,
  providerContainerId
} = {}) {
  let edge;
  let provider;
  try {
    edge = dockerInspect(edgeContainerId);
    provider = dockerInspect(providerContainerId);
  } catch { fail('generation_transition_lifecycle_identity_invalid'); }
  if (!edge || !provider || edge?.Id !== edgeContainerId ||
      provider?.Id !== providerContainerId) {
    fail('generation_transition_lifecycle_identity_invalid');
  }
  if (edge?.State?.Running !== true || provider?.State?.Running !== true) {
    fail('generation_transition_lifecycle_not_running');
  }
  return true;
}

// ---------------------------------------------------------------------------
// Transaction journal (root-owned, atomic, fsynced).
// ---------------------------------------------------------------------------
function journalFile(transactionId, {
  journalRoot = JOURNAL_ROOT
} = {}) {
  return path.join(journalRoot, `${transactionId}.json`);
}

function writeJournal(transactionId, state, fields, {
  fsModule = fs, journalRoot = JOURNAL_ROOT
} = {}) {
  const value = {
    schemaVersion: JOURNAL_SCHEMA,
    transactionId,
    state,
    updatedAt: new Date().toISOString(),
    ...fields
  };
  atomicRootWrite(journalFile(transactionId, { journalRoot }), canonicalJson(value), {
    fsModule, uid: 0, gid: 0, mode: 0o600
  });
  return value;
}

function readJournalEntries({ fsModule = fs, journalRoot = JOURNAL_ROOT } = {}) {
  let entries;
  try {
    entries = fsModule.readdirSync(journalRoot, { withFileTypes: true });
  } catch { return null; }
  const journalFiles = entries
    .filter(entry => entry.isFile() && /^[a-f0-9]{24}\.json$/u.test(entry.name))
    .map(entry => entry.name);
  const journals = [];
  for (const file of journalFiles) {
    let value;
    try {
      value = JSON.parse(fsModule.readFileSync(path.join(journalRoot, file), 'utf8'));
    } catch { fail('generation_transition_journal_invalid'); }
    const transactionId = path.basename(file, '.json');
    if (value?.schemaVersion !== JOURNAL_SCHEMA ||
        value?.transactionId !== transactionId ||
        !JOURNAL_STATES.includes(value?.state) ||
        !isSha256(value?.oldAuthorityDigest) ||
        !isSha256(value?.oldBundleDigest) ||
        !isSha256(value?.newAuthorityDigest) ||
        !isSha256(value?.newBundleDigest) ||
        typeof value?.updatedAt !== 'string') {
      fail('generation_transition_journal_invalid');
    }
    journals.push(value);
  }
  return journals;
}

function selectRecoveryJournal({
  oldAuthorityDigest,
  oldBundleDigest,
  newAuthorityDigest,
  newBundleDigest,
  pair,
  fsModule = fs,
  journalRoot = JOURNAL_ROOT
} = {}) {
  const journals = readJournalEntries({ fsModule, journalRoot }) || [];
  const oldPair = pair.bundleDigest === oldBundleDigest &&
    pair.authorityDigest === oldAuthorityDigest;
  const newBundleOldAuthority = pair.bundleDigest === newBundleDigest &&
    pair.authorityDigest === oldAuthorityDigest;
  const newPair = pair.bundleDigest === newBundleDigest &&
    pair.authorityDigest === newAuthorityDigest;
  const oldBundleNewAuthority = pair.bundleDigest === oldBundleDigest &&
    pair.authorityDigest === newAuthorityDigest;

  if (oldPair) return { state: 'OLD_PAIR', action: 'none', journal: null };

  const matching = journals.filter(journal =>
    journal.oldAuthorityDigest === oldAuthorityDigest &&
    journal.oldBundleDigest === oldBundleDigest &&
    journal.newAuthorityDigest === newAuthorityDigest &&
    journal.newBundleDigest === newBundleDigest
  );
  const nonTerminal = matching.filter(journal => journal.state !== 'COMMITTED' &&
    journal.state !== 'ROLLED_BACK');
  const committed = matching.filter(journal => journal.state === 'COMMITTED');

  if (newBundleOldAuthority || oldBundleNewAuthority) {
    if (nonTerminal.length > 1) {
      fail('generation_transition_recovery_journal_ambiguous');
    }
    if (nonTerminal.length === 0) fail(RECOVERY_UNKNOWN);
    return { state: 'MIXED_PAIR', action: 'rollback', journal: nonTerminal[0] };
  }
  if (newPair) {
    if (nonTerminal.length > 1 || committed.length > 1) {
      fail('generation_transition_recovery_journal_ambiguous');
    }
    if (nonTerminal.length === 1) {
      return { state: 'NEW_PAIR', action: 'verify_or_commit', journal: nonTerminal[0] };
    }
    if (committed.length === 1) {
      return { state: 'NEW_PAIR', action: 'already_committed', journal: committed[0] };
    }
    fail(RECOVERY_UNKNOWN);
  }
  fail(RECOVERY_UNKNOWN);
}

// ---------------------------------------------------------------------------
// Bundle publish / restore (atomically per file; root-owned).
// ---------------------------------------------------------------------------
function copyFileAtomic(source, target, { fsModule = fs } = {}) {
  const bytes = fsModule.readFileSync(source);
  const directory = path.dirname(target);
  secureDirectory(directory, { fsModule, uid: 0, gid: 0 });
  atomicRootWrite(target, bytes.toString('utf8'), {
    fsModule, uid: 0, gid: 0, mode: 0o644
  });
}

function publishNewBundle(newBundleRoot, { fsModule = fs } = {}) {
  for (const relative of BUNDLE_FILES) {
    copyFileAtomic(
      path.join(newBundleRoot, relative),
      path.join(INSTALLED_BUNDLE_ROOT, relative),
      { fsModule }
    );
  }
}

function backupOldPair(authority, transactionId, {
  fsModule = fs, journalRoot = JOURNAL_ROOT
} = {}) {
  const backupRoot = path.join(journalRoot, transactionId);
  fsModule.mkdirSync(path.join(backupRoot, 'old-bundle'), { recursive: true, mode: 0o700 });
  atomicRootWrite(
    path.join(backupRoot, 'old-authority.json'),
    canonicalJson(authority),
    { fsModule, uid: 0, gid: 0, mode: 0o600 }
  );
  for (const relative of BUNDLE_FILES) {
    const target = path.join(backupRoot, 'old-bundle', relative);
    fsModule.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
    copyFileAtomic(path.join(INSTALLED_BUNDLE_ROOT, relative), target, { fsModule });
  }
}

// Verify the preserved OLD authority backup (exact byte digest) before any
// restore write. A corrupted/missing backup must fail closed without touching
// the control authority.
function verifyOldAuthorityBackup(transactionId, expectedDigest, {
  fsModule = fs, journalRoot = JOURNAL_ROOT
} = {}) {
  const backupRoot = path.join(journalRoot, transactionId);
  let oldBytes;
  try {
    oldBytes = readRootFile(path.join(backupRoot, 'old-authority.json'), { fsModule });
  } catch { fail('generation_transition_old_authority_backup_invalid'); }
  let restored;
  try { restored = JSON.parse(oldBytes.toString('utf8')); } catch {
    fail('generation_transition_old_authority_backup_invalid');
  }
  if (digest(restored) !== expectedDigest) {
    fail('generation_transition_old_authority_backup_invalid');
  }
}

// Verify the preserved OLD bundle backup (exact 7-file topology + digest)
// before any restore write.
function verifyOldBundleBackup(transactionId, expectedDigest, {
  fsModule = fs, journalRoot = JOURNAL_ROOT
} = {}) {
  const backupRoot = path.join(journalRoot, transactionId, 'old-bundle');
  let backupDigest;
  try {
    backupDigest = stagedBundleDigest(backupRoot, { fsModule });
  } catch { fail('generation_transition_old_bundle_backup_invalid'); }
  if (backupDigest !== expectedDigest) {
    fail('generation_transition_old_bundle_backup_invalid');
  }
}

function restoreOldBundle(transactionId, {
  fsModule = fs, journalRoot = JOURNAL_ROOT, expectedDigest
} = {}) {
  if (expectedDigest !== undefined) {
    verifyOldBundleBackup(transactionId, expectedDigest, { fsModule, journalRoot });
  }
  const backupRoot = path.join(journalRoot, transactionId, 'old-bundle');
  for (const relative of BUNDLE_FILES) {
    copyFileAtomic(
      path.join(backupRoot, relative),
      path.join(INSTALLED_BUNDLE_ROOT, relative),
      { fsModule }
    );
  }
}

// ---------------------------------------------------------------------------
// Launcher invocation (the ONLY authority write path).
// ---------------------------------------------------------------------------
function invokeInstalledLauncher(command, authorityFile, {
  execFile = require('node:child_process').execFileSync,
  node = ADMITTED_NODE,
  launcher = INSTALLED_LAUNCHER,
  env = {}
} = {}) {
  let result;
  try {
    const childEnv = { ...process.env, ...env };
    let stdio = ['ignore', 'pipe', 'pipe'];
    const lockFdValue = childEnv.CODEX_MEMORY_HOST_LIFECYCLE_LOCK_FD;
    if (lockFdValue !== undefined) {
      if (!/^\d+$/u.test(lockFdValue)) {
        fail('generation_transition_lifecycle_fd_invalid');
      }
      const lockFd = Number(lockFdValue);
      if (!Number.isSafeInteger(lockFd) || lockFd < 3) {
        fail('generation_transition_lifecycle_fd_invalid');
      }
      try { fs.fstatSync(lockFd); } catch {
        fail('generation_transition_lifecycle_fd_invalid');
      }
      stdio = Array.from({ length: lockFd + 1 }, () => 'ignore');
      stdio[1] = 'pipe';
      stdio[2] = 'pipe';
      stdio[lockFd] = lockFd;
    }
    result = execFile(node, [launcher, command, `--authority=${authorityFile}`], {
      encoding: 'utf8',
      env: childEnv,
      stdio
    });
  } catch {
    // A failing/absent launcher process is a "not accepted" result, never a
    // raw child-process error: every caller converts this into its own
    // deterministic failure code.
    return null;
  }
  let parsed;
  try { parsed = JSON.parse(result); } catch { return null; }
  return parsed;
}

// ---------------------------------------------------------------------------
// Recovery: deterministic interpretation of journal + actual pair.
// ---------------------------------------------------------------------------
function actualPairState({
  fsModule = fs, dockerInspect
} = {}) {
  let authorityDigest = null;
  let authority = null;
  try {
    authority = readAuthority(CONTROL_AUTHORITY, { fsModule });
    authorityDigest = digest(authority);
  } catch { /* absent or invalid */ }
  let bundleDigest = null;
  try { bundleDigest = installedBundleDigest({ fsModule }); } catch { /* absent */ }
  return { authority, authorityDigest, bundleDigest };
}

function recoverInterrupted({
  oldAuthorityDigest,
  oldBundleDigest,
  newAuthorityDigest,
  newBundleDigest,
  fsModule = fs,
  journalRoot = JOURNAL_ROOT
} = {}) {
  const pair = actualPairState({ fsModule });
  const selection = selectRecoveryJournal({
    oldAuthorityDigest, oldBundleDigest, newAuthorityDigest, newBundleDigest,
    pair, fsModule, journalRoot
  });
  const journal = selection.journal;
  const oldPair = pair.bundleDigest === oldBundleDigest &&
    pair.authorityDigest === oldAuthorityDigest;
  const newBundleOldAuthority = pair.bundleDigest === newBundleDigest &&
    pair.authorityDigest === oldAuthorityDigest;
  const newPair = pair.bundleDigest === newBundleDigest &&
    pair.authorityDigest === newAuthorityDigest;
  const oldBundleNewAuthority = pair.bundleDigest === oldBundleDigest &&
    pair.authorityDigest === newAuthorityDigest;

  if (oldPair) {
    // Clean OLD state. If a journal says otherwise, it is stale relative to
    // reality; the pair is coherent OLD+OLD, so there is nothing to restore.
    return { recovered: true, state: 'OLD_PAIR', action: 'none' };
  }
  if (newPair) {
    // NEW+NEW: verify below; if verification fails, caller rolls back.
    return {
      recovered: true,
      state: 'NEW_PAIR',
      action: selection.action,
      journal
    };
  }
  if (newBundleOldAuthority) {
    // Incomplete: restore OLD bundle -> OLD+OLD.
    if (!journal || journal.transactionId === undefined) {
      fail(RECOVERY_UNKNOWN);
    }
    verifyOldBundleBackup(journal.transactionId, oldBundleDigest, { fsModule, journalRoot });
    restoreOldBundle(journal.transactionId, { fsModule, journalRoot, expectedDigest: oldBundleDigest });
    writeJournal(journal.transactionId, 'ROLLED_BACK', {
      oldAuthorityDigest, oldBundleDigest, newAuthorityDigest, newBundleDigest
    }, { fsModule, journalRoot });
    return {
      recovered: true, state: 'ROLLED_BACK', action: 'restored_old_bundle', journal
    };
  }
  if (oldBundleNewAuthority) {
    // Incomplete: authority switched but bundle restored already -> restore
    // OLD authority (only via launcher activate of the preserved OLD bytes is
    // not possible here because the installed launcher is OLD and the OLD
    // authority is its own; so write the preserved bytes through the same
    // atomicRootWrite discipline but never bypass the pair rule: actually the
    // coherent fix is to restore OLD authority bytes AND keep OLD bundle,
    // producing OLD+OLD, then verify).
    if (!journal || journal.transactionId === undefined) {
      fail(RECOVERY_UNKNOWN);
    }
    const backupRoot = path.join(journalRoot, journal.transactionId);
    let oldBytes;
    try {
      oldBytes = readRootFile(path.join(backupRoot, 'old-authority.json'), { fsModule });
    } catch { fail(RECOVERY_UNKNOWN); }
    // Never write preserved bytes that no longer match the OLD authority
    // digest: fail closed on a corrupted backup before touching the control
    // authority.
    verifyOldAuthorityBackup(journal.transactionId, oldAuthorityDigest, {
      fsModule, journalRoot
    });
    atomicRootWrite(CONTROL_AUTHORITY, oldBytes.toString('utf8'), {
      fsModule, uid: 0, gid: 0, mode: 0o644
    });
    writeJournal(journal.transactionId, 'ROLLED_BACK', {
      oldAuthorityDigest, oldBundleDigest, newAuthorityDigest, newBundleDigest
    }, { fsModule, journalRoot });
    return {
      recovered: true, state: 'ROLLED_BACK', action: 'restored_old_authority', journal
    };
  }
  fail(RECOVERY_UNKNOWN);
}

// ---------------------------------------------------------------------------
// Execute transaction.
// ---------------------------------------------------------------------------
function restoreOldAuthority(transactionId, {
  fsModule = fs, journalRoot = JOURNAL_ROOT, expectedDigest
} = {}) {
  if (expectedDigest !== undefined) {
    verifyOldAuthorityBackup(transactionId, expectedDigest, { fsModule, journalRoot });
  }
  const backupRoot = path.join(journalRoot, transactionId);
  const oldBytes = readRootFile(path.join(backupRoot, 'old-authority.json'), { fsModule });
  atomicRootWrite(CONTROL_AUTHORITY, oldBytes.toString('utf8'), {
    fsModule, uid: 0, gid: 0, mode: 0o644
  });
}

// Judge the real filesystem pair after a failure and restore a coherent state.
// Returns 'COMMITTED' (new pair verified), 'ROLLED_BACK', or throws if the
// actual pair is unknown. The original error is always rethrown by the caller
// after a rollback so the operator sees the failure.
function rollbackToCoherentPair({
  transactionId,
  oldAuthorityDigest,
  oldBundleDigest,
  newAuthorityDigest,
  newBundleDigest,
  fsModule = fs,
  journalRoot = JOURNAL_ROOT,
  execFile,
  node = ADMITTED_NODE,
  launcher = INSTALLED_LAUNCHER
} = {}) {
  const pair = actualPairState({ fsModule });
  const newPair = pair.bundleDigest === newBundleDigest &&
    pair.authorityDigest === newAuthorityDigest;
  const newBundleOldAuthority = pair.bundleDigest === newBundleDigest &&
    pair.authorityDigest === oldAuthorityDigest;
  const oldBundleNewAuthority = pair.bundleDigest === oldBundleDigest &&
    pair.authorityDigest === newAuthorityDigest;
  const oldPair = pair.bundleDigest === oldBundleDigest &&
    pair.authorityDigest === oldAuthorityDigest;

  if (newPair) {
    // Case A / Case B: NEW+NEW. Verify reality; if it verifies, the transaction
    // already committed and must not be destroyed by a late journal write.
    try {
      const verified = invokeInstalledLauncher('verify', CONTROL_AUTHORITY, {
        execFile, node, launcher
      });
      if (verified?.accepted === true) {
        try {
          writeJournal(transactionId, 'COMMITTED', {
            oldAuthorityDigest, oldBundleDigest, newAuthorityDigest, newBundleDigest
          }, { fsModule, journalRoot });
        } catch { /* best effort; pair is already coherent NEW+NEW */ }
        return 'COMMITTED';
      }
    } catch { /* fall through to pair rollback */ }
    // Case B: the new pair cannot verify. Validate BOTH preserved backups
    // before any restore so a corrupt journal can never produce a partial
    // cross-generation restore, then restore OLD bundle first and OLD
    // authority second.
    verifyOldAuthorityBackup(transactionId, oldAuthorityDigest, { fsModule, journalRoot });
    verifyOldBundleBackup(transactionId, oldBundleDigest, { fsModule, journalRoot });
    restoreOldBundle(transactionId, { fsModule, journalRoot, expectedDigest: oldBundleDigest });
    restoreOldAuthority(transactionId, { fsModule, journalRoot, expectedDigest: oldAuthorityDigest });
  } else if (newBundleOldAuthority) {
    // Incomplete: NEW bundle + OLD authority -> verify backup, restore OLD
    // bundle.
    verifyOldBundleBackup(transactionId, oldBundleDigest, { fsModule, journalRoot });
    restoreOldBundle(transactionId, { fsModule, journalRoot, expectedDigest: oldBundleDigest });
  } else if (oldBundleNewAuthority) {
    // Incomplete: OLD bundle + NEW authority -> verify backup, restore OLD
    // authority.
    verifyOldAuthorityBackup(transactionId, oldAuthorityDigest, { fsModule, journalRoot });
    restoreOldAuthority(transactionId, { fsModule, journalRoot, expectedDigest: oldAuthorityDigest });
  } else if (!oldPair) {
    fail(RECOVERY_UNKNOWN);
  }
  // Verify the restored OLD pair through the (now OLD) installed launcher.
  // The ROLLED_BACK journal is recorded before that verification so an
  // operator always sees what happened even if the restored pair cannot be
  // verified (the deterministic code below surfaces that condition).
  let verified;
  try {
    verified = invokeInstalledLauncher('verify', CONTROL_AUTHORITY, {
      execFile, node, launcher
    });
  } catch (error) {
    try {
      writeJournal(transactionId, 'ROLLED_BACK', {
        oldAuthorityDigest, oldBundleDigest, newAuthorityDigest, newBundleDigest
      }, { fsModule, journalRoot });
    } catch { /* best effort */ }
    fail('generation_transition_rollback_verify_failed');
  }
  if (!verified || verified.accepted !== true) {
    try {
      writeJournal(transactionId, 'ROLLED_BACK', {
        oldAuthorityDigest, oldBundleDigest, newAuthorityDigest, newBundleDigest
      }, { fsModule, journalRoot });
    } catch { /* best effort */ }
    fail('generation_transition_rollback_verify_failed');
  }
  try {
    writeJournal(transactionId, 'ROLLED_BACK', {
      oldAuthorityDigest, oldBundleDigest, newAuthorityDigest, newBundleDigest
    }, { fsModule, journalRoot });
  } catch { /* best effort */ }
  return 'ROLLED_BACK';
}

function executeTransition({
  oldAuthorityDigest,
  oldBundleDigest,
  newAuthorityCandidate,
  newAuthorityDigest,
  newBundleRoot,
  newBundleDigest,
  fsModule = fs,
  journalRoot = JOURNAL_ROOT,
  dockerInspect,
  execFile,
  prepareReceiptMountSources = prepareEphemeralReceiptMountSources,
  node = ADMITTED_NODE,
  launcher = INSTALLED_LAUNCHER,
  randomBytes = crypto.randomBytes,
  verifyAfter = true
} = {}) {
  // 0) Ensure a root-owned journal root exists (idempotent, never a caller
  // settable path).
  ensureJournalRoot({ fsModule, journalRoot });

  // 1) Interrupted-state recovery first (idempotent).
  const recovery = recoverInterrupted({
    oldAuthorityDigest, oldBundleDigest, newAuthorityDigest, newBundleDigest,
    fsModule, journalRoot
  });
  if (recovery.state === 'NEW_PAIR') {
    // Already NEW+NEW: verify; if it fails, roll back to OLD+OLD.
    try {
      const verified = invokeInstalledLauncher('verify', CONTROL_AUTHORITY, {
        execFile, node, launcher
      });
      if (verified?.accepted === true) {
        if (recovery.action !== 'already_committed') {
          writeJournal(recovery.journal.transactionId, 'COMMITTED', {
            oldAuthorityDigest, oldBundleDigest, newAuthorityDigest, newBundleDigest
          }, { fsModule, journalRoot });
        }
        return Object.freeze({ accepted: true,
          action: 'generation_transition_committed_after_recovery',
          oldAuthorityDigest, oldBundleDigest, newAuthorityDigest, newBundleDigest });
      }
    } catch { /* fall through to rollback */ }
    rollbackToCoherentPair({
      transactionId: recovery.journal?.transactionId,
      oldAuthorityDigest, oldBundleDigest, newAuthorityDigest, newBundleDigest,
      fsModule, journalRoot, execFile, node, launcher
    });
    fail('generation_transition_recovery_new_pair_unverifiable');
  }
  if (recovery.state === 'ROLLED_BACK') {
    const verified = invokeInstalledLauncher('verify', CONTROL_AUTHORITY, {
      execFile, node, launcher
    });
    if (!verified || verified.accepted !== true) {
      fail('generation_transition_recovery_verify_failed');
    }
    return { accepted: true, recovered: true, recovery, action: 'rolled_back_before_transaction' };
  }
  if (recovery.state !== 'OLD_PAIR') {
    fail(RECOVERY_UNKNOWN);
  }

  // 2) Pre-checks (candidate mode semantics, enforced before any mutation).
  const oldPair = verifyOldPair({
    oldAuthorityDigest, oldBundleDigest, fsModule, dockerInspect
  });
  const newPair = verifyNewCandidate({
    newAuthorityCandidate, newAuthorityDigest, newBundleRoot, newBundleDigest,
    fsModule, dockerInspect
  });
  verifyLifecycle({
    dockerInspect,
    edgeContainerId: newPair.candidate.edgeContainerId,
    providerContainerId: newPair.candidate.providerContainerId
  });

  // Receipt mount sources live under /run and may be absent after a fresh
  // host boot. Bootstrap them only in execute mode, after every read-only
  // generation/lifecycle precheck and while the CLI holds the lifecycle lock.
  // Candidate mode never reaches this function. The canonical helper is
  // idempotent, preserves existing receipt files byte/inode-exactly, rejects
  // unsafe paths and refuses to create a missing source for an active Runtime.
  // This is an ephemeral prerequisite, so it deliberately precedes PREPARED:
  // a partial bootstrap cannot imply that generation mutation began.
  prepareReceiptMountSourcesForTransition(newPair.candidate, {
    fsModule, prepareReceiptMountSources
  });

  // 3) Durable PREPARED journal + backups.
  const id = transactionId(randomBytes);
  writeJournal(id, 'PREPARED', {
    oldAuthorityDigest, oldBundleDigest, newAuthorityDigest, newBundleDigest
  }, { fsModule, journalRoot });
  backupOldPair(oldPair.authority, id, { fsModule, journalRoot });

  // 4) Publish NEW bundle, stage candidate, activate, verify, commit.
  try {
    publishNewBundle(newBundleRoot, { fsModule });
    writeJournal(id, 'BUNDLE_PUBLISHED', {
      oldAuthorityDigest, oldBundleDigest, newAuthorityDigest, newBundleDigest
    }, { fsModule, journalRoot });

    const stagedAuthority = path.join(journalRoot, id, 'new-authority.json');
    atomicRootWrite(stagedAuthority, newPair.candidateBytes.toString('utf8'), {
      fsModule, uid: 0, gid: 0, mode: 0o600
    });

    const activated = invokeInstalledLauncher('activate', stagedAuthority, {
      execFile, node, launcher,
      env: { CODEX_MEMORY_HOST_LIFECYCLE_LOCK_FD: process.env.CODEX_MEMORY_HOST_LIFECYCLE_LOCK_FD }
    });
    if (!activated || activated.accepted !== true) {
      fail('generation_transition_authority_activation_failed');
    }
    writeJournal(id, 'AUTHORITY_ACTIVATED', {
      oldAuthorityDigest, oldBundleDigest, newAuthorityDigest, newBundleDigest
    }, { fsModule, journalRoot });

    if (verifyAfter) {
      const verified = invokeInstalledLauncher('verify', CONTROL_AUTHORITY, {
        execFile, node, launcher
      });
      if (!verified || verified.accepted !== true) {
        fail('generation_transition_final_verify_failed');
      }
    }
    writeJournal(id, 'COMMITTED', {
      oldAuthorityDigest, oldBundleDigest, newAuthorityDigest, newBundleDigest
    }, { fsModule, journalRoot });
  } catch (error) {
    const outcome = rollbackToCoherentPair({
      transactionId: id,
      oldAuthorityDigest, oldBundleDigest, newAuthorityDigest, newBundleDigest,
      fsModule, journalRoot, execFile, node, launcher
    });
    if (outcome === 'COMMITTED') {
      return Object.freeze({
        accepted: true,
        action: 'generation_transition_committed_after_failure',
        transactionId: id,
        oldAuthorityDigest, oldBundleDigest, newAuthorityDigest, newBundleDigest
      });
    }
    throw error;
  }
  return Object.freeze({
    accepted: true,
    action: 'generation_transition_committed',
    transactionId: id,
    oldAuthorityDigest,
    oldBundleDigest,
    newAuthorityDigest,
    newBundleDigest
  });
}

// ---------------------------------------------------------------------------
// Candidate mode (zero mutation).
// ---------------------------------------------------------------------------
function candidateTransition({
  oldAuthorityDigest,
  oldBundleDigest,
  newAuthorityCandidate,
  newAuthorityDigest,
  newBundleRoot,
  newBundleDigest,
  fsModule = fs,
  dockerInspect
} = {}) {
  const oldPair = verifyOldPair({
    oldAuthorityDigest, oldBundleDigest, fsModule, dockerInspect
  });
  const newPair = verifyNewCandidate({
    newAuthorityCandidate, newAuthorityDigest, newBundleRoot, newBundleDigest,
    fsModule, dockerInspect
  });
  verifyLifecycle({
    dockerInspect,
    edgeContainerId: newPair.candidate.edgeContainerId,
    providerContainerId: newPair.candidate.providerContainerId
  });
  return Object.freeze({
    accepted: true,
    action: 'generation_transition_candidate',
    mutation: false,
    plannedTransition: {
      oldAuthorityDigest, oldBundleDigest, newAuthorityDigest, newBundleDigest,
      newRuntimeContainerId: newPair.candidate.expectedRuntimeContainerId
    }
  });
}

// ---------------------------------------------------------------------------
// CLI.
// ---------------------------------------------------------------------------
const ALLOWED_ARGUMENTS = Object.freeze([
  'old-authority-digest', 'old-bundle-digest',
  'new-authority-candidate', 'new-authority-digest',
  'new-bundle-root', 'new-bundle-digest', 'execute'
]);

function parseArguments(argv) {
  const values = {};
  for (const arg of argv) {
    const match = /^--([a-z0-9-]+)=(.+)$/u.exec(arg);
    if (!match) fail('generation_transition_argument_invalid');
    if (!ALLOWED_ARGUMENTS.includes(match[1])) {
      // Fixed production targets (install root, authority path, lifecycle
      // lock, Node executable, file list) are never caller-settable.
      fail('generation_transition_target_injection_rejected');
    }
    values[match[1]] = match[2];
  }
  const required = [
    'old-authority-digest', 'old-bundle-digest',
    'new-authority-candidate', 'new-authority-digest',
    'new-bundle-root', 'new-bundle-digest'
  ];
  for (const name of required) {
    if (!values[name]) fail('generation_transition_argument_invalid');
  }
  // Only the four digest fields are sha256 references; the candidate path and
  // staged bundle root are caller-supplied source paths and must not be
  // misvalidated as digests.
  const digestFields = [
    'old-authority-digest', 'old-bundle-digest',
    'new-authority-digest', 'new-bundle-digest'
  ];
  for (const name of digestFields) {
    if (!isSha256(values[name])) fail('generation_transition_digest_invalid');
  }
  return values;
}

function main(argv = process.argv.slice(2), deps = {}) {
  const currentUid = typeof deps.getuid === 'function'
    ? deps.getuid() : (typeof process.getuid === 'function' ? process.getuid() : null);
  if (currentUid !== 0) {
    fail('generation_transition_root_required');
  }
  const args = parseArguments(argv);
  const execute = parseBoolean(args.execute || 'false');
  const common = {
    fsModule: deps.fsModule || fs,
    journalRoot: deps.journalRoot || JOURNAL_ROOT,
    dockerInspect: deps.dockerInspect || hostDockerInspect,
    oldAuthorityDigest: args['old-authority-digest'],
    oldBundleDigest: args['old-bundle-digest'],
    newAuthorityCandidate: path.resolve(args['new-authority-candidate']),
    newAuthorityDigest: args['new-authority-digest'],
    newBundleRoot: path.resolve(args['new-bundle-root']),
    newBundleDigest: args['new-bundle-digest']
  };
  if (!common.dockerInspect) fail('generation_transition_docker_unavailable');

  if (!execute) {
    return candidateTransition(common);
  }

  // Acquire the lifecycle lock when not already under it.
  if (!process.env.CODEX_MEMORY_HOST_LIFECYCLE_LOCK_FD) {
    runUnderLifecycleLock(argv, deps);
    return { accepted: true, action: 'reentered_under_lifecycle_lock' };
  }
  requireLifecycleLock({ lockPath: deps.lockPath || LIFECYCLE_LOCK });

  const transition = deps.executeTransition || executeTransition;
  return transition({
    ...common,
    execFile: deps.execFile,
    node: deps.node || ADMITTED_NODE,
    launcher: deps.launcher || INSTALLED_LAUNCHER,
    prepareReceiptMountSources: deps.prepareReceiptMountSources,
    randomBytes: deps.randomBytes,
    verifyAfter: deps.verifyAfter !== false
  });
}

function runUnderLifecycleLock(argv, deps = {}) {
  const fsModule = deps.fsModule || fs;
  const lockPath = deps.lockPath || LIFECYCLE_LOCK;
  const node = deps.node || ADMITTED_NODE;
  const spawnFile = deps.spawnFile || require('node:child_process').spawnSync;
  const directory = path.dirname(lockPath);
  fsModule.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const result = spawnFile('/bin/bash', [
    '-c',
    // $1 is the lock path (used by `exec 9>"$1"`); shift it away before exec so
    // "$@" resumes at the real script + argv and the re-entered node runs the
    // transition CLI, not the lock file.
    `exec 9>"$1"; /usr/bin/flock --exclusive --nonblock --conflict-exit-code 75 9 || exit $?; export CODEX_MEMORY_HOST_LIFECYCLE_LOCK_FD=9; shift; exec ${JSON.stringify(node)} "$@"`,
    'codex-memory-generation-transition-lock', lockPath, __filename, ...argv
  ], { stdio: 'inherit', env: process.env });
  if (result.status === 75) fail('generation_transition_lifecycle_lock_busy');
  if (result.status !== 0) fail('generation_transition_locked_command_failed');
  return result.status;
}

if (require.main === module) {
  try {
    const output = main(process.argv.slice(2));
    if (output) process.stdout.write(canonicalJson(output));
  } catch (error) {
    process.stderr.write(`${error?.code || error?.message || 'generation_transition_failed'}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  ADMITTED_NODE,
  BUNDLE_FILES,
  CONTROL_AUTHORITY,
  INSTALLED_BUNDLE_ROOT,
  INSTALLED_LAUNCHER,
  JOURNAL_ROOT,
  LIFECYCLE_LOCK,
  JOURNAL_SCHEMA,
  JOURNAL_STATES,
  atomicRootWrite,
  backupOldPair,
  candidateTransition,
  executeTransition,
  installedBundleDigest,
  invokeInstalledLauncher,
  main,
  parseArguments,
  publishNewBundle,
  readAuthority,
  readJournalEntries,
  selectRecoveryJournal,
  recoverInterrupted,
  restoreOldAuthority,
  restoreOldBundle,
  runUnderLifecycleLock,
  stagedBundleDigest,
  transactionId,
  verifyLifecycle,
  verifyNewCandidate,
  verifyOldPair,
  writeJournal
};
