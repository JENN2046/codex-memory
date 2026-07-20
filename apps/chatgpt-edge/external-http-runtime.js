'use strict';

const crypto = require('node:crypto');
const http = require('node:http');

const {
  LIMITS,
  validateRequestEnvelope,
  validateResponseEnvelope,
  reject
} = require('../../packages/chatgpt-r4-contracts');
const { createAuth0TokenVerifier, SUBJECT_FINGERPRINT_PATTERN } = require('./auth0-token-verifier');
const { createExternalMcpHandler } = require('./external-mcp');
const { createTransientRequestBroker } = require('./transient-request-broker');

const PRMD_PATH = '/.well-known/oauth-protected-resource';
const MCP_PATH = '/mcp';
const PRMD_MCP_PATH = `${PRMD_PATH}${MCP_PATH}`;
const HEALTH_PATH = '/healthz';
const RELAY_PATHS = new Set([
  '/v1/relay/claim',
  '/v1/relay/ack',
  '/v1/relay/complete',
  '/v1/relay/state'
]);
const MAX_HTTP_BODY_BYTES = LIMITS.maxResponseBytes + LIMITS.maxRequestBytes + 4096;
const NON_PUBLIC_DNS_SUFFIXES = Object.freeze([
  'alt', 'arpa', 'example', 'example.com', 'example.net', 'example.org',
  'internal', 'invalid', 'local', 'localhost', 'onion', 'test'
]);

function createExternalEdgeRuntime(options = {}) {
  const config = validateExternalEdgeRuntimeConfig(options);
  const edgePublicKey = crypto.createPublicKey(config.edgeSigning.privateKey);
  const verifyAccessToken = config.verifyAccessToken || createAuth0TokenVerifier({
    issuer: config.issuer,
    audience: config.publicOrigin,
    jwksUri: config.jwksUri,
    expectedClientId: config.oauthClientId,
    operatorSubjectFingerprint: config.operatorSubjectFingerprint
  });
  const broker = config.broker || createTransientRequestBroker({
    clock: config.clock,
    claimLeaseMs: config.claimLeaseMs,
    terminalRetentionMs: config.terminalRetentionMs,
    maxInFlight: config.maxInFlight,
    maxRecords: config.maxRecords,
    eventSink: config.eventSink,
    eventComponent: 'external_edge_broker',
    verifyRequest(request) {
      return validateRequestEnvelope(request, {
        now: config.clock(),
        resolveRequestPublicKey: keyId => keyId === config.edgeSigning.keyId ? edgePublicKey : null,
        resolvePrincipalPublicKey: ({ key_id: keyId }) => keyId === config.edgeSigning.keyId ? edgePublicKey : null,
        expectedIssuer: config.issuer,
        expectedAudience: config.publicOrigin,
        consumeReplay: false
      });
    },
    verifyResponse(response, request) {
      return validateResponseEnvelope(response, {
        now: config.clock(),
        resolveResponsePublicKey: keyId => keyId === config.relaySigningKeyId
          ? config.relaySigningPublicKey
          : null,
        expectedRequest: request,
        requireZeroCounters: true
      });
    }
  });
  const mcp = createExternalMcpHandler({
    broker,
    issuer: config.issuer,
    audience: config.publicOrigin,
    edgeSigning: config.edgeSigning,
    clock: config.clock,
    requestTtlSeconds: config.requestTtlSeconds,
    responseTimeoutMs: config.responseTimeoutMs
  });
  let started = false;

  const server = http.createServer(async (incoming, outgoing) => {
    setSecurityHeaders(outgoing);
    try {
      validateProxyBinding(incoming, config.publicOrigin);
      const parsed = new URL(incoming.url || '/', 'http://edge.invalid');
      if (parsed.search || parsed.hash) reject('edge_route_query_forbidden');
      const pathname = parsed.pathname;
      const method = incoming.method || '';

      if (method === 'GET' && pathname === HEALTH_PATH) {
        return sendJson(outgoing, 200, {
          status: 'ok',
          stage: 'R4-D-D2A',
          external_runtime_activated: true,
          durable_remote_state: false
        });
      }
      if (method === 'GET' && (pathname === PRMD_PATH || pathname === PRMD_MCP_PATH)) {
        return sendJson(outgoing, 200, protectedResourceMetadata(config));
      }
      if (pathname === MCP_PATH) {
        const authInfo = await authenticateMcp(incoming, verifyAccessToken, config);
        if (method !== 'POST') return sendMethodNotAllowed(outgoing, ['POST']);
        const body = await readJsonBody(incoming, { allowBatch: true });
        return await mcp.handle(incoming, outgoing, body, authInfo);
      }
      if (RELAY_PATHS.has(pathname)) {
        if (method !== 'POST') return sendMethodNotAllowed(outgoing, ['POST']);
        authenticateRelay(incoming, config.relayAuthToken);
        const body = await readJsonBody(incoming);
        return await handleRelay(pathname, body, broker, outgoing);
      }
      return sendJson(outgoing, 404, { error: 'edge_route_not_found' });
    } catch (error) {
      if (outgoing.destroyed || outgoing.headersSent) return;
      const code = safeErrorCode(error?.code, 'edge_request_rejected');
      if (code.startsWith('edge_oauth_') || code === 'edge_mcp_authorization_missing') {
        return sendOauthChallenge(outgoing, config, code);
      }
      if (code === 'edge_relay_authorization_invalid') {
        return sendJson(outgoing, 401, { error: code });
      }
      const status = code === 'replay_detected' || code.endsWith('_replay') ? 409 :
        (code.includes('expired') || code.includes('cancelled') ? 410 :
          (code.includes('too_large') ? 413 : 400));
      return sendJson(outgoing, status, { error: code });
    }
  });
  server.maxHeadersCount = 64;
  server.headersTimeout = 10_000;
  server.requestTimeout = 35_000;
  server.keepAliveTimeout = 5_000;
  server.maxRequestsPerSocket = 100;

  return Object.freeze({
    async start() {
      if (started) reject('edge_runtime_already_started');
      await new Promise((resolve, rejectStart) => {
        const onError = error => {
          server.off('listening', onListening);
          rejectStart(error);
        };
        const onListening = () => {
          server.off('error', onError);
          resolve();
        };
        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(config.bindPort, config.bindHost);
      });
      started = true;
      const address = server.address();
      if (!address || typeof address === 'string') reject('edge_external_bind_failed');
      return Object.freeze({ host: address.address, port: address.port });
    },
    async stop() {
      broker.close();
      if (!started) return;
      await stopServer(server);
      started = false;
    },
    snapshot() {
      return Object.freeze({
        activated: started,
        external_runtime: true,
        durable_remote_state: false,
        broker: broker.snapshot()
      });
    },
    broker,
    handleRequest: server.listeners('request')[0]
  });
}

function validateExternalEdgeRuntimeConfig(options) {
  const publicOrigin = canonicalPublicOrigin(options.publicOrigin);
  const issuer = canonicalIssuer(options.issuer);
  const jwksUri = canonicalJwksUri(options.jwksUri, issuer);
  if (typeof options.oauthClientId !== 'string' || options.oauthClientId.length < 8 ||
      options.oauthClientId.length > 160 || options.oauthClientId.trim() !== options.oauthClientId) {
    reject('edge_oauth_client_id_invalid');
  }
  if (typeof options.operatorSubjectFingerprint !== 'string' ||
      !SUBJECT_FINGERPRINT_PATTERN.test(options.operatorSubjectFingerprint)) {
    reject('edge_operator_subject_fingerprint_invalid');
  }
  if (!options.edgeSigning?.privateKey || typeof options.edgeSigning.keyId !== 'string' ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/u.test(options.edgeSigning.keyId)) {
    reject('edge_signing_invalid');
  }
  if (options.edgeSigning.privateKey.asymmetricKeyType !== 'ed25519') reject('edge_signing_algorithm_invalid');
  let relaySigningPublicKey;
  try {
    relaySigningPublicKey = options.relaySigningPublicKey?.type === 'public'
      ? options.relaySigningPublicKey
      : crypto.createPublicKey(options.relaySigningPublicKey);
  } catch {
    reject('edge_relay_signing_public_key_invalid');
  }
  if (relaySigningPublicKey.asymmetricKeyType !== 'ed25519') {
    reject('edge_relay_signing_algorithm_invalid');
  }
  if (typeof options.relaySigningKeyId !== 'string' ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/u.test(options.relaySigningKeyId)) {
    reject('edge_relay_signing_key_id_invalid');
  }
  const edgeSigningPublicKey = crypto.createPublicKey(options.edgeSigning.privateKey);
  const edgeSigningDer = edgeSigningPublicKey.export({ type: 'spki', format: 'der' });
  const relaySigningDer = relaySigningPublicKey.export({ type: 'spki', format: 'der' });
  if (edgeSigningDer.equals(relaySigningDer)) reject('edge_runtime_signing_authority_reused');
  if (options.edgeSigning.keyId === options.relaySigningKeyId) {
    reject('edge_runtime_signing_key_id_reused');
  }
  if (typeof options.relayAuthToken !== 'string' || options.relayAuthToken.length < 32 ||
      options.relayAuthToken.length > 2048) {
    reject('edge_relay_auth_token_invalid');
  }
  const bindHost = options.bindHost || '127.0.0.1';
  if (!['127.0.0.1', '0.0.0.0'].includes(bindHost)) reject('edge_bind_host_invalid');
  if (bindHost === '0.0.0.0' && options.containerLoopbackPublishRequired !== true) {
    reject('edge_container_loopback_publish_ack_missing');
  }
  const bindPort = options.bindPort === undefined ? 8080 : options.bindPort;
  assertInteger(bindPort, 0, 65_535, 'edge_bind_port_invalid');
  const requestTtlSeconds = options.requestTtlSeconds === undefined ? 30 : options.requestTtlSeconds;
  const responseTimeoutMs = options.responseTimeoutMs === undefined ? requestTtlSeconds * 1000 : options.responseTimeoutMs;
  const claimLeaseMs = options.claimLeaseMs === undefined ? responseTimeoutMs : options.claimLeaseMs;
  const terminalRetentionMs = options.terminalRetentionMs === undefined ? 5_000 : options.terminalRetentionMs;
  const maxInFlight = options.maxInFlight === undefined ? 32 : options.maxInFlight;
  const maxRecords = options.maxRecords === undefined ? 128 : options.maxRecords;
  assertInteger(requestTtlSeconds, 1, 30, 'edge_request_ttl_invalid');
  assertInteger(responseTimeoutMs, 10, 30_000, 'edge_response_timeout_invalid');
  assertInteger(claimLeaseMs, 10, 30_000, 'edge_claim_lease_invalid');
  if (claimLeaseMs < responseTimeoutMs) reject('edge_claim_lease_too_short');
  assertInteger(terminalRetentionMs, 10, 30_000, 'edge_terminal_retention_invalid');
  assertInteger(maxInFlight, 1, 64, 'edge_inflight_limit_invalid');
  assertInteger(maxRecords, maxInFlight, 4096, 'edge_record_limit_invalid');
  if (options.clock !== undefined && typeof options.clock !== 'function') reject('edge_clock_invalid');
  if (options.verifyAccessToken !== undefined && typeof options.verifyAccessToken !== 'function') {
    reject('edge_oauth_verifier_invalid');
  }
  if (options.eventSink !== undefined && typeof options.eventSink !== 'function') reject('edge_event_sink_invalid');
  return Object.freeze({
    publicOrigin,
    issuer,
    jwksUri,
    oauthClientId: options.oauthClientId,
    operatorSubjectFingerprint: options.operatorSubjectFingerprint,
    edgeSigning: options.edgeSigning,
    relaySigningPublicKey,
    relaySigningKeyId: options.relaySigningKeyId,
    relayAuthToken: options.relayAuthToken,
    bindHost,
    bindPort,
    containerLoopbackPublishRequired: options.containerLoopbackPublishRequired === true,
    requestTtlSeconds,
    responseTimeoutMs,
    claimLeaseMs,
    terminalRetentionMs,
    maxInFlight,
    maxRecords,
    clock: options.clock || (() => new Date()),
    verifyAccessToken: options.verifyAccessToken,
    eventSink: options.eventSink,
    broker: options.broker
  });
}

function protectedResourceMetadata(config) {
  return {
    resource: config.publicOrigin,
    authorization_servers: [config.issuer],
    scopes_supported: ['memory.read'],
    bearer_methods_supported: ['header'],
    resource_name: 'codex-memory private project memory'
  };
}

async function authenticateMcp(incoming, verifyAccessToken, config) {
  const token = extractBearerToken(incoming.headers.authorization, 'edge_mcp_authorization_missing');
  const verified = await verifyAccessToken(token);
  if (!verified || verified.issuer !== config.issuer || verified.audience !== config.publicOrigin ||
      verified.clientId !== config.oauthClientId ||
      verified.subjectFingerprint !== config.operatorSubjectFingerprint ||
      !Array.isArray(verified.scopes) || !verified.scopes.includes('memory.read')) {
    reject('edge_oauth_binding_mismatch');
  }
  return {
    token,
    clientId: verified.clientId,
    scopes: [...verified.scopes],
    expiresAt: verified.expiresAt,
    extra: { subjectFingerprint: verified.subjectFingerprint }
  };
}

function authenticateRelay(incoming, expectedToken) {
  const token = extractBearerToken(incoming.headers.authorization, 'edge_relay_authorization_invalid');
  const supplied = Buffer.from(token, 'utf8');
  const expected = Buffer.from(expectedToken, 'utf8');
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    reject('edge_relay_authorization_invalid');
  }
}

function handleRelay(pathname, body, broker, outgoing) {
  if (pathname === '/v1/relay/claim') {
    assertControlKeys(body, ['relay_id']);
    const claim = broker.claim(body.relay_id);
    return claim ? sendJson(outgoing, 200, claim) : sendEmpty(outgoing, 204);
  }
  if (pathname === '/v1/relay/ack') {
    assertControlKeys(body, ['request_id', 'claim_token']);
    return sendJson(outgoing, 200, broker.acknowledge(body.request_id, body.claim_token));
  }
  if (pathname === '/v1/relay/complete') {
    assertControlKeys(body, ['request_id', 'claim_token', 'response']);
    return Promise.resolve(broker.complete(body.request_id, body.claim_token, body.response))
      .then(result => sendJson(outgoing, 200, result));
  }
  assertControlKeys(body, ['request_id', 'claim_token']);
  return sendJson(outgoing, 200, broker.state(body.request_id, body.claim_token));
}

function validateProxyBinding(incoming, publicOrigin) {
  const expected = new URL(publicOrigin);
  const host = incoming.headers.host;
  const forwardedProto = incoming.headers['x-forwarded-proto'];
  if (host !== expected.host || forwardedProto !== 'https') reject('edge_proxy_binding_mismatch');
}

function canonicalPublicOrigin(value) {
  const parsed = parseHttps(value, 'edge_public_origin_invalid');
  if (value !== parsed.origin || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    reject('edge_public_origin_invalid');
  }
  return parsed.origin;
}

function canonicalIssuer(value) {
  const parsed = parseHttps(value, 'edge_oauth_issuer_invalid');
  if (value !== `${parsed.origin}/` || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    reject('edge_oauth_issuer_invalid');
  }
  return value;
}

function canonicalJwksUri(value, issuer) {
  const parsed = parseHttps(value, 'edge_oauth_jwks_uri_invalid');
  if (parsed.origin !== new URL(issuer).origin || parsed.pathname !== '/.well-known/jwks.json' ||
      parsed.search || parsed.hash) {
    reject('edge_oauth_jwks_uri_mismatch');
  }
  return parsed.href;
}

function parseHttps(value, code) {
  if (typeof value !== 'string' || value.trim() !== value || value.length > 2048) reject(code);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    reject(code);
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) reject(code);
  const hostname = parsed.hostname.toLowerCase();
  const labels = hostname.split('.');
  const publicDnsName = hostname.length <= 253 && hostname.includes('.') &&
    !/^\d{1,3}(?:\.\d{1,3}){3}$/u.test(hostname) && !hostname.startsWith('[') &&
    labels.every(label => label.length >= 1 && label.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(label)) &&
    !NON_PUBLIC_DNS_SUFFIXES.some(suffix => hostname === suffix || hostname.endsWith(`.${suffix}`));
  if (!publicDnsName) reject(code);
  return parsed;
}

function extractBearerToken(value, code) {
  if (typeof value !== 'string') reject(code);
  const match = /^Bearer ([A-Za-z0-9._~+/-]{32,16384})$/u.exec(value);
  if (!match) reject(code);
  return match[1];
}

function readJsonBody(incoming, { allowBatch = false } = {}) {
  return new Promise((resolve, rejectRead) => {
    const chunks = [];
    let bytes = 0;
    incoming.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > MAX_HTTP_BODY_BYTES) {
        rejectRead(Object.assign(new Error('edge_http_body_too_large'), { code: 'edge_http_body_too_large' }));
        incoming.destroy();
        return;
      }
      chunks.push(chunk);
    });
    incoming.on('end', () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        const objectBody = body && typeof body === 'object' && !Array.isArray(body);
        const batchBody = allowBatch && Array.isArray(body) && body.length >= 1 && body.length <= 16 &&
          body.every(item => item && typeof item === 'object' && !Array.isArray(item));
        if (!objectBody && !batchBody) reject('edge_http_body_invalid');
        resolve(body);
      } catch (error) {
        rejectRead(Object.assign(new Error('edge_http_body_invalid'), {
          code: safeErrorCode(error?.code, 'edge_http_body_invalid')
        }));
      }
    });
    incoming.on('error', rejectRead);
  });
}

function assertControlKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) reject('edge_control_shape_invalid');
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    reject('edge_control_shape_invalid');
  }
}

function assertInteger(value, minimum, maximum, code) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) reject(code);
}

function sendOauthChallenge(outgoing, config, rejectionCode) {
  const metadata = `${config.publicOrigin}${PRMD_PATH}`;
  const insufficientScope = rejectionCode === 'edge_oauth_scope_missing';
  const error = insufficientScope
    ? 'insufficient_scope'
    : (rejectionCode === 'edge_mcp_authorization_missing' ? 'invalid_request' : 'invalid_token');
  const description = insufficientScope
    ? 'OAuth scope is insufficient.'
    : (error === 'invalid_request' ? 'OAuth authorization is required.' : 'OAuth token is invalid.');
  const challenge = `Bearer resource_metadata="${metadata}", scope="memory.read", error="${error}", error_description="${description}"`;
  outgoing.setHeader(
    'www-authenticate',
    challenge
  );
  return sendJson(outgoing, insufficientScope ? 403 : 401, {
    jsonrpc: '2.0',
    id: null,
    error: {
      code: -32001,
      message: description,
      data: {
        error,
        _meta: { 'mcp/www_authenticate': [challenge] }
      }
    }
  });
}

function sendMethodNotAllowed(outgoing, methods) {
  outgoing.setHeader('allow', methods.join(', '));
  return sendJson(outgoing, 405, { error: 'method_not_allowed' });
}

function setSecurityHeaders(outgoing) {
  outgoing.setHeader('cache-control', 'no-store');
  outgoing.setHeader('x-content-type-options', 'nosniff');
  outgoing.setHeader('referrer-policy', 'no-referrer');
  outgoing.setHeader('content-security-policy', "default-src 'none'; frame-ancestors 'none'");
}

function sendJson(outgoing, statusCode, value) {
  if (outgoing.destroyed || outgoing.headersSent) return;
  const body = JSON.stringify(value);
  outgoing.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body)
  });
  outgoing.end(body);
}

function sendEmpty(outgoing, statusCode) {
  if (outgoing.destroyed || outgoing.headersSent) return;
  outgoing.writeHead(statusCode, { 'content-length': '0' });
  outgoing.end();
}

function safeErrorCode(value, fallback) {
  return typeof value === 'string' && /^[a-z][a-z0-9_]{0,79}$/u.test(value) ? value : fallback;
}

function stopServer(server) {
  return new Promise((resolve, rejectStop) => {
    server.close(error => error ? rejectStop(error) : resolve());
    server.closeAllConnections?.();
  });
}

module.exports = {
  HEALTH_PATH,
  MCP_PATH,
  PRMD_PATH,
  PRMD_MCP_PATH,
  RELAY_PATHS,
  authenticateRelay,
  canonicalIssuer,
  canonicalJwksUri,
  canonicalPublicOrigin,
  createExternalEdgeRuntime,
  extractBearerToken,
  protectedResourceMetadata,
  validateExternalEdgeRuntimeConfig,
  validateProxyBinding
};
