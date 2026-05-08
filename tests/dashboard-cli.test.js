const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

function runDashboard({ args = [] } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['src/cli/dashboard.js', ...args], {
      cwd: process.cwd(),
      env: process.env,
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

test('dashboard CLI should report all sections in json mode', async () => {
  const result = await runDashboard({ args: ['--json'] });
  assert.equal(result.code, 0, result.stderr || 'non-zero exit');
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
  assert.ok(payload.store.records > 0, 'should have records');

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

  // Gate section
  assert.ok(payload.gate, 'should have gate section');
  assert.ok(payload.gate.compare);
  assert.ok(payload.gate.rollback);

  // Checks and recommendations
  assert.ok(Array.isArray(payload.checks));
  assert.ok(Array.isArray(payload.recommendations));
});

test('dashboard CLI should support --json --summary-only', async () => {
  const result = await runDashboard({ args: ['--json', '--summary-only'] });
  assert.equal(result.code, 0, result.stderr || 'non-zero exit');
  const payload = parseJsonOutput(result.stdout);

  assert.equal(payload.mode, 'memory-dashboard');
  // Summary-only should have compact store/profile
  assert.ok(payload.store.records > 0);
  assert.ok(!payload.store.ageBreakdown, 'summary-only should omit age breakdown');
});

test('dashboard CLI should emit text output by default', async () => {
  const result = await runDashboard();
  assert.equal(result.code, 0, result.stderr || 'non-zero exit');
  const text = result.stdout;
  assert.ok(text.includes('Memory Dashboard'), 'should include title');
  assert.ok(text.includes('Service'), 'should include Service section');
  assert.ok(text.includes('Store'), 'should include Store section');
  assert.ok(text.includes('Profile'), 'should include Profile section');
  assert.ok(text.includes('Runtime'), 'should include Runtime section');
  assert.ok(text.includes('Checks'), 'should include Checks section');
  assert.ok(text.includes('Recommendations'), 'should include Recommendations');
});
