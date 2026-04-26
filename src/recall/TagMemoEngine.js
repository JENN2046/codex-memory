const { EPAModule } = require('./EPAModule');
const { ResidualPyramid } = require('./ResidualPyramid');
const { compactText, contentTokens, pickCoreTokens, uniqueTokens } = require('./text');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

class TagMemoEngine {
  constructor({ epaModule = new EPAModule(), residualPyramid = new ResidualPyramid() } = {}) {
    this.epaModule = epaModule;
    this.residualPyramid = residualPyramid;
  }

  analyzeQuery(input = {}) {
    const queryText = compactText(input.query || input.rawQuery || '');
    const tokens = contentTokens(queryText);
    const metrics = this.epaModule.analyze({
      rawQuery: input.rawQuery || queryText,
      query: queryText,
      tokens,
      directives: input.directives || {},
      passiveBlocks: input.passiveBlocks || [],
      timeRanges: input.timeRanges || []
    });
    const pyramid = this.residualPyramid.analyze({ tokens });

    const passiveTokens = (input.passiveBlocks || [])
      .flatMap(block => contentTokens(block));
    const coreTags = uniqueTokens([
      ...pickCoreTokens(tokens, 5),
      ...passiveTokens.slice(0, 3),
      ...pyramid.levels.flatMap(level => level.tags.map(tag => tag.name)).slice(0, 6)
    ]).slice(0, 8);

    const explicitWeight = this.parseExplicitTagMemoWeight(input.directives || {});
    const dynamicWeight = this.computeDynamicWeight(metrics, pyramid, explicitWeight);
    const dynamicCoreWeight = this.computeDynamicCoreWeight(metrics, pyramid);

    return {
      queryText,
      tokens,
      coreTags,
      metrics,
      pyramid,
      timeRanges: input.timeRanges || [],
      directives: input.directives || {},
      dynamicTagWeight: dynamicWeight,
      dynamicCoreWeight,
      tagMemoMode: explicitWeight !== null ? 'explicit' : 'auto'
    };
  }

  scoreRecord(record, queryAnalysis) {
    const titleTokens = contentTokens(record.title);
    const content = record.cleanedText || record.content || record.rawText || '';
    const contentTokenSet = new Set(contentTokens(content));
    const evidenceTokenSet = new Set(contentTokens(record.evidence || ''));
    const tagList = Array.isArray(record.tags) ? record.tags : [];
    const tagTokens = contentTokens(tagList.join(' '));
    const tagTokenEntries = tagList.map(tag => ({
      tag,
      tokens: new Set(contentTokens(tag))
    }));
    const titleTokenSet = new Set(titleTokens);
    const tagTokenSet = new Set(tagTokens);
    const dynamicCoreWeight = Number(queryAnalysis.dynamicCoreWeight) || 1.25;

    let score = 0;
    const matchedTags = [];
    const matchedCoreTags = [];
    let tagHitCount = 0;
    let titleHitCount = 0;
    let contentHitCount = 0;
    let evidenceHitCount = 0;
    let exactCoreTagCount = 0;

    for (const coreTag of queryAnalysis.coreTags || []) {
      let matched = false;
      const exactTagMatches = tagTokenSet.has(coreTag)
        ? tagTokenEntries
          .filter(entry => entry.tokens.has(coreTag))
          .map(entry => entry.tag)
        : [];

      if (exactTagMatches.length > 0) {
        score += 1.2 * dynamicCoreWeight;
        matched = true;
        matchedTags.push(...exactTagMatches);
        tagHitCount += 1;
        exactCoreTagCount += 1;
      } else if (titleTokenSet.has(coreTag)) {
        score += 0.85 * (1 + (dynamicCoreWeight - 1) * 0.35);
        matched = true;
        titleHitCount += 1;
      } else if (contentTokenSet.has(coreTag)) {
        score += 0.55 * (1 + (dynamicCoreWeight - 1) * 0.18);
        matched = true;
        contentHitCount += 1;
      } else if (evidenceTokenSet.has(coreTag)) {
        score += 0.35;
        matched = true;
        evidenceHitCount += 1;
      }

      if (matched) {
        matchedCoreTags.push(coreTag);
      }
    }

    const normalizedScore = queryAnalysis.coreTags.length > 0
      ? score / queryAnalysis.coreTags.length
      : 0;
    const boost = clamp(normalizedScore * queryAnalysis.dynamicTagWeight * 0.4, 0, 0.45);
    const surfaceScore = clamp(
      exactCoreTagCount * 0.08
        + tagHitCount * 0.05
        + titleHitCount * 0.035
        + contentHitCount * 0.02
        + evidenceHitCount * 0.01,
      0,
      0.18
    );

    return {
      boost: Number(boost.toFixed(6)),
      normalizedScore: Number(normalizedScore.toFixed(6)),
      surfaceScore: Number(surfaceScore.toFixed(6)),
      matchedTags: uniqueTokens(matchedTags),
      matchedCoreTags: uniqueTokens(matchedCoreTags),
      tagHitCount,
      titleHitCount,
      contentHitCount,
      evidenceHitCount,
      exactCoreTagCount,
      dynamicCoreWeight: Number(dynamicCoreWeight.toFixed(6))
    };
  }

  parseExplicitTagMemoWeight(directives) {
    const raw = directives.tagmemo;
    if (raw === undefined || raw === false) return null;
    if (raw === true) return 1;

    const numeric = Number.parseFloat(String(raw));
    if (Number.isNaN(numeric)) return 1;
    return clamp(numeric, 0.2, 2.5);
  }

  computeDynamicWeight(metrics, pyramid, explicitWeight) {
    const coverage = pyramid.features.coverage || 0;
    const activation = pyramid.features.tagMemoActivation || 0;
    const base = 0.14 + metrics.logicDepth * 0.16 + metrics.resonance * 0.08 + activation * 0.12 + (1 - coverage) * 0.08;
    const weighted = explicitWeight !== null ? base * explicitWeight : base;
    return Number(clamp(weighted, 0.05, 0.45).toFixed(6));
  }

  computeDynamicCoreWeight(metrics, pyramid) {
    const coverage = pyramid.features.coverage || 0;
    const coreMetric = metrics.logicDepth * 0.5 + (1 - coverage) * 0.5;
    return Number(clamp(1.2 + coreMetric * 0.2, 1.2, 1.4).toFixed(6));
  }
}

module.exports = {
  TagMemoEngine
};
