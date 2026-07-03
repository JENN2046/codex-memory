'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_DECISIONS,
  ALLOWED_PROPOSAL_OPERATIONS,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_BOUNDARY_FIELDS,
  REQUIRED_PROPOSAL_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryTrustedWriteProposalEnvelopeContract
} = require('../src/core/VcpMemoryTrustedWriteProposalEnvelopeContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] || 0]));
}

function proposalContract(overrides = {}) {
  const proposalEnvelope = {
    envelope_id: 'm9_fixture_trusted_write_proposal_envelope_001',
    contract_version: 'vcp_memory_trusted_write_proposal_envelope_v1',
    evidence_type: 'fixture-only',
    profile: 'trusted-write-proposal',
    decision: overrides.expectedDecision || 'fixture_accept',
    boundary: {
      accepted_m8_receipt_present: true,
      exact_boundary_complete: true,
      proposal_scope_present: true,
      operations_present: true,
      payload_shape_present: true,
      review_route_present: true,
      rollback_posture_present: true,
      budgets_present: true,
      l4_write_intent_shield_evidenced: true
    },
    proposal: {
      proposal_mode: 'fixture_envelope_only',
      scope_id_present: true,
      operations: ['render_redacted_intent', 'render_rollback_posture'],
      payload_shape_only: true,
      proposal_generation_requested: false,
      proposal_submission_requested: false,
      direct_write_requested: false,
      durable_write_requested: false,
      update_requested: false,
      supersede_requested: false,
      tombstone_requested: false,
      irreversible_delete_requested: false
    },
    policy: {
      memory_write_allowed: false,
      durable_write_allowed: false,
      provider_api_allowed: false,
      public_mcp_expansion_allowed: false,
      raw_private_payload_allowed: false
    },
    output: {
      disclosure_level: 'redacted_proposal_shape',
      raw_private_output_allowed: false,
      approval_line_value_disclosed: false,
      readiness_claim_allowed: false
    },
    next_action_allowed: 'cm1821_fixture_contract'
  };

  const receiptPlan = {
    receipt_plan_id: 'm9_fixture_trusted_write_proposal_receipt_plan_001',
    contract_version: 'vcp_memory_trusted_write_proposal_receipt_plan_v1',
    proposal_envelope_id: proposalEnvelope.envelope_id,
    low_disclosure: true,
    proposal_receipt_shape_only: true,
    rollback_posture_included: true,
    raw_private_payload_disclosed: false,
    memory_write_planned: false,
    durable_write_planned: false,
    runtime_calls_planned: 0,
    provider_api_calls_planned: 0,
    approval_line_value_disclosed: false,
    public_mcp_expansion: false,
    readiness_claimed: false,
    next_action_allowed: proposalEnvelope.next_action_allowed
  };

  const reviewRoute = {
    route_present: true,
    accept_reject_semantics_present: true,
    auto_accept_allowed: false,
    rollback_posture_present: true
  };

  return {
    schemaVersion: 1,
    proposalEnvelope: {
      ...proposalEnvelope,
      ...(overrides.proposalEnvelope || {}),
      boundary: {
        ...proposalEnvelope.boundary,
        ...((overrides.proposalEnvelope && overrides.proposalEnvelope.boundary) || {})
      },
      proposal: {
        ...proposalEnvelope.proposal,
        ...((overrides.proposalEnvelope && overrides.proposalEnvelope.proposal) || {})
      },
      policy: {
        ...proposalEnvelope.policy,
        ...((overrides.proposalEnvelope && overrides.proposalEnvelope.policy) || {})
      },
      output: {
        ...proposalEnvelope.output,
        ...((overrides.proposalEnvelope && overrides.proposalEnvelope.output) || {})
      }
    },
    reviewRoute: {
      ...reviewRoute,
      ...(overrides.reviewRoute || {})
    },
    receiptPlan: {
      ...receiptPlan,
      ...(overrides.receiptPlan || {})
    },
    expectedDecision: overrides.expectedDecision || 'fixture_accept',
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => ![
      'proposalEnvelope',
      'reviewRoute',
      'receiptPlan',
      'expectedDecision',
      'counters'
    ].includes(key)))
  };
}

test('CM1821 accepts fixture-only trusted-write-proposal envelope without runtime or write', () => {
  const result = validateVcpMemoryTrustedWriteProposalEnvelopeContract(proposalContract());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, 'fixture_trusted_write_proposal_envelope_contract_only');
  assert.equal(result.profile, 'trusted-write-proposal');
  assert.equal(result.decision, 'fixture_accept');
  assert.equal(result.proposalGenerated, false);
  assert.equal(result.proposalSubmitted, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableMemoryWritten, false);
  assert.equal(result.runtimeWiringExecuted, false);
});

test('CM1821 denies missing proposal scope operation review rollback or budget fields', () => {
  const result = validateVcpMemoryTrustedWriteProposalEnvelopeContract(proposalContract({
    proposalEnvelope: {
      decision: 'deny',
      boundary: {
        proposal_scope_present: false,
        operations_present: false,
        review_route_present: false,
        rollback_posture_present: false,
        budgets_present: false,
        l4_write_intent_shield_evidenced: false
      },
      proposal: {
        scope_id_present: false,
        operations: []
      }
    },
    reviewRoute: {
      route_present: false,
      accept_reject_semantics_present: false,
      rollback_posture_present: false
    },
    expectedDecision: 'deny'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'deny');
  assert.equal(result.proposalGenerated, false);
  assert.equal(result.memoryRead, false);
});

test('CM1821 stops durable write update supersede tombstone provider and public MCP requests as L4', () => {
  const result = validateVcpMemoryTrustedWriteProposalEnvelopeContract(proposalContract({
    proposalEnvelope: {
      decision: 'stop_l4',
      proposal: {
        proposal_submission_requested: true,
        direct_write_requested: true,
        durable_write_requested: true,
        update_requested: true,
        supersede_requested: true,
        tombstone_requested: true,
        irreversible_delete_requested: true
      },
      policy: {
        provider_api_allowed: true,
        public_mcp_expansion_allowed: true
      }
    },
    reviewRoute: {
      auto_accept_allowed: true
    },
    receiptPlan: {
      runtime_calls_planned: 1,
      provider_api_calls_planned: 1,
      public_mcp_expansion: true
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'stop_l4');
  assert.equal(result.memoryWritten, false);
  assert.equal(result.memoryUpdated, false);
  assert.equal(result.memorySuperseded, false);
  assert.equal(result.memoryTombstoned, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
});

test('CM1821 rejects raw secret proposal approval and readiness fields without echoing values', () => {
  const result = validateVcpMemoryTrustedWriteProposalEnvelopeContract(proposalContract({
    proposalEnvelope: {
      rawProposalPayload: 'SYNTHETIC_RAW_PROPOSAL_SHOULD_NOT_ECHO',
      output: {
        providerPayload: 'SYNTHETIC_PROVIDER_PAYLOAD_SHOULD_NOT_ECHO'
      }
    },
    receiptPlan: {
      approvalLineValue: 'SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'
    },
    rawDailyNoteContent: 'SYNTHETIC_RAW_NOTE_SHOULD_NOT_ECHO',
    RC_READY: true
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_proposal_or_overclaim_fields');
  assert.ok(result.forbiddenFields.includes('proposalEnvelope.rawProposalPayload'));
  assert.ok(result.forbiddenFields.includes('proposalEnvelope.output.providerPayload'));
  assert.ok(result.forbiddenFields.includes('receiptPlan.approvalLineValue'));
  assert.ok(result.forbiddenFields.includes('rawDailyNoteContent'));
  assert.ok(result.forbiddenFields.includes('RC_READY'));
  assert.equal(serialized.includes('SYNTHETIC_RAW_PROPOSAL_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_PROVIDER_PAYLOAD_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RAW_NOTE_SHOULD_NOT_ECHO'), false);
});

test('CM1821 rejects decision mismatch and unexpected fields without echoing values', () => {
  const mismatch = validateVcpMemoryTrustedWriteProposalEnvelopeContract(proposalContract({
    proposalEnvelope: {
      decision: 'fixture_accept',
      boundary: {
        proposal_scope_present: false
      }
    },
    expectedDecision: 'fixture_accept'
  }));
  assert.equal(mismatch.accepted, false);
  assert.equal(mismatch.reasonCode, 'decision_mismatch');
  assert.equal(mismatch.computedDecision, 'deny');

  const unexpected = validateVcpMemoryTrustedWriteProposalEnvelopeContract(proposalContract({
    extraFixtureNote: 'SYNTHETIC_EXTRA_VALUE_SHOULD_NOT_ECHO',
    proposalEnvelope: {
      extraEnvelopeField: 'SYNTHETIC_ENVELOPE_VALUE_SHOULD_NOT_ECHO'
    }
  }));
  const serialized = JSON.stringify(unexpected);

  assert.equal(unexpected.accepted, false);
  assert.equal(unexpected.reasonCode, 'unexpected_fields');
  assert.ok(unexpected.unexpectedFields.includes('extraFixtureNote'));
  assert.ok(unexpected.unexpectedFields.includes('proposalEnvelope.extraEnvelopeField'));
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_ENVELOPE_VALUE_SHOULD_NOT_ECHO'), false);
});

test('CM1821 rejects missing positive and malformed zero side-effect counters', () => {
  const missingFixture = proposalContract();
  delete missingFixture.counters.providerApiCalls;

  const missingResult = validateVcpMemoryTrustedWriteProposalEnvelopeContract(missingFixture);
  assert.equal(missingResult.accepted, false);
  assert.equal(missingResult.reasonCode, 'missing_required_fields');
  assert.ok(missingResult.missingFields.includes('counters.providerApiCalls'));

  const positiveResult = validateVcpMemoryTrustedWriteProposalEnvelopeContract(proposalContract({
    counters: {
      proposalsGenerated: 1,
      memoryWrites: 1,
      durableMemoryWrites: 1,
      providerApiCalls: 1,
      approvalLineOperations: 1
    }
  }));
  assert.equal(positiveResult.accepted, false);
  assert.equal(positiveResult.reasonCode, 'forbidden_positive_side_effect_counters');
  assert.ok(positiveResult.forbiddenCounters.includes('proposalsGenerated'));
  assert.ok(positiveResult.forbiddenCounters.includes('memoryWrites'));
  assert.ok(positiveResult.forbiddenCounters.includes('durableMemoryWrites'));
  assert.ok(positiveResult.forbiddenCounters.includes('providerApiCalls'));
  assert.ok(positiveResult.forbiddenCounters.includes('approvalLineOperations'));

  const malformedResult = validateVcpMemoryTrustedWriteProposalEnvelopeContract(proposalContract({
    counters: {
      providerApiCalls: '0'
    }
  }));
  assert.equal(malformedResult.accepted, false);
  assert.equal(malformedResult.reasonCode, 'invalid_trusted_write_proposal_envelope_contract');
  assert.ok(malformedResult.invalidFields.includes('counters.providerApiCalls'));
});

test('CM1821 rejects malformed envelope identifiers and operation items', () => {
  const privateId = 'PRIVATE_ID_SHOULD_NOT_ECHO';
  const result = validateVcpMemoryTrustedWriteProposalEnvelopeContract(proposalContract({
    proposalEnvelope: {
      envelope_id: privateId,
      proposal: {
        operations: ['render_redacted_intent', 'unsupported_private_operation']
      }
    },
    receiptPlan: {
      receipt_plan_id: 1821,
      proposal_envelope_id: privateId
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_trusted_write_proposal_envelope_contract');
  assert.ok(result.invalidFields.includes('proposalEnvelope.envelope_id'));
  assert.ok(result.invalidFields.includes('proposalEnvelope.proposal.operations[1]'));
  assert.ok(result.invalidFields.includes('receiptPlan.receipt_plan_id'));
  assert.ok(result.invalidFields.includes('receiptPlan.proposal_envelope_id'));
  assert.equal(serialized.includes(privateId), false);
});

test('CM1821 locks trusted-write-proposal vocabulary and helper side-effect posture', () => {
  const result = validateVcpMemoryTrustedWriteProposalEnvelopeContract(proposalContract());

  assert.ok(ALLOWED_DECISIONS.includes('fixture_accept'));
  assert.ok(ALLOWED_DECISIONS.includes('stop_l4'));
  assert.ok(ALLOWED_PROPOSAL_OPERATIONS.includes('render_redacted_intent'));
  assert.ok(ALLOWED_PROPOSAL_OPERATIONS.includes('render_rollback_posture'));
  assert.ok(REQUIRED_BOUNDARY_FIELDS.includes('l4_write_intent_shield_evidenced'));
  assert.ok(REQUIRED_PROPOSAL_FIELDS.includes('durable_write_requested'));
  assert.ok(REQUIRED_PROPOSAL_FIELDS.includes('irreversible_delete_requested'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('rawProposalPayload'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('approvalLineValue'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('completeV8'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('proposalsGenerated'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('durableMemoryWrites'));
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.proposalGenerated, false);
  assert.equal(result.proposalSubmitted, false);
  assert.equal(result.proposalReceiptAccepted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.mcpToolCalled, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.memoryUpdated, false);
  assert.equal(result.memorySuperseded, false);
  assert.equal(result.memoryTombstoned, false);
  assert.equal(result.durableAuditWritten, false);
  assert.equal(result.durableMemoryWritten, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.approvalRequestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.readinessClaimAllowed, false);
});
