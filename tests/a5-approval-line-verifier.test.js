const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const test = require('node:test');

const {
  A5_APPROVAL_LINE_UNITS,
  evaluateA5ApprovalLine
} = require('../src/core/A5ApprovalLineVerifier');

function assertNoSideEffects(result) {
  assert.equal(result.safety.readsFiles, false);
  assert.equal(result.safety.scansDirectories, false);
  assert.equal(result.safety.executesCommands, false);
  assert.equal(result.safety.startsServices, false);
  assert.equal(result.safety.callsProviders, false);
  assert.equal(result.safety.callsMcpTools, false);
  assert.equal(result.safety.readsRealMemory, false);
  assert.equal(result.safety.writesDurableMemory, false);
  assert.equal(result.safety.writesDurableAudit, false);
  assert.equal(result.safety.changesConfig, false);
  assert.equal(result.safety.changesWatchdogStartup, false);
  assert.equal(result.safety.remoteWrite, false);
  assert.equal(result.safety.claimsReadiness, false);
}

test('A5 approval verifier accepts exact A5-GAP-5 strict gate line only for matching branch and commit', () => {
  const commit = 'f5bca6fced661b91f00b17f5a3e783ad5695e5d6';
  const result = evaluateA5ApprovalLine({
    approvalLine: `I approve A5-GAP-5 for codex-memory on branch main at commit ${commit}, running cutover-context strict gate only, no remote write.`,
    expectedUnit: 'A5-GAP-5',
    expectedBranch: 'main',
    expectedCommit: commit
  });

  assert.equal(result.status, 'approval_line_exact_match');
  assert.equal(result.approvalAccepted, true);
  assert.equal(result.authorizationGranted, true);
  assert.equal(result.action, 'cutover_context_strict_gate');
  assert.equal(result.command, 'npm run gate:mainline:strict');
  assert.equal(result.parsedBranch, 'main');
  assert.equal(result.parsedCommit, commit);
  assert.deepEqual(result.failClosedReasons, []);
  assert.equal(result.runtimeReady, false);
  assert.equal(result.finalRcMatrixReady, false);
  assert.equal(result.rcReady, false);
  assertNoSideEffects(result);
});

test('A5 approval verifier fails closed for stale commit, placeholders, and broader wording', () => {
  const commit = 'f5bca6fced661b91f00b17f5a3e783ad5695e5d6';

  const staleCommit = evaluateA5ApprovalLine({
    approvalLine: 'I approve A5-GAP-5 for codex-memory on branch main at commit 199aec96ae660ddad175a7566195f63fee1a0caa, running cutover-context strict gate only, no remote write.',
    expectedUnit: 'A5-GAP-5',
    expectedBranch: 'main',
    expectedCommit: commit
  });
  assert.equal(staleCommit.approvalAccepted, false);
  assert.equal(staleCommit.failClosedReasons.includes('commit_mismatch'), true);

  const placeholder = evaluateA5ApprovalLine({
    approvalLine: 'I approve A5-GAP-5 for codex-memory on branch main at commit <COMMIT>, running cutover-context strict gate only, no remote write.',
    expectedUnit: 'A5-GAP-5',
    expectedBranch: 'main',
    expectedCommit: commit
  });
  assert.equal(placeholder.approvalAccepted, false);
  assert.equal(placeholder.failClosedReasons.includes('placeholder_present'), true);

  const broader = evaluateA5ApprovalLine({
    approvalLine: `I approve A5-GAP-5 for codex-memory on branch main at commit ${commit}, running cutover-context strict gate and push.`,
    expectedUnit: 'A5-GAP-5',
    expectedBranch: 'main',
    expectedCommit: commit
  });
  assert.equal(broader.approvalAccepted, false);
  assert.equal(broader.failClosedReasons.includes('approval_line_not_exact'), true);
});

test('A5 approval verifier keeps other unit shapes separate and rejects unit reuse', () => {
  const commit = 'f5bca6fced661b91f00b17f5a3e783ad5695e5d6';
  const gap4Line = `I approve A5-GAP-4 for codex-memory on branch main at commit ${commit}, endpoint http://127.0.0.1:7605, no config/watchdog/startup change.`;

  const gap4 = evaluateA5ApprovalLine({
    approvalLine: gap4Line,
    expectedUnit: 'A5-GAP-4',
    expectedBranch: 'main',
    expectedCommit: commit
  });
  assert.equal(gap4.approvalAccepted, true);
  assert.equal(gap4.action, 'live_http_operation');
  assert.equal(gap4.parsed.endpoint, 'http://127.0.0.1:7605');

  const reusedAsGap5 = evaluateA5ApprovalLine({
    approvalLine: gap4Line,
    expectedUnit: 'A5-GAP-5',
    expectedBranch: 'main',
    expectedCommit: commit
  });
  assert.equal(reusedAsGap5.approvalAccepted, false);
  assert.equal(reusedAsGap5.failClosedReasons.includes('approval_line_not_exact'), true);
});

test('A5 approval verifier does not read files or execute commands', () => {
  const originalReadFileSync = fs.readFileSync;
  const originalExistsSync = fs.existsSync;
  const originalReaddirSync = fs.readdirSync;
  const originalExecSync = childProcess.execSync;
  const originalExecFileSync = childProcess.execFileSync;
  const originalSpawnSync = childProcess.spawnSync;

  fs.readFileSync = () => {
    throw new Error('unexpected fs read during approval verifier');
  };
  fs.existsSync = () => {
    throw new Error('unexpected fs exists during approval verifier');
  };
  fs.readdirSync = () => {
    throw new Error('unexpected directory scan during approval verifier');
  };
  childProcess.execSync = () => {
    throw new Error('unexpected command execution during approval verifier');
  };
  childProcess.execFileSync = () => {
    throw new Error('unexpected command execution during approval verifier');
  };
  childProcess.spawnSync = () => {
    throw new Error('unexpected command execution during approval verifier');
  };

  try {
    const result = evaluateA5ApprovalLine({
      approvalLine: 'not an approval line',
      expectedUnit: 'A5-GAP-5',
      expectedBranch: 'main',
      expectedCommit: 'f5bca6fced661b91f00b17f5a3e783ad5695e5d6'
    });

    assert.equal(result.approvalAccepted, false);
    assert.equal(result.safety.readsFiles, false);
    assert.equal(result.safety.executesCommands, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
    fs.existsSync = originalExistsSync;
    fs.readdirSync = originalReaddirSync;
    childProcess.execSync = originalExecSync;
    childProcess.execFileSync = originalExecFileSync;
    childProcess.spawnSync = originalSpawnSync;
  }
});

test('A5 approval verifier exposes all current A5 approval units', () => {
  assert.deepEqual(Object.keys(A5_APPROVAL_LINE_UNITS), [
    'A5-GAP-1',
    'A5-GAP-2',
    'A5-GAP-3',
    'A5-GAP-4',
    'A5-GAP-5',
    'A5-GAP-6',
    'A5-GAP-7'
  ]);
});
