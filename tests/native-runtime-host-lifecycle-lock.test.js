'use strict';
// HOST_LAUNCHER_LIFECYCLE_REENTRY_AND_LOCK_OWNERSHIP_REPAIR
//
// Unit + real util-linux flock tests for the host launcher lifecycle lock.
//
// Defect A contract: requireLifecycleLock() must use the FD-form flock
// (`flock ... <fd>` with NO trailing command) so that success means THIS
// open file description holds (or has just acquired) the lifecycle exclusive
// lock. The old FILE-form (`flock ... <fd> /bin/true`) opened and locked a
// file named "<fd>" in cwd, proved nothing, and left a garbage numeric file.
//
// Defect B/C contract: runUnderLifecycleLock() must shift the lock path away
// before exec and re-enter with the admitted Node 22 binary.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const {
  ADMITTED_NODE,
  DEFAULT_LOCK_PATH,
  requireLifecycleLock,
  runUnderLifecycleLock
} = require('../deploy/native-runtime/host-launcher');

function expectCode(fn, code) {
  assert.throws(fn, error => error?.code === code || error?.message === code);
}

function tmpRoot(t, label) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), label));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function openLockFile(root) {
  const lockPath = path.join(root, 'lifecycle.lock');
  fs.writeFileSync(lockPath, '');
  return { lockPath, fd: fs.openSync(lockPath, 'r+') };
}

// Run /usr/bin/flock in FD form against the given inherited descriptor.
function flockFd(fd, args = ['--exclusive', '--nonblock']) {
  const stdio = ['ignore', 'ignore', 'ignore'];
  while (stdio.length <= fd) stdio.push('ignore');
  stdio[fd] = fd;
  return spawnSync('/usr/bin/flock', [
    ...args, '--conflict-exit-code', '75', String(fd)
  ], { stdio });
}

// Open an independent OFD on the same lock file and try a nonblocking
// exclusive flock; 75 means the first OFD holds the lock.
function independentConflict(lockPath) {
  const fd = fs.openSync(lockPath, 'r+');
  const result = flockFd(fd);
  fs.closeSync(fd);
  return result.status;
}

test('admitted node constant is the frozen Node 22 path', () => {
  assert.equal(ADMITTED_NODE, '/opt/nodejs/node-v22.23.1/bin/node');
});

test('requireLifecycleLock rejects missing or non-numeric env fd', t => {
  const root = tmpRoot(t, 'host-lock-missing-');
  const lockPath = path.join(root, 'lifecycle.lock');
  fs.writeFileSync(lockPath, '');
  for (const fdValue of [undefined, '', 'not-an-fd', '9.5', '-1']) {
    expectCode(
      () => requireLifecycleLock({ fdValue, lockPath }),
      'host_launcher_lifecycle_lock_proof_missing'
    );
  }
});

test('requireLifecycleLock rejects a closed descriptor', t => {
  const root = tmpRoot(t, 'host-lock-closed-');
  const lockPath = path.join(root, 'lifecycle.lock');
  fs.writeFileSync(lockPath, '');
  const fd = fs.openSync(lockPath, 'r+');
  fs.closeSync(fd);
  expectCode(
    () => requireLifecycleLock({ fdValue: String(fd), lockPath }),
    'host_launcher_lifecycle_lock_proof_invalid'
  );
});

test('requireLifecycleLock rejects wrong inode and wrong device', t => {
  const root = tmpRoot(t, 'host-lock-identity-');
  const lockPath = path.join(root, 'lifecycle.lock');
  fs.writeFileSync(lockPath, '');
  const other = path.join(root, 'other-file');
  fs.writeFileSync(other, 'x');
  const fd = fs.openSync(other, 'r+');
  t.after(() => fs.closeSync(fd));
  // fd points at a different inode than the canonical lock path.
  expectCode(
    () => requireLifecycleLock({ fdValue: String(fd), lockPath }),
    'host_launcher_lifecycle_lock_proof_invalid'
  );
  // fd points at the right inode on a different device (mock fsModule).
  const mockFs = {
    fstatSync: () => ({ isFile: () => true, dev: 1, ino: 42 }),
    statSync: () => ({ isFile: () => true, dev: 2, ino: 42 })
  };
  expectCode(
    () => requireLifecycleLock({
      fdValue: '9', lockPath, fsModule: mockFs, spawnFile: () => ({ status: 0 })
    }),
    'host_launcher_lifecycle_lock_proof_invalid'
  );
});

test('requireLifecycleLock issues FD-form flock on the inherited descriptor', t => {
  const root = tmpRoot(t, 'host-lock-form-');
  const { lockPath, fd } = openLockFile(root);
  t.after(() => fs.closeSync(fd));
  let captured;
  const spawnFile = (file, args, options) => {
    captured = { file, args, options };
    return { status: 0 };
  };
  assert.equal(requireLifecycleLock({ fdValue: String(fd), lockPath, spawnFile }), true);
  assert.equal(captured.file, '/usr/bin/flock');
  assert.deepEqual(captured.args, [
    '--exclusive', '--nonblock', '--conflict-exit-code', '75', String(fd)
  ]);
  assert.ok(!captured.args.includes('/bin/true'),
    'FD-form flock must not carry a trailing command (/bin/true)');
  assert.equal(captured.options.stdio[fd], fd,
    'the child must inherit the lock descriptor at the same number');
  // Conflict (rc 75) and other child failures both fail the proof.
  expectCode(
    () => requireLifecycleLock({
      fdValue: String(fd), lockPath, spawnFile: () => ({ status: 75 })
    }),
    'host_launcher_lifecycle_lock_proof_invalid'
  );
  expectCode(
    () => requireLifecycleLock({
      fdValue: String(fd), lockPath, spawnFile: () => ({ status: 1 })
    }),
    'host_launcher_lifecycle_lock_proof_invalid'
  );
});

test('real flock: same OFD already holding the lock is retained (idempotent)', t => {
  const root = tmpRoot(t, 'host-lock-same-ofd-');
  const { lockPath, fd } = openLockFile(root);
  t.after(() => fs.closeSync(fd));
  assert.equal(flockFd(fd).status, 0, 'parent OFD should acquire the exclusive lock');
  // Repeated FD-form revalidation on the same OFD neither deadlocks nor drops.
  assert.equal(requireLifecycleLock({ fdValue: String(fd), lockPath }), true);
  assert.equal(requireLifecycleLock({ fdValue: String(fd), lockPath }), true);
  // An independent OFD must still be rejected while this OFD holds the lock.
  assert.equal(independentConflict(lockPath), 75);
  assert.equal(flockFd(fd).status, 0, 'same-OFD re-lock stays successful');
});

test('real flock: correct-inode initially-unlocked FD acquires the lock on success', t => {
  const root = tmpRoot(t, 'host-lock-acquire-');
  const { lockPath, fd } = openLockFile(root);
  t.after(() => fs.closeSync(fd));
  // fd is open but NOT yet flocked; no other holder exists.
  assert.equal(requireLifecycleLock({ fdValue: String(fd), lockPath }), true);
  // Postcondition: THIS OFD now owns the lock — an independent OFD conflicts.
  assert.equal(independentConflict(lockPath), 75);
});

test('real flock: an independent competing OFD holder rejects the proof', t => {
  const root = tmpRoot(t, 'host-lock-compete-');
  const { lockPath, fd } = openLockFile(root);
  t.after(() => fs.closeSync(fd));
  const holderFd = fs.openSync(lockPath, 'r+');
  t.after(() => fs.closeSync(holderFd));
  assert.equal(flockFd(holderFd).status, 0, 'competing OFD acquires the lock');
  expectCode(
    () => requireLifecycleLock({ fdValue: String(fd), lockPath }),
    'host_launcher_lifecycle_lock_proof_invalid'
  );
  // The competing OFD still holds the lock afterwards.
  assert.equal(flockFd(holderFd).status, 0);
});

test('real flock: no numeric garbage file is created in cwd (FD form)', t => {
  const root = tmpRoot(t, 'host-lock-nogarbage-');
  const { lockPath, fd } = openLockFile(root);
  t.after(() => fs.closeSync(fd));
  const sandbox = path.join(root, 'cwd-sandbox');
  fs.mkdirSync(sandbox);
  const realSpawn = (...args) => spawnSync(...args);
  assert.equal(requireLifecycleLock({
    fdValue: String(fd),
    lockPath,
    spawnFile: (file, args, options) => realSpawn(file, args, { ...options, cwd: sandbox })
  }), true);
  assert.deepEqual(fs.readdirSync(sandbox), [],
    'FILE-form flock would create a file named after the descriptor');
});

test('runUnderLifecycleLock re-entry shifts the lock path and uses admitted Node 22', t => {
  const root = tmpRoot(t, 'host-launcher-shift-');
  const lockPath = path.join(root, 'lifecycle.lock');
  let captured;
  const spawnFile = (file, args, options) => {
    captured = { file, args, options };
    return { status: 0 };
  };
  const argv = ['activate', '--authority=/etc/codex-memory/candidate.json'];
  assert.equal(runUnderLifecycleLock(argv, { spawnFile, lockPath }), 0);
  assert.equal(captured.file, '/bin/bash');
  const script = captured.args[1];
  assert.match(script, /exec 9>"\$1"/);
  assert.match(script, /\/usr\/bin\/flock --exclusive --nonblock --conflict-exit-code 75 9 \|\| exit \$?/);
  assert.match(script, /export CODEX_MEMORY_HOST_LIFECYCLE_LOCK_FD=9;/);
  assert.match(script, /shift; exec "\/opt\/nodejs\/node-v22\.23\.1\/bin\/node" "\$@"/);
  assert.ok(!script.includes('/usr/bin/node'), 're-entry must not use /usr/bin/node');
  assert.ok(!script.includes('env node'), 're-entry must not resolve node via env');
  assert.equal(captured.args[2], 'codex-memory-lifecycle-lock', '$0 is the bash argv0');
  assert.equal(captured.args[3], lockPath, '$1 is the lock path (shifted away before exec)');
  assert.equal(captured.args[4], require.resolve('../deploy/native-runtime/host-launcher'),
    '$2 is the launcher script after shift');
  assert.deepEqual(captured.args.slice(5), argv, 'remaining argv is preserved verbatim');
});

test('runUnderLifecycleLock preserves failure semantics', t => {
  const root = tmpRoot(t, 'host-launcher-fail-');
  const lockPath = path.join(root, 'lifecycle.lock');
  assert.equal(runUnderLifecycleLock(['stop'], {
    spawnFile: () => ({ status: 0 }), lockPath
  }), 0);
  expectCode(
    () => runUnderLifecycleLock(['stop'], {
      spawnFile: () => ({ status: 75 }), lockPath
    }),
    'host_launcher_lifecycle_lock_busy'
  );
  expectCode(
    () => runUnderLifecycleLock(['stop'], {
      spawnFile: () => ({ status: 1 }), lockPath
    }),
    'host_launcher_locked_command_failed'
  );
});

test('canonical lifecycle lock path is unchanged', () => {
  assert.equal(DEFAULT_LOCK_PATH, '/run/codex-memory/host-lifecycle.lock');
});
