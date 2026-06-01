'use strict';

const {
  buildHeadBoundApprovalLine,
  EXACT_APPROVAL_LINE,
  EXACT_QUERY_COUNT,
  normalizeQueries,
  parseHeadBoundApprovalLine
} = require('./TrueLiveRecallReadonlyProofRunner');

const CM0814_BASIS_ID = 'CM-0814';
const PREFLIGHT_STATUS_READY = 'RECALL_PROOF_EXECUTION_PREFLIGHT_READY_NOT_EXECUTED';
const PREFLIGHT_STATUS_BLOCKED = 'RECALL_PROOF_EXECUTION_PREFLIGHT_BLOCKED_NOT_EXECUTED';

const EXPECTED_CM0814_QUERY_FAMILY = Object.freeze([
  Object.freeze({
    slot: 'Q1',
    family: 'stricter_negative_control',
    text: 'xqzv-9137-lomdra-kepv-azmuth',
    expectedResultCount: 0
  }),
  Object.freeze({
    slot: 'Q2',
    family: 'stricter_negative_control',
    text: 'nareth-48291-pluvox-darnel-kiv',
    expectedResultCount: 0
  }),
  Object.freeze({
    slot: 'Q3',
    family: 'stricter_negative_control',
    text: 'vornik-73019-quaspel-threnn-ulo',
    expectedResultCount: 0
  }),
  Object.freeze({
    slot: 'Q4',
    family: 'stricter_negative_control',
    text: 'mavrix-60428-selkun-dopra-nyxal',
    expectedResultCount: 0
  })
]);

const REQUIRED_PROOF_SEAM = Object.freeze({
  runner: 'TrueLiveRecallReadonlyProofRunner',
  adapter: 'createTrueLiveRecallExecutorAdapter',
  appCallTool: 'search_memory',
  requestSource: 'internal-true-live-recall-readonly-proof-runner'
});

const REQUIRED_BOUNDARY_FLAGS = Object.freeze({
  readOnly: true,
  noProvider: true,
  noAudit: true,
  noTokenReadOnly: true,
  noRawContentRead: true,
  includeContent: false,
  precisionPolicyEnabled: true,
  proofNoResultMode: true,
  sanitizedOutput: true
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStatusLines(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeString).filter(Boolean);
  }
  return normalizeString(value)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
}

function normalizeGitFacts(value = {}) {
  const safeValue = isPlainObject(value) ? value : {};
  return {
    branch: normalizeString(safeValue.branch),
    localHead: normalizeString(safeValue.localHead),
    originHead: normalizeString(safeValue.originHead),
    statusShortLines: normalizeStatusLines(safeValue.statusShort)
  };
}

function normalizeProofSeam(value = {}) {
  const safeValue = isPlainObject(value) ? value : {};
  return {
    runner: normalizeString(safeValue.runner),
    adapter: normalizeString(safeValue.adapter),
    appCallTool: normalizeString(safeValue.appCallTool),
    requestSource: normalizeString(safeValue.requestSource)
  };
}

function normalizeBoundaryFlags(value = {}) {
  const safeValue = isPlainObject(value) ? value : {};
  return {
    readOnly: safeValue.readOnly === true,
    noProvider: safeValue.noProvider === true,
    noAudit: safeValue.noAudit === true,
    noTokenReadOnly: safeValue.noTokenReadOnly === true,
    noRawContentRead: safeValue.noRawContentRead === true,
    includeContent: safeValue.includeContent === true,
    precisionPolicyEnabled: safeValue.precisionPolicyEnabled === true,
    proofNoResultMode: safeValue.proofNoResultMode === true,
    sanitizedOutput: safeValue.sanitizedOutput === true
  };
}

function normalizePreflightInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  return {
    basisId: normalizeString(safeInput.basisId) || CM0814_BASIS_ID,
    approvalLine: normalizeString(safeInput.approvalLine),
    gitFacts: normalizeGitFacts(safeInput.gitFacts),
    queries: Array.isArray(safeInput.queries) ? safeInput.queries : [],
    proofSeam: normalizeProofSeam(safeInput.proofSeam),
    boundaryFlags: normalizeBoundaryFlags(safeInput.boundaryFlags)
  };
}

function isFortyCharHex(value) {
  return /^[a-f0-9]{40}$/i.test(value);
}

function collectGitBlockers(gitFacts) {
  const blockers = [];
  if (gitFacts.branch !== 'main') {
    blockers.push('branch_not_main');
  }
  if (!isFortyCharHex(gitFacts.localHead)) {
    blockers.push('local_head_missing_or_malformed');
  }
  if (!isFortyCharHex(gitFacts.originHead)) {
    blockers.push('origin_head_missing_or_malformed');
  }
  if (gitFacts.localHead && gitFacts.originHead && gitFacts.localHead !== gitFacts.originHead) {
    blockers.push('local_origin_head_mismatch');
  }
  if (gitFacts.statusShortLines.length > 0) {
    blockers.push('dirty_worktree');
  }
  return blockers;
}

function evaluateApprovalBinding(approvalLine, gitFacts) {
  if (approvalLine === EXACT_APPROVAL_LINE) {
    return {
      accepted: true,
      type: 'legacy_current_synced_main_head',
      commit: null,
      blocker: null
    };
  }

  const headBoundProfile = parseHeadBoundApprovalLine(approvalLine);
  if (!headBoundProfile) {
    return {
      accepted: false,
      type: 'invalid',
      commit: null,
      blocker: 'exact_approval_line_missing_or_mismatched'
    };
  }

  if (!isFortyCharHex(gitFacts.localHead)) {
    return {
      accepted: false,
      type: 'head_bound_commit',
      commit: headBoundProfile.commit,
      blocker: 'approval_local_head_missing_or_malformed'
    };
  }

  if (headBoundProfile.commit !== gitFacts.localHead.toLowerCase()) {
    return {
      accepted: false,
      type: 'head_bound_commit',
      commit: headBoundProfile.commit,
      blocker: 'approval_commit_local_head_mismatch'
    };
  }

  return {
    accepted: true,
    type: 'head_bound_commit',
    commit: headBoundProfile.commit,
    blocker: null
  };
}

function collectApprovalBlockers(approvalLine, gitFacts) {
  const binding = evaluateApprovalBinding(approvalLine, gitFacts);
  return binding.accepted ? [] : [binding.blocker];
}

function collectQueryBlockers(queries) {
  try {
    const normalizedQueries = normalizeQueries(queries);
    const blockers = [];
    if (normalizedQueries.length !== EXACT_QUERY_COUNT) {
      blockers.push('exact_query_count_mismatch');
    }
    normalizedQueries.forEach((query, index) => {
      const expected = EXPECTED_CM0814_QUERY_FAMILY[index];
      if (!expected || query.slot !== expected.slot) {
        blockers.push(`query_slot_${index + 1}_mismatch`);
      }
      if (expected && query.family !== expected.family) {
        blockers.push(`${expected.slot}_family_mismatch`);
      }
      if (expected && query.text !== expected.text) {
        blockers.push(`${expected.slot}_text_mismatch`);
      }
    });
    return blockers;
  } catch (error) {
    return [error?.details?.reason || 'query_family_invalid'];
  }
}

function collectProofSeamBlockers(proofSeam) {
  const blockers = [];
  for (const [key, expected] of Object.entries(REQUIRED_PROOF_SEAM)) {
    if (proofSeam[key] !== expected) {
      blockers.push(`proof_seam_${key}_mismatch`);
    }
  }
  return blockers;
}

function collectBoundaryFlagBlockers(boundaryFlags) {
  const blockers = [];
  for (const [key, expected] of Object.entries(REQUIRED_BOUNDARY_FLAGS)) {
    if (boundaryFlags[key] !== expected) {
      blockers.push(`boundary_flag_${key}_mismatch`);
    }
  }
  return blockers;
}

function evaluateRecallProofExecutionPreflight(input = {}) {
  const normalized = normalizePreflightInput(input);
  const blockerReasons = [
    ...collectApprovalBlockers(normalized.approvalLine, normalized.gitFacts),
    ...collectGitBlockers(normalized.gitFacts),
    ...collectQueryBlockers(normalized.queries),
    ...collectProofSeamBlockers(normalized.proofSeam),
    ...collectBoundaryFlagBlockers(normalized.boundaryFlags)
  ];
  const uniqueBlockers = [...new Set(blockerReasons)];
  const acceptedForExecutionPreflight = uniqueBlockers.length === 0;
  const approvalBinding = evaluateApprovalBinding(normalized.approvalLine, normalized.gitFacts);

  return {
    taskId: 'CM-0904_RECALL_PROOF_EXECUTION_PREFLIGHT',
    basisId: normalized.basisId,
    status: acceptedForExecutionPreflight ? PREFLIGHT_STATUS_READY : PREFLIGHT_STATUS_BLOCKED,
    acceptedForExecutionPreflight,
    executionStarted: false,
    exactApprovalLineMatched: approvalBinding.accepted,
    approvalBinding,
    cleanSyncedMainHead: collectGitBlockers(normalized.gitFacts).length === 0,
    exactQueryFamilyBound: collectQueryBlockers(normalized.queries).length === 0,
    internalProofSeamBound: collectProofSeamBlockers(normalized.proofSeam).length === 0,
    boundaryFlagsBound: collectBoundaryFlagBlockers(normalized.boundaryFlags).length === 0,
    blockerReasons: uniqueBlockers,
    expectedQueryFamily: EXPECTED_CM0814_QUERY_FAMILY.map(query => ({ ...query })),
    normalizedGitFacts: {
      branch: normalized.gitFacts.branch,
      localHead: normalized.gitFacts.localHead,
      originHead: normalized.gitFacts.originHead,
      dirtyStatusLineCount: normalized.gitFacts.statusShortLines.length
    },
    requiredProofSeam: { ...REQUIRED_PROOF_SEAM },
    requiredBoundaryFlags: { ...REQUIRED_BOUNDARY_FLAGS },
    safety: {
      sourceMode: 'explicit_input_only',
      readsFiles: false,
      executesCommands: false,
      callsSearchMemory: false,
      callsRecordMemory: false,
      callsProvider: false,
      readsRawMemory: false,
      readsJsonl: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      expandsPublicMcp: false,
      changesConfigWatchdogStartup: false,
      claimsRecallReliable: false,
      claimsReadiness: false
    }
  };
}

module.exports = {
  CM0814_BASIS_ID,
  EXPECTED_CM0814_QUERY_FAMILY,
  PREFLIGHT_STATUS_BLOCKED,
  PREFLIGHT_STATUS_READY,
  REQUIRED_BOUNDARY_FLAGS,
  REQUIRED_PROOF_SEAM,
  buildHeadBoundApprovalLine,
  evaluateRecallProofExecutionPreflight,
  normalizePreflightInput
};
