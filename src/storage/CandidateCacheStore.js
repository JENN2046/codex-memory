const fs = require('node:fs/promises');
const path = require('node:path');

class CandidateCacheStore {
  constructor(config) {
    this.config = config;
    this.loaded = false;
    this.cache = {
      version: 2,
      updatedAt: null,
      fingerprintMetadata: {},
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
        this.ensureMetadataShape();
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
    if (!entry || entry.embeddingFingerprint !== this.config.embeddingFingerprint) {
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
    const memoryIds = [...new Set((Array.isArray(metadata.memoryIds) ? metadata.memoryIds : [])
      .map(memoryId => String(memoryId || '').trim())
      .filter(Boolean))].sort();
    this.cache.entries[key] = {
      key,
      value,
      target: metadata.target || 'both',
      memoryIds,
      embeddingFingerprint: this.config.embeddingFingerprint,
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
    this.cache.fingerprintMetadata = {};
    await this.flush();
  }

  async clearCurrentFingerprint() {
    await this.ensureReady();
    let removedEntries = 0;
    let removedMetadata = false;
    for (const [key, entry] of Object.entries(this.cache.entries || {})) {
      if (entry?.embeddingFingerprint === this.config.embeddingFingerprint) {
        delete this.cache.entries[key];
        removedEntries += 1;
      }
    }
    if (this.cache.fingerprintMetadata?.[this.config.embeddingFingerprint]) {
      delete this.cache.fingerprintMetadata[this.config.embeddingFingerprint];
      removedMetadata = true;
    }
    if (removedEntries > 0 || removedMetadata) {
      await this.flush();
    }
    return removedEntries;
  }

  async clearCurrentFingerprintTargets(targets = []) {
    await this.ensureReady();
    const normalizedTargets = new Set(
      (Array.isArray(targets) ? targets : [targets])
        .map(target => String(target || '').trim())
        .filter(Boolean)
    );

    if (normalizedTargets.size === 0) {
      return 0;
    }

    let removedEntries = 0;
    let removedMetadata = false;

    for (const [key, entry] of Object.entries(this.cache.entries || {})) {
      if (entry?.embeddingFingerprint !== this.config.embeddingFingerprint) {
        continue;
      }
      const entryTarget = String(entry?.target || 'both');
      if (normalizedTargets.has(entryTarget)) {
        delete this.cache.entries[key];
        removedEntries += 1;
      }
    }

    const fingerprintMetadata = this.getCurrentFingerprintMetadata(false);
    const revisionMap = fingerprintMetadata?.governanceStateRevisionByTarget || null;
    const entriesMap = fingerprintMetadata?.governanceStateEntriesByTarget || null;
    if (revisionMap) {
      for (const target of normalizedTargets) {
        if (Object.prototype.hasOwnProperty.call(revisionMap, target)) {
          delete revisionMap[target];
          removedMetadata = true;
        }
      }
    }
    if (entriesMap) {
      for (const target of normalizedTargets) {
        if (Object.prototype.hasOwnProperty.call(entriesMap, target)) {
          delete entriesMap[target];
          removedMetadata = true;
        }
      }
    }

    if (removedEntries > 0 || removedMetadata) {
      await this.flush();
    }

    return removedEntries;
  }

  async clearCurrentFingerprintByMemoryIds(memoryIds = [], targets = []) {
    await this.ensureReady();
    const normalizedMemoryIds = new Set(
      (Array.isArray(memoryIds) ? memoryIds : [memoryIds])
        .map(memoryId => String(memoryId || '').trim())
        .filter(Boolean)
    );
    if (normalizedMemoryIds.size === 0) {
      return 0;
    }

    const normalizedTargets = new Set(
      (Array.isArray(targets) ? targets : [targets])
        .map(target => String(target || '').trim())
        .filter(Boolean)
    );

    let removedEntries = 0;

    for (const [key, entry] of Object.entries(this.cache.entries || {})) {
      if (entry?.embeddingFingerprint !== this.config.embeddingFingerprint) {
        continue;
      }

      const entryMemoryIds = Array.isArray(entry?.memoryIds)
        ? entry.memoryIds.map(memoryId => String(memoryId || '').trim()).filter(Boolean)
        : [];
      const hasDependencyMatch = entryMemoryIds.some(memoryId => normalizedMemoryIds.has(memoryId));
      const fallbackTargetMatch = normalizedTargets.size > 0
        && normalizedTargets.has(String(entry?.target || 'both'));

      if (hasDependencyMatch || (entryMemoryIds.length === 0 && fallbackTargetMatch)) {
        delete this.cache.entries[key];
        removedEntries += 1;
      }
    }

    if (removedEntries > 0) {
      await this.flush();
    }

    return removedEntries;
  }

  async getStoredGovernanceStateRevision(target = 'both') {
    if (!this.config.enableCandidateCache) return '';
    await this.ensureReady();
    const fingerprintMetadata = this.getCurrentFingerprintMetadata(false);
    const revision = fingerprintMetadata?.governanceStateRevisionByTarget?.[String(target || 'both')];
    return typeof revision === 'string' ? revision : '';
  }

  async getStoredGovernanceStateEntries(target = 'both') {
    if (!this.config.enableCandidateCache) return null;
    await this.ensureReady();
    const fingerprintMetadata = this.getCurrentFingerprintMetadata(false);
    const entries = fingerprintMetadata?.governanceStateEntriesByTarget?.[String(target || 'both')];
    if (!Array.isArray(entries)) {
      return null;
    }
    return entries
      .filter(entry => entry && typeof entry === 'object')
      .map(entry => ({ ...entry }));
  }

  async setStoredGovernanceStateRevision(target = 'both', revision = '') {
    if (!this.config.enableCandidateCache) return '';
    await this.ensureReady();
    const normalizedTarget = String(target || 'both');
    const normalizedRevision = typeof revision === 'string' ? revision : '';
    const fingerprintMetadata = this.getCurrentFingerprintMetadata(true);
    const current = fingerprintMetadata.governanceStateRevisionByTarget[normalizedTarget] || '';

    if (current === normalizedRevision) {
      return normalizedRevision;
    }

    if (normalizedRevision) {
      fingerprintMetadata.governanceStateRevisionByTarget[normalizedTarget] = normalizedRevision;
    } else {
      delete fingerprintMetadata.governanceStateRevisionByTarget[normalizedTarget];
    }

    await this.flush();
    return normalizedRevision;
  }

  async setStoredGovernanceStateEntries(target = 'both', entries = null) {
    if (!this.config.enableCandidateCache) return null;
    await this.ensureReady();
    const normalizedTarget = String(target || 'both');
    const fingerprintMetadata = this.getCurrentFingerprintMetadata(true);
    const normalizedEntries = Array.isArray(entries)
      ? entries
        .filter(entry => entry && typeof entry === 'object')
        .map(entry => ({ ...entry }))
        .sort((left, right) => String(left.memoryId || '').localeCompare(String(right.memoryId || '')))
      : null;
    const current = fingerprintMetadata.governanceStateEntriesByTarget[normalizedTarget] || null;

    if (JSON.stringify(current) === JSON.stringify(normalizedEntries)) {
      return normalizedEntries;
    }

    if (normalizedEntries && normalizedEntries.length > 0) {
      fingerprintMetadata.governanceStateEntriesByTarget[normalizedTarget] = normalizedEntries;
    } else {
      delete fingerprintMetadata.governanceStateEntriesByTarget[normalizedTarget];
    }

    await this.flush();
    return normalizedEntries;
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
    const fingerprintMetadata = this.getCurrentFingerprintMetadata(false);
    return {
      available: this.config.enableCandidateCache,
      candidateCachePath: this.config.candidateCachePath,
      embeddingFingerprint: this.config.embeddingFingerprint,
      entryCount: Object.keys(this.cache.entries || {}).length,
      maxEntries: this.config.candidateCacheMaxEntries,
      ttlMs: this.config.candidateCacheTtlMs,
      hits: this.stats.hits,
      misses: this.stats.misses,
      governanceStateRevisionTargets: Object.keys(fingerprintMetadata?.governanceStateRevisionByTarget || {}).sort(),
      updatedAt: this.cache.updatedAt
    };
  }

  ensureMetadataShape() {
    if (!this.cache || typeof this.cache !== 'object') {
      this.cache = { version: 2, updatedAt: null, fingerprintMetadata: {}, entries: {} };
      return;
    }
    if (!this.cache.entries || typeof this.cache.entries !== 'object') {
      this.cache.entries = {};
    }
    if (!this.cache.fingerprintMetadata || typeof this.cache.fingerprintMetadata !== 'object') {
      this.cache.fingerprintMetadata = {};
    }
    this.cache.version = Math.max(Number(this.cache.version) || 0, 2);
  }

  getCurrentFingerprintMetadata(create = false) {
    this.ensureMetadataShape();
    const key = this.config.embeddingFingerprint;
    const existing = this.cache.fingerprintMetadata[key];
    if (existing && typeof existing === 'object') {
      if (!existing.governanceStateRevisionByTarget || typeof existing.governanceStateRevisionByTarget !== 'object') {
        existing.governanceStateRevisionByTarget = {};
      }
      if (!existing.governanceStateEntriesByTarget || typeof existing.governanceStateEntriesByTarget !== 'object') {
        existing.governanceStateEntriesByTarget = {};
      }
      return existing;
    }
    if (!create) {
      return null;
    }
    const next = {
      governanceStateRevisionByTarget: {},
      governanceStateEntriesByTarget: {}
    };
    this.cache.fingerprintMetadata[key] = next;
    return next;
  }
}

module.exports = {
  CandidateCacheStore
};
