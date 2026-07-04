'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_DECISIONS,
  ALLOWED_NEXT_ACTIONS,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_BOUNDARY_FIELDS,
  REQUIRED_EXACT_INPUT_FIELDS,
  REQUIRED_SOURCE_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryExactLiveRuntimeApprovalRequestPreparationBoundaryContract
} = require('../src/core/VcpMemoryExactLiveRuntimeApprovalRequestPreparationBoundaryContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] ?? 0]));
}

function preparationBoundary(overrides = {}) {
  const packet = {
    boundary_id: 'cm1881_fixture_exact_live_runtime_approval_request_preparation_boundary_001',
    contract_version: 'vcp_memory_exact_live_runtime_approval_request_preparation_boundary_v1',
    evidence_type: 'fixture-only',
    profile: 'exact-live-runtime-approval-request-preparation-boundary',
    non_authorizing: true,
    category_only_boundary: true
  };

  const sources = Object.fromEntries(REQUIRED_SOURCE_FIELDS.map(field => [field, true]));

  const boundary = {
    preparation_phase_names_declared: true,
    required_evidence_categories_declared: true,
    missing_value_classifications_declared: true,
    required_authority_categories_declared: true,
    disclosure_policy_categories_declared: true,
    abort_condition_categories_declared: true,
    validation_evidence_references_declared: true,
    false_zero_counter_policy_declared: true,
    category_only_boundary_allowed: true,
    executable_request_preparation_allowed: false,
    request_packet_creation_allowed: false,
    concrete_values_allowed: false,
    request_assembly_allowed: false
  };

  const exactInputs = Object.fromEntries(REQUIRED_EXACT_INPUT_FIELDS.map(field => [field, false]));
  const authorization = Object.fromEntries(
    REQUIRED_AUTHORIZATION_FIELDS.map(field => [field, false])
  );

  const output = {
    disclosure_level: 'category_boundary_only',
    raw_private_output_allowed: false,
    concrete_values_disclosed: false,
    request_packet_disclosed: false,
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
    boundary: {
      ...boundary,
      ...(overrides.boundary || {})
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
      overrides.expectedDecision || 'preparation_boundary_accepted_category_only_non_authorizing',
    nextActionAllowed: overrides.nextActionAllowed || 'cm1881_preparation_boundary_fixture_contract',
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => ![
      'packet',
      'sources',
      'boundary',
      'exactInputs',
      'authorization',
      'output',
      'expectedDecision',
      'nextActionAllowed',
      'counters'
    ].includes(key)))
  };
}

test('CM1881 accepts exact live runtime approval request preparation boundary as category-only fixture', () => {
  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestPreparationBoundaryContract(
    preparationBoundary()
  );

  assert.equal(result.accepted, true);
  assert.equal(
    result.contractMode,
    'fixture_exact_live_runtime_approval_request_preparation_boundary_only'
  );
  assert.equal(result.decision, 'preparation_boundary_accepted_category_only_non_authorizing');
  assert.equal(result.preparationBoundaryAccepted, true);
  assert.equal(result.nonAuthorizingCategoryBoundaryOnly, true);
  assert.equal(result.executableRequestPreparationAllowed, false);
  assert.equal(result.requestPacketCreationAllowed, false);
  assert.equal(result.concreteValuesAllowed, false);
  assert.equal(result.requestAssemblyAllowed, false);
  assert.equal(result.liveValuesBound, false);
  assert.equal(result.requestPacketCreated, false);
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

test('CM1881 reports incomplete when source chain or preparation boundary evidence is absent', () => {
  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestPreparationBoundaryContract(
    preparationBoundary({
      sources: {
        cm1880_preparation_boundary_review_present: false,
        validation_cmv1983_present: false
      },
      boundary: {
        preparation_phase_names_declared: false,
        required_authority_categories_declared: false,
        abort_condition_categories_declared: false
      },
      expectedDecision: 'preparation_boundary_incomplete'
    })
  );

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'preparation_boundary_incomplete');
  assert.equal(result.preparationBoundaryAccepted, false);
  assert.equal(result.requestPacketCreationAllowed, false);
  assert.equal(result.requestPacketCreated, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1881 stops concrete values request packet preparation runtime memory and readiness as L4', () => {
  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestPreparationBoundaryContract(
    preparationBoundary({
      boundary: Object.fromEntries(REQUIRED_BOUNDARY_FIELDS.map(field => [field, true])),
      exactInputs: Object.fromEntries(REQUIRED_EXACT_INPUT_FIELDS.map(field => [field, true])),
      authorization: Object.fromEntries(REQUIRED_AUTHORIZATION_FIELDS.map(field => [field, true])),
      output: {
        raw_private_output_allowed: true,
        concrete_values_disclosed: true,
        request_packet_disclosed: true,
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
  assert.equal(result.preparationBoundaryAccepted, false);
  assert.equal(result.executableRequestPreparationAllowed, false);
  assert.equal(result.requestPacketCreationAllowed, false);
  assert.equal(result.requestPacketCreated, false);
  assert.equal(result.concreteValuesAllowed, false);
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

test('CM1881 rejects raw secret request approval runtime exact values without echoing values', () => {
  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestPreparationBoundaryContract(
    preparationBoundary({
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
      requestPacket: 'SYNTHETIC_REQUEST_PACKET_SHOULD_NOT_ECHO',
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
  assert.ok(result.forbiddenFields.includes('requestPacket'));
  assert.ok(result.forbiddenFields.includes('requestBody'));
  assert.ok(result.forbiddenFields.includes('runtimeCommand'));
  assert.ok(result.forbiddenFields.includes('RC_READY'));
  assert.equal(serialized.includes('SYNTHETIC_TARGET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXACT_TARGET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_PROVIDER_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_REQUEST_PACKET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_REQUEST_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RUNTIME_COMMAND_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RC_READY_SHOULD_NOT_ECHO'), false);
});

test('CM1881 rejects unexpected fields without echoing submitted values', () => {
  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestPreparationBoundaryContract(
    preparationBoundary({
      extraRoot: 'SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO',
      boundary: {
        extraBoundary: 'SYNTHETIC_EXTRA_BOUNDARY_SHOULD_NOT_ECHO'
      },
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
  assert.ok(result.unexpectedFields.includes('boundary.extraBoundary'));
  assert.ok(result.unexpectedFields.includes('exactInputs.extraExactInput'));
  assert.ok(result.unexpectedFields.includes('authorization.extraAuthorization'));
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_BOUNDARY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_EXACT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_AUTH_SHOULD_NOT_ECHO'), false);
});

test('CM1881 rejects missing positive and malformed zero side-effect counters', () => {
  const missingFixture = preparationBoundary();
  delete missingFixture.counters.providerApiCalls;

  const missingResult = validateVcpMemoryExactLiveRuntimeApprovalRequestPreparationBoundaryContract(
    missingFixture
  );
  assert.equal(missingResult.accepted, false);
  assert.equal(missingResult.reasonCode, 'missing_required_fields');
  assert.ok(missingResult.missingFields.includes('counters.providerApiCalls'));

  const positiveResult = validateVcpMemoryExactLiveRuntimeApprovalRequestPreparationBoundaryContract(
    preparationBoundary({
      counters: {
        memoryWrites: 1,
        requestBodiesGenerated: 1
      }
    })
  );
  assert.equal(positiveResult.accepted, false);
  assert.equal(positiveResult.reasonCode, 'forbidden_positive_side_effect_counters');
  assert.ok(positiveResult.forbiddenCounters.includes('memoryWrites'));
  assert.ok(positiveResult.forbiddenCounters.includes('requestBodiesGenerated'));

  const malformedResult = validateVcpMemoryExactLiveRuntimeApprovalRequestPreparationBoundaryContract(
    preparationBoundary({
      counters: {
        providerApiCalls: '0'
      }
    })
  );
  assert.equal(malformedResult.accepted, false);
  assert.equal(
    malformedResult.reasonCode,
    'invalid_exact_live_runtime_approval_request_preparation_boundary_contract'
  );
  assert.ok(malformedResult.invalidFields.includes('counters.providerApiCalls'));
});

test('CM1881 rejects invalid packet fields decision mismatch and unsafe decision echo', () => {
  const invalidResult = validateVcpMemoryExactLiveRuntimeApprovalRequestPreparationBoundaryContract(
    preparationBoundary({
      packet: {
        boundary_id: 'not-a-valid-boundary-id',
        contract_version: 'wrong',
        category_only_boundary: false
      },
      output: {
        disclosure_level: 'raw'
      },
      expectedDecision: 'preparation_boundary_accepted_category_only_non_authorizing'
    })
  );
  assert.equal(invalidResult.accepted, false);
  assert.equal(
    invalidResult.reasonCode,
    'invalid_exact_live_runtime_approval_request_preparation_boundary_contract'
  );
  assert.ok(invalidResult.invalidFields.includes('packet.boundary_id'));
  assert.ok(invalidResult.invalidFields.includes('packet.contract_version'));
  assert.ok(invalidResult.invalidFields.includes('packet.category_only_boundary'));
  assert.ok(invalidResult.invalidFields.includes('output.disclosure_level'));

  const mismatchResult = validateVcpMemoryExactLiveRuntimeApprovalRequestPreparationBoundaryContract(
    preparationBoundary({
      boundary: {
        preparation_phase_names_declared: false
      },
      expectedDecision: 'preparation_boundary_accepted_category_only_non_authorizing'
    })
  );
  assert.equal(mismatchResult.accepted, false);
  assert.equal(mismatchResult.reasonCode, 'decision_mismatch');
  assert.equal(mismatchResult.computedDecision, 'preparation_boundary_incomplete');

  const unsafeDecisionResult = validateVcpMemoryExactLiveRuntimeApprovalRequestPreparationBoundaryContract(
    preparationBoundary({
      expectedDecision: 'SYNTHETIC_DECISION_SHOULD_NOT_ECHO'
    })
  );
  const serialized = JSON.stringify(unsafeDecisionResult);
  assert.equal(unsafeDecisionResult.accepted, false);
  assert.equal(unsafeDecisionResult.expectedDecision, null);
  assert.equal(serialized.includes('SYNTHETIC_DECISION_SHOULD_NOT_ECHO'), false);
});

test('CM1881 locks preparation boundary vocabulary and no-side-effect posture', () => {
  assert.deepEqual(ALLOWED_DECISIONS, [
    'preparation_boundary_accepted_category_only_non_authorizing',
    'preparation_boundary_incomplete',
    'stop_l4'
  ]);
  assert.deepEqual(ALLOWED_NEXT_ACTIONS, [
    'cm1881_preparation_boundary_fixture_contract',
    'cm1882_preparation_boundary_fixture_closeout_or_approval_request_readiness_review'
  ]);
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('requestPacket'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('requestBody'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('approvalLine'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('runtimeCommand'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('memoryQuery'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('RC_READY'));

  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestPreparationBoundaryContract(
    preparationBoundary()
  );
  assert.equal(result.executableRequestPreparationAllowed, false);
  assert.equal(result.requestPacketCreationAllowed, false);
  assert.equal(result.concreteValuesAllowed, false);
  assert.equal(result.requestAssemblyAllowed, false);
  assert.equal(result.requestPacketCreated, false);
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
