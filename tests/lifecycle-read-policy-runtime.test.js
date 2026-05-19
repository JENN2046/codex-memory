const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const { CodexMemoryMcpServer } = require('../src/adapters/codex-mcp/server');

const requestContext = {
  executionContext: {
    agentAlias: 'Codex',
    agentId: 'codex-desktop',
    requestSource: 'codex-memory-lifecycle-read-policy-runtime-test'
  }
};

async function withApp(overrides, handler) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-lifecycle-runtime-'));
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

async function ensureLifecycleStatusColumn(shadowStore) {
  await shadowStore.ensureReady();
  const columns = shadowStore.db.prepare('PRAGMA table_info(memory_records)').all();
  if (!columns.some(column => column.name === 'status')) {
    shadowStore.db.exec('ALTER TABLE memory_records ADD COLUMN status TEXT');
    shadowStore.refreshMemoryRecordColumnInfo();
  }
}

async function writeFixture(app, fixture, { phrase = 'lifecycle runtime policy signal' } = {}) {
  const result = await app.callTool('record_memory', {
    target: 'process',
    title: fixture.title,
    content: `Type: checkpoint\n${phrase}\nstatus fixture: ${fixture.title}`,
    evidence: `lifecycle-runtime-${fixture.title}`,
    validated: true,
    reusable: false,
    tags: ['lifecycle', 'runtime', 'policy'],
    sensitivity: 'none',
    project_id: fixture.projectId || 'lifecycle-runtime-project',
    workspace_id: fixture.workspaceId || '',
    client_id: fixture.clientId || 'codex',
    visibility: fixture.visibility || 'project'
  }, requestContext);
  assert.equal(result.decision, 'accepted');

  if (fixture.status !== undefined) {
    await ensureLifecycleStatusColumn(app.stores.shadowStore);
    app.stores.shadowStore.db.prepare(`
      UPDATE memory_records
      SET status = ?, visibility = ?, client_id = ?
      WHERE memory_id = ?
    `).run(fixture.status, fixture.visibility || 'project', fixture.clientId || 'codex', result.memoryId);
  }

  return result.memoryId;
}

async function writeLifecycleFixtures(app, options = {}) {
  const fixtures = [
    { title: 'Lifecycle Active Visible', status: 'active' },
    { title: 'Lifecycle Stale Visible', status: 'stale' },
    { title: 'Lifecycle Proposal Hidden', status: 'proposal' },
    { title: 'Lifecycle Rejected Hidden', status: 'rejected' },
    { title: 'Lifecycle Superseded Hidden', status: 'superseded' },
    { title: 'Lifecycle Tombstoned Hidden', status: 'tombstoned' }
  ];

  for (const fixture of fixtures) {
    await writeFixture(app, fixture, options);
  }
  return fixtures;
}

async function searchLifecycle(app, args = {}) {
  return app.callTool('search_memory', {
    query: 'lifecycle runtime policy signal',
    target: 'process',
    limit: 10,
    include_content: true,
    ...args
  }, requestContext);
}

async function latestRecallAudit(app) {
  const entries = await app.stores.auditLogStore.readRecentRecallAudit(10);
  return entries.at(-1);
}

test('lifecycle read policy flag defaults to false and soft read policy remains default false', async () => {
  await withApp({}, async ({ app }) => {
    assert.equal(app.config.enableLifecycleReadPolicy, false);
    assert.equal(app.config.enableSoftReadPolicy, false);
  });
});

test('flag=false keeps search_memory compatible while recall isolation hides terminal lifecycle statuses', async () => {
  await withApp({ enableLifecycleReadPolicy: false }, async ({ app }) => {
    await writeLifecycleFixtures(app);

    const search = await searchLifecycle(app);
    const titles = search.results.map(result => result.title).sort();

    assert.deepEqual(titles, [
      'Lifecycle Active Visible',
      'Lifecycle Proposal Hidden',
      'Lifecycle Stale Visible'
    ]);
  });
});

test('flag=true filters remaining proposal records while recall isolation already hides terminal statuses', async () => {
  await withApp({ enableLifecycleReadPolicy: true }, async ({ app }) => {
    await writeLifecycleFixtures(app);

    const search = await searchLifecycle(app);
    const titles = search.results.map(result => result.title).sort();

    assert.deepEqual(titles, [
      'Lifecycle Active Visible',
      'Lifecycle Stale Visible'
    ]);

    const latest = await latestRecallAudit(app);
    assert.equal(latest.recallType, 'read-policy');
    assert.equal(latest.readPolicyApplied, true);
    assert.equal(latest.lifecyclePolicyApplied, true);
    assert.deepEqual(latest.lifecycleIncludedStatuses, ['active', 'stale']);
    assert.deepEqual(latest.lifecycleExcludedStatuses, ['proposal', 'rejected', 'superseded', 'tombstoned']);
    assert.equal(latest.hiddenByLifecycleCount, 1);
    assert.equal(latest.staleResultCount, 1);
    assert.equal(latest.lifecycleColumnAvailable, true);
  });
});

test('flag=true missing lifecycle status column fails safe instead of treating unknown status as active', async () => {
  await withApp({ enableLifecycleReadPolicy: true }, async ({ app }) => {
    await writeFixture(app, {
      title: 'Lifecycle Missing Column Candidate'
    });

    const search = await searchLifecycle(app);
    assert.deepEqual(search.results, []);

    const latest = await latestRecallAudit(app);
    assert.equal(latest.recallType, 'read-policy');
    assert.equal(latest.readPolicyApplied, true);
    assert.equal(latest.lifecyclePolicyApplied, true);
    assert.equal(latest.lifecycleColumnAvailable, false);
    assert.equal(latest.hiddenByLifecycleCount, 1);
    assert.equal(latest.staleResultCount, 0);
  });
});

test('lifecycle policy audit summary avoids raw workspace_id while recording scopeWorkspacePresent', async () => {
  await withApp({ enableLifecycleReadPolicy: true }, async ({ app }) => {
    await writeFixture(app, {
      title: 'Lifecycle Scoped Active',
      status: 'active',
      projectId: 'lifecycle-scope-project',
      workspaceId: '/private/local/workspace/path',
      clientId: 'codex',
      visibility: 'shared'
    });

    const search = await searchLifecycle(app, {
      scope: {
        project_id: 'lifecycle-scope-project',
        workspace_id: '/private/local/workspace/path',
        client_id: 'codex',
        visibility: 'shared'
      }
    });
    assert.equal(search.results.length, 1);

    const latest = await latestRecallAudit(app);
    assert.equal(latest.recallType, 'read-policy');
    assert.equal(latest.scopeWorkspacePresent, true);
    assert.equal('workspace_id' in latest, false);
    assert.equal('workspaceId' in latest, false);
    assert.equal(JSON.stringify(latest).includes('/private/local/workspace/path'), false);
  });
});

test('MCP public tools remain record_memory, search_memory, and memory_overview', async () => {
  await withApp({ enableLifecycleReadPolicy: true }, async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const response = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    }, requestContext);

    const toolNames = response.response.result.tools.map(tool => tool.name).sort();
    assert.deepEqual(toolNames, ['memory_overview', 'record_memory', 'search_memory']);
  });
});
