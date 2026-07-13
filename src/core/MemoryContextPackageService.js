'use strict';

const crypto = require('node:crypto');

const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');
const { compactText, uniqueTokens } = require('../recall/text');

const DEFAULT_MAX_ITEMS = 6;
const DEFAULT_MAX_BYTES = 8000;
const MIN_MAX_BYTES = 1200;
const MAX_MAX_BYTES = 24000;
const EXPERIMENTAL_HEURISTICS = Object.freeze([
  'TagMemoEngine',
  'EPA',
  'ResidualPyramid'
]);
const REUSED_SURFACES = Object.freeze([
  'KnowledgeBaseRecallPipeline',
  'CandidateGenerator',
  'TagMemoEngine',
  'scope/lifecycle filters',
  'SQLite shadow',
  'vector index',
  'AuditLogStore',
  'MemoryOverviewService'
]);
const FORBIDDEN_OUTPUT_KEYS = Object.freeze([
  'memoryId',
  'memory_id',
  'sourceFile',
  'source_file',
  'filePath',
  'relativePath',
  'path',
  'rawText',
  'raw_text',
  'rawJsonl',
  'rawAudit',
  'providerPayload',
  'providerUrl',
  'providerURL',
  'endpoint',
  'token',
  'authorization',
  'content',
  'snippet',
  'text'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function clampInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function safeString(value, maxLength = 1000) {
  return redactSensitiveFragments(String(value ?? ''))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function scoreBucket(score) {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) return 'unknown';
  if (numeric >= 0.75) return 'high';
  if (numeric >= 0.35) return 'medium';
  return 'low';
}

function sourceKinds(item = {}) {
  return uniqueTokens(
    Array.isArray(item.sourceKinds)
      ? item.sourceKinds.map(value => safeString(value, 80)).filter(Boolean)
      : []
  ).slice(0, 5);
}

function freshnessBucket(item = {}, now = Date.now()) {
  const updatedAt = Date.parse(item.updatedAt || item.createdAt || '');
  if (!Number.isFinite(updatedAt)) return 'unknown';
  const ageDays = Math.max(0, (now - updatedAt) / 86400000);
  if (ageDays <= 14) return 'recent';
  if (ageDays <= 90) return 'established';
  return 'stale_candidate';
}

function deriveStatement(item = {}, index) {
  const source = safeString(item.title || item.snippet || item.text || '', 420);
  if (source) return source;
  const tags = uniqueTokens([...(item.matchedTags || []), ...(item.coreTags || [])])
    .map(tag => safeString(tag, 80))
    .filter(Boolean)
    .slice(0, 4);
  if (tags.length > 0) return `Memory signal ${index + 1}: ${tags.join(', ')}`;
  return `Memory signal ${index + 1}: bounded recall match without returned raw content.`;
}

function lowerSearchText(item = {}) {
  return [
    item.title,
    item.snippet,
    item.text,
    ...(Array.isArray(item.matchedTags) ? item.matchedTags : []),
    ...(Array.isArray(item.coreTags) ? item.coreTags : [])
  ].map(value => String(value || '').toLowerCase()).join(' ');
}

function classifyResult(item = {}) {
  const text = lowerSearchText(item);
  if (/(blocker|blocked|blocking|hard stop|cannot proceed|阻塞|卡点)/.test(text)) {
    return 'blockers';
  }
  if (/(risk|risky|unsafe|security|privacy|secret|泄露|风险)/.test(text)) {
    return 'risks';
  }
  if (/(forbidden|non-claim|must not|do not claim|禁止|不得|不要声明)/.test(text)) {
    return 'forbidden_assumptions';
  }
  if (/(decision|decided|approved|rejected|accepted|选择|决定|审批)/.test(text)) {
    return 'recent_decisions';
  }
  if (/(current state|status|now|active|当前|现状|状态)/.test(text)) {
    return 'current_state';
  }
  return 'must_know';
}

function reasonCodes(item = {}, freshness) {
  const reasons = [];
  if (Number(item.titleHitCount || 0) > 0) reasons.push('title_match');
  if (Number(item.tagHitCount || 0) > 0 || Number(item.exactCoreTagCount || 0) > 0) reasons.push('tag_match');
  if (Number(item.contentHitCount || 0) > 0) reasons.push('content_match');
  if (Number(item.evidenceHitCount || 0) > 0) reasons.push('evidence_match');
  if (freshness === 'stale_candidate') reasons.push('stale_candidate');
  if (reasons.length === 0) reasons.push('semantic_match');
  return reasons;
}

function projectContextItem(item = {}, index, now = Date.now()) {
  const freshness = freshnessBucket(item, now);
  return {
    statement: deriveStatement(item, index),
    relevance: scoreBucket(item.score ?? item.rerankScore ?? item.baseScore),
    freshness,
    reason_codes: reasonCodes(item, freshness),
    source_kinds: sourceKinds(item),
    experimental_heuristics_used: EXPERIMENTAL_HEURISTICS
      .filter(name => name === 'TagMemoEngine' && (
        Number(item.tagMemoSurfaceScore || 0) > 0 ||
        Number(item.dynamicCoreWeight || 0) > 0 ||
        (Array.isArray(item.coreTags) && item.coreTags.length > 0)
      ))
  };
}

function emptyPackage() {
  return {
    must_know: [],
    recent_decisions: [],
    current_state: [],
    blockers: [],
    risks: [],
    forbidden_assumptions: [],
    recommended_next_step: 'Proceed with normal repository inspection; no relevant memory context was found.',
    source_breakdown: {
      search_result_count: 0,
      target_counts: {},
      source_kinds: [],
      fallback_used: false,
      reused_surfaces: [...REUSED_SURFACES],
      experimental_heuristics: [...EXPERIMENTAL_HEURISTICS],
      vcp_toolbox_native_memory_owner: true,
      local_memory_role: [
        'fallback',
        'audit',
        'validation fixture',
        'compatibility',
        'offline continuity',
        'context packaging'
      ]
    },
    audit_receipt: null
  };
}

function buildScope(task = {}) {
  const scope = {};
  for (const [taskKey, scopeKey] of [
    ['project_id', 'project_id'],
    ['scope_id', 'scope_id'],
    ['workspace_id', 'workspace_id'],
    ['client_id', 'client_id'],
    ['visibility', 'visibility']
  ]) {
    const value = task[taskKey];
    if (typeof value === 'string' && value.trim()) scope[scopeKey] = value.trim();
  }
  if (Object.keys(scope).length > 0) scope.strict = task.strict_scope !== false;
  return Object.keys(scope).length > 0 ? scope : undefined;
}

function buildQuery(task = {}) {
  return compactText([
    task.title,
    task.user_request,
    task.repo,
    task.current_branch,
    Array.isArray(task.current_files) ? task.current_files.join(' ') : ''
  ].filter(Boolean).join(' :: '));
}

function normalizeSearchResults(searchResult = {}) {
  return Array.isArray(searchResult?.results) ? searchResult.results : [];
}

function hasFallback(searchResult = {}) {
  return searchResult?.access?.localMemoryFallbackUsed === true ||
    searchResult?.governedNativeReadFallback?.used === true;
}

function buildRecommendedNextStep(pkg) {
  if (pkg.blockers.length > 0) {
    return 'Address the blocker memory first, then continue with the task using current repository evidence.';
  }
  if (pkg.forbidden_assumptions.length > 0) {
    return 'Continue with the task, explicitly avoiding the forbidden assumptions surfaced in memory.';
  }
  if (pkg.must_know.length > 0 || pkg.current_state.length > 0 || pkg.recent_decisions.length > 0) {
    return 'Use this bounded memory package as context, then verify against current files and command output.';
  }
  return 'Proceed with normal repository inspection; no relevant memory context was found.';
}

function buildTargetCounts(results = []) {
  const counts = {};
  for (const item of results) {
    const target = safeString(item.target || 'unknown', 80) || 'unknown';
    counts[target] = (counts[target] || 0) + 1;
  }
  return counts;
}

function buildAuditReceipt({ task, query, results, searchResult, overview, audit }) {
  const seed = JSON.stringify({
    query,
    resultCount: results.length,
    project: task.project_id || '',
    client: task.client_id || '',
    fallback: hasFallback(searchResult)
  });
  return {
    schemaVersion: 'prepare_memory_context_audit_receipt_v1',
    receipt_id: `pmc_${crypto.createHash('sha256').update(seed).digest('hex').slice(0, 16)}`,
    generated_at: new Date().toISOString(),
    read_only: true,
    durable_mutation_performed: false,
    production_write_performed: false,
    raw_memory_returned: false,
    raw_audit_returned: false,
    provider_payload_returned: false,
    fallback_used: hasFallback(searchResult),
    search_result_count: results.length,
    overview_status: overview?.runtimePosture?.securityProfile || overview?.access?.mode || 'unknown',
    audit_status: audit?.status || 'unknown',
    low_disclosure: true
  };
}

function enforceNoForbiddenOutputKeys(value, path = []) {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      enforceNoForbiddenOutputKeys(value[index], [...path, String(index)]);
    }
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_OUTPUT_KEYS.includes(key)) {
      throw new Error(`Forbidden prepare_memory_context output key: ${[...path, key].join('.')}`);
    }
    enforceNoForbiddenOutputKeys(nested, [...path, key]);
  }
}

function buildMinimalBoundedResponse(result) {
  const fallbackUsed = result?.access?.localMemoryFallbackUsed === true;
  return {
    status: 'PREPARE_MEMORY_CONTEXT_ACCEPTED',
    accepted: true,
    memory_context_package: {
      must_know: [],
      recent_decisions: [],
      current_state: [],
      blockers: [],
      risks: [],
      forbidden_assumptions: [],
      recommended_next_step: 'Memory context omitted to fit the response budget; inspect repository evidence.',
      source_breakdown: {
        search_result_count: 0,
        fallback_used: fallbackUsed,
        vcp_toolbox_native_memory_owner: true
      },
      audit_receipt: null
    },
    access: {
      mode: 'prepare_memory_context_readonly',
      selectedProjection: true,
      readOnly: true,
      lowDisclosure: true,
      durableMutationPerformed: false,
      productionWritePerformed: false,
      rawMemoryReturned: false,
      rawAuditReturned: false,
      readinessClaimed: false,
      localMemoryFallbackUsed: fallbackUsed,
      resultCanBeMistakenForVcpNative: false
    },
    compression: { applied: true, mode: 'minimal_bounded_envelope' },
    nonClaims: {
      productionReadiness: false,
      productionWriteReady: false
    }
  };
}

function enforceMaxBytes(result, maxBytes) {
  let current = JSON.stringify(result);
  if (Buffer.byteLength(current, 'utf8') <= maxBytes) return result;

  const pkg = result.memory_context_package;
  for (const bucket of ['must_know', 'recent_decisions', 'current_state', 'blockers', 'risks', 'forbidden_assumptions']) {
    pkg[bucket] = pkg[bucket].map(item => ({
      ...item,
      statement: safeString(item.statement, 180)
    }));
  }
  current = JSON.stringify(result);
  if (Buffer.byteLength(current, 'utf8') <= maxBytes) {
    result.compression = { applied: true, mode: 'statement_trim' };
    return result;
  }

  for (const bucket of ['must_know', 'recent_decisions', 'current_state', 'blockers', 'risks', 'forbidden_assumptions']) {
    while (pkg[bucket].length > 1 && Buffer.byteLength(JSON.stringify(result), 'utf8') > maxBytes) {
      pkg[bucket].pop();
    }
  }
  if (Buffer.byteLength(JSON.stringify(result), 'utf8') > maxBytes) {
    for (const bucket of ['must_know', 'recent_decisions', 'current_state', 'blockers', 'risks', 'forbidden_assumptions']) {
      pkg[bucket] = pkg[bucket].slice(0, 1).map(item => ({
        statement: safeString(item.statement, 96),
        relevance: item.relevance,
        freshness: item.freshness,
        reason_codes: item.reason_codes.slice(0, 3),
        source_kinds: item.source_kinds.slice(0, 3)
      }));
    }
    pkg.source_breakdown.source_kinds = pkg.source_breakdown.source_kinds.slice(0, 4);
    pkg.source_breakdown.reused_surfaces = pkg.source_breakdown.reused_surfaces.slice(0, 4);
    pkg.source_breakdown.experimental_heuristics = pkg.source_breakdown.experimental_heuristics.slice(0, 1);
  }
  if (Buffer.byteLength(JSON.stringify(result), 'utf8') > maxBytes) {
    for (const bucket of ['must_know', 'recent_decisions', 'current_state', 'blockers', 'risks', 'forbidden_assumptions']) {
      pkg[bucket] = [];
    }
    pkg.recommended_next_step = 'Memory context was compressed to fit the response budget; inspect repository evidence before acting.';
    pkg.source_breakdown.reused_surfaces = ['KnowledgeBaseRecallPipeline', 'CandidateGenerator', 'TagMemoEngine'];
    pkg.source_breakdown.experimental_heuristics = ['TagMemoEngine'];
    pkg.source_breakdown.local_memory_role = ['fallback', 'audit', 'context packaging'];
    delete pkg.source_breakdown.overview_projection_mode;
    delete pkg.source_breakdown.audit_projection_mode;
    if (pkg.audit_receipt) {
      pkg.audit_receipt = {
        schemaVersion: pkg.audit_receipt.schemaVersion,
        receipt_id: pkg.audit_receipt.receipt_id,
        read_only: true,
        durable_mutation_performed: false,
        production_write_performed: false,
        raw_memory_returned: false,
        raw_audit_returned: false,
        provider_payload_returned: false,
        fallback_used: pkg.audit_receipt.fallback_used,
        search_result_count: pkg.audit_receipt.search_result_count,
        low_disclosure: true
      };
    }
  }
  if (Buffer.byteLength(JSON.stringify(result), 'utf8') > maxBytes) {
    return buildMinimalBoundedResponse(result);
  }
  result.compression = { applied: true, mode: 'statement_trim_and_bucket_prune' };
  return result;
}

class MemoryContextPackageService {
  constructor({
    searchMemory,
    overviewService,
    auditMemoryReadonlyService
  }) {
    this.searchMemory = searchMemory;
    this.overviewService = overviewService;
    this.auditMemoryReadonlyService = auditMemoryReadonlyService;
  }

  async prepare(input = {}, requestContext = {}) {
    const task = isPlainObject(input.task) ? input.task : {};
    const options = isPlainObject(input.options) ? input.options : {};
    const query = buildQuery(task);
    const maxItems = clampInteger(options.max_items, DEFAULT_MAX_ITEMS, 1, 10);
    const maxBytes = clampInteger(options.max_bytes, DEFAULT_MAX_BYTES, MIN_MAX_BYTES, MAX_MAX_BYTES);
    const scope = buildScope(task);
    const contextText = safeString(task.user_request || task.title || '', 2000);
    const readOnlyContext = {
      ...requestContext,
      noTokenReadOnly: true,
      memoryContextPackageReadOnly: true,
      executionContext: {
        ...(requestContext.executionContext || {}),
        requestSource: requestContext.executionContext?.requestSource || 'prepare_memory_context'
      }
    };

    const searchResult = query
      ? await this.searchMemory({
        query,
        target: 'both',
        limit: maxItems,
        include_content: false,
        ...(contextText ? { context_text: contextText } : {}),
        ...(scope ? { scope } : {})
      }, readOnlyContext)
      : { results: [] };
    const results = normalizeSearchResults(searchResult).slice(0, maxItems);
    const overview = this.overviewService
      ? await this.overviewService.getAuthenticatedBoundedOverview({ auditWindow: 50 })
      : null;
    const audit = this.auditMemoryReadonlyService
      ? await this.auditMemoryReadonlyService.run({
        audit_family: 'all',
        window: 20,
        ...(scope ? { scope } : {}),
        include_raw: false
      })
      : null;
    const pkg = emptyPackage();

    results.forEach((item, index) => {
      const projected = projectContextItem(item, index);
      const bucket = classifyResult(item);
      pkg[bucket].push(projected);
      if (projected.freshness === 'stale_candidate') {
        pkg.risks.push({
          ...projected,
          statement: `Stale candidate: ${projected.statement}`,
          reason_codes: uniqueTokens([...projected.reason_codes, 'stale_memory'])
        });
      }
      if (/(conflict|contradict|superseded|冲突|矛盾)/.test(lowerSearchText(item))) {
        pkg.risks.push({
          ...projected,
          statement: `Conflict candidate: ${projected.statement}`,
          reason_codes: uniqueTokens([...projected.reason_codes, 'conflict_memory'])
        });
      }
    });

    pkg.recommended_next_step = buildRecommendedNextStep(pkg);
    pkg.source_breakdown = {
      ...pkg.source_breakdown,
      search_result_count: results.length,
      target_counts: buildTargetCounts(results),
      source_kinds: uniqueTokens(results.flatMap(sourceKinds)).slice(0, 10),
      fallback_used: hasFallback(searchResult),
      result_can_be_mistaken_for_native: false,
      overview_projection_mode: overview?.access?.mode || 'authenticated_bounded_overview',
      audit_projection_mode: audit?.access?.mode || 'audit_memory_readonly_bounded'
    };
    pkg.audit_receipt = buildAuditReceipt({ task, query, results, searchResult, overview, audit });

    const response = {
      status: 'PREPARE_MEMORY_CONTEXT_ACCEPTED',
      accepted: true,
      memory_context_package: pkg,
      access: {
        mode: 'prepare_memory_context_readonly',
        selectedProjection: true,
        selectedProjectionVersion: 1,
        readOnly: true,
        lowDisclosure: true,
        durableMutationPerformed: false,
        productionWritePerformed: false,
        rawMemoryReturned: false,
        rawAuditReturned: false,
        rawOutputReturned: false,
        providerPayloadReturned: false,
        filesystemPathsReturned: false,
        pathsReturned: false,
        memoryIdsReturned: false,
        titlesReturned: false,
        snippetsReturned: false,
        contentReturned: false,
        tokenMaterialReturned: false,
        endpointReturned: false,
        readinessClaimed: false,
        localMemoryFallbackUsed: hasFallback(searchResult),
        resultCanBeMistakenForVcpNative: false
      },
      compression: { applied: false, mode: 'none' },
      nonClaims: {
        modelInternalMemory: false,
        productionReadiness: false,
        productionWriteReady: false,
        fullSurfaceDefault: false
      }
    };

    enforceNoForbiddenOutputKeys(response);
    const compressed = enforceMaxBytes(response, maxBytes);
    enforceNoForbiddenOutputKeys(compressed);
    return compressed;
  }
}

module.exports = {
  EXPERIMENTAL_HEURISTICS,
  FORBIDDEN_OUTPUT_KEYS,
  MemoryContextPackageService,
  REUSED_SURFACES,
  enforceNoForbiddenOutputKeys
};
