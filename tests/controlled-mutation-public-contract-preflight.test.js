const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const { CodexMemoryMcpServer } = require('../src/adapters/codex-mcp/server');
const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  CANDIDATE_TOOL_DEFINITIONS,
  CANDIDATE_TOOL_NAMES,
  CORE_TOOL_NAMES_FROZEN,
  DISCLOSURE_FLAGS,
  PUBLIC_EXPOSURE_REQUIREMENTS,
  PUBLIC_TOOL_NAMES_FROZEN,
  SIDE_EFFECT_FLAGS,
  STATUS_ACCEPTED,
  buildControlledMutationPublicContractPreflightReport,
  publicToolsRemainFrozen
} = require('../src/core/ControlledMutationPublicContractPreflight');

function sorted(values) {
  return [...values].sort();
}

async function withApp(handler, overrides = {}) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'controlled-mutation-preflight-'));
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

test('CM1468 controlled mutation preflight tracks CM1472 public registration', () => {
  const report = buildControlledMutationPublicContractPreflightReport();

  assert.equal(report.status, STATUS_ACCEPTED);
  assert.equal(report.acceptedForPlanning, true);
  assert.deepEqual(sorted(report.candidateToolNames), sorted(['validate_memory', 'tombstone_memory', 'supersede_memory']));
  assert.equal(report.draftOnly, true);
  assert.equal(report.registeredPublicly, false);
  assert.equal(report.publicMcpExpanded, false);
  assert.equal(report.coreToolsFrozen, true);
  assert.deepEqual(sorted(report.coreTools), sorted(CORE_TOOL_NAMES_FROZEN));
  assert.equal(report.publicToolsFrozen, true);
  assert.deepEqual(sorted(report.publicTools), sorted(PUBLIC_TOOL_NAMES_FROZEN));
  assert.equal(report.approvalRequiredBeforeRegistration, true);
  assert.deepEqual(report.publicExposureRequirements, PUBLIC_EXPOSURE_REQUIREMENTS);
  assert.equal(report.lowDisclosure, true);
  assert.equal(report.selectedProjection, true);
  assert.equal(report.readinessClaimed, false);
  assert.equal(report.rcReadyClaimed, false);

  for (const flag of DISCLOSURE_FLAGS) {
    assert.equal(report.disclosure[flag], false, `${flag} should be false`);
  }
  for (const flag of SIDE_EFFECT_FLAGS) {
    assert.equal(report.sideEffects[flag], false, `${flag} should remain false until operator surface is enabled`);
  }
});

test('CM1468 candidate schemas are bounded and reject additional properties', () => {
  assert.equal(CANDIDATE_TOOL_DEFINITIONS.length, 3);

  for (const tool of CANDIDATE_TOOL_DEFINITIONS) {
    assert.equal(CANDIDATE_TOOL_NAMES.includes(tool.name), true);
    assert.match(tool.description, /registered in CM-1472/);
    assert.equal(tool.inputSchema.type, 'object');
    assert.equal(tool.inputSchema.additionalProperties, false);
    assert.equal(tool.inputSchema.properties.confirm.type, 'boolean');
    assert.equal(tool.inputSchema.properties.dry_run.type, 'boolean');
    assert.equal(tool.inputSchema.properties.reason.maxLength, 1000);
    assert.equal(tool.inputSchema.properties.evidence.maxLength, 4000);
    assert.equal(tool.inputSchema.properties.actor_client_id.maxLength, 200);
    assert.equal(tool.inputSchema.properties.request_source.maxLength, 200);
  }

  const validate = CANDIDATE_TOOL_DEFINITIONS.find(tool => tool.name === 'validate_memory');
  assert.deepEqual(validate.inputSchema.required, ['memory_id', 'reason', 'evidence', 'actor_client_id', 'request_source']);

  const tombstone = CANDIDATE_TOOL_DEFINITIONS.find(tool => tool.name === 'tombstone_memory');
  assert.equal(tombstone.inputSchema.required.includes('tombstone_reason'), true);

  const supersede = CANDIDATE_TOOL_DEFINITIONS.find(tool => tool.name === 'supersede_memory');
  assert.equal(supersede.inputSchema.required.includes('old_memory_id'), true);
  assert.equal(supersede.inputSchema.required.includes('new_memory_id'), true);
  assert.equal(supersede.inputSchema.required.includes('supersedes_link'), true);
  assert.equal(supersede.inputSchema.required.includes('superseded_by_link'), true);
});

test('CM1472 core tool freeze includes controlled mutation candidates while default MCP surface remains read-only', async () => {
  const coreTools = TOOL_DEFINITIONS.map(tool => tool.name);

  assert.deepEqual(sorted(coreTools), sorted(CORE_TOOL_NAMES_FROZEN));
  for (const candidate of CANDIDATE_TOOL_NAMES) {
    assert.equal(coreTools.includes(candidate), true, `${candidate} must remain available in core definitions`);
  }

  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const list = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    });

    const toolNames = list.response.result.tools.map(tool => tool.name);
    assert.deepEqual(sorted(toolNames), sorted(PUBLIC_TOOL_NAMES_FROZEN));
    for (const candidate of CANDIDATE_TOOL_NAMES) {
      assert.equal(toolNames.includes(candidate), false, `${candidate} must stay hidden in default tools/list`);
    }
  });
});

test('CM1472 operator MCP surface can explicitly expose controlled mutation candidates', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const list = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    });

    const toolNames = list.response.result.tools.map(tool => tool.name);
    for (const candidate of CANDIDATE_TOOL_NAMES) {
      assert.equal(toolNames.includes(candidate), true, `${candidate} must appear when operator surface is enabled`);
    }
  }, { exposeControlledMutationMcpTools: true });
});

test('CM1472 app.callTool accepts controlled mutation candidates as dry-run bounded public tools', async () => {
  await withApp(async ({ app }) => {
    for (const candidate of CANDIDATE_TOOL_NAMES) {
      const result = await app.callTool(candidate, {});
      assert.equal(result.decision, 'rejected');
      assert.equal(result.mutated, false);
      assert.equal(result.access.mode, 'controlled_mutation_public_bounded');
    }
  });
});

test('CM1468 output projection forbids raw disclosure and readiness claims', () => {
  const report = buildControlledMutationPublicContractPreflightReport();

  assert.equal(report.outputProjection.returnsRawMemory, false);
  assert.equal(report.outputProjection.returnsRawAudit, false);
  assert.equal(report.outputProjection.returnsMemoryContent, false);
  assert.equal(report.outputProjection.returnsFilesystemPath, false);
  assert.equal(report.outputProjection.returnsTokenMaterial, false);
  assert.equal(report.outputProjection.returnsProviderPayload, false);
  assert.equal(report.outputProjection.allowedFields.includes('approvalRequired'), true);
  assert.equal(report.forbiddenPublicBehavior.includes('unconfirmed_mutation'), true);
  assert.equal(report.forbiddenPublicBehavior.includes('readiness_claim'), true);
});
