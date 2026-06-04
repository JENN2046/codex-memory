const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const { CompatibilitySyntaxAdapter } = require('../src/adapters/vcp-passive-memory/CompatibilitySyntaxAdapter');
const { TOOL_DEFINITIONS } = require('../src/core/constants');

async function withApp(handler, overrides = {}) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-phase-a-'));
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
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
}

function codexExecutionContext(overrides = {}) {
  return {
    agentAlias: 'Codex',
    agentId: 'codex-desktop',
    requestSource: 'phase-a-test',
    ...overrides
  };
}

function writePreflightPayload(overrides = {}) {
  return {
    target: 'process',
    title: 'Checkpoint: phase-a write preflight app wiring',
    content: [
      'Checkpoint: phase-a app wiring proof for write preflight.',
      'Purpose: keep default preflight disabled while allowing exact-scope internal wiring.',
      'Boundary: local temp app only; no provider, no readiness claim.'
    ].join('\n'),
    evidence: 'phase-a write preflight app wiring evidence',
    validated: true,
    reusable: false,
    sensitivity: 'none',
    tags: ['phase-a', 'write-preflight'],
    project_id: 'codex-memory',
    workspace_id: 'phase-a-write-preflight-workspace',
    client_id: 'codex',
    task_id: 'CM-0892',
    conversation_id: 'phase-a-write-preflight-app-wiring',
    visibility: 'project',
    retention_policy: 'keep',
    ...overrides
  };
}

test('record_memory should reject non-Codex writes', async () => {
  await withApp(async ({ app }) => {
    const result = await app.callTool('record_memory', {
      target: 'process',
      title: 'Checkpoint',
      content: 'checkpoint',
      evidence: 'evidence',
      validated: true,
      reusable: false,
      sensitivity: 'none'
    }, {
      executionContext: {
        agentAlias: 'Claude',
        agentId: 'claude-desktop',
        requestSource: 'wrong-agent'
      }
    });

    assert.equal(result.decision, 'rejected');
    assert.match(result.reason, /CodexMemoryBridge/);
  });
});

test('record_memory should not accept payload-supplied execution context', async () => {
  await withApp(async ({ app }) => {
    const result = await app.callTool('record_memory', {
      target: 'process',
      title: 'Checkpoint: payload execution context spoof',
      content: [
        'Checkpoint: payload execution context must not authenticate record_memory.',
        'Boundary: local fixture only; no provider, no readiness claim.'
      ].join('\n'),
      evidence: 'phase-a payload execution context spoof regression',
      validated: true,
      reusable: false,
      sensitivity: 'none',
      __executionContext: {
        agentAlias: 'Codex',
        agentId: 'codex-desktop',
        requestSource: 'payload-spoof'
      }
    });

    assert.equal(result.decision, 'rejected');
    assert.match(result.reason, /CodexMemoryBridge/);
    assert.equal(result.agentAlias, null);
    assert.notEqual(result.requestSource, 'payload-spoof');
  });
});

test('execution context resolver falls through blank camel-case scope to snake-case scope', async () => {
  await withApp(async ({ app }) => {
    const result = await app.callTool('record_memory', {
      target: 'process',
      title: 'Checkpoint: blank camel scope fallback',
      content: [
        'Checkpoint: execution context resolver must not let blank camel-case scope mask snake-case scope.',
        'Boundary: local fixture only; no provider, no readiness claim.'
      ].join('\n'),
      evidence: 'phase-a blank camel scope fallback regression',
      validated: true,
      reusable: false,
      sensitivity: 'none'
    }, {
      executionContext: {
        agentAlias: 'Codex',
        agentId: 'codex-desktop',
        requestSource: 'phase-a-blank-camel-scope-test',
        projectId: '   ',
        project_id: 'snake-project',
        workspaceId: '   ',
        workspace_id: 'snake-workspace',
        clientId: '   ',
        client_id: 'claude',
        taskId: '   ',
        task_id: 'CM-BLANK-CAMEL',
        conversationId: '   ',
        conversation_id: 'snake-conversation',
        visibility: '   ',
        visibility_policy: 'private',
        retentionPolicy: '   ',
        retention_policy: 'snake-retention'
      }
    });

    assert.equal(result.decision, 'accepted');
    const stored = await app.stores.shadowStore.getRecord(result.memoryId);
    assert.equal(stored.projectId, 'snake-project');
    assert.equal(stored.workspaceId, 'snake-workspace');
    assert.equal(stored.clientId, 'claude');
    assert.equal(stored.taskId, 'CM-BLANK-CAMEL');
    assert.equal(stored.conversationId, 'snake-conversation');
    assert.equal(stored.visibility, 'private');
    assert.equal(stored.retentionPolicy, 'snake-retention');
  });
});

test('shadow write failure should degrade but not reject after diary write', async () => {
  await withApp(async ({ app }) => {
    const originalUpsert = app.stores.shadowStore.upsertRecord.bind(app.stores.shadowStore);
    app.stores.shadowStore.upsertRecord = async () => {
      throw new Error('sqlite unavailable');
    };

    const result = await app.callTool('record_memory', {
      target: 'process',
      title: 'Checkpoint',
      content: 'stage-conclusion: keep writing\ncheckpoint',
      evidence: 'simulated failure',
      validated: true,
      reusable: false,
      sensitivity: 'none'
    }, {
      executionContext: {
        agentAlias: 'Codex',
        agentId: 'codex-desktop',
        requestSource: 'phase-a-test'
      }
    });

    assert.equal(result.decision, 'accepted');
    assert.equal(result.shadowWrite.status, 'degraded');

    const reconcileTasks = await app.stores.shadowStore.listReconcileTasks();
    assert.equal(reconcileTasks.length, 1);

    app.stores.shadowStore.upsertRecord = originalUpsert;
  });
});

test('rebuildShadowFromDiary should index existing diary files', async () => {
  await withApp(async ({ app, tempBasePath }) => {
    const diaryDir = path.join(tempBasePath, 'dailynote', 'Codex');
    await fs.mkdir(diaryDir, { recursive: true });
    await fs.writeFile(
      path.join(diaryDir, '2026-04-13-00_00_01-Checkpoint.txt'),
      [
        '[2026-04-13] - Codex',
        'Title: Restored checkpoint',
        'Memory-ID: codex-process-existing',
        'Record-Type: process',
        'Validated: yes',
        'Reusable: no',
        '',
        'Content:',
        'checkpoint restored from old diary',
        '',
        'Evidence:',
        'migration test',
        '',
        'Tag: restore, migration'
      ].join('\n'),
      'utf8'
    );

    const rebuild = await app.rebuildShadowFromDiary();
    assert.equal(rebuild.recordCount, 1);

    const stored = await app.stores.shadowStore.getRecord('codex-process-existing');
    assert.equal(stored.title, 'Restored checkpoint');
  });
});

test('CompatibilitySyntaxAdapter should parse passive blocks and directives', () => {
  const adapter = new CompatibilitySyntaxAdapter();
  const parsed = adapter.parse('[[checkpoint migration]] ::Time(7d) ::Rerank+0.7 ::TagMemo+1.2 <<topic memory>>');
  assert.equal(parsed.query, 'checkpoint migration');
  assert.equal(parsed.directives.time, '7d');
  assert.equal(parsed.directives.rerank, true);
  assert.equal(parsed.directives.rerankplus, 0.7);
  assert.equal(parsed.directives.tagmemo, 1.2);
  assert.equal(parsed.directives.geodesicrerank, true);
  assert.deepEqual(parsed.activeBlocks, ['topic memory']);
});

test('app should expose internal tombstone service without expanding public MCP tools', async () => {
  await withApp(async ({ app }) => {
    const result = await app.services.tombstoneMemoryService.tombstone({
      memory_id: 'missing-memory',
      reason: 'retire nonexistent fixture candidate',
      evidence: 'phase-a internal service smoke',
      tombstone_reason: 'retention-expired',
      actor_client_id: 'codex',
      request_source: 'phase-a-service-test'
    });

    assert.ok(app.services.tombstoneMemoryService);
    assert.equal(typeof app.services.tombstoneMemoryService.tombstone, 'function');
    assert.equal(result.decision, 'rejected');
    assert.match(result.reason, /memory not found/i);
    assert.deepEqual(
      TOOL_DEFINITIONS.map(tool => tool.name).sort(),
      ['audit_memory', 'memory_overview', 'record_memory', 'search_memory']
    );
  });
});

test('app should expose internal supersede service without expanding public MCP tools', async () => {
  await withApp(async ({ app }) => {
    const result = await app.services.supersedeMemoryService.supersede({
      old_memory_id: 'missing-old-memory',
      new_memory_id: 'missing-new-memory',
      reason: 'retire obsolete candidate in favor of a replacement',
      evidence: 'phase-a internal supersede service smoke',
      supersedes_link: 'missing-old-memory',
      superseded_by_link: 'missing-new-memory',
      actor_client_id: 'codex',
      request_source: 'phase-a-service-test'
    });

    assert.ok(app.services.supersedeMemoryService);
    assert.equal(typeof app.services.supersedeMemoryService.supersede, 'function');
    assert.equal(result.decision, 'rejected');
    assert.match(result.reason, /both old and new memory records must exist/i);
    assert.deepEqual(
      TOOL_DEFINITIONS.map(tool => tool.name).sort(),
      ['audit_memory', 'memory_overview', 'record_memory', 'search_memory']
    );
  });
});

test('app should wire write preflight candidate provider while keeping default preflight disabled and public MCP frozen', async () => {
  await withApp(async ({ app }) => {
    const seed = await app.callTool('record_memory', writePreflightPayload(), {
      executionContext: codexExecutionContext()
    });

    assert.equal(seed.decision, 'accepted');
    assert.equal(app.config.enableWritePreflight, false);
    assert.equal(app.services.writeService.writePreflightEnabled, false);
    assert.equal(typeof app.services.writeService.writePreflightCandidateProvider, 'function');

    const candidates = await app.services.writeService.writePreflightCandidateProvider({
      proposedWrite: { target: 'process' },
      allowedScope: {
        projectId: 'codex-memory',
        workspaceId: 'phase-a-write-preflight-workspace',
        clientId: 'codex',
        taskId: 'CM-0892',
        conversationId: 'phase-a-write-preflight-app-wiring',
        visibility: 'project',
        retentionPolicy: 'keep'
      }
    });

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].target, 'process');
    assert.equal(candidates[0].taskId, 'CM-0892');
    assert.deepEqual(
      TOOL_DEFINITIONS.map(tool => tool.name).sort(),
      ['audit_memory', 'memory_overview', 'record_memory', 'search_memory']
    );
  });
});

test('app should allow opt-in write preflight and suppress same-scope duplicate before durable projection', async () => {
  await withApp(async ({ app }) => {
    const requestContext = {
      executionContext: codexExecutionContext()
    };
    const payload = writePreflightPayload();

    const first = await app.callTool('record_memory', payload, requestContext);
    const second = await app.callTool('record_memory', payload, requestContext);

    assert.equal(app.config.enableWritePreflight, true);
    assert.equal(app.services.writeService.writePreflightEnabled, true);
    assert.equal(first.decision, 'accepted');
    assert.equal(second.decision, 'rejected');
    assert.match(second.reason, /write preflight rejected: duplicate_suppressed/i);
    assert.equal(second.writePreflight.decision, 'duplicate_suppressed');
    assert.equal(second.writePreflight.matchedCandidateCount, 1);
    assert.deepEqual(
      TOOL_DEFINITIONS.map(tool => tool.name).sort(),
      ['audit_memory', 'memory_overview', 'record_memory', 'search_memory']
    );
  }, {
    enableWritePreflight: true
  });
});
