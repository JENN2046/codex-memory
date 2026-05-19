const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { spawn } = require('node:child_process');

function runGovernanceReport({ args = [], env = {} } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['src/cli/governance-report.js', ...args], {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', chunk => { stderr += chunk.toString('utf8'); });
    child.on('error', reject);
    child.on('close', code => { resolve({ code, stdout, stderr }); });
  });
}

async function seedGovernanceDb(dbPath) {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  try {
    db.exec(`
      CREATE TABLE memory_records (
        memory_id TEXT PRIMARY KEY,
        status TEXT,
        project_id TEXT,
        visibility TEXT,
        client_id TEXT,
        confidence REAL,
        updated_at TEXT,
        superseded_by TEXT,
        supersedes TEXT,
        task_id TEXT,
        retention_policy TEXT
      );
    `);
    const insert = db.prepare(`
      INSERT INTO memory_records (
        memory_id, status, project_id, visibility, client_id, confidence,
        updated_at, superseded_by, supersedes, task_id, retention_policy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run('active-100d', 'active', 'codex-memory', 'project', 'codex', 1.0,
      '2026-01-01T00:00:00.000Z', null, null, 'task-r3', 'permanent');
    insert.run('active-40d', 'active', 'codex-memory', 'shared', 'claude', 0.5,
      '2026-04-01T00:00:00.000Z', null, null, '', 'ttl:30d');
    insert.run('proposal-1', 'proposal', 'codex-memory', 'shared', 'claude', 0.2,
      '2026-05-11T00:00:00.000Z', null, null, null, 'ttl:7d');
    insert.run('tombstone-1', 'tombstoned', null, 'project', 'codex', 0.9,
      '2026-05-10T00:00:00.000Z', null, null, null, 'permanent');
    insert.run('superseded-1', 'superseded', 'agent-image-lab', 'project', 'codex', 0.7,
      '2026-03-01T00:00:00.000Z', 'active-new', null, null, 'session');
    insert.run('active-new', 'active', 'agent-image-lab', 'project', 'codex', null,
      '2026-05-12T00:00:00.000Z', null, 'superseded-1', null, 'long-lived');
  } finally {
    db.close();
  }
}

test('governance-report CLI should summarize proposal/tombstone/supersession/stale metrics in json mode', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-governance-report-'));
  const dbPath = path.join(tempBasePath, 'state', 'governance.sqlite');

  try {
    await seedGovernanceDb(dbPath);
    const result = await runGovernanceReport({
      args: ['--json'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DB_PATH: dbPath
      }
    });

    assert.equal(result.code, 0, result.stderr || 'non-zero exit');
    const payload = JSON.parse(result.stdout);
    assert.deepEqual(Object.keys(payload).sort(), [
      'confidence',
      'destructive',
      'generatedAt',
      'mode',
      'paths',
      'proposals',
      'readPolicy',
      'retention',
      'review',
      'scopeCoverage',
      'staleness',
      'statusDistribution',
      'summary',
      'supersession',
      'tombstoned',
      'totalRecords'
    ]);
    assert.deepEqual(Object.keys(payload.review).sort(), [
      'counts',
      'hints',
      'message',
      'readPolicy',
      'retention',
      'reviewLevel',
      'status',
      'statusDistribution'
    ]);
    assert.equal(payload.mode, 'governance-report');
    assert.equal(payload.destructive, false);
    assert.equal(payload.summary.status, 'ok');
    assert.equal(payload.readPolicy.status, 'config_only_no_recent_audit');
    assert.equal(payload.readPolicy.source, 'config-only-no-recent-audit');
    assert.equal(payload.readPolicy.configEvidenceAvailable, true);
    assert.equal(payload.readPolicy.auditEvidenceAvailable, false);
    assert.equal(payload.readPolicy.readPolicyConfigured, false);
    assert.equal(payload.readPolicy.lifecyclePolicyEnabled, false);
    assert.equal(payload.readPolicy.softReadPolicyEnabled, false);
    assert.deepEqual(payload.readPolicy.lifecycleIncludedStatuses, ['active', 'stale']);
    assert.deepEqual(payload.readPolicy.lifecycleExcludedStatuses, ['proposal', 'rejected', 'superseded', 'tombstoned']);
    assert.equal(payload.readPolicy.rawWorkspaceIdExposed, false);
    assert.equal(payload.readPolicy.noProvider, true);
    assert.equal(payload.readPolicy.mutated, false);
    assert.equal(payload.readPolicy.migrationApplied, false);
    assert.equal(payload.review.readPolicy.rawWorkspaceIdExposed, false);
    assert.equal(payload.paths.dbPath, dbPath);
    assert.equal(payload.totalRecords, 6);
    assert.deepEqual(payload.statusDistribution, {
      active: 3,
      proposal: 1,
      tombstoned: 1,
      superseded: 1
    });
    assert.equal(payload.scopeCoverage.scopeFilledRecords, 5);
    assert.equal(payload.scopeCoverage.scopeNullRecords, 1);
    assert.equal(payload.scopeCoverage.taskScopedRecords, 1);
    assert.equal(payload.scopeCoverage.project['codex-memory'], 3);
    assert.equal(payload.scopeCoverage.project['agent-image-lab'], 2);
    assert.equal(payload.scopeCoverage.project['(unset)'], 1);
    assert.equal(payload.scopeCoverage.client.codex, 4);
    assert.equal(payload.scopeCoverage.client.claude, 2);
    assert.equal(payload.confidence.high, 2);
    assert.equal(payload.confidence.medium, 2);
    assert.equal(payload.confidence.low, 1);
    assert.equal(payload.staleness.activeNotUpdated30d, 2);
    assert.equal(payload.staleness.activeNotUpdated90d, 1);
    assert.equal(payload.supersession.supersededRecords, 1);
    assert.equal(payload.supersession.supersessionInitiated, 1);
    assert.equal(payload.tombstoned, 1);
    assert.equal(payload.proposals, 1);
    assert.equal(payload.retention.permanent, 2);
    assert.equal(payload.retention['ttl:30d'], 1);
    assert.equal(payload.retention['ttl:7d'], 1);
    assert.equal(payload.retention.session, 1);
    assert.equal(payload.retention['long-lived'], 1);
    assert.equal(payload.review.status, 'warn');
    assert.equal(payload.review.reviewLevel, 'needs-review');
    assert.equal(payload.review.counts.totalRecords, 6);
    assert.equal(payload.review.counts.proposalCount, 1);
    assert.equal(payload.review.counts.tombstonedCount, 1);
    assert.equal(payload.review.counts.supersededCount, 1);
    assert.equal(payload.review.counts.supersessionInitiated, 1);
    assert.equal(payload.review.counts.stale30d, 2);
    assert.equal(payload.review.counts.stale90d, 1);
    assert.ok(payload.review.hints.some(hint => hint.includes('proposal')));
    assert.equal(JSON.stringify(payload).includes('workspace_id'), false);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('governance-report CLI should surface recent read-policy audit evidence when present', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-governance-report-'));
  const dbPath = path.join(tempBasePath, 'state', 'governance.sqlite');
  const recallLogPath = path.join(tempBasePath, 'logs', 'recall.jsonl');

  try {
    await seedGovernanceDb(dbPath);
    await fs.mkdir(path.dirname(recallLogPath), { recursive: true });
    await fs.writeFile(recallLogPath, `${JSON.stringify({
      recallType: 'read-policy',
      readPolicyApplied: true,
      lifecyclePolicyApplied: true,
      hiddenByLifecycleCount: 2,
      staleResultCount: 1,
      lifecycleColumnAvailable: true,
      scopeWorkspacePresent: true
    })}\n`, 'utf8');

    const result = await runGovernanceReport({
      args: ['--json'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DB_PATH: dbPath,
        CODEX_MEMORY_RECALL_LOG: recallLogPath
      }
    });

    assert.equal(result.code, 0, result.stderr || 'non-zero exit');
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.readPolicy.status, 'ok');
    assert.equal(payload.readPolicy.source, 'config-and-recent-recall-audit');
    assert.equal(payload.readPolicy.configEvidenceAvailable, true);
    assert.equal(payload.readPolicy.auditEvidenceAvailable, true);
    assert.equal(payload.readPolicy.recentReadPolicyAuditCount, 1);
    assert.equal(payload.readPolicy.recentReadPolicyAppliedCount, 1);
    assert.equal(payload.readPolicy.recentLifecyclePolicyAppliedCount, 1);
    assert.equal(payload.readPolicy.recentHiddenByLifecycleCount, 2);
    assert.equal(payload.readPolicy.recentStaleResultCount, 1);
    assert.equal(payload.readPolicy.lifecycleColumnAvailable, true);
    assert.equal(payload.readPolicy.scopeWorkspacePresent, true);
    assert.equal(payload.review.readPolicy.status, 'ok');
    assert.equal(payload.review.readPolicy.auditEvidenceAvailable, true);
    assert.equal(JSON.stringify(payload).includes('workspace_id'), false);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('governance-report CLI should emit readable text output by default', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-governance-report-'));
  const dbPath = path.join(tempBasePath, 'data', 'codex-memory.sqlite');

  try {
    await seedGovernanceDb(dbPath);
    const result = await runGovernanceReport({
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DATA_DIR: path.join(tempBasePath, 'data')
      }
    });

    assert.equal(result.code, 0, result.stderr || 'non-zero exit');
    assert.match(result.stdout, /Governance Report/);
    assert.match(result.stdout, /Status: ok/);
    assert.match(result.stdout, /Review:/);
    assert.match(result.stdout, /read-policy:/);
    assert.match(result.stdout, /level:\s+needs-review/);
    assert.match(result.stdout, /Staleness:/);
    assert.match(result.stdout, /proposals:\s+1/);
    assert.match(result.stdout, /tombstoned:\s+1/);
    assert.equal(result.stdout.includes('workspace_id'), false);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('governance-report CLI should fail cleanly when the database is missing', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-governance-report-'));
  const dbPath = path.join(tempBasePath, 'missing', 'codex-memory.sqlite');

  try {
    const result = await runGovernanceReport({
      args: ['--json'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_DB_PATH: dbPath
      }
    });

    assert.equal(result.code, 1, 'missing database should return non-zero exit');
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.mode, 'governance-report');
    assert.equal(payload.destructive, false);
    assert.equal(payload.summary.status, 'error');
    assert.match(payload.summary.message, /Database not found/);
    assert.equal(payload.paths.dbPath, dbPath);
    assert.equal(payload.readPolicy.rawWorkspaceIdExposed, false);
    assert.equal(payload.review.status, 'error');
    assert.equal(payload.review.reviewLevel, 'unavailable');
    assert.equal(payload.review.counts.totalRecords, 0);
    assert.equal(payload.review.readPolicy.status, 'config_only_no_recent_audit');
    assert.equal(payload.review.readPolicy.configEvidenceAvailable, true);
    assert.equal(payload.review.readPolicy.auditEvidenceAvailable, false);
    assert.equal(payload.review.readPolicy.rawWorkspaceIdExposed, false);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});
