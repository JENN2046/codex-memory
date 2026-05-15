const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const FIXTURE_PATH = path.join(process.cwd(), 'tests', 'fixtures', 'donor-ranking-tie-breaker-parity-v1.json');
const STANDARD_SUITE_PATH = path.join(process.cwd(), 'benchmarks', 'active-memory-suite', 'standard-suite.json');
const ACTIVE_MEMORY_SUITE_DIR = path.join(process.cwd(), 'benchmarks', 'active-memory-suite');

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw.replace(/^\uFEFF/, ''));
}

function parseJsonOutput(text = '') {
  const trimmed = String(text || '').trim();
  if (trimmed) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Warnings can be interleaved with JSON; scan individual lines below.
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
      // Ignore warning lines.
    }
  }

  return JSON.parse(trimmed);
}

function runDeepMemo({ stdin, env = {} }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['src/cli/deepmemo.js'], {
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

async function hashFile(filePath) {
  const content = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function collectFiles(rootPath) {
  const entries = [];
  const stack = [rootPath];

  while (stack.length > 0) {
    const current = stack.pop();
    const stats = await fs.stat(current);
    if (stats.isDirectory()) {
      const children = await fs.readdir(current);
      for (const child of children) {
        stack.push(path.join(current, child));
      }
      continue;
    }

    if (stats.isFile()) {
      entries.push(current);
    }
  }

  return entries.sort((left, right) => left.localeCompare(right));
}

async function snapshotRelevantFiles(fixture) {
  const absolutePaths = new Set();

  for (const caseDefinition of fixture.cases) {
    absolutePaths.add(path.join(ACTIVE_MEMORY_SUITE_DIR, caseDefinition.inputFile));
    const activeRoot = path.join(ACTIVE_MEMORY_SUITE_DIR, caseDefinition.activeMemoryRoot);
    for (const filePath of await collectFiles(activeRoot)) {
      absolutePaths.add(filePath);
    }
  }

  const entries = [];
  for (const absolutePath of Array.from(absolutePaths).sort((left, right) => left.localeCompare(right))) {
    const relativePath = path.relative(ACTIVE_MEMORY_SUITE_DIR, absolutePath).replace(/\\/g, '/');
    entries.push([relativePath, await hashFile(absolutePath)]);
  }

  return entries;
}

function assertKeys(payload, expected = {}) {
  const topLevelKeys = Object.keys(payload).sort((left, right) => left.localeCompare(right));
  if (expected.topLevelKeys) {
    assert.deepEqual(topLevelKeys, [...expected.topLevelKeys].sort((left, right) => left.localeCompare(right)));
  }
}

function assertOrderedIncludes(text, snippets = []) {
  let previousIndex = -1;
  for (const snippet of snippets) {
    const nextIndex = text.indexOf(snippet);
    assert.notEqual(nextIndex, -1, `Missing ordered snippet: ${snippet}`);
    assert.ok(nextIndex > previousIndex, `Snippet order drifted: ${snippet}`);
    previousIndex = nextIndex;
  }
}

function assertIncludes(text, snippets = []) {
  for (const snippet of snippets) {
    assert.ok(text.includes(snippet), `Missing snippet: ${snippet}`);
  }
}

test('Donor ranking/tie-breaker parity fixture parses and mirrors ordering suite metadata', async () => {
  const fixture = await readJson(FIXTURE_PATH);
  const suite = await readJson(STANDARD_SUITE_PATH);
  const orderingCases = suite.cases.filter(item => item.meta?.category === 'ordering');

  assert.equal(fixture.phase, 'P14.5-ranking-tie-breaker-parity-tests');
  assert.equal(fixture.schema_version, 1);
  assert.equal(fixture.mutated, false);
  assert.equal(fixture.source.kind, 'fixture-only');
  assert.equal(fixture.coverage.standard_suite_category, 'ordering');
  assert.equal(orderingCases.length, fixture.coverage.expectedOrderingCaseCount);
  assert.deepEqual(
    fixture.cases.map(item => item.suiteCaseName).sort((left, right) => left.localeCompare(right)),
    orderingCases.map(item => item.name).sort((left, right) => left.localeCompare(right))
  );
  assert.deepEqual(
    [...new Set(orderingCases.map(item => item.meta.fixture))].sort((left, right) => left.localeCompare(right)),
    [...fixture.coverage.expectedFixtures].sort((left, right) => left.localeCompare(right))
  );
  for (const expectedTag of fixture.coverage.expectedTags) {
    assert.ok(orderingCases.some(item => item.meta.tags.includes(expectedTag)), expectedTag);
  }
});

test('Donor ranking/tie-breaker parity fixture locks ordering snapshots without mutating fixtures', async () => {
  const fixture = await readJson(FIXTURE_PATH);
  const beforeSnapshot = await snapshotRelevantFiles(fixture);
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-donor-ranking-parity-'));

  try {
    for (const caseDefinition of fixture.cases) {
      const inputPath = path.join(ACTIVE_MEMORY_SUITE_DIR, caseDefinition.inputFile);
      const input = await fs.readFile(inputPath, 'utf8');
      const result = await runDeepMemo({
        stdin: input,
        env: {
          CODEX_MEMORY_BASE_PATH: tempBasePath,
          CODEX_MEMORY_DATA_DIR: 'data',
          CODEX_MEMORY_LOGS_DIR: 'logs',
          CODEX_MEMORY_ACTIVE_MEMORY_ROOT: path.join(ACTIVE_MEMORY_SUITE_DIR, caseDefinition.activeMemoryRoot),
          CODEX_MEMORY_ACTIVE_MEMORY_SYNC_MIN_INTERVAL_MS: '0'
        }
      });
      const outputText = result.code === 0 ? result.stdout : result.stderr;
      const payload = parseJsonOutput(outputText);
      const expected = caseDefinition.expected;

      assert.equal(result.code, expected.exitCode, `${caseDefinition.name}: ${result.stderr || result.stdout}`);
      assert.equal(payload.status, expected.status, caseDefinition.name);
      assertKeys(payload, expected);
      assert.equal(typeof payload.result, 'string', caseDefinition.name);
      if (expected.orderedResultIncludes) {
        assertOrderedIncludes(payload.result, expected.orderedResultIncludes);
      }
      if (expected.resultIncludes) {
        assertIncludes(payload.result, expected.resultIncludes);
      }
    }
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }

  const afterSnapshot = await snapshotRelevantFiles(fixture);
  assert.deepEqual(afterSnapshot, beforeSnapshot);
});
