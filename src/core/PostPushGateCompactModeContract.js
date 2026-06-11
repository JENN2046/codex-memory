const REQUIRED_COMPACT_FIELDS = Object.freeze([
  'taskId',
  'validationId',
  'pushedCommitShort',
  'pushedCommitSubject',
  'freshGitStatus',
  'gateCommand',
  'gateStatus',
  'gateMode',
  'healthStatus',
  'healthHttpStatus',
  'compareMatchedCount',
  'compareTotalCount',
  'rollbackReadyCount',
  'rollbackTotalCount',
  'rollbackRecommendation',
  'nonClaims'
]);

const REQUIRED_NON_CLAIMS = Object.freeze([
  'productionObserveRollout',
  'productionStrictAuthEnabled',
  'envEdited',
  'startupWatchdogChanged',
  'providerApiCalled',
  'rawBroadScan',
  'publicMcpExpanded',
  'releaseDeployCutover',
  'readinessClaim',
  'completeV8Claimed'
]);

const DEDICATED_RECEIPT_DOC_EXCEPTION_FLAGS = Object.freeze([
  'explicitReceiptDocRequested',
  'gateUnusual',
  'gatePartial',
  'gateFailed',
  'gateRetriedAfterFailure',
  'needsDiagnosis',
  'sourceRuntimeSecurityAuthRollbackProviderMigrationConfigEvidence',
  'exactApprovalTraceabilityNeeded',
  'phaseOrBlockerCloseout',
  'handoffAmbiguous'
]);

function missing(required, value) {
  const actual = value && typeof value === 'object' ? value : {};
  return required.filter(field => !(field in actual));
}

function isMainAligned(status) {
  return typeof status === 'string' && /^## main\.\.\.origin\/main\s*$/.test(status.trim());
}

function hasDedicatedReceiptException(input = {}) {
  return DEDICATED_RECEIPT_DOC_EXCEPTION_FLAGS.some(flag => input[flag] === true);
}

function validatePostPushGateCompactMode(input = {}) {
  const missingFields = missing(REQUIRED_COMPACT_FIELDS, input);
  const missingNonClaims = missing(REQUIRED_NON_CLAIMS, input.nonClaims);
  const dedicatedReceiptException = hasDedicatedReceiptException(input);
  const gatePassed = input.gateStatus === 'ok';
  const gateCommandOk = input.gateCommand === 'npm run gate:mainline';
  const gitAligned = isMainAligned(input.freshGitStatus);
  const healthOk = input.healthStatus === 'ok' && input.healthHttpStatus === 200;
  const compareOk = Number.isInteger(input.compareMatchedCount)
    && Number.isInteger(input.compareTotalCount)
    && input.compareTotalCount > 0
    && input.compareMatchedCount === input.compareTotalCount;
  const rollbackOk = Number.isInteger(input.rollbackReadyCount)
    && Number.isInteger(input.rollbackTotalCount)
    && input.rollbackTotalCount > 0
    && input.rollbackReadyCount === input.rollbackTotalCount
    && input.rollbackRecommendation === 'rollback-safe';
  const nonClaimsOk = missingNonClaims.length === 0
    && REQUIRED_NON_CLAIMS.every(field => input.nonClaims[field] === false || input.nonClaims[field] === 'NOT_CLAIMED');
  const receiptDocAbsent = input.newReceiptDocCreated === false;

  const compactAllowed = missingFields.length === 0
    && gatePassed
    && gateCommandOk
    && gitAligned
    && healthOk
    && compareOk
    && rollbackOk
    && nonClaimsOk
    && receiptDocAbsent
    && dedicatedReceiptException === false;

  const compactBlockedReasons = [];
  if (missingFields.length > 0) compactBlockedReasons.push('missing_required_compact_fields');
  if (missingNonClaims.length > 0) compactBlockedReasons.push('missing_required_non_claims');
  if (!gatePassed) compactBlockedReasons.push('gate_not_ok');
  if (!gateCommandOk) compactBlockedReasons.push('wrong_gate_command');
  if (!gitAligned) compactBlockedReasons.push('git_not_aligned');
  if (!healthOk) compactBlockedReasons.push('health_not_ok');
  if (!compareOk) compactBlockedReasons.push('compare_not_fully_matched');
  if (!rollbackOk) compactBlockedReasons.push('rollback_not_fully_ready');
  if (!nonClaimsOk) compactBlockedReasons.push('non_claims_not_all_false');
  if (!receiptDocAbsent) compactBlockedReasons.push('receipt_doc_created_in_compact_mode');
  if (dedicatedReceiptException) compactBlockedReasons.push('dedicated_receipt_exception_present');

  return {
    status: compactAllowed ? 'COMPACT_MODE_ACCEPTED' : 'COMPACT_MODE_REJECTED_FAIL_CLOSED',
    compactAllowed,
    dedicatedReceiptDocRequired: dedicatedReceiptException || !gatePassed || !healthOk || !compareOk || !rollbackOk,
    missingFields,
    missingNonClaims,
    compactBlockedReasons,
    writesRuntime: false,
    writesProductionConfig: false,
    callsProviderApi: false,
    readsRawMemory: false,
    expandsPublicMcp: false,
    readinessClaimAllowed: false
  };
}

module.exports = {
  DEDICATED_RECEIPT_DOC_EXCEPTION_FLAGS,
  REQUIRED_COMPACT_FIELDS,
  REQUIRED_NON_CLAIMS,
  validatePostPushGateCompactMode
};
