'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const test = require('node:test');

const {
  EXACT_WRITE_APPROVAL_LINE,
  REQUIRED_BASIS,
  REQUIRED_BOUNDARY_FLAGS,
  REQUIRED_SCOPE_ASSUMPTIONS,
  REQUIRED_WRITE_SEAM
} = require('../src/core/WriteProofExecutionPreflight');

const cliPath = path.join('src', 'cli', 'write-proof-execution-preflight.js');
const CURRENT_HEAD = 'a6782e338dfa320679f2802b0d8e2491d8f8b55d';

function runCli(args = []) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8'
  });
}

function buildCleanFixture(overrides = {}) {
  return {
    basisId: 'CM-0737',
    approvalLine: EXACT_WRITE_APPROVAL_LINE,
    gitFacts: {
      branch: 'main',
      localHead: CURRENT_HEAD,
      originHead: CURRENT_HEAD,
      remoteMainHead: CURRENT_HEAD,
      statusShort: ''
    },
    basis: { ...REQUIRED_BASIS },
    writeSeam: { ...REQUIRED_WRITE_SEAM },
    scopeAssumptions: { ...REQUIRED_SCOPE_ASSUMPTIONS },
    boundaryFlags: { ...REQUIRED_BOUNDARY_FLAGS },
    ...overrides
  };
}

async function withTempFixture(fixture, handler) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-write-proof-preflight-'));
  const fixturePath = path.join(tempDir, 'fixture.json');
  try {
    await fs.writeFile(fixturePath, JSON.stringify(fixture, null, 2), 'utf8');
    await handler(fixturePath);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

test('CM-0907 CLI reports default dirty-worktree fixture as blocked without execution', () => {
  const result = runCli(['--json']);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);

  assert.equal(report.status, 'blocked');
  assert.equal(report.decision, 'WRITE_PROOF_EXECUTION_PREFLIGHT_BLOCKED_NOT_EXECUTED');
  assert.equal(report.acceptedForExecutionPreflight, false);
  assert.equal(report.executionStarted, false);
  assert.equal(report.recordMemoryStarted, false);
  assert.ok(report.blockerReasons.includes('dirty_worktree'));
  assert.equal(report.safety.callsRecordMemory, false);
  assert.equal(report.safety.callsSearchMemory, false);
  assert.equal(report.safety.callsProvider, false);
  assert.equal(report.readinessClaimAllowed, false);
  assert.equal(report.memoryWriteReliableClaimed, false);
});

test('CM-0907 CLI accepts an explicit clean fixture as preflight-ready but still not executed', async () => {
  await withTempFixture(buildCleanFixture(), async (fixturePath) => {
    const result = runCli(['--json', '--fixture', fixturePath]);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);

    assert.equal(report.status, 'ok');
    assert.equal(report.decision, 'WRITE_PROOF_EXECUTION_PREFLIGHT_READY_NOT_EXECUTED');
    assert.equal(report.acceptedForExecutionPreflight, true);
    assert.equal(report.executionStarted, false);
    assert.equal(report.recordMemoryStarted, false);
    assert.deepEqual(report.blockerReasons, []);
    assert.equal(report.cleanSyncedMainHead, true);
    assert.equal(report.exactBasisBound, true);
    assert.equal(report.optInAppSeamBound, true);
    assert.equal(report.scopeAssumptionsBound, true);
    assert.equal(report.boundaryFlagsBound, true);
    assert.match(report.nextStep, /record_memory execution remains a separate step/);
  });
});

test('CM-0907 CLI text mode renders non-executing safety fields', () => {
  const result = runCli([]);
  assert.equal(result.status, 0, result.stderr);

  assert.match(result.stdout, /status: blocked/);
  assert.match(result.stdout, /decision: WRITE_PROOF_EXECUTION_PREFLIGHT_BLOCKED_NOT_EXECUTED/);
  assert.match(result.stdout, /executionStarted: false/);
  assert.match(result.stdout, /recordMemoryStarted: false/);
  assert.match(result.stdout, /callsRecordMemory: false/);
  assert.match(result.stdout, /readinessClaimAllowed: false/);
});

test('CM-0907 CLI rejects execution, live-proof, and memory flags', () => {
  for (const flag of ['--execute', '--live-proof', '--record-memory', '--search-memory', '--provider']) {
    const result = runCli(['--json', flag]);
    assert.equal(result.status, 1);
    const report = JSON.parse(result.stdout);

    assert.equal(report.status, 'error');
    assert.equal(report.decision, 'WRITE_PROOF_PREFLIGHT_REJECTED_EXECUTION_FLAG');
    assert.equal(report.rejectedFlag, flag);
    assert.equal(report.executionStarted, false);
    assert.equal(report.recordMemoryStarted, false);
    assert.equal(report.callsRecordMemory, false);
    assert.equal(report.callsSearchMemory, false);
    assert.equal(report.callsProvider, false);
    assert.equal(report.readinessClaimAllowed, false);
  }
});

test('CM-0907 CLI help exits 0', () => {
  const result = runCli(['--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: node src\/cli\/write-proof-execution-preflight\.js/);
  assert.match(result.stdout, /never runs record_memory/);
});
