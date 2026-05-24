'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  EXACT_WRITE_APPROVAL_LINE,
  PREFLIGHT_STATUS_BLOCKED,
  PREFLIGHT_STATUS_READY,
  REQUIRED_BASIS,
  REQUIRED_BOUNDARY_FLAGS,
  REQUIRED_SCOPE_ASSUMPTIONS,
  REQUIRED_WRITE_SEAM,
  evaluateWriteProofExecutionPreflight,
  normalizePreflightInput
} = require('../src/core/WriteProofExecutionPreflight');

const CURRENT_HEAD = 'a6782e338dfa320679f2802b0d8e2491d8f8b55d';

function buildInput(overrides = {}) {
  return {
    basisId: 'CM-0737',
    approvalLine: EXACT_WRITE_APPROVAL_LINE,
    gitFacts: {
      branch: 'main',
      localHead: CURRENT_HEAD,
      originHead: CURRENT_HEAD,
      remoteMainHead: CURRENT_HEAD,
      statusShort: ''
    },
    basis: { ...REQUIRED_BASIS },
    writeSeam: { ...REQUIRED_WRITE_SEAM },
    scopeAssumptions: { ...REQUIRED_SCOPE_ASSUMPTIONS },
    boundaryFlags: { ...REQUIRED_BOUNDARY_FLAGS },
    ...overrides
  };
}

test('CM-0907 preflight accepts clean synced exact CM-0737 basis without executing write', () => {
  const result = evaluateWriteProofExecutionPreflight(buildInput());

  assert.equal(result.status, PREFLIGHT_STATUS_READY);
  assert.equal(result.acceptedForExecutionPreflight, true);
  assert.equal(result.executionStarted, false);
  assert.equal(result.recordMemoryStarted, false);
  assert.equal(result.exactApprovalLineMatched, true);
  assert.equal(result.cleanSyncedMainHead, true);
  assert.equal(result.exactBasisBound, true);
  assert.equal(result.optInAppSeamBound, true);
  assert.equal(result.scopeAssumptionsBound, true);
  assert.equal(result.boundaryFlagsBound, true);
  assert.deepEqual(result.blockerReasons, []);
  assert.equal(result.safety.sourceMode, 'explicit_input_only');
  assert.equal(result.safety.executesCommands, false);
  assert.equal(result.safety.callsRecordMemory, false);
  assert.equal(result.safety.callsSearchMemory, false);
  assert.equal(result.safety.claimsWriteReliable, false);
  assert.equal(result.safety.claimsReadiness, false);
});

test('CM-0907 preflight fails closed for dirty worktree and remote baseline drift', () => {
  const result = evaluateWriteProofExecutionPreflight(buildInput({
    gitFacts: {
      branch: 'main',
      localHead: CURRENT_HEAD,
      originHead: CURRENT_HEAD,
      remoteMainHead: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      statusShort: [
        ' M src/app.js',
        '?? docs/MEMORY_WRITE_PREFLIGHT_CM0737_CANDIDATE_REBIND_PACKET.md'
      ]
    }
  }));

  assert.equal(result.status, PREFLIGHT_STATUS_BLOCKED);
  assert.equal(result.acceptedForExecutionPreflight, false);
  assert.equal(result.executionStarted, false);
  assert.equal(result.cleanSyncedMainHead, false);
  assert.ok(result.blockerReasons.includes('dirty_worktree'));
  assert.ok(result.blockerReasons.includes('local_remote_main_head_mismatch'));
  assert.equal(result.normalizedGitFacts.dirtyStatusLineCount, 2);
});

test('CM-0907 preflight fails closed for basis and app seam drift', () => {
  const result = evaluateWriteProofExecutionPreflight(buildInput({
    basis: {
      ...REQUIRED_BASIS,
      acceptedBasisMemoryId: 'codex-process-different',
      target: 'knowledge'
    },
    writeSeam: {
      ...REQUIRED_WRITE_SEAM,
      configFlagValue: false,
      appCallTool: 'search_memory'
    }
  }));

  assert.equal(result.acceptedForExecutionPreflight, false);
  assert.ok(result.blockerReasons.includes('basis_acceptedBasisMemoryId_mismatch'));
  assert.ok(result.blockerReasons.includes('basis_target_mismatch'));
  assert.ok(result.blockerReasons.includes('write_seam_configFlagValue_mismatch'));
  assert.ok(result.blockerReasons.includes('write_seam_appCallTool_mismatch'));
  assert.equal(result.safety.callsRecordMemory, false);
});

test('CM-0907 preflight fails closed for scope discovery and boundary softening', () => {
  const result = evaluateWriteProofExecutionPreflight(buildInput({
    approvalLine: 'approved-ish',
    scopeAssumptions: {
      ...REQUIRED_SCOPE_ASSUMPTIONS,
      duplicateBasisPrebound: false,
      broadDiscoveryUsed: true
    },
    boundaryFlags: {
      ...REQUIRED_BOUNDARY_FLAGS,
      oneWriteOnly: false,
      recordMemoryCallCount: 2,
      searchMemoryCallCount: 1,
      rawDurableMemoryRead: true,
      readinessClaimed: true
    }
  }));

  assert.equal(result.acceptedForExecutionPreflight, false);
  assert.ok(result.blockerReasons.includes('exact_write_approval_line_missing_or_mismatched'));
  assert.ok(result.blockerReasons.includes('scope_assumption_duplicateBasisPrebound_mismatch'));
  assert.ok(result.blockerReasons.includes('scope_assumption_broadDiscoveryUsed_mismatch'));
  assert.ok(result.blockerReasons.includes('boundary_flag_oneWriteOnly_mismatch'));
  assert.ok(result.blockerReasons.includes('boundary_flag_recordMemoryCallCount_mismatch'));
  assert.ok(result.blockerReasons.includes('boundary_flag_searchMemoryCallCount_mismatch'));
  assert.ok(result.blockerReasons.includes('boundary_flag_rawDurableMemoryRead_mismatch'));
  assert.ok(result.blockerReasons.includes('boundary_flag_readinessClaimed_mismatch'));
  assert.equal(result.safety.readsRawMemory, false);
  assert.equal(result.safety.expandsPublicMcp, false);
});

test('CM-0907 preflight normalizes status lines without implicit file or command reads', () => {
  const normalized = normalizePreflightInput(buildInput({
    gitFacts: {
      branch: ' main ',
      localHead: ` ${CURRENT_HEAD} `,
      originHead: CURRENT_HEAD,
      remoteMainHead: CURRENT_HEAD,
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
