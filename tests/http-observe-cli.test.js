const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');

const { createCodexMemoryApplication } = require('../src/app');
const { createStreamableHttpServer } = require('../src/adapters/codex-mcp/http');

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
const CURRENT_SOURCE_HTTP_TOKEN = 'cm1417-http-observe-current-source-token';

async function startHealthServer(healthPayload = {}) {
  const authorizationHeaders = [];
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      authorizationHeaders.push(req.headers.authorization || '');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        name: 'vcp_codex_memory',
        version: '0.1.0',
        protocol: 'streamable-http',
        path: '/mcp/codex-memory',
        ...healthPayload
      }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false }));
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  return {
    healthUrl: `http://127.0.0.1:${address.port}/health`,
    getAuthorizationHeaders() {
      return [...authorizationHeaders];
    },
    async close() {
      await new Promise(resolve => server.close(resolve));
    }
  };
}

async function withCurrentSourceHttpServer(handler) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-observe-current-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data'),
    httpPort: 0
  });

  await app.initialize();
  const httpServer = createStreamableHttpServer({
    app,
    host: '127.0.0.1',
    port: 0,
    mcpPath: '/mcp/codex-memory',
    bearerToken: CURRENT_SOURCE_HTTP_TOKEN
  });
  const address = await httpServer.listen();

  try {
    await handler({ app, address });
  } finally {
    await httpServer.close();
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
}

async function seedRuntimeArtifacts(basePath) {
  const logsDir = path.join(basePath, 'logs');
  await fs.mkdir(logsDir, { recursive: true });
  const dataDir = path.join(basePath, 'data');
  await fs.mkdir(dataDir, { recursive: true });

  await fs.writeFile(
    path.join(logsDir, 'codex-memory-http.log'),
    [
      '[2026-04-23T09:00:00.000Z] INFO vcp_codex_memory HTTP MCP listening on http://127.0.0.1:7605/mcp/codex-memory',
      '[2026-04-23T09:01:00.000Z] INFO heartbeat ok'
    ].join('\n'),
    'utf8'
  );

  await fs.writeFile(
    path.join(logsDir, 'codex-memory-http-watchdog.log'),
    [
      '[2026-04-23T09:02:00.000Z] INFO watchdog started (interval=120s, once=False)',
      '[2026-04-23T09:03:00.000Z] WARN service recovered: codex-memory HTTP MCP started (pid=1234) at http://127.0.0.1:7605/health'
    ].join('\n'),
    'utf8'
  );

  await fs.writeFile(
    path.join(logsDir, 'codex-memory-bridge.jsonl'),
    [
      JSON.stringify({
        timestamp: '2026-04-23T09:10:00.000Z',
        decision: 'accepted',
        target: 'process',
        title: 'checkpoint one',
        memoryId: 'memory-1'
      }),
      JSON.stringify({
        timestamp: '2026-04-23T09:11:00.000Z',
        decision: 'rejected',
        target: 'knowledge',
        title: 'checkpoint two',
        memoryId: 'memory-2'
      })
    ].join('\n'),
    'utf8'
  );

  await fs.writeFile(
    path.join(logsDir, 'codex-memory-recall.jsonl'),
    [
      JSON.stringify({
        timestamp: '2026-04-23T09:12:00.000Z',
        target: 'process',
        recallType: 'snippet',
        resultCount: 2,
        topMemoryId: 'memory-1',
        topSourceFile: 'Codex/checkpoint one.txt',
        scope_applied: true,
        scope_mode: 'sql-candidate+post-filter',
        scope_dimensions: ['project_id', 'visibility'],
        scope_strict: true,
        scope_project_id: 'codex-memory',
        scope_client_id: 'codex',
        scope_visibility: ['shared'],
        scope_workspace_present: true,
        read_policy_applied: true,
        lifecycle_policy_applied: true,
        lifecycle_included_statuses: ['active', 'stale'],
        lifecycle_excluded_statuses: ['proposal', 'rejected', 'superseded', 'tombstoned'],
        hidden_by_lifecycle_count: 3,
        stale_result_count: 1,
        lifecycle_column_available: true
      })
    ].join('\n'),
    'utf8'
  );

  const dbPath = path.join(dataDir, 'codex-memory.sqlite');
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE memory_records (
      id TEXT PRIMARY KEY,
      status TEXT,
      updated_at TEXT,
      project_id TEXT,
      visibility TEXT,
      client_id TEXT,
      task_id TEXT,
      confidence REAL,
      superseded_by TEXT,
      supersedes TEXT,
      retention_policy TEXT
    );
  `);
  const now = new Date();
  const stale45d = new Date(now.getTime() - 45 * 86400000).toISOString();
  const stale120d = new Date(now.getTime() - 120 * 86400000).toISOString();
  const fresh = new Date(now.getTime() - 2 * 86400000).toISOString();
  const insert = db.prepare(`
    INSERT INTO memory_records (
      id, status, updated_at, project_id, visibility, client_id, task_id,
      confidence, superseded_by, supersedes, retention_policy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insert.run('memory-active-stale-90', 'active', stale120d, 'codex-memory', 'shared', 'codex', 'task-1', 0.91, null, null, 'retain');
  insert.run('memory-active-stale-30', 'active', stale45d, 'codex-memory', 'shared', 'codex', '', 0.72, null, null, 'retain');
  insert.run('memory-proposal', 'proposal', fresh, 'codex-memory', 'shared', 'codex', 'task-2', 0.66, null, null, 'review');
  insert.run('memory-tombstone', 'tombstoned', fresh, 'codex-memory', 'private', 'codex', 'task-3', 0.4, null, null, 'retain');
  insert.run('memory-superseded', 'active', fresh, 'codex-memory', 'shared', 'codex', 'task-4', 0.88, 'memory-newer', null, 'retain');
  insert.run('memory-newer', 'active', fresh, 'codex-memory', 'shared', 'codex', 'task-5', 0.93, null, 'memory-superseded', 'retain');
  db.close();
}

function runCli({ args = [], env = {} }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['src/cli/http-observe.js', ...args], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...env
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', reject);
    child.on('close', code => {
      resolve({ code, stdout, stderr });
    });
  });
}

function assertKeySet(value, expected, label) {
  assert.deepEqual(Object.keys(value).sort(), expected, `${label} keys`);
}

function currentSourceReplayPayload(overrides = {}) {
  return {
    target: 'process',
    title: 'Checkpoint: CM-1046 current-source observe replay summary',
    content: [
      'Type: checkpoint',
      'CM1046 current-source observe replay summary marker',
      'Purpose: prove observe reads bounded explicit replay summary.',
      'Boundary: synthetic temp-local files only, no real memory, no provider, no public MCP expansion, no readiness claim.'
    ].join('\n'),
    evidence: 'cm1046 synthetic current-source replay summary evidence',
    validated: true,
    reusable: false,
    tags: ['cm1046', 'http-observe', 'write-reconcile', 'temp-local'],
    sensitivity: 'none',
    project_id: 'codex-memory',
    workspace_id: 'cm1046-http-observe-worker-replay-workspace',
    client_id: 'codex',
    task_id: 'CM-1046',
    conversation_id: 'cm1046-http-observe-current-source-worker-replay',
    visibility: 'project',
    retention_policy: 'keep',
    ...overrides
  };
}

test('http-observe CLI should summarize runtime health, logs, and audits in json mode', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-observe-'));
  const server = await startHealthServer({
    runtime: {
      writeReconcileWorker: {
        available: true,
        running: false,
        timerScheduled: false,
        tickInFlight: false,
        runCount: 3,
        intervalMs: 60000,
        limit: 2,
        dryRun: false,
        maxRuns: 5,
        lastResultSummary: {
          success: true,
          decision: 'completed',
          workerDecision: 'run_once_completed',
          dryRun: false,
          limit: 2,
          scannedTaskCount: 2,
          replayedCount: 2,
          wouldReplayCount: 0,
          clearedCount: 2,
          failedCount: 0,
          skippedCount: 0,
          hasError: false
        }
      }
    }
  });
  await seedRuntimeArtifacts(tempBasePath);

  try {
    const result = await runCli({
      args: ['--json'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_HTTP_LOG: path.join(tempBasePath, 'logs', 'codex-memory-http.log'),
        CODEX_MEMORY_AUDIT_LOG: path.join(tempBasePath, 'logs', 'codex-memory-bridge.jsonl'),
        CODEX_MEMORY_RECALL_LOG: path.join(tempBasePath, 'logs', 'codex-memory-recall.jsonl'),
        CODEX_MEMORY_HTTP_HOST: '127.0.0.1',
        CODEX_MEMORY_HTTP_PORT: String(new URL(server.healthUrl).port)
      }
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assertKeySet(payload, [
      'audits',
      'config',
      'generatedAt',
      'governance',
      'health',
      'logs',
      'readPolicy',
      'runtime',
      'summary'
    ], 'http-observe top-level');
    assertKeySet(payload.summary, [
      'bridgeRecentCount',
      'governanceAutoAuthorizationBlockedOn',
      'governanceAutoAuthorizationOutput',
      'governanceBoundedRecallCloseoutBlockedOn',
      'governanceBoundedRecallCloseoutDecision',
      'governanceBoundedRecallCloseoutReady',
      'governanceBoundedRecallPreparationBlockedOn',
      'governanceBoundedRecallPreparationDecision',
      'governanceBoundedRecallPrepared',
      'governanceCm0595AutoAuthorizationReady',
      'governanceCm0601LineReusable',
      'governanceProposalCount',
      'governanceReviewLevel',
      'governanceStale30d',
      'governanceStale90d',
      'governanceStatus',
      'governanceWideningAdoptionBlockedOn',
      'governanceWideningAdoptionDecision',
      'governanceWideningReviewBlockedOn',
      'governanceWideningReviewDecision',
      'governanceWideningReviewProceedToCm0607',
      'healthStatus',
      'hiddenByLifecycleCount',
      'hints',
      'httpLogErrorCount',
      'lifecycleColumnAvailable',
      'lifecyclePolicyAppliedCount',
      'lifecyclePolicyEnabled',
      'message',
      'rawWorkspaceIdExposed',
      'readPolicyStatus',
      'recallRecentCount',
      'scopedRecallCount',
      'softReadPolicyEnabled',
      'staleResultCount',
      'status',
      'strictScopedRecallCount',
      'watchdogEnsureFailureCount',
      'watchdogRecoveryCount',
      'writeReconcileWorkerAvailable',
      'writeReconcileWorkerHealthFieldAvailable',
      'writeReconcileWorkerRawMemoryIdExposed',
      'writeReconcileWorkerRunCount',
      'writeReconcileWorkerRunning',
      'writeReconcileWorkerTickInFlight',
      'writeReconcileWorkerTimerScheduled'
    ], 'http-observe summary');
    assertKeySet(payload.health, [
      'durationMs',
      'error',
      'httpStatus',
      'payload',
      'status',
      'url'
    ], 'http-observe health');
    assertKeySet(payload.config, [
      'httpHost',
      'httpMcpPath',
      'httpPort',
      'logsDir'
    ], 'http-observe config');
    assertKeySet(payload.logs, ['http', 'watchdog'], 'http-observe logs');
    assertKeySet(payload.runtime, ['writeReconcileWorker'], 'http-observe runtime');
    assertKeySet(payload.runtime.writeReconcileWorker, [
      'available',
      'dryRun',
      'healthFieldAvailable',
      'intervalMs',
      'lastResultSummary',
      'limit',
      'maxRuns',
      'rawMemoryIdExposed',
      'runCount',
      'running',
      'tickInFlight',
      'timerScheduled'
    ], 'http-observe write reconcile worker runtime');
    assertKeySet(payload.runtime.writeReconcileWorker.lastResultSummary, [
      'clearedCount',
      'decision',
      'dryRun',
      'failedCount',
      'hasError',
      'limit',
      'replayedCount',
      'scannedTaskCount',
      'skippedCount',
      'success',
      'workerDecision',
      'wouldReplayCount'
    ], 'http-observe write reconcile worker last result summary');
    assert.equal(payload.summary.writeReconcileWorkerHealthFieldAvailable, true);
    assert.equal(payload.summary.writeReconcileWorkerAvailable, true);
    assert.equal(payload.summary.writeReconcileWorkerRunning, false);
    assert.equal(payload.summary.writeReconcileWorkerTimerScheduled, false);
    assert.equal(payload.summary.writeReconcileWorkerTickInFlight, false);
    assert.equal(payload.summary.writeReconcileWorkerRunCount, 3);
    assert.equal(payload.summary.writeReconcileWorkerRawMemoryIdExposed, false);
    assert.equal(payload.runtime.writeReconcileWorker.lastResultSummary.replayedCount, 2);
    assert.equal(JSON.stringify(payload.runtime.writeReconcileWorker).includes('memoryId'), false);
    assertKeySet(payload.logs.http, [
      'errorCount',
      'exists',
      'infoCount',
      'lastLine',
      'lastModified',
      'lineCount',
      'listening',
      'path',
      'size',
      'tail'
    ], 'http-observe http log');
    assertKeySet(payload.logs.watchdog, [
      'duplicateCount',
      'ensureFailureCount',
      'exists',
      'lastLine',
      'lastModified',
      'lineCount',
      'path',
      'recoveryCount',
      'size',
      'tail'
    ], 'http-observe watchdog log');
    assert.equal(payload.summary.status, 'warn');
    assert.equal(payload.health.status, 'ok');
    assert.equal(payload.logs.http.listening, true);
    assert.equal(payload.logs.watchdog.recoveryCount, 1);
    assert.deepEqual(payload.audits.write.decisionBreakdown, {
      accepted: 1,
      rejected: 1
    });
    assertKeySet(payload.audits, ['recall', 'write'], 'http-observe audits');
    assertKeySet(payload.audits.write, [
      'decisionBreakdown',
      'exists',
      'lastAcceptedAt',
      'lastModified',
      'lastRejectedAt',
      'path',
      'recentCount',
      'recentEntries',
      'size'
    ], 'http-observe write audit');
    assertKeySet(payload.audits.write.recentEntries[0], [
      'decision',
      'memoryId',
      'target',
      'timestamp',
      'title'
    ], 'http-observe write audit entry');
    assert.deepEqual(payload.audits.recall.recallTypeBreakdown, {
      snippet: 1
    });
    assertKeySet(payload.audits.recall, [
      'clientBreakdown',
      'exists',
      'lastModified',
      'lastRecallAt',
      'latestScopedHitAt',
      'path',
      'projectBreakdown',
      'recallTypeBreakdown',
      'recentCount',
      'recentEntries',
      'scopeDimensionBreakdown',
      'scopeModeBreakdown',
      'scopedRecallCount',
      'size',
      'strictScopedRecallCount',
      'visibilityBreakdown'
    ], 'http-observe recall audit');
    assertKeySet(payload.audits.recall.recentEntries[0], [
      'recallType',
      'resultCount',
      'target',
      'timestamp',
      'topMemoryId',
      'topSourceFile'
    ], 'http-observe recall audit entry');
    assert.equal(payload.summary.scopedRecallCount, 1);
    assert.equal(payload.summary.strictScopedRecallCount, 1);
    assert.equal(payload.summary.lifecyclePolicyEnabled, false);
    assert.equal(payload.summary.softReadPolicyEnabled, false);
    assert.equal(payload.summary.readPolicyStatus, 'ok');
    assert.equal(payload.summary.lifecyclePolicyAppliedCount, 1);
    assert.equal(payload.summary.hiddenByLifecycleCount, 3);
    assert.equal(payload.summary.staleResultCount, 1);
    assert.equal(payload.summary.lifecycleColumnAvailable, true);
    assert.equal(payload.summary.rawWorkspaceIdExposed, false);
    assert.equal(payload.summary.governanceStatus, 'warn');
    assert.equal(payload.summary.governanceReviewLevel, 'needs-review');
    assert.equal(payload.summary.governanceProposalCount, 1);
    assert.equal(payload.summary.governanceAutoAuthorizationOutput, 'NO_AUTO_APPROVAL_ISSUED');
    assert.equal(payload.summary.governanceAutoAuthorizationBlockedOn, 'external_token_assertion_not_accepted');
    assert.equal(payload.summary.governanceCm0601LineReusable, false);
    assert.equal(payload.summary.governanceWideningReviewDecision, 'WIDENING_REVIEW_NOT_READY');
    assert.equal(payload.summary.governanceWideningAdoptionDecision, 'WIDENING_ADOPTION_NOT_READY');
    assert.equal(payload.summary.governanceWideningReviewBlockedOn, 'routing_outcome_not_escalated');
    assert.equal(payload.summary.governanceWideningReviewProceedToCm0607, false);
    assert.equal(payload.summary.governanceBoundedRecallCloseoutDecision, 'BOUNDED_RECALL_CLOSEOUT_NOT_READY');
    assert.equal(payload.summary.governanceBoundedRecallCloseoutBlockedOn, 'bounded_recall_issuance_record_not_proven');
    assert.equal(payload.summary.governanceBoundedRecallCloseoutReady, false);
    assert.equal(payload.summary.governanceStale30d, 2);
    assert.equal(payload.summary.governanceStale90d, 1);
    assert.equal(payload.audits.recall.scopedRecallCount, 1);
    assert.equal(payload.audits.recall.strictScopedRecallCount, 1);
    assert.deepEqual(payload.audits.recall.scopeModeBreakdown, {
      'sql-candidate+post-filter': 1
    });
    assert.deepEqual(payload.audits.recall.scopeDimensionBreakdown, {
      project_id: 1,
      visibility: 1
    });
    assertKeySet(payload.readPolicy, [
      'auditEvidenceAvailable',
      'auditTailLimit',
      'auditedEntryCount',
      'configEvidenceAvailable',
      'evidenceState',
      'latestReadPolicyAuditAt',
      'lifecycleColumnAvailable',
      'lifecycleExcludedStatuses',
      'lifecycleIncludedStatuses',
      'lifecyclePolicyEnabled',
      'migrationApplied',
      'mutated',
      'nextEvidenceAction',
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
    ], 'http-observe read policy');
    assert.deepEqual(payload.readPolicy.lifecycleIncludedStatuses, ['active', 'stale']);
    assert.deepEqual(payload.readPolicy.lifecycleExcludedStatuses, ['proposal', 'rejected', 'superseded', 'tombstoned']);
    assert.equal(payload.readPolicy.configEvidenceAvailable, true);
    assert.equal(payload.readPolicy.auditEvidenceAvailable, true);
    assert.equal(payload.readPolicy.evidenceState, 'config_and_recent_audit');
    assert.equal(payload.readPolicy.auditedEntryCount, 1);
    assert.equal(payload.readPolicy.auditTailLimit, 5);
    assert.equal(payload.readPolicy.latestReadPolicyAuditAt, '2026-04-23T09:12:00.000Z');
    assert.equal(payload.readPolicy.nextEvidenceAction, 'none');
    assert.equal(typeof payload.readPolicy.readPolicyConfigured, 'boolean');
    assert.equal(payload.readPolicy.recentHiddenByLifecycleCount, 3);
    assert.equal(payload.readPolicy.recentStaleResultCount, 1);
    assert.equal(payload.readPolicy.lifecycleColumnAvailable, true);
    assert.equal(payload.readPolicy.scopeWorkspacePresent, true);
    assert.equal(payload.readPolicy.rawWorkspaceIdExposed, false);
    assert.equal(payload.readPolicy.noProvider, true);
    assert.equal(payload.readPolicy.mutated, false);
    assert.equal(payload.readPolicy.migrationApplied, false);
    assert.equal(payload.governance.status, 'warn');
    assertKeySet(payload.governance, [
      'autoAuthorization',
      'boundedRecallCloseout',
      'boundedRecallPreparation',
      'counts',
      'hints',
      'message',
      'paths',
      'readPolicy',
      'retention',
      'reviewLevel',
      'sourceStatus',
      'status',
      'statusDistribution',
      'wideningAdoption',
      'wideningReview'
    ], 'http-observe governance');
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
    ].sort(), 'http-observe governance auto-authorization');
    assertKeySet(payload.governance.counts, [
      'proposalCount',
      'stale30d',
      'stale90d',
      'supersededCount',
      'supersessionInitiated',
      'tombstonedCount',
      'totalRecords'
    ], 'http-observe governance counts');
    assert.equal(payload.governance.reviewLevel, 'needs-review');
    assert.equal(payload.governance.readPolicy.rawWorkspaceIdExposed, false);
    assert.equal(payload.governance.counts.proposalCount, 1);
    assert.equal(payload.governance.counts.tombstonedCount, 1);
    assert.equal(payload.governance.counts.supersededCount, 1);
    assert.equal(payload.governance.counts.supersessionInitiated, 1);
    assert.equal(payload.governance.counts.stale30d, 2);
    assert.equal(payload.governance.counts.stale90d, 1);
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
    assert.ok(Array.isArray(payload.governance.hints));
    assert.ok(
      payload.summary.hints.some(
        hint => hint.includes('bundle=assertion_record_only')
          && hint.includes('cmd=assertion_record_command_bundle')
          && hint.includes('packet=assertion_record_operator_packet')
          && hint.includes('input=default_fixture_only')
          && hint.includes('CM-0611_EXTERNAL_TOKEN_MATERIAL_ASSERTION_RECORD_TEMPLATE.md')
      ),
      'summary hints should include current bundle and next artifact'
    );
    assert.equal(payload.audits.recall.rawWorkspaceId, undefined);
    assert.equal(JSON.stringify(payload).includes('workspace_id'), false);
  } finally {
    await server.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('http-observe CLI should not send bearer token to explicit health-url', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-observe-explicit-health-url-'));
  const server = await startHealthServer();
  await seedRuntimeArtifacts(tempBasePath);

  try {
    const result = await runCli({
      args: ['--json', '--health-url', server.healthUrl],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_HTTP_LOG: path.join(tempBasePath, 'logs', 'codex-memory-http.log'),
        CODEX_MEMORY_AUDIT_LOG: path.join(tempBasePath, 'logs', 'codex-memory-bridge.jsonl'),
        CODEX_MEMORY_RECALL_LOG: path.join(tempBasePath, 'logs', 'codex-memory-recall.jsonl'),
        CODEX_MEMORY_HTTP_HOST: '127.0.0.1',
        CODEX_MEMORY_HTTP_PORT: '7605',
        CODEX_MEMORY_HTTP_TOKEN: CURRENT_SOURCE_HTTP_TOKEN
      }
    });

    assert.equal(result.code, 0, result.stderr);
    assert.deepEqual(server.getAuthorizationHeaders(), ['']);
  } finally {
    await server.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('http-observe CLI should read worker status from a current-source HTTP server refresh', async () => {
  await withCurrentSourceHttpServer(async ({ app, address }) => {
    const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-observe-current-artifacts-'));
    await seedRuntimeArtifacts(tempBasePath);

    try {
      assert.equal(app.services.memoryWriteReconcileWorker.isRunning(), false);

      const result = await runCli({
        args: ['--json'],
        env: {
          CODEX_MEMORY_BASE_PATH: tempBasePath,
          CODEX_MEMORY_LOGS_DIR: 'logs',
          CODEX_MEMORY_HTTP_LOG: path.join(tempBasePath, 'logs', 'codex-memory-http.log'),
          CODEX_MEMORY_AUDIT_LOG: path.join(tempBasePath, 'logs', 'codex-memory-bridge.jsonl'),
          CODEX_MEMORY_RECALL_LOG: path.join(tempBasePath, 'logs', 'codex-memory-recall.jsonl'),
          CODEX_MEMORY_HTTP_HOST: '127.0.0.1',
          CODEX_MEMORY_HTTP_PORT: String(address.port),
          CODEX_MEMORY_HTTP_TOKEN: CURRENT_SOURCE_HTTP_TOKEN
        }
      });

      assert.equal(result.code, 0, result.stderr);
      const payload = JSON.parse(result.stdout);
      assert.equal(payload.health.status, 'ok');
      assert.equal(payload.health.payload.name, 'vcp_codex_memory');
      assert.equal(payload.summary.writeReconcileWorkerHealthFieldAvailable, true);
      assert.equal(payload.summary.writeReconcileWorkerAvailable, true);
      assert.equal(payload.summary.writeReconcileWorkerRunning, false);
      assert.equal(payload.summary.writeReconcileWorkerTimerScheduled, false);
      assert.equal(payload.summary.writeReconcileWorkerTickInFlight, false);
      assert.equal(payload.summary.writeReconcileWorkerRunCount, 0);
      assert.equal(payload.summary.writeReconcileWorkerRawMemoryIdExposed, false);
      assert.equal(payload.runtime.writeReconcileWorker.healthFieldAvailable, true);
      assert.equal(payload.runtime.writeReconcileWorker.available, true);
      assert.equal(payload.runtime.writeReconcileWorker.running, false);
      assert.equal(payload.runtime.writeReconcileWorker.timerScheduled, false);
      assert.equal(payload.runtime.writeReconcileWorker.tickInFlight, false);
      assert.equal(payload.runtime.writeReconcileWorker.runCount, 0);
      assert.equal(payload.runtime.writeReconcileWorker.lastResultSummary, null);
      assert.equal(JSON.stringify(payload.runtime.writeReconcileWorker).includes('memoryId'), false);
      assert.equal(app.services.memoryWriteReconcileWorker.isRunning(), false);
    } finally {
      await fs.rm(tempBasePath, { recursive: true, force: true });
    }
  });
});

test('http-observe CLI should consume HTTP allowlisted worker last-result summary', async () => {
  await withCurrentSourceHttpServer(async ({ app, address }) => {
    const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-observe-cm1068-'));
    await seedRuntimeArtifacts(tempBasePath);
    const originalGetStatus = app.services.memoryWriteReconcileWorker.getStatus;
    app.services.memoryWriteReconcileWorker.getStatus = () => ({
      running: false,
      timerScheduled: false,
      tickInFlight: false,
      runCount: 4,
      intervalMs: 250,
      limit: 2,
      dryRun: false,
      maxRuns: 6,
      lastResultSummary: {
        success: false,
        decision: 'completed_with_failures',
        workerDecision: 'run_once_completed',
        dryRun: false,
        limit: 2,
        scannedTaskCount: 2,
        replayedCount: 1,
        wouldReplayCount: 0,
        clearedCount: 1,
        failedCount: 1,
        skippedCount: 0,
        hasError: true,
        memoryId: 'codex-process-cm1068-observe-raw-memory-id',
        results: [{ memoryId: 'codex-process-cm1068-observe-nested-memory-id' }],
        error: 'cm1068 observe raw internal error'
      }
    });

    try {
      const result = await runCli({
        args: ['--json'],
        env: {
          CODEX_MEMORY_BASE_PATH: tempBasePath,
          CODEX_MEMORY_LOGS_DIR: 'logs',
          CODEX_MEMORY_HTTP_LOG: path.join(tempBasePath, 'logs', 'codex-memory-http.log'),
          CODEX_MEMORY_AUDIT_LOG: path.join(tempBasePath, 'logs', 'codex-memory-bridge.jsonl'),
          CODEX_MEMORY_RECALL_LOG: path.join(tempBasePath, 'logs', 'codex-memory-recall.jsonl'),
          CODEX_MEMORY_HTTP_HOST: '127.0.0.1',
          CODEX_MEMORY_HTTP_PORT: String(address.port),
          CODEX_MEMORY_HTTP_TOKEN: CURRENT_SOURCE_HTTP_TOKEN
        }
      });

      assert.equal(result.code, 0, result.stderr);
      const payload = JSON.parse(result.stdout);
      const summary = payload.runtime.writeReconcileWorker.lastResultSummary;

      assert.equal(payload.health.status, 'ok');
      assert.equal(payload.summary.writeReconcileWorkerRawMemoryIdExposed, false);
      assert.equal(payload.runtime.writeReconcileWorker.rawMemoryIdExposed, false);
      assertKeySet(summary, [
        'clearedCount',
        'decision',
        'dryRun',
        'failedCount',
        'hasError',
        'limit',
        'replayedCount',
        'scannedTaskCount',
        'skippedCount',
        'success',
        'workerDecision',
        'wouldReplayCount'
      ], 'http-observe CM1068 worker last result summary');
      assert.equal(summary.failedCount, 1);
      assert.equal(summary.hasError, true);
      assert.equal(JSON.stringify(payload.runtime.writeReconcileWorker).includes('memoryId'), false);
      assert.equal(JSON.stringify(payload.runtime.writeReconcileWorker).includes('raw internal error'), false);
    } finally {
      app.services.memoryWriteReconcileWorker.getStatus = originalGetStatus;
      await fs.rm(tempBasePath, { recursive: true, force: true });
    }
  });
});

test('http-observe CLI should read bounded worker last-result summary after explicit current-source dry-run', async () => {
  await withCurrentSourceHttpServer(async ({ app, address }) => {
    const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-observe-current-dry-run-'));
    await seedRuntimeArtifacts(tempBasePath);

    try {
      assert.equal(app.services.memoryWriteReconcileWorker.isRunning(), false);
      const dryRunResult = await app.services.memoryWriteReconcileWorker.runOnce({
        dryRun: true,
        limit: 4
      });
      assert.equal(dryRunResult.decision, 'dry_run_completed');
      assert.equal(dryRunResult.workerDecision, 'run_once_completed');
      assert.equal(dryRunResult.dryRun, true);
      assert.equal(dryRunResult.limit, 4);
      assert.equal(dryRunResult.scannedTaskCount, 0);
      assert.equal(app.services.memoryWriteReconcileWorker.isRunning(), false);

      const result = await runCli({
        args: ['--json'],
        env: {
          CODEX_MEMORY_BASE_PATH: tempBasePath,
          CODEX_MEMORY_LOGS_DIR: 'logs',
          CODEX_MEMORY_HTTP_LOG: path.join(tempBasePath, 'logs', 'codex-memory-http.log'),
          CODEX_MEMORY_AUDIT_LOG: path.join(tempBasePath, 'logs', 'codex-memory-bridge.jsonl'),
          CODEX_MEMORY_RECALL_LOG: path.join(tempBasePath, 'logs', 'codex-memory-recall.jsonl'),
          CODEX_MEMORY_HTTP_HOST: '127.0.0.1',
          CODEX_MEMORY_HTTP_PORT: String(address.port),
          CODEX_MEMORY_HTTP_TOKEN: CURRENT_SOURCE_HTTP_TOKEN
        }
      });

      assert.equal(result.code, 0, result.stderr);
      const payload = JSON.parse(result.stdout);
      assert.equal(payload.health.status, 'ok');
      assert.equal(payload.summary.writeReconcileWorkerHealthFieldAvailable, true);
      assert.equal(payload.summary.writeReconcileWorkerAvailable, true);
      assert.equal(payload.summary.writeReconcileWorkerRunning, false);
      assert.equal(payload.summary.writeReconcileWorkerTimerScheduled, false);
      assert.equal(payload.summary.writeReconcileWorkerTickInFlight, false);
      assert.equal(payload.summary.writeReconcileWorkerRunCount, 0);
      assert.equal(payload.summary.writeReconcileWorkerRawMemoryIdExposed, false);

      const summary = payload.runtime.writeReconcileWorker.lastResultSummary;
      assertKeySet(summary, [
        'clearedCount',
        'decision',
        'dryRun',
        'failedCount',
        'hasError',
        'limit',
        'replayedCount',
        'scannedTaskCount',
        'skippedCount',
        'success',
        'workerDecision',
        'wouldReplayCount'
      ], 'http-observe worker dry-run last result summary');
      assert.equal(summary.success, true);
      assert.equal(summary.decision, 'dry_run_completed');
      assert.equal(summary.workerDecision, 'run_once_completed');
      assert.equal(summary.dryRun, true);
      assert.equal(summary.limit, 4);
      assert.equal(summary.scannedTaskCount, 0);
      assert.equal(summary.replayedCount, 0);
      assert.equal(summary.wouldReplayCount, 0);
      assert.equal(summary.clearedCount, 0);
      assert.equal(summary.failedCount, 0);
      assert.equal(summary.skippedCount, 0);
      assert.equal(summary.hasError, false);
      assert.equal(JSON.stringify(payload.runtime.writeReconcileWorker).includes('memoryId'), false);
      assert.equal(app.services.memoryWriteReconcileWorker.isRunning(), false);
    } finally {
      await fs.rm(tempBasePath, { recursive: true, force: true });
    }
  });
});

test('http-observe CLI should read bounded worker replay summary after explicit current-source replay', async () => {
  await withCurrentSourceHttpServer(async ({ app, address }) => {
    const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-observe-current-replay-'));
    await seedRuntimeArtifacts(tempBasePath);

    try {
      assert.equal(app.services.memoryWriteReconcileWorker.isRunning(), false);
      const writeResult = await app.services.writeService.record(
        currentSourceReplayPayload(),
        {
          executionContext: {
            agentAlias: 'Codex',
            requestSource: 'cm1046-http-observe-current-source-replay-test'
          }
        }
      );
      assert.equal(writeResult.decision, 'accepted');
      assert.equal(writeResult.shadowWrite.status, 'ok');

      const replayRecord = await app.stores.shadowStore.getRecord(writeResult.memoryId);
      assert.ok(replayRecord);
      await app.stores.shadowStore.enqueueReconcileTask({
        memoryId: writeResult.memoryId,
        storeKind: 'vector',
        reason: 'cm1046_synthetic_current_source_replay_summary',
        payload: replayRecord
      });
      await app.stores.shadowStore.enqueueReconcileTask({
        memoryId: writeResult.memoryId,
        storeKind: 'chunks',
        reason: 'cm1046_synthetic_current_source_replay_summary',
        payload: replayRecord
      });
      assert.equal((await app.stores.shadowStore.getHealth()).reconcileCount, 2);

      const replayResult = await app.services.memoryWriteReconcileWorker.runOnce({
        dryRun: false,
        limit: 2
      });
      assert.equal(replayResult.decision, 'completed');
      assert.equal(replayResult.workerDecision, 'run_once_completed');
      assert.equal(replayResult.dryRun, false);
      assert.equal(replayResult.limit, 2);
      assert.equal(replayResult.scannedTaskCount, 2);
      assert.equal(replayResult.replayedCount, 2);
      assert.equal(replayResult.clearedCount, 2);
      assert.equal(replayResult.failedCount, 0);
      assert.equal((await app.stores.shadowStore.getHealth()).reconcileCount, 0);
      assert.equal(app.services.memoryWriteReconcileWorker.isRunning(), false);

      const result = await runCli({
        args: ['--json'],
        env: {
          CODEX_MEMORY_BASE_PATH: tempBasePath,
          CODEX_MEMORY_LOGS_DIR: 'logs',
          CODEX_MEMORY_HTTP_LOG: path.join(tempBasePath, 'logs', 'codex-memory-http.log'),
          CODEX_MEMORY_AUDIT_LOG: path.join(tempBasePath, 'logs', 'codex-memory-bridge.jsonl'),
          CODEX_MEMORY_RECALL_LOG: path.join(tempBasePath, 'logs', 'codex-memory-recall.jsonl'),
          CODEX_MEMORY_HTTP_HOST: '127.0.0.1',
          CODEX_MEMORY_HTTP_PORT: String(address.port),
          CODEX_MEMORY_HTTP_TOKEN: CURRENT_SOURCE_HTTP_TOKEN
        }
      });

      assert.equal(result.code, 0, result.stderr);
      const payload = JSON.parse(result.stdout);
      assert.equal(payload.health.status, 'ok');
      assert.equal(payload.summary.writeReconcileWorkerHealthFieldAvailable, true);
      assert.equal(payload.summary.writeReconcileWorkerAvailable, true);
      assert.equal(payload.summary.writeReconcileWorkerRunning, false);
      assert.equal(payload.summary.writeReconcileWorkerTimerScheduled, false);
      assert.equal(payload.summary.writeReconcileWorkerTickInFlight, false);
      assert.equal(payload.summary.writeReconcileWorkerRunCount, 0);
      assert.equal(payload.summary.writeReconcileWorkerRawMemoryIdExposed, false);

      const summary = payload.runtime.writeReconcileWorker.lastResultSummary;
      assertKeySet(summary, [
        'clearedCount',
        'decision',
        'dryRun',
        'failedCount',
        'hasError',
        'limit',
        'replayedCount',
        'scannedTaskCount',
        'skippedCount',
        'success',
        'workerDecision',
        'wouldReplayCount'
      ], 'http-observe worker replay last result summary');
      assert.equal(summary.success, true);
      assert.equal(summary.decision, 'completed');
      assert.equal(summary.workerDecision, 'run_once_completed');
      assert.equal(summary.dryRun, false);
      assert.equal(summary.limit, 2);
      assert.equal(summary.scannedTaskCount, 2);
      assert.equal(summary.replayedCount, 2);
      assert.equal(summary.wouldReplayCount, 0);
      assert.equal(summary.clearedCount, 2);
      assert.equal(summary.failedCount, 0);
      assert.equal(summary.skippedCount, 0);
      assert.equal(summary.hasError, false);
      assert.equal(JSON.stringify(payload.runtime.writeReconcileWorker).includes('memoryId'), false);
      assert.equal(app.services.memoryWriteReconcileWorker.isRunning(), false);
    } finally {
      await fs.rm(tempBasePath, { recursive: true, force: true });
    }
  });
});

test('http-observe CLI should emit text output with auto-authorization bundle summary by default', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-observe-text-'));
  const server = await startHealthServer();
  await seedRuntimeArtifacts(tempBasePath);

  try {
    const result = await runCli({
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_HTTP_LOG: path.join(tempBasePath, 'logs', 'codex-memory-http.log'),
        CODEX_MEMORY_AUDIT_LOG: path.join(tempBasePath, 'logs', 'codex-memory-bridge.jsonl'),
        CODEX_MEMORY_RECALL_LOG: path.join(tempBasePath, 'logs', 'codex-memory-recall.jsonl'),
        CODEX_MEMORY_HTTP_HOST: '127.0.0.1',
        CODEX_MEMORY_HTTP_PORT: String(new URL(server.healthUrl).port)
      }
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /\[governance\]/);
    assert.match(result.stdout, /autoAuthorizationBundle: assertion_record_only/);
    assert.match(result.stdout, /autoAuthorizationCommand: assertion_record_command_bundle/);
    assert.match(result.stdout, /autoAuthorizationPacket: assertion_record_operator_packet/);
    assert.match(result.stdout, /autoAuthorizationDraft: cm0611AssertionRecord/);
    assert.match(result.stdout, /autoAuthorizationPacketText: assertion_record_operator_packet/);
    assert.match(result.stdout, /autoAuthorizationBrief: assertion_record_only__assertion_record_operator_packet/);
    assert.match(result.stdout, /autoAuthorizationInput: input=default_fixture_only/);
    assert.match(result.stdout, /autoAuthorizationNextStep: .*CM-0611_EXTERNAL_TOKEN_MATERIAL_ASSERTION_RECORD_TEMPLATE\.md/);
    assert.match(result.stdout, /wideningReview: WIDENING_REVIEW_NOT_READY/);
    assert.match(result.stdout, /wideningReviewBlockedOn: routing_outcome_not_escalated/);
    assert.match(result.stdout, /wideningReviewText: widening_review_not_ready/);
    assert.match(result.stdout, /boundedRecallCloseout: BOUNDED_RECALL_CLOSEOUT_NOT_READY/);
    assert.match(result.stdout, /boundedRecallCloseoutBlockedOn: bounded_recall_issuance_record_not_proven/);
    assert.match(result.stdout, /boundedRecallCloseoutText: bounded_recall_closeout_not_ready/);
    assert.equal(result.stdout.includes('workspace_id'), false);
  } finally {
    await server.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('http-observe CLI should render current operator packet text when requested', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-observe-text-'));
  const server = await startHealthServer();
  await seedRuntimeArtifacts(tempBasePath);

  try {
    const result = await runCli({
      args: ['--rendered-operator-packet-text'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_HTTP_LOG: path.join(tempBasePath, 'logs', 'codex-memory-http.log'),
        CODEX_MEMORY_AUDIT_LOG: path.join(tempBasePath, 'logs', 'codex-memory-bridge.jsonl'),
        CODEX_MEMORY_RECALL_LOG: path.join(tempBasePath, 'logs', 'codex-memory-recall.jsonl'),
        CODEX_MEMORY_HTTP_HOST: '127.0.0.1',
        CODEX_MEMORY_HTTP_PORT: String(new URL(server.healthUrl).port)
      }
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /\[rendered-operator-packet-text\]/);
    assert.match(result.stdout, /^Status: RC_NOT_READY_BLOCKED/m);
    assert.match(result.stdout, /## Command Preview/);
    assert.match(result.stdout, /Current stage: await_cm0611_assertion_record/);
  } finally {
    await server.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('http-observe CLI should render current operator artifact text when requested', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-observe-text-'));
  const server = await startHealthServer();
  await seedRuntimeArtifacts(tempBasePath);

  try {
    const result = await runCli({
      args: ['--rendered-operator-artifact-text'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_HTTP_LOG: path.join(tempBasePath, 'logs', 'codex-memory-http.log'),
        CODEX_MEMORY_AUDIT_LOG: path.join(tempBasePath, 'logs', 'codex-memory-bridge.jsonl'),
        CODEX_MEMORY_RECALL_LOG: path.join(tempBasePath, 'logs', 'codex-memory-recall.jsonl'),
        CODEX_MEMORY_HTTP_HOST: '127.0.0.1',
        CODEX_MEMORY_HTTP_PORT: String(new URL(server.healthUrl).port)
      }
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /\[rendered-operator-artifact-text\]/);
    assert.match(result.stdout, /^Status: DRAFT_ASSERTION_NOT_RECORDED/m);
    assert.match(result.stdout, /## Assertion Summary/);
    assert.match(result.stdout, /## Command Preview/);
    assert.match(result.stdout, /assertionClass: <fill>/);
  } finally {
    await server.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('http-observe CLI should render current operator brief text when requested', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-observe-text-'));
  const server = await startHealthServer();
  await seedRuntimeArtifacts(tempBasePath);

  try {
    const result = await runCli({
      args: ['--rendered-operator-brief-text'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_HTTP_LOG: path.join(tempBasePath, 'logs', 'codex-memory-http.log'),
        CODEX_MEMORY_AUDIT_LOG: path.join(tempBasePath, 'logs', 'codex-memory-bridge.jsonl'),
        CODEX_MEMORY_RECALL_LOG: path.join(tempBasePath, 'logs', 'codex-memory-recall.jsonl'),
        CODEX_MEMORY_HTTP_HOST: '127.0.0.1',
        CODEX_MEMORY_HTTP_PORT: String(new URL(server.healthUrl).port)
      }
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /\[rendered-operator-brief-text\]/);
    assert.match(result.stdout, /^Status: RC_NOT_READY_BLOCKED/m);
    assert.match(result.stdout, /## Current Operator Packet/);
    assert.match(result.stdout, /## Selected Artifact Draft/);
  } finally {
    await server.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('http-observe CLI should render widening review text when requested', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-observe-text-'));
  const server = await startHealthServer();
  await seedRuntimeArtifacts(tempBasePath);

  try {
    const result = await runCli({
      args: ['--rendered-widening-review-text'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_HTTP_LOG: path.join(tempBasePath, 'logs', 'codex-memory-http.log'),
        CODEX_MEMORY_AUDIT_LOG: path.join(tempBasePath, 'logs', 'codex-memory-bridge.jsonl'),
        CODEX_MEMORY_RECALL_LOG: path.join(tempBasePath, 'logs', 'codex-memory-recall.jsonl'),
        CODEX_MEMORY_HTTP_HOST: '127.0.0.1',
        CODEX_MEMORY_HTTP_PORT: String(new URL(server.healthUrl).port)
      }
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /\[rendered-widening-review-text\]/);
    assert.match(result.stdout, /^Status: DRAFT_REVIEW_NOT_READY/m);
    assert.match(result.stdout, /## CM-0604 gate review/);
    assert.match(result.stdout, /## Review Checklist/);
  } finally {
    await server.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('http-observe CLI should render bounded recall text when requested', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-observe-text-'));
  const server = await startHealthServer();
  await seedRuntimeArtifacts(tempBasePath);

  try {
    const result = await runCli({
      args: ['--rendered-bounded-recall-text'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_HTTP_LOG: path.join(tempBasePath, 'logs', 'codex-memory-http.log'),
        CODEX_MEMORY_AUDIT_LOG: path.join(tempBasePath, 'logs', 'codex-memory-bridge.jsonl'),
        CODEX_MEMORY_RECALL_LOG: path.join(tempBasePath, 'logs', 'codex-memory-recall.jsonl'),
        CODEX_MEMORY_HTTP_HOST: '127.0.0.1',
        CODEX_MEMORY_HTTP_PORT: String(new URL(server.healthUrl).port)
      }
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /\[rendered-bounded-recall-text\]/);
    assert.match(result.stdout, /^Status: DRAFT_BOUNDED_RECALL_APPROVAL_NOT_READY/m);
    assert.match(result.stdout, /## Preparation snapshot/);
    assert.match(result.stdout, /## Bounded Recall Checklist/);
  } finally {
    await server.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('http-observe CLI should render bounded recall closeout text when requested', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-observe-text-'));
  const server = await startHealthServer();
  await seedRuntimeArtifacts(tempBasePath);

  try {
    const result = await runCli({
      args: ['--rendered-bounded-recall-closeout-text'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_HTTP_LOG: path.join(tempBasePath, 'logs', 'codex-memory-http.log'),
        CODEX_MEMORY_AUDIT_LOG: path.join(tempBasePath, 'logs', 'codex-memory-bridge.jsonl'),
        CODEX_MEMORY_RECALL_LOG: path.join(tempBasePath, 'logs', 'codex-memory-recall.jsonl'),
        CODEX_MEMORY_HTTP_HOST: '127.0.0.1',
        CODEX_MEMORY_HTTP_PORT: String(new URL(server.healthUrl).port)
      }
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /\[rendered-bounded-recall-closeout-text\]/);
    assert.match(result.stdout, /^Status: DRAFT_BOUNDED_RECALL_CLOSEOUT_NOT_READY/m);
    assert.match(result.stdout, /## Closeout snapshot/);
    assert.match(result.stdout, /## Closeout Checklist/);
  } finally {
    await server.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('http-observe CLI should fail when health is unavailable', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-observe-error-'));
  await seedRuntimeArtifacts(tempBasePath);

  try {
    const result = await runCli({
      args: ['--json', '--health-url', 'http://127.0.0.1:1/health'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_HTTP_LOG: path.join(tempBasePath, 'logs', 'codex-memory-http.log'),
        CODEX_MEMORY_AUDIT_LOG: path.join(tempBasePath, 'logs', 'codex-memory-bridge.jsonl'),
        CODEX_MEMORY_RECALL_LOG: path.join(tempBasePath, 'logs', 'codex-memory-recall.jsonl')
      }
    });

    assert.equal(result.code, 1);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.summary.status, 'error');
    assert.equal(payload.health.status, 'error');
    assert.match(payload.summary.hints[0], /start:http:ensure/);
    assert.equal(payload.readPolicy.rawWorkspaceIdExposed, false);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('http-observe CLI should pass explicit assertion-record input through governance summary', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-observe-'));
  const server = await startHealthServer();
  await seedRuntimeArtifacts(tempBasePath);

  try {
    const result = await runCli({
      args: [
        '--json',
        '--auto-auth-assertion-record',
        REPO_ASSERTION_RECORD_PATH,
        '--auto-auth-latest-rebound-outcome-class',
        'token_present'
      ],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_HTTP_LOG: path.join(tempBasePath, 'logs', 'codex-memory-http.log'),
        CODEX_MEMORY_AUDIT_LOG: path.join(tempBasePath, 'logs', 'codex-memory-bridge.jsonl'),
        CODEX_MEMORY_RECALL_LOG: path.join(tempBasePath, 'logs', 'codex-memory-recall.jsonl'),
        CODEX_MEMORY_HTTP_HOST: '127.0.0.1',
        CODEX_MEMORY_HTTP_PORT: String(new URL(server.healthUrl).port)
      }
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.summary.governanceAutoAuthorizationOutput, 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW');
    assert.equal(payload.summary.governanceAutoAuthorizationBlockedOn, null);
    assert.equal(payload.summary.governanceCm0601LineReusable, false);
    assert.equal(payload.summary.governanceWideningReviewDecision, 'WIDENING_REVIEW_PASSED_ADOPTION_NOT_GRANTED');
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
      /http-observe command: `node \.\\src\\cli\\http-observe\.js --json --auto-auth-assertion-record \.\\tests\\fixtures\\external-token-material-assertion-record-v1\.json --auto-auth-latest-rebound-outcome-class token_present`/
    );
    assert.equal(payload.governance.autoAuthorization.renderedOperatorPacketTextSurface.packetKind, 'widening_review_operator_packet');
    assert.equal(payload.governance.autoAuthorization.renderedOperatorPacketTextSurface.selectedDraftId, 'cm0616WideningReview');
    assert.equal(payload.governance.autoAuthorization.artifactBundleDraft.bundleKind, 'widening_review_ready_bundle');
    assert.equal(payload.governance.autoAuthorization.commandPreviewBundle.bundleKind, 'widening_review_review_command_bundle');
    assert.equal(payload.governance.autoAuthorization.commandPreviewBundle.resolvedAssertionRecordPathMode, 'workspace_relative');
    assert.equal(
      payload.governance.autoAuthorization.commandPreviewBundle.resolvedAssertionRecordPath,
      '.\\tests\\fixtures\\external-token-material-assertion-record-v1.json'
    );
    assert.match(
      payload.governance.autoAuthorization.commandPreviewBundle.primaryCommand,
      /governance-report\.js --json --auto-auth-assertion-record \.\\tests\\fixtures\\external-token-material-assertion-record-v1\.json --auto-auth-latest-rebound-outcome-class token_present/
    );
    assert.match(
      payload.governance.autoAuthorization.renderedOperatorPacketTextSurface.markdown,
      /governance-report command: `node \.\\src\\cli\\governance-report\.js --json --auto-auth-assertion-record \.\\tests\\fixtures\\external-token-material-assertion-record-v1\.json --auto-auth-latest-rebound-outcome-class token_present`/
    );
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
    assert.equal(payload.governance.wideningReview.reviewChecklist.W4.passed, true);
    assert.equal(payload.governance.wideningReview.reviewChecklist.W6.passed, true);
    assert.equal(payload.governance.wideningReview.reviewChecklist.W10.passed, false);
    assert.ok(payload.governance.wideningReview.failClosedReasons.includes('bounded_durable_write_crossing_not_granted'));
  } finally {
    await server.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('http-observe CLI should accept a filled CM-0611 markdown record through governance summary', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-observe-md-'));
  const server = await startHealthServer();
  await seedRuntimeArtifacts(tempBasePath);

  try {
    const result = await runCli({
      args: ['--json', '--auto-auth-assertion-record', REPO_ASSERTION_RECORD_MARKDOWN_PATH],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_HTTP_LOG: path.join(tempBasePath, 'logs', 'codex-memory-http.log'),
        CODEX_MEMORY_AUDIT_LOG: path.join(tempBasePath, 'logs', 'codex-memory-bridge.jsonl'),
        CODEX_MEMORY_RECALL_LOG: path.join(tempBasePath, 'logs', 'codex-memory-recall.jsonl'),
        CODEX_MEMORY_HTTP_HOST: '127.0.0.1',
        CODEX_MEMORY_HTTP_PORT: String(new URL(server.healthUrl).port)
      }
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.governance.autoAuthorization.allowedGovernanceOutput, 'AUTO_REUSE_CM0601_LINE_ONLY');
    assert.equal(payload.governance.autoAuthorization.assertionRecordInputTrace.traceAvailable, true);
    assert.equal(payload.governance.autoAuthorization.assertionRecordInputTrace.sourceFormat, 'cm0611_markdown_record_v1');
    assert.equal(payload.governance.autoAuthorization.assertionRecordInputTrace.sourceFileName, 'external-token-material-assertion-record-v1.md');
    assert.equal(payload.governance.autoAuthorization.assertionRecordInputTrace.sourceArtifactRef, 'docs/CM-0611_EXTERNAL_TOKEN_MATERIAL_ASSERTION_RECORD_TEMPLATE.md');
    assert.equal(payload.governance.autoAuthorization.commandPreviewBundle.resolvedAssertionRecordPathMode, 'workspace_relative');
    assert.equal(
      payload.governance.autoAuthorization.commandPreviewBundle.resolvedAssertionRecordPath,
      '.\\tests\\fixtures\\external-token-material-assertion-record-v1.md'
    );
    assert.match(
      payload.governance.autoAuthorization.renderedOperatorPacketTextSurface.markdown,
      /governance-report command: `node \.\\src\\cli\\governance-report\.js --json --auto-auth-assertion-record \.\\tests\\fixtures\\external-token-material-assertion-record-v1\.md`/
    );
    assert.equal(payload.governance.autoAuthorization.renderedArtifactTextSurface.selectedDraftId, 'cm0614Issuance');
    assert.match(
      payload.governance.autoAuthorization.renderedArtifactTextSurface.selectedDraftMarkdown,
      /source workspace-relative path: `\.\\tests\\fixtures\\external-token-material-assertion-record-v1\.md`/
    );
    assert.match(
      payload.governance.autoAuthorization.renderedArtifactTextSurface.selectedDraftMarkdown,
      /governance-report command: `node \.\\src\\cli\\governance-report\.js --json --auto-auth-assertion-record \.\\tests\\fixtures\\external-token-material-assertion-record-v1\.md`/
    );
    assert.equal(payload.governance.autoAuthorization.renderedOperatorPacketTextSurface.packetKind, 'cm0601_reuse_operator_packet');
  } finally {
    await server.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('http-observe CLI should pass explicit widening-review fixture through governance summary', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-observe-widening-'));
  const wideningFixturePath = path.join(tempBasePath, 'authorized-write-path-widening-review-pass.json');
  const server = await startHealthServer();
  await seedRuntimeArtifacts(tempBasePath);

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

    const result = await runCli({
      args: ['--json', '--widening-review-fixture', wideningFixturePath],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_HTTP_LOG: path.join(tempBasePath, 'logs', 'codex-memory-http.log'),
        CODEX_MEMORY_AUDIT_LOG: path.join(tempBasePath, 'logs', 'codex-memory-bridge.jsonl'),
        CODEX_MEMORY_RECALL_LOG: path.join(tempBasePath, 'logs', 'codex-memory-recall.jsonl'),
        CODEX_MEMORY_HTTP_HOST: '127.0.0.1',
        CODEX_MEMORY_HTTP_PORT: String(new URL(server.healthUrl).port)
      }
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.summary.governanceWideningReviewDecision, 'WIDENING_REVIEW_PASSED_PROCEED_TO_CM0607');
    assert.equal(payload.summary.governanceWideningReviewBlockedOn, null);
    assert.equal(payload.summary.governanceWideningReviewProceedToCm0607, true);
    assert.equal(payload.governance.wideningReview.decision, 'WIDENING_REVIEW_PASSED_PROCEED_TO_CM0607');
    assert.equal(payload.governance.wideningReview.cm0604Satisfied, true);
    assert.equal(payload.governance.wideningReview.cm0606BridgeActivated, true);
  } finally {
    await server.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('http-observe CLI should pass explicit widening-review routing-outcome record through governance summary', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-observe-route-'));
  const server = await startHealthServer();
  await seedRuntimeArtifacts(tempBasePath);

  try {
    const result = await runCli({
      args: ['--json', '--widening-review-routing-outcome-record', REPO_ROUTING_OUTCOME_RECORD_PATH],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_HTTP_LOG: path.join(tempBasePath, 'logs', 'codex-memory-http.log'),
        CODEX_MEMORY_AUDIT_LOG: path.join(tempBasePath, 'logs', 'codex-memory-bridge.jsonl'),
        CODEX_MEMORY_RECALL_LOG: path.join(tempBasePath, 'logs', 'codex-memory-recall.jsonl'),
        CODEX_MEMORY_HTTP_HOST: '127.0.0.1',
        CODEX_MEMORY_HTTP_PORT: String(new URL(server.healthUrl).port)
      }
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.governance.wideningReview.source, 'cm0645_explicit_input_fixture_plus_routing_outcome_record_v1');
    assert.equal(payload.governance.wideningReview.routingOutcomeRecordInputTrace.traceAvailable, true);
    assert.equal(payload.governance.wideningReview.reviewChecklist.W4.passed, true);
    assert.equal(payload.governance.wideningReview.reviewChecklist.W6.passed, false);
    assert.equal(payload.summary.governanceWideningReviewDecision, 'WIDENING_REVIEW_NOT_READY');
    assert.equal(payload.summary.governanceWideningReviewBlockedOn, 'token_present_same_baseline_evidence_missing');
  } finally {
    await server.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('http-observe CLI should pass explicit widening-review outcome record through widening-adoption summary', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-observe-adopt-'));
  const server = await startHealthServer();
  await seedRuntimeArtifacts(tempBasePath);

  try {
    const result = await runCli({
      args: ['--json', '--widening-adoption-review-record', REPO_WIDENING_ADOPTION_REVIEW_RECORD_PATH],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_HTTP_LOG: path.join(tempBasePath, 'logs', 'codex-memory-http.log'),
        CODEX_MEMORY_AUDIT_LOG: path.join(tempBasePath, 'logs', 'codex-memory-bridge.jsonl'),
        CODEX_MEMORY_RECALL_LOG: path.join(tempBasePath, 'logs', 'codex-memory-recall.jsonl'),
        CODEX_MEMORY_HTTP_HOST: '127.0.0.1',
        CODEX_MEMORY_HTTP_PORT: String(new URL(server.healthUrl).port)
      }
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.summary.governanceWideningAdoptionDecision, 'WIDENING_ADOPTION_NOT_READY');
    assert.equal(payload.governance.wideningAdoption.wideningReviewRecordInputTrace.traceAvailable, true);
    assert.equal(payload.governance.wideningAdoption.adoptionChecklist.A4.passed, true);
    assert.equal(payload.governance.wideningAdoption.adoptionChecklist.A6.passed, false);
  } finally {
    await server.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('http-observe CLI should pass explicit widening-adoption record through widening-adoption summary', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-observe-adopt-grant-'));
  const server = await startHealthServer();
  await seedRuntimeArtifacts(tempBasePath);

  try {
    const result = await runCli({
      args: [
        '--json',
        '--widening-adoption-review-record',
        REPO_WIDENING_ADOPTION_REVIEW_RECORD_PATH,
        '--widening-adoption-record',
        REPO_WIDENING_ADOPTION_RECORD_PATH
      ],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_HTTP_LOG: path.join(tempBasePath, 'logs', 'codex-memory-http.log'),
        CODEX_MEMORY_AUDIT_LOG: path.join(tempBasePath, 'logs', 'codex-memory-bridge.jsonl'),
        CODEX_MEMORY_RECALL_LOG: path.join(tempBasePath, 'logs', 'codex-memory-recall.jsonl'),
        CODEX_MEMORY_HTTP_HOST: '127.0.0.1',
        CODEX_MEMORY_HTTP_PORT: String(new URL(server.healthUrl).port)
      }
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.summary.governanceWideningAdoptionDecision, 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY');
    assert.equal(payload.governance.wideningAdoption.wideningReviewRecordInputTrace.traceAvailable, true);
    assert.equal(payload.governance.wideningAdoption.wideningAdoptionRecordInputTrace.traceAvailable, true);
    assert.equal(payload.governance.wideningAdoption.adoptionChecklist.A10.passed, true);
    assert.equal(payload.governance.wideningAdoption.cm0595ApprovalLinePreview.previewUsableNow, true);
    assert.equal(payload.governance.wideningAdoption.cm0595CommandPreviewBundle.resolvedRecordPathMode, 'workspace_relative_pair');
    assert.equal(payload.governance.wideningAdoption.cm0595OperatorPacketDraft.packetKind, 'cm0595_auto_authorization_operator_packet');
    assert.equal(payload.governance.wideningAdoption.cm0595IssuanceRecordDraft.draftUsableNow, true);
    assert.equal(payload.governance.wideningAdoption.cm0595ExecutionEvidenceDraft.draftUsableNow, true);
    assert.match(payload.governance.wideningAdoption.renderedCm0595OperatorPacketTextSurface.markdown, /授权执行 CM-0595/);
  } finally {
    await server.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('http-observe CLI should pass explicit CM-0649 issuance record through widening-adoption summary', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-observe-cm0649-'));
  const server = await startHealthServer();
  await seedRuntimeArtifacts(tempBasePath);

  try {
    const result = await runCli({
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
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_HTTP_LOG: path.join(tempBasePath, 'logs', 'codex-memory-http.log'),
        CODEX_MEMORY_AUDIT_LOG: path.join(tempBasePath, 'logs', 'codex-memory-bridge.jsonl'),
        CODEX_MEMORY_RECALL_LOG: path.join(tempBasePath, 'logs', 'codex-memory-recall.jsonl'),
        CODEX_MEMORY_HTTP_HOST: '127.0.0.1',
        CODEX_MEMORY_HTTP_PORT: String(new URL(server.healthUrl).port)
      }
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.governance.wideningAdoption.cm0595IssuanceRecordInputTrace.traceAvailable, true);
    assert.equal(payload.governance.wideningAdoption.cm0595IssuanceRecordInputTrace.sourceFileName, 'cm0649-cm0595-approval-issuance-record-v1.md');
    assert.match(payload.governance.wideningAdoption.renderedCm0595OperatorPacketTextSurface.markdown, /issued CM-0595 record path: `\.\\tests\\fixtures\\cm0649-cm0595-approval-issuance-record-v1\.md`/);
  } finally {
    await server.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('http-observe CLI should pass explicit CM-0650 execution evidence record through widening-adoption summary', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-observe-cm0650-'));
  const server = await startHealthServer();
  await seedRuntimeArtifacts(tempBasePath);

  try {
    const result = await runCli({
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
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_HTTP_LOG: path.join(tempBasePath, 'logs', 'codex-memory-http.log'),
        CODEX_MEMORY_AUDIT_LOG: path.join(tempBasePath, 'logs', 'codex-memory-bridge.jsonl'),
        CODEX_MEMORY_RECALL_LOG: path.join(tempBasePath, 'logs', 'codex-memory-recall.jsonl'),
        CODEX_MEMORY_HTTP_HOST: '127.0.0.1',
        CODEX_MEMORY_HTTP_PORT: String(new URL(server.healthUrl).port)
      }
    });

    assert.equal(result.code, 0, result.stderr);
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
  } finally {
    await server.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});
