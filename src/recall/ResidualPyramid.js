const { pickCoreTokens, uniqueTokens } = require('./text');

class ResidualPyramid {
  analyze(input = {}) {
    const tokens = uniqueTokens(input.tokens || []);
    if (tokens.length === 0) {
      return {
        levels: [],
        totalExplainedEnergy: 0,
        features: {
          coverage: 0,
          novelty: 0,
          breadth: 0,
          tagMemoActivation: 0
        }
      };
    }

    const rankedTokens = pickCoreTokens(tokens, Math.min(9, tokens.length));
    const levels = [];
    const chunks = [
      rankedTokens.slice(0, 3),
      rankedTokens.slice(3, 6),
      rankedTokens.slice(6, 9)
    ].filter(levelTokens => levelTokens.length > 0);

    const total = Math.max(1, rankedTokens.length);
    let consumed = 0;
    for (let index = 0; index < chunks.length; index += 1) {
      const levelTokens = chunks[index];
      consumed += levelTokens.length;
      levels.push({
        level: index,
        tags: levelTokens.map((token, tokenIndex) => ({
          id: `token:${index}:${tokenIndex}:${token}`,
          name: token,
          similarity: Math.max(0.1, 1 - index * 0.2),
          contribution: Number((Math.max(0.12, (levelTokens.length - tokenIndex) / total)).toFixed(6))
        })),
        energyExplained: Number((consumed / total).toFixed(6)),
        residualEnergyRatio: Number((Math.max(0, total - consumed) / total).toFixed(6))
      });
    }

    const coverage = Math.min(1, (levels[0]?.tags.length || 0) / Math.max(3, total));
    const novelty = Math.min(1, Math.max(0, total - (levels[0]?.tags.length || 0)) / total);
    const breadth = Math.min(1, levels.length / 3);
    const tagMemoActivation = Math.min(1, coverage * 0.55 + novelty * 0.25 + breadth * 0.2);

    return {
      levels,
      totalExplainedEnergy: Number((consumed / total).toFixed(6)),
      features: {
        coverage,
        novelty,
        breadth,
        tagMemoActivation
      }
    };
  }
}

module.exports = {
  ResidualPyramid
};
