const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

async function startLegacyServer() {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8' });
    res.end(': connected rollback-test\n\n');
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}/mcp/legacy-memory`,
    async close() {
      await new Promise(resolve => server.close(resolve));
    }
  };
}

function runCli({ args = [], env = {} }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['src/cli/mainline-rollback.js', ...args], {
      cwd: 'A:\\codex-memory',
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

test('mainline rollback CLI should inspect current config and generate an http rollback patch', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-rollback-plan-'));
  const configPath = path.join(tempDir, 'config.toml');
  const legacyServer = await startLegacyServer();
  await fs.writeFile(
    configPath,
    [
      'model = "gpt-5.4"',
      '',
      '[mcp_servers.vcp_codex_memory]',
      'url = "http://127.0.0.1:7605/mcp/codex-memory"',
      'startup_timeout_sec = 15',
      'tool_timeout_sec = 90',
      'required = true',
      'enabled = true'
    ].join('\n'),
    'utf8'
  );

  try {
    const result = await runCli({
      args: [
        '--json',
        '--config-path', configPath,
        '--legacy-url', legacyServer.url
      ]
    });

    assert.equal(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.summary.status, 'ok');
    assert.equal(payload.current.mode, 'http');
    assert.equal(payload.current.url, 'http://127.0.0.1:7605/mcp/codex-memory');
    assert.equal(payload.rollbackTarget.mode, 'http');
    assert.equal(payload.summary.rollbackTargetReachable, true);
    assert.equal(payload.rollbackTarget.url, legacyServer.url);
    assert.match(payload.rollbackPatch, new RegExp(legacyServer.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  } finally {
    await legacyServer.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('mainline rollback CLI should auto-discover a VCPToolBox legacy target from config.env', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-rollback-plan-discover-'));
  const configPath = path.join(tempDir, 'config.toml');
  const vcpToolBoxPath = path.join(tempDir, 'VCPToolBox');
  await fs.mkdir(vcpToolBoxPath, { recursive: true });
  await fs.writeFile(
    path.join(vcpToolBoxPath, 'config.env'),
    'PORT=9\n',
    'utf8'
  );
  await fs.writeFile(
    configPath,
    [
      '[mcp_servers.vcp_codex_memory]',
      'url = "http://127.0.0.1:7605/mcp/codex-memory"',
      'startup_timeout_sec = 15',
      'tool_timeout_sec = 90',
      'required = true',
      'enabled = true'
    ].join('\n'),
    'utf8'
  );

  try {
    const result = await runCli({
      args: [
        '--json',
        '--config-path', configPath,
        '--legacy-vcptoolbox-path', vcpToolBoxPath
      ]
    });

    assert.equal(result.code, 1);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.summary.status, 'warn');
    assert.equal(payload.summary.rollbackTargetReady, true);
    assert.equal(payload.summary.rollbackTargetReachable, false);
    assert.equal(payload.rollbackTarget.mode, 'http');
    assert.equal(payload.rollbackTarget.source, 'vcptoolbox-config.env');
    assert.equal(payload.rollbackTarget.url, 'http://127.0.0.1:9/mcp/codex-memory');
    assert.match(payload.rollbackPatch, /http:\/\/127\.0\.0\.1:9\/mcp\/codex-memory/);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('mainline rollback CLI should warn when no rollback target is configured', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-rollback-plan-missing-'));
  const configPath = path.join(tempDir, 'config.toml');
  await fs.writeFile(
    configPath,
    [
      '[mcp_servers.vcp_codex_memory]',
      'command = "C:\\\\Program Files\\\\nodejs\\\\node.exe"',
      'args = ["A:\\\\codex-memory\\\\src\\\\index.js"]',
      'cwd = "A:\\\\codex-memory"',
      'startup_timeout_sec = 15',
      'tool_timeout_sec = 90',
      'required = true',
      'enabled = true'
    ].join('\n'),
    'utf8'
  );

  try {
    const result = await runCli({
      args: ['--json', '--config-path', configPath, '--legacy-vcptoolbox-path', path.join(tempDir, 'missing-vcptoolbox')]
    });

    assert.equal(result.code, 1);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.summary.status, 'warn');
    assert.equal(payload.summary.rollbackTargetReady, false);
    assert.equal(payload.summary.rollbackTargetReachable, null);
    assert.equal(payload.current.mode, 'stdio');
    assert.equal(payload.rollbackTarget, null);
    assert.equal(payload.rollbackPatch, '');
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
