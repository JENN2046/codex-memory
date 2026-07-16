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

// Active fixture drift must be empty. If a fixture drift file is added here,
// the default-safe report exposes it as fixture_drift until it is repaired.
const FIXTURE_DRIFT_FILES = [];

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

// Full frozen-replay executor tests intentionally create temporary Git
// repositories and run multiple subprocess lifecycles. Keep them available as
// an explicit E2E gate without adding several minutes to every default-safe run.
const FROZEN_REPLAY_E2E_FILES = [
  'cm2118-full-plan-application-execution.test.js',
  'cm2120-full-plan-application-receipt-review.test.js',
  'cm2122-full-plan-status-sync-execution.test.js'
];

const CHILD_PROCESS_STDIO_DEPENDENT_FILES = [
  'a5-approval-check-cli.test.js',
  'active-memory-cli.test.js',
  'authenticated-http-bounded-mutation-proof-runner-cli.test.js',
  'authenticated-http-bounded-mutation-proof-runtime-evidence-intake.test.js',
  'authenticated-http-bounded-mutation-runtime-evidence-aggregation-preflight.test.js',
  'authenticated-http-bounded-mutation-runtime-evidence-report.test.js',
  'authorized-write-path-auto-authorization-cli.test.js',
  'authorized-write-path-bounded-recall-closeout-review-cli.test.js',
  'authorized-write-path-bounded-recall-preparation-review-cli.test.js',
  'authorized-write-path-cm0595-closeout-review-cli.test.js',
  'authorized-write-path-widening-adoption-review-cli.test.js',
  'authorized-write-path-widening-review-cli.test.js',
  'autopilot-action-adapter-contract-cli.test.js',
  'autopilot-closed-loop-dry-run-cli.test.js',
  'autopilot-controlled-green-entry-cli.test.js',
  'autopilot-controller-cli.test.js',
  'autopilot-fixture-green-executor-cli.test.js',
  'autopilot-green-file-write-boundary-cli.test.js',
  'autopilot-green-file-write-executor-contract-cli.test.js',
  'autopilot-operator-console-cli.test.js',
  'autopilot-replay-harness-cli.test.js',
  'autopilot-state-store-draft-cli.test.js',
  'autopilot-validation-planner-cli.test.js',
  'compare-vcp-active-memory-cli.test.js',
  'controlled-write-dry-run-cli.test.js',
  'deepmemo-donor-parity-fixture.test.js',
  'donor-error-meta-parity-fixture.test.js',
  'donor-ranking-tie-breaker-parity-fixture.test.js',
  'final-rc-runtime-evidence-runner.test.js',
  'governance-report-cli.test.js',
  'governance-schema.test.js',
  'http-no-token-search-rejection.test.js',
  'http-observe-cli.test.js',
  'lifecycle-sqlite-dry-run-cli.test.js',
  'lifecycle-sqlite-migrate-cli.test.js',
  'lightmemo-cli.test.js',
  'live-http-runtime-freshness-guard.test.js',
  'mainline-gate-cli.test.js',
  'mainline-rollback-cli.test.js',
  'memory-lifecycle-projection-http-runtime-boundary-proof.test.js',
  'memory-reliability-phase-commit-review-cli.test.js',
  'memory-reliability-proof-baseline-blocker-plan-cli.test.js',
  'memory-reliability-proof-baseline-isolation-review-cli.test.js',
  'memory-reliability-proof-baseline-readiness-cli.test.js',
  'migration-import-export-approval-packet-cli.test.js',
  'migration-import-export-dry-run-gate-cli.test.js',
  'provider-test-contract-runner.test.js',
  'query-quality-report.test.js',
  'query-quality-temp-db-gate.test.js',
  'read-policy-evidence-probe-cli.test.js',
  'real-query-suite.test.js',
  'rebuild-profile-cli.test.js',
  'recall-proof-current-facts-preflight-cli.test.js',
  'recall-proof-execution-preflight-cli.test.js',
  'rollback-active-memory-cli.test.js',
  'schema-compatibility-dry-run-cli.test.js',
  'scope-acceptance-cli.test.js',
  'scope-backfill-dry-run.test.js',
  'scoped-recall-evidence-probe-cli.test.js',
  'selected-audit-correlation-current-facts-preflight-cli.test.js',
  'smart-standing-authorization-v3-receipts-cli.test.js',
  'store-freshness-write-preflight-cli.test.js',
  'supersede-memory-cli.test.js',
  'tagmemo-persistent-enrichment-proof-command.test.js',
  'tombstone-memory-cli.test.js',
  'topicmemo-donor-parity-fixture.test.js',
  'v1-rc-validation-aggregator-cli.test.js',
  'v8-diagnostic-cli-shape-gate.test.js',
  'validate-memory-cli.test.js',
  'vcp-active-memory-cli.test.js',
  'vcp-memory-migration-readiness-cli.test.js',
  'vcp-memory-object-mapping-dry-run-cli.test.js',
  'write-proof-current-facts-preflight-cli.test.js',
  'write-proof-execution-preflight-cli.test.js'
];

const GOVERNED_NATIVE_BRIDGE_DEFAULT_SAFE_REQUIRED_FILES = [
  'current-product-goal-contract.test.js',
  'governed-mcp-vcp-native-bridge-app-integration.test.js',
  'governed-mcp-vcp-native-bridge-audit-receipt-recorder.test.js',
  'governed-mcp-vcp-native-bridge-gate.test.js',
  'governed-mcp-vcp-native-http-mcp-client-invoker.test.js',
  'governed-mcp-vcp-native-read-delegation-adapter.test.js',
  'governed-mcp-vcp-native-read-shape-probe-target-resolver.test.js',
  'governed-mcp-vcp-native-readonly-probe-adapter.test.js',
  'governed-mcp-vcp-native-write-delegation-adapter.test.js',
  'governed-vcp-native-live-read-proof-cli.test.js',
  'mcp-contract.test.js'
];

function detectChildProcessStdioSupport({ nodePath = process.execPath } = {}) {
  try {
    const result = spawn(nodePath, [
      '-e',
      'process.stdout.write("codex-memory-stdio-ok")'
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });
    return new Promise(resolve => {
      let stdout = '';
      result.stdout.on('data', chunk => { stdout += chunk.toString('utf8'); });
      result.on('error', () => resolve(false));
      result.on('close', code => resolve(code === 0 && stdout === 'codex-memory-stdio-ok'));
    });
  } catch (_) {
    return Promise.resolve(false);
  }
}

function detectChildProcessStdioSupportSync({ nodePath = process.execPath } = {}) {
  const { spawnSync } = require('node:child_process');
  try {
    const result = spawnSync(nodePath, [
      '-e',
      'process.stdout.write("codex-memory-stdio-ok")'
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      windowsHide: true
    });
    return result.status === 0 && !result.error && result.stdout === 'codex-memory-stdio-ok';
  } catch (_) {
    return false;
  }
}

function resolveExcluded({ childProcessStdioSupported = detectChildProcessStdioSupportSync() } = {}) {
  const excluded = new Set([
    ...PROVIDER_DEPENDENT_FILES,
    ...DAEMON_DEPENDENT_FILES,
    ...SELF_REFERENTIAL_FILES,
    ...FROZEN_REPLAY_E2E_FILES,
    ...FIXTURE_DRIFT_FILES
  ]);
  if (!childProcessStdioSupported) {
    for (const file of CHILD_PROCESS_STDIO_DEPENDENT_FILES) {
      excluded.add(file);
    }
  }
  return excluded;
}

function resolveDefaultSafeFiles(testsDir, options = {}) {
  const childProcessStdioSupported = Object.prototype.hasOwnProperty.call(options, 'childProcessStdioSupported')
    ? options.childProcessStdioSupported
    : detectChildProcessStdioSupportSync();
  const excluded = resolveExcluded({ childProcessStdioSupported });
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
      if (FROZEN_REPLAY_E2E_FILES.includes(f)) return { file: f, reason: 'frozen_replay_e2e' };
      if (FIXTURE_DRIFT_FILES.includes(f)) return { file: f, reason: 'fixture_drift' };
      if (!childProcessStdioSupported && CHILD_PROCESS_STDIO_DEPENDENT_FILES.includes(f)) {
        return { file: f, reason: 'child_process_stdio_unavailable' };
      }
      return { file: f, reason: 'unknown' };
    });

  return {
    safeFiles,
    excludedDetails,
    totalFiles: allFiles.length,
    environment: { childProcessStdioSupported }
  };
}

function buildExcludedSummary(excludedDetails = []) {
  const reasonCounts = {};
  for (const detail of excludedDetails) {
    const reason = detail?.reason || 'unknown';
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
  }
  const fixtureDriftFiles = excludedDetails
    .filter(detail => detail.reason === 'fixture_drift')
    .map(detail => detail.file)
    .sort();
  return {
    reasonCounts,
    expectedExcludedReasons: [
      'provider_dependent',
      'daemon_dependent',
      'self_referential',
      'frozen_replay_e2e',
      'child_process_stdio_unavailable'
    ],
    fixtureDriftStatus: fixtureDriftFiles.length === 0 ? 'clear' : 'active_unacceptable',
    fixtureDriftFiles
  };
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
      governedNativeBridgeRequiredDefaultSafeFiles: [
        ...GOVERNED_NATIVE_BRIDGE_DEFAULT_SAFE_REQUIRED_FILES
      ],
      excludedDetails,
      excludedSummary: buildExcludedSummary(excludedDetails)
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
  let failureBuf = '';
  let stdoutLineRemainder = '';
  let lastSubtestLine = '';
  function trackSummaryFailures(chunk) {
    const text = `${stdoutLineRemainder}${chunk.toString('utf8')}`;
    const lines = text.split(/\r?\n/);
    stdoutLineRemainder = lines.pop() || '';
    for (const line of lines) {
      if (line.startsWith('# Subtest: ')) lastSubtestLine = line;
      if (line.startsWith('not ok ')) {
        if (lastSubtestLine) {
          failureBuf = appendLimited(failureBuf, `${lastSubtestLine}\n`, SUMMARY_FAILURE_TAIL_CHARS);
        }
        failureBuf = appendLimited(failureBuf, `${line}\n`, SUMMARY_FAILURE_TAIL_CHARS);
      }
    }
  }
  if (options.summary) {
    child.stdout.on('data', d => {
      trackSummaryFailures(d);
      stdoutBuf = appendLimited(stdoutBuf, d);
    });
  }
  child.stderr.on('data', d => {
    if (options.summary) trackSummaryFailures(d);
    stderrBuf = options.summary ? appendLimited(stderrBuf, d) : `${stderrBuf}${d}`;
  });

  child.on('close', code => {
    if (options.summary) {
      if (stdoutLineRemainder) trackSummaryFailures(Buffer.from('\n'));
      const summary = formatSummaryOutput(`${stdoutBuf}\n${stderrBuf}\n${failureBuf}`, code !== null ? code : 1);
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
  FROZEN_REPLAY_E2E_FILES,
  CHILD_PROCESS_STDIO_DEPENDENT_FILES,
  FIXTURE_DRIFT_FILES,
  GOVERNED_NATIVE_BRIDGE_DEFAULT_SAFE_REQUIRED_FILES,
  buildExcludedSummary,
  buildDefaultSafeEnv,
  buildSpawnOptions,
  detectChildProcessStdioSupport,
  detectChildProcessStdioSupportSync,
  formatSummaryOutput,
  parseNodeMajor,
  selectSummaryOutput,
  validateNodeRuntime,
  resolveDefaultSafeFiles,
  resolveExcluded
};
