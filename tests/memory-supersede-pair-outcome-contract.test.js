const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  summarizeMemorySupersedePairOutcomeContract
} = require('../src/core/MemorySupersedePairOutcomeContract');

const fixturePath = path.join(__dirname, 'fixtures', 'memory-supersede-pair-outcome-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const PUBLIC_MCP_TOOLS = [
  'record_memory',
  'search_memory',
  'memory_overview'
];

test('CM-0879 pair-outcome fixture locks top-level blocked state', () => {
  assert.equal(fixture.schemaVersion, 'memory-supersede-pair-outcome-v1');
  assert.equal(fixture.version, 'v1');
  assert.equal(fixture.phase, 'CM-0879-memory-supersede-pair-outcome-contract');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.reviewOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.approvalStatus, 'BLOCKED_PENDING_APPROVAL');
});

test('CM-0879 fixture declares no execution, mutation, runtime, or durable audit write', () => {
  assert.equal(fixture.executionApproved, false);
  assert.equal(fixture.mutated, false);
  assert.equal(fixture.runtimeIntegrated, false);
  assert.equal(fixture.durableAuditWritten, false);
  assert.equal(fixture.publicMcpExpanded, false);
  assert.equal(fixture.realMemoryScanned, false);
  assert.equal(fixture.providerCalls, 0);
});

test('public MCP tools remain frozen and accepted source types stay whitelisted', () => {
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.publicTools, PUBLIC_MCP_TOOLS);
  assert.equal(fixture.acceptedForPlanning, true);
  assert.deepEqual(fixture.unsupportedSourceTypes, []);
  assert.deepEqual(fixture.safeSourceTypes, fixture.acceptedSourceTypes);
});

test('required pair-outcome fields lock correlation, snapshots, transitions, and links', () => {
  for (const field of [
    'intentEventId',
    'committedEventId',
    'cancelledEventId',
    'pairCorrelationId',
    'oldPreviousSnapshotRef',
    'newPreviousSnapshotRef',
    'oldFromStatus',
    'oldToStatus',
    'newFromStatus',
    'newToStatus',
    'supersededByLink',
    'supersedesLink'
  ]) {
    assert.ok(fixture.requiredPairOutcomeFields.includes(field), field);
  }
});

test('required event phases and outcome properties stay pair-shaped and blocked', () => {
  assert.deepEqual(fixture.requiredEventPhases, [
    'pending',
    'committed',
    'cancelled'
  ]);
  assert.equal(fixture.outcomeProperties.pairIntentRequired, true);
  assert.equal(fixture.outcomeProperties.pairCommittedFollowUpRequired, true);
  assert.equal(fixture.outcomeProperties.pairCancelledFollowUpRequired, true);
  assert.equal(fixture.outcomeProperties.sharedCorrelationIdRequired, true);
  assert.equal(fixture.outcomeProperties.dualPreviousSnapshotRefsRequired, true);
  assert.equal(fixture.outcomeProperties.dualLifecycleTransitionsRequired, true);
  assert.equal(fixture.outcomeProperties.bidirectionalLinkFieldsRequired, true);
  assert.equal(fixture.outcomeProperties.pairAtomicityRequired, true);
  assert.equal(fixture.outcomeProperties.singleRecordAuditReuseAllowed, false);
  assert.equal(fixture.outcomeProperties.runtimeImplemented, false);
  assert.equal(fixture.outcomeProperties.executionApproved, false);
  assert.equal(fixture.outcomeProperties.durableAuditWritten, false);
  assert.equal(fixture.outcomeProperties.mutated, false);
});

test('blockers and approvals preserve pair-outcome and audit-correlation gaps', () => {
  for (const blocker of [
    'supersede_pair_outcome_helper_not_implemented',
    'supersede_audit_correlation_helper_not_implemented',
    'supersede_runtime_prep_not_implemented',
    'internal_supersede_service_not_implemented',
    'durable_audit_write_not_approved',
    'public_mcp_governance_expansion_not_approved',
    'v1_rc_not_ready_blocked'
  ]) {
    assert.ok(fixture.blockers.includes(blocker), blocker);
  }
  for (const approval of [
    'supersede_pair_outcome_helper_implementation',
    'supersede_audit_correlation_helper_implementation',
    'supersession_runtime_prep',
    'internal_supersede_service_apply',
    'durable_audit_write',
    'public_mcp_governance_expansion',
    'push_tag_release_deploy'
  ]) {
    assert.ok(fixture.requiredApprovals.includes(approval), approval);
  }
});

test('safety flags preserve no side effects and no sensitive output', () => {
  assert.equal(fixture.safety.noRuntimeImplementation, true);
  assert.equal(fixture.safety.noDurableAuditWrite, true);
  assert.equal(fixture.safety.noDurableMemoryWrite, true);
  assert.equal(fixture.safety.noPublicMcpExpansion, true);
  assert.equal(fixture.safety.noRealMemoryScan, true);
  assert.equal(fixture.safety.noProviderCall, true);
  assert.equal(fixture.safety.noServiceStart, true);
  assert.equal(fixture.safety.noConfigMutation, true);
  assert.equal(fixture.safety.noPackageScriptChange, true);
  assert.equal(fixture.safety.noRemoteWrite, true);
  assert.equal(fixture.safety.rawSecretExposed, false);
  assert.equal(fixture.safety.rawWorkspaceIdExposed, false);
});

test('required wording and forbidden claims prevent readiness overclaim', () => {
  assert.ok(fixture.requiredWording.some(line => line.includes('does not implement pair-outcome audit follow-up')));
  assert.ok(fixture.requiredWording.some(line => line.includes('shared correlation id')));
  assert.ok(fixture.requiredWording.some(line => line.includes('BLOCKED_PENDING_APPROVAL')));
  assert.ok(fixture.requiredWording.some(line => line.includes('Public MCP tools remain frozen')));
  assert.ok(fixture.forbiddenClaims.includes('supersede pair-outcome audit helper is implemented'));
  assert.ok(fixture.forbiddenClaims.includes('single-record audit reuse is sufficient for supersede'));
  assert.ok(fixture.forbiddenClaims.includes('v1.0 RC readiness is unblocked'));
});

test('helper summary accepts the fixture as a blocked contract helper surface', () => {
  const summary = summarizeMemorySupersedePairOutcomeContract(fixture);

  assert.equal(summary.acceptedForContractHelper, true);
  assert.equal(summary.schemaVersionSafe, true);
  assert.equal(summary.requiredPairOutcomeFieldsExact, true);
  assert.equal(summary.requiredEventPhasesExact, true);
  assert.equal(summary.outcomePropertiesBlocked, true);
  assert.equal(summary.publicMcpFrozen, true);
  assert.equal(summary.safetyFlagsClear, true);
  assert.equal(summary.decisionBlocked, true);
  assert.equal(summary.claimsBlocked, true);
  assert.equal(summary.next, 'CM-0879-memory-supersede-pair-outcome-helper');
});
