const { TOOL_DEFINITIONS } = require('./constants');
const {
  collectValidationAggregatorRuntimeProofUnits
} = require('./ValidationAggregatorRuntimeProofCollector');
const {
  evaluateV11HardeningValidationAggregator
} = require('./V11HardeningValidationAggregator');

const DECISION_LABELS = [
  'READY_FOR_V1_0_RC',
  'READY_FOR_DOCS_ONLY_RC_REVIEW',
  'A4_SAFE_SLICE_PASSED',
  'BLOCKED_RUNTIME_REQUIRED',
  'BLOCKED_A5_REQUIRED',
  'NOT_READY_BLOCKED'
];

const PUBLIC_MCP_TOOLS = TOOL_DEFINITIONS.map(tool => tool.name);

const VALIDATION_EVIDENCE_SOURCE_TYPES = [
  'committed_validation',
  'local_validation'
];

const VALIDATION_EVIDENCE_SOURCE_CLASSES = [
  'committed_evidence',
  'local_validation',
  'runtime_evidence',
  'final_rc_matrix_evidence'
];

const VALIDATION_EVIDENCE_STATUSES = [
  'passed',
  'failed',
  'blocked',
  'not_executed',
  'warning',
  'unknown'
];

const VALIDATION_EVIDENCE_FRESHNESS_STATUSES = [
  'no_explicit_evidence',
  'fresh_passed',
  'fresh_with_warnings',
  'stale_or_unknown',
  'failed_or_blocked'
];

const VALIDATION_EVIDENCE_GATE_READINESS_STATUSES = [
  'not_ready_no_explicit_evidence',
  'not_ready_failed_or_blocked_evidence',
  'not_ready_rejected_evidence',
  'not_ready_stale_or_unknown_evidence',
  'not_ready_warning_evidence',
  'not_ready_existing_blockers'
];

const VALIDATION_EVIDENCE_COMMAND_COVERAGE_STATUSES = [
  'no_explicit_evidence',
  'command_coverage_present',
  'command_coverage_partial',
  'command_coverage_missing'
];

const VALIDATION_EVIDENCE_REJECTION_SUMMARY_STATUSES = [
  'no_rejections',
  'rejections_present',
  'all_inputs_rejected'
];

const VALIDATION_EVIDENCE_REJECTION_REASONS = [
  'invalid_source_shape',
  'sensitive_fragment_rejected',
  'unsupported_source_type',
  'unsupported_source_class',
  'unsupported_status',
  'side_effect_evidence_rejected'
];

const VALIDATION_EVIDENCE_CONFIDENCE_POSTURE_STATUSES = [
  'no_explicit_evidence',
  'failed_or_blocked_signal',
  'rejected_or_unsafe_signal',
  'stale_or_unknown_signal',
  'partial_signal',
  'usable_but_blocked'
];

const VALIDATION_EVIDENCE_STALE_AFTER_HOURS = 168;
const RUNTIME_EVIDENCE_SUMMARY_STALE_AFTER_HOURS = 168;

const RUNTIME_EVIDENCE_SUMMARY_STATUSES = [
  'no_explicit_runtime_evidence_summary',
  'explicit_runtime_evidence_summary_available',
  'runtime_evidence_summary_rejected'
];

const RUNTIME_EVIDENCE_SUMMARY_REQUIRED_UNIT_IDS = [
  'A5-GAP-1',
  'A5-GAP-2',
  'A5-GAP-3',
  'A5-GAP-4',
  'A5-GAP-5'
];

const FORBIDDEN_EVIDENCE_FRAGMENTS = [
  'authorization:',
  'bearer ',
  'set-cookie',
  'api_key',
  'providerapikey',
  'workspace_id',
  'raw_workspace_id',
  'token=',
  'password',
  'sk_live_',
  'sk-proj-',
  'http://',
  'https://',
  'c:\\',
  '.env'
];

const P36_P40_STATIC_EVIDENCE_SOURCES = [
  {
    id: 'p36_scope_a5_boundary',
    source_type: 'committed_fixture',
    status: 'fixture_contract_added_not_runtime_ready',
    doc_ref: 'docs/P36_SCOPE_A5_BOUNDARY_CONTRACT.md',
    test_ref: 'tests/p36-scope-a5-boundary-contract-fixture.test.js',
    fixture_ref: 'tests/fixtures/p36-scope-a5-boundary-contract-v1.json'
  },
  {
    id: 'p36_task_risk_labels',
    source_type: 'committed_fixture',
    status: 'fixture_contract_added_not_runtime_ready',
    doc_ref: 'docs/P36_TASK_RISK_LABELS_CONTRACT.md',
    test_ref: 'tests/p36-task-risk-labels-contract-fixture.test.js',
    fixture_ref: 'tests/fixtures/p36-task-risk-labels-contract-v1.json'
  },
  {
    id: 'p37_policy_decision_envelope',
    source_type: 'committed_fixture',
    status: 'fixture_contract_added_not_runtime_ready',
    doc_ref: 'docs/P37_POLICY_DECISION_ENVELOPE_FIXTURE_MATRIX.md',
    test_ref: 'tests/p37-policy-decision-envelope-fixture.test.js',
    fixture_ref: 'tests/fixtures/p37-policy-decision-envelope-v1.json'
  },
  {
    id: 'p38_recall_isolation',
    source_type: 'committed_fixture',
    status: 'fixture_contract_added_not_runtime_ready',
    doc_ref: 'docs/P38_RECALL_ISOLATION_FIXTURES.md',
    test_ref: 'tests/p38-recall-isolation-fixture.test.js',
    fixture_ref: 'tests/fixtures/p38-recall-isolation-v1.json'
  },
  {
    id: 'p39_synthetic_migration_dry_run',
    source_type: 'committed_fixture',
    status: 'fixture_contract_added_not_runtime_ready',
    doc_ref: 'docs/P39_SYNTHETIC_MIGRATION_DRY_RUN_CONTRACT.md',
    test_ref: 'tests/p39-synthetic-migration-dry-run-fixture.test.js',
    fixture_ref: 'tests/fixtures/p39-synthetic-migration-dry-run-v1.json'
  },
  {
    id: 'p40_local_readiness_report',
    source_type: 'committed_fixture',
    status: 'local_evidence_report_added_not_runtime_ready',
    doc_ref: 'docs/P40_LOCAL_READINESS_REPORT.md',
    test_ref: 'tests/p40-local-readiness-report-fixture.test.js',
    fixture_ref: 'tests/fixtures/p40-local-readiness-report-v1.json'
  }
];

const P53_VALIDATION_AGGREGATOR_INVENTORY_SOURCE_CLASSES = [
  'committed_evidence',
  'local_validation',
  'runtime_evidence',
  'final_rc_matrix_evidence'
];

const P53_VALIDATION_AGGREGATOR_INVENTORY_SOURCE_TYPES = [
  'committed_code_contract',
  'committed_doc_contract',
  'committed_fixture_contract',
  'committed_helper_contract',
  'committed_test_contract',
  'local_validation_log',
  'local_git_commit',
  'explicit_input_evidence',
  'static_aggregator_report_shape',
  'runtime_boundary_report',
  'final_rc_matrix_report'
];

const P53_VALIDATION_AGGREGATOR_INVENTORY_STATUSES = [
  'fresh',
  'stale',
  'missing',
  'unsupported',
  'blocked',
  'not_executed'
];

const P53_VALIDATION_AGGREGATOR_INVENTORY_ROWS = [
  {
    id: 'validation_aggregator_current_report_shape',
    sourceClass: 'committed_evidence',
    sourceType: 'static_aggregator_report_shape',
    status: 'fresh',
    acceptedForPlanning: true
  },
  {
    id: 'p36_p40_static_evidence_source_map',
    sourceClass: 'committed_evidence',
    sourceType: 'static_aggregator_report_shape',
    status: 'fresh',
    acceptedForPlanning: true
  },
  {
    id: 'p45_final_rc_matrix_posture_bridge',
    sourceClass: 'committed_evidence',
    sourceType: 'static_aggregator_report_shape',
    status: 'fresh',
    acceptedForPlanning: true
  },
  {
    id: 'p52_minimal_runtime_schema_version_helper',
    sourceClass: 'committed_evidence',
    sourceType: 'committed_helper_contract',
    status: 'fresh',
    acceptedForPlanning: true
  },
  {
    id: 'p52_local_validation_result',
    sourceClass: 'local_validation',
    sourceType: 'local_validation_log',
    status: 'fresh',
    acceptedForPlanning: true
  },
  {
    id: 'schema_version_runtime_enforcement',
    sourceClass: 'runtime_evidence',
    sourceType: 'runtime_boundary_report',
    status: 'fresh',
    acceptedForPlanning: true,
    runtimeEvidenceObserved: true
  },
  {
    id: 'final_rc_matrix_runner_execution',
    sourceClass: 'final_rc_matrix_evidence',
    sourceType: 'final_rc_matrix_report',
    status: 'not_executed',
    acceptedForPlanning: false
  },
  {
    id: 'governance_review_approval_audit_runtime_loop',
    sourceClass: 'runtime_evidence',
    sourceType: 'runtime_boundary_report',
    status: 'blocked',
    acceptedForPlanning: false
  }
];

const P66_FULL_IMPLEMENTATION_REQUIRED_CRITERIA = [
  'safe_evidence_source_registry_complete',
  'evidence_freshness_and_baseline_binding_complete',
  'runtime_schema_version_boundary_evidence_ingested',
  'final_rc_matrix_runner_evidence_ingested_without_overclaim',
  'governance_review_approval_audit_runtime_loop_evidence_ingested',
  'recall_isolation_runtime_proof_evidence_ingested',
  'migration_import_export_backup_restore_approval_evidence_ingested',
  'live_http_operation_readiness_evidence_ingested',
  'cutover_context_mainline_strict_gate_evidence_ingested',
  'rc_cutover_authorization_and_execution_evidence_ingested',
  'a5_hard_stop_clearance_evidence_complete'
];

const P66_FULL_IMPLEMENTATION_REMAINING_RUNTIME_GAPS = [
  'validation_aggregator_full_implementation_incomplete',
  'governance_review_approval_audit_runtime_loop_not_executed',
  'recall_isolation_runtime_proof_not_executed',
  'migration_import_export_backup_restore_approval_execution_blocked',
  'live_http_operation_readiness_not_claimed',
  'mainline_strict_gate_not_executed_for_cutover',
  'rc_cutover_not_executed'
];

const P66_FULL_IMPLEMENTATION_GAP_CLOSURE_MAP = {
  validation_aggregator_full_implementation_incomplete: {
    category: 'local_implementation',
    requiresLocalImplementation: true,
    requiresA5: false,
    redLane: false
  },
  governance_review_approval_audit_runtime_loop_not_executed: {
    category: 'a5_runtime_evidence',
    requiresLocalImplementation: false,
    requiresA5: true,
    redLane: false
  },
  recall_isolation_runtime_proof_not_executed: {
    category: 'a5_runtime_evidence',
    requiresLocalImplementation: false,
    requiresA5: true,
    redLane: false
  },
  migration_import_export_backup_restore_approval_execution_blocked: {
    category: 'a5_migration_boundary',
    requiresLocalImplementation: false,
    requiresA5: true,
    redLane: false
  },
  live_http_operation_readiness_not_claimed: {
    category: 'a5_runtime_evidence',
    requiresLocalImplementation: false,
    requiresA5: true,
    redLane: false
  },
  mainline_strict_gate_not_executed_for_cutover: {
    category: 'cutover_gate',
    requiresLocalImplementation: false,
    requiresA5: true,
    redLane: true
  },
  rc_cutover_not_executed: {
    category: 'red_lane_cutover',
    requiresLocalImplementation: false,
    requiresA5: true,
    redLane: true
  }
};

const P66_FULL_IMPLEMENTATION_LOCALLY_EVIDENCED_GAPS = [
  'runtime_schema_version_enforcement_not_fully_proven',
  'final_rc_matrix_runner_not_executed_as_real_matrix'
];

const P66_FULL_IMPLEMENTATION_LOCAL_PROOF_CHAIN_COMPLETE_GAPS = [
  'validation_aggregator_full_implementation_incomplete'
];

const P66_FULL_IMPLEMENTATION_NEXT_SAFE_CLOSURE_CANDIDATES = [
  'a5_gap_3_migration_readiness_fixture_only_dry_run',
  'validation_aggregator_full_gap_accounting_structured_report',
  'a5_gap_6_sanitized_aggregation_refresh_after_each_approved_unit'
];

const P66_FULL_IMPLEMENTATION_A5_HARD_STOPS = [
  'push',
  'tag_create',
  'release_create',
  'deploy',
  'config_switch',
  'watchdog_install',
  'startup_install',
  'provider_call',
  'real_memory_scan',
  'sqlite_migration_apply',
  'import_export_apply',
  'backup_restore_apply',
  'durable_memory_write',
  'durable_audit_write',
  'public_mcp_expansion',
  'rc_ready_claim'
];

const P66_FULL_IMPLEMENTATION_FAIL_CLOSED_CASES = [
  'missing_required_evidence',
  'stale_evidence',
  'unsupported_source_type',
  'ambiguous_baseline',
  'unsafe_summary_claim',
  'readiness_claim_without_authority',
  'full_matrix_execution_overclaim',
  'provider_call_detected',
  'service_start_detected',
  'real_memory_preview_detected',
  'durable_write_detected',
  'migration_or_import_export_apply_detected',
  'public_mcp_expansion_detected',
  'secret_like_content_detected',
  'a5_approval_missing'
];

function buildP66ClosureAuthoritySummary({
  effectiveActionableLocalImplementationGapIds = [],
  effectiveA5GatedGapIds = [],
  effectiveRedLaneGapIds = [],
  effectiveNonBaselineRemainingGapIds = [],
  totalBlockerCount = 0
} = {}) {
  let status = 'readiness_authority_required';
  let nextAuthority = 'separate_readiness_authority';

  if (effectiveActionableLocalImplementationGapIds.length > 0) {
    status = 'local_implementation_required';
    nextAuthority = 'local_source_test_implementation';
  } else if (effectiveRedLaneGapIds.length > 0) {
    status = 'red_lane_authorization_required';
    nextAuthority = 'explicit_red_lane_owner_approval';
  } else if (effectiveA5GatedGapIds.length > 0) {
    status = 'a5_authorization_required';
    nextAuthority = 'exact_a5_owner_approval';
  } else if (effectiveNonBaselineRemainingGapIds.length > 0) {
    status = 'manual_gap_modeling_required';
    nextAuthority = 'manual_review_for_unmodeled_gap';
  } else if (totalBlockerCount > 0) {
    status = 'blocker_clearance_required';
    nextAuthority = 'clear_existing_blockers';
  }

  return {
    status,
    nextAuthority,
    localImplementationRequired:
      effectiveActionableLocalImplementationGapIds.length > 0,
    a5AuthorizationRequired: effectiveA5GatedGapIds.length > 0,
    redLaneAuthorizationRequired: effectiveRedLaneGapIds.length > 0,
    manualGapModelingRequired:
      effectiveNonBaselineRemainingGapIds.length > 0,
    blockerClearanceRequired: totalBlockerCount > 0,
    readinessAuthorityRequired: true,
    canProceedAutomatically: status === 'local_implementation_required',
    canClaimReadiness: false
  };
}

function buildP66FullImplementationGapAccounting({
  runtimeEvidenceSummaryBridge = null,
  validationEvidenceFreshness = null,
  validationEvidenceGateReadiness = null,
  validationEvidenceCommandCoverage = null,
  validationEvidenceConfidencePosture = null,
  blockers = []
} = {}) {
  const acceptedRuntimeSummary = runtimeEvidenceSummaryBridge &&
    runtimeEvidenceSummaryBridge.accepted === true
    ? runtimeEvidenceSummaryBridge
    : null;
  const acceptedRuntimeSummaryRemainingGapIds = acceptedRuntimeSummary
    ? acceptedRuntimeSummary.remainingRuntimeGaps
    : [];
  const acceptedRuntimeSummaryLocallyEvidencedGapIds = acceptedRuntimeSummary
    ? acceptedRuntimeSummary.locallyEvidencedRuntimeGaps
    : [];
  const acceptedRuntimeSummaryBound = Boolean(acceptedRuntimeSummary);
  const effectiveLocallyEvidencedFullImplementationGapIds = acceptedRuntimeSummary
    ? acceptedRuntimeSummaryLocallyEvidencedGapIds
    : P66_FULL_IMPLEMENTATION_LOCALLY_EVIDENCED_GAPS;
  const candidateEffectiveRemainingFullImplementationGapIds = acceptedRuntimeSummary
    ? acceptedRuntimeSummaryRemainingGapIds
    : P66_FULL_IMPLEMENTATION_REMAINING_RUNTIME_GAPS;
  const localProofChainCloseoutAudit = P66_FULL_IMPLEMENTATION_LOCAL_PROOF_CHAIN_COMPLETE_GAPS.map(id => {
    const includedInStaticBaseline = P66_FULL_IMPLEMENTATION_REMAINING_RUNTIME_GAPS.includes(id);
    const locallyEvidenced = effectiveLocallyEvidencedFullImplementationGapIds.includes(id);
    const omittedFromAcceptedRuntimeRemaining =
      acceptedRuntimeSummaryBound &&
      !acceptedRuntimeSummaryRemainingGapIds.includes(id);
    const closeoutAccepted =
      includedInStaticBaseline &&
      locallyEvidenced &&
      omittedFromAcceptedRuntimeRemaining;

    return {
      id,
      includedInStaticBaseline,
      locallyEvidenced,
      omittedFromAcceptedRuntimeRemaining,
      closeoutAccepted,
      closeoutStatus: closeoutAccepted
        ? 'local_proof_chain_closeout_accepted'
        : 'local_proof_chain_closeout_not_proven',
      mustRemainWhenNotProven: true,
      canClaimReadiness: false
    };
  });
  const localProofChainCloseoutNotProvenIds = localProofChainCloseoutAudit
    .filter(item => item.closeoutAccepted !== true)
    .map(item => item.id);
  const effectiveRemainingFullImplementationGapIds = [
    ...candidateEffectiveRemainingFullImplementationGapIds,
    ...localProofChainCloseoutNotProvenIds
      .filter(id => !candidateEffectiveRemainingFullImplementationGapIds.includes(id))
  ];
  const staticBaselineClearedGapIds = P66_FULL_IMPLEMENTATION_REMAINING_RUNTIME_GAPS
    .filter(id => !effectiveRemainingFullImplementationGapIds.includes(id));
  const staticBaselineStillRemainingGapIds = P66_FULL_IMPLEMENTATION_REMAINING_RUNTIME_GAPS
    .filter(id => effectiveRemainingFullImplementationGapIds.includes(id));
  const effectiveNonBaselineRemainingGapIds = effectiveRemainingFullImplementationGapIds
    .filter(id => !P66_FULL_IMPLEMENTATION_REMAINING_RUNTIME_GAPS.includes(id));
  const effectiveRemainingGapClosureItems = effectiveRemainingFullImplementationGapIds
    .map(id => ({
      id,
      category: P66_FULL_IMPLEMENTATION_GAP_CLOSURE_MAP[id]
        ? P66_FULL_IMPLEMENTATION_GAP_CLOSURE_MAP[id].category
        : 'unmodeled_gap',
      requiresLocalImplementation: P66_FULL_IMPLEMENTATION_GAP_CLOSURE_MAP[id]
        ? P66_FULL_IMPLEMENTATION_GAP_CLOSURE_MAP[id].requiresLocalImplementation
        : true,
      requiresA5: P66_FULL_IMPLEMENTATION_GAP_CLOSURE_MAP[id]
        ? P66_FULL_IMPLEMENTATION_GAP_CLOSURE_MAP[id].requiresA5
        : true,
      redLane: P66_FULL_IMPLEMENTATION_GAP_CLOSURE_MAP[id]
        ? P66_FULL_IMPLEMENTATION_GAP_CLOSURE_MAP[id].redLane
        : true,
      localProofChainComplete:
        P66_FULL_IMPLEMENTATION_LOCAL_PROOF_CHAIN_COMPLETE_GAPS.includes(id)
    }));
  const effectiveLocalImplementationGapIds = effectiveRemainingGapClosureItems
    .filter(item => item.requiresLocalImplementation === true)
    .map(item => item.id);
  const effectiveLocalProofChainCompleteGapIds = effectiveRemainingGapClosureItems
    .filter(item => item.localProofChainComplete === true)
    .map(item => item.id);
  const effectiveActionableLocalImplementationGapIds = effectiveRemainingGapClosureItems
    .filter(item => (
      item.requiresLocalImplementation === true &&
      item.localProofChainComplete !== true
    ))
    .map(item => item.id);
  const effectiveA5GatedGapIds = effectiveRemainingGapClosureItems
    .filter(item => item.requiresA5 === true)
    .map(item => item.id);
  const effectiveRedLaneGapIds = effectiveRemainingGapClosureItems
    .filter(item => item.redLane === true)
    .map(item => item.id);
  const safeBlockers = Array.isArray(blockers) ? blockers : [];
  const validationBlockerIds = safeBlockers
    .filter(blocker => blocker.category === 'validation')
    .map(blocker => blocker.id);
  const runtimeRequiredBlockerIds = safeBlockers
    .filter(blocker => blocker.requiresRuntimeImplementation === true)
    .map(blocker => blocker.id);
  const a5GatedBlockerIds = safeBlockers
    .filter(blocker => blocker.requiresA5 === true)
    .map(blocker => blocker.id);
  const validationEvidenceExplicitEvidenceUsable = validationEvidenceGateReadiness
    ? validationEvidenceGateReadiness.explicitEvidenceUsable === true
    : false;
  const totalBlockerCount = safeBlockers.length;
  const closureStatus = totalBlockerCount > 0
    ? 'blocked_existing_blockers'
    : 'blocked_full_implementation_not_authorized';
  const effectiveRemainingGapsCleared =
    effectiveRemainingFullImplementationGapIds.length === 0;
  const effectiveNonBaselineRemainingGapsAbsent =
    effectiveNonBaselineRemainingGapIds.length === 0;
  const effectiveLocalImplementationGapsCleared =
    effectiveLocalImplementationGapIds.length === 0;
  const effectiveActionableLocalImplementationGapsCleared =
    effectiveActionableLocalImplementationGapIds.length === 0;
  const effectiveA5GatedGapsCleared = effectiveA5GatedGapIds.length === 0;
  const effectiveRedLaneGapsCleared = effectiveRedLaneGapIds.length === 0;
  const closureAuditMatrix = effectiveRemainingGapClosureItems.map(item => {
    let status = 'unmodeled_manual_review';
    let nextAuthority = 'manual_review_for_unmodeled_gap';
    const isModeledGap = Object.hasOwn(P66_FULL_IMPLEMENTATION_GAP_CLOSURE_MAP, item.id);

    if (!isModeledGap) {
      status = 'unmodeled_manual_review';
      nextAuthority = 'manual_review_for_unmodeled_gap';
    } else if (item.localProofChainComplete === true) {
      status = 'closed_by_local_proof_chain';
      nextAuthority = 'none_local_proof_chain_complete';
    } else if (item.redLane === true) {
      status = 'requires_red_lane_authorization';
      nextAuthority = 'explicit_red_lane_owner_approval';
    } else if (item.requiresA5 === true) {
      status = 'requires_a5_evidence';
      nextAuthority = 'exact_a5_owner_approval';
    } else if (item.requiresLocalImplementation === true) {
      status = 'requires_local_source_test_implementation';
      nextAuthority = 'local_source_test_implementation';
    }

    return {
      id: item.id,
      category: item.category,
      status,
      nextAuthority,
      requiresLocalImplementation: item.requiresLocalImplementation,
      requiresA5: item.requiresA5,
      redLane: item.redLane,
      localProofChainComplete: item.localProofChainComplete,
      canCloseAutomatically: status === 'closed_by_local_proof_chain',
      canClaimReadiness: false
    };
  });
  const closureAuditClosedByLocalProofChainIds = closureAuditMatrix
    .filter(item => item.status === 'closed_by_local_proof_chain')
    .map(item => item.id);
  const closureAuditRequiresLocalImplementationIds = closureAuditMatrix
    .filter(item => item.status === 'requires_local_source_test_implementation')
    .map(item => item.id);
  const closureAuditRequiresA5EvidenceIds = closureAuditMatrix
    .filter(item => item.status === 'requires_a5_evidence')
    .map(item => item.id);
  const closureAuditRequiresRedLaneAuthorizationIds = closureAuditMatrix
    .filter(item => item.status === 'requires_red_lane_authorization')
    .map(item => item.id);
  const closureAuditUnmodeledManualReviewIds = closureAuditMatrix
    .filter(item => item.status === 'unmodeled_manual_review')
    .map(item => item.id);
  const closureAuthoritySummary = buildP66ClosureAuthoritySummary({
    effectiveActionableLocalImplementationGapIds,
    effectiveA5GatedGapIds,
    effectiveRedLaneGapIds,
    effectiveNonBaselineRemainingGapIds,
    totalBlockerCount
  });
  const closureAuthorityStatus = closureAuthoritySummary.status;
  const nextClosureAuthority = closureAuthoritySummary.nextAuthority;
  const acceptedRuntimeSummaryZeroGap =
    acceptedRuntimeSummaryBound &&
    effectiveRemainingGapsCleared &&
    effectiveNonBaselineRemainingGapsAbsent;
  const decisionPacketRouteStatus = acceptedRuntimeSummaryZeroGap
    ? 'ready_for_rc9_decision_packet_not_cutover'
    : 'rc_not_ready_blocked_remaining_gaps';
  const readyToRequestRcCutoverApproval = acceptedRuntimeSummaryZeroGap;
  const closureMissingCriteria = [
    ...(!acceptedRuntimeSummaryBound ? ['accepted_runtime_summary'] : []),
    ...(!validationEvidenceExplicitEvidenceUsable ? ['usable_validation_evidence'] : []),
    ...(validationBlockerIds.length > 0 ? ['validation_blockers_cleared'] : []),
    ...(runtimeRequiredBlockerIds.length > 0 ? ['runtime_required_blockers_cleared'] : []),
    ...(a5GatedBlockerIds.length > 0 ? ['a5_gated_blockers_cleared'] : []),
    ...(!effectiveRemainingGapsCleared ? ['effective_remaining_gaps_cleared'] : []),
    ...(!effectiveNonBaselineRemainingGapsAbsent ? ['effective_non_baseline_remaining_gaps_absent'] : []),
    ...(!effectiveActionableLocalImplementationGapsCleared ? ['effective_actionable_local_implementation_gaps_cleared'] : []),
    ...(!effectiveA5GatedGapsCleared ? ['effective_a5_gated_gaps_cleared'] : []),
    ...(!effectiveRedLaneGapsCleared ? ['effective_red_lane_gaps_cleared'] : []),
    'rc_cutover_approval_present',
    'readiness_authority'
  ];
  const rc8Rc9ReadinessEvidenceAudit = {
    status: acceptedRuntimeSummaryZeroGap
      ? 'ready_to_request_rc_cutover_approval_not_rc_ready'
      : 'not_ready_remaining_authority_gaps',
    sourceMode: 'aggregator_gap_accounting_only',
    rc8AggregationAccepted: acceptedRuntimeSummaryBound,
    validationEvidenceUsable: validationEvidenceExplicitEvidenceUsable,
    localProofChainCloseoutAccepted:
      localProofChainCloseoutNotProvenIds.length === 0,
    closureAuditMatrixCount: closureAuditMatrix.length,
    remainingAuthorityGapIds: effectiveRemainingFullImplementationGapIds,
    remainingAuthorityGapCount: effectiveRemainingFullImplementationGapIds.length,
    closureAuthorityStatus,
    nextClosureAuthority,
    readyToEnterRc9DecisionPacket: acceptedRuntimeSummaryZeroGap,
    readyToRequestRcCutoverApproval,
    rcCutoverApprovalRequired: true,
    rcCutoverApproved: false,
    rcCutoverExecuted: false,
    rcCutoverExecutionAllowed: false,
    rcReady: false,
    canClaimReadiness: false,
    missingCriteria: closureMissingCriteria,
    noRemoteWrite: true,
    noRuntimeMutation: true
  };

  return {
    available: true,
    sourceMode: 'static_report_shape_only',
    runtimeSummaryBindingSourceMode: 'explicit_sanitized_summary_only',
    fullImplementationReady: false,
    remainingFullImplementationGapIds: P66_FULL_IMPLEMENTATION_REMAINING_RUNTIME_GAPS,
    remainingFullImplementationGapCount: P66_FULL_IMPLEMENTATION_REMAINING_RUNTIME_GAPS.length,
    locallyEvidencedFullImplementationGapIds: P66_FULL_IMPLEMENTATION_LOCALLY_EVIDENCED_GAPS,
    locallyEvidencedFullImplementationGapCount: P66_FULL_IMPLEMENTATION_LOCALLY_EVIDENCED_GAPS.length,
    effectiveGapSource: acceptedRuntimeSummary
      ? 'accepted_runtime_summary'
      : 'static_baseline',
    effectiveRemainingFullImplementationGapIds,
    effectiveRemainingFullImplementationGapCount:
      effectiveRemainingFullImplementationGapIds.length,
    effectiveLocallyEvidencedFullImplementationGapIds,
    effectiveLocallyEvidencedFullImplementationGapCount:
      effectiveLocallyEvidencedFullImplementationGapIds.length,
    localProofChainCloseoutAudit,
    localProofChainCloseoutAuditCount: localProofChainCloseoutAudit.length,
    localProofChainCloseoutAcceptedIds: localProofChainCloseoutAudit
      .filter(item => item.closeoutAccepted === true)
      .map(item => item.id),
    localProofChainCloseoutAcceptedCount: localProofChainCloseoutAudit
      .filter(item => item.closeoutAccepted === true).length,
    localProofChainCloseoutNotProvenIds,
    localProofChainCloseoutNotProvenCount:
      localProofChainCloseoutNotProvenIds.length,
    localProofChainCloseoutCanClaimReadiness: false,
    staticBaselineClearedGapIds,
    staticBaselineClearedGapCount: staticBaselineClearedGapIds.length,
    staticBaselineStillRemainingGapIds,
    staticBaselineStillRemainingGapCount: staticBaselineStillRemainingGapIds.length,
    effectiveNonBaselineRemainingGapIds,
    effectiveNonBaselineRemainingGapCount: effectiveNonBaselineRemainingGapIds.length,
    effectiveRemainingGapClosureItems,
    effectiveLocalImplementationGapIds,
    effectiveLocalImplementationGapCount: effectiveLocalImplementationGapIds.length,
    effectiveLocalProofChainCompleteGapIds,
    effectiveLocalProofChainCompleteGapCount:
      effectiveLocalProofChainCompleteGapIds.length,
    effectiveActionableLocalImplementationGapIds,
    effectiveActionableLocalImplementationGapCount:
      effectiveActionableLocalImplementationGapIds.length,
    effectiveA5GatedGapIds,
    effectiveA5GatedGapCount: effectiveA5GatedGapIds.length,
    effectiveRedLaneGapIds,
    effectiveRedLaneGapCount: effectiveRedLaneGapIds.length,
    closureAuditMatrix,
    closureAuditMatrixCount: closureAuditMatrix.length,
    closureAuditClosedByLocalProofChainIds,
    closureAuditClosedByLocalProofChainCount:
      closureAuditClosedByLocalProofChainIds.length,
    closureAuditRequiresLocalImplementationIds,
    closureAuditRequiresLocalImplementationCount:
      closureAuditRequiresLocalImplementationIds.length,
    closureAuditRequiresA5EvidenceIds,
    closureAuditRequiresA5EvidenceCount:
      closureAuditRequiresA5EvidenceIds.length,
    closureAuditRequiresRedLaneAuthorizationIds,
    closureAuditRequiresRedLaneAuthorizationCount:
      closureAuditRequiresRedLaneAuthorizationIds.length,
    closureAuditUnmodeledManualReviewIds,
    closureAuditUnmodeledManualReviewCount:
      closureAuditUnmodeledManualReviewIds.length,
    closureAuditCanClaimReadiness: false,
    closureAuthoritySummary,
    closureAuthorityStatus,
    nextClosureAuthority,
    rc8Rc9ReadinessEvidenceAudit,
    rc8Rc9ReadinessEvidenceAuditStatus: rc8Rc9ReadinessEvidenceAudit.status,
    rc8Rc9ReadinessEvidenceAuditReadyToEnterRc9DecisionPacket:
      rc8Rc9ReadinessEvidenceAudit.readyToEnterRc9DecisionPacket,
    rc8Rc9ReadinessEvidenceAuditReadyToRequestRcCutoverApproval:
      rc8Rc9ReadinessEvidenceAudit.readyToRequestRcCutoverApproval,
    rc8Rc9ReadinessEvidenceAuditRemainingAuthorityGapCount:
      rc8Rc9ReadinessEvidenceAudit.remainingAuthorityGapCount,
    rc8Rc9ReadinessEvidenceAuditCanClaimReadiness: false,
    acceptedRuntimeSummaryZeroGap,
    decisionPacketRouteStatus,
    readyToRequestRcCutoverApproval,
    rcCutoverApprovalRequired: true,
    rcCutoverApproved: false,
    rcCutoverExecuted: false,
    rcCutoverExecutionAllowed: false,
    rcReady: false,
    closureStatus,
    closureReady: false,
    closureCanClaimReady: false,
    closureCriteria: {
      acceptedRuntimeSummaryBound,
      validationEvidenceExplicitEvidenceUsable,
      validationBlockersCleared: validationBlockerIds.length === 0,
      runtimeRequiredBlockersCleared: runtimeRequiredBlockerIds.length === 0,
      a5GatedBlockersCleared: a5GatedBlockerIds.length === 0,
      effectiveRemainingGapsCleared,
      effectiveNonBaselineRemainingGapsAbsent,
      effectiveLocalImplementationGapsCleared,
      effectiveActionableLocalImplementationGapsCleared,
      effectiveA5GatedGapsCleared,
      effectiveRedLaneGapsCleared,
      decisionPacketCanBePrepared: acceptedRuntimeSummaryZeroGap,
      rcCutoverApprovalPresent: false,
      rcCutoverExecutionAllowed: false,
      allBlockersCleared: totalBlockerCount === 0,
      readinessClaimAllowed: false
    },
    closureMissingCriteria,
    acceptedRuntimeSummaryBound,
    acceptedRuntimeSummaryStatus: acceptedRuntimeSummary
      ? acceptedRuntimeSummary.status
      : 'no_accepted_runtime_summary',
    acceptedRuntimeSummaryRemainingGapIds,
    acceptedRuntimeSummaryRemainingGapCount: acceptedRuntimeSummaryRemainingGapIds.length,
    acceptedRuntimeSummaryLocallyEvidencedGapIds,
    acceptedRuntimeSummaryLocallyEvidencedGapCount:
      acceptedRuntimeSummaryLocallyEvidencedGapIds.length,
    validationEvidenceFreshnessBound: Boolean(validationEvidenceFreshness),
    validationEvidenceFreshnessStatus: validationEvidenceFreshness
      ? validationEvidenceFreshness.status
      : 'no_validation_evidence_freshness',
    validationEvidenceGateReadinessStatus: validationEvidenceGateReadiness
      ? validationEvidenceGateReadiness.status
      : 'no_validation_evidence_gate_readiness',
    validationEvidenceExplicitEvidenceUsable,
    validationEvidenceCommandCoverageStatus: validationEvidenceCommandCoverage
      ? validationEvidenceCommandCoverage.status
      : 'no_validation_evidence_command_coverage',
    validationEvidenceConfidencePostureStatus: validationEvidenceConfidencePosture
      ? validationEvidenceConfidencePosture.status
      : 'no_validation_evidence_confidence_posture',
    blockerSummaryBound: safeBlockers.length > 0,
    validationBlockerIds,
    validationBlockerCount: validationBlockerIds.length,
    runtimeRequiredBlockerIds,
    runtimeRequiredBlockerCount: runtimeRequiredBlockerIds.length,
    a5GatedBlockerIds,
    a5GatedBlockerCount: a5GatedBlockerIds.length,
    totalBlockerCount,
    blockedA5HardStopIds: P66_FULL_IMPLEMENTATION_A5_HARD_STOPS,
    blockedA5HardStopCount: P66_FULL_IMPLEMENTATION_A5_HARD_STOPS.length,
    nextSafeClosureCandidates: P66_FULL_IMPLEMENTATION_NEXT_SAFE_CLOSURE_CANDIDATES,
    nextSafeClosureCandidateCount: P66_FULL_IMPLEMENTATION_NEXT_SAFE_CLOSURE_CANDIDATES.length,
    commandsExecutedByAccounting: false,
    filesReadByAccounting: false,
    runtimeStoresReadByAccounting: false,
    durableStateTouchedByAccounting: false,
    readinessClaimedByAccounting: false
  };
}

const P66_SOURCE_REGISTRY_REQUIRED_IDS = [
  'committed_fixture_evidence',
  'committed_contract_test_evidence',
  'static_report_shape_evidence',
  'explicit_sanitized_runtime_summary_evidence',
  'local_allowlisted_runner_evidence',
  'runtime_write_boundary_guard_evidence'
];

const P66_SOURCE_REGISTRY_FAIL_CLOSED_REASONS = [
  'malformed_input',
  'schema_version_mismatch',
  'policy_version_mismatch',
  'manifest_version_mismatch',
  'public_mcp_tools_drift',
  'non_exact_source_registry',
  'duplicate_source_registry_id',
  'source_claims_runtime_authority',
  'source_claims_readiness_authority',
  'unsafe_no_touch_boundary',
  'readiness_overclaim'
];

const P66_EVIDENCE_FRESHNESS_REQUIRED_FIELDS = [
  'evidence_id',
  'source_id',
  'source_kind',
  'source_registry_version',
  'baseline_commit',
  'evidence_generated_at',
  'evidence_validated_at',
  'evidence_observed_hash',
  'validation_status',
  'validation_ref'
];

const P66_EVIDENCE_FRESHNESS_FAIL_CLOSED_REASONS = [
  'malformed_input',
  'schema_version_mismatch',
  'policy_version_mismatch',
  'manifest_version_mismatch',
  'public_mcp_tools_drift',
  'missing_explicit_as_of',
  'missing_expected_baseline_commit',
  'missing_expected_source_registry_version',
  'missing_evidence_record',
  'missing_required_freshness_field',
  'duplicate_evidence_id',
  'non_iso8601_utc_timestamp',
  'generated_after_validated',
  'validated_after_as_of',
  'baseline_commit_mismatch',
  'source_registry_version_mismatch',
  'validation_status_not_passed',
  'missing_freshness_window',
  'expired_freshness_window',
  'unsafe_low_risk_summary',
  'unsafe_no_touch_boundary',
  'readiness_overclaim'
];

const P66_BASELINE_BINDING_REQUIRED_FIELDS = [
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
];

const P66_BASELINE_BINDING_KINDS = [
  'rc_target_commit',
  'local_validation_target_commit',
  'temporary_gate_execution_checkout',
  'docs_only_approval_state'
];

const P66_BASELINE_BINDING_FAIL_CLOSED_REASONS = [
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
];

const P66_RUNTIME_EVIDENCE_SUMMARY_NORMALIZATION_REQUIRED_FIELDS = [
  'status',
  'decision',
  'runnerExecuted',
  'commandsExecuted',
  'localRuntimeEvidenceMatrixExecuted',
  'allowlistedFinalRcEvidenceRunnerExecuted',
  'criticalGates',
  'locallyEvidencedRuntimeGaps',
  'remainingRuntimeGaps',
  'safety'
];

const P66_RUNTIME_EVIDENCE_SUMMARY_NORMALIZATION_FAIL_CLOSED_REASONS = [
  'malformed_input',
  'schema_version_mismatch',
  'policy_version_mismatch',
  'manifest_version_mismatch',
  'public_mcp_tools_drift',
  'missing_runtime_evidence_summary',
  'missing_required_summary_field',
  'invalid_critical_gates',
  'unsafe_low_risk_summary',
  'unsafe_summary_rejected',
  'sensitive_fragment_rejected',
  'readiness_overclaim'
];

const P66_MISSING_STALE_EVIDENCE_REQUIRED_GROUPS = [
  'source_registry_exact_set_proof',
  'evidence_freshness_proof',
  'baseline_binding_proof',
  'runtime_evidence_summary_normalization_proof',
  'missing_or_stale_evidence_fail_closed_proof',
  'unsupported_source_fail_closed_proof',
  'no_touch_boundary_proof',
  'readiness_overclaim_rejection_proof'
];

const P66_MISSING_STALE_EVIDENCE_FAIL_CLOSED_REASONS = [
  'malformed_input',
  'schema_version_mismatch',
  'policy_version_mismatch',
  'manifest_version_mismatch',
  'public_mcp_tools_drift',
  'missing_required_evidence_group',
  'stale_evidence_group',
  'duplicate_evidence_group',
  'unknown_evidence_group',
  'unsafe_low_risk_summary',
  'unsafe_safety_flag',
  'sensitive_fragment_rejected',
  'readiness_overclaim'
];

const P66_UNSUPPORTED_SOURCE_FAIL_CLOSED_CASES = [
  'unsupported_source_type',
  'unsupported_source_class',
  'unknown_source_kind',
  'runtime_source_without_a5_approval',
  'provider_source_without_a5_approval',
  'real_memory_source_without_a5_approval',
  'durable_write_source_without_a5_approval',
  'migration_apply_source_without_a5_approval',
  'public_mcp_expansion_source_without_a5_approval',
  'readiness_claim_without_authority',
  'a5_action_without_approval'
];

const P66_UNSUPPORTED_SOURCE_FAIL_CLOSED_REASONS = [
  'malformed_input',
  'schema_version_mismatch',
  'policy_version_mismatch',
  'manifest_version_mismatch',
  'public_mcp_tools_drift',
  'supported_source_type_drift',
  'supported_source_class_drift',
  'missing_required_fail_closed_case',
  'duplicate_fail_closed_case',
  'unknown_fail_closed_case',
  'unsupported_source_accepted',
  'unsupported_source_downgraded',
  'runtime_source_without_a5_not_blocked',
  'unsafe_low_risk_summary',
  'unsafe_safety_flag',
  'sensitive_fragment_rejected',
  'readiness_overclaim'
];

const P66_NO_TOUCH_BOUNDARY_TARGET_FAMILIES = [
  'validation_aggregator_service',
  'validation_aggregator_proof_helpers',
  'final_rc_runner_helpers',
  'governance_contract_helpers',
  'evidence_contract_helpers'
];

const P66_NO_TOUCH_BOUNDARY_DISALLOWED_IMPORTS = [
  'fs',
  'node:fs',
  'child_process',
  'node:child_process',
  'http',
  'node:http',
  'https',
  'node:https',
  'net',
  'node:net',
  'tls',
  'node:tls',
  'dgram',
  'node:dgram',
  'node:sqlite',
  'sqlite3',
  'better-sqlite3',
  'src/storage',
  'src/recall',
  'src/adapters'
];

const P66_NO_TOUCH_BOUNDARY_DISALLOWED_RUNTIME_CALLS = [
  'readFileSync',
  'readdirSync',
  'opendirSync',
  'createReadStream',
  'writeFileSync',
  'appendFileSync',
  'createWriteStream',
  'mkdirSync',
  'rmSync',
  'unlinkSync',
  'spawn',
  'spawnSync',
  'exec',
  'execFile',
  'execSync',
  'execFileSync',
  'fork',
  'fetch',
  'request',
  'connect'
];

const P66_NO_TOUCH_BOUNDARY_FAIL_CLOSED_CASES = [
  'missing_no_touch_proof',
  'unsafe_import_detected',
  'unsafe_runtime_call_detected',
  'fs_read_detected',
  'fs_write_detected',
  'command_execution_detected',
  'network_call_detected',
  'runtime_store_import_detected',
  'storage_recall_adapter_import_detected',
  'provider_call_claim',
  'service_start_claim',
  'real_memory_scan_claim',
  'durable_write_claim',
  'public_mcp_expansion_claim',
  'readiness_claim_without_authority',
  'a5_action_without_approval'
];

const P66_NO_TOUCH_BOUNDARY_FAIL_CLOSED_REASONS = [
  'malformed_input',
  'schema_version_mismatch',
  'policy_version_mismatch',
  'manifest_version_mismatch',
  'public_mcp_tools_drift',
  'target_family_drift',
  'disallowed_import_set_drift',
  'disallowed_runtime_call_set_drift',
  'missing_required_fail_closed_case',
  'duplicate_fail_closed_case',
  'unknown_fail_closed_case',
  'unsafe_case_not_blocked',
  'unsafe_low_risk_summary',
  'unsafe_safety_flag',
  'sensitive_fragment_rejected',
  'readiness_overclaim'
];

const P66_READINESS_OVERCLAIM_REQUIRED_CLAIMS = [
  'validation-aggregator-full-implementation-ready',
  'runtime-ready',
  'final-rc-matrix-ready',
  'v1-rc-ready',
  'rc-ready',
  'cutover-ready'
];

const P66_READINESS_OVERCLAIM_FAIL_CLOSED_CASES = [
  'missing_readiness_overclaim_rejection_proof',
  'partial_evidence_claims_validation_aggregator_full_implementation',
  'static_evidence_claims_runtime_ready',
  'fixture_evidence_claims_final_rc_matrix_ready',
  'stale_gate_evidence_claims_v1_rc_ready',
  'local_runner_evidence_claims_rc_ready',
  'runtime_gap_count_nonzero_claims_ready',
  'a5_hard_stop_count_nonzero_claims_ready',
  'public_mcp_expansion_claims_ready',
  'validate_memory_public_claims_ready',
  'config_switch_claims_cutover_ready',
  'startup_watchdog_claims_cutover_ready',
  'provider_call_claims_ready',
  'real_memory_preview_claims_ready',
  'durable_write_claims_ready',
  'migration_apply_claims_ready',
  'import_export_apply_claims_ready',
  'tag_release_deploy_claims_ready'
];

const P66_READINESS_OVERCLAIM_ALLOWED_EVIDENCE_POSTURE = [
  'fixture_acceptance_defined',
  'pure_helper_available',
  'static_report_shape_evidence',
  'sanitized_local_command_evidence_recorded'
];

const P66_READINESS_OVERCLAIM_DISALLOWED_READINESS_POSTURE = [
  'runtime_collector_complete',
  'runtime_gap_zero_count',
  'a5_hard_stop_zero_count',
  'final_rc_matrix_ready',
  'v1_rc_ready',
  'rc_ready',
  'cutover_ready'
];

const P66_READINESS_OVERCLAIM_FAIL_CLOSED_REASONS = [
  'malformed_input',
  'schema_version_mismatch',
  'policy_version_mismatch',
  'manifest_version_mismatch',
  'public_mcp_tools_drift',
  'missing_required_readiness_claim',
  'duplicate_readiness_claim',
  'unknown_readiness_claim',
  'readiness_claim_not_rejected',
  'missing_required_fail_closed_case',
  'duplicate_fail_closed_case',
  'unknown_fail_closed_case',
  'runtime_gap_count_overclaim',
  'a5_hard_stop_count_overclaim',
  'evidence_posture_drift',
  'readiness_posture_drift',
  'unsafe_low_risk_summary',
  'unsafe_safety_flag',
  'sensitive_fragment_rejected',
  'readiness_overclaim'
];

const P66_GOVERNANCE_RUNTIME_LOOP_STAGE_IDS = [
  'review_packet_intake',
  'approval_packet_evaluation',
  'audit_evidence_shape_evaluation',
  'execution_gate_evaluation',
  'durable_write_gate',
  'post_action_evidence_gate'
];

const P66_GOVERNANCE_RUNTIME_LOOP_REQUIRED_EVIDENCE_GROUPS = [
  'review_packet_intake_runtime_evidence',
  'approval_packet_evaluation_runtime_evidence',
  'audit_evidence_shape_runtime_evidence',
  'execution_gate_runtime_evidence',
  'durable_write_gate_runtime_evidence',
  'post_action_evidence_runtime_evidence',
  'governance_loop_no_touch_boundary_proof',
  'governance_loop_readiness_overclaim_rejection_proof'
];

const P66_GOVERNANCE_RUNTIME_LOOP_APPROVAL_STATES = [
  'reviewed_not_approved',
  'approval_missing',
  'approval_unknown',
  'approval_warning_only',
  'approval_expired_or_stale',
  'approval_scope_mismatch',
  'approval_without_a5_runtime_authority'
];

const P66_GOVERNANCE_RUNTIME_LOOP_FAIL_CLOSED_CASES = [
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
];

const P66_GOVERNANCE_RUNTIME_LOOP_DISALLOWED_WORK = [
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
];

const P66_GOVERNANCE_RUNTIME_LOOP_FAIL_CLOSED_REASONS = [
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
];

const P66_RECALL_ISOLATION_RECORD_FAMILIES = [
  'governance_records',
  'validation_transcripts',
  'redaction_samples',
  'policy_decisions',
  'readiness_reports',
  'migration_metadata',
  'blocked_memory',
  'tombstoned_memory',
  'out_of_scope_memory'
];

const P66_RECALL_ISOLATION_PROOF_SURFACES = [
  'normal_recall_namespace',
  'vector_index',
  'candidate_cache',
  'ranking',
  'projection',
  'user_visible_audit_summary',
  'recall_audit_summary'
];

const P66_RECALL_ISOLATION_REQUIRED_RUNTIME_EVIDENCE_GROUPS = [
  'synthetic_runtime_harness_plan',
  'instrumented_namespace_assertions',
  'vector_exclusion_assertions',
  'candidate_cache_exclusion_assertions',
  'ranking_exclusion_assertions',
  'projection_exclusion_assertions',
  'user_visible_audit_summary_exclusion_assertions',
  'recall_audit_summary_exclusion_assertions',
  'negative_controls_for_isolated_record_families',
  'positive_control_for_active_in_scope_user_memory',
  'no_durable_write_evidence',
  'no_public_mcp_expansion_evidence',
  'machine_readable_contamination_report'
];

const P66_RECALL_ISOLATION_CONTROL_CASES = [
  'active_in_scope_user_memory_positive_control',
  'isolated_record_negative_controls'
];

const P66_RECALL_ISOLATION_FAIL_CLOSED_CASES = [
  'missing_isolated_record_family',
  'duplicate_isolated_record_family',
  'unknown_isolated_record_family',
  'missing_proof_surface',
  'duplicate_proof_surface',
  'unknown_proof_surface',
  'missing_required_runtime_evidence',
  'duplicate_runtime_evidence',
  'unknown_runtime_evidence',
  'missing_positive_control',
  'missing_negative_control',
  'isolated_record_contaminates_normal_recall',
  'isolated_record_contaminates_vector_index',
  'isolated_record_contaminates_candidate_cache',
  'isolated_record_contaminates_ranking',
  'isolated_record_contaminates_projection',
  'isolated_record_contaminates_user_visible_audit_summary',
  'isolated_record_contaminates_recall_audit_summary',
  'positive_control_missing_from_normal_recall',
  'real_memory_scan_claim',
  'runtime_store_scan_claim',
  'contamination_report_from_real_data_claim',
  'durable_write_claim',
  'unsupported_source',
  'unsafe_summary_claim',
  'public_mcp_expansion_claim',
  'readiness_claim_without_authority'
];

const P66_RECALL_ISOLATION_DISALLOWED_WORK = [
  'real_memory_read',
  'real_memory_preview',
  'real_memory_export',
  'real_memory_import',
  'real_memory_scan',
  'diary_scan',
  'sqlite_scan',
  'vector_index_scan',
  'candidate_cache_scan',
  'recall_audit_scan',
  'runtime_recall_execution',
  'runtime_store_scan',
  'contamination_report_from_real_data',
  'command_execution',
  'gate_execution',
  'runner_execution',
  'service_start',
  'provider_call',
  'config_mutation',
  'startup_watchdog_operation',
  'durable_memory_writer',
  'durable_audit_writer',
  'migration_apply',
  'import_export_apply',
  'backup_restore_apply',
  'public_mcp_expansion',
  'validate_memory_public_exposure',
  'package_lockfile_change',
  'env_secret_change',
  'push',
  'tag',
  'release',
  'deploy',
  'rc_ready_claim'
];

const P66_RECALL_ISOLATION_FAIL_CLOSED_REASONS = [
  'malformed_input',
  'schema_version_mismatch',
  'policy_version_mismatch',
  'manifest_version_mismatch',
  'public_mcp_tools_drift',
  'selected_gap_drift',
  'source_plan_drift',
  'isolated_record_family_drift',
  'proof_surface_drift',
  'control_case_drift',
  'missing_required_runtime_evidence',
  'duplicate_runtime_evidence',
  'unknown_runtime_evidence',
  'runtime_evidence_not_missing',
  'missing_required_fail_closed_case',
  'duplicate_fail_closed_case',
  'unknown_fail_closed_case',
  'disallowed_work_drift',
  'unsafe_safety_flag',
  'sensitive_fragment_rejected',
  'readiness_overclaim'
];

const EVIDENCE_SOURCES = {
  decision: {
    source_type: 'aggregator',
    source_ref: 'ValidationAggregatorService',
    reason: 'decision derived from unresolved blockers'
  },
  blockers: {
    source_type: 'aggregator',
    source_ref: 'ValidationAggregatorService blockers[]',
    reason: 'blockers derived from unresolved validation, runtime, and A5-gated items'
  },
  a4_safe_slice: {
    source_type: 'doc',
    source_ref: 'docs/P23_12_FINAL_RC_VALIDATION_MATRIX_A4_SAFE_EXECUTION.md',
    status: 'A4_SAFE_SLICE_PASSED'
  },
  full_final_rc_matrix: {
    source_type: 'doc',
    source_ref: 'docs/P23_12_FINAL_RC_VALIDATION_MATRIX_A4_SAFE_EXECUTION.md',
    status: 'not_executed'
  },
  schema_version_runtime_enforcement: {
    source_type: 'runtime_write_boundary_guard',
    source_ref: 'src/core/MemoryWriteService.js / tests/schema-version-runtime-boundary.test.js',
    status: 'runtime_write_boundary_guard_added'
  },
  schema_version_policy_fixture: {
    source_type: 'fixture_contract',
    source_ref: 'tests/fixtures/schema-version-policy-v1.json',
    status: 'fixture_contract_added'
  },
  schema_version_policy_helper: {
    source_type: 'explicit_input_policy_helper',
    source_ref: 'src/core/SchemaVersionPolicy.js / tests/schema-version-policy-runtime.test.js',
    status: 'helper_added_runtime_not_integrated'
  },
  schema_version_runtime_boundary_guard: {
    source_type: 'fixture_backed_runtime_boundary_test',
    source_ref: 'tests/schema-version-runtime-boundary.test.js',
    status: 'boundary_guard_added_runtime_not_integrated'
  },
  schema_compatibility_dry_run_cli: {
    source_type: 'fixture_only_cli_contract',
    source_ref: 'src/cli/schema-compatibility-dry-run.js / tests/schema-compatibility-dry-run-cli.test.js / tests/fixtures/schema-compatibility-dry-run-v1.json',
    status: 'fixture_only_cli_added_not_executed'
  },
  migration_import_export_dry_run_gate_cli: {
    source_type: 'fixture_only_cli_contract',
    source_ref: 'src/cli/migration-import-export-dry-run-gate.js / tests/migration-import-export-dry-run-gate-cli.test.js / tests/fixtures/migration-import-export-dry-run-gate-v1.json',
    status: 'fixture_only_cli_added_not_executed'
  },
  migration_import_export_approval_packet_cli: {
    source_type: 'fixture_only_cli_contract',
    source_ref: 'src/cli/migration-import-export-approval-packet.js / tests/migration-import-export-approval-packet-cli.test.js / tests/fixtures/migration-import-export-approval-packet-v1.json',
    status: 'fixture_only_cli_added_not_executed'
  },
  final_rc_validation_matrix_manifest_helper: {
    source_type: 'explicit_input_manifest_helper',
    source_ref: 'src/core/FinalRcValidationMatrixManifest.js / tests/final-rc-validation-matrix-runner-manifest-helper.test.js / tests/fixtures/final-rc-validation-matrix-runner-safe-scope-v1.json',
    status: 'helper_added_report_shape_only_not_executed'
  },
  memory_governance_lifecycle_contract_helper: {
    source_type: 'explicit_input_governance_helper',
    source_ref: 'src/core/MemoryGovernanceLifecycleContract.js / tests/memory-governance-lifecycle-contract-helper.test.js / tests/fixtures/memory-governance-lifecycle-contract-v1.json',
    status: 'helper_added_report_shape_only_not_executed'
  },
  memory_governance_approval_packet_contract_helper: {
    source_type: 'explicit_input_governance_approval_packet_helper',
    source_ref: 'src/core/MemoryGovernanceApprovalPacketContract.js / tests/memory-governance-approval-packet-helper.test.js / tests/fixtures/memory-governance-approval-packet-v1.json',
    status: 'helper_added_report_shape_only_not_executed'
  },
  memory_governance_audit_evidence_contract_helper: {
    source_type: 'explicit_input_governance_audit_evidence_helper',
    source_ref: 'src/core/MemoryGovernanceAuditEvidenceContract.js / tests/memory-governance-audit-evidence-helper.test.js / tests/fixtures/memory-governance-audit-evidence-v1.json',
    status: 'helper_added_report_shape_only_not_executed'
  },
  memory_governance_review_surface_contract_helper: {
    source_type: 'explicit_input_governance_review_surface_helper',
    source_ref: 'src/core/MemoryGovernanceReviewSurfaceContract.js / tests/memory-governance-review-surface-helper.test.js / tests/fixtures/memory-governance-review-surface-v1.json',
    status: 'helper_added_report_shape_only_not_executed'
  },
  p36_scope_a5_boundary_contract: {
    source_type: 'committed_fixture',
    source_ref: 'docs/P36_SCOPE_A5_BOUNDARY_CONTRACT.md / tests/p36-scope-a5-boundary-contract-fixture.test.js / tests/fixtures/p36-scope-a5-boundary-contract-v1.json',
    status: 'fixture_contract_added_not_runtime_ready',
    sourceMode: 'static_reference_only',
    acceptedForPlanning: false,
    fixtureReadByAggregator: false,
    testExecutedByAggregator: false,
    helperExecutedByAggregator: false,
    observedFromRuntime: false
  },
  p36_task_risk_labels_contract: {
    source_type: 'committed_fixture',
    source_ref: 'docs/P36_TASK_RISK_LABELS_CONTRACT.md / tests/p36-task-risk-labels-contract-fixture.test.js / tests/fixtures/p36-task-risk-labels-contract-v1.json',
    status: 'fixture_contract_added_not_runtime_ready',
    sourceMode: 'static_reference_only',
    acceptedForPlanning: false,
    fixtureReadByAggregator: false,
    testExecutedByAggregator: false,
    helperExecutedByAggregator: false,
    observedFromRuntime: false
  },
  p37_policy_decision_envelope_fixture_matrix: {
    source_type: 'committed_fixture',
    source_ref: 'docs/P37_POLICY_DECISION_ENVELOPE_FIXTURE_MATRIX.md / tests/p37-policy-decision-envelope-fixture.test.js / tests/fixtures/p37-policy-decision-envelope-v1.json',
    status: 'fixture_contract_added_not_runtime_ready',
    sourceMode: 'static_reference_only',
    acceptedForPlanning: false,
    fixtureReadByAggregator: false,
    testExecutedByAggregator: false,
    helperExecutedByAggregator: false,
    observedFromRuntime: false
  },
  p38_recall_isolation_fixture: {
    source_type: 'committed_fixture',
    source_ref: 'docs/P38_RECALL_ISOLATION_FIXTURES.md / tests/p38-recall-isolation-fixture.test.js / tests/fixtures/p38-recall-isolation-v1.json',
    status: 'fixture_contract_added_not_runtime_ready',
    sourceMode: 'static_reference_only',
    acceptedForPlanning: false,
    fixtureReadByAggregator: false,
    testExecutedByAggregator: false,
    helperExecutedByAggregator: false,
    observedFromRuntime: false
  },
  p39_synthetic_migration_dry_run_contract: {
    source_type: 'committed_fixture',
    source_ref: 'docs/P39_SYNTHETIC_MIGRATION_DRY_RUN_CONTRACT.md / tests/p39-synthetic-migration-dry-run-fixture.test.js / tests/fixtures/p39-synthetic-migration-dry-run-v1.json',
    status: 'fixture_contract_added_not_runtime_ready',
    sourceMode: 'static_reference_only',
    acceptedForPlanning: false,
    fixtureReadByAggregator: false,
    testExecutedByAggregator: false,
    helperExecutedByAggregator: false,
    observedFromRuntime: false
  },
  p40_local_readiness_report: {
    source_type: 'committed_fixture',
    source_ref: 'docs/P40_LOCAL_READINESS_REPORT.md / tests/p40-local-readiness-report-fixture.test.js / tests/fixtures/p40-local-readiness-report-v1.json',
    status: 'local_evidence_report_added_not_runtime_ready',
    sourceMode: 'static_reference_only',
    acceptedForPlanning: false,
    fixtureReadByAggregator: false,
    testExecutedByAggregator: false,
    helperExecutedByAggregator: false,
    observedFromRuntime: false
  },
  p36_p40_evidence_source_map: {
    source_type: 'local_validation_summary',
    source_ref: 'ValidationAggregatorService evidence.p36P40EvidenceSourceMap',
    status: 'static_report_shape_added_not_executed',
    sourceMode: 'static_reference_only',
    acceptedForPlanning: false,
    fixtureReadByAggregator: false,
    testExecutedByAggregator: false,
    helperExecutedByAggregator: false,
    observedFromRuntime: false
  },
  p45_final_rc_matrix_evaluator_posture: {
    source_type: 'local_validation_summary',
    source_ref: 'ValidationAggregatorService evidence.p45FinalRcMatrixEvaluatorPosture',
    status: 'static_report_shape_added_not_executed',
    sourceMode: 'static_reference_only',
    acceptedForPlanning: false,
    fixtureReadByAggregator: false,
    evaluatorImportedByAggregator: false,
    evaluatorExecutedByAggregator: false,
    runnerExecutedByAggregator: false,
    observedFromRuntime: false
  },
  public_mcp_tools: {
    source_type: 'code_contract',
    source_ref: 'src/core/constants.js',
    status: 'frozen_three_tool_contract'
  },
  a5_gated_actions: {
    source_type: 'governance',
    source_ref: 'STATUS.md / CODEX_MEMORY_NEXT_PHASE_PLAN.md',
    status: 'blocked_pending_a5'
  },
  conditional_live_mcp_http: {
    source_type: 'runtime_condition',
    source_ref: 'P23.12 conditional live MCP/HTTP validation notes',
    status: 'not_executed_service_not_running'
  },
  validation_aggregator_full_implementation: {
    source_type: 'runtime_gap',
    source_ref: 'docs/P24_VALIDATION_AGGREGATOR_IMPLEMENTATION_PLAN.md',
    status: 'minimal_only'
  },
  validation_evidence_reader: {
    source_type: 'explicit_safe_input_contract',
    source_ref: 'ValidationAggregatorService validationEvidenceSources[]',
    status: 'foundation_added_read_only'
  },
  p53_validation_aggregator_evidence_inventory: {
    source_type: 'static_aggregator_report_shape',
    source_ref: 'ValidationAggregatorService evidence.p53ValidationAggregatorEvidenceInventory',
    status: 'static_report_shape_added_not_executed',
    sourceMode: 'static_reference_only',
    acceptedForPlanning: false,
    fixtureReadByAggregator: false,
    testExecutedByAggregator: false,
    helperExecutedByAggregator: false,
    runnerExecutedByAggregator: false,
    observedFromRuntime: false
  }
};

function createCheck({
  status,
  requiredBeforeV1Rc = false,
  blocksV1Rc = false,
  blocksV1Release = false,
  a4Safe = false,
  a5Gated = false,
  runtimeRequired = false,
  conditionalLive = false,
  evidence = null
}) {
  return {
    status,
    requiredBeforeV1Rc,
    ...(blocksV1Rc ? { blocksV1Rc } : {}),
    ...(blocksV1Release ? { blocksV1Release } : {}),
    ...(a4Safe ? { a4Safe } : {}),
    ...(a5Gated ? { a5Gated } : {}),
    ...(runtimeRequired ? { runtimeRequired } : {}),
    ...(conditionalLive ? { conditionalLive } : {}),
    ...(evidence ? { evidence } : {})
  };
}

function buildBlocker(id, { status, category, requiresA5 = false, requiresRuntimeImplementation = false }) {
  return {
    id,
    status,
    category,
    requiresA5,
    requiresRuntimeImplementation
  };
}

function includesForbiddenEvidenceFragment(value) {
  const encoded = JSON.stringify(value ?? '').toLowerCase();
  return FORBIDDEN_EVIDENCE_FRAGMENTS.some(fragment => encoded.includes(fragment));
}

function safeEvidenceId(value, fallback) {
  if (typeof value !== 'string' || value.trim() === '') return fallback;
  if (includesForbiddenEvidenceFragment(value)) return fallback;
  return value.trim().slice(0, 120);
}

function safeEvidenceString(value, fallback = '') {
  if (typeof value !== 'string' || value.trim() === '') return fallback;
  if (includesForbiddenEvidenceFragment(value)) return '<redacted>';
  return value.trim().slice(0, 240);
}

function normalizeEvidenceCommit(value) {
  const normalized = safeEvidenceString(value).toLowerCase();
  if (!normalized) return '';
  if (!/^[0-9a-f]{7,40}$/.test(normalized)) return '';
  return normalized;
}

function deriveValidationEvidenceClass(source) {
  if (typeof source.evidence_class === 'string' && source.evidence_class.trim() !== '') {
    return safeEvidenceString(source.evidence_class);
  }
  if (source.source_type === 'committed_validation') return 'committed_evidence';
  if (source.source_type === 'local_validation') return 'local_validation';
  return '';
}

function normalizeEvidenceCommands(commands) {
  if (!Array.isArray(commands)) return [];
  return commands
    .filter(command => typeof command === 'string' && command.trim() !== '')
    .map(command => safeEvidenceString(command))
    .filter(command => command && command !== '<redacted>')
    .slice(0, 12);
}

function normalizeEvidenceStringList(values) {
  if (!Array.isArray(values)) return [];
  return values
    .filter(value => typeof value === 'string' && value.trim() !== '')
    .map(value => safeEvidenceString(value))
    .filter(value => value && value !== '<redacted>')
    .slice(0, 24);
}

function summarizeRuntimeEvidenceUnits(unitIds) {
  const normalizedUnitIds = normalizeEvidenceStringList(unitIds);
  const uniqueUnitIds = [...new Set(normalizedUnitIds)];
  const missingRequiredUnitIds = RUNTIME_EVIDENCE_SUMMARY_REQUIRED_UNIT_IDS
    .filter(id => !uniqueUnitIds.includes(id));
  const unknownUnitIds = uniqueUnitIds
    .filter(id => !RUNTIME_EVIDENCE_SUMMARY_REQUIRED_UNIT_IDS.includes(id));

  return {
    unitIds: normalizedUnitIds,
    uniqueUnitIds,
    duplicateUnitCount: normalizedUnitIds.length - uniqueUnitIds.length,
    requiredUnitIds: [...RUNTIME_EVIDENCE_SUMMARY_REQUIRED_UNIT_IDS],
    missingRequiredUnitIds,
    unknownUnitIds,
    complete:
      missingRequiredUnitIds.length === 0 &&
      unknownUnitIds.length === 0 &&
      normalizedUnitIds.length === uniqueUnitIds.length
  };
}

function buildRuntimeEvidenceUnitRejectedSummary(empty, evidenceUnitSummary, rejectReason) {
  return {
    ...empty,
    status: 'runtime_evidence_summary_rejected',
    rejected: true,
    rejectReason,
    summary: {
      ...empty.summary,
      evidenceUnitCount: evidenceUnitSummary.uniqueUnitIds.length,
      requiredEvidenceUnitCount: evidenceUnitSummary.requiredUnitIds.length,
      missingEvidenceUnitCount: evidenceUnitSummary.missingRequiredUnitIds.length,
      unknownEvidenceUnitCount: evidenceUnitSummary.unknownUnitIds.length,
      duplicateEvidenceUnitCount: evidenceUnitSummary.duplicateUnitCount,
      evidenceUnitsComplete: false
    },
    evidenceUnitIds: evidenceUnitSummary.uniqueUnitIds,
    requiredEvidenceUnitIds: evidenceUnitSummary.requiredUnitIds,
    missingEvidenceUnitIds: evidenceUnitSummary.missingRequiredUnitIds,
    unknownEvidenceUnitIds: evidenceUnitSummary.unknownUnitIds
  };
}

function safeEvidenceNumber(value) {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function parseEvidenceTimestamp(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function summarizeValidationEvidenceFreshness({
  acceptedSources,
  generatedAt,
  staleAfterHours = VALIDATION_EVIDENCE_STALE_AFTER_HOURS
}) {
  const referenceDate = parseEvidenceTimestamp(generatedAt);
  const staleAfterMs = staleAfterHours * 60 * 60 * 1000;
  const observedSources = acceptedSources
    .map(source => ({
      source,
      observedAt: parseEvidenceTimestamp(source.observed_at)
    }))
    .filter(item => item.observedAt);
  const staleSources = referenceDate
    ? observedSources.filter(item => referenceDate.getTime() - item.observedAt.getTime() > staleAfterMs)
    : [];
  const newestObserved = observedSources.reduce((newest, item) => {
    if (!newest || item.observedAt.getTime() > newest.getTime()) return item.observedAt;
    return newest;
  }, null);
  const failedCount = acceptedSources.filter(source => source.status === 'failed').length;
  const blockedCount = acceptedSources.filter(source => source.status === 'blocked').length;
  const warningCount = acceptedSources.filter(source => source.status === 'warning').length;
  const unknownStatusCount = acceptedSources.filter(source => source.status === 'unknown').length;
  const notExecutedCount = acceptedSources.filter(source => source.status === 'not_executed').length;
  const unknownFreshnessCount = referenceDate
    ? acceptedSources.length - observedSources.length
    : acceptedSources.length;
  const hasFailedEvidence = failedCount > 0;
  const hasBlockedEvidence = blockedCount > 0;
  const hasWarnings = warningCount > 0;
  const hasUnknownStatus = unknownStatusCount > 0 || notExecutedCount > 0;
  const hasStaleOrUnknownFreshness = staleSources.length > 0 || unknownFreshnessCount > 0;
  let overallStatus = 'no_explicit_evidence';

  if (acceptedSources.length === 0) {
    overallStatus = 'no_explicit_evidence';
  } else if (hasFailedEvidence || hasBlockedEvidence) {
    overallStatus = 'failed_or_blocked';
  } else if (hasStaleOrUnknownFreshness || hasUnknownStatus) {
    overallStatus = 'stale_or_unknown';
  } else if (hasWarnings) {
    overallStatus = 'fresh_with_warnings';
  } else {
    overallStatus = 'fresh_passed';
  }

  return {
    status: overallStatus,
    allowedStatuses: VALIDATION_EVIDENCE_FRESHNESS_STATUSES,
    referenceTime: safeEvidenceString(generatedAt, ''),
    staleAfterHours,
    sourceCount: acceptedSources.length,
    sourcesWithObservedAt: observedSources.length,
    unknownFreshnessCount,
    staleCount: staleSources.length,
    freshestObservedAt: newestObserved ? newestObserved.toISOString() : '',
    hasFailedEvidence,
    hasBlockedEvidence,
    hasWarnings,
    allAcceptedPassed: acceptedSources.length > 0 &&
      acceptedSources.every(source => source.status === 'passed')
  };
}

function summarizeValidationEvidenceGateReadiness({
  validationEvidenceReader,
  validationEvidenceFreshness,
  blockers
}) {
  const runtimeBlockers = blockers.filter(blocker => blocker.requiresRuntimeImplementation === true);
  const a5Blockers = blockers.filter(blocker => blocker.requiresA5 === true);
  const validationBlockers = blockers.filter(blocker => blocker.category === 'validation');
  const blockerIds = blockers.map(blocker => blocker.id);
  const acceptedCount = validationEvidenceReader.acceptedCount;
  const rejectedCount = validationEvidenceReader.rejectedCount;
  let status = 'not_ready_existing_blockers';

  if (acceptedCount === 0) {
    status = 'not_ready_no_explicit_evidence';
  } else if (validationEvidenceFreshness.hasFailedEvidence || validationEvidenceFreshness.hasBlockedEvidence) {
    status = 'not_ready_failed_or_blocked_evidence';
  } else if (rejectedCount > 0) {
    status = 'not_ready_rejected_evidence';
  } else if (validationEvidenceFreshness.status === 'stale_or_unknown') {
    status = 'not_ready_stale_or_unknown_evidence';
  } else if (validationEvidenceFreshness.status === 'fresh_with_warnings') {
    status = 'not_ready_warning_evidence';
  }

  return {
    status,
    allowedStatuses: VALIDATION_EVIDENCE_GATE_READINESS_STATUSES,
    sourceMode: validationEvidenceReader.sourceMode,
    decisionImpact: 'none_report_only',
    canClaimV1RcReady: false,
    readyForFinalRcMatrixRunner: false,
    acceptedEvidenceCount: acceptedCount,
    rejectedEvidenceCount: rejectedCount,
    freshnessStatus: validationEvidenceFreshness.status,
    explicitEvidenceUsable: acceptedCount > 0 &&
      rejectedCount === 0 &&
      validationEvidenceFreshness.status === 'fresh_passed',
    blockerCounts: {
      validationRequired: validationBlockers.length,
      runtimeRequired: runtimeBlockers.length,
      a5Gated: a5Blockers.length,
      totalUnresolved: blockers.length
    },
    blockedBy: blockerIds
  };
}

function classifyEvidenceCommand(command) {
  const trimmed = typeof command === 'string' ? command.trim().toLowerCase() : '';
  if (trimmed.startsWith('git ')) return 'git';
  if (trimmed.startsWith('node ')) return 'node';
  if (trimmed.startsWith('npm ')) return 'npm';
  return 'other';
}

function summarizeValidationEvidenceCommandCoverage(validationEvidenceReader) {
  const acceptedSources = validationEvidenceReader.acceptedSources;
  const sourceTypesCovered = [...new Set(acceptedSources.map(source => source.source_type))].sort();
  const sourceClassesCovered = [...new Set(acceptedSources.map(source => source.evidence_class))].sort();
  const allCommands = acceptedSources.flatMap(source => source.commands);
  const uniqueCommands = [...new Set(allCommands)].sort();
  const sourcesWithCommands = acceptedSources.filter(source => source.commands.length > 0);
  const commandFamilies = uniqueCommands.reduce((counts, command) => {
    const family = classifyEvidenceCommand(command);
    return {
      ...counts,
      [family]: counts[family] + 1
    };
  }, {
    git: 0,
    node: 0,
    npm: 0,
    other: 0
  });
  let status = 'no_explicit_evidence';

  if (acceptedSources.length === 0) {
    status = 'no_explicit_evidence';
  } else if (sourcesWithCommands.length === 0) {
    status = 'command_coverage_missing';
  } else if (sourcesWithCommands.length < acceptedSources.length) {
    status = 'command_coverage_partial';
  } else {
    status = 'command_coverage_present';
  }

  return {
    status,
    allowedStatuses: VALIDATION_EVIDENCE_COMMAND_COVERAGE_STATUSES,
    sourceMode: validationEvidenceReader.sourceMode,
    executesCommands: false,
    commandTextSanitized: true,
    acceptedEvidenceCount: acceptedSources.length,
    sourcesWithCommands: sourcesWithCommands.length,
    sourcesWithoutCommands: acceptedSources.length - sourcesWithCommands.length,
    commandCount: allCommands.length,
    uniqueCommandCount: uniqueCommands.length,
    sourceTypesCovered,
    sourceClassesCovered,
    requiredSourceTypesCovered: VALIDATION_EVIDENCE_SOURCE_TYPES.every(sourceType =>
      sourceTypesCovered.includes(sourceType)
    ),
    runtimeEvidenceAccepted: sourceClassesCovered.includes('runtime_evidence'),
    finalRcMatrixEvidenceAccepted: sourceClassesCovered.includes('final_rc_matrix_evidence'),
    commandFamilies,
    allAcceptedHaveCommands: acceptedSources.length > 0 &&
      sourcesWithCommands.length === acceptedSources.length
  };
}

function summarizeValidationEvidenceRejections(validationEvidenceReader) {
  const rejectedSources = validationEvidenceReader.rejectedSources;
  const reasonCounts = VALIDATION_EVIDENCE_REJECTION_REASONS.reduce((counts, reason) => ({
    ...counts,
    [reason]: rejectedSources.filter(source => source.reason === reason).length
  }), {});
  let status = 'no_rejections';

  if (rejectedSources.length > 0 && validationEvidenceReader.acceptedCount === 0) {
    status = 'all_inputs_rejected';
  } else if (rejectedSources.length > 0) {
    status = 'rejections_present';
  }

  return {
    status,
    allowedStatuses: VALIDATION_EVIDENCE_REJECTION_SUMMARY_STATUSES,
    knownReasons: VALIDATION_EVIDENCE_REJECTION_REASONS,
    rejectedCount: rejectedSources.length,
    acceptedCount: validationEvidenceReader.acceptedCount,
    reasonCounts,
    hasSensitiveRejection: reasonCounts.sensitive_fragment_rejected > 0,
    hasSideEffectRejection: reasonCounts.side_effect_evidence_rejected > 0,
    hasUnsupportedContractRejection: reasonCounts.unsupported_source_type > 0 ||
      reasonCounts.unsupported_source_class > 0 ||
      reasonCounts.unsupported_status > 0 ||
      reasonCounts.invalid_source_shape > 0,
    rawRejectedInputExposed: false,
    rejectsUnsafeInputs: true
  };
}

function summarizeValidationEvidenceConfidencePosture({
  validationEvidenceReader,
  validationEvidenceFreshness,
  validationEvidenceGateReadiness,
  validationEvidenceCommandCoverage,
  validationEvidenceRejectionSummary
}) {
  const acceptedCount = validationEvidenceReader.acceptedCount;
  let status = 'usable_but_blocked';
  const limitations = [];

  if (acceptedCount === 0 && validationEvidenceRejectionSummary.rejectedCount === 0) {
    status = 'no_explicit_evidence';
    limitations.push('no_explicit_validation_evidence');
  } else if (validationEvidenceFreshness.status === 'failed_or_blocked') {
    status = 'failed_or_blocked_signal';
    limitations.push('failed_or_blocked_evidence_present');
  } else if (
    validationEvidenceRejectionSummary.rejectedCount > 0 ||
    validationEvidenceGateReadiness.status === 'not_ready_rejected_evidence'
  ) {
    status = 'rejected_or_unsafe_signal';
    limitations.push('rejected_explicit_evidence_present');
  } else if (validationEvidenceFreshness.status === 'stale_or_unknown') {
    status = 'stale_or_unknown_signal';
    limitations.push('stale_or_unknown_freshness');
  } else if (
    validationEvidenceFreshness.status === 'fresh_with_warnings' ||
    validationEvidenceCommandCoverage.status !== 'command_coverage_present'
  ) {
    status = 'partial_signal';
    limitations.push('warning_or_partial_command_coverage');
  }

  limitations.push('full_final_rc_matrix_not_executed');
  limitations.push('runtime_schema_version_enforcement_missing');
  limitations.push('validation_aggregator_full_implementation_incomplete');
  limitations.push('a5_actions_blocked');

  return {
    status,
    allowedStatuses: VALIDATION_EVIDENCE_CONFIDENCE_POSTURE_STATUSES,
    sourceMode: validationEvidenceReader.sourceMode,
    decisionImpact: 'none_report_only',
    canClaimV1RcReady: false,
    confidenceSignal: status === 'usable_but_blocked'
      ? 'usable_explicit_evidence'
      : 'limited_explicit_evidence',
    acceptedEvidenceCount: acceptedCount,
    rejectedEvidenceCount: validationEvidenceRejectionSummary.rejectedCount,
    freshnessStatus: validationEvidenceFreshness.status,
    gateReadinessStatus: validationEvidenceGateReadiness.status,
    commandCoverageStatus: validationEvidenceCommandCoverage.status,
    rejectionStatus: validationEvidenceRejectionSummary.status,
    limitations
  };
}

function hasUnsafeEvidenceSideEffect(source) {
  const safety = source && typeof source.safety === 'object' && source.safety
    ? source.safety
    : {};

  return safety.mutated === true ||
    Number(safety.providerCalls || 0) > 0 ||
    safety.serviceStarted === true ||
    safety.durableMemoryTouched === true ||
    safety.realMemoryPreview === true ||
    safety.migrationApplied === true ||
    safety.importExportApplied === true ||
    safety.watchdogStartupInstalled === true ||
    safety.configChanged === true ||
    safety.pushed === true ||
    safety.tagged === true ||
    safety.released === true ||
    safety.deployed === true;
}

function normalizeRuntimeEvidenceSummary(summary = null, {
  generatedAt = new Date().toISOString(),
  staleAfterHours = RUNTIME_EVIDENCE_SUMMARY_STALE_AFTER_HOURS
} = {}) {
  const contract = {
    sourceMode: 'explicit_sanitized_summary_only',
    readsFiles: false,
    executesCommands: false,
    startsServices: false,
    callsProviders: false,
    mutatesDurableState: false,
    acceptsRealMemoryPreview: false,
    acceptsRuntimeReadyClaim: false,
    acceptsFinalRcReadyClaim: false,
    acceptsV1RcReadyClaim: false
  };
  const empty = {
    status: 'no_explicit_runtime_evidence_summary',
    allowedStatuses: RUNTIME_EVIDENCE_SUMMARY_STATUSES,
    implemented: true,
    fullImplementation: false,
    sourceMode: contract.sourceMode,
    accepted: false,
    rejected: false,
    rejectReason: '',
    contract,
    summary: {
      sourceStatus: '',
      sourceDecision: '',
      runnerExecuted: false,
      commandsExecutedBySource: false,
      commandsExecutedByAggregator: false,
      localRuntimeEvidenceMatrixExecutedBySource: false,
      allowlistedFinalRcEvidenceRunnerExecutedBySource: false,
      finalRcMatrixExecutedBySource: false,
      fullFinalRcMatrixExecutedBySource: false,
      finalRcMatrixReady: false,
      runtimeReady: false,
      v1RcReady: false,
      rcReady: false,
      allCriticalCommandsPassed: false,
      criticalGateCount: 0,
      criticalGatePassedCount: 0,
      criticalGateFailedCount: 0,
      locallyEvidencedRuntimeGapCount: 0,
      remainingRuntimeGapCount: 0,
      currentHeadBindingStatus: 'not_provided',
      currentHeadBindingMatched: false,
      currentHeadCommit: '',
      expectedCurrentHeadCommit: '',
      evidenceGeneratedAt: '',
      evidenceFreshnessStatus: 'not_provided',
      evidenceAgeHours: null,
      evidenceUnitCount: 0,
      requiredEvidenceUnitCount: RUNTIME_EVIDENCE_SUMMARY_REQUIRED_UNIT_IDS.length,
      missingEvidenceUnitCount: RUNTIME_EVIDENCE_SUMMARY_REQUIRED_UNIT_IDS.length,
      unknownEvidenceUnitCount: 0,
      duplicateEvidenceUnitCount: 0,
      evidenceUnitsComplete: false,
      providerCalls: 0,
      mutated: false,
      noProvider: true,
      noDurableMemoryWrite: true,
      noRealMemoryPreview: true,
      noRemoteWrite: true
    },
    locallyEvidencedRuntimeGaps: [],
    remainingRuntimeGaps: [],
    evidenceUnitIds: [],
    requiredEvidenceUnitIds: [...RUNTIME_EVIDENCE_SUMMARY_REQUIRED_UNIT_IDS],
    missingEvidenceUnitIds: [...RUNTIME_EVIDENCE_SUMMARY_REQUIRED_UNIT_IDS],
    unknownEvidenceUnitIds: [],
    decisionImpact: 'none_report_only',
    canClaimRuntimeReady: false,
    canClaimFinalRcReady: false,
    canClaimV1RcReady: false
  };

  if (!summary) return empty;

  if (typeof summary !== 'object' || Array.isArray(summary)) {
    return {
      ...empty,
      status: 'runtime_evidence_summary_rejected',
      rejected: true,
      rejectReason: 'invalid_summary_shape'
    };
  }

  if (includesForbiddenEvidenceFragment(summary)) {
    return {
      ...empty,
      status: 'runtime_evidence_summary_rejected',
      rejected: true,
      rejectReason: 'sensitive_fragment_rejected'
    };
  }

  const safety = summary.safety && typeof summary.safety === 'object'
    ? summary.safety
    : {};
  const providerCalls = Number(safety.providerCalls ?? safety.callsProviders ?? summary.providerCalls ?? 0);
  const mutated = safety.mutated === true || summary.mutated === true;
  const durableWrite = safety.writesDurableMemory === true ||
    safety.durableMemoryTouched === true ||
    safety.durableMemoryWrite === true;
  const realMemoryPreview = safety.realMemoryPreview === true ||
    safety.readsRealMemory === true ||
    safety.realMemoryPreviewed === true;
  const remoteWrite = safety.remoteWrites === true ||
    safety.pushed === true ||
    safety.tagged === true ||
    safety.released === true ||
    safety.deployed === true;

  if (
    mutated ||
    Number(providerCalls || 0) > 0 ||
    safety.serviceStarted === true ||
    durableWrite ||
    realMemoryPreview ||
    remoteWrite ||
    safety.migrationApplied === true ||
    safety.importExportApplied === true ||
    safety.configChanged === true ||
    safety.watchdogStartupInstalled === true
  ) {
    return {
      ...empty,
      status: 'runtime_evidence_summary_rejected',
      rejected: true,
      rejectReason: 'unsafe_summary_rejected'
    };
  }

  if (
    summary.runtimeReady === true ||
    summary.finalRcMatrixReady === true ||
    summary.finalRcMatrixExecuted === true ||
    summary.fullFinalRcMatrixExecuted === true ||
    summary.v1RcReady === true ||
    summary.rcReady === true
  ) {
    return {
      ...empty,
      status: 'runtime_evidence_summary_rejected',
      rejected: true,
      rejectReason: 'readiness_claim_rejected'
    };
  }

  const criticalGates = summary.criticalGates && typeof summary.criticalGates === 'object'
    ? summary.criticalGates
    : {};
  const sourceRunnerExecuted = summary.runnerExecuted === true;
  const sourceCommandsExecuted = summary.commandsExecuted === true;
  const sourceLocalRuntimeEvidenceMatrixExecuted =
    summary.localRuntimeEvidenceMatrixExecuted === true;
  const sourceAllowlistedFinalRcEvidenceRunnerExecuted =
    summary.allowlistedFinalRcEvidenceRunnerExecuted === true;
  const allCriticalCommandsPassed =
    criticalGates.allCriticalCommandsPassed === true;
  const criticalGateFailedCount = safeEvidenceNumber(criticalGates.failed);

  if (!sourceRunnerExecuted) {
    return {
      ...empty,
      status: 'runtime_evidence_summary_rejected',
      rejected: true,
      rejectReason: 'source_runner_execution_required'
    };
  }

  if (!sourceCommandsExecuted) {
    return {
      ...empty,
      status: 'runtime_evidence_summary_rejected',
      rejected: true,
      rejectReason: 'source_command_execution_required'
    };
  }

  if (!sourceLocalRuntimeEvidenceMatrixExecuted) {
    return {
      ...empty,
      status: 'runtime_evidence_summary_rejected',
      rejected: true,
      rejectReason: 'source_runtime_matrix_execution_required'
    };
  }

  if (!sourceAllowlistedFinalRcEvidenceRunnerExecuted) {
    return {
      ...empty,
      status: 'runtime_evidence_summary_rejected',
      rejected: true,
      rejectReason: 'allowlisted_final_rc_evidence_runner_required'
    };
  }

  if (!allCriticalCommandsPassed || criticalGateFailedCount > 0) {
    return {
      ...empty,
      status: 'runtime_evidence_summary_rejected',
      rejected: true,
      rejectReason: 'critical_gate_pass_required'
    };
  }

  const locallyEvidencedRuntimeGaps = normalizeEvidenceStringList(summary.locallyEvidencedRuntimeGaps);
  const remainingRuntimeGaps = normalizeEvidenceStringList(summary.remainingRuntimeGaps);
  const rawCurrentHeadCommit = typeof summary.currentHeadCommit === 'string'
    ? summary.currentHeadCommit.trim()
    : '';
  const rawExpectedCurrentHeadCommit = typeof summary.expectedCurrentHeadCommit === 'string'
    ? summary.expectedCurrentHeadCommit.trim()
    : '';
  const currentHeadCommit = normalizeEvidenceCommit(rawCurrentHeadCommit);
  const expectedCurrentHeadCommit = normalizeEvidenceCommit(rawExpectedCurrentHeadCommit);

  if (
    (rawCurrentHeadCommit && !currentHeadCommit) ||
    (rawExpectedCurrentHeadCommit && !expectedCurrentHeadCommit)
  ) {
    return {
      ...empty,
      status: 'runtime_evidence_summary_rejected',
      rejected: true,
      rejectReason: 'current_head_binding_malformed'
    };
  }

  if (currentHeadCommit && expectedCurrentHeadCommit && currentHeadCommit !== expectedCurrentHeadCommit) {
    return {
      ...empty,
      status: 'runtime_evidence_summary_rejected',
      rejected: true,
      rejectReason: 'current_head_binding_mismatch'
    };
  }

  const currentHeadBindingStatus = currentHeadCommit && expectedCurrentHeadCommit
    ? 'matched'
    : (currentHeadCommit || expectedCurrentHeadCommit ? 'incomplete' : 'not_provided');

  if (currentHeadBindingStatus !== 'matched') {
    return {
      ...empty,
      status: 'runtime_evidence_summary_rejected',
      rejected: true,
      rejectReason: 'current_head_binding_required',
      summary: {
        ...empty.summary,
        currentHeadBindingStatus,
        currentHeadBindingMatched: false,
        currentHeadCommit,
        expectedCurrentHeadCommit
      }
    };
  }

  const rawEvidenceGeneratedAt = typeof summary.evidenceGeneratedAt === 'string'
    ? summary.evidenceGeneratedAt.trim()
    : '';
  if (!rawEvidenceGeneratedAt) {
    return {
      ...empty,
      status: 'runtime_evidence_summary_rejected',
      rejected: true,
      rejectReason: 'runtime_evidence_summary_timestamp_required'
    };
  }

  const evidenceGeneratedAt = parseEvidenceTimestamp(rawEvidenceGeneratedAt);
  const reportGeneratedAt = parseEvidenceTimestamp(generatedAt);
  if (!evidenceGeneratedAt || !reportGeneratedAt) {
    return {
      ...empty,
      status: 'runtime_evidence_summary_rejected',
      rejected: true,
      rejectReason: 'runtime_evidence_summary_timestamp_malformed'
    };
  }

  const evidenceAgeMs = reportGeneratedAt.getTime() - evidenceGeneratedAt.getTime();
  if (evidenceAgeMs < 0) {
    return {
      ...empty,
      status: 'runtime_evidence_summary_rejected',
      rejected: true,
      rejectReason: 'runtime_evidence_summary_timestamp_future'
    };
  }

  const evidenceAgeHours = evidenceAgeMs / (60 * 60 * 1000);
  if (evidenceAgeHours > staleAfterHours) {
    return {
      ...empty,
      status: 'runtime_evidence_summary_rejected',
      rejected: true,
      rejectReason: 'runtime_evidence_summary_stale'
    };
  }

  const evidenceUnitSummary = summarizeRuntimeEvidenceUnits(summary.evidenceUnitIds);

  if (evidenceUnitSummary.duplicateUnitCount > 0) {
    return buildRuntimeEvidenceUnitRejectedSummary(
      empty,
      evidenceUnitSummary,
      'runtime_evidence_units_duplicate'
    );
  }

  if (evidenceUnitSummary.unknownUnitIds.length > 0) {
    return buildRuntimeEvidenceUnitRejectedSummary(
      empty,
      evidenceUnitSummary,
      'runtime_evidence_units_unknown'
    );
  }

  if (evidenceUnitSummary.missingRequiredUnitIds.length > 0) {
    return buildRuntimeEvidenceUnitRejectedSummary(
      empty,
      evidenceUnitSummary,
      'runtime_evidence_units_missing'
    );
  }

  return {
    ...empty,
    status: 'explicit_runtime_evidence_summary_available',
    accepted: true,
    summary: {
      ...empty.summary,
      sourceStatus: safeEvidenceString(summary.status, 'unknown'),
      sourceDecision: safeEvidenceString(summary.decision, 'unknown'),
      runnerExecuted: sourceRunnerExecuted,
      commandsExecutedBySource: sourceCommandsExecuted,
      commandsExecutedByAggregator: false,
      localRuntimeEvidenceMatrixExecutedBySource:
        sourceLocalRuntimeEvidenceMatrixExecuted,
      allowlistedFinalRcEvidenceRunnerExecutedBySource:
        sourceAllowlistedFinalRcEvidenceRunnerExecuted,
      finalRcMatrixExecutedBySource: false,
      fullFinalRcMatrixExecutedBySource: false,
      finalRcMatrixReady: false,
      runtimeReady: false,
      v1RcReady: false,
      rcReady: false,
      allCriticalCommandsPassed,
      criticalGateCount: safeEvidenceNumber(criticalGates.total),
      criticalGatePassedCount: safeEvidenceNumber(criticalGates.passed),
      criticalGateFailedCount,
      locallyEvidencedRuntimeGapCount: locallyEvidencedRuntimeGaps.length,
      remainingRuntimeGapCount: remainingRuntimeGaps.length,
      currentHeadBindingStatus,
      currentHeadBindingMatched: currentHeadBindingStatus === 'matched',
      currentHeadCommit,
      expectedCurrentHeadCommit,
      evidenceGeneratedAt: rawEvidenceGeneratedAt,
      evidenceFreshnessStatus: 'fresh',
      evidenceAgeHours: evidenceAgeHours,
      evidenceUnitCount: evidenceUnitSummary.uniqueUnitIds.length,
      requiredEvidenceUnitCount: evidenceUnitSummary.requiredUnitIds.length,
      missingEvidenceUnitCount: evidenceUnitSummary.missingRequiredUnitIds.length,
      unknownEvidenceUnitCount: evidenceUnitSummary.unknownUnitIds.length,
      duplicateEvidenceUnitCount: evidenceUnitSummary.duplicateUnitCount,
      evidenceUnitsComplete: evidenceUnitSummary.complete,
      providerCalls: 0,
      mutated: false,
      noProvider: true,
      noDurableMemoryWrite: true,
      noRealMemoryPreview: true,
      noRemoteWrite: true
    },
    locallyEvidencedRuntimeGaps,
    remainingRuntimeGaps,
    evidenceUnitIds: evidenceUnitSummary.uniqueUnitIds,
    requiredEvidenceUnitIds: evidenceUnitSummary.requiredUnitIds,
    missingEvidenceUnitIds: evidenceUnitSummary.missingRequiredUnitIds,
    unknownEvidenceUnitIds: evidenceUnitSummary.unknownUnitIds
  };
}

function normalizeValidationEvidenceSources(sources = []) {
  const inputSources = Array.isArray(sources) ? sources : [];
  const acceptedSources = [];
  const rejectedSources = [];

  inputSources.forEach((source, index) => {
    const fallbackId = `validation-evidence-${index + 1}`;
    const id = safeEvidenceId(source && source.id, fallbackId);

    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      rejectedSources.push({
        id,
        accepted: false,
        reason: 'invalid_source_shape'
      });
      return;
    }

    if (includesForbiddenEvidenceFragment(source)) {
      rejectedSources.push({
        id,
        accepted: false,
        reason: 'sensitive_fragment_rejected'
      });
      return;
    }

    if (!VALIDATION_EVIDENCE_SOURCE_TYPES.includes(source.source_type)) {
      rejectedSources.push({
        id,
        accepted: false,
        reason: 'unsupported_source_type'
      });
      return;
    }

    const evidenceClass = deriveValidationEvidenceClass(source);
    if (
      !VALIDATION_EVIDENCE_SOURCE_CLASSES.includes(evidenceClass) ||
      evidenceClass === 'runtime_evidence' ||
      evidenceClass === 'final_rc_matrix_evidence'
    ) {
      rejectedSources.push({
        id,
        accepted: false,
        reason: 'unsupported_source_class'
      });
      return;
    }

    if (!VALIDATION_EVIDENCE_STATUSES.includes(source.status)) {
      rejectedSources.push({
        id,
        accepted: false,
        reason: 'unsupported_status'
      });
      return;
    }

    if (hasUnsafeEvidenceSideEffect(source)) {
      rejectedSources.push({
        id,
        accepted: false,
        reason: 'side_effect_evidence_rejected'
      });
      return;
    }

    acceptedSources.push({
      id,
      source_type: source.source_type,
      evidence_class: evidenceClass,
      status: source.status,
      source_ref: safeEvidenceString(source.source_ref, 'explicit-safe-input'),
      observed_at: safeEvidenceString(source.observed_at, ''),
      commit: safeEvidenceString(source.commit, ''),
      commands: normalizeEvidenceCommands(source.commands),
      summary: safeEvidenceString(source.summary, ''),
      safety: {
        mutated: false,
        providerCalls: 0,
        serviceStarted: false,
        durableMemoryTouched: false,
        realMemoryPreview: false,
        migrationApplied: false,
        importExportApplied: false,
        configChanged: false,
        pushed: false,
        tagged: false,
        released: false,
        deployed: false
      }
    });
  });

  return {
    sourceMode: 'explicit_safe_inputs_only',
    contract: {
      sourceTypes: VALIDATION_EVIDENCE_SOURCE_TYPES,
      sourceClasses: VALIDATION_EVIDENCE_SOURCE_CLASSES,
      statuses: VALIDATION_EVIDENCE_STATUSES,
      readsFiles: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      mutatesDurableState: false,
      acceptsRealMemoryPreview: false
    },
    sourceCount: inputSources.length,
    acceptedCount: acceptedSources.length,
    rejectedCount: rejectedSources.length,
    acceptedSources,
    rejectedSources,
    summary: {
      committedValidationCount: acceptedSources.filter(source => source.source_type === 'committed_validation').length,
      localValidationCount: acceptedSources.filter(source => source.source_type === 'local_validation').length,
      committedEvidenceClassCount: acceptedSources.filter(source => source.evidence_class === 'committed_evidence').length,
      localEvidenceClassCount: acceptedSources.filter(source => source.evidence_class === 'local_validation').length,
      runtimeEvidenceClassCount: acceptedSources.filter(source => source.evidence_class === 'runtime_evidence').length,
      finalRcMatrixEvidenceClassCount: acceptedSources.filter(source => source.evidence_class === 'final_rc_matrix_evidence').length,
      passedCount: acceptedSources.filter(source => source.status === 'passed').length,
      failedCount: acceptedSources.filter(source => source.status === 'failed').length,
      blockedCount: acceptedSources.filter(source => source.status === 'blocked').length,
      notExecutedCount: acceptedSources.filter(source => source.status === 'not_executed').length,
      allAcceptedReadOnly: acceptedSources.every(source => source.safety.mutated === false),
      allAcceptedSafe: acceptedSources.every(source =>
        source.safety.providerCalls === 0 &&
        source.safety.serviceStarted === false &&
        source.safety.durableMemoryTouched === false &&
        source.safety.realMemoryPreview === false
      )
    }
  };
}

function buildV1RcValidationAggregatorReport({
  generatedAt = new Date().toISOString(),
  validationEvidenceSources = [],
  runtimeEvidenceSummary = null,
  runtimeProofInputs = null,
  v11HardeningEvidence = null
} = {}) {
  const validationEvidenceReader = normalizeValidationEvidenceSources(validationEvidenceSources);
  const runtimeEvidenceSummaryBridge = normalizeRuntimeEvidenceSummary(runtimeEvidenceSummary, {
    generatedAt
  });
  const runtimeProofCollector = collectValidationAggregatorRuntimeProofUnits(
    runtimeProofInputs || {}
  );
  const v11HardeningValidationAggregator =
    evaluateV11HardeningValidationAggregator(v11HardeningEvidence || {});
  const validationEvidenceFreshness = summarizeValidationEvidenceFreshness({
    acceptedSources: validationEvidenceReader.acceptedSources,
    generatedAt
  });
  const blockers = [
    buildBlocker('full-final-rc-matrix-not-executed', {
      status: 'blocked',
      category: 'validation'
    }),
    buildBlocker('validation-aggregator-full-implementation-not-complete', {
      status: 'minimal_implemented',
      category: 'runtime-required',
      requiresRuntimeImplementation: true
    }),
    buildBlocker('migration-import-export-apply-a5-gated', {
      status: 'blocked_pending_a5',
      category: 'a5-gated',
      requiresA5: true
    }),
    buildBlocker('provider-execution-a5-gated', {
      status: 'blocked_pending_a5',
      category: 'a5-gated',
      requiresA5: true
    }),
    buildBlocker('startup-watchdog-a5-gated', {
      status: 'blocked_pending_a5',
      category: 'a5-gated',
      requiresA5: true
    }),
    buildBlocker('codex-claude-config-switch-a5-gated', {
      status: 'blocked_pending_a5',
      category: 'a5-gated',
      requiresA5: true
    }),
    buildBlocker('production-deploy-a5-gated', {
      status: 'blocked_pending_a5',
      category: 'a5-gated',
      requiresA5: true
    }),
    buildBlocker('push-tag-release-deploy-a5-gated', {
      status: 'blocked_pending_a5',
      category: 'a5-gated',
      requiresA5: true
    })
  ];
  const validationEvidenceGateReadiness = summarizeValidationEvidenceGateReadiness({
    validationEvidenceReader,
    validationEvidenceFreshness,
    blockers
  });
  const validationEvidenceCommandCoverage = summarizeValidationEvidenceCommandCoverage(validationEvidenceReader);
  const validationEvidenceRejectionSummary = summarizeValidationEvidenceRejections(validationEvidenceReader);
  const validationEvidenceConfidencePosture = summarizeValidationEvidenceConfidencePosture({
    validationEvidenceReader,
    validationEvidenceFreshness,
    validationEvidenceGateReadiness,
    validationEvidenceCommandCoverage,
    validationEvidenceRejectionSummary
  });
  const p66FullImplementationGapAccounting =
    buildP66FullImplementationGapAccounting({
      runtimeEvidenceSummaryBridge,
      validationEvidenceFreshness,
      validationEvidenceGateReadiness,
      validationEvidenceCommandCoverage,
      validationEvidenceConfidencePosture,
      blockers
    });

  const report = {
    schemaVersion: 'v1-rc-validation-aggregator-v1',
    version: 'v1',
    phase: 'P24.2-validation-aggregator-minimal-implementation',
    mode: 'read-only',
    generated_at: generatedAt,
    source: {
      kind: 'minimal-implementation',
      synthetic: false,
      realMemoryPreview: false
    },
    decision: 'NOT_READY_BLOCKED',
    decisionContract: {
      allowed: DECISION_LABELS,
      readyRequires: [
        'full_final_rc_matrix_executed',
        'validation_aggregator_full_implementation_completed',
        'schema_version_runtime_enforcement_implemented',
        'required_a5_authorizations_resolved'
      ],
      currentMustNotBe: [
        'READY_FOR_V1_0_RC'
      ]
    },
    summary: {
      a4SafeSlice: 'A4_SAFE_SLICE_PASSED',
      fullFinalRcMatrixExecuted: false,
      liveMcpHttpEvidenceRefreshed: false,
      validationAggregatorImplemented: true,
      validationAggregatorFullImplementation: false,
      validationEvidenceReaderImplemented: true,
      validationEvidenceSourceContract: validationEvidenceReader.sourceMode,
      validationEvidenceAcceptedCount: validationEvidenceReader.acceptedCount,
      validationEvidenceFreshnessStatus: validationEvidenceFreshness.status,
      validationEvidenceStaleCount: validationEvidenceFreshness.staleCount,
      validationEvidenceGateReadinessStatus: validationEvidenceGateReadiness.status,
      validationEvidenceCanClaimV1RcReady: false,
      validationEvidenceCommandCoverageStatus: validationEvidenceCommandCoverage.status,
      validationEvidenceCommandCount: validationEvidenceCommandCoverage.commandCount,
      validationEvidenceRejectionStatus: validationEvidenceRejectionSummary.status,
      validationEvidenceRejectedCount: validationEvidenceRejectionSummary.rejectedCount,
      validationEvidenceConfidencePostureStatus: validationEvidenceConfidencePosture.status,
      validationEvidenceConfidenceCanClaimV1RcReady: false,
      runtimeEvidenceSummaryStatus: runtimeEvidenceSummaryBridge.status,
      runtimeEvidenceSummaryAccepted: runtimeEvidenceSummaryBridge.accepted,
      runtimeEvidenceSummaryRejected: runtimeEvidenceSummaryBridge.rejected,
      runtimeEvidenceSummaryLocallyEvidencedGapCount:
        runtimeEvidenceSummaryBridge.summary.locallyEvidencedRuntimeGapCount,
      runtimeEvidenceSummaryRemainingGapCount:
        runtimeEvidenceSummaryBridge.summary.remainingRuntimeGapCount,
      runtimeEvidenceSummaryCurrentHeadBindingStatus:
        runtimeEvidenceSummaryBridge.summary.currentHeadBindingStatus,
      runtimeEvidenceSummaryCurrentHeadBindingMatched:
        runtimeEvidenceSummaryBridge.summary.currentHeadBindingMatched,
      runtimeEvidenceSummaryEvidenceFreshnessStatus:
        runtimeEvidenceSummaryBridge.summary.evidenceFreshnessStatus,
      runtimeEvidenceSummaryEvidenceGeneratedAt:
        runtimeEvidenceSummaryBridge.summary.evidenceGeneratedAt,
      runtimeEvidenceSummaryEvidenceUnitCount:
        runtimeEvidenceSummaryBridge.summary.evidenceUnitCount,
      runtimeEvidenceSummaryRequiredEvidenceUnitCount:
        runtimeEvidenceSummaryBridge.summary.requiredEvidenceUnitCount,
      runtimeEvidenceSummaryMissingEvidenceUnitCount:
        runtimeEvidenceSummaryBridge.summary.missingEvidenceUnitCount,
      runtimeEvidenceSummaryUnknownEvidenceUnitCount:
        runtimeEvidenceSummaryBridge.summary.unknownEvidenceUnitCount,
      runtimeEvidenceSummaryDuplicateEvidenceUnitCount:
        runtimeEvidenceSummaryBridge.summary.duplicateEvidenceUnitCount,
      runtimeEvidenceSummaryEvidenceUnitsComplete:
        runtimeEvidenceSummaryBridge.summary.evidenceUnitsComplete,
      runtimeEvidenceSummaryCanClaimV1RcReady: false,
      validationAggregatorRuntimeProofCollectorImplemented:
        runtimeProofCollector.implemented,
      validationAggregatorRuntimeProofCollectorStatus:
        runtimeProofCollector.status,
      validationAggregatorRuntimeProofCollectorAcceptedUnitCount:
        runtimeProofCollector.summary.acceptedUnitCount,
      validationAggregatorRuntimeProofCollectorExecutedUnitCount:
        runtimeProofCollector.summary.executedUnitCount,
      validationAggregatorRuntimeProofCollectorCanClaimV1RcReady: false,
      v11HardeningValidationAggregatorImplemented: true,
      v11HardeningValidationAggregatorStatus:
        v11HardeningValidationAggregator.status,
      v11HardeningValidationAggregatorAccepted:
        v11HardeningValidationAggregator.accepted,
      v11HardeningValidationAggregatorCurrentSliceAcceptedCount:
        v11HardeningValidationAggregator.evidenceMatrix.acceptedCurrentSliceCount,
      v11HardeningValidationAggregatorFutureGapCount:
        v11HardeningValidationAggregator.evidenceMatrix.requiredFutureGapIds.length,
      v11HardeningValidationAggregatorCanClaimV1RcReady: false,
      schemaVersionRuntimeEnforcementImplemented: true,
      schemaVersionRuntimeWriteBoundaryGuardImplemented: true,
      schemaVersionRuntimeWriteBoundaryRejectsMetadata: true,
      schemaVersionRuntimeWriteBoundaryPublicMcpFrozen: true,
      schemaVersionRuntimeWriteBoundaryDiaryWriteOnRejectedPayload: false,
      schemaVersionPolicyHelperImplemented: true,
      schemaVersionPolicyHelperExplicitInputOnly: true,
      schemaVersionPolicyHelperRuntimeIntegrated: false,
      schemaVersionRuntimeBoundaryGuardTestAdded: true,
      schemaVersionRuntimeBoundaryGuardPublicSchemaFrozen: true,
      schemaVersionRuntimeBoundaryGuardRejectsSchemaVersionArgs: true,
      schemaVersionRuntimeBoundaryGuardRuntimeIntegrated: true,
      schemaCompatibilityDryRunCliImplemented: true,
      schemaCompatibilityDryRunCliFixtureOnly: true,
      schemaCompatibilityDryRunCliExecuted: false,
      schemaCompatibilityRuntimeEnforcementImplemented: false,
      migrationImportExportDryRunGateCliImplemented: true,
      migrationImportExportDryRunGateCliFixtureOnly: true,
      migrationImportExportDryRunGateCliExecuted: false,
      migrationImportExportApprovalPacketCliImplemented: true,
      migrationImportExportApprovalPacketCliFixtureOnly: true,
      migrationImportExportApprovalPacketCliExecuted: false,
      migrationImportExportApprovalPacketExecutionApproved: false,
      migrationImportExportApprovalPacketRealMemoryScanned: false,
      migrationImportExportApprovalPacketPackageScriptAdded: false,
      migrationImportExportRealMemoryScanned: false,
      finalRcValidationMatrixManifestHelperImplemented: true,
      finalRcValidationMatrixManifestHelperExplicitInputOnly: true,
      finalRcValidationMatrixManifestHelperExecuted: false,
      finalRcValidationMatrixRunnerImplemented: false,
      finalRcValidationMatrixRunnerExecuted: false,
      finalRcValidationMatrixExecuted: false,
      finalRcValidationMatrixCanExecuteRunner: false,
      finalRcValidationMatrixCanClaimFinalRcReady: false,
      memoryGovernanceLifecycleContractHelperImplemented: true,
      memoryGovernanceLifecycleContractHelperExplicitInputOnly: true,
      memoryGovernanceLifecycleContractHelperExecuted: false,
      memoryGovernanceLifecycleContractHelperRuntimeIntegrated: false,
      memoryGovernanceLifecycleContractPublicMcpExpanded: false,
      memoryGovernanceLifecycleContractDurableMutationPerformed: false,
      memoryGovernanceLifecycleContractRealMemoryScanned: false,
      memoryGovernanceLifecycleContractCanClaimGovernanceReady: false,
      memoryGovernanceApprovalPacketContractHelperImplemented: true,
      memoryGovernanceApprovalPacketContractHelperExplicitInputOnly: true,
      memoryGovernanceApprovalPacketContractHelperExecuted: false,
      memoryGovernanceApprovalPacketContractHelperRuntimeIntegrated: false,
      memoryGovernanceApprovalPacketContractPublicMcpExpanded: false,
      memoryGovernanceApprovalPacketContractDurableMutationPerformed: false,
      memoryGovernanceApprovalPacketContractRealMemoryScanned: false,
      memoryGovernanceApprovalPacketContractExecutionApproved: false,
      memoryGovernanceApprovalPacketContractCanClaimGovernanceReady: false,
      memoryGovernanceAuditEvidenceContractHelperImplemented: true,
      memoryGovernanceAuditEvidenceContractHelperExplicitInputOnly: true,
      memoryGovernanceAuditEvidenceContractHelperExecuted: false,
      memoryGovernanceAuditEvidenceContractHelperRuntimeIntegrated: false,
      memoryGovernanceAuditEvidenceContractPublicMcpExpanded: false,
      memoryGovernanceAuditEvidenceContractDurableAuditWritten: false,
      memoryGovernanceAuditEvidenceContractDurableMutationPerformed: false,
      memoryGovernanceAuditEvidenceContractRealMemoryScanned: false,
      memoryGovernanceAuditEvidenceContractExecutionApproved: false,
      memoryGovernanceAuditEvidenceContractCanClaimGovernanceReady: false,
      memoryGovernanceReviewSurfaceContractHelperImplemented: true,
      memoryGovernanceReviewSurfaceContractHelperExplicitInputOnly: true,
      memoryGovernanceReviewSurfaceContractHelperExecuted: false,
      memoryGovernanceReviewSurfaceContractHelperRuntimeIntegrated: false,
      memoryGovernanceReviewSurfaceContractPublicMcpExpanded: false,
      memoryGovernanceReviewSurfaceContractDurableMemoryTouched: false,
      memoryGovernanceReviewSurfaceContractDurableAuditWritten: false,
      memoryGovernanceReviewSurfaceContractRealDbReviewed: false,
      memoryGovernanceReviewSurfaceContractGovernanceReportExecuted: false,
      memoryGovernanceReviewSurfaceContractRealMemoryScanned: false,
      memoryGovernanceReviewSurfaceContractExecutionApproved: false,
      memoryGovernanceReviewSurfaceContractCanClaimGovernanceReady: false,
      p36P40EvidenceSourceMapImplemented: true,
      p36P40EvidenceSourceMapAvailable: true,
      p36P40EvidenceSourceMapSourceMode: 'static_report_shape_only',
      p36P40EvidenceSourceMapReadsFixtures: false,
      p36P40EvidenceSourceMapExecutesHelpers: false,
      p36P40EvidenceSourceMapExecutesGates: false,
      p36P40EvidenceSourceMapExecutesRunners: false,
      p36P40EvidenceSourceMapRefreshesLiveMcp: false,
      p36P40EvidenceSourceMapCallsProviders: false,
      p36P40LocalEvidenceReportAvailable: true,
      p36P40LocalEvidenceReportReadyClaim: false,
      p36P40RuntimeReady: false,
      p36P40FinalRcMatrixReady: false,
      p36P40CanClaimV1RcReady: false,
      p45FinalRcMatrixEvaluatorPostureAvailable: true,
      p45FinalRcMatrixEvaluatorPostureSourceMode: 'static_report_shape_only',
      p45FinalRcMatrixEvaluatorExplicitInputOnly: true,
      p45FinalRcMatrixEvaluatorFixtureOnly: true,
      p45FinalRcMatrixEvaluatorImportedByAggregator: false,
      p45FinalRcMatrixEvaluatorExecutedByAggregator: false,
      p45FinalRcMatrixEvaluatorFixtureReadByAggregator: false,
      p45FinalRcMatrixEvaluatorCollectsEvidence: false,
      p45FinalRcMatrixEvaluatorExecutesHelpers: false,
      p45FinalRcMatrixRunnerExecuted: false,
      p45FinalRcMatrixReady: false,
      p45FinalRcMatrixCanClaimFinalRcReady: false,
      p45FinalRcMatrixCanClaimV1RcReady: false,
      p45FinalRcMatrixRuntimeReady: false,
      p53ValidationAggregatorEvidenceInventoryAvailable: true,
      p53ValidationAggregatorEvidenceInventorySourceMode: 'static_report_shape_only',
      p53ValidationAggregatorEvidenceInventoryOnly: true,
      p53ValidationAggregatorInventoryAcceptedForPlanningCount: 6,
      p53ValidationAggregatorInventoryBlockedCount: 1,
      p53ValidationAggregatorInventoryMissingCount: 0,
      p53ValidationAggregatorInventoryNotExecutedCount: 1,
      p53ValidationAggregatorInventoryUnsupportedCount: 0,
      p53ValidationAggregatorInventoryStaleCount: 0,
      p53ValidationAggregatorInventoryFreshCount: 6,
      p53ValidationAggregatorInventoryFixtureReadByAggregator: false,
      p53ValidationAggregatorInventoryTestExecutedByAggregator: false,
      p53ValidationAggregatorInventoryHelperExecutedByAggregator: false,
      p53ValidationAggregatorInventoryRunnerExecutedByAggregator: false,
      p53ValidationAggregatorInventoryRuntimeObserved: true,
      p53ValidationAggregatorFullImplementationComplete: false,
      p53ValidationAggregatorInventoryCanClaimRuntimeReady: false,
      p53ValidationAggregatorInventoryCanClaimFinalRcReady: false,
      p53ValidationAggregatorInventoryCanClaimV1RcReady: false,
      p66ValidationAggregatorFullImplementationDefinitionAvailable: true,
      p66ValidationAggregatorFullImplementationDefinitionSourceMode: 'static_report_shape_only',
      p66ValidationAggregatorFullImplementationDefinitionOnly: true,
      p66ValidationAggregatorFullImplementationRequiredCriteriaCount:
        P66_FULL_IMPLEMENTATION_REQUIRED_CRITERIA.length,
      p66ValidationAggregatorFullImplementationRemainingRuntimeGapCount:
        P66_FULL_IMPLEMENTATION_REMAINING_RUNTIME_GAPS.length,
      p66ValidationAggregatorFullImplementationLocallyEvidencedGapCount:
        P66_FULL_IMPLEMENTATION_LOCALLY_EVIDENCED_GAPS.length,
      p66ValidationAggregatorFullImplementationA5HardStopCount:
        P66_FULL_IMPLEMENTATION_A5_HARD_STOPS.length,
      p66ValidationAggregatorFullImplementationFailClosedCaseCount:
        P66_FULL_IMPLEMENTATION_FAIL_CLOSED_CASES.length,
      p66ValidationAggregatorFullImplementationGapAccountingAvailable:
        p66FullImplementationGapAccounting.available,
      p66ValidationAggregatorFullImplementationGapAccountingSourceMode:
        p66FullImplementationGapAccounting.sourceMode,
      p66ValidationAggregatorFullImplementationGapAccountingRemainingGapCount:
        p66FullImplementationGapAccounting.remainingFullImplementationGapCount,
      p66ValidationAggregatorFullImplementationGapAccountingLocallyEvidencedGapCount:
        p66FullImplementationGapAccounting.locallyEvidencedFullImplementationGapCount,
      p66ValidationAggregatorFullImplementationGapAccountingEffectiveGapSource:
        p66FullImplementationGapAccounting.effectiveGapSource,
      p66ValidationAggregatorFullImplementationGapAccountingEffectiveRemainingGapCount:
        p66FullImplementationGapAccounting.effectiveRemainingFullImplementationGapCount,
      p66ValidationAggregatorFullImplementationGapAccountingEffectiveLocallyEvidencedGapCount:
        p66FullImplementationGapAccounting.effectiveLocallyEvidencedFullImplementationGapCount,
      p66ValidationAggregatorFullImplementationGapAccountingLocalProofChainCloseoutAuditCount:
        p66FullImplementationGapAccounting.localProofChainCloseoutAuditCount,
      p66ValidationAggregatorFullImplementationGapAccountingLocalProofChainCloseoutAcceptedCount:
        p66FullImplementationGapAccounting.localProofChainCloseoutAcceptedCount,
      p66ValidationAggregatorFullImplementationGapAccountingLocalProofChainCloseoutNotProvenCount:
        p66FullImplementationGapAccounting.localProofChainCloseoutNotProvenCount,
      p66ValidationAggregatorFullImplementationGapAccountingLocalProofChainCloseoutCanClaimReadiness:
        false,
      p66ValidationAggregatorFullImplementationGapAccountingStaticBaselineClearedGapCount:
        p66FullImplementationGapAccounting.staticBaselineClearedGapCount,
      p66ValidationAggregatorFullImplementationGapAccountingStaticBaselineStillRemainingGapCount:
        p66FullImplementationGapAccounting.staticBaselineStillRemainingGapCount,
      p66ValidationAggregatorFullImplementationGapAccountingEffectiveNonBaselineRemainingGapCount:
        p66FullImplementationGapAccounting.effectiveNonBaselineRemainingGapCount,
      p66ValidationAggregatorFullImplementationGapAccountingEffectiveLocalImplementationGapCount:
        p66FullImplementationGapAccounting.effectiveLocalImplementationGapCount,
      p66ValidationAggregatorFullImplementationGapAccountingEffectiveLocalProofChainCompleteGapCount:
        p66FullImplementationGapAccounting.effectiveLocalProofChainCompleteGapCount,
      p66ValidationAggregatorFullImplementationGapAccountingEffectiveActionableLocalImplementationGapCount:
        p66FullImplementationGapAccounting.effectiveActionableLocalImplementationGapCount,
      p66ValidationAggregatorFullImplementationGapAccountingEffectiveA5GatedGapCount:
        p66FullImplementationGapAccounting.effectiveA5GatedGapCount,
      p66ValidationAggregatorFullImplementationGapAccountingEffectiveRedLaneGapCount:
        p66FullImplementationGapAccounting.effectiveRedLaneGapCount,
      p66ValidationAggregatorFullImplementationGapAccountingClosureAuditMatrixCount:
        p66FullImplementationGapAccounting.closureAuditMatrixCount,
      p66ValidationAggregatorFullImplementationGapAccountingClosureAuditClosedByLocalProofChainCount:
        p66FullImplementationGapAccounting.closureAuditClosedByLocalProofChainCount,
      p66ValidationAggregatorFullImplementationGapAccountingClosureAuditRequiresA5EvidenceCount:
        p66FullImplementationGapAccounting.closureAuditRequiresA5EvidenceCount,
      p66ValidationAggregatorFullImplementationGapAccountingClosureAuditRequiresRedLaneAuthorizationCount:
        p66FullImplementationGapAccounting.closureAuditRequiresRedLaneAuthorizationCount,
      p66ValidationAggregatorFullImplementationGapAccountingClosureAuditUnmodeledManualReviewCount:
        p66FullImplementationGapAccounting.closureAuditUnmodeledManualReviewCount,
      p66ValidationAggregatorFullImplementationGapAccountingClosureAuditCanClaimReadiness:
        false,
      p66ValidationAggregatorFullImplementationGapAccountingClosureAuthorityStatus:
        p66FullImplementationGapAccounting.closureAuthorityStatus,
      p66ValidationAggregatorFullImplementationGapAccountingNextClosureAuthority:
        p66FullImplementationGapAccounting.nextClosureAuthority,
      p66ValidationAggregatorFullImplementationGapAccountingRc8Rc9ReadinessAuditStatus:
        p66FullImplementationGapAccounting.rc8Rc9ReadinessEvidenceAuditStatus,
      p66ValidationAggregatorFullImplementationGapAccountingRc8Rc9ReadinessAuditReadyToEnterRc9DecisionPacket:
        p66FullImplementationGapAccounting.rc8Rc9ReadinessEvidenceAuditReadyToEnterRc9DecisionPacket,
      p66ValidationAggregatorFullImplementationGapAccountingRc8Rc9ReadinessAuditReadyToRequestRcCutoverApproval:
        p66FullImplementationGapAccounting.rc8Rc9ReadinessEvidenceAuditReadyToRequestRcCutoverApproval,
      p66ValidationAggregatorFullImplementationGapAccountingRc8Rc9ReadinessAuditRemainingAuthorityGapCount:
        p66FullImplementationGapAccounting.rc8Rc9ReadinessEvidenceAuditRemainingAuthorityGapCount,
      p66ValidationAggregatorFullImplementationGapAccountingRc8Rc9ReadinessAuditCanClaimReadiness:
        false,
      p66ValidationAggregatorFullImplementationGapAccountingNextSafeCandidateCount:
        p66FullImplementationGapAccounting.nextSafeClosureCandidateCount,
      p66ValidationAggregatorFullImplementationGapAccountingRuntimeSummaryBound:
        p66FullImplementationGapAccounting.acceptedRuntimeSummaryBound,
      p66ValidationAggregatorFullImplementationGapAccountingRuntimeSummaryRemainingGapCount:
        p66FullImplementationGapAccounting.acceptedRuntimeSummaryRemainingGapCount,
      p66ValidationAggregatorFullImplementationGapAccountingRuntimeSummaryLocallyEvidencedGapCount:
        p66FullImplementationGapAccounting.acceptedRuntimeSummaryLocallyEvidencedGapCount,
      p66ValidationAggregatorFullImplementationGapAccountingValidationFreshnessStatus:
        p66FullImplementationGapAccounting.validationEvidenceFreshnessStatus,
      p66ValidationAggregatorFullImplementationGapAccountingValidationGateReadinessStatus:
        p66FullImplementationGapAccounting.validationEvidenceGateReadinessStatus,
      p66ValidationAggregatorFullImplementationGapAccountingValidationEvidenceUsable:
        p66FullImplementationGapAccounting.validationEvidenceExplicitEvidenceUsable,
      p66ValidationAggregatorFullImplementationGapAccountingRuntimeRequiredBlockerCount:
        p66FullImplementationGapAccounting.runtimeRequiredBlockerCount,
      p66ValidationAggregatorFullImplementationGapAccountingA5GatedBlockerCount:
        p66FullImplementationGapAccounting.a5GatedBlockerCount,
      p66ValidationAggregatorFullImplementationGapAccountingClosureStatus:
        p66FullImplementationGapAccounting.closureStatus,
      p66ValidationAggregatorFullImplementationGapAccountingClosureReady:
        p66FullImplementationGapAccounting.closureReady,
      p66ValidationAggregatorFullImplementationGapAccountingZeroGap:
        p66FullImplementationGapAccounting.acceptedRuntimeSummaryZeroGap,
      p66ValidationAggregatorFullImplementationGapAccountingDecisionPacketRouteStatus:
        p66FullImplementationGapAccounting.decisionPacketRouteStatus,
      p66ValidationAggregatorFullImplementationGapAccountingReadyToRequestRcCutoverApproval:
        p66FullImplementationGapAccounting.readyToRequestRcCutoverApproval,
      p66ValidationAggregatorFullImplementationGapAccountingRcCutoverApproved:
        p66FullImplementationGapAccounting.rcCutoverApproved,
      p66ValidationAggregatorFullImplementationGapAccountingRcCutoverExecutionAllowed:
        p66FullImplementationGapAccounting.rcCutoverExecutionAllowed,
      p66ValidationAggregatorFullImplementationGapAccountingCanClaimReady: false,
      p66ValidationAggregatorFullImplementationFixtureReadByAggregator: false,
      p66ValidationAggregatorFullImplementationTestExecutedByAggregator: false,
      p66ValidationAggregatorFullImplementationRuntimeImplemented: false,
      p66ValidationAggregatorFullImplementationComplete: false,
      p66ValidationAggregatorFullImplementationCanClaimRuntimeReady: false,
      p66ValidationAggregatorFullImplementationCanClaimFinalRcReady: false,
      p66ValidationAggregatorFullImplementationCanClaimV1RcReady: false,
      p66ValidationAggregatorSourceRegistryProofAvailable: true,
      p66ValidationAggregatorSourceRegistryProofSourceMode: 'static_report_shape_only',
      p66ValidationAggregatorSourceRegistryProofHelperCapabilityOnly: true,
      p66ValidationAggregatorSourceRegistryRequiredSourceCount:
        P66_SOURCE_REGISTRY_REQUIRED_IDS.length,
      p66ValidationAggregatorSourceRegistryFailClosedReasonCount:
        P66_SOURCE_REGISTRY_FAIL_CLOSED_REASONS.length,
      p66ValidationAggregatorSourceRegistryHelperImportedByAggregator: false,
      p66ValidationAggregatorSourceRegistryHelperExecutedByAggregator: false,
      p66ValidationAggregatorSourceRegistryRuntimeImplemented: false,
      p66ValidationAggregatorSourceRegistryFullImplementationComplete: false,
      p66ValidationAggregatorSourceRegistryCanClaimRuntimeReady: false,
      p66ValidationAggregatorSourceRegistryCanClaimFinalRcReady: false,
      p66ValidationAggregatorSourceRegistryCanClaimV1RcReady: false,
      p66ValidationAggregatorEvidenceFreshnessProofAvailable: true,
      p66ValidationAggregatorEvidenceFreshnessProofSourceMode: 'static_report_shape_only',
      p66ValidationAggregatorEvidenceFreshnessProofHelperCapabilityOnly: true,
      p66ValidationAggregatorEvidenceFreshnessRequiredFieldCount:
        P66_EVIDENCE_FRESHNESS_REQUIRED_FIELDS.length,
      p66ValidationAggregatorEvidenceFreshnessFailClosedReasonCount:
        P66_EVIDENCE_FRESHNESS_FAIL_CLOSED_REASONS.length,
      p66ValidationAggregatorEvidenceFreshnessHelperImportedByAggregator: false,
      p66ValidationAggregatorEvidenceFreshnessHelperExecutedByAggregator: false,
      p66ValidationAggregatorEvidenceFreshnessRuntimeImplemented: false,
      p66ValidationAggregatorEvidenceFreshnessFullImplementationComplete: false,
      p66ValidationAggregatorEvidenceFreshnessCanClaimRuntimeReady: false,
      p66ValidationAggregatorEvidenceFreshnessCanClaimFinalRcReady: false,
      p66ValidationAggregatorEvidenceFreshnessCanClaimV1RcReady: false,
      p66ValidationAggregatorBaselineBindingProofAvailable: true,
      p66ValidationAggregatorBaselineBindingProofSourceMode: 'static_report_shape_only',
      p66ValidationAggregatorBaselineBindingProofHelperCapabilityOnly: true,
      p66ValidationAggregatorBaselineBindingRequiredFieldCount:
        P66_BASELINE_BINDING_REQUIRED_FIELDS.length,
      p66ValidationAggregatorBaselineBindingKindCount:
        P66_BASELINE_BINDING_KINDS.length,
      p66ValidationAggregatorBaselineBindingFailClosedReasonCount:
        P66_BASELINE_BINDING_FAIL_CLOSED_REASONS.length,
      p66ValidationAggregatorBaselineBindingHelperImportedByAggregator: false,
      p66ValidationAggregatorBaselineBindingHelperExecutedByAggregator: false,
      p66ValidationAggregatorBaselineBindingRuntimeImplemented: false,
      p66ValidationAggregatorBaselineBindingFullImplementationComplete: false,
      p66ValidationAggregatorBaselineBindingCanClaimRuntimeReady: false,
      p66ValidationAggregatorBaselineBindingCanClaimFinalRcReady: false,
      p66ValidationAggregatorBaselineBindingCanClaimV1RcReady: false,
      p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProofAvailable: true,
      p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProofSourceMode:
        'static_report_shape_only',
      p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProofHelperCapabilityOnly: true,
      p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationRequiredFieldCount:
        P66_RUNTIME_EVIDENCE_SUMMARY_NORMALIZATION_REQUIRED_FIELDS.length,
      p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationFailClosedReasonCount:
        P66_RUNTIME_EVIDENCE_SUMMARY_NORMALIZATION_FAIL_CLOSED_REASONS.length,
      p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationHelperImportedByAggregator: false,
      p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationHelperExecutedByAggregator: false,
      p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationRuntimeImplemented: false,
      p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationFullImplementationComplete: false,
      p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationCanClaimRuntimeReady: false,
      p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationCanClaimFinalRcReady: false,
      p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationCanClaimV1RcReady: false,
      p66ValidationAggregatorMissingStaleEvidenceFailClosedProofAvailable: true,
      p66ValidationAggregatorMissingStaleEvidenceFailClosedProofSourceMode:
        'static_report_shape_only',
      p66ValidationAggregatorMissingStaleEvidenceFailClosedProofHelperCapabilityOnly: true,
      p66ValidationAggregatorMissingStaleEvidenceRequiredGroupCount:
        P66_MISSING_STALE_EVIDENCE_REQUIRED_GROUPS.length,
      p66ValidationAggregatorMissingStaleEvidenceFailClosedReasonCount:
        P66_MISSING_STALE_EVIDENCE_FAIL_CLOSED_REASONS.length,
      p66ValidationAggregatorMissingStaleEvidenceHelperImportedByAggregator: false,
      p66ValidationAggregatorMissingStaleEvidenceHelperExecutedByAggregator: false,
      p66ValidationAggregatorMissingStaleEvidenceRuntimeImplemented: false,
      p66ValidationAggregatorMissingStaleEvidenceFullImplementationComplete: false,
      p66ValidationAggregatorMissingStaleEvidenceCanClaimRuntimeReady: false,
      p66ValidationAggregatorMissingStaleEvidenceCanClaimFinalRcReady: false,
      p66ValidationAggregatorMissingStaleEvidenceCanClaimV1RcReady: false,
      p66ValidationAggregatorUnsupportedSourceFailClosedProofAvailable: true,
      p66ValidationAggregatorUnsupportedSourceFailClosedProofSourceMode:
        'static_report_shape_only',
      p66ValidationAggregatorUnsupportedSourceFailClosedProofHelperCapabilityOnly: true,
      p66ValidationAggregatorUnsupportedSourceFailClosedCaseCount:
        P66_UNSUPPORTED_SOURCE_FAIL_CLOSED_CASES.length,
      p66ValidationAggregatorUnsupportedSourceFailClosedReasonCount:
        P66_UNSUPPORTED_SOURCE_FAIL_CLOSED_REASONS.length,
      p66ValidationAggregatorUnsupportedSourceHelperImportedByAggregator: false,
      p66ValidationAggregatorUnsupportedSourceHelperExecutedByAggregator: false,
      p66ValidationAggregatorUnsupportedSourceRuntimeImplemented: false,
      p66ValidationAggregatorUnsupportedSourceFullImplementationComplete: false,
      p66ValidationAggregatorUnsupportedSourceCanClaimRuntimeReady: false,
      p66ValidationAggregatorUnsupportedSourceCanClaimFinalRcReady: false,
      p66ValidationAggregatorUnsupportedSourceCanClaimV1RcReady: false,
      p66ValidationAggregatorNoTouchBoundaryProofAvailable: true,
      p66ValidationAggregatorNoTouchBoundaryProofSourceMode:
        'static_report_shape_only',
      p66ValidationAggregatorNoTouchBoundaryProofHelperCapabilityOnly: true,
      p66ValidationAggregatorNoTouchBoundaryTargetFamilyCount:
        P66_NO_TOUCH_BOUNDARY_TARGET_FAMILIES.length,
      p66ValidationAggregatorNoTouchBoundaryDisallowedImportCount:
        P66_NO_TOUCH_BOUNDARY_DISALLOWED_IMPORTS.length,
      p66ValidationAggregatorNoTouchBoundaryDisallowedRuntimeCallCount:
        P66_NO_TOUCH_BOUNDARY_DISALLOWED_RUNTIME_CALLS.length,
      p66ValidationAggregatorNoTouchBoundaryFailClosedCaseCount:
        P66_NO_TOUCH_BOUNDARY_FAIL_CLOSED_CASES.length,
      p66ValidationAggregatorNoTouchBoundaryFailClosedReasonCount:
        P66_NO_TOUCH_BOUNDARY_FAIL_CLOSED_REASONS.length,
      p66ValidationAggregatorNoTouchBoundaryHelperImportedByAggregator: false,
      p66ValidationAggregatorNoTouchBoundaryHelperExecutedByAggregator: false,
      p66ValidationAggregatorNoTouchBoundaryRuntimeImplemented: false,
      p66ValidationAggregatorNoTouchBoundaryFullImplementationComplete: false,
      p66ValidationAggregatorNoTouchBoundaryCanClaimRuntimeReady: false,
      p66ValidationAggregatorNoTouchBoundaryCanClaimFinalRcReady: false,
      p66ValidationAggregatorNoTouchBoundaryCanClaimV1RcReady: false,
      p66ValidationAggregatorReadinessOverclaimRejectionProofAvailable: true,
      p66ValidationAggregatorReadinessOverclaimRejectionProofSourceMode:
        'static_report_shape_only',
      p66ValidationAggregatorReadinessOverclaimRejectionProofHelperCapabilityOnly: true,
      p66ValidationAggregatorReadinessOverclaimRequiredClaimCount:
        P66_READINESS_OVERCLAIM_REQUIRED_CLAIMS.length,
      p66ValidationAggregatorReadinessOverclaimFailClosedCaseCount:
        P66_READINESS_OVERCLAIM_FAIL_CLOSED_CASES.length,
      p66ValidationAggregatorReadinessOverclaimAllowedEvidencePostureCount:
        P66_READINESS_OVERCLAIM_ALLOWED_EVIDENCE_POSTURE.length,
      p66ValidationAggregatorReadinessOverclaimDisallowedReadinessPostureCount:
        P66_READINESS_OVERCLAIM_DISALLOWED_READINESS_POSTURE.length,
      p66ValidationAggregatorReadinessOverclaimFailClosedReasonCount:
        P66_READINESS_OVERCLAIM_FAIL_CLOSED_REASONS.length,
      p66ValidationAggregatorReadinessOverclaimHelperImportedByAggregator: false,
      p66ValidationAggregatorReadinessOverclaimHelperExecutedByAggregator: false,
      p66ValidationAggregatorReadinessOverclaimEvidenceFileReadByAggregator: false,
      p66ValidationAggregatorReadinessOverclaimCommandExecutedByAggregator: false,
      p66ValidationAggregatorReadinessOverclaimRuntimeImplemented: false,
      p66ValidationAggregatorReadinessOverclaimFullImplementationComplete: false,
      p66ValidationAggregatorReadinessOverclaimCanClaimRuntimeReady: false,
      p66ValidationAggregatorReadinessOverclaimCanClaimFinalRcReady: false,
      p66ValidationAggregatorReadinessOverclaimCanClaimV1RcReady: false,
      p66ValidationAggregatorReadinessOverclaimCanClaimRcReady: false,
      p66ValidationAggregatorReadinessOverclaimCanClaimCutoverReady: false,
      p66ValidationAggregatorGovernanceRuntimeLoopGapProofAvailable: true,
      p66ValidationAggregatorGovernanceRuntimeLoopGapProofSourceMode:
        'static_report_shape_only',
      p66ValidationAggregatorGovernanceRuntimeLoopGapHelperCapabilityOnly: true,
      p66ValidationAggregatorGovernanceRuntimeLoopStageCount:
        P66_GOVERNANCE_RUNTIME_LOOP_STAGE_IDS.length,
      p66ValidationAggregatorGovernanceRuntimeLoopRequiredEvidenceGroupCount:
        P66_GOVERNANCE_RUNTIME_LOOP_REQUIRED_EVIDENCE_GROUPS.length,
      p66ValidationAggregatorGovernanceRuntimeLoopApprovalStateCount:
        P66_GOVERNANCE_RUNTIME_LOOP_APPROVAL_STATES.length,
      p66ValidationAggregatorGovernanceRuntimeLoopFailClosedCaseCount:
        P66_GOVERNANCE_RUNTIME_LOOP_FAIL_CLOSED_CASES.length,
      p66ValidationAggregatorGovernanceRuntimeLoopDisallowedWorkCount:
        P66_GOVERNANCE_RUNTIME_LOOP_DISALLOWED_WORK.length,
      p66ValidationAggregatorGovernanceRuntimeLoopFailClosedReasonCount:
        P66_GOVERNANCE_RUNTIME_LOOP_FAIL_CLOSED_REASONS.length,
      p66ValidationAggregatorGovernanceRuntimeLoopHelperImportedByAggregator: false,
      p66ValidationAggregatorGovernanceRuntimeLoopHelperExecutedByAggregator: false,
      p66ValidationAggregatorGovernanceRuntimeLoopEvidenceFileReadByAggregator: false,
      p66ValidationAggregatorGovernanceRuntimeLoopCommandExecutedByAggregator: false,
      p66ValidationAggregatorGovernanceRuntimeLoopExecuted: false,
      p66ValidationAggregatorGovernanceRuntimeLoopApprovalExecutionReady: false,
      p66ValidationAggregatorGovernanceRuntimeLoopAuditWriterReady: false,
      p66ValidationAggregatorGovernanceRuntimeLoopDurableWriteReady: false,
      p66ValidationAggregatorGovernanceRuntimeLoopRuntimeImplemented: false,
      p66ValidationAggregatorGovernanceRuntimeLoopFullImplementationComplete: false,
      p66ValidationAggregatorGovernanceRuntimeLoopCanClaimRuntimeReady: false,
      p66ValidationAggregatorGovernanceRuntimeLoopCanClaimFinalRcReady: false,
      p66ValidationAggregatorGovernanceRuntimeLoopCanClaimV1RcReady: false,
      p66ValidationAggregatorGovernanceRuntimeLoopCanClaimRcReady: false,
      p66ValidationAggregatorGovernanceRuntimeLoopCanClaimCutoverReady: false,
      p66ValidationAggregatorRecallIsolationRuntimeProofAvailable: true,
      p66ValidationAggregatorRecallIsolationRuntimeProofSourceMode:
        'static_report_shape_only',
      p66ValidationAggregatorRecallIsolationRuntimeProofHelperCapabilityOnly: true,
      p66ValidationAggregatorRecallIsolationRecordFamilyCount:
        P66_RECALL_ISOLATION_RECORD_FAMILIES.length,
      p66ValidationAggregatorRecallIsolationProofSurfaceCount:
        P66_RECALL_ISOLATION_PROOF_SURFACES.length,
      p66ValidationAggregatorRecallIsolationRequiredEvidenceGroupCount:
        P66_RECALL_ISOLATION_REQUIRED_RUNTIME_EVIDENCE_GROUPS.length,
      p66ValidationAggregatorRecallIsolationControlCaseCount:
        P66_RECALL_ISOLATION_CONTROL_CASES.length,
      p66ValidationAggregatorRecallIsolationFailClosedCaseCount:
        P66_RECALL_ISOLATION_FAIL_CLOSED_CASES.length,
      p66ValidationAggregatorRecallIsolationDisallowedWorkCount:
        P66_RECALL_ISOLATION_DISALLOWED_WORK.length,
      p66ValidationAggregatorRecallIsolationFailClosedReasonCount:
        P66_RECALL_ISOLATION_FAIL_CLOSED_REASONS.length,
      p66ValidationAggregatorRecallIsolationHelperImportedByAggregator: false,
      p66ValidationAggregatorRecallIsolationHelperExecutedByAggregator: false,
      p66ValidationAggregatorRecallIsolationEvidenceFileReadByAggregator: false,
      p66ValidationAggregatorRecallIsolationCommandExecutedByAggregator: false,
      p66ValidationAggregatorRecallIsolationRealMemoryScannedByAggregator: false,
      p66ValidationAggregatorRecallIsolationRuntimeStoreScannedByAggregator: false,
      p66ValidationAggregatorRecallIsolationRuntimeProofExecuted: false,
      p66ValidationAggregatorRecallIsolationContaminationReportReady: false,
      p66ValidationAggregatorRecallIsolationDurableWriteReady: false,
      p66ValidationAggregatorRecallIsolationRuntimeImplemented: false,
      p66ValidationAggregatorRecallIsolationFullImplementationComplete: false,
      p66ValidationAggregatorRecallIsolationCanClaimRuntimeReady: false,
      p66ValidationAggregatorRecallIsolationCanClaimFinalRcReady: false,
      p66ValidationAggregatorRecallIsolationCanClaimV1RcReady: false,
      p66ValidationAggregatorRecallIsolationCanClaimRcReady: false,
      p66ValidationAggregatorRecallIsolationCanClaimCutoverReady: false,
      localEvidenceReportReadyClaim: false,
      runtimeReady: false,
      mainlineCutoverReady: false,
      finalRcMatrixReady: false,
      pushReady: false,
      releaseReady: false,
      deployReady: false,
      configSwitchReady: false,
      watchdogReady: false,
      rcReady: false,
      productionDeployPerformed: false,
      startupWatchdogInstalled: false,
      codexClaudeConfigSwitched: false,
      providerExecuted: false,
      migrationImportExportApplyPerformed: false,
      migrationImportExportPackageScriptAdded: false,
      durableMemoryMutationExpansionPerformed: false,
      pushTagReleaseDeployPerformed: false
    },
    checks: {
      gitHygiene: createCheck({
        status: 'not_executed',
        requiredBeforeV1Rc: true,
        blocksV1Rc: true,
        a4Safe: true
      }),
      docsValidation: createCheck({
        status: 'not_executed',
        requiredBeforeV1Rc: true,
        blocksV1Rc: true,
        a4Safe: true
      }),
      p2DocsWhitespace: createCheck({
        status: 'not_executed',
        requiredBeforeV1Rc: true,
        blocksV1Rc: true,
        a4Safe: true
      }),
      mcpContract: createCheck({
        status: 'recorded_historical',
        requiredBeforeV1Rc: true,
        blocksV1Rc: true,
        a4Safe: true,
        evidence: 'P22 local HTTP MCP evidence recorded; P23.12 did not refresh live evidence.'
      }),
      publicMcpTools: createCheck({
        status: 'pass',
        requiredBeforeV1Rc: true,
        blocksV1Rc: true,
        a4Safe: true
      }),
      schemaVersionRuntimeEnforcement: createCheck({
        status: 'runtime_write_boundary_guard_added',
        requiredBeforeV1Rc: true,
        blocksV1Rc: false,
        a4Safe: true,
        evidence: 'MemoryWriteService now rejects schema/version metadata before diary persistence while public MCP tools remain frozen.'
      }),
      schemaVersionPolicyFixture: createCheck({
        status: 'fixture_contract_added',
        requiredBeforeV1Rc: true,
        blocksV1Rc: false,
        a4Safe: true,
        evidence: 'P25.2 schema-version policy fixture covers accepted, missing, and unknown version behavior.'
      }),
      schemaVersionPolicyHelper: createCheck({
        status: 'helper_added_runtime_not_integrated',
        requiredBeforeV1Rc: true,
        blocksV1Rc: false,
        a4Safe: true,
        evidence: 'P29.1 SchemaVersionPolicy helper evaluates explicit parsed policy input only; it is not wired into runtime enforcement.'
      }),
      schemaVersionRuntimeBoundaryGuard: createCheck({
        status: 'runtime_write_boundary_guard_added',
        requiredBeforeV1Rc: true,
        blocksV1Rc: false,
        a4Safe: true,
        evidence: 'Boundary tests prove record_memory schema has no schema version args, ToolArgumentValidator rejects public schema version args, and MemoryWriteService rejects direct core schema/version metadata before diary persistence.'
      }),
      schemaCompatibilityDryRunCli: createCheck({
        status: 'fixture_only_cli_added',
        requiredBeforeV1Rc: true,
        blocksV1Rc: false,
        a4Safe: true,
        evidence: 'P25.6 direct-node fixture-only CLI exists; P25.7 records report-shape evidence without executing the CLI.'
      }),
      migrationImportExportDryRunGateCli: createCheck({
        status: 'fixture_only_cli_added',
        requiredBeforeV1Rc: true,
        blocksV1Rc: false,
        a4Safe: true,
        evidence: 'P26.3 direct-node fixture-only CLI exists; P26.4 records report-shape evidence without executing the CLI.'
      }),
      migrationImportExportApprovalPacketCli: createCheck({
        status: 'fixture_only_cli_added',
        requiredBeforeV1Rc: true,
        blocksV1Rc: false,
        a4Safe: true,
        evidence: 'P27.4 direct-node fixture-only CLI exists; P27.5 records report-shape evidence without executing the CLI.'
      }),
      finalRcValidationMatrixManifestHelper: createCheck({
        status: 'helper_added_report_shape_only_not_executed',
        requiredBeforeV1Rc: true,
        blocksV1Rc: false,
        a4Safe: true,
        evidence: 'P30.2 pure manifest helper evaluates explicit caller-provided fixture/report input only; P30.3 records report-shape evidence without executing the helper or runner.'
      }),
      memoryGovernanceLifecycleContractHelper: createCheck({
        status: 'helper_added_report_shape_only_not_executed',
        requiredBeforeV1Rc: true,
        blocksV1Rc: false,
        a4Safe: true,
        evidence: 'P31.3 pure governance lifecycle helper evaluates explicit caller-provided contract input only; P31.4 records report-shape evidence without executing the helper or reading the fixture.'
      }),
      memoryGovernanceApprovalPacketContractHelper: createCheck({
        status: 'helper_added_report_shape_only_not_executed',
        requiredBeforeV1Rc: true,
        blocksV1Rc: false,
        a4Safe: true,
        evidence: 'P32.2 pure approval-packet helper evaluates explicit caller-provided packet input only; P32.3 records report-shape evidence without executing the helper or reading the fixture.'
      }),
      memoryGovernanceAuditEvidenceContractHelper: createCheck({
        status: 'helper_added_report_shape_only_not_executed',
        requiredBeforeV1Rc: true,
        blocksV1Rc: false,
        a4Safe: true,
        evidence: 'P33.2 pure audit-evidence helper evaluates explicit caller-provided contract input only; P33.3 records report-shape evidence without executing the helper or reading the fixture.'
      }),
      memoryGovernanceReviewSurfaceContractHelper: createCheck({
        status: 'helper_added_report_shape_only_not_executed',
        requiredBeforeV1Rc: true,
        blocksV1Rc: false,
        a4Safe: true,
        evidence: 'P34.2 pure review-surface helper evaluates explicit caller-provided review input only; P34.3 records report-shape evidence without executing the helper or reading the fixture.'
      }),
      p36P40EvidenceSourceMap: createCheck({
        status: 'static_report_shape_added_not_executed',
        requiredBeforeV1Rc: true,
        blocksV1Rc: false,
        a4Safe: true,
        evidence: 'P44 surfaces P36-P40 local evidence posture from static report-shape entries only; it does not read fixtures, execute helpers/gates/runners, refresh live MCP, or claim runtime/RC readiness.'
      }),
      p45FinalRcMatrixEvaluatorPosture: createCheck({
        status: 'static_report_shape_added_not_executed',
        requiredBeforeV1Rc: true,
        blocksV1Rc: false,
        a4Safe: true,
        evidence: 'P49 surfaces the P45 evaluator skeleton posture from static report-shape entries only; it does not import or execute the evaluator, read fixtures, run gates/runners, collect evidence, or claim final RC readiness.'
      }),
      p53ValidationAggregatorEvidenceInventory: createCheck({
        status: 'static_report_shape_added_not_executed',
        requiredBeforeV1Rc: true,
        blocksV1Rc: false,
        a4Safe: true,
        evidence: 'P53 surfaces the ValidationAggregator inventory posture from static report-shape entries only; it does not read the P53 fixture, execute helpers/gates/runners, refresh live MCP, scan runtime stores, or claim full aggregator/runtime/RC readiness.'
      }),
      validationAggregatorExecutable: createCheck({
        status: 'minimal_implemented',
        requiredBeforeV1Rc: true,
        blocksV1Rc: false,
        runtimeRequired: true
      }),
      conditionalLiveMcpHttp: createCheck({
        status: 'not_executed_service_not_running',
        requiredBeforeV1Rc: true,
        blocksV1Rc: false,
        conditionalLive: true
      }),
      migrationImportExportApply: createCheck({
        status: 'blocked_pending_a5',
        blocksV1Release: true,
        a5Gated: true
      }),
      providerExecution: createCheck({
        status: 'blocked_pending_a5',
        blocksV1Release: true,
        a5Gated: true
      }),
      startupWatchdog: createCheck({
        status: 'blocked_pending_a5',
        blocksV1Release: true,
        a5Gated: true
      }),
      clientConfigSwitch: createCheck({
        status: 'blocked_pending_a5',
        blocksV1Release: true,
        a5Gated: true
      }),
      productionDeploy: createCheck({
        status: 'blocked_pending_a5',
        blocksV1Release: true,
        a5Gated: true
      }),
      pushTagReleaseDeploy: createCheck({
        status: 'blocked_pending_a5',
        blocksV1Release: true,
        a5Gated: true
      })
    },
    a4_safe: [
      'gitHygiene',
      'docsValidation',
      'p2DocsWhitespace',
      'docsStatusBoardConsistency',
      'schemaVersionDocsReview',
      'schemaVersionPolicyFixture',
      'schemaVersionPolicyHelper',
      'schemaVersionRuntimeBoundaryGuard',
      'schemaCompatibilityDryRunCli',
      'migrationImportExportDryRunGateCli',
      'migrationImportExportApprovalPacketCli',
      'finalRcValidationMatrixManifestHelper',
      'memoryGovernanceLifecycleContractHelper',
      'memoryGovernanceApprovalPacketContractHelper',
      'memoryGovernanceAuditEvidenceContractHelper',
      'memoryGovernanceReviewSurfaceContractHelper',
      'p36P40EvidenceSourceMap',
      'p45FinalRcMatrixEvaluatorPosture',
      'p53ValidationAggregatorEvidenceInventory',
      'clientBoundaryDocsReview',
      'migrationImportExportBoundaryDocsReview',
      'rcChecklistAlignmentReview',
      'publicMcpToolFreezeReview'
    ],
    a5_gated: [
      'migrationImportExportApply',
      'providerExecution',
      'startupWatchdog',
      'clientConfigSwitch',
      'productionDeploy',
      'durableMemoryMutationExpansion',
      'destructiveRollbackExecution',
      'pushTagReleaseDeploy'
    ],
    runtime_required: [
      'validationAggregatorFullImplementation'
    ],
    conditional_live: [
      'health',
      'initializeToolsList',
      'observeHttp',
      'mcpHttpTests'
    ],
    public_mcp_tools: PUBLIC_MCP_TOOLS,
    evidence: {
      p22LocalHttpMcpEvidence: {
        status: 'recorded_historical',
        health: 'ok',
        initializeToolsList: 'ok',
        observeHttp: 'ok',
        mcpHttpTests: '12/12'
      },
      p23A4SafeSlice: {
        status: 'A4_SAFE_SLICE_PASSED',
        fullFinalRcMatrixExecuted: false,
        liveMcpHttpEvidenceRefreshed: false
      },
      p24Aggregator: {
        planned: true,
        implemented: true,
        minimalImplementation: true,
        fullImplementation: false
      },
      p25SchemaVersionPolicy: {
        status: 'fixture_contract_added',
        fixture: 'tests/fixtures/schema-version-policy-v1.json',
        test: 'tests/schema-version-policy-fixture.test.js',
        runtimeEnforcementImplemented: false
      },
      p29SchemaVersionPolicyHelper: {
        status: 'helper_added_runtime_not_integrated',
        helper: 'src/core/SchemaVersionPolicy.js',
        test: 'tests/schema-version-policy-runtime.test.js',
        sourceMode: 'explicit_input',
        fixture: 'tests/fixtures/schema-version-policy-v1.json',
        evaluatesAcceptedMissingUnknownVersions: true,
        evaluationReportAvailable: true,
        evaluationReportExecuted: false,
        evaluationReportReadsFiles: false,
        evaluationReportMutatesInput: false,
        evaluationReportMalformedCasesFailClosed: true,
        rejectsUnknownFamilies: true,
        readsFiles: false,
        mutatesInput: false,
        runtimeIntegrated: false,
        runtimeEnforcementImplemented: false,
        publicMcpExpanded: false
      },
      p29SchemaVersionRuntimeBoundaryGuard: {
        status: 'runtime_write_boundary_guard_added',
        test: 'tests/schema-version-runtime-boundary.test.js',
        sourceMode: 'fixture_backed_test',
        publicRecordMemorySchemaFrozen: true,
        recordMemorySchemaVersionArgsExposed: false,
        toolArgumentValidatorRejectsSchemaVersionArgs: true,
        memoryWriteServiceRejectsSchemaVersionMetadata: true,
        diaryWriteOnRejectedPayload: false,
        policyWriteRejectionReportOnly: true,
        readsFiles: false,
        executesCommands: false,
        startsServices: false,
        callsProviders: false,
        durableMemoryTouched: false,
        realMemoryScanned: false,
        runtimeIntegrated: true,
        runtimeEnforcementImplemented: true,
        publicMcpExpanded: false
      },
      p25SchemaCompatibilityDryRunCli: {
        status: 'fixture_only_cli_added',
        cli: 'src/cli/schema-compatibility-dry-run.js',
        test: 'tests/schema-compatibility-dry-run-cli.test.js',
        fixture: 'tests/fixtures/schema-compatibility-dry-run-v1.json',
        outputSchema: 'codex-memory.schema-compatibility-dry-run.v1',
        expectedDecision: 'DRY_RUN_BLOCKED',
        fixtureOnly: true,
        cliExecuted: false,
        realMemoryScanned: false,
        runtimeEnforcementImplemented: false,
        packageScriptAdded: false
      },
      p26MigrationImportExportDryRunGateCli: {
        status: 'fixture_only_cli_added',
        cli: 'src/cli/migration-import-export-dry-run-gate.js',
        test: 'tests/migration-import-export-dry-run-gate-cli.test.js',
        fixture: 'tests/fixtures/migration-import-export-dry-run-gate-v1.json',
        outputSchema: 'codex-memory.migration-import-export-dry-run-gate.v1',
        expectedDecision: 'NOT_READY_BLOCKED',
        fixtureOnly: true,
        cliExecuted: false,
        realMemoryScanned: false,
        importExportApplyPerformed: false,
        packageScriptAdded: false
      },
      p27MigrationImportExportApprovalPacketCli: {
        status: 'fixture_only_cli_added',
        cli: 'src/cli/migration-import-export-approval-packet.js',
        test: 'tests/migration-import-export-approval-packet-cli.test.js',
        fixture: 'tests/fixtures/migration-import-export-approval-packet-v1.json',
        outputSchema: 'codex-memory.migration-import-export-approval-packet.v1',
        expectedDecision: 'NOT_READY_BLOCKED',
        expectedApprovalStatus: 'BLOCKED_PENDING_APPROVAL',
        fixtureOnly: true,
        cliExecuted: false,
        realMemoryScanned: false,
        executionApproved: false,
        importExportApplyPerformed: false,
        backupRestorePerformed: false,
        durableReportWritten: false,
        packageScriptAdded: false
      },
      p30FinalRcValidationMatrixManifestHelper: {
        status: 'helper_added_report_shape_only_not_executed',
        helper: 'src/core/FinalRcValidationMatrixManifest.js',
        test: 'tests/final-rc-validation-matrix-runner-manifest-helper.test.js',
        fixture: 'tests/fixtures/final-rc-validation-matrix-runner-safe-scope-v1.json',
        manifestSchemaVersion: 'final-rc-validation-matrix-runner-safe-scope-v1',
        sourceMode: 'explicit_input',
        fixtureOnly: true,
        syntheticFixture: true,
        acceptedForPlanningAvailable: true,
        manifestHelperImplemented: true,
        manifestHelperExecuted: false,
        helperExecutedByAggregator: false,
        fixtureReadByAggregator: false,
        readsFiles: false,
        executesCommands: false,
        startsServices: false,
        callsProviders: false,
        mutatesInput: false,
        durableMemoryTouched: false,
        realMemoryScanned: false,
        realMemoryPreview: false,
        runnerImplemented: false,
        runnerExecuted: false,
        finalRcMatrixExecuted: false,
        canExecuteRunner: false,
        canClaimFinalRcReady: false,
        blockedDecisionRequired: true,
        runnerClaimsFailClosed: true,
        publicMcpFrozen: true,
        runtimeRequiredBlockersVisible: true,
        a5GatedBlockersVisible: true,
        failClosedRejectionDefaultsVisible: true,
        publicMcpExpanded: false
      },
      p31MemoryGovernanceLifecycleContractHelper: {
        status: 'helper_added_report_shape_only_not_executed',
        helper: 'src/core/MemoryGovernanceLifecycleContract.js',
        test: 'tests/memory-governance-lifecycle-contract-helper.test.js',
        fixture: 'tests/fixtures/memory-governance-lifecycle-contract-v1.json',
        contractSchemaVersion: 'memory-governance-lifecycle-contract-v1',
        sourceMode: 'explicit_input',
        fixtureOnly: true,
        syntheticFixture: true,
        acceptedForPlanningAvailable: true,
        lifecycleHelperImplemented: true,
        lifecycleHelperExecuted: false,
        helperExecutedByAggregator: false,
        fixtureReadByAggregator: false,
        readsFiles: false,
        executesCommands: false,
        startsServices: false,
        callsProviders: false,
        mutatesInput: false,
        durableMemoryTouched: false,
        realMemoryScanned: false,
        realMemoryPreview: false,
        runtimeIntegrated: false,
        runtimeMutationAllowed: false,
        publicMcpExpanded: false,
        publicMcpFrozen: true,
        safeSourceTypesWhitelisted: true,
        unsupportedSourceTypesRejected: true,
        inputWhitelistRedefinitionRejected: true,
        requiredSurfacesPresent: true,
        requiredLifecycleCasesPresent: true,
        requiredBlockersVisible: true,
        requiredApprovalsVisible: true,
        blockedDecisionRequired: true,
        canClaimGovernanceRuntimeReady: false,
        canClaimV1RcReady: false,
        a5GatedBlockersVisible: true
      },
      p32MemoryGovernanceApprovalPacketContractHelper: {
        status: 'helper_added_report_shape_only_not_executed',
        helper: 'src/core/MemoryGovernanceApprovalPacketContract.js',
        test: 'tests/memory-governance-approval-packet-helper.test.js',
        fixture: 'tests/fixtures/memory-governance-approval-packet-v1.json',
        contractSchemaVersion: 'memory-governance-approval-packet-v1',
        sourceMode: 'explicit_input',
        fixtureOnly: true,
        syntheticFixture: true,
        acceptedForPlanningAvailable: true,
        approvalPacketHelperImplemented: true,
        approvalPacketHelperExecuted: false,
        helperExecutedByAggregator: false,
        fixtureReadByAggregator: false,
        readsFiles: false,
        executesCommands: false,
        startsServices: false,
        callsProviders: false,
        mutatesInput: false,
        durableMemoryTouched: false,
        realMemoryScanned: false,
        realMemoryPreview: false,
        runtimeIntegrated: false,
        executionApproved: false,
        publicMcpExpanded: false,
        publicMcpFrozen: true,
        safeSourceTypesWhitelisted: true,
        unsupportedSourceTypesRejected: true,
        inputWhitelistRedefinitionRejected: true,
        requiredPacketFieldsPresent: true,
        requiredGovernedActionsPresent: true,
        governedActionsBlocked: true,
        requiredBlockersVisible: true,
        requiredApprovalsVisible: true,
        blockedDecisionRequired: true,
        canClaimGovernanceRuntimeReady: false,
        canClaimV1RcReady: false,
        a5GatedBlockersVisible: true
      },
      p33MemoryGovernanceAuditEvidenceContractHelper: {
        status: 'helper_added_report_shape_only_not_executed',
        helper: 'src/core/MemoryGovernanceAuditEvidenceContract.js',
        test: 'tests/memory-governance-audit-evidence-helper.test.js',
        fixture: 'tests/fixtures/memory-governance-audit-evidence-v1.json',
        contractSchemaVersion: 'memory-governance-audit-evidence-v1',
        sourceMode: 'explicit_input',
        fixtureOnly: true,
        syntheticFixture: true,
        acceptedForPlanningAvailable: true,
        auditEvidenceHelperImplemented: true,
        auditEvidenceHelperExecuted: false,
        helperExecutedByAggregator: false,
        fixtureReadByAggregator: false,
        readsFiles: false,
        executesCommands: false,
        startsServices: false,
        callsProviders: false,
        mutatesInput: false,
        durableMemoryTouched: false,
        durableAuditWritten: false,
        realMemoryScanned: false,
        realMemoryPreview: false,
        runtimeIntegrated: false,
        executionApproved: false,
        publicMcpExpanded: false,
        publicMcpFrozen: true,
        safeSourceTypesWhitelisted: true,
        unsupportedSourceTypesRejected: true,
        inputWhitelistRedefinitionRejected: true,
        requiredEvidenceFieldsPresent: true,
        requiredEventFamiliesPresent: true,
        eventFamiliesBlocked: true,
        requiredBlockersVisible: true,
        requiredApprovalsVisible: true,
        blockedDecisionRequired: true,
        canClaimGovernanceRuntimeReady: false,
        canClaimV1RcReady: false,
        a5GatedBlockersVisible: true
      },
      p34MemoryGovernanceReviewSurfaceContractHelper: {
        status: 'helper_added_report_shape_only_not_executed',
        helper: 'src/core/MemoryGovernanceReviewSurfaceContract.js',
        test: 'tests/memory-governance-review-surface-helper.test.js',
        fixture: 'tests/fixtures/memory-governance-review-surface-v1.json',
        contractSchemaVersion: 'memory-governance-review-surface-v1',
        sourceMode: 'explicit_input',
        fixtureOnly: true,
        syntheticFixture: true,
        acceptedForPlanningAvailable: true,
        reviewSurfaceHelperImplemented: true,
        reviewSurfaceHelperExecuted: false,
        helperExecutedByAggregator: false,
        fixtureReadByAggregator: false,
        readsFiles: false,
        executesCommands: false,
        startsServices: false,
        callsProviders: false,
        mutatesInput: false,
        durableMemoryTouched: false,
        durableAuditWritten: false,
        governanceReportExecuted: false,
        realDbReviewExecuted: false,
        realMemoryScanned: false,
        realMemoryPreview: false,
        runtimeIntegrated: false,
        executionApproved: false,
        publicMcpExpanded: false,
        publicMcpFrozen: true,
        safeSourceTypesWhitelisted: true,
        unsupportedSourceTypesRejected: true,
        inputWhitelistRedefinitionRejected: true,
        requiredSourceSurfacesPresent: true,
        requiredReviewSectionsPresent: true,
        requiredBlockersVisible: true,
        requiredApprovalsVisible: true,
        blockedDecisionRequired: true,
        canClaimGovernanceRuntimeReady: false,
        canClaimV1RcReady: false,
        a5GatedBlockersVisible: true
      },
      p36P40EvidenceSourceMap: {
        status: 'static_report_shape_added_not_executed',
        sourceMode: 'static_report_shape_only',
        phasesCovered: [
          'P36-T1',
          'P36-T2',
          'P37-T1',
          'P38',
          'P39',
          'P40'
        ],
        sources: P36_P40_STATIC_EVIDENCE_SOURCES.map(source => ({
          ...source,
          sourceMode: 'static_reference_only',
          acceptedForPlanning: false,
          fixtureReadByAggregator: false,
          testExecutedByAggregator: false,
          helperExecutedByAggregator: false,
          observedFromRuntime: false
        })),
        localEvidenceReportAvailable: true,
        localEvidenceReportReadyClaim: false,
        runtimeReady: false,
        mainlineCutoverReady: false,
        finalRcMatrixReady: false,
        pushReady: false,
        releaseReady: false,
        deployReady: false,
        configSwitchReady: false,
        watchdogReady: false,
        rcReady: false,
        readsFixtures: false,
        executesHelpers: false,
        executesGates: false,
        executesRunners: false,
        refreshesLiveMcp: false,
        callsProviders: false,
        scansRealMemory: false,
        readsRuntimeStores: false,
        realMemoryContentRead: false,
        realMemoryPreviewed: false,
        dryRunRepresentsRealMemory: false,
        dryRunAuthorizesApply: false,
        migrationApplied: false,
        backupCreated: false,
        restorePerformed: false,
        deniedMigrationSources: [
          'real_memory_content',
          'real_diary',
          'real_sqlite',
          'real_vector_index',
          'real_candidate_cache',
          'provider_output'
        ],
        warningOnlyEqualsFailure: true,
        criticalSkippedEqualsFailure: true,
        criticalUnknownEqualsFailure: true,
        durableMemoryTouched: false,
        durableAuditWritten: false,
        publicMcpExpanded: false,
        helperExecutedByAggregator: false,
        fixtureReadByAggregator: false,
        decisionImpact: 'none_report_only',
        blockedDecisionRequired: true,
        canClaimRuntimeReady: false,
        canClaimFinalRcReady: false,
        canClaimV1RcReady: false
      },
      p45FinalRcMatrixEvaluatorPosture: {
        status: 'static_report_shape_added_not_executed',
        sourceMode: 'static_report_shape_only',
        evaluator: 'src/core/FinalRcMatrixEvaluator.js',
        test: 'tests/final-rc-matrix-evaluator-helper.test.js',
        fixture: 'tests/fixtures/p45-final-rc-matrix-evaluator-v1.json',
        evaluatorSchemaVersion: 'p45-final-rc-matrix-evaluator-v1',
        expectedMode: 'fixture-only-explicit-input',
        expectedDecision: 'NOT_READY_BLOCKED',
        explicitInputOnly: true,
        fixtureOnly: true,
        localEvidenceReportOnly: true,
        evaluatorImportedByAggregator: false,
        evaluatorExecutedByAggregator: false,
        fixtureReadByAggregator: false,
        helperExecutedByAggregator: false,
        gateExecutedByAggregator: false,
        runnerExecutedByAggregator: false,
        evidenceCollectedByAggregator: false,
        liveMcpRefreshedByAggregator: false,
        callsProviders: false,
        startsServices: false,
        readsFiles: false,
        scansRealMemory: false,
        readsRuntimeStores: false,
        realMemoryContentRead: false,
        realMemoryPreviewed: false,
        durableMemoryTouched: false,
        durableAuditWritten: false,
        publicMcpExpanded: false,
        runtimeMutationImplemented: false,
        runtimeIntegrated: false,
        finalRcMatrixExecuted: false,
        finalRcMatrixReady: false,
        runtimeReady: false,
        pushReady: false,
        releaseReady: false,
        deployReady: false,
        configSwitchReady: false,
        watchdogReady: false,
        rcReady: false,
        decisionImpact: 'none_report_only',
        blockedDecisionRequired: true,
        canClaimRuntimeReady: false,
        canClaimFinalRcReady: false,
        canClaimV1RcReady: false
      },
      p53ValidationAggregatorEvidenceInventory: {
        status: 'static_report_shape_added_not_executed',
        sourceMode: 'static_report_shape_only',
        doc: 'docs/P53_VALIDATION_AGGREGATOR_EVIDENCE_INVENTORY.md',
        test: 'tests/p53-validation-aggregator-evidence-inventory-fixture.test.js',
        fixture: 'tests/fixtures/p53-validation-aggregator-evidence-inventory-v1.json',
        inventorySchemaVersion: 'p53-validation-aggregator-evidence-inventory-v1',
        inventoryPolicyVersion: 'p53-validation-aggregator-inventory-policy-v1',
        inventoryManifestVersion: 'p53-validation-aggregator-inventory-manifest-v1',
        inventoryOnly: true,
        syntheticFixture: true,
        acceptedSourceTypes: P53_VALIDATION_AGGREGATOR_INVENTORY_SOURCE_TYPES,
        sourceClasses: P53_VALIDATION_AGGREGATOR_INVENTORY_SOURCE_CLASSES.map(id => ({
          id,
          runtimeAuthority: false,
          readinessAuthority: false
        })),
        statusSemantics: P53_VALIDATION_AGGREGATOR_INVENTORY_STATUSES.map(id => ({
          id,
          criticalGateDisposition: id === 'fresh'
            ? 'can_support_planning_only'
            : 'fail_closed',
          readinessAuthority: false
        })),
        inventoryRows: P53_VALIDATION_AGGREGATOR_INVENTORY_ROWS.map(row => ({
          ...row,
          readinessAuthority: false,
          runtimeEvidenceObserved: row.runtimeEvidenceObserved === true
        })),
        acceptedForPlanningCount: P53_VALIDATION_AGGREGATOR_INVENTORY_ROWS
          .filter(row => row.acceptedForPlanning === true).length,
        freshCount: P53_VALIDATION_AGGREGATOR_INVENTORY_ROWS
          .filter(row => row.status === 'fresh').length,
        staleCount: P53_VALIDATION_AGGREGATOR_INVENTORY_ROWS
          .filter(row => row.status === 'stale').length,
        missingCount: P53_VALIDATION_AGGREGATOR_INVENTORY_ROWS
          .filter(row => row.status === 'missing').length,
        unsupportedCount: P53_VALIDATION_AGGREGATOR_INVENTORY_ROWS
          .filter(row => row.status === 'unsupported').length,
        blockedCount: P53_VALIDATION_AGGREGATOR_INVENTORY_ROWS
          .filter(row => row.status === 'blocked').length,
        notExecutedCount: P53_VALIDATION_AGGREGATOR_INVENTORY_ROWS
          .filter(row => row.status === 'not_executed').length,
        fixtureReadByAggregator: false,
        testExecutedByAggregator: false,
        helperExecutedByAggregator: false,
        gateExecutedByAggregator: false,
        runnerExecutedByAggregator: false,
        evidenceCollectedByAggregator: false,
        liveMcpRefreshedByAggregator: false,
        callsProviders: false,
        startsServices: false,
        readsFiles: false,
        scansRealMemory: false,
        readsRuntimeStores: false,
        realMemoryContentRead: false,
        realMemoryPreviewed: false,
        durableMemoryTouched: false,
        durableAuditWritten: false,
        publicMcpExpanded: false,
        runtimeMutationImplemented: false,
        fullAggregatorImplementationComplete: false,
        runtimeIntegrated: false,
        finalRcMatrixExecuted: false,
        finalRcMatrixReady: false,
        runtimeReady: false,
        rcReady: false,
        decisionImpact: 'none_report_only',
        blockedDecisionRequired: true,
        canClaimRuntimeReady: false,
        canClaimFinalRcReady: false,
        canClaimV1RcReady: false
      },
      p66ValidationAggregatorFullImplementationDefinition: {
        status: 'static_definition_added_not_runtime',
        sourceMode: 'static_report_shape_only',
        doc: 'docs/P66_1_VALIDATION_AGGREGATOR_FULL_IMPLEMENTATION_DEFINITION.md',
        test: 'tests/p66-validation-aggregator-full-implementation-definition-fixture.test.js',
        fixture: 'tests/fixtures/p66-validation-aggregator-full-implementation-definition-v1.json',
        schemaVersion: 'p66-validation-aggregator-full-implementation-definition-v1',
        policyVersion: 'p66-validation-aggregator-full-implementation-policy-v1',
        manifestVersion: 'p66-validation-aggregator-full-implementation-manifest-v1',
        definitionOnly: true,
        syntheticFixture: true,
        requiredCriteria: P66_FULL_IMPLEMENTATION_REQUIRED_CRITERIA.map(id => ({
          id,
          required: true,
          mustFailClosedWhenMissing: true
        })),
        locallyEvidencedRuntimeGaps: P66_FULL_IMPLEMENTATION_LOCALLY_EVIDENCED_GAPS,
        remainingRuntimeGaps: P66_FULL_IMPLEMENTATION_REMAINING_RUNTIME_GAPS,
        a5HardStops: P66_FULL_IMPLEMENTATION_A5_HARD_STOPS,
        failClosedCases: P66_FULL_IMPLEMENTATION_FAIL_CLOSED_CASES,
        fullImplementationGapAccounting: p66FullImplementationGapAccounting,
        fullImplementationGapAccountingAvailable:
          p66FullImplementationGapAccounting.available,
        remainingFullImplementationGapIds:
          p66FullImplementationGapAccounting.remainingFullImplementationGapIds,
        remainingFullImplementationGapCount:
          p66FullImplementationGapAccounting.remainingFullImplementationGapCount,
        locallyEvidencedFullImplementationGapIds:
          p66FullImplementationGapAccounting.locallyEvidencedFullImplementationGapIds,
        locallyEvidencedFullImplementationGapCount:
          p66FullImplementationGapAccounting.locallyEvidencedFullImplementationGapCount,
        effectiveGapSource:
          p66FullImplementationGapAccounting.effectiveGapSource,
        effectiveRemainingFullImplementationGapIds:
          p66FullImplementationGapAccounting.effectiveRemainingFullImplementationGapIds,
        effectiveRemainingFullImplementationGapCount:
          p66FullImplementationGapAccounting.effectiveRemainingFullImplementationGapCount,
        effectiveLocallyEvidencedFullImplementationGapIds:
          p66FullImplementationGapAccounting.effectiveLocallyEvidencedFullImplementationGapIds,
        effectiveLocallyEvidencedFullImplementationGapCount:
          p66FullImplementationGapAccounting.effectiveLocallyEvidencedFullImplementationGapCount,
        localProofChainCloseoutAudit:
          p66FullImplementationGapAccounting.localProofChainCloseoutAudit,
        localProofChainCloseoutAuditCount:
          p66FullImplementationGapAccounting.localProofChainCloseoutAuditCount,
        localProofChainCloseoutAcceptedIds:
          p66FullImplementationGapAccounting.localProofChainCloseoutAcceptedIds,
        localProofChainCloseoutAcceptedCount:
          p66FullImplementationGapAccounting.localProofChainCloseoutAcceptedCount,
        localProofChainCloseoutNotProvenIds:
          p66FullImplementationGapAccounting.localProofChainCloseoutNotProvenIds,
        localProofChainCloseoutNotProvenCount:
          p66FullImplementationGapAccounting.localProofChainCloseoutNotProvenCount,
        localProofChainCloseoutCanClaimReadiness:
          p66FullImplementationGapAccounting.localProofChainCloseoutCanClaimReadiness,
        staticBaselineClearedGapIds:
          p66FullImplementationGapAccounting.staticBaselineClearedGapIds,
        staticBaselineClearedGapCount:
          p66FullImplementationGapAccounting.staticBaselineClearedGapCount,
        staticBaselineStillRemainingGapIds:
          p66FullImplementationGapAccounting.staticBaselineStillRemainingGapIds,
        staticBaselineStillRemainingGapCount:
          p66FullImplementationGapAccounting.staticBaselineStillRemainingGapCount,
        effectiveNonBaselineRemainingGapIds:
          p66FullImplementationGapAccounting.effectiveNonBaselineRemainingGapIds,
        effectiveNonBaselineRemainingGapCount:
          p66FullImplementationGapAccounting.effectiveNonBaselineRemainingGapCount,
        effectiveRemainingGapClosureItems:
          p66FullImplementationGapAccounting.effectiveRemainingGapClosureItems,
        effectiveLocalImplementationGapIds:
          p66FullImplementationGapAccounting.effectiveLocalImplementationGapIds,
        effectiveLocalImplementationGapCount:
          p66FullImplementationGapAccounting.effectiveLocalImplementationGapCount,
        effectiveLocalProofChainCompleteGapIds:
          p66FullImplementationGapAccounting.effectiveLocalProofChainCompleteGapIds,
        effectiveLocalProofChainCompleteGapCount:
          p66FullImplementationGapAccounting.effectiveLocalProofChainCompleteGapCount,
        effectiveActionableLocalImplementationGapIds:
          p66FullImplementationGapAccounting.effectiveActionableLocalImplementationGapIds,
        effectiveActionableLocalImplementationGapCount:
          p66FullImplementationGapAccounting.effectiveActionableLocalImplementationGapCount,
        effectiveA5GatedGapIds:
          p66FullImplementationGapAccounting.effectiveA5GatedGapIds,
        effectiveA5GatedGapCount:
          p66FullImplementationGapAccounting.effectiveA5GatedGapCount,
        effectiveRedLaneGapIds:
          p66FullImplementationGapAccounting.effectiveRedLaneGapIds,
        effectiveRedLaneGapCount:
          p66FullImplementationGapAccounting.effectiveRedLaneGapCount,
        closureAuditMatrix:
          p66FullImplementationGapAccounting.closureAuditMatrix,
        closureAuditMatrixCount:
          p66FullImplementationGapAccounting.closureAuditMatrixCount,
        closureAuditClosedByLocalProofChainIds:
          p66FullImplementationGapAccounting.closureAuditClosedByLocalProofChainIds,
        closureAuditClosedByLocalProofChainCount:
          p66FullImplementationGapAccounting.closureAuditClosedByLocalProofChainCount,
        closureAuditRequiresLocalImplementationIds:
          p66FullImplementationGapAccounting.closureAuditRequiresLocalImplementationIds,
        closureAuditRequiresLocalImplementationCount:
          p66FullImplementationGapAccounting.closureAuditRequiresLocalImplementationCount,
        closureAuditRequiresA5EvidenceIds:
          p66FullImplementationGapAccounting.closureAuditRequiresA5EvidenceIds,
        closureAuditRequiresA5EvidenceCount:
          p66FullImplementationGapAccounting.closureAuditRequiresA5EvidenceCount,
        closureAuditRequiresRedLaneAuthorizationIds:
          p66FullImplementationGapAccounting.closureAuditRequiresRedLaneAuthorizationIds,
        closureAuditRequiresRedLaneAuthorizationCount:
          p66FullImplementationGapAccounting.closureAuditRequiresRedLaneAuthorizationCount,
        closureAuditUnmodeledManualReviewIds:
          p66FullImplementationGapAccounting.closureAuditUnmodeledManualReviewIds,
        closureAuditUnmodeledManualReviewCount:
          p66FullImplementationGapAccounting.closureAuditUnmodeledManualReviewCount,
        closureAuditCanClaimReadiness:
          p66FullImplementationGapAccounting.closureAuditCanClaimReadiness,
        closureAuthoritySummary:
          p66FullImplementationGapAccounting.closureAuthoritySummary,
        closureAuthorityStatus:
          p66FullImplementationGapAccounting.closureAuthorityStatus,
        nextClosureAuthority:
          p66FullImplementationGapAccounting.nextClosureAuthority,
        rc8Rc9ReadinessEvidenceAudit:
          p66FullImplementationGapAccounting.rc8Rc9ReadinessEvidenceAudit,
        rc8Rc9ReadinessEvidenceAuditStatus:
          p66FullImplementationGapAccounting.rc8Rc9ReadinessEvidenceAuditStatus,
        rc8Rc9ReadinessEvidenceAuditReadyToEnterRc9DecisionPacket:
          p66FullImplementationGapAccounting.rc8Rc9ReadinessEvidenceAuditReadyToEnterRc9DecisionPacket,
        rc8Rc9ReadinessEvidenceAuditReadyToRequestRcCutoverApproval:
          p66FullImplementationGapAccounting.rc8Rc9ReadinessEvidenceAuditReadyToRequestRcCutoverApproval,
        rc8Rc9ReadinessEvidenceAuditRemainingAuthorityGapCount:
          p66FullImplementationGapAccounting.rc8Rc9ReadinessEvidenceAuditRemainingAuthorityGapCount,
        rc8Rc9ReadinessEvidenceAuditCanClaimReadiness:
          p66FullImplementationGapAccounting.rc8Rc9ReadinessEvidenceAuditCanClaimReadiness,
        acceptedRuntimeSummaryZeroGap:
          p66FullImplementationGapAccounting.acceptedRuntimeSummaryZeroGap,
        decisionPacketRouteStatus:
          p66FullImplementationGapAccounting.decisionPacketRouteStatus,
        readyToRequestRcCutoverApproval:
          p66FullImplementationGapAccounting.readyToRequestRcCutoverApproval,
        rcCutoverApprovalRequired:
          p66FullImplementationGapAccounting.rcCutoverApprovalRequired,
        rcCutoverApproved:
          p66FullImplementationGapAccounting.rcCutoverApproved,
        rcCutoverExecuted:
          p66FullImplementationGapAccounting.rcCutoverExecuted,
        rcCutoverExecutionAllowed:
          p66FullImplementationGapAccounting.rcCutoverExecutionAllowed,
        nextSafeClosureCandidates:
          p66FullImplementationGapAccounting.nextSafeClosureCandidates,
        acceptedRuntimeSummaryBound:
          p66FullImplementationGapAccounting.acceptedRuntimeSummaryBound,
        acceptedRuntimeSummaryRemainingGapIds:
          p66FullImplementationGapAccounting.acceptedRuntimeSummaryRemainingGapIds,
        acceptedRuntimeSummaryRemainingGapCount:
          p66FullImplementationGapAccounting.acceptedRuntimeSummaryRemainingGapCount,
        acceptedRuntimeSummaryLocallyEvidencedGapIds:
          p66FullImplementationGapAccounting.acceptedRuntimeSummaryLocallyEvidencedGapIds,
        acceptedRuntimeSummaryLocallyEvidencedGapCount:
          p66FullImplementationGapAccounting.acceptedRuntimeSummaryLocallyEvidencedGapCount,
        validationEvidenceFreshnessBound:
          p66FullImplementationGapAccounting.validationEvidenceFreshnessBound,
        validationEvidenceFreshnessStatus:
          p66FullImplementationGapAccounting.validationEvidenceFreshnessStatus,
        validationEvidenceGateReadinessStatus:
          p66FullImplementationGapAccounting.validationEvidenceGateReadinessStatus,
        validationEvidenceExplicitEvidenceUsable:
          p66FullImplementationGapAccounting.validationEvidenceExplicitEvidenceUsable,
        validationEvidenceCommandCoverageStatus:
          p66FullImplementationGapAccounting.validationEvidenceCommandCoverageStatus,
        validationEvidenceConfidencePostureStatus:
          p66FullImplementationGapAccounting.validationEvidenceConfidencePostureStatus,
        blockerSummaryBound:
          p66FullImplementationGapAccounting.blockerSummaryBound,
        validationBlockerIds:
          p66FullImplementationGapAccounting.validationBlockerIds,
        validationBlockerCount:
          p66FullImplementationGapAccounting.validationBlockerCount,
        runtimeRequiredBlockerIds:
          p66FullImplementationGapAccounting.runtimeRequiredBlockerIds,
        runtimeRequiredBlockerCount:
          p66FullImplementationGapAccounting.runtimeRequiredBlockerCount,
        a5GatedBlockerIds:
          p66FullImplementationGapAccounting.a5GatedBlockerIds,
        a5GatedBlockerCount:
          p66FullImplementationGapAccounting.a5GatedBlockerCount,
        totalBlockerCount:
          p66FullImplementationGapAccounting.totalBlockerCount,
        closureStatus:
          p66FullImplementationGapAccounting.closureStatus,
        closureReady:
          p66FullImplementationGapAccounting.closureReady,
        closureCanClaimReady:
          p66FullImplementationGapAccounting.closureCanClaimReady,
        closureCriteria:
          p66FullImplementationGapAccounting.closureCriteria,
        closureMissingCriteria:
          p66FullImplementationGapAccounting.closureMissingCriteria,
        fixtureReadByAggregator: false,
        testExecutedByAggregator: false,
        helperExecutedByAggregator: false,
        gateExecutedByAggregator: false,
        runnerExecutedByAggregator: false,
        evidenceCollectedByAggregator: false,
        liveMcpRefreshedByAggregator: false,
        callsProviders: false,
        startsServices: false,
        readsFiles: false,
        scansRealMemory: false,
        readsRuntimeStores: false,
        realMemoryContentRead: false,
        realMemoryPreviewed: false,
        durableMemoryTouched: false,
        durableAuditWritten: false,
        publicMcpExpanded: false,
        runtimeMutationImplemented: false,
        fullAggregatorImplementationComplete: false,
        runtimeIntegrated: false,
        finalRcMatrixExecuted: false,
        finalRcMatrixReady: false,
        runtimeReady: false,
        rcReady: false,
        decisionImpact: 'none_report_only',
        blockedDecisionRequired: true,
        canClaimRuntimeReady: false,
        canClaimFinalRcReady: false,
        canClaimV1RcReady: false
      },
      p66ValidationAggregatorRuntimeProofCollector: runtimeProofCollector,
      cm1086V11HardeningValidationAggregator: v11HardeningValidationAggregator,
      p66ValidationAggregatorSourceRegistryProof: {
        status: 'static_helper_capability_added_not_executed',
        sourceMode: 'static_report_shape_only',
        doc: 'docs/P66_5_VALIDATION_AGGREGATOR_SOURCE_REGISTRY_PROOF_HELPER.md',
        helper: 'src/core/ValidationAggregatorSourceRegistryProofContract.js',
        test: 'tests/validation-aggregator-source-registry-proof-contract-helper.test.js',
        noTouchRegression: 'tests/no-touch-boundary-regression.test.js',
        schemaVersion: 'p66-validation-aggregator-source-registry-proof-v1',
        policyVersion: 'p66-validation-aggregator-source-registry-proof-policy-v1',
        manifestVersion: 'p66-validation-aggregator-source-registry-proof-manifest-v1',
        helperCapabilityOnly: true,
        explicitInputOnly: true,
        exactSetRequired: true,
        publicToolsFrozen: true,
        requiredSourceRegistryIds: P66_SOURCE_REGISTRY_REQUIRED_IDS.map(id => ({
          id,
          required: true,
          mustFailClosedWhenMissing: true
        })),
        failClosedReasons: P66_SOURCE_REGISTRY_FAIL_CLOSED_REASONS,
        helperImportedByAggregator: false,
        helperExecutedByAggregator: false,
        fixtureReadByAggregator: false,
        evidenceFileReadByAggregator: false,
        commandExecutedByAggregator: false,
        gateExecutedByAggregator: false,
        runnerExecutedByAggregator: false,
        evidenceCollectedByAggregator: false,
        liveMcpRefreshedByAggregator: false,
        callsProviders: false,
        startsServices: false,
        readsFiles: false,
        scansDirectories: false,
        scansRealMemory: false,
        readsRuntimeStores: false,
        durableMemoryTouched: false,
        durableAuditWritten: false,
        publicMcpExpanded: false,
        runtimeMutationImplemented: false,
        fullAggregatorImplementationComplete: false,
        runtimeIntegrated: false,
        runtimeReady: false,
        finalRcMatrixReady: false,
        rcReady: false,
        decisionImpact: 'none_report_only',
        blockedDecisionRequired: true,
        canClaimRuntimeReady: false,
        canClaimFinalRcReady: false,
        canClaimV1RcReady: false
      },
      p66ValidationAggregatorEvidenceFreshnessProof: {
        status: 'static_helper_capability_added_not_executed',
        sourceMode: 'static_report_shape_only',
        doc: 'docs/P66_9_VALIDATION_AGGREGATOR_EVIDENCE_FRESHNESS_PROOF_HELPER.md',
        helper: 'src/core/ValidationAggregatorEvidenceFreshnessProofContract.js',
        test: 'tests/validation-aggregator-evidence-freshness-proof-contract-helper.test.js',
        noTouchRegression: 'tests/no-touch-boundary-regression.test.js',
        schemaVersion: 'p66-validation-aggregator-evidence-freshness-proof-v1',
        policyVersion: 'p66-validation-aggregator-evidence-freshness-proof-policy-v1',
        manifestVersion: 'p66-validation-aggregator-evidence-freshness-proof-manifest-v1',
        helperCapabilityOnly: true,
        explicitInputOnly: true,
        timestampPolicyExplicitOnly: true,
        baselineBindingRequired: true,
        freshnessWindowRequired: true,
        publicToolsFrozen: true,
        requiredFreshnessFields: P66_EVIDENCE_FRESHNESS_REQUIRED_FIELDS.map(id => ({
          id,
          required: true,
          mustFailClosedWhenMissing: true
        })),
        failClosedReasons: P66_EVIDENCE_FRESHNESS_FAIL_CLOSED_REASONS,
        helperImportedByAggregator: false,
        helperExecutedByAggregator: false,
        fixtureReadByAggregator: false,
        evidenceFileReadByAggregator: false,
        commandExecutedByAggregator: false,
        gateExecutedByAggregator: false,
        runnerExecutedByAggregator: false,
        evidenceCollectedByAggregator: false,
        liveMcpRefreshedByAggregator: false,
        callsProviders: false,
        startsServices: false,
        readsFiles: false,
        scansDirectories: false,
        scansRealMemory: false,
        readsRuntimeStores: false,
        durableMemoryTouched: false,
        durableAuditWritten: false,
        publicMcpExpanded: false,
        runtimeMutationImplemented: false,
        fullAggregatorImplementationComplete: false,
        runtimeIntegrated: false,
        runtimeReady: false,
        finalRcMatrixReady: false,
        rcReady: false,
        decisionImpact: 'none_report_only',
        blockedDecisionRequired: true,
        canClaimRuntimeReady: false,
        canClaimFinalRcReady: false,
        canClaimV1RcReady: false
      },
      p66ValidationAggregatorBaselineBindingProof: {
        status: 'static_helper_capability_added_not_executed',
        sourceMode: 'static_report_shape_only',
        doc: 'docs/P66_13_VALIDATION_AGGREGATOR_BASELINE_BINDING_PROOF_HELPER.md',
        helper: 'src/core/ValidationAggregatorBaselineBindingProofContract.js',
        test: 'tests/validation-aggregator-baseline-binding-proof-contract-helper.test.js',
        noTouchRegression: 'tests/no-touch-boundary-regression.test.js',
        schemaVersion: 'p66-validation-aggregator-baseline-binding-proof-v1',
        policyVersion: 'p66-validation-aggregator-baseline-binding-proof-policy-v1',
        manifestVersion: 'p66-validation-aggregator-baseline-binding-proof-manifest-v1',
        helperCapabilityOnly: true,
        explicitInputOnly: true,
        targetCommitRequired: true,
        targetCommitMustEqualEvidenceSubjectCommit: true,
        commitRoleSeparationRequired: true,
        noCheckoutRequiredByBridge: true,
        noRemoteLookupRequiredByBridge: true,
        publicToolsFrozen: true,
        requiredBaselineBindingFields: P66_BASELINE_BINDING_REQUIRED_FIELDS.map(id => ({
          id,
          required: true,
          mustFailClosedWhenMissing: true
        })),
        allowedBaselineKinds: P66_BASELINE_BINDING_KINDS,
        failClosedReasons: P66_BASELINE_BINDING_FAIL_CLOSED_REASONS,
        helperImportedByAggregator: false,
        helperExecutedByAggregator: false,
        fixtureReadByAggregator: false,
        evidenceFileReadByAggregator: false,
        commandExecutedByAggregator: false,
        gitCheckoutByAggregator: false,
        gitResetByAggregator: false,
        gitDetachHeadByAggregator: false,
        gitRemoteLookupByAggregator: false,
        gateExecutedByAggregator: false,
        runnerExecutedByAggregator: false,
        evidenceCollectedByAggregator: false,
        liveMcpRefreshedByAggregator: false,
        callsProviders: false,
        startsServices: false,
        readsFiles: false,
        scansDirectories: false,
        scansRealMemory: false,
        readsRuntimeStores: false,
        durableMemoryTouched: false,
        durableAuditWritten: false,
        publicMcpExpanded: false,
        runtimeMutationImplemented: false,
        fullAggregatorImplementationComplete: false,
        runtimeIntegrated: false,
        runtimeReady: false,
        finalRcMatrixReady: false,
        rcReady: false,
        decisionImpact: 'none_report_only',
        blockedDecisionRequired: true,
        canClaimRuntimeReady: false,
        canClaimFinalRcReady: false,
        canClaimV1RcReady: false
      },
      p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof: {
        status: 'static_helper_capability_added_not_executed',
        sourceMode: 'static_report_shape_only',
        doc: 'docs/P66_17_VALIDATION_AGGREGATOR_RUNTIME_EVIDENCE_SUMMARY_NORMALIZATION_HELPER.md',
        helper: 'src/core/ValidationAggregatorRuntimeEvidenceSummaryNormalizationProofContract.js',
        test: 'tests/validation-aggregator-runtime-evidence-summary-normalization-proof-contract-helper.test.js',
        noTouchRegression: 'tests/no-touch-boundary-regression.test.js',
        schemaVersion: 'p66-validation-aggregator-runtime-evidence-summary-normalization-proof-v1',
        policyVersion: 'p66-validation-aggregator-runtime-evidence-summary-normalization-proof-policy-v1',
        manifestVersion:
          'p66-validation-aggregator-runtime-evidence-summary-normalization-proof-manifest-v1',
        helperCapabilityOnly: true,
        explicitInputOnly: true,
        sanitizedSummaryOnly: true,
        publicToolsFrozen: true,
        requiredSummaryFields: P66_RUNTIME_EVIDENCE_SUMMARY_NORMALIZATION_REQUIRED_FIELDS.map(id => ({
          id,
          required: true,
          mustFailClosedWhenMissing: true
        })),
        failClosedReasons: P66_RUNTIME_EVIDENCE_SUMMARY_NORMALIZATION_FAIL_CLOSED_REASONS,
        helperImportedByAggregator: false,
        helperExecutedByAggregator: false,
        fixtureReadByAggregator: false,
        evidenceFileReadByAggregator: false,
        commandExecutedByAggregator: false,
        gateExecutedByAggregator: false,
        runnerExecutedByAggregator: false,
        evidenceCollectedByAggregator: false,
        liveMcpRefreshedByAggregator: false,
        callsProviders: false,
        startsServices: false,
        readsFiles: false,
        scansDirectories: false,
        scansRealMemory: false,
        readsRuntimeStores: false,
        durableMemoryTouched: false,
        durableAuditWritten: false,
        publicMcpExpanded: false,
        runtimeMutationImplemented: false,
        fullAggregatorImplementationComplete: false,
        runtimeIntegrated: false,
        runtimeReady: false,
        finalRcMatrixReady: false,
        rcReady: false,
        decisionImpact: 'none_report_only',
        blockedDecisionRequired: true,
        canClaimRuntimeReady: false,
        canClaimFinalRcReady: false,
        canClaimV1RcReady: false
      },
      p66ValidationAggregatorMissingStaleEvidenceFailClosedProof: {
        status: 'static_helper_capability_added_not_executed',
        sourceMode: 'static_report_shape_only',
        doc: 'docs/P66_21_VALIDATION_AGGREGATOR_MISSING_OR_STALE_EVIDENCE_FAIL_CLOSED_HELPER.md',
        helper: 'src/core/ValidationAggregatorMissingStaleEvidenceFailClosedProofContract.js',
        test: 'tests/validation-aggregator-missing-stale-evidence-fail-closed-proof-contract-helper.test.js',
        noTouchRegression: 'tests/no-touch-boundary-regression.test.js',
        schemaVersion: 'p66-validation-aggregator-missing-stale-evidence-fail-closed-proof-v1',
        policyVersion: 'p66-validation-aggregator-missing-stale-evidence-fail-closed-proof-policy-v1',
        manifestVersion:
          'p66-validation-aggregator-missing-stale-evidence-fail-closed-proof-manifest-v1',
        helperCapabilityOnly: true,
        explicitInputOnly: true,
        metadataOnly: true,
        publicToolsFrozen: true,
        requiredEvidenceGroups: P66_MISSING_STALE_EVIDENCE_REQUIRED_GROUPS.map(id => ({
          id,
          required: true,
          mustFailClosedWhenMissing: true,
          mustFailClosedWhenStale: true
        })),
        failClosedReasons: P66_MISSING_STALE_EVIDENCE_FAIL_CLOSED_REASONS,
        helperImportedByAggregator: false,
        helperExecutedByAggregator: false,
        fixtureReadByAggregator: false,
        evidenceFileReadByAggregator: false,
        implicitEvidenceRefreshByAggregator: false,
        commandExecutedByAggregator: false,
        gateExecutedByAggregator: false,
        runnerExecutedByAggregator: false,
        evidenceCollectedByAggregator: false,
        liveMcpRefreshedByAggregator: false,
        callsProviders: false,
        startsServices: false,
        readsFiles: false,
        scansDirectories: false,
        scansRealMemory: false,
        readsRuntimeStores: false,
        durableMemoryTouched: false,
        durableAuditWritten: false,
        publicMcpExpanded: false,
        runtimeMutationImplemented: false,
        fullAggregatorImplementationComplete: false,
        runtimeIntegrated: false,
        runtimeReady: false,
        finalRcMatrixReady: false,
        rcReady: false,
        decisionImpact: 'none_report_only',
        blockedDecisionRequired: true,
        canClaimRuntimeReady: false,
        canClaimFinalRcReady: false,
        canClaimV1RcReady: false
      },
      p66ValidationAggregatorUnsupportedSourceFailClosedProof: {
        status: 'static_helper_capability_added_not_executed',
        sourceMode: 'static_report_shape_only',
        doc: 'docs/P66_25_VALIDATION_AGGREGATOR_UNSUPPORTED_SOURCE_FAIL_CLOSED_HELPER.md',
        helper: 'src/core/ValidationAggregatorUnsupportedSourceFailClosedProofContract.js',
        test: 'tests/validation-aggregator-unsupported-source-fail-closed-proof-contract-helper.test.js',
        noTouchRegression: 'tests/no-touch-boundary-regression.test.js',
        schemaVersion: 'p66-validation-aggregator-unsupported-source-fail-closed-proof-v1',
        policyVersion: 'p66-validation-aggregator-unsupported-source-fail-closed-proof-policy-v1',
        manifestVersion:
          'p66-validation-aggregator-unsupported-source-fail-closed-proof-manifest-v1',
        helperCapabilityOnly: true,
        explicitInputOnly: true,
        metadataOnly: true,
        publicToolsFrozen: true,
        failClosedCases: P66_UNSUPPORTED_SOURCE_FAIL_CLOSED_CASES.map(id => ({
          id,
          required: true,
          mustFailClosed: true
        })),
        failClosedReasons: P66_UNSUPPORTED_SOURCE_FAIL_CLOSED_REASONS,
        helperImportedByAggregator: false,
        helperExecutedByAggregator: false,
        fixtureReadByAggregator: false,
        evidenceFileReadByAggregator: false,
        commandExecutedByAggregator: false,
        gateExecutedByAggregator: false,
        runnerExecutedByAggregator: false,
        evidenceCollectedByAggregator: false,
        liveMcpRefreshedByAggregator: false,
        callsProviders: false,
        startsServices: false,
        readsFiles: false,
        scansDirectories: false,
        scansRealMemory: false,
        readsRuntimeStores: false,
        durableMemoryTouched: false,
        durableAuditWritten: false,
        publicMcpExpanded: false,
        runtimeMutationImplemented: false,
        fullAggregatorImplementationComplete: false,
        runtimeIntegrated: false,
        runtimeReady: false,
        finalRcMatrixReady: false,
        rcReady: false,
        decisionImpact: 'none_report_only',
        blockedDecisionRequired: true,
        canClaimRuntimeReady: false,
        canClaimFinalRcReady: false,
        canClaimV1RcReady: false
      },
      p66ValidationAggregatorNoTouchBoundaryProof: {
        status: 'static_helper_capability_added_not_executed',
        sourceMode: 'static_report_shape_only',
        doc: 'docs/P66_29_VALIDATION_AGGREGATOR_NO_TOUCH_BOUNDARY_HELPER.md',
        helper: 'src/core/ValidationAggregatorNoTouchBoundaryProofContract.js',
        test: 'tests/validation-aggregator-no-touch-boundary-proof-contract-helper.test.js',
        noTouchRegression: 'tests/no-touch-boundary-regression.test.js',
        schemaVersion: 'p66-validation-aggregator-no-touch-boundary-proof-v1',
        policyVersion: 'p66-validation-aggregator-no-touch-boundary-proof-policy-v1',
        manifestVersion:
          'p66-validation-aggregator-no-touch-boundary-proof-manifest-v1',
        helperCapabilityOnly: true,
        explicitInputOnly: true,
        metadataOnly: true,
        publicToolsFrozen: true,
        targetFamilies: P66_NO_TOUCH_BOUNDARY_TARGET_FAMILIES.map(id => ({
          id,
          required: true
        })),
        disallowedImports: P66_NO_TOUCH_BOUNDARY_DISALLOWED_IMPORTS,
        disallowedRuntimeCalls: P66_NO_TOUCH_BOUNDARY_DISALLOWED_RUNTIME_CALLS,
        failClosedCases: P66_NO_TOUCH_BOUNDARY_FAIL_CLOSED_CASES.map(id => ({
          id,
          required: true,
          mustFailClosed: true
        })),
        failClosedReasons: P66_NO_TOUCH_BOUNDARY_FAIL_CLOSED_REASONS,
        helperImportedByAggregator: false,
        helperExecutedByAggregator: false,
        fixtureReadByAggregator: false,
        evidenceFileReadByAggregator: false,
        commandExecutedByAggregator: false,
        gateExecutedByAggregator: false,
        runnerExecutedByAggregator: false,
        evidenceCollectedByAggregator: false,
        liveMcpRefreshedByAggregator: false,
        callsProviders: false,
        startsServices: false,
        readsFiles: false,
        scansDirectories: false,
        scansSourceAtRuntime: false,
        scansRealMemory: false,
        readsRuntimeStores: false,
        durableMemoryTouched: false,
        durableAuditWritten: false,
        publicMcpExpanded: false,
        runtimeMutationImplemented: false,
        fullAggregatorImplementationComplete: false,
        runtimeIntegrated: false,
        runtimeReady: false,
        finalRcMatrixReady: false,
        rcReady: false,
        decisionImpact: 'none_report_only',
        blockedDecisionRequired: true,
        canClaimRuntimeReady: false,
        canClaimFinalRcReady: false,
        canClaimV1RcReady: false
      },
      p66ValidationAggregatorReadinessOverclaimRejectionProof: {
        status: 'static_helper_capability_added_not_executed',
        sourceMode: 'static_report_shape_only',
        doc: 'docs/P66_33_VALIDATION_AGGREGATOR_READINESS_OVERCLAIM_REJECTION_HELPER.md',
        helper:
          'src/core/ValidationAggregatorReadinessOverclaimRejectionProofContract.js',
        test:
          'tests/validation-aggregator-readiness-overclaim-rejection-proof-contract-helper.test.js',
        noTouchRegression: 'tests/no-touch-boundary-regression.test.js',
        schemaVersion:
          'p66-validation-aggregator-readiness-overclaim-rejection-proof-v1',
        policyVersion:
          'p66-validation-aggregator-readiness-overclaim-rejection-proof-policy-v1',
        manifestVersion:
          'p66-validation-aggregator-readiness-overclaim-rejection-proof-manifest-v1',
        helperCapabilityOnly: true,
        explicitInputOnly: true,
        metadataOnly: true,
        publicToolsFrozen: true,
        requiredReadinessClaims: P66_READINESS_OVERCLAIM_REQUIRED_CLAIMS.map(id => ({
          id,
          required: true,
          mustReject: true
        })),
        failClosedCases: P66_READINESS_OVERCLAIM_FAIL_CLOSED_CASES.map(id => ({
          id,
          required: true,
          mustFailClosed: true
        })),
        allowedEvidencePosture: P66_READINESS_OVERCLAIM_ALLOWED_EVIDENCE_POSTURE,
        disallowedReadinessPosture:
          P66_READINESS_OVERCLAIM_DISALLOWED_READINESS_POSTURE,
        failClosedReasons: P66_READINESS_OVERCLAIM_FAIL_CLOSED_REASONS,
        helperImportedByAggregator: false,
        helperExecutedByAggregator: false,
        fixtureReadByAggregator: false,
        evidenceFileReadByAggregator: false,
        commandExecutedByAggregator: false,
        gateExecutedByAggregator: false,
        runnerExecutedByAggregator: false,
        evidenceCollectedByAggregator: false,
        liveMcpRefreshedByAggregator: false,
        callsProviders: false,
        startsServices: false,
        readsFiles: false,
        scansDirectories: false,
        scansSourceAtRuntime: false,
        scansRealMemory: false,
        readsRuntimeStores: false,
        durableMemoryTouched: false,
        durableAuditWritten: false,
        publicMcpExpanded: false,
        validateMemoryPublic: false,
        configMutated: false,
        startupWatchdogOperated: false,
        tagReleaseDeploy: false,
        runtimeMutationImplemented: false,
        fullAggregatorImplementationComplete: false,
        runtimeIntegrated: false,
        runtimeReady: false,
        finalRcMatrixReady: false,
        v1RcReady: false,
        rcReady: false,
        cutoverReady: false,
        decisionImpact: 'none_report_only',
        blockedDecisionRequired: true,
        canClaimRuntimeReady: false,
        canClaimFinalRcReady: false,
        canClaimV1RcReady: false,
        canClaimRcReady: false,
        canClaimCutoverReady: false
      },
      p66ValidationAggregatorGovernanceRuntimeLoopGapProof: {
        status: 'static_helper_capability_added_not_executed',
        sourceMode: 'static_report_shape_only',
        doc: 'docs/P66_39_VALIDATION_AGGREGATOR_GOVERNANCE_RUNTIME_LOOP_GAP_HELPER.md',
        helper: 'src/core/ValidationAggregatorGovernanceRuntimeLoopGapContract.js',
        test:
          'tests/validation-aggregator-governance-runtime-loop-gap-contract-helper.test.js',
        noTouchRegression: 'tests/no-touch-boundary-regression.test.js',
        schemaVersion:
          'p66-validation-aggregator-governance-runtime-loop-gap-fixture-v1',
        policyVersion:
          'p66-validation-aggregator-governance-runtime-loop-gap-fixture-policy-v1',
        manifestVersion:
          'p66-validation-aggregator-governance-runtime-loop-gap-fixture-manifest-v1',
        selectedGap: 'governance_review_approval_audit_runtime_loop_not_executed',
        helperCapabilityOnly: true,
        explicitInputOnly: true,
        metadataOnly: true,
        publicToolsFrozen: true,
        stageAcceptanceCases: P66_GOVERNANCE_RUNTIME_LOOP_STAGE_IDS.map(id => ({
          id,
          required: true,
          canExecute: false,
          durableWriteAllowed: false
        })),
        requiredRuntimeEvidenceGroups:
          P66_GOVERNANCE_RUNTIME_LOOP_REQUIRED_EVIDENCE_GROUPS.map(id => ({
            id,
            required: true,
            currentStatus: 'missing',
            mustFailClosedWhenMissing: true
          })),
        approvalStates: P66_GOVERNANCE_RUNTIME_LOOP_APPROVAL_STATES.map(id => ({
          id,
          executionAllowed: false
        })),
        failClosedCases: P66_GOVERNANCE_RUNTIME_LOOP_FAIL_CLOSED_CASES.map(id => ({
          id,
          required: true,
          mustFailClosed: true
        })),
        disallowedWork: P66_GOVERNANCE_RUNTIME_LOOP_DISALLOWED_WORK,
        failClosedReasons: P66_GOVERNANCE_RUNTIME_LOOP_FAIL_CLOSED_REASONS,
        helperImportedByAggregator: false,
        helperExecutedByAggregator: false,
        fixtureReadByAggregator: false,
        evidenceFileReadByAggregator: false,
        realReviewPacketReadByAggregator: false,
        realApprovalPacketReadByAggregator: false,
        realAuditLogReadByAggregator: false,
        commandExecutedByAggregator: false,
        gateExecutedByAggregator: false,
        runnerExecutedByAggregator: false,
        governanceRuntimeLoopExecutedByAggregator: false,
        approvalExecutedByAggregator: false,
        governedActionExecutedByAggregator: false,
        evidenceCollectedByAggregator: false,
        liveMcpRefreshedByAggregator: false,
        callsProviders: false,
        startsServices: false,
        readsFiles: false,
        scansDirectories: false,
        scansRealMemory: false,
        readsRuntimeStores: false,
        durableMemoryTouched: false,
        durableAuditWritten: false,
        publicMcpExpanded: false,
        validateMemoryPublic: false,
        configMutated: false,
        startupWatchdogOperated: false,
        tagReleaseDeploy: false,
        runtimeMutationImplemented: false,
        governanceRuntimeLoopReady: false,
        governanceRuntimeLoopExecuted: false,
        approvalExecutionReady: false,
        auditWriterReady: false,
        durableWriteReady: false,
        fullAggregatorImplementationComplete: false,
        runtimeIntegrated: false,
        runtimeReady: false,
        finalRcMatrixReady: false,
        v1RcReady: false,
        rcReady: false,
        cutoverReady: false,
        decisionImpact: 'none_report_only',
        blockedDecisionRequired: true,
        canClaimRuntimeReady: false,
        canClaimFinalRcReady: false,
        canClaimV1RcReady: false,
        canClaimRcReady: false,
        canClaimCutoverReady: false
      },
      p66ValidationAggregatorRecallIsolationRuntimeProof: {
        status: 'static_helper_capability_added_not_executed',
        sourceMode: 'static_report_shape_only',
        doc: 'docs/P66_44_VALIDATION_AGGREGATOR_RECALL_ISOLATION_RUNTIME_PROOF_HELPER.md',
        helper: 'src/core/ValidationAggregatorRecallIsolationRuntimeProofContract.js',
        test:
          'tests/validation-aggregator-recall-isolation-runtime-proof-contract-helper.test.js',
        noTouchRegression: 'tests/no-touch-boundary-regression.test.js',
        schemaVersion:
          'p66-validation-aggregator-recall-isolation-runtime-proof-fixture-v1',
        policyVersion:
          'p66-validation-aggregator-recall-isolation-runtime-proof-fixture-policy-v1',
        manifestVersion:
          'p66-validation-aggregator-recall-isolation-runtime-proof-fixture-manifest-v1',
        selectedGap: 'recall_isolation_runtime_proof_not_executed',
        sourcePlan:
          'P66.42-validation-aggregator-recall-isolation-runtime-proof-gap-planning',
        helperCapabilityOnly: true,
        explicitInputOnly: true,
        metadataOnly: true,
        publicToolsFrozen: true,
        isolatedRecordFamilyAcceptanceCases:
          P66_RECALL_ISOLATION_RECORD_FAMILIES.map(id => ({
            id,
            required: true,
            currentStatus: 'acceptance_defined_not_runtime_executed',
            mustBeExcludedFromAllProofSurfaces: true,
            mustFailClosedWhenObserved: true
          })),
        proofSurfaceAcceptanceCases:
          P66_RECALL_ISOLATION_PROOF_SURFACES.map(id => ({
            id,
            required: true,
            runtimeStoreReadAllowed: false,
            contaminationAllowed: false,
            syntheticEvidenceAllowed: true,
            realDataEvidenceAllowed: false,
            futureEvidenceRequired: true
          })),
        controlCases: [
          {
            id: 'active_in_scope_user_memory_positive_control',
            recordFamily: 'active_in_scope_user_memory',
            required: true,
            mayEnterNormalRecall: true,
            mayEnterVectorIndex: true,
            mayEnterCandidateCache: true,
            mayEnterRanking: true,
            mayEnterProjection: true,
            mayEnterUserVisibleAuditSummary: true,
            mayEnterRecallAuditSummary: true
          },
          {
            id: 'isolated_record_negative_controls',
            recordFamilies: P66_RECALL_ISOLATION_RECORD_FAMILIES,
            required: true,
            mayEnterNormalRecall: false,
            mayEnterVectorIndex: false,
            mayEnterCandidateCache: false,
            mayEnterRanking: false,
            mayEnterProjection: false,
            mayEnterUserVisibleAuditSummary: false,
            mayEnterRecallAuditSummary: false
          }
        ],
        requiredRuntimeEvidenceGroups:
          P66_RECALL_ISOLATION_REQUIRED_RUNTIME_EVIDENCE_GROUPS.map(id => ({
            id,
            required: true,
            currentStatus: 'missing',
            mustFailClosedWhenMissing: true
          })),
        failClosedCases: P66_RECALL_ISOLATION_FAIL_CLOSED_CASES.map(id => ({
          id,
          required: true,
          mustFailClosed: true
        })),
        disallowedWork: P66_RECALL_ISOLATION_DISALLOWED_WORK,
        failClosedReasons: P66_RECALL_ISOLATION_FAIL_CLOSED_REASONS,
        helperImportedByAggregator: false,
        helperExecutedByAggregator: false,
        fixtureReadByAggregator: false,
        evidenceFileReadByAggregator: false,
        commandExecutedByAggregator: false,
        gateExecutedByAggregator: false,
        runnerExecutedByAggregator: false,
        recallExecutedByAggregator: false,
        recallIsolationRuntimeProofExecutedByAggregator: false,
        contaminationReportProducedByAggregator: false,
        realMemoryScannedByAggregator: false,
        diaryScannedByAggregator: false,
        sqliteScannedByAggregator: false,
        vectorIndexScannedByAggregator: false,
        candidateCacheScannedByAggregator: false,
        recallAuditScannedByAggregator: false,
        runtimeStoreScannedByAggregator: false,
        evidenceCollectedByAggregator: false,
        liveMcpRefreshedByAggregator: false,
        callsProviders: false,
        startsServices: false,
        readsFiles: false,
        scansDirectories: false,
        scansRealMemory: false,
        readsRuntimeStores: false,
        durableMemoryTouched: false,
        durableAuditWritten: false,
        publicMcpExpanded: false,
        validateMemoryPublic: false,
        configMutated: false,
        startupWatchdogOperated: false,
        tagReleaseDeploy: false,
        runtimeMutationImplemented: false,
        recallIsolationRuntimeProofReady: false,
        recallIsolationRuntimeProofExecuted: false,
        contaminationReportReady: false,
        durableWriteReady: false,
        fullAggregatorImplementationComplete: false,
        runtimeIntegrated: false,
        runtimeReady: false,
        finalRcMatrixReady: false,
        v1RcReady: false,
        rcReady: false,
        cutoverReady: false,
        decisionImpact: 'none_report_only',
        blockedDecisionRequired: true,
        canClaimRuntimeReady: false,
        canClaimFinalRcReady: false,
        canClaimV1RcReady: false,
        canClaimRcReady: false,
        canClaimCutoverReady: false
      },
      p28ValidationEvidenceReader: {
        status: validationEvidenceReader.acceptedCount > 0
          ? 'explicit_evidence_available'
          : 'no_explicit_validation_evidence',
        implemented: true,
        fullImplementation: false,
        freshness: validationEvidenceFreshness,
        gateReadiness: validationEvidenceGateReadiness,
        commandCoverage: validationEvidenceCommandCoverage,
        rejectionSummary: validationEvidenceRejectionSummary,
        confidencePosture: validationEvidenceConfidencePosture,
        ...validationEvidenceReader
      },
      p65ValidationAggregatorRuntimeEvidenceBridge: {
        ...runtimeEvidenceSummaryBridge
      }
    },
    evidence_sources: EVIDENCE_SOURCES,
    blockers,
    warnings: [
      'This report is generated by a minimal local implementation, not the full final RC matrix executor.',
      'Historical P22 live MCP evidence must not be treated as fresh P23/P24 live evidence.',
      'A4_SAFE_SLICE_PASSED does not mean READY_FOR_V1_0_RC.',
      'P36-P40 local evidence report ready does not mean runtime, final RC matrix, push, release, deploy, config switch, watchdog, or v1.0 RC readiness.',
      'P53 inventory evidence is static report-shape posture only and does not complete the ValidationAggregator full implementation.',
      'P65 runtime evidence summary ingestion is explicit-input-only and does not execute gates or claim RC readiness.',
      'P66.1 full-implementation definition is static and does not make validationAggregatorFullImplementation true.',
      'P66.5 source registry proof helper capability is static and is not executed by the aggregator.',
      'P66.9 evidence freshness proof helper capability is static and is not executed by the aggregator.',
      'P66.13 baseline binding proof helper capability is static and is not executed by the aggregator.',
      'P66.17 runtime evidence summary normalization helper capability is static and is not executed by the aggregator.',
      'P66.21 missing or stale evidence fail-closed helper capability is static and is not executed by the aggregator.',
      'P66.33 readiness overclaim rejection helper capability is static and is not executed by the aggregator.',
      'P66.39 governance runtime loop gap helper capability is static and is not executed by the aggregator.',
      'P66.44 recall isolation runtime proof helper capability is static and is not executed by the aggregator.'
    ],
    recommendations: [
      'Add a scoped CLI wrapper only after this minimal core contract is committed.',
      'Keep package.json unchanged unless separately authorized.',
      'Keep conditional live checks non-starting by default.',
      'Keep A5-gated checks report-only until explicit authorization.'
    ],
    safety: {
      mutated: false,
      providerCalls: 0,
      serviceStarted: false,
      durableMemoryTouched: false,
      realMemoryPreview: false,
      redactionApplied: true,
      rawWorkspaceIdExposed: false,
      rawSecretExposed: false,
      publicMcpExpanded: false,
      mcpSchemaChanged: false,
      runtimeCodeChanged: true,
      packageChanged: false,
      migrationApplied: false,
      importExportApplied: false,
      watchdogStartupInstalled: false,
      configChanged: false,
      pushed: false,
      tagged: false,
      released: false,
      deployed: false
    },
    forbiddenFragments: [
      'authorization:',
      'bearer ',
      'set-cookie',
      'api_key',
      'providerapikey',
      'workspace_id',
      '.env='
    ],
    forbiddenTopLevelKeys: [
      'hitRate',
      'qualityScore',
      'providerLatency',
      'productionMemorySnippet'
    ]
  };
  const rc9DecisionPacket = renderRc9DecisionPacketFromAggregatorReport(report, {
    generatedAt
  });

  report.summary.rc9DecisionPacketAvailable = true;
  report.summary.rc9DecisionPacketSourceMode = rc9DecisionPacket.sourceMode;
  report.summary.rc9DecisionPacketStatus = rc9DecisionPacket.status;
  report.summary.rc9DecisionPacketDecision = rc9DecisionPacket.decision;
  report.summary.rc9DecisionPacketFormat = rc9DecisionPacket.format;
  report.summary.rc9DecisionPacketReadyToRequestRcCutoverApproval =
    rc9DecisionPacket.readyToRequestRcCutoverApproval;
  report.summary.rc9DecisionPacketRemainingGapCount =
    rc9DecisionPacket.remainingGapCount;
  report.summary.rc9DecisionPacketRcCutoverApproved =
    rc9DecisionPacket.rcCutoverApproved;
  report.summary.rc9DecisionPacketRcCutoverExecutionAllowed =
    rc9DecisionPacket.rcCutoverExecutionAllowed;
  report.summary.rc9DecisionPacketCanClaimRcReady =
    rc9DecisionPacket.canClaimRcReady;
  report.summary.rc9DecisionPacketCutoverApprovalBoundaryAuditStatus =
    rc9DecisionPacket.cutoverApprovalBoundaryAuditStatus;
  report.summary.rc9DecisionPacketCutoverApprovalBoundaryAuditExecutionAllowed =
    rc9DecisionPacket.cutoverApprovalBoundaryAuditExecutionAllowed;
  report.summary.rc9DecisionPacketCutoverApprovalBoundaryAuditCanClaimRcReady =
    rc9DecisionPacket.cutoverApprovalBoundaryAuditCanClaimRcReady;
  report.evidence.rc9DecisionPacket = rc9DecisionPacket;

  return report;
}

function buildRc9DecisionPacketFromAggregatorReport(report = null) {
  const definition = report &&
    typeof report === 'object' &&
    report.evidence &&
    report.evidence.p66ValidationAggregatorFullImplementationDefinition &&
    typeof report.evidence.p66ValidationAggregatorFullImplementationDefinition === 'object'
    ? report.evidence.p66ValidationAggregatorFullImplementationDefinition
    : {};
  const summary = report &&
    typeof report === 'object' &&
    report.summary &&
    typeof report.summary === 'object'
    ? report.summary
    : {};
  const runtimeEvidenceSummaryAccepted =
    summary.runtimeEvidenceSummaryAccepted === true;
  const acceptedRuntimeSummaryZeroGap =
    definition.acceptedRuntimeSummaryZeroGap === true ||
    summary.p66ValidationAggregatorFullImplementationGapAccountingZeroGap === true;
  const readyToRequestRcCutoverApproval =
    runtimeEvidenceSummaryAccepted &&
    acceptedRuntimeSummaryZeroGap &&
    definition.readyToRequestRcCutoverApproval === true;
  const effectiveRemainingGapIds = Array.isArray(definition.effectiveRemainingFullImplementationGapIds)
    ? definition.effectiveRemainingFullImplementationGapIds
    : [];
  const closureAuditMatrix = Array.isArray(definition.closureAuditMatrix)
    ? definition.closureAuditMatrix
    : [];
  const remainingGapAuthorities = effectiveRemainingGapIds.map(gapId => {
    const closureAuditRow = closureAuditMatrix.find(row => row && row.id === gapId) || {};
    return {
      id: gapId,
      status: typeof closureAuditRow.status === 'string'
        ? closureAuditRow.status
        : 'missing_closure_audit_row',
      nextAuthority: typeof closureAuditRow.nextAuthority === 'string'
        ? closureAuditRow.nextAuthority
        : 'manual_review_for_missing_closure_audit_row',
      requiresLocalImplementation: closureAuditRow.requiresLocalImplementation === true,
      requiresA5: closureAuditRow.requiresA5 === true,
      redLane: closureAuditRow.redLane === true,
      localProofChainComplete: closureAuditRow.localProofChainComplete === true,
      canCloseAutomatically: closureAuditRow.canCloseAutomatically === true,
      canClaimReadiness: false
    };
  });
  const notExecuted = [
    'rc_cutover',
    'tag_creation',
    'release_creation',
    'deploy',
    'push',
    'config_watchdog_startup_change',
    'provider_call',
    'broad_real_memory_scan_export',
    'durable_memory_write_for_rc',
    'durable_audit_write_for_rc',
    'migration_import_export_backup_restore_apply',
    'public_mcp_expansion'
  ];
  const cutoverApprovalBoundaryAudit = {
    status: readyToRequestRcCutoverApproval
      ? 'approval_required_not_present_execution_blocked'
      : 'not_ready_for_cutover_approval_request',
    sourceMode: 'decision_packet_boundary_only',
    exactApprovalRequired: true,
    approvalRequired: true,
    approvalPresent: false,
    approvalPacketAccepted: false,
    approvalBoundToCommit: false,
    remoteReleaseTagDeployActionsAuthorized: false,
    configWatchdogStartupChangeAuthorized: false,
    rollbackPathDocumentedForExecution: false,
    validationCommandsAuthorized: false,
    executionAllowed: false,
    executionPerformed: false,
    rcReady: false,
    canClaimRcReady: false,
    requiredApprovalFields: [
      'commit',
      'remote_release_tag_deploy_action_list',
      'config_watchdog_startup_change_scope',
      'rollback_path',
      'validation_commands'
    ],
    authorizedActions: [],
    prohibitedActions: notExecuted
  };

  return {
    status: readyToRequestRcCutoverApproval
      ? 'ready_to_request_rc_cutover_approval_not_rc_ready'
      : 'rc_not_ready_blocked',
    mode: 'decision_packet_only',
    sourceMode: 'aggregator_report_explicit_input_only',
    decision: 'RC_NOT_READY_BLOCKED',
    runtimeEvidenceSummaryAccepted,
    acceptedRuntimeSummaryZeroGap,
    readyToRequestRcCutoverApproval,
    decisionPacketRouteStatus: typeof definition.decisionPacketRouteStatus === 'string'
      ? definition.decisionPacketRouteStatus
      : 'rc_not_ready_blocked_remaining_gaps',
    remainingGapIds: effectiveRemainingGapIds,
    remainingGapCount: effectiveRemainingGapIds.length,
    remainingGapAuthorities,
    remainingGapAuthorityCount: remainingGapAuthorities.length,
    remainingGapAuthorityMissingCount: remainingGapAuthorities
      .filter(row => row.status === 'missing_closure_audit_row').length,
    remainingGapAuthorityCanClaimReadiness: false,
    rcCutoverApprovalRequired: true,
    rcCutoverApprovalPresent: false,
    rcCutoverApproved: false,
    rcCutoverExecuted: false,
    rcCutoverExecutionAllowed: false,
    cutoverApprovalBoundaryAudit,
    cutoverApprovalBoundaryAuditStatus: cutoverApprovalBoundaryAudit.status,
    cutoverApprovalBoundaryAuditExecutionAllowed: false,
    cutoverApprovalBoundaryAuditCanClaimRcReady: false,
    rcReady: false,
    finalRcReady: false,
    runtimeReady: false,
    notExecuted,
    rollbackPath: [
      'leave_local_commits_in_place',
      'create_backup_branch_before_future_history_operation',
      'use_non_destructive_git_review_commands'
    ],
    safety: {
      readsFiles: false,
      executesCommands: false,
      callsProviders: false,
      callsMcpTools: false,
      readsRealMemory: false,
      writesDurableState: false,
      changesConfigWatchdogStartup: false,
      remoteWrites: false,
      tagReleaseDeploy: false,
      cutoverExecuted: false,
      readinessClaimed: false
    },
    canClaimRcReady: false
  };
}

function renderRc9DecisionPacketFromAggregatorReport(report = null, options = {}) {
  const packet = buildRc9DecisionPacketFromAggregatorReport(report);
  const generatedAt = safeEvidenceString(options.generatedAt || new Date().toISOString(), 'unknown');
  const remainingGapLines = packet.remainingGapIds.length > 0
    ? packet.remainingGapAuthorities.map(gap => [
      `- ${safeEvidenceString(gap.id, 'unknown_gap')}`,
      `status=${safeEvidenceString(gap.status, 'unknown_status')}`,
      `next=${safeEvidenceString(gap.nextAuthority, 'unknown_next_authority')}`
    ].join(' | '))
    : ['- none'];
  const notExecutedLines = packet.notExecuted.map(action => `- ${safeEvidenceString(action, 'unknown_action')}`);
  const rollbackLines = packet.rollbackPath.map(action => `- ${safeEvidenceString(action, 'unknown_rollback_action')}`);
  const markdown = [
    '# RC-9 RC Decision Packet',
    '',
    `Generated: ${generatedAt}`,
    '',
    `Decision: ${packet.decision}`,
    `Status: ${packet.status}`,
    '',
    '## Route',
    '',
    `ready_to_request_rc_cutover_approval = ${packet.readyToRequestRcCutoverApproval}`,
    `rc_ready = ${packet.rcReady}`,
    `rc_cutover_approved = ${packet.rcCutoverApproved}`,
    `rc_cutover_execution_allowed = ${packet.rcCutoverExecutionAllowed}`,
    `cutover_approval_boundary_status = ${packet.cutoverApprovalBoundaryAuditStatus}`,
    `cutover_approval_boundary_execution_allowed = ${packet.cutoverApprovalBoundaryAuditExecutionAllowed}`,
    `cutover_approval_boundary_can_claim_rc_ready = ${packet.cutoverApprovalBoundaryAuditCanClaimRcReady}`,
    '',
    '## Remaining Gaps',
    '',
    `remaining_gap_count = ${packet.remainingGapCount}`,
    ...remainingGapLines,
    '',
    '## Not Executed',
    '',
    ...notExecutedLines,
    '',
    '## Rollback Path',
    '',
    ...rollbackLines,
    '',
    '## Cutover Approval Boundary',
    '',
    `exact_approval_required = ${packet.cutoverApprovalBoundaryAudit.exactApprovalRequired}`,
    `approval_present = ${packet.cutoverApprovalBoundaryAudit.approvalPresent}`,
    `approval_packet_accepted = ${packet.cutoverApprovalBoundaryAudit.approvalPacketAccepted}`,
    `execution_performed = ${packet.cutoverApprovalBoundaryAudit.executionPerformed}`,
    '',
    'Required exact approval fields:',
    '',
    ...packet.cutoverApprovalBoundaryAudit.requiredApprovalFields
      .map(field => `- ${safeEvidenceString(field, 'unknown_required_field')}`),
    '',
    '## Boundary',
    '',
    '- decision packet only',
    '- no release tag deploy push',
    '- no config watchdog startup change',
    '- no durable memory or audit write',
    '- no MCP tool call',
    '- no provider call',
    '- no RC cutover',
    '- no readiness claim'
  ].join('\n');

  return {
    ...packet,
    generatedAt,
    format: 'markdown',
    markdown
  };
}

module.exports = {
  DECISION_LABELS,
  VALIDATION_EVIDENCE_COMMAND_COVERAGE_STATUSES,
  VALIDATION_EVIDENCE_CONFIDENCE_POSTURE_STATUSES,
  VALIDATION_EVIDENCE_FRESHNESS_STATUSES,
  VALIDATION_EVIDENCE_GATE_READINESS_STATUSES,
  VALIDATION_EVIDENCE_REJECTION_REASONS,
  VALIDATION_EVIDENCE_REJECTION_SUMMARY_STATUSES,
  VALIDATION_EVIDENCE_SOURCE_CLASSES,
  VALIDATION_EVIDENCE_SOURCE_TYPES,
  VALIDATION_EVIDENCE_STATUSES,
  RUNTIME_EVIDENCE_SUMMARY_STATUSES,
  buildRc9DecisionPacketFromAggregatorReport,
  renderRc9DecisionPacketFromAggregatorReport,
  buildV1RcValidationAggregatorReport,
  normalizeRuntimeEvidenceSummary,
  normalizeValidationEvidenceSources,
  summarizeValidationEvidenceFreshness,
  summarizeValidationEvidenceGateReadiness,
  summarizeValidationEvidenceCommandCoverage,
  summarizeValidationEvidenceRejections,
  summarizeValidationEvidenceConfidencePosture
};
