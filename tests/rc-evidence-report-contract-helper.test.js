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
  REQUIRED_EVIDENCE_GROUPS,
  REQUIRED_SOURCE_EVIDENCE_IDS,
  REQUIRED_UNSATISFIED_EVIDENCE_GROUPS,
  SAFE_SOURCE_TYPES,
  evaluateRcEvidenceReport,
  normalizeRcEvidenceReportInput
} = require('../src/core/RcEvidenceReportContract');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p61-mainline-strict-gate-rc-evidence-report-boundary-v1.json'
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

test('P61 RC evidence helper accepts explicit boundary object while keeping RC blocked', () => {
  const result = evaluateRcEvidenceReport(loadFixture());

  assert.equal(result.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.equal(result.sourceMode, 'explicit_input');
  assert.equal(result.status, 'boundary_accepted_rc_evidence_report_still_blocked');
  assert.equal(result.decision, 'NOT_READY_BLOCKED');
  assert.equal(result.acceptedForPlanning, true);
  assert.equal(result.rcEvidenceReportReady, false);
  assert.equal(result.mainlineStrictGateReady, false);
  assert.equal(result.runtimeReady, false);
  assert.equal(result.finalRcMatrixReady, false);
  assert.equal(result.v1RcReady, false);
  assert.deepEqual(result.failClosedReasons, []);
  assert.deepEqual(result.sourceTypes.allowed, SAFE_SOURCE_TYPES);
  assert.deepEqual(result.sourceTypes.denied, DENIED_SOURCE_TYPES);
  assert.equal(result.sourceEvidence.count, REQUIRED_SOURCE_EVIDENCE_IDS.length);
  assert.equal(result.sourceEvidence.exact, true);
  assert.equal(result.evidenceGroups.requiredExact, true);
  assert.equal(result.evidenceGroups.unsatisfiedExact, true);
  assert.equal(result.readiness.localBoundaryInventoryReady, true);
  assert.equal(result.safety.executesCommands, false);
  assert.equal(result.safety.readsRealMemory, false);
  assert.equal(result.safety.writesDurableAudit, false);
});

test('P61 RC evidence helper normalizes allowlisted fields without arbitrary passthrough', () => {
  const normalized = normalizeRcEvidenceReportInput({
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

test('P61 RC evidence helper does not perform fs reads or command execution', () => {
  const input = loadFixture();
  const originalReadFileSync = fs.readFileSync;
  const originalExistsSync = fs.existsSync;
  const originalReaddirSync = fs.readdirSync;
  const originalExecSync = childProcess.execSync;
  const originalExecFileSync = childProcess.execFileSync;
  const originalSpawnSync = childProcess.spawnSync;

  fs.readFileSync = () => {
    throw new Error('unexpected fs read during P61 helper');
  };
  fs.existsSync = () => {
    throw new Error('unexpected fs exists during P61 helper');
  };
  fs.readdirSync = () => {
    throw new Error('unexpected directory scan during P61 helper');
  };
  childProcess.execSync = () => {
    throw new Error('unexpected command execution during P61 helper');
  };
  childProcess.execFileSync = () => {
    throw new Error('unexpected command execution during P61 helper');
  };
  childProcess.spawnSync = () => {
    throw new Error('unexpected command execution during P61 helper');
  };

  try {
    const result = evaluateRcEvidenceReport(input);

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

test('P61 RC evidence helper fails closed for malformed or version drift', () => {
  for (const [label, input, reason] of [
    ['malformed', null, 'malformed_input'],
    ['schema', { ...loadFixture(), schemaVersion: 'p61-v999' }, 'schema_version_mismatch'],
    ['policy', { ...loadFixture(), policyVersion: 'p61-policy-v999' }, 'policy_version_mismatch'],
    ['manifest', { ...loadFixture(), manifestVersion: 'p61-manifest-v999' }, 'manifest_version_mismatch']
  ]) {
    const result = evaluateRcEvidenceReport(input);

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
    assert.equal(result.v1RcReady, false, label);
  }
});

test('P61 RC evidence helper fails closed for missing duplicate or unknown required sets', () => {
  const fixture = loadFixture();

  for (const [label, patch, reason] of [
    [
      'missing source evidence',
      { sourceEvidence: fixture.sourceEvidence.slice(1) },
      'non_exact_rc_evidence_report_contract'
    ],
    [
      'duplicate source evidence',
      { sourceEvidence: [...fixture.sourceEvidence, fixture.sourceEvidence[0]] },
      'duplicate_rc_evidence_source_id'
    ],
    [
      'missing evidence group',
      { requiredEvidenceGroups: REQUIRED_EVIDENCE_GROUPS.slice(1) },
      'non_exact_rc_evidence_report_contract'
    ],
    [
      'missing unsatisfied group',
      { unsatisfiedEvidenceGroups: REQUIRED_UNSATISFIED_EVIDENCE_GROUPS.slice(1) },
      'non_exact_rc_evidence_report_contract'
    ],
    [
      'unknown denied source',
      { deniedSourceTypes: [...fixture.deniedSourceTypes, 'unknown_source'] },
      'non_exact_rc_evidence_report_contract'
    ]
  ]) {
    const result = evaluateRcEvidenceReport({
      ...fixture,
      ...patch
    });

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
  }
});

test('P61 RC evidence helper fails closed for unsupported source types', () => {
  const fixture = loadFixture();
  const result = evaluateRcEvidenceReport({
    ...fixture,
    sourceEvidence: fixture.sourceEvidence.map((source, index) => index === 0
      ? { ...source, sourceType: 'real_memory_content' }
      : source)
  });

  assert.equal(result.status, 'blocked_fail_closed');
  assert.equal(result.acceptedForPlanning, false);
  assert.equal(result.failClosedReasons.includes('source_claims_authority_or_unsupported_type'), true);
});

test('P61 RC evidence helper fails closed for execution safety or readiness claims', () => {
  const fixture = loadFixture();

  for (const [label, patch, reason] of [
    [
      'source authority',
      {
        sourceEvidence: fixture.sourceEvidence.map((source, index) => index === 0
          ? { ...source, reportAuthority: true }
          : source)
      },
      'source_claims_authority_or_unsupported_type'
    ],
    [
      'mainline gate executed',
      { mainlineStrictGateExecuted: true },
      'readiness_overclaim'
    ],
    [
      'final runner executed',
      { finalRcRunnerExecuted: true },
      'readiness_overclaim'
    ],
    [
      'provider call',
      { providerCalls: 1 },
      'readiness_overclaim'
    ],
    [
      'durable write',
      { durableAuditWritten: true },
      'readiness_overclaim'
    ],
    [
      'safety leak',
      {
        safety: {
          ...fixture.safety,
          executesCommands: true
        }
      },
      'safety_boundary_leaked'
    ],
    [
      'readiness',
      {
        readiness: {
          ...fixture.readiness,
          rcEvidenceReportReady: true
        }
      },
      'readiness_overclaim'
    ]
  ]) {
    const result = evaluateRcEvidenceReport({
      ...fixture,
      ...patch
    });

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
    assert.equal(result.v1RcReady, false, label);
  }
});

test('P61 RC evidence helper redacts sensitive normalized output and source summaries', () => {
  const fixture = loadFixture();
  const normalized = normalizeRcEvidenceReportInput({
    ...fixture,
    deniedSourceTypes: [
      ...fixture.deniedSourceTypes.slice(1),
      'authorization: Bearer DENIED_SOURCE_TOKEN_1234567890'
    ],
    requiredEvidenceGroups: [
      ...fixture.requiredEvidenceGroups,
      'token=SUMMARY_TOKEN_1234567890'
    ],
    sourceEvidence: fixture.sourceEvidence.map((source, index) => index === 0
      ? {
          ...source,
          id: 'p52_runtime_schema_version_enforcement_helper authorization: Bearer SOURCE_TOKEN_1234567890',
          artifactRefs: [
            ...source.artifactRefs,
            'A:\\secret\\.env',
            'https://example.test/path'
          ]
        }
      : source)
  });
  const result = evaluateRcEvidenceReport(normalized);

  assertNoSensitiveSurface(normalized);
  assertNoSensitiveSurface(result);
  assert.equal(result.acceptedForPlanning, false);
  assert.equal(result.decision, 'NOT_READY_BLOCKED');
  assert.equal(result.sourceTypes.deniedExact, false);
});
