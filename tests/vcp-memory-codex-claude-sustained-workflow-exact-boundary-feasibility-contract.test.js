'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  CONTRACT_VERSION,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_CANDIDATE_FIELD_FLAGS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryCodexClaudeSustainedWorkflowExactBoundaryFeasibilityContract
} = require('../src/core/VcpMemoryCodexClaudeSustainedWorkflowExactBoundaryFeasibilityContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] || 0]));
}

function falseAuthorization(overrides = {}) {
  return Object.fromEntries(REQUIRED_AUTHORIZATION_FIELDS.map(field => [field, overrides[field] || false]));
}

function requiredCandidateFields(overrides = {}) {
  return Object.fromEntries(REQUIRED_CANDIDATE_FIELD_FLAGS.map(field => [field, field in overrides ? overrides[field] : true]));
}

function feasibilityContract(overrides = {}) {
  const feasibility = {
    packet_id: 'cm1854_m12_exact_boundary_feasibility_packet_001',
    contract_version: CONTRACT_VERSION,
    evidence_type: 'fixture-only',
    boundary_mode: 'feasibility-only',
    decision: 'partial_blocked',
    source_refs: {
      m8_receipt_ref: 'docs/VCP_MEMORY_TRUSTED_FULL_READ_CM1813_WORKFLOW_RECEIPT_CLOSEOUT_GATE_REVIEW.md',
      m11_blocker_ref: 'docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_CM1851_M11_BLOCKED_ROUTE_CLOSEOUT_NEXT_GATE_REVIEW.md',
      m12_alignment_ref: 'docs/VCP_MEMORY_CODEX_CLAUDE_SUSTAINED_WORKFLOW_CM1853_M12_FIXTURE_CHAIN_ALIGNMENT_REVIEW.md'
    },
    candidate_fields: requiredCandidateFields(),
    blocked_reasons: [
      'm11_live_evidence_absent',
      'checkpoint_handoff_write_authority_absent'
    ],
    authorization: falseAuthorization(),
    next_action_allowed: 'cm1855_m12_exact_boundary_feasibility_fixture_contract'
  };

  return {
    schemaVersion: 1,
    feasibility: {
      ...feasibility,
      ...(overrides.feasibility || {}),
      source_refs: {
        ...feasibility.source_refs,
        ...((overrides.feasibility && overrides.feasibility.source_refs) || {})
      },
      candidate_fields: {
        ...feasibility.candidate_fields,
        ...((overrides.feasibility && overrides.feasibility.candidate_fields) || {})
      },
      authorization: {
        ...feasibility.authorization,
        ...((overrides.feasibility && overrides.feasibility.authorization) || {})
      }
    },
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => !['feasibility', 'counters'].includes(key)))
  };
}

test('CM1855 accepts partial blocked M12 exact-boundary feasibility fixture', () => {
  const result = validateVcpMemoryCodexClaudeSustainedWorkflowExactBoundaryFeasibilityContract(feasibilityContract());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, 'fixture_exact_boundary_feasibility_only');
  assert.equal(result.decision, 'partial_blocked');
  assert.equal(result.exactBoundaryFeasibilityValidated, true);
  assert.equal(result.concreteExactValuesBound, false);
  assert.equal(result.liveExecutionPacketBound, false);
  assert.equal(result.workflowHarnessStarted, false);
  assert.equal(result.workflowStepsExecuted, 0);
  assert.equal(result.mcpMemoryToolCalled, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1855 accepts schema-only feasibility packet with closeout next action', () => {
  const result = validateVcpMemoryCodexClaudeSustainedWorkflowExactBoundaryFeasibilityContract(feasibilityContract({
    feasibility: {
      packet_id: 'cm1854_m12_exact_boundary_feasibility_schema_001',
      evidence_type: 'schema-only',
      next_action_allowed: 'cm1856_m12_exact_boundary_feasibility_contract_closeout'
    }
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.evidenceType, 'schema-only');
  assert.equal(result.lowDisclosureProjection.nextActionAllowed, 'cm1856_m12_exact_boundary_feasibility_contract_closeout');
});

test('CM1855 reports incomplete fixture when required fields are missing', () => {
  const input = feasibilityContract();
  delete input.feasibility.source_refs.m11_blocker_ref;
  delete input.feasibility.candidate_fields.target_alias_field_required;

  const result = validateVcpMemoryCodexClaudeSustainedWorkflowExactBoundaryFeasibilityContract(input);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'm12_exact_boundary_feasibility_incomplete');
  assert.deepEqual(result.missingFields.sort(), [
    'feasibility.candidate_fields.target_alias_field_required',
    'feasibility.source_refs.m11_blocker_ref'
  ]);
});

test('CM1855 rejects concrete values or live execution packet binding', () => {
  const result = validateVcpMemoryCodexClaudeSustainedWorkflowExactBoundaryFeasibilityContract(feasibilityContract({
    feasibility: {
      authorization: {
        concreteExactValuesBound: true,
        liveExecutionPacketBound: true
      }
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_m12_exact_boundary_feasibility_contract');
  assert.ok(result.invalidFields.includes('feasibility.authorization.concreteExactValuesBound'));
  assert.ok(result.invalidFields.includes('feasibility.authorization.liveExecutionPacketBound'));
  assert.equal(result.liveExecutionPacketBound, false);
});

test('CM1855 rejects runtime memory write unlock and readiness authority', () => {
  const result = validateVcpMemoryCodexClaudeSustainedWorkflowExactBoundaryFeasibilityContract(feasibilityContract({
    feasibility: {
      authorization: {
        runtimeCallAllowed: true,
        memoryReadAllowed: true,
        checkpointHandoffWriteAllowed: true,
        m12UnlockAllowed: true,
        readinessClaimAllowed: true
      }
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.invalidFields.includes('feasibility.authorization.runtimeCallAllowed'));
  assert.ok(result.invalidFields.includes('feasibility.authorization.memoryReadAllowed'));
  assert.ok(result.invalidFields.includes('feasibility.authorization.checkpointHandoffWriteAllowed'));
  assert.ok(result.invalidFields.includes('feasibility.authorization.m12UnlockAllowed'));
  assert.ok(result.invalidFields.includes('feasibility.authorization.readinessClaimAllowed'));
});

test('CM1855 rejects missing blocker reasons and disabled candidate flags', () => {
  const result = validateVcpMemoryCodexClaudeSustainedWorkflowExactBoundaryFeasibilityContract(feasibilityContract({
    feasibility: {
      candidate_fields: {
        abort_rule_field_required: false
      },
      blocked_reasons: [
        'm11_live_evidence_absent'
      ]
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.invalidFields.includes('feasibility.candidate_fields.abort_rule_field_required'));
  assert.ok(result.invalidFields.includes('feasibility.blocked_reasons.checkpoint_handoff_write_authority_absent'));
});

test('CM1855 requires every side-effect counter to be present', () => {
  const input = feasibilityContract();
  delete input.counters.liveVcpToolBoxCalls;
  delete input.counters.memoryWrites;

  const result = validateVcpMemoryCodexClaudeSustainedWorkflowExactBoundaryFeasibilityContract(input);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'm12_exact_boundary_feasibility_incomplete');
  assert.deepEqual(result.missingFields.sort(), [
    'counters.liveVcpToolBoxCalls',
    'counters.memoryWrites'
  ]);
});

test('CM1855 rejects raw secret request approval and readiness fields without echoing values', () => {
  const result = validateVcpMemoryCodexClaudeSustainedWorkflowExactBoundaryFeasibilityContract(feasibilityContract({
    feasibility: {
      requestBody: {
        hidden: 'do-not-echo'
      },
      approvalLineValue: 'do-not-echo',
      rawPayload: 'do-not-echo',
      rcReady: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_request_approval_runtime_or_readiness_fields');
  assert.deepEqual(result.forbiddenFields.sort(), [
    'feasibility.approvalLineValue',
    'feasibility.rawPayload',
    'feasibility.rcReady',
    'feasibility.requestBody'
  ]);
  assert.equal(JSON.stringify(result).includes('do-not-echo'), false);
});

test('CM1855 locks required vocabulary counters and side-effect posture', () => {
  const [positiveCounter, negativeCounter, stringCounter] = ZERO_COUNTER_FIELDS;
  const result = validateVcpMemoryCodexClaudeSustainedWorkflowExactBoundaryFeasibilityContract(feasibilityContract({
    counters: {
      [positiveCounter]: 1,
      [negativeCounter]: -1,
      [stringCounter]: '0'
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_nonzero_or_invalid_side_effect_counters');
  assert.deepEqual(result.forbiddenCounters, [positiveCounter, negativeCounter, stringCounter]);
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('requestBody'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('approvalLineValue'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('rcReady'));
});
