const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, 'fixtures', 'v1-rc-validation-aggregator-v1.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function hasNestedKey(value, key) {
  if (!value || typeof value !== 'object') return false;
  if (Object.hasOwn(value, key)) return true;
  if (Array.isArray(value)) return value.some(item => hasNestedKey(item, key));
  return Object.values(value).some(child => hasNestedKey(child, key));
}

function assertNoSensitiveSurface(fixture) {
  const {
    forbiddenFragments,
    forbiddenTopLevelKeys,
    ...scannedFixture
  } = fixture;
  const encoded = JSON.stringify(scannedFixture).toLowerCase();
  for (const fragment of fixture.forbiddenFragments) {
    assert.equal(encoded.includes(fragment), false, fragment);
  }
}

test('v1 RC validation aggregator fixture declares safe no-side-effect boundaries', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'v1-rc-validation-aggregator-v1');
  assert.equal(fixture.version, 'v1');
  assert.equal(fixture.phase, 'P24.1-validation-aggregator-fixture-shape-tests');
  assert.equal(fixture.mode, 'fixture-only');
  assert.equal(fixture.generated_at, '<generated-at-runtime>');
  assert.equal(fixture.source.kind, 'synthetic-fixture');
  assert.equal(fixture.source.synthetic, true);

  assert.equal(fixture.safety.mutated, false);
  assert.equal(fixture.safety.providerCalls, 0);
  assert.equal(fixture.safety.serviceStarted, false);
  assert.equal(fixture.safety.durableMemoryTouched, false);
  assert.equal(fixture.safety.realMemoryPreview, false);
  assert.equal(fixture.safety.redactionApplied, true);
  assert.equal(fixture.safety.rawWorkspaceIdExposed, false);
  assert.equal(fixture.safety.rawSecretExposed, false);
  assert.equal(fixture.safety.publicMcpExpanded, false);
  assert.equal(fixture.safety.mcpSchemaChanged, false);
  assert.equal(fixture.safety.runtimeCodeChanged, false);
  assert.equal(fixture.safety.packageChanged, false);
  assert.equal(fixture.safety.migrationApplied, false);
  assert.equal(fixture.safety.importExportApplied, false);
  assert.equal(fixture.safety.watchdogStartupInstalled, false);
  assert.equal(fixture.safety.configChanged, false);
  assert.equal(fixture.safety.pushed, false);
  assert.equal(fixture.safety.tagged, false);
  assert.equal(fixture.safety.released, false);
  assert.equal(fixture.safety.deployed, false);
});

test('v1 RC validation aggregator fixture locks required top-level shape', () => {
  const fixture = loadFixture();
  const expectedKeys = [
    'a4_safe',
    'a5_gated',
    'blockers',
    'checks',
    'conditional_live',
    'decision',
    'decisionContract',
    'evidence',
    'evidence_sources',
    'forbiddenFragments',
    'forbiddenTopLevelKeys',
    'generated_at',
    'mode',
    'phase',
    'public_mcp_tools',
    'recommendations',
    'runtime_required',
    'safety',
    'schemaVersion',
    'source',
    'summary',
    'version',
    'warnings'
  ];

  assert.deepEqual(Object.keys(fixture).sort(), expectedKeys.sort());
  assert.equal(typeof fixture.summary, 'object');
  assert.equal(typeof fixture.checks, 'object');
  assert.equal(Array.isArray(fixture.blockers), true);
  assert.equal(Array.isArray(fixture.a4_safe), true);
  assert.equal(Array.isArray(fixture.a5_gated), true);
  assert.equal(Array.isArray(fixture.runtime_required), true);
  assert.equal(Array.isArray(fixture.conditional_live), true);
  assert.equal(Array.isArray(fixture.evidence.p24Aggregator ? fixture.recommendations : []), true);
});

test('fixture maps current conclusions to documented evidence sources', () => {
  const fixture = loadFixture();

  assert.ok(fixture.evidence_sources);
  assert.ok(fixture.evidence_sources.decision);
  assert.match(fixture.evidence_sources.public_mcp_tools.source_ref, /src\/core\/constants\.js/);
  assert.equal(fixture.evidence_sources.schema_version_runtime_enforcement.status, 'not_implemented');
  assert.equal(fixture.evidence_sources.schema_version_policy_fixture.status, 'fixture_contract_added');
  assert.equal(fixture.evidence_sources.schema_version_policy_helper.status, 'helper_added_runtime_not_integrated');
  assert.match(fixture.evidence_sources.schema_version_policy_helper.source_ref, /src\/core\/SchemaVersionPolicy\.js/);
  assert.equal(fixture.evidence_sources.schema_version_runtime_boundary_guard.status, 'boundary_guard_added_runtime_not_integrated');
  assert.match(fixture.evidence_sources.schema_version_runtime_boundary_guard.source_ref, /tests\/schema-version-runtime-boundary\.test\.js/);
  assert.equal(fixture.evidence_sources.migration_import_export_dry_run_gate_cli.status, 'fixture_only_cli_added_not_executed');
  assert.equal(fixture.evidence_sources.migration_import_export_approval_packet_cli.status, 'fixture_only_cli_added_not_executed');
  assert.equal(fixture.evidence_sources.final_rc_validation_matrix_manifest_helper.status, 'helper_added_report_shape_only_not_executed');
  assert.match(fixture.evidence_sources.final_rc_validation_matrix_manifest_helper.source_ref, /src\/core\/FinalRcValidationMatrixManifest\.js/);
  assert.equal(fixture.evidence_sources.validation_evidence_reader.status, 'foundation_added_read_only');
  assert.equal(fixture.evidence_sources.full_final_rc_matrix.status, 'not_executed');
  assert.equal(fixture.evidence_sources.a5_gated_actions.status, 'blocked_pending_a5');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.deepEqual(fixture.public_mcp_tools, [
    'record_memory',
    'search_memory',
    'memory_overview'
  ]);
});

test('decision contract includes blocked, partial, and ready labels without overclaiming readiness', () => {
  const fixture = loadFixture();
  const allowed = fixture.decisionContract.allowed;

  for (const decision of [
    'READY_FOR_V1_0_RC',
    'READY_FOR_DOCS_ONLY_RC_REVIEW',
    'A4_SAFE_SLICE_PASSED',
    'BLOCKED_RUNTIME_REQUIRED',
    'BLOCKED_A5_REQUIRED',
    'NOT_READY_BLOCKED'
  ]) {
    assert.equal(allowed.includes(decision), true, decision);
  }

  assert.equal(allowed.includes(fixture.decision), true);
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.decisionContract.currentMustNotBe.includes('READY_FOR_V1_0_RC'), true);
  assert.notEqual(fixture.decision, 'READY_FOR_V1_0_RC');
});

test('fixture honestly preserves current P23/P24 blocker state', () => {
  const fixture = loadFixture();

  assert.equal(fixture.summary.a4SafeSlice, 'A4_SAFE_SLICE_PASSED');
  assert.equal(fixture.summary.fullFinalRcMatrixExecuted, false);
  assert.equal(fixture.summary.liveMcpHttpEvidenceRefreshed, false);
  assert.equal(fixture.summary.validationAggregatorImplemented, false);
  assert.equal(fixture.summary.validationEvidenceReaderImplemented, true);
  assert.equal(fixture.summary.validationEvidenceSourceContract, 'explicit_safe_inputs_only');
  assert.equal(fixture.summary.validationEvidenceAcceptedCount, 0);
  assert.equal(fixture.summary.validationEvidenceFreshnessStatus, 'no_explicit_evidence');
  assert.equal(fixture.summary.validationEvidenceStaleCount, 0);
  assert.equal(fixture.summary.validationEvidenceGateReadinessStatus, 'not_ready_no_explicit_evidence');
  assert.equal(fixture.summary.validationEvidenceCanClaimV1RcReady, false);
  assert.equal(fixture.summary.validationEvidenceCommandCoverageStatus, 'no_explicit_evidence');
  assert.equal(fixture.summary.validationEvidenceCommandCount, 0);
  assert.equal(fixture.summary.validationEvidenceRejectionStatus, 'no_rejections');
  assert.equal(fixture.summary.validationEvidenceRejectedCount, 0);
  assert.equal(fixture.summary.schemaVersionRuntimeEnforcementImplemented, false);
  assert.equal(fixture.summary.schemaVersionRuntimeBoundaryGuardTestAdded, true);
  assert.equal(fixture.summary.schemaVersionRuntimeBoundaryGuardPublicSchemaFrozen, true);
  assert.equal(fixture.summary.schemaVersionRuntimeBoundaryGuardRejectsSchemaVersionArgs, true);
  assert.equal(fixture.summary.schemaVersionRuntimeBoundaryGuardRuntimeIntegrated, false);
  assert.equal(fixture.summary.schemaCompatibilityDryRunCliImplemented, true);
  assert.equal(fixture.summary.schemaCompatibilityDryRunCliFixtureOnly, true);
  assert.equal(fixture.summary.schemaCompatibilityDryRunCliExecuted, false);
  assert.equal(fixture.summary.schemaCompatibilityRuntimeEnforcementImplemented, false);
  assert.equal(fixture.summary.migrationImportExportDryRunGateCliImplemented, true);
  assert.equal(fixture.summary.migrationImportExportDryRunGateCliFixtureOnly, true);
  assert.equal(fixture.summary.migrationImportExportDryRunGateCliExecuted, false);
  assert.equal(fixture.summary.migrationImportExportApprovalPacketCliImplemented, true);
  assert.equal(fixture.summary.migrationImportExportApprovalPacketCliFixtureOnly, true);
  assert.equal(fixture.summary.migrationImportExportApprovalPacketCliExecuted, false);
  assert.equal(fixture.summary.migrationImportExportApprovalPacketExecutionApproved, false);
  assert.equal(fixture.summary.migrationImportExportApprovalPacketRealMemoryScanned, false);
  assert.equal(fixture.summary.migrationImportExportApprovalPacketPackageScriptAdded, false);
  assert.equal(fixture.summary.migrationImportExportRealMemoryScanned, false);
  assert.equal(fixture.summary.finalRcValidationMatrixManifestHelperImplemented, true);
  assert.equal(fixture.summary.finalRcValidationMatrixManifestHelperExplicitInputOnly, true);
  assert.equal(fixture.summary.finalRcValidationMatrixManifestHelperExecuted, false);
  assert.equal(fixture.summary.finalRcValidationMatrixRunnerImplemented, false);
  assert.equal(fixture.summary.finalRcValidationMatrixRunnerExecuted, false);
  assert.equal(fixture.summary.finalRcValidationMatrixExecuted, false);
  assert.equal(fixture.summary.finalRcValidationMatrixCanExecuteRunner, false);
  assert.equal(fixture.summary.finalRcValidationMatrixCanClaimFinalRcReady, false);
  assert.equal(fixture.summary.productionDeployPerformed, false);
  assert.equal(fixture.summary.startupWatchdogInstalled, false);
  assert.equal(fixture.summary.codexClaudeConfigSwitched, false);
  assert.equal(fixture.summary.providerExecuted, false);
  assert.equal(fixture.summary.migrationImportExportApplyPerformed, false);
  assert.equal(fixture.summary.migrationImportExportPackageScriptAdded, false);
  assert.equal(fixture.summary.durableMemoryMutationExpansionPerformed, false);
  assert.equal(fixture.summary.pushTagReleaseDeployPerformed, false);

  assert.equal(fixture.evidence.p23A4SafeSlice.status, 'A4_SAFE_SLICE_PASSED');
  assert.equal(fixture.evidence.p23A4SafeSlice.fullFinalRcMatrixExecuted, false);
  assert.equal(fixture.evidence.p23A4SafeSlice.liveMcpHttpEvidenceRefreshed, false);
  assert.equal(fixture.evidence.p24Aggregator.planned, true);
  assert.equal(fixture.evidence.p24Aggregator.implemented, false);
  assert.equal(fixture.evidence.p25SchemaVersionPolicy.status, 'fixture_contract_added');
  assert.equal(fixture.evidence.p25SchemaVersionPolicy.fixture, 'tests/fixtures/schema-version-policy-v1.json');
  assert.equal(fixture.evidence.p25SchemaVersionPolicy.runtimeEnforcementImplemented, false);
  assert.equal(fixture.evidence.p29SchemaVersionPolicyHelper.status, 'helper_added_runtime_not_integrated');
  assert.equal(fixture.evidence.p29SchemaVersionPolicyHelper.helper, 'src/core/SchemaVersionPolicy.js');
  assert.equal(fixture.evidence.p29SchemaVersionPolicyHelper.test, 'tests/schema-version-policy-runtime.test.js');
  assert.equal(fixture.evidence.p29SchemaVersionPolicyHelper.sourceMode, 'explicit_input');
  assert.equal(fixture.evidence.p29SchemaVersionPolicyHelper.evaluationReportAvailable, true);
  assert.equal(fixture.evidence.p29SchemaVersionPolicyHelper.evaluationReportExecuted, false);
  assert.equal(fixture.evidence.p29SchemaVersionPolicyHelper.evaluationReportReadsFiles, false);
  assert.equal(fixture.evidence.p29SchemaVersionPolicyHelper.evaluationReportMutatesInput, false);
  assert.equal(fixture.evidence.p29SchemaVersionPolicyHelper.evaluationReportMalformedCasesFailClosed, true);
  assert.equal(fixture.evidence.p29SchemaVersionPolicyHelper.readsFiles, false);
  assert.equal(fixture.evidence.p29SchemaVersionPolicyHelper.mutatesInput, false);
  assert.equal(fixture.evidence.p29SchemaVersionPolicyHelper.runtimeIntegrated, false);
  assert.equal(fixture.evidence.p29SchemaVersionPolicyHelper.runtimeEnforcementImplemented, false);
  assert.equal(fixture.evidence.p29SchemaVersionPolicyHelper.publicMcpExpanded, false);
  assert.equal(fixture.evidence.p29SchemaVersionRuntimeBoundaryGuard.status, 'boundary_guard_added_runtime_not_integrated');
  assert.equal(fixture.evidence.p29SchemaVersionRuntimeBoundaryGuard.test, 'tests/schema-version-runtime-boundary.test.js');
  assert.equal(fixture.evidence.p29SchemaVersionRuntimeBoundaryGuard.sourceMode, 'fixture_backed_test');
  assert.equal(fixture.evidence.p29SchemaVersionRuntimeBoundaryGuard.publicRecordMemorySchemaFrozen, true);
  assert.equal(fixture.evidence.p29SchemaVersionRuntimeBoundaryGuard.recordMemorySchemaVersionArgsExposed, false);
  assert.equal(fixture.evidence.p29SchemaVersionRuntimeBoundaryGuard.toolArgumentValidatorRejectsSchemaVersionArgs, true);
  assert.equal(fixture.evidence.p29SchemaVersionRuntimeBoundaryGuard.policyWriteRejectionReportOnly, true);
  assert.equal(fixture.evidence.p29SchemaVersionRuntimeBoundaryGuard.readsFiles, false);
  assert.equal(fixture.evidence.p29SchemaVersionRuntimeBoundaryGuard.executesCommands, false);
  assert.equal(fixture.evidence.p29SchemaVersionRuntimeBoundaryGuard.startsServices, false);
  assert.equal(fixture.evidence.p29SchemaVersionRuntimeBoundaryGuard.callsProviders, false);
  assert.equal(fixture.evidence.p29SchemaVersionRuntimeBoundaryGuard.durableMemoryTouched, false);
  assert.equal(fixture.evidence.p29SchemaVersionRuntimeBoundaryGuard.realMemoryScanned, false);
  assert.equal(fixture.evidence.p29SchemaVersionRuntimeBoundaryGuard.runtimeIntegrated, false);
  assert.equal(fixture.evidence.p29SchemaVersionRuntimeBoundaryGuard.runtimeEnforcementImplemented, false);
  assert.equal(fixture.evidence.p29SchemaVersionRuntimeBoundaryGuard.publicMcpExpanded, false);
  assert.equal(fixture.evidence.p25SchemaCompatibilityDryRunCli.status, 'fixture_only_cli_added');
  assert.equal(fixture.evidence.p25SchemaCompatibilityDryRunCli.cli, 'src/cli/schema-compatibility-dry-run.js');
  assert.equal(fixture.evidence.p25SchemaCompatibilityDryRunCli.fixtureOnly, true);
  assert.equal(fixture.evidence.p25SchemaCompatibilityDryRunCli.cliExecuted, false);
  assert.equal(fixture.evidence.p25SchemaCompatibilityDryRunCli.realMemoryScanned, false);
  assert.equal(fixture.evidence.p25SchemaCompatibilityDryRunCli.runtimeEnforcementImplemented, false);
  assert.equal(fixture.evidence.p25SchemaCompatibilityDryRunCli.packageScriptAdded, false);
  assert.equal(fixture.evidence.p26MigrationImportExportDryRunGateCli.status, 'fixture_only_cli_added');
  assert.equal(fixture.evidence.p26MigrationImportExportDryRunGateCli.cli, 'src/cli/migration-import-export-dry-run-gate.js');
  assert.equal(fixture.evidence.p26MigrationImportExportDryRunGateCli.test, 'tests/migration-import-export-dry-run-gate-cli.test.js');
  assert.equal(fixture.evidence.p26MigrationImportExportDryRunGateCli.fixture, 'tests/fixtures/migration-import-export-dry-run-gate-v1.json');
  assert.equal(fixture.evidence.p26MigrationImportExportDryRunGateCli.outputSchema, 'codex-memory.migration-import-export-dry-run-gate.v1');
  assert.equal(fixture.evidence.p26MigrationImportExportDryRunGateCli.expectedDecision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.evidence.p26MigrationImportExportDryRunGateCli.fixtureOnly, true);
  assert.equal(fixture.evidence.p26MigrationImportExportDryRunGateCli.cliExecuted, false);
  assert.equal(fixture.evidence.p26MigrationImportExportDryRunGateCli.realMemoryScanned, false);
  assert.equal(fixture.evidence.p26MigrationImportExportDryRunGateCli.importExportApplyPerformed, false);
  assert.equal(fixture.evidence.p26MigrationImportExportDryRunGateCli.packageScriptAdded, false);
  assert.equal(fixture.evidence.p27MigrationImportExportApprovalPacketCli.status, 'fixture_only_cli_added');
  assert.equal(fixture.evidence.p27MigrationImportExportApprovalPacketCli.cli, 'src/cli/migration-import-export-approval-packet.js');
  assert.equal(fixture.evidence.p27MigrationImportExportApprovalPacketCli.test, 'tests/migration-import-export-approval-packet-cli.test.js');
  assert.equal(fixture.evidence.p27MigrationImportExportApprovalPacketCli.fixture, 'tests/fixtures/migration-import-export-approval-packet-v1.json');
  assert.equal(fixture.evidence.p27MigrationImportExportApprovalPacketCli.outputSchema, 'codex-memory.migration-import-export-approval-packet.v1');
  assert.equal(fixture.evidence.p27MigrationImportExportApprovalPacketCli.expectedDecision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.evidence.p27MigrationImportExportApprovalPacketCli.expectedApprovalStatus, 'BLOCKED_PENDING_APPROVAL');
  assert.equal(fixture.evidence.p27MigrationImportExportApprovalPacketCli.fixtureOnly, true);
  assert.equal(fixture.evidence.p27MigrationImportExportApprovalPacketCli.cliExecuted, false);
  assert.equal(fixture.evidence.p27MigrationImportExportApprovalPacketCli.realMemoryScanned, false);
  assert.equal(fixture.evidence.p27MigrationImportExportApprovalPacketCli.executionApproved, false);
  assert.equal(fixture.evidence.p27MigrationImportExportApprovalPacketCli.importExportApplyPerformed, false);
  assert.equal(fixture.evidence.p27MigrationImportExportApprovalPacketCli.backupRestorePerformed, false);
  assert.equal(fixture.evidence.p27MigrationImportExportApprovalPacketCli.durableReportWritten, false);
  assert.equal(fixture.evidence.p27MigrationImportExportApprovalPacketCli.packageScriptAdded, false);
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.status, 'helper_added_report_shape_only_not_executed');
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.helper, 'src/core/FinalRcValidationMatrixManifest.js');
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.test, 'tests/final-rc-validation-matrix-runner-manifest-helper.test.js');
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.fixture, 'tests/fixtures/final-rc-validation-matrix-runner-safe-scope-v1.json');
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.manifestSchemaVersion, 'final-rc-validation-matrix-runner-safe-scope-v1');
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.sourceMode, 'explicit_input');
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.fixtureOnly, true);
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.syntheticFixture, true);
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.acceptedForPlanningAvailable, true);
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.manifestHelperImplemented, true);
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.manifestHelperExecuted, false);
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.helperExecutedByAggregator, false);
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.fixtureReadByAggregator, false);
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.readsFiles, false);
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.executesCommands, false);
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.startsServices, false);
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.callsProviders, false);
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.mutatesInput, false);
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.durableMemoryTouched, false);
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.realMemoryScanned, false);
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.realMemoryPreview, false);
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.runnerImplemented, false);
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.runnerExecuted, false);
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.finalRcMatrixExecuted, false);
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.canExecuteRunner, false);
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.canClaimFinalRcReady, false);
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.blockedDecisionRequired, true);
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.runnerClaimsFailClosed, true);
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.publicMcpFrozen, true);
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.runtimeRequiredBlockersVisible, true);
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.a5GatedBlockersVisible, true);
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.failClosedRejectionDefaultsVisible, true);
  assert.equal(fixture.evidence.p30FinalRcValidationMatrixManifestHelper.publicMcpExpanded, false);
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.status, 'no_explicit_validation_evidence');
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.implemented, true);
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.fullImplementation, false);
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.sourceMode, 'explicit_safe_inputs_only');
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.contract.readsFiles, false);
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.contract.executesCommands, false);
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.contract.startsServices, false);
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.contract.callsProviders, false);
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.contract.mutatesDurableState, false);
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.contract.acceptsRealMemoryPreview, false);
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.acceptedCount, 0);
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.rejectedCount, 0);
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.freshness.status, 'no_explicit_evidence');
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.freshness.referenceTime, '<generated-at-runtime>');
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.freshness.staleAfterHours, 168);
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.freshness.sourceCount, 0);
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.freshness.staleCount, 0);
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.freshness.unknownFreshnessCount, 0);
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.gateReadiness.status, 'not_ready_no_explicit_evidence');
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.gateReadiness.canClaimV1RcReady, false);
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.gateReadiness.readyForFinalRcMatrixRunner, false);
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.gateReadiness.blockerCounts.runtimeRequired, 2);
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.gateReadiness.blockerCounts.a5Gated, 6);
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.commandCoverage.status, 'no_explicit_evidence');
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.commandCoverage.executesCommands, false);
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.commandCoverage.commandCount, 0);
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.commandCoverage.uniqueCommandCount, 0);
  assert.deepEqual(fixture.evidence.p28ValidationEvidenceReader.commandCoverage.sourceTypesCovered, []);
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.rejectionSummary.status, 'no_rejections');
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.rejectionSummary.rejectedCount, 0);
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.rejectionSummary.rawRejectedInputExposed, false);
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.rejectionSummary.rejectsUnsafeInputs, true);
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.confidencePosture.status, 'no_explicit_evidence');
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.confidencePosture.canClaimV1RcReady, false);
  assert.equal(fixture.evidence.p28ValidationEvidenceReader.confidencePosture.decisionImpact, 'none_report_only');
});

test('check groups classify A4-safe, A5-gated, runtime-required, and conditional live work', () => {
  const fixture = loadFixture();

  for (const key of ['gitHygiene', 'docsValidation', 'p2DocsWhitespace', 'mcpContract', 'publicMcpTools']) {
    assert.ok(fixture.checks[key], key);
  }

  assert.equal(fixture.checks.publicMcpTools.status, 'pass');
  assert.equal(fixture.checks.schemaVersionRuntimeEnforcement.status, 'planned_not_implemented');
  assert.equal(fixture.checks.schemaVersionPolicyFixture.status, 'fixture_contract_added');
  assert.equal(fixture.checks.schemaVersionPolicyFixture.a4Safe, true);
  assert.equal(fixture.checks.schemaVersionPolicyHelper.status, 'helper_added_runtime_not_integrated');
  assert.equal(fixture.checks.schemaVersionPolicyHelper.a4Safe, true);
  assert.equal(fixture.checks.schemaVersionPolicyHelper.blocksV1Rc, false);
  assert.equal(fixture.checks.schemaVersionRuntimeBoundaryGuard.status, 'boundary_guard_added_runtime_not_integrated');
  assert.equal(fixture.checks.schemaVersionRuntimeBoundaryGuard.a4Safe, true);
  assert.equal(fixture.checks.schemaVersionRuntimeBoundaryGuard.blocksV1Rc, false);
  assert.equal(fixture.checks.schemaCompatibilityDryRunCli.status, 'fixture_only_cli_added');
  assert.equal(fixture.checks.schemaCompatibilityDryRunCli.a4Safe, true);
  assert.equal(fixture.checks.schemaCompatibilityDryRunCli.blocksV1Rc, undefined);
  assert.equal(fixture.checks.migrationImportExportDryRunGateCli.status, 'fixture_only_cli_added');
  assert.equal(fixture.checks.migrationImportExportDryRunGateCli.a4Safe, true);
  assert.equal(fixture.checks.migrationImportExportDryRunGateCli.blocksV1Rc, undefined);
  assert.equal(fixture.checks.migrationImportExportApprovalPacketCli.status, 'fixture_only_cli_added');
  assert.equal(fixture.checks.migrationImportExportApprovalPacketCli.a4Safe, true);
  assert.equal(fixture.checks.migrationImportExportApprovalPacketCli.blocksV1Rc, undefined);
  assert.equal(fixture.checks.finalRcValidationMatrixManifestHelper.status, 'helper_added_report_shape_only_not_executed');
  assert.equal(fixture.checks.finalRcValidationMatrixManifestHelper.a4Safe, true);
  assert.equal(fixture.checks.finalRcValidationMatrixManifestHelper.blocksV1Rc, undefined);
  assert.equal(fixture.checks.validationAggregatorExecutable.status, 'planned_not_implemented');
  assert.equal(fixture.checks.conditionalLiveMcpHttp.status, 'not_executed_service_not_running');

  for (const key of [
    'migrationImportExportApply',
    'providerExecution',
    'startupWatchdog',
    'clientConfigSwitch',
    'productionDeploy',
    'pushTagReleaseDeploy'
  ]) {
    assert.equal(fixture.checks[key].status, 'blocked_pending_a5', key);
    assert.equal(fixture.checks[key].a5Gated, true, key);
  }

  assert.equal(fixture.a4_safe.includes('gitHygiene'), true);
  assert.equal(fixture.a4_safe.includes('schemaVersionPolicyFixture'), true);
  assert.equal(fixture.a4_safe.includes('schemaVersionPolicyHelper'), true);
  assert.equal(fixture.a4_safe.includes('schemaVersionRuntimeBoundaryGuard'), true);
  assert.equal(fixture.a4_safe.includes('schemaCompatibilityDryRunCli'), true);
  assert.equal(fixture.a4_safe.includes('migrationImportExportDryRunGateCli'), true);
  assert.equal(fixture.a4_safe.includes('migrationImportExportApprovalPacketCli'), true);
  assert.equal(fixture.a4_safe.includes('finalRcValidationMatrixManifestHelper'), true);
  assert.equal(fixture.a5_gated.includes('providerExecution'), true);
  assert.equal(fixture.runtime_required.includes('validationAggregatorExecutable'), true);
  assert.equal(fixture.conditional_live.includes('health'), true);
});

test('public MCP tools remain exactly the frozen three-tool contract', () => {
  const fixture = loadFixture();

  assert.deepEqual(fixture.public_mcp_tools, [
    'record_memory',
    'search_memory',
    'memory_overview'
  ]);
  assert.deepEqual(fixture.public_mcp_tools.slice().sort(), [
    'memory_overview',
    'record_memory',
    'search_memory'
  ]);
});

test('fixture forbids fake quality, provider latency, raw workspace, and secret surfaces', () => {
  const fixture = loadFixture();

  for (const key of fixture.forbiddenTopLevelKeys) {
    assert.equal(Object.hasOwn(fixture, key), false, key);
    assert.equal(hasNestedKey(fixture, key), false, key);
  }

  assertNoSensitiveSurface(fixture);
});

test('v1 RC validation aggregator fixture test does not rewrite fixture file', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');
  loadFixture();
  const after = fs.readFileSync(fixturePath, 'utf8');

  assert.equal(after, before);
});
