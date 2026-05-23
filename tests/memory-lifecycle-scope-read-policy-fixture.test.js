const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
  filterRecallCandidatesByLifecycleScope
} = require('../src/core/MemoryLifecycleScopeGovernanceContract');

const exactScope = Object.freeze({
  userId: 'synthetic-user',
  projectId: 'codex-memory',
  workspaceId: 'synthetic-read-policy-workspace',
  clientId: 'codex',
  agentId: 'codex-agent',
  taskId: 'CM-0845',
  conversationId: 'synthetic-read-policy',
  folder: 'alpha',
  visibility: 'project',
  retentionPolicy: 'keep'
});

function candidate(memoryId, overrides = {}) {
  return {
    memoryId,
    lifecycleStatus: 'active',
    rankHint: `rank-${memoryId}`,
    scope: exactScope,
    content: `raw synthetic content for ${memoryId}`,
    title: `raw synthetic title for ${memoryId}`,
    snippet: `raw synthetic snippet for ${memoryId}`,
    ...overrides
  };
}

test('CM-0845 keeps only active exact-scope candidates in normal recall output', () => {
  const result = filterRecallCandidatesByLifecycleScope({
    currentScope: exactScope,
    candidates: [
      candidate('active-exact-1'),
      candidate('proposal-1', { lifecycleStatus: 'proposal' }),
      candidate('tombstoned-1', { lifecycleStatus: 'tombstoned' }),
      candidate('out-of-scope-1', {
        scope: {
          ...exactScope,
          projectId: 'other-project'
        }
      })
    ]
  });

  assert.equal(result.schemaVersion, 'memory-lifecycle-scope-governance-contract-v1');
  assert.equal(result.readPolicyMode, 'normal_recall');
  assert.equal(result.acceptedCount, 1);
  assert.equal(result.suppressedCount, 3);
  assert.deepEqual(result.acceptedCandidates.map(item => item.memoryId), ['active-exact-1']);
  assert.deepEqual(result.suppressedCandidates.map(item => item.memoryId), [
    'proposal-1',
    'tombstoned-1',
    'out-of-scope-1'
  ]);
});

test('CM-0845 sanitized metadata excludes raw candidate content fields', () => {
  const result = filterRecallCandidatesByLifecycleScope({
    currentScope: exactScope,
    candidates: [
      candidate('forgotten-raw', {
        lifecycleStatus: 'forgotten',
        content: 'raw private synthetic content should not appear',
        text: 'raw private synthetic text should not appear',
        title: 'raw private synthetic title should not appear',
        snippet: 'raw private synthetic snippet should not appear'
      })
    ]
  });
  const serialized = JSON.stringify(result.sanitizedAuditMetadata);

  assert.equal(result.rawContentExposed, false);
  assert.equal(serialized.includes('raw private synthetic'), false);
  assert.deepEqual(Object.keys(result.sanitizedAuditMetadata[0]).sort(), [
    'blockers',
    'decision',
    'lifecycleStatus',
    'memoryId',
    'scopeMismatches'
  ]);
});

test('CM-0845 explains suppressed lifecycle and scope blockers', () => {
  const result = filterRecallCandidatesByLifecycleScope({
    currentScope: exactScope,
    candidates: [
      candidate('preflight-rejected-1', { lifecycleStatus: 'preflight_rejected' }),
      candidate('malformed-scope-1', { malformedScope: true }),
      candidate('scope-drift-1', {
        scope: {
          ...exactScope,
          agentId: 'other-agent',
          folder: 'beta'
        }
      })
    ]
  });

  const [preflight, malformed, drift] = result.suppressedCandidates;

  assert.ok(preflight.blockers.includes('lifecycle_preflight_rejected_excluded_from_normal_recall'));
  assert.ok(malformed.blockers.includes('malformed_scope_metadata_excluded'));
  assert.ok(drift.blockers.includes('scope_mismatch_excluded'));
  assert.deepEqual(drift.scopeMismatches, ['agentId', 'folder']);
});

test('CM-0845 fails closed when current scope is incomplete', () => {
  const result = filterRecallCandidatesByLifecycleScope({
    currentScope: {
      ...exactScope,
      taskId: ''
    },
    candidates: [
      candidate('active-exact-1')
    ]
  });

  assert.equal(result.acceptedCount, 0);
  assert.equal(result.suppressedCount, 1);
  assert.ok(result.suppressedCandidates[0].blockers.includes('current_scope_incomplete_fail_closed'));
});

test('CM-0845 read-policy fixture has zero side-effect counters', () => {
  const result = filterRecallCandidatesByLifecycleScope({
    currentScope: exactScope,
    candidates: [
      candidate('active-exact-1'),
      candidate('excluded-1', { lifecycleStatus: 'excluded' })
    ]
  });

  assert.equal(result.durableMutationExecuted, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.safety.readsFiles, false);
  assert.equal(result.safety.scansRealMemory, false);
  assert.equal(result.safety.readsJsonl, false);
  assert.equal(result.safety.callsProviders, false);
  assert.equal(result.safety.writesDurableMemory, false);
  assert.equal(result.safety.writesAudit, false);
  assert.equal(result.safety.appliesCleanup, false);
  assert.equal(result.safety.appliesRollback, false);
  assert.equal(result.safety.expandsPublicMcp, false);
  assert.equal(result.safety.readinessClaimed, false);
});

test('CM-0845 helper does not perform filesystem reads', () => {
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = () => {
    throw new Error('unexpected fs read during lifecycle scope read policy fixture');
  };

  try {
    const result = filterRecallCandidatesByLifecycleScope({
      currentScope: exactScope,
      candidates: [candidate('active-exact-1')]
    });

    assert.equal(result.acceptedCount, 1);
    assert.equal(result.safety.readsFiles, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
});
