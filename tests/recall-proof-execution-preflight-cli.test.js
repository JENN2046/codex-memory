'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const test = require('node:test');

const {
  EXACT_APPROVAL_LINE
} = require('../src/core/TrueLiveRecallReadonlyProofRunner');
const {
  EXPECTED_CM0814_QUERY_FAMILY,
  REQUIRED_BOUNDARY_FLAGS,
  REQUIRED_PROOF_SEAM
} = require('../src/core/RecallProofExecutionPreflight');

const cliPath = path.join('src', 'cli', 'recall-proof-execution-preflight.js');
const CURRENT_HEAD = 'a6782e338dfa320679f2802b0d8e2491d8f8b55d';

function runCli(args = []) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8'
  });
}

function buildCleanFixture() {
  return {
    basisId: 'CM-0814',
    approvalLine: EXACT_APPROVAL_LINE,
    gitFacts: {
      branch: 'main',
      localHead: CURRENT_HEAD,
      originHead: CURRENT_HEAD,
      statusShort: ''
    },
    queries: EXPECTED_CM0814_QUERY_FAMILY.map(query => ({
      slot: query.slot,
      family: query.family,
      text: query.text
    })),
    proofSeam: { ...REQUIRED_PROOF_SEAM },
    boundaryFlags: { ...REQUIRED_BOUNDARY_FLAGS }
  };
}

async function withTempFixture(fixture, handler) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-recall-preflight-'));
  const fixturePath = path.join(tempDir, 'fixture.json');
  try {
    await fs.writeFile(fixturePath, JSON.stringify(fixture, null, 2), 'utf8');
    await handler(fixturePath);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

test('CM-0905 CLI reports default dirty-worktree fixture as blocked without execution', () => {
  const result = runCli(['--json']);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);

  assert.equal(report.status, 'blocked');
  assert.equal(report.decision, 'RECALL_PROOF_EXECUTION_PREFLIGHT_BLOCKED_NOT_EXECUTED');
  assert.equal(report.acceptedForExecutionPreflight, false);
  assert.equal(report.executionStarted, false);
  assert.ok(report.blockerReasons.includes('dirty_worktree'));
  assert.equal(report.safety.callsSearchMemory, false);
  assert.equal(report.safety.callsRecordMemory, false);
  assert.equal(report.safety.callsProvider, false);
  assert.equal(report.readinessClaimAllowed, false);
  assert.equal(report.memoryRecallReliableClaimed, false);
});

test('CM-0905 CLI accepts an explicit clean fixture as preflight-ready but still not executed', async () => {
  await withTempFixture(buildCleanFixture(), async (fixturePath) => {
    const result = runCli(['--json', '--fixture', fixturePath]);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);

    assert.equal(report.status, 'ok');
    assert.equal(report.decision, 'RECALL_PROOF_EXECUTION_PREFLIGHT_READY_NOT_EXECUTED');
    assert.equal(report.acceptedForExecutionPreflight, true);
    assert.equal(report.executionStarted, false);
    assert.deepEqual(report.blockerReasons, []);
    assert.equal(report.cleanSyncedMainHead, true);
    assert.equal(report.exactQueryFamilyBound, true);
    assert.equal(report.internalProofSeamBound, true);
    assert.equal(report.boundaryFlagsBound, true);
    assert.match(report.nextStep, /live proof execution remains a separate step/);
  });
});

test('CM-0905 CLI text mode renders non-executing safety fields', () => {
  const result = runCli([]);
  assert.equal(result.status, 0, result.stderr);

  assert.match(result.stdout, /status: blocked/);
  assert.match(result.stdout, /decision: RECALL_PROOF_EXECUTION_PREFLIGHT_BLOCKED_NOT_EXECUTED/);
  assert.match(result.stdout, /executionStarted: false/);
  assert.match(result.stdout, /callsSearchMemory: false/);
  assert.match(result.stdout, /readinessClaimAllowed: false/);
});

test('CM-0905 CLI rejects execution and live-proof flags', () => {
  for (const flag of ['--execute', '--live-proof', '--search-memory', '--record-memory', '--provider']) {
    const result = runCli(['--json', flag]);
    assert.equal(result.status, 1);
    const report = JSON.parse(result.stdout);

    assert.equal(report.status, 'error');
    assert.equal(report.decision, 'RECALL_PROOF_PREFLIGHT_REJECTED_EXECUTION_FLAG');
    assert.equal(report.rejectedFlag, flag);
    assert.equal(report.executionStarted, false);
    assert.equal(report.callsSearchMemory, false);
    assert.equal(report.callsRecordMemory, false);
    assert.equal(report.callsProvider, false);
    assert.equal(report.readinessClaimAllowed, false);
  }
});

test('CM-0905 CLI help exits 0', () => {
  const result = runCli(['--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: node src\/cli\/recall-proof-execution-preflight\.js/);
  assert.match(result.stdout, /never runs search_memory/);
});
