const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  EXPECTED_EXECUTION_MODE,
  EXPECTED_EXECUTION_SCHEMA_VERSION,
  executeFinalRcRunnerAllowlistedPlan,
  normalizeFinalRcRunnerAllowlistedExecutionInput
} = require('../src/core/FinalRcRunnerAllowlistedExecutionAdapter');
const {
  EXPECTED_PREFLIGHT_MODE,
  EXPECTED_PREFLIGHT_SCHEMA_VERSION
} = require('../src/core/FinalRcRunnerExecutionPreflight');

const fixturePath = path.join(__dirname, 'fixtures', 'p54-final-rc-runner-safe-command-inventory-v1.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function buildPreflightInput(inventory = loadFixture()) {
  return {
    schemaVersion: EXPECTED_PREFLIGHT_SCHEMA_VERSION,
    mode: EXPECTED_PREFLIGHT_MODE,
    inventory,
    requestedCommandIds: inventory.allowedCommands.map(command => command.id),
    executeNow: false,
    startServices: false,
    callProviders: false,
    scanRealMemory: false,
    mutateDurableState: false,
    expandPublicMcp: false,
    remoteWrite: false,
    readinessClaimed: false
  };
}

function buildInput(overrides = {}) {
  return {
    schemaVersion: EXPECTED_EXECUTION_SCHEMA_VERSION,
    mode: EXPECTED_EXECUTION_MODE,
    preflightInput: buildPreflightInput(),
    execute: true,
    dryRun: false,
    readinessClaimed: false,
    allowServiceStart: false,
    allowProviderCall: false,
    allowRealMemoryAccess: false,
    allowDurableWrite: false,
    allowPublicMcpExpansion: false,
    allowRemoteWrite: false,
    ...overrides
  };
}

function passingExecutor(command) {
  return {
    id: command.id,
    status: 'passed',
    exitCode: 0,
    stale: false,
    skipped: false,
    warningOnly: false,
    unsupported: false,
    providerCalls: 0,
    serviceStarted: false,
    realMemoryTouched: false,
    runtimeStoresScanned: false,
    durableStateTouched: false,
    publicMcpExpanded: false,
    remoteWrite: false,
    summary: `passed ${command.id}`
  };
}

function assertNoSensitiveSurface(value) {
  const text = JSON.stringify(value).toLowerCase();

  for (const forbidden of [
    'authorization:',
    'bearer ',
    'api_key',
    'raw_workspace_id',
    'providerapikey',
    'set-cookie',
    'token=',
    'password=',
    '.env',
    'https://example.test',
    'a:\\'
  ]) {
    assert.equal(text.includes(forbidden), false, forbidden);
  }
}

test('P54 allowlisted execution adapter runs only caller-injected executor and keeps RC blocked', () => {
  const calls = [];
  const result = executeFinalRcRunnerAllowlistedPlan(buildInput(), {
    executor(command) {
      calls.push(command);
      return passingExecutor(command);
    }
  });

  assert.equal(result.schemaVersion, EXPECTED_EXECUTION_SCHEMA_VERSION);
  assert.equal(result.sourceMode, 'explicit_input');
  assert.equal(result.status, 'local_allowlisted_execution_passed_rc_still_blocked');
  assert.equal(result.decision, 'NOT_READY_BLOCKED');
  assert.equal(result.adapterAccepted, true);
  assert.equal(result.localCommandsExecutedViaInjectedExecutor, true);
  assert.equal(result.finalRcMatrixExecuted, false);
  assert.equal(result.commandEvidenceAccepted, true);
  assert.equal(result.canClaimFinalRcReady, false);
  assert.equal(result.canClaimRuntimeReady, false);
  assert.equal(result.canClaimV1RcReady, false);
  assert.deepEqual(result.failClosedReasons, []);
  assert.equal(result.preflight.accepted, true);
  assert.equal(result.commandResults.count, loadFixture().allowedCommands.length);
  assert.equal(result.commandResults.exact, true);
  assert.deepEqual(result.commandResults.unsafeIds, []);
  assert.equal(result.safety.importsChildProcess, false);
  assert.equal(result.safety.startsServices, false);
  assert.equal(result.safety.callsProviders, false);
  assert.equal(result.safety.readsRealMemory, false);
  assert.equal(result.safety.writesDurableState, false);
  assert.equal(result.readiness.localInjectedExecutionAdapterReady, true);
  assert.equal(result.readiness.finalRcMatrixReady, false);
  assert.equal(calls.length, loadFixture().allowedCommands.length);
  assert.deepEqual(calls.map(command => Object.keys(command)), calls.map(() => ['id', 'class', 'command']));
});

test('P54 allowlisted execution adapter normalizes input without passthrough or sensitive output', () => {
  const normalized = normalizeFinalRcRunnerAllowlistedExecutionInput({
    ...buildInput(),
    authorization: 'authorization: Bearer SHOULD_NOT_PASS',
    raw_workspace_id: 'raw_workspace_id=workspace-raw',
    providerLatency: 123
  });

  assert.equal(normalized.schemaVersion, EXPECTED_EXECUTION_SCHEMA_VERSION);
  assert.equal(normalized.mode, EXPECTED_EXECUTION_MODE);
  assert.equal(Object.hasOwn(normalized, 'authorization'), false);
  assert.equal(Object.hasOwn(normalized, 'raw_workspace_id'), false);
  assert.equal(Object.hasOwn(normalized, 'providerLatency'), false);
  assertNoSensitiveSurface(normalized);
});

test('P54 allowlisted execution adapter does not read files or spawn commands itself', () => {
  const input = buildInput();
  const originalReadFileSync = fs.readFileSync;
  const originalExistsSync = fs.existsSync;
  const originalReaddirSync = fs.readdirSync;
  const originalExecSync = childProcess.execSync;
  const originalExecFileSync = childProcess.execFileSync;
  const originalSpawnSync = childProcess.spawnSync;

  fs.readFileSync = () => {
    throw new Error('unexpected fs read during P54 execution adapter');
  };
  fs.existsSync = () => {
    throw new Error('unexpected fs exists during P54 execution adapter');
  };
  fs.readdirSync = () => {
    throw new Error('unexpected directory scan during P54 execution adapter');
  };
  childProcess.execSync = () => {
    throw new Error('unexpected child_process exec during P54 execution adapter');
  };
  childProcess.execFileSync = () => {
    throw new Error('unexpected child_process execFile during P54 execution adapter');
  };
  childProcess.spawnSync = () => {
    throw new Error('unexpected child_process spawn during P54 execution adapter');
  };

  try {
    const result = executeFinalRcRunnerAllowlistedPlan(input, {
      executor: passingExecutor
    });

    assert.equal(result.adapterAccepted, true);
    assert.equal(result.safety.readsFiles, false);
    assert.equal(result.safety.importsChildProcess, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
    fs.existsSync = originalExistsSync;
    fs.readdirSync = originalReaddirSync;
    childProcess.execSync = originalExecSync;
    childProcess.execFileSync = originalExecFileSync;
    childProcess.spawnSync = originalSpawnSync;
  }
});

test('P54 allowlisted execution adapter fails closed without accepted preflight or injected executor', () => {
  for (const [label, input, options, expectedReason] of [
    ['malformed', null, { executor: passingExecutor }, 'malformed_input'],
    ['schema', buildInput({ schemaVersion: 'p54-execution-v999' }), { executor: passingExecutor }, 'schema_version_mismatch'],
    ['mode', buildInput({ mode: 'execute-now' }), { executor: passingExecutor }, 'mode_mismatch'],
    ['dry-run', buildInput({ dryRun: true }), { executor: passingExecutor }, 'dry_run_only'],
    ['execute false', buildInput({ execute: false }), { executor: passingExecutor }, 'execute_not_requested'],
    ['no executor', buildInput(), {}, 'missing_injected_executor'],
    [
      'bad preflight',
      buildInput({
        preflightInput: {
          ...buildPreflightInput(),
          executeNow: true
        }
      }),
      { executor: passingExecutor },
      'preflight_not_accepted'
    ]
  ]) {
    const result = executeFinalRcRunnerAllowlistedPlan(input, options);

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.adapterAccepted, false, label);
    assert.equal(result.localCommandsExecutedViaInjectedExecutor, false, label);
    assert.equal(result.failClosedReasons.includes(expectedReason), true, label);
    assert.equal(result.canClaimV1RcReady, false, label);
  }
});

test('P54 allowlisted execution adapter fails closed for unsafe permission claims', () => {
  for (const unsafePatch of [
    { readinessClaimed: true },
    { allowServiceStart: true },
    { allowProviderCall: true },
    { allowRealMemoryAccess: true },
    { allowDurableWrite: true },
    { allowPublicMcpExpansion: true },
    { allowRemoteWrite: true }
  ]) {
    const result = executeFinalRcRunnerAllowlistedPlan(buildInput(unsafePatch), {
      executor: passingExecutor
    });

    assert.equal(result.adapterAccepted, false, JSON.stringify(unsafePatch));
    assert.equal(result.failClosedReasons.includes('unsafe_permission_claim'), true);
    assert.equal(result.localCommandsExecutedViaInjectedExecutor, false);
    assert.equal(result.canClaimFinalRcReady, false);
  }
});

test('P54 allowlisted execution adapter fails closed when executor throws or returns unsafe result', () => {
  const thrown = executeFinalRcRunnerAllowlistedPlan(buildInput(), {
    executor() {
      throw new Error('authorization: Bearer SHOULD_REDACT');
    }
  });

  assert.equal(thrown.status, 'blocked_fail_closed');
  assert.equal(thrown.failClosedReasons.includes('executor_threw'), true);
  assertNoSensitiveSurface(thrown);

  const unsafe = executeFinalRcRunnerAllowlistedPlan(buildInput(), {
    executor(command) {
      return command.id === 'syntax-runtime-schema-version-helper'
        ? {
            ...passingExecutor(command),
            status: 'warning',
            exitCode: 0,
            warningOnly: true,
            summary: 'warning-only Authorization: Bearer SHOULD_REDACT'
          }
        : passingExecutor(command);
    }
  });

  assert.equal(unsafe.status, 'blocked_fail_closed');
  assert.equal(unsafe.adapterAccepted, false);
  assert.equal(unsafe.commandEvidenceAccepted, false);
  assert.equal(unsafe.failClosedReasons.includes('critical_command_not_passed'), true);
  assert.deepEqual(unsafe.commandResults.unsafeIds, ['syntax-runtime-schema-version-helper']);
  assertNoSensitiveSurface(unsafe);
});
