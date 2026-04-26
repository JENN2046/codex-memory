#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const { createConfig } = require('../config/createConfig');

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

function isPathInside(parentPath, candidatePath) {
  if (!parentPath || !candidatePath) return false;
  const relative = path.relative(path.resolve(parentPath), path.resolve(candidatePath));
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function inspectJsonFile(filePath, inspectEntries) {
  if (!filePath || !fs.existsSync(filePath)) {
    return { exists: false, path: filePath };
  }

  const stat = fs.statSync(filePath);
  const result = {
    exists: true,
    path: filePath,
    sizeBytes: stat.size,
    updatedAt: stat.mtime.toISOString()
  };

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return {
      ...result,
      ...inspectEntries(parsed)
    };
  } catch (error) {
    return {
      ...result,
      parseError: error.message
    };
  }
}

function inspectSqlite(config) {
  if (!fs.existsSync(config.dbPath)) {
    return { exists: false, path: config.dbPath };
  }

  const stat = fs.statSync(config.dbPath);
  const db = new DatabaseSync(config.dbPath, { readOnly: true });
  try {
    const hasChunks = db.prepare(`
      SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'memory_chunks'
    `).get().count > 0;

    if (!hasChunks) {
      return {
        exists: true,
        path: config.dbPath,
        sizeBytes: stat.size,
        updatedAt: stat.mtime.toISOString(),
        chunkCount: 0,
        totalChunkCount: 0
      };
    }

    const columns = db.prepare('PRAGMA table_info(memory_chunks)').all();
    const hasFingerprint = columns.some(column => column.name === 'embedding_fingerprint');
    const totalChunkCount = db.prepare('SELECT COUNT(*) AS count FROM memory_chunks').get().count;
    const recordCount = db.prepare(`
      SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'memory_records'
    `).get().count > 0
      ? db.prepare('SELECT COUNT(*) AS count FROM memory_records').get().count
      : 0;
    const chunkCount = hasFingerprint
      ? db.prepare('SELECT COUNT(*) AS count FROM memory_chunks WHERE embedding_fingerprint = ?')
        .get(config.embeddingFingerprint).count
      : 0;
    const legacyChunkCount = hasFingerprint
      ? db.prepare('SELECT COUNT(*) AS count FROM memory_chunks WHERE embedding_fingerprint IS NULL OR embedding_fingerprint = ?')
        .get('').count
      : totalChunkCount;
    const profileBreakdown = hasFingerprint
      ? db.prepare(`
        SELECT coalesce(nullif(embedding_fingerprint, ''), '<legacy>') AS fingerprint, COUNT(*) AS count
        FROM memory_chunks
        GROUP BY coalesce(nullif(embedding_fingerprint, ''), '<legacy>')
        ORDER BY count DESC, fingerprint ASC
      `).all()
      : (totalChunkCount > 0 ? [{ fingerprint: '<legacy>', count: totalChunkCount }] : []);

    return {
      exists: true,
      path: config.dbPath,
      sizeBytes: stat.size,
      updatedAt: stat.mtime.toISOString(),
      hasEmbeddingFingerprintColumn: hasFingerprint,
      recordCount,
      chunkCount,
      totalChunkCount,
      legacyChunkCount,
      profileBreakdown
    };
  } finally {
    db.close();
  }
}

function inspectProfileArtifacts(config) {
  const vectorIndex = inspectJsonFile(config.vectorIndexPath, parsed => ({
    embeddingFingerprint: parsed.embeddingFingerprint || null,
    vectorCount: Object.keys(parsed.vectors || {}).length,
    diaryVectorCount: Object.keys(parsed.diaryVectors || {}).length,
    embeddingCacheCount: Object.keys(parsed.embeddingCache || {}).length
  }));
  const candidateCache = inspectJsonFile(config.candidateCachePath, parsed => {
    const entries = Object.values(parsed.entries || {});
    return {
      entryCount: entries.length,
      currentFingerprintEntryCount: entries
        .filter(entry => entry.embeddingFingerprint === config.embeddingFingerprint).length
    };
  });

  return {
    sqlite: inspectSqlite(config),
    vectorIndex,
    candidateCache
  };
}

function buildBaseReport(config, { mode, destructive }) {
  return {
    mode,
    destructive,
    embeddingProfile: {
      fingerprint: config.embeddingFingerprint,
      version: config.embeddingProfileVersion,
      provider: config.embeddingProvider || 'local',
      model: config.embeddingModel || 'local-hash',
      dimensions: config.embedDimensions,
      ragProfile: {
        available: !!config.ragProfile?.available,
        selectedProfile: config.ragProfile?.selectedProfile || null,
        error: config.ragProfile?.error || null
      }
    },
    paths: {
      dbPath: config.dbPath,
      vectorIndexPath: config.vectorIndexPath,
      candidateCachePath: config.candidateCachePath,
      ragParamsPath: config.ragParamsPath || null
    }
  };
}

function buildDryRunReport(config) {
  return {
    ...buildBaseReport(config, { mode: 'dry-run', destructive: false }),
    artifacts: inspectProfileArtifacts(config),
    nextAction: 'Run rebuild-profile --confirm to clear only current-profile generated artifacts, then run rebuild-shadow.'
  };
}

function deleteFileIfSafe(config, filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return { path: filePath, skipped: true, reason: 'missing' };
  }
  if (!isPathInside(config.projectBasePath, filePath)) {
    return { path: filePath, skipped: true, reason: 'outside projectBasePath' };
  }
  fs.unlinkSync(filePath);
  return { path: filePath, deleted: true };
}

function clearCandidateCacheEntries(config) {
  const filePath = config.candidateCachePath;
  if (!filePath || !fs.existsSync(filePath)) {
    return { path: filePath, skipped: true, reason: 'missing' };
  }
  if (!isPathInside(config.projectBasePath, filePath)) {
    return { path: filePath, skipped: true, reason: 'outside projectBasePath' };
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const entries = parsed.entries && typeof parsed.entries === 'object' ? parsed.entries : {};
  const beforeCount = Object.keys(entries).length;
  for (const [key, entry] of Object.entries(entries)) {
    if (entry?.embeddingFingerprint === config.embeddingFingerprint) {
      delete entries[key];
    }
  }
  parsed.entries = entries;
  parsed.updatedAt = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), 'utf8');
  return {
    path: filePath,
    removedEntries: beforeCount - Object.keys(entries).length,
    remainingEntries: Object.keys(entries).length
  };
}

function clearSqliteChunks(config) {
  if (!fs.existsSync(config.dbPath)) {
    return { path: config.dbPath, skipped: true, reason: 'missing' };
  }

  const db = new DatabaseSync(config.dbPath);
  try {
    const hasChunks = db.prepare(`
      SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'memory_chunks'
    `).get().count > 0;
    if (!hasChunks) {
      return { path: config.dbPath, skipped: true, reason: 'memory_chunks missing' };
    }

    const columns = db.prepare('PRAGMA table_info(memory_chunks)').all();
    const hasFingerprint = columns.some(column => column.name === 'embedding_fingerprint');
    if (!hasFingerprint) {
      return { path: config.dbPath, skipped: true, reason: 'embedding_fingerprint column missing' };
    }

    const beforeCount = db.prepare('SELECT COUNT(*) AS count FROM memory_chunks WHERE embedding_fingerprint = ?')
      .get(config.embeddingFingerprint).count;
    db.prepare('DELETE FROM memory_chunks WHERE embedding_fingerprint = ?').run(config.embeddingFingerprint);
    return { path: config.dbPath, removedChunks: beforeCount };
  } finally {
    db.close();
  }
}

function buildConfirmReport(config) {
  const before = inspectProfileArtifacts(config);
  const actions = {
    vectorIndex: deleteFileIfSafe(config, config.vectorIndexPath),
    candidateCache: clearCandidateCacheEntries(config),
    sqlite: clearSqliteChunks(config)
  };
  const after = inspectProfileArtifacts(config);

  return {
    ...buildBaseReport(config, { mode: 'confirm', destructive: true }),
    before,
    actions,
    after,
    nextAction: 'Run npm run rebuild-shadow to regenerate chunks and vectors for the current embedding profile.'
  };
}

function renderText(report) {
  const artifacts = report.artifacts || report.after || {};
  const prefix = report.mode === 'confirm'
    ? 'codex-memory rebuild-profile confirm'
    : 'codex-memory rebuild-profile dry run';

  return [
    prefix,
    `fingerprint: ${report.embeddingProfile.fingerprint}`,
    `model: ${report.embeddingProfile.model}`,
    `dimensions: ${report.embeddingProfile.dimensions}`,
    `rag profile: ${report.embeddingProfile.ragProfile.selectedProfile || 'none'}`,
    `sqlite chunks: ${artifacts.sqlite?.chunkCount ?? 0}/${artifacts.sqlite?.totalChunkCount ?? 0}`,
    `vector index exists: ${artifacts.vectorIndex?.exists}`,
    `candidate cache entries: ${artifacts.candidateCache?.entryCount ?? 0}`,
    `next: ${report.nextAction}`
  ].join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.dryRun && options.confirm) {
    throw new Error('Use either --dry-run or --confirm, not both');
  }
  if (!options.dryRun && !options.confirm) {
    throw new Error('rebuild-profile requires --dry-run or --confirm');
  }

  const config = createConfig();
  const report = options.confirm ? buildConfirmReport(config) : buildDryRunReport(config);
  process.stdout.write(`${options.json ? JSON.stringify(report, null, 2) : renderText(report)}\n`);
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  buildBaseReport,
  buildConfirmReport,
  buildDryRunReport,
  clearCandidateCacheEntries,
  clearSqliteChunks,
  deleteFileIfSafe,
  inspectJsonFile,
  inspectProfileArtifacts,
  inspectSqlite,
  isPathInside,
  parseArgs,
  renderText
};
