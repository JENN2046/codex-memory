'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const test = require('node:test');

const {
  SignJWT,
  createLocalJWKSet,
  exportJWK
} = require('jose');

const {
  ZERO_MEMORY_COUNTERS,
  createResponseEnvelope,
  digestObject,
  sha256
} = require('../../packages/chatgpt-r4-contracts');
const {
  createAuth0TokenVerifier,
  createExternalEdgeRuntime,
  validateExternalEdgeRuntimeConfig
} = require('../../apps/chatgpt-edge');

const PUBLIC_ORIGIN = 'https://memory.codex-memory.dev';
const ISSUER = 'https://tenant.codex-memory.dev/';
const JWKS_URI = 'https://tenant.codex-memory.dev/.well-known/jwks.json';
const OAUTH_CLIENT_ID = 'r4-private-client-id';
const OPERATOR_SUBJECT = 'auth0|jenn-synthetic-operator';
const OPERATOR_FINGERPRINT = sha256(`${ISSUER}\n${OPERATOR_SUBJECT}`);
const ACCESS_TOKEN = 'synthetic_access_token_value_00000000000000000001';
const RELAY_TOKEN = 'synthetic_relay_token_value_00000000000000000001';

test('Auth0 verifier binds RS256 issuer, audience, client, scope, and single operator', async () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = 'auth0-synthetic-rs256';
  publicJwk.use = 'sig';
  publicJwk.alg = 'RS256';
  const verifier = createAuth0TokenVerifier({
    issuer: ISSUER,
    audience: PUBLIC_ORIGIN,
    jwksUri: JWKS_URI,
    expectedClientId: OAUTH_CLIENT_ID,
    operatorSubjectFingerprint: OPERATOR_FINGERPRINT,
    jwks: createLocalJWKSet({ keys: [publicJwk] })
  });

  const valid = await signAccessToken(privateKey, {
    subject: OPERATOR_SUBJECT,
    audience: PUBLIC_ORIGIN,
    clientId: OAUTH_CLIENT_ID,
    scope: 'memory.read'
  });
  const accepted = await verifier(valid);
  assert.equal(accepted.issuer, ISSUER);
  assert.equal(accepted.audience, PUBLIC_ORIGIN);
  assert.equal(accepted.clientId, OAUTH_CLIENT_ID);
  assert.equal(accepted.subjectFingerprint, OPERATOR_FINGERPRINT);
  assert.deepEqual(accepted.scopes, ['memory.read']);

  for (const mutation of [
    { subject: 'auth0|other-operator' },
    { audience: 'https://other.codex-memory.dev' },
    { audience: [PUBLIC_ORIGIN, 'https://other.codex-memory.dev'] },
    { clientId: 'other-client-id' },
    { scope: 'openid' }
  ]) {
    const token = await signAccessToken(privateKey, {
      subject: OPERATOR_SUBJECT,
      audience: PUBLIC_ORIGIN,
      clientId: OAUTH_CLIENT_ID,
      scope: 'memory.read',
      ...mutation
    });
    await assert.rejects(verifier(token), error => /^edge_oauth_/u.test(error.code));
  }
});

test('external Edge serves PRMD and official stateless MCP while relay completes a zero-memory read', async t => {
  const edgeIdentity = signingIdentity('r4d-edge');
  const relayIdentity = signingIdentity('r4d-relay');
  const events = [];
  const runtime = createExternalEdgeRuntime({
    publicOrigin: PUBLIC_ORIGIN,
    issuer: ISSUER,
    jwksUri: JWKS_URI,
    oauthClientId: OAUTH_CLIENT_ID,
    operatorSubjectFingerprint: OPERATOR_FINGERPRINT,
    edgeSigning: signing(edgeIdentity),
    relaySigningPublicKey: relayIdentity.publicKey,
    relaySigningKeyId: relayIdentity.keyId,
    relayAuthToken: RELAY_TOKEN,
    bindHost: '127.0.0.1',
    bindPort: 0,
    responseTimeoutMs: 2_000,
    eventSink: event => events.push(event),
    async verifyAccessToken(token) {
      if (token !== ACCESS_TOKEN) throw Object.assign(new Error('edge_oauth_token_invalid'), {
        code: 'edge_oauth_token_invalid'
      });
      return {
        issuer: ISSUER,
        audience: PUBLIC_ORIGIN,
        clientId: OAUTH_CLIENT_ID,
        subjectFingerprint: OPERATOR_FINGERPRINT,
        scopes: ['memory.read'],
        expiresAt: Math.floor(Date.now() / 1000) + 300
      };
    }
  });
  const address = await runtime.start();
  t.after(() => runtime.stop());

  const health = await edgeRequest(address, 'GET', '/healthz');
  assert.equal(health.statusCode, 200);
  assert.deepEqual(health.body, {
    status: 'ok',
    stage: 'R4-D-D2A',
    external_runtime_activated: true,
    durable_remote_state: false
  });

  const prmd = await edgeRequest(address, 'GET', '/.well-known/oauth-protected-resource');
  assert.equal(prmd.statusCode, 200);
  assert.deepEqual(prmd.body, {
    resource: PUBLIC_ORIGIN,
    authorization_servers: [ISSUER],
    scopes_supported: ['memory.read'],
    bearer_methods_supported: ['header'],
    resource_name: 'codex-memory private project memory'
  });

  const unauthenticated = await mcpRequest(address, initializeRequest(1), null);
  assert.equal(unauthenticated.statusCode, 401);
  assert.match(unauthenticated.headers['www-authenticate'], /resource_metadata=/u);
  assert.match(unauthenticated.headers['www-authenticate'], /scope="memory\.read"/u);

  const initialized = await mcpRequest(address, initializeRequest(2), ACCESS_TOKEN);
  assert.equal(initialized.statusCode, 200);
  assert.equal(initialized.body.result.serverInfo.name, 'codex-memory-chatgpt-r4-edge');

  const tools = await mcpRequest(address, rpcRequest(3, 'tools/list'), ACCESS_TOKEN);
  assert.equal(tools.statusCode, 200);
  assert.deepEqual(tools.body.result.tools.map(tool => tool.name), [
    'resolve_memory_context',
    'memory_overview',
    'search_memory',
    'audit_memory',
    'prepare_memory_context',
    'render_memory_scope'
  ]);
  assert.equal(tools.body.result.tools.every(tool => tool.annotations.readOnlyHint === true), true);

  const resources = await mcpRequest(address, rpcRequest(4, 'resources/list'), ACCESS_TOKEN);
  assert.equal(resources.statusCode, 200);
  assert.equal(resources.body.result.resources[0].mimeType, 'text/html;profile=mcp-app');
  const resource = await mcpRequest(address, rpcRequest(5, 'resources/read', {
    uri: resources.body.result.resources[0].uri
  }), ACCESS_TOKEN);
  assert.equal(resource.statusCode, 200);
  assert.match(resource.body.result.contents[0].text, /Memory scope/u);
  assert.doesNotMatch(resource.body.result.contents[0].text, /diary|mapping_digest|raw memory/iu);

  const unauthorizedRelay = await edgeRequest(address, 'POST', '/v1/relay/claim', {
    authorization: `Bearer ${'x'.repeat(48)}`,
    body: { relay_id: 'r4d-local-relay' }
  });
  assert.equal(unauthorizedRelay.statusCode, 401);

  const toolCall = mcpRequest(address, rpcRequest(6, 'tools/call', {
    name: 'memory_overview',
    arguments: { project_context_ref: `pctx_${'A'.repeat(32)}` }
  }), ACCESS_TOKEN);
  const claim = await waitForClaim(address);
  assert.equal(claim.statusCode, 200);
  await relayRequest(address, '/v1/relay/ack', {
    request_id: claim.body.request_id,
    claim_token: claim.body.claim_token
  });
  const response = createResponseEnvelope({
    requestId: claim.body.request.request_id,
    requestDigest: digestObject(claim.body.request),
    toolName: 'memory_overview',
    status: 'ok',
    structuredContent: { status: 'empty', kind: 'overview', item_count: 0 },
    counters: { ...ZERO_MEMORY_COUNTERS },
    receiptChain: {
      edge_request: digestObject(claim.body.request),
      relay: sha256('r4d-relay-receipt'),
      governance: sha256('r4d-governance-receipt'),
      context: sha256('r4d-context-receipt')
    },
    signing: signing(relayIdentity)
  });
  const completed = await relayRequest(address, '/v1/relay/complete', {
    request_id: claim.body.request_id,
    claim_token: claim.body.claim_token,
    response
  });
  assert.equal(completed.statusCode, 200);
  const toolResult = await toolCall;
  assert.equal(toolResult.statusCode, 200);
  assert.deepEqual(toolResult.body.result.structuredContent, {
    status: 'empty',
    kind: 'overview',
    item_count: 0
  });
  assert.deepEqual(toolResult.body.result._meta['codex-memory/counters'], ZERO_MEMORY_COUNTERS);
  assert.match(toolResult.body.result._meta['codex-memory/receiptChainDigest'], /^sha256:[a-f0-9]{64}$/u);

  assert.equal(runtime.snapshot().durable_remote_state, false);
  const serializedEvents = JSON.stringify(events);
  assert.doesNotMatch(serializedEvents, /project_context_ref|tool_request|structured_content|claim_token|authorization/iu);
});

test('external Edge fails closed on proxy, OAuth, relay signature, and nonzero counters', { timeout: 5_000 }, async t => {
  const edgeIdentity = signingIdentity('r4d-edge-negative');
  const relayIdentity = signingIdentity('r4d-relay-negative');
  const runtime = createExternalEdgeRuntime({
    publicOrigin: PUBLIC_ORIGIN,
    issuer: ISSUER,
    jwksUri: JWKS_URI,
    oauthClientId: OAUTH_CLIENT_ID,
    operatorSubjectFingerprint: OPERATOR_FINGERPRINT,
    edgeSigning: signing(edgeIdentity),
    relaySigningPublicKey: relayIdentity.publicKey,
    relaySigningKeyId: relayIdentity.keyId,
    relayAuthToken: RELAY_TOKEN,
    bindHost: '127.0.0.1',
    bindPort: 0,
    responseTimeoutMs: 300,
    async verifyAccessToken() {
      return {
        issuer: ISSUER,
        audience: PUBLIC_ORIGIN,
        clientId: OAUTH_CLIENT_ID,
        subjectFingerprint: OPERATOR_FINGERPRINT,
        scopes: ['memory.read'],
        expiresAt: Math.floor(Date.now() / 1000) + 300
      };
    }
  });
  const address = await runtime.start();
  t.after(() => runtime.stop());

  const wrongHost = await rawRequest(address, 'GET', '/healthz', {
    host: 'other.codex-memory.dev',
    'x-forwarded-proto': 'https'
  });
  assert.equal(wrongHost.statusCode, 400);
  const wrongProto = await rawRequest(address, 'GET', '/healthz', {
    host: new URL(PUBLIC_ORIGIN).host,
    'x-forwarded-proto': 'http'
  });
  assert.equal(wrongProto.statusCode, 400);

  const toolCall = mcpRequest(address, rpcRequest(7, 'tools/call', {
    name: 'memory_overview',
    arguments: { project_context_ref: `pctx_${'B'.repeat(32)}` }
  }), ACCESS_TOKEN);
  const claim = await waitForClaim(address);
  await relayRequest(address, '/v1/relay/ack', {
    request_id: claim.body.request_id,
    claim_token: claim.body.claim_token
  });
  const nonzeroResponse = createResponseEnvelope({
    requestId: claim.body.request.request_id,
    requestDigest: digestObject(claim.body.request),
    toolName: 'memory_overview',
    status: 'ok',
    structuredContent: { status: 'empty', kind: 'overview', item_count: 0 },
    counters: { ...ZERO_MEMORY_COUNTERS, provider_calls: 1 },
    receiptChain: {
      edge_request: digestObject(claim.body.request),
      relay: sha256('negative-relay'),
      governance: sha256('negative-governance'),
      context: sha256('negative-context')
    },
    signing: signing(relayIdentity)
  });
  const rejected = await relayRequest(address, '/v1/relay/complete', {
    request_id: claim.body.request_id,
    claim_token: claim.body.claim_token,
    response: nonzeroResponse
  });
  assert.equal(rejected.statusCode, 400);
  assert.equal(rejected.body.error, 'zero_memory_counter_nonzero');
  const timedOut = await toolCall;
  assert.equal(timedOut.statusCode, 200);
  assert.equal(timedOut.body.error.code, -32603);
  assert.match(timedOut.body.error.message, /edge_response_timeout/u);
});

test('external Edge configuration rejects non-public origins, unsafe bind, and non-Ed25519 signing', () => {
  const edgeIdentity = signingIdentity('r4d-config-edge');
  const relayIdentity = signingIdentity('r4d-config-relay');
  const base = {
    publicOrigin: PUBLIC_ORIGIN,
    issuer: ISSUER,
    jwksUri: JWKS_URI,
    oauthClientId: OAUTH_CLIENT_ID,
    operatorSubjectFingerprint: OPERATOR_FINGERPRINT,
    edgeSigning: signing(edgeIdentity),
    relaySigningPublicKey: relayIdentity.publicKey,
    relaySigningKeyId: relayIdentity.keyId,
    relayAuthToken: RELAY_TOKEN,
    bindHost: '127.0.0.1',
    bindPort: 0
  };
  const defaults = validateExternalEdgeRuntimeConfig(base);
  assert.equal(defaults.claimLeaseMs, defaults.responseTimeoutMs);
  assert.throws(() => validateExternalEdgeRuntimeConfig({
    ...base,
    responseTimeoutMs: 10_000,
    claimLeaseMs: 9_999
  }), { code: 'edge_claim_lease_too_short' });
  for (const publicOrigin of [
    'https://localhost',
    'https://127.0.0.1',
    'https://memory.example.net',
    'http://memory.codex-memory.dev'
  ]) {
    assert.throws(() => validateExternalEdgeRuntimeConfig({ ...base, publicOrigin }));
  }
  assert.throws(() => validateExternalEdgeRuntimeConfig({
    ...base,
    bindHost: '0.0.0.0'
  }), { code: 'edge_container_loopback_publish_ack_missing' });
  const rsa = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  assert.throws(() => validateExternalEdgeRuntimeConfig({
    ...base,
    edgeSigning: { keyId: 'rsa-edge', privateKey: rsa.privateKey }
  }), { code: 'edge_signing_algorithm_invalid' });
  assert.throws(() => validateExternalEdgeRuntimeConfig({
    ...base,
    relaySigningPublicKey: rsa.publicKey
  }), { code: 'edge_relay_signing_algorithm_invalid' });
  assert.throws(() => validateExternalEdgeRuntimeConfig({
    ...base,
    relaySigningPublicKey: edgeIdentity.publicKey
  }), { code: 'edge_runtime_signing_authority_reused' });
  assert.throws(() => validateExternalEdgeRuntimeConfig({
    ...base,
    relaySigningKeyId: edgeIdentity.keyId
  }), { code: 'edge_runtime_signing_key_id_reused' });
});

async function signAccessToken(privateKey, {
  subject,
  audience,
  clientId,
  scope
}) {
  return new SignJWT({ scope, azp: clientId })
    .setProtectedHeader({ alg: 'RS256', kid: 'auth0-synthetic-rs256', typ: 'JWT' })
    .setIssuer(ISSUER)
    .setSubject(subject)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);
}

function signingIdentity(keyId) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  return { keyId, publicKey, privateKey };
}

function signing(identity) {
  return { keyId: identity.keyId, privateKey: identity.privateKey };
}

function initializeRequest(id) {
  return rpcRequest(id, 'initialize', {
    protocolVersion: '2025-11-25',
    capabilities: {},
    clientInfo: { name: 'r4d-synthetic-client', version: '1.0.0' }
  });
}

function rpcRequest(id, method, params) {
  const value = { jsonrpc: '2.0', id, method };
  if (params !== undefined) value.params = params;
  return value;
}

function mcpRequest(address, body, token) {
  return edgeRequest(address, 'POST', '/mcp', {
    authorization: token ? `Bearer ${token}` : undefined,
    accept: 'application/json, text/event-stream',
    body
  });
}

function relayRequest(address, pathname, body) {
  return edgeRequest(address, 'POST', pathname, {
    authorization: `Bearer ${RELAY_TOKEN}`,
    body
  });
}

async function waitForClaim(address) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const result = await relayRequest(address, '/v1/relay/claim', { relay_id: 'r4d-local-relay' });
    if (result.statusCode === 200) return result;
    assert.equal(result.statusCode, 204);
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail('relay claim not available');
}

function edgeRequest(address, method, pathname, { authorization, accept, body } = {}) {
  const headers = {
    host: new URL(PUBLIC_ORIGIN).host,
    'x-forwarded-proto': 'https'
  };
  if (authorization !== undefined) headers.authorization = authorization;
  if (accept !== undefined) headers.accept = accept;
  return rawRequest(address, method, pathname, headers, body);
}

function rawRequest(address, method, pathname, headers, body) {
  return new Promise((resolve, rejectRequest) => {
    const encoded = body === undefined ? null : Buffer.from(JSON.stringify(body), 'utf8');
    const request = http.request({
      host: address.host,
      port: address.port,
      path: pathname,
      method,
      headers: {
        ...headers,
        ...(encoded ? {
          'content-type': 'application/json',
          'content-length': encoded.length
        } : {})
      }
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let parsed = null;
        if (text) {
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = text;
          }
        }
        resolve({ statusCode: response.statusCode, headers: response.headers, body: parsed });
      });
    });
    request.on('error', rejectRequest);
    if (encoded) request.end(encoded);
    else request.end();
  });
}
