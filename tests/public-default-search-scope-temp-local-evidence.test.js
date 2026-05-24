'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');

const PROOF_MARKER = 'CM1019 public default scoped search temp local marker';
const PROJECT_ID = 'cm1019-project';
const WORKSPACE_ID = 'cm1019-workspace';

async function withTempApp(handler) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1019-scope-'));
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

async function writeScopedRecord(app, { clientId, title }) {
  const result = await app.callTool('record_memory', {
    target: 'process',
    title,
    content: [
      'Type: checkpoint',
      PROOF_MARKER,
      `client lane: ${clientId}`,
      'Purpose: prove scoped default search does not cross private client boundary.'
    ].join('\n'),
    evidence: `cm1019-${clientId}-private-scope-evidence`,
    validated: true,
    reusable: false,
    tags: ['cm1019', 'scope', 'temp-local'],
    sensitivity: 'none',
    project_id: PROJECT_ID,
    workspace_id: WORKSPACE_ID,
    client_id: clientId,
    visibility: 'private'
  }, {
    executionContext: {
      requestSource: 'cm1019-public-default-search-scope-temp-local-evidence',
      agentAlias: 'Codex',
      agentId: 'codex-desktop'
    }
  });

  assert.equal(result.decision, 'accepted');
  assert.equal(typeof result.memoryId, 'string');
  assert.ok(result.memoryId);
  return result.memoryId;
}

async function searchScoped(app, { clientId }) {
  return app.callTool('search_memory', {
    query: PROOF_MARKER,
    target: 'process',
    limit: 10,
    include_content: false,
    scope: {
      project_id: PROJECT_ID,
      workspace_id: WORKSPACE_ID,
      client_id: clientId,
      visibility: 'private'
    }
  }, {
    executionContext: {
      requestSource: 'cm1019-public-default-search-scope-temp-local-evidence',
      clientId
    }
  });
}

test('public default search respects private client scope in temp-local app evidence', async () => {
  await withTempApp(async ({ app }) => {
    const codexMemoryId = await writeScopedRecord(app, {
      clientId: 'codex',
      title: 'CM1019 Codex Private Scoped Record'
    });
    const claudeMemoryId = await writeScopedRecord(app, {
      clientId: 'claude',
      title: 'CM1019 Claude Private Scoped Record'
    });

    let scopeMapLookups = 0;
    const originalGetRecordsScopeMap = app.stores.shadowStore.getRecordsScopeMap.bind(app.stores.shadowStore);
    app.stores.shadowStore.getRecordsScopeMap = async memoryIds => {
      scopeMapLookups += 1;
      return originalGetRecordsScopeMap(memoryIds);
    };

    const codexSearch = await searchScoped(app, { clientId: 'codex' });
    const claudeSearch = await searchScoped(app, { clientId: 'claude' });
    const manualSearch = await searchScoped(app, { clientId: 'manual' });

    const codexIds = codexSearch.results.map(result => result.memoryId);
    const claudeIds = claudeSearch.results.map(result => result.memoryId);

    assert.deepEqual(codexIds, [codexMemoryId]);
    assert.deepEqual(claudeIds, [claudeMemoryId]);
    assert.deepEqual(manualSearch.results, []);
    assert.equal(codexIds.includes(claudeMemoryId), false);
    assert.equal(claudeIds.includes(codexMemoryId), false);
    assert.equal(scopeMapLookups, 2);

    for (const result of [...codexSearch.results, ...claudeSearch.results]) {
      assert.equal('content' in result, false);
      assert.equal('text' in result, true);
    }
  });
});
