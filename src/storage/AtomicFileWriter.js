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

async function withFileLock(lockPath, handler, options = {}) {
  if (options.enabled === false || !lockPath) {
    return handler();
  }

  const timeoutMs = parsePositiveInteger(options.timeoutMs, 5000);
  const retryMs = parsePositiveInteger(options.retryMs, 25);
  const staleMs = parsePositiveInteger(options.staleMs, 30000);
  const startedAt = Date.now();
  await fs.mkdir(path.dirname(lockPath), { recursive: true });

  while (true) {
    let handle = null;
    let lockAcquired = false;
    try {
      handle = await fs.open(lockPath, 'wx');
      lockAcquired = true;
      await handle.writeFile(JSON.stringify({
        pid: process.pid,
        createdAt: new Date().toISOString()
      }), 'utf8');
      await handle.sync();
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
        const stats = await fs.stat(lockPath);
        if (Date.now() - stats.mtimeMs > staleMs) {
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
      if (handle) {
        try {
          await handle.close();
        } catch {
          // best-effort close before lock cleanup
        }
        await unlinkIfExists(lockPath);
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
  withFileLock
};
