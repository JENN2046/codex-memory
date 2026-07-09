'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_DECISIONS,
  ALLOWED_NEXT_ACTIONS,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_BOUNDARY_FIELDS,
  REQUIRED_FIELD_FAMILY_FIELDS,
  REQUIRED_SOURCE_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryExactLiveRuntimeAuthorizationRequestBoundaryContract
} = require('../src/core/VcpMemoryExactLiveRuntimeAuthorizationRequestBoundaryContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] ?? 0]));
}

function authorizationRequestBoundary(overrides = {}) {
  const packet = {
    boundary_id: 'cm1899_fixture_exact_live_runtime_authorization_request_boundary_001',
    contract_version: 'vcp_memory_exact_live_runtime_authorization_request_boundary_v1',
    evidence_type: 'fixture-only',
    profile: 'exact-live-runtime-authorization-request-boundary',
    non_authorizing: true,
    category_only_boundary: true,
    authorization_request_not_created: true,
    request_packet_not_created: true
  };

  const sources = Object.fromEntries(REQUIRED_SOURCE_FIELDS.map(field => [field, true]));

  const boundary = {
    authorization_request_boundary_preflight_reviewed: true,
    authorization_request_boundary_category_only: true,
    authorization_request_boundary_non_authorizing: true,
    source_evidence_references_declared: true,
    field_family_classes_declared: true,
    authority_family_classes_declared: true,
    stop_condition_categories_declared: true,
    validation_expectations_declared: true,
    output_posture_declared: true,
    receipt_posture_declared: true,
    approval_line_forbidden_declared: true,
    request_body_forbidden_declared: true,
    request_packet_artifact_forbidden_declared: true,
    runtime_forbidden_declared: true,
    future_fixture_contract_allowed: true,
    authorization_gate_opened: false,
    authorization_requested: false,
    approval_granted: false,
    dedicated_exact_approval_text_present: false,
    approval_request_packet_created: false,
    approval_request_packet_ready: false,
    approval_request_submitted: false,
    authorization_request_ready: false,
    authorization_request_submitted: false,
    approval_packet_ready: false,
    approval_request_ready: false,
    approval_line_present: false,
    approval_line_generated: false,
    approval_line_exposed: false,
    approval_line_submitted: false,
    request_packet_readiness_may_open: false,
    request_packet_readiness_blocked: true,
    exact_request_packet_ready: false,
    exact_request_packet_present: false,
    request_packet_created: false,
    request_packet_rendered: false,
    request_packet_stored: false,
    request_packet_submitted: false,
    request_assembly_allowed: false,
    request_assembly_authorized: false,
    assembled_request_generated: false,
    concrete_exact_values_allowed: false,
    live_values_bound: false,
    request_body_generated: false,
    request_body_submitted: false,
    runtime_execution_authorized: false,
    runtime_executed: false
  };

  const fieldFamilies = Object.fromEntries(
    REQUIRED_FIELD_FAMILY_FIELDS.map(field => [field, false])
  );
  const authorization = Object.fromEntries(
    REQUIRED_AUTHORIZATION_FIELDS.map(field => [field, false])
  );

  const output = {
    disclosure_level: 'authorization_request_boundary_categories_only',
    raw_private_output_allowed: false,
    concrete_values_disclosed: false,
    authorization_request_disclosed: false,
    approval_request_packet_disclosed: false,
    request_packet_disclosed: false,
    assembled_request_disclosed: false,
    request_body_disclosed: false,
    approval_line_value_disclosed: false,
    runtime_command_disclosed: false,
    memory_payload_disclosed: false,
    config_value_disclosed: false,
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
    fieldFamilies: {
      ...fieldFamilies,
      ...(overrides.fieldFamilies || {})
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
      overrides.expectedDecision ||
      'authorization_request_boundary_accepted_category_only_no_authority',
    nextActionAllowed:
      overrides.nextActionAllowed || 'cm1899_authorization_request_boundary_fixture_contract',
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => ![
      'packet',
      'sources',
      'boundary',
      'fieldFamilies',
      'authorization',
      'output',
      'expectedDecision',
      'nextActionAllowed',
      'counters'
    ].includes(key)))
  };
}

test('CM1899 accepts authorization request boundary as category-only fixture', () => {
  const result = validateVcpMemoryExactLiveRuntimeAuthorizationRequestBoundaryContract(
    authorizationRequestBoundary()
  );

  assert.equal(result.accepted, true);
  assert.equal(
    result.contractMode,
    'fixture_exact_live_runtime_authorization_request_boundary_only'
  );
  assert.equal(result.decision, 'authorization_request_boundary_accepted_category_only_no_authority');
  assert.equal(result.authorizationRequestBoundaryAccepted, true);
  assert.equal(result.nonAuthorizingCategoryBoundaryOnly, true);
  assert.equal(result.authorizationGateOpened, false);
  assert.equal(result.authorizationRequested, false);
  assert.equal(result.authorizationRequestReady, false);
  assert.equal(result.authorizationRequestSubmitted, false);
  assert.equal(result.approvalRequestPacketCreated, false);
  assert.equal(result.approvalRequestReady, false);
  assert.equal(result.requestPacketCreated, false);
  assert.equal(result.requestPacketSubmitted, false);
  assert.equal(result.requestAssemblyAllowed, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.configStartupWatchdogChanged, false);
  assert.equal(result.readinessClaimAllowed, false);
});

test('CM1899 reports incomplete when source chain or boundary declaration is absent', () => {
  const result = validateVcpMemoryExactLiveRuntimeAuthorizationRequestBoundaryContract(
    authorizationRequestBoundary({
      sources: {
        cm1898_authorization_request_boundary_preflight_present: false,
        validation_cmv2001_present: false
      },
      boundary: {
        authorization_request_boundary_preflight_reviewed: false,
        field_family_classes_declared: false,
        future_fixture_contract_allowed: false
      },
      expectedDecision: 'authorization_request_boundary_incomplete'
    })
  );

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'authorization_request_boundary_incomplete');
  assert.equal(result.authorizationRequestBoundaryAccepted, false);
  assert.equal(result.authorizationGateOpened, false);
  assert.equal(result.authorizationRequestReady, false);
  assert.equal(result.requestPacketCreated, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1899 stops request authorization packet runtime memory config and readiness as L4', () => {
  const result = validateVcpMemoryExactLiveRuntimeAuthorizationRequestBoundaryContract(
    authorizationRequestBoundary({
      boundary: Object.fromEntries(REQUIRED_BOUNDARY_FIELDS.map(field => [field, true])),
      fieldFamilies: Object.fromEntries(REQUIRED_FIELD_FAMILY_FIELDS.map(field => [field, true])),
      authorization: Object.fromEntries(REQUIRED_AUTHORIZATION_FIELDS.map(field => [field, true])),
      output: {
        raw_private_output_allowed: true,
        concrete_values_disclosed: true,
        authorization_request_disclosed: true,
        approval_request_packet_disclosed: true,
        request_packet_disclosed: true,
        assembled_request_disclosed: true,
        request_body_disclosed: true,
        approval_line_value_disclosed: true,
        runtime_command_disclosed: true,
        memory_payload_disclosed: true,
        config_value_disclosed: true,
        readiness_claim_allowed: true
      },
      expectedDecision: 'stop_l4'
    })
  );

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'stop_l4');
  assert.equal(result.authorizationRequestBoundaryAccepted, false);
  assert.equal(result.authorizationGateOpened, false);
  assert.equal(result.authorizationRequested, false);
  assert.equal(result.authorizationRequestReady, false);
  assert.equal(result.authorizationRequestSubmitted, false);
  assert.equal(result.approvalRequestPacketCreated, false);
  assert.equal(result.requestPacketCreated, false);
  assert.equal(result.requestAssemblyAllowed, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.configStartupWatchdogChanged, false);
  assert.equal(result.readinessClaimAllowed, false);
});

test('CM1899 rejects raw secret exact request approval runtime memory config fields without echo', () => {
  const result = validateVcpMemoryExactLiveRuntimeAuthorizationRequestBoundaryContract(
    authorizationRequestBoundary({
      packet: {
        targetValue: 'SYNTHETIC_TARGET_SHOULD_NOT_ECHO'
      },
      fieldFamilies: {
        exactTarget: 'SYNTHETIC_EXACT_TARGET_SHOULD_NOT_ECHO'
      },
      authorization: {
        approvalLineValue: 'SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'
      },
      output: {
        providerPayload: 'SYNTHETIC_PROVIDER_SHOULD_NOT_ECHO'
      },
      authorizationRequest: 'SYNTHETIC_AUTHORIZATION_REQUEST_SHOULD_NOT_ECHO',
      approvalRequestPacket: 'SYNTHETIC_APPROVAL_PACKET_SHOULD_NOT_ECHO',
      requestPacket: 'SYNTHETIC_REQUEST_PACKET_SHOULD_NOT_ECHO',
      requestBody: 'SYNTHETIC_REQUEST_BODY_SHOULD_NOT_ECHO',
      approvalLine: 'SYNTHETIC_APPROVAL_LINE_SHOULD_NOT_ECHO',
      runtimeCommand: 'SYNTHETIC_RUNTIME_COMMAND_SHOULD_NOT_ECHO',
      memoryQuery: 'SYNTHETIC_MEMORY_QUERY_SHOULD_NOT_ECHO',
      configChange: 'SYNTHETIC_CONFIG_CHANGE_SHOULD_NOT_ECHO',
      RC_READY: 'SYNTHETIC_RC_READY_SHOULD_NOT_ECHO'
    })
  );
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(
    result.reasonCode,
    'forbidden_raw_secret_exact_value_request_approval_or_overclaim_fields'
  );
  assert.ok(result.forbiddenFields.includes('packet.targetValue'));
  assert.ok(result.forbiddenFields.includes('fieldFamilies.exactTarget'));
  assert.ok(result.forbiddenFields.includes('authorization.approvalLineValue'));
  assert.ok(result.forbiddenFields.includes('output.providerPayload'));
  assert.ok(result.forbiddenFields.includes('authorizationRequest'));
  assert.ok(result.forbiddenFields.includes('approvalRequestPacket'));
  assert.ok(result.forbiddenFields.includes('requestPacket'));
  assert.ok(result.forbiddenFields.includes('requestBody'));
  assert.ok(result.forbiddenFields.includes('approvalLine'));
  assert.ok(result.forbiddenFields.includes('runtimeCommand'));
  assert.ok(result.forbiddenFields.includes('memoryQuery'));
  assert.ok(result.forbiddenFields.includes('configChange'));
  assert.ok(result.forbiddenFields.includes('RC_READY'));
  assert.equal(serialized.includes('SYNTHETIC_TARGET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXACT_TARGET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_PROVIDER_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_AUTHORIZATION_REQUEST_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_APPROVAL_PACKET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_REQUEST_PACKET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_REQUEST_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_APPROVAL_LINE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RUNTIME_COMMAND_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_MEMORY_QUERY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_CONFIG_CHANGE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RC_READY_SHOULD_NOT_ECHO'), false);
});

test('CM1899 rejects unexpected fields without echoing submitted values', () => {
  const result = validateVcpMemoryExactLiveRuntimeAuthorizationRequestBoundaryContract(
    authorizationRequestBoundary({
      extraRoot: 'SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO',
      boundary: {
        extraBoundary: 'SYNTHETIC_EXTRA_BOUNDARY_SHOULD_NOT_ECHO'
      },
      fieldFamilies: {
        extraFieldFamily: 'SYNTHETIC_EXTRA_FAMILY_SHOULD_NOT_ECHO'
      },
      authorization: {
        extraAuthorization: 'SYNTHETIC_EXTRA_AUTH_SHOULD_NOT_ECHO'
      },
      output: {
        extraOutput: 'SYNTHETIC_EXTRA_OUTPUT_SHOULD_NOT_ECHO'
      }
    })
  );
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'unexpected_fields');
  assert.ok(result.unexpectedFields.includes('extraRoot'));
  assert.ok(result.unexpectedFields.includes('boundary.extraBoundary'));
  assert.ok(result.unexpectedFields.includes('fieldFamilies.extraFieldFamily'));
  assert.ok(result.unexpectedFields.includes('authorization.extraAuthorization'));
  assert.ok(result.unexpectedFields.includes('output.extraOutput'));
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_BOUNDARY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_FAMILY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_AUTH_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_OUTPUT_SHOULD_NOT_ECHO'), false);
});

test('CM1899 rejects missing positive and malformed zero side-effect counters', () => {
  const missingFixture = authorizationRequestBoundary();
  delete missingFixture.counters.providerApiCalls;

  const missingResult = validateVcpMemoryExactLiveRuntimeAuthorizationRequestBoundaryContract(
    missingFixture
  );
  assert.equal(missingResult.accepted, false);
  assert.equal(missingResult.reasonCode, 'missing_required_fields');
  assert.ok(missingResult.missingFields.includes('counters.providerApiCalls'));

  const positiveResult = validateVcpMemoryExactLiveRuntimeAuthorizationRequestBoundaryContract(
    authorizationRequestBoundary({
      counters: {
        authorizationRequestsCreated: 1,
        authorizationRequestSubmissions: 1,
        approvalRequestPacketsCreated: 1,
        approvalLineOperations: 1,
        requestPacketsCreated: 1,
        requestBodiesGenerated: 1,
        requestSubmissions: 1,
        runtimeCalls: 1,
        liveVcpToolBoxCalls: 1,
        mcpMemoryToolCalls: 1,
        responseBodyReads: 1,
        runtimeLogReads: 1,
        realQueries: 1,
        memoryWrites: 1,
        durableMemoryWrites: 1,
        configStartupWatchdogChanges: 1,
        releaseDeployCutoverPushActions: 1
      }
    })
  );
  assert.equal(positiveResult.accepted, false);
  assert.equal(positiveResult.reasonCode, 'forbidden_positive_side_effect_counters');
  assert.ok(positiveResult.forbiddenCounters.includes('authorizationRequestsCreated'));
  assert.ok(positiveResult.forbiddenCounters.includes('authorizationRequestSubmissions'));
  assert.ok(positiveResult.forbiddenCounters.includes('approvalRequestPacketsCreated'));
  assert.ok(positiveResult.forbiddenCounters.includes('approvalLineOperations'));
  assert.ok(positiveResult.forbiddenCounters.includes('requestPacketsCreated'));
  assert.ok(positiveResult.forbiddenCounters.includes('requestBodiesGenerated'));
  assert.ok(positiveResult.forbiddenCounters.includes('requestSubmissions'));
  assert.ok(positiveResult.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(positiveResult.forbiddenCounters.includes('liveVcpToolBoxCalls'));
  assert.ok(positiveResult.forbiddenCounters.includes('mcpMemoryToolCalls'));
  assert.ok(positiveResult.forbiddenCounters.includes('responseBodyReads'));
  assert.ok(positiveResult.forbiddenCounters.includes('runtimeLogReads'));
  assert.ok(positiveResult.forbiddenCounters.includes('realQueries'));
  assert.ok(positiveResult.forbiddenCounters.includes('memoryWrites'));
  assert.ok(positiveResult.forbiddenCounters.includes('durableMemoryWrites'));
  assert.ok(positiveResult.forbiddenCounters.includes('configStartupWatchdogChanges'));
  assert.ok(positiveResult.forbiddenCounters.includes('releaseDeployCutoverPushActions'));

  const malformedResult = validateVcpMemoryExactLiveRuntimeAuthorizationRequestBoundaryContract(
    authorizationRequestBoundary({
      counters: {
        providerApiCalls: '0'
      }
    })
  );
  assert.equal(malformedResult.accepted, false);
  assert.equal(
    malformedResult.reasonCode,
    'invalid_exact_live_runtime_authorization_request_boundary_contract'
  );
  assert.ok(malformedResult.invalidFields.includes('counters.providerApiCalls'));
});

test('CM1899 rejects invalid packet fields decision mismatch and unsafe decision echo', () => {
  const invalidResult = validateVcpMemoryExactLiveRuntimeAuthorizationRequestBoundaryContract(
    authorizationRequestBoundary({
      packet: {
        boundary_id: 'not-a-valid-boundary-id',
        contract_version: 'wrong',
        authorization_request_not_created: false,
        request_packet_not_created: false
      },
      output: {
        disclosure_level: 'raw'
      }
    })
  );
  assert.equal(invalidResult.accepted, false);
  assert.equal(
    invalidResult.reasonCode,
    'invalid_exact_live_runtime_authorization_request_boundary_contract'
  );
  assert.ok(invalidResult.invalidFields.includes('packet.boundary_id'));
  assert.ok(invalidResult.invalidFields.includes('packet.contract_version'));
  assert.ok(invalidResult.invalidFields.includes('packet.authorization_request_not_created'));
  assert.ok(invalidResult.invalidFields.includes('packet.request_packet_not_created'));
  assert.ok(invalidResult.invalidFields.includes('output.disclosure_level'));

  const mismatchResult = validateVcpMemoryExactLiveRuntimeAuthorizationRequestBoundaryContract(
    authorizationRequestBoundary({
      boundary: {
        authorization_request_boundary_preflight_reviewed: false
      }
    })
  );
  assert.equal(mismatchResult.accepted, false);
  assert.equal(mismatchResult.reasonCode, 'decision_mismatch');
  assert.equal(mismatchResult.computedDecision, 'authorization_request_boundary_incomplete');

  const unsafeDecisionResult = validateVcpMemoryExactLiveRuntimeAuthorizationRequestBoundaryContract(
    authorizationRequestBoundary({
      expectedDecision: 'SYNTHETIC_DECISION_SHOULD_NOT_ECHO'
    })
  );
  const serialized = JSON.stringify(unsafeDecisionResult);
  assert.equal(unsafeDecisionResult.accepted, false);
  assert.equal(unsafeDecisionResult.expectedDecision, null);
  assert.equal(serialized.includes('SYNTHETIC_DECISION_SHOULD_NOT_ECHO'), false);
});

test('CM1899 locks authorization request boundary vocabulary and no-side-effect posture', () => {
  assert.deepEqual(ALLOWED_DECISIONS, [
    'authorization_request_boundary_accepted_category_only_no_authority',
    'authorization_request_boundary_incomplete',
    'stop_l4'
  ]);
  assert.deepEqual(ALLOWED_NEXT_ACTIONS, [
    'cm1899_authorization_request_boundary_fixture_contract',
    'cm1900_authorization_request_boundary_fixture_closeout_gate_review'
  ]);
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('authorizationRequest'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('approvalRequestPacket'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('requestPacket'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('requestBody'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('approvalLine'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('runtimeCommand'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('memoryQuery'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('configChange'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('RC_READY'));

  const result = validateVcpMemoryExactLiveRuntimeAuthorizationRequestBoundaryContract(
    authorizationRequestBoundary()
  );
  assert.equal(result.authorizationRequestBoundaryAccepted, true);
  assert.equal(result.authorizationGateOpened, false);
  assert.equal(result.authorizationRequested, false);
  assert.equal(result.approvalGranted, false);
  assert.equal(result.approvalRequestPacketCreated, false);
  assert.equal(result.approvalRequestReady, false);
  assert.equal(result.approvalRequestSubmitted, false);
  assert.equal(result.authorizationRequestReady, false);
  assert.equal(result.authorizationRequestSubmitted, false);
  assert.equal(result.requestPacketReadinessMayOpen, false);
  assert.equal(result.requestPacketReadinessBlocked, true);
  assert.equal(result.exactRequestPacketReady, false);
  assert.equal(result.exactRequestPacketPresent, false);
  assert.equal(result.requestPacketCreated, false);
  assert.equal(result.requestPacketSubmitted, false);
  assert.equal(result.requestAssemblyAllowed, false);
  assert.equal(result.liveValuesBound, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.requestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.approvalLineExposed, false);
  assert.equal(result.approvalLineSubmitted, false);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.mcpMemoryToolCalled, false);
  assert.equal(result.responseBodyRead, false);
  assert.equal(result.runtimeLogRead, false);
  assert.equal(result.realQueryPerformed, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableAuditWritePerformed, false);
  assert.equal(result.durableMemoryWritePerformed, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.configStartupWatchdogChanged, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.releaseDeployCutoverPushPerformed, false);
  assert.equal(result.readinessClaimAllowed, false);
});
