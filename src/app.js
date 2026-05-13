const { createConfig } = require('./config/createConfig');
const { ExecutionContextResolver } = require('./core/ExecutionContextResolver');
const { RecallEnhancer } = require('./core/RecallEnhancer');
const { MemoryWriteService } = require('./core/MemoryWriteService');
const { PassiveRecallService } = require('./core/PassiveRecallService');
const { ActiveRecallService } = require('./core/ActiveRecallService');
const { MemoryOverviewService } = require('./core/MemoryOverviewService');
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
    chunkIndexingService
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
        const scopeFilter = args.scope && typeof args.scope === 'object' ? args.scope : null;
        const searchResults = await passiveRecallService.search({
          query: args.query,
          target: args.target || 'both',
          limit: args.limit,
          includeContent: !!args.include_content,
          contextText: args.context_text || '',
          source: 'mcp',
          candidateFilters: buildScopeCandidateFilters(scopeFilter),
          auditContext: {
            scope: buildScopeAuditContext(scopeFilter)
          }
        });
        const filtered = (scopeFilter && searchResults && searchResults.length)
          ? await applyScopeFilter(searchResults, scopeFilter, shadowStore)
          : searchResults;
        return { results: filtered };
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
  createCodexMemoryApplication
};
