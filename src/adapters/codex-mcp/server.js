const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const {
  DEFAULT_PROTOCOL_VERSION,
  SERVER_NAME,
  SUPPORTED_PROTOCOL_VERSIONS,
  TOOL_DEFINITIONS
} = require('../../core/constants');
const {
  ToolArgumentValidationError,
  validateToolArguments
} = require('../../core/ToolArgumentValidator');

function jsonRpcSuccess(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function jsonRpcError(id, code, message, data) {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data })
    }
  };
}

function formatToolResult(payload, isError = false) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(payload, null, 2)
      }
    ],
    structuredContent: payload,
    isError
  };
}

function appendToolErrorLog(app, toolName, error) {
  const logPath = app?.config?.httpLogPath;
  if (!logPath) return;

  const message = error?.stack || error?.message || String(error);
  const line = `[${new Date().toISOString()}] ERROR tool ${toolName} failed: ${message}\n`;
  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, line, 'utf8');
  } catch {
    // Keep JSON-RPC error handling independent from diagnostics.
  }
}

function negotiateProtocolVersion(requestedVersion) {
  if (typeof requestedVersion === 'string' && SUPPORTED_PROTOCOL_VERSIONS.has(requestedVersion)) {
    return requestedVersion;
  }
  return DEFAULT_PROTOCOL_VERSION;
}

class CodexMemoryMcpServer {
  constructor({ app }) {
    this.app = app;
    this.sessions = new Map();
  }

  createSession(existingId = null) {
    const sessionId = existingId || crypto.randomUUID();
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {});
    }
    return sessionId;
  }

  async handleJsonRpc(body, requestContext = {}) {
    const { id = null, method, params = {} } = body || {};

    if (typeof method !== 'string' || !method.trim()) {
      return { response: jsonRpcError(id, -32600, 'Invalid Request', 'method must be a non-empty string') };
    }

    if (method === 'initialize') {
      const sessionId = this.createSession(requestContext.sessionId || null);
      const protocolVersion = negotiateProtocolVersion(params?.protocolVersion);
      return {
        sessionId,
        response: jsonRpcSuccess(id, {
          protocolVersion,
          capabilities: {
            tools: { listChanged: true },
            resources: { subscribe: false, listChanged: true }
          },
          serverInfo: {
            name: SERVER_NAME,
            version: this.app.config.serverVersion
          },
          instructions: 'Use record_memory for normal Codex memory writes, search_memory for Codex diary recall, and memory_overview for bridge observability.'
        })
      };
    }

    if (method === 'notifications/initialized') {
      return { notification: true };
    }

    if (method === 'ping') {
      return { response: jsonRpcSuccess(id, {}) };
    }

    if (method === 'tools/list') {
      return {
        response: jsonRpcSuccess(id, {
          tools: TOOL_DEFINITIONS
        })
      };
    }

    if (method === 'resources/list') {
      return {
        response: jsonRpcSuccess(id, {
          resources: []
        })
      };
    }

    if (method === 'resources/templates/list') {
      return {
        response: jsonRpcSuccess(id, {
          resourceTemplates: []
        })
      };
    }

    if (method === 'tools/call') {
      if (!params?.name || typeof params.name !== 'string') {
        return { response: jsonRpcError(id, -32602, 'Invalid params', 'tools/call requires a tool name') };
      }

      const args = params.arguments || {};
      if (!args || typeof args !== 'object' || Array.isArray(args)) {
        return { response: jsonRpcError(id, -32602, 'Invalid params', 'tools/call arguments must be an object') };
      }

      try {
        validateToolArguments(params.name, args);
        const payload = await this.app.callTool(params.name, args, requestContext);
        const isError = payload?.decision === 'rejected';
        return {
          response: jsonRpcSuccess(id, formatToolResult(payload, isError))
        };
      } catch (error) {
        if (error instanceof ToolArgumentValidationError) {
          return {
            response: jsonRpcError(id, -32602, 'Invalid params', error.message)
          };
        }
        appendToolErrorLog(this.app, params.name, error);
        return {
          response: jsonRpcError(id, -32603, 'Internal error', error.message || 'Unknown tool execution error')
        };
      }
    }

    return { response: jsonRpcError(id, -32601, 'Method not found', method) };
  }
}

module.exports = {
  CodexMemoryMcpServer,
  formatToolResult,
  jsonRpcError,
  jsonRpcSuccess
};
