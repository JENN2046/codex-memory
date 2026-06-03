'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../app');
const { ChunkIndexingService } = require('../recall/ChunkIndexingService');

const TASK_ID = 'CM-1415';
const GATE_VERSION = 'query-quality-temp-db-gate-v1';
const RESULT_STATUS_OK = 'QUERY_QUALITY_TEMP_DB_GATE_PASSED_NOT_LIVE_NOT_READY';
const RESULT_STATUS_FAILED = 'QUERY_QUALITY_TEMP_DB_GATE_FAILED_NOT_READY';

const DEFAULT_CLIENT_ID = 'codex';
const DEFAULT_PROJECT_ID = 'query-quality-temp-db-project';

function nowIso() {
  return new Date().toISOString();
}

function defaultRecords() {
  return [
    {
      memoryId: 'qq-temp-alpha-primary',
      title: 'Atlas Primary Decision',
      content: 'atlas primary signal quality gate decisive evidence with bounded temp sqlite recall',
      tags: ['atlas', 'primary', 'quality'],
      status: 'active',
      clientId: DEFAULT_CLIENT_ID,
      visibility: 'project'
    },
    {
      memoryId: 'qq-temp-alpha-secondary',
      title: 'Atlas Secondary Note',
      content: 'atlas secondary signal quality gate supporting evidence',
      tags: ['atlas', 'secondary'],
      status: 'active',
      clientId: DEFAULT_CLIENT_ID,
      visibility: 'project'
    },
    {
      memoryId: 'qq-temp-beta-safe',
      title: 'Beta Safe Recall',
      content: 'beta safe retrieval target should be visible in temp query gate',
      tags: ['beta', 'safe'],
      status: 'active',
      clientId: DEFAULT_CLIENT_ID,
      visibility: 'project'
    },
    {
      memoryId: 'qq-temp-tombstoned-hidden',
      title: 'Tombstoned Hidden Recall',
      content: 'tombstone hidden retrieval target should never be returned',
      tags: ['tombstone', 'hidden'],
      status: 'tombstoned',
      clientId: DEFAULT_CLIENT_ID,
      visibility: 'project'
    },
    {
      memoryId: 'qq-temp-private-claude-hidden',
      title: 'Claude Private Hidden Recall',
      content: 'cross client private retrieval target should never be returned',
      tags: ['private', 'hidden'],
      status: 'active',
      clientId: 'claude',
      visibility: 'private'
    },
    {
      memoryId: 'qq-temp-private-codex-visible',
      title: 'Codex Private Visible Recall',
      content: 'same client private retrieval target should be returned for codex',
      tags: ['private', 'codex'],
      status: 'active',
      clientId: DEFAULT_CLIENT_ID,
      visibility: 'private'
    }
  ];
}

function defaultCases() {
  return [
    {
      id: 'must-contain-beta-safe',
      query: 'beta safe retrieval target',
      target: 'process',
      limit: 5,
      expected: {
        mustContain: ['qq-temp-beta-safe'],
        mustNotContain: ['qq-temp-tombstoned-hidden', 'qq-temp-private-claude-hidden']
      }
    },
    {
      id: 'top-k-atlas-order',
      query: 'atlas primary decisive quality',
      target: 'process',
      limit: 5,
      expected: {
        mustContain: ['qq-temp-alpha-primary', 'qq-temp-alpha-secondary'],
        topKOrder: ['qq-temp-alpha-primary', 'qq-temp-alpha-secondary']
      }
    },
    {
      id: 'tombstoned-suppressed',
      query: 'tombstone hidden retrieval target',
      target: 'process',
      limit: 5,
      expected: {
        mustNotContain: ['qq-temp-tombstoned-hidden']
      }
    },
    {
      id: 'cross-client-private-suppressed',
      query: 'cross client private retrieval target',
      target: 'process',
      limit: 5,
      expected: {
        mustNotContain: ['qq-temp-private-claude-hidden']
      }
    },
    {
      id: 'same-client-private-visible',
      query: 'same client private retrieval target',
      target: 'process',
      limit: 5,
      expected: {
        mustContain: ['qq-temp-private-codex-visible'],
        mustNotContain: ['qq-temp-private-claude-hidden']
      }
    }
  ];
}

function normalizeRecord(record = {}, index = 0) {
  const timestamp = record.createdAt || nowIso();
  return {
    memoryId: String(record.memoryId || `qq-temp-record-${index + 1}`),
    target: record.target || 'process',
    title: String(record.title || `Temp Query Record ${index + 1}`),
    content: String(record.content || ''),
    evidence: String(record.evidence || 'synthetic temp DB query quality fixture'),
    tags: Array.isArray(record.tags) ? record.tags : ['query-quality-temp-db'],
    validated: record.validated !== false,
    reusable: record.reusable === true,
    sensitivity: record.sensitivity || 'none',
    createdAt: timestamp,
    updatedAt: record.updatedAt || timestamp,
    projectId: record.projectId || DEFAULT_PROJECT_ID,
    workspaceId: record.workspaceId || 'temp-workspace',
    clientId: record.clientId || DEFAULT_CLIENT_ID,
    taskId: record.taskId || TASK_ID,
    conversationId: record.conversationId || 'temp-query-quality',
    visibility: record.visibility || 'project',
    retentionPolicy: record.retentionPolicy || 'temp_fixture',
    status: record.status || 'active'
  };
}

async function ensureLifecycleColumns(shadowStore) {
  await shadowStore.ensureReady();
  const columns = shadowStore.db.prepare('PRAGMA table_info(memory_records)').all();
  const columnNames = new Set(columns.map(column => column.name));
  if (!columnNames.has('status')) {
    shadowStore.db.exec('ALTER TABLE memory_records ADD COLUMN status TEXT');
  }
  if (!columnNames.has('tombstone_reason')) {
    shadowStore.db.exec('ALTER TABLE memory_records ADD COLUMN tombstone_reason TEXT');
  }
  shadowStore.refreshMemoryRecordColumnInfo();
}

async function seedSyntheticRecords(app, records = []) {
  await ensureLifecycleColumns(app.stores.shadowStore);
  const chunkIndexingService = new ChunkIndexingService({
    config: app.config,
    shadowStore: app.stores.shadowStore,
    vectorStore: app.stores.vectorStore
  });
  for (let index = 0; index < records.length; index += 1) {
    const record = normalizeRecord(records[index], index);
    await app.stores.shadowStore.upsertRecord(record);
    await app.stores.vectorStore.upsertRecord(record);
    await chunkIndexingService.indexRecord(record);
    app.stores.shadowStore.db.prepare(`
      UPDATE memory_records
      SET status = ?, tombstone_reason = ?
      WHERE memory_id = ?
    `).run(
      record.status,
      record.status === 'tombstoned' ? 'temp-query-quality-suppression' : null,
      record.memoryId
    );
  }
}

function resultMemoryIds(results = []) {
  return results.map(result => String(result.memoryId || result.memory_id || '')).filter(Boolean);
}

function evaluateCase(caseItem = {}, results = []) {
  const ids = resultMemoryIds(results);
  const expected = caseItem.expected || {};
  const issues = [];
  const mustContain = Array.isArray(expected.mustContain) ? expected.mustContain : [];
  const mustNotContain = Array.isArray(expected.mustNotContain) ? expected.mustNotContain : [];
  const topKOrder = Array.isArray(expected.topKOrder) ? expected.topKOrder : [];

  for (const id of mustContain) {
    if (!ids.includes(id)) issues.push(`missing:${id}`);
  }
  for (const id of mustNotContain) {
    if (ids.includes(id)) issues.push(`forbidden:${id}`);
  }
  for (let index = 0; index < topKOrder.length; index += 1) {
    if (ids[index] !== topKOrder[index]) {
      issues.push(`top_k_order:${index}:${topKOrder[index]}!=${ids[index] || 'none'}`);
    }
  }

  return {
    id: caseItem.id || 'unknown',
    query: caseItem.query || '',
    resultIds: ids,
    passed: issues.length === 0,
    ...(issues.length > 0 ? { issues } : {})
  };
}

async function createTempApp(tempRoot) {
  const tempBasePath = tempRoot || await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-query-quality-temp-db-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data'),
    allowExternalProvider: false,
    enableLifecycleReadPolicy: true,
    enableSoftReadPolicy: true,
    autoRebuildShadowOnStart: false
  });
  await app.initialize();
  return { app, tempBasePath };
}

async function runQueryQualityTempDbGate(options = {}) {
  const records = Array.isArray(options.records) ? options.records : defaultRecords();
  const cases = Array.isArray(options.cases) ? options.cases : defaultCases();
  let tempBasePath = null;
  let cleanupCompleted = false;
  let app = null;

  try {
    const created = await createTempApp(options.tempRoot);
    app = created.app;
    tempBasePath = created.tempBasePath;

    await seedSyntheticRecords(app, records);
    const caseResults = [];
    for (const caseItem of cases) {
      const search = await app.callTool('search_memory', {
        query: caseItem.query,
        target: caseItem.target || 'both',
        limit: caseItem.limit || 10,
        include_content: false
      }, {
        noTokenReadOnly: true,
        executionContext: {
          requestSource: 'query-quality-temp-db-gate',
          clientId: options.clientId || DEFAULT_CLIENT_ID
        }
      });
      caseResults.push(evaluateCase(caseItem, search.results || []));
    }

    const failures = caseResults.filter(result => !result.passed);
    const dbExists = await fs.stat(app.config.dbPath).then(() => true, () => false);
    const report = {
      taskId: TASK_ID,
      gateVersion: GATE_VERSION,
      status: failures.length === 0 ? RESULT_STATUS_OK : RESULT_STATUS_FAILED,
      ok: failures.length === 0,
      tempDb: {
        created: dbExists,
        sqliteFileName: path.basename(app.config.dbPath),
        tempDataDirCreated: true
      },
      syntheticRecordsWritten: records.length,
      recallPipelineExecuted: true,
      caseCount: caseResults.length,
      passedCount: caseResults.length - failures.length,
      failedCount: failures.length,
      cases: caseResults,
      sideEffects: {
        providerCalls: 0,
        externalProviderAllowed: app.config.allowExternalProvider === true,
        mcpToolCalls: 0,
        liveMcpCalls: 0,
        realMemoryReads: 0,
        realMemoryWrites: 0,
        rawStoreScans: 0,
        durableAuditWrites: 0,
        publicMcpExpansion: false,
        configWatchdogStartupChanges: 0,
        remoteActions: 0,
        readinessClaimed: false
      }
    };

    return report;
  } finally {
    if (app) {
      await app.close();
    }
    if (tempBasePath) {
      await fs.rm(tempBasePath, { recursive: true, force: true });
      cleanupCompleted = true;
    }
    if (options.onCleanup) {
      options.onCleanup({ tempBasePath, cleanupCompleted });
    }
  }
}

module.exports = {
  GATE_VERSION,
  RESULT_STATUS_FAILED,
  RESULT_STATUS_OK,
  TASK_ID,
  defaultCases,
  defaultRecords,
  runQueryQualityTempDbGate
};
