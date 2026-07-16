const { buildV1RcValidationAggregatorReport } = require('./ValidationAggregatorService');
const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const P63_SCHEMA_VERSION = 'p63-final-rc-runtime-evidence-runner-v1';
const P63_PHASE = 'P63-T1-final-rc-matrix-runner-real-execution-evidence-bridge';
const DECISION = 'NOT_READY_BLOCKED';
const AUTHORIZATION_CLASS = 'A4_LOCAL_EXECUTABLE_VALIDATION';

const REQUIRES_A5_FOR = Object.freeze([
  'provider_call',
  'real_memory_scan',
  'migration_apply',
  'backup_restore',
  'push_tag_release_deploy',
  'rc_cutover'
]);

const PUBLIC_MCP_TOOLS = Object.freeze(['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory']);

const RUNTIME_COMPLETION_GAPS = Object.freeze([
  'runtime_schema_version_enforcement_not_fully_proven',
  'validation_aggregator_full_implementation_incomplete',
  'final_rc_matrix_runner_not_executed_as_real_matrix',
  'governance_review_approval_audit_runtime_loop_not_executed',
  'recall_isolation_runtime_proof_not_executed',
  'migration_import_export_backup_restore_approval_execution_blocked',
  'live_http_operation_readiness_not_claimed',
  'mainline_strict_gate_not_executed_for_cutover',
  'rc_cutover_not_executed'
]);

const A5_HARD_STOPS = Object.freeze([
  'push',
  'tag_create',
  'release_create',
  'deploy',
  'config_switch',
  'watchdog_install',
  'startup_install',
  'provider_call',
  'real_memory_scan',
  'sqlite_migration_apply',
  'import_export_apply',
  'backup_restore_apply',
  'durable_memory_write',
  'durable_audit_write',
  'public_mcp_expansion',
  'rc_ready_claim'
]);

const UNSAFE_CLI_FLAGS = Object.freeze([
  '--push',
  '--tag',
  '--release',
  '--deploy',
  '--config-switch',
  '--watchdog',
  '--startup',
  '--provider',
  '--real-memory',
  '--scan-real-memory',
  '--durable-write',
  '--write-memory',
  '--write-audit',
  '--migrate',
  '--apply',
  '--import',
  '--export',
  '--backup',
  '--restore',
  '--rc-ready',
  '--cutover'
]);

function buildAuthorizationPosture() {
  return {
    authorizationClass: AUTHORIZATION_CLASS,
    requiresA5For: REQUIRES_A5_FOR,
    cutoverAuthorized: false
  };
}

function commandBin(name) {
  if (name === 'powershell') return process.platform === 'win32' ? 'powershell' : 'pwsh';
  return name;
}

function npmRunCommand(script, args = []) {
  const commandText = ['npm', 'run', script, '--', ...args].join(' ');
  if (process.platform === 'win32') {
    return {
      command: process.env.ComSpec || 'cmd.exe',
      args: ['/d', '/s', '/c', commandText]
    };
  }

  return {
    command: 'npm',
    args: ['run', script, '--', ...args]
  };
}

function buildFinalRcRuntimeEvidenceMatrix() {
  const gateCi = npmRunCommand('gate:ci', ['--json']);
  const gateMainlineStrict = npmRunCommand('gate:mainline:strict', ['--json']);

  return [
    {
      id: 'syntax-runtime-schema-version-helper',
      class: 'syntax_check',
      command: process.execPath,
      args: ['--check', 'src/core/RuntimeSchemaVersionEnforcementContract.js'],
      display: 'node --check src/core/RuntimeSchemaVersionEnforcementContract.js',
      critical: true,
      timeoutMs: 30000
    },
    {
      id: 'syntax-validation-aggregator',
      class: 'syntax_check',
      command: process.execPath,
      args: ['--check', 'src/core/ValidationAggregatorService.js'],
      display: 'node --check src/core/ValidationAggregatorService.js',
      critical: true,
      timeoutMs: 30000
    },
    {
      id: 'syntax-final-rc-runtime-evidence-runner',
      class: 'syntax_check',
      command: process.execPath,
      args: ['--check', 'src/core/FinalRcRuntimeEvidenceRunner.js'],
      display: 'node --check src/core/FinalRcRuntimeEvidenceRunner.js',
      critical: true,
      timeoutMs: 30000
    },
    {
      id: 'syntax-final-rc-runner-cli',
      class: 'syntax_check',
      command: process.execPath,
      args: ['--check', 'src/cli/final-rc-matrix-runner.js'],
      display: 'node --check src/cli/final-rc-matrix-runner.js',
      critical: true,
      timeoutMs: 30000
    },
    {
      id: 'test-runtime-schema-version-helper',
      class: 'targeted_node_test',
      command: process.execPath,
      args: ['--test', 'tests/runtime-schema-version-enforcement-contract-helper.test.js'],
      display: 'node --test tests/runtime-schema-version-enforcement-contract-helper.test.js',
      critical: true,
      timeoutMs: 120000
    },
    {
      id: 'test-schema-version-runtime-boundary',
      class: 'targeted_node_test',
      command: process.execPath,
      args: ['--test', 'tests/schema-version-runtime-boundary.test.js'],
      display: 'node --test tests/schema-version-runtime-boundary.test.js',
      critical: true,
      timeoutMs: 120000
    },
    {
      id: 'test-validation-aggregator',
      class: 'targeted_node_test',
      command: process.execPath,
      args: [
        '--test',
        'tests/v1-rc-validation-aggregator-implementation.test.js',
        'tests/v1-rc-validation-aggregator.test.js',
        'tests/v1-rc-validation-aggregator-cli.test.js'
      ],
      display: 'node --test tests/v1-rc-validation-aggregator-implementation.test.js tests/v1-rc-validation-aggregator.test.js tests/v1-rc-validation-aggregator-cli.test.js',
      critical: true,
      timeoutMs: 120000
    },
    {
      id: 'test-final-rc-runtime-evidence-runner',
      class: 'targeted_node_test',
      command: process.execPath,
      args: ['--test', 'tests/final-rc-runtime-evidence-runner.test.js'],
      display: 'node --test tests/final-rc-runtime-evidence-runner.test.js',
      critical: true,
      timeoutMs: 120000
    },
    {
      id: 'gate-ci',
      class: 'local_gate',
      command: gateCi.command,
      args: gateCi.args,
      display: 'npm run gate:ci -- --json',
      critical: true,
      timeoutMs: 180000
    },
    {
      id: 'gate-mainline-strict',
      class: 'runtime_evidence_gate',
      command: gateMainlineStrict.command,
      args: gateMainlineStrict.args,
      display: 'npm run gate:mainline:strict -- --json',
      critical: true,
      timeoutMs: 240000
    },
    {
      id: 'docs-validation',
      class: 'docs_validation',
      command: commandBin('powershell'),
      args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', '.\\scripts\\validate-local.ps1', '-Area', 'docs'],
      display: 'powershell -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\validate-local.ps1 -Area docs',
      critical: true,
      timeoutMs: 120000
    },
    {
      id: 'git-diff-check',
      class: 'git_diff_check',
      command: 'git',
      args: ['diff', '--check'],
      display: 'git diff --check',
      critical: true,
      timeoutMs: 30000
    }
  ];
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function safeString(value, fallback = '') {
  if (typeof value !== 'string' || value.trim() === '') return fallback;
  return redactSensitiveFragments(value.trim()).slice(0, 240);
}

function safeStatus(value) {
  return value === 'passed' ? 'passed' : 'failed';
}

function normalizeExitCode(value) {
  return Number.isInteger(value) ? value : null;
}

function extractNodeTestSummary(text = '') {
  const passMatch = String(text).match(/(?:#|ℹ)\s*pass\s+(\d+)/);
  const failMatch = String(text).match(/(?:#|ℹ)\s*fail\s+(\d+)/);
  const testMatch = String(text).match(/(?:#|ℹ)\s*tests\s+(\d+)/);

  return {
    tests: testMatch ? Number.parseInt(testMatch[1], 10) : null,
    pass: passMatch ? Number.parseInt(passMatch[1], 10) : null,
    fail: failMatch ? Number.parseInt(failMatch[1], 10) : null
  };
}

function summarizeGateCiPayload(payload) {
  if (!isPlainObject(payload)) return {};
  const checks = isPlainObject(payload.checks) ? payload.checks : {};
  const tests = isPlainObject(checks.tests) ? checks.tests : {};
  const compare = isPlainObject(checks.compare) ? checks.compare : {};
  const rollback = isPlainObject(checks.rollback) ? checks.rollback : {};
  const queries = isPlainObject(checks.queries) ? checks.queries : {};

  return {
    ok: payload.summary?.ok === true,
    fixtureOnly: payload.summary?.fixtureOnly === true,
    noNetwork: payload.summary?.noNetwork === true,
    noDaemon: payload.summary?.noDaemon === true,
    noProvider: payload.summary?.noProvider === true,
    tests: tests.detail
      ? {
          passed: tests.detail.passed ?? tests.detail.passedCount ?? null,
          total: tests.detail.total ?? tests.detail.testCount ?? null,
          failed: tests.detail.failed ?? tests.detail.failedCount ?? null
        }
      : {},
    compare: compare.detail
      ? {
          matched: compare.detail.matchedCaseCount ?? null,
          total: compare.detail.totalCaseCount ?? null,
          coreMismatch: compare.detail.coreMismatchCountTotal ?? null
        }
      : {},
    rollback: rollback.detail
      ? {
          ready: rollback.detail.readyCaseCount ?? null,
          total: rollback.detail.totalCaseCount ?? null,
          coreMismatch: rollback.detail.coreMismatchCountTotal ?? null
        }
      : {},
    queries: queries.detail
      ? {
          passed: queries.detail.passedCount ?? null,
          asserted: queries.detail.assertedCount ?? null,
          failed: queries.detail.failedCount ?? null,
          fixtureOnly: queries.detail.fixtureOnlyCount ?? null
        }
      : {}
  };
}

function summarizeMainlineStrictPayload(payload) {
  if (!isPlainObject(payload)) return {};
  const results = isPlainObject(payload.results) ? payload.results : {};
  const health = isPlainObject(results.health) ? results.health : {};
  const contract = isPlainObject(results.contract) ? results.contract : {};
  const test = isPlainObject(results.test) ? results.test : {};
  const compare = isPlainObject(results.compare) ? results.compare : {};
  const rollback = isPlainObject(results.rollback) ? results.rollback : {};

  return {
    ok: payload.summary?.ok === true,
    failedChecks: Array.isArray(payload.summary?.failedChecks)
      ? payload.summary.failedChecks.map(item => safeString(item)).filter(Boolean)
      : [],
    health: {
      status: safeString(health.status),
      httpStatus: Number.isInteger(health.httpStatus) ? health.httpStatus : null,
      serviceName: safeString(health.payload?.name)
    },
    contract: contract.summary
      ? {
          tests: contract.summary.tests ?? null,
          pass: contract.summary.pass ?? null,
          fail: contract.summary.fail ?? null
        }
      : {},
    test: test.summary
      ? {
          tests: test.summary.tests ?? null,
          pass: test.summary.pass ?? null,
          fail: test.summary.fail ?? null
        }
      : {},
    compare: compare.summary
      ? {
          matched: compare.summary.matchedCaseCount ?? null,
          total: compare.summary.totalCaseCount ?? null,
          coreMismatch: compare.summary.coreMismatchCountTotal ?? null
        }
      : {},
    rollback: rollback.summary
      ? {
          ready: rollback.summary.readyCaseCount ?? null,
          total: rollback.summary.totalCaseCount ?? null,
          coreMismatch: rollback.summary.coreMismatchCountTotal ?? null
        }
      : {}
  };
}

function summarizePayload(commandId, payload) {
  if (commandId === 'gate-ci') return summarizeGateCiPayload(payload);
  if (commandId === 'gate-mainline-strict') return summarizeMainlineStrictPayload(payload);
  return {};
}

function commandResultSummary(command, normalized) {
  if (command.id === 'gate-ci' && normalized.details.ok === true) {
    return 'gate:ci passed with fixture-only no-network no-provider evidence';
  }
  if (command.id === 'gate-mainline-strict' && normalized.details.ok === true) {
    return 'gate:mainline:strict passed with health contract test compare rollback evidence';
  }
  if (command.class === 'targeted_node_test' && normalized.testSummary.tests !== null) {
    return `node test ${normalized.testSummary.pass}/${normalized.testSummary.tests} passed`;
  }
  if (normalized.status === 'passed') {
    return `${command.id} passed`;
  }
  return `${command.id} failed`;
}

function normalizeCommandResult(command, rawResult = {}) {
  const safeResult = isPlainObject(rawResult) ? rawResult : {};
  const exitCode = normalizeExitCode(safeResult.exitCode);
  const status = safeResult.status === 'passed' || exitCode === 0 ? 'passed' : 'failed';
  const testSummary = extractNodeTestSummary(`${safeResult.stdout || ''}\n${safeResult.stderr || ''}`);
  const details = summarizePayload(command.id, safeResult.payload);
  const unsafeSignals = {
    providerCalls: Number.isFinite(safeResult.providerCalls) ? safeResult.providerCalls : 0,
    serviceStarted: safeResult.serviceStarted === true,
    realMemoryTouched: safeResult.realMemoryTouched === true,
    runtimeStoresScanned: safeResult.runtimeStoresScanned === true,
    durableStateTouched: safeResult.durableStateTouched === true,
    publicMcpExpanded: safeResult.publicMcpExpanded === true,
    remoteWrite: safeResult.remoteWrite === true,
    rawSensitiveOutputExposed: safeResult.rawSensitiveOutputExposed === true
  };
  const unsafe = unsafeSignals.providerCalls !== 0 ||
    unsafeSignals.serviceStarted ||
    unsafeSignals.realMemoryTouched ||
    unsafeSignals.runtimeStoresScanned ||
    unsafeSignals.durableStateTouched ||
    unsafeSignals.publicMcpExpanded ||
    unsafeSignals.remoteWrite ||
    unsafeSignals.rawSensitiveOutputExposed;
  const normalized = {
    id: command.id,
    class: command.class,
    critical: command.critical === true,
    command: command.display,
    status: unsafe ? 'failed' : safeStatus(status),
    exitCode,
    durationMs: Number.isFinite(safeResult.durationMs) ? safeResult.durationMs : null,
    testSummary,
    details,
    unsafeSignals,
    stale: safeResult.stale === true,
    skipped: safeResult.skipped === true,
    warningOnly: safeResult.warningOnly === true,
    unsupported: safeResult.unsupported === true
  };

  return {
    ...normalized,
    summary: safeString(safeResult.summary, commandResultSummary(command, normalized))
  };
}

function buildDryRunCommandResult(command) {
  return {
    id: command.id,
    class: command.class,
    critical: command.critical === true,
    command: command.display,
    status: 'not_executed',
    exitCode: null,
    durationMs: null,
    testSummary: { tests: null, pass: null, fail: null },
    details: {},
    unsafeSignals: {
      providerCalls: 0,
      serviceStarted: false,
      realMemoryTouched: false,
      runtimeStoresScanned: false,
      durableStateTouched: false,
      publicMcpExpanded: false,
      remoteWrite: false,
      rawSensitiveOutputExposed: false
    },
    stale: false,
    skipped: true,
    warningOnly: false,
    unsupported: false,
    summary: `${command.id} not executed`
  };
}

function commandResultPassed(result) {
  return result.status === 'passed' &&
    result.exitCode === 0 &&
    result.stale === false &&
    result.skipped === false &&
    result.warningOnly === false &&
    result.unsupported === false &&
    result.unsafeSignals.providerCalls === 0 &&
    result.unsafeSignals.serviceStarted === false &&
    result.unsafeSignals.realMemoryTouched === false &&
    result.unsafeSignals.runtimeStoresScanned === false &&
    result.unsafeSignals.durableStateTouched === false &&
    result.unsafeSignals.publicMcpExpanded === false &&
    result.unsafeSignals.remoteWrite === false &&
    result.unsafeSignals.rawSensitiveOutputExposed === false;
}

function buildAggregatorSources(commandResults, generatedAt) {
  return commandResults
    .filter(result => result.status === 'passed' || result.status === 'failed')
    .map(result => ({
      id: `p63-${result.id}`,
      source_type: 'local_validation',
      evidence_class: 'local_validation',
      status: result.status,
      source_ref: 'p63-final-rc-runtime-evidence-runner',
      observed_at: generatedAt,
      commands: [result.command],
      summary: result.summary,
      safety: {
        mutated: false,
        providerCalls: 0,
        serviceStarted: false,
        durableMemoryTouched: false,
        realMemoryPreview: false,
        migrationApplied: false,
        importExportApplied: false,
        watchdogStartupInstalled: false,
        configChanged: false,
        publicMcpExpanded: false,
        pushed: false,
        tagged: false,
        released: false,
        deployed: false
      }
    }));
}

function buildRuntimeGapEvidence({
  commandResults,
  allCriticalCommandsPassed,
  runnerExecuted,
  aggregatorReport = null
}) {
  const commandPassed = id => commandResultPassed(commandResults.find(result => result.id === id) || {});
  const mainlineStrictPassed = commandPassed('gate-mainline-strict');
  const schemaRuntimeBoundaryPassed =
    commandPassed('test-runtime-schema-version-helper') &&
    commandPassed('test-schema-version-runtime-boundary');
  const schemaRuntimeEnforcementImplemented =
    aggregatorReport?.summary?.schemaVersionRuntimeEnforcementImplemented === true;

  return RUNTIME_COMPLETION_GAPS.map(id => {
    if (id === 'runtime_schema_version_enforcement_not_fully_proven') {
      const satisfied = runnerExecuted &&
        allCriticalCommandsPassed &&
        schemaRuntimeBoundaryPassed &&
        schemaRuntimeEnforcementImplemented;

      return {
        id,
        status: satisfied
          ? 'fresh_local_runtime_write_boundary_proof_passed'
          : 'still_required',
        satisfiedForCompletion: satisfied,
        note: 'MemoryWriteService runtime write boundary and schema/version helper evidence passed locally; this does not imply RC readiness.'
      };
    }
    if (id === 'final_rc_matrix_runner_not_executed_as_real_matrix') {
      return {
        id,
        status: runnerExecuted && allCriticalCommandsPassed
          ? 'fresh_local_matrix_execution_passed'
          : 'not_executed_or_failed',
        satisfiedForCompletion: runnerExecuted && allCriticalCommandsPassed,
        note: 'P63 local runner executed the allowlisted matrix; this is local evidence only, not RC readiness.'
      };
    }
    if (id === 'mainline_strict_gate_not_executed_for_cutover') {
      return {
        id,
        status: mainlineStrictPassed
          ? 'fresh_local_gate_passed_not_cutover_authorized'
          : 'not_executed_or_failed',
        satisfiedForCompletion: false,
        note: 'The strict gate can be fresh local evidence, but cutover-context execution remains separate.'
      };
    }
    if (id === 'live_http_operation_readiness_not_claimed') {
      return {
        id,
        status: mainlineStrictPassed
          ? 'loopback_health_observed_not_operation_readiness'
          : 'not_executed_or_failed',
        satisfiedForCompletion: false,
        note: 'Loopback health evidence is not production/live operation readiness.'
      };
    }
    if (id === 'migration_import_export_backup_restore_approval_execution_blocked') {
      return {
        id,
        status: 'blocked_pending_a5',
        satisfiedForCompletion: false,
        note: 'Apply/import/export/backup/restore execution remains A5-gated.'
      };
    }

    return {
      id,
      status: 'still_required',
      satisfiedForCompletion: false,
      note: 'Not completed by the P63 local final RC runner evidence bridge.'
    };
  });
}

function summarizeAggregatorReport(report) {
  return {
    schemaVersion: report.schemaVersion,
    decision: report.decision,
    validationEvidenceAcceptedCount: report.summary.validationEvidenceAcceptedCount,
    validationEvidenceRejectedCount: report.summary.validationEvidenceRejectedCount,
    validationEvidenceFreshnessStatus: report.summary.validationEvidenceFreshnessStatus,
    validationEvidenceGateReadinessStatus: report.summary.validationEvidenceGateReadinessStatus,
    validationEvidenceCommandCoverageStatus: report.summary.validationEvidenceCommandCoverageStatus,
    validationEvidenceCommandCount: report.summary.validationEvidenceCommandCount,
    validationEvidenceCanClaimV1RcReady: report.summary.validationEvidenceCanClaimV1RcReady,
    validationAggregatorFullImplementation: report.summary.validationAggregatorFullImplementation,
    schemaVersionRuntimeEnforcementImplemented: report.summary.schemaVersionRuntimeEnforcementImplemented,
    runtimeReady: report.summary.runtimeReady,
    finalRcMatrixReady: report.summary.finalRcMatrixReady,
    rcReady: report.summary.rcReady,
    safety: {
      mutated: report.safety.mutated,
      providerCalls: report.safety.providerCalls,
      serviceStarted: report.safety.serviceStarted,
      durableMemoryTouched: report.safety.durableMemoryTouched,
      publicMcpExpanded: report.safety.publicMcpExpanded,
      pushed: report.safety.pushed,
      tagged: report.safety.tagged,
      released: report.safety.released,
      deployed: report.safety.deployed
    }
  };
}

function buildBlockedReport({ generatedAt, matrix, reason }) {
  const commandResults = matrix.map(buildDryRunCommandResult);
  const aggregatorReport = buildV1RcValidationAggregatorReport({
    generatedAt,
    validationEvidenceSources: []
  });
  const runtimeGapEvidence = buildRuntimeGapEvidence({
    commandResults,
    allCriticalCommandsPassed: false,
    runnerExecuted: false,
    aggregatorReport
  });

  return {
    schemaVersion: P63_SCHEMA_VERSION,
    phase: P63_PHASE,
    generatedAt,
    mode: 'local-runtime-evidence-runner',
    decision: DECISION,
    status: 'blocked_fail_closed',
    blockedReason: safeString(reason, 'runner_not_executed'),
    ...buildAuthorizationPosture(),
    publicMcpTools: PUBLIC_MCP_TOOLS,
    runnerImplemented: true,
    runnerExecuted: false,
    commandsExecuted: false,
    localRuntimeEvidenceMatrixExecuted: false,
    allowlistedFinalRcEvidenceRunnerExecuted: false,
    finalRcMatrixExecuted: false,
    fullFinalRcMatrixExecuted: false,
    finalRcMatrixReady: false,
    runtimeReady: false,
    v1RcReady: false,
    rcReady: false,
    commandResults,
    criticalGates: {
      total: matrix.length,
      passed: 0,
      failed: 0,
      notExecuted: matrix.length,
      allCriticalCommandsPassed: false
    },
    runtimeGapEvidence,
    locallyEvidencedRuntimeGaps: [],
    remainingRuntimeGaps: RUNTIME_COMPLETION_GAPS,
    a5HardStops: A5_HARD_STOPS,
    aggregator: summarizeAggregatorReport(aggregatorReport),
    evidenceTrust: {
      level: 'self_reported_local_runner',
      sandboxIsolationVerified: false,
      networkIsolationVerified: false,
      providerIsolationVerified: false,
      durableWriteIsolationVerified: false
    },
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

function runFinalRcRuntimeEvidenceMatrix({
  generatedAt = new Date().toISOString(),
  execute = false,
  dryRun = true,
  executor = null
} = {}) {
  const matrix = buildFinalRcRuntimeEvidenceMatrix();

  if (execute !== true || dryRun !== false) {
    return buildBlockedReport({
      generatedAt,
      matrix,
      reason: 'execute_requires_explicit_execute_true_and_dry_run_false'
    });
  }

  if (typeof executor !== 'function') {
    return buildBlockedReport({
      generatedAt,
      matrix,
      reason: 'missing_injected_executor'
    });
  }

  const commandResults = [];

  for (const command of matrix) {
    try {
      commandResults.push(normalizeCommandResult(command, executor(command)));
    } catch (error) {
      commandResults.push(normalizeCommandResult(command, {
        status: 'failed',
        exitCode: 1,
        summary: error && error.message ? error.message : 'executor_threw'
      }));
    }
  }

  const criticalResults = commandResults.filter(result => result.critical);
  const passedCriticalResults = criticalResults.filter(commandResultPassed);
  const failedCriticalResults = criticalResults.filter(result => !commandResultPassed(result));
  const runnerExecuted = commandResults.length === matrix.length &&
    commandResults.every(result => result.status === 'passed' || result.status === 'failed');
  const allCriticalCommandsPassed = runnerExecuted && failedCriticalResults.length === 0;
  const aggregatorReport = buildV1RcValidationAggregatorReport({
    generatedAt,
    validationEvidenceSources: buildAggregatorSources(commandResults, generatedAt)
  });
  const runtimeGapEvidence = buildRuntimeGapEvidence({
    commandResults,
    allCriticalCommandsPassed,
    runnerExecuted,
    aggregatorReport
  });
  const locallyEvidencedRuntimeGaps = runtimeGapEvidence
    .filter(gap => gap.satisfiedForCompletion === true)
    .map(gap => gap.id);
  const remainingRuntimeGaps = runtimeGapEvidence
    .filter(gap => gap.satisfiedForCompletion !== true)
    .map(gap => gap.id);

  return {
    schemaVersion: P63_SCHEMA_VERSION,
    phase: P63_PHASE,
    generatedAt,
    mode: 'local-runtime-evidence-runner',
    decision: DECISION,
    status: allCriticalCommandsPassed
      ? 'local_runtime_evidence_passed_rc_still_blocked'
      : 'blocked_fail_closed',
    ...buildAuthorizationPosture(),
    publicMcpTools: PUBLIC_MCP_TOOLS,
    runnerImplemented: true,
    runnerExecuted,
    commandsExecuted: runnerExecuted,
    localRuntimeEvidenceMatrixExecuted: runnerExecuted,
    allowlistedFinalRcEvidenceRunnerExecuted: runnerExecuted,
    finalRcMatrixExecuted: false,
    fullFinalRcMatrixExecuted: false,
    finalRcMatrixReady: false,
    runtimeReady: false,
    v1RcReady: false,
    rcReady: false,
    commandResults,
    criticalGates: {
      total: criticalResults.length,
      passed: passedCriticalResults.length,
      failed: failedCriticalResults.length,
      notExecuted: criticalResults.filter(result => result.status === 'not_executed').length,
      failedIds: failedCriticalResults.map(result => result.id),
      allCriticalCommandsPassed
    },
    runtimeGapEvidence,
    locallyEvidencedRuntimeGaps,
    remainingRuntimeGaps,
    a5HardStops: A5_HARD_STOPS,
    aggregator: summarizeAggregatorReport(aggregatorReport),
    evidenceTrust: {
      level: 'self_reported_local_runner',
      sandboxIsolationVerified: false,
      networkIsolationVerified: false,
      providerIsolationVerified: false,
      durableWriteIsolationVerified: false
    },
    safety: {
      executesCommands: true,
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

module.exports = {
  A5_HARD_STOPS,
  AUTHORIZATION_CLASS,
  DECISION,
  P63_PHASE,
  P63_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS,
  REQUIRES_A5_FOR,
  RUNTIME_COMPLETION_GAPS,
  UNSAFE_CLI_FLAGS,
  buildFinalRcRuntimeEvidenceMatrix,
  buildRuntimeGapEvidence,
  npmRunCommand,
  runFinalRcRuntimeEvidenceMatrix,
  summarizeGateCiPayload,
  summarizeMainlineStrictPayload
};
