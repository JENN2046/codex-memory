const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');
const {
  EXPECTED_CONTROLLING_MAP,
  EXPECTED_OPERATOR_STATE,
  EXPECTED_TARGET_BASELINE
} = require('./AuthorizedWritePathAutoAuthorizationPreflight');
const {
  CM0658_BOUNDED_RECALL_APPROVAL_ISSUANCE_RECORD_TEMPLATE_REF
} = require('./BoundedRecallApprovalIssuanceRecordAdapter');
const {
  CM0659_BOUNDED_RECALL_EXECUTION_EVIDENCE_TEMPLATE_REF
} = require('./BoundedRecallExecutionEvidenceRecordAdapter');

const EXPECTED_SCHEMA_VERSION = 'cm661-authorized-write-path-bounded-recall-closeout-review-v1';
const EXPECTED_MODE = 'bounded_recall_closeout_review';
const EXPECTED_BOUNDED_RECALL_ISSUANCE_DECISION =
  'BOUNDED_RECALL_AUTO_AUTHORIZATION_LINE_ISSUED_NOT_EXECUTED';
const EXPECTED_BOUNDED_RECALL_EXECUTION_DECISION =
  'BOUNDED_RECALL_PREPARATION_EXECUTED_APPROVAL_LINE_ONLY';
const BOUNDED_RECALL_CLOSEOUT_NOTE_REF =
  'docs/CM-0661_AUTHORIZED_WRITE_PATH_BOUNDED_RECALL_CLOSEOUT_REVIEW_EVALUATOR.md';
const BOUNDED_RECALL_PREPARATION_NOTE_REF =
  'docs/CM-0655_AUTHORIZED_WRITE_PATH_BOUNDED_RECALL_PREPARATION_EVALUATOR.md';
const BOUNDED_RECALL_CONTROL_SURFACE_NOTE_REF =
  'docs/CM-0656_AUTHORIZED_WRITE_PATH_BOUNDED_RECALL_PREPARATION_CONTROL_SURFACE_INTEGRATION.md';
const BOUNDED_RECALL_APPROVAL_PREVIEW_NOTE_REF =
  'docs/CM-0657_AUTHORIZED_WRITE_PATH_BOUNDED_RECALL_APPROVAL_PREVIEW_AND_COMMAND_SURFACE.md';

const REQUIRED_STILL_FORBIDDEN_ACTIONS = Object.freeze([
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

function normalizeAuthorizedWritePathBoundedRecallCloseoutReviewInput(input) {
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
    boundedRecallIssuanceRecordAvailable: normalizeBoolean(
      source.boundedRecallIssuanceRecordAvailable
    ),
    boundedRecallIssuanceDecision: normalizeString(
      source.boundedRecallIssuanceDecision
    ),
    boundedRecallIssuedExactLineMatches: normalizeBoolean(
      source.boundedRecallIssuedExactLineMatches
    ),
    boundedRecallExecutionStartedBeforeEvidence: normalizeBoolean(
      source.boundedRecallExecutionStartedBeforeEvidence
    ),
    boundedRecallIssuanceRecordId: normalizeString(source.boundedRecallIssuanceRecordId),
    boundedRecallExecutionEvidenceAvailable: normalizeBoolean(
      source.boundedRecallExecutionEvidenceAvailable
    ),
    boundedRecallExecutionEvidenceDecision: normalizeString(
      source.boundedRecallExecutionEvidenceDecision
    ),
    preparedLaterApprovalLineCount: normalizeNumber(
      source.preparedLaterApprovalLineCount
    ),
    boundedRecallExecutionCount: normalizeNumber(source.boundedRecallExecutionCount),
    boundedRecallPreparedExactlyOneLaterApproval: normalizeBoolean(
      source.boundedRecallPreparedExactlyOneLaterApproval
    ),
    boundedRecallRuntimeStayedZero: normalizeBoolean(
      source.boundedRecallRuntimeStayedZero
    ),
    boundedRecallExecutionEvidenceRecordId: normalizeString(
      source.boundedRecallExecutionEvidenceRecordId
    ),
    noSearchRecordProviderConfigStartupPersistenceDriftSincePreparation:
      normalizeBoolean(
        source.noSearchRecordProviderConfigStartupPersistenceDriftSincePreparation
      ),
    scopeStillLimitedToBoundedRecallPreparation: normalizeBoolean(
      source.scopeStillLimitedToBoundedRecallPreparation
    ),
    forbiddenActionsStillForbidden: normalizeBoolean(
      source.forbiddenActionsStillForbidden
    ),
    stillForbiddenActions: normalizeStringArray(source.stillForbiddenActions)
  };
}

function buildCloseoutRecordDraft({
  decision,
  normalized,
  closeoutChecklist,
  closeoutReady
} = {}) {
  let status = 'DRAFT_BOUNDED_RECALL_CLOSEOUT_NOT_READY';
  if (decision === 'BOUNDED_RECALL_CLOSEOUT_ABORTED_DRIFT') {
    status = 'DRAFT_BOUNDED_RECALL_CLOSEOUT_ABORTED_DRIFT';
  } else if (decision === 'BOUNDED_RECALL_CLOSEOUT_RECORDED_PREPARED_LATER_APPROVAL_ONLY') {
    status = 'DRAFT_BOUNDED_RECALL_CLOSEOUT_RECORDED_PREPARED_LATER_APPROVAL_ONLY';
  }

  return {
    draftAvailable: true,
    draftUsableNow: closeoutReady === true,
    status,
    decision,
    mapAuthority: EXPECTED_CONTROLLING_MAP,
    controllingState: EXPECTED_OPERATOR_STATE,
    noteRef: BOUNDED_RECALL_CLOSEOUT_NOTE_REF,
    boundedRecallIssuanceRecord:
      normalized.boundedRecallIssuanceRecordId
      || CM0658_BOUNDED_RECALL_APPROVAL_ISSUANCE_RECORD_TEMPLATE_REF,
    boundedRecallExecutionEvidenceRecord:
      normalized.boundedRecallExecutionEvidenceRecordId
      || CM0659_BOUNDED_RECALL_EXECUTION_EVIDENCE_TEMPLATE_REF,
    preparedLaterApprovalLineCount: normalized.preparedLaterApprovalLineCount,
    boundedRecallExecutionCount: normalized.boundedRecallExecutionCount,
    futureBoundedRecallRuntimeApprovalMayBePreparedNext: closeoutReady === true,
    boundedRecallMayExecuteNow: false,
    checklistPassCount:
      Object.values(closeoutChecklist).filter(item => item.passed === true).length
  };
}

function buildRenderedCloseoutTextSurface({
  decision,
  closeoutChecklist,
  closeoutChecklistFailures,
  failClosedReasons,
  closeoutRecordDraft,
  boundedRecallPreparationCommandPreviewBundle,
  boundedRecallApprovalIssuanceRecordInputTrace,
  boundedRecallExecutionEvidenceInputTrace
} = {}) {
  const lines = [
    `Status: ${closeoutRecordDraft.status}`,
    `Decision: ${decision}`,
    'Date: <fill>',
    '',
    `Map authority: ${closeoutRecordDraft.mapAuthority}`,
    `Controlling state: ${closeoutRecordDraft.controllingState}`,
    `Closeout note: ${closeoutRecordDraft.noteRef}`,
    '',
    '## Closeout snapshot',
    '',
    `- bounded-recall issuance record: \`${closeoutRecordDraft.boundedRecallIssuanceRecord}\``,
    `- bounded-recall execution evidence record: \`${closeoutRecordDraft.boundedRecallExecutionEvidenceRecord}\``,
    '',
    '## Recorded counts',
    '',
    `- prepared later approval line count: \`${closeoutRecordDraft.preparedLaterApprovalLineCount}\``,
    `- bounded recall execution count: \`${closeoutRecordDraft.boundedRecallExecutionCount}\``,
    '',
    '## Resulting allowance',
    '',
    `- closeout ready: \`${closeoutRecordDraft.draftUsableNow === true ? 'yes' : 'no'}\``,
    `- future bounded recall runtime approval may be prepared next: \`${closeoutRecordDraft.futureBoundedRecallRuntimeApprovalMayBePreparedNext === true ? 'yes' : 'no'}\``,
    `- bounded recall may execute now: \`${closeoutRecordDraft.boundedRecallMayExecuteNow === true ? 'yes' : 'no'}\``,
    `- fail-closed reasons: \`${failClosedReasons.join(', ') || 'none'}\``,
    '',
    '## Command Preview',
    '',
    `- helper review command: \`${boundedRecallPreparationCommandPreviewBundle.primaryCommand}\``,
    `- governance-report command: \`${boundedRecallPreparationCommandPreviewBundle.governanceReportCommand}\``,
    `- dashboard command: \`${boundedRecallPreparationCommandPreviewBundle.dashboardCommand}\``,
    `- http-observe command: \`${boundedRecallPreparationCommandPreviewBundle.httpObserveCommand}\``,
    `- resolved record path mode: \`${boundedRecallPreparationCommandPreviewBundle.resolvedRecordPathMode}\``,
    `- resolved bounded-recall issuance path: \`${boundedRecallPreparationCommandPreviewBundle.resolvedBoundedRecallIssuanceRecordPath}\``,
    `- resolved bounded-recall execution-evidence path: \`${boundedRecallPreparationCommandPreviewBundle.resolvedBoundedRecallExecutionEvidenceRecordPath}\``,
    '',
    '## Still forbidden',
    '',
    '- bounded recall runtime execution',
    '- search_memory',
    '- record_memory',
    '- marker search',
    '- provider/model call',
    '- config file edit',
    '- .env edit',
    '- watchdog/startup persistence change',
    '- public MCP expansion',
    '- additional durable write',
    '- readiness claim'
  ];

  if (boundedRecallApprovalIssuanceRecordInputTrace?.traceAvailable === true) {
    lines.push(
      `- bounded-recall issuance record source: \`${boundedRecallApprovalIssuanceRecordInputTrace.sourceFileName}\``
    );
  }
  if (boundedRecallExecutionEvidenceInputTrace?.traceAvailable === true) {
    lines.push(
      `- bounded-recall execution-evidence source: \`${boundedRecallExecutionEvidenceInputTrace.sourceFileName}\``
    );
  }

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

function buildBoundedRecallPreparationCommandPreviewBundle({
  closeoutReady,
  boundedRecallApprovalIssuanceRecordInputTrace,
  boundedRecallExecutionEvidenceInputTrace
} = {}) {
  const issuancePath =
    boundedRecallApprovalIssuanceRecordInputTrace?.sourceWorkspaceRelativePath || null;
  const executionPath =
    boundedRecallExecutionEvidenceInputTrace?.sourceWorkspaceRelativePath || null;

  const resolvedRecordPathMode =
    issuancePath && executionPath ? 'workspace_relative_pair' : 'placeholder_only';

  const issuanceArg =
    issuancePath || '<CM0658_bounded_recall_issuance_record_path>';
  const executionArg =
    executionPath || '<CM0659_bounded_recall_execution_evidence_record_path>';

  return {
    previewAvailable: true,
    previewUsableNow: closeoutReady === true,
    bundleKind: closeoutReady === true
      ? 'bounded_recall_preparation_command_bundle'
      : 'bounded_recall_preparation_command_bundle_blocked',
    resolvedRecordPathMode,
    resolvedBoundedRecallIssuanceRecordPath: issuancePath || 'none',
    resolvedBoundedRecallExecutionEvidenceRecordPath: executionPath || 'none',
    primaryCommand:
      `node .\\src\\cli\\authorized-write-path-bounded-recall-preparation-review.js --json ` +
      `--bounded-recall-issuance-record ${issuanceArg} ` +
      `--bounded-recall-execution-evidence-record ${executionArg}`,
    governanceReportCommand:
      `node .\\src\\cli\\governance-report.js --json ` +
      `--bounded-recall-issuance-record ${issuanceArg} ` +
      `--bounded-recall-execution-evidence-record ${executionArg}`,
    dashboardCommand:
      `node .\\src\\cli\\dashboard.js --json --summary-only ` +
      `--bounded-recall-issuance-record ${issuanceArg} ` +
      `--bounded-recall-execution-evidence-record ${executionArg}`,
    httpObserveCommand:
      `node .\\src\\cli\\http-observe.js --json ` +
      `--bounded-recall-issuance-record ${issuanceArg} ` +
      `--bounded-recall-execution-evidence-record ${executionArg}`
  };
}

function buildBoundedRecallPreparationOperatorPacketDraft({
  decision,
  closeoutReady,
  normalized,
  closeoutRecordDraft,
  closeoutChecklist,
  failClosedReasons,
  boundedRecallPreparationCommandPreviewBundle,
  boundedRecallApprovalIssuanceRecordInputTrace,
  boundedRecallExecutionEvidenceInputTrace
} = {}) {
  let status = 'DRAFT_BOUNDED_RECALL_PREPARATION_NOT_READY_FROM_CLOSEOUT';
  if (decision === 'BOUNDED_RECALL_CLOSEOUT_ABORTED_DRIFT') {
    status = 'DRAFT_BOUNDED_RECALL_PREPARATION_ABORTED_DRIFT_FROM_CLOSEOUT';
  } else if (closeoutReady === true) {
    status = 'DRAFT_BOUNDED_RECALL_PREPARATION_PREPARED_FROM_CLOSEOUT';
  }

  return {
    draftAvailable: true,
    draftUsableNow: closeoutReady === true,
    status,
    decision,
    mapAuthority: EXPECTED_CONTROLLING_MAP,
    controllingState: EXPECTED_OPERATOR_STATE,
    closeoutNoteRef: BOUNDED_RECALL_CLOSEOUT_NOTE_REF,
    boundedRecallPreparationNoteRef: BOUNDED_RECALL_PREPARATION_NOTE_REF,
    boundedRecallControlSurfaceNoteRef: BOUNDED_RECALL_CONTROL_SURFACE_NOTE_REF,
    boundedRecallApprovalPreviewNoteRef: BOUNDED_RECALL_APPROVAL_PREVIEW_NOTE_REF,
    targetBaseline: normalized.targetBaseline || EXPECTED_TARGET_BASELINE,
    closeoutRecordDraftStatus: closeoutRecordDraft.status,
    boundedRecallPreparationMayBeReviewedNext: closeoutReady === true,
    boundedRecallMayExecuteNow: false,
    runtimeMayExecuteNow: false,
    checklistPassCount:
      Object.values(closeoutChecklist).filter(item => item.passed === true).length,
    failClosedReasons,
    commandPreviewBundle: boundedRecallPreparationCommandPreviewBundle,
    selectedPayload: {
      boundedRecallApprovalIssuanceRecordInputTrace:
        boundedRecallApprovalIssuanceRecordInputTrace || null,
      boundedRecallExecutionEvidenceInputTrace:
        boundedRecallExecutionEvidenceInputTrace || null,
      boundedRecallPreparationNoteRef: BOUNDED_RECALL_PREPARATION_NOTE_REF,
      boundedRecallControlSurfaceNoteRef: BOUNDED_RECALL_CONTROL_SURFACE_NOTE_REF,
      boundedRecallApprovalPreviewNoteRef: BOUNDED_RECALL_APPROVAL_PREVIEW_NOTE_REF,
      commandPreviewBundle: boundedRecallPreparationCommandPreviewBundle
    }
  };
}

function buildRenderedBoundedRecallPreparationPacketTextSurface({
  boundedRecallPreparationOperatorPacketDraft
} = {}) {
  const packetDraft = boundedRecallPreparationOperatorPacketDraft;
  const lines = [
    `Status: ${packetDraft.status}`,
    `Decision: ${packetDraft.decision}`,
    'Date: <fill>',
    '',
    `Map authority: ${packetDraft.mapAuthority}`,
    `Controlling state: ${packetDraft.controllingState}`,
    `Closeout note: ${packetDraft.closeoutNoteRef}`,
    `Preparation note: ${packetDraft.boundedRecallPreparationNoteRef}`,
    `Preparation control surface note: ${packetDraft.boundedRecallControlSurfaceNoteRef}`,
    `Preparation approval-preview note: ${packetDraft.boundedRecallApprovalPreviewNoteRef}`,
    '',
    '## Preparation snapshot',
    '',
    `- target baseline: \`${packetDraft.targetBaseline}\``,
    `- closeout record draft status: \`${packetDraft.closeoutRecordDraftStatus}\``,
    `- bounded recall preparation may be reviewed next: \`${packetDraft.boundedRecallPreparationMayBeReviewedNext === true ? 'yes' : 'no'}\``,
    `- bounded recall may execute now: \`${packetDraft.boundedRecallMayExecuteNow === true ? 'yes' : 'no'}\``,
    `- runtime may execute now: \`${packetDraft.runtimeMayExecuteNow === true ? 'yes' : 'no'}\``,
    '',
    '## Command Preview',
    '',
    `- helper review command: \`${packetDraft.commandPreviewBundle.primaryCommand}\``,
    `- governance-report command: \`${packetDraft.commandPreviewBundle.governanceReportCommand}\``,
    `- dashboard command: \`${packetDraft.commandPreviewBundle.dashboardCommand}\``,
    `- http-observe command: \`${packetDraft.commandPreviewBundle.httpObserveCommand}\``,
    `- resolved record path mode: \`${packetDraft.commandPreviewBundle.resolvedRecordPathMode}\``,
    `- resolved bounded-recall issuance path: \`${packetDraft.commandPreviewBundle.resolvedBoundedRecallIssuanceRecordPath}\``,
    `- resolved bounded-recall execution-evidence path: \`${packetDraft.commandPreviewBundle.resolvedBoundedRecallExecutionEvidenceRecordPath}\``,
    '',
    '## Still forbidden',
    '',
    '- bounded recall runtime execution',
    '- search_memory',
    '- record_memory',
    '- marker search',
    '- provider/model call',
    '- config file edit',
    '- .env edit',
    '- watchdog/startup persistence change',
    '- public MCP expansion',
    '- additional durable write',
    '- readiness claim'
  ];

  return {
    previewAvailable: true,
    previewUsableNow: true,
    packetKind: 'bounded_recall_preparation_operator_packet_from_closeout',
    markdown: lines.join('\n')
  };
}

function evaluateAuthorizedWritePathBoundedRecallCloseoutReview(input, options = {}) {
  const normalized =
    normalizeAuthorizedWritePathBoundedRecallCloseoutReviewInput(input);

  const invalidSchema = normalized.schemaVersion !== EXPECTED_SCHEMA_VERSION;
  const invalidMode = normalized.mode !== EXPECTED_MODE;

  const closeoutChecklist = {
    R1: {
      question: 'Does docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md remain the controlling map and RC_NOT_READY_BLOCKED remain the operator-facing state?',
      passed:
        normalized.controllingMap === EXPECTED_CONTROLLING_MAP &&
        normalized.operatorFacingState === EXPECTED_OPERATOR_STATE
    },
    R2: {
      question: 'Is the target baseline still current or explicitly rebound in docs/board?',
      passed:
        normalized.targetBaseline === EXPECTED_TARGET_BASELINE ||
        (Boolean(normalized.targetBaseline) && normalized.reboundBaselineRecorded === true)
    },
    R3: {
      question: 'Does a later CM-0658 issuance record show the exact bounded-recall line was issued and bounded recall had not started yet?',
      passed:
        normalized.boundedRecallIssuanceRecordAvailable === true &&
        normalized.boundedRecallIssuanceDecision ===
          EXPECTED_BOUNDED_RECALL_ISSUANCE_DECISION &&
        normalized.boundedRecallIssuedExactLineMatches === true &&
        normalized.boundedRecallExecutionStartedBeforeEvidence === false &&
        Boolean(normalized.boundedRecallIssuanceRecordId)
    },
    R4: {
      question: 'Does a later CM-0659 execution-evidence record show preparation executed one later approval line only and zero bounded-recall executions?',
      passed:
        normalized.boundedRecallExecutionEvidenceAvailable === true &&
        normalized.boundedRecallExecutionEvidenceDecision ===
          EXPECTED_BOUNDED_RECALL_EXECUTION_DECISION &&
        normalized.boundedRecallPreparedExactlyOneLaterApproval === true &&
        normalized.boundedRecallRuntimeStayedZero === true &&
        Boolean(normalized.boundedRecallExecutionEvidenceRecordId)
    },
    R5: {
      question: 'Do the later CM-0659 counts stay at exactly one prepared later approval line and zero bounded-recall executions?',
      passed:
        normalized.preparedLaterApprovalLineCount === 1 &&
        normalized.boundedRecallExecutionCount === 0
    },
    R6: {
      question: 'After preparation, do no search/record/provider/config/startup-persistence drift and no bounded-recall runtime entry remain proven?',
      passed:
        normalized.noSearchRecordProviderConfigStartupPersistenceDriftSincePreparation ===
          true &&
        normalized.boundedRecallRuntimeStayedZero === true
    },
    R7: {
      question: 'Does scope remain limited to bounded-recall preparation only?',
      passed: normalized.scopeStillLimitedToBoundedRecallPreparation === true
    },
    R8: {
      question: 'Do forbidden actions remain forbidden after the recorded bounded-recall closeout?',
      passed:
        normalized.forbiddenActionsStillForbidden === true &&
        hasSubset(normalized.stillForbiddenActions, REQUIRED_STILL_FORBIDDEN_ACTIONS)
    }
  };

  const closeoutChecklistFailures = Object.entries(closeoutChecklist)
    .filter(([, item]) => item.passed !== true)
    .map(([id]) => id);

  const closeoutReady = closeoutChecklistFailures.length === 0;
  const laterArtifactsPresent =
    normalized.boundedRecallIssuanceRecordAvailable === true ||
    normalized.boundedRecallExecutionEvidenceAvailable === true;
  const driftDetected =
    laterArtifactsPresent &&
    (closeoutChecklist.R1.passed !== true ||
      closeoutChecklist.R2.passed !== true ||
      closeoutChecklist.R6.passed !== true ||
      closeoutChecklist.R7.passed !== true ||
      closeoutChecklist.R8.passed !== true);

  let decision = 'BOUNDED_RECALL_CLOSEOUT_NOT_READY';
  if (closeoutReady) {
    decision = 'BOUNDED_RECALL_CLOSEOUT_RECORDED_PREPARED_LATER_APPROVAL_ONLY';
  } else if (!normalized.malformedInput && !invalidSchema && !invalidMode && driftDetected) {
    decision = 'BOUNDED_RECALL_CLOSEOUT_ABORTED_DRIFT';
  }

  const failClosedReasons = [];
  if (normalized.malformedInput) failClosedReasons.push('malformed_input');
  if (invalidSchema) failClosedReasons.push('schema_version_mismatch');
  if (invalidMode) failClosedReasons.push('mode_mismatch');
  if (closeoutChecklist.R1.passed !== true) {
    failClosedReasons.push('controlling_map_or_operator_state_drift');
  }
  if (closeoutChecklist.R2.passed !== true) {
    failClosedReasons.push('baseline_drift');
  }
  if (closeoutChecklist.R3.passed !== true) {
    failClosedReasons.push('bounded_recall_issuance_record_not_proven');
  }
  if (closeoutChecklist.R4.passed !== true) {
    failClosedReasons.push('bounded_recall_execution_evidence_not_proven');
  }
  if (closeoutChecklist.R5.passed !== true) {
    failClosedReasons.push(
      'bounded_recall_prepared_line_count_or_execution_count_not_proven'
    );
  }
  if (closeoutChecklist.R6.passed !== true) {
    failClosedReasons.push('post_preparation_scope_or_environment_drift');
  }
  if (closeoutChecklist.R7.passed !== true) {
    failClosedReasons.push('bounded_recall_preparation_scope_not_preserved');
  }
  if (closeoutChecklist.R8.passed !== true) {
    failClosedReasons.push('bounded_recall_forbidden_action_boundary_not_preserved');
  }

  const status = closeoutReady
    ? 'recorded_prepared_later_approval_only'
    : decision === 'BOUNDED_RECALL_CLOSEOUT_ABORTED_DRIFT'
      ? 'aborted_drift'
      : 'blocked_fail_closed';

  const closeoutRecordDraft = buildCloseoutRecordDraft({
    decision,
    normalized,
    closeoutChecklist,
    closeoutReady
  });
  const boundedRecallPreparationCommandPreviewBundle =
    buildBoundedRecallPreparationCommandPreviewBundle({
      closeoutReady,
      boundedRecallApprovalIssuanceRecordInputTrace:
        options.boundedRecallApprovalIssuanceRecordInputTrace || null,
      boundedRecallExecutionEvidenceInputTrace:
        options.boundedRecallExecutionEvidenceInputTrace || null
    });
  const boundedRecallPreparationOperatorPacketDraft =
    buildBoundedRecallPreparationOperatorPacketDraft({
      decision,
      closeoutReady,
      normalized,
      closeoutRecordDraft,
      closeoutChecklist,
      failClosedReasons,
      boundedRecallPreparationCommandPreviewBundle,
      boundedRecallApprovalIssuanceRecordInputTrace:
        options.boundedRecallApprovalIssuanceRecordInputTrace || null,
      boundedRecallExecutionEvidenceInputTrace:
        options.boundedRecallExecutionEvidenceInputTrace || null
    });
  const renderedCloseoutTextSurface = buildRenderedCloseoutTextSurface({
    decision,
    closeoutChecklist,
    closeoutChecklistFailures,
    failClosedReasons,
    closeoutRecordDraft,
    boundedRecallPreparationCommandPreviewBundle,
    boundedRecallApprovalIssuanceRecordInputTrace:
      options.boundedRecallApprovalIssuanceRecordInputTrace || null,
    boundedRecallExecutionEvidenceInputTrace:
      options.boundedRecallExecutionEvidenceInputTrace || null
  });
  const renderedBoundedRecallPreparationPacketTextSurface =
    buildRenderedBoundedRecallPreparationPacketTextSurface({
      boundedRecallPreparationOperatorPacketDraft
    });

  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    sourceMode: 'explicit_input',
    status,
    decision,
    controllingState: EXPECTED_OPERATOR_STATE,
    boundedRecallCloseoutReady: closeoutReady,
    canPrepareFutureBoundedRecallRuntimeApprovalNext: closeoutReady,
    canExecuteBoundedRecallNow: false,
    canExecuteRuntimeNow: false,
    closeoutChecklist,
    closeoutChecklistFailures,
    failClosedReasons,
    closeoutRecordDraft,
    boundedRecallPreparationCommandPreviewBundle,
    boundedRecallPreparationOperatorPacketDraft,
    renderedCloseoutTextSurface,
    renderedBoundedRecallPreparationPacketTextSurface,
    refs: {
      closeoutNoteRef: BOUNDED_RECALL_CLOSEOUT_NOTE_REF,
      boundedRecallPreparationNoteRef: BOUNDED_RECALL_PREPARATION_NOTE_REF,
      boundedRecallControlSurfaceNoteRef: BOUNDED_RECALL_CONTROL_SURFACE_NOTE_REF,
      boundedRecallApprovalPreviewNoteRef: BOUNDED_RECALL_APPROVAL_PREVIEW_NOTE_REF,
      boundedRecallApprovalIssuanceTemplateRef:
        CM0658_BOUNDED_RECALL_APPROVAL_ISSUANCE_RECORD_TEMPLATE_REF,
      boundedRecallExecutionEvidenceTemplateRef:
        CM0659_BOUNDED_RECALL_EXECUTION_EVIDENCE_TEMPLATE_REF
    },
    traces: {
      boundedRecallApprovalIssuanceRecordInputTrace:
        options.boundedRecallApprovalIssuanceRecordInputTrace || null,
      boundedRecallExecutionEvidenceInputTrace:
        options.boundedRecallExecutionEvidenceInputTrace || null
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
      boundedRecallCloseoutReady: closeoutReady,
      boundedRecallMayExecuteNow: false,
      runtimeReady: false,
      rcReady: false
    },
    nextStep: closeoutReady
      ? 'prepare_future_exact_bounded_recall_runtime_approval_only'
      : decision === 'BOUNDED_RECALL_CLOSEOUT_ABORTED_DRIFT'
        ? 'refresh_bounded_recall_closeout_inputs_and_keep_rc_not_ready_blocked'
        : 'keep_rc_not_ready_blocked_and_do_not_enter_bounded_recall'
  };
}

module.exports = {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_MODE,
  EXPECTED_BOUNDED_RECALL_ISSUANCE_DECISION,
  EXPECTED_BOUNDED_RECALL_EXECUTION_DECISION,
  BOUNDED_RECALL_CLOSEOUT_NOTE_REF,
  BOUNDED_RECALL_PREPARATION_NOTE_REF,
  BOUNDED_RECALL_CONTROL_SURFACE_NOTE_REF,
  BOUNDED_RECALL_APPROVAL_PREVIEW_NOTE_REF,
  REQUIRED_STILL_FORBIDDEN_ACTIONS,
  normalizeAuthorizedWritePathBoundedRecallCloseoutReviewInput,
  evaluateAuthorizedWritePathBoundedRecallCloseoutReview
};
