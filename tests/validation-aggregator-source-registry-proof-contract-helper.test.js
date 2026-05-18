const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const test = require('node:test');

const {
  EXPECTED_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION,
  REQUIRED_SOURCE_REGISTRY_IDS,
  evaluateValidationAggregatorSourceRegistryProof,
  normalizeValidationAggregatorSourceRegistryProofInput
} = require('../src/core/ValidationAggregatorSourceRegistryProofContract');

function buildInput(patch = {}) {
  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    policyVersion: EXPECTED_POLICY_VERSION,
    manifestVersion: EXPECTED_MANIFEST_VERSION,
    explicitInputOnly: true,
    sourceMode: 'explicit_input',
    status: 'blocked',
    decision: 'NOT_READY_BLOCKED',
    validationAggregatorFullImplementation: false,
    publicMcpTools: [
      'record_memory',
      'search_memory',
      'memory_overview'
    ],
    sourceRegistry: REQUIRED_SOURCE_REGISTRY_IDS.map(id => ({
      id,
      sourceType: 'local_safe_evidence',
      sourceClass: id.endsWith('_evidence') ? id.replace(/_evidence$/, '') : id,
      evidenceRef: `p66:${id}`,
      freshnessBound: true,
      baselineBound: true,
      runtimeAuthority: false,
      readinessAuthority: false
    })),
    failClosedReasons: [],
    safety: {
      readsFiles: false,
      scansDirectories: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      readsRealMemory: false,
      scansRuntimeStores: false,
      writesDurableState: false,
      expandsPublicMcp: false,
      remoteWrites: false,
      rawSensitiveOutputExposed: false
    },
    readiness: {
      sourceRegistryProofReady: false,
      validationAggregatorFullImplementationReady: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      rcReady: false
    },
    ...patch
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

test('P66.5 source registry helper accepts explicit exact-set input while keeping runtime blocked', () => {
  const result = evaluateValidationAggregatorSourceRegistryProof(buildInput());

  assert.equal(result.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.equal(result.sourceMode, 'explicit_input');
  assert.equal(result.status, 'source_registry_proof_accepted_runtime_still_blocked');
  assert.equal(result.decision, 'NOT_READY_BLOCKED');
  assert.equal(result.acceptedForPlanning, true);
  assert.equal(result.validationAggregatorFullImplementationReady, false);
  assert.equal(result.runtimeReady, false);
  assert.equal(result.finalRcMatrixReady, false);
  assert.equal(result.v1RcReady, false);
  assert.equal(result.rcReady, false);
  assert.deepEqual(result.failClosedReasons, []);
  assert.equal(result.sourceRegistry.count, REQUIRED_SOURCE_REGISTRY_IDS.length);
  assert.equal(result.sourceRegistry.exact, true);
  assert.deepEqual(result.sourceRegistry.requiredIds, REQUIRED_SOURCE_REGISTRY_IDS);
  assert.equal(result.readiness.sourceRegistryProofReady, true);
  assert.equal(result.safety.readsFiles, false);
  assert.equal(result.safety.executesCommands, false);
  assert.equal(result.safety.readsRealMemory, false);
  assert.equal(result.safety.writesDurableState, false);
});

test('P66.5 source registry helper normalizes allowlisted fields without arbitrary passthrough', () => {
  const normalized = normalizeValidationAggregatorSourceRegistryProofInput({
    ...buildInput(),
    authorization: 'authorization: Bearer SHOULD_NOT_PASS',
    raw_workspace_id: 'raw_workspace_id=workspace-raw',
    providerLatency: 123
  });

  assert.equal(normalized.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.equal(normalized.policyVersion, EXPECTED_POLICY_VERSION);
  assert.equal(normalized.manifestVersion, EXPECTED_MANIFEST_VERSION);
  assert.equal(Object.hasOwn(normalized, 'authorization'), false);
  assert.equal(Object.hasOwn(normalized, 'raw_workspace_id'), false);
  assert.equal(Object.hasOwn(normalized, 'providerLatency'), false);
  assertNoSensitiveSurface(normalized);
});

test('P66.5 source registry helper does not perform fs reads or command execution', () => {
  const input = buildInput();
  const originalReadFileSync = fs.readFileSync;
  const originalExistsSync = fs.existsSync;
  const originalReaddirSync = fs.readdirSync;
  const originalExecSync = childProcess.execSync;
  const originalExecFileSync = childProcess.execFileSync;
  const originalSpawnSync = childProcess.spawnSync;

  fs.readFileSync = () => {
    throw new Error('unexpected fs read during P66.5 source registry helper');
  };
  fs.existsSync = () => {
    throw new Error('unexpected fs exists during P66.5 source registry helper');
  };
  fs.readdirSync = () => {
    throw new Error('unexpected directory scan during P66.5 source registry helper');
  };
  childProcess.execSync = () => {
    throw new Error('unexpected command execution during P66.5 source registry helper');
  };
  childProcess.execFileSync = () => {
    throw new Error('unexpected command execution during P66.5 source registry helper');
  };
  childProcess.spawnSync = () => {
    throw new Error('unexpected command execution during P66.5 source registry helper');
  };

  try {
    const result = evaluateValidationAggregatorSourceRegistryProof(input);

    assert.equal(result.acceptedForPlanning, true);
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

test('P66.5 source registry helper fails closed for malformed or version drift', () => {
  for (const [label, input, reason] of [
    ['malformed', null, 'malformed_input'],
    ['schema', buildInput({ schemaVersion: 'p66-v999' }), 'schema_version_mismatch'],
    ['policy', buildInput({ policyVersion: 'p66-policy-v999' }), 'policy_version_mismatch'],
    ['manifest', buildInput({ manifestVersion: 'p66-manifest-v999' }), 'manifest_version_mismatch']
  ]) {
    const result = evaluateValidationAggregatorSourceRegistryProof(input);

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
    assert.equal(result.v1RcReady, false, label);
  }
});

test('P66.5 source registry helper fails closed for missing duplicate or unknown source ids', () => {
  const input = buildInput();

  for (const [label, sourceRegistry, reason] of [
    ['missing', input.sourceRegistry.slice(1), 'non_exact_source_registry'],
    ['duplicate', [...input.sourceRegistry, input.sourceRegistry[0]], 'duplicate_source_registry_id'],
    [
      'unknown',
      [
        ...input.sourceRegistry.slice(1),
        {
          ...input.sourceRegistry[0],
          id: 'unknown_source_registry_entry'
        }
      ],
      'non_exact_source_registry'
    ]
  ]) {
    const result = evaluateValidationAggregatorSourceRegistryProof(buildInput({ sourceRegistry }));

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
  }
});

test('P66.5 source registry helper fails closed for runtime authority or readiness overclaims', () => {
  const input = buildInput();

  for (const [label, patch, reason] of [
    [
      'source runtime authority',
      {
        sourceRegistry: input.sourceRegistry.map((source, index) => index === 0
          ? { ...source, runtimeAuthority: true }
          : source)
      },
      'source_claims_runtime_authority'
    ],
    [
      'source readiness authority',
      {
        sourceRegistry: input.sourceRegistry.map((source, index) => index === 0
          ? { ...source, readinessAuthority: true }
          : source)
      },
      'source_claims_readiness_authority'
    ],
    [
      'full implementation readiness',
      { validationAggregatorFullImplementation: true },
      'readiness_overclaim'
    ],
    [
      'v1 readiness',
      { readiness: { ...input.readiness, v1RcReady: true } },
      'readiness_overclaim'
    ]
  ]) {
    const result = evaluateValidationAggregatorSourceRegistryProof(buildInput(patch));

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
    assert.equal(result.v1RcReady, false, label);
  }
});

test('P66.5 source registry helper fails closed for public MCP drift and unsafe no-touch flags', () => {
  for (const [label, patch, reason] of [
    [
      'public tools',
      { publicMcpTools: ['record_memory', 'search_memory', 'memory_overview', 'validate_memory'] },
      'public_mcp_tools_drift'
    ],
    [
      'fs read',
      { safety: { ...buildInput().safety, readsFiles: true } },
      'unsafe_no_touch_boundary'
    ],
    [
      'provider',
      { safety: { ...buildInput().safety, callsProviders: true } },
      'unsafe_no_touch_boundary'
    ],
    [
      'durable write',
      { safety: { ...buildInput().safety, writesDurableState: true } },
      'unsafe_no_touch_boundary'
    ]
  ]) {
    const result = evaluateValidationAggregatorSourceRegistryProof(buildInput(patch));

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
  }
});

test('P66.5 source registry helper redacts sensitive normalized output and source refs', () => {
  const input = buildInput({
    sourceRegistry: buildInput().sourceRegistry.map((source, index) => index === 0
      ? {
          ...source,
          evidenceRef: 'authorization: Bearer SHOULD_NOT_LEAK providerApiKey=SHOULD_NOT_LEAK'
        }
      : source)
  });

  const normalized = normalizeValidationAggregatorSourceRegistryProofInput(input);

  assertNoSensitiveSurface(normalized);
});
