const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, 'fixtures', 'memory-governance-review-surface-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const PUBLIC_MCP_TOOLS = [
  'record_memory',
  'search_memory',
  'memory_overview',
  'audit_memory'
];

const REQUIRED_SOURCE_SURFACES = [
  'lifecycle_contract',
  'approval_packet',
  'audit_evidence',
  'admin_review_surface',
  'validation_aggregator_report_shape'
];

function sourceSurfaceById(id) {
  const source = fixture.sourceSurfaces.find(candidate => candidate.id === id);
  assert.ok(source, `missing source surface: ${id}`);
  return source;
}

test('P34.1 governance review surface fixture parses and locks top-level state', () => {
  assert.equal(fixture.schemaVersion, 'memory-governance-review-surface-v1');
  assert.equal(fixture.version, 'v1');
  assert.equal(fixture.phase, 'P34.1-governance-review-surface-fixture-contract');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.reviewOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.reviewStatus, 'evidence_only');
  assert.equal(fixture.reviewLevel, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.approvalStatus, 'BLOCKED_PENDING_APPROVAL');
});

test('P34.1 fixture declares no execution, real DB review, or runtime integration', () => {
  assert.equal(fixture.executionApproved, false);
  assert.equal(fixture.mutated, false);
  assert.equal(fixture.runtimeIntegrated, false);
  assert.equal(fixture.governanceReportExecuted, false);
  assert.equal(fixture.realDbReviewExecuted, false);
  assert.equal(fixture.durableMemoryTouched, false);
  assert.equal(fixture.durableAuditWritten, false);
  assert.equal(fixture.publicMcpExpanded, false);
  assert.equal(fixture.realMemoryScanned, false);
  assert.equal(fixture.providerCalls, 0);
});

test('public MCP tools remain frozen and validate_memory stays internal-only', () => {
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.publicTools, PUBLIC_MCP_TOOLS);
  assert.ok(fixture.requiredWording.some(line => line.includes('validate_memory remains internal-only')));
});

test('accepted source types are fully whitelisted', () => {
  const safe = new Set(fixture.safeSourceTypes);

  assert.equal(fixture.acceptedForPlanning, true);
  assert.deepEqual(fixture.unsupportedSourceTypes, []);

  for (const sourceType of fixture.acceptedSourceTypes) {
    assert.equal(safe.has(sourceType), true, `${sourceType} is not safe`);
  }
});

test('source surfaces cover lifecycle, approval, audit, admin review, and aggregator evidence', () => {
  assert.deepEqual(
    fixture.sourceSurfaces.map(source => source.id),
    REQUIRED_SOURCE_SURFACES
  );

  for (const source of fixture.sourceSurfaces) {
    assert.equal(fixture.safeSourceTypes.includes(source.sourceType), true, source.id);
    assert.equal(source.acceptedForPlanning, true, source.id);
    assert.ok(Array.isArray(source.artifacts), `${source.id} must list artifacts`);
    assert.ok(source.artifacts.length > 0, `${source.id} must have artifacts`);
  }
});

test('helper-backed source surfaces are visible but not executed', () => {
  for (const sourceId of ['lifecycle_contract', 'approval_packet', 'audit_evidence']) {
    const source = sourceSurfaceById(sourceId);

    assert.equal(source.helperExecuted, false, sourceId);
    assert.equal(source.fixtureReadByRuntime, false, sourceId);
  }

  assert.equal(sourceSurfaceById('approval_packet').executionApproved, false);
  assert.equal(sourceSurfaceById('audit_evidence').durableAuditWritten, false);
});

test('admin review surface documents existing commands without executing real DB review', () => {
  const source = sourceSurfaceById('admin_review_surface');
  const section = fixture.reviewSections.adminReviewSurface;

  assert.equal(source.governanceReportExecuted, false);
  assert.equal(source.realDbReviewExecuted, false);
  assert.equal(source.unavailableSourceShapeRequired, true);
  assert.equal(section.sourceCommandsDocumented, true);
  assert.equal(section.commandsExecutedByP34, false);
  assert.equal(section.governanceReportExecuted, false);
  assert.equal(section.realDbReviewExecuted, false);
  assert.equal(section.unavailableSourceShapeRequired, true);
});

test('ValidationAggregator evidence remains static report shape only', () => {
  const source = sourceSurfaceById('validation_aggregator_report_shape');
  const section = fixture.reviewSections.aggregatorReview;

  assert.equal(source.aggregatorExecutedHelpers, false);
  assert.equal(source.fixtureReadByAggregator, false);
  assert.equal(source.runtimeIntegrated, false);
  assert.equal(section.status, 'static_report_shape_only');
  assert.equal(section.helpersExecutedByAggregator, false);
  assert.equal(section.fixturesReadByAggregator, false);
  assert.equal(section.canClaimGovernanceRuntimeReady, false);
  assert.equal(section.canClaimV1RcReady, false);
});

test('review sections preserve lifecycle, approval, and audit blocked posture', () => {
  const { lifecycleReview, approvalReview, auditEvidenceReview } = fixture.reviewSections;

  assert.equal(lifecycleReview.status, 'evidence_only');
  assert.equal(lifecycleReview.runtimeIntegrated, false);
  assert.equal(lifecycleReview.mutated, false);
  assert.ok(lifecycleReview.visibleCases.includes('proposal_accept'));
  assert.ok(lifecycleReview.visibleCases.includes('validate_memory_internal'));

  assert.equal(approvalReview.status, 'BLOCKED_PENDING_APPROVAL');
  assert.equal(approvalReview.executionApproved, false);
  assert.equal(approvalReview.mutated, false);
  assert.ok(approvalReview.visibleActions.includes('governance_audit_write'));
  assert.ok(approvalReview.visibleActions.includes('public_mcp_governance_expansion'));

  assert.equal(auditEvidenceReview.status, 'BLOCKED_PENDING_APPROVAL');
  assert.equal(auditEvidenceReview.auditWriterImplemented, false);
  assert.equal(auditEvidenceReview.durableAuditWritten, false);
  assert.ok(auditEvidenceReview.visibleEventFamilies.includes('memory_validate_internal'));
  assert.ok(auditEvidenceReview.visibleEventFamilies.includes('governance_restore_performed'));
});

test('required approvals and blockers preserve not-ready governance state', () => {
  for (const approval of [
    'runtime_governance_integration',
    'governed_action_execution',
    'audit_writer_implementation',
    'durable_audit_write',
    'public_mcp_governance_expansion',
    'real_memory_scan_export_import',
    'push_tag_release_deploy'
  ]) {
    assert.ok(fixture.requiredApprovals.includes(approval), approval);
  }

  for (const blocker of [
    'runtime_governance_integration_not_implemented',
    'governed_action_execution_not_approved',
    'audit_writer_not_implemented',
    'durable_audit_write_not_approved',
    'schema_version_runtime_enforcement_incomplete',
    'validation_aggregator_full_implementation_incomplete',
    'final_rc_matrix_not_executed',
    'v1_rc_not_ready_blocked'
  ]) {
    assert.ok(fixture.blockers.includes(blocker), blocker);
  }
});

test('safety flags preserve no side effects and no sensitive output', () => {
  assert.equal(fixture.safety.noRuntimeGovernanceIntegration, true);
  assert.equal(fixture.safety.noGovernedActionExecution, true);
  assert.equal(fixture.safety.noAuditWriterImplementation, true);
  assert.equal(fixture.safety.noDurableAuditWrite, true);
  assert.equal(fixture.safety.noDurableMemoryWrite, true);
  assert.equal(fixture.safety.noPublicMcpExpansion, true);
  assert.equal(fixture.safety.noRealMemoryScan, true);
  assert.equal(fixture.safety.noGovernanceReportExecution, true);
  assert.equal(fixture.safety.noRealDbReviewExecution, true);
  assert.equal(fixture.safety.noMigrationImportExportApply, true);
  assert.equal(fixture.safety.noBackupRestore, true);
  assert.equal(fixture.safety.noProviderCall, true);
  assert.equal(fixture.safety.noServiceStart, true);
  assert.equal(fixture.safety.noConfigMutation, true);
  assert.equal(fixture.safety.noPackageScriptChange, true);
  assert.equal(fixture.safety.noRemoteWrite, true);
  assert.equal(fixture.safety.rawSecretExposed, false);
  assert.equal(fixture.safety.rawWorkspaceIdExposed, false);
  assert.equal(fixture.safety.authorizationHeaderExposed, false);
  assert.equal(fixture.safety.apiKeyExposed, false);
});

test('required wording and forbidden claims prevent readiness overclaims', () => {
  assert.ok(fixture.requiredWording.some(line => line.includes('does not implement a runtime review CLI')));
  assert.ok(fixture.requiredWording.some(line => line.includes('does not approve governed action execution')));
  assert.ok(fixture.requiredWording.some(line => line.includes('governance:report is not executed')));
  assert.ok(fixture.requiredWording.some(line => line.includes('v1.0 RC remains NOT_READY_BLOCKED')));
  assert.ok(fixture.forbiddenClaims.includes('runtime governance review CLI is implemented'));
  assert.ok(fixture.forbiddenClaims.includes('real database governance review has executed'));
  assert.ok(fixture.forbiddenClaims.includes('v1.0 RC readiness is unblocked'));
});

test('fixture text does not expose raw secrets or concrete raw workspace ids', () => {
  assert.doesNotMatch(fixtureText, /authorization\s*:/i);
  assert.doesNotMatch(fixtureText, /Bearer\s+[A-Za-z0-9._-]+/);
  assert.doesNotMatch(fixtureText, /api[_-]?key\s*[:=]/i);
  assert.doesNotMatch(fixtureText, /sk-[A-Za-z0-9_-]{12,}/);
  assert.doesNotMatch(fixtureText, /workspace-[A-Za-z0-9_-]{8,}/);
  assert.doesNotMatch(fixtureText, /[A-Z]:[\\/]/);
});

test('reading the fixture does not rewrite it', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
