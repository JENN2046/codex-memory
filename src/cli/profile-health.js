#!/usr/bin/env node
const { createConfig } = require('../config/createConfig');
const { buildBaseReport, inspectProfileArtifacts } = require('./rebuild-profile');

function parseArgs(argv) {
  return {
    json: argv.includes('--json')
  };
}

function buildChecks(config, artifacts) {
  const checks = [];
  const sqlite = artifacts.sqlite || {};
  const vectorIndex = artifacts.vectorIndex || {};
  const candidateCache = artifacts.candidateCache || {};

  if (!sqlite.exists) {
    checks.push({ level: 'error', code: 'sqlite-missing', message: 'SQLite shadow database is missing.' });
  } else if (!sqlite.hasEmbeddingFingerprintColumn) {
    checks.push({ level: 'warning', code: 'sqlite-fingerprint-column-missing', message: 'SQLite chunks are still legacy and need rebuild-shadow.' });
  } else if ((sqlite.chunkCount || 0) === 0 && (sqlite.recordCount || 0) > 0) {
    checks.push({ level: 'warning', code: 'current-profile-chunks-missing', message: 'Current profile has records but no chunks.' });
  }

  if ((sqlite.legacyChunkCount || 0) > 0) {
    checks.push({ level: 'info', code: 'legacy-chunks-present', message: 'Legacy chunks are present and ignored by current-profile search.' });
  }

  if (!vectorIndex.exists) {
    checks.push({ level: 'warning', code: 'vector-index-missing', message: 'Current profile vector index is missing.' });
  } else if (vectorIndex.embeddingFingerprint !== config.embeddingFingerprint) {
    checks.push({ level: 'error', code: 'vector-index-fingerprint-mismatch', message: 'Vector index fingerprint does not match current profile.' });
  } else if ((vectorIndex.vectorCount || 0) === 0) {
    checks.push({ level: 'warning', code: 'vector-index-empty', message: 'Current profile vector index has no record vectors.' });
  }

  if ((candidateCache.currentFingerprintEntryCount || 0) > 0) {
    checks.push({ level: 'info', code: 'current-candidate-cache-present', message: 'Current profile has warm candidate cache entries.' });
  }

  return checks;
}

function getStatus(checks) {
  if (checks.some(check => check.level === 'error')) return 'error';
  if (checks.some(check => check.level === 'warning')) return 'needs-attention';
  return 'ready';
}

function buildRecommendations(status, checks) {
  if (status === 'ready') {
    return ['Profile artifacts look ready for current-profile recall.'];
  }

  const codes = new Set(checks.map(check => check.code));
  const recommendations = [];
  if (codes.has('sqlite-fingerprint-column-missing') || codes.has('current-profile-chunks-missing') || codes.has('vector-index-missing') || codes.has('vector-index-empty')) {
    recommendations.push('Run npm run rebuild-shadow to regenerate current-profile chunks and vectors.');
  }
  if (codes.has('vector-index-fingerprint-mismatch')) {
    recommendations.push('Run npm run rebuild-profile -- --confirm --json, then npm run rebuild-shadow.');
  }
  if (codes.has('sqlite-missing')) {
    recommendations.push('Record or import memories, then run npm run rebuild-shadow.');
  }
  if (recommendations.length === 0) {
    recommendations.push('Review profile-health checks before changing embedding models.');
  }
  return recommendations;
}

function buildProfileHealthReport(config) {
  const artifacts = inspectProfileArtifacts(config);
  const checks = buildChecks(config, artifacts);
  const status = getStatus(checks);

  return {
    ...buildBaseReport(config, { mode: 'profile-health', destructive: false }),
    status,
    summary: {
      records: artifacts.sqlite?.recordCount || 0,
      currentChunks: artifacts.sqlite?.chunkCount || 0,
      totalChunks: artifacts.sqlite?.totalChunkCount || 0,
      legacyChunks: artifacts.sqlite?.legacyChunkCount || 0,
      vectors: artifacts.vectorIndex?.vectorCount || 0,
      diaryVectors: artifacts.vectorIndex?.diaryVectorCount || 0,
      embeddingCacheEntries: artifacts.vectorIndex?.embeddingCacheCount || 0,
      candidateCacheEntries: artifacts.candidateCache?.entryCount || 0,
      currentCandidateCacheEntries: artifacts.candidateCache?.currentFingerprintEntryCount || 0
    },
    artifacts,
    checks,
    recommendations: buildRecommendations(status, checks)
  };
}

function renderText(report) {
  const checks = report.checks.length > 0
    ? report.checks.map(check => `- ${check.level}: ${check.code} - ${check.message}`)
    : ['- ok: no issues detected'];
  const recommendations = report.recommendations.map(item => `- ${item}`);

  return [
    'codex-memory profile health',
    `status: ${report.status}`,
    `fingerprint: ${report.embeddingProfile.fingerprint}`,
    `model: ${report.embeddingProfile.model}`,
    `dimensions: ${report.embeddingProfile.dimensions}`,
    `rag profile: ${report.embeddingProfile.ragProfile.selectedProfile || 'none'}`,
    `records: ${report.summary.records}`,
    `chunks: ${report.summary.currentChunks}/${report.summary.totalChunks} current/total`,
    `legacy chunks: ${report.summary.legacyChunks}`,
    `vectors: ${report.summary.vectors}`,
    `diary vectors: ${report.summary.diaryVectors}`,
    `embedding cache: ${report.summary.embeddingCacheEntries}`,
    `candidate cache: ${report.summary.currentCandidateCacheEntries}/${report.summary.candidateCacheEntries} current/total`,
    'checks:',
    ...checks,
    'next:',
    ...recommendations
  ].join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = buildProfileHealthReport(createConfig());
  process.stdout.write(`${options.json ? JSON.stringify(report, null, 2) : renderText(report)}\n`);
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  buildChecks,
  buildProfileHealthReport,
  buildRecommendations,
  getStatus,
  parseArgs,
  renderText
};
