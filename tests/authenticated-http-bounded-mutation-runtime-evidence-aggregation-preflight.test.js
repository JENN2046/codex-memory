'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const {
  REQUIRED_RUNTIME_EVIDENCE_UNIT_IDS,
  RUNTIME_EVIDENCE_GAP_ID_ALLOWLIST
} = require('../src/core/AuthenticatedHttpBoundedMutationProofRuntimeEvidenceIntake');
const {
  buildAuthenticatedHttpBoundedMutationProofRuntimeEvidenceReport
} = require('../src/core/AuthenticatedHttpBoundedMutationProofRuntimeEvidenceReport');
const {
  AGGREGATION_PREFLIGHT_SCHEMA_VERSION,
  buildAuthenticatedHttpBoundedMutationRuntimeEvidenceAggregationPreflight
} = require('../src/core/AuthenticatedHttpBoundedMutationRuntimeEvidenceAggregationPreflight');
const {
  buildCliReport,
  buildRcCutoverCandidateArtifactExport,
  buildRcCutoverCandidateArtifactIntakePrecheck,
  buildRcCutoverFinalOwnerReviewPackageAggregation,
  buildRcCutoverOwnerApprovalBoundaryPrecheck,
  buildRcCutoverOwnerApprovalExecutionBoundaryPrecheck,
  parseArgs,
  readRcCutoverCandidateArtifactReportInput,
  readRcCutoverFinalOwnerReviewPackageReportInput,
  readRcCutoverOwnerApprovalBoundaryReportInput,
  readRuntimeEvidenceReportInput
} = require('../src/cli/v1-rc-validation-aggregator');

const repoRoot = path.resolve(__dirname, '..');
const aggregatorCliPath = path.join('src', 'cli', 'v1-rc-validation-aggregator.js');
const fixtureCommit = 'abc1234def5678';
const fixtureEvidenceGeneratedAt = '2026-07-07T00:30:00.000Z';
const SHA256_HEX_RE = /^[a-f0-9]{64}$/;

function assertSourceChainProof(
  proof,
  { stageId, upstreamStageId, requiredChainRowCount }
) {
  assert.equal(proof.proofVersion, 'rc-cutover-source-chain-proof-v1');
  assert.equal(proof.stageId, stageId);
  assert.equal(proof.generatedBy, 'v1-rc-validation-aggregator');
  assert.equal(proof.lowDisclosure, true);
  assert.equal(proof.stageAccepted, true);
  assert.equal(proof.requiredChainRowCount, requiredChainRowCount);
  assert.equal(proof.acceptedChainRowCount, requiredChainRowCount);
  assert.equal(proof.upstreamStageId, upstreamStageId);
  if (upstreamStageId) {
    assert.match(proof.upstreamProofDigest, SHA256_HEX_RE);
  } else {
    assert.equal(proof.upstreamProofDigest, '');
  }
  assert.match(proof.artifactDigest, SHA256_HEX_RE);
  assert.equal(proof.fieldValueDisclosure, false);
  assert.equal(proof.approvalMaterialIncluded, false);
  assert.equal(proof.executionAuthorizationIncluded, false);
  assert.equal(proof.readinessClaimIncluded, false);
  assert.equal(proof.rawValuesOutput, false);
}

function assertNoForbiddenMaterial(payload) {
  const scannedPayload = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? {
        ...payload,
        forbiddenFragments: undefined,
        forbiddenTopLevelKeys: undefined
      }
    : payload;
  const serialized = JSON.stringify(scannedPayload);
  for (const pattern of [
    /http:\/\/127\.0\.0\.1/i,
    /Bearer [A-Za-z0-9._-]+/i,
    new RegExp('Authorization' + ':', 'i'),
    /codex-memory-http-bounded-mutation-proof/i,
    /bounded-cleanup-proof-runner/i,
    /http-runner-tombstone-memory/i,
    /http-runner-supersede-old-memory/i,
    /http-runner-supersede-new-memory/i,
    /Synthetic temp-local chunk/i,
    new RegExp(fixtureCommit, 'i'),
    new RegExp(fixtureEvidenceGeneratedAt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  ]) {
    assert.doesNotMatch(serialized, pattern);
  }
}

async function buildExactLowDisclosureReport() {
  return buildAuthenticatedHttpBoundedMutationProofRuntimeEvidenceReport({
    currentHeadCommit: fixtureCommit,
    expectedCurrentHeadCommit: fixtureCommit,
    evidenceGeneratedAt: fixtureEvidenceGeneratedAt,
    generatedAt: '2026-07-07T01:00:00.000Z',
    evidenceUnitIds: [...REQUIRED_RUNTIME_EVIDENCE_UNIT_IDS],
    localRuntimeEvidenceMatrixExecuted: true,
    allowlistedFinalRcEvidenceRunnerExecuted: true
  });
}

async function buildZeroGapLowDisclosureReport() {
  return buildAuthenticatedHttpBoundedMutationProofRuntimeEvidenceReport({
    currentHeadCommit: fixtureCommit,
    expectedCurrentHeadCommit: fixtureCommit,
    evidenceGeneratedAt: fixtureEvidenceGeneratedAt,
    generatedAt: '2026-07-07T01:00:00.000Z',
    evidenceUnitIds: [...REQUIRED_RUNTIME_EVIDENCE_UNIT_IDS],
    localRuntimeEvidenceMatrixExecuted: true,
    allowlistedFinalRcEvidenceRunnerExecuted: true,
    locallyEvidencedRuntimeGaps: [...RUNTIME_EVIDENCE_GAP_ID_ALLOWLIST],
    remainingRuntimeGaps: []
  });
}

async function buildAcceptedRcCutoverCandidateArtifact() {
  const sourceReport = await buildZeroGapLowDisclosureReport();
  const report = buildCliReport({
    runtimeEvidenceReport: sourceReport,
    runtimeEvidenceCurrentHead: fixtureCommit,
    runtimeEvidenceExpectedCurrentHead: fixtureCommit,
    runtimeEvidenceGeneratedAt: fixtureEvidenceGeneratedAt,
    generatedAt: '2026-07-07T01:00:00.000Z'
  });

  return report.evidence.p72RcCutoverCandidateArtifactExport;
}

async function buildAcceptedRcCutoverOwnerApprovalBoundary() {
  const artifact = await buildAcceptedRcCutoverCandidateArtifact();
  const intake = buildRcCutoverCandidateArtifactIntakePrecheck({
    rcCutoverCandidateArtifactExport: artifact
  });

  return buildRcCutoverOwnerApprovalBoundaryPrecheck({
    rcCutoverCandidateArtifactIntakePrecheck: intake
  });
}

async function buildAcceptedRcCutoverFinalOwnerReviewPackage() {
  const boundary = await buildAcceptedRcCutoverOwnerApprovalBoundary();

  return buildRcCutoverFinalOwnerReviewPackageAggregation({
    rcCutoverOwnerApprovalBoundaryPrecheck: boundary
  });
}

function assertArtifactExportNeverExecutes(artifact) {
  assert.equal(artifact.decision, 'NOT_READY_BLOCKED');
  assert.equal(artifact.approvalRequestOnly, true);
  assert.equal(artifact.approvalRequestSubmitted, false);
  assert.equal(artifact.approvalLineGenerated, false);
  assert.equal(artifact.approvalTextGenerated, false);
  assert.equal(artifact.ownerApprovalPresent, false);
  assert.equal(artifact.ownerApprovalAccepted, false);
  assert.equal(artifact.ownerApprovalExecutionAllowed, false);
  assert.equal(artifact.rcCutoverApproved, false);
  assert.equal(artifact.rcCutoverExecuted, false);
  assert.equal(artifact.rcCutoverExecutionAllowed, false);
  assert.equal(artifact.rcReady, false);
  assert.equal(artifact.export.mode, 'json_stdout_only');
  assert.equal(artifact.export.jsonStdoutOnly, true);
  assert.equal(artifact.export.fileWritten, false);
  assert.equal(artifact.export.durableArtifactWritten, false);
  assert.equal(artifact.export.pathOutput, false);
  assert.equal(artifact.export.pathPersisted, false);
  assert.equal(artifact.manifest.ownerApprovalRequiredSeparately, true);
  assert.equal(artifact.manifest.ownerApprovalIncluded, false);
  assert.equal(artifact.manifest.executionAuthorizationIncluded, false);
  assert.equal(artifact.manifest.canClaimRcReady, false);
  assert.equal(artifact.disclosure.lowDisclosure, true);
  assert.equal(artifact.disclosure.rawCurrentHeadCommitOutput, false);
  assert.equal(artifact.disclosure.rawEvidenceGeneratedAtOutput, false);
  assert.equal(artifact.disclosure.approvalTextOutput, false);
  assert.equal(artifact.disclosure.approvalLineOutput, false);
  assert.equal(artifact.disclosure.endpointOrLocatorOutput, false);
  assert.equal(artifact.disclosure.requestBodyOutput, false);
  assert.equal(artifact.disclosure.rawResponseOutput, false);
  assert.equal(artifact.disclosure.rawErrorOutput, false);
  assert.equal(artifact.disclosure.secretOutput, false);
  assert.equal(artifact.disclosure.privateMemoryContentOutput, false);
  assert.equal(artifact.disclosure.artifactPathOutput, false);
  assert.equal(artifact.safety.executesCommands, false);
  assert.equal(artifact.safety.startsServices, false);
  assert.equal(artifact.safety.callsProviders, false);
  assert.equal(artifact.safety.callsMcpTools, false);
  assert.equal(artifact.safety.readsRealMemory, false);
  assert.equal(artifact.safety.writesDurableState, false);
  assert.equal(artifact.safety.writesDurableMemory, false);
  assert.equal(artifact.safety.writesDurableAudit, false);
  assert.equal(artifact.safety.writesArtifactFile, false);
  assert.equal(artifact.safety.expandsPublicMcp, false);
  assert.equal(artifact.safety.remoteWrites, false);
  assert.equal(artifact.safety.pushes, false);
  assert.equal(artifact.safety.tags, false);
  assert.equal(artifact.safety.releases, false);
  assert.equal(artifact.safety.deploys, false);
  assert.equal(artifact.safety.submitsApprovalRequest, false);
  assert.equal(artifact.safety.executesCutover, false);
  assert.equal(artifact.safety.readinessClaimed, false);
  assert.equal(artifact.canClaimRuntimeReady, false);
  assert.equal(artifact.canClaimFinalRcReady, false);
  assert.equal(artifact.canClaimV1RcReady, false);
  assert.equal(artifact.canClaimRcReady, false);
}

function assertBlockedArtifactExport(artifact, expectedBlockerId) {
  assert.equal(artifact.schemaVersion, 'p72-rc-cutover-candidate-artifact-export-v1');
  assert.equal(artifact.artifactType, 'rc_cutover_pre_candidate_evidence_artifact_export');
  assert.equal(artifact.status, 'artifact_blocked_pending_final_evidence_package_acceptance');
  assert.equal(artifact.artifactAccepted, false);
  assert.equal(artifact.artifactReadyForOwnerReview, false);
  assert.ok(
    artifact.blockerIds.includes('final_evidence_package_aggregation_outlet_not_accepted')
  );
  assert.ok(artifact.blockerIds.includes(expectedBlockerId));
  assert.equal(artifact.manifest.sourceArtifactAccepted, false);
  assertArtifactExportNeverExecutes(artifact);
}

function assertAcceptedArtifactExport(artifact) {
  assert.equal(artifact.schemaVersion, 'p72-rc-cutover-candidate-artifact-export-v1');
  assert.equal(artifact.artifactType, 'rc_cutover_pre_candidate_evidence_artifact_export');
  assert.equal(artifact.status, 'artifact_ready_for_exact_owner_review_not_authorization');
  assert.equal(artifact.artifactAccepted, true);
  assert.equal(artifact.artifactReadyForOwnerReview, true);
  assert.deepEqual(artifact.blockerIds, []);
  assert.equal(
    artifact.manifest.sourceArtifactSchemaVersion,
    'p71-rc-cutover-final-evidence-package-aggregation-outlet-v1'
  );
  assert.equal(artifact.manifest.sourceArtifactAccepted, true);
  assert.ok(
    artifact.manifest.includedPackageRefs.includes(
      'p71RcCutoverFinalEvidencePackageAggregationOutlet'
    )
  );
  assert.deepEqual(artifact.manifest.requiredInputFamilies, [
    'sanitized_runtime_evidence_report',
    'separate_exact_head_bound_runtime_summary_input'
  ]);
  assert.ok(artifact.manifest.excludedMaterial.includes('raw_current_head_commit'));
  assert.ok(artifact.manifest.excludedMaterial.includes('approval_text'));
  assert.ok(artifact.manifest.excludedMaterial.includes('endpoint_or_locator'));
  assert.ok(artifact.manifest.excludedMaterial.includes('raw_response'));
  assert.ok(artifact.manifest.excludedMaterial.includes('secret'));
  assert.equal(artifact.finalEvidencePackageAggregationOutlet.aggregationOutletAccepted, true);
  assertSourceChainProof(
    artifact.finalEvidencePackageAggregationOutlet.sourceChainProof,
    {
      stageId: 'p71_rc_cutover_final_evidence_package_aggregation_outlet',
      upstreamStageId: '',
      requiredChainRowCount: 5
    }
  );
  assertSourceChainProof(artifact.sourceChainProof, {
    stageId: 'p72_rc_cutover_candidate_artifact_export',
    upstreamStageId: 'p71_rc_cutover_final_evidence_package_aggregation_outlet',
    requiredChainRowCount: 6
  });
  assertArtifactExportNeverExecutes(artifact);
}

function assertAcceptedArtifactIntake(intake) {
  assert.equal(
    intake.schemaVersion,
    'p73-rc-cutover-candidate-artifact-intake-precheck-v1'
  );
  assert.equal(intake.intakeType, 'rc_cutover_candidate_artifact_intake_precheck');
  assert.equal(intake.sourceMode, 'p72_rc_cutover_candidate_artifact_export');
  assert.equal(
    intake.status,
    'candidate_artifact_intake_accepted_for_owner_review_not_authorization'
  );
  assert.equal(intake.decision, 'NOT_READY_BLOCKED');
  assert.equal(intake.artifactInputProvided, true);
  assert.equal(intake.inputAccepted, true);
  assert.equal(intake.ownerReviewInputReady, true);
  assert.equal(intake.artifactAcceptedByInput, true);
  assert.equal(intake.artifactReadyForOwnerReview, true);
  assert.equal(intake.approvalRequestOnly, true);
  assert.equal(intake.approvalRequestSubmitted, false);
  assert.equal(intake.approvalLineGenerated, false);
  assert.equal(intake.approvalTextGenerated, false);
  assert.equal(intake.ownerApprovalPresent, false);
  assert.equal(intake.ownerApprovalAccepted, false);
  assert.equal(intake.ownerApprovalExecutionAllowed, false);
  assert.equal(intake.rcCutoverApproved, false);
  assert.equal(intake.rcCutoverExecuted, false);
  assert.equal(intake.rcCutoverExecutionAllowed, false);
  assert.equal(intake.rcReady, false);
  assert.equal(intake.manifestSummary.sourceArtifactAccepted, true);
  assert.equal(intake.manifestSummary.ownerApprovalRequiredSeparately, true);
  assert.equal(intake.manifestSummary.ownerApprovalIncluded, false);
  assert.equal(intake.manifestSummary.executionAuthorizationIncluded, false);
  assert.equal(intake.manifestSummary.canClaimRcReady, false);
  assert.equal(intake.finalEvidencePackageSummary.aggregationOutletAccepted, true);
  assert.equal(intake.finalEvidencePackageSummary.ownerReviewReady, true);
  assert.equal(intake.finalEvidencePackageSummary.missingRowCount, 0);
  assert.equal(intake.finalEvidencePackageSummary.blockerCount, 0);
  assert.equal(intake.finalEvidencePackageSummary.rcCutoverExecutionAllowed, false);
  assert.equal(intake.finalEvidencePackageSummary.rcReady, false);
  assert.deepEqual(intake.blockerIds, []);
  assert.equal(intake.disclosure.lowDisclosure, true);
  assert.equal(intake.disclosure.rawCurrentHeadCommitOutput, false);
  assert.equal(intake.disclosure.rawEvidenceGeneratedAtOutput, false);
  assert.equal(intake.disclosure.approvalTextOutput, false);
  assert.equal(intake.disclosure.endpointOrLocatorOutput, false);
  assert.equal(intake.disclosure.rawResponseOutput, false);
  assert.equal(intake.disclosure.secretOutput, false);
  assert.equal(intake.disclosure.artifactPathOutput, false);
  assert.equal(intake.disclosure.rawInputPrinted, false);
  assert.equal(intake.safety.readsCandidateArtifactInputOnly, true);
  assert.equal(intake.safety.executesCommands, false);
  assert.equal(intake.safety.callsProviders, false);
  assert.equal(intake.safety.callsMcpTools, false);
  assert.equal(intake.safety.readsRealMemory, false);
  assert.equal(intake.safety.writesDurableState, false);
  assert.equal(intake.safety.writesArtifactFile, false);
  assert.equal(intake.safety.remoteWrites, false);
  assert.equal(intake.safety.submitsApprovalRequest, false);
  assert.equal(intake.safety.executesCutover, false);
  assert.equal(intake.safety.readinessClaimed, false);
  assert.equal(intake.canClaimRuntimeReady, false);
  assert.equal(intake.canClaimFinalRcReady, false);
  assert.equal(intake.canClaimV1RcReady, false);
  assert.equal(intake.canClaimRcReady, false);
  assertSourceChainProof(intake.sourceChainProof, {
    stageId: 'p73_rc_cutover_candidate_artifact_intake_precheck',
    upstreamStageId: 'p72_rc_cutover_candidate_artifact_export',
    requiredChainRowCount: 7
  });
}

function assertAcceptedOwnerApprovalBoundaryPrecheck(boundary) {
  assert.equal(
    boundary.schemaVersion,
    'p75-rc-cutover-owner-approval-boundary-precheck-v1'
  );
  assert.equal(
    boundary.boundaryType,
    'rc_cutover_owner_approval_boundary_precheck_display'
  );
  assert.equal(boundary.sourceMode, 'p73_rc_cutover_candidate_artifact_intake_precheck');
  assert.equal(
    boundary.status,
    'owner_approval_boundary_display_ready_not_authorization'
  );
  assert.equal(boundary.decision, 'NOT_READY_BLOCKED');
  assert.equal(boundary.boundaryPrecheckAccepted, true);
  assert.equal(boundary.ownerReviewInputAccepted, true);
  assert.equal(boundary.ownerReviewInputReady, true);
  assert.equal(boundary.ownerApprovalBoundaryDisplayReady, true);
  assert.equal(boundary.approvalRequestOnly, true);
  assert.equal(boundary.approvalRequestSubmitted, false);
  assert.equal(boundary.approvalLineGenerated, false);
  assert.equal(boundary.approvalTextGenerated, false);
  assert.equal(boundary.ownerApprovalPresent, false);
  assert.equal(boundary.ownerApprovalAccepted, false);
  assert.equal(boundary.ownerApprovalExecutionAllowed, false);
  assert.equal(boundary.rcCutoverApproved, false);
  assert.equal(boundary.rcCutoverExecuted, false);
  assert.equal(boundary.rcCutoverExecutionAllowed, false);
  assert.equal(boundary.rcReady, false);
  assert.equal(boundary.boundaryFieldCount, 6);
  assert.deepEqual(
    boundary.requiredBoundaryFields.map(field => field.id),
    [
      'current_head_binding',
      'remote_release_tag_deploy_action_list',
      'config_watchdog_startup_change_scope',
      'rollback_path',
      'validation_commands',
      'single_use_statement'
    ]
  );
  assert.equal(
    boundary.requiredBoundaryFields.every(field => field.valueIncluded === false),
    true
  );
  assert.equal(
    boundary.requiredBoundaryFields.every(field => field.rawValueOutput === false),
    true
  );
  assert.equal(boundary.requiredBoundaryFieldValuesIncluded, false);
  assert.equal(boundary.requiredBoundaryRawValuesOutput, false);
  assert.equal(boundary.requiredBoundaryRawValuesPersisted, false);
  assert.equal(boundary.generatedApprovalMaterial.approvalLineGenerated, false);
  assert.equal(boundary.generatedApprovalMaterial.approvalTextGenerated, false);
  assert.equal(boundary.generatedApprovalMaterial.approvalTemplateGenerated, false);
  assert.equal(boundary.generatedApprovalMaterial.approvalRequestSubmitted, false);
  assert.equal(boundary.generatedApprovalMaterial.ownerApprovalAccepted, false);
  assert.equal(boundary.generatedApprovalMaterial.executionAuthorizationIncluded, false);
  assert.equal(boundary.sourceSummary.manifestOwnerApprovalRequiredSeparately, true);
  assert.equal(boundary.sourceSummary.finalEvidencePackageAggregationOutletAccepted, true);
  assert.equal(boundary.sourceSummary.finalEvidencePackageOwnerReviewReady, true);
  assert.equal(boundary.sourceSummary.finalEvidencePackageMissingRowCount, 0);
  assert.equal(boundary.sourceSummary.finalEvidencePackageBlockerCount, 0);
  assert.deepEqual(boundary.blockerIds, []);
  assert.equal(boundary.disclosure.lowDisclosure, true);
  assert.equal(boundary.disclosure.rawCurrentHeadCommitOutput, false);
  assert.equal(boundary.disclosure.rawEvidenceGeneratedAtOutput, false);
  assert.equal(boundary.disclosure.requiredOwnerApprovalFieldValuesOutput, false);
  assert.equal(boundary.disclosure.approvalTextOutput, false);
  assert.equal(boundary.disclosure.approvalLineOutput, false);
  assert.equal(boundary.disclosure.approvalTemplateOutput, false);
  assert.equal(boundary.disclosure.endpointOrLocatorOutput, false);
  assert.equal(boundary.disclosure.rawResponseOutput, false);
  assert.equal(boundary.disclosure.secretOutput, false);
  assert.equal(boundary.disclosure.artifactPathOutput, false);
  assert.equal(boundary.safety.readsCandidateArtifactIntakeOnly, true);
  assert.equal(boundary.safety.executesCommands, false);
  assert.equal(boundary.safety.callsProviders, false);
  assert.equal(boundary.safety.callsMcpTools, false);
  assert.equal(boundary.safety.readsRealMemory, false);
  assert.equal(boundary.safety.writesDurableState, false);
  assert.equal(boundary.safety.writesArtifactFile, false);
  assert.equal(boundary.safety.remoteWrites, false);
  assert.equal(boundary.safety.submitsApprovalRequest, false);
  assert.equal(boundary.safety.executesCutover, false);
  assert.equal(boundary.safety.readinessClaimed, false);
  assert.equal(boundary.canClaimRuntimeReady, false);
  assert.equal(boundary.canClaimFinalRcReady, false);
  assert.equal(boundary.canClaimV1RcReady, false);
  assert.equal(boundary.canClaimRcReady, false);
  assertSourceChainProof(boundary.sourceChainProof, {
    stageId: 'p75_rc_cutover_owner_approval_boundary_precheck',
    upstreamStageId: 'p73_rc_cutover_candidate_artifact_intake_precheck',
    requiredChainRowCount: 8
  });
}

function assertAcceptedFinalOwnerReviewPackage(pkg) {
  assert.equal(
    pkg.schemaVersion,
    'p77-rc-cutover-final-owner-review-package-aggregation-v1'
  );
  assert.equal(
    pkg.packageType,
    'rc_cutover_final_owner_review_package_aggregation'
  );
  assert.equal(pkg.sourceMode, 'p75_rc_cutover_owner_approval_boundary_precheck');
  assert.equal(pkg.status, 'final_owner_review_package_ready_not_authorization');
  assert.equal(pkg.decision, 'NOT_READY_BLOCKED');
  assert.equal(pkg.ownerApprovalBoundaryInputProvided, true);
  assert.equal(pkg.finalOwnerReviewPackageAccepted, true);
  assert.equal(pkg.readyForExactOwnerReview, true);
  assert.equal(pkg.approvalRequestOnly, true);
  assert.equal(pkg.approvalRequestSubmitted, false);
  assert.equal(pkg.approvalLineGenerated, false);
  assert.equal(pkg.approvalTextGenerated, false);
  assert.equal(pkg.approvalTemplateGenerated, false);
  assert.equal(pkg.ownerApprovalPresent, false);
  assert.equal(pkg.ownerApprovalAccepted, false);
  assert.equal(pkg.ownerApprovalExecutionAllowed, false);
  assert.equal(pkg.rcCutoverApproved, false);
  assert.equal(pkg.rcCutoverExecuted, false);
  assert.equal(pkg.rcCutoverExecutionAllowed, false);
  assert.equal(pkg.rcReady, false);
  assert.equal(pkg.packageContents.lowDisclosure, true);
  assert.equal(pkg.packageContents.boundaryDisplayIncluded, true);
  assert.equal(pkg.packageContents.boundaryFieldCount, 6);
  assert.equal(pkg.packageContents.boundaryFieldValuesIncluded, false);
  assert.equal(pkg.packageContents.approvalMaterialIncluded, false);
  assert.equal(pkg.packageContents.executionAuthorizationIncluded, false);
  assert.equal(pkg.packageContents.ownerApprovalIncluded, false);
  assert.equal(pkg.packageContents.readinessClaimIncluded, false);
  assert.deepEqual(
    pkg.requiredBoundaryFields.map(field => field.id),
    [
      'current_head_binding',
      'remote_release_tag_deploy_action_list',
      'config_watchdog_startup_change_scope',
      'rollback_path',
      'validation_commands',
      'single_use_statement'
    ]
  );
  assert.equal(
    pkg.requiredBoundaryFields.every(field => field.valueIncluded === false),
    true
  );
  assert.equal(
    pkg.requiredBoundaryFields.every(field => field.rawValueOutput === false),
    true
  );
  assert.equal(
    pkg.sourceSummary.boundarySchemaVersion,
    'p75-rc-cutover-owner-approval-boundary-precheck-v1'
  );
  assert.equal(
    pkg.sourceSummary.boundaryStatus,
    'owner_approval_boundary_display_ready_not_authorization'
  );
  assert.equal(pkg.sourceSummary.boundaryPrecheckAccepted, true);
  assert.equal(pkg.sourceSummary.ownerApprovalBoundaryDisplayReady, true);
  assert.equal(pkg.sourceSummary.boundaryFieldCount, 6);
  assert.equal(pkg.sourceSummary.sourceBlockerCount, 0);
  assert.equal(
    pkg.sourceChainProvenance.provenanceVersion,
    'p77-source-chain-provenance-v1'
  );
  assert.equal(pkg.sourceChainProvenance.generatedBy, 'v1-rc-validation-aggregator');
  assert.equal(pkg.sourceChainProvenance.lowDisclosure, true);
  assert.equal(
    pkg.sourceChainProvenance.sourceBoundarySchemaVersion,
    'p75-rc-cutover-owner-approval-boundary-precheck-v1'
  );
  assert.equal(
    pkg.sourceChainProvenance.sourceBoundaryStatus,
    'owner_approval_boundary_display_ready_not_authorization'
  );
  assert.equal(pkg.sourceChainProvenance.sourceBoundaryAccepted, true);
  assert.equal(pkg.sourceChainProvenance.sourceBoundaryBlockerCount, 0);
  assert.deepEqual(pkg.sourceChainProvenance.priorLowDisclosureChain, [
    'p67_runtime_evidence_standard_input_preflight',
    'p68_final_evidence_aggregation_rc_gate_precheck',
    'p69_rc_cutover_pre_approval_candidate_package',
    'p70_rc_cutover_owner_approval_readiness_summary',
    'p71_rc_cutover_final_evidence_package_aggregation_outlet',
    'p72_rc_cutover_candidate_artifact_export',
    'p73_rc_cutover_candidate_artifact_intake_precheck',
    'p75_rc_cutover_owner_approval_boundary_precheck',
    'p77_rc_cutover_final_owner_review_package_aggregation'
  ]);
  assert.equal(pkg.sourceChainProvenance.requiredChainRowCount, 9);
  assert.equal(pkg.sourceChainProvenance.acceptedChainRowCount, 9);
  assert.equal(pkg.sourceChainProvenance.allPriorRowsAccepted, true);
  assert.equal(pkg.sourceChainProvenance.fieldValueDisclosure, false);
  assert.equal(pkg.sourceChainProvenance.approvalMaterialIncluded, false);
  assert.equal(pkg.sourceChainProvenance.executionAuthorizationIncluded, false);
  assert.equal(pkg.sourceChainProvenance.readinessClaimIncluded, false);
  assert.equal(pkg.sourceChainProvenance.rawValuesOutput, false);
  assert.deepEqual(pkg.blockerIds, []);
  assert.equal(pkg.disclosure.lowDisclosure, true);
  assert.equal(pkg.disclosure.rawCurrentHeadCommitOutput, false);
  assert.equal(pkg.disclosure.rawEvidenceGeneratedAtOutput, false);
  assert.equal(pkg.disclosure.requiredOwnerApprovalFieldValuesOutput, false);
  assert.equal(pkg.disclosure.approvalTextOutput, false);
  assert.equal(pkg.disclosure.approvalLineOutput, false);
  assert.equal(pkg.disclosure.approvalTemplateOutput, false);
  assert.equal(pkg.disclosure.endpointOrLocatorOutput, false);
  assert.equal(pkg.disclosure.rawResponseOutput, false);
  assert.equal(pkg.disclosure.secretOutput, false);
  assert.equal(pkg.disclosure.artifactPathOutput, false);
  assert.equal(pkg.disclosure.rawInputPrinted, false);
  assert.equal(pkg.safety.readsOwnerApprovalBoundaryInputOnly, true);
  assert.equal(pkg.safety.executesCommands, false);
  assert.equal(pkg.safety.callsProviders, false);
  assert.equal(pkg.safety.callsMcpTools, false);
  assert.equal(pkg.safety.readsRealMemory, false);
  assert.equal(pkg.safety.writesDurableState, false);
  assert.equal(pkg.safety.writesArtifactFile, false);
  assert.equal(pkg.safety.remoteWrites, false);
  assert.equal(pkg.safety.submitsApprovalRequest, false);
  assert.equal(pkg.safety.executesCutover, false);
  assert.equal(pkg.safety.readinessClaimed, false);
  assert.equal(pkg.canClaimRuntimeReady, false);
  assert.equal(pkg.canClaimFinalRcReady, false);
  assert.equal(pkg.canClaimV1RcReady, false);
  assert.equal(pkg.canClaimRcReady, false);
  assertSourceChainProof(pkg.sourceChainProof, {
    stageId: 'p77_rc_cutover_final_owner_review_package_aggregation',
    upstreamStageId: 'p75_rc_cutover_owner_approval_boundary_precheck',
    requiredChainRowCount: 9
  });
}

function assertAcceptedOwnerApprovalExecutionBoundaryPrecheck(precheck) {
  assert.equal(
    precheck.schemaVersion,
    'p78-rc-cutover-owner-approval-execution-boundary-precheck-v1'
  );
  assert.equal(
    precheck.precheckType,
    'rc_cutover_owner_approval_execution_boundary_precheck'
  );
  assert.equal(
    precheck.sourceMode,
    'p77_rc_cutover_final_owner_review_package_aggregation'
  );
  assert.equal(
    precheck.status,
    'owner_approval_execution_boundary_precheck_ready_not_authorization'
  );
  assert.equal(precheck.decision, 'NOT_READY_BLOCKED');
  assert.equal(precheck.finalOwnerReviewPackageInputProvided, true);
  assert.equal(precheck.finalOwnerReviewPackageAcceptedByInput, true);
  assert.equal(precheck.boundaryPrecheckAccepted, true);
  assert.equal(precheck.readyForExactOwnerReview, true);
  assert.equal(precheck.executionBoundaryPrepared, true);
  assert.equal(precheck.executionBoundaryReadyForExactOwnerReview, true);
  assert.equal(precheck.terminalLocalPreCandidatePackage, true);
  assert.equal(precheck.rcCutoverPreCandidatePackageAuditable, true);
  assert.equal(precheck.additionalLocalWrapperRequired, false);
  assert.equal(precheck.nextRequiredBoundary, 'separate_exact_owner_decision_or_stop');
  assert.equal(precheck.approvalRequestOnly, true);
  assert.equal(precheck.approvalRequestSubmitted, false);
  assert.equal(precheck.approvalLineGenerated, false);
  assert.equal(precheck.approvalTextGenerated, false);
  assert.equal(precheck.approvalTemplateGenerated, false);
  assert.equal(precheck.ownerApprovalRequiredSeparately, true);
  assert.equal(precheck.ownerApprovalPresent, false);
  assert.equal(precheck.ownerApprovalAccepted, false);
  assert.equal(precheck.ownerApprovalExecutionAllowed, false);
  assert.equal(precheck.rcCutoverApproved, false);
  assert.equal(precheck.rcCutoverExecuted, false);
  assert.equal(precheck.rcCutoverExecutionAllowed, false);
  assert.equal(precheck.canProceedToCutoverExecution, false);
  assert.equal(precheck.rcReady, false);
  assert.equal(precheck.executionBoundaryChecklist.lowDisclosure, true);
  assert.equal(precheck.executionBoundaryChecklist.checkCount, 8);
  assert.equal(precheck.executionBoundaryChecklist.missingCheckCount, 0);
  assert.deepEqual(precheck.executionBoundaryChecklist.missingCheckIds, []);
  assert.equal(precheck.executionBoundaryChecklist.valuesIncluded, false);
  assert.equal(precheck.executionBoundaryChecklist.rawValuesOutput, false);
  assert.deepEqual(
    precheck.executionBoundaryChecklist.rows.map(row => row.id),
    [
      'exact_owner_approval_required',
      'current_head_binding_required',
      'single_use_owner_decision_required',
      'remote_release_tag_deploy_action_list_required',
      'config_watchdog_startup_scope_required',
      'rollback_path_required',
      'validation_commands_required',
      'execution_stays_blocked'
    ]
  );
  assert.equal(
    precheck.executionBoundaryChecklist.rows.every(row => row.valueIncluded === false),
    true
  );
  assert.equal(
    precheck.executionBoundaryChecklist.rows.every(row => row.rawValueOutput === false),
    true
  );
  assert.equal(
    precheck.chainConvergence.convergenceStatus,
    'terminal_local_pre_candidate_package_ready_for_owner_decision_not_authorization'
  );
  assert.equal(precheck.chainConvergence.localEvidenceAggregationTerminal, true);
  assert.equal(precheck.chainConvergence.localRcGatePrecheckTerminal, true);
  assert.equal(precheck.chainConvergence.noAdditionalLocalWrapperRequired, true);
  assert.equal(precheck.chainConvergence.repairInsteadOfWrapWhenBlocked, true);
  assert.equal(precheck.chainConvergence.stopsBeforeApprovalRequestSubmission, true);
  assert.equal(precheck.chainConvergence.stopsBeforeOwnerApproval, true);
  assert.equal(precheck.chainConvergence.stopsBeforeExecution, true);
  assert.equal(precheck.chainConvergence.stopsBeforeReleaseDeployTag, true);
  assert.equal(precheck.chainConvergence.stopsBeforeReadinessClaim, true);
  assert.equal(precheck.chainConvergence.nextBoundaryType, 'separate_exact_owner_decision');
  assert.equal(
    precheck.chainConvergence.terminalArtifactSchemaVersion,
    'p78-rc-cutover-owner-approval-execution-boundary-precheck-v1'
  );
  assert.equal(precheck.chainConvergence.priorLowDisclosureChain.length, 10);
  assert.equal(
    precheck.chainConvergence.priorLowDisclosureChain.at(-1),
    'p78_rc_cutover_owner_approval_execution_boundary_precheck'
  );
  assert.ok(precheck.chainConvergence.omittedMaterial.includes('approval_text'));
  assert.ok(precheck.chainConvergence.omittedMaterial.includes('endpoint_or_locator'));
  assert.ok(precheck.chainConvergence.omittedMaterial.includes('secret'));
  assert.equal(
    precheck.sourceSummary.packageSchemaVersion,
    'p77-rc-cutover-final-owner-review-package-aggregation-v1'
  );
  assert.equal(precheck.sourceSummary.finalOwnerReviewPackageAccepted, true);
  assert.equal(precheck.sourceSummary.readyForExactOwnerReview, true);
  assert.equal(precheck.sourceSummary.packageBoundaryFieldCount, 6);
  assert.equal(precheck.sourceSummary.sourceBlockerCount, 0);
  assert.equal(precheck.sourceSummary.sourceChainProvenanceAccepted, true);
  assert.equal(precheck.sourceSummary.sourceChainRowCount, 9);
  assert.deepEqual(precheck.blockerIds, []);
  assert.equal(precheck.disclosure.lowDisclosure, true);
  assert.equal(precheck.disclosure.rawCurrentHeadCommitOutput, false);
  assert.equal(precheck.disclosure.rawEvidenceGeneratedAtOutput, false);
  assert.equal(precheck.disclosure.requiredOwnerApprovalFieldValuesOutput, false);
  assert.equal(precheck.disclosure.approvalTextOutput, false);
  assert.equal(precheck.disclosure.approvalLineOutput, false);
  assert.equal(precheck.disclosure.approvalTemplateOutput, false);
  assert.equal(precheck.disclosure.endpointOrLocatorOutput, false);
  assert.equal(precheck.disclosure.rawResponseOutput, false);
  assert.equal(precheck.disclosure.secretOutput, false);
  assert.equal(precheck.disclosure.artifactPathOutput, false);
  assert.equal(precheck.disclosure.rawInputPrinted, false);
  assert.equal(precheck.safety.readsFinalOwnerReviewPackageInputOnly, true);
  assert.equal(precheck.safety.executesCommands, false);
  assert.equal(precheck.safety.callsProviders, false);
  assert.equal(precheck.safety.callsMcpTools, false);
  assert.equal(precheck.safety.readsRealMemory, false);
  assert.equal(precheck.safety.writesDurableState, false);
  assert.equal(precheck.safety.writesArtifactFile, false);
  assert.equal(precheck.safety.remoteWrites, false);
  assert.equal(precheck.safety.submitsApprovalRequest, false);
  assert.equal(precheck.safety.executesCutover, false);
  assert.equal(precheck.safety.readinessClaimed, false);
  assert.equal(precheck.canClaimRuntimeReady, false);
  assert.equal(precheck.canClaimFinalRcReady, false);
  assert.equal(precheck.canClaimV1RcReady, false);
  assert.equal(precheck.canClaimRcReady, false);
}

test('runtime evidence aggregation preflight accepts standard low-disclosure source but keeps aggregator replay blocked', async () => {
  const sourceReport = await buildExactLowDisclosureReport();
  const preflight = buildAuthenticatedHttpBoundedMutationRuntimeEvidenceAggregationPreflight(
    sourceReport,
    { generatedAt: '2026-07-07T01:00:00.000Z' }
  );

  assert.equal(preflight.schemaVersion, AGGREGATION_PREFLIGHT_SCHEMA_VERSION);
  assert.equal(preflight.status, 'standard_source_accepted_aggregator_replay_blocked_not_ready');
  assert.equal(preflight.decision, 'NOT_READY_BLOCKED');
  assert.equal(preflight.standardInputSourceAccepted, true);
  assert.equal(preflight.sourceReport.accepted, true);
  assert.equal(preflight.sourceArtifact.aggregatorInputFed, true);
  assert.equal(preflight.sourceArtifact.sourcePriorAggregatorBridgeAccepted, true);
  assert.equal(preflight.sourceArtifact.lowDisclosure, true);
  assert.equal(preflight.runtimeEvidenceSummaryForAggregator.runnerExecuted, true);
  assert.equal(preflight.runtimeEvidenceSummaryForAggregator.commandsExecuted, true);
  assert.equal(preflight.runtimeEvidenceSummaryForAggregator.localRuntimeEvidenceMatrixExecuted, true);
  assert.equal(preflight.runtimeEvidenceSummaryForAggregator.allowlistedFinalRcEvidenceRunnerExecuted, true);
  assert.equal(preflight.runtimeEvidenceSummaryForAggregator.criticalGates.allCriticalCommandsPassed, true);
  assert.deepEqual(
    preflight.runtimeEvidenceSummaryForAggregator.evidenceUnitIds,
    REQUIRED_RUNTIME_EVIDENCE_UNIT_IDS
  );
  assert.equal(preflight.runtimeEvidenceSummaryForAggregator.currentHeadCommit, '');
  assert.equal(preflight.runtimeEvidenceSummaryForAggregator.expectedCurrentHeadCommit, '');
  assert.equal(preflight.runtimeEvidenceSummaryForAggregator.evidenceGeneratedAt, '');
  assert.equal(preflight.aggregatorReplay.fed, true);
  assert.equal(preflight.aggregatorReplay.decision, 'NOT_READY_BLOCKED');
  assert.equal(preflight.aggregatorReplay.accepted, false);
  assert.equal(preflight.aggregatorReplay.rejected, true);
  assert.equal(preflight.aggregatorReplay.rejectReason, 'current_head_binding_required');
  assert.equal(preflight.aggregatorReplay.canClaimV1RcReady, false);
  assert.equal(preflight.disclosure.currentHeadCommitIncluded, false);
  assert.equal(preflight.safety.executesCommands, false);
  assert.equal(preflight.safety.callsProviders, false);
  assert.equal(preflight.safety.readinessClaimed, false);
  assert.deepEqual(preflight.blockers, []);
  assertNoForbiddenMaterial(preflight);
});

test('runtime evidence aggregation preflight accepts separate exact head-bound input without leaking raw values', async () => {
  const sourceReport = await buildExactLowDisclosureReport();
  const preflight = buildAuthenticatedHttpBoundedMutationRuntimeEvidenceAggregationPreflight(
    sourceReport,
    {
      generatedAt: '2026-07-07T01:00:00.000Z',
      exactHeadBoundRuntimeSummaryInput: {
        currentHeadCommit: fixtureCommit,
        expectedCurrentHeadCommit: fixtureCommit,
        evidenceGeneratedAt: fixtureEvidenceGeneratedAt
      }
    }
  );

  assert.equal(
    preflight.status,
    'standard_source_and_exact_head_bound_input_accepted_not_ready'
  );
  assert.equal(preflight.decision, 'NOT_READY_BLOCKED');
  assert.equal(preflight.standardInputSourceAccepted, true);
  assert.equal(preflight.exactHeadBoundRuntimeSummaryInput.provided, true);
  assert.equal(preflight.exactHeadBoundRuntimeSummaryInput.accepted, true);
  assert.equal(preflight.exactHeadBoundRuntimeSummaryInput.rejected, false);
  assert.equal(preflight.exactHeadBoundRuntimeSummaryInput.currentHeadBindingMatched, true);
  assert.equal(preflight.exactHeadBoundRuntimeSummaryInput.rawValuesOutput, false);
  assert.equal(preflight.exactHeadBoundRuntimeSummaryInput.rawValuesPersisted, false);
  assert.equal(preflight.runtimeEvidenceSummaryForAggregator.currentHeadCommit, '');
  assert.equal(preflight.runtimeEvidenceSummaryForAggregator.expectedCurrentHeadCommit, '');
  assert.equal(preflight.runtimeEvidenceSummaryForAggregator.evidenceGeneratedAt, '');
  assert.equal(preflight.runtimeEvidenceSummaryForAggregator.exactHeadBoundInputProvided, true);
  assert.equal(preflight.runtimeEvidenceSummaryForAggregator.exactHeadBoundInputAccepted, true);
  assert.equal(preflight.aggregatorReplay.accepted, true);
  assert.equal(preflight.aggregatorReplay.rejected, false);
  assert.equal(preflight.aggregatorReplay.rejectReason, '');
  assert.equal(preflight.aggregatorReplay.currentHeadBindingStatus, 'matched');
  assert.equal(preflight.aggregatorReplay.currentHeadBindingMatched, true);
  assert.equal(preflight.aggregatorReplay.evidenceFreshnessStatus, 'fresh');
  assert.equal(preflight.aggregatorReplay.evidenceUnitCount, 5);
  assert.equal(preflight.aggregatorReplay.requiredEvidenceUnitCount, 5);
  assert.equal(preflight.aggregatorReplay.missingEvidenceUnitCount, 0);
  assert.equal(preflight.aggregatorReplay.evidenceUnitsComplete, true);
  assert.equal(preflight.aggregatorReplay.canClaimV1RcReady, false);
  assert.equal(preflight.disclosure.currentHeadCommitIncluded, false);
  assert.equal(preflight.disclosure.evidenceGeneratedAtIncluded, false);
  assert.equal(preflight.safety.readinessClaimed, false);
  assert.deepEqual(preflight.blockers, []);
  assertNoForbiddenMaterial(preflight);
});

test('v1 RC aggregator CLI can consume runtime evidence JSON from stdin without claiming readiness', async () => {
  const sourceReport = await buildExactLowDisclosureReport();
  const result = spawnSync(
    process.execPath,
    [
      aggregatorCliPath,
      '--runtime-evidence-report',
      '-',
      '--generated-at',
      '2026-07-07T01:00:00.000Z'
    ],
    {
      cwd: repoRoot,
      input: JSON.stringify(sourceReport),
      encoding: 'utf8',
      timeout: 30000,
      env: {
        ...process.env,
        NODE_NO_WARNINGS: '1',
        CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: 'false'
      }
    }
  );
  const report = JSON.parse(result.stdout);
  const preflight =
    report.evidence.p67AuthenticatedHttpBoundedMutationRuntimeEvidencePreflight;
  const rcGatePrecheck =
    report.evidence.p68FinalEvidenceAggregationRcGatePrecheck;
  const candidatePackage =
    report.evidence.p69RcCutoverPreApprovalCandidatePackage;
  const ownerApprovalSummary =
    report.evidence.p70RcCutoverOwnerApprovalReadinessSummary;
  const finalEvidencePackage =
    report.evidence.p71RcCutoverFinalEvidencePackageAggregationOutlet;
  const artifactExport =
    report.evidence.p72RcCutoverCandidateArtifactExport;

  assert.equal(result.status, 0, result.stderr);
  assert.equal(report.phase, 'P67-runtime-evidence-standard-input-preflight');
  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.summary.runtimeEvidenceReportInputProvided, true);
  assert.equal(report.summary.runtimeEvidenceReportStandardInputSourceAccepted, false);
  assert.equal(report.summary.runtimeEvidenceReportAggregatorReplayFed, true);
  assert.equal(report.summary.runtimeEvidenceReportAggregatorReplayAccepted, false);
  assert.equal(report.summary.runtimeEvidenceReportAggregatorReplayRejected, true);
  assert.equal(report.summary.runtimeEvidenceReportCanClaimV1RcReady, false);
  assert.equal(report.summary.runtimeEvidenceSummaryAccepted, false);
  assert.equal(report.summary.runtimeEvidenceSummaryRejected, true);
  assert.equal(
    report.summary.runtimeEvidenceSummaryStatus,
    'runtime_evidence_summary_rejected'
  );
  assert.equal(report.runtimeEvidenceReportInput.pathDisclosed, false);
  assert.equal(report.runtimeEvidenceReportInput.rawInputPrinted, false);
  assert.equal(preflight.standardInputSourceAccepted, false);
  assert.ok(preflight.blockers.includes('source_report_not_same_process'));
  assert.equal(preflight.aggregatorReplay.rejectReason, 'current_head_binding_required');
  assert.equal(preflight.aggregatorReplay.canClaimV1RcReady, false);
  assert.equal(rcGatePrecheck.standardInputSourceAccepted, false);
  assert.equal(rcGatePrecheck.exactHeadBoundInputProvided, false);
  assert.equal(rcGatePrecheck.exactHeadBoundInputAccepted, false);
  assert.equal(rcGatePrecheck.runtimeEvidenceSummaryAccepted, false);
  assert.equal(rcGatePrecheck.rcGatePrecheckAccepted, false);
  assert.equal(rcGatePrecheck.currentHeadBindingStatus, 'not_provided');
  assert.equal(rcGatePrecheck.rcGateRows.freshCurrentHeadAccepted, false);
  assert.equal(rcGatePrecheck.canClaimRcReady, false);
  assert.equal(rcGatePrecheck.safety.readinessClaimed, false);
  assert.equal(candidatePackage.status, 'candidate_package_blocked_pending_required_preapproval_evidence');
  assert.equal(candidatePackage.candidatePackageAccepted, false);
  assert.equal(candidatePackage.readyToRequestRcCutoverApproval, false);
  assert.equal(candidatePackage.rcCutoverApprovalPresent, false);
  assert.equal(candidatePackage.rcCutoverExecutionAllowed, false);
  assert.equal(candidatePackage.rcReady, false);
  assert.ok(candidatePackage.blockerIds.includes('exact_head_bound_runtime_summary_input_not_accepted'));
  assert.equal(candidatePackage.canClaimRcReady, false);
  assert.equal(
    ownerApprovalSummary.status,
    'owner_approval_readiness_summary_blocked_pending_candidate_package_acceptance'
  );
  assert.equal(ownerApprovalSummary.ownerReviewReady, false);
  assert.equal(ownerApprovalSummary.approvalRequestSubmitted, false);
  assert.equal(ownerApprovalSummary.approvalLineGenerated, false);
  assert.equal(ownerApprovalSummary.ownerApprovalPresent, false);
  assert.equal(ownerApprovalSummary.rcCutoverExecutionAllowed, false);
  assert.equal(ownerApprovalSummary.rcReady, false);
  assert.ok(
    ownerApprovalSummary.blockerIds.includes(
      'rc_cutover_pre_approval_candidate_package_not_accepted'
    )
  );
  assert.ok(
    ownerApprovalSummary.blockerIds.includes(
      'exact_head_bound_runtime_summary_input_not_accepted'
    )
  );
  assert.equal(ownerApprovalSummary.canClaimRcReady, false);
  assert.equal(
    finalEvidencePackage.status,
    'final_evidence_package_blocked_pending_complete_low_disclosure_chain'
  );
  assert.equal(finalEvidencePackage.decision, 'NOT_READY_BLOCKED');
  assert.equal(finalEvidencePackage.aggregationOutletAccepted, false);
  assert.equal(finalEvidencePackage.ownerReviewReady, false);
  assert.equal(finalEvidencePackage.approvalRequestSubmitted, false);
  assert.equal(finalEvidencePackage.approvalLineGenerated, false);
  assert.equal(finalEvidencePackage.ownerApprovalPresent, false);
  assert.equal(finalEvidencePackage.rcCutoverExecutionAllowed, false);
  assert.equal(finalEvidencePackage.rcReady, false);
  assert.ok(
    finalEvidencePackage.blockerIds.includes(
      'p67_runtime_evidence_standard_input_preflight_not_accepted'
    )
  );
  assert.ok(
    finalEvidencePackage.blockerIds.includes(
      'p68_final_evidence_aggregation_rc_gate_precheck_not_accepted'
    )
  );
  assert.equal(finalEvidencePackage.chain.missingRowCount, 4);
  assert.equal(finalEvidencePackage.disclosure.lowDisclosure, true);
  assert.equal(finalEvidencePackage.safety.executesCommands, false);
  assert.equal(finalEvidencePackage.safety.submitsApprovalRequest, false);
  assert.equal(finalEvidencePackage.safety.executesCutover, false);
  assert.equal(finalEvidencePackage.canClaimRcReady, false);
  assertBlockedArtifactExport(
    artifactExport,
    'p67_runtime_evidence_standard_input_preflight_not_accepted'
  );
  assert.equal(
    artifactExport.finalEvidencePackageAggregationOutlet.aggregationOutletAccepted,
    false
  );
  assert.equal(report.summary.rc9DecisionPacketCanClaimRcReady, false);
  assert.equal(report.summary.finalEvidenceAggregationRcGatePrecheckAccepted, false);
  assert.equal(report.summary.rcGatePrecheckFreshCurrentHeadAccepted, false);
  assert.equal(report.summary.rcGatePrecheckCanClaimRcReady, false);
  assert.equal(report.summary.rcCutoverPreApprovalCandidatePackageAccepted, false);
  assert.equal(report.summary.rcCutoverPreApprovalCandidatePackageReadyToRequestApproval, false);
  assert.equal(report.summary.rcCutoverPreApprovalCandidatePackageCanClaimRcReady, false);
  assert.equal(report.summary.rcCutoverOwnerApprovalReadinessSummaryReadyForOwnerReview, false);
  assert.equal(report.summary.rcCutoverOwnerApprovalReadinessSummaryApprovalSubmitted, false);
  assert.equal(report.summary.rcCutoverOwnerApprovalReadinessSummaryCanClaimRcReady, false);
  assert.equal(report.summary.rcCutoverFinalEvidencePackageAggregationOutletAccepted, false);
  assert.equal(report.summary.rcCutoverFinalEvidencePackageAggregationOutletReadyForOwnerReview, false);
  assert.equal(report.summary.rcCutoverFinalEvidencePackageAggregationOutletCanClaimRcReady, false);
  assert.equal(report.summary.rcCutoverCandidateArtifactExportAccepted, false);
  assert.equal(report.summary.rcCutoverCandidateArtifactExportReadyForOwnerReview, false);
  assert.equal(report.summary.rcCutoverCandidateArtifactExportFileWritten, false);
  assert.equal(report.summary.rcCutoverCandidateArtifactExportCanClaimRcReady, false);
  assertNoForbiddenMaterial(report);
});

test('v1 RC aggregator CLI treats exact head-bound runtime evidence JSON as review-only cross-process input', async () => {
  const sourceReport = await buildExactLowDisclosureReport();
  const result = spawnSync(
    process.execPath,
    [
      aggregatorCliPath,
      '--runtime-evidence-report',
      '-',
      '--runtime-evidence-current-head',
      fixtureCommit,
      '--runtime-evidence-expected-current-head',
      fixtureCommit,
      '--runtime-evidence-generated-at',
      fixtureEvidenceGeneratedAt,
      '--generated-at',
      '2026-07-07T01:00:00.000Z'
    ],
    {
      cwd: repoRoot,
      input: JSON.stringify(sourceReport),
      encoding: 'utf8',
      timeout: 30000,
      env: {
        ...process.env,
        NODE_NO_WARNINGS: '1',
        CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: 'false'
      }
    }
  );
  const report = JSON.parse(result.stdout);
  const preflight =
    report.evidence.p67AuthenticatedHttpBoundedMutationRuntimeEvidencePreflight;
  const rcGatePrecheck =
    report.evidence.p68FinalEvidenceAggregationRcGatePrecheck;
  const candidatePackage =
    report.evidence.p69RcCutoverPreApprovalCandidatePackage;
  const ownerApprovalSummary =
    report.evidence.p70RcCutoverOwnerApprovalReadinessSummary;
  const finalEvidencePackage =
    report.evidence.p71RcCutoverFinalEvidencePackageAggregationOutlet;
  const artifactExport =
    report.evidence.p72RcCutoverCandidateArtifactExport;

  assert.equal(result.status, 0, result.stderr);
  assert.equal(report.phase, 'P67-runtime-evidence-standard-input-preflight');
  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.summary.runtimeEvidenceReportInputProvided, true);
  assert.equal(report.summary.runtimeEvidenceReportStandardInputSourceAccepted, false);
  assert.equal(report.summary.runtimeEvidenceReportExactHeadBoundInputProvided, true);
  assert.equal(report.summary.runtimeEvidenceReportExactHeadBoundInputAccepted, true);
  assert.equal(report.summary.runtimeEvidenceReportExactHeadBoundInputRejected, false);
  assert.equal(report.summary.runtimeEvidenceReportAggregatorReplayAccepted, true);
  assert.equal(report.summary.runtimeEvidenceReportAggregatorReplayRejected, false);
  assert.equal(report.summary.runtimeEvidenceSummaryAccepted, true);
  assert.equal(report.summary.runtimeEvidenceSummaryRejected, false);
  assert.equal(
    report.summary.runtimeEvidenceSummaryStatus,
    'explicit_runtime_evidence_summary_available'
  );
  assert.equal(report.summary.rc9DecisionPacketCanClaimRcReady, false);
  assert.equal(preflight.exactHeadBoundRuntimeSummaryInput.rawValuesOutput, false);
  assert.equal(preflight.exactHeadBoundRuntimeSummaryInput.rawValuesPersisted, false);
  assert.equal(preflight.standardInputSourceAccepted, false);
  assert.ok(preflight.blockers.includes('source_report_not_same_process'));
  assert.equal(preflight.aggregatorReplay.accepted, true);
  assert.equal(preflight.aggregatorReplay.currentHeadBindingStatus, 'matched');
  assert.equal(preflight.aggregatorReplay.evidenceFreshnessStatus, 'fresh');
  assert.equal(rcGatePrecheck.status, 'blocked_pending_exact_head_bound_runtime_summary_acceptance');
  assert.equal(rcGatePrecheck.decision, 'NOT_READY_BLOCKED');
  assert.equal(rcGatePrecheck.standardInputSourceAccepted, false);
  assert.equal(rcGatePrecheck.exactHeadBoundInputProvided, true);
  assert.equal(rcGatePrecheck.exactHeadBoundInputAccepted, true);
  assert.equal(rcGatePrecheck.runtimeEvidenceSummaryAccepted, true);
  assert.equal(rcGatePrecheck.finalEvidenceAggregationAccepted, true);
  assert.equal(rcGatePrecheck.rcGatePrecheckAccepted, false);
  assert.equal(rcGatePrecheck.currentHeadBindingStatus, 'matched');
  assert.equal(rcGatePrecheck.currentHeadBindingMatched, true);
  assert.equal(rcGatePrecheck.evidenceFreshnessStatus, 'fresh');
  assert.equal(rcGatePrecheck.evidenceUnitsComplete, true);
  assert.equal(rcGatePrecheck.rc9DecisionPacketAvailable, true);
  assert.equal(rcGatePrecheck.rc9DecisionPacketDecision, 'RC_NOT_READY_BLOCKED');
  assert.equal(
    rcGatePrecheck.rc9CompletenessChecklistStatus,
    'incomplete_missing_required_evidence'
  );
  assert.equal(rcGatePrecheck.rcGateRows.freshCurrentHeadAccepted, true);
  assert.equal(rcGatePrecheck.rcGateRows.strictGateAccepted, true);
  assert.equal(rcGatePrecheck.rcGateRows.liveHttpNoWriteAccepted, true);
  assert.equal(rcGatePrecheck.rcGateRows.validationAggregatorZeroGapAccepted, false);
  assert.equal(rcGatePrecheck.disclosure.rawCurrentHeadCommitOutput, false);
  assert.equal(rcGatePrecheck.disclosure.rawEvidenceGeneratedAtOutput, false);
  assert.equal(rcGatePrecheck.safety.executesCommands, false);
  assert.equal(rcGatePrecheck.safety.readinessClaimed, false);
  assert.equal(rcGatePrecheck.canClaimRcReady, false);
  assert.equal(candidatePackage.status, 'candidate_package_blocked_pending_required_preapproval_evidence');
  assert.equal(candidatePackage.candidatePackageAccepted, false);
  assert.equal(candidatePackage.approvalRequestOnly, true);
  assert.equal(candidatePackage.readyToRequestRcCutoverApproval, false);
  assert.equal(candidatePackage.rcCutoverApproved, false);
  assert.equal(candidatePackage.rcCutoverExecuted, false);
  assert.equal(candidatePackage.rcCutoverExecutionAllowed, false);
  assert.equal(candidatePackage.rcReady, false);
  assert.equal(candidatePackage.rcGateRows.validationAggregatorZeroGapAccepted, false);
  assert.ok(candidatePackage.blockerIds.includes('standard_runtime_evidence_source_not_accepted'));
  assert.ok(candidatePackage.blockerIds.includes('validation_aggregator_zero_gap_not_accepted'));
  assert.equal(candidatePackage.safety.executesCutover, false);
  assert.equal(candidatePackage.safety.readinessClaimed, false);
  assert.equal(candidatePackage.canClaimRcReady, false);
  assert.equal(
    ownerApprovalSummary.status,
    'owner_approval_readiness_summary_blocked_pending_candidate_package_acceptance'
  );
  assert.equal(ownerApprovalSummary.ownerReviewReady, false);
  assert.equal(ownerApprovalSummary.approvalRequestOnly, true);
  assert.equal(ownerApprovalSummary.approvalRequestSubmitted, false);
  assert.equal(ownerApprovalSummary.approvalTextGenerated, false);
  assert.equal(ownerApprovalSummary.ownerApprovalAccepted, false);
  assert.equal(ownerApprovalSummary.ownerApprovalExecutionAllowed, false);
  assert.equal(ownerApprovalSummary.rcCutoverExecuted, false);
  assert.ok(
    ownerApprovalSummary.blockerIds.includes(
      'validation_aggregator_zero_gap_not_accepted'
    )
  );
  assert.equal(ownerApprovalSummary.disclosure.approvalLineOutput, false);
  assert.equal(ownerApprovalSummary.safety.submitsApprovalRequest, false);
  assert.equal(ownerApprovalSummary.safety.executesCutover, false);
  assert.equal(ownerApprovalSummary.canClaimRcReady, false);
  assert.equal(
    finalEvidencePackage.status,
    'final_evidence_package_blocked_pending_complete_low_disclosure_chain'
  );
  assert.equal(finalEvidencePackage.aggregationOutletAccepted, false);
  assert.equal(finalEvidencePackage.ownerReviewReady, false);
  assert.equal(finalEvidencePackage.chain.rowCount, 4);
  assert.equal(finalEvidencePackage.chain.acceptedRowCount, 0);
  assert.equal(finalEvidencePackage.chain.missingRowCount, 4);
  assert.ok(
    finalEvidencePackage.chain.missingIds.includes(
      'p67_runtime_evidence_standard_input_preflight'
    )
  );
  assert.ok(
    finalEvidencePackage.chain.missingIds.includes(
      'p69_rc_cutover_pre_approval_candidate_package'
    )
  );
  assert.ok(
    finalEvidencePackage.blockerIds.includes(
      'p67_runtime_evidence_standard_input_preflight_not_accepted'
    )
  );
  assert.ok(
    finalEvidencePackage.blockerIds.includes(
      'validation_aggregator_zero_gap_not_accepted'
    )
  );
  assert.equal(
    finalEvidencePackage.evidenceSummary.currentHeadBindingMatched,
    true
  );
  assert.equal(finalEvidencePackage.evidenceSummary.rcGatePrecheckAccepted, false);
  assert.equal(finalEvidencePackage.evidenceSummary.candidatePackageAccepted, false);
  assert.equal(finalEvidencePackage.ownerApprovalBoundary.present, false);
  assert.equal(finalEvidencePackage.ownerApprovalBoundary.executionAllowed, false);
  assert.equal(finalEvidencePackage.safety.submitsApprovalRequest, false);
  assert.equal(finalEvidencePackage.safety.executesCutover, false);
  assert.equal(finalEvidencePackage.canClaimRcReady, false);
  assertBlockedArtifactExport(
    artifactExport,
    'validation_aggregator_zero_gap_not_accepted'
  );
  assert.equal(
    artifactExport.finalEvidencePackageAggregationOutlet.aggregationOutletAccepted,
    false
  );
  assert.equal(report.summary.finalEvidenceAggregationRcGatePrecheckAccepted, false);
  assert.equal(report.summary.finalEvidenceAggregationRuntimeEvidenceSummaryAccepted, true);
  assert.equal(report.summary.finalEvidenceAggregationCurrentHeadBindingMatched, true);
  assert.equal(report.summary.finalEvidenceAggregationEvidenceFreshnessStatus, 'fresh');
  assert.equal(report.summary.rcGatePrecheckFreshCurrentHeadAccepted, true);
  assert.equal(
    report.summary.rcGatePrecheckCompletenessChecklistStatus,
    'incomplete_missing_required_evidence'
  );
  assert.equal(report.summary.rcGatePrecheckCanClaimRcReady, false);
  assert.equal(report.summary.rcCutoverPreApprovalCandidatePackageAccepted, false);
  assert.equal(report.summary.rcCutoverPreApprovalCandidatePackageReadyToRequestApproval, false);
  assert.equal(report.summary.rcCutoverPreApprovalCandidatePackageCanClaimRcReady, false);
  assert.equal(report.summary.rcCutoverOwnerApprovalReadinessSummaryReadyForOwnerReview, false);
  assert.equal(report.summary.rcCutoverOwnerApprovalReadinessSummaryApprovalSubmitted, false);
  assert.equal(report.summary.rcCutoverOwnerApprovalReadinessSummaryCanClaimRcReady, false);
  assert.equal(report.summary.rcCutoverFinalEvidencePackageAggregationOutletAccepted, false);
  assert.equal(report.summary.rcCutoverFinalEvidencePackageAggregationOutletReadyForOwnerReview, false);
  assert.equal(report.summary.rcCutoverFinalEvidencePackageAggregationOutletCanClaimRcReady, false);
  assert.equal(report.summary.rcCutoverCandidateArtifactExportAccepted, false);
  assert.equal(report.summary.rcCutoverCandidateArtifactExportReadyForOwnerReview, false);
  assert.equal(report.summary.rcCutoverCandidateArtifactExportFileWritten, false);
  assert.equal(report.summary.rcCutoverCandidateArtifactExportCanClaimRcReady, false);
  assertNoForbiddenMaterial(report);
});

test('v1 RC aggregator can promote same-process allowlisted zero-gap artifact to RC gate precheck without readiness', async () => {
  const sourceReport = await buildZeroGapLowDisclosureReport();
  const report = buildCliReport({
    runtimeEvidenceReport: sourceReport,
    runtimeEvidenceCurrentHead: fixtureCommit,
    runtimeEvidenceExpectedCurrentHead: fixtureCommit,
    runtimeEvidenceGeneratedAt: fixtureEvidenceGeneratedAt,
    generatedAt: '2026-07-07T01:00:00.000Z'
  });
  const preflight =
    report.evidence.p67AuthenticatedHttpBoundedMutationRuntimeEvidencePreflight;
  const rcGatePrecheck =
    report.evidence.p68FinalEvidenceAggregationRcGatePrecheck;
  const candidatePackage =
    report.evidence.p69RcCutoverPreApprovalCandidatePackage;
  const ownerApprovalSummary =
    report.evidence.p70RcCutoverOwnerApprovalReadinessSummary;
  const finalEvidencePackage =
    report.evidence.p71RcCutoverFinalEvidencePackageAggregationOutlet;
  const artifactExport =
    report.evidence.p72RcCutoverCandidateArtifactExport;

  assert.equal(report.phase, 'P67-runtime-evidence-standard-input-preflight');
  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.summary.runtimeEvidenceReportInputProvided, true);
  assert.equal(report.summary.runtimeEvidenceReportStandardInputSourceAccepted, true);
  assert.equal(report.summary.runtimeEvidenceReportExactHeadBoundInputAccepted, true);
  assert.equal(report.summary.runtimeEvidenceReportAggregatorReplayAccepted, true);
  assert.equal(report.summary.runtimeEvidenceSummaryAccepted, true);
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingZeroGap,
    true
  );
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingReadyToRequestRcCutoverApproval,
    true
  );
  assert.equal(preflight.standardInputSourceAccepted, true);
  assert.equal(preflight.aggregatorReplay.accepted, true);
  assert.deepEqual(
    preflight.runtimeEvidenceSummaryForAggregator.locallyEvidencedRuntimeGaps,
    [...RUNTIME_EVIDENCE_GAP_ID_ALLOWLIST].sort()
  );
  assert.deepEqual(preflight.runtimeEvidenceSummaryForAggregator.remainingRuntimeGaps, []);
  assert.equal(
    rcGatePrecheck.status,
    'exact_head_bound_runtime_summary_accepted_by_final_aggregation_not_ready'
  );
  assert.equal(rcGatePrecheck.decision, 'NOT_READY_BLOCKED');
  assert.equal(rcGatePrecheck.rc9DecisionPacketAvailable, true);
  assert.equal(rcGatePrecheck.rc9DecisionPacketDecision, 'RC_NOT_READY_BLOCKED');
  assert.equal(rcGatePrecheck.rc9DecisionPacketReadyToRequestRcCutoverApproval, true);
  assert.equal(
    rcGatePrecheck.rc9CompletenessChecklistStatus,
    'complete_for_cutover_approval_request_not_rc_ready'
  );
  assert.equal(rcGatePrecheck.rcGateRows.freshCurrentHeadAccepted, true);
  assert.equal(rcGatePrecheck.rcGateRows.strictGateAccepted, true);
  assert.equal(rcGatePrecheck.rcGateRows.liveHttpNoWriteAccepted, true);
  assert.equal(rcGatePrecheck.rcGateRows.validationAggregatorZeroGapAccepted, true);
  assert.equal(rcGatePrecheck.canClaimRcReady, false);
  assert.equal(
    candidatePackage.status,
    'candidate_package_ready_for_owner_cutover_approval_request_not_ready'
  );
  assert.equal(candidatePackage.decision, 'NOT_READY_BLOCKED');
  assert.equal(candidatePackage.candidatePackageAccepted, true);
  assert.equal(candidatePackage.approvalRequestOnly, true);
  assert.equal(candidatePackage.readyToRequestRcCutoverApproval, true);
  assert.equal(candidatePackage.rcCutoverApprovalPresent, false);
  assert.equal(candidatePackage.rcCutoverApproved, false);
  assert.equal(candidatePackage.rcCutoverExecuted, false);
  assert.equal(candidatePackage.rcCutoverExecutionAllowed, false);
  assert.equal(candidatePackage.rcReady, false);
  assert.equal(candidatePackage.rcGatePrecheckAccepted, true);
  assert.equal(candidatePackage.rc9DecisionPacket.readyToRequestRcCutoverApproval, true);
  assert.equal(
    candidatePackage.rc9DecisionPacket.completenessChecklistStatus,
    'complete_for_cutover_approval_request_not_rc_ready'
  );
  assert.deepEqual(candidatePackage.blockerIds, []);
  assert.equal(candidatePackage.disclosure.lowDisclosure, true);
  assert.equal(candidatePackage.disclosure.rawCurrentHeadCommitOutput, false);
  assert.equal(candidatePackage.disclosure.rawEvidenceGeneratedAtOutput, false);
  assert.equal(candidatePackage.disclosure.endpointOrLocatorOutput, false);
  assert.equal(candidatePackage.safety.executesCommands, false);
  assert.equal(candidatePackage.safety.callsProviders, false);
  assert.equal(candidatePackage.safety.callsMcpTools, false);
  assert.equal(candidatePackage.safety.readsRealMemory, false);
  assert.equal(candidatePackage.safety.writesDurableState, false);
  assert.equal(candidatePackage.safety.remoteWrites, false);
  assert.equal(candidatePackage.safety.executesCutover, false);
  assert.equal(candidatePackage.safety.readinessClaimed, false);
  assert.equal(candidatePackage.canClaimRuntimeReady, false);
  assert.equal(candidatePackage.canClaimFinalRcReady, false);
  assert.equal(candidatePackage.canClaimV1RcReady, false);
  assert.equal(candidatePackage.canClaimRcReady, false);
  assert.equal(
    ownerApprovalSummary.status,
    'owner_approval_readiness_summary_ready_for_exact_owner_review_not_authorization'
  );
  assert.equal(ownerApprovalSummary.decision, 'NOT_READY_BLOCKED');
  assert.equal(ownerApprovalSummary.candidatePackageAccepted, true);
  assert.equal(ownerApprovalSummary.ownerReviewReady, true);
  assert.equal(ownerApprovalSummary.approvalRequestOnly, true);
  assert.equal(ownerApprovalSummary.approvalRequestSubmitted, false);
  assert.equal(ownerApprovalSummary.approvalLineGenerated, false);
  assert.equal(ownerApprovalSummary.approvalTextGenerated, false);
  assert.equal(ownerApprovalSummary.ownerApprovalPresent, false);
  assert.equal(ownerApprovalSummary.ownerApprovalAccepted, false);
  assert.equal(ownerApprovalSummary.ownerApprovalExecutionAllowed, false);
  assert.equal(ownerApprovalSummary.rcCutoverApproved, false);
  assert.equal(ownerApprovalSummary.rcCutoverExecuted, false);
  assert.equal(ownerApprovalSummary.rcCutoverExecutionAllowed, false);
  assert.equal(ownerApprovalSummary.rcReady, false);
  assert.ok(
    ownerApprovalSummary.requiredOwnerApprovalFields.includes(
      'current_head_binding'
    )
  );
  assert.equal(ownerApprovalSummary.requiredOwnerApprovalFieldValuesIncluded, false);
  assert.equal(ownerApprovalSummary.candidatePackage.blockerCount, 0);
  assert.deepEqual(ownerApprovalSummary.blockerIds, []);
  assert.equal(ownerApprovalSummary.disclosure.approvalTextOutput, false);
  assert.equal(ownerApprovalSummary.disclosure.approvalLineOutput, false);
  assert.equal(ownerApprovalSummary.safety.submitsApprovalRequest, false);
  assert.equal(ownerApprovalSummary.safety.executesCutover, false);
  assert.equal(ownerApprovalSummary.safety.readinessClaimed, false);
  assert.equal(ownerApprovalSummary.canClaimRuntimeReady, false);
  assert.equal(ownerApprovalSummary.canClaimFinalRcReady, false);
  assert.equal(ownerApprovalSummary.canClaimV1RcReady, false);
  assert.equal(ownerApprovalSummary.canClaimRcReady, false);
  assert.equal(
    finalEvidencePackage.status,
    'final_evidence_package_ready_for_exact_owner_review_not_authorization'
  );
  assert.equal(finalEvidencePackage.decision, 'NOT_READY_BLOCKED');
  assert.equal(finalEvidencePackage.aggregationOutletAccepted, true);
  assert.equal(finalEvidencePackage.ownerReviewReady, true);
  assert.equal(finalEvidencePackage.approvalRequestOnly, true);
  assert.equal(finalEvidencePackage.approvalRequestSubmitted, false);
  assert.equal(finalEvidencePackage.approvalLineGenerated, false);
  assert.equal(finalEvidencePackage.approvalTextGenerated, false);
  assert.equal(finalEvidencePackage.ownerApprovalPresent, false);
  assert.equal(finalEvidencePackage.ownerApprovalAccepted, false);
  assert.equal(finalEvidencePackage.ownerApprovalExecutionAllowed, false);
  assert.equal(finalEvidencePackage.rcCutoverApproved, false);
  assert.equal(finalEvidencePackage.rcCutoverExecuted, false);
  assert.equal(finalEvidencePackage.rcCutoverExecutionAllowed, false);
  assert.equal(finalEvidencePackage.rcReady, false);
  assert.equal(finalEvidencePackage.chain.rowCount, 4);
  assert.equal(finalEvidencePackage.chain.acceptedRowCount, 4);
  assert.equal(finalEvidencePackage.chain.missingRowCount, 0);
  assert.deepEqual(finalEvidencePackage.chain.missingIds, []);
  assert.deepEqual(finalEvidencePackage.blockerIds, []);
  assert.equal(
    finalEvidencePackage.evidenceSummary.runtimeEvidenceAggregatorReplayAccepted,
    true
  );
  assert.equal(finalEvidencePackage.evidenceSummary.exactHeadBoundInputAccepted, true);
  assert.equal(finalEvidencePackage.evidenceSummary.currentHeadBindingMatched, true);
  assert.equal(finalEvidencePackage.evidenceSummary.evidenceUnitsComplete, true);
  assert.equal(finalEvidencePackage.evidenceSummary.rcGatePrecheckAccepted, true);
  assert.equal(finalEvidencePackage.evidenceSummary.candidatePackageAccepted, true);
  assert.equal(finalEvidencePackage.evidenceSummary.ownerApprovalReadinessAccepted, true);
  assert.equal(finalEvidencePackage.rcGateRows.validationAggregatorZeroGapAccepted, true);
  assert.equal(finalEvidencePackage.ownerApprovalBoundary.required, true);
  assert.equal(finalEvidencePackage.ownerApprovalBoundary.present, false);
  assert.equal(finalEvidencePackage.ownerApprovalBoundary.accepted, false);
  assert.equal(finalEvidencePackage.ownerApprovalBoundary.submitted, false);
  assert.equal(finalEvidencePackage.ownerApprovalBoundary.executionAllowed, false);
  assert.equal(finalEvidencePackage.ownerApprovalBoundary.requiredFieldValuesIncluded, false);
  assert.equal(finalEvidencePackage.disclosure.approvalTextOutput, false);
  assert.equal(finalEvidencePackage.disclosure.approvalLineOutput, false);
  assert.equal(finalEvidencePackage.disclosure.rawCurrentHeadCommitOutput, false);
  assert.equal(finalEvidencePackage.safety.executesCommands, false);
  assert.equal(finalEvidencePackage.safety.callsMcpTools, false);
  assert.equal(finalEvidencePackage.safety.remoteWrites, false);
  assert.equal(finalEvidencePackage.safety.submitsApprovalRequest, false);
  assert.equal(finalEvidencePackage.safety.executesCutover, false);
  assert.equal(finalEvidencePackage.safety.readinessClaimed, false);
  assert.equal(finalEvidencePackage.canClaimRuntimeReady, false);
  assert.equal(finalEvidencePackage.canClaimFinalRcReady, false);
  assert.equal(finalEvidencePackage.canClaimV1RcReady, false);
  assert.equal(finalEvidencePackage.canClaimRcReady, false);
  assertAcceptedArtifactExport(artifactExport);
  assert.equal(
    artifactExport.finalEvidencePackageAggregationOutlet.ownerReviewReady,
    true
  );
  assert.equal(report.summary.rc9DecisionPacketReadyToRequestRcCutoverApproval, true);
  assert.equal(report.summary.rc9DecisionPacketCanClaimRcReady, false);
  assert.equal(report.summary.rcGatePrecheckCanClaimRcReady, false);
  assert.equal(report.summary.rcCutoverPreApprovalCandidatePackageAccepted, true);
  assert.equal(report.summary.rcCutoverPreApprovalCandidatePackageReadyToRequestApproval, true);
  assert.equal(report.summary.rcCutoverPreApprovalCandidatePackageCanClaimRcReady, false);
  assert.equal(report.summary.rcCutoverOwnerApprovalReadinessSummaryReadyForOwnerReview, true);
  assert.equal(report.summary.rcCutoverOwnerApprovalReadinessSummaryApprovalSubmitted, false);
  assert.equal(report.summary.rcCutoverOwnerApprovalReadinessSummaryCanClaimRcReady, false);
  assert.equal(report.summary.rcCutoverFinalEvidencePackageAggregationOutletAccepted, true);
  assert.equal(report.summary.rcCutoverFinalEvidencePackageAggregationOutletReadyForOwnerReview, true);
  assert.equal(report.summary.rcCutoverFinalEvidencePackageAggregationOutletCanClaimRcReady, false);
  assert.equal(report.summary.rcCutoverCandidateArtifactExportAccepted, true);
  assert.equal(report.summary.rcCutoverCandidateArtifactExportReadyForOwnerReview, true);
  assert.equal(report.summary.rcCutoverCandidateArtifactExportFileWritten, false);
  assert.equal(report.summary.rcCutoverCandidateArtifactExportCanClaimRcReady, false);
  assert.equal(rcGatePrecheck.safety.readinessClaimed, false);
  assertNoForbiddenMaterial(report);
});

test('v1 RC aggregator CLI emits blocked RC cutover candidate artifact for cross-process runtime evidence JSON', async () => {
  const sourceReport = await buildZeroGapLowDisclosureReport();
  const result = spawnSync(
    process.execPath,
    [
      aggregatorCliPath,
      '--runtime-evidence-report',
      '-',
      '--runtime-evidence-current-head',
      fixtureCommit,
      '--runtime-evidence-expected-current-head',
      fixtureCommit,
      '--runtime-evidence-generated-at',
      fixtureEvidenceGeneratedAt,
      '--generated-at',
      '2026-07-07T01:00:00.000Z',
      '--rc-cutover-candidate-artifact',
      '--pretty'
    ],
    {
      cwd: repoRoot,
      input: JSON.stringify(sourceReport),
      encoding: 'utf8',
      timeout: 30000,
      env: {
        ...process.env,
        NODE_NO_WARNINGS: '1',
        CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: 'false'
      }
    }
  );
  const artifact = JSON.parse(result.stdout);

  assert.equal(result.status, 0, result.stderr);
  assertBlockedArtifactExport(
    artifact,
    'p67_runtime_evidence_standard_input_preflight_not_accepted'
  );
  assert.equal(Object.hasOwn(artifact, 'phase'), false);
  assert.equal(Object.hasOwn(artifact, 'summary'), false);
  assert.equal(Object.hasOwn(artifact, 'evidence'), false);
  assert.equal(artifact.export.mode, 'json_stdout_only');
  assert.equal(artifact.export.fileWritten, false);
  assert.equal(artifact.export.durableArtifactWritten, false);
  assert.equal(artifact.manifest.outputPolicy, 'low_disclosure_json_stdout_only');
  assert.equal(artifact.manifest.ownerApprovalRequiredSeparately, true);
  assert.equal(artifact.ownerApprovalPresent, false);
  assert.equal(artifact.ownerApprovalExecutionAllowed, false);
  assert.equal(artifact.rcCutoverExecutionAllowed, false);
  assert.equal(artifact.rcReady, false);
  assert.equal(
    artifact.finalEvidencePackageAggregationOutlet.aggregationOutletAccepted,
    false
  );
  assertNoForbiddenMaterial(artifact);
});

test('RC cutover candidate artifact export helper fails closed without final package outlet', () => {
  const artifact = buildRcCutoverCandidateArtifactExport();

  assertBlockedArtifactExport(
    artifact,
    'final_evidence_package_aggregation_outlet_unavailable'
  );
  assert.deepEqual(artifact.finalEvidencePackageAggregationOutlet, {});
  assertNoForbiddenMaterial(artifact);
});

test('RC cutover candidate artifact intake accepts P72 artifact only as owner-review input', async () => {
  const artifact = await buildAcceptedRcCutoverCandidateArtifact();
  const intake = buildRcCutoverCandidateArtifactIntakePrecheck({
    rcCutoverCandidateArtifactExport: artifact
  });

  assertAcceptedArtifactIntake(intake);
  assertNoForbiddenMaterial(intake);
});

test('RC cutover candidate artifact intake rejects self-attested P72 artifact without source-chain proof', async () => {
  const artifact = await buildAcceptedRcCutoverCandidateArtifact();
  delete artifact.sourceChainProof;
  delete artifact.finalEvidencePackageAggregationOutlet.sourceChainProof;
  const intake = buildRcCutoverCandidateArtifactIntakePrecheck({
    rcCutoverCandidateArtifactExport: artifact
  });
  const boundary = buildRcCutoverOwnerApprovalBoundaryPrecheck({
    rcCutoverCandidateArtifactIntakePrecheck: intake
  });

  assert.equal(intake.status, 'candidate_artifact_intake_blocked_fail_closed');
  assert.equal(intake.inputAccepted, false);
  assert.equal(intake.ownerReviewInputReady, false);
  assert.ok(
    intake.blockerIds.includes(
      'artifact_final_evidence_package_outlet_source_chain_proof_missing'
    )
  );
  assert.ok(intake.blockerIds.includes('artifact_source_chain_proof_missing'));
  assert.equal(intake.approvalLineGenerated, false);
  assert.equal(intake.approvalTextGenerated, false);
  assert.equal(intake.rcCutoverExecutionAllowed, false);
  assert.equal(intake.rcReady, false);
  assert.equal(intake.canClaimRcReady, false);
  assert.equal(boundary.status, 'owner_approval_boundary_display_blocked_fail_closed');
  assert.equal(boundary.boundaryPrecheckAccepted, false);
  assert.equal(boundary.ownerApprovalBoundaryDisplayReady, false);
  assert.ok(boundary.blockerIds.includes('candidate_artifact_intake_not_accepted'));
  assert.ok(boundary.blockerIds.includes('artifact_source_chain_proof_missing'));
  assert.equal(boundary.rcCutoverExecutionAllowed, false);
  assert.equal(boundary.rcReady, false);
  assert.equal(boundary.canClaimRcReady, false);
  assertNoForbiddenMaterial(intake);
  assertNoForbiddenMaterial(boundary);
});

test('RC cutover owner approval boundary precheck displays requirements without authorization', async () => {
  const artifact = await buildAcceptedRcCutoverCandidateArtifact();
  const intake = buildRcCutoverCandidateArtifactIntakePrecheck({
    rcCutoverCandidateArtifactExport: artifact
  });
  const boundary = buildRcCutoverOwnerApprovalBoundaryPrecheck({
    rcCutoverCandidateArtifactIntakePrecheck: intake
  });

  assertAcceptedArtifactIntake(intake);
  assertAcceptedOwnerApprovalBoundaryPrecheck(boundary);
  assertNoForbiddenMaterial(boundary);
});

test('v1 RC aggregator CLI rejects external P72 candidate artifact stdin for owner-review promotion', async () => {
  const artifact = await buildAcceptedRcCutoverCandidateArtifact();
  const result = spawnSync(
    process.execPath,
    [
      aggregatorCliPath,
      '--rc-cutover-candidate-artifact-report',
      '-',
      '--pretty',
      '--generated-at',
      '2026-07-07T01:00:00.000Z'
    ],
    {
      cwd: repoRoot,
      input: JSON.stringify(artifact),
      encoding: 'utf8',
      timeout: 30000,
      env: {
        ...process.env,
        NODE_NO_WARNINGS: '1',
        CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: 'false'
      }
    }
  );
  const report = JSON.parse(result.stdout);
  const intake = report.evidence.p73RcCutoverCandidateArtifactIntakePrecheck;
  const boundary = report.evidence.p75RcCutoverOwnerApprovalBoundaryPrecheck;

  assert.equal(result.status, 0, result.stderr);
  assert.equal(report.phase, 'P73-rc-cutover-candidate-artifact-intake-precheck');
  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.rcCutoverCandidateArtifactReportInput.provided, true);
  assert.equal(report.rcCutoverCandidateArtifactReportInput.accepted, false);
  assert.equal(report.rcCutoverCandidateArtifactReportInput.rejected, true);
  assert.equal(report.rcCutoverCandidateArtifactReportInput.pathDisclosed, false);
  assert.equal(report.rcCutoverCandidateArtifactReportInput.rawInputPrinted, false);
  assert.equal(intake.status, 'candidate_artifact_intake_blocked_fail_closed');
  assert.equal(intake.inputAccepted, false);
  assert.equal(intake.ownerReviewInputReady, false);
  assert.ok(
    intake.blockerIds.includes(
      'artifact_final_evidence_package_outlet_source_chain_not_same_process'
    )
  );
  assert.ok(intake.blockerIds.includes('artifact_source_chain_not_same_process'));
  assert.equal(boundary.status, 'owner_approval_boundary_display_blocked_fail_closed');
  assert.equal(boundary.boundaryPrecheckAccepted, false);
  assert.equal(report.summary.rcCutoverCandidateArtifactReportInputProvided, true);
  assert.equal(report.summary.rcCutoverCandidateArtifactReportInputAccepted, false);
  assert.equal(report.summary.rcCutoverCandidateArtifactIntakeAccepted, false);
  assert.equal(
    report.summary.rcCutoverCandidateArtifactIntakeReadyForOwnerReview,
    false
  );
  assert.equal(report.summary.rcCutoverCandidateArtifactIntakeBlockerCount, 2);
  assert.equal(report.summary.rcCutoverCandidateArtifactIntakeApprovalSubmitted, false);
  assert.equal(report.summary.rcCutoverCandidateArtifactIntakeExecutesCutover, false);
  assert.equal(report.summary.rcCutoverCandidateArtifactIntakeCanClaimRcReady, false);
  assert.equal(report.summary.rcCutoverOwnerApprovalBoundaryPrecheckAccepted, false);
  assert.equal(report.summary.rcCutoverOwnerApprovalBoundaryDisplayReady, false);
  assert.equal(report.summary.rcCutoverOwnerApprovalBoundaryFieldCount, 6);
  assert.equal(report.summary.rcCutoverOwnerApprovalBoundaryFieldValuesIncluded, false);
  assert.equal(report.summary.rcCutoverOwnerApprovalBoundaryApprovalGenerated, false);
  assert.equal(report.summary.rcCutoverOwnerApprovalBoundaryExecutesCutover, false);
  assert.equal(report.summary.rcCutoverOwnerApprovalBoundaryCanClaimRcReady, false);
  assert.equal(Object.hasOwn(report.evidence, 'p72RcCutoverCandidateArtifactExport'), false);
  assertNoForbiddenMaterial(report);
});

test('v1 RC aggregator CLI emits blocked owner approval boundary for external P72 artifact', async () => {
  const artifact = await buildAcceptedRcCutoverCandidateArtifact();
  const result = spawnSync(
    process.execPath,
    [
      aggregatorCliPath,
      '--rc-cutover-candidate-artifact-report',
      '-',
      '--rc-cutover-owner-approval-boundary',
      '--pretty',
      '--generated-at',
      '2026-07-07T01:00:00.000Z'
    ],
    {
      cwd: repoRoot,
      input: JSON.stringify(artifact),
      encoding: 'utf8',
      timeout: 30000,
      env: {
        ...process.env,
        NODE_NO_WARNINGS: '1',
        CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: 'false'
      }
    }
  );
  const boundary = JSON.parse(result.stdout);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(boundary.status, 'owner_approval_boundary_display_blocked_fail_closed');
  assert.equal(boundary.boundaryPrecheckAccepted, false);
  assert.equal(boundary.ownerApprovalBoundaryDisplayReady, false);
  assert.ok(boundary.blockerIds.includes('candidate_artifact_intake_not_accepted'));
  assert.ok(boundary.blockerIds.includes('artifact_source_chain_not_same_process'));
  assert.equal(Object.hasOwn(boundary, 'phase'), false);
  assert.equal(Object.hasOwn(boundary, 'summary'), false);
  assert.equal(Object.hasOwn(boundary, 'evidence'), false);
  assert.equal(boundary.requiredBoundaryFieldValuesIncluded, false);
  assert.equal(boundary.generatedApprovalMaterial.approvalTemplateGenerated, false);
  assert.equal(boundary.generatedApprovalMaterial.approvalLineGenerated, false);
  assert.equal(boundary.generatedApprovalMaterial.approvalTextGenerated, false);
  assert.equal(boundary.safety.submitsApprovalRequest, false);
  assert.equal(boundary.safety.executesCutover, false);
  assert.equal(boundary.safety.readinessClaimed, false);
  assertNoForbiddenMaterial(boundary);
});

test('v1 RC aggregator owner approval boundary artifact output fails closed without P73 input', () => {
  const result = spawnSync(
    process.execPath,
    [
      aggregatorCliPath,
      '--rc-cutover-owner-approval-boundary',
      '--pretty',
      '--generated-at',
      '2026-07-07T01:00:00.000Z'
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 30000,
      env: {
        ...process.env,
        NODE_NO_WARNINGS: '1',
        CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: 'false'
      }
    }
  );
  const boundary = JSON.parse(result.stdout);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    boundary.schemaVersion,
    'p75-rc-cutover-owner-approval-boundary-precheck-v1'
  );
  assert.equal(boundary.status, 'owner_approval_boundary_display_blocked_fail_closed');
  assert.equal(boundary.decision, 'NOT_READY_BLOCKED');
  assert.equal(boundary.boundaryPrecheckAccepted, false);
  assert.equal(boundary.ownerApprovalBoundaryDisplayReady, false);
  assert.ok(boundary.blockerIds.includes('candidate_artifact_intake_not_accepted'));
  assert.ok(boundary.blockerIds.includes('candidate_artifact_intake_unavailable'));
  assert.equal(boundary.requiredBoundaryFieldValuesIncluded, false);
  assert.equal(boundary.generatedApprovalMaterial.approvalLineGenerated, false);
  assert.equal(boundary.generatedApprovalMaterial.approvalTextGenerated, false);
  assert.equal(boundary.rcCutoverExecutionAllowed, false);
  assert.equal(boundary.rcReady, false);
  assert.equal(boundary.safety.submitsApprovalRequest, false);
  assert.equal(boundary.safety.executesCutover, false);
  assert.equal(boundary.safety.readinessClaimed, false);
  assert.equal(boundary.canClaimRcReady, false);
  assertNoForbiddenMaterial(boundary);
});

test('RC cutover final owner-review package aggregation accepts P75 boundary without authorization', async () => {
  const boundary = await buildAcceptedRcCutoverOwnerApprovalBoundary();
  const pkg = buildRcCutoverFinalOwnerReviewPackageAggregation({
    rcCutoverOwnerApprovalBoundaryPrecheck: boundary
  });

  assertAcceptedOwnerApprovalBoundaryPrecheck(boundary);
  assertAcceptedFinalOwnerReviewPackage(pkg);
  assertNoForbiddenMaterial(pkg);
});

test('RC cutover final owner-review package aggregation rejects self-attested P75 boundary without source-chain proof', async () => {
  const boundary = await buildAcceptedRcCutoverOwnerApprovalBoundary();
  delete boundary.sourceChainProof;
  const pkg = buildRcCutoverFinalOwnerReviewPackageAggregation({
    rcCutoverOwnerApprovalBoundaryPrecheck: boundary
  });

  assert.equal(pkg.status, 'final_owner_review_package_blocked_fail_closed');
  assert.equal(pkg.decision, 'NOT_READY_BLOCKED');
  assert.equal(pkg.finalOwnerReviewPackageAccepted, false);
  assert.equal(pkg.readyForExactOwnerReview, false);
  assert.ok(
    pkg.blockerIds.includes('owner_approval_boundary_source_chain_proof_missing')
  );
  assert.equal(pkg.approvalLineGenerated, false);
  assert.equal(pkg.approvalTextGenerated, false);
  assert.equal(pkg.rcCutoverExecutionAllowed, false);
  assert.equal(pkg.rcReady, false);
  assert.equal(pkg.canClaimRcReady, false);
  assertNoForbiddenMaterial(pkg);
});

test('v1 RC aggregator CLI rejects external P75 owner approval boundary stdin for package promotion', async () => {
  const boundary = await buildAcceptedRcCutoverOwnerApprovalBoundary();
  const result = spawnSync(
    process.execPath,
    [
      aggregatorCliPath,
      '--rc-cutover-owner-approval-boundary-report',
      '-',
      '--pretty',
      '--generated-at',
      '2026-07-07T01:00:00.000Z'
    ],
    {
      cwd: repoRoot,
      input: JSON.stringify(boundary),
      encoding: 'utf8',
      timeout: 30000,
      env: {
        ...process.env,
        NODE_NO_WARNINGS: '1',
        CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: 'false'
      }
    }
  );
  const report = JSON.parse(result.stdout);
  const pkg = report.evidence.p77RcCutoverFinalOwnerReviewPackageAggregation;

  assert.equal(result.status, 0, result.stderr);
  assert.equal(report.phase, 'P77-rc-cutover-final-owner-review-package-aggregation');
  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.rcCutoverOwnerApprovalBoundaryReportInput.provided, true);
  assert.equal(report.rcCutoverOwnerApprovalBoundaryReportInput.accepted, false);
  assert.equal(report.rcCutoverOwnerApprovalBoundaryReportInput.rejected, true);
  assert.equal(report.rcCutoverOwnerApprovalBoundaryReportInput.pathDisclosed, false);
  assert.equal(report.rcCutoverOwnerApprovalBoundaryReportInput.rawInputPrinted, false);
  assert.equal(pkg.status, 'final_owner_review_package_blocked_fail_closed');
  assert.equal(pkg.finalOwnerReviewPackageAccepted, false);
  assert.equal(pkg.readyForExactOwnerReview, false);
  assert.ok(
    pkg.blockerIds.includes('owner_approval_boundary_source_chain_not_same_process')
  );
  assert.equal(report.summary.rcCutoverOwnerApprovalBoundaryReportInputProvided, true);
  assert.equal(report.summary.rcCutoverOwnerApprovalBoundaryReportInputAccepted, false);
  assert.equal(report.summary.rcCutoverFinalOwnerReviewPackageAccepted, false);
  assert.equal(report.summary.rcCutoverFinalOwnerReviewPackageReadyForOwnerReview, false);
  assert.equal(report.summary.rcCutoverFinalOwnerReviewPackageFieldCount, 6);
  assert.equal(report.summary.rcCutoverFinalOwnerReviewPackageApprovalGenerated, false);
  assert.equal(report.summary.rcCutoverFinalOwnerReviewPackageExecutesCutover, false);
  assert.equal(report.summary.rcCutoverFinalOwnerReviewPackageCanClaimRcReady, false);
  assert.equal(Object.hasOwn(report.evidence, 'p75RcCutoverOwnerApprovalBoundaryPrecheck'), false);
  assertNoForbiddenMaterial(report);
});

test('v1 RC aggregator CLI emits blocked final owner-review package for external P75 boundary', async () => {
  const boundary = await buildAcceptedRcCutoverOwnerApprovalBoundary();
  const result = spawnSync(
    process.execPath,
    [
      aggregatorCliPath,
      '--rc-cutover-owner-approval-boundary-report',
      '-',
      '--rc-cutover-final-owner-review-package',
      '--pretty',
      '--generated-at',
      '2026-07-07T01:00:00.000Z'
    ],
    {
      cwd: repoRoot,
      input: JSON.stringify(boundary),
      encoding: 'utf8',
      timeout: 30000,
      env: {
        ...process.env,
        NODE_NO_WARNINGS: '1',
        CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: 'false'
      }
    }
  );
  const pkg = JSON.parse(result.stdout);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(pkg.status, 'final_owner_review_package_blocked_fail_closed');
  assert.equal(pkg.finalOwnerReviewPackageAccepted, false);
  assert.equal(pkg.readyForExactOwnerReview, false);
  assert.ok(
    pkg.blockerIds.includes('owner_approval_boundary_source_chain_not_same_process')
  );
  assert.equal(Object.hasOwn(pkg, 'phase'), false);
  assert.equal(Object.hasOwn(pkg, 'summary'), false);
  assert.equal(Object.hasOwn(pkg, 'evidence'), false);
  assert.equal(pkg.packageContents.boundaryFieldValuesIncluded, false);
  assert.equal(pkg.packageContents.approvalMaterialIncluded, false);
  assert.equal(pkg.approvalLineGenerated, false);
  assert.equal(pkg.approvalTextGenerated, false);
  assert.equal(pkg.approvalTemplateGenerated, false);
  assert.equal(pkg.safety.submitsApprovalRequest, false);
  assert.equal(pkg.safety.executesCutover, false);
  assert.equal(pkg.safety.readinessClaimed, false);
  assertNoForbiddenMaterial(pkg);
});

test('RC cutover final owner-review package aggregation fails closed on boundary drift', async () => {
  const boundary = await buildAcceptedRcCutoverOwnerApprovalBoundary();
  boundary.requiredBoundaryFields[0].valueIncluded = true;
  boundary.generatedApprovalMaterial.approvalLineGenerated = true;
  boundary.rcCutoverExecutionAllowed = true;
  boundary.safety.readinessClaimed = true;
  const pkg = buildRcCutoverFinalOwnerReviewPackageAggregation({
    rcCutoverOwnerApprovalBoundaryPrecheck: boundary
  });

  assert.equal(pkg.status, 'final_owner_review_package_blocked_fail_closed');
  assert.equal(pkg.decision, 'NOT_READY_BLOCKED');
  assert.equal(pkg.finalOwnerReviewPackageAccepted, false);
  assert.equal(pkg.readyForExactOwnerReview, false);
  assert.ok(
    pkg.blockerIds.includes(
      'owner_approval_boundary_field_value_disclosure_current_head_binding'
    )
  );
  assert.ok(
    pkg.blockerIds.includes(
      'owner_approval_boundary_authorization_execution_or_readiness_claim_present'
    )
  );
  assert.ok(
    pkg.blockerIds.includes('owner_approval_boundary_safety_readinessClaimed')
  );
  assert.equal(pkg.approvalLineGenerated, false);
  assert.equal(pkg.approvalTextGenerated, false);
  assert.equal(pkg.rcCutoverExecutionAllowed, false);
  assert.equal(pkg.rcReady, false);
  assert.equal(pkg.canClaimRcReady, false);
  assertNoForbiddenMaterial(pkg);
});

test('v1 RC aggregator final owner-review package output fails closed without P75 input', () => {
  const result = spawnSync(
    process.execPath,
    [
      aggregatorCliPath,
      '--rc-cutover-final-owner-review-package',
      '--pretty',
      '--generated-at',
      '2026-07-07T01:00:00.000Z'
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 30000,
      env: {
        ...process.env,
        NODE_NO_WARNINGS: '1',
        CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: 'false'
      }
    }
  );
  const pkg = JSON.parse(result.stdout);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    pkg.schemaVersion,
    'p77-rc-cutover-final-owner-review-package-aggregation-v1'
  );
  assert.equal(pkg.status, 'final_owner_review_package_blocked_fail_closed');
  assert.equal(pkg.decision, 'NOT_READY_BLOCKED');
  assert.equal(pkg.ownerApprovalBoundaryInputProvided, false);
  assert.equal(pkg.finalOwnerReviewPackageAccepted, false);
  assert.equal(pkg.readyForExactOwnerReview, false);
  assert.ok(pkg.blockerIds.includes('owner_approval_boundary_schema_version_mismatch'));
  assert.ok(pkg.blockerIds.includes('owner_approval_boundary_not_accepted'));
  assert.equal(pkg.packageContents.boundaryFieldValuesIncluded, false);
  assert.equal(pkg.approvalLineGenerated, false);
  assert.equal(pkg.approvalTextGenerated, false);
  assert.equal(pkg.rcCutoverExecutionAllowed, false);
  assert.equal(pkg.rcReady, false);
  assert.equal(pkg.safety.submitsApprovalRequest, false);
  assert.equal(pkg.safety.executesCutover, false);
  assert.equal(pkg.safety.readinessClaimed, false);
  assert.equal(pkg.canClaimRcReady, false);
  assertNoForbiddenMaterial(pkg);
});

test('RC cutover owner approval execution boundary precheck accepts P77 package without executing', async () => {
  const pkg = await buildAcceptedRcCutoverFinalOwnerReviewPackage();
  const precheck = buildRcCutoverOwnerApprovalExecutionBoundaryPrecheck({
    rcCutoverFinalOwnerReviewPackageAggregation: pkg
  });

  assertAcceptedFinalOwnerReviewPackage(pkg);
  assertAcceptedOwnerApprovalExecutionBoundaryPrecheck(precheck);
  assertNoForbiddenMaterial(precheck);
});

test('RC cutover owner approval execution boundary precheck rejects self-attested P77 package without provenance', async () => {
  const pkg = await buildAcceptedRcCutoverFinalOwnerReviewPackage();
  delete pkg.sourceChainProvenance;
  const precheck = buildRcCutoverOwnerApprovalExecutionBoundaryPrecheck({
    rcCutoverFinalOwnerReviewPackageAggregation: pkg
  });

  assert.equal(
    precheck.status,
    'owner_approval_execution_boundary_precheck_blocked_fail_closed'
  );
  assert.equal(precheck.decision, 'NOT_READY_BLOCKED');
  assert.equal(precheck.boundaryPrecheckAccepted, false);
  assert.equal(precheck.readyForExactOwnerReview, false);
  assert.equal(precheck.terminalLocalPreCandidatePackage, false);
  assert.equal(precheck.executionBoundaryPrepared, false);
  assert.equal(precheck.sourceSummary.sourceChainProvenanceAccepted, false);
  assert.equal(precheck.sourceSummary.sourceChainRowCount, 0);
  assert.ok(
    precheck.blockerIds.includes(
      'final_owner_review_package_source_chain_provenance_invalid'
    )
  );
  assert.ok(
    precheck.blockerIds.includes(
      'final_owner_review_package_source_chain_row_count_mismatch'
    )
  );
  assert.equal(precheck.approvalLineGenerated, false);
  assert.equal(precheck.approvalTextGenerated, false);
  assert.equal(precheck.canProceedToCutoverExecution, false);
  assert.equal(precheck.rcCutoverExecutionAllowed, false);
  assert.equal(precheck.rcReady, false);
  assert.equal(precheck.canClaimRcReady, false);
  assertNoForbiddenMaterial(precheck);
});

test('RC cutover owner approval execution boundary precheck rejects self-attested P77 package without source-chain proof', async () => {
  const pkg = await buildAcceptedRcCutoverFinalOwnerReviewPackage();
  delete pkg.sourceChainProof;
  const precheck = buildRcCutoverOwnerApprovalExecutionBoundaryPrecheck({
    rcCutoverFinalOwnerReviewPackageAggregation: pkg
  });

  assert.equal(
    precheck.status,
    'owner_approval_execution_boundary_precheck_blocked_fail_closed'
  );
  assert.equal(precheck.decision, 'NOT_READY_BLOCKED');
  assert.equal(precheck.boundaryPrecheckAccepted, false);
  assert.equal(precheck.readyForExactOwnerReview, false);
  assert.equal(precheck.terminalLocalPreCandidatePackage, false);
  assert.equal(precheck.executionBoundaryPrepared, false);
  assert.ok(
    precheck.blockerIds.includes(
      'final_owner_review_package_source_chain_proof_missing'
    )
  );
  assert.equal(precheck.approvalLineGenerated, false);
  assert.equal(precheck.approvalTextGenerated, false);
  assert.equal(precheck.canProceedToCutoverExecution, false);
  assert.equal(precheck.rcCutoverExecutionAllowed, false);
  assert.equal(precheck.rcReady, false);
  assert.equal(precheck.canClaimRcReady, false);
  assertNoForbiddenMaterial(precheck);
});

test('RC cutover owner approval execution boundary precheck rejects contradictory P75 status provenance', async () => {
  const pkg = await buildAcceptedRcCutoverFinalOwnerReviewPackage();
  pkg.sourceSummary.boundaryStatus =
    'owner_approval_boundary_display_blocked_fail_closed';
  pkg.sourceChainProvenance.sourceBoundaryStatus =
    'owner_approval_boundary_display_blocked_fail_closed';
  const precheck = buildRcCutoverOwnerApprovalExecutionBoundaryPrecheck({
    rcCutoverFinalOwnerReviewPackageAggregation: pkg
  });

  assert.equal(
    precheck.status,
    'owner_approval_execution_boundary_precheck_blocked_fail_closed'
  );
  assert.equal(precheck.decision, 'NOT_READY_BLOCKED');
  assert.equal(precheck.boundaryPrecheckAccepted, false);
  assert.equal(precheck.readyForExactOwnerReview, false);
  assert.equal(precheck.terminalLocalPreCandidatePackage, false);
  assert.equal(precheck.sourceSummary.sourceChainProvenanceAccepted, false);
  assert.equal(precheck.sourceSummary.sourceChainRowCount, 9);
  assert.ok(
    precheck.blockerIds.includes(
      'final_owner_review_package_source_summary_invalid'
    )
  );
  assert.ok(
    precheck.blockerIds.includes(
      'final_owner_review_package_source_chain_provenance_invalid'
    )
  );
  assert.equal(precheck.approvalLineGenerated, false);
  assert.equal(precheck.approvalTextGenerated, false);
  assert.equal(precheck.canProceedToCutoverExecution, false);
  assert.equal(precheck.rcCutoverExecutionAllowed, false);
  assert.equal(precheck.rcReady, false);
  assert.equal(precheck.canClaimRcReady, false);
  assertNoForbiddenMaterial(precheck);
});

test('v1 RC aggregator CLI rejects external P77 final owner-review package stdin for execution-boundary promotion', async () => {
  const pkg = await buildAcceptedRcCutoverFinalOwnerReviewPackage();
  const result = spawnSync(
    process.execPath,
    [
      aggregatorCliPath,
      '--rc-cutover-final-owner-review-package-report',
      '-',
      '--pretty',
      '--generated-at',
      '2026-07-07T01:00:00.000Z'
    ],
    {
      cwd: repoRoot,
      input: JSON.stringify(pkg),
      encoding: 'utf8',
      timeout: 30000,
      env: {
        ...process.env,
        NODE_NO_WARNINGS: '1',
        CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: 'false'
      }
    }
  );
  const report = JSON.parse(result.stdout);
  const precheck = report.evidence.p78RcCutoverOwnerApprovalExecutionBoundaryPrecheck;

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    report.phase,
    'P78-rc-cutover-owner-approval-execution-boundary-precheck'
  );
  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.rcCutoverFinalOwnerReviewPackageReportInput.provided, true);
  assert.equal(report.rcCutoverFinalOwnerReviewPackageReportInput.accepted, false);
  assert.equal(report.rcCutoverFinalOwnerReviewPackageReportInput.rejected, true);
  assert.equal(report.rcCutoverFinalOwnerReviewPackageReportInput.pathDisclosed, false);
  assert.equal(report.rcCutoverFinalOwnerReviewPackageReportInput.rawInputPrinted, false);
  assert.equal(
    precheck.status,
    'owner_approval_execution_boundary_precheck_blocked_fail_closed'
  );
  assert.equal(precheck.boundaryPrecheckAccepted, false);
  assert.equal(precheck.readyForExactOwnerReview, false);
  assert.equal(precheck.terminalLocalPreCandidatePackage, false);
  assert.ok(
    precheck.blockerIds.includes(
      'final_owner_review_package_source_chain_not_same_process'
    )
  );
  assert.equal(report.summary.rcCutoverFinalOwnerReviewPackageReportInputProvided, true);
  assert.equal(report.summary.rcCutoverFinalOwnerReviewPackageReportInputAccepted, false);
  assert.equal(
    report.summary.rcCutoverOwnerApprovalExecutionBoundaryPrecheckAccepted,
    false
  );
  assert.equal(
    report.summary.rcCutoverOwnerApprovalExecutionBoundaryPrecheckReadyForExactReview,
    false
  );
  assert.equal(
    report.summary.rcCutoverOwnerApprovalExecutionBoundaryPrecheckChecklistCount,
    8
  );
  assert.equal(
    report.summary.rcCutoverOwnerApprovalExecutionBoundaryPrecheckTerminalLocalPreCandidatePackage,
    false
  );
  assert.equal(
    report.summary.rcCutoverOwnerApprovalExecutionBoundaryPrecheckNoAdditionalLocalWrapperRequired,
    true
  );
  assert.equal(
    report.summary.rcCutoverOwnerApprovalExecutionBoundaryPrecheckNextBoundaryRequiresExactOwnerDecision,
    true
  );
  assert.equal(
    report.summary.rcCutoverOwnerApprovalExecutionBoundaryPrecheckApprovalGenerated,
    false
  );
  assert.equal(
    report.summary.rcCutoverOwnerApprovalExecutionBoundaryPrecheckExecutesCutover,
    false
  );
  assert.equal(
    report.summary.rcCutoverOwnerApprovalExecutionBoundaryPrecheckCanClaimRcReady,
    false
  );
  assert.equal(
    Object.hasOwn(report.evidence, 'p77RcCutoverFinalOwnerReviewPackageAggregation'),
    false
  );
  assertNoForbiddenMaterial(report);
});

test('v1 RC aggregator CLI rejects self-attested P77 stdin package without source-chain proof', async () => {
  const pkg = await buildAcceptedRcCutoverFinalOwnerReviewPackage();
  delete pkg.sourceChainProof;
  const result = spawnSync(
    process.execPath,
    [
      aggregatorCliPath,
      '--rc-cutover-final-owner-review-package-report',
      '-',
      '--pretty',
      '--generated-at',
      '2026-07-07T01:00:00.000Z'
    ],
    {
      cwd: repoRoot,
      input: JSON.stringify(pkg),
      encoding: 'utf8',
      timeout: 30000,
      env: {
        ...process.env,
        NODE_NO_WARNINGS: '1',
        CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: 'false'
      }
    }
  );
  const report = JSON.parse(result.stdout);
  const precheck = report.evidence.p78RcCutoverOwnerApprovalExecutionBoundaryPrecheck;

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    report.phase,
    'P78-rc-cutover-owner-approval-execution-boundary-precheck'
  );
  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.rcCutoverFinalOwnerReviewPackageReportInput.provided, true);
  assert.equal(report.rcCutoverFinalOwnerReviewPackageReportInput.accepted, false);
  assert.equal(report.rcCutoverFinalOwnerReviewPackageReportInput.rejected, true);
  assert.equal(precheck.boundaryPrecheckAccepted, false);
  assert.equal(precheck.readyForExactOwnerReview, false);
  assert.equal(precheck.terminalLocalPreCandidatePackage, false);
  assert.ok(
    precheck.blockerIds.includes(
      'final_owner_review_package_source_chain_proof_missing'
    )
  );
  assert.equal(
    report.summary.rcCutoverOwnerApprovalExecutionBoundaryPrecheckAccepted,
    false
  );
  assert.equal(report.summary.rcCutoverFinalOwnerReviewPackageReportInputAccepted, false);
  assert.equal(
    report.summary.rcCutoverOwnerApprovalExecutionBoundaryPrecheckTerminalLocalPreCandidatePackage,
    false
  );
  assert.equal(
    report.summary.rcCutoverOwnerApprovalExecutionBoundaryPrecheckExecutesCutover,
    false
  );
  assert.equal(
    report.summary.rcCutoverOwnerApprovalExecutionBoundaryPrecheckCanClaimRcReady,
    false
  );
  assertNoForbiddenMaterial(report);
});

test('v1 RC aggregator CLI emits blocked execution boundary precheck for external P77 package', async () => {
  const pkg = await buildAcceptedRcCutoverFinalOwnerReviewPackage();
  const result = spawnSync(
    process.execPath,
    [
      aggregatorCliPath,
      '--rc-cutover-final-owner-review-package-report',
      '-',
      '--rc-cutover-execution-boundary-precheck',
      '--pretty',
      '--generated-at',
      '2026-07-07T01:00:00.000Z'
    ],
    {
      cwd: repoRoot,
      input: JSON.stringify(pkg),
      encoding: 'utf8',
      timeout: 30000,
      env: {
        ...process.env,
        NODE_NO_WARNINGS: '1',
        CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: 'false'
      }
    }
  );
  const precheck = JSON.parse(result.stdout);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    precheck.status,
    'owner_approval_execution_boundary_precheck_blocked_fail_closed'
  );
  assert.equal(precheck.boundaryPrecheckAccepted, false);
  assert.equal(precheck.readyForExactOwnerReview, false);
  assert.equal(precheck.terminalLocalPreCandidatePackage, false);
  assert.ok(
    precheck.blockerIds.includes(
      'final_owner_review_package_source_chain_not_same_process'
    )
  );
  assert.equal(Object.hasOwn(precheck, 'phase'), false);
  assert.equal(Object.hasOwn(precheck, 'summary'), false);
  assert.equal(Object.hasOwn(precheck, 'evidence'), false);
  assert.equal(precheck.executionBoundaryChecklist.valuesIncluded, false);
  assert.equal(precheck.approvalLineGenerated, false);
  assert.equal(precheck.approvalTextGenerated, false);
  assert.equal(precheck.approvalTemplateGenerated, false);
  assert.equal(precheck.canProceedToCutoverExecution, false);
  assert.equal(precheck.terminalLocalPreCandidatePackage, false);
  assert.equal(precheck.additionalLocalWrapperRequired, false);
  assert.equal(precheck.chainConvergence.noAdditionalLocalWrapperRequired, true);
  assert.equal(precheck.chainConvergence.nextBoundaryType, 'separate_exact_owner_decision');
  assert.equal(precheck.safety.submitsApprovalRequest, false);
  assert.equal(precheck.safety.executesCutover, false);
  assert.equal(precheck.safety.readinessClaimed, false);
  assertNoForbiddenMaterial(precheck);
});

test('RC cutover owner approval execution boundary precheck fails closed on package drift', async () => {
  const pkg = await buildAcceptedRcCutoverFinalOwnerReviewPackage();
  pkg.packageContents.approvalMaterialIncluded = true;
  pkg.approvalTemplateGenerated = true;
  pkg.ownerApprovalPresent = true;
  pkg.safety.executesCutover = true;
  const precheck = buildRcCutoverOwnerApprovalExecutionBoundaryPrecheck({
    rcCutoverFinalOwnerReviewPackageAggregation: pkg
  });

  assert.equal(
    precheck.status,
    'owner_approval_execution_boundary_precheck_blocked_fail_closed'
  );
  assert.equal(precheck.decision, 'NOT_READY_BLOCKED');
  assert.equal(precheck.boundaryPrecheckAccepted, false);
  assert.equal(precheck.readyForExactOwnerReview, false);
  assert.equal(precheck.terminalLocalPreCandidatePackage, false);
  assert.equal(precheck.additionalLocalWrapperRequired, false);
  assert.equal(precheck.nextRequiredBoundary, 'repair_existing_input_not_add_wrapper');
  assert.equal(
    precheck.chainConvergence.convergenceStatus,
    'terminal_local_pre_candidate_package_blocked_pending_input_repair'
  );
  assert.equal(precheck.chainConvergence.noAdditionalLocalWrapperRequired, true);
  assert.equal(precheck.chainConvergence.repairInsteadOfWrapWhenBlocked, true);
  assert.ok(
    precheck.blockerIds.includes(
      'final_owner_review_package_contents_boundary_invalid'
    )
  );
  assert.ok(
    precheck.blockerIds.includes(
      'final_owner_review_package_approval_execution_or_readiness_claim_present'
    )
  );
  assert.ok(precheck.blockerIds.includes('final_owner_review_package_safety_executesCutover'));
  assert.equal(precheck.approvalLineGenerated, false);
  assert.equal(precheck.approvalTextGenerated, false);
  assert.equal(precheck.rcCutoverExecutionAllowed, false);
  assert.equal(precheck.canProceedToCutoverExecution, false);
  assert.equal(precheck.rcReady, false);
  assert.equal(precheck.canClaimRcReady, false);
  assertNoForbiddenMaterial(precheck);
});

test('v1 RC aggregator execution boundary precheck output fails closed without P77 input', () => {
  const result = spawnSync(
    process.execPath,
    [
      aggregatorCliPath,
      '--rc-cutover-execution-boundary-precheck',
      '--pretty',
      '--generated-at',
      '2026-07-07T01:00:00.000Z'
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 30000,
      env: {
        ...process.env,
        NODE_NO_WARNINGS: '1',
        CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: 'false'
      }
    }
  );
  const precheck = JSON.parse(result.stdout);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    precheck.schemaVersion,
    'p78-rc-cutover-owner-approval-execution-boundary-precheck-v1'
  );
  assert.equal(
    precheck.status,
    'owner_approval_execution_boundary_precheck_blocked_fail_closed'
  );
  assert.equal(precheck.decision, 'NOT_READY_BLOCKED');
  assert.equal(precheck.finalOwnerReviewPackageInputProvided, false);
  assert.equal(precheck.boundaryPrecheckAccepted, false);
  assert.equal(precheck.readyForExactOwnerReview, false);
  assert.equal(precheck.terminalLocalPreCandidatePackage, false);
  assert.equal(precheck.additionalLocalWrapperRequired, false);
  assert.equal(precheck.nextRequiredBoundary, 'repair_existing_input_not_add_wrapper');
  assert.equal(precheck.chainConvergence.noAdditionalLocalWrapperRequired, true);
  assert.equal(precheck.chainConvergence.repairInsteadOfWrapWhenBlocked, true);
  assert.ok(
    precheck.blockerIds.includes(
      'final_owner_review_package_schema_version_mismatch'
    )
  );
  assert.ok(precheck.blockerIds.includes('final_owner_review_package_not_accepted'));
  assert.equal(precheck.executionBoundaryChecklist.valuesIncluded, false);
  assert.equal(precheck.approvalLineGenerated, false);
  assert.equal(precheck.approvalTextGenerated, false);
  assert.equal(precheck.rcCutoverExecutionAllowed, false);
  assert.equal(precheck.canProceedToCutoverExecution, false);
  assert.equal(precheck.rcReady, false);
  assert.equal(precheck.safety.submitsApprovalRequest, false);
  assert.equal(precheck.safety.executesCutover, false);
  assert.equal(precheck.safety.readinessClaimed, false);
  assert.equal(precheck.canClaimRcReady, false);
  assertNoForbiddenMaterial(precheck);
});

test('v1 RC aggregator CLI rejects piped blocked P72 stdout artifact as cross-process input', async () => {
  const sourceReport = await buildZeroGapLowDisclosureReport();
  const artifactResult = spawnSync(
    process.execPath,
    [
      aggregatorCliPath,
      '--runtime-evidence-report',
      '-',
      '--runtime-evidence-current-head',
      fixtureCommit,
      '--runtime-evidence-expected-current-head',
      fixtureCommit,
      '--runtime-evidence-generated-at',
      fixtureEvidenceGeneratedAt,
      '--generated-at',
      '2026-07-07T01:00:00.000Z',
      '--rc-cutover-candidate-artifact'
    ],
    {
      cwd: repoRoot,
      input: JSON.stringify(sourceReport),
      encoding: 'utf8',
      timeout: 30000,
      env: {
        ...process.env,
        NODE_NO_WARNINGS: '1',
        CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: 'false'
      }
    }
  );
  const artifact = JSON.parse(artifactResult.stdout);
  const intakeResult = spawnSync(
    process.execPath,
    [
      aggregatorCliPath,
      '--rc-cutover-candidate-artifact-report',
      '-',
      '--generated-at',
      '2026-07-07T01:00:00.000Z'
    ],
    {
      cwd: repoRoot,
      input: artifactResult.stdout,
      encoding: 'utf8',
      timeout: 30000,
      env: {
        ...process.env,
        NODE_NO_WARNINGS: '1',
        CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: 'false'
      }
    }
  );
  const report = JSON.parse(intakeResult.stdout);
  const intake = report.evidence.p73RcCutoverCandidateArtifactIntakePrecheck;
  const boundary = report.evidence.p75RcCutoverOwnerApprovalBoundaryPrecheck;

  assert.equal(artifactResult.status, 0, artifactResult.stderr);
  assertBlockedArtifactExport(
    artifact,
    'p67_runtime_evidence_standard_input_preflight_not_accepted'
  );
  assert.equal(artifact.export.fileWritten, false);
  assert.equal(artifact.export.durableArtifactWritten, false);
  assert.equal(intakeResult.status, 0, intakeResult.stderr);
  assert.equal(report.phase, 'P73-rc-cutover-candidate-artifact-intake-precheck');
  assert.equal(intake.status, 'candidate_artifact_intake_blocked_fail_closed');
  assert.equal(intake.inputAccepted, false);
  assert.equal(intake.ownerReviewInputReady, false);
  assert.ok(intake.blockerIds.includes('artifact_not_accepted'));
  assert.ok(intake.blockerIds.includes('artifact_status_not_owner_review_ready'));
  assert.ok(
    intake.blockerIds.includes(
      'artifact_final_evidence_package_outlet_source_chain_not_same_process'
    )
  );
  assert.ok(intake.blockerIds.includes('artifact_source_chain_not_same_process'));
  assert.equal(boundary.status, 'owner_approval_boundary_display_blocked_fail_closed');
  assert.equal(boundary.boundaryPrecheckAccepted, false);
  assert.equal(report.rcCutoverCandidateArtifactReportInput.pathDisclosed, false);
  assert.equal(report.rcCutoverCandidateArtifactReportInput.rawInputPrinted, false);
  assert.equal(report.summary.rcCutoverCandidateArtifactIntakeAccepted, false);
  assert.equal(report.summary.rcCutoverCandidateArtifactIntakeApprovalSubmitted, false);
  assert.equal(report.summary.rcCutoverCandidateArtifactIntakeExecutesCutover, false);
  assert.equal(report.summary.rcCutoverCandidateArtifactIntakeCanClaimRcReady, false);
  assert.equal(report.summary.rcCutoverOwnerApprovalBoundaryDisplayReady, false);
  assert.equal(report.summary.rcCutoverOwnerApprovalBoundaryApprovalGenerated, false);
  assert.equal(report.summary.rcCutoverOwnerApprovalBoundaryExecutesCutover, false);
  assert.equal(report.summary.rcCutoverOwnerApprovalBoundaryCanClaimRcReady, false);
  assertNoForbiddenMaterial(artifact);
  assertNoForbiddenMaterial(report);
});

test('RC cutover candidate artifact intake fails closed on approval execution or output drift', async () => {
  const artifact = await buildAcceptedRcCutoverCandidateArtifact();
  const driftedArtifact = JSON.parse(JSON.stringify(artifact));
  driftedArtifact.export.fileWritten = true;
  driftedArtifact.approvalLineGenerated = true;
  driftedArtifact.rcCutoverExecutionAllowed = true;
  driftedArtifact.safety.readinessClaimed = true;
  const intake = buildRcCutoverCandidateArtifactIntakePrecheck({
    rcCutoverCandidateArtifactExport: driftedArtifact
  });
  const boundary = buildRcCutoverOwnerApprovalBoundaryPrecheck({
    rcCutoverCandidateArtifactIntakePrecheck: intake
  });

  assert.equal(intake.status, 'candidate_artifact_intake_blocked_fail_closed');
  assert.equal(intake.inputAccepted, false);
  assert.equal(intake.ownerReviewInputReady, false);
  assert.ok(intake.blockerIds.includes('artifact_export_policy_not_stdout_only'));
  assert.ok(
    intake.blockerIds.includes(
      'artifact_approval_execution_or_readiness_claim_present'
    )
  );
  assert.ok(intake.blockerIds.includes('artifact_safety_readinessClaimed'));
  assert.equal(intake.rcCutoverExecutionAllowed, false);
  assert.equal(intake.rcReady, false);
  assert.equal(intake.canClaimRcReady, false);
  assert.equal(boundary.status, 'owner_approval_boundary_display_blocked_fail_closed');
  assert.equal(boundary.boundaryPrecheckAccepted, false);
  assert.equal(boundary.ownerApprovalBoundaryDisplayReady, false);
  assert.ok(boundary.blockerIds.includes('candidate_artifact_intake_not_accepted'));
  assert.ok(boundary.blockerIds.includes('owner_review_input_not_ready'));
  assert.ok(boundary.blockerIds.includes('artifact_export_policy_not_stdout_only'));
  assert.equal(boundary.requiredBoundaryFieldValuesIncluded, false);
  assert.equal(boundary.generatedApprovalMaterial.approvalLineGenerated, false);
  assert.equal(boundary.generatedApprovalMaterial.approvalTextGenerated, false);
  assert.equal(boundary.rcCutoverExecutionAllowed, false);
  assert.equal(boundary.rcReady, false);
  assert.equal(boundary.canClaimRcReady, false);
  assertNoForbiddenMaterial(intake);
  assertNoForbiddenMaterial(boundary);
});

test('runtime evidence aggregation preflight rejects unsupported artifact gap IDs fail-closed', async () => {
  const sourceReport = await buildZeroGapLowDisclosureReport();
  sourceReport.runtimeEvidenceArtifact.runtimeEvidenceSummary.locallyEvidencedRuntimeGaps = [
    'unsupported_private_runtime_gap_id'
  ];
  const preflight = buildAuthenticatedHttpBoundedMutationRuntimeEvidenceAggregationPreflight(
    sourceReport,
    {
      generatedAt: '2026-07-07T01:00:00.000Z',
      exactHeadBoundRuntimeSummaryInput: {
        currentHeadCommit: fixtureCommit,
        expectedCurrentHeadCommit: fixtureCommit,
        evidenceGeneratedAt: fixtureEvidenceGeneratedAt
      }
    }
  );

  assert.equal(preflight.status, 'blocked_fail_closed');
  assert.equal(preflight.standardInputSourceAccepted, false);
  assert.ok(preflight.blockers.includes('source_runtime_gap_allowlist_rejected'));
  assert.deepEqual(preflight.runtimeEvidenceSummaryForAggregator.locallyEvidencedRuntimeGaps, []);
  assert.equal(preflight.aggregatorReplay.canClaimV1RcReady, false);
  assert.doesNotMatch(JSON.stringify(preflight), /unsupported_private_runtime_gap_id/);
});

test('runtime evidence aggregation preflight rejects non-array artifact gap fields fail-closed', async () => {
  const sourceReport = await buildZeroGapLowDisclosureReport();
  sourceReport.runtimeEvidenceArtifact.runtimeEvidenceSummary.locallyEvidencedRuntimeGaps =
    'validation_aggregator_full_implementation_incomplete';
  const preflight = buildAuthenticatedHttpBoundedMutationRuntimeEvidenceAggregationPreflight(
    sourceReport,
    {
      generatedAt: '2026-07-07T01:00:00.000Z',
      exactHeadBoundRuntimeSummaryInput: {
        currentHeadCommit: fixtureCommit,
        expectedCurrentHeadCommit: fixtureCommit,
        evidenceGeneratedAt: fixtureEvidenceGeneratedAt
      }
    }
  );

  assert.equal(preflight.status, 'blocked_fail_closed');
  assert.equal(preflight.standardInputSourceAccepted, false);
  assert.ok(preflight.blockers.includes('source_runtime_gap_array_shape_invalid'));
  assert.notDeepEqual(
    preflight.runtimeEvidenceSummaryForAggregator.locallyEvidencedRuntimeGaps,
    ['validation_aggregator_full_implementation_incomplete']
  );
  assert.equal(preflight.aggregatorReplay.canClaimV1RcReady, false);
});

test('v1 RC aggregator CLI rejects unsafe runtime evidence report material fail-closed', () => {
  const unsafeReport = {
    schemaVersion: 'authenticated-http-bounded-mutation-proof-runtime-evidence-report-v1',
    status: 'ok',
    decision: 'AUTHENTICATED_HTTP_BOUNDED_CLEANUP_SUPPRESSION_RUNTIME_EVIDENCE_AGGREGATION_ACCEPTED_NOT_READY',
    accepted: true,
    runtimeEvidenceArtifact: {
      schemaVersion: 'authenticated-http-bounded-mutation-proof-runtime-evidence-artifact-v1',
      artifactType: 'explicit_sanitized_runtime_evidence_summary_artifact',
      status: 'accepted_by_validation_aggregator',
      aggregatorInputFed: true,
      runtimeEvidenceSummary: {
        runnerExecuted: true,
        commandsExecuted: true,
        localRuntimeEvidenceMatrixExecuted: true,
        allowlistedFinalRcEvidenceRunnerExecuted: true,
        criticalGateCount: 2,
        criticalGatePassedCount: 2,
        criticalGateFailedCount: 0,
        allCriticalCommandsPassed: true,
        evidenceUnitCount: 5,
        requiredEvidenceUnitCount: 5
      },
      validationAggregatorBridge: {
        accepted: true,
        canClaimV1RcReady: false
      },
      disclosure: {
        lowDisclosure: true,
        endpointOrLocatorIncluded: false,
        rawResponseIncluded: false,
        secretIncluded: false
      },
      safety: {
        providerCalls: 0,
        readinessClaimed: false
      },
      leaked: ['http', '://127.0.0.1', ':9999'].join('')
    }
  };
  const report = buildCliReport({
    generatedAt: '2026-07-07T01:00:00.000Z',
    runtimeEvidenceReport: unsafeReport
  });
  const preflight =
    report.evidence.p67AuthenticatedHttpBoundedMutationRuntimeEvidencePreflight;

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.summary.runtimeEvidenceReportInputProvided, true);
  assert.equal(report.summary.runtimeEvidenceReportStandardInputSourceAccepted, false);
  assert.equal(preflight.status, 'blocked_fail_closed');
  assert.equal(preflight.standardInputSourceAccepted, false);
  assert.ok(preflight.blockers.includes('source_report_contains_forbidden_material'));
  assert.equal(preflight.aggregatorReplay.canClaimV1RcReady, false);
  assert.doesNotMatch(JSON.stringify(report), /9999/);
});

test('v1 RC aggregator runtime evidence report argument is parsed and secret-adjacent paths are rejected', () => {
  assert.deepEqual(parseArgs(['--runtime-evidence-report', '-', '--pretty']), {
    pretty: true,
    strict: false,
    help: false,
    rcCutoverCandidateArtifact: false,
    rcCutoverOwnerApprovalBoundary: false,
    rcCutoverFinalOwnerReviewPackage: false,
    rcCutoverExecutionBoundaryPrecheck: false,
    generatedAt: null,
    runtimeEvidenceReportPath: '-',
    rejectedFlag: null
  });

  assert.deepEqual(
    parseArgs([
      '--runtime-evidence-report',
      '-',
      '--runtime-evidence-current-head',
      fixtureCommit,
      '--runtime-evidence-expected-current-head',
      fixtureCommit,
      '--runtime-evidence-generated-at',
      fixtureEvidenceGeneratedAt
    ]),
    {
      pretty: false,
      strict: false,
      help: false,
      rcCutoverCandidateArtifact: false,
      rcCutoverOwnerApprovalBoundary: false,
      rcCutoverFinalOwnerReviewPackage: false,
      rcCutoverExecutionBoundaryPrecheck: false,
      generatedAt: null,
      runtimeEvidenceReportPath: '-',
      runtimeEvidenceCurrentHead: fixtureCommit,
      runtimeEvidenceExpectedCurrentHead: fixtureCommit,
      runtimeEvidenceGeneratedAt: fixtureEvidenceGeneratedAt,
      rejectedFlag: null
    }
  );

  assert.equal(
    parseArgs(['--runtime-evidence-report', '-', '--rc-cutover-candidate-artifact'])
      .rcCutoverCandidateArtifact,
    true
  );
  assert.equal(
    parseArgs(['--rc-cutover-candidate-artifact-report', '-'])
      .rcCutoverCandidateArtifactReportPath,
    '-'
  );
  assert.equal(
    parseArgs(['--rc-cutover-owner-approval-boundary'])
      .rcCutoverOwnerApprovalBoundary,
    true
  );
  assert.equal(
    parseArgs(['--rc-cutover-owner-approval-boundary-report', '-'])
      .rcCutoverOwnerApprovalBoundaryReportPath,
    '-'
  );
  assert.equal(
    parseArgs(['--rc-cutover-final-owner-review-package'])
      .rcCutoverFinalOwnerReviewPackage,
    true
  );
  assert.equal(
    parseArgs(['--rc-cutover-final-owner-review-package-report', '-'])
      .rcCutoverFinalOwnerReviewPackageReportPath,
    '-'
  );
  assert.equal(
    parseArgs(['--rc-cutover-execution-boundary-precheck'])
      .rcCutoverExecutionBoundaryPrecheck,
    true
  );

  const rejectedEnv = readRuntimeEvidenceReportInput('.env', { cwd: repoRoot });
  assert.equal(rejectedEnv.ok, false);
  assert.equal(rejectedEnv.reason, 'runtime_evidence_report_path_rejected');

  const rejectedSecret = readRuntimeEvidenceReportInput('tmp/secret-report.json', {
    cwd: repoRoot
  });
  assert.equal(rejectedSecret.ok, false);
  assert.equal(rejectedSecret.reason, 'runtime_evidence_report_path_rejected');

  const rejectedArtifactEnv = readRcCutoverCandidateArtifactReportInput('.env', {
    cwd: repoRoot
  });
  assert.equal(rejectedArtifactEnv.ok, false);
  assert.equal(
    rejectedArtifactEnv.reason,
    'rc_cutover_candidate_artifact_report_path_rejected'
  );

  const rejectedArtifactSecret = readRcCutoverCandidateArtifactReportInput(
    'tmp/secret-artifact.json',
    { cwd: repoRoot }
  );
  assert.equal(rejectedArtifactSecret.ok, false);
  assert.equal(
    rejectedArtifactSecret.reason,
    'rc_cutover_candidate_artifact_report_path_rejected'
  );

  const rejectedBoundaryEnv = readRcCutoverOwnerApprovalBoundaryReportInput('.env', {
    cwd: repoRoot
  });
  assert.equal(rejectedBoundaryEnv.ok, false);
  assert.equal(
    rejectedBoundaryEnv.reason,
    'rc_cutover_owner_approval_boundary_report_path_rejected'
  );

  const rejectedBoundarySecret = readRcCutoverOwnerApprovalBoundaryReportInput(
    'tmp/secret-boundary.json',
    { cwd: repoRoot }
  );
  assert.equal(rejectedBoundarySecret.ok, false);
  assert.equal(
    rejectedBoundarySecret.reason,
    'rc_cutover_owner_approval_boundary_report_path_rejected'
  );

  const rejectedPackageEnv = readRcCutoverFinalOwnerReviewPackageReportInput('.env', {
    cwd: repoRoot
  });
  assert.equal(rejectedPackageEnv.ok, false);
  assert.equal(
    rejectedPackageEnv.reason,
    'rc_cutover_final_owner_review_package_report_path_rejected'
  );

  const rejectedPackageSecret = readRcCutoverFinalOwnerReviewPackageReportInput(
    'tmp/secret-final-owner-review-package.json',
    { cwd: repoRoot }
  );
  assert.equal(rejectedPackageSecret.ok, false);
  assert.equal(
    rejectedPackageSecret.reason,
    'rc_cutover_final_owner_review_package_report_path_rejected'
  );
});
