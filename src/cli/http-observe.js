#!/usr/bin/env node
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const { createConfig } = require('../config/createConfig');
const { AuditLogStore } = require('../storage/AuditLogStore');
const { collectReport: collectGovernanceReport, buildGovernanceSurface } = require('./governance-report');

function parseArgs(argv = []) {
  const options = {
    json: false,
    healthUrl: '',
    logTail: 20,
    auditTail: 5
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--health-url') {
      options.healthUrl = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--tail') {
      options.logTail = normalizePositiveInteger(argv[index + 1], options.logTail);
      index += 1;
      continue;
    }
    if (token === '--audit-tail') {
      options.auditTail = normalizePositiveInteger(argv[index + 1], options.auditTail);
      index += 1;
    }
  }

  return options;
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveHealthUrl(config, options) {
  if (options.healthUrl) return options.healthUrl;
  return `http://${config.httpHost}:${config.httpPort}/health`;
}

async function runHealthCheck(url) {
  const startedAt = Date.now();
  try {
    const response = await fetch(url);
    const text = await response.text();
    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }

    return {
      status: response.ok && payload?.ok === true ? 'ok' : 'error',
      url,
      httpStatus: response.status,
      payload,
      error: null,
      durationMs: Date.now() - startedAt
    };
  } catch (error) {
    return {
      status: 'error',
      url,
      httpStatus: null,
      payload: null,
      error: error.message,
      durationMs: Date.now() - startedAt
    };
  }
}

async function readFileSnapshot(filePath, tailLines) {
  try {
    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content
      .split(/\r?\n/)
      .map(line => line.trimEnd())
      .filter(Boolean);
    const tail = lines.slice(-tailLines);

    return {
      exists: true,
      path: filePath,
      size: stats.size,
      lastModified: stats.mtime.toISOString(),
      lineCount: lines.length,
      tail
    };
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return {
        exists: false,
        path: filePath,
        size: 0,
        lastModified: null,
        lineCount: 0,
        tail: []
      };
    }

    return {
      exists: false,
      path: filePath,
      size: 0,
      lastModified: null,
      lineCount: 0,
      tail: [],
      error: error.message
    };
  }
}

function summarizeHttpLog(snapshot) {
  const errorCount = snapshot.tail.filter(line => /\bERROR\b/i.test(line)).length;
  const infoCount = snapshot.tail.filter(line => /\bINFO\b/i.test(line)).length;
  const listening = snapshot.tail.some(line => /HTTP MCP listening on/i.test(line));

  return {
    ...snapshot,
    errorCount,
    infoCount,
    listening,
    lastLine: snapshot.tail[snapshot.tail.length - 1] || null
  };
}

function summarizeWatchdogLog(snapshot) {
  const recoveryCount = snapshot.tail.filter(line => /service recovered:/i.test(line)).length;
  const ensureFailureCount = snapshot.tail.filter(line => /ensure failed/i.test(line)).length;
  const duplicateCount = snapshot.tail.filter(line => /duplicate instance/i.test(line)).length;

  return {
    ...snapshot,
    recoveryCount,
    ensureFailureCount,
    duplicateCount,
    lastLine: snapshot.tail[snapshot.tail.length - 1] || null
  };
}

function summarizeWriteAudit(entries = []) {
  const decisionBreakdown = {};
  let lastAcceptedAt = null;
  let lastRejectedAt = null;

  for (const entry of entries) {
    const decision = String(entry?.decision || 'unknown');
    decisionBreakdown[decision] = (decisionBreakdown[decision] || 0) + 1;
    if (decision === 'accepted' && !lastAcceptedAt) {
      lastAcceptedAt = entry.timestamp || null;
    }
    if (decision !== 'accepted' && !lastRejectedAt) {
      lastRejectedAt = entry.timestamp || null;
    }
  }

  return {
    recentCount: entries.length,
    decisionBreakdown,
    lastAcceptedAt,
    lastRejectedAt,
    recentEntries: entries.map(entry => ({
      timestamp: entry.timestamp || null,
      decision: entry.decision || 'unknown',
      target: entry.target || null,
      title: entry.title || null,
      memoryId: entry.memoryId || null
    }))
  };
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

function summarizeRecallAudit(entries = []) {
  const recallTypeBreakdown = {};
  let lastRecallAt = null;
  const scoped = {
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
    const recallType = String(entry?.recallType || 'unknown');
    recallTypeBreakdown[recallType] = (recallTypeBreakdown[recallType] || 0) + 1;
    if (!lastRecallAt) {
      lastRecallAt = entry.timestamp || null;
    }

    if (!entry?.scopeApplied) {
      continue;
    }

    scoped.scopedRecallCount += 1;
    scoped.latestScopedHitAt = pickLaterTimestamp(scoped.latestScopedHitAt, entry.timestamp || null);
    if (entry.scopeStrict) {
      scoped.strictScopedRecallCount += 1;
    }
    incrementBreakdown(scoped.scopeModeBreakdown, typeof entry.scopeMode === 'string' ? entry.scopeMode : 'unknown');
    for (const dimension of Array.isArray(entry.scopeDimensions) ? entry.scopeDimensions : []) {
      incrementBreakdown(scoped.scopeDimensionBreakdown, typeof dimension === 'string' ? dimension : null);
    }
    incrementBreakdown(scoped.projectBreakdown, typeof entry.scopeProjectId === 'string' ? entry.scopeProjectId : null);
    incrementBreakdown(scoped.clientBreakdown, typeof entry.scopeClientId === 'string' ? entry.scopeClientId : null);
    for (const visibility of Array.isArray(entry.scopeVisibility) ? entry.scopeVisibility : []) {
      incrementBreakdown(scoped.visibilityBreakdown, typeof visibility === 'string' ? visibility : null);
    }
  }

  return {
    recentCount: entries.length,
    recallTypeBreakdown,
    lastRecallAt,
    ...scoped,
    recentEntries: entries.map(entry => ({
      timestamp: entry.timestamp || null,
      target: entry.target || null,
      recallType: entry.recallType || 'unknown',
      resultCount: entry.resultCount ?? null,
      topMemoryId: entry.topMemoryId || null,
      topSourceFile: entry.topSourceFile || null
    }))
  };
}

function collectGovernance() {
  const report = collectGovernanceReport();
  return {
    ...buildGovernanceSurface(report, { tolerateUnavailable: true }),
    sourceStatus: report.error ? 'unavailable' : 'ok',
    paths: report.paths || {}
  };
}

function buildSummary({ health, httpLog, watchdogLog, writeAudit, recallAudit, governance }) {
  const hints = [];
  let status = 'ok';

  if (health.status !== 'ok') {
    status = 'error';
    hints.push('HTTP /health 未通过，先运行 `npm run start:http:ensure`。');
  }

  if (watchdogLog.ensureFailureCount > 0 || httpLog.errorCount > 0) {
    if (status === 'ok') {
      status = 'warn';
    }
    hints.push('最近日志里出现了 HTTP / watchdog 异常行，建议先看 `codex-memory-http.log` 和 `codex-memory-http-watchdog.log`。');
  }

  if (watchdogLog.recoveryCount > 0) {
    if (status === 'ok') {
      status = 'warn';
    }
    hints.push('watchdog 最近做过恢复，说明服务曾经掉过一次。');
  }

  if (writeAudit.recentCount === 0) {
    hints.push('最近没有 bridge audit 写入，若你在排查写记忆问题，优先核对 `record_memory` 调用链。');
  }

  if (recallAudit.recentCount === 0) {
    hints.push('最近没有 recall audit，若你在排查召回问题，优先核对 `search_memory` 或被动召回入口。');
  }

  if (governance.counts.proposalCount > 0) {
    if (status === 'ok') {
      status = 'warn';
    }
    hints.push(`${governance.counts.proposalCount} 条 proposal 仍待审查，治理层面建议跟进 review。`);
  }

  if (governance.counts.stale90d > 0) {
    if (status === 'ok') {
      status = 'warn';
    }
    hints.push(`${governance.counts.stale90d} 条 active memory 超过 90 天未更新，建议安排治理复核。`);
  } else if (governance.counts.stale30d > 0) {
    if (status === 'ok') {
      status = 'warn';
    }
    hints.push(`${governance.counts.stale30d} 条 active memory 超过 30 天未更新，可纳入常规治理观察。`);
  }

  if (governance.counts.tombstonedCount > 0 || governance.counts.supersededCount > 0 || governance.counts.supersessionInitiated > 0) {
    hints.push('治理快照里存在 tombstone/supersession 留痕，可继续保持只读跟踪。');
  }

  if (hints.length === 0) {
    hints.push('运行态没有看到明显异常信号。');
  }

  const message = status === 'ok'
    ? 'HTTP MCP runtime looks healthy.'
    : status === 'warn'
      ? 'HTTP MCP runtime is healthy but recent logs show recoverable anomalies.'
      : 'HTTP MCP runtime is unhealthy.';

  return {
    status,
    message,
    healthStatus: health.status,
    httpLogErrorCount: httpLog.errorCount,
    watchdogRecoveryCount: watchdogLog.recoveryCount,
    watchdogEnsureFailureCount: watchdogLog.ensureFailureCount,
    bridgeRecentCount: writeAudit.recentCount,
    recallRecentCount: recallAudit.recentCount,
    scopedRecallCount: recallAudit.scopedRecallCount,
    strictScopedRecallCount: recallAudit.strictScopedRecallCount,
    governanceStatus: governance.status,
    governanceReviewLevel: governance.reviewLevel,
    governanceProposalCount: governance.counts.proposalCount,
    governanceStale30d: governance.counts.stale30d,
    governanceStale90d: governance.counts.stale90d,
    hints
  };
}

function formatTextReport(report) {
  const lines = [
    `status: ${report.summary.status}`,
    report.summary.message,
    `health: ${report.health.status} (${report.health.httpStatus ?? 'n/a'})`,
    `healthUrl: ${report.health.url}`,
    ''
  ];

  lines.push('[http-log]');
  lines.push(`  path: ${report.logs.http.path}`);
  lines.push(`  exists: ${report.logs.http.exists}`);
  lines.push(`  lastModified: ${report.logs.http.lastModified || 'n/a'}`);
  lines.push(`  errorCount: ${report.logs.http.errorCount}`);
  lines.push(`  lastLine: ${report.logs.http.lastLine || 'n/a'}`);
  lines.push('');

  lines.push('[watchdog-log]');
  lines.push(`  path: ${report.logs.watchdog.path}`);
  lines.push(`  exists: ${report.logs.watchdog.exists}`);
  lines.push(`  lastModified: ${report.logs.watchdog.lastModified || 'n/a'}`);
  lines.push(`  recoveryCount: ${report.logs.watchdog.recoveryCount}`);
  lines.push(`  ensureFailureCount: ${report.logs.watchdog.ensureFailureCount}`);
  lines.push(`  lastLine: ${report.logs.watchdog.lastLine || 'n/a'}`);
  lines.push('');

  lines.push('[bridge-audit]');
  lines.push(`  path: ${report.audits.write.path}`);
  lines.push(`  exists: ${report.audits.write.exists}`);
  lines.push(`  lastModified: ${report.audits.write.lastModified || 'n/a'}`);
  lines.push(`  recentCount: ${report.audits.write.recentCount}`);
  lines.push(`  lastAcceptedAt: ${report.audits.write.lastAcceptedAt || 'n/a'}`);
  lines.push(`  decisionBreakdown: ${JSON.stringify(report.audits.write.decisionBreakdown)}`);
  lines.push('');

  lines.push('[recall-audit]');
  lines.push(`  path: ${report.audits.recall.path}`);
  lines.push(`  exists: ${report.audits.recall.exists}`);
  lines.push(`  lastModified: ${report.audits.recall.lastModified || 'n/a'}`);
  lines.push(`  recentCount: ${report.audits.recall.recentCount}`);
  lines.push(`  lastRecallAt: ${report.audits.recall.lastRecallAt || 'n/a'}`);
  lines.push(`  scopedRecallCount: ${report.audits.recall.scopedRecallCount}`);
  lines.push(`  strictScopedRecallCount: ${report.audits.recall.strictScopedRecallCount}`);
  lines.push(`  recallTypeBreakdown: ${JSON.stringify(report.audits.recall.recallTypeBreakdown)}`);
  lines.push(`  scopeModeBreakdown: ${JSON.stringify(report.audits.recall.scopeModeBreakdown)}`);
  lines.push(`  scopeDimensionBreakdown: ${JSON.stringify(report.audits.recall.scopeDimensionBreakdown)}`);
  lines.push('');

  lines.push('[governance]');
  lines.push(`  status: ${report.governance.status}`);
  lines.push(`  reviewLevel: ${report.governance.reviewLevel}`);
  lines.push(`  sourceStatus: ${report.governance.sourceStatus}`);
  lines.push(`  proposals: ${report.governance.counts.proposalCount}`);
  lines.push(`  stale30d: ${report.governance.counts.stale30d}`);
  lines.push(`  stale90d: ${report.governance.counts.stale90d}`);
  lines.push(`  tombstoned: ${report.governance.counts.tombstonedCount}`);
  lines.push(`  superseded: ${report.governance.counts.supersededCount}`);
  lines.push(`  hints: ${JSON.stringify(report.governance.hints)}`);
  lines.push('');

  lines.push('[hints]');
  for (const hint of report.summary.hints) {
    lines.push(`  - ${hint}`);
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const config = createConfig();
  const auditLogStore = new AuditLogStore(config);

  const health = await runHealthCheck(resolveHealthUrl(config, options));
  const [httpSnapshot, watchdogSnapshot, writeStats, recallStats, writeEntries, recallEntries] = await Promise.all([
    readFileSnapshot(config.httpLogPath, options.logTail),
    readFileSnapshot(path.join(config.logsDir, 'codex-memory-http-watchdog.log'), options.logTail),
    readFileSnapshot(config.auditLogPath, 1),
    readFileSnapshot(config.recallLogPath, 1),
    auditLogStore.readRecentWriteAudit(options.auditTail),
    auditLogStore.readRecentRecallAudit(options.auditTail)
  ]);

  const httpLog = summarizeHttpLog(httpSnapshot);
  const watchdogLog = summarizeWatchdogLog(watchdogSnapshot);
  const writeAudit = {
    path: config.auditLogPath,
    exists: writeStats.exists,
    size: writeStats.size,
    lastModified: writeStats.lastModified,
    ...summarizeWriteAudit(writeEntries)
  };
  const recallAudit = {
    path: config.recallLogPath,
    exists: recallStats.exists,
    size: recallStats.size,
    lastModified: recallStats.lastModified,
    ...summarizeRecallAudit(recallEntries)
  };
  const governance = collectGovernance();

  const summary = buildSummary({
    health,
    httpLog,
    watchdogLog,
    writeAudit,
    recallAudit,
    governance
  });

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    health,
    config: {
      httpHost: config.httpHost,
      httpPort: config.httpPort,
      httpMcpPath: config.httpMcpPath,
      logsDir: config.logsDir
    },
    logs: {
      http: httpLog,
      watchdog: watchdogLog
    },
    governance,
    audits: {
      write: writeAudit,
      recall: recallAudit
    }
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(formatTextReport(report));
  }

  if (summary.status === 'error') {
    process.exitCode = 1;
  }
}

main().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
