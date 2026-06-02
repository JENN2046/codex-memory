'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  buildF2A5Gap6ApprovalTemplate,
  buildF3TrueLiveRecallApprovalTemplate,
  buildF4MinimalDogfoodWriteApprovalTemplate,
  buildPhaseFPersonalRcReadinessSnapshot
} = require('../src/core/PhaseFPersonalRcReadinessSnapshot');
const {
  evaluateA5ApprovalLine
} = require('../src/core/A5ApprovalLineVerifier');
const {
  detectPhaseFEvidence,
  parseArgs,
  renderText
} = require('../src/cli/phase-f-personal-rc-readiness-snapshot');

function cleanAheadSyncPacket() {
  return {
    branch: 'main',
    currentHead: 'f68b9ffa505f12e4f3b944e30f3b26e71f3e462f',
    originHead: '546915bec01fd8ffd0fd974f59b6fc95966218a4',
    ahead: 6,
    behind: 0,
    worktreeClean: true,
    nextRequiredAction: 'obtain_explicit_normal_non_force_push_approval',
    approvalTemplate: 'I approve pushing local main commits through f68b9ffa505f12e4f3b944e30f3b26e71f3e462f to origin/main for codex-memory from A:\\codex-memory, using a normal non-force push to origin main only, with no tags, no PR, no deploy, no release, no merge, no rebase, no config/watchdog/startup change, no provider call, no MCP call, no real memory read/write, and no readiness or reliability claim.',
    postPushA5Gap4ApprovalTemplate: 'I approve A5-GAP-4 live-client no-write contract refresh for codex-memory on branch main at commit f68b9ffa505f12e4f3b944e30f3b26e71f3e462f, endpoint http://127.0.0.1:7605, using current-session bearer token if already present, without printing or persisting token material, allow tools/call memory_overview and no-token rejection checks for record_memory/search_memory only, no provider, no durable write, no config/watchdog/startup change.',
    postPushA5Gap4TemplateCurrentlyUsable: false,
    postPushA5UsabilityStatus: 'not_currently_usable_until_clean_synced_head',
    syncBlocker: {
      status: 'push_approval_required',
      reasons: ['local_branch_ahead_remote'],
      redLaneActionRequired: true
    }
  };
}

test('Phase F personal RC snapshot blocks at F1 when sync push approval is required', () => {
  const snapshot = buildPhaseFPersonalRcReadinessSnapshot({
    syncPacket: cleanAheadSyncPacket(),
    evidence: {}
  });

  assert.equal(snapshot.status, 'PHASE_F_PERSONAL_RC_EVIDENCE_READINESS_SNAPSHOT');
  assert.equal(snapshot.decision, 'NOT_READY_BLOCKED');
  assert.equal(snapshot.operatorState, 'RC_NOT_READY_BLOCKED');
  assert.equal(snapshot.targetCurrentlyAchieved, false);
  assert.equal(snapshot.readinessClaimAllowed, false);
  assert.equal(snapshot.rcReady, false);
  assert.equal(snapshot.blockingPhase.id, 'F1');
  assert.equal(snapshot.blockingPhase.status, 'push_approval_required');
  assert.equal(snapshot.blockingPhase.blocker, 'local_branch_ahead_remote');
  assert.equal(snapshot.nextRequiredAction, 'obtain_explicit_normal_non_force_push_approval');
  assert.match(snapshot.approvalTemplates.pushApprovalTemplate, /normal non-force push/);
  assert.match(snapshot.approvalTemplates.postPushA5Gap4ApprovalTemplate, /A5-GAP-4 live-client no-write contract refresh/);
  assert.equal(snapshot.approvalTemplates.postPushA5Gap4TemplateCurrentlyUsable, false);
  assert.equal(snapshot.approvalTemplates.postPushA5UsabilityStatus, 'not_currently_usable_until_clean_synced_head');
  assert.deepEqual(snapshot.missingPhases, ['F1', 'F2', 'F3', 'F4', 'F5']);
  assert.equal(snapshot.safetyCounters.push, 0);
  assert.equal(snapshot.safetyCounters.mcpCalls, 0);
  assert.equal(snapshot.safetyCounters.realMemoryWrites, 0);
});

test('Phase F personal RC snapshot blocks F2 until aggregation evidence exists', () => {
  const snapshot = buildPhaseFPersonalRcReadinessSnapshot({
    syncPacket: cleanAheadSyncPacket(),
    evidence: {
      f1LiveNoWriteEvidenceAccepted: true
    }
  });

  assert.equal(snapshot.blockingPhase.id, 'F2');
  assert.equal(snapshot.blockingPhase.status, 'missing_evidence');
  assert.equal(snapshot.blockingPhase.blocker, 'missing_f2_evidence');
  assert.equal(snapshot.blockingPhase.nextAction, 'obtain_exact_a5_gap6_approval_after_f1');
  assert.equal(snapshot.phases[0].status, 'complete');
  assert.deepEqual(snapshot.missingPhases, ['F2', 'F3', 'F4', 'F5']);
  assert.match(snapshot.approvalTemplates.f2A5Gap6ApprovalTemplate, /A5-GAP-6/);
  assert.equal(snapshot.approvalTemplates.f2A5Gap6TemplateCurrentlyUsable, true);
});

test('Phase F personal RC snapshot F2 approval template is accepted by A5 verifier', () => {
  const commit = 'dc6d0ffec259f3364899ecb8a14cb6ab26543e96';
  const template = buildF2A5Gap6ApprovalTemplate({
    branch: 'main',
    currentHead: commit
  });
  const result = evaluateA5ApprovalLine({
    approvalLine: template,
    expectedUnit: 'A5-GAP-6',
    expectedBranch: 'main',
    expectedCommit: commit
  });

  assert.equal(result.approvalAccepted, true);
  assert.equal(result.authorizationGranted, true);
  assert.deepEqual(result.parsedApprovalScope.approvedEvidenceUnits, [
    'A5-GAP-1',
    'A5-GAP-2',
    'A5-GAP-3',
    'A5-GAP-4',
    'A5-GAP-5'
  ]);
  assert.equal(
    result.parsedApprovalScope.includedEvidenceFile,
    'CM1377_PHASE_F1_LIVE_NO_WRITE_ACCEPTED_EVIDENCE.md'
  );
  assert.equal(result.parsedApprovalScope.noNewRuntimeAction, true);
});

test('Phase F personal RC snapshot detects committed CM-1377 F1 evidence document', () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'phase-f-evidence-'));
  const docsDir = path.join(workspace, 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(path.join(docsDir, 'CM1377_PHASE_F1_LIVE_NO_WRITE_ACCEPTED_EVIDENCE.md'), [
    '# CM-1377 Phase F1 Live No-Write Accepted Evidence',
    '',
    'Status: `COMPLETED_VALIDATED_F1_ACCEPTED_NOT_READY`',
    '',
    'PHASE_F1_LIVE_CLIENT_NO_WRITE_EVIDENCE_CAPTURED_NOT_READY',
    '',
    '- F1 evidence accepted: `true`'
  ].join('\n'), 'utf8');

  const evidence = detectPhaseFEvidence(workspace);
  assert.equal(evidence.f1LiveNoWriteEvidenceAccepted, true);

  const snapshot = buildPhaseFPersonalRcReadinessSnapshot({
    syncPacket: {
      branch: 'main',
      currentHead: 'dc6d0ffec259f3364899ecb8a14cb6ab26543e96',
      originHead: 'dc6d0ffec259f3364899ecb8a14cb6ab26543e96',
      ahead: 0,
      behind: 0,
      worktreeClean: true
    },
    evidence
  });

  assert.equal(snapshot.phases[0].status, 'complete');
  assert.equal(snapshot.blockingPhase.id, 'F2');
  assert.equal(snapshot.nextRequiredAction, 'obtain_exact_a5_gap6_approval_after_f1');
});

test('Phase F personal RC snapshot detects committed CM-1379 F2 aggregation evidence document', () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'phase-f-evidence-'));
  const docsDir = path.join(workspace, 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(path.join(docsDir, 'CM1377_PHASE_F1_LIVE_NO_WRITE_ACCEPTED_EVIDENCE.md'), [
    '# CM-1377 Phase F1 Live No-Write Accepted Evidence',
    '',
    'Status: `COMPLETED_VALIDATED_F1_ACCEPTED_NOT_READY`',
    '',
    'PHASE_F1_LIVE_CLIENT_NO_WRITE_EVIDENCE_CAPTURED_NOT_READY',
    '',
    '- F1 evidence accepted: `true`'
  ].join('\n'), 'utf8');
  fs.writeFileSync(path.join(docsDir, 'CM1379_PHASE_F2_A5_GAP6_AGGREGATION_EVIDENCE.md'), [
    '# CM-1379 Phase F2 A5-GAP-6 Aggregation Evidence',
    '',
    'Status: `COMPLETED_VALIDATED_F2_ACCEPTED_NOT_READY`',
    '',
    'phase_f_f1_accepted_f2_aggregation_refresh_not_ready',
    '',
    '- F2 evidence accepted: `true`'
  ].join('\n'), 'utf8');

  const evidence = detectPhaseFEvidence(workspace);
  assert.equal(evidence.f1LiveNoWriteEvidenceAccepted, true);
  assert.equal(evidence.f2A5Gap6AggregationAccepted, true);

  const snapshot = buildPhaseFPersonalRcReadinessSnapshot({
    syncPacket: {
      branch: 'main',
      currentHead: 'e032444e93a207e83e7628acd3c69227ad8fcb28',
      originHead: 'e032444e93a207e83e7628acd3c69227ad8fcb28',
      ahead: 0,
      behind: 0,
      worktreeClean: true
    },
    evidence
  });

  assert.equal(snapshot.phases[0].status, 'complete');
  assert.equal(snapshot.phases[1].status, 'complete');
  assert.equal(snapshot.blockingPhase.id, 'F3');
  assert.equal(snapshot.nextRequiredAction, 'obtain_exact_true_live_recall_approval_after_f2');
  assert.deepEqual(snapshot.missingPhases, ['F3', 'F4', 'F5']);
  assert.match(
    snapshot.approvalTemplates.f3TrueLiveRecallApprovalTemplate,
    /MEMORY_RECALL_TRUE_LIVE_REAL_STORE_PROOF_EXECUTION_ONCE/
  );
  assert.equal(snapshot.approvalTemplates.f3TrueLiveRecallTemplateCurrentlyUsable, true);
});

test('Phase F personal RC snapshot F3 approval template is head-bound and non-empty', () => {
  const commit = '171cfb14e70af8665d3349be6e0b02d0f119b7e1';
  const template = buildF3TrueLiveRecallApprovalTemplate({ currentHead: commit });

  assert.match(template, new RegExp(`commit ${commit}`));
  assert.match(template, /exactly four read-only true live search_memory calls/);
  assert.match(template, /CM-0814 stricter negative-control query family/);
  assert.match(template, /no readiness or reliability claim/);
});

test('Phase F personal RC snapshot F4 approval template is head-bound and bounded to one sanitized write', () => {
  const commit = 'e564b5c67093f93657ecf3a8841d9daf2ec90051';
  const template = buildF4MinimalDogfoodWriteApprovalTemplate({
    branch: 'main',
    currentHead: commit
  });

  assert.match(template, new RegExp(`commit ${commit}`));
  assert.match(template, /exactly one sanitized record_memory call/);
  assert.match(template, /current local codex-memory real store/);
  assert.match(template, /allow only the durable memory\/audit write required for that single sanitized dogfood record/);
  assert.match(template, /no provider call/);
  assert.match(template, /no search_memory call/);
  assert.match(template, /no broad real memory scan/);
  assert.match(template, /no readiness or reliability claim/);
});

test('Phase F personal RC snapshot detects committed CM-1381 F3 evidence document', () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'phase-f-evidence-'));
  const docsDir = path.join(workspace, 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(path.join(docsDir, 'CM1377_PHASE_F1_LIVE_NO_WRITE_ACCEPTED_EVIDENCE.md'), [
    '# CM-1377 Phase F1 Live No-Write Accepted Evidence',
    '',
    'Status: `COMPLETED_VALIDATED_F1_ACCEPTED_NOT_READY`',
    '',
    'PHASE_F1_LIVE_CLIENT_NO_WRITE_EVIDENCE_CAPTURED_NOT_READY',
    '',
    '- F1 evidence accepted: `true`'
  ].join('\n'), 'utf8');
  fs.writeFileSync(path.join(docsDir, 'CM1379_PHASE_F2_A5_GAP6_AGGREGATION_EVIDENCE.md'), [
    '# CM-1379 Phase F2 A5-GAP-6 Aggregation Evidence',
    '',
    'Status: `COMPLETED_VALIDATED_F2_ACCEPTED_NOT_READY`',
    '',
    'phase_f_f1_accepted_f2_aggregation_refresh_not_ready',
    '',
    '- F2 evidence accepted: `true`'
  ].join('\n'), 'utf8');
  fs.writeFileSync(path.join(docsDir, 'CM1381_PHASE_F3_TRUE_LIVE_RECALL_NEGATIVE_CONTROL_EVIDENCE.md'), [
    '# CM-1381 Phase F3 True-Live Recall Negative-Control Evidence',
    '',
    'Status: `COMPLETED_VALIDATED_F3_ACCEPTED_NOT_READY`',
    '',
    'TRUE_LIVE_REAL_STORE_RECALL_PROOF_PASSED_NOT_READY',
    '',
    '- F3 evidence accepted: `true`'
  ].join('\n'), 'utf8');

  const evidence = detectPhaseFEvidence(workspace);
  assert.equal(evidence.f1LiveNoWriteEvidenceAccepted, true);
  assert.equal(evidence.f2A5Gap6AggregationAccepted, true);
  assert.equal(evidence.f3TrueLiveRecallNegativeControlAccepted, true);

  const snapshot = buildPhaseFPersonalRcReadinessSnapshot({
    syncPacket: {
      branch: 'main',
      currentHead: '4bbd27892d07159ebb9397701985e31507126a74',
      originHead: '4bbd27892d07159ebb9397701985e31507126a74',
      ahead: 0,
      behind: 0,
      worktreeClean: true
    },
    evidence
  });

  assert.equal(snapshot.phases[2].status, 'complete');
  assert.equal(snapshot.blockingPhase.id, 'F4');
  assert.equal(snapshot.nextRequiredAction, 'obtain_exact_minimal_dogfood_write_approval_after_f3');
  assert.deepEqual(snapshot.missingPhases, ['F4', 'F5']);
  assert.equal(snapshot.approvalTemplates.f3TrueLiveRecallTemplateCurrentlyUsable, false);
  assert.match(
    snapshot.approvalTemplates.f4MinimalDogfoodWriteApprovalTemplate,
    /MEMORY_WRITE_MINIMAL_PERSONAL_DOGFOOD_EXECUTION_ONCE/
  );
  assert.equal(snapshot.approvalTemplates.f4MinimalDogfoodWriteTemplateCurrentlyUsable, true);
});

test('Phase F personal RC snapshot detects committed CM-1383 F4 evidence document', () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'phase-f-evidence-'));
  const docsDir = path.join(workspace, 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(path.join(docsDir, 'CM1377_PHASE_F1_LIVE_NO_WRITE_ACCEPTED_EVIDENCE.md'), [
    '# CM-1377 Phase F1 Live No-Write Accepted Evidence',
    '',
    'Status: `COMPLETED_VALIDATED_F1_ACCEPTED_NOT_READY`',
    '',
    'PHASE_F1_LIVE_CLIENT_NO_WRITE_EVIDENCE_CAPTURED_NOT_READY',
    '',
    '- F1 evidence accepted: `true`'
  ].join('\n'), 'utf8');
  fs.writeFileSync(path.join(docsDir, 'CM1379_PHASE_F2_A5_GAP6_AGGREGATION_EVIDENCE.md'), [
    '# CM-1379 Phase F2 A5-GAP-6 Aggregation Evidence',
    '',
    'Status: `COMPLETED_VALIDATED_F2_ACCEPTED_NOT_READY`',
    '',
    'phase_f_f1_accepted_f2_aggregation_refresh_not_ready',
    '',
    '- F2 evidence accepted: `true`'
  ].join('\n'), 'utf8');
  fs.writeFileSync(path.join(docsDir, 'CM1381_PHASE_F3_TRUE_LIVE_RECALL_NEGATIVE_CONTROL_EVIDENCE.md'), [
    '# CM-1381 Phase F3 True-Live Recall Negative-Control Evidence',
    '',
    'Status: `COMPLETED_VALIDATED_F3_ACCEPTED_NOT_READY`',
    '',
    'TRUE_LIVE_REAL_STORE_RECALL_PROOF_PASSED_NOT_READY',
    '',
    '- F3 evidence accepted: `true`'
  ].join('\n'), 'utf8');
  fs.writeFileSync(path.join(docsDir, 'CM1383_PHASE_F4_MINIMAL_DOGFOOD_WRITE_EVIDENCE.md'), [
    '# CM-1383 Phase F4 Minimal Dogfood Write Evidence',
    '',
    'Status: `COMPLETED_VALIDATED_F4_ACCEPTED_NOT_READY`',
    '',
    'PHASE_F4_SINGLE_RECORD_MEMORY_CALL_COMPLETED_SANITIZED_RESULT',
    '',
    '- F4 evidence accepted: `true`'
  ].join('\n'), 'utf8');

  const evidence = detectPhaseFEvidence(workspace);
  assert.equal(evidence.f1LiveNoWriteEvidenceAccepted, true);
  assert.equal(evidence.f2A5Gap6AggregationAccepted, true);
  assert.equal(evidence.f3TrueLiveRecallNegativeControlAccepted, true);
  assert.equal(evidence.f4MinimalDogfoodWriteAccepted, true);

  const snapshot = buildPhaseFPersonalRcReadinessSnapshot({
    syncPacket: {
      branch: 'main',
      currentHead: '13a3a313e99611b31ba671fadb63e0f61797b5aa',
      originHead: '13a3a313e99611b31ba671fadb63e0f61797b5aa',
      ahead: 0,
      behind: 0,
      worktreeClean: true
    },
    evidence
  });

  assert.equal(snapshot.phases[3].status, 'complete');
  assert.equal(snapshot.blockingPhase.id, 'F5');
  assert.equal(snapshot.nextRequiredAction, 'execute_closeout_after_f4');
  assert.deepEqual(snapshot.missingPhases, ['F5']);
  assert.equal(snapshot.approvalTemplates.f4MinimalDogfoodWriteTemplateCurrentlyUsable, false);
  assert.equal(snapshot.targetCurrentlyAchieved, false);
});

test('Phase F personal RC snapshot detects committed CM-1384 F5 closeout document without RC ready', () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'phase-f-evidence-'));
  const docsDir = path.join(workspace, 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(path.join(docsDir, 'CM1377_PHASE_F1_LIVE_NO_WRITE_ACCEPTED_EVIDENCE.md'), [
    '# CM-1377 Phase F1 Live No-Write Accepted Evidence',
    '',
    'Status: `COMPLETED_VALIDATED_F1_ACCEPTED_NOT_READY`',
    '',
    'PHASE_F1_LIVE_CLIENT_NO_WRITE_EVIDENCE_CAPTURED_NOT_READY',
    '',
    '- F1 evidence accepted: `true`'
  ].join('\n'), 'utf8');
  fs.writeFileSync(path.join(docsDir, 'CM1379_PHASE_F2_A5_GAP6_AGGREGATION_EVIDENCE.md'), [
    '# CM-1379 Phase F2 A5-GAP-6 Aggregation Evidence',
    '',
    'Status: `COMPLETED_VALIDATED_F2_ACCEPTED_NOT_READY`',
    '',
    'phase_f_f1_accepted_f2_aggregation_refresh_not_ready',
    '',
    '- F2 evidence accepted: `true`'
  ].join('\n'), 'utf8');
  fs.writeFileSync(path.join(docsDir, 'CM1381_PHASE_F3_TRUE_LIVE_RECALL_NEGATIVE_CONTROL_EVIDENCE.md'), [
    '# CM-1381 Phase F3 True-Live Recall Negative-Control Evidence',
    '',
    'Status: `COMPLETED_VALIDATED_F3_ACCEPTED_NOT_READY`',
    '',
    'TRUE_LIVE_REAL_STORE_RECALL_PROOF_PASSED_NOT_READY',
    '',
    '- F3 evidence accepted: `true`'
  ].join('\n'), 'utf8');
  fs.writeFileSync(path.join(docsDir, 'CM1383_PHASE_F4_MINIMAL_DOGFOOD_WRITE_EVIDENCE.md'), [
    '# CM-1383 Phase F4 Minimal Dogfood Write Evidence',
    '',
    'Status: `COMPLETED_VALIDATED_F4_ACCEPTED_NOT_READY`',
    '',
    'PHASE_F4_SINGLE_RECORD_MEMORY_CALL_COMPLETED_SANITIZED_RESULT',
    '',
    '- F4 evidence accepted: `true`'
  ].join('\n'), 'utf8');
  fs.writeFileSync(path.join(docsDir, 'CM1384_PHASE_F5_PERSONAL_RC_CLOSEOUT_EVIDENCE.md'), [
    '# CM-1384 Phase F5 Personal RC Closeout Evidence',
    '',
    'Status: `COMPLETED_VALIDATED_PERSONAL_DOGFOOD_READY_NOT_RC_READY`',
    '',
    'PERSONAL_DOGFOOD_READY_NOT_RC_READY',
    '',
    '- F5 closeout accepted: `true`',
    '- RC ready: `false`'
  ].join('\n'), 'utf8');

  const evidence = detectPhaseFEvidence(workspace);
  assert.equal(evidence.f1LiveNoWriteEvidenceAccepted, true);
  assert.equal(evidence.f2A5Gap6AggregationAccepted, true);
  assert.equal(evidence.f3TrueLiveRecallNegativeControlAccepted, true);
  assert.equal(evidence.f4MinimalDogfoodWriteAccepted, true);
  assert.equal(evidence.f5CloseoutAccepted, true);

  const snapshot = buildPhaseFPersonalRcReadinessSnapshot({
    syncPacket: {
      branch: 'main',
      currentHead: 'd1e5e8fd0cfccd70e7767fe3350b1cddeaf182aa',
      originHead: 'd1e5e8fd0cfccd70e7767fe3350b1cddeaf182aa',
      ahead: 0,
      behind: 0,
      worktreeClean: true
    },
    evidence
  });

  assert.equal(snapshot.decision, 'PERSONAL_DOGFOOD_READY_NOT_RC_READY');
  assert.equal(snapshot.operatorState, 'PERSONAL_DOGFOOD_READY_NOT_RC_READY');
  assert.equal(snapshot.targetCurrentlyAchieved, true);
  assert.equal(snapshot.readinessClaimAllowed, true);
  assert.equal(snapshot.rcReady, false);
  assert.equal(snapshot.blockingPhase, null);
  assert.deepEqual(snapshot.missingPhases, []);
});

test('Phase F personal RC snapshot can represent personal dogfood ready without RC ready', () => {
  const snapshot = buildPhaseFPersonalRcReadinessSnapshot({
    syncPacket: {
      branch: 'main',
      currentHead: 'f68b9ffa505f12e4f3b944e30f3b26e71f3e462f',
      originHead: 'f68b9ffa505f12e4f3b944e30f3b26e71f3e462f',
      ahead: 0,
      behind: 0,
      worktreeClean: true
    },
    evidence: {
      f1LiveNoWriteEvidenceAccepted: true,
      f2A5Gap6AggregationAccepted: true,
      f3TrueLiveRecallNegativeControlAccepted: true,
      f4MinimalDogfoodWriteAccepted: true,
      f5CloseoutAccepted: true
    }
  });

  assert.equal(snapshot.decision, 'PERSONAL_DOGFOOD_READY_NOT_RC_READY');
  assert.equal(snapshot.operatorState, 'PERSONAL_DOGFOOD_READY_NOT_RC_READY');
  assert.equal(snapshot.targetCurrentlyAchieved, true);
  assert.equal(snapshot.readinessClaimAllowed, true);
  assert.equal(snapshot.rcReady, false);
  assert.equal(snapshot.blockingPhase, null);
  assert.deepEqual(snapshot.missingPhases, []);
  assert.equal(snapshot.safetyCounters.readinessClaims, 0);
  assert.equal(snapshot.safetyCounters.reliabilityClaims, 0);
});

test('Phase F personal RC snapshot CLI helpers render blocked state and reject side-effect flags', () => {
  const snapshot = buildPhaseFPersonalRcReadinessSnapshot({
    syncPacket: cleanAheadSyncPacket()
  });
  const text = renderText(snapshot);

  assert.match(text, /blockingPhase: F1/);
  assert.match(text, /approvalTemplates:/);
  assert.match(text, /pushApprovalTemplate: I approve pushing local main commits/);
  assert.match(text, /f2A5Gap6ApprovalTemplate:/);
  assert.match(text, /f3TrueLiveRecallApprovalTemplate:/);
  assert.match(text, /f4MinimalDogfoodWriteApprovalTemplate:/);
  assert.match(text, /readinessClaimAllowed: false/);
  assert.throws(() => parseArgs(['--push']), /unsupported side-effect flag/);
  assert.throws(() => parseArgs(['--record-memory']), /unsupported side-effect flag/);
});
