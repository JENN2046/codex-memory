'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  EXACT_APPROVAL_LINE,
  PREFLIGHT_STATUS_BLOCKED,
  PREFLIGHT_STATUS_READY,
  REQUEST_SHA256,
  REQUIRED_BOUNDARY_FLAGS,
  REQUIRED_CURRENT_ARTIFACTS,
  REQUIRED_OBSERVATION_SURFACE,
  REQUIRED_PRIOR_RESULTS,
  TARGET_HEAD,
  evaluateSelectedAuditCorrelationObservationPreflight,
  normalizePreflightInput
} = require('../src/core/SelectedAuditCorrelationObservationPreflight');

function buildInput(overrides = {}) {
  return {
    basisId: 'CM-1120',
    approvalLine: EXACT_APPROVAL_LINE,
    packetId: 'CM-1120-SELECTED-AUDIT-CORRELATION-OBSERVATION-APPROVAL-001',
    requestSha256: REQUEST_SHA256,
    gitFacts: {
      branch: 'main',
      localHead: TARGET_HEAD,
      originHead: TARGET_HEAD,
      remoteMainHead: TARGET_HEAD,
      statusShort: ''
    },
    priorResults: REQUIRED_PRIOR_RESULTS.map(item => ({ ...item })),
    currentArtifacts: REQUIRED_CURRENT_ARTIFACTS.map(item => ({ ...item })),
    observationSurface: { ...REQUIRED_OBSERVATION_SURFACE },
    boundaryFlags: { ...REQUIRED_BOUNDARY_FLAGS },
    ...overrides
  };
}

test('CM-1121 preflight accepts exact CM-1120 packet shape without executing audit observation', () => {
  const result = evaluateSelectedAuditCorrelationObservationPreflight(buildInput());

  assert.equal(result.status, PREFLIGHT_STATUS_READY);
  assert.equal(result.acceptedForExecutionPreflight, true);
  assert.equal(result.executionStarted, false);
  assert.equal(result.auditObservationStarted, false);
  assert.equal(result.preflightOnly, true);
  assert.equal(result.separateExactApprovalRequired, true);
  assert.equal(result.implicitAuditReadAuthorizationGranted, false);
  assert.equal(result.exactApprovalLineMatched, true);
  assert.equal(result.requestHashMatched, true);
  assert.equal(result.cleanTargetHead, true);
  assert.equal(result.requiredPriorResultsBound, true);
  assert.equal(result.currentArtifactsBound, true);
  assert.equal(result.observationSurfaceBound, true);
  assert.equal(result.boundaryFlagsBound, true);
  assert.deepEqual(result.blockerReasons, []);
  assert.equal(result.safety.sourceMode, 'explicit_input_only');
  assert.equal(result.safety.executesCommands, false);
  assert.equal(result.safety.readsTrueAuditLog, false);
  assert.equal(result.safety.readsRawAudit, false);
  assert.equal(result.safety.callsRecordMemory, false);
  assert.equal(result.safety.claimsWriteReliable, false);
  assert.equal(result.safety.claimsRecallReliable, false);
  assert.equal(result.safety.claimsReadiness, false);
});

test('CM-1121 preflight fails closed for missing approval, request hash drift, and dirty worktree', () => {
  const result = evaluateSelectedAuditCorrelationObservationPreflight(buildInput({
    approvalLine: 'approved-ish',
    requestSha256: 'different',
    gitFacts: {
      branch: 'main',
      localHead: TARGET_HEAD,
      originHead: TARGET_HEAD,
      remoteMainHead: TARGET_HEAD,
      statusShort: [
        ' M src/storage/AuditLogStore.js',
        '?? docs/CM1120_SELECTED_AUDIT_CORRELATION_OBSERVATION_APPROVAL_PACKET.md'
      ]
    }
  }));

  assert.equal(result.status, PREFLIGHT_STATUS_BLOCKED);
  assert.equal(result.acceptedForExecutionPreflight, false);
  assert.equal(result.executionStarted, false);
  assert.ok(result.blockerReasons.includes('exact_approval_line_missing_or_mismatched'));
  assert.ok(result.blockerReasons.includes('request_sha256_mismatch'));
  assert.ok(result.blockerReasons.includes('dirty_worktree'));
  assert.equal(result.normalizedGitFacts.dirtyStatusLineCount, 2);
});

test('CM-1121 preflight fails closed for missing prior results and stale helper evidence', () => {
  const result = evaluateSelectedAuditCorrelationObservationPreflight(buildInput({
    priorResults: [
      {
        taskId: 'CM-1111',
        resultClass: 'APPLIED_WITH_AUDIT_WARNING'
      }
    ],
    currentArtifacts: [
      {
        taskId: 'CM-1118',
        resultClass: 'STALE',
        helper: 'AuditLogStore.readRecentWriteAudit'
      },
      {
        taskId: 'CM-9999',
        resultClass: 'EXTRA',
        helper: ''
      }
    ]
  }));

  assert.equal(result.acceptedForExecutionPreflight, false);
  assert.ok(result.blockerReasons.includes('prior_result_CM-1111_result_class_mismatch'));
  assert.ok(result.blockerReasons.includes('prior_result_CM-1115_missing'));
  assert.ok(result.blockerReasons.includes('current_artifact_CM-1118_result_class_mismatch'));
  assert.ok(result.blockerReasons.includes('current_artifact_CM-1118_helper_mismatch'));
  assert.ok(result.blockerReasons.includes('current_artifact_CM-1119_missing'));
  assert.ok(result.blockerReasons.includes('current_artifact_unexpected_CM-9999'));
});

test('CM-1121 preflight fails closed for widened observation surface and forbidden side effects', () => {
  const result = evaluateSelectedAuditCorrelationObservationPreflight(buildInput({
    observationSurface: {
      ...REQUIRED_OBSERVATION_SURFACE,
      maxSelectedAuditCorrelationReads: 2,
      surface: 'AuditLogStore.readRecentWriteAudit',
      requestSource: 'broad-scan'
    },
    boundaryFlags: {
      ...REQUIRED_BOUNDARY_FLAGS,
      rawAuditOutput: true,
      recordMemoryCallCount: 1,
      searchMemoryCallCount: 1,
      durableMemoryAuditWrite: true,
      tombstoneApply: true,
      readinessClaimed: true,
      reliabilityClaimed: true
    }
  }));

  assert.equal(result.acceptedForExecutionPreflight, false);
  assert.ok(result.blockerReasons.includes('observation_surface_surface_mismatch'));
  assert.ok(result.blockerReasons.includes('observation_surface_maxSelectedAuditCorrelationReads_mismatch'));
  assert.ok(result.blockerReasons.includes('observation_surface_requestSource_mismatch'));
  assert.ok(result.blockerReasons.includes('boundary_flag_rawAuditOutput_mismatch'));
  assert.ok(result.blockerReasons.includes('boundary_flag_recordMemoryCallCount_mismatch'));
  assert.ok(result.blockerReasons.includes('boundary_flag_searchMemoryCallCount_mismatch'));
  assert.ok(result.blockerReasons.includes('boundary_flag_durableMemoryAuditWrite_mismatch'));
  assert.ok(result.blockerReasons.includes('boundary_flag_tombstoneApply_mismatch'));
  assert.ok(result.blockerReasons.includes('boundary_flag_readinessClaimed_mismatch'));
  assert.ok(result.blockerReasons.includes('boundary_flag_reliabilityClaimed_mismatch'));
  assert.equal(result.safety.readsTrueAuditLog, false);
  assert.equal(result.safety.writesDurableAudit, false);
});

test('CM-1121 preflight normalizes aliases without implicit file or command reads', () => {
  const normalized = normalizePreflightInput(buildInput({
    packet_id: ' CM-1120-SELECTED-AUDIT-CORRELATION-OBSERVATION-APPROVAL-001 ',
    request_sha256: ` ${REQUEST_SHA256} `,
    gitFacts: {
      branch: ' main ',
      localHead: ` ${TARGET_HEAD} `,
      originHead: TARGET_HEAD,
      remoteMainHead: TARGET_HEAD,
      statusShort: "  M src/app.js\r\n\r\n?? docs/new.md\n"
    },
    prior_results: REQUIRED_PRIOR_RESULTS.map(item => ({
      task_id: item.taskId,
      result_class: item.resultClass
    })),
    current_artifacts: REQUIRED_CURRENT_ARTIFACTS.map(item => ({
      task_id: item.taskId,
      result_class: item.resultClass,
      helper: item.helper
    }))
  }));

  assert.equal(normalized.packetId, 'CM-1120-SELECTED-AUDIT-CORRELATION-OBSERVATION-APPROVAL-001');
  assert.equal(normalized.requestSha256, REQUEST_SHA256);
  assert.equal(normalized.gitFacts.branch, 'main');
  assert.equal(normalized.gitFacts.localHead, TARGET_HEAD);
  assert.deepEqual(normalized.gitFacts.statusShortLines, [
    'M src/app.js',
    '?? docs/new.md'
  ]);
  assert.equal(normalized.priorResults[0].taskId, 'CM-1111');
  assert.equal(normalized.currentArtifacts[0].taskId, 'CM-1118');
});
