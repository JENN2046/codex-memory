'use strict';

const crypto = require('node:crypto');

const {
  DEFAULT_SEARCH_MEMORY_TIMEOUT_MS,
  runSearchMemoryWithTimeout
} = require('./SearchMemoryTimeoutPolicy');

const EXACT_APPROVAL_LINE = 'I approve MEMORY_RECALL_TRUE_LIVE_REAL_STORE_PROOF_EXECUTION_ONCE for codex-memory at the current synced main head, limited to exactly four read-only true live search_memory calls against the current local codex-memory real store, using the query-family and output boundaries in docs/MEMORY_RECALL_TRUE_LIVE_REAL_STORE_PROOF_APPROVAL_PACKET.md, with no provider call, no direct .jsonl read, no durable memory/audit write, no migration/import/export/backup/restore apply, no config/watchdog/startup change, no public MCP expansion, no package/lockfile change, no tag/release/deploy/cutover, and no readiness claim.';

const PROOF_MODE = 'true_live_recall_readonly_proof';
const EXACT_QUERY_COUNT = 4;
const REQUIRED_QUERY_SLOTS = ['Q1', 'Q2', 'Q3', 'Q4'];
const RESULT_LABELS = {
  passed: 'TRUE_LIVE_REAL_STORE_RECALL_PROOF_PASSED_NOT_READY',
  failed: 'TRUE_LIVE_REAL_STORE_RECALL_PROOF_FAILED_NOT_READY',
  blockedBoundary: 'TRUE_LIVE_REAL_STORE_RECALL_PROOF_BLOCKED_BOUNDARY'
};

const ZERO_SIDE_EFFECT_COUNTERS = {
  providerCalls: 0,
  directJsonlReads: 0,
  durableMemoryWrites: 0,
  durableAuditWrites: 0,
  candidateCacheWrites: 0,
  candidateCacheFlushes: 0,
  syncCalls: 0,
  vectorFlushes: 0,
  embeddingCacheWrites: 0,
  rawMemoryContentReads: 0,
  publicMcpExpansion: 0
};

const FORBIDDEN_OUTPUT_KEYS = new Set([
  'content',
  'text',
  'title',
  'snippet',
  'rawText',
  'formattedWindow',
  'rawMemoryText',
  'chatHistory',
  'jsonlLine'
]);

const REQUIRED_SIDE_EFFECT_COUNTER_KEYS = Object.keys(ZERO_SIDE_EFFECT_COUNTERS);

function createProofBoundaryError(message, details = {}) {
  const error = new Error(message);
  error.name = 'TrueLiveRecallProofBoundaryError';
  error.code = 'TRUE_LIVE_RECALL_PROOF_BOUNDARY_VIOLATION';
  error.details = details;
  return error;
}

function normalizeApprovalLine(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function assertExactApproval(approvalLine) {
  if (normalizeApprovalLine(approvalLine) !== EXACT_APPROVAL_LINE) {
    throw createProofBoundaryError('exact approval required for true live recall proof runner', {
      reason: 'exact_approval_required'
    });
  }
}

function normalizeQueries(queries) {
  if (!Array.isArray(queries) || queries.length !== EXACT_QUERY_COUNT) {
    throw createProofBoundaryError('true live recall proof runner requires exactly four queries', {
      reason: 'exact_query_count_required',
      expected: EXACT_QUERY_COUNT,
      actual: Array.isArray(queries) ? queries.length : 0
    });
  }

  return queries.map((query, index) => {
    const slot = String(query?.slot || '').trim();
    const family = String(query?.family || '').trim();
    const text = String(query?.text || '').trim();

    if (slot !== REQUIRED_QUERY_SLOTS[index]) {
      throw createProofBoundaryError('query slot order must match CM-0774', {
        reason: 'query_slot_mismatch',
        expected: REQUIRED_QUERY_SLOTS[index],
        actual: slot
      });
    }
    if (!family || !text) {
      throw createProofBoundaryError('query family and text are required', {
        reason: 'query_family_or_text_missing',
        slot
      });
    }
    if (isBroadScanQuery(text)) {
      throw createProofBoundaryError('broad scan query rejected', {
        reason: 'broad_scan_query_rejected',
        slot
      });
    }

    return { slot, family, text };
  });
}

function normalizePrecisionPolicyContext(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw createProofBoundaryError('true live recall proof runner precision policy context must be an object', {
      reason: 'precision_policy_context_invalid'
    });
  }

  return { ...value };
}

function isBroadScanQuery(text) {
  const normalized = String(text || '').trim().toLowerCase();
  if (!normalized || normalized === '*' || normalized === 'all') return true;
  return [
    'dump all',
    'export all',
    'scan all',
    'broad scan',
    'search_all_knowledge_bases=true',
    '.jsonl',
    'raw memory',
    'raw chat history'
  ].some(fragment => normalized.includes(fragment));
}

function hashOpaqueId(value) {
  if (!value) return null;
  return crypto
    .createHash('sha256')
    .update(String(value))
    .digest('hex')
    .slice(0, 16);
}

function numberOrNull(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(6)) : null;
}

function collectMetadataKeys(result) {
  if (!result || typeof result !== 'object') return [];
  return Object.keys(result)
    .filter(key => !FORBIDDEN_OUTPUT_KEYS.has(key))
    .filter(key => !/secret|token|password|authorization|cookie|api[_-]?key/i.test(key))
    .sort();
}

function sanitizeResult(result) {
  if (!result || typeof result !== 'object') {
    return {
      topResultIdHashOrStableOpaqueId: null,
      topResultScoreIfAvailable: null,
      matchedMetadataKeysOnly: []
    };
  }

  const idSource = result.memoryId || result.memory_id || result.id || result.sourceFile;
  return {
    topResultIdHashOrStableOpaqueId: hashOpaqueId(idSource),
    topResultScoreIfAvailable: numberOrNull(result.score ?? result.baseScore ?? result.rerankScore),
    matchedMetadataKeysOnly: collectMetadataKeys(result)
  };
}

function normalizeZeroCounters() {
  return Object.fromEntries(
    REQUIRED_SIDE_EFFECT_COUNTER_KEYS.map(key => [key, 0])
  );
}

function assertZeroSideEffects(counters) {
  if (!counters || typeof counters !== 'object' || Array.isArray(counters)) {
    throw createProofBoundaryError('true live recall proof runner requires explicit side-effect counters', {
      reason: 'side_effect_counters_missing'
    });
  }

  const missing = REQUIRED_SIDE_EFFECT_COUNTER_KEYS.filter(
    key => !Object.prototype.hasOwnProperty.call(counters, key)
  );
  if (missing.length > 0) {
    throw createProofBoundaryError('true live recall proof runner side-effect counters must be complete', {
      reason: 'side_effect_counter_missing',
      missing
    });
  }

  const malformed = REQUIRED_SIDE_EFFECT_COUNTER_KEYS
    .filter((key) => {
      const value = counters[key];
      return typeof value !== 'number' || !Number.isFinite(value) || value < 0;
    })
    .map(key => ({ key, value: counters[key] }));
  if (malformed.length > 0) {
    throw createProofBoundaryError('true live recall proof runner side-effect counters must be finite non-negative numbers', {
      reason: 'side_effect_counter_malformed',
      malformed
    });
  }

  const unknownNonZero = Object.entries(counters)
    .filter(([key]) => !Object.prototype.hasOwnProperty.call(ZERO_SIDE_EFFECT_COUNTERS, key))
    .map(([key, value]) => ({ key, value: Number(value) }))
    .filter(({ value }) => Number.isFinite(value) && value > 0);
  if (unknownNonZero.length > 0) {
    throw createProofBoundaryError('true live recall proof runner unknown side-effect counters must remain zero', {
      reason: 'side_effect_counter_unknown_nonzero',
      unknownNonZero
    });
  }

  const normalized = Object.fromEntries(
    REQUIRED_SIDE_EFFECT_COUNTER_KEYS.map(key => [key, counters[key]])
  );
  const nonZero = Object.entries(normalized)
    .filter(([, value]) => value !== 0)
    .map(([key, value]) => ({ key, value }));

  if (nonZero.length > 0) {
    throw createProofBoundaryError('true live recall proof runner side-effect counter must remain zero', {
      reason: 'side_effect_counter_nonzero',
      nonZero
    });
  }

  return normalized;
}

function assertNoRawExecutorLeakage(results = []) {
  const leaked = [];
  for (let index = 0; index < results.length; index += 1) {
    const result = results[index];
    if (!result || typeof result !== 'object') continue;
    for (const key of FORBIDDEN_OUTPUT_KEYS) {
      if (Object.prototype.hasOwnProperty.call(result, key)) {
        leaked.push({ index, key });
      }
    }
  }

  if (leaked.length > 0) {
    throw createProofBoundaryError('true live recall proof runner raw executor output must fail closed', {
      reason: 'raw_executor_leakage_detected',
      leaked
    });
  }
}

function createSealedProofContext({ baselineCommit = 'unknown', proofRunId = null } = {}) {
  return Object.freeze({
    mode: PROOF_MODE,
    approvalPacket: 'CM-0774',
    exactApprovalRequired: true,
    exactQueryCount: EXACT_QUERY_COUNT,
    readOnly: true,
    noProvider: true,
    noAudit: true,
    sanitizedOutput: true,
    includeContent: false,
    baselineCommit,
    proofRunId: proofRunId || `tlr-proof-${Date.now().toString(36)}`
  });
}

class TrueLiveRecallReadonlyProofRunner {
  constructor({
    searchExecutor,
    timeoutMs = DEFAULT_SEARCH_MEMORY_TIMEOUT_MS,
    now = () => new Date()
  } = {}) {
    if (typeof searchExecutor !== 'function') {
      throw new TypeError('searchExecutor is required');
    }

    this.searchExecutor = searchExecutor;
    this.timeoutMs = timeoutMs;
    this.now = now;
  }

  async run({
    approvalLine,
    queries,
    baselineCommit = 'unknown',
    proofRunId = null,
    precisionPolicyContextFactory = null,
    target = 'both',
    limit = 5
  } = {}) {
    assertExactApproval(approvalLine);
    const normalizedQueries = normalizeQueries(queries);
    const proofContext = createSealedProofContext({ baselineCommit, proofRunId });
    const perQuery = [];
    let decision = RESULT_LABELS.passed;

    for (const query of normalizedQueries) {
      const startedAt = this.now();
      const entry = {
        querySlot: query.slot,
        queryFamily: query.family,
        elapsedMs: 0,
        resultCount: 0,
        topResultIdHashOrStableOpaqueId: null,
        topResultScoreIfAvailable: null,
        matchedMetadataKeysOnly: [],
        rawContentReturned: false,
        errorCodeIfAny: null
      };

      try {
        const precisionPolicyContext = normalizePrecisionPolicyContext(
          typeof precisionPolicyContextFactory === 'function'
            ? precisionPolicyContextFactory({
              slot: query.slot,
              family: query.family,
              text: query.text,
              proofContext
            })
            : null
        );
        const response = await runSearchMemoryWithTimeout(
          ({ signal }) => this.searchExecutor({
            query: query.text,
            querySlot: query.slot,
            queryFamily: query.family,
            target,
            limit,
            includeContent: false,
            source: 'internal-true-live-recall-readonly-proof-runner',
            readOnly: true,
            noProvider: true,
            noAudit: true,
            sanitizedOutput: true,
            precisionPolicyContext,
            proofContext,
            signal
          }),
          { timeoutMs: this.timeoutMs }
        );

        const results = Array.isArray(response?.results)
          ? response.results
          : Array.isArray(response)
            ? response
            : [];
        const counters = assertZeroSideEffects(response?.sideEffectCounters);
        assertNoRawExecutorLeakage(results);
        const top = sanitizeResult(results[0]);

        entry.resultCount = results.length;
        entry.topResultIdHashOrStableOpaqueId = top.topResultIdHashOrStableOpaqueId;
        entry.topResultScoreIfAvailable = top.topResultScoreIfAvailable;
        entry.matchedMetadataKeysOnly = top.matchedMetadataKeysOnly;
        entry.sideEffectCounters = counters;
      } catch (error) {
        if (error?.code === 'SEARCH_MEMORY_TIMEOUT') {
          decision = RESULT_LABELS.failed;
          entry.errorCodeIfAny = 'SEARCH_MEMORY_TIMEOUT';
          entry.sideEffectCounters = normalizeZeroCounters();
        } else {
          throw error;
        }
      } finally {
        entry.elapsedMs = Math.max(0, this.now().getTime() - startedAt.getTime());
      }

      perQuery.push(entry);
    }

    return {
      taskId: 'TRUE_LIVE_RECALL_INTERNAL_PROOF_RUNNER',
      baselineCommit,
      proofRunId: proofContext.proofRunId,
      queryCount: normalizedQueries.length,
      queryFamiliesUsed: normalizedQueries.map(query => ({
        slot: query.slot,
        family: query.family
      })),
      proofContext: {
        mode: proofContext.mode,
        approvalPacket: proofContext.approvalPacket,
        exactApprovalRequired: proofContext.exactApprovalRequired,
        exactQueryCount: proofContext.exactQueryCount,
        readOnly: proofContext.readOnly,
        noProvider: proofContext.noProvider,
        noAudit: proofContext.noAudit,
        sanitizedOutput: proofContext.sanitizedOutput,
        includeContent: proofContext.includeContent
      },
      perQuery,
      sideEffectCounters: mergeSideEffectCounters(perQuery),
      rawContentReturned: false,
      directJsonlRead: false,
      durableMemoryWrite: false,
      durableAuditWrite: false,
      publicMcpExpanded: false,
      memoryRecallReliableClaimed: false,
      rcNotReadyBlocked: true,
      decision
    };
  }
}

function mergeSideEffectCounters(perQuery = []) {
  const merged = normalizeZeroCounters();
  for (const query of perQuery) {
    const counters = query.sideEffectCounters || normalizeZeroCounters();
    for (const key of Object.keys(merged)) {
      merged[key] += Number(counters[key] || 0);
    }
  }
  return merged;
}

module.exports = {
  EXACT_APPROVAL_LINE,
  EXACT_QUERY_COUNT,
  PROOF_MODE,
  REQUIRED_QUERY_SLOTS,
  RESULT_LABELS,
  REQUIRED_SIDE_EFFECT_COUNTER_KEYS,
  ZERO_SIDE_EFFECT_COUNTERS,
  TrueLiveRecallReadonlyProofRunner,
  assertNoRawExecutorLeakage,
  assertExactApproval,
  assertZeroSideEffects,
  createProofBoundaryError,
  createSealedProofContext,
  normalizeQueries
};
