const crypto = require('node:crypto');

const { cosineSimilarity } = require('../storage/VectorIndexStore');
const { compactText, contentTokens, uniqueTokens } = require('./text');

function clampLimit(limit, fallback, max) {
  const parsed = Number.parseInt(String(limit || fallback), 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(1, Math.min(max, parsed));
}

class CandidateGenerator {
  constructor({ config, shadowStore, vectorStore, tagMemoEngine, candidateCacheStore = null }) {
    this.config = config;
    this.shadowStore = shadowStore;
    this.vectorStore = vectorStore;
    this.tagMemoEngine = tagMemoEngine;
    this.candidateCacheStore = candidateCacheStore;
  }

  buildSearchPlan({ limit, directives = {}, timeRanges = [] }) {
    const finalLimit = clampLimit(limit, this.config.defaultSearchLimit, this.config.maxSearchLimit);
    const useRerank = !!directives.rerank || directives.rerankplus !== undefined;
    const useTime = !!directives.time || timeRanges.length > 0;
    const multiplier = useRerank ? this.config.rerankMultiplier : this.config.candidatePoolMultiplier;

    if (useTime) {
      const semanticLimit = Math.max(1, Math.ceil(finalLimit * 0.6));
      const timeLimit = Math.max(0, finalLimit - semanticLimit);
      return {
        finalLimit,
        useRerank,
        useTime,
        semanticLimit,
        timeLimit,
        semanticPoolSize: Math.max(semanticLimit + 4, Math.round(semanticLimit * multiplier) + 2),
        timePoolSize: timeLimit > 0 ? Math.max(timeLimit + 2, Math.round(timeLimit * multiplier) + 1) : 0
      };
    }

    return {
      finalLimit,
      useRerank,
      useTime,
      semanticLimit: finalLimit,
      timeLimit: 0,
      semanticPoolSize: Math.max(finalLimit + 4, Math.round(finalLimit * multiplier) + 2),
      timePoolSize: 0
    };
  }

  async generate({ target = 'both', queryText, queryAnalysis, directives = {}, limit, syncToken = '', contextState = null, candidateFilters = {} }) {
    const searchPlan = this.buildSearchPlan({
      limit,
      directives,
      timeRanges: queryAnalysis.timeRanges || []
    });
    const cacheKey = this.buildCacheKey({
      target,
      queryText,
      queryAnalysis,
        directives,
        searchPlan,
        syncToken,
        contextState,
        candidateFilters
      });

    if (this.candidateCacheStore) {
      const cached = await this.candidateCacheStore.get(cacheKey);
      if (cached) {
        return {
          ...cached,
          fromCache: true
        };
      }
    }

    const semanticChunks = await this.shadowStore.listChunks(target, candidateFilters);
    const queryVector = await this.vectorStore.getSingleEmbeddingCached(queryText);
    const activeQueryVector = this.buildActiveQueryVector(queryVector, contextState);
    const semanticCandidates = this.rankChunks({
      chunks: semanticChunks,
      queryVector: activeQueryVector,
      queryAnalysis,
      contextState,
      source: 'rag',
      poolSize: searchPlan.semanticPoolSize
    });

    let timeCandidates = [];
    if (searchPlan.useTime) {
      const timedChunks = await this.shadowStore.listChunksByTimeRanges(target, queryAnalysis.timeRanges || [], candidateFilters);
      timeCandidates = this.rankChunks({
        chunks: timedChunks,
        queryVector: activeQueryVector,
        queryAnalysis,
        contextState,
        source: 'time',
        poolSize: searchPlan.timePoolSize
      });
    }

    const result = {
      searchPlan,
      semanticCandidates,
      timeCandidates,
      allCandidates: [...semanticCandidates, ...timeCandidates],
      fromCache: false
    };

    if (this.candidateCacheStore) {
      await this.candidateCacheStore.set(cacheKey, {
        searchPlan,
        semanticCandidates,
        timeCandidates,
        allCandidates: [...semanticCandidates, ...timeCandidates]
      }, { target });
    }

    return result;
  }

  buildCacheKey({ target, queryText, queryAnalysis, directives, searchPlan, syncToken, contextState, candidateFilters = {} }) {
    const payload = {
      target,
      queryText: compactText(queryText).toLowerCase(),
      coreTags: queryAnalysis.coreTags || [],
      tokens: queryAnalysis.tokens || [],
      directives: {
        group: directives.group || null,
        rerank: !!directives.rerank,
        rerankplus: directives.rerankplus ?? null,
        tagmemo: directives.tagmemo ?? null,
        time: directives.time || null,
        geodesicrerank: !!directives.geodesicrerank
      },
      searchPlan,
      candidateFilters,
      timeRanges: (queryAnalysis.timeRanges || []).map(range => ({
        start: range?.start instanceof Date ? range.start.toISOString() : null,
        end: range?.end instanceof Date ? range.end.toISOString() : null
      })),
      contextSignature: contextState?.signature || '',
      syncToken
    };

    return crypto.createHash('sha1').update(JSON.stringify(payload)).digest('hex');
  }

  buildActiveQueryVector(queryVector, contextState) {
    if (!contextState?.available || !Array.isArray(contextState.vector)) {
      return queryVector;
    }

    return this.mixVectors(queryVector, contextState.vector, contextState.blendWeight || this.config.contextVectorWeight);
  }

  mixVectors(queryVector, contextVector, contextWeight) {
    if (!Array.isArray(queryVector) || !Array.isArray(contextVector) || queryVector.length !== contextVector.length) {
      return queryVector;
    }

    const boundedWeight = Math.max(0, Math.min(1, Number(contextWeight) || 0));
    const mixed = queryVector.map((value, index) => (
      value * (1 - boundedWeight) + (contextVector[index] || 0) * boundedWeight
    ));
    const norm = Math.sqrt(mixed.reduce((sum, value) => sum + value * value, 0));
    return norm === 0 ? mixed : mixed.map(value => value / norm);
  }

  rankChunks({ chunks = [], queryVector, queryAnalysis, contextState, source, poolSize }) {
    const queryTokens = queryAnalysis.tokens && queryAnalysis.tokens.length > 0
      ? queryAnalysis.tokens
      : contentTokens(queryAnalysis.queryText || '');

    const ranked = chunks
      .map(chunk => this.scoreChunk(chunk, queryVector, queryTokens, queryAnalysis, contextState, source))
      .filter(candidate => candidate.score > 0)
      .sort((left, right) => (right.score || 0) - (left.score || 0))
      .slice(0, poolSize)
      .map((candidate, index) => ({
        ...candidate,
        retrieval_rank: index + 1
      }));

    return ranked;
  }

  scoreChunk(chunk, queryVector, queryTokens, queryAnalysis, contextState, source) {
    const vectorScore = cosineSimilarity(queryVector, chunk.vector || []);
    const contextScore = contextState?.available
      ? cosineSimilarity(contextState.vector || [], chunk.vector || [])
      : 0;
    const diaryVector = this.vectorStore.getDiaryVector(chunk.target);
    const diaryScore = Array.isArray(diaryVector)
      ? cosineSimilarity(queryVector, diaryVector)
      : 0;
    const lexical = this.computeLexicalScore(queryTokens, chunk);
    const tagMemo = this.tagMemoEngine.scoreRecord({
      title: chunk.title,
      content: chunk.text,
      evidence: '',
      tags: chunk.tags || [],
      cleanedText: chunk.text
    }, queryAnalysis);

    const sourceBias = source === 'time' ? 0.03 : 0;
    const contextBias = contextState?.available
      ? Math.min(0.18, contextScore * (contextState.blendWeight || this.config.contextVectorWeight))
      : 0;
    const diaryBias = Math.min(0.08, Math.max(0, diaryScore) * 0.08);
    const structuralBias = Math.min(
      0.12,
      (tagMemo.exactCoreTagCount || 0) * 0.03
        + (tagMemo.titleHitCount || 0) * 0.018
        + (tagMemo.contentHitCount || 0) * 0.01
        + (tagMemo.evidenceHitCount || 0) * 0.006
    );
    const score = Number((vectorScore * 0.44 + lexical.score * 0.22 + tagMemo.boost + structuralBias + contextBias + diaryBias + sourceBias).toFixed(6));

    return {
      chunkId: chunk.chunkId,
      chunkIndex: chunk.chunkIndex,
      memoryId: chunk.memoryId,
      target: chunk.target,
      title: chunk.title,
      text: compactText(chunk.text),
      sourceFile: chunk.relativePath,
      fullPath: chunk.filePath || chunk.relativePath,
      createdAt: chunk.createdAt,
      updatedAt: chunk.updatedAt,
      score,
      baseScore: score,
      vectorScore: Number(vectorScore.toFixed(6)),
      contextScore: Number(contextScore.toFixed(6)),
      diaryScore: Number(diaryScore.toFixed(6)),
      lexicalScore: Number(lexical.score.toFixed(6)),
      tagMemoScore: tagMemo.normalizedScore,
      matchedTags: uniqueTokens([...(lexical.matchedTags || []), ...(tagMemo.matchedTags || [])]),
      coreTagsMatched: uniqueTokens(tagMemo.matchedCoreTags || []),
      matchedCoreTags: uniqueTokens(tagMemo.matchedCoreTags || []),
      tagMatchCount: uniqueTokens([...(lexical.matchedTags || []), ...(tagMemo.matchedTags || [])]).length,
      boostFactor: queryAnalysis.dynamicTagWeight,
      dynamicCoreWeight: tagMemo.dynamicCoreWeight || queryAnalysis.dynamicCoreWeight || 1.25,
      titleHitCount: tagMemo.titleHitCount || 0,
      tagHitCount: tagMemo.tagHitCount || 0,
      contentHitCount: tagMemo.contentHitCount || 0,
      evidenceHitCount: tagMemo.evidenceHitCount || 0,
      exactCoreTagCount: tagMemo.exactCoreTagCount || 0,
      tagMemoSurfaceScore: tagMemo.surfaceScore || 0,
      structuralBias: Number(structuralBias.toFixed(6)),
      contextBlendWeight: contextState?.blendWeight || 0,
      source
    };
  }

  computeLexicalScore(queryTokens, chunk) {
    if (queryTokens.length === 0) {
      return { score: 0, matchedTags: [] };
    }

    const titleTokens = new Set(contentTokens(chunk.title));
    const textTokens = new Set(contentTokens(chunk.text));
    const tagList = Array.isArray(chunk.tags) ? chunk.tags : [];
    const tagTokens = new Set(contentTokens(tagList.join(' ')));
    let score = 0;
    const matchedTags = [];

    for (const token of queryTokens) {
      if (titleTokens.has(token)) score += 0.45;
      if (textTokens.has(token)) score += 0.28;
      if (tagTokens.has(token)) {
        score += 0.52;
        matchedTags.push(...tagList.filter(tag => String(tag).toLowerCase().includes(token)));
      }
    }

    return {
      score: Math.min(1, score / queryTokens.length),
      matchedTags: uniqueTokens(matchedTags)
    };
  }
}

module.exports = {
  CandidateGenerator
};
