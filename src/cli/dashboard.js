#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { createConfig } = require('../config/createConfig');
const {
  collectReport: collectGovernanceReport,
  buildGovernanceSurface,
  buildReadPolicySurface
} = require('./governance-report');
const {
  parseReceiptMarkdown
} = require('../core/SmartStandingAuthorizationV3ReceiptParser');
const {
  collectAutopilotClosedLoopSummary
} = require('../core/AutopilotClosedLoopDryRun');
const {
  collectAutopilotControllerSummary
} = require('../core/AutopilotControllerReadOnly');
const {
  collectAutopilotStateStoreDraft
} = require('../core/AutopilotStateStoreDraft');
const {
  collectAutopilotActionAdapterContract
} = require('../core/AutopilotActionAdapterContract');
const {
  collectAutopilotValidationPlanner
} = require('../core/AutopilotValidationPlanner');
const {
  collectAutopilotReplayHarness
} = require('../core/AutopilotReplayHarness');
const {
  collectAutopilotOperatorConsole
} = require('../core/AutopilotOperatorConsole');
const {
  collectAutopilotControlledGreenExecutorEntry
} = require('../core/AutopilotControlledGreenExecutorEntry');
const {
  collectAutopilotFixtureGreenExecutor
} = require('../core/AutopilotFixtureGreenExecutor');
const {
  collectAutopilotGreenFileWriteBoundary
} = require('../core/AutopilotGreenFileWriteBoundary');
const {
  collectAutopilotGreenFileWriteExecutorContract
} = require('../core/AutopilotGreenFileWriteExecutorContract');

const READ_POLICY_DASHBOARD_AUDIT_TAIL = 20;

function parseArgs(argv = []) {
  const options = {
    json: false,
    summaryOnly: false,
    skipTests: true,
    showRenderedOperatorArtifactText: false,
    showRenderedOperatorPacketText: false,
    showRenderedOperatorBriefText: false,
    showRenderedWideningReviewText: false,
    showRenderedWideningAdoptionText: false,
    showRenderedBoundedRecallText: false,
    showRenderedBoundedRecallCloseoutText: false,
    autoAuthorizationAssertionRecordPath: '',
    autoAuthorizationLatestReboundOutcomeClass: '',
    wideningReviewFixturePath: '',
    wideningReviewRoutingOutcomeRecordPath: '',
    wideningAdoptionFixturePath: '',
    wideningAdoptionReviewRecordPath: '',
    wideningAdoptionRecordPath: '',
    boundedRecallPreparationFixturePath: '',
    boundedRecallCloseoutFixturePath: '',
    cm0595IssuanceRecordPath: '',
    cm0595ExecutionEvidenceRecordPath: '',
    boundedRecallIssuanceRecordPath: '',
    boundedRecallExecutionEvidenceRecordPath: '',
    v3ReceiptsValidationLogPath: path.resolve('.agent_board', 'VALIDATION_LOG.md')
  };
  for (let i = 0; i < argv.length; i += 1) {
    const t = argv[i];
    if (t === '--json') { options.json = true; continue; }
    if (t === '--summary-only') { options.summaryOnly = true; continue; }
    if (t === '--with-tests') { options.skipTests = false; continue; }
    if (t === '--rendered-operator-artifact-text') { options.showRenderedOperatorArtifactText = true; continue; }
    if (t === '--rendered-operator-packet-text') { options.showRenderedOperatorPacketText = true; continue; }
    if (t === '--rendered-operator-brief-text') { options.showRenderedOperatorBriefText = true; continue; }
    if (t === '--rendered-widening-review-text') { options.showRenderedWideningReviewText = true; continue; }
    if (t === '--rendered-widening-adoption-text') { options.showRenderedWideningAdoptionText = true; continue; }
    if (t === '--rendered-bounded-recall-text') { options.showRenderedBoundedRecallText = true; continue; }
    if (t === '--rendered-bounded-recall-closeout-text') { options.showRenderedBoundedRecallCloseoutText = true; continue; }
    if (t === '--auto-auth-assertion-record') {
      options.autoAuthorizationAssertionRecordPath = path.resolve(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (t === '--widening-review-fixture') {
      options.wideningReviewFixturePath = path.resolve(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (t === '--widening-review-routing-outcome-record') {
      options.wideningReviewRoutingOutcomeRecordPath = path.resolve(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (t === '--widening-adoption-fixture') {
      options.wideningAdoptionFixturePath = path.resolve(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (t === '--widening-adoption-review-record') {
      options.wideningAdoptionReviewRecordPath = path.resolve(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (t === '--widening-adoption-record') {
      options.wideningAdoptionRecordPath = path.resolve(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (t === '--bounded-recall-preparation-fixture') {
      options.boundedRecallPreparationFixturePath = path.resolve(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (t === '--bounded-recall-closeout-fixture') {
      options.boundedRecallCloseoutFixturePath = path.resolve(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (t === '--cm0595-issuance-record') {
      options.cm0595IssuanceRecordPath = path.resolve(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (t === '--cm0595-execution-evidence-record') {
      options.cm0595ExecutionEvidenceRecordPath = path.resolve(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (t === '--bounded-recall-issuance-record') {
      options.boundedRecallIssuanceRecordPath = path.resolve(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (t === '--bounded-recall-execution-evidence-record') {
      options.boundedRecallExecutionEvidenceRecordPath = path.resolve(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (t === '--v3-receipts-validation-log') {
      options.v3ReceiptsValidationLogPath = path.resolve(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (t === '--auto-auth-latest-rebound-outcome-class') {
      options.autoAuthorizationLatestReboundOutcomeClass = String(argv[i + 1] || '').trim();
      i += 1;
    }
  }
  return options;
}

function resolveHealthUrl() {
  const host = process.env.CODEX_MEMORY_HTTP_HOST || '127.0.0.1';
  const port = Number.parseInt(String(process.env.CODEX_MEMORY_HTTP_PORT || '7605'), 10) || 7605;
  return `http://${host}:${port}/health`;
}

function resolveLogDir() {
  return process.env.CODEX_MEMORY_LOGS_DIR || path.join(process.cwd(), 'logs');
}

function resolveDbPath() {
  if (process.env.CODEX_MEMORY_DB_PATH) {
    return path.resolve(process.cwd(), process.env.CODEX_MEMORY_DB_PATH);
  }
  const dataDir = process.env.CODEX_MEMORY_DATA_DIR || path.join(process.cwd(), 'data');
  return path.join(path.resolve(process.cwd(), dataDir), 'codex-memory.sqlite');
}

function spawnJson(args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      timeout: 120000
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    child.on('close', code => {
      try { resolve(JSON.parse(stdout || stderr || 'null')); }
      catch { resolve(null); }
    });
    child.on('error', () => resolve(null));
  });
}

function spawnText(command, args = []) {
  return new Promise(resolve => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      timeout: 30000
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    child.on('close', code => resolve({ code, stdout, stderr }));
    child.on('error', err => resolve({ code: null, stdout: '', stderr: err.message }));
  });
}

async function httpGet(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    const body = await res.text();
    try { return { statusCode: res.status, payload: JSON.parse(body) }; }
    catch { return { statusCode: res.status, payload: body }; }
  } catch {
    return { statusCode: null, payload: null };
  }
}

function countLinesIfExists(filePath, tail = 0) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.trim().split(/\r?\n/).filter(Boolean);
    if (tail > 0) return lines.slice(-tail);
    return lines;
  } catch {
    return [];
  }
}

function parseJsonLinesIfExists(filePath, tail = 5) {
  const lines = countLinesIfExists(filePath, tail);
  const entries = [];
  for (const line of lines) {
    try { entries.push(JSON.parse(line)); } catch { /* skip */ }
  }
  return entries;
}

function statFile(filePath) {
  try {
    const s = fs.statSync(filePath);
    return { exists: true, size: s.size, lastModified: new Date(s.mtime).toISOString() };
  } catch {
    return { exists: false, size: 0, lastModified: null };
  }
}

function classifyStatus(...levels) {
  if (levels.includes('error')) return 'error';
  if (levels.includes('warn')) return 'warn';
  return 'ok';
}

function isCoverageComplete(coverage) {
  if (!coverage) return false;
  return coverage.completed_tasks === coverage.covered_tasks
    && Array.isArray(coverage.missing_tasks)
    && coverage.missing_tasks.length === 0;
}

function formatMissingTasks(tasks = []) {
  if (!Array.isArray(tasks) || tasks.length === 0) return 'none';
  const preview = tasks.slice(0, 5).join(',');
  return tasks.length > 5 ? `${preview},+${tasks.length - 5}` : preview;
}

function pickLaterTimestamp(current, candidate) {
  if (!candidate) return current;
  if (!current) return candidate;
  const currentTime = new Date(current).getTime();
  const candidateTime = new Date(candidate).getTime();
  if (Number.isNaN(currentTime)) return candidate;
  if (Number.isNaN(candidateTime)) return current;
  return candidateTime > currentTime ? candidate : current;
}

function incrementBreakdown(map, key) {
  if (!key) return;
  map[key] = (map[key] || 0) + 1;
}

function isSafeScopeDimension(dimension) {
  return typeof dimension === 'string' && dimension !== 'workspace_id';
}

function buildRecallScopeSummary(entries = []) {
  const summary = {
    scopedRecallCount: 0,
    strictScopedRecallCount: 0,
    latestScopedHitAt: null,
    scopeModeBreakdown: {},
    scopeDimensionBreakdown: {},
    projectBreakdown: {},
    clientBreakdown: {},
    visibilityBreakdown: {}
  };

  for (const entry of entries) {
    if (!entry?.scopeApplied) continue;

    summary.scopedRecallCount += 1;
    summary.latestScopedHitAt = pickLaterTimestamp(summary.latestScopedHitAt, entry.timestamp || null);
    if (entry.scopeStrict) {
      summary.strictScopedRecallCount += 1;
    }

    incrementBreakdown(summary.scopeModeBreakdown, typeof entry.scopeMode === 'string' ? entry.scopeMode : 'unknown');
    for (const dimension of Array.isArray(entry.scopeDimensions) ? entry.scopeDimensions : []) {
      incrementBreakdown(summary.scopeDimensionBreakdown, isSafeScopeDimension(dimension) ? dimension : null);
    }
    incrementBreakdown(summary.projectBreakdown, typeof entry.scopeProjectId === 'string' ? entry.scopeProjectId : null);
    incrementBreakdown(summary.clientBreakdown, typeof entry.scopeClientId === 'string' ? entry.scopeClientId : null);
    for (const visibility of Array.isArray(entry.scopeVisibility) ? entry.scopeVisibility : []) {
      incrementBreakdown(summary.visibilityBreakdown, typeof visibility === 'string' ? visibility : null);
    }
  }

  const scopeState = buildRecallScopeEvidenceState(entries.length, summary);
  Object.assign(summary, scopeState);
  return summary;
}

function buildRecallScopeEvidenceState(recentRecallCount, summary) {
  if (recentRecallCount === 0) {
    return {
      scopeStatus: 'warn',
      scopeEvidenceState: 'no_recent_recall_audit',
      scopeNextAction: 'collect_recent_scoped_recall_audit_evidence_before_client_scope_claim',
      scopeReadinessClaimAllowed: false
    };
  }
  if (summary.scopedRecallCount === 0) {
    return {
      scopeStatus: 'warn',
      scopeEvidenceState: 'recent_recall_without_scope',
      scopeNextAction: 'collect_recent_scoped_recall_audit_evidence_before_client_scope_claim',
      scopeReadinessClaimAllowed: false
    };
  }
  if (summary.strictScopedRecallCount === 0) {
    return {
      scopeStatus: 'warn',
      scopeEvidenceState: 'scoped_recall_without_strict_scope',
      scopeNextAction: 'collect_recent_strict_scoped_recall_audit_evidence_before_client_scope_claim',
      scopeReadinessClaimAllowed: false
    };
  }
  return {
    scopeStatus: 'ok',
    scopeEvidenceState: 'recent_strict_scoped_recall',
    scopeNextAction: 'none',
    scopeReadinessClaimAllowed: false
  };
}

async function collectService() {
  const url = resolveHealthUrl();
  const result = await httpGet(url);
  const status = result.statusCode === 200 ? 'ok' : 'warn';
  return {
    status,
    url,
    httpStatus: result.statusCode,
    name: result.payload?.name || 'vcp_codex_memory',
    version: result.payload?.version || '',
    protocol: result.payload?.protocol || ''
  };
}

async function collectStore() {
  try {
    const { DatabaseSync } = require('node:sqlite');
    const dbPath = resolveDbPath();
    if (!fs.existsSync(dbPath)) {
      return { status: 'warn', records: 0, chunks: 0, vectors: 0, message: `Database not found: ${dbPath}` };
    }
    const db = new DatabaseSync(dbPath);
    const recordCount = db.prepare('SELECT COUNT(*) as cnt FROM memory_records').get().cnt;
    const chunkCount = db.prepare('SELECT COUNT(*) as cnt FROM memory_chunks').get().cnt;
    let targets = [];
    let sensitivityBreakdown = {};
    let ageBreakdown = { last24h: 0, last7d: 0, last30d: 0, older30d: 0 };
    try {
      targets = db.prepare('SELECT DISTINCT target FROM memory_records').all().map(r => r.target);
    } catch { /* ignore */ }
    try {
      const sens = db.prepare('SELECT sensitivity, COUNT(*) as cnt FROM memory_records GROUP BY sensitivity').all();
      for (const r of sens) { sensitivityBreakdown[r.sensitivity] = r.cnt; }
    } catch { /* ignore */ }
    try {
      const now = new Date();
      const d1 = new Date(now - 86400000).toISOString();
      const d7 = new Date(now - 7 * 86400000).toISOString();
      const d30 = new Date(now - 30 * 86400000).toISOString();
      ageBreakdown.last24h = db.prepare('SELECT COUNT(*) as cnt FROM memory_records WHERE updated_at > ?').get(d1).cnt;
      ageBreakdown.last7d = db.prepare('SELECT COUNT(*) as cnt FROM memory_records WHERE updated_at > ?').get(d7).cnt;
      ageBreakdown.last30d = db.prepare('SELECT COUNT(*) as cnt FROM memory_records WHERE updated_at > ?').get(d30).cnt;
      ageBreakdown.older30d = recordCount - ageBreakdown.last30d;
    } catch { /* ignore */ }
    const records = Number(recordCount) || 0;
    const chunks = Number(chunkCount) || 0;
    db.close();
    return {
      status: records > 0 ? 'ok' : 'warn',
      records,
      chunks,
      targets,
      sensitivityBreakdown,
      ageBreakdown
    };
  } catch (err) {
    return { status: 'error', records: 0, chunks: 0, error: err.message };
  }
}

async function collectStoreFreshnessWritePreflight() {
  const commandPreview = 'node .\\src\\cli\\store-freshness-write-preflight.js --json';
  const data = await spawnJson([path.join(process.cwd(), 'src', 'cli', 'store-freshness-write-preflight.js'), '--json']);
  if (!data || typeof data !== 'object') {
    return {
      status: 'warn',
      decision: 'unavailable',
      approvalState: 'none',
      packetId: 'none',
      proposedMemoryWrites: 0,
      memoryWrites: 0,
      readinessClaimAllowed: false,
      commandPreview,
      operatorApprovalLine: '',
      operatorApprovalLineAvailable: false
    };
  }
  const packet = data.approvalPacket && typeof data.approvalPacket === 'object'
    ? data.approvalPacket
    : {};
  return {
    status: data.status === 'ok' ? 'ok' : data.status === 'error' ? 'warn' : data.status || 'warn',
    decision: data.decision || 'unavailable',
    approvalState: packet.approvalState || 'none',
    packetId: packet.packetId || 'none',
    proposedMemoryWrites: Number(data.proposedMemoryWrites) || 0,
    memoryWrites: Number(data.memoryWrites) || 0,
    readinessClaimAllowed: data.readinessClaimAllowed === true,
    commandPreview: data.commandPreview || commandPreview,
    operatorApprovalLine: typeof packet.operatorApprovalLine === 'string' ? packet.operatorApprovalLine : '',
    operatorApprovalLineAvailable: typeof packet.operatorApprovalLine === 'string' && packet.operatorApprovalLine.length > 0
  };
}

async function collectProfile() {
  const data = await spawnJson([path.join(process.cwd(), 'src', 'cli', 'profile-health.js'), '--json']);
  if (!data) return { status: 'warn', fingerprint: null, legacyChunks: 0, message: 'Failed to read profile' };
  return {
    status: data.status === 'ready' ? 'ok' : 'warn',
    fingerprint: data.embeddingProfile?.fingerprint || null,
    dimensions: data.embeddingProfile?.dimensions || 0,
    provider: data.embeddingProfile?.provider || '',
    legacyChunks: data.summary?.legacyChunks || 0,
    embeddingCacheEntries: data.summary?.embeddingCacheEntries || 0,
    candidateCacheEntries: data.summary?.candidateCacheEntries || 0
  };
}

function collectRuntime() {
  const logDir = resolveLogDir();
  const httpLogPath = path.join(logDir, 'codex-memory-http.log');
  const watchdogLogPath = path.join(logDir, 'codex-memory-http-watchdog.log');
  const httpLines = countLinesIfExists(httpLogPath);
  const watchdogLines = countLinesIfExists(watchdogLogPath);
  const errorCount = httpLines.filter(l => l.includes('ERROR')).length;
  const recoveryCount = watchdogLines.filter(l => l.includes('service recovered')).length;
  const ensureFailureCount = watchdogLines.filter(l => l.includes('ensure failed')).length;
  return {
    status: errorCount > 0 ? 'warn' : 'ok',
    httpLogErrorCount: errorCount,
    watchdogRecoveryCount: recoveryCount,
    watchdogEnsureFailureCount: ensureFailureCount,
    httpLogLineCount: httpLines.length,
    watchdogLogLineCount: watchdogLines.length
  };
}

function collectAudits() {
  const logDir = resolveLogDir();
  const bridgePath = path.join(logDir, 'codex-memory-bridge.jsonl');
  const recallPath = path.join(logDir, 'codex-memory-recall.jsonl');
  const bridgeEntries = parseJsonLinesIfExists(bridgePath, 5);
  const recallEntries = parseJsonLinesIfExists(recallPath, 5);
  const readPolicyRecallEntries = parseJsonLinesIfExists(recallPath, READ_POLICY_DASHBOARD_AUDIT_TAIL);
  const bridgeAccepted = bridgeEntries.filter(e => e.decision === 'accepted').length;
  const bridgeRejected = bridgeEntries.filter(e => e.decision === 'rejected').length;
  const recallScopeSummary = buildRecallScopeSummary(recallEntries);
  return {
    bridge: {
      status: bridgeEntries.length > 0 ? 'ok' : 'warn',
      recentCount: bridgeEntries.length,
      acceptedCount: bridgeAccepted,
      rejectedCount: bridgeRejected,
      lastAcceptedAt: bridgeEntries.find(e => e.decision === 'accepted')?.timestamp || null,
      lastRejectedAt: bridgeEntries.find(e => e.decision === 'rejected')?.timestamp || null
    },
    recall: {
      status: recallEntries.length > 0 ? 'ok' : 'warn',
      recentCount: recallEntries.length,
      recallTypeBreakdown: recallEntries.reduce((acc, e) => {
        acc[e.recallType] = (acc[e.recallType] || 0) + 1;
        return acc;
      }, {}),
      lastRecallAt: recallEntries[0]?.timestamp || null,
      ...recallScopeSummary
    },
    readPolicy: buildReadPolicySurface({
      config: createConfig(),
      recallEntries: readPolicyRecallEntries,
      auditTailLimit: READ_POLICY_DASHBOARD_AUDIT_TAIL
    })
  };
}

async function collectGate() {
  const data = await spawnJson([path.join(process.cwd(), 'src', 'cli', 'mainline-gate.js'), '--json']);
  if (!data || !data.results) return { status: 'error', compare: null, rollback: null };
  const compareSummary = data.results.compare?.summary || {};
  const rollbackSummary = data.results.rollback?.summary || {};
  const compareOk = compareSummary.ok ?? false;
  const rollbackOk = rollbackSummary.ok ?? false;
  return {
    status: (compareOk && rollbackOk) ? 'ok' : 'error',
    compare: {
      totalCases: compareSummary.totalCaseCount || 0,
      matchedCases: compareSummary.matchedCaseCount || 0,
      coreMismatch: compareSummary.coreMismatchCountTotal ?? -1,
      extendedMismatch: compareSummary.extendedMismatchCountTotal ?? -1
    },
    rollback: {
      totalCases: rollbackSummary.totalCaseCount || 0,
      readyCases: rollbackSummary.readyCaseCount || 0,
      coreMismatch: rollbackSummary.coreMismatchCountTotal ?? -1,
      extendedMismatch: rollbackSummary.extendedMismatchCountTotal ?? -1
    }
  };
}

async function collectGitSync() {
  const result = await spawnText('git', ['status', '--short', '--branch']);
  if (result.code !== 0) {
    return {
      status: 'warn',
      branch: 'unknown',
      upstream: 'unknown',
      ahead: 0,
      behind: 0,
      dirtyCount: 0,
      branchSummary: 'unavailable',
      remoteActionRequired: false,
      remoteActionsPerformed: false,
      readinessClaimAllowed: false,
      message: 'local git status unavailable'
    };
  }

  const lines = result.stdout.trim().split(/\r?\n/).filter(Boolean);
  const branchSummary = lines[0]?.replace(/^##\s*/, '') || 'unknown';
  const dirtyCount = Math.max(0, lines.length - 1);
  const ahead = Number.parseInt(branchSummary.match(/ahead\s+(\d+)/)?.[1] || '0', 10);
  const behind = Number.parseInt(branchSummary.match(/behind\s+(\d+)/)?.[1] || '0', 10);
  const branch = branchSummary.split(/\s|\.\.\./)[0] || 'unknown';
  const upstream = branchSummary.includes('...') ? branchSummary.split('...')[1].split(/\s|\[/)[0] : 'none';
  const status = ahead > 0 || behind > 0 || dirtyCount > 0 ? 'warn' : 'ok';
  return {
    status,
    branch,
    upstream,
    ahead,
    behind,
    dirtyCount,
    branchSummary,
    remoteActionRequired: false,
    remoteActionsPerformed: false,
    readinessClaimAllowed: false,
    message: status === 'ok'
      ? 'local git branch is clean and aligned with tracked upstream'
      : 'local git branch has unsynced or dirty state; remote action remains explicit-only'
  };
}

function collectGovernance(options = {}) {
  const report = collectGovernanceReport({
    autoAuthorizationAssertionRecordPath: options.autoAuthorizationAssertionRecordPath,
    autoAuthorizationLatestReboundOutcomeClass: options.autoAuthorizationLatestReboundOutcomeClass,
    wideningReviewFixturePath: options.wideningReviewFixturePath,
    wideningReviewRoutingOutcomeRecordPath: options.wideningReviewRoutingOutcomeRecordPath,
    wideningAdoptionFixturePath: options.wideningAdoptionFixturePath,
    wideningAdoptionReviewRecordPath: options.wideningAdoptionReviewRecordPath,
    wideningAdoptionRecordPath: options.wideningAdoptionRecordPath,
    boundedRecallPreparationFixturePath: options.boundedRecallPreparationFixturePath,
    boundedRecallCloseoutFixturePath: options.boundedRecallCloseoutFixturePath,
    cm0595IssuanceRecordPath: options.cm0595IssuanceRecordPath,
    cm0595ExecutionEvidenceRecordPath: options.cm0595ExecutionEvidenceRecordPath,
    boundedRecallIssuanceRecordPath: options.boundedRecallIssuanceRecordPath,
    boundedRecallExecutionEvidenceRecordPath: options.boundedRecallExecutionEvidenceRecordPath
  });
  const summary = buildGovernanceSurface(report, { tolerateUnavailable: true });
  return {
    ...summary,
    sourceStatus: report.error ? 'unavailable' : 'ok',
    paths: report.paths || {},
    rawSummary: report.summary || null
  };
}

function collectSmartStandingAuthorizationV3(options = {}) {
  const workspaceRoot = process.cwd();
  const validationLogPath = path.resolve(options.v3ReceiptsValidationLogPath || path.join('.agent_board', 'VALIDATION_LOG.md'));
  const relative = path.relative(workspaceRoot, validationLogPath);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    return {
      status: 'warn',
      decision: 'NOT_READY_BLOCKED',
      evidenceClass: 'read_only_local_markdown_parse',
      source_surface: 'outside_workspace_rejected',
      latest_v3_task_id: 'not_recorded_in_validation_log',
      latest_validation_id: 'not_recorded_in_validation_log',
      latest_lane: 'not_recorded_in_validation_log',
      latest_receipt_status: 'not_recorded_in_validation_log',
      latest_validation_result: 'not_recorded_in_validation_log',
      red_stop_count: 0,
      next_auto_step_allowed: false,
      stop_reason: 'validation_log_path_outside_workspace'
    };
  }

  try {
    const markdown = fs.readFileSync(validationLogPath, 'utf8');
    const summary = parseReceiptMarkdown(markdown, {
      sourcePath: validationLogPath,
      workspaceRoot
    });
    return {
      status: summary.latest_parser_status === 'parser_ok' ? 'ok' : 'warn',
      ...summary
    };
  } catch (error) {
    return {
      status: 'warn',
      decision: 'NOT_READY_BLOCKED',
      evidenceClass: 'read_only_local_markdown_parse',
      source_surface: relative.split(path.sep).join('/'),
      latest_v3_task_id: 'not_recorded_in_validation_log',
      latest_validation_id: 'not_recorded_in_validation_log',
      latest_lane: 'not_recorded_in_validation_log',
      latest_receipt_status: 'not_recorded_in_validation_log',
      latest_validation_result: 'not_recorded_in_validation_log',
      red_stop_count: 0,
      next_auto_step_allowed: false,
      stop_reason: `receipt_parse_unavailable:${error.code || 'read_failed'}`,
      error: error.message
    };
  }
}

function collectAutopilotKernel() {
  const workspaceRoot = process.cwd();
  const profilePath = path.join(workspaceRoot, 'docs', 'AUTOPILOT_PROJECT_PROFILE.md');
  const runtimePath = path.join(workspaceRoot, 'docs', 'AUTOPILOT_GOAL_DECOMPOSITION_RUNTIME.md');
  const ledgerPath = path.join(workspaceRoot, '.agent_board', 'AUTOPILOT_LEDGER.md');
  const validationLogPath = path.join(workspaceRoot, '.agent_board', 'VALIDATION_LOG.md');
  const schemaDir = path.join(workspaceRoot, 'schemas');
  const exampleDir = path.join(workspaceRoot, 'tests', 'schema_examples');
  const governanceValidatorPath = path.join(workspaceRoot, 'scripts', 'validate_autopilot_governance_kernel.js');
  const goalCompilerValidatorPath = path.join(workspaceRoot, 'scripts', 'validate_autopilot_goal_compiler.js');
  const stateStoreValidatorPath = path.join(workspaceRoot, 'scripts', 'validate_autopilot_state_store_draft.js');
  const actionAdapterValidatorPath = path.join(workspaceRoot, 'scripts', 'validate_autopilot_action_adapter_contract.js');
  const validationPlannerValidatorPath = path.join(workspaceRoot, 'scripts', 'validate_autopilot_validation_planner.js');
  const replayHarnessValidatorPath = path.join(workspaceRoot, 'scripts', 'validate_autopilot_replay_harness.js');
  const operatorConsoleValidatorPath = path.join(workspaceRoot, 'scripts', 'validate_autopilot_operator_console.js');
  const controlledGreenEntryValidatorPath = path.join(workspaceRoot, 'scripts', 'validate_autopilot_controlled_green_executor_entry.js');
  const fixtureGreenExecutorValidatorPath = path.join(workspaceRoot, 'scripts', 'validate_autopilot_fixture_green_executor.js');
  const greenFileWriteBoundaryValidatorPath = path.join(workspaceRoot, 'scripts', 'validate_autopilot_green_file_write_boundary.js');
  const greenFileWriteExecutorContractValidatorPath = path.join(workspaceRoot, 'scripts', 'validate_autopilot_green_file_write_executor_contract.js');
  const requiredSchemas = [
    'autopilot_autonomy_envelope.schema.yaml',
    'autopilot_action_adapter_contract.schema.yaml',
    'autopilot_closed_loop_state.schema.yaml',
    'autopilot_controller_cycle.schema.yaml',
    'autopilot_execution_receipt.schema.yaml',
    'autopilot_failure_recovery_matrix.schema.yaml',
    'autopilot_receipt_registry.schema.yaml',
    'autopilot_structured_state_store.schema.yaml',
    'autopilot_goal.schema.yaml',
    'autopilot_route_plan.schema.yaml',
    'autopilot_task_queue.schema.yaml',
    'autopilot_validation_planner.schema.yaml',
    'autopilot_replay_harness.schema.yaml',
    'autopilot_operator_console.schema.yaml',
    'autopilot_controlled_green_executor_entry.schema.yaml',
    'autopilot_fixture_green_executor.schema.yaml',
    'autopilot_green_file_write_boundary.schema.yaml',
    'autopilot_green_file_write_executor_contract.schema.yaml'
  ];
  const requiredExamples = requiredSchemas.map(name => name.replace('.schema.yaml', '.example.json'));

  const listMatching = (dir, pattern) => {
    try {
      return fs.readdirSync(dir).filter(name => pattern.test(name)).sort();
    } catch {
      return [];
    }
  };

  const schemaFiles = listMatching(schemaDir, /^autopilot_.*\.schema\.yaml$/);
  const exampleFiles = listMatching(exampleDir, /^autopilot_.*\.example\.json$/);
  const schemaFileSet = new Set(schemaFiles);
  const exampleFileSet = new Set(exampleFiles);
  const missingRequiredSchemas = requiredSchemas.filter(name => !schemaFileSet.has(name));
  const missingRequiredExamples = requiredExamples.filter(name => !exampleFileSet.has(name));
  const profileExists = fs.existsSync(profilePath);
  const runtimeExists = fs.existsSync(runtimePath);
  const ledgerExists = fs.existsSync(ledgerPath);
  const validators = {
    governance_kernel: fs.existsSync(governanceValidatorPath),
    goal_compiler: fs.existsSync(goalCompilerValidatorPath),
    state_store_draft: fs.existsSync(stateStoreValidatorPath),
    action_adapter_contract: fs.existsSync(actionAdapterValidatorPath),
    validation_planner: fs.existsSync(validationPlannerValidatorPath),
    replay_harness: fs.existsSync(replayHarnessValidatorPath),
    operator_console: fs.existsSync(operatorConsoleValidatorPath),
    controlled_green_entry: fs.existsSync(controlledGreenEntryValidatorPath),
    fixture_green_executor: fs.existsSync(fixtureGreenExecutorValidatorPath),
    green_file_write_boundary: fs.existsSync(greenFileWriteBoundaryValidatorPath),
    green_file_write_executor_contract: fs.existsSync(greenFileWriteExecutorContractValidatorPath)
  };

  const ledgerLines = countLinesIfExists(ledgerPath, 0);
  const latestLedgerRow = [...ledgerLines].reverse().find(line => /^\| CM-\d+ /.test(line)) || '';
  const latestLedgerCells = latestLedgerRow
    ? latestLedgerRow.split('|').slice(1, -1).map(cell => cell.trim())
    : [];
  const blockedRedCount = (() => {
    if (!ledgerExists) return 0;
    const text = readFileSafe(ledgerPath);
    const blockedSection = text.split('## Blocked Red Lane Items')[1] || '';
    return blockedSection.split(/\r?\n/).filter(line => line.trim().startsWith('- ')).length;
  })();
  const validationLog = readFileSafe(validationLogPath);
  const latestValidationRow = validationLog
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(line => /^\| CMV-\d{4} /.test(line) && line.includes('COMPLETED_VALIDATED'));
  const latestValidationId = latestValidationRow
    ? (latestValidationRow.match(/\| (CMV-\d{4}) /) || [])[1] || 'not_recorded'
    : 'not_recorded';
  const validationStatus = latestValidationId !== 'not_recorded'
    ? 'completed_validated'
    : 'not_recorded';

  const status = profileExists
    && runtimeExists
    && ledgerExists
    && missingRequiredSchemas.length === 0
    && missingRequiredExamples.length === 0
    && validators.governance_kernel
    && validators.goal_compiler
    && validationStatus === 'completed_validated'
      ? 'ok'
      : 'warn';

  return {
    status,
    decision: 'NOT_READY_BLOCKED',
    evidenceClass: 'read_only_local_filesystem_summary',
    profile_exists: profileExists,
    goal_runtime_exists: runtimeExists,
    ledger_exists: ledgerExists,
    schema_count: schemaFiles.length,
    example_count: exampleFiles.length,
    validators,
    latest_ledger_goal: latestLedgerCells[0] || 'not_recorded',
    latest_ledger_result: latestLedgerCells[9] || 'not_recorded',
    blocked_red_count: blockedRedCount,
    latest_validation_id: latestValidationId,
    validation_status: validationStatus,
    readiness_claim_allowed: false,
    stop_reason: status === 'ok' ? 'none' : 'autopilot_kernel_surface_incomplete'
  };
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function collectAutopilotLoop() {
  return collectAutopilotClosedLoopSummary({ workspaceRoot: process.cwd() });
}

function collectAutopilotController() {
  return collectAutopilotControllerSummary({ workspaceRoot: process.cwd() });
}

function collectAutopilotStateStore() {
  return collectAutopilotStateStoreDraft({ workspaceRoot: process.cwd() });
}

function collectAutopilotAdapters() {
  return collectAutopilotActionAdapterContract({ workspaceRoot: process.cwd() });
}

function collectAutopilotValidation() {
  return collectAutopilotValidationPlanner({ workspaceRoot: process.cwd() });
}

function collectAutopilotReplay() {
  return collectAutopilotReplayHarness({ workspaceRoot: process.cwd() });
}

function collectAutopilotOperator() {
  return collectAutopilotOperatorConsole({ workspaceRoot: process.cwd() });
}

function collectAutopilotGreenEntry() {
  return collectAutopilotControlledGreenExecutorEntry({ workspaceRoot: process.cwd() });
}

function collectAutopilotGreenExecutor() {
  return collectAutopilotFixtureGreenExecutor({ workspaceRoot: process.cwd() });
}

function collectAutopilotGreenFileBoundary() {
  return collectAutopilotGreenFileWriteBoundary({ workspaceRoot: process.cwd() });
}

function collectAutopilotGreenFileExecutorContract() {
  return collectAutopilotGreenFileWriteExecutorContract({ workspaceRoot: process.cwd() });
}

function buildChecks(service, store, profile, runtime, audits, gate, governance, readPolicy, smartStandingAuthorizationV3, autopilotKernel, autopilotLoop, autopilotController, autopilotStateStore, autopilotAdapters, autopilotValidation, autopilotReplay, autopilotOperator, autopilotGreenEntry, autopilotGreenExecutor, autopilotGreenFileBoundary, autopilotGreenFileExecutorContract) {
  const checks = [];
  checks.push({
    source: 'service', level: service.status,
    code: 'health-reachable',
    message: service.status === 'ok'
      ? `HTTP /health responded ${service.httpStatus}`
      : `HTTP /health unreachable (${service.httpStatus || 'timeout'})`
  });
  checks.push({
    source: 'store', level: store.status,
    code: 'store-records-positive',
    message: store.status === 'ok'
      ? `${store.records} memory records in store`
      : 'No memory records found'
  });
  if (store.ageBreakdown) {
    const freshnessLevel = store.ageBreakdown.last24h > 0 ? 'ok'
      : store.ageBreakdown.last7d > 0 ? 'warn' : 'warn';
    checks.push({
      source: 'store', level: freshnessLevel,
      code: 'store-freshness',
      message: `${store.ageBreakdown.last24h} records in last 24h, ${store.ageBreakdown.last7d} in last 7d`
    });
  }
  checks.push({
    source: 'profile', level: profile.status,
    code: 'profile-ready',
    message: profile.status === 'ok'
      ? `${profile.fingerprint} fingerprint ready, ${profile.legacyChunks} legacy chunks`
      : profile.message || 'Profile not ready'
  });
  checks.push({
    source: 'runtime', level: runtime.status,
    code: 'http-log-clean',
    message: runtime.httpLogErrorCount > 0
      ? `${runtime.httpLogErrorCount} HTTP errors in log`
      : 'No HTTP errors in log'
  });
  const watchdogLevel = runtime.watchdogRecoveryCount > 20 ? 'error'
    : runtime.watchdogRecoveryCount > 5 ? 'warn' : 'ok';
  checks.push({
    source: 'runtime', level: watchdogLevel,
    code: 'watchdog-stable',
    message: runtime.watchdogRecoveryCount > 0
      ? `Watchdog recovered ${runtime.watchdogRecoveryCount} times`
      : 'Watchdog stable, no recoveries'
  });
  checks.push({
    source: 'audits', level: audits.bridge.status,
    code: 'bridge-recent',
    message: `${audits.bridge.recentCount} recent bridge entries, ${audits.bridge.acceptedCount} accepted, ${audits.bridge.rejectedCount} rejected`
  });
  checks.push({
    source: 'audits', level: audits.recall.status,
    code: 'recall-recent',
    message: `${audits.recall.recentCount} recent recall entries, ${audits.recall.scopedRecallCount} scoped`
  });
  checks.push({
    source: 'read-policy',
    level: readPolicy.status === 'ok' ? 'ok' : 'warn',
    code: 'read-policy-summary',
    message: readPolicy.status === 'ok'
      ? `lifecycle=${readPolicy.lifecyclePolicyEnabled}, hidden=${readPolicy.recentHiddenByLifecycleCount}, stale=${readPolicy.recentStaleResultCount}`
      : 'Lifecycle read-policy summary has no recent audit entries'
  });
  checks.push({
    source: 'gate', level: gate.status,
    code: 'compare-clean',
    message: gate.compare
      ? `compare ${gate.compare.matchedCases}/${gate.compare.totalCases} matched, ${gate.compare.coreMismatch} core drift`
      : 'compare unavailable'
  });
  checks.push({
    source: 'gate', level: gate.status,
    code: 'rollback-ready',
    message: gate.rollback
      ? `rollback ${gate.rollback.readyCases}/${gate.rollback.totalCases} ready, ${gate.rollback.coreMismatch} core mismatch`
      : 'rollback unavailable'
  });
  checks.push({
    source: 'governance', level: governance.status,
    code: 'governance-snapshot',
    message: governance.message
  });
  checks.push({
    source: 'governance',
    level: governance.counts.proposalCount > 0 ? 'warn' : 'ok',
    code: 'governance-proposals',
    message: governance.counts.proposalCount > 0
      ? `${governance.counts.proposalCount} proposals pending review`
      : 'No governance proposals pending review'
  });
  checks.push({
    source: 'governance',
    level: (governance.counts.stale90d > 0 || governance.counts.stale30d > 0) ? 'warn' : 'ok',
    code: 'governance-stale-active',
    message: `${governance.counts.stale30d} active records stale >30d, ${governance.counts.stale90d} stale >90d`
  });
  const autoAuthorizationLevel = governance.autoAuthorization?.allowedGovernanceOutput === 'AUTO_REUSE_CM0601_LINE_ONLY'
    ? 'ok'
    : governance.autoAuthorization?.allowedGovernanceOutput === 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW'
      ? 'warn'
      : 'warn';
  const autoAuthorizationBundleSummary = formatAutoAuthorizationBundleSummary(governance.autoAuthorization);
  const autoAuthorizationCommandSummary = formatAutoAuthorizationCommandSummary(governance.autoAuthorization);
  const autoAuthorizationPacketSummary = formatAutoAuthorizationPacketSummary(governance.autoAuthorization);
  const autoAuthorizationInputSummary = formatAutoAuthorizationInputTraceSummary(governance.autoAuthorization);
  checks.push({
    source: 'governance',
    level: autoAuthorizationLevel,
    code: 'authorized-write-path-auto-auth',
    message: governance.autoAuthorization
      ? `${governance.autoAuthorization.allowedGovernanceOutput} (${governance.autoAuthorization.currentBlockedOn || 'no-blocker'}; ${autoAuthorizationBundleSummary}; ${autoAuthorizationCommandSummary}; ${autoAuthorizationPacketSummary}; ${autoAuthorizationInputSummary})`
      : 'auto-authorization surface unavailable'
  });
  const wideningReviewLevel = governance.wideningReview?.decision === 'WIDENING_REVIEW_PASSED_PROCEED_TO_CM0607'
    ? 'ok'
    : governance.wideningReview?.decision === 'WIDENING_REVIEW_PASSED_ADOPTION_NOT_GRANTED'
      ? 'warn'
      : 'warn';
  checks.push({
    source: 'governance',
    level: wideningReviewLevel,
    code: 'authorized-write-path-widening-review',
    message: governance.wideningReview
      ? `${governance.wideningReview.decision} (${governance.wideningReview.failClosedReasons?.[0] || 'no-blocker'}; next=${governance.wideningReview.reviewRecordDraft?.nextBoundary || governance.wideningReview.nextStep || 'none'})`
      : 'widening-review surface unavailable'
  });
  const wideningAdoptionLevel = governance.wideningAdoption?.decision === 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY'
    ? 'ok'
    : governance.wideningAdoption?.decision === 'WIDENING_ADOPTION_DENIED'
      ? 'warn'
      : 'warn';
  checks.push({
    source: 'governance',
    level: wideningAdoptionLevel,
    code: 'authorized-write-path-widening-adoption',
    message: governance.wideningAdoption
      ? `${governance.wideningAdoption.decision} (${governance.wideningAdoption.failClosedReasons?.[0] || 'no-blocker'}; next=${governance.wideningAdoption.adoptionRecordDraft?.nextBoundary || governance.wideningAdoption.nextStep || 'none'}; cm0595=${governance.wideningAdoption.cm0595ApprovalLinePreview?.previewUsableNow === true ? 'ready' : 'not-ready'})`
      : 'widening-adoption surface unavailable'
  });
  const boundedRecallPreparationLevel =
    governance.boundedRecallPreparation?.decision === 'BOUNDED_RECALL_APPROVAL_PREPARED_EXACT_ONLY'
      ? 'ok'
      : governance.boundedRecallPreparation?.decision === 'BOUNDED_RECALL_APPROVAL_ABORTED_DRIFT'
        ? 'warn'
        : 'warn';
  checks.push({
    source: 'governance',
    level: boundedRecallPreparationLevel,
    code: 'authorized-write-path-bounded-recall-preparation',
    message: governance.boundedRecallPreparation
      ? `${governance.boundedRecallPreparation.decision} (${governance.boundedRecallPreparation.failClosedReasons?.[0] || 'no-blocker'}; next=${governance.boundedRecallPreparation.nextStep || 'none'}; prepared=${governance.boundedRecallPreparation.boundedRecallApprovalPrepared === true ? 'yes' : 'no'})`
      : 'bounded-recall-preparation surface unavailable'
  });
  const boundedRecallCloseoutLevel =
    governance.boundedRecallCloseout?.decision === 'BOUNDED_RECALL_CLOSEOUT_RECORDED_PREPARED_LATER_APPROVAL_ONLY'
      ? 'ok'
      : governance.boundedRecallCloseout?.decision === 'BOUNDED_RECALL_CLOSEOUT_ABORTED_DRIFT'
        ? 'warn'
        : 'warn';
  checks.push({
    source: 'governance',
    level: boundedRecallCloseoutLevel,
    code: 'authorized-write-path-bounded-recall-closeout',
    message: governance.boundedRecallCloseout
      ? `${governance.boundedRecallCloseout.decision} (${governance.boundedRecallCloseout.failClosedReasons?.[0] || 'no-blocker'}; next=${governance.boundedRecallCloseout.nextStep || 'none'}; ready=${governance.boundedRecallCloseout.boundedRecallCloseoutReady === true ? 'yes' : 'no'})`
      : 'bounded-recall-closeout surface unavailable'
  });
  checks.push({
    source: 'smart-standing-authorization-v3',
    level: smartStandingAuthorizationV3.status === 'ok' ? 'ok' : 'warn',
    code: 'v3-receipt-summary',
    message: smartStandingAuthorizationV3.status === 'ok'
      ? `${smartStandingAuthorizationV3.latest_v3_task_id} / ${smartStandingAuthorizationV3.latest_validation_id}; lane=${smartStandingAuthorizationV3.latest_lane || 'unknown'}; receipt=${smartStandingAuthorizationV3.latest_receipt_status}; redStops=${smartStandingAuthorizationV3.red_stop_count}; next=${smartStandingAuthorizationV3.next_auto_step_allowed === true}`
      : `v3 receipt summary unavailable or blocked: ${smartStandingAuthorizationV3.stop_reason || 'unknown'}`
  });
  checks.push({
    source: 'autopilot-kernel',
    level: autopilotKernel.status === 'ok' ? 'ok' : 'warn',
    code: 'autopilot-kernel-summary',
    message: autopilotKernel.status === 'ok'
      ? `profile=${autopilotKernel.profile_exists}, runtime=${autopilotKernel.goal_runtime_exists}, schemas=${autopilotKernel.schema_count}, examples=${autopilotKernel.example_count}, ledger=${autopilotKernel.latest_ledger_goal}, red=${autopilotKernel.blocked_red_count}`
      : `autopilot kernel incomplete: ${autopilotKernel.stop_reason || 'unknown'}`
  });
  const autopilotLoopCoverageComplete = isCoverageComplete(autopilotLoop.receipt_coverage)
    && isCoverageComplete(autopilotLoop.validation_coverage);
  checks.push({
    source: 'autopilot-loop',
    level: autopilotLoop.status === 'ok' && autopilotLoopCoverageComplete ? 'ok' : 'warn',
    code: 'autopilot-closed-loop-summary',
    message: autopilotLoop.status !== 'ok'
      ? `autopilot loop incomplete: ${autopilotLoop.stop_reason || 'unknown'}`
      : autopilotLoopCoverageComplete
        ? `latest=${autopilotLoop.latest_task}, next=${autopilotLoop.next_safe_task}, receipt=${autopilotLoop.receipt_coverage.covered_tasks}/${autopilotLoop.receipt_coverage.completed_tasks}, validation=${autopilotLoop.validation_coverage.covered_tasks}/${autopilotLoop.validation_coverage.completed_tasks}, red=${autopilotLoop.blocked_red_count}`
        : `coverage incomplete: latest=${autopilotLoop.latest_task}, receipt=${autopilotLoop.receipt_coverage.covered_tasks}/${autopilotLoop.receipt_coverage.completed_tasks} missing=${formatMissingTasks(autopilotLoop.receipt_coverage.missing_tasks)}, validation=${autopilotLoop.validation_coverage.covered_tasks}/${autopilotLoop.validation_coverage.completed_tasks} missing=${formatMissingTasks(autopilotLoop.validation_coverage.missing_tasks)}`
  });
  checks.push({
    source: 'autopilot-controller',
    level: autopilotController.status === 'ok' ? 'ok' : 'warn',
    code: 'autopilot-controller-readonly-noop',
    message: autopilotController.status === 'ok'
      ? `${autopilotController.controller_cycle_id}; state=${autopilotController.current_state}; next=${autopilotController.next_safe_task}; lane=${autopilotController.lane_decision.lane}; boundary=${autopilotController.execution_boundary.mode}`
      : `autopilot controller incomplete: ${autopilotController.stop_reason || 'unknown'}`
  });
  checks.push({
    source: 'autopilot-state-store',
    level: autopilotStateStore.status === 'ok' ? 'ok' : 'warn',
    code: 'autopilot-state-store-draft',
    message: autopilotStateStore.status === 'ok'
      ? `model=${autopilotStateStore.model_id}; appendOnly=${autopilotStateStore.append_only}; records=${autopilotStateStore.record_count}; types=${autopilotStateStore.record_type_count}/${autopilotStateStore.required_record_type_count}; noMigration=${autopilotStateStore.no_migration}`
      : `autopilot state store draft incomplete: ${autopilotStateStore.stop_reason || 'unknown'}`
  });
  checks.push({
    source: 'autopilot-adapters',
    level: autopilotAdapters.status === 'ok' ? 'ok' : 'warn',
    code: 'autopilot-action-adapter-contract',
    message: autopilotAdapters.status === 'ok'
      ? `contract=${autopilotAdapters.contract_id}; adapters=${autopilotAdapters.adapter_count}/${autopilotAdapters.required_adapter_count}; failClosed=${autopilotAdapters.fail_closed_fixture_count}/${autopilotAdapters.required_fail_closed_fixture_count}; executes=${autopilotAdapters.executes_adapters}`
      : `autopilot action adapter contract incomplete: ${autopilotAdapters.stop_reason || 'unknown'}`
  });
  checks.push({
    source: 'autopilot-validation',
    level: autopilotValidation.status === 'ok' ? 'ok' : 'warn',
    code: 'autopilot-validation-planner',
    message: autopilotValidation.status === 'ok'
      ? `planner=${autopilotValidation.planner_id}; cases=${autopilotValidation.validation_case_count}/${autopilotValidation.required_validation_case_count}; repairs=${autopilotValidation.repair_rule_count}/${autopilotValidation.required_repair_rule_count}; executes=${autopilotValidation.executes_validation}; appliesRepair=${autopilotValidation.applies_repair}`
      : `autopilot validation planner incomplete: ${autopilotValidation.stop_reason || 'unknown'}`
  });
  checks.push({
    source: 'autopilot-replay',
    level: autopilotReplay.status === 'ok' ? 'ok' : 'warn',
    code: 'autopilot-checkpoint-resume-replay',
    message: autopilotReplay.status === 'ok'
      ? `harness=${autopilotReplay.harness_id}; scenarios=${autopilotReplay.scenario_count}/${autopilotReplay.required_scenario_count}; failClosed=${autopilotReplay.fail_closed_scenario_count}; readOnly=${autopilotReplay.read_only}; replays=${autopilotReplay.replays_real_actions}`
      : `autopilot replay harness incomplete: ${autopilotReplay.stop_reason || 'unknown'}`
  });
  checks.push({
    source: 'autopilot-operator',
    level: autopilotOperator.status === 'ok' ? 'ok' : 'warn',
    code: 'autopilot-operator-console-eval',
    message: autopilotOperator.status === 'ok'
      ? `console=${autopilotOperator.console_id}; surfaces=${autopilotOperator.surface_count}/${autopilotOperator.required_surface_count}; evals=${autopilotOperator.eval_case_count}/${autopilotOperator.required_eval_case_count}; next=${autopilotOperator.next_safe_action}`
      : `autopilot operator console incomplete: ${autopilotOperator.stop_reason || 'unknown'}`
  });
  checks.push({
    source: 'autopilot-green-entry',
    level: autopilotGreenEntry.status === 'ok' ? 'ok' : 'warn',
    code: 'autopilot-controlled-green-entry',
    message: autopilotGreenEntry.status === 'ok'
      ? `packet=${autopilotGreenEntry.packet_id}; conditions=${autopilotGreenEntry.met_admission_condition_count}/${autopilotGreenEntry.required_admission_condition_count}; activated=${autopilotGreenEntry.executor_activated}; executes=${autopilotGreenEntry.executes_tasks}`
      : `autopilot controlled Green entry incomplete: ${autopilotGreenEntry.stop_reason || 'unknown'}`
  });
  checks.push({
    source: 'autopilot-green-executor',
    level: autopilotGreenExecutor.status === 'ok' ? 'ok' : 'warn',
    code: 'autopilot-fixture-green-executor',
    message: autopilotGreenExecutor.status === 'ok'
      ? `executor=${autopilotGreenExecutor.executor_id}; noopPlans=${autopilotGreenExecutor.noop_execution_plan_count}/${autopilotGreenExecutor.executable_task_fixture_count}; failClosed=${autopilotGreenExecutor.fail_closed_fixture_count}/${autopilotGreenExecutor.required_fail_closed_fixture_count}; activated=${autopilotGreenExecutor.executor_activated}`
      : `autopilot fixture Green executor incomplete: ${autopilotGreenExecutor.stop_reason || 'unknown'}`
  });
  checks.push({
    source: 'autopilot-green-file-boundary',
    level: autopilotGreenFileBoundary.status === 'ok' ? 'ok' : 'warn',
    code: 'autopilot-green-file-write-boundary',
    message: autopilotGreenFileBoundary.status === 'ok'
      ? `boundary=${autopilotGreenFileBoundary.boundary_decision}; design=${autopilotGreenFileBoundary.design_allowed}; implementation=${autopilotGreenFileBoundary.implementation_allowed}; activation=${autopilotGreenFileBoundary.executor_activation_allowed}`
      : `autopilot Green file-write boundary incomplete: ${autopilotGreenFileBoundary.stop_reason || 'unknown'}`
  });
  checks.push({
    source: 'autopilot-green-file-contract',
    level: autopilotGreenFileExecutorContract.status === 'ok' ? 'ok' : 'warn',
    code: 'autopilot-green-file-write-executor-contract',
    message: autopilotGreenFileExecutorContract.status === 'ok'
      ? `contract=${autopilotGreenFileExecutorContract.contract_decision}; preflight=${autopilotGreenFileExecutorContract.preflight_gate_count}; postWrite=${autopilotGreenFileExecutorContract.post_write_gate_count}; writes=${autopilotGreenFileExecutorContract.real_writes_allowed}`
      : `autopilot Green file-write executor contract incomplete: ${autopilotGreenFileExecutorContract.stop_reason || 'unknown'}`
  });
  return checks;
}

function buildOperationalSummary(service, store, profile, runtime, gate) {
  const status = classifyStatus(service.status, store.status, profile.status, runtime.status, gate.status);
  return {
    status,
    message: status === 'ok'
      ? 'Local operational checks passed; governance readiness remains separate'
      : status === 'warn'
        ? 'Local operational checks returned warnings; inspect service/store/profile/runtime/gate sections'
        : 'Local operational checks failed; inspect service/store/profile/runtime/gate sections',
    scope: 'service_store_profile_runtime_gate',
    serviceStatus: service.status,
    storeStatus: store.status,
    profileStatus: profile.status,
    runtimeStatus: runtime.status,
    gateStatus: gate.status,
    readinessClaimAllowed: false
  };
}

const READINESS_BLOCKER_SOURCES = new Set([
  'read-policy',
  'governance',
  'smart-standing-authorization-v3',
  'autopilot-kernel',
  'autopilot-loop',
  'autopilot-controller'
]);

function buildReadinessSummary(operationalSummary, governance, readPolicy, audits, smartStandingAuthorizationV3, autopilotKernel, autopilotLoop, checks) {
  const blockerChecks = checks.filter(check => check.level !== 'ok' && READINESS_BLOCKER_SOURCES.has(check.source));
  const blockerCodes = [...new Set(blockerChecks.map(check => check.code))];
  const blockerSources = [...new Set(blockerChecks.map(check => check.source))];
  const recallScope = audits?.recall || {};
  const reviewCandidate = operationalSummary.status === 'ok'
    && readPolicy.status === 'ok'
    && governance.autoAuthorization?.decision !== 'RC_NOT_READY_BLOCKED'
    && smartStandingAuthorizationV3.decision !== 'NOT_READY_BLOCKED'
    && autopilotKernel.readiness_claim_allowed === true
    && autopilotLoop.readiness_claim_allowed === true
    && blockerCodes.length === 0;
  return {
    status: reviewCandidate ? 'review_required' : 'blocked',
    decision: reviewCandidate ? 'READY_REVIEW_REQUIRED' : 'NOT_READY_BLOCKED',
    operationalStatus: operationalSummary.status,
    governanceDecision: governance.autoAuthorization?.decision || 'unknown',
    readPolicyStatus: readPolicy.status,
    readPolicyEvidenceState: readPolicy.evidenceState || 'unknown',
    readPolicyNextEvidenceAction: readPolicy.nextEvidenceAction || 'unknown',
    recallScopeStatus: recallScope.scopeStatus || 'unknown',
    recallScopeEvidenceState: recallScope.scopeEvidenceState || 'unknown',
    recallScopeNextAction: recallScope.scopeNextAction || 'unknown',
    recallScopeReadinessClaimAllowed: recallScope.scopeReadinessClaimAllowed === true,
    autopilotDecision: autopilotLoop.decision || autopilotKernel.decision || 'unknown',
    latestTask: autopilotLoop.latest_task || autopilotKernel.latest_ledger_goal || 'unknown',
    blockerCount: blockerCodes.length,
    blockerSources,
    blockerCodes,
    nextAction: buildReadinessNextAction({
      reviewCandidate,
      operationalStatus: operationalSummary.status,
      blockerSources,
      readPolicy
    }),
    governanceBlockerDetails: buildGovernanceBlockerDetails(governance, blockerCodes),
    governanceNextAction: buildGovernanceNextAction(governance, blockerCodes),
    readinessClaimAllowed: false
  };
}

function buildGovernanceNextAction(governance = {}, blockerCodes = []) {
  const blockerDetails = buildGovernanceBlockerDetails(governance, blockerCodes);
  if (blockerDetails.length > 0) return blockerDetails[0];

  const autoAuthorization = governance.autoAuthorization || {};
  if (autoAuthorization.decision === 'RC_NOT_READY_BLOCKED'
    || autoAuthorization.allowedGovernanceOutput === 'NO_AUTO_APPROVAL_ISSUED') {
    return buildGovernanceAutoAuthorizationNextAction(autoAuthorization);
  }
  return {
    status: 'none',
    source: 'governance',
    code: 'none',
    decision: 'none',
    blocker: 'none',
    stage: 'none',
    reason: 'no governance blocker selected',
    nextStepRef: 'none',
    nextStepRefs: [],
    readinessClaimAllowed: false
  };
}

function buildGovernanceBlockerDetails(governance = {}, blockerCodes = []) {
  const blockerSet = new Set(blockerCodes);
  const details = [];
  if (blockerSet.has('authorized-write-path-auto-auth')) {
    details.push(buildGovernanceAutoAuthorizationNextAction(governance.autoAuthorization || {}));
  }
  if (blockerSet.has('authorized-write-path-widening-review')) {
    details.push(buildGovernanceReviewNextAction({
      code: 'authorized-write-path-widening-review',
      decision: governance.wideningReview?.decision,
      blocker: governance.wideningReview?.failClosedReasons?.[0],
      nextStepRef: governance.wideningReview?.reviewRecordDraft?.nextBoundary || governance.wideningReview?.nextStep,
      nextStepRefs: Object.values(governance.wideningReview?.refs || {}),
      stage: 'widening_review',
      reason: 'widening review remains fail-closed',
      artifactBundleKind: governance.wideningReview?.reviewRecordDraft?.status
        || governance.wideningReview?.renderedReviewTextSurface?.reviewKind,
      primaryCommandId: 'helper_widening_review',
      primaryCommand: 'node .\\src\\cli\\authorized-write-path-widening-review.js --json',
      operatorPacketKind: governance.wideningReview?.renderedReviewTextSurface?.reviewKind
    }));
  }
  if (blockerSet.has('authorized-write-path-widening-adoption')) {
    details.push(buildGovernanceReviewNextAction({
      code: 'authorized-write-path-widening-adoption',
      decision: governance.wideningAdoption?.decision,
      blocker: governance.wideningAdoption?.failClosedReasons?.[0],
      nextStepRef: governance.wideningAdoption?.adoptionRecordDraft?.nextBoundary || governance.wideningAdoption?.nextStep,
      nextStepRefs: Object.values(governance.wideningAdoption?.refs || {}),
      stage: 'widening_adoption',
      reason: 'widening adoption remains fail-closed',
      artifactBundleKind: governance.wideningAdoption?.adoptionRecordDraft?.status
        || governance.wideningAdoption?.renderedAdoptionTextSurface?.adoptionKind,
      commandPreviewBundle: governance.wideningAdoption?.cm0595CommandPreviewBundle,
      primaryCommandId: 'helper_widening_adoption_review',
      operatorPacketKind: governance.wideningAdoption?.cm0595OperatorPacketDraft?.packetKind
    }));
  }
  if (blockerSet.has('authorized-write-path-bounded-recall-preparation')) {
    details.push(buildGovernanceReviewNextAction({
      code: 'authorized-write-path-bounded-recall-preparation',
      decision: governance.boundedRecallPreparation?.decision,
      blocker: governance.boundedRecallPreparation?.failClosedReasons?.[0],
      nextStepRef: governance.boundedRecallPreparation?.nextStep,
      nextStepRefs: Object.values(governance.boundedRecallPreparation?.refs || {}),
      stage: 'bounded_recall_preparation',
      reason: 'bounded recall preparation remains fail-closed',
      artifactBundleKind: governance.boundedRecallPreparation?.boundedRecallApprovalIssuanceRecordDraft?.draftKind
        || governance.boundedRecallPreparation?.renderedBoundedRecallTextSurface?.previewKind,
      commandPreviewBundle: governance.boundedRecallPreparation?.boundedRecallCommandPreviewBundle,
      primaryCommandId: 'helper_bounded_recall_preparation_review',
      operatorPacketKind: governance.boundedRecallPreparation?.boundedRecallOperatorPacketDraft?.status
    }));
  }
  if (blockerSet.has('authorized-write-path-bounded-recall-closeout')) {
    details.push(buildGovernanceReviewNextAction({
      code: 'authorized-write-path-bounded-recall-closeout',
      decision: governance.boundedRecallCloseout?.decision,
      blocker: governance.boundedRecallCloseout?.failClosedReasons?.[0],
      nextStepRef: governance.boundedRecallCloseout?.nextStep,
      nextStepRefs: Object.values(governance.boundedRecallCloseout?.refs || {}),
      stage: 'bounded_recall_closeout',
      reason: 'bounded recall closeout remains fail-closed',
      artifactBundleKind: governance.boundedRecallCloseout?.closeoutRecordDraft?.status
        || governance.boundedRecallCloseout?.renderedCloseoutTextSurface?.closeoutKind,
      commandPreviewBundle: governance.boundedRecallCloseout?.boundedRecallPreparationCommandPreviewBundle,
      primaryCommandId: 'helper_bounded_recall_closeout_review',
      primaryCommand: 'node .\\src\\cli\\authorized-write-path-bounded-recall-closeout-review.js --json',
      operatorPacketKind: governance.boundedRecallCloseout?.boundedRecallPreparationOperatorPacketDraft?.status
    }));
  }
  return details;
}

function buildGovernanceAutoAuthorizationNextAction(autoAuthorization = {}) {
  const commandPreviewBundle = autoAuthorization.commandPreviewBundle || {};
  const primaryCommand = commandPreviewBundle.primaryCommand || 'unknown';
  return {
    status: 'blocked',
    source: 'governance',
    code: 'authorized-write-path-auto-auth',
    decision: autoAuthorization.allowedGovernanceOutput || autoAuthorization.decision || 'unknown',
    blocker: autoAuthorization.currentBlockedOn || 'unknown',
    stage: autoAuthorization.operatorActionPlan?.currentStage || 'unknown',
    reason: autoAuthorization.operatorActionPlan?.currentStageReason || 'unknown',
    nextStepRef: autoAuthorization.operatorActionPlan?.nextStepRef
      || autoAuthorization.assertionRecordPreview?.templateRef
      || 'unknown',
    nextStepRefs: Array.isArray(autoAuthorization.operatorActionPlan?.nextStepRefs)
      ? autoAuthorization.operatorActionPlan.nextStepRefs
      : [],
    artifactBundleKind: autoAuthorization.artifactBundleDraft?.bundleKind || 'unknown',
    commandBundleKind: commandPreviewBundle.bundleKind || 'unknown',
    commandPreviewUsableNow: commandPreviewBundle.previewUsableNow === true,
    inputResolutionMode: commandPreviewBundle.resolvedAssertionRecordPathMode || 'unknown',
    requiredInputPlaceholders: extractCommandPlaceholders(commandPreviewBundle),
    primaryCommandId: commandPreviewBundle.primaryCommandId || 'unknown',
    primaryCommand,
    operatorPacketKind: autoAuthorization.operatorPacketDraft?.packetKind || 'unknown',
    readinessClaimAllowed: false
  };
}

function buildGovernanceReviewNextAction({
  code,
  decision,
  blocker,
  nextStepRef,
  nextStepRefs,
  stage,
  reason,
  artifactBundleKind,
  commandPreviewBundle,
  primaryCommandId,
  primaryCommand,
  operatorPacketKind
} = {}) {
  const hasCommandPreviewBundle = commandPreviewBundle && typeof commandPreviewBundle === 'object';
  const resolvedPrimaryCommand = hasCommandPreviewBundle
    ? primaryCommand || commandPreviewBundle.primaryCommand || 'unknown'
    : primaryCommand || 'not_applicable';
  return {
    status: 'blocked',
    source: 'governance',
    code: code || 'governance',
    decision: decision || 'unknown',
    blocker: blocker || 'unknown',
    stage: stage || 'unknown',
    reason: reason || 'governance remains fail-closed',
    nextStepRef: nextStepRef || 'unknown',
    nextStepRefs: Array.isArray(nextStepRefs) && nextStepRefs.length > 0
      ? nextStepRefs
      : nextStepRef ? [nextStepRef] : [],
    artifactBundleKind: artifactBundleKind || 'not_applicable',
    commandBundleKind: hasCommandPreviewBundle
      ? commandPreviewBundle.bundleKind || 'unknown'
      : 'not_applicable',
    commandPreviewUsableNow: hasCommandPreviewBundle
      ? commandPreviewBundle.previewUsableNow === true
      : false,
    inputResolutionMode: hasCommandPreviewBundle
      ? commandPreviewBundle.resolvedRecordPathMode
        || commandPreviewBundle.resolvedAssertionRecordPathMode
        || 'unknown'
      : 'not_applicable',
    requiredInputPlaceholders: extractCommandPlaceholders({
      ...commandPreviewBundle,
      primaryCommand: resolvedPrimaryCommand
    }),
    primaryCommandId: primaryCommandId || commandPreviewBundle?.primaryCommandId || 'not_applicable',
    primaryCommand: resolvedPrimaryCommand,
    operatorPacketKind: operatorPacketKind || 'not_applicable',
    readinessClaimAllowed: false
  };
}

function extractCommandPlaceholders(commandSurface = {}) {
  const values = [];
  if (typeof commandSurface === 'string') {
    values.push(commandSurface);
  } else if (commandSurface && typeof commandSurface === 'object') {
    for (const [key, value] of Object.entries(commandSurface)) {
      if (key.endsWith('Command') && typeof value === 'string') {
        values.push(value);
      }
    }
  }
  const placeholders = new Set();
  for (const value of values) {
    for (const match of value.matchAll(/<[^>\r\n]+>/g)) {
      placeholders.add(match[0]);
    }
  }
  return [...placeholders].sort();
}

function buildReadinessNextAction({ reviewCandidate, operationalStatus, blockerSources = [], readPolicy = {} } = {}) {
  if (reviewCandidate) return 'run_separate_completion_audit_before_any_readiness_claim';
  if (operationalStatus !== 'ok') return 'restore_operational_health_before_readiness_claim';

  const hasReadPolicyBlocker = readPolicy.status !== 'ok' || blockerSources.includes('read-policy');
  const hasGovernanceBlocker = blockerSources.includes('governance');
  if (hasReadPolicyBlocker && hasGovernanceBlocker) {
    return 'resolve_read_policy_and_governance_fail_closed_evidence_before_readiness_claim';
  }
  if (hasReadPolicyBlocker) {
    return readPolicy.nextEvidenceAction || 'collect_recent_read_policy_audit_evidence_before_readiness_claim';
  }
  if (hasGovernanceBlocker) {
    return 'resolve_governance_fail_closed_evidence_before_readiness_claim';
  }
  return 'resolve_remaining_fail_closed_evidence_before_readiness_claim';
}

function buildGoalReadiness(operationalSummary, readinessSummary, storeFreshnessWritePreflight, gitSync, gate) {
  const blockers = [];
  if (operationalSummary.status !== 'ok') blockers.push('operational_health_not_ok');
  if (gate.status !== 'ok') blockers.push('mainline_gate_not_ok');
  if (
    storeFreshnessWritePreflight?.approvalState === 'NOT_APPROVED'
    && Number(storeFreshnessWritePreflight?.proposedMemoryWrites || 0) > 0
    && Number(storeFreshnessWritePreflight?.memoryWrites || 0) === 0
  ) {
    blockers.push('store_freshness_evidence_not_written');
  }
  const governanceBlockerCount = Number(readinessSummary.governanceBlockerDetails?.length || 0);
  if (governanceBlockerCount > 0) blockers.push('governance_blockers_present');
  if (readinessSummary.readinessClaimAllowed !== true) blockers.push('readiness_claim_not_allowed');
  if (Number(gitSync.ahead || 0) > 0) blockers.push('local_commits_not_pushed_explicit_only');
  if (Number(gitSync.behind || 0) > 0) blockers.push('remote_updates_not_integrated');
  if (Number(gitSync.dirtyCount || 0) > 0) blockers.push('dirty_worktree_present');

  let nextAction = 'run_completion_audit_before_readiness_claim';
  if (blockers.includes('operational_health_not_ok') || blockers.includes('mainline_gate_not_ok')) {
    nextAction = 'restore_operational_health_before_goal_readiness_claim';
  } else if (blockers.includes('store_freshness_evidence_not_written')) {
    nextAction = 'explicitly_approve_storewask_or_continue_governance_closeout';
  } else if (blockers.includes('governance_blockers_present')) {
    nextAction = 'resolve_governance_fail_closed_evidence_before_readiness_claim';
  } else if (blockers.includes('local_commits_not_pushed_explicit_only') || blockers.includes('remote_updates_not_integrated')) {
    nextAction = 'review_git_sync_with_explicit_remote_authorization';
  }

  return {
    status: blockers.length === 0 ? 'candidate' : 'blocked',
    decision: blockers.length === 0
      ? 'LOCAL_MEMORY_MAINLINE_READY_CANDIDATE_REQUIRES_COMPLETION_AUDIT'
      : 'LOCAL_MEMORY_MAINLINE_NOT_READY',
    objective: 'codex_claude_local_memory_mainline',
    operationalStatus: operationalSummary.status,
    gateStatus: gate.status,
    readinessDecision: readinessSummary.decision,
    readinessClaimAllowed: false,
    governanceBlockerCount,
    storeFreshnessApprovalState: storeFreshnessWritePreflight?.approvalState || 'unknown',
    storeFreshnessMemoryWrites: Number(storeFreshnessWritePreflight?.memoryWrites || 0),
    storeFreshnessProposedMemoryWrites: Number(storeFreshnessWritePreflight?.proposedMemoryWrites || 0),
    gitAhead: Number(gitSync.ahead || 0),
    gitBehind: Number(gitSync.behind || 0),
    gitDirtyCount: Number(gitSync.dirtyCount || 0),
    remoteActionRequired: false,
    remoteActionsPerformed: gitSync.remoteActionsPerformed === true,
    nextAction,
    blockers
  };
}

function buildRecommendations(service, store, storeFreshnessWritePreflight, profile, runtime, audits, gate, governance, readPolicy, smartStandingAuthorizationV3, autopilotKernel, autopilotLoop, autopilotController, autopilotStateStore, autopilotAdapters, autopilotValidation, autopilotReplay, autopilotOperator, autopilotGreenEntry, autopilotGreenExecutor, autopilotGreenFileBoundary, autopilotGreenFileExecutorContract) {
  const recs = [];
  const autoAuthorizationBundleSummary = formatAutoAuthorizationBundleSummary(governance.autoAuthorization);
  const autoAuthorizationCommandSummary = formatAutoAuthorizationCommandSummary(governance.autoAuthorization);
  const autoAuthorizationPacketSummary = formatAutoAuthorizationPacketSummary(governance.autoAuthorization);
  const autoAuthorizationInputSummary = formatAutoAuthorizationInputTraceSummary(governance.autoAuthorization);
  if (service.status !== 'ok') recs.push('Service health check failed — verify HTTP MCP is running');
  if (store.status !== 'ok') recs.push('Store is empty or unreachable — check SQLite integrity');
  if (store.ageBreakdown?.last7d === 0) recs.push('No new memory written in 7 days — this may be expected during maintenance');
  else if (store.ageBreakdown?.last24h === 0) recs.push('No new memory written in 24h — run node .\\src\\cli\\store-freshness-write-preflight.js --json to prepare exact bounded write-path evidence before any approval or readiness claim');
  if (storeFreshnessWritePreflight?.operatorApprovalLineAvailable === true) {
    recs.push('Store freshness exact approval line is available as StoreWAsk — explicit user approval is still required before the one sanitized record_memory write; dashboard did not execute it');
  }
  if (profile.legacyChunks > 0) recs.push(`${profile.legacyChunks} legacy chunks present — consider running cleanup`);
  if (profile.status === 'error') recs.push('Profile not ready — run rebuild-profile to regenerate');
  if (runtime.watchdogRecoveryCount > 10) recs.push(`Watchdog recovered ${runtime.watchdogRecoveryCount} times — consider investigating root cause of service instability`);
  if (runtime.httpLogErrorCount > 0) recs.push(`${runtime.httpLogErrorCount} HTTP errors detected — review logs`);
  if (audits.bridge.recentCount === 0) recs.push('No recent bridge entries — memory may not be writing');
  if (audits.recall.recentCount === 0) recs.push('No recent recall entries — search may not be active');
  if (audits.recall.scopeStatus !== 'ok') {
    recs.push(`${audits.recall.scopeNextAction || 'Collect recent scoped recall audit evidence'}; scopeEvidenceState=${audits.recall.scopeEvidenceState || 'unknown'}, scoped=${audits.recall.scopedRecallCount ?? 'unknown'}/${audits.recall.recentCount ?? 'unknown'}`);
  }
  if (readPolicy.status !== 'ok') recs.push(`${readPolicy.nextEvidenceAction || 'Collect recent lifecycle read-policy audit evidence'}; inspected=${readPolicy.auditedEntryCount ?? 'unknown'}/${readPolicy.auditTailLimit ?? 'unknown'} recall audit entries`);
  if (smartStandingAuthorizationV3.status !== 'ok') recs.push('Smart Standing Authorization v3 receipt summary is unavailable or blocked; inspect local validation log parser input');
  if (autopilotKernel.status !== 'ok') recs.push('Autopilot governance kernel summary is incomplete; run docs validation and inspect AUTOPILOT_LEDGER');
  if (autopilotLoop.status !== 'ok') recs.push('Autopilot closed-loop summary is incomplete; run closed-loop validator and inspect local board evidence');
  else if (!isCoverageComplete(autopilotLoop.receipt_coverage) || !isCoverageComplete(autopilotLoop.validation_coverage)) {
    recs.push(`Autopilot closed-loop coverage is incomplete; receipt missing=${formatMissingTasks(autopilotLoop.receipt_coverage.missing_tasks)}, validation missing=${formatMissingTasks(autopilotLoop.validation_coverage.missing_tasks)}`);
  }
  if (autopilotController.status !== 'ok') recs.push('AutopilotController v0 summary is incomplete; run controller validator and inspect local controller surfaces');
  if (autopilotStateStore.status !== 'ok') recs.push('Autopilot structured state store draft is incomplete; run state-store validator and inspect fixture-only model');
  if (autopilotAdapters.status !== 'ok') recs.push('Autopilot action adapter contract is incomplete; run adapter validator and inspect fail-closed fixtures');
  if (autopilotValidation.status !== 'ok') recs.push('Autopilot validation planner is incomplete; run validation planner validator and inspect repair-once fixtures');
  if (autopilotReplay.status !== 'ok') recs.push('Autopilot replay harness is incomplete; run replay harness validator and inspect checkpoint/resume fixtures');
  if (autopilotOperator.status !== 'ok') recs.push('Autopilot operator console is incomplete; run operator console validator and inspect eval matrix fixtures');
  if (autopilotGreenEntry.status !== 'ok') recs.push('Autopilot controlled Green executor entry packet is incomplete; run entry packet validator and inspect admission fixture');
  if (autopilotGreenExecutor.status !== 'ok') recs.push('Autopilot fixture Green executor skeleton is incomplete; run skeleton validator and inspect no-op fixture plans');
  if (autopilotGreenFileBoundary.status !== 'ok') recs.push('Autopilot Green file-write executor boundary is incomplete; run boundary validator before any real executor design work');
  if (autopilotGreenFileExecutorContract.status !== 'ok') recs.push('Autopilot Green file-write executor contract is incomplete; run contract validator before any implementation preflight work');
  if (gate.status !== 'ok') recs.push('Mainline gate not passing — run gate:mainline for details');
  if (governance.counts.proposalCount > 0) recs.push(`${governance.counts.proposalCount} governance proposals are pending review`);
  if (governance.counts.stale90d > 0) recs.push(`${governance.counts.stale90d} active memories are stale >90d — schedule governance review`);
  else if (governance.counts.stale30d > 0) recs.push(`${governance.counts.stale30d} active memories are stale >30d — keep an eye on review backlog`);
  if (governance.counts.supersededCount > 0 || governance.counts.supersessionInitiated > 0) {
    recs.push('Supersession links are present — compact/review can stay read-only for now');
  }
  if (governance.counts.tombstonedCount > 0) recs.push('Tombstoned records are visible in governance summary — confirm retention policy remains intentional');
  if (governance.sourceStatus !== 'ok') recs.push('Governance snapshot unavailable — verify local SQLite path before relying on governance totals');
  if (governance.autoAuthorization?.allowedGovernanceOutput === 'NO_AUTO_APPROVAL_ISSUED') {
    recs.push(`Authorized write-path auto-authorization remains fail-closed — blocker: ${governance.autoAuthorization.currentBlockedOn || 'unspecified'}; ${autoAuthorizationBundleSummary}; ${autoAuthorizationCommandSummary}; ${autoAuthorizationPacketSummary}; ${autoAuthorizationInputSummary}`);
  } else if (governance.autoAuthorization?.allowedGovernanceOutput === 'AUTO_REUSE_CM0601_LINE_ONLY') {
    recs.push(`Authorized write-path governance may auto-reuse the exact CM-0601 line only; CM-0595 remains out of scope; ${autoAuthorizationBundleSummary}; ${autoAuthorizationCommandSummary}; ${autoAuthorizationPacketSummary}; ${autoAuthorizationInputSummary}`);
  } else if (governance.autoAuthorization?.allowedGovernanceOutput === 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW') {
    recs.push(`Authorized write-path governance is ready to escalate into future widening review, but not to auto-authorize CM-0595; ${autoAuthorizationBundleSummary}; ${autoAuthorizationCommandSummary}; ${autoAuthorizationPacketSummary}; ${autoAuthorizationInputSummary}`);
  }
  if (governance.wideningReview?.decision === 'WIDENING_REVIEW_NOT_READY') {
    recs.push(`Authorized write-path widening review remains fail-closed — blocker: ${governance.wideningReview.failClosedReasons?.[0] || 'unspecified'}; next=${governance.wideningReview.reviewRecordDraft?.nextBoundary || governance.wideningReview.nextStep || 'none'}`);
  } else if (governance.wideningReview?.decision === 'WIDENING_REVIEW_PASSED_ADOPTION_NOT_GRANTED') {
    recs.push('Authorized write-path widening review passed the CM-0604 gate, but adoption is still not granted; CM-0595 remains out of scope.');
  } else if (governance.wideningReview?.decision === 'WIDENING_REVIEW_PASSED_PROCEED_TO_CM0607') {
    recs.push('Authorized write-path widening review passed through CM-0604 and may proceed only to CM-0607 adoption record; CM-0595 remains out of scope.');
  }
  if (governance.wideningAdoption?.decision === 'WIDENING_ADOPTION_NOT_READY') {
    recs.push(`Authorized write-path widening adoption remains fail-closed — blocker: ${governance.wideningAdoption.failClosedReasons?.[0] || 'unspecified'}; next=${governance.wideningAdoption.adoptionRecordDraft?.nextBoundary || governance.wideningAdoption.nextStep || 'none'}`);
  } else if (governance.wideningAdoption?.decision === 'WIDENING_ADOPTION_DENIED') {
    recs.push('Authorized write-path widening adoption has been explicitly reviewed and remains not granted; CM-0595 stays out of scope.');
  } else if (governance.wideningAdoption?.decision === 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY') {
    recs.push(`Authorized write-path widening adoption has been granted only toward CM-0595; exact future line preview is ${governance.wideningAdoption.cm0595ApprovalLinePreview?.previewUsableNow === true ? 'ready' : 'not-ready'} and runtime execution still requires the later narrow boundary, not direct execution here.`);
  }
  if (governance.boundedRecallPreparation?.decision === 'BOUNDED_RECALL_APPROVAL_NOT_READY') {
    recs.push(`Authorized write-path bounded recall preparation remains fail-closed — blocker: ${governance.boundedRecallPreparation.failClosedReasons?.[0] || 'unspecified'}; next=${governance.boundedRecallPreparation.nextStep || 'none'}`);
  } else if (governance.boundedRecallPreparation?.decision === 'BOUNDED_RECALL_APPROVAL_ABORTED_DRIFT') {
    recs.push('Authorized write-path bounded recall preparation hit drift and remains blocked; do not enter bounded recall.');
  } else if (governance.boundedRecallPreparation?.decision === 'BOUNDED_RECALL_APPROVAL_PREPARED_EXACT_ONLY') {
    recs.push('Authorized write-path bounded recall preparation is governance-ready for a future exact approval only; execution remains blocked until a separate bounded-recall approval is granted.');
  }
  if (governance.boundedRecallCloseout?.decision === 'BOUNDED_RECALL_CLOSEOUT_NOT_READY') {
    recs.push(`Authorized write-path bounded recall closeout remains fail-closed — blocker: ${governance.boundedRecallCloseout.failClosedReasons?.[0] || 'unspecified'}; next=${governance.boundedRecallCloseout.nextStep || 'none'}`);
  } else if (governance.boundedRecallCloseout?.decision === 'BOUNDED_RECALL_CLOSEOUT_ABORTED_DRIFT') {
    recs.push('Authorized write-path bounded recall closeout hit drift and remains blocked; do not prepare runtime bounded recall approval.');
  } else if (governance.boundedRecallCloseout?.decision === 'BOUNDED_RECALL_CLOSEOUT_RECORDED_PREPARED_LATER_APPROVAL_ONLY') {
    recs.push('Authorized write-path bounded recall closeout is recorded as prepared-later-approval-only; the next step can only be a future exact bounded-recall runtime approval preparation, not execution.');
  }
  if (recs.length === 0) recs.push('All systems nominal');
  return recs;
}

function formatStoreFreshnessText(report) {
  if (report.store.ageBreakdown) {
    return `${report.store.ageBreakdown.last24h} in 24h, ${report.store.ageBreakdown.last7d} in 7d, ${report.store.ageBreakdown.last30d} in 30d`;
  }
  if (report.storeFreshnessWritePreflight?.store?.ageBreakdown) {
    const ageBreakdown = report.storeFreshnessWritePreflight.store.ageBreakdown;
    return `${ageBreakdown.last24h} in 24h, ${ageBreakdown.last7d} in 7d, ${ageBreakdown.last30d} in 30d`;
  }
  const freshnessCheck = (report.checks || []).find(check => check.code === 'store-freshness');
  const match = String(freshnessCheck?.message || '').match(/(\d+) records in last 24h, (\d+) in last 7d/);
  if (match) return `${match[1]} in 24h, ${match[2]} in 7d, 30d unavailable`;
  return 'unavailable';
}

function formatStoreFreshnessLevel(report) {
  const freshnessCheck = (report.checks || []).find(check => check.code === 'store-freshness');
  if (freshnessCheck?.level) return freshnessCheck.level;
  if (report.storeFreshnessWritePreflight?.store?.ageBreakdown) {
    return report.storeFreshnessWritePreflight.store.ageBreakdown.last24h > 0 ? 'ok' : 'warn';
  }
  if (report.store.ageBreakdown) return report.store.ageBreakdown.last24h > 0 ? 'ok' : 'warn';
  return 'unknown';
}

function renderText(report, options = {}) {
  const lines = [];
  const autoAuthorizationBundleSummary = formatAutoAuthorizationBundleSummary(report.governance.autoAuthorization);
  const autoAuthorizationCommandSummary = formatAutoAuthorizationCommandSummary(report.governance.autoAuthorization);
  const autoAuthorizationPacketSummary = formatAutoAuthorizationPacketSummary(report.governance.autoAuthorization);
  const autoAuthorizationInputSummary = formatAutoAuthorizationInputTraceSummary(report.governance.autoAuthorization);
  lines.push(`Memory Dashboard — ${report.generatedAt}`);
  lines.push('─'.repeat(60));
  lines.push('');
  lines.push(`Service    ${pad(report.service.status)} ${report.service.url}  ${report.service.httpStatus}  ${report.service.version}`);
  lines.push(`Store      ${pad(report.store.status)} ${report.store.records} records, ${report.store.chunks} chunks`);
  lines.push(`StoreFresh ${pad(formatStoreFreshnessLevel(report))} ${formatStoreFreshnessText(report)}`);
  lines.push(`StoreWrite ${pad(report.storeFreshnessWritePreflight.status)} ${report.storeFreshnessWritePreflight.approvalState}, proposed=${report.storeFreshnessWritePreflight.proposedMemoryWrites}, writes=${report.storeFreshnessWritePreflight.memoryWrites}, packet=${report.storeFreshnessWritePreflight.packetId}`);
  lines.push(`StoreWAsk ${report.storeFreshnessWritePreflight.operatorApprovalLine || 'none'}`);
  lines.push(`Profile    ${pad(report.profile.status)} ${report.profile.fingerprint || 'N/A'}, ${report.profile.legacyChunks} legacy`);
  lines.push(`Runtime    ${pad(report.runtime.status)} watchdog ${report.runtime.watchdogRecoveryCount} recoveries, ${report.runtime.httpLogErrorCount} HTTP errors`);
  lines.push(`GitSync    ${pad(report.gitSync.status)} ${report.gitSync.branchSummary}, dirty=${report.gitSync.dirtyCount}, remoteAction=${report.gitSync.remoteActionsPerformed === true}`);
  lines.push(`Operational ${pad(report.operationalSummary.status)} ${report.operationalSummary.message}`);
  lines.push(`GoalReady ${pad(report.goalReadiness.status)} ${report.goalReadiness.decision}, blockers=${report.goalReadiness.blockers.length}, next=${report.goalReadiness.nextAction}`);
  lines.push(`Readiness ${pad(report.readinessSummary.status)} ${report.readinessSummary.decision}, blockers=${report.readinessSummary.blockerCount}, readyClaim=${report.readinessSummary.readinessClaimAllowed === true}`);
  lines.push(`GovNext    ${report.readinessSummary.governanceNextAction?.code || 'none'} stage=${report.readinessSummary.governanceNextAction?.stage || 'none'}, next=${report.readinessSummary.governanceNextAction?.nextStepRef || 'none'}`);
  lines.push(`GovNextCmd ${report.readinessSummary.governanceNextAction?.primaryCommand || 'none'}`);
  for (const line of formatGovernanceBlockerTextLines(report.readinessSummary.governanceBlockerDetails)) {
    lines.push(line);
  }
  lines.push(`Bridge     ${pad(report.audits.bridge.status)} ${report.audits.bridge.recentCount} recent, ${report.audits.bridge.acceptedCount} accepted, ${report.audits.bridge.rejectedCount} rejected`);
  lines.push(`Recall     ${pad(report.audits.recall.status)} ${report.audits.recall.recentCount} recent, ${report.audits.recall.scopedRecallCount} scoped, ${report.audits.recall.strictScopedRecallCount} strict`);
  lines.push(`RecallScope ${pad(report.audits.recall.scopeStatus || 'unknown')} ${report.audits.recall.scopeEvidenceState || 'unknown'}, next=${report.audits.recall.scopeNextAction || 'unknown'}`);
  lines.push(`ReadPolicy ${pad(report.readPolicy.status)} lifecycle=${report.readPolicy.lifecyclePolicyEnabled}, soft=${report.readPolicy.softReadPolicyEnabled}, hidden=${report.readPolicy.recentHiddenByLifecycleCount}, stale=${report.readPolicy.recentStaleResultCount}, columns=${report.readPolicy.lifecycleColumnAvailable ?? 'unavailable'}`);
  lines.push(`Governance ${pad(report.governance.status)} ${report.governance.counts.proposalCount} proposals, ${report.governance.counts.stale90d} stale>90d, review ${report.governance.reviewLevel}, auto-auth ${report.governance.autoAuthorization?.allowedGovernanceOutput || 'unavailable'}, stage ${report.governance.autoAuthorization?.operatorActionPlan?.currentStage || 'unknown'}, bundle ${report.governance.autoAuthorization?.artifactBundleDraft?.bundleKind || 'unknown'}`);
  lines.push(`GovBundle  ${autoAuthorizationBundleSummary}`);
  lines.push(`GovCmd     ${autoAuthorizationCommandSummary}`);
  lines.push(`GovPacket  ${autoAuthorizationPacketSummary}`);
  lines.push(`GovDraft   ${report.governance.autoAuthorization?.renderedArtifactTextSurface?.selectedDraftId || 'unknown'}`);
  lines.push(`GovPktTxt  ${report.governance.autoAuthorization?.renderedOperatorPacketTextSurface?.packetKind || 'unknown'}`);
  lines.push(`GovBrief   ${report.governance.autoAuthorization?.renderedOperatorBriefTextSurface?.briefKind || 'unknown'}`);
  lines.push(`GovInput   ${autoAuthorizationInputSummary}`);
  lines.push(`GovWiden   ${report.governance.wideningReview?.decision || 'unknown'} (${report.governance.wideningReview?.status || 'unknown'})`);
  lines.push(`GovWNext   ${report.governance.wideningReview?.reviewRecordDraft?.nextBoundary || report.governance.wideningReview?.nextStep || 'none'}`);
  lines.push(`GovWText   ${report.governance.wideningReview?.renderedReviewTextSurface?.reviewKind || 'unknown'}`);
  lines.push(`GovAdopt   ${report.governance.wideningAdoption?.decision || 'unknown'} (${report.governance.wideningAdoption?.status || 'unknown'})`);
  lines.push(`GovANext   ${report.governance.wideningAdoption?.adoptionRecordDraft?.nextBoundary || report.governance.wideningAdoption?.nextStep || 'none'}`);
  lines.push(`GovAText   ${report.governance.wideningAdoption?.renderedAdoptionTextSurface?.adoptionKind || 'unknown'}`);
  lines.push(`GovACm59  ${report.governance.wideningAdoption?.cm0595ApprovalLinePreview?.previewUsableNow === true ? 'ready' : 'not-ready'} (${report.governance.wideningAdoption?.cm0595OperatorPacketDraft?.packetKind || 'unknown'})`);
  lines.push(`GovACm59I ${report.governance.wideningAdoption?.cm0595IssuanceRecordDraft?.draftUsableNow === true ? 'ready' : 'not-ready'} (${report.governance.wideningAdoption?.cm0595IssuanceRecordDraft?.draftKind || 'unknown'})`);
  lines.push(`GovACm59E ${report.governance.wideningAdoption?.cm0595ExecutionEvidenceDraft?.draftUsableNow === true ? 'ready' : 'not-ready'} (${report.governance.wideningAdoption?.cm0595ExecutionEvidenceDraft?.draftKind || 'unknown'})`);
  lines.push(`GovACm59R ${report.governance.wideningAdoption?.cm0595IssuanceRecordInputTrace?.traceAvailable === true ? report.governance.wideningAdoption.cm0595IssuanceRecordInputTrace.sourceFileName : 'none'}`);
  lines.push(`GovACm59X ${report.governance.wideningAdoption?.cm0595ExecutionEvidenceInputTrace?.traceAvailable === true ? report.governance.wideningAdoption.cm0595ExecutionEvidenceInputTrace.sourceFileName : 'none'}`);
  lines.push(`GovRecall  ${report.governance.boundedRecallPreparation?.decision || 'unknown'} (${report.governance.boundedRecallPreparation?.status || 'unknown'})`);
  lines.push(`GovRNext   ${report.governance.boundedRecallPreparation?.nextStep || 'none'}`);
  lines.push(`GovRText   ${report.governance.boundedRecallPreparation?.renderedBoundedRecallTextSurface?.previewKind || 'unknown'}`);
  lines.push(`GovRPack   ${report.governance.boundedRecallPreparation?.boundedRecallOperatorPacketDraft?.status || 'unknown'}`);
  lines.push(`GovRCmd    ${report.governance.boundedRecallPreparation?.boundedRecallCommandPreviewBundle?.bundleKind || 'unknown'} (${report.governance.boundedRecallPreparation?.boundedRecallCommandPreviewBundle?.resolvedRecordPathMode || 'unknown'})`);
  lines.push(`GovRIssue  ${report.governance.boundedRecallPreparation?.boundedRecallApprovalIssuanceRecordDraft?.draftUsableNow === true ? 'ready' : 'not-ready'} (${report.governance.boundedRecallPreparation?.boundedRecallApprovalIssuanceRecordDraft?.draftKind || 'unknown'})`);
  lines.push(`GovRExec   ${report.governance.boundedRecallPreparation?.boundedRecallExecutionEvidenceDraft?.draftUsableNow === true ? 'ready' : 'not-ready'} (${report.governance.boundedRecallPreparation?.boundedRecallExecutionEvidenceDraft?.draftKind || 'unknown'})`);
  lines.push(`GovRIss    ${report.governance.boundedRecallPreparation?.cm0595IssuanceRecordInputTrace?.traceAvailable === true ? report.governance.boundedRecallPreparation.cm0595IssuanceRecordInputTrace.sourceFileName : 'none'}`);
  lines.push(`GovREvd    ${report.governance.boundedRecallPreparation?.cm0595ExecutionEvidenceInputTrace?.traceAvailable === true ? report.governance.boundedRecallPreparation.cm0595ExecutionEvidenceInputTrace.sourceFileName : 'none'}`);
  lines.push(`GovRClose  ${report.governance.boundedRecallCloseout?.decision || 'unknown'} (${report.governance.boundedRecallCloseout?.status || 'unknown'})`);
  lines.push(`GovRCNext  ${report.governance.boundedRecallCloseout?.nextStep || 'none'}`);
  lines.push(`GovRCText  ${report.governance.boundedRecallCloseout?.renderedCloseoutTextSurface?.closeoutKind || 'unknown'}`);
  lines.push(`GovRCReady ${report.governance.boundedRecallCloseout?.boundedRecallCloseoutReady === true ? 'ready' : 'not-ready'} (${report.governance.boundedRecallCloseout?.closeoutRecordDraft?.status || 'unknown'})`);
  lines.push(`GovRCIss   ${report.governance.boundedRecallCloseout?.boundedRecallApprovalIssuanceRecordInputTrace?.traceAvailable === true ? report.governance.boundedRecallCloseout.boundedRecallApprovalIssuanceRecordInputTrace.sourceFileName : 'none'}`);
  lines.push(`GovRCEvd   ${report.governance.boundedRecallCloseout?.boundedRecallExecutionEvidenceInputTrace?.traceAvailable === true ? report.governance.boundedRecallCloseout.boundedRecallExecutionEvidenceInputTrace.sourceFileName : 'none'}`);
  lines.push(`V3Receipt  ${pad(report.smartStandingAuthorizationV3.status)} ${report.smartStandingAuthorizationV3.latest_v3_task_id} / ${report.smartStandingAuthorizationV3.latest_validation_id}, lane=${report.smartStandingAuthorizationV3.latest_lane || 'unknown'}, receipt=${report.smartStandingAuthorizationV3.latest_receipt_status}, redStops=${report.smartStandingAuthorizationV3.red_stop_count}, next=${report.smartStandingAuthorizationV3.next_auto_step_allowed === true}`);
  lines.push(`Autopilot  ${pad(report.autopilotKernel.status)} schemas=${report.autopilotKernel.schema_count}, examples=${report.autopilotKernel.example_count}, ledger=${report.autopilotKernel.latest_ledger_goal}, red=${report.autopilotKernel.blocked_red_count}, readyClaim=${report.autopilotKernel.readiness_claim_allowed === true}`);
  lines.push(`AutoLoop   ${pad(report.autopilotLoop.status)} latest=${report.autopilotLoop.latest_task}, next=${report.autopilotLoop.next_safe_task}, receipt=${report.autopilotLoop.receipt_coverage.covered_tasks}/${report.autopilotLoop.receipt_coverage.completed_tasks}, validation=${report.autopilotLoop.validation_coverage.covered_tasks}/${report.autopilotLoop.validation_coverage.completed_tasks}, readyClaim=${report.autopilotLoop.readiness_claim_allowed === true}`);
  lines.push(`AutoCtrl   ${pad(report.autopilotController.status)} cycle=${report.autopilotController.controller_cycle_id}, state=${report.autopilotController.current_state}, next=${report.autopilotController.next_safe_task}, lane=${report.autopilotController.lane_decision.lane}, readyClaim=${report.autopilotController.readiness_claim_allowed === true}`);
  lines.push(`AutoState  ${pad(report.autopilotStateStore.status)} records=${report.autopilotStateStore.record_count}, types=${report.autopilotStateStore.record_type_count}/${report.autopilotStateStore.required_record_type_count}, appendOnly=${report.autopilotStateStore.append_only}, readyClaim=${report.autopilotStateStore.readiness_claim_allowed === true}`);
  lines.push(`AutoAdapt  ${pad(report.autopilotAdapters.status)} adapters=${report.autopilotAdapters.adapter_count}/${report.autopilotAdapters.required_adapter_count}, failClosed=${report.autopilotAdapters.fail_closed_fixture_count}/${report.autopilotAdapters.required_fail_closed_fixture_count}, executes=${report.autopilotAdapters.executes_adapters}`);
  lines.push(`AutoValid  ${pad(report.autopilotValidation.status)} cases=${report.autopilotValidation.validation_case_count}/${report.autopilotValidation.required_validation_case_count}, repairs=${report.autopilotValidation.repair_rule_count}/${report.autopilotValidation.required_repair_rule_count}, executes=${report.autopilotValidation.executes_validation}, repair=${report.autopilotValidation.applies_repair}`);
  lines.push(`AutoReplay ${pad(report.autopilotReplay.status)} scenarios=${report.autopilotReplay.scenario_count}/${report.autopilotReplay.required_scenario_count}, failClosed=${report.autopilotReplay.fail_closed_scenario_count}, replays=${report.autopilotReplay.replays_real_actions}, writes=${report.autopilotReplay.writes_state}`);
  lines.push(`AutoOper   ${pad(report.autopilotOperator.status)} surfaces=${report.autopilotOperator.surface_count}/${report.autopilotOperator.required_surface_count}, evals=${report.autopilotOperator.eval_case_count}/${report.autopilotOperator.required_eval_case_count}, next=${report.autopilotOperator.next_safe_action}`);
  lines.push(`AutoGreen  ${pad(report.autopilotGreenEntry.status)} packet=${report.autopilotGreenEntry.packet_id}, conditions=${report.autopilotGreenEntry.met_admission_condition_count}/${report.autopilotGreenEntry.required_admission_condition_count}, activated=${report.autopilotGreenEntry.executor_activated}, executes=${report.autopilotGreenEntry.executes_tasks}`);
  lines.push(`AutoExec   ${pad(report.autopilotGreenExecutor.status)} executor=${report.autopilotGreenExecutor.executor_id}, noop=${report.autopilotGreenExecutor.noop_execution_plan_count}/${report.autopilotGreenExecutor.executable_task_fixture_count}, failClosed=${report.autopilotGreenExecutor.fail_closed_fixture_count}/${report.autopilotGreenExecutor.required_fail_closed_fixture_count}, writes=${report.autopilotGreenExecutor.writes_files}`);
  lines.push(`AutoWrite  ${pad(report.autopilotGreenFileBoundary.status)} boundary=${report.autopilotGreenFileBoundary.boundary_id}, design=${report.autopilotGreenFileBoundary.design_allowed}, implementation=${report.autopilotGreenFileBoundary.implementation_allowed}, activation=${report.autopilotGreenFileBoundary.executor_activation_allowed}`);
  lines.push(`AutoWCon   ${pad(report.autopilotGreenFileExecutorContract.status)} contract=${report.autopilotGreenFileExecutorContract.contract_id}, preflight=${report.autopilotGreenFileExecutorContract.preflight_gate_count}, postWrite=${report.autopilotGreenFileExecutorContract.post_write_gate_count}, realWrites=${report.autopilotGreenFileExecutorContract.real_writes_allowed}`);
  lines.push(`Gate       ${pad(report.gate.status)} compare ${report.gate.compare ? report.gate.compare.matchedCases + '/' + report.gate.compare.totalCases : 'N/A'}, rollback ${report.gate.rollback ? report.gate.rollback.readyCases + '/' + report.gate.rollback.totalCases : 'N/A'}`);
  lines.push('');
  lines.push('Checks:');
  for (const c of report.checks) {
    lines.push(`  ${pad(c.level)} ${c.code.padEnd(28)} ${c.message}`);
  }
  lines.push('');
  lines.push('Recommendations:');
  for (const r of report.recommendations) {
    lines.push(`  - ${r}`);
  }
  if (options.showRenderedOperatorArtifactText === true && report.governance.autoAuthorization?.renderedArtifactTextSurface?.selectedDraftMarkdown) {
    lines.push('');
    lines.push('[rendered-operator-artifact-text]');
    lines.push(report.governance.autoAuthorization.renderedArtifactTextSurface.selectedDraftMarkdown.trimEnd());
  }
  if (options.showRenderedOperatorPacketText === true && report.governance.autoAuthorization?.renderedOperatorPacketTextSurface?.markdown) {
    lines.push('');
    lines.push('[rendered-operator-packet-text]');
    lines.push(report.governance.autoAuthorization.renderedOperatorPacketTextSurface.markdown.trimEnd());
  }
  if (options.showRenderedOperatorBriefText === true && report.governance.autoAuthorization?.renderedOperatorBriefTextSurface?.markdown) {
    lines.push('');
    lines.push('[rendered-operator-brief-text]');
    lines.push(report.governance.autoAuthorization.renderedOperatorBriefTextSurface.markdown.trimEnd());
  }
  if (options.showRenderedWideningReviewText === true && report.governance.wideningReview?.renderedReviewTextSurface?.markdown) {
    lines.push('');
    lines.push('[rendered-widening-review-text]');
    lines.push(report.governance.wideningReview.renderedReviewTextSurface.markdown.trimEnd());
  }
  if (options.showRenderedWideningAdoptionText === true && report.governance.wideningAdoption?.renderedAdoptionTextSurface?.markdown) {
    lines.push('');
    lines.push('[rendered-widening-adoption-text]');
    lines.push(report.governance.wideningAdoption.renderedAdoptionTextSurface.markdown.trimEnd());
  }
  if (options.showRenderedBoundedRecallText === true && report.governance.boundedRecallPreparation?.renderedBoundedRecallTextSurface?.markdown) {
    lines.push('');
    lines.push('[rendered-bounded-recall-text]');
    lines.push(report.governance.boundedRecallPreparation.renderedBoundedRecallTextSurface.markdown.trimEnd());
  }
  if (options.showRenderedBoundedRecallCloseoutText === true && report.governance.boundedRecallCloseout?.renderedCloseoutTextSurface?.markdown) {
    lines.push('');
    lines.push('[rendered-bounded-recall-closeout-text]');
    lines.push(report.governance.boundedRecallCloseout.renderedCloseoutTextSurface.markdown.trimEnd());
  }
  return lines.join('\n') + '\n';
}

function pad(level) {
  const s = String(level);
  return (s + '   ').slice(0, 4);
}

function formatAutoAuthorizationBundleSummary(autoAuthorization) {
  const bundleKind = autoAuthorization?.artifactBundleDraft?.bundleKind || 'unknown';
  const nextStepRef = autoAuthorization?.operatorActionPlan?.nextStepRef || 'none';
  const draftId = autoAuthorization?.renderedArtifactTextSurface?.selectedDraftId || 'unknown';
  return `bundle=${bundleKind}, draft=${draftId}, next=${nextStepRef}`;
}

function formatAutoAuthorizationCommandSummary(autoAuthorization) {
  const commandKind = autoAuthorization?.commandPreviewBundle?.bundleKind || 'unknown';
  const primaryCommandId = autoAuthorization?.commandPreviewBundle?.primaryCommandId || 'none';
  return `cmd=${commandKind}, primary=${primaryCommandId}`;
}

function formatAutoAuthorizationPacketSummary(autoAuthorization) {
  const packetKind = autoAuthorization?.operatorPacketDraft?.packetKind || 'unknown';
  const currentStage = autoAuthorization?.operatorPacketDraft?.currentStage || 'unknown';
  return `packet=${packetKind}, stage=${currentStage}`;
}

function formatAutoAuthorizationInputTraceSummary(autoAuthorization) {
  const trace = autoAuthorization?.assertionRecordInputTrace;
  if (!trace || trace.traceAvailable !== true) {
    return 'input=default_fixture_only';
  }
  return `input=${trace.sourceFormat || 'unknown'}, file=${trace.sourceFileName || 'unknown'}, c6Accepted=${trace.assertionAcceptedForC6 === true}`;
}

function formatGovernanceBlockerTextLines(governanceBlockerDetails = []) {
  if (!Array.isArray(governanceBlockerDetails) || governanceBlockerDetails.length === 0) {
    return ['GovBlk0   none'];
  }
  return governanceBlockerDetails.map((detail, index) => {
    const missing = Array.isArray(detail.requiredInputPlaceholders) && detail.requiredInputPlaceholders.length > 0
      ? detail.requiredInputPlaceholders.join('|')
      : 'none';
    return `GovBlk${index + 1}   ${detail.code || 'unknown'} stage=${detail.stage || 'unknown'}, cmd=${detail.primaryCommandId || 'unknown'}, input=${detail.inputResolutionMode || 'unknown'}, missing=${missing}`;
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();

  const [service, store, storeFreshnessWritePreflight, profile, audits, gate] = await Promise.all([
    collectService(),
    collectStore(),
    collectStoreFreshnessWritePreflight(),
    collectProfile(),
    Promise.resolve().then(() => collectAudits()),
    collectGate()
  ]);
  const gitSync = await collectGitSync();
  const runtime = collectRuntime();
  const governance = collectGovernance(options);
  const smartStandingAuthorizationV3 = collectSmartStandingAuthorizationV3(options);
  const autopilotKernel = collectAutopilotKernel();
  const autopilotLoop = collectAutopilotLoop();
  const autopilotController = collectAutopilotController();
  const autopilotStateStore = collectAutopilotStateStore();
  const autopilotAdapters = collectAutopilotAdapters();
  const autopilotValidation = collectAutopilotValidation();
  const autopilotReplay = collectAutopilotReplay();
  const autopilotOperator = collectAutopilotOperator();
  const autopilotGreenEntry = collectAutopilotGreenEntry();
  const autopilotGreenExecutor = collectAutopilotGreenExecutor();
  const autopilotGreenFileBoundary = collectAutopilotGreenFileBoundary();
  const autopilotGreenFileExecutorContract = collectAutopilotGreenFileExecutorContract();

  const readPolicy = audits.readPolicy;
  const checks = buildChecks(service, store, profile, runtime, audits, gate, governance, readPolicy, smartStandingAuthorizationV3, autopilotKernel, autopilotLoop, autopilotController, autopilotStateStore, autopilotAdapters, autopilotValidation, autopilotReplay, autopilotOperator, autopilotGreenEntry, autopilotGreenExecutor, autopilotGreenFileBoundary, autopilotGreenFileExecutorContract);
  if (gitSync.status !== 'ok') {
    checks.push({
      source: 'git',
      level: 'warn',
      code: 'git-sync-local-ahead',
      message: `${gitSync.branchSummary}; dirty=${gitSync.dirtyCount}; remote action remains explicit-only`
    });
  }
  const recommendations = buildRecommendations(service, store, storeFreshnessWritePreflight, profile, runtime, audits, gate, governance, readPolicy, smartStandingAuthorizationV3, autopilotKernel, autopilotLoop, autopilotController, autopilotStateStore, autopilotAdapters, autopilotValidation, autopilotReplay, autopilotOperator, autopilotGreenEntry, autopilotGreenExecutor, autopilotGreenFileBoundary, autopilotGreenFileExecutorContract);
  if (gitSync.ahead > 0 || gitSync.behind > 0 || gitSync.dirtyCount > 0) {
    recommendations.push(`Local git sync needs review — branch=${gitSync.branch}, upstream=${gitSync.upstream}, ahead=${gitSync.ahead}, behind=${gitSync.behind}, dirty=${gitSync.dirtyCount}; push remains blocked without explicit authorization`);
  }
  const operationalSummary = buildOperationalSummary(service, store, profile, runtime, gate);
  const readinessSummary = buildReadinessSummary(operationalSummary, governance, readPolicy, audits, smartStandingAuthorizationV3, autopilotKernel, autopilotLoop, checks);
  const goalReadiness = buildGoalReadiness(operationalSummary, readinessSummary, storeFreshnessWritePreflight, gitSync, gate);
  if (goalReadiness.status !== 'candidate') {
    recommendations.push(`Long-term Codex/Claude local memory mainline remains ${goalReadiness.decision} — blockers=${goalReadiness.blockers.join('|') || 'none'}; next=${goalReadiness.nextAction}`);
  }
  const sectionStatus = classifyStatus(
    service.status, store.status, profile.status, runtime.status,
    audits.bridge.status, audits.recall.status, governance.status, gitSync.status, storeFreshnessWritePreflight.status, smartStandingAuthorizationV3.status, autopilotKernel.status, autopilotLoop.status, autopilotController.status, autopilotStateStore.status, autopilotAdapters.status, autopilotValidation.status, autopilotReplay.status, autopilotOperator.status, autopilotGreenEntry.status, autopilotGreenExecutor.status, autopilotGreenFileBoundary.status, autopilotGreenFileExecutorContract.status, gate.status
  );
  const checkStatus = classifyStatus(...checks.map(check => check.level));
  const status = classifyStatus(sectionStatus, checkStatus);

  const report = {
    generatedAt,
    mode: 'memory-dashboard',
    destructive: false,
    summary: {
      status,
      message: status === 'ok'
        ? 'All systems nominal'
        : status === 'warn'
          ? 'Some checks returned warnings — review checks section'
          : 'One or more critical checks failed'
    },
    operationalSummary,
    goalReadiness,
    readinessSummary,
    service,
    store: options.summaryOnly ? { status: store.status, records: store.records, chunks: store.chunks, ageBreakdown: store.ageBreakdown } : store,
    storeFreshnessWritePreflight,
    profile: options.summaryOnly ? { status: profile.status, fingerprint: profile.fingerprint } : profile,
    runtime,
    gitSync,
    audits,
    governance: options.summaryOnly
      ? {
          autoAuthorization: governance.autoAuthorization,
          boundedRecallCloseout: governance.boundedRecallCloseout,
          boundedRecallPreparation: governance.boundedRecallPreparation,
          wideningReview: governance.wideningReview,
          wideningAdoption: governance.wideningAdoption,
          status: governance.status,
          reviewLevel: governance.reviewLevel,
          counts: governance.counts
        }
      : governance,
    autopilotKernel: options.summaryOnly
      ? {
          status: autopilotKernel.status,
          decision: autopilotKernel.decision,
          evidenceClass: autopilotKernel.evidenceClass,
          schema_count: autopilotKernel.schema_count,
          example_count: autopilotKernel.example_count,
          validators: autopilotKernel.validators,
          latest_ledger_goal: autopilotKernel.latest_ledger_goal,
          latest_ledger_result: autopilotKernel.latest_ledger_result,
          blocked_red_count: autopilotKernel.blocked_red_count,
          latest_validation_id: autopilotKernel.latest_validation_id,
          validation_status: autopilotKernel.validation_status,
          readiness_claim_allowed: autopilotKernel.readiness_claim_allowed,
          stop_reason: autopilotKernel.stop_reason
        }
      : autopilotKernel,
    autopilotLoop: options.summaryOnly
      ? {
          status: autopilotLoop.status,
          decision: autopilotLoop.decision,
          evidenceClass: autopilotLoop.evidenceClass,
          latest_goal: autopilotLoop.latest_goal,
          latest_task: autopilotLoop.latest_task,
          next_safe_task: autopilotLoop.next_safe_task,
          blocked_red_count: autopilotLoop.blocked_red_count,
          receipt_coverage: autopilotLoop.receipt_coverage,
          validation_coverage: autopilotLoop.validation_coverage,
          repair_once_remaining: autopilotLoop.repair_once_remaining,
          readiness_claim_allowed: autopilotLoop.readiness_claim_allowed,
          stop_reason: autopilotLoop.stop_reason
        }
      : autopilotLoop,
    autopilotController: options.summaryOnly
      ? {
          status: autopilotController.status,
          decision: autopilotController.decision,
          evidenceClass: autopilotController.evidenceClass,
          goal_id: autopilotController.goal_id,
          controller_cycle_id: autopilotController.controller_cycle_id,
          current_state: autopilotController.current_state,
          next_safe_task: autopilotController.next_safe_task,
          lane_decision: autopilotController.lane_decision,
          execution_boundary: autopilotController.execution_boundary,
          validation_plan: autopilotController.validation_plan,
          repair_once_available: autopilotController.repair_once_available,
          receipt_requirement: autopilotController.receipt_requirement,
          checkpoint_requirement: autopilotController.checkpoint_requirement,
          stop_reason: autopilotController.stop_reason,
          red_gate_status: autopilotController.red_gate_status,
          readiness_claim_allowed: autopilotController.readiness_claim_allowed
        }
      : autopilotController,
    autopilotStateStore: options.summaryOnly
      ? {
          status: autopilotStateStore.status,
          decision: autopilotStateStore.decision,
          evidenceClass: autopilotStateStore.evidenceClass,
          model_id: autopilotStateStore.model_id,
          append_only: autopilotStateStore.append_only,
          no_migration: autopilotStateStore.no_migration,
          record_type_count: autopilotStateStore.record_type_count,
          required_record_type_count: autopilotStateStore.required_record_type_count,
          missing_record_types: autopilotStateStore.missing_record_types,
          record_count: autopilotStateStore.record_count,
          readiness_claim_allowed: autopilotStateStore.readiness_claim_allowed,
          stop_reason: autopilotStateStore.stop_reason
        }
      : autopilotStateStore,
    autopilotAdapters: options.summaryOnly
      ? {
          status: autopilotAdapters.status,
          decision: autopilotAdapters.decision,
          evidenceClass: autopilotAdapters.evidenceClass,
          contract_id: autopilotAdapters.contract_id,
          adapter_count: autopilotAdapters.adapter_count,
          required_adapter_count: autopilotAdapters.required_adapter_count,
          missing_adapters: autopilotAdapters.missing_adapters,
          complete_adapter_count: autopilotAdapters.complete_adapter_count,
          fail_closed_fixture_count: autopilotAdapters.fail_closed_fixture_count,
          required_fail_closed_fixture_count: autopilotAdapters.required_fail_closed_fixture_count,
          missing_fail_closed_fixtures: autopilotAdapters.missing_fail_closed_fixtures,
          readiness_claim_allowed: autopilotAdapters.readiness_claim_allowed,
          executes_adapters: autopilotAdapters.executes_adapters,
          stop_reason: autopilotAdapters.stop_reason
        }
      : autopilotAdapters,
    autopilotValidation: options.summaryOnly
      ? {
          status: autopilotValidation.status,
          decision: autopilotValidation.decision,
          evidenceClass: autopilotValidation.evidenceClass,
          planner_id: autopilotValidation.planner_id,
          validation_case_count: autopilotValidation.validation_case_count,
          required_validation_case_count: autopilotValidation.required_validation_case_count,
          missing_validation_cases: autopilotValidation.missing_validation_cases,
          repair_rule_count: autopilotValidation.repair_rule_count,
          required_repair_rule_count: autopilotValidation.required_repair_rule_count,
          missing_repair_rules: autopilotValidation.missing_repair_rules,
          blocked_case_count: autopilotValidation.blocked_case_count,
          executes_validation: autopilotValidation.executes_validation,
          applies_repair: autopilotValidation.applies_repair,
          repair_attempt_limit: autopilotValidation.repair_attempt_limit,
          readiness_claim_allowed: autopilotValidation.readiness_claim_allowed,
          stop_reason: autopilotValidation.stop_reason
        }
      : autopilotValidation,
    autopilotReplay: options.summaryOnly
      ? {
          status: autopilotReplay.status,
          decision: autopilotReplay.decision,
          evidenceClass: autopilotReplay.evidenceClass,
          harness_id: autopilotReplay.harness_id,
          scenario_count: autopilotReplay.scenario_count,
          required_scenario_count: autopilotReplay.required_scenario_count,
          missing_scenarios: autopilotReplay.missing_scenarios,
          fail_closed_scenario_count: autopilotReplay.fail_closed_scenario_count,
          recovery_scenario_count: autopilotReplay.recovery_scenario_count,
          required_fail_closed_reason_count: autopilotReplay.required_fail_closed_reason_count,
          missing_fail_closed_reasons: autopilotReplay.missing_fail_closed_reasons,
          read_only: autopilotReplay.read_only,
          replays_real_actions: autopilotReplay.replays_real_actions,
          writes_state: autopilotReplay.writes_state,
          resume_token_supported: autopilotReplay.resume_token_supported,
          receipt_reconciliation_supported: autopilotReplay.receipt_reconciliation_supported,
          dirty_worktree_protection_supported: autopilotReplay.dirty_worktree_protection_supported,
          readiness_claim_allowed: autopilotReplay.readiness_claim_allowed,
          stop_reason: autopilotReplay.stop_reason
        }
      : autopilotReplay,
    autopilotOperator: options.summaryOnly
      ? {
          status: autopilotOperator.status,
          decision: autopilotOperator.decision,
          evidenceClass: autopilotOperator.evidenceClass,
          console_id: autopilotOperator.console_id,
          surface_count: autopilotOperator.surface_count,
          required_surface_count: autopilotOperator.required_surface_count,
          missing_surfaces: autopilotOperator.missing_surfaces,
          eval_case_count: autopilotOperator.eval_case_count,
          required_eval_case_count: autopilotOperator.required_eval_case_count,
          missing_eval_cases: autopilotOperator.missing_eval_cases,
          rejection_eval_count: autopilotOperator.rejection_eval_count,
          next_safe_action: autopilotOperator.next_safe_action,
          red_gate_inbox_count: autopilotOperator.red_gate_inbox_count,
          coverage_gap_count: autopilotOperator.coverage_gap_count,
          controlled_green_executor_entry_conditions_count: autopilotOperator.controlled_green_executor_entry_conditions_count,
          approval_packet_template_ready: autopilotOperator.approval_packet_template_ready,
          read_only: autopilotOperator.read_only,
          executes_eval: autopilotOperator.executes_eval,
          writes_state: autopilotOperator.writes_state,
          readiness_claim_allowed: autopilotOperator.readiness_claim_allowed,
          stop_reason: autopilotOperator.stop_reason
        }
      : autopilotOperator,
    autopilotGreenEntry: options.summaryOnly
      ? {
          status: autopilotGreenEntry.status,
          decision: autopilotGreenEntry.decision,
          evidenceClass: autopilotGreenEntry.evidenceClass,
          packet_id: autopilotGreenEntry.packet_id,
          entry_decision: autopilotGreenEntry.entry_decision,
          admission_condition_count: autopilotGreenEntry.admission_condition_count,
          required_admission_condition_count: autopilotGreenEntry.required_admission_condition_count,
          met_admission_condition_count: autopilotGreenEntry.met_admission_condition_count,
          missing_admission_conditions: autopilotGreenEntry.missing_admission_conditions,
          allowed_scope_count: autopilotGreenEntry.allowed_scope_count,
          required_allowed_scope_count: autopilotGreenEntry.required_allowed_scope_count,
          missing_allowed_scope: autopilotGreenEntry.missing_allowed_scope,
          fail_closed_stop_reason_count: autopilotGreenEntry.fail_closed_stop_reason_count,
          required_stop_reason_count: autopilotGreenEntry.required_stop_reason_count,
          missing_stop_reasons: autopilotGreenEntry.missing_stop_reasons,
          next_safe_action: autopilotGreenEntry.next_safe_action,
          read_only: autopilotGreenEntry.read_only,
          executor_activated: autopilotGreenEntry.executor_activated,
          executes_tasks: autopilotGreenEntry.executes_tasks,
          writes_runtime_state: autopilotGreenEntry.writes_runtime_state,
          readiness_claim_allowed: autopilotGreenEntry.readiness_claim_allowed,
          stop_reason: autopilotGreenEntry.stop_reason
        }
      : autopilotGreenEntry,
    autopilotGreenExecutor: options.summaryOnly
      ? {
          status: autopilotGreenExecutor.status,
          decision: autopilotGreenExecutor.decision,
          evidenceClass: autopilotGreenExecutor.evidenceClass,
          executor_id: autopilotGreenExecutor.executor_id,
          skeleton_decision: autopilotGreenExecutor.skeleton_decision,
          allowed_task_kind_count: autopilotGreenExecutor.allowed_task_kind_count,
          required_task_kind_count: autopilotGreenExecutor.required_task_kind_count,
          missing_task_kinds: autopilotGreenExecutor.missing_task_kinds,
          allowed_adapter_kind_count: autopilotGreenExecutor.allowed_adapter_kind_count,
          required_adapter_kind_count: autopilotGreenExecutor.required_adapter_kind_count,
          missing_adapter_kinds: autopilotGreenExecutor.missing_adapter_kinds,
          executable_task_fixture_count: autopilotGreenExecutor.executable_task_fixture_count,
          noop_execution_plan_count: autopilotGreenExecutor.noop_execution_plan_count,
          fail_closed_fixture_count: autopilotGreenExecutor.fail_closed_fixture_count,
          required_fail_closed_fixture_count: autopilotGreenExecutor.required_fail_closed_fixture_count,
          missing_fail_closed_cases: autopilotGreenExecutor.missing_fail_closed_cases,
          fail_closed_coverage_count: autopilotGreenExecutor.fail_closed_coverage_count,
          next_safe_action: autopilotGreenExecutor.next_safe_action,
          fixture_backed: autopilotGreenExecutor.fixture_backed,
          noop_only: autopilotGreenExecutor.noop_only,
          executor_activated: autopilotGreenExecutor.executor_activated,
          executes_tasks: autopilotGreenExecutor.executes_tasks,
          writes_files: autopilotGreenExecutor.writes_files,
          writes_runtime_state: autopilotGreenExecutor.writes_runtime_state,
          readiness_claim_allowed: autopilotGreenExecutor.readiness_claim_allowed,
          stop_reason: autopilotGreenExecutor.stop_reason
        }
      : autopilotGreenExecutor,
    autopilotGreenFileBoundary: options.summaryOnly
      ? {
          status: autopilotGreenFileBoundary.status,
          decision: autopilotGreenFileBoundary.decision,
          evidenceClass: autopilotGreenFileBoundary.evidenceClass,
          boundary_id: autopilotGreenFileBoundary.boundary_id,
          boundary_decision: autopilotGreenFileBoundary.boundary_decision,
          design_allowed: autopilotGreenFileBoundary.design_allowed,
          implementation_allowed: autopilotGreenFileBoundary.implementation_allowed,
          executor_activation_allowed: autopilotGreenFileBoundary.executor_activation_allowed,
          required_design_gate_count: autopilotGreenFileBoundary.required_design_gate_count,
          missing_design_gates: autopilotGreenFileBoundary.missing_design_gates,
          allowed_path_class_count: autopilotGreenFileBoundary.allowed_path_class_count,
          missing_allowed_path_classes: autopilotGreenFileBoundary.missing_allowed_path_classes,
          hard_stop_count: autopilotGreenFileBoundary.hard_stop_count,
          missing_hard_stops: autopilotGreenFileBoundary.missing_hard_stops,
          forbidden_path_class_count: autopilotGreenFileBoundary.forbidden_path_class_count,
          next_safe_action: autopilotGreenFileBoundary.next_safe_action,
          read_only: autopilotGreenFileBoundary.read_only,
          readiness_claim_allowed: autopilotGreenFileBoundary.readiness_claim_allowed,
          writes_files: autopilotGreenFileBoundary.writes_files,
          executes_tasks: autopilotGreenFileBoundary.executes_tasks,
          stop_reason: autopilotGreenFileBoundary.stop_reason
        }
      : autopilotGreenFileBoundary,
    autopilotGreenFileExecutorContract: options.summaryOnly
      ? {
          status: autopilotGreenFileExecutorContract.status,
          decision: autopilotGreenFileExecutorContract.decision,
          evidenceClass: autopilotGreenFileExecutorContract.evidenceClass,
          contract_id: autopilotGreenFileExecutorContract.contract_id,
          contract_decision: autopilotGreenFileExecutorContract.contract_decision,
          implementation_allowed: autopilotGreenFileExecutorContract.implementation_allowed,
          executor_activation_allowed: autopilotGreenFileExecutorContract.executor_activation_allowed,
          real_writes_allowed: autopilotGreenFileExecutorContract.real_writes_allowed,
          read_only: autopilotGreenFileExecutorContract.read_only,
          readiness_claim_allowed: autopilotGreenFileExecutorContract.readiness_claim_allowed,
          execution_cycle_count: autopilotGreenFileExecutorContract.execution_cycle_count,
          missing_execution_cycle: autopilotGreenFileExecutorContract.missing_execution_cycle,
          required_task_field_count: autopilotGreenFileExecutorContract.required_task_field_count,
          missing_task_fields: autopilotGreenFileExecutorContract.missing_task_fields,
          allowed_write_operation_count: autopilotGreenFileExecutorContract.allowed_write_operation_count,
          missing_write_operations: autopilotGreenFileExecutorContract.missing_write_operations,
          preflight_gate_count: autopilotGreenFileExecutorContract.preflight_gate_count,
          missing_preflight_gates: autopilotGreenFileExecutorContract.missing_preflight_gates,
          post_write_gate_count: autopilotGreenFileExecutorContract.post_write_gate_count,
          missing_post_write_gates: autopilotGreenFileExecutorContract.missing_post_write_gates,
          fail_closed_case_count: autopilotGreenFileExecutorContract.fail_closed_case_count,
          missing_fail_closed_cases: autopilotGreenFileExecutorContract.missing_fail_closed_cases,
          next_safe_action: autopilotGreenFileExecutorContract.next_safe_action,
          writes_files: autopilotGreenFileExecutorContract.writes_files,
          executes_tasks: autopilotGreenFileExecutorContract.executes_tasks,
          stop_reason: autopilotGreenFileExecutorContract.stop_reason
        }
      : autopilotGreenFileExecutorContract,
    smartStandingAuthorizationV3: options.summaryOnly
      ? {
          status: smartStandingAuthorizationV3.status,
          decision: smartStandingAuthorizationV3.decision,
          source_surface: smartStandingAuthorizationV3.source_surface,
          latest_v3_task_id: smartStandingAuthorizationV3.latest_v3_task_id,
          latest_validation_id: smartStandingAuthorizationV3.latest_validation_id,
          latest_lane: smartStandingAuthorizationV3.latest_lane,
          latest_receipt_status: smartStandingAuthorizationV3.latest_receipt_status,
          latest_validation_result: smartStandingAuthorizationV3.latest_validation_result,
          latest_parser_status: smartStandingAuthorizationV3.latest_parser_status,
          evidenceClass: smartStandingAuthorizationV3.evidenceClass,
          budget_used: smartStandingAuthorizationV3.budget_used,
          red_stop_count: smartStandingAuthorizationV3.red_stop_count,
          next_auto_step_allowed: smartStandingAuthorizationV3.next_auto_step_allowed,
          stop_reason: smartStandingAuthorizationV3.stop_reason
        }
      : smartStandingAuthorizationV3,
    readPolicy,
    gate,
    checks: options.summaryOnly ? checks.filter(c => c.level !== 'ok') : checks,
    recommendations
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } else {
    process.stdout.write(renderText(report, options));
  }

  if (status === 'error') process.exitCode = 1;
}

main().catch(err => {
  process.stderr.write(`dashboard: ${err.message}\n`);
  process.exit(1);
});
