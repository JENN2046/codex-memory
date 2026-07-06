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
  parseArgs,
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
  assert.equal(report.summary.rc9DecisionPacketCanClaimRcReady, false);
  assert.equal(report.summary.finalEvidenceAggregationRcGatePrecheckAccepted, false);
  assert.equal(report.summary.rcGatePrecheckFreshCurrentHeadAccepted, false);
  assert.equal(report.summary.rcGatePrecheckCanClaimRcReady, false);
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
  assert.equal(report.summary.rc9DecisionPacketReadyToRequestRcCutoverApproval, true);
  assert.equal(report.summary.rc9DecisionPacketCanClaimRcReady, false);
  assert.equal(report.summary.rcGatePrecheckCanClaimRcReady, false);
  assert.equal(rcGatePrecheck.safety.readinessClaimed, false);
  assertNoForbiddenMaterial(report);
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
      generatedAt: null,
      runtimeEvidenceReportPath: '-',
      runtimeEvidenceCurrentHead: fixtureCommit,
      runtimeEvidenceExpectedCurrentHead: fixtureCommit,
      runtimeEvidenceGeneratedAt: fixtureEvidenceGeneratedAt,
      rejectedFlag: null
    }
  );

  const rejectedEnv = readRuntimeEvidenceReportInput('.env', { cwd: repoRoot });
  assert.equal(rejectedEnv.ok, false);
  assert.equal(rejectedEnv.reason, 'runtime_evidence_report_path_rejected');

  const rejectedSecret = readRuntimeEvidenceReportInput('tmp/secret-report.json', {
    cwd: repoRoot
  });
  assert.equal(rejectedSecret.ok, false);
  assert.equal(rejectedSecret.reason, 'runtime_evidence_report_path_rejected');
});
