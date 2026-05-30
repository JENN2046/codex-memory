const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { spawn } = require('node:child_process');
const { createConfig } = require('../src/config/createConfig');

function runCli({ cwd, env, args = [], script = 'src/cli/rebuild-profile.js' }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd,
      env: {
        ...process.env,
        ...env
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', reject);
    child.on('close', code => {
      resolve({ code, stdout, stderr });
    });
  });
}

test('rebuild-profile CLI should report dry-run profile artifacts in json mode', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-rebuild-profile-'));
  try {
    const result = await runCli({
      cwd: process.cwd(),
      args: ['--dry-run', '--json'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: path.join(tempBasePath, 'data'),
        CODEX_MEMORY_LOCAL_EMBEDDING_URL: 'http://127.0.0.1:18081/',
        CODEX_MEMORY_LOCAL_EMBEDDING_MODEL: 'bge-m3-local',
        CODEX_MEMORY_EMBEDDING_PROFILE_VERSION: 'cli-test'
      }
    });

    assert.equal(result.code, 0);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.mode, 'dry-run');
    assert.equal(payload.destructive, false);
    assert.equal(payload.embeddingProfile.fingerprint, 'bge-m3-local__1024__cli-test');
    assert.match(payload.paths.vectorIndexPath.replace(/\\/g, '/'), /embedding-profiles\/bge-m3-local__1024__cli-test\/memory-vectors\.json$/);
    assert.equal(payload.artifacts.vectorIndex.exists, false);
    assert.equal(payload.artifacts.sqlite.exists, false);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('profile-health CLI should report ready current profile artifacts', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-profile-health-'));
  const dataDir = path.join(tempBasePath, 'data');
  const fingerprint = 'bge-m3-local__1024__health-test';
  const vectorIndexPath = path.join(dataDir, 'embedding-profiles', fingerprint, 'memory-vectors.json');
  const candidateCachePath = path.join(dataDir, 'candidate-cache.json');
  const dbPath = path.join(dataDir, 'codex-memory.sqlite');

  try {
    await fs.mkdir(path.dirname(vectorIndexPath), { recursive: true });
    await fs.writeFile(vectorIndexPath, JSON.stringify({
      version: 3,
      embeddingFingerprint: fingerprint,
      vectors: { one: { vector: [1, 0] } },
      diaryVectors: { diary: { vector: [0, 1] } },
      embeddingCache: { cached: { embeddingFingerprint: fingerprint, vector: [1, 0] } }
    }), 'utf8');
    await fs.writeFile(candidateCachePath, JSON.stringify({
      version: 1,
      entries: {
        current: { embeddingFingerprint: fingerprint, value: { ok: true } },
        other: { embeddingFingerprint: 'other-model__1024__v1', value: { ok: true } }
      }
    }), 'utf8');

    const db = new DatabaseSync(dbPath);
    try {
      db.exec(`
        CREATE TABLE memory_records (memory_id TEXT PRIMARY KEY);
        CREATE TABLE memory_chunks (
          chunk_id TEXT PRIMARY KEY,
          memory_id TEXT,
          embedding_fingerprint TEXT
        );
      `);
      db.prepare('INSERT INTO memory_records (memory_id) VALUES (?)').run('memory-one');
      db.prepare('INSERT INTO memory_chunks (chunk_id, memory_id, embedding_fingerprint) VALUES (?, ?, ?)')
        .run('current-chunk', 'memory-one', fingerprint);
    } finally {
      db.close();
    }

    const result = await runCli({
      cwd: process.cwd(),
      script: 'src/cli/profile-health.js',
      args: ['--json'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: dataDir,
        CODEX_MEMORY_LOCAL_EMBEDDING_URL: 'http://127.0.0.1:18081/',
        CODEX_MEMORY_LOCAL_EMBEDDING_MODEL: 'bge-m3-local',
        CODEX_MEMORY_EMBEDDING_PROFILE_VERSION: 'health-test'
      }
    });

    assert.equal(result.code, 0);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.mode, 'profile-health');
    assert.equal(payload.destructive, false);
    assert.equal(payload.status, 'ready');
    assert.equal(payload.summary.records, 1);
    assert.equal(payload.summary.currentChunks, 1);
    assert.equal(payload.summary.vectors, 1);
    assert.equal(payload.summary.currentCandidateCacheEntries, 1);
    assert.deepEqual(payload.checks, [
      {
        level: 'info',
        code: 'current-candidate-cache-present',
        message: 'Current profile has warm candidate cache entries.'
      }
    ]);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('profile-health CLI should warn for legacy chunks without fingerprint column', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-profile-health-'));
  const dataDir = path.join(tempBasePath, 'data');
  const dbPath = path.join(dataDir, 'codex-memory.sqlite');

  try {
    await fs.mkdir(dataDir, { recursive: true });
    const db = new DatabaseSync(dbPath);
    try {
      db.exec(`
        CREATE TABLE memory_records (memory_id TEXT PRIMARY KEY);
        CREATE TABLE memory_chunks (
          chunk_id TEXT PRIMARY KEY,
          memory_id TEXT
        );
      `);
      db.prepare('INSERT INTO memory_records (memory_id) VALUES (?)').run('memory-one');
      db.prepare('INSERT INTO memory_chunks (chunk_id, memory_id) VALUES (?, ?)').run('legacy-chunk', 'memory-one');
    } finally {
      db.close();
    }

    const result = await runCli({
      cwd: process.cwd(),
      script: 'src/cli/profile-health.js',
      args: ['--json'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: dataDir,
        CODEX_MEMORY_LOCAL_EMBEDDING_URL: 'http://127.0.0.1:18081/',
        CODEX_MEMORY_LOCAL_EMBEDDING_MODEL: 'bge-m3-local',
        CODEX_MEMORY_EMBEDDING_PROFILE_VERSION: 'legacy-health-test'
      }
    });

    assert.equal(result.code, 0);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, 'needs-attention');
    assert.equal(payload.summary.legacyChunks, 1);
    assert.equal(payload.checks.some(check => check.code === 'sqlite-fingerprint-column-missing'), true);
    assert.equal(payload.recommendations.includes('Run npm run rebuild-shadow to regenerate current-profile chunks and vectors.'), true);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('shadow-compare CLI should compare current and baseline profile chunks', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-shadow-compare-'));
  const dataDir = path.join(tempBasePath, 'data');
  const dbPath = path.join(dataDir, 'codex-memory.sqlite');
  const currentFingerprint = 'bge-m3-local__1024__compare-test';
  const baselineFingerprint = 'baseline-model__1024__v1';

  try {
    await fs.mkdir(dataDir, { recursive: true });
    const db = new DatabaseSync(dbPath);
    try {
      db.exec(`
        CREATE TABLE memory_chunks (
          chunk_id TEXT PRIMARY KEY,
          memory_id TEXT,
          target TEXT,
          title TEXT,
          relative_path TEXT,
          chunk_index INTEGER,
          text TEXT,
          vector_json TEXT,
          embedding_fingerprint TEXT,
          tags_json TEXT,
          created_at TEXT,
          updated_at TEXT
        );
      `);
      const now = new Date().toISOString();
      const insert = db.prepare(`
        INSERT INTO memory_chunks (
          chunk_id, memory_id, target, title, relative_path, chunk_index, text,
          vector_json, embedding_fingerprint, tags_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insert.run('current-alpha', 'alpha-memory', 'process', 'Alpha current', 'current.md', 0,
        'alpha migration current profile chunk', '[]', currentFingerprint, JSON.stringify(['alpha']), now, now);
      insert.run('current-beta', 'beta-memory', 'process', 'Beta current', 'current.md', 1,
        'beta unrelated profile chunk', '[]', currentFingerprint, JSON.stringify(['beta']), now, now);
      insert.run('baseline-alpha', 'alpha-memory', 'process', 'Alpha baseline', 'baseline.md', 0,
        'alpha migration baseline profile chunk', '[]', baselineFingerprint, JSON.stringify(['alpha']), now, now);
      insert.run('baseline-gamma', 'gamma-memory', 'process', 'Gamma baseline', 'baseline.md', 1,
        'gamma older profile chunk', '[]', baselineFingerprint, JSON.stringify(['gamma']), now, now);
    } finally {
      db.close();
    }

    const result = await runCli({
      cwd: process.cwd(),
      script: 'src/cli/shadow-compare.js',
      args: ['--query', 'alpha migration', '--baseline-fingerprint', baselineFingerprint, '--json'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: dataDir,
        CODEX_MEMORY_LOCAL_EMBEDDING_URL: 'http://127.0.0.1:18081/',
        CODEX_MEMORY_LOCAL_EMBEDDING_MODEL: 'bge-m3-local',
        CODEX_MEMORY_EMBEDDING_PROFILE_VERSION: 'compare-test'
      }
    });

    assert.equal(result.code, 0);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.mode, 'shadow-compare');
    assert.equal(payload.destructive, false);
    assert.equal(payload.status, 'lexical-only');
    assert.equal(payload.baselineProfile.fingerprint, baselineFingerprint);
    assert.equal(payload.summary.queryCount, 1);
    assert.equal(payload.summary.currentChunkCount, 2);
    assert.equal(payload.summary.baselineChunkCount, 2);
    assert.equal(payload.comparisons[0].current[0].memoryId, 'alpha-memory');
    assert.equal(payload.comparisons[0].baseline[0].memoryId, 'alpha-memory');
    assert.equal(payload.comparisons[0].metrics.overlapCount, 1);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('shadow-compare CLI should report no-baseline without another profile', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-shadow-compare-'));
  const dataDir = path.join(tempBasePath, 'data');
  const dbPath = path.join(dataDir, 'codex-memory.sqlite');
  const currentFingerprint = 'bge-m3-local__1024__single-profile-test';

  try {
    await fs.mkdir(dataDir, { recursive: true });
    const db = new DatabaseSync(dbPath);
    try {
      db.exec(`
        CREATE TABLE memory_chunks (
          chunk_id TEXT PRIMARY KEY,
          memory_id TEXT,
          target TEXT,
          title TEXT,
          relative_path TEXT,
          chunk_index INTEGER,
          text TEXT,
          vector_json TEXT,
          embedding_fingerprint TEXT,
          tags_json TEXT,
          created_at TEXT,
          updated_at TEXT
        );
      `);
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO memory_chunks (
          chunk_id, memory_id, target, title, relative_path, chunk_index, text,
          vector_json, embedding_fingerprint, tags_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('current-alpha', 'alpha-memory', 'process', 'Alpha current', 'current.md', 0,
        'alpha migration current profile chunk', '[]', currentFingerprint, JSON.stringify(['alpha']), now, now);
    } finally {
      db.close();
    }

    const result = await runCli({
      cwd: process.cwd(),
      script: 'src/cli/shadow-compare.js',
      args: ['--query', 'alpha migration', '--json'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: dataDir,
        CODEX_MEMORY_LOCAL_EMBEDDING_URL: 'http://127.0.0.1:18081/',
        CODEX_MEMORY_LOCAL_EMBEDDING_MODEL: 'bge-m3-local',
        CODEX_MEMORY_EMBEDDING_PROFILE_VERSION: 'single-profile-test'
      }
    });

    assert.equal(result.code, 0);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, 'no-baseline');
    assert.equal(payload.baselineProfile.fingerprint, null);
    assert.equal(payload.summary.currentChunkCount, 1);
    assert.equal(payload.summary.baselineChunkCount, 0);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('profile-gate CLI should evaluate a fixed migration suite', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-profile-gate-'));
  const dataDir = path.join(tempBasePath, 'data');
  const dbPath = path.join(dataDir, 'codex-memory.sqlite');
  const suitePath = path.join(tempBasePath, 'suite.json');
  const currentFingerprint = 'bge-m3-local__1024__gate-test';
  const baselineFingerprint = 'baseline-model__1024__v1';

  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(suitePath, JSON.stringify({
      name: 'test-suite',
      limit: 3,
      thresholds: {
        minAverageJaccard: 1,
        minAverageOverlap: 1,
        allowNoBaseline: false
      },
      queries: [
        { id: 'alpha', query: 'alpha migration' }
      ]
    }), 'utf8');

    const db = new DatabaseSync(dbPath);
    try {
      db.exec(`
        CREATE TABLE memory_chunks (
          chunk_id TEXT PRIMARY KEY,
          memory_id TEXT,
          target TEXT,
          title TEXT,
          relative_path TEXT,
          chunk_index INTEGER,
          text TEXT,
          vector_json TEXT,
          embedding_fingerprint TEXT,
          tags_json TEXT,
          created_at TEXT,
          updated_at TEXT
        );
      `);
      const now = new Date().toISOString();
      const insert = db.prepare(`
        INSERT INTO memory_chunks (
          chunk_id, memory_id, target, title, relative_path, chunk_index, text,
          vector_json, embedding_fingerprint, tags_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insert.run('current-alpha', 'alpha-memory', 'process', 'Alpha current', 'current.md', 0,
        'alpha migration current profile chunk', '[]', currentFingerprint, JSON.stringify(['alpha']), now, now);
      insert.run('baseline-alpha', 'alpha-memory', 'process', 'Alpha baseline', 'baseline.md', 0,
        'alpha migration baseline profile chunk', '[]', baselineFingerprint, JSON.stringify(['alpha']), now, now);
    } finally {
      db.close();
    }

    const result = await runCli({
      cwd: process.cwd(),
      script: 'src/cli/profile-gate.js',
      args: ['--suite', suitePath, '--baseline-fingerprint', baselineFingerprint, '--json', '--require-pass'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: dataDir,
        CODEX_MEMORY_LOCAL_EMBEDDING_URL: 'http://127.0.0.1:18081/',
        CODEX_MEMORY_LOCAL_EMBEDDING_MODEL: 'bge-m3-local',
        CODEX_MEMORY_EMBEDDING_PROFILE_VERSION: 'gate-test'
      }
    });

    assert.equal(result.code, 0);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.mode, 'profile-gate');
    assert.equal(payload.destructive, false);
    assert.equal(payload.status, 'warn');
    assert.equal(payload.suite.name, 'test-suite');
    assert.equal(payload.summary.queryCount, 1);
    assert.equal(payload.summary.averageJaccard, 1);
    assert.equal(payload.summary.averageOverlap, 1);
    assert.equal(payload.checks.some(check => check.code === 'lexical-only'), true);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('profile-gate CLI summary-only should omit full compare payload', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-profile-gate-'));
  const dataDir = path.join(tempBasePath, 'data');
  const dbPath = path.join(dataDir, 'codex-memory.sqlite');
  const suitePath = path.join(tempBasePath, 'suite.json');
  const currentFingerprint = 'bge-m3-local__1024__gate-summary-test';
  const baselineFingerprint = 'baseline-model__1024__v1';

  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(suitePath, JSON.stringify({
      name: 'summary-suite',
      queries: [
        { id: 'alpha', query: 'alpha migration' }
      ]
    }), 'utf8');

    const db = new DatabaseSync(dbPath);
    try {
      db.exec(`
        CREATE TABLE memory_chunks (
          chunk_id TEXT PRIMARY KEY,
          memory_id TEXT,
          target TEXT,
          title TEXT,
          relative_path TEXT,
          chunk_index INTEGER,
          text TEXT,
          vector_json TEXT,
          embedding_fingerprint TEXT,
          tags_json TEXT,
          created_at TEXT,
          updated_at TEXT
        );
      `);
      const now = new Date().toISOString();
      const insert = db.prepare(`
        INSERT INTO memory_chunks (
          chunk_id, memory_id, target, title, relative_path, chunk_index, text,
          vector_json, embedding_fingerprint, tags_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insert.run('current-alpha', 'alpha-memory', 'process', 'Alpha current', 'current.md', 0,
        'alpha migration current profile chunk', '[]', currentFingerprint, JSON.stringify(['alpha']), now, now);
      insert.run('baseline-alpha', 'alpha-memory', 'process', 'Alpha baseline', 'baseline.md', 0,
        'alpha migration baseline profile chunk', '[]', baselineFingerprint, JSON.stringify(['alpha']), now, now);
    } finally {
      db.close();
    }

    const result = await runCli({
      cwd: process.cwd(),
      script: 'src/cli/profile-gate.js',
      args: ['--suite', suitePath, '--baseline-fingerprint', baselineFingerprint, '--json', '--summary-only'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: dataDir,
        CODEX_MEMORY_LOCAL_EMBEDDING_URL: 'http://127.0.0.1:18081/',
        CODEX_MEMORY_LOCAL_EMBEDDING_MODEL: 'bge-m3-local',
        CODEX_MEMORY_EMBEDDING_PROFILE_VERSION: 'gate-summary-test'
      }
    });

    assert.equal(result.code, 0);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.compare, undefined);
    assert.equal(payload.comparisons.length, 1);
    assert.equal(payload.comparisons[0].currentTop.memoryId, 'alpha-memory');
    assert.equal(payload.comparisons[0].baselineTop.memoryId, 'alpha-memory');
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('profile-gate CLI should fail require-pass when thresholds are missed', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-profile-gate-'));
  const dataDir = path.join(tempBasePath, 'data');
  const dbPath = path.join(dataDir, 'codex-memory.sqlite');
  const suitePath = path.join(tempBasePath, 'suite.json');
  const currentFingerprint = 'bge-m3-local__1024__gate-fail-test';
  const baselineFingerprint = 'baseline-model__1024__v1';

  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(suitePath, JSON.stringify({
      name: 'strict-suite',
      limit: 3,
      thresholds: {
        minAverageJaccard: 1,
        minAverageOverlap: 1,
        allowNoBaseline: false
      },
      queries: [
        { id: 'alpha', query: 'alpha migration' }
      ]
    }), 'utf8');

    const db = new DatabaseSync(dbPath);
    try {
      db.exec(`
        CREATE TABLE memory_chunks (
          chunk_id TEXT PRIMARY KEY,
          memory_id TEXT,
          target TEXT,
          title TEXT,
          relative_path TEXT,
          chunk_index INTEGER,
          text TEXT,
          vector_json TEXT,
          embedding_fingerprint TEXT,
          tags_json TEXT,
          created_at TEXT,
          updated_at TEXT
        );
      `);
      const now = new Date().toISOString();
      const insert = db.prepare(`
        INSERT INTO memory_chunks (
          chunk_id, memory_id, target, title, relative_path, chunk_index, text,
          vector_json, embedding_fingerprint, tags_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insert.run('current-alpha', 'alpha-memory', 'process', 'Alpha current', 'current.md', 0,
        'alpha migration current profile chunk', '[]', currentFingerprint, JSON.stringify(['alpha']), now, now);
      insert.run('baseline-gamma', 'gamma-memory', 'process', 'Gamma baseline', 'baseline.md', 0,
        'gamma baseline profile chunk', '[]', baselineFingerprint, JSON.stringify(['gamma']), now, now);
    } finally {
      db.close();
    }

    const result = await runCli({
      cwd: process.cwd(),
      script: 'src/cli/profile-gate.js',
      args: ['--suite', suitePath, '--baseline-fingerprint', baselineFingerprint, '--json', '--require-pass'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: dataDir,
        CODEX_MEMORY_LOCAL_EMBEDDING_URL: 'http://127.0.0.1:18081/',
        CODEX_MEMORY_LOCAL_EMBEDDING_MODEL: 'bge-m3-local',
        CODEX_MEMORY_EMBEDDING_PROFILE_VERSION: 'gate-fail-test'
      }
    });

    assert.equal(result.code, 1);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, 'fail');
    assert.equal(payload.summary.averageJaccard, 0);
    assert.equal(payload.summary.averageOverlap, 0);
    assert.equal(payload.checks.some(check => check.code === 'average-jaccard-low'), true);
    assert.equal(payload.checks.some(check => check.code === 'average-overlap-low'), true);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('default profile migration suite should cover core VCP recall surfaces', async () => {
  const suitePath = path.join(process.cwd(), 'benchmarks', 'profile-migration-suite.json');
  const suite = JSON.parse(await fs.readFile(suitePath, 'utf8'));
  const ids = new Set(suite.queries.map(query => query.id));

  assert.equal(suite.name, 'default-profile-migration-suite');
  assert.ok(suite.queries.length >= 8);
  assert.equal(ids.size, suite.queries.length);
  assert.equal(ids.has('deepmemo-basic'), true);
  assert.equal(ids.has('deepmemo-advanced-syntax'), true);
  assert.equal(ids.has('topicmemo-routing'), true);
  assert.equal(ids.has('lightmemo-directory-policy'), true);
  assert.equal(ids.has('tagmemo-geodesic'), true);
  assert.equal(ids.has('time-group-rerank'), true);
  assert.equal(ids.has('v8-terrain'), true);
  assert.equal(ids.has('rollback-safety'), true);
  assert.equal(suite.queries.every(item => typeof item.query === 'string' && item.query.trim().length > 0), true);
});

test('rag params profile example should load for default bge-m3-local fingerprint', () => {
  const config = createConfig({
    projectBasePath: process.cwd(),
    dataDir: path.join(os.tmpdir(), 'codex-memory-rag-example-data'),
    localEmbeddingUrl: 'http://127.0.0.1:18081/',
    localEmbeddingModel: 'bge-m3-local',
    allowExternalProvider: true,
    embeddingProfileVersion: 'v1',
    ragParamsPath: path.join(process.cwd(), 'examples', 'rag-params.profiles.example.json')
  });

  assert.equal(config.embeddingFingerprint, 'bge-m3-local__1024__v1');
  assert.equal(config.ragProfile.available, true);
  assert.equal(config.ragProfile.selectedProfile, 'bge-m3-local__1024__v1');
  assert.deepEqual(config.tagMemoDynamicWeightRange, [0.04, 0.3]);
  assert.deepEqual(config.tagMemoCoreBoostRange, [1.18, 1.32]);
  assert.equal(config.geodesicRerank.alpha, 0.24);
  assert.equal(config.metaThinkingAutoThreshold, 0.7);
});

test('v8-diagnose CLI should expose terrain and meta thinking diagnostics', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-v8-diagnose-'));
  try {
    const result = await runCli({
      cwd: process.cwd(),
      script: 'src/cli/v8-diagnose.js',
      args: ['--query', '[[checkpoint vector schema migration]] ::TagMemo+1.5', '--json'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: path.join(tempBasePath, 'data'),
        CODEX_MEMORY_LOCAL_EMBEDDING_URL: 'http://127.0.0.1:18081/',
        CODEX_MEMORY_LOCAL_EMBEDDING_MODEL: 'bge-m3-local',
        CODEX_MEMORY_EMBEDDING_PROFILE_VERSION: 'diagnose-test'
      }
    });

    assert.equal(result.code, 0);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.mode, 'v8-diagnose');
    assert.equal(payload.destructive, false);
    assert.equal(payload.embeddingProfile.fingerprint, 'bge-m3-local__1024__diagnose-test');
    assert.equal(payload.query.normalized, 'checkpoint vector schema migration');
    assert.equal(payload.geodesic.willUse, true);
    assert.ok(payload.terrain.energySignature.activation > 0);
    assert.ok(Array.isArray(payload.residualPyramid.levels));
    assert.ok(Array.isArray(payload.tagMemo.coreTags));
    assert.ok(Number.isFinite(payload.metaThinking.score));
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('cleanup-legacy-chunks CLI should remove only legacy chunks on confirm', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cleanup-legacy-'));
  const dataDir = path.join(tempBasePath, 'data');
  const dbPath = path.join(dataDir, 'codex-memory.sqlite');
  const fingerprint = 'bge-m3-local__1024__cleanup-legacy-test';
  const otherFingerprint = 'other-model__1024__v1';

  try {
    await fs.mkdir(dataDir, { recursive: true });
    const db = new DatabaseSync(dbPath);
    try {
      db.exec(`
        CREATE TABLE memory_chunks (
          chunk_id TEXT PRIMARY KEY,
          memory_id TEXT,
          title TEXT,
          relative_path TEXT,
          chunk_index INTEGER,
          embedding_fingerprint TEXT,
          updated_at TEXT
        );
      `);
      const now = new Date().toISOString();
      const insert = db.prepare(`
        INSERT INTO memory_chunks (chunk_id, memory_id, title, relative_path, chunk_index, embedding_fingerprint, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insert.run('legacy-null', 'legacy-memory', 'Legacy null', 'legacy.md', 0, null, now);
      insert.run('legacy-empty', 'legacy-memory', 'Legacy empty', 'legacy.md', 1, '', now);
      insert.run('current', 'current-memory', 'Current', 'current.md', 0, fingerprint, now);
      insert.run('other', 'other-memory', 'Other', 'other.md', 0, otherFingerprint, now);
    } finally {
      db.close();
    }

    const dryRun = await runCli({
      cwd: process.cwd(),
      script: 'src/cli/cleanup-legacy-chunks.js',
      args: ['--dry-run', '--json'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: dataDir,
        CODEX_MEMORY_LOCAL_EMBEDDING_URL: 'http://127.0.0.1:18081/',
        CODEX_MEMORY_LOCAL_EMBEDDING_MODEL: 'bge-m3-local',
        CODEX_MEMORY_EMBEDDING_PROFILE_VERSION: 'cleanup-legacy-test'
      }
    });

    assert.equal(dryRun.code, 0);
    const dryPayload = JSON.parse(dryRun.stdout);
    assert.equal(dryPayload.destructive, false);
    assert.equal(dryPayload.before.legacyChunkCount, 2);
    assert.equal(dryPayload.after.legacyChunkCount, 2);

    const confirm = await runCli({
      cwd: process.cwd(),
      script: 'src/cli/cleanup-legacy-chunks.js',
      args: ['--confirm', '--json'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: dataDir,
        CODEX_MEMORY_LOCAL_EMBEDDING_URL: 'http://127.0.0.1:18081/',
        CODEX_MEMORY_LOCAL_EMBEDDING_MODEL: 'bge-m3-local',
        CODEX_MEMORY_EMBEDDING_PROFILE_VERSION: 'cleanup-legacy-test'
      }
    });

    assert.equal(confirm.code, 0);
    const payload = JSON.parse(confirm.stdout);
    assert.equal(payload.destructive, true);
    assert.equal(payload.action.removedChunks, 2);
    assert.equal(payload.after.legacyChunkCount, 0);

    const verifyDb = new DatabaseSync(dbPath, { readOnly: true });
    try {
      const rows = verifyDb.prepare('SELECT chunk_id, embedding_fingerprint FROM memory_chunks ORDER BY chunk_id').all();
      assert.deepEqual(rows.map(row => row.chunk_id), ['current', 'other']);
      assert.equal(rows.find(row => row.chunk_id === 'current').embedding_fingerprint, fingerprint);
      assert.equal(rows.find(row => row.chunk_id === 'other').embedding_fingerprint, otherFingerprint);
    } finally {
      verifyDb.close();
    }
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('rebuild-profile CLI should reject missing mode', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-rebuild-profile-'));
  try {
    const result = await runCli({
      cwd: process.cwd(),
      args: ['--json'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: path.join(tempBasePath, 'data')
      }
    });

    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /--dry-run or --confirm/i);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('rebuild-profile CLI confirm should clear only current profile artifacts', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-rebuild-profile-'));
  const dataDir = path.join(tempBasePath, 'data');
  const fingerprint = 'bge-m3-local__1024__clean-test';
  const otherFingerprint = 'other-model__1024__v1';
  const vectorIndexPath = path.join(dataDir, 'embedding-profiles', fingerprint, 'memory-vectors.json');
  const candidateCachePath = path.join(dataDir, 'candidate-cache.json');
  const dbPath = path.join(dataDir, 'codex-memory.sqlite');

  try {
    await fs.mkdir(path.dirname(vectorIndexPath), { recursive: true });
    await fs.writeFile(vectorIndexPath, JSON.stringify({
      version: 3,
      embeddingFingerprint: fingerprint,
      vectors: { one: { vector: [1, 0] } },
      diaryVectors: {},
      embeddingCache: { cached: { vector: [1, 0] } }
    }), 'utf8');
    await fs.writeFile(candidateCachePath, JSON.stringify({
      version: 1,
      entries: {
        current: { embeddingFingerprint: fingerprint, value: { ok: true } },
        other: { embeddingFingerprint: otherFingerprint, value: { ok: true } }
      }
    }), 'utf8');

    const db = new DatabaseSync(dbPath);
    try {
      db.exec(`
        CREATE TABLE memory_chunks (
          chunk_id TEXT PRIMARY KEY,
          memory_id TEXT,
          embedding_fingerprint TEXT
        );
      `);
      db.prepare('INSERT INTO memory_chunks (chunk_id, memory_id, embedding_fingerprint) VALUES (?, ?, ?)')
        .run('current-chunk', 'current-memory', fingerprint);
      db.prepare('INSERT INTO memory_chunks (chunk_id, memory_id, embedding_fingerprint) VALUES (?, ?, ?)')
        .run('other-chunk', 'other-memory', otherFingerprint);
    } finally {
      db.close();
    }

    const result = await runCli({
      cwd: process.cwd(),
      args: ['--confirm', '--json'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: dataDir,
        CODEX_MEMORY_LOCAL_EMBEDDING_URL: 'http://127.0.0.1:18081/',
        CODEX_MEMORY_LOCAL_EMBEDDING_MODEL: 'bge-m3-local',
        CODEX_MEMORY_EMBEDDING_PROFILE_VERSION: 'clean-test'
      }
    });

    assert.equal(result.code, 0);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.mode, 'confirm');
    assert.equal(payload.destructive, true);
    assert.equal(payload.actions.vectorIndex.deleted, true);
    assert.equal(payload.actions.candidateCache.removedEntries, 1);
    assert.equal(payload.actions.sqlite.removedChunks, 1);
    assert.equal(payload.after.vectorIndex.exists, false);
    assert.equal(payload.after.candidateCache.entryCount, 1);
    assert.equal(payload.after.sqlite.chunkCount, 0);
    assert.equal(payload.after.sqlite.totalChunkCount, 1);
    await assert.rejects(fs.stat(vectorIndexPath));

    const cache = JSON.parse(await fs.readFile(candidateCachePath, 'utf8'));
    assert.equal(cache.entries.current, undefined);
    assert.equal(cache.entries.other.embeddingFingerprint, otherFingerprint);

    const verifyDb = new DatabaseSync(dbPath, { readOnly: true });
    try {
      const rows = verifyDb.prepare('SELECT chunk_id, embedding_fingerprint FROM memory_chunks ORDER BY chunk_id')
        .all()
        .map(row => ({ ...row }));
      assert.deepEqual(rows, [{ chunk_id: 'other-chunk', embedding_fingerprint: otherFingerprint }]);
    } finally {
      verifyDb.close();
    }
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});
