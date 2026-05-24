'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');

const PROOF_MARKER = 'CM1022 public default lifecycle tombstone cold derived temp local marker';
const PROJECT_ID = 'cm1022-project';
const WORKSPACE_ID = 'cm1022-workspace';

function makePaths(tempBasePath) {
  return {
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data'),
    enableLifecycleReadPolicy: true,
    internalTombstoneRuntimeEntryEnabled: true
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

async function markActive(shadowStore, memoryId) {
  await ensureLifecycleColumns(shadowStore);
  shadowStore.db.prepare(`
    UPDATE memory_records
    SET status = 'active', status_reason = NULL, tombstone_reason = NULL,
        lifecycle_updated_at = updated_at, lifecycle_actor_client_id = 'codex'
    WHERE memory_id = ?
  `).run(memoryId);
}

async function writeScopedRecord(app, { title, lane }) {
  const result = await app.callTool('record_memory', {
    target: 'process',
    title,
    content: [
      'Type: checkpoint',
      PROOF_MARKER,
      `lifecycle lane: ${lane}`,
      'Purpose: prove lifecycle tombstone filtering survives cold derived cache/index restart.'
    ].join('\n'),
    evidence: `cm1022-${lane}-lifecycle-tombstone-cold-derived-evidence`,
    validated: true,
    reusable: false,
    tags: ['cm1022', 'scope', 'lifecycle', 'tombstone', 'cold-derived', 'temp-local'],
    sensitivity: 'none',
    project_id: PROJECT_ID,
    workspace_id: WORKSPACE_ID,
    client_id: 'codex',
    visibility: 'private'
  }, {
    executionContext: {
      requestSource: 'cm1022-public-default-search-lifecycle-tombstone-cold-derived-temp-local-evidence',
      agentAlias: 'Codex',
      agentId: 'codex-desktop'
    }
  });

  assert.equal(result.decision, 'accepted');
  assert.equal(typeof result.memoryId, 'string');
  assert.ok(result.memoryId);
  await markActive(app.stores.shadowStore, result.memoryId);
  return result.memoryId;
}

async function tombstoneRecord(app, memoryId) {
  const result = await app.executeInternalTombstone({
    memory_id: memoryId,
    reason: 'cm1022 synthetic lifecycle pollution prevention review',
    evidence: 'cm1022 synthetic tombstone cold-derived restart evidence',
    tombstone_reason: 'synthetic-superseded-by-governance',
    dry_run: false,
    confirm: true
  }, {
    executionContext: {
      requestSource: 'internal-tombstone-runtime-entry',
      internalTombstoneRuntimeEntry: true,
      clientId: 'codex',
      agentAlias: 'Codex',
      agentId: 'codex-desktop'
    }
  });

  assert.equal(result.decision, 'tombstoned');
  assert.equal(result.mutated, true);
  assert.equal(result.toStatus, 'tombstoned');
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
      requestSource: 'cm1022-public-default-search-lifecycle-tombstone-cold-derived-temp-local-evidence',
      clientId: 'codex'
    }
  });
}

async function latestRecallAudit(app) {
  const entries = await app.stores.auditLogStore.readRecentRecallAudit(10);
  return entries.at(-1);
}

test('public default search excludes tombstoned private record after temp-local cold derived restart', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1022-lifecycle-cold-derived-'));
  const paths = makePaths(tempBasePath);

  let firstApp;
  let coldRestartedApp;

  try {
    firstApp = await openApp(paths);
    const retainedMemoryId = await writeScopedRecord(firstApp, {
      title: 'CM1022 Retained Private Lifecycle Record',
      lane: 'retained'
    });
    const tombstonedMemoryId = await writeScopedRecord(firstApp, {
      title: 'CM1022 Tombstoned Private Lifecycle Record',
      lane: 'tombstoned'
    });

    const beforeTombstoneSearch = await searchScoped(firstApp);
    assert.deepEqual(
      new Set(beforeTombstoneSearch.results.map(result => result.memoryId)),
      new Set([retainedMemoryId, tombstonedMemoryId])
    );

    await tombstoneRecord(firstApp, tombstonedMemoryId);

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
    const ids = search.results.map(result => result.memoryId);

    assert.deepEqual(ids, [retainedMemoryId]);
    assert.equal(ids.includes(tombstonedMemoryId), false);

    for (const result of search.results) {
      assert.equal('content' in result, false);
      assert.equal('text' in result, true);
    }

    const latest = await latestRecallAudit(coldRestartedApp);
    assert.equal(latest.recallType, 'read-policy');
    assert.equal(latest.readPolicyApplied, true);
    assert.equal(latest.lifecyclePolicyApplied, true);
    assert.equal(latest.lifecycleColumnAvailable, true);
    assert.equal(Number.isInteger(latest.hiddenByLifecycleCount), true);
    assert.equal(latest.hiddenByLifecycleCount >= 0, true);
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
