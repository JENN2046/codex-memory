const SCHEMA_VERSION = 'memory-lifecycle-scope-governance-contract-v1';

const SCOPE_FIELDS = Object.freeze([
  'userId',
  'projectId',
  'workspaceId',
  'clientId',
  'agentId',
  'taskId',
  'conversationId',
  'folder',
  'visibility',
  'retentionPolicy'
]);

const EXCLUDED_LIFECYCLE_STATUSES = Object.freeze([
  'rejected',
  'preflight_rejected',
  'proposal',
  'superseded',
  'tombstoned',
  'forgotten',
  'excluded',
  'stale',
  'quarantined'
]);

const GOVERNANCE_ACTIONS_REQUIRING_APPROVAL = Object.freeze([
  'approve',
  'supersede',
  'tombstone',
  'forget',
  'exclude',
  'correct'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toSnakeCase(value) {
  return value.replace(/[A-Z]/g, match => `_${match.toLowerCase()}`);
}

function normalizeScope(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const scope = {};

  for (const field of SCOPE_FIELDS) {
    scope[field] = normalizeString(safeInput[field] || safeInput[toSnakeCase(field)]);
  }

  return scope;
}

function scopeMismatches(recordScope = {}, currentScope = {}) {
  return SCOPE_FIELDS
    .filter(field => normalizeString(currentScope[field]))
    .filter(field => normalizeString(recordScope[field]) !== normalizeString(currentScope[field]));
}

function normalizeScopeFields(fields = SCOPE_FIELDS) {
  if (!Array.isArray(fields)) return [...SCOPE_FIELDS];
  const allowed = new Set(SCOPE_FIELDS);
  const normalized = fields
    .map(field => normalizeString(field))
    .filter(field => allowed.has(field));
  return normalized.length > 0 ? [...new Set(normalized)] : [...SCOPE_FIELDS];
}

function missingScopeFields(scope = {}, fields = SCOPE_FIELDS) {
  return normalizeScopeFields(fields).filter(field => !normalizeString(scope[field]));
}

function normalizeLifecycleStatus(value) {
  return normalizeString(value || 'active').toLowerCase().replace(/-/g, '_');
}

function normalizeGovernanceAction(value) {
  return normalizeString(value).toLowerCase().replace(/-/g, '_');
}

function buildSafety() {
  return {
    readsFiles: false,
    scansRealMemory: false,
    readsJsonl: false,
    callsProviders: false,
    writesDurableMemory: false,
    writesAudit: false,
    appliesCleanup: false,
    appliesRollback: false,
    expandsPublicMcp: false,
    readinessClaimed: false
  };
}

function normalizeRecord(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};

  return {
    memoryId: normalizeString(safeInput.memoryId || safeInput.memory_id),
    lifecycleStatus: normalizeLifecycleStatus(safeInput.lifecycleStatus || safeInput.lifecycle_status),
    scope: normalizeScope(safeInput.scope || safeInput),
    unresolvedRemediation: safeInput.unresolvedRemediation === true ||
      safeInput.unresolved_remediation === true,
    malformedLifecycle: safeInput.malformedLifecycle === true ||
      safeInput.malformed_lifecycle === true,
    malformedScope: safeInput.malformedScope === true ||
      safeInput.malformed_scope === true
  };
}

function evaluateRecallEligibility(recordInput = {}, currentScopeInput = {}, options = {}) {
  const record = normalizeRecord(recordInput);
  const currentScope = normalizeScope(currentScopeInput);
  const requiredScopeFields = normalizeScopeFields(options.requiredScopeFields);
  const blockers = [];
  const mismatches = scopeMismatches(record.scope, currentScope);

  if (!record.memoryId) {
    blockers.push('memory_id_required');
  }

  if (EXCLUDED_LIFECYCLE_STATUSES.includes(record.lifecycleStatus)) {
    blockers.push(`lifecycle_${record.lifecycleStatus}_excluded_from_normal_recall`);
  }

  if (record.unresolvedRemediation) {
    blockers.push('unresolved_bad_write_remediation_excluded');
  }

  if (record.malformedLifecycle) {
    blockers.push('malformed_lifecycle_metadata_excluded');
  }

  if (record.malformedScope) {
    blockers.push('malformed_scope_metadata_excluded');
  }

  if (mismatches.length > 0) {
    blockers.push('scope_mismatch_excluded');
  }

  const missingCurrentScope = missingScopeFields(currentScope, requiredScopeFields);
  if (missingCurrentScope.length > 0) {
    blockers.push('current_scope_incomplete_fail_closed');
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    sourceMode: 'explicit_fixture_input',
    memoryId: record.memoryId || null,
    lifecycleStatus: record.lifecycleStatus,
    normalRecallEligible: blockers.length === 0,
    decision: blockers.length === 0 ? 'included_for_normal_recall' : 'excluded_from_normal_recall',
    blockers,
    scopeMismatches: mismatches,
    requiredScopeFields,
    safety: buildSafety()
  };
}

function evaluateGovernanceTransition(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const action = normalizeGovernanceAction(safeInput.action);
  const exactApproval = safeInput.exactApproval === true;
  const targetMemoryId = normalizeString(safeInput.targetMemoryId || safeInput.target_memory_id);
  const replacementMemoryId = normalizeString(safeInput.replacementMemoryId || safeInput.replacement_memory_id);
  const reason = normalizeString(safeInput.reason);
  const actorId = normalizeString(safeInput.actorId || safeInput.actor_id);
  const approvedAt = normalizeString(safeInput.approvedAt || safeInput.approved_at);
  const scope = normalizeScope(safeInput.scope);
  const blockers = [];

  if (!GOVERNANCE_ACTIONS_REQUIRING_APPROVAL.includes(action)) {
    blockers.push('unsupported_governance_action');
  }

  if (!exactApproval) {
    blockers.push('governance_action_requires_exact_approval');
  }

  if (!targetMemoryId) {
    blockers.push('target_memory_id_required');
  }

  if (!reason) {
    blockers.push('reason_required');
  }

  if (!actorId) {
    blockers.push('actor_id_required');
  }

  if (!approvedAt) {
    blockers.push('approved_at_required');
  }

  if (missingScopeFields(scope).length > 0) {
    blockers.push('exact_scope_required');
  }

  if (action === 'supersede' && !replacementMemoryId) {
    blockers.push('replacement_memory_id_required_for_supersession');
  }

  if (action === 'physical_delete' || action === 'cleanup_apply' || action === 'rollback_apply') {
    blockers.push('physical_cleanup_or_rollback_apply_hard_stop');
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    sourceMode: 'explicit_fixture_input',
    action: action || null,
    targetMemoryId: targetMemoryId || null,
    acceptedForGovernanceFixture: blockers.length === 0,
    decision: blockers.length === 0
      ? 'accepted_for_append_only_governance_fixture'
      : 'rejected_by_lifecycle_scope_governance_contract',
    blockers,
    appendOnly: blockers.length === 0,
    destructiveCleanupAllowed: false,
    durableMutationExecuted: false,
    publicMcpExpanded: false,
    safety: buildSafety()
  };
}

function sanitizeSuppressedCandidate(candidate = {}, eligibility = {}) {
  const safeCandidate = isPlainObject(candidate) ? candidate : {};

  return {
    memoryId: normalizeString(safeCandidate.memoryId || safeCandidate.memory_id) || null,
    lifecycleStatus: eligibility.lifecycleStatus || normalizeLifecycleStatus(safeCandidate.lifecycleStatus),
    decision: eligibility.decision || 'excluded_from_normal_recall',
    blockers: Array.isArray(eligibility.blockers) ? eligibility.blockers : [],
    scopeMismatches: Array.isArray(eligibility.scopeMismatches) ? eligibility.scopeMismatches : []
  };
}

function filterRecallCandidatesByLifecycleScope(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const currentScope = normalizeScope(safeInput.currentScope);
  const candidates = Array.isArray(safeInput.candidates) ? safeInput.candidates : [];
  const requiredScopeFields = normalizeScopeFields(safeInput.requiredScopeFields);
  const acceptedCandidates = [];
  const suppressedCandidates = [];

  for (const candidate of candidates) {
    const eligibility = evaluateRecallEligibility(candidate, currentScope, { requiredScopeFields });

    if (eligibility.normalRecallEligible) {
      acceptedCandidates.push({
        memoryId: eligibility.memoryId,
        lifecycleStatus: eligibility.lifecycleStatus,
        rankHint: normalizeString(candidate.rankHint || candidate.rank_hint),
        scope: normalizeScope(candidate.scope || candidate)
      });
    } else {
      suppressedCandidates.push(sanitizeSuppressedCandidate(candidate, eligibility));
    }
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    sourceMode: 'explicit_fixture_input',
    readPolicyMode: 'normal_recall',
    requiredScopeFields,
    acceptedCount: acceptedCandidates.length,
    suppressedCount: suppressedCandidates.length,
    acceptedCandidates,
    suppressedCandidates,
    sanitizedAuditMetadata: suppressedCandidates,
    rawContentExposed: false,
    durableMutationExecuted: false,
    publicMcpExpanded: false,
    safety: buildSafety()
  };
}

module.exports = {
  EXCLUDED_LIFECYCLE_STATUSES,
  GOVERNANCE_ACTIONS_REQUIRING_APPROVAL,
  SCHEMA_VERSION,
  SCOPE_FIELDS,
  evaluateGovernanceTransition,
  filterRecallCandidatesByLifecycleScope,
  evaluateRecallEligibility,
  normalizeScopeFields
};
