'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { DatabaseSync } = require('node:sqlite');

const {
  MAX_SELECTED_CONTENT_BYTES,
  MAX_SELECTED_METADATA_BYTES,
  MAX_SELECTED_VECTOR_BYTES,
  createProductionSelectedDiaryRuntimeHydrator,
  readSelectedProjection
} = require('../src/runtime/vcp-native/production-selected-diary-hydrator');

function vector(values = [0.25, 0.75]) {
  return Buffer.from(new Float32Array(values).buffer);
}

function openReadOnlyDatabase(file) {
  const database = new DatabaseSync(file, { readOnly: true });
  Object.defineProperty(database, 'readonly', {
    configurable: false,
    enumerable: false,
    value: true,
    writable: false
  });
  return database;
}

function createSchema(database) {
  database.exec(`
    CREATE TABLE files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE NOT NULL,
      diary_name TEXT NOT NULL,
      checksum TEXT NOT NULL,
      mtime INTEGER NOT NULL,
      size INTEGER NOT NULL,
      updated_at INTEGER
    );
    CREATE TABLE chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      vector BLOB
    );
    CREATE TABLE tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      vector BLOB
    );
    CREATE TABLE file_tags (
      file_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      position INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE tag_intrinsic_residuals (
      tag_id INTEGER PRIMARY KEY,
      residual_energy REAL,
      neighbor_count INTEGER,
      computed_at TEXT
    );
    CREATE TABLE tag_pair_similarity (
      tag_a INTEGER,
      tag_b INTEGER,
      similarity REAL,
      model_sig TEXT,
      computed_at INTEGER
    );
    CREATE TABLE kv_store (
      key TEXT PRIMARY KEY,
      value TEXT,
      vector BLOB
    );
    CREATE TABLE migration_deleted_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      old_path TEXT,
      old_diary_name TEXT,
      checksum TEXT,
      size INTEGER,
      chunk_count INTEGER,
      deleted_at INTEGER,
      expires_at INTEGER
    );
    CREATE TABLE migration_deleted_chunks (
      cache_file_id INTEGER,
      chunk_index INTEGER,
      vector BLOB
    );
  `);
}

function insertMemory(database, {
  chunkId = 11,
  checksum = 'synthetic-checksum',
  content = 'synthetic governed memory',
  diaryName = 'PROJECT_ALPHA',
  fileId = 7,
  filePath = `${diaryName}/memory.md`,
  vectorValue = vector()
} = {}) {
  database.prepare(`
    INSERT INTO files
      (id, path, diary_name, checksum, mtime, size, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    fileId,
    filePath,
    diaryName,
    checksum,
    1_700_000_000_000,
    Buffer.byteLength(content),
    1_700_000_000
  );
  database.prepare(`
    INSERT INTO chunks
      (id, file_id, chunk_index, content, vector)
    VALUES (?, ?, ?, ?, ?)
  `).run(chunkId, fileId, 0, content, vectorValue);
}

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-hydrator-'));
  const vcpRoot = path.join(root, 'VCPToolBox');
  const memoryRoot = path.join(vcpRoot, 'dailynote');
  const sourceStore = path.join(vcpRoot, 'VectorStore');
  const isolatedStore = path.join(root, 'isolated-store');
  fs.mkdirSync(memoryRoot, { recursive: true });
  fs.mkdirSync(sourceStore, { recursive: true });
  fs.mkdirSync(isolatedStore, { recursive: true });
  const sourceFile = path.join(sourceStore, 'knowledge_base.sqlite');
  const isolatedFile = path.join(isolatedStore, 'knowledge_base.sqlite');
  const source = new DatabaseSync(sourceFile);
  const isolated = new DatabaseSync(isolatedFile);
  createSchema(source);
  createSchema(isolated);
  const manager = {
    initialized: true,
    db: isolated,
    config: {
      dimension: 2,
      fullScanOnStartup: false,
      rootPath: memoryRoot,
      storePath: isolatedStore
    },
    watcher: null,
    ragParamsWatcher: null,
    pendingFiles: new Set(),
    pendingDeletes: new Set(),
    isProcessing: false,
    isProcessingDeletes: false,
    rustWriteLease: null,
    diaryIndices: new Map()
  };
  let sourceClosed = false;
  let isolatedClosed = false;
  t.after(() => {
    if (!sourceClosed) {
      source.close();
      sourceClosed = true;
    }
    if (!isolatedClosed) {
      isolated.close();
      isolatedClosed = true;
    }
    fs.rmSync(root, { recursive: true, force: true });
  });
  return {
    closeSource() {
      if (!sourceClosed) {
        source.close();
        sourceClosed = true;
      }
    },
    hydrator(overrides = {}) {
      return createProductionSelectedDiaryRuntimeHydrator({
        sourceKnowledgeBaseStorePath: sourceStore,
        vcpToolBoxRoot: vcpRoot,
        openSourceDatabase(file) {
          assert.equal(file, sourceFile);
          return openReadOnlyDatabase(file);
        },
        ...overrides
      });
    },
    isolated,
    isolatedStore,
    manager,
    memoryRoot,
    source,
    sourceFile,
    sourceStore,
    vcpRoot
  };
}

function hydrationInput(value, allowedDiaryNames = ['PROJECT_ALPHA']) {
  return {
    allowedDiaryNames,
    knowledgeBaseManager: value.manager,
    knowledgeBaseRootPath: value.memoryRoot,
    knowledgeBaseStorePath: value.isolatedStore
  };
}

test('production hydrator projects only selected source rows into the isolated store', async t => {
  const value = fixture(t);
  insertMemory(value.source);
  insertMemory(value.source, {
    chunkId: 22,
    content: 'synthetic excluded memory',
    diaryName: 'PROJECT_OTHER',
    fileId: 18
  });
  value.closeSource();

  const hydrate = value.hydrator();
  const receipt = await hydrate(hydrationInput(value));
  assert.deepEqual(receipt, {
    accepted: true,
    authorizationResolvedBeforeHydration: true,
    selectedDiaryOnly: true,
    sourcePartitionMutationPerformed: false,
    primaryMemoryWritePerformed: false,
    unauthorizedSourceRowsRead: false,
    hydratedDiaryCount: 1,
    hydratedFileCount: 1,
    hydratedChunkCount: 1
  });
  assert.deepEqual(
    value.isolated.prepare(
      'SELECT path, diary_name AS diaryName FROM files ORDER BY id'
    ).all().map(row => ({ ...row })),
    [{ path: 'PROJECT_ALPHA/memory.md', diaryName: 'PROJECT_ALPHA' }]
  );
  assert.deepEqual(
    value.isolated.prepare(
      'SELECT content FROM chunks ORDER BY id'
    ).all().map(row => ({ ...row })),
    [{ content: 'synthetic governed memory' }]
  );
  assert.doesNotMatch(
    JSON.stringify(receipt),
    /PROJECT_ALPHA|memory\.md|synthetic governed memory/u
  );

  const second = await hydrate(hydrationInput(value));
  assert.deepEqual(second, receipt);
  assert.equal(
    value.isolated.prepare('SELECT COUNT(*) AS count FROM files').get().count,
    1
  );
  assert.equal(
    value.isolated.prepare('SELECT COUNT(*) AS count FROM chunks').get().count,
    1
  );
});

test('production hydrator supports the exact root diary without widening its path scope', async t => {
  const value = fixture(t);
  insertMemory(value.source, {
    diaryName: 'Root',
    filePath: 'memory.md'
  });
  value.closeSource();
  const receipt = await value.hydrator()(
    hydrationInput(value, ['Root'])
  );
  assert.equal(receipt.accepted, true);
  assert.equal(receipt.hydratedDiaryCount, 1);
  assert.deepEqual(
    value.isolated.prepare(
      'SELECT path, diary_name AS diaryName FROM files'
    ).all().map(row => ({ ...row })),
    [{ path: 'memory.md', diaryName: 'Root' }]
  );
});

test('production hydrator rejects invalid allowlists before opening source state', async t => {
  const value = fixture(t);
  value.closeSource();
  let opened = false;
  const hydrate = value.hydrator({
    openSourceDatabase() {
      opened = true;
      throw new Error('must not open');
    }
  });
  for (const allowlist of [
    [],
    ['../PROJECT_ALPHA'],
    ['PROJECT_ALPHA', 'PROJECT_ALPHA'],
    ['PROJECT/ALPHA']
  ]) {
    await assert.rejects(
      () => hydrate(hydrationInput(value, allowlist)),
      { code: 'selected_diary_hydration_allowlist_invalid' }
    );
  }
  assert.equal(opened, false);
});

test('production hydrator rejects a source driver without read-only attestation', async t => {
  const value = fixture(t);
  value.closeSource();
  let closed = false;
  const hydrate = value.hydrator({
    openSourceDatabase() {
      return {
        readonly: false,
        prepare() {
          throw new Error('must not query');
        },
        exec() {
          throw new Error('must not execute');
        },
        close() {
          closed = true;
        }
      };
    }
  });
  await assert.rejects(
    () => hydrate(hydrationInput(value)),
    { code: 'selected_diary_hydration_source_database_driver_invalid' }
  );
  assert.equal(closed, true);
});

test('projection byte budgets reject before selected rows are materialized', () => {
  for (const summaryPatch of [
    { metadataBytes: MAX_SELECTED_METADATA_BYTES + 1 },
    { contentBytes: MAX_SELECTED_CONTENT_BYTES + 1 },
    { vectorBytes: MAX_SELECTED_VECTOR_BYTES + 1 }
  ]) {
    let selectedRowsMaterialized = false;
    const database = {
      prepare(sql) {
        if (sql.includes('AS metadataBytes')) {
          return {
            get() {
              return {
                count: 1,
                metadataBytes: 64,
                ...summaryPatch
              };
            }
          };
        }
        if (sql.includes('AS contentBytes')) {
          return {
            get() {
              return {
                count: 1,
                contentBytes: 32,
                vectorBytes: 8,
                ...summaryPatch
              };
            }
          };
        }
        selectedRowsMaterialized = true;
        throw new Error('selected rows must not be materialized');
      }
    };
    assert.throws(
      () => readSelectedProjection(database, ['PROJECT_ALPHA'], 2),
      { code: 'selected_diary_hydration_source_projection_invalid' }
    );
    assert.equal(selectedRowsMaterialized, false);
  }
});

test('production hydrator rejects selected rows whose path escapes the exact diary', async t => {
  const value = fixture(t);
  insertMemory(value.source, {
    diaryName: 'PROJECT_ALPHA',
    filePath: 'PROJECT_OTHER/memory.md'
  });
  value.closeSource();
  await assert.rejects(
    () => value.hydrator()(hydrationInput(value)),
    { code: 'selected_diary_hydration_source_projection_invalid' }
  );
  assert.equal(
    value.isolated.prepare('SELECT COUNT(*) AS count FROM files').get().count,
    0
  );
});

test('production hydrator rejects malformed source vectors without partial writes', async t => {
  const value = fixture(t);
  insertMemory(value.source, {
    vectorValue: vector([0.5])
  });
  value.closeSource();
  await assert.rejects(
    () => value.hydrator()(hydrationInput(value)),
    { code: 'selected_diary_hydration_source_projection_invalid' }
  );
  assert.equal(
    value.isolated.prepare('SELECT COUNT(*) AS count FROM files').get().count,
    0
  );
  assert.equal(
    value.isolated.prepare('SELECT COUNT(*) AS count FROM chunks').get().count,
    0
  );
});

test('production hydrator rejects cross-scope isolated rows', async t => {
  const value = fixture(t);
  insertMemory(value.source);
  insertMemory(value.isolated, {
    chunkId: 99,
    content: 'synthetic contaminating memory',
    diaryName: 'PROJECT_OTHER',
    fileId: 88
  });
  value.closeSource();
  await assert.rejects(
    () => value.hydrator()(hydrationInput(value)),
    { code: 'selected_diary_hydration_isolated_scope_contaminated' }
  );
  assert.deepEqual(
    value.isolated.prepare('SELECT diary_name AS diaryName FROM files')
      .all()
      .map(row => ({ ...row })),
    [{ diaryName: 'PROJECT_OTHER' }]
  );
});

test('production hydrator rejects a stale selected projection instead of overwriting it', async t => {
  const value = fixture(t);
  insertMemory(value.source);
  insertMemory(value.isolated, {
    checksum: 'stale-checksum',
    content: 'synthetic stale memory'
  });
  value.closeSource();
  await assert.rejects(
    () => value.hydrator()(hydrationInput(value)),
    { code: 'selected_diary_hydration_isolated_store_stale' }
  );
  assert.deepEqual(
    value.isolated.prepare('SELECT content FROM chunks')
      .all()
      .map(row => ({ ...row })),
    [{ content: 'synthetic stale memory' }]
  );
});

test('production hydrator rejects secondary isolated state and overlapping stores', async t => {
  const value = fixture(t);
  insertMemory(value.source);
  value.isolated.prepare(
    'INSERT INTO tags (id, name, vector) VALUES (?, ?, ?)'
  ).run(1, 'synthetic-tag', vector());
  value.closeSource();
  await assert.rejects(
    () => value.hydrator()(hydrationInput(value)),
    { code: 'selected_diary_hydration_isolated_scope_contaminated' }
  );

  const overlapping = createProductionSelectedDiaryRuntimeHydrator({
    sourceKnowledgeBaseStorePath: value.isolatedStore,
    vcpToolBoxRoot: value.vcpRoot,
    openSourceDatabase() {
      throw new Error('must not open');
    }
  });
  await assert.rejects(
    () => overlapping(hydrationInput(value)),
    { code: 'selected_diary_hydration_boundary_mismatch' }
  );
});

test('production hydrator binds canonical stores and both exact database handles', async t => {
  const value = fixture(t);
  insertMemory(value.source);
  value.closeSource();

  const alternateSourceStore = path.join(value.vcpRoot, 'AlternateStore');
  fs.mkdirSync(alternateSourceStore);
  const noncanonical = createProductionSelectedDiaryRuntimeHydrator({
    sourceKnowledgeBaseStorePath: alternateSourceStore,
    vcpToolBoxRoot: value.vcpRoot
  });
  await assert.rejects(
    () => noncanonical(hydrationInput(value)),
    { code: 'selected_diary_hydration_boundary_mismatch' }
  );

  const foreignStore = path.join(path.dirname(value.isolatedStore), 'foreign-store');
  fs.mkdirSync(foreignStore);
  const foreignFile = path.join(foreignStore, 'knowledge_base.sqlite');
  const foreignDatabase = new DatabaseSync(foreignFile);
  createSchema(foreignDatabase);
  t.after(() => {
    try {
      foreignDatabase.close();
    } catch {}
  });
  const originalDatabase = value.manager.db;
  value.manager.db = foreignDatabase;
  await assert.rejects(
    () => value.hydrator()(hydrationInput(value)),
    { code: 'selected_diary_hydration_isolated_database_invalid' }
  );
  value.manager.db = originalDatabase;

  const wrongSource = openReadOnlyDatabase(foreignFile);
  const wrongSourceHydrator = value.hydrator({
    openSourceDatabase() {
      return wrongSource;
    }
  });
  await assert.rejects(
    () => wrongSourceHydrator(hydrationInput(value)),
    { code: 'selected_diary_hydration_source_database_binding_invalid' }
  );
});
