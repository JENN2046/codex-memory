'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_COMPONENT_ACTIONS,
  ALLOWED_DECISIONS,
  ALLOWED_OPERATION_VOCABULARY,
  ALLOWED_REVIEW_STATUS_VOCABULARY,
  ALLOWED_ROUTE_FAMILIES,
  ALLOWED_TRANSPORT_FAMILIES,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_MISSING_EXACT_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryTrustedWriteProposalExactRequestFieldCandidateContract
} = require('../src/core/VcpMemoryTrustedWriteProposalExactRequestFieldCandidateContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] ?? 0]));
}

function fieldCandidateContract(overrides = {}) {
  const candidate = {
    candidate_id: 'm9_fixture_trusted_write_proposal_exact_request_field_candidate_001',
    contract_version: 'vcp_memory_trusted_write_proposal_exact_request_field_candidate_v1',
    evidence_type: 'fixture-only',
    profile: 'trusted-write-proposal',
    non_authorizing: true,
    field_candidates_only: true
  };

  const evidence = {
    cm1828_candidate_selection_preflight_present: true,
    accepted_m8_trusted_full_read_workflow_present_for_planning: true,
    cm1826_packet_skeleton_contract_present: true,
    cm1821_envelope_fixture_contract_present: true,
    cm1822_receipt_shape_fixture_contract_present: true,
    cm1827_closeout_gate_review_present: true
  };

  const candidateFields = {
    profile_candidate: 'trusted-write-proposal',
    target_alias_candidate_present: true,
    transport_family_candidate: 'human_tool_http_transport_family',
    route_family_candidate: '/v1/human/tool',
    component_action_candidate: 'DailyNoteSearcher.SearchDailyNote',
    client_alias_candidates_present: true,
    runtime_client_isolation_claimed: false,
    visibility_boundary_candidate_present: true,
    workspace_scope_candidate_present: true,
    owner_scope_candidate_present: true,
    proposal_operation_vocabulary_candidates: [
      'render_redacted_intent',
      'render_rollback_posture'
    ],
    proposal_scope_candidate_selected: false,
    proposal_payload_shape_candidate_present: true,
    review_route_candidate_present: true,
    review_status_vocabulary_candidates: ['accept', 'reject'],
    rollback_posture_candidate_present: true,
    current_runtime_call_budget: 0,
    current_provider_api_call_budget: 0,
    current_mcp_memory_tool_call_budget: 0,
    current_memory_write_budget: 0,
    current_durable_write_budget: 0,
    future_proposal_count_candidate: 1,
    future_runtime_call_budget_selected: false,
    future_duration_budget_selected: false,
    future_output_budget_candidate_present: true,
    receipt_rules_candidate_present: true,
    abort_receipt_rules_candidate_present: true
  };

  const missingExactFields = Object.fromEntries(
    REQUIRED_MISSING_EXACT_FIELDS.map(field => [field, true])
  );
  missingExactFields.exact_request_packet_ready = false;

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
    disclosure_level: 'redacted_candidate_matrix',
    raw_private_output_allowed: false,
    approval_line_value_disclosed: false,
    readiness_claim_allowed: false
  };

  return {
    schemaVersion: 1,
    candidate: {
      ...candidate,
      ...(overrides.candidate || {})
    },
    evidence: {
      ...evidence,
      ...(overrides.evidence || {})
    },
    candidateFields: {
      ...candidateFields,
      ...(overrides.candidateFields || {})
    },
    missingExactFields: {
      ...missingExactFields,
      ...(overrides.missingExactFields || {})
    },
    authorization: {
      ...authorization,
      ...(overrides.authorization || {})
    },
    output: {
      ...output,
      ...(overrides.output || {})
    },
    expectedDecision: overrides.expectedDecision || 'field_candidate_accept_non_authorizing',
    nextActionAllowed: overrides.nextActionAllowed || 'cm1829_fixture_contract',
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => ![
      'candidate',
      'evidence',
      'candidateFields',
      'missingExactFields',
      'authorization',
      'output',
      'expectedDecision',
      'nextActionAllowed',
      'counters'
    ].includes(key)))
  };
}

test('CM1829 accepts non-authorizing exact request field candidates without runtime proposal or write', () => {
  const result = validateVcpMemoryTrustedWriteProposalExactRequestFieldCandidateContract(
    fieldCandidateContract()
  );

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, 'fixture_trusted_write_proposal_exact_request_field_candidate_only');
  assert.equal(result.decision, 'field_candidate_accept_non_authorizing');
  assert.equal(result.exactRequestFieldCandidateAccepted, true);
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

test('CM1829 reports field_candidate_incomplete when evidence candidate fields or missing declarations are absent', () => {
  const result = validateVcpMemoryTrustedWriteProposalExactRequestFieldCandidateContract(
    fieldCandidateContract({
      evidence: {
        cm1828_candidate_selection_preflight_present: false,
        cm1822_receipt_shape_fixture_contract_present: false
      },
      candidateFields: {
        target_alias_candidate_present: false,
        proposal_operation_vocabulary_candidates: []
      },
      missingExactFields: {
        exact_proposal_scope_missing: false,
        missing_exact_fields_declared: false
      },
      expectedDecision: 'field_candidate_incomplete'
    })
  );

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'field_candidate_incomplete');
  assert.equal(result.exactRequestFieldCandidateAccepted, false);
  assert.equal(result.requestSubmitted, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1829 stops exact binding request proposal runtime write and unlock claims as L4', () => {
  const result = validateVcpMemoryTrustedWriteProposalExactRequestFieldCandidateContract(
    fieldCandidateContract({
      candidateFields: {
        runtime_client_isolation_claimed: true,
        proposal_scope_candidate_selected: true,
        future_runtime_call_budget_selected: true,
        future_duration_budget_selected: true
      },
      missingExactFields: {
        exact_request_packet_ready: true
      },
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
  assert.equal(result.exactRequestFieldCandidateAccepted, false);
  assert.equal(result.requestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.proposalGenerated, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableWritePerformed, false);
  assert.equal(result.m10Unlocked, false);
});

test('CM1829 rejects raw secret request approval and readiness fields without echoing values', () => {
  const result = validateVcpMemoryTrustedWriteProposalExactRequestFieldCandidateContract(
    fieldCandidateContract({
      candidate: {
        requestPayload: 'SYNTHETIC_REQUEST_SHOULD_NOT_ECHO'
      },
      output: {
        providerPayload: 'SYNTHETIC_PROVIDER_SHOULD_NOT_ECHO'
      },
      authorization: {
        approvalLineValue: 'SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'
      },
      rawPrivatePayload: 'SYNTHETIC_PRIVATE_SHOULD_NOT_ECHO',
      RC_READY: 'SYNTHETIC_RC_READY_SHOULD_NOT_ECHO'
    })
  );
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_request_or_overclaim_fields');
  assert.ok(result.forbiddenFields.includes('candidate.requestPayload'));
  assert.ok(result.forbiddenFields.includes('output.providerPayload'));
  assert.ok(result.forbiddenFields.includes('authorization.approvalLineValue'));
  assert.ok(result.forbiddenFields.includes('rawPrivatePayload'));
  assert.ok(result.forbiddenFields.includes('RC_READY'));
  assert.equal(serialized.includes('SYNTHETIC_REQUEST_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_PROVIDER_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_PRIVATE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RC_READY_SHOULD_NOT_ECHO'), false);
});

test('CM1829 rejects unexpected fields without echoing submitted values', () => {
  const result = validateVcpMemoryTrustedWriteProposalExactRequestFieldCandidateContract(
    fieldCandidateContract({
      extraRoot: 'SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO',
      candidateFields: {
        extraCandidate: 'SYNTHETIC_EXTRA_CANDIDATE_SHOULD_NOT_ECHO'
      },
      missingExactFields: {
        extraMissing: 'SYNTHETIC_EXTRA_MISSING_SHOULD_NOT_ECHO'
      }
    })
  );
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'unexpected_fields');
  assert.ok(result.unexpectedFields.includes('extraRoot'));
  assert.ok(result.unexpectedFields.includes('candidateFields.extraCandidate'));
  assert.ok(result.unexpectedFields.includes('missingExactFields.extraMissing'));
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_CANDIDATE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_MISSING_SHOULD_NOT_ECHO'), false);
});

test('CM1829 rejects missing positive and malformed zero side-effect counters', () => {
  const missingFixture = fieldCandidateContract();
  delete missingFixture.counters.providerApiCalls;

  const missingResult = validateVcpMemoryTrustedWriteProposalExactRequestFieldCandidateContract(
    missingFixture
  );
  assert.equal(missingResult.accepted, false);
  assert.equal(missingResult.reasonCode, 'missing_required_fields');
  assert.ok(missingResult.missingFields.includes('counters.providerApiCalls'));

  const positiveResult = validateVcpMemoryTrustedWriteProposalExactRequestFieldCandidateContract(
    fieldCandidateContract({
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

  const malformedResult = validateVcpMemoryTrustedWriteProposalExactRequestFieldCandidateContract(
    fieldCandidateContract({
      counters: {
        providerApiCalls: '0'
      }
    })
  );
  assert.equal(malformedResult.accepted, false);
  assert.equal(
    malformedResult.reasonCode,
    'invalid_trusted_write_proposal_exact_request_field_candidate_contract'
  );
  assert.ok(malformedResult.invalidFields.includes('counters.providerApiCalls'));
});

test('CM1829 rejects invalid candidate fields and unsafe decision echo', () => {
  const unsafeExpectedDecision = 'PRIVATE_DECISION_SHOULD_NOT_ECHO';
  const result = validateVcpMemoryTrustedWriteProposalExactRequestFieldCandidateContract(
    fieldCandidateContract({
      candidate: {
        candidate_id: 'unsafe_candidate_id',
        profile: 'trusted-write',
        non_authorizing: false
      },
      candidateFields: {
        transport_family_candidate: 'private_transport',
        route_family_candidate: '/private/raw',
        component_action_candidate: 'Private.Raw',
        proposal_operation_vocabulary_candidates: ['render_redacted_intent', 'private_operation'],
        review_status_vocabulary_candidates: ['accept', 'private_status'],
        current_runtime_call_budget: 1
      },
      output: {
        disclosure_level: 'raw'
      },
      expectedDecision: unsafeExpectedDecision,
      nextActionAllowed: 'submit_request'
    })
  );
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(
    result.reasonCode,
    'invalid_trusted_write_proposal_exact_request_field_candidate_contract'
  );
  assert.ok(result.invalidFields.includes('candidate.candidate_id'));
  assert.ok(result.invalidFields.includes('candidate.profile'));
  assert.ok(result.invalidFields.includes('candidate.non_authorizing'));
  assert.ok(result.invalidFields.includes('candidateFields.transport_family_candidate'));
  assert.ok(result.invalidFields.includes('candidateFields.route_family_candidate'));
  assert.ok(result.invalidFields.includes('candidateFields.component_action_candidate'));
  assert.ok(result.invalidFields.includes('candidateFields.proposal_operation_vocabulary_candidates'));
  assert.ok(result.invalidFields.includes('candidateFields.review_status_vocabulary_candidates'));
  assert.ok(result.invalidFields.includes('candidateFields.current_runtime_call_budget'));
  assert.ok(result.invalidFields.includes('output.disclosure_level'));
  assert.ok(result.invalidFields.includes('expectedDecision'));
  assert.ok(result.invalidFields.includes('nextActionAllowed'));
  assert.equal(serialized.includes(unsafeExpectedDecision), false);
});

test('CM1829 locks candidate vocabulary and no-side-effect posture', () => {
  const result = validateVcpMemoryTrustedWriteProposalExactRequestFieldCandidateContract(
    fieldCandidateContract()
  );

  assert.ok(ALLOWED_DECISIONS.includes('field_candidate_accept_non_authorizing'));
  assert.ok(ALLOWED_DECISIONS.includes('field_candidate_incomplete'));
  assert.ok(ALLOWED_DECISIONS.includes('stop_l4'));
  assert.ok(ALLOWED_TRANSPORT_FAMILIES.includes('human_tool_http_transport_family'));
  assert.ok(ALLOWED_ROUTE_FAMILIES.includes('/v1/human/tool'));
  assert.ok(ALLOWED_COMPONENT_ACTIONS.includes('DailyNoteSearcher.SearchDailyNote'));
  assert.ok(ALLOWED_OPERATION_VOCABULARY.includes('render_redacted_intent'));
  assert.ok(ALLOWED_OPERATION_VOCABULARY.includes('render_rollback_posture'));
  assert.ok(ALLOWED_REVIEW_STATUS_VOCABULARY.includes('accept'));
  assert.ok(ALLOWED_REVIEW_STATUS_VOCABULARY.includes('reject'));
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
