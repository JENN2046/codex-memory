'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const test = require('node:test');

const {
  buildReport,
  collectGitFacts
} = require('../src/cli/write-proof-current-facts-preflight');

const cliPath = path.join('src', 'cli', 'write-proof-current-facts-preflight.js');
const CURRENT_HEAD = 'a6782e338dfa320679f2802b0d8e2491d8f8b55d';

function fakeGitRunner(outputs) {
  return (args) => {
    const key = args.join(' ');
    const value = outputs[key];
    if (value && typeof value === 'object') {
      return {
        status: value.status ?? 0,
        stdout: value.stdout || '',
        stderr: value.stderr || '',
        error: value.error || ''
      };
    }
    return {
      status: 0,
      stdout: value || '',
      stderr: '',
      error: ''
    };
  };
}

function cleanOutputs(overrides = {}) {
  return {
    'branch --show-current': 'main\n',
    'rev-parse HEAD': `${CURRENT_HEAD}\n`,
    'rev-parse origin/main': `${CURRENT_HEAD}\n`,
    'rev-parse refs/remotes/origin/main': `${CURRENT_HEAD}\n`,
    'status --short': '',
    ...overrides
  };
}

function runCli(args = []) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8'
  });
}

test('CM-0908 current-facts collector builds clean write preflight facts without execution', () => {
  const report = buildReport(
    {},
    { gitRunner: fakeGitRunner(cleanOutputs()) }
  );

  assert.equal(report.status, 'ok');
  assert.equal(report.decision, 'WRITE_PROOF_EXECUTION_PREFLIGHT_READY_NOT_EXECUTED');
  assert.equal(report.acceptedForExecutionPreflight, true);
  assert.equal(report.executionStarted, false);
  assert.equal(report.recordMemoryStarted, false);
  assert.equal(report.preflightOnly, true);
  assert.equal(report.separateLiveWriteApprovalRequired, true);
  assert.equal(report.implicitWriteAuthorizationGranted, false);
  assert.equal(report.cleanSyncedMainHead, true);
  assert.equal(report.exactBasisBound, true);
  assert.equal(report.optInAppSeamBound, true);
  assert.equal(report.scopeAssumptionsBound, true);
  assert.equal(report.boundaryFlagsBound, true);
  assert.equal(report.collectorSafety.readsCurrentGitFacts, true);
  assert.equal(report.collectorSafety.executesReadOnlyGitCommands, true);
  assert.equal(report.collectorSafety.callsRecordMemory, false);
  assert.equal(report.collectorSafety.callsSearchMemory, false);
  assert.equal(report.collectorSafety.callsProvider, false);
  assert.equal(report.readinessClaimAllowed, false);
  assert.equal(report.memoryWriteReliableClaimed, false);
});

test('CM-0908 current-facts collector fails closed for dirty worktree', () => {
  const report = buildReport(
    {},
    {
      gitRunner: fakeGitRunner(cleanOutputs({
        'status --short': ' M src/app.js\n?? docs/WRITE_PROOF_EXECUTION_PREFLIGHT_CLI.md\n'
      }))
    }
  );

  assert.equal(report.status, 'blocked');
  assert.equal(report.decision, 'WRITE_PROOF_EXECUTION_PREFLIGHT_BLOCKED_NOT_EXECUTED');
  assert.equal(report.acceptedForExecutionPreflight, false);
  assert.equal(report.executionStarted, false);
  assert.ok(report.blockerReasons.includes('dirty_worktree'));
  assert.equal(report.normalizedGitFacts.dirtyStatusLineCount, 2);
});

test('CM-0908 current-facts collector fails closed when remote-tracking main cannot be read', () => {
  const report = buildReport(
    {},
    {
      gitRunner: fakeGitRunner(cleanOutputs({
        'rev-parse refs/remotes/origin/main': {
          status: 128,
          stdout: '',
          stderr: 'fatal: ambiguous argument refs/remotes/origin/main'
        }
      }))
    }
  );

  assert.equal(report.status, 'blocked');
  assert.ok(report.blockerReasons.includes('remote_main_head_missing_or_malformed'));
  assert.equal(report.gitFactErrors.length, 1);
  assert.match(report.gitFactErrors[0].command, /git rev-parse refs\/remotes\/origin\/main/);
  assert.equal(report.executionStarted, false);
  assert.equal(report.recordMemoryStarted, false);
});

test('CM-0908 rejected execution flags do not collect git facts', () => {
  const report = buildReport({ rejectedFlag: '--record-memory' }, {
    gitRunner: () => {
      throw new Error('git should not be called for rejected flags');
    }
  });

  assert.equal(report.status, 'error');
  assert.equal(report.decision, 'WRITE_PROOF_CURRENT_FACTS_PREFLIGHT_REJECTED_EXECUTION_FLAG');
  assert.equal(report.rejectedFlag, '--record-memory');
  assert.equal(report.executionStarted, false);
  assert.equal(report.recordMemoryStarted, false);
  assert.equal(report.callsRecordMemory, false);
  assert.equal(report.callsSearchMemory, false);
  assert.equal(report.callsProvider, false);
  assert.equal(report.readinessClaimAllowed, false);
});

test('CM-0908 collectGitFacts records read-only git command failures', () => {
  const facts = collectGitFacts({
    gitRunner: fakeGitRunner(cleanOutputs({
      'branch --show-current': {
        status: 128,
        stdout: '',
        stderr: 'fatal: not a git repository'
      }
    }))
  });

  assert.equal(facts.gitFacts.branch, '');
  assert.equal(facts.gitFacts.localHead, CURRENT_HEAD);
  assert.equal(facts.gitFacts.remoteMainHead, CURRENT_HEAD);
  assert.equal(facts.errors.length, 1);
  assert.equal(facts.errors[0].command, 'git branch --show-current');
});

test('CM-0908 CLI help and rejected flag behavior', () => {
  const help = runCli(['--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage: node src\/cli\/write-proof-current-facts-preflight\.js/);
  assert.match(help.stdout, /never runs record_memory/);

  const rejected = runCli(['--json', '--provider']);
  assert.equal(rejected.status, 1);
  const report = JSON.parse(rejected.stdout);
  assert.equal(report.status, 'error');
  assert.equal(report.rejectedFlag, '--provider');
  assert.equal(report.executionStarted, false);
  assert.equal(report.recordMemoryStarted, false);
});
