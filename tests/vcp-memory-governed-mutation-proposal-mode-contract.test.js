'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_BOUNDARY_FIELDS,
  REQUIRED_COUNTER_FIELDS,
  ZERO_SIDE_EFFECT_COUNTER_FIELDS,
  validateVcpMemoryGovernedMutationProposalModeContract
} = require('../src/core/VcpMemoryGovernedMutationProposalModeContract');

function counters(overrides = {}) {
  return {
    proposalsGenerated: 1,
    proposalAcceptances: 1,
    proposalRejections: 0,
    proposalReceiptsAudited: 1,
    proposalSubmissions: 0,
    runtimeCalls: 0,
    liveVcpToolBoxCalls: 0,
    mcpToolCalls: 0,
    memoryReads: 0,
    memoryWrites: 0,
    memoryUpdates: 0,
    memorySupersedes: 0,
    memoryTombstones: 0,
    durableAuditWrites: 0,
    durableMemoryWrites: 0,
    providerApiCalls: 0,
    publicMcpExpansions: 0,
    approvalLineOperations: 0,
    approvalRequestSubmissions: 0,
    readinessClaims: 0,
    ...overrides
  };
}

function proposalModeContract(overrides = {}) {
  const base = {
    schemaVersion: 1,
    taskId: 'CM-1966',
    evidenceType: 'local-contract-only',
    profile: 'governed-mutation-proposal',
    entryEvidence: {
      m8TrustedFullReadWorkflowEvidenceAccepted: true,
      mutationProposalEnvelopeSpecified: true,
      l4WriteIntentShieldTested: true
    },
    boundary: {
      targetReferenceCategory: 'safe_target_reference_only',
      clientScopeCategory: 'bounded_client_aliases_only',
      visibilityCategory: 'bounded_visibility',
      operationFamily: 'validate_memory_proposal_only',
      proposalOnly: true,
      directWriteRequested: false,
      durableWriteRequested: false,
      updateRequested: false,
      supersedeRequested: false,
      tombstoneRequested: false,
      irreversibleDeleteRequested: false,
      memoryWriteAllowed: false,
      durableWriteAllowed: false,
      providerApiAllowed: false,
      publicMcpExpansionAllowed: false
    },
    proposalEnvelope: {
      scopeCategory: 'shape_only_scope',
      intentCategory: 'redacted_intent_shape_only',
      diffCategory: 'redacted_diff_shape_only',
      rollbackPostureCategory: 'rollback_posture_shape_only',
      payloadShapeOnly: true,
      rawValuesIncluded: false
    },
    review: {
      generateProposal: true,
      reviewDecision: 'accept',
      autoAccept: false,
      executionAuthorized: false
    },
    audit: {
      auditReceiptRequested: true,
      lowDisclosureReceipt: true,
      rawPayloadIncluded: false
    },
    expectedDecision: 'proposal_mode_accept',
    counters: counters()
  };

  return {
    ...base,
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => ![
      'entryEvidence',
      'boundary',
      'proposalEnvelope',
      'review',
      'audit',
      'counters'
    ].includes(key))),
    entryEvidence: {
      ...base.entryEvidence,
      ...(overrides.entryEvidence || {})
    },
    boundary: {
      ...base.boundary,
      ...(overrides.boundary || {})
    },
    proposalEnvelope: {
      ...base.proposalEnvelope,
      ...(overrides.proposalEnvelope || {})
    },
    review: {
      ...base.review,
      ...(overrides.review || {})
    },
    audit: {
      ...base.audit,
      ...(overrides.audit || {})
    },
    counters: counters(overrides.counters || {})
  };
}

test('CM1966 accepts local governed proposal generation and acceptance without durable write', () => {
  const result = validateVcpMemoryGovernedMutationProposalModeContract(proposalModeContract());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, 'local_governed_mutation_proposal_mode_contract_only');
  assert.equal(result.decision, 'proposal_mode_accept');
  assert.equal(result.proposalGenerated, true);
  assert.equal(result.proposalSubmitted, false);
  assert.equal(result.proposalReviewStatus, 'accepted');
  assert.equal(result.auditReceiptGenerated, true);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableMemoryWritten, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
  assert.deepEqual(result.counters, {
    proposalsGenerated: 1,
    proposalAcceptances: 1,
    proposalRejections: 0,
    proposalReceiptsAudited: 1,
    sideEffectCounterViolations: 0
  });
});

test('CM1966 accepts local governed proposal rejection with audited receipt and no write', () => {
  const result = validateVcpMemoryGovernedMutationProposalModeContract(proposalModeContract({
    review: {
      reviewDecision: 'reject'
    },
    expectedDecision: 'proposal_mode_reject',
    counters: {
      proposalAcceptances: 0,
      proposalRejections: 1
    }
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'proposal_mode_reject');
  assert.equal(result.proposalGenerated, true);
  assert.equal(result.proposalReviewStatus, 'rejected');
  assert.equal(result.proposalReceiptAccepted, false);
  assert.equal(result.proposalReceiptRejected, true);
  assert.equal(result.lowDisclosureReceipt.reviewStatus, 'rejected');
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableMemoryWritten, false);
});

test('CM1966 denies proposal mode when M8 evidence or audit prerequisites are absent', () => {
  const result = validateVcpMemoryGovernedMutationProposalModeContract(proposalModeContract({
    entryEvidence: {
      m8TrustedFullReadWorkflowEvidenceAccepted: false
    },
    audit: {
      auditReceiptRequested: false
    },
    expectedDecision: 'proposal_mode_deny'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'proposal_mode_deny');
  assert.equal(result.proposalGenerated, false);
  assert.equal(result.auditReceiptGenerated, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1966 stops write intent, auto-accept, runtime, provider, and public MCP drift as L4', () => {
  const result = validateVcpMemoryGovernedMutationProposalModeContract(proposalModeContract({
    boundary: {
      directWriteRequested: true,
      durableWriteRequested: true,
      updateRequested: true,
      supersedeRequested: true,
      tombstoneRequested: true,
      irreversibleDeleteRequested: true,
      memoryWriteAllowed: true,
      providerApiAllowed: true,
      publicMcpExpansionAllowed: true
    },
    review: {
      autoAccept: true,
      executionAuthorized: true
    },
    counters: {
      runtimeCalls: 1,
      memoryWrites: 1,
      providerApiCalls: 1,
      publicMcpExpansions: 1
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'stop_l4');
  assert.equal(result.proposalGenerated, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableMemoryWritten, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
});

test('CM1966 rejects raw secret endpoint request response and readiness fields without echoing values', () => {
  const result = validateVcpMemoryGovernedMutationProposalModeContract(proposalModeContract({
    rawPayload: 'SYNTHETIC_RAW_VALUE_SHOULD_NOT_ECHO',
    boundary: {
      endpoint: 'SYNTHETIC_ENDPOINT_SHOULD_NOT_ECHO'
    },
    proposalEnvelope: {
      memoryContent: 'SYNTHETIC_MEMORY_CONTENT_SHOULD_NOT_ECHO',
      responseBody: 'SYNTHETIC_RESPONSE_SHOULD_NOT_ECHO'
    },
    audit: {
      approvalLineValue: 'SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'
    },
    RC_READY: true
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_or_overclaim_fields');
  assert.ok(result.forbiddenFields.includes('rawPayload'));
  assert.ok(result.forbiddenFields.includes('boundary.endpoint'));
  assert.ok(result.forbiddenFields.includes('proposalEnvelope.memoryContent'));
  assert.ok(result.forbiddenFields.includes('proposalEnvelope.responseBody'));
  assert.ok(result.forbiddenFields.includes('audit.approvalLineValue'));
  assert.ok(result.forbiddenFields.includes('RC_READY'));
  assert.equal(serialized.includes('SYNTHETIC_RAW_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_MEMORY_CONTENT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RESPONSE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'), false);
});

test('CM1966 rejects missing unexpected invalid counter and decision mismatch shapes', () => {
  const missing = proposalModeContract();
  delete missing.boundary.operationFamily;
  assert.equal(
    validateVcpMemoryGovernedMutationProposalModeContract(missing).reasonCode,
    'missing_required_fields'
  );

  const unexpected = validateVcpMemoryGovernedMutationProposalModeContract(proposalModeContract({
    boundary: {
      unexpectedSafeButUnmodeledField: true
    }
  }));
  assert.equal(unexpected.reasonCode, 'unexpected_fields');

  const invalidCounters = validateVcpMemoryGovernedMutationProposalModeContract(proposalModeContract({
    counters: {
      memoryWrites: -1
    }
  }));
  assert.equal(invalidCounters.reasonCode, 'invalid_counters');

  const mismatch = validateVcpMemoryGovernedMutationProposalModeContract(proposalModeContract({
    review: {
      reviewDecision: 'reject'
    },
    expectedDecision: 'proposal_mode_accept',
    counters: {
      proposalAcceptances: 0,
      proposalRejections: 1
    }
  }));
  assert.equal(mismatch.reasonCode, 'decision_mismatch');
  assert.equal(mismatch.computedDecision, 'proposal_mode_reject');
});

test('CM1966 exports required field and zero side-effect counter contracts', () => {
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('rawPayload'));
  assert.ok(REQUIRED_BOUNDARY_FIELDS.includes('directWriteRequested'));
  assert.ok(REQUIRED_COUNTER_FIELDS.includes('proposalsGenerated'));
  assert.ok(ZERO_SIDE_EFFECT_COUNTER_FIELDS.includes('memoryWrites'));
  assert.ok(ZERO_SIDE_EFFECT_COUNTER_FIELDS.includes('readinessClaims'));
});
