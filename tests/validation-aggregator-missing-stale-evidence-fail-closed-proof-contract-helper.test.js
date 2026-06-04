const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  EXPECTED_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS,
  REQUIRED_EVIDENCE_GROUPS,
  REQUIRED_FAIL_CLOSED_REASONS,
  evaluateValidationAggregatorMissingStaleEvidenceFailClosedProof,
  normalizeValidationAggregatorMissingStaleEvidenceFailClosedProofInput
} = require('../src/core/ValidationAggregatorMissingStaleEvidenceFailClosedProofContract');

function buildEvidence(groups = REQUIRED_EVIDENCE_GROUPS, overrides = {}) {
  return groups.map(group => ({
    id: `${group}-evidence`,
    group,
    status: 'passed',
    createdAt: '2026-05-17T23:55:00.000Z',
    ageSeconds: 300,
    stale: false,
    ...overrides[group]
  }));
}

function buildValidInput(overrides = {}) {
  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    policyVersion: EXPECTED_POLICY_VERSION,
    manifestVersion: EXPECTED_MANIFEST_VERSION,
    explicitInputOnly: true,
    sourceMode: 'explicit_metadata_only',
    status: 'blocked',
    decision: 'NOT_READY_BLOCKED',
    validationAggregatorFullImplementation: false,
    publicMcpTools: [...PUBLIC_MCP_TOOLS],
    asOf: '2026-05-18T00:00:00.000Z',
    freshnessWindowSeconds: 86400,
    providedEvidenceGroups: [...REQUIRED_EVIDENCE_GROUPS],
    evidence: buildEvidence(),
    lowRiskSummary: {
      rawWorkspaceIdExposed: false,
      rawSecretExposed: false,
      rawEvidencePayloadExposed: false
    },
    safety: {
      readsFiles: false,
      refreshesEvidenceImplicitly: false,
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
      missingOrStaleEvidenceFailClosedProofReady: false,
      validationAggregatorFullImplementationReady: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      rcReady: false
    },
    ...overrides
  };
}

test('P66.21 helper accepts explicit complete fresh evidence metadata while keeping runtime blocked', () => {
  const result = evaluateValidationAggregatorMissingStaleEvidenceFailClosedProof(buildValidInput());

  assert.equal(result.status, 'missing_or_stale_evidence_fail_closed_proof_accepted_runtime_still_blocked');
  assert.equal(result.decision, 'NOT_READY_BLOCKED');
  assert.equal(result.acceptedForPlanning, true);
  assert.deepEqual(result.failClosedReasons, []);
  assert.equal(result.summary.requiredEvidenceGroupCount, 8);
  assert.equal(result.summary.missingRequiredEvidenceGroupCount, 0);
  assert.equal(result.summary.staleRequiredEvidenceGroupCount, 0);
  assert.equal(result.validationAggregatorFullImplementationReady, false);
  assert.equal(result.runtimeReady, false);
  assert.equal(result.finalRcMatrixReady, false);
  assert.equal(result.v1RcReady, false);
  assert.equal(result.rcReady, false);
});

test('P66.21 helper normalizes allowlisted fields without arbitrary passthrough', () => {
  const normalized = normalizeValidationAggregatorMissingStaleEvidenceFailClosedProofInput(buildValidInput({
    extra: 'ignored'
  }));

  assert.equal(normalized.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.deepEqual(normalized.publicMcpTools, PUBLIC_MCP_TOOLS);
  assert.deepEqual(normalized.providedEvidenceGroups, REQUIRED_EVIDENCE_GROUPS);
  assert.equal(normalized.extra, undefined);
  assert.equal(normalized.evidence[0].extra, undefined);
});

test('P66.21 helper does not perform fs reads or command execution', () => {
  const source = require('node:fs').readFileSync(
    require('node:path').join(
      __dirname,
      '..',
      'src',
      'core',
      'ValidationAggregatorMissingStaleEvidenceFailClosedProofContract.js'
    ),
    'utf8'
  );

  assert.doesNotMatch(source, /require\(['"](?:node:fs|fs|node:child_process|child_process|node:http|http|node:https|https|node:net|net|node:tls|tls|node:dgram|dgram|node:sqlite|sqlite3|better-sqlite3)['"]\)/);
  assert.doesNotMatch(source, /\breadFileSync\s*\(/);
  assert.doesNotMatch(source, /\breaddirSync\s*\(/);
  assert.doesNotMatch(source, /\bspawn(?:Sync)?\s*\(/);
  assert.doesNotMatch(source, /\bexec(?:File)?(?:Sync)?\s*\(/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
});

test('P66.21 helper fails closed for malformed or version drift', () => {
  assert.ok(
    evaluateValidationAggregatorMissingStaleEvidenceFailClosedProof(null)
      .failClosedReasons.includes('malformed_input')
  );
  assert.ok(
    evaluateValidationAggregatorMissingStaleEvidenceFailClosedProof(buildValidInput({
      schemaVersion: 'wrong'
    })).failClosedReasons.includes('schema_version_mismatch')
  );
  assert.ok(
    evaluateValidationAggregatorMissingStaleEvidenceFailClosedProof(buildValidInput({
      policyVersion: 'wrong'
    })).failClosedReasons.includes('policy_version_mismatch')
  );
  assert.ok(
    evaluateValidationAggregatorMissingStaleEvidenceFailClosedProof(buildValidInput({
      manifestVersion: 'wrong'
    })).failClosedReasons.includes('manifest_version_mismatch')
  );
});

test('P66.21 helper fails closed for public MCP drift', () => {
  assert.ok(
    evaluateValidationAggregatorMissingStaleEvidenceFailClosedProof(buildValidInput({
      publicMcpTools: ['record_memory']
    })).failClosedReasons.includes('public_mcp_tools_drift')
  );
});

test('P66.21 helper fails closed for missing required evidence groups', () => {
  const input = buildValidInput({
    providedEvidenceGroups: REQUIRED_EVIDENCE_GROUPS.filter(group => group !== 'evidence_freshness_proof')
  });
  const result = evaluateValidationAggregatorMissingStaleEvidenceFailClosedProof(input);

  assert.ok(result.failClosedReasons.includes('missing_required_evidence_group'));
  assert.deepEqual(result.missingRequiredEvidenceGroups, ['evidence_freshness_proof']);
  assert.equal(result.summary.inferredMissingEvidence, false);
});

test('P66.21 helper fails closed for stale required evidence groups without implicit refresh', () => {
  const input = buildValidInput({
    evidence: buildEvidence(REQUIRED_EVIDENCE_GROUPS, {
      evidence_freshness_proof: {
        ageSeconds: 172800,
        stale: true
      }
    })
  });
  const result = evaluateValidationAggregatorMissingStaleEvidenceFailClosedProof(input);

  assert.ok(result.failClosedReasons.includes('stale_evidence_group'));
  assert.deepEqual(result.staleRequiredEvidenceGroups, ['evidence_freshness_proof']);
  assert.equal(result.summary.refreshedEvidenceImplicitly, false);
});

test('P66.21 helper fails closed for duplicate and unknown evidence groups', () => {
  const duplicateResult = evaluateValidationAggregatorMissingStaleEvidenceFailClosedProof(buildValidInput({
    providedEvidenceGroups: [
      ...REQUIRED_EVIDENCE_GROUPS,
      'source_registry_exact_set_proof'
    ]
  }));

  assert.ok(duplicateResult.failClosedReasons.includes('duplicate_evidence_group'));
  assert.deepEqual(duplicateResult.duplicateEvidenceGroups, ['source_registry_exact_set_proof']);

  const unknownResult = evaluateValidationAggregatorMissingStaleEvidenceFailClosedProof(buildValidInput({
    providedEvidenceGroups: [
      ...REQUIRED_EVIDENCE_GROUPS,
      'unexpected_runtime_authority_proof'
    ]
  }));

  assert.ok(unknownResult.failClosedReasons.includes('unknown_evidence_group'));
  assert.deepEqual(unknownResult.unknownEvidenceGroups, ['unexpected_runtime_authority_proof']);
});

test('P66.21 helper fails closed for unsafe low-risk summary and safety flags', () => {
  assert.ok(
    evaluateValidationAggregatorMissingStaleEvidenceFailClosedProof(buildValidInput({
      lowRiskSummary: {
        rawWorkspaceIdExposed: true,
        rawSecretExposed: false,
        rawEvidencePayloadExposed: false
      }
    })).failClosedReasons.includes('unsafe_low_risk_summary')
  );
  assert.ok(
    evaluateValidationAggregatorMissingStaleEvidenceFailClosedProof(buildValidInput({
      safety: {
        executesCommands: true
      }
    })).failClosedReasons.includes('unsafe_safety_flag')
  );
});

test('P66.21 helper fails closed for readiness overclaims', () => {
  assert.ok(
    evaluateValidationAggregatorMissingStaleEvidenceFailClosedProof(buildValidInput({
      readiness: {
        v1RcReady: true
      }
    })).failClosedReasons.includes('readiness_overclaim')
  );
  assert.ok(
    evaluateValidationAggregatorMissingStaleEvidenceFailClosedProof(buildValidInput({
      validationAggregatorFullImplementation: true
    })).failClosedReasons.includes('readiness_overclaim')
  );
});

test('P66.21 helper redacts or rejects sensitive normalized output and evidence metadata', () => {
  const normalized = normalizeValidationAggregatorMissingStaleEvidenceFailClosedProofInput(buildValidInput({
    status: 'Bearer sk-test-value'
  }));

  assert.doesNotMatch(normalized.status, /Bearer|sk-test-value/);
  assert.ok(
    evaluateValidationAggregatorMissingStaleEvidenceFailClosedProof(buildValidInput({
      evidence: buildEvidence(REQUIRED_EVIDENCE_GROUPS, {
        evidence_freshness_proof: {
          id: 'workspace-abcdefghi'
        }
      })
    })).failClosedReasons.includes('sensitive_fragment_rejected')
  );
});

test('P66.21 helper exports required constants exactly', () => {
  assert.deepEqual(PUBLIC_MCP_TOOLS, [
    'record_memory',
    'search_memory',
    'memory_overview',
    'audit_memory'
  ]);
  assert.deepEqual(REQUIRED_EVIDENCE_GROUPS, [
    'source_registry_exact_set_proof',
    'evidence_freshness_proof',
    'baseline_binding_proof',
    'runtime_evidence_summary_normalization_proof',
    'missing_or_stale_evidence_fail_closed_proof',
    'unsupported_source_fail_closed_proof',
    'no_touch_boundary_proof',
    'readiness_overclaim_rejection_proof'
  ]);
  for (const reason of [
    'malformed_input',
    'schema_version_mismatch',
    'missing_required_evidence_group',
    'stale_evidence_group',
    'duplicate_evidence_group',
    'unknown_evidence_group',
    'readiness_overclaim'
  ]) {
    assert.ok(REQUIRED_FAIL_CLOSED_REASONS.includes(reason), reason);
  }
});
