'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');

const PROOF_MARKER = 'CM1027 public default lifecycle matrix cold derived temp local marker';
const PROJECT_ID = 'cm1027-project';
const WORKSPACE_ID = 'cm1027-workspace';
const VISIBLE_STATUSES = ['active', 'stale'];
const HIDDEN_STATUSES = ['proposal', 'rejected', 'superseded', 'tombstoned'];

function makePaths(tempBasePath) {
  return {
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data'),
    enableLifecycleReadPolicy: true
  };
}

async function openApp(paths) {
  const app = createCodexMemoryApplication(paths);
  await app.initialize();
  return app;
}

async function ensureLifecycleColumns(shadowStore) {
  await shadowStore.ensureReady();
  shadowStore.ensureColumn('memory_records', 'status', "TEXT NOT NULL DEFAULT 'active'");
  shadowStore.ensureColumn('memory_records', 'status_reason', 'TEXT');
  shadowStore.ensureColumn('memory_records', 'supersedes_memory_id', 'TEXT');
  shadowStore.ensureColumn('memory_records', 'superseded_by_memory_id', 'TEXT');
  shadowStore.ensureColumn('memory_records', 'tombstone_reason', 'TEXT');
  shadowStore.ensureColumn('memory_records', 'lifecycle_updated_at', 'TEXT');
  shadowStore.ensureColumn('memory_records', 'lifecycle_actor_client_id', 'TEXT');
  shadowStore.refreshMemoryRecordColumnInfo();
}

async function setLifecycleStatus(shadowStore, memoryId, status) {
  await ensureLifecycleColumns(shadowStore);
  shadowStore.db.prepare(`
    UPDATE memory_records
    SET status = ?, status_reason = ?, tombstone_reason = NULL,
        lifecycle_updated_at = updated_at, lifecycle_actor_client_id = 'codex'
    WHERE memory_id = ?
  `).run(status, `cm1027 synthetic ${status} status`, memoryId);
}

async function writeScopedRecord(app, status) {
  const result = await app.callTool('record_memory', {
    target: 'process',
    title: `CM1027 ${status} Private Lifecycle Record`,
    content: [
      'Type: checkpoint',
      PROOF_MARKER,
      `lifecycle matrix status: ${status}`,
      'Purpose: prove lifecycle matrix filtering survives cold derived cache/index restart.'
    ].join('\n'),
    evidence: `cm1027-${status}-lifecycle-matrix-cold-derived-evidence`,
    validated: true,
    reusable: false,
    tags: ['cm1027', 'scope', 'lifecycle', 'matrix', status, 'cold-derived', 'temp-local'],
    sensitivity: 'none',
    project_id: PROJECT_ID,
    workspace_id: WORKSPACE_ID,
    client_id: 'codex',
    visibility: 'private'
  }, {
    executionContext: {
      requestSource: 'cm1027-public-default-search-lifecycle-matrix-cold-derived-temp-local-evidence',
      agentAlias: 'Codex',
      agentId: 'codex-desktop'
    }
  });

  assert.equal(result.decision, 'accepted');
  assert.equal(typeof result.memoryId, 'string');
  assert.ok(result.memoryId);
  await setLifecycleStatus(app.stores.shadowStore, result.memoryId, status);
  return result.memoryId;
}

async function searchScoped(app) {
  return app.callTool('search_memory', {
    query: PROOF_MARKER,
    target: 'process',
    limit: 10,
    include_content: false,
    scope: {
      project_id: PROJECT_ID,
      workspace_id: WORKSPACE_ID,
      client_id: 'codex',
      visibility: 'private'
    }
  }, {
    executionContext: {
      requestSource: 'cm1027-public-default-search-lifecycle-matrix-cold-derived-temp-local-evidence',
      clientId: 'codex'
    }
  });
}

async function latestRecallAudit(app) {
  const entries = await app.stores.auditLogStore.readRecentRecallAudit(10);
  return entries.at(-1);
}

function assertLifecycleMatrixResults(results, memoryIdsByStatus) {
  const ids = results.map(result => result.memoryId).sort();
  const expected = VISIBLE_STATUSES.map(status => memoryIdsByStatus[status]).sort();
  assert.deepEqual(ids, expected);

  for (const status of HIDDEN_STATUSES) {
    assert.equal(ids.includes(memoryIdsByStatus[status]), false);
  }

  for (const result of results) {
    assert.equal('content' in result, false);
    assert.equal('text' in result, true);
  }
}

function assertLifecyclePolicyAudit(audit) {
  assert.equal(audit.recallType, 'read-policy');
  assert.equal(audit.readPolicyApplied, true);
  assert.equal(audit.lifecyclePolicyApplied, true);
  assert.equal(audit.lifecycleColumnAvailable, true);
  assert.deepEqual(audit.lifecycleIncludedStatuses, VISIBLE_STATUSES);
  assert.deepEqual(audit.lifecycleExcludedStatuses, HIDDEN_STATUSES);
  assert.equal(audit.staleResultCount >= 1, true);
  assert.equal(Number.isInteger(audit.hiddenByLifecycleCount), true);
  assert.equal(audit.hiddenByLifecycleCount >= 0, true);
}

test('public default search preserves lifecycle matrix after temp-local cold derived restart', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1027-lifecycle-matrix-cold-derived-'));
  const paths = makePaths(tempBasePath);

  let firstApp;
  let coldRestartedApp;

  try {
    firstApp = await openApp(paths);
    const memoryIdsByStatus = {};

    for (const status of [...VISIBLE_STATUSES, ...HIDDEN_STATUSES]) {
      memoryIdsByStatus[status] = await writeScopedRecord(firstApp, status);
    }

    const beforeRestartSearch = await searchScoped(firstApp);
    assertLifecycleMatrixResults(beforeRestartSearch.results, memoryIdsByStatus);
    assertLifecyclePolicyAudit(await latestRecallAudit(firstApp));

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

    const search = await searchScoped(coldRestartedApp);
    assertLifecycleMatrixResults(search.results, memoryIdsByStatus);

    const latest = await latestRecallAudit(coldRestartedApp);
    assertLifecyclePolicyAudit(latest);
    assert.equal(latest.scopeWorkspacePresent, true);
    assert.equal(JSON.stringify(latest).includes(WORKSPACE_ID), false);
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
