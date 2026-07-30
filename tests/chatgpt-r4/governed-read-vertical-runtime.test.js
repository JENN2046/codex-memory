'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { EventEmitter } = require('node:events');
const { DatabaseSync } = require('node:sqlite');

const {
  COUNTER_MODES,
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
  createRelayProcessor,
  validateInvocationCounterAgreement
} = require('../../apps/local-recall-relay/relay-processor');
const {
  createGovernedReadAttemptGovernanceRuntime
} = require('../../src/adapters/chatgpt-r4/governed-read-attempt-runtime');
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
  stageHooks
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
        return {
          async stats() {
            return {
              totalVectors: database.prepare(
                'SELECT COUNT(*) AS count FROM chunks'
              ).get().count
            };
          }
        };
      },
      async search(allowedDiaryNames) {
        searchCalls += 1;
        const row = database.prepare(`
          SELECT f.diary_name AS diaryName,
                 f.path AS fullPath,
                 c.content
          FROM chunks c
          INNER JOIN files f ON f.id = c.file_id
          WHERE f.diary_name = ?
          LIMIT 1
        `).get(allowedDiaryNames[0]);
        return row
          ? [{
              diaryName: row.diaryName,
              fullPath: row.fullPath,
              sourceFile: row.fullPath,
              content: row.content,
              score: 0.75,
              matchedTags: []
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
          failedStage === 'SCOPE_POSTCHECK'
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
      runtimeBindingDigest
    })
  });

  const governance = createGovernedReadAttemptGovernanceRuntime({
    async authorizeRead({ request }) {
      assert.equal(request.tool_request.name, 'search_memory');
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
      const projected = bridgeResult.result?.results?.[0];
      return {
        status: failed ? 'unavailable' : 'ok',
        structured_content: failed
          ? {
              status: 'unavailable',
              result_count: 0,
              results: []
            }
          : {
              status: 'found',
              result_count: 1,
              results: [{
                result_ref:
                  `mref_${digestObject(request.request_id).slice(7, 31)}`,
                summary:
                  projected?.memoryContextProjection?.statement ||
                  'bounded synthetic result',
                relevance: projected?.score || 0.75
              }]
            },
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
    governanceRuntime: governance
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
    cancelPollMs: 1
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

test('lease process timeout signals only its exact child with SIGTERM', async () => {
  class SyntheticChild extends EventEmitter {
    constructor() {
      super();
      this.connected = true;
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

test('Relay rejects legacy counters that contradict known terminal facts', () => {
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
  assert.doesNotThrow(() => validateInvocationCounterAgreement(
    counters,
    {
      ...terminalCounters,
      provider: {
        started: null,
        succeeded: null,
        failed: null
      }
    }
  ));
});
