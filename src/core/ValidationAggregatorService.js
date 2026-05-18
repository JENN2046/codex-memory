const { TOOL_DEFINITIONS } = require('./constants');

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

const RUNTIME_EVIDENCE_SUMMARY_STATUSES = [
  'no_explicit_runtime_evidence_summary',
  'explicit_runtime_evidence_summary_available',
  'runtime_evidence_summary_rejected'
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

const P66_FULL_IMPLEMENTATION_LOCALLY_EVIDENCED_GAPS = [
  'runtime_schema_version_enforcement_not_fully_proven',
  'final_rc_matrix_runner_not_executed_as_real_matrix'
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

function normalizeRuntimeEvidenceSummary(summary = null) {
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
      providerCalls: 0,
      mutated: false,
      noProvider: true,
      noDurableMemoryWrite: true,
      noRealMemoryPreview: true,
      noRemoteWrite: true
    },
    locallyEvidencedRuntimeGaps: [],
    remainingRuntimeGaps: [],
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
  const locallyEvidencedRuntimeGaps = normalizeEvidenceStringList(summary.locallyEvidencedRuntimeGaps);
  const remainingRuntimeGaps = normalizeEvidenceStringList(summary.remainingRuntimeGaps);

  return {
    ...empty,
    status: 'explicit_runtime_evidence_summary_available',
    accepted: true,
    summary: {
      ...empty.summary,
      sourceStatus: safeEvidenceString(summary.status, 'unknown'),
      sourceDecision: safeEvidenceString(summary.decision, 'unknown'),
      runnerExecuted: summary.runnerExecuted === true,
      commandsExecutedBySource: summary.commandsExecuted === true,
      commandsExecutedByAggregator: false,
      localRuntimeEvidenceMatrixExecutedBySource: summary.localRuntimeEvidenceMatrixExecuted === true,
      allowlistedFinalRcEvidenceRunnerExecutedBySource:
        summary.allowlistedFinalRcEvidenceRunnerExecuted === true,
      finalRcMatrixExecutedBySource: false,
      fullFinalRcMatrixExecutedBySource: false,
      finalRcMatrixReady: false,
      runtimeReady: false,
      v1RcReady: false,
      rcReady: false,
      allCriticalCommandsPassed: criticalGates.allCriticalCommandsPassed === true,
      criticalGateCount: safeEvidenceNumber(criticalGates.total),
      criticalGatePassedCount: safeEvidenceNumber(criticalGates.passed),
      criticalGateFailedCount: safeEvidenceNumber(criticalGates.failed),
      locallyEvidencedRuntimeGapCount: locallyEvidencedRuntimeGaps.length,
      remainingRuntimeGapCount: remainingRuntimeGaps.length,
      providerCalls: 0,
      mutated: false,
      noProvider: true,
      noDurableMemoryWrite: true,
      noRealMemoryPreview: true,
      noRemoteWrite: true
    },
    locallyEvidencedRuntimeGaps,
    remainingRuntimeGaps
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
  runtimeEvidenceSummary = null
} = {}) {
  const validationEvidenceReader = normalizeValidationEvidenceSources(validationEvidenceSources);
  const runtimeEvidenceSummaryBridge = normalizeRuntimeEvidenceSummary(runtimeEvidenceSummary);
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

  return {
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
      runtimeEvidenceSummaryCanClaimV1RcReady: false,
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
      'P66.5 source registry proof helper capability is static and is not executed by the aggregator.'
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
  buildV1RcValidationAggregatorReport,
  normalizeRuntimeEvidenceSummary,
  normalizeValidationEvidenceSources,
  summarizeValidationEvidenceFreshness,
  summarizeValidationEvidenceGateReadiness,
  summarizeValidationEvidenceCommandCoverage,
  summarizeValidationEvidenceRejections,
  summarizeValidationEvidenceConfidencePosture
};
