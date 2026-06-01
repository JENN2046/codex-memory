const crypto = require('node:crypto');

const {
  firstNonEmptyAliasString,
  normalizeMemoryId
} = require('./FieldAliasNormalizer');
const { formatSecretRejectionReason, scanMemoryWritePayload } = require('./SecretScanner');

const SCHEMA_VERSION = 'memory-write-lifecycle-dedup-suppression-preflight-v1';
const SCHEMA_VERSION_METADATA_KEYS = Object.freeze([
  'schema_version',
  'schemaVersion',
  'policy_version',
  'policyVersion',
  'manifest_version',
  'manifestVersion'
]);

const SCOPE_FIELDS = Object.freeze([
  'projectId',
  'workspaceId',
  'clientId',
  'taskId',
  'conversationId',
  'visibility',
  'retentionPolicy'
]);

const TERMINAL_LIFECYCLE_STATUSES = Object.freeze([
  'rejected',
  'superseded',
  'tombstoned',
  'forgotten'
]);

const LIFECYCLE_ACTIONS_REQUIRING_APPROVAL = Object.freeze([
  'supersede',
  'tombstone',
  'forget'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function findSchemaVersionMetadataKeys(payload = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return [];
  }

  return SCHEMA_VERSION_METADATA_KEYS.filter(key =>
    Object.prototype.hasOwnProperty.call(payload, key)
  );
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeString).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }

  return [];
}

function normalizeBoolean(value) {
  return value === true;
}

function normalizeScope(input = {}) {
  const scope = {};

  for (const field of SCOPE_FIELDS) {
    scope[field] = firstNonEmptyAliasString(input, [field, toSnakeCase(field)]);
  }

  return scope;
}

function toSnakeCase(value) {
  return value.replace(/[A-Z]/g, match => `_${match.toLowerCase()}`);
}

function scopesMatch(left = {}, right = {}) {
  return SCOPE_FIELDS.every(field => normalizeString(left[field]) === normalizeString(right[field]));
}

function scopeMismatches(proposedScope = {}, allowedScope = {}) {
  return SCOPE_FIELDS
    .filter(field => normalizeString(allowedScope[field]))
    .filter(field => normalizeString(proposedScope[field]) !== normalizeString(allowedScope[field]));
}

function normalizeWriteCandidate(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const target = normalizeString(safeInput.target).toLowerCase();
  const title = normalizeString(safeInput.title);
  const content = normalizeString(safeInput.content);
  const evidence = normalizeString(safeInput.evidence);
  const lifecycleStatus = (firstNonEmptyAliasString(safeInput, ['lifecycleStatus', 'lifecycle_status']) || 'active')
    .toLowerCase();
  const lifecycleAction = (firstNonEmptyAliasString(safeInput, ['lifecycleAction', 'lifecycle_action']) || 'create')
    .toLowerCase();

  return {
    target,
    title,
    content,
    evidence,
    tags: normalizeTags(safeInput.tags),
    lifecycleStatus,
    lifecycleAction,
    reason: normalizeString(safeInput.reason),
    supersedesMemoryId: firstNonEmptyAliasString(safeInput, ['supersedesMemoryId', 'supersedes_memory_id']),
    tombstoneMemoryId: firstNonEmptyAliasString(safeInput, ['tombstoneMemoryId', 'tombstone_memory_id']),
    forgetMemoryId: firstNonEmptyAliasString(safeInput, ['forgetMemoryId', 'forget_memory_id']),
    scope: normalizeScope(safeInput),
    raw: safeInput
  };
}

function canonicalPayload(candidate) {
  return {
    target: candidate.target,
    title: candidate.title.toLowerCase(),
    content: candidate.content,
    evidence: candidate.evidence,
    tags: [...candidate.tags].sort(),
    scope: candidate.scope
  };
}

function computeCanonicalWriteHash(input = {}) {
  const candidate = normalizeWriteCandidate(input);
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalPayload(candidate)))
    .digest('hex');
}

function normalizeExistingCandidate(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const normalized = normalizeWriteCandidate(safeInput);

  return {
    memoryId: normalizeMemoryId(safeInput),
    canonicalHash: firstNonEmptyAliasString(safeInput, ['canonicalHash', 'canonical_hash']) ||
      computeCanonicalWriteHash(safeInput),
    lifecycleStatus: normalized.lifecycleStatus,
    target: normalized.target,
    title: normalized.title,
    scope: normalized.scope
  };
}

function buildResult(overrides = {}) {
  const blockers = Array.isArray(overrides.blockers) ? overrides.blockers : [];

  return {
    schemaVersion: SCHEMA_VERSION,
    sourceMode: 'explicit_input',
    decision: overrides.decision || 'rejected_malformed_input',
    acceptedForWritePreflight: blockers.length === 0 && overrides.acceptedForWritePreflight === true,
    runtimeIntegrated: false,
    mutated: false,
    publicMcpExpanded: false,
    canonicalHash: overrides.canonicalHash || null,
    blockers,
    matchedCandidateIds: Array.isArray(overrides.matchedCandidateIds)
      ? overrides.matchedCandidateIds
      : [],
    scopeMismatches: Array.isArray(overrides.scopeMismatches) ? overrides.scopeMismatches : [],
    safety: {
      readsFiles: false,
      scansRealMemory: false,
      callsProviders: false,
      writesDurableMemory: false,
      writesAudit: false,
      expandsPublicMcp: false,
      readinessClaimed: false
    }
  };
}

function validateLifecycleAction(candidate, exactApproval) {
  const blockers = [];

  if (!LIFECYCLE_ACTIONS_REQUIRING_APPROVAL.includes(candidate.lifecycleAction)) {
    return blockers;
  }

  if (!exactApproval) {
    blockers.push('lifecycle_action_requires_exact_approval');
  }

  if (!candidate.reason) {
    blockers.push('lifecycle_action_requires_reason');
  }

  if (candidate.lifecycleAction === 'supersede' && !candidate.supersedesMemoryId) {
    blockers.push('supersession_requires_old_memory_id');
  }

  if (candidate.lifecycleAction === 'tombstone' && !candidate.tombstoneMemoryId) {
    blockers.push('tombstone_requires_memory_id');
  }

  if (candidate.lifecycleAction === 'forget' && !candidate.forgetMemoryId) {
    blockers.push('forget_requires_memory_id');
  }

  return blockers;
}

function summarizeMemoryWriteLifecycleDedupSuppressionPreflight(input = {}) {
  if (!isPlainObject(input) || !isPlainObject(input.proposedWrite)) {
    return buildResult({
      decision: 'rejected_malformed_input',
      blockers: ['proposed_write_required']
    });
  }

  const proposed = normalizeWriteCandidate(input.proposedWrite);
  const allowedScope = normalizeScope(input.allowedScope);
  const exactApproval = normalizeBoolean(input.exactApproval);
  const existingCandidates = Array.isArray(input.existingCandidates)
    ? input.existingCandidates.map(normalizeExistingCandidate)
    : [];
  const canonicalHash = computeCanonicalWriteHash(input.proposedWrite);
  const blockers = [];

  if (proposed.target !== 'process' && proposed.target !== 'knowledge') {
    blockers.push('target_must_be_process_or_knowledge');
  }

  if (!proposed.title || !proposed.content || !proposed.evidence) {
    blockers.push('title_content_evidence_required');
  }

  if (findSchemaVersionMetadataKeys(input.proposedWrite).length > 0) {
    blockers.push('schema_version_metadata_rejected');
  }

  const secretScan = scanMemoryWritePayload({
    ...input.proposedWrite,
    title: proposed.title,
    content: proposed.content,
    evidence: proposed.evidence,
    tags: proposed.tags
  });
  if (!secretScan.ok) {
    blockers.push(`pollution_rejected:${formatSecretRejectionReason(secretScan)}`);
  }

  const mismatches = scopeMismatches(proposed.scope, allowedScope);
  if (mismatches.length > 0) {
    blockers.push('scope_mismatch_rejected');
  }

  if (TERMINAL_LIFECYCLE_STATUSES.includes(proposed.lifecycleStatus)) {
    blockers.push('terminal_lifecycle_status_cannot_be_written_as_active_memory');
  }

  blockers.push(...validateLifecycleAction(proposed, exactApproval));

  const exactDuplicateMatches = existingCandidates.filter(candidate =>
    candidate.canonicalHash === canonicalHash &&
    scopesMatch(candidate.scope, proposed.scope)
  );
  if (exactDuplicateMatches.some(candidate => candidate.lifecycleStatus === 'active')) {
    blockers.push('duplicate_active_memory_suppressed');
  }
  if (exactDuplicateMatches.some(candidate => TERMINAL_LIFECYCLE_STATUSES.includes(candidate.lifecycleStatus))) {
    blockers.push('duplicate_terminal_lifecycle_memory_requires_review');
  }

  if (blockers.length > 0) {
    let decision = 'rejected_by_write_lifecycle_preflight';
    if (blockers.includes('scope_mismatch_rejected')) decision = 'scope_mismatch_rejected';
    if (blockers.some(blocker => blocker.startsWith('pollution_rejected:'))) decision = 'pollution_rejected';
    if (blockers.includes('duplicate_active_memory_suppressed')) decision = 'duplicate_suppressed';
    if (blockers.includes('lifecycle_action_requires_exact_approval')) decision = 'exact_approval_required';

    return buildResult({
      decision,
      canonicalHash,
      blockers,
      matchedCandidateIds: exactDuplicateMatches.map(candidate => candidate.memoryId).filter(Boolean),
      scopeMismatches: mismatches
    });
  }

  return buildResult({
    decision: 'accepted_for_bounded_write_preflight',
    acceptedForWritePreflight: true,
    canonicalHash
  });
}

module.exports = {
  LIFECYCLE_ACTIONS_REQUIRING_APPROVAL,
  SCHEMA_VERSION,
  SCOPE_FIELDS,
  TERMINAL_LIFECYCLE_STATUSES,
  computeCanonicalWriteHash,
  summarizeMemoryWriteLifecycleDedupSuppressionPreflight
};
