const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  DENIED_SOURCE_TYPES,
  EXPECTED_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION,
  REQUIRED_OBSERVABILITY_SURFACE_IDS,
  REQUIRED_RUNTIME_EVIDENCE,
  REQUIRED_SOURCE_EVIDENCE_IDS,
  SAFE_SOURCE_TYPES,
  evaluateHttpRuntimeObservabilityOperation,
  normalizeHttpRuntimeObservabilityOperationInput
} = require('../src/core/HttpRuntimeObservabilityOperationContract');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p59-http-runtime-observability-operation-hardening-boundary-v1.json'
);

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

test('P59 HTTP observability helper accepts explicit boundary object while keeping runtime operation blocked', () => {
  const result = evaluateHttpRuntimeObservabilityOperation(loadFixture());

  assert.equal(result.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.equal(result.sourceMode, 'explicit_input');
  assert.equal(result.status, 'boundary_accepted_http_operation_still_blocked');
  assert.equal(result.decision, 'NOT_READY_BLOCKED');
  assert.equal(result.acceptedForPlanning, true);
  assert.equal(result.httpRuntimeObserved, false);
  assert.equal(result.operationHardeningReady, false);
  assert.equal(result.safeStartPreflightReady, false);
  assert.equal(result.safeShutdownPreflightReady, false);
  assert.equal(result.runtimeReady, false);
  assert.equal(result.finalRcMatrixReady, false);
  assert.equal(result.v1RcReady, false);
  assert.deepEqual(result.failClosedReasons, []);
  assert.deepEqual(result.sourceTypes.allowed, SAFE_SOURCE_TYPES);
  assert.deepEqual(result.sourceTypes.denied, DENIED_SOURCE_TYPES);
  assert.equal(result.sourceEvidence.count, REQUIRED_SOURCE_EVIDENCE_IDS.length);
  assert.equal(result.sourceEvidence.exact, true);
  assert.equal(result.observabilitySurfaces.count, REQUIRED_OBSERVABILITY_SURFACE_IDS.length);
  assert.equal(result.observabilitySurfaces.exact, true);
  assert.equal(result.runtimeEvidence.requiredExact, true);
  assert.equal(result.runtimeEvidence.unsatisfiedExact, true);
  assert.equal(result.readiness.localBoundaryInventoryReady, true);
  assert.equal(result.safety.executesCommands, false);
  assert.equal(result.safety.startsServices, false);
  assert.equal(result.safety.callsProviders, false);
});

test('P59 HTTP observability helper normalizes allowlisted fields without arbitrary passthrough', () => {
  const normalized = normalizeHttpRuntimeObservabilityOperationInput({
    ...loadFixture(),
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

test('P59 HTTP observability helper does not perform fs reads or command execution', () => {
  const input = loadFixture();
  const originalReadFileSync = fs.readFileSync;
  const originalExistsSync = fs.existsSync;
  const originalReaddirSync = fs.readdirSync;
  const originalExecSync = childProcess.execSync;
  const originalExecFileSync = childProcess.execFileSync;
  const originalSpawnSync = childProcess.spawnSync;

  fs.readFileSync = () => {
    throw new Error('unexpected fs read during P59 helper');
  };
  fs.existsSync = () => {
    throw new Error('unexpected fs exists during P59 helper');
  };
  fs.readdirSync = () => {
    throw new Error('unexpected directory scan during P59 helper');
  };
  childProcess.execSync = () => {
    throw new Error('unexpected command execution during P59 helper');
  };
  childProcess.execFileSync = () => {
    throw new Error('unexpected command execution during P59 helper');
  };
  childProcess.spawnSync = () => {
    throw new Error('unexpected command execution during P59 helper');
  };

  try {
    const result = evaluateHttpRuntimeObservabilityOperation(input);

    assert.equal(result.acceptedForPlanning, true);
    assert.equal(result.safety.readsFiles, false);
    assert.equal(result.safety.scansDirectories, false);
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

test('P59 HTTP observability helper fails closed for malformed or version drift', () => {
  for (const [label, input, reason] of [
    ['malformed', null, 'malformed_input'],
    ['schema', { ...loadFixture(), schemaVersion: 'p59-v999' }, 'schema_version_mismatch'],
    ['policy', { ...loadFixture(), policyVersion: 'p59-policy-v999' }, 'policy_version_mismatch'],
    ['manifest', { ...loadFixture(), manifestVersion: 'p59-manifest-v999' }, 'manifest_version_mismatch']
  ]) {
    const result = evaluateHttpRuntimeObservabilityOperation(input);

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
    assert.equal(result.v1RcReady, false, label);
  }
});

test('P59 HTTP observability helper fails closed for missing duplicate or unknown required sets', () => {
  const fixture = loadFixture();

  for (const [label, patch, reason] of [
    [
      'missing source evidence',
      { sourceEvidence: fixture.sourceEvidence.slice(1) },
      'non_exact_http_observability_contract'
    ],
    [
      'duplicate surface',
      { observabilitySurfaces: [...fixture.observabilitySurfaces, fixture.observabilitySurfaces[0]] },
      'duplicate_http_observability_id'
    ],
    [
      'missing runtime evidence',
      { requiredRuntimeEvidence: REQUIRED_RUNTIME_EVIDENCE.slice(1) },
      'non_exact_http_observability_contract'
    ],
    [
      'unknown denied source',
      { deniedSourceTypes: [...fixture.deniedSourceTypes, 'unknown_source'] },
      'non_exact_http_observability_contract'
    ]
  ]) {
    const result = evaluateHttpRuntimeObservabilityOperation({
      ...fixture,
      ...patch
    });

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
  }
});

test('P59 HTTP observability helper fails closed for unsupported source types', () => {
  const fixture = loadFixture();
  const result = evaluateHttpRuntimeObservabilityOperation({
    ...fixture,
    sourceEvidence: fixture.sourceEvidence.map((source, index) => index === 0
      ? { ...source, sourceType: 'raw_http_header' }
      : source)
  });

  assert.equal(result.status, 'blocked_fail_closed');
  assert.equal(result.acceptedForPlanning, false);
  assert.equal(result.failClosedReasons.includes('source_claims_authority_or_unsupported_type'), true);
});

test('P59 HTTP observability helper fails closed for operation execution safety or readiness claims', () => {
  const fixture = loadFixture();

  for (const [label, patch, reason] of [
    [
      'source authority',
      {
        sourceEvidence: fixture.sourceEvidence.map((source, index) => index === 0
          ? { ...source, operationAuthority: true }
          : source)
      },
      'source_claims_authority_or_unsupported_type'
    ],
    [
      'surface executed',
      {
        observabilitySurfaces: fixture.observabilitySurfaces.map((surface, index) => index === 0
          ? { ...surface, executedInThisPhase: true }
          : surface)
      },
      'surface_claims_execution_or_readiness'
    ],
    [
      'service started',
      { httpServiceStarted: true },
      'readiness_overclaim'
    ],
    [
      'provider call',
      { providerCalls: 1 },
      'readiness_overclaim'
    ],
    [
      'safety leak',
      {
        safety: {
          ...fixture.safety,
          startsServices: true
        }
      },
      'safety_boundary_leaked'
    ],
    [
      'readiness',
      {
        readiness: {
          ...fixture.readiness,
          runtimeReady: true
        }
      },
      'readiness_overclaim'
    ]
  ]) {
    const result = evaluateHttpRuntimeObservabilityOperation({
      ...fixture,
      ...patch
    });

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
    assert.equal(result.v1RcReady, false, label);
  }
});

test('P59 HTTP observability helper redacts sensitive normalized output and source summaries', () => {
  const fixture = loadFixture();
  const normalized = normalizeHttpRuntimeObservabilityOperationInput({
    ...fixture,
    deniedSourceTypes: [
      ...fixture.deniedSourceTypes.slice(1),
      'authorization: Bearer DENIED_SOURCE_TOKEN_1234567890'
    ],
    requiredRuntimeEvidence: [
      ...fixture.requiredRuntimeEvidence,
      'api_key=HTTP_OPERATION_API_KEY_1234567890'
    ],
    sourceEvidence: fixture.sourceEvidence.map((source, index) => index === 0
      ? {
          ...source,
          id: 'p46_http_no_token_mutation_redaction_tests authorization: Bearer SOURCE_TOKEN_1234567890',
          artifactRefs: [
            ...source.artifactRefs,
            'A:\\secret\\.env',
            'https://example.test/path'
          ]
        }
      : source)
  });
  const result = evaluateHttpRuntimeObservabilityOperation(normalized);

  assertNoSensitiveSurface(normalized);
  assertNoSensitiveSurface(result);
  assert.equal(result.acceptedForPlanning, false);
  assert.equal(result.decision, 'NOT_READY_BLOCKED');
  assert.equal(result.sourceTypes.deniedExact, false);
});
