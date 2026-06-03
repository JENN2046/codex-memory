const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const { CodexMemoryMcpServer } = require('../src/adapters/codex-mcp/server');
const {
  DISCLOSURE_FLAGS,
  PUBLIC_MCP_TOOL_NAMES,
  RESULT_STATUS_ACCEPTED,
  SIDE_EFFECT_FLAGS,
  TOOL_NAME,
  buildAuditMemoryReadonlyToolDraftReport,
  draftToolDefinition,
  validateAuditMemoryReadonlyDraftInput
} = require('../src/core/AuditMemoryReadonlyToolDraft');
const { TOOL_DEFINITIONS } = require('../src/core/constants');

function sorted(values) {
  return [...values].sort();
}

async function withApp(handler) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-audit-draft-'));
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

test('CM1414 audit_memory readonly draft is accepted for planning but not public', () => {
  const report = buildAuditMemoryReadonlyToolDraftReport();

  assert.equal(report.status, RESULT_STATUS_ACCEPTED);
  assert.equal(report.acceptedForPlanning, true);
  assert.equal(report.toolName, TOOL_NAME);
  assert.equal(report.draftOnly, true);
  assert.equal(report.publicMcpRegistered, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.publicToolsFrozen, true);
  assert.deepEqual(sorted(report.publicTools), sorted(PUBLIC_MCP_TOOL_NAMES));
  assert.equal(report.readonly, true);
  assert.equal(report.selectedProjection, true);
  assert.equal(report.selectedProjectionVersion, 1);
  assert.equal(report.lowDisclosure, true);
  assert.equal(report.requiresExactApprovalBeforePublicExposure, true);
  assert.equal(report.readinessClaimed, false);
  assert.equal(report.rcReadyClaimed, false);
  assert.deepEqual(report.blockerReasons, []);

  for (const flag of DISCLOSURE_FLAGS) {
    assert.equal(report.disclosure[flag], false, `${flag} should be false`);
  }
  for (const flag of SIDE_EFFECT_FLAGS) {
    assert.equal(report.sideEffects[flag], false, `${flag} should be false`);
  }
});

test('CM1414 audit_memory readonly draft schema is bounded and low-disclosure', () => {
  assert.equal(draftToolDefinition.name, TOOL_NAME);
  assert.match(draftToolDefinition.description, /Internal draft only/);
  assert.match(draftToolDefinition.description, /not registered as a public MCP tool/);

  const schema = draftToolDefinition.inputSchema;
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.properties.audit_family.enum, ['write', 'recall', 'governance', 'all']);
  assert.equal(schema.properties.window.minimum, 1);
  assert.equal(schema.properties.window.maximum, 200);
  assert.equal(schema.properties.include_raw.const, false);
  assert.equal(schema.properties.scope.additionalProperties, false);
  for (const field of ['project_id', 'client_id', 'visibility', 'task_id']) {
    assert.equal(schema.properties.scope.properties[field].maxLength, 200);
  }
  assert.equal(schema.properties.scope.properties.workspace_id_present.type, 'boolean');
});

test('CM1414 audit_memory readonly draft rejects raw and unbounded input', () => {
  assert.deepEqual(validateAuditMemoryReadonlyDraftInput({
    audit_family: 'write',
    window: 200,
    include_raw: false
  }), {
    accepted: true,
    blockerReasons: []
  });

  assert.deepEqual(validateAuditMemoryReadonlyDraftInput({
    audit_family: 'raw',
    window: 201,
    include_raw: true
  }), {
    accepted: false,
    blockerReasons: [
      'include_raw_not_allowed',
      'audit_family_not_allowed',
      'window_out_of_bounds'
    ]
  });
});

test('CM1414 audit_memory readonly draft does not change static public tool definitions', () => {
  const toolNames = sorted(TOOL_DEFINITIONS.map(tool => tool.name));

  assert.deepEqual(toolNames, sorted(PUBLIC_MCP_TOOL_NAMES));
  assert.equal(toolNames.includes(TOOL_NAME), false);
});

test('CM1414 audit_memory readonly draft does not appear in MCP tools/list', async () => {
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
