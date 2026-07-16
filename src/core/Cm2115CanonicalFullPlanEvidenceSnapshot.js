'use strict';

const crypto = require('node:crypto');
const {
  OBJECTIVE_INVARIANTS,
  PHASE_REQUIREMENTS,
  evaluateNearModelMemoryPlanPackCompletionAudit
} = require('./NearModelMemoryPlanPackCompletionAudit');
const {
  EXACT_RECEIPT_REQUIREMENTS,
  EXTERNAL_REVIEW_FIELDS
} = require('./NearModelMemoryPlanPackEvidenceTraceMatrix');
const {
  evaluateBindingReceipt: evaluateCm2115R2Phase2ApplicationBindingReceipt
} = require('./Cm2115R2Phase2CompletionAuditApplication');

const TASK_ID = 'CM-2115-R2';
const SNAPSHOT_TYPE = 'canonical_full_plan_evidence_snapshot_v3';
const BASELINE = Object.freeze({
  sourceCommit: '933d29e41a6489adc1d411f217b4cebf0f5e060d',
  sourceTree: '7d2b196fd83c9a4d5c95fb1641fced34fc6b65b2'
});
const DOCS = 'docs/near-model-memory-plan-pack/';

function doc(name) {
  return `${DOCS}${name}`;
}

function renderCanonicalSnapshotMarkdown(snapshot) {
  const jsonText = `${JSON.stringify(canonicalize(snapshot), null, 2)}\n`;
  const counts = snapshot.payload.counts;
  return [
    '# CM-2115-R2 Canonical Full-plan Evidence Snapshot',
    '',
    'This is a content-equivalent review surface for the canonical JSON snapshot.',
    'It is prepared for independent Git-object and semantic-route review only.',
    '',
    `- Source commit: \`${snapshot.payload.baseline.sourceCommit}\``,
    `- Source tree: \`${snapshot.payload.baseline.sourceTree}\``,
    `- Canonical payload SHA-256: \`${snapshot.canonicalPayloadSha256}\``,
    `- Trace entries: \`${counts.totalTraceEntryCount}\``,
    `- Resolved trace entries: \`${counts.resolvedTraceEntryCount}\``,
    `- Placeholder refs: \`${counts.fakePlaceholderRefCount}\``,
    `- Unique source objects: \`${counts.uniqueSourceObjectCount}\``,
    `- Candidate completion eligible: \`${snapshot.payload.candidateAudit.completionEligibleForIndependentReview}\``,
    `- Authoritative fullPlanPackCompleted: \`${snapshot.payload.currentState.fullPlanPackCompleted}\``,
    `- Readiness claimed: \`${snapshot.payload.currentState.readinessClaimed}\``,
    '',
    'The candidate audit result is not an application. Independent review and a separate application gate remain required.',
    '',
    '## Exact JSON mirror',
    '',
    '```json',
    jsonText.trimEnd(),
    '```',
    ''
  ].join('\n');
}

const LOCAL_VALIDATION_RECEIPT_PATH = doc('cm2115_r2_local_validation_receipt.json');
const PHASE2_APPLICATION_RECEIPT_PATH = doc('phase2_completion_audit_application_binding_receipt_cm2115_r2_v2.json');

const PHASE_DEFAULT_SOURCES = Object.freeze({
  phase0_goal_contract_non_claims: Object.freeze([
    doc('02_FINAL_GOAL_AND_NON_CLAIMS.md'),
    'src/core/CurrentProductGoalContract.js',
    'tests/current-product-goal-contract.test.js'
  ]),
  phase1_blocker_repairs: Object.freeze([
    doc('phase1_acceptance_gate_report.md')
  ]),
  phase2_readonly_realtime_native_memory: Object.freeze([
    doc('machine_evidence_rebaseline_report.md')
  ]),
  phase3_memory_context_package_mvp: Object.freeze([
    'src/core/MemoryContextPackageService.js',
    'tests/memory-context-package-service.test.js'
  ]),
  phase4_codex_workflow_integration: Object.freeze([
    'src/core/TaskStartMemoryContextWorkflow.js',
    'tests/task-start-memory-context-workflow.test.js',
    'AGENTS.md',
    doc('05_TASKBOOKS.md')
  ]),
  phase5_recall_quality_gate: Object.freeze([
    doc('recall_quality_report.json'),
    'tests/memory-context-recall-quality-gate.test.js'
  ]),
  phase6_memory_delta_pipeline: Object.freeze([
    'src/core/MemoryDeltaProposalService.js',
    'tests/memory-delta-proposal-service.test.js'
  ]),
  phase7_operator_full_surface: Object.freeze([
    doc('operator_full_surface_proof_report.md'),
    'tests/operator-full-surface-proof-gate.test.js'
  ]),
  phase8_native_write_production_proof: Object.freeze([
    doc('phase8_completion_revalidation_evidence_bundle_cm2114.json'),
    doc('phase8_completion_revalidation_application_receipt_cm2114.json')
  ]),
  phase9_default_runtime_policy: Object.freeze([
    doc('phase9_machine_observation_artifact.json'),
    doc('external_review_final_decision_cm2080.json'),
    doc('completion_audit_application_receipt_cm2082.json')
  ]),
  phase10_tag_release_readiness: Object.freeze([
    doc('tag_approval_packet_cm2083.json'),
    doc('tag_approval_final_decision_cm2084.json'),
    doc('release_tag_readiness_policy_gate_report.md')
  ])
});

const PHASE_FIELD_SOURCES = Object.freeze({
  'phase:phase0_goal_contract_non_claims:readmeNonClaimsPassed': Object.freeze([
    'README.md',
    'tests/current-product-goal-contract.test.js'
  ]),
  'phase:phase1_blocker_repairs:hardenedExplicitToolsBypassFixed': Object.freeze([
    'src/adapters/codex-mcp/server.js',
    'tests/mcp-contract.test.js'
  ]),
  'phase:phase1_blocker_repairs:atomicFileWriterStaleLockToctouFixed': Object.freeze([
    'src/storage/AtomicFileWriter.js',
    'tests/atomic-file-writer-lock.test.js'
  ]),
  'phase:phase1_blocker_repairs:phase1RegressionTestsPassed': Object.freeze([
    doc('phase1_acceptance_gate_report.md')
  ]),
  'phase:phase1_blocker_repairs:testAllPassed': Object.freeze([]),
  'phase:phase1_blocker_repairs:gateCiPassed': Object.freeze([]),
  'phase:phase2_readonly_realtime_native_memory:phase2EvidenceGatePassed': Object.freeze([
    doc('phase2_native_read_proof_evidence_gate_report.md')
  ]),
  'phase:phase2_readonly_realtime_native_memory:phase2ReadinessGatePassed': Object.freeze([
    doc('phase2_native_read_proof_readiness_gate_report.md')
  ]),
  'phase:phase2_readonly_realtime_native_memory:phase2ApprovalPacketContractPassed': Object.freeze([
    doc('phase2_native_read_proof_approval_packet_contract_report.md')
  ]),
  'phase:phase2_readonly_realtime_native_memory:phase2ReceiptBundleContractPassed': Object.freeze([
    doc('phase2_native_read_proof_receipt_bundle_contract_report.md')
  ]),
  'phase:phase2_readonly_realtime_native_memory:phase2ReceiptBundleReviewChainHardeningPassed': Object.freeze([
    doc('phase2_receipt_bundle_review_chain_hardening_report.md')
  ]),
  'phase:phase2_readonly_realtime_native_memory:phase2ReceiptIntakePatchHardenedBundleBindingPassed': Object.freeze([
    doc('phase2_receipt_intake_patch_hardened_bundle_binding_report.md')
  ]),
  'phase:phase2_readonly_realtime_native_memory:phase2ReceiptApplicationPatchPreflightPassed': Object.freeze([
    doc('phase2_receipt_application_patch_preflight_contract_report.md')
  ]),
  'phase:phase2_readonly_realtime_native_memory:phase2GovernedNativeReadObservationPassed': Object.freeze([
    doc('phase2_governed_native_read_observation_report.md'),
    doc('phase2_machine_execution_evidence_manifest.json')
  ]),
  'phase:phase2_readonly_realtime_native_memory:phase2GovernedNativeReadEvidenceApplicationPassed': Object.freeze([
    'src/core/Cm2115R2Phase2CompletionAuditApplication.js',
    'tests/cm2115-r2-durable-exact-patch-application.test.js',
    PHASE2_APPLICATION_RECEIPT_PATH,
    LOCAL_VALIDATION_RECEIPT_PATH
  ]),
  'phase:phase2_readonly_realtime_native_memory:phase2MachineExecutionEvidenceManifestPassed': Object.freeze([
    doc('phase2_machine_execution_evidence_manifest.json'),
    'tests/phase2-machine-execution-evidence-manifest-contract.test.js'
  ]),
  'phase:phase2_readonly_realtime_native_memory:defaultReadOnlySurfacePassed': Object.freeze([
    doc('phase9_machine_observation_artifact.json'),
    'src/adapters/codex-mcp/server.js'
  ]),
  'phase:phase2_readonly_realtime_native_memory:hiddenToolsHardRejectPassed': Object.freeze([
    doc('phase9_machine_observation_artifact.json'),
    'src/adapters/codex-mcp/server.js'
  ]),
  'phase:phase2_readonly_realtime_native_memory:nativeReadResponseShapeCompatibilityPassed': Object.freeze([
    doc('native_read_response_shape_compatibility_report.md')
  ]),
  'phase:phase2_readonly_realtime_native_memory:nativeReadReceiptSchemaCompatibilityPassed': Object.freeze([
    doc('native_read_receipt_schema_compatibility_report.md')
  ]),
  'phase:phase2_readonly_realtime_native_memory:phase2NativeTargetBindingReceiptReviewPassed': Object.freeze([
    doc('phase2_native_target_binding_receipt_review_report.md')
  ]),
  'phase:phase2_readonly_realtime_native_memory:phase2NativeReadProofReceiptReviewPassed': Object.freeze([
    doc('phase2_native_read_proof_receipt_review_report.md')
  ]),
  'phase:phase2_readonly_realtime_native_memory:phase2FallbackDistinctionReceiptReviewPassed': Object.freeze([
    doc('phase2_fallback_distinction_receipt_review_report.md')
  ]),
  'phase:phase2_readonly_realtime_native_memory:phase2LowDisclosureProofReceiptReviewPassed': Object.freeze([
    doc('phase2_low_disclosure_proof_receipt_review_report.md')
  ]),
  'phase:phase2_readonly_realtime_native_memory:phase2AuditScopeReceiptReviewPassed': Object.freeze([
    doc('phase2_audit_scope_receipt_review_report.md')
  ]),
  'phase:phase2_readonly_realtime_native_memory:phase2PlatformProofReceiptReviewPassed': Object.freeze([
    doc('phase2_platform_proof_receipt_review_report.md')
  ]),
  'phase:phase2_readonly_realtime_native_memory:nativeTargetBindingPassed': Object.freeze([
    doc('phase2_machine_execution_evidence_manifest.json'),
    PHASE2_APPLICATION_RECEIPT_PATH
  ]),
  'phase:phase2_readonly_realtime_native_memory:nativeReadProofPassed': Object.freeze([
    doc('phase2_machine_execution_evidence_manifest.json'),
    PHASE2_APPLICATION_RECEIPT_PATH
  ]),
  'phase:phase2_readonly_realtime_native_memory:fallbackDistinctionPassed': Object.freeze([
    doc('phase2_machine_execution_evidence_manifest.json'),
    PHASE2_APPLICATION_RECEIPT_PATH
  ]),
  'phase:phase2_readonly_realtime_native_memory:lowDisclosureProofPassed': Object.freeze([
    doc('phase2_machine_execution_evidence_manifest.json'),
    PHASE2_APPLICATION_RECEIPT_PATH
  ]),
  'phase:phase2_readonly_realtime_native_memory:auditReceiptPassed': Object.freeze([
    doc('phase2_machine_execution_evidence_manifest.json'),
    PHASE2_APPLICATION_RECEIPT_PATH
  ]),
  'phase:phase2_readonly_realtime_native_memory:scopeVisibilityIsolationPassed': Object.freeze([
    doc('phase2_machine_execution_evidence_manifest.json'),
    PHASE2_APPLICATION_RECEIPT_PATH
  ]),
  'phase:phase2_readonly_realtime_native_memory:wslLinuxProofPassed': Object.freeze([
    doc('windows_wsl_machine_smoke_receipt.json'),
    PHASE2_APPLICATION_RECEIPT_PATH
  ]),
  'phase:phase2_readonly_realtime_native_memory:windowsWslSmokePassed': Object.freeze([
    doc('windows_wsl_machine_smoke_receipt.json'),
    PHASE2_APPLICATION_RECEIPT_PATH
  ]),
  'phase:phase2_readonly_realtime_native_memory:phase2ReceiptBundleAppliedToCompletionAudit': Object.freeze([
    PHASE2_APPLICATION_RECEIPT_PATH
  ]),
  'phase:phase3_memory_context_package_mvp:prepareMemoryContextDefaultExposed': Object.freeze([
    'src/adapters/codex-mcp/server.js',
    'tests/mcp-contract.test.js'
  ]),
  'phase:phase4_codex_workflow_integration:agentsTaskStartRulePassed': Object.freeze([
    'AGENTS.md',
    'tests/task-start-memory-context-workflow.test.js'
  ]),
  'phase:phase4_codex_workflow_integration:taskbookPreflightRulePassed': Object.freeze([
    doc('05_TASKBOOKS.md'),
    'tests/task-start-memory-context-workflow.test.js'
  ]),
  'phase:phase6_memory_delta_pipeline:commitMemoryDeltaOperatorPreflightPassed': Object.freeze([
    doc('memory_delta_commit_preflight_report.md'),
    'tests/memory-delta-commit-preflight-service.test.js'
  ]),
  'phase:phase6_memory_delta_pipeline:commitMemoryDeltaNotPublic': Object.freeze([
    'src/adapters/codex-mcp/server.js',
    'tests/memory-delta-proposal-service.test.js'
  ]),
  'phase:phase6_memory_delta_pipeline:defaultProductionWriteBlocked': Object.freeze([
    'src/core/MemoryDeltaProposalService.js',
    'src/adapters/codex-mcp/server.js'
  ]),
  'phase:phase8_native_write_production_proof:nativeWriteContractPreflightPassed': Object.freeze([
    doc('native_write_contract_preflight_report.md')
  ]),
  'phase:phase8_native_write_production_proof:realRootWriteReadinessGatePassed': Object.freeze([
    doc('real_root_write_readiness_gate_report.md')
  ]),
  'phase:phase8_native_write_production_proof:phase8ReceiptAuditIntakePassed': Object.freeze([
    doc('phase8_native_write_receipt_audit_intake_contract_report.md')
  ]),
  'phase:phase8_native_write_production_proof:phase8ReceiptBundleContractPassed': Object.freeze([
    doc('phase8_native_write_receipt_bundle_contract_report.md')
  ]),
  'phase:phase8_native_write_production_proof:phase8ReceiptPatchHardenedBundleBindingPassed': Object.freeze([
    doc('phase8_receipt_patch_hardened_bundle_binding_report.md')
  ]),
  'phase:phase8_native_write_production_proof:phase8ReceiptApplicationPatchPreflightPassed': Object.freeze([
    doc('phase8_native_write_receipt_application_patch_preflight_contract_report.md')
  ]),
  'phase:phase8_native_write_production_proof:exactApprovalEnforcementPassed': Object.freeze([
    doc('phase8_vcptoolbox_owner_native_proof_receipt_cm2113.json'),
    doc('phase8_completion_revalidation_application_receipt_cm2114.json')
  ]),
  'phase:phase8_native_write_production_proof:nativeSideEffectReceiptPassed': Object.freeze([
    doc('phase8_vcptoolbox_owner_native_proof_receipt_cm2113.json'),
    doc('phase8_completion_revalidation_application_receipt_cm2114.json')
  ]),
  'phase:phase8_native_write_production_proof:realRootDurableWriteProofPassed': Object.freeze([
    doc('phase8_vcptoolbox_owner_native_proof_receipt_cm2113.json'),
    doc('phase8_completion_revalidation_application_receipt_cm2114.json')
  ]),
  'phase:phase8_native_write_production_proof:vcpToolBoxOwnedRuntimeWritePassed': Object.freeze([
    doc('phase8_vcptoolbox_owner_native_proof_receipt_cm2113.json'),
    doc('phase8_completion_revalidation_application_receipt_cm2114.json')
  ]),
  'phase:phase8_native_write_production_proof:actualTransportBindingPassed': Object.freeze([
    doc('phase8_vcptoolbox_owner_native_proof_receipt_cm2113.json'),
    doc('phase8_completion_revalidation_application_receipt_cm2114.json')
  ]),
  'phase:phase8_native_write_production_proof:stableTargetStoreIdentityPassed': Object.freeze([
    doc('phase8_vcptoolbox_owner_native_proof_receipt_cm2113.json'),
    doc('phase8_completion_revalidation_application_receipt_cm2114.json')
  ]),
  'phase:phase8_native_write_production_proof:verifyWritePassed': Object.freeze([
    doc('phase8_vcptoolbox_owner_native_proof_receipt_cm2113.json'),
    doc('phase8_completion_revalidation_application_receipt_cm2114.json')
  ]),
  'phase:phase8_native_write_production_proof:rollbackDrillPassed': Object.freeze([
    doc('phase8_rollback_evidence_application_receipt_cm2108.json'),
    doc('phase8_completion_revalidation_evidence_bundle_cm2114.json')
  ]),
  'phase:phase8_native_write_production_proof:failureRecoveryProofPassed': Object.freeze([
    doc('phase8_failure_recovery_evidence_application_receipt_cm2110.json'),
    doc('phase8_completion_revalidation_evidence_bundle_cm2114.json')
  ]),
  'phase:phase8_native_write_production_proof:outputDisclosureBudgetPassed': Object.freeze([
    doc('phase8_vcptoolbox_owner_native_proof_receipt_cm2113.json'),
    doc('phase8_completion_revalidation_application_receipt_cm2114.json')
  ]),
  'phase:phase8_native_write_production_proof:auditReceiptPassed': Object.freeze([
    doc('phase8_vcptoolbox_owner_native_proof_receipt_cm2113.json'),
    doc('phase8_completion_revalidation_application_receipt_cm2114.json')
  ]),
  'phase:phase8_native_write_production_proof:phase8ReceiptBundleAppliedToCompletionAudit': Object.freeze([
    doc('phase8_completion_revalidation_evidence_bundle_cm2114.json'),
    doc('phase8_completion_revalidation_application_receipt_cm2114.json')
  ])
});

const EXTERNAL_LOCAL_SOURCE_BY_FIELD = Object.freeze({
  externalReviewEvidenceIntakePassed: doc('external_review_evidence_intake_contract_report.md'),
  externalReviewEvidenceBundleContractPassed: doc('external_review_evidence_bundle_contract_report.md'),
  externalReviewEvidencePatchHardenedBundleBindingPassed: doc('external_review_patch_hardened_bundle_binding_report.md'),
  externalReviewEvidenceApplicationPatchPreflightPassed: doc('external_review_evidence_application_patch_preflight_contract_report.md'),
  externalReviewHandoffBundlePreparedPassed: doc('external_review_handoff_bundle_report.md'),
  canonicalReviewBundlePassed: doc('external_review_handoff_bundle_canonical.md'),
  externalReviewEvidenceBundleApplicationGatePassed: doc('external_review_bundle_application_gate_report.md'),
  externalReviewEvidenceBundleApplicationReceiptPassed: doc('external_review_bundle_application_receipt_contract_report.md'),
  externalReviewEvidenceCompletionAuditPatchBoundaryPassed: doc('external_review_completion_audit_patch_boundary_contract_report.md')
});

const CHAIN_SOURCE_BY_FIELD = Object.freeze({
  remainingEvidenceRouteContractPassed: doc('remaining_evidence_route_contract_report.md'),
  phase2ExactReceiptRequestBoundaryPassed: doc('phase2_exact_receipt_request_boundary_report.md'),
  phase8ExactReceiptRequestBoundaryPassed: doc('phase8_exact_receipt_request_boundary_report.md'),
  externalReviewRequestBoundaryPassed: doc('external_review_request_boundary_report.md'),
  evidenceRequestPacketRollupPassed: doc('evidence_request_packet_report.md'),
  evidenceApplicationRouterPassed: doc('evidence_application_router_report.md'),
  evidenceMaterialMetadataGatePassed: doc('evidence_material_metadata_gate_report.md'),
  evidenceMaterialMetadataPacketPassed: doc('evidence_material_metadata_packet_report.md'),
  evidenceMaterialAcceptancePreflightPassed: doc('evidence_material_acceptance_preflight_report.md'),
  evidenceMaterialIntakeBoundaryPassed: doc('evidence_material_intake_boundary_report.md'),
  evidenceMaterialManualReviewGatePassed: doc('evidence_material_manual_review_gate_report.md'),
  evidenceMaterialAcceptanceEligibilityGatePassed: doc('evidence_material_acceptance_eligibility_gate_report.md'),
  evidenceMaterialAcceptanceDecisionRequestBoundaryPassed: doc('evidence_material_acceptance_decision_request_boundary_report.md'),
  evidenceMaterialAcceptanceDecisionPacketMetadataGatePassed: doc('evidence_material_acceptance_decision_packet_metadata_gate_report.md'),
  evidenceMaterialReviewedDecisionPacketReadinessGatePassed: doc('evidence_material_reviewed_decision_packet_readiness_gate_report.md'),
  evidenceMaterialReviewedDecisionPacketIntakePreflightPassed: doc('evidence_material_reviewed_decision_packet_intake_preflight_report.md'),
  evidenceMaterialReviewedDecisionPacketReferenceIntakeExecutionPassed: doc('evidence_material_reviewed_decision_packet_reference_intake_execution_report.md'),
  evidenceMaterialReviewedDecisionPacketReferenceReviewBoundaryPassed: doc('evidence_material_reviewed_decision_packet_reference_review_boundary_report.md'),
  evidenceMaterialReviewedAcceptanceDecisionBoundaryPassed: doc('evidence_material_reviewed_acceptance_decision_boundary_report.md')
});

const INVARIANT_DEFAULT_SOURCES = Object.freeze({
  local_memory_retained: Object.freeze(['src/storage/DiaryStore.js']),
  sqlite_shadow_retained: Object.freeze(['src/storage/SqliteShadowStore.js']),
  vector_index_retained: Object.freeze(['src/storage/VectorIndexStore.js']),
  recall_pipeline_retained_and_reused: Object.freeze([
    'src/recall/KnowledgeBaseRecallPipeline.js',
    'src/core/MemoryContextPackageService.js'
  ]),
  write_governance_retained_and_reused: Object.freeze([
    'src/core/MemoryWriteService.js',
    'src/core/MemoryDeltaProposalService.js'
  ]),
  vcptoolbox_final_memory_intelligence_owner: Object.freeze([
    'src/core/CurrentProductGoalContract.js',
    doc('02_FINAL_GOAL_AND_NON_CLAIMS.md')
  ]),
  codex_memory_governed_bridge_with_fallback_audit_fixtures_compat_offline: Object.freeze([
    'src/adapters/codex-mcp/server.js',
    'src/core/GovernedMcpVcpNativeBridgeGate.js',
    'src/storage/AuditLogStore.js',
    doc('03_ARCHITECTURE_PLAN.md')
  ]),
  advanced_recall_heuristics_experimental_only: Object.freeze([
    'src/recall/EPAModule.js',
    'src/recall/ResidualPyramid.js',
    'src/recall/TagMemoEngine.js',
    doc('02_FINAL_GOAL_AND_NON_CLAIMS.md')
  ]),
  prepare_context_milestone_not_full_goal: Object.freeze([
    doc('02_FINAL_GOAL_AND_NON_CLAIMS.md')
  ]),
  memory_delta_not_default_production_write: Object.freeze([
    'src/core/MemoryDeltaProposalService.js',
    'src/adapters/codex-mcp/server.js'
  ]),
  default_runtime_read_context_proposal_only: Object.freeze([
    doc('phase9_machine_observation_artifact.json')
  ]),
  operator_native_release_boundaries_gated: Object.freeze([
    doc('operator_full_surface_proof_report.md'),
    doc('native_write_contract_preflight_report.md'),
    doc('release_tag_readiness_policy_gate_report.md')
  ]),
  evidence_material_acceptance_chain_local_gates_bound: Object.freeze([
    doc('evidence_material_acceptance_chain_completion_audit_binding_report.md')
  ])
});

const LOCAL_CONTRACT_FIELDS = new Set([
  ...Object.keys(EXTERNAL_LOCAL_SOURCE_BY_FIELD),
  ...Object.keys(CHAIN_SOURCE_BY_FIELD),
  'commitMemoryDeltaOperatorPreflightPassed',
  'phase2GovernedNativeReadObservationPassed',
  'phase2GovernedNativeReadEvidenceApplicationPassed',
  'phase9EquivalentDogfoodObservationApplicationPassed',
  'releaseTagExternalReviewChainBindingPassed'
]);

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256Canonical(value) {
  return sha256(JSON.stringify(canonicalize(value)));
}

function traceKeyFor(scope, requirementId, evidenceField) {
  return `${scope}:${requirementId}:${evidenceField}`;
}

function requiredTraceDescriptors() {
  const phases = PHASE_REQUIREMENTS.flatMap(phase => phase.requiredEvidence.map(evidenceField => ({
    scope: 'phase',
    requirementId: phase.id,
    evidenceField,
    traceKey: traceKeyFor('phase', phase.id, evidenceField)
  })));
  const invariants = OBJECTIVE_INVARIANTS.flatMap(invariant => invariant.requiredEvidence.map(evidenceField => ({
    scope: 'invariant',
    requirementId: invariant.id,
    evidenceField,
    traceKey: traceKeyFor('invariant', invariant.id, evidenceField)
  })));
  return [...phases, ...invariants].sort((left, right) => left.traceKey.localeCompare(right.traceKey));
}

function exactReceiptRequired(descriptor) {
  return descriptor.scope === 'phase' &&
    (EXACT_RECEIPT_REQUIREMENTS[descriptor.requirementId] || []).includes(descriptor.evidenceField);
}

function evidenceKindFor(descriptor) {
  if (exactReceiptRequired(descriptor)) return 'exact_authorized_receipt';
  if (EXTERNAL_REVIEW_FIELDS.includes(descriptor.evidenceField)) return 'external_review';
  if (['testAllPassed', 'gateCiPassed'].includes(descriptor.evidenceField)) return 'local_command_gate';
  if (LOCAL_CONTRACT_FIELDS.has(descriptor.evidenceField)) return 'local_contract';
  return 'local_source_test';
}

function derivationClassFor(evidenceKind) {
  if (evidenceKind === 'exact_authorized_receipt') return 'git_object_exact_authorized_receipt';
  if (evidenceKind === 'external_review') return 'git_object_independent_review_decision';
  if (evidenceKind === 'local_command_gate') return 'current_validation_receipt';
  if (evidenceKind === 'local_contract') return 'git_object_local_contract_plus_current_validation';
  return 'git_object_local_source_test_plus_current_validation';
}

function externalPhaseSources(descriptor) {
  const field = descriptor.evidenceField;
  if (EXTERNAL_LOCAL_SOURCE_BY_FIELD[field]) return [EXTERNAL_LOCAL_SOURCE_BY_FIELD[field]];
  if (field === 'phase9EquivalentDogfoodObservationApplicationPassed') {
    return [doc('phase9_equivalent_dogfood_observation_evidence_report.md')];
  }
  if (field === 'phase9MachineObservationArtifactPassed') {
    return [doc('phase9_machine_observation_artifact.json')];
  }
  if (field === 'observationOrDogfoodReviewPassed') {
    return [doc('phase9_machine_observation_artifact.json'), doc('external_review_final_decision_cm2080.json')];
  }
  if (field === 'externalReviewPassed') return [doc('external_review_final_decision_cm2080.json')];
  if (field === 'externalReviewEvidenceBundleAppliedToCompletionAudit') {
    return [doc('completion_audit_application_receipt_cm2082.json')];
  }
  if (field === 'defaultRuntimePolicyGatePassed' ||
      field === 'defaultRuntimeReadContextProposalHeld' ||
      field === 'defaultForbiddenWriteToolsBlocked' ||
      field === 'defaultRuntimeExpansionNotAutomatic') {
    return [doc('phase9_machine_observation_artifact.json'), doc('default_runtime_policy_observation_gate_report.md')];
  }
  if (field === 'releaseTagReadinessPolicyGatePassed' || field === 'releaseNamingNonClaimsPassed') {
    return [doc('tag_approval_packet_cm2083.json'), doc('release_tag_readiness_policy_gate_report.md')];
  }
  if (field === 'releaseTagExternalReviewChainBindingPassed') {
    return [doc('release_tag_external_review_chain_binding_report.md'), doc('tag_approval_packet_cm2083.json')];
  }
  if (field === 'tagApprovalPacketPassed') return [doc('tag_approval_final_decision_cm2084.json')];
  if (field === 'actualTagReleaseDeployCutoverSeparateApprovalRequired') {
    return [doc('tag_approval_final_decision_cm2084.json')];
  }
  return null;
}

function baseSourcePathsFor(descriptor) {
  if (Object.prototype.hasOwnProperty.call(PHASE_FIELD_SOURCES, descriptor.traceKey)) {
    return [...PHASE_FIELD_SOURCES[descriptor.traceKey]];
  }
  if (descriptor.scope === 'phase') {
    const external = externalPhaseSources(descriptor);
    if (external) return external;
    return [...(PHASE_DEFAULT_SOURCES[descriptor.requirementId] || [])];
  }
  if (CHAIN_SOURCE_BY_FIELD[descriptor.evidenceField]) {
    return [CHAIN_SOURCE_BY_FIELD[descriptor.evidenceField]];
  }
  return [...(INVARIANT_DEFAULT_SOURCES[descriptor.requirementId] || [])];
}

function sourcePathsFor(descriptor) {
  const evidenceKind = evidenceKindFor(descriptor);
  const sourcePaths = baseSourcePathsFor(descriptor);
  if (['local_source_test', 'local_contract', 'local_command_gate'].includes(evidenceKind)) {
    sourcePaths.push(LOCAL_VALIDATION_RECEIPT_PATH);
  }
  return [...new Set(sourcePaths)].sort();
}

function buildEntrySpecs() {
  return requiredTraceDescriptors().map(descriptor => {
    const sourcePaths = sourcePathsFor(descriptor);
    if (sourcePaths.length === 0) throw new Error(`cm2115_source_mapping_missing:${descriptor.traceKey}`);
    const evidenceKind = evidenceKindFor(descriptor);
    return {
      ...descriptor,
      evidenceKind,
      derivationClass: derivationClassFor(evidenceKind),
      sourcePaths
    };
  });
}

function buildRouteDefinition() {
  return buildEntrySpecs().map(spec => ({
    traceKey: spec.traceKey,
    evidenceKind: spec.evidenceKind,
    derivationClass: spec.derivationClass,
    sourcePaths: spec.sourcePaths
  }));
}

function buildCandidateAuditSummary() {
  const evidence = {};
  for (const descriptor of requiredTraceDescriptors()) evidence[descriptor.evidenceField] = true;
  const result = evaluateNearModelMemoryPlanPackCompletionAudit({
    evidence,
    request: {
      fullPlanPackCompletedClaimed: false,
      productionReadyClaimed: false,
      releaseReadyClaimed: false,
      deployReadyClaimed: false,
      cutoverReadyClaimed: false,
      rcReadyClaimed: false
    }
  });
  return {
    evaluatorSchemaVersion: result.schemaVersion,
    evaluatorAccepted: result.accepted,
    evaluatorWouldReturnFullPlanPackCompleted: result.fullPlanPackCompleted,
    completedPhaseIds: result.completedPhaseIds,
    incompletePhaseIds: result.incompletePhaseIds,
    missingObjectiveInvariantIds: result.objectiveInvariants.filter(item => !item.accepted).map(item => item.id),
    blockerCount: result.blockers.length,
    stopReasonCount: result.stopReasons.length,
    completionEligibleForIndependentReview: result.accepted && result.fullPlanPackCompleted,
    authoritativeFullPlanPackCompleted: false,
    authoritativeReadinessClaimed: false
  };
}

function normalizeResolvedSource(sourcePath, identity) {
  if (!identity || typeof identity !== 'object') {
    throw new Error(`cm2115_source_identity_missing:${sourcePath}`);
  }
  return {
    sourcePath,
    sourceCommit: BASELINE.sourceCommit,
    sourceTree: BASELINE.sourceTree,
    gitObjectType: identity.gitObjectType,
    gitMode: identity.gitMode,
    blobOid: identity.blobOid,
    bytes: identity.bytes,
    sha256: identity.sha256
  };
}

function buildSnapshot(resolveSourceObject, bindingReceiptResolvers = {}) {
  if (typeof resolveSourceObject !== 'function') throw new TypeError('cm2115_source_resolver_required');
  let phase2ApplicationReceiptEvaluation = null;
  try {
    const identity = resolveSourceObject(PHASE2_APPLICATION_RECEIPT_PATH);
    const content = Buffer.isBuffer(identity?.content)
      ? identity.content.toString('utf8')
      : identity?.content;
    phase2ApplicationReceiptEvaluation = evaluateCm2115R2Phase2ApplicationBindingReceipt(
      JSON.parse(content),
      bindingReceiptResolvers
    );
  } catch {
    throw new Error('cm2115_r2_phase2_application_binding_receipt_unreadable');
  }
  if (!phase2ApplicationReceiptEvaluation.accepted) {
    throw new Error(`cm2115_r2_phase2_application_binding_receipt_rejected:${phase2ApplicationReceiptEvaluation.blockers.join(',')}`);
  }
  const specs = buildEntrySpecs();
  const cache = new Map();
  const resolve = sourcePath => {
    if (!cache.has(sourcePath)) {
      cache.set(sourcePath, normalizeResolvedSource(sourcePath, resolveSourceObject(sourcePath)));
    }
    return { ...cache.get(sourcePath) };
  };
  const entries = specs.map(spec => ({
    traceKey: spec.traceKey,
    scope: spec.scope,
    requirementId: spec.requirementId,
    evidenceField: spec.evidenceField,
    evidenceKind: spec.evidenceKind,
    derivationClass: spec.derivationClass,
    bindingStatus: 'bound_for_independent_review',
    sourceBindings: spec.sourcePaths.map(resolve)
  }));
  const routeDefinition = buildRouteDefinition();
  const payload = {
    snapshotStatus: 'prepared_for_independent_review',
    baseline: { ...BASELINE },
    routeDefinitionSha256: sha256Canonical(routeDefinition),
    counts: {
      phaseRequirementCount: PHASE_REQUIREMENTS.length,
      objectiveInvariantCount: OBJECTIVE_INVARIANTS.length,
      phaseTraceEntryCount: PHASE_REQUIREMENTS.reduce((count, phase) => count + phase.requiredEvidence.length, 0),
      invariantTraceEntryCount: OBJECTIVE_INVARIANTS.reduce((count, invariant) => count + invariant.requiredEvidence.length, 0),
      totalTraceEntryCount: entries.length,
      resolvedTraceEntryCount: entries.length,
      fakePlaceholderRefCount: 0,
      uniqueEvidenceFieldCount: new Set(specs.map(spec => spec.evidenceField)).size,
      uniqueSourceObjectCount: cache.size,
      exactAuthorizedReceiptEntryCount: specs.filter(spec => spec.evidenceKind === 'exact_authorized_receipt').length,
      externalReviewEntryCount: specs.filter(spec => spec.evidenceKind === 'external_review').length
    },
    currentState: {
      phase8Completed: true,
      fullPlanPackCompleted: false,
      readinessClaimed: false
    },
    entries,
    candidateAudit: buildCandidateAuditSummary(),
    semanticEvidenceChecks: {
      phase2ApplicationBindingReceiptContractAccepted: true,
      phase2ExactEvidenceApplied: true,
      phase2ApplicationCommitBound: true,
      phase2ReceiptTimeUpstreamGitRevalidationPassed: true,
      phase2DurableClaimReceiptStateAccepted: true,
      supersededCm2074UsedAsCurrentAuthority: false,
      supersededR1UsedAsCurrentAuthority: false
    },
    reviewBoundary: {
      independentReviewRequired: true,
      independentReviewPassed: false,
      semanticRouteReviewPassed: false,
      gitObjectReviewPassed: false,
      applicationReviewIsSeparate: true,
      applicationPrepared: false,
      applicationAuthorized: false,
      snapshotApplied: false
    },
    nonClaims: {
      productionReady: false,
      releaseReady: false,
      deployReady: false,
      cutoverReady: false,
      rcReady: false,
      completeV8: false,
      modelMemoryComplete: false,
      fullRealtimeMemory: false,
      fullBridgeCompletion: false
    },
    sideEffects: {
      nativeReads: 0,
      nativeWrites: 0,
      durableMutations: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      remoteActions: 0,
      readinessClaims: 0
    }
  };
  return {
    schemaVersion: 3,
    taskId: TASK_ID,
    snapshotType: SNAPSHOT_TYPE,
    canonicalPayloadSha256: sha256Canonical(payload),
    payload
  };
}

module.exports = {
  BASELINE,
  CHAIN_SOURCE_BY_FIELD,
  EXTERNAL_LOCAL_SOURCE_BY_FIELD,
  INVARIANT_DEFAULT_SOURCES,
  LOCAL_VALIDATION_RECEIPT_PATH,
  PHASE2_APPLICATION_RECEIPT_PATH,
  PHASE_DEFAULT_SOURCES,
  PHASE_FIELD_SOURCES,
  SNAPSHOT_TYPE,
  TASK_ID,
  buildCandidateAuditSummary,
  buildEntrySpecs,
  buildRouteDefinition,
  buildSnapshot,
  canonicalize,
  derivationClassFor,
  evidenceKindFor,
  requiredTraceDescriptors,
  renderCanonicalSnapshotMarkdown,
  sha256,
  sha256Canonical,
  sourcePathsFor
};
