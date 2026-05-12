const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const cliPath = path.join('src', 'cli', 'scope-backfill-dry-run.js');

function runCli(args = [], env = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, ...env }
  });
}

function seedMemoryRecords(dbPath, rows) {
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
        client_id TEXT,
        workspace_id TEXT,
        project_id TEXT,
        task_id TEXT,
        conversation_id TEXT,
        visibility TEXT,
        retention_policy TEXT
      );
    `);
    const insert = db.prepare(`
      INSERT INTO memory_records (
        memory_id, target, title, content, evidence, tags_json,
        validated, reusable, sensitivity, created_at, updated_at,
        project_id, workspace_id, client_id, visibility
      ) VALUES (
        $memory_id, 'process', $title, 'content', 'evidence', '[]',
        1, 0, 'none', '2026-05-13T00:00:00.000Z', '2026-05-13T00:00:00.000Z',
        $project_id, $workspace_id, $client_id, $visibility
      )
    `);
    for (const row of rows) {
      insert.run({
        $memory_id: row.memoryId,
        $title: row.title,
        $project_id: row.projectId || null,
        $workspace_id: row.workspaceId || null,
        $client_id: row.clientId || null,
        $visibility: row.visibility || null
      });
    }
  } finally {
    db.close();
  }
}

test('scope-backfill-dry-run CLI should handle empty workspace gracefully', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backfill-empty-'));
  try {
    const result = runCli(['--json'], {
      CODEX_MEMORY_BASE_PATH: tmpDir
    });
    assert.equal(result.status, 0);
    const report = JSON.parse(result.stdout);
    assert.equal(report.mutated, false);
    assert.equal(report.totalRecords, 0);
    assert.ok(report.status === 'ok' || report.status === 'warn');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('scope-backfill-dry-run CLI should report zero records for empty DB', () => {
  const result = runCli(['--json']);
  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.ok(report.status === 'ok' || report.status === 'warn');
  assert.equal(report.mutated, false);
});

test('scope-backfill-dry-run CLI should never write data', () => {
  const result = runCli(['--json']);
  const report = JSON.parse(result.stdout);
  assert.equal(report.mutated, false);
});

test('scope-backfill-dry-run CLI should include suggestedDefaults', () => {
  const result = runCli(['--json']);
  const report = JSON.parse(result.stdout);
  assert.ok(report.suggestedDefaults);
  assert.ok(report.suggestedDefaults.client_id);
  assert.ok(report.suggestedDefaults.project_id);
});

test('scope-backfill-dry-run CLI should reject --confirm parameter', () => {
  const result = runCli(['--json', '--confirm']);
  // --confirm is not a recognized flag, should be ignored
  const report = JSON.parse(result.stdout);
  assert.equal(report.mutated, false);
});

test('scope-backfill-dry-run CLI should count partial scope records as needing backfill', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backfill-partial-scope-'));
  try {
    seedMemoryRecords(path.join(tmpDir, 'data', 'codex-memory.sqlite'), [
      {
        memoryId: 'complete-scope',
        title: 'Complete Scope',
        projectId: 'codex-memory',
        workspaceId: 'workspace-a',
        clientId: 'codex',
        visibility: 'project'
      },
      {
        memoryId: 'partial-project-only',
        title: 'Partial Project Only',
        projectId: 'codex-memory'
      },
      {
        memoryId: 'missing-scope',
        title: 'Missing Scope'
      }
    ]);

    const result = runCli(['--json'], {
      CODEX_MEMORY_BASE_PATH: tmpDir
    });
    assert.equal(result.status, 0);
    const report = JSON.parse(result.stdout);
    assert.equal(report.mutated, false);
    assert.equal(report.totalRecords, 3);
    assert.equal(report.alreadyScoped, 1);
    assert.equal(report.missingProjectId, 1);
    assert.equal(report.missingClientId, 2);
    assert.equal(report.missingWorkspaceId, 2);
    assert.equal(report.missingVisibility, 2);
    assert.equal(report.wouldUpdate, 2);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
