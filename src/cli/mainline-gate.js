#!/usr/bin/env node
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

function parseArgs(argv = []) {
  const options = {
    mode: 'daily',
    json: false,
    suiteFile: path.join('benchmarks', 'active-memory-suite', 'standard-suite.json'),
    healthUrl: '',
    withContract: false,
    withTest: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--suite') {
      options.suiteFile = argv[index + 1] || options.suiteFile;
      index += 1;
      continue;
    }
    if (token === '--health-url') {
      options.healthUrl = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--with-contract') {
      options.withContract = true;
      continue;
    }
    if (token === '--with-test') {
      options.withTest = true;
      continue;
    }
    if (!token.startsWith('--') && options.mode === 'daily') {
      options.mode = String(token || 'daily').trim().toLowerCase() || 'daily';
    }
  }

  if (options.mode === 'strict') {
    options.withContract = true;
    options.withTest = true;
  }

  return options;
}

function resolveHealthUrl(options) {
  if (options.healthUrl) return options.healthUrl;
  if (process.env.CODEX_MEMORY_GATE_HEALTH_URL) return process.env.CODEX_MEMORY_GATE_HEALTH_URL;
  const host = process.env.CODEX_MEMORY_HTTP_HOST || '127.0.0.1';
  const port = Number.parseInt(String(process.env.CODEX_MEMORY_HTTP_PORT || '7605'), 10) || 7605;
  return `http://${host}:${port}/health`;
}

function resolveEnvCommand(name) {
  const raw = process.env[`CODEX_MEMORY_GATE_${String(name).toUpperCase()}_COMMAND_JSON`];
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(item => typeof item === 'string' && item.length > 0)) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function resolveCommandSpec(name, options) {
  const override = resolveEnvCommand(name);
  if (override) return override;

  const suiteFile = options.suiteFile;
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  if (name === 'compare') {
    return [process.execPath, 'src/cli/compare-vcp-active-memory.js', '--suite', suiteFile, '--json', '--require-match', '--timeout-ms', '120000'];
  }
  if (name === 'rollback') {
    return [process.execPath, 'src/cli/rollback-active-memory.js', '--suite', suiteFile, '--json', '--require-ready', '--timeout-ms', '120000'];
  }
  if (name === 'contract') {
    return [process.execPath, 'tests/mcp-contract.test.js', 'tests/mcp-http.test.js'];
  }
  if (name === 'contract_test_runner') {
    return [process.execPath, '--test', '.\\tests\\mcp-contract.test.js', '.\\tests\\mcp-http.test.js'];
  }
  if (name === 'test') {
    if (process.platform === 'win32') {
      return [process.env.ComSpec || 'cmd.exe', '/d', '/s', '/c', 'npm test'];
    }
    return [npmCommand, 'test'];
  }

  throw new Error(`Unknown command spec: ${name}`);
}

async function runCommand(commandSpec, cwd, options = {}) {
  const { captureMode = 'pipe' } = options;
  const [file, ...args] = commandSpec;
  const needsShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(String(file));
  const tempDir = captureMode === 'file'
    ? await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-gate-'))
    : null;
  const outputPath = tempDir ? path.join(tempDir, 'command.log') : null;
  const outputHandle = outputPath ? await fs.open(outputPath, 'w') : null;

  return new Promise((resolve, reject) => {
    const child = spawn(file, args, {
      cwd,
      env: process.env,
      stdio: outputHandle
        ? ['ignore', outputHandle.fd, outputHandle.fd]
        : ['ignore', 'pipe', 'pipe'],
      shell: needsShell
    });

    let stdout = '';
    let stderr = '';
    if (!outputHandle) {
      child.stdout.on('data', chunk => {
        stdout += chunk.toString('utf8');
      });
      child.stderr.on('data', chunk => {
        stderr += chunk.toString('utf8');
      });
    }
    child.on('error', reject);

    const startedAt = Date.now();
    child.on('close', async (code) => {
      try {
        if (outputHandle) {
          await outputHandle.close();
          stdout = await fs.readFile(outputPath, 'utf8');
          stderr = '';
          await fs.rm(tempDir, { recursive: true, force: true });
        }
        resolve({
          command: [file, ...args],
          code,
          stdout,
          stderr,
          durationMs: Date.now() - startedAt
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function runHealthCheck(url) {
  const startedAt = Date.now();
  try {
    const response = await fetch(url);
    const text = await response.text();
    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
    return {
      status: response.ok && payload?.ok === true ? 'ok' : 'error',
      url,
      httpStatus: response.status,
      payload,
      durationMs: Date.now() - startedAt
    };
  } catch (error) {
    return {
      status: 'error',
      url,
      httpStatus: null,
      payload: null,
      error: error.message,
      durationMs: Date.now() - startedAt
    };
  }
}

function parseJsonPayload(output) {
  const text = String(output || '').trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      const line = lines[index];
      if (!line.startsWith('{') && !line.startsWith('[')) continue;
      try {
        return JSON.parse(line);
      } catch {
        continue;
      }
    }
    return null;
  }
}

function parseTestSummary(stdout = '') {
  const passMatch = stdout.match(/(?:#|ℹ)\s*pass\s+(\d+)/);
  const failMatch = stdout.match(/(?:#|ℹ)\s*fail\s+(\d+)/);
  const testMatch = stdout.match(/(?:#|ℹ)\s*tests\s+(\d+)/);
  return {
    tests: testMatch ? Number.parseInt(testMatch[1], 10) : null,
    pass: passMatch ? Number.parseInt(passMatch[1], 10) : null,
    fail: failMatch ? Number.parseInt(failMatch[1], 10) : null
  };
}

function buildCheckResult(name, execution) {
  if (name === 'compare' || name === 'rollback') {
    const payload = parseJsonPayload(execution.stdout);
    return {
      name,
      status: execution.code === 0 && payload?.summary?.ok === true ? 'ok' : 'error',
      durationMs: execution.durationMs,
      command: execution.command,
      summary: payload?.summary || null,
      payload
    };
  }

  if (name === 'contract' || name === 'test') {
    const summary = parseTestSummary(execution.stdout);
    return {
      name,
      status: execution.code === 0 ? 'ok' : 'error',
      durationMs: execution.durationMs,
      command: execution.command,
      summary
    };
  }

  throw new Error(`Unsupported check result type: ${name}`);
}

function buildReport(options, results) {
  const orderedChecks = ['health', 'contract', 'test', 'compare', 'rollback'].filter(name => results[name]);
  const failedChecks = orderedChecks.filter(name => results[name].status !== 'ok');
  const summary = {
    ok: failedChecks.length === 0,
    mode: options.mode,
    checks: orderedChecks,
    failedChecks,
    message: failedChecks.length === 0
      ? `Mainline gate passed for ${orderedChecks.join(', ')}.`
      : `Mainline gate failed for ${failedChecks.join(', ')}.`
  };

  return {
    generatedAt: new Date().toISOString(),
    summary,
    results
  };
}

function formatTextReport(report) {
  const lines = [
    `status: ${report.summary.ok ? 'ok' : 'error'}`,
    report.summary.message,
    `mode: ${report.summary.mode}`
  ];

  if (report.results.health) {
    const health = report.results.health;
    lines.push('');
    lines.push(`[health] status=${health.status}`);
    lines.push(`  url: ${health.url}`);
    lines.push(`  httpStatus: ${health.httpStatus ?? 'n/a'}`);
    if (health.payload?.name) lines.push(`  name: ${health.payload.name}`);
    if (health.payload?.path) lines.push(`  path: ${health.payload.path}`);
  }

  for (const name of ['contract', 'test']) {
    if (!report.results[name]) continue;
    const item = report.results[name];
    lines.push('');
    lines.push(`[${name}] status=${item.status}`);
    if (item.summary?.tests != null) lines.push(`  tests: ${item.summary.tests}`);
    if (item.summary?.pass != null) lines.push(`  pass: ${item.summary.pass}`);
    if (item.summary?.fail != null) lines.push(`  fail: ${item.summary.fail}`);
  }

  for (const name of ['compare', 'rollback']) {
    if (!report.results[name]) continue;
    const item = report.results[name];
    const summary = item.summary || {};
    lines.push('');
    lines.push(`[${name}] status=${item.status}`);
    for (const [key, value] of Object.entries(summary)) {
      lines.push(`  ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const results = {};

  results.health = await runHealthCheck(resolveHealthUrl(options));

  if (options.withContract) {
    const contractSpec = resolveCommandSpec('contract_test_runner', options);
    results.contract = buildCheckResult('contract', await runCommand(contractSpec, cwd));
  }

  if (options.withTest) {
    const testSpec = resolveCommandSpec('test', options);
    results.test = buildCheckResult('test', await runCommand(testSpec, cwd, { captureMode: 'file' }));
  }

  results.compare = buildCheckResult('compare', await runCommand(resolveCommandSpec('compare', options), cwd));
  results.rollback = buildCheckResult('rollback', await runCommand(resolveCommandSpec('rollback', options), cwd));

  const report = buildReport(options, results);
  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(formatTextReport(report));
  }

  if (!report.summary.ok) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
