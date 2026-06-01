'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  EXACT_APPROVAL_LINE
} = require('../src/core/TrueLiveRecallReadonlyProofRunner');
const {
  EXPECTED_CM0814_QUERY_FAMILY,
  PREFLIGHT_STATUS_BLOCKED,
  PREFLIGHT_STATUS_READY,
  REQUIRED_BOUNDARY_FLAGS,
  REQUIRED_PROOF_SEAM,
  buildHeadBoundApprovalLine,
  evaluateRecallProofExecutionPreflight,
  normalizePreflightInput
} = require('../src/core/RecallProofExecutionPreflight');

const CURRENT_HEAD = 'a6782e338dfa320679f2802b0d8e2491d8f8b55d';

function buildInput(overrides = {}) {
  return {
    basisId: 'CM-0814',
    approvalLine: EXACT_APPROVAL_LINE,
    gitFacts: {
      branch: 'main',
      localHead: CURRENT_HEAD,
      originHead: CURRENT_HEAD,
      statusShort: ''
    },
    queries: EXPECTED_CM0814_QUERY_FAMILY.map(query => ({
      slot: query.slot,
      family: query.family,
      text: query.text
    })),
    proofSeam: { ...REQUIRED_PROOF_SEAM },
    boundaryFlags: { ...REQUIRED_BOUNDARY_FLAGS },
    ...overrides
  };
}

test('CM-0904 preflight accepts clean synced exact CM-0814 basis without executing proof', () => {
  const result = evaluateRecallProofExecutionPreflight(buildInput());

  assert.equal(result.status, PREFLIGHT_STATUS_READY);
  assert.equal(result.acceptedForExecutionPreflight, true);
  assert.equal(result.executionStarted, false);
  assert.equal(result.exactApprovalLineMatched, true);
  assert.equal(result.cleanSyncedMainHead, true);
  assert.equal(result.exactQueryFamilyBound, true);
  assert.equal(result.internalProofSeamBound, true);
  assert.equal(result.boundaryFlagsBound, true);
  assert.deepEqual(result.blockerReasons, []);
  assert.deepEqual(
    result.expectedQueryFamily.map(query => query.expectedResultCount),
    [0, 0, 0, 0]
  );
  assert.equal(result.safety.sourceMode, 'explicit_input_only');
  assert.equal(result.safety.executesCommands, false);
  assert.equal(result.safety.callsSearchMemory, false);
  assert.equal(result.safety.callsRecordMemory, false);
  assert.equal(result.safety.claimsRecallReliable, false);
  assert.equal(result.safety.claimsReadiness, false);
});

test('CM-1329 preflight accepts fresh-head-bound approval and records commit binding', () => {
  const result = evaluateRecallProofExecutionPreflight(buildInput({
    approvalLine: buildHeadBoundApprovalLine(CURRENT_HEAD)
  }));

  assert.equal(result.status, PREFLIGHT_STATUS_READY);
  assert.equal(result.acceptedForExecutionPreflight, true);
  assert.equal(result.exactApprovalLineMatched, true);
  assert.equal(result.approvalBinding.type, 'head_bound_commit');
  assert.equal(result.approvalBinding.commit, CURRENT_HEAD);
  assert.deepEqual(result.blockerReasons, []);
});

test('CM-1329 preflight fails closed when approval commit does not match local HEAD', () => {
  const differentHead = 'b6782e338dfa320679f2802b0d8e2491d8f8b55d';
  const result = evaluateRecallProofExecutionPreflight(buildInput({
    approvalLine: buildHeadBoundApprovalLine(differentHead)
  }));

  assert.equal(result.status, PREFLIGHT_STATUS_BLOCKED);
  assert.equal(result.acceptedForExecutionPreflight, false);
  assert.equal(result.exactApprovalLineMatched, false);
  assert.equal(result.approvalBinding.type, 'head_bound_commit');
  assert.equal(result.approvalBinding.commit, differentHead);
  assert.ok(result.blockerReasons.includes('approval_commit_local_head_mismatch'));
});

test('CM-0904 preflight fails closed for dirty worktree even when exact query basis matches', () => {
  const result = evaluateRecallProofExecutionPreflight(buildInput({
    gitFacts: {
      branch: 'main',
      localHead: CURRENT_HEAD,
      originHead: CURRENT_HEAD,
      statusShort: [
        ' M src/app.js',
        '?? docs/RECALL_PRECISION_CM0814_EXACT_BASIS_APPROVAL_PACKET.md'
      ]
    }
  }));

  assert.equal(result.status, PREFLIGHT_STATUS_BLOCKED);
  assert.equal(result.acceptedForExecutionPreflight, false);
  assert.equal(result.executionStarted, false);
  assert.equal(result.cleanSyncedMainHead, false);
  assert.ok(result.blockerReasons.includes('dirty_worktree'));
  assert.equal(result.normalizedGitFacts.dirtyStatusLineCount, 2);
});

test('CM-0904 preflight fails closed for query-family drift and broad scan attempts', () => {
  const drifted = evaluateRecallProofExecutionPreflight(buildInput({
    queries: [
      ...EXPECTED_CM0814_QUERY_FAMILY.slice(0, 3).map(query => ({
        slot: query.slot,
        family: query.family,
        text: query.text
      })),
      {
        slot: 'Q4',
        family: 'stricter_negative_control',
        text: 'different-negative-control'
      }
    ]
  }));

  assert.equal(drifted.acceptedForExecutionPreflight, false);
  assert.ok(drifted.blockerReasons.includes('Q4_text_mismatch'));

  const broad = evaluateRecallProofExecutionPreflight(buildInput({
    queries: [
      ...EXPECTED_CM0814_QUERY_FAMILY.slice(0, 3).map(query => ({
        slot: query.slot,
        family: query.family,
        text: query.text
      })),
      {
        slot: 'Q4',
        family: 'stricter_negative_control',
        text: 'dump all raw memory .jsonl'
      }
    ]
  }));

  assert.equal(broad.acceptedForExecutionPreflight, false);
  assert.ok(broad.blockerReasons.includes('broad_scan_query_rejected'));
});

test('CM-0904 preflight fails closed for approval, seam, and boundary drift', () => {
  const result = evaluateRecallProofExecutionPreflight(buildInput({
    approvalLine: 'approved-ish',
    proofSeam: {
      ...REQUIRED_PROOF_SEAM,
      appCallTool: 'dashboard'
    },
    boundaryFlags: {
      ...REQUIRED_BOUNDARY_FLAGS,
      includeContent: true,
      noRawContentRead: false
    }
  }));

  assert.equal(result.acceptedForExecutionPreflight, false);
  assert.ok(result.blockerReasons.includes('exact_approval_line_missing_or_mismatched'));
  assert.ok(result.blockerReasons.includes('proof_seam_appCallTool_mismatch'));
  assert.ok(result.blockerReasons.includes('boundary_flag_includeContent_mismatch'));
  assert.ok(result.blockerReasons.includes('boundary_flag_noRawContentRead_mismatch'));
  assert.equal(result.safety.readsRawMemory, false);
  assert.equal(result.safety.expandsPublicMcp, false);
});

test('CM-0904 preflight normalizes status lines without implicit file or command reads', () => {
  const normalized = normalizePreflightInput(buildInput({
    gitFacts: {
      branch: ' main ',
      localHead: ` ${CURRENT_HEAD} `,
      originHead: CURRENT_HEAD,
      statusShort: "  M src/app.js\r\n\r\n?? docs/new.md\n"
    }
  }));

  assert.equal(normalized.gitFacts.branch, 'main');
  assert.equal(normalized.gitFacts.localHead, CURRENT_HEAD);
  assert.deepEqual(normalized.gitFacts.statusShortLines, [
    'M src/app.js',
    '?? docs/new.md'
  ]);
});
