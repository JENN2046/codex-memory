#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { spawn } = require('node:child_process');

// ---------------------------------------------------------------------------
// Provider-dependent test contract
// These tests require a running embedding/rerank provider endpoint.
// They are NOT safe for default CI or default npm test.
//
// Guard: requires BOTH:
//   CODEX_MEMORY_RUN_PROVIDER_TESTS=true
//   CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER=true
// ---------------------------------------------------------------------------

const PROVIDER_DEPENDENT_FILES = [
  'phase-b-sync-cache-rerank.test.js',
  'phase-c-active-recall.test.js',
  'provider-smoke-cli.test.js',
  'provider-benchmark-cli.test.js'
];

function isProviderTestRequested() {
  return process.env.CODEX_MEMORY_RUN_PROVIDER_TESTS === 'true'
    && process.env.CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER === 'true';
}

function parseArgs(argv = []) {
  const options = { json: false };
  for (const arg of argv) {
    if (arg === '--json') options.json = true;
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!isProviderTestRequested()) {
    const message = {
      status: 'skipped',
      contract: 'provider-dependent',
      reason: [
        'CODEX_MEMORY_RUN_PROVIDER_TESTS is not true',
        'CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER is not true'
      ],
      note: 'skipped, not passed',
      exitCode: 0
    };

    if (options.json) {
      process.stdout.write(`${JSON.stringify(message, null, 2)}\n`);
    } else {
      for (const line of message.reason) {
        process.stderr.write(`provider tests: ${line}\n`);
      }
      process.stderr.write(`provider tests: skipped, not passed (exit 0)\n`);
    }

    process.exit(0);
    return;
  }

  const testPatterns = PROVIDER_DEPENDENT_FILES.map(f => path.join('tests', f));

  const child = spawn(process.execPath, ['--test', ...testPatterns], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: 'true'
    },
    stdio: ['ignore', 'inherit', 'pipe'],
    windowsHide: true,
    timeout: 300000
  });

  let stderrBuf = '';
  child.stderr.on('data', d => { stderrBuf += d; });

  child.on('close', code => {
    if (stderrBuf) process.stderr.write(stderrBuf);

    if (options.json) {
      const result = {
        status: code === 0 ? 'passed' : 'failed',
        contract: 'provider-dependent',
        exitCode: code
      };
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    }

    process.exit(code);
  });

  child.on('error', () => {
    process.exit(1);
  });
}

if (require.main === module) {
  main();
}

module.exports = {
  PROVIDER_DEPENDENT_FILES,
  isProviderTestRequested
};
