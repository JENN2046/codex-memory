const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createHash } = require('node:crypto');

const { createCodexMemoryApplication } = require('../src/app');
const { validateToolArguments } = require('../src/core/ToolArgumentValidator');

const EXPECTED_HASH = '25a5f0bd9edd4ee011bff414f09a4d6f61f5dc1db31b9fc21695d9779678ba67';

async function loadCorrectedPayload() {
  const packet = await fs.readFile(
    path.join(__dirname, '..', 'docs', 'CM1434_CORRECTED_SCOPED_RECORD_MEMORY_WRITE_PROOF_PACKET.md'),
    'utf8'
  );
  const match = packet.match(/```json\r?\n([\s\S]*?)\r?\n```/);
  assert.ok(match, 'CM-1434 packet should contain canonical JSON payload');
  const canonical = match[1].trim();
  const hash = createHash('sha256').update(canonical).digest('hex');
  return {
    canonical,
    hash,
    payload: JSON.parse(canonical)
  };
}

async function withTempApp(handler) {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1434-'));
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
    defaultRequestSource: 'cm1434-corrected-record-memory-payload-test'
  });

  await app.initialize();
  try {
    await handler(app);
  } finally {
    await app.close();
    await fs.rm(rootPath, { recursive: true, force: true });
  }
}

test('CM-1434 corrected payload passes schema and temp process write semantics', async () => {
  const { hash, payload } = await loadCorrectedPayload();

  assert.equal(hash, EXPECTED_HASH);
  assert.doesNotThrow(() => validateToolArguments('record_memory', payload));
  assert.equal(payload.target, 'process');
  assert.match(`${payload.title}\n${payload.content}`, /checkpoint/i);
  for (const field of ['project_id', 'client_id', 'visibility', 'task_id', 'retention_policy']) {
    assert.ok(Object.prototype.hasOwnProperty.call(payload, field), `${field} should be present`);
  }

  await withTempApp(async (app) => {
    const result = await app.callTool('record_memory', payload, {
      executionContext: {
        agentAlias: 'Codex',
        agentId: 'cm1434-temp-synthetic',
        requestSource: 'cm1434-corrected-record-memory-payload-test'
      }
    });

    assert.equal(result.decision, 'accepted');
    assert.equal(result.target, 'process');
    assert.equal(result.shadowWrite.status, 'ok');
    assert.ok(result.memoryId);
  });
});
