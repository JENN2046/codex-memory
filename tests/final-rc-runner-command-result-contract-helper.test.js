const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  EXPECTED_OUTPUT_SCHEMA_VERSION,
  EXPECTED_SCHEMA_VERSION,
  FAIL_CLOSED_STATES,
  PUBLIC_MCP_TOOLS,
  REQUIRED_BLOCKED_ACTIONS,
  SAFE_COMMAND_CLASSES,
  evaluateFinalRcRunnerCommandResults,
  normalizeFinalRcRunnerCommandResultInput
} = require('../src/core/FinalRcRunnerCommandResultContract');

const fixturePath = path.join(__dirname, 'fixtures', 'p54-final-rc-runner-safe-command-inventory-v1.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function buildPassingResults(inventory = loadFixture()) {
  return inventory.allowedCommands.map(command => ({
    id: command.id,
    status: 'passed',
    exitCode: 0,
    stale: false,
    skipped: false,
    warningOnly: false,
    unsupported: false,
    executedByHelper: false,
    providerCalls: 0,
    serviceStarted: false,
    realMemoryTouched: false,
    runtimeStoresScanned: false,
    durableStateTouched: false,
    publicMcpExpanded: false,
    remoteWrite: false,
    summary: `${command.id} passed`
  }));
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

test('P54 command result helper accepts exact caller-provided local command results while staying NOT_READY_BLOCKED', () => {
  const inventory = loadFixture();
  const before = JSON.stringify(inventory);
  const result = evaluateFinalRcRunnerCommandResults({
    inventory,
    commandResults: buildPassingResults(inventory)
  });

  assert.equal(result.schemaVersion, EXPECTED_OUTPUT_SCHEMA_VERSION);
  assert.equal(result.sourceMode, 'explicit_input');
  assert.equal(result.status, 'local_command_results_passed_rc_still_blocked');
  assert.equal(result.decision, 'NOT_READY_BLOCKED');
  assert.equal(result.commandEvidenceAccepted, true);
  assert.equal(result.allCriticalCommandsPassed, true);
  assert.equal(result.runnerImplemented, false);
  assert.equal(result.runnerExecuted, false);
  assert.equal(result.commandsExecutedByHelper, false);
  assert.equal(result.finalRcMatrixExecuted, false);
  assert.equal(result.canExecuteRunner, false);
  assert.equal(result.canClaimFinalRcReady, false);
  assert.equal(result.canClaimRuntimeReady, false);
  assert.equal(result.canClaimV1RcReady, false);
  assert.deepEqual(result.failClosedReasons, []);
  assert.equal(result.inventory.safe, true);
  assert.equal(result.inventory.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.equal(result.inventory.allowedCommandCount, inventory.allowedCommands.length);
  assert.deepEqual(result.inventory.duplicateAllowedCommandIds, []);
  assert.deepEqual(result.inventory.allowedCommandClasses, SAFE_COMMAND_CLASSES);
  assert.equal(result.inventory.publicMcpFrozen, true);
  assert.equal(result.inventory.criticalGateSemanticsSafe, true);
  assert.equal(result.commandResults.exact, true);
  assert.deepEqual(result.commandResults.missingIds, []);
  assert.deepEqual(result.commandResults.unsupportedIds, []);
  assert.deepEqual(result.commandResults.duplicateIds, []);
  assert.deepEqual(result.commandResults.unsafeIds, []);
  assert.deepEqual(result.blockedActions.actions, REQUIRED_BLOCKED_ACTIONS);
  assert.equal(result.readiness.localCommandInventoryReady, true);
  assert.equal(result.readiness.commandResultsAccepted, true);
  assert.equal(result.readiness.finalRcMatrixReady, false);
  assert.equal(result.readiness.v1RcReady, false);
  assert.equal(result.safety.readsFiles, false);
  assert.equal(result.safety.executesCommands, false);
  assert.equal(result.safety.startsServices, false);
  assert.equal(result.safety.callsProviders, false);
  assert.equal(JSON.stringify(inventory), before);
});

test('P54 command result helper normalizes allowlisted fields without arbitrary passthrough', () => {
  const inventory = loadFixture();
  const normalized = normalizeFinalRcRunnerCommandResultInput({
    inventory: {
      ...inventory,
      authorization: 'authorization: Bearer SHOULD_NOT_PASS',
      raw_workspace_id: 'raw_workspace_id=workspace-raw'
    },
    commandResults: [
      {
        ...buildPassingResults(inventory)[0],
        api_key: 'api_key=SHOULD_NOT_PASS',
        rawOutput: 'raw command output',
        summary: 'authorization: Bearer SUMMARY_TOKEN_1234567890'
      }
    ],
    providerLatency: 42,
    rcReady: true
  });

  assert.equal(normalized.inventory.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.deepEqual(normalized.inventory.publicMcpTools, PUBLIC_MCP_TOOLS);
  assert.equal(Object.hasOwn(normalized.inventory, 'authorization'), false);
  assert.equal(Object.hasOwn(normalized.inventory, 'raw_workspace_id'), false);
  assert.equal(Object.hasOwn(normalized.commandResults[0], 'api_key'), false);
  assert.equal(Object.hasOwn(normalized.commandResults[0], 'rawOutput'), false);
  assert.equal(Object.hasOwn(normalized, 'providerLatency'), false);
  assert.equal(Object.hasOwn(normalized, 'rcReady'), false);
  assertNoSensitiveSurface(normalized);
});

test('P54 command result helper does not perform fs reads or command execution', () => {
  const inventory = loadFixture();
  const input = {
    inventory,
    commandResults: buildPassingResults(inventory)
  };
  const originalReadFileSync = fs.readFileSync;
  const originalExistsSync = fs.existsSync;
  const originalReaddirSync = fs.readdirSync;
  const originalExecSync = childProcess.execSync;
  const originalExecFileSync = childProcess.execFileSync;
  const originalSpawnSync = childProcess.spawnSync;

  fs.readFileSync = () => {
    throw new Error('unexpected fs read during P54 helper');
  };
  fs.existsSync = () => {
    throw new Error('unexpected fs exists during P54 helper');
  };
  fs.readdirSync = () => {
    throw new Error('unexpected directory scan during P54 helper');
  };
  childProcess.execSync = () => {
    throw new Error('unexpected command execution during P54 helper');
  };
  childProcess.execFileSync = () => {
    throw new Error('unexpected command execution during P54 helper');
  };
  childProcess.spawnSync = () => {
    throw new Error('unexpected command execution during P54 helper');
  };

  try {
    const result = evaluateFinalRcRunnerCommandResults(input);

    assert.equal(result.commandEvidenceAccepted, true);
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

test('P54 command result helper fails closed for malformed input and unsafe inventory', () => {
  for (const badInput of [
    null,
    [],
    'not an object',
    {
      inventory: {
        ...loadFixture(),
        schemaVersion: 'p54-final-rc-runner-safe-command-inventory-v999'
      },
      commandResults: buildPassingResults()
    },
    {
      inventory: {
        ...loadFixture(),
        publicMcpTools: [
          'record_memory',
          'search_memory',
          'memory_overview',
          'audit_memory',
  'prepare_memory_context',
          'memory_admin'
        ]
      },
      commandResults: buildPassingResults()
    },
    {
      inventory: {
        ...loadFixture(),
        runnerExecuted: true
      },
      commandResults: buildPassingResults()
    }
  ]) {
    const result = evaluateFinalRcRunnerCommandResults(badInput);

    assert.equal(result.status, 'blocked_fail_closed');
    assert.equal(result.decision, 'NOT_READY_BLOCKED');
    assert.equal(result.commandEvidenceAccepted, false);
    assert.equal(result.allCriticalCommandsPassed, false);
    assert.equal(result.canExecuteRunner, false);
    assert.equal(result.canClaimFinalRcReady, false);
    assert.equal(result.readiness.finalRcMatrixReady, false);
    assert.equal(result.readiness.v1RcReady, false);
  }
});

test('P54 command result helper fails closed for missing duplicate or unsupported command results', () => {
  const inventory = loadFixture();

  for (const [label, commandResults, expectedReason] of [
    [
      'missing',
      buildPassingResults(inventory).slice(1),
      'missing_command_result'
    ],
    [
      'duplicate',
      [
        ...buildPassingResults(inventory),
        buildPassingResults(inventory)[0]
      ],
      'duplicate_command_id'
    ],
    [
      'unsupported',
      [
        ...buildPassingResults(inventory),
        {
          id: 'provider-smoke',
          status: 'passed',
          exitCode: 0
        }
      ],
      'unsupported_command_result'
    ]
  ]) {
    const result = evaluateFinalRcRunnerCommandResults({
      inventory,
      commandResults
    });

    assert.equal(result.commandEvidenceAccepted, false, label);
    assert.equal(result.failClosedReasons.includes(expectedReason), true, label);
    assert.equal(result.canClaimFinalRcReady, false, label);
  }
});

test('P54 command result helper fails closed for unsafe critical result states', () => {
  const inventory = loadFixture();

  for (const status of FAIL_CLOSED_STATES) {
    const commandResults = buildPassingResults(inventory);
    commandResults[0] = {
      ...commandResults[0],
      status,
      exitCode: status === 'passed' ? 0 : 1
    };
    const result = evaluateFinalRcRunnerCommandResults({
      inventory,
      commandResults
    });

    assert.equal(result.commandEvidenceAccepted, false, status);
    assert.equal(result.failClosedReasons.includes('critical_command_not_passed'), true, status);
    assert.equal(result.commandResults.unsafeIds.includes('syntax-runtime-schema-version-helper'), true, status);
  }
});

test('P54 command result helper rejects side effects and helper execution claims', () => {
  const inventory = loadFixture();

  for (const unsafePatch of [
    { executedByHelper: true },
    { providerCalls: 1 },
    { serviceStarted: true },
    { realMemoryTouched: true },
    { runtimeStoresScanned: true },
    { durableStateTouched: true },
    { publicMcpExpanded: true },
    { remoteWrite: true },
    { stale: true },
    { skipped: true },
    { warningOnly: true },
    { unsupported: true }
  ]) {
    const commandResults = buildPassingResults(inventory);
    commandResults[0] = {
      ...commandResults[0],
      ...unsafePatch
    };
    const result = evaluateFinalRcRunnerCommandResults({
      inventory,
      commandResults
    });

    assert.equal(result.commandEvidenceAccepted, false, JSON.stringify(unsafePatch));
    assert.equal(result.failClosedReasons.includes('critical_command_not_passed'), true);
    assert.equal(result.canClaimV1RcReady, false);
  }
});

test('P54 command result helper redacts sensitive command summaries', () => {
  const inventory = loadFixture();
  const commandResults = buildPassingResults(inventory);
  commandResults[0] = {
    ...commandResults[0],
    summary: 'authorization: Bearer TOKEN_123 token=TOKEN_456 password=PASS_789 api_key=KEY_000 raw_workspace_id=workspace-raw set-cookie=session https://example.test A:\\secret\\.env providerapikey=PROVIDER_123'
  };
  const result = evaluateFinalRcRunnerCommandResults({
    inventory,
    commandResults
  });

  assert.equal(result.commandEvidenceAccepted, true);
  assertNoSensitiveSurface(result);
});
