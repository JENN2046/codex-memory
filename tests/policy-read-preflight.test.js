const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const { CodexMemoryMcpServer } = require('../src/adapters/codex-mcp/server');

async function withApp(handler) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-policy-preflight-'));
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

async function withPolicyApp(handler) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-policy-runtime-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data'),
    enableSoftReadPolicy: true
  });

  await app.initialize();

  try {
    await handler({ app, tempBasePath });
  } finally {
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
}

const requestContext = {
  executionContext: {
    agentAlias: 'Codex',
    agentId: 'codex-desktop',
    requestSource: 'codex-memory-policy-preflight-test'
  }
};

async function ensureGovernanceStatusColumn(shadowStore) {
  await shadowStore.ensureReady();
  const columns = shadowStore.db.prepare('PRAGMA table_info(memory_records)').all();
  if (!columns.some(column => column.name === 'status')) {
    shadowStore.db.exec("ALTER TABLE memory_records ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
  }
}

async function updatePolicyFields(shadowStore, memoryId, { status = 'active', visibility = 'project', clientId = 'codex' } = {}) {
  await ensureGovernanceStatusColumn(shadowStore);
  shadowStore.db.prepare(`
    UPDATE memory_records
    SET status = ?, visibility = ?, client_id = ?
    WHERE memory_id = ?
  `).run(status, visibility, clientId, memoryId);
}

async function getPolicyRecords(shadowStore, memoryIds = []) {
  await ensureGovernanceStatusColumn(shadowStore);
  const uniqueIds = [...new Set(memoryIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return [];
  }

  const placeholders = uniqueIds.map(() => '?').join(',');
  return shadowStore.db.prepare(`
    SELECT memory_id, title, status, visibility, client_id
    FROM memory_records
    WHERE memory_id IN (${placeholders})
  `).all(...uniqueIds).map(row => ({
    memoryId: row.memory_id,
    title: row.title,
    status: row.status,
    visibility: row.visibility,
    clientId: row.client_id
  }));
}

function applyHypotheticalSoftReadPolicy(records, { requestClientId = 'codex' } = {}) {
  return records.filter(record => {
    const status = String(record.status || 'active');
    if (!['active', 'stale'].includes(status)) {
      return false;
    }

    const visibility = String(record.visibility || 'project');
    if (visibility === 'private' && String(record.clientId || '') !== requestClientId) {
      return false;
    }

    return true;
  });
}

test('policy preflight: current default search still returns proposal, tombstoned, and cross-client private records', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const { shadowStore } = app.stores;

    const fixtures = [
      { title: 'Active Shared', status: 'active', visibility: 'shared', clientId: 'codex' },
      { title: 'Proposal Shared', status: 'proposal', visibility: 'shared', clientId: 'claude' },
      { title: 'Tombstoned Shared', status: 'tombstoned', visibility: 'shared', clientId: 'codex' },
      { title: 'Private Claude', status: 'active', visibility: 'private', clientId: 'claude' },
      { title: 'Private Codex', status: 'active', visibility: 'private', clientId: 'codex' }
    ];

    const expectedIds = [];

    for (let index = 0; index < fixtures.length; index += 1) {
      const fixture = fixtures[index];
      const record = await server.handleJsonRpc({
        jsonrpc: '2.0',
        id: index + 1,
        method: 'tools/call',
        params: {
          name: 'record_memory',
          arguments: {
            target: 'process',
            title: fixture.title,
            content: `Type: checkpoint\npolicy preflight shared signal\nfixture: ${fixture.title}`,
            evidence: `policy-preflight-${fixture.title}`,
            validated: true,
            reusable: false,
            tags: ['policy', 'preflight', 'shared-signal'],
            sensitivity: 'none',
            project_id: 'policy-preflight-project',
            visibility: fixture.visibility,
            client_id: fixture.clientId
          }
        }
      }, requestContext);

      assert.equal(record.response.result.structuredContent.decision, 'accepted');
      const memoryId = record.response.result.structuredContent.memoryId;
      expectedIds.push(memoryId);
      await updatePolicyFields(shadowStore, memoryId, fixture);
    }

    const searchResult = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 100,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'policy preflight shared signal',
          target: 'process',
          limit: 10,
          include_content: true
        }
      }
    }, requestContext);

    const results = searchResult.response.result.structuredContent.results || [];
    const resultIds = results.map(result => result.memoryId);
    assert.equal(results.length, fixtures.length, 'current default read path should return all fixture records');
    for (const expectedId of expectedIds) {
      assert.ok(resultIds.includes(expectedId), `current default read path should include ${expectedId}`);
    }
  });
});

test('policy preflight: hypothetical default status and visibility policy would narrow mixed-governance results', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const { shadowStore } = app.stores;

    const fixtures = [
      { title: 'Active Shared', status: 'active', visibility: 'shared', clientId: 'codex' },
      { title: 'Proposal Shared', status: 'proposal', visibility: 'shared', clientId: 'claude' },
      { title: 'Rejected Shared', status: 'rejected', visibility: 'shared', clientId: 'claude' },
      { title: 'Tombstoned Shared', status: 'tombstoned', visibility: 'shared', clientId: 'codex' },
      { title: 'Private Claude', status: 'active', visibility: 'private', clientId: 'claude' },
      { title: 'Private Codex', status: 'active', visibility: 'private', clientId: 'codex' }
    ];

    for (let index = 0; index < fixtures.length; index += 1) {
      const fixture = fixtures[index];
      const record = await server.handleJsonRpc({
        jsonrpc: '2.0',
        id: index + 1,
        method: 'tools/call',
        params: {
          name: 'record_memory',
          arguments: {
            target: 'process',
            title: fixture.title,
            content: `Type: checkpoint\nsoft read policy preflight signal\nfixture: ${fixture.title}`,
            evidence: `soft-policy-preflight-${fixture.title}`,
            validated: true,
            reusable: false,
            tags: ['policy', 'preflight', 'soft-read'],
            sensitivity: 'none',
            project_id: 'policy-preflight-project',
            visibility: fixture.visibility,
            client_id: fixture.clientId
          }
        }
      }, requestContext);

      assert.equal(record.response.result.structuredContent.decision, 'accepted');
      await updatePolicyFields(shadowStore, record.response.result.structuredContent.memoryId, fixture);
    }

    const searchResult = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 200,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'soft read policy preflight signal',
          target: 'process',
          limit: 10,
          include_content: true
        }
      }
    }, requestContext);

    const results = searchResult.response.result.structuredContent.results || [];
    assert.equal(results.length, fixtures.length, 'preflight baseline should expose all fixture records before policy');

    const records = await getPolicyRecords(shadowStore, results.map(result => result.memoryId));
    const hypothetical = applyHypotheticalSoftReadPolicy(records, { requestClientId: 'codex' });

    assert.equal(
      hypothetical.length,
      2,
      'soft read policy would keep only active/stale records plus same-client private visibility'
    );

    const keptTitles = hypothetical.map(record => record.title).sort();
    assert.deepEqual(keptTitles, ['Active Shared', 'Private Codex']);
  });
});

test('soft read policy runtime flag filters proposal, rejected, tombstoned, and cross-client private records', async () => {
  await withPolicyApp(async ({ app }) => {
    assert.equal(app.config.enableSoftReadPolicy, true);
    const server = new CodexMemoryMcpServer({ app });
    const { shadowStore } = app.stores;

    const fixtures = [
      { title: 'Runtime Active Shared', status: 'active', visibility: 'shared', clientId: 'codex' },
      { title: 'Runtime Stale Shared', status: 'stale', visibility: 'shared', clientId: 'codex' },
      { title: 'Runtime Proposal Shared', status: 'proposal', visibility: 'shared', clientId: 'codex' },
      { title: 'Runtime Rejected Shared', status: 'rejected', visibility: 'shared', clientId: 'codex' },
      { title: 'Runtime Tombstoned Shared', status: 'tombstoned', visibility: 'shared', clientId: 'codex' },
      { title: 'Runtime Private Claude', status: 'active', visibility: 'private', clientId: 'claude' },
      { title: 'Runtime Private Codex', status: 'active', visibility: 'private', clientId: 'codex' }
    ];

    for (let index = 0; index < fixtures.length; index += 1) {
      const fixture = fixtures[index];
      const record = await server.handleJsonRpc({
        jsonrpc: '2.0',
        id: index + 1,
        method: 'tools/call',
        params: {
          name: 'record_memory',
          arguments: {
            target: 'process',
            title: fixture.title,
            content: `Type: checkpoint\nruntime soft policy signal\nfixture: ${fixture.title}`,
            evidence: `runtime-soft-policy-${fixture.title}`,
            validated: true,
            reusable: false,
            tags: ['policy', 'runtime', 'soft-read'],
            sensitivity: 'none',
            project_id: 'policy-runtime-project',
            visibility: fixture.visibility,
            client_id: fixture.clientId
          }
        }
      }, requestContext);

      assert.equal(record.response.result.structuredContent.decision, 'accepted');
      await updatePolicyFields(shadowStore, record.response.result.structuredContent.memoryId, fixture);
    }

    const searchResult = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 300,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'runtime soft policy signal',
          target: 'process',
          limit: 10,
          include_content: true
        }
      }
    }, requestContext);

    const titles = (searchResult.response.result.structuredContent.results || [])
      .map(result => result.title)
      .sort();

    assert.deepEqual(titles, [
      'Runtime Active Shared',
      'Runtime Private Codex',
      'Runtime Stale Shared'
    ]);
  });
});

test('soft read policy remains off by default', async () => {
  await withApp(async ({ app }) => {
    assert.equal(app.config.enableSoftReadPolicy, false);
  });
});
