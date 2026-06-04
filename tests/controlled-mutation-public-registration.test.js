const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

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

const CONTROLLED_MUTATION_TOOLS = [
  'validate_memory',
  'tombstone_memory',
  'supersede_memory'
];

function sorted(values) {
  return [...values].sort();
}

async function withApp(handler) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'controlled-mutation-public-registration-'));
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
    'embeddingFingerprint'
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
    assert.deepEqual(sorted(list.response.result.tools.map(tool => tool.name)), sorted(APPROVED_PUBLIC_TOOLS));
  });
});

test('CM1472 public controlled mutation calls return bounded dry-run low-disclosure projection', async () => {
  await withApp(async ({ app }) => {
    for (const toolName of CONTROLLED_MUTATION_TOOLS) {
      const payload = await app.callTool(toolName, validArgs(toolName));
      assert.equal(payload.decision, 'rejected');
      assertLowDisclosureProjection(payload, toolName);
    }
  });
});

test('CM1472 public controlled mutation confirm attempts are rejected before mutation', async () => {
  await withApp(async ({ app }) => {
    for (const toolName of CONTROLLED_MUTATION_TOOLS) {
      const payload = await app.callTool(toolName, validArgs(toolName, {
        dry_run: false,
        confirm: true
      }));
      assert.equal(payload.decision, 'rejected');
      assert.match(payload.reason, /separate exact mutation approval/);
      assert.equal(payload.confirmGate.confirmRequested, true);
      assert.equal(payload.confirmGate.dryRunRequested, false);
      assertLowDisclosureProjection(payload, toolName);
    }
  });
});

test('CM1472 MCP tools/call validates schema and preserves low-disclosure result', async () => {
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
    });
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
