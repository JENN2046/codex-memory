'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluatePhaseF1RuntimeFreshness,
  parseTimestamp
} = require('../src/core/PhaseF1RuntimeFreshnessDiagnostic');

const HEAD = '180c7a890a8920a1968a4f24ea4f9775ff7e6b23';

function baseInput(overrides = {}) {
  return {
    currentHead: HEAD,
    originHead: HEAD,
    ahead: 0,
    behind: 0,
    worktreeClean: true,
    headCommitTime: '2026-06-02T17:49:29+08:00',
    expectedScriptPath: 'A:\\codex-memory\\scripts\\serve-codex-memory-http.js',
    listener: {
      processId: 18568,
      creationDate: '2026-06-02T18:00:00+08:00',
      commandLine: '"C:\\Program Files\\nodejs\\node.exe" A:\\codex-memory\\scripts\\serve-codex-memory-http.js'
    },
    ...overrides
  };
}

test('parseTimestamp accepts ISO and rejects empty input', () => {
  assert.equal(Number.isFinite(parseTimestamp('2026-06-02T17:49:29+08:00')), true);
  assert.equal(parseTimestamp('/Date(1780292773284)/'), 1780292773284);
  assert.equal(parseTimestamp(''), null);
});

test('runtime freshness accepts synced clean head with listener after head commit', () => {
  const report = evaluatePhaseF1RuntimeFreshness(baseInput());

  assert.equal(report.status, 'PHASE_F1_RUNTIME_FRESHNESS_ACCEPTED');
  assert.equal(report.runtimeFresh, true);
  assert.deepEqual(report.failClosedReasons, []);
  assert.equal(report.nextRequiredAction, 'run_exact_approved_f1_live_no_write_harness');
  assert.equal(report.safetyCounters.mcpCalls, 0);
});

test('runtime freshness rejects listener that started before current head', () => {
  const report = evaluatePhaseF1RuntimeFreshness(baseInput({
    listener: {
      processId: 18568,
      creationDate: '2026-06-01T13:46:13+08:00',
      commandLine: '"C:\\Program Files\\nodejs\\node.exe" A:\\codex-memory\\scripts\\serve-codex-memory-http.js'
    }
  }));

  assert.equal(report.status, 'PHASE_F1_RUNTIME_FRESHNESS_REJECTED_FAIL_CLOSED');
  assert.equal(report.runtimeFresh, false);
  assert.ok(report.failClosedReasons.includes('runtime_process_started_before_head'));
  assert.equal(report.nextRequiredAction, 'obtain_exact_runtime_refresh_approval_then_restart_or_refresh_service');
});

test('runtime freshness rejects unsynced or dirty Git facts', () => {
  const report = evaluatePhaseF1RuntimeFreshness(baseInput({
    originHead: 'dd5018dfbc564975e0e6a93aebdeba38821760a0',
    ahead: 1,
    worktreeClean: false
  }));

  assert.ok(report.failClosedReasons.includes('local_origin_head_mismatch'));
  assert.ok(report.failClosedReasons.includes('local_branch_ahead_remote'));
  assert.ok(report.failClosedReasons.includes('dirty_worktree'));
});
