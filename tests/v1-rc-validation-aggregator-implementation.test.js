const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');

const {
  VALIDATION_EVIDENCE_COMMAND_COVERAGE_STATUSES,
  VALIDATION_EVIDENCE_CONFIDENCE_POSTURE_STATUSES,
  VALIDATION_EVIDENCE_FRESHNESS_STATUSES,
  VALIDATION_EVIDENCE_GATE_READINESS_STATUSES,
  VALIDATION_EVIDENCE_REJECTION_REASONS,
  VALIDATION_EVIDENCE_REJECTION_SUMMARY_STATUSES,
  VALIDATION_EVIDENCE_SOURCE_CLASSES,
  VALIDATION_EVIDENCE_SOURCE_TYPES,
  RUNTIME_EVIDENCE_SUMMARY_STATUSES,
  buildV1RcValidationAggregatorReport,
  normalizeValidationEvidenceSources
} = require('../src/core/ValidationAggregatorService');

const fixturePath = path.join(__dirname, 'fixtures', 'v1-rc-validation-aggregator-v1.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function hasNestedKey(value, key) {
  if (!value || typeof value !== 'object') return false;
  if (Object.hasOwn(value, key)) return true;
  if (Array.isArray(value)) return value.some(item => hasNestedKey(item, key));
  return Object.values(value).some(child => hasNestedKey(child, key));
}

function assertNoSensitiveSurface(report) {
  const {
    forbiddenFragments,
    forbiddenTopLevelKeys,
    ...scannedReport
  } = report;
  const encoded = JSON.stringify(scannedReport).toLowerCase();
  for (const fragment of report.forbiddenFragments) {
    assert.equal(encoded.includes(fragment), false, fragment);
  }
}

test('minimal implementation emits the P24.1 top-level contract shape', () => {
  const fixture = loadFixture();
  const report = buildV1RcValidationAggregatorReport({
    generatedAt: '2026-05-16T00:00:00.000Z'
  });

  assert.deepEqual(Object.keys(report).sort(), Object.keys(fixture).sort());
  assert.equal(report.schemaVersion, fixture.schemaVersion);
  assert.equal(report.version, fixture.version);
  assert.equal(report.mode, 'read-only');
  assert.equal(report.generated_at, '2026-05-16T00:00:00.000Z');
});

test('minimal implementation reports honest blocked state without claiming v1 RC readiness', () => {
  const report = buildV1RcValidationAggregatorReport();

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.notEqual(report.decision, 'READY_FOR_V1_0_RC');
  assert.equal(report.decisionContract.currentMustNotBe.includes('READY_FOR_V1_0_RC'), true);
  assert.equal(report.summary.a4SafeSlice, 'A4_SAFE_SLICE_PASSED');
  assert.equal(report.summary.fullFinalRcMatrixExecuted, false);
  assert.equal(report.summary.liveMcpHttpEvidenceRefreshed, false);
  assert.equal(report.summary.validationAggregatorImplemented, true);
  assert.equal(report.summary.validationAggregatorFullImplementation, false);
  assert.equal(report.summary.validationEvidenceReaderImplemented, true);
  assert.equal(report.summary.validationEvidenceSourceContract, 'explicit_safe_inputs_only');
  assert.equal(report.summary.validationEvidenceAcceptedCount, 0);
  assert.equal(report.summary.validationEvidenceFreshnessStatus, 'no_explicit_evidence');
  assert.equal(report.summary.validationEvidenceStaleCount, 0);
  assert.equal(report.summary.validationEvidenceGateReadinessStatus, 'not_ready_no_explicit_evidence');
  assert.equal(report.summary.validationEvidenceCanClaimV1RcReady, false);
  assert.equal(report.summary.validationEvidenceCommandCoverageStatus, 'no_explicit_evidence');
  assert.equal(report.summary.validationEvidenceCommandCount, 0);
  assert.equal(report.summary.validationEvidenceRejectionStatus, 'no_rejections');
  assert.equal(report.summary.validationEvidenceRejectedCount, 0);
  assert.equal(report.summary.validationEvidenceConfidencePostureStatus, 'no_explicit_evidence');
  assert.equal(report.summary.validationEvidenceConfidenceCanClaimV1RcReady, false);
  assert.equal(report.summary.runtimeEvidenceSummaryStatus, 'no_explicit_runtime_evidence_summary');
  assert.equal(report.summary.runtimeEvidenceSummaryAccepted, false);
  assert.equal(report.summary.runtimeEvidenceSummaryRejected, false);
  assert.equal(report.summary.runtimeEvidenceSummaryLocallyEvidencedGapCount, 0);
  assert.equal(report.summary.runtimeEvidenceSummaryRemainingGapCount, 0);
  assert.equal(report.summary.runtimeEvidenceSummaryCanClaimV1RcReady, false);
  assert.equal(report.summary.schemaVersionRuntimeEnforcementImplemented, true);
  assert.equal(report.summary.schemaVersionRuntimeWriteBoundaryGuardImplemented, true);
  assert.equal(report.summary.schemaVersionRuntimeWriteBoundaryRejectsMetadata, true);
  assert.equal(report.summary.schemaVersionRuntimeWriteBoundaryPublicMcpFrozen, true);
  assert.equal(report.summary.schemaVersionRuntimeWriteBoundaryDiaryWriteOnRejectedPayload, false);
  assert.equal(report.summary.schemaVersionPolicyHelperImplemented, true);
  assert.equal(report.summary.schemaVersionPolicyHelperExplicitInputOnly, true);
  assert.equal(report.summary.schemaVersionPolicyHelperRuntimeIntegrated, false);
  assert.equal(report.summary.schemaVersionRuntimeBoundaryGuardTestAdded, true);
  assert.equal(report.summary.schemaVersionRuntimeBoundaryGuardPublicSchemaFrozen, true);
  assert.equal(report.summary.schemaVersionRuntimeBoundaryGuardRejectsSchemaVersionArgs, true);
  assert.equal(report.summary.schemaVersionRuntimeBoundaryGuardRuntimeIntegrated, true);
  assert.equal(report.summary.schemaCompatibilityDryRunCliImplemented, true);
  assert.equal(report.summary.schemaCompatibilityDryRunCliFixtureOnly, true);
  assert.equal(report.summary.schemaCompatibilityDryRunCliExecuted, false);
  assert.equal(report.summary.schemaCompatibilityRuntimeEnforcementImplemented, false);
  assert.equal(report.summary.migrationImportExportDryRunGateCliImplemented, true);
  assert.equal(report.summary.migrationImportExportDryRunGateCliFixtureOnly, true);
  assert.equal(report.summary.migrationImportExportDryRunGateCliExecuted, false);
  assert.equal(report.summary.migrationImportExportApprovalPacketCliImplemented, true);
  assert.equal(report.summary.migrationImportExportApprovalPacketCliFixtureOnly, true);
  assert.equal(report.summary.migrationImportExportApprovalPacketCliExecuted, false);
  assert.equal(report.summary.migrationImportExportApprovalPacketExecutionApproved, false);
  assert.equal(report.summary.migrationImportExportApprovalPacketRealMemoryScanned, false);
  assert.equal(report.summary.migrationImportExportApprovalPacketPackageScriptAdded, false);
  assert.equal(report.summary.migrationImportExportRealMemoryScanned, false);
  assert.equal(report.summary.finalRcValidationMatrixManifestHelperImplemented, true);
  assert.equal(report.summary.finalRcValidationMatrixManifestHelperExplicitInputOnly, true);
  assert.equal(report.summary.finalRcValidationMatrixManifestHelperExecuted, false);
  assert.equal(report.summary.finalRcValidationMatrixRunnerImplemented, false);
  assert.equal(report.summary.finalRcValidationMatrixRunnerExecuted, false);
  assert.equal(report.summary.finalRcValidationMatrixExecuted, false);
  assert.equal(report.summary.finalRcValidationMatrixCanExecuteRunner, false);
  assert.equal(report.summary.finalRcValidationMatrixCanClaimFinalRcReady, false);
  assert.equal(report.summary.memoryGovernanceLifecycleContractHelperImplemented, true);
  assert.equal(report.summary.memoryGovernanceLifecycleContractHelperExplicitInputOnly, true);
  assert.equal(report.summary.memoryGovernanceLifecycleContractHelperExecuted, false);
  assert.equal(report.summary.memoryGovernanceLifecycleContractHelperRuntimeIntegrated, false);
  assert.equal(report.summary.memoryGovernanceLifecycleContractPublicMcpExpanded, false);
  assert.equal(report.summary.memoryGovernanceLifecycleContractDurableMutationPerformed, false);
  assert.equal(report.summary.memoryGovernanceLifecycleContractRealMemoryScanned, false);
  assert.equal(report.summary.memoryGovernanceLifecycleContractCanClaimGovernanceReady, false);
  assert.equal(report.summary.memoryGovernanceApprovalPacketContractHelperImplemented, true);
  assert.equal(report.summary.memoryGovernanceApprovalPacketContractHelperExplicitInputOnly, true);
  assert.equal(report.summary.memoryGovernanceApprovalPacketContractHelperExecuted, false);
  assert.equal(report.summary.memoryGovernanceApprovalPacketContractHelperRuntimeIntegrated, false);
  assert.equal(report.summary.memoryGovernanceApprovalPacketContractPublicMcpExpanded, false);
  assert.equal(report.summary.memoryGovernanceApprovalPacketContractDurableMutationPerformed, false);
  assert.equal(report.summary.memoryGovernanceApprovalPacketContractRealMemoryScanned, false);
  assert.equal(report.summary.memoryGovernanceApprovalPacketContractExecutionApproved, false);
  assert.equal(report.summary.memoryGovernanceApprovalPacketContractCanClaimGovernanceReady, false);
  assert.equal(report.summary.memoryGovernanceAuditEvidenceContractHelperImplemented, true);
  assert.equal(report.summary.memoryGovernanceAuditEvidenceContractHelperExplicitInputOnly, true);
  assert.equal(report.summary.memoryGovernanceAuditEvidenceContractHelperExecuted, false);
  assert.equal(report.summary.memoryGovernanceAuditEvidenceContractHelperRuntimeIntegrated, false);
  assert.equal(report.summary.memoryGovernanceAuditEvidenceContractPublicMcpExpanded, false);
  assert.equal(report.summary.memoryGovernanceAuditEvidenceContractDurableAuditWritten, false);
  assert.equal(report.summary.memoryGovernanceAuditEvidenceContractDurableMutationPerformed, false);
  assert.equal(report.summary.memoryGovernanceAuditEvidenceContractRealMemoryScanned, false);
  assert.equal(report.summary.memoryGovernanceAuditEvidenceContractExecutionApproved, false);
  assert.equal(report.summary.memoryGovernanceAuditEvidenceContractCanClaimGovernanceReady, false);
  assert.equal(report.summary.memoryGovernanceReviewSurfaceContractHelperImplemented, true);
  assert.equal(report.summary.memoryGovernanceReviewSurfaceContractHelperExplicitInputOnly, true);
  assert.equal(report.summary.memoryGovernanceReviewSurfaceContractHelperExecuted, false);
  assert.equal(report.summary.memoryGovernanceReviewSurfaceContractHelperRuntimeIntegrated, false);
  assert.equal(report.summary.memoryGovernanceReviewSurfaceContractPublicMcpExpanded, false);
  assert.equal(report.summary.memoryGovernanceReviewSurfaceContractDurableMemoryTouched, false);
  assert.equal(report.summary.memoryGovernanceReviewSurfaceContractDurableAuditWritten, false);
  assert.equal(report.summary.memoryGovernanceReviewSurfaceContractRealDbReviewed, false);
  assert.equal(report.summary.memoryGovernanceReviewSurfaceContractGovernanceReportExecuted, false);
  assert.equal(report.summary.memoryGovernanceReviewSurfaceContractRealMemoryScanned, false);
  assert.equal(report.summary.memoryGovernanceReviewSurfaceContractExecutionApproved, false);
  assert.equal(report.summary.memoryGovernanceReviewSurfaceContractCanClaimGovernanceReady, false);
  assert.equal(report.summary.p36P40EvidenceSourceMapImplemented, true);
  assert.equal(report.summary.p36P40EvidenceSourceMapAvailable, true);
  assert.equal(report.summary.p36P40EvidenceSourceMapSourceMode, 'static_report_shape_only');
  assert.equal(report.summary.p36P40EvidenceSourceMapReadsFixtures, false);
  assert.equal(report.summary.p36P40EvidenceSourceMapExecutesHelpers, false);
  assert.equal(report.summary.p36P40EvidenceSourceMapExecutesGates, false);
  assert.equal(report.summary.p36P40EvidenceSourceMapExecutesRunners, false);
  assert.equal(report.summary.p36P40EvidenceSourceMapRefreshesLiveMcp, false);
  assert.equal(report.summary.p36P40EvidenceSourceMapCallsProviders, false);
  assert.equal(report.summary.p36P40LocalEvidenceReportAvailable, true);
  assert.equal(report.summary.p36P40LocalEvidenceReportReadyClaim, false);
  assert.equal(report.summary.p36P40RuntimeReady, false);
  assert.equal(report.summary.p36P40FinalRcMatrixReady, false);
  assert.equal(report.summary.p36P40CanClaimV1RcReady, false);
  assert.equal(report.summary.p45FinalRcMatrixEvaluatorPostureAvailable, true);
  assert.equal(report.summary.p45FinalRcMatrixEvaluatorPostureSourceMode, 'static_report_shape_only');
  assert.equal(report.summary.p45FinalRcMatrixEvaluatorExplicitInputOnly, true);
  assert.equal(report.summary.p45FinalRcMatrixEvaluatorFixtureOnly, true);
  assert.equal(report.summary.p45FinalRcMatrixEvaluatorImportedByAggregator, false);
  assert.equal(report.summary.p45FinalRcMatrixEvaluatorExecutedByAggregator, false);
  assert.equal(report.summary.p45FinalRcMatrixEvaluatorFixtureReadByAggregator, false);
  assert.equal(report.summary.p45FinalRcMatrixEvaluatorCollectsEvidence, false);
  assert.equal(report.summary.p45FinalRcMatrixEvaluatorExecutesHelpers, false);
  assert.equal(report.summary.p45FinalRcMatrixRunnerExecuted, false);
  assert.equal(report.summary.p45FinalRcMatrixReady, false);
  assert.equal(report.summary.p45FinalRcMatrixCanClaimFinalRcReady, false);
  assert.equal(report.summary.p45FinalRcMatrixCanClaimV1RcReady, false);
  assert.equal(report.summary.p45FinalRcMatrixRuntimeReady, false);
  assert.equal(report.summary.p53ValidationAggregatorEvidenceInventoryAvailable, true);
  assert.equal(report.summary.p53ValidationAggregatorEvidenceInventorySourceMode, 'static_report_shape_only');
  assert.equal(report.summary.p53ValidationAggregatorEvidenceInventoryOnly, true);
  assert.equal(report.summary.p53ValidationAggregatorInventoryAcceptedForPlanningCount, 6);
  assert.equal(report.summary.p53ValidationAggregatorInventoryFreshCount, 6);
  assert.equal(report.summary.p53ValidationAggregatorInventoryMissingCount, 0);
  assert.equal(report.summary.p53ValidationAggregatorInventoryBlockedCount, 1);
  assert.equal(report.summary.p53ValidationAggregatorInventoryNotExecutedCount, 1);
  assert.equal(report.summary.p53ValidationAggregatorInventoryUnsupportedCount, 0);
  assert.equal(report.summary.p53ValidationAggregatorInventoryStaleCount, 0);
  assert.equal(report.summary.p53ValidationAggregatorInventoryFixtureReadByAggregator, false);
  assert.equal(report.summary.p53ValidationAggregatorInventoryTestExecutedByAggregator, false);
  assert.equal(report.summary.p53ValidationAggregatorInventoryHelperExecutedByAggregator, false);
  assert.equal(report.summary.p53ValidationAggregatorInventoryRunnerExecutedByAggregator, false);
  assert.equal(report.summary.p53ValidationAggregatorInventoryRuntimeObserved, true);
  assert.equal(report.summary.p53ValidationAggregatorFullImplementationComplete, false);
  assert.equal(report.summary.p53ValidationAggregatorInventoryCanClaimRuntimeReady, false);
  assert.equal(report.summary.p53ValidationAggregatorInventoryCanClaimFinalRcReady, false);
  assert.equal(report.summary.p53ValidationAggregatorInventoryCanClaimV1RcReady, false);
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationDefinitionAvailable, true);
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationDefinitionSourceMode, 'static_report_shape_only');
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationDefinitionOnly, true);
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationRequiredCriteriaCount, 11);
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationRemainingRuntimeGapCount, 7);
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationLocallyEvidencedGapCount, 2);
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationA5HardStopCount, 16);
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationFailClosedCaseCount, 15);
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationGapAccountingAvailable, true);
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingSourceMode,
    'static_report_shape_only'
  );
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationGapAccountingRemainingGapCount, 7);
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationGapAccountingLocallyEvidencedGapCount, 2);
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingEffectiveGapSource,
    'static_baseline'
  );
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationGapAccountingEffectiveRemainingGapCount, 7);
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingEffectiveLocallyEvidencedGapCount,
    2
  );
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationGapAccountingStaticBaselineClearedGapCount, 0);
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingStaticBaselineStillRemainingGapCount,
    7
  );
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingEffectiveNonBaselineRemainingGapCount,
    0
  );
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingEffectiveLocalImplementationGapCount,
    1
  );
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationGapAccountingEffectiveA5GatedGapCount, 6);
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationGapAccountingEffectiveRedLaneGapCount, 2);
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingClosureAuthorityStatus,
    'local_implementation_required'
  );
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingNextClosureAuthority,
    'local_source_test_implementation'
  );
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationGapAccountingNextSafeCandidateCount, 3);
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationGapAccountingRuntimeSummaryBound, false);
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationGapAccountingRuntimeSummaryRemainingGapCount, 0);
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingRuntimeSummaryLocallyEvidencedGapCount,
    0
  );
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingValidationFreshnessStatus,
    'no_explicit_evidence'
  );
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingValidationGateReadinessStatus,
    'not_ready_no_explicit_evidence'
  );
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationGapAccountingValidationEvidenceUsable, false);
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationGapAccountingRuntimeRequiredBlockerCount, 1);
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationGapAccountingA5GatedBlockerCount, 6);
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingClosureStatus,
    'blocked_existing_blockers'
  );
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationGapAccountingClosureReady, false);
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationGapAccountingCanClaimReady, false);
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationFixtureReadByAggregator, false);
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationTestExecutedByAggregator, false);
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationRuntimeImplemented, false);
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationComplete, false);
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationCanClaimRuntimeReady, false);
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationCanClaimFinalRcReady, false);
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationCanClaimV1RcReady, false);
  assert.equal(report.summary.p66ValidationAggregatorSourceRegistryProofAvailable, true);
  assert.equal(report.summary.p66ValidationAggregatorSourceRegistryProofSourceMode, 'static_report_shape_only');
  assert.equal(report.summary.p66ValidationAggregatorSourceRegistryProofHelperCapabilityOnly, true);
  assert.equal(report.summary.p66ValidationAggregatorSourceRegistryRequiredSourceCount, 6);
  assert.equal(report.summary.p66ValidationAggregatorSourceRegistryFailClosedReasonCount, 11);
  assert.equal(report.summary.p66ValidationAggregatorSourceRegistryHelperImportedByAggregator, false);
  assert.equal(report.summary.p66ValidationAggregatorSourceRegistryHelperExecutedByAggregator, false);
  assert.equal(report.summary.p66ValidationAggregatorSourceRegistryRuntimeImplemented, false);
  assert.equal(report.summary.p66ValidationAggregatorSourceRegistryFullImplementationComplete, false);
  assert.equal(report.summary.p66ValidationAggregatorSourceRegistryCanClaimRuntimeReady, false);
  assert.equal(report.summary.p66ValidationAggregatorSourceRegistryCanClaimFinalRcReady, false);
  assert.equal(report.summary.p66ValidationAggregatorSourceRegistryCanClaimV1RcReady, false);
  assert.equal(report.summary.localEvidenceReportReadyClaim, false);
  assert.equal(report.summary.runtimeReady, false);
  assert.equal(report.summary.mainlineCutoverReady, false);
  assert.equal(report.summary.finalRcMatrixReady, false);
  assert.equal(report.summary.pushReady, false);
  assert.equal(report.summary.releaseReady, false);
  assert.equal(report.summary.deployReady, false);
  assert.equal(report.summary.configSwitchReady, false);
  assert.equal(report.summary.watchdogReady, false);
  assert.equal(report.summary.rcReady, false);
  assert.equal(report.evidence.p25SchemaVersionPolicy.status, 'fixture_contract_added');
  assert.equal(report.evidence.p25SchemaVersionPolicy.fixture, 'tests/fixtures/schema-version-policy-v1.json');
  assert.equal(report.evidence.p25SchemaVersionPolicy.runtimeEnforcementImplemented, false);
  assert.equal(report.evidence.p29SchemaVersionPolicyHelper.status, 'helper_added_runtime_not_integrated');
  assert.equal(report.evidence.p29SchemaVersionPolicyHelper.helper, 'src/core/SchemaVersionPolicy.js');
  assert.equal(report.evidence.p29SchemaVersionPolicyHelper.test, 'tests/schema-version-policy-runtime.test.js');
  assert.equal(report.evidence.p29SchemaVersionPolicyHelper.sourceMode, 'explicit_input');
  assert.equal(report.evidence.p29SchemaVersionPolicyHelper.evaluatesAcceptedMissingUnknownVersions, true);
  assert.equal(report.evidence.p29SchemaVersionPolicyHelper.evaluationReportAvailable, true);
  assert.equal(report.evidence.p29SchemaVersionPolicyHelper.evaluationReportExecuted, false);
  assert.equal(report.evidence.p29SchemaVersionPolicyHelper.evaluationReportReadsFiles, false);
  assert.equal(report.evidence.p29SchemaVersionPolicyHelper.evaluationReportMutatesInput, false);
  assert.equal(report.evidence.p29SchemaVersionPolicyHelper.evaluationReportMalformedCasesFailClosed, true);
  assert.equal(report.evidence.p29SchemaVersionPolicyHelper.rejectsUnknownFamilies, true);
  assert.equal(report.evidence.p29SchemaVersionPolicyHelper.readsFiles, false);
  assert.equal(report.evidence.p29SchemaVersionPolicyHelper.mutatesInput, false);
  assert.equal(report.evidence.p29SchemaVersionPolicyHelper.runtimeIntegrated, false);
  assert.equal(report.evidence.p29SchemaVersionPolicyHelper.runtimeEnforcementImplemented, false);
  assert.equal(report.evidence.p29SchemaVersionPolicyHelper.publicMcpExpanded, false);
  assert.equal(report.evidence.p29SchemaVersionRuntimeBoundaryGuard.status, 'runtime_write_boundary_guard_added');
  assert.equal(report.evidence.p29SchemaVersionRuntimeBoundaryGuard.test, 'tests/schema-version-runtime-boundary.test.js');
  assert.equal(report.evidence.p29SchemaVersionRuntimeBoundaryGuard.sourceMode, 'fixture_backed_test');
  assert.equal(report.evidence.p29SchemaVersionRuntimeBoundaryGuard.publicRecordMemorySchemaFrozen, true);
  assert.equal(report.evidence.p29SchemaVersionRuntimeBoundaryGuard.recordMemorySchemaVersionArgsExposed, false);
  assert.equal(report.evidence.p29SchemaVersionRuntimeBoundaryGuard.toolArgumentValidatorRejectsSchemaVersionArgs, true);
  assert.equal(report.evidence.p29SchemaVersionRuntimeBoundaryGuard.memoryWriteServiceRejectsSchemaVersionMetadata, true);
  assert.equal(report.evidence.p29SchemaVersionRuntimeBoundaryGuard.diaryWriteOnRejectedPayload, false);
  assert.equal(report.evidence.p29SchemaVersionRuntimeBoundaryGuard.policyWriteRejectionReportOnly, true);
  assert.equal(report.evidence.p29SchemaVersionRuntimeBoundaryGuard.readsFiles, false);
  assert.equal(report.evidence.p29SchemaVersionRuntimeBoundaryGuard.executesCommands, false);
  assert.equal(report.evidence.p29SchemaVersionRuntimeBoundaryGuard.startsServices, false);
  assert.equal(report.evidence.p29SchemaVersionRuntimeBoundaryGuard.callsProviders, false);
  assert.equal(report.evidence.p29SchemaVersionRuntimeBoundaryGuard.durableMemoryTouched, false);
  assert.equal(report.evidence.p29SchemaVersionRuntimeBoundaryGuard.realMemoryScanned, false);
  assert.equal(report.evidence.p29SchemaVersionRuntimeBoundaryGuard.runtimeIntegrated, true);
  assert.equal(report.evidence.p29SchemaVersionRuntimeBoundaryGuard.runtimeEnforcementImplemented, true);
  assert.equal(report.evidence.p29SchemaVersionRuntimeBoundaryGuard.publicMcpExpanded, false);
  assert.equal(report.evidence.p25SchemaCompatibilityDryRunCli.status, 'fixture_only_cli_added');
  assert.equal(report.evidence.p25SchemaCompatibilityDryRunCli.cli, 'src/cli/schema-compatibility-dry-run.js');
  assert.equal(report.evidence.p25SchemaCompatibilityDryRunCli.cliExecuted, false);
  assert.equal(report.evidence.p25SchemaCompatibilityDryRunCli.realMemoryScanned, false);
  assert.equal(report.evidence.p25SchemaCompatibilityDryRunCli.runtimeEnforcementImplemented, false);
  assert.equal(report.evidence.p25SchemaCompatibilityDryRunCli.packageScriptAdded, false);
  assert.equal(report.summary.migrationImportExportApplyPerformed, false);
  assert.equal(report.summary.migrationImportExportPackageScriptAdded, false);
  assert.equal(report.evidence.p26MigrationImportExportDryRunGateCli.status, 'fixture_only_cli_added');
  assert.equal(report.evidence.p26MigrationImportExportDryRunGateCli.cli, 'src/cli/migration-import-export-dry-run-gate.js');
  assert.equal(report.evidence.p26MigrationImportExportDryRunGateCli.test, 'tests/migration-import-export-dry-run-gate-cli.test.js');
  assert.equal(report.evidence.p26MigrationImportExportDryRunGateCli.fixture, 'tests/fixtures/migration-import-export-dry-run-gate-v1.json');
  assert.equal(report.evidence.p26MigrationImportExportDryRunGateCli.outputSchema, 'codex-memory.migration-import-export-dry-run-gate.v1');
  assert.equal(report.evidence.p26MigrationImportExportDryRunGateCli.expectedDecision, 'NOT_READY_BLOCKED');
  assert.equal(report.evidence.p26MigrationImportExportDryRunGateCli.fixtureOnly, true);
  assert.equal(report.evidence.p26MigrationImportExportDryRunGateCli.cliExecuted, false);
  assert.equal(report.evidence.p26MigrationImportExportDryRunGateCli.realMemoryScanned, false);
  assert.equal(report.evidence.p26MigrationImportExportDryRunGateCli.importExportApplyPerformed, false);
  assert.equal(report.evidence.p26MigrationImportExportDryRunGateCli.packageScriptAdded, false);
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.status, 'fixture_only_cli_added');
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.cli, 'src/cli/migration-import-export-approval-packet.js');
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.test, 'tests/migration-import-export-approval-packet-cli.test.js');
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.fixture, 'tests/fixtures/migration-import-export-approval-packet-v1.json');
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.outputSchema, 'codex-memory.migration-import-export-approval-packet.v1');
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.expectedDecision, 'NOT_READY_BLOCKED');
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.expectedApprovalStatus, 'BLOCKED_PENDING_APPROVAL');
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.fixtureOnly, true);
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.cliExecuted, false);
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.realMemoryScanned, false);
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.executionApproved, false);
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.importExportApplyPerformed, false);
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.backupRestorePerformed, false);
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.durableReportWritten, false);
  assert.equal(report.evidence.p27MigrationImportExportApprovalPacketCli.packageScriptAdded, false);
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.status, 'helper_added_report_shape_only_not_executed');
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.helper, 'src/core/FinalRcValidationMatrixManifest.js');
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.test, 'tests/final-rc-validation-matrix-runner-manifest-helper.test.js');
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.fixture, 'tests/fixtures/final-rc-validation-matrix-runner-safe-scope-v1.json');
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.manifestSchemaVersion, 'final-rc-validation-matrix-runner-safe-scope-v1');
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.sourceMode, 'explicit_input');
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.fixtureOnly, true);
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.syntheticFixture, true);
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.acceptedForPlanningAvailable, true);
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.manifestHelperImplemented, true);
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.manifestHelperExecuted, false);
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.helperExecutedByAggregator, false);
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.fixtureReadByAggregator, false);
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.readsFiles, false);
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.executesCommands, false);
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.startsServices, false);
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.callsProviders, false);
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.mutatesInput, false);
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.durableMemoryTouched, false);
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.realMemoryScanned, false);
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.realMemoryPreview, false);
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.runnerImplemented, false);
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.runnerExecuted, false);
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.finalRcMatrixExecuted, false);
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.canExecuteRunner, false);
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.canClaimFinalRcReady, false);
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.blockedDecisionRequired, true);
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.runnerClaimsFailClosed, true);
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.publicMcpFrozen, true);
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.runtimeRequiredBlockersVisible, true);
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.a5GatedBlockersVisible, true);
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.failClosedRejectionDefaultsVisible, true);
  assert.equal(report.evidence.p30FinalRcValidationMatrixManifestHelper.publicMcpExpanded, false);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.status, 'helper_added_report_shape_only_not_executed');
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.helper, 'src/core/MemoryGovernanceLifecycleContract.js');
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.test, 'tests/memory-governance-lifecycle-contract-helper.test.js');
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.fixture, 'tests/fixtures/memory-governance-lifecycle-contract-v1.json');
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.contractSchemaVersion, 'memory-governance-lifecycle-contract-v1');
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.sourceMode, 'explicit_input');
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.fixtureOnly, true);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.syntheticFixture, true);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.acceptedForPlanningAvailable, true);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.lifecycleHelperImplemented, true);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.lifecycleHelperExecuted, false);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.helperExecutedByAggregator, false);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.fixtureReadByAggregator, false);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.readsFiles, false);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.executesCommands, false);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.startsServices, false);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.callsProviders, false);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.mutatesInput, false);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.durableMemoryTouched, false);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.realMemoryScanned, false);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.realMemoryPreview, false);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.runtimeIntegrated, false);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.runtimeMutationAllowed, false);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.publicMcpExpanded, false);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.publicMcpFrozen, true);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.safeSourceTypesWhitelisted, true);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.unsupportedSourceTypesRejected, true);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.inputWhitelistRedefinitionRejected, true);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.requiredSurfacesPresent, true);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.requiredLifecycleCasesPresent, true);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.requiredBlockersVisible, true);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.requiredApprovalsVisible, true);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.blockedDecisionRequired, true);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.canClaimGovernanceRuntimeReady, false);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.canClaimV1RcReady, false);
  assert.equal(report.evidence.p31MemoryGovernanceLifecycleContractHelper.a5GatedBlockersVisible, true);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.status, 'helper_added_report_shape_only_not_executed');
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.helper, 'src/core/MemoryGovernanceApprovalPacketContract.js');
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.test, 'tests/memory-governance-approval-packet-helper.test.js');
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.fixture, 'tests/fixtures/memory-governance-approval-packet-v1.json');
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.contractSchemaVersion, 'memory-governance-approval-packet-v1');
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.sourceMode, 'explicit_input');
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.fixtureOnly, true);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.syntheticFixture, true);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.acceptedForPlanningAvailable, true);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.approvalPacketHelperImplemented, true);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.approvalPacketHelperExecuted, false);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.helperExecutedByAggregator, false);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.fixtureReadByAggregator, false);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.readsFiles, false);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.executesCommands, false);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.startsServices, false);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.callsProviders, false);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.mutatesInput, false);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.durableMemoryTouched, false);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.realMemoryScanned, false);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.realMemoryPreview, false);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.runtimeIntegrated, false);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.executionApproved, false);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.publicMcpExpanded, false);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.publicMcpFrozen, true);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.safeSourceTypesWhitelisted, true);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.unsupportedSourceTypesRejected, true);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.inputWhitelistRedefinitionRejected, true);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.requiredPacketFieldsPresent, true);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.requiredGovernedActionsPresent, true);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.governedActionsBlocked, true);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.requiredBlockersVisible, true);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.requiredApprovalsVisible, true);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.blockedDecisionRequired, true);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.canClaimGovernanceRuntimeReady, false);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.canClaimV1RcReady, false);
  assert.equal(report.evidence.p32MemoryGovernanceApprovalPacketContractHelper.a5GatedBlockersVisible, true);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.status, 'helper_added_report_shape_only_not_executed');
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.helper, 'src/core/MemoryGovernanceAuditEvidenceContract.js');
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.test, 'tests/memory-governance-audit-evidence-helper.test.js');
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.fixture, 'tests/fixtures/memory-governance-audit-evidence-v1.json');
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.contractSchemaVersion, 'memory-governance-audit-evidence-v1');
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.sourceMode, 'explicit_input');
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.fixtureOnly, true);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.syntheticFixture, true);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.acceptedForPlanningAvailable, true);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.auditEvidenceHelperImplemented, true);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.auditEvidenceHelperExecuted, false);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.helperExecutedByAggregator, false);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.fixtureReadByAggregator, false);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.readsFiles, false);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.executesCommands, false);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.startsServices, false);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.callsProviders, false);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.mutatesInput, false);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.durableMemoryTouched, false);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.durableAuditWritten, false);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.realMemoryScanned, false);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.realMemoryPreview, false);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.runtimeIntegrated, false);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.executionApproved, false);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.publicMcpExpanded, false);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.publicMcpFrozen, true);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.safeSourceTypesWhitelisted, true);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.unsupportedSourceTypesRejected, true);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.inputWhitelistRedefinitionRejected, true);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.requiredEvidenceFieldsPresent, true);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.requiredEventFamiliesPresent, true);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.eventFamiliesBlocked, true);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.requiredBlockersVisible, true);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.requiredApprovalsVisible, true);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.blockedDecisionRequired, true);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.canClaimGovernanceRuntimeReady, false);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.canClaimV1RcReady, false);
  assert.equal(report.evidence.p33MemoryGovernanceAuditEvidenceContractHelper.a5GatedBlockersVisible, true);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.status, 'helper_added_report_shape_only_not_executed');
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.helper, 'src/core/MemoryGovernanceReviewSurfaceContract.js');
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.test, 'tests/memory-governance-review-surface-helper.test.js');
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.fixture, 'tests/fixtures/memory-governance-review-surface-v1.json');
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.contractSchemaVersion, 'memory-governance-review-surface-v1');
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.sourceMode, 'explicit_input');
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.fixtureOnly, true);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.syntheticFixture, true);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.acceptedForPlanningAvailable, true);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.reviewSurfaceHelperImplemented, true);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.reviewSurfaceHelperExecuted, false);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.helperExecutedByAggregator, false);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.fixtureReadByAggregator, false);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.readsFiles, false);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.executesCommands, false);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.startsServices, false);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.callsProviders, false);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.mutatesInput, false);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.durableMemoryTouched, false);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.durableAuditWritten, false);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.governanceReportExecuted, false);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.realDbReviewExecuted, false);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.realMemoryScanned, false);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.realMemoryPreview, false);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.runtimeIntegrated, false);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.executionApproved, false);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.publicMcpExpanded, false);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.publicMcpFrozen, true);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.safeSourceTypesWhitelisted, true);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.unsupportedSourceTypesRejected, true);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.inputWhitelistRedefinitionRejected, true);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.requiredSourceSurfacesPresent, true);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.requiredReviewSectionsPresent, true);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.requiredBlockersVisible, true);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.requiredApprovalsVisible, true);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.blockedDecisionRequired, true);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.canClaimGovernanceRuntimeReady, false);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.canClaimV1RcReady, false);
  assert.equal(report.evidence.p34MemoryGovernanceReviewSurfaceContractHelper.a5GatedBlockersVisible, true);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.status, 'static_report_shape_added_not_executed');
  assert.equal(report.evidence.p36P40EvidenceSourceMap.sourceMode, 'static_report_shape_only');
  assert.deepEqual(report.evidence.p36P40EvidenceSourceMap.phasesCovered, [
    'P36-T1',
    'P36-T2',
    'P37-T1',
    'P38',
    'P39',
    'P40'
  ]);
  assert.deepEqual(report.evidence.p36P40EvidenceSourceMap.sources.map(source => source.id), [
    'p36_scope_a5_boundary',
    'p36_task_risk_labels',
    'p37_policy_decision_envelope',
    'p38_recall_isolation',
    'p39_synthetic_migration_dry_run',
    'p40_local_readiness_report'
  ]);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.sources.every(source => source.source_type === 'committed_fixture'), true);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.sources.every(source => source.sourceMode === 'static_reference_only'), true);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.sources.every(source => source.acceptedForPlanning === false), true);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.sources.every(source => source.fixtureReadByAggregator === false), true);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.sources.every(source => source.testExecutedByAggregator === false), true);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.sources.every(source => source.helperExecutedByAggregator === false), true);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.sources.every(source => source.observedFromRuntime === false), true);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.localEvidenceReportAvailable, true);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.localEvidenceReportReadyClaim, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.runtimeReady, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.mainlineCutoverReady, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.finalRcMatrixReady, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.pushReady, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.releaseReady, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.deployReady, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.configSwitchReady, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.watchdogReady, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.rcReady, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.readsFixtures, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.executesHelpers, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.executesGates, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.executesRunners, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.refreshesLiveMcp, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.callsProviders, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.scansRealMemory, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.readsRuntimeStores, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.realMemoryContentRead, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.realMemoryPreviewed, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.dryRunRepresentsRealMemory, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.dryRunAuthorizesApply, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.migrationApplied, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.backupCreated, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.restorePerformed, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.deniedMigrationSources.includes('real_memory_content'), true);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.deniedMigrationSources.includes('provider_output'), true);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.warningOnlyEqualsFailure, true);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.criticalSkippedEqualsFailure, true);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.criticalUnknownEqualsFailure, true);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.durableMemoryTouched, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.durableAuditWritten, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.publicMcpExpanded, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.helperExecutedByAggregator, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.fixtureReadByAggregator, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.decisionImpact, 'none_report_only');
  assert.equal(report.evidence.p36P40EvidenceSourceMap.blockedDecisionRequired, true);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.canClaimRuntimeReady, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.canClaimFinalRcReady, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.canClaimV1RcReady, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.status, 'static_report_shape_added_not_executed');
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.sourceMode, 'static_report_shape_only');
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.evaluator, 'src/core/FinalRcMatrixEvaluator.js');
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.test, 'tests/final-rc-matrix-evaluator-helper.test.js');
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.fixture, 'tests/fixtures/p45-final-rc-matrix-evaluator-v1.json');
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.evaluatorSchemaVersion, 'p45-final-rc-matrix-evaluator-v1');
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.expectedMode, 'fixture-only-explicit-input');
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.expectedDecision, 'NOT_READY_BLOCKED');
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.explicitInputOnly, true);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.fixtureOnly, true);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.evaluatorImportedByAggregator, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.evaluatorExecutedByAggregator, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.fixtureReadByAggregator, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.helperExecutedByAggregator, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.gateExecutedByAggregator, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.runnerExecutedByAggregator, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.evidenceCollectedByAggregator, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.liveMcpRefreshedByAggregator, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.callsProviders, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.startsServices, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.readsFiles, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.scansRealMemory, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.readsRuntimeStores, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.durableMemoryTouched, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.publicMcpExpanded, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.runtimeMutationImplemented, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.runtimeIntegrated, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.finalRcMatrixExecuted, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.finalRcMatrixReady, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.runtimeReady, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.pushReady, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.releaseReady, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.deployReady, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.configSwitchReady, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.watchdogReady, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.rcReady, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.decisionImpact, 'none_report_only');
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.blockedDecisionRequired, true);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.canClaimRuntimeReady, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.canClaimFinalRcReady, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.canClaimV1RcReady, false);
  assert.equal(report.evidence.p53ValidationAggregatorEvidenceInventory.status, 'static_report_shape_added_not_executed');
  assert.equal(report.evidence.p53ValidationAggregatorEvidenceInventory.sourceMode, 'static_report_shape_only');
  assert.equal(report.evidence.p53ValidationAggregatorEvidenceInventory.inventoryOnly, true);
  assert.equal(report.evidence.p53ValidationAggregatorEvidenceInventory.fixtureReadByAggregator, false);
  assert.equal(report.evidence.p53ValidationAggregatorEvidenceInventory.testExecutedByAggregator, false);
  assert.equal(report.evidence.p53ValidationAggregatorEvidenceInventory.helperExecutedByAggregator, false);
  assert.equal(report.evidence.p53ValidationAggregatorEvidenceInventory.runnerExecutedByAggregator, false);
  assert.equal(report.evidence.p53ValidationAggregatorEvidenceInventory.evidenceCollectedByAggregator, false);
  assert.equal(report.evidence.p53ValidationAggregatorEvidenceInventory.liveMcpRefreshedByAggregator, false);
  assert.equal(report.evidence.p53ValidationAggregatorEvidenceInventory.fullAggregatorImplementationComplete, false);
  assert.equal(report.evidence.p53ValidationAggregatorEvidenceInventory.runtimeReady, false);
  assert.equal(report.evidence.p53ValidationAggregatorEvidenceInventory.finalRcMatrixReady, false);
  assert.equal(report.evidence.p53ValidationAggregatorEvidenceInventory.rcReady, false);
  assert.equal(report.evidence.p53ValidationAggregatorEvidenceInventory.canClaimRuntimeReady, false);
  assert.equal(report.evidence.p53ValidationAggregatorEvidenceInventory.canClaimFinalRcReady, false);
  assert.equal(report.evidence.p53ValidationAggregatorEvidenceInventory.canClaimV1RcReady, false);
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.status,
    'static_definition_added_not_runtime'
  );
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.sourceMode, 'static_report_shape_only');
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.definitionOnly, true);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.syntheticFixture, true);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.requiredCriteria.length, 11);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.remainingRuntimeGaps.length, 7);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.locallyEvidencedRuntimeGaps.length, 2);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.a5HardStops.length, 16);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.failClosedCases.length, 15);
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.fullImplementationGapAccountingAvailable,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.fullImplementationGapAccounting.sourceMode,
    'static_report_shape_only'
  );
  assert.deepEqual(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.remainingFullImplementationGapIds,
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.remainingRuntimeGaps
  );
  assert.deepEqual(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.locallyEvidencedFullImplementationGapIds,
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.locallyEvidencedRuntimeGaps
  );
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.remainingFullImplementationGapCount, 7);
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.locallyEvidencedFullImplementationGapCount,
    2
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.effectiveGapSource,
    'static_baseline'
  );
  assert.deepEqual(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.effectiveRemainingFullImplementationGapIds,
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.remainingRuntimeGaps
  );
  assert.deepEqual(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.effectiveLocallyEvidencedFullImplementationGapIds,
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.locallyEvidencedRuntimeGaps
  );
  assert.deepEqual(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.staticBaselineClearedGapIds,
    []
  );
  assert.deepEqual(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.staticBaselineStillRemainingGapIds,
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.remainingRuntimeGaps
  );
  assert.deepEqual(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.effectiveNonBaselineRemainingGapIds,
    []
  );
  assert.deepEqual(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.effectiveLocalImplementationGapIds,
    ['validation_aggregator_full_implementation_incomplete']
  );
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.effectiveA5GatedGapCount, 6);
  assert.deepEqual(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.effectiveRedLaneGapIds,
    [
      'mainline_strict_gate_not_executed_for_cutover',
      'rc_cutover_not_executed'
    ]
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureAuthorityStatus,
    'local_implementation_required'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.nextClosureAuthority,
    'local_source_test_implementation'
  );
  assert.deepEqual(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureAuthoritySummary,
    {
      status: 'local_implementation_required',
      nextAuthority: 'local_source_test_implementation',
      localImplementationRequired: true,
      a5AuthorizationRequired: true,
      redLaneAuthorizationRequired: true,
      manualGapModelingRequired: false,
      blockerClearanceRequired: true,
      readinessAuthorityRequired: true,
      canProceedAutomatically: true,
      canClaimReadiness: false
    }
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.nextSafeClosureCandidates.includes(
      'a5_gap_3_migration_readiness_fixture_only_dry_run'
    ),
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.fullImplementationGapAccounting.commandsExecutedByAccounting,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.fullImplementationGapAccounting.readinessClaimedByAccounting,
    false
  );
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.acceptedRuntimeSummaryBound, false);
  assert.deepEqual(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.acceptedRuntimeSummaryRemainingGapIds,
    []
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.validationEvidenceFreshnessBound,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.validationEvidenceFreshnessStatus,
    'no_explicit_evidence'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.validationEvidenceExplicitEvidenceUsable,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.blockerSummaryBound,
    true
  );
  assert.deepEqual(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.validationBlockerIds,
    ['full-final-rc-matrix-not-executed']
  );
  assert.deepEqual(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.runtimeRequiredBlockerIds,
    ['validation-aggregator-full-implementation-not-complete']
  );
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.a5GatedBlockerCount, 6);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.totalBlockerCount, 8);
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureStatus,
    'blocked_existing_blockers'
  );
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureCanClaimReady, false);
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureCriteria.acceptedRuntimeSummaryBound,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureCriteria.a5GatedBlockersCleared,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureCriteria.effectiveRemainingGapsCleared,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureCriteria.effectiveNonBaselineRemainingGapsAbsent,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureCriteria.effectiveLocalImplementationGapsCleared,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureCriteria.effectiveA5GatedGapsCleared,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureCriteria.effectiveRedLaneGapsCleared,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureMissingCriteria.includes(
      'accepted_runtime_summary'
    ),
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureMissingCriteria.includes(
      'effective_remaining_gaps_cleared'
    ),
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureMissingCriteria.includes(
      'readiness_authority'
    ),
    true
  );
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.fixtureReadByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.testExecutedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.helperExecutedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.gateExecutedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.runnerExecutedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.evidenceCollectedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.liveMcpRefreshedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.callsProviders, false);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.startsServices, false);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.readsFiles, false);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.scansRealMemory, false);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.readsRuntimeStores, false);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.durableMemoryTouched, false);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.durableAuditWritten, false);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.publicMcpExpanded, false);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.runtimeMutationImplemented, false);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.fullAggregatorImplementationComplete, false);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.runtimeIntegrated, false);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.finalRcMatrixExecuted, false);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.finalRcMatrixReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.runtimeReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.rcReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.decisionImpact, 'none_report_only');
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.blockedDecisionRequired, true);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.canClaimRuntimeReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.canClaimFinalRcReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorFullImplementationDefinition.canClaimV1RcReady, false);
  assert.equal(
    report.evidence.p66ValidationAggregatorSourceRegistryProof.status,
    'static_helper_capability_added_not_executed'
  );
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.sourceMode, 'static_report_shape_only');
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.helperCapabilityOnly, true);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.explicitInputOnly, true);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.exactSetRequired, true);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.requiredSourceRegistryIds.length, 6);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.failClosedReasons.length, 11);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.helperImportedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.helperExecutedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.fixtureReadByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.evidenceFileReadByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.commandExecutedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.gateExecutedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.runnerExecutedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.evidenceCollectedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.liveMcpRefreshedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.callsProviders, false);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.startsServices, false);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.readsFiles, false);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.scansDirectories, false);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.scansRealMemory, false);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.readsRuntimeStores, false);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.durableMemoryTouched, false);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.durableAuditWritten, false);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.publicMcpExpanded, false);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.runtimeMutationImplemented, false);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.fullAggregatorImplementationComplete, false);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.runtimeIntegrated, false);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.runtimeReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.finalRcMatrixReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.rcReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.decisionImpact, 'none_report_only');
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.blockedDecisionRequired, true);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.canClaimRuntimeReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.canClaimFinalRcReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorSourceRegistryProof.canClaimV1RcReady, false);
  assert.equal(
    report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.status,
    'static_helper_capability_added_not_executed'
  );
  assert.equal(report.summary.p66ValidationAggregatorEvidenceFreshnessProofAvailable, true);
  assert.equal(report.summary.p66ValidationAggregatorEvidenceFreshnessProofSourceMode, 'static_report_shape_only');
  assert.equal(report.summary.p66ValidationAggregatorEvidenceFreshnessProofHelperCapabilityOnly, true);
  assert.equal(report.summary.p66ValidationAggregatorEvidenceFreshnessRequiredFieldCount, 10);
  assert.equal(report.summary.p66ValidationAggregatorEvidenceFreshnessFailClosedReasonCount, 22);
  assert.equal(report.summary.p66ValidationAggregatorEvidenceFreshnessHelperImportedByAggregator, false);
  assert.equal(report.summary.p66ValidationAggregatorEvidenceFreshnessHelperExecutedByAggregator, false);
  assert.equal(report.summary.p66ValidationAggregatorEvidenceFreshnessRuntimeImplemented, false);
  assert.equal(report.summary.p66ValidationAggregatorEvidenceFreshnessFullImplementationComplete, false);
  assert.equal(report.summary.p66ValidationAggregatorEvidenceFreshnessCanClaimRuntimeReady, false);
  assert.equal(report.summary.p66ValidationAggregatorEvidenceFreshnessCanClaimFinalRcReady, false);
  assert.equal(report.summary.p66ValidationAggregatorEvidenceFreshnessCanClaimV1RcReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.sourceMode, 'static_report_shape_only');
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.helperCapabilityOnly, true);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.explicitInputOnly, true);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.timestampPolicyExplicitOnly, true);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.baselineBindingRequired, true);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.freshnessWindowRequired, true);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.requiredFreshnessFields.length, 10);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.failClosedReasons.length, 22);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.helperImportedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.helperExecutedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.fixtureReadByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.evidenceFileReadByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.commandExecutedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.gateExecutedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.runnerExecutedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.evidenceCollectedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.liveMcpRefreshedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.callsProviders, false);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.startsServices, false);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.readsFiles, false);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.scansDirectories, false);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.scansRealMemory, false);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.readsRuntimeStores, false);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.durableMemoryTouched, false);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.durableAuditWritten, false);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.publicMcpExpanded, false);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.runtimeMutationImplemented, false);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.fullAggregatorImplementationComplete, false);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.runtimeIntegrated, false);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.runtimeReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.finalRcMatrixReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.rcReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.decisionImpact, 'none_report_only');
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.blockedDecisionRequired, true);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.canClaimRuntimeReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.canClaimFinalRcReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorEvidenceFreshnessProof.canClaimV1RcReady, false);
  assert.equal(
    report.evidence.p66ValidationAggregatorBaselineBindingProof.status,
    'static_helper_capability_added_not_executed'
  );
  assert.equal(report.summary.p66ValidationAggregatorBaselineBindingProofAvailable, true);
  assert.equal(report.summary.p66ValidationAggregatorBaselineBindingProofSourceMode, 'static_report_shape_only');
  assert.equal(report.summary.p66ValidationAggregatorBaselineBindingProofHelperCapabilityOnly, true);
  assert.equal(report.summary.p66ValidationAggregatorBaselineBindingRequiredFieldCount, 10);
  assert.equal(report.summary.p66ValidationAggregatorBaselineBindingKindCount, 4);
  assert.equal(report.summary.p66ValidationAggregatorBaselineBindingFailClosedReasonCount, 25);
  assert.equal(report.summary.p66ValidationAggregatorBaselineBindingHelperImportedByAggregator, false);
  assert.equal(report.summary.p66ValidationAggregatorBaselineBindingHelperExecutedByAggregator, false);
  assert.equal(report.summary.p66ValidationAggregatorBaselineBindingRuntimeImplemented, false);
  assert.equal(report.summary.p66ValidationAggregatorBaselineBindingFullImplementationComplete, false);
  assert.equal(report.summary.p66ValidationAggregatorBaselineBindingCanClaimRuntimeReady, false);
  assert.equal(report.summary.p66ValidationAggregatorBaselineBindingCanClaimFinalRcReady, false);
  assert.equal(report.summary.p66ValidationAggregatorBaselineBindingCanClaimV1RcReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.sourceMode, 'static_report_shape_only');
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.helperCapabilityOnly, true);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.explicitInputOnly, true);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.targetCommitRequired, true);
  assert.equal(
    report.evidence.p66ValidationAggregatorBaselineBindingProof.targetCommitMustEqualEvidenceSubjectCommit,
    true
  );
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.commitRoleSeparationRequired, true);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.noCheckoutRequiredByBridge, true);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.noRemoteLookupRequiredByBridge, true);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.requiredBaselineBindingFields.length, 10);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.allowedBaselineKinds.length, 4);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.failClosedReasons.length, 25);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.helperImportedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.helperExecutedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.fixtureReadByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.evidenceFileReadByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.commandExecutedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.gitCheckoutByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.gitResetByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.gitDetachHeadByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.gitRemoteLookupByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.gateExecutedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.runnerExecutedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.evidenceCollectedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.liveMcpRefreshedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.callsProviders, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.startsServices, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.readsFiles, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.scansDirectories, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.scansRealMemory, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.readsRuntimeStores, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.durableMemoryTouched, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.durableAuditWritten, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.publicMcpExpanded, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.runtimeMutationImplemented, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.fullAggregatorImplementationComplete, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.runtimeIntegrated, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.runtimeReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.finalRcMatrixReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.rcReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.decisionImpact, 'none_report_only');
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.blockedDecisionRequired, true);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.canClaimRuntimeReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.canClaimFinalRcReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorBaselineBindingProof.canClaimV1RcReady, false);
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.status,
    'static_helper_capability_added_not_executed'
  );
  assert.equal(
    report.summary.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProofAvailable,
    true
  );
  assert.equal(
    report.summary.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProofSourceMode,
    'static_report_shape_only'
  );
  assert.equal(
    report.summary.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProofHelperCapabilityOnly,
    true
  );
  assert.equal(report.summary.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationRequiredFieldCount, 10);
  assert.equal(report.summary.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationFailClosedReasonCount, 12);
  assert.equal(
    report.summary.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationHelperImportedByAggregator,
    false
  );
  assert.equal(
    report.summary.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationHelperExecutedByAggregator,
    false
  );
  assert.equal(
    report.summary.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationRuntimeImplemented,
    false
  );
  assert.equal(
    report.summary.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationFullImplementationComplete,
    false
  );
  assert.equal(
    report.summary.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationCanClaimRuntimeReady,
    false
  );
  assert.equal(
    report.summary.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationCanClaimFinalRcReady,
    false
  );
  assert.equal(
    report.summary.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationCanClaimV1RcReady,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.sourceMode,
    'static_report_shape_only'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.helperCapabilityOnly,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.explicitInputOnly,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.sanitizedSummaryOnly,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.requiredSummaryFields.length,
    10
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.failClosedReasons.length,
    12
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.helperImportedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.helperExecutedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.fixtureReadByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.evidenceFileReadByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.commandExecutedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.gateExecutedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.runnerExecutedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.evidenceCollectedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.liveMcpRefreshedByAggregator,
    false
  );
  assert.equal(report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.callsProviders, false);
  assert.equal(report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.startsServices, false);
  assert.equal(report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.readsFiles, false);
  assert.equal(report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.scansDirectories, false);
  assert.equal(report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.scansRealMemory, false);
  assert.equal(report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.readsRuntimeStores, false);
  assert.equal(report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.durableMemoryTouched, false);
  assert.equal(report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.durableAuditWritten, false);
  assert.equal(report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.publicMcpExpanded, false);
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.runtimeMutationImplemented,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.fullAggregatorImplementationComplete,
    false
  );
  assert.equal(report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.runtimeIntegrated, false);
  assert.equal(report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.runtimeReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.finalRcMatrixReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.rcReady, false);
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.decisionImpact,
    'none_report_only'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.blockedDecisionRequired,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.canClaimRuntimeReady,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.canClaimFinalRcReady,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeEvidenceSummaryNormalizationProof.canClaimV1RcReady,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.status,
    'static_helper_capability_added_not_executed'
  );
  assert.equal(
    report.summary.p66ValidationAggregatorMissingStaleEvidenceFailClosedProofAvailable,
    true
  );
  assert.equal(
    report.summary.p66ValidationAggregatorMissingStaleEvidenceFailClosedProofSourceMode,
    'static_report_shape_only'
  );
  assert.equal(
    report.summary.p66ValidationAggregatorMissingStaleEvidenceFailClosedProofHelperCapabilityOnly,
    true
  );
  assert.equal(report.summary.p66ValidationAggregatorMissingStaleEvidenceRequiredGroupCount, 8);
  assert.equal(report.summary.p66ValidationAggregatorMissingStaleEvidenceFailClosedReasonCount, 13);
  assert.equal(
    report.summary.p66ValidationAggregatorMissingStaleEvidenceHelperImportedByAggregator,
    false
  );
  assert.equal(
    report.summary.p66ValidationAggregatorMissingStaleEvidenceHelperExecutedByAggregator,
    false
  );
  assert.equal(
    report.summary.p66ValidationAggregatorMissingStaleEvidenceRuntimeImplemented,
    false
  );
  assert.equal(
    report.summary.p66ValidationAggregatorMissingStaleEvidenceFullImplementationComplete,
    false
  );
  assert.equal(
    report.summary.p66ValidationAggregatorMissingStaleEvidenceCanClaimRuntimeReady,
    false
  );
  assert.equal(
    report.summary.p66ValidationAggregatorMissingStaleEvidenceCanClaimFinalRcReady,
    false
  );
  assert.equal(
    report.summary.p66ValidationAggregatorMissingStaleEvidenceCanClaimV1RcReady,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.sourceMode,
    'static_report_shape_only'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.helperCapabilityOnly,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.explicitInputOnly,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.metadataOnly,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.requiredEvidenceGroups.length,
    8
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.failClosedReasons.length,
    13
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.helperImportedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.helperExecutedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.fixtureReadByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.evidenceFileReadByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.implicitEvidenceRefreshByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.commandExecutedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.gateExecutedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.runnerExecutedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.evidenceCollectedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.liveMcpRefreshedByAggregator,
    false
  );
  assert.equal(report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.callsProviders, false);
  assert.equal(report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.startsServices, false);
  assert.equal(report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.readsFiles, false);
  assert.equal(report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.scansDirectories, false);
  assert.equal(report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.scansRealMemory, false);
  assert.equal(report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.readsRuntimeStores, false);
  assert.equal(report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.durableMemoryTouched, false);
  assert.equal(report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.durableAuditWritten, false);
  assert.equal(report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.publicMcpExpanded, false);
  assert.equal(
    report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.runtimeMutationImplemented,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.fullAggregatorImplementationComplete,
    false
  );
  assert.equal(report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.runtimeIntegrated, false);
  assert.equal(report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.runtimeReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.finalRcMatrixReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.rcReady, false);
  assert.equal(
    report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.decisionImpact,
    'none_report_only'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.blockedDecisionRequired,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.canClaimRuntimeReady,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.canClaimFinalRcReady,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorMissingStaleEvidenceFailClosedProof.canClaimV1RcReady,
    false
  );
  assert.equal(report.summary.p66ValidationAggregatorUnsupportedSourceFailClosedProofAvailable, true);
  assert.equal(
    report.summary.p66ValidationAggregatorUnsupportedSourceFailClosedProofSourceMode,
    'static_report_shape_only'
  );
  assert.equal(report.summary.p66ValidationAggregatorUnsupportedSourceFailClosedProofHelperCapabilityOnly, true);
  assert.equal(report.summary.p66ValidationAggregatorUnsupportedSourceFailClosedCaseCount, 11);
  assert.equal(report.summary.p66ValidationAggregatorUnsupportedSourceFailClosedReasonCount, 17);
  assert.equal(report.summary.p66ValidationAggregatorUnsupportedSourceHelperImportedByAggregator, false);
  assert.equal(report.summary.p66ValidationAggregatorUnsupportedSourceHelperExecutedByAggregator, false);
  assert.equal(report.summary.p66ValidationAggregatorUnsupportedSourceRuntimeImplemented, false);
  assert.equal(report.summary.p66ValidationAggregatorUnsupportedSourceFullImplementationComplete, false);
  assert.equal(report.summary.p66ValidationAggregatorUnsupportedSourceCanClaimRuntimeReady, false);
  assert.equal(report.summary.p66ValidationAggregatorUnsupportedSourceCanClaimFinalRcReady, false);
  assert.equal(report.summary.p66ValidationAggregatorUnsupportedSourceCanClaimV1RcReady, false);
  assert.equal(
    report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.status,
    'static_helper_capability_added_not_executed'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.sourceMode,
    'static_report_shape_only'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.helper,
    'src/core/ValidationAggregatorUnsupportedSourceFailClosedProofContract.js'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.test,
    'tests/validation-aggregator-unsupported-source-fail-closed-proof-contract-helper.test.js'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.helperCapabilityOnly,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.explicitInputOnly,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.metadataOnly,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.failClosedCases.length,
    11
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.failClosedReasons.length,
    17
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.helperImportedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.helperExecutedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.fixtureReadByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.evidenceFileReadByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.commandExecutedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.gateExecutedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.runnerExecutedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.evidenceCollectedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.liveMcpRefreshedByAggregator,
    false
  );
  assert.equal(report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.callsProviders, false);
  assert.equal(report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.startsServices, false);
  assert.equal(report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.readsFiles, false);
  assert.equal(report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.scansDirectories, false);
  assert.equal(report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.scansRealMemory, false);
  assert.equal(report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.readsRuntimeStores, false);
  assert.equal(report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.durableMemoryTouched, false);
  assert.equal(report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.durableAuditWritten, false);
  assert.equal(report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.publicMcpExpanded, false);
  assert.equal(
    report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.runtimeMutationImplemented,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.fullAggregatorImplementationComplete,
    false
  );
  assert.equal(report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.runtimeIntegrated, false);
  assert.equal(report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.runtimeReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.finalRcMatrixReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.rcReady, false);
  assert.equal(
    report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.decisionImpact,
    'none_report_only'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.blockedDecisionRequired,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.canClaimRuntimeReady,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.canClaimFinalRcReady,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorUnsupportedSourceFailClosedProof.canClaimV1RcReady,
    false
  );
  assert.equal(report.summary.p66ValidationAggregatorNoTouchBoundaryProofAvailable, true);
  assert.equal(
    report.summary.p66ValidationAggregatorNoTouchBoundaryProofSourceMode,
    'static_report_shape_only'
  );
  assert.equal(report.summary.p66ValidationAggregatorNoTouchBoundaryProofHelperCapabilityOnly, true);
  assert.equal(report.summary.p66ValidationAggregatorNoTouchBoundaryTargetFamilyCount, 5);
  assert.equal(report.summary.p66ValidationAggregatorNoTouchBoundaryDisallowedImportCount, 20);
  assert.equal(report.summary.p66ValidationAggregatorNoTouchBoundaryDisallowedRuntimeCallCount, 20);
  assert.equal(report.summary.p66ValidationAggregatorNoTouchBoundaryFailClosedCaseCount, 16);
  assert.equal(report.summary.p66ValidationAggregatorNoTouchBoundaryFailClosedReasonCount, 16);
  assert.equal(report.summary.p66ValidationAggregatorNoTouchBoundaryHelperImportedByAggregator, false);
  assert.equal(report.summary.p66ValidationAggregatorNoTouchBoundaryHelperExecutedByAggregator, false);
  assert.equal(report.summary.p66ValidationAggregatorNoTouchBoundaryRuntimeImplemented, false);
  assert.equal(report.summary.p66ValidationAggregatorNoTouchBoundaryFullImplementationComplete, false);
  assert.equal(report.summary.p66ValidationAggregatorNoTouchBoundaryCanClaimRuntimeReady, false);
  assert.equal(report.summary.p66ValidationAggregatorNoTouchBoundaryCanClaimFinalRcReady, false);
  assert.equal(report.summary.p66ValidationAggregatorNoTouchBoundaryCanClaimV1RcReady, false);
  assert.equal(
    report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.status,
    'static_helper_capability_added_not_executed'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.sourceMode,
    'static_report_shape_only'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.helper,
    'src/core/ValidationAggregatorNoTouchBoundaryProofContract.js'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.test,
    'tests/validation-aggregator-no-touch-boundary-proof-contract-helper.test.js'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.helperCapabilityOnly,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.explicitInputOnly,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.metadataOnly,
    true
  );
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.targetFamilies.length, 5);
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.disallowedImports.length, 20);
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.disallowedRuntimeCalls.length, 20);
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.failClosedCases.length, 16);
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.failClosedReasons.length, 16);
  assert.equal(
    report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.helperImportedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.helperExecutedByAggregator,
    false
  );
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.fixtureReadByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.evidenceFileReadByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.commandExecutedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.gateExecutedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.runnerExecutedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.evidenceCollectedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.liveMcpRefreshedByAggregator, false);
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.callsProviders, false);
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.startsServices, false);
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.readsFiles, false);
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.scansDirectories, false);
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.scansSourceAtRuntime, false);
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.scansRealMemory, false);
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.readsRuntimeStores, false);
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.durableMemoryTouched, false);
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.durableAuditWritten, false);
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.publicMcpExpanded, false);
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.runtimeMutationImplemented, false);
  assert.equal(
    report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.fullAggregatorImplementationComplete,
    false
  );
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.runtimeIntegrated, false);
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.runtimeReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.finalRcMatrixReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.rcReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.decisionImpact, 'none_report_only');
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.blockedDecisionRequired, true);
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.canClaimRuntimeReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.canClaimFinalRcReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorNoTouchBoundaryProof.canClaimV1RcReady, false);
  assert.equal(
    report.summary.p66ValidationAggregatorReadinessOverclaimRejectionProofAvailable,
    true
  );
  assert.equal(
    report.summary.p66ValidationAggregatorReadinessOverclaimRejectionProofSourceMode,
    'static_report_shape_only'
  );
  assert.equal(
    report.summary.p66ValidationAggregatorReadinessOverclaimRejectionProofHelperCapabilityOnly,
    true
  );
  assert.equal(report.summary.p66ValidationAggregatorReadinessOverclaimRequiredClaimCount, 6);
  assert.equal(report.summary.p66ValidationAggregatorReadinessOverclaimFailClosedCaseCount, 18);
  assert.equal(
    report.summary.p66ValidationAggregatorReadinessOverclaimAllowedEvidencePostureCount,
    4
  );
  assert.equal(
    report.summary.p66ValidationAggregatorReadinessOverclaimDisallowedReadinessPostureCount,
    7
  );
  assert.equal(report.summary.p66ValidationAggregatorReadinessOverclaimFailClosedReasonCount, 20);
  assert.equal(report.summary.p66ValidationAggregatorReadinessOverclaimHelperImportedByAggregator, false);
  assert.equal(report.summary.p66ValidationAggregatorReadinessOverclaimHelperExecutedByAggregator, false);
  assert.equal(
    report.summary.p66ValidationAggregatorReadinessOverclaimEvidenceFileReadByAggregator,
    false
  );
  assert.equal(
    report.summary.p66ValidationAggregatorReadinessOverclaimCommandExecutedByAggregator,
    false
  );
  assert.equal(report.summary.p66ValidationAggregatorReadinessOverclaimRuntimeImplemented, false);
  assert.equal(
    report.summary.p66ValidationAggregatorReadinessOverclaimFullImplementationComplete,
    false
  );
  assert.equal(report.summary.p66ValidationAggregatorReadinessOverclaimCanClaimRuntimeReady, false);
  assert.equal(report.summary.p66ValidationAggregatorReadinessOverclaimCanClaimFinalRcReady, false);
  assert.equal(report.summary.p66ValidationAggregatorReadinessOverclaimCanClaimV1RcReady, false);
  assert.equal(report.summary.p66ValidationAggregatorReadinessOverclaimCanClaimRcReady, false);
  assert.equal(report.summary.p66ValidationAggregatorReadinessOverclaimCanClaimCutoverReady, false);
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.status,
    'static_helper_capability_added_not_executed'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.sourceMode,
    'static_report_shape_only'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.helper,
    'src/core/ValidationAggregatorReadinessOverclaimRejectionProofContract.js'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.test,
    'tests/validation-aggregator-readiness-overclaim-rejection-proof-contract-helper.test.js'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.schemaVersion,
    'p66-validation-aggregator-readiness-overclaim-rejection-proof-v1'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.helperCapabilityOnly,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.explicitInputOnly,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.metadataOnly,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.requiredReadinessClaims.length,
    6
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.failClosedCases.length,
    18
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.allowedEvidencePosture.length,
    4
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.disallowedReadinessPosture.length,
    7
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.failClosedReasons.length,
    20
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.requiredReadinessClaims
      .every(claim => claim.mustReject === true),
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.failClosedCases
      .every(item => item.mustFailClosed === true),
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.helperImportedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.helperExecutedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.fixtureReadByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.evidenceFileReadByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.commandExecutedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.gateExecutedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.runnerExecutedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.evidenceCollectedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.liveMcpRefreshedByAggregator,
    false
  );
  assert.equal(report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.callsProviders, false);
  assert.equal(report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.startsServices, false);
  assert.equal(report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.readsFiles, false);
  assert.equal(report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.scansDirectories, false);
  assert.equal(report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.scansRealMemory, false);
  assert.equal(report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.readsRuntimeStores, false);
  assert.equal(report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.durableMemoryTouched, false);
  assert.equal(report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.durableAuditWritten, false);
  assert.equal(report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.publicMcpExpanded, false);
  assert.equal(report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.validateMemoryPublic, false);
  assert.equal(report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.configMutated, false);
  assert.equal(report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.startupWatchdogOperated, false);
  assert.equal(report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.tagReleaseDeploy, false);
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.runtimeMutationImplemented,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.fullAggregatorImplementationComplete,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.runtimeIntegrated,
    false
  );
  assert.equal(report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.runtimeReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.finalRcMatrixReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.v1RcReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.rcReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.cutoverReady, false);
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.decisionImpact,
    'none_report_only'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.blockedDecisionRequired,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.canClaimRuntimeReady,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.canClaimFinalRcReady,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.canClaimV1RcReady,
    false
  );
  assert.equal(report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.canClaimRcReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorReadinessOverclaimRejectionProof.canClaimCutoverReady, false);
  assert.equal(
    report.summary.p66ValidationAggregatorGovernanceRuntimeLoopGapProofAvailable,
    true
  );
  assert.equal(
    report.summary.p66ValidationAggregatorGovernanceRuntimeLoopGapProofSourceMode,
    'static_report_shape_only'
  );
  assert.equal(
    report.summary.p66ValidationAggregatorGovernanceRuntimeLoopGapHelperCapabilityOnly,
    true
  );
  assert.equal(report.summary.p66ValidationAggregatorGovernanceRuntimeLoopStageCount, 6);
  assert.equal(
    report.summary.p66ValidationAggregatorGovernanceRuntimeLoopRequiredEvidenceGroupCount,
    8
  );
  assert.equal(report.summary.p66ValidationAggregatorGovernanceRuntimeLoopApprovalStateCount, 7);
  assert.equal(report.summary.p66ValidationAggregatorGovernanceRuntimeLoopFailClosedCaseCount, 20);
  assert.equal(report.summary.p66ValidationAggregatorGovernanceRuntimeLoopDisallowedWorkCount, 29);
  assert.equal(report.summary.p66ValidationAggregatorGovernanceRuntimeLoopFailClosedReasonCount, 31);
  assert.equal(
    report.summary.p66ValidationAggregatorGovernanceRuntimeLoopHelperImportedByAggregator,
    false
  );
  assert.equal(
    report.summary.p66ValidationAggregatorGovernanceRuntimeLoopHelperExecutedByAggregator,
    false
  );
  assert.equal(
    report.summary.p66ValidationAggregatorGovernanceRuntimeLoopEvidenceFileReadByAggregator,
    false
  );
  assert.equal(
    report.summary.p66ValidationAggregatorGovernanceRuntimeLoopCommandExecutedByAggregator,
    false
  );
  assert.equal(report.summary.p66ValidationAggregatorGovernanceRuntimeLoopExecuted, false);
  assert.equal(
    report.summary.p66ValidationAggregatorGovernanceRuntimeLoopApprovalExecutionReady,
    false
  );
  assert.equal(
    report.summary.p66ValidationAggregatorGovernanceRuntimeLoopAuditWriterReady,
    false
  );
  assert.equal(
    report.summary.p66ValidationAggregatorGovernanceRuntimeLoopDurableWriteReady,
    false
  );
  assert.equal(report.summary.p66ValidationAggregatorGovernanceRuntimeLoopRuntimeImplemented, false);
  assert.equal(
    report.summary.p66ValidationAggregatorGovernanceRuntimeLoopFullImplementationComplete,
    false
  );
  assert.equal(
    report.summary.p66ValidationAggregatorGovernanceRuntimeLoopCanClaimRuntimeReady,
    false
  );
  assert.equal(
    report.summary.p66ValidationAggregatorGovernanceRuntimeLoopCanClaimFinalRcReady,
    false
  );
  assert.equal(
    report.summary.p66ValidationAggregatorGovernanceRuntimeLoopCanClaimV1RcReady,
    false
  );
  assert.equal(report.summary.p66ValidationAggregatorGovernanceRuntimeLoopCanClaimRcReady, false);
  assert.equal(
    report.summary.p66ValidationAggregatorGovernanceRuntimeLoopCanClaimCutoverReady,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.status,
    'static_helper_capability_added_not_executed'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.sourceMode,
    'static_report_shape_only'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.helper,
    'src/core/ValidationAggregatorGovernanceRuntimeLoopGapContract.js'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.test,
    'tests/validation-aggregator-governance-runtime-loop-gap-contract-helper.test.js'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.schemaVersion,
    'p66-validation-aggregator-governance-runtime-loop-gap-fixture-v1'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.selectedGap,
    'governance_review_approval_audit_runtime_loop_not_executed'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.helperCapabilityOnly,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.explicitInputOnly,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.metadataOnly,
    true
  );
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.stageAcceptanceCases.length, 6);
  assert.equal(
    report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.requiredRuntimeEvidenceGroups.length,
    8
  );
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.approvalStates.length, 7);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.failClosedCases.length, 20);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.disallowedWork.length, 29);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.failClosedReasons.length, 31);
  assert.equal(
    report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.stageAcceptanceCases
      .every(stage => stage.canExecute === false && stage.durableWriteAllowed === false),
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.requiredRuntimeEvidenceGroups
      .every(group => group.currentStatus === 'missing' && group.mustFailClosedWhenMissing === true),
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.approvalStates
      .every(state => state.executionAllowed === false),
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.helperImportedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.helperExecutedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.fixtureReadByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.evidenceFileReadByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.realReviewPacketReadByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.realApprovalPacketReadByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.realAuditLogReadByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.commandExecutedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.governanceRuntimeLoopExecutedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.approvalExecutedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.governedActionExecutedByAggregator,
    false
  );
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.callsProviders, false);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.startsServices, false);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.readsFiles, false);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.scansRealMemory, false);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.readsRuntimeStores, false);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.durableMemoryTouched, false);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.durableAuditWritten, false);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.publicMcpExpanded, false);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.validateMemoryPublic, false);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.configMutated, false);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.startupWatchdogOperated, false);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.tagReleaseDeploy, false);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.runtimeMutationImplemented, false);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.governanceRuntimeLoopReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.governanceRuntimeLoopExecuted, false);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.approvalExecutionReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.auditWriterReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.durableWriteReady, false);
  assert.equal(
    report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.fullAggregatorImplementationComplete,
    false
  );
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.runtimeIntegrated, false);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.runtimeReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.finalRcMatrixReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.v1RcReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.rcReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.cutoverReady, false);
  assert.equal(
    report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.decisionImpact,
    'none_report_only'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.blockedDecisionRequired,
    true
  );
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.canClaimRuntimeReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.canClaimFinalRcReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.canClaimV1RcReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.canClaimRcReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorGovernanceRuntimeLoopGapProof.canClaimCutoverReady, false);
  assert.equal(
    report.summary.p66ValidationAggregatorRecallIsolationRuntimeProofAvailable,
    true
  );
  assert.equal(
    report.summary.p66ValidationAggregatorRecallIsolationRuntimeProofSourceMode,
    'static_report_shape_only'
  );
  assert.equal(
    report.summary.p66ValidationAggregatorRecallIsolationRuntimeProofHelperCapabilityOnly,
    true
  );
  assert.equal(report.summary.p66ValidationAggregatorRecallIsolationRecordFamilyCount, 9);
  assert.equal(report.summary.p66ValidationAggregatorRecallIsolationProofSurfaceCount, 7);
  assert.equal(report.summary.p66ValidationAggregatorRecallIsolationRequiredEvidenceGroupCount, 13);
  assert.equal(report.summary.p66ValidationAggregatorRecallIsolationControlCaseCount, 2);
  assert.equal(report.summary.p66ValidationAggregatorRecallIsolationFailClosedCaseCount, 27);
  assert.equal(report.summary.p66ValidationAggregatorRecallIsolationDisallowedWorkCount, 34);
  assert.equal(report.summary.p66ValidationAggregatorRecallIsolationFailClosedReasonCount, 21);
  assert.equal(report.summary.p66ValidationAggregatorRecallIsolationHelperImportedByAggregator, false);
  assert.equal(report.summary.p66ValidationAggregatorRecallIsolationHelperExecutedByAggregator, false);
  assert.equal(report.summary.p66ValidationAggregatorRecallIsolationEvidenceFileReadByAggregator, false);
  assert.equal(report.summary.p66ValidationAggregatorRecallIsolationCommandExecutedByAggregator, false);
  assert.equal(report.summary.p66ValidationAggregatorRecallIsolationRealMemoryScannedByAggregator, false);
  assert.equal(report.summary.p66ValidationAggregatorRecallIsolationRuntimeStoreScannedByAggregator, false);
  assert.equal(report.summary.p66ValidationAggregatorRecallIsolationRuntimeProofExecuted, false);
  assert.equal(report.summary.p66ValidationAggregatorRecallIsolationContaminationReportReady, false);
  assert.equal(report.summary.p66ValidationAggregatorRecallIsolationDurableWriteReady, false);
  assert.equal(report.summary.p66ValidationAggregatorRecallIsolationRuntimeImplemented, false);
  assert.equal(report.summary.p66ValidationAggregatorRecallIsolationFullImplementationComplete, false);
  assert.equal(report.summary.p66ValidationAggregatorRecallIsolationCanClaimRuntimeReady, false);
  assert.equal(report.summary.p66ValidationAggregatorRecallIsolationCanClaimFinalRcReady, false);
  assert.equal(report.summary.p66ValidationAggregatorRecallIsolationCanClaimV1RcReady, false);
  assert.equal(report.summary.p66ValidationAggregatorRecallIsolationCanClaimRcReady, false);
  assert.equal(report.summary.p66ValidationAggregatorRecallIsolationCanClaimCutoverReady, false);
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.status,
    'static_helper_capability_added_not_executed'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.sourceMode,
    'static_report_shape_only'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.helper,
    'src/core/ValidationAggregatorRecallIsolationRuntimeProofContract.js'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.test,
    'tests/validation-aggregator-recall-isolation-runtime-proof-contract-helper.test.js'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.schemaVersion,
    'p66-validation-aggregator-recall-isolation-runtime-proof-fixture-v1'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.selectedGap,
    'recall_isolation_runtime_proof_not_executed'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.helperCapabilityOnly,
    true
  );
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.explicitInputOnly, true);
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.metadataOnly, true);
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.isolatedRecordFamilyAcceptanceCases.length,
    9
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.proofSurfaceAcceptanceCases.length,
    7
  );
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.controlCases.length, 2);
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.requiredRuntimeEvidenceGroups.length,
    13
  );
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.failClosedCases.length, 27);
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.disallowedWork.length, 34);
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.failClosedReasons.length, 21);
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.isolatedRecordFamilyAcceptanceCases
      .every(item => (
        item.currentStatus === 'acceptance_defined_not_runtime_executed' &&
        item.mustBeExcludedFromAllProofSurfaces === true &&
        item.mustFailClosedWhenObserved === true
      )),
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.proofSurfaceAcceptanceCases
      .every(surface => (
        surface.runtimeStoreReadAllowed === false &&
        surface.contaminationAllowed === false &&
        surface.syntheticEvidenceAllowed === true &&
        surface.realDataEvidenceAllowed === false &&
        surface.futureEvidenceRequired === true
      )),
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.requiredRuntimeEvidenceGroups
      .every(group => group.currentStatus === 'missing' && group.mustFailClosedWhenMissing === true),
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.helperImportedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.helperExecutedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.fixtureReadByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.evidenceFileReadByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.commandExecutedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.recallExecutedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.recallIsolationRuntimeProofExecutedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.contaminationReportProducedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.realMemoryScannedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.diaryScannedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.sqliteScannedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.vectorIndexScannedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.candidateCacheScannedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.recallAuditScannedByAggregator,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.runtimeStoreScannedByAggregator,
    false
  );
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.callsProviders, false);
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.startsServices, false);
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.readsFiles, false);
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.scansRealMemory, false);
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.readsRuntimeStores, false);
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.durableMemoryTouched, false);
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.durableAuditWritten, false);
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.publicMcpExpanded, false);
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.validateMemoryPublic, false);
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.configMutated, false);
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.startupWatchdogOperated, false);
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.tagReleaseDeploy, false);
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.runtimeMutationImplemented, false);
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.recallIsolationRuntimeProofReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.recallIsolationRuntimeProofExecuted, false);
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.contaminationReportReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.durableWriteReady, false);
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.fullAggregatorImplementationComplete,
    false
  );
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.runtimeIntegrated, false);
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.runtimeReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.finalRcMatrixReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.v1RcReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.rcReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.cutoverReady, false);
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.decisionImpact,
    'none_report_only'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.blockedDecisionRequired,
    true
  );
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.canClaimRuntimeReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.canClaimFinalRcReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.canClaimV1RcReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.canClaimRcReady, false);
  assert.equal(report.evidence.p66ValidationAggregatorRecallIsolationRuntimeProof.canClaimCutoverReady, false);
  assert.ok(
    report.warnings.includes(
      'P66.44 recall isolation runtime proof helper capability is static and is not executed by the aggregator.'
    )
  );
  assert.deepEqual(report.evidence.p53ValidationAggregatorEvidenceInventory.sourceClasses.map(entry => entry.id), [
    'committed_evidence',
    'local_validation',
    'runtime_evidence',
    'final_rc_matrix_evidence'
  ]);
  assert.deepEqual(report.evidence.p53ValidationAggregatorEvidenceInventory.statusSemantics.map(entry => entry.id), [
    'fresh',
    'stale',
    'missing',
    'unsupported',
    'blocked',
    'not_executed'
  ]);
  assert.deepEqual(report.evidence.p53ValidationAggregatorEvidenceInventory.inventoryRows.map(row => row.id), [
    'validation_aggregator_current_report_shape',
    'p36_p40_static_evidence_source_map',
    'p45_final_rc_matrix_posture_bridge',
    'p52_minimal_runtime_schema_version_helper',
    'p52_local_validation_result',
    'schema_version_runtime_enforcement',
    'final_rc_matrix_runner_execution',
    'governance_review_approval_audit_runtime_loop'
  ]);
  assert.equal(report.evidence.p53ValidationAggregatorEvidenceInventory.inventoryRows.every(row => row.readinessAuthority === false), true);
  assert.equal(
    report.evidence.p53ValidationAggregatorEvidenceInventory.inventoryRows
      .find(row => row.id === 'schema_version_runtime_enforcement').runtimeEvidenceObserved,
    true
  );
  assert.equal(
    report.evidence.p53ValidationAggregatorEvidenceInventory.inventoryRows
      .filter(row => row.id !== 'schema_version_runtime_enforcement')
      .every(row => row.runtimeEvidenceObserved === false),
    true
  );
  assert.equal(report.evidence.p28ValidationEvidenceReader.status, 'no_explicit_validation_evidence');
  assert.equal(report.evidence.p28ValidationEvidenceReader.implemented, true);
  assert.equal(report.evidence.p28ValidationEvidenceReader.fullImplementation, false);
  assert.equal(report.evidence.p28ValidationEvidenceReader.contract.readsFiles, false);
  assert.equal(report.evidence.p28ValidationEvidenceReader.contract.executesCommands, false);
  assert.equal(report.evidence.p28ValidationEvidenceReader.contract.callsProviders, false);
  assert.equal(report.evidence.p28ValidationEvidenceReader.contract.mutatesDurableState, false);
  assert.equal(report.evidence.p28ValidationEvidenceReader.acceptedCount, 0);
  assert.equal(report.evidence.p28ValidationEvidenceReader.freshness.status, 'no_explicit_evidence');
  assert.equal(report.evidence.p28ValidationEvidenceReader.freshness.staleAfterHours, 168);
  assert.deepEqual(
    report.evidence.p28ValidationEvidenceReader.freshness.allowedStatuses,
    VALIDATION_EVIDENCE_FRESHNESS_STATUSES
  );
  assert.equal(report.evidence.p28ValidationEvidenceReader.gateReadiness.status, 'not_ready_no_explicit_evidence');
  assert.deepEqual(
    report.evidence.p28ValidationEvidenceReader.gateReadiness.allowedStatuses,
    VALIDATION_EVIDENCE_GATE_READINESS_STATUSES
  );
  assert.equal(report.evidence.p28ValidationEvidenceReader.gateReadiness.canClaimV1RcReady, false);
  assert.equal(report.evidence.p28ValidationEvidenceReader.gateReadiness.readyForFinalRcMatrixRunner, false);
  assert.equal(report.evidence.p28ValidationEvidenceReader.commandCoverage.status, 'no_explicit_evidence');
  assert.deepEqual(
    report.evidence.p28ValidationEvidenceReader.commandCoverage.allowedStatuses,
    VALIDATION_EVIDENCE_COMMAND_COVERAGE_STATUSES
  );
  assert.equal(report.evidence.p28ValidationEvidenceReader.commandCoverage.executesCommands, false);
  assert.equal(report.evidence.p28ValidationEvidenceReader.rejectionSummary.status, 'no_rejections');
  assert.deepEqual(
    report.evidence.p28ValidationEvidenceReader.rejectionSummary.allowedStatuses,
    VALIDATION_EVIDENCE_REJECTION_SUMMARY_STATUSES
  );
  assert.deepEqual(
    report.evidence.p28ValidationEvidenceReader.rejectionSummary.knownReasons,
    VALIDATION_EVIDENCE_REJECTION_REASONS
  );
  assert.equal(report.evidence.p28ValidationEvidenceReader.rejectionSummary.rawRejectedInputExposed, false);
  assert.equal(report.evidence.p28ValidationEvidenceReader.confidencePosture.status, 'no_explicit_evidence');
  assert.deepEqual(
    report.evidence.p28ValidationEvidenceReader.confidencePosture.allowedStatuses,
    VALIDATION_EVIDENCE_CONFIDENCE_POSTURE_STATUSES
  );
  assert.equal(report.evidence.p28ValidationEvidenceReader.confidencePosture.decisionImpact, 'none_report_only');
  assert.equal(report.evidence.p28ValidationEvidenceReader.confidencePosture.canClaimV1RcReady, false);
  assert.equal(report.evidence.p65ValidationAggregatorRuntimeEvidenceBridge.status, 'no_explicit_runtime_evidence_summary');
  assert.deepEqual(
    report.evidence.p65ValidationAggregatorRuntimeEvidenceBridge.allowedStatuses,
    RUNTIME_EVIDENCE_SUMMARY_STATUSES
  );
  assert.equal(report.evidence.p65ValidationAggregatorRuntimeEvidenceBridge.contract.readsFiles, false);
  assert.equal(report.evidence.p65ValidationAggregatorRuntimeEvidenceBridge.contract.executesCommands, false);
  assert.equal(report.evidence.p65ValidationAggregatorRuntimeEvidenceBridge.contract.startsServices, false);
  assert.equal(report.evidence.p65ValidationAggregatorRuntimeEvidenceBridge.contract.callsProviders, false);
  assert.equal(report.evidence.p65ValidationAggregatorRuntimeEvidenceBridge.canClaimV1RcReady, false);
});

test('minimal implementation preserves public MCP three-tool freeze', () => {
  const report = buildV1RcValidationAggregatorReport();

  assert.deepEqual(report.public_mcp_tools, [
    'record_memory',
    'search_memory',
    'memory_overview'
  ]);
});

test('validation aggregator ingests explicit sanitized runtime evidence summary without executing or claiming readiness', () => {
  const report = buildV1RcValidationAggregatorReport({
    generatedAt: '2026-05-18T02:00:00.000Z',
    runtimeEvidenceSummary: {
      status: 'local_runtime_evidence_passed_rc_still_blocked',
      decision: 'NOT_READY_BLOCKED',
      runnerExecuted: true,
      commandsExecuted: true,
      localRuntimeEvidenceMatrixExecuted: true,
      allowlistedFinalRcEvidenceRunnerExecuted: true,
      finalRcMatrixExecuted: false,
      fullFinalRcMatrixExecuted: false,
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      rcReady: false,
      criticalGates: {
        total: 12,
        passed: 12,
        failed: 0,
        allCriticalCommandsPassed: true
      },
      locallyEvidencedRuntimeGaps: [
        'runtime_schema_version_enforcement_not_fully_proven',
        'final_rc_matrix_runner_not_executed_as_real_matrix'
      ],
      remainingRuntimeGaps: [
        'validation_aggregator_full_implementation_incomplete',
        'mainline_strict_gate_not_executed_for_cutover'
      ],
      safety: {
        mutated: false,
        providerCalls: 0,
        serviceStarted: false,
        readsRealMemory: false,
        writesDurableMemory: false,
        realMemoryPreview: false,
        remoteWrites: false,
        configChanged: false,
        migrationApplied: false,
        importExportApplied: false
      }
    }
  });
  const bridge = report.evidence.p65ValidationAggregatorRuntimeEvidenceBridge;

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.deepEqual(bridge.allowedStatuses, RUNTIME_EVIDENCE_SUMMARY_STATUSES);
  assert.equal(bridge.status, 'explicit_runtime_evidence_summary_available');
  assert.equal(bridge.implemented, true);
  assert.equal(bridge.fullImplementation, false);
  assert.equal(bridge.accepted, true);
  assert.equal(bridge.rejected, false);
  assert.equal(bridge.contract.sourceMode, 'explicit_sanitized_summary_only');
  assert.equal(bridge.contract.readsFiles, false);
  assert.equal(bridge.contract.executesCommands, false);
  assert.equal(bridge.contract.startsServices, false);
  assert.equal(bridge.contract.callsProviders, false);
  assert.equal(bridge.contract.mutatesDurableState, false);
  assert.equal(bridge.summary.sourceStatus, 'local_runtime_evidence_passed_rc_still_blocked');
  assert.equal(bridge.summary.sourceDecision, 'NOT_READY_BLOCKED');
  assert.equal(bridge.summary.runnerExecuted, true);
  assert.equal(bridge.summary.commandsExecutedBySource, true);
  assert.equal(bridge.summary.commandsExecutedByAggregator, false);
  assert.equal(bridge.summary.localRuntimeEvidenceMatrixExecutedBySource, true);
  assert.equal(bridge.summary.allowlistedFinalRcEvidenceRunnerExecutedBySource, true);
  assert.equal(bridge.summary.finalRcMatrixExecutedBySource, false);
  assert.equal(bridge.summary.fullFinalRcMatrixExecutedBySource, false);
  assert.equal(bridge.summary.allCriticalCommandsPassed, true);
  assert.equal(bridge.summary.criticalGateCount, 12);
  assert.equal(bridge.summary.criticalGatePassedCount, 12);
  assert.equal(bridge.summary.criticalGateFailedCount, 0);
  assert.equal(bridge.summary.locallyEvidencedRuntimeGapCount, 2);
  assert.equal(bridge.summary.remainingRuntimeGapCount, 2);
  assert.equal(bridge.summary.noProvider, true);
  assert.equal(bridge.summary.noDurableMemoryWrite, true);
  assert.equal(bridge.summary.noRealMemoryPreview, true);
  assert.equal(bridge.summary.noRemoteWrite, true);
  assert.deepEqual(bridge.locallyEvidencedRuntimeGaps, [
    'runtime_schema_version_enforcement_not_fully_proven',
    'final_rc_matrix_runner_not_executed_as_real_matrix'
  ]);
  assert.deepEqual(bridge.remainingRuntimeGaps, [
    'validation_aggregator_full_implementation_incomplete',
    'mainline_strict_gate_not_executed_for_cutover'
  ]);
  assert.equal(bridge.canClaimRuntimeReady, false);
  assert.equal(bridge.canClaimFinalRcReady, false);
  assert.equal(bridge.canClaimV1RcReady, false);
  assert.equal(report.summary.runtimeEvidenceSummaryStatus, 'explicit_runtime_evidence_summary_available');
  assert.equal(report.summary.runtimeEvidenceSummaryAccepted, true);
  assert.equal(report.summary.runtimeEvidenceSummaryRejected, false);
  assert.equal(report.summary.runtimeEvidenceSummaryLocallyEvidencedGapCount, 2);
  assert.equal(report.summary.runtimeEvidenceSummaryRemainingGapCount, 2);
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationGapAccountingRuntimeSummaryBound, true);
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationGapAccountingRuntimeSummaryRemainingGapCount, 2);
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingRuntimeSummaryLocallyEvidencedGapCount,
    2
  );
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingEffectiveGapSource,
    'accepted_runtime_summary'
  );
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationGapAccountingEffectiveRemainingGapCount, 2);
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingEffectiveLocallyEvidencedGapCount,
    2
  );
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationGapAccountingStaticBaselineClearedGapCount, 5);
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingStaticBaselineStillRemainingGapCount,
    2
  );
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingEffectiveNonBaselineRemainingGapCount,
    0
  );
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingEffectiveLocalImplementationGapCount,
    1
  );
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationGapAccountingEffectiveA5GatedGapCount, 1);
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationGapAccountingEffectiveRedLaneGapCount, 1);
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingClosureAuthorityStatus,
    'local_implementation_required'
  );
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingNextClosureAuthority,
    'local_source_test_implementation'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.acceptedRuntimeSummaryBound,
    true
  );
  assert.deepEqual(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.acceptedRuntimeSummaryRemainingGapIds,
    [
      'validation_aggregator_full_implementation_incomplete',
      'mainline_strict_gate_not_executed_for_cutover'
    ]
  );
  assert.deepEqual(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.acceptedRuntimeSummaryLocallyEvidencedGapIds,
    [
      'runtime_schema_version_enforcement_not_fully_proven',
      'final_rc_matrix_runner_not_executed_as_real_matrix'
    ]
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.effectiveGapSource,
    'accepted_runtime_summary'
  );
  assert.deepEqual(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.effectiveRemainingFullImplementationGapIds,
    [
      'validation_aggregator_full_implementation_incomplete',
      'mainline_strict_gate_not_executed_for_cutover'
    ]
  );
  assert.deepEqual(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.effectiveLocallyEvidencedFullImplementationGapIds,
    [
      'runtime_schema_version_enforcement_not_fully_proven',
      'final_rc_matrix_runner_not_executed_as_real_matrix'
    ]
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.staticBaselineClearedGapIds.includes(
      'migration_import_export_backup_restore_approval_execution_blocked'
    ),
    true
  );
  assert.deepEqual(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.staticBaselineStillRemainingGapIds,
    [
      'validation_aggregator_full_implementation_incomplete',
      'mainline_strict_gate_not_executed_for_cutover'
    ]
  );
  assert.deepEqual(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.effectiveNonBaselineRemainingGapIds,
    []
  );
  assert.deepEqual(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.effectiveLocalImplementationGapIds,
    ['validation_aggregator_full_implementation_incomplete']
  );
  assert.deepEqual(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.effectiveA5GatedGapIds,
    ['mainline_strict_gate_not_executed_for_cutover']
  );
  assert.deepEqual(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.effectiveRedLaneGapIds,
    ['mainline_strict_gate_not_executed_for_cutover']
  );
  assert.deepEqual(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureAuthoritySummary,
    {
      status: 'local_implementation_required',
      nextAuthority: 'local_source_test_implementation',
      localImplementationRequired: true,
      a5AuthorizationRequired: true,
      redLaneAuthorizationRequired: true,
      manualGapModelingRequired: false,
      blockerClearanceRequired: true,
      readinessAuthorityRequired: true,
      canProceedAutomatically: true,
      canClaimReadiness: false
    }
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.fullImplementationGapAccounting.fullImplementationReady,
    false
  );
  assert.equal(report.summary.validationAggregatorFullImplementation, false);
  assert.equal(report.summary.runtimeReady, false);
  assert.equal(report.summary.finalRcMatrixReady, false);
  assert.equal(report.summary.rcReady, false);
  assert.equal(report.summary.runtimeEvidenceSummaryCanClaimV1RcReady, false);
  assertNoSensitiveSurface(report);
});

test('validation aggregator runtime evidence summary rejects readiness claims, side effects, and secrets', () => {
  const readinessClaim = buildV1RcValidationAggregatorReport({
    runtimeEvidenceSummary: {
      status: 'local_runtime_evidence_passed_rc_ready',
      decision: 'READY_FOR_V1_0_RC',
      runtimeReady: true,
      finalRcMatrixReady: true,
      fullFinalRcMatrixExecuted: true,
      v1RcReady: true,
      rcReady: true,
      safety: { mutated: false, providerCalls: 0 }
    }
  });
  const unsafeSummary = buildV1RcValidationAggregatorReport({
    runtimeEvidenceSummary: {
      status: 'provider_call_attempted',
      decision: 'NOT_READY_BLOCKED',
      safety: { mutated: false, providerCalls: 1 }
    }
  });
  const secretSummary = buildV1RcValidationAggregatorReport({
    runtimeEvidenceSummary: {
      status: 'local_runtime_evidence_passed_rc_still_blocked',
      decision: 'NOT_READY_BLOCKED',
      summary: 'authorization: should never surface',
      safety: { mutated: false, providerCalls: 0 }
    }
  });

  assert.equal(
    readinessClaim.evidence.p65ValidationAggregatorRuntimeEvidenceBridge.status,
    'runtime_evidence_summary_rejected'
  );
  assert.equal(
    readinessClaim.evidence.p65ValidationAggregatorRuntimeEvidenceBridge.rejectReason,
    'readiness_claim_rejected'
  );
  assert.equal(unsafeSummary.evidence.p65ValidationAggregatorRuntimeEvidenceBridge.rejectReason, 'unsafe_summary_rejected');
  assert.equal(secretSummary.evidence.p65ValidationAggregatorRuntimeEvidenceBridge.rejectReason, 'sensitive_fragment_rejected');
  assert.equal(readinessClaim.summary.runtimeEvidenceSummaryAccepted, false);
  assert.equal(readinessClaim.summary.runtimeEvidenceSummaryRejected, true);
  assert.equal(readinessClaim.summary.validationAggregatorFullImplementation, false);
  assert.equal(readinessClaim.summary.runtimeReady, false);
  assert.equal(readinessClaim.summary.finalRcMatrixReady, false);
  assert.equal(readinessClaim.summary.rcReady, false);
  assert.equal(readinessClaim.decision, 'NOT_READY_BLOCKED');
  assertNoSensitiveSurface(secretSummary);
});

test('effective gap accounting fails closed on non-baseline remaining gaps', () => {
  const report = buildV1RcValidationAggregatorReport({
    runtimeEvidenceSummary: {
      status: 'local_runtime_evidence_passed_rc_still_blocked',
      decision: 'NOT_READY_BLOCKED',
      runtimeReady: false,
      finalRcMatrixReady: false,
      v1RcReady: false,
      rcReady: false,
      locallyEvidencedRuntimeGaps: [
        'runtime_schema_version_enforcement_not_fully_proven'
      ],
      remainingRuntimeGaps: [
        'validation_aggregator_full_implementation_incomplete',
        'future_unmodeled_runtime_gap'
      ],
      safety: {
        mutated: false,
        providerCalls: 0,
        serviceStarted: false,
        readsRealMemory: false,
        writesDurableMemory: false,
        realMemoryPreview: false,
        remoteWrites: false,
        configChanged: false,
        migrationApplied: false,
        importExportApplied: false
      }
    }
  });

  const definition = report.evidence.p66ValidationAggregatorFullImplementationDefinition;

  assert.equal(report.summary.runtimeEvidenceSummaryAccepted, true);
  assert.equal(definition.effectiveGapSource, 'accepted_runtime_summary');
  assert.deepEqual(definition.effectiveNonBaselineRemainingGapIds, [
    'future_unmodeled_runtime_gap'
  ]);
  assert.equal(definition.effectiveNonBaselineRemainingGapCount, 1);
  assert.equal(definition.closureAuthorityStatus, 'local_implementation_required');
  assert.equal(definition.nextClosureAuthority, 'local_source_test_implementation');
  assert.equal(definition.closureAuthoritySummary.manualGapModelingRequired, true);
  assert.equal(definition.closureAuthoritySummary.canClaimReadiness, false);
  assert.equal(definition.closureCriteria.effectiveNonBaselineRemainingGapsAbsent, false);
  assert.equal(
    definition.closureMissingCriteria.includes('effective_non_baseline_remaining_gaps_absent'),
    true
  );
  assert.equal(definition.closureReady, false);
  assert.equal(report.summary.runtimeReady, false);
  assert.equal(report.summary.rcReady, false);
});

test('minimal implementation maps current conclusions to documented evidence sources', () => {
  const report = buildV1RcValidationAggregatorReport();

  assert.ok(report.evidence_sources);
  assert.ok(report.evidence_sources.decision);
  assert.equal(report.evidence_sources.decision.source_ref, 'ValidationAggregatorService');
  assert.match(report.evidence_sources.public_mcp_tools.source_ref, /src\/core\/constants\.js/);
  assert.equal(report.evidence_sources.schema_version_runtime_enforcement.status, 'runtime_write_boundary_guard_added');
  assert.equal(report.evidence_sources.schema_version_policy_fixture.status, 'fixture_contract_added');
  assert.equal(report.evidence_sources.schema_version_policy_helper.status, 'helper_added_runtime_not_integrated');
  assert.match(report.evidence_sources.schema_version_policy_helper.source_ref, /src\/core\/SchemaVersionPolicy\.js/);
  assert.equal(report.evidence_sources.schema_version_runtime_boundary_guard.status, 'boundary_guard_added_runtime_not_integrated');
  assert.match(report.evidence_sources.schema_version_runtime_boundary_guard.source_ref, /tests\/schema-version-runtime-boundary\.test\.js/);
  assert.equal(report.evidence_sources.schema_compatibility_dry_run_cli.status, 'fixture_only_cli_added_not_executed');
  assert.equal(report.evidence_sources.migration_import_export_dry_run_gate_cli.status, 'fixture_only_cli_added_not_executed');
  assert.equal(report.evidence_sources.migration_import_export_approval_packet_cli.status, 'fixture_only_cli_added_not_executed');
  assert.equal(report.evidence_sources.final_rc_validation_matrix_manifest_helper.status, 'helper_added_report_shape_only_not_executed');
  assert.match(report.evidence_sources.final_rc_validation_matrix_manifest_helper.source_ref, /src\/core\/FinalRcValidationMatrixManifest\.js/);
  assert.equal(report.evidence_sources.memory_governance_lifecycle_contract_helper.status, 'helper_added_report_shape_only_not_executed');
  assert.match(report.evidence_sources.memory_governance_lifecycle_contract_helper.source_ref, /src\/core\/MemoryGovernanceLifecycleContract\.js/);
  assert.equal(report.evidence_sources.p36_scope_a5_boundary_contract.status, 'fixture_contract_added_not_runtime_ready');
  assert.equal(report.evidence_sources.p36_scope_a5_boundary_contract.source_type, 'committed_fixture');
  assert.equal(report.evidence_sources.p36_scope_a5_boundary_contract.acceptedForPlanning, false);
  assert.equal(report.evidence_sources.p36_scope_a5_boundary_contract.fixtureReadByAggregator, false);
  assert.equal(report.evidence_sources.p36_scope_a5_boundary_contract.testExecutedByAggregator, false);
  assert.match(report.evidence_sources.p36_scope_a5_boundary_contract.source_ref, /tests\/p36-scope-a5-boundary-contract-fixture\.test\.js/);
  assert.equal(report.evidence_sources.p36_task_risk_labels_contract.status, 'fixture_contract_added_not_runtime_ready');
  assert.equal(report.evidence_sources.p37_policy_decision_envelope_fixture_matrix.status, 'fixture_contract_added_not_runtime_ready');
  assert.equal(report.evidence_sources.p38_recall_isolation_fixture.status, 'fixture_contract_added_not_runtime_ready');
  assert.equal(report.evidence_sources.p39_synthetic_migration_dry_run_contract.status, 'fixture_contract_added_not_runtime_ready');
  assert.equal(report.evidence_sources.p40_local_readiness_report.status, 'local_evidence_report_added_not_runtime_ready');
  assert.equal(report.evidence_sources.p36_p40_evidence_source_map.status, 'static_report_shape_added_not_executed');
  assert.equal(report.evidence_sources.p36_p40_evidence_source_map.source_type, 'local_validation_summary');
  assert.equal(report.evidence_sources.p36_p40_evidence_source_map.acceptedForPlanning, false);
  assert.match(report.evidence_sources.p36_p40_evidence_source_map.source_ref, /ValidationAggregatorService evidence\.p36P40EvidenceSourceMap/);
  assert.equal(report.evidence_sources.p45_final_rc_matrix_evaluator_posture.status, 'static_report_shape_added_not_executed');
  assert.equal(report.evidence_sources.p45_final_rc_matrix_evaluator_posture.source_type, 'local_validation_summary');
  assert.equal(report.evidence_sources.p45_final_rc_matrix_evaluator_posture.acceptedForPlanning, false);
  assert.equal(report.evidence_sources.p45_final_rc_matrix_evaluator_posture.fixtureReadByAggregator, false);
  assert.equal(report.evidence_sources.p45_final_rc_matrix_evaluator_posture.evaluatorImportedByAggregator, false);
  assert.equal(report.evidence_sources.p45_final_rc_matrix_evaluator_posture.evaluatorExecutedByAggregator, false);
  assert.equal(report.evidence_sources.p45_final_rc_matrix_evaluator_posture.runnerExecutedByAggregator, false);
  assert.equal(report.evidence_sources.p45_final_rc_matrix_evaluator_posture.observedFromRuntime, false);
  assert.match(report.evidence_sources.p45_final_rc_matrix_evaluator_posture.source_ref, /ValidationAggregatorService evidence\.p45FinalRcMatrixEvaluatorPosture/);
  assert.equal(report.evidence_sources.p53_validation_aggregator_evidence_inventory.status, 'static_report_shape_added_not_executed');
  assert.equal(report.evidence_sources.p53_validation_aggregator_evidence_inventory.source_type, 'static_aggregator_report_shape');
  assert.equal(report.evidence_sources.p53_validation_aggregator_evidence_inventory.acceptedForPlanning, false);
  assert.equal(report.evidence_sources.p53_validation_aggregator_evidence_inventory.fixtureReadByAggregator, false);
  assert.equal(report.evidence_sources.p53_validation_aggregator_evidence_inventory.testExecutedByAggregator, false);
  assert.equal(report.evidence_sources.p53_validation_aggregator_evidence_inventory.helperExecutedByAggregator, false);
  assert.equal(report.evidence_sources.p53_validation_aggregator_evidence_inventory.runnerExecutedByAggregator, false);
  assert.equal(report.evidence_sources.p53_validation_aggregator_evidence_inventory.observedFromRuntime, false);
  assert.match(report.evidence_sources.p53_validation_aggregator_evidence_inventory.source_ref, /ValidationAggregatorService evidence\.p53ValidationAggregatorEvidenceInventory/);
  assert.equal(report.evidence_sources.validation_evidence_reader.status, 'foundation_added_read_only');
  assert.equal(report.evidence_sources.full_final_rc_matrix.status, 'not_executed');
  assert.equal(report.evidence_sources.a5_gated_actions.status, 'blocked_pending_a5');
  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.deepEqual(report.public_mcp_tools, [
    'record_memory',
    'search_memory',
    'memory_overview'
  ]);
});

test('validation evidence reader exposes only explicit committed and local validation inputs', () => {
  const report = buildV1RcValidationAggregatorReport({
    generatedAt: '2026-05-17T02:00:00.000Z',
    validationEvidenceSources: [
      {
        id: 'cmv-0333-committed',
        source_type: 'committed_validation',
        evidence_class: 'committed_evidence',
        status: 'passed',
        source_ref: '.agent_board/VALIDATION_LOG.md#CMV-0333',
        observed_at: '2026-05-17T00:00:00.000Z',
        commit: '9631b7e',
        commands: ['git diff --check'],
        summary: 'P27 closeout docs validation passed.',
        safety: {
          mutated: false,
          providerCalls: 0,
          serviceStarted: false,
          durableMemoryTouched: false,
          realMemoryPreview: false
        }
      },
      {
        id: 'p28-targeted-local',
        source_type: 'local_validation',
        evidence_class: 'local_validation',
        status: 'passed',
        source_ref: 'tests/v1-rc-validation-aggregator-implementation.test.js',
        observed_at: '2026-05-17T01:30:00.000Z',
        commands: ['node --test tests\\v1-rc-validation-aggregator-implementation.test.js'],
        summary: 'Targeted aggregator evidence-reader test input.',
        safety: {
          mutated: false
        }
      }
    ]
  });

  const reader = report.evidence.p28ValidationEvidenceReader;

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.summary.validationAggregatorFullImplementation, false);
  assert.equal(report.summary.schemaVersionRuntimeEnforcementImplemented, true);
  assert.equal(report.summary.validationEvidenceAcceptedCount, 2);
  assert.equal(report.summary.validationEvidenceFreshnessStatus, 'fresh_passed');
  assert.equal(report.summary.validationEvidenceStaleCount, 0);
  assert.equal(report.summary.validationEvidenceGateReadinessStatus, 'not_ready_existing_blockers');
  assert.equal(report.summary.validationEvidenceCanClaimV1RcReady, false);
  assert.equal(report.summary.validationEvidenceCommandCoverageStatus, 'command_coverage_present');
  assert.equal(report.summary.validationEvidenceCommandCount, 2);
  assert.equal(report.summary.validationEvidenceRejectionStatus, 'no_rejections');
  assert.equal(report.summary.validationEvidenceRejectedCount, 0);
  assert.equal(report.summary.validationEvidenceConfidencePostureStatus, 'usable_but_blocked');
  assert.equal(report.summary.validationEvidenceConfidenceCanClaimV1RcReady, false);
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingValidationFreshnessStatus,
    'fresh_passed'
  );
  assert.equal(
    report.summary.p66ValidationAggregatorFullImplementationGapAccountingValidationGateReadinessStatus,
    'not_ready_existing_blockers'
  );
  assert.equal(report.summary.p66ValidationAggregatorFullImplementationGapAccountingValidationEvidenceUsable, true);
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.validationEvidenceFreshnessStatus,
    'fresh_passed'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.validationEvidenceGateReadinessStatus,
    'not_ready_existing_blockers'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.validationEvidenceCommandCoverageStatus,
    'command_coverage_present'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.validationEvidenceConfidencePostureStatus,
    'usable_but_blocked'
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.fullImplementationGapAccounting.fullImplementationReady,
    false
  );
  assert.deepEqual(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.runtimeRequiredBlockerIds,
    ['validation-aggregator-full-implementation-not-complete']
  );
  assert.deepEqual(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.a5GatedBlockerIds,
    [
      'migration-import-export-apply-a5-gated',
      'provider-execution-a5-gated',
      'startup-watchdog-a5-gated',
      'codex-claude-config-switch-a5-gated',
      'production-deploy-a5-gated',
      'push-tag-release-deploy-a5-gated'
    ]
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureCriteria.validationEvidenceExplicitEvidenceUsable,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureCriteria.runtimeRequiredBlockersCleared,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureCriteria.effectiveRemainingGapsCleared,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureCriteria.effectiveNonBaselineRemainingGapsAbsent,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureCriteria.effectiveLocalImplementationGapsCleared,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureCriteria.effectiveA5GatedGapsCleared,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureCriteria.effectiveRedLaneGapsCleared,
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureMissingCriteria.includes(
      'usable_validation_evidence'
    ),
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureMissingCriteria.includes(
      'effective_remaining_gaps_cleared'
    ),
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureMissingCriteria.includes(
      'effective_non_baseline_remaining_gaps_absent'
    ),
    false
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureMissingCriteria.includes(
      'effective_local_implementation_gaps_cleared'
    ),
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureMissingCriteria.includes(
      'effective_a5_gated_gaps_cleared'
    ),
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorFullImplementationDefinition.closureMissingCriteria.includes(
      'effective_red_lane_gaps_cleared'
    ),
    true
  );
  assert.equal(reader.status, 'explicit_evidence_available');
  assert.equal(reader.sourceMode, 'explicit_safe_inputs_only');
  assert.deepEqual(reader.contract.sourceTypes, VALIDATION_EVIDENCE_SOURCE_TYPES);
  assert.deepEqual(reader.contract.sourceClasses, VALIDATION_EVIDENCE_SOURCE_CLASSES);
  assert.equal(reader.contract.readsFiles, false);
  assert.equal(reader.contract.executesCommands, false);
  assert.equal(reader.contract.startsServices, false);
  assert.equal(reader.acceptedCount, 2);
  assert.equal(reader.rejectedCount, 0);
  assert.equal(reader.summary.committedValidationCount, 1);
  assert.equal(reader.summary.localValidationCount, 1);
  assert.equal(reader.summary.committedEvidenceClassCount, 1);
  assert.equal(reader.summary.localEvidenceClassCount, 1);
  assert.equal(reader.summary.runtimeEvidenceClassCount, 0);
  assert.equal(reader.summary.finalRcMatrixEvidenceClassCount, 0);
  assert.equal(reader.summary.passedCount, 2);
  assert.equal(reader.summary.allAcceptedSafe, true);
  assert.equal(reader.freshness.status, 'fresh_passed');
  assert.equal(reader.freshness.referenceTime, '2026-05-17T02:00:00.000Z');
  assert.equal(reader.freshness.sourcesWithObservedAt, 2);
  assert.equal(reader.freshness.unknownFreshnessCount, 0);
  assert.equal(reader.freshness.staleCount, 0);
  assert.equal(reader.freshness.freshestObservedAt, '2026-05-17T01:30:00.000Z');
  assert.equal(reader.freshness.allAcceptedPassed, true);
  assert.equal(reader.freshness.hasFailedEvidence, false);
  assert.equal(reader.freshness.hasBlockedEvidence, false);
  assert.equal(reader.gateReadiness.status, 'not_ready_existing_blockers');
  assert.equal(reader.gateReadiness.explicitEvidenceUsable, true);
  assert.equal(reader.gateReadiness.canClaimV1RcReady, false);
  assert.equal(reader.gateReadiness.readyForFinalRcMatrixRunner, false);
  assert.equal(reader.gateReadiness.blockerCounts.validationRequired, 1);
  assert.equal(reader.gateReadiness.blockerCounts.runtimeRequired, 1);
  assert.equal(reader.gateReadiness.blockerCounts.a5Gated, 6);
  assert.equal(reader.gateReadiness.blockedBy.includes('schema-version-runtime-enforcement-not-implemented'), false);
  assert.equal(reader.commandCoverage.status, 'command_coverage_present');
  assert.equal(reader.commandCoverage.executesCommands, false);
  assert.equal(reader.commandCoverage.acceptedEvidenceCount, 2);
  assert.equal(reader.commandCoverage.sourcesWithCommands, 2);
  assert.equal(reader.commandCoverage.sourcesWithoutCommands, 0);
  assert.equal(reader.commandCoverage.commandCount, 2);
  assert.equal(reader.commandCoverage.uniqueCommandCount, 2);
  assert.deepEqual(reader.commandCoverage.sourceTypesCovered, [
    'committed_validation',
    'local_validation'
  ]);
  assert.deepEqual(reader.commandCoverage.sourceClassesCovered, [
    'committed_evidence',
    'local_validation'
  ]);
  assert.equal(reader.commandCoverage.requiredSourceTypesCovered, true);
  assert.equal(reader.commandCoverage.runtimeEvidenceAccepted, false);
  assert.equal(reader.commandCoverage.finalRcMatrixEvidenceAccepted, false);
  assert.equal(reader.commandCoverage.commandFamilies.git, 1);
  assert.equal(reader.commandCoverage.commandFamilies.node, 1);
  assert.equal(reader.commandCoverage.commandFamilies.npm, 0);
  assert.equal(reader.commandCoverage.allAcceptedHaveCommands, true);
  assert.equal(reader.rejectionSummary.status, 'no_rejections');
  assert.equal(reader.rejectionSummary.rejectedCount, 0);
  assert.equal(reader.rejectionSummary.rejectsUnsafeInputs, true);
  assert.equal(reader.confidencePosture.status, 'usable_but_blocked');
  assert.equal(reader.confidencePosture.confidenceSignal, 'usable_explicit_evidence');
  assert.equal(reader.confidencePosture.canClaimV1RcReady, false);
  assert.equal(reader.confidencePosture.limitations.includes('full_final_rc_matrix_not_executed'), true);
  assert.equal(reader.confidencePosture.limitations.includes('runtime_schema_version_enforcement_missing'), true);
  assert.equal(reader.confidencePosture.limitations.includes('a5_actions_blocked'), true);
  assert.deepEqual(reader.acceptedSources.map(source => source.id), [
    'cmv-0333-committed',
    'p28-targeted-local'
  ]);
  assert.deepEqual(reader.acceptedSources.map(source => source.evidence_class), [
    'committed_evidence',
    'local_validation'
  ]);
  assert.equal(reader.acceptedSources[0].safety.providerCalls, 0);
  assert.equal(reader.acceptedSources[0].safety.serviceStarted, false);
  assert.equal(reader.acceptedSources[0].safety.durableMemoryTouched, false);
  assert.equal(reader.acceptedSources[0].safety.realMemoryPreview, false);
});

test('validation evidence freshness summary surfaces stale, unknown, warning, and failing explicit inputs', () => {
  const staleReport = buildV1RcValidationAggregatorReport({
    generatedAt: '2026-05-17T00:00:00.000Z',
    validationEvidenceSources: [
      {
        id: 'stale-committed',
        source_type: 'committed_validation',
        status: 'passed',
        source_ref: '.agent_board/VALIDATION_LOG.md#CMV-0300',
        observed_at: '2026-05-01T00:00:00.000Z',
        safety: { mutated: false }
      },
      {
        id: 'unknown-local',
        source_type: 'local_validation',
        status: 'warning',
        source_ref: 'tests/v1-rc-validation-aggregator-implementation.test.js',
        safety: { mutated: false }
      }
    ]
  });
  const failingReport = buildV1RcValidationAggregatorReport({
    generatedAt: '2026-05-17T00:00:00.000Z',
    validationEvidenceSources: [
      {
        id: 'failed-local',
        source_type: 'local_validation',
        status: 'failed',
        source_ref: 'tests/v1-rc-validation-aggregator-implementation.test.js',
        observed_at: '2026-05-17T00:00:00.000Z',
        safety: { mutated: false }
      }
    ]
  });

  assert.equal(staleReport.decision, 'NOT_READY_BLOCKED');
  assert.equal(staleReport.evidence.p28ValidationEvidenceReader.freshness.status, 'stale_or_unknown');
  assert.equal(staleReport.evidence.p28ValidationEvidenceReader.freshness.staleCount, 1);
  assert.equal(staleReport.evidence.p28ValidationEvidenceReader.freshness.unknownFreshnessCount, 1);
  assert.equal(staleReport.evidence.p28ValidationEvidenceReader.freshness.hasWarnings, true);
  assert.equal(staleReport.evidence.p28ValidationEvidenceReader.freshness.allAcceptedPassed, false);
  assert.equal(staleReport.evidence.p28ValidationEvidenceReader.gateReadiness.status, 'not_ready_stale_or_unknown_evidence');
  assert.equal(staleReport.evidence.p28ValidationEvidenceReader.gateReadiness.explicitEvidenceUsable, false);
  assert.equal(staleReport.evidence.p28ValidationEvidenceReader.commandCoverage.status, 'command_coverage_missing');
  assert.equal(staleReport.evidence.p28ValidationEvidenceReader.commandCoverage.sourcesWithoutCommands, 2);
  assert.equal(staleReport.evidence.p28ValidationEvidenceReader.confidencePosture.status, 'stale_or_unknown_signal');
  assert.equal(failingReport.decision, 'NOT_READY_BLOCKED');
  assert.equal(failingReport.evidence.p28ValidationEvidenceReader.freshness.status, 'failed_or_blocked');
  assert.equal(failingReport.evidence.p28ValidationEvidenceReader.freshness.hasFailedEvidence, true);
  assert.equal(failingReport.evidence.p28ValidationEvidenceReader.gateReadiness.status, 'not_ready_failed_or_blocked_evidence');
  assert.equal(failingReport.evidence.p28ValidationEvidenceReader.confidencePosture.status, 'failed_or_blocked_signal');
});

test('validation evidence reader rejects unsafe, unsupported, or sensitive explicit inputs', () => {
  const reader = normalizeValidationEvidenceSources([
    {
      id: 'provider-side-effect',
      source_type: 'local_validation',
      status: 'passed',
      source_ref: 'manual-input',
      safety: {
        providerCalls: 1
      }
    },
    {
      id: 'unsupported-kind',
      source_type: 'live_validation',
      status: 'passed',
      source_ref: 'manual-input'
    },
    {
      id: 'sensitive-summary',
      source_type: 'local_validation',
      status: 'passed',
      source_ref: 'manual-input',
      summary: 'authorization: should be rejected'
    }
  ]);

  assert.equal(reader.acceptedCount, 0);
  assert.equal(reader.rejectedCount, 3);
  assert.deepEqual(reader.rejectedSources.map(source => source.reason), [
    'side_effect_evidence_rejected',
    'unsupported_source_type',
    'sensitive_fragment_rejected'
  ]);
  assert.equal(JSON.stringify(reader).toLowerCase().includes('authorization:'), false);
});

test('validation evidence gate readiness fails closed when explicit inputs include rejections', () => {
  const report = buildV1RcValidationAggregatorReport({
    generatedAt: '2026-05-17T00:00:00.000Z',
    validationEvidenceSources: [
      {
        id: 'fresh-local',
        source_type: 'local_validation',
        status: 'passed',
        source_ref: 'tests/v1-rc-validation-aggregator-implementation.test.js',
        observed_at: '2026-05-17T00:00:00.000Z',
        safety: { mutated: false }
      },
      {
        id: 'unsupported-kind',
        source_type: 'live_validation',
        status: 'passed',
        source_ref: 'manual-input',
        observed_at: '2026-05-17T00:00:00.000Z',
        safety: { mutated: false }
      }
    ]
  });
  const readiness = report.evidence.p28ValidationEvidenceReader.gateReadiness;

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(readiness.status, 'not_ready_rejected_evidence');
  assert.equal(readiness.acceptedEvidenceCount, 1);
  assert.equal(readiness.rejectedEvidenceCount, 1);
  assert.equal(readiness.explicitEvidenceUsable, false);
  assert.equal(readiness.canClaimV1RcReady, false);
  assert.equal(report.summary.validationEvidenceRejectionStatus, 'rejections_present');
  assert.equal(report.summary.validationEvidenceRejectedCount, 1);
  assert.equal(report.evidence.p28ValidationEvidenceReader.rejectionSummary.reasonCounts.unsupported_source_type, 1);
  assert.equal(report.evidence.p28ValidationEvidenceReader.rejectionSummary.hasUnsupportedContractRejection, true);
  assert.equal(report.evidence.p28ValidationEvidenceReader.rejectionSummary.rawRejectedInputExposed, false);
  assert.equal(report.evidence.p28ValidationEvidenceReader.confidencePosture.status, 'rejected_or_unsafe_signal');
});

test('validation evidence reader rejects caller-claimed runtime and final RC evidence classes', () => {
  const report = buildV1RcValidationAggregatorReport({
    validationEvidenceSources: [
      {
        id: 'runtime-claim',
        source_type: 'local_validation',
        evidence_class: 'runtime_evidence',
        status: 'passed'
      },
      {
        id: 'final-rc-claim',
        source_type: 'committed_validation',
        evidence_class: 'final_rc_matrix_evidence',
        status: 'passed'
      }
    ]
  });

  assert.equal(report.evidence.p28ValidationEvidenceReader.acceptedCount, 0);
  assert.equal(report.evidence.p28ValidationEvidenceReader.rejectedCount, 2);
  assert.equal(
    report.evidence.p28ValidationEvidenceReader.rejectionSummary.reasonCounts.unsupported_source_class,
    2
  );
  assert.equal(report.evidence.p28ValidationEvidenceReader.gateReadiness.status, 'not_ready_no_explicit_evidence');
  assert.equal(report.evidence.p28ValidationEvidenceReader.confidencePosture.status, 'rejected_or_unsafe_signal');
  assert.equal(report.evidence.p28ValidationEvidenceReader.commandCoverage.runtimeEvidenceAccepted, false);
  assert.equal(report.evidence.p28ValidationEvidenceReader.commandCoverage.finalRcMatrixEvidenceAccepted, false);
  assert.equal(report.summary.validationEvidenceCanClaimV1RcReady, false);
});

test('validation evidence rejection summary counts rejected explicit input reasons without exposing raw input', () => {
  const report = buildV1RcValidationAggregatorReport({
    validationEvidenceSources: [
      null,
      {
        id: 'provider-side-effect',
        source_type: 'local_validation',
        status: 'passed',
        source_ref: 'manual-input',
        safety: { providerCalls: 1 }
      },
      {
        id: 'unsupported-kind',
        source_type: 'live_validation',
        status: 'passed',
        source_ref: 'manual-input'
      },
      {
        id: 'unsupported-status',
        source_type: 'local_validation',
        status: 'maybe',
        source_ref: 'manual-input'
      },
      {
        id: 'sensitive-summary',
        source_type: 'local_validation',
        status: 'passed',
        source_ref: 'manual-input',
        summary: 'authorization: should be rejected'
      }
    ]
  });
  const rejectionSummary = report.evidence.p28ValidationEvidenceReader.rejectionSummary;

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.summary.validationEvidenceRejectionStatus, 'all_inputs_rejected');
  assert.equal(report.summary.validationEvidenceRejectedCount, 5);
  assert.equal(rejectionSummary.status, 'all_inputs_rejected');
  assert.equal(rejectionSummary.rejectedCount, 5);
  assert.equal(rejectionSummary.acceptedCount, 0);
  assert.equal(rejectionSummary.reasonCounts.invalid_source_shape, 1);
  assert.equal(rejectionSummary.reasonCounts.side_effect_evidence_rejected, 1);
  assert.equal(rejectionSummary.reasonCounts.unsupported_source_type, 1);
  assert.equal(rejectionSummary.reasonCounts.unsupported_status, 1);
  assert.equal(rejectionSummary.reasonCounts.sensitive_fragment_rejected, 1);
  assert.equal(rejectionSummary.hasSensitiveRejection, true);
  assert.equal(rejectionSummary.hasSideEffectRejection, true);
  assert.equal(rejectionSummary.hasUnsupportedContractRejection, true);
  assert.equal(rejectionSummary.rawRejectedInputExposed, false);
  assert.equal(report.evidence.p28ValidationEvidenceReader.confidencePosture.status, 'rejected_or_unsafe_signal');
  assertNoSensitiveSurface(report);
});

test('validation evidence command coverage reports partial explicit command evidence without execution', () => {
  const freshObservedAt = new Date().toISOString();
  const report = buildV1RcValidationAggregatorReport({
    validationEvidenceSources: [
      {
        id: 'with-command',
        source_type: 'local_validation',
        status: 'passed',
        source_ref: 'tests/v1-rc-validation-aggregator-implementation.test.js',
        observed_at: freshObservedAt,
        commands: ['npm test'],
        safety: { mutated: false }
      },
      {
        id: 'without-command',
        source_type: 'local_validation',
        status: 'passed',
        source_ref: 'tests/v1-rc-validation-aggregator.test.js',
        observed_at: freshObservedAt,
        safety: { mutated: false }
      }
    ]
  });
  const coverage = report.evidence.p28ValidationEvidenceReader.commandCoverage;

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(coverage.status, 'command_coverage_partial');
  assert.equal(coverage.executesCommands, false);
  assert.equal(coverage.sourcesWithCommands, 1);
  assert.equal(coverage.sourcesWithoutCommands, 1);
  assert.equal(coverage.commandFamilies.npm, 1);
  assert.equal(coverage.allAcceptedHaveCommands, false);
  assert.equal(report.evidence.p28ValidationEvidenceReader.confidencePosture.status, 'partial_signal');
});

test('minimal implementation classifies A4, A5, runtime-required, and conditional live items', () => {
  const report = buildV1RcValidationAggregatorReport();

  assert.equal(report.checks.validationAggregatorExecutable.status, 'minimal_implemented');
  assert.equal(report.checks.schemaVersionRuntimeEnforcement.status, 'runtime_write_boundary_guard_added');
  assert.equal(report.checks.schemaVersionRuntimeEnforcement.a4Safe, true);
  assert.equal(report.checks.schemaVersionPolicyFixture.status, 'fixture_contract_added');
  assert.equal(report.checks.schemaVersionPolicyFixture.a4Safe, true);
  assert.equal(report.checks.schemaVersionPolicyHelper.status, 'helper_added_runtime_not_integrated');
  assert.equal(report.checks.schemaVersionPolicyHelper.a4Safe, true);
  assert.equal(report.checks.schemaVersionPolicyHelper.blocksV1Rc, undefined);
  assert.equal(report.checks.schemaVersionRuntimeBoundaryGuard.status, 'runtime_write_boundary_guard_added');
  assert.equal(report.checks.schemaVersionRuntimeBoundaryGuard.a4Safe, true);
  assert.equal(report.checks.schemaVersionRuntimeBoundaryGuard.blocksV1Rc, undefined);
  assert.equal(report.checks.schemaCompatibilityDryRunCli.status, 'fixture_only_cli_added');
  assert.equal(report.checks.schemaCompatibilityDryRunCli.a4Safe, true);
  assert.equal(report.checks.schemaCompatibilityDryRunCli.blocksV1Rc, undefined);
  assert.equal(report.checks.migrationImportExportDryRunGateCli.status, 'fixture_only_cli_added');
  assert.equal(report.checks.migrationImportExportDryRunGateCli.a4Safe, true);
  assert.equal(report.checks.migrationImportExportDryRunGateCli.blocksV1Rc, undefined);
  assert.equal(report.checks.migrationImportExportApprovalPacketCli.status, 'fixture_only_cli_added');
  assert.equal(report.checks.migrationImportExportApprovalPacketCli.a4Safe, true);
  assert.equal(report.checks.migrationImportExportApprovalPacketCli.blocksV1Rc, undefined);
  assert.equal(report.checks.finalRcValidationMatrixManifestHelper.status, 'helper_added_report_shape_only_not_executed');
  assert.equal(report.checks.finalRcValidationMatrixManifestHelper.a4Safe, true);
  assert.equal(report.checks.finalRcValidationMatrixManifestHelper.blocksV1Rc, undefined);
  assert.equal(report.checks.memoryGovernanceLifecycleContractHelper.status, 'helper_added_report_shape_only_not_executed');
  assert.equal(report.checks.memoryGovernanceLifecycleContractHelper.a4Safe, true);
  assert.equal(report.checks.memoryGovernanceLifecycleContractHelper.blocksV1Rc, undefined);
  assert.equal(report.checks.memoryGovernanceApprovalPacketContractHelper.status, 'helper_added_report_shape_only_not_executed');
  assert.equal(report.checks.memoryGovernanceApprovalPacketContractHelper.a4Safe, true);
  assert.equal(report.checks.memoryGovernanceApprovalPacketContractHelper.blocksV1Rc, undefined);
  assert.equal(report.checks.memoryGovernanceAuditEvidenceContractHelper.status, 'helper_added_report_shape_only_not_executed');
  assert.equal(report.checks.memoryGovernanceAuditEvidenceContractHelper.a4Safe, true);
  assert.equal(report.checks.memoryGovernanceAuditEvidenceContractHelper.blocksV1Rc, undefined);
  assert.equal(report.checks.memoryGovernanceReviewSurfaceContractHelper.status, 'helper_added_report_shape_only_not_executed');
  assert.equal(report.checks.memoryGovernanceReviewSurfaceContractHelper.a4Safe, true);
  assert.equal(report.checks.memoryGovernanceReviewSurfaceContractHelper.blocksV1Rc, undefined);
  assert.equal(report.checks.p36P40EvidenceSourceMap.status, 'static_report_shape_added_not_executed');
  assert.equal(report.checks.p36P40EvidenceSourceMap.a4Safe, true);
  assert.equal(report.checks.p36P40EvidenceSourceMap.blocksV1Rc, undefined);
  assert.equal(report.checks.p45FinalRcMatrixEvaluatorPosture.status, 'static_report_shape_added_not_executed');
  assert.equal(report.checks.p45FinalRcMatrixEvaluatorPosture.a4Safe, true);
  assert.equal(report.checks.p45FinalRcMatrixEvaluatorPosture.blocksV1Rc, undefined);
  assert.equal(report.checks.conditionalLiveMcpHttp.status, 'not_executed_service_not_running');
  assert.equal(report.runtime_required.includes('schemaVersionRuntimeEnforcement'), false);
  assert.equal(report.a5_gated.includes('providerExecution'), true);
  assert.equal(report.a4_safe.includes('gitHygiene'), true);
  assert.equal(report.a4_safe.includes('schemaVersionPolicyFixture'), true);
  assert.equal(report.a4_safe.includes('schemaVersionPolicyHelper'), true);
  assert.equal(report.a4_safe.includes('schemaVersionRuntimeBoundaryGuard'), true);
  assert.equal(report.a4_safe.includes('schemaCompatibilityDryRunCli'), true);
  assert.equal(report.a4_safe.includes('migrationImportExportDryRunGateCli'), true);
  assert.equal(report.a4_safe.includes('migrationImportExportApprovalPacketCli'), true);
  assert.equal(report.a4_safe.includes('finalRcValidationMatrixManifestHelper'), true);
  assert.equal(report.a4_safe.includes('memoryGovernanceLifecycleContractHelper'), true);
  assert.equal(report.a4_safe.includes('memoryGovernanceApprovalPacketContractHelper'), true);
  assert.equal(report.a4_safe.includes('memoryGovernanceAuditEvidenceContractHelper'), true);
  assert.equal(report.a4_safe.includes('memoryGovernanceReviewSurfaceContractHelper'), true);
  assert.equal(report.a4_safe.includes('p36P40EvidenceSourceMap'), true);
  assert.equal(report.a4_safe.includes('p45FinalRcMatrixEvaluatorPosture'), true);
  assert.equal(report.conditional_live.includes('health'), true);

  for (const key of [
    'migrationImportExportApply',
    'providerExecution',
    'startupWatchdog',
    'clientConfigSwitch',
    'productionDeploy',
    'pushTagReleaseDeploy'
  ]) {
    assert.equal(report.checks[key].status, 'blocked_pending_a5', key);
    assert.equal(report.checks[key].a5Gated, true, key);
  }
});

test('minimal implementation reports no side effects and no sensitive surfaces', () => {
  const report = buildV1RcValidationAggregatorReport();

  assert.equal(report.safety.mutated, false);
  assert.equal(report.safety.providerCalls, 0);
  assert.equal(report.safety.serviceStarted, false);
  assert.equal(report.safety.durableMemoryTouched, false);
  assert.equal(report.safety.realMemoryPreview, false);
  assert.equal(report.safety.packageChanged, false);
  assert.equal(report.safety.configChanged, false);
  assert.equal(report.safety.migrationApplied, false);
  assert.equal(report.safety.importExportApplied, false);
  assert.equal(report.safety.watchdogStartupInstalled, false);
  assert.equal(report.safety.pushed, false);
  assert.equal(report.safety.tagged, false);
  assert.equal(report.safety.released, false);
  assert.equal(report.safety.deployed, false);

  for (const key of report.forbiddenTopLevelKeys) {
    assert.equal(Object.hasOwn(report, key), false, key);
    assert.equal(hasNestedKey(report, key), false, key);
  }

  assertNoSensitiveSurface(report);
});

test('P44 evidence source map is static report-shape only and does not import or execute helpers', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'core', 'ValidationAggregatorService.js'), 'utf8');
  const report = buildV1RcValidationAggregatorReport();

  assert.equal(source.includes("require('node:fs')"), false);
  assert.equal(source.includes("require('fs')"), false);
  assert.equal(source.includes("require('node:child_process')"), false);
  assert.equal(source.includes("require('child_process')"), false);
  assert.equal(source.includes("require('./EvidenceManifestContract')"), false);
  assert.equal(source.includes("require('./RecallMigrationIsolationContract')"), false);
  assert.equal(source.includes("require('./FinalRcValidationMatrixManifest')"), false);
  assert.equal(source.includes("require('./FinalRcMatrixEvaluator')"), false);
  assert.equal(source.includes("require('./ValidationAggregatorBaselineBindingProofContract')"), false);
  assert.equal(/\breadFileSync\s*\(/.test(source), false);
  assert.equal(/\breaddirSync\s*\(/.test(source), false);
  assert.equal(/\bspawnSync\s*\(/.test(source), false);
  assert.equal(/\bexecFileSync\s*\(/.test(source), false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.readsFixtures, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.executesHelpers, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.executesGates, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.refreshesLiveMcp, false);
  assert.equal(report.evidence.p36P40EvidenceSourceMap.canClaimV1RcReady, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.evaluatorImportedByAggregator, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.evaluatorExecutedByAggregator, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.fixtureReadByAggregator, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.runnerExecutedByAggregator, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.canClaimFinalRcReady, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.canClaimV1RcReady, false);
  assert.equal(report.decision, 'NOT_READY_BLOCKED');
});

test('P44 report builder does not touch fs, network, child process, helpers, or runtime modules', () => {
  const originalLoad = Module._load;
  const originalFetch = globalThis.fetch;
  const blockedLoads = [
    'node:fs',
    'fs',
    'node:child_process',
    'child_process',
    'node:http',
    'http',
    'node:https',
    'https',
    './EvidenceManifestContract',
    './RecallMigrationIsolationContract',
    './FinalRcValidationMatrixManifest',
    './FinalRcMatrixEvaluator',
    './ValidationAggregatorBaselineBindingProofContract',
    './MemoryGovernanceLifecycleContract',
    './MemoryGovernanceApprovalPacketContract',
    './MemoryGovernanceAuditEvidenceContract',
    './MemoryGovernanceReviewSurfaceContract',
    '../storage/',
    './storage/',
    '../recall/',
    './recall/',
    '../adapters/',
    './Provider'
  ];

  Module._load = function patchedLoad(request, parent, isMain) {
    if (blockedLoads.some(blocked => request.includes(blocked))) {
      throw new Error(`unexpected P44 aggregator load: ${request}`);
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  globalThis.fetch = () => {
    throw new Error('unexpected P44 aggregator fetch');
  };

  try {
    const report = buildV1RcValidationAggregatorReport();
    assert.equal(report.evidence.p36P40EvidenceSourceMap.sourceMode, 'static_report_shape_only');
    assert.equal(report.evidence.p36P40EvidenceSourceMap.readsFixtures, false);
    assert.equal(report.evidence.p36P40EvidenceSourceMap.executesHelpers, false);
    assert.equal(report.evidence.p36P40EvidenceSourceMap.callsProviders, false);
    assert.equal(report.evidence.p36P40EvidenceSourceMap.refreshesLiveMcp, false);
    assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.sourceMode, 'static_report_shape_only');
    assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.evaluatorImportedByAggregator, false);
    assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.evaluatorExecutedByAggregator, false);
    assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.fixtureReadByAggregator, false);
    assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.callsProviders, false);
    assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.canClaimV1RcReady, false);
  } finally {
    Module._load = originalLoad;
    globalThis.fetch = originalFetch;
  }
});
