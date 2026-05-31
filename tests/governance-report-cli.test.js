const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { spawn } = require('node:child_process');

const REPO_ASSERTION_RECORD_PATH = path.join(
  process.cwd(),
  'tests',
  'fixtures',
  'external-token-material-assertion-record-v1.json'
);
const REPO_ASSERTION_RECORD_MARKDOWN_PATH = path.join(
  process.cwd(),
  'tests',
  'fixtures',
  'external-token-material-assertion-record-v1.md'
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
const REPO_BOUNDED_RECALL_ISSUANCE_RECORD_PATH = path.join(
  process.cwd(),
  'tests',
  'fixtures',
  'cm0658-bounded-recall-approval-issuance-record-v1.md'
);
const REPO_BOUNDED_RECALL_EXECUTION_EVIDENCE_RECORD_PATH = path.join(
  process.cwd(),
  'tests',
  'fixtures',
  'cm0659-bounded-recall-execution-evidence-record-v1.md'
);

function runGovernanceReport({ args = [], env = {} } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['src/cli/governance-report.js', ...args], {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
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

async function seedGovernanceDb(dbPath) {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  try {
    db.exec(`
      CREATE TABLE memory_records (
        memory_id TEXT PRIMARY KEY,
        status TEXT,
        project_id TEXT,
        visibility TEXT,
        client_id TEXT,
        confidence REAL,
        updated_at TEXT,
        superseded_by TEXT,
        supersedes TEXT,
        task_id TEXT,
        retention_policy TEXT
      );
    `);
    const insert = db.prepare(`
      INSERT INTO memory_records (
        memory_id, status, project_id, visibility, client_id, confidence,
        updated_at, superseded_by, supersedes, task_id, retention_policy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const now = Date.now();
    const daysAgo = days => new Date(now - days * 86400000).toISOString();
    insert.run('active-100d', 'active', 'codex-memory', 'project', 'codex', 1.0,
      daysAgo(100), null, null, 'task-r3', 'permanent');
    insert.run('active-40d', 'active', 'codex-memory', 'shared', 'claude', 0.5,
      daysAgo(40), null, null, '', 'ttl:30d');
    insert.run('proposal-1', 'proposal', 'codex-memory', 'shared', 'claude', 0.2,
      daysAgo(10), null, null, null, 'ttl:7d');
    insert.run('tombstone-1', 'tombstoned', null, 'project', 'codex', 0.9,
      daysAgo(11), null, null, null, 'permanent');
    insert.run('superseded-1', 'superseded', 'agent-image-lab', 'project', 'codex', 0.7,
      daysAgo(20), 'active-new', null, null, 'session');
    insert.run('active-new', 'active', 'agent-image-lab', 'project', 'codex', null,
      daysAgo(9), null, 'superseded-1', null, 'long-lived');
  } finally {
    db.close();
  }
}

test('governance-report CLI should summarize proposal/tombstone/supersession/stale metrics in json mode', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-governance-report-'));
  const dbPath = path.join(tempBasePath, 'state', 'governance.sqlite');

  try {
    await seedGovernanceDb(dbPath);
    const result = await runGovernanceReport({
      args: ['--json'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DB_PATH: dbPath
      }
    });

    assert.equal(result.code, 0, result.stderr || 'non-zero exit');
    const payload = JSON.parse(result.stdout);
    assert.deepEqual(Object.keys(payload).sort(), [
      'autoAuthorization',
      'boundedRecallCloseout',
      'boundedRecallPreparation',
      'confidence',
      'destructive',
      'generatedAt',
      'mode',
      'paths',
      'proposals',
      'readPolicy',
      'retention',
      'review',
      'scopeCoverage',
      'staleness',
      'statusDistribution',
      'summary',
      'supersession',
      'tombstoned',
      'totalRecords',
      'wideningAdoption',
      'wideningReview'
    ]);
    assert.deepEqual(Object.keys(payload.review).sort(), [
      'autoAuthorization',
      'boundedRecallCloseout',
      'boundedRecallPreparation',
      'counts',
      'hints',
      'message',
      'readPolicy',
      'retention',
      'reviewLevel',
      'status',
      'statusDistribution',
      'wideningAdoption',
      'wideningReview'
    ]);
    assert.deepEqual(Object.keys(payload.review.autoAuthorization).sort(), [
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
    ].sort());
    assert.equal(payload.mode, 'governance-report');
    assert.equal(payload.destructive, false);
    assert.equal(payload.summary.status, 'ok');
    assert.equal(payload.readPolicy.status, 'config_only_no_recent_audit');
    assert.equal(payload.readPolicy.source, 'config-only-no-recent-audit');
    assert.equal(payload.readPolicy.evidenceState, 'config_only_missing_recent_audit');
    assert.equal(payload.readPolicy.configEvidenceAvailable, true);
    assert.equal(payload.readPolicy.auditEvidenceAvailable, false);
    assert.equal(payload.readPolicy.auditedEntryCount, 0);
    assert.equal(payload.readPolicy.auditTailLimit, 20);
    assert.equal(payload.readPolicy.latestReadPolicyAuditAt, null);
    assert.equal(payload.readPolicy.nextEvidenceAction, 'collect_recent_read_policy_audit_evidence_before_readiness_claim');
    assert.equal(payload.readPolicy.readPolicyConfigured, false);
    assert.equal(payload.readPolicy.lifecyclePolicyEnabled, false);
    assert.equal(payload.readPolicy.softReadPolicyEnabled, false);
    assert.deepEqual(payload.readPolicy.lifecycleIncludedStatuses, ['active', 'stale']);
    assert.deepEqual(payload.readPolicy.lifecycleExcludedStatuses, ['proposal', 'rejected', 'superseded', 'tombstoned']);
    assert.equal(payload.readPolicy.rawWorkspaceIdExposed, false);
    assert.equal(payload.readPolicy.noProvider, true);
    assert.equal(payload.readPolicy.mutated, false);
    assert.equal(payload.readPolicy.migrationApplied, false);
    assert.equal(payload.review.readPolicy.rawWorkspaceIdExposed, false);
    assert.equal(payload.review.autoAuthorization.allowedGovernanceOutput, 'NO_AUTO_APPROVAL_ISSUED');
    assert.equal(payload.review.autoAuthorization.assertionRecordInputTrace, null);
    assert.equal(payload.review.autoAuthorization.operatorActionPlan.currentStage, 'await_cm0611_assertion_record');
    assert.equal(payload.review.autoAuthorization.assertionRecordPreview.previewAvailable, true);
    assert.equal(payload.review.autoAuthorization.assertionRecordPreview.previewUsableNow, true);
    assert.equal(payload.review.autoAuthorization.approvalLinePreview.previewAvailable, true);
    assert.equal(payload.review.autoAuthorization.approvalLinePreview.previewUsableNow, false);
    assert.equal(payload.review.autoAuthorization.issuanceRecordPreview.previewAvailable, true);
    assert.equal(payload.review.autoAuthorization.issuanceRecordPreview.previewUsableNow, false);
    assert.equal(payload.review.autoAuthorization.routingOutcomePreview.previewAvailable, true);
    assert.equal(payload.review.autoAuthorization.routingOutcomePreview.previewUsableNow, false);
    assert.equal(payload.review.autoAuthorization.wideningReviewPreview.previewAvailable, true);
    assert.equal(payload.review.autoAuthorization.wideningReviewPreview.previewUsableNow, false);
    assert.equal(payload.review.autoAuthorization.recordDrafts.cm0614Issuance.draftAvailable, true);
    assert.equal(payload.review.autoAuthorization.recordDrafts.cm0614Issuance.draftUsableNow, false);
    assert.equal(payload.review.autoAuthorization.renderedArtifactTextSurface.previewAvailable, true);
    assert.equal(payload.review.autoAuthorization.renderedArtifactTextSurface.selectedDraftId, 'cm0611AssertionRecord');
    assert.equal(payload.review.autoAuthorization.renderedArtifactTextSurface.selectedDraftUsableNow, true);
    assert.match(
      payload.review.autoAuthorization.renderedArtifactTextSurface.selectedDraftMarkdown,
      /source workspace-relative path: `none`/
    );
    assert.match(
      payload.review.autoAuthorization.renderedArtifactTextSurface.selectedDraftMarkdown,
      /helper review command: `node \.\\src\\cli\\authorized-write-path-auto-authorization\.js --json --assertion-record <CM0611_assertion_record_path>`/
    );
    assert.equal(payload.review.autoAuthorization.renderedOperatorPacketTextSurface.previewAvailable, true);
    assert.equal(payload.review.autoAuthorization.renderedOperatorPacketTextSurface.previewUsableNow, true);
    assert.equal(payload.review.autoAuthorization.renderedOperatorPacketTextSurface.packetKind, 'assertion_record_operator_packet');
    assert.equal(payload.review.autoAuthorization.renderedOperatorPacketTextSurface.selectedDraftId, 'cm0611AssertionRecord');
    assert.match(
      payload.review.autoAuthorization.renderedOperatorPacketTextSurface.markdown,
      /resolved assertion record path mode: `placeholder_only`/
    );
    assert.equal(payload.review.autoAuthorization.renderedOperatorBriefTextSurface.previewAvailable, true);
    assert.equal(payload.review.autoAuthorization.renderedOperatorBriefTextSurface.previewUsableNow, true);
    assert.equal(
      payload.review.autoAuthorization.renderedOperatorBriefTextSurface.briefKind,
      'assertion_record_only__assertion_record_operator_packet'
    );
    assert.equal(payload.review.autoAuthorization.artifactBundleDraft.bundleKind, 'assertion_record_only');
    assert.equal(payload.review.autoAuthorization.commandPreviewBundle.bundleKind, 'assertion_record_command_bundle');
    assert.equal(payload.review.autoAuthorization.operatorPacketDraft.packetKind, 'assertion_record_operator_packet');
    assert.equal(payload.wideningReview.decision, 'WIDENING_REVIEW_NOT_READY');
    assert.equal(payload.wideningReview.renderedReviewTextSurface.previewAvailable, true);
    assert.equal(payload.wideningAdoption.decision, 'WIDENING_ADOPTION_NOT_READY');
    assert.equal(payload.wideningAdoption.renderedAdoptionTextSurface.previewAvailable, true);
    assert.equal(payload.wideningAdoption.cm0595ApprovalLinePreview.previewAvailable, true);
    assert.equal(payload.wideningAdoption.cm0595ApprovalLinePreview.previewUsableNow, false);
    assert.equal(payload.wideningAdoption.cm0595OperatorPacketDraft.packetKind, 'cm0595_operator_packet_blocked');
    assert.equal(payload.wideningAdoption.cm0595IssuanceRecordDraft.draftUsableNow, false);
    assert.equal(payload.wideningAdoption.cm0595ExecutionEvidenceDraft.draftUsableNow, false);
    assert.equal(payload.wideningAdoption.cm0595IssuanceRecordInputTrace, null);
    assert.equal(payload.wideningAdoption.cm0595ExecutionEvidenceInputTrace, null);
    assert.equal(payload.boundedRecallPreparation.decision, 'BOUNDED_RECALL_APPROVAL_NOT_READY');
    assert.equal(payload.boundedRecallPreparation.renderedBoundedRecallTextSurface.previewAvailable, true);
    assert.equal(payload.boundedRecallPreparation.boundedRecallApprovalPrepared, false);
    assert.equal(payload.boundedRecallPreparation.boundedRecallCommandPreviewBundle.bundleKind, 'bounded_recall_review_command_bundle_blocked');
    assert.equal(payload.boundedRecallPreparation.boundedRecallApprovalIssuanceRecordDraft.draftKind, 'bounded_recall_approval_issuance_record_draft_blocked');
    assert.equal(payload.boundedRecallPreparation.boundedRecallExecutionEvidenceDraft.draftKind, 'bounded_recall_execution_evidence_draft_blocked');
    assert.equal(payload.boundedRecallPreparation.cm0595IssuanceRecordInputTrace, null);
    assert.equal(payload.boundedRecallPreparation.cm0595ExecutionEvidenceInputTrace, null);
    assert.equal(payload.boundedRecallCloseout.decision, 'BOUNDED_RECALL_CLOSEOUT_NOT_READY');
    assert.equal(payload.boundedRecallCloseout.renderedCloseoutTextSurface.previewAvailable, true);
    assert.equal(payload.boundedRecallCloseout.boundedRecallCloseoutReady, false);
    assert.equal(payload.boundedRecallCloseout.closeoutRecordDraft.draftUsableNow, false);
    assert.equal(
      payload.boundedRecallCloseout.boundedRecallPreparationCommandPreviewBundle.bundleKind,
      'bounded_recall_preparation_command_bundle_blocked'
    );
    assert.equal(
      payload.boundedRecallCloseout.boundedRecallPreparationOperatorPacketDraft.draftUsableNow,
      false
    );
    assert.equal(
      payload.boundedRecallCloseout.renderedBoundedRecallPreparationPacketTextSurface.previewAvailable,
      true
    );
    assert.equal(payload.boundedRecallCloseout.boundedRecallApprovalIssuanceRecordInputTrace, null);
    assert.equal(payload.boundedRecallCloseout.boundedRecallExecutionEvidenceInputTrace, null);
    assert.equal(payload.review.wideningReview.decision, 'WIDENING_REVIEW_NOT_READY');
    assert.equal(payload.review.wideningReview.renderedReviewTextSurface.previewAvailable, true);
    assert.equal(payload.review.wideningAdoption.decision, 'WIDENING_ADOPTION_NOT_READY');
    assert.equal(payload.review.wideningAdoption.renderedAdoptionTextSurface.previewAvailable, true);
    assert.equal(payload.review.boundedRecallPreparation.decision, 'BOUNDED_RECALL_APPROVAL_NOT_READY');
    assert.equal(payload.review.boundedRecallPreparation.renderedBoundedRecallTextSurface.previewAvailable, true);
    assert.equal(payload.review.boundedRecallPreparation.boundedRecallCommandPreviewBundle.bundleKind, 'bounded_recall_review_command_bundle_blocked');
    assert.equal(payload.review.boundedRecallCloseout.decision, 'BOUNDED_RECALL_CLOSEOUT_NOT_READY');
    assert.equal(payload.review.boundedRecallCloseout.renderedCloseoutTextSurface.previewAvailable, true);
    assert.equal(
      payload.review.boundedRecallCloseout.boundedRecallPreparationCommandPreviewBundle.bundleKind,
      'bounded_recall_preparation_command_bundle_blocked'
    );
    assert.equal(payload.review.autoAuthorization.currentBlockedOn, 'external_token_assertion_not_accepted');
    assert.equal(payload.review.autoAuthorization.checklistPassed, false);
    assert.equal(payload.review.autoAuthorization.exactCm0601LineReusable, false);
    assert.equal(payload.review.autoAuthorization.externalAssertionAccepted, false);
    assert.equal(payload.review.autoAuthorization.canAutoAuthorizeCm0595, false);
    assert.equal(payload.review.autoAuthorization.mutated, false);
    assert.equal(payload.review.autoAuthorization.readsRealMemory, false);
    assert.equal(payload.review.autoAuthorization.writesDurableState, false);
    assert.equal(payload.review.autoAuthorization.publicMcpExpanded, false);
    assert.equal(payload.paths.dbPath, dbPath);
    assert.equal(payload.totalRecords, 6);
    assert.deepEqual(payload.statusDistribution, {
      active: 3,
      proposal: 1,
      tombstoned: 1,
      superseded: 1
    });
    assert.equal(payload.scopeCoverage.scopeFilledRecords, 5);
    assert.equal(payload.scopeCoverage.scopeNullRecords, 1);
    assert.equal(payload.scopeCoverage.taskScopedRecords, 1);
    assert.equal(payload.scopeCoverage.project['codex-memory'], 3);
    assert.equal(payload.scopeCoverage.project['agent-image-lab'], 2);
    assert.equal(payload.scopeCoverage.project['(unset)'], 1);
    assert.equal(payload.scopeCoverage.client.codex, 4);
    assert.equal(payload.scopeCoverage.client.claude, 2);
    assert.equal(payload.confidence.high, 2);
    assert.equal(payload.confidence.medium, 2);
    assert.equal(payload.confidence.low, 1);
    assert.equal(payload.staleness.activeNotUpdated30d, 2);
    assert.equal(payload.staleness.activeNotUpdated90d, 1);
    assert.equal(payload.supersession.supersededRecords, 1);
    assert.equal(payload.supersession.supersessionInitiated, 1);
    assert.equal(payload.tombstoned, 1);
    assert.equal(payload.proposals, 1);
    assert.equal(payload.retention.permanent, 2);
    assert.equal(payload.retention['ttl:30d'], 1);
    assert.equal(payload.retention['ttl:7d'], 1);
    assert.equal(payload.retention.session, 1);
    assert.equal(payload.retention['long-lived'], 1);
    assert.equal(payload.review.status, 'warn');
    assert.equal(payload.review.reviewLevel, 'needs-review');
    assert.equal(payload.review.counts.totalRecords, 6);
    assert.equal(payload.review.counts.proposalCount, 1);
    assert.equal(payload.review.counts.tombstonedCount, 1);
    assert.equal(payload.review.counts.supersededCount, 1);
    assert.equal(payload.review.counts.supersessionInitiated, 1);
    assert.equal(payload.review.counts.stale30d, 2);
    assert.equal(payload.review.counts.stale90d, 1);
    assert.ok(payload.review.hints.some(hint => hint.includes('proposal')));
    assert.equal(JSON.stringify(payload).includes('workspace_id'), false);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('governance-report CLI should surface recent read-policy audit evidence when present', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-governance-report-'));
  const dbPath = path.join(tempBasePath, 'state', 'governance.sqlite');
  const recallLogPath = path.join(tempBasePath, 'logs', 'recall.jsonl');

  try {
    await seedGovernanceDb(dbPath);
    await fs.mkdir(path.dirname(recallLogPath), { recursive: true });
    await fs.writeFile(recallLogPath, `${JSON.stringify({
      timestamp: '2026-04-23T09:12:00.000Z',
      recall_type: 'read-policy',
      read_policy_applied: true,
      lifecycle_policy_applied: true,
      hidden_by_lifecycle_count: 2,
      stale_result_count: 1,
      lifecycle_column_available: true,
      scope_workspace_present: true
    })}\n`, 'utf8');

    const result = await runGovernanceReport({
      args: ['--json'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DB_PATH: dbPath,
        CODEX_MEMORY_RECALL_LOG: recallLogPath
      }
    });

    assert.equal(result.code, 0, result.stderr || 'non-zero exit');
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.readPolicy.status, 'ok');
    assert.equal(payload.readPolicy.source, 'config-and-recent-recall-audit');
    assert.equal(payload.readPolicy.evidenceState, 'config_and_recent_audit');
    assert.equal(payload.readPolicy.configEvidenceAvailable, true);
    assert.equal(payload.readPolicy.auditEvidenceAvailable, true);
    assert.equal(payload.readPolicy.auditedEntryCount, 1);
    assert.equal(payload.readPolicy.auditTailLimit, 20);
    assert.equal(payload.readPolicy.latestReadPolicyAuditAt, '2026-04-23T09:12:00.000Z');
    assert.equal(payload.readPolicy.nextEvidenceAction, 'none');
    assert.equal(payload.readPolicy.recentReadPolicyAuditCount, 1);
    assert.equal(payload.readPolicy.recentReadPolicyAppliedCount, 1);
    assert.equal(payload.readPolicy.recentLifecyclePolicyAppliedCount, 1);
    assert.equal(payload.readPolicy.recentHiddenByLifecycleCount, 2);
    assert.equal(payload.readPolicy.recentStaleResultCount, 1);
    assert.equal(payload.readPolicy.lifecycleColumnAvailable, true);
    assert.equal(payload.readPolicy.scopeWorkspacePresent, true);
    assert.equal(payload.review.readPolicy.status, 'ok');
    assert.equal(payload.review.readPolicy.auditEvidenceAvailable, true);
    assert.equal(payload.review.autoAuthorization.allowedGovernanceOutput, 'NO_AUTO_APPROVAL_ISSUED');
    assert.equal(payload.review.autoAuthorization.operatorActionPlan.currentStage, 'await_cm0611_assertion_record');
    assert.equal(payload.review.autoAuthorization.assertionRecordPreview.previewAvailable, true);
    assert.equal(payload.review.autoAuthorization.approvalLinePreview.previewAvailable, true);
    assert.equal(payload.review.autoAuthorization.currentBlockedOn, 'external_token_assertion_not_accepted');
    assert.equal(payload.review.autoAuthorization.issuanceRecordPreview.previewAvailable, true);
    assert.equal(payload.review.autoAuthorization.routingOutcomePreview.previewAvailable, true);
    assert.equal(payload.review.autoAuthorization.wideningReviewPreview.previewAvailable, true);
    assert.equal(payload.review.autoAuthorization.recordDrafts.cm0614Issuance.draftAvailable, true);
    assert.equal(payload.review.autoAuthorization.artifactBundleDraft.bundleKind, 'assertion_record_only');
    assert.equal(payload.review.autoAuthorization.commandPreviewBundle.bundleKind, 'assertion_record_command_bundle');
    assert.equal(payload.review.autoAuthorization.operatorPacketDraft.packetKind, 'assertion_record_operator_packet');
    assert.equal(JSON.stringify(payload).includes('workspace_id'), false);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('governance-report CLI should emit readable text output by default', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-governance-report-'));
  const dbPath = path.join(tempBasePath, 'data', 'codex-memory.sqlite');

  try {
    await seedGovernanceDb(dbPath);
    const result = await runGovernanceReport({
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: path.join(tempBasePath, 'data')
      }
    });

    assert.equal(result.code, 0, result.stderr || 'non-zero exit');
    assert.match(result.stdout, /Governance Report/);
    assert.match(result.stdout, /Status: ok/);
    assert.match(result.stdout, /Review:/);
    assert.match(result.stdout, /read-policy:/);
    assert.match(result.stdout, /auto-auth:/);
    assert.match(result.stdout, /auto-input:\s+none/);
    assert.match(result.stdout, /auto-packet:\s+assertion_record_operator_packet/);
    assert.match(result.stdout, /auto-bundle:\s+assertion_record_only/);
    assert.match(result.stdout, /auto-cmd:\s+assertion_record_command_bundle/);
    assert.match(result.stdout, /auto-packet:\s+assertion_record_operator_packet/);
    assert.match(result.stdout, /auto-draft:\s+cm0611AssertionRecord/);
    assert.match(result.stdout, /auto-pktxt:\s+assertion_record_operator_packet/);
    assert.match(result.stdout, /auto-brief:\s+assertion_record_only__assertion_record_operator_packet/);
    assert.match(result.stdout, /auto-next:\s+.*CM-0611_EXTERNAL_TOKEN_MATERIAL_ASSERTION_RECORD_TEMPLATE\.md/);
    assert.match(result.stdout, /auto-pack:\s+bundle=assertion_record_only, draft=cm0611AssertionRecord/);
    assert.match(result.stdout, /auto-cmdln:\s+node .\\src\\cli\\authorized-write-path-auto-authorization\.js --json --assertion-record <CM0611_assertion_record_path>/);
    assert.match(result.stdout, /level:\s+needs-review/);
    assert.match(result.stdout, /Staleness:/);
    assert.match(result.stdout, /proposals:\s+1/);
    assert.match(result.stdout, /tombstoned:\s+1/);
    assert.equal(result.stdout.includes('workspace_id'), false);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('governance-report CLI should render current operator packet text when requested', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-governance-report-'));
  const dbPath = path.join(tempBasePath, 'data', 'codex-memory.sqlite');

  try {
    await seedGovernanceDb(dbPath);
    const result = await runGovernanceReport({
      args: ['--rendered-operator-packet-text'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: path.join(tempBasePath, 'data')
      }
    });

    assert.equal(result.code, 0, result.stderr || 'non-zero exit');
    assert.match(result.stdout, /\[rendered-operator-packet-text\]/);
    assert.match(result.stdout, /^Status: RC_NOT_READY_BLOCKED/m);
    assert.match(result.stdout, /## Command Preview/);
    assert.match(result.stdout, /Current stage: await_cm0611_assertion_record/);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('governance-report CLI should render current operator artifact text when requested', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-governance-report-'));
  const dbPath = path.join(tempBasePath, 'data', 'codex-memory.sqlite');

  try {
    await seedGovernanceDb(dbPath);
    const result = await runGovernanceReport({
      args: ['--rendered-operator-artifact-text'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: path.join(tempBasePath, 'data')
      }
    });

    assert.equal(result.code, 0, result.stderr || 'non-zero exit');
    assert.match(result.stdout, /\[rendered-operator-artifact-text\]/);
    assert.match(result.stdout, /^Status: DRAFT_ASSERTION_NOT_RECORDED/m);
    assert.match(result.stdout, /## Assertion Summary/);
    assert.match(result.stdout, /## Command Preview/);
    assert.match(result.stdout, /assertionClass: <fill>/);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('governance-report CLI should render current operator brief text when requested', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-governance-report-'));
  const dbPath = path.join(tempBasePath, 'data', 'codex-memory.sqlite');

  try {
    await seedGovernanceDb(dbPath);
    const result = await runGovernanceReport({
      args: ['--rendered-operator-brief-text'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: path.join(tempBasePath, 'data')
      }
    });

    assert.equal(result.code, 0, result.stderr || 'non-zero exit');
    assert.match(result.stdout, /\[rendered-operator-brief-text\]/);
    assert.match(result.stdout, /^Status: RC_NOT_READY_BLOCKED/m);
    assert.match(result.stdout, /## Current Operator Packet/);
    assert.match(result.stdout, /## Selected Artifact Draft/);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('governance-report CLI should render bounded recall text when requested', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-governance-report-'));
  const dbPath = path.join(tempBasePath, 'data', 'codex-memory.sqlite');

  try {
    await seedGovernanceDb(dbPath);
    const result = await runGovernanceReport({
      args: ['--rendered-bounded-recall-text'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: path.join(tempBasePath, 'data')
      }
    });

    assert.equal(result.code, 0, result.stderr || 'non-zero exit');
    assert.match(result.stdout, /\[rendered-bounded-recall-text\]/);
    assert.match(result.stdout, /^Status: DRAFT_BOUNDED_RECALL_APPROVAL_NOT_READY/m);
    assert.match(result.stdout, /## Preparation snapshot/);
    assert.match(result.stdout, /## Bounded Recall Checklist/);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('governance-report CLI should render bounded recall closeout text when requested', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-governance-report-'));
  const dbPath = path.join(tempBasePath, 'data', 'codex-memory.sqlite');

  try {
    await seedGovernanceDb(dbPath);
    const result = await runGovernanceReport({
      args: ['--rendered-bounded-recall-closeout-text'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: path.join(tempBasePath, 'data')
      }
    });

    assert.equal(result.code, 0, result.stderr || 'non-zero exit');
    assert.match(result.stdout, /\[rendered-bounded-recall-closeout-text\]/);
    assert.match(result.stdout, /^Status: DRAFT_BOUNDED_RECALL_CLOSEOUT_NOT_READY/m);
    assert.match(result.stdout, /## Closeout snapshot/);
    assert.match(result.stdout, /## Closeout Checklist/);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('governance-report CLI should render widening review text when requested', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-governance-report-'));
  const dbPath = path.join(tempBasePath, 'data', 'codex-memory.sqlite');

  try {
    await seedGovernanceDb(dbPath);
    const result = await runGovernanceReport({
      args: ['--rendered-widening-review-text'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: path.join(tempBasePath, 'data')
      }
    });

    assert.equal(result.code, 0, result.stderr || 'non-zero exit');
    assert.match(result.stdout, /\[rendered-widening-review-text\]/);
    assert.match(result.stdout, /^Status: DRAFT_REVIEW_NOT_READY/m);
    assert.match(result.stdout, /## CM-0604 gate review/);
    assert.match(result.stdout, /## Review Checklist/);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('governance-report CLI should accept explicit assertion-record input for auto-authorization review', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-governance-report-'));
  const dbPath = path.join(tempBasePath, 'state', 'governance.sqlite');

  try {
    await seedGovernanceDb(dbPath);
    const result = await runGovernanceReport({
      args: ['--json', '--auto-auth-assertion-record', REPO_ASSERTION_RECORD_PATH],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DB_PATH: dbPath
      }
    });

    assert.equal(result.code, 0, result.stderr || 'non-zero exit');
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.review.autoAuthorization.allowedGovernanceOutput, 'AUTO_REUSE_CM0601_LINE_ONLY');
    assert.equal(payload.review.autoAuthorization.assertionRecordInputTrace.traceAvailable, true);
    assert.equal(payload.review.autoAuthorization.assertionRecordInputTrace.sourceFormat, 'json_assertion_record_v1');
    assert.equal(payload.review.autoAuthorization.assertionRecordInputTrace.sourceFileName, 'external-token-material-assertion-record-v1.json');
    assert.equal(payload.review.autoAuthorization.assertionRecordInputTrace.assertionAcceptedForC6, true);
    assert.equal(payload.review.autoAuthorization.operatorActionPlan.currentStage, 'cm0601_line_reuse_ready');
    assert.equal(payload.review.autoAuthorization.assertionRecordPreview.previewAvailable, true);
    assert.equal(payload.review.autoAuthorization.assertionRecordPreview.previewUsableNow, false);
    assert.equal(payload.review.autoAuthorization.approvalLinePreview.previewAvailable, true);
    assert.equal(payload.review.autoAuthorization.approvalLinePreview.previewUsableNow, true);
    assert.equal(payload.review.autoAuthorization.issuanceRecordPreview.previewUsableNow, true);
    assert.equal(payload.review.autoAuthorization.routingOutcomePreview.previewUsableNow, true);
    assert.equal(payload.review.autoAuthorization.wideningReviewPreview.previewUsableNow, false);
    assert.equal(payload.review.autoAuthorization.recordDrafts.cm0614Issuance.draftUsableNow, true);
    assert.equal(payload.review.autoAuthorization.renderedArtifactTextSurface.selectedDraftId, 'cm0614Issuance');
    assert.match(
      payload.review.autoAuthorization.renderedArtifactTextSurface.selectedDraftMarkdown,
      /source workspace-relative path: `\.\\tests\\fixtures\\external-token-material-assertion-record-v1\.json`/
    );
    assert.match(
      payload.review.autoAuthorization.renderedArtifactTextSurface.selectedDraftMarkdown,
      /governance-report command: `node \.\\src\\cli\\governance-report\.js --json --auto-auth-assertion-record \.\\tests\\fixtures\\external-token-material-assertion-record-v1\.json`/
    );
    assert.equal(payload.review.autoAuthorization.renderedOperatorPacketTextSurface.packetKind, 'cm0601_reuse_operator_packet');
    assert.equal(payload.review.autoAuthorization.renderedOperatorPacketTextSurface.selectedDraftId, 'cm0614Issuance');
    assert.equal(payload.review.autoAuthorization.artifactBundleDraft.bundleKind, 'cm0601_reuse_ready_bundle');
    assert.equal(
      payload.review.autoAuthorization.artifactBundleDraft.selectedArtifacts.assertionRecordInputTrace.sourceFileName,
      'external-token-material-assertion-record-v1.json'
    );
    assert.equal(payload.review.autoAuthorization.commandPreviewBundle.bundleKind, 'cm0601_reuse_review_command_bundle');
    assert.equal(payload.review.autoAuthorization.commandPreviewBundle.resolvedAssertionRecordPathMode, 'workspace_relative');
    assert.equal(
      payload.review.autoAuthorization.commandPreviewBundle.resolvedAssertionRecordPath,
      '.\\tests\\fixtures\\external-token-material-assertion-record-v1.json'
    );
    assert.match(
      payload.review.autoAuthorization.commandPreviewBundle.primaryCommand,
      /governance-report\.js --json --auto-auth-assertion-record \.\\tests\\fixtures\\external-token-material-assertion-record-v1\.json/
    );
    assert.match(
      payload.review.autoAuthorization.renderedOperatorPacketTextSurface.markdown,
      /governance-report command: `node \.\\src\\cli\\governance-report\.js --json --auto-auth-assertion-record \.\\tests\\fixtures\\external-token-material-assertion-record-v1\.json`/
    );
    assert.equal(payload.review.autoAuthorization.operatorPacketDraft.packetKind, 'cm0601_reuse_operator_packet');
    assert.equal(payload.review.autoAuthorization.renderedOperatorPacketTextSurface.packetKind, 'cm0601_reuse_operator_packet');
    assert.equal(
      payload.review.autoAuthorization.operatorPacketDraft.selectedPayload.assertionRecordInputTrace.sourceFormat,
      'json_assertion_record_v1'
    );
    assert.equal(payload.review.autoAuthorization.exactCm0601LineReusable, true);
    assert.equal(payload.review.autoAuthorization.externalAssertionAccepted, true);
    assert.equal(payload.review.autoAuthorization.canAutoAuthorizeCm0595, false);
    assert.equal(payload.review.autoAuthorization.source, 'cm0622_explicit_input_fixture_plus_assertion_record_v1');
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('governance-report CLI should accept a filled CM-0611 markdown record for auto-authorization review', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-governance-report-'));
  const dbPath = path.join(tempBasePath, 'state', 'governance.sqlite');

  try {
    await seedGovernanceDb(dbPath);
    const result = await runGovernanceReport({
      args: ['--json', '--auto-auth-assertion-record', REPO_ASSERTION_RECORD_MARKDOWN_PATH],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DB_PATH: dbPath
      }
    });

    assert.equal(result.code, 0, result.stderr || 'non-zero exit');
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.review.autoAuthorization.allowedGovernanceOutput, 'AUTO_REUSE_CM0601_LINE_ONLY');
    assert.equal(payload.review.autoAuthorization.assertionRecordInputTrace.traceAvailable, true);
    assert.equal(payload.review.autoAuthorization.assertionRecordInputTrace.sourceFormat, 'cm0611_markdown_record_v1');
    assert.equal(payload.review.autoAuthorization.assertionRecordInputTrace.sourceFileName, 'external-token-material-assertion-record-v1.md');
    assert.equal(payload.review.autoAuthorization.assertionRecordInputTrace.sourceArtifactRef, 'docs/CM-0611_EXTERNAL_TOKEN_MATERIAL_ASSERTION_RECORD_TEMPLATE.md');
    assert.equal(payload.review.autoAuthorization.assertionRecordInputTrace.assertionAcceptedForC6, true);
    assert.equal(payload.review.autoAuthorization.operatorActionPlan.currentStage, 'cm0601_line_reuse_ready');
    assert.equal(payload.review.autoAuthorization.externalAssertionAccepted, true);
    assert.equal(payload.review.autoAuthorization.renderedArtifactTextSurface.selectedDraftId, 'cm0614Issuance');
    assert.match(
      payload.review.autoAuthorization.renderedArtifactTextSurface.selectedDraftMarkdown,
      /source workspace-relative path: `\.\\tests\\fixtures\\external-token-material-assertion-record-v1\.md`/
    );
    assert.match(
      payload.review.autoAuthorization.renderedArtifactTextSurface.selectedDraftMarkdown,
      /governance-report command: `node \.\\src\\cli\\governance-report\.js --json --auto-auth-assertion-record \.\\tests\\fixtures\\external-token-material-assertion-record-v1\.md`/
    );
    assert.equal(payload.review.autoAuthorization.approvalLinePreview.previewUsableNow, true);
    assert.equal(payload.review.autoAuthorization.commandPreviewBundle.bundleKind, 'cm0601_reuse_review_command_bundle');
    assert.equal(payload.review.autoAuthorization.commandPreviewBundle.resolvedAssertionRecordPathMode, 'workspace_relative');
    assert.equal(
      payload.review.autoAuthorization.commandPreviewBundle.resolvedAssertionRecordPath,
      '.\\tests\\fixtures\\external-token-material-assertion-record-v1.md'
    );
    assert.match(
      payload.review.autoAuthorization.commandPreviewBundle.primaryCommand,
      /governance-report\.js --json --auto-auth-assertion-record \.\\tests\\fixtures\\external-token-material-assertion-record-v1\.md/
    );
    assert.match(
      payload.review.autoAuthorization.renderedOperatorPacketTextSurface.markdown,
      /governance-report command: `node \.\\src\\cli\\governance-report\.js --json --auto-auth-assertion-record \.\\tests\\fixtures\\external-token-material-assertion-record-v1\.md`/
    );
    assert.equal(payload.review.autoAuthorization.operatorPacketDraft.packetKind, 'cm0601_reuse_operator_packet');
    assert.equal(payload.review.autoAuthorization.renderedOperatorPacketTextSurface.packetKind, 'cm0601_reuse_operator_packet');
    assert.equal(
      payload.review.autoAuthorization.artifactBundleDraft.selectedArtifacts.assertionRecordInputTrace.sourceArtifactRef,
      'docs/CM-0611_EXTERNAL_TOKEN_MATERIAL_ASSERTION_RECORD_TEMPLATE.md'
    );
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('governance-report CLI should bridge escalated auto-authorization input into widening-review surfaces', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-governance-report-'));
  const dbPath = path.join(tempBasePath, 'state', 'governance.sqlite');

  try {
    await seedGovernanceDb(dbPath);
    const result = await runGovernanceReport({
      args: [
        '--json',
        '--auto-auth-assertion-record',
        REPO_ASSERTION_RECORD_PATH,
        '--auto-auth-latest-rebound-outcome-class',
        'token_present'
      ],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DB_PATH: dbPath
      }
    });

    assert.equal(result.code, 0, result.stderr || 'non-zero exit');
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.review.autoAuthorization.allowedGovernanceOutput, 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW');
    assert.equal(payload.review.autoAuthorization.operatorActionPlan.currentStage, 'cm0604_widening_review_ready');
    assert.equal(payload.wideningReview.source, 'cm0662_explicit_input_fixture_plus_auto_authorization_escalation_bridge_v1');
    assert.equal(payload.wideningReview.decision, 'WIDENING_REVIEW_PASSED_ADOPTION_NOT_GRANTED');
    assert.equal(payload.wideningReview.status, 'passed_adoption_not_granted');
    assert.equal(payload.wideningReview.cm0604Satisfied, true);
    assert.equal(payload.wideningReview.cm0606BridgeActivated, false);
    assert.equal(payload.wideningReview.proceedToCm0607AdoptionRecord, false);
    assert.equal(payload.wideningReview.routingOutcomeRecordInputTrace.traceAvailable, true);
    assert.equal(payload.wideningReview.routingOutcomeRecordInputTrace.sourceFormat, 'cm0662_auto_authorization_escalation_bridge_v1');
    assert.equal(payload.wideningReview.routingOutcomeRecordInputTrace.sourceFileName, 'external-token-material-assertion-record-v1.json');
    assert.equal(
      payload.wideningReview.routingOutcomeRecordInputTrace.sourceWorkspaceRelativePath,
      '.\\tests\\fixtures\\external-token-material-assertion-record-v1.json'
    );
    assert.equal(payload.wideningReview.reviewChecklist.W4.passed, true);
    assert.equal(payload.wideningReview.reviewChecklist.W6.passed, true);
    assert.equal(payload.wideningReview.reviewChecklist.W10.passed, false);
    assert.ok(payload.wideningReview.failClosedReasons.includes('bounded_durable_write_crossing_not_granted'));
    assert.equal(payload.wideningReview.canAutoAuthorizeCm0595, false);
    assert.equal(payload.wideningReview.canExecuteRuntimeNow, false);
    assert.equal(payload.review.wideningReview.decision, 'WIDENING_REVIEW_PASSED_ADOPTION_NOT_GRANTED');
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('governance-report CLI should accept explicit widening-review fixture input', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-governance-report-'));
  const dbPath = path.join(tempBasePath, 'state', 'governance.sqlite');
  const wideningFixturePath = path.join(tempBasePath, 'authorized-write-path-widening-review-pass.json');

  try {
    await seedGovernanceDb(dbPath);
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

    const result = await runGovernanceReport({
      args: ['--json', '--widening-review-fixture', wideningFixturePath],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DB_PATH: dbPath
      }
    });

    assert.equal(result.code, 0, result.stderr || 'non-zero exit');
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.wideningReview.decision, 'WIDENING_REVIEW_PASSED_PROCEED_TO_CM0607');
    assert.equal(payload.wideningReview.cm0604Satisfied, true);
    assert.equal(payload.wideningReview.cm0606BridgeActivated, true);
    assert.equal(payload.wideningReview.proceedToCm0607AdoptionRecord, true);
    assert.equal(payload.wideningReview.renderedReviewTextSurface.previewAvailable, true);
    assert.equal(payload.review.wideningReview.decision, 'WIDENING_REVIEW_PASSED_PROCEED_TO_CM0607');
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('governance-report CLI should accept explicit widening-review routing-outcome record input and keep fail-closed token evidence requirements', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-governance-report-route-'));
  const dbPath = path.join(tempBasePath, 'state', 'governance.sqlite');

  try {
    await seedGovernanceDb(dbPath);
    const result = await runGovernanceReport({
      args: ['--json', '--widening-review-routing-outcome-record', REPO_ROUTING_OUTCOME_RECORD_PATH],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DB_PATH: dbPath
      }
    });

    assert.equal(result.code, 0, result.stderr || 'non-zero exit');
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.wideningReview.source, 'cm0645_explicit_input_fixture_plus_routing_outcome_record_v1');
    assert.equal(payload.wideningReview.routingOutcomeRecordInputTrace.traceAvailable, true);
    assert.equal(payload.wideningReview.routingOutcomeRecordInputTrace.sourceFileName, 'cm0605-routing-outcome-record-v1.md');
    assert.equal(payload.wideningReview.reviewChecklist.W4.passed, true);
    assert.equal(payload.wideningReview.reviewChecklist.W6.passed, false);
    assert.ok(payload.wideningReview.failClosedReasons.includes('token_present_same_baseline_evidence_missing'));
    assert.equal(payload.review.wideningReview.decision, 'WIDENING_REVIEW_NOT_READY');
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('governance-report CLI should accept explicit widening-review outcome record input and keep adoption fail-closed', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-governance-report-adopt-'));
  const dbPath = path.join(tempBasePath, 'state', 'governance.sqlite');

  try {
    await seedGovernanceDb(dbPath);
    const result = await runGovernanceReport({
      args: ['--json', '--widening-adoption-review-record', REPO_WIDENING_ADOPTION_REVIEW_RECORD_PATH],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DB_PATH: dbPath
      }
    });

    assert.equal(result.code, 0, result.stderr || 'non-zero exit');
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.wideningAdoption.source, 'cm0646_explicit_input_fixture_plus_widening_review_record_v1');
    assert.equal(payload.wideningAdoption.wideningReviewRecordInputTrace.traceAvailable, true);
    assert.equal(payload.wideningAdoption.wideningReviewRecordInputTrace.sourceFileName, 'cm0616-widening-review-outcome-record-v1.md');
    assert.equal(payload.wideningAdoption.adoptionChecklist.A4.passed, true);
    assert.equal(payload.wideningAdoption.adoptionChecklist.A6.passed, false);
    assert.equal(payload.wideningAdoption.decision, 'WIDENING_ADOPTION_NOT_READY');
    assert.ok(payload.wideningAdoption.failClosedReasons.includes('token_present_same_baseline_evidence_missing'));
    assert.equal(payload.review.wideningAdoption.decision, 'WIDENING_ADOPTION_NOT_READY');
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('governance-report CLI should accept explicit widening-adoption record input and grant CM-0595 only in governance space', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-governance-report-adopt-grant-'));
  const dbPath = path.join(tempBasePath, 'state', 'governance.sqlite');

  try {
    await seedGovernanceDb(dbPath);
    const result = await runGovernanceReport({
      args: [
        '--json',
        '--widening-adoption-review-record',
        REPO_WIDENING_ADOPTION_REVIEW_RECORD_PATH,
        '--widening-adoption-record',
        REPO_WIDENING_ADOPTION_RECORD_PATH
      ],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DB_PATH: dbPath
      }
    });

    assert.equal(result.code, 0, result.stderr || 'non-zero exit');
    const payload = JSON.parse(result.stdout);
    assert.equal(
      payload.wideningAdoption.source,
      'cm0647_explicit_input_fixture_plus_widening_review_record_plus_widening_adoption_record_v1'
    );
    assert.equal(payload.wideningAdoption.wideningReviewRecordInputTrace.traceAvailable, true);
    assert.equal(payload.wideningAdoption.wideningAdoptionRecordInputTrace.traceAvailable, true);
    assert.equal(payload.wideningAdoption.adoptionChecklist.A4.passed, true);
    assert.equal(payload.wideningAdoption.adoptionChecklist.A6.passed, true);
    assert.equal(payload.wideningAdoption.adoptionChecklist.A10.passed, true);
    assert.equal(payload.wideningAdoption.decision, 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY');
    assert.equal(payload.review.wideningAdoption.decision, 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY');
    assert.equal(payload.wideningAdoption.cm0595ApprovalLinePreview.previewUsableNow, true);
    assert.match(payload.wideningAdoption.cm0595ApprovalLinePreview.exactApprovalLine, /授权执行 CM-0595/);
    assert.equal(payload.wideningAdoption.cm0595CommandPreviewBundle.resolvedRecordPathMode, 'workspace_relative_pair');
    assert.equal(payload.wideningAdoption.cm0595CommandPreviewBundle.resolvedWideningReviewRecordPath, '.\\tests\\fixtures\\cm0616-widening-review-outcome-record-v1.md');
    assert.equal(payload.wideningAdoption.cm0595CommandPreviewBundle.resolvedWideningAdoptionRecordPath, '.\\tests\\fixtures\\cm0607-widening-adoption-record-v1.md');
    assert.equal(payload.wideningAdoption.cm0595OperatorPacketDraft.packetKind, 'cm0595_auto_authorization_operator_packet');
    assert.equal(payload.wideningAdoption.cm0595IssuanceRecordDraft.draftUsableNow, true);
    assert.equal(payload.wideningAdoption.cm0595ExecutionEvidenceDraft.draftUsableNow, true);
    assert.match(payload.wideningAdoption.renderedCm0595OperatorPacketTextSurface.markdown, /resolved record path mode: `workspace_relative_pair`/);
    assert.match(payload.wideningAdoption.renderedCm0595OperatorPacketTextSurface.markdown, /## Next Record Drafts/);
    assert.equal(payload.review.wideningAdoption.cm0595ApprovalLinePreview.previewUsableNow, true);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('governance-report CLI should accept explicit CM-0649 issuance record input as later-stage provenance only', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-governance-report-cm0649-'));
  const dbPath = path.join(tempBasePath, 'state', 'governance.sqlite');

  try {
    await seedGovernanceDb(dbPath);
    const result = await runGovernanceReport({
      args: [
        '--json',
        '--widening-adoption-review-record',
        REPO_WIDENING_ADOPTION_REVIEW_RECORD_PATH,
        '--widening-adoption-record',
        REPO_WIDENING_ADOPTION_RECORD_PATH,
        '--cm0595-issuance-record',
        REPO_CM0595_ISSUANCE_RECORD_PATH
      ],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DB_PATH: dbPath
      }
    });

    assert.equal(result.code, 0, result.stderr || 'non-zero exit');
    const payload = JSON.parse(result.stdout);
    assert.equal(
      payload.wideningAdoption.source,
      'cm0652_explicit_input_fixture_plus_widening_review_record_plus_widening_adoption_record_plus_cm0595_issuance_record_v1'
    );
    assert.equal(payload.wideningAdoption.cm0595IssuanceRecordInputTrace.traceAvailable, true);
    assert.equal(payload.wideningAdoption.cm0595IssuanceRecordInputTrace.sourceFileName, 'cm0649-cm0595-approval-issuance-record-v1.md');
    assert.equal(payload.wideningAdoption.cm0595IssuanceRecordInputTrace.exactLineIssued, true);
    assert.equal(payload.review.wideningAdoption.cm0595IssuanceRecordInputTrace.traceAvailable, true);
    assert.match(payload.wideningAdoption.renderedCm0595OperatorPacketTextSurface.markdown, /issued CM-0595 record path: `\.\\tests\\fixtures\\cm0649-cm0595-approval-issuance-record-v1\.md`/);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('governance-report CLI should accept explicit CM-0650 execution evidence record input as later-stage provenance only', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-governance-report-cm0650-'));
  const dbPath = path.join(tempBasePath, 'state', 'governance.sqlite');

  try {
    await seedGovernanceDb(dbPath);
    const result = await runGovernanceReport({
      args: [
        '--json',
        '--widening-adoption-review-record',
        REPO_WIDENING_ADOPTION_REVIEW_RECORD_PATH,
        '--widening-adoption-record',
        REPO_WIDENING_ADOPTION_RECORD_PATH,
        '--cm0595-issuance-record',
        REPO_CM0595_ISSUANCE_RECORD_PATH,
        '--cm0595-execution-evidence-record',
        REPO_CM0595_EXECUTION_EVIDENCE_RECORD_PATH
      ],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DB_PATH: dbPath
      }
    });

    assert.equal(result.code, 0, result.stderr || 'non-zero exit');
    const payload = JSON.parse(result.stdout);
    assert.equal(
      payload.wideningAdoption.source,
      'cm0653_explicit_input_fixture_plus_widening_review_record_plus_widening_adoption_record_plus_cm0595_issuance_record_plus_cm0595_execution_evidence_record_v1'
    );
    assert.equal(payload.wideningAdoption.cm0595ExecutionEvidenceInputTrace.traceAvailable, true);
    assert.equal(payload.wideningAdoption.cm0595ExecutionEvidenceInputTrace.sourceFileName, 'cm0650-cm0595-execution-evidence-record-v1.md');
    assert.equal(payload.wideningAdoption.cm0595ExecutionEvidenceInputTrace.durableMemoryWriteCount, 1);
    assert.equal(payload.review.wideningAdoption.cm0595ExecutionEvidenceInputTrace.traceAvailable, true);
    assert.match(payload.wideningAdoption.renderedCm0595OperatorPacketTextSurface.markdown, /CM-0595 execution evidence path: `\.\\tests\\fixtures\\cm0650-cm0595-execution-evidence-record-v1\.md`/);
    assert.equal(payload.boundedRecallPreparation.decision, 'BOUNDED_RECALL_APPROVAL_PREPARED_EXACT_ONLY');
    assert.equal(payload.boundedRecallPreparation.boundedRecallApprovalPrepared, true);
    assert.equal(payload.boundedRecallPreparation.boundedRecallCommandPreviewBundle.bundleKind, 'bounded_recall_exact_approval_review_command_bundle');
    assert.equal(payload.boundedRecallPreparation.boundedRecallCommandPreviewBundle.resolvedRecordPathMode, 'workspace_relative_triple');
    assert.equal(payload.boundedRecallPreparation.boundedRecallApprovalIssuanceRecordDraft.draftUsableNow, true);
    assert.equal(payload.boundedRecallPreparation.boundedRecallExecutionEvidenceDraft.draftUsableNow, true);
    assert.equal(payload.boundedRecallPreparation.cm0595IssuanceRecordInputTrace.traceAvailable, true);
    assert.equal(payload.boundedRecallPreparation.cm0595ExecutionEvidenceInputTrace.traceAvailable, true);
    assert.match(payload.boundedRecallPreparation.renderedBoundedRecallTextSurface.markdown, /## Next Record Drafts/);
    assert.equal(payload.review.boundedRecallPreparation.decision, 'BOUNDED_RECALL_APPROVAL_PREPARED_EXACT_ONLY');
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('governance-report CLI should surface explicit CM-0658 and CM-0659 bounded recall closeout inputs through normal control surfaces', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-governance-report-cm0661-'));
  const dbPath = path.join(tempBasePath, 'state', 'governance.sqlite');

  try {
    await seedGovernanceDb(dbPath);
    const result = await runGovernanceReport({
      args: [
        '--json',
        '--bounded-recall-issuance-record',
        REPO_BOUNDED_RECALL_ISSUANCE_RECORD_PATH,
        '--bounded-recall-execution-evidence-record',
        REPO_BOUNDED_RECALL_EXECUTION_EVIDENCE_RECORD_PATH
      ],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DB_PATH: dbPath
      }
    });

    assert.equal(result.code, 0, result.stderr || 'non-zero exit');
    const payload = JSON.parse(result.stdout);
    assert.equal(
      payload.boundedRecallCloseout.source,
      'cm0661_explicit_input_fixture_plus_bounded_recall_issuance_record_plus_bounded_recall_execution_evidence_record_v1'
    );
    assert.equal(
      payload.boundedRecallCloseout.decision,
      'BOUNDED_RECALL_CLOSEOUT_RECORDED_PREPARED_LATER_APPROVAL_ONLY'
    );
    assert.equal(payload.boundedRecallCloseout.boundedRecallCloseoutReady, true);
    assert.equal(payload.boundedRecallCloseout.canPrepareFutureBoundedRecallRuntimeApprovalNext, true);
    assert.equal(payload.boundedRecallCloseout.canExecuteBoundedRecallNow, false);
    assert.equal(payload.boundedRecallCloseout.canExecuteRuntimeNow, false);
    assert.equal(
      payload.boundedRecallCloseout.boundedRecallPreparationCommandPreviewBundle.bundleKind,
      'bounded_recall_preparation_command_bundle'
    );
    assert.equal(
      payload.boundedRecallCloseout.boundedRecallPreparationCommandPreviewBundle.resolvedRecordPathMode,
      'workspace_relative_pair'
    );
    assert.equal(
      payload.boundedRecallCloseout.boundedRecallPreparationOperatorPacketDraft.draftUsableNow,
      true
    );
    assert.match(
      payload.boundedRecallCloseout.renderedBoundedRecallPreparationPacketTextSurface.markdown,
      /## Command Preview/
    );
    assert.equal(payload.boundedRecallCloseout.boundedRecallApprovalIssuanceRecordInputTrace.traceAvailable, true);
    assert.equal(payload.boundedRecallCloseout.boundedRecallApprovalIssuanceRecordInputTrace.sourceFileName, 'cm0658-bounded-recall-approval-issuance-record-v1.md');
    assert.equal(payload.boundedRecallCloseout.boundedRecallExecutionEvidenceInputTrace.traceAvailable, true);
    assert.equal(payload.boundedRecallCloseout.boundedRecallExecutionEvidenceInputTrace.sourceFileName, 'cm0659-bounded-recall-execution-evidence-record-v1.md');
    assert.match(payload.boundedRecallCloseout.renderedCloseoutTextSurface.markdown, /## Closeout snapshot/);
    assert.equal(
      payload.review.boundedRecallCloseout.decision,
      'BOUNDED_RECALL_CLOSEOUT_RECORDED_PREPARED_LATER_APPROVAL_ONLY'
    );
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('governance-report CLI should fail cleanly when the database is missing', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-governance-report-'));
  const dbPath = path.join(tempBasePath, 'missing', 'codex-memory.sqlite');

  try {
    const result = await runGovernanceReport({
      args: ['--json'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DB_PATH: dbPath
      }
    });

    assert.equal(result.code, 1, 'missing database should return non-zero exit');
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.mode, 'governance-report');
    assert.equal(payload.destructive, false);
    assert.equal(payload.summary.status, 'error');
    assert.match(payload.summary.message, /Database not found/);
    assert.equal(payload.paths.dbPath, dbPath);
    assert.equal(payload.readPolicy.rawWorkspaceIdExposed, false);
    assert.equal(payload.review.status, 'error');
    assert.equal(payload.review.reviewLevel, 'unavailable');
    assert.equal(payload.review.counts.totalRecords, 0);
    assert.equal(payload.review.readPolicy.status, 'config_only_no_recent_audit');
    assert.equal(payload.review.readPolicy.configEvidenceAvailable, true);
    assert.equal(payload.review.readPolicy.auditEvidenceAvailable, false);
    assert.equal(payload.review.readPolicy.evidenceState, 'config_only_missing_recent_audit');
    assert.equal(payload.review.readPolicy.nextEvidenceAction, 'collect_recent_read_policy_audit_evidence_before_readiness_claim');
    assert.equal(payload.review.readPolicy.rawWorkspaceIdExposed, false);
    assert.equal(payload.review.autoAuthorization.allowedGovernanceOutput, 'NO_AUTO_APPROVAL_ISSUED');
    assert.equal(payload.review.autoAuthorization.assertionRecordInputTrace, null);
    assert.equal(payload.review.autoAuthorization.operatorActionPlan.currentStage, 'await_cm0611_assertion_record');
    assert.equal(payload.review.autoAuthorization.assertionRecordPreview.previewAvailable, true);
    assert.equal(payload.review.autoAuthorization.approvalLinePreview.previewAvailable, true);
    assert.equal(payload.review.autoAuthorization.currentBlockedOn, 'external_token_assertion_not_accepted');
    assert.equal(payload.review.autoAuthorization.issuanceRecordPreview.previewAvailable, true);
    assert.equal(payload.review.autoAuthorization.routingOutcomePreview.previewAvailable, true);
    assert.equal(payload.review.autoAuthorization.wideningReviewPreview.previewAvailable, true);
    assert.equal(payload.review.autoAuthorization.recordDrafts.cm0614Issuance.draftAvailable, true);
    assert.equal(payload.review.autoAuthorization.artifactBundleDraft.bundleKind, 'assertion_record_only');
    assert.equal(payload.review.autoAuthorization.commandPreviewBundle.bundleKind, 'assertion_record_command_bundle');
    assert.equal(payload.review.autoAuthorization.operatorPacketDraft.packetKind, 'assertion_record_operator_packet');
    assert.equal(payload.review.autoAuthorization.renderedOperatorPacketTextSurface.packetKind, 'assertion_record_operator_packet');
    assert.equal(payload.review.wideningReview.decision, 'WIDENING_REVIEW_NOT_READY');
    assert.equal(payload.review.wideningReview.renderedReviewTextSurface.previewAvailable, true);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('governance-report CLI should keep explicit assertion-record auto-authorization output even when the database is missing', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-governance-report-'));
  const dbPath = path.join(tempBasePath, 'missing', 'codex-memory.sqlite');

  try {
    const result = await runGovernanceReport({
      args: ['--json', '--auto-auth-assertion-record', REPO_ASSERTION_RECORD_PATH],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DB_PATH: dbPath
      }
    });

    assert.equal(result.code, 1, 'missing database should return non-zero exit');
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.summary.status, 'error');
    assert.equal(payload.review.status, 'error');
    assert.equal(payload.review.autoAuthorization.allowedGovernanceOutput, 'AUTO_REUSE_CM0601_LINE_ONLY');
    assert.equal(payload.review.autoAuthorization.assertionRecordInputTrace.traceAvailable, true);
    assert.equal(payload.review.autoAuthorization.assertionRecordInputTrace.sourceFormat, 'json_assertion_record_v1');
    assert.equal(payload.review.autoAuthorization.assertionRecordInputTrace.sourceFileName, 'external-token-material-assertion-record-v1.json');
    assert.equal(payload.review.autoAuthorization.operatorActionPlan.currentStage, 'cm0601_line_reuse_ready');
    assert.equal(payload.review.autoAuthorization.assertionRecordPreview.previewAvailable, true);
    assert.equal(payload.review.autoAuthorization.assertionRecordPreview.previewUsableNow, false);
    assert.equal(payload.review.autoAuthorization.approvalLinePreview.previewAvailable, true);
    assert.equal(payload.review.autoAuthorization.approvalLinePreview.previewUsableNow, true);
    assert.equal(payload.review.autoAuthorization.issuanceRecordPreview.previewUsableNow, true);
    assert.equal(payload.review.autoAuthorization.routingOutcomePreview.previewUsableNow, true);
    assert.equal(payload.review.autoAuthorization.wideningReviewPreview.previewUsableNow, false);
    assert.equal(payload.review.autoAuthorization.recordDrafts.cm0614Issuance.draftUsableNow, true);
    assert.equal(payload.review.autoAuthorization.artifactBundleDraft.bundleKind, 'cm0601_reuse_ready_bundle');
    assert.equal(
      payload.review.autoAuthorization.artifactBundleDraft.selectedArtifacts.assertionRecordInputTrace.sourceFileName,
      'external-token-material-assertion-record-v1.json'
    );
    assert.equal(payload.review.autoAuthorization.commandPreviewBundle.bundleKind, 'cm0601_reuse_review_command_bundle');
    assert.equal(payload.review.autoAuthorization.operatorPacketDraft.packetKind, 'cm0601_reuse_operator_packet');
    assert.equal(payload.review.autoAuthorization.renderedOperatorPacketTextSurface.packetKind, 'cm0601_reuse_operator_packet');
    assert.equal(payload.review.autoAuthorization.exactCm0601LineReusable, true);
    assert.equal(payload.review.autoAuthorization.externalAssertionAccepted, true);
    assert.equal(payload.review.autoAuthorization.canAutoAuthorizeCm0595, false);
    assert.equal(payload.review.autoAuthorization.source, 'cm0622_explicit_input_fixture_plus_assertion_record_v1');
    assert.equal(payload.review.wideningReview.decision, 'WIDENING_REVIEW_NOT_READY');
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});
