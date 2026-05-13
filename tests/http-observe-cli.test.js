const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');

async function startHealthServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        name: 'vcp_codex_memory',
        version: '0.1.0',
        protocol: 'streamable-http',
        path: '/mcp/codex-memory'
      }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false }));
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  return {
    healthUrl: `http://127.0.0.1:${address.port}/health`,
    async close() {
      await new Promise(resolve => server.close(resolve));
    }
  };
}

async function seedRuntimeArtifacts(basePath) {
  const logsDir = path.join(basePath, 'logs');
  await fs.mkdir(logsDir, { recursive: true });
  const dataDir = path.join(basePath, 'data');
  await fs.mkdir(dataDir, { recursive: true });

  await fs.writeFile(
    path.join(logsDir, 'codex-memory-http.log'),
    [
      '[2026-04-23T09:00:00.000Z] INFO vcp_codex_memory HTTP MCP listening on http://127.0.0.1:7605/mcp/codex-memory',
      '[2026-04-23T09:01:00.000Z] INFO heartbeat ok'
    ].join('\n'),
    'utf8'
  );

  await fs.writeFile(
    path.join(logsDir, 'codex-memory-http-watchdog.log'),
    [
      '[2026-04-23T09:02:00.000Z] INFO watchdog started (interval=120s, once=False)',
      '[2026-04-23T09:03:00.000Z] WARN service recovered: codex-memory HTTP MCP started (pid=1234) at http://127.0.0.1:7605/health'
    ].join('\n'),
    'utf8'
  );

  await fs.writeFile(
    path.join(logsDir, 'codex-memory-bridge.jsonl'),
    [
      JSON.stringify({
        timestamp: '2026-04-23T09:10:00.000Z',
        decision: 'accepted',
        target: 'process',
        title: 'checkpoint one',
        memoryId: 'memory-1'
      }),
      JSON.stringify({
        timestamp: '2026-04-23T09:11:00.000Z',
        decision: 'rejected',
        target: 'knowledge',
        title: 'checkpoint two',
        memoryId: 'memory-2'
      })
    ].join('\n'),
    'utf8'
  );

  await fs.writeFile(
    path.join(logsDir, 'codex-memory-recall.jsonl'),
    [
      JSON.stringify({
        timestamp: '2026-04-23T09:12:00.000Z',
        target: 'process',
        recallType: 'snippet',
        resultCount: 2,
        topMemoryId: 'memory-1',
        topSourceFile: 'Codex/checkpoint one.txt',
        scopeApplied: true,
        scopeMode: 'sql-candidate+post-filter',
        scopeDimensions: ['project_id', 'visibility'],
        scopeStrict: true,
        scopeProjectId: 'codex-memory',
        scopeClientId: 'codex',
        scopeVisibility: ['shared'],
        scopeWorkspacePresent: true,
        readPolicyApplied: true,
        lifecyclePolicyApplied: true,
        lifecycleIncludedStatuses: ['active', 'stale'],
        lifecycleExcludedStatuses: ['proposal', 'rejected', 'superseded', 'tombstoned'],
        hiddenByLifecycleCount: 3,
        staleResultCount: 1,
        lifecycleColumnAvailable: true
      })
    ].join('\n'),
    'utf8'
  );

  const dbPath = path.join(dataDir, 'codex-memory.sqlite');
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE memory_records (
      id TEXT PRIMARY KEY,
      status TEXT,
      updated_at TEXT,
      project_id TEXT,
      visibility TEXT,
      client_id TEXT,
      task_id TEXT,
      confidence REAL,
      superseded_by TEXT,
      supersedes TEXT,
      retention_policy TEXT
    );
  `);
  const now = new Date('2026-04-23T09:20:00.000Z');
  const stale45d = new Date(now.getTime() - 45 * 86400000).toISOString();
  const stale120d = new Date(now.getTime() - 120 * 86400000).toISOString();
  const fresh = new Date(now.getTime() - 2 * 86400000).toISOString();
  const insert = db.prepare(`
    INSERT INTO memory_records (
      id, status, updated_at, project_id, visibility, client_id, task_id,
      confidence, superseded_by, supersedes, retention_policy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insert.run('memory-active-stale-90', 'active', stale120d, 'codex-memory', 'shared', 'codex', 'task-1', 0.91, null, null, 'retain');
  insert.run('memory-active-stale-30', 'active', stale45d, 'codex-memory', 'shared', 'codex', '', 0.72, null, null, 'retain');
  insert.run('memory-proposal', 'proposal', fresh, 'codex-memory', 'shared', 'codex', 'task-2', 0.66, null, null, 'review');
  insert.run('memory-tombstone', 'tombstoned', fresh, 'codex-memory', 'private', 'codex', 'task-3', 0.4, null, null, 'retain');
  insert.run('memory-superseded', 'active', fresh, 'codex-memory', 'shared', 'codex', 'task-4', 0.88, 'memory-newer', null, 'retain');
  insert.run('memory-newer', 'active', fresh, 'codex-memory', 'shared', 'codex', 'task-5', 0.93, null, 'memory-superseded', 'retain');
  db.close();
}

function runCli({ args = [], env = {} }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['src/cli/http-observe.js', ...args], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...env
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', reject);
    child.on('close', code => {
      resolve({ code, stdout, stderr });
    });
  });
}

function assertKeySet(value, expected, label) {
  assert.deepEqual(Object.keys(value).sort(), expected, `${label} keys`);
}

test('http-observe CLI should summarize runtime health, logs, and audits in json mode', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-observe-'));
  const server = await startHealthServer();
  await seedRuntimeArtifacts(tempBasePath);

  try {
    const result = await runCli({
      args: ['--json'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_HTTP_LOG: path.join(tempBasePath, 'logs', 'codex-memory-http.log'),
        CODEX_MEMORY_AUDIT_LOG: path.join(tempBasePath, 'logs', 'codex-memory-bridge.jsonl'),
        CODEX_MEMORY_RECALL_LOG: path.join(tempBasePath, 'logs', 'codex-memory-recall.jsonl'),
        CODEX_MEMORY_HTTP_HOST: '127.0.0.1',
        CODEX_MEMORY_HTTP_PORT: String(new URL(server.healthUrl).port)
      }
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assertKeySet(payload, [
      'audits',
      'config',
      'generatedAt',
      'governance',
      'health',
      'logs',
      'readPolicy',
      'summary'
    ], 'http-observe top-level');
    assertKeySet(payload.summary, [
      'bridgeRecentCount',
      'governanceProposalCount',
      'governanceReviewLevel',
      'governanceStale30d',
      'governanceStale90d',
      'governanceStatus',
      'healthStatus',
      'hiddenByLifecycleCount',
      'hints',
      'httpLogErrorCount',
      'lifecycleColumnAvailable',
      'lifecyclePolicyAppliedCount',
      'lifecyclePolicyEnabled',
      'message',
      'rawWorkspaceIdExposed',
      'readPolicyStatus',
      'recallRecentCount',
      'scopedRecallCount',
      'softReadPolicyEnabled',
      'staleResultCount',
      'status',
      'strictScopedRecallCount',
      'watchdogEnsureFailureCount',
      'watchdogRecoveryCount'
    ], 'http-observe summary');
    assertKeySet(payload.health, [
      'durationMs',
      'error',
      'httpStatus',
      'payload',
      'status',
      'url'
    ], 'http-observe health');
    assertKeySet(payload.config, [
      'httpHost',
      'httpMcpPath',
      'httpPort',
      'logsDir'
    ], 'http-observe config');
    assertKeySet(payload.logs, ['http', 'watchdog'], 'http-observe logs');
    assertKeySet(payload.logs.http, [
      'errorCount',
      'exists',
      'infoCount',
      'lastLine',
      'lastModified',
      'lineCount',
      'listening',
      'path',
      'size',
      'tail'
    ], 'http-observe http log');
    assertKeySet(payload.logs.watchdog, [
      'duplicateCount',
      'ensureFailureCount',
      'exists',
      'lastLine',
      'lastModified',
      'lineCount',
      'path',
      'recoveryCount',
      'size',
      'tail'
    ], 'http-observe watchdog log');
    assert.equal(payload.summary.status, 'warn');
    assert.equal(payload.health.status, 'ok');
    assert.equal(payload.logs.http.listening, true);
    assert.equal(payload.logs.watchdog.recoveryCount, 1);
    assert.deepEqual(payload.audits.write.decisionBreakdown, {
      accepted: 1,
      rejected: 1
    });
    assertKeySet(payload.audits, ['recall', 'write'], 'http-observe audits');
    assertKeySet(payload.audits.write, [
      'decisionBreakdown',
      'exists',
      'lastAcceptedAt',
      'lastModified',
      'lastRejectedAt',
      'path',
      'recentCount',
      'recentEntries',
      'size'
    ], 'http-observe write audit');
    assertKeySet(payload.audits.write.recentEntries[0], [
      'decision',
      'memoryId',
      'target',
      'timestamp',
      'title'
    ], 'http-observe write audit entry');
    assert.deepEqual(payload.audits.recall.recallTypeBreakdown, {
      snippet: 1
    });
    assertKeySet(payload.audits.recall, [
      'clientBreakdown',
      'exists',
      'lastModified',
      'lastRecallAt',
      'latestScopedHitAt',
      'path',
      'projectBreakdown',
      'recallTypeBreakdown',
      'recentCount',
      'recentEntries',
      'scopeDimensionBreakdown',
      'scopeModeBreakdown',
      'scopedRecallCount',
      'size',
      'strictScopedRecallCount',
      'visibilityBreakdown'
    ], 'http-observe recall audit');
    assertKeySet(payload.audits.recall.recentEntries[0], [
      'recallType',
      'resultCount',
      'target',
      'timestamp',
      'topMemoryId',
      'topSourceFile'
    ], 'http-observe recall audit entry');
    assert.equal(payload.summary.scopedRecallCount, 1);
    assert.equal(payload.summary.strictScopedRecallCount, 1);
    assert.equal(payload.summary.lifecyclePolicyEnabled, false);
    assert.equal(payload.summary.softReadPolicyEnabled, false);
    assert.equal(payload.summary.readPolicyStatus, 'ok');
    assert.equal(payload.summary.lifecyclePolicyAppliedCount, 1);
    assert.equal(payload.summary.hiddenByLifecycleCount, 3);
    assert.equal(payload.summary.staleResultCount, 1);
    assert.equal(payload.summary.lifecycleColumnAvailable, true);
    assert.equal(payload.summary.rawWorkspaceIdExposed, false);
    assert.equal(payload.summary.governanceStatus, 'warn');
    assert.equal(payload.summary.governanceReviewLevel, 'needs-review');
    assert.equal(payload.summary.governanceProposalCount, 1);
    assert.equal(payload.summary.governanceStale30d, 2);
    assert.equal(payload.summary.governanceStale90d, 1);
    assert.equal(payload.audits.recall.scopedRecallCount, 1);
    assert.equal(payload.audits.recall.strictScopedRecallCount, 1);
    assert.deepEqual(payload.audits.recall.scopeModeBreakdown, {
      'sql-candidate+post-filter': 1
    });
    assert.deepEqual(payload.audits.recall.scopeDimensionBreakdown, {
      project_id: 1,
      visibility: 1
    });
    assertKeySet(payload.readPolicy, [
      'lifecycleColumnAvailable',
      'lifecycleExcludedStatuses',
      'lifecycleIncludedStatuses',
      'lifecyclePolicyEnabled',
      'migrationApplied',
      'mutated',
      'noProvider',
      'rawWorkspaceIdExposed',
      'recentHiddenByLifecycleCount',
      'recentLifecyclePolicyAppliedCount',
      'recentReadPolicyAppliedCount',
      'recentReadPolicyAuditCount',
      'recentStaleResultCount',
      'scopeWorkspacePresent',
      'softReadPolicyEnabled',
      'source',
      'status'
    ], 'http-observe read policy');
    assert.deepEqual(payload.readPolicy.lifecycleIncludedStatuses, ['active', 'stale']);
    assert.deepEqual(payload.readPolicy.lifecycleExcludedStatuses, ['proposal', 'rejected', 'superseded', 'tombstoned']);
    assert.equal(payload.readPolicy.recentHiddenByLifecycleCount, 3);
    assert.equal(payload.readPolicy.recentStaleResultCount, 1);
    assert.equal(payload.readPolicy.lifecycleColumnAvailable, true);
    assert.equal(payload.readPolicy.scopeWorkspacePresent, true);
    assert.equal(payload.readPolicy.rawWorkspaceIdExposed, false);
    assert.equal(payload.readPolicy.noProvider, true);
    assert.equal(payload.readPolicy.mutated, false);
    assert.equal(payload.readPolicy.migrationApplied, false);
    assert.equal(payload.governance.status, 'warn');
    assertKeySet(payload.governance, [
      'counts',
      'hints',
      'message',
      'paths',
      'readPolicy',
      'retention',
      'reviewLevel',
      'sourceStatus',
      'status',
      'statusDistribution'
    ], 'http-observe governance');
    assertKeySet(payload.governance.counts, [
      'proposalCount',
      'stale30d',
      'stale90d',
      'supersededCount',
      'supersessionInitiated',
      'tombstonedCount',
      'totalRecords'
    ], 'http-observe governance counts');
    assert.equal(payload.governance.reviewLevel, 'needs-review');
    assert.equal(payload.governance.readPolicy.rawWorkspaceIdExposed, false);
    assert.equal(payload.governance.counts.proposalCount, 1);
    assert.equal(payload.governance.counts.tombstonedCount, 1);
    assert.equal(payload.governance.counts.supersededCount, 1);
    assert.equal(payload.governance.counts.supersessionInitiated, 1);
    assert.equal(payload.governance.counts.stale30d, 2);
    assert.equal(payload.governance.counts.stale90d, 1);
    assert.ok(Array.isArray(payload.governance.hints));
    assert.equal(payload.audits.recall.rawWorkspaceId, undefined);
    assert.equal(JSON.stringify(payload).includes('workspace_id'), false);
  } finally {
    await server.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('http-observe CLI should fail when health is unavailable', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-observe-error-'));
  await seedRuntimeArtifacts(tempBasePath);

  try {
    const result = await runCli({
      args: ['--json', '--health-url', 'http://127.0.0.1:1/health'],
      env: {
        CODEX_MEMORY_BASE_PATH: tempBasePath,
        CODEX_MEMORY_LOGS_DIR: 'logs',
        CODEX_MEMORY_HTTP_LOG: path.join(tempBasePath, 'logs', 'codex-memory-http.log'),
        CODEX_MEMORY_AUDIT_LOG: path.join(tempBasePath, 'logs', 'codex-memory-bridge.jsonl'),
        CODEX_MEMORY_RECALL_LOG: path.join(tempBasePath, 'logs', 'codex-memory-recall.jsonl')
      }
    });

    assert.equal(result.code, 1);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.summary.status, 'error');
    assert.equal(payload.health.status, 'error');
    assert.match(payload.summary.hints[0], /start:http:ensure/);
    assert.equal(payload.readPolicy.rawWorkspaceIdExposed, false);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});
