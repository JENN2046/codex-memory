const { test } = require('node:test');
const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const {
  BLOCKED_ACTIONS,
  EXPECTED_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS,
  REQUIRED_FAIL_CLOSED_CASES,
  REQUIRED_VERSION_FIELDS,
  normalizeRuntimeSchemaVersionEnforcementContract,
  summarizeRuntimeSchemaVersionEnforcement
} = require('../src/core/RuntimeSchemaVersionEnforcementContract');

const fixturePath = path.join(__dirname, 'fixtures', 'p52-runtime-schema-version-enforcement-boundary-v1.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
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
    'workspace_id',
    'providerapikey',
    '.env',
    'https://example.test',
    'a:\\'
  ]) {
    assert.equal(text.includes(forbidden), false, forbidden);
  }
}

test('P52 helper summarizes explicit fixture input while staying NOT_READY_BLOCKED', () => {
  const fixture = loadFixture();
  const before = JSON.stringify(fixture);
  const summary = summarizeRuntimeSchemaVersionEnforcement(fixture);

  assert.equal(summary.sourceMode, 'explicit_input');
  assert.equal(summary.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.equal(summary.policyVersion, EXPECTED_POLICY_VERSION);
  assert.equal(summary.manifestVersion, EXPECTED_MANIFEST_VERSION);
  assert.equal(summary.inputContractAccepted, true);
  assert.equal(summary.acceptedForPlanning, true);
  assert.equal(summary.status, 'blocked_boundary_planning_only');
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
  assert.equal(summary.runtimeEnforcementImplemented, false);
  assert.equal(summary.runtimeIntegrated, false);
  assert.equal(summary.runtimeReady, false);
  assert.equal(summary.finalRcMatrixReady, false);
  assert.equal(summary.rcReady, false);
  assert.equal(summary.versions.exact, true);
  assert.deepEqual(summary.requiredVersionFields.ids, REQUIRED_VERSION_FIELDS);
  assert.equal(summary.requiredVersionFields.exact, true);
  assert.deepEqual(summary.failClosedCases.ids, REQUIRED_FAIL_CLOSED_CASES);
  assert.equal(summary.failClosedCases.exact, true);
  assert.equal(summary.failClosedCases.safe, true);
  assert.equal(summary.blockedActions.exact, true);
  assert.deepEqual(summary.publicMcpTools, {
    frozen: true,
    tools: PUBLIC_MCP_TOOLS
  });
  assert.equal(summary.safety.noSideEffects, true);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.executesCommands, false);
  assert.equal(summary.safety.writesDurableMemory, false);
  assert.equal(summary.safety.expandsPublicMcp, false);
  assert.equal(JSON.stringify(fixture), before);
});

test('P52 helper normalizes allowlisted fields without arbitrary passthrough', () => {
  const fixture = loadFixture();
  const normalized = normalizeRuntimeSchemaVersionEnforcementContract({
    ...fixture,
    authorization: 'authorization: Bearer SHOULD_NOT_PASS_THROUGH',
    raw_workspace_id: 'raw_workspace_id=workspace-raw',
    rawContent: 'raw production memory',
    providerLatency: 123
  });

  assert.equal(normalized.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.equal(normalized.policyVersion, EXPECTED_POLICY_VERSION);
  assert.equal(normalized.manifestVersion, EXPECTED_MANIFEST_VERSION);
  assert.deepEqual(normalized.requiredVersionFields, REQUIRED_VERSION_FIELDS);
  assert.deepEqual(normalized.failClosedCases.map(entry => entry.id), REQUIRED_FAIL_CLOSED_CASES);
  assert.deepEqual(normalized.blockedActions, BLOCKED_ACTIONS);
  assert.equal(Object.hasOwn(normalized, 'authorization'), false);
  assert.equal(Object.hasOwn(normalized, 'raw_workspace_id'), false);
  assert.equal(Object.hasOwn(normalized, 'rawContent'), false);
  assert.equal(Object.hasOwn(normalized, 'providerLatency'), false);
});

test('P52 helper does not perform implicit fs reads, directory scans, or command execution', () => {
  const fixture = loadFixture();
  const originalReadFileSync = fs.readFileSync;
  const originalExistsSync = fs.existsSync;
  const originalReaddirSync = fs.readdirSync;
  const originalExecSync = childProcess.execSync;
  const originalExecFileSync = childProcess.execFileSync;
  const originalSpawnSync = childProcess.spawnSync;

  fs.readFileSync = () => {
    throw new Error('unexpected fs read during P52 helper');
  };
  fs.existsSync = () => {
    throw new Error('unexpected fs exists check during P52 helper');
  };
  fs.readdirSync = () => {
    throw new Error('unexpected directory scan during P52 helper');
  };
  childProcess.execSync = () => {
    throw new Error('unexpected command execution during P52 helper');
  };
  childProcess.execFileSync = () => {
    throw new Error('unexpected command execution during P52 helper');
  };
  childProcess.spawnSync = () => {
    throw new Error('unexpected command execution during P52 helper');
  };

  try {
    const summary = summarizeRuntimeSchemaVersionEnforcement(fixture);

    assert.equal(summary.inputContractAccepted, true);
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.executesCommands, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
    fs.existsSync = originalExistsSync;
    fs.readdirSync = originalReaddirSync;
    childProcess.execSync = originalExecSync;
    childProcess.execFileSync = originalExecFileSync;
    childProcess.spawnSync = originalSpawnSync;
  }
});

test('P52 helper fails closed for malformed explicit input', () => {
  for (const malformedInput of [null, [], 'not an object']) {
    const summary = summarizeRuntimeSchemaVersionEnforcement(malformedInput);

    assert.equal(summary.inputContractAccepted, false);
    assert.equal(summary.acceptedForPlanning, false);
    assert.equal(summary.status, 'blocked_fail_closed');
    assert.equal(summary.decision, 'NOT_READY_BLOCKED');
    assert.equal(summary.failClosedReasons.includes('malformed_input'), true);
    assert.equal(summary.runtimeReady, false);
    assert.equal(summary.rcReady, false);
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.executesCommands, false);
  }
});

test('P52 helper fails closed for missing, unknown, unsupported, duplicate, malformed, or mismatched versions', () => {
  const fixture = loadFixture();

  for (const [label, unsafeInput, expectedField] of [
    ['missing', { ...fixture, schemaVersion: '' }, 'schemaVersion'],
    ['unknown', { ...fixture, policyVersion: 'unknown' }, 'policyVersion'],
    ['unsupported', { ...fixture, manifestVersion: 'unsupported' }, 'manifestVersion'],
    ['duplicate', { ...fixture, schemaVersion: [EXPECTED_SCHEMA_VERSION, EXPECTED_SCHEMA_VERSION] }, 'schemaVersion'],
    ['malformed', { ...fixture, policyVersion: { value: EXPECTED_POLICY_VERSION } }, 'policyVersion'],
    ['mismatch', { ...fixture, manifestVersion: 'p52-runtime-enforcement-manifest-v2' }, 'manifestVersion']
  ]) {
    const summary = summarizeRuntimeSchemaVersionEnforcement(unsafeInput);

    assert.equal(summary.inputContractAccepted, false, label);
    assert.equal(summary.acceptedForPlanning, false, label);
    assert.equal(summary.failClosedReasons.includes('version_contract_not_exact'), true, label);
    assert.equal(summary.versions.exact, false, label);
    assert.equal(
      [
        ...summary.versions.missing,
        ...summary.versions.duplicate,
        ...summary.versions.malformed,
        ...summary.versions.mismatched
      ].includes(expectedField),
      true,
      label
    );
    assert.equal(summary.runtimeReady, false, label);
    assert.equal(summary.rcReady, false, label);
  }
});

test('P52 helper requires exact version fields, fail-closed cases, blocked actions, and MCP tools', () => {
  const fixture = loadFixture();

  for (const [label, unsafeInput, expectedReason] of [
    [
      'version-fields',
      { ...fixture, requiredVersionFields: ['schemaVersion', 'policyVersion'] },
      'required_version_fields_not_exact'
    ],
    [
      'duplicate-fail-closed',
      { ...fixture, failClosedCases: [...fixture.failClosedCases, fixture.failClosedCases[0]] },
      'fail_closed_cases_not_exact'
    ],
    [
      'blocked-actions',
      { ...fixture, blockedActions: fixture.blockedActions.filter(action => action !== 'provider_call') },
      'blocked_actions_not_exact'
    ],
    [
      'public-mcp',
      { ...fixture, publicTools: ['record_memory', 'search_memory'] },
      'public_mcp_not_frozen'
    ]
  ]) {
    const summary = summarizeRuntimeSchemaVersionEnforcement(unsafeInput);

    assert.equal(summary.inputContractAccepted, false, label);
    assert.equal(summary.failClosedReasons.includes(expectedReason), true, label);
    assert.equal(summary.runtimeReady, false, label);
  }
});

test('P52 helper rejects runtime, readiness, public MCP, durable, and safety leakage claims', () => {
  const fixture = loadFixture();

  for (const unsafeInput of [
    { ...fixture, status: 'ready' },
    { ...fixture, decision: 'READY_FOR_V1_0_RC' },
    { ...fixture, runtimeEnforcementImplemented: true },
    { ...fixture, runtimeIntegrated: true },
    { ...fixture, runtimeReady: true },
    { ...fixture, finalRcMatrixReady: true },
    { ...fixture, rcReady: true },
    {
      ...fixture,
      safety: {
        ...fixture.safety,
        noCommandExecution: false
      }
    },
    {
      ...fixture,
      safety: {
        ...fixture.safety,
        rawSecretExposed: true
      }
    },
    {
      ...fixture,
      safety: {
        ...fixture.safety,
        callerFieldsPassthroughAllowed: true
      }
    }
  ]) {
    const summary = summarizeRuntimeSchemaVersionEnforcement(unsafeInput);

    assert.equal(summary.inputContractAccepted, false);
    assert.equal(summary.acceptedForPlanning, false);
    assert.equal(summary.runtimeEnforcementImplemented, false);
    assert.equal(summary.runtimeIntegrated, false);
    assert.equal(summary.runtimeReady, false);
    assert.equal(summary.finalRcMatrixReady, false);
    assert.equal(summary.rcReady, false);
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.executesCommands, false);
    assert.equal(summary.safety.expandsPublicMcp, false);
  }
});

test('P52 helper redacts sensitive normalized output and version mismatch values', () => {
  const fixture = loadFixture();
  const normalized = normalizeRuntimeSchemaVersionEnforcementContract({
    ...fixture,
    schemaVersion: 'authorization: Bearer P52_SCHEMA_TOKEN_1234567890',
    policyVersion: 'api_key=P52_POLICY_API_KEY_1234567890',
    manifestVersion: 'A:\\secret\\.env https://example.test workspace_id=workspace-public-id',
    failClosedCases: fixture.failClosedCases.map((entry, index) => index === 0
      ? {
          ...entry,
          claimedValue: 'raw_workspace_id=workspace-raw token=P52_CASE_TOKEN_1234567890',
          reasonCodes: [
            ...entry.reasonCodes,
            'providerapikey=P52_PROVIDER_API_KEY_1234567890'
          ]
        }
      : entry
    ),
    requiredWording: [
      ...fixture.requiredWording,
      'password=P52_PASSWORD_1234567890'
    ]
  });
  const summary = summarizeRuntimeSchemaVersionEnforcement(normalized);

  assertNoSensitiveSurface(normalized);
  assertNoSensitiveSurface(summary);
  assert.equal(summary.inputContractAccepted, false);
  assert.equal(summary.failClosedReasons.includes('version_contract_not_exact'), true);
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
});
