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
  buildRcCutoverOwnerApprovalBoundaryPrecheck,
  parseArgs,
  readRcCutoverCandidateArtifactReportInput,
  readRuntimeEvidenceReportInput
} = require('../src/cli/v1-rc-validation-aggregator');

const repoRoot = path.resolve(__dirname, '..');
const aggregatorCliPath = path.join('src', 'cli', 'v1-rc-validation-aggregator.js');
const fixtureCommit = 'abc1234def5678';
const fixtureEvidenceGeneratedAt = '2026-07-07T00:30:00.000Z';

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
  assert.equal(report.summary.runtimeEvidenceReportStandardInputSourceAccepted, true);
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
  assert.equal(preflight.standardInputSourceAccepted, true);
  assert.equal(preflight.aggregatorReplay.rejectReason, 'current_head_binding_required');
  assert.equal(preflight.aggregatorReplay.canClaimV1RcReady, false);
  assert.equal(rcGatePrecheck.standardInputSourceAccepted, true);
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

test('v1 RC aggregator CLI accepts exact head-bound metadata separately and redacts raw values', async () => {
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
  assert.equal(report.summary.runtimeEvidenceReportStandardInputSourceAccepted, true);
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
  assert.equal(preflight.aggregatorReplay.accepted, true);
  assert.equal(preflight.aggregatorReplay.currentHeadBindingStatus, 'matched');
  assert.equal(preflight.aggregatorReplay.evidenceFreshnessStatus, 'fresh');
  assert.equal(rcGatePrecheck.status, 'exact_head_bound_runtime_summary_accepted_by_final_aggregation_not_ready');
  assert.equal(rcGatePrecheck.decision, 'NOT_READY_BLOCKED');
  assert.equal(rcGatePrecheck.standardInputSourceAccepted, true);
  assert.equal(rcGatePrecheck.exactHeadBoundInputProvided, true);
  assert.equal(rcGatePrecheck.exactHeadBoundInputAccepted, true);
  assert.equal(rcGatePrecheck.runtimeEvidenceSummaryAccepted, true);
  assert.equal(rcGatePrecheck.finalEvidenceAggregationAccepted, true);
  assert.equal(rcGatePrecheck.rcGatePrecheckAccepted, true);
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
  assert.equal(finalEvidencePackage.chain.acceptedRowCount, 2);
  assert.equal(finalEvidencePackage.chain.missingRowCount, 2);
  assert.ok(
    finalEvidencePackage.chain.missingIds.includes(
      'p69_rc_cutover_pre_approval_candidate_package'
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
  assert.equal(finalEvidencePackage.evidenceSummary.rcGatePrecheckAccepted, true);
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
  assert.equal(report.summary.finalEvidenceAggregationRcGatePrecheckAccepted, true);
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

test('v1 RC aggregator CLI can promote allowlisted zero-gap artifact to RC gate precheck without readiness', async () => {
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

test('v1 RC aggregator CLI can emit only the low-disclosure RC cutover candidate artifact to stdout', async () => {
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
  assertAcceptedArtifactExport(artifact);
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
    true
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

test('v1 RC aggregator CLI can intake a P72 candidate artifact from stdin without approval or readiness', async () => {
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
  assert.equal(report.rcCutoverCandidateArtifactReportInput.accepted, true);
  assert.equal(report.rcCutoverCandidateArtifactReportInput.rejected, false);
  assert.equal(report.rcCutoverCandidateArtifactReportInput.pathDisclosed, false);
  assert.equal(report.rcCutoverCandidateArtifactReportInput.rawInputPrinted, false);
  assertAcceptedArtifactIntake(intake);
  assertAcceptedOwnerApprovalBoundaryPrecheck(boundary);
  assert.equal(report.summary.rcCutoverCandidateArtifactReportInputProvided, true);
  assert.equal(report.summary.rcCutoverCandidateArtifactReportInputAccepted, true);
  assert.equal(report.summary.rcCutoverCandidateArtifactIntakeAccepted, true);
  assert.equal(
    report.summary.rcCutoverCandidateArtifactIntakeReadyForOwnerReview,
    true
  );
  assert.equal(report.summary.rcCutoverCandidateArtifactIntakeBlockerCount, 0);
  assert.equal(report.summary.rcCutoverCandidateArtifactIntakeApprovalSubmitted, false);
  assert.equal(report.summary.rcCutoverCandidateArtifactIntakeExecutesCutover, false);
  assert.equal(report.summary.rcCutoverCandidateArtifactIntakeCanClaimRcReady, false);
  assert.equal(report.summary.rcCutoverOwnerApprovalBoundaryPrecheckAccepted, true);
  assert.equal(report.summary.rcCutoverOwnerApprovalBoundaryDisplayReady, true);
  assert.equal(report.summary.rcCutoverOwnerApprovalBoundaryFieldCount, 6);
  assert.equal(report.summary.rcCutoverOwnerApprovalBoundaryFieldValuesIncluded, false);
  assert.equal(report.summary.rcCutoverOwnerApprovalBoundaryApprovalGenerated, false);
  assert.equal(report.summary.rcCutoverOwnerApprovalBoundaryExecutesCutover, false);
  assert.equal(report.summary.rcCutoverOwnerApprovalBoundaryCanClaimRcReady, false);
  assert.equal(Object.hasOwn(report.evidence, 'p72RcCutoverCandidateArtifactExport'), false);
  assertNoForbiddenMaterial(report);
});

test('v1 RC aggregator CLI can pipe P72 stdout artifact into P73 intake without persistence', async () => {
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
  assertAcceptedArtifactExport(artifact);
  assert.equal(artifact.export.fileWritten, false);
  assert.equal(artifact.export.durableArtifactWritten, false);
  assert.equal(intakeResult.status, 0, intakeResult.stderr);
  assert.equal(report.phase, 'P73-rc-cutover-candidate-artifact-intake-precheck');
  assertAcceptedArtifactIntake(intake);
  assertAcceptedOwnerApprovalBoundaryPrecheck(boundary);
  assert.equal(report.rcCutoverCandidateArtifactReportInput.pathDisclosed, false);
  assert.equal(report.rcCutoverCandidateArtifactReportInput.rawInputPrinted, false);
  assert.equal(report.summary.rcCutoverCandidateArtifactIntakeAccepted, true);
  assert.equal(report.summary.rcCutoverCandidateArtifactIntakeApprovalSubmitted, false);
  assert.equal(report.summary.rcCutoverCandidateArtifactIntakeExecutesCutover, false);
  assert.equal(report.summary.rcCutoverCandidateArtifactIntakeCanClaimRcReady, false);
  assert.equal(report.summary.rcCutoverOwnerApprovalBoundaryDisplayReady, true);
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
});
