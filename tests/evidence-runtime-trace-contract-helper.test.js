const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  EXPECTED_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION,
  REQUIRED_RUNTIME_GAP_IDS,
  REQUIRED_SOURCE_EVIDENCE_IDS,
  evaluateEvidenceRuntimeTrace,
  normalizeEvidenceRuntimeTraceInput
} = require('../src/core/EvidenceRuntimeTraceContract');

const fixturePath = path.join(__dirname, 'fixtures', 'p55-evidence-to-runtime-enforcement-trace-v1.json');

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

test('P55 trace helper accepts explicit trace object while keeping runtime blocked', () => {
  const result = evaluateEvidenceRuntimeTrace(loadFixture());

  assert.equal(result.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.equal(result.sourceMode, 'explicit_input');
  assert.equal(result.status, 'trace_accepted_runtime_still_blocked');
  assert.equal(result.decision, 'NOT_READY_BLOCKED');
  assert.equal(result.acceptedForPlanning, true);
  assert.equal(result.runtimeEnforcementReady, false);
  assert.equal(result.validationAggregatorFullImplementationReady, false);
  assert.equal(result.finalRcMatrixReady, false);
  assert.equal(result.v1RcReady, false);
  assert.deepEqual(result.failClosedReasons, []);
  assert.equal(result.sourceEvidence.count, REQUIRED_SOURCE_EVIDENCE_IDS.length);
  assert.equal(result.sourceEvidence.exact, true);
  assert.equal(result.runtimeGaps.count, REQUIRED_RUNTIME_GAP_IDS.length);
  assert.equal(result.runtimeGaps.exact, true);
  assert.equal(result.traceLinks.safe, true);
  assert.equal(result.readiness.localTraceContractReady, true);
  assert.equal(result.readiness.runtimeEnforcementReady, false);
  assert.equal(result.safety.readsFiles, false);
  assert.equal(result.safety.executesCommands, false);
  assert.equal(result.safety.readsRealMemory, false);
  assert.equal(result.safety.writesDurableState, false);
});

test('P55 trace helper normalizes allowlisted fields without arbitrary passthrough', () => {
  const normalized = normalizeEvidenceRuntimeTraceInput({
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

test('P55 trace helper does not perform fs reads or command execution', () => {
  const input = loadFixture();
  const originalReadFileSync = fs.readFileSync;
  const originalExistsSync = fs.existsSync;
  const originalReaddirSync = fs.readdirSync;
  const originalExecSync = childProcess.execSync;
  const originalExecFileSync = childProcess.execFileSync;
  const originalSpawnSync = childProcess.spawnSync;

  fs.readFileSync = () => {
    throw new Error('unexpected fs read during P55 trace helper');
  };
  fs.existsSync = () => {
    throw new Error('unexpected fs exists during P55 trace helper');
  };
  fs.readdirSync = () => {
    throw new Error('unexpected directory scan during P55 trace helper');
  };
  childProcess.execSync = () => {
    throw new Error('unexpected command execution during P55 trace helper');
  };
  childProcess.execFileSync = () => {
    throw new Error('unexpected command execution during P55 trace helper');
  };
  childProcess.spawnSync = () => {
    throw new Error('unexpected command execution during P55 trace helper');
  };

  try {
    const result = evaluateEvidenceRuntimeTrace(input);

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

test('P55 trace helper fails closed for malformed or version drift', () => {
  for (const [label, input, reason] of [
    ['malformed', null, 'malformed_input'],
    ['schema', { ...loadFixture(), schemaVersion: 'p55-v999' }, 'schema_version_mismatch'],
    ['policy', { ...loadFixture(), policyVersion: 'p55-policy-v999' }, 'policy_version_mismatch'],
    ['manifest', { ...loadFixture(), manifestVersion: 'p55-manifest-v999' }, 'manifest_version_mismatch']
  ]) {
    const result = evaluateEvidenceRuntimeTrace(input);

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
    assert.equal(result.v1RcReady, false, label);
  }
});

test('P55 trace helper fails closed for missing duplicate or unknown trace ids', () => {
  const fixture = loadFixture();

  for (const [label, patch, reason] of [
    [
      'missing source',
      { sourceEvidence: fixture.sourceEvidence.slice(1) },
      'non_exact_trace_contract'
    ],
    [
      'duplicate source',
      { sourceEvidence: [...fixture.sourceEvidence, fixture.sourceEvidence[0]] },
      'duplicate_trace_id'
    ],
    [
      'missing gap',
      { runtimeGaps: fixture.runtimeGaps.slice(1) },
      'non_exact_trace_contract'
    ],
    [
      'unknown link',
      {
        traceLinks: [
          ...fixture.traceLinks,
          {
            sourceEvidenceId: 'unknown_source',
            runtimeGapId: 'unknown_gap',
            traceStatus: 'unknown'
          }
        ]
      },
      'unsafe_trace_links'
    ]
  ]) {
    const result = evaluateEvidenceRuntimeTrace({
      ...fixture,
      ...patch
    });

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
  }
});

test('P55 trace helper fails closed for runtime authority or readiness overclaims', () => {
  const fixture = loadFixture();

  for (const [label, patch, reason] of [
    [
      'source runtime authority',
      {
        sourceEvidence: fixture.sourceEvidence.map((source, index) => index === 0
          ? { ...source, runtimeAuthority: true }
          : source)
      },
      'source_claims_runtime_authority'
    ],
    [
      'gap enforced',
      {
        runtimeGaps: fixture.runtimeGaps.map((gap, index) => index === 0
          ? { ...gap, currentDisposition: 'enforced' }
          : gap)
      },
      'runtime_gap_not_blocked'
    ],
    [
      'readiness',
      {
        readiness: {
          ...fixture.readiness,
          v1RcReady: true
        }
      },
      'readiness_overclaim'
    ],
    [
      'safety leak',
      {
        safety: {
          ...fixture.safety,
          readsRealMemory: true
        }
      },
      'safety_boundary_leaked'
    ]
  ]) {
    const result = evaluateEvidenceRuntimeTrace({
      ...fixture,
      ...patch
    });

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
    assert.equal(result.v1RcReady, false, label);
  }
});
