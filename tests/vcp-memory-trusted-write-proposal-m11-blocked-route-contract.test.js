'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_DECISIONS,
  ALLOWED_NEXT_ACTIONS,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_AUTHORIZATION_FIELDS,
  REQUIRED_BLOCKER_FIELDS,
  REQUIRED_EVIDENCE_FIELDS,
  REQUIRED_M11_ROUTE_FIELDS,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryTrustedWriteProposalM11BlockedRouteContract
} = require('../src/core/VcpMemoryTrustedWriteProposalM11BlockedRouteContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] ?? 0]));
}

function m11BlockedContract(overrides = {}) {
  const packet = {
    gate_id: 'm11_fixture_trusted_write_proposal_blocked_route_001',
    contract_version: 'vcp_memory_trusted_write_proposal_m11_blocked_route_v1',
    evidence_type: 'fixture-only',
    profile: 'trusted-write-proposal',
    non_authorizing: true,
    m11_blocked_route_only: true
  };

  const evidence = Object.fromEntries(REQUIRED_EVIDENCE_FIELDS.map(field => [field, true]));

  const m11Route = {
    local_m11_blocked_route_fixture_present: true,
    accepted_planning_evidence_present: true,
    m10_gate_blocked: true,
    m10_runtime_or_write_authorized: false,
    m10_unlocked: false,
    m11_gate_may_open: false,
    m11_gate_blocked: true,
    m11_unlocked: false,
    m15_unlocked: false,
    exact_runtime_boundary_bound: false,
    exact_memory_read_boundary_bound: false,
    exact_memory_write_boundary_bound: false,
    exact_request_body_generation_authorized: false,
    exact_request_submission_authorized: false,
    approval_line_handling_authorized: false,
    config_startup_change_authorized: false,
    proposal_receipt_accepted: false,
    runtime_attempt_performed: false,
    memory_read_performed: false,
    memory_write_performed: false,
    readiness_claimed: false,
    missing_m11_prerequisites_declared: true
  };

  const blockers = Object.fromEntries(REQUIRED_BLOCKER_FIELDS.map(field => [field, true]));

  const authorization = {
    runtime_execution_authorized: false,
    memory_read_authorized: false,
    memory_write_authorized: false,
    durable_write_authorized: false,
    provider_api_authorized: false,
    public_mcp_expansion_authorized: false,
    request_body_generation_allowed: false,
    approval_request_submission_allowed: false,
    approval_line_generation_allowed: false,
    approval_line_submission_allowed: false,
    proposal_generation_authorized: false,
    proposal_submission_authorized: false,
    config_startup_change_authorized: false,
    m11_unlocked: false,
    m15_unlocked: false,
    readiness_claimed: false
  };

  const output = {
    disclosure_level: 'redacted_m11_blocked_route',
    raw_private_output_allowed: false,
    concrete_values_disclosed: false,
    request_body_disclosed: false,
    approval_line_value_disclosed: false,
    runtime_payload_disclosed: false,
    memory_content_disclosed: false,
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
    m11Route: {
      ...m11Route,
      ...(overrides.m11Route || {})
    },
    blockers: {
      ...blockers,
      ...(overrides.blockers || {})
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
      'm11_route_blocked_missing_exact_runtime_memory_or_approval_material_authority',
    nextActionAllowed: overrides.nextActionAllowed || 'cm1850_fixture_contract',
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => ![
      'packet',
      'evidence',
      'm11Route',
      'blockers',
      'authorization',
      'output',
      'expectedDecision',
      'nextActionAllowed',
      'counters'
    ].includes(key)))
  };
}

test('CM1850 accepts blocked M11 route without runtime memory approval or config authority', () => {
  const result = validateVcpMemoryTrustedWriteProposalM11BlockedRouteContract(
    m11BlockedContract()
  );

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, 'fixture_trusted_write_proposal_m11_blocked_route_only');
  assert.equal(
    result.decision,
    'm11_route_blocked_missing_exact_runtime_memory_or_approval_material_authority'
  );
  assert.equal(result.m11BlockedRouteAccepted, true);
  assert.equal(result.m10GateBlocked, true);
  assert.equal(result.m10Unlocked, false);
  assert.equal(result.m11GateMayOpen, false);
  assert.equal(result.m11GateBlocked, true);
  assert.equal(result.m11Unlocked, false);
  assert.equal(result.m15Unlocked, false);
  assert.equal(result.exactRuntimeBoundaryBound, false);
  assert.equal(result.exactMemoryReadBoundaryBound, false);
  assert.equal(result.exactMemoryWriteBoundaryBound, false);
  assert.equal(result.approvalRequestBodyGenerated, false);
  assert.equal(result.requestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.approvalLineSubmitted, false);
  assert.equal(result.proposalGenerated, false);
  assert.equal(result.proposalSubmitted, false);
  assert.equal(result.proposalReceiptAccepted, false);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.configStartupChanged, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimAllowed, false);
});

test('CM1850 reports m11_route_incomplete when evidence or blockers are absent', () => {
  const result = validateVcpMemoryTrustedWriteProposalM11BlockedRouteContract(
    m11BlockedContract({
      evidence: {
        cm1849_m11_blocked_precondition_refresh_present: false,
        m11_preconditions_refreshed: false
      },
      m11Route: {
        local_m11_blocked_route_fixture_present: false,
        missing_m11_prerequisites_declared: false
      },
      blockers: {
        runtime_boundary_missing: false,
        m11_route_authority_missing: false
      },
      expectedDecision: 'm11_route_incomplete'
    })
  );

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'm11_route_incomplete');
  assert.equal(result.m11BlockedRouteAccepted, false);
  assert.equal(result.m11GateMayOpen, false);
  assert.equal(result.m11Unlocked, false);
  assert.equal(result.memoryWritten, false);
});

test('CM1850 stops runtime memory approval config proposal and readiness claims as L4', () => {
  const result = validateVcpMemoryTrustedWriteProposalM11BlockedRouteContract(
    m11BlockedContract({
      m11Route: Object.fromEntries(REQUIRED_M11_ROUTE_FIELDS.map(field => [field, true])),
      authorization: Object.fromEntries(REQUIRED_AUTHORIZATION_FIELDS.map(field => [field, true])),
      output: {
        raw_private_output_allowed: true,
        concrete_values_disclosed: true,
        request_body_disclosed: true,
        approval_line_value_disclosed: true,
        runtime_payload_disclosed: true,
        memory_content_disclosed: true,
        readiness_claim_allowed: true
      },
      expectedDecision: 'stop_l4'
    })
  );

  assert.equal(result.accepted, true);
  assert.equal(result.decision, 'stop_l4');
  assert.equal(result.m11BlockedRouteAccepted, false);
  assert.equal(result.m11GateMayOpen, false);
  assert.equal(result.m11Unlocked, false);
  assert.equal(result.m15Unlocked, false);
  assert.equal(result.requestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.proposalGenerated, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.configStartupChanged, false);
  assert.equal(result.readinessClaimAllowed, false);
});

test('CM1850 rejects raw secret runtime memory approval config and readiness fields without echo', () => {
  const result = validateVcpMemoryTrustedWriteProposalM11BlockedRouteContract(
    m11BlockedContract({
      packet: {
        targetValue: 'SYNTHETIC_TARGET_SHOULD_NOT_ECHO'
      },
      m11Route: {
        endpoint: 'SYNTHETIC_ENDPOINT_SHOULD_NOT_ECHO'
      },
      output: {
        providerPayload: 'SYNTHETIC_PROVIDER_SHOULD_NOT_ECHO'
      },
      authorization: {
        m11Unlocked: 'SYNTHETIC_M11_UNLOCK_SHOULD_NOT_ECHO'
      },
      requestBody: 'SYNTHETIC_REQUEST_BODY_SHOULD_NOT_ECHO',
      memoryContent: 'SYNTHETIC_MEMORY_CONTENT_SHOULD_NOT_ECHO',
      configPath: 'SYNTHETIC_CONFIG_PATH_SHOULD_NOT_ECHO',
      runtimeAuthorized: 'SYNTHETIC_RUNTIME_AUTH_SHOULD_NOT_ECHO',
      RC_READY: 'SYNTHETIC_RC_READY_SHOULD_NOT_ECHO'
    })
  );
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(
    result.reasonCode,
    'forbidden_raw_secret_runtime_memory_approval_config_or_readiness_fields'
  );
  assert.ok(result.forbiddenFields.includes('packet.targetValue'));
  assert.ok(result.forbiddenFields.includes('m11Route.endpoint'));
  assert.ok(result.forbiddenFields.includes('output.providerPayload'));
  assert.ok(result.forbiddenFields.includes('authorization.m11Unlocked'));
  assert.ok(result.forbiddenFields.includes('requestBody'));
  assert.ok(result.forbiddenFields.includes('memoryContent'));
  assert.ok(result.forbiddenFields.includes('configPath'));
  assert.ok(result.forbiddenFields.includes('runtimeAuthorized'));
  assert.ok(result.forbiddenFields.includes('RC_READY'));
  assert.equal(serialized.includes('SYNTHETIC_TARGET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_PROVIDER_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_M11_UNLOCK_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_REQUEST_BODY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_MEMORY_CONTENT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_CONFIG_PATH_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RUNTIME_AUTH_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_RC_READY_SHOULD_NOT_ECHO'), false);
});

test('CM1850 rejects unexpected fields without echoing submitted values', () => {
  const result = validateVcpMemoryTrustedWriteProposalM11BlockedRouteContract(
    m11BlockedContract({
      extraRoot: 'SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO',
      m11Route: {
        extraRoute: 'SYNTHETIC_EXTRA_ROUTE_SHOULD_NOT_ECHO'
      },
      blockers: {
        extraBlocker: 'SYNTHETIC_EXTRA_BLOCKER_SHOULD_NOT_ECHO'
      }
    })
  );
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'unexpected_fields');
  assert.ok(result.unexpectedFields.includes('extraRoot'));
  assert.ok(result.unexpectedFields.includes('m11Route.extraRoute'));
  assert.ok(result.unexpectedFields.includes('blockers.extraBlocker'));
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_ROOT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_ROUTE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_EXTRA_BLOCKER_SHOULD_NOT_ECHO'), false);
});

test('CM1850 rejects missing positive and malformed zero side-effect counters', () => {
  const missingFixture = m11BlockedContract();
  delete missingFixture.counters.providerApiCalls;

  const missingResult = validateVcpMemoryTrustedWriteProposalM11BlockedRouteContract(
    missingFixture
  );
  assert.equal(missingResult.accepted, false);
  assert.equal(missingResult.reasonCode, 'missing_required_fields');
  assert.ok(missingResult.missingFields.includes('counters.providerApiCalls'));

  const positiveResult = validateVcpMemoryTrustedWriteProposalM11BlockedRouteContract(
    m11BlockedContract({
      counters: {
        requestBodiesGenerated: 1,
        requestSubmissions: 1,
        approvalLineOperations: 1,
        proposalGenerations: 1,
        proposalReceiptsAccepted: 1,
        runtimeCalls: 1,
        memoryReads: 1,
        memoryWrites: 1,
        durableWrites: 1,
        configStartupWatchdogChanges: 1,
        m11Unlocks: 1,
        readinessClaims: 1
      }
    })
  );
  assert.equal(positiveResult.accepted, false);
  assert.equal(positiveResult.reasonCode, 'forbidden_positive_side_effect_counters');
  assert.ok(positiveResult.forbiddenCounters.includes('requestBodiesGenerated'));
  assert.ok(positiveResult.forbiddenCounters.includes('requestSubmissions'));
  assert.ok(positiveResult.forbiddenCounters.includes('approvalLineOperations'));
  assert.ok(positiveResult.forbiddenCounters.includes('proposalGenerations'));
  assert.ok(positiveResult.forbiddenCounters.includes('proposalReceiptsAccepted'));
  assert.ok(positiveResult.forbiddenCounters.includes('runtimeCalls'));
  assert.ok(positiveResult.forbiddenCounters.includes('memoryReads'));
  assert.ok(positiveResult.forbiddenCounters.includes('memoryWrites'));
  assert.ok(positiveResult.forbiddenCounters.includes('durableWrites'));
  assert.ok(positiveResult.forbiddenCounters.includes('configStartupWatchdogChanges'));
  assert.ok(positiveResult.forbiddenCounters.includes('m11Unlocks'));
  assert.ok(positiveResult.forbiddenCounters.includes('readinessClaims'));

  const malformedResult = validateVcpMemoryTrustedWriteProposalM11BlockedRouteContract(
    m11BlockedContract({
      counters: {
        providerApiCalls: '0'
      }
    })
  );
  assert.equal(malformedResult.accepted, false);
  assert.equal(malformedResult.reasonCode, 'invalid_trusted_write_proposal_m11_blocked_route_contract');
  assert.ok(malformedResult.invalidFields.includes('counters.providerApiCalls'));
});

test('CM1850 rejects invalid packet fields decision mismatch and unsafe decision echo', () => {
  const unsafeExpectedDecision = 'PRIVATE_DECISION_SHOULD_NOT_ECHO';
  const invalid = validateVcpMemoryTrustedWriteProposalM11BlockedRouteContract(
    m11BlockedContract({
      packet: {
        gate_id: 'unsafe_gate_id',
        profile: 'trusted-write',
        non_authorizing: false
      },
      output: {
        disclosure_level: 'raw'
      },
      expectedDecision: unsafeExpectedDecision,
      nextActionAllowed: 'unlock_m11'
    })
  );
  const serializedInvalid = JSON.stringify(invalid);

  assert.equal(invalid.accepted, false);
  assert.equal(invalid.reasonCode, 'invalid_trusted_write_proposal_m11_blocked_route_contract');
  assert.ok(invalid.invalidFields.includes('packet.gate_id'));
  assert.ok(invalid.invalidFields.includes('packet.profile'));
  assert.ok(invalid.invalidFields.includes('packet.non_authorizing'));
  assert.ok(invalid.invalidFields.includes('output.disclosure_level'));
  assert.ok(invalid.invalidFields.includes('expectedDecision'));
  assert.ok(invalid.invalidFields.includes('nextActionAllowed'));
  assert.equal(serializedInvalid.includes(unsafeExpectedDecision), false);

  const mismatch = validateVcpMemoryTrustedWriteProposalM11BlockedRouteContract(
    m11BlockedContract({
      m11Route: {
        m11_gate_may_open: true
      },
      expectedDecision:
        'm11_route_blocked_missing_exact_runtime_memory_or_approval_material_authority'
    })
  );

  assert.equal(mismatch.accepted, false);
  assert.equal(mismatch.reasonCode, 'decision_mismatch');
  assert.equal(mismatch.computedDecision, 'stop_l4');
  assert.ok(mismatch.invalidFields.includes('expectedDecision'));
});

test('CM1850 locks M11 blocked route vocabulary and no-side-effect posture', () => {
  const result = validateVcpMemoryTrustedWriteProposalM11BlockedRouteContract(
    m11BlockedContract()
  );

  assert.ok(ALLOWED_DECISIONS.includes(
    'm11_route_blocked_missing_exact_runtime_memory_or_approval_material_authority'
  ));
  assert.ok(ALLOWED_DECISIONS.includes('m11_route_incomplete'));
  assert.ok(ALLOWED_DECISIONS.includes('stop_l4'));
  assert.ok(ALLOWED_NEXT_ACTIONS.includes('cm1850_fixture_contract'));
  assert.ok(REQUIRED_EVIDENCE_FIELDS.includes('cm1849_m11_blocked_precondition_refresh_present'));
  assert.ok(REQUIRED_M11_ROUTE_FIELDS.includes('m11_gate_may_open'));
  assert.ok(REQUIRED_M11_ROUTE_FIELDS.includes('memory_read_performed'));
  assert.ok(REQUIRED_BLOCKER_FIELDS.includes('runtime_boundary_missing'));
  assert.ok(REQUIRED_BLOCKER_FIELDS.includes('config_startup_boundary_missing'));
  assert.ok(REQUIRED_AUTHORIZATION_FIELDS.includes('approval_line_submission_allowed'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('configStartupWatchdogChanges'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('readinessClaims'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('m11Unlocked'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('runtimeAuthorized'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('configPath'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('completeV8'));
  assert.equal(result.m10GateBlocked, true);
  assert.equal(result.m10Unlocked, false);
  assert.equal(result.m11GateMayOpen, false);
  assert.equal(result.m11GateBlocked, true);
  assert.equal(result.m11Unlocked, false);
  assert.equal(result.m15Unlocked, false);
  assert.equal(result.exactRuntimeBoundaryBound, false);
  assert.equal(result.exactMemoryReadBoundaryBound, false);
  assert.equal(result.exactMemoryWriteBoundaryBound, false);
  assert.equal(result.approvalRequestBodyGenerated, false);
  assert.equal(result.requestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.approvalLineSubmitted, false);
  assert.equal(result.approvalGranted, false);
  assert.equal(result.proposalGenerated, false);
  assert.equal(result.proposalSubmitted, false);
  assert.equal(result.proposalReceiptAccepted, false);
  assert.equal(result.runtimeWiringExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.mcpToolCalled, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableWritePerformed, false);
  assert.equal(result.configStartupChanged, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimAllowed, false);
});
