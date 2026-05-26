'use strict';

const {
  READINESS_CLASSES
} = require('./SelectedAuditCorrelationExecutionReadiness');

const REVIEW_CLASSES = Object.freeze({
  BLOCKED_CURRENT_FACTS_NOT_READY: 'BLOCKED_CURRENT_FACTS_NOT_READY',
  READY_FOR_SEPARATE_EXACT_OBSERVATION_NOT_DOWNGRADE: 'READY_FOR_SEPARATE_EXACT_OBSERVATION_NOT_DOWNGRADE',
  SELECTED_AUDIT_OBSERVED_BUT_FOLLOWUP_MISSING_NOT_DOWNGRADE: 'SELECTED_AUDIT_OBSERVED_BUT_FOLLOWUP_MISSING_NOT_DOWNGRADE',
  DOWNGRADE_ALLOWED_NARROW_NOT_READY: 'DOWNGRADE_ALLOWED_NARROW_NOT_READY',
  FAIL_CLOSED_REPORT_MISSING: 'FAIL_CLOSED_REPORT_MISSING',
  FAIL_CLOSED_OVERCLAIM_SIGNAL: 'FAIL_CLOSED_OVERCLAIM_SIGNAL',
  FAIL_CLOSED_UNAUTHORIZED_SIDE_EFFECT_SIGNAL: 'FAIL_CLOSED_UNAUTHORIZED_SIDE_EFFECT_SIGNAL',
  FAIL_CLOSED_INCONSISTENT_DOWNGRADE_SIGNAL: 'FAIL_CLOSED_INCONSISTENT_DOWNGRADE_SIGNAL',
  FAIL_CLOSED_UNFAVORABLE_READINESS: 'FAIL_CLOSED_UNFAVORABLE_READINESS'
});

const FORBIDDEN_SAFETY_FLAGS = Object.freeze([
  'readsObservationInput',
  'readsTrueAuditLog',
  'readsRawAudit',
  'readsRawMemory',
  'readsJsonl',
  'callsRecordMemory',
  'callsSearchMemory',
  'callsMemoryOverview',
  'callsProvider',
  'writesDurableMemory',
  'writesDurableAudit',
  'appliesMutation',
  'expandsPublicMcp',
  'changesConfigWatchdogStartup',
  'claimsWriteReliable',
  'claimsRecallReliable',
  'claimsReadiness'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeArray(value) {
  return (Array.isArray(value) ? value : [])
    .map(normalizeString)
    .filter(Boolean);
}

function mergeSafetyFlags(report, readiness) {
  const readinessSafety = isPlainObject(readiness?.safety) ? readiness.safety : {};
  const reportSafety = isPlainObject(report?.safety) ? report.safety : {};
  const merged = {
    ...readinessSafety,
    ...reportSafety
  };
  for (const flag of FORBIDDEN_SAFETY_FLAGS) {
    merged[flag] = readinessSafety[flag] === true || reportSafety[flag] === true;
  }
  return merged;
}

function firstTrueForbiddenFlag(safety) {
  return FORBIDDEN_SAFETY_FLAGS.find(flag => safety[flag] === true) || null;
}

function baseReview(reviewClass, report, readiness, extra = {}) {
  const blockerReasons = normalizeArray(
    report.currentFactsBlockerReasons || readiness.preflightBlockerReasons
  );
  return {
    reviewClass,
    ...extra,
    status: 'blocked',
    readinessClass: normalizeString(report.readinessClass || readiness.readinessClass),
    currentFactsStatus: normalizeString(report.currentFactsStatus),
    currentFactsBlockerReasons: blockerReasons,
    classificationResultClass: normalizeString(
      report.classification?.resultClass || readiness.classificationResultClass
    ),
    allowedDowngrade: normalizeString(readiness.allowedDowngrade || report.allowedDowngrade),
    blockerDowngradeAllowed: extra.blockerDowngradeAllowed === true,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    readinessAcceptedAsEvidence: false,
    reliabilityAcceptedAsEvidence: false,
    downgradeScope: extra.blockerDowngradeAllowed === true
      ? 'one_exact_selected_audit_correlation_blocker_only'
      : 'none',
    nextStep: extra.nextStep || 'Do not downgrade blockers or claim readiness/reliability.'
  };
}

function normalizeReport(value = {}) {
  if (!isPlainObject(value)) {
    return null;
  }

  const readiness = isPlainObject(value.readiness) ? value.readiness : {};
  const safety = mergeSafetyFlags(value, readiness);

  return {
    report: value,
    readiness,
    safety,
    readinessClass: normalizeString(value.readinessClass || readiness.readinessClass),
    blockerDowngradeAllowed: value.blockerDowngradeAllowed === true || readiness.blockerDowngradeAllowed === true,
    readinessClaimAllowed: value.readinessClaimAllowed === true || readiness.readinessClaimAllowed === true,
    reliabilityClaimAllowed: value.reliabilityClaimAllowed === true || readiness.reliabilityClaimAllowed === true
  };
}

function reviewSelectedAuditCorrelationBlockerDowngrade(readinessReport = {}) {
  const normalized = normalizeReport(readinessReport);
  if (!normalized || !normalized.readinessClass) {
    return baseReview(
      REVIEW_CLASSES.FAIL_CLOSED_REPORT_MISSING,
      {},
      {},
      {
        reason: 'readiness_report_missing_or_malformed',
        nextStep: 'Run CM-1127 current-facts readiness first; do not infer downgrade eligibility.'
      }
    );
  }

  const { report, readiness, safety, readinessClass } = normalized;
  const forbiddenFlag = firstTrueForbiddenFlag(safety);

  if (normalized.readinessClaimAllowed || normalized.reliabilityClaimAllowed) {
    return baseReview(
      REVIEW_CLASSES.FAIL_CLOSED_OVERCLAIM_SIGNAL,
      report,
      readiness,
      {
        reason: 'readiness_report_attempted_readiness_or_reliability_claim',
        nextStep: 'Stop; downgrade review cannot consume overclaiming evidence.'
      }
    );
  }

  if (forbiddenFlag) {
    return baseReview(
      REVIEW_CLASSES.FAIL_CLOSED_UNAUTHORIZED_SIDE_EFFECT_SIGNAL,
      report,
      readiness,
      {
        reason: `readiness_report_contains_forbidden_side_effect_flag:${forbiddenFlag}`,
        forbiddenFlag,
        nextStep: 'Stop; rebuild the report through the no-execution current-facts path.'
      }
    );
  }

  if (
    normalized.blockerDowngradeAllowed
    && readinessClass !== READINESS_CLASSES.SELECTED_AUDIT_CORRELATION_DOWNGRADE_ALLOWED_NOT_READY
  ) {
    return baseReview(
      REVIEW_CLASSES.FAIL_CLOSED_INCONSISTENT_DOWNGRADE_SIGNAL,
      report,
      readiness,
      {
        reason: 'downgrade_allowed_flag_without_favorable_readiness_class',
        nextStep: 'Stop before recording any blocker downgrade.'
      }
    );
  }

  if (
    readinessClass === READINESS_CLASSES.SELECTED_AUDIT_CORRELATION_DOWNGRADE_ALLOWED_NOT_READY
    && !normalized.blockerDowngradeAllowed
  ) {
    return baseReview(
      REVIEW_CLASSES.FAIL_CLOSED_INCONSISTENT_DOWNGRADE_SIGNAL,
      report,
      readiness,
      {
        reason: 'favorable_readiness_class_without_downgrade_allowed_flag',
        nextStep: 'Stop before recording any blocker downgrade.'
      }
    );
  }

  if (readinessClass === READINESS_CLASSES.BLOCKED_PREFLIGHT_NOT_READY) {
    return baseReview(
      REVIEW_CLASSES.BLOCKED_CURRENT_FACTS_NOT_READY,
      report,
      readiness,
      {
        reason: 'current_facts_preflight_not_ready',
        nextStep: 'Do not execute selected audit observation; resolve current-facts blockers and keep downgrade blocked.'
      }
    );
  }

  if (readinessClass === READINESS_CLASSES.READY_FOR_SEPARATE_EXACT_SELECTED_OBSERVATION_NOT_EXECUTED) {
    return baseReview(
      REVIEW_CLASSES.READY_FOR_SEPARATE_EXACT_OBSERVATION_NOT_DOWNGRADE,
      report,
      readiness,
      {
        reason: 'preflight_ready_but_selected_observation_not_executed',
        nextStep: 'Require separate exact approval and selected sanitized observation before any blocker downgrade.'
      }
    );
  }

  if (readinessClass === READINESS_CLASSES.SELECTED_AUDIT_OBSERVED_BUT_FOLLOWUP_MISSING) {
    return baseReview(
      REVIEW_CLASSES.SELECTED_AUDIT_OBSERVED_BUT_FOLLOWUP_MISSING_NOT_DOWNGRADE,
      report,
      readiness,
      {
        reason: 'selected_audit_observed_but_required_followup_missing',
        nextStep: 'Keep downgrade blocked until metadata lifecycle and recall suppression follow-up are both present.'
      }
    );
  }

  if (readinessClass === READINESS_CLASSES.SELECTED_AUDIT_CORRELATION_DOWNGRADE_ALLOWED_NOT_READY) {
    return baseReview(
      REVIEW_CLASSES.DOWNGRADE_ALLOWED_NARROW_NOT_READY,
      report,
      readiness,
      {
        reason: 'selected_audit_correlation_and_required_followup_observed',
        blockerDowngradeAllowed: true,
        nextStep: 'Record only the narrow blocker downgrade; keep reliability and readiness claims blocked.'
      }
    );
  }

  return baseReview(
    REVIEW_CLASSES.FAIL_CLOSED_UNFAVORABLE_READINESS,
    report,
    readiness,
    {
      reason: 'readiness_class_not_favorable_for_blocker_downgrade',
      nextStep: 'Stop before any blocker downgrade.'
    }
  );
}

module.exports = {
  FORBIDDEN_SAFETY_FLAGS,
  REVIEW_CLASSES,
  reviewSelectedAuditCorrelationBlockerDowngrade
};
