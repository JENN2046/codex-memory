'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_CHAIN_DECISIONS,
  ALLOWED_RECEIPT_FIELDS,
  FORBIDDEN_FIELD_NAMES,
  RECEIPT_CHAIN_ZERO_COUNTER_FIELDS,
  REQUIRED_RECEIPT_CHAIN_FIELDS,
  REQUIRED_RECEIPT_FIELDS,
  validateVcpMemoryCodexClaudeSustainedWorkflowReceiptChainContract
} = require('../src/core/VcpMemoryCodexClaudeSustainedWorkflowReceiptChainContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(RECEIPT_CHAIN_ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] || 0]));
}

function envelopeContractInput(overrides = {}) {
  const workflowEnvelope = {
    envelope_id: 'm12_fixture_envelope_codex_private_receipt_001',
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
          operation_id: 'fixture_receipt_chain_step_1',
          operation_type: 'governed_recall_shape',
          read_query_executed: false,
          raw_private_output_allowed: false
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
    receipt_plan_id: 'm12_fixture_receipt_plan_codex_private_chain_001',
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
    counters: Object.fromEntries(RECEIPT_CHAIN_ZERO_COUNTER_FIELDS.map(field => [field, 0])),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => !['workflowEnvelope', 'receiptPlan'].includes(key)))
  };
}

function receiptChainContract(overrides = {}) {
  const workflowEnvelopeContractInput = envelopeContractInput(overrides.workflowEnvelopeContractInput || {});
  const envelopeId = workflowEnvelopeContractInput.workflowEnvelope.envelope_id;
  const receiptChain = {
    chain_id: 'm12_fixture_receipt_chain_codex_private_001',
    contract_version: 'vcp_memory_codex_claude_workflow_receipt_chain_v1',
    evidence_type: 'fixture-only',
    chain_mode: 'fixture-only',
    workflow_envelope_id: envelopeId,
    chain_decision: 'receipt_accept',
    checkpointReceipt: {
      receipt_id: 'm12_fixture_checkpoint_receipt_001',
      receipt_type: 'checkpoint',
      workflow_envelope_id: envelopeId,
      low_disclosure: true,
      fields: ['workflow_envelope_id', 'receipt_chain_id', 'client_family', 'decision'],
      client_id_value_disclosed: false,
      raw_private_payload_disclosed: false,
      memory_write_performed: false,
      durable_write_performed: false,
      submitted_to_runtime: false
    },
    handoffReceipt: {
      receipt_id: 'm12_fixture_handoff_receipt_001',
      receipt_type: 'handoff',
      workflow_envelope_id: envelopeId,
      low_disclosure: true,
      fields: ['workflow_envelope_id', 'receipt_chain_id', 'visibility', 'next_action_allowed'],
      client_id_value_disclosed: false,
      raw_private_payload_disclosed: false,
      memory_write_performed: false,
      durable_write_performed: false,
      submitted_to_runtime: false
    },
    auditReceiptPlan: {
      low_disclosure: true,
      audit_event_written: false,
      durable_audit_write_planned: false,
      raw_audit_row_disclosed: false,
      raw_private_payload_disclosed: false
    },
    ordering: {
      requires_envelope_acceptance: true,
      checkpoint_before_handoff: true,
      handoff_after_checkpoint: true
    },
    report: {
      disclosure_level: 'summary',
      low_disclosure: true,
      raw_private_output_allowed: false,
      readiness_claim_allowed: false
    },
    aborts: {
      missing_envelope_abort: true,
      envelope_rejection_abort: true,
      receipt_mismatch_abort: true,
      write_expansion_abort: true,
      raw_private_output_abort: true,
      durable_audit_write_abort: true,
      public_mcp_expansion_abort: true,
      readiness_overclaim_abort: true
    },
    next_action_allowed: 'm12_fixture_receipt_chain_contract'
  };

  return {
    schemaVersion: 1,
    workflowEnvelopeContractInput,
    receiptChain: {
      ...receiptChain,
      ...(overrides.receiptChain || {}),
      checkpointReceipt: {
        ...receiptChain.checkpointReceipt,
        ...((overrides.receiptChain && overrides.receiptChain.checkpointReceipt) || {})
      },
      handoffReceipt: {
        ...receiptChain.handoffReceipt,
        ...((overrides.receiptChain && overrides.receiptChain.handoffReceipt) || {})
      },
      auditReceiptPlan: {
        ...receiptChain.auditReceiptPlan,
        ...((overrides.receiptChain && overrides.receiptChain.auditReceiptPlan) || {})
      },
      ordering: {
        ...receiptChain.ordering,
        ...((overrides.receiptChain && overrides.receiptChain.ordering) || {})
      },
      report: {
        ...receiptChain.report,
        ...((overrides.receiptChain && overrides.receiptChain.report) || {})
      },
      aborts: {
        ...receiptChain.aborts,
        ...((overrides.receiptChain && overrides.receiptChain.aborts) || {})
      }
    },
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => ![
      'workflowEnvelopeContractInput',
      'receiptChain',
      'counters'
    ].includes(key)))
  };
}

test('CM1760 accepts Codex private fixture-only receipt chain', () => {
  const result = validateVcpMemoryCodexClaudeSustainedWorkflowReceiptChainContract(receiptChainContract());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, 'fixture_receipt_chain_contract_only');
  assert.equal(result.chainDecision, 'receipt_accept');
  assert.equal(result.envelopeDecision, 'fixture_accept');
  assert.equal(result.clientFamily, 'codex');
  assert.equal(result.checkpointReceiptWritten, false);
  assert.equal(result.handoffReceiptWritten, false);
  assert.equal(result.durableAuditWritten, false);
});

test('CM1760 accepts Claude shared fixture-only receipt chain', () => {
  const result = validateVcpMemoryCodexClaudeSustainedWorkflowReceiptChainContract(receiptChainContract({
    workflowEnvelopeContractInput: {
      workflowEnvelope: {
        envelope_id: 'm12_fixture_envelope_claude_shared_receipt_001',
        client: {
          requesting_client_family: 'claude'
        },
        scope: {
          visibility: 'shared',
          shared_boundary_present: true
        }
      },
      receiptPlan: {
        workflow_envelope_id: 'm12_fixture_envelope_claude_shared_receipt_001'
      }
    },
    receiptChain: {
      chain_id: 'm12_fixture_receipt_chain_claude_shared_001',
      workflow_envelope_id: 'm12_fixture_envelope_claude_shared_receipt_001',
      checkpointReceipt: {
        workflow_envelope_id: 'm12_fixture_envelope_claude_shared_receipt_001'
      },
      handoffReceipt: {
        workflow_envelope_id: 'm12_fixture_envelope_claude_shared_receipt_001'
      }
    }
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.clientFamily, 'claude');
  assert.equal(result.visibility, 'shared');
  assert.equal(result.publicMcpExpanded, false);
});

test('CM1760 accepts stopped L4 envelope as abort receipt chain without memory write', () => {
  const result = validateVcpMemoryCodexClaudeSustainedWorkflowReceiptChainContract(receiptChainContract({
    workflowEnvelopeContractInput: {
      workflowEnvelope: {
        envelope_id: 'm12_fixture_envelope_stop_l4_receipt_001',
        decision: 'stop_l4',
        client: {
          other_client_private_access_requested: true
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
        workflow_envelope_id: 'm12_fixture_envelope_stop_l4_receipt_001'
      }
    },
    receiptChain: {
      workflow_envelope_id: 'm12_fixture_envelope_stop_l4_receipt_001',
      chain_decision: 'receipt_stop_l4',
      checkpointReceipt: {
        workflow_envelope_id: 'm12_fixture_envelope_stop_l4_receipt_001',
        fields: ['workflow_envelope_id', 'receipt_chain_id', 'chain_decision', 'abort_reason']
      },
      handoffReceipt: {
        workflow_envelope_id: 'm12_fixture_envelope_stop_l4_receipt_001',
        fields: ['workflow_envelope_id', 'receipt_chain_id', 'chain_decision', 'abort_reason']
      },
      report: {
        disclosure_level: 'none'
      }
    }
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.chainDecision, 'receipt_stop_l4');
  assert.equal(result.memoryRead, false);
  assert.equal(result.checkpointMemoryWritten, false);
});

test('CM1760 accepts deny envelope as low-disclosure deny receipt chain', () => {
  const result = validateVcpMemoryCodexClaudeSustainedWorkflowReceiptChainContract(receiptChainContract({
    workflowEnvelopeContractInput: {
      workflowEnvelope: {
        envelope_id: 'm12_fixture_envelope_deny_receipt_001',
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
        workflow_envelope_id: 'm12_fixture_envelope_deny_receipt_001'
      }
    },
    receiptChain: {
      workflow_envelope_id: 'm12_fixture_envelope_deny_receipt_001',
      chain_decision: 'receipt_deny',
      checkpointReceipt: {
        workflow_envelope_id: 'm12_fixture_envelope_deny_receipt_001'
      },
      handoffReceipt: {
        workflow_envelope_id: 'm12_fixture_envelope_deny_receipt_001'
      },
      report: {
        disclosure_level: 'none'
      }
    }
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.chainDecision, 'receipt_deny');
  assert.equal(result.lowDisclosure, true);
});

test('CM1760 rejects receipt chain when envelope contract is invalid', () => {
  const result = validateVcpMemoryCodexClaudeSustainedWorkflowReceiptChainContract(receiptChainContract({
    workflowEnvelopeContractInput: {
      workflowEnvelope: {
        client: {
          client_id_present: false
        },
        scope: {
          workspace_scope_present: false
        }
      }
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_workflow_envelope_contract');
  assert.ok(result.invalidFields.includes('workflowEnvelope.client.client_id_present'));
});

test('CM1760 rejects envelope id mismatch and decision mismatch', () => {
  const result = validateVcpMemoryCodexClaudeSustainedWorkflowReceiptChainContract(receiptChainContract({
    receiptChain: {
      workflow_envelope_id: 'wrong-envelope-id',
      chain_decision: 'receipt_stop_l4',
      checkpointReceipt: {
        workflow_envelope_id: 'wrong-envelope-id'
      },
      handoffReceipt: {
        workflow_envelope_id: 'wrong-envelope-id'
      }
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_codex_claude_sustained_workflow_receipt_chain_contract');
  assert.ok(result.invalidFields.includes('receiptChain.workflow_envelope_id'));
  assert.ok(result.invalidFields.includes('receiptChain.chain_decision'));
});

test('CM1760 rejects checkpoint handoff audit writes and positive counters', () => {
  const result = validateVcpMemoryCodexClaudeSustainedWorkflowReceiptChainContract(receiptChainContract({
    receiptChain: {
      checkpointReceipt: {
        memory_write_performed: true
      },
      handoffReceipt: {
        durable_write_performed: true
      },
      auditReceiptPlan: {
        audit_event_written: true,
        durable_audit_write_planned: true
      }
    },
    counters: zeroCounters({
      checkpointReceiptWrites: 1,
      handoffReceiptWrites: 1,
      auditReceiptWrites: 1,
      receiptChainDurableWrites: 1,
      mcpToolCalls: 1
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_positive_side_effect_counters');
  assert.ok(result.forbiddenCounters.includes('checkpointReceiptWrites'));
  assert.ok(result.forbiddenCounters.includes('handoffReceiptWrites'));
  assert.ok(result.forbiddenCounters.includes('mcpToolCalls'));
});

test('CM1760 rejects raw approval readiness fields without echoing values', () => {
  const result = validateVcpMemoryCodexClaudeSustainedWorkflowReceiptChainContract(receiptChainContract({
    receiptChain: {
      rawReceipt: 'RAW_RECEIPT_SHOULD_NOT_ECHO',
      approvalValue: 'APPROVAL_VALUE_SHOULD_NOT_ECHO',
      completeV8: true,
      checkpointReceipt: {
        rawCheckpoint: 'RAW_CHECKPOINT_SHOULD_NOT_ECHO'
      }
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_or_overclaim_fields');
  assert.ok(result.forbiddenFields.includes('receiptChain.rawReceipt'));
  assert.ok(result.forbiddenFields.includes('receiptChain.approvalValue'));
  assert.ok(result.forbiddenFields.includes('receiptChain.completeV8'));
  assert.ok(result.forbiddenFields.includes('receiptChain.checkpointReceipt.rawCheckpoint'));
  assert.equal(serialized.includes('RAW_RECEIPT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('APPROVAL_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_CHECKPOINT_SHOULD_NOT_ECHO'), false);
});

test('CM1760 locks receipt-chain vocabulary and side-effect posture', () => {
  const result = validateVcpMemoryCodexClaudeSustainedWorkflowReceiptChainContract(receiptChainContract());

  assert.ok(ALLOWED_CHAIN_DECISIONS.includes('receipt_accept'));
  assert.ok(ALLOWED_CHAIN_DECISIONS.includes('receipt_deny'));
  assert.ok(ALLOWED_CHAIN_DECISIONS.includes('receipt_stop_l4'));
  assert.ok(ALLOWED_RECEIPT_FIELDS.includes('abort_reason'));
  assert.ok(REQUIRED_RECEIPT_CHAIN_FIELDS.includes('checkpointReceipt'));
  assert.ok(REQUIRED_RECEIPT_CHAIN_FIELDS.includes('handoffReceipt'));
  assert.ok(REQUIRED_RECEIPT_FIELDS.includes('submitted_to_runtime'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('rawReceiptChain'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('approvalValue'));
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.workflowHarnessStarted, false);
  assert.equal(result.workflowStepsExecuted, 0);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.mcpToolCalled, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.checkpointReceiptWritten, false);
  assert.equal(result.handoffReceiptWritten, false);
  assert.equal(result.checkpointMemoryWritten, false);
  assert.equal(result.handoffMemoryWritten, false);
  assert.equal(result.auditReceiptWritten, false);
  assert.equal(result.durableAuditWritten, false);
  assert.equal(result.durableMemoryWritten, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.approvalRequestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimAllowed, false);
});
