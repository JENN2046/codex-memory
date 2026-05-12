const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

function runDashboard({ args = [], env = {} } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['src/cli/dashboard.js', ...args], {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', chunk => { stderr += chunk.toString('utf8'); });
    child.on('error', reject);
    child.on('close', code => { resolve({ code, stdout, stderr }); });
  });
}

function parseJsonOutput(text) {
  return JSON.parse(text);
}

function formatFailure(result) {
  return [
    `exit=${result.code}`,
    '--- stdout ---',
    result.stdout || '<empty>',
    '--- stderr ---',
    result.stderr || '<empty>'
  ].join('\n');
}

test('dashboard CLI should report all sections in json mode', async () => {
  const result = await runDashboard({ args: ['--json'] });
  assert.equal(result.code, 0, formatFailure(result));
  const payload = parseJsonOutput(result.stdout);

  assert.equal(payload.mode, 'memory-dashboard');
  assert.equal(payload.destructive, false);
  assert.equal(typeof payload.summary.status, 'string');

  // Service section
  assert.ok(payload.service, 'should have service section');
  assert.equal(typeof payload.service.status, 'string');
  assert.ok(payload.service.url);

  // Store section
  assert.ok(payload.store, 'should have store section');
  assert.equal(typeof payload.store.records, 'number');
  assert.ok(payload.store.records >= 0, 'records should be non-negative');
  assert.ok(['ok', 'warn'].includes(payload.store.status), 'store status should be ok or warn');
  if (payload.store.records === 0) {
    assert.equal(payload.store.status, 'warn', 'empty clean runner store should warn');
  }

  // Profile section
  assert.ok(payload.profile, 'should have profile section');
  assert.equal(typeof payload.profile.fingerprint, 'string');

  // Runtime section
  assert.ok(payload.runtime, 'should have runtime section');
  assert.equal(typeof payload.runtime.httpLogErrorCount, 'number');

  // Audits section
  assert.ok(payload.audits, 'should have audits section');
  assert.ok(payload.audits.bridge);
  assert.ok(payload.audits.recall);
  assert.equal(typeof payload.audits.recall.scopedRecallCount, 'number');
  assert.equal(typeof payload.audits.recall.strictScopedRecallCount, 'number');
  assert.equal(typeof payload.audits.recall.scopeModeBreakdown, 'object');
  assert.equal(typeof payload.audits.recall.scopeDimensionBreakdown, 'object');
  assert.equal(payload.audits.recall.rawWorkspaceId, undefined);

  // Gate section
  assert.ok(payload.gate, 'should have gate section');
  assert.ok(payload.gate.compare);
  assert.ok(payload.gate.rollback);

  // Governance section
  assert.ok(payload.governance, 'should have governance section');
  assert.equal(typeof payload.governance.status, 'string');
  assert.equal(typeof payload.governance.reviewLevel, 'string');
  assert.equal(typeof payload.governance.counts.proposalCount, 'number');
  assert.equal(typeof payload.governance.counts.stale30d, 'number');
  assert.equal(typeof payload.governance.counts.stale90d, 'number');
  assert.ok(Array.isArray(payload.governance.hints));

  // Checks and recommendations
  assert.ok(Array.isArray(payload.checks));
  assert.ok(Array.isArray(payload.recommendations));
});

test('dashboard CLI should support --json --summary-only', async () => {
  const result = await runDashboard({ args: ['--json', '--summary-only'] });
  assert.equal(result.code, 0, formatFailure(result));
  const payload = parseJsonOutput(result.stdout);

  assert.equal(payload.mode, 'memory-dashboard');
  // Summary-only should have compact store/profile
  assert.equal(typeof payload.store.records, 'number');
  assert.ok(payload.store.records >= 0, 'records should be non-negative');
  assert.ok(['ok', 'warn'].includes(payload.store.status), 'store status should be ok or warn');
  if (payload.store.records === 0) {
    assert.equal(payload.store.status, 'warn', 'empty clean runner store should warn');
  }
  assert.ok(!payload.store.ageBreakdown, 'summary-only should omit age breakdown');
  assert.ok(payload.governance, 'summary-only should keep governance compact section');
  assert.equal(typeof payload.governance.counts.proposalCount, 'number');
  assert.equal(payload.governance.hints, undefined);
});

test('dashboard CLI should emit text output by default', async () => {
  const result = await runDashboard();
  assert.equal(result.code, 0, formatFailure(result));
  const text = result.stdout;
  assert.ok(text.includes('Memory Dashboard'), 'should include title');
  assert.ok(text.includes('Service'), 'should include Service section');
  assert.ok(text.includes('Store'), 'should include Store section');
  assert.ok(text.includes('Profile'), 'should include Profile section');
  assert.ok(text.includes('Runtime'), 'should include Runtime section');
  assert.ok(text.includes('Governance'), 'should include Governance section');
  assert.ok(text.includes('Checks'), 'should include Checks section');
  assert.ok(text.includes('Recommendations'), 'should include Recommendations');
});

test('dashboard CLI should tolerate clean CI runner warnings', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-dashboard-ci-'));
  const missingDataDir = path.join(tempBasePath, 'missing-data');
  const result = await runDashboard({
    args: ['--json'],
    env: {
      CODEX_MEMORY_HTTP_PORT: '1',
      CODEX_MEMORY_DATA_DIR: missingDataDir,
      CODEX_MEMORY_DB_PATH: path.join(missingDataDir, 'codex-memory.sqlite'),
      CODEX_MEMORY_LOGS_DIR: path.join(tempBasePath, 'logs')
    }
  });

  assert.equal(result.code, 0, formatFailure(result));
  const payload = parseJsonOutput(result.stdout);

  assert.equal(payload.summary.status, 'warn');
  assert.equal(payload.service.status, 'warn');
  assert.equal(payload.store.status, 'warn');
  assert.match(payload.store.message, /Database not found/);
  assert.equal(typeof payload.governance.status, 'string');
  assert.equal(typeof payload.governance.reviewLevel, 'string');
  assert.notEqual(payload.gate.status, 'error', formatFailure(result));
  assert.equal(typeof payload.audits.recall.scopedRecallCount, 'number');
});
