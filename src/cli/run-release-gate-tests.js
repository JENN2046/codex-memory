#!/usr/bin/env node
'use strict';

const { spawn } = require('node:child_process');
const path = require('node:path');
const { buildDefaultSafeEnv } = require('./run-default-tests');

const TEST_MODES = Object.freeze({
  migration: Object.freeze([
    'lifecycle-sqlite-dry-run-cli.test.js',
    'lifecycle-sqlite-migrate-cli.test.js',
    'vcp-memory-migration-readiness-cli.test.js'
  ]),
  parity: Object.freeze([
    'audit-memory-readonly-tool-draft.test.js',
    'audit-memory-readonly-service.test.js',
    'audit-memory-public-contract-preflight.test.js',
    'controlled-write-dry-run-cli.test.js',
    'controlled-write-proposal-review.test.js',
    'controlled-write-tools-fixture.test.js',
    'vcp-memory-object-mapping-dry-run-cli.test.js'
  ]),
  'release-candidate': Object.freeze([
    'release-test-gate-matrix-contract.test.js',
    'audit-memory-readonly-tool-draft.test.js',
    'audit-memory-readonly-service.test.js',
    'audit-memory-public-contract-preflight.test.js',
    'lifecycle-sqlite-dry-run-cli.test.js',
    'lifecycle-sqlite-migrate-cli.test.js',
    'vcp-memory-migration-readiness-cli.test.js',
    'vcp-memory-object-mapping-dry-run-cli.test.js'
  ])
});

function parseArgs(argv = []) {
  const options = { mode: argv[0] || 'release-candidate', json: false };
  for (const token of argv.slice(1)) {
    if (token === '--json') options.json = true;
  }
  return options;
}

function buildContract(mode) {
  const testFiles = TEST_MODES[mode] || [];
  return {
    contract: `test:${mode}`,
    mode,
    status: mode === 'release-candidate' ? 'RC_NOT_READY_BLOCKED' : 'LOCAL_TEST_GATE',
    testFiles,
    providerCallsAllowed: false,
    daemonRequired: false,
    liveMemoryAllowed: false,
    rawStoreScanAllowed: false,
    publicMcpExpansionAllowed: false,
    readinessClaimed: false,
    rcReadyClaimed: false
  };
}

function runMode({ mode, json = false, cwd = process.cwd(), env = process.env } = {}) {
  const contract = buildContract(mode);
  if (!TEST_MODES[mode]) {
    process.stderr.write(`Unknown release gate mode: ${mode}\n`);
    return 1;
  }

  if (json) {
    process.stderr.write(`${JSON.stringify(contract, null, 2)}\n`);
  }

  const testPatterns = contract.testFiles.map(file => path.join('tests', file));
  const child = spawn(process.execPath, ['--test', ...testPatterns], {
    cwd,
    env: buildDefaultSafeEnv(env),
    stdio: ['ignore', 'inherit', 'pipe'],
    windowsHide: true
  });

  let stderrBuf = '';
  child.stderr.on('data', chunk => {
    stderrBuf += chunk;
  });

  child.on('close', code => {
    if (stderrBuf) process.stderr.write(stderrBuf);
    process.exit(code !== null ? code : 1);
  });

  child.on('error', () => {
    process.exit(1);
  });

  return null;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const code = runMode(options);
  if (typeof code === 'number') process.exit(code);
}

if (require.main === module) {
  main();
}

module.exports = {
  TEST_MODES,
  buildContract,
  parseArgs,
  runMode
};
