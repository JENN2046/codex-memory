'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const {
  InMemoryReplayGuard,
  ZERO_MEMORY_COUNTERS,
  createOpaqueId,
  createPrincipalAssertion,
  createProjectContextClaim,
  createRequestEnvelope,
  digestObject,
  sha256,
  validatePublicStructuredContent,
  validateRequestEnvelope,
  validateResponseEnvelope
} = require('../../packages/chatgpt-r4-contracts');
const { createLoopbackEdgeRuntime } = require('../../apps/chatgpt-edge');
const {
  createLoopbackEdgeClient,
  createLoopbackRelayRuntime
} = require('../../apps/local-recall-relay');
const { createGovernanceAdapter } = require('../../src/adapters/chatgpt-r4');
const {
  SYNTHETIC_AUDIENCE,
  SYNTHETIC_ISSUER,
  generateSigningIdentity,
  keyResolver,
  principalKeyResolver,
  signing
} = require('./synthetic-harness');

const R4C_FIXED_NOW = new Date('2026-07-19T00:00:00.000Z');

async function createLocalIntegrationHarness({
  claimLeaseMs = 5_000,
  terminalRetentionMs = 5_000,
  governanceDelayMs = 0,
  responseVerificationDelayMs = 0,
  cancelPollMs = 5
} = {}) {
  let nowMs = R4C_FIXED_NOW.getTime();
  const clock = () => new Date(nowMs);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-r4c-'));
  const socketPath = path.join(root, 'governance.sock');
  const edgeEvents = [];
  const relayEvents = [];
  const observations = {
    uds_connections: 0,
    uds_frames: 0,
    context_resolutions: 0,
    governance_invocations: 0
  };

  const principalIdentity = generateSigningIdentity('r4c-principal-v1');
  const edgeIdentity = generateSigningIdentity('r4c-edge-v1');
  const contextIdentity = generateSigningIdentity('r4c-context-v1');
  const relayIdentity = generateSigningIdentity('r4c-relay-v1');
  const resolvePrincipalKey = principalKeyResolver(SYNTHETIC_ISSUER, principalIdentity);
  const resolveEdgeKey = keyResolver(edgeIdentity);
  const resolveContextKey = keyResolver(contextIdentity);
  const resolveRelayKey = keyResolver(relayIdentity);
  const contextStore = new Map();
  const contextReplayGuard = new InMemoryReplayGuard({ clock });

  const principalAssertion = createPrincipalAssertion({
    issuer: SYNTHETIC_ISSUER,
    audience: SYNTHETIC_AUDIENCE,
    subjectFingerprint: sha256('r4c-synthetic-single-operator'),
    now: clock(),
    nonce: 'r4c_principal_nonce_00001',
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
      if (safeProjectAlias !== 'project-alpha') return { status: 'denied' };
      const projectContextRef = createOpaqueId('pctx_');
      const claim = createProjectContextClaim({
        projectContextRef,
        principalFingerprint,
        projectId: 'r4c-synthetic-project',
        workspaceId: 'r4c-synthetic-workspace',
        visibilityAllowlist: [...new Set(['project', 'workspace', requestedVisibility])],
        registryReference: 'r4c-synthetic-registry-v1',
        mappingReference: 'r4c-synthetic-mapping-v1',
        mappingDigest: sha256('r4c-synthetic-mapping'),
        now,
        nonce: createOpaqueId('ctx_nonce_', crypto.randomBytes, 18),
        signing: signing(contextIdentity)
      });
      contextStore.set(projectContextRef, claim);
      return { claim, safe_project_alias: safeProjectAlias };
    },
    async resolveProjectContext(projectContextRef) {
      return contextStore.get(projectContextRef) || null;
    },
    async invokeGovernance({ toolName, trustedScope }) {
      observations.governance_invocations += 1;
      if (toolName !== 'memory_overview' || trustedScope.clientId !== 'ChatGPT' ||
          trustedScope.projectId !== 'r4c-synthetic-project') {
        throw new Error('r4c_synthetic_scope_binding_failed');
      }
      return {
        status: 'ok',
        structured_content: { status: 'empty', kind: 'overview', item_count: 0 },
        counters: { ...ZERO_MEMORY_COUNTERS },
        result_scope_postcheck_passed: true
      };
    }
  });

  const udsServer = net.createServer(socket => {
    observations.uds_connections += 1;
    let input = '';
    let handled = false;
    let disconnected = false;
    socket.on('close', () => { disconnected = true; });
    socket.on('error', () => { disconnected = true; });
    socket.on('data', async chunk => {
      if (handled) return;
      input += chunk.toString('utf8');
      if (Buffer.byteLength(input, 'utf8') > 48 * 1024) {
        handled = true;
        socket.destroy();
        return;
      }
      const newline = input.indexOf('\n');
      if (newline === -1) return;
      handled = true;
      if (input.slice(newline + 1).trim() !== '') {
        socket.destroy();
        return;
      }
      let payload;
      try {
        payload = JSON.parse(input.slice(0, newline));
      } catch {
        socket.destroy();
        return;
      }
      if (!payload || Object.keys(payload).sort().join(',') !== 'relayReceipt,request') {
        socket.destroy();
        return;
      }
      observations.uds_frames += 1;
      if (governanceDelayMs > 0) await delay(governanceDelayMs);
      if (disconnected || socket.destroyed) return;
      try {
        const invocation = await governanceAdapter.handle(payload);
        if (!disconnected && !socket.destroyed) socket.end(`${JSON.stringify(invocation)}\n`);
      } catch {
        socket.destroy();
      }
    });
  });

  await new Promise((resolve, rejectListen) => {
    udsServer.once('error', rejectListen);
    udsServer.listen(socketPath, resolve);
  });

  const edgeRuntime = createLoopbackEdgeRuntime({
    claimLeaseMs,
    terminalRetentionMs,
    clock,
    eventSink: event => edgeEvents.push(event),
    verifyRequest(request) {
      return validateRequestEnvelope(request, {
        now: clock(),
        resolveRequestPublicKey: resolveEdgeKey,
        resolvePrincipalPublicKey: resolvePrincipalKey,
        expectedIssuer: SYNTHETIC_ISSUER,
        expectedAudience: SYNTHETIC_AUDIENCE,
        consumeReplay: false
      });
    },
    async verifyResponse(response, request) {
      if (responseVerificationDelayMs > 0) await delay(responseVerificationDelayMs);
      return validateResponseEnvelope(response, {
        now: clock(),
        resolveResponsePublicKey: resolveRelayKey,
        expectedRequest: request,
        requireZeroCounters: true
      });
    }
  });
  const edgeAddress = await edgeRuntime.start();
  const edgeClient = createLoopbackEdgeClient(edgeAddress.url);
  const relayRuntime = createLoopbackRelayRuntime({
    edgeUrl: edgeAddress.url,
    socketPath,
    expectedIssuer: SYNTHETIC_ISSUER,
    expectedAudience: SYNTHETIC_AUDIENCE,
    resolveRequestPublicKey: resolveEdgeKey,
    resolvePrincipalPublicKey: resolvePrincipalKey,
    requestReplayGuard: new InMemoryReplayGuard({ clock }),
    responseSigning: signing(relayIdentity),
    clock,
    cancelPollMs,
    udsTimeoutMs: 2_000,
    eventSink: event => relayEvents.push(event)
  });

  let requestSequence = 0;
  function buildRequest(toolName, toolArguments, { ttlSeconds = 30 } = {}) {
    requestSequence += 1;
    return createRequestEnvelope({
      principalAssertion,
      toolName,
      toolArguments,
      now: clock(),
      ttlSeconds,
      requestId: `req_r4c_integration_${String(requestSequence).padStart(8, '0')}`,
      nonce: `r4c_request_nonce_${String(requestSequence).padStart(8, '0')}`,
      signing: signing(edgeIdentity)
    });
  }

  return Object.freeze({
    clock,
    advance(milliseconds) {
      nowMs += milliseconds;
    },
    buildRequest,
    edgeAddress,
    edgeClient,
    edgeRuntime,
    relayRuntime,
    edgeEvents,
    relayEvents,
    observations,
    identities: { relayIdentity },
    resolveRelayKey,
    async close() {
      await edgeRuntime.stop();
      await new Promise((resolve, rejectClose) => {
        udsServer.close(error => error ? rejectClose(error) : resolve());
      });
      await fs.rm(root, { recursive: true, force: true });
    }
  });
}

async function runR4CLocalIntegrationProof() {
  const harness = await createLocalIntegrationHarness();
  try {
    const resolveRequest = harness.buildRequest('resolve_memory_context', {
      project_alias: 'project-alpha',
      requested_visibility: 'task_start_context'
    });
    await harness.edgeClient.submit(resolveRequest);
    const resolved = await harness.relayRuntime.processNext();
    const resolveResult = await harness.edgeClient.result(resolveRequest.request_id);
    validateResponseEnvelope(resolveResult.response, {
      now: harness.clock(),
      resolveResponsePublicKey: harness.resolveRelayKey,
      expectedRequest: resolveRequest,
      requireZeroCounters: true
    });

    const overviewRequest = harness.buildRequest('memory_overview', {
      project_context_ref: resolved.response.structured_content.project_context_ref
    });
    await harness.edgeClient.submit(overviewRequest);
    const overview = await harness.relayRuntime.processNext();
    const overviewResult = await harness.edgeClient.result(overviewRequest.request_id);
    validateResponseEnvelope(overviewResult.response, {
      now: harness.clock(),
      resolveResponsePublicKey: harness.resolveRelayKey,
      expectedRequest: overviewRequest,
      requireZeroCounters: true
    });

    const eventText = JSON.stringify([...harness.edgeEvents, ...harness.relayEvents]);
    const artifact = {
      accepted: true,
      stage: 'R4-C',
      topology: 'loopback_edge_outbound_relay_temporary_uds',
      loopback_host_exact: harness.edgeAddress.host === '127.0.0.1',
      edge_port_ephemeral: harness.edgeAddress.port > 0,
      temporary_uds_used: true,
      request_count: 2,
      claim_ack_passed: harness.edgeEvents.filter(event => event.event === 'claim_acknowledged').length === 2,
      response_correlation_passed: resolved.status === 'completed' && overview.status === 'completed',
      context_resolution_count: harness.observations.context_resolutions,
      governed_invocation_count: harness.observations.governance_invocations,
      uds_connection_count: harness.observations.uds_connections,
      counters: { ...ZERO_MEMORY_COUNTERS },
      body_log_absence_passed: !eventText.includes('project-alpha') &&
        !eventText.includes('tool_request') && !eventText.includes('structured_content') &&
        !eventText.includes('claim_token') && !eventText.includes('nonce'),
      durable_remote_state_written: false,
      external_runtime_used: false,
      provider_call_performed: false,
      real_memory_read_performed: false,
      public_tool_surface_expanded: false,
      resolve_receipt_chain_digest: digestObject(resolveResult.response.receipt_chain),
      overview_receipt_chain_digest: digestObject(overviewResult.response.receipt_chain)
    };
    validatePublicStructuredContent(artifact);
    return { artifact, harnessSnapshot: harness.edgeRuntime.snapshot() };
  } finally {
    await harness.close();
  }
}

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

module.exports = {
  R4C_FIXED_NOW,
  createLocalIntegrationHarness,
  runR4CLocalIntegrationProof
};
