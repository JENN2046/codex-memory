const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  EXPECTED_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS,
  REQUIRED_ALLOWED_EVIDENCE_POSTURE,
  REQUIRED_DISALLOWED_READINESS_POSTURE,
  REQUIRED_FAIL_CLOSED_CASES,
  REQUIRED_FAIL_CLOSED_REASONS,
  REQUIRED_READINESS_CLAIMS,
  evaluateValidationAggregatorReadinessOverclaimRejectionProof,
  normalizeValidationAggregatorReadinessOverclaimRejectionProofInput
} = require('../src/core/ValidationAggregatorReadinessOverclaimRejectionProofContract');

function buildReadinessClaims(overrides = {}) {
  return REQUIRED_READINESS_CLAIMS.map(claimId => ({
    id: claimId,
    claim: `${claimId}=true`,
    allowed: false,
    expectedStatus: claimId === 'rc-ready'
      ? 'blocked_rc_ready_overclaim'
      : claimId === 'cutover-ready'
        ? 'blocked_cutover_overclaim'
        : 'blocked_readiness_overclaim',
    expectedDecision: 'NOT_READY_BLOCKED',
    failClosed: true,
    readinessAuthority: false,
    requiredMissingEvidence: [`${claimId}_missing_evidence`],
    ...overrides[claimId]
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
    readinessClaims: buildReadinessClaims(),
    runtimeGapStatus: {
      remainingRuntimeGapCount: 7,
      allRuntimeGapsClosed: false,
      closedByThisPhase: 0,
      mustRemainBlockedWhenGapCountNonZero: true
    },
    a5HardStopStatus: {
      remainingA5HardStopCount: 16,
      allA5HardStopsCleared: false,
      clearedByThisPhase: 0,
      mustRemainBlockedWhenHardStopCountNonZero: true
    },
    failClosedCases: [...REQUIRED_FAIL_CLOSED_CASES],
    allowedEvidencePosture: [...REQUIRED_ALLOWED_EVIDENCE_POSTURE],
    disallowedReadinessPosture: [...REQUIRED_DISALLOWED_READINESS_POSTURE],
    lowRiskSummary: {
      rawWorkspaceIdExposed: false,
      rawSecretExposed: false,
      rawSourcePayloadExposed: false
    },
    safety: {
      readsEvidenceFiles: false,
      executesCommands: false,
      runsGates: false,
      runsRunners: false,
      startsServices: false,
      callsProviders: false,
      mutatesConfig: false,
      operatesStartupWatchdog: false,
      readsRealMemory: false,
      scansRuntimeStores: false,
      writesDurableState: false,
      expandsPublicMcp: false,
      exposesValidateMemoryPublicly: false,
      remoteWrites: false,
      tagReleaseDeploy: false,
      rawSensitiveOutputExposed: false
    },
    readiness: {
      readinessOverclaimRejectionProofReady: false,
      validationAggregatorFullImplementationReady: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      rcReady: false,
      cutoverReady: false
    },
    ...overrides
  };
}

test('P66.33 helper accepts explicit readiness-overclaim metadata while keeping runtime blocked', () => {
  const result = evaluateValidationAggregatorReadinessOverclaimRejectionProof(buildValidInput());

  assert.equal(result.status, 'readiness_overclaim_rejection_proof_accepted_runtime_still_blocked');
  assert.equal(result.decision, 'NOT_READY_BLOCKED');
  assert.equal(result.acceptedForPlanning, true);
  assert.deepEqual(result.failClosedReasons, []);
  assert.equal(result.summary.requiredReadinessClaimCount, REQUIRED_READINESS_CLAIMS.length);
  assert.equal(result.summary.runtimeGapCount, 7);
  assert.equal(result.summary.a5HardStopCount, 16);
  assert.equal(result.validationAggregatorFullImplementationReady, false);
  assert.equal(result.runtimeReady, false);
  assert.equal(result.finalRcMatrixReady, false);
  assert.equal(result.v1RcReady, false);
  assert.equal(result.rcReady, false);
  assert.equal(result.cutoverReady, false);
});

test('P66.33 helper normalizes allowlisted fields without arbitrary passthrough', () => {
  const normalized = normalizeValidationAggregatorReadinessOverclaimRejectionProofInput(buildValidInput({
    extra: 'ignored'
  }));

  assert.equal(normalized.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.deepEqual(normalized.publicMcpTools, PUBLIC_MCP_TOOLS);
  assert.deepEqual(normalized.failClosedCases, REQUIRED_FAIL_CLOSED_CASES);
  assert.deepEqual(normalized.allowedEvidencePosture, REQUIRED_ALLOWED_EVIDENCE_POSTURE);
  assert.deepEqual(normalized.disallowedReadinessPosture, REQUIRED_DISALLOWED_READINESS_POSTURE);
  assert.equal(normalized.extra, undefined);
  assert.equal(normalized.readinessClaims[0].extra, undefined);
});

test('P66.33 helper does not perform fs reads or command execution', () => {
  const source = require('node:fs').readFileSync(
    require('node:path').join(
      __dirname,
      '..',
      'src',
      'core',
      'ValidationAggregatorReadinessOverclaimRejectionProofContract.js'
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

test('P66.33 helper fails closed for malformed or version drift', () => {
  assert.ok(
    evaluateValidationAggregatorReadinessOverclaimRejectionProof(null)
      .failClosedReasons.includes('malformed_input')
  );
  assert.ok(
    evaluateValidationAggregatorReadinessOverclaimRejectionProof(buildValidInput({
      schemaVersion: 'wrong'
    })).failClosedReasons.includes('schema_version_mismatch')
  );
  assert.ok(
    evaluateValidationAggregatorReadinessOverclaimRejectionProof(buildValidInput({
      policyVersion: 'wrong'
    })).failClosedReasons.includes('policy_version_mismatch')
  );
  assert.ok(
    evaluateValidationAggregatorReadinessOverclaimRejectionProof(buildValidInput({
      manifestVersion: 'wrong'
    })).failClosedReasons.includes('manifest_version_mismatch')
  );
});

test('P66.33 helper fails closed for public MCP drift', () => {
  const result = evaluateValidationAggregatorReadinessOverclaimRejectionProof(buildValidInput({
    publicMcpTools: ['record_memory', 'search_memory', 'memory_overview', 'validate_memory']
  }));

  assert.ok(result.failClosedReasons.includes('public_mcp_tools_drift'));
  assert.equal(result.rcReady, false);
});

test('P66.33 helper fails closed for missing duplicate or unknown readiness claims', () => {
  const missingResult = evaluateValidationAggregatorReadinessOverclaimRejectionProof(buildValidInput({
    readinessClaims: buildReadinessClaims().filter(item => item.id !== 'rc-ready')
  }));

  assert.ok(missingResult.failClosedReasons.includes('missing_required_readiness_claim'));
  assert.deepEqual(missingResult.missingRequiredReadinessClaims, ['rc-ready']);

  const duplicateResult = evaluateValidationAggregatorReadinessOverclaimRejectionProof(buildValidInput({
    readinessClaims: [
      ...buildReadinessClaims(),
      buildReadinessClaims()[0]
    ]
  }));

  assert.ok(duplicateResult.failClosedReasons.includes('duplicate_readiness_claim'));
  assert.deepEqual(duplicateResult.duplicateReadinessClaims, ['validation-aggregator-full-implementation-ready']);

  const unknownResult = evaluateValidationAggregatorReadinessOverclaimRejectionProof(buildValidInput({
    readinessClaims: [
      ...buildReadinessClaims(),
      {
        id: 'release-ready',
        allowed: false,
        expectedStatus: 'blocked_release_ready_overclaim',
        expectedDecision: 'NOT_READY_BLOCKED',
        failClosed: true,
        requiredMissingEvidence: ['release_approval']
      }
    ]
  }));

  assert.ok(unknownResult.failClosedReasons.includes('unknown_readiness_claim'));
  assert.deepEqual(unknownResult.unknownReadinessClaims, ['release-ready']);
});

test('P66.33 helper fails closed when readiness claims are not rejected', () => {
  const allowedResult = evaluateValidationAggregatorReadinessOverclaimRejectionProof(buildValidInput({
    readinessClaims: buildReadinessClaims({
      'rc-ready': {
        allowed: true
      }
    })
  }));

  assert.ok(allowedResult.failClosedReasons.includes('readiness_claim_not_rejected'));
  assert.deepEqual(allowedResult.readinessClaimsNotRejected, ['rc-ready']);

  const openResult = evaluateValidationAggregatorReadinessOverclaimRejectionProof(buildValidInput({
    readinessClaims: buildReadinessClaims({
      'runtime-ready': {
        failClosed: false
      }
    })
  }));

  assert.ok(openResult.failClosedReasons.includes('readiness_claim_not_rejected'));
  assert.deepEqual(openResult.readinessClaimsNotRejected, ['runtime-ready']);
});

test('P66.33 helper fails closed for fail-closed case set drift', () => {
  const missingResult = evaluateValidationAggregatorReadinessOverclaimRejectionProof(buildValidInput({
    failClosedCases: REQUIRED_FAIL_CLOSED_CASES.filter(item => item !== 'tag_release_deploy_claims_ready')
  }));

  assert.ok(missingResult.failClosedReasons.includes('missing_required_fail_closed_case'));
  assert.deepEqual(missingResult.missingRequiredFailClosedCases, ['tag_release_deploy_claims_ready']);

  const duplicateResult = evaluateValidationAggregatorReadinessOverclaimRejectionProof(buildValidInput({
    failClosedCases: [
      ...REQUIRED_FAIL_CLOSED_CASES,
      REQUIRED_FAIL_CLOSED_CASES[0]
    ]
  }));

  assert.ok(duplicateResult.failClosedReasons.includes('duplicate_fail_closed_case'));
  assert.deepEqual(duplicateResult.duplicateFailClosedCases, ['missing_readiness_overclaim_rejection_proof']);

  const unknownResult = evaluateValidationAggregatorReadinessOverclaimRejectionProof(buildValidInput({
    failClosedCases: [
      ...REQUIRED_FAIL_CLOSED_CASES,
      'unexpected_ready_case'
    ]
  }));

  assert.ok(unknownResult.failClosedReasons.includes('unknown_fail_closed_case'));
  assert.deepEqual(unknownResult.unknownFailClosedCases, ['unexpected_ready_case']);
});

test('P66.33 helper fails closed when runtime gaps or A5 hard stops are overclaimed as cleared', () => {
  assert.ok(
    evaluateValidationAggregatorReadinessOverclaimRejectionProof(buildValidInput({
      runtimeGapStatus: {
        remainingRuntimeGapCount: 0,
        allRuntimeGapsClosed: true,
        closedByThisPhase: 7,
        mustRemainBlockedWhenGapCountNonZero: false
      }
    })).failClosedReasons.includes('runtime_gap_count_overclaim')
  );
  assert.ok(
    evaluateValidationAggregatorReadinessOverclaimRejectionProof(buildValidInput({
      a5HardStopStatus: {
        remainingA5HardStopCount: 0,
        allA5HardStopsCleared: true,
        clearedByThisPhase: 16,
        mustRemainBlockedWhenHardStopCountNonZero: false
      }
    })).failClosedReasons.includes('a5_hard_stop_count_overclaim')
  );
});

test('P66.33 helper fails closed for evidence and readiness posture drift', () => {
  assert.ok(
    evaluateValidationAggregatorReadinessOverclaimRejectionProof(buildValidInput({
      allowedEvidencePosture: ['fixture_acceptance_defined']
    })).failClosedReasons.includes('evidence_posture_drift')
  );
  assert.ok(
    evaluateValidationAggregatorReadinessOverclaimRejectionProof(buildValidInput({
      disallowedReadinessPosture: ['rc_ready']
    })).failClosedReasons.includes('readiness_posture_drift')
  );
});

test('P66.33 helper fails closed for unsafe low-risk summary safety flags and readiness overclaims', () => {
  assert.ok(
    evaluateValidationAggregatorReadinessOverclaimRejectionProof(buildValidInput({
      lowRiskSummary: {
        rawWorkspaceIdExposed: true,
        rawSecretExposed: false,
        rawSourcePayloadExposed: false
      }
    })).failClosedReasons.includes('unsafe_low_risk_summary')
  );
  assert.ok(
    evaluateValidationAggregatorReadinessOverclaimRejectionProof(buildValidInput({
      safety: {
        callsProviders: true
      }
    })).failClosedReasons.includes('unsafe_safety_flag')
  );
  assert.ok(
    evaluateValidationAggregatorReadinessOverclaimRejectionProof(buildValidInput({
      readiness: {
        rcReady: true
      }
    })).failClosedReasons.includes('readiness_overclaim')
  );
});

test('P66.33 helper redacts or rejects sensitive normalized output and metadata', () => {
  const normalized = normalizeValidationAggregatorReadinessOverclaimRejectionProofInput(buildValidInput({
    status: 'Bearer sk-test-value'
  }));

  assert.doesNotMatch(normalized.status, /Bearer|sk-test-value/);
  assert.ok(
    evaluateValidationAggregatorReadinessOverclaimRejectionProof(buildValidInput({
      readinessClaims: buildReadinessClaims({
        'rc-ready': {
          requiredMissingEvidence: ['workspace-abcdefghi']
        }
      })
    })).failClosedReasons.includes('sensitive_fragment_rejected')
  );
});

test('P66.33 helper exports required constants exactly', () => {
  assert.deepEqual(PUBLIC_MCP_TOOLS, ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory']);
  assert.deepEqual(REQUIRED_READINESS_CLAIMS, [
    'validation-aggregator-full-implementation-ready',
    'runtime-ready',
    'final-rc-matrix-ready',
    'v1-rc-ready',
    'rc-ready',
    'cutover-ready'
  ]);
  assert.ok(REQUIRED_FAIL_CLOSED_CASES.includes('tag_release_deploy_claims_ready'));
  assert.ok(REQUIRED_ALLOWED_EVIDENCE_POSTURE.includes('pure_helper_available'));
  assert.ok(REQUIRED_DISALLOWED_READINESS_POSTURE.includes('rc_ready'));
  for (const reason of [
    'readiness_claim_not_rejected',
    'runtime_gap_count_overclaim',
    'a5_hard_stop_count_overclaim',
    'readiness_overclaim'
  ]) {
    assert.ok(REQUIRED_FAIL_CLOSED_REASONS.includes(reason), reason);
  }
});
