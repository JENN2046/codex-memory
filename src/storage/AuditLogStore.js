const fs = require('node:fs/promises');
const path = require('node:path');

const DEFAULT_AUDIT_WINDOW = 500;
const MAX_AUDIT_BYTES = 1024 * 1024;

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

class AuditLogStore {
  constructor(config) {
    this.config = config;
  }

  async ensureReady() {
    await fs.mkdir(path.dirname(this.config.auditLogPath), { recursive: true });
    await fs.mkdir(path.dirname(this.config.recallLogPath), { recursive: true });

    if (!(await pathExists(this.config.auditLogPath))) {
      await fs.writeFile(this.config.auditLogPath, '', 'utf8');
    }

    if (!(await pathExists(this.config.recallLogPath))) {
      await fs.writeFile(this.config.recallLogPath, '', 'utf8');
    }
  }

  async appendWriteAudit(entry) {
    await this.ensureReady();
    await fs.appendFile(this.config.auditLogPath, `${JSON.stringify(entry)}\n`, 'utf8');
  }

  async appendRecallAudit(entry) {
    await this.ensureReady();
    await fs.appendFile(this.config.recallLogPath, `${JSON.stringify(entry)}\n`, 'utf8');
  }

  async readRecentWriteAudit(maxLines = DEFAULT_AUDIT_WINDOW, maxBytes = MAX_AUDIT_BYTES) {
    return this.readRecentJsonlEntries(this.config.auditLogPath, maxLines, maxBytes);
  }

  async readRecentRecallAudit(maxLines = DEFAULT_AUDIT_WINDOW, maxBytes = MAX_AUDIT_BYTES) {
    return this.readRecentJsonlEntries(this.config.recallLogPath, maxLines, maxBytes);
  }

  async readRecentJsonlEntries(filePath, maxLines = DEFAULT_AUDIT_WINDOW, maxBytes = MAX_AUDIT_BYTES) {
    if (!(await pathExists(filePath))) return [];

    const stats = await fs.stat(filePath);
    const start = Math.max(0, stats.size - maxBytes);
    const handle = await fs.open(filePath, 'r');

    try {
      const buffer = Buffer.alloc(stats.size - start);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, start);
      let content = buffer.toString('utf8', 0, bytesRead);

      if (start > 0) {
        const firstNewline = content.indexOf('\n');
        content = firstNewline >= 0 ? content.slice(firstNewline + 1) : '';
      }

      return content
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .slice(-maxLines)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    } finally {
      await handle.close();
    }
  }
}

module.exports = {
  AuditLogStore,
  DEFAULT_AUDIT_WINDOW,
  MAX_AUDIT_BYTES,
  pathExists
};
