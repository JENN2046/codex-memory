'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_DECISIONS,
  ALLOWED_NEXT_ACTIONS,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_BLOCKER_FIELDS,
  REQUIRED_EVIDENCE_FIELDS,
  REQUIRED_M10_GATE_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryTrustedWriteProposalM10BlockedStateContract
} = require('../src/core/VcpMemoryTrustedWriteProposalM10BlockedStateContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] ?? 0]));
}

function m10BlockedContract(overrides = {}) {
  const packet = {
    gate_id: 'm10_fixture_trusted_write_proposal_blocked_state_001',
    contract_version: 'vcp_memory_trusted_write_proposal_m10_blocked_state_v1',
    evidence_type: 'fixture-only',
    profile: 'trusted-write-proposal',
    non_authorizing: true,
    m10_blocked_state_only: true
  };

  const evidence = Object.fromEntries(REQUIRED_EVIDENCE_FIELDS.map(field => [field, true]));

  const m10Gate = {
    local_m10_blocked_state_fixture_present: true,
    accepted_planning_evidence_present: true,
    m9_final_blocked_closeout_present: true,
    m9_completed: false,
    m9_completion_claimed: false,
    m9_proposal_mode_complete: false,
    proposal_mode_blocked: true,
    m10_gate_preflight_present: true,
    m10_gate_may_open: false,
    m10_gate_blocked: true,
    m10_runtime_or_write_authorized: false,
    m10_unlocked: false,
    m15_unlocked: false,
    exact_boundary_supplied: false,
    request_body_prepared: false,
    approval_line_generated: false,
    proposal_receipt_accepted: false,
    runtime_attempt_performed: false,
    readiness_claimed: false,
    missing_m10_prerequisites_declared: true
  };

  const blockers = Object.fromEntries(REQUIRED_BLOCKER_FIELDS.map(field => [field, true]));

  const authorization = {
    m10_gate_authorized: false,
    runtime_execution_authorized: false,
    memory_read_authorized: false,
    memory_write_authorized: false,
    durable_write_authorized: false,
    provider_api_authorized: false,
    public_mcp_expansion_authorized: false,
    approval_request_submission_allowed: false,
    approval_line_generation_allowed: false,
    proposal_generation_authorized: false,
    proposal_submission_authorized: false,
    m10_unlocked: false,
    m15_unlocked: false,
    readiness_claimed: false
  };

  const output = {
    disclosure_level: 'redacted_m10_blocked_state',
    raw_private_output_allowed: false,
    concrete_values_disclosed: false,
    request_body_disclosed: false,
    approval_line_value_disclosed: false,
    readiness_claim_allowed: false
  };

  return {
    schemaVersion: 1,
    packet: {
      ...packet,
      ...(overrides.packet || {})
    },
    evidence: {
      ...evidence,
      ...(overrides.evidence || {})
    },
    m10Gate: {
      ...m10Gate,
      ...(overrides.m10Gate || {})
    },
    blockers: {
      ...blockers,
      ...(overrides.blockers || {})
    },
    authorization: {
      ...authorization,
      ...(overrides.authorization || {})
    },
    output: {
      ...output,
      ...(overrides.output || {})
    },
    expectedDecision: overrides.expectedDecision || 'm10_gate_blocked_missing_m9_completion',
    nextActionAllowed: overrides.nextActionAllowed || 'cm1847_fixture_contract',
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => ![
      'packet',
      'evidence',
      'm10Gate',
      'blockers',
      'authorization',
      'output',
      'expectedDecision',
      'nextActionAllowed',
      'counters'
    ].includes(key)))
  };
}

test('CM1847 accepts blocked M10 gate without runtime write or readiness authority', () => {
  const result = validateVcpMemoryTrustedWriteProposalM10BlockedStateContract(
    m10BlockedContract()
  );

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, 'fixture_trusted_write_proposal_m10_blocked_state_only');
  assert.equal(result.decision, 'm10_gate_blocked_missing_m9_completion');
  assert.equal(result.m10BlockedStateAccepted, true);
  assert.equal(result.m9Completed, false);
  assert.equal(result.m9CompletionClaimed, false);
  assert.equal(result.m9ProposalModeComplete, false);
  assert.equal(result.m10GateMayOpen, false);
  assert.equal(result.m10GateBlocked, true);
  assert.equal(result.m10RuntimeOrWriteAuthorized, false);
  assert.equal(result.m10Unlocked, false);
  assert.equal(result.m15Unlocked, false);
  assert.equal(result.approvalRequestBodyPrepared, false);
  assert.equal(result.requestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.proposalGenerated, false);
  assert.equal(result.proposalSubmitted, false);
  assert.equal(result.proposalReceiptAccepted, false);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableWritePerformed, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimAllowed, false);
});

test('CM1847 reports m10_gate_incomplete when evidence or blockers are absent', () => {
  const result = validateVcpMemoryTrustedWriteProposalM10BlockedStateContract(
    m10BlockedContract({
      evidence: {
        cm1846_m9_final_blocked_closeout_present: false,
        cm1846_m10_gate_preflight_present: false
      },
      m10Gate: {
        local_m10_blocked_state_fixture_present: false,
        missing_m10_prerequisites_declared: false
      },
      blockers: {
        m9_completion_missing: false,
        m10_gate_authority_missing: false
      },
      expectedDecision: 'm10_gate_incomplete'
    })
  );

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'm10_gate_incomplete');
  assert.equal(result.m10BlockedStateAccepted, false);
  assert.equal(result.m10GateMayOpen, false);
  assert.equal(result.m10Unlocked, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1847 stops runtime write M10 M15 proposal and readiness claims as L4', () => {
  const result = validateVcpMemoryTrustedWriteProposalM10BlockedStateContract(
    m10BlockedContract({
      m10Gate: Object.fromEntries(REQUIRED_M10_GATE_FIELDS.map(field => [field, true])),
      authorization: Object.fromEntries(REQUIRED_AUTHORIZATION_FIELDS.map(field => [field, true])),
      output: {
        raw_private_output_allowed: true,
        concrete_values_disclosed: true,
        request_body_disclosed: true,
        approval_line_value_disclosed: true,
        readiness_claim_allowed: true
      },
      expectedDecision: 'stop_l4'
    })
  );

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'stop_l4');
  assert.equal(result.m10BlockedStateAccepted, false);
  assert.equal(result.m10GateMayOpen, false);
  assert.equal(result.m10Unlocked, false);
  assert.equal(result.m15Unlocked, false);
  assert.equal(result.requestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.proposalGenerated, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableWritePerformed, false);
  assert.equal(result.readinessClaimAllowed, false);
});

test('CM1847 rejects raw secret runtime M10 and readiness fields without echoing values', () => {
  const result = validateVcpMemoryTrustedWriteProposalM10BlockedStateContract(
    m10BlockedContract({
      packet: {
        targetValue: 'SYNTHETIC_TARGET_SHOULD_NOT_ECHO'
      },
      m10Gate: {
        endpoint: 'SYNTHETIC_ENDPOINT_SHOULD_NOT_ECHO'
      },
      output: {
        providerPayload: 'SYNTHETIC_PROVIDER_SHOULD_NOT_ECHO'
      },
      authorization: {
        m10Unlocked: 'SYNTHETIC_M10_UNLOCK_SHOULD_NOT_ECHO'
      },
      requestBody: 'SYNTHETIC_REQUEST_BODY_SHOULD_NOT_ECHO',
      runtimeAuthorized: 'SYNTHETIC_RUNTIME_AUTH_SHOULD_NOT_ECHO',
      RC_READY: 'SYNTHETIC_RC_READY_SHOULD_NOT_ECHO'
    })
  );
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_m10_or_readiness_fields');
  assert.ok(result.forbiddenFields.includes('packet.targetValue'));
  assert.ok(result.forbiddenFields.includes('m10Gate.endpoint'));
  assert.ok(result.forbiddenFields.includes('output.providerPayload'));
  assert.ok(result.forbiddenFields.includes('authorization.m10Unlocked'));
  assert.ok(result.forbiddenFields.includes('requestBody'));
  assert.ok(result.forbiddenFields.includes('runtimeAuthorized'));
  assert.ok(result.forbiddenFields.includes('RC_READY'));
  assert.equal(serialized.includes('SYNTHETIC_TARGET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_PROVIDER_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_M10_UNLOCK_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_REQUEST_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RUNTIME_AUTH_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RC_READY_SHOULD_NOT_ECHO'), false);
});

test('CM1847 rejects unexpected fields without echoing submitted values', () => {
  const result = validateVcpMemoryTrustedWriteProposalM10BlockedStateContract(
    m10BlockedContract({
      extraRoot: 'SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO',
      m10Gate: {
        extraGate: 'SYNTHETIC_EXTRA_GATE_SHOULD_NOT_ECHO'
      },
      blockers: {
        extraBlocker: 'SYNTHETIC_EXTRA_BLOCKER_SHOULD_NOT_ECHO'
      }
    })
  );
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'unexpected_fields');
  assert.ok(result.unexpectedFields.includes('extraRoot'));
  assert.ok(result.unexpectedFields.includes('m10Gate.extraGate'));
  assert.ok(result.unexpectedFields.includes('blockers.extraBlocker'));
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_GATE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_BLOCKER_SHOULD_NOT_ECHO'), false);
});

test('CM1847 rejects missing positive and malformed zero side-effect counters', () => {
  const missingFixture = m10BlockedContract();
  delete missingFixture.counters.providerApiCalls;

  const missingResult = validateVcpMemoryTrustedWriteProposalM10BlockedStateContract(
    missingFixture
  );
  assert.equal(missingResult.accepted, false);
  assert.equal(missingResult.reasonCode, 'missing_required_fields');
  assert.ok(missingResult.missingFields.includes('counters.providerApiCalls'));

  const positiveResult = validateVcpMemoryTrustedWriteProposalM10BlockedStateContract(
    m10BlockedContract({
      counters: {
        requestBodiesPrepared: 1,
        requestSubmissions: 1,
        approvalLineOperations: 1,
        proposalGenerations: 1,
        proposalReceiptsAccepted: 1,
        runtimeCalls: 1,
        memoryWrites: 1,
        durableWrites: 1,
        m10Unlocks: 1,
        readinessClaims: 1
      }
    })
  );
  assert.equal(positiveResult.accepted, false);
  assert.equal(positiveResult.reasonCode, 'forbidden_positive_side_effect_counters');
  assert.ok(positiveResult.forbiddenCounters.includes('requestBodiesPrepared'));
  assert.ok(positiveResult.forbiddenCounters.includes('requestSubmissions'));
  assert.ok(positiveResult.forbiddenCounters.includes('approvalLineOperations'));
  assert.ok(positiveResult.forbiddenCounters.includes('proposalGenerations'));
  assert.ok(positiveResult.forbiddenCounters.includes('proposalReceiptsAccepted'));
  assert.ok(positiveResult.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(positiveResult.forbiddenCounters.includes('memoryWrites'));
  assert.ok(positiveResult.forbiddenCounters.includes('durableWrites'));
  assert.ok(positiveResult.forbiddenCounters.includes('m10Unlocks'));
  assert.ok(positiveResult.forbiddenCounters.includes('readinessClaims'));

  const malformedResult = validateVcpMemoryTrustedWriteProposalM10BlockedStateContract(
    m10BlockedContract({
      counters: {
        providerApiCalls: '0'
      }
    })
  );
  assert.equal(malformedResult.accepted, false);
  assert.equal(malformedResult.reasonCode, 'invalid_trusted_write_proposal_m10_blocked_state_contract');
  assert.ok(malformedResult.invalidFields.includes('counters.providerApiCalls'));
});

test('CM1847 rejects invalid packet fields decision mismatch and unsafe decision echo', () => {
  const unsafeExpectedDecision = 'PRIVATE_DECISION_SHOULD_NOT_ECHO';
  const invalid = validateVcpMemoryTrustedWriteProposalM10BlockedStateContract(
    m10BlockedContract({
      packet: {
        gate_id: 'unsafe_gate_id',
        profile: 'trusted-write',
        non_authorizing: false
      },
      output: {
        disclosure_level: 'raw'
      },
      expectedDecision: unsafeExpectedDecision,
      nextActionAllowed: 'unlock_m10'
    })
  );
  const serializedInvalid = JSON.stringify(invalid);

  assert.equal(invalid.accepted, false);
  assert.equal(invalid.reasonCode, 'invalid_trusted_write_proposal_m10_blocked_state_contract');
  assert.ok(invalid.invalidFields.includes('packet.gate_id'));
  assert.ok(invalid.invalidFields.includes('packet.profile'));
  assert.ok(invalid.invalidFields.includes('packet.non_authorizing'));
  assert.ok(invalid.invalidFields.includes('output.disclosure_level'));
  assert.ok(invalid.invalidFields.includes('expectedDecision'));
  assert.ok(invalid.invalidFields.includes('nextActionAllowed'));
  assert.equal(serializedInvalid.includes(unsafeExpectedDecision), false);

  const mismatch = validateVcpMemoryTrustedWriteProposalM10BlockedStateContract(
    m10BlockedContract({
      m10Gate: {
        m10_gate_may_open: true
      },
      expectedDecision: 'm10_gate_blocked_missing_m9_completion'
    })
  );

  assert.equal(mismatch.accepted, false);
  assert.equal(mismatch.reasonCode, 'decision_mismatch');
  assert.equal(mismatch.computedDecision, 'stop_l4');
  assert.ok(mismatch.invalidFields.includes('expectedDecision'));
});

test('CM1847 locks M10 blocked vocabulary and no-side-effect posture', () => {
  const result = validateVcpMemoryTrustedWriteProposalM10BlockedStateContract(
    m10BlockedContract()
  );

  assert.ok(ALLOWED_DECISIONS.includes('m10_gate_blocked_missing_m9_completion'));
  assert.ok(ALLOWED_DECISIONS.includes('m10_gate_incomplete'));
  assert.ok(ALLOWED_DECISIONS.includes('stop_l4'));
  assert.ok(ALLOWED_NEXT_ACTIONS.includes('cm1847_fixture_contract'));
  assert.ok(REQUIRED_EVIDENCE_FIELDS.includes('cm1846_m10_gate_preflight_present'));
  assert.ok(REQUIRED_M10_GATE_FIELDS.includes('m10_gate_may_open'));
  assert.ok(REQUIRED_M10_GATE_FIELDS.includes('m10_unlocked'));
  assert.ok(REQUIRED_BLOCKER_FIELDS.includes('m9_completion_missing'));
  assert.ok(REQUIRED_BLOCKER_FIELDS.includes('m10_gate_authority_missing'));
  assert.ok(REQUIRED_AUTHORIZATION_FIELDS.includes('m10_gate_authorized'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('m10Unlocks'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('readinessClaims'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('m10Unlocked'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('runtimeAuthorized'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('completeV8'));
  assert.equal(result.m9Completed, false);
  assert.equal(result.m9CompletionClaimed, false);
  assert.equal(result.m9ProposalModeComplete, false);
  assert.equal(result.m10GateMayOpen, false);
  assert.equal(result.m10GateBlocked, true);
  assert.equal(result.m10RuntimeOrWriteAuthorized, false);
  assert.equal(result.m10Unlocked, false);
  assert.equal(result.m15Unlocked, false);
  assert.equal(result.exactBoundarySupplied, false);
  assert.equal(result.approvalRequestBodyPrepared, false);
  assert.equal(result.requestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.approvalGranted, false);
  assert.equal(result.proposalGenerated, false);
  assert.equal(result.proposalSubmitted, false);
  assert.equal(result.proposalReceiptAccepted, false);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.mcpToolCalled, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableWritePerformed, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimAllowed, false);
});
