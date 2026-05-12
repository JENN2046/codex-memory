const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');

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
  await fs.mkdir(path.join(basePath, 'data'), { recursive: true });

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
        scopeWorkspacePresent: true
      })
    ].join('\n'),
    'utf8'
  );
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
    assert.equal(payload.summary.status, 'warn');
    assert.equal(payload.health.status, 'ok');
    assert.equal(payload.logs.http.listening, true);
    assert.equal(payload.logs.watchdog.recoveryCount, 1);
    assert.deepEqual(payload.audits.write.decisionBreakdown, {
      accepted: 1,
      rejected: 1
    });
    assert.deepEqual(payload.audits.recall.recallTypeBreakdown, {
      snippet: 1
    });
    assert.equal(payload.summary.scopedRecallCount, 1);
    assert.equal(payload.summary.strictScopedRecallCount, 1);
    assert.equal(payload.audits.recall.scopedRecallCount, 1);
    assert.equal(payload.audits.recall.strictScopedRecallCount, 1);
    assert.deepEqual(payload.audits.recall.scopeModeBreakdown, {
      'sql-candidate+post-filter': 1
    });
    assert.deepEqual(payload.audits.recall.scopeDimensionBreakdown, {
      project_id: 1,
      visibility: 1
    });
    assert.equal(payload.audits.recall.rawWorkspaceId, undefined);
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
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});
