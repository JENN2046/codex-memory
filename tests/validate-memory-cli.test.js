const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const { TOOL_DEFINITIONS } = require('../src/core/constants');

const cliPath = path.join('src', 'cli', 'validate-memory.js');

function createMemoryRecordsTable(dbPath, { withStatus = true } = {}) {
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
        supersedes_memory_id TEXT,
        superseded_by_memory_id TEXT,
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
  status = 'proposal',
  clientId = 'codex',
  visibility = 'project'
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
        ?, 'process', 'Validate candidate', 'Type: checkpoint\\nvalidate CLI candidate', 'seed evidence', '[]',
        1, 0, 'none', NULL, NULL, NULL,
        '2026-05-14T00:00:00.000Z', '2026-05-14T00:00:00.000Z',
        'project-a', 'workspace-a', ?, NULL, NULL, ?, NULL${hasStatus ? ', ?' : ''}
      )
    `;
    const params = hasStatus
      ? [memoryId, clientId, visibility, status]
      : [memoryId, clientId, visibility];
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

function withTempWorkspace({ withStatus = true, records = [] } = {}) {
  const tempBasePath = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-validate-cli-'));
  const dbPath = path.join(tempBasePath, 'data', 'codex-memory.sqlite');
  const auditLogPath = path.join(tempBasePath, 'logs', 'write-audit.jsonl');
  createMemoryRecordsTable(dbPath, { withStatus });
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

function validArgs(memoryId = 'mem-1') {
  return [
    '--json',
    '--memory-id', memoryId,
    '--reason', 'manual review',
    '--evidence', 'manual evidence',
    '--actor-client-id', 'codex',
    '--request-source', 'validate-memory-cli-test'
  ];
}

function parseJsonResult(result) {
  return JSON.parse(result.stdout);
}

test('validate-memory CLI default dry-run returns mutated=false', () => {
  const workspace = withTempWorkspace({
    records: [{ memoryId: 'mem-1', status: 'proposal' }]
  });
  try {
    const result = runCli(validArgs(), workspace);
    const report = parseJsonResult(result);
    const row = getRecordRow(workspace.dbPath, 'mem-1');

    assert.equal(result.status, 0, result.stderr || 'non-zero exit');
    assert.equal(report.status, 'ok');
    assert.equal(report.decision, 'dry-run');
    assert.equal(report.dryRun, true);
    assert.equal(report.mutated, false);
    assert.equal(report.memoryId, 'mem-1');
    assert.equal(report.fromStatus, 'proposal');
    assert.equal(report.toStatus, 'active');
    assert.equal(report.auditPreview.event_type, 'memory_validate');
    assert.equal(report.rawWorkspaceIdExposed, false);
    assert.equal(JSON.stringify(report).includes('workspace-a'), false);
    assert.equal(row.status, 'proposal');
    assert.deepEqual(readAuditEntries(workspace.auditLogPath), []);
  } finally {
    fs.rmSync(workspace.tempBasePath, { recursive: true, force: true });
  }
});

test('validate-memory CLI rejects apply without confirm', () => {
  const workspace = withTempWorkspace({
    records: [{ memoryId: 'mem-1', status: 'proposal' }]
  });
  try {
    const result = runCli([...validArgs(), '--apply'], workspace);
    const report = parseJsonResult(result);

    assert.equal(result.status, 1);
    assert.equal(report.status, 'error');
    assert.equal(report.mutated, false);
    assert.match(report.reason, /--apply requires --confirm/);
    assert.equal(getRecordRow(workspace.dbPath, 'mem-1').status, 'proposal');
  } finally {
    fs.rmSync(workspace.tempBasePath, { recursive: true, force: true });
  }
});

test('validate-memory CLI rejects confirm without apply', () => {
  const workspace = withTempWorkspace({
    records: [{ memoryId: 'mem-1', status: 'proposal' }]
  });
  try {
    const result = runCli([...validArgs(), '--confirm'], workspace);
    const report = parseJsonResult(result);

    assert.equal(result.status, 1);
    assert.equal(report.status, 'error');
    assert.equal(report.mutated, false);
    assert.match(report.reason, /--confirm requires --apply/);
    assert.equal(getRecordRow(workspace.dbPath, 'mem-1').status, 'proposal');
  } finally {
    fs.rmSync(workspace.tempBasePath, { recursive: true, force: true });
  }
});

test('validate-memory CLI rejects apply without json', () => {
  const workspace = withTempWorkspace({
    records: [{ memoryId: 'mem-1', status: 'proposal' }]
  });
  try {
    const args = validArgs().filter(arg => arg !== '--json');
    const result = runCli([...args, '--apply', '--confirm'], workspace);

    assert.equal(result.status, 1);
    assert.match(result.stdout, /--apply requires --json/);
    assert.equal(getRecordRow(workspace.dbPath, 'mem-1').status, 'proposal');
  } finally {
    fs.rmSync(workspace.tempBasePath, { recursive: true, force: true });
  }
});

test('validate-memory CLI rejects unknown tool or mode', () => {
  const workspace = withTempWorkspace({
    records: [{ memoryId: 'mem-1', status: 'proposal' }]
  });
  try {
    const unknownTool = runCli([...validArgs(), '--tool', 'forget_memory'], workspace);
    const unknownToolReport = parseJsonResult(unknownTool);
    const unknownMode = runCli([...validArgs(), '--mode', 'unknown'], workspace);
    const unknownModeReport = parseJsonResult(unknownMode);

    assert.equal(unknownTool.status, 1);
    assert.match(unknownToolReport.reason, /Unknown tool: forget_memory/);
    assert.equal(unknownMode.status, 1);
    assert.match(unknownModeReport.reason, /Unknown mode: unknown/);
    assert.equal(getRecordRow(workspace.dbPath, 'mem-1').status, 'proposal');
  } finally {
    fs.rmSync(workspace.tempBasePath, { recursive: true, force: true });
  }
});

test('validate-memory CLI applies proposal to active in temp fixture DB', () => {
  const workspace = withTempWorkspace({
    records: [{ memoryId: 'mem-1', status: 'proposal' }]
  });
  try {
    const result = runCli([...validArgs(), '--apply', '--confirm'], workspace);
    const report = parseJsonResult(result);
    const row = getRecordRow(workspace.dbPath, 'mem-1');
    const auditEntries = readAuditEntries(workspace.auditLogPath);

    assert.equal(result.status, 0, result.stderr || 'non-zero exit');
    assert.equal(report.status, 'ok');
    assert.equal(report.decision, 'validated');
    assert.equal(report.dryRun, false);
    assert.equal(report.mutated, true);
    assert.equal(report.fromStatus, 'proposal');
    assert.equal(row.status, 'active');
    assert.equal(auditEntries.length, 2);
    assert.equal(auditEntries[0].mutationAuditEvent.audit_phase, 'pending');
    assert.equal(auditEntries[1].mutationAuditEvent.audit_phase, 'committed');
    assert.equal(
      auditEntries[1].mutationAuditEvent.correlation_id,
      auditEntries[0].mutationAuditEvent.event_id
    );
    assert.equal(report.auditEvent.event_type, 'memory_validate');
    assert.equal(report.rawWorkspaceIdExposed, false);
    assert.equal(JSON.stringify(report).includes('workspace-a'), false);
  } finally {
    fs.rmSync(workspace.tempBasePath, { recursive: true, force: true });
  }
});

test('validate-memory CLI applies stale to active in temp fixture DB', () => {
  const workspace = withTempWorkspace({
    records: [{ memoryId: 'mem-1', status: 'stale' }]
  });
  try {
    const result = runCli([...validArgs(), '--apply', '--confirm'], workspace);
    const report = parseJsonResult(result);

    assert.equal(result.status, 0, result.stderr || 'non-zero exit');
    assert.equal(report.decision, 'validated');
    assert.equal(report.fromStatus, 'stale');
    assert.equal(getRecordRow(workspace.dbPath, 'mem-1').status, 'active');
  } finally {
    fs.rmSync(workspace.tempBasePath, { recursive: true, force: true });
  }
});

test('validate-memory CLI rejects forbidden lifecycle states', () => {
  for (const status of ['rejected', 'tombstoned', 'superseded']) {
    const workspace = withTempWorkspace({
      records: [{ memoryId: 'mem-1', status }]
    });
    try {
      const result = runCli([...validArgs(), '--apply', '--confirm'], workspace);
      const report = parseJsonResult(result);

      assert.equal(result.status, 1);
      assert.equal(report.status, 'rejected');
      assert.equal(report.mutated, false);
      assert.match(report.reason, /only allows proposal\/stale -> active/);
      assert.equal(report.auditPreview.event_type, 'memory_validate');
      assert.equal(report.auditPreview.tool_name, 'validate_memory');
      assert.equal(getRecordRow(workspace.dbPath, 'mem-1').status, status);
    } finally {
      fs.rmSync(workspace.tempBasePath, { recursive: true, force: true });
    }
  }
});

test('validate-memory CLI rejects secret-like evidence', () => {
  const workspace = withTempWorkspace({
    records: [{ memoryId: 'mem-1', status: 'proposal' }]
  });
  try {
    const result = runCli([
      '--json',
      '--memory-id', 'mem-1',
      '--reason', 'manual review',
      '--evidence', 'Bearer TEST_VALIDATE_TOKEN_1234567890',
      '--actor-client-id', 'codex',
      '--request-source', 'validate-memory-cli-test',
      '--apply',
      '--confirm'
    ], workspace);
    const report = parseJsonResult(result);

    assert.equal(result.status, 1);
    assert.equal(report.status, 'rejected');
    assert.equal(report.mutated, false);
    assert.match(report.reason, /secret-like content/);
    assert.equal(report.auditPreview.event_type, 'memory_validate');
    assert.equal(JSON.stringify(report).includes('TEST_VALIDATE_TOKEN_1234567890'), false);
    assert.equal(getRecordRow(workspace.dbPath, 'mem-1').status, 'proposal');
    assert.deepEqual(readAuditEntries(workspace.auditLogPath), []);
  } finally {
    fs.rmSync(workspace.tempBasePath, { recursive: true, force: true });
  }
});

test('validate-memory CLI missing lifecycle column fails safe', () => {
  const workspace = withTempWorkspace({
    withStatus: false,
    records: [{ memoryId: 'mem-1' }]
  });
  try {
    const result = runCli([...validArgs(), '--apply', '--confirm'], workspace);
    const report = parseJsonResult(result);

    assert.equal(result.status, 1);
    assert.equal(report.status, 'rejected');
    assert.equal(report.mutated, false);
    assert.match(report.reason, /lifecycle status column is unavailable/);
    assert.equal(Object.hasOwn(getRecordRow(workspace.dbPath, 'mem-1'), 'status'), false);
  } finally {
    fs.rmSync(workspace.tempBasePath, { recursive: true, force: true });
  }
});

test('validate-memory CLI rejects raw workspace_id attempts in low-risk summary', () => {
  const workspace = withTempWorkspace({
    records: [{ memoryId: 'mem-1', status: 'proposal' }]
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

test('validate-memory CLI keeps public MCP tools unchanged', () => {
  const toolNames = TOOL_DEFINITIONS.map(tool => tool.name).sort();

  assert.deepEqual(toolNames, ['memory_overview', 'record_memory', 'search_memory']);
});
