const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

function runGateCi({ args = [] } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['src/cli/gate-ci.js', ...args], {
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

test('gate:ci CLI should report all checks pass in json mode', async () => {
  const result = await runGateCi({ args: ['--json'] });
  assert.equal(result.code, 0, result.stderr || 'non-zero exit');
  const payload = parseJsonOutput(result.stdout);
  assert.deepEqual(Object.keys(payload).sort(), ['checks', 'generatedAt', 'summary']);
  assert.deepEqual(Object.keys(payload.summary).sort(), [
    'failedChecks',
    'fixtureOnly',
    'mode',
    'noDaemon',
    'noNetwork',
    'noProvider',
    'ok'
  ]);
  assert.deepEqual(Object.keys(payload.checks).sort(), ['compare', 'docs', 'queries', 'rollback', 'tests']);
  assert.equal(payload.summary.ok, true);
  assert.equal(payload.summary.mode, 'ci');
  assert.equal(payload.summary.fixtureOnly, true);
  assert.equal(payload.summary.noNetwork, true);
  assert.deepEqual(payload.summary.failedChecks, []);

  assert.equal(payload.checks.compare.status, 'ok');
  assert.ok(payload.checks.compare.detail.totalCaseCount > 0);
  assert.equal(payload.checks.compare.detail.coreMismatchCountTotal, 0);

  assert.equal(payload.checks.rollback.status, 'ok');
  assert.ok(payload.checks.rollback.detail.totalCaseCount > 0);
  assert.equal(payload.checks.rollback.detail.coreMismatchCountTotal, 0);

  assert.equal(payload.checks.queries.status, 'ok');
  assert.deepEqual(Object.keys(payload.checks.queries.detail).sort(), [
    'assertedCount',
    'caseCount',
    'failedCount',
    'fixtureOnlyCount',
    'passedCount',
    'placeholderCount',
    'realCount',
    'validCount'
  ]);
  assert.equal(payload.checks.queries.detail.caseCount, 8);
  assert.equal(payload.checks.queries.detail.assertedCount, 8);
  assert.equal(payload.checks.queries.detail.passedCount, 8);
  assert.equal(payload.checks.queries.detail.failedCount, 0);

  assert.ok(payload.checks.tests.status === 'ok' || payload.checks.tests.status === 'error',
    'tests check should have valid status');
  assert.ok(typeof payload.checks.tests.detail.total === 'number');
  assert.ok(typeof payload.checks.tests.detail.passed === 'number');
  assert.ok(typeof payload.checks.tests.detail.failed === 'number');

  assert.equal(payload.checks.docs.status, 'ok');
  assert.ok(payload.checks.docs.detail.scriptCount > 0);
  assert.equal(payload.checks.docs.detail.missingCount, 0);
});

test('gate:ci CLI should emit text output by default', async () => {
  const result = await runGateCi();
  assert.equal(result.code, 0, result.stderr || 'non-zero exit');
  const text = result.stdout;
  assert.ok(text.includes('gate:ci'), 'should include title');
  assert.ok(text.includes('fixture-only'), 'should include mode label');
  assert.ok(text.includes('compare'), 'should include compare check');
  assert.ok(text.includes('rollback'), 'should include rollback check');
  assert.ok(text.includes('queries'), 'should include queries check');
  assert.ok(text.includes('8/8 query assertions passed'), 'should include query assertion counts');
  assert.ok(text.includes('tests'), 'should include tests check');
  assert.ok(text.includes('docs'), 'should include docs check');
  assert.ok(text.includes('PASS'), 'should show PASS result');
});
