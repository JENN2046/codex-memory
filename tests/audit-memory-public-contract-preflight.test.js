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
  PUBLIC_EXPOSURE_REQUIREMENTS,
  PUBLIC_MCP_TOOL_NAMES,
  TOOL_NAME,
  buildAuditMemoryReadonlyToolDraftReport
} = require('../src/core/AuditMemoryReadonlyToolDraft');
const { TOOL_DEFINITIONS } = require('../src/core/constants');

function sorted(values) {
  return [...values].sort();
}

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

test('CM1460 public contract preflight keeps static TOOL_DEFINITIONS frozen', () => {
  const toolNames = sorted(TOOL_DEFINITIONS.map(tool => tool.name));

  assert.deepEqual(toolNames, sorted(PUBLIC_MCP_TOOL_NAMES));
  assert.equal(toolNames.includes(TOOL_NAME), false);
});

test('CM1460 public contract preflight keeps MCP tools/list frozen', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const list = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    });

    const toolNames = sorted(list.response.result.tools.map(tool => tool.name));
    assert.deepEqual(toolNames, sorted(PUBLIC_MCP_TOOL_NAMES));
    assert.equal(toolNames.includes(TOOL_NAME), false);
  });
});

test('CM1460 public contract preflight keeps app.callTool audit_memory blocked', async () => {
  await withApp(async ({ app }) => {
    await assert.rejects(
      () => app.callTool('audit_memory', { audit_family: 'all', window: 10, include_raw: false }),
      /Unknown tool/
    );
  });
});

test('CM1460 public contract preflight proves service readiness without registration', async () => {
  const draft = buildAuditMemoryReadonlyToolDraftReport();
  const service = new AuditMemoryReadonlyService();
  const report = await service.run({
    audit_family: 'governance',
    window: 25,
    include_raw: false
  });

  assert.equal(draft.requiresExactApprovalBeforePublicExposure, true);
  assert.deepEqual(draft.publicExposureApprovalPacket.requirements, PUBLIC_EXPOSURE_REQUIREMENTS);
  assert.equal(draft.publicMcpRegistered, false);
  assert.equal(report.accepted, true);
  assert.equal(report.summary.requestedFamily, 'governance');
  assert.equal(report.summary.window, 25);
  assert.equal(report.access.rawMemoryReturned, false);
  assert.equal(report.access.rawAuditReturned, false);
  assert.equal(report.policy.publicMcpExpanded, false);
  assert.equal(report.policy.readinessClaimed, false);
  assert.equal(report.policy.rcReadyClaimed, false);
});
