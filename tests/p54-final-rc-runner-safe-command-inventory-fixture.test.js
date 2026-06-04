const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(__dirname, 'fixtures', 'p54-final-rc-runner-safe-command-inventory-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const PUBLIC_MCP_TOOLS = [
  'record_memory',
  'search_memory',
  'memory_overview',
  'audit_memory'
];

const REQUIRED_TOP_LEVEL_FIELDS = [
  'allowedCommandClasses',
  'allowedCommands',
  'blockedActions',
  'commandsExecuted',
  'criticalGateSemantics',
  'decision',
  'finalRcMatrixExecuted',
  'fixtureOnly',
  'forbiddenFragments',
  'machineReadableOutputContract',
  'mode',
  'next',
  'phase',
  'publicMcpTools',
  'readiness',
  'rejectedCommands',
  'runnerExecuted',
  'runnerImplemented',
  'safety',
  'schemaVersion',
  'sourceContract',
  'synthetic',
  'version'
];

const REQUIRED_ALLOWED_CLASSES = [
  'syntax_check',
  'targeted_node_test',
  'full_local_test_suite',
  'docs_validation',
  'git_diff_check'
];

const REQUIRED_FAIL_CLOSED_STATES = [
  'missing',
  'unknown',
  'skipped',
  'warning',
  'warning_only',
  'failed',
  'stale',
  'ambiguous',
  'unparsable',
  'unsupported',
  'duplicate'
];

test('P54-T1 command inventory fixture locks top-level shape', () => {
  assert.equal(fixture.schemaVersion, 'p54-final-rc-runner-safe-command-inventory-v1');
  assert.equal(fixture.version, 'v1');
  assert.equal(fixture.phase, 'P54-T1-final-rc-runner-safe-command-inventory');
  assert.equal(fixture.mode, 'fixture-only-command-inventory');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.deepEqual(Object.keys(fixture).sort(), REQUIRED_TOP_LEVEL_FIELDS.sort());
});

test('P54-T1 fixture does not implement or execute the runner', () => {
  assert.equal(fixture.runnerImplemented, false);
  assert.equal(fixture.runnerExecuted, false);
  assert.equal(fixture.commandsExecuted, false);
  assert.equal(fixture.finalRcMatrixExecuted, false);
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.readiness.runnerExecutionReady, false);
  assert.equal(fixture.readiness.finalRcMatrixReady, false);
  assert.equal(fixture.readiness.v1RcReady, false);
});

test('public MCP tools remain frozen', () => {
  assert.deepEqual(fixture.publicMcpTools, PUBLIC_MCP_TOOLS);
});

test('source contract stays inventory-only and side-effect free', () => {
  assert.equal(fixture.sourceContract.mode, 'explicit_command_inventory_only');
  assert.equal(fixture.sourceContract.commandResultsAccepted, 'caller_provided_future_runner_output_only');
  assert.equal(fixture.sourceContract.readsFiles, false);
  assert.equal(fixture.sourceContract.scansDirectories, false);
  assert.equal(fixture.sourceContract.executesCommands, false);
  assert.equal(fixture.sourceContract.startsServices, false);
  assert.equal(fixture.sourceContract.callsProviders, false);
  assert.equal(fixture.sourceContract.readsRealMemory, false);
  assert.equal(fixture.sourceContract.scansRuntimeStores, false);
  assert.equal(fixture.sourceContract.writesDurableState, false);
});

test('allowed command classes and command ids are exact and non-duplicated', () => {
  assert.deepEqual(fixture.allowedCommandClasses, REQUIRED_ALLOWED_CLASSES);

  const commandIds = fixture.allowedCommands.map(command => command.id);
  assert.equal(new Set(commandIds).size, commandIds.length);
  assert.deepEqual(commandIds, [
    'syntax-runtime-schema-version-helper',
    'syntax-validation-aggregator',
    'syntax-final-rc-evaluator',
    'test-runtime-schema-version-helper',
    'test-validation-aggregator',
    'test-final-rc-evaluator',
    'test-p54-command-inventory',
    'full-local-suite',
    'docs-validation',
    'git-diff-check'
  ]);

  for (const command of fixture.allowedCommands) {
    assert.equal(REQUIRED_ALLOWED_CLASSES.includes(command.class), true, command.id);
    assert.equal(command.critical, true, command.id);
  }
});

test('allowed commands are local validation only', () => {
  const allowedText = fixture.allowedCommands.map(command => command.command).join('\n').toLowerCase();

  for (const expected of [
    'node --check',
    'node --test',
    'npm test',
    'git diff --check',
    'scripts\\validate-local.ps1 -area docs'
  ]) {
    assert.equal(allowedText.includes(expected), true, expected);
  }

  for (const forbidden of [
    'provider-smoke',
    'provider-benchmark',
    'start:http',
    'watchdog',
    'rebuild-profile -- --confirm',
    'cleanup-legacy-chunks -- --apply',
    'rebuild-shadow',
    'git push',
    'gh release',
    'import --',
    'export --',
    'backup',
    'restore'
  ]) {
    assert.equal(allowedText.includes(forbidden), false, forbidden);
  }
});

test('rejected commands include provider service migration and remote actions', () => {
  const rejectedText = fixture.rejectedCommands.join('\n').toLowerCase();

  for (const forbidden of [
    'start:http:ensure',
    'watchdog',
    'provider-smoke',
    'provider-benchmark',
    'rebuild-profile -- --confirm',
    'cleanup-legacy-chunks -- --apply',
    'rebuild-shadow',
    'migration-readiness -- --apply',
    'git push',
    'git tag',
    'gh release create'
  ]) {
    assert.equal(rejectedText.includes(forbidden), true, forbidden);
  }
});

test('critical gate semantics fail closed for unsafe or stale evidence states', () => {
  assert.deepEqual(fixture.criticalGateSemantics.acceptedPassStates, ['passed']);
  assert.deepEqual(fixture.criticalGateSemantics.failClosedStates, REQUIRED_FAIL_CLOSED_STATES);
  assert.equal(fixture.criticalGateSemantics.criticalSkippedEqualsFailure, true);
  assert.equal(fixture.criticalGateSemantics.criticalWarningOnlyEqualsFailure, true);
  assert.equal(fixture.criticalGateSemantics.unsupportedCommandEqualsFailure, true);
  assert.equal(fixture.criticalGateSemantics.duplicateCommandIdEqualsFailure, true);
  assert.equal(fixture.criticalGateSemantics.staleEvidenceEqualsFailure, true);
});

test('machine-readable output contract remains blocked until real critical gates pass', () => {
  assert.equal(fixture.machineReadableOutputContract.schemaVersion, 'p54-final-rc-runner-output-v1');
  assert.deepEqual(fixture.machineReadableOutputContract.requiredTopLevelFields, [
    'schemaVersion',
    'generatedAt',
    'decision',
    'status',
    'runnerExecuted',
    'commandsExecuted',
    'criticalGates',
    'blockedActions',
    'safety',
    'readiness'
  ]);
  assert.equal(fixture.machineReadableOutputContract.decisionUntilAllCriticalPass, 'NOT_READY_BLOCKED');
  assert.equal(fixture.machineReadableOutputContract.mustIncludeNonzeroFailurePath, true);
  assert.equal(fixture.machineReadableOutputContract.mustRedactSensitiveFragments, true);
});

test('blocked actions preserve P54 hard boundaries', () => {
  for (const action of [
    'execute_unlisted_command',
    'start_service',
    'refresh_live_mcp',
    'provider_call',
    'real_memory_read',
    'real_memory_scan',
    'runtime_store_scan',
    'sqlite_migration_apply',
    'import_export_apply',
    'backup_restore_apply',
    'config_switch',
    'watchdog_install',
    'public_mcp_expansion',
    'dependency_change',
    'durable_memory_write',
    'durable_audit_write',
    'push_tag_release_deploy'
  ]) {
    assert.equal(fixture.blockedActions.includes(action), true, action);
  }
});

test('safety and readiness flags avoid runtime or RC-ready claims', () => {
  assert.equal(fixture.safety.mutated, false);
  assert.equal(fixture.safety.commandsExecutedByThisFixture, false);
  assert.equal(fixture.safety.providerCalls, 0);
  assert.equal(fixture.safety.serviceStarted, false);
  assert.equal(fixture.safety.durableMemoryTouched, false);
  assert.equal(fixture.safety.durableAuditTouched, false);
  assert.equal(fixture.safety.realMemoryPreview, false);
  assert.equal(fixture.safety.realMemoryScanned, false);
  assert.equal(fixture.safety.runtimeStoresScanned, false);
  assert.equal(fixture.safety.migrationApplied, false);
  assert.equal(fixture.safety.importExportApplied, false);
  assert.equal(fixture.safety.backupCreated, false);
  assert.equal(fixture.safety.restorePerformed, false);
  assert.equal(fixture.safety.packageChanged, false);
  assert.equal(fixture.safety.configChanged, false);
  assert.equal(fixture.safety.publicMcpExpanded, false);
  assert.equal(fixture.safety.pushed, false);
  assert.equal(fixture.safety.tagged, false);
  assert.equal(fixture.safety.released, false);
  assert.equal(fixture.safety.deployed, false);
  assert.equal(fixture.safety.rawSecretExposed, false);
  assert.equal(fixture.safety.rawWorkspaceIdExposed, false);
  assert.equal(fixture.safety.rcReadyClaimed, false);
  assert.equal(fixture.readiness.localCommandInventoryReady, true);
  assert.equal(fixture.readiness.runtimeReady, false);
  assert.equal(fixture.readiness.pushReady, false);
  assert.equal(fixture.readiness.releaseReady, false);
  assert.equal(fixture.readiness.deployReady, false);
  assert.equal(fixture.readiness.configSwitchReady, false);
  assert.equal(fixture.readiness.watchdogReady, false);
});

test('fixture text does not expose raw secrets or raw workspace identifiers', () => {
  for (const fragment of fixture.forbiddenFragments) {
    assert.equal(fixtureText.toLowerCase().includes(fragment), true, `fixture should document forbidden fragment ${fragment}`);
  }

  const scannedText = JSON.stringify({
    ...fixture,
    forbiddenFragments: []
  }).toLowerCase();

  for (const fragment of fixture.forbiddenFragments) {
    assert.equal(scannedText.includes(fragment), false, fragment);
  }
  assert.equal(/workspace-[a-z0-9-]{8,}/i.test(scannedText), false);
  assert.equal(/"workspace_id"\s*:/i.test(scannedText), false);
});

test('reading the fixture does not rewrite it', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
