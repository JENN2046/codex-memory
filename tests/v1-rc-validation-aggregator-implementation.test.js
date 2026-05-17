const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  VALIDATION_EVIDENCE_COMMAND_COVERAGE_STATUSES,
  VALIDATION_EVIDENCE_CONFIDENCE_POSTURE_STATUSES,
  VALIDATION_EVIDENCE_FRESHNESS_STATUSES,
  VALIDATION_EVIDENCE_GATE_READINESS_STATUSES,
  VALIDATION_EVIDENCE_REJECTION_REASONS,
  VALIDATION_EVIDENCE_REJECTION_SUMMARY_STATUSES,
  VALIDATION_EVIDENCE_SOURCE_TYPES,
  buildV1RcValidationAggregatorReport,
  normalizeValidationEvidenceSources
} = require('../src/core/ValidationAggregatorService');

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

function assertNoSensitiveSurface(report) {
  const {
    forbiddenFragments,
    forbiddenTopLevelKeys,
    ...scannedReport
  } = report;
  const encoded = JSON.stringify(scannedReport).toLowerCase();
  for (const fragment of report.forbiddenFragments) {
    assert.equal(encoded.includes(fragment), false, fragment);
  }
}

test('minimal implementation emits the P24.1 top-level contract shape', () => {
  const fixture = loadFixture();
  const report = buildV1RcValidationAggregatorReport({
    generatedAt: '2026-05-16T00:00:00.000Z'
  });

  assert.deepEqual(Object.keys(report).sort(), Object.keys(fixture).sort());
  assert.equal(report.schemaVersion, fixture.schemaVersion);
  assert.equal(report.version, fixture.version);
  assert.equal(report.mode, 'read-only');
  assert.equal(report.generated_at, '2026-05-16T00:00:00.000Z');
});

test('minimal implementation reports honest blocked state without claiming v1 RC readiness', () => {
  const report = buildV1RcValidationAggregatorReport();

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.notEqual(report.decision, 'READY_FOR_V1_0_RC');
  assert.equal(report.decisionContract.currentMustNotBe.includes('READY_FOR_V1_0_RC'), true);
  assert.equal(report.summary.a4SafeSlice, 'A4_SAFE_SLICE_PASSED');
  assert.equal(report.summary.fullFinalRcMatrixExecuted, false);
  assert.equal(report.summary.liveMcpHttpEvidenceRefreshed, false);
  assert.equal(report.summary.validationAggregatorImplemented, true);
  assert.equal(report.summary.validationAggregatorFullImplementation, false);
  assert.equal(report.summary.validationEvidenceReaderImplemented, true);
  assert.equal(report.summary.validationEvidenceSourceContract, 'explicit_safe_inputs_only');
  assert.equal(report.summary.validationEvidenceAcceptedCount, 0);
  assert.equal(report.summary.validationEvidenceFreshnessStatus, 'no_explicit_evidence');
  assert.equal(report.summary.validationEvidenceStaleCount, 0);
  assert.equal(report.summary.validationEvidenceGateReadinessStatus, 'not_ready_no_explicit_evidence');
  assert.equal(report.summary.validationEvidenceCanClaimV1RcReady, false);
  assert.equal(report.summary.validationEvidenceCommandCoverageStatus, 'no_explicit_evidence');
  assert.equal(report.summary.validationEvidenceCommandCount, 0);
  assert.equal(report.summary.validationEvidenceRejectionStatus, 'no_rejections');
  assert.equal(report.summary.validationEvidenceRejectedCount, 0);
  assert.equal(report.summary.validationEvidenceConfidencePostureStatus, 'no_explicit_evidence');
  assert.equal(report.summary.validationEvidenceConfidenceCanClaimV1RcReady, false);
  assert.equal(report.summary.schemaVersionRuntimeEnforcementImplemented, false);
  assert.equal(report.summary.schemaCompatibilityDryRunCliImplemented, true);
  assert.equal(report.summary.schemaCompatibilityDryRunCliFixtureOnly, true);
  assert.equal(report.summary.schemaCompatibilityDryRunCliExecuted, false);
  assert.equal(report.summary.schemaCompatibilityRuntimeEnforcementImplemented, false);
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
  assert.equal(report.evidence.p25SchemaVersionPolicy.status, 'fixture_contract_added');
  assert.equal(report.evidence.p25SchemaVersionPolicy.fixture, 'tests/fixtures/schema-version-policy-v1.json');
  assert.equal(report.evidence.p25SchemaVersionPolicy.runtimeEnforcementImplemented, false);
  assert.equal(report.evidence.p25SchemaCompatibilityDryRunCli.status, 'fixture_only_cli_added');
  assert.equal(report.evidence.p25SchemaCompatibilityDryRunCli.cli, 'src/cli/schema-compatibility-dry-run.js');
  assert.equal(report.evidence.p25SchemaCompatibilityDryRunCli.cliExecuted, false);
  assert.equal(report.evidence.p25SchemaCompatibilityDryRunCli.realMemoryScanned, false);
  assert.equal(report.evidence.p25SchemaCompatibilityDryRunCli.runtimeEnforcementImplemented, false);
  assert.equal(report.evidence.p25SchemaCompatibilityDryRunCli.packageScriptAdded, false);
  assert.equal(report.summary.migrationImportExportApplyPerformed, false);
  assert.equal(report.summary.migrationImportExportPackageScriptAdded, false);
  assert.equal(report.evidence.p26MigrationImportExportDryRunGateCli.status, 'fixture_only_cli_added');
  assert.equal(report.evidence.p26MigrationImportExportDryRunGateCli.cli, 'src/cli/migration-import-export-dry-run-gate.js');
  assert.equal(report.evidence.p26MigrationImportExportDryRunGateCli.test, 'tests/migration-import-export-dry-run-gate-cli.test.js');
  assert.equal(report.evidence.p26MigrationImportExportDryRunGateCli.fixture, 'tests/fixtures/migration-import-export-dry-run-gate-v1.json');
  assert.equal(report.evidence.p26MigrationImportExportDryRunGateCli.outputSchema, 'codex-memory.migration-import-export-dry-run-gate.v1');
  assert.equal(report.evidence.p26MigrationImportExportDryRunGateCli.expectedDecision, 'NOT_READY_BLOCKED');
  assert.equal(report.evidence.p26MigrationImportExportDryRunGateCli.fixtureOnly, true);
  assert.equal(report.evidence.p26MigrationImportExportDryRunGateCli.cliExecuted, false);
  assert.equal(report.evidence.p26MigrationImportExportDryRunGateCli.realMemoryScanned, false);
  assert.equal(report.evidence.p26MigrationImportExportDryRunGateCli.importExportApplyPerformed, false);
  assert.equal(report.evidence.p26MigrationImportExportDryRunGateCli.packageScriptAdded, false);
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.status, 'fixture_only_cli_added');
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.cli, 'src/cli/migration-import-export-approval-packet.js');
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.test, 'tests/migration-import-export-approval-packet-cli.test.js');
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.fixture, 'tests/fixtures/migration-import-export-approval-packet-v1.json');
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.outputSchema, 'codex-memory.migration-import-export-approval-packet.v1');
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.expectedDecision, 'NOT_READY_BLOCKED');
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.expectedApprovalStatus, 'BLOCKED_PENDING_APPROVAL');
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.fixtureOnly, true);
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.cliExecuted, false);
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.realMemoryScanned, false);
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.executionApproved, false);
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.importExportApplyPerformed, false);
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.backupRestorePerformed, false);
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.durableReportWritten, false);
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.packageScriptAdded, false);
  assert.equal(report.evidence.p28ValidationEvidenceReader.status, 'no_explicit_validation_evidence');
  assert.equal(report.evidence.p28ValidationEvidenceReader.implemented, true);
  assert.equal(report.evidence.p28ValidationEvidenceReader.fullImplementation, false);
  assert.equal(report.evidence.p28ValidationEvidenceReader.contract.readsFiles, false);
  assert.equal(report.evidence.p28ValidationEvidenceReader.contract.executesCommands, false);
  assert.equal(report.evidence.p28ValidationEvidenceReader.contract.callsProviders, false);
  assert.equal(report.evidence.p28ValidationEvidenceReader.contract.mutatesDurableState, false);
  assert.equal(report.evidence.p28ValidationEvidenceReader.acceptedCount, 0);
  assert.equal(report.evidence.p28ValidationEvidenceReader.freshness.status, 'no_explicit_evidence');
  assert.equal(report.evidence.p28ValidationEvidenceReader.freshness.staleAfterHours, 168);
  assert.deepEqual(
    report.evidence.p28ValidationEvidenceReader.freshness.allowedStatuses,
    VALIDATION_EVIDENCE_FRESHNESS_STATUSES
  );
  assert.equal(report.evidence.p28ValidationEvidenceReader.gateReadiness.status, 'not_ready_no_explicit_evidence');
  assert.deepEqual(
    report.evidence.p28ValidationEvidenceReader.gateReadiness.allowedStatuses,
    VALIDATION_EVIDENCE_GATE_READINESS_STATUSES
  );
  assert.equal(report.evidence.p28ValidationEvidenceReader.gateReadiness.canClaimV1RcReady, false);
  assert.equal(report.evidence.p28ValidationEvidenceReader.gateReadiness.readyForFinalRcMatrixRunner, false);
  assert.equal(report.evidence.p28ValidationEvidenceReader.commandCoverage.status, 'no_explicit_evidence');
  assert.deepEqual(
    report.evidence.p28ValidationEvidenceReader.commandCoverage.allowedStatuses,
    VALIDATION_EVIDENCE_COMMAND_COVERAGE_STATUSES
  );
  assert.equal(report.evidence.p28ValidationEvidenceReader.commandCoverage.executesCommands, false);
  assert.equal(report.evidence.p28ValidationEvidenceReader.rejectionSummary.status, 'no_rejections');
  assert.deepEqual(
    report.evidence.p28ValidationEvidenceReader.rejectionSummary.allowedStatuses,
    VALIDATION_EVIDENCE_REJECTION_SUMMARY_STATUSES
  );
  assert.deepEqual(
    report.evidence.p28ValidationEvidenceReader.rejectionSummary.knownReasons,
    VALIDATION_EVIDENCE_REJECTION_REASONS
  );
  assert.equal(report.evidence.p28ValidationEvidenceReader.rejectionSummary.rawRejectedInputExposed, false);
  assert.equal(report.evidence.p28ValidationEvidenceReader.confidencePosture.status, 'no_explicit_evidence');
  assert.deepEqual(
    report.evidence.p28ValidationEvidenceReader.confidencePosture.allowedStatuses,
    VALIDATION_EVIDENCE_CONFIDENCE_POSTURE_STATUSES
  );
  assert.equal(report.evidence.p28ValidationEvidenceReader.confidencePosture.decisionImpact, 'none_report_only');
  assert.equal(report.evidence.p28ValidationEvidenceReader.confidencePosture.canClaimV1RcReady, false);
});

test('minimal implementation preserves public MCP three-tool freeze', () => {
  const report = buildV1RcValidationAggregatorReport();

  assert.deepEqual(report.public_mcp_tools, [
    'record_memory',
    'search_memory',
    'memory_overview'
  ]);
});

test('minimal implementation maps current conclusions to documented evidence sources', () => {
  const report = buildV1RcValidationAggregatorReport();

  assert.ok(report.evidence_sources);
  assert.ok(report.evidence_sources.decision);
  assert.equal(report.evidence_sources.decision.source_ref, 'ValidationAggregatorService');
  assert.match(report.evidence_sources.public_mcp_tools.source_ref, /src\/core\/constants\.js/);
  assert.equal(report.evidence_sources.schema_version_runtime_enforcement.status, 'not_implemented');
  assert.equal(report.evidence_sources.schema_version_policy_fixture.status, 'fixture_contract_added');
  assert.equal(report.evidence_sources.schema_compatibility_dry_run_cli.status, 'fixture_only_cli_added_not_executed');
  assert.equal(report.evidence_sources.migration_import_export_dry_run_gate_cli.status, 'fixture_only_cli_added_not_executed');
  assert.equal(report.evidence_sources.migration_import_export_approval_packet_cli.status, 'fixture_only_cli_added_not_executed');
  assert.equal(report.evidence_sources.validation_evidence_reader.status, 'foundation_added_read_only');
  assert.equal(report.evidence_sources.full_final_rc_matrix.status, 'not_executed');
  assert.equal(report.evidence_sources.a5_gated_actions.status, 'blocked_pending_a5');
  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.deepEqual(report.public_mcp_tools, [
    'record_memory',
    'search_memory',
    'memory_overview'
  ]);
});

test('validation evidence reader exposes only explicit committed and local validation inputs', () => {
  const report = buildV1RcValidationAggregatorReport({
    generatedAt: '2026-05-17T02:00:00.000Z',
    validationEvidenceSources: [
      {
        id: 'cmv-0333-committed',
        source_type: 'committed_validation',
        status: 'passed',
        source_ref: '.agent_board/VALIDATION_LOG.md#CMV-0333',
        observed_at: '2026-05-17T00:00:00.000Z',
        commit: '9631b7e',
        commands: ['git diff --check'],
        summary: 'P27 closeout docs validation passed.',
        safety: {
          mutated: false,
          providerCalls: 0,
          serviceStarted: false,
          durableMemoryTouched: false,
          realMemoryPreview: false
        }
      },
      {
        id: 'p28-targeted-local',
        source_type: 'local_validation',
        status: 'passed',
        source_ref: 'tests/v1-rc-validation-aggregator-implementation.test.js',
        observed_at: '2026-05-17T01:30:00.000Z',
        commands: ['node --test tests\\v1-rc-validation-aggregator-implementation.test.js'],
        summary: 'Targeted aggregator evidence-reader test input.',
        safety: {
          mutated: false
        }
      }
    ]
  });

  const reader = report.evidence.p28ValidationEvidenceReader;

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.summary.validationAggregatorFullImplementation, false);
  assert.equal(report.summary.schemaVersionRuntimeEnforcementImplemented, false);
  assert.equal(report.summary.validationEvidenceAcceptedCount, 2);
  assert.equal(report.summary.validationEvidenceFreshnessStatus, 'fresh_passed');
  assert.equal(report.summary.validationEvidenceStaleCount, 0);
  assert.equal(report.summary.validationEvidenceGateReadinessStatus, 'not_ready_existing_blockers');
  assert.equal(report.summary.validationEvidenceCanClaimV1RcReady, false);
  assert.equal(report.summary.validationEvidenceCommandCoverageStatus, 'command_coverage_present');
  assert.equal(report.summary.validationEvidenceCommandCount, 2);
  assert.equal(report.summary.validationEvidenceRejectionStatus, 'no_rejections');
  assert.equal(report.summary.validationEvidenceRejectedCount, 0);
  assert.equal(report.summary.validationEvidenceConfidencePostureStatus, 'usable_but_blocked');
  assert.equal(report.summary.validationEvidenceConfidenceCanClaimV1RcReady, false);
  assert.equal(reader.status, 'explicit_evidence_available');
  assert.equal(reader.sourceMode, 'explicit_safe_inputs_only');
  assert.deepEqual(reader.contract.sourceTypes, VALIDATION_EVIDENCE_SOURCE_TYPES);
  assert.equal(reader.contract.readsFiles, false);
  assert.equal(reader.contract.executesCommands, false);
  assert.equal(reader.contract.startsServices, false);
  assert.equal(reader.acceptedCount, 2);
  assert.equal(reader.rejectedCount, 0);
  assert.equal(reader.summary.committedValidationCount, 1);
  assert.equal(reader.summary.localValidationCount, 1);
  assert.equal(reader.summary.passedCount, 2);
  assert.equal(reader.summary.allAcceptedSafe, true);
  assert.equal(reader.freshness.status, 'fresh_passed');
  assert.equal(reader.freshness.referenceTime, '2026-05-17T02:00:00.000Z');
  assert.equal(reader.freshness.sourcesWithObservedAt, 2);
  assert.equal(reader.freshness.unknownFreshnessCount, 0);
  assert.equal(reader.freshness.staleCount, 0);
  assert.equal(reader.freshness.freshestObservedAt, '2026-05-17T01:30:00.000Z');
  assert.equal(reader.freshness.allAcceptedPassed, true);
  assert.equal(reader.freshness.hasFailedEvidence, false);
  assert.equal(reader.freshness.hasBlockedEvidence, false);
  assert.equal(reader.gateReadiness.status, 'not_ready_existing_blockers');
  assert.equal(reader.gateReadiness.explicitEvidenceUsable, true);
  assert.equal(reader.gateReadiness.canClaimV1RcReady, false);
  assert.equal(reader.gateReadiness.readyForFinalRcMatrixRunner, false);
  assert.equal(reader.gateReadiness.blockerCounts.validationRequired, 1);
  assert.equal(reader.gateReadiness.blockerCounts.runtimeRequired, 2);
  assert.equal(reader.gateReadiness.blockerCounts.a5Gated, 6);
  assert.equal(reader.gateReadiness.blockedBy.includes('schema-version-runtime-enforcement-not-implemented'), true);
  assert.equal(reader.commandCoverage.status, 'command_coverage_present');
  assert.equal(reader.commandCoverage.executesCommands, false);
  assert.equal(reader.commandCoverage.acceptedEvidenceCount, 2);
  assert.equal(reader.commandCoverage.sourcesWithCommands, 2);
  assert.equal(reader.commandCoverage.sourcesWithoutCommands, 0);
  assert.equal(reader.commandCoverage.commandCount, 2);
  assert.equal(reader.commandCoverage.uniqueCommandCount, 2);
  assert.deepEqual(reader.commandCoverage.sourceTypesCovered, [
    'committed_validation',
    'local_validation'
  ]);
  assert.equal(reader.commandCoverage.requiredSourceTypesCovered, true);
  assert.equal(reader.commandCoverage.commandFamilies.git, 1);
  assert.equal(reader.commandCoverage.commandFamilies.node, 1);
  assert.equal(reader.commandCoverage.commandFamilies.npm, 0);
  assert.equal(reader.commandCoverage.allAcceptedHaveCommands, true);
  assert.equal(reader.rejectionSummary.status, 'no_rejections');
  assert.equal(reader.rejectionSummary.rejectedCount, 0);
  assert.equal(reader.rejectionSummary.rejectsUnsafeInputs, true);
  assert.equal(reader.confidencePosture.status, 'usable_but_blocked');
  assert.equal(reader.confidencePosture.confidenceSignal, 'usable_explicit_evidence');
  assert.equal(reader.confidencePosture.canClaimV1RcReady, false);
  assert.equal(reader.confidencePosture.limitations.includes('full_final_rc_matrix_not_executed'), true);
  assert.equal(reader.confidencePosture.limitations.includes('runtime_schema_version_enforcement_missing'), true);
  assert.equal(reader.confidencePosture.limitations.includes('a5_actions_blocked'), true);
  assert.deepEqual(reader.acceptedSources.map(source => source.id), [
    'cmv-0333-committed',
    'p28-targeted-local'
  ]);
  assert.equal(reader.acceptedSources[0].safety.providerCalls, 0);
  assert.equal(reader.acceptedSources[0].safety.serviceStarted, false);
  assert.equal(reader.acceptedSources[0].safety.durableMemoryTouched, false);
  assert.equal(reader.acceptedSources[0].safety.realMemoryPreview, false);
});

test('validation evidence freshness summary surfaces stale, unknown, warning, and failing explicit inputs', () => {
  const staleReport = buildV1RcValidationAggregatorReport({
    generatedAt: '2026-05-17T00:00:00.000Z',
    validationEvidenceSources: [
      {
        id: 'stale-committed',
        source_type: 'committed_validation',
        status: 'passed',
        source_ref: '.agent_board/VALIDATION_LOG.md#CMV-0300',
        observed_at: '2026-05-01T00:00:00.000Z',
        safety: { mutated: false }
      },
      {
        id: 'unknown-local',
        source_type: 'local_validation',
        status: 'warning',
        source_ref: 'tests/v1-rc-validation-aggregator-implementation.test.js',
        safety: { mutated: false }
      }
    ]
  });
  const failingReport = buildV1RcValidationAggregatorReport({
    generatedAt: '2026-05-17T00:00:00.000Z',
    validationEvidenceSources: [
      {
        id: 'failed-local',
        source_type: 'local_validation',
        status: 'failed',
        source_ref: 'tests/v1-rc-validation-aggregator-implementation.test.js',
        observed_at: '2026-05-17T00:00:00.000Z',
        safety: { mutated: false }
      }
    ]
  });

  assert.equal(staleReport.decision, 'NOT_READY_BLOCKED');
  assert.equal(staleReport.evidence.p28ValidationEvidenceReader.freshness.status, 'stale_or_unknown');
  assert.equal(staleReport.evidence.p28ValidationEvidenceReader.freshness.staleCount, 1);
  assert.equal(staleReport.evidence.p28ValidationEvidenceReader.freshness.unknownFreshnessCount, 1);
  assert.equal(staleReport.evidence.p28ValidationEvidenceReader.freshness.hasWarnings, true);
  assert.equal(staleReport.evidence.p28ValidationEvidenceReader.freshness.allAcceptedPassed, false);
  assert.equal(staleReport.evidence.p28ValidationEvidenceReader.gateReadiness.status, 'not_ready_stale_or_unknown_evidence');
  assert.equal(staleReport.evidence.p28ValidationEvidenceReader.gateReadiness.explicitEvidenceUsable, false);
  assert.equal(staleReport.evidence.p28ValidationEvidenceReader.commandCoverage.status, 'command_coverage_missing');
  assert.equal(staleReport.evidence.p28ValidationEvidenceReader.commandCoverage.sourcesWithoutCommands, 2);
  assert.equal(staleReport.evidence.p28ValidationEvidenceReader.confidencePosture.status, 'stale_or_unknown_signal');
  assert.equal(failingReport.decision, 'NOT_READY_BLOCKED');
  assert.equal(failingReport.evidence.p28ValidationEvidenceReader.freshness.status, 'failed_or_blocked');
  assert.equal(failingReport.evidence.p28ValidationEvidenceReader.freshness.hasFailedEvidence, true);
  assert.equal(failingReport.evidence.p28ValidationEvidenceReader.gateReadiness.status, 'not_ready_failed_or_blocked_evidence');
  assert.equal(failingReport.evidence.p28ValidationEvidenceReader.confidencePosture.status, 'failed_or_blocked_signal');
});

test('validation evidence reader rejects unsafe, unsupported, or sensitive explicit inputs', () => {
  const reader = normalizeValidationEvidenceSources([
    {
      id: 'provider-side-effect',
      source_type: 'local_validation',
      status: 'passed',
      source_ref: 'manual-input',
      safety: {
        providerCalls: 1
      }
    },
    {
      id: 'unsupported-kind',
      source_type: 'live_validation',
      status: 'passed',
      source_ref: 'manual-input'
    },
    {
      id: 'sensitive-summary',
      source_type: 'local_validation',
      status: 'passed',
      source_ref: 'manual-input',
      summary: 'authorization: should be rejected'
    }
  ]);

  assert.equal(reader.acceptedCount, 0);
  assert.equal(reader.rejectedCount, 3);
  assert.deepEqual(reader.rejectedSources.map(source => source.reason), [
    'side_effect_evidence_rejected',
    'unsupported_source_type',
    'sensitive_fragment_rejected'
  ]);
  assert.equal(JSON.stringify(reader).toLowerCase().includes('authorization:'), false);
});

test('validation evidence gate readiness fails closed when explicit inputs include rejections', () => {
  const report = buildV1RcValidationAggregatorReport({
    generatedAt: '2026-05-17T00:00:00.000Z',
    validationEvidenceSources: [
      {
        id: 'fresh-local',
        source_type: 'local_validation',
        status: 'passed',
        source_ref: 'tests/v1-rc-validation-aggregator-implementation.test.js',
        observed_at: '2026-05-17T00:00:00.000Z',
        safety: { mutated: false }
      },
      {
        id: 'unsupported-kind',
        source_type: 'live_validation',
        status: 'passed',
        source_ref: 'manual-input',
        observed_at: '2026-05-17T00:00:00.000Z',
        safety: { mutated: false }
      }
    ]
  });
  const readiness = report.evidence.p28ValidationEvidenceReader.gateReadiness;

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(readiness.status, 'not_ready_rejected_evidence');
  assert.equal(readiness.acceptedEvidenceCount, 1);
  assert.equal(readiness.rejectedEvidenceCount, 1);
  assert.equal(readiness.explicitEvidenceUsable, false);
  assert.equal(readiness.canClaimV1RcReady, false);
  assert.equal(report.summary.validationEvidenceRejectionStatus, 'rejections_present');
  assert.equal(report.summary.validationEvidenceRejectedCount, 1);
  assert.equal(report.evidence.p28ValidationEvidenceReader.rejectionSummary.reasonCounts.unsupported_source_type, 1);
  assert.equal(report.evidence.p28ValidationEvidenceReader.rejectionSummary.hasUnsupportedContractRejection, true);
  assert.equal(report.evidence.p28ValidationEvidenceReader.rejectionSummary.rawRejectedInputExposed, false);
  assert.equal(report.evidence.p28ValidationEvidenceReader.confidencePosture.status, 'rejected_or_unsafe_signal');
});

test('validation evidence rejection summary counts rejected explicit input reasons without exposing raw input', () => {
  const report = buildV1RcValidationAggregatorReport({
    validationEvidenceSources: [
      null,
      {
        id: 'provider-side-effect',
        source_type: 'local_validation',
        status: 'passed',
        source_ref: 'manual-input',
        safety: { providerCalls: 1 }
      },
      {
        id: 'unsupported-kind',
        source_type: 'live_validation',
        status: 'passed',
        source_ref: 'manual-input'
      },
      {
        id: 'unsupported-status',
        source_type: 'local_validation',
        status: 'maybe',
        source_ref: 'manual-input'
      },
      {
        id: 'sensitive-summary',
        source_type: 'local_validation',
        status: 'passed',
        source_ref: 'manual-input',
        summary: 'authorization: should be rejected'
      }
    ]
  });
  const rejectionSummary = report.evidence.p28ValidationEvidenceReader.rejectionSummary;

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.summary.validationEvidenceRejectionStatus, 'all_inputs_rejected');
  assert.equal(report.summary.validationEvidenceRejectedCount, 5);
  assert.equal(rejectionSummary.status, 'all_inputs_rejected');
  assert.equal(rejectionSummary.rejectedCount, 5);
  assert.equal(rejectionSummary.acceptedCount, 0);
  assert.equal(rejectionSummary.reasonCounts.invalid_source_shape, 1);
  assert.equal(rejectionSummary.reasonCounts.side_effect_evidence_rejected, 1);
  assert.equal(rejectionSummary.reasonCounts.unsupported_source_type, 1);
  assert.equal(rejectionSummary.reasonCounts.unsupported_status, 1);
  assert.equal(rejectionSummary.reasonCounts.sensitive_fragment_rejected, 1);
  assert.equal(rejectionSummary.hasSensitiveRejection, true);
  assert.equal(rejectionSummary.hasSideEffectRejection, true);
  assert.equal(rejectionSummary.hasUnsupportedContractRejection, true);
  assert.equal(rejectionSummary.rawRejectedInputExposed, false);
  assert.equal(report.evidence.p28ValidationEvidenceReader.confidencePosture.status, 'rejected_or_unsafe_signal');
  assertNoSensitiveSurface(report);
});

test('validation evidence command coverage reports partial explicit command evidence without execution', () => {
  const report = buildV1RcValidationAggregatorReport({
    validationEvidenceSources: [
      {
        id: 'with-command',
        source_type: 'local_validation',
        status: 'passed',
        source_ref: 'tests/v1-rc-validation-aggregator-implementation.test.js',
        observed_at: '2026-05-17T00:00:00.000Z',
        commands: ['npm test'],
        safety: { mutated: false }
      },
      {
        id: 'without-command',
        source_type: 'local_validation',
        status: 'passed',
        source_ref: 'tests/v1-rc-validation-aggregator.test.js',
        observed_at: '2026-05-17T00:00:00.000Z',
        safety: { mutated: false }
      }
    ]
  });
  const coverage = report.evidence.p28ValidationEvidenceReader.commandCoverage;

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(coverage.status, 'command_coverage_partial');
  assert.equal(coverage.executesCommands, false);
  assert.equal(coverage.sourcesWithCommands, 1);
  assert.equal(coverage.sourcesWithoutCommands, 1);
  assert.equal(coverage.commandFamilies.npm, 1);
  assert.equal(coverage.allAcceptedHaveCommands, false);
  assert.equal(report.evidence.p28ValidationEvidenceReader.confidencePosture.status, 'partial_signal');
});

test('minimal implementation classifies A4, A5, runtime-required, and conditional live items', () => {
  const report = buildV1RcValidationAggregatorReport();

  assert.equal(report.checks.validationAggregatorExecutable.status, 'minimal_implemented');
  assert.equal(report.checks.schemaVersionRuntimeEnforcement.status, 'planned_not_implemented');
  assert.equal(report.checks.schemaVersionPolicyFixture.status, 'fixture_contract_added');
  assert.equal(report.checks.schemaVersionPolicyFixture.a4Safe, true);
  assert.equal(report.checks.schemaCompatibilityDryRunCli.status, 'fixture_only_cli_added');
  assert.equal(report.checks.schemaCompatibilityDryRunCli.a4Safe, true);
  assert.equal(report.checks.schemaCompatibilityDryRunCli.blocksV1Rc, undefined);
  assert.equal(report.checks.migrationImportExportDryRunGateCli.status, 'fixture_only_cli_added');
  assert.equal(report.checks.migrationImportExportDryRunGateCli.a4Safe, true);
  assert.equal(report.checks.migrationImportExportDryRunGateCli.blocksV1Rc, undefined);
  assert.equal(report.checks.migrationImportExportApprovalPacketCli.status, 'fixture_only_cli_added');
  assert.equal(report.checks.migrationImportExportApprovalPacketCli.a4Safe, true);
  assert.equal(report.checks.migrationImportExportApprovalPacketCli.blocksV1Rc, undefined);
  assert.equal(report.checks.conditionalLiveMcpHttp.status, 'not_executed_service_not_running');
  assert.equal(report.runtime_required.includes('schemaVersionRuntimeEnforcement'), true);
  assert.equal(report.a5_gated.includes('providerExecution'), true);
  assert.equal(report.a4_safe.includes('gitHygiene'), true);
  assert.equal(report.a4_safe.includes('schemaVersionPolicyFixture'), true);
  assert.equal(report.a4_safe.includes('schemaCompatibilityDryRunCli'), true);
  assert.equal(report.a4_safe.includes('migrationImportExportDryRunGateCli'), true);
  assert.equal(report.a4_safe.includes('migrationImportExportApprovalPacketCli'), true);
  assert.equal(report.conditional_live.includes('health'), true);

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
});

test('minimal implementation reports no side effects and no sensitive surfaces', () => {
  const report = buildV1RcValidationAggregatorReport();

  assert.equal(report.safety.mutated, false);
  assert.equal(report.safety.providerCalls, 0);
  assert.equal(report.safety.serviceStarted, false);
  assert.equal(report.safety.durableMemoryTouched, false);
  assert.equal(report.safety.realMemoryPreview, false);
  assert.equal(report.safety.packageChanged, false);
  assert.equal(report.safety.configChanged, false);
  assert.equal(report.safety.migrationApplied, false);
  assert.equal(report.safety.importExportApplied, false);
  assert.equal(report.safety.watchdogStartupInstalled, false);
  assert.equal(report.safety.pushed, false);
  assert.equal(report.safety.tagged, false);
  assert.equal(report.safety.released, false);
  assert.equal(report.safety.deployed, false);

  for (const key of report.forbiddenTopLevelKeys) {
    assert.equal(Object.hasOwn(report, key), false, key);
    assert.equal(hasNestedKey(report, key), false, key);
  }

  assertNoSensitiveSurface(report);
});
