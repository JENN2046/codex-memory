#!/usr/bin/env node
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');

const { readStdin } = require('./active-memory-cli-common');

function parseArgs(argv = []) {
  const options = {
    json: false,
    tool: '',
    category: '',
    expectation: '',
    fixture: '',
    tag: '',
    tagAll: '',
    excludeTag: '',
    excludeFixture: '',
    suiteFile: '',
    inputFile: '',
    legacyScript: '',
    cwd: process.cwd(),
    timeoutMs: 30000,
    requireReady: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--tool') {
      options.tool = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (token === '--category') {
      options.category = String(argv[index + 1] || '').trim().toLowerCase();
      index += 1;
      continue;
    }
    if (token === '--expectation') {
      options.expectation = String(argv[index + 1] || '').trim().toLowerCase();
      index += 1;
      continue;
    }
    if (token === '--fixture') {
      options.fixture = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (token === '--tag') {
      options.tag = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (token === '--tag-all') {
      options.tagAll = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (token === '--exclude-tag') {
      options.excludeTag = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (token === '--exclude-fixture') {
      options.excludeFixture = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (token === '--suite') {
      options.suiteFile = path.resolve(process.cwd(), argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--input-file') {
      options.inputFile = path.resolve(process.cwd(), argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--legacy-script') {
      options.legacyScript = path.resolve(process.cwd(), argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--cwd') {
      options.cwd = path.resolve(process.cwd(), argv[index + 1] || '.');
      index += 1;
      continue;
    }
    if (token === '--timeout-ms') {
      const parsed = Number.parseInt(String(argv[index + 1] || ''), 10);
      if (Number.isInteger(parsed) && parsed > 0) {
        options.timeoutMs = parsed;
      }
      index += 1;
      continue;
    }
    if (token === '--require-ready') {
      options.requireReady = true;
    }
  }

  return options;
}

function parseMaybeJson(text = '') {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // Fall back to scanning the trailing JSON line.
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      return JSON.parse(lines[index]);
    } catch {
      // Ignore non-JSON lines such as warnings.
    }
  }

  return null;
}

function runCompareCli({ input, options }) {
  return new Promise(resolve => {
    const args = [path.resolve(__dirname, 'compare-vcp-active-memory.js'), '--json'];

    if (options.suiteFile) {
      args.push('--suite', options.suiteFile);
    } else {
      args.push('--tool', options.tool);
    }
    if (options.suiteFile && options.tool) {
      args.push('--tool', options.tool);
    }

    if (options.legacyScript) {
      args.push('--legacy-script', options.legacyScript);
    }
    if (options.category) {
      args.push('--category', options.category);
    }
    if (options.expectation) {
      args.push('--expectation', options.expectation);
    }
    if (options.fixture) {
      args.push('--fixture', options.fixture);
    }
    if (options.tag) {
      args.push('--tag', options.tag);
    }
    if (options.tagAll) {
      args.push('--tag-all', options.tagAll);
    }
    if (options.excludeTag) {
      args.push('--exclude-tag', options.excludeTag);
    }
    if (options.excludeFixture) {
      args.push('--exclude-fixture', options.excludeFixture);
    }
    if (options.cwd) {
      args.push('--cwd', options.cwd);
    }
    if (options.timeoutMs) {
      args.push('--timeout-ms', String(options.timeoutMs));
    }

    let stdout = '';
    let stderr = '';
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    child.stdout.on('data', chunk => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString('utf8');
    });
    child.on('close', code => {
      resolve({ code, stdout, stderr });
    });
    child.on('error', error => {
      resolve({
        code: null,
        stdout,
        stderr,
        error: error.message
      });
    });
    child.stdin.end(options.suiteFile ? '' : input);
  });
}

function buildRollbackSummary(compareReport) {
  const legacyAvailable = !!compareReport?.comparison?.available;
  const newReady = !!compareReport?.newRun?.payload && !compareReport?.newRun?.timedOut;
  const legacyReady = !!compareReport?.legacyRun?.payload && !compareReport?.legacyRun?.timedOut;
  const matched = compareReport?.comparison?.matched === true;
  const coreMismatchCount = compareReport?.comparison?.coreDiff?.mismatchedCount ?? 0;
  const extendedMismatchCount = compareReport?.comparison?.extendedDiff?.mismatchedCount ?? 0;

  let recommendation = 'keep-new-default';
  let message = 'New implementation remains the default path.';
  let rollbackReady = false;

  if (!legacyAvailable) {
    recommendation = 'legacy-unavailable';
    message = 'Legacy script is unavailable, so rollback cannot be validated.';
  } else if (!newReady) {
    recommendation = 'new-path-broken';
    message = 'New path did not produce a valid compare payload. Investigate before rollback decisions.';
  } else if (!legacyReady) {
    recommendation = 'legacy-path-broken';
    message = 'Legacy path did not produce a valid payload. Rollback is not ready.';
  } else if (matched) {
    recommendation = 'rollback-safe';
    message = 'New and legacy outputs match on the core compatibility path. Rollback is ready if needed.';
    rollbackReady = true;
  } else {
    recommendation = 'investigate-before-rollback';
    message = 'New and legacy outputs differ. Investigate the reported field diffs before rollback.';
  }

  const blockerReasons = buildRollbackBlockerReasons({
    legacyAvailable,
    newReady,
    legacyReady,
    matched,
    comparison: compareReport?.comparison
  });
  const outcome = rollbackReady ? 'rollback-safe' : recommendation;

  return {
    ok: rollbackReady,
    rollbackReady,
    legacyAvailable,
    newReady,
    legacyReady,
    matched,
    coreMismatchCount,
    extendedMismatchCount,
    outcome,
    blockerReasons,
    recommendation,
    message
  };
}

function buildRollbackBlockerReasons({
  legacyAvailable,
  newReady,
  legacyReady,
  matched,
  comparison
}) {
  if (!legacyAvailable) {
    return ['legacy-unavailable'];
  }
  if (!newReady) {
    return ['new-path-broken'];
  }
  if (!legacyReady) {
    return ['legacy-path-broken'];
  }
  if (matched) {
    return [];
  }

  const reasons = new Set();
  if (comparison?.statusMatch === false) {
    reasons.add('status-mismatch');
  }
  if (comparison?.exitCodeMatch === false) {
    reasons.add('exit-code-mismatch');
  }
  if (comparison?.resultMatch === false) {
    reasons.add('result-mismatch');
  }
  if (comparison?.errorMatch === false) {
    reasons.add('error-mismatch');
  }
  if ((comparison?.coreDiff?.mismatchedCount ?? 0) > 0) {
    reasons.add('core-diff');
  }
  if (
    (comparison?.extendedDiff?.mismatchedCount ?? 0) > 0
    && (comparison?.coreDiff?.mismatchedCount ?? 0) === 0
  ) {
    reasons.add('extended-only-drift');
  }
  if (reasons.size === 0) {
    reasons.add('comparison-mismatch');
  }

  return [...reasons].sort((left, right) => left.localeCompare(right));
}

function normalizeCaseCategory(meta = null) {
  const category = typeof meta?.category === 'string' ? meta.category.trim() : '';
  return category || 'uncategorized';
}

function normalizeCaseFixture(meta = null) {
  const fixture = typeof meta?.fixture === 'string' ? meta.fixture.trim() : '';
  return fixture || 'unknown';
}

function incrementBreakdownCount(map, key) {
  if (!(map instanceof Map) || typeof key !== 'string' || !key.trim()) {
    return;
  }
  map.set(key, (map.get(key) || 0) + 1);
}

function finalizeBreakdownMap(map) {
  if (!(map instanceof Map) || map.size === 0) {
    return {};
  }
  return Object.fromEntries(
    [...map.entries()].sort((left, right) => left[0].localeCompare(right[0]))
  );
}

function formatBreakdownInline(breakdown = {}, { limit = 6 } = {}) {
  if (!breakdown || typeof breakdown !== 'object') {
    return '';
  }

  const entries = Object.entries(breakdown)
    .filter(([, count]) => Number.isFinite(count) && count > 0)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));

  if (entries.length === 0) {
    return '';
  }

  return entries
    .slice(0, limit)
    .map(([key, count]) => `${key}=${count}`)
    .join(', ');
}

function buildRollbackCategoryAggregate(caseReports = []) {
  const categoryMap = new Map();

  for (const caseReport of caseReports) {
    const category = normalizeCaseCategory(caseReport?.meta);
    const fixture = normalizeCaseFixture(caseReport?.meta);
    let aggregate = categoryMap.get(category);
    if (!aggregate) {
      aggregate = {
        category,
        totalCaseCount: 0,
        readyCaseCount: 0,
        notReadyCaseCount: 0,
        coreMismatchCountTotal: 0,
        extendedMismatchCountTotal: 0,
        expectedSuccessCaseCount: 0,
        expectedErrorCaseCount: 0,
        fixtures: new Set(),
        caseNames: [],
        recommendationBreakdownMap: new Map(),
        blockerBreakdownMap: new Map(),
        fixtureAggregateMap: new Map()
      };
      categoryMap.set(category, aggregate);
    }

    let fixtureAggregate = aggregate.fixtureAggregateMap.get(fixture);
    if (!fixtureAggregate) {
      fixtureAggregate = {
        fixture,
        totalCaseCount: 0,
        readyCaseCount: 0,
        notReadyCaseCount: 0,
        coreMismatchCountTotal: 0,
        extendedMismatchCountTotal: 0,
        expectedSuccessCaseCount: 0,
        expectedErrorCaseCount: 0,
        caseNames: [],
        recommendationBreakdownMap: new Map(),
        blockerBreakdownMap: new Map()
      };
      aggregate.fixtureAggregateMap.set(fixture, fixtureAggregate);
    }

    aggregate.totalCaseCount += 1;
    fixtureAggregate.totalCaseCount += 1;
    if (caseReport?.summary?.rollbackReady) {
      aggregate.readyCaseCount += 1;
      fixtureAggregate.readyCaseCount += 1;
    } else {
      aggregate.notReadyCaseCount += 1;
      fixtureAggregate.notReadyCaseCount += 1;
    }
    aggregate.coreMismatchCountTotal += caseReport?.summary?.coreMismatchCount ?? 0;
    aggregate.extendedMismatchCountTotal += caseReport?.summary?.extendedMismatchCount ?? 0;
    fixtureAggregate.coreMismatchCountTotal += caseReport?.summary?.coreMismatchCount ?? 0;
    fixtureAggregate.extendedMismatchCountTotal += caseReport?.summary?.extendedMismatchCount ?? 0;
    incrementBreakdownCount(aggregate.recommendationBreakdownMap, caseReport?.summary?.recommendation);
    incrementBreakdownCount(fixtureAggregate.recommendationBreakdownMap, caseReport?.summary?.recommendation);
    if (!caseReport?.summary?.rollbackReady) {
      incrementBreakdownCount(aggregate.blockerBreakdownMap, caseReport?.summary?.recommendation);
      incrementBreakdownCount(fixtureAggregate.blockerBreakdownMap, caseReport?.summary?.recommendation);
    }

    const expectation = typeof caseReport?.meta?.expectation === 'string'
      ? caseReport.meta.expectation.trim()
      : '';
    if (expectation === 'success') {
      aggregate.expectedSuccessCaseCount += 1;
      fixtureAggregate.expectedSuccessCaseCount += 1;
    } else if (expectation === 'error') {
      aggregate.expectedErrorCaseCount += 1;
      fixtureAggregate.expectedErrorCaseCount += 1;
    }

    aggregate.fixtures.add(fixture);
    aggregate.caseNames.push(caseReport?.name || '');
    fixtureAggregate.caseNames.push(caseReport?.name || '');
  }

  return [...categoryMap.values()]
    .map(item => {
      const {
        fixtureAggregateMap,
        recommendationBreakdownMap,
        blockerBreakdownMap,
        ...rest
      } = item;
      return {
        ...rest,
        rollbackReady: item.totalCaseCount > 0 && item.readyCaseCount === item.totalCaseCount,
        recommendationBreakdown: finalizeBreakdownMap(recommendationBreakdownMap),
        blockerBreakdown: finalizeBreakdownMap(blockerBreakdownMap),
        fixtures: [...item.fixtures].sort((left, right) => left.localeCompare(right)),
        caseNames: item.caseNames.filter(Boolean).sort((left, right) => left.localeCompare(right)),
        fixtureAggregate: [...fixtureAggregateMap.values()]
          .map(fixtureItem => {
            const {
              recommendationBreakdownMap: fixtureRecommendationBreakdownMap,
              blockerBreakdownMap: fixtureBlockerBreakdownMap,
              ...fixtureRest
            } = fixtureItem;
            return {
              ...fixtureRest,
              rollbackReady: fixtureItem.totalCaseCount > 0 && fixtureItem.readyCaseCount === fixtureItem.totalCaseCount,
              recommendationBreakdown: finalizeBreakdownMap(fixtureRecommendationBreakdownMap),
              blockerBreakdown: finalizeBreakdownMap(fixtureBlockerBreakdownMap),
              caseNames: fixtureItem.caseNames
                .filter(Boolean)
                .sort((left, right) => left.localeCompare(right))
            };
          })
          .sort((left, right) => left.fixture.localeCompare(right.fixture))
      };
    })
    .sort((left, right) => left.category.localeCompare(right.category));
}

function buildSuiteRollbackReport(compareReport) {
  const cases = Array.isArray(compareReport?.cases) ? compareReport.cases : [];
  const caseReports = cases.map(caseReport => ({
    name: caseReport.name,
    tool: caseReport.tool,
    meta: caseReport.meta || null,
    summary: buildRollbackSummary(caseReport),
    comparison: caseReport.comparison
  }));

  const totalCaseCount = caseReports.length;
  const readyCaseCount = caseReports.filter(caseReport => caseReport.summary.rollbackReady).length;
  const notReadyCaseCount = totalCaseCount - readyCaseCount;
  const coreMismatchCountTotal = caseReports.reduce((sum, caseReport) => sum + (caseReport.summary.coreMismatchCount || 0), 0);
  const extendedMismatchCountTotal = caseReports.reduce((sum, caseReport) => sum + (caseReport.summary.extendedMismatchCount || 0), 0);
  const rollbackReadyAll = totalCaseCount > 0 && readyCaseCount === totalCaseCount;
  const categoryAggregate = buildRollbackCategoryAggregate(caseReports);
  const recommendationBreakdownMap = new Map();
  const blockerBreakdownMap = new Map();

  for (const caseReport of caseReports) {
    incrementBreakdownCount(recommendationBreakdownMap, caseReport?.summary?.recommendation);
    if (!caseReport?.summary?.rollbackReady) {
      incrementBreakdownCount(blockerBreakdownMap, caseReport?.summary?.recommendation);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    mode: 'suite',
    tool: compareReport.tool || 'mixed',
    categoryFilter: compareReport.categoryFilter ?? null,
    expectationFilter: compareReport.expectationFilter ?? null,
    toolFilter: compareReport.toolFilter ?? null,
    fixtureFilter: compareReport.fixtureFilter ?? null,
    tagFilter: compareReport.tagFilter ?? null,
    tagAllFilter: compareReport.tagAllFilter ?? null,
    excludeTagFilter: compareReport.excludeTagFilter ?? null,
    excludeFixtureFilter: compareReport.excludeFixtureFilter ?? null,
    summary: {
      ok: rollbackReadyAll,
      rollbackReady: rollbackReadyAll,
      totalCaseCount,
      readyCaseCount,
      notReadyCaseCount,
      coreMismatchCountTotal,
      extendedMismatchCountTotal,
      recommendationBreakdown: finalizeBreakdownMap(recommendationBreakdownMap),
      blockerBreakdown: finalizeBreakdownMap(blockerBreakdownMap),
      recommendation: rollbackReadyAll ? 'rollback-safe' : 'investigate-before-rollback',
      message: rollbackReadyAll
        ? 'All suite cases are rollback-ready.'
        : 'Suite contains cases that are not rollback-ready.'
    },
    categoryAggregate,
    cases: caseReports,
    compareReport
  };
}

function formatTextReport(report) {
  const lines = [
    `status: ${report.summary.ok ? 'ok' : 'error'}`,
    report.summary.message,
    `tool: ${report.tool}`,
    `rollbackReady: ${report.summary.rollbackReady}`,
    `outcome: ${report.summary.outcome}`,
    `recommendation: ${report.summary.recommendation}`,
    `coreMismatchCount: ${report.summary.coreMismatchCount}`,
    `extendedMismatchCount: ${report.summary.extendedMismatchCount}`
  ];
  if (Array.isArray(report.summary.blockerReasons) && report.summary.blockerReasons.length > 0) {
    lines.push(`blockerReasons: ${report.summary.blockerReasons.join(', ')}`);
  }
  return `${lines.join('\n')}\n`;
}

function formatSuiteTextReport(report) {
  const lines = [
    `status: ${report.summary.ok ? 'ok' : 'error'}`,
    report.summary.message,
    `rollbackReady: ${report.summary.rollbackReady}`,
    `totalCaseCount: ${report.summary.totalCaseCount}`,
    `readyCaseCount: ${report.summary.readyCaseCount}`,
    `notReadyCaseCount: ${report.summary.notReadyCaseCount}`,
    `recommendation: ${report.summary.recommendation}`,
    `coreMismatchCountTotal: ${report.summary.coreMismatchCountTotal}`,
    `extendedMismatchCountTotal: ${report.summary.extendedMismatchCountTotal}`
  ];
  const recommendationBreakdownText = formatBreakdownInline(report.summary.recommendationBreakdown);
  if (recommendationBreakdownText) {
    lines.push(`recommendationBreakdown: ${recommendationBreakdownText}`);
  }
  const blockerBreakdownText = formatBreakdownInline(report.summary.blockerBreakdown);
  if (blockerBreakdownText) {
    lines.push(`blockerBreakdown: ${blockerBreakdownText}`);
  }
  if (report.categoryFilter) {
    lines.push(`categoryFilter: ${report.categoryFilter}`);
  }
  if (Array.isArray(report.expectationFilter) && report.expectationFilter.length > 0) {
    lines.push(`expectationFilter: ${report.expectationFilter.join(', ')}`);
  }
  if (Array.isArray(report.toolFilter) && report.toolFilter.length > 0) {
    lines.push(`toolFilter: ${report.toolFilter.join(', ')}`);
  }
  if (Array.isArray(report.fixtureFilter) && report.fixtureFilter.length > 0) {
    lines.push(`fixtureFilter: ${report.fixtureFilter.join(', ')}`);
  }
  if (Array.isArray(report.tagFilter) && report.tagFilter.length > 0) {
    lines.push(`tagFilter: ${report.tagFilter.join(', ')}`);
  }
  if (Array.isArray(report.tagAllFilter) && report.tagAllFilter.length > 0) {
    lines.push(`tagAllFilter: ${report.tagAllFilter.join(', ')}`);
  }
  if (Array.isArray(report.excludeTagFilter) && report.excludeTagFilter.length > 0) {
    lines.push(`excludeTagFilter: ${report.excludeTagFilter.join(', ')}`);
  }
  if (Array.isArray(report.excludeFixtureFilter) && report.excludeFixtureFilter.length > 0) {
    lines.push(`excludeFixtureFilter: ${report.excludeFixtureFilter.join(', ')}`);
  }

  if (Array.isArray(report.categoryAggregate) && report.categoryAggregate.length > 0) {
    lines.push('');
    lines.push('[category-aggregate]');
    for (const item of report.categoryAggregate) {
      const blockerPreview = formatBreakdownInline(item.blockerBreakdown, { limit: 3 });
      lines.push(
        `  ${item.category}: total=${item.totalCaseCount} ready=${item.readyCaseCount} notReady=${item.notReadyCaseCount} coreMismatchCount=${item.coreMismatchCountTotal}${blockerPreview ? ` blockers=${blockerPreview}` : ''}`
      );
      if (Array.isArray(item.fixtureAggregate) && item.fixtureAggregate.length > 0) {
        for (const fixtureItem of item.fixtureAggregate) {
          const fixtureBlockerPreview = formatBreakdownInline(fixtureItem.blockerBreakdown, { limit: 2 });
          lines.push(
            `    ${fixtureItem.fixture}: total=${fixtureItem.totalCaseCount} ready=${fixtureItem.readyCaseCount} notReady=${fixtureItem.notReadyCaseCount} coreMismatchCount=${fixtureItem.coreMismatchCountTotal}${fixtureBlockerPreview ? ` blockers=${fixtureBlockerPreview}` : ''}`
          );
        }
      }
    }
  }

  for (const caseReport of report.cases) {
    lines.push('');
    lines.push(`[case:${caseReport.name}] tool=${caseReport.tool} rollbackReady=${caseReport.summary.rollbackReady}`);
    lines.push(`  outcome: ${caseReport.summary.outcome}`);
    lines.push(`  recommendation: ${caseReport.summary.recommendation}`);
    if (Array.isArray(caseReport.summary.blockerReasons) && caseReport.summary.blockerReasons.length > 0) {
      lines.push(`  blockerReasons: ${caseReport.summary.blockerReasons.join(', ')}`);
    }
    lines.push(`  coreMismatchCount: ${caseReport.summary.coreMismatchCount}`);
    lines.push(`  extendedMismatchCount: ${caseReport.summary.extendedMismatchCount}`);
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.tool && !options.suiteFile) {
    throw new Error('Missing required --tool. Supported values: deepmemo, topicmemo.');
  }

  const input = options.suiteFile
    ? ''
    : (
      options.inputFile
        ? await fs.readFile(options.inputFile, 'utf8')
        : await readStdin()
    );

  const compareExecution = await runCompareCli({
    input,
    options
  });
  const compareReport = parseMaybeJson(compareExecution.stdout) || parseMaybeJson(compareExecution.stderr);

  if (!compareReport || typeof compareReport !== 'object') {
    throw new Error(`Unable to parse compare report. stdout=${compareExecution.stdout} stderr=${compareExecution.stderr}`);
  }

  const report = compareReport.mode === 'suite'
    ? buildSuiteRollbackReport(compareReport)
    : {
        generatedAt: new Date().toISOString(),
        mode: 'single',
        tool: options.tool,
        summary: buildRollbackSummary(compareReport),
        compareReport
      };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(report.mode === 'suite' ? formatSuiteTextReport(report) : formatTextReport(report));
  }

  if (options.requireReady && !report.summary.rollbackReady) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
