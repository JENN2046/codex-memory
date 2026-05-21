const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');
const {
  EXPECTED_CONTROLLING_MAP,
  EXPECTED_OPERATOR_STATE,
  EXPECTED_TARGET_BASELINE
} = require('./AuthorizedWritePathAutoAuthorizationPreflight');
const {
  EXPECTED_SCHEMA_VERSION: EXPECTED_CLOSEOUT_SCHEMA_VERSION,
  EXPECTED_MODE: EXPECTED_CLOSEOUT_MODE,
  REQUIRED_STILL_FORBIDDEN_ACTIONS: REQUIRED_CLOSEOUT_STILL_FORBIDDEN_ACTIONS,
  evaluateAuthorizedWritePathCm0595CloseoutReview
} = require('./AuthorizedWritePathCm0595CloseoutReview');

const EXPECTED_SCHEMA_VERSION =
  'cm65-authorized-write-path-bounded-recall-preparation-review-v1';
const EXPECTED_MODE = 'bounded_recall_preparation_review';
const EXPECTED_CLOSEOUT_DECISION =
  'CM0595_CLOSEOUT_RECORDED_EXACTLY_ONE_WRITE_ONLY';
const BOUNDED_RECALL_EXACT_APPROVAL_ID = 'BOUNDED_RECALL_VALIDATION_001';
const FUTURE_WRITE_BOUNDARY_REF =
  'docs/CM-0595_AUTHORIZED_WRITE_PATH_VALIDATION_AFTER_SPLIT_ENABLEMENT_PACKET.md';
const BOUNDED_RECALL_PREPARATION_NOTE_REF =
  'docs/CM-0655_AUTHORIZED_WRITE_PATH_BOUNDED_RECALL_PREPARATION_EVALUATOR.md';
const BOUNDED_RECALL_CONTROL_SURFACE_NOTE_REF =
  'docs/CM-0656_AUTHORIZED_WRITE_PATH_BOUNDED_RECALL_PREPARATION_CONTROL_SURFACE_INTEGRATION.md';
const BOUNDED_RECALL_APPROVAL_ISSUANCE_TEMPLATE_REF =
  'docs/CM-0658_AUTHORIZED_WRITE_PATH_BOUNDED_RECALL_APPROVAL_ISSUANCE_RECORD_TEMPLATE.md';
const BOUNDED_RECALL_EXECUTION_EVIDENCE_TEMPLATE_REF =
  'docs/CM-0659_AUTHORIZED_WRITE_PATH_BOUNDED_RECALL_EXECUTION_EVIDENCE_TEMPLATE.md';

const REQUIRED_STILL_FORBIDDEN_ACTIONS = Object.freeze([
  'record_memory',
  'additional_durable_write',
  'provider_call',
  'config_edit',
  'env_edit',
  'watchdog_startup_persistence',
  'public_mcp_expansion',
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

function normalizeStringArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return uniqueValues(values.map(normalizeString).filter(Boolean));
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function hasSubset(values, requiredValues) {
  return requiredValues.every(value => values.includes(value));
}

function buildCloseoutCompatibleInput(input) {
  if (!isPlainObject(input)) {
    return input;
  }

  const originalForbiddenActions = normalizeStringArray(input.stillForbiddenActions);
  const closeoutForbiddenActions = uniqueValues([
    ...originalForbiddenActions,
    ...REQUIRED_CLOSEOUT_STILL_FORBIDDEN_ACTIONS
  ]);

  return {
    ...input,
    schemaVersion: EXPECTED_CLOSEOUT_SCHEMA_VERSION,
    mode: EXPECTED_CLOSEOUT_MODE,
    stillForbiddenActions: closeoutForbiddenActions,
    forbiddenActionsStillForbidden: input.forbiddenActionsStillForbidden === true,
    scopeStillLimitedToCm0595:
      input.scopeStillLimitedToCm0595 === true ||
      input.boundedRecallPrepareOnlyScopeStillBounded === true,
    boundedRecallNotYetEntered:
      input.boundedRecallExecutionAlreadyStarted === true
        ? false
        : input.boundedRecallNotYetEntered !== false
  };
}

function normalizeAuthorizedWritePathBoundedRecallPreparationReviewInput(input) {
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
    stillForbiddenActions: normalizeStringArray(source.stillForbiddenActions),
    forbiddenActionsStillForbidden:
      normalizeBoolean(source.forbiddenActionsStillForbidden),
    boundedRecallApprovalAlreadyIssued:
      normalizeBoolean(source.boundedRecallApprovalAlreadyIssued),
    boundedRecallExecutionAlreadyStarted:
      normalizeBoolean(source.boundedRecallExecutionAlreadyStarted),
    boundedRecallPrepareOnlyScopeStillBounded:
      normalizeBoolean(source.boundedRecallPrepareOnlyScopeStillBounded)
  };
}

function buildBoundedRecallExactApprovalLine(targetBaseline = EXPECTED_TARGET_BASELINE) {
  return (
    `授权执行 future bounded recall exact approval preparation，target baseline = ${targetBaseline}，` +
    '只允许 BOUNDED_RECALL_VALIDATION_001，并且仅在同一 baseline 下 later CM-0595 closeout 已被记录为 exactly-one-write-only、' +
    '且 bounded recall 尚未启动的前提下，允许准备一条单独 exact approval line；禁止当前执行 bounded recall / search_memory / provider / config change / public MCP expansion / readiness claim。'
  );
}

function buildBoundedRecallApprovalLinePreview({
  normalized,
  preparedExactOnly
} = {}) {
  const targetBaseline = normalized.targetBaseline || EXPECTED_TARGET_BASELINE;
  return {
    previewAvailable: true,
    previewUsableNow: preparedExactOnly === true,
    previewKind: 'bounded_recall_exact_approval_line',
    previewLine: buildBoundedRecallExactApprovalLine(targetBaseline)
  };
}

function buildBoundedRecallCommandPreviewBundle({
  preparedExactOnly,
  wideningAdoptionRecordInputTrace,
  cm0595IssuanceRecordInputTrace,
  cm0595ExecutionEvidenceInputTrace
} = {}) {
  const wideningPath =
    wideningAdoptionRecordInputTrace?.sourceWorkspaceRelativePath || null;
  const issuancePath =
    cm0595IssuanceRecordInputTrace?.sourceWorkspaceRelativePath || null;
  const executionPath =
    cm0595ExecutionEvidenceInputTrace?.sourceWorkspaceRelativePath || null;

  const resolvedRecordPathMode =
    wideningPath && issuancePath && executionPath
      ? 'workspace_relative_triple'
      : 'placeholder_only';

  const wideningArg = wideningPath || '<CM0607_widening_adoption_record_path>';
  const issuanceArg = issuancePath || '<CM0649_cm0595_issuance_record_path>';
  const executionArg = executionPath || '<CM0650_cm0595_execution_evidence_record_path>';

  return {
    previewAvailable: true,
    previewUsableNow: preparedExactOnly === true,
    bundleKind: preparedExactOnly === true
      ? 'bounded_recall_exact_approval_review_command_bundle'
      : 'bounded_recall_review_command_bundle_blocked',
    resolvedRecordPathMode,
    resolvedWideningAdoptionRecordPath: wideningPath || 'none',
    resolvedCm0595IssuanceRecordPath: issuancePath || 'none',
    resolvedCm0595ExecutionEvidenceRecordPath: executionPath || 'none',
    primaryCommand:
      `node .\\src\\cli\\authorized-write-path-bounded-recall-preparation-review.js --json ` +
      `--widening-adoption-record ${wideningArg} ` +
      `--cm0595-issuance-record ${issuanceArg} ` +
      `--cm0595-execution-evidence-record ${executionArg}`,
    governanceReportCommand:
      `node .\\src\\cli\\governance-report.js --json ` +
      `--widening-adoption-record ${wideningArg} ` +
      `--cm0595-issuance-record ${issuanceArg} ` +
      `--cm0595-execution-evidence-record ${executionArg}`,
    dashboardCommand:
      `node .\\src\\cli\\dashboard.js --json --summary-only ` +
      `--widening-adoption-record ${wideningArg} ` +
      `--cm0595-issuance-record ${issuanceArg} ` +
      `--cm0595-execution-evidence-record ${executionArg}`,
    httpObserveCommand:
      `node .\\src\\cli\\http-observe.js --json ` +
      `--widening-adoption-record ${wideningArg} ` +
      `--cm0595-issuance-record ${issuanceArg} ` +
      `--cm0595-execution-evidence-record ${executionArg}`
  };
}

function buildBoundedRecallOperatorPacketDraft({
  normalized,
  decision,
  boundedRecallChecklist,
  preparedExactOnly,
  closeoutReport,
  failClosedReasons,
  boundedRecallCommandPreviewBundle,
  wideningAdoptionRecordInputTrace,
  cm0595IssuanceRecordInputTrace,
  cm0595ExecutionEvidenceInputTrace
} = {}) {
  let status = 'DRAFT_BOUNDED_RECALL_APPROVAL_NOT_READY';
  if (decision === 'BOUNDED_RECALL_APPROVAL_ABORTED_DRIFT') {
    status = 'DRAFT_BOUNDED_RECALL_APPROVAL_ABORTED_DRIFT';
  } else if (decision === 'BOUNDED_RECALL_APPROVAL_PREPARED_EXACT_ONLY') {
    status = 'DRAFT_BOUNDED_RECALL_APPROVAL_PREPARED_EXACT_ONLY';
  }

  return {
    draftAvailable: true,
    draftUsableNow: preparedExactOnly === true,
    status,
    decision,
    mapAuthority: EXPECTED_CONTROLLING_MAP,
    controllingState: EXPECTED_OPERATOR_STATE,
    preparationNoteRef: BOUNDED_RECALL_PREPARATION_NOTE_REF,
    futureWriteBoundaryRef: FUTURE_WRITE_BOUNDARY_REF,
    closeoutDecision: closeoutReport.decision,
    closeoutRecordDraftStatus: closeoutReport.closeoutRecordDraft?.status || '<fill>',
    targetBaseline: normalized.targetBaseline || EXPECTED_TARGET_BASELINE,
    exactApprovalId: 'BOUNDED_RECALL_VALIDATION_001',
    commandPreviewBundle: boundedRecallCommandPreviewBundle,
    boundedRecallMayBePreparedNext: preparedExactOnly === true,
    boundedRecallMayExecuteNow: false,
    runtimeMayExecuteNow: false,
    checklistPassCount:
      Object.values(boundedRecallChecklist).filter(item => item.passed === true).length,
    failClosedReasons,
    selectedPayload: {
      wideningAdoptionRecordInputTrace: wideningAdoptionRecordInputTrace || null,
      cm0595IssuanceRecordInputTrace: cm0595IssuanceRecordInputTrace || null,
      cm0595ExecutionEvidenceInputTrace: cm0595ExecutionEvidenceInputTrace || null,
      futureWriteBoundaryRef: FUTURE_WRITE_BOUNDARY_REF,
      exactApprovalId: 'BOUNDED_RECALL_VALIDATION_001',
      commandPreviewBundle: boundedRecallCommandPreviewBundle
    }
  };
}

function buildBoundedRecallApprovalIssuanceRecordDraft({
  decision,
  approvalLinePreview,
  boundedRecallCommandPreviewBundle,
  wideningAdoptionRecordInputTrace,
  cm0595IssuanceRecordInputTrace,
  cm0595ExecutionEvidenceInputTrace
} = {}) {
  return {
    draftAvailable: true,
    draftUsableNow: decision === 'BOUNDED_RECALL_APPROVAL_PREPARED_EXACT_ONLY',
    draftKind: decision === 'BOUNDED_RECALL_APPROVAL_PREPARED_EXACT_ONLY'
      ? 'bounded_recall_approval_issuance_record_draft'
      : 'bounded_recall_approval_issuance_record_draft_blocked',
    issuanceTemplateRef: BOUNDED_RECALL_APPROVAL_ISSUANCE_TEMPLATE_REF,
    nextExecutionEvidenceTemplateRef: BOUNDED_RECALL_EXECUTION_EVIDENCE_TEMPLATE_REF,
    exactApprovalId: 'BOUNDED_RECALL_VALIDATION_001',
    exactApprovalLinePreview: approvalLinePreview,
    commandPreviewBundle: boundedRecallCommandPreviewBundle,
    runtimeExecutionStillAllowedNow: false,
    selectedPayload: {
      wideningAdoptionRecordInputTrace: wideningAdoptionRecordInputTrace || null,
      cm0595IssuanceRecordInputTrace: cm0595IssuanceRecordInputTrace || null,
      cm0595ExecutionEvidenceInputTrace: cm0595ExecutionEvidenceInputTrace || null,
      issuanceTemplateRef: BOUNDED_RECALL_APPROVAL_ISSUANCE_TEMPLATE_REF,
      nextExecutionEvidenceTemplateRef:
        BOUNDED_RECALL_EXECUTION_EVIDENCE_TEMPLATE_REF,
      exactApprovalId: 'BOUNDED_RECALL_VALIDATION_001',
      exactApprovalLinePreview: approvalLinePreview
    }
  };
}

function buildBoundedRecallExecutionEvidenceDraft({
  decision,
  approvalLinePreview,
  boundedRecallCommandPreviewBundle,
  wideningAdoptionRecordInputTrace,
  cm0595IssuanceRecordInputTrace,
  cm0595ExecutionEvidenceInputTrace
} = {}) {
  return {
    draftAvailable: true,
    draftUsableNow: decision === 'BOUNDED_RECALL_APPROVAL_PREPARED_EXACT_ONLY',
    draftKind: decision === 'BOUNDED_RECALL_APPROVAL_PREPARED_EXACT_ONLY'
      ? 'bounded_recall_execution_evidence_draft_ready_only'
      : 'bounded_recall_execution_evidence_draft_blocked',
    executionEvidenceTemplateRef: BOUNDED_RECALL_EXECUTION_EVIDENCE_TEMPLATE_REF,
    exactApprovalId: BOUNDED_RECALL_EXACT_APPROVAL_ID,
    exactApprovalLinePreview: approvalLinePreview,
    commandPreviewBundle: boundedRecallCommandPreviewBundle,
    boundedRecallExecutionStillAllowedNow: false,
    runtimeExecutionStillAllowedNow: false,
    selectedPayload: {
      wideningAdoptionRecordInputTrace: wideningAdoptionRecordInputTrace || null,
      cm0595IssuanceRecordInputTrace: cm0595IssuanceRecordInputTrace || null,
      cm0595ExecutionEvidenceInputTrace: cm0595ExecutionEvidenceInputTrace || null,
      executionEvidenceTemplateRef:
        BOUNDED_RECALL_EXECUTION_EVIDENCE_TEMPLATE_REF,
      exactApprovalId: BOUNDED_RECALL_EXACT_APPROVAL_ID,
      exactApprovalLinePreview: approvalLinePreview
    }
  };
}

function buildRenderedBoundedRecallTextSurface({
  decision,
  boundedRecallChecklist,
  boundedRecallChecklistFailures,
  failClosedReasons,
  packetDraft,
  approvalLinePreview,
  boundedRecallCommandPreviewBundle,
  boundedRecallApprovalIssuanceRecordDraft,
  boundedRecallExecutionEvidenceDraft,
  wideningAdoptionRecordInputTrace,
  cm0595IssuanceRecordInputTrace,
  cm0595ExecutionEvidenceInputTrace
} = {}) {
  const lines = [
    `Status: ${packetDraft.status}`,
    `Decision: ${decision}`,
    'Date: <fill>',
    '',
    `Map authority: ${packetDraft.mapAuthority}`,
    `Controlling state: ${packetDraft.controllingState}`,
    `Preparation note: ${packetDraft.preparationNoteRef}`,
    `Future write boundary: ${packetDraft.futureWriteBoundaryRef}`,
    '',
    '## Preparation snapshot',
    '',
    `- target baseline: \`${packetDraft.targetBaseline}\``,
    `- closeout decision: \`${packetDraft.closeoutDecision}\``,
    `- closeout draft status: \`${packetDraft.closeoutRecordDraftStatus}\``,
    `- exact approval id: \`${packetDraft.exactApprovalId}\``,
    '',
    '## Resulting allowance',
    '',
    `- bounded recall may be prepared next: \`${packetDraft.boundedRecallMayBePreparedNext === true ? 'yes' : 'no'}\``,
    `- bounded recall may execute now: \`${packetDraft.boundedRecallMayExecuteNow === true ? 'yes' : 'no'}\``,
    `- runtime may execute now: \`${packetDraft.runtimeMayExecuteNow === true ? 'yes' : 'no'}\``,
    `- fail-closed reasons: \`${failClosedReasons.join(', ') || 'none'}\``,
    '',
    '## Exact approval preview',
    '',
    approvalLinePreview.previewLine,
    '',
    '## Command Preview',
    '',
    `- helper review command: \`${boundedRecallCommandPreviewBundle.primaryCommand}\``,
    `- governance-report command: \`${boundedRecallCommandPreviewBundle.governanceReportCommand}\``,
    `- dashboard command: \`${boundedRecallCommandPreviewBundle.dashboardCommand}\``,
    `- http-observe command: \`${boundedRecallCommandPreviewBundle.httpObserveCommand}\``,
    `- resolved record path mode: \`${boundedRecallCommandPreviewBundle.resolvedRecordPathMode}\``,
    `- resolved widening-adoption record path: \`${boundedRecallCommandPreviewBundle.resolvedWideningAdoptionRecordPath}\``,
    `- resolved CM-0595 issuance record path: \`${boundedRecallCommandPreviewBundle.resolvedCm0595IssuanceRecordPath}\``,
    `- resolved CM-0595 execution-evidence path: \`${boundedRecallCommandPreviewBundle.resolvedCm0595ExecutionEvidenceRecordPath}\``,
    '',
    '## Still forbidden',
    '',
    '- record_memory',
    '- additional durable write',
    '- provider/model call',
    '- config file edit',
    '- .env edit',
    '- watchdog/startup persistence change',
    '- public MCP expansion',
    '- readiness claim'
  ];

  if (wideningAdoptionRecordInputTrace?.traceAvailable === true) {
    lines.push(`- widening-adoption record source: \`${wideningAdoptionRecordInputTrace.sourceFileName}\``);
  }
  if (cm0595IssuanceRecordInputTrace?.traceAvailable === true) {
    lines.push(`- CM-0595 issuance record source: \`${cm0595IssuanceRecordInputTrace.sourceFileName}\``);
  }
  if (cm0595ExecutionEvidenceInputTrace?.traceAvailable === true) {
    lines.push(`- CM-0595 execution-evidence source: \`${cm0595ExecutionEvidenceInputTrace.sourceFileName}\``);
  }

  lines.push('');
  lines.push('## Next Record Drafts');
  lines.push('');
  lines.push(`- issuance record template: \`${boundedRecallApprovalIssuanceRecordDraft.issuanceTemplateRef}\``);
  lines.push(`- issuance draft usable now: \`${boundedRecallApprovalIssuanceRecordDraft.draftUsableNow === true ? 'yes' : 'no'}\``);
  lines.push(`- execution evidence template: \`${boundedRecallExecutionEvidenceDraft.executionEvidenceTemplateRef}\``);
  lines.push(`- execution evidence draft usable now: \`${boundedRecallExecutionEvidenceDraft.draftUsableNow === true ? 'yes' : 'no'}\``);
  lines.push(`- bounded recall execution allowed now: \`${boundedRecallExecutionEvidenceDraft.boundedRecallExecutionStillAllowedNow === true ? 'yes' : 'no'}\``);
  lines.push(`- runtime execution allowed now: \`${boundedRecallExecutionEvidenceDraft.runtimeExecutionStillAllowedNow === true ? 'yes' : 'no'}\``);

  if (Object.keys(boundedRecallChecklist || {}).length > 0) {
    lines.push('');
    lines.push('## Bounded Recall Checklist');
    lines.push('');
    for (const [id, item] of Object.entries(boundedRecallChecklist)) {
      lines.push(`- ${id}: ${item.question} => \`${item.passed === true ? 'yes' : 'no'}\``);
    }
  }

  if (boundedRecallChecklistFailures.length > 0) {
    lines.push('');
    lines.push(`Checklist failures: ${boundedRecallChecklistFailures.join(', ')}`);
  }

  return {
    previewAvailable: true,
    previewUsableNow: true,
    previewKind: decision.toLowerCase(),
    markdown: lines.join('\n')
  };
}

function evaluateAuthorizedWritePathBoundedRecallPreparationReview(input, options = {}) {
  const normalized =
    normalizeAuthorizedWritePathBoundedRecallPreparationReviewInput(input);

  const closeoutReport = evaluateAuthorizedWritePathCm0595CloseoutReview(
    buildCloseoutCompatibleInput(input),
    options
  );

  const invalidSchema = normalized.schemaVersion !== EXPECTED_SCHEMA_VERSION;
  const invalidMode = normalized.mode !== EXPECTED_MODE;

  const boundedRecallChecklist = {
    B1: {
      question: 'Does docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md remain the controlling map and RC_NOT_READY_BLOCKED remain the operator-facing state?',
      passed:
        normalized.controllingMap === EXPECTED_CONTROLLING_MAP &&
        normalized.operatorFacingState === EXPECTED_OPERATOR_STATE
    },
    B2: {
      question: 'Is the target baseline still current or explicitly rebound in docs/board?',
      passed:
        normalized.targetBaseline === EXPECTED_TARGET_BASELINE ||
        (Boolean(normalized.targetBaseline) && normalized.reboundBaselineRecorded === true)
    },
    B3: {
      question: 'Has CM-0654 already recorded future CM-0595 closeout as exactly-one-write-only?',
      passed:
        closeoutReport.cm0595CloseoutReady === true &&
        closeoutReport.decision === EXPECTED_CLOSEOUT_DECISION
    },
    B4: {
      question: 'Does the closeout result still allow bounded recall to be prepared next while keeping execution blocked now?',
      passed:
        closeoutReport.canPrepareBoundedRecallNext === true &&
        closeoutReport.canExecuteBoundedRecallNow === false &&
        closeoutReport.canExecuteRuntimeNow === false
    },
    B5: {
      question: 'Has no bounded-recall exact approval already been issued and has no bounded-recall execution already started?',
      passed:
        normalized.boundedRecallApprovalAlreadyIssued === false &&
        normalized.boundedRecallExecutionAlreadyStarted === false
    },
    B6: {
      question: 'Does scope remain prepare-only and do key runtime-changing actions remain forbidden?',
      passed:
        normalized.boundedRecallPrepareOnlyScopeStillBounded === true &&
        normalized.forbiddenActionsStillForbidden === true &&
        hasSubset(normalized.stillForbiddenActions, REQUIRED_STILL_FORBIDDEN_ACTIONS)
    }
  };

  const boundedRecallChecklistFailures = Object.entries(boundedRecallChecklist)
    .filter(([, item]) => item.passed !== true)
    .map(([id]) => id);

  const preparedExactOnly = boundedRecallChecklistFailures.length === 0;
  const laterCloseoutArtifactsPresent =
    isPlainObject(input) &&
    (input.wideningAdoptionGrantedCm0595Only === true ||
      input.cm0595IssuanceRecordAvailable === true ||
      input.cm0595ExecutionEvidenceAvailable === true);
  const laterBoundedRecallArtifactsPresent =
    normalized.boundedRecallApprovalAlreadyIssued === true ||
    normalized.boundedRecallExecutionAlreadyStarted === true;
  const driftDetected =
    ((closeoutReport.decision === 'CM0595_CLOSEOUT_ABORTED_DRIFT') &&
      laterCloseoutArtifactsPresent) ||
    ((closeoutReport.cm0595CloseoutReady === true || laterBoundedRecallArtifactsPresent) &&
      (boundedRecallChecklist.B1.passed !== true ||
        boundedRecallChecklist.B2.passed !== true ||
        boundedRecallChecklist.B5.passed !== true ||
        boundedRecallChecklist.B6.passed !== true));

  let decision = 'BOUNDED_RECALL_APPROVAL_NOT_READY';
  if (preparedExactOnly) {
    decision = 'BOUNDED_RECALL_APPROVAL_PREPARED_EXACT_ONLY';
  } else if (!normalized.malformedInput && !invalidSchema && !invalidMode && driftDetected) {
    decision = 'BOUNDED_RECALL_APPROVAL_ABORTED_DRIFT';
  }

  const failClosedReasons = [];
  if (normalized.malformedInput) failClosedReasons.push('malformed_input');
  if (invalidSchema) failClosedReasons.push('schema_version_mismatch');
  if (invalidMode) failClosedReasons.push('mode_mismatch');
  if (boundedRecallChecklist.B1.passed !== true) {
    failClosedReasons.push('controlling_map_or_operator_state_drift');
  }
  if (boundedRecallChecklist.B2.passed !== true) {
    failClosedReasons.push('baseline_drift');
  }
  if (boundedRecallChecklist.B3.passed !== true) {
    failClosedReasons.push('cm0595_closeout_not_recorded_exactly_one_write_only');
  }
  if (boundedRecallChecklist.B4.passed !== true) {
    failClosedReasons.push('closeout_does_not_allow_prepare_only_bounded_recall');
  }
  if (boundedRecallChecklist.B5.passed !== true) {
    failClosedReasons.push('bounded_recall_already_issued_or_started');
  }
  if (boundedRecallChecklist.B6.passed !== true) {
    failClosedReasons.push('bounded_recall_prepare_only_scope_not_preserved');
  }

  const status = decision === 'BOUNDED_RECALL_APPROVAL_PREPARED_EXACT_ONLY'
    ? 'prepared_exact_only'
    : decision === 'BOUNDED_RECALL_APPROVAL_ABORTED_DRIFT'
      ? 'aborted_drift'
      : 'blocked_fail_closed';

  const approvalLinePreview = buildBoundedRecallApprovalLinePreview({
    normalized,
    preparedExactOnly
  });

  const boundedRecallCommandPreviewBundle = buildBoundedRecallCommandPreviewBundle({
    preparedExactOnly,
    wideningAdoptionRecordInputTrace:
      options.wideningAdoptionRecordInputTrace || null,
    cm0595IssuanceRecordInputTrace:
      options.cm0595IssuanceRecordInputTrace || null,
    cm0595ExecutionEvidenceInputTrace:
      options.cm0595ExecutionEvidenceInputTrace || null
  });

  const operatorPacketDraft = buildBoundedRecallOperatorPacketDraft({
    normalized,
    decision,
    boundedRecallChecklist,
    preparedExactOnly,
    closeoutReport,
    failClosedReasons,
    boundedRecallCommandPreviewBundle,
    wideningAdoptionRecordInputTrace:
      options.wideningAdoptionRecordInputTrace || null,
    cm0595IssuanceRecordInputTrace:
      options.cm0595IssuanceRecordInputTrace || null,
    cm0595ExecutionEvidenceInputTrace:
      options.cm0595ExecutionEvidenceInputTrace || null
  });

  const boundedRecallApprovalIssuanceRecordDraft =
    buildBoundedRecallApprovalIssuanceRecordDraft({
      decision,
      approvalLinePreview,
      boundedRecallCommandPreviewBundle,
      wideningAdoptionRecordInputTrace:
        options.wideningAdoptionRecordInputTrace || null,
      cm0595IssuanceRecordInputTrace:
        options.cm0595IssuanceRecordInputTrace || null,
      cm0595ExecutionEvidenceInputTrace:
        options.cm0595ExecutionEvidenceInputTrace || null
    });

  const boundedRecallExecutionEvidenceDraft =
    buildBoundedRecallExecutionEvidenceDraft({
      decision,
      approvalLinePreview,
      boundedRecallCommandPreviewBundle,
      wideningAdoptionRecordInputTrace:
        options.wideningAdoptionRecordInputTrace || null,
      cm0595IssuanceRecordInputTrace:
        options.cm0595IssuanceRecordInputTrace || null,
      cm0595ExecutionEvidenceInputTrace:
        options.cm0595ExecutionEvidenceInputTrace || null
    });

  const renderedBoundedRecallTextSurface = buildRenderedBoundedRecallTextSurface({
    decision,
    boundedRecallChecklist,
    boundedRecallChecklistFailures,
    failClosedReasons,
    packetDraft: operatorPacketDraft,
    approvalLinePreview,
    boundedRecallCommandPreviewBundle,
    boundedRecallApprovalIssuanceRecordDraft,
    boundedRecallExecutionEvidenceDraft,
    wideningAdoptionRecordInputTrace:
      options.wideningAdoptionRecordInputTrace || null,
    cm0595IssuanceRecordInputTrace:
      options.cm0595IssuanceRecordInputTrace || null,
    cm0595ExecutionEvidenceInputTrace:
      options.cm0595ExecutionEvidenceInputTrace || null
  });

  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    sourceMode: 'explicit_input',
    status,
    decision,
    controllingState: EXPECTED_OPERATOR_STATE,
    boundedRecallApprovalPrepared: preparedExactOnly,
    canPrepareBoundedRecallExactApproval: preparedExactOnly,
    canExecuteBoundedRecallNow: false,
    canExecuteRuntimeNow: false,
    boundedRecallChecklist,
    boundedRecallChecklistFailures,
    failClosedReasons,
    cm0595CloseoutDecision: closeoutReport.decision,
    cm0595CloseoutReady: closeoutReport.cm0595CloseoutReady === true,
    boundedRecallApprovalLinePreview: approvalLinePreview,
    boundedRecallCommandPreviewBundle,
    boundedRecallOperatorPacketDraft: operatorPacketDraft,
    boundedRecallApprovalIssuanceRecordDraft,
    boundedRecallExecutionEvidenceDraft,
    renderedBoundedRecallTextSurface,
    refs: {
      boundedRecallPreparationNoteRef: BOUNDED_RECALL_PREPARATION_NOTE_REF,
      boundedRecallControlSurfaceNoteRef: BOUNDED_RECALL_CONTROL_SURFACE_NOTE_REF,
      futureWriteBoundaryRef: FUTURE_WRITE_BOUNDARY_REF,
      boundedRecallApprovalIssuanceTemplateRef:
        BOUNDED_RECALL_APPROVAL_ISSUANCE_TEMPLATE_REF,
      boundedRecallExecutionEvidenceTemplateRef:
        BOUNDED_RECALL_EXECUTION_EVIDENCE_TEMPLATE_REF
    },
    traces: {
      wideningAdoptionRecordInputTrace:
        options.wideningAdoptionRecordInputTrace || null,
      cm0595IssuanceRecordInputTrace:
        options.cm0595IssuanceRecordInputTrace || null,
      cm0595ExecutionEvidenceInputTrace:
        options.cm0595ExecutionEvidenceInputTrace || null
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
      boundedRecallApprovalPrepared: preparedExactOnly,
      boundedRecallMayExecuteNow: false,
      runtimeReady: false,
      rcReady: false
    },
    nextStep: preparedExactOnly
      ? 'review_future_bounded_recall_exact_approval_only'
      : 'keep_rc_not_ready_blocked_and_do_not_enter_bounded_recall'
  };
}

module.exports = {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_MODE,
  EXPECTED_CLOSEOUT_DECISION,
  BOUNDED_RECALL_EXACT_APPROVAL_ID,
  BOUNDED_RECALL_PREPARATION_NOTE_REF,
  BOUNDED_RECALL_CONTROL_SURFACE_NOTE_REF,
  FUTURE_WRITE_BOUNDARY_REF,
  BOUNDED_RECALL_APPROVAL_ISSUANCE_TEMPLATE_REF,
  BOUNDED_RECALL_EXECUTION_EVIDENCE_TEMPLATE_REF,
  REQUIRED_STILL_FORBIDDEN_ACTIONS,
  buildBoundedRecallExactApprovalLine,
  normalizeAuthorizedWritePathBoundedRecallPreparationReviewInput,
  evaluateAuthorizedWritePathBoundedRecallPreparationReview
};
