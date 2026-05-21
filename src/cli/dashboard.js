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

  return summary;
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
      recallEntries
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
      latest_receipt_status: 'not_recorded_in_validation_log',
      latest_validation_result: 'not_recorded_in_validation_log',
      red_stop_count: 0,
      next_auto_step_allowed: false,
      stop_reason: `receipt_parse_unavailable:${error.code || 'read_failed'}`,
      error: error.message
    };
  }
}

function buildChecks(service, store, profile, runtime, audits, gate, governance, readPolicy, smartStandingAuthorizationV3) {
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
      ? `${smartStandingAuthorizationV3.latest_v3_task_id} / ${smartStandingAuthorizationV3.latest_validation_id}; receipt=${smartStandingAuthorizationV3.latest_receipt_status}; redStops=${smartStandingAuthorizationV3.red_stop_count}; next=${smartStandingAuthorizationV3.next_auto_step_allowed === true}`
      : `v3 receipt summary unavailable or blocked: ${smartStandingAuthorizationV3.stop_reason || 'unknown'}`
  });
  return checks;
}

function buildRecommendations(service, store, profile, runtime, audits, gate, governance, readPolicy, smartStandingAuthorizationV3) {
  const recs = [];
  const autoAuthorizationBundleSummary = formatAutoAuthorizationBundleSummary(governance.autoAuthorization);
  const autoAuthorizationCommandSummary = formatAutoAuthorizationCommandSummary(governance.autoAuthorization);
  const autoAuthorizationPacketSummary = formatAutoAuthorizationPacketSummary(governance.autoAuthorization);
  const autoAuthorizationInputSummary = formatAutoAuthorizationInputTraceSummary(governance.autoAuthorization);
  if (service.status !== 'ok') recs.push('Service health check failed — verify HTTP MCP is running');
  if (store.status !== 'ok') recs.push('Store is empty or unreachable — check SQLite integrity');
  if (store.ageBreakdown?.last7d === 0) recs.push('No new memory written in 7 days — this may be expected during maintenance');
  if (profile.legacyChunks > 0) recs.push(`${profile.legacyChunks} legacy chunks present — consider running cleanup`);
  if (profile.status === 'error') recs.push('Profile not ready — run rebuild-profile to regenerate');
  if (runtime.watchdogRecoveryCount > 10) recs.push(`Watchdog recovered ${runtime.watchdogRecoveryCount} times — consider investigating root cause of service instability`);
  if (runtime.httpLogErrorCount > 0) recs.push(`${runtime.httpLogErrorCount} HTTP errors detected — review logs`);
  if (audits.bridge.recentCount === 0) recs.push('No recent bridge entries — memory may not be writing');
  if (audits.recall.recentCount === 0) recs.push('No recent recall entries — search may not be active');
  if (audits.recall.recentCount > 0 && audits.recall.scopedRecallCount === 0) recs.push('Recent recall activity is present, but none of it used scope filtering');
  if (readPolicy.status !== 'ok') recs.push('No recent lifecycle read-policy audit summary is available yet');
  if (smartStandingAuthorizationV3.status !== 'ok') recs.push('Smart Standing Authorization v3 receipt summary is unavailable or blocked; inspect local validation log parser input');
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
  lines.push(`Profile    ${pad(report.profile.status)} ${report.profile.fingerprint || 'N/A'}, ${report.profile.legacyChunks} legacy`);
  lines.push(`Runtime    ${pad(report.runtime.status)} watchdog ${report.runtime.watchdogRecoveryCount} recoveries, ${report.runtime.httpLogErrorCount} HTTP errors`);
  lines.push(`Bridge     ${pad(report.audits.bridge.status)} ${report.audits.bridge.recentCount} recent, ${report.audits.bridge.acceptedCount} accepted, ${report.audits.bridge.rejectedCount} rejected`);
  lines.push(`Recall     ${pad(report.audits.recall.status)} ${report.audits.recall.recentCount} recent, ${report.audits.recall.scopedRecallCount} scoped, ${report.audits.recall.strictScopedRecallCount} strict`);
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
  lines.push(`V3Receipt  ${pad(report.smartStandingAuthorizationV3.status)} ${report.smartStandingAuthorizationV3.latest_v3_task_id} / ${report.smartStandingAuthorizationV3.latest_validation_id}, receipt=${report.smartStandingAuthorizationV3.latest_receipt_status}, redStops=${report.smartStandingAuthorizationV3.red_stop_count}, next=${report.smartStandingAuthorizationV3.next_auto_step_allowed === true}`);
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

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();

  const [service, store, profile, audits, gate] = await Promise.all([
    collectService(),
    collectStore(),
    collectProfile(),
    Promise.resolve().then(() => collectAudits()),
    collectGate()
  ]);
  const runtime = collectRuntime();
  const governance = collectGovernance(options);
  const smartStandingAuthorizationV3 = collectSmartStandingAuthorizationV3(options);

  const readPolicy = audits.readPolicy;
  const checks = buildChecks(service, store, profile, runtime, audits, gate, governance, readPolicy, smartStandingAuthorizationV3);
  const recommendations = buildRecommendations(service, store, profile, runtime, audits, gate, governance, readPolicy, smartStandingAuthorizationV3);
  const status = classifyStatus(
    service.status, store.status, profile.status, runtime.status,
    audits.bridge.status, audits.recall.status, governance.status, smartStandingAuthorizationV3.status, gate.status
  );

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
    service,
    store: options.summaryOnly ? { status: store.status, records: store.records, chunks: store.chunks } : store,
    profile: options.summaryOnly ? { status: profile.status, fingerprint: profile.fingerprint } : profile,
    runtime,
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
    smartStandingAuthorizationV3: options.summaryOnly
      ? {
          status: smartStandingAuthorizationV3.status,
          decision: smartStandingAuthorizationV3.decision,
          source_surface: smartStandingAuthorizationV3.source_surface,
          latest_v3_task_id: smartStandingAuthorizationV3.latest_v3_task_id,
          latest_validation_id: smartStandingAuthorizationV3.latest_validation_id,
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
