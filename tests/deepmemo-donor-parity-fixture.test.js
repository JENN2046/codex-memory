const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const FIXTURE_PATH = path.join(process.cwd(), 'tests', 'fixtures', 'deepmemo-donor-parity-v1.json');
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
      // Warnings can precede JSON on stderr; scan from the end below.
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

async function snapshotRelevantFiles(fixture) {
  const relativePaths = new Set();

  for (const caseDefinition of fixture.cases) {
    relativePaths.add(caseDefinition.inputFile);
    relativePaths.add(path.join(caseDefinition.activeMemoryRoot, 'settings.json'));
    relativePaths.add(path.join(caseDefinition.activeMemoryRoot, 'Agents', 'maid-keke', 'config.json'));

    if (caseDefinition.activeMemoryRoot === 'vchat-fixture-ranking-extended') {
      relativePaths.add(path.join(caseDefinition.activeMemoryRoot, 'UserData', 'maid-keke', 'topics', 'topic_rank_ext', 'history.json'));
    } else {
      relativePaths.add(path.join(caseDefinition.activeMemoryRoot, 'UserData', 'maid-keke', 'topics', 'topic_alpha', 'history.json'));
      relativePaths.add(path.join(caseDefinition.activeMemoryRoot, 'UserData', 'maid-keke', 'topics', 'topic_beta', 'history.json'));
    }
  }

  const entries = [];
  for (const relativePath of Array.from(relativePaths).sort((left, right) => left.localeCompare(right))) {
    const absolutePath = path.join(ACTIVE_MEMORY_SUITE_DIR, relativePath);
    entries.push([relativePath.replace(/\\/g, '/'), await hashFile(absolutePath)]);
  }

  return entries;
}

function assertKeys(payload, expected = {}) {
  const topLevelKeys = Object.keys(payload).sort((left, right) => left.localeCompare(right));
  if (expected.topLevelKeys) {
    assert.deepEqual(topLevelKeys, [...expected.topLevelKeys].sort((left, right) => left.localeCompare(right)));
  }

  for (const key of expected.forbiddenTopLevelKeys || []) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(payload, key),
      false,
      `Forbidden top-level key leaked: ${key}`
    );
  }
}

function assertIncludes(text, snippets = []) {
  for (const snippet of snippets) {
    assert.match(text, new RegExp(snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
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

test('DeepMemo donor parity fixture parses and stays fixture-only', async () => {
  const fixture = await readJson(FIXTURE_PATH);

  assert.equal(fixture.phase, 'P14.2-DeepMemo-targeted-parity-fixtures');
  assert.equal(fixture.schema_version, 1);
  assert.equal(fixture.mutated, false);
  assert.equal(fixture.source.kind, 'fixture-only');
  assert.deepEqual(
    fixture.cases.map(item => item.name),
    [
      'deepmemo-payload-shape-basic-success',
      'deepmemo-blocked-keyword-meta-placement',
      'deepmemo-advanced-syntax-payload-stability',
      'deepmemo-ranking-three-window-order-snapshot'
    ]
  );
});

test('DeepMemo donor parity fixture locks payload, meta, syntax, and ranking behavior without mutating fixtures', async () => {
  const fixture = await readJson(FIXTURE_PATH);
  const beforeSnapshot = await snapshotRelevantFiles(fixture);
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-deepmemo-donor-parity-'));

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
          CODEX_MEMORY_ACTIVE_MEMORY_SYNC_MIN_INTERVAL_MS: '0',
          ...(caseDefinition.env || {})
        }
      });
      const outputText = result.code === 0 ? result.stdout : result.stderr;
      const payload = parseJsonOutput(outputText);
      const expected = caseDefinition.expected;

      assert.equal(result.code, expected.exitCode, `${caseDefinition.name}: ${result.stderr || result.stdout}`);
      assert.equal(payload.status, expected.status, caseDefinition.name);
      assertKeys(payload, expected);

      if (expected.resultIncludes) {
        assert.equal(typeof payload.result, 'string', caseDefinition.name);
        assertIncludes(payload.result, expected.resultIncludes);
      }

      if (expected.orderedResultIncludes) {
        assert.equal(typeof payload.result, 'string', caseDefinition.name);
        assertOrderedIncludes(payload.result, expected.orderedResultIncludes);
      }

      if (expected.errorIncludes) {
        assert.equal(typeof payload.error, 'string', caseDefinition.name);
        assertIncludes(payload.error, expected.errorIncludes);
      }

      if (expected.meta) {
        assert.ok(payload.meta && typeof payload.meta === 'object', caseDefinition.name);
        for (const [key, value] of Object.entries(expected.meta)) {
          assert.deepEqual(payload.meta[key], value, `${caseDefinition.name}: meta.${key}`);
        }
      }
    }
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }

  const afterSnapshot = await snapshotRelevantFiles(fixture);
  assert.deepEqual(afterSnapshot, beforeSnapshot);
});
