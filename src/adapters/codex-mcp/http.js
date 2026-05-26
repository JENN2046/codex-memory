'use strict';

const http = require('node:http');
const crypto = require('node:crypto');

const { CodexMemoryMcpServer, jsonRpcError } = require('./server');

const SESSION_HEADER = 'Mcp-Session-Id';
const HTTP_SESSION_LIMIT_ERROR = 'HTTP_SESSION_LIMIT_EXCEEDED';
const HTTP_SESSION_STREAM_LIMIT_ERROR = 'HTTP_SESSION_STREAM_LIMIT_EXCEEDED';
const NO_TOKEN_MUTATION_REJECTED = 'NO_TOKEN_MUTATION_REJECTED';
const NO_TOKEN_OVERVIEW_REJECTED = 'NO_TOKEN_OVERVIEW_REJECTED';
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
  'update_memory',
  'forget_memory',
  'supersede_memory',
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

function createForbiddenPayload(reason) {
  return {
    error: 'Forbidden',
    message: reason
  };
}

function createForbiddenJsonRpcPayload(body, reason, code = NO_TOKEN_MUTATION_REJECTED) {
  return jsonRpcError(body?.id ?? null, -32001, 'Forbidden', {
    code,
    reason
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
  return {
    writeReconcileWorker: summarizeWriteReconcileWorkerStatus(app)
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
  return 'HTTP MCP is bound to a loopback host without a bearer token; this is allowed for local development only.';
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
    return 'Browser-origin writes require bearer token authorization.';
  }

  const secFetchSite = getSingleHeaderValue(req.headers['sec-fetch-site']).trim().toLowerCase();
  if (secFetchSite && secFetchSite !== 'none') {
    return 'Browser fetch writes require bearer token authorization.';
  }

  if (req.method === 'POST' && !isJsonContentType(getSingleHeaderValue(req.headers['content-type']))) {
    return 'No-token POST requests must use an application/json content type.';
  }

  return null;
}

function validateNoTokenJsonRpcRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }

  if (body.method === 'tools/call' && NO_TOKEN_BLOCKED_TOOLS.has(body.params?.name)) {
    return 'No-token HTTP MCP requests cannot call mutation tools.';
  }
  if (body.method === 'tools/call' && body.params?.name === 'memory_overview') {
    return {
      code: NO_TOKEN_OVERVIEW_REJECTED,
      reason: 'No-token HTTP MCP memory_overview requires bearer token authorization until selected overview output is available.'
    };
  }
  if (
    body.method === 'tools/call' &&
    body.params?.name === 'search_memory' &&
    body.params?.arguments?.include_content === true
  ) {
    return 'No-token HTTP MCP search_memory cannot include raw memory content.';
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

function createStreamableHttpServer({
  app,
  host = '127.0.0.1',
  port = 7605,
  mcpPath = '/mcp/codex-memory',
  bearerToken = '',
  baseRequestContext = {},
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
  const defaultExecutionContext = {
    agentAlias: process.env.CODEX_MEMORY_AGENT_ALIAS || baseRequestContext.executionContext?.agentAlias || app.config.allowedAgentAlias || 'Codex',
    agentId: process.env.CODEX_MEMORY_AGENT_ID || baseRequestContext.executionContext?.agentId || app.config.defaultAgentId,
    requestSource: process.env.CODEX_MEMORY_REQUEST_SOURCE || baseRequestContext.executionContext?.requestSource || app.config.defaultRequestSource
  };

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
        return writeJson(res, 200, {
          ok: true,
          name: app.config.serverVersion ? 'vcp_codex_memory' : 'codex-memory',
          version: app.config.serverVersion,
          protocol: 'streamable-http',
          path: pathname,
          auth: {
            required: !!bearerToken,
            warning: authWarning
          },
          sessionHardening: {
            absoluteTtlMs: sessionHardening.absoluteTtlMs,
            idleTtlMs: sessionHardening.idleTtlMs,
            maxSessions: sessionHardening.maxSessions,
            maxStreamsPerSession: sessionHardening.maxStreamsPerSession,
            cleanupIntervalMs: sessionHardening.cleanupIntervalMs,
            warnings: sessionHardening.warnings
          },
          runtime: buildRuntimeHealth(app)
        });
      }

      if (!matchesRoute(requestPathname, pathname)) {
        return writeJson(res, 404, {
          error: 'Not Found',
          path: requestPathname
        });
      }

      if (!authorize(req)) {
        return writeJson(res, 401, createUnauthorizedPayload(), {
          'WWW-Authenticate': 'Bearer'
        });
      }

      if (!bearerToken) {
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

      if (!bearerToken) {
        const noTokenJsonRpcRejection = validateNoTokenJsonRpcRequest(body);
        if (noTokenJsonRpcRejection) {
          const rejection = typeof noTokenJsonRpcRejection === 'string'
            ? { reason: noTokenJsonRpcRejection, code: NO_TOKEN_MUTATION_REJECTED }
            : noTokenJsonRpcRejection;
          return writeJson(res, 403, createForbiddenJsonRpcPayload(body, rejection.reason, rejection.code));
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
        noTokenReadOnly: !bearerToken
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
      writeJson(res, 500, jsonRpcError(null, -32603, 'Internal error', error.message || 'Unknown HTTP server error'));
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
  SESSION_HEADER,
  createStreamableHttpServer,
  buildRuntimeHealth,
  getHttpAuthWarning,
  isLoopbackHost,
  normalizePathname,
  createSessionHardeningConfig
};
