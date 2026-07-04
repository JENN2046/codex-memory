'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_DECISIONS,
  ALLOWED_NEXT_ACTIONS,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_EVIDENCE_FIELDS,
  REQUIRED_MATERIAL_BOUNDARY_FIELDS,
  REQUIRED_MATERIAL_FAMILY_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialBoundaryContract
} = require('../src/core/VcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialBoundaryContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] ?? 0]));
}

function exactMaterialBoundary(overrides = {}) {
  const packet = {
    material_boundary_id:
      'cm1905_fixture_exact_live_runtime_authorization_request_exact_material_boundary_001',
    contract_version:
      'vcp_memory_exact_live_runtime_authorization_request_exact_material_boundary_v1',
    evidence_type: 'fixture-only',
    profile: 'exact-live-runtime-authorization-request-exact-material-boundary',
    non_authorizing: true,
    exact_material_categories_only: true,
    concrete_values_absent: true
  };

  const evidence = Object.fromEntries(REQUIRED_EVIDENCE_FIELDS.map(field => [field, true]));

  const materialBoundary = {
    cm1904_preflight_reviewed: true,
    exact_material_families_defined: true,
    exact_material_values_bound: false,
    request_identity_value_bound: false,
    target_alias_value_bound: false,
    transport_endpoint_value_bound: false,
    principal_tuple_value_bound: false,
    operation_payload_value_bound: false,
    runtime_budget_value_bound: false,
    output_policy_value_bound: false,
    memory_policy_value_bound: false,
    config_policy_value_bound: false,
    provider_policy_value_bound: false,
    cleanup_policy_value_bound: false,
    receipt_path_value_bound: false,
    validation_command_values_bound: false,
    abort_condition_values_bound: false,
    authorization_gate_opened: false,
    authorization_requested: false,
    authorization_request_created: false,
    authorization_request_ready: false,
    authorization_request_submitted: false,
    approval_granted: false,
    dedicated_exact_approval_text_present: false,
    approval_request_packet_created: false,
    approval_request_packet_ready: false,
    approval_request_submitted: false,
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
    runtime_executed: false,
    vcp_toolbox_runtime_called: false,
    mcp_memory_tool_called: false,
    response_body_read: false,
    runtime_log_read: false,
    stdout_read: false,
    stderr_read: false,
    config_env_content_read: false,
    secrets_read: false,
    private_runtime_read_performed: false,
    raw_store_read_performed: false,
    raw_audit_row_read_performed: false,
    real_query_performed: false,
    provider_api_called_by_agent: false,
    memory_read_performed_by_agent: false,
    memory_write_performed: false,
    durable_audit_write_performed: false,
    durable_memory_write_performed: false,
    config_changed: false,
    startup_changed: false,
    watchdog_changed: false,
    public_mcp_expansion_performed: false,
    push_performed: false,
    tag_performed: false,
    release_performed: false,
    deploy_performed: false,
    cutover_performed: false,
    readiness_claimed: false,
    rc_ready_claimed: false,
    release_ready_claimed: false,
    production_ready_claimed: false,
    cutover_ready_claimed: false,
    complete_v8_claimed: false,
    full_bridge_completion_claimed: false,
    next_gate_may_open_live: false,
    missing_authorities_declared: true,
    future_fixture_closeout_allowed: true
  };

  const materialFamilies = Object.fromEntries(
    REQUIRED_MATERIAL_FAMILY_FIELDS.map(field => [field, true])
  );

  const authorization = Object.fromEntries(
    REQUIRED_AUTHORIZATION_FIELDS.map(field => [field, false])
  );

  const output = {
    disclosure_level: 'exact_material_boundary_categories_only',
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
    evidence: {
      ...evidence,
      ...(overrides.evidence || {})
    },
    materialBoundary: {
      ...materialBoundary,
      ...(overrides.materialBoundary || {})
    },
    materialFamilies: {
      ...materialFamilies,
      ...(overrides.materialFamilies || {})
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
      overrides.expectedDecision || 'exact_material_boundary_accepted_categories_only_no_values',
    nextActionAllowed:
      overrides.nextActionAllowed || 'cm1905_exact_material_boundary_fixture_contract',
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => ![
      'packet',
      'evidence',
      'materialBoundary',
      'materialFamilies',
      'authorization',
      'output',
      'expectedDecision',
      'nextActionAllowed',
      'counters'
    ].includes(key)))
  };
}

test('CM1905 accepts exact material category-only boundary fixture', () => {
  const result = validateVcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialBoundaryContract(
    exactMaterialBoundary()
  );

  assert.equal(result.accepted, true);
  assert.equal(
    result.contractMode,
    'fixture_exact_live_runtime_authorization_request_exact_material_boundary_only'
  );
  assert.equal(result.decision, 'exact_material_boundary_accepted_categories_only_no_values');
  assert.equal(result.exactMaterialBoundaryAccepted, true);
  assert.equal(result.nonAuthorizingCategoryBoundaryOnly, true);
  assert.equal(result.exactMaterialFamiliesDefined, true);
  assert.equal(result.exactMaterialValuesBound, false);
  assert.equal(result.concreteExactValuesBound, false);
  assert.equal(result.authorizationGateOpened, false);
  assert.equal(result.authorizationRequestCreated, false);
  assert.equal(result.requestPacketCreated, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.mcpMemoryToolCalled, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.configStartupWatchdogChanged, false);
  assert.equal(result.readinessClaimAllowed, false);
});

test('CM1905 reports incomplete when evidence material families or authorities are absent', () => {
  const result = validateVcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialBoundaryContract(
    exactMaterialBoundary({
      evidence: {
        cm1904_exact_material_boundary_preflight_present: false,
        validation_cmv2007_present: false
      },
      materialFamilies: {
        validation_command_class_family_declared: false,
        abort_condition_family_declared: false
      },
      materialBoundary: {
        cm1904_preflight_reviewed: false,
        exact_material_families_defined: false,
        missing_authorities_declared: false,
        future_fixture_closeout_allowed: false
      },
      expectedDecision: 'exact_material_boundary_incomplete'
    })
  );

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'exact_material_boundary_incomplete');
  assert.equal(result.exactMaterialBoundaryAccepted, false);
  assert.equal(result.exactMaterialFamiliesDefined, false);
  assert.equal(result.exactMaterialValuesBound, false);
  assert.equal(result.authorizationRequestCreated, false);
  assert.equal(result.requestPacketCreated, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1905 stops concrete values request runtime memory config and readiness as L4', () => {
  const result = validateVcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialBoundaryContract(
    exactMaterialBoundary({
      materialBoundary: Object.fromEntries(
        REQUIRED_MATERIAL_BOUNDARY_FIELDS.map(field => [field, true])
      ),
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
  assert.equal(result.exactMaterialBoundaryAccepted, false);
  assert.equal(result.exactMaterialValuesBound, false);
  assert.equal(result.authorizationRequestCreated, false);
  assert.equal(result.requestPacketCreated, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.configStartupWatchdogChanged, false);
  assert.equal(result.readinessClaimAllowed, false);
});

test('CM1905 rejects raw secret exact material request approval runtime memory config fields without echo', () => {
  const result = validateVcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialBoundaryContract(
    exactMaterialBoundary({
      packet: {
        targetAliasValue: 'SYNTHETIC_TARGET_ALIAS_SHOULD_NOT_ECHO'
      },
      materialBoundary: {
        exactMaterialValues: 'SYNTHETIC_EXACT_MATERIAL_SHOULD_NOT_ECHO'
      },
      authorization: {
        approvalLineValue: 'SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'
      },
      output: {
        providerPayload: 'SYNTHETIC_PROVIDER_SHOULD_NOT_ECHO'
      },
      concreteExactValues: 'SYNTHETIC_CONCRETE_VALUES_SHOULD_NOT_ECHO',
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
    'forbidden_raw_secret_exact_material_request_approval_or_overclaim_fields'
  );
  assert.ok(result.forbiddenFields.includes('packet.targetAliasValue'));
  assert.ok(result.forbiddenFields.includes('materialBoundary.exactMaterialValues'));
  assert.ok(result.forbiddenFields.includes('authorization.approvalLineValue'));
  assert.ok(result.forbiddenFields.includes('output.providerPayload'));
  assert.ok(result.forbiddenFields.includes('concreteExactValues'));
  assert.ok(result.forbiddenFields.includes('authorizationRequest'));
  assert.ok(result.forbiddenFields.includes('approvalRequestPacket'));
  assert.ok(result.forbiddenFields.includes('requestPacket'));
  assert.ok(result.forbiddenFields.includes('requestBody'));
  assert.ok(result.forbiddenFields.includes('approvalLine'));
  assert.ok(result.forbiddenFields.includes('runtimeCommand'));
  assert.ok(result.forbiddenFields.includes('memoryQuery'));
  assert.ok(result.forbiddenFields.includes('configChange'));
  assert.ok(result.forbiddenFields.includes('RC_READY'));
  assert.equal(serialized.includes('SYNTHETIC_TARGET_ALIAS_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXACT_MATERIAL_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_PROVIDER_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_CONCRETE_VALUES_SHOULD_NOT_ECHO'), false);
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

test('CM1905 rejects unexpected fields without echoing submitted values', () => {
  const result = validateVcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialBoundaryContract(
    exactMaterialBoundary({
      extraRoot: 'SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO',
      materialBoundary: {
        extraMaterialBoundary: 'SYNTHETIC_EXTRA_BOUNDARY_SHOULD_NOT_ECHO'
      },
      materialFamilies: {
        extraMaterialFamily: 'SYNTHETIC_EXTRA_FAMILY_SHOULD_NOT_ECHO'
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
  assert.ok(result.unexpectedFields.includes('materialBoundary.extraMaterialBoundary'));
  assert.ok(result.unexpectedFields.includes('materialFamilies.extraMaterialFamily'));
  assert.ok(result.unexpectedFields.includes('authorization.extraAuthorization'));
  assert.ok(result.unexpectedFields.includes('output.extraOutput'));
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_BOUNDARY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_FAMILY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_AUTH_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_OUTPUT_SHOULD_NOT_ECHO'), false);
});

test('CM1905 rejects missing positive and malformed zero side-effect counters', () => {
  const missingFixture = exactMaterialBoundary();
  delete missingFixture.counters.providerApiCalls;

  const missingResult = validateVcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialBoundaryContract(
    missingFixture
  );
  assert.equal(missingResult.accepted, false);
  assert.equal(missingResult.reasonCode, 'missing_required_fields');
  assert.ok(missingResult.missingFields.includes('counters.providerApiCalls'));

  const positiveResult = validateVcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialBoundaryContract(
    exactMaterialBoundary({
      counters: {
        concreteExactValueBindings: 1,
        authorizationRequestsCreated: 1,
        authorizationRequestSubmissions: 1,
        approvalRequestPacketsCreated: 1,
        requestPacketsCreated: 1,
        requestPacketSubmissions: 1,
        requestBodiesGenerated: 1,
        requestSubmissions: 1,
        approvalLineOperations: 1,
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
  assert.ok(positiveResult.forbiddenCounters.includes('concreteExactValueBindings'));
  assert.ok(positiveResult.forbiddenCounters.includes('authorizationRequestsCreated'));
  assert.ok(positiveResult.forbiddenCounters.includes('authorizationRequestSubmissions'));
  assert.ok(positiveResult.forbiddenCounters.includes('approvalRequestPacketsCreated'));
  assert.ok(positiveResult.forbiddenCounters.includes('requestPacketsCreated'));
  assert.ok(positiveResult.forbiddenCounters.includes('requestPacketSubmissions'));
  assert.ok(positiveResult.forbiddenCounters.includes('requestBodiesGenerated'));
  assert.ok(positiveResult.forbiddenCounters.includes('requestSubmissions'));
  assert.ok(positiveResult.forbiddenCounters.includes('approvalLineOperations'));
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

  const malformedResult = validateVcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialBoundaryContract(
    exactMaterialBoundary({
      counters: {
        providerApiCalls: '0'
      }
    })
  );
  assert.equal(malformedResult.accepted, false);
  assert.equal(
    malformedResult.reasonCode,
    'invalid_exact_live_runtime_authorization_request_exact_material_boundary_contract'
  );
  assert.ok(malformedResult.invalidFields.includes('counters.providerApiCalls'));
});

test('CM1905 rejects invalid packet fields decision mismatch and unsafe decision echo', () => {
  const invalidResult = validateVcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialBoundaryContract(
    exactMaterialBoundary({
      packet: {
        material_boundary_id: 'not-a-valid-material-boundary-id',
        contract_version: 'wrong',
        concrete_values_absent: false
      },
      output: {
        disclosure_level: 'raw'
      }
    })
  );
  assert.equal(invalidResult.accepted, false);
  assert.equal(
    invalidResult.reasonCode,
    'invalid_exact_live_runtime_authorization_request_exact_material_boundary_contract'
  );
  assert.ok(invalidResult.invalidFields.includes('packet.material_boundary_id'));
  assert.ok(invalidResult.invalidFields.includes('packet.contract_version'));
  assert.ok(invalidResult.invalidFields.includes('packet.concrete_values_absent'));
  assert.ok(invalidResult.invalidFields.includes('output.disclosure_level'));

  const mismatchResult = validateVcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialBoundaryContract(
    exactMaterialBoundary({
      materialFamilies: {
        abort_condition_family_declared: false
      }
    })
  );
  assert.equal(mismatchResult.accepted, false);
  assert.equal(mismatchResult.reasonCode, 'decision_mismatch');
  assert.equal(mismatchResult.computedDecision, 'exact_material_boundary_incomplete');

  const unsafeDecisionResult = validateVcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialBoundaryContract(
    exactMaterialBoundary({
      expectedDecision: 'SYNTHETIC_DECISION_SHOULD_NOT_ECHO'
    })
  );
  const serialized = JSON.stringify(unsafeDecisionResult);
  assert.equal(unsafeDecisionResult.accepted, false);
  assert.equal(unsafeDecisionResult.expectedDecision, null);
  assert.equal(serialized.includes('SYNTHETIC_DECISION_SHOULD_NOT_ECHO'), false);
});

test('CM1905 locks exact material boundary vocabulary and no-side-effect posture', () => {
  assert.deepEqual(ALLOWED_DECISIONS, [
    'exact_material_boundary_accepted_categories_only_no_values',
    'exact_material_boundary_incomplete',
    'stop_l4'
  ]);
  assert.deepEqual(ALLOWED_NEXT_ACTIONS, [
    'cm1905_exact_material_boundary_fixture_contract',
    'cm1906_exact_material_boundary_fixture_closeout_gate_review'
  ]);
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('requestIdentityValue'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('targetAliasValue'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('transportEndpointValue'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('exactMaterialValues'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('concreteExactValues'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('authorizationRequest'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('approvalRequestPacket'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('requestPacket'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('requestBody'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('approvalLine'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('runtimeCommand'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('memoryQuery'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('configChange'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('RC_READY'));

  const result = validateVcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialBoundaryContract(
    exactMaterialBoundary()
  );
  assert.equal(result.exactMaterialBoundaryAccepted, true);
  assert.equal(result.nonAuthorizingCategoryBoundaryOnly, true);
  assert.equal(result.exactMaterialFamiliesDefined, true);
  assert.equal(result.exactMaterialValuesBound, false);
  assert.equal(result.concreteExactValuesBound, false);
  assert.equal(result.authorizationGateOpened, false);
  assert.equal(result.authorizationRequested, false);
  assert.equal(result.authorizationRequestCreated, false);
  assert.equal(result.authorizationRequestReady, false);
  assert.equal(result.authorizationRequestSubmitted, false);
  assert.equal(result.approvalRequestPacketCreated, false);
  assert.equal(result.approvalRequestReady, false);
  assert.equal(result.approvalRequestSubmitted, false);
  assert.equal(result.requestPacketReadinessMayOpen, false);
  assert.equal(result.requestPacketReadinessBlocked, true);
  assert.equal(result.exactRequestPacketReady, false);
  assert.equal(result.exactRequestPacketPresent, false);
  assert.equal(result.requestPacketCreated, false);
  assert.equal(result.requestPacketRendered, false);
  assert.equal(result.requestPacketStored, false);
  assert.equal(result.requestPacketSubmitted, false);
  assert.equal(result.requestAssemblyAllowed, false);
  assert.equal(result.liveValuesBound, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.requestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.approvalLineExposed, false);
  assert.equal(result.approvalLineSubmitted, false);
  assert.equal(result.approvalGranted, false);
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
