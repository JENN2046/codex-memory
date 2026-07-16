const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  DAEMON_DEPENDENT_FILES,
  FIXTURE_DRIFT_FILES,
  FROZEN_REPLAY_E2E_FILES,
  PROVIDER_DEPENDENT_FILES,
  SELF_REFERENTIAL_FILES,
  resolveExcluded
} = require('../src/cli/run-default-tests');
const {
  TEST_MODES,
  buildContract
} = require('../src/cli/run-release-gate-tests');

test('CM1448 release test gate matrix matches default-safe excluded categories', () => {
  const matrix = fs.readFileSync(path.join(process.cwd(), 'docs', 'CM1448_RELEASE_TEST_GATE_MATRIX.md'), 'utf8');
  const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  const excluded = resolveExcluded();

  for (const label of ['provider', 'daemon', 'self-referential', 'frozen-replay E2E', 'fixture-drift']) {
    assert.match(matrix, new RegExp(label, 'i'));
  }
  for (const file of [
    ...PROVIDER_DEPENDENT_FILES,
    ...DAEMON_DEPENDENT_FILES,
    ...SELF_REFERENTIAL_FILES,
    ...FROZEN_REPLAY_E2E_FILES,
    ...FIXTURE_DRIFT_FILES
  ]) {
    assert.equal(excluded.has(file), true, file);
  }

  assert.match(matrix, /not release readiness/i);
  assert.match(matrix, /adds `npm run test:release-candidate`/i);
  assert.equal(packageJson.scripts['test:release-candidate'], 'node ./src/cli/run-release-gate-tests.js release-candidate');
  assert.equal(packageJson.scripts['test:parity'], 'node ./src/cli/run-release-gate-tests.js parity');
  assert.equal(packageJson.scripts['test:migration'], 'node ./src/cli/run-release-gate-tests.js migration');
  assert.equal(
    packageJson.scripts['test:frozen-replay-e2e'],
    'node --test --test-concurrency=1 tests/cm2118-full-plan-application-execution.test.js tests/cm2120-full-plan-application-receipt-review.test.js tests/cm2122-full-plan-status-sync-execution.test.js'
  );
});

test('CM1459 release gate scripts remain local and do not claim readiness', () => {
  for (const mode of ['migration', 'parity', 'release-candidate']) {
    const contract = buildContract(mode);

    assert.deepEqual(contract.testFiles, TEST_MODES[mode]);
    assert.equal(contract.providerCallsAllowed, false);
    assert.equal(contract.daemonRequired, false);
    assert.equal(contract.liveMemoryAllowed, false);
    assert.equal(contract.rawStoreScanAllowed, false);
    assert.equal(contract.publicMcpExpansionAllowed, false);
    assert.equal(contract.readinessClaimed, false);
    assert.equal(contract.rcReadyClaimed, false);
  }

  assert.equal(buildContract('release-candidate').status, 'RC_NOT_READY_BLOCKED');
});
