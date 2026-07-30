'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  EXACT_VCP_SHA,
  parseArguments,
  syntheticEmbedding,
  validateExactCheckout
} = require('../scripts/run-exact-vcp-writer-harness');

test('exact VCP writer harness pins the authoritative baseline and rejects overrides', () => {
  const root = path.resolve('/tmp/synthetic-exact-vcp-checkout');
  assert.deepEqual(
    parseArguments([
      '--vcp-root',
      root,
      '--expected-sha',
      EXACT_VCP_SHA,
      '--json'
    ]),
    {
      expectedSha: '555b3b538f6eb736e530c2912de678c5941f9985',
      json: true,
      vcpRoot: root
    }
  );
  assert.throws(
    () => parseArguments([
      '--vcp-root',
      root,
      '--expected-sha',
      '0000000000000000000000000000000000000000'
    ]),
    /exact_vcp_writer_harness_boundary_invalid/u
  );
  assert.throws(
    () => parseArguments(['--vcp-root', 'relative/path']),
    /exact_vcp_writer_harness_boundary_invalid/u
  );
});

test('synthetic embedding is deterministic, finite, and supports writer-null omission', () => {
  assert.equal(
    syntheticEmbedding('OMIT_VECTOR_SENTINEL fixture', 0),
    null
  );
  const first = syntheticEmbedding('bounded synthetic fixture', 2);
  const second = syntheticEmbedding('bounded synthetic fixture', 2);
  assert.deepEqual(first, second);
  assert.equal(first.length, 4);
  assert.equal(first.every(Number.isFinite), true);
  assert.equal(first.some(value => value !== 0), true);
});

test('CI authority job pins the exact VCP baseline without secret inputs', () => {
  const workflow = fs.readFileSync(
    path.join(__dirname, '..', '.github', 'workflows', 'ci.yml'),
    'utf8'
  );
  const job = workflow.slice(workflow.indexOf('  exact-vcp-writer:'));
  assert.match(job, /repository: lioensky\/VCPToolBox/u);
  assert.match(
    job,
    /ref: 555b3b538f6eb736e530c2912de678c5941f9985/u
  );
  assert.match(
    job,
    /--expected-sha 555b3b538f6eb736e530c2912de678c5941f9985/u
  );
  assert.match(job, /PUPPETEER_SKIP_DOWNLOAD: 'true'/u);
  assert.doesNotMatch(job, /\$\{\{\s*secrets\./u);
});

test('checkout validator accepts an exact clean commit and rejects tracked drift', t => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'codex-memory-vcp-checkout-validator-')
  );
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = args => childProcess.execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
  git(['init', '--quiet']);
  git(['config', 'user.name', 'Synthetic Test']);
  git(['config', 'user.email', 'synthetic@example.invalid']);
  fs.writeFileSync(path.join(root, 'fixture.txt'), 'exact\n', 'utf8');
  git(['add', 'fixture.txt']);
  git(['commit', '--quiet', '-m', 'synthetic exact checkout']);
  const head = git(['rev-parse', 'HEAD']);
  assert.equal(validateExactCheckout(root, head), head);
  fs.writeFileSync(path.join(root, 'fixture.txt'), 'drift\n', 'utf8');
  assert.throws(
    () => validateExactCheckout(root, head),
    /exact_vcp_writer_checkout_modified/u
  );
});
