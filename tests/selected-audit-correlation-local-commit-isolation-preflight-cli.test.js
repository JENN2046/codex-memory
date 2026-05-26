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
  buildReport,
  main,
  parseArgs
} = require('../src/cli/selected-audit-correlation-local-commit-isolation-preflight');

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

test('CM-1136 CLI blocks current facts when approval is missing', () => {
  const report = buildReport({}, {
    gitRunner: gitRunner(facts('?? docs/CM1135_DIRTY_SCOPE_LOCAL_COMMIT_ISOLATION_APPROVAL_PACKET.md\n'))
  });

  assert.equal(report.status, 'blocked');
  assert.equal(report.preflightClass, PREFLIGHT_CLASSES.BLOCKED_APPROVAL_MISSING);
  assert.equal(report.currentFactsCollected, true);
  assert.equal(report.localCommitExecutionAllowedNow, false);
  assert.equal(report.commitAuthorized, false);
});

test('CM-1136 CLI accepts exact approval but still does not authorize commit in report', () => {
  const options = parseArgs(['--json', '--approval-line', REQUIRED_APPROVAL_LINE]);
  const report = buildReport(options, {
    gitRunner: gitRunner(facts([
      ' M STATUS.md',
      '?? docs/CM1135_DIRTY_SCOPE_LOCAL_COMMIT_ISOLATION_APPROVAL_PACKET.md'
    ].join('\n')))
  });

  assert.equal(report.status, 'accepted_not_executed');
  assert.equal(
    report.preflightClass,
    PREFLIGHT_CLASSES.ACCEPTED_FOR_SEPARATE_LOCAL_COMMIT_EXECUTION_NOT_EXECUTED
  );
  assert.equal(report.approvalLineAccepted, true);
  assert.equal(report.localCommitExecutionAllowedNow, true);
  assert.equal(report.commitAuthorized, false);
  assert.equal(report.pushAuthorized, false);
});

test('CM-1142 CLI accepts fresh exact approval for expanded dirty scope but still does not authorize commit', () => {
  const options = parseArgs(['--json', '--approval-line', REQUIRED_CM1142_APPROVAL_LINE]);
  const report = buildReport(options, {
    gitRunner: gitRunner(facts([
      ' M STATUS.md',
      '?? docs/CM1135_DIRTY_SCOPE_LOCAL_COMMIT_ISOLATION_APPROVAL_PACKET.md',
      '?? docs/CM1142_EXPANDED_DIRTY_SCOPE_LOCAL_COMMIT_ISOLATION_APPROVAL_PACKET.md',
      '?? src/core/SelectedAuditCorrelationLocalCommitIsolationPreflight.js'
    ].join('\n')))
  });

  assert.equal(report.status, 'accepted_not_executed');
  assert.equal(
    report.preflightClass,
    PREFLIGHT_CLASSES.ACCEPTED_FOR_SEPARATE_LOCAL_COMMIT_EXECUTION_NOT_EXECUTED
  );
  assert.equal(report.preflight.approvalPacketId, 'CM-1142');
  assert.equal(report.localCommitExecutionAllowedNow, true);
  assert.equal(report.commitAuthorized, false);
  assert.equal(report.pushAuthorized, false);
});

test('CM-1136 CLI blocks exact approval when current dirty scope has post-packet expansion', () => {
  const options = parseArgs(['--json', '--approval-line', REQUIRED_APPROVAL_LINE]);
  const report = buildReport(options, {
    gitRunner: gitRunner(facts([
      ' M STATUS.md',
      '?? docs/CM1135_DIRTY_SCOPE_LOCAL_COMMIT_ISOLATION_APPROVAL_PACKET.md',
      '?? docs/CM1140_PREREQUISITE_RESOLUTION_SEQUENCE.md',
      '?? src/cli/selected-audit-correlation-current-facts-resolution-sequence.js'
    ].join('\n')))
  });

  assert.equal(report.status, 'blocked');
  assert.equal(
    report.preflightClass,
    PREFLIGHT_CLASSES.BLOCKED_APPROVAL_PACKET_STALE_DIRTY_SCOPE_EXPANDED
  );
  assert.equal(report.approvalLineAccepted, true);
  assert.equal(report.localCommitExecutionAllowedNow, false);
  assert.equal(report.preflight.approvalScopeExpansionPaths.length, 2);
});

test('CM-1136 CLI rejects mutation-looking flags before Git collection', () => {
  const options = parseArgs(['--commit']);
  const report = buildReport(options, {
    gitRunner: () => {
      throw new Error('git should not run for rejected mutation flag');
    }
  });

  assert.equal(report.status, 'error');
  assert.equal(
    report.decision,
    'SELECTED_AUDIT_CORRELATION_LOCAL_COMMIT_ISOLATION_PREFLIGHT_REJECTED_MUTATION_FLAG'
  );
  assert.equal(report.rejectedFlag, '--commit');
  assert.equal(report.currentFactsCollected, false);
});

test('CM-1136 CLI help and text output remain no-execution', () => {
  const writes = [];
  const originalWrite = process.stdout.write;
  process.stdout.write = chunk => {
    writes.push(String(chunk));
    return true;
  };
  try {
    assert.equal(main(['--help']), 0);
    assert.match(writes.join(''), /local-commit-isolation-preflight/);
    writes.length = 0;
    assert.equal(main(['--push']), 1);
    assert.match(writes.join(''), /REJECTED_MUTATION_FLAG/);
  } finally {
    process.stdout.write = originalWrite;
  }
});
