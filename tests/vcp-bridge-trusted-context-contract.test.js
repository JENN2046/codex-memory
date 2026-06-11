'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  BRIDGE_OWNED_REQUEST_SOURCE,
  buildVcpBridgeTrustedExecutionContext
} = require('../src/core/VcpBridgeTrustedExecutionContext');

const trustedRuntimeContext = Object.freeze({
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

function buildContext(overrides = {}) {
  return buildVcpBridgeTrustedExecutionContext({
    bridgeRuntimeContext: {
      ...trustedRuntimeContext,
      ...(overrides.bridgeRuntimeContext || {})
    },
    bridgeStaticConfig: overrides.bridgeStaticConfig || {},
    bridgeAllowlist: overrides.bridgeAllowlist || bridgeAllowlist
  });
}

test('CM1646 accepts complete bridge-owned runtime context with static allowlist', () => {
  const result = buildContext();

  assert.equal(result.accepted, true);
  assert.deepEqual(result.executionContext, trustedRuntimeContext);
  assert.equal(result.sourceAuthority, 'bridge_runtime_or_static_config');
  assert.equal(result.payloadAuthorityUsed, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.recordMemoryCalled, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.lowDisclosureRejection, null);
});

test('CM1646 rejects missing project workspace and client fields before persistence', () => {
  const result = buildVcpBridgeTrustedExecutionContext({
    bridgeRuntimeContext: {
      agentAlias: 'Codex',
      agentId: 'vcp-bridge-agent',
      requestSource: BRIDGE_OWNED_REQUEST_SOURCE
    },
    bridgeStaticConfig: {},
    bridgeAllowlist
  });

  assert.equal(result.accepted, false);
  assert.deepEqual(result.missingFields, ['projectId', 'workspaceId', 'clientId']);
  assert.equal(result.lowDisclosureRejection.reason, 'missing_required_fields');
  assert.equal(result.recordMemoryCalled, false);
});

test('CM1646 rejects mismatched agent workspace and client fields with low disclosure', () => {
  const result = buildContext({
    bridgeRuntimeContext: {
      agentId: 'raw-agent-not-allowed',
      workspaceId: 'raw-workspace-not-allowed',
      clientId: 'raw-client-not-allowed'
    }
  });
  const publicProjection = JSON.stringify(result.lowDisclosureRejection);

  assert.equal(result.accepted, false);
  assert.deepEqual(result.mismatchedFields, ['agentId', 'workspaceId', 'clientId']);
  assert.equal(result.lowDisclosureRejection.reason, 'allowlist_mismatch');
  assert.equal(JSON.stringify(result).includes('raw-agent-not-allowed'), false);
  assert.equal(JSON.stringify(result).includes('raw-workspace-not-allowed'), false);
  assert.equal(JSON.stringify(result).includes('raw-client-not-allowed'), false);
  assert.equal(publicProjection.includes('raw-agent-not-allowed'), false);
  assert.equal(publicProjection.includes('raw-workspace-not-allowed'), false);
  assert.equal(publicProjection.includes('raw-client-not-allowed'), false);
  assert.equal(result.recordMemoryCalled, false);
});

test('CM1646 rejects prompt or public tool payload identity as authority', () => {
  const result = buildVcpBridgeTrustedExecutionContext({
    bridgeRuntimeContext: trustedRuntimeContext,
    bridgeStaticConfig: {},
    bridgeAllowlist,
    toolPayload: {
      agentId: 'payload-agent',
      projectId: 'payload-project',
      workspaceId: 'payload-workspace',
      clientId: 'payload-client'
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.lowDisclosureRejection.reason, 'payload_authority_not_allowed');
  assert.equal(result.payloadAuthorityUsed, false);
  assert.equal(JSON.stringify(result).includes('payload-agent'), false);
  assert.equal(result.recordMemoryCalled, false);
});

test('CM1646 rejects non plain bridge runtime context and missing allowlist', () => {
  const nonPlain = buildVcpBridgeTrustedExecutionContext({
    bridgeRuntimeContext: null,
    bridgeStaticConfig: {},
    bridgeAllowlist
  });
  const missingAllowlist = buildVcpBridgeTrustedExecutionContext({
    bridgeRuntimeContext: trustedRuntimeContext,
    bridgeStaticConfig: {}
  });

  assert.equal(nonPlain.accepted, false);
  assert.equal(nonPlain.lowDisclosureRejection.reason, 'bridge_runtime_context_not_plain_object');
  assert.equal(missingAllowlist.accepted, false);
  assert.equal(missingAllowlist.lowDisclosureRejection.reason, 'bridge_allowlist_incomplete');
});

test('CM1646 rejects non bridge-owned request source', () => {
  const result = buildContext({
    bridgeRuntimeContext: {
      requestSource: 'prompt-forwarded-source'
    },
    bridgeAllowlist: {
      ...bridgeAllowlist,
      requestSources: [BRIDGE_OWNED_REQUEST_SOURCE, 'prompt-forwarded-source']
    }
  });

  assert.equal(result.accepted, false);
  assert.deepEqual(result.mismatchedFields, ['requestSource']);
  assert.equal(result.lowDisclosureRejection.reason, 'request_source_not_bridge_owned');
  assert.equal(result.recordMemoryCalled, false);
});

test('CM1646 adapter does not call record_memory or provider/API', () => {
  const result = buildContext();

  assert.equal(result.recordMemoryCalled, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
});

test('CM1646 public MCP surface remains seven tools', () => {
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
