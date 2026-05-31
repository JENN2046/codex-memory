'use strict';

const CM1120_BASIS_ID = 'CM-1120';
const TARGET_HEAD = '16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d';
const TARGET_MEMORY_ID = 'codex-process-50325be15fdb479d805728fe420b4838';
const REQUEST_SHA256 = 'dfe4edcece5d561bbcdcdf38764679f6822cad77939dea06d68788a9840bad8e';
const PREFLIGHT_STATUS_READY = 'SELECTED_AUDIT_CORRELATION_OBSERVATION_PREFLIGHT_READY_NOT_EXECUTED';
const PREFLIGHT_STATUS_BLOCKED = 'SELECTED_AUDIT_CORRELATION_OBSERVATION_PREFLIGHT_BLOCKED_NOT_EXECUTED';

const EXACT_APPROVAL_LINE = [
  'I approve CM1120_EXACT_APPROVED_SELECTED_AUDIT_CORRELATION_OBSERVATION_ONCE for codex-memory at HEAD',
  TARGET_HEAD + ',',
  'only after CM-1111 has returned APPLIED_TOMBSTONED_SANITIZED and CM-1115 has returned',
  'METADATA_STATUS_TOMBSTONED_EXPECTED_SCOPE for memory id',
  TARGET_MEMORY_ID + ',',
  'using only AuditLogStore.readSelectedWriteAuditCorrelation through the current CM-1118 selected-field helper,',
  'interpreted only by the CM-1119 matrix, limited to exactly one selected audit-correlation observation matching',
  'request_sha256 ' + REQUEST_SHA256 + ',',
  'with memoryId=' + TARGET_MEMORY_ID + ', eventType=memory_tombstone, toolName=memory_tombstone,',
  'requestSource=CM-1111-proof-memory-retention-apply, default-or-less maxLines/maxBytes,',
  'selected sanitized output only, no raw memory output, no raw store/audit/diary/.jsonl output,',
  'no content/evidence/raw text read, no provider/model/API call, no durable memory/audit write,',
  'no record_memory/search_memory/memory_overview/tombstone-memory CLI, no tombstone/cleanup/rollback/migration/import/export/backup/restore apply,',
  'no config/watchdog/startup/package change, no public MCP expansion, no push/tag/release/deploy/cutover,',
  'and no readiness or reliability claim.'
].join(' ');

const REQUIRED_PRIOR_RESULTS = Object.freeze([
  Object.freeze({
    taskId: 'CM-1111',
    resultClass: 'APPLIED_TOMBSTONED_SANITIZED'
  }),
  Object.freeze({
    taskId: 'CM-1115',
    resultClass: 'METADATA_STATUS_TOMBSTONED_EXPECTED_SCOPE'
  })
]);

const REQUIRED_CURRENT_ARTIFACTS = Object.freeze([
  Object.freeze({
    taskId: 'CM-1118',
    resultClass: 'CM1118_SELECTED_AUDIT_CORRELATION_READER_TEMP_FIXTURE_EVIDENCE_COMPLETED_NOT_LIVE_NOT_READY',
    helper: 'AuditLogStore.readSelectedWriteAuditCorrelation'
  }),
  Object.freeze({
    taskId: 'CM-1119',
    resultClass: 'CM1119_SELECTED_AUDIT_CORRELATION_RESULT_INTERPRETATION_MATRIX_COMPLETED_NOT_EXECUTED_NOT_READY',
    helper: ''
  })
]);

const REQUIRED_OBSERVATION_SURFACE = Object.freeze({
  surface: 'AuditLogStore.readSelectedWriteAuditCorrelation',
  maxSelectedAuditCorrelationReads: 1,
  maxLines: 'default_or_less',
  maxBytes: 'default_or_less',
  memoryId: TARGET_MEMORY_ID,
  eventType: 'memory_tombstone',
  toolName: 'memory_tombstone',
  requestSource: 'CM-1111-proof-memory-retention-apply',
  interpretationMatrix: 'CM1119_SELECTED_AUDIT_CORRELATION_RESULT_INTERPRETATION_MATRIX'
});

const REQUIRED_BOUNDARY_FLAGS = Object.freeze({
  selectedSanitizedOutputOnly: true,
  rawMemoryOutput: false,
  rawStoreRead: false,
  rawAuditOutput: false,
  directJsonlRead: false,
  contentEvidenceRawTextRead: false,
  providerApiCallCount: 0,
  recordMemoryCallCount: 0,
  searchMemoryCallCount: 0,
  memoryOverviewCallCount: 0,
  tombstoneMemoryCliRuns: 0,
  durableMemoryAuditWrite: false,
  tombstoneApply: false,
  cleanupApply: false,
  rollbackApply: false,
  migrationImportExportBackupRestoreApply: false,
  publicMcpExpansion: false,
  configWatchdogStartupPackageChange: false,
  pushTagReleaseDeployCutover: false,
  readinessClaimed: false,
  reliabilityClaimed: false
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function firstNormalizedString(...values) {
  for (const value of values) {
    const normalized = normalizeString(value);
    if (normalized) return normalized;
  }
  return '';
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

function normalizeTemplateObject(value = {}, template = {}) {
  const safeValue = isPlainObject(value) ? value : {};
  const normalized = {};
  for (const [key, expected] of Object.entries(template)) {
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

function normalizePriorResults(value = []) {
  return (Array.isArray(value) ? value : [])
    .filter(isPlainObject)
    .map(item => ({
      taskId: firstNormalizedString(item.taskId, item.task_id),
      resultClass: firstNormalizedString(item.resultClass, item.result_class)
    }));
}

function normalizeCurrentArtifacts(value = []) {
  return (Array.isArray(value) ? value : [])
    .filter(isPlainObject)
    .map(item => ({
      taskId: firstNormalizedString(item.taskId, item.task_id),
      resultClass: firstNormalizedString(item.resultClass, item.result_class),
      helper: normalizeString(item.helper)
    }));
}

function normalizePreflightInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  return {
    basisId: normalizeString(safeInput.basisId) || CM1120_BASIS_ID,
    approvalLine: normalizeString(safeInput.approvalLine),
    packetId: firstNormalizedString(safeInput.packetId, safeInput.packet_id),
    requestSha256: firstNormalizedString(safeInput.requestSha256, safeInput.request_sha256),
    gitFacts: normalizeGitFacts(safeInput.gitFacts),
    priorResults: normalizePriorResults(safeInput.priorResults || safeInput.prior_results),
    currentArtifacts: normalizeCurrentArtifacts(safeInput.currentArtifacts || safeInput.current_artifacts),
    observationSurface: normalizeTemplateObject(safeInput.observationSurface || safeInput.observation_surface, REQUIRED_OBSERVATION_SURFACE),
    boundaryFlags: normalizeTemplateObject(safeInput.boundaryFlags || safeInput.boundary_flags, REQUIRED_BOUNDARY_FLAGS)
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
  for (const key of ['localHead', 'originHead', 'remoteMainHead']) {
    if (!isFortyCharHex(gitFacts[key])) {
      blockers.push(`${key}_missing_or_malformed`);
    } else if (gitFacts[key] !== TARGET_HEAD) {
      blockers.push(`${key}_target_head_mismatch`);
    }
  }
  if (gitFacts.statusShortLines.length > 0) {
    blockers.push('dirty_worktree');
  }
  return blockers;
}

function collectApprovalBlockers(normalized) {
  const blockers = [];
  if (normalized.approvalLine !== EXACT_APPROVAL_LINE) {
    blockers.push('exact_approval_line_missing_or_mismatched');
  }
  if (normalized.packetId !== 'CM-1120-SELECTED-AUDIT-CORRELATION-OBSERVATION-APPROVAL-001') {
    blockers.push('packet_id_mismatch');
  }
  if (normalized.requestSha256 !== REQUEST_SHA256) {
    blockers.push('request_sha256_mismatch');
  }
  return blockers;
}

function collectRequiredListBlockers(actual, required, prefix) {
  const blockers = [];
  for (const requiredItem of required) {
    const match = actual.find(item => item.taskId === requiredItem.taskId);
    if (!match) {
      blockers.push(`${prefix}_${requiredItem.taskId}_missing`);
      continue;
    }
    if (match.resultClass !== requiredItem.resultClass) {
      blockers.push(`${prefix}_${requiredItem.taskId}_result_class_mismatch`);
    }
    if (Object.prototype.hasOwnProperty.call(requiredItem, 'helper') && match.helper !== requiredItem.helper) {
      blockers.push(`${prefix}_${requiredItem.taskId}_helper_mismatch`);
    }
  }
  const requiredTaskIds = new Set(required.map(item => item.taskId));
  for (const item of actual) {
    if (!requiredTaskIds.has(item.taskId)) {
      blockers.push(`${prefix}_unexpected_${item.taskId || 'unknown'}`);
    }
  }
  return blockers;
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

function evaluateSelectedAuditCorrelationObservationPreflight(input = {}) {
  const normalized = normalizePreflightInput(input);
  const blockerReasons = [
    ...collectApprovalBlockers(normalized),
    ...collectGitBlockers(normalized.gitFacts),
    ...collectRequiredListBlockers(normalized.priorResults, REQUIRED_PRIOR_RESULTS, 'prior_result'),
    ...collectRequiredListBlockers(normalized.currentArtifacts, REQUIRED_CURRENT_ARTIFACTS, 'current_artifact'),
    ...collectTemplateBlockers(normalized.observationSurface, REQUIRED_OBSERVATION_SURFACE, 'observation_surface'),
    ...collectTemplateBlockers(normalized.boundaryFlags, REQUIRED_BOUNDARY_FLAGS, 'boundary_flag')
  ];
  const uniqueBlockers = [...new Set(blockerReasons)];
  const acceptedForExecutionPreflight = uniqueBlockers.length === 0;

  return {
    taskId: 'CM-1121_SELECTED_AUDIT_CORRELATION_OBSERVATION_PREFLIGHT',
    basisId: normalized.basisId,
    status: acceptedForExecutionPreflight ? PREFLIGHT_STATUS_READY : PREFLIGHT_STATUS_BLOCKED,
    acceptedForExecutionPreflight,
    executionStarted: false,
    auditObservationStarted: false,
    preflightOnly: true,
    separateExactApprovalRequired: true,
    implicitAuditReadAuthorizationGranted: false,
    exactApprovalLineMatched: normalized.approvalLine === EXACT_APPROVAL_LINE,
    requestHashMatched: normalized.requestSha256 === REQUEST_SHA256,
    cleanTargetHead: collectGitBlockers(normalized.gitFacts).length === 0,
    requiredPriorResultsBound: collectRequiredListBlockers(normalized.priorResults, REQUIRED_PRIOR_RESULTS, 'prior_result').length === 0,
    currentArtifactsBound: collectRequiredListBlockers(normalized.currentArtifacts, REQUIRED_CURRENT_ARTIFACTS, 'current_artifact').length === 0,
    observationSurfaceBound: collectTemplateBlockers(normalized.observationSurface, REQUIRED_OBSERVATION_SURFACE, 'observation_surface').length === 0,
    boundaryFlagsBound: collectTemplateBlockers(normalized.boundaryFlags, REQUIRED_BOUNDARY_FLAGS, 'boundary_flag').length === 0,
    blockerReasons: uniqueBlockers,
    normalizedGitFacts: {
      branch: normalized.gitFacts.branch,
      localHead: normalized.gitFacts.localHead,
      originHead: normalized.gitFacts.originHead,
      remoteMainHead: normalized.gitFacts.remoteMainHead,
      dirtyStatusLineCount: normalized.gitFacts.statusShortLines.length
    },
    requiredPriorResults: REQUIRED_PRIOR_RESULTS.map(item => ({ ...item })),
    requiredCurrentArtifacts: REQUIRED_CURRENT_ARTIFACTS.map(item => ({ ...item })),
    requiredObservationSurface: { ...REQUIRED_OBSERVATION_SURFACE },
    requiredBoundaryFlags: { ...REQUIRED_BOUNDARY_FLAGS },
    safety: {
      sourceMode: 'explicit_input_only',
      readsFiles: false,
      executesCommands: false,
      readsTrueAuditLog: false,
      readsRawAudit: false,
      readsRawMemory: false,
      readsJsonl: false,
      callsRecordMemory: false,
      callsSearchMemory: false,
      callsMemoryOverview: false,
      callsProvider: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      appliesTombstone: false,
      appliesCleanup: false,
      appliesRollback: false,
      expandsPublicMcp: false,
      changesConfigWatchdogStartup: false,
      claimsWriteReliable: false,
      claimsRecallReliable: false,
      claimsReadiness: false
    }
  };
}

module.exports = {
  CM1120_BASIS_ID,
  EXACT_APPROVAL_LINE,
  PREFLIGHT_STATUS_BLOCKED,
  PREFLIGHT_STATUS_READY,
  REQUEST_SHA256,
  REQUIRED_BOUNDARY_FLAGS,
  REQUIRED_CURRENT_ARTIFACTS,
  REQUIRED_OBSERVATION_SURFACE,
  REQUIRED_PRIOR_RESULTS,
  TARGET_HEAD,
  TARGET_MEMORY_ID,
  evaluateSelectedAuditCorrelationObservationPreflight,
  normalizePreflightInput
};
