const crypto = require('node:crypto');

const { createConfig } = require('./config/createConfig');
const { ExecutionContextResolver } = require('./core/ExecutionContextResolver');
const { buildInternalRuntimeEntryPayload } = require('./core/InternalRuntimeEntryGate');
const { RecallEnhancer } = require('./core/RecallEnhancer');
const { MemoryWriteService } = require('./core/MemoryWriteService');
const { MemoryWriteReconcileService } = require('./core/MemoryWriteReconcileService');
const { MemoryWriteReconcileWorker } = require('./core/MemoryWriteReconcileWorker');
const { ValidateMemoryService } = require('./core/ValidateMemoryService');
const { TombstoneMemoryService } = require('./core/TombstoneMemoryService');
const { SupersedeMemoryService } = require('./core/SupersedeMemoryService');
const { MemoryLifecycleProjectionCleanupService } = require('./core/MemoryLifecycleProjectionCleanupService');
const { DeferredGovernanceRuntimeEntryAdapter } = require('./core/DeferredGovernanceRuntimeEntryAdapter');
const { PassiveRecallService } = require('./core/PassiveRecallService');
const { ActiveRecallService } = require('./core/ActiveRecallService');
const { MemoryOverviewService } = require('./core/MemoryOverviewService');
const {
  buildMemoryContextLowDisclosureProjection,
  MemoryContextPackageService
} = require('./core/MemoryContextPackageService');
const { GovernedRecallGateway } = require('./core/GovernedRecallGateway');
const { GovernedReadFacade } = require('./core/GovernedReadFacade');
const { TaskStartMemoryContextWorkflow } = require('./core/TaskStartMemoryContextWorkflow');
const { MemoryDeltaProposalService } = require('./core/MemoryDeltaProposalService');
const {
  ACCESS_MODE: AUDIT_MEMORY_ACCESS_MODE,
  AuditMemoryReadonlyService,
  SERVICE_STATUS_ACCEPTED: AUDIT_MEMORY_SERVICE_STATUS_ACCEPTED
} = require('./core/AuditMemoryReadonlyService');
const {
  runSearchMemoryWithTimeout,
  throwIfSearchMemoryAborted
} = require('./core/SearchMemoryTimeoutPolicy');
const { DiaryStore } = require('./storage/DiaryStore');
const { SqliteShadowStore } = require('./storage/SqliteShadowStore');
const { VectorIndexStore } = require('./storage/VectorIndexStore');
const { ChatHistoryIndexStore } = require('./storage/ChatHistoryIndexStore');
const { AuditLogStore } = require('./storage/AuditLogStore');
const { CandidateCacheStore } = require('./storage/CandidateCacheStore');
const { CompatibilitySyntaxAdapter } = require('./adapters/vcp-passive-memory/CompatibilitySyntaxAdapter');
const { VcpPassiveMemoryAdapter } = require('./adapters/vcp-passive-memory');
const { VcpActiveMemoryAdapter } = require('./adapters/vcp-active-memory');
const { VcpLightMemoryAdapter } = require('./adapters/vcp-light-memory');
const { TimeExpressionParser } = require('./recall/TimeExpressionParser');
const { TagMemoEngine } = require('./recall/TagMemoEngine');
const { ResultDeduplicator } = require('./recall/ResultDeduplicator');
const { SemanticGroupManager } = require('./recall/SemanticGroupManager');
const { ChunkIndexingService } = require('./recall/ChunkIndexingService');
const { CandidateGenerator } = require('./recall/CandidateGenerator');
const { ContextVectorManager } = require('./recall/ContextVectorManager');
const { ExternalEmbeddingAdapter } = require('./recall/ExternalEmbeddingAdapter');
const { ExternalRerankAdapter } = require('./recall/ExternalRerankAdapter');
const { RerankService } = require('./recall/RerankService');
const { RecallAuditService } = require('./recall/RecallAuditService');
const { KnowledgeBaseSyncService } = require('./recall/KnowledgeBaseSyncService');
const { KnowledgeBaseRecallPipeline } = require('./recall/KnowledgeBaseRecallPipeline');
const {
  filterRecallCandidatesByLifecycleScope,
  normalizeScopeFields
} = require('./core/MemoryLifecycleScopeGovernanceContract');
const {
  buildRecordMemoryPrincipalScopeAuthorizationRuntime
} = require('./core/RecordMemoryPrincipalScopeAuthorizationConfig');
const {
  buildGovernedMcpVcpNativeBridgeGateInput
} = require('./core/GovernedMcpVcpNativeBridgeRequestProjection');
const {
  REQUIRED_ACCESS_PATH,
  REQUIRED_PRIMARY_RUNTIME,
  validateGovernedMcpOverviewStatusCoversCurrentProductGoal
} = require('./core/CurrentProductGoalContract');
const {
  validateGovernedMcpVcpNativeBridgeGate
} = require('./core/GovernedMcpVcpNativeBridgeGate');
const {
  buildGovernedMcpVcpNativeReadOnlyProbeAdapter,
  executeGovernedMcpVcpNativeReadShapeProbe
} = require('./core/GovernedMcpVcpNativeReadOnlyProbeAdapter');
const {
  resolveGovernedMcpVcpNativeReadShapeProbeTarget
} = require('./core/GovernedMcpVcpNativeReadShapeProbeTargetResolver');
const {
  createGovernedMcpVcpNativeHttpMcpToolCaller,
  createGovernedMcpVcpNativeHttpMcpClientInvoker
} = require('./core/GovernedMcpVcpNativeHttpMcpClientInvoker');
const {
  getGovernedMcpVcpNativeHttpMcpTargetPrivateConfig
} = require('./core/GovernedMcpVcpNativeHttpMcpTargetConfig');
const {
  SCOPE_FILTERING_REQUIRED_VISIBILITIES,
  executeGovernedMcpVcpNativeReadDelegation
} = require('./core/GovernedMcpVcpNativeReadDelegationAdapter');
const {
  executeGovernedMcpVcpNativeWriteDelegation
} = require('./core/GovernedMcpVcpNativeWriteDelegationAdapter');
const {
  attachBridgeAuditReceiptStatus,
  recordGovernedMcpVcpNativeBridgeAuditReceipt,
  recordGovernedMcpVcpNativeReadFallbackAuditReceipt
} = require('./core/GovernedMcpVcpNativeBridgeAuditReceiptRecorder');
const {
  isSafeReferenceName
} = require('./core/VcpToolBoxSafeReference');
const {
  SOURCE_AUTHORITY
} = require('./core/GovernedMcpVcpNativeRuntimeTargetConfig');
const {
  buildGovernedNativeBridgeAuditMemoryDecisionProvider
} = require('./core/GovernedNativeBridgeAuditMemoryProjection');
const {
  GOVERNED_NATIVE_READ_CLIENTS,
  GOVERNED_NATIVE_VISIBILITIES
} = require('./core/MemoryAccessContract');

const GOVERNED_MCP_VCP_NATIVE_FALLBACK_VISIBILITIES = GOVERNED_NATIVE_VISIBILITIES;
const GOVERNED_MCP_VCP_NATIVE_CONTEXT_SOURCE = 'trusted_execution_context_or_transport';

function normalizeScopeVisibility(value) {
  if (Array.isArray(value)) {
    return [...new Set(value
      .map(item => String(item || '').trim())
      .filter(Boolean))];
  }

  const normalized = String(value || '').trim();
  return normalized ? [normalized] : [];
}

function buildScopeCandidateFilters(scope) {
  if (!scope || typeof scope !== 'object') {
    return {};
  }

  const scopeId = typeof scope.scope_id === 'string'
    ? scope.scope_id.trim()
    : typeof scope.scopeId === 'string'
      ? scope.scopeId.trim()
      : '';
  const projectId = typeof scope.project_id === 'string' ? scope.project_id.trim() : '';
  const workspaceId = typeof scope.workspace_id === 'string' ? scope.workspace_id.trim() : '';
  const clientId = typeof scope.client_id === 'string' ? scope.client_id.trim() : '';
  const visibility = normalizeScopeVisibility(scope.visibility);

  return {
    ...(scopeId ? { scopeId } : {}),
    ...(projectId ? { projectId } : {}),
    ...(workspaceId ? { workspaceId } : {}),
    ...(clientId ? { clientId } : {}),
    ...(visibility.length > 0 ? { visibility } : {})
  };
}

function buildScopeAuditContext(scope) {
  const filters = buildScopeCandidateFilters(scope);
  const scopeDimensions = [
    filters.scopeId ? 'scope_id' : null,
    filters.projectId ? 'project_id' : null,
    filters.workspaceId ? 'workspace_id' : null,
    filters.clientId ? 'client_id' : null,
    Array.isArray(filters.visibility) && filters.visibility.length > 0 ? 'visibility' : null
  ].filter(Boolean);
  const scopeApplied = scopeDimensions.length > 0;

  return {
    scopeApplied,
    scopeMode: scopeApplied ? 'sql-candidate+post-filter' : 'none',
    scopeDimensions,
    scopeStrict: !!scope?.strict,
    scopeIdPresent: !!filters.scopeId,
    scopeProjectId: filters.projectId || null,
    scopeClientId: filters.clientId || null,
    scopeVisibility: filters.visibility || [],
    scopeWorkspacePresent: !!filters.workspaceId
  };
}

async function applyScopeFilter(results, scope, shadowStore) {
  const filters = buildScopeCandidateFilters(scope);
  const hasScope = !!(filters.scopeId
    || filters.projectId
    || filters.workspaceId
    || filters.clientId
    || (Array.isArray(filters.visibility) && filters.visibility.length > 0));

  if (!hasScope || !Array.isArray(results) || results.length === 0) {
    return results;
  }

  const memoryIds = [...new Set(results.map(item => normalizeResultMemoryId(item)).filter(Boolean))];
  const scopeMap = memoryIds.length > 0
    ? await shadowStore.getRecordsScopeMap(memoryIds)
    : new Map();

  return results.filter(item => {
    const memoryId = normalizeResultMemoryId(item);
    const recordScope = scopeMap.get(memoryId) || {};

    if (filters.scopeId && recordScope.scopeId !== filters.scopeId) return false;
    if (filters.projectId && recordScope.projectId !== filters.projectId) return false;
    if (filters.workspaceId && recordScope.workspaceId !== filters.workspaceId) return false;
    if (filters.clientId && recordScope.clientId !== filters.clientId) return false;
    if (Array.isArray(filters.visibility) && filters.visibility.length > 0 && !filters.visibility.includes(recordScope.visibility)) {
      return false;
    }

    return true;
  });
}

function inferRequestClientId(requestContext = {}) {
  const executionContext = requestContext.executionContext && typeof requestContext.executionContext === 'object'
    ? requestContext.executionContext
    : null;
  if (!executionContext) {
    return null;
  }
  const candidates = [
    executionContext.clientId,
    executionContext.client_id,
    executionContext.agentAlias,
    executionContext.agentId
  ];

  for (const candidate of candidates) {
    const normalized = String(candidate || '').trim().toLowerCase();
    if (normalized.startsWith('codex')) return 'codex';
    if (normalized.startsWith('claude')) return 'claude';
    if (normalized.startsWith('omc')) return 'omc';
    if (normalized === 'manual') return 'manual';
  }

  return null;
}

const LIFECYCLE_SCOPE_GOVERNANCE_SUPPORTED_FIELDS = Object.freeze([
  'projectId',
  'workspaceId',
  'clientId',
  'taskId',
  'conversationId',
  'visibility',
  'retentionPolicy'
]);

const INTERNAL_TRUE_LIVE_RECALL_SOURCE = 'internal-true-live-recall-readonly-proof-runner';
const INTERNAL_VALIDATE_RUNTIME_ENTRY_SOURCE = 'internal-validate-runtime-entry';
const INTERNAL_TOMBSTONE_RUNTIME_ENTRY_SOURCE = 'internal-tombstone-runtime-entry';
const INTERNAL_SUPERSEDE_RUNTIME_ENTRY_SOURCE = 'internal-supersede-runtime-entry';
const INTERNAL_PRECISION_POLICY_ALLOWED_KEYS = new Set([
  'enabled',
  'queryFamily',
  'proofNoResultMode',
  'minimumScore',
  'highConfidenceScore'
]);

function assertInternalTrueLiveRecallContext(requestContext = {}, fieldName = 'internal execution context') {
  const executionContext = requestContext.executionContext || {};
  if (
    requestContext.noTokenReadOnly !== true
    || executionContext.requestSource !== INTERNAL_TRUE_LIVE_RECALL_SOURCE
  ) {
    throw new Error(`${fieldName} requires the approved true live recall runner path`);
  }
  return executionContext;
}

function normalizeInternalPrecisionPolicyContext(requestContext = {}) {
  const executionContext = requestContext.executionContext || {};
  if (!Object.prototype.hasOwnProperty.call(executionContext, 'precisionPolicyContext')) {
    return null;
  }

  assertInternalTrueLiveRecallContext(requestContext, 'internal precision policy context');

  const context = executionContext.precisionPolicyContext;
  if (context === null) {
    return null;
  }
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    throw new Error('internal precision policy context must be an object');
  }

  const unknownKeys = Object.keys(context).filter(key => !INTERNAL_PRECISION_POLICY_ALLOWED_KEYS.has(key));
  if (unknownKeys.length > 0) {
    throw new Error(`internal precision policy context has unsupported keys: ${unknownKeys.join(', ')}`);
  }
  if (context.enabled !== true) {
    throw new Error('internal precision policy context must enable the precision policy');
  }

  const normalized = {
    enabled: true
  };

  if (Object.prototype.hasOwnProperty.call(context, 'queryFamily')) {
    const queryFamily = String(context.queryFamily || '').trim();
    if (!queryFamily) {
      throw new Error('internal precision policy context queryFamily must be a non-empty string');
    }
    normalized.queryFamily = queryFamily;
  }

  if (Object.prototype.hasOwnProperty.call(context, 'proofNoResultMode')) {
    if (typeof context.proofNoResultMode !== 'boolean') {
      throw new Error('internal precision policy context proofNoResultMode must be boolean');
    }
    normalized.proofNoResultMode = context.proofNoResultMode;
  }

  for (const numericField of ['minimumScore', 'highConfidenceScore']) {
    if (!Object.prototype.hasOwnProperty.call(context, numericField)) continue;
    const value = Number(context[numericField]);
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`internal precision policy context ${numericField} must be a finite non-negative number`);
    }
    normalized[numericField] = value;
  }

  return Object.freeze(normalized);
}

function normalizeInternalNoRawContentRead(requestContext = {}) {
  const executionContext = requestContext.executionContext || {};
  if (
    requestContext.authenticatedBoundedSearch === true
    || requestContext.memoryContextPackageReadOnly === true
  ) {
    return true;
  }
  if (!Object.prototype.hasOwnProperty.call(executionContext, 'noRawContentRead')) {
    return false;
  }

  assertInternalTrueLiveRecallContext(requestContext, 'internal noRawContentRead context');
  if (executionContext.noRawContentRead !== true) {
    throw new Error('internal noRawContentRead context must be true');
  }
  return true;
}

function isAuthenticatedBoundedSearchRequest(requestContext = {}) {
  return requestContext.authenticatedBoundedSearch === true;
}

function isHighEntropyNegativeControlQuery(query) {
  const normalized = String(query || '').trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+){3,}$/.test(normalized)) {
    return false;
  }

  const segments = normalized.split('-');
  const alnumLength = segments.join('').length;
  return segments.length >= 4
    && alnumLength >= 22
    && segments.some(segment => /\d/.test(segment))
    && segments.every(segment => segment.length >= 3);
}

function buildAuthenticatedBoundedSearchPrecisionPolicyContext(args = {}, requestContext = {}) {
  if (!isAuthenticatedBoundedSearchRequest(requestContext)) {
    return null;
  }
  if ((args.target || 'both') !== 'both') {
    return null;
  }
  if (Number(args.limit) !== 1) {
    return null;
  }
  if (args.include_content === true) {
    return null;
  }
  if (!isHighEntropyNegativeControlQuery(args.query)) {
    return null;
  }

  return Object.freeze({
    enabled: true,
    queryFamily: 'authenticated_bounded_high_entropy_negative_control',
    proofNoResultMode: true,
    minimumScore: 0.12,
    highConfidenceScore: 0.62
  });
}

function projectBoundedSearchResult(item = {}) {
  return {
    target: item.target || null,
    score: Number.isFinite(item.score) ? item.score : null,
    baseScore: Number.isFinite(item.baseScore) ? item.baseScore : null,
    rerankScore: Number.isFinite(item.rerankScore) ? item.rerankScore : null,
    titleHitCount: Number(item.titleHitCount || 0),
    tagHitCount: Number(item.tagHitCount || 0),
    contentHitCount: Number(item.contentHitCount || 0),
    evidenceHitCount: Number(item.evidenceHitCount || 0),
    exactCoreTagCount: Number(item.exactCoreTagCount || 0),
    tagMemoSurfaceScore: Number(item.tagMemoSurfaceScore || 0),
    dynamicCoreWeight: Number(item.dynamicCoreWeight || 0),
    sourceKinds: Array.isArray(item.sourceKinds)
      ? [...new Set(item.sourceKinds.map(value => String(value || '').trim()).filter(Boolean))]
      : []
  };
}

function projectAuthenticatedBoundedSearchResponse(results = []) {
  const safeResults = Array.isArray(results) ? results.map(projectBoundedSearchResult) : [];
  return {
    access: {
      mode: 'authenticated_bounded_search',
      selectedProjection: true,
      selectedProjectionVersion: 1,
      includeContent: false,
      rawContentReturned: false,
      pathsReturned: false,
      memoryIdsReturned: false,
      titlesReturned: false,
      snippetsReturned: false
    },
    resultCount: safeResults.length,
    results: safeResults
  };
}

function projectMemoryContextPackageSearchResult(item = {}, index = 0) {
  const projectTokens = values => Array.isArray(values)
    ? [...new Set(values
      .filter(value => typeof value === 'string')
      .map(value => value.trim().slice(0, 80))
      .filter(Boolean))].slice(0, 16)
    : [];
  const projectTimestamp = value => {
    if (typeof value !== 'string') return null;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
  };
  return {
    ...projectBoundedSearchResult(item),
    matchedTags: projectTokens(item.matchedTags),
    coreTags: projectTokens(item.coreTags),
    createdAt: projectTimestamp(item.createdAt),
    updatedAt: projectTimestamp(item.updatedAt),
    memoryContextProjection: buildMemoryContextLowDisclosureProjection(item, index)
  };
}

function projectMemoryContextPackageSearchResponse(results = []) {
  const safeResults = Array.isArray(results)
    ? results.map(projectMemoryContextPackageSearchResult)
    : [];
  return {
    access: {
      mode: 'memory_context_package_metadata_search',
      selectedProjection: true,
      selectedProjectionVersion: 1,
      includeContent: false,
      rawContentReturned: false,
      pathsReturned: false,
      memoryIdsReturned: false,
      titlesReturned: false,
      snippetsReturned: false
    },
    resultCount: safeResults.length,
    results: safeResults
  };
}

function buildAuthenticatedBoundedSearchRejected(reason) {
  return {
    decision: 'rejected',
    reason,
    access: {
      mode: 'authenticated_bounded_search',
      selectedProjection: true,
      includeContent: false,
      rawContentReturned: false
    },
    results: []
  };
}

function normalizeScopeValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeResultMemoryId(item = {}) {
  return firstScopeValue(item?.memoryId, item?.memory_id);
}

function buildInternalValidateRuntimePayload(args = {}, requestContext = {}, { enabled = false } = {}) {
  return buildInternalRuntimeEntryPayload(args, requestContext, {
    enabled,
    requestSource: INTERNAL_VALIDATE_RUNTIME_ENTRY_SOURCE,
    contextFlag: 'internalValidateRuntimeEntry',
    entryLabel: 'validate',
    fallbackActorClientId: inferRequestClientId(requestContext),
    requiredStringFields: [
      { name: 'memory_id', keys: ['memory_id', 'memoryId'] },
      { name: 'reason', keys: ['reason'] },
      { name: 'evidence', keys: ['evidence'] }
    ]
  });
}

function buildInternalTombstoneRuntimePayload(args = {}, requestContext = {}, { enabled = false } = {}) {
  return buildInternalRuntimeEntryPayload(args, requestContext, {
    enabled,
    requestSource: INTERNAL_TOMBSTONE_RUNTIME_ENTRY_SOURCE,
    contextFlag: 'internalTombstoneRuntimeEntry',
    entryLabel: 'tombstone',
    fallbackActorClientId: inferRequestClientId(requestContext),
    requiredStringFields: [
      { name: 'memory_id', keys: ['memory_id', 'memoryId'] },
      { name: 'reason', keys: ['reason'] },
      { name: 'evidence', keys: ['evidence'] },
      { name: 'tombstone_reason', keys: ['tombstone_reason', 'tombstoneReason'] }
    ]
  });
}

function buildInternalSupersedeRuntimePayload(args = {}, requestContext = {}, { enabled = false } = {}) {
  return buildInternalRuntimeEntryPayload(args, requestContext, {
    enabled,
    requestSource: INTERNAL_SUPERSEDE_RUNTIME_ENTRY_SOURCE,
    contextFlag: 'internalSupersedeRuntimeEntry',
    entryLabel: 'supersede',
    fallbackActorClientId: inferRequestClientId(requestContext),
    requiredStringFields: [
      { name: 'old_memory_id', keys: ['old_memory_id', 'oldMemoryId'] },
      { name: 'new_memory_id', keys: ['new_memory_id', 'newMemoryId'] },
      { name: 'reason', keys: ['reason'] },
      { name: 'evidence', keys: ['evidence'] },
      { name: 'supersedes_link', keys: ['supersedes_link', 'supersedesLink'] },
      { name: 'superseded_by_link', keys: ['superseded_by_link', 'supersededByLink'] }
    ]
  });
}

function buildPublicControlledMutationAccess() {
  return {
    mode: 'controlled_mutation_public_bounded',
    selectedProjection: true,
    selectedProjectionVersion: 1,
    rawMemoryReturned: false,
    rawAuditReturned: false,
    filesystemPathsReturned: false,
    tokenMaterialReturned: false,
    providerPayloadReturned: false,
    memoryContentReturned: false,
    memoryIdsReturned: false,
    titlesReturned: false,
    snippetsReturned: false
  };
}

function buildPublicControlledMutationPolicy() {
  return {
    lifecyclePolicyExplained: true,
    scopePolicyExplained: true,
    redactionApplied: true,
    lowDisclosureProjection: true,
    dryRunOnlyPublicPath: true,
    confirmedMutationRequiresSeparateApproval: true,
    rawStoreScanned: false,
    providerCalled: false,
    bearerTokenUsed: false,
    durableMutationPerformed: false,
    readinessClaimed: false,
    rcReadyClaimed: false
  };
}

function buildPublicControlledMutationConfirmGate(args = {}) {
  return {
    dryRunRequested: args.dry_run !== false,
    confirmRequested: args.confirm === true,
    confirmAccepted: false,
    confirmedMutationAllowed: false,
    mutationApprovalRequired: true
  };
}

function buildPublicControlledMutationActorContext(requestContext = {}) {
  const actorClientId = inferRequestClientId(requestContext);
  return {
    ok: Boolean(actorClientId),
    actorClientId,
    reason: actorClientId
      ? null
      : 'public controlled mutation dry-run requires a request context bound actor client id.'
  };
}

function sanitizePublicControlledMutationReason(reason) {
  const normalized = String(reason || '');
  if (/cross-client|private/i.test(normalized)) {
    return 'public controlled mutation dry-run rejected by privacy gate.';
  }
  return reason || null;
}

function projectPublicControlledMutationResult(toolName, result = {}, args = {}) {
  const safeReason = sanitizePublicControlledMutationReason(result.reason)
    || 'public controlled mutation dry-run requires separate exact review.';
  return {
    accepted: false,
    decision: 'rejected',
    tool: toolName,
    dryRun: true,
    mutated: false,
    reasonCode: 'public_dry_run_low_disclosure',
    reason: safeReason,
    access: buildPublicControlledMutationAccess(),
    policy: buildPublicControlledMutationPolicy(),
    confirmGate: buildPublicControlledMutationConfirmGate(args),
    approvalRequired: true,
    readinessClaimed: false,
    rcReadyClaimed: false
  };
}

function buildPublicControlledMutationRejectedResult(toolName, args = {}, reason) {
  return projectPublicControlledMutationResult(toolName, {
    decision: 'rejected',
    reason
  }, args);
}

function buildGovernedMcpVcpNativeBridgeRejectedToolResult(gateResult = {}) {
  return {
    decision: 'rejected',
    reasonCode: 'governed_mcp_vcp_native_bridge_gate_rejected',
    reason: 'MCP tool call rejected by governed VCPToolBox native bridge preflight.',
    access: {
      mode: 'governed_mcp_vcp_native_bridge_gate',
      selectedProjection: true,
      lowDisclosure: true,
      rawOutputReturned: false,
      runtimeCalled: false,
      vcpToolBoxCalled: false,
      mcpToolCalled: false,
      memoryReadPerformed: false,
      memoryWritePerformed: false,
      localMemoryRole: 'not_used',
      localMemoryFallbackAttempted: false,
      localMemoryFallbackUsed: false,
      localMemoryFallbackReadPerformed: false,
      localMemoryFallbackReturned: false
    },
    gate: gateResult.lowDisclosureRejection || {
      code: 'governed_mcp_vcp_native_bridge_gate_rejected',
      lowDisclosure: true,
      blockers: gateResult.blockers || []
    },
    readinessClaimed: false
  };
}

const GOVERNED_MCP_VCP_NATIVE_READ_DELEGATION_TOOLS = Object.freeze([
  'search_memory',
  'memory_overview',
  'audit_memory'
]);

const GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATION_TOOLS = Object.freeze([
  'record_memory',
  'tombstone_memory',
  'supersede_memory'
]);

function isGovernedMcpVcpNativeReadDelegationTool(toolName) {
  return GOVERNED_MCP_VCP_NATIVE_READ_DELEGATION_TOOLS.includes(toolName);
}

function isGovernedMcpVcpNativeWriteDelegationTool(toolName) {
  return GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATION_TOOLS.includes(toolName);
}

function isGovernedMcpVcpNativeBridgeTool(toolName) {
  return isGovernedMcpVcpNativeReadDelegationTool(toolName) ||
    isGovernedMcpVcpNativeWriteDelegationTool(toolName);
}

function governedMcpVcpNativeDelegationRequested(config = {}, toolName = '') {
  return (
    isGovernedMcpVcpNativeReadDelegationTool(toolName) &&
    config.governedMcpVcpNativeReadDelegationMode !== 'off'
  ) || (
    isGovernedMcpVcpNativeWriteDelegationTool(toolName) &&
    config.governedMcpVcpNativeWriteDelegationMode !== 'off'
  );
}

function shouldSkipGovernedMcpVcpNativeReadDelegationForUnmappedAction(config = {}, toolName = '') {
  if (!isGovernedMcpVcpNativeReadDelegationTool(toolName)) return false;
  const target = config.governedMcpVcpNativeHttpMcpTarget || {};
  if (target.mcpToolNameByActionConfigured !== true) return false;
  const toolNameByAction = target.mcpToolNameByAction || {};
  return !Object.prototype.hasOwnProperty.call(toolNameByAction, toolName);
}

function buildGovernedMcpVcpNativeDelegationRequiresGateRejection(toolName = '') {
  const blockers = ['native_delegation_requires_bridge_gate_mode_not_off'];
  return buildGovernedMcpVcpNativeBridgeRejectedToolResult({
    accepted: false,
    blockers,
    lowDisclosureRejection: {
      reason: 'native_delegation_not_governed',
      code: 'governed_mcp_vcp_native_delegation_requires_bridge_gate',
      lowDisclosure: true,
      blockers,
      direction: isGovernedMcpVcpNativeWriteDelegationTool(toolName) ? 'write' : 'read'
    }
  });
}

function buildGovernedMcpVcpNativeWriteDelegationRequiredRejection() {
  const blockers = ['native_write_delegation_required_for_governed_write_tool'];
  return buildGovernedMcpVcpNativeBridgeRejectedToolResult({
    accepted: false,
    blockers,
    lowDisclosureRejection: {
      reason: 'native_write_delegation_not_configured',
      code: 'governed_mcp_vcp_native_write_delegation_required',
      lowDisclosure: true,
      blockers,
      direction: 'write'
    }
  });
}

function buildChatGptWebReadOnlyDelegationRequiredRejection() {
  const blockers = ['chatgpt_web_requires_strict_primary_native_read_delegation'];
  return buildGovernedMcpVcpNativeBridgeRejectedToolResult({
    accepted: false,
    blockers,
    lowDisclosureRejection: {
      reason: 'chatgpt_web_read_only_principal_not_bound',
      code: 'chatgpt_web_strict_primary_native_read_required',
      lowDisclosure: true,
      blockers,
      direction: 'read'
    }
  });
}

function buildGovernedMcpVcpNativeReadShapeProbeInvokerRegistry(config = {}, overrides = {}) {
  const registry = new Map();
  const configuredTarget = config.governedMcpVcpNativeRuntimeTarget || {};
  const inputRegistry = overrides.governedMcpVcpNativeReadShapeProbeInvokerRegistry;
  const httpMcpTarget = overrides.governedMcpVcpNativeReadShapeProbeHttpMcpTarget ||
    getGovernedMcpVcpNativeHttpMcpTargetPrivateConfig(config);

  if (inputRegistry instanceof Map) {
    for (const [referenceName, invoker] of inputRegistry.entries()) {
      registry.set(referenceName, invoker);
    }
  } else if (inputRegistry && typeof inputRegistry === 'object' && !Array.isArray(inputRegistry)) {
    for (const [referenceName, invoker] of Object.entries(inputRegistry)) {
      registry.set(referenceName, invoker);
    }
  }

  if (
    typeof overrides.governedMcpVcpNativeReadShapeProbeInvoker === 'function' &&
    typeof configuredTarget.targetReferenceName === 'string' &&
    configuredTarget.targetReferenceName.trim()
  ) {
    registry.set(configuredTarget.targetReferenceName, overrides.governedMcpVcpNativeReadShapeProbeInvoker);
  }

  if (httpMcpTarget && typeof httpMcpTarget === 'object' && !Array.isArray(httpMcpTarget)) {
    const targetReferenceName = typeof httpMcpTarget.targetReferenceName === 'string'
      ? httpMcpTarget.targetReferenceName
      : configuredTarget.targetReferenceName;
    const httpInvoker = createGovernedMcpVcpNativeHttpMcpClientInvoker({
      ...httpMcpTarget,
      targetReferenceName
    });
    if (httpInvoker.accepted === true) {
      registry.set(targetReferenceName, httpInvoker.entry);
    }
  }

  return registry;
}

function buildGovernedMcpVcpNativeReadDelegationToolCaller(config = {}, overrides = {}) {
  if (typeof overrides.governedMcpVcpNativeReadDelegationToolCaller === 'function') {
    return overrides.governedMcpVcpNativeReadDelegationToolCaller;
  }

  const httpMcpTarget = overrides.governedMcpVcpNativeReadDelegationHttpMcpTarget ||
    getGovernedMcpVcpNativeHttpMcpTargetPrivateConfig(config);
  if (!httpMcpTarget || typeof httpMcpTarget !== 'object' || Array.isArray(httpMcpTarget)) {
    return null;
  }

  const toolCaller = createGovernedMcpVcpNativeHttpMcpToolCaller(httpMcpTarget);
  if (toolCaller.accepted !== true) return null;
  const callTool = async payload => toolCaller.callTool(payload);
  callTool.callWithReceipt = async payload => toolCaller.callToolWithReceipt(payload);
  return callTool;
}

function buildGovernedMcpVcpNativeWriteDelegationToolCaller(config = {}, overrides = {}) {
  if (typeof overrides.governedMcpVcpNativeWriteDelegationToolCaller === 'function') {
    return overrides.governedMcpVcpNativeWriteDelegationToolCaller;
  }

  const httpMcpTarget = overrides.governedMcpVcpNativeWriteDelegationHttpMcpTarget ||
    getGovernedMcpVcpNativeHttpMcpTargetPrivateConfig(config);
  if (!httpMcpTarget || typeof httpMcpTarget !== 'object' || Array.isArray(httpMcpTarget)) {
    return null;
  }

  const toolCaller = createGovernedMcpVcpNativeHttpMcpToolCaller(httpMcpTarget);
  if (toolCaller.accepted !== true) return null;
  const callTool = async payload => toolCaller.callTool(payload);
  callTool.callWithReceipt = async payload => toolCaller.callToolWithReceipt(payload);
  return callTool;
}

function cm2096TombstoneNativeRouteAccepted(config = {}, callMcpTool = null) {
  const runtimeTarget = config.governedMcpVcpNativeRuntimeTarget || {};
  const httpMcpTarget = config.governedMcpVcpNativeHttpMcpTarget || {};
  return (
    ['observe', 'strict'].includes(config.governedMcpVcpNativeBridgeGateMode) &&
    config.governedMcpVcpNativeWriteDelegationMode === 'primary' &&
    config.governedMcpVcpNativeReadDelegationMode === 'off' &&
    runtimeTarget.accepted === true &&
    runtimeTarget.configured === true &&
    runtimeTarget.targetKind === 'mcp_server' &&
    httpMcpTarget.accepted === true &&
    httpMcpTarget.configured === true &&
    httpMcpTarget.targetKind === 'mcp_server' &&
    httpMcpTarget.targetReferenceName === runtimeTarget.targetReferenceName &&
    httpMcpTarget.bearerTokenConfigured === true &&
    httpMcpTarget.mcpToolNameByActionConfigured === true &&
    httpMcpTarget.mcpToolNameByAction?.tombstone_memory === 'knowledge_base.tombstone' &&
    typeof callMcpTool === 'function' &&
    typeof callMcpTool.callWithReceipt === 'function'
  );
}

function cm2096TombstoneBridgeApprovalAccepted({ args, requestContext = {}, config = {} } = {}) {
  const assertion = requestContext.cm2096TombstoneAuthorizationAssertion;
  if (!assertion || typeof assertion !== 'object' || Array.isArray(assertion)) return null;
  const approvalDescriptor = Object.getOwnPropertyDescriptor(assertion, 'exactApprovalResult');
  if (!approvalDescriptor || !Object.prototype.hasOwnProperty.call(approvalDescriptor, 'value')) {
    return null;
  }
  const preflightRequestContext = {
    ...requestContext,
    exactApprovalResult: approvalDescriptor.value
  };
  delete preflightRequestContext.cm2096TombstoneAuthorizationAssertion;
  return validateGovernedMcpVcpNativeBridgeGate(
    buildGovernedMcpVcpNativeBridgeGateInput({
      toolName: 'tombstone_memory',
      args,
      requestContext: preflightRequestContext,
      config
    })
  ).accepted === true;
}

function projectReadShapeProbeTargetResolverObservation(resolverResult) {
  if (!resolverResult) return null;
  const { invokeComponentAction, ...projection } = resolverResult;
  return projection;
}

function safeBridgeMode(value) {
  return ['off', 'observe', 'strict'].includes(value) ? value : 'off';
}

function safeBridgeTransportCategory(value) {
  return ['local_direct_component_action_invoker', 'local_http_transport']
    .includes(value)
    ? value
    : null;
}

function safeBridgeStatusClass(value) {
  return ['success', 'not_available', 'transport_error', 'client_error', 'server_error', 'not_executed']
    .includes(value)
    ? value
    : null;
}

function safeBridgeJsonRpcErrorReasonCode(value) {
  return [
    'invalid_governance_metadata',
    'diary_scope_authorization_rejected',
    'diary_scope_mapping_binding_mismatch',
    'diary_scope_mapping_missing',
    'native_mutation_tool_unavailable',
    'native_provider_embedding_failed',
    'native_query_vector_invalid_shape',
    'native_query_vector_dimension_unavailable',
    'native_query_vector_dimension_mismatch',
    'native_query_vector_non_finite',
    'native_query_vector_zero_norm',
    'native_selected_diary_index_recovery_failed',
    'native_selected_diary_index_empty_after_hydration',
    'native_vector_search_not_executed',
    'native_vector_search_failed',
    'native_vector_search_ghost_result',
    'native_runtime_initialization_failed',
    'native_runtime_call_failed',
    'native_diary_search_failed',
    'native_result_scope_postcheck_failed',
    'native_tool_public_binding_mismatch',
    'native_write_disabled',
    'unsupported_native_tool'
  ].includes(value)
    ? value
    : null;
}

function safeBridgeFailureCategory(value) {
  return [
    'timeout',
    'transport_unavailable',
    'http_client_error',
    'http_server_error',
    'invalid_response',
    'response_id_mismatch',
    'governance_rejected',
    'scope_authorization_rejected',
    'scope_binding_rejected',
    'provider_embedding_failed',
    'invalid_query_vector',
    'index_recovery_failed',
    'vector_search_failed',
    'native_runtime_initialization_failed',
    'native_scoped_search_failed',
    'result_scope_postcheck_failed',
    'native_runtime_failed'
  ].includes(value)
    ? value
    : null;
}

function safeBridgeDelegationStatusClass(value) {
  return [
    'success',
    'not_available',
    'not_consumed',
    'rejected',
    'transport_error',
    'client_error',
    'server_error',
    'runtime_error',
    'invalid_response',
    'output_budget_exceeded',
    'native_invocation_receipt_unbound',
    'audit_receipt_not_appended',
    'fallback_audit_receipt_not_appended',
    'not_attempted',
    'unknown'
  ].includes(value)
    ? value
    : null;
}

function safeBridgeDelegationReasonCode(value) {
  return [
    'invalid_governed_native_read_delegation_boundary',
    'invalid_governed_native_write_delegation_boundary',
    'native_read_delegation_transport_error',
    'native_read_delegation_client_error',
    'native_read_delegation_server_error',
    'native_read_delegation_output_budget_exceeded',
    'native_read_delegation_native_invocation_receipt_unbound',
    'native_write_delegation_transport_error',
    'native_write_delegation_client_error',
    'native_write_delegation_server_error',
    'native_write_delegation_output_budget_exceeded',
    'native_write_delegation_native_invocation_receipt_unbound',
    'required_bridge_audit_receipt_not_appended',
    'required_read_fallback_audit_receipt_not_appended'
  ].includes(value)
    ? value
    : null;
}

function safeBridgeHttpStatusClass(value) {
  return ['success', 'transport_error', 'client_error', 'server_error'].includes(value)
    ? value
    : null;
}

function safeBridgeMcpMethod(value) {
  return value === 'tools/call' ? 'tools/call' : null;
}

function safeBridgeToolName(value) {
  return isGovernedMcpVcpNativeBridgeTool(value) ? value : null;
}

function safeBridgeWritePolicy(value) {
  return value === 'exact_approval' ? 'exact_approval' : null;
}

function safeBridgeExactApprovalAction(value) {
  return [
    'live_bridge_record_memory_proof',
    'live_bridge_tombstone_memory_proof',
    'live_bridge_supersede_memory_proof'
  ].includes(value)
    ? value
    : null;
}

function safeBridgeRollbackPosture(value) {
  return [
    'no_runtime_state_to_rollback',
    'read_only_no_write',
    'bounded_rollback_plan',
    'mutation_cleanup_plan'
  ].includes(value)
    ? value
    : null;
}

function safeBridgeRollbackDisposition(value) {
  return ['no_rollback_required', 'no_runtime_write_to_rollback', 'rollback_required_not_applied']
    .includes(value)
    ? value
    : null;
}

function safeBridgeRollbackReasonCode(value) {
  return [
    'write_post_commit_output_budget_exceeded',
    'write_post_commit_native_invocation_receipt_unbound',
    'write_post_commit_audit_receipt_not_appended'
  ].includes(value)
    ? value
    : null;
}

function safeBridgeRollbackApplyPolicy(value) {
  return ['not_applicable', 'manual_governed_followup_required'].includes(value)
    ? value
    : null;
}

function safeBridgeClientId(value) {
  return GOVERNED_NATIVE_READ_CLIENTS.includes(value) ? value : null;
}

function safeBridgeVisibility(value) {
  return GOVERNED_NATIVE_VISIBILITIES.includes(value) ? value : null;
}

function safeBridgeInvocationProfile(value) {
  return ['governed_read_only', 'governed_bounded_write'].includes(value) ? value : null;
}

function safeBridgeDisclosureLevel(value) {
  return ['none', 'receipt_only', 'metadata', 'shape_only', 'summary', 'structured'].includes(value)
    ? value
    : null;
}

function boundedBridgeInteger(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max ? value : null;
}

function projectScopeFieldNames(scope) {
  if (!scope || typeof scope !== 'object' || Array.isArray(scope)) return [];
  return Object.keys(scope)
    .filter(field => [
      'client_id',
      'project_id',
      'scope_id',
      'visibility',
      'workspace_id'
    ].includes(field))
    .sort();
}

function buildStableGovernedMcpVcpNativeScopeFingerprint(scope) {
  const scopeFieldNames = projectScopeFieldNames(scope);
  if (scopeFieldNames.length === 0) return null;
  const fingerprintSource = scopeFieldNames.reduce((output, fieldName) => {
    output[fieldName] = scope[fieldName];
    return output;
  }, {});
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(fingerprintSource), 'utf8')
    .digest('hex');
}

function buildGovernedMcpVcpNativeReadFallbackScopeContext(gateResult = {}) {
  const request = gateResult?.normalizedBridgeRequest || {};
  const scope = request.scope && typeof request.scope === 'object' && !Array.isArray(request.scope)
    ? request.scope
    : {};
  const scopeFieldNames = projectScopeFieldNames(scope);
  const scopeIdentifierFieldNames = scopeFieldNames.filter(fieldName =>
    ['project_id', 'scope_id', 'workspace_id'].includes(fieldName)
  );

  return {
    clientId: safeBridgeClientId(request.client_id),
    visibility: safeBridgeVisibility(request.visibility || scope.visibility),
    scopePresent: request.scope_present === true && scopeFieldNames.length > 0,
    scopeIdentifierPresent: request.scope_identifier_present === true &&
      scopeIdentifierFieldNames.length > 0,
    scopeFieldNames,
    scopeIdentifierFieldNames,
    scopeFingerprint: buildStableGovernedMcpVcpNativeScopeFingerprint(scope),
    rawScopePersisted: false
  };
}

function safeBridgeResponseShapeCategory(value) {
  return [
    'array_item_count_bucket_only',
    'array_top_level_kind_only',
    'object_top_level_kind_only_no_field_names',
    'null_top_level_kind_only',
    'primitive_top_level_kind_only',
    'unknown_shape',
    'not_consumed'
  ].includes(value)
    ? value
    : null;
}

function projectGovernedNativeBridgeObservationSummary(observation = {}) {
  const resolver = observation.readShapeProbeTargetResolverResult || {};
  const probe = observation.readShapeProbeExecutionResult || {};
  const receipt = probe.readShapeProbeExecutionResult?.receipt || {};
  const request = observation.gateResult?.normalizedBridgeRequest || {};
  const runtimeTargetForbiddenFieldCount = boundedBridgeInteger(
    request.runtime_target_forbidden_field_count,
    0,
    50
  );
  const invocationProfileForbiddenFieldCount = boundedBridgeInteger(
    request.invocation_profile_forbidden_field_count,
    0,
    50
  );
  const readWriteAuthorityForbiddenFieldCount = boundedBridgeInteger(
    request.read_write_authority_forbidden_field_count,
    0,
    50
  );
  const readDelegationPresent = Boolean(observation.readDelegationResult);
  const writeDelegationPresent = Boolean(observation.writeDelegationResult);
  const delegationResult = writeDelegationPresent
    ? observation.writeDelegationResult
    : readDelegationPresent
      ? observation.readDelegationResult
      : {};
  const delegationReceipt = delegationResult.receipt || {};
  const nativeInvocationReceipt = delegationReceipt.nativeInvocationReceipt || {};
  const scopeFieldNames = projectScopeFieldNames(request.scope);
  const scopeIdentifierFieldNames = scopeFieldNames.filter(fieldName =>
    ['project_id', 'scope_id', 'workspace_id'].includes(fieldName)
  );
  const scopeFingerprint = buildStableGovernedMcpVcpNativeScopeFingerprint(request.scope);
  const targetReferenceName = runtimeTargetForbiddenFieldCount === 0 &&
    isSafeReferenceName(request.runtime_target_reference_name)
    ? request.runtime_target_reference_name
    : null;
  const runtimeTargetBound = request.runtime_target === REQUIRED_PRIMARY_RUNTIME &&
    request.runtime_target_configured === true &&
    request.runtime_target_kind === 'mcp_server' &&
    request.runtime_target_source_authority === SOURCE_AUTHORITY &&
    runtimeTargetForbiddenFieldCount === 0 &&
    targetReferenceName !== null;
  const invocationProfile = invocationProfileForbiddenFieldCount === 0
    ? safeBridgeInvocationProfile(request.invocation_profile)
    : null;
  const invocationProfileBound = invocationProfileForbiddenFieldCount === 0 &&
    request.transport === 'mcp' &&
    invocationProfile !== null &&
    isGovernedMcpVcpNativeBridgeTool(request.mcp_tool_name) &&
    (
      (invocationProfile === 'governed_read_only' && request.write_allowed !== true) ||
      (invocationProfile === 'governed_bounded_write' && request.write_allowed === true)
    );
  const readAllowed = readWriteAuthorityForbiddenFieldCount === 0 && request.read_allowed === true;
  const writeAllowed = readWriteAuthorityForbiddenFieldCount === 0 && request.write_allowed === true;
  const writeRequiresExactApproval = writeAllowed === true && request.write_policy === 'exact_approval';
  const readWriteAuthorityBound = readWriteAuthorityForbiddenFieldCount === 0 &&
    ((readAllowed === true && writeAllowed === false && request.write_policy == null) ||
      (readAllowed === false && writeAllowed === true && request.write_policy === 'exact_approval'));
  const scopeBoundaryBound = request.scope_present === true &&
    request.scope_identifier_present === true &&
    request.scope_identifier_safe === true &&
    scopeFieldNames.includes('client_id') &&
    scopeFieldNames.includes('visibility') &&
    safeBridgeVisibility(request.visibility) !== null;
  const rollbackPosture = safeBridgeRollbackPosture(delegationReceipt.rollbackPosture || request.rollback_posture);
  const rollbackPostureForbiddenFieldCount = boundedBridgeInteger(
    request.rollback_posture_forbidden_field_count,
    0,
    50
  );
  const rollbackPostureBound = delegationReceipt.rollbackPostureBound === true ||
    (
      rollbackPostureForbiddenFieldCount === 0 &&
      readAllowed === true &&
      writeAllowed === false &&
      ['no_runtime_state_to_rollback', 'read_only_no_write'].includes(rollbackPosture) &&
      request.rollback_plan_reference_present !== true
    ) ||
    (
      rollbackPostureForbiddenFieldCount === 0 &&
      readAllowed === false &&
      writeAllowed === true &&
      ['bounded_rollback_plan', 'mutation_cleanup_plan'].includes(rollbackPosture) &&
      request.rollback_plan_reference_present === true &&
      request.rollback_plan_reference_safe === true
    );

  return {
    schemaVersion: 'governed_native_bridge_observation_summary_v1',
    toolName: isGovernedMcpVcpNativeBridgeTool(observation.toolName) ? observation.toolName : null,
    mode: safeBridgeMode(observation.mode),
    gateAccepted: observation.gateResult?.accepted === true,
    accessPath: request.access_path === REQUIRED_ACCESS_PATH ? REQUIRED_ACCESS_PATH : null,
    clientId: safeBridgeClientId(request.client_id),
    visibility: safeBridgeVisibility(request.visibility),
    scopePresent: request.scope_present === true && scopeFieldNames.length > 0,
    scopeIdentifierPresent: request.scope_identifier_present === true &&
      scopeIdentifierFieldNames.length > 0,
    scopeIdentifierSafe: request.scope_identifier_safe === true,
    scopeFieldNames,
    scopeIdentifierFieldNames,
    scopeFingerprintPresent: typeof scopeFingerprint === 'string' && /^[a-f0-9]{64}$/.test(scopeFingerprint),
    rawScopePersisted: false,
    rawScopeValueReturned: false,
    clientIdentitySource: GOVERNED_MCP_VCP_NATIVE_CONTEXT_SOURCE,
    clientIdentityBound: GOVERNED_NATIVE_READ_CLIENTS.includes(request.client_id),
    clientIdentityToolArgumentsMayOverride: false,
    clientIdentityGovernanceMetadataMayOverride: false,
    scopeBoundarySource: GOVERNED_MCP_VCP_NATIVE_CONTEXT_SOURCE,
    scopeBoundaryBound,
    scopeToolArgumentsMayOverride: false,
    scopeGovernanceMetadataMayOverride: false,
    visibilityBound: safeBridgeVisibility(request.visibility) !== null,
    trustedExecutionContextSupplied: request.trusted_execution_context_supplied === true,
    trustedExecutionContextAccepted: request.trusted_execution_context_accepted === true,
    trustedExecutionContextScopeMatched: request.trusted_execution_context_scope_matched === true,
    primaryRuntime: request.runtime_target === REQUIRED_PRIMARY_RUNTIME ? REQUIRED_PRIMARY_RUNTIME : null,
    runtimeTargetConfigured: request.runtime_target_configured === true,
    runtimeTargetKind: request.runtime_target_kind === 'mcp_server' ? 'mcp_server' : null,
    runtimeTargetSourceAuthority: request.runtime_target_source_authority === SOURCE_AUTHORITY
      ? SOURCE_AUTHORITY
      : null,
    runtimeTargetForbiddenFieldCount,
    runtimeTargetBound,
    runtimeTargetToolArgumentsMayOverride: false,
    runtimeTargetGovernanceMetadataMayOverride: false,
    targetReferenceName,
    runtimeTargetLocatorDisclosed: false,
    runtimeTargetEndpointDisclosed: false,
    runtimeTargetTokenMaterialDisclosed: false,
    invocationProfile,
    invocationProfileSource: 'bridge_tool_binding',
    invocationProfileBound,
    invocationProfileToolArgumentsMayOverride: false,
    invocationProfileGovernanceMetadataMayOverride: false,
    invocationProfileForbiddenFieldCount,
    readAllowed,
    writeAllowed,
    readWriteAuthoritySource: readWriteAuthorityForbiddenFieldCount === 0 ? 'bridge_tool_binding' : null,
    readWriteAuthorityBound,
    mixedReadWriteAllowed: readAllowed === true && writeAllowed === true,
    unboundedWriteAllowed: false,
    writeRequiresExactApproval,
    readWriteAuthorityForbiddenFieldCount,
    disclosureLevel: safeBridgeDisclosureLevel(request.disclosure_level),
    outputDisclosureBudgetSource: 'bridge_gate_normalized_governance',
    outputDisclosureBudgetBound: request.raw_output_allowed === false &&
      safeBridgeDisclosureLevel(request.disclosure_level) !== null &&
      boundedBridgeInteger(request.disclosure_max_items, 0, 5) !== null &&
      boundedBridgeInteger(request.disclosure_max_bytes, 0, 4096) !== null &&
      boundedBridgeInteger(request.disclosure_forbidden_field_count, 0, 50) === 0,
    outputDisclosureBudgetToolArgumentsMayOverride: false,
    outputDisclosureBudgetGovernanceMetadataMayOverride: false,
    disclosureMaxItems: boundedBridgeInteger(request.disclosure_max_items, 0, 5),
    disclosureMaxBytes: boundedBridgeInteger(request.disclosure_max_bytes, 0, 4096),
    disclosureForbiddenFieldCount: boundedBridgeInteger(request.disclosure_forbidden_field_count, 0, 50),
    rawOutputAllowed: request.raw_output_allowed === true,
    readOnlyProbeAccepted: observation.readOnlyProbeResult?.accepted === true,
    readShapeProbeTargetResolverAccepted: resolver.accepted === true,
    readShapeProbeTargetResolved: resolver.targetResolved === true,
    readShapeProbeExecuted: probe.accepted === true,
    readDelegationAttempted: readDelegationPresent,
    readDelegationAccepted: observation.readDelegationResult?.accepted === true,
    writeDelegationAttempted: writeDelegationPresent,
    writeDelegationAccepted: observation.writeDelegationResult?.accepted === true,
    delegationDirection: writeDelegationPresent ? 'write' : readDelegationPresent ? 'read' : null,
    delegationStatusClass: safeBridgeDelegationStatusClass(delegationReceipt.statusClass),
    delegationReasonCode: safeBridgeDelegationReasonCode(delegationResult.reasonCode),
    bridgeAuditReceiptAppended:
      observation.bridgeAuditReceiptResult?.accepted === true &&
      observation.bridgeAuditReceiptResult?.appended === true,
    bridgeAuditReceiptStatus:
      delegationReceipt.localAuditReceipt?.status === 'appended' ||
      delegationReceipt.localAuditReceipt?.status === 'not_appended'
        ? delegationReceipt.localAuditReceipt.status
        : null,
    bridgeAuditReceiptRequired: delegationReceipt.auditReceiptRequired === true,
    auditReceiptSource: 'bridge_gate_normalized_governance',
    auditReceiptLowDisclosure: request.audit_receipt_low_disclosure === true,
    auditReceiptLowDisclosureBound: request.audit_receipt_required === true &&
      request.audit_receipt_low_disclosure === true &&
      request.audit_receipt_reference_present === true &&
      request.audit_receipt_reference_safe === true &&
      boundedBridgeInteger(request.audit_receipt_forbidden_field_count, 0, 50) === 0,
    auditReceiptToolArgumentsMayOverride: false,
    auditReceiptGovernanceMetadataMayOverride: false,
    bridgeReceiptLowDisclosure: delegationReceipt.localAuditReceipt?.lowDisclosure === true,
    localMemoryRole: delegationReceipt.localMemoryRole === 'not_used' || observation.gateResult?.accepted === true
      ? 'not_used'
      : null,
    localMemorySourceRuntime: null,
    localMemoryPrimaryRuntime: false,
    localMemoryFallbackUsed: false,
    localMemoryResultReturned: false,
    localMemoryResultCanBeMistakenForVcpNative: false,
    localMemoryRawContentDisclosed: false,
    auditReceiptReferencePresent: request.audit_receipt_reference_present === true,
    auditReceiptReferenceSafe: request.audit_receipt_reference_safe === true,
    auditReceiptReferenceName: request.audit_receipt_forbidden_field_count === 0 &&
      isSafeReferenceName(request.audit_receipt_reference_name)
      ? request.audit_receipt_reference_name
      : null,
    auditReceiptForbiddenFieldCount: boundedBridgeInteger(request.audit_receipt_forbidden_field_count, 0, 50),
    transportCategory: safeBridgeTransportCategory(resolver.transportCategory),
    statusClass: safeBridgeStatusClass(receipt.statusClass),
    responseShapeCategory: safeBridgeResponseShapeCategory(receipt.responseShapeCategory),
    nativeInvocationAttempted: delegationReceipt.nativeInvocationAttempted === true,
    nativeMcpToolInvocationAttempted: delegationReceipt.nativeMcpToolInvocationAttempted === true,
    nativeInvocationReceiptBindingMatched: nativeInvocationReceipt.invocationBindingMatched === true,
    nativeInvocationGovernanceMetadataPath:
      nativeInvocationReceipt.governanceMetadataPath === 'params._meta.codexMemoryGovernance'
        ? 'params._meta.codexMemoryGovernance'
        : null,
    nativeInvocationGovernanceMetadataSent: nativeInvocationReceipt.governanceMetadataSent === true,
    nativeInvocationGovernanceMetadataRawValueDisclosed:
      nativeInvocationReceipt.governanceMetadataRawValueDisclosed === true,
    nativeInvocationToolName: safeBridgeToolName(nativeInvocationReceipt.toolName),
    nativeInvocationTransportCategory: safeBridgeTransportCategory(nativeInvocationReceipt.transportCategory),
    nativeInvocationMcpMethod: safeBridgeMcpMethod(nativeInvocationReceipt.mcpMethod),
    nativeInvocationRequestIdCategory:
      nativeInvocationReceipt.requestIdCategory === 'generated_bridge_request_id'
        ? 'generated_bridge_request_id'
        : null,
    nativeInvocationJsonRpcResponseIdMatched:
      nativeInvocationReceipt.jsonRpcResponseIdMatched === true,
    nativeInvocationStatusClass: safeBridgeStatusClass(nativeInvocationReceipt.statusClass),
    nativeInvocationHttpStatusClass: safeBridgeHttpStatusClass(nativeInvocationReceipt.httpStatusClass),
    nativeInvocationJsonRpcErrorPresent:
      nativeInvocationReceipt.jsonRpcErrorPresent === true,
    nativeInvocationJsonRpcErrorReasonCode:
      safeBridgeJsonRpcErrorReasonCode(nativeInvocationReceipt.jsonRpcErrorReasonCode),
    nativeInvocationFailureCategory:
      safeBridgeFailureCategory(nativeInvocationReceipt.failureCategory),
    nativeInvocationResponseShapeCategory:
      safeBridgeResponseShapeCategory(nativeInvocationReceipt.responseShapeCategory),
    writePolicy: safeBridgeWritePolicy(delegationReceipt.writePolicy),
    exactApprovalAction: safeBridgeExactApprovalAction(delegationReceipt.exactApprovalAction),
    exactApprovalActionMatched: delegationReceipt.exactApprovalActionMatched === true,
    exactApprovalScopeMatched: delegationReceipt.exactApprovalScopeMatched === true,
    exactApprovalRuntimeTargetMatched: delegationReceipt.exactApprovalRuntimeTargetMatched === true,
    exactApprovalRollbackPlanMatched: delegationReceipt.exactApprovalRollbackPlanMatched === true,
    exactApprovalForbiddenFieldCount:
      Number.isInteger(delegationReceipt.exactApprovalForbiddenFieldCount) &&
      delegationReceipt.exactApprovalForbiddenFieldCount >= 0
        ? delegationReceipt.exactApprovalForbiddenFieldCount
        : null,
    rollbackPosture,
    rollbackPostureSource: 'bridge_gate_normalized_governance',
    rollbackPostureForbiddenFieldCount,
    rollbackPlanReferencePresent: request.rollback_plan_reference_present === true,
    rollbackPlanReferenceSafe: request.rollback_plan_reference_safe === true,
    rollbackPlanBound: delegationReceipt.rollbackPlanBound === true,
    rollbackPostureBound,
    rollbackPostureToolArgumentsMayOverride: false,
    rollbackPostureGovernanceMetadataMayOverride: false,
    rollbackPlanShapeOnly: delegationReceipt.rollbackPlanShapeOnly === true,
    rollbackRequired: delegationReceipt.rollbackRequired === true,
    rollbackReasonCode: safeBridgeRollbackReasonCode(delegationReceipt.rollbackReasonCode),
    rollbackDisposition: safeBridgeRollbackDisposition(delegationReceipt.rollbackDisposition),
    rollbackFollowupRequired: delegationReceipt.rollbackFollowupRequired === true,
    rollbackApplyPolicy: safeBridgeRollbackApplyPolicy(delegationReceipt.rollbackApplyPolicy),
    rollbackApplyAttempted: delegationReceipt.rollbackApplyAttempted === true,
    rollbackAutoApplyAllowed: delegationReceipt.rollbackAutoApplyAllowed === true,
    rollbackRawPlanDisclosed: false,
    rollbackRawPlanPersisted: false,
    runtimeExecuted: probe.runtimeExecuted === true,
    networkCalled: probe.networkCalled === true,
    memoryReadPerformed:
      probe.memoryReadPerformed === true ||
      observation.readDelegationResult?.memoryReadPerformed === true,
    memoryWritePerformed:
      probe.memoryWritten === true ||
      observation.readDelegationResult?.memoryWritePerformed === true ||
      observation.writeDelegationResult?.memoryWritePerformed === true,
    localMemoryFallbackUsed: observation.readDelegationResult?.localMemoryFallbackUsed === true,
    endpointDisclosed: false,
    tokenMaterialDisclosed: false,
    rawRequestBodyDisclosed: false,
    rawResponseBodyDisclosed: false,
    rawMemoryReturned: false,
    readinessClaimed: false
  };
}

function createGovernedNativeBridgeObservationStore({ limit = 5 } = {}) {
  const boundedLimit = Number.isInteger(limit) && limit > 0 && limit <= 20 ? limit : 5;
  const summaries = [];

  function buildStatus(latest = null) {
    return {
      schemaVersion: 'governed_native_bridge_observation_status_v1',
      available: true,
      retainedObservationLimit: boundedLimit,
      observationCount: summaries.length,
      latest,
      endpointDisclosed: false,
      tokenMaterialDisclosed: false,
      rawRequestBodyDisclosed: false,
      rawResponseBodyDisclosed: false,
      rawMemoryReturned: false,
      readinessClaimed: false
    };
  }

  return {
    record(observation = {}) {
      const summary = projectGovernedNativeBridgeObservationSummary(observation);
      const coverage = validateGovernedMcpOverviewStatusCoversCurrentProductGoal(
        buildStatus(summary)
      );
      if (coverage.accepted !== true) return summary;
      summaries.push(summary);
      while (summaries.length > boundedLimit) summaries.shift();
      return summary;
    },
    getStatus() {
      return buildStatus(summaries.length > 0 ? summaries[summaries.length - 1] : null);
    }
  };
}

function attachGovernedNativeBridgeOverviewStatus(result, observationStore) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return result;
  if (!observationStore || typeof observationStore.getStatus !== 'function') return result;
  return {
    ...result,
    governedNativeBridge: observationStore.getStatus()
  };
}

function buildGovernedMcpVcpNativeReadDelegationRejectedToolResult(delegationResult = {}) {
  const receipt = delegationResult && delegationResult.receipt !== null &&
    typeof delegationResult.receipt === 'object' && !Array.isArray(delegationResult.receipt)
    ? delegationResult.receipt
    : {};
  return {
    status: 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATION_REJECTED',
    accepted: false,
    decision: 'rejected',
    reasonCode: delegationResult.reasonCode || 'governed_mcp_vcp_native_read_delegation_rejected',
    access: {
      mode: 'governed_mcp_vcp_native_primary_read',
      selectedProjection: true,
      lowDisclosure: true,
      rawOutputReturned: false,
      rawMemoryReturned: false,
      tokenMaterialReturned: false,
      runtimeCalled: delegationResult.runtimeCalled === true,
      vcpToolBoxCalled: delegationResult.vcpToolBoxCalled === true,
      mcpToolCalled: delegationResult.mcpToolCalled === true,
      memoryReadPerformed: delegationResult.memoryReadPerformed === true,
      localMemoryFallbackEligible: delegationResult.localMemoryFallbackEligible === true,
      localMemoryFallbackUsed: false,
      auditReceiptRequiredButNotAppended: receipt.auditReceiptRequiredButNotAppended === true,
      delegationStatusClass: safeBridgeDelegationStatusClass(receipt.statusClass),
      delegationReasonCode: safeBridgeDelegationReasonCode(delegationResult.reasonCode),
      rollbackRequired: false,
      rollbackFollowupRequired: false
    },
    receipt: delegationResult.receipt || null,
    readinessClaimed: false
  };
}

function buildGovernedMcpVcpNativeReadFallbackContext(delegationResult = {}, gateResult = {}) {
  const receipt = delegationResult && delegationResult.receipt !== null &&
    typeof delegationResult.receipt === 'object' && !Array.isArray(delegationResult.receipt)
    ? delegationResult.receipt
    : null;
  return {
    ...buildGovernedMcpVcpNativeReadFallbackScopeContext(gateResult),
    used: true,
    reasonCode: delegationResult.reasonCode || 'native_read_delegation_failed',
    primaryRuntime: REQUIRED_PRIMARY_RUNTIME,
    localMemoryRole: 'fallback',
    localMemorySourceRuntime: 'codex_memory_local_fallback',
    vcpNativeResult: false,
    resultCanBeMistakenForVcpNative: false,
    lowDisclosure: true,
    nativeRuntimeCalled: delegationResult.runtimeCalled === true,
    nativeMcpToolCalled: delegationResult.mcpToolCalled === true,
    nativeInvocationAttempted: receipt?.nativeInvocationAttempted === true,
    nativeMcpToolInvocationAttempted: receipt?.nativeMcpToolInvocationAttempted === true,
    nativeMemoryReadPerformed: delegationResult.memoryReadPerformed === true,
    nativeStatusClass: receipt?.statusClass || null,
    nativeResponseShapeCategory: receipt?.responseShapeCategory || null,
    nativeTopLevelKindCategory: receipt?.topLevelKindCategory || null,
    nativeItemCountBucket: receipt?.itemCountBucket || null,
    nativeByteCountBucket: receipt?.byteCountBucket || null,
    auditReceiptStatus: receipt?.localAuditReceipt?.status || null,
    fallbackRequiresAuditReceipt: true,
    fallbackAfterAuditReceiptAppended: receipt?.localAuditReceipt?.status === 'appended',
    rawNativeOutputReturned: false,
    rawNativeMemoryReturned: false,
    tokenMaterialReturned: false,
    endpointReturned: false,
    readinessClaimed: false
  };
}

function buildGovernedMcpVcpNativeReadFallbackAuditRejectedToolResult(
  fallbackContext,
  localFallbackAuditReceipt,
  reasonCode = 'required_read_fallback_audit_receipt_not_appended'
) {
  const auditReceiptRequiredButNotAppended = localFallbackAuditReceipt?.appended !== true;
  const statusClass = auditReceiptRequiredButNotAppended
    ? 'fallback_audit_receipt_not_appended'
    : 'fallback_audit_receipt_not_authorized';
  const fallbackContextWithAudit = {
    ...(fallbackContext || {}),
    used: false,
    localMemoryFallbackAttempted: true,
    localMemoryFallbackReadPerformed: false,
    localMemoryFallbackReturned: false,
    localFallbackAuditReceipt,
    rawNativeOutputReturned: false,
    rawNativeMemoryReturned: false,
    tokenMaterialReturned: false,
    endpointReturned: false,
    readinessClaimed: false
  };

  return {
    accepted: false,
    decision: 'rejected',
    status: 'GOVERNED_MCP_VCP_NATIVE_READ_FALLBACK_REJECTED',
    reasonCode,
    access: {
      mode: 'governed_mcp_vcp_native_primary_read_local_fallback',
      selectedProjection: true,
      lowDisclosure: true,
      primaryRuntime: REQUIRED_PRIMARY_RUNTIME,
      localMemoryRole: 'fallback',
      localMemorySourceRuntime: 'codex_memory_local_fallback',
      localMemoryFallbackAttempted: true,
      localMemoryFallbackUsed: false,
      localMemoryFallbackReadPerformed: false,
      localMemoryFallbackReturned: false,
      localMemoryFallbackReasonCode: fallbackContext?.reasonCode || null,
      localFallbackAuditReceiptStatus: localFallbackAuditReceipt?.status || 'not_appended',
      localFallbackAuditReceiptAuthorized: localFallbackAuditReceipt?.authorized === true,
      fallbackRequiresAuditReceipt: true,
      fallbackAfterAuditReceiptAppended: fallbackContext?.fallbackAfterAuditReceiptAppended === true,
      vcpNativeResult: false,
      resultCanBeMistakenForVcpNative: false,
      nativeInvocationAttempted: fallbackContext?.nativeInvocationAttempted === true,
      nativeMcpToolInvocationAttempted: fallbackContext?.nativeMcpToolInvocationAttempted === true,
      rawOutputReturned: false,
      rawMemoryReturned: false,
      rawNativeOutputReturned: false,
      rawNativeMemoryReturned: false,
      tokenMaterialReturned: false,
      endpointReturned: false,
      readinessClaimed: false
    },
    governedNativeReadFallback: fallbackContextWithAudit,
    receipt: {
      localFallbackAuditReceipt,
      auditReceiptRequiredButNotAppended,
      auditReceiptAppendedButNotAuthorized: !auditReceiptRequiredButNotAppended,
      statusClass,
      lowDisclosure: true,
      rawPayloadReturned: false,
      tokenMaterialReturned: false,
      readinessClaimed: false
    },
    readinessClaimed: false
  };
}

function buildGovernedMcpVcpNativeReadFallbackLocalAuditReceipt(fallbackAuditReceiptResult = {}) {
  const appended = fallbackAuditReceiptResult.accepted === true && fallbackAuditReceiptResult.appended === true;
  return {
    eventType: fallbackAuditReceiptResult.eventType,
    appended,
    status: appended ? 'appended' : 'not_appended',
    authorized: fallbackAuditReceiptResult.localMemoryFallbackAuthorized === true,
    reasonCode: fallbackAuditReceiptResult.reasonCode || null,
    lowDisclosure: true,
    rawPayloadPersisted: false,
    tokenMaterialPersisted: false
  };
}

function clampGovernedMcpVcpNativeFallbackInt(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function governedMcpVcpNativeFallbackMaxItems(gateResult = {}) {
  const request = gateResult && typeof gateResult.normalizedBridgeRequest === 'object'
    ? gateResult.normalizedBridgeRequest
    : {};
  return clampGovernedMcpVcpNativeFallbackInt(request.disclosure_max_items, 5, 0, 5);
}

function governedMcpVcpNativeFallbackScope(gateResult = {}) {
  const request = gateResult && typeof gateResult.normalizedBridgeRequest === 'object'
    ? gateResult.normalizedBridgeRequest
    : {};
  const scope = request.scope && typeof request.scope === 'object' && !Array.isArray(request.scope)
    ? request.scope
    : null;
  if (!scope) return undefined;

  const projected = {};
  for (const key of ['project_id', 'workspace_id', 'scope_id']) {
    if (typeof scope[key] === 'string' && isSafeReferenceName(scope[key])) {
      projected[key] = scope[key];
    }
  }
  if (GOVERNED_NATIVE_READ_CLIENTS.includes(scope.client_id)) {
    projected.client_id = scope.client_id;
  }
  if (GOVERNED_MCP_VCP_NATIVE_FALLBACK_VISIBILITIES.includes(scope.visibility)) {
    projected.visibility = scope.visibility;
  }
  return Object.keys(projected).length > 0 ? projected : undefined;
}

function buildGovernedMcpVcpNativeReadFallbackArguments(toolName, args = {}, gateResult = {}) {
  const maxItems = governedMcpVcpNativeFallbackMaxItems(gateResult);
  const scope = governedMcpVcpNativeFallbackScope(gateResult);
  const safeArgs = args && typeof args === 'object' && !Array.isArray(args) ? args : {};

  if (toolName === 'search_memory') {
    return {
      query: typeof safeArgs.query === 'string' ? safeArgs.query : '',
      target: ['process', 'knowledge', 'both'].includes(safeArgs.target) ? safeArgs.target : 'both',
      limit: clampGovernedMcpVcpNativeFallbackInt(safeArgs.limit, maxItems, 0, maxItems),
      include_content: false,
      ...(typeof safeArgs.context_text === 'string' && safeArgs.context_text.trim()
        ? { context_text: safeArgs.context_text }
        : {}),
      ...(scope ? { scope } : {})
    };
  }

  if (toolName === 'memory_overview') {
    return {
      auditWindow: clampGovernedMcpVcpNativeFallbackInt(safeArgs.auditWindow, maxItems, 0, maxItems),
      limit: clampGovernedMcpVcpNativeFallbackInt(safeArgs.limit, maxItems, 0, maxItems),
      ...(scope ? { scope } : {})
    };
  }

  if (toolName === 'audit_memory') {
    return {
      audit_family: ['write', 'recall', 'governance', 'all'].includes(safeArgs.audit_family)
        ? safeArgs.audit_family
        : 'all',
      window: clampGovernedMcpVcpNativeFallbackInt(safeArgs.window, maxItems, 0, maxItems),
      ...(scope ? { scope } : {}),
      include_raw: false
    };
  }

  return safeArgs;
}

function buildZeroItemGovernedMcpVcpNativeOverviewFallbackResult() {
  return {
    access: {
      mode: 'authenticated_bounded_overview',
      selectedProjection: true,
      selectedProjectionVersion: 2,
      publicAccess: 'bounded',
      pathsReturned: false,
      embeddingFingerprintReturned: false,
      recentAuditReturned: false,
      recentFilesReturned: false,
      memoryLinksReturned: false,
      recallRecentReturned: false,
      detailFieldsReturned: false
    },
    summary: {
      totalWrites: 0,
      acceptedWrites: 0,
      rejectedWrites: 0,
      auditWindow: 0
    },
    recall: {
      totalRecalls: 0,
      recentCount: 0,
      summary: {
        total: 0,
        byTarget: {},
        byScope: {}
      }
    },
    policy: {
      selectedProjection: true,
      rawAuditScanPerformed: false,
      providerCalled: false,
      durableMutationPerformed: false,
      publicMcpExpanded: false,
      readinessClaimed: false
    }
  };
}

async function prepareGovernedMcpVcpNativeReadFallbackAuditReceipt(fallbackContext, options = {}) {
  if (!fallbackContext) {
    return {
      accepted: true,
      localFallbackAuditReceipt: null,
      rejectedToolResult: null
    };
  }

  const recordFallbackAuditReceipt = typeof options.recordFallbackAuditReceipt === 'function'
    ? options.recordFallbackAuditReceipt
    : recordGovernedMcpVcpNativeReadFallbackAuditReceipt;
  const fallbackAuditReceiptResult = await recordFallbackAuditReceipt({
    auditLogStore: options.auditLogStore,
    toolName: options.toolName,
    fallbackContext
  });
  const localFallbackAuditReceipt =
    buildGovernedMcpVcpNativeReadFallbackLocalAuditReceipt(fallbackAuditReceiptResult);

  if (localFallbackAuditReceipt.appended !== true ||
    localFallbackAuditReceipt.authorized !== true) {
    const reasonCode = localFallbackAuditReceipt.appended === true
      ? 'required_read_fallback_audit_receipt_not_authorized'
      : 'required_read_fallback_audit_receipt_not_appended';
    return {
      accepted: false,
      localFallbackAuditReceipt,
      rejectedToolResult: buildGovernedMcpVcpNativeReadFallbackAuditRejectedToolResult(
        fallbackContext,
        localFallbackAuditReceipt,
        reasonCode
      )
    };
  }

  return {
    accepted: true,
    localFallbackAuditReceipt,
    rejectedToolResult: null
  };
}

const GOVERNED_MCP_VCP_NATIVE_FALLBACK_FORBIDDEN_TOP_LEVEL_RESULT_FIELDS = Object.freeze([
  'id',
  'memoryId',
  'memory_id',
  'recordId',
  'record_id',
  'title',
  'snippet',
  'text',
  'content',
  'rawContent',
  'rawMemory',
  'rawOutput',
  'rawAudit',
  'evidence',
  'path',
  'filePath',
  'file_path',
  'paths',
  'recentAudit',
  'recentFiles',
  'memoryLinks',
  'memoryIds',
  'memory_ids',
  'filesystemPaths',
  'tokenMaterial',
  'token',
  'endpoint',
  'locator'
]);
const GOVERNED_MCP_VCP_NATIVE_FALLBACK_FORBIDDEN_RESULT_KEY_NORMAL_FORMS = new Set([
  ...GOVERNED_MCP_VCP_NATIVE_FALLBACK_FORBIDDEN_TOP_LEVEL_RESULT_FIELDS.map(
    key => normalizeGovernedMcpVcpNativeReadFallbackResultKey(key)
  ),
  'absolutepath',
  'accesskey',
  'accesstoken',
  'apikey',
  'authorization',
  'bearer',
  'bearertoken',
  'credential',
  'credentials',
  'fileurl',
  'fulloutput',
  'providerapikey',
  'privatekey',
  'rawbody',
  'rawpayload',
  'refreshtoken',
  'secret',
  'secrets',
  'url'
]);
const GOVERNED_MCP_VCP_NATIVE_FALLBACK_FORBIDDEN_RESULT_KEY_CONTAINS = Object.freeze([
  'apikey',
  'accesstoken',
  'authorization',
  'bearertoken',
  'credential',
  'endpoint',
  'locator',
  'privatekey',
  'refreshtoken',
  'secret'
]);
const GOVERNED_MCP_VCP_NATIVE_FALLBACK_FORBIDDEN_RESULT_KEY_PREFIXES = Object.freeze([
  'raw'
]);
const GOVERNED_MCP_VCP_NATIVE_FALLBACK_FORBIDDEN_RESULT_KEY_SUFFIXES = Object.freeze([
  'path',
  'token',
  'url'
]);
const GOVERNED_MCP_VCP_NATIVE_BRIDGE_RECEIPT_FALSE_PROOF_FIELDS = Object.freeze([
  'endpointDisclosed',
  'rawOutputAllowed',
  'rawRequestBodyPersisted',
  'rawResponseBodyPersisted',
  'rawScopePersisted',
  'rawScopeValueReturned'
]);
const GOVERNED_MCP_VCP_NATIVE_READ_FALLBACK_RECEIPT_FALSE_PROOF_FIELDS = Object.freeze([
  'rawScopePersisted',
  'rawNativeOutputReturned',
  'rawNativeMemoryReturned',
  'rawFallbackMemoryPersisted',
  'rawFallbackMemoryReturned',
  'tokenMaterialDisclosed',
  'endpointDisclosed',
  'memoryContentDisclosed',
  'memoryIdsDisclosed',
  'nativeFieldNamesDisclosed',
  'readinessClaimed'
]);
const GOVERNED_NATIVE_BRIDGE_OBSERVATION_STATUS_FALSE_PROOF_FIELDS = Object.freeze([
  'endpointDisclosed',
  'tokenMaterialDisclosed',
  'rawRequestBodyDisclosed',
  'rawResponseBodyDisclosed',
  'rawMemoryReturned',
  'readinessClaimed'
]);
const GOVERNED_NATIVE_BRIDGE_OBSERVATION_SUMMARY_FALSE_PROOF_FIELDS = Object.freeze([
  'endpointDisclosed',
  'localMemoryPrimaryRuntime',
  'localMemoryFallbackUsed',
  'localMemoryResultReturned',
  'localMemoryResultCanBeMistakenForVcpNative',
  'localMemoryRawContentDisclosed',
  'rawOutputAllowed',
  'rawRequestBodyDisclosed',
  'rawResponseBodyDisclosed',
  'rawMemoryReturned',
  'rawScopePersisted',
  'rawScopeValueReturned',
  'readinessClaimed',
  'rollbackApplyAttempted',
  'rollbackAutoApplyAllowed',
  'rollbackRawPlanDisclosed',
  'rollbackRawPlanPersisted',
  'runtimeTargetEndpointDisclosed',
  'runtimeTargetLocatorDisclosed',
  'runtimeTargetTokenMaterialDisclosed',
  'tokenMaterialDisclosed'
]);

function normalizeGovernedMcpVcpNativeReadFallbackResultKey(key) {
  return typeof key === 'string'
    ? key.toLowerCase().replace(/[^a-z0-9]/g, '')
    : '';
}

function isForbiddenGovernedMcpVcpNativeReadFallbackResultKey(key) {
  const normalizedKey = normalizeGovernedMcpVcpNativeReadFallbackResultKey(key);
  return GOVERNED_MCP_VCP_NATIVE_FALLBACK_FORBIDDEN_RESULT_KEY_NORMAL_FORMS.has(normalizedKey) ||
    GOVERNED_MCP_VCP_NATIVE_FALLBACK_FORBIDDEN_RESULT_KEY_CONTAINS.some(pattern =>
      normalizedKey.includes(pattern)
    ) ||
    GOVERNED_MCP_VCP_NATIVE_FALLBACK_FORBIDDEN_RESULT_KEY_PREFIXES.some(prefix =>
      normalizedKey.startsWith(prefix)
    ) ||
    GOVERNED_MCP_VCP_NATIVE_FALLBACK_FORBIDDEN_RESULT_KEY_SUFFIXES.some(suffix =>
      normalizedKey.endsWith(suffix)
    );
}

function isGovernedMcpVcpNativeBridgeReceiptProjection(value) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    value.schemaVersion === 'governed_native_bridge_audit_memory_projection_v1' &&
    value.eventType === 'governed_mcp_vcp_native_bridge_receipt';
}

function isGovernedMcpVcpNativeReadFallbackReceiptProjection(value) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    value.schemaVersion === 'governed_native_read_fallback_audit_memory_projection_v1' &&
    value.eventType === 'governed_mcp_vcp_native_read_fallback_receipt';
}

function isGovernedNativeBridgeObservationStatusProjection(value) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    value.schemaVersion === 'governed_native_bridge_observation_status_v1';
}

function isGovernedNativeBridgeObservationSummaryProjection(value) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    value.schemaVersion === 'governed_native_bridge_observation_summary_v1';
}

function isAllowedGovernedMcpVcpNativeFalseProofField(key, value, container) {
  if (value !== false) return false;
  if (isGovernedMcpVcpNativeBridgeReceiptProjection(container)) {
    return GOVERNED_MCP_VCP_NATIVE_BRIDGE_RECEIPT_FALSE_PROOF_FIELDS.includes(key);
  }
  if (isGovernedMcpVcpNativeReadFallbackReceiptProjection(container)) {
    return GOVERNED_MCP_VCP_NATIVE_READ_FALLBACK_RECEIPT_FALSE_PROOF_FIELDS.includes(key);
  }
  if (isGovernedNativeBridgeObservationStatusProjection(container)) {
    return GOVERNED_NATIVE_BRIDGE_OBSERVATION_STATUS_FALSE_PROOF_FIELDS.includes(key);
  }
  if (isGovernedNativeBridgeObservationSummaryProjection(container)) {
    return GOVERNED_NATIVE_BRIDGE_OBSERVATION_SUMMARY_FALSE_PROOF_FIELDS.includes(key);
  }
  return false;
}

function isAllowedGovernedMcpVcpNativeSafeGovernanceField(key, value, container) {
  if (
    key === 'nativeInvocationGovernanceMetadataPath' &&
    value === 'params._meta.codexMemoryGovernance' &&
    (
      isGovernedMcpVcpNativeBridgeReceiptProjection(container) ||
      isGovernedNativeBridgeObservationStatusProjection(container) ||
      isGovernedNativeBridgeObservationSummaryProjection(container)
    )
  ) {
    return true;
  }
  if (
    key === 'accessPath' &&
    value === REQUIRED_ACCESS_PATH &&
    isGovernedNativeBridgeObservationSummaryProjection(container)
  ) {
    return true;
  }
  return false;
}

function sanitizeGovernedMcpVcpNativeReadFallbackValue(value) {
  if (Array.isArray(value)) {
    return value.map(item => sanitizeGovernedMcpVcpNativeReadFallbackValue(item));
  }
  if (!value || typeof value !== 'object') return value;
  const sanitized = {};
  for (const [key, nested] of Object.entries(value)) {
    if (
      isForbiddenGovernedMcpVcpNativeReadFallbackResultKey(key) &&
      !isAllowedGovernedMcpVcpNativeFalseProofField(key, nested, value) &&
      !isAllowedGovernedMcpVcpNativeSafeGovernanceField(key, nested, value)
    ) {
      continue;
    }
    sanitized[key] = sanitizeGovernedMcpVcpNativeReadFallbackValue(nested);
  }
  return sanitized;
}

function sanitizeGovernedMcpVcpNativeReadFallbackResult(result) {
  const base = result && typeof result === 'object' && !Array.isArray(result)
    ? result
    : { value: result };
  return sanitizeGovernedMcpVcpNativeReadFallbackValue(base);
}

async function attachGovernedMcpVcpNativeReadFallbackProjection(result, fallbackContext, options = {}) {
  if (!fallbackContext) return result;
  let localFallbackAuditReceipt = options.localFallbackAuditReceipt || null;
  if (!localFallbackAuditReceipt) {
    const prepared = await prepareGovernedMcpVcpNativeReadFallbackAuditReceipt(fallbackContext, options);
    if (prepared.accepted !== true) return prepared.rejectedToolResult;
    localFallbackAuditReceipt = prepared.localFallbackAuditReceipt;
  }

  const localFallbackReadPerformed = options.localFallbackReadPerformed !== false;
  const fallbackContextWithAudit = {
    ...fallbackContext,
    used: true,
    localMemoryFallbackAttempted: true,
    localMemoryFallbackReadPerformed: localFallbackReadPerformed,
    localMemoryFallbackReturned: true,
    localFallbackAuditReceipt
  };
  const base = sanitizeGovernedMcpVcpNativeReadFallbackResult(result);
  const access = base.access && typeof base.access === 'object' && !Array.isArray(base.access)
    ? base.access
    : {};

  return {
    ...base,
    access: {
      ...access,
      primaryRuntime: REQUIRED_PRIMARY_RUNTIME,
      localMemoryRole: 'fallback',
      localMemorySourceRuntime: 'codex_memory_local_fallback',
      localMemoryFallbackAttempted: true,
      localMemoryFallbackUsed: true,
      localMemoryFallbackReadPerformed: localFallbackReadPerformed,
      localMemoryFallbackReturned: true,
      localMemoryFallbackReasonCode: fallbackContext.reasonCode,
      vcpNativeResult: false,
      resultCanBeMistakenForVcpNative: false,
      fallbackRequiresAuditReceipt: true,
      fallbackAfterAuditReceiptAppended: fallbackContext.fallbackAfterAuditReceiptAppended === true,
      localFallbackAuditReceiptStatus: localFallbackAuditReceipt.status,
      nativeInvocationAttempted: fallbackContext.nativeInvocationAttempted === true,
      nativeMcpToolInvocationAttempted: fallbackContext.nativeMcpToolInvocationAttempted === true,
      lowDisclosure: access.lowDisclosure !== false,
      rawOutputReturned: false,
      rawMemoryReturned: false,
      rawAuditReturned: false,
      rawNativeOutputReturned: false,
      rawNativeMemoryReturned: false,
      filesystemPathsReturned: false,
      pathsReturned: false,
      recentAuditReturned: false,
      recentFilesReturned: false,
      memoryLinksReturned: false,
      tokenMaterialReturned: false,
      providerPayloadReturned: false,
      memoryContentReturned: false,
      memoryIdsReturned: false,
      titlesReturned: false,
      snippetsReturned: false,
      endpointReturned: false,
      locatorReturned: false,
      readinessClaimed: false
    },
    governedNativeReadFallback: fallbackContextWithAudit,
    readinessClaimed: false
  };
}

function buildGovernedMcpVcpNativeWriteDelegationRejectedToolResult(delegationResult = {}) {
  const receipt = delegationResult && delegationResult.receipt !== null &&
    typeof delegationResult.receipt === 'object' && !Array.isArray(delegationResult.receipt)
    ? delegationResult.receipt
    : {};
  return {
    status: 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATION_REJECTED',
    accepted: false,
    decision: 'rejected',
    reasonCode: delegationResult.reasonCode || 'governed_mcp_vcp_native_write_delegation_rejected',
    access: {
      mode: 'governed_mcp_vcp_native_bounded_write',
      selectedProjection: true,
      lowDisclosure: true,
      rawOutputReturned: false,
      rawMemoryReturned: false,
      tokenMaterialReturned: false,
      memoryContentReturned: false,
      runtimeCalled: delegationResult.runtimeCalled === true,
      vcpToolBoxCalled: delegationResult.vcpToolBoxCalled === true,
      mcpToolCalled: delegationResult.mcpToolCalled === true,
      memoryWritePerformed: delegationResult.memoryWritePerformed === true,
      localMemoryFallbackEligible: delegationResult.localMemoryFallbackEligible === true,
      localMemoryFallbackUsed: delegationResult.localMemoryFallbackUsed === true,
      auditReceiptRequiredButNotAppended: receipt.auditReceiptRequiredButNotAppended === true,
      delegationStatusClass: safeBridgeDelegationStatusClass(receipt.statusClass),
      delegationReasonCode: safeBridgeDelegationReasonCode(delegationResult.reasonCode),
      rollbackRequired: receipt.rollbackRequired === true,
      rollbackReasonCode: safeBridgeRollbackReasonCode(receipt.rollbackReasonCode),
      rollbackDisposition: safeBridgeRollbackDisposition(receipt.rollbackDisposition),
      rollbackFollowupRequired: receipt.rollbackFollowupRequired === true,
      rollbackApplyPolicy: safeBridgeRollbackApplyPolicy(receipt.rollbackApplyPolicy),
      rollbackApplyAttempted: receipt.rollbackApplyAttempted === true,
      rollbackAutoApplyAllowed: receipt.rollbackAutoApplyAllowed === true
    },
    receipt: delegationResult.receipt || null,
    readinessClaimed: false
  };
}

function enforceRequiredBridgeAuditReceipt(delegationResult, auditReceiptResult, reasonCode, direction = null) {
  if (!delegationResult || !auditReceiptResult || auditReceiptResult.accepted === true) {
    return delegationResult;
  }

  const writePostCommitFailure = direction === 'write' &&
    delegationResult.memoryWritePerformed === true;
  delegationResult.accepted = false;
  delegationResult.reasonCode = reasonCode;
  delegationResult.delegatedResult = null;
  delegationResult.localMemoryFallbackEligible = false;
  delegationResult.localMemoryFallbackUsed = false;
  if (delegationResult.receipt && typeof delegationResult.receipt === 'object' && !Array.isArray(delegationResult.receipt)) {
    delegationResult.receipt.auditReceiptRequiredButNotAppended = true;
    delegationResult.receipt.statusClass = 'audit_receipt_not_appended';
    if (writePostCommitFailure) {
      delegationResult.receipt.rollbackRequired = true;
      delegationResult.receipt.rollbackReasonCode = 'write_post_commit_audit_receipt_not_appended';
      delegationResult.receipt.rollbackDisposition = 'rollback_required_not_applied';
      delegationResult.receipt.rollbackFollowupRequired = true;
      delegationResult.receipt.rollbackApplyPolicy = 'manual_governed_followup_required';
      delegationResult.receipt.rollbackApplyAttempted = false;
      delegationResult.receipt.rollbackAutoApplyAllowed = false;
    }
  }
  return delegationResult;
}

async function executePublicControlledMutationTool(toolName, args = {}, requestContext = {}, serviceCall) {
  if (args.dry_run === false || args.confirm === true) {
    return buildPublicControlledMutationRejectedResult(
      toolName,
      args,
      'public confirmed controlled mutation requires separate exact mutation approval; this public MCP path is dry-run bounded only.'
    );
  }

  const actorContext = buildPublicControlledMutationActorContext(requestContext);
  if (!actorContext.ok) {
    return buildPublicControlledMutationRejectedResult(toolName, args, actorContext.reason);
  }

  const result = await serviceCall({
    ...args,
    actor_client_id: actorContext.actorClientId,
    dry_run: true,
    confirm: false
  });
  return projectPublicControlledMutationResult(toolName, result, args);
}

async function getDefaultWritePreflightCandidates(shadowStore, request = {}) {
  return shadowStore.getWritePreflightCandidates({
    target: request?.proposedWrite?.target,
    allowedScope: request?.allowedScope
  });
}

function firstScopeValue(...values) {
  for (const value of values) {
    const normalized = normalizeScopeValue(value);
    if (normalized) return normalized;
  }
  return '';
}

function buildLifecycleScopeGovernanceCurrentScope(requestContext = {}) {
  const executionContext = requestContext.executionContext || {};

  return {
    userId: firstScopeValue(executionContext.userId, executionContext.user_id),
    projectId: firstScopeValue(executionContext.projectId, executionContext.project_id),
    workspaceId: firstScopeValue(executionContext.workspaceId, executionContext.workspace_id),
    clientId: firstScopeValue(executionContext.clientId, executionContext.client_id, inferRequestClientId(requestContext)),
    agentId: firstScopeValue(executionContext.agentId, executionContext.agent_id),
    taskId: firstScopeValue(executionContext.taskId, executionContext.task_id),
    conversationId: firstScopeValue(executionContext.conversationId, executionContext.conversation_id),
    folder: firstScopeValue(executionContext.folder),
    visibility: firstScopeValue(executionContext.visibility, executionContext.visibility_policy),
    retentionPolicy: firstScopeValue(executionContext.retentionPolicy, executionContext.retention_policy)
  };
}

function lifecycleScopeGovernanceReadPolicyEnabled(requestContext = {}) {
  return requestContext.executionContext?.lifecycleScopeGovernanceReadPolicy === true;
}

async function applyLifecycleScopeGovernanceReadPolicy(results, { requestContext = {}, scope = null, shadowStore } = {}) {
  const baseAudit = {
    lifecycleScopeGovernancePolicyApplied: lifecycleScopeGovernanceReadPolicyEnabled(requestContext),
    acceptedCount: Array.isArray(results) ? results.length : 0,
    suppressedCount: 0,
    lifecycleColumnAvailable: false,
    sanitizedAuditMetadata: [],
    rawContentExposed: false,
    durableMutationExecuted: false,
    publicMcpExpanded: false
  };

  if (!baseAudit.lifecycleScopeGovernancePolicyApplied || !Array.isArray(results)) {
    return {
      results,
      audit: {
        ...baseAudit,
        lifecycleScopeGovernancePolicyApplied: false
      }
    };
  }

  if (results.length === 0) {
    return {
      results,
      audit: baseAudit
    };
  }

  const memoryIds = [...new Set(results.map(item => normalizeResultMemoryId(item)).filter(Boolean))];
  const metadata = memoryIds.length > 0 && shadowStore?.getRecordsLifecycleScopeGovernanceMap
    ? await shadowStore.getRecordsLifecycleScopeGovernanceMap(memoryIds)
    : { lifecycleColumnAvailable: false, records: new Map() };
  const metadataRecords = metadata.records || new Map();
  const currentScope = buildLifecycleScopeGovernanceCurrentScope(requestContext, scope);
  const requiredScopeFields = normalizeScopeFields(LIFECYCLE_SCOPE_GOVERNANCE_SUPPORTED_FIELDS);
  const candidates = results.map(item => {
    const memoryId = normalizeResultMemoryId(item);
    const record = metadataRecords.get(memoryId) || {};
    return {
      memoryId,
      lifecycleStatus: metadata.lifecycleColumnAvailable ? record.lifecycleStatus : null,
      scope: record.scope || {},
      malformedLifecycle: record.malformedLifecycle === true,
      malformedScope: record.malformedScope === true,
      unresolvedRemediation: record.unresolvedRemediation === true
    };
  });
  const filtered = filterRecallCandidatesByLifecycleScope({
    currentScope,
    requiredScopeFields,
    candidates
  });
  const acceptedIds = new Set(filtered.acceptedCandidates.map(item => item.memoryId).filter(Boolean));

  return {
    results: results.filter(item => acceptedIds.has(normalizeResultMemoryId(item))),
    audit: {
      ...baseAudit,
      acceptedCount: filtered.acceptedCount,
      suppressedCount: filtered.suppressedCount,
      lifecycleColumnAvailable: !!metadata.lifecycleColumnAvailable,
      requiredScopeFields,
      sanitizedAuditMetadata: filtered.sanitizedAuditMetadata,
      rawContentExposed: filtered.rawContentExposed,
      durableMutationExecuted: filtered.durableMutationExecuted,
      publicMcpExpanded: filtered.publicMcpExpanded
    }
  };
}

async function applySoftReadPolicy(results, { config, shadowStore, requestContext = {}, scope = null } = {}) {
  if (!config?.enableSoftReadPolicy || !Array.isArray(results) || results.length === 0) {
    return results;
  }

  const memoryIds = [...new Set(results.map(item => normalizeResultMemoryId(item)).filter(Boolean))];
  const policyMap = memoryIds.length > 0
    ? await shadowStore.getRecordsPolicyMap(memoryIds)
    : new Map();
  const requestClientId = inferRequestClientId(requestContext);

  return results.filter(item => {
    const memoryId = normalizeResultMemoryId(item);
    const policy = policyMap.get(memoryId) || {};
    const status = String(policy.status || 'active').toLowerCase();
    if (['proposal', 'rejected', 'tombstoned'].includes(status)) {
      return false;
    }

    const visibility = String(policy.visibility || '').toLowerCase();
    const clientId = String(policy.clientId || '').toLowerCase();
    if (visibility === 'private' && (!clientId || clientId !== requestClientId)) {
      return false;
    }

    return true;
  });
}

const LIFECYCLE_INCLUDED_STATUSES = ['active', 'stale'];
const LIFECYCLE_EXCLUDED_STATUSES = ['proposal', 'rejected', 'superseded', 'tombstoned'];

async function applyLifecycleReadPolicy(results, { config, shadowStore } = {}) {
  const baseAudit = {
    readPolicyApplied: !!config?.enableLifecycleReadPolicy,
    lifecyclePolicyApplied: !!config?.enableLifecycleReadPolicy,
    lifecycleIncludedStatuses: LIFECYCLE_INCLUDED_STATUSES,
    lifecycleExcludedStatuses: LIFECYCLE_EXCLUDED_STATUSES,
    hiddenByLifecycleCount: 0,
    staleResultCount: 0,
    lifecycleColumnAvailable: false,
    statusByMemoryId: new Map()
  };

  if (!config?.enableLifecycleReadPolicy || !Array.isArray(results)) {
    return {
      results,
      audit: {
        ...baseAudit,
        readPolicyApplied: false,
        lifecyclePolicyApplied: false
      }
    };
  }

  if (results.length === 0) {
    return {
      results,
      audit: baseAudit
    };
  }

  const memoryIds = [...new Set(results.map(item => normalizeResultMemoryId(item)).filter(Boolean))];
  const lifecycleMap = memoryIds.length > 0
    ? await shadowStore.getRecordsLifecycleStatusMap(memoryIds)
    : { lifecycleColumnAvailable: false, statuses: new Map() };

  if (!lifecycleMap.lifecycleColumnAvailable) {
    return {
      results: [],
      audit: {
        ...baseAudit,
        hiddenByLifecycleCount: results.length,
        lifecycleColumnAvailable: false
      }
    };
  }

  const statusByMemoryId = lifecycleMap.statuses || new Map();
  const kept = [];
  let hiddenByLifecycleCount = 0;

  for (const item of results) {
    const memoryId = normalizeResultMemoryId(item);
    const status = String(statusByMemoryId.get(memoryId) || '').trim().toLowerCase();
    if (LIFECYCLE_INCLUDED_STATUSES.includes(status)) {
      kept.push(item);
    } else {
      hiddenByLifecycleCount += 1;
    }
  }

  return {
    results: kept,
    audit: {
      ...baseAudit,
      hiddenByLifecycleCount,
      staleResultCount: kept.filter(item => {
        const memoryId = normalizeResultMemoryId(item);
        return String(statusByMemoryId.get(memoryId) || '').trim().toLowerCase() === 'stale';
      }).length,
      lifecycleColumnAvailable: true,
      statusByMemoryId
    }
  };
}

function createCodexMemoryApplication(overrides = {}) {
  const config = createConfig(overrides);
  const phase8OneShotNativeWriteEnforcementEnabled =
    overrides.phase8OneShotNativeWriteEnforcementEnabled === true;
  const phase8OneShotAuthorizationAssertionVerifier =
    typeof overrides.phase8OneShotAuthorizationAssertionVerifier === 'function'
      ? overrides.phase8OneShotAuthorizationAssertionVerifier
      : null;
  const cm2096TombstoneOneShotEnforcementEnabled =
    overrides.cm2096TombstoneOneShotEnforcementEnabled === true;
  const cm2096TombstoneAuthorizationAssertionVerifier =
    typeof overrides.cm2096TombstoneAuthorizationAssertionVerifier === 'function'
      ? overrides.cm2096TombstoneAuthorizationAssertionVerifier
      : null;
  const recordMemoryPrincipalScopeAuthorizationRuntime =
    buildRecordMemoryPrincipalScopeAuthorizationRuntime(
      config.recordMemoryPrincipalScopeAuthorization
    );
  const internalValidateRuntimeEntryEnabled = overrides.internalValidateRuntimeEntryEnabled === true;
  const internalTombstoneRuntimeEntryEnabled = overrides.internalTombstoneRuntimeEntryEnabled === true;
  const internalSupersedeRuntimeEntryEnabled = overrides.internalSupersedeRuntimeEntryEnabled === true;
  const internalMemoryExcludeRuntimeEntryEnabled = overrides.internalMemoryExcludeRuntimeEntryEnabled === true;
  const internalMemoryForgetRuntimeEntryEnabled = overrides.internalMemoryForgetRuntimeEntryEnabled === true;
  const internalMemoryExcludeApplyPlanPreviewEnabled = overrides.internalMemoryExcludeApplyPlanPreviewEnabled === true;
  const internalMemoryForgetApplyPlanPreviewEnabled = overrides.internalMemoryForgetApplyPlanPreviewEnabled === true;
  const diaryStore = new DiaryStore(config);
  const shadowStore = new SqliteShadowStore(config);
  const externalEmbeddingAdapter = new ExternalEmbeddingAdapter(config);
  const vectorStore = new VectorIndexStore(config, {
    externalEmbeddingAdapter
  });
  const chatHistoryIndexStore = new ChatHistoryIndexStore(config);
  const auditLogStore = new AuditLogStore(config);
  const candidateCacheStore = new CandidateCacheStore(config);
  const executionContextResolver = new ExecutionContextResolver(config);
  const compatibilitySyntaxAdapter = new CompatibilitySyntaxAdapter();
  const timeExpressionParser = new TimeExpressionParser();
  const tagMemoEngine = new TagMemoEngine({ config });
  const resultDeduplicator = new ResultDeduplicator();
  const semanticGroupManager = new SemanticGroupManager();
  const recallEnhancer = new RecallEnhancer({
    resultDeduplicator,
    semanticGroupManager
  });
  const chunkIndexingService = new ChunkIndexingService({
    config,
    shadowStore,
    vectorStore
  });
  const contextVectorManager = new ContextVectorManager({
    config,
    vectorStore
  });
  const candidateGenerator = new CandidateGenerator({
    config,
    shadowStore,
    vectorStore,
    tagMemoEngine,
    candidateCacheStore
  });
  const externalRerankAdapter = new ExternalRerankAdapter(config);
  const rerankService = new RerankService({
    config,
    externalRerankAdapter
  });
  const recallAuditService = new RecallAuditService({
    config,
    auditLogStore
  });
  const knowledgeBaseSyncService = new KnowledgeBaseSyncService({
    config,
    diaryStore,
    shadowStore,
    vectorStore,
    chunkIndexingService,
    candidateCacheStore
  });
  const recallPipeline = new KnowledgeBaseRecallPipeline({
    compatibilitySyntaxAdapter,
    timeExpressionParser,
    tagMemoEngine,
    candidateGenerator,
    rerankService,
    recallAuditService,
    recallEnhancer,
    shadowStore,
    knowledgeBaseSyncService,
    contextVectorManager
  });

  const writeService = new MemoryWriteService({
    config,
    diaryStore,
    shadowStore,
    vectorStore,
    auditLogStore,
    executionContextResolver,
    chunkIndexingService,
    writePreflightEnabled: config.enableWritePreflight === true,
    writePreflightCandidateProvider: request => getDefaultWritePreflightCandidates(shadowStore, request),
    recordMemoryPrincipalScopeAuthorizationPreflight:
      overrides.recordMemoryPrincipalScopeAuthorizationPreflight ||
      recordMemoryPrincipalScopeAuthorizationRuntime.preflight,
    recordMemoryPrincipalScopeAuthorizationPolicy:
      overrides.recordMemoryPrincipalScopeAuthorizationPolicy ||
      recordMemoryPrincipalScopeAuthorizationRuntime.policy,
    recordMemoryPrincipalScopeAuthorizationObserver:
      overrides.recordMemoryPrincipalScopeAuthorizationObserver,
    recordMemoryPrincipalScopeAuthorizationStrictMode:
      overrides.recordMemoryPrincipalScopeAuthorizationStrictMode === true ||
      recordMemoryPrincipalScopeAuthorizationRuntime.strictMode === true
  });
  const memoryWriteReconcileService = new MemoryWriteReconcileService({
    shadowStore,
    vectorStore,
    chunkIndexingService
  });
  const memoryWriteReconcileWorker = new MemoryWriteReconcileWorker({
    reconcileService: memoryWriteReconcileService
  });
  const memoryLifecycleProjectionCleanupService = new MemoryLifecycleProjectionCleanupService({
    diaryStore,
    shadowStore,
    vectorStore,
    candidateCacheStore,
    auditLogStore
  });
  const validateMemoryService = new ValidateMemoryService({
    config,
    shadowStore,
    auditLogStore
  });
  const tombstoneMemoryService = new TombstoneMemoryService({
    config,
    shadowStore,
    auditLogStore,
    projectionCleanupService: memoryLifecycleProjectionCleanupService,
    projectionCleanupAppendAudit: overrides.projectionCleanupAppendAudit !== false
  });
  const supersedeMemoryService = new SupersedeMemoryService({
    config,
    shadowStore,
    auditLogStore,
    projectionCleanupService: memoryLifecycleProjectionCleanupService,
    projectionCleanupAppendAudit: overrides.projectionCleanupAppendAudit !== false
  });
  const deferredGovernanceRuntimeEntryAdapter = new DeferredGovernanceRuntimeEntryAdapter({
    memoryExcludeEnabled: internalMemoryExcludeRuntimeEntryEnabled,
    memoryForgetEnabled: internalMemoryForgetRuntimeEntryEnabled,
    memoryExcludeApplyPlanPreviewEnabled: internalMemoryExcludeApplyPlanPreviewEnabled,
    memoryForgetApplyPlanPreviewEnabled: internalMemoryForgetApplyPlanPreviewEnabled
  });

  const passiveRecallService = new PassiveRecallService({
    pipeline: recallPipeline
  });

  const activeRecallService = new ActiveRecallService({
    chatHistoryIndexStore
  });

  const overviewService = new MemoryOverviewService({
    config,
    auditLogStore,
    diaryStore,
    shadowStore,
    vectorStore,
    candidateCacheStore,
    chatHistoryIndexStore
  });
  const auditMemoryReadonlyService = new AuditMemoryReadonlyService({
    decisionProvider: buildGovernedNativeBridgeAuditMemoryDecisionProvider({ auditLogStore })
  });
  const governedMcpVcpNativeBridgeGateObserver =
    typeof overrides.governedMcpVcpNativeBridgeGateObserver === 'function'
      ? overrides.governedMcpVcpNativeBridgeGateObserver
      : null;
  const governedMcpVcpNativeReadShapeProbeInvokerRegistry =
    buildGovernedMcpVcpNativeReadShapeProbeInvokerRegistry(config, overrides);
  const governedMcpVcpNativeReadDelegationToolCaller =
    buildGovernedMcpVcpNativeReadDelegationToolCaller(config, overrides);
  const governedMcpVcpNativeWriteDelegationToolCaller =
    buildGovernedMcpVcpNativeWriteDelegationToolCaller(config, overrides);
  const governedNativeBridgeObservationStore = createGovernedNativeBridgeObservationStore();

  const vcpPassiveMemoryAdapter = new VcpPassiveMemoryAdapter({
    passiveRecallService,
    compatibilitySyntaxAdapter
  });

  const vcpActiveMemoryAdapter = new VcpActiveMemoryAdapter({
    config,
    activeRecallService,
    compatibilitySyntaxAdapter,
    rerankService
  });
  const vcpLightMemoryAdapter = new VcpLightMemoryAdapter({
    config,
    passiveRecallService,
    vcpPassiveMemoryAdapter
  });

  async function executeSearchMemory(args = {}, requestContext = {}, { signal = null } = {}) {
    throwIfSearchMemoryAborted(signal, config.searchMemoryTimeoutMs);
    const authenticatedBoundedSearch = isAuthenticatedBoundedSearchRequest(requestContext);
    const metadataOnlyBoundedSearch = authenticatedBoundedSearch
      || requestContext.memoryContextPackageReadOnly === true;
    if (metadataOnlyBoundedSearch && args.include_content === true) {
      return buildAuthenticatedBoundedSearchRejected('metadata-only bounded search does not allow include_content=true.');
    }
    const readOnly = requestContext.noTokenReadOnly === true || metadataOnlyBoundedSearch;
    const precisionPolicyContext = normalizeInternalPrecisionPolicyContext(requestContext)
      || buildAuthenticatedBoundedSearchPrecisionPolicyContext(args, requestContext);
    const noRawContentRead = normalizeInternalNoRawContentRead(requestContext);
    const scopeFilter = args.scope && typeof args.scope === 'object' ? args.scope : null;
    const scopeAudit = buildScopeAuditContext(scopeFilter);
    const searchResults = await passiveRecallService.search({
      query: args.query,
      target: args.target || 'both',
      limit: args.limit,
      includeContent: !!args.include_content,
      contextText: args.context_text || '',
      source: 'mcp',
      candidateFilters: buildScopeCandidateFilters(scopeFilter),
      auditContext: {
        scope: scopeAudit
      },
      signal,
      readOnly,
      precisionPolicyContext,
      noRawContentRead
    });
    throwIfSearchMemoryAborted(signal, config.searchMemoryTimeoutMs);
    const filtered = (scopeFilter && searchResults && searchResults.length)
      ? await applyScopeFilter(searchResults, scopeFilter, shadowStore)
      : searchResults;
    throwIfSearchMemoryAborted(signal, config.searchMemoryTimeoutMs);
    const lifecycleFiltered = await applyLifecycleReadPolicy(filtered, {
      config,
      shadowStore
    });
    throwIfSearchMemoryAborted(signal, config.searchMemoryTimeoutMs);
    const governanceFiltered = await applyLifecycleScopeGovernanceReadPolicy(lifecycleFiltered.results, {
      requestContext,
      scope: scopeFilter,
      shadowStore
    });
    throwIfSearchMemoryAborted(signal, config.searchMemoryTimeoutMs);
    const policyFiltered = await applySoftReadPolicy(governanceFiltered.results, {
      config,
      shadowStore,
      requestContext,
      scope: scopeFilter
    });
    throwIfSearchMemoryAborted(signal, config.searchMemoryTimeoutMs);
    if (config.enableLifecycleReadPolicy && !readOnly) {
      const statusByMemoryId = lifecycleFiltered.audit.statusByMemoryId || new Map();
      const policyAudit = {
        ...lifecycleFiltered.audit,
        staleResultCount: policyFiltered.filter(item => {
          const memoryId = normalizeResultMemoryId(item);
          return String(statusByMemoryId.get(memoryId) || '').trim().toLowerCase() === 'stale';
        }).length
      };
      delete policyAudit.statusByMemoryId;
      policyAudit.hiddenByLifecycleCount = Number(lifecycleFiltered.audit.hiddenByLifecycleCount || 0);
      await recallAuditService.recordReadPolicySummary({
        target: args.target || 'both',
        results: policyFiltered,
        source: 'mcp',
        scopeAudit,
        policyAudit
      });
    }
    if (requestContext.memoryContextPackageReadOnly === true) {
      return projectMemoryContextPackageSearchResponse(policyFiltered);
    }
    if (authenticatedBoundedSearch) {
      return projectAuthenticatedBoundedSearchResponse(policyFiltered);
    }
    return { results: policyFiltered };
  }

  let application = null;
  const governedRecallGateway = new GovernedRecallGateway({
    callSearchMemory: (searchArgs, searchRequestContext) => {
      if (!application) throw new Error('governed_recall_gateway_application_not_ready');
      return application.callTool('search_memory', searchArgs, searchRequestContext);
    }
  });
  const governedReadFacade = new GovernedReadFacade({
    nativeRecall: (searchArgs, searchRequestContext) =>
      governedRecallGateway.search(searchArgs, searchRequestContext),
    governanceOverview: overviewArgs => overviewService.getAuthenticatedBoundedOverview(overviewArgs),
    governanceAudit: auditArgs => auditMemoryReadonlyService.run(auditArgs)
  });
  const memoryContextPackageService = new MemoryContextPackageService({
    searchMemory: (searchArgs, searchRequestContext) =>
      governedRecallGateway.search(searchArgs, searchRequestContext),
    overviewService,
    auditMemoryReadonlyService,
    governedReadFacade
  });
  const taskStartMemoryContextWorkflow = new TaskStartMemoryContextWorkflow({
    prepareMemoryContext: (prepareArgs, prepareRequestContext) =>
      memoryContextPackageService.prepare(prepareArgs, prepareRequestContext)
  });
  const memoryDeltaProposalService = new MemoryDeltaProposalService();

  application = {
    config,
    stores: {
      diaryStore,
      shadowStore,
      vectorStore,
      chatHistoryIndexStore,
      auditLogStore,
      candidateCacheStore
    },
    services: {
      writeService,
      memoryWriteReconcileService,
      memoryWriteReconcileWorker,
      memoryLifecycleProjectionCleanupService,
      validateMemoryService,
      tombstoneMemoryService,
      supersedeMemoryService,
      deferredGovernanceRuntimeEntryAdapter,
      passiveRecallService,
      activeRecallService,
      overviewService,
      memoryContextPackageService,
      taskStartMemoryContextWorkflow,
      memoryDeltaProposalService,
      auditMemoryReadonlyService,
      governedRecallGateway,
      governedReadFacade,
      governedNativeBridgeObservationStore
    },
    adapters: {
      compatibilitySyntaxAdapter,
      vcpPassiveMemoryAdapter,
      vcpActiveMemoryAdapter,
      vcpLightMemoryAdapter
    },
    recall: {
      timeExpressionParser,
      tagMemoEngine,
      resultDeduplicator,
      semanticGroupManager,
      chunkIndexingService,
      contextVectorManager,
      candidateGenerator,
      externalEmbeddingAdapter,
      externalRerankAdapter,
      rerankService,
      recallAuditService,
      knowledgeBaseSyncService,
      recallPipeline
    },
    async initialize() {
      await diaryStore.ensureReady();
      await shadowStore.ensureReady();
      await auditLogStore.ensureReady();
      await vectorStore.ensureReady();
      await chatHistoryIndexStore.ensureReady();
      await candidateCacheStore.ensureReady();

      if (config.autoRebuildShadowOnStart) {
        await this.rebuildShadowFromDiary();
      }

      if (config.autoRebuildActiveMemoryOnStart && config.activeMemoryRootPath) {
        await activeRecallService.rebuildFromVchat({
          rootPath: config.activeMemoryRootPath
        });
      }
    },
    async callTool(toolName, args = {}, requestContext = {}) {
      let effectiveRequestContext = requestContext;
      if (toolName === 'record_memory' && phase8OneShotNativeWriteEnforcementEnabled) {
        if (
          requestContext.exactApprovalResult !== undefined ||
          !phase8OneShotAuthorizationAssertionVerifier ||
          config.governedMcpVcpNativeWriteDelegationMode !== 'primary'
        ) {
          return {
            decision: 'rejected',
            reasonCode: 'phase8_one_shot_authorization_required',
            lowDisclosure: true,
            nativeWritePerformed: false,
            durableWritePerformed: false,
            localFallbackWritePerformed: false
          };
        }
        const assertionResult = await phase8OneShotAuthorizationAssertionVerifier(
          requestContext.phase8OneShotAuthorizationAssertion
        );
        if (assertionResult?.accepted !== true || !assertionResult.exactApprovalResult) {
          return {
            decision: 'rejected',
            reasonCode: 'phase8_one_shot_authorization_claim_invalid',
            lowDisclosure: true,
            nativeWritePerformed: false,
            durableWritePerformed: false,
            localFallbackWritePerformed: false
          };
        }
        effectiveRequestContext = {
          ...requestContext,
          exactApprovalResult: assertionResult.exactApprovalResult
        };
        delete effectiveRequestContext.phase8OneShotAuthorizationAssertion;
      }
      if (toolName === 'tombstone_memory' && cm2096TombstoneOneShotEnforcementEnabled) {
        if (
          requestContext.exactApprovalResult !== undefined ||
          !cm2096TombstoneAuthorizationAssertionVerifier ||
          !cm2096TombstoneNativeRouteAccepted(
            config,
            governedMcpVcpNativeWriteDelegationToolCaller
          ) ||
          cm2096TombstoneBridgeApprovalAccepted({ args, requestContext, config }) === false
        ) {
          return {
            decision: 'rejected',
            reasonCode: 'cm2096_tombstone_one_shot_authorization_required',
            lowDisclosure: true,
            nativeWritePerformed: false,
            durableWritePerformed: false,
            localFallbackWritePerformed: false
          };
        }
        const assertionResult = await cm2096TombstoneAuthorizationAssertionVerifier(
          requestContext.cm2096TombstoneAuthorizationAssertion
        );
        if (assertionResult?.accepted !== true || !assertionResult.exactApprovalResult) {
          return {
            decision: 'rejected',
            reasonCode: 'cm2096_tombstone_one_shot_authorization_claim_invalid',
            lowDisclosure: true,
            nativeWritePerformed: false,
            durableWritePerformed: false,
            localFallbackWritePerformed: false
          };
        }
        effectiveRequestContext = {
          ...requestContext,
          exactApprovalResult: assertionResult.exactApprovalResult
        };
        delete effectiveRequestContext.cm2096TombstoneAuthorizationAssertion;
      }
      let governedNativeReadFallbackContext = null;
      let governedNativeReadFallbackAuditReceipt = null;
      let governedNativeReadFallbackArgs = null;
      if (
        toolName === 'memory_overview' &&
        args !== null &&
        typeof args === 'object' &&
        Object.prototype.hasOwnProperty.call(args, 'probe_nonce')
      ) {
        return overviewService.getChatGptWebTransportProbe({
          probeNonce: args.probe_nonce,
          requestContext: effectiveRequestContext
        });
      }
      if (toolName === 'memory_overview' && requestContext.noTokenReadOnly === true) {
        return overviewService.getNoTokenSelectedOverview({
          auditWindow: args?.auditWindow
        });
      }
      if (
        effectiveRequestContext.channelIdentity === 'chatgpt_web' &&
        isGovernedMcpVcpNativeReadDelegationTool(toolName) &&
        (
          config.governedMcpVcpNativeBridgeGateMode === 'off' ||
          config.governedMcpVcpNativeReadDelegationMode !== 'primary'
        )
      ) {
        return buildChatGptWebReadOnlyDelegationRequiredRejection();
      }
      if (
        (
          config.governedMcpVcpNativeBridgeGateMode !== 'off' ||
          governedMcpVcpNativeDelegationRequested(config, toolName)
        ) &&
        isGovernedMcpVcpNativeBridgeTool(toolName)
      ) {
        if (
          config.governedMcpVcpNativeBridgeGateMode === 'off' &&
          governedMcpVcpNativeDelegationRequested(config, toolName)
        ) {
          return buildGovernedMcpVcpNativeDelegationRequiresGateRejection(toolName);
        }
        const gateResult = validateGovernedMcpVcpNativeBridgeGate(
          buildGovernedMcpVcpNativeBridgeGateInput({
            toolName,
            args,
            requestContext: effectiveRequestContext,
            config
          })
        );
        if (
          gateResult.accepted === true &&
          isGovernedMcpVcpNativeReadDelegationTool(toolName) &&
          gateResult.normalizedBridgeRequest &&
          typeof gateResult.normalizedBridgeRequest === 'object'
        ) {
          const enforcement = config.governedMcpVcpNativeScopeEnforcement || {};
          const enforcementBound = enforcement.scopeEnforcementMode === 'diary_allowlist_v1' &&
            enforcement.expectedMappingReference === 'jenn-vcp-diary-scope-v1' &&
            /^sha256:[a-f0-9]{64}$/.test(enforcement.expectedMappingDigest || '');
          Object.assign(gateResult.normalizedBridgeRequest, {
            scope_enforcement_mode: 'diary_allowlist_v1',
            expected_mapping_reference: enforcementBound
              ? enforcement.expectedMappingReference
              : null,
            expected_mapping_digest: enforcementBound
              ? enforcement.expectedMappingDigest
              : null,
            recall_profile: effectiveRequestContext.memoryContextPackageReadOnly === true
              ? 'task_start_context'
              : 'exact_visibility',
            native_scope_filtering_proven: enforcementBound,
            scope_id_affects_diary_acl: false,
            scope_id_enforcement_claimed: false
          });
        }
        const readOnlyProbeResult = gateResult.accepted === true
          ? buildGovernedMcpVcpNativeReadOnlyProbeAdapter({ toolName, gateResult })
          : null;
        const skipUnmappedNativeReadAction =
          shouldSkipGovernedMcpVcpNativeReadDelegationForUnmappedAction(config, toolName);
        const nativeScopeFilteringUnproven =
          isGovernedMcpVcpNativeReadDelegationTool(toolName) &&
          SCOPE_FILTERING_REQUIRED_VISIBILITIES.includes(
            gateResult.normalizedBridgeRequest?.visibility
          ) &&
          gateResult.normalizedBridgeRequest?.native_scope_filtering_proven !== true;
        const readShapeProbeTargetResolverResult = gateResult.accepted === true &&
          !skipUnmappedNativeReadAction &&
          !nativeScopeFilteringUnproven
          ? resolveGovernedMcpVcpNativeReadShapeProbeTarget({
            gateResult,
            config,
            invokerRegistry: governedMcpVcpNativeReadShapeProbeInvokerRegistry
          })
          : null;
        const readShapeProbeExecutionResult =
          readShapeProbeTargetResolverResult?.accepted === true
            ? await executeGovernedMcpVcpNativeReadShapeProbe({
              toolName,
              gateResult,
              invokeComponentAction: readShapeProbeTargetResolverResult.invokeComponentAction,
              resolverCategory: readShapeProbeTargetResolverResult.resolverCategory,
              transportCategory: readShapeProbeTargetResolverResult.transportCategory
            })
            : null;
        const readDelegationEnabled = config.governedMcpVcpNativeReadDelegationMode !== 'off' &&
          !skipUnmappedNativeReadAction &&
          gateResult.accepted === true &&
          gateResult.normalizedBridgeRequest?.read_allowed === true &&
          gateResult.normalizedBridgeRequest?.write_allowed === false;
        const readDelegationResult = readDelegationEnabled
          ? await executeGovernedMcpVcpNativeReadDelegation({
            toolName,
            args,
            gateResult,
            callMcpTool: governedMcpVcpNativeReadDelegationToolCaller
          })
          : null;
        const writeDelegationEnabled = config.governedMcpVcpNativeWriteDelegationMode !== 'off' &&
          gateResult.accepted === true &&
          gateResult.normalizedBridgeRequest?.read_allowed === false &&
          gateResult.normalizedBridgeRequest?.write_allowed === true;
        const writeDelegationResult = writeDelegationEnabled
          ? await executeGovernedMcpVcpNativeWriteDelegation({
            toolName,
            args,
            gateResult,
            callMcpTool: governedMcpVcpNativeWriteDelegationToolCaller
          })
          : null;
        const bridgeAuditReceiptResult = readDelegationResult || writeDelegationResult
          ? await recordGovernedMcpVcpNativeBridgeAuditReceipt({
            auditLogStore,
            toolName,
            gateResult,
            readDelegationResult,
            writeDelegationResult
          })
          : null;
        attachBridgeAuditReceiptStatus(readDelegationResult, bridgeAuditReceiptResult);
        attachBridgeAuditReceiptStatus(writeDelegationResult, bridgeAuditReceiptResult);
        enforceRequiredBridgeAuditReceipt(
          readDelegationResult,
          bridgeAuditReceiptResult,
          'required_bridge_audit_receipt_not_appended',
          'read'
        );
        enforceRequiredBridgeAuditReceipt(
          writeDelegationResult,
          bridgeAuditReceiptResult,
          'required_bridge_audit_receipt_not_appended',
          'write'
        );
        const governedNativeBridgeObservation = {
            toolName,
            mode: config.governedMcpVcpNativeBridgeGateMode,
            gateResult,
            readOnlyProbeResult,
            readShapeProbeTargetResolverResult:
              projectReadShapeProbeTargetResolverObservation(readShapeProbeTargetResolverResult),
            readShapeProbeExecutionResult,
            readDelegationResult,
            writeDelegationResult,
            bridgeAuditReceiptResult
          };
        governedNativeBridgeObservationStore.record(governedNativeBridgeObservation);
        if (governedMcpVcpNativeBridgeGateObserver) {
          governedMcpVcpNativeBridgeGateObserver(governedNativeBridgeObservation);
        }
        if (config.governedMcpVcpNativeBridgeGateMode === 'strict' && !gateResult.accepted) {
          return buildGovernedMcpVcpNativeBridgeRejectedToolResult(gateResult);
        }
        if (
          config.governedMcpVcpNativeReadDelegationMode !== 'off' &&
          isGovernedMcpVcpNativeReadDelegationTool(toolName) &&
          gateResult.accepted !== true
        ) {
          return buildGovernedMcpVcpNativeBridgeRejectedToolResult(gateResult);
        }
        if (
          config.governedMcpVcpNativeWriteDelegationMode === 'primary' &&
          gateResult.accepted !== true &&
          gateResult.normalizedBridgeRequest?.write_allowed === true
        ) {
          return buildGovernedMcpVcpNativeBridgeRejectedToolResult(gateResult);
        }
        if (readDelegationResult?.accepted === true) {
          return readDelegationResult.delegatedResult;
        }
        if (
          readDelegationResult &&
          config.governedMcpVcpNativeReadDelegationMode === 'primary'
        ) {
          return buildGovernedMcpVcpNativeReadDelegationRejectedToolResult(readDelegationResult);
        }
        if (
          readDelegationResult &&
          config.governedMcpVcpNativeReadDelegationMode === 'primary_with_local_fallback' &&
          readDelegationResult.localMemoryFallbackEligible !== true
        ) {
          return buildGovernedMcpVcpNativeReadDelegationRejectedToolResult(readDelegationResult);
        }
        if (
          readDelegationResult &&
          config.governedMcpVcpNativeReadDelegationMode === 'primary_with_local_fallback' &&
          readDelegationResult.localMemoryFallbackEligible === true
        ) {
          governedNativeReadFallbackContext =
            buildGovernedMcpVcpNativeReadFallbackContext(readDelegationResult, gateResult);
          governedNativeReadFallbackArgs =
            buildGovernedMcpVcpNativeReadFallbackArguments(toolName, args, gateResult);
          const preparedFallbackAuditReceipt =
            await prepareGovernedMcpVcpNativeReadFallbackAuditReceipt(
              governedNativeReadFallbackContext,
              { auditLogStore, toolName }
            );
          if (preparedFallbackAuditReceipt.accepted !== true) {
            return preparedFallbackAuditReceipt.rejectedToolResult;
          }
          governedNativeReadFallbackAuditReceipt =
            preparedFallbackAuditReceipt.localFallbackAuditReceipt;
        }
        if (writeDelegationResult?.accepted === true) {
          return writeDelegationResult.delegatedResult;
        }
        if (
          writeDelegationResult &&
          config.governedMcpVcpNativeWriteDelegationMode === 'primary'
        ) {
          return buildGovernedMcpVcpNativeWriteDelegationRejectedToolResult(writeDelegationResult);
        }
        if (
          isGovernedMcpVcpNativeWriteDelegationTool(toolName) &&
          gateResult.accepted === true &&
          gateResult.normalizedBridgeRequest?.write_allowed === true &&
          !writeDelegationResult
        ) {
          return buildGovernedMcpVcpNativeWriteDelegationRequiredRejection();
        }
      }

      if (toolName === 'record_memory') {
        if (phase8OneShotNativeWriteEnforcementEnabled) {
          return {
            decision: 'rejected',
            reasonCode: 'phase8_one_shot_local_fallback_forbidden',
            lowDisclosure: true,
            nativeWritePerformed: false,
            durableWritePerformed: false,
            localFallbackWritePerformed: false
          };
        }
        return writeService.record(args, effectiveRequestContext);
      }

      if (toolName === 'search_memory') {
        const effectiveArgs = governedNativeReadFallbackArgs || args;
        if (governedNativeReadFallbackContext && effectiveArgs.limit === 0) {
          return await attachGovernedMcpVcpNativeReadFallbackProjection(
            { results: [] },
            governedNativeReadFallbackContext,
            {
              auditLogStore,
              toolName,
              localFallbackAuditReceipt: governedNativeReadFallbackAuditReceipt,
              localFallbackReadPerformed: false
            }
          );
        }
        const result = await runSearchMemoryWithTimeout(
          ({ signal }) => executeSearchMemory(effectiveArgs, requestContext, { signal }),
          { timeoutMs: config.searchMemoryTimeoutMs }
        );
        return await attachGovernedMcpVcpNativeReadFallbackProjection(
          result,
          governedNativeReadFallbackContext,
          {
            auditLogStore,
            toolName,
            localFallbackAuditReceipt: governedNativeReadFallbackAuditReceipt
          }
        );
      }

      if (toolName === 'prepare_memory_context') {
        if (requestContext.channelIdentity === 'chatgpt_web') {
          const trustedCompositeRequest =
            requestContext.chatgptWebProfileId === 'chatgpt_web_context_v2' &&
            requestContext.executionContext?.requestSource === 'chatgpt_web_mcp' &&
            config.chatgptWebProfile?.enabled === true &&
            config.chatgptWebProfile?.compositeReadGatePassed === true;
          if (!trustedCompositeRequest) throw new Error('VCP_COMPOSITE_READ_NOT_READY');
          return memoryContextPackageService.prepareChatGptWeb(args, requestContext);
        }
        return memoryContextPackageService.prepare(args, requestContext);
      }

      if (toolName === 'propose_memory_delta') {
        return memoryDeltaProposalService.propose(args, requestContext);
      }

      if (toolName === 'memory_overview') {
        const effectiveArgs = governedNativeReadFallbackArgs || args;
        if (
          governedNativeReadFallbackContext &&
          effectiveArgs.auditWindow === 0 &&
          effectiveArgs.limit === 0
        ) {
          return await attachGovernedMcpVcpNativeReadFallbackProjection(
            buildZeroItemGovernedMcpVcpNativeOverviewFallbackResult(),
            governedNativeReadFallbackContext,
            {
              auditLogStore,
              toolName,
              localFallbackAuditReceipt: governedNativeReadFallbackAuditReceipt,
              localFallbackReadPerformed: false
            }
          );
        }
        if (governedNativeReadFallbackContext) {
          const result = attachGovernedNativeBridgeOverviewStatus(
            await overviewService.getAuthenticatedBoundedOverview({
              auditWindow: effectiveArgs.auditWindow
            }),
            governedNativeBridgeObservationStore
          );
          return await attachGovernedMcpVcpNativeReadFallbackProjection(
            result,
            governedNativeReadFallbackContext,
            {
              auditLogStore,
              toolName,
              localFallbackAuditReceipt: governedNativeReadFallbackAuditReceipt
            }
          );
        }
        if (requestContext.authenticatedBoundedOverview === true) {
          const result = attachGovernedNativeBridgeOverviewStatus(
            await overviewService.getAuthenticatedBoundedOverview({
              auditWindow: effectiveArgs.auditWindow
            }),
            governedNativeBridgeObservationStore
          );
          return await attachGovernedMcpVcpNativeReadFallbackProjection(
            result,
            governedNativeReadFallbackContext,
            {
              auditLogStore,
              toolName,
              localFallbackAuditReceipt: governedNativeReadFallbackAuditReceipt
            }
          );
        }
        const result = attachGovernedNativeBridgeOverviewStatus(
          await overviewService.getOverview({
            auditWindow: effectiveArgs.auditWindow,
            limit: effectiveArgs.limit
          }),
          governedNativeBridgeObservationStore
        );
        return await attachGovernedMcpVcpNativeReadFallbackProjection(
          result,
          governedNativeReadFallbackContext,
          {
            auditLogStore,
            toolName,
            localFallbackAuditReceipt: governedNativeReadFallbackAuditReceipt
          }
        );
      }

      if (toolName === 'audit_memory') {
        const effectiveArgs = governedNativeReadFallbackArgs || args;
        if (governedNativeReadFallbackContext && effectiveArgs.window === 0) {
          return await attachGovernedMcpVcpNativeReadFallbackProjection(
            {
              status: AUDIT_MEMORY_SERVICE_STATUS_ACCEPTED,
              accepted: true,
              blockerReasons: [],
              access: {
                mode: AUDIT_MEMORY_ACCESS_MODE,
                selectedProjection: true,
                rawMemoryReturned: false,
                rawAuditReturned: false,
                filesystemPathsReturned: false,
                tokenMaterialReturned: false,
                providerPayloadReturned: false,
                memoryIdsReturned: false,
                titlesReturned: false,
                snippetsReturned: false,
                contentReturned: false
              },
              summary: {
                requestedFamily: effectiveArgs.audit_family || 'all',
                window: 0,
                visibleDecisionCount: 0,
                hiddenDecisionCount: 0,
                suppressedDecisionCount: 0
              },
              policy: {
                lifecyclePolicyExplained: true,
                scopePolicyExplained: true,
                redactionApplied: true,
                governedNativeBridgeAuditReceiptProjection: false,
                rawAuditScanPerformed: false,
                providerCalled: false,
                durableMutationPerformed: false,
                publicMcpExpanded: false,
                readinessClaimed: false,
                rcReadyClaimed: false
              },
              findings: []
            },
            governedNativeReadFallbackContext,
            {
              auditLogStore,
              toolName,
              localFallbackAuditReceipt: governedNativeReadFallbackAuditReceipt,
              localFallbackReadPerformed: false
            }
          );
        }
        const result = await auditMemoryReadonlyService.run(effectiveArgs);
        return await attachGovernedMcpVcpNativeReadFallbackProjection(
          result,
          governedNativeReadFallbackContext,
          {
            auditLogStore,
            toolName,
            localFallbackAuditReceipt: governedNativeReadFallbackAuditReceipt
          }
        );
      }

      if (toolName === 'validate_memory') {
        return executePublicControlledMutationTool(
          toolName,
          args,
          requestContext,
          payload => validateMemoryService.validate(payload)
        );
      }

      if (toolName === 'tombstone_memory') {
        if (cm2096TombstoneOneShotEnforcementEnabled) {
          return {
            decision: 'rejected',
            reasonCode: 'cm2096_tombstone_local_fallback_forbidden',
            lowDisclosure: true,
            nativeWritePerformed: false,
            durableWritePerformed: false,
            localFallbackWritePerformed: false
          };
        }
        return executePublicControlledMutationTool(
          toolName,
          args,
          requestContext,
          payload => tombstoneMemoryService.tombstone(payload)
        );
      }

      if (toolName === 'supersede_memory') {
        return executePublicControlledMutationTool(
          toolName,
          args,
          requestContext,
          payload => supersedeMemoryService.supersede(payload)
        );
      }

      throw new Error(`Unknown tool: ${toolName}`);
    },
    async rebuildShadowFromDiary(options = {}) {
      return knowledgeBaseSyncService.syncTarget(options.target || 'both', { force: true });
    },
    async rebuildActiveMemoryFromSource(options = {}) {
      return activeRecallService.rebuildFromVchat({
        rootPath: options.rootPath || config.activeMemoryRootPath
      });
    },
    async syncActiveMemoryFromSource(options = {}) {
      return activeRecallService.syncFromVchat({
        rootPath: options.rootPath || config.activeMemoryRootPath,
        force: !!options.force
      });
    },
    async executeInternalValidate(args = {}, requestContext = {}) {
      const normalized = buildInternalValidateRuntimePayload(args, requestContext, {
        enabled: internalValidateRuntimeEntryEnabled
      });
      if (!normalized.ok) {
        return validateMemoryService.buildRejectedResult({
          reason: normalized.reason,
          payload: normalized.payload,
          dryRun: normalized.payload?.dry_run !== false
        });
      }
      return validateMemoryService.validate(normalized.payload);
    },
    async executeInternalTombstone(args = {}, requestContext = {}) {
      const normalized = buildInternalTombstoneRuntimePayload(args, requestContext, {
        enabled: internalTombstoneRuntimeEntryEnabled
      });
      if (!normalized.ok) {
        return tombstoneMemoryService.buildRejectedResult({
          reason: normalized.reason,
          payload: normalized.payload,
          dryRun: normalized.payload?.dry_run !== false
        });
      }
      return tombstoneMemoryService.tombstone(normalized.payload);
    },
    async executeInternalSupersede(args = {}, requestContext = {}) {
      const normalized = buildInternalSupersedeRuntimePayload(args, requestContext, {
        enabled: internalSupersedeRuntimeEntryEnabled
      });
      if (!normalized.ok) {
        return supersedeMemoryService.buildRejectedResult({
          reason: normalized.reason,
          payload: normalized.payload,
          dryRun: normalized.payload?.dry_run !== false
        });
      }
      return supersedeMemoryService.supersede(normalized.payload);
    },
    async executeInternalMemoryExclude(args = {}, requestContext = {}) {
      return deferredGovernanceRuntimeEntryAdapter.executeInternalMemoryExclude(args, requestContext);
    },
    async executeInternalMemoryForget(args = {}, requestContext = {}) {
      return deferredGovernanceRuntimeEntryAdapter.executeInternalMemoryForget(args, requestContext);
    },
    async previewInternalMemoryExcludeApplyPlan(args = {}, requestContext = {}) {
      return deferredGovernanceRuntimeEntryAdapter.previewInternalMemoryExcludeApplyPlan(args, requestContext);
    },
    async previewInternalMemoryForgetApplyPlan(args = {}, requestContext = {}) {
      return deferredGovernanceRuntimeEntryAdapter.previewInternalMemoryForgetApplyPlan(args, requestContext);
    },
    async close() {
      memoryWriteReconcileWorker.stop();
      await shadowStore.close();
    }
  };
  return application;
}

module.exports = {
  applyLifecycleReadPolicy,
  applyLifecycleScopeGovernanceReadPolicy,
  applySoftReadPolicy,
  buildGovernedMcpVcpNativeReadFallbackLocalAuditReceipt,
  prepareGovernedMcpVcpNativeReadFallbackAuditReceipt,
  inferRequestClientId,
  createCodexMemoryApplication
};
