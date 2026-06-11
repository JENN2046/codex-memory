const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  DEDICATED_RECEIPT_DOC_EXCEPTION_FLAGS,
  REQUIRED_COMPACT_FIELDS,
  REQUIRED_NON_CLAIMS,
  validatePostPushGateCompactMode
} = require('../src/core/PostPushGateCompactModeContract');

const fixture = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'fixtures', 'post-push-gate-compact-mode-cm1682-v1.json'),
  'utf8'
));

test('CM1682 accepts routine post-push gate compact mode without receipt doc', () => {
  const result = validatePostPushGateCompactMode(fixture.acceptedCompactCase);

  assert.equal(result.status, 'COMPACT_MODE_ACCEPTED');
  assert.equal(result.compactAllowed, true);
  assert.equal(result.dedicatedReceiptDocRequired, false);
  assert.deepEqual(result.missingFields, []);
  assert.deepEqual(result.missingNonClaims, []);
  assert.deepEqual(result.compactBlockedReasons, []);
});

test('CM1682 requires dedicated receipt path when exception flag is present', () => {
  const result = validatePostPushGateCompactMode(fixture.exceptionCase);

  assert.equal(result.status, 'COMPACT_MODE_REJECTED_FAIL_CLOSED');
  assert.equal(result.compactAllowed, false);
  assert.equal(result.dedicatedReceiptDocRequired, true);
  assert.ok(result.compactBlockedReasons.includes('dedicated_receipt_exception_present'));
});

test('CM1682 fails closed when required compact fields are missing', () => {
  const result = validatePostPushGateCompactMode(fixture.missingFieldCase);

  assert.equal(result.status, 'COMPACT_MODE_REJECTED_FAIL_CLOSED');
  assert.equal(result.compactAllowed, false);
  assert.ok(result.missingFields.includes('pushedCommitShort'));
  assert.ok(result.missingFields.includes('pushedCommitSubject'));
  assert.ok(result.compactBlockedReasons.includes('missing_required_compact_fields'));
});

test('CM1682 fails closed when forbidden boundary non-claims are positive', () => {
  const result = validatePostPushGateCompactMode(fixture.forbiddenBoundaryCase);

  assert.equal(result.status, 'COMPACT_MODE_REJECTED_FAIL_CLOSED');
  assert.equal(result.compactAllowed, false);
  assert.ok(result.compactBlockedReasons.includes('non_claims_not_all_false'));
});

test('CM1682 contract locks required fields and receipt exception vocabulary', () => {
  assert.ok(REQUIRED_COMPACT_FIELDS.includes('taskId'));
  assert.ok(REQUIRED_COMPACT_FIELDS.includes('validationId'));
  assert.ok(REQUIRED_COMPACT_FIELDS.includes('freshGitStatus'));
  assert.ok(REQUIRED_COMPACT_FIELDS.includes('rollbackRecommendation'));
  assert.ok(REQUIRED_NON_CLAIMS.includes('providerApiCalled'));
  assert.ok(REQUIRED_NON_CLAIMS.includes('publicMcpExpanded'));
  assert.ok(REQUIRED_NON_CLAIMS.includes('completeV8Claimed'));
  assert.ok(DEDICATED_RECEIPT_DOC_EXCEPTION_FLAGS.includes('gateRetriedAfterFailure'));
  assert.ok(DEDICATED_RECEIPT_DOC_EXCEPTION_FLAGS.includes('exactApprovalTraceabilityNeeded'));
  assert.ok(DEDICATED_RECEIPT_DOC_EXCEPTION_FLAGS.includes('handoffAmbiguous'));
});

test('CM1682 helper never performs runtime provider memory public-MCP or readiness actions', () => {
  const result = validatePostPushGateCompactMode(fixture.acceptedCompactCase);

  assert.equal(result.writesRuntime, false);
  assert.equal(result.writesProductionConfig, false);
  assert.equal(result.callsProviderApi, false);
  assert.equal(result.readsRawMemory, false);
  assert.equal(result.expandsPublicMcp, false);
  assert.equal(result.readinessClaimAllowed, false);
});
