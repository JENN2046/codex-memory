'use strict';

const DEFAULT_MINIMUM_SCORE = 0.12;
const DEFAULT_HIGH_CONFIDENCE_SCORE = 0.62;

const RAW_FIELD_NAMES = new Set([
  'content',
  'rawContent',
  'rawText',
  'text',
  'snippet',
  'title',
  'sourceFile',
  'fullPath',
  'filePath',
  'relativePath'
]);

function isFiniteNonNegative(value) {
  return Number.isFinite(value) && value >= 0;
}

function finiteNumber(value, field) {
  const number = Number(value);
  if (!isFiniteNonNegative(number)) {
    throw Object.assign(new Error(`recall precision metadata field ${field} must be a finite non-negative number`), {
      code: 'RECALL_PRECISION_POLICY_METADATA_INVALID',
      field
    });
  }
  return number;
}

function countArray(value, field) {
  if (value === undefined) return 0;
  if (!Array.isArray(value)) {
    throw Object.assign(new Error(`recall precision metadata field ${field} must be an array`), {
      code: 'RECALL_PRECISION_POLICY_METADATA_INVALID',
      field
    });
  }
  return value.length;
}

function assertNoRawFields(candidate = {}) {
  for (const key of Object.keys(candidate)) {
    if (RAW_FIELD_NAMES.has(key)) {
      throw Object.assign(new Error(`recall precision policy received raw field ${key}`), {
        code: 'RECALL_PRECISION_POLICY_RAW_FIELD',
        field: key
      });
    }
  }
}

function sanitizeCandidateMetadata(candidate = {}) {
  assertNoRawFields(candidate);

  const score = finiteNumber(candidate.score, 'score');
  const baseScore = candidate.baseScore === undefined
    ? score
    : finiteNumber(candidate.baseScore, 'baseScore');
  const rerankScore = candidate.rerankScore === undefined || candidate.rerankScore === null
    ? null
    : finiteNumber(candidate.rerankScore, 'rerankScore');
  const lexicalScore = candidate.lexicalScore === undefined
    ? 0
    : finiteNumber(candidate.lexicalScore, 'lexicalScore');
  const tagMemoScore = candidate.tagMemoScore === undefined
    ? 0
    : finiteNumber(candidate.tagMemoScore, 'tagMemoScore');

  return {
    score,
    baseScore,
    rerankScore,
    lexicalScore,
    tagMemoScore,
    matchedTagCount: countArray(candidate.matchedTags, 'matchedTags'),
    coreTagCount: countArray(candidate.coreTagsMatched || candidate.coreTags, 'coreTagsMatched'),
    titleHitCount: finiteNumber(candidate.titleHitCount || 0, 'titleHitCount'),
    tagHitCount: finiteNumber(candidate.tagHitCount || 0, 'tagHitCount'),
    contentHitCount: finiteNumber(candidate.contentHitCount || 0, 'contentHitCount'),
    evidenceHitCount: finiteNumber(candidate.evidenceHitCount || 0, 'evidenceHitCount'),
    exactCoreTagCount: finiteNumber(candidate.exactCoreTagCount || 0, 'exactCoreTagCount')
  };
}

function hasPositiveSignal(metadata) {
  return metadata.lexicalScore > 0
    || metadata.tagMemoScore > 0
    || metadata.matchedTagCount > 0
    || metadata.coreTagCount > 0
    || metadata.titleHitCount > 0
    || metadata.tagHitCount > 0
    || metadata.contentHitCount > 0
    || metadata.evidenceHitCount > 0
    || metadata.exactCoreTagCount > 0;
}

class RecallPrecisionPolicy {
  constructor({
    minimumScore = DEFAULT_MINIMUM_SCORE,
    highConfidenceScore = DEFAULT_HIGH_CONFIDENCE_SCORE
  } = {}) {
    this.minimumScore = Number(minimumScore);
    this.highConfidenceScore = Number(highConfidenceScore);
    if (!isFiniteNonNegative(this.minimumScore) || !isFiniteNonNegative(this.highConfidenceScore)) {
      throw new Error('recall precision thresholds must be finite non-negative numbers');
    }
  }

  evaluateCandidates(candidates = [], context = {}) {
    if (!context?.enabled) {
      return {
        accepted: [...candidates],
        rejected: [],
        decision: 'policy_disabled',
        distribution: summarizeScoreDistribution(candidates)
      };
    }

    if (!Array.isArray(candidates)) {
      throw Object.assign(new Error('recall precision candidates must be an array'), {
        code: 'RECALL_PRECISION_POLICY_METADATA_INVALID'
      });
    }

    const proofNoResultMode = context.proofNoResultMode === true;
    const minimumScore = context.minimumScore === undefined
      ? this.minimumScore
      : finiteNumber(context.minimumScore, 'minimumScore');
    const highConfidenceScore = context.highConfidenceScore === undefined
      ? this.highConfidenceScore
      : finiteNumber(context.highConfidenceScore, 'highConfidenceScore');
    const accepted = [];
    const rejected = [];

    for (const candidate of candidates) {
      const metadata = sanitizeCandidateMetadata(candidate.precision || candidate);
      const positiveSignal = hasPositiveSignal(metadata);

      if (proofNoResultMode) {
        if (metadata.score >= highConfidenceScore || positiveSignal) {
          throw Object.assign(new Error('negative-control no-result mode found a candidate with positive precision signal'), {
            code: 'RECALL_PRECISION_NEGATIVE_CONTROL_CANDIDATE',
            score: metadata.score
          });
        }
        rejected.push({
          reason: 'rejected_negative_control_low_confidence',
          score: metadata.score
        });
        continue;
      }

      if (metadata.score >= minimumScore && positiveSignal) {
        accepted.push({
          ...candidate,
          precisionDecision: 'accepted_expected_recall'
        });
        continue;
      }

      rejected.push({
        reason: 'rejected_low_confidence_missing_positive_signal',
        score: metadata.score
      });
    }

    return {
      accepted,
      rejected,
      decision: proofNoResultMode ? 'no_result_mode_applied' : 'minimum_score_policy_applied',
      distribution: summarizeScoreDistribution(candidates)
    };
  }
}

function summarizeScoreDistribution(candidates = []) {
  const scores = candidates
    .map(candidate => Number(candidate?.precision?.score ?? candidate?.score))
    .filter(Number.isFinite)
    .sort((left, right) => left - right);

  const bucketCounts = {
    zeroTo005: 0,
    from005To01: 0,
    from01To02: 0,
    from02To05: 0,
    from05Plus: 0
  };

  for (const score of scores) {
    if (score < 0.05) bucketCounts.zeroTo005 += 1;
    else if (score < 0.1) bucketCounts.from005To01 += 1;
    else if (score < 0.2) bucketCounts.from01To02 += 1;
    else if (score < 0.5) bucketCounts.from02To05 += 1;
    else bucketCounts.from05Plus += 1;
  }

  return {
    candidateCount: scores.length,
    minScore: scores.length ? scores[0] : null,
    maxScore: scores.length ? scores[scores.length - 1] : null,
    topScore: scores.length ? scores[scores.length - 1] : null,
    bucketCounts,
    metadataKeys: [
      'score',
      'baseScore',
      'rerankScore',
      'lexicalScore',
      'tagMemoScore',
      'matchedTags',
      'coreTagsMatched',
      'titleHitCount',
      'tagHitCount',
      'contentHitCount',
      'evidenceHitCount',
      'exactCoreTagCount'
    ]
  };
}

module.exports = {
  RecallPrecisionPolicy,
  sanitizeCandidateMetadata,
  summarizeScoreDistribution
};
