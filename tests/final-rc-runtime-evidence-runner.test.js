const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const {
  AUTHORIZATION_CLASS,
  P63_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS,
  REQUIRES_A5_FOR,
  RUNTIME_COMPLETION_GAPS,
  UNSAFE_CLI_FLAGS,
  buildFinalRcRuntimeEvidenceMatrix,
  npmRunCommand,
  runFinalRcRuntimeEvidenceMatrix
} = require('../src/core/FinalRcRuntimeEvidenceRunner');
const {
  parseArgs
} = require('../src/cli/final-rc-matrix-runner');

const workspaceRoot = path.resolve(__dirname, '..');
const cliPath = path.join('src', 'cli', 'final-rc-matrix-runner.js');
const EXPECTED_REQUIRES_A5_FOR = [
  'provider_call',
  'real_memory_scan',
  'migration_apply',
  'backup_restore',
  'push_tag_release_deploy',
  'rc_cutover'
];

function passingExecutor(command) {
  const payload = command.id === 'gate-ci'
    ? {
        summary: {
          ok: true,
          fixtureOnly: true,
          noNetwork: true,
          noDaemon: true,
          noProvider: true
        },
        checks: {
          tests: { detail: { passedCount: 1075, testCount: 1075, failedCount: 0 } },
          compare: { detail: { matchedCaseCount: 43, totalCaseCount: 43, coreMismatchCountTotal: 0 } },
          rollback: { detail: { readyCaseCount: 43, totalCaseCount: 43, coreMismatchCountTotal: 0 } },
          queries: { detail: { passedCount: 14, assertedCount: 14, failedCount: 0, fixtureOnlyCount: 14 } }
        }
      }
    : command.id === 'gate-mainline-strict'
      ? {
          summary: { ok: true, failedChecks: [] },
          results: {
            health: { status: 'ok', httpStatus: 200, payload: { name: 'vcp_codex_memory' } },
            contract: { summary: { tests: 15, pass: 15, fail: 0 } },
            test: { summary: { tests: 1075, pass: 1075, fail: 0 } },
            compare: { summary: { totalCaseCount: 43, matchedCaseCount: 43, coreMismatchCountTotal: 0 } },
            rollback: { summary: { totalCaseCount: 43, readyCaseCount: 43, coreMismatchCountTotal: 0 } }
          }
        }
      : null;

  return {
    status: 'passed',
    exitCode: 0,
    stdout: '# tests 1\n# pass 1\n# fail 0\n',
    stderr: '',
    payload,
    durationMs: 1,
    providerCalls: 0,
    serviceStarted: false,
    realMemoryTouched: false,
    runtimeStoresScanned: false,
    durableStateTouched: false,
    publicMcpExpanded: false,
    remoteWrite: false,
    rawSensitiveOutputExposed: false,
    summary: `${command.id} passed`
  };
}

function assertNoSensitiveSurface(value) {
  const text = JSON.stringify(value).toLowerCase();

  for (const fragment of [
    'authorization:',
    'bearer ',
    'api_key',
    'providerapikey',
    'workspace_id',
    'raw_workspace_id',
    'set-cookie',
    'token=',
    'password=',
    'http://',
    'https://',
    '.env',
    'a:\\',
    'c:\\'
  ]) {
    assert.equal(text.includes(fragment), false, fragment);
  }
}

function assertAuthorizationPosture(report) {
  assert.equal(report.authorizationClass, AUTHORIZATION_CLASS);
  assert.deepEqual(REQUIRES_A5_FOR, EXPECTED_REQUIRES_A5_FOR);
  assert.deepEqual(report.requiresA5For, EXPECTED_REQUIRES_A5_FOR);
  assert.equal(report.cutoverAuthorized, false);
}

test('P63 runtime evidence matrix is local allowlisted and does not include A5 commands', () => {
  const matrix = buildFinalRcRuntimeEvidenceMatrix();

  assert.equal(matrix.length > 0, true);
  assert.equal(matrix.every(command => command.critical === true), true);
  assert.equal(matrix.some(command => command.id === 'gate-ci'), true);
  assert.equal(matrix.some(command => command.id === 'gate-mainline-strict'), true);
  assert.equal(matrix.some(command => command.id === 'test-schema-version-runtime-boundary'), true);
  assert.equal(matrix.some(command => command.id === 'docs-validation'), true);
  assert.equal(matrix.some(command => command.id === 'git-diff-check'), true);

  const encoded = matrix.map(command => command.display).join('\n').toLowerCase();
  for (const denied of [
    'git push',
    'git tag',
    'release create',
    'deploy',
    'provider-smoke',
    'provider-benchmark',
    'start:http:ensure',
    'watchdog',
    'rebuild-profile -- --confirm',
    'cleanup-legacy-chunks -- --apply',
    'rebuild-shadow'
  ]) {
    assert.equal(encoded.includes(denied), false, denied);
  }
});

test('P63 npm command specs are executable through Windows cmd without shell expansion', () => {
  const spec = npmRunCommand('gate:ci', ['--json']);

  if (process.platform === 'win32') {
    assert.match(spec.command.toLowerCase(), /cmd\.exe$/);
    assert.deepEqual(spec.args.slice(0, 3), ['/d', '/s', '/c']);
    assert.equal(spec.args[3], 'npm run gate:ci -- --json');
    return;
  }

  assert.equal(spec.command, 'npm');
  assert.deepEqual(spec.args, ['run', 'gate:ci', '--', '--json']);
});

test('P63 runner executes injected local matrix evidence and keeps RC blocked', () => {
  const report = runFinalRcRuntimeEvidenceMatrix({
    generatedAt: '2026-05-18T00:00:00.000Z',
    execute: true,
    dryRun: false,
    executor: passingExecutor
  });

  assert.equal(report.schemaVersion, P63_SCHEMA_VERSION);
  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.status, 'local_runtime_evidence_passed_rc_still_blocked');
  assertAuthorizationPosture(report);
  assert.deepEqual(report.publicMcpTools, PUBLIC_MCP_TOOLS);
  assert.equal(report.runnerImplemented, true);
  assert.equal(report.runnerExecuted, true);
  assert.equal(report.commandsExecuted, true);
  assert.equal(report.localRuntimeEvidenceMatrixExecuted, true);
  assert.equal(report.allowlistedFinalRcEvidenceRunnerExecuted, true);
  assert.equal(report.finalRcMatrixExecuted, false);
  assert.equal(report.fullFinalRcMatrixExecuted, false);
  assert.equal(report.finalRcMatrixReady, false);
  assert.equal(report.runtimeReady, false);
  assert.equal(report.v1RcReady, false);
  assert.equal(report.rcReady, false);
  assert.equal(report.criticalGates.allCriticalCommandsPassed, true);
  assert.equal(report.criticalGates.failed, 0);
  assert.equal(report.commandResults.length, buildFinalRcRuntimeEvidenceMatrix().length);
  assert.equal(report.commandResults.every(result => result.status === 'passed'), true);
  assert.equal(report.locallyEvidencedRuntimeGaps.includes('runtime_schema_version_enforcement_not_fully_proven'), true);
  assert.equal(report.locallyEvidencedRuntimeGaps.includes('final_rc_matrix_runner_not_executed_as_real_matrix'), true);
  assert.equal(report.remainingRuntimeGaps.includes('runtime_schema_version_enforcement_not_fully_proven'), false);
  assert.equal(report.remainingRuntimeGaps.includes('final_rc_matrix_runner_not_executed_as_real_matrix'), false);
  assert.equal(report.remainingRuntimeGaps.includes('mainline_strict_gate_not_executed_for_cutover'), true);
  assert.equal(report.remainingRuntimeGaps.length, RUNTIME_COMPLETION_GAPS.length - 2);
  assert.equal(report.aggregator.validationEvidenceAcceptedCount, report.commandResults.length);
  assert.equal(report.aggregator.validationEvidenceCommandCoverageStatus, 'command_coverage_present');
  assert.equal(report.aggregator.validationAggregatorFullImplementation, false);
  assert.equal(report.aggregator.schemaVersionRuntimeEnforcementImplemented, true);
  assert.equal(report.aggregator.finalRcMatrixReady, false);
  assert.equal(report.safety.executesCommands, true);
  assert.equal(report.safety.startsServices, false);
  assert.equal(report.safety.callsProviders, false);
  assert.equal(report.safety.readsRealMemory, false);
  assert.equal(report.safety.writesDurableMemory, false);
  assert.equal(report.safety.remoteWrites, false);
  assertNoSensitiveSurface(report);
});

test('P63 runner fails closed for dry-run or unsafe command evidence', () => {
  const dryRun = runFinalRcRuntimeEvidenceMatrix({
    generatedAt: '2026-05-18T00:00:00.000Z'
  });

  assert.equal(dryRun.status, 'blocked_fail_closed');
  assertAuthorizationPosture(dryRun);
  assert.equal(dryRun.runnerExecuted, false);
  assert.equal(dryRun.commandsExecuted, false);
  assert.equal(dryRun.localRuntimeEvidenceMatrixExecuted, false);
  assert.equal(dryRun.allowlistedFinalRcEvidenceRunnerExecuted, false);
  assert.equal(dryRun.finalRcMatrixExecuted, false);
  assert.equal(dryRun.fullFinalRcMatrixExecuted, false);
  assert.equal(dryRun.safety.executesCommands, false);
  assert.equal(dryRun.remainingRuntimeGaps.length, RUNTIME_COMPLETION_GAPS.length);

  const unsafe = runFinalRcRuntimeEvidenceMatrix({
    generatedAt: '2026-05-18T00:00:00.000Z',
    execute: true,
    dryRun: false,
    executor(command) {
      return command.id === 'gate-ci'
        ? { ...passingExecutor(command), providerCalls: 1, summary: 'provider call attempted' }
        : passingExecutor(command);
    }
  });

  assert.equal(unsafe.status, 'blocked_fail_closed');
  assertAuthorizationPosture(unsafe);
  assert.equal(unsafe.criticalGates.allCriticalCommandsPassed, false);
  assert.equal(unsafe.criticalGates.failedIds.includes('gate-ci'), true);
  assert.equal(unsafe.locallyEvidencedRuntimeGaps.includes('runtime_schema_version_enforcement_not_fully_proven'), false);
  assert.equal(unsafe.locallyEvidencedRuntimeGaps.includes('final_rc_matrix_runner_not_executed_as_real_matrix'), false);
  assert.equal(unsafe.remainingRuntimeGaps.includes('runtime_schema_version_enforcement_not_fully_proven'), true);
  assert.equal(unsafe.remainingRuntimeGaps.includes('final_rc_matrix_runner_not_executed_as_real_matrix'), true);
  assert.equal(unsafe.aggregator.validationEvidenceCanClaimV1RcReady, false);
});

test('P63 CLI defaults to dry-run and rejects unsafe flags', () => {
  assert.deepEqual(parseArgs(['--execute', '--json', '--pretty']), {
    execute: true,
    dryRun: false,
    json: true,
    pretty: true,
    help: false,
    rejectedFlag: null,
    unknownFlag: null
  });

  for (const flag of UNSAFE_CLI_FLAGS) {
    assert.equal(parseArgs([flag]).rejectedFlag, flag);
  }

  const result = spawnSync(process.execPath, [cliPath, '--json'], {
    cwd: workspaceRoot,
    encoding: 'utf8',
    timeout: 30000
  });
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.equal(report.status, 'blocked_fail_closed');
  assertAuthorizationPosture(report);
  assert.equal(report.runnerExecuted, false);
  assert.equal(report.commandsExecuted, false);
  assert.equal(report.safety.executesCommands, false);
  assertNoSensitiveSurface(report);

  const rejected = spawnSync(process.execPath, [cliPath, '--provider', '--json'], {
    cwd: workspaceRoot,
    encoding: 'utf8',
    timeout: 30000
  });
  const rejectedReport = JSON.parse(rejected.stdout);

  assert.equal(rejected.status, 1);
  assert.equal(rejectedReport.rejectedFlag, '--provider');
  assertAuthorizationPosture(rejectedReport);
  assert.equal(rejectedReport.runnerExecuted, false);
  assert.equal(rejectedReport.safety.callsProviders, false);
});
