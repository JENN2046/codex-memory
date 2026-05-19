const { getDiaryNamesForTarget, getTargetForDiaryName } = require('../core/constants');
const { filterRecallIsolatedItems, isRecallIsolated } = require('../core/RecallIsolationClassifier');
const { stripMemoryMarkers } = require('../storage/DiaryStore');
const { compactText, uniqueTokens } = require('./text');

function sortByPrimaryScore(items) {
  return [...items].sort((left, right) => {
    const scoreLeft = left.rerank_score ?? left.score ?? -1;
    const scoreRight = right.rerank_score ?? right.score ?? -1;
    return scoreRight - scoreLeft;
  });
}

function containsMemoryMarkers(text) {
  return /(?:Memory-ID|Project-ID|Workspace-ID|Client-ID|Task-ID|Conversation-ID|Visibility|Retention-Policy):/i.test(String(text || ''));
}

function sanitizeRecallText(text, fallback = '') {
  const stripped = stripMemoryMarkers(text);
  if (containsMemoryMarkers(stripped) && fallback) {
    return fallback;
  }
  return stripped;
}

class KnowledgeBaseRecallPipeline {
  constructor({
    compatibilitySyntaxAdapter,
    timeExpressionParser,
    tagMemoEngine,
    candidateGenerator,
    rerankService,
    recallAuditService,
    recallEnhancer,
    shadowStore,
    knowledgeBaseSyncService,
    contextVectorManager = null
  }) {
    this.compatibilitySyntaxAdapter = compatibilitySyntaxAdapter;
    this.timeExpressionParser = timeExpressionParser;
    this.tagMemoEngine = tagMemoEngine;
    this.candidateGenerator = candidateGenerator;
    this.rerankService = rerankService;
    this.recallAuditService = recallAuditService;
    this.recallEnhancer = recallEnhancer;
    this.shadowStore = shadowStore;
    this.knowledgeBaseSyncService = knowledgeBaseSyncService;
    this.contextVectorManager = contextVectorManager;
  }

  async search({
    query,
    target = 'both',
    limit,
    includeContent = false,
    source = 'mcp',
    compatibility = null,
    contextText = '',
    contextMessages = [],
    candidateFilters = {},
    auditContext = {}
  }) {
    if (typeof query !== 'string' || !query.trim()) {
      throw new Error('query must be a non-empty string');
    }

    const parsed = compatibility || this.compatibilitySyntaxAdapter.parse(query);
    const queryText = compactText(parsed.query || query);
    const directives = parsed.directives || {};
    const timeRanges = this.timeExpressionParser.parse(query, directives.time);
    const queryAnalysis = this.tagMemoEngine.analyzeQuery({
      rawQuery: query,
      query: queryText,
      passiveBlocks: parsed.passiveBlocks || [],
      directives,
      timeRanges
    });
    const contextState = this.contextVectorManager
      ? await this.contextVectorManager.buildQueryContext({
        queryText,
        contextText,
        activeBlocks: parsed.activeBlocks || [],
        messages: contextMessages,
        queryAnalysis
      })
      : { available: false };

    const syncState = this.knowledgeBaseSyncService
      ? await this.knowledgeBaseSyncService.syncTarget(target)
      : { syncToken: '', changed: false };

    const candidateState = await this.candidateGenerator.generate({
      target,
      queryText,
      queryAnalysis,
      directives,
      limit,
      syncToken: syncState.syncToken || '',
      contextState,
      candidateFilters
    });

    const rerankState = await this.finalizeChunkCandidates({
      queryText,
      directives,
      queryAnalysis,
      candidateState
    });

    const aggregated = await this.aggregateCandidates({
      candidates: rerankState.results,
      includeContent
    });

    const finalResults = this.recallEnhancer.enhance(aggregated, {
      directives,
      queryAnalysis,
      limit: candidateState.searchPlan.finalLimit
    });

    await this.recordAudit({
      target,
      finalResults,
      queryAnalysis,
      directives,
      candidateState,
      contextState,
      rerankMeta: rerankState.meta,
      source,
      auditContext
    });

    return finalResults;
  }

  async finalizeChunkCandidates({ queryText, directives, queryAnalysis = {}, candidateState }) {
    const { searchPlan, semanticCandidates, timeCandidates } = candidateState;
    const useRerank = searchPlan.useRerank;
    const chunkResultLimit = directives.group
      ? Math.max(searchPlan.finalLimit * 3, searchPlan.finalLimit + 4)
      : searchPlan.finalLimit;
    const rerankOptions = {
      rrfAlpha: directives.rerankplus,
      geodesicRerank: !!directives.geodesicrerank,
      geodesicConfig: this.rerankService.config?.geodesicRerank || {},
      queryAnalysis
    };

    if (searchPlan.useTime) {
      const semanticResultLimit = Math.max(searchPlan.semanticLimit, Math.min(searchPlan.semanticPoolSize, chunkResultLimit));
      const timeResultLimit = searchPlan.timeLimit > 0
        ? Math.max(searchPlan.timeLimit, Math.min(searchPlan.timePoolSize || searchPlan.timeLimit, Math.ceil(chunkResultLimit / 2)))
        : 0;
      let finalSemantic = sortByPrimaryScore(semanticCandidates).slice(0, semanticResultLimit);
      let finalTime = sortByPrimaryScore(timeCandidates).slice(0, timeResultLimit);
      let rerankMeta = { mode: 'none', successRate: 1 };

      if (useRerank) {
        if (semanticCandidates.length > 0) {
          const rerankedSemantic = await this.rerankService.rerank(queryText, semanticCandidates, semanticResultLimit, rerankOptions);
          finalSemantic = rerankedSemantic.results;
          rerankMeta = rerankedSemantic;
        }

        if (timeCandidates.length > 0 && timeResultLimit > 0) {
          const rerankedTime = await this.rerankService.rerank(queryText, timeCandidates, timeResultLimit, rerankOptions);
          finalTime = rerankedTime.results;
          rerankMeta = rerankedTime;
        }
      }

      let combined = [...finalSemantic, ...finalTime];
      if (combined.length < chunkResultLimit) {
        const leftovers = sortByPrimaryScore([
          ...semanticCandidates.filter(candidate => !combined.some(selected => selected.chunkId === candidate.chunkId)),
          ...timeCandidates.filter(candidate => !combined.some(selected => selected.chunkId === candidate.chunkId))
        ]);
        combined = [...combined, ...leftovers.slice(0, chunkResultLimit - combined.length)];
      }

      return {
        results: sortByPrimaryScore(combined).slice(0, chunkResultLimit),
        meta: rerankMeta
      };
    }

    if (useRerank) {
      const reranked = await this.rerankService.rerank(
        queryText,
        semanticCandidates,
        Math.min(searchPlan.semanticPoolSize, chunkResultLimit),
        rerankOptions
      );
      return {
        results: reranked.results,
        meta: reranked
      };
    }

    return {
      results: sortByPrimaryScore(semanticCandidates).slice(0, Math.min(searchPlan.semanticPoolSize, chunkResultLimit)),
      meta: { mode: 'none', successRate: 1 }
    };
  }

  async aggregateCandidates({ candidates = [], includeContent = false }) {
    const groups = new Map();

    for (const candidate of filterRecallIsolatedItems(candidates)) {
      const key = candidate.memoryId || candidate.sourceFile || candidate.chunkId;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(candidate);
    }

    const memoryIds = [...new Set(candidates.map(candidate => candidate.memoryId).filter(Boolean))];
    const recordMap = new Map(
      (await this.shadowStore.getRecordsByIds(memoryIds))
        .map(record => [record.memoryId, record])
    );

    return [...groups.entries()]
      .map(([key, group]) => {
        const ordered = sortByPrimaryScore(group);
        const best = ordered[0];
        const record = best.memoryId ? recordMap.get(best.memoryId) : null;
        if (record && isRecallIsolated(record)) {
          return null;
        }
        const cleanContent = record
          ? stripMemoryMarkers(record.rawText || record.content || '')
          : stripMemoryMarkers(best.text || '');
        const cleanText = sanitizeRecallText(best.text || cleanContent, cleanContent);

        return {
          target: best.target,
          title: record?.title || best.title,
          memoryId: best.memoryId || null,
          score: best.score,
          baseScore: best.baseScore,
          rerankScore: best.rerank_score ?? null,
          sourceFile: record?.relativePath || best.sourceFile || key,
          matchedTags: uniqueTokens(group.flatMap(item => item.matchedTags || [])),
          coreTags: uniqueTokens(group.flatMap(item => item.coreTagsMatched || [])),
          titleHitCount: Math.max(...group.map(item => item.titleHitCount || 0)),
          tagHitCount: Math.max(...group.map(item => item.tagHitCount || 0)),
          contentHitCount: Math.max(...group.map(item => item.contentHitCount || 0)),
          evidenceHitCount: Math.max(...group.map(item => item.evidenceHitCount || 0)),
          exactCoreTagCount: Math.max(...group.map(item => item.exactCoreTagCount || 0)),
          tagMemoSurfaceScore: Number(Math.max(...group.map(item => item.tagMemoSurfaceScore || 0)).toFixed(6)),
          dynamicCoreWeight: Number(Math.max(...group.map(item => item.dynamicCoreWeight || 0)).toFixed(6)),
          snippet: this.toSnippet(cleanText),
          ...(includeContent ? { content: cleanContent } : {}),
          createdAt: record?.createdAt || best.createdAt,
          updatedAt: record?.updatedAt || best.updatedAt,
          sourceKinds: [...new Set(group.map(item => item.source).filter(Boolean))],
          text: cleanText
        };
      })
      .filter(Boolean)
      .sort((left, right) => (right.score || 0) - (left.score || 0));
  }

  async recordAudit({ target, finalResults, queryAnalysis, directives, candidateState, contextState, rerankMeta, source, auditContext = {} }) {
    for (const dbName of getDiaryNamesForTarget(target)) {
      const currentTarget = getTargetForDiaryName(dbName);
      const targetResults = finalResults.filter(result => result.target === currentTarget);
      if (targetResults.length === 0) continue;

      await this.recallAuditService.record({
        target: currentTarget,
        recallType: 'snippet',
        results: targetResults,
        queryAnalysis,
        directives,
        searchPlan: {
          ...candidateState.searchPlan,
          semanticCandidateCount: candidateState.semanticCandidates.filter(candidate => candidate.target === currentTarget).length,
          timeCandidateCount: candidateState.timeCandidates.filter(candidate => candidate.target === currentTarget).length
        },
        rerankMeta,
        contextState,
        fromCache: !!candidateState.fromCache,
        source,
        scopeAudit: auditContext.scope || null
      });
    }
  }

  toSnippet(text, maxLength = 240) {
    const compact = compactText(text);
    if (!compact) return '';
    return compact.length > maxLength ? `${compact.slice(0, maxLength - 3)}...` : compact;
  }
}

module.exports = {
  KnowledgeBaseRecallPipeline
};
