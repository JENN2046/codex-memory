'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { EventEmitter } = require('node:events');
const { DatabaseSync } = require('node:sqlite');

const {
  COUNTER_MODES,
  LIMITS,
  InMemoryReplayGuard,
  aggregateAttemptCounters,
  appendGovernedReadAttemptStage,
  createAttemptHeader,
  createGovernedReadAttemptProtocol,
  createPrincipalAssertion,
  createRequestEnvelope,
  createStageReceipt,
  createTerminalEnvelope,
  digestObject,
  validateRequestEnvelope,
  validateResponseEnvelope
} = require('../../packages/chatgpt-r4-contracts');
const {
  createGovernedReadAttemptCoordinator
} = require('../../apps/chatgpt-edge/transient-request-broker');
const {
  createLoopbackEdgeRuntime
} = require('../../apps/chatgpt-edge/loopback-runtime');
const {
  createGovernedReadAttemptObserver
} = require(
  '../../apps/local-recall-relay/governed-read-attempt-observer'
);
const {
  createLoopbackEdgeClient
} = require('../../apps/local-recall-relay/loopback-http-client');
const {
  createLoopbackRelayRuntime
} = require('../../apps/local-recall-relay/loopback-runtime');
const {
  createUdsForwarder
} = require('../../apps/local-recall-relay/uds-transport');
const {
  createRelayProcessor,
  validateInvocationCounterAgreement,
  validateTerminalResponseAgreement
} = require('../../apps/local-recall-relay/relay-processor');
const {
  createGovernedReadAttemptGovernanceRuntime,
  deriveGovernedReadExecutionParameters,
  validateAuthorizationDecision
} = require('../../src/adapters/chatgpt-r4/governed-read-attempt-runtime');
const {
  structuredProjection
} = require(
  '../../src/adapters/chatgpt-r4/governed-read-public-projection'
);
const {
  createGovernedReadAttemptBridge,
  createGovernedReadShimHttpClient
} = require(
  '../../src/core/GovernedMcpVcpNativeReadAttemptBridge'
);
const {
  createGovernanceUdsServer
} = require('../../src/runtime/chatgpt-r4/governance-uds-server');
const {
  createGovernedReadLeaseWorker,
  runLeaseWorkerProcess
} = require('../../src/runtime/vcp-native/governed-read-lease-worker');
const {
  executeGovernedReadLeaseTask
} = require('../../src/runtime/vcp-native/governed-read-lease-task');
const {
  createProductionSelectedDiarySourceProjection
} = require(
  '../../src/runtime/vcp-native/production-selected-diary-hydrator'
);
const {
  createGovernedReadShimHttpRuntime
} = require(
  '../../src/runtime/vcp-native/governed-read-shim-http-runtime'
);

const NOW = new Date('2026-07-30T08:00:00.000Z');
const ISSUER = 'https://issuer.synthetic.example/';
const AUDIENCE = 'https://memory.synthetic.example/mcp';

function signingIdentity(keyId) {
  const pair = crypto.generateKeyPairSync('ed25519');
  return {
    keyId,
    privateKey: pair.privateKey,
    publicKey: pair.publicKey
  };
}

function signing(identity) {
  return {
    keyId: identity.keyId,
    privateKey: identity.privateKey
  };
}

function openReadOnlyDatabase(file) {
  const database = new DatabaseSync(file, { readOnly: true });
  Object.defineProperty(database, 'readonly', {
    enumerable: false,
    value: true
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

function vector(values = [0.75, 0.25]) {
  return Buffer.from(new Float32Array(values).buffer);
}

function sha256File(file) {
  return `sha256:${crypto.createHash('sha256')
    .update(fs.readFileSync(file))
    .digest('hex')}`;
}

function createSqliteFixture(t) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'governed-read-vertical-')
  );
  const sourceRuntimeRoot = path.join(root, 'source-runtime');
  const knowledgeBaseRootPath =
    path.join(sourceRuntimeRoot, 'dailynote');
  const sourceStore = path.join(sourceRuntimeRoot, 'VectorStore');
  const leaseRoot = path.join(root, 'leases');
  const udsRoot = path.join(root, 'uds');
  for (const directory of [
    sourceRuntimeRoot,
    knowledgeBaseRootPath,
    sourceStore,
    leaseRoot,
    udsRoot
  ]) {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    fs.chmodSync(directory, 0o700);
  }
  const sourceFile = path.join(sourceStore, 'knowledge_base.sqlite');
  const source = new DatabaseSync(sourceFile);
  createSchema(source);
  source.prepare(`
    INSERT INTO files
      (id, path, diary_name, checksum, mtime, size, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    1,
    'PROJECT_ALPHA/memory.md',
    'PROJECT_ALPHA',
    'synthetic-checksum',
    1_700_000_000_000,
    32,
    1_700_000_000
  );
  source.prepare(`
    INSERT INTO chunks
      (id, file_id, chunk_index, content, vector)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    1,
    1,
    4,
    'bounded synthetic governed memory',
    vector()
  );
  source.close();
  const sourceProjection =
    createProductionSelectedDiarySourceProjection({
      sourceKnowledgeBaseStorePath: sourceStore,
      vcpToolBoxRoot: sourceRuntimeRoot,
      openSourceDatabase: openReadOnlyDatabase
    });
  t.after(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });
  return {
    root,
    knowledgeBaseRootPath,
    leaseRoot,
    sourceFile,
    sourceProjection,
    sourceRuntimeRoot,
    sourceStore,
    udsRoot
  };
}

function createSyntheticWorkerRunner(sourceProjection, {
  stageHooks,
  bypassIndexSearch = false,
  ghostCandidate = false,
  malformedProjection = false,
  omitChunkId = false
} = {}) {
  return async task => {
    assert.deepEqual(Object.keys(task.authorization).sort(), [
      'accepted',
      'allowedDiaryCount',
      'allowedDiaryNames'
    ]);
    const databaseFile = path.join(
      task.derived_store_path,
      'knowledge_base.sqlite'
    );
    const database = new DatabaseSync(databaseFile);
    createSchema(database);
    let searchCalls = 0;
    const index = {
      async stats() {
        return {
          totalVectors: database.prepare(
            'SELECT COUNT(*) AS count FROM chunks'
          ).get().count
        };
      },
      search() {
        const row = database.prepare(
          'SELECT id FROM chunks ORDER BY id LIMIT 1'
        ).get();
        return row ? [{ id: row.id }] : [];
      },
      remove() {}
    };
    const manager = {
      initialized: true,
      db: database,
      config: {
        dimension: task.projection_plan.dimension,
        fullScanOnStartup: false,
        rootPath: task.knowledge_base_root_path,
        storePath: task.derived_store_path
      },
      watcher: null,
      ragParamsWatcher: null,
      pendingFiles: new Set(),
      pendingDeletes: new Set(),
      isProcessing: false,
      isProcessingDeletes: false,
      rustWriteLease: null,
      diaryIndices: new Map(),
      async _getOrLoadDiaryIndex() {
        return index;
      },
      async search(allowedDiaryNames) {
        searchCalls += 1;
        const candidates = bypassIndexSearch
          ? null
          : await index.search();
        if (ghostCandidate && candidates?.length > 0) {
          index.remove(candidates[0].id);
          return [];
        }
        const candidateId = candidates?.[0]?.id;
        const row = database.prepare(`
          SELECT c.id AS chunkId,
                 f.diary_name AS diaryName,
                 f.path AS fullPath,
                 c.content
          FROM chunks c
          INNER JOIN files f ON f.id = c.file_id
          WHERE f.diary_name = ?
            ${candidateId === undefined ? '' : 'AND c.id = ?'}
          LIMIT 1
        `).get(
          allowedDiaryNames[0],
          ...(candidateId === undefined ? [] : [candidateId])
        );
        return row
          ? [{
              ...(omitChunkId ? {} : { chunkId: row.chunkId }),
              diaryName: row.diaryName,
              fullPath: row.fullPath,
              sourceFile: row.fullPath,
              content: row.content,
              score: 0.75,
              matchedTags: malformedProjection ? {} : []
            }]
          : [];
      }
    };
    let result;
    try {
      result = await executeGovernedReadLeaseTask({
        workingSet: task.working_set,
        projection: sourceProjection,
        projectionPlan: task.projection_plan,
        authorization: task.authorization,
        queryVector: task.query_vector,
        queryLimit: task.query_limit,
        knowledgeBaseManager: manager,
        knowledgeBaseRootPath: task.knowledge_base_root_path,
        knowledgeBaseStorePath: task.derived_store_path,
        stageHooks
      });
      const failedStage =
        result.working_set.receipts.at(-1).stage;
      assert.equal(
        searchCalls,
        result.accepted === true ||
          failedStage === 'SCOPE_POSTCHECK' ||
          (failedStage === 'VECTOR_SEARCH' &&
            (bypassIndexSearch || ghostCandidate || omitChunkId))
          ? 1
          : 0
      );
    } finally {
      database.close();
    }
    return {
      response: {
        kind: 'governed_read_lease_result',
        schema_version: 1,
        result,
        shutdown_complete: true
      },
      shutdown_complete: true,
      sigterm_sent: false
    };
  };
}

function bridgeWorkingSet(suffix) {
  const header = createAttemptHeader({
    attemptRef: `grat_${suffix.repeat(32)}`,
    toolName: 'search_memory',
    requestDigest: digestObject(`request-${suffix}`),
    contextBindingDigest: digestObject(`context-${suffix}`),
    now: NOW
  });
  const receipts = [];
  for (const stage of [
    'CREATED',
    'EDGE_VALIDATED',
    'RELAY_CLAIMED',
    'AUTHORIZED',
    'BRIDGE_DELEGATED'
  ]) {
    receipts.push(createStageReceipt({
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

function leaseTaskWorkingSet(suffix) {
  let workingSet = bridgeWorkingSet(suffix);
  workingSet = appendGovernedReadAttemptStage(workingSet, {
    stage: 'NATIVE_DISPATCHED',
    counterFacts: {
      native_invocation: { started: 1 },
      primary_memory: {
        write_attempts: 0,
        writes_committed: 0
      }
    }
  });
  workingSet = appendGovernedReadAttemptStage(workingSet, {
    stage: 'SOURCE_PREFLIGHT'
  });
  return appendGovernedReadAttemptStage(workingSet, {
    stage: 'PROVIDER_EMBEDDING',
    counterFacts: {
      provider: {
        started: 1,
        succeeded: 1,
        failed: 0
      }
    }
  });
}

test('attempt deadline outranks legacy Bridge and UDS transport timeouts', async t => {
  const workingSet = bridgeWorkingSet('d');
  const nearDeadline = new Date(
    Date.parse(workingSet.header.deadline_at) - 100
  );
  const udsRoot = fs.mkdtempSync(path.join(
    os.tmpdir(),
    'codex-memory-governed-deadline-'
  ));
  fs.chmodSync(udsRoot, 0o700);
  const socketPath = path.join(udsRoot, 'governance.sock');
  const udsServer = createGovernanceUdsServer({
    socketPath,
    socketIdleTimeoutMs: 10,
    clock: () => nearDeadline,
    governanceRuntime: {
      async handle() {
        await new Promise(resolve => setTimeout(resolve, 30));
        return { accepted: true };
      }
    }
  });
  await udsServer.start();
  t.after(async () => {
    await udsServer.stop();
    fs.rmSync(udsRoot, { recursive: true, force: true });
  });
  const forward = createUdsForwarder({
    socketPath,
    timeoutMs: 10,
    clock: () => nearDeadline
  });
  assert.deepEqual(await forward({
    governedReadAttempt: workingSet,
    relayReceipt: { safe: true },
    request: { safe: true }
  }), { accepted: true });
  assert.equal(udsServer.snapshot().accepted_frames, 1);

  let httpRequests = 0;
  const shimServer = http.createServer((incoming, outgoing) => {
    httpRequests += 1;
    incoming.resume();
    incoming.once('end', () => {
      setTimeout(() => {
        outgoing.writeHead(200, {
          'content-type': 'application/json'
        });
        outgoing.end(JSON.stringify({ accepted: true }));
      }, 30);
    });
  });
  await new Promise((resolve, rejectListen) => {
    shimServer.once('error', rejectListen);
    shimServer.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise(resolve =>
    shimServer.close(() => resolve())
  ));
  const shimAddress = shimServer.address();
  const invokeShim = createGovernedReadShimHttpClient({
    endpoint:
      `http://127.0.0.1:${shimAddress.port}/v1/governed-read-attempt`,
    runtimeBindingDigest: digestObject('deadline-runtime-binding'),
    timeoutMs: 10,
    clock: () => nearDeadline
  });
  assert.deepEqual(await invokeShim({
    workingSet,
    authorization: { accepted: true },
    query: 'bounded deadline query',
    limit: 1
  }), { accepted: true });
  assert.equal(httpRequests, 1);

  const expired = new Date(
    Date.parse(workingSet.header.deadline_at)
  );
  const expiredForward = createUdsForwarder({
    socketPath,
    timeoutMs: 10,
    clock: () => expired
  });
  await assert.rejects(
    expiredForward({
      governedReadAttempt: workingSet,
      relayReceipt: { safe: true },
      request: { safe: true }
    }),
    { code: 'relay_request_expired_before_response' }
  );
  const expiredShim = createGovernedReadShimHttpClient({
    endpoint:
      `http://127.0.0.1:${shimAddress.port}/v1/governed-read-attempt`,
    runtimeBindingDigest: digestObject('deadline-runtime-binding'),
    timeoutMs: 10,
    clock: () => expired
  });
  await assert.rejects(
    expiredShim({
      workingSet,
      authorization: { accepted: true },
      query: 'expired deadline query',
      limit: 1
    }),
    { code: 'governed_read_bridge_attempt_expired' }
  );
  assert.equal(httpRequests, 1);
  assert.equal(udsServer.snapshot().connections, 1);
});

test('Governance UDS deadline aborts an in-progress frame exactly once', async t => {
  const workingSet = bridgeWorkingSet('u');
  const nearDeadline = new Date(
    Date.parse(workingSet.header.deadline_at) - 30
  );
  const udsRoot = fs.mkdtempSync(path.join(
    os.tmpdir(),
    'codex-memory-governed-processing-deadline-'
  ));
  fs.chmodSync(udsRoot, 0o700);
  const socketPath = path.join(udsRoot, 'governance.sock');
  let observedSignal = null;
  let handleSettled = false;
  const udsServer = createGovernanceUdsServer({
    socketPath,
    socketIdleTimeoutMs: 1_000,
    attemptDeadlineMarginMs: 0,
    clock: () => nearDeadline,
    governanceRuntime: {
      async handle(_payload, { signal }) {
        observedSignal = signal;
        await new Promise(resolve => {
          signal.addEventListener('abort', resolve, { once: true });
        });
        handleSettled = true;
        return { late_result: true };
      }
    }
  });
  await udsServer.start();
  t.after(async () => {
    await udsServer.stop();
    fs.rmSync(udsRoot, { recursive: true, force: true });
  });
  const forward = createUdsForwarder({
    socketPath,
    timeoutMs: 1_000,
    clock: () => nearDeadline
  });
  await assert.rejects(
    forward({
      governedReadAttempt: workingSet,
      relayReceipt: { safe: true },
      request: { safe: true }
    }),
    error => [
      'relay_uds_response_incomplete',
      'relay_uds_unavailable'
    ].includes(error?.code)
  );
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(observedSignal?.aborted, true);
  assert.equal(handleSettled, true);
  assert.equal(udsServer.snapshot().accepted_frames, 0);
  assert.equal(udsServer.snapshot().rejected_frames, 1);
});

test('Bridge cancellation reaches the Shim lease worker', async t => {
  let workerSignal = null;
  let markWorkerStarted;
  const workerStarted = new Promise(resolve => {
    markWorkerStarted = resolve;
  });
  let markWorkerAborted;
  const workerAborted = new Promise(resolve => {
    markWorkerAborted = resolve;
  });
  const runtimeBindingDigest = digestObject(
    'synthetic-cancel-runtime-binding'
  );
  const shim = createGovernedReadShimHttpRuntime({
    runtimeBindingDigest,
    leaseWorker: {
      async execute({ signal }) {
        workerSignal = signal;
        markWorkerStarted();
        await new Promise((resolve, rejectExecution) => {
          signal.addEventListener('abort', () => {
            markWorkerAborted();
            rejectExecution(new Error('synthetic_worker_cancelled'));
          }, { once: true });
        });
      },
      snapshot() {
        return { active_attempts: workerSignal?.aborted ? 0 : 1 };
      }
    }
  });
  const address = await shim.start();
  t.after(() => shim.stop());
  const invokeShim = createGovernedReadShimHttpClient({
    endpoint: address.endpoint,
    runtimeBindingDigest,
    clock: () => NOW
  });
  const cancellation = new AbortController();
  const pending = invokeShim({
    workingSet: bridgeWorkingSet('c'),
    authorization: {
      accepted: true,
      allowedDiaryNames: ['PROJECT_ALPHA'],
      allowedDiaryCount: 1
    },
    query: 'synthetic cancellation query',
    limit: 1,
    signal: cancellation.signal
  });
  await workerStarted;
  cancellation.abort();
  await assert.rejects(
    pending,
    { code: 'governed_read_bridge_cancelled' }
  );
  let abortWaitTimer;
  try {
    await Promise.race([
      workerAborted,
      new Promise((_, rejectWait) => {
        abortWaitTimer = setTimeout(
          () => rejectWait(new Error('synthetic_worker_abort_missing')),
          1_000
        );
      })
    ]);
  } finally {
    clearTimeout(abortWaitTimer);
  }
  for (let index = 0;
    index < 10 && shim.snapshot().rejected_requests === 0;
    index += 1) {
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.equal(workerSignal?.aborted, true);
  assert.equal(shim.snapshot().accepted_requests, 0);
  assert.equal(shim.snapshot().rejected_requests, 1);
});

function successfulWorkerExecution(task, {
  shutdownComplete = true
} = {}) {
  let workingSet = task.working_set;
  workingSet = appendGovernedReadAttemptStage(workingSet, {
    stage: 'HYDRATION',
    counterFacts: {
      derived_transaction: {
        started: 1,
        committed: 1,
        rolled_back: 0
      }
    }
  });
  workingSet = appendGovernedReadAttemptStage(workingSet, {
    stage: 'INDEX_RECOVERY'
  });
  workingSet = appendGovernedReadAttemptStage(workingSet, {
    stage: 'VECTOR_SEARCH',
    counterFacts: {
      native_invocation: {
        succeeded: 1,
        failed: 0
      }
    }
  });
  workingSet = appendGovernedReadAttemptStage(workingSet, {
    stage: 'SCOPE_POSTCHECK'
  });
  return {
    response: {
      kind: 'governed_read_lease_result',
      schema_version: 1,
      result: {
        accepted: true,
        working_set: workingSet,
        evidence_complete: true,
        result: {
          results: [],
          result_count: 0,
          raw_memory_content_disclosed: false,
          raw_vector_disclosed: false,
          source_path_disclosed: false,
          provider_response_disclosed: false
        }
      },
      shutdown_complete: shutdownComplete
    },
    shutdown_complete: shutdownComplete,
    sigterm_sent: false
  };
}

function liveCounters(workingSet) {
  const counters = aggregateAttemptCounters(workingSet.receipts);
  return {
    provider_calls: counters.provider.started,
    native_invocations: counters.native_invocation.started,
    local_fallbacks: counters.fallback.attempts,
    primary_memory_writes:
      counters.primary_memory.write_attempts,
    derived_index_writes:
      counters.derived_transaction.started,
    other_durable_mutations: 0,
    unrestricted_native_searches: 0
  };
}

function successfulGovernanceBridgeResult(
  workingSet,
  result
) {
  let current = appendGovernedReadAttemptStage(workingSet, {
    stage: 'BRIDGE_DELEGATED',
    counterFacts: {
      fallback: { attempts: 0 }
    }
  });
  current = appendGovernedReadAttemptStage(current, {
    stage: 'NATIVE_DISPATCHED',
    counterFacts: {
      native_invocation: { started: 1 },
      primary_memory: {
        write_attempts: 0,
        writes_committed: 0
      }
    }
  });
  current = appendGovernedReadAttemptStage(current, {
    stage: 'SOURCE_PREFLIGHT'
  });
  current = appendGovernedReadAttemptStage(current, {
    stage: 'PROVIDER_EMBEDDING',
    counterFacts: {
      provider: {
        started: 1,
        succeeded: 1,
        failed: 0
      }
    }
  });
  current = appendGovernedReadAttemptStage(current, {
    stage: 'HYDRATION',
    counterFacts: {
      derived_transaction: {
        started: 1,
        committed: 1,
        rolled_back: 0
      }
    }
  });
  current = appendGovernedReadAttemptStage(current, {
    stage: 'INDEX_RECOVERY'
  });
  current = appendGovernedReadAttemptStage(current, {
    stage: 'VECTOR_SEARCH',
    counterFacts: {
      native_invocation: {
        succeeded: 1,
        failed: 0
      }
    }
  });
  current = appendGovernedReadAttemptStage(current, {
    stage: 'SCOPE_POSTCHECK'
  });
  return {
    accepted: true,
    working_set: current,
    evidence_complete: true,
    result,
    terminal_failure: null,
    cleanup_complete: true
  };
}

function unavailableInvocation(attemptRef) {
  return {
    status: 'denied',
    structured_content: {
      status: 'denied',
      result_count: 0,
      results: []
    },
    counters: {
      provider_calls: 0,
      native_invocations: 0,
      local_fallbacks: 0,
      primary_memory_writes: 0,
      derived_index_writes: 0,
      other_durable_mutations: 0,
      unrestricted_native_searches: 0
    },
    receipt_digests: {
      governance: digestObject({ attemptRef, status: 'denied' }),
      context: digestObject('synthetic-context-denied')
    }
  };
}

test('full real transport replay commits one canonical terminal and cleans its lease', async t => {
  const fixture = createSqliteFixture(t);
  const sourceBefore = sha256File(fixture.sourceFile);
  const providerCalls = [];
  const worker = createGovernedReadLeaseWorker({
    clock: () => NOW,
    sourceProjection: fixture.sourceProjection,
    async providerWrapper({ query }) {
      providerCalls.push(query);
      return [0.75, 0.25];
    },
    dimension: 2,
    leaseRoot: fixture.leaseRoot,
    vcpCodeRoot: fixture.root,
    sourceRuntimeRoot: fixture.sourceRuntimeRoot,
    sourceKnowledgeBaseStorePath: fixture.sourceStore,
    knowledgeBaseRootPath: fixture.knowledgeBaseRootPath,
    workerRunner:
      createSyntheticWorkerRunner(fixture.sourceProjection)
  });

  const runtimeBindingDigest = digestObject(
    'synthetic-governed-read-runtime-binding'
  );
  const shim = createGovernedReadShimHttpRuntime({
    leaseWorker: worker,
    runtimeBindingDigest
  });
  const shimAddress = await shim.start();
  t.after(() => shim.stop());
  const bridge = createGovernedReadAttemptBridge({
    invokeShim: createGovernedReadShimHttpClient({
      endpoint: shimAddress.endpoint,
      runtimeBindingDigest,
      clock: () => NOW
    })
  });

  const governance = createGovernedReadAttemptGovernanceRuntime({
    async authorizeRead({ request }) {
      assert.equal(request.tool_request.name, 'search_memory');
      await new Promise(resolve => setTimeout(resolve, 30));
      return {
        accepted: true,
        authorization: {
          accepted: true,
          allowedDiaryNames: ['PROJECT_ALPHA'],
          allowedDiaryCount: 1,
          mappingReference: 'synthetic-mapping-reference',
          mappingDigest: digestObject('synthetic-mapping')
        },
        query: request.tool_request.arguments.query,
        limit: request.tool_request.arguments.limit
      };
    },
    invokeBridge: input => bridge.invoke(input),
    async projectInvocation({ request, bridgeResult }) {
      const failed = bridgeResult.accepted !== true ||
        bridgeResult.terminal_failure !== null;
      return {
        status: failed ? 'unavailable' : 'ok',
        structured_content: failed
          ? {
              status: 'unavailable',
              result_count: 0,
              results: []
            }
          : structuredProjection(
              request.tool_request.name,
              bridgeResult.result,
              request.tool_request.arguments.project_context_ref
            ),
        counters: liveCounters(bridgeResult.working_set),
        receipt_digests: {
          governance: digestObject({
            attemptRef:
              bridgeResult.working_set.header.attempt_ref,
            status: failed ? 'unavailable' : 'ok'
          }),
          context: digestObject(
            request.tool_request.arguments.project_context_ref
          )
        }
      };
    }
  });

  const socketPath = path.join(fixture.udsRoot, 'governance.sock');
  const uds = createGovernanceUdsServer({
    socketPath,
    governanceRuntime: governance,
    clock: () => NOW
  });
  await uds.start();
  t.after(() => uds.stop());

  const principal = signingIdentity('principal-key');
  const edgeIdentity = signingIdentity('edge-key');
  const relayIdentity = signingIdentity('relay-key');
  const principalAssertion = createPrincipalAssertion({
    issuer: ISSUER,
    audience: AUDIENCE,
    subjectFingerprint: digestObject('synthetic-principal'),
    now: NOW,
    nonce: 'principal_nonce_vertical_0001',
    signing: signing(principal)
  });
  const contextRef = `pctx_${'v'.repeat(32)}`;
  const request = createRequestEnvelope({
    principalAssertion,
    toolName: 'search_memory',
    toolArguments: {
      project_context_ref: contextRef,
      query: 'synthetic governed query',
      limit: 1
    },
    now: NOW,
    requestId: 'req_vertical_runtime_0000000001',
    nonce: 'request_nonce_vertical_00001',
    signing: signing(edgeIdentity)
  });
  const header = createAttemptHeader({
    attemptRef: `grat_${'v'.repeat(32)}`,
    toolName: 'search_memory',
    requestDigest: digestObject(request),
    contextBindingDigest: digestObject(contextRef),
    now: NOW,
    ttlSeconds: 30
  });
  const observer = createGovernedReadAttemptObserver({
    clock: () => NOW
  });
  const coordinator = createGovernedReadAttemptCoordinator({
    clock: () => NOW,
    eventSink: event => observer.observe(event)
  });
  const edge = createLoopbackEdgeRuntime({
    clock: () => NOW,
    governedReadAttempts: true,
    attemptCoordinator: coordinator,
    async verifyRequest(value) {
      validateRequestEnvelope(value, {
        now: NOW,
        resolveRequestPublicKey: keyId =>
          keyId === edgeIdentity.keyId
            ? edgeIdentity.publicKey
            : null,
        resolvePrincipalPublicKey: value =>
          value?.issuer === ISSUER &&
          value?.key_id === principal.keyId
            ? principal.publicKey
            : null,
        expectedIssuer: ISSUER,
        expectedAudience: AUDIENCE,
        consumeReplay: false
      });
    },
    async verifyResponse(value, expectedRequest) {
      validateResponseEnvelope(value, {
        now: NOW,
        resolveResponsePublicKey: keyId =>
          keyId === relayIdentity.keyId
            ? relayIdentity.publicKey
            : null,
        expectedRequest,
        counterMode: COUNTER_MODES.governedLiveReadV1
      });
    }
  });
  const edgeAddress = await edge.start();
  t.after(() => edge.stop());
  const edgeClient = createLoopbackEdgeClient(edgeAddress.url, {
    timeoutMs: 5_000
  });
  const relay = createLoopbackRelayRuntime({
    edgeUrl: edgeAddress.url,
    socketPath,
    relayId: 'vertical-runtime-relay',
    expectedIssuer: ISSUER,
    expectedAudience: AUDIENCE,
    resolveRequestPublicKey: keyId =>
      keyId === edgeIdentity.keyId
        ? edgeIdentity.publicKey
        : null,
    resolvePrincipalPublicKey: value =>
      value?.issuer === ISSUER &&
      value?.key_id === principal.keyId
        ? principal.publicKey
        : null,
    requestReplayGuard: new InMemoryReplayGuard({
      clock: () => NOW
    }),
    responseSigning: signing(relayIdentity),
    counterMode: COUNTER_MODES.governedLiveReadV1,
    clock: () => NOW,
    cancelPollMs: 1,
    udsTimeoutMs: 10
  });

  await edgeClient.submit(request, { attemptHeader: header });
  const completed = await relay.processNext();
  assert.equal(completed.status, 'completed');
  assert.equal(completed.response.structured_content.status, 'found');
  const edgeResult = await edgeClient.result(request.request_id);
  assert.equal(edgeResult.status, 'completed');
  assert.doesNotThrow(() => validateResponseEnvelope(
    edgeResult.response,
    {
      now: NOW,
      resolveResponsePublicKey: keyId =>
        keyId === relayIdentity.keyId
          ? relayIdentity.publicKey
          : null,
      expectedRequest: request,
      counterMode: COUNTER_MODES.governedLiveReadV1
    }
  ));

  const protocol = coordinator.protocol(header.attempt_ref);
  assert.equal(protocol.terminal.outcome, 'success');
  assert.equal(
    protocol.receipts.at(-1).stage,
    'RESPONSE_FINALIZATION'
  );
  assert.deepEqual(protocol.terminal.counters.provider, {
    started: 1,
    succeeded: 1,
    failed: 0
  });
  assert.deepEqual(protocol.terminal.counters.native_invocation, {
    started: 1,
    succeeded: 1,
    failed: 0
  });
  assert.equal(protocol.terminal.counters.fallback.attempts, 0);
  assert.equal(
    protocol.terminal.counters.primary_memory.write_attempts,
    0
  );
  assert.equal(providerCalls.length, 1);
  assert.deepEqual(worker.snapshot(), {
    component: 'governed_read_lease_worker',
    active_attempts: 0,
    max_active_attempts: 1,
    cleanup_blocked: false,
    attempts_started: 1,
    attempts_completed: 1,
    provider_invocations: 1,
    provider_calls_in_flight: 0,
    native_invocations: 1,
    stores_created: 1,
    stores_removed: 1,
    sigterm_count: 0,
    sigkill_count: 0,
    unknown_processes_signalled: 0,
    provider_authority_in_child: false,
    raw_vectors_retained: false,
    raw_memory_retained: false,
    source_paths_retained_in_projection: false
  });
  assert.equal(
    sha256File(fixture.sourceFile),
    sourceBefore
  );
  assert.equal(observer.snapshot().protocol_violations, 0);
  assert.equal(observer.snapshot().terminal_successes, 1);
  assert.equal(shim.snapshot().request_bodies_logged, 0);
  assert.equal(uds.snapshot().request_bodies_logged, 0);
});

test('Edge acknowledged attempt claim lasts until the attempt deadline', async t => {
  let current = new Date(NOW);
  const principal = signingIdentity('claim-deadline-principal');
  const edgeIdentity = signingIdentity('claim-deadline-edge');
  const contextRef = `pctx_${'k'.repeat(32)}`;
  const principalAssertion = createPrincipalAssertion({
    issuer: ISSUER,
    audience: AUDIENCE,
    subjectFingerprint: digestObject('claim-deadline-principal'),
    now: NOW,
    nonce: 'principal_nonce_claim_deadline_01',
    signing: signing(principal)
  });
  const request = createRequestEnvelope({
    principalAssertion,
    toolName: 'search_memory',
    toolArguments: {
      project_context_ref: contextRef,
      query: 'claim deadline query',
      limit: 1
    },
    now: NOW,
    ttlSeconds: 2,
    requestId: 'req_claim_deadline_000000000001',
    nonce: 'request_nonce_claim_deadline_01',
    signing: signing(edgeIdentity)
  });
  const header = createAttemptHeader({
    attemptRef: `grat_${'k'.repeat(32)}`,
    toolName: 'search_memory',
    requestDigest: digestObject(request),
    contextBindingDigest: digestObject(contextRef),
    now: NOW,
    ttlSeconds: 1
  });
  const coordinator = createGovernedReadAttemptCoordinator({
    clock: () => current
  });
  const runtime = createLoopbackEdgeRuntime({
    async verifyRequest() {},
    async verifyResponse() {},
    clock: () => current,
    claimLeaseMs: 50,
    governedReadAttempts: true,
    attemptCoordinator: coordinator
  });
  const address = await runtime.start();
  t.after(() => runtime.stop());
  const client = createLoopbackEdgeClient(address.url, {
    timeoutMs: 1_000
  });

  const shortRequest = createRequestEnvelope({
    principalAssertion,
    toolName: 'search_memory',
    toolArguments: {
      project_context_ref: contextRef,
      query: 'short request authority',
      limit: 1
    },
    now: NOW,
    ttlSeconds: 1,
    requestId: 'req_short_claim_authority_000001',
    nonce: 'request_nonce_short_authority_01',
    signing: signing(edgeIdentity)
  });
  const longHeader = createAttemptHeader({
    attemptRef: `grat_${'j'.repeat(32)}`,
    toolName: 'search_memory',
    requestDigest: digestObject(shortRequest),
    contextBindingDigest: digestObject(contextRef),
    now: NOW,
    ttlSeconds: 2
  });
  await assert.rejects(
    client.submit(shortRequest, { attemptHeader: longHeader }),
    { code: 'edge_attempt_header_binding_invalid' }
  );

  await client.submit(request, { attemptHeader: header });
  const claim = await client.claim('deadline-relay');
  assert.equal(
    claim.lease_expires_at,
    new Date(NOW.getTime() + 50).toISOString()
  );
  await client.acknowledge(claim);
  current = new Date(NOW.getTime() + 100);
  assert.equal((await client.state(claim)).status, 'claimed');
  current = new Date(NOW.getTime() + 999);
  assert.equal((await client.state(claim)).status, 'claimed');
  current = new Date(NOW.getTime() + 1_000);
  assert.equal((await client.state(claim)).status, 'expired');
  assert.equal(
    coordinator.protocol(header.attempt_ref).terminal.reason_code,
    'attempt_timeout'
  );
});

test('Edge validates every injected attempt coordinator lifecycle method', () => {
  const required = [
    'acceptAttempt',
    'appendReceipt',
    'cancelAttempt',
    'commitProtocolCandidate',
    'reportCoordinatorLoss',
    'timeoutAttempt',
    'workingSet'
  ];
  const completeCoordinator = Object.fromEntries(
    required.map(method => [method, () => {}])
  );
  assert.doesNotThrow(() => createLoopbackEdgeRuntime({
    async verifyRequest() {},
    async verifyResponse() {},
    governedReadAttempts: true,
    attemptCoordinator: completeCoordinator
  }));
  for (const missing of required) {
    const incomplete = { ...completeCoordinator };
    delete incomplete[missing];
    assert.throws(
      () => createLoopbackEdgeRuntime({
        async verifyRequest() {},
        async verifyResponse() {},
        governedReadAttempts: true,
        attemptCoordinator: incomplete
      }),
      { code: 'edge_attempt_coordinator_invalid' },
      missing
    );
  }
});

test('Edge stop clears claimed governed records before the runtime restarts', async t => {
  const principal = signingIdentity('stop-restart-principal');
  const edgeIdentity = signingIdentity('stop-restart-edge');
  const contextRef = `pctx_${'s'.repeat(32)}`;
  const principalAssertion = createPrincipalAssertion({
    issuer: ISSUER,
    audience: AUDIENCE,
    subjectFingerprint: digestObject('stop-restart-principal'),
    now: NOW,
    nonce: 'principal_nonce_stop_restart_01',
    signing: signing(principal)
  });
  function requestAndHeader({
    attemptMarker,
    nonce,
    requestId
  }) {
    const request = createRequestEnvelope({
      principalAssertion,
      toolName: 'search_memory',
      toolArguments: {
        project_context_ref: contextRef,
        query: 'stop restart isolation',
        limit: 1
      },
      now: NOW,
      requestId,
      nonce,
      signing: signing(edgeIdentity)
    });
    const header = createAttemptHeader({
      attemptRef: `grat_${attemptMarker.repeat(32)}`,
      toolName: 'search_memory',
      requestDigest: digestObject(request),
      contextBindingDigest: digestObject(contextRef),
      now: NOW
    });
    return { header, request };
  }
  const first = requestAndHeader({
    attemptMarker: 'x',
    requestId: 'req_stop_restart_first_00000001',
    nonce: 'request_nonce_stop_restart_first_01'
  });
  const second = requestAndHeader({
    attemptMarker: 'y',
    requestId: 'req_stop_restart_second_0000001',
    nonce: 'request_nonce_stop_restart_second_01'
  });
  const coordinator = createGovernedReadAttemptCoordinator({
    clock: () => NOW
  });
  const runtime = createLoopbackEdgeRuntime({
    async verifyRequest() {},
    async verifyResponse() {},
    clock: () => NOW,
    maxInFlight: 1,
    maxRecords: 2,
    governedReadAttempts: true,
    attemptCoordinator: coordinator
  });
  t.after(() => runtime.stop());

  const firstAddress = await runtime.start();
  const firstClient = createLoopbackEdgeClient(firstAddress.url, {
    timeoutMs: 1_000
  });
  await firstClient.submit(first.request, {
    attemptHeader: first.header
  });
  const firstClaim = await firstClient.claim('stop-restart-relay');
  await firstClient.acknowledge(firstClaim);
  assert.equal(runtime.snapshot().states.claimed, 1);

  await runtime.stop();
  assert.deepEqual(runtime.snapshot(), {
    in_memory_only: true,
    request_count: 0,
    states: {
      queued: 0,
      claimed: 0,
      completed: 0,
      cancelled: 0,
      expired: 0
    },
    governed_read_attempts_enabled: true
  });
  assert.throws(
    () => coordinator.snapshot(first.header.attempt_ref),
    { code: 'attempt_not_found' }
  );

  const secondAddress = await runtime.start();
  const secondClient = createLoopbackEdgeClient(secondAddress.url, {
    timeoutMs: 1_000
  });
  assert.equal(
    await secondClient.claim('stop-restart-relay'),
    null
  );
  await assert.rejects(
    secondClient.result(first.request.request_id),
    { code: 'edge_request_not_found' }
  );
  await secondClient.submit(second.request, {
    attemptHeader: second.header
  });
  const secondClaim = await secondClient.claim('stop-restart-relay');
  assert.equal(secondClaim.request_id, second.request.request_id);
});

test('Edge reuses governed coordinator capacity at the request retention cadence', async t => {
  let current = new Date(NOW);
  const principal = signingIdentity('retention-capacity-principal');
  const edgeIdentity = signingIdentity('retention-capacity-edge');
  const contextRef = `pctx_${'t'.repeat(32)}`;
  const principalAssertion = createPrincipalAssertion({
    issuer: ISSUER,
    audience: AUDIENCE,
    subjectFingerprint: digestObject('retention-capacity-principal'),
    now: NOW,
    nonce: 'principal_nonce_retention_capacity_01',
    signing: signing(principal)
  });
  const runtime = createLoopbackEdgeRuntime({
    async verifyRequest() {},
    async verifyResponse() {},
    clock: () => current,
    maxInFlight: 1,
    maxRecords: 2,
    terminalRetentionMs: 10,
    governedReadAttempts: true
  });
  const address = await runtime.start();
  t.after(() => runtime.stop());
  const client = createLoopbackEdgeClient(address.url, {
    timeoutMs: 1_000
  });

  for (const [index, marker] of ['a', 'b', 'c', 'd'].entries()) {
    const request = createRequestEnvelope({
      principalAssertion,
      toolName: 'search_memory',
      toolArguments: {
        project_context_ref: contextRef,
        query: 'retention capacity reuse',
        limit: 1
      },
      now: current,
      requestId: `req_retention_capacity_${index}_00000001`,
      nonce: `request_nonce_retention_capacity_${index}_01`,
      signing: signing(edgeIdentity)
    });
    const header = createAttemptHeader({
      attemptRef: `grat_${marker.repeat(32)}`,
      toolName: 'search_memory',
      requestDigest: digestObject(request),
      contextBindingDigest: digestObject(contextRef),
      now: current
    });
    await client.submit(request, { attemptHeader: header });
    await client.cancel(request.request_id);
    current = new Date(current.getTime() + 10);
  }

  const replayRequest = createRequestEnvelope({
    principalAssertion,
    toolName: 'search_memory',
    toolArguments: {
      project_context_ref: contextRef,
      query: 'retention identity replay',
      limit: 1
    },
    now: current,
    requestId: 'req_retention_capacity_replay_00001',
    nonce: 'request_nonce_retention_replay_01',
    signing: signing(edgeIdentity)
  });
  const replayHeader = createAttemptHeader({
    attemptRef: `grat_${'a'.repeat(32)}`,
    toolName: 'search_memory',
    requestDigest: digestObject(replayRequest),
    contextBindingDigest: digestObject(contextRef),
    now: current
  });
  await assert.rejects(
    client.submit(replayRequest, { attemptHeader: replayHeader }),
    { code: 'replay_detected' }
  );

  assert.deepEqual(runtime.snapshot().states, {
    queued: 0,
    claimed: 0,
    completed: 0,
    cancelled: 0,
    expired: 0
  });
  assert.equal(runtime.snapshot().request_count, 0);
});

test('Edge preserves replay identities when coordinator admission rejects', async t => {
  let current = new Date(NOW);
  const principal = signingIdentity('admission-retry-principal');
  const edgeIdentity = signingIdentity('admission-retry-edge');
  const contextRef = `pctx_${'u'.repeat(32)}`;
  const principalAssertion = createPrincipalAssertion({
    issuer: ISSUER,
    audience: AUDIENCE,
    subjectFingerprint: digestObject('admission-retry-principal'),
    now: NOW,
    nonce: 'principal_nonce_admission_retry_01',
    signing: signing(principal)
  });
  const runtime = createLoopbackEdgeRuntime({
    async verifyRequest() {},
    async verifyResponse() {},
    clock: () => current,
    maxInFlight: 1,
    maxRecords: 1,
    terminalRetentionMs: 10,
    governedReadAttempts: true
  });
  const address = await runtime.start();
  t.after(() => runtime.stop());
  const client = createLoopbackEdgeClient(address.url, {
    timeoutMs: 1_000
  });

  const firstRequest = createRequestEnvelope({
    principalAssertion,
    toolName: 'search_memory',
    toolArguments: {
      project_context_ref: contextRef,
      query: 'coordinator retention seed',
      limit: 1
    },
    now: current,
    requestId: 'req_admission_retry_seed_000001',
    nonce: 'request_nonce_admission_retry_seed_01',
    signing: signing(edgeIdentity)
  });
  const firstHeader = createAttemptHeader({
    attemptRef: `grat_${'p'.repeat(32)}`,
    toolName: 'search_memory',
    requestDigest: digestObject(firstRequest),
    contextBindingDigest: digestObject(contextRef),
    now: current
  });
  await client.submit(firstRequest, {
    attemptHeader: firstHeader
  });

  current = new Date(Date.parse(firstHeader.deadline_at) + 10);
  const retryPrincipalAssertion = createPrincipalAssertion({
    issuer: ISSUER,
    audience: AUDIENCE,
    subjectFingerprint: digestObject('admission-retry-principal'),
    now: current,
    nonce: 'principal_nonce_admission_retry_02',
    signing: signing(principal)
  });
  const retryRequest = createRequestEnvelope({
    principalAssertion: retryPrincipalAssertion,
    toolName: 'search_memory',
    toolArguments: {
      project_context_ref: contextRef,
      query: 'retry after coordinator retention',
      limit: 1
    },
    now: current,
    requestId: 'req_admission_retry_candidate_0001',
    nonce: 'request_nonce_admission_retry_candidate_01',
    signing: signing(edgeIdentity)
  });
  const retryHeader = createAttemptHeader({
    attemptRef: `grat_${'q'.repeat(32)}`,
    toolName: 'search_memory',
    requestDigest: digestObject(retryRequest),
    contextBindingDigest: digestObject(contextRef),
    now: current
  });
  await assert.rejects(
    client.submit(retryRequest, {
      attemptHeader: retryHeader
    }),
    {
      code:
        'attempt_coordinator_retention_capacity_exceeded'
    }
  );
  assert.equal(runtime.snapshot().request_count, 0);

  current = new Date(current.getTime() + 10);
  assert.deepEqual(
    await client.submit(retryRequest, {
      attemptHeader: retryHeader
    }),
    {
      request_id: retryRequest.request_id,
      status: 'queued'
    }
  );
  await client.cancel(retryRequest.request_id);
});

test('Edge closes partial coordinator admission and releases replay identities', async () => {
  const cases = [
    {
      name: 'working_set',
      originalMarker: 'h',
      retryMarker: 'i',
      expectedCode: 'synthetic_working_set_failed',
      terminalReason: 'attempt_cancelled'
    },
    {
      name: 'append_receipt',
      originalMarker: 'j',
      retryMarker: 'k',
      expectedCode: 'synthetic_append_receipt_failed',
      terminalReason: 'attempt_cancelled'
    },
    {
      name: 'deadline',
      originalMarker: 'l',
      retryMarker: 'm',
      expectedCode: 'attempt_receipt_after_deadline',
      terminalReason: 'attempt_timeout'
    }
  ];

  for (const [index, fault] of cases.entries()) {
    let current = new Date(NOW);
    const principal = signingIdentity(
      `partial-admission-principal-${fault.name}`
    );
    const edgeIdentity = signingIdentity(
      `partial-admission-edge-${fault.name}`
    );
    const contextRef = `pctx_${fault.originalMarker.repeat(32)}`;
    const principalAssertion = createPrincipalAssertion({
      issuer: ISSUER,
      audience: AUDIENCE,
      subjectFingerprint: digestObject(
        `partial-admission-principal-${fault.name}`
      ),
      now: NOW,
      nonce: `principal_nonce_partial_admission_${index}_01`,
      signing: signing(principal)
    });
    const request = createRequestEnvelope({
      principalAssertion,
      toolName: 'search_memory',
      toolArguments: {
        project_context_ref: contextRef,
        query: `partial admission ${fault.name}`,
        limit: 1
      },
      now: NOW,
      ttlSeconds: 60,
      requestId: `req_partial_admission_${index}_00000001`,
      nonce: `request_nonce_partial_admission_${index}_01`,
      signing: signing(edgeIdentity)
    });
    const originalHeader = createAttemptHeader({
      attemptRef: `grat_${fault.originalMarker.repeat(32)}`,
      toolName: 'search_memory',
      requestDigest: digestObject(request),
      contextBindingDigest: digestObject(contextRef),
      now: NOW,
      ttlSeconds: 30
    });
    const coordinator = createGovernedReadAttemptCoordinator({
      clock: () => current,
      maxAttempts: 1
    });
    let faultInjected = false;
    const injectedCoordinator = {
      ...coordinator,
      workingSet(attemptRef) {
        if (fault.name === 'working_set' && !faultInjected) {
          faultInjected = true;
          throw Object.assign(
            new Error(fault.expectedCode),
            { code: fault.expectedCode }
          );
        }
        return coordinator.workingSet(attemptRef);
      },
      appendReceipt(attemptRef, receipt) {
        if (!faultInjected && fault.name === 'append_receipt') {
          faultInjected = true;
          coordinator.appendReceipt(attemptRef, receipt);
          throw Object.assign(
            new Error(fault.expectedCode),
            { code: fault.expectedCode }
          );
        }
        if (!faultInjected && fault.name === 'deadline') {
          faultInjected = true;
          current = new Date(Date.parse(originalHeader.deadline_at));
        }
        return coordinator.appendReceipt(attemptRef, receipt);
      }
    };
    const runtime = createLoopbackEdgeRuntime({
      async verifyRequest() {},
      async verifyResponse() {},
      clock: () => current,
      maxInFlight: 1,
      maxRecords: 1,
      governedReadAttempts: true,
      attemptCoordinator: injectedCoordinator
    });
    const address = await runtime.start();
    const client = createLoopbackEdgeClient(address.url, {
      timeoutMs: 1_000
    });

    try {
      await assert.rejects(
        client.submit(request, { attemptHeader: originalHeader }),
        { code: fault.expectedCode }
      );
      assert.equal(runtime.snapshot().request_count, 0);
      assert.equal(
        coordinator.protocol(originalHeader.attempt_ref)
          .terminal.reason_code,
        fault.terminalReason
      );

      const retryHeader = createAttemptHeader({
        attemptRef: `grat_${fault.retryMarker.repeat(32)}`,
        toolName: 'search_memory',
        requestDigest: digestObject(request),
        contextBindingDigest: digestObject(contextRef),
        now: current,
        ttlSeconds: 20
      });
      assert.deepEqual(
        await client.submit(request, { attemptHeader: retryHeader }),
        {
          request_id: request.request_id,
          status: 'queued'
        }
      );
      await client.cancel(request.request_id);
      assert.equal(
        coordinator.protocol(retryHeader.attempt_ref)
          .terminal.reason_code,
        'attempt_cancelled'
      );
    } finally {
      await runtime.stop();
    }
  }
});

test('Edge protocol-candidate commit is atomic and rejects a divergent prefix', () => {
  const header = createAttemptHeader({
    attemptRef: `grat_${'c'.repeat(32)}`,
    toolName: 'search_memory',
    requestDigest: digestObject('candidate-request'),
    contextBindingDigest: digestObject('candidate-context'),
    now: NOW
  });
  const coordinator = createGovernedReadAttemptCoordinator({
    clock: () => NOW
  });
  coordinator.acceptAttempt(header);
  const initial = coordinator.workingSet(header.attempt_ref);
  const receipts = [...initial.receipts];
  for (const stage of [
    'EDGE_VALIDATED',
    'RELAY_CLAIMED',
    'AUTHORIZED',
    'BRIDGE_DELEGATED',
    'NATIVE_DISPATCHED',
    'SOURCE_PREFLIGHT',
    'PROVIDER_EMBEDDING',
    'HYDRATION',
    'INDEX_RECOVERY',
    'VECTOR_SEARCH',
    'SCOPE_POSTCHECK',
    'RESPONSE_FINALIZATION'
  ]) {
    const counterFacts = {
      BRIDGE_DELEGATED: { fallback: { attempts: 0 } },
      NATIVE_DISPATCHED: {
        native_invocation: { started: 1 },
        primary_memory: { write_attempts: 0, writes_committed: 0 }
      },
      PROVIDER_EMBEDDING: {
        provider: { started: 1, succeeded: 1, failed: 0 }
      },
      HYDRATION: {
        derived_transaction: {
          started: 1,
          committed: 1,
          rolled_back: 0
        }
      },
      VECTOR_SEARCH: {
        native_invocation: { succeeded: 1, failed: 0 }
      }
    }[stage] || {};
    receipts.push(createStageReceipt({
      header,
      receipts,
      stage,
      counterFacts
    }));
  }
  const terminal = createTerminalEnvelope({
    header,
    receipts,
    outcome: 'success',
    evidenceComplete: true
  });
  const candidate = createGovernedReadAttemptProtocol({
    header,
    receipts,
    terminal
  });
  const divergent = structuredClone(candidate);
  divergent.receipts[0].receipt_digest =
    digestObject('divergent-created');
  assert.throws(
    () => coordinator.commitProtocolCandidate(
      header.attempt_ref,
      divergent
    )
  );
  assert.equal(
    coordinator.snapshot(header.attempt_ref).receipt_count,
    1
  );
  assert.equal(
    coordinator.commitProtocolCandidate(
      header.attempt_ref,
      candidate
    ).accepted,
    true
  );
});

test('Governance denial emits the canonical AUTHORIZED failure without bridge dispatch', async () => {
  const header = createAttemptHeader({
    attemptRef: `grat_${'d'.repeat(32)}`,
    toolName: 'search_memory',
    requestDigest: digestObject('denied-request'),
    contextBindingDigest: digestObject('denied-context'),
    now: NOW
  });
  const receipts = [];
  for (const stage of [
    'CREATED',
    'EDGE_VALIDATED',
    'RELAY_CLAIMED'
  ]) {
    receipts.push(createStageReceipt({ header, receipts, stage }));
  }
  let bridgeCalls = 0;
  const runtime = createGovernedReadAttemptGovernanceRuntime({
    async authorizeRead() {
      return {
        accepted: false,
        invocation: unavailableInvocation(header.attempt_ref)
      };
    },
    async invokeBridge() {
      bridgeCalls += 1;
    },
    async projectInvocation() {
      throw new Error('projector_must_not_run');
    }
  });
  const result = await runtime.handle({
    request: {
      tool_request: {
        name: 'search_memory'
      }
    },
    relayReceipt: {},
    governedReadAttempt: {
      header,
      receipts
    }
  });
  assert.equal(bridgeCalls, 0);
  assert.equal(
    result.governed_read_attempt.working_set.receipts.at(-1).stage,
    'AUTHORIZED'
  );
  assert.equal(
    result.governed_read_attempt.working_set.receipts.at(-1).reason_code,
    'governance_denied'
  );
});

test('Governance binds authorized query and limit to the signed request', async () => {
  const header = createAttemptHeader({
    attemptRef: `grat_${'a'.repeat(32)}`,
    toolName: 'search_memory',
    requestDigest: digestObject('authorization-binding-request'),
    contextBindingDigest: digestObject('authorization-binding-context'),
    now: NOW
  });
  const receipts = [];
  for (const stage of [
    'CREATED',
    'EDGE_VALIDATED',
    'RELAY_CLAIMED'
  ]) {
    receipts.push(createStageReceipt({ header, receipts, stage }));
  }
  const request = {
    tool_request: {
      name: 'search_memory',
      arguments: {
        project_context_ref: `pctx_${'a'.repeat(32)}`,
        query: 'signed authorization query',
        limit: 1
      }
    }
  };
  for (const decisionOverride of [
    { query: 'different execution query' },
    { limit: 2 }
  ]) {
    let bridgeCalls = 0;
    const runtime = createGovernedReadAttemptGovernanceRuntime({
      async authorizeRead() {
        return {
          accepted: true,
          authorization: { accepted: true },
          query: request.tool_request.arguments.query,
          limit: request.tool_request.arguments.limit,
          ...decisionOverride
        };
      },
      async invokeBridge() {
        bridgeCalls += 1;
      },
      async projectInvocation() {
        throw new Error('projector_must_not_run');
      }
    });
    await assert.rejects(
      runtime.handle({
        request,
        relayReceipt: {},
        governedReadAttempt: { header, receipts }
      }),
      { code: 'governed_read_authorization_invalid' }
    );
    assert.equal(bridgeCalls, 0);
  }

  const requestWithoutLimit = structuredClone(request);
  delete requestWithoutLimit.tool_request.arguments.limit;
  assert.doesNotThrow(() => validateAuthorizationDecision({
    accepted: true,
    authorization: { accepted: true },
    query: request.tool_request.arguments.query,
    limit: 5
  }, requestWithoutLimit));
  assert.throws(() => validateAuthorizationDecision({
    accepted: true,
    authorization: { accepted: true },
    query: request.tool_request.arguments.query,
    limit: 8
  }, requestWithoutLimit), {
    code: 'governed_read_authorization_invalid'
  });

  const requestAboveNativeLimit = structuredClone(request);
  requestAboveNativeLimit.tool_request.arguments.limit = 8;
  assert.doesNotThrow(() => validateAuthorizationDecision({
    accepted: true,
    authorization: { accepted: true },
    query: request.tool_request.arguments.query,
    limit: 5
  }, requestAboveNativeLimit));
});

test('Governance derives tool-aware execution parameters from every signed read request', () => {
  const projectContextRef = `pctx_${'e'.repeat(32)}`;
  const cases = [
    {
      name: 'search_memory',
      arguments: {
        project_context_ref: projectContextRef,
        query: 'signed search query',
        limit: 8
      },
      expected: {
        query: 'signed search query',
        limit: 5
      }
    },
    {
      name: 'prepare_memory_context',
      arguments: {
        project_context_ref: projectContextRef
      },
      expected: {
        query: 'current project task context',
        limit: 5
      }
    },
    {
      name: 'prepare_memory_context',
      arguments: {
        project_context_ref: projectContextRef,
        task_summary: 'signed task summary'
      },
      expected: {
        query: 'signed task summary',
        limit: 5
      }
    },
    {
      name: 'memory_overview',
      arguments: {
        project_context_ref: projectContextRef
      },
      expected: {
        query: 'current project memory overview',
        limit: 1
      }
    },
    {
      name: 'audit_memory',
      arguments: {
        project_context_ref: projectContextRef
      },
      expected: {
        query: 'current project memory audit',
        limit: 5
      }
    },
    {
      name: 'audit_memory',
      arguments: {
        project_context_ref: projectContextRef,
        event_limit: 8
      },
      expected: {
        query: 'current project memory audit',
        limit: 5
      }
    }
  ];

  for (const fixture of cases) {
    const request = {
      tool_request: {
        name: fixture.name,
        arguments: fixture.arguments
      }
    };
    assert.deepEqual(
      deriveGovernedReadExecutionParameters(request),
      fixture.expected
    );
    assert.doesNotThrow(() => validateAuthorizationDecision({
      accepted: true,
      authorization: { accepted: true },
      ...fixture.expected
    }, request));
    assert.throws(() => validateAuthorizationDecision({
      accepted: true,
      authorization: { accepted: true },
      ...fixture.expected,
      query: `${fixture.expected.query} drift`
    }, request), {
      code: 'governed_read_authorization_invalid'
    });
    assert.throws(() => validateAuthorizationDecision({
      accepted: true,
      authorization: { accepted: true },
      ...fixture.expected,
      limit: fixture.expected.limit === 1 ? 2 : 1
    }, request), {
      code: 'governed_read_authorization_invalid'
    });
  }

  assert.throws(() => deriveGovernedReadExecutionParameters({
    tool_request: {
      name: 'memory_overview',
      arguments: {
        project_context_ref: projectContextRef,
        query: 'unsigned overview override'
      }
    }
  }), {
    code: 'governed_read_authorization_invalid'
  });
});

test('Governance binds public projection content to the successful lease result', async () => {
  const contextRef = `pctx_${'n'.repeat(32)}`;
  const request = {
    tool_request: {
      name: 'search_memory',
      arguments: {
        project_context_ref: contextRef,
        query: 'projection binding query',
        limit: 1
      }
    }
  };
  const header = createAttemptHeader({
    attemptRef: `grat_${'n'.repeat(32)}`,
    toolName: 'search_memory',
    requestDigest: digestObject(request),
    contextBindingDigest: digestObject(contextRef),
    now: NOW
  });
  const receipts = [];
  for (const stage of [
    'CREATED',
    'EDGE_VALIDATED',
    'RELAY_CLAIMED'
  ]) {
    receipts.push(createStageReceipt({
      header,
      receipts,
      stage
    }));
  }
  const projectedItem = {
    sourceFilePresent: true,
    scorePresent: true,
    score: 0.75,
    tagCountBucket: 'zero',
    sourceKinds: ['vcp_native'],
    memoryContextProjection: {
      projectionVersion: 1,
      lowDisclosure: true,
      statement: 'canonical lease-derived statement',
      classification: 'current_state',
      freshness: 'recent',
      reasonCodes: ['semantic_match'],
      conflict: false
    }
  };
  const resultWithHit = {
    results: [projectedItem],
    result_count: 1,
    raw_memory_content_disclosed: false,
    raw_vector_disclosed: false,
    source_path_disclosed: false,
    provider_response_disclosed: false
  };
  const resultWithoutHit = {
    ...resultWithHit,
    results: [],
    result_count: 0
  };

  function createRuntime(nativeResult, project) {
    return createGovernedReadAttemptGovernanceRuntime({
      async authorizeRead() {
        return {
          accepted: true,
          authorization: { accepted: true },
          query: request.tool_request.arguments.query,
          limit: request.tool_request.arguments.limit
        };
      },
      async invokeBridge({ workingSet }) {
        return successfulGovernanceBridgeResult(
          workingSet,
          nativeResult
        );
      },
      async projectInvocation({ bridgeResult }) {
        return {
          status: 'ok',
          structured_content: project(bridgeResult),
          counters: liveCounters(bridgeResult.working_set),
          receipt_digests: {
            governance:
              digestObject('projection-binding-governance'),
            context: digestObject(contextRef)
          }
        };
      }
    });
  }

  const zeroHitForgery = createRuntime(
    resultWithoutHit,
    () => ({
      status: 'found',
      result_count: 1,
      results: [{
        result_ref: `mref_${'z'.repeat(24)}`,
        summary: 'forged zero-hit statement',
        relevance: 0.75
      }]
    })
  );
  await assert.rejects(
    zeroHitForgery.handle({
      request,
      relayReceipt: {},
      governedReadAttempt: { header, receipts }
    }),
    { code: 'governed_read_projection_binding_invalid' }
  );

  const substitution = createRuntime(
    resultWithHit,
    bridgeResult => {
      const value = structuredProjection(
        request.tool_request.name,
        bridgeResult.result,
        contextRef
      );
      value.results[0].summary =
        'substituted public statement';
      return value;
    }
  );
  await assert.rejects(
    substitution.handle({
      request,
      relayReceipt: {},
      governedReadAttempt: { header, receipts }
    }),
    { code: 'governed_read_projection_binding_invalid' }
  );

  const canonical = createRuntime(
    resultWithHit,
    bridgeResult => structuredProjection(
      request.tool_request.name,
      bridgeResult.result,
      contextRef
    )
  );
  const accepted = await canonical.handle({
    request,
    relayReceipt: {},
    governedReadAttempt: { header, receipts }
  });
  assert.equal(
    accepted.structured_content.results[0].summary,
    projectedItem.memoryContextProjection.statement
  );
});

test('Bridge transport failure preserves unknown downstream counters', async () => {
  const authorized = bridgeWorkingSet('e');
  authorized.receipts.pop();
  const bridge = createGovernedReadAttemptBridge({
    async invokeShim() {
      throw new Error('synthetic_bridge_transport_failure');
    }
  });
  const result = await bridge.invoke({
    workingSet: authorized,
    authorization: {
      accepted: true,
      allowedDiaryNames: ['PROJECT_ALPHA'],
      allowedDiaryCount: 1
    },
    query: 'synthetic query',
    limit: 1
  });
  const receipt = result.working_set.receipts.at(-1);
  assert.equal(receipt.stage, 'BRIDGE_DELEGATED');
  assert.equal(receipt.reason_code, 'bridge_delegation_failed');
  assert.deepEqual(receipt.counter_facts.fallback, { attempts: 0 });
  assert.equal(receipt.counter_facts.provider, undefined);
  assert.equal(receipt.counter_facts.native_invocation, undefined);
  assert.equal(result.evidence_complete, false);
  assert.equal(result.cleanup_complete, false);
  const counters = aggregateAttemptCounters(
    result.working_set.receipts
  );
  assert.deepEqual(counters.provider, {
    started: null,
    succeeded: null,
    failed: null
  });
  assert.deepEqual(counters.native_invocation, {
    started: null,
    succeeded: null,
    failed: null
  });
  assert.doesNotThrow(() => createTerminalEnvelope({
    header: result.working_set.header,
    receipts: result.working_set.receipts,
    outcome: 'failure',
    reasonCode: 'bridge_delegation_failed',
    evidenceComplete: false,
    failureOrigin: 'bridge'
  }));

  const terminalBridge = createGovernedReadAttemptBridge({
    async invokeShim({ workingSet }) {
      return {
        accepted: false,
        working_set: workingSet,
        evidence_complete: false,
        result: null,
        terminal_failure: {
          reason_code: 'worker_execution_terminated',
          failure_origin: 'lease_worker'
        },
        cleanup_complete: true
      };
    }
  });
  const terminalResult = await terminalBridge.invoke({
    workingSet: authorized,
    authorization: {
      accepted: true,
      allowedDiaryNames: ['PROJECT_ALPHA'],
      allowedDiaryCount: 1
    },
    query: 'synthetic terminated worker',
    limit: 1
  });
  assert.deepEqual(terminalResult.terminal_failure, {
    reason_code: 'worker_execution_terminated',
    failure_origin: 'lease_worker'
  });
  assert.doesNotThrow(() => createTerminalEnvelope({
    header: terminalResult.working_set.header,
    receipts: terminalResult.working_set.receipts,
    outcome: 'failure',
    reasonCode: terminalResult.terminal_failure.reason_code,
    evidenceComplete: terminalResult.evidence_complete,
    failureOrigin: terminalResult.terminal_failure.failure_origin
  }));
});

test('dispatch, preflight, and provider failures close before creating a derived store', async t => {
  const fixture = createSqliteFixture(t);
  let providerCalls = 0;
  const dispatchWorker = createGovernedReadLeaseWorker({
    clock: () => NOW,
    sourceProjection: fixture.sourceProjection,
    async providerWrapper() {
      providerCalls += 1;
      return [0.75, 0.25];
    },
    dimension: 2,
    leaseRoot: fixture.leaseRoot,
    vcpCodeRoot: fixture.root,
    sourceRuntimeRoot: fixture.sourceRuntimeRoot,
    sourceKnowledgeBaseStorePath: fixture.sourceStore,
    knowledgeBaseRootPath: fixture.knowledgeBaseRootPath,
    workerRunner:
      createSyntheticWorkerRunner(fixture.sourceProjection),
    stageHooks: {
      async NATIVE_DISPATCHED() {
        throw new Error('synthetic_native_dispatch_failure');
      }
    }
  });
  const dispatchFailure = await dispatchWorker.execute({
    workingSet: bridgeWorkingSet('s'),
    authorization: {
      accepted: true,
      allowedDiaryNames: ['PROJECT_ALPHA'],
      allowedDiaryCount: 1
    },
    query: 'synthetic query',
    limit: 1
  });
  const dispatchReceipt =
    dispatchFailure.working_set.receipts.at(-1);
  assert.equal(dispatchReceipt.stage, 'NATIVE_DISPATCHED');
  assert.equal(
    dispatchReceipt.reason_code,
    'native_dispatch_failed'
  );
  assert.deepEqual(dispatchReceipt.counter_facts.provider, {
    started: 0,
    succeeded: 0,
    failed: 0
  });
  assert.deepEqual(
    dispatchReceipt.counter_facts.native_invocation,
    { started: 0, succeeded: 0, failed: 0 }
  );
  assert.equal(providerCalls, 0);
  assert.equal(dispatchWorker.snapshot().native_invocations, 0);
  assert.equal(dispatchWorker.snapshot().stores_created, 0);

  const preflightWorker = createGovernedReadLeaseWorker({
    clock: () => NOW,
    sourceProjection: fixture.sourceProjection,
    async providerWrapper() {
      providerCalls += 1;
      return [0.75, 0.25];
    },
    dimension: 2,
    leaseRoot: fixture.leaseRoot,
    vcpCodeRoot: fixture.root,
    sourceRuntimeRoot: fixture.sourceRuntimeRoot,
    sourceKnowledgeBaseStorePath: fixture.sourceStore,
    knowledgeBaseRootPath: fixture.knowledgeBaseRootPath,
    workerRunner:
      createSyntheticWorkerRunner(fixture.sourceProjection),
    stageHooks: {
      async SOURCE_PREFLIGHT() {
        throw new Error('synthetic_preflight_failure');
      }
    }
  });
  const preflightFailure = await preflightWorker.execute({
    workingSet: bridgeWorkingSet('f'),
    authorization: {
      accepted: true,
      allowedDiaryNames: ['PROJECT_ALPHA'],
      allowedDiaryCount: 1
    },
    query: 'synthetic query',
    limit: 1
  });
  assert.equal(
    preflightFailure.working_set.receipts.at(-1).reason_code,
    'source_preflight_failed'
  );
  assert.equal(providerCalls, 0);
  assert.equal(preflightWorker.snapshot().stores_created, 0);
  assert.doesNotThrow(() => createTerminalEnvelope({
    header: preflightFailure.working_set.header,
    receipts: preflightFailure.working_set.receipts,
    outcome: 'failure',
    reasonCode: 'source_preflight_failed',
    evidenceComplete: preflightFailure.evidence_complete,
    failureOrigin: 'persistent_shim'
  }));

  const providerWorker = createGovernedReadLeaseWorker({
    clock: () => NOW,
    sourceProjection: fixture.sourceProjection,
    async providerWrapper() {
      providerCalls += 1;
      throw new Error('synthetic_provider_failure');
    },
    dimension: 2,
    leaseRoot: fixture.leaseRoot,
    vcpCodeRoot: fixture.root,
    sourceRuntimeRoot: fixture.sourceRuntimeRoot,
    sourceKnowledgeBaseStorePath: fixture.sourceStore,
    knowledgeBaseRootPath: fixture.knowledgeBaseRootPath,
    workerRunner:
      createSyntheticWorkerRunner(fixture.sourceProjection)
  });
  const providerFailure = await providerWorker.execute({
    workingSet: bridgeWorkingSet('g'),
    authorization: {
      accepted: true,
      allowedDiaryNames: ['PROJECT_ALPHA'],
      allowedDiaryCount: 1
    },
    query: 'synthetic query',
    limit: 1
  });
  const providerReceipt =
    providerFailure.working_set.receipts.at(-1);
  assert.equal(providerReceipt.stage, 'PROVIDER_EMBEDDING');
  assert.equal(
    providerReceipt.reason_code,
    'provider_embedding_failed'
  );
  assert.deepEqual(providerReceipt.counter_facts.provider, {
    started: 1,
    succeeded: 0,
    failed: 1
  });
  assert.equal(providerWorker.snapshot().stores_created, 0);
  assert.equal(providerCalls, 1);

  const expiredWorker = createGovernedReadLeaseWorker({
    clock: () => new Date(NOW.getTime() + 60_000),
    sourceProjection: fixture.sourceProjection,
    async providerWrapper() {
      providerCalls += 1;
      return [0.75, 0.25];
    },
    dimension: 2,
    leaseRoot: fixture.leaseRoot,
    vcpCodeRoot: fixture.root,
    sourceRuntimeRoot: fixture.sourceRuntimeRoot,
    sourceKnowledgeBaseStorePath: fixture.sourceStore,
    knowledgeBaseRootPath: fixture.knowledgeBaseRootPath,
    workerRunner:
      createSyntheticWorkerRunner(fixture.sourceProjection)
  });
  const expiredFailure = await expiredWorker.execute({
    workingSet: bridgeWorkingSet('q'),
    authorization: {
      accepted: true,
      allowedDiaryNames: ['PROJECT_ALPHA'],
      allowedDiaryCount: 1
    },
    query: 'synthetic query',
    limit: 1
  });
  const expiredReceipt =
    expiredFailure.working_set.receipts.at(-1);
  assert.equal(expiredReceipt.stage, 'PROVIDER_EMBEDDING');
  assert.equal(
    expiredReceipt.reason_code,
    'provider_embedding_failed'
  );
  assert.deepEqual(expiredReceipt.counter_facts.provider, {
    started: 0,
    succeeded: 0,
    failed: 0
  });
  assert.equal(providerCalls, 1);
  assert.equal(expiredWorker.snapshot().stores_created, 0);

  let lateClock = NOW;
  const lateWorker = createGovernedReadLeaseWorker({
    clock: () => lateClock,
    sourceProjection: fixture.sourceProjection,
    async providerWrapper() {
      providerCalls += 1;
      lateClock = new Date(NOW.getTime() + 60_000);
      return [0.75, 0.25];
    },
    dimension: 2,
    leaseRoot: fixture.leaseRoot,
    vcpCodeRoot: fixture.root,
    sourceRuntimeRoot: fixture.sourceRuntimeRoot,
    sourceKnowledgeBaseStorePath: fixture.sourceStore,
    knowledgeBaseRootPath: fixture.knowledgeBaseRootPath,
    workerRunner:
      createSyntheticWorkerRunner(fixture.sourceProjection)
  });
  const lateFailure = await lateWorker.execute({
    workingSet: bridgeWorkingSet('r'),
    authorization: {
      accepted: true,
      allowedDiaryNames: ['PROJECT_ALPHA'],
      allowedDiaryCount: 1
    },
    query: 'synthetic query',
    limit: 1
  });
  assert.equal(
    lateFailure.working_set.receipts.at(-1).reason_code,
    'provider_embedding_failed'
  );
  assert.deepEqual(
    lateFailure.working_set.receipts.at(-1)
      .counter_facts.provider,
    { started: 1, succeeded: 0, failed: 1 }
  );
  assert.equal(providerCalls, 2);
  assert.equal(lateWorker.snapshot().stores_created, 0);
});

test('lease worker shares the signed public query character limit', async t => {
  const fixture = createSqliteFixture(t);
  let dispatchCalls = 0;
  let providerCalls = 0;
  const worker = createGovernedReadLeaseWorker({
    clock: () => NOW,
    sourceProjection: fixture.sourceProjection,
    async providerWrapper() {
      providerCalls += 1;
      return [0.75, 0.25];
    },
    dimension: 2,
    leaseRoot: fixture.leaseRoot,
    vcpCodeRoot: fixture.root,
    sourceRuntimeRoot: fixture.sourceRuntimeRoot,
    sourceKnowledgeBaseStorePath: fixture.sourceStore,
    knowledgeBaseRootPath: fixture.knowledgeBaseRootPath,
    workerRunner:
      createSyntheticWorkerRunner(fixture.sourceProjection),
    stageHooks: {
      async NATIVE_DISPATCHED() {
        dispatchCalls += 1;
        throw new Error('synthetic_dispatch_stop');
      }
    }
  });
  const authorization = {
    accepted: true,
    allowedDiaryNames: ['PROJECT_ALPHA'],
    allowedDiaryCount: 1
  };
  const atPublicLimit = await worker.execute({
    workingSet: bridgeWorkingSet('4'),
    authorization,
    query: 'q'.repeat(LIMITS.maxQueryCharacters),
    limit: 1
  });
  assert.equal(
    atPublicLimit.working_set.receipts.at(-1).reason_code,
    'native_dispatch_failed'
  );
  assert.equal(dispatchCalls, 1);
  assert.equal(providerCalls, 0);

  await assert.rejects(worker.execute({
    workingSet: bridgeWorkingSet('5'),
    authorization,
    query: 'q'.repeat(LIMITS.maxQueryCharacters + 1),
    limit: 1
  }), {
    code: 'lease_worker_query_invalid'
  });
  assert.equal(dispatchCalls, 1);
  assert.equal(providerCalls, 0);
});

test('lease task failure injection binds every child stage to its canonical reason', async t => {
  const fixture = createSqliteFixture(t);
  const cases = [
    ['HYDRATION', 'hydration_failed'],
    ['INDEX_RECOVERY', 'index_recovery_failed'],
    ['VECTOR_SEARCH', 'vector_search_failed'],
    ['SCOPE_POSTCHECK', 'scope_postcheck_failed']
  ];
  for (let index = 0; index < cases.length; index += 1) {
    const [stage, reasonCode] = cases[index];
    let providerCalls = 0;
    const worker = createGovernedReadLeaseWorker({
      clock: () => NOW,
      sourceProjection: fixture.sourceProjection,
      async providerWrapper() {
        providerCalls += 1;
        return [0.75, 0.25];
      },
      dimension: 2,
      leaseRoot: fixture.leaseRoot,
      vcpCodeRoot: fixture.root,
      sourceRuntimeRoot: fixture.sourceRuntimeRoot,
      sourceKnowledgeBaseStorePath: fixture.sourceStore,
      knowledgeBaseRootPath: fixture.knowledgeBaseRootPath,
      workerRunner: createSyntheticWorkerRunner(
        fixture.sourceProjection,
        {
          stageHooks: {
            async [stage]() {
              throw new Error(`synthetic_${stage.toLowerCase()}_failure`);
            }
          }
        }
      )
    });
    const result = await worker.execute({
      workingSet: bridgeWorkingSet(
        String.fromCharCode('h'.charCodeAt(0) + index)
      ),
      authorization: {
        accepted: true,
        allowedDiaryNames: ['PROJECT_ALPHA'],
        allowedDiaryCount: 1
      },
      query: 'synthetic query',
      limit: 1
    });
    const receipt = result.working_set.receipts.at(-1);
    assert.equal(receipt.stage, stage);
    assert.equal(receipt.reason_code, reasonCode);
    assert.equal(providerCalls, 1);
    assert.equal(worker.snapshot().native_invocations, 1);
    assert.equal(worker.snapshot().stores_created, 1);
    assert.equal(worker.snapshot().stores_removed, 1);
    const counters = aggregateAttemptCounters(
      result.working_set.receipts
    );
    assert.equal(counters.provider.started, 1);
    assert.equal(counters.primary_memory.write_attempts, 0);
    assert.equal(counters.fallback.attempts, 0);
    assert.doesNotThrow(() => createTerminalEnvelope({
      header: result.working_set.header,
      receipts: result.working_set.receipts,
      outcome: 'failure',
      reasonCode,
      evidenceComplete: result.evidence_complete,
      failureOrigin: receipt.origin
    }));
  }
});

test('lease task rejects skipped index search and ghost candidates', async t => {
  const fixture = createSqliteFixture(t);
  const cases = [
    { bypassIndexSearch: true },
    { ghostCandidate: true },
    { omitChunkId: true }
  ];
  for (let index = 0; index < cases.length; index += 1) {
    let providerCalls = 0;
    const worker = createGovernedReadLeaseWorker({
      clock: () => NOW,
      sourceProjection: fixture.sourceProjection,
      async providerWrapper() {
        providerCalls += 1;
        return [0.75, 0.25];
      },
      dimension: 2,
      leaseRoot: fixture.leaseRoot,
      vcpCodeRoot: fixture.root,
      sourceRuntimeRoot: fixture.sourceRuntimeRoot,
      sourceKnowledgeBaseStorePath: fixture.sourceStore,
      knowledgeBaseRootPath: fixture.knowledgeBaseRootPath,
      workerRunner: createSyntheticWorkerRunner(
        fixture.sourceProjection,
        cases[index]
      )
    });
    const result = await worker.execute({
      workingSet: bridgeWorkingSet(
        String.fromCharCode('v'.charCodeAt(0) + index)
      ),
      authorization: {
        accepted: true,
        allowedDiaryNames: ['PROJECT_ALPHA'],
        allowedDiaryCount: 1
      },
      query: 'synthetic index evidence query',
      limit: 1
    });
    const receipt = result.working_set.receipts.at(-1);
    assert.equal(result.accepted, false);
    assert.equal(receipt.stage, 'VECTOR_SEARCH');
    assert.equal(receipt.reason_code, 'vector_search_failed');
    assert.deepEqual(receipt.counter_facts.native_invocation, {
      failed: 1
    });
    assert.equal(providerCalls, 1);
    assert.equal(worker.snapshot().stores_created, 1);
    assert.equal(worker.snapshot().stores_removed, 1);
    assert.equal(worker.snapshot().cleanup_blocked, false);
  }
});

test('lease task requires search evidence from every non-empty allowed diary index', async () => {
  const allowedDiaryNames = ['PROJECT_ALPHA', 'PROJECT_BETA'];
  function createInput(suffix, searchedDiaryNames) {
    const searchCalls = new Map(
      allowedDiaryNames.map(diaryName => [diaryName, 0])
    );
    const originalSearches = new Map();
    const indexes = new Map(allowedDiaryNames.map(
      (diaryName, index) => {
        const diaryIndex = {
          async stats() {
            return { totalVectors: 1 };
          },
          search() {
            searchCalls.set(
              diaryName,
              searchCalls.get(diaryName) + 1
            );
            return [{ id: index + 1 }];
          },
          remove() {}
        };
        originalSearches.set(diaryName, diaryIndex.search);
        return [diaryName, diaryIndex];
      }
    ));
    return {
      input: {
        workingSet: leaseTaskWorkingSet(suffix),
        projection: {
          async materialize() {
            return {
              hydratedChunkCount: 2,
              counterFacts: {
                derived_transaction: {
                  started: 1,
                  committed: 1,
                  rolled_back: 0
                }
              }
            };
          }
        },
        projectionPlan: { dimension: 2 },
        authorization: {
          accepted: true,
          allowedDiaryNames,
          allowedDiaryCount: allowedDiaryNames.length
        },
        queryVector: [0.75, 0.25],
        queryLimit: 1,
        knowledgeBaseManager: {
          async _getOrLoadDiaryIndex(diaryName) {
            return indexes.get(diaryName);
          },
          async search(requestedDiaryNames) {
            assert.deepEqual(
              requestedDiaryNames,
              allowedDiaryNames
            );
            for (const diaryName of searchedDiaryNames) {
              await indexes.get(diaryName).search();
            }
            return searchedDiaryNames.length === 1
              ? [{
                  chunkId: 1,
                  diaryName: 'PROJECT_ALPHA',
                  fullPath: 'PROJECT_ALPHA/memory.md',
                  sourceFile: 'PROJECT_ALPHA/memory.md',
                  content: 'bounded synthetic governed memory',
                  score: 0.75,
                  matchedTags: []
                }]
              : [];
          }
        },
        knowledgeBaseRootPath: 'synthetic-knowledge-base-root',
        knowledgeBaseStorePath: 'synthetic-derived-store'
      },
      indexes,
      originalSearches,
      searchCalls
    };
  }

  const incomplete = createInput('1', ['PROJECT_ALPHA']);
  const rejected = await executeGovernedReadLeaseTask(
    incomplete.input
  );
  assert.equal(rejected.accepted, false);
  assert.equal(
    rejected.working_set.receipts.at(-1).stage,
    'VECTOR_SEARCH'
  );
  assert.equal(
    rejected.working_set.receipts.at(-1).reason_code,
    'vector_search_failed'
  );
  assert.deepEqual(
    Object.fromEntries(incomplete.searchCalls),
    { PROJECT_ALPHA: 1, PROJECT_BETA: 0 }
  );
  for (const diaryName of allowedDiaryNames) {
    assert.equal(
      incomplete.indexes.get(diaryName).search,
      incomplete.originalSearches.get(diaryName)
    );
  }

  const reused = createInput('2', allowedDiaryNames);
  const sharedIndex = reused.indexes.get('PROJECT_ALPHA');
  reused.input.knowledgeBaseManager._getOrLoadDiaryIndex =
    async () => sharedIndex;
  const ambiguous = await executeGovernedReadLeaseTask(reused.input);
  assert.equal(ambiguous.accepted, false);
  assert.equal(
    ambiguous.working_set.receipts.at(-1).stage,
    'INDEX_RECOVERY'
  );
  assert.equal(
    ambiguous.working_set.receipts.at(-1).reason_code,
    'index_recovery_failed'
  );
  assert.equal(
    sharedIndex.search,
    reused.originalSearches.get('PROJECT_ALPHA')
  );

  const complete = createInput('3', allowedDiaryNames);
  const accepted = await executeGovernedReadLeaseTask(complete.input);
  assert.equal(accepted.accepted, true);
  assert.equal(accepted.result.result_count, 0);
  assert.deepEqual(
    Object.fromEntries(complete.searchCalls),
    { PROJECT_ALPHA: 1, PROJECT_BETA: 1 }
  );
  for (const diaryName of allowedDiaryNames) {
    assert.equal(
      complete.indexes.get(diaryName).search,
      complete.originalSearches.get(diaryName)
    );
  }
});

test('lease task converts projection errors into a clean scope failure', async t => {
  const fixture = createSqliteFixture(t);
  let providerCalls = 0;
  const worker = createGovernedReadLeaseWorker({
    clock: () => NOW,
    sourceProjection: fixture.sourceProjection,
    async providerWrapper() {
      providerCalls += 1;
      return [0.75, 0.25];
    },
    dimension: 2,
    leaseRoot: fixture.leaseRoot,
    vcpCodeRoot: fixture.root,
    sourceRuntimeRoot: fixture.sourceRuntimeRoot,
    sourceKnowledgeBaseStorePath: fixture.sourceStore,
    knowledgeBaseRootPath: fixture.knowledgeBaseRootPath,
    workerRunner: createSyntheticWorkerRunner(
      fixture.sourceProjection,
      { malformedProjection: true }
    )
  });
  const result = await worker.execute({
    workingSet: bridgeWorkingSet('k'),
    authorization: {
      accepted: true,
      allowedDiaryNames: ['PROJECT_ALPHA'],
      allowedDiaryCount: 1
    },
    query: 'malformed low disclosure projection',
    limit: 1
  });
  assert.equal(result.accepted, false);
  assert.equal(result.cleanup_complete, true);
  assert.equal(result.evidence_complete, true);
  assert.equal(result.terminal_failure, null);
  assert.equal(
    result.working_set.receipts.at(-1).stage,
    'SCOPE_POSTCHECK'
  );
  assert.equal(
    result.working_set.receipts.at(-1).reason_code,
    'scope_postcheck_failed'
  );
  assert.deepEqual(
    aggregateAttemptCounters(result.working_set.receipts)
      .native_invocation,
    { started: 1, succeeded: 1, failed: 0 }
  );
  assert.equal(providerCalls, 1);
  assert.equal(worker.snapshot().cleanup_blocked, false);
  assert.equal(worker.snapshot().stores_created, 1);
  assert.equal(worker.snapshot().stores_removed, 1);
  assert.deepEqual(fs.readdirSync(fixture.leaseRoot), []);
});

test('shutdown failure retains the exact store and blocks the next provider call', async t => {
  const fixture = createSqliteFixture(t);
  let providerCalls = 0;
  const worker = createGovernedReadLeaseWorker({
    clock: () => NOW,
    sourceProjection: fixture.sourceProjection,
    async providerWrapper() {
      providerCalls += 1;
      return [0.75, 0.25];
    },
    dimension: 2,
    leaseRoot: fixture.leaseRoot,
    vcpCodeRoot: fixture.root,
    sourceRuntimeRoot: fixture.sourceRuntimeRoot,
    sourceKnowledgeBaseStorePath: fixture.sourceStore,
    knowledgeBaseRootPath: fixture.knowledgeBaseRootPath,
    async workerRunner(task) {
      return successfulWorkerExecution(task, {
        shutdownComplete: false
      });
    }
  });
  const first = await worker.execute({
    workingSet: bridgeWorkingSet('l'),
    authorization: {
      accepted: true,
      allowedDiaryNames: ['PROJECT_ALPHA'],
      allowedDiaryCount: 1
    },
    query: 'synthetic query',
    limit: 1
  });
  assert.equal(first.cleanup_complete, false);
  assert.deepEqual(first.terminal_failure, {
    reason_code: 'worker_shutdown_incomplete',
    failure_origin: 'lease_worker'
  });
  assert.equal(worker.snapshot().cleanup_blocked, true);
  assert.equal(worker.snapshot().stores_created, 1);
  assert.equal(worker.snapshot().stores_removed, 0);
  assert.equal(fs.readdirSync(fixture.leaseRoot).length, 1);

  const second = await worker.execute({
    workingSet: bridgeWorkingSet('m'),
    authorization: {
      accepted: true,
      allowedDiaryNames: ['PROJECT_ALPHA'],
      allowedDiaryCount: 1
    },
    query: 'second synthetic query',
    limit: 1
  });
  assert.equal(
    second.working_set.receipts.at(-1).reason_code,
    'native_attempt_busy'
  );
  assert.equal(providerCalls, 1);
});

test('one-active-attempt lock rejects a concurrent read before provider execution', async t => {
  const fixture = createSqliteFixture(t);
  let providerCalls = 0;
  let releaseWorker;
  let workerEntered;
  const entered = new Promise(resolve => {
    workerEntered = resolve;
  });
  const release = new Promise(resolve => {
    releaseWorker = resolve;
  });
  const worker = createGovernedReadLeaseWorker({
    clock: () => NOW,
    sourceProjection: fixture.sourceProjection,
    async providerWrapper() {
      providerCalls += 1;
      return [0.75, 0.25];
    },
    dimension: 2,
    leaseRoot: fixture.leaseRoot,
    vcpCodeRoot: fixture.root,
    sourceRuntimeRoot: fixture.sourceRuntimeRoot,
    sourceKnowledgeBaseStorePath: fixture.sourceStore,
    knowledgeBaseRootPath: fixture.knowledgeBaseRootPath,
    async workerRunner(task) {
      workerEntered();
      await release;
      return successfulWorkerExecution(task);
    }
  });
  const firstPromise = worker.execute({
    workingSet: bridgeWorkingSet('n'),
    authorization: {
      accepted: true,
      allowedDiaryNames: ['PROJECT_ALPHA'],
      allowedDiaryCount: 1
    },
    query: 'first synthetic query',
    limit: 1
  });
  await entered;
  const second = await worker.execute({
    workingSet: bridgeWorkingSet('o'),
    authorization: {
      accepted: true,
      allowedDiaryNames: ['PROJECT_ALPHA'],
      allowedDiaryCount: 1
    },
    query: 'second synthetic query',
    limit: 1
  });
  assert.equal(
    second.working_set.receipts.at(-1).reason_code,
    'native_attempt_busy'
  );
  assert.deepEqual(
    second.working_set.receipts.at(-1)
      .counter_facts.provider,
    { started: 0, succeeded: 0, failed: 0 }
  );
  assert.equal(providerCalls, 1);
  releaseWorker();
  assert.equal((await firstPromise).accepted, true);
  assert.equal(worker.snapshot().stores_removed, 1);
});

test('provider timeout aborts the lease and retains admission until the call settles', async t => {
  const fixture = createSqliteFixture(t);
  let providerCalls = 0;
  let providerSignal;
  let releaseProvider;
  const pendingProvider = new Promise(resolve => {
    releaseProvider = resolve;
  });
  const worker = createGovernedReadLeaseWorker({
    clock: () => NOW,
    sourceProjection: fixture.sourceProjection,
    async providerWrapper({ signal }) {
      providerCalls += 1;
      providerSignal = signal;
      if (providerCalls === 1) return pendingProvider;
      return [0.75, 0.25];
    },
    providerTimeoutMs: 10,
    dimension: 2,
    leaseRoot: fixture.leaseRoot,
    vcpCodeRoot: fixture.root,
    sourceRuntimeRoot: fixture.sourceRuntimeRoot,
    sourceKnowledgeBaseStorePath: fixture.sourceStore,
    knowledgeBaseRootPath: fixture.knowledgeBaseRootPath,
    workerRunner:
      createSyntheticWorkerRunner(fixture.sourceProjection)
  });
  const timedOut = await worker.execute({
    workingSet: bridgeWorkingSet('t'),
    authorization: {
      accepted: true,
      allowedDiaryNames: ['PROJECT_ALPHA'],
      allowedDiaryCount: 1
    },
    query: 'timed provider query',
    limit: 1
  });
  assert.equal(providerSignal.aborted, true);
  assert.equal(
    timedOut.working_set.receipts.at(-1).reason_code,
    'provider_embedding_failed'
  );
  assert.deepEqual(
    timedOut.working_set.receipts.at(-1).counter_facts.provider,
    { started: 1, succeeded: 0, failed: 1 }
  );
  assert.equal(worker.snapshot().stores_created, 0);
  assert.equal(worker.snapshot().provider_calls_in_flight, 1);

  const blocked = await worker.execute({
    workingSet: bridgeWorkingSet('u'),
    authorization: {
      accepted: true,
      allowedDiaryNames: ['PROJECT_ALPHA'],
      allowedDiaryCount: 1
    },
    query: 'blocked while provider settles',
    limit: 1
  });
  assert.equal(
    blocked.working_set.receipts.at(-1).reason_code,
    'native_attempt_busy'
  );
  assert.equal(providerCalls, 1);

  releaseProvider([0.75, 0.25]);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(worker.snapshot().provider_calls_in_flight, 0);
  const recovered = await worker.execute({
    workingSet: bridgeWorkingSet('w'),
    authorization: {
      accepted: true,
      allowedDiaryNames: ['PROJECT_ALPHA'],
      allowedDiaryCount: 1
    },
    query: 'provider lock recovered',
    limit: 1
  });
  assert.equal(recovered.accepted, true);
  assert.equal(providerCalls, 2);
  assert.equal(worker.snapshot().stores_created, 1);
  assert.equal(worker.snapshot().stores_removed, 1);
});

test('store creation latches cleanup only when a partial resource cannot be removed', async t => {
  const transientFixture = createSqliteFixture(t);
  let transientFailure = true;
  let transientProviderCalls = 0;
  const transientFs = {
    ...fs,
    mkdtempSync(prefix, ...args) {
      if (transientFailure) {
        transientFailure = false;
        throw Object.assign(
          new Error('synthetic_transient_store_failure'),
          { code: 'EMFILE' }
        );
      }
      return fs.mkdtempSync(prefix, ...args);
    }
  };
  const transientWorker = createGovernedReadLeaseWorker({
    clock: () => NOW,
    sourceProjection: transientFixture.sourceProjection,
    async providerWrapper() {
      transientProviderCalls += 1;
      return [0.75, 0.25];
    },
    dimension: 2,
    leaseRoot: transientFixture.leaseRoot,
    vcpCodeRoot: transientFixture.root,
    sourceRuntimeRoot: transientFixture.sourceRuntimeRoot,
    sourceKnowledgeBaseStorePath: transientFixture.sourceStore,
    knowledgeBaseRootPath:
      transientFixture.knowledgeBaseRootPath,
    workerRunner:
      createSyntheticWorkerRunner(
        transientFixture.sourceProjection
      ),
    fsModule: transientFs
  });
  await assert.rejects(
    transientWorker.execute({
      workingSet: bridgeWorkingSet('x'),
      authorization: {
        accepted: true,
        allowedDiaryNames: ['PROJECT_ALPHA'],
        allowedDiaryCount: 1
      },
      query: 'transient store failure',
      limit: 1
    }),
    { code: 'lease_worker_store_creation_failed' }
  );
  assert.equal(transientWorker.snapshot().cleanup_blocked, false);
  assert.deepEqual(
    fs.readdirSync(transientFixture.leaseRoot),
    []
  );
  const recovered = await transientWorker.execute({
    workingSet: bridgeWorkingSet('y'),
    authorization: {
      accepted: true,
      allowedDiaryNames: ['PROJECT_ALPHA'],
      allowedDiaryCount: 1
    },
    query: 'transient store recovered',
    limit: 1
  });
  assert.equal(recovered.accepted, true);
  assert.equal(transientProviderCalls, 2);
  assert.equal(transientWorker.snapshot().stores_created, 1);
  assert.equal(transientWorker.snapshot().stores_removed, 1);

  const residueFixture = createSqliteFixture(t);
  let failDerivedDirectory = true;
  let residueProviderCalls = 0;
  const residueFs = {
    ...fs,
    mkdirSync(target, ...args) {
      if (failDerivedDirectory &&
          path.basename(target) === 'derived-store') {
        failDerivedDirectory = false;
        throw new Error('synthetic_partial_store_failure');
      }
      return fs.mkdirSync(target, ...args);
    },
    rmSync(target, ...args) {
      if (path.basename(target).startsWith('governed-read-')) {
        throw new Error('synthetic_store_cleanup_failure');
      }
      return fs.rmSync(target, ...args);
    }
  };
  const residueWorker = createGovernedReadLeaseWorker({
    clock: () => NOW,
    sourceProjection: residueFixture.sourceProjection,
    async providerWrapper() {
      residueProviderCalls += 1;
      return [0.75, 0.25];
    },
    dimension: 2,
    leaseRoot: residueFixture.leaseRoot,
    vcpCodeRoot: residueFixture.root,
    sourceRuntimeRoot: residueFixture.sourceRuntimeRoot,
    sourceKnowledgeBaseStorePath: residueFixture.sourceStore,
    knowledgeBaseRootPath: residueFixture.knowledgeBaseRootPath,
    workerRunner:
      createSyntheticWorkerRunner(residueFixture.sourceProjection),
    fsModule: residueFs
  });
  const residue = await residueWorker.execute({
    workingSet: bridgeWorkingSet('z'),
    authorization: {
      accepted: true,
      allowedDiaryNames: ['PROJECT_ALPHA'],
      allowedDiaryCount: 1
    },
    query: 'partial store residue',
    limit: 1
  });
  assert.equal(residue.cleanup_complete, false);
  assert.equal(
    residue.terminal_failure.reason_code,
    'worker_shutdown_incomplete'
  );
  assert.equal(residueWorker.snapshot().cleanup_blocked, true);
  assert.equal(residueProviderCalls, 1);
  assert.equal(fs.readdirSync(residueFixture.leaseRoot).length, 1);
});

test('lease process strips inherited env and execArgv before exact-child timeout', async () => {
  class SyntheticChild extends EventEmitter {
    constructor() {
      super();
      this.connected = true;
      this.pid = 12345;
      this.signals = [];
      this.unrefCalls = 0;
    }

    send() {}

    kill(signal) {
      this.signals.push(signal);
      return true;
    }

    disconnect() {
      this.connected = false;
    }

    unref() {
      this.unrefCalls += 1;
    }
  }
  const child = new SyntheticChild();
  let forkOptions = null;
  const result = await runLeaseWorkerProcess({}, {
    workerTimeoutMs: 10,
    terminationGraceMs: 10,
    forkProcess(_file, _args, options) {
      forkOptions = options;
      return child;
    }
  });
  assert.deepEqual(child.signals, ['SIGTERM']);
  assert.equal(child.signals.includes('SIGKILL'), false);
  assert.equal(child.unrefCalls, 1);
  assert.equal(result.shutdown_complete, false);
  assert.equal(result.child_started, true);
  assert.equal(result.termination_reason, 'timeout');
  assert.deepEqual(Object.keys(forkOptions.env).sort(), [
    'LANG',
    'LC_ALL',
    'TZ'
  ]);
  assert.equal(
    Object.keys(forkOptions.env).some(key =>
      /API|TOKEN|KEY|PROVIDER/iu.test(key)
    ),
    false
  );
  assert.deepEqual(forkOptions.execArgv, []);
});

test('pre-start child failures clean empty stores and reuse capacity', async t => {
  const fixture = createSqliteFixture(t);
  const successfulRunner =
    createSyntheticWorkerRunner(fixture.sourceProjection);
  let asynchronousFailureChild = null;
  let runnerCalls = 0;
  let providerCalls = 0;
  const worker = createGovernedReadLeaseWorker({
    clock: () => NOW,
    sourceProjection: fixture.sourceProjection,
    async providerWrapper() {
      providerCalls += 1;
      return [0.75, 0.25];
    },
    dimension: 2,
    leaseRoot: fixture.leaseRoot,
    vcpCodeRoot: fixture.root,
    sourceRuntimeRoot: fixture.sourceRuntimeRoot,
    sourceKnowledgeBaseStorePath: fixture.sourceStore,
    knowledgeBaseRootPath: fixture.knowledgeBaseRootPath,
    async workerRunner(task, options) {
      runnerCalls += 1;
      if (runnerCalls === 1) {
        return runLeaseWorkerProcess(task, {
          ...options,
          forkProcess() {
            throw new Error('synthetic_pre_fork_failure');
          }
        });
      }
      if (runnerCalls === 2) {
        class SyntheticAsyncSpawnFailure extends EventEmitter {
          constructor() {
            super();
            this.connected = false;
            this.killCalls = 0;
          }

          send() {
            queueMicrotask(() => this.emit(
              'error',
              new Error('synthetic_async_spawn_failure')
            ));
          }

          kill() {
            this.killCalls += 1;
            return false;
          }

          disconnect() {}

          unref() {}
        }
        asynchronousFailureChild =
          new SyntheticAsyncSpawnFailure();
        return runLeaseWorkerProcess(task, {
          ...options,
          forkProcess() {
            return asynchronousFailureChild;
          }
        });
      }
      return successfulRunner(task, options);
    }
  });
  const authorization = {
    accepted: true,
    allowedDiaryNames: ['PROJECT_ALPHA'],
    allowedDiaryCount: 1
  };
  const first = await worker.execute({
    workingSet: bridgeWorkingSet('f'),
    authorization,
    query: 'pre fork cleanup failure',
    limit: 1
  });
  assert.equal(first.accepted, false);
  assert.equal(first.cleanup_complete, true);
  assert.equal(first.evidence_complete, true);
  assert.equal(
    first.working_set.receipts.at(-1).reason_code,
    'hydration_failed'
  );
  assert.deepEqual(
    first.working_set.receipts.at(-1)
      .counter_facts.derived_transaction,
    { started: 0, committed: 0, rolled_back: 0 }
  );
  assert.equal(worker.snapshot().cleanup_blocked, false);
  assert.equal(worker.snapshot().stores_created, 1);
  assert.equal(worker.snapshot().stores_removed, 1);
  assert.deepEqual(fs.readdirSync(fixture.leaseRoot), []);

  const secondFailure = await worker.execute({
    workingSet: bridgeWorkingSet('g'),
    authorization,
    query: 'async spawn cleanup failure',
    limit: 1
  });
  assert.equal(secondFailure.accepted, false);
  assert.equal(secondFailure.cleanup_complete, true);
  assert.equal(secondFailure.evidence_complete, true);
  assert.equal(
    secondFailure.working_set.receipts.at(-1).reason_code,
    'hydration_failed'
  );
  assert.deepEqual(
    secondFailure.working_set.receipts.at(-1)
      .counter_facts.derived_transaction,
    { started: 0, committed: 0, rolled_back: 0 }
  );
  assert.equal(asynchronousFailureChild.killCalls, 0);
  assert.equal(worker.snapshot().cleanup_blocked, false);
  assert.equal(worker.snapshot().stores_created, 2);
  assert.equal(worker.snapshot().stores_removed, 2);
  assert.deepEqual(fs.readdirSync(fixture.leaseRoot), []);

  const third = await worker.execute({
    workingSet: bridgeWorkingSet('h'),
    authorization,
    query: 'capacity reused after pre start failures',
    limit: 1
  });
  assert.equal(third.accepted, true);
  assert.equal(providerCalls, 3);
  assert.equal(worker.snapshot().attempts_completed, 3);
  assert.equal(worker.snapshot().cleanup_blocked, false);
  assert.equal(worker.snapshot().stores_created, 3);
  assert.equal(worker.snapshot().stores_removed, 3);
  assert.deepEqual(fs.readdirSync(fixture.leaseRoot), []);
});

test('natural child exit cleans its exact store and reuses capacity', async t => {
  const fixture = createSqliteFixture(t);
  const successfulRunner =
    createSyntheticWorkerRunner(fixture.sourceProjection);
  let failedChild = null;
  let failedExecution = null;
  let runnerCalls = 0;
  let providerCalls = 0;
  const worker = createGovernedReadLeaseWorker({
    clock: () => NOW,
    sourceProjection: fixture.sourceProjection,
    async providerWrapper() {
      providerCalls += 1;
      return [0.75, 0.25];
    },
    dimension: 2,
    leaseRoot: fixture.leaseRoot,
    vcpCodeRoot: fixture.root,
    sourceRuntimeRoot: fixture.sourceRuntimeRoot,
    sourceKnowledgeBaseStorePath: fixture.sourceStore,
    knowledgeBaseRootPath: fixture.knowledgeBaseRootPath,
    async workerRunner(task, options) {
      runnerCalls += 1;
      if (runnerCalls !== 1) {
        return successfulRunner(task, options);
      }
      class SyntheticNonzeroExitChild extends EventEmitter {
        constructor() {
          super();
          this.connected = true;
          this.pid = 13579;
          this.killCalls = 0;
        }

        send() {
          queueMicrotask(() => {
            this.connected = false;
            this.emit('exit', 1);
          });
        }

        kill() {
          this.killCalls += 1;
          return false;
        }

        disconnect() {
          this.connected = false;
        }

        unref() {}
      }
      failedChild = new SyntheticNonzeroExitChild();
      failedExecution = await runLeaseWorkerProcess(task, {
        ...options,
        forkProcess() {
          return failedChild;
        }
      });
      return failedExecution;
    }
  });
  const authorization = {
    accepted: true,
    allowedDiaryNames: ['PROJECT_ALPHA'],
    allowedDiaryCount: 1
  };
  const failed = await worker.execute({
    workingSet: bridgeWorkingSet('n'),
    authorization,
    query: 'natural nonzero child exit',
    limit: 1
  });
  assert.equal(failed.accepted, false);
  assert.equal(failed.cleanup_complete, true);
  assert.equal(failed.evidence_complete, false);
  assert.deepEqual(failed.terminal_failure, {
    reason_code: 'worker_execution_terminated',
    failure_origin: 'lease_worker'
  });
  assert.equal(
    failed.working_set.receipts.at(-1).stage,
    'PROVIDER_EMBEDDING'
  );
  assert.equal(failedChild.killCalls, 0);
  assert.equal(failedExecution.response, null);
  assert.equal(failedExecution.shutdown_complete, true);
  assert.equal(failedExecution.termination_reason, 'child_error');
  assert.equal(worker.snapshot().cleanup_blocked, false);
  assert.equal(worker.snapshot().stores_created, 1);
  assert.equal(worker.snapshot().stores_removed, 1);
  assert.deepEqual(fs.readdirSync(fixture.leaseRoot), []);

  const recovered = await worker.execute({
    workingSet: bridgeWorkingSet('o'),
    authorization,
    query: 'capacity reused after natural child exit',
    limit: 1
  });
  assert.equal(recovered.accepted, true);
  assert.equal(providerCalls, 2);
  assert.equal(worker.snapshot().attempts_completed, 2);
  assert.equal(worker.snapshot().cleanup_blocked, false);
  assert.equal(worker.snapshot().stores_created, 2);
  assert.equal(worker.snapshot().stores_removed, 2);
  assert.deepEqual(fs.readdirSync(fixture.leaseRoot), []);
});

test('remaining attempt TTL terminates the lease child, rejects late success, and reuses capacity', async t => {
  const fixture = createSqliteFixture(t);
  const successfulRunner =
    createSyntheticWorkerRunner(fixture.sourceProjection);
  let lateExecution = null;
  let lateChild = null;
  let current = NOW;
  let attemptDeadlineMs = null;
  let observedWorkerTimeoutMs = null;
  let runnerCalls = 0;
  let providerCalls = 0;
  const worker = createGovernedReadLeaseWorker({
    clock: () => current,
    sourceProjection: fixture.sourceProjection,
    async providerWrapper() {
      providerCalls += 1;
      current = new Date(attemptDeadlineMs - 10);
      return [0.75, 0.25];
    },
    dimension: 2,
    leaseRoot: fixture.leaseRoot,
    vcpCodeRoot: fixture.root,
    sourceRuntimeRoot: fixture.sourceRuntimeRoot,
    sourceKnowledgeBaseStorePath: fixture.sourceStore,
    knowledgeBaseRootPath: fixture.knowledgeBaseRootPath,
    workerTimeoutMs: 60_000,
    terminationGraceMs: 100,
    async workerRunner(task, options) {
      runnerCalls += 1;
      if (runnerCalls !== 1) {
        return successfulRunner(task, options);
      }
      observedWorkerTimeoutMs = options.workerTimeoutMs;
      class SyntheticLateSuccessChild extends EventEmitter {
        constructor() {
          super();
          this.connected = true;
          this.pid = 24680;
          this.signals = [];
          this.task = null;
        }

        send(envelope) {
          this.task = envelope.task;
        }

        kill(signal) {
          this.signals.push(signal);
          queueMicrotask(() => {
            const execution =
              successfulWorkerExecution(this.task);
            this.emit('message', execution.response);
            this.connected = false;
            this.emit('exit', 0);
          });
          return true;
        }

        disconnect() {
          this.connected = false;
        }

        unref() {}
      }
      lateChild = new SyntheticLateSuccessChild();
      lateExecution = await runLeaseWorkerProcess(task, {
        ...options,
        forkProcess() {
          return lateChild;
        }
      });
      return lateExecution;
    }
  });
  const authorization = {
    accepted: true,
    allowedDiaryNames: ['PROJECT_ALPHA'],
    allowedDiaryCount: 1
  };
  const lateWorkingSet = bridgeWorkingSet('i');
  attemptDeadlineMs =
    Date.parse(lateWorkingSet.header.deadline_at);
  const late = await worker.execute({
    workingSet: lateWorkingSet,
    authorization,
    query: 'late success after timeout',
    limit: 1
  });
  assert.equal(late.accepted, false);
  assert.equal(late.cleanup_complete, true);
  assert.equal(late.evidence_complete, false);
  assert.deepEqual(
    late.terminal_failure,
    {
      reason_code: 'worker_execution_terminated',
      failure_origin: 'lease_worker'
    }
  );
  assert.equal(
    late.working_set.receipts.at(-1).stage,
    'PROVIDER_EMBEDDING'
  );
  const terminal = createTerminalEnvelope({
    header: late.working_set.header,
    receipts: late.working_set.receipts,
    outcome: 'failure',
    reasonCode: late.terminal_failure.reason_code,
    evidenceComplete: late.evidence_complete,
    failureOrigin: late.terminal_failure.failure_origin
  });
  assert.equal(terminal.last_completed_stage, 'PROVIDER_EMBEDDING');
  assert.equal(terminal.failed_stage, 'TERMINAL_FAILURE');
  assert.equal(terminal.reason_code, 'worker_execution_terminated');
  assert.deepEqual(terminal.counters.native_invocation, {
    started: 1,
    succeeded: null,
    failed: null
  });
  assert.deepEqual(terminal.counters.derived_transaction, {
    started: null,
    committed: null,
    rolled_back: null
  });
  assert.deepEqual(lateChild.signals, ['SIGTERM']);
  assert.equal(lateExecution.response, null);
  assert.equal(lateExecution.shutdown_complete, true);
  assert.equal(lateExecution.termination_reason, 'timeout');
  assert.equal(observedWorkerTimeoutMs, 10);
  assert.equal(worker.snapshot().cleanup_blocked, false);
  assert.equal(worker.snapshot().stores_created, 1);
  assert.equal(worker.snapshot().stores_removed, 1);
  assert.deepEqual(fs.readdirSync(fixture.leaseRoot), []);

  const recovered = await worker.execute({
    workingSet: bridgeWorkingSet('j'),
    authorization,
    query: 'capacity reused after late timeout result',
    limit: 1
  });
  assert.equal(recovered.accepted, true);
  assert.equal(providerCalls, 2);
  assert.equal(worker.snapshot().attempts_completed, 2);
  assert.equal(worker.snapshot().cleanup_blocked, false);
  assert.equal(worker.snapshot().stores_created, 2);
  assert.equal(worker.snapshot().stores_removed, 2);
  assert.deepEqual(fs.readdirSync(fixture.leaseRoot), []);
});

test('lease parent discards a runner success returned at the absolute attempt deadline', async t => {
  const fixture = createSqliteFixture(t);
  let current = NOW;
  let attemptDeadlineMs = null;
  let observedWorkerTimeoutMs = null;
  let providerCalls = 0;
  const worker = createGovernedReadLeaseWorker({
    clock: () => current,
    sourceProjection: fixture.sourceProjection,
    async providerWrapper() {
      providerCalls += 1;
      current = new Date(attemptDeadlineMs - 25);
      return [0.75, 0.25];
    },
    dimension: 2,
    leaseRoot: fixture.leaseRoot,
    vcpCodeRoot: fixture.root,
    sourceRuntimeRoot: fixture.sourceRuntimeRoot,
    sourceKnowledgeBaseStorePath: fixture.sourceStore,
    knowledgeBaseRootPath: fixture.knowledgeBaseRootPath,
    workerTimeoutMs: 60_000,
    async workerRunner(task, options) {
      observedWorkerTimeoutMs = options.workerTimeoutMs;
      current = new Date(attemptDeadlineMs);
      return successfulWorkerExecution(task);
    }
  });
  const workingSet = bridgeWorkingSet('v');
  attemptDeadlineMs = Date.parse(workingSet.header.deadline_at);
  const result = await worker.execute({
    workingSet,
    authorization: {
      accepted: true,
      allowedDiaryNames: ['PROJECT_ALPHA'],
      allowedDiaryCount: 1
    },
    query: 'runner result returned at deadline',
    limit: 1
  });
  assert.equal(result.accepted, false);
  assert.equal(result.result, null);
  assert.equal(result.cleanup_complete, true);
  assert.equal(result.evidence_complete, false);
  assert.deepEqual(result.terminal_failure, {
    reason_code: 'worker_execution_terminated',
    failure_origin: 'lease_worker'
  });
  assert.equal(
    result.working_set.receipts.at(-1).stage,
    'PROVIDER_EMBEDDING'
  );
  assert.equal(observedWorkerTimeoutMs, 25);
  assert.equal(providerCalls, 1);
  assert.equal(worker.snapshot().attempts_completed, 1);
  assert.equal(worker.snapshot().cleanup_blocked, false);
  assert.equal(worker.snapshot().stores_created, 1);
  assert.equal(worker.snapshot().stores_removed, 1);
  assert.deepEqual(fs.readdirSync(fixture.leaseRoot), []);
});

test('lease process IPC failure retains control of and terminates its exact child', async () => {
  class SyntheticChild extends EventEmitter {
    constructor() {
      super();
      this.connected = true;
      this.pid = 42;
      this.signals = [];
      this.unrefCalls = 0;
    }

    send() {
      queueMicrotask(() => this.emit(
        'error',
        new Error('synthetic_ipc_failure')
      ));
    }

    kill(signal) {
      this.signals.push(signal);
      return true;
    }

    disconnect() {
      this.connected = false;
    }

    unref() {
      this.unrefCalls += 1;
    }
  }
  const child = new SyntheticChild();
  const result = await runLeaseWorkerProcess({}, {
    workerTimeoutMs: 60_000,
    terminationGraceMs: 10,
    forkProcess() {
      return child;
    }
  });
  assert.deepEqual(child.signals, ['SIGTERM']);
  assert.equal(child.signals.includes('SIGKILL'), false);
  assert.equal(child.unrefCalls, 1);
  assert.equal(result.shutdown_complete, false);
  assert.equal(result.sigterm_sent, true);
});

test('lease process cancellation terminates only its exact child', async () => {
  class SyntheticCancelledChild extends EventEmitter {
    constructor() {
      super();
      this.connected = true;
      this.pid = 43210;
      this.signals = [];
    }

    send() {}

    kill(signal) {
      this.signals.push(signal);
      queueMicrotask(() => this.emit('exit', null));
      return true;
    }

    disconnect() {
      this.connected = false;
    }

    unref() {}
  }
  const child = new SyntheticCancelledChild();
  const cancellation = new AbortController();
  const pending = runLeaseWorkerProcess({}, {
    workerTimeoutMs: 60_000,
    terminationGraceMs: 100,
    signal: cancellation.signal,
    forkProcess() {
      return child;
    }
  });
  cancellation.abort();
  const result = await pending;
  assert.deepEqual(child.signals, ['SIGTERM']);
  assert.equal(result.cancelled, true);
  assert.equal(result.response, null);
  assert.equal(result.shutdown_complete, true);
  assert.equal(result.sigterm_sent, true);
  assert.equal(result.termination_reason, 'cancelled');
});

test('Relay finalization failure forms a signed unavailable response and canonical terminal', async () => {
  const principal = signingIdentity('finalization-principal');
  const edge = signingIdentity('finalization-edge');
  const relay = signingIdentity('finalization-relay');
  const contextRef = `pctx_${'r'.repeat(32)}`;
  const principalAssertion = createPrincipalAssertion({
    issuer: ISSUER,
    audience: AUDIENCE,
    subjectFingerprint: digestObject('finalization-principal'),
    now: NOW,
    nonce: 'principal_nonce_finalization_1',
    signing: signing(principal)
  });
  const request = createRequestEnvelope({
    principalAssertion,
    toolName: 'search_memory',
    toolArguments: {
      project_context_ref: contextRef,
      query: 'finalization query',
      limit: 1
    },
    now: NOW,
    requestId: 'req_finalization_failure_00001',
    nonce: 'request_nonce_finalization_01',
    signing: signing(edge)
  });
  const header = createAttemptHeader({
    attemptRef: `grat_${'r'.repeat(32)}`,
    toolName: 'search_memory',
    requestDigest: digestObject(request),
    contextBindingDigest: digestObject(contextRef),
    now: NOW
  });
  const receipts = [
    createStageReceipt({ header, stage: 'CREATED' })
  ];
  receipts.push(createStageReceipt({
    header,
    receipts,
    stage: 'EDGE_VALIDATED'
  }));
  const processor = createRelayProcessor({
    expectedIssuer: ISSUER,
    expectedAudience: AUDIENCE,
    resolveRequestPublicKey: keyId =>
      keyId === edge.keyId ? edge.publicKey : null,
    resolvePrincipalPublicKey: value =>
      value?.issuer === ISSUER &&
      value?.key_id === principal.keyId
        ? principal.publicKey
        : null,
    requestReplayGuard: new InMemoryReplayGuard({
      clock: () => NOW
    }),
    responseSigning: signing(relay),
    counterMode: COUNTER_MODES.governedLiveReadV1,
    clock: () => NOW,
    governedReadAttemptStageHooks: {
      async RESPONSE_FINALIZATION() {
        throw new Error('synthetic_response_finalization_failure');
      }
    },
    async forwardToUds({ governedReadAttempt, relayReceipt }) {
      let continuation = governedReadAttempt;
      for (const stage of [
        'AUTHORIZED',
        'BRIDGE_DELEGATED',
        'NATIVE_DISPATCHED',
        'SOURCE_PREFLIGHT',
        'PROVIDER_EMBEDDING',
        'HYDRATION',
        'INDEX_RECOVERY',
        'VECTOR_SEARCH',
        'SCOPE_POSTCHECK'
      ]) {
        const counterFacts = {
          BRIDGE_DELEGATED: { fallback: { attempts: 0 } },
          NATIVE_DISPATCHED: {
            native_invocation: { started: 1 },
            primary_memory: {
              write_attempts: 0,
              writes_committed: 0
            }
          },
          PROVIDER_EMBEDDING: {
            provider: { started: 1, succeeded: 1, failed: 0 }
          },
          HYDRATION: {
            derived_transaction: {
              started: 1,
              committed: 1,
              rolled_back: 0
            }
          },
          VECTOR_SEARCH: {
            native_invocation: { succeeded: 1, failed: 0 }
          }
        }[stage] || {};
        continuation = appendGovernedReadAttemptStage(
          continuation,
          { stage, counterFacts }
        );
      }
      return {
        status: 'ok',
        structured_content: {
          status: 'empty',
          result_count: 0,
          results: []
        },
        counters: {
          provider_calls: 1,
          native_invocations: 1,
          local_fallbacks: 0,
          primary_memory_writes: 0,
          derived_index_writes: 1,
          other_durable_mutations: 0,
          unrestricted_native_searches: 0
        },
        receipt_digests: {
          governance: digestObject(relayReceipt),
          context: digestObject(contextRef)
        },
        governed_read_attempt: {
          working_set: continuation,
          evidence_complete: true,
          terminal_failure: null
        }
      };
    }
  });
  const result = await processor.handle(request, {
    governedReadAttempt: { header, receipts }
  });
  assert.equal(result.response.status, 'unavailable');
  assert.equal(
    result.governed_read_attempt_candidate.terminal.reason_code,
    'response_finalization_failed'
  );
  assert.equal(
    result.governed_read_attempt_candidate.receipts.at(-1).stage,
    'RESPONSE_FINALIZATION'
  );
  assert.doesNotThrow(() => validateResponseEnvelope(
    result.response,
    {
      now: NOW,
      resolveResponsePublicKey: keyId =>
        keyId === relay.keyId ? relay.publicKey : null,
      expectedRequest: request,
      counterMode: COUNTER_MODES.governedLiveReadV1
    }
  ));
});

test('Relay enforces public response and terminal outcome agreement', () => {
  const success = {
    outcome: 'success',
    reason_code: null
  };
  const nativeFailure = {
    outcome: 'failure',
    reason_code: 'vector_search_failed'
  };
  const authorizationFailure = {
    outcome: 'failure',
    reason_code: 'governance_denied'
  };
  assert.throws(
    () => validateTerminalResponseAgreement('denied', success),
    { code: 'relay_attempt_response_terminal_mismatch' }
  );
  assert.throws(
    () => validateTerminalResponseAgreement('unavailable', success),
    { code: 'relay_attempt_response_terminal_mismatch' }
  );
  assert.throws(
    () => validateTerminalResponseAgreement('ok', nativeFailure),
    { code: 'relay_attempt_response_terminal_mismatch' }
  );
  assert.throws(
    () => validateTerminalResponseAgreement('denied', nativeFailure),
    { code: 'relay_attempt_response_terminal_mismatch' }
  );
  assert.throws(
    () => validateTerminalResponseAgreement(
      'unavailable',
      authorizationFailure
    ),
    { code: 'relay_attempt_response_terminal_mismatch' }
  );
  assert.doesNotThrow(() =>
    validateTerminalResponseAgreement('unavailable', nativeFailure)
  );
  assert.doesNotThrow(() =>
    validateTerminalResponseAgreement('denied', authorizationFailure)
  );
  assert.doesNotThrow(() =>
    validateTerminalResponseAgreement('ok', success)
  );
});

test('Relay rejects legacy counters that contradict known or unknown terminal facts', () => {
  const counters = {
    provider_calls: 0,
    native_invocations: 1,
    local_fallbacks: 0,
    primary_memory_writes: 0,
    derived_index_writes: 1,
    other_durable_mutations: 0,
    unrestricted_native_searches: 0
  };
  const terminalCounters = {
    provider: { started: 1, succeeded: 1, failed: 0 },
    native_invocation: { started: 1, succeeded: 1, failed: 0 },
    primary_memory: { write_attempts: 0, writes_committed: 0 },
    derived_transaction: {
      started: 1,
      committed: 1,
      rolled_back: 0
    },
    fallback: { attempts: 0 }
  };
  assert.throws(
    () => validateInvocationCounterAgreement(
      counters,
      terminalCounters
    ),
    { code: 'relay_attempt_counter_mismatch' }
  );
  assert.doesNotThrow(() => validateInvocationCounterAgreement(
    { ...counters, provider_calls: 1 },
    terminalCounters
  ));
  assert.throws(
    () => validateInvocationCounterAgreement(
      counters,
      {
        ...terminalCounters,
        provider: {
          started: null,
          succeeded: null,
          failed: null
        }
      }
    ),
    { code: 'relay_attempt_counter_mismatch' }
  );
});
