const { contentTokens, tokenFrequency, uniqueTokens } = require('./text');

class EPAModule {
  analyze(input = {}) {
    const rawQuery = String(input.rawQuery || input.query || '');
    const tokens = input.tokens && input.tokens.length > 0 ? input.tokens : contentTokens(rawQuery);
    const tokenCount = tokens.length;
    const unique = uniqueTokens(tokens);
    const directives = input.directives || {};
    const passiveBlocks = input.passiveBlocks || [];
    const timeRanges = input.timeRanges || [];

    if (tokenCount === 0) {
      return {
        logicDepth: 0,
        resonance: 0,
        semanticWidth: 0,
        entropy: 1,
        dominantAxes: []
      };
    }

    const axisScores = this.buildAxisScores({
      rawQuery,
      tokens,
      directives,
      passiveBlocks,
      timeRanges
    });
    const totalAxisScore = axisScores.reduce((sum, axis) => sum + axis.value, 0);
    const dominantAxes = axisScores
      .map(axis => ({
        label: axis.label,
        energy: totalAxisScore > 0 ? axis.value / totalAxisScore : 0
      }))
      .filter(axis => axis.energy > 0)
      .sort((left, right) => right.energy - left.energy);

    const entropy = this.computeEntropy(tokens);
    const normalizedEntropy = tokenCount > 1 ? Math.min(1, entropy / Math.log2(tokenCount + 1)) : 0;
    const logicDepth = Math.max(0, Math.min(1, 1 - normalizedEntropy * 0.75));
    const semanticWidth = Math.max(0, Math.min(1, unique.length / Math.max(6, tokenCount)));

    let resonance = 0;
    if (dominantAxes.length > 1) {
      const primary = dominantAxes[0].energy;
      resonance = dominantAxes
        .slice(1)
        .reduce((sum, axis) => sum + Math.sqrt(primary * axis.energy), 0);
      resonance = Math.max(0, Math.min(1, resonance));
    }

    return {
      logicDepth,
      resonance,
      semanticWidth,
      entropy: normalizedEntropy,
      dominantAxes
    };
  }

  buildAxisScores({ rawQuery, tokens, directives, passiveBlocks, timeRanges }) {
    const joined = `${rawQuery}\n${tokens.join(' ')}`.toLowerCase();
    const hasAsciiIdentifiers = tokens.some(token => /[a-z]/.test(token) && /[_-]/.test(token));
    const proceduralMatches = this.countMatches(joined, /\b(checkpoint|risk|todo|pending|stage-conclusion|milestone|rollback)\b/g);
    const knowledgeMatches = this.countMatches(joined, /\b(knowledge|validated|reusable|schema|contract|overview|memory|mcp)\b/g);
    const technicalMatches = this.countMatches(joined, /\b(api|json|sqlite|vector|adapter|server|plugin|index|search|rerank|tagmemo)\b/g);
    const temporalMatches = timeRanges.length + this.countMatches(joined, /\b(today|yesterday|week|month|day|days|今天|昨天|本周|上周|本月|上月|最近)\b/g);
    const anchorMatches = passiveBlocks.length + Object.keys(directives || {}).length;

    return [
      { label: 'procedural', value: 1 + proceduralMatches * 1.2 },
      { label: 'knowledge', value: 1 + knowledgeMatches },
      { label: 'technical', value: 1 + technicalMatches + (hasAsciiIdentifiers ? 0.5 : 0) },
      { label: 'temporal', value: temporalMatches > 0 ? 1 + temporalMatches : 0.2 },
      { label: 'anchored', value: anchorMatches > 0 ? 1 + anchorMatches : 0.2 }
    ];
  }

  computeEntropy(tokens) {
    const frequencies = tokenFrequency(tokens);
    const total = tokens.length;
    let entropy = 0;

    for (const count of frequencies.values()) {
      const probability = count / total;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  countMatches(text, pattern) {
    const matches = text.match(pattern);
    return Array.isArray(matches) ? matches.length : 0;
  }
}

module.exports = {
  EPAModule
};
