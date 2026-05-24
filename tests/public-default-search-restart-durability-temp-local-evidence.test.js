'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');

const PROOF_MARKER = 'CM1020 public default scoped restart durability temp local marker';
const PROJECT_ID = 'cm1020-project';
const WORKSPACE_ID = 'cm1020-workspace';

function makePaths(tempBasePath) {
  return {
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data')
  };
}

async function openApp(paths) {
  const app = createCodexMemoryApplication(paths);
  await app.initialize();
  return app;
}

async function writeScopedRecord(app, { clientId, title }) {
  const result = await app.callTool('record_memory', {
    target: 'process',
    title,
    content: [
      'Type: checkpoint',
      PROOF_MARKER,
      `client lane: ${clientId}`,
      'Purpose: prove scoped default search survives app close and reopen.'
    ].join('\n'),
    evidence: `cm1020-${clientId}-restart-durability-evidence`,
    validated: true,
    reusable: false,
    tags: ['cm1020', 'scope', 'restart-durability', 'temp-local'],
    sensitivity: 'none',
    project_id: PROJECT_ID,
    workspace_id: WORKSPACE_ID,
    client_id: clientId,
    visibility: 'private'
  }, {
    executionContext: {
      requestSource: 'cm1020-public-default-search-restart-durability-temp-local-evidence',
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
      requestSource: 'cm1020-public-default-search-restart-durability-temp-local-evidence',
      clientId
    }
  });
}

test('public default scoped search survives temp-local app close and reopen', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1020-restart-'));
  const paths = makePaths(tempBasePath);

  let firstApp;
  let restartedApp;

  try {
    firstApp = await openApp(paths);
    const codexMemoryId = await writeScopedRecord(firstApp, {
      clientId: 'codex',
      title: 'CM1020 Codex Private Restart Record'
    });
    const claudeMemoryId = await writeScopedRecord(firstApp, {
      clientId: 'claude',
      title: 'CM1020 Claude Private Restart Record'
    });
    await firstApp.close();
    firstApp = null;

    restartedApp = await openApp(paths);

    let scopeMapLookups = 0;
    const originalGetRecordsScopeMap = restartedApp.stores.shadowStore.getRecordsScopeMap.bind(restartedApp.stores.shadowStore);
    restartedApp.stores.shadowStore.getRecordsScopeMap = async memoryIds => {
      scopeMapLookups += 1;
      return originalGetRecordsScopeMap(memoryIds);
    };

    const codexSearch = await searchScoped(restartedApp, { clientId: 'codex' });
    const claudeSearch = await searchScoped(restartedApp, { clientId: 'claude' });
    const manualSearch = await searchScoped(restartedApp, { clientId: 'manual' });

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
  } finally {
    if (firstApp) {
      await firstApp.close();
    }
    if (restartedApp) {
      await restartedApp.close();
    }
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});
