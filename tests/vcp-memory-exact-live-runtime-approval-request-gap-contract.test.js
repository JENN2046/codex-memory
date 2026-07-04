'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_DECISIONS,
  ALLOWED_NEXT_ACTIONS,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_EVIDENCE_FIELDS,
  REQUIRED_GAP_INVENTORY_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryExactLiveRuntimeApprovalRequestGapContract
} = require('../src/core/VcpMemoryExactLiveRuntimeApprovalRequestGapContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] ?? 0]));
}

function gapContract(overrides = {}) {
  const packet = {
    gap_id: 'cm1873_fixture_exact_live_runtime_approval_request_gap_001',
    contract_version: 'vcp_memory_exact_live_runtime_approval_request_gap_v1',
    evidence_type: 'fixture-only',
    profile: 'exact-live-runtime-approval-request',
    non_authorizing: true,
    gap_fixture_only: true
  };

  const evidence = Object.fromEntries(REQUIRED_EVIDENCE_FIELDS.map(field => [field, true]));

  const gapInventory = {
    field_gap_inventory_present: true,
    target_alias_missing: true,
    transport_family_missing: true,
    client_workspace_owner_aliases_missing: true,
    operation_family_missing: true,
    runtime_budget_missing: true,
    output_policy_missing: true,
    log_stdout_stderr_policy_missing: true,
    memory_policy_missing: true,
    cleanup_policy_missing: true,
    receipt_path_class_missing: true,
    validation_command_list_missing: true,
    request_body_authority_missing: true,
    approval_line_authority_missing: true,
    runtime_execution_authority_missing: true,
    request_assembly_ready: false,
    approval_request_ready: false,
    live_values_present: false,
    missing_exact_fields_declared: true
  };

  const authorization = Object.fromEntries(
    REQUIRED_AUTHORIZATION_FIELDS.map(field => [field, false])
  );

  const output = {
    disclosure_level: 'field_gap_classifications_only',
    raw_private_output_allowed: false,
    concrete_values_disclosed: false,
    request_body_disclosed: false,
    approval_line_value_disclosed: false,
    runtime_command_disclosed: false,
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
    gapInventory: {
      ...gapInventory,
      ...(overrides.gapInventory || {})
    },
    authorization: {
      ...authorization,
      ...(overrides.authorization || {})
    },
    output: {
      ...output,
      ...(overrides.output || {})
    },
    expectedDecision: overrides.expectedDecision || 'approval_request_gap_inventory_accepted_blocked',
    nextActionAllowed: overrides.nextActionAllowed || 'cm1873_gap_fixture_contract',
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => ![
      'packet',
      'evidence',
      'gapInventory',
      'authorization',
      'output',
      'expectedDecision',
      'nextActionAllowed',
      'counters'
    ].includes(key)))
  };
}

test('CM1873 accepts exact live runtime approval request gap inventory as blocked fixture only', () => {
  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestGapContract(gapContract());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, 'fixture_exact_live_runtime_approval_request_gap_only');
  assert.equal(result.decision, 'approval_request_gap_inventory_accepted_blocked');
  assert.equal(result.approvalRequestGapInventoryAccepted, true);
  assert.equal(result.requestAssemblyReady, false);
  assert.equal(result.approvalRequestReady, false);
  assert.equal(result.liveValuesPresent, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.requestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.mcpMemoryToolCalled, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableWritePerformed, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.configStartupWatchdogChanged, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.releaseDeployCutoverPushPerformed, false);
  assert.equal(result.readinessClaimAllowed, false);
});

test('CM1873 reports incomplete when evidence or missing classifications are absent', () => {
  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestGapContract(
    gapContract({
      evidence: {
        cm1872_field_gap_preflight_present: false,
        field_gap_inventory_source_reviewed: false
      },
      gapInventory: {
        field_gap_inventory_present: false,
        target_alias_missing: false,
        request_body_authority_missing: false,
        missing_exact_fields_declared: false
      },
      expectedDecision: 'approval_request_gap_inventory_incomplete'
    })
  );

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'approval_request_gap_inventory_incomplete');
  assert.equal(result.approvalRequestGapInventoryAccepted, false);
  assert.equal(result.requestAssemblyReady, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1873 stops request assembly approval runtime memory mutation and readiness as L4', () => {
  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestGapContract(
    gapContract({
      gapInventory: Object.fromEntries(REQUIRED_GAP_INVENTORY_FIELDS.map(field => [field, true])),
      authorization: Object.fromEntries(REQUIRED_AUTHORIZATION_FIELDS.map(field => [field, true])),
      output: {
        raw_private_output_allowed: true,
        concrete_values_disclosed: true,
        request_body_disclosed: true,
        approval_line_value_disclosed: true,
        runtime_command_disclosed: true,
        readiness_claim_allowed: true
      },
      expectedDecision: 'stop_l4'
    })
  );

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'stop_l4');
  assert.equal(result.approvalRequestGapInventoryAccepted, false);
  assert.equal(result.requestAssemblyReady, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableWritePerformed, false);
  assert.equal(result.readinessClaimAllowed, false);
});

test('CM1873 rejects concrete raw secret request approval runtime and readiness fields without echoing values', () => {
  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestGapContract(
    gapContract({
      packet: {
        targetValue: 'SYNTHETIC_TARGET_SHOULD_NOT_ECHO'
      },
      gapInventory: {
        runtimeTarget: 'SYNTHETIC_RUNTIME_TARGET_SHOULD_NOT_ECHO'
      },
      authorization: {
        approvalLineValue: 'SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'
      },
      output: {
        providerPayload: 'SYNTHETIC_PROVIDER_SHOULD_NOT_ECHO'
      },
      requestBody: 'SYNTHETIC_REQUEST_BODY_SHOULD_NOT_ECHO',
      runtimeCommand: 'SYNTHETIC_RUNTIME_COMMAND_SHOULD_NOT_ECHO',
      RC_READY: 'SYNTHETIC_RC_READY_SHOULD_NOT_ECHO'
    })
  );
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_exact_value_or_overclaim_fields');
  assert.ok(result.forbiddenFields.includes('packet.targetValue'));
  assert.ok(result.forbiddenFields.includes('gapInventory.runtimeTarget'));
  assert.ok(result.forbiddenFields.includes('authorization.approvalLineValue'));
  assert.ok(result.forbiddenFields.includes('output.providerPayload'));
  assert.ok(result.forbiddenFields.includes('requestBody'));
  assert.ok(result.forbiddenFields.includes('runtimeCommand'));
  assert.ok(result.forbiddenFields.includes('RC_READY'));
  assert.equal(serialized.includes('SYNTHETIC_TARGET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RUNTIME_TARGET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_PROVIDER_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_REQUEST_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RUNTIME_COMMAND_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RC_READY_SHOULD_NOT_ECHO'), false);
});

test('CM1873 rejects unexpected fields without echoing submitted values', () => {
  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestGapContract(
    gapContract({
      extraRoot: 'SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO',
      gapInventory: {
        extraGap: 'SYNTHETIC_EXTRA_GAP_SHOULD_NOT_ECHO'
      },
      authorization: {
        extraAuthorization: 'SYNTHETIC_EXTRA_AUTH_SHOULD_NOT_ECHO'
      }
    })
  );
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'unexpected_fields');
  assert.ok(result.unexpectedFields.includes('extraRoot'));
  assert.ok(result.unexpectedFields.includes('gapInventory.extraGap'));
  assert.ok(result.unexpectedFields.includes('authorization.extraAuthorization'));
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_GAP_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_AUTH_SHOULD_NOT_ECHO'), false);
});

test('CM1873 rejects missing positive and malformed zero side-effect counters', () => {
  const missingFixture = gapContract();
  delete missingFixture.counters.providerApiCalls;

  const missingResult = validateVcpMemoryExactLiveRuntimeApprovalRequestGapContract(missingFixture);
  assert.equal(missingResult.accepted, false);
  assert.equal(missingResult.reasonCode, 'missing_required_fields');
  assert.ok(missingResult.missingFields.includes('counters.providerApiCalls'));

  const positiveResult = validateVcpMemoryExactLiveRuntimeApprovalRequestGapContract(
    gapContract({
      counters: {
        requestAssemblies: 1,
        requestBodiesGenerated: 1,
        requestSubmissions: 1,
        approvalLineOperations: 1,
        runtimeCalls: 1,
        memoryWrites: 1,
        durableWrites: 1,
        releaseDeployCutoverPushActions: 1
      }
    })
  );
  assert.equal(positiveResult.accepted, false);
  assert.equal(positiveResult.reasonCode, 'forbidden_positive_side_effect_counters');
  assert.ok(positiveResult.forbiddenCounters.includes('requestAssemblies'));
  assert.ok(positiveResult.forbiddenCounters.includes('requestBodiesGenerated'));
  assert.ok(positiveResult.forbiddenCounters.includes('requestSubmissions'));
  assert.ok(positiveResult.forbiddenCounters.includes('approvalLineOperations'));
  assert.ok(positiveResult.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(positiveResult.forbiddenCounters.includes('memoryWrites'));
  assert.ok(positiveResult.forbiddenCounters.includes('durableWrites'));
  assert.ok(positiveResult.forbiddenCounters.includes('releaseDeployCutoverPushActions'));

  const malformedResult = validateVcpMemoryExactLiveRuntimeApprovalRequestGapContract(
    gapContract({
      counters: {
        providerApiCalls: '0'
      }
    })
  );
  assert.equal(malformedResult.accepted, false);
  assert.equal(malformedResult.reasonCode, 'invalid_exact_live_runtime_approval_request_gap_contract');
  assert.ok(malformedResult.invalidFields.includes('counters.providerApiCalls'));
});

test('CM1873 rejects invalid packet fields decision mismatch and unsafe decision echo', () => {
  const unsafeExpectedDecision = 'PRIVATE_DECISION_SHOULD_NOT_ECHO';
  const invalid = validateVcpMemoryExactLiveRuntimeApprovalRequestGapContract(
    gapContract({
      packet: {
        gap_id: 'unsafe_gap_id',
        profile: 'exact-live-runtime',
        non_authorizing: false
      },
      output: {
        disclosure_level: 'raw'
      },
      expectedDecision: unsafeExpectedDecision,
      nextActionAllowed: 'submit_approval_request'
    })
  );
  const serializedInvalid = JSON.stringify(invalid);

  assert.equal(invalid.accepted, false);
  assert.equal(invalid.reasonCode, 'invalid_exact_live_runtime_approval_request_gap_contract');
  assert.ok(invalid.invalidFields.includes('packet.gap_id'));
  assert.ok(invalid.invalidFields.includes('packet.profile'));
  assert.ok(invalid.invalidFields.includes('packet.non_authorizing'));
  assert.ok(invalid.invalidFields.includes('output.disclosure_level'));
  assert.ok(invalid.invalidFields.includes('expectedDecision'));
  assert.ok(invalid.invalidFields.includes('nextActionAllowed'));
  assert.equal(serializedInvalid.includes(unsafeExpectedDecision), false);

  const mismatch = validateVcpMemoryExactLiveRuntimeApprovalRequestGapContract(
    gapContract({
      gapInventory: {
        request_assembly_ready: true
      },
      expectedDecision: 'approval_request_gap_inventory_accepted_blocked'
    })
  );

  assert.equal(mismatch.accepted, false);
  assert.equal(mismatch.reasonCode, 'decision_mismatch');
  assert.equal(mismatch.computedDecision, 'stop_l4');
  assert.ok(mismatch.invalidFields.includes('expectedDecision'));
});

test('CM1873 locks gap vocabulary and no-side-effect posture', () => {
  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestGapContract(gapContract());

  assert.ok(ALLOWED_DECISIONS.includes('approval_request_gap_inventory_accepted_blocked'));
  assert.ok(ALLOWED_DECISIONS.includes('approval_request_gap_inventory_incomplete'));
  assert.ok(ALLOWED_DECISIONS.includes('stop_l4'));
  assert.ok(ALLOWED_NEXT_ACTIONS.includes('cm1873_gap_fixture_contract'));
  assert.ok(REQUIRED_EVIDENCE_FIELDS.includes('cm1872_field_gap_preflight_present'));
  assert.ok(REQUIRED_GAP_INVENTORY_FIELDS.includes('request_body_authority_missing'));
  assert.ok(REQUIRED_GAP_INVENTORY_FIELDS.includes('approval_line_authority_missing'));
  assert.ok(REQUIRED_AUTHORIZATION_FIELDS.includes('runtime_execution_authorized'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('requestBodiesGenerated'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('liveVcpToolBoxCalls'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('approvalLineValue'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('runtimeCommand'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('completeV8'));
  assert.equal(result.requestAssemblyReady, false);
  assert.equal(result.approvalRequestReady, false);
  assert.equal(result.liveValuesPresent, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.requestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.approvalGranted, false);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.mcpMemoryToolCalled, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableWritePerformed, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.configStartupWatchdogChanged, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.releaseDeployCutoverPushPerformed, false);
  assert.equal(result.readinessClaimAllowed, false);
});
