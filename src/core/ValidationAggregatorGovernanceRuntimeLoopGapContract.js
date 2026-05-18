const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'p66-validation-aggregator-governance-runtime-loop-gap-fixture-v1';
const EXPECTED_POLICY_VERSION = 'p66-validation-aggregator-governance-runtime-loop-gap-fixture-policy-v1';
const EXPECTED_MANIFEST_VERSION = 'p66-validation-aggregator-governance-runtime-loop-gap-fixture-manifest-v1';

const PUBLIC_MCP_TOOLS = Object.freeze([
  'record_memory',
  'search_memory',
  'memory_overview'
]);

const REQUIRED_STAGE_IDS = Object.freeze([
  'review_packet_intake',
  'approval_packet_evaluation',
  'audit_evidence_shape_evaluation',
  'execution_gate_evaluation',
  'durable_write_gate',
  'post_action_evidence_gate'
]);

const REQUIRED_RUNTIME_EVIDENCE_GROUPS = Object.freeze([
  'review_packet_intake_runtime_evidence',
  'approval_packet_evaluation_runtime_evidence',
  'audit_evidence_shape_runtime_evidence',
  'execution_gate_runtime_evidence',
  'durable_write_gate_runtime_evidence',
  'post_action_evidence_runtime_evidence',
  'governance_loop_no_touch_boundary_proof',
  'governance_loop_readiness_overclaim_rejection_proof'
]);

const REQUIRED_APPROVAL_STATES = Object.freeze([
  'reviewed_not_approved',
  'approval_missing',
  'approval_unknown',
  'approval_warning_only',
  'approval_expired_or_stale',
  'approval_scope_mismatch',
  'approval_without_a5_runtime_authority'
]);

const REQUIRED_FAIL_CLOSED_CASES = Object.freeze([
  'missing_loop_identity',
  'mismatched_loop_identity',
  'missing_review_packet',
  'missing_approval_packet',
  'missing_audit_refs',
  'missing_scope',
  'scope_mismatch_between_review_approval_audit_and_execution',
  'approval_missing',
  'approval_unknown',
  'approval_warning_only',
  'approval_expired_or_stale',
  'approval_without_a5_runtime_authority',
  'execution_attempt_without_authority',
  'durable_audit_write_claim',
  'durable_memory_write_claim',
  'real_packet_read_claim',
  'real_audit_log_read_claim',
  'provider_call_claim',
  'public_mcp_expansion_claim',
  'readiness_claim_without_authority'
]);

const REQUIRED_DISALLOWED_WORK = Object.freeze([
  'runtime_governance_loop',
  'governed_action_execution',
  'approval_execution',
  'durable_audit_writer',
  'durable_memory_writer',
  'real_review_packet_read',
  'real_approval_packet_read',
  'real_audit_log_read',
  'real_memory_scan',
  'runtime_store_scan',
  'command_execution',
  'gate_execution',
  'runner_execution',
  'service_start',
  'provider_call',
  'config_mutation',
  'startup_watchdog_operation',
  'migration_apply',
  'import_export_apply',
  'public_mcp_expansion',
  'validate_memory_public_exposure',
  'package_lockfile_change',
  'env_secret_change',
  'push',
  'tag',
  'release',
  'deploy',
  'rc_ready_claim',
  'cutover_ready_claim'
]);

const REQUIRED_FAIL_CLOSED_REASONS = Object.freeze([
  'malformed_input',
  'schema_version_mismatch',
  'policy_version_mismatch',
  'manifest_version_mismatch',
  'public_mcp_tools_drift',
  'selected_gap_drift',
  'evidence_group_drift',
  'identity_contract_drift',
  'scope_contract_drift',
  'authority_contract_drift',
  'audit_ref_contract_drift',
  'missing_required_stage',
  'duplicate_stage',
  'unknown_stage',
  'stage_allows_execution',
  'missing_required_runtime_evidence_group',
  'duplicate_runtime_evidence_group',
  'unknown_runtime_evidence_group',
  'runtime_evidence_group_not_missing',
  'missing_required_approval_state',
  'duplicate_approval_state',
  'unknown_approval_state',
  'approval_state_allows_execution',
  'missing_required_fail_closed_case',
  'duplicate_fail_closed_case',
  'unknown_fail_closed_case',
  'disallowed_work_drift',
  'unsafe_low_risk_summary',
  'unsafe_safety_flag',
  'sensitive_fragment_rejected',
  'readiness_overclaim'
]);

const SENSITIVE_FRAGMENT_PATTERN = /(\bBearer\s+[A-Za-z0-9._-]+|(^|[^A-Za-z])sk-[A-Za-z0-9_-]{12,}|api[_-]?key\s*[:=]|password\s*[:=]|token\s*[:=]|set-cookie|authorization\s*:|workspace-[A-Za-z0-9_-]{8,}|https?:\/\/|[A-Z]:[\\/])/i;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? redactSensitiveFragments(value.trim()) : '';
}

function normalizeBoolean(value) {
  return value === true;
}

function normalizeStringArray(values) {
  return Array.isArray(values)
    ? values.map(normalizeString).filter(Boolean)
    : [];
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();

  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }

  return [...duplicates];
}

function hasExactSet(values, expectedValues) {
  return values.length === expectedValues.length &&
    findDuplicates(values).length === 0 &&
    expectedValues.every(value => values.includes(value));
}

function includesSensitiveFragment(value) {
  if (typeof value === 'string') return SENSITIVE_FRAGMENT_PATTERN.test(value);
  if (Array.isArray(value)) return value.some(includesSensitiveFragment);
  if (!isPlainObject(value)) return false;

  return Object.values(value).some(includesSensitiveFragment);
}

function normalizeSelectedGap(selectedGap = {}) {
  const safeGap = isPlainObject(selectedGap) ? selectedGap : {};

  return {
    id: normalizeString(safeGap.id),
    priority: Number.isFinite(safeGap.priority) ? safeGap.priority : 0,
    currentStatus: normalizeString(safeGap.currentStatus),
    remainsOpenAfterThisPhase: normalizeBoolean(safeGap.remainsOpenAfterThisPhase),
    readinessAuthority: normalizeBoolean(safeGap.readinessAuthority),
    requiresA5ApprovalBeforeRuntime: normalizeBoolean(safeGap.requiresA5ApprovalBeforeRuntime)
  };
}

function normalizeEvidenceGroup(evidenceGroup = {}) {
  const safeGroup = isPlainObject(evidenceGroup) ? evidenceGroup : {};

  return {
    id: normalizeString(safeGroup.id),
    currentStatus: normalizeString(safeGroup.currentStatus),
    required: normalizeBoolean(safeGroup.required),
    remainsNonRuntime: normalizeBoolean(safeGroup.remainsNonRuntime),
    readinessAuthority: normalizeBoolean(safeGroup.readinessAuthority),
    mustFailClosedWhenMissing: normalizeBoolean(safeGroup.mustFailClosedWhenMissing),
    mustFailClosedWhenScopeMismatch: normalizeBoolean(safeGroup.mustFailClosedWhenScopeMismatch),
    mustFailClosedWhenApprovalMissing: normalizeBoolean(safeGroup.mustFailClosedWhenApprovalMissing),
    mustFailClosedWhenAuditRefsMissing: normalizeBoolean(safeGroup.mustFailClosedWhenAuditRefsMissing),
    mustFailClosedWhenDurableWriteClaimed: normalizeBoolean(safeGroup.mustFailClosedWhenDurableWriteClaimed),
    mustFailClosedWhenRuntimeReadyClaimed: normalizeBoolean(safeGroup.mustFailClosedWhenRuntimeReadyClaimed)
  };
}

function normalizeLoopIdentityContract(loopIdentityContract = {}) {
  const safeContract = isPlainObject(loopIdentityContract) ? loopIdentityContract : {};

  return {
    loop_id: normalizeString(safeContract.loop_id),
    action_id: normalizeString(safeContract.action_id),
    review_packet_id: normalizeString(safeContract.review_packet_id),
    approval_packet_id: normalizeString(safeContract.approval_packet_id),
    pre_action_audit_event_id: normalizeString(safeContract.pre_action_audit_event_id),
    decision_audit_event_id: normalizeString(safeContract.decision_audit_event_id),
    post_action_audit_event_id: normalizeString(safeContract.post_action_audit_event_id),
    correlation_id: normalizeString(safeContract.correlation_id),
    allRequired: normalizeBoolean(safeContract.allRequired),
    mustRemainStableAcrossStages: normalizeBoolean(safeContract.mustRemainStableAcrossStages),
    mustFailClosedWhenMissingOrMismatched:
      normalizeBoolean(safeContract.mustFailClosedWhenMissingOrMismatched)
  };
}

function normalizeScopeContract(scopeContract = {}) {
  const safeContract = isPlainObject(scopeContract) ? scopeContract : {};

  return {
    project_ref: normalizeString(safeContract.project_ref),
    workspace_ref: normalizeString(safeContract.workspace_ref),
    client_ref: normalizeString(safeContract.client_ref),
    agent_ref: normalizeString(safeContract.agent_ref),
    task_ref: normalizeString(safeContract.task_ref),
    visibility: normalizeString(safeContract.visibility),
    scopeMustMatchAcrossReviewApprovalAuditAndExecution:
      normalizeBoolean(safeContract.scopeMustMatchAcrossReviewApprovalAuditAndExecution),
    rawWorkspaceIdExposedInLowRiskSummary:
      normalizeBoolean(safeContract.rawWorkspaceIdExposedInLowRiskSummary),
    mustFailClosedWhenScopeMissingOrMismatched:
      normalizeBoolean(safeContract.mustFailClosedWhenScopeMissingOrMismatched)
  };
}

function normalizeAuthorityContract(authorityContract = {}) {
  const safeContract = isPlainObject(authorityContract) ? authorityContract : {};

  return {
    approvalRequired: normalizeBoolean(safeContract.approvalRequired),
    approvalCurrentlyGranted: normalizeBoolean(safeContract.approvalCurrentlyGranted),
    approvalStatus: normalizeString(safeContract.approvalStatus),
    a5ApprovalRequiredBeforeRuntime: normalizeBoolean(safeContract.a5ApprovalRequiredBeforeRuntime),
    approvalMustNameActionId: normalizeBoolean(safeContract.approvalMustNameActionId),
    approvalMustMatchScope: normalizeBoolean(safeContract.approvalMustMatchScope),
    approvalMustNameDurableWriteIntent: normalizeBoolean(safeContract.approvalMustNameDurableWriteIntent),
    warningOnlyApprovalAllowed: normalizeBoolean(safeContract.warningOnlyApprovalAllowed),
    staleApprovalAllowed: normalizeBoolean(safeContract.staleApprovalAllowed),
    executionAllowedByFixture: normalizeBoolean(safeContract.executionAllowedByFixture)
  };
}

function normalizeAuditRefContract(auditRefContract = {}) {
  const safeContract = isPlainObject(auditRefContract) ? auditRefContract : {};

  return {
    preActionAuditRefRequired: normalizeBoolean(safeContract.preActionAuditRefRequired),
    decisionAuditRefRequired: normalizeBoolean(safeContract.decisionAuditRefRequired),
    postActionAuditRefRequired: normalizeBoolean(safeContract.postActionAuditRefRequired),
    auditRefsMustPreserveEventIdentity:
      normalizeBoolean(safeContract.auditRefsMustPreserveEventIdentity),
    durableAuditWriteAllowedInFixture:
      normalizeBoolean(safeContract.durableAuditWriteAllowedInFixture),
    rawAuditPayloadAllowedInLowRiskSummary:
      normalizeBoolean(safeContract.rawAuditPayloadAllowedInLowRiskSummary),
    mustFailClosedWhenAuditRefsMissingOrMismatched:
      normalizeBoolean(safeContract.mustFailClosedWhenAuditRefsMissingOrMismatched)
  };
}

function normalizeStageAcceptanceCases(values) {
  if (!Array.isArray(values)) return [];

  return values
    .filter(isPlainObject)
    .map(item => ({
      id: normalizeString(item.id),
      required: normalizeBoolean(item.required),
      inputMode: normalizeString(item.inputMode),
      expectedStatus: normalizeString(item.expectedStatus),
      canExecute: normalizeBoolean(item.canExecute),
      requiresA5Approval: normalizeBoolean(item.requiresA5Approval),
      durableWriteAllowed: normalizeBoolean(item.durableWriteAllowed)
    }));
}

function normalizeRuntimeEvidenceGroups(values) {
  if (!Array.isArray(values)) return [];

  return values
    .filter(isPlainObject)
    .map(item => ({
      id: normalizeString(item.id),
      required: normalizeBoolean(item.required),
      currentStatus: normalizeString(item.currentStatus),
      mustFailClosedWhenMissing: normalizeBoolean(item.mustFailClosedWhenMissing)
    }));
}

function normalizeApprovalStates(values) {
  if (!Array.isArray(values)) return [];

  return values
    .filter(isPlainObject)
    .map(item => ({
      id: normalizeString(item.id),
      acceptedForPlanning: normalizeBoolean(item.acceptedForPlanning),
      executionAllowed: normalizeBoolean(item.executionAllowed)
    }));
}

function normalizeLowRiskSummary(lowRiskSummary = {}) {
  const safeSummary = isPlainObject(lowRiskSummary) ? lowRiskSummary : {};

  return {
    rawWorkspaceIdExposed: normalizeBoolean(safeSummary.rawWorkspaceIdExposed),
    rawSecretExposed: normalizeBoolean(safeSummary.rawSecretExposed),
    rawGovernancePayloadExposed: normalizeBoolean(safeSummary.rawGovernancePayloadExposed)
  };
}

function normalizeSafety(safety = {}) {
  const safeSafety = isPlainObject(safety) ? safety : {};

  return {
    noRuntimeImplementation: normalizeBoolean(safeSafety.noRuntimeImplementation),
    noGovernanceLoopExecution: normalizeBoolean(safeSafety.noGovernanceLoopExecution),
    noGovernedActionExecution: normalizeBoolean(safeSafety.noGovernedActionExecution),
    noApprovalExecution: normalizeBoolean(safeSafety.noApprovalExecution),
    noCommandExecution: normalizeBoolean(safeSafety.noCommandExecution),
    noGateExecution: normalizeBoolean(safeSafety.noGateExecution),
    noRunnerExecution: normalizeBoolean(safeSafety.noRunnerExecution),
    noServiceStart: normalizeBoolean(safeSafety.noServiceStart),
    noProviderCall: normalizeBoolean(safeSafety.noProviderCall),
    noConfigMutation: normalizeBoolean(safeSafety.noConfigMutation),
    noStartupWatchdogOperation: normalizeBoolean(safeSafety.noStartupWatchdogOperation),
    noRealMemoryPreview: normalizeBoolean(safeSafety.noRealMemoryPreview),
    noRealGovernancePacketRead: normalizeBoolean(safeSafety.noRealGovernancePacketRead),
    noRealAuditLogRead: normalizeBoolean(safeSafety.noRealAuditLogRead),
    noRuntimeStoreScan: normalizeBoolean(safeSafety.noRuntimeStoreScan),
    noDurableMemoryWrite: normalizeBoolean(safeSafety.noDurableMemoryWrite),
    noDurableAuditWrite: normalizeBoolean(safeSafety.noDurableAuditWrite),
    noMigrationApply: normalizeBoolean(safeSafety.noMigrationApply),
    noImportExportApply: normalizeBoolean(safeSafety.noImportExportApply),
    noPublicMcpExpansion: normalizeBoolean(safeSafety.noPublicMcpExpansion),
    noPackageChange: normalizeBoolean(safeSafety.noPackageChange),
    noSecretChange: normalizeBoolean(safeSafety.noSecretChange),
    noRemoteWrite: normalizeBoolean(safeSafety.noRemoteWrite),
    noTagReleaseDeploy: normalizeBoolean(safeSafety.noTagReleaseDeploy)
  };
}

function normalizeReadiness(readiness = {}) {
  const safeReadiness = isPlainObject(readiness) ? readiness : {};

  return {
    validationAggregatorFullImplementationReady:
      normalizeBoolean(safeReadiness.validationAggregatorFullImplementationReady),
    governanceRuntimeLoopReady: normalizeBoolean(safeReadiness.governanceRuntimeLoopReady),
    governanceRuntimeLoopExecuted: normalizeBoolean(safeReadiness.governanceRuntimeLoopExecuted),
    approvalExecutionReady: normalizeBoolean(safeReadiness.approvalExecutionReady),
    auditWriterReady: normalizeBoolean(safeReadiness.auditWriterReady),
    durableWriteReady: normalizeBoolean(safeReadiness.durableWriteReady),
    runtimeReady: normalizeBoolean(safeReadiness.runtimeReady),
    finalRcMatrixReady: normalizeBoolean(safeReadiness.finalRcMatrixReady),
    v1RcReady: normalizeBoolean(safeReadiness.v1RcReady),
    rcReady: normalizeBoolean(safeReadiness.rcReady),
    cutoverReady: normalizeBoolean(safeReadiness.cutoverReady)
  };
}

function normalizeValidationAggregatorGovernanceRuntimeLoopGapInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};

  return {
    schemaVersion: normalizeString(safeInput.schemaVersion),
    policyVersion: normalizeString(safeInput.policyVersion),
    manifestVersion: normalizeString(safeInput.manifestVersion),
    sourceMode: normalizeString(safeInput.sourceMode),
    status: normalizeString(safeInput.status),
    decision: normalizeString(safeInput.decision),
    selectedGap: normalizeSelectedGap(safeInput.selectedGap),
    evidenceGroup: normalizeEvidenceGroup(safeInput.evidenceGroup),
    publicMcpTools: normalizeStringArray(safeInput.publicMcpTools),
    loopIdentityContract: normalizeLoopIdentityContract(safeInput.loopIdentityContract),
    scopeContract: normalizeScopeContract(safeInput.scopeContract),
    authorityContract: normalizeAuthorityContract(safeInput.authorityContract),
    auditRefContract: normalizeAuditRefContract(safeInput.auditRefContract),
    stageAcceptanceCases: normalizeStageAcceptanceCases(safeInput.stageAcceptanceCases),
    requiredRuntimeEvidenceGroups:
      normalizeRuntimeEvidenceGroups(safeInput.requiredRuntimeEvidenceGroups),
    approvalStates: normalizeApprovalStates(safeInput.approvalStates),
    failClosedCases: normalizeStringArray(safeInput.failClosedCases),
    disallowedWork: normalizeStringArray(safeInput.disallowedWork),
    lowRiskSummary: normalizeLowRiskSummary(safeInput.lowRiskSummary),
    safety: normalizeSafety(safeInput.safety),
    readiness: normalizeReadiness(safeInput.readiness)
  };
}

function findMissingRequired(values, requiredValues) {
  return requiredValues.filter(value => !values.includes(value));
}

function findUnknown(values, requiredValues) {
  return uniqueValues(values.filter(value => !requiredValues.includes(value)));
}

function evaluateValidationAggregatorGovernanceRuntimeLoopGap(input = {}) {
  const normalized = normalizeValidationAggregatorGovernanceRuntimeLoopGapInput(input);
  const failClosedReasons = [];
  const stageIds = normalized.stageAcceptanceCases.map(item => item.id).filter(Boolean);
  const runtimeEvidenceGroupIds = normalized.requiredRuntimeEvidenceGroups.map(item => item.id).filter(Boolean);
  const approvalStateIds = normalized.approvalStates.map(item => item.id).filter(Boolean);
  const failClosedCaseIds = normalized.failClosedCases;
  const disallowedWorkIds = normalized.disallowedWork;

  const missingRequiredStages = findMissingRequired(stageIds, REQUIRED_STAGE_IDS);
  const duplicateStages = findDuplicates(stageIds);
  const unknownStages = findUnknown(stageIds, REQUIRED_STAGE_IDS);
  const stagesAllowingExecution = normalized.stageAcceptanceCases
    .filter(item => (
      item.canExecute ||
      item.durableWriteAllowed ||
      item.inputMode !== 'explicit_input' ||
      !item.expectedStatus.startsWith('blocked_') ||
      !item.required
    ))
    .map(item => item.id)
    .filter(Boolean);

  const missingRequiredRuntimeEvidenceGroups =
    findMissingRequired(runtimeEvidenceGroupIds, REQUIRED_RUNTIME_EVIDENCE_GROUPS);
  const duplicateRuntimeEvidenceGroups = findDuplicates(runtimeEvidenceGroupIds);
  const unknownRuntimeEvidenceGroups =
    findUnknown(runtimeEvidenceGroupIds, REQUIRED_RUNTIME_EVIDENCE_GROUPS);
  const runtimeEvidenceGroupsNotMissing = normalized.requiredRuntimeEvidenceGroups
    .filter(item => !item.required || item.currentStatus !== 'missing' || !item.mustFailClosedWhenMissing)
    .map(item => item.id)
    .filter(Boolean);

  const missingRequiredApprovalStates = findMissingRequired(approvalStateIds, REQUIRED_APPROVAL_STATES);
  const duplicateApprovalStates = findDuplicates(approvalStateIds);
  const unknownApprovalStates = findUnknown(approvalStateIds, REQUIRED_APPROVAL_STATES);
  const approvalStatesAllowingExecution = normalized.approvalStates
    .filter(item => (
      item.executionAllowed ||
      (item.id !== 'reviewed_not_approved' && item.acceptedForPlanning)
    ))
    .map(item => item.id)
    .filter(Boolean);

  const missingRequiredFailClosedCases = findMissingRequired(failClosedCaseIds, REQUIRED_FAIL_CLOSED_CASES);
  const duplicateFailClosedCases = findDuplicates(failClosedCaseIds);
  const unknownFailClosedCases = findUnknown(failClosedCaseIds, REQUIRED_FAIL_CLOSED_CASES);
  const missingRequiredDisallowedWork = findMissingRequired(disallowedWorkIds, REQUIRED_DISALLOWED_WORK);
  const duplicateDisallowedWork = findDuplicates(disallowedWorkIds);
  const unknownDisallowedWork = findUnknown(disallowedWorkIds, REQUIRED_DISALLOWED_WORK);

  if (!isPlainObject(input)) failClosedReasons.push('malformed_input');
  if (normalized.schemaVersion !== EXPECTED_SCHEMA_VERSION) failClosedReasons.push('schema_version_mismatch');
  if (normalized.policyVersion !== EXPECTED_POLICY_VERSION) failClosedReasons.push('policy_version_mismatch');
  if (normalized.manifestVersion !== EXPECTED_MANIFEST_VERSION) failClosedReasons.push('manifest_version_mismatch');
  if (!hasExactSet(normalized.publicMcpTools, PUBLIC_MCP_TOOLS)) failClosedReasons.push('public_mcp_tools_drift');
  if (
    normalized.selectedGap.id !== 'governance_review_approval_audit_runtime_loop_not_executed' ||
    normalized.selectedGap.priority !== 2 ||
    normalized.selectedGap.currentStatus !== 'open' ||
    !normalized.selectedGap.remainsOpenAfterThisPhase ||
    normalized.selectedGap.readinessAuthority ||
    !normalized.selectedGap.requiresA5ApprovalBeforeRuntime
  ) {
    failClosedReasons.push('selected_gap_drift');
  }
  if (
    normalized.evidenceGroup.id !== 'governance_runtime_loop_acceptance_contract' ||
    normalized.evidenceGroup.currentStatus !== 'acceptance_defined' ||
    !normalized.evidenceGroup.required ||
    !normalized.evidenceGroup.remainsNonRuntime ||
    normalized.evidenceGroup.readinessAuthority ||
    !normalized.evidenceGroup.mustFailClosedWhenMissing ||
    !normalized.evidenceGroup.mustFailClosedWhenScopeMismatch ||
    !normalized.evidenceGroup.mustFailClosedWhenApprovalMissing ||
    !normalized.evidenceGroup.mustFailClosedWhenAuditRefsMissing ||
    !normalized.evidenceGroup.mustFailClosedWhenDurableWriteClaimed ||
    !normalized.evidenceGroup.mustFailClosedWhenRuntimeReadyClaimed
  ) {
    failClosedReasons.push('evidence_group_drift');
  }
  if (
    Object.entries(normalized.loopIdentityContract)
      .filter(([key]) => ![
        'allRequired',
        'mustRemainStableAcrossStages',
        'mustFailClosedWhenMissingOrMismatched'
      ].includes(key))
      .some(([, value]) => !value) ||
    !normalized.loopIdentityContract.allRequired ||
    !normalized.loopIdentityContract.mustRemainStableAcrossStages ||
    !normalized.loopIdentityContract.mustFailClosedWhenMissingOrMismatched
  ) {
    failClosedReasons.push('identity_contract_drift');
  }
  if (
    Object.entries(normalized.scopeContract)
      .filter(([key]) => ![
        'scopeMustMatchAcrossReviewApprovalAuditAndExecution',
        'rawWorkspaceIdExposedInLowRiskSummary',
        'mustFailClosedWhenScopeMissingOrMismatched'
      ].includes(key))
      .some(([, value]) => !value) ||
    !normalized.scopeContract.scopeMustMatchAcrossReviewApprovalAuditAndExecution ||
    normalized.scopeContract.rawWorkspaceIdExposedInLowRiskSummary ||
    !normalized.scopeContract.mustFailClosedWhenScopeMissingOrMismatched
  ) {
    failClosedReasons.push('scope_contract_drift');
  }
  if (
    !normalized.authorityContract.approvalRequired ||
    normalized.authorityContract.approvalCurrentlyGranted ||
    normalized.authorityContract.approvalStatus !== 'NOT_APPROVED' ||
    !normalized.authorityContract.a5ApprovalRequiredBeforeRuntime ||
    !normalized.authorityContract.approvalMustNameActionId ||
    !normalized.authorityContract.approvalMustMatchScope ||
    !normalized.authorityContract.approvalMustNameDurableWriteIntent ||
    normalized.authorityContract.warningOnlyApprovalAllowed ||
    normalized.authorityContract.staleApprovalAllowed ||
    normalized.authorityContract.executionAllowedByFixture
  ) {
    failClosedReasons.push('authority_contract_drift');
  }
  if (
    !normalized.auditRefContract.preActionAuditRefRequired ||
    !normalized.auditRefContract.decisionAuditRefRequired ||
    !normalized.auditRefContract.postActionAuditRefRequired ||
    !normalized.auditRefContract.auditRefsMustPreserveEventIdentity ||
    normalized.auditRefContract.durableAuditWriteAllowedInFixture ||
    normalized.auditRefContract.rawAuditPayloadAllowedInLowRiskSummary ||
    !normalized.auditRefContract.mustFailClosedWhenAuditRefsMissingOrMismatched
  ) {
    failClosedReasons.push('audit_ref_contract_drift');
  }
  if (missingRequiredStages.length > 0) failClosedReasons.push('missing_required_stage');
  if (duplicateStages.length > 0) failClosedReasons.push('duplicate_stage');
  if (unknownStages.length > 0) failClosedReasons.push('unknown_stage');
  if (stagesAllowingExecution.length > 0) failClosedReasons.push('stage_allows_execution');
  if (missingRequiredRuntimeEvidenceGroups.length > 0) {
    failClosedReasons.push('missing_required_runtime_evidence_group');
  }
  if (duplicateRuntimeEvidenceGroups.length > 0) failClosedReasons.push('duplicate_runtime_evidence_group');
  if (unknownRuntimeEvidenceGroups.length > 0) failClosedReasons.push('unknown_runtime_evidence_group');
  if (runtimeEvidenceGroupsNotMissing.length > 0) failClosedReasons.push('runtime_evidence_group_not_missing');
  if (missingRequiredApprovalStates.length > 0) failClosedReasons.push('missing_required_approval_state');
  if (duplicateApprovalStates.length > 0) failClosedReasons.push('duplicate_approval_state');
  if (unknownApprovalStates.length > 0) failClosedReasons.push('unknown_approval_state');
  if (approvalStatesAllowingExecution.length > 0) failClosedReasons.push('approval_state_allows_execution');
  if (missingRequiredFailClosedCases.length > 0) failClosedReasons.push('missing_required_fail_closed_case');
  if (duplicateFailClosedCases.length > 0) failClosedReasons.push('duplicate_fail_closed_case');
  if (unknownFailClosedCases.length > 0) failClosedReasons.push('unknown_fail_closed_case');
  if (
    missingRequiredDisallowedWork.length > 0 ||
    duplicateDisallowedWork.length > 0 ||
    unknownDisallowedWork.length > 0
  ) {
    failClosedReasons.push('disallowed_work_drift');
  }
  if (
    normalized.lowRiskSummary.rawWorkspaceIdExposed ||
    normalized.lowRiskSummary.rawSecretExposed ||
    normalized.lowRiskSummary.rawGovernancePayloadExposed
  ) {
    failClosedReasons.push('unsafe_low_risk_summary');
  }
  if (Object.values(normalized.safety).some(value => value !== true)) failClosedReasons.push('unsafe_safety_flag');
  if (includesSensitiveFragment(input)) failClosedReasons.push('sensitive_fragment_rejected');
  if (Object.values(normalized.readiness).some(Boolean)) failClosedReasons.push('readiness_overclaim');

  const uniqueFailClosedReasons = uniqueValues(failClosedReasons);
  const accepted = uniqueFailClosedReasons.length === 0;

  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    sourceMode: 'explicit_input',
    status: accepted
      ? 'governance_runtime_loop_acceptance_contract_accepted_runtime_still_blocked'
      : 'blocked_fail_closed',
    decision: 'NOT_READY_BLOCKED',
    acceptedForPlanning: accepted,
    selectedGapOpen: true,
    governanceRuntimeLoopReady: false,
    governanceRuntimeLoopExecuted: false,
    approvalExecutionReady: false,
    auditWriterReady: false,
    durableWriteReady: false,
    validationAggregatorFullImplementationReady: false,
    runtimeReady: false,
    finalRcMatrixReady: false,
    v1RcReady: false,
    rcReady: false,
    cutoverReady: false,
    missingRequiredStages,
    duplicateStages,
    unknownStages,
    stagesAllowingExecution,
    missingRequiredRuntimeEvidenceGroups,
    duplicateRuntimeEvidenceGroups,
    unknownRuntimeEvidenceGroups,
    runtimeEvidenceGroupsNotMissing,
    missingRequiredApprovalStates,
    duplicateApprovalStates,
    unknownApprovalStates,
    approvalStatesAllowingExecution,
    missingRequiredFailClosedCases,
    duplicateFailClosedCases,
    unknownFailClosedCases,
    missingRequiredDisallowedWork,
    duplicateDisallowedWork,
    unknownDisallowedWork,
    failClosedReasons: uniqueFailClosedReasons,
    summary: {
      stageCount: stageIds.length,
      requiredStageCount: REQUIRED_STAGE_IDS.length,
      requiredRuntimeEvidenceGroupCount: REQUIRED_RUNTIME_EVIDENCE_GROUPS.length,
      providedRuntimeEvidenceGroupCount: runtimeEvidenceGroupIds.length,
      approvalStateCount: approvalStateIds.length,
      failClosedCaseCount: failClosedCaseIds.length,
      disallowedWorkCount: disallowedWorkIds.length,
      failClosed: !accepted,
      noRuntimeLoopExecution: true,
      noApprovalExecution: true,
      noDurableAuditWrite: true,
      noDurableMemoryWrite: true,
      noRealGovernancePacketRead: true,
      noProvider: true,
      noRemoteWrite: true
    },
    safety: {
      mutated: false,
      readsEvidenceFiles: false,
      executesCommands: false,
      runsGates: false,
      runsRunners: false,
      startsServices: false,
      callsProviders: false,
      mutatesConfig: false,
      operatesStartupWatchdog: false,
      readsRealMemory: false,
      readsRealGovernancePackets: false,
      readsRealAuditLogs: false,
      scansRuntimeStores: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      expandsPublicMcp: false,
      exposesValidateMemoryPublicly: false,
      remoteWrites: false,
      tagReleaseDeploy: false
    },
    readiness: {
      governanceRuntimeLoopGapAcceptanceContractReady: accepted,
      governanceRuntimeLoopReady: false,
      governanceRuntimeLoopExecuted: false,
      approvalExecutionReady: false,
      auditWriterReady: false,
      durableWriteReady: false,
      validationAggregatorFullImplementationReady: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      rcReady: false,
      cutoverReady: false
    }
  };
}

module.exports = {
  EXPECTED_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS,
  REQUIRED_APPROVAL_STATES,
  REQUIRED_DISALLOWED_WORK,
  REQUIRED_FAIL_CLOSED_CASES,
  REQUIRED_FAIL_CLOSED_REASONS,
  REQUIRED_RUNTIME_EVIDENCE_GROUPS,
  REQUIRED_STAGE_IDS,
  evaluateValidationAggregatorGovernanceRuntimeLoopGap,
  normalizeValidationAggregatorGovernanceRuntimeLoopGapInput
};
