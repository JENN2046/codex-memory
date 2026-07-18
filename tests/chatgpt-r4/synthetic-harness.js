'use strict';

const crypto = require('node:crypto');

const {
  InMemoryReplayGuard,
  ZERO_MEMORY_COUNTERS,
  createOpaqueId,
  createPrincipalAssertion,
  createProjectContextClaim,
  digestObject,
  sha256,
  validatePublicStructuredContent,
  validateResponseEnvelope
} = require('../../packages/chatgpt-r4-contracts');
const { buildCandidateEdgeRequest, candidateToolProfile } = require('../../apps/chatgpt-edge');
const { createRelayProcessor } = require('../../apps/local-recall-relay');
const { createMemoryScopeDto, parseToolResultNotification, widgetResource } = require('../../apps/chatgpt-memory-scope-widget');
const { createGovernanceAdapter } = require('../../src/adapters/chatgpt-r4');

const FIXED_NOW = new Date('2026-07-18T00:00:00.000Z');
const SYNTHETIC_ISSUER = 'https://idp.synthetic.invalid';
const SYNTHETIC_AUDIENCE = 'https://edge.synthetic.invalid/mcp';

function generateSigningIdentity(keyId) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  return { keyId, publicKey, privateKey };
}

function keyResolver(...identities) {
  const keys = new Map(identities.map(identity => [identity.keyId, identity.publicKey]));
  return keyId => keys.get(keyId) || null;
}

function principalKeyResolver(issuer, ...identities) {
  const keys = new Map(identities.map(identity => [identity.keyId, identity.publicKey]));
  return keyReference => {
    if (keyReference?.issuer !== issuer) return null;
    return keys.get(keyReference.key_id) || null;
  };
}

function signing(identity) {
  return { keyId: identity.keyId, privateKey: identity.privateKey };
}

function createCounterRecorder() {
  const state = { ...ZERO_MEMORY_COUNTERS };
  return Object.freeze({
    increment(key) {
      if (!Object.hasOwn(state, key)) throw new Error('unknown_counter');
      state[key] += 1;
    },
    snapshot() {
      return { ...state };
    }
  });
}

async function runZeroMemorySyntheticE2E() {
  const principalIdentity = generateSigningIdentity('synthetic-principal-v1');
  const edgeIdentity = generateSigningIdentity('synthetic-edge-v1');
  const contextIdentity = generateSigningIdentity('synthetic-context-v1');
  const relayIdentity = generateSigningIdentity('synthetic-relay-v1');
  const resolvePrincipalKey = principalKeyResolver(SYNTHETIC_ISSUER, principalIdentity);
  const resolveEdgeKey = keyResolver(edgeIdentity);
  const resolveContextKey = keyResolver(contextIdentity);
  const resolveRelayKey = keyResolver(relayIdentity);
  const clock = () => new Date(FIXED_NOW.getTime());
  const requestReplayGuard = new InMemoryReplayGuard({ clock });
  const contextReplayGuard = new InMemoryReplayGuard({ clock });
  const contextStore = new Map();
  const counters = createCounterRecorder();
  const observations = {
    relay_requests: 0,
    local_governance_invocations: 0,
    context_resolutions: 0
  };

  const principalAssertion = createPrincipalAssertion({
    issuer: SYNTHETIC_ISSUER,
    audience: SYNTHETIC_AUDIENCE,
    subjectFingerprint: sha256('synthetic-single-operator'),
    now: clock(),
    nonce: 'principal_nonce_0000000001',
    signing: signing(principalIdentity)
  });

  const governanceAdapter = createGovernanceAdapter({
    expectedIssuer: SYNTHETIC_ISSUER,
    expectedAudience: SYNTHETIC_AUDIENCE,
    resolveRequestPublicKey: resolveEdgeKey,
    resolvePrincipalPublicKey: resolvePrincipalKey,
    resolveContextPublicKey: resolveContextKey,
    contextReplayGuard,
    clock,
    async issueProjectContext({ principalFingerprint, safeProjectAlias, requestedVisibility, now }) {
      observations.context_resolutions += 1;
      if (safeProjectAlias === 'denied-project') return { status: 'denied' };
      if (safeProjectAlias === 'unavailable-project') return { status: 'unavailable' };
      if (safeProjectAlias !== 'project-alpha') throw new Error('synthetic_project_not_registered');
      const projectContextRef = createOpaqueId('pctx_');
      const claim = createProjectContextClaim({
        projectContextRef,
        principalFingerprint,
        projectId: 'synthetic-project-internal-id',
        workspaceId: 'synthetic-workspace-internal-id',
        visibilityAllowlist: [...new Set(['project', 'workspace', requestedVisibility])],
        registryReference: 'synthetic-registry-v1',
        mappingReference: 'synthetic-private-mapping-v1',
        mappingDigest: sha256('synthetic-private-mapping'),
        now,
        nonce: 'context_nonce_00000000001',
        signing: signing(contextIdentity)
      });
      contextStore.set(projectContextRef, claim);
      return { claim, safe_project_alias: safeProjectAlias };
    },
    async resolveProjectContext(projectContextRef) {
      return contextStore.get(projectContextRef) || null;
    },
    async invokeGovernance({ toolName, trustedScope }) {
      observations.local_governance_invocations += 1;
      if (toolName !== 'memory_overview') throw new Error('unexpected_synthetic_tool');
      if (trustedScope.clientId !== 'ChatGPT' || trustedScope.projectId !== 'synthetic-project-internal-id') {
        throw new Error('synthetic_scope_binding_failed');
      }
      return {
        status: 'ok',
        structured_content: { status: 'empty', kind: 'overview', item_count: 0 },
        counters: counters.snapshot(),
        result_scope_postcheck_passed: true
      };
    }
  });

  const relay = createRelayProcessor({
    expectedIssuer: SYNTHETIC_ISSUER,
    expectedAudience: SYNTHETIC_AUDIENCE,
    resolveRequestPublicKey: resolveEdgeKey,
    resolvePrincipalPublicKey: resolvePrincipalKey,
    requestReplayGuard,
    responseSigning: signing(relayIdentity),
    clock,
    async forwardToUds(payload) {
      observations.relay_requests += 1;
      return governanceAdapter.handle(payload);
    }
  });

  const resolveRequest = buildCandidateEdgeRequest({
    principalAssertion,
    toolName: 'resolve_memory_context',
    toolArguments: {
      project_alias: 'project-alpha',
      requested_visibility: 'task_start_context'
    },
    now: clock(),
    requestId: 'req_synthetic_resolve_000001',
    nonce: 'request_nonce_resolve_00001',
    signing: signing(edgeIdentity)
  });
  const resolveResponse = await relay.handle(resolveRequest);
  validateResponseEnvelope(resolveResponse, {
    now: clock(),
    resolveResponsePublicKey: resolveRelayKey,
    expectedRequest: resolveRequest,
    requireZeroCounters: true
  });

  const widgetDto = createMemoryScopeDto({
    safeProjectAlias: resolveResponse.structured_content.safe_project_alias,
    contextStatus: resolveResponse.structured_content.context_status,
    expiresAt: resolveResponse.structured_content.expires_at,
    visibilityLabels: resolveResponse.structured_content.visibility_labels,
    receiptStatus: 'bound'
  });
  const parsedWidgetDto = parseToolResultNotification({
    jsonrpc: '2.0',
    method: 'ui/notifications/tool-result',
    params: { structuredContent: { scope: widgetDto } }
  });

  const overviewRequest = buildCandidateEdgeRequest({
    principalAssertion,
    toolName: 'memory_overview',
    toolArguments: {
      project_context_ref: resolveResponse.structured_content.project_context_ref
    },
    now: clock(),
    requestId: 'req_synthetic_overview_00001',
    nonce: 'request_nonce_overview_0001',
    signing: signing(edgeIdentity)
  });
  const overviewResponse = await relay.handle(overviewRequest);
  validateResponseEnvelope(overviewResponse, {
    now: clock(),
    resolveResponsePublicKey: resolveRelayKey,
    expectedRequest: overviewRequest,
    requireZeroCounters: true
  });

  const artifact = {
    accepted: true,
    stage: 'R4-B',
    archetype: 'interactive_decoupled',
    candidate_profile_id: candidateToolProfile.id,
    candidate_profile_default: candidateToolProfile.default,
    candidate_profile_activated: candidateToolProfile.activated,
    widget_mime_type: widgetResource.mimeType,
    safe_project_alias: parsedWidgetDto.safe_project_alias,
    context_status: parsedWidgetDto.context_status,
    overview_status: overviewResponse.structured_content.status,
    overview_item_count: overviewResponse.structured_content.item_count,
    request_count: observations.relay_requests,
    context_resolution_count: observations.context_resolutions,
    governed_invocation_count: observations.local_governance_invocations,
    counters: counters.snapshot(),
    receipt_chain_bound: true,
    request_response_binding_passed: true,
    project_context_principal_binding_passed: true,
    project_context_mapping_binding_passed: true,
    raw_disclosure: false,
    durable_remote_state_written: false,
    external_runtime_used: false,
    provider_call_performed: false,
    real_memory_read_performed: false,
    public_tool_surface_expanded: false,
    resolve_receipt_chain_digest: digestObject(resolveResponse.receipt_chain),
    overview_receipt_chain_digest: digestObject(overviewResponse.receipt_chain)
  };
  validatePublicStructuredContent(artifact);

  return {
    artifact,
    requests: { resolveRequest, overviewRequest },
    responses: { resolveResponse, overviewResponse },
    internal: {
      relay,
      principalAssertion,
      identities: { principalIdentity, edgeIdentity, contextIdentity, relayIdentity },
      contextStore,
      clock
    }
  };
}

module.exports = {
  FIXED_NOW,
  SYNTHETIC_ISSUER,
  SYNTHETIC_AUDIENCE,
  generateSigningIdentity,
  keyResolver,
  principalKeyResolver,
  signing,
  createCounterRecorder,
  runZeroMemorySyntheticE2E
};
