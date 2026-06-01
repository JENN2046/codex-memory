const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
  computeCanonicalWriteHash,
  summarizeMemoryWriteLifecycleDedupSuppressionPreflight
} = require('../src/core/MemoryWriteLifecycleDedupSuppressionPreflight');

const allowedScope = Object.freeze({
  projectId: 'codex-memory',
  workspaceId: 'synthetic-write-governance-workspace',
  clientId: 'codex',
  taskId: 'CM-0836',
  conversationId: 'synthetic-governance-preflight',
  visibility: 'project',
  retentionPolicy: 'keep'
});

function baseWrite(overrides = {}) {
  return {
    target: 'process',
    title: 'CM-0836 checkpoint',
    content: 'checkpoint: bounded lifecycle dedup suppression preflight covers synthetic write governance.',
    evidence: 'synthetic fixture evidence only; no real memory scan.',
    tags: ['cm-0836', 'write-reliability'],
    ...allowedScope,
    ...overrides
  };
}

test('CM-0836 accepts clean synthetic write preflight without side effects', () => {
  const proposedWrite = baseWrite();
  const summary = summarizeMemoryWriteLifecycleDedupSuppressionPreflight({
    proposedWrite,
    allowedScope,
    existingCandidates: []
  });

  assert.equal(summary.schemaVersion, 'memory-write-lifecycle-dedup-suppression-preflight-v1');
  assert.equal(summary.sourceMode, 'explicit_input');
  assert.equal(summary.decision, 'accepted_for_bounded_write_preflight');
  assert.equal(summary.acceptedForWritePreflight, true);
  assert.equal(summary.runtimeIntegrated, false);
  assert.equal(summary.mutated, false);
  assert.equal(summary.publicMcpExpanded, false);
  assert.equal(summary.canonicalHash, computeCanonicalWriteHash(proposedWrite));
  assert.deepEqual(summary.blockers, []);
  assert.deepEqual(summary.matchedCandidateIds, []);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.scansRealMemory, false);
  assert.equal(summary.safety.callsProviders, false);
  assert.equal(summary.safety.writesDurableMemory, false);
  assert.equal(summary.safety.writesAudit, false);
  assert.equal(summary.safety.readinessClaimed, false);
});

test('CM-0836 suppresses duplicate active synthetic memory in same scope', () => {
  const proposedWrite = baseWrite();
  const summary = summarizeMemoryWriteLifecycleDedupSuppressionPreflight({
    proposedWrite,
    allowedScope,
    existingCandidates: [
      {
        memoryId: 'synthetic-active-duplicate',
        lifecycleStatus: 'active',
        ...proposedWrite
      }
    ]
  });

  assert.equal(summary.decision, 'duplicate_suppressed');
  assert.equal(summary.acceptedForWritePreflight, false);
  assert.ok(summary.blockers.includes('duplicate_active_memory_suppressed'));
  assert.deepEqual(summary.matchedCandidateIds, ['synthetic-active-duplicate']);
});

test('CM-1340 normalizes existing candidate id and hash aliases before dedup matching', () => {
  const proposedWrite = baseWrite();
  const summary = summarizeMemoryWriteLifecycleDedupSuppressionPreflight({
    proposedWrite,
    allowedScope,
    existingCandidates: [
      {
        ...proposedWrite,
        memoryId: '   ',
        memory_id: 'synthetic-existing-alias-duplicate',
        canonicalHash: '',
        canonical_hash: computeCanonicalWriteHash(proposedWrite),
        lifecycleStatus: 'active'
      }
    ]
  });

  assert.equal(summary.decision, 'duplicate_suppressed');
  assert.ok(summary.blockers.includes('duplicate_active_memory_suppressed'));
  assert.deepEqual(summary.matchedCandidateIds, ['synthetic-existing-alias-duplicate']);
});

test('CM-1341 normalizes scope aliases before duplicate matching', () => {
  const proposedWrite = {
    ...baseWrite(),
    projectId: '   ',
    project_id: allowedScope.projectId,
    workspaceId: '',
    workspace_id: allowedScope.workspaceId,
    clientId: '   ',
    client_id: allowedScope.clientId,
    taskId: '',
    task_id: allowedScope.taskId,
    conversationId: '   ',
    conversation_id: allowedScope.conversationId,
    visibility: allowedScope.visibility,
    retentionPolicy: '',
    retention_policy: allowedScope.retentionPolicy
  };
  const existingCandidate = {
    ...proposedWrite,
    memoryId: 'synthetic-scope-alias-duplicate',
    lifecycleStatus: 'active',
    projectId: '',
    project_id: allowedScope.projectId,
    workspaceId: '   ',
    workspace_id: allowedScope.workspaceId,
    clientId: '',
    client_id: allowedScope.clientId,
    taskId: '   ',
    task_id: allowedScope.taskId,
    conversationId: '',
    conversation_id: allowedScope.conversationId,
    visibility: allowedScope.visibility,
    retentionPolicy: '   ',
    retention_policy: allowedScope.retentionPolicy
  };

  const summary = summarizeMemoryWriteLifecycleDedupSuppressionPreflight({
    proposedWrite,
    allowedScope,
    existingCandidates: [existingCandidate]
  });

  assert.equal(summary.decision, 'duplicate_suppressed');
  assert.deepEqual(summary.scopeMismatches, []);
  assert.deepEqual(summary.matchedCandidateIds, ['synthetic-scope-alias-duplicate']);
});

test('CM-1342 normalizes lifecycle status and action aliases before preflight decisions', () => {
  const proposedWrite = {
    ...baseWrite(),
    lifecycleStatus: '   ',
    lifecycle_status: 'active',
    lifecycleAction: '',
    lifecycle_action: 'create'
  };
  const existingCandidate = {
    ...proposedWrite,
    memoryId: 'synthetic-lifecycle-alias-duplicate',
    lifecycleStatus: '',
    lifecycle_status: 'active'
  };

  const summary = summarizeMemoryWriteLifecycleDedupSuppressionPreflight({
    proposedWrite,
    allowedScope,
    existingCandidates: [existingCandidate]
  });

  assert.equal(summary.decision, 'duplicate_suppressed');
  assert.equal(summary.blockers.includes('terminal_lifecycle_status_cannot_be_written_as_active_memory'), false);
  assert.deepEqual(summary.matchedCandidateIds, ['synthetic-lifecycle-alias-duplicate']);
});

test('CM-1343 normalizes lifecycle target memory id aliases before required-id gating', () => {
  const cases = [
    {
      action: 'supersede',
      blankCamelField: 'supersedesMemoryId',
      snakeField: 'supersedes_memory_id',
      blocker: 'supersession_requires_old_memory_id'
    },
    {
      action: 'tombstone',
      blankCamelField: 'tombstoneMemoryId',
      snakeField: 'tombstone_memory_id',
      blocker: 'tombstone_requires_memory_id'
    },
    {
      action: 'forget',
      blankCamelField: 'forgetMemoryId',
      snakeField: 'forget_memory_id',
      blocker: 'forget_requires_memory_id'
    }
  ];

  for (const fixture of cases) {
    const proposedWrite = {
      ...baseWrite(),
      lifecycleAction: '   ',
      lifecycle_action: fixture.action,
      reason: `synthetic ${fixture.action} target`,
      [fixture.blankCamelField]: '   ',
      [fixture.snakeField]: `synthetic-${fixture.action}-target-memory`
    };

    const summary = summarizeMemoryWriteLifecycleDedupSuppressionPreflight({
      proposedWrite,
      allowedScope,
      exactApproval: true,
      existingCandidates: []
    });

    assert.equal(summary.decision, 'accepted_for_bounded_write_preflight');
    assert.equal(summary.acceptedForWritePreflight, true);
    assert.equal(summary.blockers.includes(fixture.blocker), false);
  }
});

test('CM-0836 requires review for duplicate terminal lifecycle synthetic memory', () => {
  const proposedWrite = baseWrite();
  const summary = summarizeMemoryWriteLifecycleDedupSuppressionPreflight({
    proposedWrite,
    allowedScope,
    existingCandidates: [
      {
        memoryId: 'synthetic-tombstoned-duplicate',
        lifecycleStatus: 'tombstoned',
        ...proposedWrite
      }
    ]
  });

  assert.equal(summary.decision, 'rejected_by_write_lifecycle_preflight');
  assert.equal(summary.acceptedForWritePreflight, false);
  assert.ok(summary.blockers.includes('duplicate_terminal_lifecycle_memory_requires_review'));
  assert.deepEqual(summary.matchedCandidateIds, ['synthetic-tombstoned-duplicate']);
});

test('CM-0836 rejects scope mismatch before write preflight acceptance', () => {
  const summary = summarizeMemoryWriteLifecycleDedupSuppressionPreflight({
    proposedWrite: baseWrite({ projectId: 'other-project', taskId: 'CM-OTHER' }),
    allowedScope,
    existingCandidates: []
  });

  assert.equal(summary.decision, 'scope_mismatch_rejected');
  assert.equal(summary.acceptedForWritePreflight, false);
  assert.ok(summary.blockers.includes('scope_mismatch_rejected'));
  assert.deepEqual(summary.scopeMismatches, ['projectId', 'taskId']);
});

test('CM-0836 falls through blank camel-case write fields to snake-case fallbacks', () => {
  const proposedWrite = {
    ...baseWrite(),
    projectId: '   ',
    project_id: allowedScope.projectId,
    workspaceId: '   ',
    workspace_id: allowedScope.workspaceId,
    clientId: '   ',
    client_id: allowedScope.clientId,
    taskId: '   ',
    task_id: allowedScope.taskId,
    conversationId: '   ',
    conversation_id: allowedScope.conversationId,
    retentionPolicy: '   ',
    retention_policy: allowedScope.retentionPolicy,
    lifecycleStatus: '   ',
    lifecycle_status: 'active',
    lifecycleAction: '   ',
    lifecycle_action: 'supersede',
    reason: 'synthetic correction',
    supersedesMemoryId: '   ',
    supersedes_memory_id: 'synthetic-old-memory'
  };
  const summary = summarizeMemoryWriteLifecycleDedupSuppressionPreflight({
    proposedWrite,
    allowedScope,
    exactApproval: true,
    existingCandidates: [
      {
        ...proposedWrite,
        memoryId: '   ',
        memory_id: 'synthetic-existing-snake-id',
        lifecycleStatus: 'tombstoned',
        canonicalHash: '   ',
        canonical_hash: computeCanonicalWriteHash(proposedWrite)
      }
    ]
  });

  assert.equal(summary.decision, 'rejected_by_write_lifecycle_preflight');
  assert.equal(summary.acceptedForWritePreflight, false);
  assert.deepEqual(summary.scopeMismatches, []);
  assert.equal(summary.blockers.includes('supersession_requires_old_memory_id'), false);
  assert.ok(summary.blockers.includes('duplicate_terminal_lifecycle_memory_requires_review'));
  assert.deepEqual(summary.matchedCandidateIds, ['synthetic-existing-snake-id']);
});

test('CM-0836 rejects synthetic secret-like pollution without durable writes', () => {
  const summary = summarizeMemoryWriteLifecycleDedupSuppressionPreflight({
    proposedWrite: baseWrite({
      content: 'checkpoint: api_key = ABCDEFGH12345678 must never enter memory.'
    }),
    allowedScope,
    existingCandidates: []
  });

  assert.equal(summary.decision, 'pollution_rejected');
  assert.equal(summary.acceptedForWritePreflight, false);
  assert.equal(summary.safety.writesDurableMemory, false);
  assert.equal(summary.safety.writesAudit, false);
  assert.ok(summary.blockers.some(blocker => blocker.startsWith('pollution_rejected:')));
});

test('CM-0836 rejects schema metadata and ignores non-string tag noise', () => {
  const summary = summarizeMemoryWriteLifecycleDedupSuppressionPreflight({
    proposedWrite: baseWrite({
      tags: ['cm-0836', null, '', 'write-reliability'],
      schema_version: 'unexpected-runtime-override'
    }),
    allowedScope,
    existingCandidates: []
  });
  const cleanHash = computeCanonicalWriteHash(baseWrite({
    tags: ['cm-0836', 'write-reliability'],
    schema_version: 'unexpected-runtime-override'
  }));

  assert.equal(summary.decision, 'rejected_by_write_lifecycle_preflight');
  assert.equal(summary.acceptedForWritePreflight, false);
  assert.ok(summary.blockers.includes('schema_version_metadata_rejected'));
  assert.equal(summary.canonicalHash, cleanHash);
});

test('CM-0836 gates lifecycle actions on exact approval and required ids', () => {
  const supersedeWithoutApproval = summarizeMemoryWriteLifecycleDedupSuppressionPreflight({
    proposedWrite: baseWrite({
      lifecycleAction: 'supersede',
      reason: 'synthetic correction'
    }),
    allowedScope,
    existingCandidates: []
  });
  const supersedeWithApproval = summarizeMemoryWriteLifecycleDedupSuppressionPreflight({
    proposedWrite: baseWrite({
      lifecycleAction: 'supersede',
      reason: 'synthetic correction',
      supersedesMemoryId: 'synthetic-old-memory'
    }),
    allowedScope,
    exactApproval: true,
    existingCandidates: []
  });

  assert.equal(supersedeWithoutApproval.decision, 'exact_approval_required');
  assert.ok(supersedeWithoutApproval.blockers.includes('lifecycle_action_requires_exact_approval'));
  assert.ok(supersedeWithoutApproval.blockers.includes('supersession_requires_old_memory_id'));
  assert.equal(supersedeWithApproval.decision, 'accepted_for_bounded_write_preflight');
  assert.equal(supersedeWithApproval.acceptedForWritePreflight, true);
});

test('CM-0836 helper does not perform implicit filesystem reads', () => {
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = () => {
    throw new Error('unexpected fs read during write lifecycle preflight');
  };

  try {
    const summary = summarizeMemoryWriteLifecycleDedupSuppressionPreflight({
      proposedWrite: baseWrite(),
      allowedScope,
      existingCandidates: []
    });

    assert.equal(summary.decision, 'accepted_for_bounded_write_preflight');
    assert.equal(summary.safety.readsFiles, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
});
