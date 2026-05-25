const PROOF_MEMORY_VISIBILITY = 'internal_proof';
const PROOF_MEMORY_TAG = 'proof';
const PROOF_MEMORY_RETENTION_POLICY = 'short_lived_or_tombstone_after_validation';

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }
  return [];
}

function uniqueTags(tags = []) {
  return [...new Set(normalizeTags(tags))];
}

function normalizeVisibilityList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map(item => normalizeString(item)).filter(Boolean))];
  }
  const normalized = normalizeString(value);
  return normalized ? [normalized] : [];
}

function isExplicitProofMemoryPayload(payload = {}, normalized = {}) {
  const visibility = normalizeString(
    normalized.visibility ||
    payload.visibility ||
    payload.proof_namespace ||
    payload.proofNamespace
  );
  const retentionPolicy = normalizeString(
    normalized.retentionPolicy ||
    payload.retention_policy ||
    payload.retentionPolicy
  );

  return visibility === PROOF_MEMORY_VISIBILITY ||
    retentionPolicy === PROOF_MEMORY_RETENTION_POLICY;
}

function applyProofMemoryWritePolicy(payload = {}, normalized = {}) {
  const tags = uniqueTags(normalized.tags ?? payload.tags);
  const visibility = normalizeString(normalized.visibility ?? payload.visibility) || null;
  const retentionPolicy = normalizeString(
    normalized.retentionPolicy ??
    payload.retention_policy ??
    payload.retentionPolicy
  ) || null;
  const proofMemory = isExplicitProofMemoryPayload(payload, {
    ...normalized,
    visibility,
    retentionPolicy
  });

  if (!proofMemory) {
    return {
      tags,
      visibility,
      retentionPolicy,
      proofMemory: {
        applied: false,
        visibility: null,
        retentionPolicy: null,
        recallDefault: 'normal_recall'
      }
    };
  }

  return {
    tags: uniqueTags([...tags, PROOF_MEMORY_TAG]),
    visibility: PROOF_MEMORY_VISIBILITY,
    retentionPolicy: PROOF_MEMORY_RETENTION_POLICY,
    proofMemory: {
      applied: true,
      visibility: PROOF_MEMORY_VISIBILITY,
      retentionPolicy: PROOF_MEMORY_RETENTION_POLICY,
      tag: PROOF_MEMORY_TAG,
      normalUserRecall: 'exclude',
      proofRecall: 'include_when_explicit'
    }
  };
}

function buildProofMemoryRecallFilters(candidateFilters = {}) {
  const filters = candidateFilters && typeof candidateFilters === 'object'
    ? { ...candidateFilters }
    : {};
  const visibility = normalizeVisibilityList(filters.visibility);
  const visibilityExclude = normalizeVisibilityList(
    filters.visibilityExclude ?? filters.excludeVisibility
  );

  if (visibility.includes(PROOF_MEMORY_VISIBILITY)) {
    return filters;
  }

  return {
    ...filters,
    visibilityExclude: uniqueTags([...visibilityExclude, PROOF_MEMORY_VISIBILITY])
  };
}

module.exports = {
  PROOF_MEMORY_RETENTION_POLICY,
  PROOF_MEMORY_TAG,
  PROOF_MEMORY_VISIBILITY,
  applyProofMemoryWritePolicy,
  buildProofMemoryRecallFilters,
  isExplicitProofMemoryPayload
};
