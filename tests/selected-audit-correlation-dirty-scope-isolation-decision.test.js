'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  INVENTORY_CLASSES,
  summarizeSelectedAuditCorrelationDirtyScopeInventory
} = require('../src/core/SelectedAuditCorrelationDirtyScopeInventory');
const {
  DECISION_CLASSES,
  buildReviewBundles,
  summarizeSelectedAuditCorrelationDirtyScopeIsolationDecision
} = require('../src/core/SelectedAuditCorrelationDirtyScopeIsolationDecision');

function knownInventoryReport() {
  const inventory = summarizeSelectedAuditCorrelationDirtyScopeInventory({
    statusShort: [
      ' M .agent_board/RUN_STATE.md',
      ' M STATUS.md',
      ' M docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md',
      ' M src/storage/AuditLogStore.js',
      '?? docs/CM0825_PATCHED_TRUE_LIVE_RECALL_PROOF_EXECUTION.md',
      '?? docs/CM1105_MEMORY_WRITE_RELIABILITY_ACTUAL_EVIDENCE_REVIEW.md',
      '?? docs/CM1118_SELECTED_AUDIT_CORRELATION_READER_TEMP_FIXTURE_EVIDENCE.md',
      '?? docs/CM1132_SELECTED_AUDIT_CORRELATION_DIRTY_SCOPE_INVENTORY.md',
      '?? src/cli/selected-audit-correlation-dirty-scope-inventory.js',
      '?? src/core/SelectedAuditCorrelationDirtyScopeInventory.js',
      '?? tests/selected-audit-correlation-dirty-scope-inventory.test.js'
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
    reliabilityClaimAllowed: false
  };
}

test('CM-1133 builds review bundles for known dirty scope without authorizing mutation', () => {
  const report = knownInventoryReport();
  const decision = summarizeSelectedAuditCorrelationDirtyScopeIsolationDecision(report);

  assert.equal(decision.decisionClass, DECISION_CLASSES.KNOWN_DIRTY_SCOPE_HUMAN_REVIEW_REQUIRED_NOT_MUTATED);
  assert.equal(decision.humanReviewRequired, true);
  assert.equal(decision.commitDecisionPrepared, true);
  assert.equal(decision.commitAuthorized, false);
  assert.equal(decision.cleanAuthorized, false);
  assert.equal(decision.approvalRequestsAllowedNow, false);
  assert.equal(decision.readinessClaimAllowed, false);
  assert.equal(decision.reliabilityClaimAllowed, false);
  assert.ok(decision.reviewBundles.find(bundle => bundle.name === 'selected_audit_correlation_chain').pathCount > 0);
});

test('CM-1133 review bundles separate operator surfaces, recall docs, write docs, selected-audit chain, and helper', () => {
  const bundles = buildReviewBundles(knownInventoryReport().inventory);
  const byName = Object.fromEntries(bundles.map(bundle => [bundle.name, bundle]));

  assert.deepEqual(byName.operator_status_surfaces.paths, [
    '.agent_board/RUN_STATE.md',
    'STATUS.md',
    'docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md'
  ]);
  assert.deepEqual(byName.recall_proof_review_docs.paths, [
    'docs/CM0825_PATCHED_TRUE_LIVE_RECALL_PROOF_EXECUTION.md'
  ]);
  assert.deepEqual(byName.write_governance_review_docs.paths, [
    'docs/CM1105_MEMORY_WRITE_RELIABILITY_ACTUAL_EVIDENCE_REVIEW.md'
  ]);
  assert.ok(byName.selected_audit_correlation_chain.paths.includes('docs/CM1118_SELECTED_AUDIT_CORRELATION_READER_TEMP_FIXTURE_EVIDENCE.md'));
  assert.ok(byName.audit_log_store_helper.paths.includes('src/storage/AuditLogStore.js'));
});

test('CM-1133 maps clean inventory to rerun-stage-gate only, not approval', () => {
  const inventory = summarizeSelectedAuditCorrelationDirtyScopeInventory({
    statusShort: ''
  });
  const decision = summarizeSelectedAuditCorrelationDirtyScopeIsolationDecision({
    inventoryClass: INVENTORY_CLASSES.CLEAN_WORKTREE_NO_DIRTY_SCOPE,
    inventory
  });

  assert.equal(decision.decisionClass, DECISION_CLASSES.CLEAN_SCOPE_RERUN_STAGE_GATE_NOT_APPROVAL);
  assert.equal(decision.worktreeClean, true);
  assert.equal(decision.approvalRequestsAllowedNow, false);
  assert.equal(decision.commitAuthorized, false);
});

test('CM-1133 maps unknown dirty inventory to blocked review', () => {
  const inventory = summarizeSelectedAuditCorrelationDirtyScopeInventory({
    statusShort: '?? scratch.txt\n'
  });
  const decision = summarizeSelectedAuditCorrelationDirtyScopeIsolationDecision({
    inventoryClass: inventory.inventoryClass,
    inventory
  });

  assert.equal(decision.decisionClass, DECISION_CLASSES.UNKNOWN_DIRTY_SCOPE_BLOCKED_NOT_MUTATED);
  assert.equal(decision.humanReviewRequired, true);
  assert.deepEqual(decision.unknownPaths, ['scratch.txt']);
  assert.equal(decision.commitAuthorized, false);
});

test('CM-1133 fails closed on missing inventory or mutation/overclaim signal', () => {
  const missing = summarizeSelectedAuditCorrelationDirtyScopeIsolationDecision(null);
  assert.equal(missing.decisionClass, DECISION_CLASSES.FAIL_CLOSED_INVENTORY_MISSING);

  const mutation = summarizeSelectedAuditCorrelationDirtyScopeIsolationDecision({
    ...knownInventoryReport(),
    commitAuthorized: true
  });
  assert.equal(mutation.decisionClass, DECISION_CLASSES.FAIL_CLOSED_OVERCLAIM_OR_MUTATION_SIGNAL);

  const unsupported = summarizeSelectedAuditCorrelationDirtyScopeIsolationDecision({
    inventoryClass: 'UNSUPPORTED_INVENTORY',
    inventory: {
      inventoryClass: 'UNSUPPORTED_INVENTORY'
    }
  });
  assert.equal(unsupported.decisionClass, DECISION_CLASSES.FAIL_CLOSED_UNSUPPORTED_INVENTORY_CLASS);
});
