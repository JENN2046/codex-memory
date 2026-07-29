const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const readme = fs.readFileSync('README.md', 'utf8');
const wslNewApiServiceScript = fs.readFileSync(
  'scripts/codex-mcp-vcp-native-wsl-newapi-service.sh',
  'utf8'
);

test('package exposes governed VCP native shim and acceptance operator entries', () => {
  assert.equal(
    pkg.scripts['vcp-native:shim'],
    'node ./src/cli/vcp-toolbox-native-mcp-shim.js'
  );
  assert.equal(
    pkg.scripts['vcp-native:acceptance'],
    'node ./src/cli/governed-vcp-native-acceptance.js'
  );
  assert.equal(
    pkg.bin['codex-memory-vcp-toolbox-native-mcp-shim'],
    './src/cli/vcp-toolbox-native-mcp-shim.js'
  );
  assert.equal(
    pkg.bin['codex-memory-governed-vcp-native-acceptance'],
    './src/cli/governed-vcp-native-acceptance.js'
  );
});

test('README documents low-disclosure governed VCP native live proof path', () => {
  assert.equal(readme.includes('npm run vcp-native:shim'), true);
  assert.equal(readme.includes('npm run vcp-native:acceptance'), true);
  assert.equal(readme.includes('--include-read-suite'), true);
  assert.equal(readme.includes('search_memory` / `memory_overview` / `audit_memory'), true);
  assert.equal(readme.includes('--enable-write'), true);
  assert.equal(readme.includes('accepted=true'), true);
  assert.equal(readme.includes('governanceEvidenceMatrix'), true);
  assert.equal(readme.includes('localMemoryAuxiliaryEvidence'), true);
  assert.equal(readme.includes('--verify-evidence'), true);
  assert.equal(readme.includes('validateGovernedVcpNativeAcceptanceEvidenceArtifact'), true);
  assert.equal(readme.includes('native memory performed'), true);
  assert.equal(readme.includes('writeRollbackEvidence'), true);
  assert.equal(readme.includes('不会返回 rollback plan reference 或 raw rollback plan'), true);
  assert.equal(readme.includes('不写 endpoint、token、raw request/response、raw memory、raw audit 或 output path'), true);
});

test('managed WSL NewAPI service exports shim endpoint under createConfig key', () => {
  assert.equal(
    wslNewApiServiceScript.includes(
      'CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_ENDPOINT="http://$shim_host:$shim_port/mcp/vcp-native"'
    ),
    true
  );
  assert.equal(
    wslNewApiServiceScript.includes('CODEX_MEMORY_GOVERNED_MCP_VCP_NATIVE_HTTP_MCP_ENDPOINT='),
    false
  );
});

test('managed WSL NewAPI service binds one managed bearer token to both servers and the native client', () => {
  assert.equal(
    wslNewApiServiceScript.includes(
      'CODEX_MEMORY_VCP_NATIVE_HTTP_TOKEN="$CODEX_MEMORY_HTTP_TOKEN"'
    ),
    true
  );
  assert.equal(
    wslNewApiServiceScript.includes(
      'CODEX_MEMORY_HTTP_TOKEN="$CODEX_MEMORY_HTTP_TOKEN"'
    ),
    true
  );
  assert.equal(
    wslNewApiServiceScript.includes(
      'CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_TOKEN="$CODEX_MEMORY_HTTP_TOKEN"'
    ),
    true
  );
  assert.equal(
    wslNewApiServiceScript.includes('echo "$CODEX_MEMORY_HTTP_TOKEN"'),
    false
  );
  assert.equal(
    wslNewApiServiceScript.includes('echo "$CODEX_MEMORY_VCP_NATIVE_HTTP_TOKEN"'),
    false
  );
  assert.equal(
    wslNewApiServiceScript.includes('echo "$CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_TOKEN"'),
    false
  );
});

test('legacy WSL NewAPI supervisor cannot start the schema-v6 canonical endpoint', () => {
  assert.equal(
    wslNewApiServiceScript.includes('canonical_mcp_port=7625'),
    true
  );
  assert.equal(
    wslNewApiServiceScript.includes(
      'require_compatibility_start_topology'
    ),
    true
  );
  assert.equal(
    wslNewApiServiceScript.includes(
      'only the loopback 7605/7615 compatibility topology is allowed.'
    ),
    true
  );
  const commandDispatch = wslNewApiServiceScript.slice(
    wslNewApiServiceScript.indexOf('case "$command_name" in')
  );
  assert.match(
    commandDispatch,
    /start\)\s+require_compatibility_start_topology\s+start_service/u
  );
  assert.match(
    commandDispatch,
    /restart\)\s+require_compatibility_start_topology\s+stop_service/u
  );
  assert.doesNotMatch(
    commandDispatch,
    /status\)\s+require_compatibility_start_topology/u
  );
  assert.doesNotMatch(
    commandDispatch,
    /stop\)\s+require_compatibility_start_topology/u
  );

  const serviceScript = path.resolve(
    'scripts/codex-mcp-vcp-native-wsl-newapi-service.sh'
  );
  for (const [command, mcpPort, shimPort, mcpHost, shimHost] of [
    ['start', '7625', '7615', '127.0.0.1', '127.0.0.1'],
    ['start', '07625', '7615', '127.0.0.1', '127.0.0.1'],
    ['restart', '7625', '7615', '127.0.0.1', '127.0.0.1'],
    ['start', '7605', '7625', '127.0.0.1', '127.0.0.1'],
    ['start', '7605', '07625', '127.0.0.1', '127.0.0.1'],
    ['start', '07605', '7615', '127.0.0.1', '127.0.0.1'],
    ['start', '7605', '07615', '127.0.0.1', '127.0.0.1'],
    ['start', '7605', '7615', '0.0.0.0', '127.0.0.1'],
    ['start', '7605', '7615', '127.0.0.1', '0.0.0.0'],
    ['start', 'not-a-port', '7615', '127.0.0.1', '127.0.0.1'],
    ['start', '65536', '7615', '127.0.0.1', '127.0.0.1']
  ]) {
    const runtimeDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'codex-memory-legacy-guard-')
    );
    try {
      const result = spawnSync('bash', [serviceScript, command], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          PATH: process.env.PATH,
          CODEX_MEMORY_HTTP_HOST: mcpHost,
          CODEX_MEMORY_HTTP_PORT: mcpPort,
          CODEX_MEMORY_VCP_NATIVE_SERVICE_DIR: runtimeDir,
          SHIM_HOST: shimHost,
          SHIM_PORT: shimPort
        }
      });
      assert.equal(
        result.status,
        2,
        `${command} mcp=${mcpHost}:${mcpPort} shim=${shimHost}:${shimPort}`
      );
      assert.match(result.stderr, /Refusing legacy start:/u);
      assert.deepEqual(fs.readdirSync(runtimeDir), []);
    } finally {
      fs.rmSync(runtimeDir, { recursive: true, force: true });
    }
  }
});

test('legacy stop and restart reject a live PID without exact supervisor identity', () => {
  const serviceScript = path.resolve(
    'scripts/codex-mcp-vcp-native-wsl-newapi-service.sh'
  );
  for (const command of ['stop', 'restart']) {
    const runtimeDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'codex-memory-legacy-stop-')
    );
    const runDir = path.join(runtimeDir, 'run');
    fs.mkdirSync(runDir, { mode: 0o700 });
    fs.chmodSync(runtimeDir, 0o700);
    fs.chmodSync(runDir, 0o700);
    const unrelated = spawn('sleep', ['30'], {
      detached: true,
      stdio: 'ignore'
    });
    unrelated.unref();
    const pidFile = path.join(runDir, 'codex-memory-http.pid');
    fs.writeFileSync(pidFile, `${unrelated.pid}\n`, { mode: 0o600 });
    try {
      const result = spawnSync('bash', [serviceScript, command], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          PATH: process.env.PATH,
          CODEX_MEMORY_HTTP_HOST: '127.0.0.1',
          CODEX_MEMORY_HTTP_PORT: '7605',
          CODEX_MEMORY_VCP_NATIVE_SERVICE_DIR: runtimeDir,
          SHIM_HOST: '127.0.0.1',
          SHIM_PORT: '7615'
        }
      });
      assert.equal(result.status, 2, command);
      assert.match(
        result.stderr,
        /process identity is not the legacy supervisor/u
      );
      assert.doesNotThrow(() => process.kill(unrelated.pid, 0));
      assert.equal(fs.readFileSync(pidFile, 'utf8'), `${unrelated.pid}\n`);
    } finally {
      try {
        process.kill(-unrelated.pid, 'SIGTERM');
      } catch {}
      fs.rmSync(runtimeDir, { recursive: true, force: true });
    }
  }
});

test('legacy stop rejects malformed and symlinked PID files without removing them', () => {
  const serviceScript = path.resolve(
    'scripts/codex-mcp-vcp-native-wsl-newapi-service.sh'
  );
  for (const fixture of ['pid-one', 'nonnumeric', 'symlink']) {
    const runtimeDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'codex-memory-legacy-pid-file-')
    );
    const runDir = path.join(runtimeDir, 'run');
    fs.mkdirSync(runDir, { mode: 0o700 });
    fs.chmodSync(runtimeDir, 0o700);
    fs.chmodSync(runDir, 0o700);
    const pidFile = path.join(runDir, 'codex-memory-http.pid');
    const symlinkTarget = path.join(runtimeDir, 'unrelated.txt');
    if (fixture === 'symlink') {
      fs.writeFileSync(symlinkTarget, 'unchanged\n', { mode: 0o600 });
      fs.symlinkSync(symlinkTarget, pidFile);
    } else {
      fs.writeFileSync(
        pidFile,
        fixture === 'pid-one' ? '1\n' : 'not-a-pid\n',
        { mode: 0o600 }
      );
    }
    try {
      const result = spawnSync('bash', [serviceScript, 'stop'], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          PATH: process.env.PATH,
          CODEX_MEMORY_VCP_NATIVE_SERVICE_DIR: runtimeDir
        }
      });
      assert.equal(result.status, 2, fixture);
      assert.match(result.stderr, /PID file identity is invalid/u);
      assert.equal(fs.lstatSync(pidFile).isSymbolicLink(), fixture === 'symlink');
      if (fixture === 'symlink') {
        assert.equal(fs.readFileSync(symlinkTarget, 'utf8'), 'unchanged\n');
      }
    } finally {
      fs.rmSync(runtimeDir, { recursive: true, force: true });
    }
  }
});
