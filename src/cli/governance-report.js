#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { createConfig } = require('../config/createConfig');
const {
  evaluateAuthorizedWritePathAutoAuthorizationPreflight
} = require('../core/AuthorizedWritePathAutoAuthorizationPreflight');
const {
  evaluateAuthorizedWritePathWideningReview
} = require('../core/AuthorizedWritePathWideningReview');
const {
  applyAutoAuthorizationEscalationToWideningReviewInput
} = require('../core/AutoAuthorizationEscalationToWideningReviewAdapter');
const {
  evaluateAuthorizedWritePathWideningAdoptionReview
} = require('../core/AuthorizedWritePathWideningAdoptionReview');
const {
  EXPECTED_WIDENING_ADOPTION_DECISION,
  EXPECTED_CM0595_ISSUANCE_DECISION,
  EXPECTED_CM0595_EXECUTION_DECISION
} = require('../core/AuthorizedWritePathCm0595CloseoutReview');
const {
  evaluateAuthorizedWritePathBoundedRecallPreparationReview
} = require('../core/AuthorizedWritePathBoundedRecallPreparationReview');
const {
  evaluateAuthorizedWritePathBoundedRecallCloseoutReview
} = require('../core/AuthorizedWritePathBoundedRecallCloseoutReview');
const {
  applyAssertionRecordToPreflightInput,
  ALLOWED_LATEST_REBOUND_OUTCOME_CLASSES,
  buildAssertionRecordInputTrace,
  loadAssertionRecordFile
} = require('../core/ExternalTokenMaterialAssertionRecordAdapter');
const {
  applyRoutingOutcomeRecordToWideningReviewInput,
  buildRoutingOutcomeRecordInputTrace,
  loadRoutingOutcomeRecordFile
} = require('../core/RoutingOutcomeRecordAdapter');
const {
  applyWideningReviewOutcomeRecordToAdoptionInput,
  buildWideningReviewRecordInputTrace,
  loadWideningReviewOutcomeRecordFile
} = require('../core/WideningReviewOutcomeRecordAdapter');
const {
  applyWideningAdoptionRecordToAdoptionInput,
  buildWideningAdoptionRecordInputTrace,
  loadWideningAdoptionRecordFile,
  validateWideningAdoptionRecord
} = require('../core/WideningAdoptionRecordAdapter');
const {
  buildCm0595ApprovalIssuanceRecordInputTrace,
  loadCm0595ApprovalIssuanceRecordFile,
  validateCm0595ApprovalIssuanceRecord
} = require('../core/Cm0595ApprovalIssuanceRecordAdapter');
const {
  buildCm0595ExecutionEvidenceInputTrace,
  loadCm0595ExecutionEvidenceRecordFile,
  validateCm0595ExecutionEvidenceRecord
} = require('../core/Cm0595ExecutionEvidenceRecordAdapter');
const {
  buildBoundedRecallApprovalIssuanceRecordInputTrace,
  loadBoundedRecallApprovalIssuanceRecordFile,
  validateBoundedRecallApprovalIssuanceRecord
} = require('../core/BoundedRecallApprovalIssuanceRecordAdapter');
const {
  buildBoundedRecallExecutionEvidenceInputTrace,
  loadBoundedRecallExecutionEvidenceRecordFile,
  validateBoundedRecallExecutionEvidenceRecord
} = require('../core/BoundedRecallExecutionEvidenceRecordAdapter');

const LIFECYCLE_INCLUDED_STATUSES = ['active', 'stale'];
const LIFECYCLE_EXCLUDED_STATUSES = ['proposal', 'rejected', 'superseded', 'tombstoned'];
const READ_POLICY_AUDIT_TAIL = 20;
const AUTO_AUTHORIZATION_FIXTURE_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'tests',
  'fixtures',
  'authorized-write-path-auto-authorization-preflight-v1.json'
);
const WIDENING_REVIEW_FIXTURE_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'tests',
  'fixtures',
  'authorized-write-path-widening-review-v1.json'
);
const WIDENING_ADOPTION_FIXTURE_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'tests',
  'fixtures',
  'authorized-write-path-widening-adoption-review-v1.json'
);
const BOUNDED_RECALL_PREPARATION_FIXTURE_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'tests',
  'fixtures',
  'authorized-write-path-bounded-recall-preparation-review-v1.json'
);
const BOUNDED_RECALL_CLOSEOUT_FIXTURE_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'tests',
  'fixtures',
  'authorized-write-path-bounded-recall-closeout-review-v1.json'
);

function parseArgs(argv = []) {
  const options = {
    json: false,
    showRenderedOperatorArtifactText: false,
    showRenderedOperatorPacketText: false,
    showRenderedOperatorBriefText: false,
    showRenderedWideningReviewText: false,
    showRenderedWideningAdoptionText: false,
    showRenderedBoundedRecallText: false,
    showRenderedBoundedRecallCloseoutText: false,
    autoAuthorizationAssertionRecordPath: '',
    autoAuthorizationLatestReboundOutcomeClass: '',
    wideningReviewFixturePath: WIDENING_REVIEW_FIXTURE_PATH,
    wideningReviewRoutingOutcomeRecordPath: '',
    wideningAdoptionFixturePath: WIDENING_ADOPTION_FIXTURE_PATH,
    wideningAdoptionReviewRecordPath: '',
    wideningAdoptionRecordPath: '',
    boundedRecallPreparationFixturePath: BOUNDED_RECALL_PREPARATION_FIXTURE_PATH,
    boundedRecallCloseoutFixturePath: BOUNDED_RECALL_CLOSEOUT_FIXTURE_PATH,
    cm0595IssuanceRecordPath: '',
    cm0595ExecutionEvidenceRecordPath: '',
    boundedRecallIssuanceRecordPath: '',
    boundedRecallExecutionEvidenceRecordPath: ''
  };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--json') { options.json = true; continue; }
    if (argv[i] === '--rendered-operator-artifact-text') { options.showRenderedOperatorArtifactText = true; continue; }
    if (argv[i] === '--rendered-operator-packet-text') { options.showRenderedOperatorPacketText = true; continue; }
    if (argv[i] === '--rendered-operator-brief-text') { options.showRenderedOperatorBriefText = true; continue; }
    if (argv[i] === '--rendered-widening-review-text') { options.showRenderedWideningReviewText = true; continue; }
    if (argv[i] === '--rendered-widening-adoption-text') { options.showRenderedWideningAdoptionText = true; continue; }
    if (argv[i] === '--rendered-bounded-recall-text') { options.showRenderedBoundedRecallText = true; continue; }
    if (argv[i] === '--rendered-bounded-recall-closeout-text') { options.showRenderedBoundedRecallCloseoutText = true; continue; }
    if (argv[i] === '--auto-auth-assertion-record') {
      options.autoAuthorizationAssertionRecordPath = path.resolve(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (argv[i] === '--widening-review-fixture') {
      options.wideningReviewFixturePath = path.resolve(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (argv[i] === '--widening-review-routing-outcome-record') {
      options.wideningReviewRoutingOutcomeRecordPath = path.resolve(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (argv[i] === '--widening-adoption-fixture') {
      options.wideningAdoptionFixturePath = path.resolve(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (argv[i] === '--widening-adoption-review-record') {
      options.wideningAdoptionReviewRecordPath = path.resolve(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (argv[i] === '--widening-adoption-record') {
      options.wideningAdoptionRecordPath = path.resolve(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (argv[i] === '--bounded-recall-preparation-fixture') {
      options.boundedRecallPreparationFixturePath = path.resolve(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (argv[i] === '--bounded-recall-closeout-fixture') {
      options.boundedRecallCloseoutFixturePath = path.resolve(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (argv[i] === '--cm0595-issuance-record') {
      options.cm0595IssuanceRecordPath = path.resolve(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (argv[i] === '--cm0595-execution-evidence-record') {
      options.cm0595ExecutionEvidenceRecordPath = path.resolve(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (argv[i] === '--bounded-recall-issuance-record') {
      options.boundedRecallIssuanceRecordPath = path.resolve(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (argv[i] === '--bounded-recall-execution-evidence-record') {
      options.boundedRecallExecutionEvidenceRecordPath = path.resolve(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (argv[i] === '--auto-auth-latest-rebound-outcome-class') {
      options.autoAuthorizationLatestReboundOutcomeClass = String(argv[i + 1] || '').trim();
      i += 1;
    }
  }
  return options;
}

function getDbPath() {
  return createConfig().dbPath;
}

function runQuery(db, sql, params = []) {
  try { return db.prepare(sql).all(...params); }
  catch { return []; }
}

function runQueryOne(db, sql, params = []) {
  try { return db.prepare(sql).get(...params); }
  catch { return null; }
}

function normalizeBucketKey(value) {
  if (value === null || value === undefined) return '(unset)';
  const text = String(value).trim();
  return text || '(unset)';
}

function toDistribution(rows = [], keyField = 'key') {
  return Object.fromEntries(rows.map(row => [normalizeBucketKey(row?.[keyField]), row?.cnt || 0]));
}

function readRecentJsonlEntriesSync(filePath, maxLines = READ_POLICY_AUDIT_TAIL, maxBytes = 1024 * 1024) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return [];
    const stats = fs.statSync(filePath);
    const start = Math.max(0, stats.size - maxBytes);
    const fd = fs.openSync(filePath, 'r');
    try {
      const buffer = Buffer.alloc(stats.size - start);
      const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, start);
      let content = buffer.toString('utf8', 0, bytesRead);
      if (start > 0) {
        const firstNewline = content.indexOf('\n');
        content = firstNewline >= 0 ? content.slice(firstNewline + 1) : '';
      }
      return content
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .slice(-maxLines)
        .map(line => {
          try { return JSON.parse(line); } catch { return null; }
        })
        .filter(Boolean);
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return [];
  }
}

function sumNumeric(entries, field) {
  return entries.reduce((total, entry) => total + Number(entry?.[field] || 0), 0);
}

function latestTimestamp(entries) {
  return entries
    .map(entry => entry?.timestamp)
    .filter(value => typeof value === 'string' && value.trim())
    .sort()
    .at(-1) || null;
}

function buildReadPolicySurface({ config = null, recallEntries = [], auditTailLimit = null } = {}) {
  const effectiveConfig = config || createConfig();
  const entries = Array.isArray(recallEntries) ? recallEntries.filter(Boolean) : [];
  const policyEntries = entries.filter(entry => (
    entry.recallType === 'read-policy'
    || Object.prototype.hasOwnProperty.call(entry, 'readPolicyApplied')
    || Object.prototype.hasOwnProperty.call(entry, 'lifecyclePolicyApplied')
  ));
  const lifecycleColumnSignals = policyEntries
    .map(entry => entry.lifecycleColumnAvailable)
    .filter(value => typeof value === 'boolean');
  const scopeWorkspaceSignals = policyEntries
    .map(entry => entry.scopeWorkspacePresent)
    .filter(value => typeof value === 'boolean');
  const hasRecentAuditEvidence = policyEntries.length > 0;
  const lifecyclePolicyEnabled = !!effectiveConfig.enableLifecycleReadPolicy;
  const softReadPolicyEnabled = !!effectiveConfig.enableSoftReadPolicy;
  const evidenceState = hasRecentAuditEvidence
    ? 'config_and_recent_audit'
    : 'config_only_missing_recent_audit';

  return {
    status: hasRecentAuditEvidence ? 'ok' : 'config_only_no_recent_audit',
    source: hasRecentAuditEvidence ? 'config-and-recent-recall-audit' : 'config-only-no-recent-audit',
    evidenceState,
    configEvidenceAvailable: true,
    auditEvidenceAvailable: hasRecentAuditEvidence,
    auditedEntryCount: entries.length,
    auditTailLimit,
    latestReadPolicyAuditAt: latestTimestamp(policyEntries),
    nextEvidenceAction: hasRecentAuditEvidence
      ? 'none'
      : 'collect_recent_read_policy_audit_evidence_before_readiness_claim',
    readPolicyConfigured: lifecyclePolicyEnabled || softReadPolicyEnabled,
    lifecyclePolicyEnabled,
    softReadPolicyEnabled,
    lifecycleIncludedStatuses: LIFECYCLE_INCLUDED_STATUSES,
    lifecycleExcludedStatuses: LIFECYCLE_EXCLUDED_STATUSES,
    recentReadPolicyAuditCount: policyEntries.length,
    recentReadPolicyAppliedCount: policyEntries.filter(entry => entry.readPolicyApplied === true).length,
    recentLifecyclePolicyAppliedCount: policyEntries.filter(entry => entry.lifecyclePolicyApplied === true).length,
    recentHiddenByLifecycleCount: sumNumeric(policyEntries, 'hiddenByLifecycleCount'),
    recentStaleResultCount: sumNumeric(policyEntries, 'staleResultCount'),
    lifecycleColumnAvailable: lifecycleColumnSignals.length > 0
      ? lifecycleColumnSignals.every(Boolean)
      : null,
    scopeWorkspacePresent: scopeWorkspaceSignals.length > 0
      ? scopeWorkspaceSignals.some(Boolean)
      : null,
    rawWorkspaceIdExposed: false,
    noProvider: true,
    mutated: false,
    migrationApplied: false
  };
}

function collectReadPolicySurface() {
  const config = createConfig();
  return buildReadPolicySurface({
    config,
    recallEntries: readRecentJsonlEntriesSync(config.recallLogPath, READ_POLICY_AUDIT_TAIL),
    auditTailLimit: READ_POLICY_AUDIT_TAIL
  });
}

function buildFailClosedAutoAuthorizationSurface(currentBlockedOn, source) {
  return {
    status: 'blocked_fail_closed',
    decision: 'RC_NOT_READY_BLOCKED',
    allowedGovernanceOutput: 'NO_AUTO_APPROVAL_ISSUED',
    assertionRecordInputTrace: null,
    assertionRecordPreview: null,
    approvalLinePreview: null,
    issuanceRecordPreview: null,
    routingOutcomePreview: null,
    wideningReviewPreview: null,
    recordDrafts: null,
    renderedArtifactTextSurface: null,
    renderedOperatorPacketTextSurface: null,
    renderedOperatorBriefTextSurface: null,
    operatorActionPlan: null,
    artifactBundleDraft: null,
    commandPreviewBundle: null,
    operatorPacketDraft: null,
    checklistPassed: false,
    checklistFailures: [currentBlockedOn],
    exactCm0601LineReusable: false,
    externalAssertionAccepted: false,
    canAutoAuthorizeCm0595: false,
    currentBlockedOn,
    nextStep: 'keep_rc_not_ready_blocked_and_issue_no_auto_approval',
    source,
    mutated: false,
    readsRealMemory: false,
    writesDurableState: false,
    publicMcpExpanded: false
  };
}

function loadAutoAuthorizationPreflightInput(options = {}) {
  try {
    const fixture = JSON.parse(fs.readFileSync(AUTO_AUTHORIZATION_FIXTURE_PATH, 'utf8'));
    if (options.autoAuthorizationAssertionRecordPath) {
      const loadResult = loadAssertionRecordFile(
        options.autoAuthorizationAssertionRecordPath
      );
      const adapted = applyAssertionRecordToPreflightInput(fixture, loadResult.record, {
        latestReboundOutcomeClass: options.autoAuthorizationLatestReboundOutcomeClass
      });
      if (adapted.ok !== true) {
        return {
          ok: false,
          failClosedReason: adapted.failClosedReasons?.[0] || 'assertion_record_apply_failed',
          source: 'cm0622_assertion_record_apply_failed_fail_closed'
        };
      }
      const assertionRecordInputTrace = buildAssertionRecordInputTrace({
        loadResult,
        normalizedAssertionRecord: adapted.normalizedAssertionRecord,
        assertionAcceptedForC6: adapted.assertionAcceptedForC6 === true,
        latestReboundOutcomeClass: options.autoAuthorizationLatestReboundOutcomeClass
      });
      return {
        ok: true,
        input: adapted.mergedInput,
        source: 'cm0622_explicit_input_fixture_plus_assertion_record_v1',
        assertionRecordInputTrace
      };
    }

    if (options.autoAuthorizationLatestReboundOutcomeClass) {
      if (!ALLOWED_LATEST_REBOUND_OUTCOME_CLASSES.includes(options.autoAuthorizationLatestReboundOutcomeClass)) {
        return {
          ok: false,
          failClosedReason: 'unsupported_latest_rebound_outcome_override',
          source: 'cm0622_outcome_override_unsupported_fail_closed'
        };
      }
      return {
        ok: true,
        input: {
          ...fixture,
          latestReboundOutcomeClass: options.autoAuthorizationLatestReboundOutcomeClass
        },
        source: 'cm0622_explicit_input_fixture_plus_outcome_override_v1'
      };
    }

    return {
      ok: true,
      input: fixture,
      source: 'cm0618_explicit_input_fixture_v1'
    };
  } catch {
    return {
      ok: false,
      failClosedReason: 'fixture_or_assertion_record_parse_failed',
      source: 'cm0622_fixture_or_assertion_record_parse_failed_fail_closed'
    };
  }
}

function collectAuthorizedWritePathAutoAuthorizationSurface(options = {}) {
  if (!fs.existsSync(AUTO_AUTHORIZATION_FIXTURE_PATH)) {
    return buildFailClosedAutoAuthorizationSurface(
      'fixture_unavailable',
      'cm0618_fixture_missing_fail_closed'
    );
  }

  const preparedInput = loadAutoAuthorizationPreflightInput(options);
  if (preparedInput.ok !== true) {
    return buildFailClosedAutoAuthorizationSurface(
      preparedInput.failClosedReason || 'fixture_or_assertion_record_parse_failed',
      preparedInput.source || 'cm0622_fixture_or_assertion_record_parse_failed_fail_closed'
    );
  }

  const evaluation = evaluateAuthorizedWritePathAutoAuthorizationPreflight(preparedInput.input, {
    assertionRecordInputTrace: preparedInput.assertionRecordInputTrace || null
  });
  return {
    status: evaluation.status,
    decision: evaluation.decision,
    allowedGovernanceOutput: evaluation.allowedGovernanceOutput,
    assertionRecordInputTrace: preparedInput.assertionRecordInputTrace || null,
    assertionRecordPreview: evaluation.assertionRecordPreview || null,
    approvalLinePreview: evaluation.approvalLinePreview || null,
    issuanceRecordPreview: evaluation.issuanceRecordPreview || null,
    routingOutcomePreview: evaluation.routingOutcomePreview || null,
    wideningReviewPreview: evaluation.wideningReviewPreview || null,
    recordDrafts: evaluation.recordDrafts || null,
    renderedArtifactTextSurface: evaluation.renderedArtifactTextSurface || null,
    renderedOperatorPacketTextSurface: evaluation.renderedOperatorPacketTextSurface || null,
    renderedOperatorBriefTextSurface: evaluation.renderedOperatorBriefTextSurface || null,
    operatorActionPlan: evaluation.operatorActionPlan || null,
    artifactBundleDraft: evaluation.artifactBundleDraft || null,
    commandPreviewBundle: evaluation.commandPreviewBundle || null,
    operatorPacketDraft: evaluation.operatorPacketDraft || null,
    checklistPassed: evaluation.checklistPassed,
    checklistFailures: Array.isArray(evaluation.checklistFailures) ? evaluation.checklistFailures : [],
    exactCm0601LineReusable: evaluation.exactCm0601LineReusable === true,
    externalAssertionAccepted: evaluation.externalAssertionAccepted === true,
    canAutoAuthorizeCm0595: evaluation.canAutoAuthorizeCm0595 === true,
    currentBlockedOn: Array.isArray(evaluation.failClosedReasons) && evaluation.failClosedReasons.length > 0
      ? evaluation.failClosedReasons[0]
      : null,
    nextStep: evaluation.nextStep || 'keep_rc_not_ready_blocked_and_issue_no_auto_approval',
    source: preparedInput.source,
    mutated: false,
    readsRealMemory: false,
    writesDurableState: false,
    publicMcpExpanded: false
  };
}

function buildFailClosedWideningReviewSurface(currentBlockedOn, source) {
  return {
    status: 'blocked_fail_closed',
    decision: 'WIDENING_REVIEW_NOT_READY',
    controllingState: 'RC_NOT_READY_BLOCKED',
    routingOutcomeRecordInputTrace: null,
    cm0604Satisfied: false,
    cm0606BridgeActivated: false,
    proceedToCm0607AdoptionRecord: false,
    canAutoAuthorizeCm0595: false,
    canExecuteRuntimeNow: false,
    reviewChecklist: {},
    reviewChecklistFailures: [currentBlockedOn],
    failClosedReasons: [currentBlockedOn],
    reviewRecordDraft: null,
    renderedReviewTextSurface: null,
    nextStep: 'keep_rc_not_ready_blocked_and_do_not_open_cm0607',
    source,
    mutated: false,
    readsRealMemory: false,
    writesDurableState: false,
    publicMcpExpanded: false
  };
}

function buildFailClosedWideningAdoptionSurface(currentBlockedOn, source) {
  return {
    status: 'blocked_fail_closed',
    decision: 'WIDENING_ADOPTION_NOT_READY',
    controllingState: 'RC_NOT_READY_BLOCKED',
    wideningReviewRecordInputTrace: null,
    wideningAdoptionRecordInputTrace: null,
    cm0595IssuanceRecordInputTrace: null,
    cm0595ExecutionEvidenceInputTrace: null,
    adoptionPrerequisitesSatisfied: false,
    cm0607AdoptionRecordReady: false,
    canAutoAuthorizeCm0595: false,
    canAutoAuthorizeRecordMemory: false,
    canExecuteRuntimeNow: false,
    adoptionChecklist: {},
    adoptionChecklistFailures: [currentBlockedOn],
    failClosedReasons: [currentBlockedOn],
    adoptionRecordDraft: null,
    renderedAdoptionTextSurface: null,
    cm0595ApprovalLinePreview: null,
    cm0595CommandPreviewBundle: null,
    cm0595OperatorPacketDraft: null,
    cm0595IssuanceRecordDraft: null,
    cm0595ExecutionEvidenceDraft: null,
    renderedCm0595OperatorPacketTextSurface: null,
    nextStep: 'keep_rc_not_ready_blocked_and_do_not_grant_widening',
    source,
    mutated: false,
    readsRealMemory: false,
    writesDurableState: false,
    publicMcpExpanded: false
  };
}

function buildFailClosedBoundedRecallPreparationSurface(currentBlockedOn, source) {
  return {
    status: 'blocked_fail_closed',
    decision: 'BOUNDED_RECALL_APPROVAL_NOT_READY',
    controllingState: 'RC_NOT_READY_BLOCKED',
    boundedRecallApprovalPrepared: false,
    canPrepareBoundedRecallExactApproval: false,
    canExecuteBoundedRecallNow: false,
    canExecuteRuntimeNow: false,
    boundedRecallChecklist: {},
    boundedRecallChecklistFailures: [currentBlockedOn],
    failClosedReasons: [currentBlockedOn],
    cm0595CloseoutDecision: 'CM0595_CLOSEOUT_NOT_READY',
    cm0595CloseoutReady: false,
    boundedRecallApprovalLinePreview: null,
    boundedRecallCommandPreviewBundle: null,
    boundedRecallOperatorPacketDraft: null,
    boundedRecallApprovalIssuanceRecordDraft: null,
    boundedRecallExecutionEvidenceDraft: null,
    renderedBoundedRecallTextSurface: null,
    wideningAdoptionRecordInputTrace: null,
    cm0595IssuanceRecordInputTrace: null,
    cm0595ExecutionEvidenceInputTrace: null,
    nextStep: 'keep_rc_not_ready_blocked_and_do_not_enter_bounded_recall',
    source,
    mutated: false,
    readsRealMemory: false,
    writesDurableState: false,
    publicMcpExpanded: false
  };
}

function buildFailClosedBoundedRecallCloseoutSurface(currentBlockedOn, source) {
  return {
    status: 'blocked_fail_closed',
    decision: 'BOUNDED_RECALL_CLOSEOUT_NOT_READY',
    controllingState: 'RC_NOT_READY_BLOCKED',
    boundedRecallCloseoutReady: false,
    canPrepareFutureBoundedRecallRuntimeApprovalNext: false,
    canExecuteBoundedRecallNow: false,
    canExecuteRuntimeNow: false,
    closeoutChecklist: {},
    closeoutChecklistFailures: [currentBlockedOn],
    failClosedReasons: [currentBlockedOn],
    closeoutRecordDraft: null,
    boundedRecallPreparationCommandPreviewBundle: null,
    boundedRecallPreparationOperatorPacketDraft: null,
    renderedCloseoutTextSurface: null,
    renderedBoundedRecallPreparationPacketTextSurface: null,
    boundedRecallApprovalIssuanceRecordInputTrace: null,
    boundedRecallExecutionEvidenceInputTrace: null,
    nextStep: 'keep_rc_not_ready_blocked_and_do_not_enter_bounded_recall',
    source,
    mutated: false,
    readsRealMemory: false,
    writesDurableState: false,
    publicMcpExpanded: false
  };
}

function loadWideningReviewInput(options = {}) {
  const fixturePath = options.wideningReviewFixturePath || WIDENING_REVIEW_FIXTURE_PATH;
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  if (options.wideningReviewRoutingOutcomeRecordPath) {
    const loadResult = loadRoutingOutcomeRecordFile(
      options.wideningReviewRoutingOutcomeRecordPath
    );
    const adapted = applyRoutingOutcomeRecordToWideningReviewInput(fixture, loadResult.record);
    if (adapted.ok !== true) {
      return {
        ok: false,
        failClosedReason: adapted.failClosedReasons?.[0] || 'routing_outcome_record_apply_failed',
        source: 'cm0645_routing_outcome_record_apply_failed_fail_closed'
      };
    }

    return {
      ok: true,
      input: adapted.mergedInput,
      source: 'cm0645_explicit_input_fixture_plus_routing_outcome_record_v1',
      routingOutcomeRecordInputTrace: buildRoutingOutcomeRecordInputTrace({
        loadResult,
        normalizedRoutingOutcomeRecord: adapted.normalizedRoutingOutcomeRecord
      })
    };
  }

  if (options.autoAuthorizationAssertionRecordPath || options.autoAuthorizationLatestReboundOutcomeClass) {
    const preparedAutoAuthorization = loadAutoAuthorizationPreflightInput(options);
    if (preparedAutoAuthorization.ok === true) {
      const bridged = applyAutoAuthorizationEscalationToWideningReviewInput(
        fixture,
        preparedAutoAuthorization.input,
        {
          assertionRecordInputTrace:
            preparedAutoAuthorization.assertionRecordInputTrace || null
        }
      );
      if (bridged.ok === true) {
        return {
          ok: true,
          input: bridged.mergedInput,
          source: bridged.source,
          routingOutcomeRecordInputTrace: bridged.routingOutcomeRecordInputTrace || null
        };
      }
    }
  }

  return {
    ok: true,
    input: fixture,
    source: 'cm0643_explicit_input_fixture_v1',
    routingOutcomeRecordInputTrace: null
  };
}

function collectAuthorizedWritePathWideningReviewSurface(options = {}) {
  const fixturePath = options.wideningReviewFixturePath || WIDENING_REVIEW_FIXTURE_PATH;
  try {
    if (!fs.existsSync(fixturePath)) {
      return buildFailClosedWideningReviewSurface(
        'fixture_unavailable',
        'cm0643_fixture_missing_fail_closed'
      );
    }
    const preparedInput = loadWideningReviewInput(options);
    if (preparedInput.ok !== true) {
      return buildFailClosedWideningReviewSurface(
        preparedInput.failClosedReason || 'fixture_or_routing_outcome_record_parse_failed',
        preparedInput.source || 'cm0645_fixture_or_routing_outcome_record_parse_failed_fail_closed'
      );
    }
    const evaluation = evaluateAuthorizedWritePathWideningReview(preparedInput.input);
    return {
      ...evaluation,
      source: preparedInput.source,
      routingOutcomeRecordInputTrace: preparedInput.routingOutcomeRecordInputTrace || null,
      mutated: false,
      readsRealMemory: false,
      writesDurableState: false,
      publicMcpExpanded: false
    };
  } catch {
    return buildFailClosedWideningReviewSurface(
      'fixture_parse_failed',
      'cm0643_fixture_parse_failed_fail_closed'
    );
  }
}

function loadWideningAdoptionInput(options = {}) {
  const fixturePath = options.wideningAdoptionFixturePath || WIDENING_ADOPTION_FIXTURE_PATH;
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  let input = fixture;
  let source = 'cm0646_explicit_input_fixture_v1';
  let wideningReviewRecordInputTrace = null;
  let wideningAdoptionRecordInputTrace = null;
  let cm0595IssuanceRecordInputTrace = null;
  let cm0595ExecutionEvidenceInputTrace = null;

  if (options.wideningAdoptionReviewRecordPath) {
    const loadResult = loadWideningReviewOutcomeRecordFile(
      options.wideningAdoptionReviewRecordPath
    );
    const adapted = applyWideningReviewOutcomeRecordToAdoptionInput(input, loadResult.record);
    if (adapted.ok !== true) {
      return {
        ok: false,
        failClosedReason: adapted.failClosedReasons?.[0] || 'widening_review_record_apply_failed',
        source: 'cm0646_widening_review_record_apply_failed_fail_closed'
      };
    }

    input = adapted.mergedInput;
    source = 'cm0646_explicit_input_fixture_plus_widening_review_record_v1';
    wideningReviewRecordInputTrace = buildWideningReviewRecordInputTrace({
      loadResult,
      normalizedWideningReviewRecord: adapted.normalizedWideningReviewRecord
    });
  }

  if (options.wideningAdoptionRecordPath) {
    const loadResult = loadWideningAdoptionRecordFile(
      options.wideningAdoptionRecordPath
    );
    const adapted = applyWideningAdoptionRecordToAdoptionInput(input, loadResult.record);
    if (adapted.ok !== true) {
      return {
        ok: false,
        failClosedReason: adapted.failClosedReasons?.[0] || 'widening_adoption_record_apply_failed',
        source: 'cm0647_widening_adoption_record_apply_failed_fail_closed'
      };
    }

    input = adapted.mergedInput;
    source = options.wideningAdoptionReviewRecordPath
      ? 'cm0647_explicit_input_fixture_plus_widening_review_record_plus_widening_adoption_record_v1'
      : 'cm0647_explicit_input_fixture_plus_widening_adoption_record_v1';
    wideningAdoptionRecordInputTrace = buildWideningAdoptionRecordInputTrace({
      loadResult,
      normalizedWideningAdoptionRecord: adapted.normalizedWideningAdoptionRecord
    });
  }

  if (options.cm0595IssuanceRecordPath) {
    const loadResult = loadCm0595ApprovalIssuanceRecordFile(
      options.cm0595IssuanceRecordPath
    );
    const validation = validateCm0595ApprovalIssuanceRecord(loadResult.record);
    if (validation.valid !== true) {
      return {
        ok: false,
        failClosedReason: validation.failClosedReasons?.[0] || 'cm0595_issuance_record_apply_failed',
        source: 'cm0652_cm0595_issuance_record_apply_failed_fail_closed'
      };
    }

    source = options.wideningAdoptionRecordPath
      ? 'cm0652_explicit_input_fixture_plus_widening_review_record_plus_widening_adoption_record_plus_cm0595_issuance_record_v1'
      : options.wideningAdoptionReviewRecordPath
        ? 'cm0652_explicit_input_fixture_plus_widening_review_record_plus_cm0595_issuance_record_v1'
        : 'cm0652_explicit_input_fixture_plus_cm0595_issuance_record_v1';
    cm0595IssuanceRecordInputTrace = buildCm0595ApprovalIssuanceRecordInputTrace({
      loadResult,
      normalizedCm0595ApprovalIssuanceRecord: validation.normalized
    });
  }

  if (options.cm0595ExecutionEvidenceRecordPath) {
    const loadResult = loadCm0595ExecutionEvidenceRecordFile(
      options.cm0595ExecutionEvidenceRecordPath
    );
    const validation = validateCm0595ExecutionEvidenceRecord(loadResult.record);
    if (validation.valid !== true) {
      return {
        ok: false,
        failClosedReason: validation.failClosedReasons?.[0] || 'cm0595_execution_evidence_record_apply_failed',
        source: 'cm0653_cm0595_execution_evidence_record_apply_failed_fail_closed'
      };
    }

    source = options.cm0595IssuanceRecordPath
      ? 'cm0653_explicit_input_fixture_plus_widening_review_record_plus_widening_adoption_record_plus_cm0595_issuance_record_plus_cm0595_execution_evidence_record_v1'
      : options.wideningAdoptionRecordPath
        ? 'cm0653_explicit_input_fixture_plus_widening_review_record_plus_widening_adoption_record_plus_cm0595_execution_evidence_record_v1'
        : options.wideningAdoptionReviewRecordPath
          ? 'cm0653_explicit_input_fixture_plus_widening_review_record_plus_cm0595_execution_evidence_record_v1'
          : 'cm0653_explicit_input_fixture_plus_cm0595_execution_evidence_record_v1';
    cm0595ExecutionEvidenceInputTrace = buildCm0595ExecutionEvidenceInputTrace({
      loadResult,
      normalizedCm0595ExecutionEvidenceRecord: validation.normalized
    });
  }

  return {
    ok: true,
    input,
    source,
    wideningReviewRecordInputTrace,
    wideningAdoptionRecordInputTrace,
    cm0595IssuanceRecordInputTrace,
    cm0595ExecutionEvidenceInputTrace
  };
}

function loadBoundedRecallPreparationInput(options = {}) {
  const fixturePath =
    options.boundedRecallPreparationFixturePath
    || BOUNDED_RECALL_PREPARATION_FIXTURE_PATH;
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  let input = fixture;
  let source = 'cm0655_explicit_input_fixture_v1';
  let wideningAdoptionRecordInputTrace = null;
  let cm0595IssuanceRecordInputTrace = null;
  let cm0595ExecutionEvidenceInputTrace = null;

  if (options.wideningAdoptionRecordPath) {
    const loadResult = loadWideningAdoptionRecordFile(
      options.wideningAdoptionRecordPath
    );
    const validation = validateWideningAdoptionRecord(loadResult.record);
    if (validation.valid !== true) {
      return {
        ok: false,
        failClosedReason:
          validation.failClosedReasons?.[0] || 'widening_adoption_record_apply_failed',
        source: 'cm0655_widening_adoption_record_apply_failed_fail_closed'
      };
    }

    input = {
      ...input,
      sameBaselineEndpointStartupEvidenceAvailable:
        validation.normalized.sameBaselineEndpointStartupEvidenceResult.toLowerCase() === 'accepted',
      endpointStartupEvidenceId:
        validation.normalized.sameBaselineEndpointStartupEvidenceDoc
          || input.endpointStartupEvidenceId,
      sameBaselineTokenPresentEvidenceAvailable:
        validation.normalized.sameBaselineTokenPresenceEvidenceResult.toLowerCase() === 'accepted',
      tokenPresentEvidenceSameBaseline:
        validation.normalized.sameBaselineTokenPresenceEvidenceResult.toLowerCase() === 'accepted',
      latestTokenPresentEvidenceId:
        validation.normalized.sameBaselineTokenPresenceEvidenceDoc
          || input.latestTokenPresentEvidenceId,
      wideningAdoptionGrantedCm0595Only:
        validation.normalized.decision === EXPECTED_WIDENING_ADOPTION_DECISION
        && validation.normalized.futureAutoAuthorizationWideningAdopted === true,
      wideningAdoptionDecision: validation.normalized.decision,
      wideningAdoptionRecordId:
        validation.normalized._sourcePath
          || validation.normalized.sameBaselineTokenPresenceEvidenceDoc
    };
    source = 'cm0655_explicit_input_fixture_plus_widening_adoption_record_v1';
    wideningAdoptionRecordInputTrace = buildWideningAdoptionRecordInputTrace({
      loadResult,
      normalizedWideningAdoptionRecord: validation.normalized
    });
  }

  if (options.cm0595IssuanceRecordPath) {
    const loadResult = loadCm0595ApprovalIssuanceRecordFile(
      options.cm0595IssuanceRecordPath
    );
    const validation = validateCm0595ApprovalIssuanceRecord(loadResult.record);
    if (validation.valid !== true) {
      return {
        ok: false,
        failClosedReason:
          validation.failClosedReasons?.[0] || 'cm0595_issuance_record_apply_failed',
        source: 'cm0655_cm0595_issuance_record_apply_failed_fail_closed'
      };
    }

    input = {
      ...input,
      targetBaseline: validation.normalized.targetBaseline || input.targetBaseline,
      cm0595IssuanceRecordAvailable: true,
      cm0595IssuanceDecision: validation.normalized.decision,
      cm0595IssuedExactLineMatches:
        validation.normalized.decision === EXPECTED_CM0595_ISSUANCE_DECISION,
      cm0595RuntimeExecutionStartedBeforeEvidence:
        validation.normalized.runtimeExecutionStarted === true,
      cm0595IssuanceRecordId:
        validation.normalized._sourcePath || validation.normalized.issuanceRoute
    };
    source = options.wideningAdoptionRecordPath
      ? 'cm0655_explicit_input_fixture_plus_widening_adoption_record_plus_cm0595_issuance_record_v1'
      : 'cm0655_explicit_input_fixture_plus_cm0595_issuance_record_v1';
    cm0595IssuanceRecordInputTrace = buildCm0595ApprovalIssuanceRecordInputTrace({
      loadResult,
      normalizedCm0595ApprovalIssuanceRecord: validation.normalized
    });
  }

  if (options.cm0595ExecutionEvidenceRecordPath) {
    const loadResult = loadCm0595ExecutionEvidenceRecordFile(
      options.cm0595ExecutionEvidenceRecordPath
    );
    const validation = validateCm0595ExecutionEvidenceRecord(loadResult.record);
    if (validation.valid !== true) {
      return {
        ok: false,
        failClosedReason:
          validation.failClosedReasons?.[0] || 'cm0595_execution_evidence_record_apply_failed',
        source: 'cm0655_cm0595_execution_evidence_record_apply_failed_fail_closed'
      };
    }

    const executedExactlyOneWrite =
      validation.normalized.durableMemoryWriteCount === 1;
    input = {
      ...input,
      targetBaseline: validation.normalized.targetBaseline || input.targetBaseline,
      sameBaselineTokenPresentEvidenceAvailable: true,
      tokenPresentEvidenceSameBaseline: true,
      latestTokenPresentEvidenceId:
        validation.normalized.observedTokenPresenceEvidenceSource
          || input.latestTokenPresentEvidenceId,
      cm0595ExecutionEvidenceAvailable: true,
      cm0595ExecutionEvidenceDecision: validation.normalized.decision,
      cm0595DurableMemoryWriteCount:
        validation.normalized.durableMemoryWriteCount,
      cm0595WritePathAuditSideEffectCount:
        validation.normalized.writePathAuditSideEffectCount,
      cm0595ExecutedExactlyOneWrite: executedExactlyOneWrite,
      cm0595FailedClosedWithZeroWrites:
        validation.normalized.durableMemoryWriteCount === 0,
      cm0595ExecutionEvidenceRecordId:
        validation.normalized._sourcePath || validation.normalized.executionRoute,
      noAdditionalDurableWriteBeyondCm0595: executedExactlyOneWrite,
      boundedRecallNotYetEntered: true,
      noSearchProviderConfigStartupPersistenceDriftSinceWrite: true,
      boundedRecallPrepareOnlyScopeStillBounded: true
    };
    source = options.cm0595IssuanceRecordPath
      ? 'cm0655_explicit_input_fixture_plus_widening_adoption_record_plus_cm0595_issuance_record_plus_cm0595_execution_evidence_record_v1'
      : options.wideningAdoptionRecordPath
        ? 'cm0655_explicit_input_fixture_plus_widening_adoption_record_plus_cm0595_execution_evidence_record_v1'
        : 'cm0655_explicit_input_fixture_plus_cm0595_execution_evidence_record_v1';
    cm0595ExecutionEvidenceInputTrace = buildCm0595ExecutionEvidenceInputTrace({
      loadResult,
      normalizedCm0595ExecutionEvidenceRecord: validation.normalized
    });
  }

  return {
    ok: true,
    input,
    source,
    wideningAdoptionRecordInputTrace,
    cm0595IssuanceRecordInputTrace,
    cm0595ExecutionEvidenceInputTrace
  };
}

function collectAuthorizedWritePathWideningAdoptionSurface(options = {}) {
  const fixturePath = options.wideningAdoptionFixturePath || WIDENING_ADOPTION_FIXTURE_PATH;
  try {
    if (!fs.existsSync(fixturePath)) {
      return buildFailClosedWideningAdoptionSurface(
        'fixture_unavailable',
        'cm0646_fixture_missing_fail_closed'
      );
    }
    const preparedInput = loadWideningAdoptionInput(options);
    if (preparedInput.ok !== true) {
      return buildFailClosedWideningAdoptionSurface(
        preparedInput.failClosedReason || 'fixture_or_widening_review_record_parse_failed',
        preparedInput.source || 'cm0646_fixture_or_widening_review_record_parse_failed_fail_closed'
      );
    }
    const evaluation = evaluateAuthorizedWritePathWideningAdoptionReview(preparedInput.input, {
      wideningReviewRecordInputTrace: preparedInput.wideningReviewRecordInputTrace || null,
      wideningAdoptionRecordInputTrace: preparedInput.wideningAdoptionRecordInputTrace || null,
      cm0595IssuanceRecordInputTrace: preparedInput.cm0595IssuanceRecordInputTrace || null,
      cm0595ExecutionEvidenceInputTrace: preparedInput.cm0595ExecutionEvidenceInputTrace || null
    });
    return {
      ...evaluation,
      source: preparedInput.source,
      wideningReviewRecordInputTrace: preparedInput.wideningReviewRecordInputTrace || null,
      wideningAdoptionRecordInputTrace: preparedInput.wideningAdoptionRecordInputTrace || null,
      cm0595IssuanceRecordInputTrace: preparedInput.cm0595IssuanceRecordInputTrace || null,
      cm0595ExecutionEvidenceInputTrace: preparedInput.cm0595ExecutionEvidenceInputTrace || null,
      mutated: false,
      readsRealMemory: false,
      writesDurableState: false,
      publicMcpExpanded: false
    };
  } catch {
    return buildFailClosedWideningAdoptionSurface(
      'fixture_parse_failed',
      'cm0646_fixture_parse_failed_fail_closed'
    );
  }
}

function collectAuthorizedWritePathBoundedRecallPreparationSurface(options = {}) {
  const fixturePath =
    options.boundedRecallPreparationFixturePath
    || BOUNDED_RECALL_PREPARATION_FIXTURE_PATH;
  try {
    if (!fs.existsSync(fixturePath)) {
      return buildFailClosedBoundedRecallPreparationSurface(
        'fixture_unavailable',
        'cm0655_fixture_missing_fail_closed'
      );
    }
    const preparedInput = loadBoundedRecallPreparationInput(options);
    if (preparedInput.ok !== true) {
      return buildFailClosedBoundedRecallPreparationSurface(
        preparedInput.failClosedReason || 'fixture_or_later_record_parse_failed',
        preparedInput.source || 'cm0655_fixture_or_later_record_parse_failed_fail_closed'
      );
    }
    const evaluation = evaluateAuthorizedWritePathBoundedRecallPreparationReview(
      preparedInput.input,
      {
        wideningAdoptionRecordInputTrace:
          preparedInput.wideningAdoptionRecordInputTrace || null,
        cm0595IssuanceRecordInputTrace:
          preparedInput.cm0595IssuanceRecordInputTrace || null,
        cm0595ExecutionEvidenceInputTrace:
          preparedInput.cm0595ExecutionEvidenceInputTrace || null
      }
    );
    return {
      ...evaluation,
      source: preparedInput.source,
      wideningAdoptionRecordInputTrace:
        preparedInput.wideningAdoptionRecordInputTrace || null,
      cm0595IssuanceRecordInputTrace:
        preparedInput.cm0595IssuanceRecordInputTrace || null,
      cm0595ExecutionEvidenceInputTrace:
        preparedInput.cm0595ExecutionEvidenceInputTrace || null,
      mutated: false,
      readsRealMemory: false,
      writesDurableState: false,
      publicMcpExpanded: false
    };
  } catch {
    return buildFailClosedBoundedRecallPreparationSurface(
      'fixture_parse_failed',
      'cm0655_fixture_parse_failed_fail_closed'
    );
  }
}

function loadBoundedRecallCloseoutInput(options = {}) {
  const fixturePath =
    options.boundedRecallCloseoutFixturePath
    || BOUNDED_RECALL_CLOSEOUT_FIXTURE_PATH;
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  let input = fixture;
  let source = 'cm0661_explicit_input_fixture_v1';
  let boundedRecallApprovalIssuanceRecordInputTrace = null;
  let boundedRecallExecutionEvidenceInputTrace = null;

  if (options.boundedRecallIssuanceRecordPath) {
    const loadResult = loadBoundedRecallApprovalIssuanceRecordFile(
      options.boundedRecallIssuanceRecordPath
    );
    const validation = validateBoundedRecallApprovalIssuanceRecord(loadResult.record);
    if (validation.valid !== true) {
      return {
        ok: false,
        failClosedReason:
          validation.failClosedReasons?.[0] || 'bounded_recall_issuance_record_apply_failed',
        source: 'cm0661_bounded_recall_issuance_record_apply_failed_fail_closed'
      };
    }

    input = {
      ...input,
      targetBaseline: validation.normalized.targetBaseline || input.targetBaseline,
      boundedRecallIssuanceRecordAvailable: true,
      boundedRecallIssuanceDecision: validation.normalized.decision,
      boundedRecallIssuedExactLineMatches:
        validation.normalized.decision === 'BOUNDED_RECALL_AUTO_AUTHORIZATION_LINE_ISSUED_NOT_EXECUTED'
        && Boolean(validation.normalized.issuedApprovalText),
      boundedRecallExecutionStartedBeforeEvidence:
        validation.normalized.boundedRecallExecutionStarted === true,
      boundedRecallIssuanceRecordId:
        validation.normalized._sourcePath || validation.normalized.issuanceRoute
    };
    source = 'cm0661_explicit_input_fixture_plus_bounded_recall_issuance_record_v1';
    boundedRecallApprovalIssuanceRecordInputTrace =
      buildBoundedRecallApprovalIssuanceRecordInputTrace({
        loadResult,
        normalizedBoundedRecallApprovalIssuanceRecord: validation.normalized
      });
  }

  if (options.boundedRecallExecutionEvidenceRecordPath) {
    const loadResult = loadBoundedRecallExecutionEvidenceRecordFile(
      options.boundedRecallExecutionEvidenceRecordPath
    );
    const validation = validateBoundedRecallExecutionEvidenceRecord(loadResult.record);
    if (validation.valid !== true) {
      return {
        ok: false,
        failClosedReason:
          validation.failClosedReasons?.[0] || 'bounded_recall_execution_evidence_record_apply_failed',
        source: 'cm0661_bounded_recall_execution_evidence_record_apply_failed_fail_closed'
      };
    }

    const preparedExactlyOneLaterApproval =
      validation.normalized.preparedLaterApprovalLineCount === 1;
    input = {
      ...input,
      targetBaseline: validation.normalized.targetBaseline || input.targetBaseline,
      boundedRecallExecutionEvidenceAvailable: true,
      boundedRecallExecutionEvidenceDecision: validation.normalized.decision,
      preparedLaterApprovalLineCount:
        validation.normalized.preparedLaterApprovalLineCount,
      boundedRecallExecutionCount: validation.normalized.boundedRecallExecutionCount,
      boundedRecallPreparedExactlyOneLaterApproval:
        preparedExactlyOneLaterApproval,
      boundedRecallRuntimeStayedZero:
        validation.normalized.boundedRecallExecutionCount === 0,
      boundedRecallExecutionEvidenceRecordId:
        validation.normalized._sourcePath || validation.normalized.executionRoute,
      noSearchRecordProviderConfigStartupPersistenceDriftSincePreparation:
        validation.normalized.boundedRecallExecutionCount === 0,
      scopeStillLimitedToBoundedRecallPreparation: true,
      forbiddenActionsStillForbidden: true,
      stillForbiddenActions: [
        'bounded_recall_runtime_execution',
        'search_memory',
        'record_memory',
        'marker_search',
        'provider_call',
        'config_edit',
        'env_edit',
        'watchdog_startup_persistence',
        'public_mcp_expansion',
        'additional_durable_write',
        'readiness_claim'
      ]
    };
    source = options.boundedRecallIssuanceRecordPath
      ? 'cm0661_explicit_input_fixture_plus_bounded_recall_issuance_record_plus_bounded_recall_execution_evidence_record_v1'
      : 'cm0661_explicit_input_fixture_plus_bounded_recall_execution_evidence_record_v1';
    boundedRecallExecutionEvidenceInputTrace =
      buildBoundedRecallExecutionEvidenceInputTrace({
        loadResult,
        normalizedBoundedRecallExecutionEvidenceRecord: validation.normalized
      });
  }

  return {
    ok: true,
    input,
    source,
    boundedRecallApprovalIssuanceRecordInputTrace,
    boundedRecallExecutionEvidenceInputTrace
  };
}

function collectAuthorizedWritePathBoundedRecallCloseoutSurface(options = {}) {
  const fixturePath =
    options.boundedRecallCloseoutFixturePath
    || BOUNDED_RECALL_CLOSEOUT_FIXTURE_PATH;
  try {
    if (!fs.existsSync(fixturePath)) {
      return buildFailClosedBoundedRecallCloseoutSurface(
        'fixture_unavailable',
        'cm0661_fixture_missing_fail_closed'
      );
    }
    const preparedInput = loadBoundedRecallCloseoutInput(options);
    if (preparedInput.ok !== true) {
      return buildFailClosedBoundedRecallCloseoutSurface(
        preparedInput.failClosedReason || 'fixture_or_later_record_parse_failed',
        preparedInput.source || 'cm0661_fixture_or_later_record_parse_failed_fail_closed'
      );
    }
    const evaluation = evaluateAuthorizedWritePathBoundedRecallCloseoutReview(
      preparedInput.input,
      {
        boundedRecallApprovalIssuanceRecordInputTrace:
          preparedInput.boundedRecallApprovalIssuanceRecordInputTrace || null,
        boundedRecallExecutionEvidenceInputTrace:
          preparedInput.boundedRecallExecutionEvidenceInputTrace || null
      }
    );
    return {
      ...evaluation,
      source: preparedInput.source,
      boundedRecallApprovalIssuanceRecordInputTrace:
        preparedInput.boundedRecallApprovalIssuanceRecordInputTrace || null,
      boundedRecallExecutionEvidenceInputTrace:
        preparedInput.boundedRecallExecutionEvidenceInputTrace || null,
      mutated: false,
      readsRealMemory: false,
      writesDurableState: false,
      publicMcpExpanded: false
    };
  } catch {
    return buildFailClosedBoundedRecallCloseoutSurface(
      'fixture_parse_failed',
      'cm0661_fixture_parse_failed_fail_closed'
    );
  }
}

function buildGovernanceSurface(report, options = {}) {
  const tolerateUnavailable = options.tolerateUnavailable !== false;
  const autoAuthorization = report?.autoAuthorization || collectAuthorizedWritePathAutoAuthorizationSurface();
  const wideningReview = report?.wideningReview || collectAuthorizedWritePathWideningReviewSurface();
  const wideningAdoption = report?.wideningAdoption || collectAuthorizedWritePathWideningAdoptionSurface();
  const boundedRecallPreparation =
    report?.boundedRecallPreparation
    || collectAuthorizedWritePathBoundedRecallPreparationSurface();
  const boundedRecallCloseout =
    report?.boundedRecallCloseout
    || collectAuthorizedWritePathBoundedRecallCloseoutSurface();
  if (!report || report.error) {
    return {
      status: tolerateUnavailable ? 'warn' : 'error',
      reviewLevel: 'unavailable',
      message: report?.summary?.message || report?.error || 'Governance snapshot unavailable.',
      counts: {
        totalRecords: 0,
        proposalCount: 0,
        tombstonedCount: 0,
        supersededCount: 0,
        supersessionInitiated: 0,
        stale30d: 0,
        stale90d: 0
      },
      statusDistribution: {},
      retention: {},
      autoAuthorization,
      wideningReview,
      wideningAdoption,
      boundedRecallPreparation,
      boundedRecallCloseout,
      readPolicy: collectReadPolicySurface(),
      hints: [
        '治理快照暂不可用，先核对 SQLite 路径与本地数据目录。'
      ]
    };
  }

  const counts = {
    totalRecords: report.summary?.totalRecords || 0,
    proposalCount: report.summary?.proposalCount || 0,
    tombstonedCount: report.summary?.tombstonedCount || 0,
    supersededCount: report.summary?.supersededCount || 0,
    supersessionInitiated: report.supersession?.supersessionInitiated || 0,
    stale30d: report.summary?.stale30d || 0,
    stale90d: report.summary?.stale90d || 0
  };
  const hints = [];
  let status = 'ok';
  let reviewLevel = 'nominal';

  if (counts.proposalCount > 0) {
    status = 'warn';
    reviewLevel = 'needs-review';
    hints.push(`${counts.proposalCount} 条 proposal 仍待人工审查。`);
  }

  if (counts.stale90d > 0) {
    status = 'warn';
    reviewLevel = 'needs-review';
    hints.push(`${counts.stale90d} 条 active memory 超过 90 天未更新，建议优先做治理复核。`);
  } else if (counts.stale30d > 0) {
    if (reviewLevel === 'nominal') {
      reviewLevel = 'observe';
    }
    status = 'warn';
    hints.push(`${counts.stale30d} 条 active memory 超过 30 天未更新，可安排例行复核。`);
  }

  if (counts.tombstonedCount > 0) {
    if (reviewLevel === 'nominal') {
      reviewLevel = 'observe';
    }
    hints.push(`${counts.tombstonedCount} 条 tombstoned 记录仍保留审计留痕。`);
  }

  if (counts.supersededCount > 0 || counts.supersessionInitiated > 0) {
    if (reviewLevel === 'nominal') {
      reviewLevel = 'observe';
    }
    hints.push(
      `${counts.supersededCount} 条 superseded 记录、${counts.supersessionInitiated} 条 supersession 链接可用于后续 compact/review。`
    );
  }

  if (hints.length === 0) {
    hints.push('治理快照未见待处理信号。');
  }

  if (wideningReview.decision === 'WIDENING_REVIEW_PASSED_PROCEED_TO_CM0607') {
    hints.push('Widening review 已通过到 CM-0607 adoption record，但仍未自动授权 CM-0595。');
  } else if (wideningReview.decision === 'WIDENING_REVIEW_PASSED_ADOPTION_NOT_GRANTED') {
    hints.push('Widening review 已通过技术门槛，但 adoption 仍未 granted。');
  } else {
    hints.push(`Widening review 仍为 fail-closed：${wideningReview.failClosedReasons?.[0] || 'unspecified'}。`);
  }
  if (wideningAdoption.decision === 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY') {
    hints.push(`Widening adoption 已被显式 granted，但仍只允许 future CM-0595 narrow boundary；preview=${wideningAdoption.cm0595ApprovalLinePreview?.previewUsableNow === true ? 'ready' : 'not-ready'}。`);
  } else if (wideningAdoption.decision === 'WIDENING_ADOPTION_DENIED') {
    hints.push('Widening adoption 已进入显式审查，但当前仍未 granted。');
  } else {
    hints.push(`Widening adoption 仍为 fail-closed：${wideningAdoption.failClosedReasons?.[0] || 'unspecified'}。`);
  }
  if (wideningAdoption.cm0595IssuanceRecordInputTrace?.traceAvailable === true) {
    hints.push(`CM-0649 issuance record 已显式输入：${wideningAdoption.cm0595IssuanceRecordInputTrace.sourceFileName}；exactLineIssued=${wideningAdoption.cm0595IssuanceRecordInputTrace.exactLineIssued === true ? 'yes' : 'no'}。`);
  }
  if (wideningAdoption.cm0595ExecutionEvidenceInputTrace?.traceAvailable === true) {
    hints.push(`CM-0650 execution evidence 已显式输入：${wideningAdoption.cm0595ExecutionEvidenceInputTrace.sourceFileName}；durableWriteCount=${wideningAdoption.cm0595ExecutionEvidenceInputTrace.durableMemoryWriteCount}。`);
  }
  if (boundedRecallPreparation.decision === 'BOUNDED_RECALL_APPROVAL_PREPARED_EXACT_ONLY') {
    hints.push('Bounded recall preparation 已进入 future exact-approval prepared-only 状态；仍不允许当前执行 bounded recall 或 runtime。');
  } else if (boundedRecallPreparation.decision === 'BOUNDED_RECALL_APPROVAL_ABORTED_DRIFT') {
    hints.push(`Bounded recall preparation 已因 drift fail-closed：${boundedRecallPreparation.failClosedReasons?.[0] || 'unspecified'}。`);
  } else {
    hints.push(`Bounded recall preparation 仍为 fail-closed：${boundedRecallPreparation.failClosedReasons?.[0] || 'unspecified'}。`);
  }
  if (boundedRecallPreparation.cm0595IssuanceRecordInputTrace?.traceAvailable === true) {
    hints.push(`Bounded recall preparation 已显式输入 CM-0649 issuance record：${boundedRecallPreparation.cm0595IssuanceRecordInputTrace.sourceFileName}。`);
  }
  if (boundedRecallPreparation.cm0595ExecutionEvidenceInputTrace?.traceAvailable === true) {
    hints.push(`Bounded recall preparation 已显式输入 CM-0650 execution evidence：${boundedRecallPreparation.cm0595ExecutionEvidenceInputTrace.sourceFileName}。`);
  }
  if (boundedRecallCloseout.decision === 'BOUNDED_RECALL_CLOSEOUT_RECORDED_PREPARED_LATER_APPROVAL_ONLY') {
    hints.push('Bounded recall closeout 已记录为 prepared-later-approval-only；后续最多只可单独准备 future exact bounded-recall runtime approval。');
  } else if (boundedRecallCloseout.decision === 'BOUNDED_RECALL_CLOSEOUT_ABORTED_DRIFT') {
    hints.push(`Bounded recall closeout 已因 drift fail-closed：${boundedRecallCloseout.failClosedReasons?.[0] || 'unspecified'}。`);
  } else {
    hints.push(`Bounded recall closeout 仍为 fail-closed：${boundedRecallCloseout.failClosedReasons?.[0] || 'unspecified'}。`);
  }
  if (boundedRecallCloseout.boundedRecallApprovalIssuanceRecordInputTrace?.traceAvailable === true) {
    hints.push(`Bounded recall closeout 已显式输入 CM-0658 issuance record：${boundedRecallCloseout.boundedRecallApprovalIssuanceRecordInputTrace.sourceFileName}。`);
  }
  if (boundedRecallCloseout.boundedRecallExecutionEvidenceInputTrace?.traceAvailable === true) {
    hints.push(`Bounded recall closeout 已显式输入 CM-0659 execution evidence：${boundedRecallCloseout.boundedRecallExecutionEvidenceInputTrace.sourceFileName}。`);
  }

  const message = status === 'ok'
    ? 'Governance snapshot looks steady.'
    : reviewLevel === 'needs-review'
      ? 'Governance snapshot shows review-needed signals.'
      : 'Governance snapshot shows low-risk follow-up signals.';

  return {
    status,
    reviewLevel,
    message,
    counts,
    statusDistribution: report.statusDistribution || {},
    retention: report.retention || {},
    autoAuthorization,
    wideningReview,
    wideningAdoption,
    boundedRecallPreparation,
    boundedRecallCloseout,
    readPolicy: report.readPolicy || collectReadPolicySurface(),
    hints
  };
}

function attachReviewSurface(report, options = {}) {
  return {
    ...report,
    review: buildGovernanceSurface(report, {
      tolerateUnavailable: options.tolerateUnavailable
    })
  };
}

function collectReport(options = {}) {
  const dbPath = getDbPath();
  const autoAuthorization = collectAuthorizedWritePathAutoAuthorizationSurface(options);
  const wideningReview = collectAuthorizedWritePathWideningReviewSurface(options);
  const wideningAdoption = collectAuthorizedWritePathWideningAdoptionSurface(options);
  const boundedRecallPreparation =
    collectAuthorizedWritePathBoundedRecallPreparationSurface(options);
  const boundedRecallCloseout =
    collectAuthorizedWritePathBoundedRecallCloseoutSurface(options);
  if (!fs.existsSync(dbPath)) {
    return attachReviewSurface({
      mode: 'governance-report',
      destructive: false,
      autoAuthorization,
      wideningReview,
      wideningAdoption,
      boundedRecallPreparation,
      boundedRecallCloseout,
      readPolicy: collectReadPolicySurface(),
      summary: {
        status: 'error',
        message: `Database not found: ${dbPath}`
      },
      error: 'Database not found: ' + dbPath,
      paths: {
        dbPath
      }
    }, { tolerateUnavailable: false });
  }
  const db = new DatabaseSync(dbPath, { readOnly: true });
  const tableExists = runQueryOne(
    db,
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'memory_records'"
  );
  if (!tableExists) {
    db.close();
    return attachReviewSurface({
      mode: 'governance-report',
      destructive: false,
      autoAuthorization,
      wideningReview,
      wideningAdoption,
      boundedRecallPreparation,
      boundedRecallCloseout,
      readPolicy: collectReadPolicySurface(),
      summary: {
        status: 'error',
        message: `memory_records table not found: ${dbPath}`
      },
      error: `memory_records table not found: ${dbPath}`,
      paths: {
        dbPath
      }
    }, { tolerateUnavailable: false });
  }

  // Status distribution
  const statusDist = runQuery(db,
    'SELECT status, COUNT(*) as cnt FROM memory_records GROUP BY status ORDER BY cnt DESC');

  // Scope coverage
  const projectDist = runQuery(db,
    'SELECT project_id, COUNT(*) as cnt FROM memory_records GROUP BY project_id ORDER BY cnt DESC');
  const visibilityDist = runQuery(db,
    'SELECT visibility, COUNT(*) as cnt FROM memory_records GROUP BY visibility ORDER BY cnt DESC');
  const clientDist = runQuery(db,
    'SELECT client_id, COUNT(*) as cnt FROM memory_records GROUP BY client_id ORDER BY cnt DESC');

  // Confidence distribution (bucketed)
  const confHigh = runQueryOne(db,
    'SELECT COUNT(*) as cnt FROM memory_records WHERE confidence >= 0.8')?.cnt || 0;
  const confMed = runQueryOne(db,
    'SELECT COUNT(*) as cnt FROM memory_records WHERE confidence >= 0.4 AND confidence < 0.8')?.cnt || 0;
  const confLow = runQueryOne(db,
    'SELECT COUNT(*) as cnt FROM memory_records WHERE confidence < 0.4')?.cnt || 0;
  const totalRecords = runQueryOne(db,
    'SELECT COUNT(*) as cnt FROM memory_records')?.cnt || 0;

  // Stale indicators
  const now = new Date();
  const stale30d = runQueryOne(db,
    "SELECT COUNT(*) as cnt FROM memory_records WHERE updated_at < ? AND status = 'active'",
    [new Date(now - 30 * 86400000).toISOString()])?.cnt || 0;
  const stale90d = runQueryOne(db,
    "SELECT COUNT(*) as cnt FROM memory_records WHERE updated_at < ? AND status = 'active'",
    [new Date(now - 90 * 86400000).toISOString()])?.cnt || 0;

  // Supersession chains
  const supersededCount = runQueryOne(db,
    "SELECT COUNT(*) as cnt FROM memory_records WHERE superseded_by IS NOT NULL")?.cnt || 0;
  const supersessionInitiated = runQueryOne(db,
    "SELECT COUNT(*) as cnt FROM memory_records WHERE supersedes IS NOT NULL")?.cnt || 0;

  // Tombstone records
  const tombstonedCount = runQueryOne(db,
    "SELECT COUNT(*) as cnt FROM memory_records WHERE status = 'tombstoned'")?.cnt || 0;

  // Proposal records
  const proposalCount = runQueryOne(db,
    "SELECT COUNT(*) as cnt FROM memory_records WHERE status = 'proposal'")?.cnt || 0;

  // Scope coverage (NULL vs filled)
  const scopeNullCount = runQueryOne(db,
    "SELECT COUNT(*) as cnt FROM memory_records WHERE project_id = '' OR project_id IS NULL")?.cnt || 0;
  const scopeFilledCount = totalRecords - scopeNullCount;

  // Unscoped records (no task_id)
  const taskScopedCount = runQueryOne(db,
    "SELECT COUNT(*) as cnt FROM memory_records WHERE task_id IS NOT NULL AND task_id != ''")?.cnt || 0;

  // Retention policy distribution
  const retentionDist = runQuery(db,
    'SELECT retention_policy, COUNT(*) as cnt FROM memory_records GROUP BY retention_policy ORDER BY cnt DESC');

  db.close();

  const report = {
    mode: 'governance-report',
    destructive: false,
    generatedAt: new Date().toISOString(),
    summary: {
      status: 'ok',
      message: 'Read-only governance snapshot generated.',
      totalRecords,
      proposalCount,
      tombstonedCount,
      supersededCount,
      stale30d,
      stale90d
    },
    paths: {
      dbPath
    },
    totalRecords,
    statusDistribution: toDistribution(statusDist, 'status'),
    scopeCoverage: {
      project: toDistribution(projectDist, 'project_id'),
      visibility: toDistribution(visibilityDist, 'visibility'),
      client: toDistribution(clientDist, 'client_id'),
      scopeFilledRecords: scopeFilledCount,
      scopeNullRecords: scopeNullCount,
      taskScopedRecords: taskScopedCount
    },
    confidence: {
      high: confHigh,
      medium: confMed,
      low: confLow
    },
    staleness: {
      activeNotUpdated30d: stale30d,
      activeNotUpdated90d: stale90d
    },
    supersession: {
      supersededRecords: supersededCount,
      supersessionInitiated: supersessionInitiated
    },
    tombstoned: tombstonedCount,
    proposals: proposalCount,
    retention: Object.fromEntries(retentionDist.map(r => [r.retention_policy, r.cnt]))
  };

  report.readPolicy = collectReadPolicySurface();
  report.autoAuthorization = autoAuthorization;
  report.wideningReview = wideningReview;
  report.wideningAdoption = wideningAdoption;
  report.boundedRecallPreparation = boundedRecallPreparation;
  report.boundedRecallCloseout = boundedRecallCloseout;

  return attachReviewSurface(report, { tolerateUnavailable: false });
}

function renderText(report, options = {}) {
  if (report.error) return 'Error: ' + report.error + '\n';
  const l = [];
  const autoAuthorizationBundleSummary = formatAutoAuthorizationBundleSummary(report.review.autoAuthorization);
  l.push(`Governance Report — ${report.generatedAt}`);
  l.push('─'.repeat(50));
  l.push('');
  l.push(`Status: ${report.summary.status}`);
  l.push(report.summary.message);
  l.push('');
  l.push('Review:');
  l.push(`  status:      ${report.review.status}`);
  l.push(`  level:       ${report.review.reviewLevel}`);
  l.push(`  message:     ${report.review.message}`);
  l.push(`  read-policy: lifecycle=${report.review.readPolicy.lifecyclePolicyEnabled}, soft=${report.review.readPolicy.softReadPolicyEnabled}, hidden=${report.review.readPolicy.recentHiddenByLifecycleCount}, stale=${report.review.readPolicy.recentStaleResultCount}, columns=${report.review.readPolicy.lifecycleColumnAvailable ?? 'unavailable'}`);
  l.push(`  auto-auth:   ${report.review.autoAuthorization.allowedGovernanceOutput} (${report.review.autoAuthorization.status}, blockedOn=${report.review.autoAuthorization.currentBlockedOn || 'none'})`);
  l.push(`  auto-stage:  ${report.review.autoAuthorization.operatorActionPlan?.currentStage || 'unknown'}`);
  if (report.review.autoAuthorization.assertionRecordInputTrace?.traceAvailable === true) {
    l.push(`  auto-input:  ${formatAssertionRecordInputTraceSummary(report.review.autoAuthorization.assertionRecordInputTrace)}`);
  } else {
    l.push('  auto-input:  none');
  }
  l.push(`  auto-bundle: ${report.review.autoAuthorization.artifactBundleDraft?.bundleKind || 'unknown'}`);
  l.push(`  auto-cmd:    ${report.review.autoAuthorization.commandPreviewBundle?.bundleKind || 'unknown'}`);
  l.push(`  auto-packet: ${report.review.autoAuthorization.operatorPacketDraft?.packetKind || 'unknown'}`);
  l.push(`  auto-draft:  ${report.review.autoAuthorization.renderedArtifactTextSurface?.selectedDraftId || 'unknown'}`);
  l.push(`  auto-pktxt:  ${report.review.autoAuthorization.renderedOperatorPacketTextSurface?.packetKind || 'unknown'}`);
  l.push(`  auto-brief: ${report.review.autoAuthorization.renderedOperatorBriefTextSurface?.briefKind || 'unknown'}`);
  l.push(`  auto-next:   ${report.review.autoAuthorization.operatorActionPlan?.nextStepRef || 'none'}`);
  l.push(`  auto-pack:   ${autoAuthorizationBundleSummary}`);
  l.push(`  widen:       ${report.review.wideningReview.decision} (${report.review.wideningReview.status})`);
  l.push(`  widen-gate:  cm0604=${report.review.wideningReview.cm0604Satisfied === true}, cm0606=${report.review.wideningReview.cm0606BridgeActivated === true}`);
  l.push(`  widen-next:  ${report.review.wideningReview.reviewRecordDraft?.nextBoundary || report.review.wideningReview.nextStep || 'none'}`);
  l.push(`  widen-text:  ${report.review.wideningReview.renderedReviewTextSurface?.reviewKind || 'unknown'}`);
  if (report.review.autoAuthorization.commandPreviewBundle?.primaryCommand) {
    l.push(`  auto-cmdln:  ${report.review.autoAuthorization.commandPreviewBundle.primaryCommand}`);
  }
  for (const hint of report.review.hints || []) {
    l.push(`  hint:        ${hint}`);
  }
  l.push('');
  l.push(`Total Records: ${report.totalRecords}`);
  l.push('');
  l.push('Status Distribution:');
  for (const [k, v] of Object.entries(report.statusDistribution)) {
    l.push(`  ${k.padEnd(14)} ${v}`);
  }
  l.push('');
  l.push('Scope Coverage:');
  l.push(`  scope-filled: ${report.scopeCoverage.scopeFilledRecords}`);
  l.push(`  scope-null:   ${report.scopeCoverage.scopeNullRecords}`);
  l.push(`  task-scoped:  ${report.scopeCoverage.taskScopedRecords}`);
  l.push('  project:');
  for (const [k, v] of Object.entries(report.scopeCoverage.project)) {
    l.push(`    ${k.padEnd(20)} ${v}`);
  }
  l.push('  visibility:');
  for (const [k, v] of Object.entries(report.scopeCoverage.visibility)) {
    l.push(`    ${k.padEnd(20)} ${v}`);
  }
  l.push('  client:');
  for (const [k, v] of Object.entries(report.scopeCoverage.client)) {
    l.push(`    ${k.padEnd(20)} ${v}`);
  }
  l.push('');
  l.push('Confidence:');
  l.push(`  high (>=0.8):   ${report.confidence.high}`);
  l.push(`  medium (0.4-0.8): ${report.confidence.medium}`);
  l.push(`  low (<0.4):     ${report.confidence.low}`);
  l.push('');
  l.push('Staleness:');
  l.push(`  active, not updated 30d: ${report.staleness.activeNotUpdated30d}`);
  l.push(`  active, not updated 90d: ${report.staleness.activeNotUpdated90d}`);
  l.push('');
  l.push('Lifecycle:');
  l.push(`  superseded:   ${report.supersession.supersededRecords}`);
  l.push(`  supersessions: ${report.supersession.supersessionInitiated}`);
  l.push(`  tombstoned:   ${report.tombstoned}`);
  l.push(`  proposals:    ${report.proposals}`);
  l.push('');
  l.push('Retention:');
  for (const [k, v] of Object.entries(report.retention)) {
    l.push(`  ${k.padEnd(14)} ${v}`);
  }
  if (options.showRenderedOperatorArtifactText === true && report.review.autoAuthorization.renderedArtifactTextSurface?.selectedDraftMarkdown) {
    l.push('');
    l.push('[rendered-operator-artifact-text]');
    l.push(report.review.autoAuthorization.renderedArtifactTextSurface.selectedDraftMarkdown.trimEnd());
  }
  if (options.showRenderedOperatorPacketText === true && report.review.autoAuthorization.renderedOperatorPacketTextSurface?.markdown) {
    l.push('');
    l.push('[rendered-operator-packet-text]');
    l.push(report.review.autoAuthorization.renderedOperatorPacketTextSurface.markdown.trimEnd());
  }
  if (options.showRenderedOperatorBriefText === true && report.review.autoAuthorization.renderedOperatorBriefTextSurface?.markdown) {
    l.push('');
    l.push('[rendered-operator-brief-text]');
    l.push(report.review.autoAuthorization.renderedOperatorBriefTextSurface.markdown.trimEnd());
  }
  if (options.showRenderedWideningReviewText === true && report.review.wideningReview.renderedReviewTextSurface?.markdown) {
    l.push('');
    l.push('[rendered-widening-review-text]');
    l.push(report.review.wideningReview.renderedReviewTextSurface.markdown.trimEnd());
  }
  l.push(`  adopt:       ${report.review.wideningAdoption.decision} (${report.review.wideningAdoption.status})`);
  l.push(`  adopt-next:  ${report.review.wideningAdoption.adoptionRecordDraft?.nextBoundary || report.review.wideningAdoption.nextStep || 'none'}`);
  l.push(`  adopt-text:  ${report.review.wideningAdoption.renderedAdoptionTextSurface?.adoptionKind || 'unknown'}`);
  l.push(`  adopt-cm59:  ${report.review.wideningAdoption.cm0595ApprovalLinePreview?.previewUsableNow === true ? 'ready' : 'not-ready'} (${report.review.wideningAdoption.cm0595OperatorPacketDraft?.packetKind || 'unknown'})`);
  l.push(`  adopt-cm59-issue: ${report.review.wideningAdoption.cm0595IssuanceRecordDraft?.draftUsableNow === true ? 'ready' : 'not-ready'} (${report.review.wideningAdoption.cm0595IssuanceRecordDraft?.draftKind || 'unknown'})`);
  l.push(`  adopt-cm59-exec:  ${report.review.wideningAdoption.cm0595ExecutionEvidenceDraft?.draftUsableNow === true ? 'ready' : 'not-ready'} (${report.review.wideningAdoption.cm0595ExecutionEvidenceDraft?.draftKind || 'unknown'})`);
  l.push(`  adopt-cm59-rec:  ${report.review.wideningAdoption.cm0595IssuanceRecordInputTrace?.traceAvailable === true ? report.review.wideningAdoption.cm0595IssuanceRecordInputTrace.sourceFileName : 'none'}`);
  l.push(`  adopt-cm59-evd:  ${report.review.wideningAdoption.cm0595ExecutionEvidenceInputTrace?.traceAvailable === true ? report.review.wideningAdoption.cm0595ExecutionEvidenceInputTrace.sourceFileName : 'none'}`);
  l.push(`  recall-prep: ${report.review.boundedRecallPreparation.decision} (${report.review.boundedRecallPreparation.status})`);
  l.push(`  recall-next: ${report.review.boundedRecallPreparation.nextStep || 'none'}`);
  l.push(`  recall-text: ${report.review.boundedRecallPreparation.renderedBoundedRecallTextSurface?.previewKind || 'unknown'}`);
  l.push(`  recall-approval: ${report.review.boundedRecallPreparation.boundedRecallApprovalPrepared === true ? 'ready' : 'not-ready'} (${report.review.boundedRecallPreparation.boundedRecallOperatorPacketDraft?.status || 'unknown'})`);
  l.push(`  recall-cmd: ${report.review.boundedRecallPreparation.boundedRecallCommandPreviewBundle?.bundleKind || 'unknown'} (${report.review.boundedRecallPreparation.boundedRecallCommandPreviewBundle?.resolvedRecordPathMode || 'unknown'})`);
  l.push(`  recall-issue-draft: ${report.review.boundedRecallPreparation.boundedRecallApprovalIssuanceRecordDraft?.draftUsableNow === true ? 'ready' : 'not-ready'} (${report.review.boundedRecallPreparation.boundedRecallApprovalIssuanceRecordDraft?.draftKind || 'unknown'})`);
  l.push(`  recall-exec-draft:  ${report.review.boundedRecallPreparation.boundedRecallExecutionEvidenceDraft?.draftUsableNow === true ? 'ready' : 'not-ready'} (${report.review.boundedRecallPreparation.boundedRecallExecutionEvidenceDraft?.draftKind || 'unknown'})`);
  l.push(`  recall-issued: ${report.review.boundedRecallPreparation.cm0595IssuanceRecordInputTrace?.traceAvailable === true ? report.review.boundedRecallPreparation.cm0595IssuanceRecordInputTrace.sourceFileName : 'none'}`);
  l.push(`  recall-evidence: ${report.review.boundedRecallPreparation.cm0595ExecutionEvidenceInputTrace?.traceAvailable === true ? report.review.boundedRecallPreparation.cm0595ExecutionEvidenceInputTrace.sourceFileName : 'none'}`);
  l.push(`  recall-closeout: ${report.review.boundedRecallCloseout.decision} (${report.review.boundedRecallCloseout.status})`);
  l.push(`  recall-closeout-next: ${report.review.boundedRecallCloseout.nextStep || 'none'}`);
  l.push(`  recall-closeout-text: ${report.review.boundedRecallCloseout.renderedCloseoutTextSurface?.closeoutKind || 'unknown'}`);
  l.push(`  recall-closeout-ready: ${report.review.boundedRecallCloseout.boundedRecallCloseoutReady === true ? 'ready' : 'not-ready'} (${report.review.boundedRecallCloseout.closeoutRecordDraft?.status || 'unknown'})`);
  l.push(`  recall-closeout-issue: ${report.review.boundedRecallCloseout.boundedRecallApprovalIssuanceRecordInputTrace?.traceAvailable === true ? report.review.boundedRecallCloseout.boundedRecallApprovalIssuanceRecordInputTrace.sourceFileName : 'none'}`);
  l.push(`  recall-closeout-evidence: ${report.review.boundedRecallCloseout.boundedRecallExecutionEvidenceInputTrace?.traceAvailable === true ? report.review.boundedRecallCloseout.boundedRecallExecutionEvidenceInputTrace.sourceFileName : 'none'}`);
  if (options.showRenderedWideningAdoptionText === true && report.review.wideningAdoption.renderedAdoptionTextSurface?.markdown) {
    l.push('');
    l.push('[rendered-widening-adoption-text]');
    l.push(report.review.wideningAdoption.renderedAdoptionTextSurface.markdown.trimEnd());
  }
  if (options.showRenderedBoundedRecallText === true && report.review.boundedRecallPreparation.renderedBoundedRecallTextSurface?.markdown) {
    l.push('');
    l.push('[rendered-bounded-recall-text]');
    l.push(report.review.boundedRecallPreparation.renderedBoundedRecallTextSurface.markdown.trimEnd());
  }
  if (options.showRenderedBoundedRecallCloseoutText === true && report.review.boundedRecallCloseout.renderedCloseoutTextSurface?.markdown) {
    l.push('');
    l.push('[rendered-bounded-recall-closeout-text]');
    l.push(report.review.boundedRecallCloseout.renderedCloseoutTextSurface.markdown.trimEnd());
  }
  return l.join('\n') + '\n';
}

function formatAutoAuthorizationBundleSummary(autoAuthorization) {
  const bundleKind = autoAuthorization?.artifactBundleDraft?.bundleKind || 'unknown';
  const nextStepRef = autoAuthorization?.operatorActionPlan?.nextStepRef || 'none';
  const draftId = autoAuthorization?.renderedArtifactTextSurface?.selectedDraftId || 'unknown';
  return `bundle=${bundleKind}, draft=${draftId}, next=${nextStepRef}`;
}

function formatAssertionRecordInputTraceSummary(trace) {
  if (!trace || trace.traceAvailable !== true) {
    return 'none';
  }
  const fileName = trace.sourceFileName || 'unknown';
  const sourceFormat = trace.sourceFormat || 'unknown';
  return `format=${sourceFormat}, file=${fileName}, c6Accepted=${trace.assertionAcceptedForC6 === true}`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = collectReport(options);
  if (options.json) {
    process.stdout.write(JSON.stringify(report) + '\n');
  } else {
    process.stdout.write(renderText(report, options));
  }
  if (report.error) process.exitCode = 1;
}

if (require.main === module) {
  main();
}

module.exports = {
  parseArgs,
  getDbPath,
  collectReport,
  renderText,
  buildGovernanceSurface,
  attachReviewSurface,
  buildReadPolicySurface,
  collectReadPolicySurface,
  collectAuthorizedWritePathAutoAuthorizationSurface,
  collectAuthorizedWritePathWideningReviewSurface,
  collectAuthorizedWritePathBoundedRecallPreparationSurface
};
