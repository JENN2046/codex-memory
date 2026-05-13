#!/usr/bin/env node
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const { createConfig } = require('../config/createConfig');

const LIFECYCLE_COLUMNS = [
  'status',
  'status_reason',
  'supersedes_memory_id',
  'superseded_by_memory_id',
  'tombstone_reason',
  'lifecycle_updated_at',
  'lifecycle_actor_client_id'
];

function parseArgs(argv = []) {
  const options = { json: false, rejected: null };
  for (const token of argv) {
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--confirm' || token === '--apply') {
      options.rejected = token;
      continue;
    }
  }
  return options;
}

function getDbPath() {
  return createConfig().dbPath;
}

function buildReport({
  status,
  dbPath,
  totalRecords = 0,
  existingLifecycleColumns = [],
  missingLifecycleColumns = LIFECYCLE_COLUMNS,
  message = ''
}) {
  const missingSet = new Set(missingLifecycleColumns);
  const wouldAddColumns = LIFECYCLE_COLUMNS.filter(column => missingSet.has(column));
  const wouldBackfillStatus = missingSet.has('status') ? totalRecords : 0;
  const mutationRequired = wouldAddColumns.length > 0 || wouldBackfillStatus > 0;

  return {
    status,
    mutated: false,
    dbPath,
    totalRecords,
    existingLifecycleColumns,
    missingLifecycleColumns,
    wouldAddColumns,
    wouldBackfillStatus,
    defaultStatus: 'active',
    mutationRequired,
    riskLevel: mutationRequired ? 'A2' : 'A1',
    rollbackRequirement: mutationRequired ? 'sqlite-backup-required' : 'none',
    nextStep: mutationRequired
      ? 'Review dry-run output, take a SQLite backup, then request an explicit future migration approval.'
      : 'No lifecycle column migration is required.',
    ...(message ? { message } : {})
  };
}

function collectReport({ dbPath = getDbPath(), rejected = null } = {}) {
  if (rejected) {
    return {
      status: 'error',
      mutated: false,
      dbPath,
      totalRecords: 0,
      existingLifecycleColumns: [],
      missingLifecycleColumns: [],
      wouldAddColumns: [],
      wouldBackfillStatus: 0,
      defaultStatus: 'active',
      mutationRequired: false,
      riskLevel: 'A2',
      rollbackRequirement: 'not-applicable',
      nextStep: `${rejected} is intentionally unsupported. Re-run without confirm/apply flags for dry-run only.`,
      error: `${rejected} is not supported by lifecycle SQLite dry-run.`
    };
  }

  if (!fs.existsSync(dbPath)) {
    return buildReport({
      status: 'warn',
      dbPath,
      message: `Database not found: ${dbPath}`
    });
  }

  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const table = db.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'memory_records'"
    ).get();
    if (!table) {
      return buildReport({
        status: 'warn',
        dbPath,
        message: `memory_records table not found: ${dbPath}`
      });
    }

    const columns = db.prepare('PRAGMA table_info(memory_records)').all().map(column => column.name);
    const columnSet = new Set(columns);
    const existingLifecycleColumns = LIFECYCLE_COLUMNS.filter(column => columnSet.has(column));
    const missingLifecycleColumns = LIFECYCLE_COLUMNS.filter(column => !columnSet.has(column));
    const totalRecords = db.prepare('SELECT COUNT(*) AS count FROM memory_records').get()?.count || 0;

    return buildReport({
      status: 'ok',
      dbPath,
      totalRecords,
      existingLifecycleColumns,
      missingLifecycleColumns
    });
  } finally {
    db.close();
  }
}

function renderText(report) {
  const lines = [
    `status: ${report.status}`,
    `mutated: ${report.mutated}`,
    `dbPath: ${report.dbPath}`,
    `totalRecords: ${report.totalRecords}`,
    `existingLifecycleColumns: ${report.existingLifecycleColumns.join(',')}`,
    `missingLifecycleColumns: ${report.missingLifecycleColumns.join(',')}`,
    `wouldAddColumns: ${report.wouldAddColumns.join(',')}`,
    `wouldBackfillStatus: ${report.wouldBackfillStatus}`,
    `defaultStatus: ${report.defaultStatus}`,
    `mutationRequired: ${report.mutationRequired}`,
    `riskLevel: ${report.riskLevel}`,
    `rollbackRequirement: ${report.rollbackRequirement}`,
    `nextStep: ${report.nextStep}`
  ];
  if (report.message) lines.push(`message: ${report.message}`);
  if (report.error) lines.push(`error: ${report.error}`);
  return `${lines.join('\n')}\n`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = collectReport({ rejected: options.rejected });
  process.stdout.write(options.json ? `${JSON.stringify(report, null, 2)}\n` : renderText(report));
  process.exitCode = report.status === 'error' ? 1 : 0;
}

if (require.main === module) {
  main();
}

module.exports = {
  LIFECYCLE_COLUMNS,
  parseArgs,
  collectReport,
  renderText
};
