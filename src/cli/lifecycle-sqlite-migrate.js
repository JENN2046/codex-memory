#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { createConfig } = require('../config/createConfig');
const { LIFECYCLE_COLUMNS } = require('./lifecycle-sqlite-dry-run');

const COLUMN_DEFINITIONS = Object.freeze({
  status: 'TEXT',
  status_reason: 'TEXT',
  supersedes_memory_id: 'TEXT',
  superseded_by_memory_id: 'TEXT',
  tombstone_reason: 'TEXT',
  lifecycle_updated_at: 'TEXT',
  lifecycle_actor_client_id: 'TEXT'
});

function parseArgs(argv = []) {
  const options = {
    json: false,
    confirm: false,
    dbPath: null,
    backupPath: null,
    rejected: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--confirm') {
      options.confirm = true;
      continue;
    }
    if (token === '--apply') {
      options.rejected = '--apply';
      continue;
    }
    if (token === '--db') {
      options.dbPath = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (token === '--backup') {
      options.backupPath = argv[index + 1] || null;
      index += 1;
      continue;
    }
  }

  return options;
}

function getDbPath(explicitPath = null) {
  return explicitPath || createConfig().dbPath;
}

function emptyReport({ status, dbPath, message = '', error = '', backupPath = null }) {
  return {
    status,
    mutated: false,
    dbPath,
    backupPath,
    backupCreated: false,
    totalRecords: 0,
    existingLifecycleColumns: [],
    missingLifecycleColumns: [],
    addedColumns: [],
    backfilledStatus: 0,
    defaultStatus: 'active',
    migrationRequired: false,
    rollbackAvailable: false,
    readinessClaimed: false,
    rcReadyClaimed: false,
    ...(message ? { message } : {}),
    ...(error ? { error } : {})
  };
}

function inspectDb(dbPath) {
  if (!fs.existsSync(dbPath)) {
    return emptyReport({
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
      return emptyReport({
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
    const backfillCandidates = columnSet.has('status')
      ? db.prepare("SELECT COUNT(*) AS count FROM memory_records WHERE status IS NULL OR status = ''").get()?.count || 0
      : totalRecords;
    const migrationRequired = missingLifecycleColumns.length > 0 || backfillCandidates > 0;

    return {
      status: 'ok',
      mutated: false,
      dbPath,
      backupPath: null,
      backupCreated: false,
      totalRecords,
      existingLifecycleColumns,
      missingLifecycleColumns,
      addedColumns: [],
      backfilledStatus: 0,
      defaultStatus: 'active',
      migrationRequired,
      wouldAddColumns: missingLifecycleColumns,
      wouldBackfillStatus: backfillCandidates,
      rollbackAvailable: false,
      readinessClaimed: false,
      rcReadyClaimed: false,
      nextStep: migrationRequired
        ? 'Re-run with --confirm --backup <path> only after exact approval for a real SQLite migration apply.'
        : 'No lifecycle SQLite migration is required.'
    };
  } finally {
    db.close();
  }
}

function validateApplyRequest({ confirm, backupPath, rejected, inspection }) {
  if (rejected) {
    return `${rejected} is intentionally unsupported. Use --confirm --backup <path> for the guarded migrate CLI.`;
  }
  if (inspection.status !== 'ok') return null;
  if (!confirm) return null;
  if (!backupPath) return '--confirm requires --backup <path>.';
  if (fs.existsSync(backupPath)) return `Backup path already exists: ${backupPath}`;
  return null;
}

function applyMigration({ dbPath, backupPath }) {
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(dbPath, backupPath, fs.constants.COPYFILE_EXCL);

  const db = new DatabaseSync(dbPath);
  const addedColumns = [];
  let backfilledStatus = 0;
  try {
    db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      const columns = db.prepare('PRAGMA table_info(memory_records)').all().map(column => column.name);
      const columnSet = new Set(columns);

      for (const column of LIFECYCLE_COLUMNS) {
        if (!columnSet.has(column)) {
          db.exec(`ALTER TABLE memory_records ADD COLUMN ${column} ${COLUMN_DEFINITIONS[column]}`);
          addedColumns.push(column);
        }
      }

      const update = db.prepare("UPDATE memory_records SET status = 'active' WHERE status IS NULL OR status = ''");
      backfilledStatus = update.run().changes || 0;
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  } finally {
    db.close();
  }

  const after = inspectDb(dbPath);
  return {
    ...after,
    mutated: addedColumns.length > 0 || backfilledStatus > 0,
    backupPath,
    backupCreated: true,
    addedColumns,
    backfilledStatus,
    rollbackAvailable: true,
    migrationRequired: after.migrationRequired,
    nextStep: after.migrationRequired
      ? 'Migration applied but follow-up inspection still reports a lifecycle schema gap.'
      : 'Lifecycle SQLite migration applied for this database; keep the backup until validation completes.'
  };
}

function collectReport(options = {}) {
  const dbPath = getDbPath(options.dbPath);
  const inspection = inspectDb(dbPath);
  const validationError = validateApplyRequest({ ...options, inspection });

  if (validationError) {
    return {
      ...inspection,
      status: 'error',
      backupPath: options.backupPath || null,
      error: validationError,
      nextStep: 'Re-run as a dry-run, or provide an explicit unused backup path with --confirm after approval.'
    };
  }

  if (!options.confirm || inspection.status !== 'ok' || !inspection.migrationRequired) {
    return {
      ...inspection,
      backupPath: options.backupPath || null
    };
  }

  return applyMigration({ dbPath, backupPath: options.backupPath });
}

function renderText(report) {
  const lines = [
    `status: ${report.status}`,
    `mutated: ${report.mutated}`,
    `dbPath: ${report.dbPath}`,
    `backupPath: ${report.backupPath || ''}`,
    `backupCreated: ${report.backupCreated}`,
    `totalRecords: ${report.totalRecords}`,
    `existingLifecycleColumns: ${report.existingLifecycleColumns.join(',')}`,
    `missingLifecycleColumns: ${report.missingLifecycleColumns.join(',')}`,
    `wouldAddColumns: ${(report.wouldAddColumns || []).join(',')}`,
    `wouldBackfillStatus: ${report.wouldBackfillStatus || 0}`,
    `addedColumns: ${report.addedColumns.join(',')}`,
    `backfilledStatus: ${report.backfilledStatus}`,
    `defaultStatus: ${report.defaultStatus}`,
    `migrationRequired: ${report.migrationRequired}`,
    `rollbackAvailable: ${report.rollbackAvailable}`,
    `readinessClaimed: ${report.readinessClaimed}`,
    `rcReadyClaimed: ${report.rcReadyClaimed}`
  ];
  if (report.nextStep) lines.push(`nextStep: ${report.nextStep}`);
  if (report.message) lines.push(`message: ${report.message}`);
  if (report.error) lines.push(`error: ${report.error}`);
  return `${lines.join('\n')}\n`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = collectReport(options);
  process.stdout.write(options.json ? `${JSON.stringify(report, null, 2)}\n` : renderText(report));
  process.exitCode = report.status === 'error' ? 1 : 0;
}

if (require.main === module) {
  main();
}

module.exports = {
  COLUMN_DEFINITIONS,
  applyMigration,
  collectReport,
  inspectDb,
  parseArgs,
  renderText
};
