'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DECISION_CLASSES
} = require('../src/core/SelectedAuditCorrelationDirtyScopeIsolationDecision');
const {
  buildReport,
  main,
  parseArgs
} = require('../src/cli/selected-audit-correlation-dirty-scope-isolation-decision');

function gitRunnerWithStatus(stdout) {
  return args => {
    assert.deepEqual(args, ['status', '--short']);
    return {
      status: 0,
      stdout,
      stderr: '',
      error: ''
    };
  };
}

test('CM-1133 CLI builds human-review isolation decision for known dirty scope', () => {
  const report = buildReport({}, {
    gitRunner: gitRunnerWithStatus([
      ' M .agent_board/RUN_STATE.md',
      ' M STATUS.md',
      '?? docs/CM1132_SELECTED_AUDIT_CORRELATION_DIRTY_SCOPE_INVENTORY.md',
      '?? src/core/SelectedAuditCorrelationDirtyScopeInventory.js',
      '?? tests/selected-audit-correlation-dirty-scope-inventory.test.js'
    ].join('\n'))
  });

  assert.equal(report.status, 'blocked');
  assert.equal(report.inventoryExecuted, true);
  assert.equal(report.isolationDecisionExecuted, true);
  assert.equal(report.decisionClass, DECISION_CLASSES.KNOWN_DIRTY_SCOPE_HUMAN_REVIEW_REQUIRED_NOT_MUTATED);
  assert.equal(report.humanReviewRequired, true);
  assert.equal(report.commitDecisionPrepared, true);
  assert.equal(report.commitAuthorized, false);
  assert.equal(report.cleanAuthorized, false);
  assert.equal(report.approvalRequestsAllowedNow, false);
  assert.equal(report.safety.readsFileContents, false);
});

test('CM-1133 CLI rejects mutation-looking flags before Git collection', () => {
  const options = parseArgs(['--json', '--clean']);
  const report = buildReport(options, {
    gitRunner: () => {
      throw new Error('git should not run after rejected mutation flag');
    }
  });

  assert.equal(report.status, 'error');
  assert.equal(
    report.decision,
    'SELECTED_AUDIT_CORRELATION_DIRTY_SCOPE_ISOLATION_DECISION_REJECTED_MUTATION_FLAG'
  );
  assert.equal(report.rejectedFlag, '--clean');
  assert.equal(report.currentFactsCollected, false);
  assert.equal(report.commitAuthorized, false);
});

test('CM-1133 CLI help and text output remain no-mutation', () => {
  const writes = [];
  const originalWrite = process.stdout.write;
  process.stdout.write = chunk => {
    writes.push(String(chunk));
    return true;
  };
  try {
    assert.equal(main(['--help']), 0);
    assert.match(writes.join(''), /selected-audit-correlation-dirty-scope-isolation-decision/);
    writes.length = 0;
    assert.equal(main(['--commit']), 1);
    assert.match(writes.join(''), /SELECTED_AUDIT_CORRELATION_DIRTY_SCOPE_ISOLATION_DECISION_REJECTED_MUTATION_FLAG/);
  } finally {
    process.stdout.write = originalWrite;
  }
});
