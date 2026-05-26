'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  summarizeSelectedAuditCorrelationDirtyScopeInventory
} = require('../src/core/SelectedAuditCorrelationDirtyScopeInventory');
const {
  PREFLIGHT_CLASSES,
  REQUIRED_CM1142_APPROVAL_LINE,
  REQUIRED_APPROVAL_LINE,
  REQUIRED_BRANCH,
  REQUIRED_HEAD,
  evaluateSelectedAuditCorrelationLocalCommitIsolationPreflight
} = require('../src/core/SelectedAuditCorrelationLocalCommitIsolationPreflight');

function knownInventoryReport(overrides = {}) {
  const inventory = summarizeSelectedAuditCorrelationDirtyScopeInventory({
    statusShort: [
      ' M .agent_board/RUN_STATE.md',
      ' M STATUS.md',
      '?? docs/CM1135_DIRTY_SCOPE_LOCAL_COMMIT_ISOLATION_APPROVAL_PACKET.md'
    ].join('\n')
  });
  return {
    status: 'blocked',
    inventoryClass: inventory.inventoryClass,
    inventory,
    commitAuthorized: false,
    cleanAuthorized: false,
    approvalRequestsAllowedNow: false,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    ...overrides
  };
}

test('CM-1136 blocks when exact approval line is missing', () => {
  const result = evaluateSelectedAuditCorrelationLocalCommitIsolationPreflight({
    currentBranch: REQUIRED_BRANCH,
    currentHead: REQUIRED_HEAD,
    inventoryReport: knownInventoryReport()
  });

  assert.equal(result.preflightClass, PREFLIGHT_CLASSES.BLOCKED_APPROVAL_MISSING);
  assert.equal(result.localCommitExecutionAllowedNow, false);
  assert.equal(result.commitAuthorized, false);
});

test('CM-1136 accepts exact approval for separate local commit execution but does not commit', () => {
  const result = evaluateSelectedAuditCorrelationLocalCommitIsolationPreflight({
    approvalLine: REQUIRED_APPROVAL_LINE,
    currentBranch: REQUIRED_BRANCH,
    currentHead: REQUIRED_HEAD,
    inventoryReport: knownInventoryReport()
  });

  assert.equal(
    result.preflightClass,
    PREFLIGHT_CLASSES.ACCEPTED_FOR_SEPARATE_LOCAL_COMMIT_EXECUTION_NOT_EXECUTED
  );
  assert.equal(result.status, 'accepted_not_executed');
  assert.equal(result.approvalLineAccepted, true);
  assert.equal(result.branchMatched, true);
  assert.equal(result.headMatched, true);
  assert.equal(result.localCommitExecutionAllowedNow, true);
  assert.equal(result.commitAuthorized, false);
  assert.equal(result.cleanAuthorized, false);
  assert.equal(result.pushAuthorized, false);
  assert.equal(result.safety.commits, false);
});

test('CM-1142 accepts fresh exact approval for current expanded scope but does not commit', () => {
  const expandedInventory = summarizeSelectedAuditCorrelationDirtyScopeInventory({
    statusShort: [
      ' M .agent_board/RUN_STATE.md',
      ' M STATUS.md',
      '?? docs/CM1135_DIRTY_SCOPE_LOCAL_COMMIT_ISOLATION_APPROVAL_PACKET.md',
      '?? docs/CM1141_STALE_LOCAL_COMMIT_APPROVAL_SCOPE_GUARD.md',
      '?? docs/CM1142_EXPANDED_DIRTY_SCOPE_LOCAL_COMMIT_ISOLATION_APPROVAL_PACKET.md',
      '?? src/core/SelectedAuditCorrelationLocalCommitIsolationPreflight.js',
      '?? tests/selected-audit-correlation-local-commit-isolation-preflight.test.js'
    ].join('\n')
  });
  const result = evaluateSelectedAuditCorrelationLocalCommitIsolationPreflight({
    approvalLine: REQUIRED_CM1142_APPROVAL_LINE,
    currentBranch: REQUIRED_BRANCH,
    currentHead: REQUIRED_HEAD,
    inventoryReport: {
      inventoryClass: expandedInventory.inventoryClass,
      inventory: expandedInventory
    }
  });

  assert.equal(
    result.preflightClass,
    PREFLIGHT_CLASSES.ACCEPTED_FOR_SEPARATE_LOCAL_COMMIT_EXECUTION_NOT_EXECUTED
  );
  assert.equal(result.approvalPacketId, 'CM-1142');
  assert.equal(result.status, 'accepted_not_executed');
  assert.equal(result.localCommitExecutionAllowedNow, true);
  assert.equal(result.commitAuthorized, false);
  assert.equal(result.pushAuthorized, false);
});

test('CM-1136 blocks head mismatch and unknown dirty scope', () => {
  const headMismatch = evaluateSelectedAuditCorrelationLocalCommitIsolationPreflight({
    approvalLine: REQUIRED_APPROVAL_LINE,
    currentBranch: REQUIRED_BRANCH,
    currentHead: '0000000000000000000000000000000000000000',
    inventoryReport: knownInventoryReport()
  });
  assert.equal(headMismatch.preflightClass, PREFLIGHT_CLASSES.BLOCKED_HEAD_MISMATCH);

  const unknownInventory = summarizeSelectedAuditCorrelationDirtyScopeInventory({
    statusShort: '?? scratch.txt\n'
  });
  const unknown = evaluateSelectedAuditCorrelationLocalCommitIsolationPreflight({
    approvalLine: REQUIRED_APPROVAL_LINE,
    currentBranch: REQUIRED_BRANCH,
    currentHead: REQUIRED_HEAD,
    inventoryReport: {
      inventoryClass: unknownInventory.inventoryClass,
      inventory: unknownInventory
    }
  });
  assert.equal(unknown.preflightClass, PREFLIGHT_CLASSES.BLOCKED_UNKNOWN_DIRTY_SCOPE);
});

test('CM-1142 blocks fresh approval after post-packet dirty scope expansion', () => {
  const expandedInventory = summarizeSelectedAuditCorrelationDirtyScopeInventory({
    statusShort: [
      ' M .agent_board/RUN_STATE.md',
      ' M STATUS.md',
      '?? docs/CM1142_EXPANDED_DIRTY_SCOPE_LOCAL_COMMIT_ISOLATION_APPROVAL_PACKET.md',
      '?? docs/CM1143_FUTURE_DIRTY_SCOPE_EXPANSION.md'
    ].join('\n')
  });
  const result = evaluateSelectedAuditCorrelationLocalCommitIsolationPreflight({
    approvalLine: REQUIRED_CM1142_APPROVAL_LINE,
    currentBranch: REQUIRED_BRANCH,
    currentHead: REQUIRED_HEAD,
    inventoryReport: {
      inventoryClass: expandedInventory.inventoryClass,
      inventory: expandedInventory
    }
  });

  assert.equal(
    result.preflightClass,
    PREFLIGHT_CLASSES.BLOCKED_APPROVAL_PACKET_STALE_DIRTY_SCOPE_EXPANDED
  );
  assert.equal(result.approvalPacketId, 'CM-1142');
  assert.equal(result.localCommitExecutionAllowedNow, false);
  assert.deepEqual(result.approvalScopeExpansionPaths, [
    'docs/CM1143_FUTURE_DIRTY_SCOPE_EXPANSION.md'
  ]);
});

test('CM-1136 blocks stale CM-1135 approval when dirty scope expanded after packet', () => {
  const expandedInventory = summarizeSelectedAuditCorrelationDirtyScopeInventory({
    statusShort: [
      ' M .agent_board/RUN_STATE.md',
      ' M STATUS.md',
      '?? docs/CM1135_DIRTY_SCOPE_LOCAL_COMMIT_ISOLATION_APPROVAL_PACKET.md',
      '?? docs/CM1140_PREREQUISITE_RESOLUTION_SEQUENCE.md',
      '?? src/core/SelectedAuditCorrelationPrerequisiteResolutionSequence.js'
    ].join('\n')
  });
  const result = evaluateSelectedAuditCorrelationLocalCommitIsolationPreflight({
    approvalLine: REQUIRED_APPROVAL_LINE,
    currentBranch: REQUIRED_BRANCH,
    currentHead: REQUIRED_HEAD,
    inventoryReport: {
      inventoryClass: expandedInventory.inventoryClass,
      inventory: expandedInventory
    }
  });

  assert.equal(
    result.preflightClass,
    PREFLIGHT_CLASSES.BLOCKED_APPROVAL_PACKET_STALE_DIRTY_SCOPE_EXPANDED
  );
  assert.equal(result.approvalLineAccepted, true);
  assert.equal(result.localCommitExecutionAllowedNow, false);
  assert.deepEqual(result.approvalScopeExpansionPaths, [
    'docs/CM1140_PREREQUISITE_RESOLUTION_SEQUENCE.md',
    'src/core/SelectedAuditCorrelationPrerequisiteResolutionSequence.js'
  ]);
});

test('CM-1136 fails closed on mutation or overclaim signals', () => {
  const result = evaluateSelectedAuditCorrelationLocalCommitIsolationPreflight({
    approvalLine: REQUIRED_APPROVAL_LINE,
    currentBranch: REQUIRED_BRANCH,
    currentHead: REQUIRED_HEAD,
    inventoryReport: knownInventoryReport({
      commitAuthorized: true
    })
  });

  assert.equal(result.preflightClass, PREFLIGHT_CLASSES.FAIL_CLOSED_OVERCLAIM_OR_MUTATION_SIGNAL);
  assert.equal(result.localCommitExecutionAllowedNow, false);
});
