'use strict';

const http = require('node:http');
const crypto = require('node:crypto');

const { CodexMemoryMcpServer, jsonRpcError } = require('./server');

const SESSION_HEADER = 'Mcp-Session-Id';

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
  baseRequestContext = {}
}) {
  const authWarning = getHttpAuthWarning({ host, bearerToken });
  const pathname = normalizePathname(mcpPath);
  const healthPathname = normalizePathname('/health');
  const mcpServer = new CodexMemoryMcpServer({ app });
  const sessionStreams = new Map();
  const defaultExecutionContext = {
    agentAlias: process.env.CODEX_MEMORY_AGENT_ALIAS || baseRequestContext.executionContext?.agentAlias || app.config.allowedAgentAlias || 'Codex',
    agentId: process.env.CODEX_MEMORY_AGENT_ID || baseRequestContext.executionContext?.agentId || app.config.defaultAgentId,
    requestSource: process.env.CODEX_MEMORY_REQUEST_SOURCE || baseRequestContext.executionContext?.requestSource || app.config.defaultRequestSource
  };

  function createSession(existingId = null) {
    const sessionId = existingId || crypto.randomUUID();
    if (!mcpServer.sessions.has(sessionId)) {
      mcpServer.sessions.set(sessionId, {});
    }
    if (!sessionStreams.has(sessionId)) {
      sessionStreams.set(sessionId, new Set());
    }
    return sessionId;
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
  }

  function authorize(req) {
    if (!bearerToken) {
      return true;
    }

    const header = req.headers.authorization;
    return header === `Bearer ${bearerToken}`;
  }

  const server = http.createServer(async (req, res) => {
    try {
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
          }
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
        const sessionId = createSession(getSessionIdFromHeaders(req));
        const streams = sessionStreams.get(sessionId);

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

      const result = await mcpServer.handleJsonRpc(body, {
        ...baseRequestContext,
        sessionId: getSessionIdFromHeaders(req) || undefined,
        executionContext: defaultExecutionContext
      });

      if (result.sessionId) {
        res.setHeader(SESSION_HEADER, result.sessionId);
        createSession(result.sessionId);
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
  getHttpAuthWarning,
  isLoopbackHost,
  normalizePathname
};
