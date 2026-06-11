'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  BRIDGE_OWNED_REQUEST_SOURCE,
  buildVcpBridgeTrustedExecutionContext
} = require('../src/core/VcpBridgeTrustedExecutionContext');
const {
  PROOF_TYPE,
  buildVcpBridgeTrustedContextHash,
  buildVcpBridgeTrustedContextProofPreflight
} = require('../src/core/VcpBridgeTrustedContextProofPreflight');
const {
  ACTIONS,
  APPROVAL_TOKENS,
  buildVcpBridgeExactApprovalGate
} = require('../src/core/VcpBridgeExactApprovalGate');
const {
  buildVcpBridgeLiveNoWriteProbePlan
} = require('../src/core/VcpBridgeLiveNoWriteProbePlan');

const now = '2026-06-11T08:00:00.000Z';
const bridgeRuntimeContext = Object.freeze({
  agentAlias: 'Codex',
  agentId: 'vcp-bridge-agent',
  requestSource: BRIDGE_OWNED_REQUEST_SOURCE,
  projectId: 'codex-memory',
  workspaceId: 'workspace-alpha',
  clientId: 'codex-desktop'
});
const bridgeAllowlist = Object.freeze({
  agentAlias: ['Codex'],
  agentIds: ['vcp-bridge-agent'],
  requestSources: [BRIDGE_OWNED_REQUEST_SOURCE],
  projectIds: ['codex-memory'],
  workspaceIds: ['workspace-alpha'],
  clientIds: ['codex-desktop']
});

function acceptedAdapterResult() {
  return buildVcpBridgeTrustedExecutionContext({
    bridgeRuntimeContext,
    bridgeStaticConfig: {},
    bridgeAllowlist
  });
}

function acceptedProofPreflight(adapterResult = acceptedAdapterResult()) {
  const contextHash = buildVcpBridgeTrustedContextHash({
    executionContext: adapterResult.executionContext,
    bridgeAllowlist
  });
  return buildVcpBridgeTrustedContextProofPreflight({
    proofPacket: {
      proofType: PROOF_TYPE,
      fixtureOnly: true,
      staticAllowlist: bridgeAllowlist,
      signedContext: {
        issuedAt: '2026-06-11T07:00:00.000Z',
        expiresAt: '2026-06-11T09:00:00.000Z',
        nonce: 'fixture-nonce-001',
        bridgeInstanceId: 'fixture-bridge-instance',
        contextHash,
        signaturePresent: true,
        signatureVerified: false
      }
    },
    adapterResult,
    now
  });
}

function acceptedApprovalGate() {
  return buildVcpBridgeExactApprovalGate({
    approvalPacket: {
      token: APPROVAL_TOKENS.LIVE_NO_WRITE,
      operatorIntentScope: 'CM-1649 live bridge no-write probe design',
      allowedAction: ACTIONS.LIVE_BRIDGE_PROBE_NO_WRITE,
      expiresAt: '2026-06-11T09:00:00.000Z',
      nonce: 'single-use-nonce-001',
      receiptId: 'CM1649-RECEIPT-001',
      expectedContextHash: 'context-hash-fixture',
      expectedAllowlistHash: 'allowlist-hash-fixture'
    },
    requestedAction: ACTIONS.LIVE_BRIDGE_PROBE_NO_WRITE,
    expectedContextHash: 'context-hash-fixture',
    expectedAllowlistHash: 'allowlist-hash-fixture',
    now
  });
}

function acceptedProbeInput(overrides = {}) {
  const adapterResult = acceptedAdapterResult();
  return {
    adapterResult,
    proofPreflightResult: acceptedProofPreflight(adapterResult),
    approvalGateResult: acceptedApprovalGate(),
    ...overrides
  };
}

test('CM1649 plans no-write probe when approval proof and adapter are accepted', () => {
  const result = buildVcpBridgeLiveNoWriteProbePlan(acceptedProbeInput());

  assert.equal(result.accepted, true);
  assert.equal(result.actionPlanOnly, true);
  assert.equal(result.action, ACTIONS.LIVE_BRIDGE_PROBE_NO_WRITE);
  assert.equal(result.bridgeReachabilityExecuted, false);
  assert.equal(result.bridgeReachabilityCheck, 'design_only_not_executed');
  assert.equal(result.recordMemoryCalled, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.bearerTokenMaterialAccepted, false);
});

test('CM1649 rejects missing approval gate', () => {
  const input = acceptedProbeInput();
  delete input.approvalGateResult;
  const result = buildVcpBridgeLiveNoWriteProbePlan(input);

  assert.equal(result.accepted, false);
  assert.equal(result.lowDisclosureRejection.reason, 'required_preflight_not_accepted');
  assert.deepEqual(result.missingFields, ['approvalGateResult']);
});

test('CM1649 rejects live record_memory proof request in no-write plan', () => {
  const result = buildVcpBridgeLiveNoWriteProbePlan(acceptedProbeInput({
    requestedAction: ACTIONS.LIVE_BRIDGE_RECORD_MEMORY_PROOF
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.lowDisclosureRejection.reason, 'live_record_memory_proof_not_allowed_by_no_write_probe');
  assert.equal(result.recordMemoryCalled, false);
});

test('CM1649 rejects any write intent', () => {
  const result = buildVcpBridgeLiveNoWriteProbePlan(acceptedProbeInput({
    writeIntent: true
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.lowDisclosureRejection.reason, 'forbidden_probe_intent');
  assert.deepEqual(result.forbiddenFields, ['writeIntent']);
  assert.equal(result.counters.recordMemoryWritesPlanned, 0);
});

test('CM1649 rejects provider API intent', () => {
  const result = buildVcpBridgeLiveNoWriteProbePlan(acceptedProbeInput({
    providerApiFlag: true
  }));

  assert.equal(result.accepted, false);
  assert.deepEqual(result.forbiddenFields, ['providerApiFlag']);
  assert.equal(result.providerApiCalled, false);
});

test('CM1649 rejects bearer token material flag', () => {
  const result = buildVcpBridgeLiveNoWriteProbePlan(acceptedProbeInput({
    bearerTokenMaterialFlag: true
  }));

  assert.equal(result.accepted, false);
  assert.deepEqual(result.forbiddenFields, ['bearerTokenMaterialFlag']);
  assert.equal(result.bearerTokenMaterialAccepted, false);
});

test('CM1649 rejects raw and broad scan flags', () => {
  const result = buildVcpBridgeLiveNoWriteProbePlan(acceptedProbeInput({
    rawScanFlag: true,
    broadScanFlag: true
  }));

  assert.equal(result.accepted, false);
  assert.deepEqual(result.forbiddenFields, ['rawScanFlag', 'broadScanFlag']);
  assert.equal(result.rawScanAllowed, false);
  assert.equal(result.broadScanAllowed, false);
});

test('CM1649 output counters all stay zero', () => {
  const result = buildVcpBridgeLiveNoWriteProbePlan(acceptedProbeInput());

  assert.equal(result.accepted, true);
  for (const value of Object.values(result.counters)) {
    assert.equal(value, 0);
  }
});

test('CM1649 public MCP surface remains seven tools', () => {
  assert.deepEqual(TOOL_DEFINITIONS.map(tool => tool.name).sort(), [
    'audit_memory',
    'memory_overview',
    'record_memory',
    'search_memory',
    'supersede_memory',
    'tombstone_memory',
    'validate_memory'
  ]);
});
