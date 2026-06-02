const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  REQUIRED_UNSAFE_STATUSES,
  summarizeGovernanceLifecycleReadPolicyIsolation
} = require('../src/core/GovernanceLifecycleReadPolicyIsolation');

const currentScope = {
  projectId: 'project-alpha',
  workspaceId: 'workspace-alpha',
  clientId: 'codex',
  taskId: 'task-alpha',
  conversationId: 'conversation-alpha',
  visibility: 'private',
  retentionPolicy: 'standard'
};

const requiredScopeFields = [
  'projectId',
  'workspaceId',
  'clientId',
  'taskId',
  'conversationId',
  'visibility',
  'retentionPolicy'
];

function candidate(memoryId, lifecycleStatus, extra = {}) {
  return {
    memoryId,
    lifecycleStatus,
    scope: currentScope,
    content: `raw ${lifecycleStatus} content must not leak`,
    snippet: `raw ${lifecycleStatus} snippet must not leak`,
    sourceFile: `raw/${lifecycleStatus}.jsonl`,
    ...extra
  };
}

test('CM-1395 accepts no-apply lifecycle read-policy isolation for unsafe states', () => {
  const summary = summarizeGovernanceLifecycleReadPolicyIsolation({
    sourceMode: 'explicit_input',
    currentScope,
    requiredScopeFields,
    candidates: [
      candidate('mem-active', 'active'),
      ...REQUIRED_UNSAFE_STATUSES.map(status => candidate(`mem-${status}`, status))
    ]
  });

  assert.equal(summary.acceptedForReadPolicyIsolation, true);
  assert.equal(summary.decision, 'NO_APPLY_LIFECYCLE_READ_POLICY_ISOLATION_ACCEPTED');
  assert.deepEqual(summary.acceptedStatuses, ['active']);
  assert.deepEqual(summary.missingUnsafeStatuses, []);
  assert.equal(summary.unsafeStatusAccepted, false);
  assert.equal(summary.rawSuppressedMetadataExposed, false);
  assert.equal(summary.durableMutationExecuted, false);
  assert.equal(summary.publicMcpExpanded, false);
  assert.equal(summary.readinessClaimed, false);
  assert.equal(summary.safety.noSideEffects, true);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.callsProviders, false);
  assert.equal(summary.safety.scansRealMemory, false);

  const serializedAudit = JSON.stringify(summary.sanitizedAuditMetadata);
  assert.match(serializedAudit, /mem-tombstoned/);
  assert.doesNotMatch(serializedAudit, /raw .* content|raw .* snippet|sourceFile|jsonl/);
});

test('CM-1395 fails closed when unsafe lifecycle status coverage is incomplete', () => {
  const summary = summarizeGovernanceLifecycleReadPolicyIsolation({
    sourceMode: 'explicit_input',
    currentScope,
    requiredScopeFields,
    candidates: [
      candidate('mem-active', 'active'),
      candidate('mem-tombstoned', 'tombstoned')
    ]
  });

  assert.equal(summary.acceptedForReadPolicyIsolation, false);
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
  assert.equal(summary.missingUnsafeStatuses.includes('proposal'), true);
  assert.equal(summary.blockers.blockingFindings.includes('unsafe_suppression_coverage_incomplete'), true);
  assert.equal(
    summary.blockers.blockingFindings.includes('unsafe_status_not_suppressed:proposal'),
    true
  );
});

test('CM-1395 fails closed when active control candidate is missing', () => {
  const summary = summarizeGovernanceLifecycleReadPolicyIsolation({
    sourceMode: 'explicit_input',
    currentScope,
    requiredScopeFields,
    candidates: REQUIRED_UNSAFE_STATUSES.map(status => candidate(`mem-${status}`, status))
  });

  assert.equal(summary.acceptedForReadPolicyIsolation, false);
  assert.equal(summary.acceptedCount, 0);
  assert.equal(summary.blockers.blockingFindings.includes('active_control_candidate_missing'), true);
});
