'use strict';

const crypto = require('node:crypto');
const { assembleChatGptWebContext } = require('./ChatGptWebContextAssembler');

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
const NATIVE_CONTEXT_SURFACES = Object.freeze([
  'GovernedRecallGateway',
  'GovernedMcpVcpNativeBridgeGate',
  'GovernedMcpVcpNativeReadDelegationAdapter',
  'VCPToolBox native memory'
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
const LOW_DISCLOSURE_STATEMENT_LABELS = Object.freeze({
  must_know: 'bounded recall match',
  recent_decisions: 'bounded recall decision signal',
  current_state: 'bounded recall current-state signal',
  blockers: 'bounded recall blocker signal',
  risks: 'bounded recall risk signal',
  forbidden_assumptions: 'bounded recall forbidden-assumption signal'
});
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

function normalizeMemoryContextProjection(item = {}) {
  const projection = item.memoryContextProjection;
  if (!isPlainObject(projection) ||
    projection.projectionVersion !== 1 ||
    projection.lowDisclosure !== true ||
    !CONTEXT_CLASSIFICATIONS.includes(projection.classification) ||
    !CONTEXT_FRESHNESS_BUCKETS.includes(projection.freshness)) {
    return null;
  }
  const statement = safeString(projection.statement, 420);
  const projectedReasonCodes = uniqueTokens(
    Array.isArray(projection.reasonCodes)
      ? projection.reasonCodes.filter(code => CONTEXT_REASON_CODES.includes(code))
      : []
  );
  if (!statement || projectedReasonCodes.length === 0 || typeof projection.conflict !== 'boolean') {
    return null;
  }
  return {
    statement,
    classification: projection.classification,
    freshness: projection.freshness,
    reasonCodes: projectedReasonCodes,
    conflict: projection.conflict
  };
}

function freshnessBucketFromTimestamps(item = {}, now = Date.now()) {
  const updatedAt = Date.parse(item.updatedAt || item.createdAt || '');
  if (!Number.isFinite(updatedAt)) return 'unknown';
  const ageDays = Math.max(0, (now - updatedAt) / 86400000);
  if (ageDays <= 14) return 'recent';
  if (ageDays <= 90) return 'established';
  return 'stale_candidate';
}

function freshnessBucket(item = {}, now = Date.now()) {
  return normalizeMemoryContextProjection(item)?.freshness ||
    freshnessBucketFromTimestamps(item, now);
}

function deriveStatement(item = {}, index) {
  const projected = normalizeMemoryContextProjection(item);
  if (projected) return projected.statement;
  const classification = classifyRawResult(item);
  const label = LOW_DISCLOSURE_STATEMENT_LABELS[classification] ||
    LOW_DISCLOSURE_STATEMENT_LABELS.must_know;
  return `Memory signal ${index + 1}: ${label}.`;
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

function classifySearchText(text = '') {
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

function classifyRawResult(item = {}) {
  return classifySearchText(lowerSearchText(item));
}

function classifyResult(item = {}) {
  return normalizeMemoryContextProjection(item)?.classification || classifyRawResult(item);
}

function reasonCodesFromMetrics(item = {}, freshness) {
  const reasons = [];
  if (Number(item.titleHitCount || 0) > 0) reasons.push('title_match');
  if (Number(item.tagHitCount || 0) > 0 || Number(item.exactCoreTagCount || 0) > 0) reasons.push('tag_match');
  if (Number(item.contentHitCount || 0) > 0) reasons.push('content_match');
  if (Number(item.evidenceHitCount || 0) > 0) reasons.push('evidence_match');
  if (freshness === 'stale_candidate') reasons.push('stale_candidate');
  if (reasons.length === 0) reasons.push('semantic_match');
  return reasons;
}

function reasonCodes(item = {}, freshness) {
  return normalizeMemoryContextProjection(item)?.reasonCodes ||
    reasonCodesFromMetrics(item, freshness);
}

function buildMemoryContextLowDisclosureProjection(item = {}, index = 0, now = Date.now()) {
  const classification = classifyRawResult(item);
  const freshness = freshnessBucketFromTimestamps(item, now);
  const tags = uniqueTokens([...(item.matchedTags || []), ...(item.coreTags || [])])
    .map(tag => safeString(tag, 80))
    .filter(Boolean)
    .slice(0, 4);
  const label = LOW_DISCLOSURE_STATEMENT_LABELS[classification] ||
    LOW_DISCLOSURE_STATEMENT_LABELS.must_know;
  const statement = tags.length > 0
    ? `Memory signal ${index + 1}: ${label}: ${tags.join(', ')}`
    : `Memory signal ${index + 1}: ${label}.`;
  return Object.freeze({
    projectionVersion: 1,
    lowDisclosure: true,
    statement: safeString(statement, 420),
    classification,
    freshness,
    reasonCodes: reasonCodesFromMetrics(item, freshness),
    conflict: /(conflict|contradict|superseded|冲突|矛盾)/.test(lowerSearchText(item))
  });
}

function isConflictResult(item = {}) {
  const projected = normalizeMemoryContextProjection(item);
  return projected
    ? projected.conflict
    : /(conflict|contradict|superseded|冲突|矛盾)/.test(lowerSearchText(item));
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

function sourceRuntime(searchResult = {}) {
  if (hasFallback(searchResult)) return 'local_fallback';
  if (
    searchResult?.status === 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATED' &&
    searchResult?.accepted === true &&
    searchResult?.decision !== 'rejected'
  ) return 'vcp_native';
  if (
    String(searchResult?.status || '').startsWith('GOVERNED_MCP_VCP_NATIVE_') ||
    ['vcp_native', 'vcp_native_unavailable'].includes(searchResult?.source_runtime)
  ) {
    return 'vcp_native_unavailable';
  }
  if (['local_fallback', 'local_compatibility'].includes(searchResult?.source_runtime)) {
    return searchResult.source_runtime;
  }
  return 'local_compatibility';
}

function nativeRuntimeMutationFacts(searchResult = {}) {
  const runtime = searchResult?.receipt?.nativeInvocationReceipt?.nativeRuntimeReceipt;
  return {
    primary_memory_write_performed: runtime?.primaryMemoryStoreWritePerformed === true,
    derived_index_write_performed: runtime?.derivedIndexWritePerformed === true,
    other_durable_mutation_performed: runtime?.durableWritePerformed === true &&
      runtime?.primaryMemoryStoreWritePerformed !== true &&
      runtime?.derivedIndexWritePerformed !== true
  };
}

function compositeInvocationMetadata(searchResult = {}) {
  return {
    invocation_profile: 'composite_governed_native_read',
    native_first: true,
    direct_native_tool: false,
    read_allowed: true,
    write_allowed: false,
    local_fallback_explicitly_marked: true
  };
}

function recallRejected(searchResult = {}) {
  if (!isPlainObject(searchResult)) return false;
  return searchResult.accepted === false ||
    searchResult.decision === 'rejected' ||
    sourceRuntime(searchResult) === 'vcp_native_unavailable';
}

function buildRecallRejectedResponse(searchResult = {}) {
  const selectedSourceRuntime = sourceRuntime(searchResult);
  const nativeUnavailable = selectedSourceRuntime === 'vcp_native_unavailable';
  const mutationFacts = nativeRuntimeMutationFacts(searchResult);
  return {
    status: 'PREPARE_MEMORY_CONTEXT_RECALL_REJECTED',
    accepted: false,
    decision: 'rejected',
    reasonCode: nativeUnavailable
      ? 'vcp_native_recall_unavailable'
      : 'governed_recall_unavailable',
    invocation_metadata: compositeInvocationMetadata(searchResult),
    access: {
      mode: 'prepare_memory_context_readonly',
      selectedProjection: true,
      selectedProjectionVersion: 1,
      readOnly: true,
      lowDisclosure: true,
      nativeRecallAccepted: false,
      memoryReadPerformed: searchResult?.access?.memoryReadPerformed === true,
      localMemoryFallbackUsed: false,
      resultCanBeMistakenForVcpNative: false,
      durableMutationPerformed: Object.values(mutationFacts).some(Boolean),
      productionWritePerformed: false,
      rawMemoryReturned: false,
      rawAuditReturned: false,
      rawOutputReturned: false,
      providerPayloadReturned: false,
      tokenMaterialReturned: false,
      endpointReturned: false,
      readinessClaimed: false,
      sourceRuntime: selectedSourceRuntime
    },
    nonClaims: {
      modelInternalMemory: false,
      productionReadiness: false,
      productionWriteReady: false,
      fullSurfaceDefault: false
    }
  };
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

function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function buildReceiptScopeBinding(task = {}) {
  const scope = buildScope(task) || {};
  return {
    project_id: safeString(scope.project_id || '', 200),
    scope_id: safeString(scope.scope_id || '', 200),
    workspace_id: safeString(scope.workspace_id || '', 200),
    client_id: safeString(scope.client_id || '', 200),
    visibility: safeString(scope.visibility || '', 200),
    strict: scope.strict === true
  };
}

function buildReceiptResultProjectionIdentity(item = {}, index = 0) {
  const projected = normalizeMemoryContextProjection(item) ||
    normalizeMemoryContextProjection({
      memoryContextProjection: buildMemoryContextLowDisclosureProjection(item, index)
    });
  const projectTokens = values => uniqueTokens(
    Array.isArray(values)
      ? values.map(value => safeString(value, 80)).filter(Boolean)
      : []
  ).slice(0, 16);
  const projectTimestamp = value => {
    if (typeof value !== 'string') return null;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
  };
  const finiteOrNull = value => Number.isFinite(value) ? value : null;
  const projection = {
    target: safeString(item.target || 'unknown', 80) || 'unknown',
    score: finiteOrNull(item.score),
    baseScore: finiteOrNull(item.baseScore),
    rerankScore: finiteOrNull(item.rerankScore),
    titleHitCount: Number(item.titleHitCount || 0),
    tagHitCount: Number(item.tagHitCount || 0),
    contentHitCount: Number(item.contentHitCount || 0),
    evidenceHitCount: Number(item.evidenceHitCount || 0),
    exactCoreTagCount: Number(item.exactCoreTagCount || 0),
    sourceKinds: sourceKinds(item),
    matchedTags: projectTokens(item.matchedTags),
    coreTags: projectTokens(item.coreTags),
    createdAt: projectTimestamp(item.createdAt),
    updatedAt: projectTimestamp(item.updatedAt),
    context: projected
  };
  return sha256Hex(JSON.stringify(projection));
}

function buildAuditReceipt({ task, query, results, searchResult, overview, audit }) {
  const scopeFingerprint = sha256Hex(JSON.stringify(buildReceiptScopeBinding(task)));
  const resultProjectionDigest = sha256Hex(JSON.stringify(
    results.map(buildReceiptResultProjectionIdentity)
  ));
  const seed = JSON.stringify({
    query,
    resultCount: results.length,
    scopeFingerprint,
    resultProjectionDigest,
    fallback: hasFallback(searchResult)
  });
  const mutationFacts = nativeRuntimeMutationFacts(searchResult);
  return {
    schemaVersion: 'prepare_memory_context_audit_receipt_v1',
    receipt_id: `pmc_${sha256Hex(seed).slice(0, 16)}`,
    generated_at: new Date().toISOString(),
    read_only: true,
    durable_mutation_performed: Object.values(mutationFacts).some(Boolean),
    ...mutationFacts,
    production_write_performed: false,
    raw_memory_returned: false,
    raw_audit_returned: false,
    provider_payload_returned: false,
    fallback_used: hasFallback(searchResult),
    source_runtime: sourceRuntime(searchResult),
    search_result_count: results.length,
    scope_fingerprint: scopeFingerprint,
    result_projection_digest: resultProjectionDigest,
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
  const selectedSourceRuntime = result?.access?.sourceRuntime || 'local_compatibility';
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
      recommended_next_step: 'Inspect repository evidence.',
      audit_receipt: result?.memory_context_package?.audit_receipt
        ? {
            schemaVersion: result.memory_context_package.audit_receipt.schemaVersion,
            receipt_id: result.memory_context_package.audit_receipt.receipt_id,
            read_only: true,
            durable_mutation_performed:
              result.memory_context_package.audit_receipt.durable_mutation_performed === true,
            primary_memory_write_performed:
              result.memory_context_package.audit_receipt.primary_memory_write_performed === true,
            derived_index_write_performed:
              result.memory_context_package.audit_receipt.derived_index_write_performed === true,
            other_durable_mutation_performed:
              result.memory_context_package.audit_receipt.other_durable_mutation_performed === true,
            production_write_performed: false,
            low_disclosure: true
          }
        : null
    },
    invocation_metadata: result?.invocation_metadata || null,
    access: {
      readOnly: true,
      lowDisclosure: true,
      durableMutationPerformed: result?.access?.durableMutationPerformed === true,
      productionWritePerformed: false,
      rawMemoryReturned: false,
      readinessClaimed: false,
      sourceRuntime: selectedSourceRuntime,
      localMemoryFallbackUsed: fallbackUsed
    },
    compression: { applied: true, mode: 'minimal_bounded_envelope' }
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
    pkg.source_breakdown.reused_surfaces = pkg.source_breakdown.reused_surfaces.slice(0, 3);
    pkg.source_breakdown.experimental_heuristics =
      pkg.source_breakdown.experimental_heuristics.slice(0, 1);
    pkg.source_breakdown.local_memory_role = ['fallback', 'audit', 'context packaging'];
    delete pkg.source_breakdown.overview_projection_mode;
    delete pkg.source_breakdown.audit_projection_mode;
    if (pkg.audit_receipt) {
      pkg.audit_receipt = {
        schemaVersion: pkg.audit_receipt.schemaVersion,
        receipt_id: pkg.audit_receipt.receipt_id,
        read_only: true,
        durable_mutation_performed: pkg.audit_receipt.durable_mutation_performed === true,
        primary_memory_write_performed: pkg.audit_receipt.primary_memory_write_performed === true,
        derived_index_write_performed: pkg.audit_receipt.derived_index_write_performed === true,
        other_durable_mutation_performed: pkg.audit_receipt.other_durable_mutation_performed === true,
        production_write_performed: false,
        raw_memory_returned: false,
        raw_audit_returned: false,
        provider_payload_returned: false,
        fallback_used: pkg.audit_receipt.fallback_used,
        source_runtime: pkg.audit_receipt.source_runtime,
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
    auditMemoryReadonlyService,
    governedReadFacade = null
  }) {
    this.searchMemory = searchMemory;
    this.overviewService = overviewService;
    this.auditMemoryReadonlyService = auditMemoryReadonlyService;
    this.governedReadFacade = governedReadFacade;
  }

  async prepareChatGptWeb(input = {}, requestContext = {}) {
    if (!this.governedReadFacade) throw new Error('VCP_COMPOSITE_READ_NOT_READY');
    const task = isPlainObject(input.task) ? input.task : {};
    const options = isPlainObject(input.options) ? input.options : {};
    const query = buildQuery(task);
    const maxItems = clampInteger(options.max_items, DEFAULT_MAX_ITEMS, 1, 6);
    const contextText = safeString(task.user_request || task.title || '', 2000);
    const composite = await this.governedReadFacade.read({
      recallInput: {
        query,
        target: 'both',
        limit: maxItems,
        include_content: false,
        ...(contextText ? { context_text: contextText } : {})
      },
      overviewInput: { auditWindow: 50 },
      auditInput: { audit_family: 'all', window: 20, include_raw: false },
      requestContext: { ...requestContext, noTokenReadOnly: true, memoryContextPackageReadOnly: true }
    });
    const sourceTruth = composite.sourceTruthReceipt;
    const provenance = sourceTruth?.provenance || {
      memoryIntelligenceSource: 'none', governanceSource: 'codex_memory',
      packagingSource: 'codex_memory', transportSource: 'secure_mcp_tunnel',
      fallbackStatus: 'blocked', resultCanBeMistakenForVcpNative: false
    };
    const results = composite.status === 'success'
      ? normalizeSearchResults(composite.recall).slice(0, maxItems) : [];
    const buckets = { mustKnow: [], decisions: [], blockers: [], risks: [], forbiddenAssumptions: [] };
    for (const [index, item] of results.entries()) {
      const projected = projectContextItem(item, index);
      const classification = classifyResult(item);
      const candidate = {
        statement: projected.statement,
        statementType: classification === 'recent_decisions' ? 'decision_candidate'
          : ['blockers', 'risks', 'forbidden_assumptions'].includes(classification)
            ? 'risk_candidate' : 'fact_candidate',
        relevance: projected.relevance,
        freshness: projected.freshness,
        reasonCodes: projected.reason_codes.map(code =>
          String(code).toUpperCase().replace(/[^A-Z0-9_]/g, '_')),
        sourceKinds: projected.source_kinds.map(kind =>
          String(kind).toLowerCase().replace(/[^a-z0-9_-]/g, '_'))
      };
      const target = { recent_decisions: 'decisions', blockers: 'blockers', risks: 'risks',
        forbidden_assumptions: 'forbiddenAssumptions' }[classification] || 'mustKnow';
      buckets[target].push(candidate);
    }
    return assembleChatGptWebContext({
      ...buckets,
      status: composite.status === 'success' ? results.length > 0 ? 'success' : 'empty' : 'unavailable',
      provenance,
      sourceTruth,
      auditReceipt: {
        aggregateReceiptDigest: composite.aggregateReceiptDigest || null,
        durableMemoryMutationCount: 0,
        operationalAuditWriteCount: 0,
        providerApiCalls: 0,
        externalNetworkCalls: 0
      }
    });
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
    if (recallRejected(searchResult)) {
      const rejected = buildRecallRejectedResponse(searchResult);
      enforceNoForbiddenOutputKeys(rejected);
      return rejected;
    }
    const results = normalizeSearchResults(searchResult).slice(0, maxItems);
    const selectedSourceRuntime = sourceRuntime(searchResult);
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
      if (isConflictResult(item)) {
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
      source_runtime: selectedSourceRuntime,
      reused_surfaces: selectedSourceRuntime === 'vcp_native'
        ? [...NATIVE_CONTEXT_SURFACES]
        : [...REUSED_SURFACES],
      experimental_heuristics: selectedSourceRuntime === 'vcp_native'
        ? []
        : [...EXPERIMENTAL_HEURISTICS],
      result_can_be_mistaken_for_native: false,
      overview_projection_mode: overview?.access?.mode || 'authenticated_bounded_overview',
      audit_projection_mode: audit?.access?.mode || 'audit_memory_readonly_bounded'
    };
    pkg.audit_receipt = buildAuditReceipt({ task, query, results, searchResult, overview, audit });

    const response = {
      status: 'PREPARE_MEMORY_CONTEXT_ACCEPTED',
      accepted: true,
      invocation_metadata: compositeInvocationMetadata(searchResult),
      memory_context_package: pkg,
      access: {
        mode: 'prepare_memory_context_readonly',
        selectedProjection: true,
        selectedProjectionVersion: 1,
        readOnly: true,
        lowDisclosure: true,
        durableMutationPerformed: Object.values(nativeRuntimeMutationFacts(searchResult)).some(Boolean),
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
        sourceRuntime: selectedSourceRuntime,
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
  buildMemoryContextLowDisclosureProjection,
  EXPERIMENTAL_HEURISTICS,
  FORBIDDEN_OUTPUT_KEYS,
  MemoryContextPackageService,
  NATIVE_CONTEXT_SURFACES,
  REUSED_SURFACES,
  enforceNoForbiddenOutputKeys,
  normalizeMemoryContextProjection
};
