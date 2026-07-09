const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const { atomicWriteFile, quarantineFile } = require('./AtomicFileWriter');
const { filterRecallIsolatedItems, isRecallIsolated } = require('../core/RecallIsolationClassifier');

function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length || left.length === 0) {
    return 0;
  }

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] || 0;
    const rightValue = right[index] || 0;
    dot += leftValue * rightValue;
    leftNorm += leftValue * leftValue;
    rightNorm += rightValue * rightValue;
  }

  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function firstNonEmptyString(...values) {
  for (const value of values) {
    const normalized = String(value || '').trim();
    if (normalized) return normalized;
  }
  return '';
}

function getRecordMemoryId(record) {
  return firstNonEmptyString(record?.memoryId, record?.memory_id);
}

class VectorIndexStore {
  constructor(config, { externalEmbeddingAdapter = null } = {}) {
    this.config = config;
    this.externalEmbeddingAdapter = externalEmbeddingAdapter;
    this.loaded = false;
    this.stats = {
      embeddingHits: 0,
      embeddingMisses: 0
    };
    this.index = this.createEmptyIndex();
    this.corruptionQuarantine = null;
  }

  createEmptyIndex() {
    return {
      version: 3,
      embeddingFingerprint: this.config.embeddingFingerprint,
      updatedAt: null,
      vectors: {},
      embeddingCache: {},
      diaryVectors: {}
    };
  }

  async ensureReady() {
    if (this.loaded) return;
    await fs.mkdir(path.dirname(this.config.vectorIndexPath), { recursive: true });

    try {
      const raw = await fs.readFile(this.config.vectorIndexPath, 'utf8');
      this.index = JSON.parse(raw);
    } catch (error) {
      if (error?.code === 'ENOENT') {
        await this.flush();
      } else if (error instanceof SyntaxError) {
        this.corruptionQuarantine = await quarantineFile(
          this.config.vectorIndexPath,
          'vector_index_json_parse_failed'
        );
        this.index = this.createEmptyIndex();
        await this.flush();
      } else {
        throw error;
      }
    }

    if (!this.index || typeof this.index !== 'object' || Array.isArray(this.index)) {
      this.corruptionQuarantine = await quarantineFile(
        this.config.vectorIndexPath,
        'vector_index_shape_invalid'
      );
      this.index = this.createEmptyIndex();
      await this.flush();
    }
    if (this.index.embeddingFingerprint !== this.config.embeddingFingerprint) {
      this.index = this.createEmptyIndex();
      await this.flush();
    }
    this.index.version = 3;
    this.index.embeddingFingerprint = this.config.embeddingFingerprint;
    this.index.vectors = this.index.vectors && typeof this.index.vectors === 'object' ? this.index.vectors : {};
    this.index.embeddingCache = this.index.embeddingCache && typeof this.index.embeddingCache === 'object' ? this.index.embeddingCache : {};
    this.index.diaryVectors = this.index.diaryVectors && typeof this.index.diaryVectors === 'object' ? this.index.diaryVectors : {};

    this.loaded = true;
  }

  async flush() {
    this.index.updatedAt = new Date().toISOString();
    await atomicWriteFile(this.config.vectorIndexPath, JSON.stringify(this.index, null, 2));
  }

  tokenize(text) {
    return String(text || '')
      .toLowerCase()
      .match(/[a-z0-9_\u4e00-\u9fff]+/g) || [];
  }

  normalizeEmbeddingText(text) {
    return String(text || '').trim();
  }

  createEmbeddingCacheKey(text, options = {}) {
    return crypto.createHash('sha1').update(JSON.stringify({
      text: this.normalizeEmbeddingText(text),
      inputKind: options.inputKind || 'document',
      provider: this.externalEmbeddingAdapter?.isConfigured()
        ? this.externalEmbeddingAdapter.getCacheIdentity()
        : 'local',
      model: this.externalEmbeddingAdapter?.isConfigured()
        ? 'external-chain'
        : 'local-hash',
      dims: this.config.embedDimensions,
      embeddingFingerprint: this.config.embeddingFingerprint
    })).digest('hex');
  }

  createDocumentEmbeddingCacheKey(text) {
    return this.createEmbeddingCacheKey(text, { inputKind: 'document' });
  }

  normalizeEmbeddingTextSet(texts = []) {
    return [...new Set((Array.isArray(texts) ? texts : [texts])
      .map(text => this.normalizeEmbeddingText(text))
      .filter(Boolean))];
  }

  async countDocumentEmbeddingCacheByTexts(texts = []) {
    if (!this.config.enableEmbeddingCache) return 0;
    await this.ensureReady();
    return this.normalizeEmbeddingTextSet(texts)
      .map(text => this.createDocumentEmbeddingCacheKey(text))
      .filter(cacheKey => {
        const entry = this.index.embeddingCache?.[cacheKey];
        return entry?.embeddingFingerprint === this.config.embeddingFingerprint &&
          (entry.inputKind || 'document') === 'document' &&
          Array.isArray(entry.vector);
      }).length;
  }

  async deleteDocumentEmbeddingCacheByTexts(texts = []) {
    if (!this.config.enableEmbeddingCache) return 0;
    await this.ensureReady();
    let removed = 0;
    for (const text of this.normalizeEmbeddingTextSet(texts)) {
      const cacheKey = this.createDocumentEmbeddingCacheKey(text);
      const entry = this.index.embeddingCache?.[cacheKey];
      if (
        entry?.embeddingFingerprint !== this.config.embeddingFingerprint ||
        (entry.inputKind || 'document') !== 'document'
      ) {
        continue;
      }
      delete this.index.embeddingCache[cacheKey];
      removed += 1;
    }
    if (removed > 0) {
      await this.flush();
    }
    return removed;
  }

  embedText(text) {
    const dimensions = this.config.embedDimensions;
    const vector = new Array(dimensions).fill(0);
    const tokens = this.tokenize(text);

    if (tokens.length === 0) {
      return vector;
    }

    for (const token of tokens) {
      const digest = crypto.createHash('sha256').update(token).digest();
      for (let index = 0; index < 4; index += 1) {
        const vectorIndex = digest[index] % dimensions;
        const sign = digest[index + 4] % 2 === 0 ? 1 : -1;
        const weight = 1 + (digest[index + 8] % 5) / 10;
        vector[vectorIndex] += sign * weight;
      }
    }

    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    return norm === 0 ? vector : vector.map(value => value / norm);
  }

  async getSingleEmbeddingCached(text, options = {}) {
    const readOnly = options.readOnly === true;
    const normalizedText = this.normalizeEmbeddingText(text);
    if (!normalizedText) return null;

    if (!this.config.enableEmbeddingCache) {
      return readOnly
        ? this.embedText(normalizedText)
        : this.embedTextAdaptive(normalizedText, options);
    }

    await this.ensureReady();

    const cacheKey = this.createEmbeddingCacheKey(normalizedText, options);
    const cached = this.index.embeddingCache[cacheKey];
    if (cached && Array.isArray(cached.vector)) {
      if (!readOnly) {
        cached.lastAccessedAt = new Date().toISOString();
      }
      this.stats.embeddingHits += 1;
      return cached.vector;
    }

    this.stats.embeddingMisses += 1;
    if (readOnly) {
      return this.embedText(normalizedText);
    }
    const vector = await this.embedTextAdaptive(normalizedText, options);
    this.index.embeddingCache[cacheKey] = {
      text: normalizedText,
      inputKind: options.inputKind || 'document',
      vector,
      embeddingFingerprint: this.config.embeddingFingerprint,
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString()
    };
    this.enforceEmbeddingCacheLimit();
    await this.flush();
    return vector;
  }

  async getBatchEmbeddingsCached(texts = [], options = {}) {
    const results = [];
    for (const text of texts) {
      results.push(await this.getSingleEmbeddingCached(text, options));
    }
    return results;
  }

  async getEmbeddingFromCacheOnly(text, options = {}) {
    if (!this.config.enableEmbeddingCache) return null;
    await this.ensureReady();
    const normalizedText = this.normalizeEmbeddingText(text);
    if (!normalizedText) return null;

    const cacheKey = this.createEmbeddingCacheKey(normalizedText, options);
    const cached = this.index.embeddingCache[cacheKey];
    if (cached && Array.isArray(cached.vector)) {
      cached.lastAccessedAt = new Date().toISOString();
      this.stats.embeddingHits += 1;
      return cached.vector;
    }

    this.stats.embeddingMisses += 1;
    return null;
  }

  async embedTextAdaptive(text, options = {}) {
    const normalizedText = this.normalizeEmbeddingText(text);
    if (!normalizedText) return null;

    if (this.externalEmbeddingAdapter?.isConfigured()) {
      try {
        const [vector] = await this.externalEmbeddingAdapter.embedBatch([normalizedText], options);
        if (Array.isArray(vector)) {
          return this.normalizeVectorDimension(vector);
        }
      } catch {
        // fall back to local embedding
      }
    }

    return this.embedText(normalizedText);
  }

  normalizeVectorDimension(vector = []) {
    if (!Array.isArray(vector)) return null;
    if (vector.length === this.config.embedDimensions) return vector;
    if (vector.length > this.config.embedDimensions) {
      return vector.slice(0, this.config.embedDimensions);
    }

    const output = [...vector];
    while (output.length < this.config.embedDimensions) {
      output.push(0);
    }
    return output;
  }

  enforceEmbeddingCacheLimit() {
    const entries = Object.entries(this.index.embeddingCache || {});
    if (entries.length <= this.config.embeddingCacheMaxEntries) return;

    entries
      .sort((left, right) => new Date(left[1].lastAccessedAt || left[1].createdAt || 0).getTime()
        - new Date(right[1].lastAccessedAt || right[1].createdAt || 0).getTime())
      .slice(0, entries.length - this.config.embeddingCacheMaxEntries)
      .forEach(([key]) => {
        delete this.index.embeddingCache[key];
      });
  }

  buildRecordText(record) {
    return [
      `Title: ${record.title}`,
      record.content || '',
      `Evidence: ${record.evidence || ''}`,
      `Tag: ${(record.tags || []).join(', ')}`
    ].join('\n');
  }

  async upsertRecord(record) {
    if (!this.config.enableVectorIndex) return;
    await this.ensureReady();
    const memoryId = getRecordMemoryId(record);
    if (!memoryId) return false;

    if (isRecallIsolated(record)) {
      if (this.index.vectors[memoryId]) {
        delete this.index.vectors[memoryId];
        await this.flush();
        return true;
      }
      return false;
    }

    const vector = await this.getSingleEmbeddingCached(this.buildRecordText(record), { inputKind: 'document' });
    this.index.vectors[memoryId] = {
      memoryId,
      target: record.target,
      title: record.title,
      filePath: record.filePath || null,
      relativePath: record.relativePath || null,
      tags: record.tags || [],
      vector,
      embeddingFingerprint: this.config.embeddingFingerprint,
      updatedAt: record.updatedAt || record.createdAt || new Date().toISOString()
    };

    await this.flush();
    return true;
  }

  async deleteRecord(memoryId) {
    if (!this.config.enableVectorIndex) return;
    await this.ensureReady();
    const normalizedMemoryId = firstNonEmptyString(memoryId);
    if (!normalizedMemoryId || !this.index.vectors[normalizedMemoryId]) return false;
    delete this.index.vectors[normalizedMemoryId];
    await this.flush();
    return true;
  }

  async hasRecord(memoryId) {
    if (!this.config.enableVectorIndex) return false;
    await this.ensureReady();
    const normalizedMemoryId = String(memoryId || '').trim();
    if (!normalizedMemoryId) return false;
    const entry = this.index.vectors[normalizedMemoryId];
    return entry?.embeddingFingerprint === this.config.embeddingFingerprint;
  }

  async getScoreMap(query, records = []) {
    await this.ensureReady();
    const queryVector = await this.getSingleEmbeddingCached(query, { inputKind: 'query' });
    const scoreMap = new Map();

    for (const record of records) {
      const memoryId = getRecordMemoryId(record);
      if (!memoryId) continue;
      const cached = this.index.vectors[memoryId];
      const vector = cached
        && cached.embeddingFingerprint === this.config.embeddingFingerprint
        && Array.isArray(cached.vector)
        ? cached.vector
        : this.embedText(this.buildRecordText(record));
      scoreMap.set(memoryId, cosineSimilarity(queryVector, vector));
    }

    return scoreMap;
  }

  async rebuildDiaryVectors(records = []) {
    await this.ensureReady();
    const searchableRecords = filterRecallIsolatedItems(records);
    const buckets = new Map();

    for (const record of searchableRecords) {
      const key = record.target || 'process';
      if (!buckets.has(key)) {
        buckets.set(key, []);
      }
      buckets.get(key).push(record);
    }

    const now = new Date().toISOString();
    const nextDiaryVectors = {};

    for (const [target, targetRecords] of buckets.entries()) {
      const vectors = [];

      for (const record of targetRecords) {
        const memoryId = getRecordMemoryId(record);
        if (!memoryId) continue;
        const cached = this.index.vectors[memoryId];
        let vector = cached?.embeddingFingerprint === this.config.embeddingFingerprint
          ? cached.vector
          : null;
        if (!Array.isArray(vector)) {
          vector = await this.getSingleEmbeddingCached(this.buildRecordText(record), { inputKind: 'document' });
        }
        if (Array.isArray(vector)) {
          vectors.push(vector);
        }
      }

      if (vectors.length === 0) continue;

      nextDiaryVectors[target] = {
        target,
        vector: this.averageVectors(vectors),
        embeddingFingerprint: this.config.embeddingFingerprint,
        recordCount: vectors.length,
        updatedAt: now
      };
    }

    this.index.diaryVectors = nextDiaryVectors;
    await this.flush();
    return Object.keys(nextDiaryVectors).length;
  }

  getDiaryVector(target = 'both') {
    if (!this.index?.diaryVectors) return null;
    if (target === 'both') {
      const all = Object.values(this.index.diaryVectors).map(entry => entry.vector).filter(Array.isArray);
      return all.length > 0 ? this.averageVectors(all) : null;
    }
    return this.index.diaryVectors[target]?.vector || null;
  }

  averageVectors(vectors = []) {
    const available = vectors.filter(vector => Array.isArray(vector) && vector.length > 0);
    if (available.length === 0) return null;

    const dimensions = available[0].length;
    const output = new Array(dimensions).fill(0);
    for (const vector of available) {
      for (let index = 0; index < dimensions; index += 1) {
        output[index] += vector[index] || 0;
      }
    }
    for (let index = 0; index < dimensions; index += 1) {
      output[index] /= available.length;
    }
    const norm = Math.sqrt(output.reduce((sum, value) => sum + value * value, 0));
    return norm === 0 ? output : output.map(value => value / norm);
  }

  async getHealth() {
    await this.ensureReady();
    return {
      available: this.config.enableVectorIndex,
      vectorIndexPath: this.config.vectorIndexPath,
      embeddingFingerprint: this.config.embeddingFingerprint,
      vectorCount: Object.keys(this.index.vectors || {}).length,
      diaryVectorCount: Object.keys(this.index.diaryVectors || {}).length,
      embeddingCacheCount: Object.keys(this.index.embeddingCache || {}).length,
      embeddingHits: this.stats.embeddingHits,
      embeddingMisses: this.stats.embeddingMisses,
      corruptionQuarantine: this.corruptionQuarantine,
      updatedAt: this.index.updatedAt
    };
  }
}

module.exports = {
  VectorIndexStore,
  cosineSimilarity
};
