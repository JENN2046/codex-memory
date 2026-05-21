const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const cliPath = path.resolve(
  __dirname,
  '..',
  'src',
  'cli',
  'authorized-write-path-widening-review.js'
);
const routingOutcomeRecordPath = path.resolve(
  __dirname,
  'fixtures',
  'cm0605-routing-outcome-record-v1.md'
);
const assertionRecordPath = path.resolve(
  __dirname,
  'fixtures',
  'external-token-material-assertion-record-v1.json'
);

function runCli(args = []) {
  return childProcess.spawnSync(process.execPath, [cliPath, ...args], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8'
  });
}

test('authorized write-path widening-review CLI reports current fail-closed state by default', () => {
  const result = runCli(['--json']);
  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, 'blocked_fail_closed');
  assert.equal(payload.decision, 'WIDENING_REVIEW_NOT_READY');
  assert.equal(payload.renderedReviewTextSurface.previewAvailable, true);
});

test('authorized write-path widening-review CLI can render current review text in text mode', () => {
  const result = runCli(['--rendered-review-text']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /\[rendered-review-text\]/);
  assert.match(result.stdout, /WIDENING_REVIEW_NOT_READY/);
});

test('authorized write-path widening-review CLI can consume a CM-0615 routing outcome record and keep the review fail-closed', () => {
  const result = runCli([
    '--json',
    '--routing-outcome-record',
    routingOutcomeRecordPath
  ]);
  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.source, 'cm0645_explicit_input_fixture_plus_routing_outcome_record_v1');
  assert.equal(payload.routingOutcomeRecordInputTrace.traceAvailable, true);
  assert.equal(payload.routingOutcomeRecordInputTrace.sourceFileName, 'cm0605-routing-outcome-record-v1.md');
  assert.equal(payload.reviewChecklist.W4.passed, true);
  assert.equal(payload.reviewChecklist.W6.passed, false);
  assert.ok(payload.failClosedReasons.includes('token_present_same_baseline_evidence_missing'));
});

test('authorized write-path widening-review CLI can derive widening-review input from an escalated auto-authorization assertion flow', () => {
  const result = runCli([
    '--json',
    '--auto-auth-assertion-record',
    assertionRecordPath,
    '--auto-auth-latest-rebound-outcome-class',
    'token_present'
  ]);
  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.source, 'cm0662_explicit_input_fixture_plus_auto_authorization_escalation_bridge_v1');
  assert.equal(payload.decision, 'WIDENING_REVIEW_PASSED_ADOPTION_NOT_GRANTED');
  assert.equal(payload.status, 'passed_adoption_not_granted');
  assert.equal(payload.cm0604Satisfied, true);
  assert.equal(payload.cm0606BridgeActivated, false);
  assert.equal(payload.proceedToCm0607AdoptionRecord, false);
  assert.equal(payload.routingOutcomeRecordInputTrace.traceAvailable, true);
  assert.equal(payload.routingOutcomeRecordInputTrace.sourceFormat, 'cm0662_auto_authorization_escalation_bridge_v1');
  assert.equal(payload.routingOutcomeRecordInputTrace.sourceFileName, 'external-token-material-assertion-record-v1.json');
  assert.equal(
    payload.routingOutcomeRecordInputTrace.sourceWorkspaceRelativePath,
    '.\\tests\\fixtures\\external-token-material-assertion-record-v1.json'
  );
  assert.equal(payload.reviewChecklist.W4.passed, true);
  assert.equal(payload.reviewChecklist.W6.passed, true);
  assert.equal(payload.reviewChecklist.W10.passed, false);
  assert.ok(payload.failClosedReasons.includes('bounded_durable_write_crossing_not_granted'));
  assert.equal(payload.canAutoAuthorizeCm0595, false);
  assert.equal(payload.canExecuteRuntimeNow, false);
});

test('authorized write-path widening-review CLI rejects execute and CM-0595 flags', () => {
  for (const flag of ['--execute', '--cm0595']) {
    const result = runCli([flag]);
    assert.notEqual(result.status, 0);

    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, 'error');
    assert.equal(payload.rejectedFlag, flag);
  }
});

test('authorized write-path widening-review CLI help exits 0', () => {
  const result = runCli(['--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: node src\/cli\/authorized-write-path-widening-review\.js/);
});
