'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join('src', 'cli', 'authenticated-http-bounded-mutation-proof.js');

function runCli(args = []) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 30000,
    env: {
      ...process.env,
      NODE_NO_WARNINGS: '1',
      CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: 'false'
    }
  });
}

function parseJson(result) {
  assert.equal(result.stderr, '');
  return JSON.parse(result.stdout);
}

function assertLowDisclosureReport(report, {
  expectedReceiptCount,
  expectedFamilies
} = {}) {
  assert.equal(report.schemaVersion, 'authenticated-http-bounded-mutation-proof-report-v1');
  assert.equal(report.status, 'ok');
  assert.equal(report.decision, 'AUTHENTICATED_HTTP_BOUNDED_MUTATION_PROOF_REPORT_ACCEPTED_NOT_READY');
  assert.equal(report.accepted, true);
  assert.equal(report.receiptCount, expectedReceiptCount);
  assert.equal(report.acceptedReceiptCount, expectedReceiptCount);
  assert.deepEqual(report.mutationFamilies, expectedFamilies);
  assert.equal(report.safety.tempLocalOnly, true);
  assert.equal(report.safety.syntheticOnly, true);
  assert.equal(report.safety.authenticatedHttpRuntimeObserved, true);
  assert.equal(report.safety.endpointOrLocatorReturned, false);
  assert.equal(report.safety.tokenReturned, false);
  assert.equal(report.safety.pathReturned, false);
  assert.equal(report.safety.memoryIdReturned, false);
  assert.equal(report.safety.rawContentReturned, false);
  assert.equal(report.safety.rawResponseReturned, false);
  assert.equal(report.safety.rawErrorReturned, false);
  assert.equal(report.safety.providerCalls, 0);
  assert.equal(report.safety.publicMcpExpansion, false);
  assert.equal(report.safety.readinessClaimed, false);
  assert.equal(report.safety.releaseClaimed, false);
  assert.equal(report.safety.rcReadyClaimed, false);
  assert.equal(report.artifact.jsonStdoutOnly, true);
  assert.equal(report.artifact.fileWritten, false);
  assert.equal(report.artifact.durableArtifactWritten, false);

  for (const receipt of report.receipts) {
    assert.equal(receipt.accepted, true);
    assert.equal(receipt.decision, 'AUTHENTICATED_HTTP_BOUNDED_MUTATION_PROOF_ACCEPTED_NOT_READY');
    assert.equal(receipt.disclosure.lowDisclosure, true);
    assert.equal(receipt.disclosure.endpointOrLocatorIncluded, false);
    assert.equal(receipt.disclosure.pathIncluded, false);
    assert.equal(receipt.disclosure.memoryIdIncluded, false);
    assert.equal(receipt.disclosure.tokenIncluded, false);
    assert.equal(receipt.disclosure.rawContentIncluded, false);
    assert.equal(receipt.disclosure.rawResponseIncluded, false);
    assert.equal(receipt.disclosure.rawErrorIncluded, false);
    assert.equal(receipt.publicHttpBoundary.publicPathRejected, true);
    assert.equal(receipt.publicHttpBoundary.publicMutationPerformed, false);
    assert.equal(receipt.publicHttpBoundary.countsChanged, false);
    assert.equal(receipt.internalRuntimeBoundary.internalMutationPerformed, true);
    assert.equal(receipt.internalRuntimeBoundary.targetProjectionResidualsCleared, true);
    assert.equal(receipt.safety.readinessClaimed, false);
    assert.deepEqual(receipt.blockers, []);
  }
}

function assertOutputHasNoRawRuntimeValues(stdout) {
  assert.doesNotMatch(stdout, /http:\/\/127\.0\.0\.1/i);
  assert.doesNotMatch(stdout, /\bBearer\b/i);
  assert.doesNotMatch(stdout, /\bAuthorization\b/i);
  assert.doesNotMatch(stdout, /codex-memory-http-bounded-mutation-proof/i);
  assert.doesNotMatch(stdout, /http-runner-tombstone-memory/i);
  assert.doesNotMatch(stdout, /http-runner-supersede-old-memory/i);
  assert.doesNotMatch(stdout, /http-runner-supersede-new-memory/i);
  assert.doesNotMatch(stdout, /Synthetic temp-local chunk/i);
  assert.doesNotMatch(stdout, /bounded-cleanup-proof-runner/i);
}

test('authenticated HTTP bounded mutation proof CLI emits low-disclosure JSON report for both families', () => {
  const result = runCli(['--json']);
  assert.equal(result.status, 0, result.stderr);
  const report = parseJson(result);

  assertLowDisclosureReport(report, {
    expectedReceiptCount: 2,
    expectedFamilies: ['tombstone_memory', 'supersede_memory']
  });
  assert.deepEqual(report.receipts.map(receipt => receipt.mutationFamily), [
    'tombstone_memory',
    'supersede_memory'
  ]);
  assertOutputHasNoRawRuntimeValues(result.stdout);
});

test('authenticated HTTP bounded mutation proof CLI can narrow to tombstone family', () => {
  const result = runCli(['--json', '--family', 'tombstone_memory']);
  assert.equal(result.status, 0, result.stderr);
  const report = parseJson(result);

  assertLowDisclosureReport(report, {
    expectedReceiptCount: 1,
    expectedFamilies: ['tombstone_memory']
  });
  assert.equal(report.receipts[0].mutationFamily, 'tombstone_memory');
  assertOutputHasNoRawRuntimeValues(result.stdout);
});

test('authenticated HTTP bounded mutation proof CLI text mode preserves low-disclosure summary', () => {
  const result = runCli([]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /status: ok/);
  assert.match(result.stdout, /accepted: true/);
  assert.match(result.stdout, /receiptCount: 2/);
  assert.match(result.stdout, /endpointOrLocatorReturned: false/);
  assert.match(result.stdout, /tokenReturned: false/);
  assert.match(result.stdout, /memoryIdReturned: false/);
  assert.match(result.stdout, /rawContentReturned: false/);
  assert.match(result.stdout, /providerCalls: 0/);
  assert.match(result.stdout, /fileWritten: false/);
  assertOutputHasNoRawRuntimeValues(result.stdout);
});

test('authenticated HTTP bounded mutation proof CLI rejects unsafe flags without running proof', () => {
  const result = runCli(['--json', '--provider']);
  assert.equal(result.status, 1);
  const report = parseJson(result);

  assert.equal(report.status, 'error');
  assert.equal(report.decision, 'AUTHENTICATED_HTTP_BOUNDED_MUTATION_PROOF_REJECTED_UNSAFE_FLAG');
  assert.equal(report.accepted, false);
  assert.equal(report.rejectedFlag, '--provider');
  assert.equal(report.receiptCount, 0);
  assert.equal(report.acceptedReceiptCount, 0);
  assert.deepEqual(report.mutationFamilies, []);
  assert.deepEqual(report.receipts, []);
  assert.equal(report.safety.authenticatedHttpRuntimeObserved, false);
  assert.equal(report.safety.providerCalls, 0);
  assert.equal(report.artifact.fileWritten, false);
  assertOutputHasNoRawRuntimeValues(result.stdout);
});

test('authenticated HTTP bounded mutation proof CLI rejects unsafe family value before runtime load', () => {
  const result = runCli(['--json', '--family', '--provider']);
  assert.equal(result.status, 1);
  const report = parseJson(result);

  assert.equal(report.status, 'error');
  assert.equal(report.decision, 'AUTHENTICATED_HTTP_BOUNDED_MUTATION_PROOF_REJECTED_UNSAFE_FLAG');
  assert.equal(report.rejectedFlag, '--provider');
  assert.equal(report.safety.authenticatedHttpRuntimeObserved, false);
  assert.deepEqual(report.receipts, []);
  assertOutputHasNoRawRuntimeValues(result.stdout);
});

test('authenticated HTTP bounded mutation proof CLI unsupported family returns non-runtime error report', () => {
  const result = runCli(['--json', '--family', 'unsupported_family']);
  assert.equal(result.status, 1);
  const report = parseJson(result);

  assert.equal(report.status, 'error');
  assert.equal(report.decision, 'AUTHENTICATED_HTTP_BOUNDED_MUTATION_PROOF_REJECTED_UNSUPPORTED_FAMILY');
  assert.equal(report.accepted, false);
  assert.equal(report.receiptCount, 0);
  assert.equal(report.acceptedReceiptCount, 0);
  assert.deepEqual(report.mutationFamilies, []);
  assert.deepEqual(report.blockers, ['unsupported_mutation_family']);
  assert.equal(report.safety.authenticatedHttpRuntimeObserved, false);
  assert.equal(report.artifact.fileWritten, false);
  assertOutputHasNoRawRuntimeValues(result.stdout);
});

test('authenticated HTTP bounded mutation proof CLI help documents local-only evidence mode', () => {
  const result = runCli(['--help']);

  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /Usage: node src\/cli\/authenticated-http-bounded-mutation-proof\.js/);
  assert.match(result.stdout, /temp-local synthetic authenticated HTTP bounded mutation proof/);
  assert.match(result.stdout, /writes no report file/);
  assert.match(result.stdout, /makes no provider calls/);
});
