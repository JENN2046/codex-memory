const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');
const {
  EXPECTED_CONTROLLING_MAP,
  EXPECTED_OPERATOR_STATE,
  EXPECTED_TARGET_BASELINE,
  CM0604_WIDENING_GATE_REF,
  CM0606_WIDENING_ADOPTION_BRIDGE_REF,
  CM0607_WIDENING_ADOPTION_RECORD_TEMPLATE_REF,
  CM0616_WIDENING_REVIEW_OUTCOME_TEMPLATE_REF
} = require('./AuthorizedWritePathAutoAuthorizationPreflight');

const EXPECTED_SCHEMA_VERSION = 'cm64-authorized-write-path-widening-adoption-review-v1';
const EXPECTED_MODE = 'cm0606_widening_adoption_review';
const EXPECTED_ENDPOINT_STARTUP_EVIDENCE_ID =
  'docs/CM-0592_AUTHORIZED_PUBLIC_WRITE_PATH_COMBINED_MINIMAL_ENABLEMENT_EVIDENCE.md';
const EXPECTED_WIDENING_REVIEW_DECISION =
  'WIDENING_REVIEW_PASSED_PROCEED_TO_CM0607';
const CM0595_FUTURE_WRITE_BOUNDARY_REF =
  'docs/CM-0595_AUTHORIZED_WRITE_PATH_VALIDATION_AFTER_SPLIT_ENABLEMENT_PACKET.md';
const CM0649_CM0595_APPROVAL_ISSUANCE_RECORD_TEMPLATE_REF =
  'docs/CM-0649_AUTHORIZED_WRITE_PATH_CM0595_APPROVAL_ISSUANCE_RECORD_TEMPLATE.md';
const CM0650_CM0595_EXECUTION_EVIDENCE_TEMPLATE_REF =
  'docs/CM-0650_AUTHORIZED_WRITE_PATH_CM0595_EXECUTION_EVIDENCE_TEMPLATE.md';
const CM0595_EXACT_APPROVAL_LINE =
  '授权执行 CM-0595，target baseline = 017eda4930c5add4b824c162c46868f75c91ea0f，只允许 AUTHORIZED_WRITE_PATH_VALIDATION_AFTER_SPLIT_ENABLEMENT_001，并且仅在同一 baseline 下已存在经批准执行的 CM-0592 endpoint/startup evidence 与经批准执行的 CM-0601 current-session token presence rebound evidence（或等价的更新 presence-only evidence）证明 token 已存在的前提下，允许 exactly one sanitized durable memory write through public record_memory and only the normal write-path audit side effect；禁止 search_memory / marker search / observe:http / .jsonl read / provider / config change / watchdog or startup persistence / public MCP expansion / additional durable write / readiness claim。';

const REQUIRED_STILL_FORBIDDEN_ACTIONS = Object.freeze([
  'search_memory',
  'marker_search',
  'second_write',
  'provider_call',
  'config_edit',
  'env_edit',
  'watchdog_startup_persistence',
  'public_mcp_expansion',
  'migration_apply',
  'durable_write',
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

function normalizeWorkspaceRelativePath(value) {
  return typeof value === 'string' && value.trim()
    ? redactSensitiveFragments(value.trim())
    : '';
}

function normalizeAuthorizedWritePathWideningAdoptionReviewInput(input) {
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
    wideningReviewRecordAvailable: normalizeBoolean(source.wideningReviewRecordAvailable),
    wideningReviewDecision: normalizeString(source.wideningReviewDecision),
    wideningReviewRecordId: normalizeString(source.wideningReviewRecordId),
    cm0604SatisfiedByWideningReview: normalizeBoolean(source.cm0604SatisfiedByWideningReview),
    cm0606BridgeActivatedByWideningReview: normalizeBoolean(source.cm0606BridgeActivatedByWideningReview),
    proceedToCm0607FromWideningReview: normalizeBoolean(source.proceedToCm0607FromWideningReview),
    sameBaselineEndpointStartupEvidenceAvailable: normalizeBoolean(source.sameBaselineEndpointStartupEvidenceAvailable),
    endpointStartupEvidenceId: normalizeString(source.endpointStartupEvidenceId),
    sameBaselineTokenPresentEvidenceAvailable: normalizeBoolean(source.sameBaselineTokenPresentEvidenceAvailable),
    tokenPresentEvidenceSameBaseline: normalizeBoolean(source.tokenPresentEvidenceSameBaseline),
    latestTokenPresentEvidenceId: normalizeString(source.latestTokenPresentEvidenceId),
    noProviderConfigStartupPersistenceDriftSinceEvidence: normalizeBoolean(source.noProviderConfigStartupPersistenceDriftSinceEvidence),
    packetFamilyDriftDetected: normalizeBoolean(source.packetFamilyDriftDetected),
    noBroadScanJsonlReadOrSecondWriteNeeded: normalizeBoolean(source.noBroadScanJsonlReadOrSecondWriteNeeded),
    currentWritePathStillNotValidated: normalizeBoolean(source.currentWritePathStillNotValidated),
    writeUnitStillNarrowestNextProof: normalizeBoolean(source.writeUnitStillNarrowestNextProof),
    scopeStillLimitedToCm0595: normalizeBoolean(source.scopeStillLimitedToCm0595),
    forbiddenActionsStillForbidden: normalizeBoolean(source.forbiddenActionsStillForbidden),
    futureAutoAuthorizationWideningAdopted: normalizeBoolean(source.futureAutoAuthorizationWideningAdopted),
    stillForbiddenActions: normalizeStringArray(source.stillForbiddenActions)
  };
}

function buildAdoptionRecordDraft({
  decision,
  normalized,
  adoptionPrerequisitesSatisfied
} = {}) {
  let status = 'DRAFT_ADOPTION_NOT_READY';
  if (decision === 'WIDENING_ADOPTION_ABORTED_DRIFT') {
    status = 'DRAFT_ADOPTION_ABORTED_DRIFT';
  } else if (decision === 'WIDENING_ADOPTION_DENIED') {
    status = 'DRAFT_ADOPTION_DENIED';
  } else if (decision === 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY') {
    status = 'DRAFT_ADOPTION_GRANTED_CM0595_ONLY';
  }

  const templateDecision = decision === 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY'
    ? 'WIDENING_ADOPTION_GRANTED'
    : 'WIDENING_ADOPTION_DENIED';

  return {
    draftAvailable: true,
    draftUsableNow: adoptionPrerequisitesSatisfied === true,
    status,
    decision: templateDecision,
    evaluatorDecision: decision,
    mapAuthority: EXPECTED_CONTROLLING_MAP,
    controllingState: EXPECTED_OPERATOR_STATE,
    sameBaselineEndpointStartupEvidenceDoc: normalized.endpointStartupEvidenceId || EXPECTED_ENDPOINT_STARTUP_EVIDENCE_ID,
    sameBaselineEndpointStartupEvidenceResult: normalized.sameBaselineEndpointStartupEvidenceAvailable === true ? 'accepted' : 'missing',
    sameBaselineTokenPresenceEvidenceDoc: normalized.latestTokenPresentEvidenceId || '<fill>',
    sameBaselineTokenPresenceEvidenceResult: normalized.sameBaselineTokenPresentEvidenceAvailable === true &&
      normalized.tokenPresentEvidenceSameBaseline === true
      ? 'accepted'
      : 'missing',
    cm0604Satisfied: adoptionPrerequisitesSatisfied === true ? 'true' : 'false',
    cm0605RoutedOutcome: 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW',
    writeUnitStillNarrowestNextProof: normalized.writeUnitStillNarrowestNextProof === true ? 'yes' : 'no',
    futureAutoAuthorizationWideningAdopted: decision === 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY' ? 'yes' : 'no',
    scopeStillLimitedToCm0595: normalized.scopeStillLimitedToCm0595 === true ? 'true' : 'false',
    forbiddenActionsStillForbidden: normalized.forbiddenActionsStillForbidden === true ? 'yes' : 'no',
    resultingAllowance: decision === 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY'
      ? 'future auto-authorization may issue CM-0595 only'
      : 'still no auto-authorization for CM-0595',
    nextBoundary: decision === 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY'
      ? CM0595_FUTURE_WRITE_BOUNDARY_REF
      : 'keep_rc_not_ready_blocked'
  };
}

function buildRenderedAdoptionTextSurface({
  decision,
  normalized,
  adoptionChecklist,
  adoptionChecklistFailures,
  failClosedReasons,
  adoptionRecordDraft,
  adoptionPrerequisitesSatisfied
} = {}) {
  const lines = [
    `Status: ${adoptionRecordDraft.status}`,
    `Decision: ${adoptionRecordDraft.decision}`,
    'Date: <fill>',
    '',
    `Map authority: ${adoptionRecordDraft.mapAuthority}`,
    `Controlling state: ${adoptionRecordDraft.controllingState}`,
    '',
    'Same-baseline endpoint/startup evidence:',
    `- doc: ${adoptionRecordDraft.sameBaselineEndpointStartupEvidenceDoc}`,
    `- result: ${adoptionRecordDraft.sameBaselineEndpointStartupEvidenceResult}`,
    '',
    'Same-baseline token-presence evidence:',
    `- doc: ${adoptionRecordDraft.sameBaselineTokenPresenceEvidenceDoc}`,
    `- result: ${adoptionRecordDraft.sameBaselineTokenPresenceEvidenceResult}`,
    '',
    'CM-0604 satisfied:',
    `- ${adoptionRecordDraft.cm0604Satisfied}`,
    `- justification: ${adoptionPrerequisitesSatisfied === true ? 'same-baseline widening review proceeded to CM-0607' : 'same-baseline widening review prerequisites not yet fully proven'}`,
    '',
    'CM-0605 routed outcome:',
    `- ${adoptionRecordDraft.cm0605RoutedOutcome}`,
    '- justification: widening adoption only considers the escalated path',
    '',
    'Write unit still narrowest next proof:',
    `- ${adoptionRecordDraft.writeUnitStillNarrowestNextProof}`,
    '- justification: scope remains bounded to one CM-0595 write-validation unit only',
    '',
    'Future auto-authorization widening adopted:',
    `- ${adoptionRecordDraft.futureAutoAuthorizationWideningAdopted}`,
    `- justification: evaluator decision is ${decision}`,
    '',
    'Scope still limited to CM-0595:',
    `- ${adoptionRecordDraft.scopeStillLimitedToCm0595}`,
    '- justification: no broader runtime crossing is allowed here',
    '',
    'Forbidden actions still forbidden:',
    `- ${adoptionRecordDraft.forbiddenActionsStillForbidden}`,
    '- justification: adoption review remains governance-only',
    '',
    'Resulting allowance:',
    `- ${adoptionRecordDraft.resultingAllowance}`,
    '',
    '## Adoption snapshot',
    '',
    `- controlling map: \`${EXPECTED_CONTROLLING_MAP}\``,
    `- operator-facing state: \`${EXPECTED_OPERATOR_STATE}\``,
    `- widening review record available: \`${normalized.wideningReviewRecordAvailable === true}\``,
    `- widening review decision: \`${normalized.wideningReviewDecision || 'none'}\``,
    '',
    '## CM-0606 bridge inputs',
    '',
    `- same-baseline endpoint/startup evidence: \`${normalized.sameBaselineEndpointStartupEvidenceAvailable === true}\``,
    `- same-baseline token-present evidence: \`${normalized.sameBaselineTokenPresentEvidenceAvailable === true}\``,
    `- token-present evidence still same baseline: \`${normalized.tokenPresentEvidenceSameBaseline === true}\``,
    `- \`CM-0604\` satisfied by widening review: \`${normalized.cm0604SatisfiedByWideningReview === true}\``,
    `- \`CM-0606\` bridge activated by widening review: \`${normalized.cm0606BridgeActivatedByWideningReview === true}\``,
    `- proceed to \`CM-0607\` from widening review: \`${normalized.proceedToCm0607FromWideningReview === true}\``,
    `- packet family drift detected: \`${normalized.packetFamilyDriftDetected === true}\``,
    `- provider/config/startup-persistence drift since evidence: \`${normalized.noProviderConfigStartupPersistenceDriftSinceEvidence === true ? 'no' : 'yes'}\``,
    '',
    '## Adoption outcome',
    '',
    `- evaluator decision: \`${decision}\``,
    `- checklist failures: \`${adoptionChecklistFailures.join(', ') || 'none'}\``,
    `- fail-closed reasons: \`${failClosedReasons.join(', ') || 'none'}\``,
    '',
    '## Still forbidden',
    '',
    '- search_memory',
    '- marker search',
    '- second write',
    '- provider/model call',
    '- config file edit',
    '- .env edit',
    '- watchdog/startup persistence change',
    '- public MCP expansion',
    '- migration/import/export/backup/restore apply',
    '- readiness claim',
    '',
    '## Resulting allowance',
    '',
    `- evaluator result: \`${decision}\``,
    `- controlling state: \`${EXPECTED_OPERATOR_STATE}\``,
    `- future write boundary ref: \`${CM0595_FUTURE_WRITE_BOUNDARY_REF}\``
  ];

  if (Object.keys(adoptionChecklist || {}).length > 0) {
    lines.push('');
    lines.push('## Adoption Checklist');
    lines.push('');
    for (const [id, item] of Object.entries(adoptionChecklist)) {
      lines.push(`- ${id}: ${item.question} => \`${item.passed === true ? 'yes' : 'no'}\``);
    }
  }

  return {
    previewAvailable: true,
    previewUsableNow: true,
    adoptionKind: decision.toLowerCase(),
    markdown: lines.join('\n')
  };
}

function buildCm0595ApprovalLinePreview({ decision } = {}) {
  return {
    previewAvailable: true,
    previewUsableNow: decision === 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY',
    exactApprovalLine: CM0595_EXACT_APPROVAL_LINE,
    sourceRef: CM0595_FUTURE_WRITE_BOUNDARY_REF,
    prerequisiteRefs: [
      EXPECTED_ENDPOINT_STARTUP_EVIDENCE_ID,
      'docs/CM-0601_CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_PACKET.md',
      CM0616_WIDENING_REVIEW_OUTCOME_TEMPLATE_REF,
      CM0607_WIDENING_ADOPTION_RECORD_TEMPLATE_REF
    ],
    issuanceBoundedTo: 'AUTHORIZED_WRITE_PATH_VALIDATION_AFTER_SPLIT_ENABLEMENT_001',
    stillForbiddenActions: REQUIRED_STILL_FORBIDDEN_ACTIONS
  };
}

function buildCm0595CommandPreviewBundle({
  decision,
  wideningReviewRecordInputTrace,
  wideningAdoptionRecordInputTrace
} = {}) {
  const reviewPath = normalizeWorkspaceRelativePath(
    wideningReviewRecordInputTrace?.sourceWorkspaceRelativePath
  );
  const adoptionPath = normalizeWorkspaceRelativePath(
    wideningAdoptionRecordInputTrace?.sourceWorkspaceRelativePath
  );
  const pathsResolved = Boolean(reviewPath) && Boolean(adoptionPath);
  const reviewArg = reviewPath || '<CM0616_widening_review_record_path>';
  const adoptionArg = adoptionPath || '<CM0607_widening_adoption_record_path>';
  const suffix =
    ` --widening-review-record ${reviewArg} --widening-adoption-record ${adoptionArg}`;

  return {
    previewAvailable: true,
    previewUsableNow: decision === 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY',
    bundleKind: decision === 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY'
      ? 'cm0595_auto_authorization_review_command_bundle'
      : 'cm0595_review_command_bundle',
    resolvedRecordPathMode: pathsResolved ? 'workspace_relative_pair' : 'placeholder_only',
    resolvedWideningReviewRecordPath: reviewPath || 'none',
    resolvedWideningAdoptionRecordPath: adoptionPath || 'none',
    primaryCommand:
      `node .\\src\\cli\\authorized-write-path-widening-adoption-review.js --json${suffix}`,
    governanceReportCommand:
      `node .\\src\\cli\\governance-report.js --json --widening-adoption-review-record ${reviewArg} --widening-adoption-record ${adoptionArg}`,
    dashboardCommand:
      `node .\\src\\cli\\dashboard.js --json --summary-only --widening-adoption-review-record ${reviewArg} --widening-adoption-record ${adoptionArg}`,
    httpObserveCommand:
      `node .\\src\\cli\\http-observe.js --json --widening-adoption-review-record ${reviewArg} --widening-adoption-record ${adoptionArg}`
  };
}

function buildCm0595OperatorPacketDraft({
  decision,
  cm0595ApprovalLinePreview,
  cm0595CommandPreviewBundle,
  wideningReviewRecordInputTrace,
  wideningAdoptionRecordInputTrace
} = {}) {
  return {
    previewAvailable: true,
    packetUsableNow: decision === 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY',
    packetKind: decision === 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY'
      ? 'cm0595_auto_authorization_operator_packet'
      : 'cm0595_operator_packet_blocked',
    targetBoundaryRef: CM0595_FUTURE_WRITE_BOUNDARY_REF,
    exactApprovalLinePreview: cm0595ApprovalLinePreview,
    commandPreviewBundle: cm0595CommandPreviewBundle,
    selectedPayload: {
      wideningReviewRecordInputTrace: wideningReviewRecordInputTrace || null,
      wideningAdoptionRecordInputTrace: wideningAdoptionRecordInputTrace || null,
      targetBoundaryRef: CM0595_FUTURE_WRITE_BOUNDARY_REF,
      exactApprovalLinePreview: cm0595ApprovalLinePreview
    }
  };
}

function buildCm0595IssuanceRecordDraft({
  decision,
  cm0595ApprovalLinePreview,
  cm0595CommandPreviewBundle,
  wideningReviewRecordInputTrace,
  wideningAdoptionRecordInputTrace,
  cm0595IssuanceRecordInputTrace
} = {}) {
  return {
    draftAvailable: true,
    draftUsableNow: decision === 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY',
    draftKind: decision === 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY'
      ? 'cm0595_auto_authorization_issuance_record_draft'
      : 'cm0595_issuance_record_draft_blocked',
    issuanceTemplateRef: CM0649_CM0595_APPROVAL_ISSUANCE_RECORD_TEMPLATE_REF,
    nextExecutionEvidenceTemplateRef: CM0650_CM0595_EXECUTION_EVIDENCE_TEMPLATE_REF,
    targetBoundaryRef: CM0595_FUTURE_WRITE_BOUNDARY_REF,
    exactApprovalLinePreview: cm0595ApprovalLinePreview,
    commandPreviewBundle: cm0595CommandPreviewBundle,
    selectedPayload: {
      wideningReviewRecordInputTrace: wideningReviewRecordInputTrace || null,
      wideningAdoptionRecordInputTrace: wideningAdoptionRecordInputTrace || null,
      cm0595IssuanceRecordInputTrace: cm0595IssuanceRecordInputTrace || null,
      targetBoundaryRef: CM0595_FUTURE_WRITE_BOUNDARY_REF,
      issuanceTemplateRef: CM0649_CM0595_APPROVAL_ISSUANCE_RECORD_TEMPLATE_REF,
      nextExecutionEvidenceTemplateRef: CM0650_CM0595_EXECUTION_EVIDENCE_TEMPLATE_REF
    }
  };
}

function buildCm0595ExecutionEvidenceDraft({
  decision,
  cm0595ApprovalLinePreview,
  wideningReviewRecordInputTrace,
  wideningAdoptionRecordInputTrace,
  cm0595IssuanceRecordInputTrace,
  cm0595ExecutionEvidenceInputTrace
} = {}) {
  return {
    draftAvailable: true,
    draftUsableNow: decision === 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY',
    draftKind: decision === 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY'
      ? 'cm0595_execution_evidence_draft_ready_only'
      : 'cm0595_execution_evidence_draft_blocked',
    executionEvidenceTemplateRef: CM0650_CM0595_EXECUTION_EVIDENCE_TEMPLATE_REF,
    targetBoundaryRef: CM0595_FUTURE_WRITE_BOUNDARY_REF,
    exactApprovalLinePreview: cm0595ApprovalLinePreview,
    requiresLaterRuntimeEvidence: true,
    runtimeExecutionStillAllowedNow: false,
    selectedPayload: {
      wideningReviewRecordInputTrace: wideningReviewRecordInputTrace || null,
      wideningAdoptionRecordInputTrace: wideningAdoptionRecordInputTrace || null,
      cm0595IssuanceRecordInputTrace: cm0595IssuanceRecordInputTrace || null,
      cm0595ExecutionEvidenceInputTrace: cm0595ExecutionEvidenceInputTrace || null,
      targetBoundaryRef: CM0595_FUTURE_WRITE_BOUNDARY_REF,
      executionEvidenceTemplateRef: CM0650_CM0595_EXECUTION_EVIDENCE_TEMPLATE_REF,
      exactApprovalLinePreview: cm0595ApprovalLinePreview
    }
  };
}

function buildRenderedCm0595OperatorPacketTextSurface({
  decision,
  cm0595ApprovalLinePreview,
  cm0595CommandPreviewBundle,
  cm0595OperatorPacketDraft,
  cm0595IssuanceRecordDraft,
  cm0595ExecutionEvidenceDraft,
  failClosedReasons,
  cm0595IssuanceRecordInputTrace,
  cm0595ExecutionEvidenceInputTrace
} = {}) {
  const lines = [
    `Status: ${EXPECTED_OPERATOR_STATE}`,
    `Decision: ${decision}`,
    `Packet kind: ${cm0595OperatorPacketDraft.packetKind}`,
    `Future boundary: ${CM0595_FUTURE_WRITE_BOUNDARY_REF}`,
    '',
    '## CM-0595 auto-authorization snapshot',
    '',
    `- preview usable now: \`${cm0595ApprovalLinePreview.previewUsableNow === true ? 'yes' : 'no'}\``,
    `- packet usable now: \`${cm0595OperatorPacketDraft.packetUsableNow === true ? 'yes' : 'no'}\``,
    `- controlling state: \`${EXPECTED_OPERATOR_STATE}\``,
    `- fail-closed reasons: \`${Array.isArray(failClosedReasons) && failClosedReasons.length > 0 ? failClosedReasons.join(', ') : 'none'}\``,
    '',
    '## Exact Approval Line',
    ''
  ];

  if (cm0595ApprovalLinePreview.previewUsableNow === true) {
    lines.push(cm0595ApprovalLinePreview.exactApprovalLine);
  } else {
    lines.push('not issuable yet');
  }

  lines.push('');
  lines.push('## Command Preview');
  lines.push('');
  lines.push(`- helper review command: \`${cm0595CommandPreviewBundle.primaryCommand}\``);
  lines.push(`- governance-report command: \`${cm0595CommandPreviewBundle.governanceReportCommand}\``);
  lines.push(`- dashboard command: \`${cm0595CommandPreviewBundle.dashboardCommand}\``);
  lines.push(`- http-observe command: \`${cm0595CommandPreviewBundle.httpObserveCommand}\``);
  lines.push(`- resolved record path mode: \`${cm0595CommandPreviewBundle.resolvedRecordPathMode}\``);
  lines.push(`- resolved widening-review record path: \`${cm0595CommandPreviewBundle.resolvedWideningReviewRecordPath}\``);
  lines.push(`- resolved widening-adoption record path: \`${cm0595CommandPreviewBundle.resolvedWideningAdoptionRecordPath}\``);
  if (cm0595IssuanceRecordInputTrace?.traceAvailable === true) {
    lines.push(`- issued CM-0595 record path: \`${cm0595IssuanceRecordInputTrace.sourceWorkspaceRelativePath || 'none'}\``);
    lines.push(`- issued CM-0595 exact line recorded: \`${cm0595IssuanceRecordInputTrace.exactLineIssued === true ? 'yes' : 'no'}\``);
  }
  if (cm0595ExecutionEvidenceInputTrace?.traceAvailable === true) {
    lines.push(`- CM-0595 execution evidence path: \`${cm0595ExecutionEvidenceInputTrace.sourceWorkspaceRelativePath || 'none'}\``);
    lines.push(`- CM-0595 durable write count recorded: \`${cm0595ExecutionEvidenceInputTrace.durableMemoryWriteCount}\``);
    lines.push(`- CM-0595 write-path audit side-effect count recorded: \`${cm0595ExecutionEvidenceInputTrace.writePathAuditSideEffectCount}\``);
  }
  lines.push('');
  lines.push('## Next Record Drafts');
  lines.push('');
  lines.push(`- issuance record template: \`${cm0595IssuanceRecordDraft.issuanceTemplateRef}\``);
  lines.push(`- issuance draft usable now: \`${cm0595IssuanceRecordDraft.draftUsableNow === true ? 'yes' : 'no'}\``);
  lines.push(`- execution evidence template: \`${cm0595ExecutionEvidenceDraft.executionEvidenceTemplateRef}\``);
  lines.push(`- execution evidence draft usable now: \`${cm0595ExecutionEvidenceDraft.draftUsableNow === true ? 'yes' : 'no'}\``);
  lines.push(`- runtime execution allowed now: \`${cm0595ExecutionEvidenceDraft.runtimeExecutionStillAllowedNow === true ? 'yes' : 'no'}\``);

  return {
    previewAvailable: true,
    previewUsableNow: true,
    packetKind: cm0595OperatorPacketDraft.packetKind,
    markdown: lines.join('\n')
  };
}

function evaluateAuthorizedWritePathWideningAdoptionReview(input, options = {}) {
  const normalized = normalizeAuthorizedWritePathWideningAdoptionReviewInput(input);

  const invalidSchema = normalized.schemaVersion !== EXPECTED_SCHEMA_VERSION;
  const invalidMode = normalized.mode !== EXPECTED_MODE;

  const adoptionChecklist = {
    A1: {
      question: 'Does docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md remain the controlling map?',
      passed: normalized.controllingMap === EXPECTED_CONTROLLING_MAP
    },
    A2: {
      question: 'Does operator-facing state remain RC_NOT_READY_BLOCKED?',
      passed: normalized.operatorFacingState === EXPECTED_OPERATOR_STATE
    },
    A3: {
      question: 'Is the target baseline still current or explicitly rebound in docs/board?',
      passed: normalized.targetBaseline === EXPECTED_TARGET_BASELINE ||
        (Boolean(normalized.targetBaseline) && normalized.reboundBaselineRecorded === true)
    },
    A4: {
      question: 'Does a CM-0616 widening-review record already exist with proceed-to-CM0607 outcome?',
      passed: normalized.wideningReviewRecordAvailable === true &&
        normalized.wideningReviewDecision === EXPECTED_WIDENING_REVIEW_DECISION &&
        Boolean(normalized.wideningReviewRecordId) &&
        normalized.cm0604SatisfiedByWideningReview === true &&
        normalized.cm0606BridgeActivatedByWideningReview === true &&
        normalized.proceedToCm0607FromWideningReview === true
    },
    A5: {
      question: 'Does same-baseline endpoint/startup evidence still exist through CM-0592?',
      passed: normalized.sameBaselineEndpointStartupEvidenceAvailable === true &&
        normalized.endpointStartupEvidenceId === EXPECTED_ENDPOINT_STARTUP_EVIDENCE_ID
    },
    A6: {
      question: 'Does same-baseline token-present evidence already exist and stay bound to the same baseline?',
      passed: normalized.sameBaselineTokenPresentEvidenceAvailable === true &&
        normalized.tokenPresentEvidenceSameBaseline === true &&
        Boolean(normalized.latestTokenPresentEvidenceId)
    },
    A7: {
      question: 'Has drift stayed closed since the proving evidence and is the write path still not validated?',
      passed: normalized.noProviderConfigStartupPersistenceDriftSinceEvidence === true &&
        normalized.packetFamilyDriftDetected === false &&
        normalized.currentWritePathStillNotValidated === true
    },
    A8: {
      question: 'Does widening remain limited to CM-0595 as the narrowest next proof without broad scan or second write?',
      passed: normalized.noBroadScanJsonlReadOrSecondWriteNeeded === true &&
        normalized.writeUnitStillNarrowestNextProof === true &&
        normalized.scopeStillLimitedToCm0595 === true
    },
    A9: {
      question: 'Are forbidden actions still forbidden at the adoption-review stage?',
      passed: normalized.forbiddenActionsStillForbidden === true &&
        hasSubset(normalized.stillForbiddenActions, REQUIRED_STILL_FORBIDDEN_ACTIONS)
    },
    A10: {
      question: 'Has a later explicit adoption decision actually granted widening toward CM-0595 only?',
      passed: normalized.futureAutoAuthorizationWideningAdopted === true
    }
  };

  const adoptionChecklistFailures = Object.entries(adoptionChecklist)
    .filter(([, item]) => item.passed !== true)
    .map(([id]) => id);

  const adoptionPrerequisitesSatisfied = adoptionChecklist.A1.passed === true &&
    adoptionChecklist.A2.passed === true &&
    adoptionChecklist.A3.passed === true &&
    adoptionChecklist.A4.passed === true &&
    adoptionChecklist.A5.passed === true &&
    adoptionChecklist.A6.passed === true &&
    adoptionChecklist.A7.passed === true &&
    adoptionChecklist.A8.passed === true &&
    adoptionChecklist.A9.passed === true;

  const driftDetected = adoptionChecklist.A3.passed !== true ||
    normalized.packetFamilyDriftDetected === true ||
    normalized.noProviderConfigStartupPersistenceDriftSinceEvidence !== true ||
    normalized.currentWritePathStillNotValidated !== true;

  let decision = 'WIDENING_ADOPTION_NOT_READY';
  if (adoptionPrerequisitesSatisfied && adoptionChecklist.A10.passed === true) {
    decision = 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY';
  } else if (adoptionPrerequisitesSatisfied && adoptionChecklist.A10.passed !== true) {
    decision = 'WIDENING_ADOPTION_DENIED';
  } else if (driftDetected && !normalized.malformedInput && !invalidSchema && !invalidMode) {
    decision = 'WIDENING_ADOPTION_ABORTED_DRIFT';
  }

  const failClosedReasons = [];
  if (normalized.malformedInput) failClosedReasons.push('malformed_input');
  if (invalidSchema) failClosedReasons.push('schema_version_mismatch');
  if (invalidMode) failClosedReasons.push('mode_mismatch');
  if (adoptionChecklist.A1.passed !== true) failClosedReasons.push('controlling_map_drift');
  if (adoptionChecklist.A2.passed !== true) failClosedReasons.push('operator_state_drift');
  if (adoptionChecklist.A3.passed !== true) failClosedReasons.push('baseline_drift');
  if (adoptionChecklist.A4.passed !== true) failClosedReasons.push('widening_review_not_ready_for_adoption');
  if (adoptionChecklist.A5.passed !== true) failClosedReasons.push('endpoint_startup_evidence_missing');
  if (adoptionChecklist.A6.passed !== true) failClosedReasons.push('token_present_same_baseline_evidence_missing');
  if (adoptionChecklist.A7.passed !== true) failClosedReasons.push('write_path_or_environment_drift');
  if (adoptionChecklist.A8.passed !== true) failClosedReasons.push('cm0595_scope_not_proven_narrow');
  if (adoptionChecklist.A9.passed !== true) failClosedReasons.push('forbidden_action_boundary_not_preserved');
  if (adoptionChecklist.A10.passed !== true) failClosedReasons.push('widening_adoption_not_granted');

  const status = decision === 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY'
    ? 'granted_cm0595_only'
    : decision === 'WIDENING_ADOPTION_DENIED'
      ? 'denied'
      : decision === 'WIDENING_ADOPTION_ABORTED_DRIFT'
        ? 'aborted_drift'
        : 'blocked_fail_closed';

  const adoptionRecordDraft = buildAdoptionRecordDraft({
    decision,
    normalized,
    adoptionPrerequisitesSatisfied
  });
  const renderedAdoptionTextSurface = buildRenderedAdoptionTextSurface({
    decision,
    normalized,
    adoptionChecklist,
    adoptionChecklistFailures,
    failClosedReasons,
    adoptionRecordDraft,
    adoptionPrerequisitesSatisfied
  });
  const cm0595ApprovalLinePreview = buildCm0595ApprovalLinePreview({ decision });
  const cm0595CommandPreviewBundle = buildCm0595CommandPreviewBundle({
    decision,
    wideningReviewRecordInputTrace: options.wideningReviewRecordInputTrace || null,
    wideningAdoptionRecordInputTrace: options.wideningAdoptionRecordInputTrace || null
  });
  const cm0595OperatorPacketDraft = buildCm0595OperatorPacketDraft({
    decision,
    cm0595ApprovalLinePreview,
    cm0595CommandPreviewBundle,
    wideningReviewRecordInputTrace: options.wideningReviewRecordInputTrace || null,
    wideningAdoptionRecordInputTrace: options.wideningAdoptionRecordInputTrace || null
  });
  const cm0595IssuanceRecordDraft = buildCm0595IssuanceRecordDraft({
    decision,
    cm0595ApprovalLinePreview,
    cm0595CommandPreviewBundle,
    wideningReviewRecordInputTrace: options.wideningReviewRecordInputTrace || null,
    wideningAdoptionRecordInputTrace: options.wideningAdoptionRecordInputTrace || null,
    cm0595IssuanceRecordInputTrace: options.cm0595IssuanceRecordInputTrace || null
  });
  const cm0595ExecutionEvidenceDraft = buildCm0595ExecutionEvidenceDraft({
    decision,
    cm0595ApprovalLinePreview,
    wideningReviewRecordInputTrace: options.wideningReviewRecordInputTrace || null,
    wideningAdoptionRecordInputTrace: options.wideningAdoptionRecordInputTrace || null,
    cm0595IssuanceRecordInputTrace: options.cm0595IssuanceRecordInputTrace || null,
    cm0595ExecutionEvidenceInputTrace: options.cm0595ExecutionEvidenceInputTrace || null
  });
  const renderedCm0595OperatorPacketTextSurface =
    buildRenderedCm0595OperatorPacketTextSurface({
      decision,
      cm0595ApprovalLinePreview,
      cm0595CommandPreviewBundle,
      cm0595OperatorPacketDraft,
      cm0595IssuanceRecordDraft,
      cm0595ExecutionEvidenceDraft,
      failClosedReasons,
      cm0595IssuanceRecordInputTrace: options.cm0595IssuanceRecordInputTrace || null,
      cm0595ExecutionEvidenceInputTrace: options.cm0595ExecutionEvidenceInputTrace || null
    });

  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    sourceMode: 'explicit_input',
    status,
    decision,
    controllingState: EXPECTED_OPERATOR_STATE,
    adoptionPrerequisitesSatisfied,
    cm0607AdoptionRecordReady: adoptionPrerequisitesSatisfied,
    canAutoAuthorizeCm0595: decision === 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY',
    canAutoAuthorizeRecordMemory: false,
    canExecuteRuntimeNow: false,
    adoptionChecklist,
    adoptionChecklistFailures,
    failClosedReasons: uniqueValues(failClosedReasons),
    adoptionRecordDraft,
    renderedAdoptionTextSurface,
    cm0595ApprovalLinePreview,
    cm0595CommandPreviewBundle,
    cm0595OperatorPacketDraft,
    cm0595IssuanceRecordDraft,
    cm0595ExecutionEvidenceDraft,
    renderedCm0595OperatorPacketTextSurface,
    cm0595IssuanceRecordInputTrace: options.cm0595IssuanceRecordInputTrace || null,
    cm0595ExecutionEvidenceInputTrace: options.cm0595ExecutionEvidenceInputTrace || null,
    nextStep: decision === 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY'
      ? 'record_cm0607_and_limit_auto_authorization_to_cm0595_only'
      : decision === 'WIDENING_ADOPTION_DENIED'
        ? 'record_cm0607_denial_and_keep_cm0595_out_of_scope'
        : decision === 'WIDENING_ADOPTION_ABORTED_DRIFT'
          ? 'refresh_drift_inputs_and_keep_rc_not_ready_blocked'
          : 'keep_rc_not_ready_blocked_and_do_not_grant_widening',
    refs: {
      wideningGateRef: CM0604_WIDENING_GATE_REF,
      wideningAdoptionBridgeRef: CM0606_WIDENING_ADOPTION_BRIDGE_REF,
      wideningAdoptionRecordTemplateRef: CM0607_WIDENING_ADOPTION_RECORD_TEMPLATE_REF,
      wideningReviewOutcomeTemplateRef: CM0616_WIDENING_REVIEW_OUTCOME_TEMPLATE_REF,
      futureWriteBoundaryRef: CM0595_FUTURE_WRITE_BOUNDARY_REF,
      cm0595ApprovalIssuanceRecordTemplateRef: CM0649_CM0595_APPROVAL_ISSUANCE_RECORD_TEMPLATE_REF,
      cm0595ExecutionEvidenceTemplateRef: CM0650_CM0595_EXECUTION_EVIDENCE_TEMPLATE_REF
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
      cm0607AdoptionRecordReady: adoptionPrerequisitesSatisfied,
      cm0595AutoAuthorizationReady: decision === 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY',
      runtimeReady: false,
      rcReady: false
    }
  };
}

module.exports = {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_MODE,
  EXPECTED_WIDENING_REVIEW_DECISION,
  CM0595_EXACT_APPROVAL_LINE,
  REQUIRED_STILL_FORBIDDEN_ACTIONS,
  evaluateAuthorizedWritePathWideningAdoptionReview,
  normalizeAuthorizedWritePathWideningAdoptionReviewInput
};
