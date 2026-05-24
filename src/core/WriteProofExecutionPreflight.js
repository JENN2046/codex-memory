'use strict';

const CM0737_BASIS_ID = 'CM-0737';
const PREFLIGHT_STATUS_READY = 'WRITE_PROOF_EXECUTION_PREFLIGHT_READY_NOT_EXECUTED';
const PREFLIGHT_STATUS_BLOCKED = 'WRITE_PROOF_EXECUTION_PREFLIGHT_BLOCKED_NOT_EXECUTED';

const EXACT_WRITE_APPROVAL_LINE = [
  'Approve exactly one CM-0737-bound sanitized record_memory write proof through',
  'createCodexMemoryApplication with enableWritePreflight=true;',
  'no search_memory, provider/API call, raw memory read, config/startup change,',
  'public MCP expansion, second write, remote action, or readiness claim is authorized.'
].join(' ');

const REQUIRED_BASIS = Object.freeze({
  basisFamily: CM0737_BASIS_ID,
  acceptedBasisEvent: 'repaired_second_attempt',
  acceptedBasisMemoryId: 'codex-process-1ef539a197d747e199e12fe1c0d69731',
  target: 'process',
  payloadFamily: 'repaired_checkpoint_shaped_process_payload'
});

const REQUIRED_WRITE_SEAM = Object.freeze({
  appFactory: 'createCodexMemoryApplication',
  configFlag: 'enableWritePreflight',
  configFlagValue: true,
  appCallTool: 'record_memory'
});

const REQUIRED_SCOPE_ASSUMPTIONS = Object.freeze({
  targetScopeLane: 'process',
  scopeDerivationSource: 'payload_and_execution_context',
  duplicateBasisPrebound: true,
  broadDiscoveryUsed: false
});

const REQUIRED_BOUNDARY_FLAGS = Object.freeze({
  oneWriteOnly: true,
  recordMemoryCallCount: 1,
  searchMemoryCallCount: 0,
  providerCallCount: 0,
  apiCallCount: 0,
  directJsonlRead: false,
  rawDurableMemoryRead: false,
  rawDurableAuditRead: false,
  secondWriteAllowed: false,
  publicMcpExpansion: false,
  configWatchdogStartupChange: false,
  sanitizedOutput: true,
  readinessClaimed: false,
  writeReliableClaimed: false
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
    remoteMainHead: normalizeString(safeValue.remoteMainHead),
    statusShortLines: normalizeStatusLines(safeValue.statusShort)
  };
}

function normalizeObject(value = {}, template = {}) {
  const safeValue = isPlainObject(value) ? value : {};
  const normalized = {};
  for (const key of Object.keys(template)) {
    const expected = template[key];
    if (typeof expected === 'string') {
      normalized[key] = normalizeString(safeValue[key]);
    } else if (typeof expected === 'number') {
      normalized[key] = Number(safeValue[key]);
    } else if (typeof expected === 'boolean') {
      normalized[key] = safeValue[key] === true;
    } else {
      normalized[key] = safeValue[key];
    }
  }
  return normalized;
}

function normalizePreflightInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  return {
    basisId: normalizeString(safeInput.basisId) || CM0737_BASIS_ID,
    approvalLine: normalizeString(safeInput.approvalLine),
    gitFacts: normalizeGitFacts(safeInput.gitFacts),
    basis: normalizeObject(safeInput.basis, REQUIRED_BASIS),
    writeSeam: normalizeObject(safeInput.writeSeam, REQUIRED_WRITE_SEAM),
    scopeAssumptions: normalizeObject(safeInput.scopeAssumptions, REQUIRED_SCOPE_ASSUMPTIONS),
    boundaryFlags: normalizeObject(safeInput.boundaryFlags, REQUIRED_BOUNDARY_FLAGS)
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
  if (!isFortyCharHex(gitFacts.remoteMainHead)) {
    blockers.push('remote_main_head_missing_or_malformed');
  }
  if (gitFacts.localHead && gitFacts.originHead && gitFacts.localHead !== gitFacts.originHead) {
    blockers.push('local_origin_head_mismatch');
  }
  if (gitFacts.localHead && gitFacts.remoteMainHead && gitFacts.localHead !== gitFacts.remoteMainHead) {
    blockers.push('local_remote_main_head_mismatch');
  }
  if (gitFacts.statusShortLines.length > 0) {
    blockers.push('dirty_worktree');
  }
  return blockers;
}

function collectApprovalBlockers(approvalLine) {
  return approvalLine === EXACT_WRITE_APPROVAL_LINE ? [] : ['exact_write_approval_line_missing_or_mismatched'];
}

function collectTemplateBlockers(value, template, prefix) {
  const blockers = [];
  for (const [key, expected] of Object.entries(template)) {
    if (value[key] !== expected) {
      blockers.push(`${prefix}_${key}_mismatch`);
    }
  }
  return blockers;
}

function evaluateWriteProofExecutionPreflight(input = {}) {
  const normalized = normalizePreflightInput(input);
  const blockerReasons = [
    ...collectApprovalBlockers(normalized.approvalLine),
    ...collectGitBlockers(normalized.gitFacts),
    ...collectTemplateBlockers(normalized.basis, REQUIRED_BASIS, 'basis'),
    ...collectTemplateBlockers(normalized.writeSeam, REQUIRED_WRITE_SEAM, 'write_seam'),
    ...collectTemplateBlockers(normalized.scopeAssumptions, REQUIRED_SCOPE_ASSUMPTIONS, 'scope_assumption'),
    ...collectTemplateBlockers(normalized.boundaryFlags, REQUIRED_BOUNDARY_FLAGS, 'boundary_flag')
  ];
  const uniqueBlockers = [...new Set(blockerReasons)];
  const acceptedForExecutionPreflight = uniqueBlockers.length === 0;

  return {
    taskId: 'CM-0907_WRITE_PROOF_EXECUTION_PREFLIGHT',
    basisId: normalized.basisId,
    status: acceptedForExecutionPreflight ? PREFLIGHT_STATUS_READY : PREFLIGHT_STATUS_BLOCKED,
    acceptedForExecutionPreflight,
    executionStarted: false,
    recordMemoryStarted: false,
    exactApprovalLineMatched: normalized.approvalLine === EXACT_WRITE_APPROVAL_LINE,
    cleanSyncedMainHead: collectGitBlockers(normalized.gitFacts).length === 0,
    exactBasisBound: collectTemplateBlockers(normalized.basis, REQUIRED_BASIS, 'basis').length === 0,
    optInAppSeamBound: collectTemplateBlockers(normalized.writeSeam, REQUIRED_WRITE_SEAM, 'write_seam').length === 0,
    scopeAssumptionsBound: collectTemplateBlockers(normalized.scopeAssumptions, REQUIRED_SCOPE_ASSUMPTIONS, 'scope_assumption').length === 0,
    boundaryFlagsBound: collectTemplateBlockers(normalized.boundaryFlags, REQUIRED_BOUNDARY_FLAGS, 'boundary_flag').length === 0,
    blockerReasons: uniqueBlockers,
    normalizedGitFacts: {
      branch: normalized.gitFacts.branch,
      localHead: normalized.gitFacts.localHead,
      originHead: normalized.gitFacts.originHead,
      remoteMainHead: normalized.gitFacts.remoteMainHead,
      dirtyStatusLineCount: normalized.gitFacts.statusShortLines.length
    },
    requiredBasis: { ...REQUIRED_BASIS },
    requiredWriteSeam: { ...REQUIRED_WRITE_SEAM },
    requiredScopeAssumptions: { ...REQUIRED_SCOPE_ASSUMPTIONS },
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
      claimsWriteReliable: false,
      claimsReadiness: false
    }
  };
}

module.exports = {
  CM0737_BASIS_ID,
  EXACT_WRITE_APPROVAL_LINE,
  PREFLIGHT_STATUS_BLOCKED,
  PREFLIGHT_STATUS_READY,
  REQUIRED_BASIS,
  REQUIRED_BOUNDARY_FLAGS,
  REQUIRED_SCOPE_ASSUMPTIONS,
  REQUIRED_WRITE_SEAM,
  evaluateWriteProofExecutionPreflight,
  normalizePreflightInput
};
