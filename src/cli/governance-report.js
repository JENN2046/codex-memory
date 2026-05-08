#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

function parseArgs(argv = []) {
  const options = { json: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--json') { options.json = true; continue; }
  }
  return options;
}

function getDbPath() {
  return path.join(process.cwd(), 'data', 'codex-memory.sqlite');
}

function runQuery(db, sql) {
  try { return db.prepare(sql).all(); }
  catch { return []; }
}

function runQueryOne(db, sql) {
  try { return db.prepare(sql).get(); }
  catch { return null; }
}

function collectReport() {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    return { error: 'Database not found: ' + dbPath };
  }
  const db = new DatabaseSync(dbPath);

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
  const totalRecords = confHigh + confMed + confLow;

  // Stale indicators
  const now = new Date();
  const stale30d = runQueryOne(db,
    `SELECT COUNT(*) as cnt FROM memory_records WHERE updated_at < ? AND status = 'active'`,
    [new Date(now - 30 * 86400000).toISOString()])?.cnt || 0;
  const stale90d = runQueryOne(db,
    `SELECT COUNT(*) as cnt FROM memory_records WHERE updated_at < ? AND status = 'active'`,
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

  return {
    generatedAt: new Date().toISOString(),
    totalRecords,
    statusDistribution: Object.fromEntries(statusDist.map(r => [r.status, r.cnt])),
    scopeCoverage: {
      project: Object.fromEntries(projectDist.map(r => [r.project_id, r.cnt])),
      visibility: Object.fromEntries(visibilityDist.map(r => [r.visibility, r.cnt])),
      client: Object.fromEntries(clientDist.map(r => [r.client_id, r.cnt])),
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
}

function renderText(report) {
  if (report.error) return 'Error: ' + report.error + '\n';
  const l = [];
  l.push(`Governance Report — ${report.generatedAt}`);
  l.push('─'.repeat(50));
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

main();
