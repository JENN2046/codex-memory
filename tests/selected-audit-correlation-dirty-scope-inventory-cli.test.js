'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  INVENTORY_CLASSES
} = require('../src/core/SelectedAuditCorrelationDirtyScopeInventory');
const {
  buildReport,
  main,
  parseArgs
} = require('../src/cli/selected-audit-correlation-dirty-scope-inventory');

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

test('CM-1132 CLI classifies known dirty scope without mutation authority', () => {
  const report = buildReport({}, {
    gitRunner: gitRunnerWithStatus([
      ' M .agent_board/RUN_STATE.md',
      ' M STATUS.md',
      '?? docs/CM1131_SELECTED_AUDIT_CORRELATION_PREREQUISITE_STAGE_GATE.md',
      '?? src/core/SelectedAuditCorrelationPrerequisiteStageGate.js',
      '?? tests/selected-audit-correlation-prerequisite-stage-gate.test.js'
    ].join('\n'))
  });

  assert.equal(report.status, 'blocked');
  assert.equal(report.currentFactsCollected, true);
  assert.equal(report.inventoryExecuted, true);
  assert.equal(report.inventoryClass, INVENTORY_CLASSES.KNOWN_CM_EVIDENCE_SCOPE_DIRTY_NOT_CLEAN);
  assert.equal(report.dirtyLineCount, 5);
  assert.equal(report.unknownDirtyLineCount, 0);
  assert.equal(report.commitAuthorized, false);
  assert.equal(report.cleanAuthorized, false);
  assert.equal(report.approvalRequestsAllowedNow, false);
  assert.equal(report.safety.readsFileContents, false);
});

test('CM-1132 CLI reports unknown dirty scope fail-closed', () => {
  const report = buildReport({}, {
    gitRunner: gitRunnerWithStatus('?? scratch.txt\n')
  });

  assert.equal(report.inventoryClass, INVENTORY_CLASSES.UNKNOWN_DIRTY_SCOPE_FAIL_CLOSED);
  assert.equal(report.unknownDirtyLineCount, 1);
  assert.equal(report.unknownEntries[0].path, 'scratch.txt');
  assert.equal(report.commitAuthorized, false);
});

test('CM-1132 CLI rejects mutation-looking flags before Git collection', () => {
  const options = parseArgs(['--json', '--commit']);
  const report = buildReport(options, {
    gitRunner: () => {
      throw new Error('git should not run after rejected mutation flag');
    }
  });

  assert.equal(report.status, 'error');
  assert.equal(
    report.decision,
    'SELECTED_AUDIT_CORRELATION_DIRTY_SCOPE_INVENTORY_REJECTED_MUTATION_FLAG'
  );
  assert.equal(report.rejectedFlag, '--commit');
  assert.equal(report.currentFactsCollected, false);
  assert.equal(report.commitAuthorized, false);
});

test('CM-1132 CLI handles git status failure without mutation authority', () => {
  const report = buildReport({}, {
    gitRunner: () => ({
      status: 128,
      stdout: '',
      stderr: 'fatal: not a git repository',
      error: ''
    })
  });

  assert.equal(report.status, 'error');
  assert.equal(
    report.decision,
    'SELECTED_AUDIT_CORRELATION_DIRTY_SCOPE_INVENTORY_GIT_STATUS_FAILED'
  );
  assert.equal(report.commitAuthorized, false);
  assert.equal(report.cleanAuthorized, false);
});

test('CM-1132 CLI help and text output remain read-only', () => {
  const writes = [];
  const originalWrite = process.stdout.write;
  process.stdout.write = chunk => {
    writes.push(String(chunk));
    return true;
  };
  try {
    assert.equal(main(['--help']), 0);
    assert.match(writes.join(''), /selected-audit-correlation-dirty-scope-inventory/);
    writes.length = 0;
    assert.equal(main(['--reset']), 1);
    assert.match(writes.join(''), /SELECTED_AUDIT_CORRELATION_DIRTY_SCOPE_INVENTORY_REJECTED_MUTATION_FLAG/);
  } finally {
    process.stdout.write = originalWrite;
  }
});
