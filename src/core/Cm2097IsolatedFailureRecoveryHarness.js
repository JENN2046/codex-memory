'use strict';

const ROUTE_DECISION = 'CM-2097-ER-20260711-FAILURE-RECOVERY-ROUTE-PASS-NO-EXECUTION-C8DBFB58';
const CASE_IDS = Object.freeze([
  'pre_claim_failure_no_side_effect',
  'pre_commit_failure_consumes_claim_without_retry',
  'ambiguous_post_commit_stops_without_retry_or_compensation'
]);

const CASE_SPECIFIC = Object.freeze({
  pre_claim_failure_no_side_effect: Object.freeze({
    failureStage: 'before_authorization_claim',
    nonce: 'cm2097-pre-claim-failure-001',
    receiptId: 'cm2097-pre-claim-failure-receipt-001',
    registryReference: 'cm2097-isolated-registry-pre-claim-001',
    expectedState: 'UNCLAIMED',
    claimCount: 0,
    writeInvocationCount: 0,
    maxNativeWriteCalls: 0,
    maxDurableWrites: 0
  }),
  pre_commit_failure_consumes_claim_without_retry: Object.freeze({
    failureStage: 'after_authorization_claim_before_write_invocation',
    nonce: 'cm2097-pre-commit-failure-001',
    receiptId: 'cm2097-pre-commit-failure-receipt-001',
    registryReference: 'cm2097-isolated-registry-pre-commit-001',
    expectedState: 'CONSUMED_FAILED_PRE_COMMIT',
    claimCount: 1,
    writeInvocationCount: 0,
    maxNativeWriteCalls: 0,
    maxDurableWrites: 0
  }),
  ambiguous_post_commit_stops_without_retry_or_compensation: Object.freeze({
    failureStage: 'after_durable_commit_before_acknowledgement',
    nonce: 'cm2097-ambiguous-post-commit-001',
    receiptId: 'cm2097-ambiguous-post-commit-receipt-001',
    registryReference: 'cm2097-isolated-registry-ambiguous-post-commit-001',
    expectedState: 'CONSUMED_AMBIGUOUS_POST_COMMIT',
    claimCount: 1,
    writeInvocationCount: 1,
    maxNativeWriteCalls: 1,
    maxDurableWrites: 1
  })
});

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function buildCm2097CaseManifest(caseId) {
  if (!CASE_IDS.includes(caseId)) throw new Error('unsupported_cm2097_case_id');
  const specific = CASE_SPECIFIC[caseId];
  return deepFreeze({
    schemaVersion: 1,
    taskId: 'CM-2097',
    routeDecisionReference: ROUTE_DECISION,
    manifestType: 'isolated_synthetic_failure_case_non_executing',
    caseId,
    ...specific,
    isolatedRuntimeStoreRequired: true,
    isolatedRegistryNamespaceRequired: true,
    usesCm2094LiveAuthorization: false,
    usesCm2094Nonce: false,
    usesCm2094RegistryClaim: false,
    modifiesCm2094Record: false,
    productionProviderAllowed: false,
    realMemoryAllowed: false,
    localFallbackAllowed: false,
    retryCount: 0,
    rollbackCount: 0,
    compensationCount: 0,
    authorizationReplayAllowed: false,
    ordinaryCallerFailureStageOverrideAllowed: false,
    arbitraryCallbackInjectionAllowed: false,
    executionAuthorized: false,
    nativeWriteAuthorized: false,
    verifyAuthorized: false,
    failureRecoveryProofPassed: false,
    phase8Completed: false
  });
}

function validateCm2097CaseManifest(manifest = {}) {
  const blockers = [];
  if (!CASE_IDS.includes(manifest.caseId)) return { accepted: false, blockers: ['manifest.caseId'] };
  const expected = buildCm2097CaseManifest(manifest.caseId);
  for (const key of Object.keys(expected)) {
    if (manifest[key] !== expected[key]) blockers.push(`manifest.${key}`);
  }
  for (const key of Object.keys(manifest)) {
    if (!Object.hasOwn(expected, key)) blockers.push(`manifest.${key}`);
  }
  return { accepted: blockers.length === 0, blockers, executionAuthorized: false };
}

function summarizeCm2097HarnessDesign(manifests = []) {
  const validations = manifests.map(validateCm2097CaseManifest);
  const unique = field => new Set(manifests.map(item => item?.[field])).size === CASE_IDS.length;
  const blockers = [];
  if (manifests.length !== CASE_IDS.length) blockers.push('manifests.count');
  if (!CASE_IDS.every(id => manifests.some(item => item?.caseId === id))) blockers.push('manifests.coverage');
  if (validations.some(item => item.accepted !== true)) blockers.push('manifests.validation');
  for (const field of ['nonce', 'receiptId', 'registryReference']) if (!unique(field)) blockers.push(`manifests.unique.${field}`);
  return {
    accepted: blockers.length === 0,
    blockers,
    caseCount: manifests.length,
    executionAuthorized: false,
    failureRecoveryProofPassed: false
  };
}

module.exports = { CASE_IDS, buildCm2097CaseManifest, validateCm2097CaseManifest, summarizeCm2097HarnessDesign };
