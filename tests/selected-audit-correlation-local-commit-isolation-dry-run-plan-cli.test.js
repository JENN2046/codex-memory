'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  REQUIRED_APPROVAL_LINE,
  REQUIRED_CM1142_APPROVAL_LINE,
  REQUIRED_HEAD,
  PREFLIGHT_CLASSES
} = require('../src/core/SelectedAuditCorrelationLocalCommitIsolationPreflight');
const {
  PLAN_CLASSES
} = require('../src/core/SelectedAuditCorrelationLocalCommitIsolationDryRunPlan');
const {
  buildReport,
  main,
  parseArgs
} = require('../src/cli/selected-audit-correlation-local-commit-isolation-dry-run-plan');

function gitRunner(stdoutByCommand) {
  return args => {
    const key = args.join(' ');
    assert.ok(Object.hasOwn(stdoutByCommand, key), `unexpected git args: ${key}`);
    return {
      status: 0,
      stdout: stdoutByCommand[key],
      stderr: '',
      error: ''
    };
  };
}

function facts(statusShort) {
  return {
    'branch --show-current': 'main\n',
    'rev-parse HEAD': `${REQUIRED_HEAD}\n`,
    'status --short': statusShort
  };
}

test('CM-1137 CLI blocks dry-run plan when approval is missing', () => {
  const report = buildReport({}, {
    gitRunner: gitRunner(facts('?? docs/CM1136_LOCAL_COMMIT_ISOLATION_PREFLIGHT.md\n'))
  });

  assert.equal(report.status, 'blocked');
  assert.equal(report.planClass, PLAN_CLASSES.BLOCKED_PREFLIGHT_NOT_ACCEPTED);
  assert.equal(report.planPrepared, false);
  assert.equal(report.commitExecutableNow, false);
});

test('CM-1137 CLI prepares dry-run plan for exact approval but no executable commands', () => {
  const report = buildReport(parseArgs(['--json', '--approval-line', REQUIRED_APPROVAL_LINE]), {
    gitRunner: gitRunner(facts([
      ' M STATUS.md',
      '?? docs/CM1135_DIRTY_SCOPE_LOCAL_COMMIT_ISOLATION_APPROVAL_PACKET.md'
    ].join('\n')))
  });

  assert.equal(report.status, 'ready_not_executed');
  assert.equal(report.planClass, PLAN_CLASSES.LOCAL_COMMIT_ISOLATION_DRY_RUN_PLAN_READY_NOT_EXECUTED);
  assert.equal(report.planPrepared, true);
  assert.equal(report.dryRunOnly, true);
  assert.equal(report.commitExecutableNow, false);
  assert.equal(report.pushExecutableNow, false);
  assert.equal(report.cleanExecutableNow, false);
});

test('CM-1137 CLI blocks dry-run plan when CM-1136 reports stale approval scope', () => {
  const report = buildReport(parseArgs(['--json', '--approval-line', REQUIRED_APPROVAL_LINE]), {
    gitRunner: gitRunner(facts([
      ' M STATUS.md',
      '?? docs/CM1135_DIRTY_SCOPE_LOCAL_COMMIT_ISOLATION_APPROVAL_PACKET.md',
      '?? docs/CM1141_STALE_LOCAL_COMMIT_APPROVAL_SCOPE_GUARD.md',
      '?? src/core/SelectedAuditCorrelationLocalCommitIsolationPreflight.js'
    ].join('\n')))
  });

  assert.equal(report.status, 'blocked');
  assert.equal(
    report.preflightClass,
    PREFLIGHT_CLASSES.BLOCKED_APPROVAL_PACKET_STALE_DIRTY_SCOPE_EXPANDED
  );
  assert.equal(report.planClass, PLAN_CLASSES.BLOCKED_PREFLIGHT_NOT_ACCEPTED);
  assert.equal(report.planPrepared, false);
  assert.equal(report.commitExecutableNow, false);
});

test('CM-1142 CLI prepares dry-run plan for fresh approval without executable commands', () => {
  const report = buildReport(parseArgs(['--json', '--approval-line', REQUIRED_CM1142_APPROVAL_LINE]), {
    gitRunner: gitRunner(facts([
      ' M STATUS.md',
      '?? docs/CM1142_EXPANDED_DIRTY_SCOPE_LOCAL_COMMIT_ISOLATION_APPROVAL_PACKET.md',
      '?? src/core/SelectedAuditCorrelationLocalCommitIsolationPreflight.js'
    ].join('\n')))
  });

  assert.equal(report.status, 'ready_not_executed');
  assert.equal(report.preflightClass, PREFLIGHT_CLASSES.ACCEPTED_FOR_SEPARATE_LOCAL_COMMIT_EXECUTION_NOT_EXECUTED);
  assert.equal(report.planClass, PLAN_CLASSES.LOCAL_COMMIT_ISOLATION_DRY_RUN_PLAN_READY_NOT_EXECUTED);
  assert.equal(report.planPrepared, true);
  assert.equal(report.commitExecutableNow, false);
  assert.equal(report.pushExecutableNow, false);
});

test('CM-1137 CLI rejects execution-like flags before Git collection', () => {
  const report = buildReport(parseArgs(['--commit']), {
    gitRunner: () => {
      throw new Error('git should not run for rejected mutation flag');
    }
  });

  assert.equal(report.status, 'error');
  assert.equal(
    report.decision,
    'SELECTED_AUDIT_CORRELATION_LOCAL_COMMIT_ISOLATION_DRY_RUN_PLAN_REJECTED'
  );
  assert.equal(report.preflightExecuted, false);
});

test('CM-1137 CLI help and text output remain dry-run only', () => {
  const writes = [];
  const originalWrite = process.stdout.write;
  process.stdout.write = chunk => {
    writes.push(String(chunk));
    return true;
  };
  try {
    assert.equal(main(['--help']), 0);
    assert.match(writes.join(''), /dry-run-plan/);
    writes.length = 0;
    assert.equal(main(['--push']), 1);
    assert.match(writes.join(''), /DRY_RUN_PLAN_REJECTED/);
  } finally {
    process.stdout.write = originalWrite;
  }
});
