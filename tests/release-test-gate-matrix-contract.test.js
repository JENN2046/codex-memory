const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  DAEMON_DEPENDENT_FILES,
  FIXTURE_DRIFT_FILES,
  PROVIDER_DEPENDENT_FILES,
  SELF_REFERENTIAL_FILES,
  resolveExcluded
} = require('../src/cli/run-default-tests');

test('CM1448 release test gate matrix matches default-safe excluded categories', () => {
  const matrix = fs.readFileSync(path.join(process.cwd(), 'docs', 'CM1448_RELEASE_TEST_GATE_MATRIX.md'), 'utf8');
  const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  const excluded = resolveExcluded();

  for (const label of ['provider', 'daemon', 'self-referential', 'fixture-drift']) {
    assert.match(matrix, new RegExp(label, 'i'));
  }
  for (const file of [
    ...PROVIDER_DEPENDENT_FILES,
    ...DAEMON_DEPENDENT_FILES,
    ...SELF_REFERENTIAL_FILES,
    ...FIXTURE_DRIFT_FILES
  ]) {
    assert.equal(excluded.has(file), true, file);
  }

  assert.match(matrix, /not release readiness/i);
  assert.match(matrix, /does not add `npm run test:release-candidate`/i);
  assert.equal(Object.prototype.hasOwnProperty.call(packageJson.scripts, 'test:release-candidate'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(packageJson.scripts, 'test:parity'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(packageJson.scripts, 'test:migration'), false);
});
