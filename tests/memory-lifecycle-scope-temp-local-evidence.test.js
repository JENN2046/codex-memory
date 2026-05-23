const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  filterRecallCandidatesByLifecycleScope
} = require('../src/core/MemoryLifecycleScopeGovernanceContract');

const exactScope = Object.freeze({
  userId: 'synthetic-user',
  projectId: 'codex-memory',
  workspaceId: 'synthetic-temp-local-workspace',
  clientId: 'codex',
  agentId: 'codex-agent',
  taskId: 'CM-0847',
  conversationId: 'synthetic-temp-local-read-policy',
  folder: 'alpha',
  visibility: 'project',
  retentionPolicy: 'keep'
});

const syntheticRecords = Object.freeze([
  {
    memoryId: 'active-exact-current',
    lifecycleStatus: 'active',
    rankHint: '2026-05-23T10:00:00Z',
    scope: exactScope,
    content: 'raw synthetic active content'
  },
  {
    memoryId: 'proposal-exact',
    lifecycleStatus: 'proposal',
    rankHint: '2026-05-23T11:00:00Z',
    scope: exactScope,
    title: 'raw synthetic proposal title'
  },
  {
    memoryId: 'tombstoned-exact',
    lifecycleStatus: 'tombstoned',
    rankHint: '2026-05-23T12:00:00Z',
    scope: exactScope,
    snippet: 'raw synthetic tombstone snippet'
  },
  {
    memoryId: 'active-other-project',
    lifecycleStatus: 'active',
    rankHint: '2026-05-23T13:00:00Z',
    scope: {
      ...exactScope,
      projectId: 'other-project'
    },
    text: 'raw synthetic other project text'
  },
  {
    memoryId: 'preflight-rejected-exact',
    lifecycleStatus: 'preflight_rejected',
    rankHint: '2026-05-23T14:00:00Z',
    scope: exactScope,
    sourceFile: 'synthetic-source.txt'
  },
  {
    memoryId: 'malformed-scope',
    lifecycleStatus: 'active',
    rankHint: '2026-05-23T15:00:00Z',
    scope: exactScope,
    malformedScope: true,
    jsonlLine: 'synthetic raw line should not leak'
  },
  {
    memoryId: 'active-folder-beta',
    lifecycleStatus: 'active',
    rankHint: '2026-05-23T16:00:00Z',
    scope: {
      ...exactScope,
      folder: 'beta'
    },
    content: 'raw synthetic beta folder content'
  }
]);

function createTempWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-0847-lifecycle-scope-'));
  const storeDir = path.join(root, 'synthetic-store');
  fs.mkdirSync(storeDir);
  return { root, storeDir };
}

function assertInsideRoot(root, targetPath) {
  const relative = path.relative(root, targetPath);
  assert.equal(relative.startsWith('..'), false);
  assert.equal(path.isAbsolute(relative), false);
}

function writeSyntheticRecords(storeDir, records) {
  const filePath = path.join(storeDir, 'synthetic-records.json');
  assertInsideRoot(path.dirname(storeDir), filePath);
  fs.writeFileSync(filePath, JSON.stringify(records, null, 2));
  return filePath;
}

function readSyntheticRecords(filePath) {
  assert.equal(path.basename(filePath), 'synthetic-records.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function runTempLocalEvidence(checkName, candidates, currentScope = exactScope) {
  const result = filterRecallCandidatesByLifecycleScope({
    currentScope,
    candidates
  });

  return {
    taskId: 'CM-0847',
    checkName,
    sourceMode: 'synthetic_temp_local_json',
    queryCount: 1,
    acceptedCount: result.acceptedCount,
    suppressedCount: result.suppressedCount,
    acceptedCandidates: result.acceptedCandidates,
    suppressedCandidates: result.suppressedCandidates,
    sanitizedAuditMetadata: result.sanitizedAuditMetadata,
    rawContentExposed: result.rawContentExposed,
    cleanupVerified: false,
    safety: result.safety
  };
}

function assertZeroSideEffects(evidence) {
  assert.equal(evidence.rawContentExposed, false);
  assert.equal(evidence.safety.readsFiles, false);
  assert.equal(evidence.safety.scansRealMemory, false);
  assert.equal(evidence.safety.readsJsonl, false);
  assert.equal(evidence.safety.callsProviders, false);
  assert.equal(evidence.safety.writesDurableMemory, false);
  assert.equal(evidence.safety.writesAudit, false);
  assert.equal(evidence.safety.appliesCleanup, false);
  assert.equal(evidence.safety.appliesRollback, false);
  assert.equal(evidence.safety.expandsPublicMcp, false);
  assert.equal(evidence.safety.readinessClaimed, false);
}

test('CM-0847 temp-local evidence uses isolated root and synthetic records only', () => {
  const workspace = createTempWorkspace();

  try {
    const filePath = writeSyntheticRecords(workspace.storeDir, syntheticRecords);
    const loadedRecords = readSyntheticRecords(filePath);
    const evidence = runTempLocalEvidence('mixed_lifecycle_suppression', loadedRecords);

    assertInsideRoot(workspace.root, filePath);
    assert.equal(loadedRecords.length, 7);
    assert.equal(evidence.acceptedCount, 1);
    assert.deepEqual(evidence.acceptedCandidates.map(item => item.memoryId), ['active-exact-current']);
    assert.equal(evidence.suppressedCount, 6);
    assertZeroSideEffects(evidence);
  } finally {
    fs.rmSync(workspace.root, { recursive: true, force: true });
    assert.equal(fs.existsSync(workspace.root), false);
  }
});

test('CM-0847 exact check count 4 covers lifecycle scope malformed and cleanup evidence', () => {
  const workspace = createTempWorkspace();
  const evidenceOutput = [];

  try {
    const filePath = writeSyntheticRecords(workspace.storeDir, syntheticRecords);
    const loadedRecords = readSyntheticRecords(filePath);

    evidenceOutput.push(runTempLocalEvidence(
      'mixed_lifecycle_suppression',
      loadedRecords.filter(record => [
        'active-exact-current',
        'proposal-exact',
        'tombstoned-exact',
        'preflight-rejected-exact'
      ].includes(record.memoryId))
    ));

    evidenceOutput.push(runTempLocalEvidence(
      'scope_mismatch_suppression',
      loadedRecords.filter(record => [
        'active-exact-current',
        'active-other-project',
        'active-folder-beta'
      ].includes(record.memoryId))
    ));

    evidenceOutput.push(runTempLocalEvidence(
      'malformed_scope_fail_closed',
      loadedRecords.filter(record => record.memoryId === 'malformed-scope')
    ));

    const cleanupEvidence = runTempLocalEvidence(
      'sanitized_output_and_cleanup_verification',
      loadedRecords
    );
    evidenceOutput.push(cleanupEvidence);

    assert.equal(evidenceOutput.length, 4);
    assert.deepEqual(evidenceOutput.map(item => item.queryCount), [1, 1, 1, 1]);
    assert.equal(evidenceOutput.reduce((sum, item) => sum + item.queryCount, 0), 4);

    assert.deepEqual(evidenceOutput[0].acceptedCandidates.map(item => item.memoryId), ['active-exact-current']);
    assert.ok(evidenceOutput[1].suppressedCandidates.some(item => item.scopeMismatches.includes('projectId')));
    assert.ok(evidenceOutput[1].suppressedCandidates.some(item => item.scopeMismatches.includes('folder')));
    assert.ok(evidenceOutput[2].suppressedCandidates[0].blockers.includes('malformed_scope_metadata_excluded'));

    const serialized = JSON.stringify(evidenceOutput);
    assert.equal(serialized.includes('raw synthetic'), false);
    assert.equal(serialized.includes('jsonlLine'), false);
    assert.equal(serialized.includes('sourceFile'), false);
    for (const evidence of evidenceOutput) {
      assertZeroSideEffects(evidence);
    }
  } finally {
    fs.rmSync(workspace.root, { recursive: true, force: true });
    assert.equal(fs.existsSync(workspace.root), false);
  }
});
