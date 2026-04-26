const fs = require('node:fs/promises');
const path = require('node:path');

class CandidateCacheStore {
  constructor(config) {
    this.config = config;
    this.loaded = false;
    this.cache = {
      version: 1,
      updatedAt: null,
      entries: {}
    };
    this.stats = {
      hits: 0,
      misses: 0
    };
  }

  async ensureReady() {
    if (this.loaded) return;
    await fs.mkdir(path.dirname(this.config.candidateCachePath), { recursive: true });

    try {
      const raw = await fs.readFile(this.config.candidateCachePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.entries && typeof parsed.entries === 'object') {
        this.cache = parsed;
      } else {
        await this.flush();
      }
    } catch {
      await this.flush();
    }

    this.pruneExpiredEntries();
    this.loaded = true;
  }

  async flush() {
    this.cache.updatedAt = new Date().toISOString();
    await fs.writeFile(this.config.candidateCachePath, JSON.stringify(this.cache, null, 2), 'utf8');
  }

  async get(key) {
    if (!this.config.enableCandidateCache) return null;
    await this.ensureReady();
    this.pruneExpiredEntries();

    const entry = this.cache.entries[key];
    if (!entry) {
      this.stats.misses += 1;
      return null;
    }

    entry.lastAccessedAt = new Date().toISOString();
    this.stats.hits += 1;
    return entry.value;
  }

  async set(key, value, metadata = {}) {
    if (!this.config.enableCandidateCache) return;
    await this.ensureReady();
    this.pruneExpiredEntries();

    const now = new Date();
    this.cache.entries[key] = {
      key,
      value,
      target: metadata.target || 'both',
      createdAt: now.toISOString(),
      lastAccessedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + this.config.candidateCacheTtlMs).toISOString()
    };

    this.enforceSizeLimit();
    await this.flush();
  }

  async clearAll() {
    await this.ensureReady();
    this.cache.entries = {};
    await this.flush();
  }

  pruneExpiredEntries() {
    const now = Date.now();
    let mutated = false;

    for (const [key, entry] of Object.entries(this.cache.entries || {})) {
      const expiresAt = new Date(entry?.expiresAt || 0).getTime();
      if (!Number.isFinite(expiresAt) || expiresAt <= now) {
        delete this.cache.entries[key];
        mutated = true;
      }
    }

    if (mutated) {
      this.cache.updatedAt = new Date().toISOString();
    }
  }

  enforceSizeLimit() {
    const entries = Object.entries(this.cache.entries || {});
    if (entries.length <= this.config.candidateCacheMaxEntries) return;

    entries
      .sort((left, right) => new Date(left[1].lastAccessedAt || left[1].createdAt || 0).getTime()
        - new Date(right[1].lastAccessedAt || right[1].createdAt || 0).getTime())
      .slice(0, entries.length - this.config.candidateCacheMaxEntries)
      .forEach(([key]) => {
        delete this.cache.entries[key];
      });
  }

  async getHealth() {
    await this.ensureReady();
    this.pruneExpiredEntries();
    return {
      available: this.config.enableCandidateCache,
      candidateCachePath: this.config.candidateCachePath,
      entryCount: Object.keys(this.cache.entries || {}).length,
      maxEntries: this.config.candidateCacheMaxEntries,
      ttlMs: this.config.candidateCacheTtlMs,
      hits: this.stats.hits,
      misses: this.stats.misses,
      updatedAt: this.cache.updatedAt
    };
  }
}

module.exports = {
  CandidateCacheStore
};
