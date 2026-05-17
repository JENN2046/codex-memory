const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  EXPECTED_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION,
  REQUIRED_ISOLATED_RECORD_FAMILIES,
  REQUIRED_PROOF_SURFACE_IDS,
  REQUIRED_RUNTIME_PROOF_EVIDENCE,
  REQUIRED_SOURCE_EVIDENCE_IDS,
  evaluateRecallIsolationRuntimeProof,
  normalizeRecallIsolationRuntimeProofInput
} = require('../src/core/RecallIsolationRuntimeProofContract');

const fixturePath = path.join(__dirname, 'fixtures', 'p57-recall-isolation-runtime-proof-boundary-v1.json');

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

test('P57 helper accepts explicit boundary inventory while keeping runtime proof blocked', () => {
  const result = evaluateRecallIsolationRuntimeProof(loadFixture());

  assert.equal(result.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.equal(result.sourceMode, 'explicit_input');
  assert.equal(result.status, 'boundary_inventory_accepted_runtime_proof_still_blocked');
  assert.equal(result.decision, 'NOT_READY_BLOCKED');
  assert.equal(result.acceptedForPlanning, true);
  assert.equal(result.runtimeProofReady, false);
  assert.equal(result.recallIsolationRuntimeReady, false);
  assert.equal(result.contaminationReportReady, false);
  assert.equal(result.runtimeReady, false);
  assert.equal(result.finalRcMatrixReady, false);
  assert.equal(result.v1RcReady, false);
  assert.deepEqual(result.failClosedReasons, []);
  assert.equal(result.sourceEvidence.count, REQUIRED_SOURCE_EVIDENCE_IDS.length);
  assert.equal(result.sourceEvidence.exact, true);
  assert.equal(result.isolatedRecordFamilies.count, REQUIRED_ISOLATED_RECORD_FAMILIES.length);
  assert.equal(result.isolatedRecordFamilies.exact, true);
  assert.equal(result.proofSurfaces.count, REQUIRED_PROOF_SURFACE_IDS.length);
  assert.equal(result.proofSurfaces.exact, true);
  assert.equal(result.runtimeProofEvidence.requiredExact, true);
  assert.equal(result.runtimeProofEvidence.unsatisfiedExact, true);
  assert.equal(result.readiness.localBoundaryInventoryReady, true);
  assert.equal(result.safety.scansRuntimeStores, false);
  assert.equal(result.safety.readsRealMemory, false);
});

test('P57 helper normalizes allowlisted fields without arbitrary passthrough', () => {
  const normalized = normalizeRecallIsolationRuntimeProofInput({
    ...loadFixture(),
    authorization: 'authorization: Bearer SHOULD_NOT_PASS',
    raw_workspace_id: 'raw_workspace_id=workspace-raw',
    runtimeRows: ['raw runtime row']
  });

  assert.equal(normalized.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.equal(normalized.policyVersion, EXPECTED_POLICY_VERSION);
  assert.equal(normalized.manifestVersion, EXPECTED_MANIFEST_VERSION);
  assert.equal(Object.hasOwn(normalized, 'authorization'), false);
  assert.equal(Object.hasOwn(normalized, 'raw_workspace_id'), false);
  assert.equal(Object.hasOwn(normalized, 'runtimeRows'), false);
  assertNoSensitiveSurface(normalized);
});

test('P57 helper does not perform fs reads or command execution', () => {
  const input = loadFixture();
  const originalReadFileSync = fs.readFileSync;
  const originalExistsSync = fs.existsSync;
  const originalReaddirSync = fs.readdirSync;
  const originalExecSync = childProcess.execSync;
  const originalExecFileSync = childProcess.execFileSync;
  const originalSpawnSync = childProcess.spawnSync;

  fs.readFileSync = () => {
    throw new Error('unexpected fs read during P57 helper');
  };
  fs.existsSync = () => {
    throw new Error('unexpected fs exists during P57 helper');
  };
  fs.readdirSync = () => {
    throw new Error('unexpected directory scan during P57 helper');
  };
  childProcess.execSync = () => {
    throw new Error('unexpected command execution during P57 helper');
  };
  childProcess.execFileSync = () => {
    throw new Error('unexpected command execution during P57 helper');
  };
  childProcess.spawnSync = () => {
    throw new Error('unexpected command execution during P57 helper');
  };

  try {
    const result = evaluateRecallIsolationRuntimeProof(input);

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

test('P57 helper fails closed for malformed or version drift', () => {
  for (const [label, input, reason] of [
    ['malformed', null, 'malformed_input'],
    ['schema', { ...loadFixture(), schemaVersion: 'p57-v999' }, 'schema_version_mismatch'],
    ['policy', { ...loadFixture(), policyVersion: 'p57-policy-v999' }, 'policy_version_mismatch'],
    ['manifest', { ...loadFixture(), manifestVersion: 'p57-manifest-v999' }, 'manifest_version_mismatch']
  ]) {
    const result = evaluateRecallIsolationRuntimeProof(input);

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
    assert.equal(result.v1RcReady, false, label);
  }
});

test('P57 helper fails closed for missing duplicate or unknown proof ids', () => {
  const fixture = loadFixture();

  for (const [label, patch, reason] of [
    ['missing source', { sourceEvidence: fixture.sourceEvidence.slice(1) }, 'non_exact_recall_isolation_runtime_proof_contract'],
    ['duplicate source', { sourceEvidence: [...fixture.sourceEvidence, fixture.sourceEvidence[0]] }, 'duplicate_proof_id'],
    ['missing surface', { proofSurfaces: fixture.proofSurfaces.slice(1) }, 'non_exact_recall_isolation_runtime_proof_contract'],
    ['unknown evidence', { requiredRuntimeProofEvidence: [...REQUIRED_RUNTIME_PROOF_EVIDENCE.slice(1), 'unknown_runtime_proof'] }, 'non_exact_recall_isolation_runtime_proof_contract']
  ]) {
    const result = evaluateRecallIsolationRuntimeProof({
      ...fixture,
      ...patch
    });

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
  }
});

test('P57 helper fails closed for runtime access contamination or readiness claims', () => {
  const fixture = loadFixture();

  for (const [label, patch, reason] of [
    [
      'source authority',
      {
        sourceEvidence: fixture.sourceEvidence.map((source, index) => index === 0
          ? { ...source, runtimeAuthority: true }
          : source)
      },
      'source_claims_runtime_authority'
    ],
    [
      'surface store scan',
      {
        proofSurfaces: fixture.proofSurfaces.map((surface, index) => index === 0
          ? { ...surface, runtimeStoreReadAllowed: true }
          : surface)
      },
      'proof_surface_allows_runtime_access_or_contamination'
    ],
    [
      'surface contamination',
      {
        proofSurfaces: fixture.proofSurfaces.map((surface, index) => index === 0
          ? { ...surface, contaminationAllowed: true }
          : surface)
      },
      'proof_surface_allows_runtime_access_or_contamination'
    ],
    [
      'unsafe controls',
      {
        controls: fixture.controls.map((control, index) => index === 1
          ? { ...control, mayEnterNormalRecall: true }
          : control)
      },
      'unsafe_or_missing_controls'
    ],
    ['runtime proof', { runtimeProofExecuted: true }, 'readiness_overclaim'],
    [
      'safety leak',
      {
        safety: {
          ...fixture.safety,
          scansRuntimeStores: true
        }
      },
      'safety_boundary_leaked'
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
    ]
  ]) {
    const result = evaluateRecallIsolationRuntimeProof({
      ...fixture,
      ...patch
    });

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
    assert.equal(result.v1RcReady, false, label);
  }
});
