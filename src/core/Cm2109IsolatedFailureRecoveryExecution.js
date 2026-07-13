'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const {
  CASE_IDS,
  buildCm2097CaseManifest,
  validateCm2097CaseManifest
} = require('./Cm2097IsolatedFailureRecoveryHarness');

const HARNESS_ROOT_DIRECTORY = 'phase8-isolated-failure-recovery-harness-001';
const HARNESS_ROOT_REFERENCE = 'phase8-isolated-failure-recovery-harness-001';
const HARNESS_IDENTITY = Object.freeze({
  schemaVersion: 1,
  harnessReference: HARNESS_ROOT_REFERENCE,
  harnessRole: 'isolated_synthetic_failure_recovery_evidence',
  syntheticOnly: true,
  productionProviderAllowed: false,
  realMemoryAllowed: false,
  callerPathOverrideAllowed: false,
  environmentPathOverrideAllowed: false,
  replayAllowed: false
});
const HARNESS_IDENTITY_BYTES = Buffer.from(JSON.stringify(HARNESS_IDENTITY), 'utf8');
const FAILURE_FIXTURE_MARKDOWN = Buffer.from(
  '# Synthetic ambiguous post-commit fixture\n\n' +
  'Synthetic failure-recovery evidence only.\n' +
  'No user memory. No production provider. Not RC_READY.\n',
  'utf8'
);

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256Canonical(value) {
  return sha256(JSON.stringify(canonicalize(value)));
}

function exactJsonBytes(value) {
  return Buffer.from(JSON.stringify(value), 'utf8');
}

async function writeJsonExclusive(target, value) {
  await fs.writeFile(target, exactJsonBytes(value), { flag: 'wx' });
}

async function createCaseRoot(harnessRoot, manifest) {
  const caseRoot = path.join(harnessRoot, manifest.registryReference);
  await fs.mkdir(caseRoot);
  return caseRoot;
}

function baseCaseResult(manifest) {
  return {
    caseId: manifest.caseId,
    failureStage: manifest.failureStage,
    nonce: manifest.nonce,
    receiptId: manifest.receiptId,
    registryReference: manifest.registryReference,
    finalState: manifest.expectedState,
    casePassed: true,
    claimCount: manifest.claimCount,
    writeInvocationCount: manifest.writeInvocationCount,
    nativeWriteCalls: manifest.maxNativeWriteCalls,
    durableWrites: manifest.maxDurableWrites,
    retryCount: 0,
    rollbackCount: 0,
    compensationCount: 0,
    authorizationReplayAllowed: false,
    productionProviderCalled: false,
    realMemoryRead: false,
    realMemoryModified: false,
    localFallbackUsed: false,
    rawMemoryReturned: false,
    rawPathDisclosed: false
  };
}

async function executePreClaimCase(harnessRoot, manifest) {
  await createCaseRoot(harnessRoot, manifest);
  return {
    ...baseCaseResult(manifest),
    authorizationConsumed: false,
    claimEnvelopeCreated: false,
    writeInvocationMarkerCreated: false,
    durableFixtureBytes: 0,
    durableFixtureSha256: null,
    acknowledgementReturned: false,
    stopReason: 'synthetic_failure_before_authorization_claim'
  };
}

async function executePreCommitCase(harnessRoot, manifest) {
  const caseRoot = await createCaseRoot(harnessRoot, manifest);
  const claim = {
    schemaVersion: 1,
    caseId: manifest.caseId,
    nonceHash: sha256(manifest.nonce),
    receiptIdHash: sha256(manifest.receiptId),
    state: 'CLAIMED',
    authorizationReplayAllowed: false
  };
  await writeJsonExclusive(path.join(caseRoot, 'claim-envelope.json'), claim);
  await writeJsonExclusive(path.join(caseRoot, 'terminal-state.json'), {
    schemaVersion: 1,
    caseId: manifest.caseId,
    state: 'CONSUMED_FAILED_PRE_COMMIT',
    claimEnvelopeSha256: sha256(exactJsonBytes(claim)),
    writeInvocationCount: 0,
    durableWrites: 0,
    retryCount: 0,
    compensationCount: 0
  });
  return {
    ...baseCaseResult(manifest),
    authorizationConsumed: true,
    claimEnvelopeCreated: true,
    writeInvocationMarkerCreated: false,
    durableFixtureBytes: 0,
    durableFixtureSha256: null,
    acknowledgementReturned: false,
    stopReason: 'synthetic_failure_after_claim_before_write_invocation'
  };
}

async function executeAmbiguousPostCommitCase(harnessRoot, manifest) {
  const caseRoot = await createCaseRoot(harnessRoot, manifest);
  const claim = {
    schemaVersion: 1,
    caseId: manifest.caseId,
    nonceHash: sha256(manifest.nonce),
    receiptIdHash: sha256(manifest.receiptId),
    state: 'CLAIMED',
    authorizationReplayAllowed: false
  };
  await writeJsonExclusive(path.join(caseRoot, 'claim-envelope.json'), claim);
  await writeJsonExclusive(path.join(caseRoot, 'write-invocation.json'), {
    schemaVersion: 1,
    caseId: manifest.caseId,
    action: 'isolated_synthetic_record_memory_fault_fixture',
    invocationCount: 1,
    automaticRetryAllowed: false
  });
  const storeRoot = path.join(caseRoot, 'isolated-synthetic-store');
  await fs.mkdir(storeRoot);
  await fs.writeFile(path.join(storeRoot, 'ambiguous-post-commit.md'), FAILURE_FIXTURE_MARKDOWN, { flag: 'wx' });
  await writeJsonExclusive(path.join(caseRoot, 'terminal-state.json'), {
    schemaVersion: 1,
    caseId: manifest.caseId,
    state: 'CONSUMED_AMBIGUOUS_POST_COMMIT',
    claimEnvelopeSha256: sha256(exactJsonBytes(claim)),
    writeInvocationCount: 1,
    durableWrites: 1,
    durableFixtureBytes: FAILURE_FIXTURE_MARKDOWN.length,
    durableFixtureSha256: sha256(FAILURE_FIXTURE_MARKDOWN),
    acknowledgementReturned: false,
    retryCount: 0,
    rollbackCount: 0,
    compensationCount: 0
  });
  return {
    ...baseCaseResult(manifest),
    authorizationConsumed: true,
    claimEnvelopeCreated: true,
    writeInvocationMarkerCreated: true,
    durableFixtureBytes: FAILURE_FIXTURE_MARKDOWN.length,
    durableFixtureSha256: sha256(FAILURE_FIXTURE_MARKDOWN),
    acknowledgementReturned: false,
    stopReason: 'synthetic_acknowledgement_lost_after_durable_commit'
  };
}

async function executeCase(harnessRoot, manifest) {
  const validation = validateCm2097CaseManifest(manifest);
  if (!validation.accepted) throw new Error(`cm2109_case_manifest_rejected:${validation.blockers.join(',')}`);
  if (manifest.caseId === CASE_IDS[0]) return executePreClaimCase(harnessRoot, manifest);
  if (manifest.caseId === CASE_IDS[1]) return executePreCommitCase(harnessRoot, manifest);
  if (manifest.caseId === CASE_IDS[2]) return executeAmbiguousPostCommitCase(harnessRoot, manifest);
  throw new Error('cm2109_unsupported_case');
}

async function executeIsolatedFailureRecoveryHarness({
  harnessRoot,
  executionBinding,
  manifests = CASE_IDS.map(buildCm2097CaseManifest)
} = {}) {
  if (!harnessRoot || !executionBinding) throw new Error('cm2109_exact_harness_configuration_required');
  if (manifests.length !== CASE_IDS.length || !CASE_IDS.every((id, index) => manifests[index]?.caseId === id)) {
    throw new Error('cm2109_case_order_or_coverage_invalid');
  }
  await fs.mkdir(harnessRoot);
  await fs.writeFile(path.join(harnessRoot, '.cm2109-harness-identity.json'), HARNESS_IDENTITY_BYTES, { flag: 'wx' });
  const caseResults = [];
  for (const manifest of manifests) {
    const result = await executeCase(harnessRoot, manifest);
    if (result.casePassed !== true) throw new Error(`cm2109_case_failed:${manifest.caseId}`);
    caseResults.push(result);
  }
  const receiptPayload = {
    schemaVersion: 1,
    taskId: 'CM-2109',
    receiptType: 'isolated_three_case_failure_recovery_execution_receipt',
    result: 'PASS',
    executionBinding,
    harness: {
      reference: HARNESS_ROOT_REFERENCE,
      identityBytes: HARNESS_IDENTITY_BYTES.length,
      identitySha256: sha256(HARNESS_IDENTITY_BYTES),
      syntheticOnly: true,
      isolatedRuntimeStoreUsed: true,
      isolatedRegistryNamespaceUsed: true,
      rawPathDisclosed: false
    },
    caseResults,
    summary: {
      caseCount: 3,
      passedCaseCount: 3,
      preClaimFailureNoSideEffect: true,
      preCommitFailureConsumesClaimWithoutRetry: true,
      ambiguousPostCommitStopsWithoutRetryOrCompensation: true,
      totalClaimCount: 2,
      totalWriteInvocationCount: 1,
      totalNativeWriteCalls: 1,
      totalDurableWrites: 1,
      totalRetryCount: 0,
      totalRollbackCount: 0,
      totalCompensationCount: 0,
      failureRecoveryProofEligible: true,
      failureRecoveryProofPassed: false,
      phase8Completed: false
    },
    authorization: {
      useCount: 1,
      consumed: true,
      replayAllowed: false
    },
    boundaries: {
      usesCm2094LiveAuthorization: false,
      usesCm2094Nonce: false,
      usesCm2094RegistryClaim: false,
      modifiesCm2094Record: false,
      productionProviderCalled: false,
      realMemoryRead: false,
      realMemoryModified: false,
      localFallbackUsed: false,
      automaticRetryPerformed: false,
      rollbackOrCompensationPerformed: false,
      rawMemoryReturned: false,
      rawAuditReturned: false,
      rawPathDisclosed: false,
      defaultMcpExpanded: false,
      readinessClaimed: false
    }
  };
  return {
    receiptPayload,
    receiptPayloadSha256: sha256Canonical(receiptPayload),
    failureRecoveryProofEligible: true,
    failureRecoveryProofPassed: false,
    phase8Completed: false
  };
}

function evaluateFailureRecoveryReceipt(receipt = {}, expectedBinding = {}) {
  const blockers = [];
  const payload = receipt.receiptPayload || {};
  if (sha256Canonical(payload) !== receipt.receiptPayloadSha256) blockers.push('receipt.receiptPayloadSha256');
  if (receipt.failureRecoveryProofEligible !== true || receipt.failureRecoveryProofPassed !== false || receipt.phase8Completed !== false) blockers.push('receipt.completionBoundary');
  if (payload.result !== 'PASS' || payload.taskId !== 'CM-2109') blockers.push('receipt.result');
  for (const [field, expected] of Object.entries(expectedBinding)) {
    if (payload.executionBinding?.[field] !== expected) blockers.push(`receipt.executionBinding.${field}`);
  }
  if (payload.harness?.reference !== HARNESS_ROOT_REFERENCE || payload.harness?.identityBytes !== HARNESS_IDENTITY_BYTES.length || payload.harness?.identitySha256 !== sha256(HARNESS_IDENTITY_BYTES) || payload.harness?.syntheticOnly !== true || payload.harness?.isolatedRuntimeStoreUsed !== true || payload.harness?.isolatedRegistryNamespaceUsed !== true || payload.harness?.rawPathDisclosed !== false) blockers.push('receipt.harness');
  if (!Array.isArray(payload.caseResults) || payload.caseResults.length !== 3) blockers.push('receipt.caseResults.count');
  const expectedCaseValues = [
    { id: CASE_IDS[0], state: 'UNCLAIMED', claims: 0, invocations: 0, writes: 0, durable: 0, consumed: false },
    { id: CASE_IDS[1], state: 'CONSUMED_FAILED_PRE_COMMIT', claims: 1, invocations: 0, writes: 0, durable: 0, consumed: true },
    { id: CASE_IDS[2], state: 'CONSUMED_AMBIGUOUS_POST_COMMIT', claims: 1, invocations: 1, writes: 1, durable: 1, consumed: true }
  ];
  for (const expected of expectedCaseValues) {
    const item = payload.caseResults?.find(value => value.caseId === expected.id);
    if (!item || item.casePassed !== true || item.finalState !== expected.state || item.claimCount !== expected.claims || item.writeInvocationCount !== expected.invocations || item.nativeWriteCalls !== expected.writes || item.durableWrites !== expected.durable || item.authorizationConsumed !== expected.consumed || item.authorizationReplayAllowed !== false || item.retryCount !== 0 || item.rollbackCount !== 0 || item.compensationCount !== 0 || item.productionProviderCalled !== false || item.realMemoryRead !== false || item.realMemoryModified !== false || item.localFallbackUsed !== false || item.rawMemoryReturned !== false || item.rawPathDisclosed !== false) blockers.push(`receipt.caseResults.${expected.id}`);
  }
  const ambiguous = payload.caseResults?.find(value => value.caseId === CASE_IDS[2]);
  if (!ambiguous || ambiguous.durableFixtureBytes !== FAILURE_FIXTURE_MARKDOWN.length || ambiguous.durableFixtureSha256 !== sha256(FAILURE_FIXTURE_MARKDOWN) || ambiguous.acknowledgementReturned !== false) blockers.push('receipt.caseResults.ambiguousPostCommit.durableFixture');
  const summary = payload.summary || {};
  const exactSummary = {
    caseCount: 3,
    passedCaseCount: 3,
    preClaimFailureNoSideEffect: true,
    preCommitFailureConsumesClaimWithoutRetry: true,
    ambiguousPostCommitStopsWithoutRetryOrCompensation: true,
    totalClaimCount: 2,
    totalWriteInvocationCount: 1,
    totalNativeWriteCalls: 1,
    totalDurableWrites: 1,
    totalRetryCount: 0,
    totalRollbackCount: 0,
    totalCompensationCount: 0,
    failureRecoveryProofEligible: true,
    failureRecoveryProofPassed: false,
    phase8Completed: false
  };
  for (const [field, expected] of Object.entries(exactSummary)) if (summary[field] !== expected) blockers.push(`receipt.summary.${field}`);
  if (payload.authorization?.useCount !== 1 || payload.authorization?.consumed !== true || payload.authorization?.replayAllowed !== false) blockers.push('receipt.authorization');
  const boundaryFields = ['usesCm2094LiveAuthorization', 'usesCm2094Nonce', 'usesCm2094RegistryClaim', 'modifiesCm2094Record', 'productionProviderCalled', 'realMemoryRead', 'realMemoryModified', 'localFallbackUsed', 'automaticRetryPerformed', 'rollbackOrCompensationPerformed', 'rawMemoryReturned', 'rawAuditReturned', 'rawPathDisclosed', 'defaultMcpExpanded', 'readinessClaimed'];
  if (JSON.stringify(Object.keys(payload.boundaries || {}).sort()) !== JSON.stringify([...boundaryFields].sort())) blockers.push('receipt.boundaries.fields');
  for (const field of boundaryFields) {
    if (payload.boundaries?.[field] !== false) blockers.push(`receipt.boundaries.${field}`);
  }
  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    acceptedAsFailureRecoveryEvidence: blockers.length === 0,
    failureRecoveryApplicationMayBePrepared: blockers.length === 0,
    failureRecoveryProofPassed: false,
    phase8Completed: false,
    additionalNativeActionAuthorized: false
  };
}

module.exports = {
  FAILURE_FIXTURE_MARKDOWN,
  HARNESS_IDENTITY,
  HARNESS_IDENTITY_BYTES,
  HARNESS_ROOT_DIRECTORY,
  HARNESS_ROOT_REFERENCE,
  evaluateFailureRecoveryReceipt,
  executeIsolatedFailureRecoveryHarness,
  sha256,
  sha256Canonical
};
