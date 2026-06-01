const { getDiaryNamesForTarget, getTargetForDiaryName } = require('../core/constants');
const { buildProofMemoryRecallFilters } = require('../core/ProofMemoryPolicy');
const { filterRecallIsolatedItems, isRecallIsolated } = require('../core/RecallIsolationClassifier');
const { throwIfSearchMemoryAborted } = require('../core/SearchMemoryTimeoutPolicy');
const { stripMemoryMarkers } = require('../storage/DiaryStore');
const { RecallPrecisionPolicy } = require('./RecallPrecisionPolicy');
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

function normalizeCandidateString(value) {
  const text = String(value ?? '').trim();
  return text || '';
}

function firstCandidateValue(...values) {
  for (const value of values) {
    const normalized = normalizeCandidateString(value);
    if (normalized) return normalized;
  }
  return '';
}

function normalizeCandidateMemoryId(candidate = {}) {
  return firstCandidateValue(candidate?.memoryId, candidate?.memory_id);
}

function normalizeRecordMemoryId(record = {}) {
  return firstCandidateValue(record?.memoryId, record?.memory_id);
}

function normalizeCandidateSourceFile(candidate = {}) {
  return firstCandidateValue(candidate?.sourceFile, candidate?.source_file);
}

function normalizeCandidateChunkId(candidate = {}) {
  return firstCandidateValue(candidate?.chunkId, candidate?.chunk_id);
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
    contextVectorManager = null,
    recallPrecisionPolicy = null
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
    this.recallPrecisionPolicy = recallPrecisionPolicy || new RecallPrecisionPolicy();
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
    auditContext = {},
    signal = null,
    readOnly = false,
    precisionPolicyContext = null,
    noRawContentRead = false
  }) {
    if (typeof query !== 'string' || !query.trim()) {
      throw new Error('query must be a non-empty string');
    }
    if (typeof noRawContentRead !== 'boolean') {
      throw new Error('noRawContentRead must be a boolean');
    }
    if (noRawContentRead && readOnly !== true) {
      throw new Error('noRawContentRead requires readOnly recall path');
    }
    if (noRawContentRead && includeContent) {
      throw new Error('noRawContentRead cannot include raw content');
    }

    throwIfSearchMemoryAborted(signal);
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
        queryAnalysis,
        readOnly
      })
      : { available: false };

    throwIfSearchMemoryAborted(signal);
    const syncState = this.knowledgeBaseSyncService && !readOnly
      ? await this.knowledgeBaseSyncService.syncTarget(target, { signal })
      : { syncToken: '', changed: false };

    throwIfSearchMemoryAborted(signal);
    const candidateState = await this.candidateGenerator.generate({
      target,
      queryText,
      queryAnalysis,
      directives,
      limit,
      syncToken: syncState.syncToken || '',
      governanceStateRevision: syncState.governanceStateRevision || '',
      contextState,
      candidateFilters: buildProofMemoryRecallFilters(candidateFilters),
      signal,
      readOnly
    });

    throwIfSearchMemoryAborted(signal);
    const rerankState = await this.finalizeChunkCandidates({
      queryText,
      directives,
      queryAnalysis,
      candidateState,
      readOnly,
      signal
    });

    const precisionState = this.applyPrecisionPolicy(rerankState.results, precisionPolicyContext);

    throwIfSearchMemoryAborted(signal);
    const aggregated = await this.aggregateCandidates({
      candidates: precisionState.results,
      includeContent,
      noRawContentRead,
      signal
    });

    throwIfSearchMemoryAborted(signal);
    const finalResults = this.recallEnhancer.enhance(aggregated, {
      directives,
      queryAnalysis,
      limit: candidateState.searchPlan.finalLimit
    });

    throwIfSearchMemoryAborted(signal);
    if (!readOnly) {
      await this.recordAudit({
        target,
        finalResults,
        queryAnalysis,
        directives,
        candidateState,
        contextState,
        rerankMeta: {
          ...rerankState.meta,
          precisionPolicy: precisionState.meta
        },
        source,
        auditContext,
        signal
      });
    }

    return finalResults;
  }

  applyPrecisionPolicy(candidates = [], precisionPolicyContext = null) {
    if (!precisionPolicyContext?.enabled) {
      return {
        results: candidates,
        meta: { decision: 'policy_disabled' }
      };
    }

    const policyCandidates = candidates.map(candidate => ({
      ...candidate,
      precision: {
        ...(candidate.precision || {}),
        score: candidate.score,
        baseScore: candidate.baseScore ?? candidate.precision?.baseScore,
        rerankScore: candidate.rerank_score ?? candidate.rerankScore ?? candidate.precision?.rerankScore ?? null
      }
    }));
    const evaluation = this.recallPrecisionPolicy.evaluateCandidates(policyCandidates, precisionPolicyContext);
    return {
      results: evaluation.accepted,
      meta: {
        decision: evaluation.decision,
        acceptedCount: evaluation.accepted.length,
        rejectedCount: evaluation.rejected.length,
        distribution: evaluation.distribution
      }
    };
  }

  async finalizeChunkCandidates({ queryText, directives, queryAnalysis = {}, candidateState, readOnly = false, signal = null }) {
    throwIfSearchMemoryAborted(signal);
    const { searchPlan, semanticCandidates, timeCandidates } = candidateState;
    const useRerank = searchPlan.useRerank;
    const chunkResultLimit = directives.group
      ? Math.max(searchPlan.finalLimit * 3, searchPlan.finalLimit + 4)
      : searchPlan.finalLimit;
    const rerankOptions = {
      rrfAlpha: directives.rerankplus,
      geodesicRerank: !!directives.geodesicrerank,
      geodesicConfig: this.rerankService.config?.geodesicRerank || {},
      queryAnalysis,
      readOnly
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
          throwIfSearchMemoryAborted(signal);
          const rerankedSemantic = await this.rerankService.rerank(queryText, semanticCandidates, semanticResultLimit, rerankOptions);
          throwIfSearchMemoryAborted(signal);
          finalSemantic = rerankedSemantic.results;
          rerankMeta = rerankedSemantic;
        }

        if (timeCandidates.length > 0 && timeResultLimit > 0) {
          throwIfSearchMemoryAborted(signal);
          const rerankedTime = await this.rerankService.rerank(queryText, timeCandidates, timeResultLimit, rerankOptions);
          throwIfSearchMemoryAborted(signal);
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
      throwIfSearchMemoryAborted(signal);
      const reranked = await this.rerankService.rerank(
        queryText,
        semanticCandidates,
        Math.min(searchPlan.semanticPoolSize, chunkResultLimit),
        rerankOptions
      );
      throwIfSearchMemoryAborted(signal);
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

  async aggregateCandidates({ candidates = [], includeContent = false, noRawContentRead = false, signal = null }) {
    throwIfSearchMemoryAborted(signal);
    const groups = new Map();

    for (const candidate of filterRecallIsolatedItems(candidates)) {
      const key = firstCandidateValue(
        normalizeCandidateMemoryId(candidate),
        normalizeCandidateSourceFile(candidate),
        normalizeCandidateChunkId(candidate)
      );
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(candidate);
    }

    const memoryIds = [...new Set(candidates.map(candidate => normalizeCandidateMemoryId(candidate)).filter(Boolean))];
    const recordMap = new Map();
    let isolationMap = new Map();
    if (!noRawContentRead) {
      throwIfSearchMemoryAborted(signal);
      for (const record of await this.shadowStore.getRecordsByIds(memoryIds)) {
        const recordMemoryId = normalizeRecordMemoryId(record);
        if (recordMemoryId) {
          recordMap.set(recordMemoryId, record);
        }
      }
      throwIfSearchMemoryAborted(signal);
    } else if (typeof this.shadowStore.getRecordsIsolationMap === 'function') {
      throwIfSearchMemoryAborted(signal);
      isolationMap = await this.shadowStore.getRecordsIsolationMap(memoryIds);
      throwIfSearchMemoryAborted(signal);
    }

    return [...groups.entries()]
      .map(([key, group]) => {
        const ordered = sortByPrimaryScore(group);
        const best = ordered[0];
        const bestMemoryId = normalizeCandidateMemoryId(best);
        const bestSourceFile = normalizeCandidateSourceFile(best);
        const record = bestMemoryId ? recordMap.get(bestMemoryId) : null;
        if (record && isRecallIsolated(record)) {
          return null;
        }
        if (noRawContentRead && bestMemoryId) {
          const isolationSubject = isolationMap.get(bestMemoryId);
          if (isolationSubject && isRecallIsolated(isolationSubject)) {
            return null;
          }
        }
        if (noRawContentRead) {
          return {
            target: best.target,
            memoryId: bestMemoryId || null,
            score: best.score,
            baseScore: best.baseScore,
            rerankScore: best.rerank_score ?? null,
            matchedTags: uniqueTokens(group.flatMap(item => item.matchedTags || [])),
            coreTags: uniqueTokens(group.flatMap(item => item.coreTagsMatched || [])),
            titleHitCount: Math.max(...group.map(item => item.titleHitCount || 0)),
            tagHitCount: Math.max(...group.map(item => item.tagHitCount || 0)),
            contentHitCount: Math.max(...group.map(item => item.contentHitCount || 0)),
            evidenceHitCount: Math.max(...group.map(item => item.evidenceHitCount || 0)),
            exactCoreTagCount: Math.max(...group.map(item => item.exactCoreTagCount || 0)),
            tagMemoSurfaceScore: Number(Math.max(...group.map(item => item.tagMemoSurfaceScore || 0)).toFixed(6)),
            dynamicCoreWeight: Number(Math.max(...group.map(item => item.dynamicCoreWeight || 0)).toFixed(6)),
            createdAt: best.createdAt,
            updatedAt: best.updatedAt,
            sourceKinds: [...new Set(group.map(item => item.source).filter(Boolean))]
          };
        }
        const cleanContent = record
          ? stripMemoryMarkers(record.rawText || record.content || '')
          : stripMemoryMarkers(best.text || '');
        const cleanText = sanitizeRecallText(best.text || cleanContent, cleanContent);

        return {
          target: best.target,
          title: record?.title || best.title,
          memoryId: bestMemoryId || null,
          score: best.score,
          baseScore: best.baseScore,
          rerankScore: best.rerank_score ?? null,
          sourceFile: record?.relativePath || bestSourceFile || key,
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

  async recordAudit({ target, finalResults, queryAnalysis, directives, candidateState, contextState, rerankMeta, source, auditContext = {}, signal = null }) {
    throwIfSearchMemoryAborted(signal);
    for (const dbName of getDiaryNamesForTarget(target)) {
      const currentTarget = getTargetForDiaryName(dbName);
      const targetResults = finalResults.filter(result => result.target === currentTarget);
      if (targetResults.length === 0) continue;

      throwIfSearchMemoryAborted(signal);
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
      throwIfSearchMemoryAborted(signal);
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
