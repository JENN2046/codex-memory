'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_DECISIONS,
  ALLOWED_NEXT_ACTIONS,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_EVIDENCE_FIELDS,
  REQUIRED_EXACT_MATERIAL_READINESS_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialReadinessBlockedContract
} = require('../src/core/VcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialReadinessBlockedContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] ?? 0]));
}

function exactMaterialReadinessBlocked(overrides = {}) {
  const packet = {
    readiness_id:
      'cm1908_fixture_exact_live_runtime_authorization_request_exact_material_readiness_blocked_001',
    contract_version:
      'vcp_memory_exact_live_runtime_authorization_request_exact_material_readiness_blocked_v1',
    evidence_type: 'fixture-only',
    profile: 'exact-live-runtime-authorization-request-exact-material-readiness-blocked',
    non_authorizing: true,
    exact_material_readiness_blocked_fixture_only: true,
    concrete_values_absent: true
  };

  const evidence = Object.fromEntries(REQUIRED_EVIDENCE_FIELDS.map(field => [field, true]));

  const exactMaterialReadiness = {
    cm1907_precondition_reviewed: true,
    exact_material_boundary_evidence_is_authorization_request_readiness: false,
    exact_material_fixture_closeout_is_authorization_request_readiness: false,
    exact_material_categories_are_concrete_values: false,
    exact_material_readiness_may_open: false,
    exact_material_readiness_blocked: true,
    exact_material_readiness_block_reason_declared: true,
    authorization_request_readiness_may_open: false,
    authorization_request_readiness_blocked: true,
    current_green_chain_schedules_exact_value_binding: false,
    current_green_chain_schedules_authorization_request_creation: false,
    current_green_chain_schedules_authorization_request_submission: false,
    current_green_chain_schedules_approval_request_packet_creation: false,
    current_green_chain_schedules_approval_request_packet_submission: false,
    current_green_chain_schedules_request_packet_creation: false,
    current_green_chain_schedules_request_packet_rendering: false,
    current_green_chain_schedules_request_packet_storage: false,
    current_green_chain_schedules_request_packet_submission: false,
    current_green_chain_schedules_request_body_generation: false,
    current_green_chain_schedules_request_body_submission: false,
    current_green_chain_schedules_approval_line_generation: false,
    current_green_chain_schedules_approval_line_submission: false,
    current_green_chain_schedules_true_runtime: false,
    current_green_chain_schedules_true_memory_read: false,
    current_green_chain_schedules_true_memory_write: false,
    current_green_chain_schedules_config_startup_change: false,
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
    authorization_request_creation_allowed: false,
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
    request_packet_creation_allowed: false,
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
    missing_authorities_declared: true,
    next_fixture_closeout_allowed: true
  };

  const authorization = Object.fromEntries(
    REQUIRED_AUTHORIZATION_FIELDS.map(field => [field, false])
  );

  const output = {
    disclosure_level: 'exact_material_readiness_blocked_categories_only',
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
    exactMaterialReadiness: {
      ...exactMaterialReadiness,
      ...(overrides.exactMaterialReadiness || {})
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
      'exact_material_readiness_blocked_missing_concrete_authorization_request_material',
    nextActionAllowed:
      overrides.nextActionAllowed || 'cm1908_exact_material_readiness_blocked_fixture_contract',
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => ![
      'packet',
      'evidence',
      'exactMaterialReadiness',
      'authorization',
      'output',
      'expectedDecision',
      'nextActionAllowed',
      'counters'
    ].includes(key)))
  };
}

test('CM1908 accepts exact-material readiness blocked fixture only', () => {
  const result = validateVcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialReadinessBlockedContract(
    exactMaterialReadinessBlocked()
  );

  assert.equal(result.accepted, true);
  assert.equal(
    result.contractMode,
    'fixture_exact_live_runtime_authorization_request_exact_material_readiness_blocked_only'
  );
  assert.equal(
    result.decision,
    'exact_material_readiness_blocked_missing_concrete_authorization_request_material'
  );
  assert.equal(result.exactMaterialReadinessBlockedFixtureAccepted, true);
  assert.equal(result.exactMaterialReadinessMayOpen, false);
  assert.equal(result.exactMaterialReadinessBlocked, true);
  assert.equal(result.authorizationRequestReadinessMayOpen, false);
  assert.equal(result.authorizationRequestReadinessBlocked, true);
  assert.equal(result.exactMaterialCategoriesAreConcreteValues, false);
  assert.equal(result.concreteExactValuesBound, false);
  assert.equal(result.authorizationRequestCreated, false);
  assert.equal(result.authorizationRequestReady, false);
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

test('CM1908 reports incomplete when evidence or readiness declarations are absent', () => {
  const result = validateVcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialReadinessBlockedContract(
    exactMaterialReadinessBlocked({
      evidence: {
        cm1907_exact_material_readiness_blocked_precondition_refresh_present: false,
        validation_cmv2010_present: false
      },
      exactMaterialReadiness: {
        cm1907_precondition_reviewed: false,
        exact_material_readiness_block_reason_declared: false,
        missing_authorities_declared: false,
        next_fixture_closeout_allowed: false
      },
      expectedDecision: 'exact_material_readiness_incomplete'
    })
  );

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'exact_material_readiness_incomplete');
  assert.equal(result.exactMaterialReadinessBlockedFixtureAccepted, false);
  assert.equal(result.exactMaterialReadinessBlocked, true);
  assert.equal(result.authorizationRequestReady, false);
  assert.equal(result.requestPacketCreated, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1908 stops exact values request runtime memory config and readiness as L4', () => {
  const result = validateVcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialReadinessBlockedContract(
    exactMaterialReadinessBlocked({
      exactMaterialReadiness: Object.fromEntries(
        REQUIRED_EXACT_MATERIAL_READINESS_FIELDS.map(field => [field, true])
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
  assert.equal(result.exactMaterialReadinessBlockedFixtureAccepted, false);
  assert.equal(result.exactMaterialReadinessMayOpen, false);
  assert.equal(result.exactMaterialReadinessBlocked, true);
  assert.equal(result.authorizationRequestCreated, false);
  assert.equal(result.authorizationRequestReady, false);
  assert.equal(result.requestPacketCreated, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.configStartupWatchdogChanged, false);
  assert.equal(result.readinessClaimAllowed, false);
});

test('CM1908 rejects raw secret exact material request approval runtime memory config fields without echo', () => {
  const result = validateVcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialReadinessBlockedContract(
    exactMaterialReadinessBlocked({
      packet: {
        targetAliasValue: 'SYNTHETIC_TARGET_ALIAS_SHOULD_NOT_ECHO'
      },
      exactMaterialReadiness: {
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
  assert.ok(result.forbiddenFields.includes('exactMaterialReadiness.exactMaterialValues'));
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

test('CM1908 rejects unexpected fields without echoing submitted values', () => {
  const result = validateVcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialReadinessBlockedContract(
    exactMaterialReadinessBlocked({
      extraRoot: 'SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO',
      exactMaterialReadiness: {
        extraReadiness: 'SYNTHETIC_EXTRA_READINESS_SHOULD_NOT_ECHO'
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
  assert.ok(result.unexpectedFields.includes('exactMaterialReadiness.extraReadiness'));
  assert.ok(result.unexpectedFields.includes('authorization.extraAuthorization'));
  assert.ok(result.unexpectedFields.includes('output.extraOutput'));
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_READINESS_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_AUTH_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_OUTPUT_SHOULD_NOT_ECHO'), false);
});

test('CM1908 rejects missing positive and malformed zero side-effect counters', () => {
  const missingFixture = exactMaterialReadinessBlocked();
  delete missingFixture.counters.providerApiCalls;

  const missingResult = validateVcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialReadinessBlockedContract(
    missingFixture
  );
  assert.equal(missingResult.accepted, false);
  assert.equal(missingResult.reasonCode, 'missing_required_fields');
  assert.ok(missingResult.missingFields.includes('counters.providerApiCalls'));

  const positiveResult = validateVcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialReadinessBlockedContract(
    exactMaterialReadinessBlocked({
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

  const malformedResult = validateVcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialReadinessBlockedContract(
    exactMaterialReadinessBlocked({
      counters: {
        providerApiCalls: '0'
      }
    })
  );
  assert.equal(malformedResult.accepted, false);
  assert.equal(
    malformedResult.reasonCode,
    'invalid_exact_live_runtime_authorization_request_exact_material_readiness_blocked_contract'
  );
  assert.ok(malformedResult.invalidFields.includes('counters.providerApiCalls'));
});

test('CM1908 rejects invalid packet fields decision mismatch and unsafe decision echo', () => {
  const invalidResult = validateVcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialReadinessBlockedContract(
    exactMaterialReadinessBlocked({
      packet: {
        readiness_id: 'not-a-valid-readiness-id',
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
    'invalid_exact_live_runtime_authorization_request_exact_material_readiness_blocked_contract'
  );
  assert.ok(invalidResult.invalidFields.includes('packet.readiness_id'));
  assert.ok(invalidResult.invalidFields.includes('packet.contract_version'));
  assert.ok(invalidResult.invalidFields.includes('packet.concrete_values_absent'));
  assert.ok(invalidResult.invalidFields.includes('output.disclosure_level'));

  const mismatchResult = validateVcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialReadinessBlockedContract(
    exactMaterialReadinessBlocked({
      exactMaterialReadiness: {
        cm1907_precondition_reviewed: false
      }
    })
  );
  assert.equal(mismatchResult.accepted, false);
  assert.equal(mismatchResult.reasonCode, 'decision_mismatch');
  assert.equal(mismatchResult.computedDecision, 'exact_material_readiness_incomplete');

  const unsafeDecisionResult = validateVcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialReadinessBlockedContract(
    exactMaterialReadinessBlocked({
      expectedDecision: 'SYNTHETIC_DECISION_SHOULD_NOT_ECHO'
    })
  );
  const serialized = JSON.stringify(unsafeDecisionResult);
  assert.equal(unsafeDecisionResult.accepted, false);
  assert.equal(unsafeDecisionResult.expectedDecision, null);
  assert.equal(serialized.includes('SYNTHETIC_DECISION_SHOULD_NOT_ECHO'), false);
});

test('CM1908 locks exact-material readiness blocked vocabulary and no-side-effect posture', () => {
  assert.deepEqual(ALLOWED_DECISIONS, [
    'exact_material_readiness_blocked_missing_concrete_authorization_request_material',
    'exact_material_readiness_incomplete',
    'stop_l4'
  ]);
  assert.deepEqual(ALLOWED_NEXT_ACTIONS, [
    'cm1908_exact_material_readiness_blocked_fixture_contract',
    'cm1909_exact_material_readiness_blocked_fixture_closeout_gate_review'
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

  const result = validateVcpMemoryExactLiveRuntimeAuthorizationRequestExactMaterialReadinessBlockedContract(
    exactMaterialReadinessBlocked()
  );
  assert.equal(result.exactMaterialReadinessBlockedFixtureAccepted, true);
  assert.equal(result.exactMaterialBoundaryEvidenceIsAuthorizationRequestReadiness, false);
  assert.equal(result.exactMaterialFixtureCloseoutIsAuthorizationRequestReadiness, false);
  assert.equal(result.exactMaterialCategoriesAreConcreteValues, false);
  assert.equal(result.exactMaterialReadinessMayOpen, false);
  assert.equal(result.exactMaterialReadinessBlocked, true);
  assert.equal(result.authorizationRequestReadinessMayOpen, false);
  assert.equal(result.authorizationRequestReadinessBlocked, true);
  assert.equal(result.concreteExactValuesBound, false);
  assert.equal(result.authorizationGateOpened, false);
  assert.equal(result.authorizationRequestCreated, false);
  assert.equal(result.authorizationRequestReady, false);
  assert.equal(result.authorizationRequestSubmitted, false);
  assert.equal(result.approvalRequestPacketCreated, false);
  assert.equal(result.requestPacketReadinessMayOpen, false);
  assert.equal(result.requestPacketCreated, false);
  assert.equal(result.requestPacketSubmitted, false);
  assert.equal(result.requestAssemblyAllowed, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.mcpMemoryToolCalled, false);
  assert.equal(result.responseBodyRead, false);
  assert.equal(result.runtimeLogRead, false);
  assert.equal(result.realQueryPerformed, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableMemoryWritePerformed, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.configStartupWatchdogChanged, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.releaseDeployCutoverPushPerformed, false);
  assert.equal(result.readinessClaimAllowed, false);
});
