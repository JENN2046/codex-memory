const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const { createCodexMemoryApplication } = require('../src/app');
const {
  ToolArgumentValidationError,
  validateToolArguments
} = require('../src/core/ToolArgumentValidator');
const {
  SCHEMA_VERSION_POLICY_ERRORS,
  buildSchemaVersionPolicyEvaluationReport
} = require('../src/core/SchemaVersionPolicy');

const fixturePath = path.join(__dirname, 'fixtures', 'schema-version-policy-v1.json');
const requestContext = {
  executionContext: {
    agentAlias: 'Codex',
    agentId: 'codex-desktop',
    requestSource: 'schema-version-runtime-boundary-test'
  }
};

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

async function withApp(handler) {
  const tempBasePath = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'codex-memory-schema-runtime-'));
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
    await fsPromises.rm(tempBasePath, { recursive: true, force: true });
  }
}

function baseRecordMemoryArgs(extra = {}) {
  return {
    target: 'process',
    title: 'Schema Version Runtime Boundary',
    content: 'Type: checkpoint\nrisk: schema version runtime enforcement remains pending',
    evidence: 'schema version runtime boundary fixture test',
    validated: true,
    reusable: false,
    sensitivity: 'none',
    ...extra
  };
}

function getToolDefinition(name) {
  return TOOL_DEFINITIONS.find(tool => tool.name === name);
}

test('record_memory public schema remains frozen without schema version arguments', () => {
  const recordMemory = getToolDefinition('record_memory');

  assert.ok(recordMemory, 'record_memory tool definition must exist');
  assert.equal(recordMemory.inputSchema.additionalProperties, false);
  assert.equal(Object.hasOwn(recordMemory.inputSchema.properties, 'schema_version'), false);
  assert.equal(Object.hasOwn(recordMemory.inputSchema.properties, 'schemaVersion'), false);
  assert.deepEqual(
    TOOL_DEFINITIONS.map(tool => tool.name).sort(),
    ['audit_memory', 'memory_overview', 'record_memory', 'search_memory']
  );
});

test('ToolArgumentValidator rejects schema version arguments before public MCP expansion', () => {
  assert.doesNotThrow(() => validateToolArguments('record_memory', baseRecordMemoryArgs()));
  assert.throws(
    () => validateToolArguments('record_memory', baseRecordMemoryArgs({ schema_version: 'v1' })),
    error =>
      error instanceof ToolArgumentValidationError &&
      error.path === 'arguments.schema_version' &&
      /not allowed/.test(error.message)
  );
  assert.throws(
    () => validateToolArguments('record_memory', baseRecordMemoryArgs({ schemaVersion: 'v1' })),
    error =>
      error instanceof ToolArgumentValidationError &&
      error.path === 'arguments.schemaVersion' &&
      /not allowed/.test(error.message)
  );
});

test('explicit schema policy report proves write rejection without runtime integration', () => {
  const fixture = loadFixture();
  const report = buildSchemaVersionPolicyEvaluationReport(fixture, [
    {
      id: 'missing-memory-record-new-write-boundary',
      schemaFamily: 'memory_record',
      operation: 'write',
      inputVersion: null,
      legacyRecord: false
    },
    {
      id: 'unknown-memory-record-new-write-boundary',
      schemaFamily: 'memory_record',
      operation: 'write',
      inputVersion: 'v99',
      legacyRecord: false
    }
  ]);

  assert.equal(report.sourceMode, 'explicit_input');
  assert.equal(report.runtimeEnforcementImplemented, false);
  assert.equal(report.runtimeIntegrated, false);
  assert.equal(report.policyCaseCount, 2);
  assert.equal(report.acceptedCount, 0);
  assert.equal(report.rejectedCount, 2);
  assert.equal(report.errorCounts[SCHEMA_VERSION_POLICY_ERRORS.SCHEMA_VERSION_REQUIRED], 1);
  assert.equal(report.errorCounts[SCHEMA_VERSION_POLICY_ERRORS.UNSUPPORTED_SCHEMA_VERSION], 1);
  assert.equal(report.publicMcpTools.frozen, true);
  assert.deepEqual(report.publicMcpTools.tools, ['record_memory', 'search_memory', 'memory_overview', 'audit_memory']);
  assert.equal(report.readsFiles, false);
  assert.equal(report.executesCommands, false);
  assert.equal(report.startsServices, false);
  assert.equal(report.callsProviders, false);
  assert.equal(report.durableMemoryTouched, false);
  assert.equal(report.realMemoryScanned, false);
  assert.equal(report.publicMcpExpanded, false);
});

test('MemoryWriteService rejects schema version metadata before diary persistence', async () => {
  await withApp(async ({ app }) => {
    const result = await app.callTool('record_memory', baseRecordMemoryArgs({
      schemaVersion: 'memory-record-v99',
      policyVersion: 'policy-v99',
      manifestVersion: 'manifest-v99'
    }), requestContext);

    assert.equal(result.decision, 'rejected');
    assert.equal(result.filePath, null);
    assert.equal(result.memoryId, null);
    assert.match(result.reason, /schema\/version metadata is not accepted/);
    assert.match(result.reason, /schemaVersion/);
    assert.match(result.reason, /policyVersion/);
    assert.match(result.reason, /manifestVersion/);
    assert.doesNotMatch(result.reason, /memory-record-v99/);
    assert.doesNotMatch(result.reason, /policy-v99/);
    assert.doesNotMatch(result.reason, /manifest-v99/);

    const auditText = await fsPromises.readFile(app.config.auditLogPath, 'utf8');
    assert.match(auditText, /rejected/);
    assert.match(auditText, /schema\/version metadata is not accepted/);
    assert.doesNotMatch(auditText, /memory-record-v99/);
    assert.doesNotMatch(auditText, /policy-v99/);
    assert.doesNotMatch(auditText, /manifest-v99/);
  });
});
