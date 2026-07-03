'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_DECISIONS,
  ALLOWED_NEXT_ACTIONS,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_BLOCKER_FIELDS,
  REQUIRED_EVIDENCE_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryTrustedWriteProposalCloseoutGateContract
} = require('../src/core/VcpMemoryTrustedWriteProposalCloseoutGateContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] ?? 0]));
}

function closeoutGateContract(overrides = {}) {
  const evidence = {
    m8TrustedFullReadAcceptedForPlanning: true,
    cm1821EnvelopeFixtureContractAccepted: true,
    cm1822ReceiptShapeFixtureContractAccepted: true,
    cm1823GateReviewAccepted: true,
    localFixtureContractPreparationSliceClosed: true,
    m9ProposalModePassed: false,
    m9CompletionClaimed: false,
    m10Unlocked: false,
    m15Unlocked: false
  };

  const blockers = {
    exactTrustedWriteProposalBoundaryPresent: false,
    generatedProposalPresent: false,
    reviewRouteAcceptedReceiptPresent: false,
    realProposalAuditReceiptPresent: false,
    l4WriteIntentWorkflowEvidencePresent: false,
    runtimeExecutionAuthorized: false,
    durableWriteAuthorized: false
  };

  return {
    schemaVersion: 1,
    evidence: {
      ...evidence,
      ...(overrides.evidence || {})
    },
    blockers: {
      ...blockers,
      ...(overrides.blockers || {})
    },
    expectedDecision: overrides.expectedDecision || 'fixture_preparation_closed_m9_blocked',
    nextActionAllowed: overrides.nextActionAllowed || 'cm1824_fixture_contract',
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => ![
      'evidence',
      'blockers',
      'expectedDecision',
      'nextActionAllowed',
      'counters'
    ].includes(key)))
  };
}

test('CM1824 accepts fixture preparation closed while M9 and M10 remain blocked', () => {
  const result = validateVcpMemoryTrustedWriteProposalCloseoutGateContract(closeoutGateContract());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, 'fixture_trusted_write_proposal_closeout_gate_contract_only');
  assert.equal(result.decision, 'fixture_preparation_closed_m9_blocked');
  assert.equal(result.localFixtureContractPreparationSliceClosed, true);
  assert.equal(result.m9ProposalModePassed, false);
  assert.equal(result.m9CompletionClaimed, false);
  assert.equal(result.m10Unlocked, false);
  assert.equal(result.m15Unlocked, false);
  assert.equal(result.proposalGenerated, false);
  assert.equal(result.proposalSubmitted, false);
  assert.equal(result.realProposalReceiptAccepted, false);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableWritePerformed, false);
});

test('CM1824 reports fixture_preparation_incomplete when required local evidence is absent', () => {
  const result = validateVcpMemoryTrustedWriteProposalCloseoutGateContract(closeoutGateContract({
    evidence: {
      cm1822ReceiptShapeFixtureContractAccepted: false,
      cm1823GateReviewAccepted: false,
      localFixtureContractPreparationSliceClosed: false
    },
    expectedDecision: 'fixture_preparation_incomplete'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'fixture_preparation_incomplete');
  assert.equal(result.localFixtureContractPreparationSliceClosed, false);
  assert.equal(result.m9ProposalModePassed, false);
  assert.equal(result.m10Unlocked, false);
});

test('CM1824 stops M9 completion unlock real proposal runtime and write claims as L4', () => {
  const result = validateVcpMemoryTrustedWriteProposalCloseoutGateContract(closeoutGateContract({
    evidence: {
      m9ProposalModePassed: true,
      m9CompletionClaimed: true,
      m10Unlocked: true,
      m15Unlocked: true
    },
    blockers: {
      exactTrustedWriteProposalBoundaryPresent: true,
      generatedProposalPresent: true,
      reviewRouteAcceptedReceiptPresent: true,
      realProposalAuditReceiptPresent: true,
      l4WriteIntentWorkflowEvidencePresent: true,
      runtimeExecutionAuthorized: true,
      durableWriteAuthorized: true
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'stop_l4');
  assert.equal(result.localFixtureContractPreparationSliceClosed, false);
  assert.equal(result.m9ProposalModePassed, false);
  assert.equal(result.m10Unlocked, false);
  assert.equal(result.m15Unlocked, false);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableWritePerformed, false);
});

test('CM1824 rejects raw secret proposal approval and readiness fields without echoing values', () => {
  const result = validateVcpMemoryTrustedWriteProposalCloseoutGateContract(closeoutGateContract({
    rawProposalPayload: 'SYNTHETIC_RAW_PROPOSAL_SHOULD_NOT_ECHO',
    evidence: {
      providerPayload: 'SYNTHETIC_PROVIDER_PAYLOAD_SHOULD_NOT_ECHO'
    },
    blockers: {
      approvalLineValue: 'SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'
    },
    RC_READY: true
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_proposal_or_overclaim_fields');
  assert.ok(result.forbiddenFields.includes('rawProposalPayload'));
  assert.ok(result.forbiddenFields.includes('evidence.providerPayload'));
  assert.ok(result.forbiddenFields.includes('blockers.approvalLineValue'));
  assert.ok(result.forbiddenFields.includes('RC_READY'));
  assert.equal(serialized.includes('SYNTHETIC_RAW_PROPOSAL_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_PROVIDER_PAYLOAD_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'), false);
});

test('CM1824 rejects unexpected fields without echoing submitted values', () => {
  const result = validateVcpMemoryTrustedWriteProposalCloseoutGateContract(closeoutGateContract({
    extraRoot: 'SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO',
    evidence: {
      extraEvidence: 'SYNTHETIC_EXTRA_EVIDENCE_SHOULD_NOT_ECHO'
    },
    blockers: {
      extraBlocker: 'SYNTHETIC_EXTRA_BLOCKER_SHOULD_NOT_ECHO'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'unexpected_fields');
  assert.ok(result.unexpectedFields.includes('extraRoot'));
  assert.ok(result.unexpectedFields.includes('evidence.extraEvidence'));
  assert.ok(result.unexpectedFields.includes('blockers.extraBlocker'));
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_EVIDENCE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_BLOCKER_SHOULD_NOT_ECHO'), false);
});

test('CM1824 rejects missing positive and malformed zero side-effect counters', () => {
  const missingFixture = closeoutGateContract();
  delete missingFixture.counters.providerApiCalls;

  const missingResult = validateVcpMemoryTrustedWriteProposalCloseoutGateContract(missingFixture);
  assert.equal(missingResult.accepted, false);
  assert.equal(missingResult.reasonCode, 'missing_required_fields');
  assert.ok(missingResult.missingFields.includes('counters.providerApiCalls'));

  const positiveResult = validateVcpMemoryTrustedWriteProposalCloseoutGateContract(closeoutGateContract({
    counters: {
      runtimeCalls: 1,
      proposalGenerations: 1,
      acceptedRealProposalReceipts: 1,
      memoryWrites: 1,
      durableWrites: 1,
      approvalLineOperations: 1
    }
  }));
  assert.equal(positiveResult.accepted, false);
  assert.equal(positiveResult.reasonCode, 'forbidden_positive_side_effect_counters');
  assert.ok(positiveResult.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(positiveResult.forbiddenCounters.includes('proposalGenerations'));
  assert.ok(positiveResult.forbiddenCounters.includes('acceptedRealProposalReceipts'));
  assert.ok(positiveResult.forbiddenCounters.includes('memoryWrites'));
  assert.ok(positiveResult.forbiddenCounters.includes('durableWrites'));
  assert.ok(positiveResult.forbiddenCounters.includes('approvalLineOperations'));

  const malformedResult = validateVcpMemoryTrustedWriteProposalCloseoutGateContract(closeoutGateContract({
    counters: {
      providerApiCalls: '0'
    }
  }));
  assert.equal(malformedResult.accepted, false);
  assert.equal(malformedResult.reasonCode, 'invalid_trusted_write_proposal_closeout_gate_contract');
  assert.ok(malformedResult.invalidFields.includes('counters.providerApiCalls'));
});

test('CM1824 rejects invalid decision next action and decision mismatch without unsafe echo', () => {
  const unsafeExpectedDecision = 'PRIVATE_DECISION_SHOULD_NOT_ECHO';
  const invalid = validateVcpMemoryTrustedWriteProposalCloseoutGateContract(closeoutGateContract({
    expectedDecision: unsafeExpectedDecision,
    nextActionAllowed: 'run_runtime_now'
  }));
  const serializedInvalid = JSON.stringify(invalid);

  assert.equal(invalid.accepted, false);
  assert.equal(invalid.reasonCode, 'invalid_trusted_write_proposal_closeout_gate_contract');
  assert.ok(invalid.invalidFields.includes('expectedDecision'));
  assert.ok(invalid.invalidFields.includes('nextActionAllowed'));
  assert.equal(serializedInvalid.includes(unsafeExpectedDecision), false);

  const mismatch = validateVcpMemoryTrustedWriteProposalCloseoutGateContract(closeoutGateContract({
    evidence: {
      cm1821EnvelopeFixtureContractAccepted: false
    },
    expectedDecision: 'fixture_preparation_closed_m9_blocked'
  }));

  assert.equal(mismatch.accepted, false);
  assert.equal(mismatch.reasonCode, 'decision_mismatch');
  assert.equal(mismatch.computedDecision, 'fixture_preparation_incomplete');
  assert.ok(mismatch.invalidFields.includes('expectedDecision'));
});

test('CM1824 locks closeout gate vocabulary and no-side-effect posture', () => {
  const result = validateVcpMemoryTrustedWriteProposalCloseoutGateContract(closeoutGateContract());

  assert.ok(ALLOWED_DECISIONS.includes('fixture_preparation_closed_m9_blocked'));
  assert.ok(ALLOWED_DECISIONS.includes('fixture_preparation_incomplete'));
  assert.ok(ALLOWED_DECISIONS.includes('stop_l4'));
  assert.ok(ALLOWED_NEXT_ACTIONS.includes('cm1824_fixture_contract'));
  assert.ok(REQUIRED_EVIDENCE_FIELDS.includes('cm1821EnvelopeFixtureContractAccepted'));
  assert.ok(REQUIRED_EVIDENCE_FIELDS.includes('localFixtureContractPreparationSliceClosed'));
  assert.ok(REQUIRED_BLOCKER_FIELDS.includes('generatedProposalPresent'));
  assert.ok(REQUIRED_BLOCKER_FIELDS.includes('durableWriteAuthorized'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('acceptedRealProposalReceipts'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('durableWrites'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('rawOutput'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('rawProposalPayload'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('approvalLineValue'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('completeV8'));
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.proposalGenerated, false);
  assert.equal(result.proposalSubmitted, false);
  assert.equal(result.realProposalReceiptAccepted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.mcpToolCalled, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableWritePerformed, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.approvalRequestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.readinessClaimAllowed, false);
});
