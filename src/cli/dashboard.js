#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

function parseArgs(argv = []) {
  const options = { json: false, summaryOnly: false, skipTests: true };
  for (let i = 0; i < argv.length; i += 1) {
    const t = argv[i];
    if (t === '--json') { options.json = true; continue; }
    if (t === '--summary-only') { options.summaryOnly = true; continue; }
    if (t === '--with-tests') { options.skipTests = false; continue; }
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
      lastRecallAt: recallEntries[0]?.timestamp || null
    }
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

function buildChecks(service, store, profile, runtime, audits, gate) {
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
    message: `${audits.recall.recentCount} recent recall entries`
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
  return checks;
}

function buildRecommendations(service, store, profile, runtime, audits, gate) {
  const recs = [];
  if (service.status !== 'ok') recs.push('Service health check failed — verify HTTP MCP is running');
  if (store.status !== 'ok') recs.push('Store is empty or unreachable — check SQLite integrity');
  if (store.ageBreakdown?.last7d === 0) recs.push('No new memory written in 7 days — this may be expected during maintenance');
  if (profile.legacyChunks > 0) recs.push(`${profile.legacyChunks} legacy chunks present — consider running cleanup`);
  if (profile.status === 'error') recs.push('Profile not ready — run rebuild-profile to regenerate');
  if (runtime.watchdogRecoveryCount > 10) recs.push(`Watchdog recovered ${runtime.watchdogRecoveryCount} times — consider investigating root cause of service instability`);
  if (runtime.httpLogErrorCount > 0) recs.push(`${runtime.httpLogErrorCount} HTTP errors detected — review logs`);
  if (audits.bridge.recentCount === 0) recs.push('No recent bridge entries — memory may not be writing');
  if (audits.recall.recentCount === 0) recs.push('No recent recall entries — search may not be active');
  if (gate.status !== 'ok') recs.push('Mainline gate not passing — run gate:mainline for details');
  if (recs.length === 0) recs.push('All systems nominal');
  return recs;
}

function renderText(report) {
  const lines = [];
  lines.push(`Memory Dashboard — ${report.generatedAt}`);
  lines.push('─'.repeat(60));
  lines.push('');
  lines.push(`Service    ${pad(report.service.status)} ${report.service.url}  ${report.service.httpStatus}  ${report.service.version}`);
  lines.push(`Store      ${pad(report.store.status)} ${report.store.records} records, ${report.store.chunks} chunks`);
  lines.push(`Profile    ${pad(report.profile.status)} ${report.profile.fingerprint || 'N/A'}, ${report.profile.legacyChunks} legacy`);
  lines.push(`Runtime    ${pad(report.runtime.status)} watchdog ${report.runtime.watchdogRecoveryCount} recoveries, ${report.runtime.httpLogErrorCount} HTTP errors`);
  lines.push(`Bridge     ${pad(report.audits.bridge.status)} ${report.audits.bridge.recentCount} recent, ${report.audits.bridge.acceptedCount} accepted, ${report.audits.bridge.rejectedCount} rejected`);
  lines.push(`Recall     ${pad(report.audits.recall.status)} ${report.audits.recall.recentCount} recent`);
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
  return lines.join('\n') + '\n';
}

function pad(level) {
  const s = String(level);
  return (s + '   ').slice(0, 4);
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

  const checks = buildChecks(service, store, profile, runtime, audits, gate);
  const recommendations = buildRecommendations(service, store, profile, runtime, audits, gate);
  const status = classifyStatus(
    service.status, store.status, profile.status, runtime.status,
    audits.bridge.status, audits.recall.status, gate.status
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
    gate,
    checks: options.summaryOnly ? checks.filter(c => c.level !== 'ok') : checks,
    recommendations
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } else {
    process.stdout.write(renderText(report));
  }

  if (status === 'error') process.exitCode = 1;
}

main().catch(err => {
  process.stderr.write(`dashboard: ${err.message}\n`);
  process.exit(1);
});
