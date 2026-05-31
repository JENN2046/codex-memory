const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
  evaluateGovernanceTransition,
  evaluateRecallEligibility
} = require('../src/core/MemoryLifecycleScopeGovernanceContract');

const exactScope = Object.freeze({
  userId: 'synthetic-user',
  projectId: 'codex-memory',
  workspaceId: 'synthetic-governance-workspace',
  clientId: 'codex',
  agentId: 'codex-agent',
  taskId: 'CM-0844',
  conversationId: 'synthetic-lifecycle-governance',
  folder: 'alpha',
  visibility: 'project',
  retentionPolicy: 'keep'
});

function record(overrides = {}) {
  return {
    memoryId: 'synthetic-memory-active',
    lifecycleStatus: 'active',
    scope: exactScope,
    ...overrides
  };
}

function approvedTransition(overrides = {}) {
  return {
    action: 'tombstone',
    exactApproval: true,
    targetMemoryId: 'synthetic-memory-active',
    reason: 'synthetic governance fixture correction',
    actorId: 'synthetic-reviewer',
    approvedAt: '2026-05-23T00:00:00.000Z',
    scope: exactScope,
    ...overrides
  };
}

test('CM-0844 includes active exact-scope records in normal recall fixture output', () => {
  const result = evaluateRecallEligibility(record(), exactScope);

  assert.equal(result.schemaVersion, 'memory-lifecycle-scope-governance-contract-v1');
  assert.equal(result.sourceMode, 'explicit_fixture_input');
  assert.equal(result.decision, 'included_for_normal_recall');
  assert.equal(result.normalRecallEligible, true);
  assert.deepEqual(result.blockers, []);
  assert.deepEqual(result.scopeMismatches, []);
  assert.equal(result.safety.readsFiles, false);
  assert.equal(result.safety.scansRealMemory, false);
  assert.equal(result.safety.readsJsonl, false);
  assert.equal(result.safety.callsProviders, false);
  assert.equal(result.safety.writesDurableMemory, false);
  assert.equal(result.safety.writesAudit, false);
  assert.equal(result.safety.expandsPublicMcp, false);
  assert.equal(result.safety.readinessClaimed, false);
});

test('CM-0844 excludes proposal rejected preflight and terminal lifecycle states from normal recall', () => {
  const statuses = [
    'proposal',
    'rejected',
    'preflight_rejected',
    'superseded',
    'tombstoned',
    'forgotten',
    'excluded',
    'stale',
    'quarantined'
  ];

  for (const lifecycleStatus of statuses) {
    const result = evaluateRecallEligibility(record({ lifecycleStatus }), exactScope);

    assert.equal(result.normalRecallEligible, false);
    assert.equal(result.decision, 'excluded_from_normal_recall');
    assert.ok(
      result.blockers.includes(`lifecycle_${lifecycleStatus}_excluded_from_normal_recall`),
      lifecycleStatus
    );
  }
});

test('CM-0844 excludes out-of-scope records and reports exact scope mismatches', () => {
  const result = evaluateRecallEligibility(record({
    scope: {
      ...exactScope,
      projectId: 'other-project',
      agentId: 'other-agent',
      folder: 'beta'
    }
  }), exactScope);

  assert.equal(result.normalRecallEligible, false);
  assert.ok(result.blockers.includes('scope_mismatch_excluded'));
  assert.deepEqual(result.scopeMismatches, ['projectId', 'agentId', 'folder']);
});

test('CM-0844 normalizes blank camel-case scope fields from snake-case fallbacks', () => {
  const result = evaluateRecallEligibility(record({
    scope: {
      userId: '   ',
      user_id: exactScope.userId,
      projectId: '   ',
      project_id: exactScope.projectId,
      workspaceId: '   ',
      workspace_id: exactScope.workspaceId,
      clientId: '   ',
      client_id: exactScope.clientId,
      agentId: '   ',
      agent_id: exactScope.agentId,
      taskId: '   ',
      task_id: exactScope.taskId,
      conversationId: '   ',
      conversation_id: exactScope.conversationId,
      folder: exactScope.folder,
      visibility: exactScope.visibility,
      retentionPolicy: '   ',
      retention_policy: exactScope.retentionPolicy
    }
  }), {
    userId: '   ',
    user_id: exactScope.userId,
    projectId: '   ',
    project_id: exactScope.projectId,
    workspaceId: '   ',
    workspace_id: exactScope.workspaceId,
    clientId: '   ',
    client_id: exactScope.clientId,
    agentId: '   ',
    agent_id: exactScope.agentId,
    taskId: '   ',
    task_id: exactScope.taskId,
    conversationId: '   ',
    conversation_id: exactScope.conversationId,
    folder: exactScope.folder,
    visibility: exactScope.visibility,
    retentionPolicy: '   ',
    retention_policy: exactScope.retentionPolicy
  });

  assert.equal(result.normalRecallEligible, true);
  assert.deepEqual(result.blockers, []);
  assert.deepEqual(result.scopeMismatches, []);
});

test('CM-0844 normalizes blank camel-case lifecycle ids from snake-case fallbacks', () => {
  const result = evaluateRecallEligibility(record({
    memoryId: '   ',
    memory_id: 'synthetic-memory-snake',
    lifecycleStatus: '   ',
    lifecycle_status: 'tombstoned'
  }), exactScope);

  assert.equal(result.memoryId, 'synthetic-memory-snake');
  assert.equal(result.lifecycleStatus, 'tombstoned');
  assert.equal(result.normalRecallEligible, false);
  assert.ok(result.blockers.includes('lifecycle_tombstoned_excluded_from_normal_recall'));
  assert.equal(result.blockers.includes('memory_id_required'), false);
});

test('CM-0844 fails closed when current scope or record metadata is malformed', () => {
  const incompleteScope = {
    ...exactScope,
    taskId: ''
  };
  const result = evaluateRecallEligibility(record({
    malformedLifecycle: true,
    malformedScope: true,
    unresolvedRemediation: true
  }), incompleteScope);

  assert.equal(result.normalRecallEligible, false);
  assert.ok(result.blockers.includes('current_scope_incomplete_fail_closed'));
  assert.ok(result.blockers.includes('malformed_lifecycle_metadata_excluded'));
  assert.ok(result.blockers.includes('malformed_scope_metadata_excluded'));
  assert.ok(result.blockers.includes('unresolved_bad_write_remediation_excluded'));
});

test('CM-0844 requires exact approval and full receipt fields for governance transitions', () => {
  const result = evaluateGovernanceTransition({
    action: 'tombstone',
    targetMemoryId: 'synthetic-memory-active',
    scope: exactScope
  });

  assert.equal(result.acceptedForGovernanceFixture, false);
  assert.equal(result.decision, 'rejected_by_lifecycle_scope_governance_contract');
  assert.ok(result.blockers.includes('governance_action_requires_exact_approval'));
  assert.ok(result.blockers.includes('reason_required'));
  assert.ok(result.blockers.includes('actor_id_required'));
  assert.ok(result.blockers.includes('approved_at_required'));
  assert.equal(result.durableMutationExecuted, false);
});

test('CM-0844 accepts append-only governance transition fixtures with exact scope', () => {
  const result = evaluateGovernanceTransition(approvedTransition());

  assert.equal(result.acceptedForGovernanceFixture, true);
  assert.equal(result.decision, 'accepted_for_append_only_governance_fixture');
  assert.equal(result.appendOnly, true);
  assert.equal(result.destructiveCleanupAllowed, false);
  assert.equal(result.durableMutationExecuted, false);
  assert.deepEqual(result.blockers, []);
});

test('CM-0844 governance transition falls through blank camel-case ids to snake-case fields', () => {
  const result = evaluateGovernanceTransition(approvedTransition({
    action: 'supersede',
    targetMemoryId: '   ',
    target_memory_id: 'synthetic-memory-active',
    replacementMemoryId: '',
    replacement_memory_id: 'synthetic-memory-replacement',
    actorId: '   ',
    actor_id: 'synthetic-reviewer'
  }));

  assert.equal(result.acceptedForGovernanceFixture, true);
  assert.equal(result.targetMemoryId, 'synthetic-memory-active');
  assert.deepEqual(result.blockers, []);
});

test('CM-0844 requires replacement memory id for supersession fixtures', () => {
  const rejected = evaluateGovernanceTransition(approvedTransition({
    action: 'supersede'
  }));
  const accepted = evaluateGovernanceTransition(approvedTransition({
    action: 'supersede',
    replacementMemoryId: 'synthetic-memory-replacement'
  }));

  assert.equal(rejected.acceptedForGovernanceFixture, false);
  assert.ok(rejected.blockers.includes('replacement_memory_id_required_for_supersession'));
  assert.equal(accepted.acceptedForGovernanceFixture, true);
});

test('CM-0844 helper does not perform filesystem reads or side effects', () => {
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = () => {
    throw new Error('unexpected fs read during lifecycle scope governance contract');
  };

  try {
    const recallResult = evaluateRecallEligibility(record(), exactScope);
    const transitionResult = evaluateGovernanceTransition(approvedTransition({
      action: 'forget'
    }));

    assert.equal(recallResult.normalRecallEligible, true);
    assert.equal(transitionResult.acceptedForGovernanceFixture, true);
    assert.equal(recallResult.safety.writesDurableMemory, false);
    assert.equal(transitionResult.safety.writesAudit, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
});
