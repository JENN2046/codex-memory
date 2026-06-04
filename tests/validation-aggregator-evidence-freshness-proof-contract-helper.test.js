const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const test = require('node:test');

const {
  EXPECTED_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION,
  REQUIRED_FRESHNESS_FIELDS,
  evaluateValidationAggregatorEvidenceFreshnessProof,
  normalizeValidationAggregatorEvidenceFreshnessProofInput
} = require('../src/core/ValidationAggregatorEvidenceFreshnessProofContract');

function buildEvidenceRecord(patch = {}) {
  return {
    evidence_id: 'p66-freshness-record-01',
    source_id: 'static_report_shape_evidence',
    source_kind: 'static_report_shape',
    source_registry_version: 'p66-source-registry-proof-v1',
    baseline_commit: 'bcce0ba000000000000000000000000000000000',
    evidence_generated_at: '2026-05-18T01:00:00.000Z',
    evidence_validated_at: '2026-05-18T01:05:00.000Z',
    evidence_observed_hash: 'sha256:p66freshness001',
    validation_status: 'passed',
    validation_ref: 'p66-targeted-fixture-test',
    ...patch
  };
}

function buildInput(patch = {}) {
  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    policyVersion: EXPECTED_POLICY_VERSION,
    manifestVersion: EXPECTED_MANIFEST_VERSION,
    explicitInputOnly: true,
    sourceMode: 'explicit_input',
    status: 'blocked',
    decision: 'NOT_READY_BLOCKED',
    asOf: '2026-05-18T01:10:00.000Z',
    expectedBaselineCommit: 'bcce0ba000000000000000000000000000000000',
    expectedSourceRegistryVersion: 'p66-source-registry-proof-v1',
    validationAggregatorFullImplementation: false,
    publicMcpTools: ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory'],
    evidenceRecords: [
      buildEvidenceRecord()
    ],
    freshnessWindows: [
      {
        source_kind: 'static_report_shape',
        max_age_ms: 30 * 60 * 1000
      }
    ],
    lowRiskSummary: {
      rawWorkspaceIdExposed: false,
      rawSecretExposed: false
    },
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
      evidenceFreshnessProofReady: false,
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

test('P66.9 freshness helper accepts explicit fresh evidence while keeping runtime blocked', () => {
  const result = evaluateValidationAggregatorEvidenceFreshnessProof(buildInput());

  assert.equal(result.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.equal(result.sourceMode, 'explicit_input');
  assert.equal(result.status, 'evidence_freshness_proof_accepted_runtime_still_blocked');
  assert.equal(result.decision, 'NOT_READY_BLOCKED');
  assert.equal(result.acceptedForPlanning, true);
  assert.equal(result.validationAggregatorFullImplementationReady, false);
  assert.equal(result.runtimeReady, false);
  assert.equal(result.finalRcMatrixReady, false);
  assert.equal(result.v1RcReady, false);
  assert.equal(result.rcReady, false);
  assert.deepEqual(result.failClosedReasons, []);
  assert.equal(result.evidenceFreshness.count, 1);
  assert.deepEqual(result.evidenceFreshness.requiredFields, REQUIRED_FRESHNESS_FIELDS);
  assert.equal(result.evidenceFreshness.summaries[0].freshnessStatus, 'fresh');
  assert.equal(result.readiness.evidenceFreshnessProofReady, true);
});

test('P66.9 freshness helper normalizes allowlisted fields without arbitrary passthrough', () => {
  const normalized = normalizeValidationAggregatorEvidenceFreshnessProofInput({
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

test('P66.9 freshness helper does not perform fs reads or command execution', () => {
  const input = buildInput();
  const originalReadFileSync = fs.readFileSync;
  const originalExistsSync = fs.existsSync;
  const originalReaddirSync = fs.readdirSync;
  const originalExecSync = childProcess.execSync;
  const originalExecFileSync = childProcess.execFileSync;
  const originalSpawnSync = childProcess.spawnSync;

  fs.readFileSync = () => {
    throw new Error('unexpected fs read during P66.9 freshness helper');
  };
  fs.existsSync = () => {
    throw new Error('unexpected fs exists during P66.9 freshness helper');
  };
  fs.readdirSync = () => {
    throw new Error('unexpected directory scan during P66.9 freshness helper');
  };
  childProcess.execSync = () => {
    throw new Error('unexpected command execution during P66.9 freshness helper');
  };
  childProcess.execFileSync = () => {
    throw new Error('unexpected command execution during P66.9 freshness helper');
  };
  childProcess.spawnSync = () => {
    throw new Error('unexpected command execution during P66.9 freshness helper');
  };

  try {
    const result = evaluateValidationAggregatorEvidenceFreshnessProof(input);

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

test('P66.9 freshness helper fails closed for malformed or version drift', () => {
  for (const [label, input, reason] of [
    ['malformed', null, 'malformed_input'],
    ['schema', buildInput({ schemaVersion: 'p66-v999' }), 'schema_version_mismatch'],
    ['policy', buildInput({ policyVersion: 'p66-policy-v999' }), 'policy_version_mismatch'],
    ['manifest', buildInput({ manifestVersion: 'p66-manifest-v999' }), 'manifest_version_mismatch']
  ]) {
    const result = evaluateValidationAggregatorEvidenceFreshnessProof(input);

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
    assert.equal(result.v1RcReady, false, label);
  }
});

test('P66.9 freshness helper fails closed for missing explicit context', () => {
  for (const [label, patch, reason] of [
    ['asOf', { asOf: '' }, 'missing_explicit_as_of'],
    ['baseline', { expectedBaselineCommit: '' }, 'missing_expected_baseline_commit'],
    ['registry version', { expectedSourceRegistryVersion: '' }, 'missing_expected_source_registry_version'],
    ['record', { evidenceRecords: [] }, 'missing_evidence_record']
  ]) {
    const result = evaluateValidationAggregatorEvidenceFreshnessProof(buildInput(patch));

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
  }
});

test('P66.9 freshness helper fails closed for missing fields and duplicate evidence ids', () => {
  for (const [label, patch, reason] of [
    [
      'missing field',
      { evidenceRecords: [buildEvidenceRecord({ validation_ref: '' })] },
      'missing_required_freshness_field'
    ],
    [
      'duplicate id',
      { evidenceRecords: [buildEvidenceRecord(), buildEvidenceRecord()] },
      'duplicate_evidence_id'
    ]
  ]) {
    const result = evaluateValidationAggregatorEvidenceFreshnessProof(buildInput(patch));

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
  }
});

test('P66.9 freshness helper fails closed for timestamp freshness violations', () => {
  for (const [label, recordPatch, reason] of [
    ['non iso', { evidence_validated_at: '2026-05-18 01:05:00' }, 'non_iso8601_utc_timestamp'],
    ['local timezone', { evidence_validated_at: '2026-05-18T01:05:00+08:00' }, 'non_iso8601_utc_timestamp'],
    [
      'generated after validated',
      {
        evidence_generated_at: '2026-05-18T01:06:00.000Z',
        evidence_validated_at: '2026-05-18T01:05:00.000Z'
      },
      'generated_after_validated'
    ],
    ['future validated', { evidence_validated_at: '2026-05-18T01:11:00.000Z' }, 'validated_after_as_of'],
    ['expired', { evidence_validated_at: '2026-05-17T01:05:00.000Z' }, 'expired_freshness_window']
  ]) {
    const result = evaluateValidationAggregatorEvidenceFreshnessProof(buildInput({
      evidenceRecords: [buildEvidenceRecord(recordPatch)]
    }));

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
  }
});

test('P66.9 freshness helper fails closed for baseline source validation and window drift', () => {
  for (const [label, patch, reason] of [
    [
      'baseline mismatch',
      { evidenceRecords: [buildEvidenceRecord({ baseline_commit: 'different-baseline' })] },
      'baseline_commit_mismatch'
    ],
    [
      'source registry mismatch',
      { evidenceRecords: [buildEvidenceRecord({ source_registry_version: 'different-registry' })] },
      'source_registry_version_mismatch'
    ],
    [
      'validation failed',
      { evidenceRecords: [buildEvidenceRecord({ validation_status: 'failed' })] },
      'validation_status_not_passed'
    ],
    [
      'missing window',
      { freshnessWindows: [] },
      'missing_freshness_window'
    ]
  ]) {
    const result = evaluateValidationAggregatorEvidenceFreshnessProof(buildInput(patch));

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
  }
});

test('P66.9 freshness helper fails closed for public MCP drift unsafe summary and no-touch leakage', () => {
  for (const [label, patch, reason] of [
    [
      'public tools',
      { publicMcpTools: ['record_memory', 'search_memory', 'memory_overview', 'validate_memory'] },
      'public_mcp_tools_drift'
    ],
    [
      'summary raw workspace',
      { lowRiskSummary: { rawWorkspaceIdExposed: true, rawSecretExposed: false } },
      'unsafe_low_risk_summary'
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
    const result = evaluateValidationAggregatorEvidenceFreshnessProof(buildInput(patch));

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
  }
});

test('P66.9 freshness helper fails closed for readiness overclaims', () => {
  for (const [label, patch] of [
    ['full implementation', { validationAggregatorFullImplementation: true }],
    ['runtime readiness', { readiness: { ...buildInput().readiness, runtimeReady: true } }],
    ['v1 readiness', { readiness: { ...buildInput().readiness, v1RcReady: true } }]
  ]) {
    const result = evaluateValidationAggregatorEvidenceFreshnessProof(buildInput(patch));

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes('readiness_overclaim'), true, label);
    assert.equal(result.v1RcReady, false, label);
  }
});

test('P66.9 freshness helper redacts sensitive normalized output and refs', () => {
  const normalized = normalizeValidationAggregatorEvidenceFreshnessProofInput(buildInput({
    evidenceRecords: [
      buildEvidenceRecord({
        validation_ref: 'authorization: Bearer SHOULD_NOT_LEAK providerApiKey=SHOULD_NOT_LEAK'
      })
    ]
  }));

  assertNoSensitiveSurface(normalized);
});
