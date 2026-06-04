const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const { TOOL_DEFINITIONS } = require('../src/core/constants');

const cliPath = path.join('src', 'cli', 'supersede-memory.js');

function createMemoryRecordsTable(dbPath, {
  withStatus = true,
  withSupersedeLinks = true
} = {}) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  try {
    db.exec(`
      CREATE TABLE memory_records (
        memory_id TEXT PRIMARY KEY,
        target TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        evidence TEXT NOT NULL,
        tags_json TEXT NOT NULL,
        validated INTEGER NOT NULL,
        reusable INTEGER NOT NULL,
        sensitivity TEXT NOT NULL,
        file_path TEXT,
        relative_path TEXT,
        raw_text TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        project_id TEXT,
        workspace_id TEXT,
        client_id TEXT,
        task_id TEXT,
        conversation_id TEXT,
        visibility TEXT,
        retention_policy TEXT
        ${withStatus ? `,
        status TEXT,
        status_reason TEXT,
        ${withSupersedeLinks ? 'supersedes_memory_id TEXT,' : ''}
        ${withSupersedeLinks ? 'superseded_by_memory_id TEXT,' : ''}
        tombstone_reason TEXT,
        lifecycle_updated_at TEXT,
        lifecycle_actor_client_id TEXT` : ''}
      );
    `);
  } finally {
    db.close();
  }
}

function insertRecord(dbPath, {
  memoryId,
  status = 'active',
  clientId = 'codex',
  visibility = 'project',
  title = 'Supersede candidate',
  projectId = 'project-a',
  workspaceId = 'workspace-a',
  taskId = 'task-a',
  conversationId = 'thread-a',
  retentionPolicy = 'retain'
} = {}) {
  const db = new DatabaseSync(dbPath);
  try {
    const columns = db.prepare('PRAGMA table_info(memory_records)').all().map(column => column.name);
    const hasStatus = columns.includes('status');
    const sql = `
      INSERT INTO memory_records (
        memory_id, target, title, content, evidence, tags_json,
        validated, reusable, sensitivity, file_path, relative_path, raw_text,
        created_at, updated_at, project_id, workspace_id, client_id, task_id,
        conversation_id, visibility, retention_policy${hasStatus ? ', status' : ''}
      ) VALUES (
        ?, 'process', ?, 'Type: checkpoint\nsupersede cli candidate', 'seed evidence', '[]',
        1, 0, 'none', NULL, NULL, NULL,
        '2026-05-14T00:00:00.000Z', '2026-05-14T00:00:00.000Z',
        ?, ?, ?, ?, ?, ?, ?${hasStatus ? ', ?' : ''}
      )
    `;
    const params = hasStatus
      ? [memoryId, title, projectId, workspaceId, clientId, taskId, conversationId, visibility, retentionPolicy, status]
      : [memoryId, title, projectId, workspaceId, clientId, taskId, conversationId, visibility, retentionPolicy];
    db.prepare(sql).run(...params);
  } finally {
    db.close();
  }
}

function getRecordRow(dbPath, memoryId) {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    return db.prepare('SELECT * FROM memory_records WHERE memory_id = ?').get(memoryId);
  } finally {
    db.close();
  }
}

function readAuditEntries(auditLogPath) {
  if (!fs.existsSync(auditLogPath)) return [];
  return fs.readFileSync(auditLogPath, 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function withTempWorkspace({
  withStatus = true,
  withSupersedeLinks = true,
  records = []
} = {}) {
  const tempBasePath = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-supersede-cli-'));
  const dbPath = path.join(tempBasePath, 'data', 'codex-memory.sqlite');
  const auditLogPath = path.join(tempBasePath, 'logs', 'write-audit.jsonl');
  createMemoryRecordsTable(dbPath, { withStatus, withSupersedeLinks });
  for (const record of records) {
    insertRecord(dbPath, record);
  }
  return { tempBasePath, dbPath, auditLogPath };
}

function runCli(args = [], workspace) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    timeout: 30000,
    env: {
      ...process.env,
      CODEX_MEMORY_BASE_PATH: workspace.tempBasePath,
      CODEX_MEMORY_DATA_DIR: path.join(workspace.tempBasePath, 'data'),
      CODEX_MEMORY_LOGS_DIR: path.join(workspace.tempBasePath, 'logs'),
      CODEX_MEMORY_DIARY_PATH: path.join(workspace.tempBasePath, 'dailynote'),
      CODEX_MEMORY_DB_PATH: workspace.dbPath,
      CODEX_MEMORY_AUDIT_LOG: workspace.auditLogPath
    }
  });
}

function validArgs(oldMemoryId = 'mem-old', newMemoryId = 'mem-new') {
  return [
    '--json',
    '--old-memory-id', oldMemoryId,
    '--new-memory-id', newMemoryId,
    '--reason', 'replacement memory approved after governance review',
    '--evidence', 'fixture evidence for supersede cli',
    '--supersedes-link', oldMemoryId,
    '--superseded-by-link', newMemoryId,
    '--actor-client-id', 'codex',
    '--request-source', 'supersede-memory-cli-test'
  ];
}

function parseJsonResult(result) {
  return JSON.parse(result.stdout);
}

test('supersede-memory CLI default dry-run returns mutated=false', () => {
  const workspace = withTempWorkspace({
    records: [
      { memoryId: 'mem-old', status: 'active', title: 'Old memory' },
      { memoryId: 'mem-new', status: 'proposal', title: 'New memory' }
    ]
  });
  try {
    const result = runCli(validArgs(), workspace);
    const report = parseJsonResult(result);
    const oldRow = getRecordRow(workspace.dbPath, 'mem-old');
    const newRow = getRecordRow(workspace.dbPath, 'mem-new');

    assert.equal(result.status, 0, result.stderr || 'non-zero exit');
    assert.equal(report.status, 'ok');
    assert.equal(report.decision, 'dry-run');
    assert.equal(report.dryRun, true);
    assert.equal(report.mutated, false);
    assert.equal(report.oldMemoryId, 'mem-old');
    assert.equal(report.newMemoryId, 'mem-new');
    assert.equal(report.oldFromStatus, 'active');
    assert.equal(report.newFromStatus, 'proposal');
    assert.equal(report.oldToStatus, 'superseded');
    assert.equal(report.newToStatus, 'active');
    assert.equal(report.auditPreview.event_type, 'memory_supersede');
    assert.equal(report.rawWorkspaceIdExposed, false);
    assert.equal(JSON.stringify(report).includes('workspace-a'), false);
    assert.equal(oldRow.status, 'active');
    assert.equal(oldRow.superseded_by_memory_id, null);
    assert.equal(newRow.status, 'proposal');
    assert.equal(newRow.supersedes_memory_id, null);
    assert.deepEqual(readAuditEntries(workspace.auditLogPath), []);
  } finally {
    fs.rmSync(workspace.tempBasePath, { recursive: true, force: true });
  }
});

test('supersede-memory CLI rejects apply without confirm', () => {
  const workspace = withTempWorkspace({
    records: [
      { memoryId: 'mem-old', status: 'active', title: 'Old memory' },
      { memoryId: 'mem-new', status: 'proposal', title: 'New memory' }
    ]
  });
  try {
    const result = runCli([...validArgs(), '--apply'], workspace);
    const report = parseJsonResult(result);

    assert.equal(result.status, 1);
    assert.equal(report.status, 'error');
    assert.equal(report.mutated, false);
    assert.match(report.reason, /--apply requires --confirm/);
  } finally {
    fs.rmSync(workspace.tempBasePath, { recursive: true, force: true });
  }
});

test('supersede-memory CLI applies pair mutation in temp fixture DB', () => {
  const workspace = withTempWorkspace({
    records: [
      { memoryId: 'mem-old', status: 'active', title: 'Old memory' },
      { memoryId: 'mem-new', status: 'proposal', title: 'New memory' }
    ]
  });
  try {
    const result = runCli([...validArgs(), '--apply', '--confirm'], workspace);
    const report = parseJsonResult(result);
    const oldRow = getRecordRow(workspace.dbPath, 'mem-old');
    const newRow = getRecordRow(workspace.dbPath, 'mem-new');
    const auditEntries = readAuditEntries(workspace.auditLogPath);

    assert.equal(result.status, 0, result.stderr || 'non-zero exit');
    assert.equal(report.status, 'ok');
    assert.equal(report.decision, 'superseded');
    assert.equal(report.dryRun, false);
    assert.equal(report.mutated, true);
    assert.equal(report.oldFromStatus, 'active');
    assert.equal(report.newFromStatus, 'proposal');
    assert.equal(oldRow.status, 'superseded');
    assert.equal(oldRow.status_reason, 'replacement memory approved after governance review');
    assert.equal(oldRow.superseded_by_memory_id, 'mem-new');
    assert.equal(newRow.status, 'active');
    assert.equal(newRow.status_reason, 'replacement memory approved after governance review');
    assert.equal(newRow.supersedes_memory_id, 'mem-old');
    assert.equal(auditEntries.length, 2);
    assert.equal(auditEntries[0].mutationAuditEvent.audit_phase, 'pending');
    assert.equal(auditEntries[1].mutationAuditEvent.audit_phase, 'committed');
    assert.equal(report.auditEvent.event_type, 'memory_supersede');
    assert.equal(report.rawWorkspaceIdExposed, false);
  } finally {
    fs.rmSync(workspace.tempBasePath, { recursive: true, force: true });
  }
});

test('supersede-memory CLI rejects exact pair scope mismatch', () => {
  const workspace = withTempWorkspace({
    records: [
      { memoryId: 'mem-old', status: 'active', title: 'Old memory', projectId: 'project-a' },
      { memoryId: 'mem-new', status: 'proposal', title: 'New memory', projectId: 'project-b' }
    ]
  });
  try {
    const result = runCli([...validArgs(), '--apply', '--confirm'], workspace);
    const report = parseJsonResult(result);

    assert.equal(result.status, 1);
    assert.equal(report.status, 'rejected');
    assert.equal(report.mutated, false);
    assert.match(report.reason, /exact pair scope match/);
    assert.equal(getRecordRow(workspace.dbPath, 'mem-old').status, 'active');
    assert.equal(getRecordRow(workspace.dbPath, 'mem-new').status, 'proposal');
    assert.deepEqual(readAuditEntries(workspace.auditLogPath), []);
  } finally {
    fs.rmSync(workspace.tempBasePath, { recursive: true, force: true });
  }
});

test('supersede-memory CLI forbids cross-client private mutation by default', () => {
  const workspace = withTempWorkspace({
    records: [
      { memoryId: 'mem-old', status: 'active', title: 'Old memory', clientId: 'claude', visibility: 'private' },
      { memoryId: 'mem-new', status: 'proposal', title: 'New memory', clientId: 'claude', visibility: 'private' }
    ]
  });
  try {
    const result = runCli([...validArgs(), '--apply', '--confirm'], workspace);
    const report = parseJsonResult(result);

    assert.equal(result.status, 1);
    assert.equal(report.status, 'rejected');
    assert.equal(report.mutated, false);
    assert.match(report.reason, /cross-client private/);
    assert.equal(getRecordRow(workspace.dbPath, 'mem-old').status, 'active');
    assert.equal(getRecordRow(workspace.dbPath, 'mem-new').status, 'proposal');
    assert.deepEqual(readAuditEntries(workspace.auditLogPath), []);
  } finally {
    fs.rmSync(workspace.tempBasePath, { recursive: true, force: true });
  }
});

test('supersede-memory CLI rejects exact bidirectional link mismatch', () => {
  const workspace = withTempWorkspace({
    records: [
      { memoryId: 'mem-old', status: 'active', title: 'Old memory' },
      { memoryId: 'mem-new', status: 'proposal', title: 'New memory' }
    ]
  });
  try {
    const result = runCli([
      '--json',
      '--old-memory-id', 'mem-old',
      '--new-memory-id', 'mem-new',
      '--reason', 'replacement memory approved after governance review',
      '--evidence', 'fixture evidence for supersede cli',
      '--supersedes-link', 'mem-old',
      '--superseded-by-link', 'mem-other',
      '--actor-client-id', 'codex',
      '--request-source', 'supersede-memory-cli-test',
      '--apply',
      '--confirm'
    ], workspace);
    const report = parseJsonResult(result);

    assert.equal(result.status, 1);
    assert.equal(report.status, 'rejected');
    assert.equal(report.mutated, false);
    assert.match(report.reason, /superseded_by_link must exactly match new_memory_id/);
    assert.equal(getRecordRow(workspace.dbPath, 'mem-old').status, 'active');
    assert.equal(getRecordRow(workspace.dbPath, 'mem-new').status, 'proposal');
    assert.deepEqual(readAuditEntries(workspace.auditLogPath), []);
  } finally {
    fs.rmSync(workspace.tempBasePath, { recursive: true, force: true });
  }
});

test('supersede-memory CLI missing bidirectional projection support fails safe', () => {
  const workspace = withTempWorkspace({
    withStatus: true,
    withSupersedeLinks: false,
    records: [
      { memoryId: 'mem-old', status: 'active', title: 'Old memory' },
      { memoryId: 'mem-new', status: 'proposal', title: 'New memory' }
    ]
  });
  try {
    const result = runCli([...validArgs(), '--apply', '--confirm'], workspace);
    const report = parseJsonResult(result);

    assert.equal(result.status, 1);
    assert.equal(report.status, 'rejected');
    assert.equal(report.mutated, false);
    assert.match(report.reason, /supersede link columns are unavailable/);
    assert.equal(getRecordRow(workspace.dbPath, 'mem-old').status, 'active');
    assert.equal(getRecordRow(workspace.dbPath, 'mem-new').status, 'proposal');
  } finally {
    fs.rmSync(workspace.tempBasePath, { recursive: true, force: true });
  }
});

test('supersede-memory CLI rejects raw workspace_id attempts in low-risk summary', () => {
  const workspace = withTempWorkspace({
    records: [
      { memoryId: 'mem-old', status: 'active', title: 'Old memory' },
      { memoryId: 'mem-new', status: 'proposal', title: 'New memory' }
    ]
  });
  try {
    const result = runCli([...validArgs(), '--workspace-id', 'workspace-a'], workspace);
    const report = parseJsonResult(result);

    assert.equal(result.status, 1);
    assert.equal(report.status, 'error');
    assert.equal(report.mutated, false);
    assert.equal(report.rawWorkspaceIdExposed, false);
    assert.equal(JSON.stringify(report).includes('workspace-a'), false);
  } finally {
    fs.rmSync(workspace.tempBasePath, { recursive: true, force: true });
  }
});

test('supersede-memory CLI keeps public MCP tools unchanged', () => {
  const toolNames = TOOL_DEFINITIONS.map(tool => tool.name).sort();

  assert.deepEqual(toolNames, ['audit_memory', 'memory_overview', 'record_memory', 'search_memory']);
});
