'use strict';

const {
  INVENTORY_CLASSES
} = require('./SelectedAuditCorrelationDirtyScopeInventory');

const DECISION_CLASSES = Object.freeze({
  CLEAN_SCOPE_RERUN_STAGE_GATE_NOT_APPROVAL: 'CLEAN_SCOPE_RERUN_STAGE_GATE_NOT_APPROVAL',
  KNOWN_DIRTY_SCOPE_HUMAN_REVIEW_REQUIRED_NOT_MUTATED: 'KNOWN_DIRTY_SCOPE_HUMAN_REVIEW_REQUIRED_NOT_MUTATED',
  UNKNOWN_DIRTY_SCOPE_BLOCKED_NOT_MUTATED: 'UNKNOWN_DIRTY_SCOPE_BLOCKED_NOT_MUTATED',
  FAIL_CLOSED_INVENTORY_MISSING: 'FAIL_CLOSED_INVENTORY_MISSING',
  FAIL_CLOSED_OVERCLAIM_OR_MUTATION_SIGNAL: 'FAIL_CLOSED_OVERCLAIM_OR_MUTATION_SIGNAL',
  FAIL_CLOSED_UNSUPPORTED_INVENTORY_CLASS: 'FAIL_CLOSED_UNSUPPORTED_INVENTORY_CLASS'
});

const REVIEW_BUNDLE_ORDER = Object.freeze([
  'operator_status_surfaces',
  'recall_proof_review_docs',
  'write_governance_review_docs',
  'selected_audit_correlation_chain',
  'selected_audit_correlation_source_tests',
  'audit_log_store_helper'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEntries(values) {
  return Array.isArray(values)
    ? values.filter(isPlainObject).map(entry => ({
      path: normalizeString(entry.path),
      status: normalizeString(entry.status),
      bucket: normalizeString(entry.bucket)
    })).filter(entry => entry.path)
    : [];
}

function entriesFromBucket(inventory, bucket) {
  return normalizeEntries(inventory.buckets?.[bucket]);
}

function docsByRange(entries, predicate) {
  return entries.filter(entry => predicate(entry.path));
}

function buildReviewBundles(inventory) {
  const cmDocs = entriesFromBucket(inventory, 'cm_evidence_docs');
  const bundles = {
    operator_status_surfaces: [
      ...entriesFromBucket(inventory, 'agent_board'),
      ...entriesFromBucket(inventory, 'status_surface'),
      ...entriesFromBucket(inventory, 'current_truth_table')
    ],
    recall_proof_review_docs: docsByRange(cmDocs, path => /^docs\/CM0?82[5-7]_/.test(path)),
    write_governance_review_docs: docsByRange(cmDocs, path => /^docs\/CM11(0[5-9]|1[0-7])_/.test(path)),
    selected_audit_correlation_chain: [
      ...docsByRange(cmDocs, path => /^docs\/CM11(1[8-9]|2[0-9]|3[0-9])_/.test(path)),
      ...entriesFromBucket(inventory, 'selected_audit_correlation_cli'),
      ...entriesFromBucket(inventory, 'selected_audit_correlation_core'),
      ...entriesFromBucket(inventory, 'selected_audit_correlation_tests')
    ],
    selected_audit_correlation_source_tests: [
      ...entriesFromBucket(inventory, 'selected_audit_correlation_cli'),
      ...entriesFromBucket(inventory, 'selected_audit_correlation_core'),
      ...entriesFromBucket(inventory, 'selected_audit_correlation_tests')
    ],
    audit_log_store_helper: entriesFromBucket(inventory, 'audit_log_store_helper')
  };

  return REVIEW_BUNDLE_ORDER.map(name => ({
    name,
    pathCount: bundles[name].length,
    paths: bundles[name].map(entry => entry.path)
  }));
}

function hasMutationOrOverclaimSignal(report, inventory) {
  return report.commitAuthorized === true ||
    report.cleanAuthorized === true ||
    report.approvalRequestsAllowedNow === true ||
    report.readinessClaimAllowed === true ||
    report.reliabilityClaimAllowed === true ||
    inventory.commitAuthorized === true ||
    inventory.cleanAuthorized === true ||
    inventory.approvalRequestsAllowedNow === true ||
    inventory.readinessClaimAllowed === true ||
    inventory.reliabilityClaimAllowed === true ||
    inventory.safety?.commits === true ||
    inventory.safety?.cleansWorktree === true ||
    inventory.safety?.appliesMutation === true ||
    inventory.safety?.claimsReadiness === true ||
    inventory.safety?.claimsRecallReliable === true ||
    inventory.safety?.claimsWriteReliable === true;
}

function baseDecision(decisionClass, report, inventory, extra = {}) {
  return {
    decisionClass,
    ...extra,
    status: 'blocked',
    inventoryClass: normalizeString(report.inventoryClass || inventory.inventoryClass),
    worktreeClean: inventory.worktreeClean === true,
    dirtyLineCount: Number.isInteger(inventory.dirtyLineCount) ? inventory.dirtyLineCount : 0,
    knownDirtyLineCount: Number.isInteger(inventory.knownDirtyLineCount) ? inventory.knownDirtyLineCount : 0,
    unknownDirtyLineCount: Number.isInteger(inventory.unknownDirtyLineCount) ? inventory.unknownDirtyLineCount : 0,
    reviewBundles: extra.reviewBundles || [],
    humanReviewRequired: extra.humanReviewRequired === true,
    commitDecisionPrepared: extra.commitDecisionPrepared === true,
    commitAuthorized: false,
    cleanAuthorized: false,
    approvalRequestsAllowedNow: false,
    cm1111ApprovalRequestAllowed: false,
    cm1115ApprovalRequestAllowed: false,
    cm1120ApprovalRequestAllowed: false,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    nextStep: extra.nextStep || 'Keep dirty scope blocked until a separate human-reviewed isolation decision exists.',
    safety: {
      sourceMode: 'explicit_inventory_input_only',
      readsFileContents: false,
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
    }
  };
}

function summarizeSelectedAuditCorrelationDirtyScopeIsolationDecision(inventoryReport = {}) {
  if (!isPlainObject(inventoryReport)) {
    return baseDecision(
      DECISION_CLASSES.FAIL_CLOSED_INVENTORY_MISSING,
      {},
      {},
      {
        reason: 'inventory_report_missing_or_malformed',
        nextStep: 'Run CM-1132 dirty-scope inventory first.'
      }
    );
  }

  const inventory = isPlainObject(inventoryReport.inventory)
    ? inventoryReport.inventory
    : inventoryReport;
  const inventoryClass = normalizeString(inventoryReport.inventoryClass || inventory.inventoryClass);

  if (!inventoryClass) {
    return baseDecision(
      DECISION_CLASSES.FAIL_CLOSED_INVENTORY_MISSING,
      inventoryReport,
      inventory,
      {
        reason: 'inventory_class_missing',
        nextStep: 'Run CM-1132 dirty-scope inventory first.'
      }
    );
  }

  if (hasMutationOrOverclaimSignal(inventoryReport, inventory)) {
    return baseDecision(
      DECISION_CLASSES.FAIL_CLOSED_OVERCLAIM_OR_MUTATION_SIGNAL,
      inventoryReport,
      inventory,
      {
        reason: 'inventory_attempted_mutation_or_overclaim_authority',
        nextStep: 'Stop; rebuild the isolation decision from a no-mutation CM-1132 inventory.'
      }
    );
  }

  if (inventoryClass === INVENTORY_CLASSES.CLEAN_WORKTREE_NO_DIRTY_SCOPE) {
    return baseDecision(
      DECISION_CLASSES.CLEAN_SCOPE_RERUN_STAGE_GATE_NOT_APPROVAL,
      inventoryReport,
      inventory,
      {
        reason: 'worktree_clean_for_stage_gate_rerun',
        nextStep: 'Rerun CM-1131 stage gate; do not infer approval from the clean inventory.'
      }
    );
  }

  if (inventoryClass === INVENTORY_CLASSES.UNKNOWN_DIRTY_SCOPE_FAIL_CLOSED) {
    return baseDecision(
      DECISION_CLASSES.UNKNOWN_DIRTY_SCOPE_BLOCKED_NOT_MUTATED,
      inventoryReport,
      inventory,
      {
        reason: 'unknown_dirty_scope_present',
        humanReviewRequired: true,
        unknownPaths: normalizeEntries(inventory.unknownEntries).map(entry => entry.path),
        nextStep: 'Inspect unknown dirty paths before any isolation, commit, cleanup, or approval request.'
      }
    );
  }

  if (inventoryClass === INVENTORY_CLASSES.KNOWN_CM_EVIDENCE_SCOPE_DIRTY_NOT_CLEAN) {
    const reviewBundles = buildReviewBundles(inventory);
    return baseDecision(
      DECISION_CLASSES.KNOWN_DIRTY_SCOPE_HUMAN_REVIEW_REQUIRED_NOT_MUTATED,
      inventoryReport,
      inventory,
      {
        reason: 'known_cm_evidence_dirty_scope_requires_human_review',
        humanReviewRequired: true,
        commitDecisionPrepared: true,
        reviewBundles,
        nextStep: 'Review bundles and make a separate explicit isolation or commit decision; this report does not authorize staging, commit, clean, or approval requests.'
      }
    );
  }

  return baseDecision(
    DECISION_CLASSES.FAIL_CLOSED_UNSUPPORTED_INVENTORY_CLASS,
    inventoryReport,
    inventory,
    {
      reason: 'inventory_class_not_supported_for_isolation_decision',
      nextStep: 'Keep dirty scope blocked until CM-1132 returns a supported inventory class.'
    }
  );
}

module.exports = {
  DECISION_CLASSES,
  REVIEW_BUNDLE_ORDER,
  buildReviewBundles,
  summarizeSelectedAuditCorrelationDirtyScopeIsolationDecision
};
