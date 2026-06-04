const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const fixturePath = path.join(__dirname, 'fixtures', 'v8-diagnostic-cli-gate-v1.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function runCli({ args, env }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['src/cli/v8-diagnose.js', ...args], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...env
      },
      stdio: ['ignore', 'pipe', 'pipe']
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
  });
}

async function withSyntheticEnv(profileVersion, handler) {
  const tempBasePath = await fsp.mkdtemp(path.join(os.tmpdir(), 'codex-memory-p17-v8-cli-'));
  try {
    await handler({
      CODEX_MEMORY_BASE_PATH: tempBasePath,
      CODEX_MEMORY_DATA_DIR: path.join(tempBasePath, 'data'),
      CODEX_MEMORY_LOCAL_EMBEDDING_URL: 'http://127.0.0.1:18081/',
      CODEX_MEMORY_LOCAL_EMBEDDING_MODEL: 'bge-m3-local',
      CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: 'true',
      CODEX_MEMORY_EMBEDDING_PROFILE_VERSION: profileVersion
    });
  } finally {
    await fsp.rm(tempBasePath, { recursive: true, force: true });
  }
}

function hasNestedKey(value, key) {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (Object.hasOwn(value, key)) {
    return true;
  }

  return Object.values(value).some(child => hasNestedKey(child, key));
}

function assertForbiddenKeysAbsent(object, forbiddenKeys) {
  for (const key of forbiddenKeys) {
    assert.equal(hasNestedKey(object, key), false, key);
  }
}

function assertNoSensitiveText(output) {
  const encoded = output.toLowerCase();
  for (const fragment of ['authorization:', 'bearer ', 'set-cookie', 'api_key', 'workspace_id']) {
    assert.equal(encoded.includes(fragment), false, fragment);
  }
}

test('P17.3 CLI gate fixture declares no-side-effect boundaries', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'v8-diagnostic-cli-gate-v1');
  assert.equal(fixture.phase, 'P17.3-v8-diagnostic-cli-shape-gate');
  assert.equal(fixture.source.kind, 'fixture-only');
  assert.equal(fixture.source.synthetic, true);
  assert.equal(fixture.safety.mutated, false);
  assert.equal(fixture.safety.providerCalls, 0);
  assert.equal(fixture.safety.durableMemoryTouched, false);
  assert.equal(fixture.safety.realMemoryPreview, false);
  assert.equal(fixture.safety.redactionApplied, true);
  assert.equal(fixture.safety.runtimeTuning, false);
  assert.deepEqual(fixture.safety.publicMcpTools, [
    'record_memory',
    'search_memory',
    'memory_overview',
    'audit_memory'
  ]);
  assert.equal(fixture.safety.validateMemoryPublicTool, false);
});

test('v8-diagnose CLI JSON output preserves diagnostic shape', async () => {
  const fixture = loadFixture();
  const caseDefinition = fixture.jsonCase;

  await withSyntheticEnv(caseDefinition.embeddingProfileVersion, async env => {
    const result = await runCli({
      args: ['--query', caseDefinition.query, '--json'],
      env
    });

    assert.equal(result.code, 0);
    assert.equal(result.stderr, '');

    const payload = JSON.parse(result.stdout);
    assert.equal(payload.mode, caseDefinition.expected.mode);
    assert.equal(payload.destructive, caseDefinition.expected.destructive);
    assert.equal(payload.embeddingProfile.fingerprint, caseDefinition.expected.fingerprint);
    assert.equal(payload.query.normalized, caseDefinition.expected.normalized);
    assert.equal(payload.geodesic.requested, caseDefinition.expected.geodesicRequested);
    assert.equal(payload.geodesic.willUse, caseDefinition.expected.geodesicWillUse);
    assert.equal(payload.tagMemo.mode, caseDefinition.expected.tagMemoMode);
    assert.ok(Array.isArray(payload.terrain.dominantAxes));
    assert.ok(Array.isArray(payload.residualPyramid.levels));
    assert.ok(Array.isArray(payload.tagMemo.coreTags));
    assert.equal(Number.isFinite(payload.metaThinking.score), true);
    assertForbiddenKeysAbsent(payload, fixture.forbiddenOutputKeys);
    assertNoSensitiveText(result.stdout);
  });
});

test('v8-diagnose CLI text output preserves operator labels without unsafe claims', async () => {
  const fixture = loadFixture();
  const caseDefinition = fixture.textCase;

  await withSyntheticEnv(caseDefinition.embeddingProfileVersion, async env => {
    const result = await runCli({
      args: ['--query', caseDefinition.query],
      env
    });

    assert.equal(result.code, 0);
    assert.equal(result.stderr, '');

    for (const line of caseDefinition.requiredLines) {
      assert.match(result.stdout, new RegExp(line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    assertNoSensitiveText(result.stdout);
    assert.equal(result.stdout.includes('hitRate'), false);
    assert.equal(result.stdout.includes('qualityScore'), false);
  });
});

test('v8-diagnose CLI missing query fails without mutation-shaped output', async () => {
  const fixture = loadFixture();
  const caseDefinition = fixture.errorCase;

  await withSyntheticEnv('p17-cli-error', async env => {
    const result = await runCli({
      args: caseDefinition.args,
      env
    });

    assert.equal(result.code, caseDefinition.expected.code);
    assert.equal(result.stdout, caseDefinition.expected.stdout);
    assert.match(result.stderr, new RegExp(caseDefinition.expected.stderrIncludes.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assertNoSensitiveText(result.stderr);
  });
});

test('P17.3 CLI gate test does not rewrite its fixture file', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');
  loadFixture();
  const after = fs.readFileSync(fixturePath, 'utf8');

  assert.equal(after, before);
});
