const { test } = require('node:test');
const assert = require('node:assert/strict');
const fsPromises = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  FAMILY_SURFACES,
  PUBLIC_MCP_TOOLS
} = require('../src/core/DeferredGovernanceMutationPlanningService');

async function withApp(overrides = {}, handler) {
  const tempBasePath = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'codex-memory-deferred-governance-app-entry-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data'),
    ...overrides
  });

  await app.initialize();

  try {
    await handler({ app, tempBasePath });
  } finally {
    await app.close();
    await fsPromises.rm(tempBasePath, { recursive: true, force: true });
  }
}

function publicToolNames() {
  return TOOL_DEFINITIONS.map(tool => tool.name).sort();
}

function runtimeSurface(overrides = {}) {
  return {
    suppressionProjectionPreviewAvailable: true,
    appendOnlyAuditPreviewAvailable: true,
    governanceRevisionPreviewAvailable: true,
    changedMemoryIdsPreviewAvailable: true,
    candidateCacheInvalidationPreviewAvailable: true,
    readPolicySuppressionPreviewAvailable: true,
    rollbackCleanupPreviewAvailable: true,
    publicToolsFrozen: true,
    publicTools: PUBLIC_MCP_TOOLS,
    ...overrides
  };
}

function approvedContext(family, overrides = {}) {
  const surface = FAMILY_SURFACES[family];
  return {
    executionContext: {
      requestSource: surface.requestSource,
      [surface.contextFlag]: true,
      clientId: 'codex',
      ...overrides
    }
  };
}

function excludePayload(overrides = {}) {
  return {
    memory_id: 'memory-exclude-app-entry-001',
    scope_tuple: {
      project_id: 'project-cm-0927',
      workspace_id: 'workspace-cm-0927',
      client_id: 'codex',
      visibility: 'project'
    },
    approval_id: 'CM-0927-exclude-approval',
    reason: 'exclude through app-level internal runtime entry',
    evidence_summary: 'CM-0927 fixture evidence for exclude app-level entry',
    audit_correlation_id: 'CM-0927-exclude-correlation',
    ...overrides
  };
}

function forgetPayload(overrides = {}) {
  return {
    target_memory_ids: ['memory-forget-app-entry-001'],
    scopeTuple: {
      projectId: 'project-cm-0927',
      workspaceId: 'workspace-cm-0927',
      clientId: 'codex',
      visibility: 'project'
    },
    approvalId: 'CM-0927-forget-approval',
    reason: 'forget through app-level internal runtime entry',
    evidenceSummary: 'CM-0927 fixture evidence for forget app-level entry',
    auditCorrelationId: 'CM-0927-forget-correlation',
    ...overrides
  };
}

test('CM-0927 app exposes deferred governance adapter service without public MCP expansion', async () => {
  await withApp({}, async ({ app }) => {
    assert.ok(app.services.deferredGovernanceRuntimeEntryAdapter);
    assert.equal(typeof app.executeInternalMemoryExclude, 'function');
    assert.equal(typeof app.executeInternalMemoryForget, 'function');
    assert.equal(typeof app.previewInternalMemoryExcludeApplyPlan, 'function');
    assert.equal(typeof app.previewInternalMemoryForgetApplyPlan, 'function');
    assert.deepEqual(publicToolNames(), ['audit_memory', 'memory_overview', 'record_memory', 'search_memory']);
    await assert.rejects(
      () => app.callTool('memory_exclude', {}, approvedContext('memory_exclude')),
      /Unknown tool: memory_exclude/
    );
    await assert.rejects(
      () => app.callTool('memory_forget', {}, approvedContext('memory_forget')),
      /Unknown tool: memory_forget/
    );
  });
});

test('CM-0931 app-level apply-plan preview entries are default-disabled and side-effect-free', async () => {
  await withApp({}, async ({ app }) => {
    const result = await app.previewInternalMemoryExcludeApplyPlan(
      {
        ...excludePayload(),
        runtimeSurfaceCapabilities: runtimeSurface()
      },
      approvedContext('memory_exclude')
    );

    assert.equal(result.success, false);
    assert.equal(result.decision, 'rejected');
    assert.equal(result.entryName, 'previewInternalMemoryExcludeApplyPlan');
    assert.match(result.reason, /disabled/i);
    assert.equal(result.applyPlanPreviewCandidate, true);
    assert.equal(result.mutated, false);
    assert.equal(result.runtimeEntryMounted, false);
    assert.equal(result.runtimeApplyBlocked, true);
    assert.equal(result.publicMcpExpanded, false);
    assert.deepEqual(publicToolNames(), ['audit_memory', 'memory_overview', 'record_memory', 'search_memory']);
  });
});

test('CM-0931 app-level apply-plan preview routes enabled approved calls without durable apply', async () => {
  await withApp({
    internalMemoryExcludeApplyPlanPreviewEnabled: true,
    internalMemoryForgetApplyPlanPreviewEnabled: true
  }, async ({ app }) => {
    const exclude = await app.previewInternalMemoryExcludeApplyPlan(
      {
        ...excludePayload(),
        runtimeSurfaceCapabilities: runtimeSurface(),
        plannedAt: '2026-05-24T13:10:00.000Z'
      },
      approvedContext('memory_exclude')
    );
    const forget = await app.previewInternalMemoryForgetApplyPlan(
      {
        ...forgetPayload(),
        runtimeSurfaceCapabilities: runtimeSurface(),
        plannedAt: '2026-05-24T13:15:00.000Z'
      },
      approvedContext('memory_forget')
    );

    assert.equal(exclude.success, true);
    assert.equal(exclude.acceptedForApplyPlanPreview, true);
    assert.equal(exclude.entryName, 'previewInternalMemoryExcludeApplyPlan');
    assert.equal(exclude.family, 'memory_exclude');
    assert.equal(exclude.runtimeEntryMounted, false);
    assert.equal(exclude.executionApproved, false);
    assert.equal(exclude.runtimeApplyBlocked, true);
    assert.equal(exclude.mutated, false);
    assert.equal(exclude.durableAuditWritten, false);
    assert.equal(exclude.durableProjectionApplied, false);
    assert.equal(exclude.candidateCacheCleared, false);
    assert.equal(exclude.publicMcpExpanded, false);
    assert.equal(exclude.readinessClaimed, false);
    assert.deepEqual(exclude.applyPlanPreview.changedMemoryIds, ['memory-exclude-app-entry-001']);

    assert.equal(forget.success, true);
    assert.equal(forget.family, 'memory_forget');
    assert.equal(forget.entryName, 'previewInternalMemoryForgetApplyPlan');
    assert.deepEqual(forget.applyPlanPreview.projectionPreview.projectedStates, [
      'forgotten',
      'governance_suppressed'
    ]);
    assert.equal(forget.applyPlanPreview.auditPreview.durableAuditWritten, false);
    assert.deepEqual(publicToolNames(), ['audit_memory', 'memory_overview', 'record_memory', 'search_memory']);
  });
});

test('CM-0927 app-level memory_exclude entry is default-disabled and side-effect-free', async () => {
  await withApp({}, async ({ app }) => {
    const result = await app.executeInternalMemoryExclude(
      excludePayload(),
      approvedContext('memory_exclude')
    );

    assert.equal(result.success, false);
    assert.equal(result.decision, 'rejected');
    assert.match(result.reason, /disabled/i);
    assert.equal(result.entryName, 'executeInternalMemoryExclude');
    assert.equal(result.mutated, false);
    assert.equal(result.runtimeEntryMounted, false);
    assert.equal(result.runtimeApplyBlocked, true);
    assert.equal(result.publicMcpExpanded, false);
  });
});

test('CM-0927 app-level memory_forget entry rejects missing approved context', async () => {
  await withApp({
    internalMemoryForgetRuntimeEntryEnabled: true
  }, async ({ app }) => {
    const result = await app.executeInternalMemoryForget(forgetPayload(), {
      executionContext: {
        requestSource: 'wrong-source',
        internalMemoryForgetRuntimeEntry: true,
        clientId: 'codex'
      }
    });

    assert.equal(result.success, false);
    assert.equal(result.decision, 'rejected');
    assert.match(result.reason, /approved internal execution context/i);
    assert.equal(result.mutated, false);
    assert.equal(result.runtimeIntegrated, false);
  });
});

test('CM-0927 app-level entries route enabled approved calls to dry-run planning only', async () => {
  await withApp({
    internalMemoryExcludeRuntimeEntryEnabled: true,
    internalMemoryForgetRuntimeEntryEnabled: true
  }, async ({ app }) => {
    const exclude = await app.executeInternalMemoryExclude(
      excludePayload(),
      approvedContext('memory_exclude')
    );
    const forget = await app.executeInternalMemoryForget(
      forgetPayload(),
      approvedContext('memory_forget')
    );

    assert.equal(exclude.success, true);
    assert.equal(exclude.decision, 'dry-run');
    assert.equal(exclude.family, 'memory_exclude');
    assert.equal(exclude.runtimeEntryCandidate, true);
    assert.equal(exclude.runtimeEntryMounted, false);
    assert.equal(exclude.mutated, false);
    assert.deepEqual(exclude.targetMemoryIds, ['memory-exclude-app-entry-001']);

    assert.equal(forget.success, true);
    assert.equal(forget.decision, 'dry-run');
    assert.equal(forget.family, 'memory_forget');
    assert.equal(forget.runtimeEntryCandidate, true);
    assert.equal(forget.runtimeEntryMounted, false);
    assert.equal(forget.mutated, false);
    assert.deepEqual(forget.targetMemoryIds, ['memory-forget-app-entry-001']);
  });
});

test('CM-0927 app-level entries still reject runtime apply attempts', async () => {
  await withApp({
    internalMemoryExcludeRuntimeEntryEnabled: true
  }, async ({ app }) => {
    const result = await app.executeInternalMemoryExclude(
      excludePayload({
        dry_run: false,
        confirm: true
      }),
      approvedContext('memory_exclude')
    );

    assert.equal(result.success, false);
    assert.equal(result.decision, 'rejected');
    assert.equal(result.dryRun, false);
    assert.equal(result.mutated, false);
    assert.equal(result.runtimeApplyBlocked, true);
    assert.match(result.reason, /runtime apply is blocked/);
  });
});
