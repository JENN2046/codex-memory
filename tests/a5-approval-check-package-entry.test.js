const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

test('package exposes A5 approval check through npm script and bin entry', () => {
  assert.equal(
    pkg.scripts['a5:approval-check'],
    'node ./src/cli/a5-approval-check.js'
  );
  assert.equal(
    pkg.bin['codex-memory-a5-approval-check'],
    './src/cli/a5-approval-check.js'
  );
});
