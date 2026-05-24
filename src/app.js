const { createConfig } = require('./config/createConfig');
const { ExecutionContextResolver } = require('./core/ExecutionContextResolver');
const { RecallEnhancer } = require('./core/RecallEnhancer');
const { MemoryWriteService } = require('./core/MemoryWriteService');
const { ValidateMemoryService } = require('./core/ValidateMemoryService');
const { PassiveRecallService } = require('./core/PassiveRecallService');
const { ActiveRecallService } = require('./core/ActiveRecallService');
const { MemoryOverviewService } = require('./core/MemoryOverviewService');
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

  const projectId = typeof scope.project_id === 'string' ? scope.project_id.trim() : '';
  const workspaceId = typeof scope.workspace_id === 'string' ? scope.workspace_id.trim() : '';
  const clientId = typeof scope.client_id === 'string' ? scope.client_id.trim() : '';
  const visibility = normalizeScopeVisibility(scope.visibility);

  return {
    ...(projectId ? { projectId } : {}),
    ...(workspaceId ? { workspaceId } : {}),
    ...(clientId ? { clientId } : {}),
    ...(visibility.length > 0 ? { visibility } : {})
  };
}

function buildScopeAuditContext(scope) {
  const filters = buildScopeCandidateFilters(scope);
  const scopeDimensions = [
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
    scopeProjectId: filters.projectId || null,
    scopeClientId: filters.clientId || null,
    scopeVisibility: filters.visibility || [],
    scopeWorkspacePresent: !!filters.workspaceId
  };
}

async function applyScopeFilter(results, scope, shadowStore) {
  const filters = buildScopeCandidateFilters(scope);
  const hasScope = !!(filters.projectId
    || filters.workspaceId
    || filters.clientId
    || (Array.isArray(filters.visibility) && filters.visibility.length > 0));

  if (!hasScope || !Array.isArray(results) || results.length === 0) {
    return results;
  }

  const memoryIds = [...new Set(results.map(item => item.memoryId || item.memory_id).filter(Boolean))];
  const scopeMap = memoryIds.length > 0
    ? await shadowStore.getRecordsScopeMap(memoryIds)
    : new Map();

  return results.filter(item => {
    const memoryId = item.memoryId || item.memory_id;
    const recordScope = scopeMap.get(memoryId) || {};

    if (filters.projectId && recordScope.projectId !== filters.projectId) return false;
    if (filters.workspaceId && recordScope.workspaceId !== filters.workspaceId) return false;
    if (filters.clientId && recordScope.clientId !== filters.clientId) return false;
    if (Array.isArray(filters.visibility) && filters.visibility.length > 0 && !filters.visibility.includes(recordScope.visibility)) {
      return false;
    }

    return true;
  });
}

function inferRequestClientId(requestContext = {}, scope = null) {
  const scopedClientId = typeof scope?.client_id === 'string' ? scope.client_id.trim().toLowerCase() : '';
  if (scopedClientId) {
    return scopedClientId;
  }

  const executionContext = requestContext.executionContext || {};
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

  return 'codex';
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
  if (!Object.prototype.hasOwnProperty.call(executionContext, 'noRawContentRead')) {
    return false;
  }

  assertInternalTrueLiveRecallContext(requestContext, 'internal noRawContentRead context');
  if (executionContext.noRawContentRead !== true) {
    throw new Error('internal noRawContentRead context must be true');
  }
  return true;
}

function normalizeScopeValue(value) {
  return typeof value === 'string' ? value.trim() : '';
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

function buildLifecycleScopeGovernanceCurrentScope(requestContext = {}, scope = null) {
  const executionContext = requestContext.executionContext || {};
  const safeScope = scope && typeof scope === 'object' ? scope : {};

  return {
    userId: firstScopeValue(safeScope.user_id, safeScope.userId, executionContext.userId, executionContext.user_id),
    projectId: firstScopeValue(safeScope.project_id, safeScope.projectId, executionContext.projectId, executionContext.project_id),
    workspaceId: firstScopeValue(safeScope.workspace_id, safeScope.workspaceId, executionContext.workspaceId, executionContext.workspace_id),
    clientId: firstScopeValue(safeScope.client_id, safeScope.clientId, executionContext.clientId, executionContext.client_id, inferRequestClientId(requestContext, scope)),
    agentId: firstScopeValue(safeScope.agent_id, safeScope.agentId, executionContext.agentId, executionContext.agent_id),
    taskId: firstScopeValue(safeScope.task_id, safeScope.taskId, executionContext.taskId, executionContext.task_id),
    conversationId: firstScopeValue(safeScope.conversation_id, safeScope.conversationId, executionContext.conversationId, executionContext.conversation_id),
    folder: firstScopeValue(safeScope.folder, executionContext.folder),
    visibility: firstScopeValue(safeScope.visibility, executionContext.visibility),
    retentionPolicy: firstScopeValue(safeScope.retention_policy, safeScope.retentionPolicy, executionContext.retentionPolicy, executionContext.retention_policy)
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

  const memoryIds = [...new Set(results.map(item => item.memoryId || item.memory_id).filter(Boolean))];
  const metadata = memoryIds.length > 0 && shadowStore?.getRecordsLifecycleScopeGovernanceMap
    ? await shadowStore.getRecordsLifecycleScopeGovernanceMap(memoryIds)
    : { lifecycleColumnAvailable: false, records: new Map() };
  const metadataRecords = metadata.records || new Map();
  const currentScope = buildLifecycleScopeGovernanceCurrentScope(requestContext, scope);
  const requiredScopeFields = normalizeScopeFields(LIFECYCLE_SCOPE_GOVERNANCE_SUPPORTED_FIELDS);
  const candidates = results.map(item => {
    const memoryId = item.memoryId || item.memory_id;
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
    results: results.filter(item => acceptedIds.has(item.memoryId || item.memory_id)),
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

  const memoryIds = [...new Set(results.map(item => item.memoryId || item.memory_id).filter(Boolean))];
  const policyMap = memoryIds.length > 0
    ? await shadowStore.getRecordsPolicyMap(memoryIds)
    : new Map();
  const requestClientId = inferRequestClientId(requestContext, scope);

  return results.filter(item => {
    const memoryId = item.memoryId || item.memory_id;
    const policy = policyMap.get(memoryId) || {};
    const status = String(policy.status || 'active').toLowerCase();
    if (['proposal', 'rejected', 'tombstoned'].includes(status)) {
      return false;
    }

    const visibility = String(policy.visibility || '').toLowerCase();
    const clientId = String(policy.clientId || '').toLowerCase();
    if (visibility === 'private' && clientId && clientId !== requestClientId) {
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

  const memoryIds = [...new Set(results.map(item => item.memoryId || item.memory_id).filter(Boolean))];
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
    const memoryId = item.memoryId || item.memory_id;
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
        const memoryId = item.memoryId || item.memory_id;
        return String(statusByMemoryId.get(memoryId) || '').trim().toLowerCase() === 'stale';
      }).length,
      lifecycleColumnAvailable: true,
      statusByMemoryId
    }
  };
}

function createCodexMemoryApplication(overrides = {}) {
  const config = createConfig(overrides);
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
    writePreflightCandidateProvider: request => getDefaultWritePreflightCandidates(shadowStore, request)
  });
  const validateMemoryService = new ValidateMemoryService({
    config,
    shadowStore,
    auditLogStore
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
    const readOnly = requestContext.noTokenReadOnly === true;
    const precisionPolicyContext = normalizeInternalPrecisionPolicyContext(requestContext);
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
          const memoryId = item.memoryId || item.memory_id;
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
    return { results: policyFiltered };
  }

  return {
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
      validateMemoryService,
      passiveRecallService,
      activeRecallService,
      overviewService
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
      if (toolName === 'record_memory') {
        return writeService.record(args, requestContext);
      }

      if (toolName === 'search_memory') {
        return runSearchMemoryWithTimeout(
          ({ signal }) => executeSearchMemory(args, requestContext, { signal }),
          { timeoutMs: config.searchMemoryTimeoutMs }
        );
      }

      if (toolName === 'memory_overview') {
        return overviewService.getOverview({
          auditWindow: args.auditWindow,
          limit: args.limit
        });
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
    async close() {
      await shadowStore.close();
    }
  };
}

module.exports = {
  applyLifecycleReadPolicy,
  applyLifecycleScopeGovernanceReadPolicy,
  applySoftReadPolicy,
  inferRequestClientId,
  createCodexMemoryApplication
};
