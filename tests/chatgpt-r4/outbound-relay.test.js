'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');
const test = require('node:test');

const {
  ZERO_MEMORY_COUNTERS,
  createPrincipalAssertion,
  createRequestEnvelope,
  sha256,
  validateResponseEnvelope
} = require('../../packages/chatgpt-r4-contracts');
const {
  createOutboundEdgeClient,
  createOutboundRelayRuntime,
  createLowDisclosureRelayObserver,
  createRelayRuntime,
  loadOutboundRelayRuntimeFromEnvironment
} = require('../../apps/local-recall-relay');
const {
  createOutboundRelayService,
  isAvailabilityError
} = require('../../apps/local-recall-relay/outbound-main');
const {
  DEFAULT_UDS_TIMEOUT_MS
} = require('../../apps/local-recall-relay/uds-transport');

const ISSUER = 'https://tenant.jenn.dev/';
const ORIGIN = 'https://memory.jenn.dev';
const MCP_RESOURCE = `${ORIGIN}/mcp`;
const TOKEN = 'r'.repeat(48);

test('R4-D Relay default UDS budget covers governed provider reads', () => {
  assert.equal(DEFAULT_UDS_TIMEOUT_MS, 15_000);
});

test('R4-D D2B outbound Relay uses authenticated canonical HTTPS and completes signed zero-counter UDS work', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-r4d-d2b-'));
  const socketPath = path.join(root, 'governance.sock');
  const edge = crypto.generateKeyPairSync('ed25519');
  const relay = crypto.generateKeyPairSync('ed25519');
  const edgeKeyId = 'edge-r4d-d2b-test';
  const relayKeyId = 'relay-r4d-d2b-test';
  const now = new Date('2026-07-19T12:00:00.000Z');
  const principal = createPrincipalAssertion({
    issuer: ISSUER,
    audience: MCP_RESOURCE,
    subjectFingerprint: sha256('single-operator'),
    now,
    nonce: 'd2b_principal_nonce_00001',
    signing: { privateKey: edge.privateKey, keyId: edgeKeyId }
  });
  const requestEnvelope = createRequestEnvelope({
    principalAssertion: principal,
    toolName: 'memory_overview',
    toolArguments: { project_context_ref: `pctx_${'x'.repeat(32)}` },
    now,
    requestId: 'req_d2b_outbound_relay_0000000001',
    nonce: 'd2b_request_nonce_0000001',
    ttlSeconds: 30,
    signing: { privateKey: edge.privateKey, keyId: edgeKeyId }
  });
  const claim = {
    request_id: requestEnvelope.request_id,
    claim_token: 'opaque-claim-control-only',
    attempt: 1,
    request: requestEnvelope
  };
  const requests = [];
  let completedResponse = null;
  const fakeRequest = createFakeHttpsRequest(({ options, body }) => {
    requests.push({
      protocol: options.protocol,
      hostname: options.hostname,
      path: options.path,
      authorization_bound: options.headers.authorization === `Bearer ${TOKEN}`
    });
    if (options.path === '/v1/relay/claim') return { statusCode: 200, body: claim };
    if (options.path === '/v1/relay/ack') return { statusCode: 200, body: { status: 'claimed' } };
    if (options.path === '/v1/relay/state') return { statusCode: 200, body: { status: 'claimed' } };
    if (options.path === '/v1/relay/complete') {
      completedResponse = body.response;
      return { statusCode: 200, body: { status: 'completed' } };
    }
    return { statusCode: 404, body: { error: 'edge_route_not_found' } };
  });
  const server = net.createServer(socket => {
    socket.once('data', () => socket.end(`${JSON.stringify({
      status: 'ok',
      structured_content: { status: 'empty', kind: 'overview', item_count: 0 },
      counters: ZERO_MEMORY_COUNTERS,
      receipt_digests: {
        governance: sha256('d2b-governance'),
        context: sha256('d2b-context')
      }
    })}\n`));
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(socketPath, resolve);
  });
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(root, { recursive: true, force: true });
  });

  const events = [];
  const observer = createLowDisclosureRelayObserver();
  const runtime = createOutboundRelayRuntime({
    edgeOrigin: ORIGIN,
    relayAuthToken: TOKEN,
    socketPath,
    relayId: 'local-relay-r4d-test',
    expectedIssuer: ISSUER,
    expectedAudience: MCP_RESOURCE,
    resolveRequestPublicKey: keyId => keyId === edgeKeyId ? edge.publicKey : null,
    resolvePrincipalPublicKey: value =>
      value?.issuer === ISSUER && value?.key_id === edgeKeyId ? edge.publicKey : null,
    responseSigning: { privateKey: relay.privateKey, keyId: relayKeyId },
    clock: () => new Date(now),
    cancelPollMs: 1,
    edgeRequest: fakeRequest,
    eventSink(event) {
      events.push(event);
      observer.observe(event);
    }
  });
  const result = await runtime.processNext();
  assert.equal(result.status, 'completed');
  assert.equal(requests.every(item => item.protocol === 'https:' && item.hostname === 'memory.jenn.dev'), true);
  assert.equal(requests.every(item => item.authorization_bound), true);
  assert.equal(requests.some(item => item.path === '/v1/relay/claim'), true);
  assert.equal(requests.some(item => item.path === '/v1/relay/ack'), true);
  assert.equal(requests.some(item => item.path === '/v1/relay/complete'), true);
  assert.ok(completedResponse);
  assert.equal(
    Date.parse(completedResponse.expires_at) - Date.parse(completedResponse.issued_at),
    30_000
  );
  assert.doesNotThrow(() => validateResponseEnvelope(completedResponse, {
    now,
    resolveResponsePublicKey: keyId => keyId === relayKeyId ? relay.publicKey : null,
    expectedRequest: requestEnvelope,
    requireZeroCounters: true
  }));
  const eventText = JSON.stringify(events);
  for (const forbidden of [TOKEN, claim.claim_token, requestEnvelope.nonce, 'project_context_ref']) {
    assert.equal(eventText.includes(forbidden), false, forbidden);
  }
  assert.deepEqual(observer.snapshot(), {
    schema_version: 1,
    component: 'outbound_relay',
    claims_received: 1,
    claims_acknowledged: 1,
    uds_forwards_started: 1,
    uds_forwards_completed: 1,
    responses_prepared: 1,
    edge_completions_started: 1,
    edge_completions_accepted: 1,
    requests_failed: 0,
    requests_cancelled: 0,
    requests_expired: 0,
    last_failure_stage: null,
    last_error_code: null,
    completion_state: 'edge_accepted',
    request_identifiers_retained: false,
    response_bodies_retained: false,
    raw_memory_retained: false,
    secret_values_retained: false
  });
});

test('R4-D Relay observer distinguishes Edge completion failure without retaining identifiers', async () => {
  const edge = crypto.generateKeyPairSync('ed25519');
  const relay = crypto.generateKeyPairSync('ed25519');
  const edgeKeyId = 'edge-r4d-completion-observer';
  const relayKeyId = 'relay-r4d-completion-observer';
  const now = new Date('2026-07-26T08:00:00.000Z');
  const principal = createPrincipalAssertion({
    issuer: ISSUER,
    audience: MCP_RESOURCE,
    subjectFingerprint: sha256('completion-observer-operator'),
    now,
    nonce: 'completion_observer_principal_nonce',
    signing: { privateKey: edge.privateKey, keyId: edgeKeyId }
  });
  const request = createRequestEnvelope({
    principalAssertion: principal,
    toolName: 'prepare_memory_context',
    toolArguments: { project_context_ref: `pctx_${'z'.repeat(32)}` },
    now,
    requestId: 'req_completion_observer_000000001',
    nonce: 'completion_observer_request_nonce',
    ttlSeconds: 30,
    signing: { privateKey: edge.privateKey, keyId: edgeKeyId }
  });
  const claim = {
    request_id: request.request_id,
    claim_token: 'completion-observer-claim-token',
    attempt: 1,
    request
  };
  let claimed = false;
  const observer = createLowDisclosureRelayObserver();
  const runtime = createRelayRuntime({
    edgeClient: {
      async claim() {
        if (claimed) return null;
        claimed = true;
        return claim;
      },
      async acknowledge() {
        return { status: 'acked' };
      },
      async complete() {
        throw Object.assign(new Error('relay_edge_timeout'), {
          code: 'relay_edge_timeout'
        });
      },
      async state() {
        return { status: 'claimed' };
      }
    },
    async forwardToUds() {
      return {
        status: 'ok',
        structured_content: { status: 'completed', kind: 'context', item_count: 1 },
        counters: ZERO_MEMORY_COUNTERS,
        receipt_digests: {
          governance: sha256('completion-observer-governance'),
          context: sha256('completion-observer-context')
        }
      };
    },
    relayId: 'local-relay-completion-observer',
    expectedIssuer: ISSUER,
    expectedAudience: MCP_RESOURCE,
    resolveRequestPublicKey: keyId => keyId === edgeKeyId ? edge.publicKey : null,
    resolvePrincipalPublicKey: value =>
      value?.issuer === ISSUER && value?.key_id === edgeKeyId ? edge.publicKey : null,
    responseSigning: { privateKey: relay.privateKey, keyId: relayKeyId },
    clock: () => new Date(now),
    cancelPollMs: 1,
    eventSink: observer.observe
  });

  await assert.rejects(runtime.processNext(), { code: 'relay_edge_timeout' });
  const snapshot = observer.snapshot();
  assert.equal(snapshot.completion_state, 'edge_complete_failed');
  assert.equal(snapshot.uds_forwards_completed, 1);
  assert.equal(snapshot.responses_prepared, 1);
  assert.equal(snapshot.edge_completions_started, 1);
  assert.equal(snapshot.edge_completions_accepted, 0);
  assert.equal(snapshot.requests_failed, 1);
  assert.equal(snapshot.last_failure_stage, 'complete');
  assert.equal(snapshot.last_error_code, 'relay_edge_timeout');
  const serialized = JSON.stringify(snapshot);
  for (const forbidden of [
    request.request_id,
    claim.claim_token,
    request.nonce,
    request.tool_request.arguments.project_context_ref
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test('R4-D D2B outbound client rejects unsafe origins and Edge-incompatible tokens before network', () => {
  for (const origin of [
    'http://memory.jenn.dev',
    'https://127.0.0.1',
    'https://user@memory.jenn.dev',
    'https://memory.jenn.dev/base',
    'https://memory.local'
  ]) {
    assert.throws(() => createOutboundEdgeClient(origin, { authToken: TOKEN }), {
      code: /r4d_public_origin/u
    });
  }
  assert.throws(() => createOutboundEdgeClient(ORIGIN, { authToken: 'short' }), {
    code: 'relay_edge_auth_token_invalid'
  });
  for (const authToken of [`${TOKEN}=`, `${TOKEN} value`, `${TOKEN}\n`]) {
    assert.throws(() => createOutboundEdgeClient(ORIGIN, { authToken }), {
      code: 'relay_edge_auth_token_invalid'
    });
  }
});

test('R4-D D2B retries a non-JSON 5xx gateway response but keeps malformed success replies fail-closed', async () => {
  const unavailableClient = createOutboundEdgeClient(ORIGIN, {
    authToken: TOKEN,
    request: createFakeHttpsRequest(() => ({ statusCode: 503, rawBody: '<gateway-temporarily-unavailable>' }))
  });
  await assert.rejects(unavailableClient.claim('local-relay-r4d-test'), {
    code: 'relay_edge_unavailable'
  });

  const malformedSuccessClient = createOutboundEdgeClient(ORIGIN, {
    authToken: TOKEN,
    request: createFakeHttpsRequest(() => ({ statusCode: 200, rawBody: '<unexpected-success-body>' }))
  });
  await assert.rejects(malformedSuccessClient.claim('local-relay-r4d-test'), {
    code: 'relay_edge_response_invalid'
  });

  assert.equal(isAvailabilityError('relay_edge_unavailable'), true);
  assert.equal(isAvailabilityError('relay_uds_response_incomplete'), true);
  let attempts = 0;
  let service;
  const runtime = {
    async processNext() {
      attempts += 1;
      if (attempts === 1) {
        throw Object.assign(new Error('relay_edge_unavailable'), { code: 'relay_edge_unavailable' });
      }
      service.stop();
      return { status: 'idle' };
    }
  };
  service = createOutboundRelayService({ runtime, idlePollMs: 10, unavailableBackoffMs: 10 });
  await service.run();
  assert.equal(attempts, 2);
});

test('R4-D D2B runtime authority requires owner-only files and distinct Ed25519 authorities', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-r4d-d2b-authority-'));
  fs.chmodSync(root, 0o700);
  const edge = crypto.generateKeyPairSync('ed25519');
  const relay = crypto.generateKeyPairSync('ed25519');
  const files = {
    edge: path.join(root, 'edge-public.pem'),
    relayPrivate: path.join(root, 'relay-private.pem'),
    relayPublic: path.join(root, 'relay-public.pem'),
    token: path.join(root, 'relay-token')
  };
  fs.writeFileSync(files.edge, edge.publicKey.export({ type: 'spki', format: 'pem' }), { mode: 0o600 });
  fs.writeFileSync(files.relayPrivate, relay.privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
  fs.writeFileSync(files.relayPublic, relay.publicKey.export({ type: 'spki', format: 'pem' }), { mode: 0o600 });
  fs.writeFileSync(files.token, `${TOKEN}\n`, { mode: 0o600 });
  const environment = runtimeEnvironment(files);
  assert.throws(() => loadOutboundRelayRuntimeFromEnvironment({
    ...environment,
    CODEX_MEMORY_R4_COUNTER_MODE: 'governed_live_read_typo'
  }, { secretRoot: root }), { code: 'counter_mode_invalid' });
  assert.doesNotThrow(() => loadOutboundRelayRuntimeFromEnvironment(environment, {
    secretRoot: root,
    edgeRequest: createFakeHttpsRequest(() => ({ statusCode: 204, body: null }))
  }));
  assert.doesNotThrow(() => loadOutboundRelayRuntimeFromEnvironment({
    ...environment,
    CODEX_MEMORY_R4_RELAY_UDS_TIMEOUT_MS: '55000'
  }, {
    secretRoot: root,
    edgeRequest: createFakeHttpsRequest(() => ({ statusCode: 204, body: null }))
  }));
  assert.throws(() => loadOutboundRelayRuntimeFromEnvironment({
    ...environment,
    CODEX_MEMORY_R4_RELAY_UDS_TIMEOUT_MS: '55001'
  }, { secretRoot: root }), { code: 'relay_runtime_integer_invalid' });
  const bindingOnlyEnvironment = { ...environment };
  delete bindingOnlyEnvironment.CODEX_MEMORY_R4_RELAY_ID;
  assert.doesNotThrow(() => loadOutboundRelayRuntimeFromEnvironment(bindingOnlyEnvironment, {
    secretRoot: root,
    edgeRequest: createFakeHttpsRequest(() => ({ statusCode: 204, body: null }))
  }));
  assert.throws(() => loadOutboundRelayRuntimeFromEnvironment({
    ...environment,
    CODEX_MEMORY_R4_RELAY_ID: ''
  }, { secretRoot: root }), { code: 'relay_runtime_environment_missing' });

  fs.writeFileSync(files.edge, edge.privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
  assert.throws(() => loadOutboundRelayRuntimeFromEnvironment(environment, { secretRoot: root }), {
    code: 'relay_runtime_key_material_invalid'
  });
  fs.writeFileSync(files.edge, edge.publicKey.export({ type: 'spki', format: 'pem' }), { mode: 0o600 });
  fs.writeFileSync(files.relayPublic, relay.privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
  assert.throws(() => loadOutboundRelayRuntimeFromEnvironment(environment, { secretRoot: root }), {
    code: 'relay_runtime_key_material_invalid'
  });
  fs.writeFileSync(files.relayPublic, relay.publicKey.export({ type: 'spki', format: 'pem' }), { mode: 0o600 });

  fs.chmodSync(files.token, 0o644);
  assert.throws(() => loadOutboundRelayRuntimeFromEnvironment(environment, { secretRoot: root }), {
    code: 'relay_secret_file_security_invalid'
  });
  fs.chmodSync(files.token, 0o600);
  const mismatchedRelay = crypto.generateKeyPairSync('ed25519');
  fs.writeFileSync(files.relayPublic, mismatchedRelay.publicKey.export({ type: 'spki', format: 'pem' }), { mode: 0o600 });
  assert.throws(() => loadOutboundRelayRuntimeFromEnvironment(environment, { secretRoot: root }), {
    code: 'relay_runtime_signing_key_pair_mismatch'
  });
  fs.writeFileSync(files.relayPrivate, edge.privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
  fs.writeFileSync(files.relayPublic, edge.publicKey.export({ type: 'spki', format: 'pem' }), { mode: 0o600 });
  assert.throws(() => loadOutboundRelayRuntimeFromEnvironment(environment, { secretRoot: root }), {
    code: 'relay_runtime_signing_authority_reused'
  });
  const missingHostRollback = runtimeEnvironment(files);
  delete missingHostRollback.CODEX_MEMORY_R4_PREVIOUS_HOST_CONFIG_REFERENCE;
  assert.throws(() => loadOutboundRelayRuntimeFromEnvironment(missingHostRollback, { secretRoot: root }), {
    code: 'relay_runtime_environment_missing'
  });
  fs.rmSync(root, { recursive: true, force: true });
});

function runtimeEnvironment(files) {
  return {
    CODEX_MEMORY_R4_OPERATOR_REFERENCE: 'operator:r4d:private',
    CODEX_MEMORY_R4_HOST_PROJECT_REFERENCE: 'host:self-managed:private-vm',
    CODEX_MEMORY_R4_BINDING_REFERENCE: 'binding:r4d-d2b:private',
    CODEX_MEMORY_R4_PREVIOUS_BINDING_REFERENCE: 'rollback:r4d-d1:private',
    CODEX_MEMORY_R4_PREVIOUS_HOST_CONFIG_REFERENCE: 'rollback:r4d-d2a:host-config',
    CODEX_MEMORY_R4_BINDING_DIGEST: `sha256:${'0123456789abcdef'.repeat(4)}`,
    CODEX_MEMORY_R4_PUBLIC_ORIGIN: ORIGIN,
    CODEX_MEMORY_R4_AUTH0_ISSUER: ISSUER,
    CODEX_MEMORY_R4_EDGE_SIGNING_PUBLIC_KEY: `file:${files.edge}`,
    CODEX_MEMORY_R4_EDGE_SIGNING_KEY_ID: 'edge-r4d-d2b-test',
    CODEX_MEMORY_R4_RELAY_SIGNING_PRIVATE_KEY: `file:${files.relayPrivate}`,
    CODEX_MEMORY_R4_RELAY_SIGNING_PUBLIC_KEY: `file:${files.relayPublic}`,
    CODEX_MEMORY_R4_RELAY_SIGNING_KEY_ID: 'relay-r4d-d2b-test',
    CODEX_MEMORY_R4_RELAY_AUTH_TOKEN: `file:${files.token}`,
    CODEX_MEMORY_R4_RELAY_UDS_PATH: '/run/user/1000/codex-memory/governance.sock',
    CODEX_MEMORY_R4_RELAY_ID: 'local-relay-r4d-test'
  };
}

function createFakeHttpsRequest(handler) {
  return (options, callback) => {
    const outgoing = new EventEmitter();
    outgoing.setTimeout = () => outgoing;
    outgoing.destroy = error => {
      if (error) process.nextTick(() => outgoing.emit('error', error));
    };
    outgoing.end = encoded => {
      process.nextTick(() => {
        let body;
        try {
          body = JSON.parse(Buffer.from(encoded).toString('utf8'));
          const result = handler({ options, body });
          const encodedResponse = Object.prototype.hasOwnProperty.call(result, 'rawBody')
            ? result.rawBody
            : JSON.stringify(result.body);
          const incoming = Readable.from(result.statusCode === 204 ? [] : [Buffer.from(encodedResponse, 'utf8')]);
          incoming.statusCode = result.statusCode;
          callback(incoming);
        } catch (error) {
          outgoing.emit('error', error);
        }
      });
    };
    return outgoing;
  };
}
