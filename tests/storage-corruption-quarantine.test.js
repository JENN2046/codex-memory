const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { CandidateCacheStore } = require('../src/storage/CandidateCacheStore');
const { SqliteShadowStore } = require('../src/storage/SqliteShadowStore');
const { VectorIndexStore } = require('../src/storage/VectorIndexStore');

async function withTempDir(handler) {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-corruption-quarantine-'));
  try {
    await handler(rootPath);
  } finally {
    await fs.rm(rootPath, { recursive: true, force: true });
  }
}

async function findQuarantineFiles(filePath) {
  const directory = path.dirname(filePath);
  const basename = path.basename(filePath);
  const entries = await fs.readdir(directory);
  return entries
    .filter(entry => entry.startsWith(`${basename}.corrupt-`))
    .map(entry => path.join(directory, entry))
    .sort();
}

test('VectorIndexStore quarantines corrupt JSON before rebuilding an empty index', async () => {
  await withTempDir(async rootPath => {
    const vectorIndexPath = path.join(rootPath, 'data', 'vector-index.json');
    await fs.mkdir(path.dirname(vectorIndexPath), { recursive: true });
    await fs.writeFile(vectorIndexPath, '{not valid json', 'utf8');

    const store = new VectorIndexStore({
      vectorIndexPath,
      embeddingFingerprint: 'test-fingerprint',
      embedDimensions: 16,
      enableVectorIndex: true,
      enableEmbeddingCache: true,
      embeddingCacheMaxEntries: 100
    });

    await store.ensureReady();

    const quarantineFiles = await findQuarantineFiles(vectorIndexPath);
    const rebuilt = JSON.parse(await fs.readFile(vectorIndexPath, 'utf8'));
    const quarantinedRaw = await fs.readFile(quarantineFiles[0], 'utf8');
    const health = await store.getHealth();

    assert.equal(quarantineFiles.length, 1);
    assert.equal(quarantinedRaw, '{not valid json');
    assert.equal(rebuilt.version, 3);
    assert.equal(rebuilt.embeddingFingerprint, 'test-fingerprint');
    assert.deepEqual(rebuilt.vectors, {});
    assert.equal(health.corruptionQuarantine.quarantined, true);
    assert.equal(health.corruptionQuarantine.reason, 'vector_index_json_parse_failed');
    assert.equal(health.corruptionQuarantine.sourcePath, vectorIndexPath);
    assert.equal(health.corruptionQuarantine.quarantinePath, quarantineFiles[0]);
  });
});

test('VectorIndexStore quarantines invalid JSON shape before rebuilding an empty index', async () => {
  await withTempDir(async rootPath => {
    const vectorIndexPath = path.join(rootPath, 'data', 'vector-index.json');
    await fs.mkdir(path.dirname(vectorIndexPath), { recursive: true });
    await fs.writeFile(vectorIndexPath, '[]', 'utf8');

    const store = new VectorIndexStore({
      vectorIndexPath,
      embeddingFingerprint: 'test-fingerprint',
      embedDimensions: 16,
      enableVectorIndex: true,
      enableEmbeddingCache: true,
      embeddingCacheMaxEntries: 100
    });

    await store.ensureReady();

    const quarantineFiles = await findQuarantineFiles(vectorIndexPath);
    const rebuilt = JSON.parse(await fs.readFile(vectorIndexPath, 'utf8'));
    const quarantinedRaw = await fs.readFile(quarantineFiles[0], 'utf8');
    const health = await store.getHealth();

    assert.equal(quarantineFiles.length, 1);
    assert.equal(quarantinedRaw, '[]');
    assert.equal(rebuilt.version, 3);
    assert.equal(rebuilt.embeddingFingerprint, 'test-fingerprint');
    assert.deepEqual(rebuilt.vectors, {});
    assert.equal(health.corruptionQuarantine.quarantined, true);
    assert.equal(health.corruptionQuarantine.reason, 'vector_index_shape_invalid');
    assert.equal(health.corruptionQuarantine.sourcePath, vectorIndexPath);
    assert.equal(health.corruptionQuarantine.quarantinePath, quarantineFiles[0]);
  });
});

test('CandidateCacheStore quarantines corrupt JSON before rebuilding an empty cache', async () => {
  await withTempDir(async rootPath => {
    const candidateCachePath = path.join(rootPath, 'data', 'candidate-cache.json');
    await fs.mkdir(path.dirname(candidateCachePath), { recursive: true });
    await fs.writeFile(candidateCachePath, '{"entries":', 'utf8');

    const store = new CandidateCacheStore({
      candidateCachePath,
      candidateCacheMaxEntries: 100,
      candidateCacheTtlMs: 60000,
      embeddingFingerprint: 'test-fingerprint',
      enableCandidateCache: true
    });

    await store.ensureReady();

    const quarantineFiles = await findQuarantineFiles(candidateCachePath);
    const rebuilt = JSON.parse(await fs.readFile(candidateCachePath, 'utf8'));
    const quarantinedRaw = await fs.readFile(quarantineFiles[0], 'utf8');
    const health = await store.getHealth();

    assert.equal(quarantineFiles.length, 1);
    assert.equal(quarantinedRaw, '{"entries":');
    assert.equal(rebuilt.version, 2);
    assert.deepEqual(rebuilt.entries, {});
    assert.deepEqual(rebuilt.fingerprintMetadata, {});
    assert.equal(health.corruptionQuarantine.quarantined, true);
    assert.equal(health.corruptionQuarantine.reason, 'candidate_cache_json_parse_failed');
    assert.equal(health.corruptionQuarantine.sourcePath, candidateCachePath);
    assert.equal(health.corruptionQuarantine.quarantinePath, quarantineFiles[0]);
  });
});

test('CandidateCacheStore quarantines invalid JSON shape before rebuilding an empty cache', async () => {
  await withTempDir(async rootPath => {
    const candidateCachePath = path.join(rootPath, 'data', 'candidate-cache.json');
    await fs.mkdir(path.dirname(candidateCachePath), { recursive: true });
    await fs.writeFile(candidateCachePath, '{"version":2,"entries":[]}', 'utf8');

    const store = new CandidateCacheStore({
      candidateCachePath,
      candidateCacheMaxEntries: 100,
      candidateCacheTtlMs: 60000,
      embeddingFingerprint: 'test-fingerprint',
      enableCandidateCache: true
    });

    await store.ensureReady();

    const quarantineFiles = await findQuarantineFiles(candidateCachePath);
    const rebuilt = JSON.parse(await fs.readFile(candidateCachePath, 'utf8'));
    const quarantinedRaw = await fs.readFile(quarantineFiles[0], 'utf8');
    const health = await store.getHealth();

    assert.equal(quarantineFiles.length, 1);
    assert.equal(quarantinedRaw, '{"version":2,"entries":[]}');
    assert.equal(rebuilt.version, 2);
    assert.deepEqual(rebuilt.entries, {});
    assert.deepEqual(rebuilt.fingerprintMetadata, {});
    assert.equal(health.corruptionQuarantine.quarantined, true);
    assert.equal(health.corruptionQuarantine.reason, 'candidate_cache_shape_invalid');
    assert.equal(health.corruptionQuarantine.sourcePath, candidateCachePath);
    assert.equal(health.corruptionQuarantine.quarantinePath, quarantineFiles[0]);
  });
});

test('SqliteShadowStore reports malformed JSON fields without throwing on row mapping', async () => {
  await withTempDir(async rootPath => {
    const store = new SqliteShadowStore({
      dbPath: path.join(rootPath, 'data', 'shadow.sqlite'),
      embeddingFingerprint: 'test-fingerprint'
    });
    const record = {
      memoryId: 'codex-process-sqlitejson000000000000000001',
      target: 'process',
      title: 'SQLite JSON corruption reporting fixture',
      content: 'Synthetic temp-local row for SQLite JSON corruption reporting.',
      evidence: 'cm1159 sqlite json corruption reporting evidence',
      tags: ['cm1159', 'sqlite-json'],
      sensitivity: 'none',
      validated: true,
      reusable: false,
      createdAt: '2026-05-26T00:00:00.000Z',
      updatedAt: '2026-05-26T00:00:00.000Z'
    };

    try {
      await store.upsertRecord(record);
      await store.replaceChunksForRecord(record, [{
        chunkId: 'chunk-1',
        chunkIndex: 0,
        text: 'Synthetic chunk for malformed SQLite JSON field reporting.',
        vector: [0.1, 0.2, 0.3]
      }]);
      store.db.prepare('UPDATE memory_records SET tags_json = ? WHERE memory_id = ?')
        .run('{bad tags json', record.memoryId);
      store.db.prepare('UPDATE memory_chunks SET vector_json = ?, tags_json = ? WHERE memory_id = ?')
        .run('[bad vector json', '{"bad tags":', record.memoryId);

      const records = await store.listRecords('process');
      const chunks = await store.listChunks('process');
      const health = await store.getHealth();

      assert.equal(records.length, 1);
      assert.deepEqual(records[0].tags, []);
      assert.equal(records[0].tagsJsonMalformed, true);
      assert.equal(records[0].tagsJsonParseError, 'tags_json_malformed_json');
      assert.equal(chunks.length, 1);
      assert.deepEqual(chunks[0].vector, []);
      assert.equal(chunks[0].vectorJsonMalformed, true);
      assert.equal(chunks[0].vectorJsonParseError, 'vector_json_malformed_json');
      assert.deepEqual(chunks[0].tags, []);
      assert.equal(chunks[0].tagsJsonMalformed, true);
      assert.equal(chunks[0].tagsJsonParseError, 'tags_json_malformed_json');
      assert.equal(health.jsonCorruption.malformedRecordTags, 1);
      assert.equal(health.jsonCorruption.malformedChunkVectors, 1);
      assert.equal(health.jsonCorruption.malformedChunkTags, 1);
      assert.equal(health.jsonCorruption.totalMalformed, 3);
    } finally {
      await store.close();
    }
  });
});
