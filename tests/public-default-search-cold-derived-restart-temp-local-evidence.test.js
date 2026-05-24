'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');

const PROOF_MARKER = 'CM1021 public default scoped cold derived restart temp local marker';
const PROJECT_ID = 'cm1021-project';
const WORKSPACE_ID = 'cm1021-workspace';

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
      'Purpose: prove scoped default search survives cold derived cache/index restart.'
    ].join('\n'),
    evidence: `cm1021-${clientId}-cold-derived-restart-evidence`,
    validated: true,
    reusable: false,
    tags: ['cm1021', 'scope', 'restart-durability', 'cold-derived', 'temp-local'],
    sensitivity: 'none',
    project_id: PROJECT_ID,
    workspace_id: WORKSPACE_ID,
    client_id: clientId,
    visibility: 'private'
  }, {
    executionContext: {
      requestSource: 'cm1021-public-default-search-cold-derived-restart-temp-local-evidence',
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
      requestSource: 'cm1021-public-default-search-cold-derived-restart-temp-local-evidence',
      clientId
    }
  });
}

test('public default scoped search survives temp-local cold derived cache and vector restart', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1021-cold-derived-'));
  const paths = makePaths(tempBasePath);

  let firstApp;
  let coldRestartedApp;

  try {
    firstApp = await openApp(paths);
    const codexMemoryId = await writeScopedRecord(firstApp, {
      clientId: 'codex',
      title: 'CM1021 Codex Private Cold Derived Restart Record'
    });
    const claudeMemoryId = await writeScopedRecord(firstApp, {
      clientId: 'claude',
      title: 'CM1021 Claude Private Cold Derived Restart Record'
    });

    const derivedPaths = [
      firstApp.config.candidateCachePath,
      firstApp.config.vectorIndexPath
    ];

    for (const derivedPath of derivedPaths) {
      assert.equal(typeof derivedPath, 'string');
      assert.equal(path.resolve(derivedPath).startsWith(path.resolve(tempBasePath)), true);
    }

    await firstApp.close();
    firstApp = null;

    for (const derivedPath of derivedPaths) {
      await fs.rm(derivedPath, { force: true });
    }

    coldRestartedApp = await openApp(paths);

    let scopeMapLookups = 0;
    const originalGetRecordsScopeMap = coldRestartedApp.stores.shadowStore.getRecordsScopeMap.bind(coldRestartedApp.stores.shadowStore);
    coldRestartedApp.stores.shadowStore.getRecordsScopeMap = async memoryIds => {
      scopeMapLookups += 1;
      return originalGetRecordsScopeMap(memoryIds);
    };

    const codexSearch = await searchScoped(coldRestartedApp, { clientId: 'codex' });
    const claudeSearch = await searchScoped(coldRestartedApp, { clientId: 'claude' });
    const manualSearch = await searchScoped(coldRestartedApp, { clientId: 'manual' });

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
    if (coldRestartedApp) {
      await coldRestartedApp.close();
    }
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});
