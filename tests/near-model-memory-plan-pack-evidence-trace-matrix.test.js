'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildRequiredTraceKeys,
  collectForbiddenFields,
  evaluateNearModelMemoryPlanPackEvidenceTraceMatrix
} = require('../src/core/NearModelMemoryPlanPackEvidenceTraceMatrix');

function entryFor(required, overrides = {}) {
  return {
    scope: required.scope,
    requirementId: required.requirementId,
    evidenceField: required.evidenceField,
    status: 'accepted',
    evidenceKind: 'local_source_test',
    sourceRef: `docs/near-model-memory-plan-pack/evidence/${required.traceKey.replace(/:/g, '_')}.md`,
    ...overrides
  };
}

function requiresExactReceiptEvidence(required) {
  return (
    required.requirementId === 'phase2_readonly_realtime_native_memory' &&
    [
      'nativeTargetBindingPassed',
      'nativeReadProofPassed',
      'fallbackDistinctionPassed',
      'lowDisclosureProofPassed',
      'auditReceiptPassed',
      'scopeVisibilityIsolationPassed',
      'wslLinuxProofPassed',
      'windowsWslSmokePassed',
      'phase2ReceiptBundleAppliedToCompletionAudit'
    ].includes(required.evidenceField)
  ) || (
    required.requirementId === 'phase8_native_write_production_proof' &&
    [
      'exactApprovalEnforcementPassed',
      'nativeSideEffectReceiptPassed',
      'realRootDurableWriteProofPassed',
      'verifyWritePassed',
      'rollbackDrillPassed',
      'failureRecoveryProofPassed',
      'outputDisclosureBudgetPassed',
      'auditReceiptPassed',
      'phase8ReceiptBundleAppliedToCompletionAudit'
    ].includes(required.evidenceField)
  );
}

const LOCAL_CONTRACT_SOURCE_REFS = Object.freeze({
  remainingEvidenceRouteContractPassed: 'docs/near-model-memory-plan-pack/remaining_evidence_route_contract_report.md',
  phase2ExactReceiptRequestBoundaryPassed: 'docs/near-model-memory-plan-pack/phase2_exact_receipt_request_boundary_report.md',
  phase8ExactReceiptRequestBoundaryPassed: 'docs/near-model-memory-plan-pack/phase8_exact_receipt_request_boundary_report.md',
  externalReviewRequestBoundaryPassed: 'docs/near-model-memory-plan-pack/external_review_request_boundary_report.md',
  evidenceRequestPacketRollupPassed: 'docs/near-model-memory-plan-pack/evidence_request_packet_report.md',
  evidenceApplicationRouterPassed: 'docs/near-model-memory-plan-pack/evidence_application_router_report.md',
  evidenceMaterialMetadataGatePassed: 'docs/near-model-memory-plan-pack/evidence_material_metadata_gate_report.md',
  evidenceMaterialMetadataPacketPassed: 'docs/near-model-memory-plan-pack/evidence_material_metadata_packet_report.md',
  evidenceMaterialAcceptancePreflightPassed: 'docs/near-model-memory-plan-pack/evidence_material_acceptance_preflight_report.md',
  evidenceMaterialIntakeBoundaryPassed: 'docs/near-model-memory-plan-pack/evidence_material_intake_boundary_report.md',
  evidenceMaterialManualReviewGatePassed: 'docs/near-model-memory-plan-pack/evidence_material_manual_review_gate_report.md',
  evidenceMaterialAcceptanceEligibilityGatePassed: 'docs/near-model-memory-plan-pack/evidence_material_acceptance_eligibility_gate_report.md',
  evidenceMaterialAcceptanceDecisionRequestBoundaryPassed: 'docs/near-model-memory-plan-pack/evidence_material_acceptance_decision_request_boundary_report.md',
  evidenceMaterialAcceptanceDecisionPacketMetadataGatePassed: 'docs/near-model-memory-plan-pack/evidence_material_acceptance_decision_packet_metadata_gate_report.md',
  evidenceMaterialReviewedDecisionPacketReadinessGatePassed: 'docs/near-model-memory-plan-pack/evidence_material_reviewed_decision_packet_readiness_gate_report.md',
  evidenceMaterialReviewedDecisionPacketIntakePreflightPassed: 'docs/near-model-memory-plan-pack/evidence_material_reviewed_decision_packet_intake_preflight_report.md',
  evidenceMaterialReviewedDecisionPacketReferenceIntakeExecutionPassed: 'docs/near-model-memory-plan-pack/evidence_material_reviewed_decision_packet_reference_intake_execution_report.md',
  evidenceMaterialReviewedDecisionPacketReferenceReviewBoundaryPassed: 'docs/near-model-memory-plan-pack/evidence_material_reviewed_decision_packet_reference_review_boundary_report.md',
  evidenceMaterialReviewedAcceptanceDecisionBoundaryPassed: 'docs/near-model-memory-plan-pack/evidence_material_reviewed_acceptance_decision_boundary_report.md'
});

const PHASE_LOCAL_CONTRACT_SOURCE_REFS = Object.freeze({
  phase2GovernedNativeReadObservationPassed: 'docs/near-model-memory-plan-pack/phase2_governed_native_read_observation_report.md',
  phase2GovernedNativeReadEvidenceApplicationPassed: 'docs/near-model-memory-plan-pack/phase2_governed_native_read_evidence_application_report.md',
  phase2MachineExecutionEvidenceManifestPassed: 'docs/near-model-memory-plan-pack/machine_evidence_rebaseline_report.md',
  phase9EquivalentDogfoodObservationApplicationPassed: 'docs/near-model-memory-plan-pack/phase9_equivalent_dogfood_observation_evidence_report.md',
  phase9MachineObservationArtifactPassed: 'docs/near-model-memory-plan-pack/machine_evidence_rebaseline_report.md',
  externalReviewHandoffBundlePreparedPassed: 'docs/near-model-memory-plan-pack/external_review_handoff_bundle_report.md',
  canonicalReviewBundlePassed: 'docs/near-model-memory-plan-pack/external_review_handoff_bundle_canonical.md'
});

const PHASE2_APPLIED_RECEIPT_SOURCE_REF =
  'docs/near-model-memory-plan-pack/phase2_governed_native_read_evidence_application_report.md';

function fullAcceptedEntries() {
  return buildRequiredTraceKeys().map(required => {
    if (requiresExactReceiptEvidence(required)) {
      return entryFor(required, {
        evidenceKind: 'exact_authorized_receipt',
        sourceRef: required.requirementId === 'phase2_readonly_realtime_native_memory'
          ? PHASE2_APPLIED_RECEIPT_SOURCE_REF
          : `docs/near-model-memory-plan-pack/receipts/${required.traceKey.replace(/:/g, '_')}.md`
      });
    }
    if ([
      'externalReviewPassed',
      'tagApprovalPacketPassed',
      'observationOrDogfoodReviewPassed',
      'externalReviewEvidenceBundleAppliedToCompletionAudit'
    ].includes(required.evidenceField)) {
      return entryFor(required, {
        evidenceKind: 'external_review',
        sourceRef: required.evidenceField === 'observationOrDogfoodReviewPassed'
          ? 'docs/near-model-memory-plan-pack/phase9_equivalent_dogfood_observation_evidence_report.md'
          : `docs/near-model-memory-plan-pack/reviews/${required.traceKey.replace(/:/g, '_')}.md`
      });
    }
    if (required.evidenceField === 'testAllPassed' || required.evidenceField === 'gateCiPassed') {
      return entryFor(required, {
        evidenceKind: 'local_command_gate',
        sourceRef: `docs/near-model-memory-plan-pack/commands/${required.traceKey.replace(/:/g, '_')}.md`
      });
    }
    if (PHASE_LOCAL_CONTRACT_SOURCE_REFS[required.evidenceField]) {
      return entryFor(required, {
        evidenceKind: 'local_contract',
        sourceRef: PHASE_LOCAL_CONTRACT_SOURCE_REFS[required.evidenceField]
      });
    }
    if (
      required.requirementId === 'phase6_memory_delta_pipeline' &&
      required.evidenceField === 'commitMemoryDeltaOperatorPreflightPassed'
    ) {
      return entryFor(required, {
        evidenceKind: 'local_contract',
        sourceRef: 'docs/near-model-memory-plan-pack/memory_delta_commit_preflight_report.md'
      });
    }
    if (
      required.requirementId === 'phase2_readonly_realtime_native_memory' &&
      required.evidenceField === 'nativeReadResponseShapeCompatibilityPassed'
    ) {
      return entryFor(required, {
        evidenceKind: 'local_contract',
        sourceRef: 'docs/near-model-memory-plan-pack/native_read_response_shape_compatibility_report.md'
      });
    }
    if (
      required.requirementId === 'phase2_readonly_realtime_native_memory' &&
      required.evidenceField === 'nativeReadReceiptSchemaCompatibilityPassed'
    ) {
      return entryFor(required, {
        evidenceKind: 'local_contract',
        sourceRef: 'docs/near-model-memory-plan-pack/native_read_receipt_schema_compatibility_report.md'
      });
    }
    if (
      required.requirementId === 'phase2_readonly_realtime_native_memory' &&
      required.evidenceField === 'phase2NativeTargetBindingReceiptReviewPassed'
    ) {
      return entryFor(required, {
        evidenceKind: 'local_contract',
        sourceRef: 'docs/near-model-memory-plan-pack/phase2_native_target_binding_receipt_review_report.md'
      });
    }
    if (
      required.requirementId === 'phase2_readonly_realtime_native_memory' &&
      required.evidenceField === 'phase2NativeReadProofReceiptReviewPassed'
    ) {
      return entryFor(required, {
        evidenceKind: 'local_contract',
        sourceRef: 'docs/near-model-memory-plan-pack/phase2_native_read_proof_receipt_review_report.md'
      });
    }
    if (
      required.requirementId === 'phase2_readonly_realtime_native_memory' &&
      required.evidenceField === 'phase2FallbackDistinctionReceiptReviewPassed'
    ) {
      return entryFor(required, {
        evidenceKind: 'local_contract',
        sourceRef: 'docs/near-model-memory-plan-pack/phase2_fallback_distinction_receipt_review_report.md'
      });
    }
    if (
      required.requirementId === 'phase2_readonly_realtime_native_memory' &&
      required.evidenceField === 'phase2LowDisclosureProofReceiptReviewPassed'
    ) {
      return entryFor(required, {
        evidenceKind: 'local_contract',
        sourceRef: 'docs/near-model-memory-plan-pack/phase2_low_disclosure_proof_receipt_review_report.md'
      });
    }
    if (
      required.requirementId === 'phase2_readonly_realtime_native_memory' &&
      required.evidenceField === 'phase2AuditScopeReceiptReviewPassed'
    ) {
      return entryFor(required, {
        evidenceKind: 'local_contract',
        sourceRef: 'docs/near-model-memory-plan-pack/phase2_audit_scope_receipt_review_report.md'
      });
    }
    if (
      required.requirementId === 'phase2_readonly_realtime_native_memory' &&
      required.evidenceField === 'phase2PlatformProofReceiptReviewPassed'
    ) {
      return entryFor(required, {
        evidenceKind: 'local_contract',
        sourceRef: 'docs/near-model-memory-plan-pack/phase2_platform_proof_receipt_review_report.md'
      });
    }
    if (
      required.requirementId === 'phase2_readonly_realtime_native_memory' &&
      required.evidenceField === 'phase2ReceiptBundleReviewChainHardeningPassed'
    ) {
      return entryFor(required, {
        evidenceKind: 'local_contract',
        sourceRef: 'docs/near-model-memory-plan-pack/phase2_receipt_bundle_review_chain_hardening_report.md'
      });
    }
    if (
      required.requirementId === 'phase2_readonly_realtime_native_memory' &&
      required.evidenceField === 'phase2ReceiptIntakePatchHardenedBundleBindingPassed'
    ) {
      return entryFor(required, {
        evidenceKind: 'local_contract',
        sourceRef: 'docs/near-model-memory-plan-pack/phase2_receipt_intake_patch_hardened_bundle_binding_report.md'
      });
    }
    if (
      required.requirementId === 'phase2_readonly_realtime_native_memory' &&
      required.evidenceField === 'phase2ReceiptApplicationPatchPreflightPassed'
    ) {
      return entryFor(required, {
        evidenceKind: 'local_contract',
        sourceRef: 'docs/near-model-memory-plan-pack/phase2_receipt_application_patch_preflight_contract_report.md'
      });
    }
    if (
      [
        'phase9_default_runtime_policy',
        'phase10_tag_release_readiness'
      ].includes(required.requirementId) &&
      required.evidenceField === 'externalReviewEvidenceIntakePassed'
    ) {
      return entryFor(required, {
        evidenceKind: 'local_contract',
        sourceRef: 'docs/near-model-memory-plan-pack/external_review_evidence_intake_contract_report.md'
      });
    }
    if (
      [
        'phase9_default_runtime_policy',
        'phase10_tag_release_readiness'
      ].includes(required.requirementId) &&
      required.evidenceField === 'externalReviewEvidenceBundleContractPassed'
    ) {
      return entryFor(required, {
        evidenceKind: 'local_contract',
        sourceRef: 'docs/near-model-memory-plan-pack/external_review_evidence_bundle_contract_report.md'
      });
    }
    if (
      [
        'phase9_default_runtime_policy',
        'phase10_tag_release_readiness'
      ].includes(required.requirementId) &&
      required.evidenceField === 'externalReviewEvidenceApplicationPatchPreflightPassed'
    ) {
      return entryFor(required, {
        evidenceKind: 'local_contract',
        sourceRef: 'docs/near-model-memory-plan-pack/external_review_evidence_application_patch_preflight_contract_report.md'
      });
    }
    if (
      [
        'phase9_default_runtime_policy',
        'phase10_tag_release_readiness'
      ].includes(required.requirementId) &&
      required.evidenceField === 'externalReviewEvidencePatchHardenedBundleBindingPassed'
    ) {
      return entryFor(required, {
        evidenceKind: 'local_contract',
        sourceRef: 'docs/near-model-memory-plan-pack/external_review_patch_hardened_bundle_binding_report.md'
      });
    }
    if (
      [
        'phase9_default_runtime_policy',
        'phase10_tag_release_readiness'
      ].includes(required.requirementId) &&
      required.evidenceField === 'externalReviewEvidenceBundleApplicationGatePassed'
    ) {
      return entryFor(required, {
        evidenceKind: 'local_contract',
        sourceRef: 'docs/near-model-memory-plan-pack/external_review_bundle_application_gate_report.md'
      });
    }
    if (
      [
        'phase9_default_runtime_policy',
        'phase10_tag_release_readiness'
      ].includes(required.requirementId) &&
      required.evidenceField === 'externalReviewEvidenceBundleApplicationReceiptPassed'
    ) {
      return entryFor(required, {
        evidenceKind: 'local_contract',
        sourceRef: 'docs/near-model-memory-plan-pack/external_review_bundle_application_receipt_contract_report.md'
      });
    }
    if (
      [
        'phase9_default_runtime_policy',
        'phase10_tag_release_readiness'
      ].includes(required.requirementId) &&
      required.evidenceField === 'externalReviewEvidenceCompletionAuditPatchBoundaryPassed'
    ) {
      return entryFor(required, {
        evidenceKind: 'local_contract',
        sourceRef: 'docs/near-model-memory-plan-pack/external_review_completion_audit_patch_boundary_contract_report.md'
      });
    }
    if (
      required.requirementId === 'phase10_tag_release_readiness' &&
      required.evidenceField === 'releaseTagExternalReviewChainBindingPassed'
    ) {
      return entryFor(required, {
        evidenceKind: 'local_contract',
        sourceRef: 'docs/near-model-memory-plan-pack/release_tag_external_review_chain_binding_report.md'
      });
    }
    if (
      required.requirementId === 'phase8_native_write_production_proof' &&
      required.evidenceField === 'phase8ReceiptAuditIntakePassed'
    ) {
      return entryFor(required, {
        evidenceKind: 'local_contract',
        sourceRef: 'docs/near-model-memory-plan-pack/phase8_native_write_receipt_audit_intake_contract_report.md'
      });
    }
    if (
      required.requirementId === 'phase8_native_write_production_proof' &&
      required.evidenceField === 'phase8ReceiptBundleContractPassed'
    ) {
      return entryFor(required, {
        evidenceKind: 'local_contract',
        sourceRef: 'docs/near-model-memory-plan-pack/phase8_native_write_receipt_bundle_contract_report.md'
      });
    }
    if (
      required.requirementId === 'phase8_native_write_production_proof' &&
      required.evidenceField === 'phase8ReceiptPatchHardenedBundleBindingPassed'
    ) {
      return entryFor(required, {
        evidenceKind: 'local_contract',
        sourceRef: 'docs/near-model-memory-plan-pack/phase8_receipt_patch_hardened_bundle_binding_report.md'
      });
    }
    if (
      required.requirementId === 'phase8_native_write_production_proof' &&
      required.evidenceField === 'phase8ReceiptApplicationPatchPreflightPassed'
    ) {
      return entryFor(required, {
        evidenceKind: 'local_contract',
        sourceRef: 'docs/near-model-memory-plan-pack/phase8_native_write_receipt_application_patch_preflight_contract_report.md'
      });
    }
    if (
      required.requirementId === 'evidence_material_acceptance_chain_local_gates_bound' &&
      LOCAL_CONTRACT_SOURCE_REFS[required.evidenceField]
    ) {
      return entryFor(required, {
        evidenceKind: 'local_contract',
        sourceRef: LOCAL_CONTRACT_SOURCE_REFS[required.evidenceField]
      });
    }
    return entryFor(required);
  });
}

function currentCm2023Entries() {
  return fullAcceptedEntries().map(entry => {
    if (entry.evidenceKind === 'exact_authorized_receipt') {
      return {
        ...entry,
        status: 'future_required',
        evidenceKind: 'future_exact_authorized_receipt',
        sourceRef: `docs/near-model-memory-plan-pack/future/${entry.scope}_${entry.requirementId}_${entry.evidenceField}.md`
      };
    }
    if (entry.evidenceKind === 'external_review') {
      return {
        ...entry,
        status: 'future_required',
        evidenceKind: 'future_external_review',
        sourceRef: `docs/near-model-memory-plan-pack/future/${entry.scope}_${entry.requirementId}_${entry.evidenceField}.md`
      };
    }
    return entry;
  });
}

function assertNoSideEffects(result) {
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.receiptAppliedByThisContract, false);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.liveNativeReadExecuted, false);
  assert.equal(result.nativeWriteExecuted, false);
  assert.equal(result.durableMutationPerformed, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
}

test('CM2024 reports current trace matrix incomplete while covering every requirement', () => {
  const entries = currentCm2023Entries();
  const result = evaluateNearModelMemoryPlanPackEvidenceTraceMatrix({
    schemaVersion: 1,
    entries
  });

  assert.equal(result.accepted, false);
  assert.equal(result.requiredTraceCount, buildRequiredTraceKeys().length);
  assert.equal(result.providedTraceCount, buildRequiredTraceKeys().length);
  assert.ok(result.blockers.includes(
    'unaccepted_phase:phase2_readonly_realtime_native_memory:nativeReadProofPassed_future_required'
  ));
  assert.ok(result.blockers.includes(
    'unaccepted_phase:phase8_native_write_production_proof:nativeSideEffectReceiptPassed_future_required'
  ));
  assert.ok(result.blockers.includes(
    'unaccepted_phase:phase10_tag_release_readiness:externalReviewPassed_future_required'
  ));
  assertNoSideEffects(result);
});

test('CM2024 accepts a complete trace matrix only with exact receipt and external review kinds', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceTraceMatrix({
    schemaVersion: 1,
    entries: fullAcceptedEntries()
  });

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.decision, 'plan_pack_evidence_trace_matrix_accepted');
  assert.equal(result.fullPlanPackTraceAccepted, true);
  assert.equal(result.fullPlanPackCompleted, false);
  assertNoSideEffects(result);
});

test('CM2024 rejects missing trace entries', () => {
  const entries = fullAcceptedEntries().slice(1);
  const missing = buildRequiredTraceKeys()[0];
  const result = evaluateNearModelMemoryPlanPackEvidenceTraceMatrix({
    schemaVersion: 1,
    entries
  });

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes(`missing_trace_${missing.traceKey}`));
  assertNoSideEffects(result);
});

test('CM2024 rejects duplicate trace entries', () => {
  const entries = fullAcceptedEntries();
  entries.push({ ...entries[0] });
  const result = evaluateNearModelMemoryPlanPackEvidenceTraceMatrix({
    schemaVersion: 1,
    entries
  });

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes(`duplicate_${entries[0].scope}:${entries[0].requirementId}:${entries[0].evidenceField}`));
  assertNoSideEffects(result);
});

test('CM2024 rejects exact receipt evidence satisfied by local contract evidence kind', () => {
  const entries = fullAcceptedEntries().map(entry => {
    if (
      entry.requirementId === 'phase2_readonly_realtime_native_memory' &&
      entry.evidenceField === 'nativeReadProofPassed'
    ) {
      return {
        ...entry,
        evidenceKind: 'local_contract',
        sourceRef: 'docs/near-model-memory-plan-pack/local_contract_only.md'
      };
    }
    return entry;
  });
  const result = evaluateNearModelMemoryPlanPackEvidenceTraceMatrix({
    schemaVersion: 1,
    entries
  });

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes(
    'insufficient_evidence_kind_phase:phase2_readonly_realtime_native_memory:nativeReadProofPassed_local_contract'
  ));
  assertNoSideEffects(result);
});

test('CM2052 rejects external review bundle application satisfied by local contract evidence kind', () => {
  const entries = fullAcceptedEntries().map(entry => {
    if (
      entry.requirementId === 'phase9_default_runtime_policy' &&
      entry.evidenceField === 'externalReviewEvidenceBundleAppliedToCompletionAudit'
    ) {
      return {
        ...entry,
        evidenceKind: 'local_contract',
        sourceRef: 'docs/near-model-memory-plan-pack/external_review_completion_audit_patch_application_contract_report.md'
      };
    }
    return entry;
  });
  const result = evaluateNearModelMemoryPlanPackEvidenceTraceMatrix({
    schemaVersion: 1,
    entries
  });

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes(
    'insufficient_evidence_kind_phase:phase9_default_runtime_policy:externalReviewEvidenceBundleAppliedToCompletionAudit_local_contract'
  ));
  assertNoSideEffects(result);
});

test('CM2082 traces applied Completion Audit evidence to the external-review receipt', () => {
  const entries = fullAcceptedEntries().map(entry => {
    if (entry.evidenceField === 'externalReviewEvidenceBundleAppliedToCompletionAudit') {
      return {
        ...entry,
        evidenceKind: 'external_review',
        sourceRef: 'docs/near-model-memory-plan-pack/completion_audit_application_receipt_cm2082.json'
      };
    }
    return entry;
  });
  const result = evaluateNearModelMemoryPlanPackEvidenceTraceMatrix({
    schemaVersion: 1,
    entries
  });

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.receiptAppliedByThisContract, false);
  assertNoSideEffects(result);
});

test('CM2067 traces evidence material acceptance chain binding as local contracts only', () => {
  const entries = fullAcceptedEntries();
  const chainEntries = entries.filter(entry =>
    entry.requirementId === 'evidence_material_acceptance_chain_local_gates_bound'
  );

  assert.equal(chainEntries.length, Object.keys(LOCAL_CONTRACT_SOURCE_REFS).length);
  assert.equal(chainEntries.every(entry => entry.evidenceKind === 'local_contract'), true);
  assert.equal(chainEntries.some(entry => entry.evidenceKind === 'exact_authorized_receipt'), false);
  assert.equal(chainEntries.some(entry => entry.evidenceKind === 'external_review'), false);
  assert.ok(chainEntries.some(entry =>
    entry.evidenceField === 'evidenceMaterialReviewedAcceptanceDecisionBoundaryPassed' &&
    entry.sourceRef === 'docs/near-model-memory-plan-pack/evidence_material_reviewed_acceptance_decision_boundary_report.md'
  ));
});

test('CM2073 traces governed native read observation as local contract without replacing exact receipts', () => {
  const entries = fullAcceptedEntries();
  const observation = entries.find(entry =>
    entry.requirementId === 'phase2_readonly_realtime_native_memory' &&
    entry.evidenceField === 'phase2GovernedNativeReadObservationPassed'
  );
  const nativeRead = entries.find(entry =>
    entry.requirementId === 'phase2_readonly_realtime_native_memory' &&
    entry.evidenceField === 'nativeReadProofPassed'
  );

  assert.equal(observation.evidenceKind, 'local_contract');
  assert.equal(
    observation.sourceRef,
    'docs/near-model-memory-plan-pack/phase2_governed_native_read_observation_report.md'
  );
  assert.equal(nativeRead.evidenceKind, 'exact_authorized_receipt');
});

test('CM2074 traces the application contract and all applied Phase 2 receipts', () => {
  const entries = fullAcceptedEntries();
  const application = entries.find(entry =>
    entry.requirementId === 'phase2_readonly_realtime_native_memory' &&
    entry.evidenceField === 'phase2GovernedNativeReadEvidenceApplicationPassed'
  );
  const appliedReceipts = entries.filter(entry =>
    entry.requirementId === 'phase2_readonly_realtime_native_memory' &&
    requiresExactReceiptEvidence({
      requirementId: entry.requirementId,
      evidenceField: entry.evidenceField
    })
  );

  assert.equal(application.evidenceKind, 'local_contract');
  assert.equal(application.sourceRef, PHASE2_APPLIED_RECEIPT_SOURCE_REF);
  assert.equal(appliedReceipts.length, 9);
  assert.equal(appliedReceipts.every(entry => entry.evidenceKind === 'exact_authorized_receipt'), true);
  assert.equal(appliedReceipts.every(entry => entry.sourceRef === PHASE2_APPLIED_RECEIPT_SOURCE_REF), true);
});

test('CM2075 traces equivalent dogfood observation without substituting external review', () => {
  const entries = fullAcceptedEntries();
  const application = entries.find(entry =>
    entry.requirementId === 'phase9_default_runtime_policy' &&
    entry.evidenceField === 'phase9EquivalentDogfoodObservationApplicationPassed'
  );
  const observation = entries.find(entry =>
    entry.requirementId === 'phase9_default_runtime_policy' &&
    entry.evidenceField === 'observationOrDogfoodReviewPassed'
  );
  const external = entries.find(entry =>
    entry.requirementId === 'phase9_default_runtime_policy' &&
    entry.evidenceField === 'externalReviewPassed'
  );

  assert.equal(application.evidenceKind, 'local_contract');
  assert.equal(observation.evidenceKind, 'external_review');
  assert.equal(observation.sourceRef, application.sourceRef);
  assert.notEqual(external.sourceRef, observation.sourceRef);
});

test('CM2076 traces the review handoff bundle without accepting external decisions', () => {
  const entries = fullAcceptedEntries();
  const handoffEntries = entries.filter(entry =>
    entry.evidenceField === 'externalReviewHandoffBundlePreparedPassed'
  );
  const externalEntries = entries.filter(entry =>
    entry.evidenceField === 'externalReviewPassed'
  );

  assert.equal(handoffEntries.length, 2);
  assert.equal(handoffEntries.every(entry => entry.evidenceKind === 'local_contract'), true);
  assert.equal(handoffEntries.every(entry =>
    entry.sourceRef === 'docs/near-model-memory-plan-pack/external_review_handoff_bundle_report.md'
  ), true);
  assert.equal(externalEntries.every(entry => entry.evidenceKind === 'external_review'), true);
  assert.equal(externalEntries.some(entry => entry.sourceRef === handoffEntries[0].sourceRef), false);
});

test('CM2077 and CM2078 trace machine evidence gates separately from asserted booleans', () => {
  const entries = fullAcceptedEntries();
  const phase2 = entries.find(entry =>
    entry.evidenceField === 'phase2MachineExecutionEvidenceManifestPassed'
  );
  const phase9 = entries.find(entry =>
    entry.evidenceField === 'phase9MachineObservationArtifactPassed'
  );

  assert.equal(phase2.evidenceKind, 'local_contract');
  assert.equal(phase9.evidenceKind, 'local_contract');
  assert.equal(phase2.sourceRef, 'docs/near-model-memory-plan-pack/machine_evidence_rebaseline_report.md');
  assert.equal(phase9.sourceRef, phase2.sourceRef);
});

test('CM2078 traces the canonical review bundle without treating it as external review', () => {
  const entries = fullAcceptedEntries();
  const canonical = entries.filter(entry => entry.evidenceField === 'canonicalReviewBundlePassed');
  assert.equal(canonical.length, 2);
  assert.equal(canonical.every(entry => entry.evidenceKind === 'local_contract'), true);
  assert.equal(canonical.every(entry => entry.sourceRef === 'docs/near-model-memory-plan-pack/external_review_handoff_bundle_canonical.md'), true);
});

test('CM2024 stops L4 on execution counters or readiness flags', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceTraceMatrix({
    schemaVersion: 1,
    entries: fullAcceptedEntries(),
    request: {
      liveNativeReadExecuted: true,
      readinessClaimed: true
    },
    counters: {
      runtimeCalls: 1,
      receiptApplications: 1
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'stop_l4');
  assert.ok(result.blockers.includes('request.liveNativeReadExecuted'));
  assert.ok(result.blockers.includes('request.readinessClaimed'));
  assert.ok(result.blockers.includes('counters.runtimeCalls'));
  assert.ok(result.blockers.includes('counters.receiptApplications'));
  assertNoSideEffects(result);
});

test('CM2024 rejects raw secret runtime fields by path without echoing values', () => {
  const result = evaluateNearModelMemoryPlanPackEvidenceTraceMatrix({
    schemaVersion: 1,
    entries: fullAcceptedEntries(),
    unsafe: {
      endpoint: 'ECHO_ENDPOINT',
      approvalLineValue: 'ECHO_APPROVAL',
      memoryContent: 'ECHO_MEMORY',
      bearerToken: 'ECHO_TOKEN'
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_secret_runtime_or_overclaim_fields');
  assert.deepEqual(result.forbiddenFields, [
    'unsafe.endpoint',
    'unsafe.approvalLineValue',
    'unsafe.memoryContent',
    'unsafe.bearerToken'
  ]);
  assert.equal(serialized.includes('ECHO_ENDPOINT'), false);
  assert.equal(serialized.includes('ECHO_APPROVAL'), false);
  assert.equal(serialized.includes('ECHO_MEMORY'), false);
  assert.equal(serialized.includes('ECHO_TOKEN'), false);
});

test('CM2024 forbidden field collector reports paths only', () => {
  assert.deepEqual(collectForbiddenFields({
    rawResponse: 'DO_NOT_ECHO_A',
    nested: {
      providerPayload: 'DO_NOT_ECHO_B'
    }
  }), [
    'rawResponse',
    'nested.providerPayload'
  ]);
});
