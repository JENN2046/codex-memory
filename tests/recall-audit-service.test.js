const { test } = require('node:test');
const assert = require('node:assert/strict');

const { RecallAuditService } = require('../src/recall/RecallAuditService');

function createAuditHarness() {
  const appended = [];
  const service = new RecallAuditService({
    config: { embeddingFingerprint: 'cm-1294-fingerprint' },
    auditLogStore: {
      async appendRecallAudit(entry) {
        appended.push(entry);
      }
    }
  });

  return { service, appended };
}

test('recall audit normalizes snake-case scope audit fields without raw workspace id', async () => {
  const { service, appended } = createAuditHarness();

  const entry = await service.record({
    target: 'process',
    results: [{
      memoryId: 'cm-1294-memory',
      title: 'CM-1294 recall audit scope normalization',
      score: 0.7,
      source: 'fixture'
    }],
    scopeAudit: {
      scope_applied: true,
      scope_mode: 'sql-candidate+post-filter',
      scope_dimensions: ['project_id', 'workspace_id', 'client_id', 'visibility'],
      scope_strict: true,
      scope_project_id: 'project-cm-1294',
      scope_client_id: 'claude',
      scope_visibility: ['private'],
      scope_workspace_present: true,
      scope_workspace_id: 'raw-workspace-must-not-pass'
    }
  });

  assert.equal(appended.length, 1);
  assert.equal(entry.scopeApplied, true);
  assert.equal(entry.scopeMode, 'sql-candidate+post-filter');
  assert.deepEqual(entry.scopeDimensions, ['project_id', 'workspace_id', 'client_id', 'visibility']);
  assert.equal(entry.scopeStrict, true);
  assert.equal(entry.scopeProjectId, 'project-cm-1294');
  assert.equal(entry.scopeClientId, 'claude');
  assert.deepEqual(entry.scopeVisibility, ['private']);
  assert.equal(entry.scopeWorkspacePresent, true);
  assert.equal('scopeWorkspaceId' in entry, false);
  assert.equal(JSON.stringify(entry).includes('raw-workspace-must-not-pass'), false);
});

test('recall audit falls through blank memoryId to memory_id aliases', async () => {
  const { service, appended } = createAuditHarness();

  const entry = await service.record({
    target: 'process',
    results: [
      {
        memoryId: '   ',
        memory_id: 'cm-1306-snake-top',
        score: 0.7,
        matchedTags: ['audit']
      },
      {
        memoryId: '',
        memory_id: 'cm-1306-snake-second',
        score: 0.4
      }
    ]
  });

  assert.equal(appended.length, 1);
  assert.equal(entry.topMemoryId, 'cm-1306-snake-top');
  assert.deepEqual(entry.memoryIds, ['cm-1306-snake-top', 'cm-1306-snake-second']);
});

test('read policy recall audit normalizes snake-case scope audit fields', async () => {
  const { service, appended } = createAuditHarness();

  const entry = await service.recordReadPolicySummary({
    target: 'process',
    results: [{ memoryId: 'cm-1294-read-policy-memory' }],
    scopeAudit: {
      scope_applied: true,
      scope_mode: 'sql-candidate+post-filter',
      scope_dimensions: ['project_id', 'visibility'],
      scope_strict: false,
      scope_project_id: 'project-cm-1294',
      scope_client_id: 'codex',
      visibility: ['shared'],
      scope_workspace_present: false
    },
    policyAudit: {
      read_policy_applied: true,
      lifecycle_policy_applied: true,
      lifecycle_included_statuses: ['active', 'active', 'proposal'],
      lifecycle_excluded_statuses: ['tombstoned', 'superseded'],
      hidden_by_lifecycle_count: 2,
      stale_result_count: 1,
      lifecycle_column_available: true
    }
  });

  assert.equal(appended.length, 1);
  assert.equal(entry.recallType, 'read-policy');
  assert.equal(entry.scopeApplied, true);
  assert.equal(entry.scopeMode, 'sql-candidate+post-filter');
  assert.deepEqual(entry.scopeDimensions, ['project_id', 'visibility']);
  assert.equal(entry.scopeProjectId, 'project-cm-1294');
  assert.equal(entry.scopeClientId, 'codex');
  assert.deepEqual(entry.scopeVisibility, ['shared']);
  assert.equal(entry.scopeWorkspacePresent, false);
  assert.equal(entry.readPolicyApplied, true);
  assert.equal(entry.lifecyclePolicyApplied, true);
  assert.deepEqual(entry.lifecycleIncludedStatuses, ['active', 'proposal']);
  assert.deepEqual(entry.lifecycleExcludedStatuses, ['tombstoned', 'superseded']);
  assert.equal(entry.hiddenByLifecycleCount, 2);
  assert.equal(entry.staleResultCount, 1);
  assert.equal(entry.lifecycleColumnAvailable, true);
});

test('read policy recall audit falls through blank memoryId to memory_id aliases', async () => {
  const { service, appended } = createAuditHarness();

  const entry = await service.recordReadPolicySummary({
    target: 'process',
    results: [
      { memoryId: '   ', memory_id: 'cm-1306-read-policy-top' },
      { memoryId: '', memory_id: 'cm-1306-read-policy-second' }
    ],
    policyAudit: {
      readPolicyApplied: true,
      lifecyclePolicyApplied: true,
      lifecycleColumnAvailable: true
    }
  });

  assert.equal(appended.length, 1);
  assert.equal(entry.recallType, 'read-policy');
  assert.equal(entry.topMemoryId, 'cm-1306-read-policy-top');
  assert.deepEqual(entry.memoryIds, ['cm-1306-read-policy-top', 'cm-1306-read-policy-second']);
});
