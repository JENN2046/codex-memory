const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const cliPath = path.resolve(
  __dirname,
  '..',
  'src',
  'cli',
  'authorized-write-path-bounded-recall-preparation-review.js'
);
const wideningRecord = path.resolve(
  __dirname,
  'fixtures',
  'cm0607-widening-adoption-record-v1.md'
);
const issuanceRecord = path.resolve(
  __dirname,
  'fixtures',
  'cm0649-cm0595-approval-issuance-record-v1.md'
);
const executionRecord = path.resolve(
  __dirname,
  'fixtures',
  'cm0650-cm0595-execution-evidence-record-v1.md'
);

function runCli(args = []) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8'
  });
}

test('bounded recall preparation CLI reports current fail-closed state by default', () => {
  const result = runCli(['--json']);
  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.decision, 'BOUNDED_RECALL_APPROVAL_NOT_READY');
  assert.equal(report.controllingState, 'RC_NOT_READY_BLOCKED');
  assert.equal(report.canExecuteBoundedRecallNow, false);
  assert.equal(report.canExecuteRuntimeNow, false);
  assert.equal(report.boundedRecallCommandPreviewBundle.bundleKind, 'bounded_recall_review_command_bundle_blocked');
  assert.equal(report.boundedRecallApprovalIssuanceRecordDraft.draftKind, 'bounded_recall_approval_issuance_record_draft_blocked');
  assert.equal(report.boundedRecallExecutionEvidenceDraft.draftKind, 'bounded_recall_execution_evidence_draft_blocked');
});

test('bounded recall preparation CLI can render current bounded-recall text in text mode', () => {
  const result = runCli(['--rendered-bounded-recall-text']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /\[rendered-bounded-recall-text\]/);
  assert.match(result.stdout, /Decision: BOUNDED_RECALL_APPROVAL_NOT_READY/);
});

test('bounded recall preparation CLI can consume later adoption issuance and execution artifacts while keeping runtime blocked', () => {
  const result = runCli([
    '--json',
    '--widening-adoption-record',
    wideningRecord,
    '--cm0595-issuance-record',
    issuanceRecord,
    '--cm0595-execution-evidence-record',
    executionRecord
  ]);
  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.decision, 'BOUNDED_RECALL_APPROVAL_PREPARED_EXACT_ONLY');
  assert.equal(report.boundedRecallApprovalPrepared, true);
  assert.equal(report.canPrepareBoundedRecallExactApproval, true);
  assert.equal(report.canExecuteBoundedRecallNow, false);
  assert.equal(report.canExecuteRuntimeNow, false);
  assert.equal(report.boundedRecallCommandPreviewBundle.bundleKind, 'bounded_recall_exact_approval_review_command_bundle');
  assert.equal(report.boundedRecallCommandPreviewBundle.resolvedRecordPathMode, 'workspace_relative_triple');
  assert.match(report.boundedRecallCommandPreviewBundle.primaryCommand, /authorized-write-path-bounded-recall-preparation-review\.js --json/);
  assert.equal(report.boundedRecallApprovalIssuanceRecordDraft.draftUsableNow, true);
  assert.equal(report.boundedRecallExecutionEvidenceDraft.draftUsableNow, true);
  assert.match(report.renderedBoundedRecallTextSurface.markdown, /## Command Preview/);
  assert.match(report.renderedBoundedRecallTextSurface.markdown, /## Next Record Drafts/);
});

test('bounded recall preparation CLI rejects execute and bounded-recall flags', () => {
  const executeResult = runCli(['--json', '--execute']);
  assert.equal(executeResult.status, 1);
  const executeReport = JSON.parse(executeResult.stdout);
  assert.equal(executeReport.status, 'error');

  const boundedRecallResult = runCli(['--json', '--execute-bounded-recall']);
  assert.equal(boundedRecallResult.status, 1);
  const boundedRecallReport = JSON.parse(boundedRecallResult.stdout);
  assert.equal(boundedRecallReport.status, 'error');
});

test('bounded recall preparation CLI help exits 0', () => {
  const result = runCli(['--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: node src\/cli\/authorized-write-path-bounded-recall-preparation-review\.js/);
});
