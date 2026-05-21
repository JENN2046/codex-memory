const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const cliPath = path.join('src', 'cli', 'authorized-write-path-auto-authorization.js');
const fixturePath = path.join(
  __dirname,
  'fixtures',
  'authorized-write-path-auto-authorization-preflight-v1.json'
);
const assertionRecordFixturePath = path.join(
  __dirname,
  'fixtures',
  'external-token-material-assertion-record-v1.json'
);
const assertionRecordMarkdownFixturePath = path.join(
  __dirname,
  'fixtures',
  'external-token-material-assertion-record-v1.md'
);

function runCli(args = []) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    timeout: 30000
  });
}

function parseJsonResult(result) {
  return JSON.parse(result.stdout);
}

test('authorized write-path auto-authorization CLI fixture parses', () => {
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  assert.equal(fixture.schemaVersion, 'cm61-authorized-write-path-auto-authorization-preflight-v1');
  assert.equal(fixture.mode, 'cm0601_auto_reuse_preflight');
  assert.equal(fixture.operatorFacingState, 'RC_NOT_READY_BLOCKED');
  assert.equal(fixture.latestReboundOutcomeClass, 'token_missing');
});

test('authorized write-path auto-authorization CLI reports current fail-closed state by default', () => {
  const result = runCli(['--json']);

  assert.equal(result.status, 0, result.stderr || 'non-zero exit');
  const report = parseJsonResult(result);
  assert.equal(report.status, 'blocked_fail_closed');
  assert.equal(report.decision, 'RC_NOT_READY_BLOCKED');
  assert.equal(report.allowedGovernanceOutput, 'NO_AUTO_APPROVAL_ISSUED');
  assert.equal(report.assertionRecordInputTrace, null);
  assert.equal(report.operatorActionPlan.currentStage, 'await_cm0611_assertion_record');
  assert.equal(report.assertionRecordPreview.previewAvailable, true);
  assert.equal(report.assertionRecordPreview.previewUsableNow, true);
  assert.equal(report.approvalLinePreview.previewAvailable, true);
  assert.equal(report.approvalLinePreview.previewUsableNow, false);
  assert.equal(report.issuanceRecordPreview.previewAvailable, true);
  assert.equal(report.issuanceRecordPreview.previewUsableNow, false);
  assert.equal(report.routingOutcomePreview.previewAvailable, true);
  assert.equal(report.routingOutcomePreview.previewUsableNow, false);
  assert.equal(report.wideningReviewPreview.previewAvailable, true);
  assert.equal(report.wideningReviewPreview.previewUsableNow, false);
  assert.equal(report.recordDrafts.cm0614Issuance.draftAvailable, true);
  assert.equal(report.recordDrafts.cm0614Issuance.draftUsableNow, false);
  assert.equal(report.recordDrafts.cm0611AssertionRecord.draftAvailable, true);
  assert.equal(report.recordDrafts.cm0611AssertionRecord.draftUsableNow, true);
  assert.equal(report.renderedArtifactTextSurface.previewAvailable, true);
  assert.equal(report.renderedArtifactTextSurface.selectedDraftId, 'cm0611AssertionRecord');
  assert.equal(report.renderedArtifactTextSurface.selectedDraftUsableNow, true);
  assert.match(report.renderedArtifactTextSurface.selectedDraftMarkdown, /## Assertion Summary/);
  assert.match(report.renderedArtifactTextSurface.selectedDraftMarkdown, /## Command Preview/);
  assert.equal(report.renderedOperatorPacketTextSurface.previewAvailable, true);
  assert.equal(report.renderedOperatorPacketTextSurface.previewUsableNow, true);
  assert.equal(report.renderedOperatorPacketTextSurface.packetKind, 'assertion_record_operator_packet');
  assert.equal(report.renderedOperatorPacketTextSurface.selectedDraftId, 'cm0611AssertionRecord');
  assert.match(report.renderedOperatorPacketTextSurface.markdown, /## Command Preview/);
  assert.match(report.renderedOperatorPacketTextSurface.markdown, /resolved assertion record path mode: `placeholder_only`/);
  assert.equal(report.renderedOperatorBriefTextSurface.previewAvailable, true);
  assert.equal(report.renderedOperatorBriefTextSurface.previewUsableNow, true);
  assert.equal(report.renderedOperatorBriefTextSurface.briefKind, 'assertion_record_only__assertion_record_operator_packet');
  assert.match(report.renderedOperatorBriefTextSurface.markdown, /## Current Operator Packet/);
  assert.match(report.renderedOperatorBriefTextSurface.markdown, /## Selected Artifact Draft/);
  assert.equal(report.artifactBundleDraft.bundleAvailable, true);
  assert.equal(report.artifactBundleDraft.bundleKind, 'assertion_record_only');
  assert.equal(report.commandPreviewBundle.bundleKind, 'assertion_record_command_bundle');
  assert.equal(report.commandPreviewBundle.primaryCommandId, 'helper_assertion_record_review');
  assert.match(report.commandPreviewBundle.primaryCommand, /authorized-write-path-auto-authorization\.js --json --assertion-record <CM0611_assertion_record_path>/);
  assert.equal(report.operatorPacketDraft.packetKind, 'assertion_record_operator_packet');
  assert.equal(report.operatorPacketDraft.packetUsableNow, true);
  assert.match(report.approvalLinePreview.exactApprovalLine, /授权执行 CM-0601/);
  assert.equal(report.checklist.C6.passed, false);
  assert.equal(report.exactCm0601LineReusable, false);
  assert.equal(report.canAutoAuthorizeCm0595, false);
});

test('authorized write-path auto-authorization CLI can evaluate a temp fixture that becomes CM-0601 auto-reuse eligible', async () => {
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  fixture.externalAssertion = {
    asserted: true,
    assertionClass: 'OPERATOR_EXPLICIT_CURRENT_SESSION_ASSERTION',
    assertedCurrentSessionOnly: true,
    assertedIndependentOfPacket: true,
    assertedNoBindingRequested: true,
    assertedNoPersistenceRequested: true,
    assertedScopeStillCm0601Only: true,
    assertedNoStartupHealthWriteRecallRequested: true,
    assertedAt: '2026-05-20T12:00:00.000Z'
  };

  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'cm61-auto-auth-'));
  const tempFixturePath = path.join(tempDir, 'fixture.json');
  await fs.promises.writeFile(tempFixturePath, JSON.stringify(fixture, null, 2), 'utf8');

  const result = runCli(['--json', '--fixture', tempFixturePath]);
  assert.equal(result.status, 0, result.stderr || 'non-zero exit');
  const report = parseJsonResult(result);
  assert.equal(report.allowedGovernanceOutput, 'AUTO_REUSE_CM0601_LINE_ONLY');
  assert.equal(report.status, 'auto_reuse_cm0601_line_only');
  assert.equal(report.operatorActionPlan.currentStage, 'cm0601_line_reuse_ready');
  assert.equal(report.assertionRecordPreview.previewAvailable, true);
  assert.equal(report.assertionRecordPreview.previewUsableNow, false);
  assert.equal(report.approvalLinePreview.previewAvailable, true);
  assert.equal(report.approvalLinePreview.previewUsableNow, true);
  assert.equal(report.issuanceRecordPreview.previewAvailable, true);
  assert.equal(report.issuanceRecordPreview.previewUsableNow, true);
  assert.equal(report.routingOutcomePreview.previewAvailable, true);
  assert.equal(report.routingOutcomePreview.previewUsableNow, true);
  assert.equal(report.wideningReviewPreview.previewAvailable, true);
  assert.equal(report.wideningReviewPreview.previewUsableNow, false);
  assert.equal(report.recordDrafts.cm0614Issuance.draftUsableNow, true);
  assert.equal(report.recordDrafts.cm0615RoutingOutcome.draftUsableNow, true);
  assert.equal(report.recordDrafts.cm0616WideningReview.draftUsableNow, false);
  assert.equal(report.renderedArtifactTextSurface.selectedDraftId, 'cm0614Issuance');
  assert.equal(report.renderedArtifactTextSurface.selectedDraftUsableNow, true);
  assert.match(report.renderedArtifactTextSurface.selectedDraftMarkdown, /## Issued approval text/);
  assert.match(report.renderedArtifactTextSurface.selectedDraftMarkdown, /source workspace-relative path: `none`/);
  assert.match(report.renderedArtifactTextSurface.selectedDraftMarkdown, /## Command Preview/);
  assert.equal(report.renderedOperatorPacketTextSurface.previewAvailable, true);
  assert.equal(report.renderedOperatorPacketTextSurface.previewUsableNow, true);
  assert.equal(report.renderedOperatorPacketTextSurface.packetKind, 'cm0601_reuse_operator_packet');
  assert.equal(report.renderedOperatorPacketTextSurface.selectedDraftId, 'cm0614Issuance');
  assert.match(report.renderedOperatorPacketTextSurface.markdown, /AUTO_REUSE_CM0601_LINE_ONLY/);
  assert.equal(report.renderedOperatorBriefTextSurface.previewAvailable, true);
  assert.equal(report.renderedOperatorBriefTextSurface.previewUsableNow, true);
  assert.equal(report.renderedOperatorBriefTextSurface.briefKind, 'cm0601_reuse_ready_bundle__cm0601_reuse_operator_packet');
  assert.match(report.renderedOperatorBriefTextSurface.markdown, /## Current Operator Packet/);
  assert.match(report.renderedOperatorBriefTextSurface.markdown, /## Selected Artifact Draft/);
  assert.equal(report.artifactBundleDraft.bundleKind, 'cm0601_reuse_ready_bundle');
  assert.equal(report.commandPreviewBundle.bundleKind, 'cm0601_reuse_review_command_bundle');
  assert.equal(report.commandPreviewBundle.primaryCommandId, 'governance_report_assertion_record_review');
  assert.equal(report.commandPreviewBundle.resolvedAssertionRecordPathMode, 'placeholder_only');
  assert.equal(report.operatorPacketDraft.packetKind, 'cm0601_reuse_operator_packet');
  assert.equal(report.operatorPacketDraft.packetUsableNow, true);
  assert.equal(report.exactCm0601LineReusable, true);
  assert.equal(report.canAutoAuthorizeCm0595, false);
});

test('authorized write-path auto-authorization CLI can adapt an explicit CM-0611-style assertion record', () => {
  const result = runCli([
    '--json',
    '--assertion-record',
    assertionRecordFixturePath
  ]);

  assert.equal(result.status, 0, result.stderr || 'non-zero exit');
  const report = parseJsonResult(result);
  assert.equal(report.sourceMode, 'explicit_input_fixture_plus_assertion_record');
  assert.equal(report.assertionRecordInputTrace.traceAvailable, true);
  assert.equal(report.assertionRecordInputTrace.sourceFormat, 'json_assertion_record_v1');
  assert.equal(report.assertionRecordInputTrace.sourceFileName, 'external-token-material-assertion-record-v1.json');
  assert.equal(report.assertionRecordInputTrace.assertionAcceptedForC6, true);
  assert.equal(report.allowedGovernanceOutput, 'AUTO_REUSE_CM0601_LINE_ONLY');
  assert.equal(report.operatorActionPlan.currentStage, 'cm0601_line_reuse_ready');
  assert.equal(report.assertionRecordPreview.previewAvailable, true);
  assert.equal(report.assertionRecordPreview.previewUsableNow, false);
  assert.equal(report.externalAssertionAccepted, true);
  assert.equal(report.renderedArtifactTextSurface.selectedDraftId, 'cm0614Issuance');
  assert.match(
    report.renderedArtifactTextSurface.selectedDraftMarkdown,
    /source workspace-relative path: `\.\\tests\\fixtures\\external-token-material-assertion-record-v1\.json`/
  );
  assert.match(
    report.renderedArtifactTextSurface.selectedDraftMarkdown,
    /governance-report command: `node \.\\src\\cli\\governance-report\.js --json --auto-auth-assertion-record \.\\tests\\fixtures\\external-token-material-assertion-record-v1\.json`/
  );
  assert.equal(report.approvalLinePreview.previewUsableNow, true);
  assert.equal(report.issuanceRecordPreview.previewUsableNow, true);
  assert.equal(report.routingOutcomePreview.previewUsableNow, true);
  assert.equal(report.wideningReviewPreview.previewUsableNow, false);
  assert.equal(report.recordDrafts.cm0614Issuance.draftUsableNow, true);
  assert.equal(report.artifactBundleDraft.bundleKind, 'cm0601_reuse_ready_bundle');
  assert.equal(
    report.artifactBundleDraft.selectedArtifacts.assertionRecordInputTrace.sourceFileName,
    'external-token-material-assertion-record-v1.json'
  );
  assert.equal(report.commandPreviewBundle.bundleKind, 'cm0601_reuse_review_command_bundle');
  assert.equal(report.commandPreviewBundle.resolvedAssertionRecordPathMode, 'workspace_relative');
  assert.equal(
    report.commandPreviewBundle.resolvedAssertionRecordPath,
    '.\\tests\\fixtures\\external-token-material-assertion-record-v1.json'
  );
  assert.match(
    report.commandPreviewBundle.primaryCommand,
    /governance-report\.js --json --auto-auth-assertion-record \.\\tests\\fixtures\\external-token-material-assertion-record-v1\.json/
  );
  assert.match(report.renderedOperatorPacketTextSurface.markdown, /resolved assertion record path mode: `workspace_relative`/);
  assert.match(
    report.renderedOperatorPacketTextSurface.markdown,
    /governance-report command: `node \.\\src\\cli\\governance-report\.js --json --auto-auth-assertion-record \.\\tests\\fixtures\\external-token-material-assertion-record-v1\.json`/
  );
  assert.equal(report.renderedOperatorBriefTextSurface.briefKind, 'cm0601_reuse_ready_bundle__cm0601_reuse_operator_packet');
  assert.equal(report.operatorPacketDraft.packetKind, 'cm0601_reuse_operator_packet');
  assert.equal(
    report.operatorPacketDraft.selectedPayload.assertionRecordInputTrace.sourceFormat,
    'json_assertion_record_v1'
  );
});

test('authorized write-path auto-authorization CLI can adapt a filled CM-0611 markdown record directly', () => {
  const result = runCli([
    '--json',
    '--assertion-record',
    assertionRecordMarkdownFixturePath
  ]);

  assert.equal(result.status, 0, result.stderr || 'non-zero exit');
  const report = parseJsonResult(result);
  assert.equal(report.sourceMode, 'explicit_input_fixture_plus_assertion_record');
  assert.equal(report.assertionRecordInputTrace.traceAvailable, true);
  assert.equal(report.assertionRecordInputTrace.sourceFormat, 'cm0611_markdown_record_v1');
  assert.equal(report.assertionRecordInputTrace.sourceFileName, 'external-token-material-assertion-record-v1.md');
  assert.equal(report.assertionRecordInputTrace.sourceArtifactRef, 'docs/CM-0611_EXTERNAL_TOKEN_MATERIAL_ASSERTION_RECORD_TEMPLATE.md');
  assert.equal(report.assertionRecordInputTrace.assertionAcceptedForC6, true);
  assert.equal(report.allowedGovernanceOutput, 'AUTO_REUSE_CM0601_LINE_ONLY');
  assert.equal(report.operatorActionPlan.currentStage, 'cm0601_line_reuse_ready');
  assert.equal(report.externalAssertionAccepted, true);
  assert.equal(report.renderedArtifactTextSurface.selectedDraftId, 'cm0614Issuance');
  assert.match(
    report.renderedArtifactTextSurface.selectedDraftMarkdown,
    /source workspace-relative path: `\.\\tests\\fixtures\\external-token-material-assertion-record-v1\.md`/
  );
  assert.match(
    report.renderedArtifactTextSurface.selectedDraftMarkdown,
    /governance-report command: `node \.\\src\\cli\\governance-report\.js --json --auto-auth-assertion-record \.\\tests\\fixtures\\external-token-material-assertion-record-v1\.md`/
  );
  assert.equal(report.approvalLinePreview.previewUsableNow, true);
  assert.equal(report.commandPreviewBundle.bundleKind, 'cm0601_reuse_review_command_bundle');
  assert.equal(report.commandPreviewBundle.resolvedAssertionRecordPathMode, 'workspace_relative');
  assert.equal(
    report.commandPreviewBundle.resolvedAssertionRecordPath,
    '.\\tests\\fixtures\\external-token-material-assertion-record-v1.md'
  );
  assert.match(
    report.commandPreviewBundle.primaryCommand,
    /governance-report\.js --json --auto-auth-assertion-record \.\\tests\\fixtures\\external-token-material-assertion-record-v1\.md/
  );
  assert.match(report.renderedOperatorPacketTextSurface.markdown, /resolved assertion record path mode: `workspace_relative`/);
  assert.match(
    report.renderedOperatorPacketTextSurface.markdown,
    /governance-report command: `node \.\\src\\cli\\governance-report\.js --json --auto-auth-assertion-record \.\\tests\\fixtures\\external-token-material-assertion-record-v1\.md`/
  );
  assert.equal(report.operatorPacketDraft.packetKind, 'cm0601_reuse_operator_packet');
  assert.equal(
    report.artifactBundleDraft.selectedArtifacts.assertionRecordInputTrace.sourceArtifactRef,
    'docs/CM-0611_EXTERNAL_TOKEN_MATERIAL_ASSERTION_RECORD_TEMPLATE.md'
  );
  assert.equal(report.renderedOperatorBriefTextSurface.briefKind, 'cm0601_reuse_ready_bundle__cm0601_reuse_operator_packet');
});

test('authorized write-path auto-authorization CLI can combine assertion record input with token-present rebound override', () => {
  const result = runCli([
    '--json',
    '--assertion-record',
    assertionRecordFixturePath,
    '--latest-rebound-outcome-class',
    'token_present'
  ]);

  assert.equal(result.status, 0, result.stderr || 'non-zero exit');
  const report = parseJsonResult(result);
  assert.equal(report.assertionRecordInputTrace.traceAvailable, true);
  assert.equal(report.assertionRecordInputTrace.usedLatestReboundOutcomeOverride, true);
  assert.equal(report.assertionRecordInputTrace.latestReboundOutcomeOverride, 'token_present');
  assert.equal(report.allowedGovernanceOutput, 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW');
  assert.equal(report.status, 'escalate_for_future_widening_review');
  assert.equal(report.operatorActionPlan.currentStage, 'cm0604_widening_review_ready');
  assert.equal(report.assertionRecordPreview.previewAvailable, true);
  assert.equal(report.assertionRecordPreview.previewUsableNow, false);
  assert.equal(report.approvalLinePreview.previewUsableNow, false);
  assert.equal(report.issuanceRecordPreview.previewUsableNow, false);
  assert.equal(report.routingOutcomePreview.previewUsableNow, true);
  assert.equal(report.wideningReviewPreview.previewUsableNow, true);
  assert.equal(report.recordDrafts.cm0616WideningReview.draftUsableNow, true);
  assert.equal(report.renderedArtifactTextSurface.selectedDraftId, 'cm0616WideningReview');
  assert.match(report.renderedArtifactTextSurface.selectedDraftMarkdown, /## CM-0604 gate review/);
  assert.match(report.renderedArtifactTextSurface.selectedDraftMarkdown, /## Command Preview/);
  assert.equal(report.renderedOperatorPacketTextSurface.previewAvailable, true);
  assert.equal(report.renderedOperatorPacketTextSurface.previewUsableNow, true);
  assert.equal(report.renderedOperatorPacketTextSurface.packetKind, 'widening_review_operator_packet');
  assert.equal(report.renderedOperatorPacketTextSurface.selectedDraftId, 'cm0616WideningReview');
  assert.match(report.renderedOperatorPacketTextSurface.markdown, /ESCALATE_FOR_FUTURE_WIDENING_REVIEW/);
  assert.equal(report.renderedOperatorBriefTextSurface.previewAvailable, true);
  assert.equal(report.renderedOperatorBriefTextSurface.previewUsableNow, true);
  assert.equal(report.renderedOperatorBriefTextSurface.briefKind, 'widening_review_ready_bundle__widening_review_operator_packet');
  assert.equal(report.artifactBundleDraft.bundleKind, 'widening_review_ready_bundle');
  assert.equal(report.commandPreviewBundle.bundleKind, 'widening_review_review_command_bundle');
  assert.equal(report.operatorPacketDraft.packetKind, 'widening_review_operator_packet');
});

test('authorized write-path auto-authorization CLI fails closed for malformed assertion record input', async () => {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'cm61-assertion-record-'));
  const tempRecordPath = path.join(tempDir, 'bad-assertion-record.json');
  await fs.promises.writeFile(tempRecordPath, JSON.stringify({
    schemaVersion: 'bad',
    unit: 'CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_001'
  }, null, 2), 'utf8');

  const result = runCli([
    '--json',
    '--assertion-record',
    tempRecordPath
  ]);

  assert.equal(result.status, 1, 'malformed assertion record should fail');
  const report = parseJsonResult(result);
  assert.equal(report.status, 'error');
  assert.ok(report.failClosedReasons.includes('assertion_record_schema_version_mismatch'));
});

test('authorized write-path auto-authorization CLI rejects runtime or widening flags', () => {
  for (const flag of [
    '--execute',
    '--record-memory',
    '--search-memory',
    '--provider',
    '--start-service',
    '--write',
    '--apply',
    '--cm0595'
  ]) {
    const result = runCli([flag]);

    assert.equal(result.status, 1, `${flag} should fail`);
    const report = parseJsonResult(result);
    assert.equal(report.status, 'error');
    assert.equal(report.mutated, false);
    assert.equal(report.rejectedFlag, flag);
  }
});

test('authorized write-path auto-authorization CLI help exits 0 without JSON', () => {
  const result = runCli(['--help']);

  assert.equal(result.status, 0, result.stderr || 'non-zero exit');
  assert.match(result.stdout, /Usage: node src\/cli\/authorized-write-path-auto-authorization\.js/);
  assert.match(result.stdout, /assertion-record PATH/);
  assert.match(result.stdout, /latest rebound outcome overrides/i);
  assert.match(result.stdout, /never auto-authorizes CM-0595/);
  assert.throws(() => JSON.parse(result.stdout), SyntaxError);
});

test('authorized write-path auto-authorization CLI can render current operator packet text in default text mode', () => {
  const result = runCli(['--rendered-operator-packet-text']);

  assert.equal(result.status, 0, result.stderr || 'non-zero exit');
  assert.match(result.stdout, /\[rendered-operator-packet-text\]/);
  assert.match(result.stdout, /^Status: RC_NOT_READY_BLOCKED/m);
  assert.match(result.stdout, /## Command Preview/);
  assert.match(result.stdout, /Current stage: await_cm0611_assertion_record/);
});

test('authorized write-path auto-authorization CLI can render current operator artifact text in default text mode', () => {
  const result = runCli(['--rendered-operator-artifact-text']);

  assert.equal(result.status, 0, result.stderr || 'non-zero exit');
  assert.match(result.stdout, /\[rendered-operator-artifact-text\]/);
  assert.match(result.stdout, /^Status: DRAFT_ASSERTION_NOT_RECORDED/m);
  assert.match(result.stdout, /## Assertion Summary/);
  assert.match(result.stdout, /## Command Preview/);
  assert.match(result.stdout, /assertionClass: <fill>/);
});

test('authorized write-path auto-authorization CLI can render current operator brief text in default text mode', () => {
  const result = runCli(['--rendered-operator-brief-text']);

  assert.equal(result.status, 0, result.stderr || 'non-zero exit');
  assert.match(result.stdout, /\[rendered-operator-brief-text\]/);
  assert.match(result.stdout, /^Status: RC_NOT_READY_BLOCKED/m);
  assert.match(result.stdout, /## Current Operator Packet/);
  assert.match(result.stdout, /## Selected Artifact Draft/);
});
