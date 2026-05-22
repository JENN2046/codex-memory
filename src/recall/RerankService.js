const { contentTokens } = require('./text');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

class RerankService {
  constructor({ config, externalRerankAdapter = null }) {
    this.config = config;
    this.externalRerankAdapter = externalRerankAdapter;
    this.circuitBreaker = new Map();
  }

  async rerank(query, documents, originalK, options = {}) {
    if (!Array.isArray(documents) || documents.length === 0) {
      return {
        results: [],
        mode: 'none',
        successRate: 1
      };
    }

    const prepared = documents.map((document, index) => ({
      ...document,
      retrieval_rank: document.retrieval_rank || index + 1
    }));

    if (options.readOnly !== true && this.isRemoteConfigured() && !this.isCircuitOpen()) {
      const remote = await this.remoteRerank(query, prepared, originalK, options);
      if (remote) {
        if (options.geodesicRerank) {
          remote.mode = `${remote.mode}-geodesic`;
        }
        return remote;
      }
    }

    return this.localRerank(query, prepared, originalK, options);
  }

  isRemoteConfigured() {
    return !!this.externalRerankAdapter?.isConfigured();
  }

  isCircuitOpen() {
    const now = Date.now();
    const recentFailures = [...this.circuitBreaker.values()].filter(timestamp => now - timestamp < 60000).length;
    return recentFailures >= 5;
  }

  async remoteRerank(query, documents, originalK, options = {}) {
    const batches = this.buildBatches(query, documents);
    if (batches.length === 0) return null;

    const now = Date.now();
    const allResults = [];
    let failedBatches = 0;

    for (let index = 0; index < batches.length; index += 1) {
      const batch = batches[index];

      try {
        const orderedBatch = await this.externalRerankAdapter.rerank(this.truncateQuery(query), batch);
        allResults.push(...orderedBatch);
      } catch (error) {
        failedBatches += 1;
        this.circuitBreaker.set(`failure:${now}:${index}`, now);
        allResults.push(...batch);
      }
    }

    const successRate = 1 - failedBatches / Math.max(1, batches.length);
    return {
      results: this.finalizeRerankResults(allResults, originalK, options),
      mode: options.rrfAlpha !== undefined ? 'remote-rrf' : 'remote',
      successRate
    };
  }

  localRerank(query, documents, originalK, options = {}) {
    const queryTokens = contentTokens(query);
    const reranked = documents.map(document => ({
      ...document,
      rerank_score: this.computeLocalScore(queryTokens, document)
    }));

    return {
      results: this.finalizeRerankResults(reranked, originalK, options),
      mode: [
        'local',
        options.rrfAlpha !== undefined ? 'rrf' : '',
        options.geodesicRerank ? 'geodesic' : ''
      ].filter(Boolean).join('-'),
      successRate: 1
    };
  }

  finalizeRerankResults(documents, originalK, options = {}) {
    const alpha = options.rrfAlpha;
    const working = [...documents];
    const geodesicEnabled = !!options.geodesicRerank;

    if (alpha !== undefined) {
      const boundedAlpha = clamp(Number(alpha) || 0.5, 0, 1);
      const RRF_K = 60;
      working.sort((left, right) => (right.rerank_score ?? -1) - (left.rerank_score ?? -1));
      working.forEach((document, index) => {
        document.rerank_rank = index + 1;
      });

      working.forEach(document => {
        const retrievalRank = document.retrieval_rank || working.length;
        const rerankRank = document.rerank_rank || working.length;
        document.rrf_score = boundedAlpha * (1 / (RRF_K + rerankRank))
          + (1 - boundedAlpha) * (1 / (RRF_K + retrievalRank));
      });

      if (geodesicEnabled) {
        this.applyGeodesicScores(working, options);
      }
      working.sort((left, right) => (right.geodesic_score ?? right.rrf_score ?? 0) - (left.geodesic_score ?? left.rrf_score ?? 0));
      return working.slice(0, originalK).map(document => ({
        ...document,
        score: Number((document.geodesic_score ?? document.rrf_score ?? document.score ?? 0).toFixed(6))
      }));
    }

    if (geodesicEnabled) {
      this.applyGeodesicScores(working, options);
      working.sort((left, right) => (right.geodesic_score || 0) - (left.geodesic_score || 0));
      return working.slice(0, originalK).map(document => ({
        ...document,
        score: Number((document.geodesic_score || document.score || 0).toFixed(6))
      }));
    }

    working.sort((left, right) => {
      const scoreLeft = left.rerank_score ?? left.score ?? -1;
      const scoreRight = right.rerank_score ?? right.score ?? -1;
      return scoreRight - scoreLeft;
    });

    return working.slice(0, originalK).map(document => ({
      ...document,
      score: Number(((document.rerank_score ?? document.score) || 0).toFixed(6))
    }));
  }

  applyGeodesicScores(documents, options = {}) {
    const config = options.geodesicConfig || {};
    const alpha = clamp(Number(config.alpha ?? 0.3), 0, 1);
    const minGeoSamples = Math.max(1, Number.parseInt(String(config.minGeoSamples ?? 4), 10) || 4);
    const queryActivation = options.queryAnalysis?.metrics?.energySignature?.activation || 0;
    const metaThinkingScore = options.queryAnalysis?.metaThinking?.score || 0;
    const sampleCount = Math.max(1, Math.min(documents.length, minGeoSamples));

    documents.forEach((document, index) => {
      const localNeighborhood = documents
        .slice(Math.max(0, index - sampleCount), Math.min(documents.length, index + sampleCount + 1))
        .filter(neighbor => neighbor !== document);
      const neighborScore = localNeighborhood.length > 0
        ? localNeighborhood.reduce((sum, neighbor) => sum + Number(neighbor.rerank_score ?? neighbor.score ?? 0), 0) / localNeighborhood.length
        : Number(document.rerank_score ?? document.score ?? 0);
      const baseScore = Number(document.rerank_score ?? document.rrf_score ?? document.score ?? 0);
      const terrainScore = clamp(
        (document.vectorScore || 0) * 0.26
          + (document.tagMemoScore || 0) * 0.2
          + (document.lexicalScore || 0) * 0.16
          + (document.structuralBias || 0) * 0.14
          + (document.diaryScore || 0) * 0.08
          + (document.contextScore || 0) * 0.08
          + queryActivation * 0.04
          + metaThinkingScore * 0.04,
        0,
        1
      );
      const continuity = clamp((neighborScore + baseScore) / 2, 0, 1);
      document.geodesic_score = Number(((1 - alpha) * baseScore + alpha * (terrainScore * 0.7 + continuity * 0.3)).toFixed(6));
      document.geodesic_rank_signal = {
        alpha,
        terrainScore: Number(terrainScore.toFixed(6)),
        continuity: Number(continuity.toFixed(6)),
        sampleCount: localNeighborhood.length
      };
    });
  }

  computeLocalScore(queryTokens, document) {
    const uniqueQueryTokens = [...new Set(queryTokens || [])];
    const textTokens = new Set(contentTokens(document.text || document.snippet || ''));
    const titleTokens = new Set(contentTokens(document.title || ''));
    const tagTokens = new Set(contentTokens([
      ...(document.matchedTags || []),
      ...(document.coreTags || []),
      ...(document.matchedCoreTags || [])
    ].join(' ')));
    const coreTokens = new Set(contentTokens([
      ...(document.matchedCoreTags || []),
      ...(document.coreTags || [])
    ].join(' ')));
    let titleHits = 0;
    let textHits = 0;
    let tagHits = 0;
    let coreHits = 0;

    for (const token of uniqueQueryTokens) {
      if (titleTokens.has(token)) titleHits += 1;
      if (textTokens.has(token)) textHits += 1;
      if (tagTokens.has(token)) tagHits += 1;
      if (coreTokens.has(token)) coreHits += 1;
    }

    const lexical = uniqueQueryTokens.length > 0
      ? Math.min(1.6, (
        titleHits * 2.6
          + tagHits * 2.5
          + textHits * 0.85
          + coreHits * 1.6
      ) / uniqueQueryTokens.length)
      : 0;
    const structural = Math.min(
      1,
      (document.exactCoreTagCount || coreHits) * 0.22
        + (document.tagHitCount || tagHits) * 0.12
        + (document.titleHitCount || titleHits) * 0.1
        + (document.contentHitCount || textHits) * 0.025
        + (document.tagMemoSurfaceScore || 0) * 0.6
    );
    const retrievalScore = document.baseScore || document.score || 0;
    const tagScore = document.tagMemoScore || 0;
    return Number((retrievalScore * 0.4 + lexical * 0.26 + tagScore * 0.16 + structural * 0.18).toFixed(6));
  }

  buildBatches(query, documents) {
    const maxTokens = this.config.rerankMaxTokensPerBatch;
    const queryTokens = this.estimateTokens(this.truncateQuery(query));
    const maxBatchTokens = Math.max(1000, maxTokens - queryTokens - 1000);
    const batches = [];
    let currentBatch = [];
    let currentTokens = queryTokens;

    for (const document of documents) {
      const documentTokens = this.estimateTokens(document.text || '');
      if (documentTokens > maxBatchTokens) {
        continue;
      }

      if (currentBatch.length > 0 && currentTokens + documentTokens > maxBatchTokens) {
        batches.push(currentBatch);
        currentBatch = [document];
        currentTokens = queryTokens + documentTokens;
      } else {
        currentBatch.push(document);
        currentTokens += documentTokens;
      }
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }

  truncateQuery(query) {
    const maxQueryTokens = Math.floor(this.config.rerankMaxTokensPerBatch * 0.3);
    const estimated = this.estimateTokens(query);
    if (estimated <= maxQueryTokens) return query;

    const ratio = maxQueryTokens / Math.max(1, estimated);
    const targetLength = Math.max(64, Math.floor(query.length * ratio * 0.9));
    return `${query.slice(0, targetLength)}...`;
  }

  estimateTokens(text) {
    return Math.ceil(String(text || '').length / 4);
  }
}

module.exports = {
  RerankService
};
