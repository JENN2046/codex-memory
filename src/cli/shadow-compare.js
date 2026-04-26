#!/usr/bin/env node
const fs = require('node:fs/promises');
const { existsSync } = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const { createConfig } = require('../config/createConfig');
const { VectorIndexStore, cosineSimilarity } = require('../storage/VectorIndexStore');
const { inspectProfileArtifacts } = require('./rebuild-profile');

function parseArgs(argv) {
  const options = {
    json: false,
    queries: [],
    queriesFile: '',
    baselineFingerprint: '',
    limit: 5
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--query') {
      const query = String(argv[index + 1] || '').trim();
      if (query) options.queries.push(query);
      index += 1;
      continue;
    }
    if (token === '--queries') {
      options.queries.push(...String(argv[index + 1] || '')
        .split(/[;\n]/)
        .map(item => item.trim())
        .filter(Boolean));
      index += 1;
      continue;
    }
    if (token === '--queries-file') {
      options.queriesFile = path.resolve(process.cwd(), argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--baseline-fingerprint') {
      options.baselineFingerprint = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (token === '--limit') {
      const parsed = Number.parseInt(String(argv[index + 1] || ''), 10);
      if (Number.isInteger(parsed) && parsed > 0) {
        options.limit = Math.min(parsed, 25);
      }
      index += 1;
    }
  }

  return options;
}

async function loadQueries(options) {
  const queries = [...options.queries];
  if (options.queriesFile) {
    const parsed = JSON.parse(await fs.readFile(options.queriesFile, 'utf8'));
    if (Array.isArray(parsed)) {
      queries.push(...parsed.map(item => String(item || '').trim()).filter(Boolean));
    } else if (Array.isArray(parsed.queries)) {
      queries.push(...parsed.queries.map(item => typeof item === 'string' ? item : item?.query)
        .map(item => String(item || '').trim())
        .filter(Boolean));
    }
  }
  return [...new Set(queries)];
}

function getProfileBreakdown(sqlite) {
  return Array.isArray(sqlite?.profileBreakdown) ? sqlite.profileBreakdown : [];
}

function chooseBaselineFingerprint(config, artifacts, explicitBaseline = '') {
  if (explicitBaseline) return explicitBaseline;
  const candidates = getProfileBreakdown(artifacts.sqlite)
    .map(item => item.fingerprint)
    .filter(fingerprint => fingerprint && fingerprint !== config.embeddingFingerprint);
  return candidates[0] || '';
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value || '');
  } catch {
    return fallback;
  }
}

function loadChunksForFingerprint(config, fingerprint) {
  if (!existsSync(config.dbPath)) return [];
  const db = new DatabaseSync(config.dbPath, { readOnly: true });
  try {
    const hasChunks = db.prepare(`
      SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'memory_chunks'
    `).get().count > 0;
    if (!hasChunks) return [];

    const columns = db.prepare('PRAGMA table_info(memory_chunks)').all();
    const hasFingerprint = columns.some(column => column.name === 'embedding_fingerprint');
    if (!hasFingerprint && fingerprint !== '<legacy>') return [];

    const sql = hasFingerprint
      ? fingerprint === '<legacy>'
        ? `SELECT * FROM memory_chunks WHERE embedding_fingerprint IS NULL OR embedding_fingerprint = ''`
        : 'SELECT * FROM memory_chunks WHERE embedding_fingerprint = ?'
      : 'SELECT * FROM memory_chunks';
    const rows = hasFingerprint && fingerprint !== '<legacy>'
      ? db.prepare(sql).all(fingerprint)
      : db.prepare(sql).all();

    return rows.map(row => ({
      chunkId: row.chunk_id,
      memoryId: row.memory_id,
      target: row.target,
      title: row.title,
      sourceFile: row.relative_path || row.source_file || null,
      chunkIndex: row.chunk_index,
      text: row.text || '',
      vector: parseJson(row.vector_json, []),
      tags: parseJson(row.tags_json, []),
      embeddingFingerprint: row.embedding_fingerprint || '<legacy>',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  } finally {
    db.close();
  }
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .match(/[a-z0-9_\u4e00-\u9fff]+/g) || [];
}

function lexicalScore(queryTokens, chunk) {
  if (queryTokens.length === 0) return 0;
  const titleTokens = new Set(tokenize(chunk.title));
  const textTokens = new Set(tokenize(chunk.text));
  const tagTokens = new Set(tokenize((chunk.tags || []).join(' ')));
  let score = 0;
  for (const token of queryTokens) {
    if (titleTokens.has(token)) score += 0.45;
    if (textTokens.has(token)) score += 0.32;
    if (tagTokens.has(token)) score += 0.55;
  }
  return Number(Math.min(1, score / Math.max(1, queryTokens.length)).toFixed(6));
}

function rankChunks({ chunks, query, queryVector, limit }) {
  const queryTokens = tokenize(query);
  return chunks
    .map(chunk => {
      const vectorComparable = Array.isArray(chunk.vector)
        && Array.isArray(queryVector)
        && chunk.vector.length === queryVector.length
        && chunk.vector.length > 0;
      const vectorScore = vectorComparable ? cosineSimilarity(queryVector, chunk.vector) : 0;
      const lexical = lexicalScore(queryTokens, chunk);
      const score = vectorComparable
        ? Number((Math.max(0, vectorScore) * 0.7 + lexical * 0.3).toFixed(6))
        : lexical;
      return {
        chunkId: chunk.chunkId,
        memoryId: chunk.memoryId,
        title: chunk.title,
        sourceFile: chunk.sourceFile,
        score,
        vectorScore: Number(vectorScore.toFixed(6)),
        lexicalScore: lexical,
        vectorComparable,
        embeddingFingerprint: chunk.embeddingFingerprint
      };
    })
    .filter(item => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((item, index) => ({
      ...item,
      rank: index + 1
    }));
}

function resultKey(result) {
  return result.memoryId || result.chunkId || result.sourceFile || '';
}

function compareRankedResults(current = [], baseline = []) {
  const baselineRankByKey = new Map(baseline.map(item => [resultKey(item), item.rank]));
  const currentRankByKey = new Map(current.map(item => [resultKey(item), item.rank]));
  const currentKeys = new Set(current.map(resultKey).filter(Boolean));
  const baselineKeys = new Set(baseline.map(resultKey).filter(Boolean));
  const overlap = [...currentKeys].filter(key => baselineKeys.has(key));
  const union = new Set([...currentKeys, ...baselineKeys]);

  return {
    currentCount: current.length,
    baselineCount: baseline.length,
    overlapCount: overlap.length,
    jaccard: union.size > 0 ? Number((overlap.length / union.size).toFixed(6)) : 1,
    rankDeltas: overlap.map(key => ({
      key,
      currentRank: currentRankByKey.get(key),
      baselineRank: baselineRankByKey.get(key),
      delta: baselineRankByKey.get(key) - currentRankByKey.get(key)
    }))
  };
}

function buildQueryVector(config, query) {
  const vectorStore = new VectorIndexStore(config);
  return vectorStore.embedText(query);
}

async function buildShadowCompareReport(config, options) {
  const artifacts = inspectProfileArtifacts(config);
  const queries = await loadQueries(options);
  const baselineFingerprint = chooseBaselineFingerprint(config, artifacts, options.baselineFingerprint);
  const currentFingerprint = config.embeddingFingerprint;

  const currentChunks = loadChunksForFingerprint(config, currentFingerprint);
  const baselineChunks = baselineFingerprint ? loadChunksForFingerprint(config, baselineFingerprint) : [];
  const queryVectorSource = 'local-hash-current-dim';

  const comparisons = queries.map(query => {
    const queryVector = buildQueryVector(config, query);
    const current = rankChunks({ chunks: currentChunks, query, queryVector, limit: options.limit });
    const baseline = rankChunks({ chunks: baselineChunks, query, queryVector, limit: options.limit });
    return {
      query,
      metrics: compareRankedResults(current, baseline),
      current,
      baseline,
      vectorComparable: {
        current: current.some(item => item.vectorComparable),
        baseline: baseline.some(item => item.vectorComparable)
      }
    };
  });

  const hasBaseline = !!baselineFingerprint && baselineChunks.length > 0;
  const hasQueries = queries.length > 0;
  const baselineVectorComparable = comparisons.some(item => item.vectorComparable.baseline);
  const status = !hasQueries
    ? 'no-queries'
    : !hasBaseline
      ? 'no-baseline'
      : baselineVectorComparable
        ? baselineFingerprint === currentFingerprint ? 'comparable' : 'approximate'
        : 'lexical-only';

  return {
    mode: 'shadow-compare',
    destructive: false,
    status,
    embeddingProfile: {
      fingerprint: currentFingerprint,
      version: config.embeddingProfileVersion,
      provider: config.embeddingProvider || 'local',
      model: config.embeddingModel || 'local-hash',
      dimensions: config.embedDimensions
    },
    baselineProfile: {
      fingerprint: baselineFingerprint || null,
      chunkCount: baselineChunks.length
    },
    queryVectorSource,
    limit: options.limit,
    summary: {
      queryCount: queries.length,
      currentChunkCount: currentChunks.length,
      baselineChunkCount: baselineChunks.length,
      averageJaccard: comparisons.length > 0
        ? Number((comparisons.reduce((sum, item) => sum + item.metrics.jaccard, 0) / comparisons.length).toFixed(6))
        : null
    },
    profileBreakdown: getProfileBreakdown(artifacts.sqlite),
    comparisons,
    notes: [
      'This command is read-only.',
      'Use matching profile-specific query embeddings for final migration gates; lexical-only results are directional, not proof.'
    ]
  };
}

function renderText(report) {
  const lines = [
    'codex-memory shadow compare',
    `status: ${report.status}`,
    `current: ${report.embeddingProfile.fingerprint}`,
    `baseline: ${report.baselineProfile.fingerprint || 'none'}`,
    `queries: ${report.summary.queryCount}`,
    `chunks: ${report.summary.currentChunkCount}/${report.summary.baselineChunkCount} current/baseline`,
    `average jaccard: ${report.summary.averageJaccard ?? 'n/a'}`
  ];

  for (const comparison of report.comparisons) {
    lines.push(`query: ${comparison.query}`);
    lines.push(`  overlap: ${comparison.metrics.overlapCount}, jaccard: ${comparison.metrics.jaccard}`);
    lines.push(`  current top: ${comparison.current[0]?.title || 'none'}`);
    lines.push(`  baseline top: ${comparison.baseline[0]?.title || 'none'}`);
  }

  lines.push('notes:');
  for (const note of report.notes) {
    lines.push(`- ${note}`);
  }
  return lines.join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const config = createConfig();
  const report = await buildShadowCompareReport(config, options);
  process.stdout.write(`${options.json ? JSON.stringify(report, null, 2) : renderText(report)}\n`);
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  buildShadowCompareReport,
  chooseBaselineFingerprint,
  compareRankedResults,
  lexicalScore,
  loadChunksForFingerprint,
  loadQueries,
  parseArgs,
  rankChunks,
  renderText
};
