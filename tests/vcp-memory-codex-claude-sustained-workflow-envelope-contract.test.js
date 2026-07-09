'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_CLIENT_FAMILIES,
  ALLOWED_DECISIONS,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_ENVELOPE_FIELDS,
  REQUIRED_RECEIPT_PLAN_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryCodexClaudeSustainedWorkflowEnvelopeContract
} = require('../src/core/VcpMemoryCodexClaudeSustainedWorkflowEnvelopeContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] || 0]));
}

function workflowContract(overrides = {}) {
  const workflowEnvelope = {
    envelope_id: 'm12_fixture_envelope_codex_private_001',
    contract_version: 'vcp_memory_codex_claude_sustained_workflow_envelope_v1',
    evidence_type: 'fixture-only',
    workflow_mode: 'fixture-only',
    decision: 'fixture_accept',
    client: {
      requesting_client_family: 'codex',
      client_id_present: true,
      other_client_private_access_requested: false,
      cross_client_private_leakage_allowed: false
    },
    scope: {
      workspace_scope_present: true,
      project_scope_present: true,
      owner_scope_present: true,
      task_scope_present: true,
      visibility: 'private',
      shared_boundary_present: false,
      visibility_expansion_requested: false
    },
    steps: {
      requested_count: 2,
      max_steps: 3,
      operations: [
        {
          operation_id: 'fixture_recall_step_1',
          operation_type: 'governed_recall_shape',
          read_query_executed: false,
          raw_private_output_allowed: false
        },
        {
          operation_id: 'fixture_handoff_receipt_step_2',
          operation_type: 'handoff_receipt_shape',
          checkpoint_memory_write_allowed: false,
          handoff_memory_write_allowed: false
        }
      ],
      live_execution_approved: false
    },
    checkpoint: {
      receipt_fields: ['workflow_envelope_id', 'client_family', 'scope_present', 'decision'],
      memory_write_allowed: false,
      durable_write_allowed: false
    },
    handoff: {
      receipt_fields: ['workflow_envelope_id', 'client_family', 'visibility', 'next_action_allowed'],
      memory_write_allowed: false,
      durable_write_allowed: false
    },
    report: {
      disclosure_level: 'summary',
      raw_private_output_allowed: false,
      readiness_claim_allowed: false
    },
    aborts: {
      stale_context_abort: true,
      unknown_client_abort: true,
      missing_scope_abort: true,
      cross_client_leakage_abort: true,
      raw_private_output_abort: true,
      write_expansion_abort: true,
      public_mcp_expansion_abort: true
    },
    next_action_allowed: 'm12_fixture_workflow_envelope_contract'
  };

  const receiptPlan = {
    receipt_plan_id: 'm12_fixture_receipt_plan_codex_private_001',
    contract_version: 'vcp_memory_codex_claude_workflow_receipt_plan_v1',
    workflow_envelope_id: workflowEnvelope.envelope_id,
    low_disclosure: true,
    client_id_value_disclosed: false,
    raw_private_payload_disclosed: false,
    checkpoint_memory_write_planned: false,
    handoff_memory_write_planned: false,
    durable_audit_write_planned: false,
    runtime_calls_planned: 0,
    mcp_tool_calls_planned: 0,
    provider_api_calls_planned: 0,
    approval_line_value_disclosed: false,
    public_mcp_expansion: false,
    readiness_claimed: false,
    next_action_allowed: workflowEnvelope.next_action_allowed
  };

  return {
    schemaVersion: 1,
    workflowEnvelope: {
      ...workflowEnvelope,
      ...(overrides.workflowEnvelope || {}),
      client: {
        ...workflowEnvelope.client,
        ...((overrides.workflowEnvelope && overrides.workflowEnvelope.client) || {})
      },
      scope: {
        ...workflowEnvelope.scope,
        ...((overrides.workflowEnvelope && overrides.workflowEnvelope.scope) || {})
      },
      steps: {
        ...workflowEnvelope.steps,
        ...((overrides.workflowEnvelope && overrides.workflowEnvelope.steps) || {})
      },
      checkpoint: {
        ...workflowEnvelope.checkpoint,
        ...((overrides.workflowEnvelope && overrides.workflowEnvelope.checkpoint) || {})
      },
      handoff: {
        ...workflowEnvelope.handoff,
        ...((overrides.workflowEnvelope && overrides.workflowEnvelope.handoff) || {})
      },
      report: {
        ...workflowEnvelope.report,
        ...((overrides.workflowEnvelope && overrides.workflowEnvelope.report) || {})
      },
      aborts: {
        ...workflowEnvelope.aborts,
        ...((overrides.workflowEnvelope && overrides.workflowEnvelope.aborts) || {})
      }
    },
    receiptPlan: {
      ...receiptPlan,
      ...(overrides.receiptPlan || {})
    },
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => !['workflowEnvelope', 'receiptPlan', 'counters'].includes(key)))
  };
}

test('CM1759 accepts Codex private fixture-only workflow envelope', () => {
  const result = validateVcpMemoryCodexClaudeSustainedWorkflowEnvelopeContract(workflowContract());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, 'fixture_workflow_envelope_contract_only');
  assert.equal(result.decision, 'fixture_accept');
  assert.equal(result.clientFamily, 'codex');
  assert.equal(result.visibility, 'private');
  assert.equal(result.workflowHarnessStarted, false);
  assert.equal(result.workflowStepsExecuted, 0);
  assert.equal(result.mcpToolCalled, false);
  assert.equal(result.checkpointMemoryWritten, false);
  assert.equal(result.handoffMemoryWritten, false);
});

test('CM1759 accepts Claude shared fixture envelope with explicit shared boundary', () => {
  const result = validateVcpMemoryCodexClaudeSustainedWorkflowEnvelopeContract(workflowContract({
    workflowEnvelope: {
      envelope_id: 'm12_fixture_envelope_claude_shared_001',
      client: {
        requesting_client_family: 'claude'
      },
      scope: {
        visibility: 'shared',
        shared_boundary_present: true
      }
    },
    receiptPlan: {
      receipt_plan_id: 'm12_fixture_receipt_plan_claude_shared_001',
      workflow_envelope_id: 'm12_fixture_envelope_claude_shared_001'
    }
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.clientFamily, 'claude');
  assert.equal(result.visibility, 'shared');
  assert.equal(result.publicMcpExpanded, false);
});

test('CM1759 accepts cross-client private access as stopped L4 without memory read', () => {
  const result = validateVcpMemoryCodexClaudeSustainedWorkflowEnvelopeContract(workflowContract({
    workflowEnvelope: {
      envelope_id: 'm12_fixture_envelope_cross_client_stop_001',
      decision: 'stop_l4',
      client: {
        other_client_private_access_requested: true,
        cross_client_private_leakage_allowed: false
      },
      steps: {
        requested_count: 0,
        operations: []
      },
      report: {
        disclosure_level: 'none'
      }
    },
    receiptPlan: {
      receipt_plan_id: 'm12_fixture_receipt_plan_cross_client_stop_001',
      workflow_envelope_id: 'm12_fixture_envelope_cross_client_stop_001'
    }
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'stop_l4');
  assert.equal(result.memoryRead, false);
  assert.equal(result.workflowHarnessStarted, false);
});

test('CM1759 accepts missing client or scope as deny fixture', () => {
  const result = validateVcpMemoryCodexClaudeSustainedWorkflowEnvelopeContract(workflowContract({
    workflowEnvelope: {
      envelope_id: 'm12_fixture_envelope_missing_scope_deny_001',
      decision: 'deny',
      client: {
        client_id_present: false
      },
      scope: {
        workspace_scope_present: false
      },
      steps: {
        requested_count: 0,
        operations: []
      },
      report: {
        disclosure_level: 'none'
      }
    },
    receiptPlan: {
      receipt_plan_id: 'm12_fixture_receipt_plan_missing_scope_deny_001',
      workflow_envelope_id: 'm12_fixture_envelope_missing_scope_deny_001'
    }
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'deny');
  assert.equal(result.lowDisclosure, true);
});

test('CM1759 rejects success-like envelope with missing client and scope', () => {
  const result = validateVcpMemoryCodexClaudeSustainedWorkflowEnvelopeContract(workflowContract({
    workflowEnvelope: {
      client: {
        client_id_present: false
      },
      scope: {
        workspace_scope_present: false
      }
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_codex_claude_sustained_workflow_envelope_contract');
  assert.ok(result.invalidFields.includes('workflowEnvelope.client.client_id_present'));
  assert.ok(result.invalidFields.includes('workflowEnvelope.scope.workspace_scope_present'));
});

test('CM1759 rejects runtime MCP checkpoint handoff write plans and positive counters', () => {
  const result = validateVcpMemoryCodexClaudeSustainedWorkflowEnvelopeContract(workflowContract({
    workflowEnvelope: {
      steps: {
        live_execution_approved: true
      },
      checkpoint: {
        memory_write_allowed: true
      },
      handoff: {
        durable_write_allowed: true
      }
    },
    receiptPlan: {
      checkpoint_memory_write_planned: true,
      handoff_memory_write_planned: true,
      durable_audit_write_planned: true,
      runtime_calls_planned: 1,
      mcp_tool_calls_planned: 1
    },
    counters: zeroCounters({
      workflowHarnessStarts: 1,
      workflowStepsExecuted: 1,
      liveVcpToolBoxCalls: 1,
      mcpToolCalls: 1,
      memoryReads: 1,
      checkpointMemoryWrites: 1,
      handoffMemoryWrites: 1,
      durableAuditWrites: 1
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_positive_side_effect_counters');
  assert.ok(result.forbiddenCounters.includes('workflowHarnessStarts'));
  assert.ok(result.forbiddenCounters.includes('workflowStepsExecuted'));
  assert.ok(result.forbiddenCounters.includes('mcpToolCalls'));
  assert.ok(result.forbiddenCounters.includes('checkpointMemoryWrites'));
});

test('CM1759 rejects raw secret approval and readiness fields without echoing values', () => {
  const result = validateVcpMemoryCodexClaudeSustainedWorkflowEnvelopeContract(workflowContract({
    workflowEnvelope: {
      debugPayload: 'PRIVATE_WORKFLOW_DEBUG_SHOULD_NOT_ECHO',
      completeV8: true
    },
    receiptPlan: {
      approvalLineValue: 'APPROVAL_VALUE_SHOULD_NOT_ECHO',
      RC_READY: true
    },
    rawDailyNoteContent: 'RAW_DAILY_NOTE_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_or_overclaim_fields');
  assert.ok(result.forbiddenFields.includes('workflowEnvelope.debugPayload'));
  assert.ok(result.forbiddenFields.includes('workflowEnvelope.completeV8'));
  assert.ok(result.forbiddenFields.includes('receiptPlan.approvalLineValue'));
  assert.ok(result.forbiddenFields.includes('receiptPlan.RC_READY'));
  assert.ok(result.forbiddenFields.includes('rawDailyNoteContent'));
  assert.equal(serialized.includes('PRIVATE_WORKFLOW_DEBUG_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('APPROVAL_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_DAILY_NOTE_SHOULD_NOT_ECHO'), false);
});

test('CM1759 locks M12 vocabulary and helper side-effect posture', () => {
  const result = validateVcpMemoryCodexClaudeSustainedWorkflowEnvelopeContract(workflowContract());

  assert.ok(ALLOWED_CLIENT_FAMILIES.includes('codex'));
  assert.ok(ALLOWED_CLIENT_FAMILIES.includes('claude'));
  assert.ok(ALLOWED_DECISIONS.includes('stop_l4'));
  assert.ok(REQUIRED_ENVELOPE_FIELDS.includes('checkpoint'));
  assert.ok(REQUIRED_ENVELOPE_FIELDS.includes('handoff'));
  assert.ok(REQUIRED_RECEIPT_PLAN_FIELDS.includes('checkpoint_memory_write_planned'));
  assert.ok(REQUIRED_RECEIPT_PLAN_FIELDS.includes('handoff_memory_write_planned'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('rawDailyNoteContent'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('approvalLineValue'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('completeV8'));
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.workflowHarnessStarted, false);
  assert.equal(result.workflowStepsExecuted, 0);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.mcpToolCalled, false);
  assert.equal(result.fallbackExecuted, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.checkpointMemoryWritten, false);
  assert.equal(result.handoffMemoryWritten, false);
  assert.equal(result.durableAuditWritten, false);
  assert.equal(result.durableMemoryWritten, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.approvalRequestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimAllowed, false);
});
