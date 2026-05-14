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
  assert.deepEqual(Object.keys(payload.checks).sort(), [
    'compare',
    'docs',
    'lifecyclePolicy',
    'policyPreflight',
    'queries',
    'rollback',
    'tests'
  ]);
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
  assert.equal(payload.checks.queries.detail.caseCount, 14);
  assert.equal(payload.checks.queries.detail.assertedCount, 14);
  assert.equal(payload.checks.queries.detail.passedCount, 14);
  assert.equal(payload.checks.queries.detail.failedCount, 0);

  assert.equal(payload.checks.policyPreflight.status, 'ok');
  assert.deepEqual(Object.keys(payload.checks.policyPreflight.detail).sort(), [
    'crossClientPrivateFilteredCount',
    'defaultPolicyEnabled',
    'filteredCount',
    'fixtureOnly',
    'inputCount',
    'keptCount',
    'lifecycleFilteredCount',
    'mutated',
    'noDaemon',
    'noNetwork',
    'noProvider'
  ]);
  assert.equal(payload.checks.policyPreflight.detail.fixtureOnly, true);
  assert.equal(payload.checks.policyPreflight.detail.noNetwork, true);
  assert.equal(payload.checks.policyPreflight.detail.noDaemon, true);
  assert.equal(payload.checks.policyPreflight.detail.noProvider, true);
  assert.equal(payload.checks.policyPreflight.detail.mutated, false);
  assert.equal(payload.checks.policyPreflight.detail.defaultPolicyEnabled, false);
  assert.equal(payload.checks.policyPreflight.detail.inputCount, 7);
  assert.equal(payload.checks.policyPreflight.detail.keptCount, 3);
  assert.equal(payload.checks.policyPreflight.detail.filteredCount, 4);
  assert.equal(payload.checks.policyPreflight.detail.lifecycleFilteredCount, 3);
  assert.equal(payload.checks.policyPreflight.detail.crossClientPrivateFilteredCount, 1);

  assert.equal(payload.checks.lifecyclePolicy.status, 'ok');
  assert.deepEqual(Object.keys(payload.checks.lifecyclePolicy.detail).sort(), [
    'auditSummaryShapePresent',
    'automaticMigrationAllowed',
    'defaultEnabled',
    'defaultLifecyclePolicyEnabled',
    'enabledExcludedStatuses',
    'enabledIncludedStatuses',
    'fixtureOnly',
    'hiddenByLifecycleCount',
    'missingColumnBehavior',
    'mustNotTreatUnknownAsActive',
    'mutated',
    'noDaemon',
    'noNetwork',
    'noProvider',
    'rawWorkspaceIdExposed',
    'staleResultCount'
  ]);
  assert.equal(payload.checks.lifecyclePolicy.detail.fixtureOnly, true);
  assert.equal(payload.checks.lifecyclePolicy.detail.noNetwork, true);
  assert.equal(payload.checks.lifecyclePolicy.detail.noDaemon, true);
  assert.equal(payload.checks.lifecyclePolicy.detail.noProvider, true);
  assert.equal(payload.checks.lifecyclePolicy.detail.mutated, false);
  assert.equal(payload.checks.lifecyclePolicy.detail.defaultEnabled, false);
  assert.equal(payload.checks.lifecyclePolicy.detail.defaultLifecyclePolicyEnabled, false);
  assert.deepEqual(payload.checks.lifecyclePolicy.detail.enabledIncludedStatuses, ['active', 'stale']);
  assert.deepEqual(payload.checks.lifecyclePolicy.detail.enabledExcludedStatuses, [
    'proposal',
    'rejected',
    'superseded',
    'tombstoned'
  ]);
  assert.equal(payload.checks.lifecyclePolicy.detail.hiddenByLifecycleCount, 4);
  assert.equal(payload.checks.lifecyclePolicy.detail.staleResultCount, 1);
  assert.equal(payload.checks.lifecyclePolicy.detail.auditSummaryShapePresent, true);
  assert.equal(payload.checks.lifecyclePolicy.detail.rawWorkspaceIdExposed, false);
  assert.equal(result.stdout.includes('workspace_id'), false);

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
  assert.ok(text.includes('14/14 query assertions passed'), 'should include query assertion counts');
  assert.ok(text.includes('policyPreflight'), 'should include policy preflight check');
  assert.ok(text.includes('3/7 records would remain'), 'should include policy preflight counts');
  assert.ok(text.includes('lifecyclePolicy'), 'should include lifecycle policy check');
  assert.ok(text.includes('default off'), 'should include lifecycle default-off summary');
  assert.equal(text.includes('workspace_id'), false, 'should not include raw workspace_id');
  assert.ok(text.includes('tests'), 'should include tests check');
  assert.ok(text.includes('docs'), 'should include docs check');
  assert.ok(text.includes('PASS'), 'should show PASS result');
});
