'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { DatabaseSync } = require('node:sqlite');

const {
  GOVERNED_READ_ATTEMPT_NON_TERMINAL_STAGES,
  createAttemptHeader,
  createStageReceipt,
  digestObject,
  failureRegistryEntry
} = require('../packages/chatgpt-r4-contracts');
const {
  MAX_PROJECTION_PLAN_BYTES,
  MAX_SELECTED_CONTENT_BYTES,
  MAX_SELECTED_METADATA_BYTES,
  MAX_SELECTED_VECTOR_BYTES,
  createProductionSelectedDiaryRuntimeHydrator,
  createProductionSelectedDiarySourceProjection,
  scanSelectedProjection,
  validateProjectionPlan
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
  chunkIndex = 0,
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
  `).run(chunkId, fileId, chunkIndex, content, vectorValue);
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

function zeroDerivedCounterFactsFixture() {
  return {
    primary_memory: {
      write_attempts: 0,
      writes_committed: 0
    },
    derived_transaction: {
      started: 0,
      committed: 0,
      rolled_back: 0
    }
  };
}

function hydrationAttemptReceipt(counterFacts, {
  outcome = 'completed',
  reasonCode = null
} = {}) {
  const header = createAttemptHeader({
    attemptRef: `grat_${'H'.repeat(32)}`,
    toolName: 'search_memory',
    requestDigest: digestObject('source-projection-request'),
    contextBindingDigest: digestObject('source-projection-context'),
    now: new Date('2026-07-30T00:00:00.000Z')
  });
  const receipts = [];
  for (const stage of GOVERNED_READ_ATTEMPT_NON_TERMINAL_STAGES) {
    const hydration = stage === 'HYDRATION';
    receipts.push(createStageReceipt({
      header,
      receipts,
      stage,
      counterFacts: hydration ? counterFacts : {},
      outcome: hydration ? outcome : 'completed',
      reasonCode: hydration ? reasonCode : null
    }));
    if (hydration) return receipts.at(-1);
  }
  throw new Error('HYDRATION stage unavailable');
}

function proxyReadOnlyDatabase(database, prepare) {
  return {
    readonly: true,
    close: database.close.bind(database),
    exec: database.exec.bind(database),
    prepare(sql) {
      const statement = database.prepare(sql);
      return prepare(sql, statement);
    }
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
    sourceSnapshotStable: true,
    selectedProjectionDigestMatched: true,
    hydratedDiaryCount: 1,
    hydratedFileCount: 1,
    hydratedChunkCount: 1,
    counterFacts: {
      primary_memory: {
        write_attempts: 0,
        writes_committed: 0
      },
      derived_transaction: {
        started: 1,
        committed: 1,
        rolled_back: 0
      }
    }
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
  assert.deepEqual(
    hydrationAttemptReceipt(receipt.counterFacts).counter_facts,
    receipt.counterFacts
  );

  const second = await hydrate(hydrationInput(value));
  assert.deepEqual(second, {
    ...receipt,
    counterFacts: {
      primary_memory: {
        write_attempts: 0,
        writes_committed: 0
      },
      derived_transaction: {
        started: 0,
        committed: 0,
        rolled_back: 0
      }
    }
  });
  assert.equal(
    value.isolated.prepare('SELECT COUNT(*) AS count FROM files').get().count,
    1
  );
  assert.equal(
    value.isolated.prepare('SELECT COUNT(*) AS count FROM chunks').get().count,
    1
  );
});

test('production hydrator preserves writer-compatible non-contiguous chunk indexes', async t => {
  const value = fixture(t);
  insertMemory(value.source, {
    chunkIndex: 2,
    content: 'codex-memory current governed product goal and remaining blockers'
  });
  value.closeSource();

  const receipt = await value.hydrator()(hydrationInput(value));
  assert.equal(receipt.accepted, true);
  assert.equal(receipt.hydratedChunkCount, 1);
  assert.deepEqual(
    value.isolated.prepare(
      'SELECT chunk_index AS chunkIndex FROM chunks ORDER BY id'
    ).all().map(row => ({ ...row })),
    [{ chunkIndex: 2 }]
  );
});

test('production hydrator rejects duplicate sparse chunk indexes', async t => {
  const value = fixture(t);
  insertMemory(value.source, { chunkIndex: 2 });
  value.source.prepare(`
    INSERT INTO chunks
      (id, file_id, chunk_index, content, vector)
    VALUES (?, ?, ?, ?, ?)
  `).run(12, 7, 2, 'synthetic duplicate sparse chunk', vector());
  value.closeSource();

  await assert.rejects(
    () => value.hydrator()(hydrationInput(value)),
    { code: 'selected_diary_hydration_source_projection_invalid' }
  );
  assert.equal(
    value.isolated.prepare('SELECT COUNT(*) AS count FROM chunks').get().count,
    0
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

test('source projection preflight uses its injected production database constructor', t => {
  const value = fixture(t);
  insertMemory(value.source);
  value.closeSource();
  let openCount = 0;
  function SourceDatabase(file, options) {
    openCount += 1;
    assert.equal(file, value.sourceFile);
    assert.deepEqual(options, {
      fileMustExist: true,
      readonly: true
    });
    return openReadOnlyDatabase(file);
  }
  const projection = createProductionSelectedDiarySourceProjection({
    sourceKnowledgeBaseStorePath: value.sourceStore,
    vcpToolBoxRoot: value.vcpRoot,
    sourceDatabaseConstructor: SourceDatabase
  });

  const plan = projection.preflight({
    allowedDiaryNames: ['PROJECT_ALPHA'],
    dimension: 2
  });

  assert.equal(openCount, 1);
  assert.deepEqual(plan.allowed_diary_names, ['PROJECT_ALPHA']);
  assert.equal(plan.dimension, 2);
  assert.equal(plan.budget.file_count, 1);
  assert.equal(plan.budget.chunk_count, 1);
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
    ['PROJECT/ALPHA'],
    Array.from(
      { length: 8 },
      (_, index) => `${'界'.repeat(254)}${index}`
    )
  ]) {
    await assert.rejects(
      () => hydrate(hydrationInput(value, allowlist)),
      {
        code: 'selected_diary_hydration_allowlist_invalid',
        reasonCode: 'source_scope_invalid'
      }
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

test('materialization classifies a second source-open failure after provider as hydration', t => {
  const value = fixture(t);
  insertMemory(value.source);
  value.closeSource();
  let openCount = 0;
  const hydrate = value.hydrator({
    openSourceDatabase(file) {
      openCount += 1;
      if (openCount === 2) {
        throw new Error('synthetic transient source-open failure');
      }
      return openReadOnlyDatabase(file);
    }
  });
  const plan = hydrate.preflight({
    allowedDiaryNames: ['PROJECT_ALPHA'],
    dimension: 2
  });
  assert.equal(openCount, 1);

  assert.throws(
    () => hydrate.materialize({
      ...hydrationInput(value),
      projectionPlan: plan
    }),
    error => {
      assert.equal(
        error.code,
        'selected_diary_hydration_source_database_open_failed'
      );
      assert.equal(error.reasonCode, 'hydration_failed');
      assert.deepEqual(error.counterFacts, zeroDerivedCounterFactsFixture());
      const failure = failureRegistryEntry(error.reasonCode);
      assert.equal(failure.stage, 'HYDRATION');
      assert.equal(failure.provider_may_have_occurred, true);
      const stageReceipt = hydrationAttemptReceipt(error.counterFacts, {
        outcome: 'failed',
        reasonCode: error.reasonCode
      });
      assert.equal(stageReceipt.stage, 'HYDRATION');
      assert.equal(stageReceipt.reason_code, 'hydration_failed');
      return true;
    }
  );
  assert.equal(openCount, 2);
  assert.equal(
    value.isolated.prepare('SELECT COUNT(*) AS count FROM files').get().count,
    0
  );
});

test('materialization classifies a missing source boundary after provider as hydration', t => {
  const value = fixture(t);
  insertMemory(value.source);
  value.closeSource();
  let openCount = 0;
  const hydrate = value.hydrator({
    openSourceDatabase(file) {
      openCount += 1;
      return openReadOnlyDatabase(file);
    }
  });
  const plan = hydrate.preflight({
    allowedDiaryNames: ['PROJECT_ALPHA'],
    dimension: 2
  });
  assert.equal(openCount, 1);
  fs.unlinkSync(value.sourceFile);

  assert.throws(
    () => hydrate.materialize({
      ...hydrationInput(value),
      projectionPlan: plan
    }),
    error => {
      assert.equal(
        error.code,
        'selected_diary_hydration_source_database_invalid'
      );
      assert.equal(error.reasonCode, 'hydration_failed');
      assert.deepEqual(error.counterFacts, zeroDerivedCounterFactsFixture());
      const failure = failureRegistryEntry(error.reasonCode);
      assert.equal(failure.stage, 'HYDRATION');
      assert.equal(failure.provider_may_have_occurred, true);
      return true;
    }
  );
  assert.equal(openCount, 1);
  assert.equal(
    value.isolated.prepare('SELECT COUNT(*) AS count FROM files').get().count,
    0
  );
});

test('materialization classifies an unreadable source boundary after provider as hydration', t => {
  const value = fixture(t);
  insertMemory(value.source);
  value.closeSource();
  let denySourceAccess = false;
  const fsModule = {
    ...fs,
    lstatSync(file) {
      if (denySourceAccess && file === value.sourceFile) {
        const error = new Error('synthetic source permission change');
        error.code = 'EACCES';
        throw error;
      }
      return fs.lstatSync(file);
    }
  };
  const hydrate = value.hydrator({ fsModule });
  const plan = hydrate.preflight({
    allowedDiaryNames: ['PROJECT_ALPHA'],
    dimension: 2
  });
  denySourceAccess = true;

  assert.throws(
    () => hydrate.materialize({
      ...hydrationInput(value),
      projectionPlan: plan
    }),
    error => {
      assert.equal(
        error.code,
        'selected_diary_hydration_source_database_invalid'
      );
      assert.equal(error.reasonCode, 'hydration_failed');
      assert.deepEqual(error.counterFacts, zeroDerivedCounterFactsFixture());
      return true;
    }
  );
  assert.equal(
    value.isolated.prepare('SELECT COUNT(*) AS count FROM files').get().count,
    0
  );
});

test('preflight identity replacement stays a SOURCE_PREFLIGHT failure', t => {
  const value = fixture(t);
  insertMemory(value.source);
  value.closeSource();

  const replacementFile = path.join(
    value.sourceStore,
    'knowledge_base.replacement.sqlite'
  );
  const replacement = new DatabaseSync(replacementFile);
  createSchema(replacement);
  insertMemory(replacement, {
    checksum: 'replacement-checksum',
    content: 'synthetic replacement memory'
  });
  replacement.close();

  let sourceLstatCount = 0;
  let replaced = false;
  const fsModule = {
    ...fs,
    lstatSync(file) {
      const stat = fs.lstatSync(file);
      if (file === value.sourceFile) {
        sourceLstatCount += 1;
        if (sourceLstatCount === 3) {
          fs.renameSync(replacementFile, value.sourceFile);
          replaced = true;
        }
      }
      return stat;
    }
  };
  let opened = false;
  const hydrate = value.hydrator({
    fsModule,
    openSourceDatabase() {
      opened = true;
      throw new Error('must not open a replaced preflight source');
    }
  });

  assert.throws(
    () => hydrate.preflight({
      allowedDiaryNames: ['PROJECT_ALPHA'],
      dimension: 2
    }),
    error => {
      assert.equal(
        error.code,
        'selected_diary_hydration_source_database_invalid'
      );
      assert.equal(error.reasonCode, 'source_identity_invalid');
      assert.equal(error.counterFacts, undefined);
      const failure = failureRegistryEntry(error.reasonCode);
      assert.equal(failure.stage, 'SOURCE_PREFLIGHT');
      assert.equal(failure.provider_may_have_occurred, false);
      return true;
    }
  );
  assert.equal(replaced, true);
  assert.equal(opened, false);
});

test('materialization invalid allowlists become HYDRATION failures', t => {
  const value = fixture(t);
  insertMemory(value.source);
  value.closeSource();
  let openCount = 0;
  const hydrate = value.hydrator({
    openSourceDatabase(file) {
      openCount += 1;
      return openReadOnlyDatabase(file);
    }
  });
  const plan = hydrate.preflight({
    allowedDiaryNames: ['PROJECT_ALPHA'],
    dimension: 2
  });
  assert.equal(openCount, 1);

  for (const allowedDiaryNames of [
    [],
    ['PROJECT_ALPHA', 'PROJECT_ALPHA'],
    ['../PROJECT_ALPHA'],
    Array.from(
      { length: 8 },
      (_, index) => `${'界'.repeat(254)}${index}`
    )
  ]) {
    assert.throws(
      () => hydrate.materialize({
        ...hydrationInput(value),
        allowedDiaryNames,
        projectionPlan: plan
      }),
      error => {
        assert.equal(
          error.code,
          'selected_diary_hydration_allowlist_invalid'
        );
        assert.equal(error.reasonCode, 'hydration_failed');
        assert.deepEqual(
          error.counterFacts,
          zeroDerivedCounterFactsFixture()
        );
        const failure = failureRegistryEntry(error.reasonCode);
        assert.equal(failure.stage, 'HYDRATION');
        assert.equal(failure.provider_may_have_occurred, true);
        return true;
      }
    );
  }
  assert.equal(openCount, 1);
  assert.equal(
    value.isolated.prepare('SELECT COUNT(*) AS count FROM files').get().count,
    0
  );
});

test('projection byte budgets reject before selected rows are materialized', () => {
  const schema = {
    files: [
      ['id', 'INTEGER', 0, 1],
      ['path', 'TEXT', 1, 0],
      ['diary_name', 'TEXT', 1, 0],
      ['checksum', 'TEXT', 1, 0],
      ['mtime', 'INTEGER', 1, 0],
      ['size', 'INTEGER', 1, 0],
      ['updated_at', 'INTEGER', 0, 0]
    ],
    chunks: [
      ['id', 'INTEGER', 0, 1],
      ['file_id', 'INTEGER', 1, 0],
      ['chunk_index', 'INTEGER', 1, 0],
      ['content', 'TEXT', 1, 0],
      ['vector', 'BLOB', 0, 0]
    ]
  };
  for (const summaryPatch of [
    { metadataBytes: MAX_SELECTED_METADATA_BYTES + 1 },
    { contentBytes: MAX_SELECTED_CONTENT_BYTES + 1 },
    { vectorBytes: MAX_SELECTED_VECTOR_BYTES + 1 }
  ]) {
    let selectedRowsMaterialized = false;
    const database = {
      prepare(sql) {
        if (sql.includes('PRAGMA table_info(files)')) {
          return {
            all() {
              return schema.files.map(([name, type, notnull, pk], cid) => ({
                cid,
                name,
                type,
                notnull,
                dflt_value: null,
                pk
              }));
            }
          };
        }
        if (sql.includes('PRAGMA table_info(chunks)')) {
          return {
            all() {
              return schema.chunks.map(([name, type, notnull, pk], cid) => ({
                cid,
                name,
                type,
                notnull,
                dflt_value: null,
                pk
              }));
            }
          };
        }
        if (sql.includes('AS metadataBytes')) {
          return {
            iterate() {
              return [{
                metadataBytes:
                  summaryPatch.metadataBytes ?? 64
              }][Symbol.iterator]();
            }
          };
        }
        if (sql.includes('AS contentBytes')) {
          return {
            iterate() {
              return [{
                contentBytes:
                  summaryPatch.contentBytes ?? 32,
                vectorBytes:
                  summaryPatch.vectorBytes ?? 8
              }][Symbol.iterator]();
            }
          };
        }
        selectedRowsMaterialized = true;
        throw new Error('selected rows must not be materialized');
      }
    };
    assert.throws(
      () => scanSelectedProjection(database, ['PROJECT_ALPHA'], 2),
      {
        code: 'selected_diary_hydration_source_projection_invalid',
        reasonCode: 'source_budget_exceeded'
      }
    );
    assert.equal(selectedRowsMaterialized, false);
  }
});

test('source preflight deadline guard interrupts the streaming budget scan', t => {
  const value = fixture(t);
  insertMemory(value.source);
  insertMemory(value.source, {
    chunkId: 12,
    content: 'second selected memory',
    fileId: 8,
    filePath: 'PROJECT_ALPHA/second.md'
  });
  value.closeSource();
  let budgetRowsRead = 0;
  let deadlineChecks = 0;
  const hydrate = value.hydrator({
    openSourceDatabase(file) {
      const database = openReadOnlyDatabase(file);
      return proxyReadOnlyDatabase(database, (sql, statement) => ({
        all: statement.all.bind(statement),
        get: statement.get.bind(statement),
        iterate(...args) {
          const iterator = statement.iterate(...args);
          if (!sql.includes('AS metadataBytes')) return iterator;
          return {
            [Symbol.iterator]() {
              return this;
            },
            next() {
              const step = iterator.next();
              if (!step.done) budgetRowsRead += 1;
              return step;
            }
          };
        }
      }));
    }
  });

  assert.throws(
    () => hydrate.preflight({
      allowedDiaryNames: ['PROJECT_ALPHA'],
      assertReadDeadline() {
        deadlineChecks += 1;
        if (budgetRowsRead >= 1) {
          throw new Error('synthetic_attempt_deadline');
        }
      },
      dimension: 2
    }),
    {
      code: 'selected_diary_hydration_source_deadline_exceeded',
      reasonCode: 'source_preflight_failed'
    }
  );
  assert.equal(budgetRowsRead, 1);
  assert.ok(deadlineChecks > 1);
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

test('production hydrator rolls back trigger-created secondary state atomically', async t => {
  const value = fixture(t);
  insertMemory(value.source);
  value.isolated.exec(`
    CREATE TRIGGER contaminate_hydration
    AFTER INSERT ON files
    BEGIN
      INSERT INTO tags (name, vector) VALUES ('synthetic-trigger-tag', NULL);
    END
  `);
  value.closeSource();
  await assert.rejects(
    () => value.hydrator()(hydrationInput(value)),
    error => {
      assert.equal(
        error.code,
        'selected_diary_hydration_isolated_store_changed'
      );
      assert.equal(error.reasonCode, 'hydration_failed');
      assert.deepEqual(error.counterFacts, {
        primary_memory: {
          write_attempts: 0,
          writes_committed: 0
        },
        derived_transaction: {
          started: 1,
          committed: 0,
          rolled_back: 1
        }
      });
      const stageReceipt = hydrationAttemptReceipt(error.counterFacts, {
        outcome: 'failed',
        reasonCode: error.reasonCode
      });
      assert.equal(stageReceipt.stage, 'HYDRATION');
      assert.equal(stageReceipt.reason_code, 'hydration_failed');
      return true;
    }
  );
  for (const table of ['files', 'chunks', 'tags']) {
    assert.equal(
      value.isolated.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count,
      0
    );
  }
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

test('two-phase source projection returns a bounded immutable plan and streams multiple exact diaries', t => {
  const value = fixture(t);
  insertMemory(value.source, {
    chunkId: 11,
    diaryName: 'PROJECT_ALPHA',
    fileId: 7,
    filePath: 'PROJECT_ALPHA/alpha.md'
  });
  insertMemory(value.source, {
    chunkId: 12,
    content: 'synthetic beta memory',
    diaryName: 'PROJECT_BETA',
    fileId: 8,
    filePath: 'PROJECT_BETA/beta.md'
  });
  insertMemory(value.source, {
    chunkId: 13,
    content: 'synthetic root memory',
    diaryName: 'Root',
    fileId: 9,
    filePath: 'root.md'
  });
  value.closeSource();

  const hydrate = value.hydrator();
  const allowedDiaryNames = ['Root', 'PROJECT_BETA', 'PROJECT_ALPHA'];
  const plan = hydrate.preflight({
    allowedDiaryNames,
    dimension: 2
  });
  assert.equal(validateProjectionPlan(plan), plan);
  assert.equal(Object.isFrozen(plan), true);
  assert.equal(Object.isFrozen(plan.budget), true);
  assert.ok(Buffer.byteLength(JSON.stringify(plan)) <= MAX_PROJECTION_PLAN_BYTES);
  assert.deepEqual(plan.allowed_diary_names, [
    'PROJECT_ALPHA',
    'PROJECT_BETA',
    'Root'
  ]);
  assert.deepEqual(plan.budget, {
    file_count: 3,
    chunk_count: 3,
    metadata_bytes: 132,
    content_bytes: 67,
    vector_bytes: 24
  });
  assert.match(plan.source_identity_digest, /^sha256:[a-f0-9]{64}$/u);
  assert.match(plan.selected_projection_digest, /^sha256:[a-f0-9]{64}$/u);
  assert.doesNotMatch(
    JSON.stringify(plan),
    /synthetic governed memory|synthetic beta memory|synthetic root memory/u
  );

  const receipt = hydrate.materialize({
    ...hydrationInput(value, allowedDiaryNames),
    projectionPlan: plan
  });
  assert.equal(receipt.hydratedDiaryCount, 3);
  assert.equal(receipt.hydratedFileCount, 3);
  assert.equal(receipt.hydratedChunkCount, 3);
  assert.deepEqual(receipt.counterFacts.derived_transaction, {
    started: 1,
    committed: 1,
    rolled_back: 0
  });
});

test('preflight digest is deterministic and selected rows never use all()', t => {
  const value = fixture(t);
  insertMemory(value.source);
  value.closeSource();
  let selectedIterators = 0;
  const hydrate = value.hydrator({
    openSourceDatabase(file) {
      const database = openReadOnlyDatabase(file);
      return proxyReadOnlyDatabase(database, (sql, statement) => ({
        all(...args) {
          if (sql.includes('ORDER BY path, id') ||
              sql.includes('ORDER BY c.file_id')) {
            throw new Error('selected rows must stream');
          }
          return statement.all(...args);
        },
        get: statement.get.bind(statement),
        iterate(...args) {
          if (sql.includes('ORDER BY path, id') ||
              sql.includes('ORDER BY c.file_id')) {
            selectedIterators += 1;
          }
          return statement.iterate(...args);
        }
      }));
    }
  });
  const first = hydrate.preflight({
    allowedDiaryNames: ['PROJECT_ALPHA'],
    dimension: 2
  });
  const second = hydrate.preflight({
    allowedDiaryNames: ['PROJECT_ALPHA'],
    dimension: 2
  });
  assert.equal(
    first.selected_projection_digest,
    second.selected_projection_digest
  );
  assert.equal(first.plan_digest, second.plan_digest);
  assert.equal(selectedIterators, 4);
});

test('materialization rejects source mutation between digest passes before starting a derived transaction', t => {
  const value = fixture(t);
  insertMemory(value.source);
  value.closeSource();
  const hydrate = value.hydrator();
  const plan = hydrate.preflight({
    allowedDiaryNames: ['PROJECT_ALPHA'],
    dimension: 2
  });
  const writer = new DatabaseSync(value.sourceFile);
  writer.prepare(
    'UPDATE chunks SET content = ? WHERE id = ?'
  ).run('synthetic source changed after preflight', 11);
  writer.close();

  assert.throws(
    () => hydrate.materialize({
      ...hydrationInput(value),
      projectionPlan: plan
    }),
    error => {
      assert.equal(error.code, 'source_snapshot_changed_after_preflight');
      assert.equal(error.reasonCode, 'source_snapshot_changed_after_preflight');
      assert.deepEqual(error.counterFacts, {
        primary_memory: {
          write_attempts: 0,
          writes_committed: 0
        },
        derived_transaction: {
          started: 0,
          committed: 0,
          rolled_back: 0
        }
      });
      const stageReceipt = hydrationAttemptReceipt(error.counterFacts, {
        outcome: 'failed',
        reasonCode: error.reasonCode
      });
      assert.equal(stageReceipt.stage, 'HYDRATION');
      assert.equal(
        stageReceipt.reason_code,
        'source_snapshot_changed_after_preflight'
      );
      return true;
    }
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

test('materialization keeps the verified second-pass snapshot while streaming into the derived transaction', t => {
  const value = fixture(t);
  value.source.exec('PRAGMA journal_mode = WAL');
  insertMemory(value.source, {
    content: 'synthetic stable snapshot memory'
  });
  value.closeSource();
  let openCount = 0;
  let selectedFileScans = 0;
  const hydrate = value.hydrator({
    openSourceDatabase(file) {
      openCount += 1;
      const database = openReadOnlyDatabase(file);
      if (openCount !== 2) return database;
      return proxyReadOnlyDatabase(database, (sql, statement) => ({
        all: statement.all.bind(statement),
        get: statement.get.bind(statement),
        iterate(...args) {
          if (sql.includes('ORDER BY path, id')) {
            selectedFileScans += 1;
            if (selectedFileScans === 2) {
              const writer = new DatabaseSync(value.sourceFile);
              writer.prepare(
                'UPDATE chunks SET content = ? WHERE id = ?'
              ).run('synthetic mutation after second digest', 11);
              writer.close();
            }
          }
          return statement.iterate(...args);
        }
      }));
    }
  });
  const plan = hydrate.preflight({
    allowedDiaryNames: ['PROJECT_ALPHA'],
    dimension: 2
  });
  const receipt = hydrate.materialize({
    ...hydrationInput(value),
    projectionPlan: plan
  });
  assert.equal(receipt.accepted, true);
  assert.deepEqual(
    {
      ...value.isolated.prepare('SELECT content FROM chunks').get()
    },
    { content: 'synthetic stable snapshot memory' }
  );
  const sourceAfter = new DatabaseSync(value.sourceFile, { readOnly: true });
  assert.deepEqual(
    {
      ...sourceAfter.prepare('SELECT content FROM chunks').get()
    },
    { content: 'synthetic mutation after second digest' }
  );
  sourceAfter.close();
});

test('source replacement after preflight fails closed as a snapshot change', t => {
  const value = fixture(t);
  insertMemory(value.source);
  value.closeSource();
  const hydrate = value.hydrator();
  const plan = hydrate.preflight({
    allowedDiaryNames: ['PROJECT_ALPHA'],
    dimension: 2
  });
  const replacedFile = `${value.sourceFile}.preflight`;
  fs.renameSync(value.sourceFile, replacedFile);
  const replacement = new DatabaseSync(value.sourceFile);
  createSchema(replacement);
  insertMemory(replacement);
  replacement.close();

  assert.throws(
    () => hydrate.materialize({
      ...hydrationInput(value),
      projectionPlan: plan
    }),
    {
      code: 'source_snapshot_changed_after_preflight',
      reasonCode: 'source_snapshot_changed_after_preflight'
    }
  );
});

test('projection plan tamper is rejected without opening a derived transaction', t => {
  const value = fixture(t);
  insertMemory(value.source);
  value.closeSource();
  const hydrate = value.hydrator();
  const plan = hydrate.preflight({
    allowedDiaryNames: ['PROJECT_ALPHA'],
    dimension: 2
  });
  const tampered = structuredClone(plan);
  tampered.budget.file_count += 1;
  assert.throws(
    () => hydrate.materialize({
      ...hydrationInput(value),
      projectionPlan: tampered
    }),
    {
      code: 'selected_diary_hydration_projection_plan_invalid',
      reasonCode: 'hydration_failed'
    }
  );
  assert.equal(
    value.isolated.prepare('SELECT COUNT(*) AS count FROM files').get().count,
    0
  );
});

test('projection plan canonicalization failures become controlled hydration evidence', t => {
  const value = fixture(t);
  insertMemory(value.source);
  value.closeSource();
  let openCount = 0;
  const hydrate = value.hydrator({
    openSourceDatabase(file) {
      openCount += 1;
      return openReadOnlyDatabase(file);
    }
  });
  const plan = hydrate.preflight({
    allowedDiaryNames: ['PROJECT_ALPHA'],
    dimension: 2
  });
  assert.equal(openCount, 1);

  const cyclic = structuredClone(plan);
  cyclic.budget.cycle = cyclic.budget;
  const bigint = structuredClone(plan);
  bigint.budget.file_count = 1n;
  for (const malformed of [cyclic, bigint]) {
    assert.throws(
      () => hydrate.materialize({
        ...hydrationInput(value),
        projectionPlan: malformed
      }),
      error => {
        assert.equal(
          error.code,
          'selected_diary_hydration_projection_plan_invalid'
        );
        assert.equal(error.reasonCode, 'hydration_failed');
        assert.deepEqual(error.counterFacts, {
          primary_memory: {
            write_attempts: 0,
            writes_committed: 0
          },
          derived_transaction: {
            started: 0,
            committed: 0,
            rolled_back: 0
          }
        });
        return true;
      }
    );
  }
  assert.equal(openCount, 1);
  assert.equal(
    value.isolated.prepare('SELECT COUNT(*) AS count FROM files').get().count,
    0
  );
});

test('source schema validation rejects drift before selected row iteration', t => {
  const value = fixture(t);
  value.source.exec('ALTER TABLE chunks RENAME TO chunks_old');
  value.source.exec(`
    CREATE TABLE chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL
    )
  `);
  value.closeSource();
  assert.throws(
    () => value.hydrator().preflight({
      allowedDiaryNames: ['PROJECT_ALPHA'],
      dimension: 2
    }),
    {
      code: 'selected_diary_hydration_source_schema_invalid',
      reasonCode: 'source_schema_invalid'
    }
  );
});

test('source preflight rejects vectorless and non-finite writer corruption', async t => {
  const cases = [
    ['vectorless', null],
    ['nan', vector([Number.NaN, 0.5])],
    ['infinity', vector([Number.POSITIVE_INFINITY, 0.5])]
  ];
  for (const [name, vectorValue] of cases) {
    await t.test(name, child => {
      const value = fixture(child);
      insertMemory(value.source, { vectorValue });
      value.closeSource();
      assert.throws(
        () => value.hydrator().preflight({
          allowedDiaryNames: ['PROJECT_ALPHA'],
          dimension: 2
        }),
        {
          code: 'selected_diary_hydration_source_projection_invalid',
          reasonCode: 'source_vector_invalid'
        }
      );
    });
  }
});
