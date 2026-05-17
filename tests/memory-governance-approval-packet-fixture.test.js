const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, 'fixtures', 'memory-governance-approval-packet-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const PUBLIC_MCP_TOOLS = [
  'record_memory',
  'search_memory',
  'memory_overview'
];

const REQUIRED_ACTION_IDS = [
  'proposal_accept',
  'proposal_reject',
  'supersession_apply',
  'tombstone_apply',
  'validate_memory_internal_apply',
  'governance_audit_write',
  'governance_report_write',
  'public_mcp_governance_expansion',
  'real_memory_governance_preview',
  'backup_before_governance_apply',
  'restore_after_governance_apply'
];

function actionById(id) {
  const action = fixture.governedActions.find(candidate => candidate.id === id);
  assert.ok(action, `missing governed action: ${id}`);
  return action;
}

test('P32.1 governance approval packet fixture parses and locks top-level state', () => {
  assert.equal(fixture.schemaVersion, 'memory-governance-approval-packet-v1');
  assert.equal(fixture.version, 'v1');
  assert.equal(fixture.phase, 'P32.1-memory-governance-approval-packet-fixture-contract');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.reviewOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.approvalStatus, 'BLOCKED_PENDING_APPROVAL');
});

test('P32.1 fixture declares no execution or runtime integration', () => {
  assert.equal(fixture.executionApproved, false);
  assert.equal(fixture.mutated, false);
  assert.equal(fixture.runtimeIntegrated, false);
  assert.equal(fixture.publicMcpExpanded, false);
  assert.equal(fixture.realMemoryScanned, false);
  assert.equal(fixture.providerCalls, 0);
});

test('public MCP tools remain frozen and validate_memory is not public', () => {
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.publicTools, PUBLIC_MCP_TOOLS);

  const validateMemory = actionById('validate_memory_internal_apply');

  assert.equal(validateMemory.publicMcpTool, false);
  assert.equal(validateMemory.requiredFields.includes('publicMcpExpansion'), true);
});

test('accepted source types are fully whitelisted', () => {
  const safe = new Set(fixture.safeSourceTypes);

  assert.equal(fixture.acceptedForPlanning, true);
  assert.deepEqual(fixture.unsupportedSourceTypes, []);

  for (const sourceType of fixture.acceptedSourceTypes) {
    assert.equal(safe.has(sourceType), true, `${sourceType} is not safe`);
  }
});

test('approval packet required fields cover action, evidence, policy, validation, and rollback', () => {
  for (const field of [
    'governedAction',
    'targetSurfaces',
    'sourceEvidence',
    'sourceType',
    'redactionPolicy',
    'lifecycleTransition',
    'auditEventFamily',
    'publicMcpImpact',
    'durableWriteSurfaces',
    'backupRequirement',
    'rollbackPath',
    'validationCommands',
    'stopConditions',
    'approvalScopeStatement'
  ]) {
    assert.ok(fixture.requiredPacketFields.includes(field), field);
  }
});

test('all governed actions remain blocked pending explicit approval', () => {
  assert.deepEqual(
    fixture.governedActions.map(action => action.id),
    REQUIRED_ACTION_IDS
  );

  for (const action of fixture.governedActions) {
    assert.equal(action.status, 'BLOCKED_PENDING_APPROVAL', action.id);
    assert.equal(action.requiresExplicitApproval, true, action.id);
    assert.equal(action.executionApproved, false, action.id);
    assert.ok(action.requiredFields.length >= 5, `${action.id} must define required fields`);
  }
});

test('proposal accept and reject remain non-mutating approval packet definitions', () => {
  const accept = actionById('proposal_accept');
  const reject = actionById('proposal_reject');

  assert.equal(accept.mutated, false);
  assert.equal(reject.mutated, false);
  assert.ok(accept.requiredFields.includes('rollbackPath'));
  assert.ok(reject.requiredFields.includes('reviewerIdentityPolicy'));
});

test('supersession and tombstone require explicit links and forbid hard delete', () => {
  const supersession = actionById('supersession_apply');
  const tombstone = actionById('tombstone_apply');

  assert.ok(supersession.requiredFields.includes('supersedesLink'));
  assert.ok(supersession.requiredFields.includes('supersededByLink'));
  assert.equal(supersession.mutated, false);
  assert.equal(tombstone.hardDeleteAllowed, false);
  assert.equal(tombstone.mutated, false);
});

test('real-memory preview, backup, and restore remain blocked and non-executed', () => {
  const preview = actionById('real_memory_governance_preview');
  const backup = actionById('backup_before_governance_apply');
  const restore = actionById('restore_after_governance_apply');

  assert.equal(preview.realMemoryScanned, false);
  assert.equal(backup.backupCreated, false);
  assert.equal(restore.restorePerformed, false);
  assert.equal(preview.executionApproved, false);
  assert.equal(backup.executionApproved, false);
  assert.equal(restore.executionApproved, false);
});

test('blockers preserve governance, schema, aggregator, matrix, and RC not-ready state', () => {
  for (const blocker of [
    'runtime_governance_integration_not_implemented',
    'durable_mutation_not_approved',
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
  assert.ok(fixture.requiredWording.some(line => line.includes('does not approve or execute')));
  assert.ok(fixture.requiredWording.some(line => line.includes('BLOCKED_PENDING_APPROVAL')));
  assert.ok(fixture.requiredWording.some(line => line.includes('validate_memory remains internal-only')));
  assert.ok(fixture.forbiddenClaims.includes('runtime governance integration is implemented'));
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
