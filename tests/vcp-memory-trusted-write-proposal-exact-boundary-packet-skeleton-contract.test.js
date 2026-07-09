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
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryTrustedWriteProposalExactBoundaryPacketSkeletonContract
} = require('../src/core/VcpMemoryTrustedWriteProposalExactBoundaryPacketSkeletonContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] ?? 0]));
}

function packetSkeletonContract(overrides = {}) {
  const packet = {
    packet_id: 'm9_fixture_trusted_write_proposal_exact_boundary_packet_001',
    contract_version: 'vcp_memory_trusted_write_proposal_exact_boundary_packet_skeleton_v1',
    evidence_type: 'fixture-only',
    profile: 'trusted-write-proposal',
    non_authorizing: true,
    packet_skeleton_only: true
  };

  const evidence = {
    accepted_m8_trusted_full_read_workflow_present_for_planning: true,
    cm1821_envelope_fixture_contract_present: true,
    cm1822_receipt_shape_fixture_contract_present: true,
    cm1823_local_fixture_preparation_closeout_present: true,
    cm1824_executable_closeout_gate_fixture_present: true,
    local_fixture_contract_preparation_slice_closed: true
  };

  const boundary = {
    target_alias_candidate_present: true,
    transport_candidate_present: true,
    exact_target_bound: false,
    exact_transport_bound: false,
    exact_client_ids_bound: false,
    exact_workspace_scope_bound: false,
    exact_owner_scope_bound: false,
    exact_visibility_bound: false,
    exact_proposal_scope_bound: false,
    exact_proposal_operations_bound: false,
    exact_payload_shape_bound: false,
    exact_review_route_bound: false,
    exact_rollback_posture_bound: false,
    exact_budgets_bound: false,
    l4_write_intent_shield_proven: false,
    missing_exact_fields_declared: true,
    exact_boundary_complete: false
  };

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
    disclosure_level: 'redacted_packet_skeleton',
    raw_private_output_allowed: false,
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
    authorization: {
      ...authorization,
      ...(overrides.authorization || {})
    },
    output: {
      ...output,
      ...(overrides.output || {})
    },
    expectedDecision: overrides.expectedDecision || 'packet_skeleton_accept_non_authorizing',
    nextActionAllowed: overrides.nextActionAllowed || 'cm1826_fixture_contract',
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => ![
      'packet',
      'evidence',
      'boundary',
      'authorization',
      'output',
      'expectedDecision',
      'nextActionAllowed',
      'counters'
    ].includes(key)))
  };
}

test('CM1826 accepts non-authorizing exact-boundary packet skeleton without runtime proposal or write', () => {
  const result = validateVcpMemoryTrustedWriteProposalExactBoundaryPacketSkeletonContract(
    packetSkeletonContract()
  );

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, 'fixture_trusted_write_proposal_exact_boundary_packet_skeleton_only');
  assert.equal(result.decision, 'packet_skeleton_accept_non_authorizing');
  assert.equal(result.exactBoundaryPacketSkeletonAccepted, true);
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
  assert.equal(result.m9ProposalModePassed, false);
  assert.equal(result.m10Unlocked, false);
  assert.equal(result.readinessClaimAllowed, false);
});

test('CM1826 reports packet_skeleton_incomplete when preparation evidence or missing-field declaration is absent', () => {
  const result = validateVcpMemoryTrustedWriteProposalExactBoundaryPacketSkeletonContract(
    packetSkeletonContract({
      evidence: {
        cm1822_receipt_shape_fixture_contract_present: false,
        cm1824_executable_closeout_gate_fixture_present: false
      },
      boundary: {
        target_alias_candidate_present: false,
        missing_exact_fields_declared: false
      },
      expectedDecision: 'packet_skeleton_incomplete'
    })
  );

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'packet_skeleton_incomplete');
  assert.equal(result.exactBoundaryPacketSkeletonAccepted, false);
  assert.equal(result.requestSubmitted, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1826 stops exact boundary completion request submission proposal runtime write and unlock claims as L4', () => {
  const result = validateVcpMemoryTrustedWriteProposalExactBoundaryPacketSkeletonContract(
    packetSkeletonContract({
      boundary: Object.fromEntries(REQUIRED_BOUNDARY_FIELDS.map(field => [field, true])),
      authorization: Object.fromEntries(REQUIRED_AUTHORIZATION_FIELDS.map(field => [field, true])),
      output: {
        raw_private_output_allowed: true,
        approval_line_value_disclosed: true,
        readiness_claim_allowed: true
      },
      expectedDecision: 'stop_l4'
    })
  );

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'stop_l4');
  assert.equal(result.exactBoundaryPacketSkeletonAccepted, false);
  assert.equal(result.requestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.proposalGenerated, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableWritePerformed, false);
  assert.equal(result.m10Unlocked, false);
});

test('CM1826 rejects raw secret request approval and readiness fields without echoing values', () => {
  const result = validateVcpMemoryTrustedWriteProposalExactBoundaryPacketSkeletonContract(
    packetSkeletonContract({
      packet: {
        requestPayload: 'SYNTHETIC_REQUEST_SHOULD_NOT_ECHO'
      },
      output: {
        providerPayload: 'SYNTHETIC_PROVIDER_SHOULD_NOT_ECHO'
      },
      authorization: {
        approvalLineValue: 'SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'
      },
      rawPrivatePayload: 'SYNTHETIC_PRIVATE_SHOULD_NOT_ECHO',
      RC_READY: true
    })
  );
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_request_or_overclaim_fields');
  assert.ok(result.forbiddenFields.includes('packet.requestPayload'));
  assert.ok(result.forbiddenFields.includes('output.providerPayload'));
  assert.ok(result.forbiddenFields.includes('authorization.approvalLineValue'));
  assert.ok(result.forbiddenFields.includes('rawPrivatePayload'));
  assert.ok(result.forbiddenFields.includes('RC_READY'));
  assert.equal(serialized.includes('SYNTHETIC_REQUEST_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_PROVIDER_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_PRIVATE_SHOULD_NOT_ECHO'), false);
});

test('CM1826 rejects unexpected fields without echoing submitted values', () => {
  const result = validateVcpMemoryTrustedWriteProposalExactBoundaryPacketSkeletonContract(
    packetSkeletonContract({
      extraRoot: 'SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO',
      boundary: {
        extraBoundary: 'SYNTHETIC_EXTRA_BOUNDARY_SHOULD_NOT_ECHO'
      },
      evidence: {
        extraEvidence: 'SYNTHETIC_EXTRA_EVIDENCE_SHOULD_NOT_ECHO'
      }
    })
  );
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'unexpected_fields');
  assert.ok(result.unexpectedFields.includes('extraRoot'));
  assert.ok(result.unexpectedFields.includes('boundary.extraBoundary'));
  assert.ok(result.unexpectedFields.includes('evidence.extraEvidence'));
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_BOUNDARY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_EVIDENCE_SHOULD_NOT_ECHO'), false);
});

test('CM1826 rejects missing positive and malformed zero side-effect counters', () => {
  const missingFixture = packetSkeletonContract();
  delete missingFixture.counters.providerApiCalls;

  const missingResult = validateVcpMemoryTrustedWriteProposalExactBoundaryPacketSkeletonContract(
    missingFixture
  );
  assert.equal(missingResult.accepted, false);
  assert.equal(missingResult.reasonCode, 'missing_required_fields');
  assert.ok(missingResult.missingFields.includes('counters.providerApiCalls'));

  const positiveResult = validateVcpMemoryTrustedWriteProposalExactBoundaryPacketSkeletonContract(
    packetSkeletonContract({
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

  const malformedResult = validateVcpMemoryTrustedWriteProposalExactBoundaryPacketSkeletonContract(
    packetSkeletonContract({
      counters: {
        providerApiCalls: '0'
      }
    })
  );
  assert.equal(malformedResult.accepted, false);
  assert.equal(
    malformedResult.reasonCode,
    'invalid_trusted_write_proposal_exact_boundary_packet_skeleton_contract'
  );
  assert.ok(malformedResult.invalidFields.includes('counters.providerApiCalls'));
});

test('CM1826 rejects invalid packet fields decision mismatch and unsafe decision echo', () => {
  const unsafeExpectedDecision = 'PRIVATE_DECISION_SHOULD_NOT_ECHO';
  const invalid = validateVcpMemoryTrustedWriteProposalExactBoundaryPacketSkeletonContract(
    packetSkeletonContract({
      packet: {
        packet_id: 'unsafe_packet_id',
        profile: 'trusted-write',
        non_authorizing: false
      },
      output: {
        disclosure_level: 'raw'
      },
      expectedDecision: unsafeExpectedDecision,
      nextActionAllowed: 'submit_request'
    })
  );
  const serializedInvalid = JSON.stringify(invalid);

  assert.equal(invalid.accepted, false);
  assert.equal(invalid.reasonCode, 'invalid_trusted_write_proposal_exact_boundary_packet_skeleton_contract');
  assert.ok(invalid.invalidFields.includes('packet.packet_id'));
  assert.ok(invalid.invalidFields.includes('packet.profile'));
  assert.ok(invalid.invalidFields.includes('packet.non_authorizing'));
  assert.ok(invalid.invalidFields.includes('output.disclosure_level'));
  assert.ok(invalid.invalidFields.includes('expectedDecision'));
  assert.ok(invalid.invalidFields.includes('nextActionAllowed'));
  assert.equal(serializedInvalid.includes(unsafeExpectedDecision), false);

  const mismatch = validateVcpMemoryTrustedWriteProposalExactBoundaryPacketSkeletonContract(
    packetSkeletonContract({
      authorization: {
        proposal_generation_authorized: true
      },
      expectedDecision: 'packet_skeleton_accept_non_authorizing'
    })
  );

  assert.equal(mismatch.accepted, false);
  assert.equal(mismatch.reasonCode, 'decision_mismatch');
  assert.equal(mismatch.computedDecision, 'stop_l4');
  assert.ok(mismatch.invalidFields.includes('expectedDecision'));
});

test('CM1826 locks packet skeleton vocabulary and no-side-effect posture', () => {
  const result = validateVcpMemoryTrustedWriteProposalExactBoundaryPacketSkeletonContract(
    packetSkeletonContract()
  );

  assert.ok(ALLOWED_DECISIONS.includes('packet_skeleton_accept_non_authorizing'));
  assert.ok(ALLOWED_DECISIONS.includes('packet_skeleton_incomplete'));
  assert.ok(ALLOWED_DECISIONS.includes('stop_l4'));
  assert.ok(ALLOWED_NEXT_ACTIONS.includes('cm1826_fixture_contract'));
  assert.ok(REQUIRED_EVIDENCE_FIELDS.includes('cm1824_executable_closeout_gate_fixture_present'));
  assert.ok(REQUIRED_BOUNDARY_FIELDS.includes('exact_boundary_complete'));
  assert.ok(REQUIRED_AUTHORIZATION_FIELDS.includes('exact_request_submission_allowed'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('approvalLineOperations'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('proposalReceiptsAccepted'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('approvalLineValue'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('requestPayload'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('rawPrivatePayload'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('completeV8'));
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
