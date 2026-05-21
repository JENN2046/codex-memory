const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  ACCEPTED_ASSERTION_CLASSES,
  EXPECTED_CONTROLLING_MAP,
  EXPECTED_MODE,
  EXPECTED_OPERATOR_STATE,
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_TARGET_BASELINE,
  REQUIRED_STILL_OUT_OF_SCOPE_ACTIONS,
  evaluateAuthorizedWritePathAutoAuthorizationPreflight,
  normalizeAuthorizedWritePathAutoAuthorizationPreflightInput
} = require('../src/core/AuthorizedWritePathAutoAuthorizationPreflight');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'authorized-write-path-auto-authorization-preflight-v1.json'
);

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function buildInput(overrides = {}) {
  return {
    ...loadFixture(),
    ...overrides
  };
}

test('authorized write-path auto-authorization fixture captures current blocked state', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.equal(fixture.mode, EXPECTED_MODE);
  assert.equal(fixture.controllingMap, EXPECTED_CONTROLLING_MAP);
  assert.equal(fixture.operatorFacingState, EXPECTED_OPERATOR_STATE);
  assert.equal(fixture.targetBaseline, EXPECTED_TARGET_BASELINE);
  assert.equal(fixture.sameBaselineEndpointStartupEvidenceAvailable, true);
  assert.equal(fixture.latestReboundOutcomeClass, 'token_missing');
  assert.equal(fixture.externalAssertion.asserted, false);
});

test('auto-authorization preflight stays fail-closed for the current no-assertion state', () => {
  const result = evaluateAuthorizedWritePathAutoAuthorizationPreflight(buildInput());

  assert.equal(result.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.equal(result.sourceMode, 'explicit_input');
  assert.equal(result.status, 'blocked_fail_closed');
  assert.equal(result.decision, 'RC_NOT_READY_BLOCKED');
  assert.equal(result.allowedGovernanceOutput, 'NO_AUTO_APPROVAL_ISSUED');
  assert.equal(result.assertionRecordPreview.previewAvailable, true);
  assert.equal(result.assertionRecordPreview.previewUsableNow, true);
  assert.equal(result.approvalLinePreview.previewAvailable, true);
  assert.equal(result.approvalLinePreview.previewUsableNow, false);
  assert.equal(result.issuanceRecordPreview.previewAvailable, true);
  assert.equal(result.issuanceRecordPreview.previewUsableNow, false);
  assert.equal(result.routingOutcomePreview.previewAvailable, true);
  assert.equal(result.routingOutcomePreview.previewUsableNow, false);
  assert.equal(result.wideningReviewPreview.previewAvailable, true);
  assert.equal(result.wideningReviewPreview.previewUsableNow, false);
  assert.equal(result.recordDrafts.cm0614Issuance.draftAvailable, true);
  assert.equal(result.recordDrafts.cm0614Issuance.draftUsableNow, false);
  assert.equal(result.recordDrafts.cm0611AssertionRecord.draftAvailable, true);
  assert.equal(result.recordDrafts.cm0611AssertionRecord.draftUsableNow, true);
  assert.equal(result.recordDrafts.cm0611AssertionRecord.assertedNoStartupHealthWriteRecallRequested, false);
  assert.equal(result.renderedArtifactTextSurface.previewAvailable, true);
  assert.equal(result.renderedArtifactTextSurface.selectedDraftId, 'cm0611AssertionRecord');
  assert.equal(result.renderedArtifactTextSurface.selectedDraftUsableNow, true);
  assert.match(result.renderedArtifactTextSurface.selectedDraftMarkdown, /^Status: DRAFT_ASSERTION_NOT_RECORDED/m);
  assert.match(result.renderedArtifactTextSurface.selectedDraftMarkdown, /## Assertion Summary/);
  assert.match(result.renderedArtifactTextSurface.selectedDraftMarkdown, /## Assertion Input Trace/);
  assert.match(result.renderedArtifactTextSurface.selectedDraftMarkdown, /## Command Preview/);
  assert.match(result.renderedArtifactTextSurface.selectedDraftMarkdown, /source workspace-relative path: `none`/);
  assert.match(
    result.renderedArtifactTextSurface.selectedDraftMarkdown,
    /helper review command: `node \.\\src\\cli\\authorized-write-path-auto-authorization\.js --json --assertion-record <CM0611_assertion_record_path>`/
  );
  assert.equal(result.renderedOperatorPacketTextSurface.previewAvailable, true);
  assert.equal(result.renderedOperatorPacketTextSurface.previewUsableNow, true);
  assert.equal(result.renderedOperatorPacketTextSurface.packetKind, 'assertion_record_operator_packet');
  assert.equal(result.renderedOperatorPacketTextSurface.selectedDraftId, 'cm0611AssertionRecord');
  assert.match(result.renderedOperatorPacketTextSurface.markdown, /^Status: RC_NOT_READY_BLOCKED/m);
  assert.match(result.renderedOperatorPacketTextSurface.markdown, /## Command Preview/);
  assert.match(result.renderedOperatorPacketTextSurface.markdown, /resolved assertion record path mode: `placeholder_only`/);
  assert.match(
    result.renderedOperatorPacketTextSurface.markdown,
    /helper review command: `node \.\\src\\cli\\authorized-write-path-auto-authorization\.js --json --assertion-record <CM0611_assertion_record_path>`/
  );
  assert.equal(result.renderedOperatorBriefTextSurface.previewAvailable, true);
  assert.equal(result.renderedOperatorBriefTextSurface.previewUsableNow, true);
  assert.equal(result.renderedOperatorBriefTextSurface.briefKind, 'assertion_record_only__assertion_record_operator_packet');
  assert.equal(result.renderedOperatorBriefTextSurface.selectedDraftId, 'cm0611AssertionRecord');
  assert.match(result.renderedOperatorBriefTextSurface.markdown, /^Status: RC_NOT_READY_BLOCKED/m);
  assert.match(result.renderedOperatorBriefTextSurface.markdown, /## Current Operator Packet/);
  assert.match(result.renderedOperatorBriefTextSurface.markdown, /## Selected Artifact Draft/);
  assert.equal(result.recordDrafts.cm0615RoutingOutcome.draftUsableNow, false);
  assert.equal(result.recordDrafts.cm0616WideningReview.draftUsableNow, false);
  assert.equal(result.artifactBundleDraft.bundleAvailable, true);
  assert.equal(result.artifactBundleDraft.bundleUsableNow, true);
  assert.equal(result.artifactBundleDraft.bundleKind, 'assertion_record_only');
  assert.equal(result.artifactBundleDraft.currentStage, 'await_cm0611_assertion_record');
  assert.match(result.artifactBundleDraft.selectedArtifacts.assertionRecordTemplateRef, /CM-0611/);
  assert.equal(result.commandPreviewBundle.previewAvailable, true);
  assert.equal(result.commandPreviewBundle.previewUsableNow, true);
  assert.equal(result.commandPreviewBundle.bundleKind, 'assertion_record_command_bundle');
  assert.equal(result.commandPreviewBundle.primaryCommandId, 'helper_assertion_record_review');
  assert.match(result.commandPreviewBundle.primaryCommand, /authorized-write-path-auto-authorization\.js --json --assertion-record <CM0611_assertion_record_path>/);
  assert.equal(result.commandPreviewBundle.resolvedAssertionRecordPathMode, 'placeholder_only');
  assert.equal(result.commandPreviewBundle.resolvedAssertionRecordPath, '');
  assert.equal(result.operatorPacketDraft.packetAvailable, true);
  assert.equal(result.operatorPacketDraft.packetUsableNow, true);
  assert.equal(result.operatorPacketDraft.packetKind, 'assertion_record_operator_packet');
  assert.equal(result.operatorActionPlan.currentStage, 'await_cm0611_assertion_record');
  assert.match(result.operatorActionPlan.nextStepRef, /CM-0611/);
  assert.match(result.approvalLinePreview.exactApprovalLine, /授权执行 CM-0601/);
  assert.equal(result.checklistPassed, false);
  assert.equal(result.checklist.C1.passed, true);
  assert.equal(result.checklist.C5.passed, true);
  assert.equal(result.checklist.C6.passed, false);
  assert.equal(result.checklist.C7.passed, true);
  assert.equal(result.checklist.C8.passed, true);
  assert.equal(result.exactCm0601LineReusable, false);
  assert.equal(result.canAutoAuthorizeCm0595, false);
  assert.equal(result.canAutoAuthorizeRecordMemory, false);
  assert.equal(result.canExecuteRuntimeNow, false);
  assert.ok(result.failClosedReasons.includes('external_token_assertion_not_accepted'));
  assert.equal(result.safety.executesCommands, false);
  assert.equal(result.safety.startsServices, false);
  assert.equal(result.readiness.cm0595AutoAuthorizationReady, false);
});

test('auto-authorization preflight allows CM-0601 line reuse only when all checklist items pass and latest rebound is still token-missing', () => {
  const result = evaluateAuthorizedWritePathAutoAuthorizationPreflight(buildInput({
    externalAssertion: {
      asserted: true,
      assertionClass: ACCEPTED_ASSERTION_CLASSES[0],
      assertedCurrentSessionOnly: true,
      assertedIndependentOfPacket: true,
      assertedNoBindingRequested: true,
      assertedNoPersistenceRequested: true,
      assertedScopeStillCm0601Only: true,
      assertedNoStartupHealthWriteRecallRequested: true,
      assertedAt: '2026-05-20T12:00:00.000Z'
    }
  }));

  assert.equal(result.status, 'auto_reuse_cm0601_line_only');
  assert.equal(result.allowedGovernanceOutput, 'AUTO_REUSE_CM0601_LINE_ONLY');
  assert.equal(result.assertionRecordPreview.previewAvailable, true);
  assert.equal(result.assertionRecordPreview.previewUsableNow, false);
  assert.equal(result.approvalLinePreview.previewAvailable, true);
  assert.equal(result.approvalLinePreview.previewUsableNow, true);
  assert.equal(result.issuanceRecordPreview.previewAvailable, true);
  assert.equal(result.issuanceRecordPreview.previewUsableNow, true);
  assert.equal(result.routingOutcomePreview.previewAvailable, true);
  assert.equal(result.routingOutcomePreview.previewUsableNow, true);
  assert.equal(result.wideningReviewPreview.previewAvailable, true);
  assert.equal(result.wideningReviewPreview.previewUsableNow, false);
  assert.equal(result.recordDrafts.cm0614Issuance.draftUsableNow, true);
  assert.equal(result.recordDrafts.cm0614Issuance.issuedApprovalText.includes('授权执行 CM-0601'), true);
  assert.equal(result.recordDrafts.cm0611AssertionRecord.assertedNoStartupHealthWriteRecallRequested, true);
  assert.equal(result.recordDrafts.cm0615RoutingOutcome.draftUsableNow, true);
  assert.equal(result.recordDrafts.cm0616WideningReview.draftUsableNow, false);
  assert.equal(result.renderedArtifactTextSurface.selectedDraftId, 'cm0614Issuance');
  assert.equal(result.renderedArtifactTextSurface.selectedDraftUsableNow, true);
  assert.match(result.renderedArtifactTextSurface.selectedDraftMarkdown, /^Status: DRAFT_NOT_ISSUED/m);
  assert.match(result.renderedArtifactTextSurface.selectedDraftMarkdown, /## Issued approval text/);
  assert.match(result.renderedArtifactTextSurface.selectedDraftMarkdown, /## Command Preview/);
  assert.match(
    result.renderedArtifactTextSurface.selectedDraftMarkdown,
    /governance-report command: `node \.\\src\\cli\\governance-report\.js --json --auto-auth-assertion-record <CM0611_assertion_record_path>`/
  );
  assert.equal(result.renderedOperatorPacketTextSurface.previewAvailable, true);
  assert.equal(result.renderedOperatorPacketTextSurface.previewUsableNow, true);
  assert.equal(result.renderedOperatorPacketTextSurface.packetKind, 'cm0601_reuse_operator_packet');
  assert.equal(result.renderedOperatorPacketTextSurface.selectedDraftId, 'cm0614Issuance');
  assert.match(result.renderedOperatorPacketTextSurface.markdown, /Allowed governance output: AUTO_REUSE_CM0601_LINE_ONLY/);
  assert.match(result.renderedOperatorPacketTextSurface.markdown, /## Exact Approval Line Preview/);
  assert.match(result.renderedOperatorPacketTextSurface.markdown, /resolved assertion record path mode: `placeholder_only`/);
  assert.equal(result.renderedOperatorBriefTextSurface.previewAvailable, true);
  assert.equal(result.renderedOperatorBriefTextSurface.previewUsableNow, true);
  assert.equal(result.renderedOperatorBriefTextSurface.briefKind, 'cm0601_reuse_ready_bundle__cm0601_reuse_operator_packet');
  assert.equal(result.renderedOperatorBriefTextSurface.selectedDraftId, 'cm0614Issuance');
  assert.match(result.renderedOperatorBriefTextSurface.markdown, /## Current Operator Packet/);
  assert.match(result.renderedOperatorBriefTextSurface.markdown, /## Selected Artifact Draft/);
  assert.equal(result.artifactBundleDraft.bundleAvailable, true);
  assert.equal(result.artifactBundleDraft.bundleUsableNow, true);
  assert.equal(result.artifactBundleDraft.bundleKind, 'cm0601_reuse_ready_bundle');
  assert.equal(result.artifactBundleDraft.selectedArtifacts.issuanceRecordDraft?.decision, 'AUTO_REUSED_CM0601_LINE_ISSUED_NOT_EXECUTED');
  assert.equal(result.commandPreviewBundle.previewAvailable, true);
  assert.equal(result.commandPreviewBundle.previewUsableNow, true);
  assert.equal(result.commandPreviewBundle.bundleKind, 'cm0601_reuse_review_command_bundle');
  assert.equal(result.commandPreviewBundle.primaryCommandId, 'governance_report_assertion_record_review');
  assert.match(result.commandPreviewBundle.primaryCommand, /governance-report\.js --json --auto-auth-assertion-record <CM0611_assertion_record_path>/);
  assert.equal(result.commandPreviewBundle.resolvedAssertionRecordPathMode, 'placeholder_only');
  assert.equal(result.operatorPacketDraft.packetAvailable, true);
  assert.equal(result.operatorPacketDraft.packetUsableNow, true);
  assert.equal(result.operatorPacketDraft.packetKind, 'cm0601_reuse_operator_packet');
  assert.equal(result.checklistPassed, true);
  assert.deepEqual(result.checklistFailures, []);
  assert.equal(result.exactCm0601LineReusable, true);
  assert.equal(result.externalAssertionAccepted, true);
  assert.equal(result.operatorActionPlan.currentStage, 'cm0601_line_reuse_ready');
  assert.match(result.operatorActionPlan.nextStepRef, /CM-0601/);
  assert.ok(result.operatorActionPlan.nextStepRefs.some(ref => /CM-0614/.test(ref)));
  assert.equal(result.nextStep, 'reuse_exact_cm0601_approval_line_from_docs');
  assert.equal(result.readiness.cm0601LineReuseReady, true);
  assert.equal(result.readiness.cm0595AutoAuthorizationReady, false);
});

test('auto-authorization preflight folds explicit assertion input trace into bundle and packet surfaces when provided', () => {
  const assertionRecordInputTrace = {
    traceAvailable: true,
    sourceFormat: 'json_assertion_record_v1',
    sourceFileName: 'external-token-material-assertion-record-v1.json',
    sourceMode: 'explicit_assertion_record_input',
    sourceWorkspaceRelativePath: '.\\tests\\fixtures\\external-token-material-assertion-record-v1.json',
    assertionAcceptedForC6: true,
    usedLatestReboundOutcomeOverride: false,
    latestReboundOutcomeOverride: ''
  };
  const result = evaluateAuthorizedWritePathAutoAuthorizationPreflight(buildInput({
    externalAssertion: {
      asserted: true,
      assertionClass: ACCEPTED_ASSERTION_CLASSES[0],
      assertedCurrentSessionOnly: true,
      assertedIndependentOfPacket: true,
      assertedNoBindingRequested: true,
      assertedNoPersistenceRequested: true,
      assertedScopeStillCm0601Only: true,
      assertedNoStartupHealthWriteRecallRequested: true,
      assertedAt: '2026-05-20T12:00:00.000Z'
    }
  }), {
    assertionRecordInputTrace
  });

  assert.deepEqual(
    result.artifactBundleDraft.selectedArtifacts.assertionRecordInputTrace,
    assertionRecordInputTrace
  );
  assert.deepEqual(
    result.operatorPacketDraft.selectedPayload.assertionRecordInputTrace,
    assertionRecordInputTrace
  );
  assert.match(result.renderedArtifactTextSurface.selectedDraftMarkdown, /## Assertion Input Trace/);
  assert.match(
    result.renderedArtifactTextSurface.selectedDraftMarkdown,
    /source workspace-relative path: `\.\\tests\\fixtures\\external-token-material-assertion-record-v1\.json`/
  );
  assert.match(result.renderedOperatorPacketTextSurface.markdown, /resolved assertion record path mode: `workspace_relative`/);
  assert.match(
    result.renderedOperatorPacketTextSurface.markdown,
    /governance-report command: `node \.\\src\\cli\\governance-report\.js --json --auto-auth-assertion-record \.\\tests\\fixtures\\external-token-material-assertion-record-v1\.json`/
  );
});

test('auto-authorization preflight escalates for widening review after future token-present rebound evidence', () => {
  const result = evaluateAuthorizedWritePathAutoAuthorizationPreflight(buildInput({
    latestReboundOutcomeClass: 'token_present',
    externalAssertion: {
      asserted: true,
      assertionClass: ACCEPTED_ASSERTION_CLASSES[1],
      assertedCurrentSessionOnly: true,
      assertedIndependentOfPacket: true,
      assertedNoBindingRequested: true,
      assertedNoPersistenceRequested: true,
      assertedScopeStillCm0601Only: true,
      assertedNoStartupHealthWriteRecallRequested: true,
      assertedAt: '2026-05-20T12:00:00.000Z'
    }
  }));

  assert.equal(result.status, 'escalate_for_future_widening_review');
  assert.equal(result.allowedGovernanceOutput, 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW');
  assert.equal(result.assertionRecordPreview.previewAvailable, true);
  assert.equal(result.assertionRecordPreview.previewUsableNow, false);
  assert.equal(result.approvalLinePreview.previewAvailable, true);
  assert.equal(result.approvalLinePreview.previewUsableNow, false);
  assert.equal(result.issuanceRecordPreview.previewAvailable, true);
  assert.equal(result.issuanceRecordPreview.previewUsableNow, false);
  assert.equal(result.routingOutcomePreview.previewAvailable, true);
  assert.equal(result.routingOutcomePreview.previewUsableNow, true);
  assert.equal(result.wideningReviewPreview.previewAvailable, true);
  assert.equal(result.wideningReviewPreview.previewUsableNow, true);
  assert.equal(result.recordDrafts.cm0614Issuance.draftUsableNow, false);
  assert.equal(result.recordDrafts.cm0615RoutingOutcome.draftUsableNow, true);
  assert.equal(result.recordDrafts.cm0616WideningReview.draftUsableNow, true);
  assert.equal(result.recordDrafts.cm0616WideningReview.nextBoundary.includes('CM-0604'), true);
  assert.equal(result.renderedArtifactTextSurface.selectedDraftId, 'cm0616WideningReview');
  assert.equal(result.renderedArtifactTextSurface.selectedDraftUsableNow, true);
  assert.match(result.renderedArtifactTextSurface.selectedDraftMarkdown, /^Status: DRAFT_REVIEW_NOT_RECORDED/m);
  assert.match(result.renderedArtifactTextSurface.selectedDraftMarkdown, /## CM-0604 gate review/);
  assert.match(result.renderedArtifactTextSurface.selectedDraftMarkdown, /## Assertion Input Trace/);
  assert.match(result.renderedArtifactTextSurface.selectedDraftMarkdown, /## Command Preview/);
  assert.match(
    result.renderedArtifactTextSurface.selectedDraftMarkdown,
    /dashboard command: `node \.\\src\\cli\\dashboard\.js --json --summary-only --auto-auth-assertion-record <CM0611_assertion_record_path>`/
  );
  assert.equal(result.renderedOperatorPacketTextSurface.previewAvailable, true);
  assert.equal(result.renderedOperatorPacketTextSurface.previewUsableNow, true);
  assert.equal(result.renderedOperatorPacketTextSurface.packetKind, 'widening_review_operator_packet');
  assert.equal(result.renderedOperatorPacketTextSurface.selectedDraftId, 'cm0616WideningReview');
  assert.match(result.renderedOperatorPacketTextSurface.markdown, /Allowed governance output: ESCALATE_FOR_FUTURE_WIDENING_REVIEW/);
  assert.match(result.renderedOperatorPacketTextSurface.markdown, /## Widening Path Refs/);
  assert.match(result.renderedOperatorPacketTextSurface.markdown, /resolved assertion record path mode: `placeholder_only`/);
  assert.equal(result.artifactBundleDraft.bundleAvailable, true);
  assert.equal(result.artifactBundleDraft.bundleUsableNow, true);
  assert.equal(result.artifactBundleDraft.bundleKind, 'widening_review_ready_bundle');
  assert.equal(result.artifactBundleDraft.selectedArtifacts.futureWriteBoundaryRef.includes('CM-0595'), true);
  assert.equal(result.commandPreviewBundle.previewAvailable, true);
  assert.equal(result.commandPreviewBundle.previewUsableNow, true);
  assert.equal(result.commandPreviewBundle.bundleKind, 'widening_review_review_command_bundle');
  assert.equal(result.commandPreviewBundle.primaryCommandId, 'governance_report_assertion_record_review');
  assert.match(result.commandPreviewBundle.primaryCommand, /governance-report\.js --json --auto-auth-assertion-record <CM0611_assertion_record_path>/);
  assert.equal(result.operatorPacketDraft.packetAvailable, true);
  assert.equal(result.operatorPacketDraft.packetUsableNow, true);
  assert.equal(result.operatorPacketDraft.packetKind, 'widening_review_operator_packet');
  assert.equal(result.checklistPassed, true);
  assert.equal(result.exactCm0601LineReusable, false);
  assert.equal(result.operatorActionPlan.currentStage, 'cm0604_widening_review_ready');
  assert.match(result.operatorActionPlan.nextStepRef, /CM-0604/);
  assert.ok(result.operatorActionPlan.wideningPathRefs.some(ref => /CM-0595/.test(ref)));
  assert.equal(result.canAutoAuthorizeCm0595, false);
  assert.equal(result.nextStep, 'route_into_cm0604_widening_review_without_cm0595_auto_authorization');
  assert.equal(result.readiness.wideningReviewEscalationReady, true);
});

test('auto-authorization preflight fails closed for malformed input, unsupported outcome classes, or broadened scope', () => {
  for (const [label, input, expectedReason] of [
    ['malformed', null, 'malformed_input'],
    ['bad schema', buildInput({ schemaVersion: 'bad-schema' }), 'schema_version_mismatch'],
    ['bad mode', buildInput({ mode: 'execute_now' }), 'mode_mismatch'],
    ['unsupported outcome', buildInput({ latestReboundOutcomeClass: 'mystery' }), 'unsupported_latest_rebound_outcome_class'],
    ['missing out-of-scope action', buildInput({
      stillOutOfScopeActions: REQUIRED_STILL_OUT_OF_SCOPE_ACTIONS.filter(value => value !== 'CM-0595')
    }), 'required_out_of_scope_actions_not_preserved']
  ]) {
    const result = evaluateAuthorizedWritePathAutoAuthorizationPreflight(input);

    assert.equal(result.allowedGovernanceOutput, 'NO_AUTO_APPROVAL_ISSUED', label);
    assert.equal(result.canAutoAuthorizeCm0595, false, label);
    assert.equal(result.exactCm0601LineReusable, false, label);
    assert.equal(result.failClosedReasons.includes(expectedReason), true, label);
  }
});

test('auto-authorization preflight normalizes assertion payloads and does not pass through unknown fields', () => {
  const normalized = normalizeAuthorizedWritePathAutoAuthorizationPreflightInput({
    ...buildInput(),
    externalAssertion: {
      asserted: true,
      assertionClass: ACCEPTED_ASSERTION_CLASSES[2],
      assertedCurrentSessionOnly: true,
      assertedIndependentOfPacket: true,
      assertedNoBindingRequested: true,
      assertedNoPersistenceRequested: true,
      assertedScopeStillCm0601Only: true,
      assertedNoStartupHealthWriteRecallRequested: true,
      assertedAt: 'authorization: Bearer SHOULD_NOT_PASS',
      providerLatency: 123
    },
    raw_workspace_id: 'workspace-raw-should-not-pass'
  });

  assert.equal(normalized.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.equal(normalized.externalAssertion.assertedAt, '<redacted>');
  assert.equal(Object.hasOwn(normalized.externalAssertion, 'providerLatency'), false);
  assert.equal(Object.hasOwn(normalized, 'raw_workspace_id'), false);
});

test('auto-authorization preflight does not perform fs reads or command execution', () => {
  const input = buildInput({
    externalAssertion: {
      asserted: true,
      assertionClass: ACCEPTED_ASSERTION_CLASSES[0],
      assertedCurrentSessionOnly: true,
      assertedIndependentOfPacket: true,
      assertedNoBindingRequested: true,
      assertedNoPersistenceRequested: true,
      assertedScopeStillCm0601Only: true,
      assertedNoStartupHealthWriteRecallRequested: true,
      assertedAt: '2026-05-20T12:00:00.000Z'
    }
  });
  const originalReadFileSync = fs.readFileSync;
  const originalExistsSync = fs.existsSync;
  const originalReaddirSync = fs.readdirSync;
  const originalExecSync = childProcess.execSync;
  const originalExecFileSync = childProcess.execFileSync;
  const originalSpawnSync = childProcess.spawnSync;

  fs.readFileSync = () => {
    throw new Error('unexpected fs read during auto-authorization preflight');
  };
  fs.existsSync = () => {
    throw new Error('unexpected fs exists during auto-authorization preflight');
  };
  fs.readdirSync = () => {
    throw new Error('unexpected directory scan during auto-authorization preflight');
  };
  childProcess.execSync = () => {
    throw new Error('unexpected command execution during auto-authorization preflight');
  };
  childProcess.execFileSync = () => {
    throw new Error('unexpected command execution during auto-authorization preflight');
  };
  childProcess.spawnSync = () => {
    throw new Error('unexpected command execution during auto-authorization preflight');
  };

  try {
    const result = evaluateAuthorizedWritePathAutoAuthorizationPreflight(input);

    assert.equal(result.allowedGovernanceOutput, 'AUTO_REUSE_CM0601_LINE_ONLY');
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
