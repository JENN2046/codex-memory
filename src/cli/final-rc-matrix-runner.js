#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

const {
  UNSAFE_CLI_FLAGS,
  runFinalRcRuntimeEvidenceMatrix
} = require('../core/FinalRcRuntimeEvidenceRunner');

function parseArgs(argv = []) {
  const options = {
    execute: false,
    dryRun: true,
    json: false,
    pretty: false,
    help: false,
    rejectedFlag: null,
    unknownFlag: null
  };

  for (const token of argv) {
    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }
    if (token === '--execute') {
      options.execute = true;
      options.dryRun = false;
      continue;
    }
    if (token === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--pretty') {
      options.pretty = true;
      continue;
    }
    if (UNSAFE_CLI_FLAGS.includes(token)) {
      options.rejectedFlag = token;
      continue;
    }
    if (token.startsWith('--')) {
      options.unknownFlag = token;
      continue;
    }
  }

  return options;
}

function buildUsageText() {
  return [
    'Usage: node src/cli/final-rc-matrix-runner.js [--execute] [--json] [--pretty]',
    '',
    'Default mode is dry-run and does not execute commands.',
    '--execute runs the local allowlisted matrix only.',
    '',
    'This runner never pushes, tags, releases, deploys, switches config, installs watchdog/startup,',
    'calls providers, scans real memory stores, applies migrations/imports/exports/backups/restores,',
    'writes durable memory/audit state, expands public MCP tools, or claims RC_READY.'
  ].join('\n');
}

function extractJsonPayload(output) {
  const text = String(output || '').trim();
  if (!text) return null;

  const firstBrace = text.indexOf('{');
  if (firstBrace < 0) return null;

  try {
    return JSON.parse(text.slice(firstBrace));
  } catch {
    return null;
  }
}

function createSpawnExecutor(cwd = process.cwd()) {
  return command => {
    const startedAt = Date.now();
    const result = spawnSync(command.command, command.args, {
      cwd,
      env: process.env,
      encoding: 'utf8',
      shell: false,
      windowsHide: true,
      timeout: command.timeoutMs,
      maxBuffer: 256 * 1024 * 1024
    });
    const stdout = result.stdout || '';
    const stderr = result.stderr || '';
    const exitCode = Number.isInteger(result.status)
      ? result.status
      : 1;

    return {
      status: exitCode === 0 ? 'passed' : 'failed',
      exitCode,
      stdout,
      stderr,
      error: result.error && result.error.message ? result.error.message : '',
      payload: extractJsonPayload(stdout),
      durationMs: Date.now() - startedAt,
      providerCalls: 0,
      serviceStarted: false,
      realMemoryTouched: false,
      runtimeStoresScanned: false,
      durableStateTouched: false,
      publicMcpExpanded: false,
      remoteWrite: false,
      rawSensitiveOutputExposed: false,
      summary: exitCode === 0
        ? `${command.id} passed`
        : `${command.id} failed${result.error && result.error.message ? `: ${result.error.message}` : ''}`
    };
  };
}

function buildRejectedReport(options) {
  return {
    schemaVersion: 'p63-final-rc-runtime-evidence-runner-rejected-v1',
    decision: 'NOT_READY_BLOCKED',
    status: 'blocked_fail_closed',
    rejectedFlag: options.rejectedFlag || options.unknownFlag,
    runnerExecuted: false,
    commandsExecuted: false,
    finalRcMatrixExecuted: false,
    finalRcMatrixReady: false,
    runtimeReady: false,
    v1RcReady: false,
    rcReady: false,
    safety: {
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      readsRealMemory: false,
      scansRuntimeStores: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      appliesMigration: false,
      performsImportExportApply: false,
      performsBackupRestore: false,
      mutatesConfig: false,
      installsWatchdog: false,
      expandsPublicMcp: false,
      changesDependencies: false,
      remoteWrites: false,
      rawSensitiveOutputExposed: false
    }
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    process.stdout.write(`${buildUsageText()}\n`);
    process.exitCode = 0;
    return;
  }

  if (options.rejectedFlag || options.unknownFlag) {
    process.stdout.write(`${JSON.stringify(buildRejectedReport(options), null, options.pretty ? 2 : 0)}\n`);
    process.exitCode = 1;
    return;
  }

  const report = runFinalRcRuntimeEvidenceMatrix({
    execute: options.execute,
    dryRun: options.dryRun,
    executor: createSpawnExecutor(process.cwd())
  });
  const spacing = options.pretty ? 2 : 0;

  process.stdout.write(`${JSON.stringify(report, null, spacing)}\n`);
  process.exitCode = report.criticalGates?.allCriticalCommandsPassed === true ? 0 : 1;
}

if (require.main === module) {
  main();
}

module.exports = {
  buildRejectedReport,
  buildUsageText,
  createSpawnExecutor,
  extractJsonPayload,
  parseArgs
};
