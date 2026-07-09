const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const { createCodexMemoryApplication } = require('../src/app');
const { CodexMemoryMcpServer } = require('../src/adapters/codex-mcp/server');
const { TOOL_DEFINITIONS } = require('../src/core/constants');

const APPROVED_PUBLIC_TOOLS = [
  'audit_memory',
  'memory_overview',
  'record_memory',
  'search_memory',
  'supersede_memory',
  'tombstone_memory',
  'validate_memory'
];
const DEFAULT_MCP_PUBLIC_TOOLS = [
  'audit_memory',
  'memory_overview',
  'search_memory'
];

const CONTROLLED_MUTATION_TOOLS = [
  'validate_memory',
  'tombstone_memory',
  'supersede_memory'
];

function sorted(values) {
  return [...values].sort();
}

function publicRequestContext(overrides = {}) {
  return {
    executionContext: {
      clientId: 'codex',
      agentAlias: 'codex',
      requestSource: 'controlled-mutation-public-registration-test',
      ...overrides
    }
  };
}

function insertRecord(dbPath, {
  memoryId,
  status = 'proposal',
  clientId = 'codex',
  visibility = 'project',
  title = 'Controlled mutation public dry-run candidate'
} = {}) {
  const db = new DatabaseSync(dbPath);
  try {
    const columns = db.prepare('PRAGMA table_info(memory_records)').all().map(column => column.name);
    for (const [column, type] of [
      ['status', 'TEXT'],
      ['status_reason', 'TEXT'],
      ['supersedes_memory_id', 'TEXT'],
      ['superseded_by_memory_id', 'TEXT'],
      ['tombstone_reason', 'TEXT'],
      ['lifecycle_updated_at', 'TEXT'],
      ['lifecycle_actor_client_id', 'TEXT']
    ]) {
      if (!columns.includes(column)) {
        db.exec(`ALTER TABLE memory_records ADD COLUMN ${column} ${type}`);
      }
    }

    db.prepare(`
      INSERT INTO memory_records (
        memory_id, target, title, content, evidence, tags_json,
        validated, reusable, sensitivity, file_path, relative_path, raw_text,
        created_at, updated_at, project_id, workspace_id, client_id, task_id,
        conversation_id, visibility, retention_policy, status
      ) VALUES (
        ?, 'process', ?, 'Type: checkpoint\\ncontrolled mutation public dry-run candidate',
        'synthetic public dry-run evidence', '[]',
        1, 0, 'none', NULL, NULL, NULL,
        '2026-06-09T00:00:00.000Z', '2026-06-09T00:00:00.000Z',
        'project-a', 'workspace-a', ?, NULL, NULL, ?, NULL, ?
      )
    `).run(memoryId, title, clientId, visibility, status);
  } finally {
    db.close();
  }
}

async function withApp(handler, overrides = {}) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'controlled-mutation-public-registration-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data'),
    ...overrides
  });

  await app.initialize();

  try {
    await handler({ app });
  } finally {
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
}

function validArgs(toolName, overrides = {}) {
  if (toolName === 'validate_memory') {
    return {
      memory_id: 'mem-public-dry-run',
      reason: 'bounded validation review',
      evidence: 'synthetic public registration test evidence',
      actor_client_id: 'codex',
      request_source: 'controlled-mutation-public-registration-test',
      ...overrides
    };
  }

  if (toolName === 'tombstone_memory') {
    return {
      memory_id: 'mem-public-dry-run',
      reason: 'bounded tombstone review',
      evidence: 'synthetic public registration test evidence',
      tombstone_reason: 'retention test dry run',
      actor_client_id: 'codex',
      request_source: 'controlled-mutation-public-registration-test',
      ...overrides
    };
  }

  return {
    old_memory_id: 'mem-public-old',
    new_memory_id: 'mem-public-new',
    reason: 'bounded supersede review',
    evidence: 'synthetic public registration test evidence',
    supersedes_link: 'mem-public-old',
    superseded_by_link: 'mem-public-new',
    actor_client_id: 'codex',
    request_source: 'controlled-mutation-public-registration-test',
    ...overrides
  };
}

function assertLowDisclosureProjection(payload, toolName) {
  assert.equal(payload.tool, toolName);
  assert.equal(payload.mutated, false);
  assert.equal(payload.dryRun, true);
  assert.equal(payload.access.mode, 'controlled_mutation_public_bounded');
  assert.equal(payload.access.rawMemoryReturned, false);
  assert.equal(payload.access.rawAuditReturned, false);
  assert.equal(payload.access.filesystemPathsReturned, false);
  assert.equal(payload.access.tokenMaterialReturned, false);
  assert.equal(payload.access.providerPayloadReturned, false);
  assert.equal(payload.access.memoryContentReturned, false);
  assert.equal(payload.access.memoryIdsReturned, false);
  assert.equal(payload.access.titlesReturned, false);
  assert.equal(payload.access.snippetsReturned, false);
  assert.equal(payload.policy.lowDisclosureProjection, true);
  assert.equal(payload.policy.providerCalled, false);
  assert.equal(payload.policy.bearerTokenUsed, false);
  assert.equal(payload.policy.rawStoreScanned, false);
  assert.equal(payload.policy.durableMutationPerformed, false);
  assert.equal(payload.policy.readinessClaimed, false);
  assert.equal(payload.policy.rcReadyClaimed, false);
  assert.equal(payload.confirmGate.confirmedMutationAllowed, false);
  assert.equal(payload.approvalRequired, true);

  for (const forbidden of [
    'memoryId',
    'memory_id',
    'old_memory_id',
    'new_memory_id',
    'title',
    'content',
    'snippet',
    'filePath',
    'relativePath',
    'rawText',
    'auditEventPreview',
    'auditPlanPreview',
    'providerUrl',
    'embeddingFingerprint',
    'fromStatus',
    'toStatus',
    'oldFromStatus',
    'oldToStatus',
    'newFromStatus',
    'newToStatus'
  ]) {
    assert.equal(hasKey(payload, forbidden), false, `${toolName} leaked ${forbidden}`);
  }
}

function hasKey(value, forbiddenKey) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(item => hasKey(item, forbiddenKey));
  return Object.keys(value).some(key => key === forbiddenKey || hasKey(value[key], forbiddenKey));
}

test('CM1472 registers only approved controlled mutation public MCP tools', async () => {
  const toolNames = TOOL_DEFINITIONS.map(tool => tool.name);
  assert.deepEqual(sorted(toolNames), sorted(APPROVED_PUBLIC_TOOLS));

  for (const toolName of CONTROLLED_MUTATION_TOOLS) {
    const tool = TOOL_DEFINITIONS.find(candidate => candidate.name === toolName);
    assert.ok(tool, `${toolName} should be registered`);
    assert.equal(tool.inputSchema.type, 'object');
    assert.equal(tool.inputSchema.additionalProperties, false);
    assert.equal(tool.inputSchema.properties.confirm.type, 'boolean');
    assert.equal(tool.inputSchema.properties.dry_run.type, 'boolean');
    assert.equal(tool.inputSchema.properties.reason.maxLength, 1000);
    assert.equal(tool.inputSchema.properties.evidence.maxLength, 4000);
    assert.match(tool.description, /dry-run bounded/);
    assert.match(tool.description, /separate exact mutation approval/);
  }

  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const list = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    });
    assert.deepEqual(sorted(list.response.result.tools.map(tool => tool.name)), sorted(DEFAULT_MCP_PUBLIC_TOOLS));
  });
});

test('operator MCP surface can explicitly expose controlled mutation tools', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const list = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    });
    assert.deepEqual(
      sorted(list.response.result.tools.map(tool => tool.name)),
      sorted([...DEFAULT_MCP_PUBLIC_TOOLS, ...CONTROLLED_MUTATION_TOOLS])
    );
  }, {
    exposeControlledMutationMcpTools: true
  });
});

test('CM1472 public controlled mutation calls return bounded dry-run low-disclosure projection', async () => {
  await withApp(async ({ app }) => {
    for (const toolName of CONTROLLED_MUTATION_TOOLS) {
      const payload = await app.callTool(toolName, validArgs(toolName), publicRequestContext());
      assert.equal(payload.decision, 'rejected');
      assertLowDisclosureProjection(payload, toolName);
    }
  });
});

test('public controlled mutation dry-run binds actor_client_id to request context', async () => {
  await withApp(async ({ app }) => {
    insertRecord(app.config.dbPath, {
      memoryId: 'mem-public-dry-run',
      status: 'proposal',
      clientId: 'codex',
      visibility: 'private'
    });

    const payload = await app.callTool('validate_memory', validArgs('validate_memory', {
      actor_client_id: 'claude'
    }), publicRequestContext({ clientId: 'codex' }));

    assert.equal(payload.decision, 'rejected');
    assert.equal(payload.accepted, false);
    assert.equal(payload.reasonCode, 'public_dry_run_low_disclosure');
    assertLowDisclosureProjection(payload, 'validate_memory');
  });
});

test('public controlled mutation allowed-transition record does not leak lifecycle metadata', async () => {
  await withApp(async ({ app }) => {
    insertRecord(app.config.dbPath, {
      memoryId: 'mem-public-dry-run',
      status: 'proposal',
      clientId: 'codex',
      visibility: 'private'
    });

    const validatePayload = await app.callTool('validate_memory', validArgs('validate_memory'), publicRequestContext({
      clientId: 'codex'
    }));
    assert.equal(validatePayload.accepted, false);
    assert.equal(validatePayload.decision, 'rejected');
    assert.equal(validatePayload.reasonCode, 'public_dry_run_low_disclosure');
    assertLowDisclosureProjection(validatePayload, 'validate_memory');

    const tombstonePayload = await app.callTool('tombstone_memory', validArgs('tombstone_memory'), publicRequestContext({
      clientId: 'codex'
    }));
    assert.equal(tombstonePayload.accepted, false);
    assert.equal(tombstonePayload.decision, 'rejected');
    assert.equal(tombstonePayload.reasonCode, 'public_dry_run_low_disclosure');
    assertLowDisclosureProjection(tombstonePayload, 'tombstone_memory');
  });
});

test('public controlled mutation rejects payload actor without request context actor', async () => {
  await withApp(async ({ app }) => {
    const payload = await app.callTool('validate_memory', validArgs('validate_memory', {
      actor_client_id: 'codex'
    }));

    assert.equal(payload.decision, 'rejected');
    assert.equal(payload.accepted, false);
    assert.match(payload.reason, /request context bound actor client id/);
    assertLowDisclosureProjection(payload, 'validate_memory');
  });
});

test('public controlled mutation cross-client private dry-run is low-disclosure rejected', async () => {
  await withApp(async ({ app }) => {
    insertRecord(app.config.dbPath, {
      memoryId: 'mem-private-claude',
      status: 'proposal',
      clientId: 'claude',
      visibility: 'private'
    });

    const payload = await app.callTool('validate_memory', validArgs('validate_memory', {
      memory_id: 'mem-private-claude',
      actor_client_id: 'claude'
    }), publicRequestContext({ clientId: 'codex' }));

    assert.equal(payload.decision, 'rejected');
    assert.equal(payload.accepted, false);
    assert.equal(payload.reason, 'public controlled mutation dry-run rejected by privacy gate.');
    assert.doesNotMatch(JSON.stringify(payload), /claude|cross-client private/i);
    assertLowDisclosureProjection(payload, 'validate_memory');
  });
});

test('CM1472 public controlled mutation dry_run false attempts are rejected before mutation', async () => {
  await withApp(async ({ app }) => {
    for (const toolName of CONTROLLED_MUTATION_TOOLS) {
      const payload = await app.callTool(toolName, validArgs(toolName, {
        dry_run: false
      }), publicRequestContext());
      assert.equal(payload.decision, 'rejected');
      assert.match(payload.reason, /separate exact mutation approval/);
      assert.equal(payload.confirmGate.confirmRequested, false);
      assert.equal(payload.confirmGate.dryRunRequested, false);
      assertLowDisclosureProjection(payload, toolName);
    }
  });
});

test('CM1472 public controlled mutation confirm true attempts are rejected before mutation', async () => {
  await withApp(async ({ app }) => {
    for (const toolName of CONTROLLED_MUTATION_TOOLS) {
      const payload = await app.callTool(toolName, validArgs(toolName, {
        confirm: true
      }), publicRequestContext());
      assert.equal(payload.decision, 'rejected');
      assert.match(payload.reason, /separate exact mutation approval/);
      assert.equal(payload.confirmGate.confirmRequested, true);
      assert.equal(payload.confirmGate.dryRunRequested, true);
      assertLowDisclosureProjection(payload, toolName);
    }
  });
});

test('CM1472 MCP tools/call validates schema and preserves low-disclosure result', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });

    const hidden = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'validate_memory',
        arguments: validArgs('validate_memory')
      }
    }, publicRequestContext());
    assert.equal(hidden.response.error.code, -32001);
    assert.equal(hidden.response.error.data.code, 'mcp_tool_not_exposed');
  });

  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });

    const valid = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'validate_memory',
        arguments: validArgs('validate_memory')
      }
    }, publicRequestContext());
    assert.equal(valid.response.result.isError, true);
    assertLowDisclosureProjection(valid.response.result.structuredContent, 'validate_memory');

    const invalid = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'validate_memory',
        arguments: {
          ...validArgs('validate_memory'),
          raw: true
        }
      }
    });
    assert.equal(invalid.response.error.code, -32602);
    assert.match(invalid.response.error.data, /raw/);
  }, {
    exposeControlledMutationMcpTools: true
  });
});

test('CM1472 public registration does not register mutation aliases or readiness claims', async () => {
  await withApp(async ({ app }) => {
    await assert.rejects(() => app.callTool('memory_tombstone', {}), /Unknown tool: memory_tombstone/);
    await assert.rejects(() => app.callTool('memory_supersede', {}), /Unknown tool: memory_supersede/);
    await assert.rejects(() => app.callTool('update_memory', {}), /Unknown tool: update_memory/);
    await assert.rejects(() => app.callTool('forget_memory', {}), /Unknown tool: forget_memory/);
  });
});
