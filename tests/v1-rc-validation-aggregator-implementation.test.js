const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  buildV1RcValidationAggregatorReport
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
  assert.equal(report.evidence_sources.full_final_rc_matrix.status, 'not_executed');
  assert.equal(report.evidence_sources.a5_gated_actions.status, 'blocked_pending_a5');
  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.deepEqual(report.public_mcp_tools, [
    'record_memory',
    'search_memory',
    'memory_overview'
  ]);
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
