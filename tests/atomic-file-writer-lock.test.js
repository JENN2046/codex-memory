const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  isLockStale,
  withFileLock
} = require('../src/storage/AtomicFileWriter');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

test('withFileLock does not break a live lock only because mtime exceeded staleMs', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'atomic-file-writer-lock-'));
  const lockPath = path.join(tempDir, 'resource.lock');
  let secondEntered = false;

  try {
    const first = withFileLock(lockPath, async () => {
      await sleep(160);
      return 'first';
    }, {
      staleMs: 50,
      heartbeatMs: 500,
      retryMs: 10,
      timeoutMs: 500
    });

    await sleep(80);

    await assert.rejects(
      () => withFileLock(lockPath, async () => {
        secondEntered = true;
      }, {
        staleMs: 50,
        heartbeatMs: 500,
        retryMs: 10,
        timeoutMs: 60
      }),
      /timed out waiting for file lock/
    );

    assert.equal(secondEntered, false);
    assert.equal(await first, 'first');
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('isLockStale treats old lock with live pid as active', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'atomic-file-writer-lock-'));
  const lockPath = path.join(tempDir, 'resource.lock');

  try {
    await fs.writeFile(lockPath, JSON.stringify({
      pid: process.pid,
      ownerToken: 'live-owner',
      createdAt: new Date(Date.now() - 10000).toISOString()
    }), 'utf8');
    const oldDate = new Date(Date.now() - 10000);
    await fs.utimes(lockPath, oldDate, oldDate);

    assert.equal(await isLockStale(lockPath, 50), false);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
