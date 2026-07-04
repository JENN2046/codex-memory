'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_DECISIONS,
  ALLOWED_NEXT_ACTIONS,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_BLOCKED_READINESS_FIELDS,
  REQUIRED_EVIDENCE_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryExactLiveRuntimeApprovalRequestPacketReadinessBlockedContract
} = require('../src/core/VcpMemoryExactLiveRuntimeApprovalRequestPacketReadinessBlockedContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] ?? 0]));
}

function packetReadinessBlocked(overrides = {}) {
  const packet = {
    readiness_id:
      'cm1893_fixture_exact_live_runtime_approval_request_packet_readiness_blocked_001',
    contract_version:
      'vcp_memory_exact_live_runtime_approval_request_packet_readiness_blocked_v1',
    evidence_type: 'fixture-only',
    profile: 'exact-live-runtime-approval-request-packet-readiness-blocked',
    non_authorizing: true,
    request_packet_readiness_blocked_fixture_only: true
  };

  const evidence = Object.fromEntries(REQUIRED_EVIDENCE_FIELDS.map(field => [field, true]));

  const blockedReadiness = {
    request_packet_readiness_precondition_reviewed: true,
    skeleton_evidence_is_request_packet_readiness: false,
    request_packet_readiness_may_open: false,
    request_packet_readiness_blocked: true,
    request_packet_readiness_block_reason_declared: true,
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
    exact_request_packet_ready: false,
    exact_request_packet_present: false,
    request_packet_creation_allowed: false,
    request_packet_rendering_allowed: false,
    request_packet_storage_allowed: false,
    request_packet_submission_allowed: false,
    request_assembly_allowed: false,
    request_assembly_authorized: false,
    concrete_exact_values_allowed: false,
    live_values_bound: false,
    exact_target_alias_bound: false,
    exact_transport_family_bound: false,
    exact_client_workspace_owner_aliases_bound: false,
    exact_operation_family_bound: false,
    exact_runtime_budget_bound: false,
    exact_output_policy_bound: false,
    exact_log_stdout_stderr_policy_bound: false,
    exact_memory_policy_bound: false,
    exact_cleanup_policy_bound: false,
    exact_receipt_path_class_bound: false,
    exact_validation_command_list_bound: false,
    request_body_authority_bound: false,
    request_submission_authority_bound: false,
    approval_line_handling_authority_bound: false,
    approval_grant_present: false,
    runtime_authority_bound: false,
    memory_read_authority_bound: false,
    memory_write_authority_bound: false,
    config_authority_bound: false,
    dedicated_exact_approval_text_present: false,
    missing_authorities_declared: true,
    next_fixture_contract_allowed: true
  };

  const authorization = Object.fromEntries(
    REQUIRED_AUTHORIZATION_FIELDS.map(field => [field, false])
  );

  const output = {
    disclosure_level: 'request_packet_readiness_blocked_categories_only',
    raw_private_output_allowed: false,
    concrete_values_disclosed: false,
    skeleton_artifact_disclosed: false,
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
    blockedReadiness: {
      ...blockedReadiness,
      ...(overrides.blockedReadiness || {})
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
      'request_packet_readiness_blocked_missing_exact_request_packet_material',
    nextActionAllowed:
      overrides.nextActionAllowed || 'cm1893_request_packet_readiness_blocked_fixture_contract',
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => ![
      'packet',
      'evidence',
      'blockedReadiness',
      'authorization',
      'output',
      'expectedDecision',
      'nextActionAllowed',
      'counters'
    ].includes(key)))
  };
}

test('CM1893 accepts request packet readiness as blocked fixture only', () => {
  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestPacketReadinessBlockedContract(
    packetReadinessBlocked()
  );

  assert.equal(result.accepted, true);
  assert.equal(
    result.contractMode,
    'fixture_exact_live_runtime_approval_request_packet_readiness_blocked_only'
  );
  assert.equal(
    result.decision,
    'request_packet_readiness_blocked_missing_exact_request_packet_material'
  );
  assert.equal(result.requestPacketReadinessBlockedFixtureAccepted, true);
  assert.equal(result.requestPacketReadinessMayOpen, false);
  assert.equal(result.requestPacketReadinessBlocked, true);
  assert.equal(result.skeletonEvidenceIsRequestPacketReadiness, false);
  assert.equal(result.exactRequestPacketReady, false);
  assert.equal(result.exactRequestPacketPresent, false);
  assert.equal(result.requestPacketCreated, false);
  assert.equal(result.requestPacketRendered, false);
  assert.equal(result.requestPacketStored, false);
  assert.equal(result.requestPacketSubmitted, false);
  assert.equal(result.requestAssemblyAllowed, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.requestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.approvalLineSubmitted, false);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.mcpMemoryToolCalled, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.configStartupWatchdogChanged, false);
  assert.equal(result.readinessClaimAllowed, false);
});

test('CM1893 reports incomplete when evidence or blocked-readiness declaration is absent', () => {
  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestPacketReadinessBlockedContract(
    packetReadinessBlocked({
      evidence: {
        cm1892_readiness_blocked_precondition_refresh_present: false,
        validation_cmv1995_present: false
      },
      blockedReadiness: {
        request_packet_readiness_precondition_reviewed: false,
        request_packet_readiness_block_reason_declared: false,
        missing_authorities_declared: false,
        next_fixture_contract_allowed: false
      },
      expectedDecision: 'request_packet_readiness_incomplete'
    })
  );

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'request_packet_readiness_incomplete');
  assert.equal(result.requestPacketReadinessBlockedFixtureAccepted, false);
  assert.equal(result.requestPacketReadinessBlocked, true);
  assert.equal(result.exactRequestPacketReady, false);
  assert.equal(result.requestPacketCreated, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1893 stops packet request approval runtime memory config and readiness as L4', () => {
  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestPacketReadinessBlockedContract(
    packetReadinessBlocked({
      blockedReadiness: Object.fromEntries(
        REQUIRED_BLOCKED_READINESS_FIELDS.map(field => [field, true])
      ),
      authorization: Object.fromEntries(REQUIRED_AUTHORIZATION_FIELDS.map(field => [field, true])),
      output: {
        raw_private_output_allowed: true,
        concrete_values_disclosed: true,
        skeleton_artifact_disclosed: true,
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
  assert.equal(result.requestPacketReadinessBlockedFixtureAccepted, false);
  assert.equal(result.requestPacketReadinessMayOpen, false);
  assert.equal(result.requestPacketReadinessBlocked, true);
  assert.equal(result.exactRequestPacketReady, false);
  assert.equal(result.requestPacketCreated, false);
  assert.equal(result.requestPacketSubmitted, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.configStartupWatchdogChanged, false);
  assert.equal(result.readinessClaimAllowed, false);
});

test('CM1893 rejects raw secret packet approval runtime memory config fields without echoing values', () => {
  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestPacketReadinessBlockedContract(
    packetReadinessBlocked({
      packet: {
        targetValue: 'SYNTHETIC_TARGET_SHOULD_NOT_ECHO'
      },
      blockedReadiness: {
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
    'forbidden_raw_secret_exact_value_packet_request_or_overclaim_fields'
  );
  assert.ok(result.forbiddenFields.includes('packet.targetValue'));
  assert.ok(result.forbiddenFields.includes('blockedReadiness.exactTarget'));
  assert.ok(result.forbiddenFields.includes('authorization.approvalLineValue'));
  assert.ok(result.forbiddenFields.includes('output.providerPayload'));
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
  assert.equal(serialized.includes('SYNTHETIC_REQUEST_PACKET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_REQUEST_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_APPROVAL_LINE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RUNTIME_COMMAND_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_MEMORY_QUERY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_CONFIG_CHANGE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RC_READY_SHOULD_NOT_ECHO'), false);
});

test('CM1893 rejects unexpected fields without echoing submitted values', () => {
  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestPacketReadinessBlockedContract(
    packetReadinessBlocked({
      extraRoot: 'SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO',
      blockedReadiness: {
        extraBlockedReadiness: 'SYNTHETIC_EXTRA_BLOCKED_SHOULD_NOT_ECHO'
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
  assert.ok(result.unexpectedFields.includes('blockedReadiness.extraBlockedReadiness'));
  assert.ok(result.unexpectedFields.includes('authorization.extraAuthorization'));
  assert.ok(result.unexpectedFields.includes('output.extraOutput'));
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_BLOCKED_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_AUTH_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_OUTPUT_SHOULD_NOT_ECHO'), false);
});

test('CM1893 rejects missing positive and malformed zero side-effect counters', () => {
  const missingFixture = packetReadinessBlocked();
  delete missingFixture.counters.providerApiCalls;

  const missingResult = validateVcpMemoryExactLiveRuntimeApprovalRequestPacketReadinessBlockedContract(
    missingFixture
  );
  assert.equal(missingResult.accepted, false);
  assert.equal(missingResult.reasonCode, 'missing_required_fields');
  assert.ok(missingResult.missingFields.includes('counters.providerApiCalls'));

  const positiveResult = validateVcpMemoryExactLiveRuntimeApprovalRequestPacketReadinessBlockedContract(
    packetReadinessBlocked({
      counters: {
        skeletonArtifactsCreated: 1,
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
  assert.ok(positiveResult.forbiddenCounters.includes('skeletonArtifactsCreated'));
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

  const malformedResult = validateVcpMemoryExactLiveRuntimeApprovalRequestPacketReadinessBlockedContract(
    packetReadinessBlocked({
      counters: {
        providerApiCalls: '0'
      }
    })
  );
  assert.equal(malformedResult.accepted, false);
  assert.equal(
    malformedResult.reasonCode,
    'invalid_exact_live_runtime_approval_request_packet_readiness_blocked_contract'
  );
  assert.ok(malformedResult.invalidFields.includes('counters.providerApiCalls'));
});

test('CM1893 rejects invalid packet fields decision mismatch and unsafe decision echo', () => {
  const invalidResult = validateVcpMemoryExactLiveRuntimeApprovalRequestPacketReadinessBlockedContract(
    packetReadinessBlocked({
      packet: {
        readiness_id: 'not-a-valid-readiness-id',
        contract_version: 'wrong',
        request_packet_readiness_blocked_fixture_only: false
      },
      output: {
        disclosure_level: 'raw'
      }
    })
  );
  assert.equal(invalidResult.accepted, false);
  assert.equal(
    invalidResult.reasonCode,
    'invalid_exact_live_runtime_approval_request_packet_readiness_blocked_contract'
  );
  assert.ok(invalidResult.invalidFields.includes('packet.readiness_id'));
  assert.ok(invalidResult.invalidFields.includes('packet.contract_version'));
  assert.ok(
    invalidResult.invalidFields.includes('packet.request_packet_readiness_blocked_fixture_only')
  );
  assert.ok(invalidResult.invalidFields.includes('output.disclosure_level'));

  const mismatchResult = validateVcpMemoryExactLiveRuntimeApprovalRequestPacketReadinessBlockedContract(
    packetReadinessBlocked({
      blockedReadiness: {
        request_packet_readiness_precondition_reviewed: false
      }
    })
  );
  assert.equal(mismatchResult.accepted, false);
  assert.equal(mismatchResult.reasonCode, 'decision_mismatch');
  assert.equal(mismatchResult.computedDecision, 'request_packet_readiness_incomplete');

  const unsafeDecisionResult = validateVcpMemoryExactLiveRuntimeApprovalRequestPacketReadinessBlockedContract(
    packetReadinessBlocked({
      expectedDecision: 'SYNTHETIC_DECISION_SHOULD_NOT_ECHO'
    })
  );
  const serialized = JSON.stringify(unsafeDecisionResult);
  assert.equal(unsafeDecisionResult.accepted, false);
  assert.equal(unsafeDecisionResult.expectedDecision, null);
  assert.equal(serialized.includes('SYNTHETIC_DECISION_SHOULD_NOT_ECHO'), false);
});

test('CM1893 locks packet readiness blocked vocabulary and no-side-effect posture', () => {
  assert.deepEqual(ALLOWED_DECISIONS, [
    'request_packet_readiness_blocked_missing_exact_request_packet_material',
    'request_packet_readiness_incomplete',
    'stop_l4'
  ]);
  assert.deepEqual(ALLOWED_NEXT_ACTIONS, [
    'cm1893_request_packet_readiness_blocked_fixture_contract',
    'cm1894_request_packet_readiness_blocked_fixture_closeout_gate_review'
  ]);
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('requestPacket'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('requestBody'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('approvalLine'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('runtimeCommand'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('memoryQuery'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('configChange'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('RC_READY'));

  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestPacketReadinessBlockedContract(
    packetReadinessBlocked()
  );
  assert.equal(result.requestPacketReadinessBlockedFixtureAccepted, true);
  assert.equal(result.requestPacketReadinessMayOpen, false);
  assert.equal(result.requestPacketReadinessBlocked, true);
  assert.equal(result.exactRequestPacketReady, false);
  assert.equal(result.exactRequestPacketPresent, false);
  assert.equal(result.requestPacketCreationAllowed, false);
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
