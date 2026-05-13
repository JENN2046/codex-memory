const { getDiaryNameForTarget, getTargetForDiaryName } = require('../core/constants');

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

function normalizeStatusArray(statuses) {
  return [...new Set((Array.isArray(statuses) ? statuses : [])
    .map(value => String(value || '').trim().toLowerCase())
    .filter(Boolean))];
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
    const safeResults = Array.isArray(results) ? results.filter(Boolean) : [];
    const scopeApplied = !!scopeAudit?.scopeApplied;
    const scopeVisibility = normalizeScopeVisibility(scopeAudit?.scopeVisibility);

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
      scopeMode: scopeApplied ? (scopeAudit?.scopeMode || 'unknown') : 'none',
      scopeDimensions: normalizeScopeDimensions(scopeAudit?.scopeDimensions),
      scopeStrict: !!scopeAudit?.scopeStrict,
      scopeProjectId: scopeApplied ? (scopeAudit?.scopeProjectId || null) : null,
      scopeClientId: scopeApplied ? (scopeAudit?.scopeClientId || null) : null,
      scopeVisibility,
      scopeWorkspacePresent: !!scopeAudit?.scopeWorkspacePresent,
      readPolicyApplied: !!policyAudit.readPolicyApplied,
      lifecyclePolicyApplied: !!policyAudit.lifecyclePolicyApplied,
      lifecycleIncludedStatuses: normalizeStatusArray(policyAudit.lifecycleIncludedStatuses),
      lifecycleExcludedStatuses: normalizeStatusArray(policyAudit.lifecycleExcludedStatuses),
      hiddenByLifecycleCount: Number(policyAudit.hiddenByLifecycleCount || 0),
      staleResultCount: Number(policyAudit.staleResultCount || 0),
      lifecycleColumnAvailable: !!policyAudit.lifecycleColumnAvailable,
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

    const safeResults = Array.isArray(results) ? results.filter(Boolean) : [];
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
    const scopeApplied = !!scopeAudit?.scopeApplied;
    const scopeVisibility = normalizeScopeVisibility(scopeAudit?.scopeVisibility);

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
      scopeMode: scopeApplied ? (scopeAudit?.scopeMode || 'unknown') : 'none',
      scopeDimensions: normalizeScopeDimensions(scopeAudit?.scopeDimensions),
      scopeStrict: !!scopeAudit?.scopeStrict,
      scopeProjectId: scopeApplied ? (scopeAudit?.scopeProjectId || null) : null,
      scopeClientId: scopeApplied ? (scopeAudit?.scopeClientId || null) : null,
      scopeVisibility,
      scopeWorkspacePresent: !!scopeAudit?.scopeWorkspacePresent,
      fromCache: !!fromCache,
      source
    };
  }
}

module.exports = {
  RecallAuditService
};
