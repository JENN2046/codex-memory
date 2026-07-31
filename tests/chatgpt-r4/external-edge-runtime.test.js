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
  CHATGPT_EDGE_DATA_SCHEMA_VERSION,
  ZERO_MEMORY_COUNTERS,
  appendGovernedReadAttemptStage,
  createChatGptEdgeDataResponseV2,
  createGovernedReadAttemptProtocol,
  createResponseEnvelope,
  createTerminalEnvelope,
  digestObject,
  governedReadAttemptResponseBindingDigest,
  projectLegacyCountersFromGovernedReadAttempt,
  sha256,
  validateResponseEnvelope
} = require('../../packages/chatgpt-r4-contracts');
const {
  MODEL_WORKFLOW_INSTRUCTIONS,
  createAuth0TokenVerifier,
  createExternalEdgeRuntime,
  createExternalMcpHandler,
  createTransientRequestBroker,
  normalizeBrokerResult,
  validateExternalEdgeRuntimeConfig
} = require('../../apps/chatgpt-edge');

const PUBLIC_ORIGIN = 'https://memory.codex-memory.dev';
const MCP_RESOURCE = `${PUBLIC_ORIGIN}/mcp`;
const ISSUER = 'https://tenant.codex-memory.dev/';
const JWKS_URI = 'https://tenant.codex-memory.dev/.well-known/jwks.json';
const OAUTH_CLIENT_ID = 'r4-private-client-id';
const OPERATOR_SUBJECT = 'auth0|jenn-synthetic-operator';
const OPERATOR_FINGERPRINT = sha256(`${ISSUER}\n${OPERATOR_SUBJECT}`);
const ACCESS_TOKEN = 'synthetic_access_token_value_00000000000000000001';
const INSUFFICIENT_SCOPE_TOKEN = 'synthetic_scope_token_value_000000000000000000001';
const RELAY_TOKEN = 'synthetic_relay_token_value_00000000000000000001';

test('Auth0 verifier binds RS256 issuer, audience, client, scope, and single operator', async () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = 'auth0-synthetic-rs256';
  publicJwk.use = 'sig';
  publicJwk.alg = 'RS256';
  const verifier = createAuth0TokenVerifier({
    issuer: ISSUER,
    audience: MCP_RESOURCE,
    jwksUri: JWKS_URI,
    expectedClientId: OAUTH_CLIENT_ID,
    operatorSubjectFingerprint: OPERATOR_FINGERPRINT,
    jwks: createLocalJWKSet({ keys: [publicJwk] })
  });

  const valid = await signAccessToken(privateKey, {
    subject: OPERATOR_SUBJECT,
    audience: MCP_RESOURCE,
    clientId: OAUTH_CLIENT_ID,
    scope: 'memory.read'
  });
  const accepted = await verifier(valid);
  assert.equal(accepted.issuer, ISSUER);
  assert.equal(accepted.audience, MCP_RESOURCE);
  assert.equal(accepted.clientId, OAUTH_CLIENT_ID);
  assert.equal(accepted.subjectFingerprint, OPERATOR_FINGERPRINT);
  assert.deepEqual(accepted.scopes, ['memory.read']);

  for (const mutation of [
    { subject: 'auth0|other-operator' },
    { audience: 'https://other.codex-memory.dev' },
    { audience: [MCP_RESOURCE, 'https://other.codex-memory.dev'] },
    { clientId: 'other-client-id' },
    { scope: 'openid' }
  ]) {
    const token = await signAccessToken(privateKey, {
      subject: OPERATOR_SUBJECT,
      audience: MCP_RESOURCE,
      clientId: OAUTH_CLIENT_ID,
      scope: 'memory.read',
      ...mutation
    });
    await assert.rejects(verifier(token), error => /^edge_oauth_/u.test(error.code));
  }
});

test('external Edge serves PRMD and returns governed data response v2', async t => {
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
      if (token === INSUFFICIENT_SCOPE_TOKEN) {
        throw Object.assign(new Error('edge_oauth_scope_missing'), {
          code: 'edge_oauth_scope_missing'
        });
      }
      if (token !== ACCESS_TOKEN) throw Object.assign(new Error('edge_oauth_token_invalid'), {
        code: 'edge_oauth_token_invalid'
      });
      return {
        issuer: ISSUER,
        audience: MCP_RESOURCE,
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
    resource: MCP_RESOURCE,
    authorization_servers: [ISSUER],
    scopes_supported: ['memory.read'],
    bearer_methods_supported: ['header'],
    resource_name: 'codex-memory private project memory'
  });
  const pathAwarePrmd = await edgeRequest(address, 'GET', '/.well-known/oauth-protected-resource/mcp');
  assert.equal(pathAwarePrmd.statusCode, 200);
  assert.deepEqual(pathAwarePrmd.body, prmd.body);
  const unauthenticated = await mcpRequest(address, initializeRequest(1), null);
  assert.equal(unauthenticated.statusCode, 401);
  assert.match(
    unauthenticated.headers['www-authenticate'],
    /resource_metadata="https:\/\/memory\.codex-memory\.dev\/\.well-known\/oauth-protected-resource\/mcp"/u
  );
  assert.match(unauthenticated.headers['www-authenticate'], /scope="memory\.read"/u);
  assert.match(unauthenticated.headers['www-authenticate'], /error="invalid_request"/u);
  assert.match(unauthenticated.headers['www-authenticate'], /error_description="OAuth authorization is required\."/u);
  assert.equal(unauthenticated.body.jsonrpc, '2.0');
  assert.equal(unauthenticated.body.id, null);
  assert.equal(unauthenticated.body.error.code, -32001);
  assert.deepEqual(unauthenticated.body.error.data, {
    error: 'invalid_request',
    _meta: {
      'mcp/www_authenticate': [unauthenticated.headers['www-authenticate']]
    }
  });

  const unauthenticatedGet = await edgeRequest(address, 'GET', '/mcp');
  assert.equal(unauthenticatedGet.statusCode, 401);
  assert.match(unauthenticatedGet.headers['www-authenticate'], /resource_metadata=/u);
  assert.match(unauthenticatedGet.headers['www-authenticate'], /scope="memory\.read"/u);
  assert.match(unauthenticatedGet.headers['www-authenticate'], /error="invalid_request"/u);
  assert.match(unauthenticatedGet.headers['www-authenticate'], /error_description=/u);

  const invalidToken = await mcpRequest(
    address,
    initializeRequest(2),
    'invalid_access_token_value_00000000000000000001'
  );
  assert.equal(invalidToken.statusCode, 401);
  assert.match(invalidToken.headers['www-authenticate'], /error="invalid_token"/u);
  assert.match(invalidToken.headers['www-authenticate'], /error_description="OAuth token is invalid\."/u);
  assert.deepEqual(invalidToken.body.error.data._meta['mcp/www_authenticate'], [
    invalidToken.headers['www-authenticate']
  ]);

  const insufficientScope = await mcpRequest(address, initializeRequest(3), INSUFFICIENT_SCOPE_TOKEN);
  assert.equal(insufficientScope.statusCode, 403);
  assert.match(insufficientScope.headers['www-authenticate'], /error="insufficient_scope"/u);
  assert.match(insufficientScope.headers['www-authenticate'], /error_description="OAuth scope is insufficient\."/u);
  assert.deepEqual(insufficientScope.body.error.data._meta['mcp/www_authenticate'], [
    insufficientScope.headers['www-authenticate']
  ]);

  const authenticatedGet = await edgeRequest(address, 'GET', '/mcp', {
    authorization: `Bearer ${ACCESS_TOKEN}`
  });
  assert.equal(authenticatedGet.statusCode, 405);
  assert.equal(authenticatedGet.headers.allow, 'POST');

  const initialized = await mcpRequest(address, initializeRequest(4), ACCESS_TOKEN);
  assert.equal(initialized.statusCode, 200);
  assert.match(initialized.headers['content-type'], /^text\/event-stream/u);
  assert.equal(initialized.body.result.serverInfo.name, 'codex-memory-chatgpt-r4-edge');
  assert.equal(initialized.body.result.instructions, MODEL_WORKFLOW_INSTRUCTIONS);

  const tools = await mcpRequest(address, rpcRequest(5, 'tools/list'), ACCESS_TOKEN);
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
  const resolveTool = tools.body.result.tools.find(tool => tool.name === 'resolve_memory_context');
  assert.deepEqual(resolveTool.inputSchema.required, ['project_alias', 'requested_visibility']);

  const resources = await mcpRequest(address, rpcRequest(6, 'resources/list'), ACCESS_TOKEN);
  assert.equal(resources.statusCode, 200);
  assert.equal(resources.body.result.resources[0].mimeType, 'text/html;profile=mcp-app');
  const resource = await mcpRequest(address, rpcRequest(7, 'resources/read', {
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

  const resolveCall = mcpRequest(address, rpcRequest(8, 'tools/call', {
    name: 'resolve_memory_context',
    arguments: {
      project_alias: 'project-alpha',
      requested_visibility: 'project'
    }
  }), ACCESS_TOKEN);
  const resolveClaim = await waitForClaim(address);
  assert.equal(
    Object.hasOwn(resolveClaim.body, 'governed_read_attempt'),
    false
  );
  await relayRequest(address, '/v1/relay/ack', {
    request_id: resolveClaim.body.request_id,
    claim_token: resolveClaim.body.claim_token
  });
  const resolveResponse = createResponseEnvelope({
    requestId: resolveClaim.body.request.request_id,
    requestDigest: digestObject(resolveClaim.body.request),
    toolName: 'resolve_memory_context',
    status: 'ok',
    structuredContent: {
      schema_version: CHATGPT_EDGE_DATA_SCHEMA_VERSION,
      project_context_ref: `pctx_${'A'.repeat(32)}`,
      safe_project_alias: 'project-alpha',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      visibility_labels: ['project'],
      context_status: 'resolved'
    },
    counters: { ...ZERO_MEMORY_COUNTERS },
    receiptChain: {
      edge_request: digestObject(resolveClaim.body.request),
      relay: sha256('r4d-resolve-relay-receipt'),
      governance: sha256('r4d-resolve-governance-receipt'),
      context: sha256('r4d-resolve-context-receipt')
    },
    signing: signing(relayIdentity)
  });
  await relayRequest(address, '/v1/relay/complete', {
    request_id: resolveClaim.body.request_id,
    claim_token: resolveClaim.body.claim_token,
    response: resolveResponse
  });
  const resolved = await resolveCall;
  assert.equal(
    resolved.body.result.structuredContent.schema_version,
    CHATGPT_EDGE_DATA_SCHEMA_VERSION
  );
  assert.equal(
    Object.hasOwn(resolved.body.result.structuredContent, 'attempt'),
    false
  );

  const toolCall = mcpRequest(address, rpcRequest(9, 'tools/call', {
    name: 'memory_overview',
    arguments: { project_context_ref: `pctx_${'A'.repeat(32)}` }
  }), ACCESS_TOKEN);
  const claim = await waitForClaim(address);
  assert.equal(claim.statusCode, 200);
  assert.equal(
    claim.body.governed_read_attempt.header.tool_name,
    'memory_overview'
  );
  await relayRequest(address, '/v1/relay/ack', {
    request_id: claim.body.request_id,
    claim_token: claim.body.claim_token
  });
  const candidate = successfulAttemptCandidate(
    claim.body.governed_read_attempt
  );
  const response = createResponseEnvelope({
    requestId: claim.body.request.request_id,
    requestDigest: digestObject(claim.body.request),
    toolName: 'memory_overview',
    status: 'ok',
    structuredContent: createChatGptEdgeDataResponseV2({
      toolName: 'memory_overview',
      structuredContent: {
        status: 'empty',
        kind: 'overview',
        item_count: 0
      },
      governedReadAttempt: candidate
    }),
    counters: projectLegacyCountersFromGovernedReadAttempt(candidate),
    receiptChain: {
      edge_request: digestObject(claim.body.request),
      relay: governedReadAttemptResponseBindingDigest({
        requestDigest: digestObject(claim.body.request),
        terminalDigest: candidate.terminal.terminal_digest
      }),
      governance: sha256('r4d-governance-receipt'),
      context: sha256('r4d-context-receipt')
    },
    signing: signing(relayIdentity)
  });
  const completed = await relayRequest(address, '/v1/relay/complete', {
    request_id: claim.body.request_id,
    claim_token: claim.body.claim_token,
    response,
    governed_read_attempt_candidate: candidate
  });
  assert.equal(completed.statusCode, 200);
  const toolResult = await toolCall;
  assert.equal(toolResult.statusCode, 200);
  assert.deepEqual(toolResult.body.result.structuredContent, {
    schema_version: CHATGPT_EDGE_DATA_SCHEMA_VERSION,
    status: 'empty',
    kind: 'overview',
    item_count: 0,
    attempt: toolResult.body.result.structuredContent.attempt
  });
  assert.equal(
    toolResult.body.result.structuredContent.attempt.outcome,
    'success'
  );
  assert.match(toolResult.body.result.content[0].text, /workflow is consumed/u);
  assert.match(toolResult.body.result.content[0].text, /Omit every category not returned here/u);
  assert.deepEqual(
    toolResult.body.result._meta['codex-memory/counters'],
    projectLegacyCountersFromGovernedReadAttempt(candidate)
  );
  assert.match(toolResult.body.result._meta['codex-memory/receiptChainDigest'], /^sha256:[a-f0-9]{64}$/u);

  assert.equal(runtime.snapshot().durable_remote_state, false);
  const serializedEvents = JSON.stringify(events);
  assert.doesNotMatch(serializedEvents, /project_context_ref|tool_request|structured_content|claim_token|authorization/iu);
});

test('external Edge returns a terminal v2 attempt after rejected completion timeout', { timeout: 5_000 }, async t => {
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
        audience: MCP_RESOURCE,
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
  const candidate = successfulAttemptCandidate(
    claim.body.governed_read_attempt
  );
  const nonzeroResponse = createResponseEnvelope({
    requestId: claim.body.request.request_id,
    requestDigest: digestObject(claim.body.request),
    toolName: 'memory_overview',
    status: 'ok',
    structuredContent: createChatGptEdgeDataResponseV2({
      toolName: 'memory_overview',
      structuredContent: {
        status: 'empty',
        kind: 'overview',
        item_count: 0
      },
      governedReadAttempt: candidate
    }),
    counters: {
      ...projectLegacyCountersFromGovernedReadAttempt(candidate),
      provider_calls: 0
    },
    receiptChain: {
      edge_request: digestObject(claim.body.request),
      relay: governedReadAttemptResponseBindingDigest({
        requestDigest: digestObject(claim.body.request),
        terminalDigest: candidate.terminal.terminal_digest
      }),
      governance: sha256('negative-governance'),
      context: sha256('negative-context')
    },
    signing: signing(relayIdentity)
  });
  const rejected = await relayRequest(address, '/v1/relay/complete', {
    request_id: claim.body.request_id,
    claim_token: claim.body.claim_token,
    response: nonzeroResponse,
    governed_read_attempt_candidate: candidate
  });
  assert.equal(rejected.statusCode, 400);
  assert.equal(rejected.body.error, 'relay_attempt_counter_mismatch');
  const timedOut = await toolCall;
  assert.equal(timedOut.statusCode, 200);
  assert.equal(timedOut.body.result.isError, true);
  assert.equal(
    timedOut.body.result.structuredContent.schema_version,
    CHATGPT_EDGE_DATA_SCHEMA_VERSION
  );
  assert.equal(
    timedOut.body.result.structuredContent.attempt.reason_code,
    'attempt_timeout'
  );
  assert.equal(
    timedOut.body.result.structuredContent.attempt.evidence_complete,
    false
  );
  assert.match(
    timedOut.body.result.content[0].text,
    /not a transport timeout/u
  );
  const late = await relayRequest(address, '/v1/relay/complete', {
    request_id: claim.body.request_id,
    claim_token: claim.body.claim_token,
    response: nonzeroResponse,
    governed_read_attempt_candidate: candidate
  });
  assert.equal(late.statusCode, 410);
});

test('external Edge retains a delayed timeout from its actual terminal commit', async () => {
  let current = new Date('2026-07-31T00:00:00.000Z');
  const broker = createTransientRequestBroker({
    async verifyRequest() {},
    async verifyResponse() {},
    clock: () => current,
    maxInFlight: 1,
    maxRecords: 1,
    terminalRetentionMs: 10
  });
  const contextRef = `pctx_${'R'.repeat(32)}`;
  const request = marker => ({
    request_id: `req_external_retention_${marker}_00000001`,
    nonce: `request_nonce_external_retention_${marker}_01`,
    expires_at: new Date(
      current.getTime() + 60_000
    ).toISOString(),
    tool_request: {
      name: 'search_memory',
      arguments: {
        project_context_ref: contextRef
      }
    }
  });
  const first = request('first');
  await broker.submit(first);
  current = new Date(Date.parse(first.expires_at) + 11);
  const retry = request('retry');
  await assert.rejects(
    broker.submit(retry),
    { code: 'edge_record_capacity_exceeded' }
  );
  current = new Date(current.getTime() + 10);
  assert.equal(
    (await broker.submit(retry)).status,
    'queued'
  );
  broker.close();
});

test('external Edge replay capacity spans the request TTL across terminal turnover', async () => {
  let current = new Date('2026-07-31T00:00:00.000Z');
  const broker = createTransientRequestBroker({
    async verifyRequest() {},
    async verifyResponse() {},
    clock: () => current,
    maxInFlight: 1,
    maxRecords: 1,
    terminalRetentionMs: 10
  });
  const contextRef = `pctx_${'T'.repeat(32)}`;
  const request = marker => ({
    request_id:
      `req_external_replay_turnover_${marker}_000001`,
    nonce:
      `request_nonce_external_replay_turnover_${marker}_01`,
    expires_at: new Date(
      current.getTime() + 60_000
    ).toISOString(),
    tool_request: {
      name: 'search_memory',
      arguments: {
        project_context_ref: contextRef
      }
    }
  });
  const first = request('first');
  const requests = [
    first,
    request('second'),
    request('third'),
    request('fourth')
  ];
  for (const currentRequest of requests) {
    assert.equal(
      (await broker.submit(currentRequest)).status,
      'queued'
    );
    assert.equal(
      broker.cancel(currentRequest.request_id).status,
      'cancelled'
    );
    current = new Date(current.getTime() + 10);
  }
  await assert.rejects(
    broker.submit(first),
    { code: 'replay_detected' }
  );
  assert.equal(
    (await broker.submit(request('fresh'))).status,
    'queued'
  );
  broker.close();
});

test('external Edge preserves a positive subsecond attempt budget for one-second requests', async () => {
  const createdAt = new Date('2026-07-31T00:00:00.000Z');
  let current = new Date(createdAt);
  const requestDeadline = new Date(
    createdAt.getTime() + 1_000
  ).toISOString();
  const broker = createTransientRequestBroker({
    async verifyRequest() {
      current = new Date(createdAt.getTime() + 1);
    },
    async verifyResponse() {},
    clock: () => current
  });
  const contextRef = `pctx_${'S'.repeat(32)}`;
  const request = {
    request_id: 'req_external_one_second_ttl_000001',
    nonce: 'request_nonce_external_one_second_ttl_01',
    expires_at: requestDeadline,
    tool_request: {
      name: 'search_memory',
      arguments: {
        project_context_ref: contextRef
      }
    }
  };

  const submitted = await broker.submit(request);
  const claim = broker.claim('one-second-relay');
  assert.equal(submitted.status, 'queued');
  assert.equal(
    claim.governed_read_attempt.header.created_at,
    current.toISOString()
  );
  assert.equal(
    claim.governed_read_attempt.header.deadline_at,
    requestDeadline
  );
  assert.equal(
    Date.parse(claim.governed_read_attempt.header.deadline_at) -
      Date.parse(claim.governed_read_attempt.header.created_at),
    999
  );
  broker.close();
});

test('external Edge does not commit a terminal before response cloning succeeds', async () => {
  const broker = createTransientRequestBroker({
    async verifyRequest() {},
    async verifyResponse() {}
  });
  const contextRef = `pctx_${'C'.repeat(32)}`;
  const request = {
    request_id: 'req_external_clone_failure_000000001',
    nonce: 'request_nonce_external_clone_failure_01',
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    tool_request: {
      name: 'search_memory',
      arguments: {
        project_context_ref: contextRef
      }
    }
  };
  await broker.submit(request);
  const claim = broker.claim('external-clone-failure-relay');
  broker.acknowledge(claim.request_id, claim.claim_token);
  const candidate = successfulAttemptCandidate(
    claim.governed_read_attempt
  );
  const response = {
    receipt_chain: {
      relay: governedReadAttemptResponseBindingDigest({
        requestDigest: digestObject(request),
        terminalDigest: candidate.terminal.terminal_digest
      })
    },
    structured_content: createChatGptEdgeDataResponseV2({
      toolName: 'search_memory',
      structuredContent: {
        status: 'empty',
        result_count: 0,
        results: []
      },
      governedReadAttempt: candidate
    }),
    uncloneable: () => {}
  };

  await assert.rejects(
    broker.complete(
      claim.request_id,
      claim.claim_token,
      response,
      candidate
    ),
    error => error?.name === 'DataCloneError'
  );
  assert.deepEqual(
    broker.cancel(claim.request_id),
    {
      request_id: claim.request_id,
      status: 'cancelled'
    }
  );
  assert.equal(
    broker.result(claim.request_id)
      .governed_read_attempt_result
      .governed_read_attempt
      .terminal
      .reason_code,
    'attempt_cancelled'
  );
  broker.close();
});

test('external MCP independently requires signed canonical broker evidence before public output', async t => {
  const now = new Date('2026-07-31T00:00:00.000Z');
  const relayIdentity = signingIdentity(
    'external-normalization-relay'
  );
  const request = {
    request_id: 'req_external_legacy_broker_00000001',
    nonce: 'request_nonce_external_legacy_broker_01',
    expires_at: new Date(
      now.getTime() + 60_000
    ).toISOString(),
    tool_request: {
      name: 'search_memory',
      arguments: {
        project_context_ref: `pctx_${'N'.repeat(32)}`
      }
    }
  };
  const verifyBrokerResponse = (response, expectedRequest) =>
    validateResponseEnvelope(response, {
      now,
      resolveResponsePublicKey: keyId =>
        keyId === relayIdentity.keyId
          ? relayIdentity.publicKey
          : null,
      expectedRequest
    });
  const broker = createTransientRequestBroker({
    async verifyRequest() {},
    verifyResponse: verifyBrokerResponse,
    clock: () => now
  });
  t.after(() => broker.close());
  await broker.submit(request);
  const claim = broker.claim('normalization-relay');
  broker.acknowledge(claim.request_id, claim.claim_token);
  const candidate = successfulAttemptCandidate(
    claim.governed_read_attempt
  );
  const response = createResponseEnvelope({
    requestId: request.request_id,
    requestDigest: digestObject(request),
    toolName: 'search_memory',
    status: 'ok',
    structuredContent: createChatGptEdgeDataResponseV2({
      toolName: 'search_memory',
      structuredContent: {
        status: 'empty',
        result_count: 0,
        results: []
      },
      governedReadAttempt: candidate
    }),
    counters:
      projectLegacyCountersFromGovernedReadAttempt(candidate),
    receiptChain: {
      edge_request: digestObject(request),
      relay: governedReadAttemptResponseBindingDigest({
        requestDigest: digestObject(request),
        terminalDigest: candidate.terminal.terminal_digest
      }),
      governance: sha256('normalization-governance'),
      context: sha256('normalization-context')
    },
    now,
    signing: signing(relayIdentity)
  });
  await broker.complete(
    claim.request_id,
    claim.claim_token,
    response,
    candidate
  );
  const brokerResult = await broker.waitForResult(
    request.request_id
  );
  assert.deepEqual(
    normalizeBrokerResult(
      'search_memory',
      request,
      brokerResult,
      { verifyBrokerResponse }
    ),
    response
  );

  assert.throws(
    () => normalizeBrokerResult(
      'search_memory',
      request,
      response,
      { verifyBrokerResponse }
    ),
    { code: 'edge_attempt_response_result_required' }
  );

  const unsigned = structuredClone(brokerResult);
  const signatureHead =
    unsigned.response.signature.value.at(0);
  unsigned.response.signature.value =
    `${signatureHead === 'A' ? 'B' : 'A'}` +
    `${unsigned.response.signature.value.slice(1)}`;
  assert.throws(
    () => normalizeBrokerResult(
      'search_memory',
      request,
      unsigned,
      { verifyBrokerResponse }
    ),
    error => /signature/u.test(error?.code || '')
  );

  const incomplete = structuredClone(brokerResult);
  incomplete.governed_read_attempt.receipts.pop();
  assert.throws(
    () => normalizeBrokerResult(
      'search_memory',
      request,
      incomplete,
      { verifyBrokerResponse }
    ),
    { code: 'edge_attempt_response_binding_invalid' }
  );

  const wrongRelayBinding = createResponseEnvelope({
    requestId: request.request_id,
    requestDigest: digestObject(request),
    toolName: 'search_memory',
    status: 'ok',
    structuredContent: response.structured_content,
    counters: response.counters,
    receiptChain: {
      ...response.receipt_chain,
      relay: sha256('wrong-normalization-relay-binding')
    },
    now,
    signing: signing(relayIdentity)
  });
  assert.throws(
    () => normalizeBrokerResult(
      'search_memory',
      request,
      {
        ...brokerResult,
        response: wrongRelayBinding
      },
      { verifyBrokerResponse }
    ),
    { code: 'edge_attempt_response_binding_invalid' }
  );
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
  const boundedSlowRead = validateExternalEdgeRuntimeConfig({
    ...base,
    requestTtlSeconds: 60,
    responseTimeoutMs: 60_000,
    claimLeaseMs: 60_000
  });
  assert.equal(boundedSlowRead.requestTtlSeconds, 60);
  assert.equal(boundedSlowRead.responseTimeoutMs, 60_000);
  assert.equal(boundedSlowRead.claimLeaseMs, 60_000);
  assert.throws(() => validateExternalEdgeRuntimeConfig({
    ...base,
    requestTtlSeconds: 61
  }), { code: 'edge_request_ttl_invalid' });
  assert.throws(() => validateExternalEdgeRuntimeConfig({
    ...base,
    responseTimeoutMs: 30_001,
    claimLeaseMs: 30_001
  }), { code: 'edge_response_timeout_exceeds_request_ttl' });
  assert.throws(() => validateExternalEdgeRuntimeConfig({
    ...base,
    responseTimeoutMs: 30_000,
    claimLeaseMs: 30_001
  }), { code: 'edge_claim_lease_exceeds_request_ttl' });
  assert.throws(() => createExternalMcpHandler({
    broker: { submit() {}, waitForResult() {} },
    issuer: ISSUER,
    audience: MCP_RESOURCE,
    edgeSigning: signing(edgeIdentity),
    requestTtlSeconds: 30,
    responseTimeoutMs: 60_000
  }), { code: 'edge_response_timeout_exceeds_request_ttl' });
  assert.throws(() => validateExternalEdgeRuntimeConfig({
    ...base,
    broker: {
      governedReadAttempts: true
    }
  }), { code: 'edge_custom_broker_forbidden' });
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

function successfulAttemptCandidate(initialWorkingSet) {
  let workingSet = initialWorkingSet;
  for (const stage of [
    'RELAY_CLAIMED',
    'AUTHORIZED',
    'BRIDGE_DELEGATED',
    'NATIVE_DISPATCHED',
    'SOURCE_PREFLIGHT',
    'PROVIDER_EMBEDDING',
    'HYDRATION',
    'INDEX_RECOVERY',
    'VECTOR_SEARCH',
    'SCOPE_POSTCHECK',
    'RESPONSE_FINALIZATION'
  ]) {
    const counterFacts = {
      BRIDGE_DELEGATED: {
        fallback: { attempts: 0 }
      },
      NATIVE_DISPATCHED: {
        native_invocation: { started: 1 },
        primary_memory: {
          write_attempts: 0,
          writes_committed: 0
        }
      },
      PROVIDER_EMBEDDING: {
        provider: {
          started: 1,
          succeeded: 1,
          failed: 0
        }
      },
      HYDRATION: {
        derived_transaction: {
          started: 1,
          committed: 1,
          rolled_back: 0
        }
      },
      VECTOR_SEARCH: {
        native_invocation: {
          succeeded: 1,
          failed: 0
        }
      }
    }[stage] || {};
    workingSet = appendGovernedReadAttemptStage(workingSet, {
      stage,
      counterFacts
    });
  }
  const terminal = createTerminalEnvelope({
    header: workingSet.header,
    receipts: workingSet.receipts,
    outcome: 'success',
    evidenceComplete: true
  });
  return createGovernedReadAttemptProtocol({
    header: workingSet.header,
    receipts: workingSet.receipts,
    terminal
  });
}

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
            parsed = parseResponseBody(text, response.headers['content-type']);
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

function parseResponseBody(text, contentType) {
  if (!String(contentType || '').startsWith('text/event-stream')) return JSON.parse(text);
  const dataLines = text.split(/\r?\n/u)
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice(5).trim())
    .filter(Boolean);
  if (dataLines.length !== 1) throw new Error('unexpected_sse_message_count');
  return JSON.parse(dataLines[0]);
}
