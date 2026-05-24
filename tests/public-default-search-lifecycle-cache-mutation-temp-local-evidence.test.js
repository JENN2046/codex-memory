'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');

const PROOF_MARKER = 'CM1028 public default lifecycle cache mutation temp local marker';
const PROJECT_ID = 'cm1028-project';
const WORKSPACE_ID = 'cm1028-workspace';

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
  `).run(status, `cm1028 synthetic ${status} status`, memoryId);
}

async function writeScopedRecord(app, { title, status }) {
  const result = await app.callTool('record_memory', {
    target: 'process',
    title,
    content: [
      'Type: checkpoint',
      PROOF_MARKER,
      `lifecycle cache mutation status: ${status}`,
      'Purpose: prove lifecycle mutation does not leak through candidate cache state.'
    ].join('\n'),
    evidence: `cm1028-${status}-lifecycle-cache-mutation-evidence`,
    validated: true,
    reusable: false,
    tags: ['cm1028', 'scope', 'lifecycle', 'cache', 'mutation', status, 'temp-local'],
    sensitivity: 'none',
    project_id: PROJECT_ID,
    workspace_id: WORKSPACE_ID,
    client_id: 'codex',
    visibility: 'private'
  }, {
    executionContext: {
      requestSource: 'cm1028-public-default-search-lifecycle-cache-mutation-temp-local-evidence',
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
      requestSource: 'cm1028-public-default-search-lifecycle-cache-mutation-temp-local-evidence',
      clientId: 'codex'
    }
  });
}

async function latestRecallAudit(app) {
  const entries = await app.stores.auditLogStore.readRecentRecallAudit(10);
  return entries.at(-1);
}

function resultIds(results) {
  return results.map(result => result.memoryId).sort();
}

function assertNoContentReturned(results) {
  for (const result of results) {
    assert.equal('content' in result, false);
    assert.equal('text' in result, true);
  }
}

function assertReadPolicyAudit(audit) {
  assert.equal(audit.recallType, 'read-policy');
  assert.equal(audit.readPolicyApplied, true);
  assert.equal(audit.lifecyclePolicyApplied, true);
  assert.equal(audit.lifecycleColumnAvailable, true);
  assert.deepEqual(audit.lifecycleIncludedStatuses, ['active', 'stale']);
  assert.deepEqual(audit.lifecycleExcludedStatuses, ['proposal', 'rejected', 'superseded', 'tombstoned']);
  assert.equal(Number.isInteger(audit.hiddenByLifecycleCount), true);
  assert.equal(audit.hiddenByLifecycleCount >= 0, true);
}

test('public default search excludes lifecycle-mutated record after candidate cache is populated', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1028-lifecycle-cache-mutation-'));
  const paths = makePaths(tempBasePath);

  let app;

  try {
    app = await openApp(paths);
    const activeMemoryId = await writeScopedRecord(app, {
      title: 'CM1028 Active Then Tombstoned Private Lifecycle Record',
      status: 'active'
    });
    const staleMemoryId = await writeScopedRecord(app, {
      title: 'CM1028 Stale Retained Private Lifecycle Record',
      status: 'stale'
    });

    const firstSearch = await searchScoped(app);
    assert.deepEqual(resultIds(firstSearch.results), [activeMemoryId, staleMemoryId].sort());
    assertNoContentReturned(firstSearch.results);

    const firstAudit = await latestRecallAudit(app);
    assertReadPolicyAudit(firstAudit);
    assert.equal(firstAudit.staleResultCount >= 1, true);

    const cacheAfterFirstSearch = await app.stores.candidateCacheStore.getHealth();
    assert.equal(cacheAfterFirstSearch.available, true);
    assert.equal(cacheAfterFirstSearch.entryCount >= 1, true);
    assert.equal(cacheAfterFirstSearch.misses >= 1, true);
    assert.equal(typeof cacheAfterFirstSearch.candidateCachePath, 'string');
    assert.equal(path.resolve(cacheAfterFirstSearch.candidateCachePath).startsWith(path.resolve(tempBasePath)), true);

    await setLifecycleStatus(app.stores.shadowStore, activeMemoryId, 'tombstoned');

    const secondSearch = await searchScoped(app);
    assert.deepEqual(resultIds(secondSearch.results), [staleMemoryId]);
    assert.equal(resultIds(secondSearch.results).includes(activeMemoryId), false);
    assertNoContentReturned(secondSearch.results);

    const secondAudit = await latestRecallAudit(app);
    assertReadPolicyAudit(secondAudit);
    assert.equal(secondAudit.staleResultCount, 1);
    assert.equal(secondAudit.scopeWorkspacePresent, true);
    assert.equal(JSON.stringify(secondAudit).includes(WORKSPACE_ID), false);

    const cacheAfterMutationSearch = await app.stores.candidateCacheStore.getHealth();
    assert.equal(cacheAfterMutationSearch.available, true);
    assert.equal(cacheAfterMutationSearch.entryCount >= 0, true);
    assert.equal(cacheAfterMutationSearch.hits + cacheAfterMutationSearch.misses > cacheAfterFirstSearch.hits + cacheAfterFirstSearch.misses, true);
  } finally {
    if (app) {
      await app.close();
    }
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});
