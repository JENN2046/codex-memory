const { getDiaryNameForTarget, getTargetForDiaryName } = require('../core/constants');
const { filterRecallIsolatedItems } = require('../core/RecallIsolationClassifier');

function normalizeTagArray(tags) {
  return [...new Set((Array.isArray(tags) ? tags : [])
    .map(tag => String(tag).trim())
    .filter(Boolean))];
}

function normalizeScopeDimensions(dimensions) {
  return [...new Set((Array.isArray(dimensions) ? dimensions : [])
    .map(value => String(value || '').trim())
    .filter(Boolean))];
}

function normalizeScopeVisibility(visibility) {
  return [...new Set((Array.isArray(visibility) ? visibility : [])
    .map(value => String(value || '').trim())
    .filter(Boolean))];
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function firstNormalizedString(...values) {
  for (const value of values) {
    const normalized = normalizeString(value);
    if (normalized) return normalized;
  }
  return '';
}

function firstDefinedValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function buildNormalizedScopeAudit(scopeAudit = null) {
  const safeAudit = scopeAudit && typeof scopeAudit === 'object' ? scopeAudit : {};
  const scopeApplied = !!firstDefinedValue(safeAudit.scopeApplied, safeAudit.scope_applied);

  return {
    scopeApplied,
    scopeMode: firstNormalizedString(safeAudit.scopeMode, safeAudit.scope_mode) || 'unknown',
    scopeDimensions: normalizeScopeDimensions(firstDefinedValue(safeAudit.scopeDimensions, safeAudit.scope_dimensions)),
    scopeStrict: !!firstDefinedValue(safeAudit.scopeStrict, safeAudit.scope_strict),
    scopeProjectId: firstNormalizedString(safeAudit.scopeProjectId, safeAudit.scope_project_id),
    scopeClientId: firstNormalizedString(safeAudit.scopeClientId, safeAudit.scope_client_id),
    scopeVisibility: normalizeScopeVisibility(firstDefinedValue(safeAudit.scopeVisibility, safeAudit.scope_visibility, safeAudit.visibility)),
    scopeWorkspacePresent: !!firstDefinedValue(safeAudit.scopeWorkspacePresent, safeAudit.scope_workspace_present)
  };
}

function normalizeStatusArray(statuses) {
  return [...new Set((Array.isArray(statuses) ? statuses : [])
    .map(value => String(value || '').trim().toLowerCase())
    .filter(Boolean))];
}

function normalizeNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function buildNormalizedPolicyAudit(policyAudit = null) {
  const safeAudit = policyAudit && typeof policyAudit === 'object' ? policyAudit : {};

  return {
    readPolicyApplied: !!firstDefinedValue(safeAudit.readPolicyApplied, safeAudit.read_policy_applied),
    lifecyclePolicyApplied: !!firstDefinedValue(safeAudit.lifecyclePolicyApplied, safeAudit.lifecycle_policy_applied),
    lifecycleIncludedStatuses: normalizeStatusArray(firstDefinedValue(
      safeAudit.lifecycleIncludedStatuses,
      safeAudit.lifecycle_included_statuses
    )),
    lifecycleExcludedStatuses: normalizeStatusArray(firstDefinedValue(
      safeAudit.lifecycleExcludedStatuses,
      safeAudit.lifecycle_excluded_statuses
    )),
    hiddenByLifecycleCount: normalizeNumber(firstDefinedValue(
      safeAudit.hiddenByLifecycleCount,
      safeAudit.hidden_by_lifecycle_count
    )),
    staleResultCount: normalizeNumber(firstDefinedValue(
      safeAudit.staleResultCount,
      safeAudit.stale_result_count
    )),
    lifecycleColumnAvailable: !!firstDefinedValue(
      safeAudit.lifecycleColumnAvailable,
      safeAudit.lifecycle_column_available
    )
  };
}

class RecallAuditService {
  constructor({ auditLogStore, config = null }) {
    this.auditLogStore = auditLogStore;
    this.config = config;
  }

  async record(payload = {}) {
    const entry = this.buildPayload(payload);
    if (!entry) return null;
    await this.auditLogStore.appendRecallAudit(entry);
    return entry;
  }

  async recordReadPolicySummary(payload = {}) {
    const entry = this.buildReadPolicyPayload(payload);
    if (!entry) return null;
    await this.auditLogStore.appendRecallAudit(entry);
    return entry;
  }

  buildReadPolicyPayload(options = {}) {
    const {
      target = 'both',
      results = [],
      source = 'mcp',
      scopeAudit = null,
      policyAudit = {}
    } = options;
    const safeResults = filterRecallIsolatedItems(Array.isArray(results) ? results.filter(Boolean) : []);
    const normalizedScopeAudit = buildNormalizedScopeAudit(scopeAudit);
    const normalizedPolicyAudit = buildNormalizedPolicyAudit(policyAudit);
    const { scopeApplied } = normalizedScopeAudit;

    return {
      timestamp: new Date().toISOString(),
      embeddingFingerprint: this.config?.embeddingFingerprint || null,
      dbName: getDiaryNameForTarget(target),
      target: target === 'both' ? 'both' : getTargetForDiaryName(getDiaryNameForTarget(target)),
      recallType: 'read-policy',
      resultCount: safeResults.length,
      topMemoryId: safeResults[0]?.memoryId || null,
      memoryIds: [...new Set(safeResults.map(result => result.memoryId).filter(Boolean))],
      scopeApplied,
      scopeMode: scopeApplied ? normalizedScopeAudit.scopeMode : 'none',
      scopeDimensions: normalizedScopeAudit.scopeDimensions,
      scopeStrict: normalizedScopeAudit.scopeStrict,
      scopeProjectId: scopeApplied ? (normalizedScopeAudit.scopeProjectId || null) : null,
      scopeClientId: scopeApplied ? (normalizedScopeAudit.scopeClientId || null) : null,
      scopeVisibility: normalizedScopeAudit.scopeVisibility,
      scopeWorkspacePresent: normalizedScopeAudit.scopeWorkspacePresent,
      readPolicyApplied: normalizedPolicyAudit.readPolicyApplied,
      lifecyclePolicyApplied: normalizedPolicyAudit.lifecyclePolicyApplied,
      lifecycleIncludedStatuses: normalizedPolicyAudit.lifecycleIncludedStatuses,
      lifecycleExcludedStatuses: normalizedPolicyAudit.lifecycleExcludedStatuses,
      hiddenByLifecycleCount: normalizedPolicyAudit.hiddenByLifecycleCount,
      staleResultCount: normalizedPolicyAudit.staleResultCount,
      lifecycleColumnAvailable: normalizedPolicyAudit.lifecycleColumnAvailable,
      source
    };
  }

  buildPayload(options = {}) {
    const {
      target,
      recallType = 'snippet',
      results = [],
      queryAnalysis = {},
      directives = {},
      searchPlan = {},
      rerankMeta = {},
      source = 'mcp',
      fromCache = false,
      contextState = null,
      scopeAudit = null
    } = options;

    const safeResults = filterRecallIsolatedItems(Array.isArray(results) ? results.filter(Boolean) : []);
    if (safeResults.length === 0) return null;

    const dbName = getDiaryNameForTarget(target);
    const topResult = safeResults[0];
    const matchedTags = normalizeTagArray(safeResults.flatMap(result => result.matchedTags || []));
    const coreTags = normalizeTagArray([
      ...safeResults.flatMap(result => result.coreTags || []),
      ...(queryAnalysis.coreTags || [])
    ]);
    const sourceKinds = [...new Set(safeResults.flatMap(result => result.sourceKinds || []).filter(Boolean))];
    const sourceFiles = [...new Set(safeResults.map(result => result.sourceFile).filter(Boolean))];
    const queryAxes = Array.isArray(queryAnalysis.metrics?.dominantAxes)
      ? queryAnalysis.metrics.dominantAxes.slice(0, 4).map(axis => axis.label)
      : [];
    const normalizedScopeAudit = buildNormalizedScopeAudit(scopeAudit);
    const { scopeApplied } = normalizedScopeAudit;

    return {
      timestamp: new Date().toISOString(),
      embeddingFingerprint: this.config?.embeddingFingerprint || null,
      dbName,
      target: getTargetForDiaryName(dbName),
      recallType,
      resultCount: safeResults.length,
      candidateCount: Number(searchPlan.semanticCandidateCount || 0) + Number(searchPlan.timeCandidateCount || 0),
      semanticCandidateCount: Number(searchPlan.semanticCandidateCount || 0),
      timeCandidateCount: Number(searchPlan.timeCandidateCount || 0),
      topScore: Number.isFinite(topResult.score) ? Number(topResult.score.toFixed(6)) : null,
      topMemoryId: topResult.memoryId || null,
      topMatchedTags: normalizeTagArray(topResult.matchedTags || []),
      matchedTags,
      coreTags,
      topSourceFile: topResult.sourceFile || null,
      memoryIds: [...new Set(safeResults.map(result => result.memoryId).filter(Boolean))],
      sourceFiles,
      sourceKinds,
      contentLength: safeResults.reduce((sum, result) => sum + String(result.content || result.snippet || '').length, 0),
      useTime: !!(directives.time || (queryAnalysis.timeRanges || []).length > 0),
      useGroup: !!directives.group,
      useRerank: !!(directives.rerank || directives.rerankplus !== undefined),
      useGeodesicRerank: !!directives.geodesicrerank,
      useRerankPlus: directives.rerankplus !== undefined,
      rrfAlpha: directives.rerankplus !== undefined ? Number(directives.rerankplus) : null,
      rerankMode: rerankMeta.mode || 'none',
      rerankSuccessRate: rerankMeta.successRate ?? null,
      metaThinkingScore: Number.isFinite(queryAnalysis.metaThinking?.score) ? queryAnalysis.metaThinking.score : null,
      metaThinkingAuto: !!queryAnalysis.metaThinking?.auto,
      metaThinkingReasons: Array.isArray(queryAnalysis.metaThinking?.reasons) ? queryAnalysis.metaThinking.reasons : [],
      queryAxes,
      contextVectorUsed: !!contextState?.available,
      contextSourceKinds: Array.isArray(contextState?.sourceKinds) ? contextState.sourceKinds : [],
      contextSegmentCount: Number(contextState?.segmentCount || 0),
      contextLogicDepth: Number.isFinite(contextState?.logicDepth) ? contextState.logicDepth : null,
      contextSemanticWidth: Number.isFinite(contextState?.semanticWidth) ? contextState.semanticWidth : null,
      contextBlendWeight: Number.isFinite(contextState?.blendWeight) ? contextState.blendWeight : null,
      scopeApplied,
      scopeMode: scopeApplied ? normalizedScopeAudit.scopeMode : 'none',
      scopeDimensions: normalizedScopeAudit.scopeDimensions,
      scopeStrict: normalizedScopeAudit.scopeStrict,
      scopeProjectId: scopeApplied ? (normalizedScopeAudit.scopeProjectId || null) : null,
      scopeClientId: scopeApplied ? (normalizedScopeAudit.scopeClientId || null) : null,
      scopeVisibility: normalizedScopeAudit.scopeVisibility,
      scopeWorkspacePresent: normalizedScopeAudit.scopeWorkspacePresent,
      fromCache: !!fromCache,
      source
    };
  }
}

module.exports = {
  RecallAuditService
};
