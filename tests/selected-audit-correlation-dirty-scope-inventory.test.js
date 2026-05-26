'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  INVENTORY_CLASSES,
  bucketForPath,
  parseStatusLine,
  summarizeSelectedAuditCorrelationDirtyScopeInventory
} = require('../src/core/SelectedAuditCorrelationDirtyScopeInventory');

test('CM-1132 parses git status lines and buckets known selected-audit files', () => {
  assert.deepEqual(parseStatusLine('?? docs/CM1131_SELECTED_AUDIT_CORRELATION_PREREQUISITE_STAGE_GATE.md'), {
    raw: '?? docs/CM1131_SELECTED_AUDIT_CORRELATION_PREREQUISITE_STAGE_GATE.md',
    status: '??',
    path: 'docs/CM1131_SELECTED_AUDIT_CORRELATION_PREREQUISITE_STAGE_GATE.md'
  });
  assert.equal(bucketForPath('.agent_board/RUN_STATE.md'), 'agent_board');
  assert.equal(bucketForPath('STATUS.md'), 'status_surface');
  assert.equal(bucketForPath('docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md'), 'current_truth_table');
  assert.equal(bucketForPath('docs/CM1129_SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_DOWNGRADE_REVIEW_CLI.md'), 'cm_evidence_docs');
  assert.equal(bucketForPath('src/cli/selected-audit-correlation-current-facts-stage-gate.js'), 'selected_audit_correlation_cli');
  assert.equal(bucketForPath('src/core/SelectedAuditCorrelationPrerequisiteStageGate.js'), 'selected_audit_correlation_core');
  assert.equal(bucketForPath('tests/selected-audit-correlation-prerequisite-stage-gate.test.js'), 'selected_audit_correlation_tests');
  assert.equal(bucketForPath('src/storage/AuditLogStore.js'), 'audit_log_store_helper');
});

test('CM-1132 classifies all known CM evidence dirty scope as not clean and not authorized', () => {
  const inventory = summarizeSelectedAuditCorrelationDirtyScopeInventory({
    statusShort: [
      ' M .agent_board/RUN_STATE.md',
      ' M STATUS.md',
      ' M docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md',
      ' M src/storage/AuditLogStore.js',
      '?? docs/CM1131_SELECTED_AUDIT_CORRELATION_PREREQUISITE_STAGE_GATE.md',
      '?? src/cli/selected-audit-correlation-current-facts-stage-gate.js',
      '?? src/core/SelectedAuditCorrelationPrerequisiteStageGate.js',
      '?? tests/selected-audit-correlation-prerequisite-stage-gate.test.js'
    ].join('\n')
  });

  assert.equal(inventory.inventoryClass, INVENTORY_CLASSES.KNOWN_CM_EVIDENCE_SCOPE_DIRTY_NOT_CLEAN);
  assert.equal(inventory.worktreeClean, false);
  assert.equal(inventory.dirtyLineCount, 8);
  assert.equal(inventory.knownDirtyLineCount, 8);
  assert.equal(inventory.unknownDirtyLineCount, 0);
  assert.equal(inventory.commitAuthorized, false);
  assert.equal(inventory.cleanAuthorized, false);
  assert.equal(inventory.approvalRequestsAllowedNow, false);
  assert.equal(inventory.safety.readsFileContents, false);
});

test('CM-1132 fails closed when unknown dirty paths are present', () => {
  const inventory = summarizeSelectedAuditCorrelationDirtyScopeInventory({
    statusShort: [
      '?? random-note.txt',
      '?? src/core/SelectedAuditCorrelationPrerequisiteStageGate.js'
    ].join('\n')
  });

  assert.equal(inventory.inventoryClass, INVENTORY_CLASSES.UNKNOWN_DIRTY_SCOPE_FAIL_CLOSED);
  assert.equal(inventory.unknownDirtyLineCount, 1);
  assert.deepEqual(inventory.unknownEntries.map(entry => entry.path), ['random-note.txt']);
  assert.equal(inventory.commitAuthorized, false);
});

test('CM-1132 reports clean worktree but still does not authorize approval requests', () => {
  const inventory = summarizeSelectedAuditCorrelationDirtyScopeInventory({
    statusShort: ''
  });

  assert.equal(inventory.inventoryClass, INVENTORY_CLASSES.CLEAN_WORKTREE_NO_DIRTY_SCOPE);
  assert.equal(inventory.worktreeClean, true);
  assert.equal(inventory.dirtyLineCount, 0);
  assert.equal(inventory.approvalRequestsAllowedNow, false);
  assert.equal(inventory.readinessClaimAllowed, false);
  assert.equal(inventory.reliabilityClaimAllowed, false);
});

test('CM-1132 fails closed when no status input is supplied', () => {
  const inventory = summarizeSelectedAuditCorrelationDirtyScopeInventory();

  assert.equal(inventory.inventoryClass, INVENTORY_CLASSES.FAIL_CLOSED_STATUS_MISSING);
  assert.equal(inventory.worktreeClean, false);
  assert.equal(inventory.commitAuthorized, false);
});
