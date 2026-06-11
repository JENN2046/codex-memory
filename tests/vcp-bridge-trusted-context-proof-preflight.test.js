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

const now = '2026-06-11T08:00:00.000Z';

function acceptedAdapterResult() {
  return buildVcpBridgeTrustedExecutionContext({
    bridgeRuntimeContext,
    bridgeStaticConfig: {},
    bridgeAllowlist
  });
}

function proofPacket(overrides = {}) {
  const adapterResult = overrides.adapterResult || acceptedAdapterResult();
  const staticAllowlist = overrides.staticAllowlist || bridgeAllowlist;
  return {
    proofType: PROOF_TYPE,
    fixtureOnly: true,
    staticAllowlist,
    signedContext: {
      issuedAt: '2026-06-11T07:00:00.000Z',
      expiresAt: '2026-06-11T09:00:00.000Z',
      nonce: 'fixture-nonce-001',
      bridgeInstanceId: 'fixture-bridge-instance',
      contextHash: buildVcpBridgeTrustedContextHash({
        executionContext: adapterResult.executionContext,
        bridgeAllowlist: staticAllowlist
      }),
      signaturePresent: true,
      signatureVerified: false,
      ...(overrides.signedContext || {})
    },
    ...(overrides.packet || {})
  };
}

test('CM1647 accepts fixture-only static allowlist proof packet shape', () => {
  const adapterResult = acceptedAdapterResult();
  const result = buildVcpBridgeTrustedContextProofPreflight({
    proofPacket: proofPacket({ adapterResult }),
    adapterResult,
    now
  });

  assert.equal(result.accepted, true);
  assert.equal(result.adapterConsumable, true);
  assert.equal(result.fixtureOnly, true);
  assert.equal(result.proofType, PROOF_TYPE);
  assert.equal(result.signedContextMetadata.signaturePresent, true);
  assert.equal(result.signedContextMetadata.signatureVerified, false);
  assert.equal(result.signatureVerified, false);
  assert.equal(result.payloadAuthorityUsed, false);
  assert.equal(result.recordMemoryCalled, false);
  assert.equal(result.providerApiCalled, false);
});

test('CM1647 signed context metadata stays fixture-only and low disclosure', () => {
  const adapterResult = acceptedAdapterResult();
  const result = buildVcpBridgeTrustedContextProofPreflight({
    proofPacket: proofPacket({ adapterResult }),
    adapterResult,
    now
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, true);
  assert.deepEqual(Object.keys(result.signedContextMetadata).sort(), [
    'bridgeInstanceIdPresent',
    'contextHashPresent',
    'expiresAt',
    'issuedAt',
    'noncePresent',
    'signaturePresent',
    'signatureVerified'
  ].sort());
  assert.equal(serialized.includes('fixture-nonce-001'), false);
  assert.equal(serialized.includes('fixture-bridge-instance'), false);
});

test('CM1647 rejects crypto secret private key and bearer token material', () => {
  const adapterResult = acceptedAdapterResult();
  const result = buildVcpBridgeTrustedContextProofPreflight({
    proofPacket: {
      ...proofPacket({ adapterResult }),
      privateKey: 'raw-private-key',
      bearerToken: 'raw-bearer-token'
    },
    adapterResult,
    now
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.lowDisclosureRejection.reason, 'secret_material_not_allowed');
  assert.equal(result.privateKeyAccepted, false);
  assert.equal(result.bearerTokenAccepted, false);
  assert.equal(serialized.includes('raw-private-key'), false);
  assert.equal(serialized.includes('raw-bearer-token'), false);
});

test('CM1647 rejects expired proof', () => {
  const adapterResult = acceptedAdapterResult();
  const result = buildVcpBridgeTrustedContextProofPreflight({
    proofPacket: proofPacket({
      adapterResult,
      signedContext: {
        expiresAt: '2026-06-11T07:59:59.000Z'
      }
    }),
    adapterResult,
    now
  });

  assert.equal(result.accepted, false);
  assert.equal(result.adapterConsumable, false);
  assert.equal(result.lowDisclosureRejection.reason, 'signed_context_expired');
});

test('CM1647 rejects missing allowlist', () => {
  const adapterResult = acceptedAdapterResult();
  const packet = proofPacket({ adapterResult });
  delete packet.staticAllowlist;

  const result = buildVcpBridgeTrustedContextProofPreflight({
    proofPacket: packet,
    adapterResult,
    now
  });

  assert.equal(result.accepted, false);
  assert.equal(result.lowDisclosureRejection.reason, 'static_allowlist_missing');
});

test('CM1647 rejects mismatched context hash', () => {
  const adapterResult = acceptedAdapterResult();
  const result = buildVcpBridgeTrustedContextProofPreflight({
    proofPacket: proofPacket({
      adapterResult,
      signedContext: {
        contextHash: 'not-the-context-hash'
      }
    }),
    adapterResult,
    now
  });

  assert.equal(result.accepted, false);
  assert.equal(result.lowDisclosureRejection.reason, 'context_hash_mismatch');
  assert.deepEqual(result.mismatchedFields, ['contextHash']);
});

test('CM1647 rejects payload-derived identity and keeps output low disclosure', () => {
  const adapterResult = acceptedAdapterResult();
  const result = buildVcpBridgeTrustedContextProofPreflight({
    proofPacket: proofPacket({ adapterResult }),
    adapterResult,
    toolPayload: {
      agentId: 'payload-agent',
      workspaceId: 'payload-workspace',
      clientId: 'payload-client'
    },
    now
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.lowDisclosureRejection.reason, 'payload_authority_not_allowed');
  assert.equal(result.payloadAuthorityUsed, false);
  assert.equal(serialized.includes('payload-agent'), false);
  assert.equal(serialized.includes('payload-workspace'), false);
  assert.equal(serialized.includes('payload-client'), false);
});

test('CM1647 adapter output is consumable only if proof is accepted', () => {
  const adapterResult = acceptedAdapterResult();
  const rejected = buildVcpBridgeTrustedContextProofPreflight({
    proofPacket: proofPacket({
      adapterResult,
      signedContext: {
        contextHash: 'mismatch'
      }
    }),
    adapterResult,
    now
  });
  const accepted = buildVcpBridgeTrustedContextProofPreflight({
    proofPacket: proofPacket({ adapterResult }),
    adapterResult,
    now
  });

  assert.equal(rejected.accepted, false);
  assert.equal(rejected.adapterConsumable, false);
  assert.equal(accepted.accepted, true);
  assert.equal(accepted.adapterConsumable, true);
});

test('CM1647 public MCP surface remains seven tools', () => {
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
