const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const STANDARD_SUITE_DIR = path.join(process.cwd(), 'benchmarks', 'active-memory-suite');
const STANDARD_SUITE_PATH = path.join(STANDARD_SUITE_DIR, 'standard-suite.json');
const STANDARD_FIXTURE_ROOT = path.join(STANDARD_SUITE_DIR, 'vchat-fixture');

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
      // Fall back to trailing JSON line if warnings are present.
    }
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      return JSON.parse(lines[index]);
    } catch {
      // Ignore non-JSON lines.
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

test('rollback active-memory CLI should report rollback-safe when compare report matches', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-rollback-ready-cli-'));
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

    const legacyScriptPath = path.join(tempBasePath, 'legacy-ready-deepmemo.js');
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
      scriptPath: 'src/cli/rollback-active-memory.js',
      env,
      args: ['--json', '--tool', 'deepmemo', '--legacy-script', legacyScriptPath, '--require-ready'],
      stdin: input
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = parseJsonOutput(result.stdout);
    assert.equal(payload.summary.ok, true);
    assert.equal(payload.summary.rollbackReady, true);
    assert.equal(payload.summary.outcome, 'rollback-safe');
    assert.deepEqual(payload.summary.blockerReasons, []);
    assert.equal(payload.summary.recommendation, 'rollback-safe');
    assert.equal(payload.summary.coreMismatchCount, 0);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('rollback active-memory CLI should fail require-ready when compare report mismatches', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-rollback-mismatch-cli-'));
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

    const legacyScriptPath = path.join(tempBasePath, 'legacy-mismatch-deepmemo.js');
    await fs.writeFile(
      legacyScriptPath,
      [
        "process.stdout.write(JSON.stringify({",
        "  status: 'success',",
        "  result: '[回忆片段1]:\\nlegacy mismatch result'",
        "}) + '\\n');"
      ].join('\n'),
      'utf8'
    );

    const result = await runCli({
      scriptPath: 'src/cli/rollback-active-memory.js',
      env,
      args: ['--json', '--tool', 'deepmemo', '--legacy-script', legacyScriptPath, '--require-ready'],
      stdin: input
    });

    assert.equal(result.code, 1);
    const payload = parseJsonOutput(result.stdout);
    assert.equal(payload.summary.ok, false);
    assert.equal(payload.summary.rollbackReady, false);
    assert.equal(payload.summary.outcome, 'investigate-before-rollback');
    assert.deepEqual(payload.summary.blockerReasons, ['core-diff', 'result-mismatch']);
    assert.equal(payload.summary.recommendation, 'investigate-before-rollback');
    assert.ok(payload.summary.coreMismatchCount >= 1);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('rollback active-memory CLI should summarize suite readiness and fail require-ready when any case mismatches', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-rollback-suite-cli-'));
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
    const successInput = {
      maid: 'Keke',
      keyword: 'Phase C recall audit',
      exclude_latest: false
    };
    const mismatchInput = {
      maid: 'Keke',
      keyword: 'Phase C recall audit',
      exclude_latest: false
    };

    const baseline = await runCli({
      scriptPath: 'src/cli/deepmemo.js',
      env,
      stdin: JSON.stringify(successInput)
    });
    assert.equal(baseline.code, 0, baseline.stderr);
    const baselinePayload = parseJsonOutput(baseline.stdout);

    const legacyReadyScriptPath = path.join(tempBasePath, 'legacy-suite-ready.js');
    const legacyMismatchScriptPath = path.join(tempBasePath, 'legacy-suite-mismatch.js');
    const suitePath = path.join(tempBasePath, 'rollback-suite.json');

    await fs.writeFile(
      legacyReadyScriptPath,
      [
        "process.stdout.write(JSON.stringify({",
        "  status: 'success',",
        `  result: ${JSON.stringify(baselinePayload.result)}`,
        "}) + '\\n');"
      ].join('\n'),
      'utf8'
    );
    await fs.writeFile(
      legacyMismatchScriptPath,
      [
        "process.stdout.write(JSON.stringify({",
        "  status: 'success',",
        "  result: '[回忆片段1]:\\nrollback suite mismatch result'",
        "}) + '\\n');"
      ].join('\n'),
      'utf8'
    );
    await fs.writeFile(
      suitePath,
      JSON.stringify({
        tool: 'deepmemo',
        cases: [
          { name: 'ready-case', input: successInput, legacyScript: legacyReadyScriptPath },
          { name: 'mismatch-case', input: mismatchInput, legacyScript: legacyMismatchScriptPath }
        ]
      }, null, 2),
      'utf8'
    );

    const result = await runCli({
      scriptPath: 'src/cli/rollback-active-memory.js',
      env,
      args: ['--json', '--suite', suitePath, '--require-ready']
    });

    assert.equal(result.code, 1);
    const payload = parseJsonOutput(result.stdout);
    assert.equal(payload.mode, 'suite');
    assert.equal(payload.summary.ok, false);
    assert.equal(payload.summary.rollbackReady, false);
    assert.equal(payload.summary.totalCaseCount, 2);
    assert.equal(payload.summary.readyCaseCount, 1);
    assert.equal(payload.summary.notReadyCaseCount, 1);
    assert.equal(payload.summary.recommendation, 'investigate-before-rollback');
    assert.ok(payload.summary.coreMismatchCountTotal >= 1);
    assert.deepEqual(payload.summary.recommendationBreakdown, {
      'investigate-before-rollback': 1,
      'rollback-safe': 1
    });
    assert.deepEqual(payload.summary.blockerBreakdown, {
      'investigate-before-rollback': 1
    });
    assert.equal(payload.cases[0].summary.outcome, 'rollback-safe');
    assert.deepEqual(payload.cases[0].summary.blockerReasons, []);
    assert.equal(payload.cases[1].summary.outcome, 'investigate-before-rollback');
    assert.deepEqual(payload.cases[1].summary.blockerReasons, ['core-diff', 'result-mismatch']);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('rollback active-memory CLI should summarize blocker reasons across suite cases', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-rollback-breakdown-suite-'));
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
    const baseInput = {
      maid: 'Keke',
      keyword: 'Phase C recall audit',
      exclude_latest: false
    };

    const baseline = await runCli({
      scriptPath: 'src/cli/deepmemo.js',
      env,
      stdin: JSON.stringify(baseInput)
    });
    assert.equal(baseline.code, 0, baseline.stderr);
    const baselinePayload = parseJsonOutput(baseline.stdout);

    const legacyReadyScriptPath = path.join(tempBasePath, 'legacy-breakdown-ready.js');
    const legacyMismatchScriptPath = path.join(tempBasePath, 'legacy-breakdown-mismatch.js');
    const missingLegacyScriptPath = path.join(tempBasePath, 'legacy-breakdown-missing.js');
    const suitePath = path.join(tempBasePath, 'rollback-breakdown-suite.json');

    await fs.writeFile(
      legacyReadyScriptPath,
      [
        "process.stdout.write(JSON.stringify({",
        "  status: 'success',",
        `  result: ${JSON.stringify(baselinePayload.result)}`,
        "}) + '\\n');"
      ].join('\n'),
      'utf8'
    );
    await fs.writeFile(
      legacyMismatchScriptPath,
      [
        "process.stdout.write(JSON.stringify({",
        "  status: 'success',",
        "  result: '[鍥炲繂鐗囨1]:\\nrollback breakdown mismatch result'",
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
            name: 'ready-case',
            input: baseInput,
            legacyScript: legacyReadyScriptPath,
            meta: {
              category: 'breakdown',
              expectation: 'success',
              fixture: 'custom-breakdown-fixture',
              tags: ['rollback-safe']
            }
          },
          {
            name: 'mismatch-case',
            input: baseInput,
            legacyScript: legacyMismatchScriptPath,
            meta: {
              category: 'breakdown',
              expectation: 'success',
              fixture: 'custom-breakdown-fixture',
              tags: ['mismatch']
            }
          },
          {
            name: 'legacy-missing-case',
            input: baseInput,
            legacyScript: missingLegacyScriptPath,
            meta: {
              category: 'breakdown',
              expectation: 'error',
              fixture: 'custom-breakdown-fixture',
              tags: ['legacy-missing']
            }
          }
        ]
      }, null, 2),
      'utf8'
    );

    const result = await runCli({
      scriptPath: 'src/cli/rollback-active-memory.js',
      env,
      args: ['--json', '--suite', suitePath, '--require-ready']
    });

    assert.equal(result.code, 1);
    const payload = parseJsonOutput(result.stdout);
    assert.equal(payload.summary.totalCaseCount, 3);
    assert.equal(payload.summary.readyCaseCount, 1);
    assert.equal(payload.summary.notReadyCaseCount, 2);
    assert.deepEqual(payload.summary.recommendationBreakdown, {
      'investigate-before-rollback': 1,
      'legacy-unavailable': 1,
      'rollback-safe': 1
    });
    assert.deepEqual(payload.summary.blockerBreakdown, {
      'investigate-before-rollback': 1,
      'legacy-unavailable': 1
    });
    const breakdownAggregate = payload.categoryAggregate.find(item => item.category === 'breakdown');
    assert.deepEqual(breakdownAggregate?.recommendationBreakdown, {
      'investigate-before-rollback': 1,
      'legacy-unavailable': 1,
      'rollback-safe': 1
    });
    assert.deepEqual(breakdownAggregate?.blockerBreakdown, {
      'investigate-before-rollback': 1,
      'legacy-unavailable': 1
    });
    assert.deepEqual(breakdownAggregate?.fixtureAggregate?.[0]?.blockerBreakdown, {
      'investigate-before-rollback': 1,
      'legacy-unavailable': 1
    });
    const legacyMissingCase = payload.cases.find(caseReport => caseReport.name === 'legacy-missing-case');
    assert.equal(legacyMissingCase?.summary?.outcome, 'legacy-unavailable');
    assert.deepEqual(legacyMissingCase?.summary?.blockerReasons, ['legacy-unavailable']);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('rollback active-memory CLI should render readable text breakdowns for suite output', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-rollback-text-suite-'));
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
    const baseInput = {
      maid: 'Keke',
      keyword: 'Phase C recall audit',
      exclude_latest: false
    };

    const baseline = await runCli({
      scriptPath: 'src/cli/deepmemo.js',
      env,
      stdin: JSON.stringify(baseInput)
    });
    assert.equal(baseline.code, 0, baseline.stderr);
    const baselinePayload = parseJsonOutput(baseline.stdout);

    const legacyReadyScriptPath = path.join(tempBasePath, 'legacy-text-ready.js');
    const legacyMismatchScriptPath = path.join(tempBasePath, 'legacy-text-mismatch.js');
    const suitePath = path.join(tempBasePath, 'rollback-text-suite.json');

    await fs.writeFile(
      legacyReadyScriptPath,
      [
        "process.stdout.write(JSON.stringify({",
        "  status: 'success',",
        `  result: ${JSON.stringify(baselinePayload.result)}`,
        "}) + '\\n');"
      ].join('\n'),
      'utf8'
    );
    await fs.writeFile(
      legacyMismatchScriptPath,
      [
        "process.stdout.write(JSON.stringify({",
        "  status: 'success',",
        "  result: '[鍥炲繂鐗囨1]:\\nrollback text mismatch result'",
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
            name: 'ready-case',
            input: baseInput,
            legacyScript: legacyReadyScriptPath,
            meta: { category: 'text-output', expectation: 'success', fixture: 'custom-text-fixture', tags: ['ready'] }
          },
          {
            name: 'mismatch-case',
            input: baseInput,
            legacyScript: legacyMismatchScriptPath,
            meta: { category: 'text-output', expectation: 'success', fixture: 'custom-text-fixture', tags: ['mismatch'] }
          }
        ]
      }, null, 2),
      'utf8'
    );

    const result = await runCli({
      scriptPath: 'src/cli/rollback-active-memory.js',
      env,
      args: ['--suite', suitePath]
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /recommendationBreakdown: investigate-before-rollback=1, rollback-safe=1/);
    assert.match(result.stdout, /blockerBreakdown: investigate-before-rollback=1/);
    assert.match(result.stdout, /text-output: total=2 ready=1 notReady=1 coreMismatchCount=1 blockers=investigate-before-rollback=1/);
    assert.match(result.stdout, /\[case:mismatch-case\] tool=deepmemo rollbackReady=false/);
    assert.match(result.stdout, /outcome: investigate-before-rollback/);
    assert.match(result.stdout, /blockerReasons: core-diff, result-mismatch/);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('rollback active-memory CLI should run the repository standard suite in require-ready mode', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-standard-rollback-suite-'));

  try {
    const result = await runCli({
      scriptPath: 'src/cli/rollback-active-memory.js',
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
        '--require-ready'
      ]
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = parseJsonOutput(result.stdout);
    assert.equal(payload.mode, 'suite');
    assert.equal(payload.summary.ok, true);
    assert.equal(payload.summary.rollbackReady, true);
    assert.equal(payload.summary.totalCaseCount, 36);
    assert.equal(payload.summary.readyCaseCount, 36);
    assert.equal(payload.summary.notReadyCaseCount, 0);
    assert.equal(payload.summary.extendedMismatchCountTotal, 0);
    assert.deepEqual(payload.summary.recommendationBreakdown, { 'rollback-safe': 36 });
    assert.deepEqual(payload.summary.blockerBreakdown, {});
    assert.equal(payload.compareReport.metaVersion, 1);
    assert.equal(payload.compareReport.fixturePreparation.preparedFixtureCount, 7);
    assert.equal(payload.categoryAggregate.length, 8);
    const orderingAggregate = payload.categoryAggregate.find(item => item.category === 'ordering');
    const fallbackAggregate = payload.categoryAggregate.find(item => item.category === 'fallback');

    assert.equal(orderingAggregate?.readyCaseCount, 4);
    assert.equal(orderingAggregate?.rollbackReady, true);
    assert.equal(orderingAggregate?.fixtureAggregate?.length, 4);
    assert.equal(orderingAggregate?.fixtureAggregate?.find(item => item.fixture === 'vchat-fixture-ranking-extended')?.readyCaseCount, 1);
    assert.equal(fallbackAggregate?.totalCaseCount, 2);
    assert.equal(fallbackAggregate?.fixtureAggregate?.find(item => item.fixture === 'vchat-fixture-no-settings')?.totalCaseCount, 1);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('rollback active-memory CLI should filter standard suite cases by category', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-standard-rollback-category-suite-'));

  try {
    const result = await runCli({
      scriptPath: 'src/cli/rollback-active-memory.js',
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
        '--require-ready'
      ]
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = parseJsonOutput(result.stdout);
    assert.equal(payload.mode, 'suite');
    assert.equal(payload.categoryFilter, 'ordering');
    assert.equal(payload.summary.totalCaseCount, 4);
    assert.equal(payload.summary.readyCaseCount, 4);
    assert.equal(payload.compareReport.categoryFilter, 'ordering');
    assert.equal(payload.compareReport.fixturePreparation.preparedFixtureCount, 4);
    assert.equal(payload.categoryAggregate.length, 1);
    assert.equal(payload.categoryAggregate[0]?.category, 'ordering');
    assert.equal(payload.categoryAggregate[0]?.fixtureAggregate?.length, 4);
    assert.ok(payload.cases.every(caseReport => caseReport.meta?.category === 'ordering'));
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('rollback active-memory CLI should filter standard suite cases by multiple categories', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-standard-rollback-multi-category-suite-'));

  try {
    const result = await runCli({
      scriptPath: 'src/cli/rollback-active-memory.js',
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
        '--require-ready'
      ]
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = parseJsonOutput(result.stdout);
    assert.deepEqual(payload.categoryFilter, ['agent-selection', 'ordering']);
    assert.equal(payload.summary.totalCaseCount, 11);
    assert.equal(payload.summary.readyCaseCount, 11);
    assert.equal(payload.summary.notReadyCaseCount, 0);
    assert.equal(payload.summary.ok, true);
    assert.equal(payload.summary.rollbackReady, true);
    assert.equal(payload.compareReport?.categoryAggregate?.length, 2);
    assert.equal(payload.compareReport?.categoryAggregate.find(item => item.category === 'ordering')?.totalCaseCount, 4);
    assert.equal(payload.compareReport?.categoryAggregate.find(item => item.category === 'agent-selection')?.totalCaseCount, 7);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('rollback active-memory CLI should filter standard suite cases by fixture and tag', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-standard-rollback-fixture-tag-suite-'));

  try {
    const baseEnv = {
      CODEX_MEMORY_BASE_PATH: tempBasePath,
      CODEX_MEMORY_DATA_DIR: 'data',
      CODEX_MEMORY_LOGS_DIR: 'logs',
      CODEX_MEMORY_ACTIVE_MEMORY_ROOT: STANDARD_FIXTURE_ROOT,
      CODEX_MEMORY_ACTIVE_MEMORY_SYNC_MIN_INTERVAL_MS: '0'
    };

    const fixtureResult = await runCli({
      scriptPath: 'src/cli/rollback-active-memory.js',
      env: baseEnv,
      args: [
        '--json',
        '--suite',
        STANDARD_SUITE_PATH,
        '--fixture',
        'vchat-fixture-multi-agent',
        '--require-ready'
      ]
    });

    assert.equal(fixtureResult.code, 0, fixtureResult.stderr);
    const fixturePayload = parseJsonOutput(fixtureResult.stdout);
    assert.deepEqual(fixturePayload.fixtureFilter, ['vchat-fixture-multi-agent']);
    assert.equal(fixturePayload.summary.totalCaseCount, 8);
    assert.equal(fixturePayload.summary.readyCaseCount, 8);
    assert.equal(fixturePayload.compareReport.fixturePreparation.preparedFixtureCount, 1);
    assert.equal(fixturePayload.categoryAggregate.length, 3);
    assert.ok(fixturePayload.cases.every(caseReport => caseReport.meta?.fixture === 'vchat-fixture-multi-agent'));

    const tagResult = await runCli({
      scriptPath: 'src/cli/rollback-active-memory.js',
      env: baseEnv,
      args: [
        '--json',
        '--suite',
        STANDARD_SUITE_PATH,
        '--tag',
        'window-order',
        '--require-ready'
      ]
    });

    assert.equal(tagResult.code, 0, tagResult.stderr);
    const tagPayload = parseJsonOutput(tagResult.stdout);
    assert.deepEqual(tagPayload.tagFilter, ['window-order']);
    assert.equal(tagPayload.summary.totalCaseCount, 2);
    assert.equal(tagPayload.summary.readyCaseCount, 2);
    assert.equal(tagPayload.compareReport.fixturePreparation.preparedFixtureCount, 2);
    assert.equal(tagPayload.categoryAggregate.length, 1);
    assert.equal(tagPayload.categoryAggregate[0]?.category, 'ordering');
    assert.equal(tagPayload.categoryAggregate[0]?.fixtureAggregate?.length, 2);
    assert.ok(tagPayload.cases.every(caseReport => caseReport.meta?.tags?.includes('window-order')));
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('rollback active-memory CLI should filter standard suite cases by tag-all and exclude filters', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-standard-rollback-include-exclude-suite-'));

  try {
    const baseEnv = {
      CODEX_MEMORY_BASE_PATH: tempBasePath,
      CODEX_MEMORY_DATA_DIR: 'data',
      CODEX_MEMORY_LOGS_DIR: 'logs',
      CODEX_MEMORY_ACTIVE_MEMORY_ROOT: STANDARD_FIXTURE_ROOT,
      CODEX_MEMORY_ACTIVE_MEMORY_SYNC_MIN_INTERVAL_MS: '0'
    };

    const tagAllResult = await runCli({
      scriptPath: 'src/cli/rollback-active-memory.js',
      env: baseEnv,
      args: [
        '--json',
        '--suite',
        STANDARD_SUITE_PATH,
        '--tag-all',
        'multi-agent,alias',
        '--require-ready'
      ]
    });

    assert.equal(tagAllResult.code, 0, tagAllResult.stderr);
    const tagAllPayload = parseJsonOutput(tagAllResult.stdout);
    assert.deepEqual(tagAllPayload.tagAllFilter, ['alias', 'multi-agent']);
    assert.equal(tagAllPayload.summary.totalCaseCount, 3);
    assert.equal(tagAllPayload.summary.readyCaseCount, 3);
    assert.equal(tagAllPayload.summary.notReadyCaseCount, 0);
    assert.ok(tagAllPayload.cases.every(caseReport => caseReport.meta?.tags?.includes('alias')));
    assert.ok(tagAllPayload.cases.every(caseReport => caseReport.meta?.tags?.includes('multi-agent')));

    const excludeTagResult = await runCli({
      scriptPath: 'src/cli/rollback-active-memory.js',
      env: baseEnv,
      args: [
        '--json',
        '--suite',
        STANDARD_SUITE_PATH,
        '--exclude-tag',
        'multi-agent',
        '--require-ready'
      ]
    });

    assert.equal(excludeTagResult.code, 0, excludeTagResult.stderr);
    const excludeTagPayload = parseJsonOutput(excludeTagResult.stdout);
    assert.deepEqual(excludeTagPayload.excludeTagFilter, ['multi-agent']);
    assert.equal(excludeTagPayload.summary.totalCaseCount, 28);
    assert.equal(excludeTagPayload.summary.readyCaseCount, 28);
    assert.equal(excludeTagPayload.summary.notReadyCaseCount, 0);
    assert.ok(excludeTagPayload.cases.every(caseReport => !caseReport.meta?.tags?.includes('multi-agent')));

    const excludeFixtureResult = await runCli({
      scriptPath: 'src/cli/rollback-active-memory.js',
      env: baseEnv,
      args: [
        '--json',
        '--suite',
        STANDARD_SUITE_PATH,
        '--exclude-fixture',
        'vchat-fixture-no-settings',
        '--require-ready'
      ]
    });

    assert.equal(excludeFixtureResult.code, 0, excludeFixtureResult.stderr);
    const excludeFixturePayload = parseJsonOutput(excludeFixtureResult.stdout);
    assert.deepEqual(excludeFixturePayload.excludeFixtureFilter, ['vchat-fixture-no-settings']);
    assert.equal(excludeFixturePayload.summary.totalCaseCount, 35);
    assert.equal(excludeFixturePayload.summary.readyCaseCount, 35);
    assert.equal(excludeFixturePayload.summary.notReadyCaseCount, 0);
    assert.ok(excludeFixturePayload.cases.every(caseReport => caseReport.meta?.fixture !== 'vchat-fixture-no-settings'));
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('rollback active-memory CLI should filter standard suite cases by expectation and tool', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-standard-rollback-expectation-tool-suite-'));

  try {
    const baseEnv = {
      CODEX_MEMORY_BASE_PATH: tempBasePath,
      CODEX_MEMORY_DATA_DIR: 'data',
      CODEX_MEMORY_LOGS_DIR: 'logs',
      CODEX_MEMORY_ACTIVE_MEMORY_ROOT: STANDARD_FIXTURE_ROOT,
      CODEX_MEMORY_ACTIVE_MEMORY_SYNC_MIN_INTERVAL_MS: '0'
    };

    const expectationResult = await runCli({
      scriptPath: 'src/cli/rollback-active-memory.js',
      env: baseEnv,
      args: [
        '--json',
        '--suite',
        STANDARD_SUITE_PATH,
        '--expectation',
        'error',
        '--require-ready'
      ]
    });

    assert.equal(expectationResult.code, 0, expectationResult.stderr);
    const expectationPayload = parseJsonOutput(expectationResult.stdout);
    assert.deepEqual(expectationPayload.expectationFilter, ['error']);
    assert.equal(expectationPayload.summary.totalCaseCount, 12);
    assert.equal(expectationPayload.summary.readyCaseCount, 12);
    assert.equal(expectationPayload.compareReport.fixturePreparation.preparedFixtureCount, 2);
    assert.ok(expectationPayload.cases.every(caseReport => caseReport.meta?.expectation === 'error'));

    const expectationMultiResult = await runCli({
      scriptPath: 'src/cli/rollback-active-memory.js',
      env: baseEnv,
      args: [
        '--json',
        '--suite',
        STANDARD_SUITE_PATH,
        '--expectation',
        'error,success',
        '--require-ready'
      ]
    });

    assert.equal(expectationMultiResult.code, 0, expectationMultiResult.stderr);
    const expectationMultiPayload = parseJsonOutput(expectationMultiResult.stdout);
    assert.deepEqual(expectationMultiPayload.expectationFilter, ['error', 'success']);
    assert.equal(expectationMultiPayload.summary.totalCaseCount, 36);
    assert.equal(expectationMultiPayload.summary.readyCaseCount, 36);
    assert.equal(expectationMultiPayload.summary.notReadyCaseCount, 0);
    assert.equal(expectationMultiPayload.compareReport.fixturePreparation.preparedFixtureCount, 7);
    assert.ok(expectationMultiPayload.cases.every(caseReport => ['error', 'success'].includes(caseReport.meta?.expectation)));

    const expectationReverseResult = await runCli({
      scriptPath: 'src/cli/rollback-active-memory.js',
      env: baseEnv,
      args: [
        '--json',
        '--suite',
        STANDARD_SUITE_PATH,
        '--expectation',
        'success,error',
        '--require-ready'
      ]
    });

    assert.equal(expectationReverseResult.code, 0, expectationReverseResult.stderr);
    const expectationReversePayload = parseJsonOutput(expectationReverseResult.stdout);
    assert.deepEqual(expectationReversePayload.expectationFilter, ['error', 'success']);
    assert.equal(expectationReversePayload.summary.totalCaseCount, 36);
    assert.equal(expectationReversePayload.summary.readyCaseCount, 36);
    assert.equal(expectationReversePayload.summary.notReadyCaseCount, 0);
    assert.equal(expectationReversePayload.compareReport.fixturePreparation.preparedFixtureCount, 7);
    const expectationReverseSet = new Set(expectationReversePayload.cases.map(item => item.meta?.expectation));
    assert.deepEqual(
      Array.from(expectationReverseSet).sort(),
      ['error', 'success']
    );

    const expectationDupResult = await runCli({
      scriptPath: 'src/cli/rollback-active-memory.js',
      env: baseEnv,
      args: [
        '--json',
        '--suite',
        STANDARD_SUITE_PATH,
        '--expectation',
        'success,error,success',
        '--require-ready'
      ]
    });

    assert.equal(expectationDupResult.code, 0, expectationDupResult.stderr);
    const expectationDupPayload = parseJsonOutput(expectationDupResult.stdout);
    assert.deepEqual(expectationDupPayload.expectationFilter, ['error', 'success']);
    assert.equal(expectationDupPayload.summary.totalCaseCount, 36);
    assert.equal(expectationDupPayload.summary.readyCaseCount, 36);
    assert.equal(expectationDupPayload.summary.notReadyCaseCount, 0);
    assert.equal(expectationDupPayload.compareReport.fixturePreparation.preparedFixtureCount, 7);
    assert.ok(expectationDupPayload.cases.every(caseReport => ['error', 'success'].includes(caseReport.meta?.expectation)));
    assert.equal(expectationDupPayload.cases.length, expectationDupPayload.summary.totalCaseCount);

    const toolResult = await runCli({
      scriptPath: 'src/cli/rollback-active-memory.js',
      env: baseEnv,
      args: [
        '--json',
        '--suite',
        STANDARD_SUITE_PATH,
        '--tool',
        'topicmemo',
        '--require-ready'
      ]
    });

    assert.equal(toolResult.code, 0, toolResult.stderr);
    const toolPayload = parseJsonOutput(toolResult.stdout);
    assert.deepEqual(toolPayload.toolFilter, ['topicmemo']);
    assert.equal(toolPayload.summary.totalCaseCount, 15);
    assert.equal(toolPayload.summary.readyCaseCount, 15);
    assert.equal(toolPayload.compareReport.fixturePreparation.preparedFixtureCount, 4);
    assert.ok(toolPayload.cases.every(caseReport => caseReport.tool === 'topicmemo'));
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});
