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

function runQuery(db, sql, params = []) {
  try { return db.prepare(sql).all(...params); }
  catch { return []; }
}

function runQueryOne(db, sql, params = []) {
  try { return db.prepare(sql).get(...params); }
  catch { return null; }
}

function columnExists(db, table, column) {
  try {
    const cols = db.prepare('PRAGMA table_info(' + table + ')').all();
    return cols.some(c => c.name === column);
  } catch { return false; }
}

function checkGovernanceSchema(db) {
  const required = [
    'status', 'scope', 'confidence', 'provenance',
    'superseded_by', 'supersedes', 'tombstone_reason',
    'client_id', 'workspace_id', 'project_id',
    'task_id', 'conversation_id', 'visibility', 'retention_policy'
  ];
  const missing = required.filter(col => !columnExists(db, 'memory_records', col));
  return {
    allPresent: missing.length === 0,
    missingColumns: missing
  };
}

function collectReport() {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    return { error: 'Database not found: ' + dbPath };
  }
  const db = new DatabaseSync(dbPath);

  const schemaStatus = checkGovernanceSchema(db);
  const totalRecords = runQueryOne(db, 'SELECT COUNT(*) as cnt FROM memory_records')?.cnt || 0;

  let statusDist = [],
    projectDist = [],
    visibilityDist = [],
    clientDist = [],
    confHigh = 0, confMed = 0, confLow = 0,
    stale30d = 0, stale90d = 0,
    supersededCount = 0, supersessionInitiated = 0,
    tombstonedCount = 0, proposalCount = 0,
    scopeNullCount = 0, taskScopedCount = 0,
    retentionDist = [];

  if (schemaStatus.allPresent) {
    statusDist = runQuery(db, 'SELECT status, COUNT(*) as cnt FROM memory_records GROUP BY status ORDER BY cnt DESC');
    projectDist = runQuery(db, 'SELECT project_id, COUNT(*) as cnt FROM memory_records GROUP BY project_id ORDER BY cnt DESC');
    visibilityDist = runQuery(db, 'SELECT visibility, COUNT(*) as cnt FROM memory_records GROUP BY visibility ORDER BY cnt DESC');
    clientDist = runQuery(db, 'SELECT client_id, COUNT(*) as cnt FROM memory_records GROUP BY client_id ORDER BY cnt DESC');

    confHigh = runQueryOne(db, 'SELECT COUNT(*) as cnt FROM memory_records WHERE confidence >= 0.8')?.cnt || 0;
    confMed = runQueryOne(db, 'SELECT COUNT(*) as cnt FROM memory_records WHERE confidence >= 0.4 AND confidence < 0.8')?.cnt || 0;
    confLow = runQueryOne(db, 'SELECT COUNT(*) as cnt FROM memory_records WHERE confidence < 0.4')?.cnt || 0;

    const now = new Date();
    stale30d = runQueryOne(db, 'SELECT COUNT(*) as cnt FROM memory_records WHERE updated_at < ? AND status = ?', [new Date(now - 30 * 86400000).toISOString(), 'active'])?.cnt || 0;
    stale90d = runQueryOne(db, 'SELECT COUNT(*) as cnt FROM memory_records WHERE updated_at < ? AND status = ?', [new Date(now - 90 * 86400000).toISOString(), 'active'])?.cnt || 0;

    supersededCount = runQueryOne(db, "SELECT COUNT(*) as cnt FROM memory_records WHERE superseded_by IS NOT NULL")?.cnt || 0;
    supersessionInitiated = runQueryOne(db, "SELECT COUNT(*) as cnt FROM memory_records WHERE supersedes IS NOT NULL")?.cnt || 0;
    tombstonedCount = runQueryOne(db, "SELECT COUNT(*) as cnt FROM memory_records WHERE status = 'tombstoned'")?.cnt || 0;
    proposalCount = runQueryOne(db, "SELECT COUNT(*) as cnt FROM memory_records WHERE status = 'proposal'")?.cnt || 0;
    scopeNullCount = runQueryOne(db, "SELECT COUNT(*) as cnt FROM memory_records WHERE project_id = '' OR project_id IS NULL")?.cnt || 0;
    taskScopedCount = runQueryOne(db, "SELECT COUNT(*) as cnt FROM memory_records WHERE task_id IS NOT NULL AND task_id != ''")?.cnt || 0;
    retentionDist = runQuery(db, 'SELECT retention_policy, COUNT(*) as cnt FROM memory_records GROUP BY retention_policy ORDER BY cnt DESC');
  }

  db.close();

  const scopeFilledCount = totalRecords - scopeNullCount;

  return {
    generatedAt: new Date().toISOString(),
    schemaStatus: {
      allPresent: schemaStatus.allPresent,
      missingColumns: schemaStatus.missingColumns
    },
    totalRecords,
    statusDistribution: statusDist.length > 0 ? Object.fromEntries(statusDist.map(r => [r.status, r.cnt])) : {},
    scopeCoverage: {
      project: projectDist.length > 0 ? Object.fromEntries(projectDist.map(r => [r.project_id, r.cnt])) : {},
      visibility: visibilityDist.length > 0 ? Object.fromEntries(visibilityDist.map(r => [r.visibility, r.cnt])) : {},
      client: clientDist.length > 0 ? Object.fromEntries(clientDist.map(r => [r.client_id, r.cnt])) : {},
      scopeFilledRecords: scopeFilledCount,
      scopeNullRecords: scopeNullCount,
      taskScopedRecords: taskScopedCount
    },
    confidence: { high: confHigh, medium: confMed, low: confLow },
    staleness: { activeNotUpdated30d: stale30d, activeNotUpdated90d: stale90d },
    supersession: { supersededRecords: supersededCount, supersessionInitiated: supersessionInitiated },
    tombstoned: tombstonedCount,
    proposals: proposalCount,
    retention: retentionDist.length > 0 ? Object.fromEntries(retentionDist.map(r => [r.retention_policy, r.cnt])) : {}
  };
}

function renderText(report) {
  if (report.error) return 'Error: ' + report.error + '\n';
  const l = [];
  l.push(`Governance Report — ${report.generatedAt}`);
  l.push('─'.repeat(50));
  l.push('');

  if (report.schemaStatus && !report.schemaStatus.allPresent) {
    l.push(`⚠ Schema incomplete — missing columns: [${report.schemaStatus.missingColumns.join(', ')}]`);
    l.push('  Run migration (H-002c) to add governance/scope columns.');
    l.push('');
  }
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
