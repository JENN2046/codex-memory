const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const { TOOL_DEFINITIONS } = require('../src/core/constants');

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function withTempApp(handler, overrides = {}) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-write-preflight-app-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data'),
    enableWritePreflight: true,
    ...overrides
  });

  await app.initialize();

  try {
    await handler({ app, tempBasePath });
  } finally {
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }

  assert.equal(await pathExists(tempBasePath), false);
}

function codexRequestContext(overrides = {}) {
  return {
    executionContext: {
      agentAlias: 'Codex',
      agentId: 'codex-desktop',
      requestSource: 'cm-0893-app-temp-local-evidence',
      ...overrides
    }
  };
}

function writePayload(overrides = {}) {
  return {
    target: 'process',
    title: 'Checkpoint: CM-0893 app temp-local write preflight evidence',
    content: [
      'Checkpoint: app-path write preflight temp-local evidence.',
      'Purpose: prove same-scope duplicate suppression through createCodexMemoryApplication().',
      'Boundary: isolated temp-local app only; no provider, no readiness claim.'
    ].join('\n'),
    evidence: 'CM-0893 app temp-local write preflight evidence',
    validated: true,
    reusable: false,
    sensitivity: 'none',
    tags: ['cm-0893', 'write-preflight', 'temp-local-app'],
    project_id: 'codex-memory',
    workspace_id: 'cm-0893-write-preflight-app-workspace',
    client_id: 'codex',
    task_id: 'CM-0893',
    conversation_id: 'write-preflight-app-temp-local-evidence',
    visibility: 'project',
    retention_policy: 'keep',
    ...overrides
  };
}

test('CM-0893 app-path temp-local evidence suppresses same-scope duplicate before second durable projection', async () => {
  await withTempApp(async ({ app }) => {
    const requestContext = codexRequestContext();
    const payload = writePayload();

    const first = await app.callTool('record_memory', payload, requestContext);
    const second = await app.callTool('record_memory', payload, requestContext);

    assert.equal(app.config.enableWritePreflight, true);
    assert.equal(app.services.writeService.writePreflightEnabled, true);
    assert.equal(first.decision, 'accepted');
    assert.equal(second.decision, 'rejected');
    assert.match(second.reason, /write preflight rejected: duplicate_suppressed/i);
    assert.equal(second.writePreflight.decision, 'duplicate_suppressed');
    assert.equal(second.writePreflight.matchedCandidateCount, 1);
    assert.equal(second.memoryId, null);
    assert.equal(second.filePath, null);
    assert.equal(await pathExists(first.filePath), true);

    const shadowHealth = await app.stores.shadowStore.getHealth();
    assert.equal(shadowHealth.recordCount, 1);
    assert.equal(shadowHealth.chunkCount >= 1, true);
    assert.equal(shadowHealth.reconcileCount, 0);

    const vectorHealth = await app.stores.vectorStore.getHealth();
    assert.equal(vectorHealth.vectorCount, 1);

    const records = await app.stores.shadowStore.listRecords('process');
    assert.equal(records.length, 1);
    assert.equal(records[0].taskId, 'CM-0893');
    assert.equal(records[0].workspaceId, 'cm-0893-write-preflight-app-workspace');

    const audits = await app.stores.auditLogStore.readRecentWriteAudit();
    assert.equal(audits.length, 2);
    assert.deepEqual(audits.map(entry => entry.decision), ['accepted', 'rejected']);

    assert.deepEqual(
      TOOL_DEFINITIONS.map(tool => tool.name).sort(),
      ['memory_overview', 'record_memory', 'search_memory']
    );
  });
});

test('CM-0893 app-path temp-local evidence preserves out-of-scope same-content acceptance', async () => {
  await withTempApp(async ({ app }) => {
    const requestContext = codexRequestContext();
    const firstPayload = writePayload({
      task_id: 'CM-0893-SCOPE-A',
      conversation_id: 'write-preflight-app-temp-local-evidence-a'
    });
    const secondPayload = writePayload({
      task_id: 'CM-0893-SCOPE-B',
      conversation_id: 'write-preflight-app-temp-local-evidence-b'
    });

    const first = await app.callTool('record_memory', firstPayload, requestContext);
    const second = await app.callTool('record_memory', secondPayload, requestContext);

    assert.equal(first.decision, 'accepted');
    assert.equal(second.decision, 'accepted');
    assert.notEqual(first.memoryId, second.memoryId);

    const shadowHealth = await app.stores.shadowStore.getHealth();
    assert.equal(shadowHealth.recordCount, 2);
    assert.equal(shadowHealth.chunkCount >= 2, true);
    assert.equal(shadowHealth.reconcileCount, 0);

    const vectorHealth = await app.stores.vectorStore.getHealth();
    assert.equal(vectorHealth.vectorCount, 2);

    const records = await app.stores.shadowStore.listRecords('process');
    assert.equal(records.length, 2);
    assert.deepEqual(
      new Set(records.map(record => record.taskId)),
      new Set(['CM-0893-SCOPE-A', 'CM-0893-SCOPE-B'])
    );

    const audits = await app.stores.auditLogStore.readRecentWriteAudit();
    assert.equal(audits.length, 2);
    assert.deepEqual(audits.map(entry => entry.decision), ['accepted', 'accepted']);

    assert.deepEqual(
      TOOL_DEFINITIONS.map(tool => tool.name).sort(),
      ['memory_overview', 'record_memory', 'search_memory']
    );
  });
});
