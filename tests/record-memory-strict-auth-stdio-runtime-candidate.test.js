'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { PassThrough } = require('node:stream');

const { createCodexMemoryApplication } = require('../src/app');
const {
  createStdioServer,
  encodeMessage
} = require('../src/adapters/codex-mcp/stdio');

const STRICT_AUTH_ENV_KEYS = [
  'CODEX_MEMORY_AGENT_ALIAS',
  'CODEX_MEMORY_AGENT_ID',
  'CODEX_MEMORY_REQUEST_SOURCE',
  'CODEX_MEMORY_PROJECT_ID',
  'CODEX_MEMORY_WORKSPACE_ID',
  'CODEX_MEMORY_CLIENT_ID',
  'CODEX_MEMORY_RECORD_MEMORY_AUTH_MODE',
  'CODEX_MEMORY_RECORD_MEMORY_ALLOWED_AGENT_ALIAS',
  'CODEX_MEMORY_RECORD_MEMORY_ALLOWED_AGENT_IDS',
  'CODEX_MEMORY_RECORD_MEMORY_ALLOWED_REQUEST_SOURCES',
  'CODEX_MEMORY_RECORD_MEMORY_ALLOWED_PROJECT_IDS',
  'CODEX_MEMORY_RECORD_MEMORY_ALLOWED_WORKSPACE_IDS',
  'CODEX_MEMORY_RECORD_MEMORY_ALLOWED_CLIENT_IDS'
];

async function withStrictAuthEnv(values, handler) {
  const previous = new Map(STRICT_AUTH_ENV_KEYS.map(key => [key, process.env[key]]));
  for (const key of STRICT_AUTH_ENV_KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(values)) process.env[key] = value;

  try {
    await handler();
  } finally {
    for (const key of STRICT_AUTH_ENV_KEYS) {
      const value = previous.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

async function withStdioApp(handler) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-stdio-strict-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data'),
    allowExternalProvider: false
  });

  await app.initialize();
  const input = new PassThrough();
  const output = new PassThrough();
  createStdioServer({ app, input, output });

  try {
    await handler({ app, input, output });
  } finally {
    await app.close();
    input.destroy();
    output.destroy();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
}

function readNextFrame(output, expectedId) {
  let buffer = Buffer.alloc(0);

  return new Promise(resolve => {
    function onData(chunk) {
      buffer = Buffer.concat([buffer, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
      while (true) {
        const separatorIndex = buffer.indexOf('\r\n\r\n');
        if (separatorIndex < 0) return;
        const header = buffer.slice(0, separatorIndex).toString('utf8');
        const match = header.match(/Content-Length:\s*(\d+)/i);
        if (!match) return;
        const length = Number.parseInt(match[1], 10);
        const bodyStart = separatorIndex + 4;
        const bodyEnd = bodyStart + length;
        if (buffer.length < bodyEnd) return;
        const body = buffer.slice(bodyStart, bodyEnd).toString('utf8');
        buffer = buffer.slice(bodyEnd);
        const message = JSON.parse(body);
        if (message.id === expectedId) {
          output.off('data', onData);
          resolve(message);
          return;
        }
      }
    }

    output.on('data', onData);
  });
}

async function callStdioTool({ input, output, id, args }) {
  const responsePromise = readNextFrame(output, id);
  input.write(encodeMessage({
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: {
      name: 'record_memory',
      arguments: args
    }
  }));
  return responsePromise;
}

const BASE_STRICT_ENV = {
  CODEX_MEMORY_AGENT_ALIAS: 'Codex',
  CODEX_MEMORY_AGENT_ID: 'codex-desktop',
  CODEX_MEMORY_REQUEST_SOURCE: 'codex-memory-stdio',
  CODEX_MEMORY_PROJECT_ID: 'codex-memory',
  CODEX_MEMORY_WORKSPACE_ID: 'workspace-alpha',
  CODEX_MEMORY_CLIENT_ID: 'codex',
  CODEX_MEMORY_RECORD_MEMORY_AUTH_MODE: 'strict',
  CODEX_MEMORY_RECORD_MEMORY_ALLOWED_AGENT_ALIAS: 'Codex',
  CODEX_MEMORY_RECORD_MEMORY_ALLOWED_AGENT_IDS: 'codex-desktop',
  CODEX_MEMORY_RECORD_MEMORY_ALLOWED_REQUEST_SOURCES: 'codex-memory-stdio',
  CODEX_MEMORY_RECORD_MEMORY_ALLOWED_PROJECT_IDS: 'codex-memory',
  CODEX_MEMORY_RECORD_MEMORY_ALLOWED_WORKSPACE_IDS: 'workspace-alpha',
  CODEX_MEMORY_RECORD_MEMORY_ALLOWED_CLIENT_IDS: 'codex'
};

test('CM1662 stdio strict auth accepts trusted env context', async () => {
  await withStrictAuthEnv(BASE_STRICT_ENV, async () => {
    await withStdioApp(async ({ app, input, output }) => {
      assert.equal(app.config.recordMemoryPrincipalScopeAuthorization.mode, 'strict');
      assert.equal(app.services.writeService.recordMemoryPrincipalScopeAuthorizationStrictMode, true);

      const response = await callStdioTool({
        input,
        output,
        id: 1,
        args: {
          target: 'process',
          title: 'stdio strict principal scope accepted',
          content: 'Type: checkpoint\nrisk: trusted stdio env strict auth should accept matching context',
          evidence: 'CM-1662 stdio env strict local runtime candidate regression',
          validated: true,
          reusable: false,
          sensitivity: 'none'
        }
      });

      assert.equal(response.result.structuredContent.decision, 'accepted');
      assert.equal(response.result.structuredContent.principalScopeAuthorization, undefined);
    });
  });
});

test('CM1662 stdio strict auth rejects trusted env mismatch despite payload scope', async () => {
  await withStrictAuthEnv({
    ...BASE_STRICT_ENV,
    CODEX_MEMORY_WORKSPACE_ID: 'workspace-beta',
    CODEX_MEMORY_CLIENT_ID: 'claude'
  }, async () => {
    await withStdioApp(async ({ app, input, output }) => {
      assert.equal(app.config.recordMemoryPrincipalScopeAuthorization.mode, 'strict');
      assert.equal(app.services.writeService.recordMemoryPrincipalScopeAuthorizationStrictMode, true);

      const response = await callStdioTool({
        input,
        output,
        id: 2,
        args: {
          target: 'process',
          title: 'stdio strict principal scope rejected',
          content: 'Type: checkpoint\nrisk: payload scope must not override trusted stdio env strict auth',
          evidence: 'CM-1662 stdio env strict payload-spoof rejection regression',
          validated: true,
          reusable: false,
          sensitivity: 'none',
          project_id: 'codex-memory',
          workspace_id: 'workspace-alpha',
          client_id: 'codex'
        }
      });
      const serialized = JSON.stringify(response);

      assert.equal(response.result.structuredContent.decision, 'rejected');
      assert.equal(response.result.structuredContent.memoryId, null);
      assert.equal(response.result.structuredContent.filePath, null);
      assert.equal(response.result.structuredContent.shadowWrite.status, 'skipped');
      assert.deepEqual(response.result.structuredContent.principalScopeAuthorization.mismatchedFields, [
        'workspaceId',
        'clientId'
      ]);
      assert.doesNotMatch(serialized, /workspace-beta/);
      assert.doesNotMatch(serialized, /workspace-alpha/);
      assert.doesNotMatch(serialized, /claude/);
      assert.doesNotMatch(serialized, /workspace_id/);
      assert.doesNotMatch(serialized, /client_id/);
    });
  });
});
