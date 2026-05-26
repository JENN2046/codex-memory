const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { CandidateCacheStore } = require('../src/storage/CandidateCacheStore');
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
