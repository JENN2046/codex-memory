#!/usr/bin/env node
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const { createConfig } = require('../config/createConfig');
const { buildBaseReport, inspectProfileArtifacts } = require('./rebuild-profile');

function parseArgs(argv) {
  const options = {
    dryRun: false,
    confirm: false,
    json: false
  };

  for (const token of argv) {
    if (token === '--dry-run') options.dryRun = true;
    if (token === '--confirm') options.confirm = true;
    if (token === '--json') options.json = true;
  }

  return options;
}

function inspectLegacyChunks(config, { limit = 10 } = {}) {
  if (!fs.existsSync(config.dbPath)) {
    return { exists: false, path: config.dbPath, legacyChunkCount: 0, samples: [] };
  }

  const db = new DatabaseSync(config.dbPath, { readOnly: true });
  try {
    const hasChunks = db.prepare(`
      SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'memory_chunks'
    `).get().count > 0;
    if (!hasChunks) {
      return { exists: true, path: config.dbPath, legacyChunkCount: 0, samples: [] };
    }

    const columns = db.prepare('PRAGMA table_info(memory_chunks)').all();
    const hasFingerprint = columns.some(column => column.name === 'embedding_fingerprint');
    if (!hasFingerprint) {
      const count = db.prepare('SELECT COUNT(*) AS count FROM memory_chunks').get().count;
      const samples = db.prepare(`
        SELECT chunk_id, memory_id, title, relative_path
        FROM memory_chunks
        ORDER BY updated_at DESC, chunk_index ASC
        LIMIT ?
      `).all(limit);
      return {
        exists: true,
        path: config.dbPath,
        hasEmbeddingFingerprintColumn: false,
        legacyChunkCount: count,
        samples
      };
    }

    const where = "embedding_fingerprint IS NULL OR embedding_fingerprint = ''";
    const count = db.prepare(`SELECT COUNT(*) AS count FROM memory_chunks WHERE ${where}`).get().count;
    const samples = db.prepare(`
      SELECT chunk_id, memory_id, title, relative_path
      FROM memory_chunks
      WHERE ${where}
      ORDER BY updated_at DESC, chunk_index ASC
      LIMIT ?
    `).all(limit);
    return {
      exists: true,
      path: config.dbPath,
      hasEmbeddingFingerprintColumn: true,
      legacyChunkCount: count,
      samples
    };
  } finally {
    db.close();
  }
}

function clearLegacyChunks(config) {
  if (!fs.existsSync(config.dbPath)) {
    return { path: config.dbPath, skipped: true, reason: 'missing', removedChunks: 0 };
  }

  const db = new DatabaseSync(config.dbPath);
  try {
    const hasChunks = db.prepare(`
      SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'memory_chunks'
    `).get().count > 0;
    if (!hasChunks) {
      return { path: config.dbPath, skipped: true, reason: 'memory_chunks missing', removedChunks: 0 };
    }

    const columns = db.prepare('PRAGMA table_info(memory_chunks)').all();
    const hasFingerprint = columns.some(column => column.name === 'embedding_fingerprint');
    if (!hasFingerprint) {
      return { path: config.dbPath, skipped: true, reason: 'embedding_fingerprint column missing; run rebuild-shadow first', removedChunks: 0 };
    }

    const beforeCount = db.prepare(`
      SELECT COUNT(*) AS count FROM memory_chunks
      WHERE embedding_fingerprint IS NULL OR embedding_fingerprint = ''
    `).get().count;
    db.prepare(`
      DELETE FROM memory_chunks
      WHERE embedding_fingerprint IS NULL OR embedding_fingerprint = ''
    `).run();
    return { path: config.dbPath, removedChunks: beforeCount };
  } finally {
    db.close();
  }
}

function buildCleanupLegacyReport(config, options) {
  const before = inspectLegacyChunks(config);
  const action = options.confirm
    ? clearLegacyChunks(config)
    : { skipped: true, reason: 'dry-run', removedChunks: 0 };
  const after = options.confirm ? inspectLegacyChunks(config) : before;

  return {
    ...buildBaseReport(config, { mode: options.confirm ? 'cleanup-legacy-confirm' : 'cleanup-legacy-dry-run', destructive: !!options.confirm }),
    before,
    action,
    after,
    artifacts: inspectProfileArtifacts(config),
    nextAction: options.confirm
      ? 'Run npm run profile-health to verify legacy chunks are gone.'
      : 'Run npm run cleanup-legacy-chunks -- --confirm --json to remove only legacy chunks.'
  };
}

function renderText(report) {
  return [
    `codex-memory ${report.mode}`,
    `fingerprint: ${report.embeddingProfile.fingerprint}`,
    `legacy chunks before: ${report.before.legacyChunkCount}`,
    `removed chunks: ${report.action.removedChunks || 0}`,
    `legacy chunks after: ${report.after.legacyChunkCount}`,
    `next: ${report.nextAction}`
  ].join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.dryRun && options.confirm) {
    throw new Error('Use either --dry-run or --confirm, not both');
  }
  if (!options.dryRun && !options.confirm) {
    throw new Error('cleanup-legacy-chunks requires --dry-run or --confirm');
  }

  const report = buildCleanupLegacyReport(createConfig(), options);
  process.stdout.write(`${options.json ? JSON.stringify(report, null, 2) : renderText(report)}\n`);
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  buildCleanupLegacyReport,
  clearLegacyChunks,
  inspectLegacyChunks,
  parseArgs,
  renderText
};
