'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { fork } = require('node:child_process');

const {
  aggregateAttemptCounters,
  appendGovernedReadAttemptStage,
  failureRegistryEntry,
  isGovernedReadAttemptWorkingSetExtension,
  validateAttemptCounterRelationships,
  validateGovernedReadAttemptWorkingSet
} = require('../../../packages/chatgpt-r4-contracts');

const DEFAULT_WORKER_TIMEOUT_MS = 20_000;
const DEFAULT_TERMINATION_GRACE_MS = 2_000;
const DEFAULT_PROVIDER_TIMEOUT_MS = 15_000;
const MAX_QUERY_CHARACTERS = 1_000;
const MAX_VECTOR_DIMENSION = 65_536;
const CHILD_FAILURE_STAGES = Object.freeze([
  'HYDRATION',
  'INDEX_RECOVERY',
  'VECTOR_SEARCH',
  'SCOPE_POSTCHECK'
]);
const CHILD_TERMINATION_REASONS = Object.freeze([
  'cancelled',
  'child_error',
  'ipc_send_failure',
  'timeout'
]);
const CONTEXT_CLASSIFICATIONS = Object.freeze([
  'must_know',
  'recent_decisions',
  'current_state',
  'blockers',
  'risks',
  'forbidden_assumptions'
]);
const CONTEXT_FRESHNESS_BUCKETS = Object.freeze([
  'recent',
  'established',
  'stale_candidate',
  'unknown'
]);
const CONTEXT_REASON_CODES = Object.freeze([
  'title_match',
  'tag_match',
  'content_match',
  'evidence_match',
  'stale_candidate',
  'semantic_match'
]);
const CHILD_WORKER_PATH = path.join(
  __dirname,
  'governed-read-lease-worker-child.js'
);

function codedError(code) {
  return Object.assign(new Error(code), { code });
}

function validatePositiveInteger(value, minimum, maximum, code) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw codedError(code);
  }
  return value;
}

function validateAbortSignal(signal) {
  if (signal === undefined) return;
  if (!signal ||
      typeof signal !== 'object' ||
      typeof signal.aborted !== 'boolean' ||
      typeof signal.addEventListener !== 'function' ||
      typeof signal.removeEventListener !== 'function') {
    throw codedError('lease_worker_abort_signal_invalid');
  }
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw codedError('lease_worker_cancelled');
}

function validateOwnerOnlyLeaseRoot(leaseRoot, fsModule = fs) {
  if (typeof leaseRoot !== 'string' ||
      !path.isAbsolute(leaseRoot) ||
      path.resolve(leaseRoot) !== leaseRoot ||
      leaseRoot.includes('\0')) {
    throw codedError('lease_worker_root_invalid');
  }
  let stat;
  let resolved;
  try {
    stat = fsModule.lstatSync(leaseRoot);
    resolved = fsModule.realpathSync(leaseRoot);
  } catch {
    throw codedError('lease_worker_root_invalid');
  }
  const currentUid = typeof process.getuid === 'function'
    ? process.getuid()
    : null;
  if (!stat.isDirectory() ||
      stat.isSymbolicLink() ||
      resolved !== leaseRoot ||
      (stat.mode & 0o077) !== 0 ||
      (currentUid !== null && stat.uid !== currentUid)) {
    throw codedError('lease_worker_root_security_invalid');
  }
  return leaseRoot;
}

function normalizeQuery(value) {
  if (typeof value !== 'string' ||
      value.length < 1 ||
      value.length > MAX_QUERY_CHARACTERS ||
      value.trim() !== value) {
    throw codedError('lease_worker_query_invalid');
  }
  return value;
}

function normalizeVector(value, dimension) {
  const vector = ArrayBuffer.isView(value)
    ? Array.from(value)
    : value;
  if (!Array.isArray(vector) ||
      vector.length !== dimension ||
      vector.length < 1 ||
      vector.length > MAX_VECTOR_DIMENSION ||
      vector.some(item => typeof item !== 'number' ||
        !Number.isFinite(item))) {
    throw codedError('lease_worker_provider_vector_invalid');
  }
  return Object.freeze([...vector]);
}

function normalizeLimit(value) {
  return validatePositiveInteger(
    value === undefined ? 5 : value,
    1,
    5,
    'lease_worker_limit_invalid'
  );
}

function exactKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index]);
}

function countersComplete(workingSet) {
  const counters = aggregateAttemptCounters(workingSet.receipts);
  validateAttemptCounterRelationships(counters);
  return Object.values(counters).every(group =>
    Object.values(group).every(Number.isSafeInteger)
  );
}

function failedContinuation(
  workingSet,
  stage,
  reasonCode,
  counterFacts
) {
  const failed = appendGovernedReadAttemptStage(workingSet, {
    stage,
    outcome: 'failed',
    reasonCode,
    counterFacts
  });
  return Object.freeze({
    accepted: false,
    working_set: failed,
    evidence_complete: countersComplete(failed),
    result: null,
    terminal_failure: null,
    cleanup_complete: true
  });
}

function shutdownFailure(workingSet) {
  return Object.freeze({
    accepted: false,
    working_set: workingSet,
    evidence_complete: false,
    result: null,
    terminal_failure: Object.freeze({
      reason_code: 'worker_shutdown_incomplete',
      failure_origin: 'lease_worker'
    }),
    cleanup_complete: false
  });
}

async function invokeHook(stageHooks, stage, value) {
  const hook = stageHooks?.[stage];
  if (hook === undefined) return;
  if (typeof hook !== 'function') {
    throw codedError('lease_worker_stage_hook_invalid');
  }
  await hook(value);
}

function sourceFailureReason(error) {
  const reasonCode = error?.reasonCode;
  if (typeof reasonCode !== 'string') return 'source_preflight_failed';
  try {
    const entry = failureRegistryEntry(reasonCode);
    return entry.stage === 'SOURCE_PREFLIGHT' &&
      entry.origin === 'persistent_shim'
      ? reasonCode
      : 'source_preflight_failed';
  } catch {
    return 'source_preflight_failed';
  }
}

function validateLowDisclosureProjection(value) {
  if (!exactKeys(value, [
    'classification',
    'conflict',
    'freshness',
    'lowDisclosure',
    'projectionVersion',
    'reasonCodes',
    'statement'
  ]) ||
      value.projectionVersion !== 1 ||
      value.lowDisclosure !== true ||
      typeof value.statement !== 'string' ||
      value.statement.length < 1 ||
      value.statement.length > 420 ||
      !CONTEXT_CLASSIFICATIONS.includes(value.classification) ||
      !CONTEXT_FRESHNESS_BUCKETS.includes(value.freshness) ||
      !Array.isArray(value.reasonCodes) ||
      value.reasonCodes.length < 1 ||
      value.reasonCodes.length > CONTEXT_REASON_CODES.length ||
      new Set(value.reasonCodes).size !== value.reasonCodes.length ||
      value.reasonCodes.some(code =>
        !CONTEXT_REASON_CODES.includes(code)
      ) ||
      typeof value.conflict !== 'boolean') {
    throw codedError('lease_worker_response_invalid');
  }
}

function validateProjectedResult(value) {
  if (!exactKeys(value, [
    'provider_response_disclosed',
    'raw_memory_content_disclosed',
    'raw_vector_disclosed',
    'result_count',
    'results',
    'source_path_disclosed'
  ]) ||
      value.provider_response_disclosed !== false ||
      value.raw_memory_content_disclosed !== false ||
      value.raw_vector_disclosed !== false ||
      value.source_path_disclosed !== false ||
      !Number.isSafeInteger(value.result_count) ||
      value.result_count < 0 ||
      value.result_count > 5 ||
      !Array.isArray(value.results) ||
      value.results.length !== value.result_count) {
    throw codedError('lease_worker_response_invalid');
  }
  for (const item of value.results) {
    const expectedKeys = [
      'memoryContextProjection',
      'scorePresent',
      'sourceFilePresent',
      'sourceKinds',
      'tagCountBucket',
      ...(item?.scorePresent === true ? ['score'] : [])
    ];
    if (!exactKeys(item, expectedKeys) ||
        typeof item.scorePresent !== 'boolean' ||
        typeof item.sourceFilePresent !== 'boolean' ||
        !Array.isArray(item.sourceKinds) ||
        item.sourceKinds.length !== 1 ||
        item.sourceKinds[0] !== 'vcp_native' ||
        !['zero', 'bounded', 'over_budget', 'unknown']
          .includes(item.tagCountBucket) ||
        (item.scorePresent === true && (
          typeof item.score !== 'number' ||
          !Number.isFinite(item.score) ||
          item.score < 0 ||
          item.score > 1
        ))) {
      throw codedError('lease_worker_response_invalid');
    }
    validateLowDisclosureProjection(item.memoryContextProjection);
  }
}

function validateWorkerResponse(response, expectedWorkingSet) {
  if (!exactKeys(response, [
    'kind',
    'result',
    'schema_version',
    'shutdown_complete'
  ]) ||
      response.kind !== 'governed_read_lease_result' ||
      response.schema_version !== 1 ||
      typeof response.shutdown_complete !== 'boolean') {
    throw codedError('lease_worker_response_invalid');
  }
  if (response.result !== null) {
    if (!exactKeys(response.result, [
      'accepted',
      'evidence_complete',
      'result',
      'working_set'
    ]) ||
        typeof response.result.accepted !== 'boolean' ||
        typeof response.result.evidence_complete !== 'boolean' ||
        !isGovernedReadAttemptWorkingSetExtension(
          expectedWorkingSet,
          response.result.working_set
        ) ||
        response.result.evidence_complete !==
          countersComplete(response.result.working_set)) {
      throw codedError('lease_worker_response_invalid');
    }
    const lastReceipt = response.result.working_set.receipts.at(-1);
    if (response.result.accepted === true) {
      if (lastReceipt?.stage !== 'SCOPE_POSTCHECK' ||
          lastReceipt.outcome !== 'completed' ||
          response.result.evidence_complete !== true) {
        throw codedError('lease_worker_response_invalid');
      }
      validateProjectedResult(response.result.result);
    } else if (response.result.result !== null ||
        lastReceipt?.outcome !== 'failed' ||
        !CHILD_FAILURE_STAGES.includes(lastReceipt?.stage)) {
      throw codedError('lease_worker_response_invalid');
    }
  }
  return response;
}

function runLeaseWorkerProcess(task, {
  childWorkerPath = CHILD_WORKER_PATH,
  workerTimeoutMs = DEFAULT_WORKER_TIMEOUT_MS,
  terminationGraceMs = DEFAULT_TERMINATION_GRACE_MS,
  forkProcess = fork,
  signal
} = {}) {
  validatePositiveInteger(
    workerTimeoutMs,
    10,
    60_000,
    'lease_worker_timeout_invalid'
  );
  validatePositiveInteger(
    terminationGraceMs,
    10,
    10_000,
    'lease_worker_termination_grace_invalid'
  );
  validateAbortSignal(signal);
  return new Promise(resolve => {
    let child;
    let message = null;
    let exited = false;
    let settled = false;
    let timeout = null;
    let termination = null;
    let sigtermSent = false;
    let terminationStarted = false;
    let terminationReason = null;
    let cancelled = false;

    function finish(value) {
      if (settled) return;
      settled = true;
      if (timeout !== null) clearTimeout(timeout);
      if (termination !== null) clearTimeout(termination);
      signal?.removeEventListener('abort', onAbort);
      resolve(value);
    }

    function childHasStarted() {
      return Number.isSafeInteger(child?.pid) && child.pid > 0;
    }

    function finishUnstartedChild({
      cancelledByCaller = false
    } = {}) {
      cancelled = cancelled || cancelledByCaller;
      finish({
        response: null,
        shutdown_complete: true,
        sigterm_sent: false,
        cancelled,
        child_started: false
      });
    }

    function maybeFinish(code) {
      if (!exited) return;
      if (!childHasStarted()) {
        finishUnstartedChild();
        return;
      }
      if (terminationStarted) {
        finish({
          response: null,
          shutdown_complete: true,
          sigterm_sent: sigtermSent,
          cancelled,
          child_started: true,
          termination_reason: terminationReason
        });
        return;
      }
      if (message && code === 0) {
        finish({
          response: message,
          shutdown_complete: message.shutdown_complete === true,
          sigterm_sent: sigtermSent,
          cancelled,
          child_started: true
        });
        return;
      }
      finish({
        response: message,
        shutdown_complete: false,
        sigterm_sent: sigtermSent,
        cancelled,
        child_started: true
      });
    }

    function beginTermination({
      cancelledByCaller = false,
      reason = 'child_error'
    } = {}) {
      if (settled || exited || terminationStarted) return;
      cancelled = cancelled || cancelledByCaller;
      if (!childHasStarted()) {
        finishUnstartedChild();
        return;
      }
      terminationStarted = true;
      terminationReason = cancelledByCaller ? 'cancelled' : reason;
      let signalSent = false;
      try {
        signalSent = child.kill('SIGTERM') === true;
      } catch {}
      sigtermSent = sigtermSent || signalSent;
      termination = setTimeout(() => {
        if (settled || exited) return;
        try {
          if (child.connected) child.disconnect();
        } catch {}
        child.unref();
        finish({
          response: message,
          shutdown_complete: false,
          sigterm_sent: sigtermSent,
          cancelled,
          child_started: true,
          termination_reason: terminationReason
        });
      }, terminationGraceMs);
    }

    function onAbort() {
      beginTermination({
        cancelledByCaller: true,
        reason: 'cancelled'
      });
    }

    if (signal?.aborted) {
      finish({
        response: null,
        shutdown_complete: true,
        sigterm_sent: false,
        cancelled: true,
        child_started: false
      });
      return;
    }

    try {
      child = forkProcess(childWorkerPath, [], {
        env: {
          LANG: 'C.UTF-8',
          LC_ALL: 'C.UTF-8',
          TZ: 'UTC'
        },
        execArgv: [],
        serialization: 'advanced',
        stdio: ['ignore', 'ignore', 'ignore', 'ipc']
      });
    } catch {
      finish({
        response: null,
        shutdown_complete: true,
        sigterm_sent: false,
        cancelled: false,
        child_started: false
      });
      return;
    }

    child.once('message', value => {
      message = value;
    });
    child.once('error', () => {
      beginTermination({ reason: 'child_error' });
    });
    child.once('exit', code => {
      exited = true;
      maybeFinish(code);
    });
    timeout = setTimeout(() => {
      beginTermination({ reason: 'timeout' });
    }, workerTimeoutMs);
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) onAbort();

    try {
      child.send({
        schema_version: 1,
        kind: 'governed_read_lease_task',
        task
      });
    } catch {
      beginTermination({ reason: 'ipc_send_failure' });
    }
  });
}

function createAttemptStore(leaseRoot, fsModule) {
  let attemptRoot = null;
  try {
    attemptRoot = fsModule.mkdtempSync(
      path.join(leaseRoot, 'governed-read-')
    );
    const derivedStore = path.join(attemptRoot, 'derived-store');
    fsModule.mkdirSync(derivedStore, { mode: 0o700 });
    return Object.freeze({ attemptRoot, derivedStore });
  } catch {
    if (attemptRoot !== null) {
      try {
        removeAttemptStore(leaseRoot, attemptRoot, fsModule);
      } catch {
        throw codedError('lease_worker_store_cleanup_incomplete');
      }
    }
    throw codedError('lease_worker_store_creation_failed');
  }
}

function removeAttemptStore(leaseRoot, attemptRoot, fsModule) {
  const relation = path.relative(leaseRoot, attemptRoot);
  if (!relation ||
      relation.startsWith('..') ||
      path.isAbsolute(relation) ||
      path.dirname(relation) !== '.' ||
      !relation.startsWith('governed-read-')) {
    throw codedError('lease_worker_cleanup_target_invalid');
  }
  const stat = fsModule.lstatSync(attemptRoot);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw codedError('lease_worker_cleanup_target_invalid');
  }
  fsModule.rmSync(attemptRoot, {
    recursive: true,
    force: false,
    maxRetries: 0
  });
}

function createGovernedReadLeaseWorker({
  sourceProjection,
  providerWrapper,
  dimension,
  leaseRoot,
  vcpCodeRoot,
  sourceRuntimeRoot,
  sourceKnowledgeBaseStorePath,
  knowledgeBaseRootPath,
  workerRunner = runLeaseWorkerProcess,
  workerTimeoutMs = DEFAULT_WORKER_TIMEOUT_MS,
  terminationGraceMs = DEFAULT_TERMINATION_GRACE_MS,
  providerTimeoutMs = DEFAULT_PROVIDER_TIMEOUT_MS,
  fsModule = fs,
  stageHooks,
  clock = () => new Date()
} = {}) {
  if (!sourceProjection ||
      typeof sourceProjection.preflight !== 'function' ||
      typeof providerWrapper !== 'function' ||
      typeof workerRunner !== 'function' ||
      typeof clock !== 'function') {
    throw codedError('lease_worker_runtime_invalid');
  }
  validatePositiveInteger(
    dimension,
    1,
    MAX_VECTOR_DIMENSION,
    'lease_worker_dimension_invalid'
  );
  validatePositiveInteger(
    providerTimeoutMs,
    10,
    60_000,
    'lease_worker_provider_timeout_invalid'
  );
  const root = validateOwnerOnlyLeaseRoot(leaseRoot, fsModule);
  for (const value of [
    vcpCodeRoot,
    sourceRuntimeRoot,
    sourceKnowledgeBaseStorePath,
    knowledgeBaseRootPath
  ]) {
    if (typeof value !== 'string' ||
        !path.isAbsolute(value) ||
        path.resolve(value) !== value) {
      throw codedError('lease_worker_runtime_path_invalid');
    }
  }

  let active = false;
  let cleanupBlocked = false;
  let attemptsStarted = 0;
  let attemptsCompleted = 0;
  let providerInvocations = 0;
  let providerInFlight = null;
  let nativeInvocations = 0;
  let storesCreated = 0;
  let storesRemoved = 0;
  let sigtermCount = 0;

  function nowMs() {
    const value = clock();
    const milliseconds = value instanceof Date
      ? value.getTime()
      : new Date(value).getTime();
    if (!Number.isFinite(milliseconds)) {
      throw codedError('lease_worker_clock_invalid');
    }
    return milliseconds;
  }

  async function execute({
    workingSet,
    authorization,
    query,
    limit,
    signal
  } = {}) {
    validateAbortSignal(signal);
    throwIfAborted(signal);
    validateGovernedReadAttemptWorkingSet(workingSet);
    const lastReceipt = workingSet.receipts.at(-1);
    if (lastReceipt?.stage !== 'BRIDGE_DELEGATED' ||
        lastReceipt.outcome !== 'completed') {
      throw codedError('lease_worker_dispatch_stage_invalid');
    }
    const selectedQuery = normalizeQuery(query);
    const selectedLimit = normalizeLimit(limit);
    if (authorization?.accepted !== true ||
        !Array.isArray(authorization.allowedDiaryNames) ||
        authorization.allowedDiaryNames.length < 1 ||
        authorization.allowedDiaryCount !==
          authorization.allowedDiaryNames.length) {
      throw codedError('lease_worker_authorization_invalid');
    }
    if (active || cleanupBlocked || providerInFlight !== null) {
      return failedContinuation(
        workingSet,
        'NATIVE_DISPATCHED',
        'native_attempt_busy',
        {
          provider: { started: 0, succeeded: 0, failed: 0 },
          native_invocation: { started: 0, succeeded: 0, failed: 0 },
          primary_memory: {
            write_attempts: 0,
            writes_committed: 0
          }
        }
      );
    }

    active = true;
    attemptsStarted += 1;
    let attemptStore = null;
    let current = workingSet;
    try {
      try {
        await invokeHook(stageHooks, 'NATIVE_DISPATCHED', {
          attempt_ref: current.header.attempt_ref,
          signal
        });
        throwIfAborted(signal);
      } catch {
        return failedContinuation(
          current,
          'NATIVE_DISPATCHED',
          'native_dispatch_failed',
          {
            provider: { started: 0, succeeded: 0, failed: 0 },
            native_invocation: {
              started: 0,
              succeeded: 0,
              failed: 0
            },
            primary_memory: {
              write_attempts: 0,
              writes_committed: 0
            }
          }
        );
      }
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
      nativeInvocations += 1;
      let projectionPlan;
      try {
        await invokeHook(stageHooks, 'SOURCE_PREFLIGHT', {
          attempt_ref: current.header.attempt_ref,
          signal
        });
        throwIfAborted(signal);
        projectionPlan = sourceProjection.preflight({
          allowedDiaryNames: authorization.allowedDiaryNames,
          dimension
        });
        current = appendGovernedReadAttemptStage(current, {
          stage: 'SOURCE_PREFLIGHT',
          counterFacts: {
            primary_memory: {
              write_attempts: 0,
              writes_committed: 0
            }
          }
        });
      } catch (error) {
        return failedContinuation(
          current,
          'SOURCE_PREFLIGHT',
          sourceFailureReason(error),
          {
            provider: { started: 0, succeeded: 0, failed: 0 },
            native_invocation: { failed: 1 },
            primary_memory: {
              write_attempts: 0,
              writes_committed: 0
            }
          }
        );
      }

      let vector;
      let providerStarted = false;
      try {
        await invokeHook(stageHooks, 'PROVIDER_EMBEDDING', {
          attempt_ref: current.header.attempt_ref
        });
        const providerDeadlineMs =
          Date.parse(current.header.deadline_at);
        const remainingProviderMs = providerDeadlineMs - nowMs();
        if (remainingProviderMs <= 0) {
          return failedContinuation(
            current,
            'PROVIDER_EMBEDDING',
            'provider_embedding_failed',
            {
              provider: {
                started: 0,
                succeeded: 0,
                failed: 0
              }
            }
          );
        }
        providerInvocations += 1;
        providerStarted = true;
        const providerAbortController = new AbortController();
        let rejectProviderCancellation = null;
        const providerCancellation = signal
          ? new Promise((_, rejectCancellation) => {
              rejectProviderCancellation = rejectCancellation;
            })
          : null;
        const onProviderCancellation = () => {
          const cancellationError =
            codedError('lease_worker_cancelled');
          providerAbortController.abort(cancellationError);
          rejectProviderCancellation?.(cancellationError);
        };
        signal?.addEventListener(
          'abort',
          onProviderCancellation,
          { once: true }
        );
        if (signal?.aborted) onProviderCancellation();
        const providerTask = Promise.resolve().then(() =>
          providerWrapper({
            query: selectedQuery,
            dimension,
            signal: providerAbortController.signal,
            deadlineAt: current.header.deadline_at
          })
        );
        providerInFlight = providerTask;
        providerTask.then(
          () => {
            if (providerInFlight === providerTask) {
              providerInFlight = null;
            }
          },
          () => {
            if (providerInFlight === providerTask) {
              providerInFlight = null;
            }
          }
        );
        let providerTimer;
        const providerTimeout = new Promise((_, rejectProvider) => {
          providerTimer = setTimeout(() => {
            const timeoutError =
              codedError('lease_worker_provider_timeout');
            providerAbortController.abort(timeoutError);
            rejectProvider(timeoutError);
          }, Math.min(providerTimeoutMs, remainingProviderMs));
        });
        let providerResult;
        try {
          providerResult = await Promise.race([
            providerTask,
            providerTimeout,
            ...(providerCancellation ? [providerCancellation] : [])
          ]);
        } finally {
          clearTimeout(providerTimer);
          signal?.removeEventListener(
            'abort',
            onProviderCancellation
          );
        }
        throwIfAborted(signal);
        vector = normalizeVector(
          providerResult?.vector ?? providerResult,
          dimension
        );
        if (providerDeadlineMs <= nowMs()) {
          throw codedError('lease_worker_provider_deadline_exceeded');
        }
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
      } catch {
        return failedContinuation(
          current,
          'PROVIDER_EMBEDDING',
          'provider_embedding_failed',
          {
            provider: {
              started: providerStarted ? 1 : 0,
              succeeded: 0,
              failed: providerStarted ? 1 : 0
            }
          }
        );
      }

      throwIfAborted(signal);
      try {
        attemptStore = createAttemptStore(root, fsModule);
        storesCreated += 1;
      } catch (error) {
        if (error?.code ===
            'lease_worker_store_cleanup_incomplete') {
          cleanupBlocked = true;
          return shutdownFailure(current);
        }
        throw error;
      }

      let workerExecution;
      try {
        workerExecution = await workerRunner({
          authorization: {
            accepted: true,
            allowedDiaryNames: [
              ...authorization.allowedDiaryNames
            ],
            allowedDiaryCount:
              authorization.allowedDiaryNames.length
          },
          derived_store_path: attemptStore.derivedStore,
          knowledge_base_root_path: knowledgeBaseRootPath,
          projection_plan: structuredClone(projectionPlan),
          query_limit: selectedLimit,
          query_vector: [...vector],
          source_knowledge_base_store_path:
            sourceKnowledgeBaseStorePath,
          source_runtime_root: sourceRuntimeRoot,
          vcp_code_root: vcpCodeRoot,
          working_set: structuredClone(current)
        }, {
          workerTimeoutMs,
          terminationGraceMs,
          signal
        });
      } catch {
        workerExecution = {
          response: null,
          shutdown_complete: false,
          sigterm_sent: false
        };
      }
      if (workerExecution?.sigterm_sent === true) sigtermCount += 1;
      if (workerExecution?.cancelled === true || signal?.aborted) {
        if (workerExecution?.shutdown_complete !== true) {
          cleanupBlocked = true;
          return shutdownFailure(current);
        }
        try {
          removeAttemptStore(root, attemptStore.attemptRoot, fsModule);
          storesRemoved += 1;
          attemptStore = null;
        } catch {
          cleanupBlocked = true;
          return shutdownFailure(current);
        }
        throw codedError('lease_worker_cancelled');
      }
      if (workerExecution?.child_started === false) {
        if (workerExecution?.shutdown_complete !== true ||
            workerExecution?.response !== null ||
            workerExecution?.sigterm_sent !== false) {
          cleanupBlocked = true;
          return shutdownFailure(current);
        }
        try {
          removeAttemptStore(root, attemptStore.attemptRoot, fsModule);
          storesRemoved += 1;
          attemptStore = null;
        } catch {
          cleanupBlocked = true;
          return shutdownFailure(current);
        }
        attemptsCompleted += 1;
        return failedContinuation(
          current,
          'HYDRATION',
          'hydration_failed',
          {
            native_invocation: {
              succeeded: 0,
              failed: 1
            },
            derived_transaction: {
              started: 0,
              committed: 0,
              rolled_back: 0
            }
          }
        );
      }
      const terminationReason =
        workerExecution?.termination_reason;
      if (terminationReason !== undefined) {
        if (!CHILD_TERMINATION_REASONS.includes(
          terminationReason
        ) ||
            workerExecution?.shutdown_complete !== true ||
            workerExecution?.response !== null) {
          cleanupBlocked = true;
          return shutdownFailure(current);
        }
        try {
          removeAttemptStore(root, attemptStore.attemptRoot, fsModule);
          storesRemoved += 1;
          attemptStore = null;
        } catch {
          cleanupBlocked = true;
          return shutdownFailure(current);
        }
        attemptsCompleted += 1;
        return failedContinuation(
          current,
          'HYDRATION',
          'hydration_failed',
          {
            native_invocation: {
              succeeded: 0,
              failed: 1
            }
          }
        );
      }
      let response = null;
      try {
        if (workerExecution?.response) {
          response = validateWorkerResponse(
            workerExecution.response,
            current
          );
        }
      } catch {
        response = null;
      }
      if (workerExecution?.shutdown_complete !== true ||
          response?.shutdown_complete !== true ||
          response?.result === null) {
        cleanupBlocked = true;
        return shutdownFailure(
          response?.result?.working_set || current
        );
      }
      current = response.result.working_set;
      try {
        removeAttemptStore(root, attemptStore.attemptRoot, fsModule);
        storesRemoved += 1;
        attemptStore = null;
      } catch {
        cleanupBlocked = true;
        return shutdownFailure(current);
      }
      attemptsCompleted += 1;
      return Object.freeze({
        ...response.result,
        terminal_failure: null,
        cleanup_complete: true
      });
    } finally {
      active = false;
    }
  }

  function snapshot() {
    return Object.freeze({
      component: 'governed_read_lease_worker',
      active_attempts: active ? 1 : 0,
      max_active_attempts: 1,
      cleanup_blocked: cleanupBlocked,
      attempts_started: attemptsStarted,
      attempts_completed: attemptsCompleted,
      provider_invocations: providerInvocations,
      provider_calls_in_flight: providerInFlight === null ? 0 : 1,
      native_invocations: nativeInvocations,
      stores_created: storesCreated,
      stores_removed: storesRemoved,
      sigterm_count: sigtermCount,
      sigkill_count: 0,
      unknown_processes_signalled: 0,
      provider_authority_in_child: false,
      raw_vectors_retained: false,
      raw_memory_retained: false,
      source_paths_retained_in_projection: false
    });
  }

  return Object.freeze({
    execute,
    snapshot
  });
}

module.exports = {
  CHILD_WORKER_PATH,
  DEFAULT_PROVIDER_TIMEOUT_MS,
  DEFAULT_TERMINATION_GRACE_MS,
  DEFAULT_WORKER_TIMEOUT_MS,
  createGovernedReadLeaseWorker,
  normalizeVector,
  runLeaseWorkerProcess,
  validateAbortSignal,
  validateOwnerOnlyLeaseRoot,
  validateWorkerResponse
};
