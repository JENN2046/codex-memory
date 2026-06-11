'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  ACTIONS,
  APPROVAL_TOKENS,
  buildVcpBridgeExactApprovalGate
} = require('../src/core/VcpBridgeExactApprovalGate');

const now = '2026-06-11T08:00:00.000Z';
const expectedContextHash = 'context-hash-fixture';
const expectedAllowlistHash = 'allowlist-hash-fixture';

function approvalPacket(overrides = {}) {
  return {
    token: APPROVAL_TOKENS.FIXTURE,
    operatorIntentScope: 'CM-1648 fixture-only exact approval gate design',
    allowedAction: ACTIONS.FIXTURE_ONLY,
    expiresAt: '2026-06-11T09:00:00.000Z',
    nonce: 'single-use-nonce-001',
    receiptId: 'CM1648-RECEIPT-001',
    expectedContextHash,
    expectedAllowlistHash,
    ...overrides
  };
}

test('CM1648 rejects missing approval token', () => {
  const packet = approvalPacket();
  delete packet.token;
  const result = buildVcpBridgeExactApprovalGate({
    approvalPacket: packet,
    requestedAction: ACTIONS.FIXTURE_ONLY,
    expectedContextHash,
    expectedAllowlistHash,
    now
  });

  assert.equal(result.accepted, false);
  assert.equal(result.lowDisclosureRejection.reason, 'approval_packet_incomplete');
  assert.deepEqual(result.missingFields, ['token']);
  assert.equal(result.approvalConsumable, false);
});

test('CM1648 rejects wrong approval token', () => {
  const result = buildVcpBridgeExactApprovalGate({
    approvalPacket: approvalPacket({ token: 'WRONG_TOKEN' }),
    requestedAction: ACTIONS.FIXTURE_ONLY,
    expectedContextHash,
    expectedAllowlistHash,
    now
  });

  assert.equal(result.accepted, false);
  assert.equal(result.lowDisclosureRejection.reason, 'approval_token_mismatch');
  assert.deepEqual(result.mismatchedFields, ['token']);
});

test('CM1648 rejects expired approval', () => {
  const result = buildVcpBridgeExactApprovalGate({
    approvalPacket: approvalPacket({ expiresAt: '2026-06-11T07:59:59.000Z' }),
    requestedAction: ACTIONS.FIXTURE_ONLY,
    expectedContextHash,
    expectedAllowlistHash,
    now
  });

  assert.equal(result.accepted, false);
  assert.equal(result.lowDisclosureRejection.reason, 'approval_expired');
});

test('CM1648 rejects wrong context hash', () => {
  const result = buildVcpBridgeExactApprovalGate({
    approvalPacket: approvalPacket({ expectedContextHash: 'wrong-context-hash' }),
    requestedAction: ACTIONS.FIXTURE_ONLY,
    expectedContextHash,
    expectedAllowlistHash,
    now
  });

  assert.equal(result.accepted, false);
  assert.equal(result.lowDisclosureRejection.reason, 'approval_hash_mismatch');
  assert.deepEqual(result.mismatchedFields, ['expectedContextHash']);
});

test('CM1648 accepts fixture_only with fixture token', () => {
  const result = buildVcpBridgeExactApprovalGate({
    approvalPacket: approvalPacket(),
    requestedAction: ACTIONS.FIXTURE_ONLY,
    expectedContextHash,
    expectedAllowlistHash,
    now
  });

  assert.equal(result.accepted, true);
  assert.equal(result.allowedAction, ACTIONS.FIXTURE_ONLY);
  assert.equal(result.exactApprovalTokenName, APPROVAL_TOKENS.FIXTURE);
  assert.equal(result.approvalConsumable, true);
  assert.equal(result.productionStrictDefaultEnabled, false);
  assert.equal(result.recordMemoryCalled, false);
});

test('CM1648 live bridge no-write requires stronger token', () => {
  const weak = buildVcpBridgeExactApprovalGate({
    approvalPacket: approvalPacket({ allowedAction: ACTIONS.LIVE_BRIDGE_PROBE_NO_WRITE }),
    requestedAction: ACTIONS.LIVE_BRIDGE_PROBE_NO_WRITE,
    expectedContextHash,
    expectedAllowlistHash,
    now
  });
  const strong = buildVcpBridgeExactApprovalGate({
    approvalPacket: approvalPacket({
      token: APPROVAL_TOKENS.LIVE_NO_WRITE,
      allowedAction: ACTIONS.LIVE_BRIDGE_PROBE_NO_WRITE
    }),
    requestedAction: ACTIONS.LIVE_BRIDGE_PROBE_NO_WRITE,
    expectedContextHash,
    expectedAllowlistHash,
    now
  });

  assert.equal(weak.accepted, false);
  assert.equal(weak.lowDisclosureRejection.reason, 'approval_token_mismatch');
  assert.equal(strong.accepted, true);
  assert.equal(strong.allowedAction, ACTIONS.LIVE_BRIDGE_PROBE_NO_WRITE);
});

test('CM1648 live record_memory proof requires exact live-write token', () => {
  const noWriteToken = buildVcpBridgeExactApprovalGate({
    approvalPacket: approvalPacket({
      token: APPROVAL_TOKENS.LIVE_NO_WRITE,
      allowedAction: ACTIONS.LIVE_BRIDGE_RECORD_MEMORY_PROOF
    }),
    requestedAction: ACTIONS.LIVE_BRIDGE_RECORD_MEMORY_PROOF,
    expectedContextHash,
    expectedAllowlistHash,
    now
  });
  const liveWriteToken = buildVcpBridgeExactApprovalGate({
    approvalPacket: approvalPacket({
      token: APPROVAL_TOKENS.LIVE_RECORD_MEMORY_PROOF,
      allowedAction: ACTIONS.LIVE_BRIDGE_RECORD_MEMORY_PROOF
    }),
    requestedAction: ACTIONS.LIVE_BRIDGE_RECORD_MEMORY_PROOF,
    expectedContextHash,
    expectedAllowlistHash,
    now
  });

  assert.equal(noWriteToken.accepted, false);
  assert.equal(noWriteToken.lowDisclosureRejection.reason, 'approval_token_mismatch');
  assert.equal(liveWriteToken.accepted, true);
  assert.equal(liveWriteToken.recordMemoryCalled, false);
  assert.equal(liveWriteToken.unboundedRecordMemoryWriteAllowed, false);
});

test('CM1648 production strict default request is always rejected', () => {
  const result = buildVcpBridgeExactApprovalGate({
    approvalPacket: approvalPacket({
      token: APPROVAL_TOKENS.LIVE_RECORD_MEMORY_PROOF,
      allowedAction: 'production_strict_default_enable'
    }),
    requestedAction: 'production_strict_default_enable',
    expectedContextHash,
    expectedAllowlistHash,
    now
  });

  assert.equal(result.accepted, false);
  assert.equal(result.lowDisclosureRejection.reason, 'production_strict_default_never_enabled_by_gate');
  assert.equal(result.productionStrictDefaultEnabled, false);
});

test('CM1648 output is low disclosure', () => {
  const result = buildVcpBridgeExactApprovalGate({
    approvalPacket: approvalPacket({
      token: 'RAW_SECRET_LIKE_WRONG_TOKEN',
      nonce: 'raw-single-use-nonce',
      receiptId: 'raw-receipt-id'
    }),
    requestedAction: ACTIONS.FIXTURE_ONLY,
    expectedContextHash,
    expectedAllowlistHash,
    now
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(serialized.includes('RAW_SECRET_LIKE_WRONG_TOKEN'), false);
  assert.equal(serialized.includes('raw-single-use-nonce'), false);
  assert.equal(serialized.includes('raw-receipt-id'), false);
});

test('CM1648 public MCP surface remains seven tools', () => {
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
