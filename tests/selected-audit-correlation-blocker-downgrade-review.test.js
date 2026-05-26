'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  READINESS_CLASSES
} = require('../src/core/SelectedAuditCorrelationExecutionReadiness');
const {
  REVIEW_CLASSES,
  reviewSelectedAuditCorrelationBlockerDowngrade
} = require('../src/core/SelectedAuditCorrelationBlockerDowngradeReview');
const {
  buildReport
} = require('../src/cli/selected-audit-correlation-current-facts-readiness');
const {
  TARGET_HEAD
} = require('../src/core/SelectedAuditCorrelationObservationPreflight');

function gitRunnerForCleanHead(args) {
  const key = args.join(' ');
  const outputs = {
    'branch --show-current': 'main\n',
    'rev-parse HEAD': `${TARGET_HEAD}\n`,
    'rev-parse origin/main': `${TARGET_HEAD}\n`,
    'rev-parse refs/remotes/origin/main': `${TARGET_HEAD}\n`,
    'status --short': ''
  };
  return {
    status: 0,
    stdout: outputs[key] || '',
    stderr: '',
    error: ''
  };
}

function gitRunnerForDirtyHead(args) {
  if (args.join(' ') === 'status --short') {
    return {
      status: 0,
      stdout: ' M STATUS.md\n',
      stderr: '',
      error: ''
    };
  }
  return gitRunnerForCleanHead(args);
}

function favorableReadinessReport() {
  return {
    status: 'blocked',
    readinessClass: READINESS_CLASSES.SELECTED_AUDIT_CORRELATION_DOWNGRADE_ALLOWED_NOT_READY,
    currentFactsStatus: 'ok',
    currentFactsBlockerReasons: [],
    classification: {
      resultClass: 'AUDIT_SELECTED_CORRELATION_OBSERVED'
    },
    readiness: {
      readinessClass: READINESS_CLASSES.SELECTED_AUDIT_CORRELATION_DOWNGRADE_ALLOWED_NOT_READY,
      blockerDowngradeAllowed: true,
      allowedDowngrade: 'one_selected_audit_correlation_blocker',
      readinessClaimAllowed: false,
      reliabilityClaimAllowed: false,
      safety: {
        readsFiles: false,
        executesCommands: false,
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
        expandsPublicMcp: false,
        changesConfigWatchdogStartup: false,
        claimsWriteReliable: false,
        claimsRecallReliable: false,
        claimsReadiness: false
      }
    },
    blockerDowngradeAllowed: true,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    safety: {
      readsCurrentGitFacts: true,
      executesReadOnlyGitCommands: true,
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
      expandsPublicMcp: false,
      changesConfigWatchdogStartup: false,
      claimsWriteReliable: false,
      claimsRecallReliable: false,
      claimsReadiness: false
    }
  };
}

test('CM-1128 review keeps current dirty CM-1127 readiness blocked', () => {
  const readinessReport = buildReport({}, {
    gitRunner: gitRunnerForDirtyHead
  });
  const review = reviewSelectedAuditCorrelationBlockerDowngrade(readinessReport);

  assert.equal(review.reviewClass, REVIEW_CLASSES.BLOCKED_CURRENT_FACTS_NOT_READY);
  assert.equal(review.blockerDowngradeAllowed, false);
  assert.equal(review.readinessClaimAllowed, false);
  assert.equal(review.reliabilityClaimAllowed, false);
  assert.deepEqual(review.currentFactsBlockerReasons, [
    'dirty_worktree',
    'prior_result_CM-1111_missing',
    'prior_result_CM-1115_missing'
  ]);
});

test('CM-1128 review does not downgrade preflight-ready no-observation state', () => {
  const readinessReport = buildReport({ withSatisfiedPriorResults: true }, {
    gitRunner: gitRunnerForCleanHead
  });
  const review = reviewSelectedAuditCorrelationBlockerDowngrade(readinessReport);

  assert.equal(
    review.reviewClass,
    REVIEW_CLASSES.READY_FOR_SEPARATE_EXACT_OBSERVATION_NOT_DOWNGRADE
  );
  assert.equal(review.blockerDowngradeAllowed, false);
  assert.equal(review.downgradeScope, 'none');
  assert.match(review.nextStep, /separate exact approval/);
});

test('CM-1128 review allows only a narrow not-ready downgrade for favorable selected evidence', () => {
  const review = reviewSelectedAuditCorrelationBlockerDowngrade(favorableReadinessReport());

  assert.equal(review.reviewClass, REVIEW_CLASSES.DOWNGRADE_ALLOWED_NARROW_NOT_READY);
  assert.equal(review.blockerDowngradeAllowed, true);
  assert.equal(review.downgradeScope, 'one_exact_selected_audit_correlation_blocker_only');
  assert.equal(review.readinessAcceptedAsEvidence, false);
  assert.equal(review.reliabilityAcceptedAsEvidence, false);
  assert.equal(review.readinessClaimAllowed, false);
  assert.equal(review.reliabilityClaimAllowed, false);
});

test('CM-1128 review fails closed on overclaiming readiness reports', () => {
  const report = favorableReadinessReport();
  report.readinessClaimAllowed = true;

  const review = reviewSelectedAuditCorrelationBlockerDowngrade(report);

  assert.equal(review.reviewClass, REVIEW_CLASSES.FAIL_CLOSED_OVERCLAIM_SIGNAL);
  assert.equal(review.blockerDowngradeAllowed, false);
});

test('CM-1128 review fails closed on side-effect signals', () => {
  const report = favorableReadinessReport();
  report.safety.readsTrueAuditLog = true;

  const review = reviewSelectedAuditCorrelationBlockerDowngrade(report);

  assert.equal(review.reviewClass, REVIEW_CLASSES.FAIL_CLOSED_UNAUTHORIZED_SIDE_EFFECT_SIGNAL);
  assert.equal(review.forbiddenFlag, 'readsTrueAuditLog');
  assert.equal(review.blockerDowngradeAllowed, false);
});

test('CM-1128 review fails closed when nested readiness safety carries side-effect signals', () => {
  const report = favorableReadinessReport();
  report.readiness.safety.callsSearchMemory = true;
  report.safety.callsSearchMemory = false;

  const review = reviewSelectedAuditCorrelationBlockerDowngrade(report);

  assert.equal(review.reviewClass, REVIEW_CLASSES.FAIL_CLOSED_UNAUTHORIZED_SIDE_EFFECT_SIGNAL);
  assert.equal(review.forbiddenFlag, 'callsSearchMemory');
  assert.equal(review.blockerDowngradeAllowed, false);
});

test('CM-1128 review fails closed on inconsistent downgrade flags', () => {
  const report = buildReport({ withSatisfiedPriorResults: true }, {
    gitRunner: gitRunnerForCleanHead
  });
  report.blockerDowngradeAllowed = true;

  const review = reviewSelectedAuditCorrelationBlockerDowngrade(report);

  assert.equal(review.reviewClass, REVIEW_CLASSES.FAIL_CLOSED_INCONSISTENT_DOWNGRADE_SIGNAL);
  assert.equal(review.blockerDowngradeAllowed, false);
});

test('CM-1128 review fails closed when favorable readiness class lacks downgrade flag', () => {
  const report = favorableReadinessReport();
  report.blockerDowngradeAllowed = false;
  report.readiness.blockerDowngradeAllowed = false;

  const review = reviewSelectedAuditCorrelationBlockerDowngrade(report);

  assert.equal(review.reviewClass, REVIEW_CLASSES.FAIL_CLOSED_INCONSISTENT_DOWNGRADE_SIGNAL);
  assert.equal(review.blockerDowngradeAllowed, false);
});
