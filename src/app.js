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
  const tagMemoEngine = new TagMemoEngine();
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
        const results = await passiveRecallService.search({
          query: args.query,
          target: args.target || 'both',
          limit: args.limit,
          includeContent: !!args.include_content,
          contextText: args.context_text || '',
          source: 'mcp'
        });
        return { results };
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
