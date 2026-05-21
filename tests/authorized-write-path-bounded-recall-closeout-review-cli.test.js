const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const cliPath = path.resolve(
  __dirname,
  '..',
  'src',
  'cli',
  'authorized-write-path-bounded-recall-closeout-review.js'
);
const issuanceRecord = path.resolve(
  __dirname,
  'fixtures',
  'cm0658-bounded-recall-approval-issuance-record-v1.md'
);
const executionEvidenceRecord = path.resolve(
  __dirname,
  'fixtures',
  'cm0659-bounded-recall-execution-evidence-record-v1.md'
);

function runCli(args = []) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8'
  });
}

test('bounded-recall closeout-review CLI reports current fail-closed state by default', () => {
  const result = runCli(['--json']);
  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.decision, 'BOUNDED_RECALL_CLOSEOUT_NOT_READY');
  assert.equal(payload.controllingState, 'RC_NOT_READY_BLOCKED');
  assert.equal(payload.canExecuteBoundedRecallNow, false);
  assert.equal(payload.canExecuteRuntimeNow, false);
  assert.equal(
    payload.boundedRecallPreparationCommandPreviewBundle.bundleKind,
    'bounded_recall_preparation_command_bundle_blocked'
  );
});

test('bounded-recall closeout-review CLI can render current closeout text in text mode', () => {
  const result = runCli(['--rendered-closeout-text']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /\[rendered-closeout-text\]/);
  assert.match(result.stdout, /Decision: BOUNDED_RECALL_CLOSEOUT_NOT_READY/);
});

test('bounded-recall closeout-review CLI can consume later issuance and execution artifacts while keeping runtime blocked', () => {
  const result = runCli([
    '--json',
    '--bounded-recall-issuance-record',
    issuanceRecord,
    '--bounded-recall-execution-evidence-record',
    executionEvidenceRecord
  ]);
  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(
    payload.decision,
    'BOUNDED_RECALL_CLOSEOUT_RECORDED_PREPARED_LATER_APPROVAL_ONLY'
  );
  assert.equal(payload.boundedRecallCloseoutReady, true);
  assert.equal(payload.canPrepareFutureBoundedRecallRuntimeApprovalNext, true);
  assert.equal(payload.canExecuteBoundedRecallNow, false);
  assert.equal(payload.canExecuteRuntimeNow, false);
  assert.equal(
    payload.boundedRecallPreparationCommandPreviewBundle.bundleKind,
    'bounded_recall_preparation_command_bundle'
  );
  assert.equal(
    payload.boundedRecallPreparationCommandPreviewBundle.resolvedRecordPathMode,
    'workspace_relative_pair'
  );
  assert.match(
    payload.boundedRecallPreparationCommandPreviewBundle.primaryCommand,
    /tests\\fixtures\\cm0658-bounded-recall-approval-issuance-record-v1\.md/
  );
  assert.match(
    payload.boundedRecallPreparationCommandPreviewBundle.primaryCommand,
    /tests\\fixtures\\cm0659-bounded-recall-execution-evidence-record-v1\.md/
  );
  assert.equal(payload.boundedRecallPreparationOperatorPacketDraft.draftUsableNow, true);
  assert.match(
    payload.renderedBoundedRecallPreparationPacketTextSurface.markdown,
    /## Command Preview/
  );
  assert.equal(
    payload.boundedRecallApprovalIssuanceRecordInputTrace.sourceFileName,
    'cm0658-bounded-recall-approval-issuance-record-v1.md'
  );
  assert.equal(
    payload.boundedRecallExecutionEvidenceInputTrace.sourceFileName,
    'cm0659-bounded-recall-execution-evidence-record-v1.md'
  );
});

test('bounded-recall closeout-review CLI rejects execute-bounded-recall flag', () => {
  const result = runCli(['--json', '--execute-bounded-recall']);
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, 'error');
  assert.equal(payload.decision, 'REJECTED_FLAG');
});

test('bounded-recall closeout-review CLI help exits 0', () => {
  const result = runCli(['--help']);
  assert.equal(result.status, 0);
  assert.match(
    result.stdout,
    /Usage: node src\/cli\/authorized-write-path-bounded-recall-closeout-review\.js/
  );
});
