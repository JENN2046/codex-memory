'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_DECISIONS,
  ALLOWED_PROPOSAL_REVIEW_STATUS,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_INTENT_FIELDS,
  REQUIRED_REDACTION_FIELDS,
  REQUIRED_REVIEW_FIELDS,
  REQUIRED_SCOPE_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryTrustedWriteProposalReceiptShapeContract
} = require('../src/core/VcpMemoryTrustedWriteProposalReceiptShapeContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] || 0]));
}

function receiptShapeContract(overrides = {}) {
  const sourceEnvelope = {
    envelope_id: 'm9_fixture_trusted_write_proposal_envelope_001',
    contract_version: 'vcp_memory_trusted_write_proposal_envelope_v1',
    evidence_type: 'fixture-only',
    profile: 'trusted-write-proposal',
    envelope_decision: 'fixture_accept',
    envelope_validated: true,
    proposal_generation_performed: false,
    proposal_submission_performed: false,
    memory_write_performed: false,
    durable_write_performed: false
  };

  const proposalReceipt = {
    receipt_id: 'm9_fixture_trusted_write_proposal_receipt_001',
    contract_version: 'vcp_memory_trusted_write_proposal_receipt_shape_v1',
    evidence_type: 'fixture-only',
    profile: 'trusted-write-proposal',
    decision: overrides.expectedDecision || 'receipt_shape_accept',
    scope: {
      scope_id_present: true,
      client_scope_present: true,
      visibility_present: true,
      operation_scope_present: true
    },
    intent: {
      redacted_intent_present: true,
      mutation_intent_shape_only: true,
      proposal_generation_requested: false,
      proposal_submission_requested: false,
      direct_write_requested: false,
      durable_write_requested: false,
      update_requested: false,
      supersede_requested: false,
      tombstone_requested: false,
      irreversible_delete_requested: false
    },
    review: {
      accept_reject_status_present: true,
      proposal_review_status: 'accept',
      auto_accept_allowed: false,
      execution_authorized: false
    },
    rollback: {
      rollback_posture_present: true,
      rollback_plan_shape_only: true,
      rollback_execution_requested: false
    },
    output: {
      disclosure_level: 'redacted_receipt_shape',
      redacted_output_present: true,
      raw_private_output_allowed: false,
      approval_line_value_disclosed: false,
      readiness_claim_allowed: false
    },
    policy: {
      memory_write_allowed: false,
      durable_write_allowed: false,
      provider_api_allowed: false,
      public_mcp_expansion_allowed: false,
      raw_private_payload_allowed: false
    },
    next_action_allowed: 'cm1822_fixture_contract'
  };

  const redaction = {
    low_disclosure: true,
    values_redacted: true,
    field_names_only_on_rejection: true,
    safe_fixture_ids_only: true,
    raw_private_payload_disclosed: false,
    secret_values_disclosed: false,
    approval_line_value_disclosed: false
  };

  return {
    schemaVersion: 1,
    sourceEnvelope: {
      ...sourceEnvelope,
      ...(overrides.sourceEnvelope || {})
    },
    proposalReceipt: {
      ...proposalReceipt,
      ...(overrides.proposalReceipt || {}),
      scope: {
        ...proposalReceipt.scope,
        ...((overrides.proposalReceipt && overrides.proposalReceipt.scope) || {})
      },
      intent: {
        ...proposalReceipt.intent,
        ...((overrides.proposalReceipt && overrides.proposalReceipt.intent) || {})
      },
      review: {
        ...proposalReceipt.review,
        ...((overrides.proposalReceipt && overrides.proposalReceipt.review) || {})
      },
      rollback: {
        ...proposalReceipt.rollback,
        ...((overrides.proposalReceipt && overrides.proposalReceipt.rollback) || {})
      },
      output: {
        ...proposalReceipt.output,
        ...((overrides.proposalReceipt && overrides.proposalReceipt.output) || {})
      },
      policy: {
        ...proposalReceipt.policy,
        ...((overrides.proposalReceipt && overrides.proposalReceipt.policy) || {})
      }
    },
    redaction: {
      ...redaction,
      ...(overrides.redaction || {})
    },
    expectedDecision: overrides.expectedDecision || 'receipt_shape_accept',
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => ![
      'sourceEnvelope',
      'proposalReceipt',
      'redaction',
      'expectedDecision',
      'counters'
    ].includes(key)))
  };
}

test('CM1822 accepts fixture-only trusted-write-proposal receipt shape without runtime or write', () => {
  const result = validateVcpMemoryTrustedWriteProposalReceiptShapeContract(receiptShapeContract());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, 'fixture_trusted_write_proposal_receipt_shape_contract_only');
  assert.equal(result.profile, 'trusted-write-proposal');
  assert.equal(result.decision, 'receipt_shape_accept');
  assert.equal(result.proposalReviewStatus, 'accept');
  assert.equal(result.receiptShapeAccepted, true);
  assert.equal(result.proposalReceiptAccepted, false);
  assert.equal(result.proposalGenerated, false);
  assert.equal(result.proposalSubmitted, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableMemoryWritten, false);
  assert.equal(result.runtimeWiringExecuted, false);
});

test('CM1822 accepts explicit reject review status as a valid low-disclosure receipt shape', () => {
  const result = validateVcpMemoryTrustedWriteProposalReceiptShapeContract(receiptShapeContract({
    proposalReceipt: {
      review: {
        proposal_review_status: 'reject'
      }
    }
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'receipt_shape_accept');
  assert.equal(result.proposalReviewStatus, 'reject');
  assert.equal(result.proposalReceiptAccepted, false);
  assert.deepEqual(result.lowDisclosureProjection.proposalReviewStatus, 'reject');
});

test('CM1822 computes receipt_shape_reject for missing scope intent review rollback output or redaction prerequisites', () => {
  const result = validateVcpMemoryTrustedWriteProposalReceiptShapeContract(receiptShapeContract({
    sourceEnvelope: {
      envelope_decision: 'deny'
    },
    proposalReceipt: {
      decision: 'receipt_shape_reject',
      scope: {
        scope_id_present: false,
        client_scope_present: false,
        visibility_present: false,
        operation_scope_present: false
      },
      intent: {
        redacted_intent_present: false,
        mutation_intent_shape_only: false
      },
      review: {
        accept_reject_status_present: false
      },
      rollback: {
        rollback_posture_present: false,
        rollback_plan_shape_only: false
      },
      output: {
        redacted_output_present: false
      }
    },
    redaction: {
      low_disclosure: false,
      values_redacted: false,
      field_names_only_on_rejection: false,
      safe_fixture_ids_only: false
    },
    expectedDecision: 'receipt_shape_reject'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'receipt_shape_reject');
  assert.equal(result.receiptShapeAccepted, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.proposalReceiptAccepted, false);
});

test('CM1822 stops generation submission durable write rollback execution provider and public MCP as L4', () => {
  const result = validateVcpMemoryTrustedWriteProposalReceiptShapeContract(receiptShapeContract({
    sourceEnvelope: {
      envelope_decision: 'stop_l4'
    },
    proposalReceipt: {
      decision: 'stop_l4',
      intent: {
        proposal_generation_requested: true,
        proposal_submission_requested: true,
        direct_write_requested: true,
        durable_write_requested: true,
        update_requested: true,
        supersede_requested: true,
        tombstone_requested: true,
        irreversible_delete_requested: true
      },
      review: {
        auto_accept_allowed: true,
        execution_authorized: true
      },
      rollback: {
        rollback_execution_requested: true
      },
      output: {
        readiness_claim_allowed: true
      },
      policy: {
        provider_api_allowed: true,
        public_mcp_expansion_allowed: true,
        durable_write_allowed: true
      }
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
  assert.equal(result.approvalLineGenerated, false);
});

test('CM1822 rejects raw secret receipt approval and readiness fields without echoing values', () => {
  const result = validateVcpMemoryTrustedWriteProposalReceiptShapeContract(receiptShapeContract({
    proposalReceipt: {
      rawReceiptPayload: 'SYNTHETIC_RAW_RECEIPT_SHOULD_NOT_ECHO',
      output: {
        providerPayload: 'SYNTHETIC_PROVIDER_PAYLOAD_SHOULD_NOT_ECHO'
      }
    },
    redaction: {
      approvalLineValue: 'SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'
    },
    rawDailyNoteContent: 'SYNTHETIC_RAW_NOTE_SHOULD_NOT_ECHO',
    RC_READY: true
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_receipt_or_overclaim_fields');
  assert.ok(result.forbiddenFields.includes('proposalReceipt.rawReceiptPayload'));
  assert.ok(result.forbiddenFields.includes('proposalReceipt.output.providerPayload'));
  assert.ok(result.forbiddenFields.includes('redaction.approvalLineValue'));
  assert.ok(result.forbiddenFields.includes('rawDailyNoteContent'));
  assert.ok(result.forbiddenFields.includes('RC_READY'));
  assert.equal(serialized.includes('SYNTHETIC_RAW_RECEIPT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_PROVIDER_PAYLOAD_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RAW_NOTE_SHOULD_NOT_ECHO'), false);
});

test('CM1822 rejects decision mismatch and unexpected fields without echoing values', () => {
  const mismatch = validateVcpMemoryTrustedWriteProposalReceiptShapeContract(receiptShapeContract({
    proposalReceipt: {
      decision: 'receipt_shape_accept',
      scope: {
        scope_id_present: false
      }
    },
    expectedDecision: 'receipt_shape_accept'
  }));
  assert.equal(mismatch.accepted, false);
  assert.equal(mismatch.reasonCode, 'decision_mismatch');
  assert.equal(mismatch.computedDecision, 'receipt_shape_reject');

  const unexpected = validateVcpMemoryTrustedWriteProposalReceiptShapeContract(receiptShapeContract({
    extraFixtureNote: 'SYNTHETIC_EXTRA_VALUE_SHOULD_NOT_ECHO',
    proposalReceipt: {
      extraReceiptField: 'SYNTHETIC_RECEIPT_VALUE_SHOULD_NOT_ECHO'
    }
  }));
  const serialized = JSON.stringify(unexpected);

  assert.equal(unexpected.accepted, false);
  assert.equal(unexpected.reasonCode, 'unexpected_fields');
  assert.ok(unexpected.unexpectedFields.includes('extraFixtureNote'));
  assert.ok(unexpected.unexpectedFields.includes('proposalReceipt.extraReceiptField'));
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RECEIPT_VALUE_SHOULD_NOT_ECHO'), false);
});

test('CM1822 rejects missing positive and malformed zero side-effect counters', () => {
  const missingFixture = receiptShapeContract();
  delete missingFixture.counters.providerApiCalls;

  const missingResult = validateVcpMemoryTrustedWriteProposalReceiptShapeContract(missingFixture);
  assert.equal(missingResult.accepted, false);
  assert.equal(missingResult.reasonCode, 'missing_required_fields');
  assert.ok(missingResult.missingFields.includes('counters.providerApiCalls'));

  const positiveResult = validateVcpMemoryTrustedWriteProposalReceiptShapeContract(receiptShapeContract({
    counters: {
      proposalReceiptsAccepted: 1,
      proposalsGenerated: 1,
      memoryWrites: 1,
      durableMemoryWrites: 1,
      providerApiCalls: 1,
      approvalLineOperations: 1
    }
  }));
  assert.equal(positiveResult.accepted, false);
  assert.equal(positiveResult.reasonCode, 'forbidden_positive_side_effect_counters');
  assert.ok(positiveResult.forbiddenCounters.includes('proposalReceiptsAccepted'));
  assert.ok(positiveResult.forbiddenCounters.includes('proposalsGenerated'));
  assert.ok(positiveResult.forbiddenCounters.includes('memoryWrites'));
  assert.ok(positiveResult.forbiddenCounters.includes('durableMemoryWrites'));
  assert.ok(positiveResult.forbiddenCounters.includes('providerApiCalls'));
  assert.ok(positiveResult.forbiddenCounters.includes('approvalLineOperations'));

  const malformedResult = validateVcpMemoryTrustedWriteProposalReceiptShapeContract(receiptShapeContract({
    counters: {
      providerApiCalls: '0'
    }
  }));
  assert.equal(malformedResult.accepted, false);
  assert.equal(malformedResult.reasonCode, 'invalid_trusted_write_proposal_receipt_shape_contract');
  assert.ok(malformedResult.invalidFields.includes('counters.providerApiCalls'));
});

test('CM1822 rejects malformed receipt identifiers and unsafe enum values without echoing unsafe ids', () => {
  const privateReceiptId = 'PRIVATE_RECEIPT_ID_SHOULD_NOT_ECHO';
  const privateEnvelopeId = 'PRIVATE_ENVELOPE_ID_SHOULD_NOT_ECHO';
  const privateExpectedDecision = 'PRIVATE_EXPECTED_DECISION_SHOULD_NOT_ECHO';
  const result = validateVcpMemoryTrustedWriteProposalReceiptShapeContract(receiptShapeContract({
    sourceEnvelope: {
      envelope_id: privateEnvelopeId
    },
    proposalReceipt: {
      receipt_id: privateReceiptId,
      review: {
        proposal_review_status: 'PRIVATE_REVIEW_STATUS_SHOULD_NOT_ECHO'
      },
      output: {
        disclosure_level: 'private_raw_receipt'
      }
    },
    expectedDecision: privateExpectedDecision
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_trusted_write_proposal_receipt_shape_contract');
  assert.ok(result.invalidFields.includes('expectedDecision'));
  assert.ok(result.invalidFields.includes('sourceEnvelope.envelope_id'));
  assert.ok(result.invalidFields.includes('proposalReceipt.receipt_id'));
  assert.ok(result.invalidFields.includes('proposalReceipt.review.proposal_review_status'));
  assert.ok(result.invalidFields.includes('proposalReceipt.output.disclosure_level'));
  assert.equal(serialized.includes(privateReceiptId), false);
  assert.equal(serialized.includes(privateEnvelopeId), false);
  assert.equal(serialized.includes(privateExpectedDecision), false);
  assert.equal(serialized.includes('PRIVATE_REVIEW_STATUS_SHOULD_NOT_ECHO'), false);
});

test('CM1822 locks receipt shape vocabulary and helper side-effect posture', () => {
  const result = validateVcpMemoryTrustedWriteProposalReceiptShapeContract(receiptShapeContract());

  assert.ok(ALLOWED_DECISIONS.includes('receipt_shape_accept'));
  assert.ok(ALLOWED_DECISIONS.includes('receipt_shape_reject'));
  assert.ok(ALLOWED_DECISIONS.includes('stop_l4'));
  assert.ok(ALLOWED_PROPOSAL_REVIEW_STATUS.includes('accept'));
  assert.ok(ALLOWED_PROPOSAL_REVIEW_STATUS.includes('reject'));
  assert.ok(REQUIRED_SCOPE_FIELDS.includes('client_scope_present'));
  assert.ok(REQUIRED_INTENT_FIELDS.includes('durable_write_requested'));
  assert.ok(REQUIRED_INTENT_FIELDS.includes('irreversible_delete_requested'));
  assert.ok(REQUIRED_REVIEW_FIELDS.includes('accept_reject_status_present'));
  assert.ok(REQUIRED_REDACTION_FIELDS.includes('field_names_only_on_rejection'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('rawReceiptPayload'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('approvalLineValue'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('completeV8'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('proposalReceiptsAccepted'));
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
