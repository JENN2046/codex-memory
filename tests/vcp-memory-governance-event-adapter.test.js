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
  ALLOWED_EVENT_TYPES,
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
        nonce: 'fixture-nonce-1652',
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
      operatorIntentScope: 'CM-1652 fixture-only governance event adapter skeleton',
      allowedAction: ACTIONS.FIXTURE_ONLY,
      expiresAt: '2026-06-11T09:00:00.000Z',
      nonce: 'single-use-nonce-1652',
      receiptId: 'CM1652-RECEIPT-001',
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
    eventId: 'vcp-governance-event-1652',
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

test('CM1652 accepts low-disclosure governance event envelope in fixture-only mode', () => {
  const result = buildVcpMemoryGovernanceEventAdapterResult(acceptedInput());

  assert.equal(result.accepted, true);
  assert.equal(result.adapterMode, 'fixture_only');
  assert.equal(result.eventType, 'governance_memory_event');
  assert.equal(result.governanceAction, 'accept_low_disclosure_event');
  assert.equal(result.lowDisclosureProjection.eventIdPresent, true);
  assert.equal(result.lowDisclosureProjection.rawContentIncluded, false);
  assert.equal(result.rawIdentifiersEchoed, false);
  assert.equal(result.recordMemoryCalled, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
});

test('CM1652 rejects raw DailyNote payload without echoing content', () => {
  const rawValue = 'RAW_DAILY_NOTE_PRIVATE_CONTENT';
  const result = buildVcpMemoryGovernanceEventAdapterResult(acceptedInput(
    lowDisclosureEnvelope({ rawDailyNoteContent: rawValue })
  ));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_or_authority_fields');
  assert.equal(serialized.includes(rawValue), false);
  assert.deepEqual(result.forbiddenFields, ['rawDailyNoteContent']);
  assert.equal(result.recordMemoryCalled, false);
});

test('CM1652 rejects raw RAG payload without echoing content', () => {
  const rawValue = 'RAW_RAG_INJECTED_CONTEXT_PRIVATE';
  const result = buildVcpMemoryGovernanceEventAdapterResult(acceptedInput(
    lowDisclosureEnvelope({ rawRagInjectedContext: rawValue })
  ));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_or_authority_fields');
  assert.equal(JSON.stringify(result).includes(rawValue), false);
  assert.deepEqual(result.forbiddenFields, ['rawRagInjectedContext']);
});

test('CM1652 rejects raw vector payload without echoing content', () => {
  const rawValue = 'RAW_VECTOR_ROW_PRIVATE';
  const result = buildVcpMemoryGovernanceEventAdapterResult(acceptedInput(
    lowDisclosureEnvelope({ rawVectorRows: [rawValue] })
  ));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_or_authority_fields');
  assert.equal(JSON.stringify(result).includes(rawValue), false);
  assert.deepEqual(result.forbiddenFields, ['rawVectorRows']);
});

test('CM1652 rejects raw prompt payload without echoing content', () => {
  const rawValue = 'RAW_PROMPT_PRIVATE';
  const result = buildVcpMemoryGovernanceEventAdapterResult(acceptedInput(
    lowDisclosureEnvelope({ rawPrompt: rawValue })
  ));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_or_authority_fields');
  assert.equal(JSON.stringify(result).includes(rawValue), false);
  assert.deepEqual(result.forbiddenFields, ['rawPrompt']);
});

test('CM1652 rejects raw classification flags before projection', () => {
  const result = buildVcpMemoryGovernanceEventAdapterResult(acceptedInput(
    lowDisclosureEnvelope({ classification: { rawDailyNoteIncluded: true } })
  ));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'raw_content_flags_must_be_false');
  assert.deepEqual(result.forbiddenFields, ['classification.rawDailyNoteIncluded']);
  assert.equal(result.rawContentIncluded, false);
  assert.equal(result.recordMemoryCalled, false);
});

test('CM1652 rejects positive broad scan counter', () => {
  const result = buildVcpMemoryGovernanceEventAdapterResult(acceptedInput(
    lowDisclosureEnvelope({ counters: { broadMemoryScans: 1 } })
  ));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_positive_counters');
  assert.deepEqual(result.forbiddenCounters, ['broadMemoryScans']);
  assert.equal(result.counters.broadMemoryScans, 0);
});

test('CM1652 rejects record_memory call intent in fixture-only no-write adapter', () => {
  const result = buildVcpMemoryGovernanceEventAdapterResult(acceptedInput(
    lowDisclosureEnvelope({ counters: { recordMemoryCalls: 1 } })
  ));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_positive_counters');
  assert.deepEqual(result.forbiddenCounters, ['recordMemoryCalls']);
  assert.equal(result.recordMemoryCalled, false);
  assert.equal(result.counters.recordMemoryCalls, 0);
});

test('CM1652 rejects live record_memory proof approval in fixture-only adapter', () => {
  const approvalGateResult = buildVcpBridgeExactApprovalGate({
    approvalPacket: {
      token: APPROVAL_TOKENS.LIVE_RECORD_MEMORY_PROOF,
      operatorIntentScope: 'CM-1652 should still reject live write approval',
      allowedAction: ACTIONS.LIVE_BRIDGE_RECORD_MEMORY_PROOF,
      expiresAt: '2026-06-11T09:00:00.000Z',
      nonce: 'single-use-nonce-1652-live-write',
      receiptId: 'CM1652-RECEIPT-LIVE-WRITE-REJECTED',
      expectedContextHash: 'context-hash-fixture',
      expectedAllowlistHash: 'allowlist-hash-fixture'
    },
    requestedAction: ACTIONS.LIVE_BRIDGE_RECORD_MEMORY_PROOF,
    expectedContextHash: 'context-hash-fixture',
    expectedAllowlistHash: 'allowlist-hash-fixture',
    now
  });
  const result = buildVcpMemoryGovernanceEventAdapterResult(acceptedInput(
    lowDisclosureEnvelope(),
    { approvalGateResult }
  ));

  assert.equal(approvalGateResult.accepted, true);
  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'live_write_approval_not_allowed_by_fixture_adapter');
  assert.deepEqual(result.forbiddenFields, ['approvalGateResult.allowedAction']);
  assert.equal(result.recordMemoryCalled, false);
});

test('CM1652 keeps output counters at zero', () => {
  const result = buildVcpMemoryGovernanceEventAdapterResult(acceptedInput(
    lowDisclosureEnvelope({ eventType: 'recall_evidence_event' })
  ));

  assert.equal(result.accepted, true);
  assert.deepEqual(result.counters, ZERO_COUNTERS);
});

test('CM1652 accepts only the seven governance event types', () => {
  for (const eventType of ALLOWED_EVENT_TYPES) {
    const result = buildVcpMemoryGovernanceEventAdapterResult(acceptedInput(
      lowDisclosureEnvelope({ eventType })
    ));
    assert.equal(result.accepted, true, eventType);
  }

  const unknown = buildVcpMemoryGovernanceEventAdapterResult(acceptedInput(
    lowDisclosureEnvelope({ eventType: 'raw_memory_sync_event' })
  ));
  assert.equal(unknown.accepted, false);
  assert.equal(unknown.reasonCode, 'unsupported_event_type');
});

test('CM1652 public MCP surface remains seven tools', () => {
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
