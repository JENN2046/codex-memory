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
  ZERO_COUNTERS,
  buildVcpMemoryGovernanceEventAdapterResult
} = require('../src/core/VcpMemoryGovernanceEventAdapter');

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
        nonce: 'fixture-nonce-1653',
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
      token: APPROVAL_TOKENS.FIXTURE,
      operatorIntentScope: 'CM-1653 fixture-only low-disclosure receipt tests',
      allowedAction: ACTIONS.FIXTURE_ONLY,
      expiresAt: '2026-06-11T09:00:00.000Z',
      nonce: 'single-use-nonce-1653',
      receiptId: 'CM1653-RECEIPT-001',
      expectedContextHash: 'context-hash-fixture',
      expectedAllowlistHash: 'allowlist-hash-fixture'
    },
    requestedAction: ACTIONS.FIXTURE_ONLY,
    expectedContextHash: 'context-hash-fixture',
    expectedAllowlistHash: 'allowlist-hash-fixture',
    now
  });
}

function lowDisclosureEnvelope(overrides = {}) {
  return {
    schemaVersion: 1,
    eventId: 'vcp-governance-event-1653',
    eventType: 'governance_memory_event',
    sourceSystem: 'VCPToolBox',
    sourceComponent: 'RAGDiaryPlugin',
    occurredAt: '2026-06-11T08:00:00.000Z',
    classification: {
      lowDisclosure: true,
      rawContentIncluded: false,
      rawDailyNoteIncluded: false,
      rawRagIncluded: false,
      rawVectorIncluded: false,
      rawPromptIncluded: false,
      ...(overrides.classification || {})
    },
    bridge: {
      requestSource: 'vcp-bridge',
      bridgeInstanceIdPresent: true,
      contextHashPresent: true,
      allowlistHashPresent: true,
      approvalReceiptIdPresent: true,
      ...(overrides.bridge || {})
    },
    principal: {
      agentAlias: 'Codex',
      agentIdPresent: true,
      projectIdPresent: true,
      workspaceIdPresent: true,
      clientIdPresent: true,
      ...(overrides.principal || {})
    },
    decision: {
      status: 'accepted',
      reasonCode: 'bounded_governance_event',
      ...(overrides.decision || {})
    },
    counters: {
      rawDailyNoteReads: 0,
      rawRagPayloads: 0,
      rawVectorReads: 0,
      rawPromptReads: 0,
      broadMemoryScans: 0,
      recordMemoryCalls: 0,
      recordMemoryWrites: 0,
      providerApiCalls: 0,
      publicMcpExpansions: 0,
      confirmedMutations: 0,
      ...(overrides.counters || {})
    },
    ...Object.fromEntries(
      Object.entries(overrides).filter(([key]) => ![
        'classification',
        'bridge',
        'principal',
        'decision',
        'counters'
      ].includes(key))
    )
  };
}

function acceptedInput(envelope = lowDisclosureEnvelope(), overrides = {}) {
  const adapterResult = acceptedAdapterResult();
  return {
    adapterResult,
    proofPreflightResult: acceptedProofPreflight(adapterResult),
    approvalGateResult: acceptedApprovalGate(),
    vcpMemoryGovernanceEventEnvelope: envelope,
    ...overrides
  };
}

function assertDoesNotEchoValues(result, values) {
  const serialized = JSON.stringify(result);
  for (const value of values) {
    assert.equal(
      serialized.includes(String(value)),
      false,
      `receipt echoed forbidden value ${value}`
    );
  }
}

test('CM1653 rejected receipt does not echo raw DailyNote RAG vector or prompt content', () => {
  const secretValues = [
    'CM1653_RAW_DAILY_NOTE_PRIVATE',
    'CM1653_RAW_RAG_CONTEXT_PRIVATE',
    'CM1653_RAW_VECTOR_ROW_PRIVATE',
    'CM1653_RAW_PROMPT_PRIVATE'
  ];
  const result = buildVcpMemoryGovernanceEventAdapterResult(acceptedInput(
    lowDisclosureEnvelope({
      rawDailyNoteContent: secretValues[0],
      rawRagInjectedContext: secretValues[1],
      rawVectorRows: [secretValues[2]],
      rawPrompt: secretValues[3]
    })
  ));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_or_authority_fields');
  assert.deepEqual(result.forbiddenFields.sort(), [
    'rawDailyNoteContent',
    'rawPrompt',
    'rawRagInjectedContext',
    'rawVectorRows'
  ].sort());
  assertDoesNotEchoValues(result, secretValues);
  assert.equal(result.rawContentIncluded, false);
  assert.equal(result.rawIdentifiersEchoed, false);
  assert.equal(result.recordMemoryCalled, false);
  assert.equal(result.publicMcpExpanded, false);
});

test('CM1653 rejected receipt does not echo raw ids paths tokens provider values or private keys', () => {
  const secretValues = [
    'CM1653_RAW_WORKSPACE_ID_PRIVATE',
    'A:\\private\\DailyNote\\2026-06-11.md',
    'CM1653_BEARER_TOKEN_PRIVATE',
    'CM1653_PROVIDER_API_KEY_PRIVATE',
    'CM1653_PRIVATE_KEY_MATERIAL'
  ];
  const result = buildVcpMemoryGovernanceEventAdapterResult(acceptedInput(
    lowDisclosureEnvelope({
      rawWorkspaceId: secretValues[0],
      rawDailyNotePath: secretValues[1],
      bearerToken: secretValues[2],
      providerApiKey: secretValues[3],
      nested: {
        privateKey: secretValues[4]
      }
    })
  ));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_or_authority_fields');
  assert.deepEqual(result.forbiddenFields.sort(), [
    'bearerToken',
    'nested.privateKey',
    'providerApiKey',
    'rawDailyNotePath',
    'rawWorkspaceId'
  ].sort());
  assertDoesNotEchoValues(result, secretValues);
  assert.equal(result.lowDisclosureRejection.lowDisclosure, true);
  assert.equal(result.recordMemoryCalled, false);
  assert.equal(result.publicMcpExpanded, false);
});

test('CM1653 forbiddenFields returns only field names or paths and never raw values', () => {
  const rawValue = 'CM1653_DEEP_RAW_VECTOR_VALUE_PRIVATE';
  const result = buildVcpMemoryGovernanceEventAdapterResult(acceptedInput(
    lowDisclosureEnvelope({
      metadata: {
        deeper: {
          rawVectorRows: [rawValue]
        }
      }
    })
  ));

  assert.equal(result.accepted, false);
  assert.deepEqual(result.forbiddenFields, ['metadata.deeper.rawVectorRows']);
  assert.deepEqual(result.lowDisclosureRejection.forbiddenFields, ['metadata.deeper.rawVectorRows']);
  assert.equal(result.forbiddenFields.includes(rawValue), false);
  assertDoesNotEchoValues(result, [rawValue]);
});

test('CM1653 forbiddenCounters returns only counter names and output counters stay zero', () => {
  const forbiddenCounterValues = [987654, 456789, 333333];
  const result = buildVcpMemoryGovernanceEventAdapterResult(acceptedInput(
    lowDisclosureEnvelope({
      counters: {
        rawVectorReads: forbiddenCounterValues[0],
        providerApiCalls: forbiddenCounterValues[1],
        publicMcpExpansions: forbiddenCounterValues[2]
      }
    })
  ));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_positive_counters');
  assert.deepEqual(result.forbiddenCounters.sort(), [
    'providerApiCalls',
    'publicMcpExpansions',
    'rawVectorReads'
  ].sort());
  assert.deepEqual(result.lowDisclosureRejection.forbiddenCounters.sort(), result.forbiddenCounters.sort());
  assert.deepEqual(result.counters, ZERO_COUNTERS);
  assertDoesNotEchoValues(result, forbiddenCounterValues);
  assert.equal(result.recordMemoryCalled, false);
  assert.equal(result.publicMcpExpanded, false);
});

test('CM1653 accepted projection contains only low-disclosure fields', () => {
  const result = buildVcpMemoryGovernanceEventAdapterResult(acceptedInput(
    lowDisclosureEnvelope({ eventType: 'recall_evidence_event' })
  ));

  assert.equal(result.accepted, true);
  assert.deepEqual(Object.keys(result.lowDisclosureProjection).sort(), [
    'eventIdPresent',
    'eventType',
    'rawContentIncluded',
    'rawIdentifiersEchoed',
    'sourceComponent',
    'sourceSystem'
  ].sort());
  assert.deepEqual(result.lowDisclosureProjection, {
    eventIdPresent: true,
    sourceSystem: 'VCPToolBox',
    sourceComponent: 'RAGDiaryPlugin',
    eventType: 'recall_evidence_event',
    rawContentIncluded: false,
    rawIdentifiersEchoed: false
  });
  assert.equal(result.lowDisclosureRejection, null);
  assert.equal(result.recordMemoryCalled, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.providerApiCalled, false);
});

test('CM1653 public MCP surface remains seven tools', () => {
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
