const { contentTokens } = require('../recall/text');

function countTokenMatches(queryTokens, text) {
  if (!Array.isArray(queryTokens) || queryTokens.length === 0) return 0;
  const textTokenSet = new Set(contentTokens(text || ''));
  let hits = 0;
  for (const token of queryTokens) {
    if (textTokenSet.has(token)) {
      hits += 1;
    }
  }
  return hits;
}

class RecallEnhancer {
  constructor({ resultDeduplicator, semanticGroupManager } = {}) {
    this.resultDeduplicator = resultDeduplicator;
    this.semanticGroupManager = semanticGroupManager;
  }

  enhance(results, options = {}) {
    const directives = options.directives || {};
    const queryAnalysis = options.queryAnalysis || {};
    const timeRanges = Array.isArray(queryAnalysis.timeRanges) ? queryAnalysis.timeRanges : [];
    const limit = options.limit || results.length;
    let working = this.resultDeduplicator
      ? this.resultDeduplicator.deduplicate(results, { limit: Math.max(limit * 3, limit) })
      : [...results];

    if (timeRanges.length > 0) {
      working = working.filter(result => this.isWithinTimeRanges(result.createdAt, timeRanges));
    }

    if (directives.rerank || directives.rerankplus !== undefined || queryAnalysis.tagMemoMode) {
      working = this.rerank(working, queryAnalysis, directives);
    }

    if (directives.group && this.semanticGroupManager) {
      working = this.semanticGroupManager.groupResults(working, {
        strategy: directives.group === true ? 'auto' : directives.group,
        queryAnalysis,
        limit
      }).results;
    } else if (directives.time || (queryAnalysis.timeRanges || []).length > 0) {
      working.sort((left, right) => {
        const scoreDelta = (right.score || 0) - (left.score || 0);
        if (scoreDelta !== 0) return scoreDelta;
        return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
      });
    } else {
      working.sort((left, right) => (right.score || 0) - (left.score || 0));
    }

    return working.slice(0, limit);
  }

  isWithinTimeRanges(createdAt, timeRanges) {
    const createdTime = new Date(createdAt || 0).getTime();
    if (!Number.isFinite(createdTime) || createdTime <= 0) {
      return false;
    }

    return timeRanges.some(range => {
      const start = range?.start instanceof Date ? range.start.getTime() : Number.NaN;
      const end = range?.end instanceof Date ? range.end.getTime() : Number.NaN;
      return Number.isFinite(start) && Number.isFinite(end) && createdTime >= start && createdTime <= end;
    });
  }

  rerank(results, queryAnalysis, directives) {
    const alpha = directives.rerankplus !== undefined
      ? Math.max(0, Math.min(1, Number(directives.rerankplus) || 0.5))
      : 0.65;
    const coreTags = [...new Set(queryAnalysis.coreTags || [])];
    const queryTokens = [...new Set(queryAnalysis.tokens || [])];
    const primaryTokens = coreTags.length > 0 ? coreTags : queryTokens;
    const coreTagCount = Math.max(1, primaryTokens.length);
    const hasTime = (queryAnalysis.timeRanges || []).length > 0;

    return results
      .map(result => {
        const titleHitCount = result.titleHitCount || countTokenMatches(primaryTokens, result.title || '');
        const snippetHitCount = result.contentHitCount || countTokenMatches(queryTokens, `${result.snippet || ''}\n${result.text || ''}`);
        const coreCoverage = Math.min(1, (result.coreTags?.length || 0) / coreTagCount);
        const matchedTagCoverage = Math.min(1, (result.matchedTags?.length || 0) / Math.max(1, queryTokens.length || coreTagCount));
        const structural = Math.min(
          1,
          (result.exactCoreTagCount || result.coreTags?.length || 0) * 0.22
            + (result.tagHitCount || result.matchedTags?.length || 0) * 0.12
            + titleHitCount * 0.12
            + snippetHitCount * 0.02
            + (result.tagMemoSurfaceScore || 0) * 0.5
        );
        const tagBoost = result.tagMemoScore || 0;
        const freshness = hasTime
          ? this.computeFreshnessScore(result.createdAt)
          : 0;
        const rerankScore = Number((
          (result.baseScore || result.score || 0) * 0.48 +
          coreCoverage * 0.18 +
          matchedTagCoverage * 0.12 +
          Math.min(1, titleHitCount / coreTagCount) * 0.12 +
          tagBoost * 0.1 +
          structural * 0.1 +
          freshness * 0.04
        ).toFixed(6));
        const finalScore = Number((
          directives.rerankplus !== undefined
            ? ((result.score || 0) * (1 - alpha) + rerankScore * alpha)
            : Math.max(result.score || 0, rerankScore)
        ).toFixed(6));

        return {
          ...result,
          rerankScore,
          score: finalScore
        };
      })
      .sort((left, right) => (right.score || 0) - (left.score || 0));
  }

  computeFreshnessScore(createdAt) {
    const createdTime = new Date(createdAt || 0).getTime();
    if (!Number.isFinite(createdTime) || createdTime <= 0) return 0;
    const ageMs = Date.now() - createdTime;
    const ageDays = ageMs / (24 * 60 * 60 * 1000);
    return Math.max(0, Math.min(1, 1 - ageDays / 30));
  }
}

module.exports = {
  RecallEnhancer
};
