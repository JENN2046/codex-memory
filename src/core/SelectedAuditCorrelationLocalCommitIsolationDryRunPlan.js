'use strict';

const {
  PREFLIGHT_CLASSES
} = require('./SelectedAuditCorrelationLocalCommitIsolationPreflight');

const PLAN_CLASSES = Object.freeze({
  BLOCKED_PREFLIGHT_NOT_ACCEPTED: 'BLOCKED_PREFLIGHT_NOT_ACCEPTED',
  FAIL_CLOSED_MUTATION_OR_OVERCLAIM_SIGNAL: 'FAIL_CLOSED_MUTATION_OR_OVERCLAIM_SIGNAL',
  LOCAL_COMMIT_ISOLATION_DRY_RUN_PLAN_READY_NOT_EXECUTED: 'LOCAL_COMMIT_ISOLATION_DRY_RUN_PLAN_READY_NOT_EXECUTED'
});

const REQUIRED_VALIDATION = Object.freeze([
  'git branch --show-current',
  'git status --short',
  'git diff --stat',
  'git diff',
  'node .\\scripts\\validate_autopilot_ledger_consistency.js',
  'powershell -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\validate-local.ps1 -Area docs',
  'git diff --check',
  'focused overclaim/secret scan over intended commit scope'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasMutationOrOverclaimSignal(preflight = {}) {
  return preflight.commitAuthorized === true ||
    preflight.cleanAuthorized === true ||
    preflight.pushAuthorized === true ||
    preflight.readinessClaimAllowed === true ||
    preflight.reliabilityClaimAllowed === true ||
    preflight.safety?.commits === true ||
    preflight.safety?.cleansWorktree === true ||
    preflight.safety?.pushes === true ||
    preflight.safety?.appliesMutation === true ||
    preflight.safety?.claimsReadiness === true ||
    preflight.safety?.claimsRecallReliable === true ||
    preflight.safety?.claimsWriteReliable === true;
}

function basePlan(planClass, extra = {}) {
  return {
    status: 'blocked',
    planClass,
    planPrepared: false,
    dryRunOnly: true,
    stageCommandsPrepared: false,
    commitCommandPrepared: false,
    commitExecutableNow: false,
    pushExecutableNow: false,
    cleanExecutableNow: false,
    approvalRequestsAllowedNow: false,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    plannedActions: [],
    requiredValidation: [...REQUIRED_VALIDATION],
    nextStep: 'Keep dirty scope blocked until CM-1136 preflight is accepted and a separate executor step is explicitly requested.',
    safety: {
      sourceMode: 'explicit_preflight_report_only',
      readsCurrentGitFacts: false,
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
      stages: false,
      commits: false,
      cleansWorktree: false,
      pushes: false,
      expandsPublicMcp: false,
      changesConfigWatchdogStartup: false,
      claimsWriteReliable: false,
      claimsRecallReliable: false,
      claimsReadiness: false
    },
    ...extra
  };
}

function buildSelectedAuditCorrelationLocalCommitIsolationDryRunPlan(preflightReport = {}) {
  const report = isPlainObject(preflightReport) ? preflightReport : {};
  const preflight = isPlainObject(report.preflight) ? report.preflight : report;
  const preflightClass = report.preflightClass || preflight.preflightClass || '';

  if (hasMutationOrOverclaimSignal(report) || hasMutationOrOverclaimSignal(preflight)) {
    return basePlan(PLAN_CLASSES.FAIL_CLOSED_MUTATION_OR_OVERCLAIM_SIGNAL, {
      reason: 'preflight_report_attempted_mutation_or_overclaim_authority',
      preflightClass
    });
  }

  if (
    report.status !== 'accepted_not_executed' ||
    preflightClass !== PREFLIGHT_CLASSES.ACCEPTED_FOR_SEPARATE_LOCAL_COMMIT_EXECUTION_NOT_EXECUTED ||
    report.localCommitExecutionAllowedNow !== true
  ) {
    return basePlan(PLAN_CLASSES.BLOCKED_PREFLIGHT_NOT_ACCEPTED, {
      reason: 'cm1136_preflight_not_accepted',
      preflightClass,
      preflightStatus: report.status || preflight.status || 'unknown'
    });
  }

  return basePlan(PLAN_CLASSES.LOCAL_COMMIT_ISOLATION_DRY_RUN_PLAN_READY_NOT_EXECUTED, {
    status: 'ready_not_executed',
    reason: 'cm1136_preflight_accepted_but_plan_is_dry_run_only',
    preflightClass,
    planPrepared: true,
    commitExecutableNow: false,
    plannedActions: [
      {
        order: 1,
        action: 'stage_known_cm_evidence_dirty_scope',
        executes: false
      },
      {
        order: 2,
        action: 'create_one_local_commit_for_dirty_scope_isolation',
        executes: false
      },
      {
        order: 3,
        action: 'rerun_cm1131_stage_gate_after_clean_or_isolated_worktree',
        executes: false
      }
    ],
    nextStep: 'If a separate executor step is later approved, run required validation first and keep the action local-only with no push.'
  });
}

module.exports = {
  PLAN_CLASSES,
  REQUIRED_VALIDATION,
  buildSelectedAuditCorrelationLocalCommitIsolationDryRunPlan
};
