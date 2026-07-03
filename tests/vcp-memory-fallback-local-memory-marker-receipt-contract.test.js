'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_DECISIONS,
  ALLOWED_FALLBACK_REASONS,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_MARKER_FIELDS,
  REQUIRED_RECEIPT_FIELDS,
  REQUIRED_REQUEST_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryFallbackLocalMemoryMarkerReceiptContract
} = require('../src/core/VcpMemoryFallbackLocalMemoryMarkerReceiptContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] || 0]));
}

function fallbackContract(overrides = {}) {
  const fallbackRequest = {
    request_id: 'm13_fallback_request_vcp_target_unapproved_001',
    contract_version: 'vcp_memory_fallback_marker_v1',
    evidence_type: 'fixture-only',
    mode: 'fixture-only',
    decision: 'fallback_allowed',
    operation_type: 'fixture_recall_shape',
    client: {
      client_family: 'codex',
      client_id_present: true,
      cross_client_private_requested: false,
      cross_client_private_leakage_allowed: false
    },
    scope: {
      workspace_scope_present: true,
      project_scope_present: true,
      owner_scope_present: true,
      visibility: 'private',
      visibility_expansion_requested: false
    },
    policy: {
      vcp_native_required: false,
      fallback_policy_present: true,
      fallback_reason: 'vcp_target_unapproved',
      private_runtime_read_requested: false,
      real_query_requested: false,
      mutation_requested: false
    },
    next_action_allowed: 'm13_fallback_marker_receipt_fixture_contract'
  };

  const fallbackMarker = {
    memory_source: 'local_fallback',
    contract_version: 'vcp_memory_fallback_marker_v1',
    vcp_native_result: false,
    fallback_used: true,
    fallback_reason: fallbackRequest.policy.fallback_reason,
    scope_checked: true,
    visibility_checked: true,
    result_can_be_mistaken_for_vcp_native: false
  };

  const receipt = {
    receipt_id: 'm13_fallback_receipt_vcp_target_unapproved_001',
    request_id: fallbackRequest.request_id,
    contract_version: 'vcp_memory_fallback_receipt_v1',
    fallback_source: 'local_fallback',
    vcp_native_result: false,
    fallback_used: true,
    fallback_reason: fallbackRequest.policy.fallback_reason,
    client_id_present: true,
    scope_present: true,
    visibility_present: true,
    mutation_attempted: false,
    durable_write_count: 0,
    output_disclosure: 'summary',
    raw_private_payload_disclosed: false,
    secret_value_disclosed: false,
    approval_line_value_disclosed: false,
    public_mcp_expansion: false,
    readiness_claimed: false,
    next_action_allowed: fallbackRequest.next_action_allowed
  };

  return {
    schemaVersion: 1,
    fallbackRequest: {
      ...fallbackRequest,
      ...(overrides.fallbackRequest || {}),
      client: {
        ...fallbackRequest.client,
        ...((overrides.fallbackRequest && overrides.fallbackRequest.client) || {})
      },
      scope: {
        ...fallbackRequest.scope,
        ...((overrides.fallbackRequest && overrides.fallbackRequest.scope) || {})
      },
      policy: {
        ...fallbackRequest.policy,
        ...((overrides.fallbackRequest && overrides.fallbackRequest.policy) || {})
      }
    },
    fallbackMarker: {
      ...fallbackMarker,
      ...(overrides.fallbackMarker || {})
    },
    receipt: {
      ...receipt,
      ...(overrides.receipt || {})
    },
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => !['fallbackRequest', 'fallbackMarker', 'receipt', 'counters'].includes(key)))
  };
}

test('CM1765 accepts VCP target unapproved local fallback marker receipt fixture', () => {
  const result = validateVcpMemoryFallbackLocalMemoryMarkerReceiptContract(fallbackContract());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, 'fixture_fallback_marker_receipt_contract_only');
  assert.equal(result.decision, 'fallback_allowed');
  assert.equal(result.clientFamily, 'codex');
  assert.equal(result.visibility, 'private');
  assert.equal(result.fallbackReason, 'vcp_target_unapproved');
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.localFallbackExecuted, false);
  assert.equal(result.privateRuntimeRead, false);
  assert.equal(result.memoryRead, false);
});

test('CM1765 accepts test or dry-run local fallback marker with shared visibility', () => {
  const result = validateVcpMemoryFallbackLocalMemoryMarkerReceiptContract(fallbackContract({
    fallbackRequest: {
      request_id: 'm13_fallback_request_dry_run_shared_001',
      client: {
        client_family: 'shared'
      },
      scope: {
        visibility: 'shared'
      },
      policy: {
        fallback_reason: 'test_or_dry_run'
      }
    },
    fallbackMarker: {
      fallback_reason: 'test_or_dry_run'
    },
    receipt: {
      receipt_id: 'm13_fallback_receipt_dry_run_shared_001',
      request_id: 'm13_fallback_request_dry_run_shared_001',
      fallback_reason: 'test_or_dry_run'
    }
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.clientFamily, 'shared');
  assert.equal(result.visibility, 'shared');
  assert.equal(result.fallbackReason, 'test_or_dry_run');
});

test('CM1765 accepts VCP-native-required request as denial without fallback use', () => {
  const result = validateVcpMemoryFallbackLocalMemoryMarkerReceiptContract(fallbackContract({
    fallbackRequest: {
      request_id: 'm13_fallback_request_vcp_required_deny_001',
      decision: 'deny',
      policy: {
        vcp_native_required: true,
        fallback_policy_present: false,
        fallback_reason: 'none'
      }
    },
    fallbackMarker: {
      fallback_used: false,
      fallback_reason: 'none',
      scope_checked: true,
      visibility_checked: true
    },
    receipt: {
      receipt_id: 'm13_fallback_receipt_vcp_required_deny_001',
      request_id: 'm13_fallback_request_vcp_required_deny_001',
      fallback_used: false,
      fallback_reason: 'none',
      output_disclosure: 'none'
    }
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'deny');
  assert.equal(result.fallbackUsed, false);
  assert.equal(result.localFallbackExecuted, false);
});

test('CM1765 accepts private runtime read request as stopped L4 without execution', () => {
  const result = validateVcpMemoryFallbackLocalMemoryMarkerReceiptContract(fallbackContract({
    fallbackRequest: {
      request_id: 'm13_fallback_request_private_read_stop_001',
      decision: 'stop_l4',
      policy: {
        fallback_policy_present: false,
        fallback_reason: 'none',
        private_runtime_read_requested: true
      }
    },
    fallbackMarker: {
      fallback_used: false,
      fallback_reason: 'none',
      scope_checked: true,
      visibility_checked: true
    },
    receipt: {
      receipt_id: 'm13_fallback_receipt_private_read_stop_001',
      request_id: 'm13_fallback_request_private_read_stop_001',
      fallback_used: false,
      fallback_reason: 'none',
      output_disclosure: 'none'
    }
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'stop_l4');
  assert.equal(result.privateRuntimeRead, false);
  assert.equal(result.localFallbackExecuted, false);
});

test('CM1765 rejects fallback allowed when client or scope is missing', () => {
  const result = validateVcpMemoryFallbackLocalMemoryMarkerReceiptContract(fallbackContract({
    fallbackRequest: {
      client: {
        client_id_present: false
      },
      scope: {
        workspace_scope_present: false
      }
    },
    receipt: {
      client_id_present: false,
      scope_present: false
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_fallback_marker_receipt_contract');
  assert.ok(result.invalidFields.includes('fallbackRequest.client.client_id_present'));
  assert.ok(result.invalidFields.includes('fallbackRequest.scope'));
});

test('CM1765 rejects fallback allowed when marker can look VCP-native', () => {
  const result = validateVcpMemoryFallbackLocalMemoryMarkerReceiptContract(fallbackContract({
    fallbackMarker: {
      vcp_native_result: true,
      result_can_be_mistaken_for_vcp_native: true
    },
    receipt: {
      vcp_native_result: true
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_fallback_marker_receipt_contract');
  assert.ok(result.invalidFields.includes('fallbackMarker.vcp_native_result'));
  assert.ok(result.invalidFields.includes('fallbackMarker.result_can_be_mistaken_for_vcp_native'));
  assert.ok(result.invalidFields.includes('receipt.vcp_native_result'));
});

test('CM1765 rejects runtime plans and positive side-effect counters', () => {
  const result = validateVcpMemoryFallbackLocalMemoryMarkerReceiptContract(fallbackContract({
    fallbackRequest: {
      policy: {
        private_runtime_read_requested: true,
        real_query_requested: true,
        mutation_requested: true
      }
    },
    counters: zeroCounters({
      fallbackExecutions: 1,
      privateRuntimeReads: 1,
      realQueries: 1,
      mcpToolCalls: 1,
      memoryReads: 1,
      memoryWrites: 1,
      durableAuditWrites: 1
    })
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_positive_side_effect_counters');
  assert.ok(result.forbiddenCounters.includes('fallbackExecutions'));
  assert.ok(result.forbiddenCounters.includes('privateRuntimeReads'));
  assert.ok(result.forbiddenCounters.includes('realQueries'));
  assert.ok(result.forbiddenCounters.includes('mcpToolCalls'));
});

test('CM1765 rejects missing zero side-effect counter fields', () => {
  const fixture = fallbackContract();
  assert.equal(fixture.counters.memoryReads, 0);
  delete fixture.counters.memoryReads;

  const result = validateVcpMemoryFallbackLocalMemoryMarkerReceiptContract(fixture);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'missing_required_fields');
  assert.ok(result.missingFields.includes('counters.memoryReads'));
  assert.equal(result.privateRuntimeRead, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1765 rejects raw secret approval and readiness fields without echoing values', () => {
  const result = validateVcpMemoryFallbackLocalMemoryMarkerReceiptContract(fallbackContract({
    fallbackRequest: {
      debugPayload: 'PRIVATE_FALLBACK_DEBUG_SHOULD_NOT_ECHO',
      completeV8: true
    },
    fallbackMarker: {
      secret: 'SECRET_VALUE_SHOULD_NOT_ECHO'
    },
    receipt: {
      approvalLineValue: 'APPROVAL_VALUE_SHOULD_NOT_ECHO',
      RC_READY: true
    },
    rawDailyNoteContent: 'RAW_DAILY_NOTE_SHOULD_NOT_ECHO'
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_or_overclaim_fields');
  assert.ok(result.forbiddenFields.includes('fallbackRequest.debugPayload'));
  assert.ok(result.forbiddenFields.includes('fallbackRequest.completeV8'));
  assert.ok(result.forbiddenFields.includes('fallbackMarker.secret'));
  assert.ok(result.forbiddenFields.includes('receipt.approvalLineValue'));
  assert.ok(result.forbiddenFields.includes('receipt.RC_READY'));
  assert.ok(result.forbiddenFields.includes('rawDailyNoteContent'));
  assert.equal(serialized.includes('PRIVATE_FALLBACK_DEBUG_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('APPROVAL_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_DAILY_NOTE_SHOULD_NOT_ECHO'), false);
});

test('CM1765 locks fallback marker receipt vocabulary and side-effect posture', () => {
  const result = validateVcpMemoryFallbackLocalMemoryMarkerReceiptContract(fallbackContract());

  assert.ok(ALLOWED_DECISIONS.includes('fallback_allowed'));
  assert.ok(ALLOWED_DECISIONS.includes('stop_l4'));
  assert.ok(ALLOWED_FALLBACK_REASONS.includes('test_or_dry_run'));
  assert.ok(REQUIRED_REQUEST_FIELDS.includes('policy'));
  assert.ok(REQUIRED_MARKER_FIELDS.includes('memory_source'));
  assert.ok(REQUIRED_RECEIPT_FIELDS.includes('vcp_native_result'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('rawDailyNoteContent'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('approvalLineValue'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('completeV8'));
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.localFallbackExecuted, false);
  assert.equal(result.privateRuntimeRead, false);
  assert.equal(result.realQueryExecuted, false);
  assert.equal(result.mcpToolCalled, false);
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
