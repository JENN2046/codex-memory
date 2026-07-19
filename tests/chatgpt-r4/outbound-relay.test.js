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
  loadOutboundRelayRuntimeFromEnvironment
} = require('../../apps/local-recall-relay');

const ISSUER = 'https://tenant.jenn.dev/';
const ORIGIN = 'https://memory.jenn.dev';
const TOKEN = 'r'.repeat(48);

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
    audience: ORIGIN,
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
  const runtime = createOutboundRelayRuntime({
    edgeOrigin: ORIGIN,
    relayAuthToken: TOKEN,
    socketPath,
    relayId: 'local-relay-r4d-test',
    expectedIssuer: ISSUER,
    expectedAudience: ORIGIN,
    resolveRequestPublicKey: keyId => keyId === edgeKeyId ? edge.publicKey : null,
    resolvePrincipalPublicKey: value =>
      value?.issuer === ISSUER && value?.key_id === edgeKeyId ? edge.publicKey : null,
    responseSigning: { privateKey: relay.privateKey, keyId: relayKeyId },
    clock: () => new Date(now),
    cancelPollMs: 1,
    edgeRequest: fakeRequest,
    eventSink: event => events.push(event)
  });
  const result = await runtime.processNext();
  assert.equal(result.status, 'completed');
  assert.equal(requests.every(item => item.protocol === 'https:' && item.hostname === 'memory.jenn.dev'), true);
  assert.equal(requests.every(item => item.authorization_bound), true);
  assert.equal(requests.some(item => item.path === '/v1/relay/claim'), true);
  assert.equal(requests.some(item => item.path === '/v1/relay/ack'), true);
  assert.equal(requests.some(item => item.path === '/v1/relay/complete'), true);
  assert.ok(completedResponse);
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
});

test('R4-D D2B outbound client rejects HTTP, IP, credentials, paths, and short tokens before network', () => {
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
});

test('R4-D D2B runtime authority requires owner-only files and distinct Ed25519 authorities', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-r4d-d2b-authority-'));
  fs.chmodSync(root, 0o700);
  const edge = crypto.generateKeyPairSync('ed25519');
  const relay = crypto.generateKeyPairSync('ed25519');
  const files = {
    edge: path.join(root, 'edge-public.pem'),
    relay: path.join(root, 'relay-private.pem'),
    token: path.join(root, 'relay-token')
  };
  fs.writeFileSync(files.edge, edge.publicKey.export({ type: 'spki', format: 'pem' }), { mode: 0o600 });
  fs.writeFileSync(files.relay, relay.privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
  fs.writeFileSync(files.token, `${TOKEN}\n`, { mode: 0o600 });
  const environment = runtimeEnvironment(files);
  assert.doesNotThrow(() => loadOutboundRelayRuntimeFromEnvironment(environment, {
    secretRoot: root,
    edgeRequest: createFakeHttpsRequest(() => ({ statusCode: 204, body: null }))
  }));

  fs.chmodSync(files.token, 0o644);
  assert.throws(() => loadOutboundRelayRuntimeFromEnvironment(environment, { secretRoot: root }), {
    code: 'relay_secret_file_security_invalid'
  });
  fs.chmodSync(files.token, 0o600);
  fs.writeFileSync(files.relay, edge.privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
  assert.throws(() => loadOutboundRelayRuntimeFromEnvironment(environment, { secretRoot: root }), {
    code: 'relay_runtime_signing_authority_reused'
  });
  fs.rmSync(root, { recursive: true, force: true });
});

function runtimeEnvironment(files) {
  return {
    CODEX_MEMORY_R4_OPERATOR_REFERENCE: 'operator:r4d:private',
    CODEX_MEMORY_R4_HOST_PROJECT_REFERENCE: 'host:self-managed:private-vm',
    CODEX_MEMORY_R4_BINDING_REFERENCE: 'binding:r4d-d2b:private',
    CODEX_MEMORY_R4_PREVIOUS_BINDING_REFERENCE: 'rollback:r4d-d1:private',
    CODEX_MEMORY_R4_BINDING_DIGEST: `sha256:${'0123456789abcdef'.repeat(4)}`,
    CODEX_MEMORY_R4_PUBLIC_ORIGIN: ORIGIN,
    CODEX_MEMORY_R4_AUTH0_ISSUER: ISSUER,
    CODEX_MEMORY_R4_EDGE_SIGNING_PUBLIC_KEY: `file:${files.edge}`,
    CODEX_MEMORY_R4_EDGE_SIGNING_KEY_ID: 'edge-r4d-d2b-test',
    CODEX_MEMORY_R4_RELAY_SIGNING_PRIVATE_KEY: `file:${files.relay}`,
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
          const incoming = Readable.from(
            result.statusCode === 204 ? [] : [Buffer.from(JSON.stringify(result.body), 'utf8')]
          );
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
