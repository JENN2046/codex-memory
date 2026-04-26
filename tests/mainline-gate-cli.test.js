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

async function writeHelperScript() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-gate-cli-'));
  const helperPath = path.join(tempDir, 'gate-helper.js');
  const content = `'use strict';
const mode = process.argv[2];

function print(value, stream = process.stdout) {
  stream.write(value + '\\n');
}

if (mode === 'compare-ok') {
  print(JSON.stringify({
    summary: {
      ok: true,
      matchedCaseCount: 25,
      mismatchedCaseCount: 0,
      coreMismatchCountTotal: 0
    }
  }));
  process.exit(0);
}

if (mode === 'rollback-ok') {
  print(JSON.stringify({
    summary: {
      ok: true,
      rollbackReady: true,
      readyCaseCount: 25,
      notReadyCaseCount: 0,
      blockerBreakdown: {}
    }
  }));
  process.exit(0);
}

if (mode === 'contract-ok') {
  print('TAP version 13');
  print('1..2');
  print('# tests 2');
  print('# pass 2');
  print('# fail 0');
  process.exit(0);
}

if (mode === 'test-fail') {
  print('TAP version 13');
  print('1..1');
  print('# tests 1');
  print('# pass 0');
  print('# fail 1');
  process.exit(1);
}

print('unknown helper mode: ' + mode, process.stderr);
process.exit(2);
`;
  await fs.writeFile(helperPath, content, 'utf8');
  return { tempDir, helperPath };
}

function runCli({ args = [], env = {} }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['src/cli/mainline-gate.js', ...args], {
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

test('mainline gate CLI should report daily checks in json mode', async () => {
  const server = await startHealthServer();
  const helper = await writeHelperScript();

  try {
    const result = await runCli({
      args: ['--json'],
      env: {
        CODEX_MEMORY_GATE_COMPARE_COMMAND_JSON: JSON.stringify([process.execPath, helper.helperPath, 'compare-ok']),
        CODEX_MEMORY_GATE_ROLLBACK_COMMAND_JSON: JSON.stringify([process.execPath, helper.helperPath, 'rollback-ok']),
        CODEX_MEMORY_GATE_HEALTH_URL: server.healthUrl
      }
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.summary.ok, true);
    assert.equal(payload.summary.mode, 'daily');
    assert.deepEqual(payload.summary.failedChecks, []);
    assert.equal(payload.results.health.status, 'ok');
    assert.equal(payload.results.compare.status, 'ok');
    assert.equal(payload.results.compare.summary.matchedCaseCount, 25);
    assert.equal(payload.results.rollback.status, 'ok');
    assert.equal(payload.results.rollback.summary.rollbackReady, true);
  } finally {
    await server.close();
    await fs.rm(helper.tempDir, { recursive: true, force: true });
  }
});

test('mainline gate CLI should fail strict mode when one gated check fails', async () => {
  const server = await startHealthServer();
  const helper = await writeHelperScript();

  try {
    const result = await runCli({
      args: ['strict', '--json'],
      env: {
        CODEX_MEMORY_GATE_COMPARE_COMMAND_JSON: JSON.stringify([process.execPath, helper.helperPath, 'compare-ok']),
        CODEX_MEMORY_GATE_ROLLBACK_COMMAND_JSON: JSON.stringify([process.execPath, helper.helperPath, 'rollback-ok']),
        CODEX_MEMORY_GATE_CONTRACT_TEST_RUNNER_COMMAND_JSON: JSON.stringify([process.execPath, helper.helperPath, 'contract-ok']),
        CODEX_MEMORY_GATE_TEST_COMMAND_JSON: JSON.stringify([process.execPath, helper.helperPath, 'test-fail']),
        CODEX_MEMORY_GATE_HEALTH_URL: server.healthUrl
      }
    });

    assert.equal(result.code, 1);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.summary.ok, false);
    assert.equal(payload.summary.mode, 'strict');
    assert.deepEqual(payload.summary.failedChecks, ['test']);
    assert.equal(payload.results.contract.status, 'ok');
    assert.equal(payload.results.test.status, 'error');
    assert.equal(payload.results.test.summary.fail, 1);
  } finally {
    await server.close();
    await fs.rm(helper.tempDir, { recursive: true, force: true });
  }
});
