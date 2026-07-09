const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const { CodexMemoryMcpServer } = require('../src/adapters/codex-mcp/server');

async function withApp(handler) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-security-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data'),
    mcpPublicToolSurface: 'full'
  });

  await app.initialize();

  try {
    await handler({ app, tempBasePath });
  } finally {
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
}

const requestContext = {
  executionContext: {
    agentAlias: 'Codex',
    agentId: 'codex-desktop',
    requestSource: 'codex-memory-security-test'
  }
};

test('security write policy rejects secret-like content before diary write', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const secretLikeValue = ['Bearer', 'TEST_TOKEN_1234567890'].join(' ');
    const response = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'process',
          title: 'Checkpoint with unsafe credential',
          content: `Type: checkpoint\nrisk: ${secretLikeValue}`,
          evidence: 'security scanner regression',
          validated: true,
          reusable: false,
          tags: ['security'],
          sensitivity: 'none'
        }
      }
    }, requestContext);

    const result = response.response.result.structuredContent;
    assert.equal(result.decision, 'rejected');
    assert.equal(result.filePath, null);
    assert.match(result.reason, /secret-like content/);
    assert.match(result.reason, /bearer_token/);
  });
});

test('security write policy scans title, content, evidence, and tags without auditing raw secret values', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const secretLikeValue = ['api_key', 'TEST_API_KEY_1234567890'].join('=');
    const response = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'process',
          title: 'Checkpoint',
          content: 'Type: checkpoint\nrisk: scanner should reject tag evidence',
          evidence: 'security scanner regression',
          validated: true,
          reusable: false,
          tags: ['policy', secretLikeValue],
          sensitivity: 'none'
        }
      }
    }, requestContext);

    const result = response.response.result.structuredContent;
    assert.equal(result.decision, 'rejected');

    const auditText = await fs.readFile(app.config.auditLogPath, 'utf8');
    assert.match(auditText, /rejected/);
    assert.doesNotMatch(auditText, /TEST_API_KEY_1234567890/);
    assert.doesNotMatch(auditText, /api_key=/);
  });
});

test('security write policy rejects secret-like scope metadata before persistence', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const secretLikeWorkspace = ['api_key', 'TEST_SCOPE_KEY_1234567890'].join('=');
    const response = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'process',
          title: 'Checkpoint',
          content: 'Type: checkpoint\nrisk: scope metadata should be scanned before persistence',
          evidence: 'scope metadata scanner regression',
          validated: true,
          reusable: false,
          tags: ['security', 'scope'],
          sensitivity: 'none',
          workspace_id: secretLikeWorkspace,
          task_id: 'TASK-SECURITY-001'
        }
      }
    }, requestContext);

    const result = response.response.result.structuredContent;
    assert.equal(result.decision, 'rejected');
    assert.equal(result.filePath, null);
    assert.match(result.reason, /secret-like content/);
    assert.match(result.reason, /api_key/);

    const auditText = await fs.readFile(app.config.auditLogPath, 'utf8');
    assert.match(auditText, /rejected/);
    assert.doesNotMatch(auditText, /TEST_SCOPE_KEY_1234567890/);
    assert.doesNotMatch(auditText, /api_key=/);
  });
});
