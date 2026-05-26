'use strict';

const INVENTORY_CLASSES = Object.freeze({
  CLEAN_WORKTREE_NO_DIRTY_SCOPE: 'CLEAN_WORKTREE_NO_DIRTY_SCOPE',
  KNOWN_CM_EVIDENCE_SCOPE_DIRTY_NOT_CLEAN: 'KNOWN_CM_EVIDENCE_SCOPE_DIRTY_NOT_CLEAN',
  UNKNOWN_DIRTY_SCOPE_FAIL_CLOSED: 'UNKNOWN_DIRTY_SCOPE_FAIL_CLOSED',
  FAIL_CLOSED_STATUS_MISSING: 'FAIL_CLOSED_STATUS_MISSING'
});

const KNOWN_BUCKETS = Object.freeze([
  'agent_board',
  'status_surface',
  'current_truth_table',
  'cm_evidence_docs',
  'selected_audit_correlation_cli',
  'selected_audit_correlation_core',
  'selected_audit_correlation_tests',
  'audit_log_store_helper'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeLines(value) {
  if (Array.isArray(value)) {
    return value.map(line => String(line).trimEnd()).filter(line => line.trim());
  }
  if (typeof value === 'string') {
    return value.split(/\r?\n/).map(line => line.trimEnd()).filter(line => line.trim());
  }
  return [];
}

function normalizePath(pathValue) {
  return normalizeString(pathValue).replace(/\\/g, '/');
}

function parseStatusLine(line) {
  const raw = String(line || '').trimEnd();
  if (!raw.trim()) {
    return null;
  }
  const status = raw.slice(0, 2).trim() || raw.slice(0, 2);
  const pathPart = raw.length > 3 ? raw.slice(3) : raw.slice(2).trim();
  const normalizedPath = normalizePath(pathPart.replace(/^"?(.+?)"?$/, '$1'));
  if (!normalizedPath) {
    return null;
  }
  return {
    raw,
    status,
    path: normalizedPath
  };
}

function bucketForPath(pathValue) {
  const path = normalizePath(pathValue);
  if (path.startsWith('.agent_board/')) {
    return 'agent_board';
  }
  if (path === 'STATUS.md') {
    return 'status_surface';
  }
  if (path === 'docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md') {
    return 'current_truth_table';
  }
  if (/^docs\/CM(?:0?825|0?826|0?827|11\d{2})[A-Z0-9_/-]*\.md$/i.test(path)) {
    return 'cm_evidence_docs';
  }
  if (path.startsWith('src/cli/selected-audit-correlation-')) {
    return 'selected_audit_correlation_cli';
  }
  if (path.startsWith('src/core/SelectedAuditCorrelation')) {
    return 'selected_audit_correlation_core';
  }
  if (path.startsWith('tests/selected-audit-correlation-')) {
    return 'selected_audit_correlation_tests';
  }
  if (path === 'tests/audit-log-store-selected-correlation.test.js') {
    return 'selected_audit_correlation_tests';
  }
  if (path === 'src/storage/AuditLogStore.js') {
    return 'audit_log_store_helper';
  }
  return 'unknown';
}

function summarizeSelectedAuditCorrelationDirtyScopeInventory(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const statusLines = normalizeLines(safeInput.statusShort || safeInput.statusLines);
  const entries = statusLines.map(parseStatusLine).filter(Boolean).map(entry => ({
    ...entry,
    bucket: bucketForPath(entry.path)
  }));

  if (!Array.isArray(safeInput.statusLines) && typeof safeInput.statusShort !== 'string') {
    return {
      inventoryClass: INVENTORY_CLASSES.FAIL_CLOSED_STATUS_MISSING,
      status: 'blocked',
      worktreeClean: false,
      dirtyLineCount: 0,
      knownDirtyLineCount: 0,
      unknownDirtyLineCount: 0,
      buckets: {},
      unknownEntries: [],
      commitAuthorized: false,
      cleanAuthorized: false,
      approvalRequestsAllowedNow: false,
      readinessClaimAllowed: false,
      reliabilityClaimAllowed: false,
      nextStep: 'Run the CM-1132 current-facts inventory CLI before trying to isolate dirty worktree scope.',
      safety: buildSafety()
    };
  }

  const buckets = {};
  for (const bucket of KNOWN_BUCKETS) {
    buckets[bucket] = [];
  }
  const unknownEntries = [];
  for (const entry of entries) {
    if (entry.bucket === 'unknown') {
      unknownEntries.push(entry);
    } else {
      buckets[entry.bucket].push(entry);
    }
  }

  const dirtyLineCount = entries.length;
  const unknownDirtyLineCount = unknownEntries.length;
  const knownDirtyLineCount = dirtyLineCount - unknownDirtyLineCount;
  const worktreeClean = dirtyLineCount === 0;
  const inventoryClass = worktreeClean
    ? INVENTORY_CLASSES.CLEAN_WORKTREE_NO_DIRTY_SCOPE
    : unknownDirtyLineCount > 0
      ? INVENTORY_CLASSES.UNKNOWN_DIRTY_SCOPE_FAIL_CLOSED
      : INVENTORY_CLASSES.KNOWN_CM_EVIDENCE_SCOPE_DIRTY_NOT_CLEAN;

  return {
    inventoryClass,
    status: 'blocked',
    worktreeClean,
    dirtyLineCount,
    knownDirtyLineCount,
    unknownDirtyLineCount,
    buckets,
    unknownEntries,
    commitAuthorized: false,
    cleanAuthorized: false,
    approvalRequestsAllowedNow: false,
    cm1111ApprovalRequestAllowed: false,
    cm1115ApprovalRequestAllowed: false,
    cm1120ApprovalRequestAllowed: false,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    nextStep: worktreeClean
      ? 'Rerun CM-1131 stage gate on the clean worktree before any approval request.'
      : unknownDirtyLineCount > 0
        ? 'Stop and inspect unknown dirty paths before any isolation, commit, cleanup, or approval request.'
        : 'Known CM evidence scope is dirty but not clean; prepare an explicit human-reviewed isolation or commit decision before approval requests.',
    safety: buildSafety()
  };
}

function buildSafety() {
  return {
    sourceMode: 'current_git_status_short_only',
    readsCurrentGitFacts: true,
    readsFileContents: false,
    readsObservationInput: false,
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
    appliesMutation: false,
    commits: false,
    cleansWorktree: false,
    expandsPublicMcp: false,
    changesConfigWatchdogStartup: false,
    claimsWriteReliable: false,
    claimsRecallReliable: false,
    claimsReadiness: false
  };
}

module.exports = {
  INVENTORY_CLASSES,
  KNOWN_BUCKETS,
  bucketForPath,
  parseStatusLine,
  summarizeSelectedAuditCorrelationDirtyScopeInventory
};
