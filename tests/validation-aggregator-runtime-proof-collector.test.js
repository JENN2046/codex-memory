const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const test = require('node:test');

const {
  buildV1RcValidationAggregatorReport
} = require('../src/core/ValidationAggregatorService');
const {
  COLLECTOR_SCHEMA_VERSION,
  buildBaselineBindingProofInput,
  buildEvidenceFreshnessProofInput,
  buildGovernanceRuntimeLoopGapProofInput,
  buildMissingStaleEvidenceFailClosedProofInput,
  buildNoTouchBoundaryProofInput,
  buildRecallIsolationRuntimeProofInput,
  buildReadinessOverclaimRejectionProofInput,
  buildRuntimeEvidenceSummaryNormalizationProofInput,
  buildSourceRegistryProofInput,
  buildUnsupportedSourceFailClosedProofInput,
  collectValidationAggregatorRuntimeProofUnits
} = require('../src/core/ValidationAggregatorRuntimeProofCollector');

test('runtime proof collector waits for explicit inputs without claiming readiness', () => {
  const report = collectValidationAggregatorRuntimeProofUnits();

  assert.equal(report.schemaVersion, COLLECTOR_SCHEMA_VERSION);
  assert.equal(report.mode, 'read-only');
  assert.equal(report.sourceMode, 'explicit_input_only');
  assert.equal(report.implemented, true);
  assert.equal(report.fullImplementationComplete, false);
  assert.equal(report.status, 'runtime_proof_collector_waiting_for_explicit_evidence');
  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.summary.availableUnitCount, 10);
  assert.equal(report.summary.executedUnitCount, 0);
  assert.equal(report.summary.acceptedUnitCount, 0);
  assert.equal(report.summary.missingUnitCount, 10);
  assert.equal(report.units.sourceRegistryProof.status, 'not_supplied');
  assert.equal(report.units.evidenceFreshnessProof.status, 'not_supplied');
  assert.equal(report.units.baselineBindingProof.status, 'not_supplied');
  assert.equal(report.units.runtimeEvidenceSummaryNormalizationProof.status, 'not_supplied');
  assert.equal(report.units.missingStaleEvidenceFailClosedProof.status, 'not_supplied');
  assert.equal(report.units.unsupportedSourceFailClosedProof.status, 'not_supplied');
  assert.equal(report.units.noTouchBoundaryProof.status, 'not_supplied');
  assert.equal(report.units.readinessOverclaimRejectionProof.status, 'not_supplied');
  assert.equal(report.units.governanceRuntimeLoopGapProof.status, 'not_supplied');
  assert.equal(report.units.recallIsolationRuntimeProof.status, 'not_supplied');
  assert.equal(report.summary.validationAggregatorFullImplementation, false);
  assert.equal(report.summary.runtimeReady, false);
  assert.equal(report.summary.finalRcMatrixReady, false);
  assert.equal(report.summary.v1RcReady, false);
  assert.equal(report.summary.rcReady, false);
  assert.equal(report.safety.readsFiles, false);
  assert.equal(report.safety.executesCommands, false);
  assert.equal(report.safety.startsServices, false);
  assert.equal(report.safety.callsProviders, false);
  assert.equal(report.safety.readsRealMemory, false);
  assert.equal(report.safety.writesDurableState, false);
});

test('runtime proof collector executes source registry proof from explicit sanitized input only', () => {
  const report = collectValidationAggregatorRuntimeProofUnits({
    sourceRegistryProof: buildSourceRegistryProofInput()
  });

  assert.equal(report.status, 'runtime_proof_collector_partial_evidence_accepted_not_ready');
  assert.equal(report.summary.executedUnitCount, 1);
  assert.equal(report.summary.acceptedUnitCount, 1);
  assert.equal(report.summary.rejectedUnitCount, 0);
  assert.equal(report.summary.missingUnitCount, 9);
  assert.equal(report.summary.sourceRegistryProofAccepted, true);
  assert.equal(report.summary.evidenceFreshnessProofAccepted, false);
  assert.equal(report.summary.baselineBindingProofAccepted, false);
  assert.equal(report.summary.runtimeEvidenceSummaryNormalizationProofAccepted, false);
  assert.equal(report.summary.missingStaleEvidenceFailClosedProofAccepted, false);
  assert.equal(report.summary.unsupportedSourceFailClosedProofAccepted, false);
  assert.equal(report.summary.noTouchBoundaryProofAccepted, false);
  assert.equal(report.summary.readinessOverclaimRejectionProofAccepted, false);
  assert.equal(report.summary.governanceRuntimeLoopGapProofAccepted, false);
  assert.equal(report.units.sourceRegistryProof.executed, true);
  assert.equal(report.units.sourceRegistryProof.accepted, true);
  assert.equal(report.units.sourceRegistryProof.status, 'source_registry_proof_accepted_runtime_still_blocked');
  assert.equal(report.units.sourceRegistryProof.sourceRegistry.exact, true);
  assert.deepEqual(report.units.sourceRegistryProof.failClosedReasons, []);
  assert.equal(report.canClaimRuntimeReady, false);
  assert.equal(report.canClaimFinalRcReady, false);
  assert.equal(report.canClaimV1RcReady, false);
});

test('runtime proof collector executes evidence freshness proof from explicit sanitized input only', () => {
  const report = collectValidationAggregatorRuntimeProofUnits({
    evidenceFreshnessProof: buildEvidenceFreshnessProofInput()
  });

  assert.equal(report.status, 'runtime_proof_collector_partial_evidence_accepted_not_ready');
  assert.equal(report.summary.executedUnitCount, 1);
  assert.equal(report.summary.acceptedUnitCount, 1);
  assert.equal(report.summary.rejectedUnitCount, 0);
  assert.equal(report.summary.missingUnitCount, 9);
  assert.equal(report.summary.sourceRegistryProofAccepted, false);
  assert.equal(report.summary.evidenceFreshnessProofAccepted, true);
  assert.equal(report.summary.baselineBindingProofAccepted, false);
  assert.equal(report.summary.runtimeEvidenceSummaryNormalizationProofAccepted, false);
  assert.equal(report.summary.missingStaleEvidenceFailClosedProofAccepted, false);
  assert.equal(report.summary.unsupportedSourceFailClosedProofAccepted, false);
  assert.equal(report.summary.noTouchBoundaryProofAccepted, false);
  assert.equal(report.summary.readinessOverclaimRejectionProofAccepted, false);
  assert.equal(report.summary.governanceRuntimeLoopGapProofAccepted, false);
  assert.equal(report.units.evidenceFreshnessProof.executed, true);
  assert.equal(report.units.evidenceFreshnessProof.accepted, true);
  assert.equal(
    report.units.evidenceFreshnessProof.status,
    'evidence_freshness_proof_accepted_runtime_still_blocked'
  );
  assert.equal(report.units.evidenceFreshnessProof.evidenceFreshness.count, 1);
  assert.deepEqual(report.units.evidenceFreshnessProof.failClosedReasons, []);
  assert.equal(report.canClaimRuntimeReady, false);
  assert.equal(report.canClaimFinalRcReady, false);
  assert.equal(report.canClaimV1RcReady, false);
});

test('runtime proof collector executes baseline binding proof from explicit sanitized input only', () => {
  const report = collectValidationAggregatorRuntimeProofUnits({
    baselineBindingProof: buildBaselineBindingProofInput()
  });

  assert.equal(report.status, 'runtime_proof_collector_partial_evidence_accepted_not_ready');
  assert.equal(report.summary.executedUnitCount, 1);
  assert.equal(report.summary.acceptedUnitCount, 1);
  assert.equal(report.summary.rejectedUnitCount, 0);
  assert.equal(report.summary.missingUnitCount, 9);
  assert.equal(report.summary.sourceRegistryProofAccepted, false);
  assert.equal(report.summary.evidenceFreshnessProofAccepted, false);
  assert.equal(report.summary.baselineBindingProofAccepted, true);
  assert.equal(report.summary.runtimeEvidenceSummaryNormalizationProofAccepted, false);
  assert.equal(report.summary.missingStaleEvidenceFailClosedProofAccepted, false);
  assert.equal(report.summary.unsupportedSourceFailClosedProofAccepted, false);
  assert.equal(report.summary.noTouchBoundaryProofAccepted, false);
  assert.equal(report.summary.readinessOverclaimRejectionProofAccepted, false);
  assert.equal(report.summary.governanceRuntimeLoopGapProofAccepted, false);
  assert.equal(report.units.baselineBindingProof.executed, true);
  assert.equal(report.units.baselineBindingProof.accepted, true);
  assert.equal(
    report.units.baselineBindingProof.status,
    'baseline_binding_proof_accepted_runtime_still_blocked'
  );
  assert.equal(report.units.baselineBindingProof.baselineBinding.count, 1);
  assert.deepEqual(report.units.baselineBindingProof.failClosedReasons, []);
  assert.equal(report.canClaimRuntimeReady, false);
  assert.equal(report.canClaimFinalRcReady, false);
  assert.equal(report.canClaimV1RcReady, false);
});

test('runtime proof collector executes runtime evidence summary normalization proof from explicit sanitized input only', () => {
  const report = collectValidationAggregatorRuntimeProofUnits({
    runtimeEvidenceSummaryNormalizationProof:
      buildRuntimeEvidenceSummaryNormalizationProofInput()
  });

  assert.equal(report.status, 'runtime_proof_collector_partial_evidence_accepted_not_ready');
  assert.equal(report.summary.executedUnitCount, 1);
  assert.equal(report.summary.acceptedUnitCount, 1);
  assert.equal(report.summary.rejectedUnitCount, 0);
  assert.equal(report.summary.missingUnitCount, 9);
  assert.equal(report.summary.sourceRegistryProofAccepted, false);
  assert.equal(report.summary.evidenceFreshnessProofAccepted, false);
  assert.equal(report.summary.baselineBindingProofAccepted, false);
  assert.equal(report.summary.runtimeEvidenceSummaryNormalizationProofAccepted, true);
  assert.equal(report.summary.missingStaleEvidenceFailClosedProofAccepted, false);
  assert.equal(report.summary.unsupportedSourceFailClosedProofAccepted, false);
  assert.equal(report.summary.noTouchBoundaryProofAccepted, false);
  assert.equal(report.summary.readinessOverclaimRejectionProofAccepted, false);
  assert.equal(report.summary.governanceRuntimeLoopGapProofAccepted, false);
  assert.equal(report.units.runtimeEvidenceSummaryNormalizationProof.executed, true);
  assert.equal(report.units.runtimeEvidenceSummaryNormalizationProof.accepted, true);
  assert.equal(
    report.units.runtimeEvidenceSummaryNormalizationProof.status,
    'runtime_evidence_summary_normalization_accepted_runtime_still_blocked'
  );
  assert.equal(
    report.units.runtimeEvidenceSummaryNormalizationProof.runtimeEvidenceSummary.remainingRuntimeGapCount,
    7
  );
  assert.deepEqual(
    report.units.runtimeEvidenceSummaryNormalizationProof.failClosedReasons,
    []
  );
  assert.equal(report.canClaimRuntimeReady, false);
  assert.equal(report.canClaimFinalRcReady, false);
  assert.equal(report.canClaimV1RcReady, false);
});

test('runtime proof collector executes missing stale evidence fail-closed proof from explicit sanitized input only', () => {
  const report = collectValidationAggregatorRuntimeProofUnits({
    missingStaleEvidenceFailClosedProof:
      buildMissingStaleEvidenceFailClosedProofInput()
  });

  assert.equal(report.status, 'runtime_proof_collector_partial_evidence_accepted_not_ready');
  assert.equal(report.summary.executedUnitCount, 1);
  assert.equal(report.summary.acceptedUnitCount, 1);
  assert.equal(report.summary.rejectedUnitCount, 0);
  assert.equal(report.summary.missingUnitCount, 9);
  assert.equal(report.summary.sourceRegistryProofAccepted, false);
  assert.equal(report.summary.evidenceFreshnessProofAccepted, false);
  assert.equal(report.summary.baselineBindingProofAccepted, false);
  assert.equal(report.summary.runtimeEvidenceSummaryNormalizationProofAccepted, false);
  assert.equal(report.summary.missingStaleEvidenceFailClosedProofAccepted, true);
  assert.equal(report.summary.unsupportedSourceFailClosedProofAccepted, false);
  assert.equal(report.summary.noTouchBoundaryProofAccepted, false);
  assert.equal(report.summary.readinessOverclaimRejectionProofAccepted, false);
  assert.equal(report.summary.governanceRuntimeLoopGapProofAccepted, false);
  assert.equal(report.units.missingStaleEvidenceFailClosedProof.executed, true);
  assert.equal(report.units.missingStaleEvidenceFailClosedProof.accepted, true);
  assert.equal(
    report.units.missingStaleEvidenceFailClosedProof.status,
    'missing_or_stale_evidence_fail_closed_proof_accepted_runtime_still_blocked'
  );
  assert.equal(
    report.units.missingStaleEvidenceFailClosedProof.summary.requiredEvidenceGroupCount,
    8
  );
  assert.deepEqual(report.units.missingStaleEvidenceFailClosedProof.failClosedReasons, []);
  assert.equal(report.canClaimRuntimeReady, false);
  assert.equal(report.canClaimFinalRcReady, false);
  assert.equal(report.canClaimV1RcReady, false);
});

test('runtime proof collector executes unsupported source fail-closed proof from explicit sanitized input only', () => {
  const report = collectValidationAggregatorRuntimeProofUnits({
    unsupportedSourceFailClosedProof:
      buildUnsupportedSourceFailClosedProofInput()
  });

  assert.equal(report.status, 'runtime_proof_collector_partial_evidence_accepted_not_ready');
  assert.equal(report.summary.executedUnitCount, 1);
  assert.equal(report.summary.acceptedUnitCount, 1);
  assert.equal(report.summary.rejectedUnitCount, 0);
  assert.equal(report.summary.missingUnitCount, 9);
  assert.equal(report.summary.sourceRegistryProofAccepted, false);
  assert.equal(report.summary.evidenceFreshnessProofAccepted, false);
  assert.equal(report.summary.baselineBindingProofAccepted, false);
  assert.equal(report.summary.runtimeEvidenceSummaryNormalizationProofAccepted, false);
  assert.equal(report.summary.missingStaleEvidenceFailClosedProofAccepted, false);
  assert.equal(report.summary.unsupportedSourceFailClosedProofAccepted, true);
  assert.equal(report.summary.noTouchBoundaryProofAccepted, false);
  assert.equal(report.summary.readinessOverclaimRejectionProofAccepted, false);
  assert.equal(report.summary.governanceRuntimeLoopGapProofAccepted, false);
  assert.equal(report.units.unsupportedSourceFailClosedProof.executed, true);
  assert.equal(report.units.unsupportedSourceFailClosedProof.accepted, true);
  assert.equal(
    report.units.unsupportedSourceFailClosedProof.status,
    'unsupported_source_fail_closed_proof_accepted_runtime_still_blocked'
  );
  assert.equal(
    report.units.unsupportedSourceFailClosedProof.summary.requiredFailClosedCaseCount,
    11
  );
  assert.deepEqual(report.units.unsupportedSourceFailClosedProof.failClosedReasons, []);
  assert.equal(report.canClaimRuntimeReady, false);
  assert.equal(report.canClaimFinalRcReady, false);
  assert.equal(report.canClaimV1RcReady, false);
});

test('runtime proof collector executes no-touch boundary proof from explicit sanitized input only', () => {
  const report = collectValidationAggregatorRuntimeProofUnits({
    noTouchBoundaryProof: buildNoTouchBoundaryProofInput()
  });

  assert.equal(report.status, 'runtime_proof_collector_partial_evidence_accepted_not_ready');
  assert.equal(report.summary.executedUnitCount, 1);
  assert.equal(report.summary.acceptedUnitCount, 1);
  assert.equal(report.summary.rejectedUnitCount, 0);
  assert.equal(report.summary.missingUnitCount, 9);
  assert.equal(report.summary.sourceRegistryProofAccepted, false);
  assert.equal(report.summary.evidenceFreshnessProofAccepted, false);
  assert.equal(report.summary.baselineBindingProofAccepted, false);
  assert.equal(report.summary.runtimeEvidenceSummaryNormalizationProofAccepted, false);
  assert.equal(report.summary.missingStaleEvidenceFailClosedProofAccepted, false);
  assert.equal(report.summary.unsupportedSourceFailClosedProofAccepted, false);
  assert.equal(report.summary.noTouchBoundaryProofAccepted, true);
  assert.equal(report.summary.readinessOverclaimRejectionProofAccepted, false);
  assert.equal(report.summary.governanceRuntimeLoopGapProofAccepted, false);
  assert.equal(report.units.noTouchBoundaryProof.executed, true);
  assert.equal(report.units.noTouchBoundaryProof.accepted, true);
  assert.equal(
    report.units.noTouchBoundaryProof.status,
    'no_touch_boundary_proof_accepted_runtime_still_blocked'
  );
  assert.equal(
    report.units.noTouchBoundaryProof.summary.requiredFailClosedCaseCount,
    16
  );
  assert.deepEqual(report.units.noTouchBoundaryProof.failClosedReasons, []);
  assert.equal(report.units.noTouchBoundaryProof.summary.sourceScannedAtRuntime, false);
  assert.equal(report.canClaimRuntimeReady, false);
  assert.equal(report.canClaimFinalRcReady, false);
  assert.equal(report.canClaimV1RcReady, false);
});

test('runtime proof collector executes readiness overclaim rejection proof from explicit sanitized input only', () => {
  const report = collectValidationAggregatorRuntimeProofUnits({
    readinessOverclaimRejectionProof:
      buildReadinessOverclaimRejectionProofInput()
  });

  assert.equal(report.status, 'runtime_proof_collector_partial_evidence_accepted_not_ready');
  assert.equal(report.summary.executedUnitCount, 1);
  assert.equal(report.summary.acceptedUnitCount, 1);
  assert.equal(report.summary.rejectedUnitCount, 0);
  assert.equal(report.summary.missingUnitCount, 9);
  assert.equal(report.summary.sourceRegistryProofAccepted, false);
  assert.equal(report.summary.evidenceFreshnessProofAccepted, false);
  assert.equal(report.summary.baselineBindingProofAccepted, false);
  assert.equal(report.summary.runtimeEvidenceSummaryNormalizationProofAccepted, false);
  assert.equal(report.summary.missingStaleEvidenceFailClosedProofAccepted, false);
  assert.equal(report.summary.unsupportedSourceFailClosedProofAccepted, false);
  assert.equal(report.summary.noTouchBoundaryProofAccepted, false);
  assert.equal(report.summary.readinessOverclaimRejectionProofAccepted, true);
  assert.equal(report.summary.governanceRuntimeLoopGapProofAccepted, false);
  assert.equal(report.units.readinessOverclaimRejectionProof.executed, true);
  assert.equal(report.units.readinessOverclaimRejectionProof.accepted, true);
  assert.equal(
    report.units.readinessOverclaimRejectionProof.status,
    'readiness_overclaim_rejection_proof_accepted_runtime_still_blocked'
  );
  assert.equal(
    report.units.readinessOverclaimRejectionProof.summary.requiredFailClosedCaseCount,
    18
  );
  assert.deepEqual(report.units.readinessOverclaimRejectionProof.failClosedReasons, []);
  assert.equal(report.units.readinessOverclaimRejectionProof.summary.runtimeGapCount, 7);
  assert.equal(report.canClaimRuntimeReady, false);
  assert.equal(report.canClaimFinalRcReady, false);
  assert.equal(report.canClaimV1RcReady, false);
});

test('runtime proof collector executes governance runtime loop gap proof from explicit sanitized input only', () => {
  const report = collectValidationAggregatorRuntimeProofUnits({
    governanceRuntimeLoopGapProof:
      buildGovernanceRuntimeLoopGapProofInput()
  });

  assert.equal(report.status, 'runtime_proof_collector_partial_evidence_accepted_not_ready');
  assert.equal(report.summary.executedUnitCount, 1);
  assert.equal(report.summary.acceptedUnitCount, 1);
  assert.equal(report.summary.rejectedUnitCount, 0);
  assert.equal(report.summary.missingUnitCount, 9);
  assert.equal(report.summary.sourceRegistryProofAccepted, false);
  assert.equal(report.summary.evidenceFreshnessProofAccepted, false);
  assert.equal(report.summary.baselineBindingProofAccepted, false);
  assert.equal(report.summary.runtimeEvidenceSummaryNormalizationProofAccepted, false);
  assert.equal(report.summary.missingStaleEvidenceFailClosedProofAccepted, false);
  assert.equal(report.summary.unsupportedSourceFailClosedProofAccepted, false);
  assert.equal(report.summary.noTouchBoundaryProofAccepted, false);
  assert.equal(report.summary.readinessOverclaimRejectionProofAccepted, false);
  assert.equal(report.summary.governanceRuntimeLoopGapProofAccepted, true);
  assert.equal(report.units.governanceRuntimeLoopGapProof.executed, true);
  assert.equal(report.units.governanceRuntimeLoopGapProof.accepted, true);
  assert.equal(
    report.units.governanceRuntimeLoopGapProof.status,
    'governance_runtime_loop_acceptance_contract_accepted_runtime_still_blocked'
  );
  assert.equal(
    report.units.governanceRuntimeLoopGapProof.summary.requiredRuntimeEvidenceGroupCount,
    8
  );
  assert.equal(report.units.governanceRuntimeLoopGapProof.summary.noRuntimeLoopExecution, true);
  assert.deepEqual(report.units.governanceRuntimeLoopGapProof.failClosedReasons, []);
  assert.equal(report.canClaimRuntimeReady, false);
  assert.equal(report.canClaimFinalRcReady, false);
  assert.equal(report.canClaimV1RcReady, false);
});

test('runtime proof collector executes recall isolation runtime proof from explicit sanitized input only', () => {
  const report = collectValidationAggregatorRuntimeProofUnits({
    recallIsolationRuntimeProof:
      buildRecallIsolationRuntimeProofInput()
  });

  assert.equal(report.status, 'runtime_proof_collector_partial_evidence_accepted_not_ready');
  assert.equal(report.summary.executedUnitCount, 1);
  assert.equal(report.summary.acceptedUnitCount, 1);
  assert.equal(report.summary.rejectedUnitCount, 0);
  assert.equal(report.summary.missingUnitCount, 9);
  assert.equal(report.summary.sourceRegistryProofAccepted, false);
  assert.equal(report.summary.evidenceFreshnessProofAccepted, false);
  assert.equal(report.summary.baselineBindingProofAccepted, false);
  assert.equal(report.summary.runtimeEvidenceSummaryNormalizationProofAccepted, false);
  assert.equal(report.summary.missingStaleEvidenceFailClosedProofAccepted, false);
  assert.equal(report.summary.unsupportedSourceFailClosedProofAccepted, false);
  assert.equal(report.summary.noTouchBoundaryProofAccepted, false);
  assert.equal(report.summary.readinessOverclaimRejectionProofAccepted, false);
  assert.equal(report.summary.governanceRuntimeLoopGapProofAccepted, false);
  assert.equal(report.summary.recallIsolationRuntimeProofAccepted, true);
  assert.equal(report.units.recallIsolationRuntimeProof.executed, true);
  assert.equal(report.units.recallIsolationRuntimeProof.accepted, true);
  assert.equal(
    report.units.recallIsolationRuntimeProof.status,
    'recall_isolation_acceptance_contract_accepted_runtime_still_blocked'
  );
  assert.equal(
    report.units.recallIsolationRuntimeProof.summary.requiredRuntimeEvidenceGroupCount,
    13
  );
  assert.equal(report.units.recallIsolationRuntimeProof.summary.noRuntimeProofExecution, true);
  assert.deepEqual(report.units.recallIsolationRuntimeProof.failClosedReasons, []);
  assert.equal(report.canClaimRuntimeReady, false);
  assert.equal(report.canClaimFinalRcReady, false);
  assert.equal(report.canClaimV1RcReady, false);
});

test('runtime proof collector aggregates accepted explicit source registry freshness baseline summary missing-stale unsupported-source no-touch overclaim governance and recall isolation units', () => {
  const report = collectValidationAggregatorRuntimeProofUnits({
    sourceRegistryProof: buildSourceRegistryProofInput(),
    evidenceFreshnessProof: buildEvidenceFreshnessProofInput(),
    baselineBindingProof: buildBaselineBindingProofInput(),
    runtimeEvidenceSummaryNormalizationProof:
      buildRuntimeEvidenceSummaryNormalizationProofInput(),
    missingStaleEvidenceFailClosedProof:
      buildMissingStaleEvidenceFailClosedProofInput(),
    unsupportedSourceFailClosedProof:
      buildUnsupportedSourceFailClosedProofInput(),
    noTouchBoundaryProof: buildNoTouchBoundaryProofInput(),
    readinessOverclaimRejectionProof:
      buildReadinessOverclaimRejectionProofInput(),
    governanceRuntimeLoopGapProof:
      buildGovernanceRuntimeLoopGapProofInput(),
    recallIsolationRuntimeProof:
      buildRecallIsolationRuntimeProofInput()
  });

  assert.equal(report.summary.availableUnitCount, 10);
  assert.equal(report.summary.executedUnitCount, 10);
  assert.equal(report.summary.acceptedUnitCount, 10);
  assert.equal(report.summary.rejectedUnitCount, 0);
  assert.equal(report.summary.missingUnitCount, 0);
  assert.equal(report.summary.sourceRegistryProofAccepted, true);
  assert.equal(report.summary.evidenceFreshnessProofAccepted, true);
  assert.equal(report.summary.baselineBindingProofAccepted, true);
  assert.equal(report.summary.runtimeEvidenceSummaryNormalizationProofAccepted, true);
  assert.equal(report.summary.missingStaleEvidenceFailClosedProofAccepted, true);
  assert.equal(report.summary.unsupportedSourceFailClosedProofAccepted, true);
  assert.equal(report.summary.noTouchBoundaryProofAccepted, true);
  assert.equal(report.summary.readinessOverclaimRejectionProofAccepted, true);
  assert.equal(report.summary.governanceRuntimeLoopGapProofAccepted, true);
  assert.equal(report.summary.recallIsolationRuntimeProofAccepted, true);
  assert.equal(report.summary.validationAggregatorFullImplementation, false);
  assert.equal(report.summary.runtimeReady, false);
  assert.equal(report.summary.v1RcReady, false);
});

test('runtime proof collector fails closed when no-touch proof accepts an unsafe case', () => {
  const noTouchInput = buildNoTouchBoundaryProofInput();
  const report = collectValidationAggregatorRuntimeProofUnits({
    noTouchBoundaryProof: buildNoTouchBoundaryProofInput({
      failClosedCases: noTouchInput.failClosedCases.map(item =>
        item.id === 'unsafe_import_detected'
          ? { ...item, accepted: true }
          : item
      )
    })
  });

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.summary.executedUnitCount, 1);
  assert.equal(report.summary.acceptedUnitCount, 0);
  assert.equal(report.summary.rejectedUnitCount, 1);
  assert.equal(report.units.noTouchBoundaryProof.accepted, false);
  assert.equal(
    report.units.noTouchBoundaryProof.failClosedReasons.includes(
      'unsafe_case_not_blocked'
    ),
    true
  );
  assert.deepEqual(
    report.units.noTouchBoundaryProof.unsafeCasesNotBlocked,
    ['unsafe_import_detected']
  );
  assert.equal(report.summary.validationAggregatorFullImplementation, false);
  assert.equal(report.summary.v1RcReady, false);
});

test('runtime proof collector fails closed when readiness overclaim input accepts rc-ready', () => {
  const overclaimInput = buildReadinessOverclaimRejectionProofInput();
  const report = collectValidationAggregatorRuntimeProofUnits({
    readinessOverclaimRejectionProof:
      buildReadinessOverclaimRejectionProofInput({
        readinessClaims: overclaimInput.readinessClaims.map(item =>
          item.id === 'rc-ready'
            ? { ...item, allowed: true }
            : item
        )
      })
  });

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.summary.executedUnitCount, 1);
  assert.equal(report.summary.acceptedUnitCount, 0);
  assert.equal(report.summary.rejectedUnitCount, 1);
  assert.equal(report.units.readinessOverclaimRejectionProof.accepted, false);
  assert.equal(
    report.units.readinessOverclaimRejectionProof.failClosedReasons.includes(
      'readiness_claim_not_rejected'
    ),
    true
  );
  assert.deepEqual(
    report.units.readinessOverclaimRejectionProof.readinessClaimsNotRejected,
    ['rc-ready']
  );
  assert.equal(report.summary.validationAggregatorFullImplementation, false);
  assert.equal(report.summary.v1RcReady, false);
});

test('runtime proof collector fails closed when governance loop stage allows execution', () => {
  const governanceInput = buildGovernanceRuntimeLoopGapProofInput();
  const report = collectValidationAggregatorRuntimeProofUnits({
    governanceRuntimeLoopGapProof:
      buildGovernanceRuntimeLoopGapProofInput({
        stageAcceptanceCases: governanceInput.stageAcceptanceCases.map(item =>
          item.id === 'execution_gate_evaluation'
            ? { ...item, canExecute: true }
            : item
        )
      })
  });

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.summary.executedUnitCount, 1);
  assert.equal(report.summary.acceptedUnitCount, 0);
  assert.equal(report.summary.rejectedUnitCount, 1);
  assert.equal(report.units.governanceRuntimeLoopGapProof.accepted, false);
  assert.equal(
    report.units.governanceRuntimeLoopGapProof.failClosedReasons.includes(
      'stage_allows_execution'
    ),
    true
  );
  assert.deepEqual(
    report.units.governanceRuntimeLoopGapProof.stagesAllowingExecution,
    ['execution_gate_evaluation']
  );
  assert.equal(report.summary.validationAggregatorFullImplementation, false);
  assert.equal(report.summary.v1RcReady, false);
});

test('runtime proof collector fails closed when recall isolation runtime evidence is present', () => {
  const recallIsolationInput = buildRecallIsolationRuntimeProofInput();
  const report = collectValidationAggregatorRuntimeProofUnits({
    recallIsolationRuntimeProof:
      buildRecallIsolationRuntimeProofInput({
        requiredRuntimeEvidenceGroups: recallIsolationInput.requiredRuntimeEvidenceGroups.map(item =>
          item.id === 'vector_exclusion_assertions'
            ? { ...item, currentStatus: 'present' }
            : item
        )
      })
  });

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.summary.executedUnitCount, 1);
  assert.equal(report.summary.acceptedUnitCount, 0);
  assert.equal(report.summary.rejectedUnitCount, 1);
  assert.equal(report.units.recallIsolationRuntimeProof.accepted, false);
  assert.equal(
    report.units.recallIsolationRuntimeProof.failClosedReasons.includes(
      'runtime_evidence_not_missing'
    ),
    true
  );
  assert.deepEqual(
    report.units.recallIsolationRuntimeProof.runtimeEvidenceNotMissing,
    ['vector_exclusion_assertions']
  );
  assert.equal(report.summary.validationAggregatorFullImplementation, false);
  assert.equal(report.summary.v1RcReady, false);
});

test('runtime proof collector fails closed when unsupported source input accepts a blocked source', () => {
  const unsupportedInput = buildUnsupportedSourceFailClosedProofInput();
  const report = collectValidationAggregatorRuntimeProofUnits({
    unsupportedSourceFailClosedProof:
      buildUnsupportedSourceFailClosedProofInput({
        failClosedCases: unsupportedInput.failClosedCases.map(item =>
          item.id === 'unsupported_source_type'
            ? { ...item, accepted: true }
            : item
        )
      })
  });

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.summary.executedUnitCount, 1);
  assert.equal(report.summary.acceptedUnitCount, 0);
  assert.equal(report.summary.rejectedUnitCount, 1);
  assert.equal(report.units.unsupportedSourceFailClosedProof.accepted, false);
  assert.equal(
    report.units.unsupportedSourceFailClosedProof.failClosedReasons.includes(
      'unsupported_source_accepted'
    ),
    true
  );
  assert.deepEqual(
    report.units.unsupportedSourceFailClosedProof.acceptedUnsupportedCases,
    ['unsupported_source_type']
  );
  assert.equal(report.summary.validationAggregatorFullImplementation, false);
  assert.equal(report.summary.v1RcReady, false);
});

test('runtime proof collector fails closed for missing required evidence group input', () => {
  const report = collectValidationAggregatorRuntimeProofUnits({
    missingStaleEvidenceFailClosedProof:
      buildMissingStaleEvidenceFailClosedProofInput({
        providedEvidenceGroups: [
          'source_registry_exact_set_proof',
          'evidence_freshness_proof',
          'baseline_binding_proof'
        ]
      })
  });

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.summary.executedUnitCount, 1);
  assert.equal(report.summary.acceptedUnitCount, 0);
  assert.equal(report.summary.rejectedUnitCount, 1);
  assert.equal(report.units.missingStaleEvidenceFailClosedProof.accepted, false);
  assert.equal(
    report.units.missingStaleEvidenceFailClosedProof.failClosedReasons.includes(
      'missing_required_evidence_group'
    ),
    true
  );
  assert.equal(
    report.units.missingStaleEvidenceFailClosedProof.summary.inferredMissingEvidence,
    false
  );
  assert.equal(report.summary.validationAggregatorFullImplementation, false);
  assert.equal(report.summary.v1RcReady, false);
});

test('runtime proof collector fails closed for unsafe runtime summary proof input', () => {
  const report = collectValidationAggregatorRuntimeProofUnits({
    runtimeEvidenceSummaryNormalizationProof:
      buildRuntimeEvidenceSummaryNormalizationProofInput({
        runtimeEvidenceSummary: {
          ...buildRuntimeEvidenceSummaryNormalizationProofInput().runtimeEvidenceSummary,
          safety: {
            ...buildRuntimeEvidenceSummaryNormalizationProofInput().runtimeEvidenceSummary.safety,
            providerCalls: 1
          }
        }
      })
  });

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.summary.executedUnitCount, 1);
  assert.equal(report.summary.acceptedUnitCount, 0);
  assert.equal(report.summary.rejectedUnitCount, 1);
  assert.equal(report.units.runtimeEvidenceSummaryNormalizationProof.accepted, false);
  assert.equal(
    report.units.runtimeEvidenceSummaryNormalizationProof.failClosedReasons.includes(
      'unsafe_summary_rejected'
    ),
    true
  );
  assert.equal(report.summary.validationAggregatorFullImplementation, false);
  assert.equal(report.summary.v1RcReady, false);
});

test('runtime proof collector fails closed for unsafe source registry proof input', () => {
  const report = collectValidationAggregatorRuntimeProofUnits({
    sourceRegistryProof: buildSourceRegistryProofInput({
      safety: {
        readsFiles: false,
        scansDirectories: false,
        executesCommands: false,
        startsServices: false,
        callsProviders: true,
        readsRealMemory: false,
        scansRuntimeStores: false,
        writesDurableState: false,
        expandsPublicMcp: false,
        remoteWrites: false,
        rawSensitiveOutputExposed: false
      }
    })
  });

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.status, 'runtime_proof_collector_waiting_for_explicit_evidence');
  assert.equal(report.summary.executedUnitCount, 1);
  assert.equal(report.summary.acceptedUnitCount, 0);
  assert.equal(report.summary.rejectedUnitCount, 1);
  assert.equal(report.units.sourceRegistryProof.accepted, false);
  assert.equal(
    report.units.sourceRegistryProof.failClosedReasons.includes('unsafe_no_touch_boundary'),
    true
  );
  assert.equal(report.summary.validationAggregatorFullImplementation, false);
  assert.equal(report.summary.v1RcReady, false);
});

test('runtime proof collector fails closed for stale evidence freshness proof input', () => {
  const report = collectValidationAggregatorRuntimeProofUnits({
    evidenceFreshnessProof: buildEvidenceFreshnessProofInput({
      asOf: '2026-05-20T00:00:00.000Z',
      evidenceRecords: [
        {
          evidence_id: 'stale-validation-evidence',
          source_id: 'stale_source',
          source_kind: 'local_safe_collector_unit',
          source_registry_version: 'validation-aggregator-source-registry-v1',
          baseline_commit: '0000000000000000000000000000000000000000',
          evidence_generated_at: '2026-05-01T00:00:00.000Z',
          evidence_validated_at: '2026-05-01T00:00:00.000Z',
          evidence_observed_hash:
            '1111111111111111111111111111111111111111111111111111111111111111',
          validation_status: 'passed',
          validation_ref: 'tests/validation-aggregator-runtime-proof-collector.test.js'
        }
      ]
    })
  });

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.summary.executedUnitCount, 1);
  assert.equal(report.summary.acceptedUnitCount, 0);
  assert.equal(report.summary.rejectedUnitCount, 1);
  assert.equal(report.units.evidenceFreshnessProof.accepted, false);
  assert.equal(
    report.units.evidenceFreshnessProof.failClosedReasons.includes('expired_freshness_window'),
    true
  );
  assert.equal(report.summary.validationAggregatorFullImplementation, false);
  assert.equal(report.summary.v1RcReady, false);
});

test('runtime proof collector fails closed for unsafe baseline binding proof input', () => {
  const report = collectValidationAggregatorRuntimeProofUnits({
    baselineBindingProof: buildBaselineBindingProofInput({
      safety: {
        readsFiles: false,
        scansDirectories: false,
        executesCommands: false,
        gitCheckout: false,
        gitReset: false,
        gitDetachHead: false,
        gitRemoteLookup: true,
        startsServices: false,
        callsProviders: false,
        readsRealMemory: false,
        scansRuntimeStores: false,
        writesDurableState: false,
        expandsPublicMcp: false,
        remoteWrites: false,
        rawSensitiveOutputExposed: false
      }
    })
  });

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.summary.executedUnitCount, 1);
  assert.equal(report.summary.acceptedUnitCount, 0);
  assert.equal(report.summary.rejectedUnitCount, 1);
  assert.equal(report.units.baselineBindingProof.accepted, false);
  assert.equal(
    report.units.baselineBindingProof.failClosedReasons.includes('unsafe_no_touch_boundary'),
    true
  );
  assert.equal(report.summary.validationAggregatorFullImplementation, false);
  assert.equal(report.summary.v1RcReady, false);
});

test('ValidationAggregator report surfaces runtime proof collector without readiness claim', () => {
  const report = buildV1RcValidationAggregatorReport({
    generatedAt: '2026-05-20T00:00:00.000Z',
    runtimeProofInputs: {
      sourceRegistryProof: buildSourceRegistryProofInput(),
      evidenceFreshnessProof: buildEvidenceFreshnessProofInput(),
      baselineBindingProof: buildBaselineBindingProofInput(),
      runtimeEvidenceSummaryNormalizationProof:
        buildRuntimeEvidenceSummaryNormalizationProofInput(),
      missingStaleEvidenceFailClosedProof:
        buildMissingStaleEvidenceFailClosedProofInput(),
      unsupportedSourceFailClosedProof:
        buildUnsupportedSourceFailClosedProofInput(),
      noTouchBoundaryProof: buildNoTouchBoundaryProofInput(),
      readinessOverclaimRejectionProof:
        buildReadinessOverclaimRejectionProofInput(),
      governanceRuntimeLoopGapProof:
        buildGovernanceRuntimeLoopGapProofInput(),
      recallIsolationRuntimeProof:
        buildRecallIsolationRuntimeProofInput()
    }
  });

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.summary.validationAggregatorFullImplementation, false);
  assert.equal(report.summary.validationAggregatorRuntimeProofCollectorImplemented, true);
  assert.equal(
    report.summary.validationAggregatorRuntimeProofCollectorStatus,
    'runtime_proof_collector_partial_evidence_accepted_not_ready'
  );
  assert.equal(report.summary.validationAggregatorRuntimeProofCollectorAcceptedUnitCount, 10);
  assert.equal(report.summary.validationAggregatorRuntimeProofCollectorExecutedUnitCount, 10);
  assert.equal(report.summary.validationAggregatorRuntimeProofCollectorCanClaimV1RcReady, false);
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeProofCollector.units.sourceRegistryProof.accepted,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeProofCollector.units.evidenceFreshnessProof.accepted,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeProofCollector.units.baselineBindingProof.accepted,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeProofCollector.units
      .runtimeEvidenceSummaryNormalizationProof.accepted,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeProofCollector.units
      .missingStaleEvidenceFailClosedProof.accepted,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeProofCollector.units
      .unsupportedSourceFailClosedProof.accepted,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeProofCollector.units
      .noTouchBoundaryProof.accepted,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeProofCollector.units
      .readinessOverclaimRejectionProof.accepted,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeProofCollector.units
      .governanceRuntimeLoopGapProof.accepted,
    true
  );
  assert.equal(
    report.evidence.p66ValidationAggregatorRuntimeProofCollector.units
      .recallIsolationRuntimeProof.accepted,
    true
  );
  assert.equal(report.summary.runtimeReady, false);
  assert.equal(report.summary.finalRcMatrixReady, false);
  assert.equal(report.summary.rcReady, false);
  assert.equal(report.safety.mutated, false);
  assert.equal(report.safety.providerCalls, 0);
  assert.equal(report.safety.serviceStarted, false);
  assert.equal(report.safety.durableMemoryTouched, false);
});

test('runtime proof collector does not perform fs, command, provider, or runtime-store actions', () => {
  const originalReadFileSync = fs.readFileSync;
  const originalReaddirSync = fs.readdirSync;
  const originalExecSync = childProcess.execSync;
  const originalExecFileSync = childProcess.execFileSync;
  const originalSpawnSync = childProcess.spawnSync;

  fs.readFileSync = () => {
    throw new Error('unexpected fs read during runtime proof collector');
  };
  fs.readdirSync = () => {
    throw new Error('unexpected directory scan during runtime proof collector');
  };
  childProcess.execSync = () => {
    throw new Error('unexpected command execution during runtime proof collector');
  };
  childProcess.execFileSync = () => {
    throw new Error('unexpected command execution during runtime proof collector');
  };
  childProcess.spawnSync = () => {
    throw new Error('unexpected command execution during runtime proof collector');
  };

  try {
    const report = collectValidationAggregatorRuntimeProofUnits({
      sourceRegistryProof: buildSourceRegistryProofInput(),
      evidenceFreshnessProof: buildEvidenceFreshnessProofInput(),
      baselineBindingProof: buildBaselineBindingProofInput(),
      runtimeEvidenceSummaryNormalizationProof:
        buildRuntimeEvidenceSummaryNormalizationProofInput(),
      missingStaleEvidenceFailClosedProof:
        buildMissingStaleEvidenceFailClosedProofInput(),
      unsupportedSourceFailClosedProof:
        buildUnsupportedSourceFailClosedProofInput(),
      noTouchBoundaryProof: buildNoTouchBoundaryProofInput(),
      readinessOverclaimRejectionProof:
        buildReadinessOverclaimRejectionProofInput(),
      governanceRuntimeLoopGapProof:
        buildGovernanceRuntimeLoopGapProofInput(),
      recallIsolationRuntimeProof:
        buildRecallIsolationRuntimeProofInput()
    });

    assert.equal(report.summary.acceptedUnitCount, 10);
    assert.equal(report.safety.readsFiles, false);
    assert.equal(report.safety.executesCommands, false);
    assert.equal(report.safety.readsRealMemory, false);
    assert.equal(report.safety.writesDurableState, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
    fs.readdirSync = originalReaddirSync;
    childProcess.execSync = originalExecSync;
    childProcess.execFileSync = originalExecFileSync;
    childProcess.spawnSync = originalSpawnSync;
  }
});
