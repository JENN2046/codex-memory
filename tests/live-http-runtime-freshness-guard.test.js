'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  computeRuntimeSourceFingerprint,
  RUNTIME_FINGERPRINT_FILES
} = require('../src/core/RuntimeFreshness');
const { buildRuntimeFreshness } = require('../src/adapters/codex-mcp/http');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('runtime source fingerprint is deterministic and bounded', () => {
  const first = computeRuntimeSourceFingerprint({ rootDir: root });
  const second = computeRuntimeSourceFingerprint({ rootDir: root });

  assert.equal(first.algorithm, 'sha256');
  assert.equal(first.sourceFingerprint, second.sourceFingerprint);
  assert.match(first.sourceFingerprint, /^[a-f0-9]{64}$/);
  assert.equal(first.sourceFileCount, RUNTIME_FINGERPRINT_FILES.length);
  assert.deepEqual(first.files, RUNTIME_FINGERPRINT_FILES);
});

test('runtime fingerprint CLI prints only the bounded fingerprint', () => {
  const output = execFileSync(process.execPath, [path.join(root, 'scripts/print-runtime-fingerprint.js')], {
    cwd: root,
    encoding: 'utf8'
  }).trim();

  assert.match(output, /^[a-f0-9]{64}$/);
});

test('HTTP runtime freshness projection is low disclosure', () => {
  const projected = buildRuntimeFreshness({
    algorithm: 'sha256',
    sourceFingerprint: 'f'.repeat(64),
    sourceFileCount: 7,
    startedAt: '2026-06-09T00:00:00.000Z',
    secret: 'should-not-appear',
    path: 'A:/private/path'
  });

  assert.deepEqual(Object.keys(projected).sort(), [
    'algorithm',
    'sourceFileCount',
    'sourceFingerprint',
    'startedAt'
  ]);
  assert.equal(JSON.stringify(projected).includes('should-not-appear'), false);
  assert.equal(JSON.stringify(projected).includes('private/path'), false);
});

test('ensure script fails closed when healthy runtime freshness differs', () => {
  const ensureScript = read('scripts/ensure-codex-memory-http.ps1');

  assert.match(ensureScript, /Get-ExpectedRuntimeFingerprint/);
  assert.match(ensureScript, /print-runtime-fingerprint\.js/);
  assert.match(ensureScript, /Test-RuntimeFreshness/);
  assert.match(ensureScript, /already healthy and fresh/);
  assert.match(ensureScript, /runtime freshness does not match current source fingerprint/);
  assert.doesNotMatch(ensureScript, /already healthy at \$healthUrl"\s*\n\s*exit 0/);
});
