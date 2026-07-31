'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const EXPECTED_VCP_SHA = '555b3b538f6eb736e530c2912de678c5941f9985';
const QUIESCENCE_TIMEOUT_MS = 10_000;

function requiredAbsoluteDirectory(name) {
  const value = process.env[name];
  if (!value ||
      !path.isAbsolute(value) ||
      path.resolve(value) !== value ||
      !fs.statSync(value).isDirectory()) {
    throw new Error(`${name.toLowerCase()}_invalid`);
  }
  return value;
}

function clearTimer(owner, key, clear = clearTimeout) {
  if (!owner?.[key]) return;
  clear(owner[key]);
  owner[key] = null;
}

async function quiesceManager(manager) {
  if (manager.watcher) {
    if (manager.watcherType === 'rust') {
      const stop = manager.watcher.stopWatch || manager.watcher.stop_watch;
      if (typeof stop === 'function') stop.call(manager.watcher);
    } else if (typeof manager.watcher.close === 'function') {
      await manager.watcher.close();
    }
    manager.watcher = null;
  }
  if (manager.ragParamsWatcher) {
    await manager.ragParamsWatcher.close();
    manager.ragParamsWatcher = null;
  }
  clearTimer(manager, 'idleSweepTimer', clearInterval);
  clearTimer(manager, 'eventLoopWatchdogTimer', clearInterval);
  clearTimer(manager, 'batchTimer');
  clearTimer(manager, 'deleteBatchTimer');
  clearTimer(manager?.tagMemoEngine, '_postStartupDerivedRefreshTimer');
  clearTimer(manager?.tagMemoEngine, '_matrixRebuildTimer');
  clearTimer(manager?.tagMemoEngine, '_derivedTaskTimer');
}

async function waitForQueue(manager, queueName, processingName) {
  const deadline = Date.now() + QUIESCENCE_TIMEOUT_MS;
  while (manager[queueName].size > 0 || manager[processingName] === true) {
    if (Date.now() >= deadline) {
      throw new Error(`exact_vcp_${queueName}_did_not_quiesce`);
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

async function flushFiles(manager, files) {
  for (const file of files) manager.pendingFiles.add(file);
  await manager._flushBatch();
  await waitForQueue(manager, 'pendingFiles', 'isProcessing');
}

async function flushDelete(manager, file) {
  manager._queueDelete(file);
  await manager._flushDeleteBatch();
  await waitForQueue(manager, 'pendingDeletes', 'isProcessingDeletes');
}

function sha256File(file) {
  return `sha256:${crypto.createHash('sha256')
    .update(fs.readFileSync(file))
    .digest('hex')}`;
}

function exactDatabaseConstructor(vcpRoot) {
  const modulePath = require.resolve('better-sqlite3', {
    paths: [vcpRoot]
  });
  return require(modulePath);
}

function loadFreshKnowledgeBaseManager(vcpRoot) {
  const modulePath = path.join(vcpRoot, 'KnowledgeBaseManager.js');
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

function setRuntimeEnvironment({
  memoryRoot,
  storePath
}) {
  process.env.KNOWLEDGEBASE_ROOT_PATH = memoryRoot;
  process.env.KNOWLEDGEBASE_STORE_PATH = storePath;
}

function vectorBuffer(values) {
  return Buffer.from(new Float32Array(values).buffer);
}

function bridgeWorkingSet(contracts, suffix) {
  const header = contracts.createAttemptHeader({
    attemptRef: `grat_${suffix.repeat(32)}`,
    toolName: 'search_memory',
    requestDigest: contracts.digestObject(`exact-request-${suffix}`),
    contextBindingDigest:
      contracts.digestObject(`exact-context-${suffix}`),
    now: new Date('2026-07-30T00:00:00.000Z')
  });
  const receipts = [];
  for (const stage of [
    'CREATED',
    'EDGE_VALIDATED',
    'RELAY_CLAIMED',
    'AUTHORIZED',
    'BRIDGE_DELEGATED'
  ]) {
    receipts.push(contracts.createStageReceipt({
      header,
      receipts,
      stage,
      counterFacts: stage === 'BRIDGE_DELEGATED'
        ? { fallback: { attempts: 0 } }
        : {}
    }));
  }
  return { header, receipts };
}

function copyWriterDatabase({
  Database,
  sourceFile,
  targetRoot
}) {
  const memoryRoot = path.join(targetRoot, 'dailynote');
  const storePath = path.join(targetRoot, 'VectorStore');
  fs.mkdirSync(memoryRoot, { recursive: true });
  fs.mkdirSync(storePath, { recursive: true });
  const targetFile = path.join(storePath, 'knowledge_base.sqlite');
  fs.copyFileSync(sourceFile, targetFile);
  const database = new Database(targetFile);
  database.pragma('journal_mode = WAL');
  return {
    database,
    memoryRoot,
    storePath,
    targetFile
  };
}

function expectPreflightFailure({
  Database,
  codexRoot,
  runtimeRoot,
  sourceFile,
  name,
  mutate,
  reasonCode
}) {
  const {
    createProductionSelectedDiarySourceProjection
  } = require(path.join(
    codexRoot,
    'src/runtime/vcp-native/production-selected-diary-hydrator.js'
  ));
  const caseRoot = path.join(runtimeRoot, `corruption-${name}`);
  const copied = copyWriterDatabase({
    Database,
    sourceFile,
    targetRoot: caseRoot
  });
  try {
    mutate(copied.database);
  } finally {
    copied.database.close();
  }
  const projection = createProductionSelectedDiarySourceProjection({
    sourceKnowledgeBaseStorePath: copied.storePath,
    vcpToolBoxRoot: caseRoot,
    sourceDatabaseConstructor: Database
  });
  assert.throws(
    () => projection.preflight({
      allowedDiaryNames: ['PROJECT_ALPHA'],
      dimension: 4
    }),
    error => {
      assert.equal(error.reasonCode, reasonCode);
      return true;
    }
  );
  return reasonCode;
}

async function run() {
  const vcpRoot = requiredAbsoluteDirectory('EXACT_VCP_ROOT');
  const codexRoot = requiredAbsoluteDirectory('CODEX_MEMORY_SOURCE_ROOT');
  const workspaceRoot = requiredAbsoluteDirectory('EXACT_VCP_RUNTIME_ROOT');
  assert.equal(process.env.EXACT_VCP_EXPECTED_SHA, EXPECTED_VCP_SHA);
  process.chdir(workspaceRoot);

  const runtimeRoot = path.join(workspaceRoot, 'vcp-runtime');
  const memoryRoot = path.join(runtimeRoot, 'dailynote');
  const primaryStore = path.join(runtimeRoot, 'VectorStore');
  const leaseRoot = path.join(workspaceRoot, 'governed-read-leases');
  fs.mkdirSync(runtimeRoot, { recursive: true });
  fs.mkdirSync(memoryRoot, { recursive: true });
  fs.mkdirSync(primaryStore, { recursive: true });
  fs.mkdirSync(leaseRoot, { recursive: true, mode: 0o700 });
  fs.chmodSync(leaseRoot, 0o700);

  setRuntimeEnvironment({ memoryRoot, storePath: primaryStore });
  const primaryManager = loadFreshKnowledgeBaseManager(vcpRoot);
  await primaryManager.initialize();
  await quiesceManager(primaryManager);

  const alphaRoot = path.join(memoryRoot, 'PROJECT_ALPHA');
  const betaRoot = path.join(memoryRoot, 'PROJECT_BETA');
  const deniedRoot = path.join(memoryRoot, 'PROJECT_DENIED');
  fs.mkdirSync(alphaRoot, { recursive: true });
  fs.mkdirSync(betaRoot, { recursive: true });
  fs.mkdirSync(deniedRoot, { recursive: true });
  const sparseFile = path.join(alphaRoot, 'sparse.md');
  const updateFile = path.join(alphaRoot, 'update.md');
  const betaKeepFile = path.join(betaRoot, 'keep.md');
  const betaDeleteFile = path.join(betaRoot, 'delete.md');
  const deniedFile = path.join(deniedRoot, 'denied.md');
  const rootFile = path.join(memoryRoot, 'root.md');

  fs.writeFileSync(
    sparseFile,
    [
      'OMIT_VECTOR_SENTINEL alpha beta gamma delta epsilon zeta eta theta.',
      'SECOND_VALID_SENTINEL iota kappa lambda mu nu xi omicron pi rho.'
    ].join('\n'),
    'utf8'
  );
  fs.writeFileSync(updateFile, 'writer update version one.', 'utf8');
  fs.writeFileSync(betaKeepFile, 'writer beta retained memory.', 'utf8');
  fs.writeFileSync(betaDeleteFile, 'writer beta delete path memory.', 'utf8');
  fs.writeFileSync(
    deniedFile,
    'writer update version two unauthorized diary sentinel.',
    'utf8'
  );
  fs.writeFileSync(rootFile, 'writer root memory.', 'utf8');
  await flushFiles(primaryManager, [
    sparseFile,
    updateFile,
    betaKeepFile,
    betaDeleteFile,
    deniedFile,
    rootFile
  ]);

  const beforeUpdate = primaryManager.db.prepare(
    'SELECT checksum FROM files WHERE path = ?'
  ).get('PROJECT_ALPHA/update.md');
  fs.writeFileSync(updateFile, 'writer update version two.', 'utf8');
  const future = new Date(Date.now() + 2_000);
  fs.utimesSync(updateFile, future, future);
  await flushFiles(primaryManager, [updateFile]);
  const afterUpdate = primaryManager.db.prepare(
    'SELECT checksum FROM files WHERE path = ?'
  ).get('PROJECT_ALPHA/update.md');
  assert.notEqual(afterUpdate?.checksum, beforeUpdate?.checksum);

  fs.unlinkSync(betaDeleteFile);
  await flushDelete(primaryManager, betaDeleteFile);
  assert.equal(
    primaryManager.db.prepare(
      'SELECT COUNT(*) AS count FROM files WHERE path = ?'
    ).get('PROJECT_BETA/delete.md').count,
    0
  );
  assert.equal(
    primaryManager.db.prepare(
      'SELECT COUNT(*) AS count FROM files WHERE path = ?'
    ).get('PROJECT_DENIED/denied.md').count,
    1
  );

  const sparseIndexes = primaryManager.db.prepare(`
    SELECT c.chunk_index AS chunkIndex
    FROM chunks c
    INNER JOIN files f ON f.id = c.file_id
    WHERE f.path = ?
    ORDER BY c.chunk_index
  `).all('PROJECT_ALPHA/sparse.md').map(row => row.chunkIndex);
  assert.ok(sparseIndexes.length >= 1);
  assert.ok(sparseIndexes[0] > 0);
  const writerFileCount = primaryManager.db.prepare(
    'SELECT COUNT(*) AS count FROM files'
  ).get().count;
  const writerChunkCount = primaryManager.db.prepare(
    'SELECT COUNT(*) AS count FROM chunks'
  ).get().count;
  assert.ok(writerFileCount >= 5);
  assert.ok(writerChunkCount >= 5);

  await quiesceManager(primaryManager);
  await primaryManager.shutdown();
  const sourceFile = path.join(primaryStore, 'knowledge_base.sqlite');
  const Database = exactDatabaseConstructor(vcpRoot);
  const sourceBeforeRead = sha256File(sourceFile);

  const {
    createProductionSelectedDiarySourceProjection
  } = require(path.join(
    codexRoot,
    'src/runtime/vcp-native/production-selected-diary-hydrator.js'
  ));
  const projection = createProductionSelectedDiarySourceProjection({
    sourceKnowledgeBaseStorePath: primaryStore,
    vcpToolBoxRoot: runtimeRoot,
    sourceDatabaseConstructor: Database
  });
  const {
    createGovernedReadLeaseWorker,
    runLeaseWorkerProcess
  } = require(path.join(
    codexRoot,
    'src/runtime/vcp-native/governed-read-lease-worker.js'
  ));
  const {
    createVcpQueryEmbeddingProvider
  } = require(path.join(
    codexRoot,
    'src/runtime/vcp-native/production-governed-read-shim.js'
  ));
  const exactQueryEmbeddingProvider =
    createVcpQueryEmbeddingProvider({
      vcpToolBoxRoot: vcpRoot,
      apiUrl: process.env.API_URL,
      apiKey: process.env.API_Key,
      model: process.env.WhitelistEmbeddingModel
    });
  const contracts = require(path.join(
    codexRoot,
    'packages/chatgpt-r4-contracts'
  ));
  const allowedDiaryNames = Object.freeze([
    'PROJECT_ALPHA',
    'PROJECT_BETA',
    'Root'
  ]);
  const authorization = Object.freeze({
    accepted: true,
    allowedDiaryNames,
    allowedDiaryCount: allowedDiaryNames.length,
    mappingReference: 'exact-vcp-writer-authority-v1',
    mappingDigest: `sha256:${crypto.createHash('sha256')
      .update('exact-vcp-writer-authority-v1')
      .digest('hex')}`
  });
  let providerInvocationCount = 0;
  let derivedScopeDirectlyVerified = false;
  const runWorkerWithDerivedScopeGate = async (task, options) => {
    const execution = await runLeaseWorkerProcess(task, options);
    if (execution?.response?.result?.accepted !== true ||
        execution.shutdown_complete !== true) {
      return execution;
    }
    const derivedDatabase = new Database(path.join(
      task.derived_store_path,
      'knowledge_base.sqlite'
    ), {
      readonly: true,
      fileMustExist: true
    });
    try {
      const placeholders = task.authorization.allowedDiaryNames
        .map(() => '?')
        .join(', ');
      const unauthorizedDiaryRows = derivedDatabase.prepare(`
        SELECT COUNT(*) AS count
        FROM files
        WHERE diary_name NOT IN (${placeholders})
      `).get(...task.authorization.allowedDiaryNames).count;
      const unauthorizedSentinelRows = derivedDatabase.prepare(`
        SELECT COUNT(*) AS count
        FROM chunks c
        INNER JOIN files f ON f.id = c.file_id
        WHERE f.diary_name = 'PROJECT_DENIED'
           OR c.content LIKE ?
      `).get('%unauthorized diary sentinel%').count;
      assert.equal(unauthorizedDiaryRows, 0);
      assert.equal(unauthorizedSentinelRows, 0);
      derivedScopeDirectlyVerified = true;
    } finally {
      derivedDatabase.close();
    }
    return execution;
  };
  const leaseWorker = createGovernedReadLeaseWorker({
    clock: () => new Date('2026-07-30T00:00:00.000Z'),
    sourceProjection: projection,
    async providerWrapper(input) {
      providerInvocationCount += 1;
      return exactQueryEmbeddingProvider(input);
    },
    dimension: 4,
    leaseRoot,
    vcpCodeRoot: vcpRoot,
    sourceRuntimeRoot: runtimeRoot,
    sourceKnowledgeBaseStorePath: primaryStore,
    knowledgeBaseRootPath: memoryRoot,
    workerRunner: runWorkerWithDerivedScopeGate,
    workerTimeoutMs: 60_000,
    terminationGraceMs: 5_000
  });
  const searchResult = await leaseWorker.execute({
    workingSet: bridgeWorkingSet(contracts, 'w'),
    authorization,
    query: 'writer update version two',
    limit: 1
  });
  assert.equal(searchResult.accepted, true);
  assert.equal(searchResult.cleanup_complete, true);
  assert.equal(searchResult.evidence_complete, true);
  const attemptCounters = contracts.aggregateAttemptCounters(
    searchResult.working_set.receipts
  );
  assert.deepEqual(attemptCounters.primary_memory, {
    write_attempts: 0,
    writes_committed: 0
  });
  assert.deepEqual(attemptCounters.derived_transaction, {
    started: 1,
    committed: 1,
    rolled_back: 0
  });
  assert.deepEqual(attemptCounters.provider, {
    started: 1,
    succeeded: 1,
    failed: 0
  });
  assert.deepEqual(attemptCounters.native_invocation, {
    started: 1,
    succeeded: 1,
    failed: 0
  });
  assert.equal(attemptCounters.fallback.attempts, 0);
  const workerSnapshot = leaseWorker.snapshot();
  assert.equal(workerSnapshot.provider_invocations, 1);
  assert.equal(workerSnapshot.provider_calls_in_flight, 0);
  assert.equal(workerSnapshot.native_invocations, 1);
  assert.equal(workerSnapshot.preflight_processes_started, 1);
  assert.equal(workerSnapshot.preflight_processes_completed, 1);
  assert.equal(workerSnapshot.stores_created, 1);
  assert.equal(workerSnapshot.stores_removed, 1);
  assert.equal(workerSnapshot.cleanup_blocked, false);
  assert.equal(workerSnapshot.sigkill_count, 0);
  assert.equal(workerSnapshot.provider_authority_in_child, false);
  assert.equal(providerInvocationCount, 1);
  assert.equal(derivedScopeDirectlyVerified, true);
  assert.equal(searchResult.result.result_count, 1);
  assert.equal(
    searchResult.result.raw_memory_content_disclosed,
    false
  );
  assert.equal(searchResult.result.raw_vector_disclosed, false);
  assert.equal(searchResult.result.source_path_disclosed, false);
  assert.equal(
    searchResult.result.provider_response_disclosed,
    false
  );
  assert.doesNotMatch(
    JSON.stringify(searchResult.result),
    /PROJECT_DENIED|unauthorized diary sentinel/u
  );
  assert.equal(
    searchResult.working_set.receipts.at(-1).stage,
    'SCOPE_POSTCHECK'
  );
  assert.equal(sha256File(sourceFile), sourceBeforeRead);

  const originalSourceCopy = path.join(runtimeRoot, 'writer-primary-copy.sqlite');
  fs.copyFileSync(sourceFile, originalSourceCopy);
  const negativeReasons = {};
  negativeReasons.vectorless = expectPreflightFailure({
    Database,
    codexRoot,
    runtimeRoot,
    sourceFile: originalSourceCopy,
    name: 'vectorless',
    reasonCode: 'source_vector_invalid',
    mutate(database) {
      const row = database.prepare(`
        SELECT c.file_id AS fileId, MAX(c.chunk_index) AS chunkIndex
        FROM chunks c
        INNER JOIN files f ON f.id = c.file_id
        WHERE f.diary_name = 'PROJECT_ALPHA'
      `).get();
      database.prepare(`
        INSERT INTO chunks (file_id, chunk_index, content, vector)
        VALUES (?, ?, ?, NULL)
      `).run(row.fileId, row.chunkIndex + 10, 'test-only vectorless corruption');
    }
  });
  negativeReasons.duplicate_index = expectPreflightFailure({
    Database,
    codexRoot,
    runtimeRoot,
    sourceFile: originalSourceCopy,
    name: 'duplicate-index',
    reasonCode: 'source_schema_invalid',
    mutate(database) {
      const row = database.prepare(`
        SELECT c.file_id AS fileId, c.chunk_index AS chunkIndex, c.vector
        FROM chunks c
        INNER JOIN files f ON f.id = c.file_id
        WHERE f.diary_name = 'PROJECT_ALPHA'
        LIMIT 1
      `).get();
      database.prepare(`
        INSERT INTO chunks (file_id, chunk_index, content, vector)
        VALUES (?, ?, ?, ?)
      `).run(
        row.fileId,
        row.chunkIndex,
        'test-only duplicate-index corruption',
        row.vector
      );
    }
  });
  negativeReasons.nan = expectPreflightFailure({
    Database,
    codexRoot,
    runtimeRoot,
    sourceFile: originalSourceCopy,
    name: 'nan',
    reasonCode: 'source_vector_invalid',
    mutate(database) {
      database.prepare(
        'UPDATE chunks SET vector = ? WHERE id = (SELECT MIN(id) FROM chunks)'
      ).run(vectorBuffer([Number.NaN, 0.25, 0.5, 0.75]));
    }
  });
  negativeReasons.infinity = expectPreflightFailure({
    Database,
    codexRoot,
    runtimeRoot,
    sourceFile: originalSourceCopy,
    name: 'infinity',
    reasonCode: 'source_vector_invalid',
    mutate(database) {
      database.prepare(
        'UPDATE chunks SET vector = ? WHERE id = (SELECT MIN(id) FROM chunks)'
      ).run(vectorBuffer([Number.POSITIVE_INFINITY, 0.25, 0.5, 0.75]));
    }
  });
  negativeReasons.dimension = expectPreflightFailure({
    Database,
    codexRoot,
    runtimeRoot,
    sourceFile: originalSourceCopy,
    name: 'dimension',
    reasonCode: 'source_vector_invalid',
    mutate(database) {
      database.prepare(
        'UPDATE chunks SET vector = ? WHERE id = (SELECT MIN(id) FROM chunks)'
      ).run(vectorBuffer([0.25, 0.5]));
    }
  });
  negativeReasons.cross_scope = expectPreflightFailure({
    Database,
    codexRoot,
    runtimeRoot,
    sourceFile: originalSourceCopy,
    name: 'cross-scope',
    reasonCode: 'source_scope_invalid',
    mutate(database) {
      database.prepare(`
        UPDATE files
        SET path = 'PROJECT_BETA/test-only-cross-scope.md'
        WHERE id = (
          SELECT id FROM files
          WHERE diary_name = 'PROJECT_ALPHA'
          LIMIT 1
        )
      `).run();
    }
  });

  const mutationCaseRoot = path.join(
    runtimeRoot,
    'corruption-between-pass'
  );
  const mutationCopy = copyWriterDatabase({
    Database,
    sourceFile: originalSourceCopy,
    targetRoot: mutationCaseRoot
  });
  mutationCopy.database.close();
  const mutationProjection =
    createProductionSelectedDiarySourceProjection({
      sourceKnowledgeBaseStorePath: mutationCopy.storePath,
      vcpToolBoxRoot: mutationCaseRoot,
      sourceDatabaseConstructor: Database
    });
  const mutationLeaseRoot = path.join(
    workspaceRoot,
    'between-pass-leases'
  );
  fs.mkdirSync(mutationLeaseRoot, {
    recursive: true,
    mode: 0o700
  });
  fs.chmodSync(mutationLeaseRoot, 0o700);
  let mutationProviderCalls = 0;
  const mutationWorker = createGovernedReadLeaseWorker({
    clock: () => new Date('2026-07-30T00:00:00.000Z'),
    sourceProjection: mutationProjection,
    async providerWrapper(input) {
      mutationProviderCalls += 1;
      const providerResult =
        await exactQueryEmbeddingProvider(input);
      const sourceMutation = new Database(mutationCopy.targetFile);
      try {
        sourceMutation.prepare(`
          UPDATE chunks
          SET content =
            content || ' test-only-between-pass-mutation'
          WHERE id = (SELECT MIN(id) FROM chunks)
        `).run();
      } finally {
        sourceMutation.close();
      }
      return providerResult;
    },
    dimension: 4,
    leaseRoot: mutationLeaseRoot,
    vcpCodeRoot: vcpRoot,
    sourceRuntimeRoot: mutationCaseRoot,
    sourceKnowledgeBaseStorePath: mutationCopy.storePath,
    knowledgeBaseRootPath: mutationCopy.memoryRoot,
    workerTimeoutMs: 60_000,
    terminationGraceMs: 5_000
  });
  const mutationResult = await mutationWorker.execute({
    workingSet: bridgeWorkingSet(contracts, 'x'),
    authorization,
    query: 'writer update version two',
    limit: 1
  });
  assert.equal(mutationResult.accepted, false);
  assert.equal(
    mutationResult.working_set.receipts.at(-1).reason_code,
    'source_snapshot_changed_after_preflight'
  );
  const mutationCounters = contracts.aggregateAttemptCounters(
    mutationResult.working_set.receipts
  );
  assert.deepEqual(mutationCounters.derived_transaction, {
    started: 0,
    committed: 0,
    rolled_back: 0
  });
  assert.equal(mutationProviderCalls, 1);
  assert.equal(mutationWorker.snapshot().stores_created, 1);
  assert.equal(mutationWorker.snapshot().stores_removed, 1);
  assert.equal(mutationWorker.snapshot().cleanup_blocked, false);
  negativeReasons.between_pass =
    'source_snapshot_changed_after_preflight';
  assert.equal(sha256File(sourceFile), sourceBeforeRead);

  return {
    schema_version: 1,
    exact_vcp_sha_verified: true,
    writer: {
      initialized_exact_singleton: true,
      pending_files_flush_exercised: true,
      update_exercised: true,
      delete_exercised: true,
      null_vector_omission_exercised: true,
      sparse_chunk_index_observed: true,
      unauthorized_diary_generated: true,
      file_count: writerFileCount,
      chunk_count: writerChunkCount
    },
    projection: {
      preflight_passed: true,
      preflight_process_exercised:
        workerSnapshot.preflight_processes_started === 1 &&
        workerSnapshot.preflight_processes_completed === 1,
      source_snapshot_stable: true,
      primary_source_unchanged_after_negatives: true,
      unauthorized_diary_excluded: true,
      derived_scope_directly_verified:
        derivedScopeDirectlyVerified,
      primary_write_attempts:
        attemptCounters.primary_memory.write_attempts,
      derived_transaction: attemptCounters.derived_transaction
    },
    native_search: {
      provider_invocations: providerInvocationCount,
      invocations: workerSnapshot.native_invocations,
      result_count: searchResult.result.result_count,
      scope_postcheck_passed: true,
      unauthorized_diary_excluded: true,
      derived_scope_directly_verified:
        derivedScopeDirectlyVerified,
      lease_scoped_child_exercised: true,
      child_provider_authority_present: false,
      derived_store_removed: true,
      sigkill_used: false
    },
    negative_reasons: negativeReasons
  };
}

const originalConsole = {
  error: console.error,
  log: console.log,
  warn: console.warn
};
console.error = () => {};
console.log = () => {};
console.warn = () => {};

run().then(result => {
  process.stdout.write(`${JSON.stringify(result)}\n`);
}, error => {
  const safeCode = value =>
    typeof value === 'string' &&
    /^[a-z][a-z0-9_]{0,79}$/u.test(value)
      ? value
      : null;
  originalConsole.error(JSON.stringify({
    error: 'exact_vcp_writer_harness_failed',
    code: safeCode(error?.code) ||
      safeCode(error?.message) ||
      'exact_vcp_writer_child_failed',
    cause_code: safeCode(error?.causeCode),
    reason_code: safeCode(error?.reasonCode)
  }));
  process.exitCode = 1;
});
