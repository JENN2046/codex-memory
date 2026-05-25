const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  PROOF_MEMORY_RETENTION_POLICY,
  PROOF_MEMORY_TAG,
  PROOF_MEMORY_VISIBILITY,
  applyProofMemoryWritePolicy,
  buildProofMemoryRecallFilters
} = require('../src/core/ProofMemoryPolicy');

const requestContext = {
  executionContext: {
    agentAlias: 'Codex',
    agentId: 'codex-desktop',
    requestSource: 'proof-memory-policy-test'
  }
};

async function withApp(handler) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-proof-policy-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data')
  });

  await app.initialize();
  try {
    await handler({ app, tempBasePath });
  } finally {
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
}

test('proof memory write policy requires explicit proof retention signal', () => {
  const ordinary = applyProofMemoryWritePolicy({
    tags: ['proof'],
    retention_policy: 'keep'
  });
  assert.equal(ordinary.proofMemory.applied, false);
  assert.equal(ordinary.visibility, null);
  assert.equal(ordinary.retentionPolicy, 'keep');
  assert.deepEqual(ordinary.tags, ['proof']);

  const proof = applyProofMemoryWritePolicy({
    tags: ['cm1070'],
    retention_policy: PROOF_MEMORY_RETENTION_POLICY
  });
  assert.equal(proof.proofMemory.applied, true);
  assert.equal(proof.visibility, PROOF_MEMORY_VISIBILITY);
  assert.equal(proof.retentionPolicy, PROOF_MEMORY_RETENTION_POLICY);
  assert.deepEqual(proof.tags.sort(), ['cm1070', PROOF_MEMORY_TAG].sort());
});

test('proof memory recall filters exclude internal proof visibility by default', () => {
  assert.deepEqual(
    buildProofMemoryRecallFilters({ projectId: 'codex-memory' }),
    { projectId: 'codex-memory', visibilityExclude: [PROOF_MEMORY_VISIBILITY] }
  );
  assert.deepEqual(
    buildProofMemoryRecallFilters({ visibility: [PROOF_MEMORY_VISIBILITY] }),
    { visibility: [PROOF_MEMORY_VISIBILITY] }
  );
});

test('proof memory is namespaced on write and excluded from normal recall', async () => {
  await withApp(async ({ app }) => {
    const marker = `CM1070_PROOF_NAMESPACE_MARKER_${Date.now()}`;
    const record = await app.callTool('record_memory', {
      target: 'process',
      title: 'CM1070 proof namespace retention',
      content: `Type: checkpoint\nrisk: ${marker} should stay out of normal recall.`,
      evidence: 'temp-local proof namespace policy test',
      validated: true,
      reusable: false,
      tags: ['cm1070'],
      sensitivity: 'none',
      retention_policy: PROOF_MEMORY_RETENTION_POLICY
    }, requestContext);

    assert.equal(record.decision, 'accepted');
    assert.equal(record.proofMemory.applied, true);
    assert.equal(record.proofMemory.visibility, PROOF_MEMORY_VISIBILITY);
    assert.equal(record.proofMemory.retentionPolicy, PROOF_MEMORY_RETENTION_POLICY);

    const stored = await app.stores.shadowStore.getRecord(record.memoryId);
    assert.equal(stored.visibility, PROOF_MEMORY_VISIBILITY);
    assert.equal(stored.retentionPolicy, PROOF_MEMORY_RETENTION_POLICY);
    assert.equal(stored.tags.includes(PROOF_MEMORY_TAG), true);

    const normalRecall = await app.callTool('search_memory', {
      query: marker,
      target: 'process',
      limit: 10,
      include_content: true
    }, requestContext);
    assert.equal(
      normalRecall.results.some(result => result.memoryId === record.memoryId),
      false,
      'normal recall must exclude internal proof memory by default'
    );

    const proofRecall = await app.callTool('search_memory', {
      query: marker,
      target: 'process',
      limit: 10,
      include_content: true,
      scope: {
        visibility: PROOF_MEMORY_VISIBILITY
      }
    }, requestContext);
    assert.equal(
      proofRecall.results.some(result => result.memoryId === record.memoryId),
      true,
      'proof recall must be explicit through internal proof visibility scope'
    );
  });
});

test('public MCP tool schemas remain frozen for proof memory policy', () => {
  const recordSchema = TOOL_DEFINITIONS.find(tool => tool.name === 'record_memory');
  const searchSchema = TOOL_DEFINITIONS.find(tool => tool.name === 'search_memory');

  assert.ok(recordSchema);
  assert.ok(searchSchema);
  assert.equal(Object.hasOwn(recordSchema.inputSchema.properties, 'proof_memory'), false);
  assert.equal(Object.hasOwn(searchSchema.inputSchema.properties, 'include_proof_memory'), false);
  assert.equal(recordSchema.inputSchema.properties.visibility.enum.includes(PROOF_MEMORY_VISIBILITY), false);
  assert.equal(searchSchema.inputSchema.properties.scope.properties.visibility.oneOf[0].enum.includes(PROOF_MEMORY_VISIBILITY), false);
});
