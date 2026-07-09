const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function unlinkIfExists(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
}

function parseLockMetadata(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

async function readLockMetadata(lockPath) {
  try {
    return parseLockMetadata(await fs.readFile(lockPath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function isProcessAlive(pid) {
  const normalizedPid = Number(pid);
  if (!Number.isInteger(normalizedPid) || normalizedPid <= 0) {
    return false;
  }
  try {
    process.kill(normalizedPid, 0);
    return true;
  } catch (error) {
    if (error?.code === 'ESRCH') {
      return false;
    }
    if (error?.code === 'EPERM') {
      return true;
    }
    return true;
  }
}

async function isLockStale(lockPath, staleMs) {
  const stats = await fs.stat(lockPath);
  if (Date.now() - stats.mtimeMs <= staleMs) {
    return false;
  }

  const metadata = await readLockMetadata(lockPath);
  if (metadata?.pid && isProcessAlive(metadata.pid)) {
    return false;
  }
  return true;
}

async function unlinkLockIfOwned(lockPath, ownerToken) {
  const metadata = await readLockMetadata(lockPath);
  if (metadata?.ownerToken !== ownerToken) {
    return false;
  }
  await unlinkIfExists(lockPath);
  return true;
}

async function withFileLock(lockPath, handler, options = {}) {
  if (options.enabled === false || !lockPath) {
    return handler();
  }

  const timeoutMs = parsePositiveInteger(options.timeoutMs, 5000);
  const retryMs = parsePositiveInteger(options.retryMs, 25);
  const staleMs = parsePositiveInteger(options.staleMs, 30000);
  const heartbeatMs = Math.min(
    parsePositiveInteger(options.heartbeatMs, Math.max(1000, Math.floor(staleMs / 3))),
    Math.max(1, staleMs)
  );
  const startedAt = Date.now();
  await fs.mkdir(path.dirname(lockPath), { recursive: true });

  while (true) {
    let handle = null;
    let lockAcquired = false;
    let heartbeat = null;
    const ownerToken = crypto.randomBytes(16).toString('hex');
    try {
      handle = await fs.open(lockPath, 'wx');
      lockAcquired = true;
      await handle.writeFile(JSON.stringify({
        pid: process.pid,
        ownerToken,
        createdAt: new Date().toISOString()
      }), 'utf8');
      await handle.sync();
      heartbeat = setInterval(() => {
        fs.utimes(lockPath, new Date(), new Date()).catch(() => {});
      }, heartbeatMs);
      if (typeof heartbeat.unref === 'function') {
        heartbeat.unref();
      }
      return await handler();
    } catch (error) {
      if (handle) {
        try {
          await handle.close();
        } catch {
          // best-effort close before retrying or rethrowing
        }
        handle = null;
      }

      if (lockAcquired || error?.code !== 'EEXIST') {
        throw error;
      }

      try {
        if (await isLockStale(lockPath, staleMs)) {
          await unlinkIfExists(lockPath);
          continue;
        }
      } catch (statError) {
        if (statError?.code !== 'ENOENT') {
          throw statError;
        }
      }

      if (Date.now() - startedAt >= timeoutMs) {
        throw new Error(`timed out waiting for file lock: ${lockPath}`);
      }
      await sleep(retryMs);
    } finally {
      if (heartbeat) {
        clearInterval(heartbeat);
      }
      if (handle) {
        try {
          await handle.close();
        } catch {
          // best-effort close before lock cleanup
        }
        await unlinkLockIfOwned(lockPath, ownerToken);
      }
    }
  }
}

async function atomicWriteFile(filePath, content, options = {}) {
  const lockPath = options.lock === false ? null : (options.lockPath || `${filePath}.lock`);
  return withFileLock(lockPath, async () => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const tempPath = path.join(
      path.dirname(filePath),
      `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${crypto.randomBytes(6).toString('hex')}.tmp`
    );
    let handle = null;
    try {
      handle = await fs.open(tempPath, 'wx');
      await handle.writeFile(content, options.encoding || 'utf8');
      await handle.sync();
      await handle.close();
      handle = null;
      await fs.rename(tempPath, filePath);
    } catch (error) {
      if (handle) {
        try {
          await handle.close();
        } catch {
          // best-effort close before temp cleanup
        }
      }
      await unlinkIfExists(tempPath);
      throw error;
    }
  }, options.lockOptions || {});
}

async function quarantineFile(filePath, reason = 'corrupt_file', options = {}) {
  const lockPath = options.lock === false ? null : (options.lockPath || `${filePath}.lock`);
  return withFileLock(lockPath, async () => {
    try {
      await fs.access(filePath);
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return {
          quarantined: false,
          reason: 'source_missing',
          sourcePath: filePath,
          quarantinePath: null,
          timestamp: null
        };
      }
      throw error;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const quarantinePath = `${filePath}.corrupt-${timestamp}-${crypto.randomBytes(6).toString('hex')}`;
    await fs.rename(filePath, quarantinePath);
    return {
      quarantined: true,
      reason,
      sourcePath: filePath,
      quarantinePath,
      timestamp
    };
  }, options.lockOptions || {});
}

module.exports = {
  atomicWriteFile,
  quarantineFile,
  isLockStale,
  withFileLock
};
