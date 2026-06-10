'use strict';

const { expandTagMemoQuery } = require('./query-expansion');
const { deriveTagMemoAssociations } = require('./association-recall');
const { scoreTimeDecay } = require('./time-decay-scoring');
const { scoreMemoryImportance } = require('./importance-scoring');
const { rankTagMemoCandidates } = require('./recall-ranking');

const INPUT_SCHEMA_VERSION = 'tagmemo-recall-composition-input-v1';
const OUTPUT_SCHEMA_VERSION = 'tagmemo-recall-composition-output-v1';
const COMPOSITION_VERSION = 'deterministic_v1';

const ALLOWED_INPUT_KEYS = new Set([
  'schemaVersion',
  'boundedQueryText',
  'recallIntent',
  'seedMemoryId',
  'boundedMemoryText',
  'metadataProjection',
  'tagProjection',
  'safeRecency',
  'safeEvidenceHints',
  'candidates'
]);

const ALLOWED_CANDIDATE_KEYS = new Set([
  'memoryId',
  'boundedMemoryText',
  'metadataProjection',
  'tagProjection',
  'safeRecency',
  'safeEvidenceHints',
  'importanceScore',
  'queryExpansionHints'
]);

const ALLOWED_METADATA_KEYS = new Set(['title', 'summary', 'sourceKind']);
const ALLOWED_SOURCE_KINDS = new Set(['fixture', 'selected_projection', 'operator_reviewed']);
const ALLOWED_TAG_PROJECTION_KEYS = new Set(['tags']);
const ALLOWED_TAG_KEYS = new Set(['tagLabel', 'tagSource', 'confidenceScore']);
const ALLOWED_TAG_SOURCES = new Set([
  'explicit_record_tag',
  'operator_reviewed',
  'fixture_expected',
  'query_core_tag',
  'derived_candidate'
]);
const ALLOWED_RECENCY_KEYS = new Set(['bucket', 'sequence']);
const ALLOWED_RECENCY_BUCKETS = new Set(['current', 'recent', 'stable', 'older', 'archival', 'unknown']);
const ALLOWED_RECALL_INTENTS = new Set(['decision_support', 'route_review', 'proof_lookup', 'general_recall']);

const FORBIDDEN_RAW_PRIVATE_KEYS = new Set([
  'rawText',
  'rawContent',
  'content',
  'rawBody',
  'transcript',
  'rawAudit',
  'rawJsonl',
  'sqliteRow',
  'vectorPayload',
  'candidateCachePayload',
  'sourceFile',
  'fullPath',
  'filePath',
  'relativePath',
  'provider',
  'apiKey',
  'token',
  'authorization',
  'bearer',
  'privateLifecycleState',
  'localPath',
  'providerEndpoint',
  'clientSecret',
  'rawTimestamp',
  'createdAt',
  'updatedAt'
]);

const UNSAFE_VALUE_PATTERN = /(?:provider|api[ _-]?(?:key|endpoint)?|token|bearer|raw[ _-]?(?:scan|audit|text|content|body|memory|timestamp)|jsonl|sqlite|vector|secret|[a-z]:[\\/]|[\\/])/i;

function objectKeys(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? Object.keys(value)
    : [];
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isBoundedId(value, prefix) {
  return typeof value === 'string'
    && value.startsWith(`${prefix}:`)
    && /^[a-z]+:[a-z0-9:_-]+$/i.test(value)
    && !/[\\/]/.test(value)
    && !/^[A-Za-z]:[\\/]/.test(value);
}

function hasForbiddenKey(value) {
  if (Array.isArray(value)) return value.some(item => hasForbiddenKey(item));
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, nested]) => (
    FORBIDDEN_RAW_PRIVATE_KEYS.has(key) || hasForbiddenKey(nested)
  ));
}

function hasUnsafeString(value) {
  if (typeof value === 'string') return UNSAFE_VALUE_PATTERN.test(value);
  if (Array.isArray(value)) return value.some(item => hasUnsafeString(item));
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).some(nested => hasUnsafeString(nested));
}

function lowDisclosureResult(reason) {
  return {
    schemaVersion: OUTPUT_SCHEMA_VERSION,
    compositionVersion: COMPOSITION_VERSION,
    expandedQueries: [],
    associatedCandidates: [],
    candidateScores: [],
    rankedCandidates: [],
    compositionReasons: [],
    rejected: true,
    reason,
    lowDisclosure: true,
    mutated: false,
    persisted: false,
    publicResponse: false,
    providerCalls: 0,
    publicMcpExpansion: 0
  };
}

function validateMetadataProjection(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return { ok: false, reason: 'invalid_metadata_projection' };
  }
  for (const key of objectKeys(metadata)) {
    if (!ALLOWED_METADATA_KEYS.has(key)) return { ok: false, reason: 'unsupported_metadata_field' };
  }
  if (typeof metadata.title !== 'string' || typeof metadata.summary !== 'string') {
    return { ok: false, reason: 'invalid_metadata_projection' };
  }
  if (!ALLOWED_SOURCE_KINDS.has(metadata.sourceKind)) return { ok: false, reason: 'unsupported_source_kind' };
  return { ok: true };
}

function validateTagProjection(tagProjection) {
  if (!tagProjection || typeof tagProjection !== 'object' || Array.isArray(tagProjection)) {
    return { ok: false, reason: 'invalid_tag_projection' };
  }
  for (const key of objectKeys(tagProjection)) {
    if (!ALLOWED_TAG_PROJECTION_KEYS.has(key)) return { ok: false, reason: 'unsupported_tag_projection_field' };
  }
  if (!Array.isArray(tagProjection.tags)) return { ok: false, reason: 'invalid_tag_projection' };
  for (const tag of tagProjection.tags) {
    if (!tag || typeof tag !== 'object' || Array.isArray(tag)) return { ok: false, reason: 'invalid_tag_projection' };
    for (const key of objectKeys(tag)) {
      if (!ALLOWED_TAG_KEYS.has(key)) return { ok: false, reason: 'unsupported_tag_field' };
    }
    if (typeof tag.tagLabel !== 'string' || !ALLOWED_TAG_SOURCES.has(tag.tagSource)) {
      return { ok: false, reason: 'invalid_tag_projection' };
    }
    if (!Number.isFinite(tag.confidenceScore) || tag.confidenceScore < 0 || tag.confidenceScore > 1) {
      return { ok: false, reason: 'invalid_tag_projection' };
    }
  }
  return { ok: true };
}

function validateSafeRecency(safeRecency) {
  if (!safeRecency || typeof safeRecency !== 'object' || Array.isArray(safeRecency)) {
    return { ok: false, reason: 'invalid_safe_recency' };
  }
  for (const key of objectKeys(safeRecency)) {
    if (!ALLOWED_RECENCY_KEYS.has(key)) return { ok: false, reason: 'unsupported_safe_recency_field' };
  }
  if (!ALLOWED_RECENCY_BUCKETS.has(safeRecency.bucket) || !Number.isInteger(safeRecency.sequence)) {
    return { ok: false, reason: 'invalid_safe_recency' };
  }
  return { ok: true };
}

function validateProjectionFields(value) {
  if (typeof value.boundedMemoryText !== 'string') return { ok: false, reason: 'invalid_bounded_memory_text' };
  const metadataValidation = validateMetadataProjection(value.metadataProjection);
  if (!metadataValidation.ok) return metadataValidation;
  const tagValidation = validateTagProjection(value.tagProjection);
  if (!tagValidation.ok) return tagValidation;
  const recencyValidation = validateSafeRecency(value.safeRecency);
  if (!recencyValidation.ok) return recencyValidation;
  if (!Array.isArray(value.safeEvidenceHints) || value.safeEvidenceHints.some(hint => typeof hint !== 'string')) {
    return { ok: false, reason: 'invalid_safe_evidence_hints' };
  }
  return { ok: true };
}

function validateCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return { ok: false, reason: 'invalid_candidate' };
  }
  for (const key of objectKeys(candidate)) {
    if (!ALLOWED_CANDIDATE_KEYS.has(key)) return { ok: false, reason: 'unsupported_candidate_field' };
  }
  if (!isBoundedId(candidate.memoryId, 'memory')) return { ok: false, reason: 'invalid_memory_id' };
  const projectionValidation = validateProjectionFields(candidate);
  if (!projectionValidation.ok) return projectionValidation;
  if (candidate.importanceScore !== undefined && (
    !Number.isFinite(candidate.importanceScore) || candidate.importanceScore < 0 || candidate.importanceScore > 1
  )) {
    return { ok: false, reason: 'invalid_importance_score' };
  }
  if (candidate.queryExpansionHints !== undefined && (
    !Array.isArray(candidate.queryExpansionHints) || candidate.queryExpansionHints.some(hint => typeof hint !== 'string')
  )) {
    return { ok: false, reason: 'invalid_query_expansion_hints' };
  }
  return { ok: true };
}

function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, reason: 'invalid_input' };
  if (hasForbiddenKey(input)) return { ok: false, reason: 'forbidden_raw_private_field' };
  for (const key of objectKeys(input)) {
    if (!ALLOWED_INPUT_KEYS.has(key)) return { ok: false, reason: 'unsupported_input_field' };
  }
  if (input.schemaVersion !== INPUT_SCHEMA_VERSION) return { ok: false, reason: 'invalid_schema_version' };
  if (typeof input.boundedQueryText !== 'string') return { ok: false, reason: 'invalid_bounded_query_text' };
  if (!ALLOWED_RECALL_INTENTS.has(input.recallIntent)) return { ok: false, reason: 'unsupported_recall_intent' };
  if (!isBoundedId(input.seedMemoryId, 'memory')) return { ok: false, reason: 'invalid_seed_memory_id' };
  const projectionValidation = validateProjectionFields(input);
  if (!projectionValidation.ok) return projectionValidation;
  if (!Array.isArray(input.candidates)) return { ok: false, reason: 'invalid_candidates' };
  if (input.candidates.length === 0) return { ok: false, reason: 'empty_candidates' };
  for (const candidate of input.candidates) {
    const candidateValidation = validateCandidate(candidate);
    if (!candidateValidation.ok) return candidateValidation;
  }
  if (hasUnsafeString(input)) return { ok: false, reason: 'forbidden_raw_private_value' };
  return { ok: true };
}

function bandFor(score) {
  if (score < 0.35) return 'low';
  if (score < 0.75) return 'medium';
  return 'high';
}

function stageOk(result) {
  return result && result.rejected === false;
}

function boundedHintsFromExpansion(expansion) {
  return stageOk(expansion) ? expansion.expandedQueries.slice(0, 6) : [];
}

function candidateImportance(candidate) {
  const scored = scoreMemoryImportance({
    schemaVersion: 'tagmemo-importance-scoring-input-v1',
    memoryId: candidate.memoryId,
    boundedMemoryText: candidate.boundedMemoryText,
    metadataProjection: candidate.metadataProjection,
    tagProjection: candidate.tagProjection,
    safeEvidenceHints: candidate.safeEvidenceHints
  });
  return stageOk(scored) ? scored.importanceScore : 0;
}

function candidateDecay(candidate) {
  const scored = scoreTimeDecay({
    schemaVersion: 'tagmemo-time-decay-scoring-input-v1',
    memoryId: candidate.memoryId,
    safeRecency: candidate.safeRecency,
    safeEvidenceHints: candidate.safeEvidenceHints
  });
  return stageOk(scored) ? scored.timeDecayScore : 0;
}

function composeTagMemoRecall(input) {
  const validation = validateInput(input);
  if (!validation.ok) return lowDisclosureResult(validation.reason);

  const seedImportance = scoreMemoryImportance({
    schemaVersion: 'tagmemo-importance-scoring-input-v1',
    memoryId: input.seedMemoryId,
    boundedMemoryText: input.boundedMemoryText,
    metadataProjection: input.metadataProjection,
    tagProjection: input.tagProjection,
    safeEvidenceHints: input.safeEvidenceHints
  });
  const importanceBand = stageOk(seedImportance) ? seedImportance.importanceBand : 'medium';

  const queryExpansion = expandTagMemoQuery({
    schemaVersion: 'tagmemo-query-expansion-input-v1',
    boundedQueryText: input.boundedQueryText,
    recallIntent: input.recallIntent,
    importanceBand,
    tagProjection: input.tagProjection,
    safeEvidenceHints: input.safeEvidenceHints
  });
  const queryExpansionHints = boundedHintsFromExpansion(queryExpansion);

  const candidateScores = input.candidates.map(candidate => {
    const importanceScore = candidateImportance(candidate);
    const timeDecayScore = candidateDecay(candidate);
    const queryHints = Array.isArray(candidate.queryExpansionHints)
      ? candidate.queryExpansionHints
      : queryExpansionHints;
    return {
      memoryId: candidate.memoryId,
      importanceScore,
      timeDecayScore,
      queryExpansionHints: queryHints
    };
  });

  const association = deriveTagMemoAssociations({
    schemaVersion: 'tagmemo-association-recall-input-v1',
    seedMemoryId: input.seedMemoryId,
    seedProjection: {
      tagProjection: input.tagProjection,
      queryExpansionHints,
      safeEvidenceHints: input.safeEvidenceHints
    },
    candidates: input.candidates.map(candidate => {
      const score = candidateScores.find(item => item.memoryId === candidate.memoryId);
      return {
        memoryId: candidate.memoryId,
        tagProjection: candidate.tagProjection,
        queryExpansionHints: score.queryExpansionHints,
        importanceScore: score.importanceScore,
        safeEvidenceHints: candidate.safeEvidenceHints
      };
    })
  });

  const ranking = rankTagMemoCandidates({
    schemaVersion: 'tagmemo-recall-ranking-input-v1',
    boundedQueryText: queryExpansionHints[0] || input.boundedQueryText,
    candidates: input.candidates.map(candidate => {
      const score = candidateScores.find(item => item.memoryId === candidate.memoryId);
      return {
        memoryId: candidate.memoryId,
        boundedMemoryText: candidate.boundedMemoryText,
        tagProjection: candidate.tagProjection,
        importanceScore: score.importanceScore,
        safeRecency: candidate.safeRecency,
        safeEvidenceHints: candidate.safeEvidenceHints
      };
    })
  });

  if (!stageOk(queryExpansion)) return lowDisclosureResult(queryExpansion.reason || 'query_expansion_rejected');
  if (!stageOk(association)) return lowDisclosureResult(association.reason || 'association_recall_rejected');
  if (!stageOk(ranking)) return lowDisclosureResult(ranking.reason || 'recall_ranking_rejected');

  return {
    schemaVersion: OUTPUT_SCHEMA_VERSION,
    compositionVersion: COMPOSITION_VERSION,
    expandedQueries: queryExpansion.expandedQueries,
    associatedCandidates: association.associatedCandidates,
    candidateScores: candidateScores.map(score => ({
      memoryId: score.memoryId,
      importanceScore: score.importanceScore,
      importanceBand: bandFor(score.importanceScore),
      timeDecayScore: score.timeDecayScore,
      timeDecayBand: score.timeDecayScore >= 0.75 ? 'high' : score.timeDecayScore >= 0.4 ? 'medium' : 'low'
    })),
    rankedCandidates: ranking.rankedCandidates,
    compositionReasons: [
      'query_expansion',
      'association_recall',
      'time_decay_scoring',
      'importance_scoring',
      'recall_ranking'
    ],
    rejected: false,
    reason: null,
    lowDisclosure: true,
    mutated: false,
    persisted: false,
    publicResponse: false,
    providerCalls: 0,
    publicMcpExpansion: 0
  };
}

module.exports = {
  COMPOSITION_VERSION,
  composeTagMemoRecall
};
