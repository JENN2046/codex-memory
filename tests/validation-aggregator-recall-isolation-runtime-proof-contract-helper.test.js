const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  EXPECTED_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION,
  PUBLIC_MCP_TOOLS,
  REQUIRED_DISALLOWED_WORK,
  REQUIRED_FAIL_CLOSED_CASES,
  REQUIRED_FAIL_CLOSED_REASONS,
  REQUIRED_ISOLATED_RECORD_FAMILIES,
  REQUIRED_PROOF_SURFACES,
  REQUIRED_RUNTIME_EVIDENCE_GROUPS,
  evaluateValidationAggregatorRecallIsolationRuntimeProof,
  normalizeValidationAggregatorRecallIsolationRuntimeProofInput
} = require('../src/core/ValidationAggregatorRecallIsolationRuntimeProofContract');

function buildIsolatedRecordFamilyCases(overrides = {}) {
  return REQUIRED_ISOLATED_RECORD_FAMILIES.map(id => ({
    id,
    required: true,
    currentStatus: 'acceptance_defined_not_runtime_executed',
    mustBeExcludedFromAllProofSurfaces: true,
    mustFailClosedWhenObserved: true,
    ...overrides[id]
  }));
}

function buildProofSurfaceCases(overrides = {}) {
  return REQUIRED_PROOF_SURFACES.map(id => ({
    id,
    required: true,
    runtimeStoreReadAllowed: false,
    contaminationAllowed: false,
    syntheticEvidenceAllowed: true,
    realDataEvidenceAllowed: false,
    futureEvidenceRequired: true,
    ...overrides[id]
  }));
}

function buildRuntimeEvidenceGroups(overrides = {}) {
  return REQUIRED_RUNTIME_EVIDENCE_GROUPS.map(id => ({
    id,
    required: true,
    currentStatus: 'missing',
    mustFailClosedWhenMissing: true,
    ...overrides[id]
  }));
}

function buildControlCases(overrides = {}) {
  return [
    {
      id: 'active_in_scope_user_memory_positive_control',
      recordFamily: 'active_in_scope_user_memory',
      required: true,
      mayEnterNormalRecall: true,
      mayEnterVectorIndex: true,
      mayEnterCandidateCache: true,
      mayEnterRanking: true,
      mayEnterProjection: true,
      mayEnterUserVisibleAuditSummary: true,
      mayEnterRecallAuditSummary: true,
      ...overrides.positive
    },
    {
      id: 'isolated_record_negative_controls',
      recordFamilies: [...REQUIRED_ISOLATED_RECORD_FAMILIES],
      required: true,
      mayEnterNormalRecall: false,
      mayEnterVectorIndex: false,
      mayEnterCandidateCache: false,
      mayEnterRanking: false,
      mayEnterProjection: false,
      mayEnterUserVisibleAuditSummary: false,
      mayEnterRecallAuditSummary: false,
      ...overrides.negative
    }
  ];
}

function buildValidInput(overrides = {}) {
  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    policyVersion: EXPECTED_POLICY_VERSION,
    manifestVersion: EXPECTED_MANIFEST_VERSION,
    sourceMode: 'explicit_metadata_only',
    status: 'blocked',
    decision: 'NOT_READY_BLOCKED',
    selectedGap: {
      id: 'recall_isolation_runtime_proof_not_executed',
      priority: 3,
      currentStatus: 'open',
      requiresA5ApprovalBeforeRuntime: true,
      remainsOpenAfterThisPhase: true,
      readinessAuthority: false
    },
    sourcePlan: {
      phase: 'P66.42-validation-aggregator-recall-isolation-runtime-proof-gap-planning',
      fixture: 'tests/fixtures/p66-validation-aggregator-recall-isolation-runtime-proof-gap-plan-v1.json',
      test: 'tests/p66-validation-aggregator-recall-isolation-runtime-proof-gap-plan-fixture.test.js',
      runtimeAuthority: false,
      readinessAuthority: false
    },
    validationAggregatorFullImplementation: false,
    recallIsolationRuntimeProofReady: false,
    recallIsolationRuntimeProofExecuted: false,
    contaminationReportReady: false,
    contaminationReportProduced: false,
    realMemoryScanned: false,
    runtimeStoreScanned: false,
    runtimeReady: false,
    finalRcMatrixReady: false,
    v1RcReady: false,
    rcReady: false,
    cutoverReady: false,
    publicToolsFrozen: true,
    publicTools: [...PUBLIC_MCP_TOOLS],
    internalOnlyTools: ['validate_memory'],
    isolatedRecordFamilyAcceptanceCases: buildIsolatedRecordFamilyCases(),
    proofSurfaceAcceptanceCases: buildProofSurfaceCases(),
    controlCases: buildControlCases(),
    requiredRuntimeEvidenceGroups: buildRuntimeEvidenceGroups(),
    failClosedCases: [...REQUIRED_FAIL_CLOSED_CASES],
    disallowedWork: [...REQUIRED_DISALLOWED_WORK],
    safety: {
      mutated: false,
      fixtureOnly: true,
      acceptanceContractOnly: true,
      noRuntimeImplementation: true,
      noRuntimeProofExecution: true,
      noRecallExecution: true,
      noRealMemoryRead: true,
      noRealMemoryScan: true,
      noDiaryScan: true,
      noSqliteScan: true,
      noVectorIndexScan: true,
      noCandidateCacheScan: true,
      noRecallAuditScan: true,
      noRuntimeStoreScan: true,
      noContaminationReportFromRealData: true,
      noCommandExecution: true,
      noGateExecution: true,
      noRunnerExecution: true,
      noServiceStart: true,
      noProviderCall: true,
      noConfigMutation: true,
      noStartupWatchdogOperation: true,
      noDurableMemoryWrite: true,
      noDurableAuditWrite: true,
      noMigrationApply: true,
      noImportExportApply: true,
      noBackupRestoreApply: true,
      noPublicMcpExpansion: true,
      noPackageChange: true,
      noSecretChange: true,
      noRemoteWrite: true,
      noTagReleaseDeploy: true
    },
    readiness: {
      validationAggregatorFullImplementationReady: false,
      recallIsolationRuntimeProofReady: false,
      recallIsolationRuntimeProofExecuted: false,
      contaminationReportReady: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      rcReady: false,
      cutoverReady: false
    },
    ...overrides
  };
}

test('P66.44 helper accepts explicit recall isolation metadata while keeping runtime blocked', () => {
  const result = evaluateValidationAggregatorRecallIsolationRuntimeProof(buildValidInput());

  assert.equal(result.status, 'recall_isolation_acceptance_contract_accepted_runtime_still_blocked');
  assert.equal(result.decision, 'NOT_READY_BLOCKED');
  assert.equal(result.acceptedForPlanning, true);
  assert.deepEqual(result.failClosedReasons, []);
  assert.equal(result.selectedGapOpen, true);
  assert.equal(result.summary.isolatedRecordFamilyCount, REQUIRED_ISOLATED_RECORD_FAMILIES.length);
  assert.equal(result.summary.proofSurfaceCount, REQUIRED_PROOF_SURFACES.length);
  assert.equal(result.summary.requiredRuntimeEvidenceGroupCount, REQUIRED_RUNTIME_EVIDENCE_GROUPS.length);
  assert.equal(result.summary.noRealMemoryScan, true);
  assert.equal(result.recallIsolationRuntimeProofReady, false);
  assert.equal(result.recallIsolationRuntimeProofExecuted, false);
  assert.equal(result.runtimeReady, false);
  assert.equal(result.rcReady, false);
});

test('P66.44 helper normalizes allowlisted fields without arbitrary passthrough', () => {
  const normalized = normalizeValidationAggregatorRecallIsolationRuntimeProofInput(buildValidInput({
    extra: 'ignored'
  }));

  assert.equal(normalized.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.deepEqual(normalized.publicTools, PUBLIC_MCP_TOOLS);
  assert.deepEqual(normalized.failClosedCases, REQUIRED_FAIL_CLOSED_CASES);
  assert.deepEqual(normalized.disallowedWork, REQUIRED_DISALLOWED_WORK);
  assert.equal(normalized.extra, undefined);
  assert.equal(normalized.isolatedRecordFamilyAcceptanceCases[0].extra, undefined);
});

test('P66.44 helper does not perform fs reads command execution or runtime imports', () => {
  const source = require('node:fs').readFileSync(
    require('node:path').join(
      __dirname,
      '..',
      'src',
      'core',
      'ValidationAggregatorRecallIsolationRuntimeProofContract.js'
    ),
    'utf8'
  );

  assert.doesNotMatch(source, /require\(['"](?:node:fs|fs|node:child_process|child_process|node:http|http|node:https|https|node:net|net|node:tls|tls|node:dgram|dgram|node:sqlite|sqlite3|better-sqlite3)['"]\)/);
  assert.doesNotMatch(source, /require\(['"][^'"]*(?:storage|recall|adapters|Sqlite|SQLite|Vector|Candidate|Recall|Provider|Embedding|Rerank)[^'"]*['"]\)/);
  assert.doesNotMatch(source, /\breadFileSync\s*\(/);
  assert.doesNotMatch(source, /\breaddirSync\s*\(/);
  assert.doesNotMatch(source, /\bspawn(?:Sync)?\s*\(/);
  assert.doesNotMatch(source, /\bexec(?:File)?(?:Sync)?\s*\(/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
});

test('P66.44 helper fails closed for malformed or version drift', () => {
  assert.ok(
    evaluateValidationAggregatorRecallIsolationRuntimeProof(null)
      .failClosedReasons.includes('malformed_input')
  );
  assert.ok(
    evaluateValidationAggregatorRecallIsolationRuntimeProof(buildValidInput({
      schemaVersion: 'wrong'
    })).failClosedReasons.includes('schema_version_mismatch')
  );
  assert.ok(
    evaluateValidationAggregatorRecallIsolationRuntimeProof(buildValidInput({
      policyVersion: 'wrong'
    })).failClosedReasons.includes('policy_version_mismatch')
  );
  assert.ok(
    evaluateValidationAggregatorRecallIsolationRuntimeProof(buildValidInput({
      manifestVersion: 'wrong'
    })).failClosedReasons.includes('manifest_version_mismatch')
  );
});

test('P66.44 helper fails closed for public MCP selected gap and source plan drift', () => {
  assert.ok(
    evaluateValidationAggregatorRecallIsolationRuntimeProof(buildValidInput({
      publicTools: [...PUBLIC_MCP_TOOLS, 'validate_memory']
    })).failClosedReasons.includes('public_mcp_tools_drift')
  );
  assert.ok(
    evaluateValidationAggregatorRecallIsolationRuntimeProof(buildValidInput({
      selectedGap: {
        ...buildValidInput().selectedGap,
        currentStatus: 'closed'
      }
    })).failClosedReasons.includes('selected_gap_drift')
  );
  assert.ok(
    evaluateValidationAggregatorRecallIsolationRuntimeProof(buildValidInput({
      sourcePlan: {
        ...buildValidInput().sourcePlan,
        runtimeAuthority: true
      }
    })).failClosedReasons.includes('source_plan_drift')
  );
});

test('P66.44 helper fails closed for isolated record family drift', () => {
  const missingResult = evaluateValidationAggregatorRecallIsolationRuntimeProof(buildValidInput({
    isolatedRecordFamilyAcceptanceCases: buildIsolatedRecordFamilyCases()
      .filter(item => item.id !== 'readiness_reports')
  }));
  assert.ok(missingResult.failClosedReasons.includes('isolated_record_family_drift'));
  assert.deepEqual(missingResult.missingIsolatedRecordFamilies, ['readiness_reports']);

  const duplicateResult = evaluateValidationAggregatorRecallIsolationRuntimeProof(buildValidInput({
    isolatedRecordFamilyAcceptanceCases: [
      ...buildIsolatedRecordFamilyCases(),
      buildIsolatedRecordFamilyCases()[0]
    ]
  }));
  assert.ok(duplicateResult.failClosedReasons.includes('isolated_record_family_drift'));
  assert.deepEqual(duplicateResult.duplicateIsolatedRecordFamilies, ['governance_records']);

  const unsafeResult = evaluateValidationAggregatorRecallIsolationRuntimeProof(buildValidInput({
    isolatedRecordFamilyAcceptanceCases: buildIsolatedRecordFamilyCases({
      policy_decisions: {
        mustFailClosedWhenObserved: false
      }
    })
  }));
  assert.ok(unsafeResult.failClosedReasons.includes('isolated_record_family_drift'));
  assert.deepEqual(unsafeResult.unsafeIsolatedRecordFamilies, ['policy_decisions']);
});

test('P66.44 helper fails closed for proof surface drift', () => {
  const missingResult = evaluateValidationAggregatorRecallIsolationRuntimeProof(buildValidInput({
    proofSurfaceAcceptanceCases: buildProofSurfaceCases()
      .filter(item => item.id !== 'candidate_cache')
  }));
  assert.ok(missingResult.failClosedReasons.includes('proof_surface_drift'));
  assert.deepEqual(missingResult.missingProofSurfaces, ['candidate_cache']);

  const unknownResult = evaluateValidationAggregatorRecallIsolationRuntimeProof(buildValidInput({
    proofSurfaceAcceptanceCases: [
      ...buildProofSurfaceCases(),
      {
        id: 'surprise_recall_surface',
        required: true,
        runtimeStoreReadAllowed: false,
        contaminationAllowed: false,
        syntheticEvidenceAllowed: true,
        realDataEvidenceAllowed: false,
        futureEvidenceRequired: true
      }
    ]
  }));
  assert.ok(unknownResult.failClosedReasons.includes('proof_surface_drift'));
  assert.deepEqual(unknownResult.unknownProofSurfaces, ['surprise_recall_surface']);

  const unsafeResult = evaluateValidationAggregatorRecallIsolationRuntimeProof(buildValidInput({
    proofSurfaceAcceptanceCases: buildProofSurfaceCases({
      vector_index: {
        realDataEvidenceAllowed: true
      }
    })
  }));
  assert.ok(unsafeResult.failClosedReasons.includes('proof_surface_drift'));
  assert.deepEqual(unsafeResult.unsafeProofSurfaces, ['vector_index']);
});

test('P66.44 helper fails closed for control case drift', () => {
  assert.ok(
    evaluateValidationAggregatorRecallIsolationRuntimeProof(buildValidInput({
      controlCases: buildControlCases({
        positive: {
          mayEnterNormalRecall: false
        }
      })
    })).failClosedReasons.includes('control_case_drift')
  );
  assert.ok(
    evaluateValidationAggregatorRecallIsolationRuntimeProof(buildValidInput({
      controlCases: buildControlCases({
        negative: {
          mayEnterVectorIndex: true
        }
      })
    })).failClosedReasons.includes('control_case_drift')
  );
  assert.ok(
    evaluateValidationAggregatorRecallIsolationRuntimeProof(buildValidInput({
      controlCases: buildControlCases({
        negative: {
          recordFamilies: REQUIRED_ISOLATED_RECORD_FAMILIES.filter(item => item !== 'blocked_memory')
        }
      })
    })).failClosedReasons.includes('control_case_drift')
  );
});

test('P66.44 helper fails closed for runtime evidence group drift', () => {
  const missingResult = evaluateValidationAggregatorRecallIsolationRuntimeProof(buildValidInput({
    requiredRuntimeEvidenceGroups: buildRuntimeEvidenceGroups()
      .filter(item => item.id !== 'machine_readable_contamination_report')
  }));
  assert.ok(missingResult.failClosedReasons.includes('missing_required_runtime_evidence'));
  assert.deepEqual(missingResult.missingRequiredRuntimeEvidence, ['machine_readable_contamination_report']);

  const duplicateResult = evaluateValidationAggregatorRecallIsolationRuntimeProof(buildValidInput({
    requiredRuntimeEvidenceGroups: [
      ...buildRuntimeEvidenceGroups(),
      buildRuntimeEvidenceGroups()[0]
    ]
  }));
  assert.ok(duplicateResult.failClosedReasons.includes('duplicate_runtime_evidence'));
  assert.deepEqual(duplicateResult.duplicateRuntimeEvidence, ['synthetic_runtime_harness_plan']);

  const presentResult = evaluateValidationAggregatorRecallIsolationRuntimeProof(buildValidInput({
    requiredRuntimeEvidenceGroups: buildRuntimeEvidenceGroups({
      vector_exclusion_assertions: {
        currentStatus: 'present'
      }
    })
  }));
  assert.ok(presentResult.failClosedReasons.includes('runtime_evidence_not_missing'));
  assert.deepEqual(presentResult.runtimeEvidenceNotMissing, ['vector_exclusion_assertions']);
});

test('P66.44 helper fails closed for fail-closed case and disallowed work drift', () => {
  const missingCaseResult = evaluateValidationAggregatorRecallIsolationRuntimeProof(buildValidInput({
    failClosedCases: REQUIRED_FAIL_CLOSED_CASES.filter(item => item !== 'real_memory_scan_claim')
  }));
  assert.ok(missingCaseResult.failClosedReasons.includes('missing_required_fail_closed_case'));
  assert.deepEqual(missingCaseResult.missingRequiredFailClosedCases, ['real_memory_scan_claim']);

  const duplicateCaseResult = evaluateValidationAggregatorRecallIsolationRuntimeProof(buildValidInput({
    failClosedCases: [
      ...REQUIRED_FAIL_CLOSED_CASES,
      REQUIRED_FAIL_CLOSED_CASES[0]
    ]
  }));
  assert.ok(duplicateCaseResult.failClosedReasons.includes('duplicate_fail_closed_case'));
  assert.deepEqual(duplicateCaseResult.duplicateFailClosedCases, ['missing_isolated_record_family']);

  const disallowedWorkResult = evaluateValidationAggregatorRecallIsolationRuntimeProof(buildValidInput({
    disallowedWork: REQUIRED_DISALLOWED_WORK.filter(item => item !== 'candidate_cache_scan')
  }));
  assert.ok(disallowedWorkResult.failClosedReasons.includes('disallowed_work_drift'));
  assert.deepEqual(disallowedWorkResult.missingRequiredDisallowedWork, ['candidate_cache_scan']);
});

test('P66.44 helper fails closed for unsafe safety flags sensitive fragments and readiness overclaims', () => {
  const syntheticBearerValue = ['Bearer', 'sk-test-value'].join(' ');

  assert.ok(
    evaluateValidationAggregatorRecallIsolationRuntimeProof(buildValidInput({
      safety: {
        ...buildValidInput().safety,
        noRealMemoryScan: false
      }
    })).failClosedReasons.includes('unsafe_safety_flag')
  );
  assert.ok(
    evaluateValidationAggregatorRecallIsolationRuntimeProof(buildValidInput({
      status: syntheticBearerValue
    })).failClosedReasons.includes('sensitive_fragment_rejected')
  );
  assert.ok(
    evaluateValidationAggregatorRecallIsolationRuntimeProof(buildValidInput({
      realMemoryScanned: true
    })).failClosedReasons.includes('readiness_overclaim')
  );
  assert.ok(
    evaluateValidationAggregatorRecallIsolationRuntimeProof(buildValidInput({
      readiness: {
        rcReady: true
      }
    })).failClosedReasons.includes('readiness_overclaim')
  );
});

test('P66.44 helper redacts sensitive normalized output', () => {
  const syntheticBearerValue = ['Bearer', 'sk-test-value'].join(' ');
  const normalized = normalizeValidationAggregatorRecallIsolationRuntimeProofInput(buildValidInput({
    status: syntheticBearerValue
  }));

  assert.doesNotMatch(normalized.status, /Bearer|sk-test-value/);
});

test('P66.44 helper exports required constants exactly', () => {
  assert.deepEqual(PUBLIC_MCP_TOOLS, ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory']);
  assert.ok(REQUIRED_ISOLATED_RECORD_FAMILIES.includes('readiness_reports'));
  assert.ok(REQUIRED_PROOF_SURFACES.includes('candidate_cache'));
  assert.ok(REQUIRED_RUNTIME_EVIDENCE_GROUPS.includes('machine_readable_contamination_report'));
  assert.ok(REQUIRED_FAIL_CLOSED_CASES.includes('contamination_report_from_real_data_claim'));
  assert.ok(REQUIRED_DISALLOWED_WORK.includes('validate_memory_public_exposure'));
  for (const reason of [
    'isolated_record_family_drift',
    'proof_surface_drift',
    'control_case_drift',
    'runtime_evidence_not_missing',
    'readiness_overclaim'
  ]) {
    assert.ok(REQUIRED_FAIL_CLOSED_REASONS.includes(reason), reason);
  }
});
