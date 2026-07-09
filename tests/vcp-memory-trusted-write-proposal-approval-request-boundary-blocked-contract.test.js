'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_DECISIONS,
  ALLOWED_NEXT_ACTIONS,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_BOUNDARY_FIELDS,
  REQUIRED_EVIDENCE_FIELDS,
  REQUIRED_MISSING_BOUNDARY_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryTrustedWriteProposalApprovalRequestBoundaryBlockedContract
} = require('../src/core/VcpMemoryTrustedWriteProposalApprovalRequestBoundaryBlockedContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] ?? 0]));
}

function approvalRequestBoundaryContract(overrides = {}) {
  const packet = {
    boundary_id: 'm9_fixture_trusted_write_proposal_approval_request_boundary_blocked_001',
    contract_version: 'vcp_memory_trusted_write_proposal_approval_request_boundary_blocked_v1',
    evidence_type: 'fixture-only',
    profile: 'trusted-write-proposal',
    non_authorizing: true,
    approval_request_boundary_blocked_only: true
  };

  const evidence = Object.fromEntries(REQUIRED_EVIDENCE_FIELDS.map(field => [field, true]));

  const boundary = {
    local_approval_request_boundary_blocked_fixture_present: true,
    accepted_planning_evidence_present: true,
    approval_request_boundary_ready: false,
    approval_request_ready: false,
    exact_request_packet_ready: false,
    exact_request_packet_present: false,
    concrete_values_present: false,
    exact_target_bound: false,
    exact_transport_bound: false,
    exact_client_ids_bound: false,
    exact_workspace_scope_bound: false,
    exact_owner_scope_bound: false,
    exact_visibility_bound: false,
    exact_proposal_scope_bound: false,
    exact_proposal_operation_bound: false,
    exact_payload_shape_bound: false,
    exact_review_route_bound: false,
    exact_rollback_posture_bound: false,
    exact_budgets_bound: false,
    l4_write_intent_shield_proven: false,
    real_proposal_receipt_audit_bound: false,
    approval_request_submission_authority_bound: false,
    approval_request_template_created: false,
    approval_request_body_prepared: false,
    approval_request_body_present: false,
    approval_request_submitted: false,
    approval_line_value_present: false,
    approval_line_generated: false,
    approval_granted: false,
    missing_boundary_fields_declared: true
  };

  const missingBoundaryFields = Object.fromEntries(
    REQUIRED_MISSING_BOUNDARY_FIELDS.map(field => [field, true])
  );

  const authorization = {
    approval_request_boundary_authorized: false,
    approval_request_template_creation_allowed: false,
    approval_request_body_preparation_allowed: false,
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
    disclosure_level: 'redacted_approval_request_boundary',
    raw_private_output_allowed: false,
    concrete_values_disclosed: false,
    request_template_disclosed: false,
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
    boundary: {
      ...boundary,
      ...(overrides.boundary || {})
    },
    missingBoundaryFields: {
      ...missingBoundaryFields,
      ...(overrides.missingBoundaryFields || {})
    },
    authorization: {
      ...authorization,
      ...(overrides.authorization || {})
    },
    output: {
      ...output,
      ...(overrides.output || {})
    },
    expectedDecision:
      overrides.expectedDecision ||
      'approval_request_boundary_blocked_missing_exact_request_body_authority',
    nextActionAllowed: overrides.nextActionAllowed || 'cm1843_fixture_contract',
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => ![
      'packet',
      'evidence',
      'boundary',
      'missingBoundaryFields',
      'authorization',
      'output',
      'expectedDecision',
      'nextActionAllowed',
      'counters'
    ].includes(key)))
  };
}

test('CM1843 accepts blocked approval request boundary without request body authority or runtime', () => {
  const result = validateVcpMemoryTrustedWriteProposalApprovalRequestBoundaryBlockedContract(
    approvalRequestBoundaryContract()
  );

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, 'fixture_trusted_write_proposal_approval_request_boundary_blocked_only');
  assert.equal(result.decision, 'approval_request_boundary_blocked_missing_exact_request_body_authority');
  assert.equal(result.approvalRequestBoundaryAccepted, true);
  assert.equal(result.approvalRequestBoundaryReady, false);
  assert.equal(result.approvalRequestReady, false);
  assert.equal(result.exactRequestPacketReady, false);
  assert.equal(result.exactRequestPacketPresent, false);
  assert.equal(result.concreteValuesPresent, false);
  assert.equal(result.approvalRequestTemplateCreated, false);
  assert.equal(result.approvalRequestBodyPrepared, false);
  assert.equal(result.approvalRequestBodyPresent, false);
  assert.equal(result.requestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.proposalGenerated, false);
  assert.equal(result.proposalSubmitted, false);
  assert.equal(result.proposalReceiptAccepted, false);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableWritePerformed, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.m10Unlocked, false);
  assert.equal(result.readinessClaimAllowed, false);
});

test('CM1843 reports approval_request_boundary_incomplete when evidence or missing fields are absent', () => {
  const result = validateVcpMemoryTrustedWriteProposalApprovalRequestBoundaryBlockedContract(
    approvalRequestBoundaryContract({
      evidence: {
        cm1840_exact_request_packet_refresh_blocked_contract_present: false,
        cm1842_approval_request_boundary_blocked_preflight_present: false
      },
      boundary: {
        local_approval_request_boundary_blocked_fixture_present: false,
        missing_boundary_fields_declared: false
      },
      missingBoundaryFields: {
        approval_request_body_missing: false,
        approval_request_boundary_authority_missing: false
      },
      expectedDecision: 'approval_request_boundary_incomplete'
    })
  );

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'approval_request_boundary_incomplete');
  assert.equal(result.approvalRequestBoundaryAccepted, false);
  assert.equal(result.approvalRequestBoundaryReady, false);
  assert.equal(result.approvalRequestReady, false);
  assert.equal(result.requestSubmitted, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1843 stops request approval proposal runtime write and unlock claims as L4', () => {
  const result = validateVcpMemoryTrustedWriteProposalApprovalRequestBoundaryBlockedContract(
    approvalRequestBoundaryContract({
      boundary: Object.fromEntries(REQUIRED_BOUNDARY_FIELDS.map(field => [field, true])),
      authorization: Object.fromEntries(REQUIRED_AUTHORIZATION_FIELDS.map(field => [field, true])),
      output: {
        raw_private_output_allowed: true,
        concrete_values_disclosed: true,
        request_template_disclosed: true,
        request_body_disclosed: true,
        approval_line_value_disclosed: true,
        readiness_claim_allowed: true
      },
      expectedDecision: 'stop_l4'
    })
  );

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'stop_l4');
  assert.equal(result.approvalRequestBoundaryAccepted, false);
  assert.equal(result.approvalRequestBoundaryReady, false);
  assert.equal(result.approvalRequestReady, false);
  assert.equal(result.approvalRequestBodyPrepared, false);
  assert.equal(result.requestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.proposalGenerated, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableWritePerformed, false);
  assert.equal(result.m10Unlocked, false);
});

test('CM1843 rejects concrete raw secret request approval and readiness fields without echoing values', () => {
  const result = validateVcpMemoryTrustedWriteProposalApprovalRequestBoundaryBlockedContract(
    approvalRequestBoundaryContract({
      packet: {
        targetValue: 'SYNTHETIC_TARGET_SHOULD_NOT_ECHO'
      },
      boundary: {
        endpoint: 'SYNTHETIC_ENDPOINT_SHOULD_NOT_ECHO'
      },
      output: {
        providerPayload: 'SYNTHETIC_PROVIDER_SHOULD_NOT_ECHO'
      },
      authorization: {
        approvalLineValue: 'SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'
      },
      approvalRequestTemplate: 'SYNTHETIC_TEMPLATE_SHOULD_NOT_ECHO',
      approvalRequestBody: 'SYNTHETIC_REQUEST_BODY_SHOULD_NOT_ECHO',
      approvalRequestBoundaryReady: 'SYNTHETIC_BOUNDARY_READY_SHOULD_NOT_ECHO',
      RC_READY: 'SYNTHETIC_RC_READY_SHOULD_NOT_ECHO'
    })
  );
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_request_approval_or_overclaim_fields');
  assert.ok(result.forbiddenFields.includes('packet.targetValue'));
  assert.ok(result.forbiddenFields.includes('boundary.endpoint'));
  assert.ok(result.forbiddenFields.includes('output.providerPayload'));
  assert.ok(result.forbiddenFields.includes('authorization.approvalLineValue'));
  assert.ok(result.forbiddenFields.includes('approvalRequestTemplate'));
  assert.ok(result.forbiddenFields.includes('approvalRequestBody'));
  assert.ok(result.forbiddenFields.includes('approvalRequestBoundaryReady'));
  assert.ok(result.forbiddenFields.includes('RC_READY'));
  assert.equal(serialized.includes('SYNTHETIC_TARGET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_PROVIDER_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_TEMPLATE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_REQUEST_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_BOUNDARY_READY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RC_READY_SHOULD_NOT_ECHO'), false);
});

test('CM1843 rejects unexpected fields without echoing submitted values', () => {
  const result = validateVcpMemoryTrustedWriteProposalApprovalRequestBoundaryBlockedContract(
    approvalRequestBoundaryContract({
      extraRoot: 'SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO',
      boundary: {
        extraBoundary: 'SYNTHETIC_EXTRA_BOUNDARY_SHOULD_NOT_ECHO'
      },
      missingBoundaryFields: {
        extraMissing: 'SYNTHETIC_EXTRA_MISSING_SHOULD_NOT_ECHO'
      }
    })
  );
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'unexpected_fields');
  assert.ok(result.unexpectedFields.includes('extraRoot'));
  assert.ok(result.unexpectedFields.includes('boundary.extraBoundary'));
  assert.ok(result.unexpectedFields.includes('missingBoundaryFields.extraMissing'));
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_BOUNDARY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_MISSING_SHOULD_NOT_ECHO'), false);
});

test('CM1843 rejects missing positive and malformed zero side-effect counters', () => {
  const missingFixture = approvalRequestBoundaryContract();
  delete missingFixture.counters.providerApiCalls;

  const missingResult = validateVcpMemoryTrustedWriteProposalApprovalRequestBoundaryBlockedContract(
    missingFixture
  );
  assert.equal(missingResult.accepted, false);
  assert.equal(missingResult.reasonCode, 'missing_required_fields');
  assert.ok(missingResult.missingFields.includes('counters.providerApiCalls'));

  const positiveResult = validateVcpMemoryTrustedWriteProposalApprovalRequestBoundaryBlockedContract(
    approvalRequestBoundaryContract({
      counters: {
        approvalBoundaryAuthorizations: 1,
        requestTemplatesCreated: 1,
        requestBodiesPrepared: 1,
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
  assert.ok(positiveResult.forbiddenCounters.includes('approvalBoundaryAuthorizations'));
  assert.ok(positiveResult.forbiddenCounters.includes('requestTemplatesCreated'));
  assert.ok(positiveResult.forbiddenCounters.includes('requestBodiesPrepared'));
  assert.ok(positiveResult.forbiddenCounters.includes('requestSubmissions'));
  assert.ok(positiveResult.forbiddenCounters.includes('approvalLineOperations'));
  assert.ok(positiveResult.forbiddenCounters.includes('proposalGenerations'));
  assert.ok(positiveResult.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(positiveResult.forbiddenCounters.includes('memoryWrites'));
  assert.ok(positiveResult.forbiddenCounters.includes('durableWrites'));
  assert.ok(positiveResult.forbiddenCounters.includes('m10Unlocks'));

  const malformedResult = validateVcpMemoryTrustedWriteProposalApprovalRequestBoundaryBlockedContract(
    approvalRequestBoundaryContract({
      counters: {
        providerApiCalls: '0'
      }
    })
  );
  assert.equal(malformedResult.accepted, false);
  assert.equal(
    malformedResult.reasonCode,
    'invalid_trusted_write_proposal_approval_request_boundary_blocked_contract'
  );
  assert.ok(malformedResult.invalidFields.includes('counters.providerApiCalls'));
});

test('CM1843 rejects invalid packet fields decision mismatch and unsafe decision echo', () => {
  const unsafeExpectedDecision = 'PRIVATE_DECISION_SHOULD_NOT_ECHO';
  const invalid = validateVcpMemoryTrustedWriteProposalApprovalRequestBoundaryBlockedContract(
    approvalRequestBoundaryContract({
      packet: {
        boundary_id: 'unsafe_boundary_id',
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
  assert.equal(invalid.reasonCode, 'invalid_trusted_write_proposal_approval_request_boundary_blocked_contract');
  assert.ok(invalid.invalidFields.includes('packet.boundary_id'));
  assert.ok(invalid.invalidFields.includes('packet.profile'));
  assert.ok(invalid.invalidFields.includes('packet.non_authorizing'));
  assert.ok(invalid.invalidFields.includes('output.disclosure_level'));
  assert.ok(invalid.invalidFields.includes('expectedDecision'));
  assert.ok(invalid.invalidFields.includes('nextActionAllowed'));
  assert.equal(serializedInvalid.includes(unsafeExpectedDecision), false);

  const mismatch = validateVcpMemoryTrustedWriteProposalApprovalRequestBoundaryBlockedContract(
    approvalRequestBoundaryContract({
      boundary: {
        approval_request_boundary_ready: true
      },
      expectedDecision: 'approval_request_boundary_blocked_missing_exact_request_body_authority'
    })
  );

  assert.equal(mismatch.accepted, false);
  assert.equal(mismatch.reasonCode, 'decision_mismatch');
  assert.equal(mismatch.computedDecision, 'stop_l4');
  assert.ok(mismatch.invalidFields.includes('expectedDecision'));
});

test('CM1843 locks approval-request boundary vocabulary and no-side-effect posture', () => {
  const result = validateVcpMemoryTrustedWriteProposalApprovalRequestBoundaryBlockedContract(
    approvalRequestBoundaryContract()
  );

  assert.ok(ALLOWED_DECISIONS.includes('approval_request_boundary_blocked_missing_exact_request_body_authority'));
  assert.ok(ALLOWED_DECISIONS.includes('approval_request_boundary_incomplete'));
  assert.ok(ALLOWED_DECISIONS.includes('stop_l4'));
  assert.ok(ALLOWED_NEXT_ACTIONS.includes('cm1843_fixture_contract'));
  assert.ok(REQUIRED_EVIDENCE_FIELDS.includes('cm1842_approval_request_boundary_blocked_preflight_present'));
  assert.ok(REQUIRED_BOUNDARY_FIELDS.includes('approval_request_body_prepared'));
  assert.ok(REQUIRED_BOUNDARY_FIELDS.includes('approval_request_submitted'));
  assert.ok(REQUIRED_MISSING_BOUNDARY_FIELDS.includes('approval_request_body_missing'));
  assert.ok(REQUIRED_MISSING_BOUNDARY_FIELDS.includes('approval_request_boundary_authority_missing'));
  assert.ok(REQUIRED_AUTHORIZATION_FIELDS.includes('approval_request_boundary_authorized'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('requestTemplatesCreated'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('proposalReceiptsAccepted'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('approvalRequestTemplate'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('approvalRequestBody'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('approvalRequestBoundaryReady'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('completeV8'));
  assert.equal(result.approvalRequestBoundaryReady, false);
  assert.equal(result.approvalRequestReady, false);
  assert.equal(result.exactRequestPacketReady, false);
  assert.equal(result.exactRequestPacketPresent, false);
  assert.equal(result.concreteValuesPresent, false);
  assert.equal(result.approvalRequestTemplateCreated, false);
  assert.equal(result.approvalRequestBodyPrepared, false);
  assert.equal(result.approvalRequestBodyPresent, false);
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
