'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_DECISIONS,
  ALLOWED_NEXT_ACTIONS,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_EXACT_INPUT_FIELDS,
  REQUIRED_GAP_CLOSURE_FIELDS,
  REQUIRED_SOURCE_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryExactLiveRuntimeApprovalRequestAssemblyPreflightContract
} = require('../src/core/VcpMemoryExactLiveRuntimeApprovalRequestAssemblyPreflightContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] ?? 0]));
}

function assemblyPreflight(overrides = {}) {
  const packet = {
    preflight_id: 'cm1875_fixture_exact_live_runtime_approval_request_assembly_preflight_001',
    contract_version: 'vcp_memory_exact_live_runtime_approval_request_assembly_preflight_v1',
    evidence_type: 'fixture-only',
    profile: 'exact-live-runtime-approval-request-assembly',
    non_authorizing: true,
    assembly_preflight_only: true
  };

  const sources = Object.fromEntries(REQUIRED_SOURCE_FIELDS.map(field => [field, true]));

  const gapClosure = {
    gap_classification_guard_present: true,
    local_gap_fixture_contract_slice_closed: true,
    missing_exact_fields_declared: true,
    request_assembly_preflight_may_start: true,
    request_assembly_allowed: false
  };

  const exactInputs = Object.fromEntries(REQUIRED_EXACT_INPUT_FIELDS.map(field => [field, false]));
  const authorization = Object.fromEntries(
    REQUIRED_AUTHORIZATION_FIELDS.map(field => [field, false])
  );

  const output = {
    disclosure_level: 'field_gap_and_assembly_blockers_only',
    raw_private_output_allowed: false,
    concrete_values_disclosed: false,
    assembled_request_disclosed: false,
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
    sources: {
      ...sources,
      ...(overrides.sources || {})
    },
    gapClosure: {
      ...gapClosure,
      ...(overrides.gapClosure || {})
    },
    exactInputs: {
      ...exactInputs,
      ...(overrides.exactInputs || {})
    },
    authorization: {
      ...authorization,
      ...(overrides.authorization || {})
    },
    output: {
      ...output,
      ...(overrides.output || {})
    },
    expectedDecision:
      overrides.expectedDecision || 'assembly_preflight_blocked_missing_exact_values_or_authority',
    nextActionAllowed: overrides.nextActionAllowed || 'cm1875_assembly_preflight_fixture_contract',
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => ![
      'packet',
      'sources',
      'gapClosure',
      'exactInputs',
      'authorization',
      'output',
      'expectedDecision',
      'nextActionAllowed',
      'counters'
    ].includes(key)))
  };
}

test('CM1875 accepts exact live runtime approval request assembly preflight as blocked fixture only', () => {
  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestAssemblyPreflightContract(
    assemblyPreflight()
  );

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, 'fixture_exact_live_runtime_approval_request_assembly_preflight_only');
  assert.equal(result.decision, 'assembly_preflight_blocked_missing_exact_values_or_authority');
  assert.equal(result.assemblyPreflightBlocked, true);
  assert.equal(result.requestAssemblyAllowed, false);
  assert.equal(result.liveValuesBound, false);
  assert.equal(result.assembledRequestGenerated, false);
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

test('CM1875 reports incomplete when source chain or gap closeout evidence is absent', () => {
  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestAssemblyPreflightContract(
    assemblyPreflight({
      sources: {
        cm1874_gap_fixture_closeout_present: false,
        validation_cmv1977_present: false,
        gap_fixture_slice_closed: false
      },
      gapClosure: {
        local_gap_fixture_contract_slice_closed: false,
        missing_exact_fields_declared: false,
        request_assembly_preflight_may_start: false
      },
      expectedDecision: 'assembly_preflight_incomplete'
    })
  );

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'assembly_preflight_incomplete');
  assert.equal(result.assemblyPreflightBlocked, false);
  assert.equal(result.requestAssemblyAllowed, false);
  assert.equal(result.assembledRequestGenerated, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1875 stops exact value binding request assembly approval runtime memory and readiness as L4', () => {
  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestAssemblyPreflightContract(
    assemblyPreflight({
      gapClosure: Object.fromEntries(REQUIRED_GAP_CLOSURE_FIELDS.map(field => [field, true])),
      exactInputs: Object.fromEntries(REQUIRED_EXACT_INPUT_FIELDS.map(field => [field, true])),
      authorization: Object.fromEntries(REQUIRED_AUTHORIZATION_FIELDS.map(field => [field, true])),
      output: {
        raw_private_output_allowed: true,
        concrete_values_disclosed: true,
        assembled_request_disclosed: true,
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
  assert.equal(result.assemblyPreflightBlocked, false);
  assert.equal(result.requestAssemblyAllowed, false);
  assert.equal(result.liveValuesBound, false);
  assert.equal(result.assembledRequestGenerated, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableWritePerformed, false);
  assert.equal(result.readinessClaimAllowed, false);
});

test('CM1875 rejects raw secret request approval runtime exact values without echoing values', () => {
  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestAssemblyPreflightContract(
    assemblyPreflight({
      packet: {
        targetValue: 'SYNTHETIC_TARGET_SHOULD_NOT_ECHO'
      },
      exactInputs: {
        exactTarget: 'SYNTHETIC_EXACT_TARGET_SHOULD_NOT_ECHO'
      },
      authorization: {
        approvalLineValue: 'SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'
      },
      output: {
        providerPayload: 'SYNTHETIC_PROVIDER_SHOULD_NOT_ECHO'
      },
      assembledRequest: 'SYNTHETIC_ASSEMBLED_REQUEST_SHOULD_NOT_ECHO',
      requestBody: 'SYNTHETIC_REQUEST_BODY_SHOULD_NOT_ECHO',
      runtimeCommand: 'SYNTHETIC_RUNTIME_COMMAND_SHOULD_NOT_ECHO',
      RC_READY: 'SYNTHETIC_RC_READY_SHOULD_NOT_ECHO'
    })
  );
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_exact_value_request_or_overclaim_fields');
  assert.ok(result.forbiddenFields.includes('packet.targetValue'));
  assert.ok(result.forbiddenFields.includes('exactInputs.exactTarget'));
  assert.ok(result.forbiddenFields.includes('authorization.approvalLineValue'));
  assert.ok(result.forbiddenFields.includes('output.providerPayload'));
  assert.ok(result.forbiddenFields.includes('assembledRequest'));
  assert.ok(result.forbiddenFields.includes('requestBody'));
  assert.ok(result.forbiddenFields.includes('runtimeCommand'));
  assert.ok(result.forbiddenFields.includes('RC_READY'));
  assert.equal(serialized.includes('SYNTHETIC_TARGET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXACT_TARGET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_PROVIDER_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_ASSEMBLED_REQUEST_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_REQUEST_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RUNTIME_COMMAND_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RC_READY_SHOULD_NOT_ECHO'), false);
});

test('CM1875 rejects unexpected fields without echoing submitted values', () => {
  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestAssemblyPreflightContract(
    assemblyPreflight({
      extraRoot: 'SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO',
      exactInputs: {
        extraExactInput: 'SYNTHETIC_EXTRA_EXACT_SHOULD_NOT_ECHO'
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
  assert.ok(result.unexpectedFields.includes('exactInputs.extraExactInput'));
  assert.ok(result.unexpectedFields.includes('authorization.extraAuthorization'));
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_EXACT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_AUTH_SHOULD_NOT_ECHO'), false);
});

test('CM1875 rejects missing positive and malformed zero side-effect counters', () => {
  const missingFixture = assemblyPreflight();
  delete missingFixture.counters.providerApiCalls;

  const missingResult = validateVcpMemoryExactLiveRuntimeApprovalRequestAssemblyPreflightContract(
    missingFixture
  );
  assert.equal(missingResult.accepted, false);
  assert.equal(missingResult.reasonCode, 'missing_required_fields');
  assert.ok(missingResult.missingFields.includes('counters.providerApiCalls'));

  const positiveResult = validateVcpMemoryExactLiveRuntimeApprovalRequestAssemblyPreflightContract(
    assemblyPreflight({
      counters: {
        requestAssemblies: 1,
        assembledRequests: 1,
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
  assert.ok(positiveResult.forbiddenCounters.includes('assembledRequests'));
  assert.ok(positiveResult.forbiddenCounters.includes('requestBodiesGenerated'));
  assert.ok(positiveResult.forbiddenCounters.includes('requestSubmissions'));
  assert.ok(positiveResult.forbiddenCounters.includes('approvalLineOperations'));
  assert.ok(positiveResult.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(positiveResult.forbiddenCounters.includes('memoryWrites'));
  assert.ok(positiveResult.forbiddenCounters.includes('durableWrites'));
  assert.ok(positiveResult.forbiddenCounters.includes('releaseDeployCutoverPushActions'));

  const malformedResult = validateVcpMemoryExactLiveRuntimeApprovalRequestAssemblyPreflightContract(
    assemblyPreflight({
      counters: {
        providerApiCalls: '0'
      }
    })
  );
  assert.equal(malformedResult.accepted, false);
  assert.equal(malformedResult.reasonCode, 'invalid_exact_live_runtime_approval_request_assembly_preflight_contract');
  assert.ok(malformedResult.invalidFields.includes('counters.providerApiCalls'));
});

test('CM1875 rejects invalid packet fields decision mismatch and unsafe decision echo', () => {
  const unsafeExpectedDecision = 'PRIVATE_DECISION_SHOULD_NOT_ECHO';
  const invalid = validateVcpMemoryExactLiveRuntimeApprovalRequestAssemblyPreflightContract(
    assemblyPreflight({
      packet: {
        preflight_id: 'unsafe_preflight_id',
        profile: 'exact-live-runtime',
        non_authorizing: false
      },
      output: {
        disclosure_level: 'raw'
      },
      expectedDecision: unsafeExpectedDecision,
      nextActionAllowed: 'generate_request_body'
    })
  );
  const serializedInvalid = JSON.stringify(invalid);

  assert.equal(invalid.accepted, false);
  assert.equal(invalid.reasonCode, 'invalid_exact_live_runtime_approval_request_assembly_preflight_contract');
  assert.ok(invalid.invalidFields.includes('packet.preflight_id'));
  assert.ok(invalid.invalidFields.includes('packet.profile'));
  assert.ok(invalid.invalidFields.includes('packet.non_authorizing'));
  assert.ok(invalid.invalidFields.includes('output.disclosure_level'));
  assert.ok(invalid.invalidFields.includes('expectedDecision'));
  assert.ok(invalid.invalidFields.includes('nextActionAllowed'));
  assert.equal(serializedInvalid.includes(unsafeExpectedDecision), false);

  const mismatch = validateVcpMemoryExactLiveRuntimeApprovalRequestAssemblyPreflightContract(
    assemblyPreflight({
      gapClosure: {
        request_assembly_allowed: true
      },
      expectedDecision: 'assembly_preflight_blocked_missing_exact_values_or_authority'
    })
  );

  assert.equal(mismatch.accepted, false);
  assert.equal(mismatch.reasonCode, 'decision_mismatch');
  assert.equal(mismatch.computedDecision, 'stop_l4');
  assert.ok(mismatch.invalidFields.includes('expectedDecision'));
});

test('CM1875 locks assembly preflight vocabulary and no-side-effect posture', () => {
  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestAssemblyPreflightContract(
    assemblyPreflight()
  );

  assert.ok(ALLOWED_DECISIONS.includes('assembly_preflight_blocked_missing_exact_values_or_authority'));
  assert.ok(ALLOWED_DECISIONS.includes('assembly_preflight_incomplete'));
  assert.ok(ALLOWED_DECISIONS.includes('stop_l4'));
  assert.ok(ALLOWED_NEXT_ACTIONS.includes('cm1875_assembly_preflight_fixture_contract'));
  assert.ok(REQUIRED_SOURCE_FIELDS.includes('cm1874_gap_fixture_closeout_present'));
  assert.ok(REQUIRED_GAP_CLOSURE_FIELDS.includes('request_assembly_preflight_may_start'));
  assert.ok(REQUIRED_EXACT_INPUT_FIELDS.includes('target_alias_bound'));
  assert.ok(REQUIRED_EXACT_INPUT_FIELDS.includes('live_values_bound'));
  assert.ok(REQUIRED_AUTHORIZATION_FIELDS.includes('request_assembly_authorized'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('assembledRequests'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('liveVcpToolBoxCalls'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('assembledRequest'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('approvalLineValue'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('runtimeCommand'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('completeV8'));
  assert.equal(result.requestAssemblyAllowed, false);
  assert.equal(result.liveValuesBound, false);
  assert.equal(result.assembledRequestGenerated, false);
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
