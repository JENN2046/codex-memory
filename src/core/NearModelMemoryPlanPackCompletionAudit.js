'use strict';

const PHASE_REQUIREMENTS = Object.freeze([
  Object.freeze({
    id: 'phase0_goal_contract_non_claims',
    title: 'Phase 0 goal contract and non-claims',
    requiredEvidence: Object.freeze([
      'goalContractFrozen',
      'capabilityLayerModelFrozen',
      'nonClaimsFrozen',
      'readmeNonClaimsPassed'
    ])
  }),
  Object.freeze({
    id: 'phase1_blocker_repairs',
    title: 'Phase 1 blocker repairs',
    requiredEvidence: Object.freeze([
      'hardenedExplicitToolsBypassFixed',
      'atomicFileWriterStaleLockToctouFixed',
      'phase1RegressionTestsPassed',
      'testAllPassed',
      'gateCiPassed'
    ])
  }),
  Object.freeze({
    id: 'phase2_readonly_realtime_native_memory',
    title: 'Phase 2 read-only realtime native memory',
    requiredEvidence: Object.freeze([
      'phase2EvidenceGatePassed',
      'phase2ReadinessGatePassed',
      'phase2ApprovalPacketContractPassed',
      'phase2ReceiptBundleContractPassed',
      'phase2ReceiptBundleReviewChainHardeningPassed',
      'phase2ReceiptIntakePatchHardenedBundleBindingPassed',
      'phase2ReceiptApplicationPatchPreflightPassed',
      'phase2GovernedNativeReadObservationPassed',
      'phase2GovernedNativeReadEvidenceApplicationPassed',
      'phase2MachineExecutionEvidenceManifestPassed',
      'defaultReadOnlySurfacePassed',
      'hiddenToolsHardRejectPassed',
      'nativeReadResponseShapeCompatibilityPassed',
      'nativeReadReceiptSchemaCompatibilityPassed',
      'phase2NativeTargetBindingReceiptReviewPassed',
      'nativeTargetBindingPassed',
      'phase2NativeReadProofReceiptReviewPassed',
      'nativeReadProofPassed',
      'phase2FallbackDistinctionReceiptReviewPassed',
      'fallbackDistinctionPassed',
      'phase2LowDisclosureProofReceiptReviewPassed',
      'lowDisclosureProofPassed',
      'phase2AuditScopeReceiptReviewPassed',
      'auditReceiptPassed',
      'scopeVisibilityIsolationPassed',
      'phase2PlatformProofReceiptReviewPassed',
      'wslLinuxProofPassed',
      'windowsWslSmokePassed',
      'phase2ReceiptBundleAppliedToCompletionAudit'
    ])
  }),
  Object.freeze({
    id: 'phase3_memory_context_package_mvp',
    title: 'Phase 3 memory context package MVP',
    requiredEvidence: Object.freeze([
      'prepareMemoryContextMvpPassed',
      'prepareMemoryContextDefaultExposed',
      'prepareMemoryContextReadOnly',
      'prepareMemoryContextNoDurableMutation',
      'prepareMemoryContextReusesExistingRecallStack'
    ])
  }),
  Object.freeze({
    id: 'phase4_codex_workflow_integration',
    title: 'Phase 4 Codex workflow integration',
    requiredEvidence: Object.freeze([
      'taskStartWorkflowPassed',
      'agentsTaskStartRulePassed',
      'taskbookPreflightRulePassed'
    ])
  }),
  Object.freeze({
    id: 'phase5_recall_quality_gate',
    title: 'Phase 5 recall quality gate',
    requiredEvidence: Object.freeze([
      'recallQualityBaselinePassed',
      'projectFactRecallPassed',
      'decisionRecallPassed',
      'blockerRecallPassed',
      'userPreferenceRecallPassed',
      'staleFilteringPassed',
      'conflictSurfacingPassed',
      'privateIsolationPassed',
      'fallbackDistinctionPassed'
    ])
  }),
  Object.freeze({
    id: 'phase6_memory_delta_pipeline',
    title: 'Phase 6 memory delta pipeline',
    requiredEvidence: Object.freeze([
      'proposeMemoryDeltaProposalOnlyPassed',
      'memoryDeltaStagingPassed',
      'memoryDeltaValidationPassed',
      'memoryDeltaAuditReceiptPassed',
      'memoryDeltaRollbackPosturePassed',
      'commitMemoryDeltaOperatorOnlyDrafted',
      'commitMemoryDeltaOperatorPreflightPassed',
      'commitMemoryDeltaNotPublic',
      'defaultProductionWriteBlocked'
    ])
  }),
  Object.freeze({
    id: 'phase7_operator_full_surface',
    title: 'Phase 7 operator-only full surface',
    requiredEvidence: Object.freeze([
      'operatorOnlyFullSurfaceProofPassed',
      'operatorExplicitEnvPassed',
      'exactApprovalEnforcementPassed',
      'operatorAuditReceiptPassed',
      'operatorRollbackPosturePassed',
      'operatorLocalOnlyPassed',
      'defaultSurfacePreserved'
    ])
  }),
  Object.freeze({
    id: 'phase8_native_write_production_proof',
    title: 'Phase 8 native write production proof',
    requiredEvidence: Object.freeze([
      'nativeWriteContractPreflightPassed',
      'realRootWriteReadinessGatePassed',
      'phase8ReceiptAuditIntakePassed',
      'phase8ReceiptBundleContractPassed',
      'phase8ReceiptPatchHardenedBundleBindingPassed',
      'phase8ReceiptApplicationPatchPreflightPassed',
      'exactApprovalEnforcementPassed',
      'nativeSideEffectReceiptPassed',
      'realRootDurableWriteProofPassed',
      'vcpToolBoxOwnedRuntimeWritePassed',
      'actualTransportBindingPassed',
      'stableTargetStoreIdentityPassed',
      'verifyWritePassed',
      'rollbackDrillPassed',
      'failureRecoveryProofPassed',
      'outputDisclosureBudgetPassed',
      'auditReceiptPassed',
      'phase8ReceiptBundleAppliedToCompletionAudit'
    ])
  }),
  Object.freeze({
    id: 'phase9_default_runtime_policy',
    title: 'Phase 9 default runtime policy',
    requiredEvidence: Object.freeze([
      'defaultRuntimePolicyGatePassed',
      'defaultRuntimeReadContextProposalHeld',
      'defaultForbiddenWriteToolsBlocked',
      'externalReviewEvidenceIntakePassed',
      'externalReviewEvidenceBundleContractPassed',
      'externalReviewEvidencePatchHardenedBundleBindingPassed',
      'externalReviewEvidenceApplicationPatchPreflightPassed',
      'externalReviewHandoffBundlePreparedPassed',
      'canonicalReviewBundlePassed',
      'phase9EquivalentDogfoodObservationApplicationPassed',
      'phase9MachineObservationArtifactPassed',
      'observationOrDogfoodReviewPassed',
      'externalReviewPassed',
      'externalReviewEvidenceBundleApplicationGatePassed',
      'externalReviewEvidenceBundleApplicationReceiptPassed',
      'externalReviewEvidenceCompletionAuditPatchBoundaryPassed',
      'externalReviewEvidenceBundleAppliedToCompletionAudit',
      'defaultRuntimeExpansionNotAutomatic'
    ])
  }),
  Object.freeze({
    id: 'phase10_tag_release_readiness',
    title: 'Phase 10 tag and release readiness',
    requiredEvidence: Object.freeze([
      'releaseTagReadinessPolicyGatePassed',
      'releaseTagExternalReviewChainBindingPassed',
      'releaseNamingNonClaimsPassed',
      'externalReviewEvidenceIntakePassed',
      'externalReviewEvidenceBundleContractPassed',
      'externalReviewEvidencePatchHardenedBundleBindingPassed',
      'externalReviewEvidenceApplicationPatchPreflightPassed',
      'externalReviewHandoffBundlePreparedPassed',
      'canonicalReviewBundlePassed',
      'externalReviewPassed',
      'tagApprovalPacketPassed',
      'externalReviewEvidenceBundleApplicationGatePassed',
      'externalReviewEvidenceBundleApplicationReceiptPassed',
      'externalReviewEvidenceCompletionAuditPatchBoundaryPassed',
      'externalReviewEvidenceBundleAppliedToCompletionAudit',
      'actualTagReleaseDeployCutoverSeparateApprovalRequired'
    ])
  })
]);

const OBJECTIVE_INVARIANTS = Object.freeze([
  Object.freeze({
    id: 'local_memory_retained',
    requiredEvidence: Object.freeze(['localMemoryRetained'])
  }),
  Object.freeze({
    id: 'sqlite_shadow_retained',
    requiredEvidence: Object.freeze(['sqliteShadowRetained'])
  }),
  Object.freeze({
    id: 'vector_index_retained',
    requiredEvidence: Object.freeze(['vectorIndexRetained'])
  }),
  Object.freeze({
    id: 'recall_pipeline_retained_and_reused',
    requiredEvidence: Object.freeze(['recallPipelineRetained', 'prepareMemoryContextReusesExistingRecallStack'])
  }),
  Object.freeze({
    id: 'write_governance_retained_and_reused',
    requiredEvidence: Object.freeze(['writeGovernanceRetained', 'proposeMemoryDeltaReusesLocalWriteGovernance'])
  }),
  Object.freeze({
    id: 'vcptoolbox_final_memory_intelligence_owner',
    requiredEvidence: Object.freeze(['vcpToolBoxFinalMemoryIntelligenceOwner'])
  }),
  Object.freeze({
    id: 'codex_memory_governed_bridge_with_fallback_audit_fixtures_compat_offline',
    requiredEvidence: Object.freeze([
      'codexMemoryGovernedMcpBridge',
      'localFallbackRetained',
      'auditContinuityRetained',
      'validationFixturesRetained',
      'compatibilityContinuityRetained',
      'offlineContinuityRetained'
    ])
  }),
  Object.freeze({
    id: 'advanced_recall_heuristics_experimental_only',
    requiredEvidence: Object.freeze(['epaResidualPyramidAdvancedTagMemoExperimentalOnly'])
  }),
  Object.freeze({
    id: 'prepare_context_milestone_not_full_goal',
    requiredEvidence: Object.freeze(['prepareMemoryContextNotFullGoal'])
  }),
  Object.freeze({
    id: 'memory_delta_not_default_production_write',
    requiredEvidence: Object.freeze(['proposeMemoryDeltaProposalOnlyPassed', 'defaultProductionWriteBlocked'])
  }),
  Object.freeze({
    id: 'default_runtime_read_context_proposal_only',
    requiredEvidence: Object.freeze(['defaultRuntimeReadContextProposalHeld'])
  }),
  Object.freeze({
    id: 'operator_native_release_boundaries_gated',
    requiredEvidence: Object.freeze([
      'operatorOnlyFullSurfaceGated',
      'nativeWriteProductionGated',
      'releaseTagDeployCutoverGated'
    ])
  }),
  Object.freeze({
    id: 'evidence_material_acceptance_chain_local_gates_bound',
    requiredEvidence: Object.freeze([
      'remainingEvidenceRouteContractPassed',
      'phase2ExactReceiptRequestBoundaryPassed',
      'phase8ExactReceiptRequestBoundaryPassed',
      'externalReviewRequestBoundaryPassed',
      'evidenceRequestPacketRollupPassed',
      'evidenceApplicationRouterPassed',
      'evidenceMaterialMetadataGatePassed',
      'evidenceMaterialMetadataPacketPassed',
      'evidenceMaterialAcceptancePreflightPassed',
      'evidenceMaterialIntakeBoundaryPassed',
      'evidenceMaterialManualReviewGatePassed',
      'evidenceMaterialAcceptanceEligibilityGatePassed',
      'evidenceMaterialAcceptanceDecisionRequestBoundaryPassed',
      'evidenceMaterialAcceptanceDecisionPacketMetadataGatePassed',
      'evidenceMaterialReviewedDecisionPacketReadinessGatePassed',
      'evidenceMaterialReviewedDecisionPacketIntakePreflightPassed',
      'evidenceMaterialReviewedDecisionPacketReferenceIntakeExecutionPassed',
      'evidenceMaterialReviewedDecisionPacketReferenceReviewBoundaryPassed',
      'evidenceMaterialReviewedAcceptanceDecisionBoundaryPassed'
    ])
  })
]);

const STOP_L4_FLAG_KEYS = Object.freeze([
  'actualTagCreated',
  'actualTagPushed',
  'releasePublished',
  'deploymentTriggered',
  'cutoverPerformed',
  'runtimeWriteExecuted',
  'nativeWriteExecuted',
  'durableMutationPerformed',
  'providerApiCalled',
  'publicMcpExpanded',
  'defaultRuntimeExpanded',
  'readinessClaimed',
  'productionReadyClaimed',
  'releaseReadyClaimed',
  'deployReadyClaimed',
  'cutoverReadyClaimed',
  'rcReadyClaimed',
  'fullPlanPackCompletedClaimed',
  'modelMemoryCompleteClaimed',
  'completeRealtimeMemoryClaimed'
]);

const FORBIDDEN_INPUT_KEY_PATTERNS = Object.freeze([
  /raw/i,
  /secret/i,
  /token/i,
  /bearer/i,
  /credential/i,
  /private.*memory/i,
  /endpoint/i,
  /locator/i,
  /request.*body/i,
  /response.*body/i,
  /approval.*line/i
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sortedUnique(values = []) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map(value => String(value || '').trim())
    .filter(Boolean))].sort();
}

function hasForbiddenInputKey(key) {
  return FORBIDDEN_INPUT_KEY_PATTERNS.some(pattern => pattern.test(String(key || '')));
}

function collectForbiddenInputPaths(value, path = []) {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectForbiddenInputPaths(item, [...path, `[${index}]`]));
  }
  if (!isPlainObject(value)) {
    return [];
  }

  const paths = [];
  for (const [key, child] of Object.entries(value)) {
    const nextPath = [...path, key];
    if (hasForbiddenInputKey(key)) {
      paths.push(nextPath.join('.'));
      continue;
    }
    paths.push(...collectForbiddenInputPaths(child, nextPath));
  }
  return sortedUnique(paths);
}

function collectEnabledStopFlags(value, path = []) {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectEnabledStopFlags(item, [...path, `[${index}]`]));
  }
  if (!isPlainObject(value)) {
    return [];
  }

  const flags = [];
  for (const [key, child] of Object.entries(value)) {
    const nextPath = [...path, key];
    if (STOP_L4_FLAG_KEYS.includes(key) && child === true) {
      flags.push(nextPath.join('.'));
      continue;
    }
    flags.push(...collectEnabledStopFlags(child, nextPath));
  }
  return sortedUnique(flags);
}

function missingEvidence(requiredEvidence, evidence) {
  const safeEvidence = isPlainObject(evidence) ? evidence : {};
  return requiredEvidence.filter(field => safeEvidence[field] !== true);
}

function evaluateRequirementGroup(group, evidence) {
  const missing = missingEvidence(group.requiredEvidence, evidence);
  return {
    id: group.id,
    title: group.title || group.id,
    accepted: missing.length === 0,
    requiredEvidence: [...group.requiredEvidence],
    missingEvidence: missing
  };
}

function evaluateNearModelMemoryPlanPackCompletionAudit({
  evidence = {},
  request = {}
} = {}) {
  const phaseResults = PHASE_REQUIREMENTS
    .map(phase => evaluateRequirementGroup(phase, evidence));
  const invariantResults = OBJECTIVE_INVARIANTS
    .map(invariant => evaluateRequirementGroup(invariant, evidence));

  const forbiddenInputPaths = sortedUnique([
    ...collectForbiddenInputPaths(evidence, ['evidence']),
    ...collectForbiddenInputPaths(request, ['request'])
  ]);
  const enabledStopFlags = sortedUnique([
    ...collectEnabledStopFlags(evidence, ['evidence']),
    ...collectEnabledStopFlags(request, ['request'])
  ]);

  const stopReasons = sortedUnique([
    ...forbiddenInputPaths.map(path => `forbidden_input_field_${path}`),
    ...enabledStopFlags.map(path => `stop_l4_flag_${path}`)
  ]);
  const blockers = sortedUnique([
    ...phaseResults
      .filter(phase => !phase.accepted)
      .flatMap(phase => phase.missingEvidence.map(field => `missing_${phase.id}_${field}`)),
    ...invariantResults
      .filter(invariant => !invariant.accepted)
      .flatMap(invariant => invariant.missingEvidence.map(field => `missing_invariant_${invariant.id}_${field}`))
  ]);

  const stopped = stopReasons.length > 0;
  const accepted = !stopped && blockers.length === 0;

  return {
    schemaVersion: 'near_model_memory_plan_pack_completion_audit_v1',
    accepted,
    fullPlanPackCompleted: accepted,
    status: stopped
      ? 'near_model_memory_plan_pack_completion_audit_stop_l4'
      : accepted
        ? 'near_model_memory_plan_pack_completion_audit_accepted'
        : 'near_model_memory_plan_pack_incomplete',
    completedPhaseIds: phaseResults
      .filter(phase => phase.accepted)
      .map(phase => phase.id),
    incompletePhaseIds: phaseResults
      .filter(phase => !phase.accepted)
      .map(phase => phase.id),
    phaseResults,
    objectiveInvariants: invariantResults,
    blockers,
    stopReasons,
    nonClaims: {
      productionReadyClaimed: false,
      releaseReadyClaimed: false,
      deployReadyClaimed: false,
      cutoverReadyClaimed: false,
      rcReadyClaimed: false,
      modelMemoryCompleteClaimed: false,
      fullRealtimeMemoryClaimed: false,
      codexMemoryIntelligenceOwnerClaimed: false
    },
    sideEffects: {
      actualTagCreated: false,
      actualTagPushed: false,
      releasePublished: false,
      deploymentTriggered: false,
      cutoverPerformed: false,
      runtimeWriteExecuted: false,
      nativeWriteExecuted: false,
      durableMutationPerformed: false,
      providerApiCalled: false,
      publicMcpExpanded: false,
      realMemoryRead: false,
      rawPrivateStateRead: false
    },
    boundaries: {
      defaultRuntime: 'read_context_proposal_only',
      operatorFullSurface: 'gated_operator_only',
      nativeWriteProduction: 'gated_exact_approval_and_proof_required',
      tagReleaseDeployCutover: 'separate_exact_approval_required',
      vcpToolBoxRole: 'final_memory_intelligence_owner',
      codexMemoryRole: 'governed_mcp_bridge_fallback_audit_fixtures_compat_offline'
    },
    nextGate: accepted
      ? 'external_operator_review_before_any_tag_release_deploy_cutover_or_default_expansion'
      : stopped
        ? 'stop_before_runtime_write_release_or_readiness_boundary'
        : 'close_missing_phase_and_objective_invariant_evidence_without_readiness_claims'
  };
}

module.exports = {
  OBJECTIVE_INVARIANTS,
  PHASE_REQUIREMENTS,
  evaluateNearModelMemoryPlanPackCompletionAudit
};
