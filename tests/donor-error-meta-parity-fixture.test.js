const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const FIXTURE_PATH = path.join(process.cwd(), 'tests', 'fixtures', 'donor-error-meta-parity-v1.json');
const ACTIVE_MEMORY_SUITE_DIR = path.join(process.cwd(), 'benchmarks', 'active-memory-suite');

const TOOL_SCRIPTS = {
  deepmemo: 'src/cli/deepmemo.js',
  topicmemo: 'src/cli/topicmemo.js'
};

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

function runTool({ tool, args = [], stdin, env = {} }) {
  return new Promise((resolve, reject) => {
    const scriptPath = TOOL_SCRIPTS[tool];
    assert.ok(scriptPath, `Unknown tool: ${tool}`);

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

  for (const key of expected.topLevelMustInclude || []) {
    assert.equal(Object.prototype.hasOwnProperty.call(payload, key), true, `Missing top-level key: ${key}`);
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

function assertMeta(payload, expected = {}, caseName = '') {
  assert.ok(payload.meta && typeof payload.meta === 'object', `${caseName}: missing meta`);

  for (const [key, value] of Object.entries(expected.meta || {})) {
    assert.deepEqual(payload.meta[key], value, `${caseName}: meta.${key}`);
  }

  for (const [key, value] of Object.entries(expected.metaIncludes || {})) {
    assert.equal(typeof payload.meta[key], 'string', `${caseName}: meta.${key}`);
    assert.ok(payload.meta[key].includes(value), `${caseName}: meta.${key}`);
  }
}

test('Donor error/meta parity fixture parses and documents intentional differences', async () => {
  const fixture = await readJson(FIXTURE_PATH);

  assert.equal(fixture.phase, 'P14.4-error-meta-parity-tests');
  assert.equal(fixture.schema_version, 1);
  assert.equal(fixture.mutated, false);
  assert.equal(fixture.source.kind, 'fixture-only');
  assert.deepEqual(
    fixture.cases.map(item => item.name),
    [
      'deepmemo-invalid-json-error-meta',
      'topicmemo-invalid-json-error-meta',
      'deepmemo-agent-not-found-error-meta',
      'deepmemo-success-diagnostics-meta-placement',
      'topicmemo-agent-not-found-error-meta',
      'topicmemo-topic-not-found-error-meta',
      'topicmemo-history-read-error-meta'
    ]
  );
  assert.ok(Array.isArray(fixture.knownIntentionalDifferences));
  assert.ok(fixture.knownIntentionalDifferences.length >= 3);
  for (const difference of fixture.knownIntentionalDifferences) {
    assert.equal(typeof difference.name, 'string');
    assert.equal(typeof difference.reason, 'string');
    assert.equal(typeof difference.validation, 'string');
  }
});

test('Donor error/meta parity fixture locks envelope placement without mutating fixtures', async () => {
  const fixture = await readJson(FIXTURE_PATH);
  const beforeSnapshot = await snapshotRelevantFiles(fixture);
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-donor-error-meta-parity-'));

  try {
    for (const caseDefinition of fixture.cases) {
      const inputPath = path.join(ACTIVE_MEMORY_SUITE_DIR, caseDefinition.inputFile);
      const input = await fs.readFile(inputPath, 'utf8');
      const result = await runTool({
        tool: caseDefinition.tool,
        args: caseDefinition.args || [],
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

      if (expected.errorIncludes) {
        assert.equal(typeof payload.error, 'string', caseDefinition.name);
        assertIncludes(payload.error, expected.errorIncludes);
      }

      if (expected.meta || expected.metaIncludes) {
        assertMeta(payload, expected, caseDefinition.name);
      }
    }
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }

  const afterSnapshot = await snapshotRelevantFiles(fixture);
  assert.deepEqual(afterSnapshot, beforeSnapshot);
});
