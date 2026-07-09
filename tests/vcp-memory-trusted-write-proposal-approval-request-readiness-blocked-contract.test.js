'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_DECISIONS,
  ALLOWED_NEXT_ACTIONS,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_EVIDENCE_FIELDS,
  REQUIRED_MISSING_PREREQUISITE_FIELDS,
  REQUIRED_READINESS_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryTrustedWriteProposalApprovalRequestReadinessBlockedContract
} = require('../src/core/VcpMemoryTrustedWriteProposalApprovalRequestReadinessBlockedContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] ?? 0]));
}

function approvalRequestReadinessContract(overrides = {}) {
  const packet = {
    readiness_id: 'm9_fixture_trusted_write_proposal_approval_request_readiness_blocked_001',
    contract_version: 'vcp_memory_trusted_write_proposal_approval_request_readiness_blocked_v1',
    evidence_type: 'fixture-only',
    profile: 'trusted-write-proposal',
    non_authorizing: true,
    approval_request_readiness_blocked_only: true
  };

  const evidence = {
    cm1834_closeout_gate_review_present: true,
    cm1835_exact_field_binding_feasibility_contract_present: true,
    cm1836_closeout_gate_review_present: true,
    local_exact_field_binding_feasibility_fixture_contract_closed: true
  };

  const readiness = {
    local_approval_request_readiness_blocked_fixture_present: true,
    approval_request_ready: false,
    exact_field_binding_ready: false,
    concrete_values_present: false,
    exact_target_value_present: false,
    exact_transport_value_present: false,
    client_ids_present: false,
    workspace_scope_present: false,
    owner_scope_present: false,
    visibility_scope_present: false,
    proposal_scope_present: false,
    proposal_operation_present: false,
    payload_shape_present: false,
    review_route_present: false,
    rollback_posture_present: false,
    budgets_present: false,
    l4_write_intent_shield_present: false,
    real_proposal_receipt_audit_bound: false,
    approval_request_submission_authority_bound: false,
    approval_line_value_present: false,
    approval_request_body_prepared: false,
    missing_readiness_prerequisites_declared: true
  };

  const missingPrerequisites = Object.fromEntries(
    REQUIRED_MISSING_PREREQUISITE_FIELDS.map(field => [field, true])
  );

  const authorization = {
    approval_request_submission_allowed: false,
    approval_line_generation_allowed: false,
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
    disclosure_level: 'redacted_approval_request_readiness',
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
    readiness: {
      ...readiness,
      ...(overrides.readiness || {})
    },
    missingPrerequisites: {
      ...missingPrerequisites,
      ...(overrides.missingPrerequisites || {})
    },
    authorization: {
      ...authorization,
      ...(overrides.authorization || {})
    },
    output: {
      ...output,
      ...(overrides.output || {})
    },
    expectedDecision: overrides.expectedDecision || 'approval_request_readiness_blocked_missing_exact_authority',
    nextActionAllowed: overrides.nextActionAllowed || 'cm1837_fixture_contract',
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => ![
      'packet',
      'evidence',
      'readiness',
      'missingPrerequisites',
      'authorization',
      'output',
      'expectedDecision',
      'nextActionAllowed',
      'counters'
    ].includes(key)))
  };
}

test('CM1837 accepts blocked approval request readiness without concrete values or authority', () => {
  const result = validateVcpMemoryTrustedWriteProposalApprovalRequestReadinessBlockedContract(
    approvalRequestReadinessContract()
  );

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, 'fixture_trusted_write_proposal_approval_request_readiness_blocked_only');
  assert.equal(result.decision, 'approval_request_readiness_blocked_missing_exact_authority');
  assert.equal(result.approvalRequestReadinessAccepted, true);
  assert.equal(result.approvalRequestReady, false);
  assert.equal(result.exactFieldBindingReady, false);
  assert.equal(result.concreteValuesPresent, false);
  assert.equal(result.approvalRequestBodyPrepared, false);
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

test('CM1837 reports approval_request_readiness_incomplete when evidence or missing declarations are absent', () => {
  const result = validateVcpMemoryTrustedWriteProposalApprovalRequestReadinessBlockedContract(
    approvalRequestReadinessContract({
      evidence: {
        cm1835_exact_field_binding_feasibility_contract_present: false,
        cm1836_closeout_gate_review_present: false
      },
      readiness: {
        local_approval_request_readiness_blocked_fixture_present: false,
        missing_readiness_prerequisites_declared: false
      },
      missingPrerequisites: {
        exact_field_binding_missing: false,
        approval_request_body_missing: false
      },
      expectedDecision: 'approval_request_readiness_incomplete'
    })
  );

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'approval_request_readiness_incomplete');
  assert.equal(result.approvalRequestReadinessAccepted, false);
  assert.equal(result.approvalRequestReady, false);
  assert.equal(result.requestSubmitted, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1837 stops approval request proposal runtime write and unlock claims as L4', () => {
  const result = validateVcpMemoryTrustedWriteProposalApprovalRequestReadinessBlockedContract(
    approvalRequestReadinessContract({
      readiness: Object.fromEntries(REQUIRED_READINESS_FIELDS.map(field => [field, true])),
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
  assert.equal(result.approvalRequestReadinessAccepted, false);
  assert.equal(result.approvalRequestReady, false);
  assert.equal(result.requestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.proposalGenerated, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableWritePerformed, false);
  assert.equal(result.m10Unlocked, false);
});

test('CM1837 rejects concrete raw secret request approval and readiness fields without echoing values', () => {
  const result = validateVcpMemoryTrustedWriteProposalApprovalRequestReadinessBlockedContract(
    approvalRequestReadinessContract({
      packet: {
        targetValue: 'SYNTHETIC_TARGET_SHOULD_NOT_ECHO'
      },
      readiness: {
        endpoint: 'SYNTHETIC_ENDPOINT_SHOULD_NOT_ECHO'
      },
      output: {
        providerPayload: 'SYNTHETIC_PROVIDER_SHOULD_NOT_ECHO'
      },
      authorization: {
        approvalLineValue: 'SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'
      },
      approvalRequestBody: 'SYNTHETIC_REQUEST_BODY_SHOULD_NOT_ECHO',
      approvalRequestReady: 'SYNTHETIC_REQUEST_READY_SHOULD_NOT_ECHO',
      RC_READY: 'SYNTHETIC_RC_READY_SHOULD_NOT_ECHO'
    })
  );
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_exact_value_or_overclaim_fields');
  assert.ok(result.forbiddenFields.includes('packet.targetValue'));
  assert.ok(result.forbiddenFields.includes('readiness.endpoint'));
  assert.ok(result.forbiddenFields.includes('output.providerPayload'));
  assert.ok(result.forbiddenFields.includes('authorization.approvalLineValue'));
  assert.ok(result.forbiddenFields.includes('approvalRequestBody'));
  assert.ok(result.forbiddenFields.includes('approvalRequestReady'));
  assert.ok(result.forbiddenFields.includes('RC_READY'));
  assert.equal(serialized.includes('SYNTHETIC_TARGET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_PROVIDER_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_REQUEST_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_REQUEST_READY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RC_READY_SHOULD_NOT_ECHO'), false);
});

test('CM1837 rejects unexpected fields without echoing submitted values', () => {
  const result = validateVcpMemoryTrustedWriteProposalApprovalRequestReadinessBlockedContract(
    approvalRequestReadinessContract({
      extraRoot: 'SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO',
      readiness: {
        extraReadiness: 'SYNTHETIC_EXTRA_READINESS_SHOULD_NOT_ECHO'
      },
      missingPrerequisites: {
        extraMissing: 'SYNTHETIC_EXTRA_MISSING_SHOULD_NOT_ECHO'
      }
    })
  );
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'unexpected_fields');
  assert.ok(result.unexpectedFields.includes('extraRoot'));
  assert.ok(result.unexpectedFields.includes('readiness.extraReadiness'));
  assert.ok(result.unexpectedFields.includes('missingPrerequisites.extraMissing'));
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_READINESS_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_MISSING_SHOULD_NOT_ECHO'), false);
});

test('CM1837 rejects missing positive and malformed zero side-effect counters', () => {
  const missingFixture = approvalRequestReadinessContract();
  delete missingFixture.counters.providerApiCalls;

  const missingResult = validateVcpMemoryTrustedWriteProposalApprovalRequestReadinessBlockedContract(
    missingFixture
  );
  assert.equal(missingResult.accepted, false);
  assert.equal(missingResult.reasonCode, 'missing_required_fields');
  assert.ok(missingResult.missingFields.includes('counters.providerApiCalls'));

  const positiveResult = validateVcpMemoryTrustedWriteProposalApprovalRequestReadinessBlockedContract(
    approvalRequestReadinessContract({
      counters: {
        requestSubmissions: 1,
        requestBodiesPrepared: 1,
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
  assert.ok(positiveResult.forbiddenCounters.includes('requestBodiesPrepared'));
  assert.ok(positiveResult.forbiddenCounters.includes('approvalLineOperations'));
  assert.ok(positiveResult.forbiddenCounters.includes('proposalGenerations'));
  assert.ok(positiveResult.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(positiveResult.forbiddenCounters.includes('memoryWrites'));
  assert.ok(positiveResult.forbiddenCounters.includes('durableWrites'));
  assert.ok(positiveResult.forbiddenCounters.includes('m10Unlocks'));

  const malformedResult = validateVcpMemoryTrustedWriteProposalApprovalRequestReadinessBlockedContract(
    approvalRequestReadinessContract({
      counters: {
        providerApiCalls: '0'
      }
    })
  );
  assert.equal(malformedResult.accepted, false);
  assert.equal(
    malformedResult.reasonCode,
    'invalid_trusted_write_proposal_approval_request_readiness_blocked_contract'
  );
  assert.ok(malformedResult.invalidFields.includes('counters.providerApiCalls'));
});

test('CM1837 rejects invalid packet fields decision mismatch and unsafe decision echo', () => {
  const unsafeExpectedDecision = 'PRIVATE_DECISION_SHOULD_NOT_ECHO';
  const invalid = validateVcpMemoryTrustedWriteProposalApprovalRequestReadinessBlockedContract(
    approvalRequestReadinessContract({
      packet: {
        readiness_id: 'unsafe_readiness_id',
        profile: 'trusted-write',
        non_authorizing: false
      },
      output: {
        disclosure_level: 'raw'
      },
      expectedDecision: unsafeExpectedDecision,
      nextActionAllowed: 'submit_approval_request'
    })
  );
  const serializedInvalid = JSON.stringify(invalid);

  assert.equal(invalid.accepted, false);
  assert.equal(invalid.reasonCode, 'invalid_trusted_write_proposal_approval_request_readiness_blocked_contract');
  assert.ok(invalid.invalidFields.includes('packet.readiness_id'));
  assert.ok(invalid.invalidFields.includes('packet.profile'));
  assert.ok(invalid.invalidFields.includes('packet.non_authorizing'));
  assert.ok(invalid.invalidFields.includes('output.disclosure_level'));
  assert.ok(invalid.invalidFields.includes('expectedDecision'));
  assert.ok(invalid.invalidFields.includes('nextActionAllowed'));
  assert.equal(serializedInvalid.includes(unsafeExpectedDecision), false);

  const mismatch = validateVcpMemoryTrustedWriteProposalApprovalRequestReadinessBlockedContract(
    approvalRequestReadinessContract({
      readiness: {
        approval_request_ready: true
      },
      expectedDecision: 'approval_request_readiness_blocked_missing_exact_authority'
    })
  );

  assert.equal(mismatch.accepted, false);
  assert.equal(mismatch.reasonCode, 'decision_mismatch');
  assert.equal(mismatch.computedDecision, 'stop_l4');
  assert.ok(mismatch.invalidFields.includes('expectedDecision'));
});

test('CM1837 locks approval-request readiness vocabulary and no-side-effect posture', () => {
  const result = validateVcpMemoryTrustedWriteProposalApprovalRequestReadinessBlockedContract(
    approvalRequestReadinessContract()
  );

  assert.ok(ALLOWED_DECISIONS.includes('approval_request_readiness_blocked_missing_exact_authority'));
  assert.ok(ALLOWED_DECISIONS.includes('approval_request_readiness_incomplete'));
  assert.ok(ALLOWED_DECISIONS.includes('stop_l4'));
  assert.ok(ALLOWED_NEXT_ACTIONS.includes('cm1837_fixture_contract'));
  assert.ok(REQUIRED_EVIDENCE_FIELDS.includes('cm1836_closeout_gate_review_present'));
  assert.ok(REQUIRED_READINESS_FIELDS.includes('approval_request_ready'));
  assert.ok(REQUIRED_MISSING_PREREQUISITE_FIELDS.includes('approval_request_body_missing'));
  assert.ok(REQUIRED_AUTHORIZATION_FIELDS.includes('approval_request_submission_allowed'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('requestBodiesPrepared'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('proposalReceiptsAccepted'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('approvalLineValue'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('approvalRequestBody'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('approvalRequestReady'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('completeV8'));
  assert.equal(result.approvalRequestReady, false);
  assert.equal(result.exactFieldBindingReady, false);
  assert.equal(result.concreteValuesPresent, false);
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
  assert.equal(result.m9ProposalModePassed, false);
  assert.equal(result.m10Unlocked, false);
  assert.equal(result.m15Unlocked, false);
  assert.equal(result.readinessClaimAllowed, false);
});
