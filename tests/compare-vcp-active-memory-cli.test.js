const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const STANDARD_SUITE_DIR = path.join(process.cwd(), 'benchmarks', 'active-memory-suite');
const STANDARD_SUITE_PATH = path.join(STANDARD_SUITE_DIR, 'standard-suite.json');
const STANDARD_FIXTURE_ROOT = path.join(STANDARD_SUITE_DIR, 'vchat-fixture');
const STANDARD_FIXTURE_PREFIX = 'vchat-fixture';
const FIXTURE_MANIFEST_BASENAME = '.codex-fixture-manifest.json';

function runCli({ scriptPath, env = {}, args = [], stdin = '' }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...env
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', reject);
    child.on('close', code => {
      resolve({ code, stdout, stderr });
    });
    child.stdin.end(stdin);
  });
}

function parseJsonOutput(text = '') {
  const trimmed = String(text || '').trim();
  if (trimmed) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Fall back to scanning line-by-line for warning-prefixed output.
    }
  }

  const lines = String(text || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      return JSON.parse(lines[index]);
    } catch {
      // Ignore non-JSON warning lines.
    }
  }

  return JSON.parse(trimmed);
}

async function seedVchatFixture(rootPath) {
  const agentId = 'maid-keke';
  const topicAlphaId = 'topic_alpha';
  const alphaHistoryPath = path.join(rootPath, 'UserData', agentId, 'topics', topicAlphaId, 'history.json');

  await fs.mkdir(path.join(rootPath, 'Agents', agentId), { recursive: true });
  await fs.mkdir(path.join(rootPath, 'UserData', agentId, 'topics', topicAlphaId), { recursive: true });
  await fs.writeFile(path.join(rootPath, 'settings.json'), JSON.stringify({ userName: 'Master' }, null, 2), 'utf8');
  await fs.writeFile(
    path.join(rootPath, 'Agents', agentId, 'config.json'),
    JSON.stringify({
      name: 'Keke',
      topics: [
        { id: topicAlphaId, name: 'System Plan', createdAt: '2026-04-21T10:00:00.000Z', locked: false }
      ]
    }, null, 2),
    'utf8'
  );
  await fs.writeFile(
    alphaHistoryPath,
    JSON.stringify([
      { role: 'user', content: 'We should discuss the codex-memory system plan.' },
      { role: 'assistant', content: 'Phase C recall audit should stay aligned.' }
    ], null, 2),
    'utf8'
  );
}

function normalizeFixtureRelativePath(rootPath, targetPath) {
  return path.relative(rootPath, targetPath).replace(/\\/g, '/');
}

async function listHistoryFiles(rootPath) {
  const historyFiles = [];

  async function walk(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
        continue;
      }
      if (entry.isFile() && entry.name === 'history.json') {
        historyFiles.push(entryPath);
      }
    }
  }

  await walk(rootPath);
  return historyFiles.sort((left, right) => left.localeCompare(right));
}

async function listFilesByBasename(rootPath, basename) {
  const matchedFiles = [];

  async function walk(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
        continue;
      }
      if (entry.isFile() && entry.name === basename) {
        matchedFiles.push(entryPath);
      }
    }
  }

  await walk(rootPath);
  return matchedFiles.sort((left, right) => left.localeCompare(right));
}

test('standard active-memory suite fixture manifests should cover every fixture root and history file', async () => {
  const suiteRaw = await fs.readFile(STANDARD_SUITE_PATH, 'utf8');
  const suiteDefinition = JSON.parse(suiteRaw);
  const directoryEntries = await fs.readdir(STANDARD_SUITE_DIR, { withFileTypes: true });
  const fixtureDirectories = directoryEntries
    .filter(entry => entry.isDirectory() && entry.name.startsWith(STANDARD_FIXTURE_PREFIX))
    .map(entry => path.join(STANDARD_SUITE_DIR, entry.name))
    .sort((left, right) => left.localeCompare(right));
  const manifestRoots = (await listFilesByBasename(STANDARD_SUITE_DIR, FIXTURE_MANIFEST_BASENAME))
    .map(filePath => path.dirname(filePath))
    .sort((left, right) => left.localeCompare(right));

  assert.ok(fixtureDirectories.length > 0);
  assert.deepEqual(
    manifestRoots,
    fixtureDirectories,
    'Every standard fixture root must be named with the vchat-fixture* convention and carry exactly one manifest.'
  );

  const suiteFixtureRoots = new Set();
  for (const caseDefinition of suiteDefinition.cases || []) {
    const rootValue = caseDefinition?.env?.CODEX_MEMORY_ACTIVE_MEMORY_ROOT;
    if (typeof rootValue !== 'string' || !rootValue.trim()) continue;
    const resolvedRoot = path.resolve(STANDARD_SUITE_DIR, rootValue);
    assert.equal(
      path.dirname(resolvedRoot),
      STANDARD_SUITE_DIR,
      `Standard suite fixture roots must stay under ${STANDARD_SUITE_DIR}: ${resolvedRoot}`
    );
    assert.ok(
      path.basename(resolvedRoot).startsWith(STANDARD_FIXTURE_PREFIX),
      `Standard suite fixture root must use the ${STANDARD_FIXTURE_PREFIX}* naming convention: ${resolvedRoot}`
    );
    suiteFixtureRoots.add(resolvedRoot);
  }

  for (const fixtureDirectory of fixtureDirectories) {
    assert.ok(
      suiteFixtureRoots.has(fixtureDirectory),
      `Fixture root is not referenced by the standard suite: ${fixtureDirectory}`
    );

    const manifestPath = path.join(fixtureDirectory, '.codex-fixture-manifest.json');
    const manifestRaw = await fs.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestRaw);
    const manifestTimestamps = manifest && typeof manifest.timestamps === 'object' && !Array.isArray(manifest.timestamps)
      ? manifest.timestamps
      : {};

    const manifestPaths = Object.keys(manifestTimestamps)
      .map(relativePath => relativePath.replace(/\\/g, '/'))
      .sort((left, right) => left.localeCompare(right));
    const historyPaths = (await listHistoryFiles(fixtureDirectory))
      .map(filePath => normalizeFixtureRelativePath(fixtureDirectory, filePath))
      .sort((left, right) => left.localeCompare(right));

    assert.deepEqual(
      manifestPaths,
      historyPaths,
      `Fixture manifest coverage drifted for ${fixtureDirectory}`
    );
  }
});

test('standard active-memory suite cases should carry validated classification metadata', async () => {
  const suiteRaw = await fs.readFile(STANDARD_SUITE_PATH, 'utf8');
  const suiteDefinition = JSON.parse(suiteRaw);
  const allowedCategories = new Set(suiteDefinition.metaSchema?.categoryValues || []);
  const allowedExpectations = new Set(suiteDefinition.metaSchema?.expectationValues || []);
  const requiredCaseFields = suiteDefinition.metaSchema?.requiredCaseFields || [];

  assert.equal(suiteDefinition.metaVersion, 1);
  assert.ok(requiredCaseFields.length > 0);
  assert.ok(allowedCategories.size > 0);
  assert.ok(allowedExpectations.size > 0);

  for (const caseDefinition of suiteDefinition.cases || []) {
    assert.ok(caseDefinition.meta && typeof caseDefinition.meta === 'object', `Case is missing meta: ${caseDefinition.name}`);

    for (const field of requiredCaseFields) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(caseDefinition.meta, field),
        `Case meta is missing ${field}: ${caseDefinition.name}`
      );
    }

    assert.ok(
      allowedCategories.has(caseDefinition.meta.category),
      `Case meta.category is invalid: ${caseDefinition.name} -> ${caseDefinition.meta.category}`
    );
    assert.ok(
      allowedExpectations.has(caseDefinition.meta.expectation),
      `Case meta.expectation is invalid: ${caseDefinition.name} -> ${caseDefinition.meta.expectation}`
    );
    assert.ok(Array.isArray(caseDefinition.meta.tags) && caseDefinition.meta.tags.length > 0, `Case meta.tags is empty: ${caseDefinition.name}`);

    const rootValue = caseDefinition?.env?.CODEX_MEMORY_ACTIVE_MEMORY_ROOT;
    assert.equal(
      path.basename(path.resolve(STANDARD_SUITE_DIR, rootValue)),
      caseDefinition.meta.fixture,
      `Case meta.fixture drifted from env root: ${caseDefinition.name}`
    );
  }
});

test('compare active-memory CLI should match donor-style error semantics with a legacy script', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-compare-cli-'));

  try {
    const input = JSON.stringify({ keyword: 'Phase C' });
    const baseline = await runCli({
      scriptPath: 'src/cli/deepmemo.js',
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: 'data',
        CODEX_MEMORY_LOGS_DIR: 'logs'
      },
      stdin: input
    });

    assert.equal(baseline.code, 1);
    const baselineError = parseJsonOutput(baseline.stderr);
    const legacyScriptPath = path.join(tempBasePath, 'legacy-deepmemo.js');
    await fs.writeFile(
      legacyScriptPath,
      [
        "process.stderr.write(JSON.stringify({",
        "  status: 'error',",
        `  error: ${JSON.stringify(baselineError.error)},`,
        `  meta: ${JSON.stringify(baselineError.meta || {})}`,
        "}) + '\\n');",
        'process.exit(1);'
      ].join('\n'),
      'utf8'
    );

    const result = await runCli({
      scriptPath: 'src/cli/compare-vcp-active-memory.js',
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: 'data',
        CODEX_MEMORY_LOGS_DIR: 'logs'
      },
      args: [
        '--json',
        '--tool',
        'deepmemo',
        '--legacy-script',
        legacyScriptPath,
        '--require-match'
      ],
      stdin: input
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = parseJsonOutput(result.stdout);
    assert.equal(payload.summary.ok, true);
    assert.equal(payload.summary.comparable, true);
    assert.equal(payload.comparison.available, true);
    assert.equal(payload.comparison.statusMatch, true);
    assert.equal(payload.comparison.exitCodeMatch, true);
    assert.equal(payload.comparison.errorMatch, true);
    assert.equal(payload.comparison.matched, true);
    assert.equal(payload.comparison.coreDiff.mismatchedCount, 0);
    assert.equal(payload.comparison.extendedDiff.mismatchedCount, 0);
    assert.equal(payload.newRun.status, 'error');
    assert.equal(payload.legacyRun.status, 'error');
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('compare active-memory CLI should match donor-style success semantics with a legacy script', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-compare-success-cli-'));
  const vchatRoot = path.join(tempBasePath, 'vchat-fixture');

  await seedVchatFixture(vchatRoot);

  try {
    const input = JSON.stringify({
      maid: 'Keke',
      keyword: 'Phase C recall audit',
      exclude_latest: false
    });
    const env = {
      CODEX_MEMORY_BASE_PATH: tempBasePath,
      CODEX_MEMORY_DATA_DIR: 'data',
      CODEX_MEMORY_LOGS_DIR: 'logs',
      CODEX_MEMORY_ACTIVE_MEMORY_ROOT: vchatRoot,
      CODEX_MEMORY_ACTIVE_MEMORY_SYNC_MIN_INTERVAL_MS: '0'
    };

    const baseline = await runCli({
      scriptPath: 'src/cli/deepmemo.js',
      env,
      stdin: input
    });

    assert.equal(baseline.code, 0, baseline.stderr);
    const baselinePayload = parseJsonOutput(baseline.stdout);
    const legacyScriptPath = path.join(tempBasePath, 'legacy-success-deepmemo.js');
    await fs.writeFile(
      legacyScriptPath,
      [
        "process.stdout.write(JSON.stringify({",
        "  status: 'success',",
        `  result: ${JSON.stringify(baselinePayload.result)}`,
        "}) + '\\n');"
      ].join('\n'),
      'utf8'
    );

    const result = await runCli({
      scriptPath: 'src/cli/compare-vcp-active-memory.js',
      env,
      args: [
        '--json',
        '--tool',
        'deepmemo',
        '--legacy-script',
        legacyScriptPath,
        '--require-match'
      ],
      stdin: input
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = parseJsonOutput(result.stdout);
    assert.equal(payload.summary.ok, true);
    assert.equal(payload.comparison.available, true);
    assert.equal(payload.comparison.statusMatch, true);
    assert.equal(payload.comparison.exitCodeMatch, true);
    assert.equal(payload.comparison.resultMatch, true);
    assert.equal(payload.comparison.matched, true);
    assert.equal(payload.comparison.coreDiff.mismatchedCount, 0);
    assert.equal(payload.newRun.status, 'success');
    assert.equal(payload.legacyRun.status, 'success');
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('compare active-memory CLI should summarize suite-level diffs across multiple cases', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-compare-suite-cli-'));
  const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
  await seedVchatFixture(vchatRoot);

  try {
    const env = {
      CODEX_MEMORY_BASE_PATH: tempBasePath,
      CODEX_MEMORY_DATA_DIR: 'data',
      CODEX_MEMORY_LOGS_DIR: 'logs',
      CODEX_MEMORY_ACTIVE_MEMORY_ROOT: vchatRoot,
      CODEX_MEMORY_ACTIVE_MEMORY_SYNC_MIN_INTERVAL_MS: '0'
    };

    const errorInput = { keyword: 'Phase C' };
    const successInput = { maid: 'Keke', keyword: 'Phase C recall audit', exclude_latest: false };

    const errorBaseline = await runCli({
      scriptPath: 'src/cli/deepmemo.js',
      env,
      stdin: JSON.stringify(errorInput)
    });
    const successBaseline = await runCli({
      scriptPath: 'src/cli/deepmemo.js',
      env,
      stdin: JSON.stringify(successInput)
    });

    assert.equal(errorBaseline.code, 1);
    assert.equal(successBaseline.code, 0, successBaseline.stderr);

    const errorPayload = parseJsonOutput(errorBaseline.stderr);
    const successPayload = parseJsonOutput(successBaseline.stdout);

    const legacyErrorScriptPath = path.join(tempBasePath, 'legacy-suite-error.js');
    const legacySuccessScriptPath = path.join(tempBasePath, 'legacy-suite-success.js');
    const legacyMismatchScriptPath = path.join(tempBasePath, 'legacy-suite-mismatch.js');
    const suitePath = path.join(tempBasePath, 'compare-suite.json');

    await fs.writeFile(
      legacyErrorScriptPath,
      [
        "process.stderr.write(JSON.stringify({",
        "  status: 'error',",
        `  error: ${JSON.stringify(errorPayload.error)},`,
        `  meta: ${JSON.stringify(errorPayload.meta || {})}`,
        "}) + '\\n');",
        'process.exit(1);'
      ].join('\n'),
      'utf8'
    );
    await fs.writeFile(
      legacySuccessScriptPath,
      [
        "process.stdout.write(JSON.stringify({",
        "  status: 'success',",
        `  result: ${JSON.stringify(successPayload.result)}`,
        "}) + '\\n');"
      ].join('\n'),
      'utf8'
    );
    await fs.writeFile(
      legacyMismatchScriptPath,
      [
        "process.stdout.write(JSON.stringify({",
        "  status: 'success',",
        "  result: '[回忆片段1]:\\nlegacy suite mismatch result'",
        "}) + '\\n');"
      ].join('\n'),
      'utf8'
    );

    await fs.writeFile(
      suitePath,
      JSON.stringify({
        tool: 'deepmemo',
        cases: [
          { name: 'error-match', input: errorInput, legacyScript: legacyErrorScriptPath },
          { name: 'success-match', input: successInput, legacyScript: legacySuccessScriptPath },
          { name: 'success-mismatch', input: successInput, legacyScript: legacyMismatchScriptPath }
        ]
      }, null, 2),
      'utf8'
    );

    const result = await runCli({
      scriptPath: 'src/cli/compare-vcp-active-memory.js',
      env,
      args: ['--json', '--suite', suitePath]
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = parseJsonOutput(result.stdout);
    assert.equal(payload.mode, 'suite');
    assert.equal(payload.summary.ok, true);
    assert.equal(payload.summary.totalCaseCount, 3);
    assert.equal(payload.summary.matchedCaseCount, 2);
    assert.equal(payload.summary.mismatchedCaseCount, 1);
    assert.deepEqual(payload.summary.comparisonBreakdown, {
      matched: 2,
      mismatched: 1
    });
    assert.deepEqual(payload.summary.driftReasonBreakdown, {
      'core-diff': 1,
      'result-mismatch': 1
    });
    assert.ok(payload.summary.coreMismatchCountTotal >= 1);
    assert.ok(payload.aggregateDiff.core.fields.some(item => item.field === 'result'));
    assert.equal(payload.cases[0].comparison.matched, true);
    assert.equal(payload.cases[0].comparison.outcome, 'matched');
    assert.deepEqual(payload.cases[0].comparison.driftReasons, []);
    assert.equal(payload.cases[1].comparison.matched, true);
    assert.equal(payload.cases[1].comparison.outcome, 'matched');
    assert.deepEqual(payload.cases[1].comparison.driftReasons, []);
    assert.equal(payload.cases[2].comparison.matched, false);
    assert.equal(payload.cases[2].comparison.outcome, 'mismatched');
    assert.deepEqual(payload.cases[2].comparison.driftReasons, ['core-diff', 'result-mismatch']);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('compare active-memory CLI should summarize comparison and drift reasons across suite cases', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-compare-breakdown-suite-'));
  const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
  await seedVchatFixture(vchatRoot);

  try {
    const env = {
      CODEX_MEMORY_BASE_PATH: tempBasePath,
      CODEX_MEMORY_DATA_DIR: 'data',
      CODEX_MEMORY_LOGS_DIR: 'logs',
      CODEX_MEMORY_ACTIVE_MEMORY_ROOT: vchatRoot,
      CODEX_MEMORY_ACTIVE_MEMORY_SYNC_MIN_INTERVAL_MS: '0'
    };
    const successInput = { maid: 'Keke', keyword: 'Phase C recall audit', exclude_latest: false };

    const successBaseline = await runCli({
      scriptPath: 'src/cli/deepmemo.js',
      env,
      stdin: JSON.stringify(successInput)
    });

    assert.equal(successBaseline.code, 0, successBaseline.stderr);
    const successPayload = parseJsonOutput(successBaseline.stdout);

    const legacySuccessScriptPath = path.join(tempBasePath, 'legacy-breakdown-success.js');
    const legacyMismatchScriptPath = path.join(tempBasePath, 'legacy-breakdown-mismatch.js');
    const missingLegacyScriptPath = path.join(tempBasePath, 'legacy-breakdown-missing.js');
    const suitePath = path.join(tempBasePath, 'compare-breakdown-suite.json');

    await fs.writeFile(
      legacySuccessScriptPath,
      [
        "process.stdout.write(JSON.stringify({",
        "  status: 'success',",
        `  result: ${JSON.stringify(successPayload.result)}`,
        "}) + '\\n');"
      ].join('\n'),
      'utf8'
    );
    await fs.writeFile(
      legacyMismatchScriptPath,
      [
        "process.stdout.write(JSON.stringify({",
        "  status: 'success',",
        "  result: '[鍥炲繂鐗囨1]:\\ncompare breakdown mismatch result'",
        "}) + '\\n');"
      ].join('\n'),
      'utf8'
    );
    await fs.writeFile(
      suitePath,
      JSON.stringify({
        tool: 'deepmemo',
        cases: [
          {
            name: 'success-match',
            input: successInput,
            legacyScript: legacySuccessScriptPath,
            meta: {
              category: 'breakdown',
              expectation: 'success',
              fixture: 'custom-breakdown-fixture',
              tags: ['matched']
            }
          },
          {
            name: 'success-mismatch',
            input: successInput,
            legacyScript: legacyMismatchScriptPath,
            meta: {
              category: 'breakdown',
              expectation: 'success',
              fixture: 'custom-breakdown-fixture',
              tags: ['mismatch']
            }
          },
          {
            name: 'legacy-missing',
            input: successInput,
            legacyScript: missingLegacyScriptPath,
            meta: {
              category: 'breakdown',
              expectation: 'error',
              fixture: 'custom-breakdown-fixture',
              tags: ['legacy-unavailable']
            }
          }
        ]
      }, null, 2),
      'utf8'
    );

    const result = await runCli({
      scriptPath: 'src/cli/compare-vcp-active-memory.js',
      env,
      args: ['--json', '--suite', suitePath]
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = parseJsonOutput(result.stdout);
    assert.equal(payload.summary.totalCaseCount, 3);
    assert.equal(payload.summary.matchedCaseCount, 1);
    assert.equal(payload.summary.mismatchedCaseCount, 1);
    assert.equal(payload.summary.legacyUnavailableCaseCount, 1);
    assert.deepEqual(payload.summary.comparisonBreakdown, {
      'legacy-unavailable': 1,
      matched: 1,
      mismatched: 1
    });
    assert.deepEqual(payload.summary.driftReasonBreakdown, {
      'core-diff': 1,
      'legacy-unavailable': 1,
      'result-mismatch': 1
    });
    const breakdownAggregate = payload.categoryAggregate.find(item => item.category === 'breakdown');
    assert.deepEqual(breakdownAggregate?.comparisonBreakdown, {
      'legacy-unavailable': 1,
      matched: 1,
      mismatched: 1
    });
    assert.deepEqual(breakdownAggregate?.driftReasonBreakdown, {
      'core-diff': 1,
      'legacy-unavailable': 1,
      'result-mismatch': 1
    });
    assert.deepEqual(breakdownAggregate?.fixtureAggregate?.[0]?.comparisonBreakdown, {
      'legacy-unavailable': 1,
      matched: 1,
      mismatched: 1
    });
    const legacyMissingCase = payload.cases.find(caseReport => caseReport.name === 'legacy-missing');
    assert.equal(legacyMissingCase?.comparison?.outcome, 'legacy-unavailable');
    assert.deepEqual(legacyMissingCase?.comparison?.driftReasons, ['legacy-unavailable']);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('compare active-memory CLI should render readable text breakdowns for suite output', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-compare-text-suite-'));
  const vchatRoot = path.join(tempBasePath, 'vchat-fixture');
  await seedVchatFixture(vchatRoot);

  try {
    const env = {
      CODEX_MEMORY_BASE_PATH: tempBasePath,
      CODEX_MEMORY_DATA_DIR: 'data',
      CODEX_MEMORY_LOGS_DIR: 'logs',
      CODEX_MEMORY_ACTIVE_MEMORY_ROOT: vchatRoot,
      CODEX_MEMORY_ACTIVE_MEMORY_SYNC_MIN_INTERVAL_MS: '0'
    };
    const successInput = { maid: 'Keke', keyword: 'Phase C recall audit', exclude_latest: false };
    const successBaseline = await runCli({
      scriptPath: 'src/cli/deepmemo.js',
      env,
      stdin: JSON.stringify(successInput)
    });

    assert.equal(successBaseline.code, 0, successBaseline.stderr);
    const successPayload = parseJsonOutput(successBaseline.stdout);

    const legacySuccessScriptPath = path.join(tempBasePath, 'legacy-text-success.js');
    const legacyMismatchScriptPath = path.join(tempBasePath, 'legacy-text-mismatch.js');
    const suitePath = path.join(tempBasePath, 'compare-text-suite.json');

    await fs.writeFile(
      legacySuccessScriptPath,
      [
        "process.stdout.write(JSON.stringify({",
        "  status: 'success',",
        `  result: ${JSON.stringify(successPayload.result)}`,
        "}) + '\\n');"
      ].join('\n'),
      'utf8'
    );
    await fs.writeFile(
      legacyMismatchScriptPath,
      [
        "process.stdout.write(JSON.stringify({",
        "  status: 'success',",
        "  result: '[鍥炲繂鐗囨1]:\\ncompare text mismatch result'",
        "}) + '\\n');"
      ].join('\n'),
      'utf8'
    );
    await fs.writeFile(
      suitePath,
      JSON.stringify({
        tool: 'deepmemo',
        cases: [
          {
            name: 'matched-case',
            input: successInput,
            legacyScript: legacySuccessScriptPath,
            meta: { category: 'text-output', expectation: 'success', fixture: 'custom-text-fixture', tags: ['matched'] }
          },
          {
            name: 'mismatch-case',
            input: successInput,
            legacyScript: legacyMismatchScriptPath,
            meta: { category: 'text-output', expectation: 'success', fixture: 'custom-text-fixture', tags: ['mismatch'] }
          }
        ]
      }, null, 2),
      'utf8'
    );

    const result = await runCli({
      scriptPath: 'src/cli/compare-vcp-active-memory.js',
      env,
      args: ['--suite', suitePath]
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /\[comparison-breakdown\] matched=1, mismatched=1/);
    assert.match(result.stdout, /\[drift-reason-breakdown\] core-diff=1, result-mismatch=1/);
    assert.match(result.stdout, /text-output: total=2 matched=1 mismatched=1 coreMismatchCount=1 drift=core-diff=1, result-mismatch=1/);
    assert.match(result.stdout, /\[case:mismatch-case\] tool=deepmemo matched=false outcome=mismatched/);
    assert.match(result.stdout, /driftReasons: core-diff, result-mismatch/);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('compare active-memory CLI should prepare suite fixture roots from manifest-stamped temp copies', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-compare-fixture-manifest-'));
  const fixtureRoot = path.join(tempBasePath, 'fixture-root');

  try {
    const historyPath = path.join(fixtureRoot, 'UserData', 'maid-keke', 'topics', 'topic_alpha', 'history.json');
    await fs.mkdir(path.dirname(historyPath), { recursive: true });
    await fs.writeFile(historyPath, JSON.stringify([{ role: 'user', content: 'fixture timestamp probe' }], null, 2), 'utf8');
    await fs.writeFile(
      path.join(fixtureRoot, '.codex-fixture-manifest.json'),
      JSON.stringify({
        timestamps: {
          'UserData/maid-keke/topics/topic_alpha/history.json': '2026-04-20T08:00:00.000Z'
        }
      }, null, 2),
      'utf8'
    );
    await fs.utimes(historyPath, new Date('2026-04-23T08:00:00.000Z'), new Date('2026-04-23T08:00:00.000Z'));

    const probeScriptPath = path.join(tempBasePath, 'fixture-probe.js');
    const suitePath = path.join(tempBasePath, 'fixture-suite.json');
    await fs.writeFile(
      probeScriptPath,
      [
        "const fs = require('node:fs');",
        "const path = require('node:path');",
        "const rootPath = process.env.TEST_FIXTURE_ROOT || '';",
        "const historyPath = path.join(rootPath, 'UserData', 'maid-keke', 'topics', 'topic_alpha', 'history.json');",
        "const stats = fs.statSync(historyPath);",
        "process.stdout.write(JSON.stringify({",
        "  status: 'success',",
        "  result: `${rootPath}|${stats.mtime.toISOString()}`",
        "}) + '\\n');"
      ].join('\n'),
      'utf8'
    );
    await fs.writeFile(
      suitePath,
      JSON.stringify({
        tool: 'deepmemo',
        cases: [
          {
            name: 'fixture-manifest-stamp',
            input: { maid: 'Keke', keyword: 'fixture stamp' },
            newScript: './fixture-probe.js',
            legacyScript: './fixture-probe.js',
            env: {
              TEST_FIXTURE_ROOT: './fixture-root'
            }
          }
        ]
      }, null, 2),
      'utf8'
    );

    const result = await runCli({
      scriptPath: 'src/cli/compare-vcp-active-memory.js',
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: 'data',
        CODEX_MEMORY_LOGS_DIR: 'logs'
      },
      args: ['--json', '--suite', suitePath, '--require-match']
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = parseJsonOutput(result.stdout);
    assert.equal(payload.mode, 'suite');
    assert.equal(payload.summary.ok, true);
    assert.equal(payload.summary.matchedCaseCount, 1);
    assert.equal(payload.fixturePreparation.preparedFixtureCount, 1);
    assert.equal(payload.fixturePreparation.preparedFixtures[0].sourceRoot, fixtureRoot);
    assert.notEqual(payload.fixturePreparation.preparedFixtures[0].preparedRoot, fixtureRoot);
    assert.match(payload.cases[0].newRun.payload.result, /2026-04-20T08:00:00\.000Z$/);
    assert.ok(payload.cases[0].newRun.payload.result.startsWith(payload.fixturePreparation.preparedFixtures[0].preparedRoot));
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('compare active-memory CLI should run the repository standard suite in require-match mode', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-standard-compare-suite-'));

  try {
    const result = await runCli({
      scriptPath: 'src/cli/compare-vcp-active-memory.js',
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: 'data',
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_ACTIVE_MEMORY_ROOT: STANDARD_FIXTURE_ROOT,
        CODEX_MEMORY_ACTIVE_MEMORY_SYNC_MIN_INTERVAL_MS: '0'
      },
      args: [
        '--json',
        '--suite',
        STANDARD_SUITE_PATH,
        '--require-match'
      ]
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = parseJsonOutput(result.stdout);
    assert.equal(payload.mode, 'suite');
    assert.equal(payload.metaVersion, 1);
    assert.equal(payload.summary.ok, true);
    assert.equal(payload.summary.totalCaseCount, 39);
    assert.equal(payload.summary.matchedCaseCount, 39);
    assert.equal(payload.summary.mismatchedCaseCount, 0);
    assert.deepEqual(payload.summary.comparisonBreakdown, { matched: 39 });
    assert.equal(payload.summary.coreMismatchCountTotal, 0);
    assert.equal(payload.summary.extendedMismatchCountTotal, 0);
    assert.deepEqual(payload.summary.driftReasonBreakdown, {});
    assert.equal(payload.fixturePreparation.preparedFixtureCount, 7);
    assert.equal(payload.categoryAggregate.length, 8);
    const orderingAggregate = payload.categoryAggregate.find(item => item.category === 'ordering');
    const agentSelectionAggregate = payload.categoryAggregate.find(item => item.category === 'agent-selection');
    const topicStateAggregate = payload.categoryAggregate.find(item => item.category === 'topic-state');

    assert.equal(orderingAggregate?.totalCaseCount, 4);
    assert.equal(orderingAggregate?.matchedCaseCount, 4);
    assert.equal(orderingAggregate?.fixtureAggregate?.length, 4);
    assert.equal(orderingAggregate?.fixtureAggregate?.find(item => item.fixture === 'vchat-fixture-ranking')?.totalCaseCount, 1);
    assert.equal(orderingAggregate?.fixtureAggregate?.find(item => item.fixture === 'vchat-fixture-multi-topic-large')?.matchedCaseCount, 1);
    assert.equal(agentSelectionAggregate?.totalCaseCount, 8);
    assert.equal(agentSelectionAggregate?.fixtureAggregate?.find(item => item.fixture === 'vchat-fixture-multi-agent')?.totalCaseCount, 4);
    assert.equal(topicStateAggregate?.expectedErrorCaseCount, 4);
    assert.equal(payload.categoryAggregate.find(item => item.category === 'input-validation')?.expectedErrorCaseCount, 5);
    assert.equal(payload.categoryAggregate.find(item => item.category === 'filtering')?.expectedSuccessCaseCount, 7);
    assert.ok(payload.cases.every(caseReport => caseReport.meta && caseReport.meta.category));
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('compare active-memory CLI should filter standard suite cases by category', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-standard-compare-category-suite-'));

  try {
    const result = await runCli({
      scriptPath: 'src/cli/compare-vcp-active-memory.js',
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: 'data',
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_ACTIVE_MEMORY_ROOT: STANDARD_FIXTURE_ROOT,
        CODEX_MEMORY_ACTIVE_MEMORY_SYNC_MIN_INTERVAL_MS: '0'
      },
      args: [
        '--json',
        '--suite',
        STANDARD_SUITE_PATH,
        '--category',
        'ordering',
        '--require-match'
      ]
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = parseJsonOutput(result.stdout);
    assert.equal(payload.mode, 'suite');
    assert.equal(payload.categoryFilter, 'ordering');
    assert.equal(payload.summary.totalCaseCount, 4);
    assert.equal(payload.summary.matchedCaseCount, 4);
    assert.equal(payload.fixturePreparation.preparedFixtureCount, 4);
    assert.equal(payload.categoryAggregate.length, 1);
    assert.equal(payload.categoryAggregate[0]?.category, 'ordering');
    assert.equal(payload.categoryAggregate[0]?.fixtureAggregate?.length, 4);
    assert.ok(payload.cases.every(caseReport => caseReport.meta?.category === 'ordering'));
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('compare active-memory CLI should filter standard suite cases by multiple categories', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-standard-compare-multi-category-suite-'));

  try {
    const result = await runCli({
      scriptPath: 'src/cli/compare-vcp-active-memory.js',
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: 'data',
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_ACTIVE_MEMORY_ROOT: STANDARD_FIXTURE_ROOT,
        CODEX_MEMORY_ACTIVE_MEMORY_SYNC_MIN_INTERVAL_MS: '0'
      },
      args: [
        '--json',
        '--suite',
        STANDARD_SUITE_PATH,
        '--category',
        'ordering,agent-selection',
        '--require-match'
      ]
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = parseJsonOutput(result.stdout);
    assert.equal(payload.mode, 'suite');
    assert.deepEqual(payload.categoryFilter, ['agent-selection', 'ordering']);
    assert.equal(payload.summary.totalCaseCount, 12);
    assert.equal(payload.summary.matchedCaseCount, 12);
    assert.equal(payload.summary.mismatchedCaseCount, 0);
    assert.equal(payload.fixturePreparation.preparedFixtureCount, 5);
    assert.equal(payload.categoryAggregate.length, 2);
    const orderingAggregate = payload.categoryAggregate.find(item => item.category === 'ordering');
    const agentSelectionAggregate = payload.categoryAggregate.find(item => item.category === 'agent-selection');
    assert.equal(orderingAggregate?.totalCaseCount, 4);
    assert.equal(agentSelectionAggregate?.totalCaseCount, 8);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('compare active-memory CLI should filter standard suite cases by fixture and tag', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-standard-compare-fixture-tag-suite-'));

  try {
    const baseEnv = {
      CODEX_MEMORY_BASE_PATH: tempBasePath,
      CODEX_MEMORY_DATA_DIR: 'data',
      CODEX_MEMORY_LOGS_DIR: 'logs',
      CODEX_MEMORY_ACTIVE_MEMORY_ROOT: STANDARD_FIXTURE_ROOT,
      CODEX_MEMORY_ACTIVE_MEMORY_SYNC_MIN_INTERVAL_MS: '0'
    };

    const fixtureResult = await runCli({
      scriptPath: 'src/cli/compare-vcp-active-memory.js',
      env: baseEnv,
      args: [
        '--json',
        '--suite',
        STANDARD_SUITE_PATH,
        '--fixture',
        'vchat-fixture-multi-agent',
        '--require-match'
      ]
    });

    assert.equal(fixtureResult.code, 0, fixtureResult.stderr);
    const fixturePayload = parseJsonOutput(fixtureResult.stdout);
    assert.deepEqual(fixturePayload.fixtureFilter, ['vchat-fixture-multi-agent']);
    assert.equal(fixturePayload.summary.totalCaseCount, 8);
    assert.equal(fixturePayload.fixturePreparation.preparedFixtureCount, 1);
    assert.equal(fixturePayload.categoryAggregate.length, 3);
    assert.ok(fixturePayload.cases.every(caseReport => caseReport.meta?.fixture === 'vchat-fixture-multi-agent'));

    const tagResult = await runCli({
      scriptPath: 'src/cli/compare-vcp-active-memory.js',
      env: baseEnv,
      args: [
        '--json',
        '--suite',
        STANDARD_SUITE_PATH,
        '--tag',
        'window-order',
        '--require-match'
      ]
    });

    assert.equal(tagResult.code, 0, tagResult.stderr);
    const tagPayload = parseJsonOutput(tagResult.stdout);
    assert.deepEqual(tagPayload.tagFilter, ['window-order']);
    assert.equal(tagPayload.summary.totalCaseCount, 2);
    assert.equal(tagPayload.fixturePreparation.preparedFixtureCount, 2);
    assert.equal(tagPayload.categoryAggregate.length, 1);
    assert.equal(tagPayload.categoryAggregate[0]?.category, 'ordering');
    assert.equal(tagPayload.categoryAggregate[0]?.fixtureAggregate?.length, 2);
    assert.ok(tagPayload.cases.every(caseReport => caseReport.meta?.tags?.includes('window-order')));
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('compare active-memory CLI should filter standard suite cases by expectation and tool', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-standard-compare-expectation-tool-suite-'));

  try {
    const baseEnv = {
      CODEX_MEMORY_BASE_PATH: tempBasePath,
      CODEX_MEMORY_DATA_DIR: 'data',
      CODEX_MEMORY_LOGS_DIR: 'logs',
      CODEX_MEMORY_ACTIVE_MEMORY_ROOT: STANDARD_FIXTURE_ROOT,
      CODEX_MEMORY_ACTIVE_MEMORY_SYNC_MIN_INTERVAL_MS: '0'
    };

    const expectationResult = await runCli({
      scriptPath: 'src/cli/compare-vcp-active-memory.js',
      env: baseEnv,
      args: [
        '--json',
        '--suite',
        STANDARD_SUITE_PATH,
        '--expectation',
        'error',
        '--require-match'
      ]
    });

    assert.equal(expectationResult.code, 0, expectationResult.stderr);
    const expectationPayload = parseJsonOutput(expectationResult.stdout);
    assert.deepEqual(expectationPayload.expectationFilter, ['error']);
    assert.equal(expectationPayload.summary.totalCaseCount, 15);
    assert.equal(expectationPayload.fixturePreparation.preparedFixtureCount, 2);
    assert.ok(expectationPayload.cases.every(caseReport => caseReport.meta?.expectation === 'error'));

    const expectationMultiResult = await runCli({
      scriptPath: 'src/cli/compare-vcp-active-memory.js',
      env: baseEnv,
      args: [
        '--json',
        '--suite',
        STANDARD_SUITE_PATH,
        '--expectation',
        'error,success',
        '--require-match'
      ]
    });

    assert.equal(expectationMultiResult.code, 0, expectationMultiResult.stderr);
    const expectationMultiPayload = parseJsonOutput(expectationMultiResult.stdout);
    assert.deepEqual(expectationMultiPayload.expectationFilter, ['error', 'success']);
    assert.equal(expectationMultiPayload.summary.totalCaseCount, 39);
    assert.equal(expectationMultiPayload.fixturePreparation.preparedFixtureCount, 7);
    assert.ok(expectationMultiPayload.cases.every(caseReport => ['error', 'success'].includes(caseReport.meta?.expectation)));

    const expectationReverseResult = await runCli({
      scriptPath: 'src/cli/compare-vcp-active-memory.js',
      env: baseEnv,
      args: [
        '--json',
        '--suite',
        STANDARD_SUITE_PATH,
        '--expectation',
        'success,error',
        '--require-match'
      ]
    });

    assert.equal(expectationReverseResult.code, 0, expectationReverseResult.stderr);
    const expectationReversePayload = parseJsonOutput(expectationReverseResult.stdout);
    assert.deepEqual(expectationReversePayload.expectationFilter, ['error', 'success']);
    assert.equal(expectationReversePayload.summary.totalCaseCount, 39);
    assert.equal(expectationReversePayload.fixturePreparation.preparedFixtureCount, 7);
    const expectationReverseCounts = expectationReversePayload.cases.reduce(
      (acc, item) => {
        const expectation = item.meta?.expectation;
        if (expectation === 'error' || expectation === 'success') {
          acc[expectation] = (acc[expectation] || 0) + 1;
        }
        return acc;
      },
      {}
    );
    assert.equal(expectationReverseCounts.error, 15);
    assert.equal(expectationReverseCounts.success, 24);
    const expectationReverseSet = new Set(expectationReversePayload.cases.map(item => item.meta?.expectation));
    assert.deepEqual(
      Array.from(expectationReverseSet).sort(),
      ['error', 'success']
    );

    const expectationDupResult = await runCli({
      scriptPath: 'src/cli/compare-vcp-active-memory.js',
      env: baseEnv,
      args: [
        '--json',
        '--suite',
        STANDARD_SUITE_PATH,
        '--expectation',
        'success,error,success',
        '--require-match'
      ]
    });

    assert.equal(expectationDupResult.code, 0, expectationDupResult.stderr);
    const expectationDupPayload = parseJsonOutput(expectationDupResult.stdout);
    assert.deepEqual(expectationDupPayload.expectationFilter, ['error', 'success']);
    assert.equal(expectationDupPayload.summary.totalCaseCount, 39);
    assert.equal(expectationDupPayload.fixturePreparation.preparedFixtureCount, 7);
    assert.ok(expectationDupPayload.cases.every(caseReport => ['error', 'success'].includes(caseReport.meta?.expectation)));
    assert.equal(expectationDupPayload.cases.length, expectationDupPayload.summary.totalCaseCount);

    const toolResult = await runCli({
      scriptPath: 'src/cli/compare-vcp-active-memory.js',
      env: baseEnv,
      args: [
        '--json',
        '--suite',
        STANDARD_SUITE_PATH,
        '--tool',
        'topicmemo',
        '--require-match'
      ]
    });

    assert.equal(toolResult.code, 0, toolResult.stderr);
    const toolPayload = parseJsonOutput(toolResult.stdout);
    assert.deepEqual(toolPayload.toolFilter, ['topicmemo']);
    assert.equal(toolPayload.summary.totalCaseCount, 16);
    assert.equal(toolPayload.fixturePreparation.preparedFixtureCount, 4);
    assert.ok(toolPayload.cases.every(caseReport => caseReport.tool === 'topicmemo'));
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('compare active-memory CLI should support tag-all and exclude filters', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-standard-compare-include-exclude-suite-'));

  try {
    const baseEnv = {
      CODEX_MEMORY_BASE_PATH: tempBasePath,
      CODEX_MEMORY_DATA_DIR: 'data',
      CODEX_MEMORY_LOGS_DIR: 'logs',
      CODEX_MEMORY_ACTIVE_MEMORY_ROOT: STANDARD_FIXTURE_ROOT,
      CODEX_MEMORY_ACTIVE_MEMORY_SYNC_MIN_INTERVAL_MS: '0'
    };

    const tagAllResult = await runCli({
      scriptPath: 'src/cli/compare-vcp-active-memory.js',
      env: baseEnv,
      args: [
        '--json',
        '--suite',
        STANDARD_SUITE_PATH,
        '--tag-all',
        'multi-agent,alias',
        '--require-match'
      ]
    });

    assert.equal(tagAllResult.code, 0, tagAllResult.stderr);
    const tagAllPayload = parseJsonOutput(tagAllResult.stdout);
    assert.deepEqual(tagAllPayload.tagAllFilter, ['alias', 'multi-agent']);
    assert.equal(tagAllPayload.summary.totalCaseCount, 3);
    assert.ok(tagAllPayload.cases.every(caseReport => caseReport.meta?.tags?.includes('alias')));
    assert.ok(tagAllPayload.cases.every(caseReport => caseReport.meta?.tags?.includes('multi-agent')));

    const excludeTagResult = await runCli({
      scriptPath: 'src/cli/compare-vcp-active-memory.js',
      env: baseEnv,
      args: [
        '--json',
        '--suite',
        STANDARD_SUITE_PATH,
        '--exclude-tag',
        'multi-agent',
        '--require-match'
      ]
    });

    assert.equal(excludeTagResult.code, 0, excludeTagResult.stderr);
    const excludeTagPayload = parseJsonOutput(excludeTagResult.stdout);
    assert.deepEqual(excludeTagPayload.excludeTagFilter, ['multi-agent']);
    assert.equal(excludeTagPayload.summary.totalCaseCount, 31);
    assert.ok(excludeTagPayload.cases.every(caseReport => !caseReport.meta?.tags?.includes('multi-agent')));

    const excludeFixtureResult = await runCli({
      scriptPath: 'src/cli/compare-vcp-active-memory.js',
      env: baseEnv,
      args: [
        '--json',
        '--suite',
        STANDARD_SUITE_PATH,
        '--exclude-fixture',
        'vchat-fixture-no-settings',
        '--require-match'
      ]
    });

    assert.equal(excludeFixtureResult.code, 0, excludeFixtureResult.stderr);
    const excludeFixturePayload = parseJsonOutput(excludeFixtureResult.stdout);
    assert.deepEqual(excludeFixturePayload.excludeFixtureFilter, ['vchat-fixture-no-settings']);
    assert.equal(excludeFixturePayload.summary.totalCaseCount, 38);
    assert.ok(excludeFixturePayload.cases.every(caseReport => caseReport.meta?.fixture !== 'vchat-fixture-no-settings'));
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});
