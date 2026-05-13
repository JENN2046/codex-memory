#!/usr/bin/env node
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const { createConfig } = require('../config/createConfig');

function parseArgs(argv = []) {
  const options = { json: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--json') { options.json = true; continue; }
  }
  return options;
}

function getDbPath() {
  return createConfig().dbPath;
}

function runQuery(db, sql, params = []) {
  try { return db.prepare(sql).all(...params); }
  catch { return []; }
}

function runQueryOne(db, sql, params = []) {
  try { return db.prepare(sql).get(...params); }
  catch { return null; }
}

function normalizeBucketKey(value) {
  if (value === null || value === undefined) return '(unset)';
  const text = String(value).trim();
  return text || '(unset)';
}

function toDistribution(rows = [], keyField = 'key') {
  return Object.fromEntries(rows.map(row => [normalizeBucketKey(row?.[keyField]), row?.cnt || 0]));
}

function buildGovernanceSurface(report, options = {}) {
  const tolerateUnavailable = options.tolerateUnavailable !== false;
  if (!report || report.error) {
    return {
      status: tolerateUnavailable ? 'warn' : 'error',
      reviewLevel: 'unavailable',
      message: report?.summary?.message || report?.error || 'Governance snapshot unavailable.',
      counts: {
        totalRecords: 0,
        proposalCount: 0,
        tombstonedCount: 0,
        supersededCount: 0,
        supersessionInitiated: 0,
        stale30d: 0,
        stale90d: 0
      },
      statusDistribution: {},
      retention: {},
      hints: [
        '治理快照暂不可用，先核对 SQLite 路径与本地数据目录。'
      ]
    };
  }

  const counts = {
    totalRecords: report.summary?.totalRecords || 0,
    proposalCount: report.summary?.proposalCount || 0,
    tombstonedCount: report.summary?.tombstonedCount || 0,
    supersededCount: report.summary?.supersededCount || 0,
    supersessionInitiated: report.supersession?.supersessionInitiated || 0,
    stale30d: report.summary?.stale30d || 0,
    stale90d: report.summary?.stale90d || 0
  };
  const hints = [];
  let status = 'ok';
  let reviewLevel = 'nominal';

  if (counts.proposalCount > 0) {
    status = 'warn';
    reviewLevel = 'needs-review';
    hints.push(`${counts.proposalCount} 条 proposal 仍待人工审查。`);
  }

  if (counts.stale90d > 0) {
    status = 'warn';
    reviewLevel = 'needs-review';
    hints.push(`${counts.stale90d} 条 active memory 超过 90 天未更新，建议优先做治理复核。`);
  } else if (counts.stale30d > 0) {
    if (reviewLevel === 'nominal') {
      reviewLevel = 'observe';
    }
    status = 'warn';
    hints.push(`${counts.stale30d} 条 active memory 超过 30 天未更新，可安排例行复核。`);
  }

  if (counts.tombstonedCount > 0) {
    if (reviewLevel === 'nominal') {
      reviewLevel = 'observe';
    }
    hints.push(`${counts.tombstonedCount} 条 tombstoned 记录仍保留审计留痕。`);
  }

  if (counts.supersededCount > 0 || counts.supersessionInitiated > 0) {
    if (reviewLevel === 'nominal') {
      reviewLevel = 'observe';
    }
    hints.push(
      `${counts.supersededCount} 条 superseded 记录、${counts.supersessionInitiated} 条 supersession 链接可用于后续 compact/review。`
    );
  }

  if (hints.length === 0) {
    hints.push('治理快照未见待处理信号。');
  }

  const message = status === 'ok'
    ? 'Governance snapshot looks steady.'
    : reviewLevel === 'needs-review'
      ? 'Governance snapshot shows review-needed signals.'
      : 'Governance snapshot shows low-risk follow-up signals.';

  return {
    status,
    reviewLevel,
    message,
    counts,
    statusDistribution: report.statusDistribution || {},
    retention: report.retention || {},
    hints
  };
}

function attachReviewSurface(report, options = {}) {
  return {
    ...report,
    review: buildGovernanceSurface(report, {
      tolerateUnavailable: options.tolerateUnavailable
    })
  };
}

function collectReport() {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    return attachReviewSurface({
      mode: 'governance-report',
      destructive: false,
      summary: {
        status: 'error',
        message: `Database not found: ${dbPath}`
      },
      error: 'Database not found: ' + dbPath,
      paths: {
        dbPath
      }
    }, { tolerateUnavailable: false });
  }
  const db = new DatabaseSync(dbPath, { readOnly: true });
  const tableExists = runQueryOne(
    db,
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'memory_records'"
  );
  if (!tableExists) {
    db.close();
    return attachReviewSurface({
      mode: 'governance-report',
      destructive: false,
      summary: {
        status: 'error',
        message: `memory_records table not found: ${dbPath}`
      },
      error: `memory_records table not found: ${dbPath}`,
      paths: {
        dbPath
      }
    }, { tolerateUnavailable: false });
  }

  // Status distribution
  const statusDist = runQuery(db,
    'SELECT status, COUNT(*) as cnt FROM memory_records GROUP BY status ORDER BY cnt DESC');

  // Scope coverage
  const projectDist = runQuery(db,
    'SELECT project_id, COUNT(*) as cnt FROM memory_records GROUP BY project_id ORDER BY cnt DESC');
  const visibilityDist = runQuery(db,
    'SELECT visibility, COUNT(*) as cnt FROM memory_records GROUP BY visibility ORDER BY cnt DESC');
  const clientDist = runQuery(db,
    'SELECT client_id, COUNT(*) as cnt FROM memory_records GROUP BY client_id ORDER BY cnt DESC');

  // Confidence distribution (bucketed)
  const confHigh = runQueryOne(db,
    'SELECT COUNT(*) as cnt FROM memory_records WHERE confidence >= 0.8')?.cnt || 0;
  const confMed = runQueryOne(db,
    'SELECT COUNT(*) as cnt FROM memory_records WHERE confidence >= 0.4 AND confidence < 0.8')?.cnt || 0;
  const confLow = runQueryOne(db,
    'SELECT COUNT(*) as cnt FROM memory_records WHERE confidence < 0.4')?.cnt || 0;
  const totalRecords = runQueryOne(db,
    'SELECT COUNT(*) as cnt FROM memory_records')?.cnt || 0;

  // Stale indicators
  const now = new Date();
  const stale30d = runQueryOne(db,
    "SELECT COUNT(*) as cnt FROM memory_records WHERE updated_at < ? AND status = 'active'",
    [new Date(now - 30 * 86400000).toISOString()])?.cnt || 0;
  const stale90d = runQueryOne(db,
    "SELECT COUNT(*) as cnt FROM memory_records WHERE updated_at < ? AND status = 'active'",
    [new Date(now - 90 * 86400000).toISOString()])?.cnt || 0;

  // Supersession chains
  const supersededCount = runQueryOne(db,
    "SELECT COUNT(*) as cnt FROM memory_records WHERE superseded_by IS NOT NULL")?.cnt || 0;
  const supersessionInitiated = runQueryOne(db,
    "SELECT COUNT(*) as cnt FROM memory_records WHERE supersedes IS NOT NULL")?.cnt || 0;

  // Tombstone records
  const tombstonedCount = runQueryOne(db,
    "SELECT COUNT(*) as cnt FROM memory_records WHERE status = 'tombstoned'")?.cnt || 0;

  // Proposal records
  const proposalCount = runQueryOne(db,
    "SELECT COUNT(*) as cnt FROM memory_records WHERE status = 'proposal'")?.cnt || 0;

  // Scope coverage (NULL vs filled)
  const scopeNullCount = runQueryOne(db,
    "SELECT COUNT(*) as cnt FROM memory_records WHERE project_id = '' OR project_id IS NULL")?.cnt || 0;
  const scopeFilledCount = totalRecords - scopeNullCount;

  // Unscoped records (no task_id)
  const taskScopedCount = runQueryOne(db,
    "SELECT COUNT(*) as cnt FROM memory_records WHERE task_id IS NOT NULL AND task_id != ''")?.cnt || 0;

  // Retention policy distribution
  const retentionDist = runQuery(db,
    'SELECT retention_policy, COUNT(*) as cnt FROM memory_records GROUP BY retention_policy ORDER BY cnt DESC');

  db.close();

  const report = {
    mode: 'governance-report',
    destructive: false,
    generatedAt: new Date().toISOString(),
    summary: {
      status: 'ok',
      message: 'Read-only governance snapshot generated.',
      totalRecords,
      proposalCount,
      tombstonedCount,
      supersededCount,
      stale30d,
      stale90d
    },
    paths: {
      dbPath
    },
    totalRecords,
    statusDistribution: toDistribution(statusDist, 'status'),
    scopeCoverage: {
      project: toDistribution(projectDist, 'project_id'),
      visibility: toDistribution(visibilityDist, 'visibility'),
      client: toDistribution(clientDist, 'client_id'),
      scopeFilledRecords: scopeFilledCount,
      scopeNullRecords: scopeNullCount,
      taskScopedRecords: taskScopedCount
    },
    confidence: {
      high: confHigh,
      medium: confMed,
      low: confLow
    },
    staleness: {
      activeNotUpdated30d: stale30d,
      activeNotUpdated90d: stale90d
    },
    supersession: {
      supersededRecords: supersededCount,
      supersessionInitiated: supersessionInitiated
    },
    tombstoned: tombstonedCount,
    proposals: proposalCount,
    retention: Object.fromEntries(retentionDist.map(r => [r.retention_policy, r.cnt]))
  };

  return attachReviewSurface(report, { tolerateUnavailable: false });
}

function renderText(report) {
  if (report.error) return 'Error: ' + report.error + '\n';
  const l = [];
  l.push(`Governance Report — ${report.generatedAt}`);
  l.push('─'.repeat(50));
  l.push('');
  l.push(`Status: ${report.summary.status}`);
  l.push(report.summary.message);
  l.push('');
  l.push('Review:');
  l.push(`  status:      ${report.review.status}`);
  l.push(`  level:       ${report.review.reviewLevel}`);
  l.push(`  message:     ${report.review.message}`);
  for (const hint of report.review.hints || []) {
    l.push(`  hint:        ${hint}`);
  }
  l.push('');
  l.push(`Total Records: ${report.totalRecords}`);
  l.push('');
  l.push('Status Distribution:');
  for (const [k, v] of Object.entries(report.statusDistribution)) {
    l.push(`  ${k.padEnd(14)} ${v}`);
  }
  l.push('');
  l.push('Scope Coverage:');
  l.push(`  scope-filled: ${report.scopeCoverage.scopeFilledRecords}`);
  l.push(`  scope-null:   ${report.scopeCoverage.scopeNullRecords}`);
  l.push(`  task-scoped:  ${report.scopeCoverage.taskScopedRecords}`);
  l.push('  project:');
  for (const [k, v] of Object.entries(report.scopeCoverage.project)) {
    l.push(`    ${k.padEnd(20)} ${v}`);
  }
  l.push('  visibility:');
  for (const [k, v] of Object.entries(report.scopeCoverage.visibility)) {
    l.push(`    ${k.padEnd(20)} ${v}`);
  }
  l.push('  client:');
  for (const [k, v] of Object.entries(report.scopeCoverage.client)) {
    l.push(`    ${k.padEnd(20)} ${v}`);
  }
  l.push('');
  l.push('Confidence:');
  l.push(`  high (>=0.8):   ${report.confidence.high}`);
  l.push(`  medium (0.4-0.8): ${report.confidence.medium}`);
  l.push(`  low (<0.4):     ${report.confidence.low}`);
  l.push('');
  l.push('Staleness:');
  l.push(`  active, not updated 30d: ${report.staleness.activeNotUpdated30d}`);
  l.push(`  active, not updated 90d: ${report.staleness.activeNotUpdated90d}`);
  l.push('');
  l.push('Lifecycle:');
  l.push(`  superseded:   ${report.supersession.supersededRecords}`);
  l.push(`  supersessions: ${report.supersession.supersessionInitiated}`);
  l.push(`  tombstoned:   ${report.tombstoned}`);
  l.push(`  proposals:    ${report.proposals}`);
  l.push('');
  l.push('Retention:');
  for (const [k, v] of Object.entries(report.retention)) {
    l.push(`  ${k.padEnd(14)} ${v}`);
  }
  return l.join('\n') + '\n';
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = collectReport();
  if (options.json) {
    process.stdout.write(JSON.stringify(report) + '\n');
  } else {
    process.stdout.write(renderText(report));
  }
  if (report.error) process.exitCode = 1;
}

if (require.main === module) {
  main();
}

module.exports = {
  parseArgs,
  getDbPath,
  collectReport,
  renderText,
  buildGovernanceSurface,
  attachReviewSurface
};
