class SemanticGroupManager {
  groupResults(results, options = {}) {
    const strategy = this.resolveStrategy(results, options);
    const buckets = new Map();

    for (const result of results) {
      const key = this.getGroupKey(result, strategy);
      if (!buckets.has(key)) {
        buckets.set(key, []);
      }
      buckets.get(key).push(result);
    }

    const orderedBuckets = [...buckets.entries()]
      .map(([key, bucket]) => ({
        key,
        bucket: bucket.sort((left, right) => (right.score || 0) - (left.score || 0))
      }))
      .sort((left, right) => (right.bucket[0]?.score || 0) - (left.bucket[0]?.score || 0));

    const output = [];
    while (orderedBuckets.some(entry => entry.bucket.length > 0) && output.length < (options.limit || results.length)) {
      for (const entry of orderedBuckets) {
        const next = entry.bucket.shift();
        if (!next) continue;
        output.push(next);
        if (output.length >= (options.limit || results.length)) {
          break;
        }
      }
    }

    return {
      strategy,
      groups: orderedBuckets.map(entry => ({
        key: entry.key,
        count: results.filter(result => this.getGroupKey(result, strategy) === entry.key).length
      })),
      results: output
    };
  }

  resolveStrategy(results, options) {
    const rawStrategy = options.strategy;
    if (typeof rawStrategy === 'string' && rawStrategy.trim()) {
      const normalized = rawStrategy.trim().toLowerCase();
      if (['tag', 'day', 'target'].includes(normalized)) {
        return normalized;
      }
    }

    if ((options.queryAnalysis?.timeRanges || []).length > 0) {
      return 'day';
    }

    if (results.some(result => Array.isArray(result.matchedTags) && result.matchedTags.length > 0)) {
      return 'tag';
    }

    return 'target';
  }

  getGroupKey(result, strategy) {
    if (strategy === 'tag') {
      return result.matchedTags?.[0] || result.coreTags?.[0] || 'untagged';
    }

    if (strategy === 'day') {
      return String(result.createdAt || '').slice(0, 10) || 'unknown-day';
    }

    return result.target || 'unknown-target';
  }
}

module.exports = {
  SemanticGroupManager
};
