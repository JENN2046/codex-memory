'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const {
  REQUIRED_RUNTIME_EVIDENCE_UNIT_IDS
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
    new RegExp(fixtureCommit, 'i')
  ]) {
    assert.doesNotMatch(serialized, pattern);
  }
}

async function buildExactLowDisclosureReport() {
  return buildAuthenticatedHttpBoundedMutationProofRuntimeEvidenceReport({
    currentHeadCommit: fixtureCommit,
    expectedCurrentHeadCommit: fixtureCommit,
    evidenceGeneratedAt: '2026-07-07T00:30:00.000Z',
    generatedAt: '2026-07-07T01:00:00.000Z',
    evidenceUnitIds: [...REQUIRED_RUNTIME_EVIDENCE_UNIT_IDS],
    localRuntimeEvidenceMatrixExecuted: true,
    allowlistedFinalRcEvidenceRunnerExecuted: true
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
  assert.equal(report.summary.rc9DecisionPacketCanClaimRcReady, false);
  assertNoForbiddenMaterial(report);
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

  const rejectedEnv = readRuntimeEvidenceReportInput('.env', { cwd: repoRoot });
  assert.equal(rejectedEnv.ok, false);
  assert.equal(rejectedEnv.reason, 'runtime_evidence_report_path_rejected');

  const rejectedSecret = readRuntimeEvidenceReportInput('tmp/secret-report.json', {
    cwd: repoRoot
  });
  assert.equal(rejectedSecret.ok, false);
  assert.equal(rejectedSecret.reason, 'runtime_evidence_report_path_rejected');
});
