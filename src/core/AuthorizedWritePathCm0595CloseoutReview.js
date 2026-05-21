const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');
const {
  EXPECTED_CONTROLLING_MAP,
  EXPECTED_OPERATOR_STATE,
  EXPECTED_TARGET_BASELINE
} = require('./AuthorizedWritePathAutoAuthorizationPreflight');
const {
  CM0607_WIDENING_ADOPTION_RECORD_TEMPLATE_REF
} = require('./AuthorizedWritePathAutoAuthorizationPreflight');
const {
  CM0649_CM0595_APPROVAL_ISSUANCE_RECORD_TEMPLATE_REF
} = require('./Cm0595ApprovalIssuanceRecordAdapter');
const {
  CM0650_CM0595_EXECUTION_EVIDENCE_TEMPLATE_REF
} = require('./Cm0595ExecutionEvidenceRecordAdapter');

const EXPECTED_SCHEMA_VERSION = 'cm65-authorized-write-path-cm0595-closeout-review-v1';
const EXPECTED_MODE = 'cm0595_closeout_review';
const EXPECTED_ENDPOINT_STARTUP_EVIDENCE_ID =
  'docs/CM-0592_AUTHORIZED_PUBLIC_WRITE_PATH_COMBINED_MINIMAL_ENABLEMENT_EVIDENCE.md';
const EXPECTED_WIDENING_ADOPTION_DECISION = 'WIDENING_ADOPTION_GRANTED';
const EXPECTED_CM0595_ISSUANCE_DECISION =
  'CM0595_AUTO_AUTHORIZATION_LINE_ISSUED_NOT_EXECUTED';
const EXPECTED_CM0595_EXECUTION_DECISION =
  'CM0595_EXECUTED_EXACTLY_ONE_WRITE_ONLY';
const CM0595_FUTURE_WRITE_BOUNDARY_REF =
  'docs/CM-0595_AUTHORIZED_WRITE_PATH_VALIDATION_AFTER_SPLIT_ENABLEMENT_PACKET.md';

const REQUIRED_STILL_FORBIDDEN_ACTIONS = Object.freeze([
  'search_memory',
  'marker_search',
  'provider_call',
  'config_edit',
  'env_edit',
  'watchdog_startup_persistence',
  'public_mcp_expansion',
  'migration_apply',
  'additional_durable_write',
  'readiness_claim'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? redactSensitiveFragments(value.trim()) : '';
}

function normalizeBoolean(value) {
  return value === true;
}

function normalizeNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function normalizeStringArray(values) {
  return Array.isArray(values)
    ? uniqueValues(values.map(normalizeString).filter(Boolean))
    : [];
}

function hasSubset(values, requiredValues) {
  return requiredValues.every(value => values.includes(value));
}

function normalizeAuthorizedWritePathCm0595CloseoutReviewInput(input) {
  const malformedInput = !isPlainObject(input);
  const source = malformedInput ? {} : input;

  return {
    malformedInput,
    schemaVersion: normalizeString(source.schemaVersion),
    mode: normalizeString(source.mode),
    controllingMap: normalizeString(source.controllingMap),
    operatorFacingState: normalizeString(source.operatorFacingState),
    targetBaseline: normalizeString(source.targetBaseline),
    reboundBaselineRecorded: normalizeBoolean(source.reboundBaselineRecorded),
    sameBaselineEndpointStartupEvidenceAvailable:
      normalizeBoolean(source.sameBaselineEndpointStartupEvidenceAvailable),
    endpointStartupEvidenceId: normalizeString(source.endpointStartupEvidenceId),
    sameBaselineTokenPresentEvidenceAvailable:
      normalizeBoolean(source.sameBaselineTokenPresentEvidenceAvailable),
    tokenPresentEvidenceSameBaseline:
      normalizeBoolean(source.tokenPresentEvidenceSameBaseline),
    latestTokenPresentEvidenceId: normalizeString(source.latestTokenPresentEvidenceId),
    wideningAdoptionGrantedCm0595Only:
      normalizeBoolean(source.wideningAdoptionGrantedCm0595Only),
    wideningAdoptionDecision: normalizeString(source.wideningAdoptionDecision),
    wideningAdoptionRecordId: normalizeString(source.wideningAdoptionRecordId),
    cm0595IssuanceRecordAvailable:
      normalizeBoolean(source.cm0595IssuanceRecordAvailable),
    cm0595IssuanceDecision: normalizeString(source.cm0595IssuanceDecision),
    cm0595IssuedExactLineMatches:
      normalizeBoolean(source.cm0595IssuedExactLineMatches),
    cm0595RuntimeExecutionStartedBeforeEvidence:
      normalizeBoolean(source.cm0595RuntimeExecutionStartedBeforeEvidence),
    cm0595IssuanceRecordId: normalizeString(source.cm0595IssuanceRecordId),
    cm0595ExecutionEvidenceAvailable:
      normalizeBoolean(source.cm0595ExecutionEvidenceAvailable),
    cm0595ExecutionEvidenceDecision:
      normalizeString(source.cm0595ExecutionEvidenceDecision),
    cm0595DurableMemoryWriteCount:
      normalizeNumber(source.cm0595DurableMemoryWriteCount),
    cm0595WritePathAuditSideEffectCount:
      normalizeNumber(source.cm0595WritePathAuditSideEffectCount),
    cm0595ExecutedExactlyOneWrite:
      normalizeBoolean(source.cm0595ExecutedExactlyOneWrite),
    cm0595FailedClosedWithZeroWrites:
      normalizeBoolean(source.cm0595FailedClosedWithZeroWrites),
    cm0595ExecutionEvidenceRecordId:
      normalizeString(source.cm0595ExecutionEvidenceRecordId),
    noAdditionalDurableWriteBeyondCm0595:
      normalizeBoolean(source.noAdditionalDurableWriteBeyondCm0595),
    boundedRecallNotYetEntered:
      normalizeBoolean(source.boundedRecallNotYetEntered),
    noSearchProviderConfigStartupPersistenceDriftSinceWrite:
      normalizeBoolean(source.noSearchProviderConfigStartupPersistenceDriftSinceWrite),
    scopeStillLimitedToCm0595:
      normalizeBoolean(source.scopeStillLimitedToCm0595),
    forbiddenActionsStillForbidden:
      normalizeBoolean(source.forbiddenActionsStillForbidden),
    stillForbiddenActions: normalizeStringArray(source.stillForbiddenActions)
  };
}

function buildCloseoutRecordDraft({
  decision,
  normalized,
  closeoutChecklist,
  closeoutReady
} = {}) {
  let status = 'DRAFT_CM0595_CLOSEOUT_NOT_READY';
  if (decision === 'CM0595_CLOSEOUT_ABORTED_DRIFT') {
    status = 'DRAFT_CM0595_CLOSEOUT_ABORTED_DRIFT';
  } else if (decision === 'CM0595_CLOSEOUT_RECORDED_EXACTLY_ONE_WRITE_ONLY') {
    status = 'DRAFT_CM0595_CLOSEOUT_RECORDED_EXACTLY_ONE_WRITE_ONLY';
  }

  return {
    draftAvailable: true,
    draftUsableNow: closeoutReady === true,
    status,
    decision,
    mapAuthority: EXPECTED_CONTROLLING_MAP,
    controllingState: EXPECTED_OPERATOR_STATE,
    futureWriteBoundaryRef: CM0595_FUTURE_WRITE_BOUNDARY_REF,
    sameBaselineEndpointStartupEvidenceDoc:
      normalized.endpointStartupEvidenceId || EXPECTED_ENDPOINT_STARTUP_EVIDENCE_ID,
    sameBaselineTokenPresenceEvidenceDoc:
      normalized.latestTokenPresentEvidenceId || '<fill>',
    wideningAdoptionRecord:
      normalized.wideningAdoptionRecordId || CM0607_WIDENING_ADOPTION_RECORD_TEMPLATE_REF,
    cm0595IssuanceRecord:
      normalized.cm0595IssuanceRecordId || CM0649_CM0595_APPROVAL_ISSUANCE_RECORD_TEMPLATE_REF,
    cm0595ExecutionEvidenceRecord:
      normalized.cm0595ExecutionEvidenceRecordId || CM0650_CM0595_EXECUTION_EVIDENCE_TEMPLATE_REF,
    durableMemoryWriteCount: normalized.cm0595DurableMemoryWriteCount,
    writePathAuditSideEffectCount: normalized.cm0595WritePathAuditSideEffectCount,
    boundedRecallMayBePreparedNext: closeoutReady === true,
    boundedRecallMayExecuteNow: false,
    checklistPassCount: Object.values(closeoutChecklist).filter(item => item.passed === true).length
  };
}

function buildRenderedCloseoutTextSurface({
  decision,
  closeoutChecklist,
  closeoutChecklistFailures,
  failClosedReasons,
  closeoutRecordDraft
} = {}) {
  const lines = [
    `Status: ${closeoutRecordDraft.status}`,
    `Decision: ${decision}`,
    'Date: <fill>',
    '',
    `Map authority: ${closeoutRecordDraft.mapAuthority}`,
    `Controlling state: ${closeoutRecordDraft.controllingState}`,
    `Future write boundary: ${closeoutRecordDraft.futureWriteBoundaryRef}`,
    '',
    '## Closeout snapshot',
    '',
    `- same-baseline endpoint/startup evidence: \`${closeoutRecordDraft.sameBaselineEndpointStartupEvidenceDoc}\``,
    `- same-baseline token-present evidence: \`${closeoutRecordDraft.sameBaselineTokenPresenceEvidenceDoc}\``,
    `- widening-adoption record: \`${closeoutRecordDraft.wideningAdoptionRecord}\``,
    `- CM-0595 issuance record: \`${closeoutRecordDraft.cm0595IssuanceRecord}\``,
    `- CM-0595 execution evidence record: \`${closeoutRecordDraft.cm0595ExecutionEvidenceRecord}\``,
    '',
    '## Recorded counts',
    '',
    `- durable memory writes: \`${closeoutRecordDraft.durableMemoryWriteCount}\``,
    `- write-path audit side effects: \`${closeoutRecordDraft.writePathAuditSideEffectCount}\``,
    '',
    '## Resulting allowance',
    '',
    `- closeout ready: \`${closeoutRecordDraft.draftUsableNow === true ? 'yes' : 'no'}\``,
    `- bounded recall may be prepared next: \`${closeoutRecordDraft.boundedRecallMayBePreparedNext === true ? 'yes' : 'no'}\``,
    `- bounded recall may execute now: \`${closeoutRecordDraft.boundedRecallMayExecuteNow === true ? 'yes' : 'no'}\``,
    `- fail-closed reasons: \`${failClosedReasons.join(', ') || 'none'}\``,
    '',
    '## Still forbidden',
    '',
    '- search_memory',
    '- marker search',
    '- provider/model call',
    '- config file edit',
    '- .env edit',
    '- watchdog/startup persistence change',
    '- public MCP expansion',
    '- migration/import/export/backup/restore apply',
    '- additional durable write',
    '- readiness claim'
  ];

  if (Object.keys(closeoutChecklist || {}).length > 0) {
    lines.push('');
    lines.push('## Closeout Checklist');
    lines.push('');
    for (const [id, item] of Object.entries(closeoutChecklist)) {
      lines.push(`- ${id}: ${item.question} => \`${item.passed === true ? 'yes' : 'no'}\``);
    }
  }

  if (closeoutChecklistFailures.length > 0) {
    lines.push('');
    lines.push(`Checklist failures: ${closeoutChecklistFailures.join(', ')}`);
  }

  return {
    previewAvailable: true,
    previewUsableNow: true,
    closeoutKind: decision.toLowerCase(),
    markdown: lines.join('\n')
  };
}

function evaluateAuthorizedWritePathCm0595CloseoutReview(input, options = {}) {
  const normalized = normalizeAuthorizedWritePathCm0595CloseoutReviewInput(input);

  const invalidSchema = normalized.schemaVersion !== EXPECTED_SCHEMA_VERSION;
  const invalidMode = normalized.mode !== EXPECTED_MODE;

  const closeoutChecklist = {
    C1: {
      question: 'Does docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md remain the controlling map?',
      passed: normalized.controllingMap === EXPECTED_CONTROLLING_MAP
    },
    C2: {
      question: 'Does operator-facing state remain RC_NOT_READY_BLOCKED?',
      passed: normalized.operatorFacingState === EXPECTED_OPERATOR_STATE
    },
    C3: {
      question: 'Is the target baseline still current or explicitly rebound in docs/board?',
      passed: normalized.targetBaseline === EXPECTED_TARGET_BASELINE ||
        (Boolean(normalized.targetBaseline) && normalized.reboundBaselineRecorded === true)
    },
    C4: {
      question: 'Do same-baseline endpoint/startup and token-present evidence still exist for this future CM-0595 boundary?',
      passed: normalized.sameBaselineEndpointStartupEvidenceAvailable === true &&
        normalized.endpointStartupEvidenceId === EXPECTED_ENDPOINT_STARTUP_EVIDENCE_ID &&
        normalized.sameBaselineTokenPresentEvidenceAvailable === true &&
        normalized.tokenPresentEvidenceSameBaseline === true &&
        Boolean(normalized.latestTokenPresentEvidenceId)
    },
    C5: {
      question: 'Has widening-adoption already granted CM-0595 only through a later CM-0607 record?',
      passed: normalized.wideningAdoptionGrantedCm0595Only === true &&
        normalized.wideningAdoptionDecision === EXPECTED_WIDENING_ADOPTION_DECISION &&
        Boolean(normalized.wideningAdoptionRecordId)
    },
    C6: {
      question: 'Does a later CM-0649 issuance record show the exact CM-0595 line was issued and runtime had not started yet?',
      passed: normalized.cm0595IssuanceRecordAvailable === true &&
        normalized.cm0595IssuanceDecision === EXPECTED_CM0595_ISSUANCE_DECISION &&
        normalized.cm0595IssuedExactLineMatches === true &&
        normalized.cm0595RuntimeExecutionStartedBeforeEvidence === false &&
        Boolean(normalized.cm0595IssuanceRecordId)
    },
    C7: {
      question: 'Does a later CM-0650 execution-evidence record show the CM-0595 path executed exactly one write only?',
      passed: normalized.cm0595ExecutionEvidenceAvailable === true &&
        normalized.cm0595ExecutionEvidenceDecision === EXPECTED_CM0595_EXECUTION_DECISION &&
        normalized.cm0595ExecutedExactlyOneWrite === true &&
        normalized.cm0595FailedClosedWithZeroWrites === false &&
        Boolean(normalized.cm0595ExecutionEvidenceRecordId)
    },
    C8: {
      question: 'Do the later CM-0650 counts stay at exactly one durable write and one write-path audit side effect?',
      passed: normalized.cm0595DurableMemoryWriteCount === 1 &&
        normalized.cm0595WritePathAuditSideEffectCount === 1
    },
    C9: {
      question: 'After CM-0595, do no additional durable writes, no bounded recall entry, and no search/provider/config/startup-persistence drift remain proven?',
      passed: normalized.noAdditionalDurableWriteBeyondCm0595 === true &&
        normalized.boundedRecallNotYetEntered === true &&
        normalized.noSearchProviderConfigStartupPersistenceDriftSinceWrite === true
    },
    C10: {
      question: 'Does scope remain limited and do forbidden actions remain forbidden after the recorded CM-0595 closeout?',
      passed: normalized.scopeStillLimitedToCm0595 === true &&
        normalized.forbiddenActionsStillForbidden === true &&
        hasSubset(normalized.stillForbiddenActions, REQUIRED_STILL_FORBIDDEN_ACTIONS)
    }
  };

  const closeoutChecklistFailures = Object.entries(closeoutChecklist)
    .filter(([, item]) => item.passed !== true)
    .map(([id]) => id);

  const closeoutReady = closeoutChecklistFailures.length === 0;
  const laterCloseoutArtifactsPresent =
    normalized.cm0595IssuanceRecordAvailable === true ||
    normalized.cm0595ExecutionEvidenceAvailable === true;
  const driftDetected = closeoutChecklist.C1.passed !== true ||
    closeoutChecklist.C2.passed !== true ||
    closeoutChecklist.C3.passed !== true ||
    (laterCloseoutArtifactsPresent && closeoutChecklist.C9.passed !== true);

  let decision = 'CM0595_CLOSEOUT_NOT_READY';
  if (closeoutReady) {
    decision = 'CM0595_CLOSEOUT_RECORDED_EXACTLY_ONE_WRITE_ONLY';
  } else if (driftDetected && !normalized.malformedInput && !invalidSchema && !invalidMode) {
    decision = 'CM0595_CLOSEOUT_ABORTED_DRIFT';
  }

  const failClosedReasons = [];
  if (normalized.malformedInput) failClosedReasons.push('malformed_input');
  if (invalidSchema) failClosedReasons.push('schema_version_mismatch');
  if (invalidMode) failClosedReasons.push('mode_mismatch');
  if (closeoutChecklist.C1.passed !== true) failClosedReasons.push('controlling_map_drift');
  if (closeoutChecklist.C2.passed !== true) failClosedReasons.push('operator_state_drift');
  if (closeoutChecklist.C3.passed !== true) failClosedReasons.push('baseline_drift');
  if (closeoutChecklist.C4.passed !== true) failClosedReasons.push('same_baseline_enablement_or_token_evidence_missing');
  if (closeoutChecklist.C5.passed !== true) failClosedReasons.push('widening_adoption_not_granted_cm0595_only');
  if (closeoutChecklist.C6.passed !== true) failClosedReasons.push('cm0595_issuance_record_not_proven');
  if (closeoutChecklist.C7.passed !== true) failClosedReasons.push('cm0595_execution_evidence_not_proven');
  if (closeoutChecklist.C8.passed !== true) failClosedReasons.push('cm0595_exactly_one_write_count_not_proven');
  if (closeoutChecklist.C9.passed !== true) failClosedReasons.push('post_cm0595_scope_or_environment_drift');
  if (closeoutChecklist.C10.passed !== true) failClosedReasons.push('post_cm0595_forbidden_action_boundary_not_preserved');

  const status = decision === 'CM0595_CLOSEOUT_RECORDED_EXACTLY_ONE_WRITE_ONLY'
    ? 'recorded_exactly_one_write_only'
    : decision === 'CM0595_CLOSEOUT_ABORTED_DRIFT'
      ? 'aborted_drift'
      : 'blocked_fail_closed';

  const closeoutRecordDraft = buildCloseoutRecordDraft({
    decision,
    normalized,
    closeoutChecklist,
    closeoutReady
  });
  const renderedCloseoutTextSurface = buildRenderedCloseoutTextSurface({
    decision,
    closeoutChecklist,
    closeoutChecklistFailures,
    failClosedReasons,
    closeoutRecordDraft
  });

  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    sourceMode: 'explicit_input',
    status,
    decision,
    controllingState: EXPECTED_OPERATOR_STATE,
    cm0595CloseoutReady: closeoutReady,
    canPrepareBoundedRecallNext: closeoutReady,
    canExecuteBoundedRecallNow: false,
    canExecuteRuntimeNow: false,
    closeoutChecklist,
    closeoutChecklistFailures,
    failClosedReasons: uniqueValues(failClosedReasons),
    closeoutRecordDraft,
    renderedCloseoutTextSurface,
    refs: {
      futureWriteBoundaryRef: CM0595_FUTURE_WRITE_BOUNDARY_REF,
      wideningAdoptionRecordTemplateRef: CM0607_WIDENING_ADOPTION_RECORD_TEMPLATE_REF,
      cm0595ApprovalIssuanceRecordTemplateRef: CM0649_CM0595_APPROVAL_ISSUANCE_RECORD_TEMPLATE_REF,
      cm0595ExecutionEvidenceTemplateRef: CM0650_CM0595_EXECUTION_EVIDENCE_TEMPLATE_REF
    },
    traces: {
      wideningAdoptionRecordInputTrace: options.wideningAdoptionRecordInputTrace || null,
      cm0595IssuanceRecordInputTrace: options.cm0595IssuanceRecordInputTrace || null,
      cm0595ExecutionEvidenceInputTrace: options.cm0595ExecutionEvidenceInputTrace || null
    },
    safety: {
      readsFiles: false,
      scansDirectories: false,
      executesCommands: false,
      startsServices: false,
      writesDurableState: false,
      callsProviders: false,
      expandsPublicMcp: false,
      remoteWrites: false,
      rawSensitiveOutputExposed: false
    },
    readiness: {
      cm0595CloseoutReady: closeoutReady,
      boundedRecallMayBePreparedNext: closeoutReady,
      boundedRecallMayExecuteNow: false,
      runtimeReady: false,
      rcReady: false
    },
    nextStep: closeoutReady
      ? 'prepare_bounded_recall_exact_approval_only'
      : decision === 'CM0595_CLOSEOUT_ABORTED_DRIFT'
        ? 'refresh_closeout_inputs_and_keep_rc_not_ready_blocked'
        : 'keep_rc_not_ready_blocked_and_do_not_enter_bounded_recall'
  };
}

module.exports = {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_MODE,
  EXPECTED_WIDENING_ADOPTION_DECISION,
  EXPECTED_CM0595_ISSUANCE_DECISION,
  EXPECTED_CM0595_EXECUTION_DECISION,
  REQUIRED_STILL_FORBIDDEN_ACTIONS,
  evaluateAuthorizedWritePathCm0595CloseoutReview,
  normalizeAuthorizedWritePathCm0595CloseoutReviewInput
};
