'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_DECISIONS,
  ALLOWED_NEXT_ACTIONS,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_SECTION_CLASS_FIELDS,
  REQUIRED_SKELETON_BOUNDARY_FIELDS,
  REQUIRED_SOURCE_FIELDS,
  REQUIRED_VALUE_BINDING_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryExactLiveRuntimeApprovalRequestPacketSkeletonBoundaryContract
} = require('../src/core/VcpMemoryExactLiveRuntimeApprovalRequestPacketSkeletonBoundaryContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] ?? 0]));
}

function skeletonBoundary(overrides = {}) {
  const packet = {
    boundary_id: 'cm1890_fixture_exact_live_runtime_approval_request_packet_skeleton_boundary_001',
    contract_version: 'vcp_memory_exact_live_runtime_approval_request_packet_skeleton_boundary_v1',
    evidence_type: 'fixture-only',
    profile: 'exact-live-runtime-approval-request-packet-skeleton-boundary',
    non_authorizing: true,
    category_only_boundary: true,
    skeleton_artifact_not_created: true
  };

  const sources = Object.fromEntries(REQUIRED_SOURCE_FIELDS.map(field => [field, true]));

  const skeletonBoundaryFields = {
    skeleton_boundary_reviewed: true,
    skeleton_boundary_category_only: true,
    skeleton_boundary_non_authorizing: true,
    section_classes_declared: true,
    section_values_forbidden_declared: true,
    approval_text_boundary_placeholder_declared: true,
    approval_line_forbidden_declared: true,
    request_body_forbidden_declared: true,
    runtime_forbidden_declared: true,
    memory_forbidden_declared: true,
    config_forbidden_declared: true,
    abort_condition_categories_declared: true,
    validation_evidence_references_declared: true,
    false_zero_counter_policy_declared: true,
    future_fixture_or_closeout_allowed: true,
    skeleton_artifact_creation_allowed: false,
    request_packet_creation_allowed: false,
    request_assembly_allowed: false
  };

  const sectionClasses = Object.fromEntries(
    REQUIRED_SECTION_CLASS_FIELDS.map(field => [field, true])
  );
  const valueBinding = Object.fromEntries(
    REQUIRED_VALUE_BINDING_FIELDS.map(field => [field, false])
  );
  const authorization = Object.fromEntries(
    REQUIRED_AUTHORIZATION_FIELDS.map(field => [field, false])
  );

  const output = {
    disclosure_level: 'request_packet_skeleton_sections_only',
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
    sources: {
      ...sources,
      ...(overrides.sources || {})
    },
    skeletonBoundary: {
      ...skeletonBoundaryFields,
      ...(overrides.skeletonBoundary || {})
    },
    sectionClasses: {
      ...sectionClasses,
      ...(overrides.sectionClasses || {})
    },
    valueBinding: {
      ...valueBinding,
      ...(overrides.valueBinding || {})
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
      'request_packet_skeleton_boundary_accepted_category_only_non_authorizing',
    nextActionAllowed:
      overrides.nextActionAllowed || 'cm1890_request_packet_skeleton_fixture_contract',
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => ![
      'packet',
      'sources',
      'skeletonBoundary',
      'sectionClasses',
      'valueBinding',
      'authorization',
      'output',
      'expectedDecision',
      'nextActionAllowed',
      'counters'
    ].includes(key)))
  };
}

test('CM1890 accepts request packet skeleton boundary as category-only fixture', () => {
  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestPacketSkeletonBoundaryContract(
    skeletonBoundary()
  );

  assert.equal(result.accepted, true);
  assert.equal(
    result.contractMode,
    'fixture_exact_live_runtime_approval_request_packet_skeleton_boundary_only'
  );
  assert.equal(
    result.decision,
    'request_packet_skeleton_boundary_accepted_category_only_non_authorizing'
  );
  assert.equal(result.requestPacketSkeletonBoundaryAccepted, true);
  assert.equal(result.nonAuthorizingCategoryBoundaryOnly, true);
  assert.equal(result.skeletonSectionsOnly, true);
  assert.equal(result.skeletonArtifactCreationAllowed, false);
  assert.equal(result.skeletonArtifactCreated, false);
  assert.equal(result.skeletonRendered, false);
  assert.equal(result.skeletonStored, false);
  assert.equal(result.requestPacketCreationAllowed, false);
  assert.equal(result.requestPacketCreated, false);
  assert.equal(result.requestPacketRendered, false);
  assert.equal(result.requestPacketStored, false);
  assert.equal(result.requestPacketSubmitted, false);
  assert.equal(result.requestAssemblyAllowed, false);
  assert.equal(result.liveValuesBound, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.approvalLineSubmitted, false);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.configStartupWatchdogChanged, false);
  assert.equal(result.readinessClaimAllowed, false);
});

test('CM1890 reports incomplete when source boundary or section classes are absent', () => {
  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestPacketSkeletonBoundaryContract(
    skeletonBoundary({
      sources: {
        cm1889_skeleton_review_boundary_present: false,
        validation_cmv1992_present: false
      },
      skeletonBoundary: {
        skeleton_boundary_reviewed: false,
        section_classes_declared: false,
        future_fixture_or_closeout_allowed: false
      },
      sectionClasses: {
        target_alias_class_placeholder_named: false,
        future_approval_text_boundary_placeholder_named: false
      },
      expectedDecision: 'request_packet_skeleton_boundary_incomplete'
    })
  );

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'request_packet_skeleton_boundary_incomplete');
  assert.equal(result.requestPacketSkeletonBoundaryAccepted, false);
  assert.equal(result.skeletonArtifactCreated, false);
  assert.equal(result.requestPacketCreated, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1890 stops skeleton packet values approval runtime memory config and readiness as L4', () => {
  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestPacketSkeletonBoundaryContract(
    skeletonBoundary({
      skeletonBoundary: Object.fromEntries(
        REQUIRED_SKELETON_BOUNDARY_FIELDS.map(field => [field, true])
      ),
      valueBinding: Object.fromEntries(REQUIRED_VALUE_BINDING_FIELDS.map(field => [field, true])),
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
  assert.equal(result.requestPacketSkeletonBoundaryAccepted, false);
  assert.equal(result.skeletonArtifactCreationAllowed, false);
  assert.equal(result.skeletonArtifactCreated, false);
  assert.equal(result.skeletonRendered, false);
  assert.equal(result.requestPacketCreated, false);
  assert.equal(result.requestPacketSubmitted, false);
  assert.equal(result.requestBodyGenerated, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.approvalLineSubmitted, false);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.readinessClaimAllowed, false);
});

test('CM1890 rejects raw secret skeleton request approval runtime memory config fields without echoing values', () => {
  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestPacketSkeletonBoundaryContract(
    skeletonBoundary({
      packet: {
        targetValue: 'SYNTHETIC_TARGET_SHOULD_NOT_ECHO'
      },
      valueBinding: {
        exactTarget: 'SYNTHETIC_EXACT_TARGET_SHOULD_NOT_ECHO'
      },
      authorization: {
        approvalLineValue: 'SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'
      },
      output: {
        providerPayload: 'SYNTHETIC_PROVIDER_SHOULD_NOT_ECHO'
      },
      skeletonArtifact: 'SYNTHETIC_SKELETON_SHOULD_NOT_ECHO',
      requestPacket: 'SYNTHETIC_REQUEST_PACKET_SHOULD_NOT_ECHO',
      requestBody: 'SYNTHETIC_REQUEST_BODY_SHOULD_NOT_ECHO',
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
    'forbidden_raw_secret_exact_value_skeleton_request_or_overclaim_fields'
  );
  assert.ok(result.forbiddenFields.includes('packet.targetValue'));
  assert.ok(result.forbiddenFields.includes('valueBinding.exactTarget'));
  assert.ok(result.forbiddenFields.includes('authorization.approvalLineValue'));
  assert.ok(result.forbiddenFields.includes('output.providerPayload'));
  assert.ok(result.forbiddenFields.includes('skeletonArtifact'));
  assert.ok(result.forbiddenFields.includes('requestPacket'));
  assert.ok(result.forbiddenFields.includes('requestBody'));
  assert.ok(result.forbiddenFields.includes('runtimeCommand'));
  assert.ok(result.forbiddenFields.includes('memoryQuery'));
  assert.ok(result.forbiddenFields.includes('configChange'));
  assert.ok(result.forbiddenFields.includes('RC_READY'));
  assert.equal(serialized.includes('SYNTHETIC_TARGET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXACT_TARGET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_PROVIDER_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_SKELETON_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_REQUEST_PACKET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_REQUEST_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RUNTIME_COMMAND_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_MEMORY_QUERY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_CONFIG_CHANGE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RC_READY_SHOULD_NOT_ECHO'), false);
});

test('CM1890 rejects unexpected fields without echoing submitted values', () => {
  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestPacketSkeletonBoundaryContract(
    skeletonBoundary({
      extraRoot: 'SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO',
      skeletonBoundary: {
        extraBoundary: 'SYNTHETIC_EXTRA_BOUNDARY_SHOULD_NOT_ECHO'
      },
      sectionClasses: {
        extraSection: 'SYNTHETIC_EXTRA_SECTION_SHOULD_NOT_ECHO'
      },
      valueBinding: {
        extraValue: 'SYNTHETIC_EXTRA_VALUE_SHOULD_NOT_ECHO'
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
  assert.ok(result.unexpectedFields.includes('skeletonBoundary.extraBoundary'));
  assert.ok(result.unexpectedFields.includes('sectionClasses.extraSection'));
  assert.ok(result.unexpectedFields.includes('valueBinding.extraValue'));
  assert.ok(result.unexpectedFields.includes('authorization.extraAuthorization'));
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_BOUNDARY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_SECTION_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_AUTH_SHOULD_NOT_ECHO'), false);
});

test('CM1890 rejects missing positive and malformed zero side-effect counters', () => {
  const missingFixture = skeletonBoundary();
  delete missingFixture.counters.providerApiCalls;

  const missingResult = validateVcpMemoryExactLiveRuntimeApprovalRequestPacketSkeletonBoundaryContract(
    missingFixture
  );
  assert.equal(missingResult.accepted, false);
  assert.equal(missingResult.reasonCode, 'missing_required_fields');
  assert.ok(missingResult.missingFields.includes('counters.providerApiCalls'));

  const positiveResult = validateVcpMemoryExactLiveRuntimeApprovalRequestPacketSkeletonBoundaryContract(
    skeletonBoundary({
      counters: {
        skeletonArtifactsCreated: 1,
        skeletonRenders: 1,
        requestPacketsCreated: 1,
        requestPacketSubmissions: 1,
        requestBodiesGenerated: 1,
        requestSubmissions: 1,
        approvalLineOperations: 1,
        runtimeCalls: 1,
        memoryWrites: 1,
        durableWrites: 1,
        configStartupWatchdogChanges: 1,
        releaseDeployCutoverPushActions: 1
      }
    })
  );
  assert.equal(positiveResult.accepted, false);
  assert.equal(positiveResult.reasonCode, 'forbidden_positive_side_effect_counters');
  assert.ok(positiveResult.forbiddenCounters.includes('skeletonArtifactsCreated'));
  assert.ok(positiveResult.forbiddenCounters.includes('skeletonRenders'));
  assert.ok(positiveResult.forbiddenCounters.includes('requestPacketsCreated'));
  assert.ok(positiveResult.forbiddenCounters.includes('requestPacketSubmissions'));
  assert.ok(positiveResult.forbiddenCounters.includes('requestBodiesGenerated'));
  assert.ok(positiveResult.forbiddenCounters.includes('requestSubmissions'));
  assert.ok(positiveResult.forbiddenCounters.includes('approvalLineOperations'));
  assert.ok(positiveResult.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(positiveResult.forbiddenCounters.includes('memoryWrites'));
  assert.ok(positiveResult.forbiddenCounters.includes('durableWrites'));
  assert.ok(positiveResult.forbiddenCounters.includes('configStartupWatchdogChanges'));
  assert.ok(positiveResult.forbiddenCounters.includes('releaseDeployCutoverPushActions'));

  const malformedResult = validateVcpMemoryExactLiveRuntimeApprovalRequestPacketSkeletonBoundaryContract(
    skeletonBoundary({
      counters: {
        providerApiCalls: '0'
      }
    })
  );
  assert.equal(malformedResult.accepted, false);
  assert.equal(
    malformedResult.reasonCode,
    'invalid_exact_live_runtime_approval_request_packet_skeleton_boundary_contract'
  );
  assert.ok(malformedResult.invalidFields.includes('counters.providerApiCalls'));
});

test('CM1890 rejects invalid packet fields decision mismatch and unsafe decision echo', () => {
  const invalidResult = validateVcpMemoryExactLiveRuntimeApprovalRequestPacketSkeletonBoundaryContract(
    skeletonBoundary({
      packet: {
        boundary_id: 'not-a-valid-boundary-id',
        contract_version: 'wrong',
        skeleton_artifact_not_created: false
      },
      output: {
        disclosure_level: 'raw'
      }
    })
  );
  assert.equal(invalidResult.accepted, false);
  assert.equal(
    invalidResult.reasonCode,
    'invalid_exact_live_runtime_approval_request_packet_skeleton_boundary_contract'
  );
  assert.ok(invalidResult.invalidFields.includes('packet.boundary_id'));
  assert.ok(invalidResult.invalidFields.includes('packet.contract_version'));
  assert.ok(invalidResult.invalidFields.includes('packet.skeleton_artifact_not_created'));
  assert.ok(invalidResult.invalidFields.includes('output.disclosure_level'));

  const mismatchResult = validateVcpMemoryExactLiveRuntimeApprovalRequestPacketSkeletonBoundaryContract(
    skeletonBoundary({
      skeletonBoundary: {
        skeleton_boundary_reviewed: false
      }
    })
  );
  assert.equal(mismatchResult.accepted, false);
  assert.equal(mismatchResult.reasonCode, 'decision_mismatch');
  assert.equal(mismatchResult.computedDecision, 'request_packet_skeleton_boundary_incomplete');

  const unsafeDecisionResult = validateVcpMemoryExactLiveRuntimeApprovalRequestPacketSkeletonBoundaryContract(
    skeletonBoundary({
      expectedDecision: 'SYNTHETIC_DECISION_SHOULD_NOT_ECHO'
    })
  );
  const serialized = JSON.stringify(unsafeDecisionResult);
  assert.equal(unsafeDecisionResult.accepted, false);
  assert.equal(unsafeDecisionResult.expectedDecision, null);
  assert.equal(serialized.includes('SYNTHETIC_DECISION_SHOULD_NOT_ECHO'), false);
});

test('CM1890 locks request packet skeleton boundary vocabulary and no-side-effect posture', () => {
  assert.deepEqual(ALLOWED_DECISIONS, [
    'request_packet_skeleton_boundary_accepted_category_only_non_authorizing',
    'request_packet_skeleton_boundary_incomplete',
    'stop_l4'
  ]);
  assert.deepEqual(ALLOWED_NEXT_ACTIONS, [
    'cm1890_request_packet_skeleton_fixture_contract',
    'cm1891_request_packet_skeleton_fixture_closeout_gate_review'
  ]);
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('requestPacketSkeleton'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('skeletonArtifact'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('requestPacket'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('requestBody'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('approvalLine'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('runtimeCommand'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('memoryQuery'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('configChange'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('RC_READY'));

  const result = validateVcpMemoryExactLiveRuntimeApprovalRequestPacketSkeletonBoundaryContract(
    skeletonBoundary()
  );
  assert.equal(result.requestPacketSkeletonBoundaryAccepted, true);
  assert.equal(result.skeletonArtifactCreationAllowed, false);
  assert.equal(result.skeletonArtifactCreated, false);
  assert.equal(result.skeletonRendered, false);
  assert.equal(result.skeletonStored, false);
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
  assert.equal(result.memoryRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableWritePerformed, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.configStartupWatchdogChanged, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.releaseDeployCutoverPushPerformed, false);
  assert.equal(result.readinessClaimAllowed, false);
});
