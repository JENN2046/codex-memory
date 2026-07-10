const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, 'fixtures', 'memory-governance-audit-evidence-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const PUBLIC_MCP_TOOLS = ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory'];

const REQUIRED_EVENT_FAMILIES = [
  'memory_proposal_accept',
  'memory_proposal_reject',
  'memory_supersede',
  'memory_tombstone',
  'memory_validate_internal',
  'governance_approval_decision',
  'governance_report_write',
  'governance_backup_created',
  'governance_restore_performed',
  'public_mcp_governance_expansion_review'
];

function eventFamilyById(id) {
  const eventFamily = fixture.eventFamilies.find(candidate => candidate.id === id);
  assert.ok(eventFamily, `missing event family: ${id}`);
  return eventFamily;
}

test('P33.1 governance audit evidence fixture parses and locks top-level state', () => {
  assert.equal(fixture.schemaVersion, 'memory-governance-audit-evidence-v1');
  assert.equal(fixture.version, 'v1');
  assert.equal(fixture.phase, 'P33.1-memory-governance-audit-evidence-fixture-contract');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.reviewOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.approvalStatus, 'BLOCKED_PENDING_APPROVAL');
});

test('P33.1 fixture declares no audit writer, execution, or runtime integration', () => {
  assert.equal(fixture.auditWriterImplemented, false);
  assert.equal(fixture.durableAuditWritten, false);
  assert.equal(fixture.executionApproved, false);
  assert.equal(fixture.mutated, false);
  assert.equal(fixture.runtimeIntegrated, false);
  assert.equal(fixture.publicMcpExpanded, false);
  assert.equal(fixture.realMemoryScanned, false);
  assert.equal(fixture.providerCalls, 0);
});

test('public MCP tools remain frozen and validate_memory stays internal-only', () => {
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.publicTools, PUBLIC_MCP_TOOLS);

  const validateMemory = eventFamilyById('memory_validate_internal');

  assert.equal(validateMemory.publicMcpTool, false);
  assert.equal(validateMemory.requiresValidationEvidence, true);
});

test('accepted source types are fully whitelisted', () => {
  const safe = new Set(fixture.safeSourceTypes);

  assert.equal(fixture.acceptedForPlanning, true);
  assert.deepEqual(fixture.unsupportedSourceTypes, []);

  for (const sourceType of fixture.acceptedSourceTypes) {
    assert.equal(safe.has(sourceType), true, `${sourceType} is not safe`);
  }
});

test('required evidence fields cover action, evidence, policy, validation, and rollback', () => {
  for (const field of [
    'governedActionId',
    'eventFamily',
    'approvalPacketRef',
    'sourceEvidence',
    'sourceType',
    'redactedSubjectRefs',
    'lifecycleSummary',
    'actorPolicy',
    'reason',
    'evidenceSummary',
    'publicMcpImpact',
    'durableWriteSurface',
    'backupOrRollbackRequirement',
    'validationEvidence',
    'stopConditions',
    'executionApprovalStatement'
  ]) {
    assert.ok(fixture.requiredEvidenceFields.includes(field), field);
  }
});

test('all audit event families remain blocked pending explicit approval', () => {
  assert.deepEqual(
    fixture.eventFamilies.map(eventFamily => eventFamily.id),
    REQUIRED_EVENT_FAMILIES
  );

  for (const eventFamily of fixture.eventFamilies) {
    assert.equal(eventFamily.status, 'BLOCKED_PENDING_APPROVAL', eventFamily.id);
    assert.equal(eventFamily.requiresExplicitApproval, true, eventFamily.id);
    assert.equal(eventFamily.executionApproved, false, eventFamily.id);
    assert.equal(eventFamily.durableAuditWritten, false, eventFamily.id);
  }
});

test('proposal accept and reject require approval packet and policy evidence', () => {
  const accept = eventFamilyById('memory_proposal_accept');
  const reject = eventFamilyById('memory_proposal_reject');

  assert.equal(accept.requiresApprovalPacketRef, true);
  assert.equal(accept.requiresLifecycleSummary, true);
  assert.equal(accept.requiresRollbackPath, true);
  assert.equal(reject.requiresApprovalPacketRef, true);
  assert.equal(reject.requiresReviewerPolicy, true);
  assert.equal(reject.requiresRedactionPolicy, true);
});

test('supersession and tombstone remain non-mutating fixture evidence', () => {
  const supersede = eventFamilyById('memory_supersede');
  const tombstone = eventFamilyById('memory_tombstone');

  assert.equal(supersede.requiresOldNewRefs, true);
  assert.equal(supersede.requiresLinkPolicy, true);
  assert.equal(supersede.mutated, false);
  assert.equal(tombstone.requiresSoftDeletePolicy, true);
  assert.equal(tombstone.hardDeleteAllowed, false);
  assert.equal(tombstone.mutated, false);
});

test('backup, restore, and public MCP expansion remain blocked and non-executed', () => {
  const backup = eventFamilyById('governance_backup_created');
  const restore = eventFamilyById('governance_restore_performed');
  const publicMcp = eventFamilyById('public_mcp_governance_expansion_review');

  assert.equal(backup.backupCreated, false);
  assert.equal(restore.restorePerformed, false);
  assert.equal(publicMcp.publicMcpExpanded, false);
  assert.equal(backup.executionApproved, false);
  assert.equal(restore.executionApproved, false);
  assert.equal(publicMcp.executionApproved, false);
});

test('blockers preserve audit writer, governance, schema, aggregator, matrix, and RC gaps', () => {
  for (const blocker of [
    'audit_writer_not_implemented',
    'durable_audit_write_not_approved',
    'governed_action_execution_not_approved',
    'runtime_governance_integration_not_implemented',
    'public_mcp_governance_expansion_not_approved',
    'real_memory_scan_blocked',
    'backup_restore_blocked',
    'schema_version_runtime_enforcement_incomplete',
    'validation_aggregator_full_implementation_incomplete',
    'final_rc_matrix_not_executed',
    'v1_rc_not_ready_blocked'
  ]) {
    assert.ok(fixture.blockers.includes(blocker), blocker);
  }
});

test('safety flags preserve no side effects and no sensitive output', () => {
  assert.equal(fixture.safety.noAuditWriterImplementation, true);
  assert.equal(fixture.safety.noDurableAuditWrite, true);
  assert.equal(fixture.safety.noRuntimeGovernanceIntegration, true);
  assert.equal(fixture.safety.noDurableMemoryWrite, true);
  assert.equal(fixture.safety.noPublicMcpExpansion, true);
  assert.equal(fixture.safety.noRealMemoryScan, true);
  assert.equal(fixture.safety.noMigrationImportExportApply, true);
  assert.equal(fixture.safety.noBackupRestore, true);
  assert.equal(fixture.safety.noProviderCall, true);
  assert.equal(fixture.safety.noServiceStart, true);
  assert.equal(fixture.safety.noConfigMutation, true);
  assert.equal(fixture.safety.noPackageScriptChange, true);
  assert.equal(fixture.safety.noRemoteWrite, true);
  assert.equal(fixture.safety.rawSecretExposed, false);
  assert.equal(fixture.safety.rawWorkspaceIdExposed, false);
});

test('required wording and forbidden claims prevent readiness overclaims', () => {
  assert.ok(fixture.requiredWording.some(line => line.includes('does not implement an audit writer')));
  assert.ok(fixture.requiredWording.some(line => line.includes('do not approve or execute')));
  assert.ok(fixture.requiredWording.some(line => line.includes('BLOCKED_PENDING_APPROVAL')));
  assert.ok(fixture.requiredWording.some(line => line.includes('validate_memory remains internal-only')));
  assert.ok(fixture.forbiddenClaims.includes('audit writer is implemented'));
  assert.ok(fixture.forbiddenClaims.includes('v1.0 RC readiness is unblocked'));
});

test('fixture text does not expose raw secrets or concrete raw workspace ids', () => {
  assert.doesNotMatch(fixtureText, /Bearer\s+[A-Za-z0-9._-]+/);
  assert.doesNotMatch(fixtureText, /sk-[A-Za-z0-9_-]{12,}/);
  assert.doesNotMatch(fixtureText, /workspace-[A-Za-z0-9_-]{8,}/);
  assert.doesNotMatch(fixtureText, /[A-Z]:[\\/]/);
});

test('reading the fixture does not rewrite it', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
