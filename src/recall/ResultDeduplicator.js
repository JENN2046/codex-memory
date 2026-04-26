const { contentTokens, jaccardSimilarity } = require('./text');

class ResultDeduplicator {
  constructor(config = {}) {
    this.config = {
      similarityThreshold: config.similarityThreshold || 0.72,
      ...config
    };
  }

  deduplicate(results, options = {}) {
    const limit = options.limit || results.length;
    const selected = [];

    for (const result of [...results].sort((left, right) => (right.score || 0) - (left.score || 0))) {
      const duplicate = selected.find(existing => this.isDuplicate(existing, result));
      if (duplicate) continue;
      selected.push(result);
      if (selected.length >= limit) break;
    }

    return selected;
  }

  isDuplicate(left, right) {
    if (left.memoryId && right.memoryId) {
      return left.memoryId === right.memoryId;
    }

    if (left.sourceFile && right.sourceFile) {
      return left.sourceFile === right.sourceFile;
    }

    const leftMatchedTags = new Set((left.matchedTags || []).map(tag => String(tag).toLowerCase()));
    const rightMatchedTags = new Set((right.matchedTags || []).map(tag => String(tag).toLowerCase()));
    if (leftMatchedTags.size > 0 && rightMatchedTags.size > 0) {
      const hasTagOverlap = [...leftMatchedTags].some(tag => rightMatchedTags.has(tag));
      if (!hasTagOverlap) {
        return false;
      }
    }

    const leftTokens = contentTokens(`${left.title || ''}\n${left.snippet || ''}`);
    const rightTokens = contentTokens(`${right.title || ''}\n${right.snippet || ''}`);
    return jaccardSimilarity(leftTokens, rightTokens) >= this.config.similarityThreshold;
  }
}

module.exports = {
  ResultDeduplicator
};
