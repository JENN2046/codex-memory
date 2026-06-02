const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');
const {
  getExitCodeForDecision,
  parseArgs
} = require('../src/cli/v1-rc-validation-aggregator');

const cliPath = path.join('src', 'cli', 'v1-rc-validation-aggregator.js');
const workspaceRoot = path.resolve(__dirname, '..');

function runCli(args = []) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: workspaceRoot,
    encoding: 'utf8',
    timeout: 30000
  });
}

function parseJsonResult(result) {
  return JSON.parse(result.stdout);
}

test('minimal validation aggregator CLI emits valid JSON and exits successfully', () => {
  const result = runCli(['--generated-at', '2026-05-16T00:00:00.000Z']);

  assert.equal(result.status, 0, result.stderr || 'non-zero exit');
  const report = parseJsonResult(result);
  assert.equal(report.schemaVersion, 'v1-rc-validation-aggregator-v1');
  assert.equal(report.phase, 'P24.4-validation-aggregator-decision-exit-code-semantics');
  assert.equal(report.generated_at, '2026-05-16T00:00:00.000Z');
  assert.equal(report.mode, 'read-only');
  assert.equal(report.evidence.p24Aggregator.minimalCliWiring, true);
  assert.equal(report.evidence.p24Aggregator.decisionExitCodeSemantics, true);
  assert.equal(report.evidence.p24Aggregator.rc9DecisionPacketEmbedded, true);
  assert.equal(report.evidence.p24Aggregator.zeroGapCloseoutAuditEmbedded, true);
  assert.equal(report.summary.rc9DecisionPacketAvailable, true);
  assert.equal(report.summary.rc9DecisionPacketDecision, 'RC_NOT_READY_BLOCKED');
  assert.equal(report.summary.rc9DecisionPacketMarkdownAuditStatus, 'markdown_sections_complete_not_authorization');
  assert.equal(report.summary.rc9DecisionPacketMarkdownAuditSectionCount, 7);
  assert.equal(report.summary.rc9DecisionPacketMarkdownAuditMissingSectionCount, 0);
  assert.equal(report.summary.rc9DecisionPacketMarkdownAuditCanClaimReadiness, false);
  assert.equal(report.summary.rc9DecisionPacketRcCutoverApproved, false);
  assert.equal(report.summary.rc9DecisionPacketRcCutoverExecutionAllowed, false);
  assert.equal(report.summary.rc9DecisionPacketCanClaimRcReady, false);
  assert.equal(
    report.summary.rc9DecisionPacketCutoverApprovalBoundaryAuditStatus,
    'not_ready_for_cutover_approval_request'
  );
  assert.equal(
    report.summary.rc9DecisionPacketCutoverApprovalBoundaryAuditExecutionAllowed,
    false
  );
  assert.equal(
    report.summary.rc9DecisionPacketCutoverApprovalBoundaryAuditCanClaimRcReady,
    false
  );
  assert.equal(
    report.summary.rc9DecisionPacketCompletenessChecklistStatus,
    'incomplete_missing_required_evidence'
  );
  assert.equal(report.summary.rc9DecisionPacketCompletenessChecklistRequiredCount, 9);
  assert.equal(report.summary.rc9DecisionPacketCompletenessChecklistAcceptedCount, 2);
  assert.equal(report.summary.rc9DecisionPacketCompletenessChecklistMissingCount, 7);
  assert.equal(report.summary.rc9DecisionPacketCompletenessChecklistCanClaimRcReady, false);
  assert.equal(report.summary.rc9DecisionPacketRemainingGapRouteMappedCount, 7);
  assert.equal(report.summary.rc9DecisionPacketRemainingGapRouteMissingCount, 0);
  assert.equal(report.summary.rc9DecisionPacketRemainingGapRouteExactApprovalCount, 6);
  assert.equal(report.summary.rc9DecisionPacketRemainingGapRouteAutomaticCount, 1);
  assert.equal(report.summary.rc9DecisionPacketRemainingGapRouteApprovalHintCount, 7);
  assert.equal(report.summary.rc9DecisionPacketRemainingGapRouteApprovalHintMissingCount, 0);
  assert.equal(report.summary.rc9DecisionPacketRemainingGapRouteManualReviewApprovalHintCount, 0);
  assert.equal(
    report.summary.rc9DecisionPacketRouteApprovalHintAuditStatus,
    'approval_hints_complete_for_known_routes_not_authorization'
  );
  assert.equal(report.summary.rc9DecisionPacketRouteApprovalHintAuditCanClaimReadiness, false);
  assert.equal(report.summary.rc9DecisionPacketRemainingGapRouteCanClaimReadiness, false);
  assert.equal(report.evidence.rc9DecisionPacket.decision, 'RC_NOT_READY_BLOCKED');
  assert.equal(report.evidence.rc9DecisionPacket.rcReady, false);
  assert.equal(report.evidence.rc9DecisionPacket.safety.remoteWrites, false);
  assert.equal(report.evidence.rc9DecisionPacket.remainingGapRouteMappedCount, 7);
  assert.equal(report.evidence.rc9DecisionPacket.remainingGapRouteMissingCount, 0);
  assert.equal(report.evidence.rc9DecisionPacket.remainingGapRouteExactApprovalCount, 6);
  assert.equal(report.evidence.rc9DecisionPacket.remainingGapRouteAutomaticCount, 1);
  assert.equal(report.evidence.rc9DecisionPacket.remainingGapRouteApprovalHintCount, 7);
  assert.equal(report.evidence.rc9DecisionPacket.remainingGapRouteApprovalHintMissingCount, 0);
  assert.equal(report.evidence.rc9DecisionPacket.remainingGapRouteManualReviewApprovalHintCount, 0);
  assert.equal(
    report.evidence.rc9DecisionPacket.routeApprovalHintAuditStatus,
    'approval_hints_complete_for_known_routes_not_authorization'
  );
  assert.equal(report.evidence.rc9DecisionPacket.routeApprovalHintAudit.approvalGenerated, false);
  assert.equal(report.evidence.rc9DecisionPacket.routeApprovalHintAudit.approvalAccepted, false);
  assert.equal(report.evidence.rc9DecisionPacket.routeApprovalHintAudit.approvalExecuted, false);
  assert.equal(report.evidence.rc9DecisionPacket.routeApprovalHintAuditCanClaimReadiness, false);
  assert.equal(report.evidence.rc9DecisionPacket.markdownAuditStatus, 'markdown_sections_complete_not_authorization');
  assert.equal(report.evidence.rc9DecisionPacket.markdownAudit.sectionCount, 7);
  assert.equal(report.evidence.rc9DecisionPacket.markdownAudit.acceptedSectionCount, 7);
  assert.equal(report.evidence.rc9DecisionPacket.markdownAudit.missingSectionCount, 0);
  assert.deepEqual(report.evidence.rc9DecisionPacket.markdownAudit.missingSectionIds, []);
  assert.equal(report.evidence.rc9DecisionPacket.markdownAudit.approvalGenerated, false);
  assert.equal(report.evidence.rc9DecisionPacket.markdownAudit.approvalAccepted, false);
  assert.equal(report.evidence.rc9DecisionPacket.markdownAudit.approvalExecuted, false);
  assert.equal(report.evidence.rc9DecisionPacket.markdownAuditCanClaimReadiness, false);
  assert.equal(
    report.evidence.rc9DecisionPacket.markdown.includes('route_approval_hint_audit_status = approval_hints_complete_for_known_routes_not_authorization'),
    true
  );
  assert.equal(report.evidence.rc9DecisionPacket.markdown.includes('route_approval_hint_count = 7'), true);
  assert.equal(report.evidence.rc9DecisionPacket.markdown.includes('route_approval_hint_missing_count = 0'), true);
  assert.equal(report.evidence.rc9DecisionPacket.markdown.includes('route_approval_hint_manual_review_count = 0'), true);
  assert.equal(report.evidence.rc9DecisionPacket.markdown.includes('route_approval_hint_approval_generated = false'), true);
  assert.equal(report.evidence.rc9DecisionPacket.markdown.includes('route_approval_hint_approval_accepted = false'), true);
  assert.equal(report.evidence.rc9DecisionPacket.markdown.includes('route_approval_hint_approval_executed = false'), true);
  assert.equal(report.evidence.rc9DecisionPacket.markdown.includes('route_approval_hint_can_claim_readiness = false'), true);
  assert.equal(report.evidence.rc9DecisionPacket.remainingGapRouteCanClaimReadiness, false);
  assert.equal(
    report.evidence.rc9DecisionPacket.remainingGapAuthorities
      .find(item => item.id === 'rc_cutover_not_executed').rcRouteStep,
    'RC-10'
  );
  assert.equal(
    report.evidence.rc9DecisionPacket.remainingGapAuthorities
      .find(item => item.id === 'rc_cutover_not_executed').rcRouteApprovalTemplateHint,
    'RC-10 exact cutover approval with commit actions config rollback validation'
  );
  assert.deepEqual(report.evidence.rc9DecisionPacket.completenessChecklistMissingIds, [
    'fresh_current_head',
    'strict_gate',
    'live_http_no_write',
    'governance_runtime',
    'recall_isolation',
    'migration_dry_run',
    'validation_aggregator_zero_gap'
  ]);
  assert.equal(
    report.evidence.rc9DecisionPacket.completenessChecklist
      .find(item => item.id === 'strict_gate').evidenceUnitId,
    'A5-GAP-5'
  );
  assert.equal(
    report.evidence.rc9DecisionPacket.completenessChecklist
      .find(item => item.id === 'strict_gate').evidenceUnitPresent,
    false
  );
  assert.equal(
    report.evidence.rc9DecisionPacket.completenessChecklist
      .find(item => item.id === 'strict_gate').currentHeadBound,
    false
  );
  assert.equal(
    report.evidence.rc9DecisionPacket.completenessChecklist
      .find(item => item.id === 'strict_gate').evidenceFresh,
    false
  );
  assert.deepEqual(
    report.evidence.rc9DecisionPacket.cutoverApprovalBoundaryAudit.requiredApprovalFields,
    [
      'commit',
      'remote_release_tag_deploy_action_list',
      'config_watchdog_startup_change_scope',
      'rollback_path',
      'validation_commands'
    ]
  );
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingLocalProofChainCloseoutAuditCount,
    1
  );
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingLocalProofChainCloseoutAcceptedCount,
    0
  );
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingLocalProofChainCloseoutNotProvenCount,
    1
  );
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingLocalProofChainCloseoutCanClaimReadiness,
    false
  );
  assert.deepEqual(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.localProofChainCloseoutNotProvenIds,
    ['validation_aggregator_full_implementation_incomplete']
  );
  assert.equal(report.evidence.p36P40EvidenceSourceMap.status, 'static_report_shape_added_not_executed');
  assert.equal(report.evidence.p36P40EvidenceSourceMap.localEvidenceReportAvailable, true);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.localEvidenceReportReadyClaim, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.runtimeReady, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.finalRcMatrixReady, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.canClaimV1RcReady, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.status, 'static_report_shape_added_not_executed');
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.evaluatorImportedByAggregator, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.evaluatorExecutedByAggregator, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.fixtureReadByAggregator, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.runnerExecutedByAggregator, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.finalRcMatrixReady, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.canClaimFinalRcReady, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.canClaimV1RcReady, false);
  assert.equal(report.evidence.p53ValidationAggregatorEvidenceInventory.status, 'static_report_shape_added_not_executed');
  assert.equal(report.evidence.p53ValidationAggregatorEvidenceInventory.inventoryOnly, true);
  assert.equal(report.evidence.p53ValidationAggregatorEvidenceInventory.fixtureReadByAggregator, false);
  assert.equal(report.evidence.p53ValidationAggregatorEvidenceInventory.runnerExecutedByAggregator, false);
  assert.equal(report.evidence.p53ValidationAggregatorEvidenceInventory.fullAggregatorImplementationComplete, false);
  assert.equal(report.evidence.p53ValidationAggregatorEvidenceInventory.canClaimV1RcReady, false);
  assert.ok(report.evidence_sources.decision);
  assert.equal(report.evidence_sources.p36_p40_evidence_source_map.status, 'static_report_shape_added_not_executed');
  assert.equal(report.evidence_sources.p45_final_rc_matrix_evaluator_posture.status, 'static_report_shape_added_not_executed');
  assert.equal(report.evidence_sources.p53_validation_aggregator_evidence_inventory.status, 'static_report_shape_added_not_executed');
  assert.match(report.evidence_sources.public_mcp_tools.source_ref, /src\/core\/constants\.js/);
});

test('minimal validation aggregator CLI preserves honest blocked decision', () => {
  const report = parseJsonResult(runCli());

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.notEqual(report.decision, 'READY_FOR_V1_0_RC');
  assert.equal(report.summary.validationAggregatorImplemented, true);
  assert.equal(report.summary.validationAggregatorFullImplementation, false);
  assert.equal(report.summary.migrationImportExportDryRunGateCliImplemented, true);
  assert.equal(report.summary.migrationImportExportDryRunGateCliFixtureOnly, true);
  assert.equal(report.summary.migrationImportExportDryRunGateCliExecuted, false);
  assert.equal(report.summary.migrationImportExportApprovalPacketCliImplemented, true);
  assert.equal(report.summary.migrationImportExportApprovalPacketCliFixtureOnly, true);
  assert.equal(report.summary.migrationImportExportApprovalPacketCliExecuted, false);
  assert.equal(report.summary.migrationImportExportApprovalPacketExecutionApproved, false);
  assert.equal(report.summary.migrationImportExportApprovalPacketRealMemoryScanned, false);
  assert.equal(report.summary.migrationImportExportApprovalPacketPackageScriptAdded, false);
  assert.equal(report.summary.migrationImportExportRealMemoryScanned, false);
  assert.equal(report.summary.migrationImportExportApplyPerformed, false);
  assert.equal(report.summary.migrationImportExportPackageScriptAdded, false);
  assert.equal(report.summary.p36P40EvidenceSourceMapAvailable, true);
  assert.equal(report.summary.p36P40LocalEvidenceReportAvailable, true);
  assert.equal(report.summary.p36P40LocalEvidenceReportReadyClaim, false);
  assert.equal(report.summary.p36P40RuntimeReady, false);
  assert.equal(report.summary.p36P40FinalRcMatrixReady, false);
  assert.equal(report.summary.p36P40CanClaimV1RcReady, false);
  assert.equal(report.summary.p45FinalRcMatrixEvaluatorPostureAvailable, true);
  assert.equal(report.summary.p45FinalRcMatrixEvaluatorImportedByAggregator, false);
  assert.equal(report.summary.p45FinalRcMatrixEvaluatorExecutedByAggregator, false);
  assert.equal(report.summary.p45FinalRcMatrixEvaluatorFixtureReadByAggregator, false);
  assert.equal(report.summary.p45FinalRcMatrixRunnerExecuted, false);
  assert.equal(report.summary.p45FinalRcMatrixReady, false);
  assert.equal(report.summary.p45FinalRcMatrixCanClaimFinalRcReady, false);
  assert.equal(report.summary.p45FinalRcMatrixCanClaimV1RcReady, false);
  assert.equal(report.summary.p53ValidationAggregatorEvidenceInventoryAvailable, true);
  assert.equal(report.summary.p53ValidationAggregatorEvidenceInventoryOnly, true);
  assert.equal(report.summary.p53ValidationAggregatorFullImplementationComplete, false);
  assert.equal(report.summary.p53ValidationAggregatorInventoryCanClaimV1RcReady, false);
  assert.equal(report.summary.localEvidenceReportReadyClaim, false);
  assert.equal(report.summary.runtimeReady, false);
  assert.equal(report.summary.finalRcMatrixReady, false);
  assert.equal(report.summary.rcReady, false);
  assert.equal(report.summary.rc9DecisionPacketAvailable, true);
  assert.equal(report.evidence.rc9DecisionPacket.rcCutoverExecutionAllowed, false);
  assert.equal(report.evidence.rc9DecisionPacket.canClaimRcReady, false);
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingLocalProofChainCloseoutCanClaimReadiness,
    false
  );
  assert.equal(report.evidence_sources.migration_import_export_approval_packet_cli.status, 'fixture_only_cli_added_not_executed');
});

test('minimal validation aggregator CLI preserves public MCP three-tool freeze', () => {
  const report = parseJsonResult(runCli());

  assert.deepEqual(report.public_mcp_tools, [
    'record_memory',
    'search_memory',
    'memory_overview'
  ]);
});

test('minimal validation aggregator CLI keeps runtime blockers visible', () => {
  const report = parseJsonResult(runCli());

  assert.equal(report.summary.schemaVersionRuntimeEnforcementImplemented, true);
  assert.equal(report.summary.validationAggregatorFullImplementation, false);
  assert.equal(report.summary.fullFinalRcMatrixExecuted, false);
  assert.equal(report.summary.liveMcpHttpEvidenceRefreshed, false);
  assert.equal(report.checks.schemaVersionRuntimeEnforcement.status, 'runtime_write_boundary_guard_added');
  assert.equal(report.runtime_required.includes('validationAggregatorFullImplementation'), true);
  assert.equal(report.runtime_required.includes('schemaVersionRuntimeEnforcement'), false);
  assert.equal(report.checks.conditionalLiveMcpHttp.status, 'not_executed_service_not_running');
});

test('minimal validation aggregator CLI keeps A5-gated items blocked', () => {
  const report = parseJsonResult(runCli());

  for (const key of [
    'migrationImportExportApply',
    'providerExecution',
    'startupWatchdog',
    'clientConfigSwitch',
    'productionDeploy',
    'pushTagReleaseDeploy'
  ]) {
    assert.equal(report.checks[key].status, 'blocked_pending_a5', key);
    assert.equal(report.checks[key].a5Gated, true, key);
  }

  assert.equal(report.safety.providerCalls, 0);
  assert.equal(report.safety.serviceStarted, false);
  assert.equal(report.safety.mutated, false);
  assert.equal(report.safety.durableMemoryTouched, false);
});

test('minimal validation aggregator CLI strict mode exits 1 for current blocked report while emitting JSON', () => {
  const result = runCli(['--strict', '--generated-at', '2026-05-16T00:00:00.000Z']);

  assert.equal(result.status, 1, 'strict mode should fail closed for NOT_READY_BLOCKED');
  assert.equal(result.stderr, '');
  const report = parseJsonResult(result);
  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.generated_at, '2026-05-16T00:00:00.000Z');
  assert.equal(report.summary.validationAggregatorFullImplementation, false);
  assert.equal(report.summary.schemaVersionRuntimeEnforcementImplemented, true);
  assert.equal(report.summary.localEvidenceReportReadyClaim, false);
  assert.equal(report.summary.runtimeReady, false);
  assert.equal(report.summary.finalRcMatrixReady, false);
  assert.equal(report.summary.rcReady, false);
  assert.equal(report.summary.rc9DecisionPacketDecision, 'RC_NOT_READY_BLOCKED');
  assert.equal(report.summary.rc9DecisionPacketMarkdownAuditStatus, 'markdown_sections_complete_not_authorization');
  assert.equal(report.summary.rc9DecisionPacketMarkdownAuditCanClaimReadiness, false);
  assert.equal(report.evidence.rc9DecisionPacket.rcReady, false);
  assert.equal(report.evidence.rc9DecisionPacket.markdownAuditStatus, 'markdown_sections_complete_not_authorization');
  assert.equal(report.evidence.rc9DecisionPacket.markdownAudit.missingSectionCount, 0);
  assert.equal(report.evidence.rc9DecisionPacket.markdownAudit.approvalGenerated, false);
  assert.equal(report.evidence.rc9DecisionPacket.markdownAudit.approvalAccepted, false);
  assert.equal(report.evidence.rc9DecisionPacket.markdownAudit.approvalExecuted, false);
  assert.equal(report.evidence.rc9DecisionPacket.markdownAuditCanClaimReadiness, false);
  assert.equal(report.evidence.p24Aggregator.zeroGapCloseoutAuditEmbedded, true);
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingLocalProofChainCloseoutNotProvenCount,
    1
  );
  assert.equal(report.evidence_sources.full_final_rc_matrix.status, 'not_executed');
  assert.equal(report.evidence_sources.p36_p40_evidence_source_map.status, 'static_report_shape_added_not_executed');
  assert.equal(report.evidence_sources.p53_validation_aggregator_evidence_inventory.status, 'static_report_shape_added_not_executed');
  assert.equal(report.evidence.p36P40EvidenceSourceMap.canClaimV1RcReady, false);
  assert.equal(report.evidence_sources.schema_version_runtime_enforcement.status, 'runtime_write_boundary_guard_added');
  assert.equal(report.evidence_sources.migration_import_export_dry_run_gate_cli.status, 'fixture_only_cli_added_not_executed');
  assert.equal(report.evidence_sources.a5_gated_actions.status, 'blocked_pending_a5');
});

test('minimal validation aggregator CLI strict mode does not execute A5-gated checks', () => {
  const report = parseJsonResult(runCli(['--strict']));

  for (const key of [
    'migrationImportExportApply',
    'providerExecution',
    'startupWatchdog',
    'clientConfigSwitch',
    'productionDeploy',
    'pushTagReleaseDeploy'
  ]) {
    assert.equal(report.checks[key].status, 'blocked_pending_a5', key);
    assert.equal(report.checks[key].a5Gated, true, key);
  }

  assert.equal(report.safety.providerCalls, 0);
  assert.equal(report.safety.serviceStarted, false);
  assert.equal(report.safety.mutated, false);
  assert.equal(report.safety.durableMemoryTouched, false);
  assert.equal(report.safety.migrationApplied, false);
  assert.equal(report.safety.importExportApplied, false);
  assert.equal(report.evidence.p24Aggregator.rc9DecisionPacketEmbedded, true);
  assert.equal(report.evidence.p24Aggregator.zeroGapCloseoutAuditEmbedded, true);
  assert.equal(report.evidence.rc9DecisionPacket.safety.remoteWrites, false);
  assert.equal(report.summary.rc9DecisionPacketMarkdownAuditStatus, 'markdown_sections_complete_not_authorization');
  assert.equal(report.evidence.rc9DecisionPacket.markdownAudit.missingSectionCount, 0);
  assert.equal(report.evidence.rc9DecisionPacket.markdownAuditCanClaimReadiness, false);
});

test('minimal validation aggregator CLI help mode exits 0 without JSON report or live checks', () => {
  const result = runCli(['--help']);

  assert.equal(result.status, 0, result.stderr || 'non-zero exit');
  assert.match(result.stdout, /Usage: node src\/cli\/v1-rc-validation-aggregator\.js/);
  assert.match(result.stdout, /--strict/);
  assert.match(result.stdout, /without running live checks/);
  assert.throws(() => JSON.parse(result.stdout), SyntaxError);
});

test('minimal validation aggregator CLI decision exit-code semantics fail closed in strict mode', () => {
  const defaultModeExpected = [
    'READY_FOR_V1_0_RC',
    'READY_FOR_DOCS_ONLY_RC_REVIEW',
    'A4_SAFE_SLICE_PASSED',
    'NOT_READY_BLOCKED',
    'BLOCKED_RUNTIME_REQUIRED',
    'BLOCKED_A5_REQUIRED'
  ];

  for (const decision of defaultModeExpected) {
    assert.equal(getExitCodeForDecision(decision), 0, decision);
  }

  assert.equal(getExitCodeForDecision('READY_FOR_V1_0_RC', { strict: true }), 0);
  for (const decision of [
    'READY_FOR_DOCS_ONLY_RC_REVIEW',
    'A4_SAFE_SLICE_PASSED',
    'NOT_READY_BLOCKED',
    'BLOCKED_RUNTIME_REQUIRED',
    'BLOCKED_A5_REQUIRED'
  ]) {
    assert.equal(getExitCodeForDecision(decision, { strict: true }), 1, decision);
  }
  assert.equal(getExitCodeForDecision('READY_FOR_V1_0_RC', { rejected: true }), 1);
});

test('minimal validation aggregator CLI parses strict and help flags without implying live execution', () => {
  assert.deepEqual(parseArgs(['--strict', '--pretty']), {
    pretty: true,
    strict: true,
    help: false,
    generatedAt: null,
    rejectedFlag: null
  });
  assert.equal(parseArgs(['--help']).help, true);
});

test('minimal validation aggregator CLI package manifests remain untouched', () => {
  const result = spawnSync('git', ['diff', '--name-only', '--', 'package.json', 'package-lock.json'], {
    cwd: workspaceRoot,
    encoding: 'utf8',
    timeout: 30000
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), '');
});

test('minimal validation aggregator CLI rejects live or side-effect flags', () => {
  for (const flag of ['--live', '--refresh-live', '--provider', '--migrate', '--deploy', '--push']) {
    const result = runCli([flag]);
    assert.equal(result.status, 1, flag);
    const report = parseJsonResult(result);
    assert.equal(report.decision, 'NOT_READY_BLOCKED', flag);
    assert.equal(report.phase, 'P24.6-validation-aggregator-rejected-flag-contract-hardening', flag);
    assert.equal(report.rejectedFlag, flag);
    assert.equal(report.mutated, false, flag);
    assert.equal(report.providerCalls, 0, flag);
    assert.equal(report.serviceStarted, false, flag);
    assert.equal(report.durableMemoryTouched, false, flag);
    assert.equal(report.safety.mutated, false, flag);
    assert.equal(report.safety.providerCalls, 0, flag);
    assert.equal(report.safety.serviceStarted, false, flag);
    assert.equal(report.safety.durableMemoryTouched, false, flag);
    assert.deepEqual(report.public_mcp_tools, [
      'record_memory',
      'search_memory',
      'memory_overview'
    ]);
    assert.ok(report.evidence_sources.decision, flag);
    assert.equal(report.evidence.p24Aggregator.rc9DecisionPacketEmbedded, true, flag);
    assert.equal(report.evidence.p24Aggregator.zeroGapCloseoutAuditEmbedded, true, flag);
    assert.equal(report.evidence.p24Aggregator.rejectedFlagContractHardening, true, flag);
    assert.equal(report.summary.rc9DecisionPacketDecision, 'RC_NOT_READY_BLOCKED', flag);
    assert.equal(report.summary.rc9DecisionPacketMarkdownAuditStatus, 'markdown_sections_complete_not_authorization', flag);
    assert.equal(report.summary.rc9DecisionPacketMarkdownAuditCanClaimReadiness, false, flag);
    assert.equal(report.evidence.rc9DecisionPacket.rcReady, false, flag);
    assert.equal(report.evidence.rc9DecisionPacket.rcCutoverExecutionAllowed, false, flag);
    assert.equal(report.evidence.rc9DecisionPacket.markdownAuditStatus, 'markdown_sections_complete_not_authorization', flag);
    assert.equal(report.evidence.rc9DecisionPacket.markdownAudit.missingSectionCount, 0, flag);
    assert.equal(report.evidence.rc9DecisionPacket.markdownAudit.approvalGenerated, false, flag);
    assert.equal(report.evidence.rc9DecisionPacket.markdownAudit.approvalAccepted, false, flag);
    assert.equal(report.evidence.rc9DecisionPacket.markdownAudit.approvalExecuted, false, flag);
    assert.equal(report.evidence.rc9DecisionPacket.markdownAuditCanClaimReadiness, false, flag);
    assert.equal(
      report.summary.p66ValidationAggregatorFullImplementationGapAccountingLocalProofChainCloseoutCanClaimReadiness,
      false,
      flag
    );
  }
});

test('minimal validation aggregator rejected report preserves normal top-level contract keys', () => {
  const normalReport = parseJsonResult(runCli(['--generated-at', '2026-05-16T00:00:00.000Z']));
  const rejectedReport = parseJsonResult(runCli(['--provider']));

  for (const key of Object.keys(normalReport)) {
    assert.equal(Object.hasOwn(rejectedReport, key), true, key);
  }

  assert.equal(rejectedReport.decision, normalReport.decision);
  assert.deepEqual(rejectedReport.public_mcp_tools, normalReport.public_mcp_tools);
  assert.deepEqual(Object.keys(rejectedReport.evidence_sources).sort(), Object.keys(normalReport.evidence_sources).sort());
  assert.equal(
    rejectedReport.summary.rc9DecisionPacketMarkdownAuditStatus,
    normalReport.summary.rc9DecisionPacketMarkdownAuditStatus
  );
  assert.equal(rejectedReport.summary.rc9DecisionPacketMarkdownAuditCanClaimReadiness, false);
  assert.deepEqual(
    rejectedReport.evidence.rc9DecisionPacket.markdownAudit,
    normalReport.evidence.rc9DecisionPacket.markdownAudit
  );
  assert.equal(rejectedReport.evidence.rc9DecisionPacket.markdownAuditCanClaimReadiness, false);
  assert.equal(rejectedReport.safety.mutated, false);
  assert.equal(rejectedReport.rejectedFlag, '--provider');
  assert.match(rejectedReport.error, /outside the minimal validation aggregator CLI boundary/);
});
