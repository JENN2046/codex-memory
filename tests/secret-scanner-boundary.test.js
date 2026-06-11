const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  formatSecretRejectionReason,
  scanMemoryWritePayload
} = require('../src/core/SecretScanner');

test('SecretScanner rejects configured secret-like categories without returning raw values', () => {
  const result = scanMemoryWritePayload({
    title: 'Checkpoint',
    content: 'Type: checkpoint\nrisk: bearer TEST_TOKEN_1234567890',
    evidence: 'api_key=TEST_API_KEY_1234567890',
    tags: ['policy', 'pwd=TEST_PASSWORD_VALUE'],
    workspace_id: 'token=TEST_SCOPE_TOKEN_1234567890'
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    [...new Set(result.findings.map(item => item.type))].sort(),
    ['api_key', 'bearer_token', 'password', 'token']
  );

  const serializedFindings = JSON.stringify(result.findings);
  assert.doesNotMatch(serializedFindings, /TEST_TOKEN_1234567890/);
  assert.doesNotMatch(serializedFindings, /TEST_API_KEY_1234567890/);
  assert.doesNotMatch(serializedFindings, /TEST_PASSWORD_VALUE/);
  assert.doesNotMatch(serializedFindings, /TEST_SCOPE_TOKEN_1234567890/);

  const reason = formatSecretRejectionReason(result);
  assert.match(reason, /secret-like content/);
  assert.match(reason, /api_key/);
  assert.doesNotMatch(reason, /TEST_TOKEN_1234567890/);
  assert.doesNotMatch(reason, /TEST_API_KEY_1234567890/);
});

test('SecretScanner current boundary is pattern-based, not entropy-only production DLP', () => {
  const unlabeledHighEntropyLikeText = 'ZXCVBNMASDFGHJKLQWERTYUIOP1234567890';

  const result = scanMemoryWritePayload({
    title: 'Checkpoint',
    content: `Type: checkpoint\nrisk: ${unlabeledHighEntropyLikeText}`,
    evidence: 'synthetic scanner boundary evidence',
    tags: ['security-boundary']
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});
