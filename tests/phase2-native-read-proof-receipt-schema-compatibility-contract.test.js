'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ALLOWED_RECEIPT_OUTPUT_FIELDS,
  CONTRACT_MODE: READONLY_RECEIPT_CONTRACT_MODE,
  CONTRACT_NAME: READONLY_RECEIPT_CONTRACT_NAME,
  ZERO_WRITE_COUNTER_FIELDS
} = require('../src/core/VcpNativeReadOnlyExecutionReceipt');

const {
  CONTRACT_MODE,
  REQUIRED_CATEGORY_COMPATIBILITY,
  collectForbiddenFields,
  evaluatePhase2NativeReadProofReceiptSchemaCompatibilityContract
} = require('../src/core/Phase2NativeReadProofReceiptSchemaCompatibilityContract');

function zeroCounters() {
  return {
    approvalLineOperations: 0,
    runtimeCalls: 0,
    liveVcpToolBoxCalls: 0,
    nativeReadAttempts: 0,
    memoryReads: 0,
    realMemoryReads: 0,
    rawPrivateReads: 0,
    providerApiCalls: 0,
    nativeWriteAttempts: 0,
    durableMutations: 0,
    publicMcpExpansions: 0,
    receiptApplications: 0,
    completionAuditPatches: 0,
    releaseDeployCutoverActions: 0,
    readinessClaims: 0
  };
}

function contractInput(overrides = {}) {
  return {
    schemaVersion: 1,
    mode: CONTRACT_MODE,
    prerequisites: {
      phase2ReceiptBundleContractAccepted: true,
      nativeReadResponseShapeCompatibilityAccepted: true,
      vcpNativeReadOnlyExecutionReceiptSchemaPresent: true,
      completionAuditStillRequiresExactReceipts: true
    },
    receiptSchema: {
      contractName: READONLY_RECEIPT_CONTRACT_NAME,
      contractMode: READONLY_RECEIPT_CONTRACT_MODE,
      allowedFieldsLocked: true,
      allowedReceiptOutputFields: [...ALLOWED_RECEIPT_OUTPUT_FIELDS],
      rawBodyExcluded: true,
      responseBodyExcluded: true,
      memoryContentExcluded: true,
      endpointLocatorExcluded: true,
      approvalLineExcluded: true,
      zeroWriteCountersRequired: true,
      zeroWriteCounterFields: [...ZERO_WRITE_COUNTER_FIELDS]
    },
    categoryCompatibility: {
      ...REQUIRED_CATEGORY_COMPATIBILITY
    },
    counters: zeroCounters(),
    ...overrides
  };
}

function assertNoSideEffects(result) {
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.receiptAppliedByThisContract, false);
  assert.equal(result.phase2ReceiptBundleApplied, false);
  assert.equal(result.phase2Completed, false);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.liveNativeReadExecuted, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.realMemoryRead, false);
  assert.equal(result.rawPrivateStateRead, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.nativeWriteExecuted, false);
  assert.equal(result.durableMutationPerformed, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
}

test('CM2037 accepts low-disclosure readonly receipt schema compatibility without applying receipts', () => {
  const result = evaluatePhase2NativeReadProofReceiptSchemaCompatibilityContract(contractInput());

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.decision, 'phase2_native_read_receipt_schema_compatibility_accepted');
  assert.equal(result.nativeReadReceiptSchemaCompatibilityPassed, true);
  assert.equal(result.schemaCompatibilityStatus, 'partial_compatible_requires_separate_exact_receipts');
  assert.deepEqual(result.mappedByReadonlyExecutionReceiptSchema, [
    'nativeReadAttemptReceipt',
    'nativeReadSuccessReceipt',
    'lowDisclosureReceipt'
  ]);
  assert.deepEqual(result.stillRequiresSeparateExactReceipts, [
    'nativeTargetBindingReceipt',
    'auditReceipt',
    'fallbackDistinctionReceipt',
    'wslLinuxReceipt',
    'windowsWslSmokeReceipt'
  ]);
  assert.equal(result.compatibilityBoundary.consumesReceiptSchemaOnly, true);
  assert.equal(result.compatibilityBoundary.consumesRuntimeReceiptInstance, false);
  assert.equal(result.compatibilityBoundary.appliesReceiptToCompletionAudit, false);
  assert.equal(result.compatibilityBoundary.completesPhase2, false);
  assertNoSideEffects(result);
});

test('CM2037 rejects readonly receipt schema drift or unlocked raw material fields', () => {
  const input = contractInput({
    receiptSchema: {
      ...contractInput().receiptSchema,
      contractMode: 'changed_mode',
      allowedFieldsLocked: false,
      allowedReceiptOutputFields: [
        ...ALLOWED_RECEIPT_OUTPUT_FIELDS,
        'rawOutput'
      ],
      zeroWriteCounterFields: ZERO_WRITE_COUNTER_FIELDS.filter(field => field !== 'rawBodiesPersisted')
    }
  });
  const result = evaluatePhase2NativeReadProofReceiptSchemaCompatibilityContract(input);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('receiptSchema.contractMode'));
  assert.ok(result.blockers.includes('receiptSchema.allowedFieldsLocked'));
  assert.ok(result.blockers.includes('receiptSchema.allowedReceiptOutputFields'));
  assert.ok(result.blockers.includes('receiptSchema.zeroWriteCounterFields'));
  assert.equal(result.nativeReadReceiptSchemaCompatibilityPassed, false);
  assertNoSideEffects(result);
});

test('CM2037 rejects category compatibility that claims complete Phase 2 receipt coverage', () => {
  const result = evaluatePhase2NativeReadProofReceiptSchemaCompatibilityContract(contractInput({
    categoryCompatibility: {
      ...REQUIRED_CATEGORY_COMPATIBILITY,
      nativeTargetBindingReceipt: 'schema_compatible_requires_future_exact_receipt',
      phase2ReceiptBundleAppliedToCompletionAudit: 'present_low_disclosure_category_only'
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('categoryCompatibility.nativeTargetBindingReceipt'));
  assert.ok(result.blockers.includes('categoryCompatibility.phase2ReceiptBundleAppliedToCompletionAudit'));
  assert.equal(result.nativeReadReceiptSchemaCompatibilityPassed, false);
  assertNoSideEffects(result);
});

test('CM2037 rejects missing prerequisites before receipt schema mapping', () => {
  const result = evaluatePhase2NativeReadProofReceiptSchemaCompatibilityContract(contractInput({
    prerequisites: {
      phase2ReceiptBundleContractAccepted: true,
      nativeReadResponseShapeCompatibilityAccepted: false,
      vcpNativeReadOnlyExecutionReceiptSchemaPresent: true,
      completionAuditStillRequiresExactReceipts: false
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('prerequisites.nativeReadResponseShapeCompatibilityAccepted'));
  assert.ok(result.blockers.includes('prerequisites.completionAuditStillRequiresExactReceipts'));
  assertNoSideEffects(result);
});

test('CM2037 rejects raw receipt or native material by path without echoing values', () => {
  const result = evaluatePhase2NativeReadProofReceiptSchemaCompatibilityContract(contractInput({
    unsafe: {
      responseBody: 'ECHO_RESPONSE_BODY',
      memoryContent: 'ECHO_MEMORY',
      endpoint: 'ECHO_ENDPOINT',
      approvalLine: 'ECHO_APPROVAL',
      bearerToken: 'ECHO_TOKEN'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'unsafe.approvalLine',
    'unsafe.bearerToken',
    'unsafe.endpoint',
    'unsafe.memoryContent',
    'unsafe.responseBody'
  ]);
  assert.equal(serialized.includes('ECHO_RESPONSE_BODY'), false);
  assert.equal(serialized.includes('ECHO_MEMORY'), false);
  assert.equal(serialized.includes('ECHO_ENDPOINT'), false);
  assert.equal(serialized.includes('ECHO_APPROVAL'), false);
  assert.equal(serialized.includes('ECHO_TOKEN'), false);
  assertNoSideEffects(result);
});

test('CM2037 stops L4 on native read receipt application completion or readiness counters', () => {
  const result = evaluatePhase2NativeReadProofReceiptSchemaCompatibilityContract(contractInput({
    request: {
      nativeReadExecuted: true,
      actualReceiptApplied: true,
      phase2Completed: true,
      readinessClaimed: true
    },
    counters: {
      ...zeroCounters(),
      runtimeCalls: 1,
      liveVcpToolBoxCalls: 1,
      nativeReadAttempts: 1,
      realMemoryReads: 1,
      rawPrivateReads: 1,
      providerApiCalls: 1,
      publicMcpExpansions: 1,
      receiptApplications: 1,
      completionAuditPatches: 1,
      releaseDeployCutoverActions: 1,
      readinessClaims: 1
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'stop_l4');
  assert.ok(result.stopReasons.includes('request.nativeReadExecuted'));
  assert.ok(result.stopReasons.includes('request.actualReceiptApplied'));
  assert.ok(result.stopReasons.includes('request.phase2Completed'));
  assert.ok(result.stopReasons.includes('request.readinessClaimed'));
  assert.ok(result.stopReasons.includes('counters.runtimeCalls'));
  assert.ok(result.stopReasons.includes('counters.liveVcpToolBoxCalls'));
  assert.ok(result.stopReasons.includes('counters.nativeReadAttempts'));
  assert.ok(result.stopReasons.includes('counters.realMemoryReads'));
  assert.ok(result.stopReasons.includes('counters.rawPrivateReads'));
  assert.ok(result.stopReasons.includes('counters.providerApiCalls'));
  assert.ok(result.stopReasons.includes('counters.publicMcpExpansions'));
  assert.ok(result.stopReasons.includes('counters.receiptApplications'));
  assert.ok(result.stopReasons.includes('counters.completionAuditPatches'));
  assert.ok(result.stopReasons.includes('counters.releaseDeployCutoverActions'));
  assert.ok(result.stopReasons.includes('counters.readinessClaims'));
  assertNoSideEffects(result);
});

test('CM2037 forbidden field collector reports paths only', () => {
  assert.deepEqual(collectForbiddenFields({
    rawResponse: 'DO_NOT_ECHO_A',
    nested: {
      runtimeCommand: 'DO_NOT_ECHO_B'
    }
  }), [
    'rawResponse',
    'nested.runtimeCommand'
  ]);
});
