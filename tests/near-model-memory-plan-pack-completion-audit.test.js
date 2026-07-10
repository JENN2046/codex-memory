'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  PHASE_REQUIREMENTS,
  evaluateNearModelMemoryPlanPackCompletionAudit
} = require('../src/core/NearModelMemoryPlanPackCompletionAudit');

function fullEvidence() {
  return {
    goalContractFrozen: true,
    capabilityLayerModelFrozen: true,
    nonClaimsFrozen: true,
    readmeNonClaimsPassed: true,
    hardenedExplicitToolsBypassFixed: true,
    atomicFileWriterStaleLockToctouFixed: true,
    phase1RegressionTestsPassed: true,
    testAllPassed: true,
    gateCiPassed: true,
    phase2EvidenceGatePassed: true,
    phase2ReadinessGatePassed: true,
    phase2ApprovalPacketContractPassed: true,
    phase2ReceiptBundleContractPassed: true,
    phase2ReceiptBundleReviewChainHardeningPassed: true,
    phase2ReceiptIntakePatchHardenedBundleBindingPassed: true,
    phase2ReceiptApplicationPatchPreflightPassed: true,
    phase2GovernedNativeReadObservationPassed: true,
    phase2GovernedNativeReadEvidenceApplicationPassed: true,
    phase2MachineExecutionEvidenceManifestPassed: true,
    defaultReadOnlySurfacePassed: true,
    hiddenToolsHardRejectPassed: true,
    nativeReadResponseShapeCompatibilityPassed: true,
    nativeReadReceiptSchemaCompatibilityPassed: true,
    phase2NativeTargetBindingReceiptReviewPassed: true,
    nativeTargetBindingPassed: true,
    phase2NativeReadProofReceiptReviewPassed: true,
    nativeReadProofPassed: true,
    phase2FallbackDistinctionReceiptReviewPassed: true,
    fallbackDistinctionPassed: true,
    phase2LowDisclosureProofReceiptReviewPassed: true,
    lowDisclosureProofPassed: true,
    phase2AuditScopeReceiptReviewPassed: true,
    auditReceiptPassed: true,
    scopeVisibilityIsolationPassed: true,
    phase2PlatformProofReceiptReviewPassed: true,
    wslLinuxProofPassed: true,
    windowsWslSmokePassed: true,
    phase2ReceiptBundleAppliedToCompletionAudit: true,
    prepareMemoryContextMvpPassed: true,
    prepareMemoryContextDefaultExposed: true,
    prepareMemoryContextReadOnly: true,
    prepareMemoryContextNoDurableMutation: true,
    prepareMemoryContextReusesExistingRecallStack: true,
    taskStartWorkflowPassed: true,
    agentsTaskStartRulePassed: true,
    taskbookPreflightRulePassed: true,
    recallQualityBaselinePassed: true,
    projectFactRecallPassed: true,
    decisionRecallPassed: true,
    blockerRecallPassed: true,
    userPreferenceRecallPassed: true,
    staleFilteringPassed: true,
    conflictSurfacingPassed: true,
    privateIsolationPassed: true,
    proposeMemoryDeltaProposalOnlyPassed: true,
    memoryDeltaStagingPassed: true,
    memoryDeltaValidationPassed: true,
    memoryDeltaAuditReceiptPassed: true,
    memoryDeltaRollbackPosturePassed: true,
    commitMemoryDeltaOperatorOnlyDrafted: true,
    commitMemoryDeltaOperatorPreflightPassed: true,
    commitMemoryDeltaNotPublic: true,
    defaultProductionWriteBlocked: true,
    operatorOnlyFullSurfaceProofPassed: true,
    operatorExplicitEnvPassed: true,
    exactApprovalEnforcementPassed: true,
    operatorAuditReceiptPassed: true,
    operatorRollbackPosturePassed: true,
    operatorLocalOnlyPassed: true,
    defaultSurfacePreserved: true,
    nativeWriteContractPreflightPassed: true,
    realRootWriteReadinessGatePassed: true,
    phase8ReceiptAuditIntakePassed: true,
    phase8ReceiptBundleContractPassed: true,
    phase8ReceiptPatchHardenedBundleBindingPassed: true,
    phase8ReceiptApplicationPatchPreflightPassed: true,
    nativeSideEffectReceiptPassed: true,
    realRootDurableWriteProofPassed: true,
    verifyWritePassed: true,
    rollbackDrillPassed: true,
    failureRecoveryProofPassed: true,
    outputDisclosureBudgetPassed: true,
    phase8ReceiptBundleAppliedToCompletionAudit: true,
    defaultRuntimePolicyGatePassed: true,
    defaultRuntimeReadContextProposalHeld: true,
    defaultForbiddenWriteToolsBlocked: true,
    externalReviewEvidenceIntakePassed: true,
    externalReviewEvidenceBundleContractPassed: true,
    externalReviewEvidencePatchHardenedBundleBindingPassed: true,
    externalReviewEvidenceApplicationPatchPreflightPassed: true,
    externalReviewHandoffBundlePreparedPassed: true,
    canonicalReviewBundlePassed: true,
    phase9EquivalentDogfoodObservationApplicationPassed: true,
    phase9MachineObservationArtifactPassed: true,
    observationOrDogfoodReviewPassed: true,
    externalReviewPassed: true,
    externalReviewEvidenceBundleApplicationGatePassed: true,
    externalReviewEvidenceBundleApplicationReceiptPassed: true,
    externalReviewEvidenceCompletionAuditPatchBoundaryPassed: true,
    externalReviewEvidenceBundleAppliedToCompletionAudit: true,
    defaultRuntimeExpansionNotAutomatic: true,
    releaseTagReadinessPolicyGatePassed: true,
    releaseTagExternalReviewChainBindingPassed: true,
    releaseNamingNonClaimsPassed: true,
    tagApprovalPacketPassed: true,
    actualTagReleaseDeployCutoverSeparateApprovalRequired: true,
    localMemoryRetained: true,
    sqliteShadowRetained: true,
    vectorIndexRetained: true,
    recallPipelineRetained: true,
    writeGovernanceRetained: true,
    proposeMemoryDeltaReusesLocalWriteGovernance: true,
    vcpToolBoxFinalMemoryIntelligenceOwner: true,
    codexMemoryGovernedMcpBridge: true,
    localFallbackRetained: true,
    auditContinuityRetained: true,
    validationFixturesRetained: true,
    compatibilityContinuityRetained: true,
    offlineContinuityRetained: true,
    epaResidualPyramidAdvancedTagMemoExperimentalOnly: true,
    prepareMemoryContextNotFullGoal: true,
    operatorOnlyFullSurfaceGated: true,
    nativeWriteProductionGated: true,
    releaseTagDeployCutoverGated: true,
    remainingEvidenceRouteContractPassed: true,
    phase2ExactReceiptRequestBoundaryPassed: true,
    phase8ExactReceiptRequestBoundaryPassed: true,
    externalReviewRequestBoundaryPassed: true,
    evidenceRequestPacketRollupPassed: true,
    evidenceApplicationRouterPassed: true,
    evidenceMaterialMetadataGatePassed: true,
    evidenceMaterialMetadataPacketPassed: true,
    evidenceMaterialAcceptancePreflightPassed: true,
    evidenceMaterialIntakeBoundaryPassed: true,
    evidenceMaterialManualReviewGatePassed: true,
    evidenceMaterialAcceptanceEligibilityGatePassed: true,
    evidenceMaterialAcceptanceDecisionRequestBoundaryPassed: true,
    evidenceMaterialAcceptanceDecisionPacketMetadataGatePassed: true,
    evidenceMaterialReviewedDecisionPacketReadinessGatePassed: true,
    evidenceMaterialReviewedDecisionPacketIntakePreflightPassed: true,
    evidenceMaterialReviewedDecisionPacketReferenceIntakeExecutionPassed: true,
    evidenceMaterialReviewedDecisionPacketReferenceReviewBoundaryPassed: true,
    evidenceMaterialReviewedAcceptanceDecisionBoundaryPassed: true
  };
}

function currentPostPhase1GateEvidence() {
  const evidence = fullEvidence();
  evidence.nativeReadProofPassed = false;
  evidence.nativeTargetBindingPassed = false;
  evidence.wslLinuxProofPassed = false;
  evidence.windowsWslSmokePassed = false;
  evidence.phase2ReceiptBundleAppliedToCompletionAudit = false;
  evidence.nativeSideEffectReceiptPassed = false;
  evidence.realRootDurableWriteProofPassed = false;
  evidence.verifyWritePassed = false;
  evidence.rollbackDrillPassed = false;
  evidence.failureRecoveryProofPassed = false;
  evidence.phase8ReceiptBundleAppliedToCompletionAudit = false;
  evidence.observationOrDogfoodReviewPassed = false;
  evidence.externalReviewPassed = false;
  evidence.tagApprovalPacketPassed = false;
  evidence.externalReviewEvidenceBundleAppliedToCompletionAudit = false;
  return evidence;
}

test('CM2018 audits current post-Phase-1 evidence as incomplete without claiming completion', () => {
  const result = evaluateNearModelMemoryPlanPackCompletionAudit({
    evidence: currentPostPhase1GateEvidence()
  });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.status, 'near_model_memory_plan_pack_incomplete');
  assert.equal(result.completedPhaseIds.includes('phase1_blocker_repairs'), true);
  assert.equal(result.incompletePhaseIds.includes('phase1_blocker_repairs'), false);
  assert.ok(result.incompletePhaseIds.includes('phase2_readonly_realtime_native_memory'));
  assert.ok(result.incompletePhaseIds.includes('phase8_native_write_production_proof'));
  assert.ok(result.incompletePhaseIds.includes('phase9_default_runtime_policy'));
  assert.ok(result.incompletePhaseIds.includes('phase10_tag_release_readiness'));
  assert.ok(result.blockers.includes('missing_phase2_readonly_realtime_native_memory_nativeReadProofPassed'));
  assert.ok(result.blockers.includes('missing_phase2_readonly_realtime_native_memory_phase2ReceiptBundleAppliedToCompletionAudit'));
  assert.ok(result.blockers.includes('missing_phase8_native_write_production_proof_nativeSideEffectReceiptPassed'));
  assert.ok(result.blockers.includes('missing_phase9_default_runtime_policy_observationOrDogfoodReviewPassed'));
  assert.ok(result.blockers.includes('missing_phase10_tag_release_readiness_externalReviewPassed'));
  assert.equal(result.sideEffects.nativeWriteExecuted, false);
  assert.equal(result.sideEffects.actualTagCreated, false);
  assert.equal(result.nonClaims.releaseReadyClaimed, false);
  assert.equal(result.nextGate, 'close_missing_phase_and_objective_invariant_evidence_without_readiness_claims');
});

test('CM2023 keeps Phase 2 incomplete when only local gate contracts are present', () => {
  const evidence = fullEvidence();
  evidence.nativeTargetBindingPassed = false;
  evidence.nativeReadProofPassed = false;
  evidence.fallbackDistinctionPassed = false;
  evidence.lowDisclosureProofPassed = false;
  evidence.auditReceiptPassed = false;
  evidence.scopeVisibilityIsolationPassed = false;
  evidence.wslLinuxProofPassed = false;
  evidence.windowsWslSmokePassed = false;
  evidence.phase2ReceiptBundleAppliedToCompletionAudit = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.incompletePhaseIds.includes('phase2_readonly_realtime_native_memory'));
  assert.ok(result.blockers.includes('missing_phase2_readonly_realtime_native_memory_nativeTargetBindingPassed'));
  assert.ok(result.blockers.includes('missing_phase2_readonly_realtime_native_memory_nativeReadProofPassed'));
  assert.ok(result.blockers.includes('missing_phase2_readonly_realtime_native_memory_phase2ReceiptBundleAppliedToCompletionAudit'));
  assert.equal(result.sideEffects.realMemoryRead, false);
  assert.equal(result.sideEffects.providerApiCalled, false);
  assert.equal(result.nonClaims.rcReadyClaimed, false);
});

test('CM2044 keeps Phase 2 incomplete when receipt bundle review-chain hardening is missing', () => {
  const evidence = fullEvidence();
  evidence.phase2ReceiptBundleReviewChainHardeningPassed = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.incompletePhaseIds.includes('phase2_readonly_realtime_native_memory'));
  assert.ok(!result.blockers.includes(
    'missing_phase2_readonly_realtime_native_memory_phase2ReceiptBundleContractPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase2_readonly_realtime_native_memory_phase2ReceiptBundleReviewChainHardeningPassed'
  ));
  assert.equal(result.sideEffects.realMemoryRead, false);
  assert.equal(result.sideEffects.providerApiCalled, false);
  assert.equal(result.nonClaims.rcReadyClaimed, false);
});

test('CM2045 keeps Phase 2 incomplete when receipt intake and patch hardened bundle binding is missing', () => {
  const evidence = fullEvidence();
  evidence.phase2ReceiptIntakePatchHardenedBundleBindingPassed = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.incompletePhaseIds.includes('phase2_readonly_realtime_native_memory'));
  assert.ok(!result.blockers.includes(
    'missing_phase2_readonly_realtime_native_memory_phase2ReceiptBundleReviewChainHardeningPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase2_readonly_realtime_native_memory_phase2ReceiptIntakePatchHardenedBundleBindingPassed'
  ));
  assert.equal(result.sideEffects.realMemoryRead, false);
  assert.equal(result.sideEffects.providerApiCalled, false);
  assert.equal(result.nonClaims.rcReadyClaimed, false);
});

test('CM2067 keeps full plan pack incomplete when evidence material acceptance chain binding is missing', () => {
  const evidence = fullEvidence();
  evidence.evidenceMaterialAcceptanceDecisionPacketMetadataGatePassed = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.blockers.includes(
    'missing_invariant_evidence_material_acceptance_chain_local_gates_bound_evidenceMaterialAcceptanceDecisionPacketMetadataGatePassed'
  ));
  assert.equal(result.sideEffects.realMemoryRead, false);
  assert.equal(result.sideEffects.providerApiCalled, false);
  assert.equal(result.nonClaims.rcReadyClaimed, false);
});

test('CM2068 keeps full plan pack incomplete when reviewed decision packet readiness gate is missing', () => {
  const evidence = fullEvidence();
  evidence.evidenceMaterialReviewedDecisionPacketReadinessGatePassed = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.blockers.includes(
    'missing_invariant_evidence_material_acceptance_chain_local_gates_bound_evidenceMaterialReviewedDecisionPacketReadinessGatePassed'
  ));
  assert.equal(result.sideEffects.realMemoryRead, false);
  assert.equal(result.sideEffects.providerApiCalled, false);
  assert.equal(result.nonClaims.rcReadyClaimed, false);
});

test('CM2069 keeps full plan pack incomplete when reviewed decision packet intake preflight is missing', () => {
  const evidence = fullEvidence();
  evidence.evidenceMaterialReviewedDecisionPacketIntakePreflightPassed = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.blockers.includes(
    'missing_invariant_evidence_material_acceptance_chain_local_gates_bound_evidenceMaterialReviewedDecisionPacketIntakePreflightPassed'
  ));
  assert.equal(result.sideEffects.realMemoryRead, false);
  assert.equal(result.sideEffects.providerApiCalled, false);
  assert.equal(result.nonClaims.rcReadyClaimed, false);
});

test('CM2070 keeps full plan pack incomplete when reviewed decision packet reference intake execution is missing', () => {
  const evidence = fullEvidence();
  evidence.evidenceMaterialReviewedDecisionPacketReferenceIntakeExecutionPassed = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.blockers.includes(
    'missing_invariant_evidence_material_acceptance_chain_local_gates_bound_evidenceMaterialReviewedDecisionPacketReferenceIntakeExecutionPassed'
  ));
  assert.equal(result.sideEffects.realMemoryRead, false);
  assert.equal(result.sideEffects.providerApiCalled, false);
  assert.equal(result.nonClaims.rcReadyClaimed, false);
});

test('CM2071 keeps full plan pack incomplete when reviewed decision packet reference review boundary is missing', () => {
  const evidence = fullEvidence();
  evidence.evidenceMaterialReviewedDecisionPacketReferenceReviewBoundaryPassed = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.blockers.includes(
    'missing_invariant_evidence_material_acceptance_chain_local_gates_bound_evidenceMaterialReviewedDecisionPacketReferenceReviewBoundaryPassed'
  ));
  assert.equal(result.sideEffects.realMemoryRead, false);
  assert.equal(result.sideEffects.providerApiCalled, false);
  assert.equal(result.nonClaims.rcReadyClaimed, false);
});

test('CM2035 keeps Phase 6 incomplete when operator commit preflight is missing', () => {
  const evidence = fullEvidence();
  evidence.commitMemoryDeltaOperatorPreflightPassed = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.incompletePhaseIds.includes('phase6_memory_delta_pipeline'));
  assert.ok(!result.blockers.includes(
    'missing_phase6_memory_delta_pipeline_commitMemoryDeltaOperatorOnlyDrafted'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase6_memory_delta_pipeline_commitMemoryDeltaOperatorPreflightPassed'
  ));
  assert.equal(result.sideEffects.durableMutationPerformed, false);
  assert.equal(result.sideEffects.providerApiCalled, false);
  assert.equal(result.nonClaims.productionReadyClaimed, false);
});

test('CM2036 keeps Phase 2 incomplete when native response shape compatibility is missing', () => {
  const evidence = fullEvidence();
  evidence.nativeReadResponseShapeCompatibilityPassed = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.incompletePhaseIds.includes('phase2_readonly_realtime_native_memory'));
  assert.ok(!result.blockers.includes(
    'missing_phase2_readonly_realtime_native_memory_hiddenToolsHardRejectPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase2_readonly_realtime_native_memory_nativeReadResponseShapeCompatibilityPassed'
  ));
  assert.equal(result.sideEffects.realMemoryRead, false);
  assert.equal(result.sideEffects.publicMcpExpanded, false);
  assert.equal(result.nonClaims.rcReadyClaimed, false);
});

test('CM2037 keeps Phase 2 incomplete when native read receipt schema compatibility is missing', () => {
  const evidence = fullEvidence();
  evidence.nativeReadReceiptSchemaCompatibilityPassed = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.incompletePhaseIds.includes('phase2_readonly_realtime_native_memory'));
  assert.ok(!result.blockers.includes(
    'missing_phase2_readonly_realtime_native_memory_nativeReadResponseShapeCompatibilityPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase2_readonly_realtime_native_memory_nativeReadReceiptSchemaCompatibilityPassed'
  ));
  assert.equal(result.sideEffects.realMemoryRead, false);
  assert.equal(result.sideEffects.publicMcpExpanded, false);
  assert.equal(result.nonClaims.rcReadyClaimed, false);
});

test('CM2038 keeps Phase 2 incomplete when native target binding receipt review is missing', () => {
  const evidence = fullEvidence();
  evidence.phase2NativeTargetBindingReceiptReviewPassed = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.incompletePhaseIds.includes('phase2_readonly_realtime_native_memory'));
  assert.ok(!result.blockers.includes(
    'missing_phase2_readonly_realtime_native_memory_nativeReadReceiptSchemaCompatibilityPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase2_readonly_realtime_native_memory_phase2NativeTargetBindingReceiptReviewPassed'
  ));
  assert.equal(result.sideEffects.realMemoryRead, false);
  assert.equal(result.sideEffects.publicMcpExpanded, false);
  assert.equal(result.nonClaims.rcReadyClaimed, false);
});

test('CM2039 keeps Phase 2 incomplete when native read proof receipt review is missing', () => {
  const evidence = fullEvidence();
  evidence.phase2NativeReadProofReceiptReviewPassed = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.incompletePhaseIds.includes('phase2_readonly_realtime_native_memory'));
  assert.ok(!result.blockers.includes(
    'missing_phase2_readonly_realtime_native_memory_phase2NativeTargetBindingReceiptReviewPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase2_readonly_realtime_native_memory_phase2NativeReadProofReceiptReviewPassed'
  ));
  assert.equal(result.sideEffects.realMemoryRead, false);
  assert.equal(result.sideEffects.publicMcpExpanded, false);
  assert.equal(result.nonClaims.rcReadyClaimed, false);
});

test('CM2040 keeps Phase 2 incomplete when fallback distinction receipt review is missing', () => {
  const evidence = fullEvidence();
  evidence.phase2FallbackDistinctionReceiptReviewPassed = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.incompletePhaseIds.includes('phase2_readonly_realtime_native_memory'));
  assert.ok(!result.blockers.includes(
    'missing_phase2_readonly_realtime_native_memory_phase2NativeReadProofReceiptReviewPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase2_readonly_realtime_native_memory_phase2FallbackDistinctionReceiptReviewPassed'
  ));
  assert.equal(result.sideEffects.realMemoryRead, false);
  assert.equal(result.sideEffects.publicMcpExpanded, false);
  assert.equal(result.nonClaims.rcReadyClaimed, false);
});

test('CM2041 keeps Phase 2 incomplete when low disclosure proof receipt review is missing', () => {
  const evidence = fullEvidence();
  evidence.phase2LowDisclosureProofReceiptReviewPassed = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.incompletePhaseIds.includes('phase2_readonly_realtime_native_memory'));
  assert.ok(!result.blockers.includes(
    'missing_phase2_readonly_realtime_native_memory_phase2FallbackDistinctionReceiptReviewPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase2_readonly_realtime_native_memory_phase2LowDisclosureProofReceiptReviewPassed'
  ));
  assert.equal(result.sideEffects.realMemoryRead, false);
  assert.equal(result.sideEffects.publicMcpExpanded, false);
  assert.equal(result.nonClaims.rcReadyClaimed, false);
});

test('CM2042 keeps Phase 2 incomplete when audit scope receipt review is missing', () => {
  const evidence = fullEvidence();
  evidence.phase2AuditScopeReceiptReviewPassed = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.incompletePhaseIds.includes('phase2_readonly_realtime_native_memory'));
  assert.ok(!result.blockers.includes(
    'missing_phase2_readonly_realtime_native_memory_phase2LowDisclosureProofReceiptReviewPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase2_readonly_realtime_native_memory_phase2AuditScopeReceiptReviewPassed'
  ));
  assert.equal(result.sideEffects.realMemoryRead, false);
  assert.equal(result.sideEffects.publicMcpExpanded, false);
  assert.equal(result.nonClaims.rcReadyClaimed, false);
});

test('CM2043 keeps Phase 2 incomplete when platform proof receipt review is missing', () => {
  const evidence = fullEvidence();
  evidence.phase2PlatformProofReceiptReviewPassed = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.incompletePhaseIds.includes('phase2_readonly_realtime_native_memory'));
  assert.ok(!result.blockers.includes(
    'missing_phase2_readonly_realtime_native_memory_phase2AuditScopeReceiptReviewPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase2_readonly_realtime_native_memory_phase2PlatformProofReceiptReviewPassed'
  ));
  assert.equal(result.sideEffects.realMemoryRead, false);
  assert.equal(result.sideEffects.publicMcpExpanded, false);
  assert.equal(result.nonClaims.rcReadyClaimed, false);
});

test('CM2031 keeps Phase 2 incomplete when exact receipts exist but receipt application patch is missing', () => {
  const evidence = fullEvidence();
  evidence.phase2ReceiptBundleAppliedToCompletionAudit = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.incompletePhaseIds.includes('phase2_readonly_realtime_native_memory'));
  assert.ok(!result.blockers.includes(
    'missing_phase2_readonly_realtime_native_memory_phase2ReceiptApplicationPatchPreflightPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase2_readonly_realtime_native_memory_phase2ReceiptBundleAppliedToCompletionAudit'
  ));
  assert.equal(result.sideEffects.realMemoryRead, false);
  assert.equal(result.sideEffects.providerApiCalled, false);
  assert.equal(result.nonClaims.rcReadyClaimed, false);
});

test('CM2029 keeps Phase 8 incomplete when receipt bundle contract exists but exact write receipts are missing', () => {
  const evidence = fullEvidence();
  evidence.nativeSideEffectReceiptPassed = false;
  evidence.realRootDurableWriteProofPassed = false;
  evidence.verifyWritePassed = false;
  evidence.rollbackDrillPassed = false;
  evidence.failureRecoveryProofPassed = false;
  evidence.outputDisclosureBudgetPassed = false;
  evidence.auditReceiptPassed = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.incompletePhaseIds.includes('phase8_native_write_production_proof'));
  assert.ok(!result.blockers.includes(
    'missing_phase8_native_write_production_proof_phase8ReceiptAuditIntakePassed'
  ));
  assert.ok(!result.blockers.includes(
    'missing_phase8_native_write_production_proof_phase8ReceiptBundleContractPassed'
  ));
  assert.ok(!result.blockers.includes(
    'missing_phase8_native_write_production_proof_phase8ReceiptApplicationPatchPreflightPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase8_native_write_production_proof_nativeSideEffectReceiptPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase8_native_write_production_proof_realRootDurableWriteProofPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase8_native_write_production_proof_rollbackDrillPassed'
  ));
  assert.equal(result.sideEffects.nativeWriteExecuted, false);
  assert.equal(result.sideEffects.durableMutationPerformed, false);
  assert.equal(result.nonClaims.productionReadyClaimed, false);
});

test('CM2032 keeps Phase 9 and Phase 10 incomplete when review intake exists but review evidence is missing', () => {
  const evidence = fullEvidence();
  evidence.observationOrDogfoodReviewPassed = false;
  evidence.externalReviewPassed = false;
  evidence.tagApprovalPacketPassed = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.incompletePhaseIds.includes('phase9_default_runtime_policy'));
  assert.ok(result.incompletePhaseIds.includes('phase10_tag_release_readiness'));
  assert.ok(!result.blockers.includes(
    'missing_phase9_default_runtime_policy_externalReviewEvidenceIntakePassed'
  ));
  assert.ok(!result.blockers.includes(
    'missing_phase10_tag_release_readiness_externalReviewEvidenceIntakePassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase9_default_runtime_policy_observationOrDogfoodReviewPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase9_default_runtime_policy_externalReviewPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase10_tag_release_readiness_tagApprovalPacketPassed'
  ));
  assert.equal(result.sideEffects.publicMcpExpanded, false);
  assert.equal(result.sideEffects.releasePublished, false);
  assert.equal(result.nonClaims.releaseReadyClaimed, false);
});

test('CM2033 keeps Phase 9 and Phase 10 incomplete when review bundle contract exists but review evidence is missing', () => {
  const evidence = fullEvidence();
  evidence.observationOrDogfoodReviewPassed = false;
  evidence.externalReviewPassed = false;
  evidence.tagApprovalPacketPassed = false;
  evidence.externalReviewEvidenceBundleAppliedToCompletionAudit = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.incompletePhaseIds.includes('phase9_default_runtime_policy'));
  assert.ok(result.incompletePhaseIds.includes('phase10_tag_release_readiness'));
  assert.ok(!result.blockers.includes(
    'missing_phase9_default_runtime_policy_externalReviewEvidenceBundleContractPassed'
  ));
  assert.ok(!result.blockers.includes(
    'missing_phase10_tag_release_readiness_externalReviewEvidenceBundleContractPassed'
  ));
  assert.ok(!result.blockers.includes(
    'missing_phase9_default_runtime_policy_externalReviewEvidenceApplicationPatchPreflightPassed'
  ));
  assert.ok(!result.blockers.includes(
    'missing_phase10_tag_release_readiness_externalReviewEvidenceApplicationPatchPreflightPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase9_default_runtime_policy_observationOrDogfoodReviewPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase10_tag_release_readiness_externalReviewPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase10_tag_release_readiness_tagApprovalPacketPassed'
  ));
  assert.equal(result.sideEffects.publicMcpExpanded, false);
  assert.equal(result.sideEffects.releasePublished, false);
  assert.equal(result.nonClaims.releaseReadyClaimed, false);
});

test('CM2034 keeps Phase 9 and Phase 10 incomplete when review evidence exists but application patch is missing', () => {
  const evidence = fullEvidence();
  evidence.externalReviewEvidenceBundleAppliedToCompletionAudit = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.incompletePhaseIds.includes('phase9_default_runtime_policy'));
  assert.ok(result.incompletePhaseIds.includes('phase10_tag_release_readiness'));
  assert.ok(!result.blockers.includes(
    'missing_phase9_default_runtime_policy_externalReviewEvidenceApplicationPatchPreflightPassed'
  ));
  assert.ok(!result.blockers.includes(
    'missing_phase10_tag_release_readiness_externalReviewEvidenceApplicationPatchPreflightPassed'
  ));
  assert.ok(!result.blockers.includes(
    'missing_phase9_default_runtime_policy_observationOrDogfoodReviewPassed'
  ));
  assert.ok(!result.blockers.includes(
    'missing_phase10_tag_release_readiness_tagApprovalPacketPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase9_default_runtime_policy_externalReviewEvidenceBundleAppliedToCompletionAudit'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase10_tag_release_readiness_externalReviewEvidenceBundleAppliedToCompletionAudit'
  ));
  assert.equal(result.sideEffects.publicMcpExpanded, false);
  assert.equal(result.sideEffects.releasePublished, false);
  assert.equal(result.nonClaims.releaseReadyClaimed, false);
});

test('CM2047 keeps Phase 9 and Phase 10 incomplete when external review patch hardened bundle binding is missing', () => {
  const evidence = fullEvidence();
  evidence.externalReviewEvidencePatchHardenedBundleBindingPassed = false;
  evidence.externalReviewEvidenceBundleAppliedToCompletionAudit = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.incompletePhaseIds.includes('phase9_default_runtime_policy'));
  assert.ok(result.incompletePhaseIds.includes('phase10_tag_release_readiness'));
  assert.ok(result.blockers.includes(
    'missing_phase9_default_runtime_policy_externalReviewEvidencePatchHardenedBundleBindingPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase10_tag_release_readiness_externalReviewEvidencePatchHardenedBundleBindingPassed'
  ));
  assert.equal(result.sideEffects.publicMcpExpanded, false);
  assert.equal(result.sideEffects.durableMutationPerformed, false);
  assert.equal(result.nonClaims.releaseReadyClaimed, false);
});

test('CM2048 keeps Phase 10 incomplete when release tag gate external review chain binding is missing', () => {
  const evidence = fullEvidence();
  evidence.releaseTagExternalReviewChainBindingPassed = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.incompletePhaseIds.includes('phase10_tag_release_readiness'));
  assert.ok(!result.blockers.includes(
    'missing_phase10_tag_release_readiness_releaseTagReadinessPolicyGatePassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase10_tag_release_readiness_releaseTagExternalReviewChainBindingPassed'
  ));
  assert.equal(result.sideEffects.actualTagCreated, false);
  assert.equal(result.sideEffects.releasePublished, false);
  assert.equal(result.nonClaims.releaseReadyClaimed, false);
});

test('CM2049 keeps Phase 9 and Phase 10 incomplete when external review bundle application gate is missing', () => {
  const evidence = fullEvidence();
  evidence.externalReviewEvidenceBundleApplicationGatePassed = false;
  evidence.externalReviewEvidenceBundleAppliedToCompletionAudit = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.incompletePhaseIds.includes('phase9_default_runtime_policy'));
  assert.ok(result.incompletePhaseIds.includes('phase10_tag_release_readiness'));
  assert.ok(!result.blockers.includes(
    'missing_phase9_default_runtime_policy_externalReviewEvidenceApplicationPatchPreflightPassed'
  ));
  assert.ok(!result.blockers.includes(
    'missing_phase10_tag_release_readiness_releaseTagExternalReviewChainBindingPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase9_default_runtime_policy_externalReviewEvidenceBundleApplicationGatePassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase10_tag_release_readiness_externalReviewEvidenceBundleApplicationGatePassed'
  ));
  assert.equal(result.sideEffects.publicMcpExpanded, false);
  assert.equal(result.sideEffects.releasePublished, false);
  assert.equal(result.nonClaims.releaseReadyClaimed, false);
});

test('CM2050 keeps Phase 9 and Phase 10 incomplete when external review bundle application receipt is missing', () => {
  const evidence = fullEvidence();
  evidence.externalReviewEvidenceBundleApplicationReceiptPassed = false;
  evidence.externalReviewEvidenceBundleAppliedToCompletionAudit = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.incompletePhaseIds.includes('phase9_default_runtime_policy'));
  assert.ok(result.incompletePhaseIds.includes('phase10_tag_release_readiness'));
  assert.ok(!result.blockers.includes(
    'missing_phase9_default_runtime_policy_externalReviewEvidenceBundleApplicationGatePassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase9_default_runtime_policy_externalReviewEvidenceBundleApplicationReceiptPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase10_tag_release_readiness_externalReviewEvidenceBundleApplicationReceiptPassed'
  ));
  assert.equal(result.sideEffects.publicMcpExpanded, false);
  assert.equal(result.sideEffects.releasePublished, false);
  assert.equal(result.nonClaims.releaseReadyClaimed, false);
});

test('CM2051 keeps Phase 9 and Phase 10 incomplete when completion audit patch boundary is missing', () => {
  const evidence = fullEvidence();
  evidence.externalReviewEvidenceCompletionAuditPatchBoundaryPassed = false;
  evidence.externalReviewEvidenceBundleAppliedToCompletionAudit = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.incompletePhaseIds.includes('phase9_default_runtime_policy'));
  assert.ok(result.incompletePhaseIds.includes('phase10_tag_release_readiness'));
  assert.ok(!result.blockers.includes(
    'missing_phase9_default_runtime_policy_externalReviewEvidenceBundleApplicationReceiptPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase9_default_runtime_policy_externalReviewEvidenceCompletionAuditPatchBoundaryPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase10_tag_release_readiness_externalReviewEvidenceCompletionAuditPatchBoundaryPassed'
  ));
  assert.equal(result.sideEffects.publicMcpExpanded, false);
  assert.equal(result.sideEffects.releasePublished, false);
  assert.equal(result.nonClaims.releaseReadyClaimed, false);
});

test('CM2052 keeps Phase 9 and Phase 10 incomplete when patch application lacks external review evidence', () => {
  const evidence = fullEvidence();
  evidence.observationOrDogfoodReviewPassed = false;
  evidence.externalReviewPassed = false;
  evidence.tagApprovalPacketPassed = false;
  evidence.externalReviewEvidenceBundleAppliedToCompletionAudit = true;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.incompletePhaseIds.includes('phase9_default_runtime_policy'));
  assert.ok(result.incompletePhaseIds.includes('phase10_tag_release_readiness'));
  assert.ok(!result.blockers.includes(
    'missing_phase9_default_runtime_policy_externalReviewEvidenceBundleAppliedToCompletionAudit'
  ));
  assert.ok(!result.blockers.includes(
    'missing_phase10_tag_release_readiness_externalReviewEvidenceBundleAppliedToCompletionAudit'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase9_default_runtime_policy_observationOrDogfoodReviewPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase9_default_runtime_policy_externalReviewPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase10_tag_release_readiness_externalReviewPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase10_tag_release_readiness_tagApprovalPacketPassed'
  ));
  assert.equal(result.sideEffects.publicMcpExpanded, false);
  assert.equal(result.sideEffects.releasePublished, false);
  assert.equal(result.nonClaims.releaseReadyClaimed, false);
});

test('CM2030 keeps Phase 8 incomplete when exact receipts exist but receipt application patch is missing', () => {
  const evidence = fullEvidence();
  evidence.phase8ReceiptBundleAppliedToCompletionAudit = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.incompletePhaseIds.includes('phase8_native_write_production_proof'));
  assert.ok(result.blockers.includes(
    'missing_phase8_native_write_production_proof_phase8ReceiptBundleAppliedToCompletionAudit'
  ));
  assert.ok(!result.blockers.includes(
    'missing_phase8_native_write_production_proof_phase8ReceiptApplicationPatchPreflightPassed'
  ));
  assert.equal(result.sideEffects.nativeWriteExecuted, false);
  assert.equal(result.sideEffects.durableMutationPerformed, false);
  assert.equal(result.nonClaims.productionReadyClaimed, false);
  assert.equal(result.nonClaims.releaseReadyClaimed, false);
});

test('CM2046 keeps Phase 8 incomplete when receipt patch hardened bundle binding is missing', () => {
  const evidence = fullEvidence();
  evidence.phase8ReceiptPatchHardenedBundleBindingPassed = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.ok(result.incompletePhaseIds.includes('phase8_native_write_production_proof'));
  assert.ok(!result.blockers.includes(
    'missing_phase8_native_write_production_proof_phase8ReceiptBundleContractPassed'
  ));
  assert.ok(result.blockers.includes(
    'missing_phase8_native_write_production_proof_phase8ReceiptPatchHardenedBundleBindingPassed'
  ));
  assert.equal(result.sideEffects.durableMutationPerformed, false);
  assert.equal(result.sideEffects.providerApiCalled, false);
  assert.equal(result.nonClaims.rcReadyClaimed, false);
});

test('CM2017 accepts only when all phase and objective invariant evidence is present', () => {
  const result = evaluateNearModelMemoryPlanPackCompletionAudit({
    evidence: fullEvidence()
  });

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.fullPlanPackCompleted, true);
  assert.equal(result.status, 'near_model_memory_plan_pack_completion_audit_accepted');
  assert.deepEqual(result.incompletePhaseIds, []);
  assert.equal(result.sideEffects.durableMutationPerformed, false);
  assert.equal(result.sideEffects.releasePublished, false);
  assert.equal(result.sideEffects.publicMcpExpanded, false);
  assert.equal(result.nonClaims.modelMemoryCompleteClaimed, false);
  assert.equal(result.boundaries.vcpToolBoxRole, 'final_memory_intelligence_owner');
});

test('CM2017 fails objective invariants when ownership or retained local substrates drift', () => {
  const evidence = fullEvidence();
  evidence.vcpToolBoxFinalMemoryIntelligenceOwner = false;
  evidence.sqliteShadowRetained = false;
  evidence.epaResidualPyramidAdvancedTagMemoExperimentalOnly = false;

  const result = evaluateNearModelMemoryPlanPackCompletionAudit({ evidence });

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes(
    'missing_invariant_vcptoolbox_final_memory_intelligence_owner_vcpToolBoxFinalMemoryIntelligenceOwner'
  ));
  assert.ok(result.blockers.includes(
    'missing_invariant_sqlite_shadow_retained_sqliteShadowRetained'
  ));
  assert.ok(result.blockers.includes(
    'missing_invariant_advanced_recall_heuristics_experimental_only_epaResidualPyramidAdvancedTagMemoExperimentalOnly'
  ));
});

test('CM2017 stops L4 on runtime write tag release deploy or readiness claims', () => {
  const result = evaluateNearModelMemoryPlanPackCompletionAudit({
    evidence: fullEvidence(),
    request: {
      nativeWriteExecuted: true,
      actualTagCreated: true,
      releaseReadyClaimed: true,
      fullPlanPackCompletedClaimed: true
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.status, 'near_model_memory_plan_pack_completion_audit_stop_l4');
  assert.ok(result.stopReasons.includes('stop_l4_flag_request.nativeWriteExecuted'));
  assert.ok(result.stopReasons.includes('stop_l4_flag_request.actualTagCreated'));
  assert.ok(result.stopReasons.includes('stop_l4_flag_request.releaseReadyClaimed'));
  assert.ok(result.stopReasons.includes('stop_l4_flag_request.fullPlanPackCompletedClaimed'));
  assert.equal(result.sideEffects.nativeWriteExecuted, false);
  assert.equal(result.sideEffects.releasePublished, false);
  assert.equal(result.nextGate, 'stop_before_runtime_write_release_or_readiness_boundary');
});

test('CM2017 rejects raw secret or locator-shaped fields by path without echoing values', () => {
  const result = evaluateNearModelMemoryPlanPackCompletionAudit({
    evidence: {
      ...fullEvidence(),
      rawResponseBody: 'ECHO_GUARD_A',
      nested: {
        endpointLocator: 'ECHO_GUARD_B'
      }
    },
    request: {
      reviewerToken: 'ECHO_GUARD_C'
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.status, 'near_model_memory_plan_pack_completion_audit_stop_l4');
  assert.ok(result.stopReasons.includes('forbidden_input_field_evidence.rawResponseBody'));
  assert.ok(result.stopReasons.includes('forbidden_input_field_evidence.nested.endpointLocator'));
  assert.ok(result.stopReasons.includes('forbidden_input_field_request.reviewerToken'));
  assert.equal(serialized.includes('ECHO_GUARD_A'), false);
  assert.equal(serialized.includes('ECHO_GUARD_B'), false);
  assert.equal(serialized.includes('ECHO_GUARD_C'), false);
});

test('CM2017 exposes audit coverage for all plan-pack phases', () => {
  const result = evaluateNearModelMemoryPlanPackCompletionAudit({
    evidence: {}
  });
  const phaseIds = result.phaseResults.map(phase => phase.id);

  assert.deepEqual(phaseIds, PHASE_REQUIREMENTS.map(phase => phase.id));
  assert.equal(phaseIds.length, 11);
  assert.equal(new Set(phaseIds).size, 11);
  assert.equal(result.completedPhaseIds.length, 0);
  assert.equal(result.incompletePhaseIds.length, 11);
});
