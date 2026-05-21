const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const cliPath = path.resolve(
  __dirname,
  '..',
  'src',
  'cli',
  'authorized-write-path-widening-adoption-review.js'
);
const wideningReviewRecordPath = path.resolve(
  __dirname,
  'fixtures',
  'cm0616-widening-review-outcome-record-v1.md'
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

test('authorized write-path widening-adoption CLI reports current fail-closed state by default', () => {
  const result = runCli(['--json']);
  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, 'blocked_fail_closed');
  assert.equal(payload.decision, 'WIDENING_ADOPTION_NOT_READY');
  assert.equal(payload.renderedAdoptionTextSurface.previewAvailable, true);
  assert.equal(payload.cm0595ApprovalLinePreview.previewAvailable, true);
  assert.equal(payload.cm0595ApprovalLinePreview.previewUsableNow, false);
  assert.equal(payload.cm0595OperatorPacketDraft.packetKind, 'cm0595_operator_packet_blocked');
  assert.equal(payload.cm0595IssuanceRecordDraft.draftUsableNow, false);
  assert.equal(payload.cm0595ExecutionEvidenceDraft.draftUsableNow, false);
});

test('authorized write-path widening-adoption CLI can render current adoption text in text mode', () => {
  const result = runCli(['--rendered-adoption-text']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /\[rendered-adoption-text\]/);
  assert.match(result.stdout, /WIDENING_ADOPTION_NOT_READY/);
});

test('authorized write-path widening-adoption CLI can consume a CM-0616 widening-review record and keep the adoption review fail-closed', () => {
  const result = runCli([
    '--json',
    '--widening-review-record',
    wideningReviewRecordPath
  ]);
  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.source, 'cm0646_explicit_input_fixture_plus_widening_review_record_v1');
  assert.equal(payload.wideningReviewRecordInputTrace.traceAvailable, true);
  assert.equal(payload.wideningReviewRecordInputTrace.sourceFileName, 'cm0616-widening-review-outcome-record-v1.md');
  assert.equal(payload.adoptionChecklist.A4.passed, true);
  assert.equal(payload.adoptionChecklist.A6.passed, false);
  assert.ok(payload.failClosedReasons.includes('token_present_same_baseline_evidence_missing'));
});

test('authorized write-path widening-adoption CLI can consume both CM-0616 and CM-0607 records and grant CM-0595 only in governance space', () => {
  const result = runCli([
    '--json',
    '--widening-review-record',
    wideningReviewRecordPath,
    '--widening-adoption-record',
    wideningAdoptionRecordPath
  ]);
  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(
    payload.source,
    'cm0647_explicit_input_fixture_plus_widening_review_record_plus_widening_adoption_record_v1'
  );
  assert.equal(payload.wideningReviewRecordInputTrace.traceAvailable, true);
  assert.equal(payload.wideningAdoptionRecordInputTrace.traceAvailable, true);
  assert.equal(payload.adoptionChecklist.A4.passed, true);
  assert.equal(payload.adoptionChecklist.A6.passed, true);
  assert.equal(payload.adoptionChecklist.A10.passed, true);
  assert.equal(payload.decision, 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY');
  assert.equal(payload.canAutoAuthorizeCm0595, true);
  assert.equal(payload.cm0595ApprovalLinePreview.previewUsableNow, true);
  assert.equal(payload.cm0595CommandPreviewBundle.resolvedRecordPathMode, 'workspace_relative_pair');
  assert.equal(payload.cm0595OperatorPacketDraft.packetKind, 'cm0595_auto_authorization_operator_packet');
  assert.equal(payload.cm0595IssuanceRecordDraft.draftUsableNow, true);
  assert.equal(payload.cm0595ExecutionEvidenceDraft.draftUsableNow, true);
  assert.match(payload.renderedCm0595OperatorPacketTextSurface.markdown, /授权执行 CM-0595/);
  assert.match(payload.renderedCm0595OperatorPacketTextSurface.markdown, /## Next Record Drafts/);
});

test('authorized write-path widening-adoption CLI can consume a CM-0649 issuance record as later-stage provenance only', () => {
  const result = runCli([
    '--json',
    '--widening-review-record',
    wideningReviewRecordPath,
    '--widening-adoption-record',
    wideningAdoptionRecordPath,
    '--cm0595-issuance-record',
    cm0595IssuanceRecordPath
  ]);
  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(
    payload.source,
    'cm0652_explicit_input_fixture_plus_widening_review_record_plus_widening_adoption_record_plus_cm0595_issuance_record_v1'
  );
  assert.equal(payload.cm0595IssuanceRecordInputTrace.traceAvailable, true);
  assert.equal(payload.cm0595IssuanceRecordInputTrace.sourceFileName, 'cm0649-cm0595-approval-issuance-record-v1.md');
  assert.equal(payload.cm0595IssuanceRecordInputTrace.exactLineIssued, true);
  assert.equal(payload.decision, 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY');
  assert.match(payload.renderedCm0595OperatorPacketTextSurface.markdown, /issued CM-0595 record path: `\.\\tests\\fixtures\\cm0649-cm0595-approval-issuance-record-v1\.md`/);
});

test('authorized write-path widening-adoption CLI can consume a CM-0650 execution evidence record as later-stage provenance only', () => {
  const result = runCli([
    '--json',
    '--widening-review-record',
    wideningReviewRecordPath,
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
    'cm0653_explicit_input_fixture_plus_widening_review_record_plus_widening_adoption_record_plus_cm0595_issuance_record_plus_cm0595_execution_evidence_record_v1'
  );
  assert.equal(payload.cm0595ExecutionEvidenceInputTrace.traceAvailable, true);
  assert.equal(payload.cm0595ExecutionEvidenceInputTrace.sourceFileName, 'cm0650-cm0595-execution-evidence-record-v1.md');
  assert.equal(payload.cm0595ExecutionEvidenceInputTrace.durableMemoryWriteCount, 1);
  assert.equal(payload.decision, 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY');
  assert.match(payload.renderedCm0595OperatorPacketTextSurface.markdown, /CM-0595 execution evidence path: `\.\\tests\\fixtures\\cm0650-cm0595-execution-evidence-record-v1\.md`/);
  assert.match(result.stdout, /"cm0595ExecutionEvidenceInputTrace"/);
});

test('authorized write-path widening-adoption CLI rejects execute and CM-0595 flags', () => {
  for (const flag of ['--execute', '--cm0595']) {
    const result = runCli([flag]);
    assert.notEqual(result.status, 0);

    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, 'error');
    assert.equal(payload.rejectedFlag, flag);
  }
});

test('authorized write-path widening-adoption CLI help exits 0', () => {
  const result = runCli(['--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: node src\/cli\/authorized-write-path-widening-adoption-review\.js/);
});
