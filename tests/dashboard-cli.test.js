const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const REPO_ASSERTION_RECORD_PATH = path.join(
  process.cwd(),
  'tests',
  'fixtures',
  'external-token-material-assertion-record-v1.json'
);
const REPO_WIDENING_REVIEW_FIXTURE_PATH = path.join(
  process.cwd(),
  'tests',
  'fixtures',
  'authorized-write-path-widening-review-v1.json'
);
const REPO_ROUTING_OUTCOME_RECORD_PATH = path.join(
  process.cwd(),
  'tests',
  'fixtures',
  'cm0605-routing-outcome-record-v1.md'
);
const REPO_WIDENING_ADOPTION_REVIEW_RECORD_PATH = path.join(
  process.cwd(),
  'tests',
  'fixtures',
  'cm0616-widening-review-outcome-record-v1.md'
);
const REPO_WIDENING_ADOPTION_RECORD_PATH = path.join(
  process.cwd(),
  'tests',
  'fixtures',
  'cm0607-widening-adoption-record-v1.md'
);
const REPO_CM0595_ISSUANCE_RECORD_PATH = path.join(
  process.cwd(),
  'tests',
  'fixtures',
  'cm0649-cm0595-approval-issuance-record-v1.md'
);
const REPO_CM0595_EXECUTION_EVIDENCE_RECORD_PATH = path.join(
  process.cwd(),
  'tests',
  'fixtures',
  'cm0650-cm0595-execution-evidence-record-v1.md'
);

function mainlineGateFixtureEnv() {
  const comparePayload = {
    summary: {
      ok: true,
      totalCaseCount: 43,
      matchedCaseCount: 43,
      coreMismatchCountTotal: 0,
      extendedMismatchCountTotal: 0
    }
  };
  const rollbackPayload = {
    summary: {
      ok: true,
      totalCaseCount: 43,
      readyCaseCount: 43,
      coreMismatchCountTotal: 0,
      extendedMismatchCountTotal: 0
    }
  };
  return {
    CODEX_MEMORY_GATE_COMPARE_COMMAND_JSON: JSON.stringify([
      process.execPath,
      '-e',
      `console.log(${JSON.stringify(JSON.stringify(comparePayload))})`
    ]),
    CODEX_MEMORY_GATE_ROLLBACK_COMMAND_JSON: JSON.stringify([
      process.execPath,
      '-e',
      `console.log(${JSON.stringify(JSON.stringify(rollbackPayload))})`
    ])
  };
}

function runDashboard({ args = [], env = {} } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['src/cli/dashboard.js', ...args], {
      cwd: process.cwd(),
      env: { ...process.env, ...mainlineGateFixtureEnv(), ...env },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', chunk => { stderr += chunk.toString('utf8'); });
    child.on('error', reject);
    child.on('close', code => { resolve({ code, stdout, stderr }); });
  });
}

function parseJsonOutput(text) {
  return JSON.parse(text);
}

function formatFailure(result) {
  return [
    `exit=${result.code}`,
    '--- stdout ---',
    result.stdout || '<empty>',
    '--- stderr ---',
    result.stderr || '<empty>'
  ].join('\n');
}

function assertKeySet(value, expected, label) {
  assert.deepEqual(Object.keys(value).sort(), expected, `${label} keys`);
}

test('dashboard CLI should report all sections in json mode', async () => {
  const result = await runDashboard({ args: ['--json'] });
  assert.equal(result.code, 0, formatFailure(result));
  const payload = parseJsonOutput(result.stdout);

  assertKeySet(payload, [
    'audits',
    'checks',
    'destructive',
    'gate',
    'generatedAt',
    'governance',
    'mode',
    'profile',
    'readPolicy',
    'recommendations',
    'runtime',
    'service',
    'store',
    'summary'
  ], 'dashboard top-level');
  assertKeySet(payload.summary, ['message', 'status'], 'dashboard summary');
  assert.equal(payload.mode, 'memory-dashboard');
  assert.equal(payload.destructive, false);
  assert.equal(typeof payload.summary.status, 'string');

  // Service section
  assert.ok(payload.service, 'should have service section');
  assert.equal(typeof payload.service.status, 'string');
  assert.ok(payload.service.url);

  // Store section
  assert.ok(payload.store, 'should have store section');
  assert.equal(typeof payload.store.records, 'number');
  assert.ok(payload.store.records >= 0, 'records should be non-negative');
  assert.ok(['ok', 'warn'].includes(payload.store.status), 'store status should be ok or warn');
  if (payload.store.records === 0) {
    assert.equal(payload.store.status, 'warn', 'empty clean runner store should warn');
  }

  // Profile section
  assert.ok(payload.profile, 'should have profile section');
  assert.equal(typeof payload.profile.fingerprint, 'string');

  // Runtime section
  assert.ok(payload.runtime, 'should have runtime section');
  assert.equal(typeof payload.runtime.httpLogErrorCount, 'number');

  // Audits section
  assert.ok(payload.audits, 'should have audits section');
  assertKeySet(payload.audits, ['bridge', 'readPolicy', 'recall'], 'dashboard audits');
  assert.ok(payload.audits.bridge);
  assert.ok(payload.audits.recall);
  assertKeySet(payload.audits.recall, [
    'clientBreakdown',
    'lastRecallAt',
    'latestScopedHitAt',
    'projectBreakdown',
    'recallTypeBreakdown',
    'recentCount',
    'scopeDimensionBreakdown',
    'scopeModeBreakdown',
    'scopedRecallCount',
    'status',
    'strictScopedRecallCount',
    'visibilityBreakdown'
  ], 'dashboard recall audit');
  assert.equal(typeof payload.audits.recall.scopedRecallCount, 'number');
  assert.equal(typeof payload.audits.recall.strictScopedRecallCount, 'number');
  assert.equal(typeof payload.audits.recall.scopeModeBreakdown, 'object');
  assert.equal(typeof payload.audits.recall.scopeDimensionBreakdown, 'object');
  assert.equal(payload.audits.recall.rawWorkspaceId, undefined);

  assertKeySet(payload.readPolicy, [
    'auditEvidenceAvailable',
    'configEvidenceAvailable',
    'lifecycleColumnAvailable',
    'lifecycleExcludedStatuses',
    'lifecycleIncludedStatuses',
    'lifecyclePolicyEnabled',
    'migrationApplied',
    'mutated',
    'noProvider',
    'rawWorkspaceIdExposed',
    'readPolicyConfigured',
    'recentHiddenByLifecycleCount',
    'recentLifecyclePolicyAppliedCount',
    'recentReadPolicyAppliedCount',
    'recentReadPolicyAuditCount',
    'recentStaleResultCount',
    'scopeWorkspacePresent',
    'softReadPolicyEnabled',
    'source',
    'status'
  ], 'dashboard read policy');
  assert.equal(typeof payload.readPolicy.lifecyclePolicyEnabled, 'boolean');
  assert.equal(typeof payload.readPolicy.softReadPolicyEnabled, 'boolean');
  assert.equal(payload.readPolicy.configEvidenceAvailable, true);
  assert.equal(typeof payload.readPolicy.auditEvidenceAvailable, 'boolean');
  assert.equal(typeof payload.readPolicy.readPolicyConfigured, 'boolean');
  assert.deepEqual(payload.readPolicy.lifecycleIncludedStatuses, ['active', 'stale']);
  assert.deepEqual(payload.readPolicy.lifecycleExcludedStatuses, ['proposal', 'rejected', 'superseded', 'tombstoned']);
  assert.equal(payload.readPolicy.rawWorkspaceIdExposed, false);
  assert.equal(payload.readPolicy.noProvider, true);
  assert.equal(payload.readPolicy.mutated, false);
  assert.equal(payload.readPolicy.migrationApplied, false);
  assert.equal(JSON.stringify(payload).includes('workspace_id'), false);

  // Gate section
  assert.ok(payload.gate, 'should have gate section');
  assert.ok(payload.gate.compare);
  assert.ok(payload.gate.rollback);

  // Governance section
  assert.ok(payload.governance, 'should have governance section');
  assertKeySet(payload.governance, [
    'autoAuthorization',
    'boundedRecallCloseout',
    'boundedRecallPreparation',
    'counts',
    'hints',
    'message',
    'paths',
    'rawSummary',
    'readPolicy',
    'retention',
    'reviewLevel',
    'sourceStatus',
    'status',
    'statusDistribution',
    'wideningAdoption',
    'wideningReview'
  ], 'dashboard governance');
  assertKeySet(payload.governance.autoAuthorization, [
    'allowedGovernanceOutput',
    'approvalLinePreview',
    'artifactBundleDraft',
    'assertionRecordInputTrace',
    'assertionRecordPreview',
    'canAutoAuthorizeCm0595',
    'checklistFailures',
    'checklistPassed',
    'commandPreviewBundle',
    'currentBlockedOn',
    'decision',
    'exactCm0601LineReusable',
    'externalAssertionAccepted',
    'issuanceRecordPreview',
    'mutated',
    'nextStep',
    'operatorActionPlan',
    'operatorPacketDraft',
    'publicMcpExpanded',
    'readsRealMemory',
    'recordDrafts',
    'renderedArtifactTextSurface',
    'renderedOperatorBriefTextSurface',
    'renderedOperatorPacketTextSurface',
    'routingOutcomePreview',
    'source',
    'status',
    'wideningReviewPreview',
    'writesDurableState'
  ].sort(), 'dashboard governance auto-authorization');
  assertKeySet(payload.governance.counts, [
    'proposalCount',
    'stale30d',
    'stale90d',
    'supersededCount',
    'supersessionInitiated',
    'tombstonedCount',
    'totalRecords'
  ], 'dashboard governance counts');
  assert.equal(typeof payload.governance.status, 'string');
  assert.equal(typeof payload.governance.reviewLevel, 'string');
  assert.equal(typeof payload.governance.counts.proposalCount, 'number');
  assert.equal(typeof payload.governance.counts.stale30d, 'number');
  assert.equal(typeof payload.governance.counts.stale90d, 'number');
  assert.ok(Array.isArray(payload.governance.hints));
  assert.equal(payload.governance.readPolicy.rawWorkspaceIdExposed, false);
  assert.equal(payload.governance.autoAuthorization.allowedGovernanceOutput, 'NO_AUTO_APPROVAL_ISSUED');
  assert.equal(payload.governance.autoAuthorization.assertionRecordInputTrace, null);
  assert.equal(payload.governance.autoAuthorization.operatorActionPlan.currentStage, 'await_cm0611_assertion_record');
  assert.equal(payload.governance.autoAuthorization.assertionRecordPreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.assertionRecordPreview.previewUsableNow, true);
  assert.equal(payload.governance.autoAuthorization.approvalLinePreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.approvalLinePreview.previewUsableNow, false);
  assert.equal(payload.governance.autoAuthorization.issuanceRecordPreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.issuanceRecordPreview.previewUsableNow, false);
  assert.equal(payload.governance.autoAuthorization.routingOutcomePreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.routingOutcomePreview.previewUsableNow, false);
  assert.equal(payload.governance.autoAuthorization.wideningReviewPreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.wideningReviewPreview.previewUsableNow, false);
  assert.equal(payload.governance.autoAuthorization.recordDrafts.cm0614Issuance.draftAvailable, true);
  assert.equal(payload.governance.autoAuthorization.recordDrafts.cm0614Issuance.draftUsableNow, false);
  assert.equal(payload.governance.autoAuthorization.renderedArtifactTextSurface.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.renderedArtifactTextSurface.selectedDraftId, 'cm0611AssertionRecord');
  assert.equal(payload.governance.autoAuthorization.renderedOperatorPacketTextSurface.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.renderedOperatorPacketTextSurface.packetKind, 'assertion_record_operator_packet');
  assert.equal(payload.governance.autoAuthorization.renderedOperatorPacketTextSurface.selectedDraftId, 'cm0611AssertionRecord');
  assert.equal(payload.governance.autoAuthorization.artifactBundleDraft.bundleKind, 'assertion_record_only');
  assert.equal(payload.governance.autoAuthorization.commandPreviewBundle.bundleKind, 'assertion_record_command_bundle');
  assert.equal(payload.governance.autoAuthorization.operatorPacketDraft.packetKind, 'assertion_record_operator_packet');
  assert.equal(payload.governance.autoAuthorization.currentBlockedOn, 'external_token_assertion_not_accepted');
  assert.equal(payload.governance.autoAuthorization.exactCm0601LineReusable, false);
  assert.equal(payload.governance.autoAuthorization.canAutoAuthorizeCm0595, false);
  assert.equal(payload.governance.wideningReview.decision, 'WIDENING_REVIEW_NOT_READY');
  assert.equal(payload.governance.wideningAdoption.decision, 'WIDENING_ADOPTION_NOT_READY');
  assert.equal(payload.governance.wideningReview.renderedReviewTextSurface.previewAvailable, true);
  assert.equal(payload.governance.wideningAdoption.cm0595ApprovalLinePreview.previewAvailable, true);
  assert.equal(payload.governance.wideningAdoption.cm0595ApprovalLinePreview.previewUsableNow, false);
  assert.equal(payload.governance.wideningAdoption.cm0595OperatorPacketDraft.packetKind, 'cm0595_operator_packet_blocked');
  assert.equal(payload.governance.wideningAdoption.cm0595IssuanceRecordDraft.draftUsableNow, false);
  assert.equal(payload.governance.wideningAdoption.cm0595ExecutionEvidenceDraft.draftUsableNow, false);
  assert.equal(payload.governance.wideningAdoption.cm0595IssuanceRecordInputTrace, null);
  assert.equal(payload.governance.wideningAdoption.cm0595ExecutionEvidenceInputTrace, null);
  assert.equal(payload.governance.boundedRecallPreparation.decision, 'BOUNDED_RECALL_APPROVAL_NOT_READY');
  assert.equal(payload.governance.boundedRecallPreparation.renderedBoundedRecallTextSurface.previewAvailable, true);
  assert.equal(payload.governance.boundedRecallPreparation.boundedRecallApprovalPrepared, false);
  assert.equal(payload.governance.boundedRecallPreparation.boundedRecallCommandPreviewBundle.bundleKind, 'bounded_recall_review_command_bundle_blocked');
  assert.equal(payload.governance.boundedRecallPreparation.boundedRecallApprovalIssuanceRecordDraft.draftKind, 'bounded_recall_approval_issuance_record_draft_blocked');
  assert.equal(payload.governance.boundedRecallPreparation.boundedRecallExecutionEvidenceDraft.draftKind, 'bounded_recall_execution_evidence_draft_blocked');
  assert.equal(payload.governance.boundedRecallPreparation.cm0595IssuanceRecordInputTrace, null);
  assert.equal(payload.governance.boundedRecallPreparation.cm0595ExecutionEvidenceInputTrace, null);
  assert.equal(payload.governance.boundedRecallCloseout.decision, 'BOUNDED_RECALL_CLOSEOUT_NOT_READY');
  assert.equal(payload.governance.boundedRecallCloseout.renderedCloseoutTextSurface.previewAvailable, true);
  assert.equal(payload.governance.boundedRecallCloseout.boundedRecallCloseoutReady, false);
  assert.equal(payload.governance.boundedRecallCloseout.closeoutRecordDraft.draftUsableNow, false);
  assert.equal(
    payload.governance.boundedRecallCloseout.boundedRecallPreparationCommandPreviewBundle.bundleKind,
    'bounded_recall_preparation_command_bundle_blocked'
  );
  assert.equal(
    payload.governance.boundedRecallCloseout.boundedRecallPreparationOperatorPacketDraft.draftUsableNow,
    false
  );
  assert.equal(
    payload.governance.boundedRecallCloseout.renderedBoundedRecallPreparationPacketTextSurface.previewAvailable,
    true
  );
  assert.equal(payload.governance.boundedRecallCloseout.boundedRecallApprovalIssuanceRecordInputTrace, null);
  assert.equal(payload.governance.boundedRecallCloseout.boundedRecallExecutionEvidenceInputTrace, null);

  // Checks and recommendations
  assert.ok(Array.isArray(payload.checks));
  assert.ok(payload.checks.some(check => check.code === 'authorized-write-path-auto-auth'));
  assert.ok(
    payload.checks.some(
      check => check.code === 'authorized-write-path-auto-auth'
        && check.message.includes('bundle=assertion_record_only')
        && check.message.includes('cmd=assertion_record_command_bundle')
        && check.message.includes('packet=assertion_record_operator_packet')
        && check.message.includes('input=default_fixture_only')
        && check.message.includes('CM-0611_EXTERNAL_TOKEN_MATERIAL_ASSERTION_RECORD_TEMPLATE.md')
    ),
    'auto-auth check should include current bundle and next artifact'
  );
  assert.ok(
    payload.checks.some(
      check => check.code === 'authorized-write-path-widening-review'
        && check.message.includes('WIDENING_REVIEW_NOT_READY')
    ),
    'widening-review check should expose current blocked state'
  );
  assert.ok(Array.isArray(payload.recommendations));
  assert.ok(payload.recommendations.some(line => line.includes('Authorized write-path auto-authorization remains fail-closed')));
  assert.ok(
    payload.recommendations.some(
      line => line.includes('bundle=assertion_record_only')
        && line.includes('cmd=assertion_record_command_bundle')
        && line.includes('packet=assertion_record_operator_packet')
        && line.includes('input=default_fixture_only')
        && line.includes('CM-0611_EXTERNAL_TOKEN_MATERIAL_ASSERTION_RECORD_TEMPLATE.md')
    ),
    'auto-auth recommendation should include current bundle and next artifact'
  );
});

test('dashboard CLI should support --json --summary-only', async () => {
  const result = await runDashboard({ args: ['--json', '--summary-only'] });
  assert.equal(result.code, 0, formatFailure(result));
  const payload = parseJsonOutput(result.stdout);

  assert.equal(payload.mode, 'memory-dashboard');
  assertKeySet(payload.governance, ['autoAuthorization', 'boundedRecallCloseout', 'boundedRecallPreparation', 'counts', 'reviewLevel', 'status', 'wideningAdoption', 'wideningReview'], 'dashboard summary-only governance');
  // Summary-only should have compact store/profile
  assert.equal(typeof payload.store.records, 'number');
  assert.ok(payload.store.records >= 0, 'records should be non-negative');
  assert.ok(['ok', 'warn'].includes(payload.store.status), 'store status should be ok or warn');
  if (payload.store.records === 0) {
    assert.equal(payload.store.status, 'warn', 'empty clean runner store should warn');
  }
  assert.ok(!payload.store.ageBreakdown, 'summary-only should omit age breakdown');
  assert.equal(payload.readPolicy.rawWorkspaceIdExposed, false);
  assert.ok(payload.governance, 'summary-only should keep governance compact section');
  assert.equal(typeof payload.governance.counts.proposalCount, 'number');
  assert.equal(payload.governance.autoAuthorization.allowedGovernanceOutput, 'NO_AUTO_APPROVAL_ISSUED');
  assert.equal(payload.governance.autoAuthorization.assertionRecordInputTrace, null);
  assert.equal(payload.governance.autoAuthorization.operatorActionPlan.currentStage, 'await_cm0611_assertion_record');
  assert.equal(payload.governance.autoAuthorization.assertionRecordPreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.approvalLinePreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.issuanceRecordPreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.routingOutcomePreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.wideningReviewPreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.recordDrafts.cm0614Issuance.draftAvailable, true);
  assert.equal(payload.governance.autoAuthorization.renderedArtifactTextSurface.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.renderedArtifactTextSurface.selectedDraftId, 'cm0611AssertionRecord');
  assert.equal(payload.governance.autoAuthorization.renderedOperatorPacketTextSurface.packetKind, 'assertion_record_operator_packet');
  assert.equal(payload.governance.autoAuthorization.renderedOperatorBriefTextSurface.briefKind, 'assertion_record_only__assertion_record_operator_packet');
  assert.equal(payload.governance.autoAuthorization.artifactBundleDraft.bundleKind, 'assertion_record_only');
  assert.equal(payload.governance.autoAuthorization.operatorPacketDraft.packetKind, 'assertion_record_operator_packet');
  assert.equal(payload.governance.autoAuthorization.currentBlockedOn, 'external_token_assertion_not_accepted');
  assert.equal(payload.governance.wideningReview.decision, 'WIDENING_REVIEW_NOT_READY');
  assert.equal(payload.governance.boundedRecallCloseout.decision, 'BOUNDED_RECALL_CLOSEOUT_NOT_READY');
  assert.equal(payload.governance.hints, undefined);
});

test('dashboard CLI should emit text output by default', async () => {
  const result = await runDashboard();
  assert.equal(result.code, 0, formatFailure(result));
  const text = result.stdout;
  assert.ok(text.includes('Memory Dashboard'), 'should include title');
  assert.ok(text.includes('Service'), 'should include Service section');
  assert.ok(text.includes('Store'), 'should include Store section');
  assert.ok(text.includes('Profile'), 'should include Profile section');
  assert.ok(text.includes('Runtime'), 'should include Runtime section');
  assert.ok(text.includes('ReadPolicy'), 'should include ReadPolicy section');
  assert.ok(text.includes('Governance'), 'should include Governance section');
  assert.ok(text.includes('auto-auth'), 'should include governance auto-auth summary');
  assert.ok(text.includes('GovBundle'), 'should include governance bundle line');
  assert.ok(text.includes('GovCmd'), 'should include governance command line');
  assert.ok(text.includes('GovPacket'), 'should include governance packet line');
  assert.ok(text.includes('GovDraft'), 'should include governance draft line');
  assert.ok(text.includes('GovPktTxt'), 'should include governance rendered packet text line');
  assert.ok(text.includes('GovBrief'), 'should include governance rendered brief line');
  assert.ok(text.includes('GovInput'), 'should include governance input line');
  assert.ok(text.includes('GovWiden'), 'should include governance widening review line');
  assert.ok(text.includes('GovWNext'), 'should include governance widening review next step line');
  assert.ok(text.includes('GovWText'), 'should include governance widening review text line');
  assert.ok(text.includes('GovRClose'), 'should include governance bounded recall closeout line');
  assert.ok(text.includes('GovRCNext'), 'should include governance bounded recall closeout next step line');
  assert.ok(text.includes('GovRCText'), 'should include governance bounded recall closeout text line');
  assert.ok(text.includes('bundle=assertion_record_only'), 'should include current bundle kind');
  assert.ok(text.includes('draft=cm0611AssertionRecord'), 'should include current rendered draft id');
  assert.ok(text.includes('cmd=assertion_record_command_bundle'), 'should include current command bundle kind');
  assert.ok(text.includes('packet=assertion_record_operator_packet'), 'should include current packet kind');
  assert.ok(text.includes('input=default_fixture_only'), 'should include default governance input summary');
  assert.ok(text.includes('CM-0611_EXTERNAL_TOKEN_MATERIAL_ASSERTION_RECORD_TEMPLATE.md'), 'should include next artifact ref');
  assert.ok(text.includes('Checks'), 'should include Checks section');
  assert.ok(text.includes('Recommendations'), 'should include Recommendations');
  assert.equal(text.includes('workspace_id'), false);
});

test('dashboard CLI should render current operator packet text when requested', async () => {
  const result = await runDashboard({ args: ['--rendered-operator-packet-text'] });
  assert.equal(result.code, 0, formatFailure(result));
  const text = result.stdout;
  assert.ok(text.includes('[rendered-operator-packet-text]'), 'should include rendered packet section');
  assert.match(text, /^Status: RC_NOT_READY_BLOCKED/m);
  assert.match(text, /## Command Preview/);
  assert.match(text, /Current stage: await_cm0611_assertion_record/);
});

test('dashboard CLI should render current operator artifact text when requested', async () => {
  const result = await runDashboard({ args: ['--rendered-operator-artifact-text'] });
  assert.equal(result.code, 0, formatFailure(result));
  const text = result.stdout;
  assert.ok(text.includes('[rendered-operator-artifact-text]'), 'should include rendered artifact section');
  assert.match(text, /^Status: DRAFT_ASSERTION_NOT_RECORDED/m);
  assert.match(text, /## Assertion Summary/);
  assert.match(text, /## Command Preview/);
  assert.match(text, /assertionClass: <fill>/);
});

test('dashboard CLI should render current operator brief text when requested', async () => {
  const result = await runDashboard({ args: ['--rendered-operator-brief-text'] });
  assert.equal(result.code, 0, formatFailure(result));
  const text = result.stdout;
  assert.ok(text.includes('[rendered-operator-brief-text]'), 'should include rendered brief section');
  assert.match(text, /^Status: RC_NOT_READY_BLOCKED/m);
  assert.match(text, /## Current Operator Packet/);
  assert.match(text, /## Selected Artifact Draft/);
});

test('dashboard CLI should render widening review text when requested', async () => {
  const result = await runDashboard({ args: ['--rendered-widening-review-text'] });
  assert.equal(result.code, 0, formatFailure(result));
  const text = result.stdout;
  assert.ok(text.includes('[rendered-widening-review-text]'), 'should include rendered widening review section');
  assert.match(text, /^Status: DRAFT_REVIEW_NOT_READY/m);
  assert.match(text, /## CM-0604 gate review/);
  assert.match(text, /## Review Checklist/);
});

test('dashboard CLI should render bounded recall text when requested', async () => {
  const result = await runDashboard({ args: ['--rendered-bounded-recall-text'] });
  assert.equal(result.code, 0, formatFailure(result));
  const text = result.stdout;
  assert.ok(text.includes('[rendered-bounded-recall-text]'), 'should include rendered bounded recall section');
  assert.match(text, /^Status: DRAFT_BOUNDED_RECALL_APPROVAL_NOT_READY/m);
  assert.match(text, /## Preparation snapshot/);
  assert.match(text, /## Bounded Recall Checklist/);
});

test('dashboard CLI should render bounded recall closeout text when requested', async () => {
  const result = await runDashboard({ args: ['--rendered-bounded-recall-closeout-text'] });
  assert.equal(result.code, 0, formatFailure(result));
  const text = result.stdout;
  assert.ok(text.includes('[rendered-bounded-recall-closeout-text]'), 'should include rendered bounded recall closeout section');
  assert.match(text, /^Status: DRAFT_BOUNDED_RECALL_CLOSEOUT_NOT_READY/m);
  assert.match(text, /## Closeout snapshot/);
  assert.match(text, /## Closeout Checklist/);
});

test('dashboard CLI should tolerate clean CI runner warnings', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-dashboard-ci-'));
  const missingDataDir = path.join(tempBasePath, 'missing-data');
  const result = await runDashboard({
    args: ['--json'],
    env: {
      CODEX_MEMORY_HTTP_PORT: '1',
      CODEX_MEMORY_DATA_DIR: missingDataDir,
      CODEX_MEMORY_DB_PATH: path.join(missingDataDir, 'codex-memory.sqlite'),
      CODEX_MEMORY_LOGS_DIR: path.join(tempBasePath, 'logs')
    }
  });

  assert.equal(result.code, 0, formatFailure(result));
  const payload = parseJsonOutput(result.stdout);

  assert.equal(payload.summary.status, 'warn');
  assert.equal(payload.service.status, 'warn');
  assert.equal(payload.store.status, 'warn');
  assert.match(payload.store.message, /Database not found/);
  assert.equal(typeof payload.governance.status, 'string');
  assert.equal(typeof payload.governance.reviewLevel, 'string');
  assert.equal(payload.governance.autoAuthorization.allowedGovernanceOutput, 'NO_AUTO_APPROVAL_ISSUED');
  assert.equal(payload.governance.autoAuthorization.assertionRecordInputTrace, null);
  assert.equal(payload.governance.autoAuthorization.operatorActionPlan.currentStage, 'await_cm0611_assertion_record');
  assert.equal(payload.governance.autoAuthorization.assertionRecordPreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.approvalLinePreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.issuanceRecordPreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.routingOutcomePreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.wideningReviewPreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.recordDrafts.cm0614Issuance.draftAvailable, true);
  assert.equal(payload.governance.autoAuthorization.renderedArtifactTextSurface.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.renderedArtifactTextSurface.selectedDraftId, 'cm0611AssertionRecord');
  assert.equal(payload.governance.autoAuthorization.renderedOperatorPacketTextSurface.packetKind, 'assertion_record_operator_packet');
  assert.equal(payload.governance.autoAuthorization.renderedOperatorBriefTextSurface.briefKind, 'assertion_record_only__assertion_record_operator_packet');
  assert.equal(payload.governance.autoAuthorization.artifactBundleDraft.bundleKind, 'assertion_record_only');
  assert.equal(payload.governance.autoAuthorization.commandPreviewBundle.bundleKind, 'assertion_record_command_bundle');
  assert.equal(payload.governance.autoAuthorization.operatorPacketDraft.packetKind, 'assertion_record_operator_packet');
  assert.equal(payload.governance.autoAuthorization.currentBlockedOn, 'external_token_assertion_not_accepted');
  assert.notEqual(payload.gate.status, 'error', formatFailure(result));
  assert.equal(typeof payload.audits.recall.scopedRecallCount, 'number');
  assert.equal(payload.readPolicy.rawWorkspaceIdExposed, false);
});

test('dashboard CLI should pass explicit assertion-record input through governance surfaces', async () => {
  const result = await runDashboard({
    args: [
      '--json',
      '--summary-only',
      '--auto-auth-assertion-record',
      REPO_ASSERTION_RECORD_PATH,
      '--auto-auth-latest-rebound-outcome-class',
      'token_present'
    ]
  });
  assert.equal(result.code, 0, formatFailure(result));
  const payload = parseJsonOutput(result.stdout);

  assert.equal(payload.governance.autoAuthorization.allowedGovernanceOutput, 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW');
  assert.equal(payload.governance.autoAuthorization.assertionRecordInputTrace.traceAvailable, true);
  assert.equal(payload.governance.autoAuthorization.assertionRecordInputTrace.sourceFormat, 'json_assertion_record_v1');
  assert.equal(payload.governance.autoAuthorization.assertionRecordInputTrace.sourceFileName, 'external-token-material-assertion-record-v1.json');
  assert.equal(payload.governance.autoAuthorization.assertionRecordInputTrace.usedLatestReboundOutcomeOverride, true);
  assert.equal(payload.governance.autoAuthorization.assertionRecordInputTrace.latestReboundOutcomeOverride, 'token_present');
  assert.equal(payload.governance.autoAuthorization.operatorActionPlan.currentStage, 'cm0604_widening_review_ready');
  assert.equal(payload.governance.autoAuthorization.assertionRecordPreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.assertionRecordPreview.previewUsableNow, false);
  assert.equal(payload.governance.autoAuthorization.approvalLinePreview.previewAvailable, true);
  assert.equal(payload.governance.autoAuthorization.approvalLinePreview.previewUsableNow, false);
  assert.equal(payload.governance.autoAuthorization.issuanceRecordPreview.previewUsableNow, false);
  assert.equal(payload.governance.autoAuthorization.routingOutcomePreview.previewUsableNow, true);
  assert.equal(payload.governance.autoAuthorization.wideningReviewPreview.previewUsableNow, true);
  assert.equal(payload.governance.autoAuthorization.recordDrafts.cm0616WideningReview.draftUsableNow, true);
  assert.equal(payload.governance.autoAuthorization.renderedArtifactTextSurface.selectedDraftId, 'cm0616WideningReview');
  assert.match(
    payload.governance.autoAuthorization.renderedArtifactTextSurface.selectedDraftMarkdown,
    /source workspace-relative path: `\.\\tests\\fixtures\\external-token-material-assertion-record-v1\.json`/
  );
  assert.match(
    payload.governance.autoAuthorization.renderedArtifactTextSurface.selectedDraftMarkdown,
    /dashboard command: `node \.\\src\\cli\\dashboard\.js --json --summary-only --auto-auth-assertion-record \.\\tests\\fixtures\\external-token-material-assertion-record-v1\.json --auto-auth-latest-rebound-outcome-class token_present`/
  );
  assert.equal(payload.governance.autoAuthorization.renderedOperatorPacketTextSurface.packetKind, 'widening_review_operator_packet');
  assert.equal(payload.governance.autoAuthorization.artifactBundleDraft.bundleKind, 'widening_review_ready_bundle');
  assert.equal(payload.governance.autoAuthorization.commandPreviewBundle.bundleKind, 'widening_review_review_command_bundle');
  assert.equal(payload.governance.autoAuthorization.operatorPacketDraft.packetKind, 'widening_review_operator_packet');
  assert.equal(payload.governance.autoAuthorization.exactCm0601LineReusable, false);
  assert.equal(payload.governance.autoAuthorization.externalAssertionAccepted, true);
  assert.equal(payload.governance.autoAuthorization.canAutoAuthorizeCm0595, false);
  assert.equal(payload.governance.autoAuthorization.source, 'cm0622_explicit_input_fixture_plus_assertion_record_v1');
  assert.equal(payload.governance.wideningReview.source, 'cm0662_explicit_input_fixture_plus_auto_authorization_escalation_bridge_v1');
  assert.equal(payload.governance.wideningReview.decision, 'WIDENING_REVIEW_PASSED_ADOPTION_NOT_GRANTED');
  assert.equal(payload.governance.wideningReview.status, 'passed_adoption_not_granted');
  assert.equal(payload.governance.wideningReview.cm0604Satisfied, true);
  assert.equal(payload.governance.wideningReview.cm0606BridgeActivated, false);
  assert.equal(payload.governance.wideningReview.proceedToCm0607AdoptionRecord, false);
  assert.equal(payload.governance.wideningReview.routingOutcomeRecordInputTrace.traceAvailable, true);
  assert.equal(payload.governance.wideningReview.routingOutcomeRecordInputTrace.sourceFormat, 'cm0662_auto_authorization_escalation_bridge_v1');
  assert.equal(payload.governance.wideningReview.routingOutcomeRecordInputTrace.sourceFileName, 'external-token-material-assertion-record-v1.json');
  assert.equal(payload.governance.wideningReview.reviewChecklist.W4.passed, true);
  assert.equal(payload.governance.wideningReview.reviewChecklist.W6.passed, true);
  assert.equal(payload.governance.wideningReview.reviewChecklist.W10.passed, false);
  assert.ok(payload.governance.wideningReview.failClosedReasons.includes('bounded_durable_write_crossing_not_granted'));
  assert.ok(
    payload.checks.some(
      check => check.code === 'authorized-write-path-auto-auth' && check.message.includes('ESCALATE_FOR_FUTURE_WIDENING_REVIEW')
    ),
    'should expose escalated governance state in checks'
  );
  assert.ok(
    payload.checks.some(
      check => check.code === 'authorized-write-path-widening-review'
        && check.message.includes('WIDENING_REVIEW_PASSED_ADOPTION_NOT_GRANTED')
    ),
    'should expose bridged widening-review state in checks'
  );
  assert.equal(payload.governance.autoAuthorization.commandPreviewBundle.resolvedAssertionRecordPathMode, 'workspace_relative');
  assert.equal(
    payload.governance.autoAuthorization.commandPreviewBundle.resolvedAssertionRecordPath,
    '.\\tests\\fixtures\\external-token-material-assertion-record-v1.json'
  );
  assert.match(
    payload.governance.autoAuthorization.renderedOperatorPacketTextSurface.markdown,
    /governance-report command: `node \.\\src\\cli\\governance-report\.js --json --auto-auth-assertion-record \.\\tests\\fixtures\\external-token-material-assertion-record-v1\.json --auto-auth-latest-rebound-outcome-class token_present`/
  );
});

test('dashboard CLI should pass explicit widening-review fixture through governance surfaces', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-dashboard-widening-'));
  const wideningFixturePath = path.join(tempBasePath, 'authorized-write-path-widening-review-pass.json');

  try {
    const fixture = JSON.parse(await fs.readFile(REPO_WIDENING_REVIEW_FIXTURE_PATH, 'utf8'));
    Object.assign(fixture, {
      routingOutcomeRecordAvailable: true,
      routingOutcomeDecision: 'CM0605_ROUTED_ESCALATE_FOR_FUTURE_WIDENING_REVIEW',
      routingOutcomeRecordId: 'docs/CM-0615_CM0605_ROUTING_OUTCOME_RECORD_TEMPLATE.md',
      sameBaselineEndpointStartupEvidenceAvailable: true,
      endpointStartupEvidenceId: 'docs/CM-0592_AUTHORIZED_PUBLIC_WRITE_PATH_COMBINED_MINIMAL_ENABLEMENT_EVIDENCE.md',
      sameBaselineTokenPresentEvidenceAvailable: true,
      tokenPresentEvidenceSameBaseline: true,
      latestTokenPresentEvidenceId: 'docs/CM-0601_CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_PACKET.md',
      noProviderConfigStartupPersistenceDriftSinceEvidence: true,
      packetFamilyDriftDetected: false,
      noBroadScanJsonlReadOrAdditionalWriteNeeded: true,
      currentWritePathStillNotValidated: true,
      narrowestNextProofStillOneSanitizedWriteValidation: true,
      governanceMayCrossIntoOneBoundedDurableWriteProof: true
    });
    await fs.writeFile(wideningFixturePath, JSON.stringify(fixture), 'utf8');

    const result = await runDashboard({
      args: ['--json', '--widening-review-fixture', wideningFixturePath]
    });
    assert.equal(result.code, 0, formatFailure(result));
    const payload = parseJsonOutput(result.stdout);
    assert.equal(payload.governance.wideningReview.decision, 'WIDENING_REVIEW_PASSED_PROCEED_TO_CM0607');
    assert.equal(payload.governance.wideningReview.cm0604Satisfied, true);
    assert.equal(payload.governance.wideningReview.cm0606BridgeActivated, true);
    assert.ok(
      payload.checks.some(
        check => check.code === 'authorized-write-path-widening-review'
          && check.message.includes('WIDENING_REVIEW_PASSED_PROCEED_TO_CM0607')
      )
    );
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('dashboard CLI should pass explicit widening-review routing-outcome record through governance surfaces', async () => {
  const result = await runDashboard({
    args: ['--json', '--widening-review-routing-outcome-record', REPO_ROUTING_OUTCOME_RECORD_PATH]
  });
  assert.equal(result.code, 0, formatFailure(result));
  const payload = parseJsonOutput(result.stdout);
  assert.equal(payload.governance.wideningReview.source, 'cm0645_explicit_input_fixture_plus_routing_outcome_record_v1');
  assert.equal(payload.governance.wideningReview.routingOutcomeRecordInputTrace.traceAvailable, true);
  assert.equal(payload.governance.wideningReview.routingOutcomeRecordInputTrace.sourceFileName, 'cm0605-routing-outcome-record-v1.md');
  assert.equal(payload.governance.wideningReview.reviewChecklist.W4.passed, true);
  assert.equal(payload.governance.wideningReview.reviewChecklist.W6.passed, false);
  assert.ok(
    payload.checks.some(
      check => check.code === 'authorized-write-path-widening-review'
        && check.message.includes('WIDENING_REVIEW_NOT_READY')
    )
  );
});

test('dashboard CLI should pass explicit widening-review outcome record through widening-adoption surfaces', async () => {
  const result = await runDashboard({
    args: ['--json', '--widening-adoption-review-record', REPO_WIDENING_ADOPTION_REVIEW_RECORD_PATH]
  });
  assert.equal(result.code, 0, formatFailure(result));
  const payload = parseJsonOutput(result.stdout);
  assert.equal(payload.governance.wideningAdoption.decision, 'WIDENING_ADOPTION_NOT_READY');
  assert.equal(payload.governance.wideningAdoption.wideningReviewRecordInputTrace.traceAvailable, true);
  assert.equal(payload.governance.wideningAdoption.adoptionChecklist.A4.passed, true);
  assert.equal(payload.governance.wideningAdoption.adoptionChecklist.A6.passed, false);
  assert.ok(
    payload.checks.some(
      check => check.code === 'authorized-write-path-widening-adoption'
        && check.message.includes('WIDENING_ADOPTION_NOT_READY')
    )
  );
});

test('dashboard CLI should pass explicit widening-adoption record through governance surfaces', async () => {
  const result = await runDashboard({
    args: [
      '--json',
      '--widening-adoption-review-record',
      REPO_WIDENING_ADOPTION_REVIEW_RECORD_PATH,
      '--widening-adoption-record',
      REPO_WIDENING_ADOPTION_RECORD_PATH
    ]
  });
  assert.equal(result.code, 0, formatFailure(result));
  const payload = parseJsonOutput(result.stdout);
  assert.equal(payload.governance.wideningAdoption.decision, 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY');
  assert.equal(payload.governance.wideningAdoption.wideningReviewRecordInputTrace.traceAvailable, true);
  assert.equal(payload.governance.wideningAdoption.wideningAdoptionRecordInputTrace.traceAvailable, true);
  assert.equal(payload.governance.wideningAdoption.adoptionChecklist.A10.passed, true);
  assert.equal(payload.governance.wideningAdoption.cm0595ApprovalLinePreview.previewUsableNow, true);
  assert.equal(payload.governance.wideningAdoption.cm0595CommandPreviewBundle.resolvedRecordPathMode, 'workspace_relative_pair');
  assert.equal(payload.governance.wideningAdoption.cm0595OperatorPacketDraft.packetKind, 'cm0595_auto_authorization_operator_packet');
  assert.equal(payload.governance.wideningAdoption.cm0595IssuanceRecordDraft.draftUsableNow, true);
  assert.equal(payload.governance.wideningAdoption.cm0595ExecutionEvidenceDraft.draftUsableNow, true);
  assert.match(payload.governance.wideningAdoption.renderedCm0595OperatorPacketTextSurface.markdown, /授权执行 CM-0595/);
  assert.ok(
    payload.checks.some(
      check => check.code === 'authorized-write-path-widening-adoption'
        && check.message.includes('WIDENING_ADOPTION_GRANTED_CM0595_ONLY')
        && check.message.includes('cm0595=ready')
    )
  );
});

test('dashboard CLI should pass explicit CM-0649 issuance record through widening-adoption surfaces', async () => {
  const result = await runDashboard({
    args: [
      '--json',
      '--summary-only',
      '--widening-adoption-review-record',
      REPO_WIDENING_ADOPTION_REVIEW_RECORD_PATH,
      '--widening-adoption-record',
      REPO_WIDENING_ADOPTION_RECORD_PATH,
      '--cm0595-issuance-record',
      REPO_CM0595_ISSUANCE_RECORD_PATH
    ]
  });

  assert.equal(result.code, 0, result.stderr || 'non-zero exit');
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.governance.wideningAdoption.cm0595IssuanceRecordInputTrace.traceAvailable, true);
  assert.equal(payload.governance.wideningAdoption.cm0595IssuanceRecordInputTrace.sourceFileName, 'cm0649-cm0595-approval-issuance-record-v1.md');
  assert.match(payload.governance.wideningAdoption.renderedCm0595OperatorPacketTextSurface.markdown, /issued CM-0595 record path: `\.\\tests\\fixtures\\cm0649-cm0595-approval-issuance-record-v1\.md`/);
});

test('dashboard CLI should pass explicit CM-0650 execution evidence record through widening-adoption surfaces', async () => {
  const result = await runDashboard({
    args: [
      '--json',
      '--summary-only',
      '--widening-adoption-review-record',
      REPO_WIDENING_ADOPTION_REVIEW_RECORD_PATH,
      '--widening-adoption-record',
      REPO_WIDENING_ADOPTION_RECORD_PATH,
      '--cm0595-issuance-record',
      REPO_CM0595_ISSUANCE_RECORD_PATH,
      '--cm0595-execution-evidence-record',
      REPO_CM0595_EXECUTION_EVIDENCE_RECORD_PATH
    ]
  });

  assert.equal(result.code, 0, result.stderr || 'non-zero exit');
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.governance.wideningAdoption.cm0595ExecutionEvidenceInputTrace.traceAvailable, true);
  assert.equal(payload.governance.wideningAdoption.cm0595ExecutionEvidenceInputTrace.sourceFileName, 'cm0650-cm0595-execution-evidence-record-v1.md');
  assert.equal(payload.governance.wideningAdoption.cm0595ExecutionEvidenceInputTrace.durableMemoryWriteCount, 1);
  assert.match(payload.governance.wideningAdoption.renderedCm0595OperatorPacketTextSurface.markdown, /CM-0595 execution evidence path: `\.\\tests\\fixtures\\cm0650-cm0595-execution-evidence-record-v1\.md`/);
  assert.equal(payload.governance.boundedRecallPreparation.decision, 'BOUNDED_RECALL_APPROVAL_PREPARED_EXACT_ONLY');
  assert.equal(payload.governance.boundedRecallPreparation.boundedRecallApprovalPrepared, true);
  assert.equal(payload.governance.boundedRecallPreparation.boundedRecallCommandPreviewBundle.bundleKind, 'bounded_recall_exact_approval_review_command_bundle');
  assert.equal(payload.governance.boundedRecallPreparation.boundedRecallCommandPreviewBundle.resolvedRecordPathMode, 'workspace_relative_triple');
  assert.equal(payload.governance.boundedRecallPreparation.boundedRecallApprovalIssuanceRecordDraft.draftUsableNow, true);
  assert.equal(payload.governance.boundedRecallPreparation.boundedRecallExecutionEvidenceDraft.draftUsableNow, true);
  assert.equal(payload.governance.boundedRecallPreparation.cm0595IssuanceRecordInputTrace.traceAvailable, true);
  assert.equal(payload.governance.boundedRecallPreparation.cm0595ExecutionEvidenceInputTrace.traceAvailable, true);
  assert.match(payload.governance.boundedRecallPreparation.renderedBoundedRecallTextSurface.markdown, /## Next Record Drafts/);
});
