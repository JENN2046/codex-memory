'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { CodexMemoryMcpServer, jsonRpcError } = require('../src/adapters/codex-mcp/server');

function createMockApp(configOverrides = {}) {
  return {
    config: {
      defaultAgentId: 'test-agent',
      defaultRequestSource: 'test',
      ...configOverrides
    },
    callTool: async (name, args) => {
      if (name === 'search_memory') {
        const q = (args.query || '').toLowerCase();
        if (q.includes('path_leak')) {
          throw new Error('Error accessing C:\\Users\\secret\\config.json: Permission denied');
        }
        if (q.includes('token_leak')) {
          throw new Error('Authorization failed: bearer sk-abc123def456');
        }
        if (q.includes('url_leak')) {
          throw new Error('Failed to connect to http://internal.provider.com:8080/api/v1/embeddings');
        }
        if (q.includes('stack_leak')) {
          const err = new Error('deep internal error');
          err.stack = 'Error: deep internal error\n    at Object.callTool (C:\\project\\src\\file.js:42:17)\n    at async handleJsonRpc (C:\\project\\src\\server.js:100:5)';
          throw err;
        }
        if (q.includes('log_leak')) {
          const err = new Error('Authorization failed for bearer sk-logsecret1234567890 at http://internal.provider.test/v1/embeddings using C:\\Users\\admin\\.env');
          err.stack = 'Error: Authorization failed for bearer sk-logsecret1234567890\n    at Object.callTool (C:\\Users\\admin\\.env:1:1)\n    at async fetchProvider (http://internal.provider.test/v1/embeddings)';
          throw err;
        }
        if (q.includes('json_rpc_code')) {
          const err = new Error('safe: rate limit exceeded');
          err.jsonRpcCode = -32003;
          err.jsonRpcMessage = 'Rate limited';
          err.jsonRpcData = { code: 'RATE_LIMITED', retryAfterMs: 5000 };
          throw err;
        }
        if (q.includes('nested_sensitive_data')) {
          const err = new Error('safe nested msg');
          err.jsonRpcCode = -32005;
          err.jsonRpcMessage = 'Nested provider error';
          err.jsonRpcData = {
            code: 'NESTED_PROVIDER_ERROR',
            retryAfterMs: 1000,
            provider: {
              endpoint: 'https://nested.internal.provider.test/v1/memory',
              token: 'sk-nested-secret-1234567890',
              diagnostics: [
                {
                  path: '/home/jenn/.env',
                  reason: 'Authorization: bearer sk-nested-reason-1234567890'
                }
              ]
            }
          };
          throw err;
        }
        if (q.includes('sensitive_data')) {
          const err = new Error('safe msg');
          err.jsonRpcCode = -32004;
          err.jsonRpcMessage = 'Provider error';
          err.jsonRpcData = {
            code: 'PROVIDER_ERROR',
            url: 'http://internal.provider.com:8080/secret-path',
            path: 'C:\\Users\\admin\\.env',
            reason: 'API key sk-abc123 failed'
          };
          throw err;
        }
      }
      return { decision: 'accepted' };
    }
  };
}

test('internal error response does not contain local disk paths', async () => {
  const server = new CodexMemoryMcpServer({ app: createMockApp() });
  const result = await server.handleJsonRpc({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'search_memory',
      arguments: { query: 'path_leak_test', target: 'process', limit: 3 }
    }
  });
  const serialized = JSON.stringify(result.response);

  assert.equal(result.response.error.code, -32603);
  assert.equal(result.response.error.message, 'Internal error');
  assert.doesNotMatch(serialized, /C:\\Users/);
  assert.doesNotMatch(serialized, /secret/);
  assert.ok(result.response.error.data.requestId);
});

test('internal error response does not contain token-like strings', async () => {
  const server = new CodexMemoryMcpServer({ app: createMockApp() });
  const result = await server.handleJsonRpc({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'search_memory',
      arguments: { query: 'token_leak_test', target: 'process', limit: 3 }
    }
  });
  const serialized = JSON.stringify(result.response);

  assert.doesNotMatch(serialized, /sk-abc123/);
  assert.doesNotMatch(serialized, /bearer/i);
  assert.ok(result.response.error.data.requestId);
});

test('internal error response does not contain provider URLs', async () => {
  const server = new CodexMemoryMcpServer({ app: createMockApp() });
  const result = await server.handleJsonRpc({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'search_memory',
      arguments: { query: 'url_leak_test', target: 'process', limit: 3 }
    }
  });
  const serialized = JSON.stringify(result.response);

  assert.doesNotMatch(serialized, /internal\.provider/);
  assert.doesNotMatch(serialized, /http:\/\//);
  assert.ok(result.response.error.data.requestId);
});

test('internal error response does not contain stack traces', async () => {
  const server = new CodexMemoryMcpServer({ app: createMockApp() });
  const result = await server.handleJsonRpc({
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'search_memory',
      arguments: { query: 'stack_leak_test', target: 'process', limit: 3 }
    }
  });
  const serialized = JSON.stringify(result.response);

  assert.doesNotMatch(serialized, /at Object/);
  assert.doesNotMatch(serialized, /file\.js/);
  assert.doesNotMatch(serialized, /server\.js/);
  assert.ok(result.response.error.data.requestId);
});

test('tool error log redacts sensitive stack and message fragments', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-error-log-'));
  const logPath = path.join(tempDir, 'http.log');
  const server = new CodexMemoryMcpServer({
    app: createMockApp({ httpLogPath: logPath })
  });

  try {
    const result = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: { query: 'log_leak_test', target: 'process', limit: 3 }
      }
    });
    const responseText = JSON.stringify(result.response);
    const logText = await fs.readFile(logPath, 'utf8');

    assert.equal(result.response.error.code, -32603);
    assert.doesNotMatch(responseText, /sk-logsecret/i);
    assert.doesNotMatch(logText, /sk-logsecret/i);
    assert.doesNotMatch(logText, /bearer\s+sk/i);
    assert.doesNotMatch(logText, /internal\.provider/i);
    assert.doesNotMatch(logText, /C:\\Users/i);
    assert.doesNotMatch(logText, /\.env/i);
    assert.match(logText, /<redacted>/);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('jsonRpcCode errors preserve structured data with requestId', async () => {
  const server = new CodexMemoryMcpServer({ app: createMockApp() });
  const result = await server.handleJsonRpc({
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: {
      name: 'search_memory',
      arguments: { query: 'json_rpc_code_test', target: 'process', limit: 3 }
    }
  });

  assert.equal(result.response.error.code, -32003);
  assert.equal(result.response.error.message, 'Rate limited');
  assert.equal(result.response.error.data.code, 'RATE_LIMITED');
  assert.equal(result.response.error.data.retryAfterMs, 5000);
  assert.ok(result.response.error.data.requestId);
});

test('jsonRpcCode errors with sensitive data get redacted', async () => {
  const server = new CodexMemoryMcpServer({ app: createMockApp() });
  const result = await server.handleJsonRpc({
    jsonrpc: '2.0',
    id: 6,
    method: 'tools/call',
    params: {
      name: 'search_memory',
      arguments: { query: 'sensitive_data_test', target: 'process', limit: 3 }
    }
  });
  const serialized = JSON.stringify(result.response);

  assert.equal(result.response.error.data.code, 'PROVIDER_ERROR');
  assert.ok(result.response.error.data.requestId);

  // URL and path patterns should be redacted
  assert.doesNotMatch(serialized, /internal\.provider/);
  assert.doesNotMatch(serialized, /C:\\Users/);
  assert.doesNotMatch(serialized, /\.env/);

  // Structured code preserved, requestId present
  assert.ok(result.response.error.data.requestId.startsWith('cm-'));
});

test('jsonRpcCode errors recursively redact nested structured data', async () => {
  const server = new CodexMemoryMcpServer({ app: createMockApp() });
  const result = await server.handleJsonRpc({
    jsonrpc: '2.0',
    id: 9,
    method: 'tools/call',
    params: {
      name: 'search_memory',
      arguments: { query: 'nested_sensitive_data_test', target: 'process', limit: 3 }
    }
  });
  const serialized = JSON.stringify(result.response);

  assert.equal(result.response.error.code, -32005);
  assert.equal(result.response.error.message, 'Nested provider error');
  assert.equal(result.response.error.data.code, 'NESTED_PROVIDER_ERROR');
  assert.equal(result.response.error.data.retryAfterMs, 1000);
  assert.ok(result.response.error.data.requestId.startsWith('cm-'));
  assert.doesNotMatch(serialized, /nested\.internal\.provider/i);
  assert.doesNotMatch(serialized, /sk-nested/i);
  assert.doesNotMatch(serialized, /bearer/i);
  assert.doesNotMatch(serialized, /\/home\/jenn/);
  assert.doesNotMatch(serialized, /\.env/);
});

test('http.js catch block produces redacted error', async () => {
  const requestId = 'cm-00000000';
  const payload = jsonRpcError(null, -32603, 'Internal error', { requestId });
  const serialized = JSON.stringify(payload);

  assert.equal(payload.error.code, -32603);
  assert.equal(payload.error.message, 'Internal error');
  assert.equal(payload.error.data.requestId, requestId);
  assert.doesNotMatch(serialized, /C:\\Users/);
  assert.doesNotMatch(serialized, /secret/);
});

test('ToolArgumentValidationError still returns detailed message', async () => {
  const server = new CodexMemoryMcpServer({ app: createMockApp({ mcpPublicToolSurface: 'full' }) });
  const result = await server.handleJsonRpc({
    jsonrpc: '2.0',
    id: 7,
    method: 'tools/call',
    params: {
      name: 'record_memory',
      arguments: {
        target: 'process',
        title: 'test',
        content: 'test',
        evidence: 'test',
        validated: true,
        reusable: false,
        sensitivity: 'none',
        client_id: 'invalid-client'
      }
    }
  });

  assert.equal(result.response.error.code, -32602);
  assert.equal(result.response.error.message, 'Invalid params');
  assert.ok(typeof result.response.error.data === 'string');
});
