'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_EVIDENCE_FIELDS,
  REQUIRED_M10_GATE_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryM10ExactWriteBoundaryGateContract
} = require('../src/core/VcpMemoryM10ExactWriteBoundaryGateContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] ?? 0]));
}

function m10GateContract(overrides = {}) {
  const evidence = Object.fromEntries(REQUIRED_EVIDENCE_FIELDS.map(field => [field, true]));

  const m10Gate = {
    exactWriteBoundaryPresent: false,
    targetBound: false,
    clientIdBound: false,
    scopeBound: false,
    visibilityBound: false,
    rollbackPostureBound: false,
    auditReceiptPlanBound: false,
    mutationFamilySelected: false,
    writeExecutionAllowed: false,
    updateExecutionAllowed: false,
    supersedeExecutionAllowed: false,
    tombstoneExecutionAllowed: false,
    m10GateBlocked: true,
    missingExactWriteBoundaryDeclared: true,
    m10Unlocked: false,
    m15Unlocked: false
  };

  const authorization = Object.fromEntries(REQUIRED_AUTHORIZATION_FIELDS.map(field => [field, false]));

  const output = {
    disclosureLevel: 'redacted_m10_gate_status',
    lowDisclosureReceiptOnly: true,
    rawPrivateOutputAllowed: false,
    concreteValuesDisclosed: false,
    requestBodyDisclosed: false,
    approvalLineValueDisclosed: false,
    readinessClaimAllowed: false
  };

  return {
    schemaVersion: 1,
    taskId: 'CM-1967',
    evidenceType: 'local-contract-only',
    evidence: {
      ...evidence,
      ...(overrides.evidence || {})
    },
    m10Gate: {
      ...m10Gate,
      ...(overrides.m10Gate || {})
    },
    authorization: {
      ...authorization,
      ...(overrides.authorization || {})
    },
    output: {
      ...output,
      ...(overrides.output || {})
    },
    expectedDecision: overrides.expectedDecision || 'm10_blocked_missing_exact_write_boundary',
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => ![
      'evidence',
      'm10Gate',
      'authorization',
      'output',
      'expectedDecision',
      'counters'
    ].includes(key)))
  };
}

test('CM1967 accepts M10 gate blocked by missing exact write boundary after local M9 proposal mode', () => {
  const result = validateVcpMemoryM10ExactWriteBoundaryGateContract(m10GateContract());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, 'local_m10_exact_write_boundary_gate_contract_only');
  assert.equal(result.decision, 'm10_blocked_missing_exact_write_boundary');
  assert.equal(result.m9LocalProposalModeEvidenceAccepted, true);
  assert.equal(result.m10GateMayOpen, false);
  assert.equal(result.m10GateBlocked, true);
  assert.equal(result.m10GateBlockReason, 'missing_exact_write_boundary');
  assert.equal(result.exactWriteBoundaryPresent, false);
  assert.equal(result.exactWriteBoundaryRequired, true);
  assert.equal(result.m10Unlocked, false);
  assert.equal(result.m15Unlocked, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableWritePerformed, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1967 reports incomplete when CM1966 M9 local proposal evidence is absent', () => {
  const result = validateVcpMemoryM10ExactWriteBoundaryGateContract(m10GateContract({
    evidence: {
      cm1966M9ProposalModeContractPassed: false,
      proposalAcceptedWithoutDurableWrite: false,
      proposalRejectedWithoutDurableWrite: false
    },
    expectedDecision: 'm10_incomplete_missing_m9_proposal_mode'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'm10_incomplete_missing_m9_proposal_mode');
  assert.equal(result.m9LocalProposalModeEvidenceAccepted, false);
  assert.equal(result.m10GateMayOpen, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1967 stops exact boundary execution, write authorization, counters, and readiness drift as L4', () => {
  const result = validateVcpMemoryM10ExactWriteBoundaryGateContract(m10GateContract({
    m10Gate: {
      exactWriteBoundaryPresent: true,
      targetBound: true,
      writeExecutionAllowed: true,
      updateExecutionAllowed: true,
      supersedeExecutionAllowed: true,
      tombstoneExecutionAllowed: true,
      m10Unlocked: true,
      m15Unlocked: true
    },
    authorization: Object.fromEntries(REQUIRED_AUTHORIZATION_FIELDS.map(field => [field, true])),
    output: {
      rawPrivateOutputAllowed: true,
      concreteValuesDisclosed: true,
      requestBodyDisclosed: true,
      approvalLineValueDisclosed: true,
      readinessClaimAllowed: true
    },
    counters: {
      memoryWrites: 1,
      memoryUpdates: 1,
      memorySupersedes: 1,
      memoryTombstones: 1,
      durableMemoryWrites: 1,
      readinessClaims: 1
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'stop_l4');
  assert.equal(result.m10GateMayOpen, false);
  assert.equal(result.m10Unlocked, false);
  assert.equal(result.m15Unlocked, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableWritePerformed, false);
  assert.equal(result.readinessClaimed, false);
});

test('CM1967 rejects raw secret runtime exact-value and readiness fields without echoing values', () => {
  const result = validateVcpMemoryM10ExactWriteBoundaryGateContract(m10GateContract({
    rawPayload: 'SYNTHETIC_RAW_VALUE_SHOULD_NOT_ECHO',
    m10Gate: {
      endpoint: 'SYNTHETIC_ENDPOINT_SHOULD_NOT_ECHO',
      targetValue: 'SYNTHETIC_TARGET_SHOULD_NOT_ECHO'
    },
    authorization: {
      writeAuthorized: 'SYNTHETIC_WRITE_AUTH_SHOULD_NOT_ECHO'
    },
    output: {
      providerPayload: 'SYNTHETIC_PROVIDER_SHOULD_NOT_ECHO'
    },
    requestBody: 'SYNTHETIC_REQUEST_BODY_SHOULD_NOT_ECHO',
    RC_READY: true
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_m10_or_readiness_fields');
  assert.ok(result.forbiddenFields.includes('rawPayload'));
  assert.ok(result.forbiddenFields.includes('m10Gate.endpoint'));
  assert.ok(result.forbiddenFields.includes('m10Gate.targetValue'));
  assert.ok(result.forbiddenFields.includes('authorization.writeAuthorized'));
  assert.ok(result.forbiddenFields.includes('output.providerPayload'));
  assert.ok(result.forbiddenFields.includes('requestBody'));
  assert.ok(result.forbiddenFields.includes('RC_READY'));
  assert.equal(serialized.includes('SYNTHETIC_RAW_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_TARGET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_WRITE_AUTH_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_PROVIDER_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_REQUEST_BODY_SHOULD_NOT_ECHO'), false);
});

test('CM1967 rejects missing unexpected invalid counter and decision mismatch shapes', () => {
  const missing = m10GateContract();
  delete missing.m10Gate.exactWriteBoundaryPresent;
  assert.equal(
    validateVcpMemoryM10ExactWriteBoundaryGateContract(missing).reasonCode,
    'missing_required_fields'
  );

  const unexpected = validateVcpMemoryM10ExactWriteBoundaryGateContract(m10GateContract({
    m10Gate: {
      unmodeledGateValue: true
    }
  }));
  assert.equal(unexpected.reasonCode, 'unexpected_fields');

  const invalidCounters = validateVcpMemoryM10ExactWriteBoundaryGateContract(m10GateContract({
    counters: {
      memoryWrites: -1
    }
  }));
  assert.equal(invalidCounters.reasonCode, 'invalid_counters');

  const mismatch = validateVcpMemoryM10ExactWriteBoundaryGateContract(m10GateContract({
    evidence: {
      cm1966M9ProposalModeContractPassed: false
    }
  }));
  assert.equal(mismatch.reasonCode, 'decision_mismatch');
  assert.equal(mismatch.computedDecision, 'm10_incomplete_missing_m9_proposal_mode');
});

test('CM1967 exports M10 gate hard-stop and zero-counter contracts', () => {
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('targetValue'));
  assert.ok(REQUIRED_M10_GATE_FIELDS.includes('exactWriteBoundaryPresent'));
  assert.ok(REQUIRED_EVIDENCE_FIELDS.includes('cm1966M9ProposalModeContractPassed'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('memoryTombstones'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('durableMemoryWrites'));
});
