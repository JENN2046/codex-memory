#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const SUMMARY_OUTPUT_TAIL_CHARS = 12000;
const SUMMARY_FAILURE_TAIL_CHARS = 7000;
const MIN_NODE_MAJOR = 22;

// ---------------------------------------------------------------------------
// Default-safe test contract
// Excludes provider-dependent, daemon-dependent, and self-referential tests.
// npm test must exit 0 with no provider, no network, no daemon.
//
// NOTE: There is NO aggregate wrapper-level timeout. Each individual test or
// test file's built-in timeout (or node --test --timeout) applies.
// A wrapper-level timeout would cap the entire suite and cause false failures
// on slow CI runners.
// ---------------------------------------------------------------------------

// Pre-existing fixture drift — generated CLI manifests do not match committed
// fixtures. These are NOT provider-dependent; they require a separate
// fixture-regeneration pass to be re-enabled in default-safe tests.
const FIXTURE_DRIFT_FILES = [
  'migration-import-export-approval-packet-cli.test.js',
  'migration-import-export-dry-run-gate-cli.test.js',
  'schema-compatibility-dry-run-cli.test.js',
  'v1-rc-validation-aggregator-cli.test.js'
];

const PROVIDER_DEPENDENT_FILES = [
  'phase-b-sync-cache-rerank.test.js',
  'phase-c-active-recall.test.js',
  'provider-smoke-cli.test.js',
  'provider-benchmark-cli.test.js'
];

const DAEMON_DEPENDENT_FILES = [
  'mcp-http.test.js'
];

const SELF_REFERENTIAL_FILES = [
  'gate-ci-cli.test.js',
  'gate-ci-default-test-contract.test.js',
  'gate-ci-env-override-evidence.test.js',
  'dashboard-cli.test.js'
];

function resolveExcluded() {
  const excluded = new Set([
    ...PROVIDER_DEPENDENT_FILES,
    ...DAEMON_DEPENDENT_FILES,
    ...SELF_REFERENTIAL_FILES,
    ...FIXTURE_DRIFT_FILES
  ]);
  return excluded;
}

function resolveDefaultSafeFiles(testsDir) {
  const excluded = resolveExcluded();
  const allFiles = fs.readdirSync(testsDir)
    .filter(f => f.endsWith('.test.js'))
    .sort();

  const safeFiles = allFiles.filter(f => !excluded.has(f));
  const excludedDetails = allFiles
    .filter(f => excluded.has(f))
    .map(f => {
      if (PROVIDER_DEPENDENT_FILES.includes(f)) return { file: f, reason: 'provider_dependent' };
      if (DAEMON_DEPENDENT_FILES.includes(f)) return { file: f, reason: 'daemon_dependent' };
      if (SELF_REFERENTIAL_FILES.includes(f)) return { file: f, reason: 'self_referential' };
      if (FIXTURE_DRIFT_FILES.includes(f)) return { file: f, reason: 'fixture_drift' };
      return { file: f, reason: 'unknown' };
    });

  return { safeFiles, excludedDetails, totalFiles: allFiles.length };
}

function buildDefaultSafeEnv(env = process.env) {
  return {
    ...env,
    CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: 'false'
  };
}

function parseNodeMajor(version = process.versions.node) {
  const match = String(version || '').match(/^v?(\d+)(?:\.|$)/);
  return match ? Number(match[1]) : 0;
}

function validateNodeRuntime(version = process.versions.node) {
  const major = parseNodeMajor(version);
  return {
    ok: major >= MIN_NODE_MAJOR,
    major,
    minMajor: MIN_NODE_MAJOR,
    version: String(version || '')
  };
}

function buildSpawnOptions({ cwd = process.cwd(), env = process.env } = {}) {
  const options = {
    cwd,
    env: buildDefaultSafeEnv(env),
    stdio: ['ignore', 'inherit', 'pipe'],
    windowsHide: true
  };
  return options;
}

function parseArgs(argv = []) {
  const options = { json: false, summary: false };
  for (const arg of argv) {
    if (arg === '--json') options.json = true;
    if (arg === '--summary') options.summary = true;
  }
  return options;
}

function appendLimited(current, chunk, limit = SUMMARY_OUTPUT_TAIL_CHARS) {
  const next = `${current}${chunk}`;
  return next.length > limit ? next.slice(next.length - limit) : next;
}

function selectSummaryOutput(output, limit = SUMMARY_OUTPUT_TAIL_CHARS) {
  const lines = String(output || '').split(/\r?\n/);
  const summaryLines = lines.filter(line => /^# (tests|suites|pass|fail|cancelled|skipped|todo|duration_ms) /.test(line));
  if (summaryLines.length > 0) {
    return `${summaryLines.join('\n')}\n`;
  }
  const tail = String(output || '').slice(-limit);
  return tail ? `${tail.replace(/\s+$/, '')}\n` : '';
}

function formatSummaryOutput(output, exitCode = 0, limit = SUMMARY_FAILURE_TAIL_CHARS) {
  const summary = selectSummaryOutput(output);
  if (exitCode === 0) return summary;

  const diagnosticTail = String(output || '').slice(-limit).replace(/\s+$/, '');
  if (!diagnosticTail) return summary;

  const tailOutput = `${diagnosticTail}\n`;
  if (!summary) return tailOutput;
  return tailOutput.includes(summary.trim()) ? tailOutput : `${tailOutput}${summary}`;
}

function main() {
  const runtime = validateNodeRuntime();
  if (!runtime.ok) {
    process.stderr.write(
      `codex-memory default tests require Node >=${runtime.minMajor}. ` +
      `Current Node is ${runtime.version || 'unknown'}.\n`
    );
    process.exit(1);
  }

  const options = parseArgs(process.argv.slice(2));
  const testsDir = path.join(process.cwd(), 'tests');
  const { safeFiles, excludedDetails, totalFiles } = resolveDefaultSafeFiles(testsDir);
  const testPatterns = safeFiles.map(f => path.join('tests', f));

  if (options.json) {
    // Print contract report before running
    const contract = {
      contract: 'default-safe',
      mode: 'no_provider_no_network_no_daemon',
      totalTestFiles: totalFiles,
      defaultSafeFiles: safeFiles.length,
      excludedDetails
    };
    process.stderr.write(`${JSON.stringify(contract, null, 2)}\n`);
  }

  const spawnOptions = options.summary
    ? {
        cwd: process.cwd(),
        env: buildDefaultSafeEnv(process.env),
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
      }
    : buildSpawnOptions();
  const child = spawn(process.execPath, ['--test', ...testPatterns], spawnOptions);

  let stdoutBuf = '';
  let stderrBuf = '';
  if (options.summary) {
    child.stdout.on('data', d => { stdoutBuf = appendLimited(stdoutBuf, d); });
  }
  child.stderr.on('data', d => {
    stderrBuf = options.summary ? appendLimited(stderrBuf, d) : `${stderrBuf}${d}`;
  });

  child.on('close', code => {
    if (options.summary) {
      const summary = formatSummaryOutput(`${stdoutBuf}\n${stderrBuf}`, code !== null ? code : 1);
      if (summary) process.stdout.write(summary);
    } else if (stderrBuf) {
      // Forward stderr (contains summary)
      process.stderr.write(stderrBuf);
    }
    // null code means the child was killed by a signal (OOM, runner timeout, etc.)
    // Map to nonzero exit to avoid masking the failure.
    process.exit(code !== null ? code : 1);
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
  DAEMON_DEPENDENT_FILES,
  SELF_REFERENTIAL_FILES,
  FIXTURE_DRIFT_FILES,
  buildDefaultSafeEnv,
  buildSpawnOptions,
  formatSummaryOutput,
  parseNodeMajor,
  selectSummaryOutput,
  validateNodeRuntime,
  resolveDefaultSafeFiles,
  resolveExcluded
};
