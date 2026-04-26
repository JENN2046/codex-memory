#!/usr/bin/env node
'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

function parseArgs(argv = []) {
  const options = {
    json: false,
    configPath: path.join(os.homedir(), '.codex', 'config.toml'),
    serverName: 'vcp_codex_memory',
    legacyUrl: process.env.CODEX_MEMORY_ROLLBACK_URL || '',
    legacyCommand: process.env.CODEX_MEMORY_ROLLBACK_COMMAND || '',
    legacyArgsJson: process.env.CODEX_MEMORY_ROLLBACK_ARGS_JSON || '',
    legacyCwd: process.env.CODEX_MEMORY_ROLLBACK_CWD || '',
    legacyVcpToolBoxPath: process.env.CODEX_MEMORY_LEGACY_VCPTOOLBOX_PATH || 'A:\\VCP\\VCPToolBox',
    startupTimeoutSec: '15',
    toolTimeoutSec: '90',
    required: 'true',
    enabled: 'true'
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--config-path') {
      options.configPath = argv[index + 1] || options.configPath;
      index += 1;
      continue;
    }
    if (token === '--server-name') {
      options.serverName = argv[index + 1] || options.serverName;
      index += 1;
      continue;
    }
    if (token === '--legacy-url') {
      options.legacyUrl = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--legacy-command') {
      options.legacyCommand = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--legacy-args-json') {
      options.legacyArgsJson = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--legacy-cwd') {
      options.legacyCwd = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--legacy-vcptoolbox-path') {
      options.legacyVcpToolBoxPath = argv[index + 1] || options.legacyVcpToolBoxPath;
      index += 1;
      continue;
    }
  }

  return options;
}

async function readConfigFile(configPath) {
  try {
    return await fs.readFile(configPath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function escapeTomlString(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

function formatTomlArray(values = []) {
  return `[${values.map(value => `"${escapeTomlString(value)}"`).join(', ')}]`;
}

function parseTomlArray(lineValue = '') {
  const trimmed = String(lineValue || '').trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return [];
  }

  const inner = trimmed.slice(1, -1).trim();
  if (!inner) return [];

  try {
    return JSON.parse(`[${inner.replace(/'/g, '"')}]`);
  } catch {
    return inner
      .split(',')
      .map(item => item.trim().replace(/^"(.*)"$/, '$1'))
      .filter(Boolean);
  }
}

function extractServerBlock(tomlText, serverName) {
  const header = `[mcp_servers.${serverName}]`;
  const lines = String(tomlText || '').split(/\r?\n/);
  const startIndex = lines.findIndex(line => line.trim() === header);
  if (startIndex < 0) {
    return null;
  }

  const blockLines = [];
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    if (index > startIndex && /^\s*\[/.test(line)) {
      break;
    }
    blockLines.push(line);
  }

  const raw = blockLines.join('\n');
  const parsed = {};

  for (const line of blockLines.slice(1)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z0-9_]+)\s*=\s*(.+)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = rawValue.trim();

    if (value.startsWith('"') && value.endsWith('"')) {
      parsed[key] = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      continue;
    }
    if (value.startsWith('[') && value.endsWith(']')) {
      parsed[key] = parseTomlArray(value);
      continue;
    }
    if (value === 'true' || value === 'false') {
      parsed[key] = value === 'true';
      continue;
    }
    const numeric = Number.parseInt(value, 10);
    parsed[key] = Number.isNaN(numeric) ? value : numeric;
  }

  return {
    header,
    raw,
    parsed
  };
}

function detectCurrentMode(parsed = {}) {
  if (typeof parsed.url === 'string' && parsed.url.trim()) return 'http';
  if (typeof parsed.command === 'string' && parsed.command.trim()) return 'stdio';
  return 'unknown';
}

function normalizeLegacyTarget(options) {
  const legacyUrl = String(options.legacyUrl || '').trim();
  const legacyCommand = String(options.legacyCommand || '').trim();
  const legacyCwd = String(options.legacyCwd || '').trim();
  const legacyArgsJson = String(options.legacyArgsJson || '').trim();

  if (legacyUrl) {
    return {
      mode: 'http',
      url: legacyUrl,
      source: 'explicit-url'
    };
  }

  if (!legacyCommand) {
    return null;
  }

  let args = [];
  if (legacyArgsJson) {
    try {
      const parsed = JSON.parse(legacyArgsJson);
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
        args = parsed;
      }
    } catch {
      args = [];
    }
  }

  return {
    mode: 'stdio',
    command: legacyCommand,
    args,
    cwd: legacyCwd || null,
    source: 'explicit-stdio'
  };
}

async function discoverLegacyTarget(options) {
  const explicitTarget = normalizeLegacyTarget(options);
  if (explicitTarget) {
    return explicitTarget;
  }

  const vcpToolBoxPath = String(options.legacyVcpToolBoxPath || '').trim();
  if (!vcpToolBoxPath) {
    return null;
  }

  const configEnvPath = path.join(vcpToolBoxPath, 'config.env');
  if (!(await pathExists(configEnvPath))) {
    return null;
  }

  const content = await fs.readFile(configEnvPath, 'utf8');
  const portMatch = content.match(/^PORT=(.+)$/m);
  const rawPort = portMatch ? String(portMatch[1] || '').trim() : '';
  const port = Number.parseInt(rawPort, 10);

  if (!Number.isInteger(port) || port <= 0) {
    return null;
  }

  return {
    mode: 'http',
    url: `http://127.0.0.1:${port}/mcp/codex-memory`,
    source: 'vcptoolbox-config.env',
    vcpToolBoxPath,
    configEnvPath,
    port
  };
}

async function probeLegacyTarget(target) {
  if (!target || target.mode !== 'http' || !target.url) {
    return {
      status: 'unknown',
      reachable: null,
      httpStatus: null,
      detail: 'Probe only supports HTTP targets.'
    };
  }

  try {
    const response = await fetch(target.url, {
      method: 'GET',
      headers: {
        'Mcp-Session-Id': 'rollback-plan-probe'
      },
      signal: AbortSignal.timeout(3000)
    });

    return {
      status: response.ok ? 'ok' : 'warn',
      reachable: response.ok,
      httpStatus: response.status,
      detail: `Probe responded with HTTP ${response.status}.`
    };
  } catch (error) {
    return {
      status: 'warn',
      reachable: false,
      httpStatus: null,
      detail: error.message
    };
  }
}

function buildRollbackBlock(serverName, options, legacyTarget) {
  if (!legacyTarget) return '';

  const lines = [`[mcp_servers.${serverName}]`];
  if (legacyTarget.mode === 'http') {
    lines.push(`url = "${escapeTomlString(legacyTarget.url)}"`);
  } else {
    lines.push(`command = "${escapeTomlString(legacyTarget.command)}"`);
    lines.push(`args = ${formatTomlArray(legacyTarget.args || [])}`);
    if (legacyTarget.cwd) {
      lines.push(`cwd = "${escapeTomlString(legacyTarget.cwd)}"`);
    }
  }

  lines.push(`startup_timeout_sec = ${options.startupTimeoutSec}`);
  lines.push(`tool_timeout_sec = ${options.toolTimeoutSec}`);
  lines.push(`required = ${options.required}`);
  lines.push(`enabled = ${options.enabled}`);

  return lines.join('\n');
}

function buildSteps(configPath, currentBlock, legacyTarget) {
  const steps = [
    `先备份 ${configPath}`,
    '定位 [mcp_servers.vcp_codex_memory] 配置块'
  ];

  if (legacyTarget) {
    steps.push('用生成的 rollback patch 替换当前配置块');
  } else {
    steps.push('补入 legacy target 参数后，再生成 rollback patch');
  }

  steps.push('重启 Codex，让新的 MCP 配置生效');
  steps.push('回到 A:\\codex-memory 运行 `npm run observe:http -- --json` 做运行态复核');
  steps.push('运行 `npm run rollback-active-memory -- --suite .\\benchmarks\\active-memory-suite\\standard-suite.json --json` 留现场材料');

  if (currentBlock && detectCurrentMode(currentBlock.parsed) === 'http') {
    steps.push('如果当前是 HTTP 主链，回滚后优先确认 `vcp_codex_memory` 没有握手超时或初始化失败');
  }

  return steps;
}

function buildSummary(currentBlock, legacyTarget, legacyProbe) {
  const currentMode = currentBlock ? detectCurrentMode(currentBlock.parsed) : 'missing';
  const ready = !!legacyTarget;
  const reachable = legacyProbe?.reachable;
  const status = !ready
    ? 'warn'
    : reachable === false
      ? 'warn'
      : 'ok';

  return {
    status,
    currentMode,
    rollbackTargetReady: ready,
    rollbackTargetReachable: reachable,
    message: !ready
      ? 'Rollback target is not configured yet; this report is read-only and planning-only.'
      : reachable === false
        ? 'Rollback patch is ready, but the legacy target is not reachable right now.'
        : 'Rollback plan is ready to apply.'
  };
}

function formatTextReport(report) {
  const lines = [
    `status: ${report.summary.status}`,
    report.summary.message,
    `configPath: ${report.config.path}`,
    `configExists: ${report.config.exists}`,
    `currentMode: ${report.summary.currentMode}`,
    `rollbackTargetReady: ${report.summary.rollbackTargetReady}`,
    `rollbackTargetReachable: ${report.summary.rollbackTargetReachable ?? 'unknown'}`,
    ''
  ];

  lines.push('[current]');
  lines.push(`  mode: ${report.current.mode}`);
  if (report.current.url) lines.push(`  url: ${report.current.url}`);
  if (report.current.command) lines.push(`  command: ${report.current.command}`);
  if (report.current.args?.length) lines.push(`  args: ${JSON.stringify(report.current.args)}`);
  if (report.current.cwd) lines.push(`  cwd: ${report.current.cwd}`);
  lines.push('');

  lines.push('[rollback-target]');
  lines.push(`  mode: ${report.rollbackTarget?.mode || 'unset'}`);
  if (report.rollbackTarget?.source) lines.push(`  source: ${report.rollbackTarget.source}`);
  if (report.rollbackTarget?.url) lines.push(`  url: ${report.rollbackTarget.url}`);
  if (report.rollbackTarget?.command) lines.push(`  command: ${report.rollbackTarget.command}`);
  if (report.rollbackTarget?.args?.length) lines.push(`  args: ${JSON.stringify(report.rollbackTarget.args)}`);
  if (report.rollbackTarget?.cwd) lines.push(`  cwd: ${report.rollbackTarget.cwd}`);
  if (report.rollbackTarget?.configEnvPath) lines.push(`  configEnvPath: ${report.rollbackTarget.configEnvPath}`);
  if (report.legacyProbe) {
    lines.push(`  probeStatus: ${report.legacyProbe.status}`);
    lines.push(`  probeDetail: ${report.legacyProbe.detail}`);
  }
  lines.push('');

  lines.push('[steps]');
  for (const step of report.steps) {
    lines.push(`  - ${step}`);
  }

  if (report.rollbackPatch) {
    lines.push('');
    lines.push('[rollback-patch]');
    lines.push(report.rollbackPatch);
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const configText = await readConfigFile(options.configPath);
  const currentBlock = configText ? extractServerBlock(configText, options.serverName) : null;
  const legacyTarget = await discoverLegacyTarget(options);
  const legacyProbe = await probeLegacyTarget(legacyTarget);
  const rollbackPatch = buildRollbackBlock(options.serverName, options, legacyTarget);
  const summary = buildSummary(currentBlock, legacyTarget, legacyProbe);

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    config: {
      path: options.configPath,
      exists: configText != null
    },
    current: {
      mode: currentBlock ? detectCurrentMode(currentBlock.parsed) : 'missing',
      url: currentBlock?.parsed?.url || null,
      command: currentBlock?.parsed?.command || null,
      args: Array.isArray(currentBlock?.parsed?.args) ? currentBlock.parsed.args : [],
      cwd: currentBlock?.parsed?.cwd || null,
      raw: currentBlock?.raw || null
    },
    rollbackTarget: legacyTarget,
    legacyProbe,
    rollbackPatch,
    steps: buildSteps(options.configPath, currentBlock, legacyTarget)
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(formatTextReport(report));
  }

  if (summary.status === 'warn') {
    process.exitCode = 1;
  }
}

main().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
