const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'p66-validation-aggregator-baseline-binding-proof-v1';
const EXPECTED_POLICY_VERSION = 'p66-validation-aggregator-baseline-binding-proof-policy-v1';
const EXPECTED_MANIFEST_VERSION = 'p66-validation-aggregator-baseline-binding-proof-manifest-v1';

const PUBLIC_MCP_TOOLS = Object.freeze([
  'record_memory',
  'search_memory',
  'memory_overview',
  'audit_memory'
]);

const BASELINE_KINDS = Object.freeze([
  'rc_target_commit',
  'local_validation_target_commit',
  'temporary_gate_execution_checkout',
  'docs_only_approval_state'
]);

const REQUIRED_BASELINE_BINDING_FIELDS = Object.freeze([
  'evidence_id',
  'baseline_binding_id',
  'target_commit',
  'target_commit_source',
  'baseline_kind',
  'baseline_ref',
  'evidence_subject_commit',
  'validation_scope',
  'binding_observed_at',
  'binding_status'
]);

const REQUIRED_FAIL_CLOSED_REASONS = Object.freeze([
  'malformed_input',
  'schema_version_mismatch',
  'policy_version_mismatch',
  'manifest_version_mismatch',
  'public_mcp_tools_drift',
  'missing_expected_target_commit',
  'missing_baseline_binding',
  'missing_required_baseline_field',
  'duplicate_baseline_binding_id',
  'missing_target_commit',
  'missing_evidence_subject_commit',
  'missing_baseline_kind',
  'target_commit_mismatch',
  'approval_request_commit_used_as_target_without_explicit_binding',
  'current_main_head_used_as_target_without_explicit_binding',
  'execution_checkout_commit_missing_for_gate_execution',
  'execution_checkout_commit_mismatch',
  'ambiguous_baseline_role',
  'unknown_baseline_kind',
  'malformed_commit_hash',
  'non_utc_binding_timestamp',
  'binding_status_not_bound',
  'unsafe_summary_claim',
  'unsafe_no_touch_boundary',
  'readiness_overclaim'
]);

const COMMIT_HASH_PATTERN = /^[a-f0-9]{7,40}$/;
const ISO_UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneArray(values) {
  return Array.isArray(values) ? [...values] : [];
}

function normalizeString(value) {
  return typeof value === 'string' ? redactSensitiveFragments(value.trim()) : '';
}

function normalizeStringArray(values) {
  return cloneArray(values).map(normalizeString).filter(Boolean);
}

function normalizeBoolean(value) {
  return value === true;
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function collectDuplicateValues(values) {
  return uniqueValues(values).filter(value => values.filter(candidate => candidate === value).length > 1);
}

function hasExactSet(values, expectedValues) {
  return values.length === expectedValues.length &&
    uniqueValues(values).length === values.length &&
    expectedValues.every(value => values.includes(value));
}

function normalizeBaselineBinding(binding = {}) {
  const safeBinding = isPlainObject(binding) ? binding : {};

  return {
    evidence_id: normalizeString(safeBinding.evidence_id),
    baseline_binding_id: normalizeString(safeBinding.baseline_binding_id),
    target_commit: normalizeString(safeBinding.target_commit),
    target_commit_source: normalizeString(safeBinding.target_commit_source),
    baseline_kind: normalizeString(safeBinding.baseline_kind),
    baseline_ref: normalizeString(safeBinding.baseline_ref),
    evidence_subject_commit: normalizeString(safeBinding.evidence_subject_commit),
    validation_scope: normalizeString(safeBinding.validation_scope),
    binding_observed_at: normalizeString(safeBinding.binding_observed_at),
    binding_status: normalizeString(safeBinding.binding_status),
    approval_request_commit: normalizeString(safeBinding.approval_request_commit),
    current_main_head: normalizeString(safeBinding.current_main_head),
    execution_checkout_commit: normalizeString(safeBinding.execution_checkout_commit)
  };
}

function normalizeSafety(safety = {}) {
  const safeSafety = isPlainObject(safety) ? safety : {};

  return {
    readsFiles: normalizeBoolean(safeSafety.readsFiles),
    scansDirectories: normalizeBoolean(safeSafety.scansDirectories),
    executesCommands: normalizeBoolean(safeSafety.executesCommands),
    gitCheckout: normalizeBoolean(safeSafety.gitCheckout),
    gitReset: normalizeBoolean(safeSafety.gitReset),
    gitDetachHead: normalizeBoolean(safeSafety.gitDetachHead),
    gitRemoteLookup: normalizeBoolean(safeSafety.gitRemoteLookup),
    startsServices: normalizeBoolean(safeSafety.startsServices),
    callsProviders: normalizeBoolean(safeSafety.callsProviders),
    readsRealMemory: normalizeBoolean(safeSafety.readsRealMemory),
    scansRuntimeStores: normalizeBoolean(safeSafety.scansRuntimeStores),
    writesDurableState: normalizeBoolean(safeSafety.writesDurableState),
    expandsPublicMcp: normalizeBoolean(safeSafety.expandsPublicMcp),
    remoteWrites: normalizeBoolean(safeSafety.remoteWrites),
    rawSensitiveOutputExposed: normalizeBoolean(safeSafety.rawSensitiveOutputExposed)
  };
}

function normalizeReadiness(readiness = {}) {
  const safeReadiness = isPlainObject(readiness) ? readiness : {};

  return {
    baselineBindingProofReady: normalizeBoolean(safeReadiness.baselineBindingProofReady),
    validationAggregatorFullImplementationReady: normalizeBoolean(safeReadiness.validationAggregatorFullImplementationReady),
    runtimeReady: normalizeBoolean(safeReadiness.runtimeReady),
    finalRcMatrixReady: normalizeBoolean(safeReadiness.finalRcMatrixReady),
    v1RcReady: normalizeBoolean(safeReadiness.v1RcReady),
    rcReady: normalizeBoolean(safeReadiness.rcReady)
  };
}

function normalizeValidationAggregatorBaselineBindingProofInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};

  return {
    schemaVersion: normalizeString(safeInput.schemaVersion),
    policyVersion: normalizeString(safeInput.policyVersion),
    manifestVersion: normalizeString(safeInput.manifestVersion),
    explicitInputOnly: normalizeBoolean(safeInput.explicitInputOnly),
    sourceMode: normalizeString(safeInput.sourceMode),
    status: normalizeString(safeInput.status),
    decision: normalizeString(safeInput.decision),
    expectedTargetCommit: normalizeString(safeInput.expectedTargetCommit),
    validationAggregatorFullImplementation: normalizeBoolean(safeInput.validationAggregatorFullImplementation),
    publicMcpTools: normalizeStringArray(safeInput.publicMcpTools),
    baselineBindings: cloneArray(safeInput.baselineBindings).map(normalizeBaselineBinding),
    lowRiskSummary: isPlainObject(safeInput.lowRiskSummary)
      ? {
          rawWorkspaceIdExposed: normalizeBoolean(safeInput.lowRiskSummary.rawWorkspaceIdExposed),
          rawSecretExposed: normalizeBoolean(safeInput.lowRiskSummary.rawSecretExposed)
        }
      : {
          rawWorkspaceIdExposed: false,
          rawSecretExposed: false
        },
    safety: normalizeSafety(safeInput.safety),
    readiness: normalizeReadiness(safeInput.readiness)
  };
}

function evaluateBaselineBinding(binding, expectedTargetCommit) {
  const failClosedReasons = [];
  const missingFields = REQUIRED_BASELINE_BINDING_FIELDS.filter(field => !binding[field]);

  if (missingFields.length > 0) failClosedReasons.push('missing_required_baseline_field');
  if (!binding.target_commit) failClosedReasons.push('missing_target_commit');
  if (!binding.evidence_subject_commit) failClosedReasons.push('missing_evidence_subject_commit');
  if (!binding.baseline_kind) failClosedReasons.push('missing_baseline_kind');
  if (binding.target_commit && !COMMIT_HASH_PATTERN.test(binding.target_commit)) {
    failClosedReasons.push('malformed_commit_hash');
  }
  if (binding.evidence_subject_commit && !COMMIT_HASH_PATTERN.test(binding.evidence_subject_commit)) {
    failClosedReasons.push('malformed_commit_hash');
  }
  if (binding.target_commit && binding.evidence_subject_commit && binding.target_commit !== binding.evidence_subject_commit) {
    failClosedReasons.push('target_commit_mismatch');
  }
  if (binding.target_commit && expectedTargetCommit && binding.target_commit !== expectedTargetCommit) {
    failClosedReasons.push('target_commit_mismatch');
  }
  if (binding.target_commit_source === 'approval_request_commit') {
    failClosedReasons.push('approval_request_commit_used_as_target_without_explicit_binding');
  }
  if (binding.target_commit_source === 'current_main_head') {
    failClosedReasons.push('current_main_head_used_as_target_without_explicit_binding');
  }
  if (binding.baseline_kind && !BASELINE_KINDS.includes(binding.baseline_kind)) {
    failClosedReasons.push('unknown_baseline_kind');
  }
  if (binding.baseline_kind === 'temporary_gate_execution_checkout' && !binding.execution_checkout_commit) {
    failClosedReasons.push('execution_checkout_commit_missing_for_gate_execution');
  }
  if (
    binding.baseline_kind === 'temporary_gate_execution_checkout' &&
    binding.execution_checkout_commit &&
    binding.target_commit &&
    binding.execution_checkout_commit !== binding.target_commit
  ) {
    failClosedReasons.push('execution_checkout_commit_mismatch');
  }
  if (binding.execution_checkout_commit && !COMMIT_HASH_PATTERN.test(binding.execution_checkout_commit)) {
    failClosedReasons.push('malformed_commit_hash');
  }
  if (binding.approval_request_commit && !COMMIT_HASH_PATTERN.test(binding.approval_request_commit)) {
    failClosedReasons.push('malformed_commit_hash');
  }
  if (binding.current_main_head && !COMMIT_HASH_PATTERN.test(binding.current_main_head)) {
    failClosedReasons.push('malformed_commit_hash');
  }
  if (binding.target_commit_source === 'ambiguous') {
    failClosedReasons.push('ambiguous_baseline_role');
  }
  if (binding.binding_observed_at && !ISO_UTC_TIMESTAMP.test(binding.binding_observed_at)) {
    failClosedReasons.push('non_utc_binding_timestamp');
  }
  if (binding.binding_status && binding.binding_status !== 'bound') {
    failClosedReasons.push('binding_status_not_bound');
  }

  return {
    id: binding.baseline_binding_id,
    evidenceId: binding.evidence_id,
    baselineKind: binding.baseline_kind,
    bindingStatus: binding.binding_status,
    targetCommitShort: binding.target_commit.slice(0, 12),
    missingFields,
    failClosedReasons
  };
}

function evaluateValidationAggregatorBaselineBindingProof(input = {}) {
  const normalized = normalizeValidationAggregatorBaselineBindingProofInput(input);
  const bindingIds = normalized.baselineBindings.map(binding => binding.baseline_binding_id).filter(Boolean);
  const duplicateBindingIds = collectDuplicateValues(bindingIds);
  const failClosedReasons = [];

  if (!isPlainObject(input)) failClosedReasons.push('malformed_input');
  if (normalized.schemaVersion !== EXPECTED_SCHEMA_VERSION) failClosedReasons.push('schema_version_mismatch');
  if (normalized.policyVersion !== EXPECTED_POLICY_VERSION) failClosedReasons.push('policy_version_mismatch');
  if (normalized.manifestVersion !== EXPECTED_MANIFEST_VERSION) failClosedReasons.push('manifest_version_mismatch');
  if (!hasExactSet(normalized.publicMcpTools, PUBLIC_MCP_TOOLS)) failClosedReasons.push('public_mcp_tools_drift');
  if (!normalized.expectedTargetCommit) failClosedReasons.push('missing_expected_target_commit');
  if (normalized.baselineBindings.length === 0) failClosedReasons.push('missing_baseline_binding');
  if (duplicateBindingIds.length > 0) failClosedReasons.push('duplicate_baseline_binding_id');
  if (
    normalized.lowRiskSummary.rawWorkspaceIdExposed ||
    normalized.lowRiskSummary.rawSecretExposed
  ) {
    failClosedReasons.push('unsafe_summary_claim');
  }
  if (Object.values(normalized.safety).some(Boolean)) failClosedReasons.push('unsafe_no_touch_boundary');
  if (
    normalized.validationAggregatorFullImplementation ||
    normalized.readiness.validationAggregatorFullImplementationReady ||
    normalized.readiness.runtimeReady ||
    normalized.readiness.finalRcMatrixReady ||
    normalized.readiness.v1RcReady ||
    normalized.readiness.rcReady
  ) {
    failClosedReasons.push('readiness_overclaim');
  }

  const bindingSummaries = normalized.baselineBindings.map(binding =>
    evaluateBaselineBinding(binding, normalized.expectedTargetCommit)
  );

  for (const summary of bindingSummaries) {
    failClosedReasons.push(...summary.failClosedReasons);
  }

  const uniqueFailClosedReasons = uniqueValues(failClosedReasons);
  const accepted = uniqueFailClosedReasons.length === 0;

  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    sourceMode: 'explicit_input',
    status: accepted ? 'baseline_binding_proof_accepted_runtime_still_blocked' : 'blocked_fail_closed',
    decision: 'NOT_READY_BLOCKED',
    acceptedForPlanning: accepted,
    validationAggregatorFullImplementationReady: false,
    runtimeReady: false,
    finalRcMatrixReady: false,
    v1RcReady: false,
    rcReady: false,
    failClosedReasons: uniqueFailClosedReasons,
    baselineBinding: {
      count: normalized.baselineBindings.length,
      duplicateIds: duplicateBindingIds,
      requiredFields: [...REQUIRED_BASELINE_BINDING_FIELDS],
      allowedBaselineKinds: [...BASELINE_KINDS],
      summaries: bindingSummaries.map(summary => ({
        id: summary.id,
        evidenceId: summary.evidenceId,
        baselineKind: summary.baselineKind,
        bindingStatus: summary.bindingStatus,
        targetCommitShort: summary.targetCommitShort,
        missingFields: summary.missingFields
      }))
    },
    safety: {
      readsFiles: normalized.safety.readsFiles,
      executesCommands: normalized.safety.executesCommands,
      gitCheckout: normalized.safety.gitCheckout,
      gitReset: normalized.safety.gitReset,
      gitDetachHead: normalized.safety.gitDetachHead,
      gitRemoteLookup: normalized.safety.gitRemoteLookup,
      startsServices: normalized.safety.startsServices,
      callsProviders: normalized.safety.callsProviders,
      readsRealMemory: normalized.safety.readsRealMemory,
      scansRuntimeStores: normalized.safety.scansRuntimeStores,
      writesDurableState: normalized.safety.writesDurableState,
      expandsPublicMcp: normalized.safety.expandsPublicMcp,
      remoteWrites: normalized.safety.remoteWrites,
      rawSensitiveOutputExposed: normalized.safety.rawSensitiveOutputExposed
    },
    readiness: {
      baselineBindingProofReady: accepted,
      validationAggregatorFullImplementationReady: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      rcReady: false
    }
  };
}

module.exports = {
  BASELINE_KINDS,
  EXPECTED_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS,
  REQUIRED_BASELINE_BINDING_FIELDS,
  REQUIRED_FAIL_CLOSED_REASONS,
  evaluateValidationAggregatorBaselineBindingProof,
  normalizeValidationAggregatorBaselineBindingProofInput
};
