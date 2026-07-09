'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_DECISIONS,
  ALLOWED_NEXT_ACTIONS,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_EVIDENCE_FIELDS,
  REQUIRED_FEASIBILITY_FIELDS,
  REQUIRED_MISSING_CONCRETE_VALUE_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryTrustedWriteProposalExactFieldBindingFeasibilityContract
} = require('../src/core/VcpMemoryTrustedWriteProposalExactFieldBindingFeasibilityContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] ?? 0]));
}

function exactFieldBindingContract(overrides = {}) {
  const packet = {
    binding_id: 'm9_fixture_trusted_write_proposal_exact_field_binding_feasibility_001',
    contract_version: 'vcp_memory_trusted_write_proposal_exact_field_binding_feasibility_v1',
    evidence_type: 'fixture-only',
    profile: 'trusted-write-proposal',
    non_authorizing: true,
    exact_field_binding_feasibility_only: true
  };

  const evidence = {
    cm1832_closeout_gate_review_present: true,
    cm1833_request_preparation_boundary_contract_present: true,
    cm1834_closeout_gate_review_present: true,
    local_request_preparation_boundary_fixture_contract_closed: true
  };

  const feasibility = {
    local_exact_field_binding_feasibility_fixture_present: true,
    exact_field_binding_ready: false,
    real_exact_target_value_present: false,
    real_exact_transport_value_present: false,
    real_client_ids_present: false,
    real_workspace_scope_present: false,
    real_owner_scope_present: false,
    real_visibility_scope_present: false,
    real_proposal_scope_present: false,
    real_proposal_operation_present: false,
    real_payload_shape_present: false,
    real_review_route_present: false,
    real_rollback_posture_present: false,
    real_budgets_present: false,
    l4_write_intent_shield_proven: false,
    real_proposal_receipt_audit_bound: false,
    approval_request_submission_authority_bound: false,
    approval_line_value_present: false,
    missing_concrete_values_declared: true
  };

  const missingConcreteValues = Object.fromEntries(
    REQUIRED_MISSING_CONCRETE_VALUE_FIELDS.map(field => [field, true])
  );

  const authorization = {
    exact_request_submission_allowed: false,
    approval_line_value_present: false,
    approval_granted: false,
    proposal_generation_authorized: false,
    proposal_submission_authorized: false,
    proposal_acceptance_authorized: false,
    runtime_execution_authorized: false,
    memory_read_authorized: false,
    memory_write_authorized: false,
    durable_write_authorized: false,
    provider_api_authorized: false,
    public_mcp_expansion_authorized: false,
    m9_completion_claimed: false,
    m10_unlocked: false,
    m15_unlocked: false
  };

  const output = {
    disclosure_level: 'redacted_exact_field_binding',
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
    feasibility: {
      ...feasibility,
      ...(overrides.feasibility || {})
    },
    missingConcreteValues: {
      ...missingConcreteValues,
      ...(overrides.missingConcreteValues || {})
    },
    authorization: {
      ...authorization,
      ...(overrides.authorization || {})
    },
    output: {
      ...output,
      ...(overrides.output || {})
    },
    expectedDecision: overrides.expectedDecision || 'exact_field_binding_blocked_missing_concrete_values',
    nextActionAllowed: overrides.nextActionAllowed || 'cm1835_fixture_contract',
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => ![
      'packet',
      'evidence',
      'feasibility',
      'missingConcreteValues',
      'authorization',
      'output',
      'expectedDecision',
      'nextActionAllowed',
      'counters'
    ].includes(key)))
  };
}

test('CM1835 accepts blocked exact field binding feasibility without concrete values', () => {
  const result = validateVcpMemoryTrustedWriteProposalExactFieldBindingFeasibilityContract(
    exactFieldBindingContract()
  );

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, 'fixture_trusted_write_proposal_exact_field_binding_feasibility_only');
  assert.equal(result.decision, 'exact_field_binding_blocked_missing_concrete_values');
  assert.equal(result.exactFieldBindingFeasibilityAccepted, true);
  assert.equal(result.exactFieldBindingReady, false);
  assert.equal(result.concreteValuesPresent, false);
  assert.equal(result.requestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.proposalGenerated, false);
  assert.equal(result.proposalSubmitted, false);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableWritePerformed, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.m10Unlocked, false);
  assert.equal(result.readinessClaimAllowed, false);
});

test('CM1835 reports exact_field_binding_incomplete when evidence or missing concrete values are absent', () => {
  const result = validateVcpMemoryTrustedWriteProposalExactFieldBindingFeasibilityContract(
    exactFieldBindingContract({
      evidence: {
        cm1833_request_preparation_boundary_contract_present: false,
        cm1834_closeout_gate_review_present: false
      },
      feasibility: {
        local_exact_field_binding_feasibility_fixture_present: false,
        missing_concrete_values_declared: false
      },
      missingConcreteValues: {
        exact_target_value_missing: false,
        approval_line_value_missing: false
      },
      expectedDecision: 'exact_field_binding_incomplete'
    })
  );

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'exact_field_binding_incomplete');
  assert.equal(result.exactFieldBindingFeasibilityAccepted, false);
  assert.equal(result.exactFieldBindingReady, false);
  assert.equal(result.requestSubmitted, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1835 stops concrete values request proposal runtime write and unlock claims as L4', () => {
  const result = validateVcpMemoryTrustedWriteProposalExactFieldBindingFeasibilityContract(
    exactFieldBindingContract({
      feasibility: Object.fromEntries(REQUIRED_FEASIBILITY_FIELDS.map(field => [field, true])),
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
  assert.equal(result.exactFieldBindingFeasibilityAccepted, false);
  assert.equal(result.exactFieldBindingReady, false);
  assert.equal(result.requestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.proposalGenerated, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableWritePerformed, false);
  assert.equal(result.m10Unlocked, false);
});

test('CM1835 rejects concrete raw secret request approval and readiness fields without echoing values', () => {
  const result = validateVcpMemoryTrustedWriteProposalExactFieldBindingFeasibilityContract(
    exactFieldBindingContract({
      packet: {
        targetValue: 'SYNTHETIC_TARGET_SHOULD_NOT_ECHO'
      },
      feasibility: {
        endpoint: 'SYNTHETIC_ENDPOINT_SHOULD_NOT_ECHO'
      },
      output: {
        providerPayload: 'SYNTHETIC_PROVIDER_SHOULD_NOT_ECHO'
      },
      authorization: {
        approvalLineValue: 'SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'
      },
      exactFieldBindingReady: 'SYNTHETIC_BINDING_READY_SHOULD_NOT_ECHO',
      RC_READY: 'SYNTHETIC_RC_READY_SHOULD_NOT_ECHO'
    })
  );
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_exact_value_or_overclaim_fields');
  assert.ok(result.forbiddenFields.includes('packet.targetValue'));
  assert.ok(result.forbiddenFields.includes('feasibility.endpoint'));
  assert.ok(result.forbiddenFields.includes('output.providerPayload'));
  assert.ok(result.forbiddenFields.includes('authorization.approvalLineValue'));
  assert.ok(result.forbiddenFields.includes('exactFieldBindingReady'));
  assert.ok(result.forbiddenFields.includes('RC_READY'));
  assert.equal(serialized.includes('SYNTHETIC_TARGET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_PROVIDER_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_BINDING_READY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RC_READY_SHOULD_NOT_ECHO'), false);
});

test('CM1835 rejects unexpected fields without echoing submitted values', () => {
  const result = validateVcpMemoryTrustedWriteProposalExactFieldBindingFeasibilityContract(
    exactFieldBindingContract({
      extraRoot: 'SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO',
      feasibility: {
        extraFeasibility: 'SYNTHETIC_EXTRA_FEASIBILITY_SHOULD_NOT_ECHO'
      },
      missingConcreteValues: {
        extraMissing: 'SYNTHETIC_EXTRA_MISSING_SHOULD_NOT_ECHO'
      }
    })
  );
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'unexpected_fields');
  assert.ok(result.unexpectedFields.includes('extraRoot'));
  assert.ok(result.unexpectedFields.includes('feasibility.extraFeasibility'));
  assert.ok(result.unexpectedFields.includes('missingConcreteValues.extraMissing'));
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_FEASIBILITY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_MISSING_SHOULD_NOT_ECHO'), false);
});

test('CM1835 rejects missing positive and malformed zero side-effect counters', () => {
  const missingFixture = exactFieldBindingContract();
  delete missingFixture.counters.providerApiCalls;

  const missingResult = validateVcpMemoryTrustedWriteProposalExactFieldBindingFeasibilityContract(
    missingFixture
  );
  assert.equal(missingResult.accepted, false);
  assert.equal(missingResult.reasonCode, 'missing_required_fields');
  assert.ok(missingResult.missingFields.includes('counters.providerApiCalls'));

  const positiveResult = validateVcpMemoryTrustedWriteProposalExactFieldBindingFeasibilityContract(
    exactFieldBindingContract({
      counters: {
        requestSubmissions: 1,
        approvalLineOperations: 1,
        proposalGenerations: 1,
        runtimeCalls: 1,
        memoryWrites: 1,
        durableWrites: 1,
        m10Unlocks: 1
      }
    })
  );
  assert.equal(positiveResult.accepted, false);
  assert.equal(positiveResult.reasonCode, 'forbidden_positive_side_effect_counters');
  assert.ok(positiveResult.forbiddenCounters.includes('requestSubmissions'));
  assert.ok(positiveResult.forbiddenCounters.includes('approvalLineOperations'));
  assert.ok(positiveResult.forbiddenCounters.includes('proposalGenerations'));
  assert.ok(positiveResult.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(positiveResult.forbiddenCounters.includes('memoryWrites'));
  assert.ok(positiveResult.forbiddenCounters.includes('durableWrites'));
  assert.ok(positiveResult.forbiddenCounters.includes('m10Unlocks'));

  const malformedResult = validateVcpMemoryTrustedWriteProposalExactFieldBindingFeasibilityContract(
    exactFieldBindingContract({
      counters: {
        providerApiCalls: '0'
      }
    })
  );
  assert.equal(malformedResult.accepted, false);
  assert.equal(
    malformedResult.reasonCode,
    'invalid_trusted_write_proposal_exact_field_binding_feasibility_contract'
  );
  assert.ok(malformedResult.invalidFields.includes('counters.providerApiCalls'));
});

test('CM1835 rejects invalid packet fields decision mismatch and unsafe decision echo', () => {
  const unsafeExpectedDecision = 'PRIVATE_DECISION_SHOULD_NOT_ECHO';
  const invalid = validateVcpMemoryTrustedWriteProposalExactFieldBindingFeasibilityContract(
    exactFieldBindingContract({
      packet: {
        binding_id: 'unsafe_binding_id',
        profile: 'trusted-write',
        non_authorizing: false
      },
      output: {
        disclosure_level: 'raw'
      },
      expectedDecision: unsafeExpectedDecision,
      nextActionAllowed: 'bind_exact_values'
    })
  );
  const serializedInvalid = JSON.stringify(invalid);

  assert.equal(invalid.accepted, false);
  assert.equal(invalid.reasonCode, 'invalid_trusted_write_proposal_exact_field_binding_feasibility_contract');
  assert.ok(invalid.invalidFields.includes('packet.binding_id'));
  assert.ok(invalid.invalidFields.includes('packet.profile'));
  assert.ok(invalid.invalidFields.includes('packet.non_authorizing'));
  assert.ok(invalid.invalidFields.includes('output.disclosure_level'));
  assert.ok(invalid.invalidFields.includes('expectedDecision'));
  assert.ok(invalid.invalidFields.includes('nextActionAllowed'));
  assert.equal(serializedInvalid.includes(unsafeExpectedDecision), false);

  const mismatch = validateVcpMemoryTrustedWriteProposalExactFieldBindingFeasibilityContract(
    exactFieldBindingContract({
      feasibility: {
        exact_field_binding_ready: true
      },
      expectedDecision: 'exact_field_binding_blocked_missing_concrete_values'
    })
  );

  assert.equal(mismatch.accepted, false);
  assert.equal(mismatch.reasonCode, 'decision_mismatch');
  assert.equal(mismatch.computedDecision, 'stop_l4');
  assert.ok(mismatch.invalidFields.includes('expectedDecision'));
});

test('CM1835 locks exact-field binding vocabulary and no-side-effect posture', () => {
  const result = validateVcpMemoryTrustedWriteProposalExactFieldBindingFeasibilityContract(
    exactFieldBindingContract()
  );

  assert.ok(ALLOWED_DECISIONS.includes('exact_field_binding_blocked_missing_concrete_values'));
  assert.ok(ALLOWED_DECISIONS.includes('exact_field_binding_incomplete'));
  assert.ok(ALLOWED_DECISIONS.includes('stop_l4'));
  assert.ok(ALLOWED_NEXT_ACTIONS.includes('cm1835_fixture_contract'));
  assert.ok(REQUIRED_EVIDENCE_FIELDS.includes('cm1834_closeout_gate_review_present'));
  assert.ok(REQUIRED_FEASIBILITY_FIELDS.includes('exact_field_binding_ready'));
  assert.ok(REQUIRED_MISSING_CONCRETE_VALUE_FIELDS.includes('approval_line_value_missing'));
  assert.ok(REQUIRED_AUTHORIZATION_FIELDS.includes('exact_request_submission_allowed'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('approvalLineOperations'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('proposalReceiptsAccepted'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('approvalLineValue'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('targetValue'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('endpoint'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('exactFieldBindingReady'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('completeV8'));
  assert.equal(result.exactFieldBindingReady, false);
  assert.equal(result.concreteValuesPresent, false);
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
  assert.equal(result.m9ProposalModePassed, false);
  assert.equal(result.m10Unlocked, false);
  assert.equal(result.m15Unlocked, false);
  assert.equal(result.readinessClaimAllowed, false);
});
