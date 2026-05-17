const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  EXPECTED_PREFLIGHT_MODE,
  EXPECTED_PREFLIGHT_SCHEMA_VERSION,
  evaluateFinalRcRunnerExecutionPreflight,
  normalizeFinalRcRunnerExecutionPreflightInput
} = require('../src/core/FinalRcRunnerExecutionPreflight');

const fixturePath = path.join(__dirname, 'fixtures', 'p54-final-rc-runner-safe-command-inventory-v1.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function buildInput(overrides = {}) {
  const inventory = overrides.inventory || loadFixture();

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
    readinessClaimed: false,
    ...overrides
  };
}

function assertNoSensitiveSurface(value) {
  const text = JSON.stringify(value).toLowerCase();

  for (const forbidden of [
    'authorization:',
    'bearer ',
    'api_key',
    'raw_workspace_id',
    'token=',
    'password=',
    'set-cookie',
    'providerapikey',
    '.env',
    'https://example.test',
    'a:\\'
  ]) {
    assert.equal(text.includes(forbidden), false, forbidden);
  }
}

test('P54 execution preflight accepts exact allowlisted local command plan without execution', () => {
  const input = buildInput();
  const result = evaluateFinalRcRunnerExecutionPreflight(input);

  assert.equal(result.schemaVersion, EXPECTED_PREFLIGHT_SCHEMA_VERSION);
  assert.equal(result.sourceMode, 'explicit_input');
  assert.equal(result.status, 'preflight_passed_execution_still_not_run');
  assert.equal(result.decision, 'NOT_READY_BLOCKED');
  assert.equal(result.preflightAccepted, true);
  assert.equal(result.runnerImplemented, false);
  assert.equal(result.runnerExecuted, false);
  assert.equal(result.commandsExecuted, false);
  assert.equal(result.finalRcMatrixExecuted, false);
  assert.equal(result.canExecuteAllowlistedLocalCommandsInFuture, true);
  assert.equal(result.canClaimFinalRcReady, false);
  assert.deepEqual(result.failClosedReasons, []);
  assert.equal(result.inventory.safe, true);
  assert.equal(result.request.exact, true);
  assert.deepEqual(result.request.missingCriticalCommandIds, []);
  assert.deepEqual(result.request.unsupportedCommandIds, []);
  assert.deepEqual(result.request.duplicateCommandIds, []);
  assert.equal(result.executionPlan.commandCount, input.inventory.allowedCommands.length);
  assert.equal(result.executionPlan.executesNow, false);
  assert.equal(result.safety.executesCommands, false);
  assert.equal(result.safety.startsServices, false);
  assert.equal(result.safety.callsProviders, false);
  assert.equal(result.readiness.localExecutionPreflightReady, true);
  assert.equal(result.readiness.finalRcMatrixReady, false);
  assert.equal(result.readiness.v1RcReady, false);
});

test('P54 execution preflight normalizes allowlisted fields without passthrough', () => {
  const normalized = normalizeFinalRcRunnerExecutionPreflightInput({
    ...buildInput(),
    authorization: 'authorization: Bearer SHOULD_NOT_PASS',
    raw_workspace_id: 'raw_workspace_id=workspace-raw',
    providerLatency: 123,
    requestedCommandIds: [
      'syntax-final-rc-evaluator',
      'authorization: Bearer REQUEST_TOKEN_123'
    ]
  });

  assert.equal(normalized.schemaVersion, EXPECTED_PREFLIGHT_SCHEMA_VERSION);
  assert.equal(normalized.mode, EXPECTED_PREFLIGHT_MODE);
  assert.deepEqual(normalized.requestedCommandIds, [
    'syntax-final-rc-evaluator',
    '<redacted>'
  ]);
  assert.equal(Object.hasOwn(normalized, 'authorization'), false);
  assert.equal(Object.hasOwn(normalized, 'raw_workspace_id'), false);
  assert.equal(Object.hasOwn(normalized, 'providerLatency'), false);
  assertNoSensitiveSurface(normalized);
});

test('P54 execution preflight does not perform fs reads or command execution', () => {
  const input = buildInput();
  const originalReadFileSync = fs.readFileSync;
  const originalExistsSync = fs.existsSync;
  const originalReaddirSync = fs.readdirSync;
  const originalExecSync = childProcess.execSync;
  const originalExecFileSync = childProcess.execFileSync;
  const originalSpawnSync = childProcess.spawnSync;

  fs.readFileSync = () => {
    throw new Error('unexpected fs read during P54 preflight');
  };
  fs.existsSync = () => {
    throw new Error('unexpected fs exists during P54 preflight');
  };
  fs.readdirSync = () => {
    throw new Error('unexpected directory scan during P54 preflight');
  };
  childProcess.execSync = () => {
    throw new Error('unexpected command execution during P54 preflight');
  };
  childProcess.execFileSync = () => {
    throw new Error('unexpected command execution during P54 preflight');
  };
  childProcess.spawnSync = () => {
    throw new Error('unexpected command execution during P54 preflight');
  };

  try {
    const result = evaluateFinalRcRunnerExecutionPreflight(input);

    assert.equal(result.preflightAccepted, true);
    assert.equal(result.safety.readsFiles, false);
    assert.equal(result.safety.executesCommands, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
    fs.existsSync = originalExistsSync;
    fs.readdirSync = originalReaddirSync;
    childProcess.execSync = originalExecSync;
    childProcess.execFileSync = originalExecFileSync;
    childProcess.spawnSync = originalSpawnSync;
  }
});

test('P54 execution preflight fails closed for malformed input or unsafe inventory', () => {
  for (const badInput of [
    null,
    [],
    'not an object',
    buildInput({ schemaVersion: 'p54-final-rc-runner-execution-preflight-v999' }),
    buildInput({ mode: 'execute-now' }),
    buildInput({
      inventory: {
        ...loadFixture(),
        runnerExecuted: true
      }
    }),
    buildInput({
      inventory: {
        ...loadFixture(),
        publicMcpTools: ['record_memory', 'search_memory', 'memory_overview', 'memory_admin']
      }
    })
  ]) {
    const result = evaluateFinalRcRunnerExecutionPreflight(badInput);

    assert.equal(result.status, 'blocked_fail_closed');
    assert.equal(result.preflightAccepted, false);
    assert.equal(result.decision, 'NOT_READY_BLOCKED');
    assert.equal(result.runnerExecuted, false);
    assert.equal(result.commandsExecuted, false);
    assert.equal(result.canClaimFinalRcReady, false);
  }
});

test('P54 execution preflight fails closed for missing duplicate or unsupported requested commands', () => {
  const input = buildInput();

  for (const [label, requestedCommandIds, expectedReason] of [
    [
      'missing',
      input.requestedCommandIds.slice(1),
      'missing_critical_command'
    ],
    [
      'duplicate',
      [
        ...input.requestedCommandIds,
        input.requestedCommandIds[0]
      ],
      'duplicate_command_id'
    ],
    [
      'unsupported',
      [
        ...input.requestedCommandIds,
        'provider-smoke'
      ],
      'unsupported_command'
    ]
  ]) {
    const result = evaluateFinalRcRunnerExecutionPreflight({
      ...input,
      requestedCommandIds
    });

    assert.equal(result.preflightAccepted, false, label);
    assert.equal(result.failClosedReasons.includes(expectedReason), true, label);
    assert.equal(result.canExecuteAllowlistedLocalCommandsInFuture, false, label);
  }
});

test('P54 execution preflight rejects unsafe execution claims', () => {
  for (const unsafePatch of [
    { executeNow: true },
    { startServices: true },
    { callProviders: true },
    { scanRealMemory: true },
    { mutateDurableState: true },
    { expandPublicMcp: true },
    { remoteWrite: true },
    { readinessClaimed: true }
  ]) {
    const result = evaluateFinalRcRunnerExecutionPreflight(buildInput(unsafePatch));

    assert.equal(result.preflightAccepted, false, JSON.stringify(unsafePatch));
    assert.equal(result.failClosedReasons.includes('unsafe_execution_claim'), true);
    assert.equal(result.runnerExecuted, false);
    assert.equal(result.commandsExecuted, false);
    assert.equal(result.canClaimV1RcReady, false);
  }
});

test('P54 execution preflight rejects inventory commands matching denied command fragments', () => {
  const inventory = loadFixture();
  const unsafeInventory = {
    ...inventory,
    allowedCommands: inventory.allowedCommands.map((command, index) => index === 0
      ? {
          ...command,
          command: 'npm run provider-smoke -- --json'
        }
      : command)
  };
  const result = evaluateFinalRcRunnerExecutionPreflight(buildInput({
    inventory: unsafeInventory,
    requestedCommandIds: unsafeInventory.allowedCommands.map(command => command.id)
  }));

  assert.equal(result.preflightAccepted, false);
  assert.equal(result.failClosedReasons.includes('rejected_command_fragment'), true);
  assert.deepEqual(result.inventory.unsafeAllowedCommandIds, ['syntax-runtime-schema-version-helper']);
  assert.equal(result.executionPlan.commandCount, 0);
});
