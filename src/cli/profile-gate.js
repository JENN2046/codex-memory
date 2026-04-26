#!/usr/bin/env node
const fs = require('node:fs/promises');
const path = require('node:path');

const { createConfig } = require('../config/createConfig');
const { buildShadowCompareReport } = require('./shadow-compare');

const DEFAULT_SUITE_PATH = path.resolve(__dirname, '../../benchmarks/profile-migration-suite.json');

function parseNumber(value, fallback) {
  const parsed = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 25) : fallback;
}

function parseArgs(argv) {
  const options = {
    json: false,
    suitePath: DEFAULT_SUITE_PATH,
    baselineFingerprint: '',
    limit: null,
    requirePass: false,
    summaryOnly: false,
    minAverageJaccard: null,
    minAverageOverlap: null,
    allowNoBaseline: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--require-pass') {
      options.requirePass = true;
      continue;
    }
    if (token === '--summary-only') {
      options.summaryOnly = true;
      continue;
    }
    if (token === '--disallow-no-baseline') {
      options.allowNoBaseline = false;
      continue;
    }
    if (token === '--allow-no-baseline') {
      options.allowNoBaseline = true;
      continue;
    }
    if (token === '--suite') {
      options.suitePath = path.resolve(process.cwd(), argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--baseline-fingerprint') {
      options.baselineFingerprint = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (token === '--limit') {
      options.limit = parsePositiveInt(argv[index + 1], options.limit);
      index += 1;
      continue;
    }
    if (token === '--min-average-jaccard') {
      options.minAverageJaccard = parseNumber(argv[index + 1], options.minAverageJaccard);
      index += 1;
      continue;
    }
    if (token === '--min-average-overlap') {
      options.minAverageOverlap = parseNumber(argv[index + 1], options.minAverageOverlap);
      index += 1;
    }
  }

  return options;
}

function normalizeQueries(rawQueries) {
  if (!Array.isArray(rawQueries)) return [];
  return rawQueries
    .map((item, index) => {
      if (typeof item === 'string') {
        return { id: `query-${index + 1}`, query: item.trim() };
      }
      return {
        id: String(item?.id || `query-${index + 1}`).trim(),
        query: String(item?.query || '').trim()
      };
    })
    .filter(item => item.query);
}

async function loadSuite(suitePath) {
  const parsed = JSON.parse(await fs.readFile(suitePath, 'utf8'));
  const thresholds = parsed.thresholds || {};
  return {
    name: String(parsed.name || path.basename(suitePath, path.extname(suitePath))).trim(),
    path: suitePath,
    limit: parsePositiveInt(parsed.limit, 5),
    thresholds: {
      minAverageJaccard: parseNumber(thresholds.minAverageJaccard, 0),
      minAverageOverlap: parseNumber(thresholds.minAverageOverlap, 0),
      allowNoBaseline: thresholds.allowNoBaseline !== false
    },
    queries: normalizeQueries(parsed.queries)
  };
}

function getAverageOverlap(comparisons) {
  if (comparisons.length === 0) return null;
  const total = comparisons.reduce((sum, item) => sum + item.metrics.overlapCount, 0);
  return Number((total / comparisons.length).toFixed(6));
}

function evaluateGate(compare, suite, options) {
  const thresholds = {
    ...suite.thresholds,
    minAverageJaccard: options.minAverageJaccard ?? suite.thresholds.minAverageJaccard,
    minAverageOverlap: options.minAverageOverlap ?? suite.thresholds.minAverageOverlap,
    allowNoBaseline: options.allowNoBaseline ?? suite.thresholds.allowNoBaseline
  };
  const checks = [];
  const averageJaccard = compare.summary.averageJaccard;
  const averageOverlap = getAverageOverlap(compare.comparisons);

  if (suite.queries.length === 0) {
    checks.push({
      level: 'fail',
      code: 'suite-empty',
      message: 'Profile gate suite has no queries.'
    });
  }

  if (compare.status === 'no-baseline') {
    checks.push({
      level: thresholds.allowNoBaseline ? 'warn' : 'fail',
      code: 'baseline-missing',
      message: 'No baseline profile chunks were found for comparison.'
    });
  }

  if (compare.status === 'lexical-only') {
    checks.push({
      level: 'warn',
      code: 'lexical-only',
      message: 'Baseline vectors are not comparable; this gate used lexical overlap only.'
    });
  }

  if (compare.status === 'approximate') {
    checks.push({
      level: 'warn',
      code: 'approximate-vector-compare',
      message: 'Baseline profile differs from current profile; vector scores are directional.'
    });
  }

  if (averageJaccard !== null && averageJaccard < thresholds.minAverageJaccard) {
    checks.push({
      level: 'fail',
      code: 'average-jaccard-low',
      message: `Average Jaccard ${averageJaccard} is below threshold ${thresholds.minAverageJaccard}.`
    });
  }

  if (averageOverlap !== null && averageOverlap < thresholds.minAverageOverlap) {
    checks.push({
      level: 'fail',
      code: 'average-overlap-low',
      message: `Average overlap ${averageOverlap} is below threshold ${thresholds.minAverageOverlap}.`
    });
  }

  const hasFail = checks.some(check => check.level === 'fail');
  const hasWarn = checks.some(check => check.level === 'warn');
  return {
    status: hasFail ? 'fail' : hasWarn ? 'warn' : 'pass',
    thresholds,
    summary: {
      averageJaccard,
      averageOverlap,
      comparableStatus: compare.status,
      queryCount: suite.queries.length
    },
    checks
  };
}

function summarizeComparisons(comparisons) {
  return comparisons.map(item => ({
    query: item.query,
    metrics: item.metrics,
    currentTop: item.current[0]
      ? {
          memoryId: item.current[0].memoryId,
          title: item.current[0].title,
          score: item.current[0].score
        }
      : null,
    baselineTop: item.baseline[0]
      ? {
          memoryId: item.baseline[0].memoryId,
          title: item.baseline[0].title,
          score: item.baseline[0].score
        }
      : null
  }));
}

async function buildProfileGateReport(config, options) {
  const suite = await loadSuite(options.suitePath);
  const limit = options.limit || suite.limit;
  const compare = await buildShadowCompareReport(config, {
    queries: suite.queries.map(item => item.query),
    baselineFingerprint: options.baselineFingerprint,
    limit
  });
  const evaluation = evaluateGate(compare, suite, options);

  return {
    mode: 'profile-gate',
    destructive: false,
    status: evaluation.status,
    suite: {
      name: suite.name,
      path: suite.path,
      queryCount: suite.queries.length,
      limit,
      thresholds: evaluation.thresholds
    },
    embeddingProfile: compare.embeddingProfile,
    baselineProfile: compare.baselineProfile,
    summary: evaluation.summary,
    checks: evaluation.checks,
    comparisons: summarizeComparisons(compare.comparisons),
    compare: options.summaryOnly ? undefined : compare,
    notes: [
      'This command is read-only.',
      'Use --summary-only to omit full ranked results from JSON output.',
      'Use --require-pass to make a failing gate return a non-zero exit code.'
    ]
  };
}

function renderText(report) {
  const lines = [
    'codex-memory profile gate',
    `status: ${report.status}`,
    `suite: ${report.suite.name}`,
    `current: ${report.embeddingProfile.fingerprint}`,
    `baseline: ${report.baselineProfile.fingerprint || 'none'}`,
    `queries: ${report.summary.queryCount}`,
    `shadow status: ${report.summary.comparableStatus}`,
    `average jaccard: ${report.summary.averageJaccard ?? 'n/a'}`,
    `average overlap: ${report.summary.averageOverlap ?? 'n/a'}`
  ];

  if (report.checks.length > 0) {
    lines.push('checks:');
    for (const check of report.checks) {
      lines.push(`- ${check.level} ${check.code}: ${check.message}`);
    }
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
  const report = await buildProfileGateReport(config, options);
  process.stdout.write(`${options.json ? JSON.stringify(report, null, 2) : renderText(report)}\n`);
  if (options.requirePass && report.status === 'fail') {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  buildProfileGateReport,
  evaluateGate,
  loadSuite,
  parseArgs,
  renderText
};
