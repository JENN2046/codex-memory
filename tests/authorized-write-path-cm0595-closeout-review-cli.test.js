const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const cliPath = path.resolve(
  __dirname,
  '..',
  'src',
  'cli',
  'authorized-write-path-cm0595-closeout-review.js'
);
const wideningAdoptionRecordPath = path.resolve(
  __dirname,
  'fixtures',
  'cm0607-widening-adoption-record-v1.md'
);
const cm0595IssuanceRecordPath = path.resolve(
  __dirname,
  'fixtures',
  'cm0649-cm0595-approval-issuance-record-v1.md'
);
const cm0595ExecutionEvidenceRecordPath = path.resolve(
  __dirname,
  'fixtures',
  'cm0650-cm0595-execution-evidence-record-v1.md'
);

function runCli(args = []) {
  return childProcess.spawnSync(process.execPath, [cliPath, ...args], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8'
  });
}

test('authorized write-path CM-0595 closeout-review CLI reports current fail-closed state by default', () => {
  const result = runCli(['--json']);
  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, 'blocked_fail_closed');
  assert.equal(payload.decision, 'CM0595_CLOSEOUT_NOT_READY');
  assert.equal(payload.cm0595CloseoutReady, false);
  assert.equal(payload.canPrepareBoundedRecallNext, false);
  assert.equal(payload.canExecuteBoundedRecallNow, false);
  assert.equal(payload.canExecuteRuntimeNow, false);
});

test('authorized write-path CM-0595 closeout-review CLI can render current closeout text in text mode', () => {
  const result = runCli(['--rendered-closeout-text']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /\[rendered-closeout-text\]/);
  assert.match(result.stdout, /CM0595_CLOSEOUT_NOT_READY/);
});

test('authorized write-path CM-0595 closeout-review CLI can consume later adoption, issuance, and execution evidence while keeping runtime blocked', () => {
  const result = runCli([
    '--json',
    '--widening-adoption-record',
    wideningAdoptionRecordPath,
    '--cm0595-issuance-record',
    cm0595IssuanceRecordPath,
    '--cm0595-execution-evidence-record',
    cm0595ExecutionEvidenceRecordPath
  ]);
  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(
    payload.source,
    'cm0654_explicit_input_fixture_plus_widening_adoption_record_plus_cm0595_issuance_record_plus_cm0595_execution_evidence_record_v1'
  );
  assert.equal(payload.wideningAdoptionRecordInputTrace.traceAvailable, true);
  assert.equal(payload.cm0595IssuanceRecordInputTrace.traceAvailable, true);
  assert.equal(payload.cm0595ExecutionEvidenceInputTrace.traceAvailable, true);
  assert.equal(payload.decision, 'CM0595_CLOSEOUT_RECORDED_EXACTLY_ONE_WRITE_ONLY');
  assert.equal(payload.cm0595CloseoutReady, true);
  assert.equal(payload.canPrepareBoundedRecallNext, true);
  assert.equal(payload.canExecuteBoundedRecallNow, false);
  assert.equal(payload.canExecuteRuntimeNow, false);
  assert.match(payload.renderedCloseoutTextSurface.markdown, /durable memory writes: `1`/);
  assert.match(payload.renderedCloseoutTextSurface.markdown, /bounded recall may execute now: `no`/);
});

test('authorized write-path CM-0595 closeout-review CLI rejects execute and bounded-recall flags', () => {
  for (const flag of ['--execute', '--execute-bounded-recall']) {
    const result = runCli([flag]);
    assert.notEqual(result.status, 0);

    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, 'error');
    assert.equal(payload.rejectedFlag, flag);
  }
});

test('authorized write-path CM-0595 closeout-review CLI help exits 0', () => {
  const result = runCli(['--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: node src\/cli\/authorized-write-path-cm0595-closeout-review\.js/);
});
