'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_STATUSES,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_RECEIPT_FIELDS,
  REQUIRED_RESULT_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryResponseNormalizationAuditReceiptContract
} = require('../src/core/VcpMemoryResponseNormalizationAuditReceiptContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] || 0]));
}

function contract(overrides = {}) {
  const normalizedResult = {
    result_id: 'norm_m11_schema_success_001',
    request_id: 'req_m11_schema_success_001',
    receipt_id: 'rcp_m11_schema_success_001',
    contract_version: 'vcp_memory_result_normalization_v1',
    status: 'success',
    source_runtime: 'vcp_toolbox',
    source_component: 'DailyNoteManager',
    source_capability: 'daily_note_manager.recall',
    profile: 'observe-full',
    confidence: {
      level: 'low',
      basis: 'schema',
      live_runtime_claimed: false
    },
    evidence: {
      evidence_type: 'schema-only',
      evidence_refs: ['docs/VCP_MEMORY_RESULT_NORMALIZATION_CONTRACT.md'],
      raw_payload_included: false,
      raw_payload_required_for_client: false
    },
    scope: {
      client_id_present: true,
      workspace_scope_present: true,
      owner_scope_present: true,
      visibility: 'private',
      cross_client_checked: true
    },
    fallback: {
      used: false,
      reason: 'absent',
      vcp_native_result: true
    },
    output: {
      disclosure_level: 'structured',
      items_count: 1,
      items: [
        {
          item_id: 'safe_item_001',
          item_type: 'memory_summary',
          text: 'low disclosure summary',
          source_component: 'DailyNoteManager',
          evidence_level: 'low',
          raw_source_ref_disclosed: false
        }
      ]
    },
    warnings: [],
    next_action_allowed: 'fixture_schema_contract_only'
  };

  const receipt = {
    receipt_id: normalizedResult.receipt_id,
    timestamp: '2026-07-03T00:00:00.000Z',
    request_id: normalizedResult.request_id,
    contract_version: 'vcp_memory_invocation_contract_v1',
    profile: normalizedResult.profile,
    target_alias: 'approved_vcp_alias',
    target_kind: 'mcp_server',
    client_id_present: true,
    workspace_scope_present: true,
    owner_scope_present: true,
    visibility_present: true,
    operation_type: 'read',
    components_requested_count: 1,
    actions_requested_count: 1,
    decision: 'allow',
    result_status: normalizedResult.status,
    fallback_used: false,
    vcp_native_result: true,
    runtime_calls_used: 0,
    provider_api_calls_used: 0,
    durable_write_count: 0,
    raw_private_payload_disclosed: false,
    secret_value_disclosed: false,
    approval_line_value_disclosed: false,
    public_mcp_expansion: false,
    readiness_claimed: false,
    rollback_or_cleanup_available: 'not_applicable',
    next_action_allowed: normalizedResult.next_action_allowed
  };

  return {
    schemaVersion: 1,
    normalizedResult: {
      ...normalizedResult,
      ...(overrides.normalizedResult || {})
    },
    receipt: {
      ...receipt,
      ...(overrides.receipt || {})
    },
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => !['normalizedResult', 'receipt', 'counters'].includes(key)))
  };
}

test('CM1756 accepts schema-only VCP-native success normalization and receipt shape', () => {
  const result = validateVcpMemoryResponseNormalizationAuditReceiptContract(contract());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, 'fixture_schema_contract_only');
  assert.equal(result.status, 'success');
  assert.equal(result.sourceRuntime, 'vcp_toolbox');
  assert.equal(result.decision, 'allow');
  assert.equal(result.evidenceType, 'schema-only');
  assert.equal(result.lowDisclosure, true);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.runtimeWiringExecuted, false);
});

test('CM1756 accepts fixture-only local fallback success when fallback markers agree', () => {
  const result = validateVcpMemoryResponseNormalizationAuditReceiptContract(contract({
    normalizedResult: {
      result_id: 'norm_m11_fixture_fallback_001',
      request_id: 'req_m11_fixture_fallback_001',
      receipt_id: 'rcp_m11_fixture_fallback_001',
      status: 'fallback_success',
      source_runtime: 'local_fallback',
      source_component: 'local_compatibility',
      source_capability: 'fixture_recall',
      confidence: {
        level: 'low',
        basis: 'fixture',
        live_runtime_claimed: false
      },
      evidence: {
        evidence_type: 'fixture-only',
        evidence_refs: ['docs/LOCAL_FALLBACK_MEMORY_ROLE_CONTRACT.md'],
        raw_payload_included: false,
        raw_payload_required_for_client: false
      },
      fallback: {
        used: true,
        reason: 'vcp_target_unapproved',
        vcp_native_result: false
      }
    },
    receipt: {
      receipt_id: 'rcp_m11_fixture_fallback_001',
      request_id: 'req_m11_fixture_fallback_001',
      decision: 'fallback',
      result_status: 'fallback_success',
      fallback_used: true,
      vcp_native_result: false
    }
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.status, 'fallback_success');
  assert.equal(result.sourceRuntime, 'local_fallback');
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.fallbackExecuted, false);
});

test('CM1756 accepts L4 stop and unknown-target deny shapes without runtime', () => {
  const stopped = validateVcpMemoryResponseNormalizationAuditReceiptContract(contract({
    normalizedResult: {
      status: 'stopped_l4',
      source_runtime: 'none',
      source_component: 'absent',
      source_capability: 'absent',
      confidence: {
        level: 'none',
        basis: 'schema',
        live_runtime_claimed: false
      },
      fallback: {
        used: false,
        reason: 'absent',
        vcp_native_result: false
      },
      output: {
        disclosure_level: 'none',
        items_count: 0,
        items: []
      },
      warnings: ['ERR_L4_HARD_STOP']
    },
    receipt: {
      decision: 'stop',
      result_status: 'stopped_l4',
      fallback_used: false,
      vcp_native_result: false
    }
  }));

  const unknown = validateVcpMemoryResponseNormalizationAuditReceiptContract(contract({
    normalizedResult: {
      status: 'unknown_target',
      source_runtime: 'none',
      source_component: 'absent',
      source_capability: 'absent',
      fallback: {
        used: false,
        reason: 'absent',
        vcp_native_result: false
      }
    },
    receipt: {
      decision: 'deny',
      result_status: 'unknown_target',
      fallback_used: false,
      vcp_native_result: false
    }
  }));

  assert.equal(stopped.accepted, true);
  assert.equal(stopped.decision, 'stop');
  assert.equal(unknown.accepted, true);
  assert.equal(unknown.decision, 'deny');
});

test('CM1756 accepts partial and sanitized error mappings', () => {
  const partial = validateVcpMemoryResponseNormalizationAuditReceiptContract(contract({
    normalizedResult: {
      status: 'partial',
      output: {
        disclosure_level: 'summary',
        items_count: 1,
        items: []
      },
      warnings: ['ERR_PARTIAL_RESULT_BUDGET']
    },
    receipt: {
      decision: 'partial',
      result_status: 'partial'
    }
  }));

  const error = validateVcpMemoryResponseNormalizationAuditReceiptContract(contract({
    normalizedResult: {
      status: 'error',
      source_runtime: 'none',
      source_component: 'absent',
      source_capability: 'absent',
      fallback: {
        used: false,
        reason: 'absent',
        vcp_native_result: false
      },
      output: {
        disclosure_level: 'none',
        items_count: 0,
        items: []
      },
      warnings: ['ERR_SAFE_ERROR']
    },
    receipt: {
      decision: 'stop',
      result_status: 'error',
      fallback_used: false,
      vcp_native_result: false
    }
  }));

  assert.equal(partial.accepted, true);
  assert.equal(partial.decision, 'partial');
  assert.equal(error.accepted, true);
  assert.equal(error.decision, 'stop');
});

test('CM1756 rejects missing scope fields on success-like output', () => {
  const input = contract();
  delete input.normalizedResult.scope.client_id_present;

  const result = validateVcpMemoryResponseNormalizationAuditReceiptContract(input);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'missing_required_fields');
  assert.ok(result.missingFields.includes('normalizedResult.scope.client_id_present'));
  assert.equal(result.memoryRead, false);
});

test('CM1756 rejects fallback/source-runtime conflicts', () => {
  const result = validateVcpMemoryResponseNormalizationAuditReceiptContract(contract({
    normalizedResult: {
      status: 'fallback_success',
      source_runtime: 'local_fallback',
      fallback: {
        used: false,
        reason: 'absent',
        vcp_native_result: true
      }
    },
    receipt: {
      decision: 'fallback',
      result_status: 'fallback_success',
      fallback_used: false,
      vcp_native_result: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_response_normalization_audit_receipt_contract');
  assert.ok(result.invalidFields.includes('normalizedResult.fallback.used'));
  assert.ok(result.invalidFields.includes('normalizedResult.fallback.vcp_native_result'));
});

test('CM1756 rejects raw private debug and approval fields without echoing values', () => {
  const result = validateVcpMemoryResponseNormalizationAuditReceiptContract(contract({
    normalizedResult: {
      debugPayload: 'PRIVATE_DEBUG_PAYLOAD_SHOULD_NOT_ECHO'
    },
    receipt: {
      approvalLineValue: 'APPROVAL_VALUE_SHOULD_NOT_ECHO'
    },
    rawDailyNoteContent: 'RAW_DAILY_NOTE_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_private_debug_or_overclaim_fields');
  assert.ok(result.forbiddenFields.includes('normalizedResult.debugPayload'));
  assert.ok(result.forbiddenFields.includes('receipt.approvalLineValue'));
  assert.ok(result.forbiddenFields.includes('rawDailyNoteContent'));
  assert.equal(serialized.includes('PRIVATE_DEBUG_PAYLOAD_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('APPROVAL_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_DAILY_NOTE_SHOULD_NOT_ECHO'), false);
});

test('CM1756 rejects readiness complete-V8 and live evidence overclaims', () => {
  const overclaim = validateVcpMemoryResponseNormalizationAuditReceiptContract(contract({
    normalizedResult: {
      completeV8: true
    },
    receipt: {
      RC_READY: true
    }
  }));

  const liveClaim = validateVcpMemoryResponseNormalizationAuditReceiptContract(contract({
    normalizedResult: {
      confidence: {
        level: 'high',
        basis: 'exact_approved_live',
        live_runtime_claimed: true
      },
      evidence: {
        evidence_type: 'live-runtime',
        evidence_refs: ['future-runtime-receipt'],
        raw_payload_included: false,
        raw_payload_required_for_client: false
      }
    }
  }));

  assert.equal(overclaim.accepted, false);
  assert.equal(overclaim.reasonCode, 'forbidden_raw_private_debug_or_overclaim_fields');
  assert.ok(overclaim.forbiddenFields.includes('normalizedResult.completeV8'));
  assert.ok(overclaim.forbiddenFields.includes('receipt.RC_READY'));
  assert.equal(liveClaim.accepted, false);
  assert.equal(liveClaim.reasonCode, 'invalid_response_normalization_audit_receipt_contract');
  assert.ok(liveClaim.invalidFields.includes('normalizedResult.confidence.level'));
  assert.ok(liveClaim.invalidFields.includes('normalizedResult.confidence.basis'));
  assert.ok(liveClaim.invalidFields.includes('normalizedResult.confidence.live_runtime_claimed'));
  assert.ok(liveClaim.invalidFields.includes('normalizedResult.evidence.evidence_type'));
});

test('CM1756 rejects positive runtime memory provider approval and readiness counters', () => {
  const result = validateVcpMemoryResponseNormalizationAuditReceiptContract(contract({
    counters: zeroCounters({
      runtimeCalls: 1,
      liveVcpToolBoxCalls: 1,
      fallbackExecutions: 1,
      memoryReads: 1,
      durableAuditWrites: 1,
      providerApiCalls: 1,
      approvalLineOperations: 1,
      approvalRequestSubmissions: 1,
      readinessClaims: 1
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_positive_side_effect_counters');
  assert.ok(result.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(result.forbiddenCounters.includes('liveVcpToolBoxCalls'));
  assert.ok(result.forbiddenCounters.includes('memoryReads'));
  assert.ok(result.forbiddenCounters.includes('durableAuditWrites'));
  assert.ok(result.forbiddenCounters.includes('approvalRequestSubmissions'));
});

test('CM1756 locks M11 vocabulary and helper side-effect posture', () => {
  const result = validateVcpMemoryResponseNormalizationAuditReceiptContract(contract());

  assert.ok(ALLOWED_STATUSES.includes('fallback_success'));
  assert.ok(REQUIRED_RESULT_FIELDS.includes('source_runtime'));
  assert.ok(REQUIRED_RESULT_FIELDS.includes('receipt_id'));
  assert.ok(REQUIRED_RECEIPT_FIELDS.includes('approval_line_value_disclosed'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('rawDailyNoteContent'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('approvalLineValue'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('completeV8'));
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.fallbackExecuted, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableAuditWritten, false);
  assert.equal(result.durableMemoryWritten, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.approvalRequestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimAllowed, false);
});
