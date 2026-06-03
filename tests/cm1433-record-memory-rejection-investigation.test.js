const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const { validateToolArguments } = require('../src/core/ToolArgumentValidator');

async function loadCm1431Payload() {
  const packet = await fs.readFile(
    path.join(__dirname, '..', 'docs', 'CM1431_SCOPED_RECORD_MEMORY_WRITE_PROOF_SCOPE_PACKET.md'),
    'utf8'
  );
  const match = packet.match(/```json\r?\n([\s\S]*?)\r?\n```/);
  assert.ok(match, 'CM-1431 packet should contain canonical JSON payload');
  return JSON.parse(match[1].trim());
}

async function withTempApp(handler) {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1433-'));
  const app = createCodexMemoryApplication({
    projectBasePath: rootPath,
    dailyNoteRootPath: path.join(rootPath, 'dailynote'),
    logsDir: path.join(rootPath, 'logs'),
    dataDir: path.join(rootPath, 'data'),
    enableCandidateCache: false,
    enableEmbeddingCache: false,
    enableVectorIndex: false,
    enableShadowWrites: true,
    enableWriteManifest: true,
    defaultRequestSource: 'cm1433-record-memory-rejection-investigation-test'
  });

  await app.initialize();
  try {
    await handler(app);
  } finally {
    await app.close();
    await fs.rm(rootPath, { recursive: true, force: true });
  }
}

test('CM-1431 packet payload passes public schema but fails process target semantic signal rule', async () => {
  const payload = await loadCm1431Payload();

  assert.doesNotThrow(() => validateToolArguments('record_memory', payload));
  assert.equal(payload.target, 'process');
  for (const field of ['project_id', 'client_id', 'visibility', 'task_id', 'retention_policy']) {
    assert.ok(Object.prototype.hasOwnProperty.call(payload, field), `${field} should be present`);
  }

  await withTempApp(async (app) => {
    const result = await app.callTool('record_memory', payload, {
      executionContext: {
        agentAlias: 'Codex',
        agentId: 'cm1433-temp-synthetic',
        requestSource: 'cm1433-record-memory-rejection-investigation-test'
      }
    });

    assert.equal(result.decision, 'rejected');
    assert.equal(result.target, 'process');
    assert.equal(result.memoryId, null);
    assert.match(result.reason, /process memory must include checkpoint, risk, todo, pending, or stage-conclusion/i);
    assert.equal(result.shadowWrite.status, 'skipped');
  });
});
