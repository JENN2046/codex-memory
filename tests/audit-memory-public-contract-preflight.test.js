const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const { CodexMemoryMcpServer } = require('../src/adapters/codex-mcp/server');
const {
  AuditMemoryReadonlyService
} = require('../src/core/AuditMemoryReadonlyService');
const {
  CORE_TOOL_DEFINITION_NAMES,
  PUBLIC_EXPOSURE_REQUIREMENTS,
  PUBLIC_MCP_TOOL_NAMES,
  TOOL_NAME,
  buildAuditMemoryReadonlyToolDraftReport
} = require('../src/core/AuditMemoryReadonlyToolDraft');
const { TOOL_DEFINITIONS } = require('../src/core/constants');

function sorted(values) {
  return [...values].sort();
}

const PUBLIC_TOOL_COUNT = 7;

async function withApp(handler) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-audit-public-preflight-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data')
  });

  await app.initialize();

  try {
    await handler({ app });
  } finally {
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
}

test('CM1461 public contract registration exposes only approved TOOL_DEFINITIONS', () => {
  const toolNames = sorted(TOOL_DEFINITIONS.map(tool => tool.name));

  assert.equal(toolNames.length, PUBLIC_TOOL_COUNT);
  assert.deepEqual(toolNames, sorted(CORE_TOOL_DEFINITION_NAMES));
  assert.equal(toolNames.includes(TOOL_NAME), true);
});

test('CM1461 public contract registration exposes audit_memory in MCP tools/list', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const list = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    });

    const toolNames = sorted(list.response.result.tools.map(tool => tool.name));
    assert.equal(toolNames.length, PUBLIC_MCP_TOOL_NAMES.length);
    assert.deepEqual(toolNames, sorted(PUBLIC_MCP_TOOL_NAMES));
    assert.equal(toolNames.includes(TOOL_NAME), true);
    const auditMemory = list.response.result.tools.find(tool => tool.name === TOOL_NAME);
    assert.ok(auditMemory);
    assert.match(auditMemory.description, /Readonly bounded audit explanation/);
    assert.equal(auditMemory.inputSchema.additionalProperties, false);
    assert.deepEqual(auditMemory.inputSchema.properties.audit_family.enum, ['write', 'recall', 'governance', 'all']);
    assert.equal(auditMemory.inputSchema.properties.window.minimum, 1);
    assert.equal(auditMemory.inputSchema.properties.window.maximum, 200);
    assert.deepEqual(auditMemory.inputSchema.properties.include_raw.enum, [false]);
  });
});

test('CM1461 app.callTool audit_memory executes readonly bounded service', async () => {
  await withApp(async ({ app }) => {
    const report = await app.callTool('audit_memory', { audit_family: 'all', window: 10, include_raw: false });

    assert.equal(report.accepted, true);
    assert.equal(report.access.mode, 'audit_memory_readonly_bounded');
    assert.equal(report.access.rawMemoryReturned, false);
    assert.equal(report.access.rawAuditReturned, false);
    assert.equal(report.access.filesystemPathsReturned, false);
    assert.equal(report.access.tokenMaterialReturned, false);
    assert.equal(report.access.providerPayloadReturned, false);
    assert.equal(report.policy.providerCalled, false);
    assert.equal(report.policy.durableMutationPerformed, false);
    assert.equal(report.policy.publicMcpExpanded, false);
    assert.equal(report.policy.readinessClaimed, false);
    assert.equal(report.policy.rcReadyClaimed, false);
  });
});

test('CM1461 MCP tools/call audit_memory returns bounded low-disclosure projection', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const result = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'audit_memory',
        arguments: {
          audit_family: 'governance',
          window: 25,
          include_raw: false
        }
      }
    });

    const payload = result.response.result.structuredContent;
    assert.equal(payload.accepted, true);
    assert.equal(payload.access.mode, 'audit_memory_readonly_bounded');
    assert.equal(payload.summary.requestedFamily, 'governance');
    assert.equal(payload.summary.window, 25);
    assert.equal(payload.access.rawMemoryReturned, false);
    assert.equal(payload.access.rawAuditReturned, false);
    assert.equal(payload.access.filesystemPathsReturned, false);
    assert.equal(payload.access.tokenMaterialReturned, false);
    assert.equal(payload.access.providerPayloadReturned, false);
    assert.equal(payload.policy.rawAuditScanPerformed, false);
    assert.equal(payload.policy.providerCalled, false);
    assert.equal(payload.policy.durableMutationPerformed, false);
    assert.equal(payload.policy.readinessClaimed, false);
    assert.equal(payload.policy.rcReadyClaimed, false);
  });
});

test('CM1461 MCP tools/call audit_memory rejects raw and mutation-like input at schema boundary', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const raw = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'audit_memory',
        arguments: {
          audit_family: 'all',
          window: 10,
          include_raw: true
        }
      }
    });
    assert.equal(raw.response.error.code, -32602);
    assert.match(raw.response.error.data, /include_raw/);

    const mutation = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'audit_memory',
        arguments: {
          audit_family: 'all',
          window: 10,
          include_raw: false,
          forget: true
        }
      }
    });
    assert.equal(mutation.response.error.code, -32602);
    assert.match(mutation.response.error.data, /forget/);
  });
});

test('CM1461 public contract registration keeps readonly low-disclosure report semantics', async () => {
  const draft = buildAuditMemoryReadonlyToolDraftReport();
  const service = new AuditMemoryReadonlyService();
  const report = await service.run({
    audit_family: 'governance',
    window: 25,
    include_raw: false
  });

  assert.equal(draft.requiresExactApprovalBeforePublicExposure, false);
  assert.deepEqual(draft.publicExposureApprovalPacket.requirements, PUBLIC_EXPOSURE_REQUIREMENTS);
  assert.equal(draft.publicMcpRegistered, true);
  assert.equal(report.accepted, true);
  assert.equal(report.summary.requestedFamily, 'governance');
  assert.equal(report.summary.window, 25);
  assert.equal(report.access.rawMemoryReturned, false);
  assert.equal(report.access.rawAuditReturned, false);
  assert.equal(report.policy.publicMcpExpanded, false);
  assert.equal(report.policy.readinessClaimed, false);
  assert.equal(report.policy.rcReadyClaimed, false);
});

test('CM1507 MCP tools/call audit_memory rejection remains low-disclosure', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const result = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'audit_memory',
        arguments: {
          audit_family: 'all',
          window: 10,
          include_raw: true,
          authorization: 'cm1507-authorization-must-not-leak',
          bearerToken: 'cm1507-bearer-token-must-not-leak',
          providerPayload: 'cm1507-provider-payload-must-not-leak'
        }
      }
    });

    assert.equal(result.response.error.code, -32602);
    const serialized = JSON.stringify(result.response);
    assert.equal(serialized.includes('cm1507-authorization-must-not-leak'), false);
    assert.equal(serialized.includes('cm1507-bearer-token-must-not-leak'), false);
    assert.equal(serialized.includes('cm1507-provider-payload-must-not-leak'), false);
    assert.equal(serialized.includes('rawAudit'), false);
    assert.equal(serialized.includes('memoryId'), false);
  });
});
