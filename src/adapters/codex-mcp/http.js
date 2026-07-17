'use strict';

const http = require('node:http');
const crypto = require('node:crypto');
const { constants: fsConstants } = require('node:fs');
const fs = require('node:fs/promises');
const path = require('node:path');

const { CodexMemoryMcpServer, jsonRpcError } = require('./server');
const {
  DEFAULT_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
  CHATGPT_WEB_UDS_TRANSPORT
} = require('../../core/constants');
const {
  buildChatGptWebEndpointProfileConfig,
  getChatGptWebEndpointPath,
  normalizeChatGptWebProfileId
} = require('../../core/ChatGptWebProfile');
const {
  buildRecordMemoryTrustedExecutionContext
} = require('../../core/RecordMemoryTrustedExecutionContext');
const {
  projectGovernedMcpVcpNativeBridgeConfigWarnings
} = require('../../core/GovernedMcpVcpNativeBridgeConfigWarningProjection');

const SESSION_HEADER = 'Mcp-Session-Id';
const PROTOCOL_HEADER = 'MCP-Protocol-Version';
const BRIDGE_AUTH_HEADER = 'X-Codex-Memory-Bridge-Auth';
const HTTP_SESSION_LIMIT_ERROR = 'HTTP_SESSION_LIMIT_EXCEEDED';
const HTTP_SESSION_STREAM_LIMIT_ERROR = 'HTTP_SESSION_STREAM_LIMIT_EXCEEDED';
const PUBLIC_REQUEST_BLOCKED = 'PUBLIC_REQUEST_BLOCKED';
const SESSION_HARDENING_SPECS = {
  absoluteTtlMs: {
    envKey: 'CODEX_MEMORY_HTTP_SESSION_TTL_MS',
    defaultValue: 30 * 60 * 1000,
    min: 5 * 60 * 1000,
    max: 24 * 60 * 60 * 1000
  },
  idleTtlMs: {
    envKey: 'CODEX_MEMORY_HTTP_SESSION_IDLE_TTL_MS',
    defaultValue: 10 * 60 * 1000,
    min: 60 * 1000,
    max: 2 * 60 * 60 * 1000
  },
  maxSessions: {
    envKey: 'CODEX_MEMORY_HTTP_MAX_SESSIONS',
    defaultValue: 64,
    min: 1,
    max: 256
  },
  maxStreamsPerSession: {
    envKey: 'CODEX_MEMORY_HTTP_MAX_STREAMS_PER_SESSION',
    defaultValue: 8,
    min: 1,
    max: 32
  },
  cleanupIntervalMs: {
    envKey: 'CODEX_MEMORY_HTTP_SESSION_CLEANUP_INTERVAL_MS',
    defaultValue: 60 * 1000,
    min: 10 * 1000,
    max: 5 * 60 * 1000
  }
};
const NO_TOKEN_BLOCKED_TOOLS = new Set([
  'record_memory',
  'validate_memory',
  'tombstone_memory',
  'update_memory',
  'forget_memory',
  'supersede_memory',
  'prepare_memory_context',
  'propose_memory_delta',
  'audit_memory',
  'checkpoint_memory',
  'handoff_memory',
  'import_memory',
  'export_memory'
]);

function normalizePathname(pathname) {
  if (typeof pathname !== 'string' || !pathname.trim()) {
    return '/';
  }

  const prefixed = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (prefixed.length > 1 && prefixed.endsWith('/')) {
    return prefixed.replace(/\/+$/, '');
  }

  return prefixed;
}

function writeJson(res, statusCode, payload, extraHeaders = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache',
    ...extraHeaders
  });
  res.end(JSON.stringify(payload));
}

function matchesRoute(requestPathname, expectedPathname) {
  return normalizePathname(requestPathname) === normalizePathname(expectedPathname);
}

function getSessionIdFromHeaders(req) {
  const value = req.headers[SESSION_HEADER.toLowerCase()];
  return Array.isArray(value) ? value[0] : value || null;
}

function createUnauthorizedPayload() {
  return {
    error: 'Unauthorized',
    message: 'Missing or invalid bearer token.'
  };
}

function createForbiddenPayload() {
  return {
    error: 'Forbidden',
    status: 'rejected',
    reason: 'blocked'
  };
}

function createForbiddenJsonRpcPayload(body) {
  return jsonRpcError(body?.id ?? null, -32001, 'Forbidden', {
    code: PUBLIC_REQUEST_BLOCKED,
    status: 'rejected',
    reason: 'blocked'
  });
}

function parseHardeningNumber(spec, env = process.env) {
  const raw = env[spec.envKey];
  if (raw === undefined || raw === null || raw === '') {
    return { value: spec.defaultValue, warning: null };
  }

  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || value < spec.min || value > spec.max) {
    return {
      value: spec.defaultValue,
      warning: {
        key: spec.envKey,
        reason: !Number.isFinite(value) ? 'invalid_number' : value <= 0 ? 'non_positive' : 'out_of_range',
        defaultValue: spec.defaultValue,
        min: spec.min,
        max: spec.max
      }
    };
  }

  return { value, warning: null };
}

function createSessionHardeningConfig(env = process.env) {
  const warnings = [];
  const config = {};

  for (const [key, spec] of Object.entries(SESSION_HARDENING_SPECS)) {
    const parsed = parseHardeningNumber(spec, env);
    config[key] = parsed.value;
    if (parsed.warning) {
      warnings.push(parsed.warning);
    }
  }

  return { ...config, warnings };
}

function createSessionLimitPayload({ limitType, limit }) {
  const isStreamLimit = limitType === 'streams_per_session';
  return {
    error: isStreamLimit ? 'session_stream_limit_exceeded' : 'session_limit_exceeded',
    code: isStreamLimit ? HTTP_SESSION_STREAM_LIMIT_ERROR : HTTP_SESSION_LIMIT_ERROR,
    message: isStreamLimit ? 'HTTP session stream limit exceeded' : 'HTTP session limit exceeded',
    meta: {
      limitType,
      limit
    }
  };
}

function normalizeRuntimeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizeWriteReconcileWorkerLastResultSummary(summary) {
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) {
    return null;
  }

  return {
    success: summary.success === true,
    decision: typeof summary.decision === 'string' ? summary.decision : null,
    workerDecision: typeof summary.workerDecision === 'string' ? summary.workerDecision : null,
    dryRun: summary.dryRun === true,
    limit: summary.limit ?? null,
    scannedTaskCount: normalizeRuntimeNumber(summary.scannedTaskCount) ?? 0,
    replayedCount: normalizeRuntimeNumber(summary.replayedCount) ?? 0,
    wouldReplayCount: normalizeRuntimeNumber(summary.wouldReplayCount) ?? 0,
    clearedCount: normalizeRuntimeNumber(summary.clearedCount) ?? 0,
    failedCount: normalizeRuntimeNumber(summary.failedCount) ?? 0,
    skippedCount: normalizeRuntimeNumber(summary.skippedCount) ?? 0,
    hasError: summary.hasError === true
  };
}

function summarizeWriteReconcileWorkerStatus(app) {
  const worker = app?.services?.memoryWriteReconcileWorker;
  if (!worker || typeof worker.getStatus !== 'function') {
    return {
      available: false,
      running: false,
      timerScheduled: false,
      tickInFlight: false,
      runCount: 0,
      intervalMs: null,
      limit: null,
      dryRun: null,
      maxRuns: null,
      lastResultSummary: null
    };
  }

  const status = worker.getStatus();
  return {
    available: true,
    running: status.running === true,
    timerScheduled: status.timerScheduled === true,
    tickInFlight: status.tickInFlight === true,
    runCount: normalizeRuntimeNumber(status.runCount) ?? 0,
    intervalMs: normalizeRuntimeNumber(status.intervalMs),
    limit: normalizeRuntimeNumber(status.limit),
    dryRun: status.dryRun === true,
    maxRuns: normalizeRuntimeNumber(status.maxRuns),
    lastResultSummary: sanitizeWriteReconcileWorkerLastResultSummary(status.lastResultSummary)
  };
}

function buildRuntimeHealth(app) {
  const governedNativeBridgeStore = app?.services?.governedNativeBridgeObservationStore;
  return {
    writeReconcileWorker: summarizeWriteReconcileWorkerStatus(app),
    governedNativeBridge: governedNativeBridgeStore &&
      typeof governedNativeBridgeStore.getStatus === 'function'
      ? governedNativeBridgeStore.getStatus()
      : {
          schemaVersion: 'governed_native_bridge_observation_status_v1',
          available: false,
          retainedObservationLimit: 0,
          observationCount: 0,
          latest: null,
          endpointDisclosed: false,
          tokenMaterialDisclosed: false,
          rawRequestBodyDisclosed: false,
          rawResponseBodyDisclosed: false,
          rawMemoryReturned: false,
          readinessClaimed: false
        }
  };
}

function buildRuntimeFreshness(freshness = {}) {
  return {
    algorithm: typeof freshness.algorithm === 'string' ? freshness.algorithm : 'sha256',
    sourceFingerprint: typeof freshness.sourceFingerprint === 'string' ? freshness.sourceFingerprint : null,
    sourceFileCount: Number.isInteger(freshness.sourceFileCount) ? freshness.sourceFileCount : null,
    startedAt: typeof freshness.startedAt === 'string' ? freshness.startedAt : null
  };
}

function buildPolicyGateSummary(app) {
  const config = app?.config || {};
  return {
    securityProfile: typeof config.securityProfile === 'string' ? config.securityProfile : 'unknown',
    softReadPolicyEnabled: config.enableSoftReadPolicy === true,
    lifecycleReadPolicyEnabled: config.enableLifecycleReadPolicy === true,
    writePreflightEnabled: config.enableWritePreflight === true,
    externalProviderAllowed: config.allowExternalProvider === true,
    governedNativeBridgeWarnings: projectGovernedMcpVcpNativeBridgeConfigWarnings(
      config.governedMcpVcpNativeBridgeConfigWarnings
    )
  };
}

function isLoopbackHost(host) {
  const normalized = String(host || '').trim().toLowerCase();
  return normalized === 'localhost'
    || normalized === '127.0.0.1'
    || normalized === '::1'
    || normalized === '[::1]';
}

function getHttpAuthWarning({ host, bearerToken }) {
  if (bearerToken) {
    return null;
  }
  if (!isLoopbackHost(host)) {
    throw new Error('CODEX_MEMORY_HTTP_TOKEN is required when CODEX_MEMORY_HTTP_HOST is not loopback.');
  }
  return 'HTTP MCP is bound to loopback without CODEX_MEMORY_HTTP_TOKEN; local development only. Do not expose this listener beyond this machine.';
}

function getSingleHeaderValue(value) {
  return Array.isArray(value) ? value[0] : value || '';
}

function isJsonContentType(value) {
  const normalized = String(value || '').split(';')[0].trim().toLowerCase();
  return normalized === 'application/json' || normalized.endsWith('+json');
}

function validateNoTokenWriteRequest(req) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return null;
  }

  const origin = getSingleHeaderValue(req.headers.origin).trim();
  if (origin) {
    return true;
  }

  const secFetchSite = getSingleHeaderValue(req.headers['sec-fetch-site']).trim().toLowerCase();
  if (secFetchSite && secFetchSite !== 'none') {
    return true;
  }

  if (req.method === 'POST' && !isJsonContentType(getSingleHeaderValue(req.headers['content-type']))) {
    return true;
  }

  return null;
}

function validateNoTokenJsonRpcRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }

  if (body.method === 'tools/call' && NO_TOKEN_BLOCKED_TOOLS.has(body.params?.name)) {
    return true;
  }
  if (body.method === 'tools/call' && body.params?.name === 'search_memory') {
    return true;
  }

  return null;
}

function parseRequestBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;

    req.on('data', chunk => {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        reject(new Error('Expected a JSON-RPC object body.'));
        return;
      }

      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          reject(new Error('Expected a JSON-RPC object body.'));
          return;
        }
        resolve(parsed);
      } catch (error) {
        reject(new Error(`Invalid JSON body: ${error.message}`));
      }
    });

    req.on('error', reject);
  });
}

function getRawHeaderValues(req, headerName) {
  const normalized = String(headerName || '').trim().toLowerCase();
  const rawHeaders = Array.isArray(req?.rawHeaders) ? req.rawHeaders : [];
  const values = [];
  for (let index = 0; index + 1 < rawHeaders.length; index += 2) {
    if (String(rawHeaders[index]).trim().toLowerCase() === normalized) {
      values.push(String(rawHeaders[index + 1] ?? ''));
    }
  }
  if (values.length > 0) return values;

  const value = req?.headers?.[normalized];
  if (Array.isArray(value)) return value.map(item => String(item));
  return value === undefined ? [] : [String(value)];
}

function getSingleStrictHeaderValue(req, headerName) {
  const values = getRawHeaderValues(req, headerName);
  return values.length === 1 ? values[0].trim() : null;
}

function hasForwardedHeaders(req) {
  return Object.keys(req?.headers || {}).some(headerName => {
    const normalized = String(headerName).trim().toLowerCase();
    return normalized === 'forwarded' || normalized.startsWith('x-forwarded-');
  });
}

function constantTimeStringEqual(left, right) {
  const leftDigest = crypto.createHash('sha256').update(String(left ?? '')).digest();
  const rightDigest = crypto.createHash('sha256').update(String(right ?? '')).digest();
  return crypto.timingSafeEqual(leftDigest, rightDigest);
}

function createChatGptWebTransportError(code) {
  return {
    error: 'MCP transport request rejected',
    code,
    lowDisclosure: true
  };
}

function writeChatGptWebTransportError(res, statusCode, code) {
  writeJson(res, statusCode, createChatGptWebTransportError(code));
}

function isMimeAccepted(req, requiredMime) {
  const header = getSingleStrictHeaderValue(req, 'accept');
  if (!header) return false;
  const required = String(requiredMime).toLowerCase();
  return header.split(',').some(rawEntry => {
    const [rawMime, ...parameters] = rawEntry.split(';');
    const mime = rawMime.trim().toLowerCase();
    const qualityParameter = parameters.find(parameter => parameter.trim().toLowerCase().startsWith('q='));
    if (qualityParameter && Number(qualityParameter.trim().slice(2)) === 0) return false;
    return mime === required || mime === '*/*' ||
      (required.includes('/') && mime === `${required.split('/')[0]}/*`);
  });
}

function isChatGptWebOriginAllowed(req, allowedOrigins = []) {
  const originValues = getRawHeaderValues(req, 'origin');
  if (originValues.length > 1) return false;
  const origin = originValues.length === 1 ? originValues[0].trim() : '';
  if (hasForwardedHeaders(req)) return false;
  const hasBrowserFetchMetadata = Object.keys(req?.headers || {})
    .some(headerName => String(headerName).toLowerCase().startsWith('sec-fetch-'));
  if (hasBrowserFetchMetadata) return false;
  if (!origin) return true;
  return Array.isArray(allowedOrigins) && allowedOrigins.includes(origin);
}

function isChatGptWebBridgeAuthorized(req, bridgeAuthSecret) {
  const authorizationValues = getRawHeaderValues(req, 'authorization');
  const bridgeAuthValue = getSingleStrictHeaderValue(req, BRIDGE_AUTH_HEADER);
  if (authorizationValues.length > 0 || hasForwardedHeaders(req) || !bridgeAuthValue || !bridgeAuthSecret) {
    return false;
  }
  return constantTimeStringEqual(bridgeAuthValue, bridgeAuthSecret);
}

async function loadChatGptWebBridgeAuthSecret(secretFile) {
  if (typeof secretFile !== 'string' || !path.isAbsolute(secretFile)) {
    throw new Error('ChatGPT web bridge auth file is required.');
  }
  const handle = await fs.open(secretFile, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    const fileStat = await handle.stat();
    const currentUid = typeof process.getuid === 'function' ? process.getuid() : null;
    if (!fileStat.isFile() || (fileStat.mode & 0o077) !== 0 ||
        (currentUid !== null && fileStat.uid !== currentUid)) {
      throw new Error('ChatGPT web bridge auth file must be a private operator-owned regular file.');
    }
    const secret = (await handle.readFile('utf8')).trim();
    if (Buffer.byteLength(secret, 'utf8') < 16 || Buffer.byteLength(secret, 'utf8') > 4096) {
      throw new Error('ChatGPT web bridge auth file has an invalid secret length.');
    }
    return secret;
  } finally {
    await handle.close();
  }
}

function validateChatGptWebUdsSocketPath(socketDirectory, socketName) {
  if (typeof socketDirectory !== 'string' || !path.isAbsolute(socketDirectory)) {
    throw new Error('ChatGPT web UDS socket directory must be absolute.');
  }
  const normalizedDirectory = path.normalize(socketDirectory);
  if (normalizedDirectory === '/mnt' || normalizedDirectory.startsWith('/mnt/')) {
    throw new Error('ChatGPT web UDS socket directory must not be a shared mount.');
  }
  if (typeof socketName !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/.test(socketName)) {
    throw new Error('ChatGPT web UDS socket name is invalid.');
  }
  const socketPath = path.join(normalizedDirectory, socketName);
  if (path.dirname(socketPath) !== normalizedDirectory || Buffer.byteLength(socketPath, 'utf8') > 100) {
    throw new Error('ChatGPT web UDS socket path is invalid.');
  }
  return { socketDirectory: normalizedDirectory, socketPath };
}

async function ensureChatGptWebUdsSocketDirectory(socketDirectory) {
  await fs.mkdir(socketDirectory, { recursive: true, mode: 0o700 });
  const normalized = path.resolve(socketDirectory);
  const components = normalized.split(path.sep).filter(Boolean);
  let current = path.parse(normalized).root;
  for (const component of components) {
    current = path.join(current, component);
    const componentStat = await fs.lstat(current);
    if (componentStat.isSymbolicLink()) {
      throw new Error('ChatGPT web UDS socket path must not traverse symbolic links.');
    }
  }
  const directoryStat = await fs.lstat(normalized);
  const currentUid = typeof process.getuid === 'function' ? process.getuid() : null;
  if (!directoryStat.isDirectory() || (directoryStat.mode & 0o777) !== 0o700 ||
      (currentUid !== null && directoryStat.uid !== currentUid)) {
    throw new Error('ChatGPT web UDS socket directory must be operator-owned with mode 0700.');
  }
}

async function assertChatGptWebUdsSocketAbsent(socketPath) {
  try {
    await fs.lstat(socketPath);
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }
  throw new Error('ChatGPT web UDS socket path already exists.');
}

function listenOnUnixSocket(server, socketPath) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(socketPath, () => {
      server.off('error', reject);
      resolve();
    });
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    if (!server.listening) {
      resolve();
      return;
    }
    server.close(error => (error ? reject(error) : resolve()));
  });
}

function buildChatGptWebUdsEndpoints(app, enabledProfileIds) {
  const profileIds = Array.isArray(enabledProfileIds)
    ? enabledProfileIds
    : app?.config?.chatgptWebUds?.enabledProfileIds;
  const endpoints = new Map();
  for (const rawProfileId of Array.isArray(profileIds) ? profileIds : []) {
    const profileId = normalizeChatGptWebProfileId(rawProfileId);
    const endpointPath = getChatGptWebEndpointPath(profileId);
    const profile = buildChatGptWebEndpointProfileConfig(app?.config || {}, profileId);
    if (!endpointPath || profile.enabled !== true) {
      throw new Error('ChatGPT web UDS profile binding is incomplete.');
    }
    if (endpoints.has(endpointPath)) {
      throw new Error('ChatGPT web UDS profile bindings must be unique.');
    }
    endpoints.set(endpointPath, Object.freeze({ profileId, endpointPath, profile }));
  }
  if (endpoints.size === 0) {
    throw new Error('ChatGPT web UDS requires at least one enabled profile binding.');
  }
  return endpoints;
}

function createChatGptWebUdsHttpServer({
  app,
  socketDirectory,
  socketName = 'chatgpt-web-mcp.sock',
  bridgeAuthSecretFile,
  allowedOrigins = [],
  enabledProfileIds,
  runtimeFreshness = {},
  sessionHardeningEnv = process.env,
  sessionClock = () => Date.now(),
  platform = process.platform,
  host,
  port
} = {}) {
  if (platform !== 'linux') {
    throw new Error('ChatGPT web UDS transport is supported only on Linux/WSL.');
  }
  if (host !== undefined || port !== undefined) {
    throw new Error('ChatGPT web UDS transport does not permit a TCP fallback.');
  }
  if (!app || typeof app !== 'object' || !app.config) {
    throw new Error('ChatGPT web UDS requires an application configuration.');
  }

  const { socketPath, socketDirectory: normalizedSocketDirectory } =
    validateChatGptWebUdsSocketPath(socketDirectory, socketName);
  const endpoints = buildChatGptWebUdsEndpoints(app, enabledProfileIds);
  const mcpServer = new CodexMemoryMcpServer({ app });
  const sessions = new Map();
  const sessionStreams = new Map();
  const sessionHardening = createSessionHardeningConfig(sessionHardeningEnv);
  let bridgeAuthSecret = null;

  function now() {
    return sessionClock();
  }

  function isSessionExpired(metadata, timestamp = now()) {
    return timestamp - metadata.createdAt >= sessionHardening.absoluteTtlMs ||
      timestamp - metadata.lastSeenAt >= sessionHardening.idleTtlMs;
  }

  function closeSession(sessionId) {
    const streams = sessionStreams.get(sessionId);
    if (streams) {
      for (const stream of streams) {
        try {
          stream.end();
        } catch {
          // Stream cleanup is best effort.
        }
      }
      sessionStreams.delete(sessionId);
    }
    sessions.delete(sessionId);
    mcpServer.sessions.delete(sessionId);
  }

  function cleanupExpiredSessions(timestamp = now()) {
    for (const [sessionId, metadata] of sessions.entries()) {
      if (isSessionExpired(metadata, timestamp)) {
        closeSession(sessionId);
      }
    }
  }

  function resolveSession(req, endpoint) {
    const sessionId = getSingleStrictHeaderValue(req, SESSION_HEADER);
    if (!sessionId) {
      return { error: { statusCode: 400, code: 'MCP_SESSION_REQUIRED' } };
    }
    const metadata = sessions.get(sessionId);
    if (!metadata || isSessionExpired(metadata)) {
      if (metadata) closeSession(sessionId);
      return { error: { statusCode: 404, code: 'MCP_SESSION_EXPIRED_404' } };
    }
    if (metadata.profileId !== endpoint.profileId) {
      return { error: { statusCode: 400, code: 'TOOL_VERSION_ENDPOINT_MISMATCH' } };
    }
    const protocolValues = getRawHeaderValues(req, PROTOCOL_HEADER);
    if (protocolValues.length > 1) {
      return { error: { statusCode: 400, code: 'TRANSPORT_PROTOCOL_VERSION_REJECTED' } };
    }
    const requestedProtocolVersion = protocolValues.length === 1
      ? protocolValues[0].trim()
      : '';
    if (requestedProtocolVersion &&
        (!SUPPORTED_PROTOCOL_VERSIONS.has(requestedProtocolVersion) ||
          requestedProtocolVersion !== metadata.protocolVersion)) {
      return { error: { statusCode: 400, code: 'TRANSPORT_PROTOCOL_VERSION_REJECTED' } };
    }
    metadata.lastSeenAt = now();
    return { sessionId, metadata };
  }

  function requestContextFor(endpoint, sessionId) {
    return {
      channelIdentity: 'chatgpt_web',
      chatgptWebTransport: CHATGPT_WEB_UDS_TRANSPORT,
      chatgptWebEndpointProfileId: endpoint.profileId,
      sessionId
    };
  }

  function validateRequestPolicies(req, endpoint) {
    if (!isChatGptWebBridgeAuthorized(req, bridgeAuthSecret)) {
      return { statusCode: 401, code: 'TRANSPORT_BRIDGE_AUTH_REJECTED' };
    }
    if (!isChatGptWebOriginAllowed(req, allowedOrigins)) {
      return { statusCode: 403, code: 'TRANSPORT_ORIGIN_REJECTED' };
    }
    if (req.method === 'POST' &&
        (!isMimeAccepted(req, 'application/json') || !isMimeAccepted(req, 'text/event-stream'))) {
      return { statusCode: 406, code: 'TRANSPORT_ACCEPT_HEADER_REJECTED' };
    }
    if (req.method === 'GET' && !isMimeAccepted(req, 'text/event-stream')) {
      return { statusCode: 406, code: 'TRANSPORT_ACCEPT_HEADER_REJECTED' };
    }
    return null;
  }

  const cleanupTimer = setInterval(() => cleanupExpiredSessions(), sessionHardening.cleanupIntervalMs);
  if (typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
  }

  const server = http.createServer(async (req, res) => {
    try {
      cleanupExpiredSessions();
      const url = new URL(req.url || '/', 'http://localhost');
      const requestPathname = normalizePathname(url.pathname);
      const endpoint = endpoints.get(requestPathname);
      if (!endpoint) {
        return writeChatGptWebTransportError(res, 404, 'MCP_ROUTE_NOT_FOUND');
      }

      const policyError = validateRequestPolicies(req, endpoint);
      if (policyError) {
        return writeChatGptWebTransportError(res, policyError.statusCode, policyError.code);
      }

      if (req.method === 'GET') {
        const session = resolveSession(req, endpoint);
        if (session.error) {
          return writeChatGptWebTransportError(res, session.error.statusCode, session.error.code);
        }
        if (session.metadata.initialized !== true) {
          return writeChatGptWebTransportError(res, 400, 'MCP_LIFECYCLE_NOT_INITIALIZED');
        }
        const streams = sessionStreams.get(session.sessionId) || new Set();
        sessionStreams.set(session.sessionId, streams);
        if (streams.size >= sessionHardening.maxStreamsPerSession) {
          return writeJson(res, 429, createSessionLimitPayload({
            limitType: 'streams_per_session',
            limit: sessionHardening.maxStreamsPerSession
          }));
        }
        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
          [SESSION_HEADER]: session.sessionId
        });
        res.write(': connected\n\n');
        streams.add(res);
        const heartbeat = setInterval(() => {
          if (!res.writableEnded) {
            res.write(': heartbeat\n\n');
          }
        }, 15000);
        if (typeof heartbeat.unref === 'function') heartbeat.unref();
        req.on('close', () => {
          clearInterval(heartbeat);
          streams.delete(res);
          if (streams.size === 0) sessionStreams.delete(session.sessionId);
        });
        return;
      }

      if (req.method === 'DELETE') {
        const session = resolveSession(req, endpoint);
        if (session.error) {
          return writeChatGptWebTransportError(res, session.error.statusCode, session.error.code);
        }
        closeSession(session.sessionId);
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.method !== 'POST') {
        return writeJson(res, 405, {
          error: 'Method Not Allowed',
          method: req.method
        }, { Allow: 'GET, POST, DELETE' });
      }

      if (!isJsonContentType(getSingleHeaderValue(req.headers['content-type']))) {
        return writeChatGptWebTransportError(res, 415, 'TRANSPORT_CONTENT_TYPE_REJECTED');
      }

      let body;
      try {
        body = await parseRequestBody(req);
      } catch {
        return writeChatGptWebTransportError(res, 400, 'TRANSPORT_JSON_RPC_REJECTED');
      }

      const method = body.method;
      if (method === 'initialize') {
        if (getRawHeaderValues(req, SESSION_HEADER).length > 0) {
          return writeChatGptWebTransportError(res, 400, 'MCP_SESSION_REQUIRED');
        }
        const requestedProtocolVersion = body?.params?.protocolVersion;
        if (requestedProtocolVersion !== undefined &&
            (!SUPPORTED_PROTOCOL_VERSIONS.has(requestedProtocolVersion))) {
          return writeChatGptWebTransportError(res, 400, 'TRANSPORT_PROTOCOL_VERSION_REJECTED');
        }
        if (sessions.size >= sessionHardening.maxSessions) {
          return writeJson(res, 429, createSessionLimitPayload({
            limitType: 'sessions',
            limit: sessionHardening.maxSessions
          }));
        }
        const result = await mcpServer.handleJsonRpc(body, requestContextFor(endpoint, undefined));
        if (result.sessionId) {
          const protocolVersion = result.response?.result?.protocolVersion || DEFAULT_PROTOCOL_VERSION;
          sessions.set(result.sessionId, {
            profileId: endpoint.profileId,
            protocolVersion,
            initialized: false,
            createdAt: now(),
            lastSeenAt: now()
          });
          res.setHeader(SESSION_HEADER, result.sessionId);
        }
        return writeJson(res, 200, result.response);
      }

      const session = resolveSession(req, endpoint);
      if (session.error) {
        return writeChatGptWebTransportError(res, session.error.statusCode, session.error.code);
      }
      if (session.metadata.initialized !== true &&
          method !== 'ping' && method !== 'notifications/initialized') {
        return writeChatGptWebTransportError(res, 400, 'MCP_LIFECYCLE_NOT_INITIALIZED');
      }

      const result = await mcpServer.handleJsonRpc(body, requestContextFor(endpoint, session.sessionId));
      if (method === 'notifications/initialized' && result.notification === true) {
        session.metadata.initialized = true;
      }
      if (result.notification) {
        res.writeHead(202);
        res.end();
        return;
      }
      writeJson(res, 200, result.response);
    } catch {
      writeChatGptWebTransportError(res, 500, 'TRANSPORT_LOCAL_MCP_UNREADY');
    }
  });

  return {
    app,
    server,
    socketPath,
    logicalEndpoints: Object.freeze([...endpoints.keys()].sort()),
    transport: CHATGPT_WEB_UDS_TRANSPORT,
    sessionHardening,
    cleanupExpiredSessions,
    async listen() {
      bridgeAuthSecret = await loadChatGptWebBridgeAuthSecret(bridgeAuthSecretFile);
      await ensureChatGptWebUdsSocketDirectory(normalizedSocketDirectory);
      await assertChatGptWebUdsSocketAbsent(socketPath);
      await listenOnUnixSocket(server, socketPath);
      await fs.chmod(socketPath, 0o600);
      const socketStat = await fs.stat(socketPath);
      if (!socketStat.isSocket() || (socketStat.mode & 0o777) !== 0o600) {
        await closeServer(server);
        throw new Error('ChatGPT web UDS socket must have mode 0600.');
      }
      return {
        transport: CHATGPT_WEB_UDS_TRANSPORT,
        logicalEndpoints: [...endpoints.keys()].sort(),
        publicListener: false,
        tcpLoopbackFallback: false,
        runtimeFreshness: buildRuntimeFreshness(runtimeFreshness)
      };
    },
    async close() {
      clearInterval(cleanupTimer);
      for (const sessionId of [...sessions.keys()]) {
        closeSession(sessionId);
      }
      await closeServer(server);
    }
  };
}

function createStreamableHttpServer({
  app,
  host = '127.0.0.1',
  port = 7605,
  mcpPath = '/mcp/codex-memory',
  bearerToken = '',
  baseRequestContext = {},
  runtimeFreshness = {},
  sessionHardeningEnv = process.env,
  sessionClock = () => Date.now()
}) {
  const authWarning = getHttpAuthWarning({ host, bearerToken });
  const pathname = normalizePathname(mcpPath);
  const healthPathname = normalizePathname('/health');
  const mcpServer = new CodexMemoryMcpServer({ app });
  const sessionStreams = new Map();
  const sessionMetadata = new Map();
  const sessionHardening = createSessionHardeningConfig(sessionHardeningEnv);
  const defaultExecutionContext = buildRecordMemoryTrustedExecutionContext({
    config: app.config,
    baseRequestContext
  });

  function now() {
    return sessionClock();
  }

  function isSessionExpired(metadata, timestamp = now()) {
    return timestamp - metadata.createdAt >= sessionHardening.absoluteTtlMs
      || timestamp - metadata.lastSeenAt >= sessionHardening.idleTtlMs;
  }

  function closeSession(sessionId) {
    const streams = sessionStreams.get(sessionId);
    if (streams) {
      for (const stream of streams) {
        try {
          stream.end();
        } catch {
          // ignore stream cleanup errors
        }
      }
      sessionStreams.delete(sessionId);
    }
    mcpServer.sessions.delete(sessionId);
    sessionMetadata.delete(sessionId);
  }

  function cleanupExpiredSessions(timestamp = now()) {
    for (const [sessionId, metadata] of sessionMetadata.entries()) {
      if (isSessionExpired(metadata, timestamp)) {
        closeSession(sessionId);
      }
    }
  }

  function touchSession(sessionId, timestamp = now()) {
    const metadata = sessionMetadata.get(sessionId);
    if (metadata) {
      metadata.lastSeenAt = timestamp;
    }
  }

  function createSession(existingId = null) {
    cleanupExpiredSessions();
    const sessionId = existingId || crypto.randomUUID();
    if (sessionMetadata.has(sessionId)) {
      touchSession(sessionId);
      if (!sessionStreams.has(sessionId)) {
        sessionStreams.set(sessionId, new Set());
      }
      return { sessionId, rejected: null };
    }

    if (sessionMetadata.size >= sessionHardening.maxSessions) {
      return {
        sessionId: null,
        rejected: createSessionLimitPayload({
          limitType: 'sessions',
          limit: sessionHardening.maxSessions
        })
      };
    }

    const timestamp = now();
    mcpServer.sessions.set(sessionId, {});
    sessionMetadata.set(sessionId, {
      createdAt: timestamp,
      lastSeenAt: timestamp
    });
    sessionStreams.set(sessionId, new Set());
    return { sessionId, rejected: null };
  }

  function authorize(req) {
    if (!bearerToken) {
      return true;
    }

    const header = req.headers.authorization;
    return header === `Bearer ${bearerToken}`;
  }

  function hasBearerHeader(req) {
    return Boolean(getSingleHeaderValue(req.headers.authorization).trim());
  }

  function createLowDisclosureHealthPayload() {
    return {
      ok: true,
      name: app.config.serverVersion ? 'vcp_codex_memory' : 'codex-memory',
      version: app.config.serverVersion,
      protocol: 'streamable-http',
      path: pathname,
      runtimeFreshness: buildRuntimeFreshness(runtimeFreshness),
      auth: {
        required: !!bearerToken
      }
    };
  }

  function createFullHealthPayload() {
    return {
      ok: true,
      name: app.config.serverVersion ? 'vcp_codex_memory' : 'codex-memory',
      version: app.config.serverVersion,
      protocol: 'streamable-http',
      path: pathname,
      access: {
        mode: 'health_full',
        selectedProjection: false,
        selectedProjectionVersion: 1,
        bearerTokenRequiredForMcpTools: !!bearerToken,
        tokenMaterialReturned: false,
        filesystemPathsReturned: false,
        rawStoreFieldsReturned: false,
        rawMemoryFieldsReturned: false,
        embeddingFingerprintReturned: false,
        runtimeDetailLevel: 'bounded'
      },
      auth: {
        required: !!bearerToken,
        warning: authWarning
      },
      runtimeFreshness: buildRuntimeFreshness(runtimeFreshness),
      sessionHardening: {
        absoluteTtlMs: sessionHardening.absoluteTtlMs,
        idleTtlMs: sessionHardening.idleTtlMs,
        maxSessions: sessionHardening.maxSessions,
        maxStreamsPerSession: sessionHardening.maxStreamsPerSession,
        cleanupIntervalMs: sessionHardening.cleanupIntervalMs,
        warnings: sessionHardening.warnings
      },
      policyGates: buildPolicyGateSummary(app),
      runtime: buildRuntimeHealth(app)
    };
  }

  const cleanupTimer = setInterval(() => cleanupExpiredSessions(), sessionHardening.cleanupIntervalMs);
  if (typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
  }

  const server = http.createServer(async (req, res) => {
    try {
      cleanupExpiredSessions();
      const url = new URL(req.url || '/', `http://${req.headers.host || `${host}:${port}`}`);
      const requestPathname = normalizePathname(url.pathname);

      if (matchesRoute(requestPathname, healthPathname)) {
        const healthAuthorized = authorize(req);
        const healthHasBearerHeader = hasBearerHeader(req);
        if (bearerToken && healthHasBearerHeader && !healthAuthorized) {
          return writeJson(res, 401, createUnauthorizedPayload(), {
            'WWW-Authenticate': 'Bearer'
          });
        }
        if (bearerToken && healthAuthorized && healthHasBearerHeader) {
          return writeJson(res, 200, createFullHealthPayload());
        }
        return writeJson(res, 200, createLowDisclosureHealthPayload());
      }

      if (!matchesRoute(requestPathname, pathname)) {
        return writeJson(res, 404, {
          error: 'Not Found',
          path: requestPathname
        });
      }

      const authorized = authorize(req);
      const noTokenRequest = !authorized && bearerToken && !hasBearerHeader(req);

      if (!authorized && !noTokenRequest) {
        return writeJson(res, 401, createUnauthorizedPayload(), {
          'WWW-Authenticate': 'Bearer'
        });
      }

      if (!authorized && req.method !== 'POST') {
        return writeJson(res, 401, createUnauthorizedPayload(), {
          'WWW-Authenticate': 'Bearer'
        });
      }

      if (!authorized || !bearerToken) {
        const noTokenWriteRejection = validateNoTokenWriteRequest(req);
        if (noTokenWriteRejection) {
          return writeJson(res, 403, createForbiddenPayload(noTokenWriteRejection));
        }
      }

      if (req.method === 'GET') {
        const session = createSession(getSessionIdFromHeaders(req));
        if (session.rejected) {
          return writeJson(res, 429, session.rejected);
        }
        const sessionId = session.sessionId;
        const streams = sessionStreams.get(sessionId);
        if (streams.size >= sessionHardening.maxStreamsPerSession) {
          return writeJson(res, 429, createSessionLimitPayload({
            limitType: 'streams_per_session',
            limit: sessionHardening.maxStreamsPerSession
          }));
        }

        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
          [SESSION_HEADER]: sessionId
        });
        res.write(`: connected ${sessionId}\n\n`);

        streams.add(res);
        const heartbeat = setInterval(() => {
          if (!res.writableEnded) {
            res.write(`: heartbeat ${Date.now()}\n\n`);
          }
        }, 15000);
        if (typeof heartbeat.unref === 'function') {
          heartbeat.unref();
        }

        req.on('close', () => {
          clearInterval(heartbeat);
          streams.delete(res);
          if (streams.size === 0) {
            sessionStreams.delete(sessionId);
          }
        });
        return;
      }

      if (req.method === 'DELETE') {
        const sessionId = getSessionIdFromHeaders(req);
        if (!sessionId) {
          return writeJson(res, 400, {
            error: `${SESSION_HEADER} header is required.`
          });
        }

        closeSession(sessionId);
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.method !== 'POST') {
        return writeJson(res, 405, {
          error: 'Method Not Allowed',
          method: req.method
        }, {
          Allow: 'GET, POST, DELETE'
        });
      }

      let body;
      try {
        body = await parseRequestBody(req);
      } catch (error) {
        return writeJson(res, 400, jsonRpcError(null, -32600, 'Invalid Request', error.message));
      }

      if (!authorized || !bearerToken) {
        const noTokenJsonRpcRejection = validateNoTokenJsonRpcRequest(body);
        if (noTokenJsonRpcRejection) {
          return writeJson(res, 403, createForbiddenJsonRpcPayload(body));
        }
      }

      const requestSessionId = getSessionIdFromHeaders(req);
      if (requestSessionId) {
        touchSession(requestSessionId);
      }

      const result = await mcpServer.handleJsonRpc(body, {
        ...baseRequestContext,
        sessionId: requestSessionId || undefined,
        executionContext: defaultExecutionContext,
        noTokenReadOnly: !authorized || !bearerToken,
        authenticatedBoundedOverview: authorized && !!bearerToken,
        authenticatedBoundedSearch: authorized && !!bearerToken
      });

      if (result.sessionId) {
        const session = createSession(result.sessionId);
        if (session.rejected) {
          return writeJson(res, 429, session.rejected);
        }
        res.setHeader(SESSION_HEADER, result.sessionId);
      }

      if (result.notification) {
        res.writeHead(202);
        res.end();
        return;
      }

      writeJson(res, 200, result.response);
    } catch (error) {
      const requestId = `cm-${crypto.randomUUID().slice(0, 8)}`;
      writeJson(res, 500, jsonRpcError(null, -32603, 'Internal error', { requestId }));
    }
  });

  return {
    app,
    server,
    host,
    port,
    pathname,
    authWarning,
    sessionHardening,
    cleanupExpiredSessions,
    async listen() {
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => {
          server.off('error', reject);
          resolve();
        });
      });

      const address = server.address();
      return typeof address === 'string'
        ? { host, port, pathname, url: `http://${host}:${port}${pathname}` }
        : {
            host: address?.address || host,
            port: address?.port || port,
            pathname,
            url: `http://${host}:${address?.port || port}${pathname}`
          };
    },
    async close() {
      clearInterval(cleanupTimer);
      for (const sessionId of sessionStreams.keys()) {
        closeSession(sessionId);
      }
      await new Promise((resolve, reject) => {
        server.close(error => (error ? reject(error) : resolve()));
      });
    }
  };
}
module.exports = {
  BRIDGE_AUTH_HEADER,
  CHATGPT_WEB_UDS_TRANSPORT,
  PROTOCOL_HEADER,
  SESSION_HEADER,
  PUBLIC_REQUEST_BLOCKED,
  assertChatGptWebUdsSocketAbsent,
  createStreamableHttpServer,
  createChatGptWebUdsHttpServer,
  createForbiddenJsonRpcPayload,
  ensureChatGptWebUdsSocketDirectory,
  getRawHeaderValues,
  isChatGptWebBridgeAuthorized,
  isChatGptWebOriginAllowed,
  loadChatGptWebBridgeAuthSecret,
  validateNoTokenJsonRpcRequest,
  buildRuntimeHealth,
  buildRuntimeFreshness,
  buildPolicyGateSummary,
  getHttpAuthWarning,
  isLoopbackHost,
  normalizePathname,
  createSessionHardeningConfig
};
