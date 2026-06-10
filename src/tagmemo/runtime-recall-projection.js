'use strict';

const {
  COMPOSITION_VERSION,
  composeTagMemoRecall
} = require('./recall-composition');

const INPUT_SCHEMA_VERSION = 'tagmemo-runtime-recall-projection-input-v1';
const PROJECTION_SCHEMA_VERSION = 'tagmemo-runtime-recall-projection-v1';

const ALLOWED_INPUT_KEYS = new Set([
  'schemaVersion',
  'boundedQueryText',
  'recallIntent',
  'seedProjection',
  'candidates'
]);

const ALLOWED_SEED_KEYS = new Set([
  'memoryId',
  'boundedMemoryText',
  'metadataProjection',
  'tagProjection',
  'safeRecency',
  'safeEvidenceHints'
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

function buildRuntimeRecallProjectionFailure(reason) {
  return {
    schemaVersion: PROJECTION_SCHEMA_VERSION,
    projectionMode: 'runtime_recall_noop',
    compositionVersion: COMPOSITION_VERSION,
    projectedCandidates: [],
    candidateScores: [],
    projectionReasons: [],
    rejected: true,
    reason,
    lowDisclosure: true,
    mutated: false,
    persisted: false,
    publicResponse: false,
    searchMemoryPublicResponse: false,
    searchMemoryPublicContractChanged: false,
    providerCalls: 0,
    publicMcpExpansion: 0
  };
}

function validateProjectionSeed(seedProjection) {
  if (!seedProjection || typeof seedProjection !== 'object' || Array.isArray(seedProjection)) {
    return { ok: false, reason: 'invalid_seed_projection' };
  }
  for (const key of objectKeys(seedProjection)) {
    if (!ALLOWED_SEED_KEYS.has(key)) return { ok: false, reason: 'unsupported_seed_projection_field' };
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
  if (typeof input.recallIntent !== 'string') return { ok: false, reason: 'invalid_recall_intent' };
  const seedValidation = validateProjectionSeed(input.seedProjection);
  if (!seedValidation.ok) return seedValidation;
  if (!Array.isArray(input.candidates)) return { ok: false, reason: 'invalid_candidates' };
  if (input.candidates.length === 0) return { ok: false, reason: 'empty_candidates' };
  for (const candidate of input.candidates) {
    const candidateValidation = validateCandidate(candidate);
    if (!candidateValidation.ok) return candidateValidation;
  }
  if (hasUnsafeString(input)) return { ok: false, reason: 'forbidden_raw_private_value' };
  return { ok: true };
}

function toCompositionInput(input) {
  return {
    schemaVersion: 'tagmemo-recall-composition-input-v1',
    boundedQueryText: input.boundedQueryText,
    recallIntent: input.recallIntent,
    seedMemoryId: input.seedProjection.memoryId,
    boundedMemoryText: input.seedProjection.boundedMemoryText,
    metadataProjection: input.seedProjection.metadataProjection,
    tagProjection: input.seedProjection.tagProjection,
    safeRecency: input.seedProjection.safeRecency,
    safeEvidenceHints: input.seedProjection.safeEvidenceHints,
    candidates: input.candidates
  };
}

function toProjectedCandidates(rankedCandidates) {
  return rankedCandidates.map((candidate, index) => ({
    memoryId: candidate.memoryId,
    rankScore: candidate.rankScore,
    rankIndex: index
  }));
}

function toCandidateScores(candidateScores) {
  return candidateScores.map(score => ({
    memoryId: score.memoryId,
    importanceScore: score.importanceScore,
    importanceBand: score.importanceBand,
    timeDecayScore: score.timeDecayScore,
    timeDecayBand: score.timeDecayBand
  }));
}

function createTagMemoRuntimeRecallProjection(input = {}, options = {}) {
  const validation = validateInput(input);
  if (!validation.ok) return buildRuntimeRecallProjectionFailure(validation.reason);

  const composer = typeof options.composer === 'function'
    ? options.composer
    : composeTagMemoRecall;

  let composition;
  try {
    composition = composer(toCompositionInput(input), options.compositionOptions || {});
  } catch (error) {
    return buildRuntimeRecallProjectionFailure('recall_composition_failed');
  }

  if (!composition || composition.rejected === true) {
    return buildRuntimeRecallProjectionFailure(composition?.reason || 'recall_composition_rejected');
  }

  return {
    schemaVersion: PROJECTION_SCHEMA_VERSION,
    projectionMode: 'runtime_recall_noop',
    compositionVersion: composition.compositionVersion || COMPOSITION_VERSION,
    projectedCandidates: toProjectedCandidates(Array.isArray(composition.rankedCandidates)
      ? composition.rankedCandidates
      : []),
    candidateScores: toCandidateScores(Array.isArray(composition.candidateScores)
      ? composition.candidateScores
      : []),
    projectionReasons: Array.isArray(composition.compositionReasons)
      ? composition.compositionReasons.slice()
      : [],
    rejected: false,
    reason: null,
    lowDisclosure: true,
    mutated: false,
    persisted: false,
    publicResponse: false,
    searchMemoryPublicResponse: false,
    searchMemoryPublicContractChanged: false,
    providerCalls: 0,
    publicMcpExpansion: 0
  };
}

module.exports = {
  INPUT_SCHEMA_VERSION,
  PROJECTION_SCHEMA_VERSION,
  buildRuntimeRecallProjectionFailure,
  createTagMemoRuntimeRecallProjection
};
