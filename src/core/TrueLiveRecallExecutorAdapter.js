'use strict';

const {
  EXACT_QUERY_COUNT,
  PROOF_MODE,
  ZERO_SIDE_EFFECT_COUNTERS,
  createProofBoundaryError
} = require('./TrueLiveRecallReadonlyProofRunner');

const EXPECTED_SOURCE = 'internal-true-live-recall-readonly-proof-runner';

const FORBIDDEN_RESULT_KEYS = new Set([
  'content',
  'text',
  'title',
  'snippet',
  'rawText',
  'formattedWindow',
  'rawMemoryText',
  'chatHistory',
  'jsonlLine',
  'sourceFile',
  'fullPath',
  'relativePath',
  'filePath'
]);

function createZeroCounters() {
  return Object.fromEntries(
    Object.keys(ZERO_SIDE_EFFECT_COUNTERS).map(key => [key, 0])
  );
}

function boundaryViolation(message, reason, details = {}) {
  return createProofBoundaryError(message, {
    reason,
    ...details
  });
}

function assertProofRequest(request = {}) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    throw boundaryViolation('true live recall executor adapter requires an object request', 'executor_adapter_request_missing');
  }

  if (request.source !== EXPECTED_SOURCE) {
    throw boundaryViolation('true live recall executor adapter requires the internal runner source', 'executor_adapter_source_mismatch', {
      expected: EXPECTED_SOURCE,
      actual: request.source || null
    });
  }

  const proofContext = request.proofContext;
  if (!proofContext || typeof proofContext !== 'object' || Array.isArray(proofContext)) {
    throw boundaryViolation('true live recall executor adapter requires sealed proof context', 'executor_adapter_proof_context_missing');
  }

  const requiredFields = {
    mode: PROOF_MODE,
    exactQueryCount: EXACT_QUERY_COUNT,
    readOnly: true,
    noProvider: true,
    noAudit: true,
    sanitizedOutput: true,
    includeContent: false
  };

  for (const [key, expected] of Object.entries(requiredFields)) {
    if (proofContext[key] !== expected) {
      throw boundaryViolation('true live recall executor adapter proof context mismatch', 'executor_adapter_proof_context_mismatch', {
        key,
        expected,
        actual: proofContext[key]
      });
    }
  }

  const requestFlags = {
    readOnly: true,
    noProvider: true,
    noAudit: true,
    sanitizedOutput: true,
    includeContent: false
  };

  for (const [key, expected] of Object.entries(requestFlags)) {
    if (request[key] !== expected) {
      throw boundaryViolation('true live recall executor adapter request flag mismatch', 'executor_adapter_request_flag_mismatch', {
        key,
        expected,
        actual: request[key]
      });
    }
  }

  if (
    request.precisionPolicyContext !== undefined
    && request.precisionPolicyContext !== null
    && (
      typeof request.precisionPolicyContext !== 'object'
      || Array.isArray(request.precisionPolicyContext)
    )
  ) {
    throw boundaryViolation('true live recall executor adapter precision policy context must be an object', 'executor_adapter_precision_policy_context_invalid');
  }
}

function assertApp(app) {
  if (!app || typeof app !== 'object' || typeof app.callTool !== 'function') {
    throw new TypeError('app.callTool is required');
  }
}

function createSideEffectBlocker(counters, counterKey, reason, target) {
  return function blockedSideEffect() {
    counters[counterKey] += 1;
    throw boundaryViolation('true live recall executor adapter blocked forbidden side effect', reason, {
      counterKey,
      target,
      sideEffectCounters: { ...counters }
    });
  };
}

function wrapMethod(restorers, object, methodName, replacementFactory) {
  if (!object || typeof object[methodName] !== 'function') return;
  const original = object[methodName];
  object[methodName] = replacementFactory(original);
  restorers.push(() => {
    object[methodName] = original;
  });
}

function installInstrumentation(app, counters) {
  const restorers = [];

  wrapMethod(restorers, app.recall?.externalEmbeddingAdapter, 'embedBatch', () =>
    createSideEffectBlocker(counters, 'providerCalls', 'executor_adapter_provider_call_blocked', 'externalEmbeddingAdapter.embedBatch'));
  wrapMethod(restorers, app.recall?.externalRerankAdapter, 'rerank', () =>
    createSideEffectBlocker(counters, 'providerCalls', 'executor_adapter_provider_call_blocked', 'externalRerankAdapter.rerank'));

  wrapMethod(restorers, app.services?.writeService, 'record', () =>
    createSideEffectBlocker(counters, 'durableMemoryWrites', 'executor_adapter_durable_memory_write_blocked', 'writeService.record'));

  wrapMethod(restorers, app.recall?.recallAuditService, 'record', () =>
    createSideEffectBlocker(counters, 'durableAuditWrites', 'executor_adapter_audit_write_blocked', 'recallAuditService.record'));
  wrapMethod(restorers, app.recall?.recallAuditService, 'recordReadPolicySummary', () =>
    createSideEffectBlocker(counters, 'durableAuditWrites', 'executor_adapter_audit_write_blocked', 'recallAuditService.recordReadPolicySummary'));
  wrapMethod(restorers, app.stores?.auditLogStore, 'appendWriteAudit', () =>
    createSideEffectBlocker(counters, 'durableAuditWrites', 'executor_adapter_audit_write_blocked', 'auditLogStore.appendWriteAudit'));
  wrapMethod(restorers, app.stores?.auditLogStore, 'appendRecallAudit', () =>
    createSideEffectBlocker(counters, 'durableAuditWrites', 'executor_adapter_audit_write_blocked', 'auditLogStore.appendRecallAudit'));

  wrapMethod(restorers, app.stores?.candidateCacheStore, 'set', () =>
    createSideEffectBlocker(counters, 'candidateCacheWrites', 'executor_adapter_candidate_cache_write_blocked', 'candidateCacheStore.set'));
  for (const methodName of ['flush', 'clearAll', 'clearCurrentFingerprint']) {
    wrapMethod(restorers, app.stores?.candidateCacheStore, methodName, () =>
      createSideEffectBlocker(counters, 'candidateCacheFlushes', 'executor_adapter_candidate_cache_flush_blocked', `candidateCacheStore.${methodName}`));
  }

  wrapMethod(restorers, app.recall?.knowledgeBaseSyncService, 'syncTarget', () =>
    createSideEffectBlocker(counters, 'syncCalls', 'executor_adapter_sync_call_blocked', 'knowledgeBaseSyncService.syncTarget'));

  wrapMethod(restorers, app.stores?.vectorStore, 'flush', () =>
    createSideEffectBlocker(counters, 'vectorFlushes', 'executor_adapter_vector_flush_blocked', 'vectorStore.flush'));

  wrapMethod(restorers, app.stores?.vectorStore, 'getSingleEmbeddingCached', original => async function guardedEmbeddingCache(text, options = {}) {
    if (options?.readOnly === true) {
      return original.call(this, text, options);
    }
    counters.embeddingCacheWrites += 1;
    throw boundaryViolation('true live recall executor adapter blocked embedding cache write path', 'executor_adapter_embedding_cache_write_blocked', {
      counterKey: 'embeddingCacheWrites',
      target: 'vectorStore.getSingleEmbeddingCached',
      sideEffectCounters: { ...counters }
    });
  });

  return () => {
    for (let index = restorers.length - 1; index >= 0; index -= 1) {
      restorers[index]();
    }
  };
}

function numberOrNull(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(6)) : null;
}

function dateOnly(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  const match = text.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

function sanitizeResultForRunner(result = {}) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return {
      memoryId: null,
      score: null,
      baseScore: null,
      rerankScore: null,
      target: null,
      createdAtDateOnly: null,
      updatedAtDateOnly: null,
      sourceKinds: [],
      matchedTagsCount: 0,
      coreTagsCount: 0
    };
  }

  return {
    memoryId: result.memoryId || result.memory_id || result.id || null,
    score: numberOrNull(result.score),
    baseScore: numberOrNull(result.baseScore ?? result.base_score),
    rerankScore: numberOrNull(result.rerankScore ?? result.rerank_score),
    target: result.target || null,
    createdAtDateOnly: dateOnly(result.createdAt || result.created_at),
    updatedAtDateOnly: dateOnly(result.updatedAt || result.updated_at),
    sourceKinds: Array.isArray(result.sourceKinds) ? result.sourceKinds.map(String).sort() : [],
    matchedTagsCount: Array.isArray(result.matchedTags) ? result.matchedTags.length : 0,
    coreTagsCount: Array.isArray(result.coreTags) ? result.coreTags.length : 0
  };
}

function assertSanitizedResults(results = []) {
  const leaked = [];
  for (let index = 0; index < results.length; index += 1) {
    const result = results[index];
    if (!result || typeof result !== 'object') continue;
    for (const key of FORBIDDEN_RESULT_KEYS) {
      if (Object.prototype.hasOwnProperty.call(result, key)) {
        leaked.push({ index, key });
      }
    }
  }

  if (leaked.length > 0) {
    throw boundaryViolation('true live recall executor adapter returned forbidden raw result fields', 'executor_adapter_sanitization_failed', {
      leaked
    });
  }
}

function normalizeResults(response) {
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response)) return response;
  return [];
}

function createTrueLiveRecallExecutorAdapter({ app } = {}) {
  assertApp(app);

  return async function trueLiveRecallExecutorAdapter(request = {}) {
    assertProofRequest(request);
    const counters = createZeroCounters();
    const restoreInstrumentation = installInstrumentation(app, counters);

    try {
      const response = await app.callTool('search_memory', {
        query: request.query,
        target: request.target || 'both',
        limit: request.limit,
        include_content: false
      }, {
        noTokenReadOnly: true,
        executionContext: {
          requestSource: EXPECTED_SOURCE,
          precisionPolicyContext: request.precisionPolicyContext || null
        }
      });

      const results = normalizeResults(response).map(sanitizeResultForRunner);
      assertSanitizedResults(results);

      return {
        results,
        sideEffectCounters: { ...counters }
      };
    } finally {
      restoreInstrumentation();
    }
  };
}

module.exports = {
  EXPECTED_SOURCE,
  FORBIDDEN_RESULT_KEYS,
  createTrueLiveRecallExecutorAdapter,
  sanitizeResultForRunner
};
