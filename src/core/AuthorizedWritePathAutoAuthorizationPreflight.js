const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'cm61-authorized-write-path-auto-authorization-preflight-v1';
const EXPECTED_MODE = 'cm0601_auto_reuse_preflight';
const EXPECTED_CONTROLLING_MAP = 'docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md';
const EXPECTED_OPERATOR_STATE = 'RC_NOT_READY_BLOCKED';
const EXPECTED_TARGET_BASELINE = '017eda4930c5add4b824c162c46868f75c91ea0f';
const EXPECTED_ENDPOINT_STARTUP_EVIDENCE_ID =
  'docs/CM-0592_AUTHORIZED_PUBLIC_WRITE_PATH_COMBINED_MINIMAL_ENABLEMENT_EVIDENCE.md';
const CM0611_ASSERTION_RECORD_TEMPLATE_REF =
  'docs/CM-0611_EXTERNAL_TOKEN_MATERIAL_ASSERTION_RECORD_TEMPLATE.md';
const CM0610_ASSERTION_CONTRACT_REF =
  'docs/CM-0610_EXTERNAL_TOKEN_MATERIAL_ASSERTION_CONTRACT.md';
const CM0608_PREFLIGHT_CHECKLIST_REF =
  'docs/CM-0608_CM0601_AUTO_REUSE_PREFLIGHT_CHECKLIST.md';
const CM0601_APPROVAL_LINE_SOURCE_REF =
  'docs/CM-0601_CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_PACKET.md';
const CM0614_ISSUANCE_RECORD_TEMPLATE_REF =
  'docs/CM-0614_CM0601_AUTO_REUSE_APPROVAL_ISSUANCE_RECORD_TEMPLATE.md';
const CM0609_EXECUTION_EVIDENCE_TEMPLATE_REF =
  'docs/CM-0609_CM0601_AUTO_REUSE_EXECUTION_EVIDENCE_TEMPLATE.md';
const CM0612_OPERATOR_SEQUENCE_REF =
  'docs/CM-0612_CM0601_AUTO_REUSE_OPERATOR_SEQUENCE.md';
const CM0605_DECISION_TABLE_REF =
  'docs/CM-0605_AUTHORIZED_WRITE_PATH_AUTO_AUTHORIZATION_DECISION_TABLE.md';
const CM0615_ROUTING_OUTCOME_TEMPLATE_REF =
  'docs/CM-0615_CM0605_ROUTING_OUTCOME_RECORD_TEMPLATE.md';
const CM0604_WIDENING_GATE_REF =
  'docs/CM-0604_AUTHORIZED_WRITE_PATH_AUTO_AUTHORIZATION_WIDENING_GATE.md';
const CM0616_WIDENING_REVIEW_OUTCOME_TEMPLATE_REF =
  'docs/CM-0616_WIDENING_REVIEW_OUTCOME_RECORD_TEMPLATE.md';
const CM0606_WIDENING_ADOPTION_BRIDGE_REF =
  'docs/CM-0606_AUTHORIZED_WRITE_PATH_AUTO_AUTHORIZATION_WIDENING_ADOPTION_BRIDGE.md';
const CM0607_WIDENING_ADOPTION_RECORD_TEMPLATE_REF =
  'docs/CM-0607_AUTHORIZED_WRITE_PATH_AUTO_AUTHORIZATION_WIDENING_ADOPTION_RECORD_TEMPLATE.md';
const CM0595_FUTURE_WRITE_BOUNDARY_REF =
  'docs/CM-0595_AUTHORIZED_WRITE_PATH_VALIDATION_AFTER_SPLIT_ENABLEMENT_PACKET.md';
const EXPECTED_UNIT = 'CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_001';
const ASSERTION_RECORD_PATH_PLACEHOLDER =
  '<CM0611_assertion_record_path>';
const HELPER_ASSERTION_REVIEW_COMMAND =
  'node .\\src\\cli\\authorized-write-path-auto-authorization.js --json --assertion-record <CM0611_assertion_record_path>';
const GOVERNANCE_REPORT_ASSERTION_REVIEW_COMMAND =
  'node .\\src\\cli\\governance-report.js --json --auto-auth-assertion-record <CM0611_assertion_record_path>';
const DASHBOARD_ASSERTION_REVIEW_COMMAND =
  'node .\\src\\cli\\dashboard.js --json --summary-only --auto-auth-assertion-record <CM0611_assertion_record_path>';
const HTTP_OBSERVE_ASSERTION_REVIEW_COMMAND =
  'node .\\src\\cli\\http-observe.js --json --auto-auth-assertion-record <CM0611_assertion_record_path>';
const CM0601_EXACT_APPROVAL_LINE =
  '授权执行 CM-0601，target baseline = 017eda4930c5add4b824c162c46868f75c91ea0f，只允许 CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_001，只允许在 token material 已被独立提供到当前 session 的前提下检查当前 session 内 CODEX_MEMORY_HTTP_TOKEN 是否存在（不得绑定、不得打印、不得持久化），禁止 record_memory / search_memory / marker search / start:http:ensure / health probe / observe:http / .jsonl read / provider / config change / .env edit / watchdog or startup persistence / public MCP expansion / durable write / readiness claim。';

const ALLOWED_GOVERNANCE_OUTPUTS = Object.freeze([
  'NO_AUTO_APPROVAL_ISSUED',
  'AUTO_REUSE_CM0601_LINE_ONLY',
  'ESCALATE_FOR_FUTURE_WIDENING_REVIEW'
]);

const ACCEPTED_ASSERTION_CLASSES = Object.freeze([
  'OPERATOR_EXPLICIT_CURRENT_SESSION_ASSERTION',
  'SEPARATE_SESSION_SETUP_STEP_RECORDED',
  'EXTERNAL_HANDOFF_ASSERTION_RECORDED'
]);

const CM0611_ALLOWED_DECISION_VALUES = Object.freeze([
  'EXTERNAL_TOKEN_ASSERTION_ACCEPTED_FOR_C6_REVIEW',
  'EXTERNAL_TOKEN_ASSERTION_REJECTED_FAIL_CLOSED',
  'EXTERNAL_TOKEN_ASSERTION_INSUFFICIENT_EVIDENCE'
]);

const REQUIRED_STILL_OUT_OF_SCOPE_ACTIONS = Object.freeze([
  'CM-0595',
  'record_memory',
  'search_memory',
  'provider_call',
  'config_mutation',
  'startup_persistence',
  'public_mcp_expansion',
  'durable_write',
  'readiness_claim'
]);

const CM0614_ALLOWED_DECISION_VALUES = Object.freeze([
  'AUTO_REUSED_CM0601_LINE_ISSUED_NOT_EXECUTED',
  'AUTO_REUSED_CM0601_LINE_NOT_ISSUED',
  'AUTO_REUSED_CM0601_LINE_ISSUANCE_ABORTED_DRIFT'
]);

const CM0615_ALLOWED_DECISION_VALUES = Object.freeze([
  'CM0605_ROUTED_NO_AUTO_APPROVAL_ISSUED',
  'CM0605_ROUTED_AUTO_REUSE_CM0601_LINE_ONLY',
  'CM0605_ROUTED_ESCALATE_FOR_FUTURE_WIDENING_REVIEW',
  'CM0605_ROUTING_ABORTED_DRIFT'
]);

const CM0616_ALLOWED_DECISION_VALUES = Object.freeze([
  'WIDENING_REVIEW_NOT_READY',
  'WIDENING_REVIEW_PASSED_ADOPTION_NOT_GRANTED',
  'WIDENING_REVIEW_PASSED_PROCEED_TO_CM0607',
  'WIDENING_REVIEW_ABORTED_DRIFT'
]);

const CM0611_REQUIRED_HEADER_FIELDS = Object.freeze([
  'Status',
  'Decision',
  'Date',
  'Assertion source',
  'assertionClass',
  'assertedCurrentSessionOnly',
  'assertedIndependentOfPacket',
  'assertedNoBindingRequested',
  'assertedNoPersistenceRequested',
  'assertedScopeStillCm0601Only',
  'assertedNoStartupHealthWriteRecallRequested',
  'assertedAt',
  'Contract verdict',
  'Next allowed use'
]);

const CM0614_REQUIRED_HEADER_FIELDS = Object.freeze([
  'Status',
  'Decision',
  'Date',
  'Target baseline',
  'Issuance route',
  'Checklist result',
  'Checklist evidence source',
  'External assertion record',
  'Assertion contract result',
  'Issued approval text',
  'Issued by',
  'Execution started',
  'Out-of-scope actions executed'
]);

const CM0615_REQUIRED_HEADER_FIELDS = Object.freeze([
  'Status',
  'Decision',
  'Date',
  'Target baseline',
  'Routing source',
  'Routing case',
  'Routing outcome',
  'Pre-routing evidence',
  'Token presence result',
  'Widening gate satisfied',
  'Widening adopted',
  'Next boundary',
  'Out-of-scope actions executed'
]);

const CM0616_REQUIRED_HEADER_FIELDS = Object.freeze([
  'Status',
  'Decision',
  'Date',
  'Target baseline',
  'Review source',
  'Routing outcome record',
  'CM-0604 satisfied',
  'CM-0606 bridge activated',
  'Proceed to CM-0607 adoption record',
  'Next boundary',
  'Out-of-scope actions executed'
]);

const CM0614_REQUIRED_SECTION_TITLES = Object.freeze([
  'Pre-issuance snapshot',
  'Checklist pass record',
  'Issued approval text',
  'Execution boundary after issuance',
  'Forbidden actions not run',
  'Result and next boundary'
]);

const CM0615_REQUIRED_SECTION_TITLES = Object.freeze([
  'Routing snapshot',
  'Decision-table case record',
  'Routing outcome',
  'Blocked or escalated next boundary',
  'Forbidden actions not run',
  'Result and controlling state'
]);

const CM0616_REQUIRED_SECTION_TITLES = Object.freeze([
  'Review snapshot',
  'CM-0604 gate review',
  'CM-0606 bridge state',
  'Review outcome',
  'Forbidden actions not run',
  'Result and next boundary'
]);

const CM0611_REQUIRED_SECTION_TITLES = Object.freeze([
  'Assertion Summary',
  'CM-0610 Field Check',
  'Verdict',
  'Still Forbidden'
]);

const ALLOWED_LATEST_REBOUND_OUTCOME_CLASSES = Object.freeze([
  'token_missing',
  'stale_for_current_token_state',
  'token_present'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneArray(values) {
  return Array.isArray(values) ? [...values] : [];
}

function normalizeString(value) {
  return typeof value === 'string' ? redactSensitiveFragments(value.trim()) : '';
}

function normalizeStringArray(values) {
  return cloneArray(values)
    .map(normalizeString)
    .filter(Boolean);
}

function normalizeBoolean(value) {
  return value === true;
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function hasSubset(values, requiredValues) {
  return requiredValues.every(value => values.includes(value));
}

function buildOperatorActionPlan({
  normalized,
  checklist,
  allowedGovernanceOutput
} = {}) {
  const orderedSequenceRefs = [
    CM0611_ASSERTION_RECORD_TEMPLATE_REF,
    CM0610_ASSERTION_CONTRACT_REF,
    CM0608_PREFLIGHT_CHECKLIST_REF,
    CM0601_APPROVAL_LINE_SOURCE_REF,
    CM0614_ISSUANCE_RECORD_TEMPLATE_REF,
    CM0609_EXECUTION_EVIDENCE_TEMPLATE_REF,
    CM0615_ROUTING_OUTCOME_TEMPLATE_REF
  ];
  const wideningPathRefs = [
    CM0604_WIDENING_GATE_REF,
    CM0616_WIDENING_REVIEW_OUTCOME_TEMPLATE_REF,
    CM0606_WIDENING_ADOPTION_BRIDGE_REF,
    CM0607_WIDENING_ADOPTION_RECORD_TEMPLATE_REF,
    CM0595_FUTURE_WRITE_BOUNDARY_REF
  ];

  let currentStage = 'keep_rc_not_ready_blocked';
  let nextStepRef = '';
  let nextStepRefs = [];
  let currentStageReason = 'The current chain remains fail-closed.';

  if (checklist?.C6?.passed !== true) {
    if (normalized?.externalAssertion?.asserted === true) {
      currentStage = 'await_cm0610_contract_acceptance';
      nextStepRef = CM0610_ASSERTION_CONTRACT_REF;
      nextStepRefs = [CM0611_ASSERTION_RECORD_TEMPLATE_REF, CM0610_ASSERTION_CONTRACT_REF];
      currentStageReason = 'An explicit assertion exists, but it has not yet satisfied the CM-0610 acceptance boundary.';
    } else {
      currentStage = 'await_cm0611_assertion_record';
      nextStepRef = CM0611_ASSERTION_RECORD_TEMPLATE_REF;
      nextStepRefs = [CM0611_ASSERTION_RECORD_TEMPLATE_REF, CM0610_ASSERTION_CONTRACT_REF];
      currentStageReason = 'No accepted external token-material assertion record exists yet.';
    }
  } else if (checklist?.C7?.passed !== true || checklist?.C8?.passed !== true) {
    currentStage = 'scope_drift_fail_closed';
    nextStepRef = CM0612_OPERATOR_SEQUENCE_REF;
    nextStepRefs = [CM0612_OPERATOR_SEQUENCE_REF];
    currentStageReason = 'The automatic-authorization scope drifted wider than the current CM-0601-only boundary.';
  } else if (checklist?.C1?.passed !== true || checklist?.C2?.passed !== true || checklist?.C3?.passed !== true || checklist?.C4?.passed !== true || checklist?.C5?.passed !== true) {
    currentStage = 'prerequisite_drift_fail_closed';
    nextStepRef = CM0612_OPERATOR_SEQUENCE_REF;
    nextStepRefs = [CM0612_OPERATOR_SEQUENCE_REF];
    currentStageReason = 'A controlling baseline, evidence, or operator-state prerequisite drifted and must be reconciled before further reuse review.';
  } else if (allowedGovernanceOutput === 'AUTO_REUSE_CM0601_LINE_ONLY') {
    currentStage = 'cm0601_line_reuse_ready';
    nextStepRef = CM0601_APPROVAL_LINE_SOURCE_REF;
    nextStepRefs = [
      CM0601_APPROVAL_LINE_SOURCE_REF,
      CM0614_ISSUANCE_RECORD_TEMPLATE_REF,
      CM0609_EXECUTION_EVIDENCE_TEMPLATE_REF,
      CM0615_ROUTING_OUTCOME_TEMPLATE_REF
    ];
    currentStageReason = 'The current chain allows only exact CM-0601 line reuse, with issuance and execution still separately record-bound.';
  } else if (allowedGovernanceOutput === 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW') {
    currentStage = 'cm0604_widening_review_ready';
    nextStepRef = CM0604_WIDENING_GATE_REF;
    nextStepRefs = wideningPathRefs;
    currentStageReason = 'Token-present governance now routes into widening review instead of directly reaching CM-0595.';
  }

  return {
    sequenceRef: CM0612_OPERATOR_SEQUENCE_REF,
    orderedSequenceRefs,
    wideningPathRefs,
    futureWriteBoundaryRef: CM0595_FUTURE_WRITE_BOUNDARY_REF,
    currentStage,
    currentStageReason,
    nextStepRef,
    nextStepRefs
  };
}

function buildIssuanceRecordPreview(allowedGovernanceOutput = 'NO_AUTO_APPROVAL_ISSUED') {
  return {
    previewAvailable: true,
    previewUsableNow: allowedGovernanceOutput === 'AUTO_REUSE_CM0601_LINE_ONLY',
    templateRef: CM0614_ISSUANCE_RECORD_TEMPLATE_REF,
    appliesOnlyTo: 'CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_001',
    issuanceRouteRefs: [
      'docs/CM-0602_CURRENT_SESSION_TOKEN_REBOUND_AUTO_AUTHORIZATION_RULE.md',
      CM0608_PREFLIGHT_CHECKLIST_REF,
      CM0601_APPROVAL_LINE_SOURCE_REF
    ],
    checklistRef: CM0608_PREFLIGHT_CHECKLIST_REF,
    externalAssertionRecordRef: CM0611_ASSERTION_RECORD_TEMPLATE_REF,
    assertionContractRef: CM0610_ASSERTION_CONTRACT_REF,
    allowedDecisionValues: [...CM0614_ALLOWED_DECISION_VALUES],
    requiredHeaderFields: [...CM0614_REQUIRED_HEADER_FIELDS],
    requiredSectionTitles: [...CM0614_REQUIRED_SECTION_TITLES],
    exactApprovalLine: CM0601_EXACT_APPROVAL_LINE,
    executionEvidenceTemplateRef: CM0609_EXECUTION_EVIDENCE_TEMPLATE_REF,
    executionStartedByPreview: false,
    outOfScopeActionsExecuted: 'none'
  };
}

function buildRoutingOutcomePreview(allowedGovernanceOutput = 'NO_AUTO_APPROVAL_ISSUED') {
  return {
    previewAvailable: true,
    previewUsableNow: allowedGovernanceOutput === 'AUTO_REUSE_CM0601_LINE_ONLY'
      || allowedGovernanceOutput === 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW',
    templateRef: CM0615_ROUTING_OUTCOME_TEMPLATE_REF,
    routingSourceRef: CM0605_DECISION_TABLE_REF,
    preRoutingEvidenceRefs: [
      CM0614_ISSUANCE_RECORD_TEMPLATE_REF,
      CM0609_EXECUTION_EVIDENCE_TEMPLATE_REF
    ],
    allowedDecisionValues: [...CM0615_ALLOWED_DECISION_VALUES],
    requiredHeaderFields: [...CM0615_REQUIRED_HEADER_FIELDS],
    requiredSectionTitles: [...CM0615_REQUIRED_SECTION_TITLES],
    possibleRoutingOutcomes: [...ALLOWED_GOVERNANCE_OUTPUTS],
    blockedState: EXPECTED_OPERATOR_STATE,
    wideningPathRefs: [
      CM0604_WIDENING_GATE_REF,
      CM0606_WIDENING_ADOPTION_BRIDGE_REF,
      CM0607_WIDENING_ADOPTION_RECORD_TEMPLATE_REF
    ],
    futureWriteBoundaryRef: CM0595_FUTURE_WRITE_BOUNDARY_REF,
    outOfScopeActionsExecuted: 'none'
  };
}

function buildWideningReviewPreview(allowedGovernanceOutput = 'NO_AUTO_APPROVAL_ISSUED') {
  return {
    previewAvailable: true,
    previewUsableNow: allowedGovernanceOutput === 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW',
    templateRef: CM0616_WIDENING_REVIEW_OUTCOME_TEMPLATE_REF,
    reviewSourceRef: CM0604_WIDENING_GATE_REF,
    routingOutcomeTemplateRef: CM0615_ROUTING_OUTCOME_TEMPLATE_REF,
    bridgeRef: CM0606_WIDENING_ADOPTION_BRIDGE_REF,
    adoptionRecordTemplateRef: CM0607_WIDENING_ADOPTION_RECORD_TEMPLATE_REF,
    futureWriteBoundaryRef: CM0595_FUTURE_WRITE_BOUNDARY_REF,
    allowedDecisionValues: [...CM0616_ALLOWED_DECISION_VALUES],
    requiredHeaderFields: [...CM0616_REQUIRED_HEADER_FIELDS],
    requiredSectionTitles: [...CM0616_REQUIRED_SECTION_TITLES],
    requiredRoutedOutcome: 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW',
    blockedState: EXPECTED_OPERATOR_STATE,
    outOfScopeActionsExecuted: 'none'
  };
}

function buildRecordDrafts({
  checklistPassed = false,
  checklist = {},
  allowedGovernanceOutput = 'NO_AUTO_APPROVAL_ISSUED',
  normalized = null
} = {}) {
  const safeNormalized = isPlainObject(normalized) ? normalized : {};
  const externalAssertion = isPlainObject(safeNormalized.externalAssertion)
    ? safeNormalized.externalAssertion
    : {};
  const assertionDraftDecision = checklist.C6?.passed === true
    ? 'EXTERNAL_TOKEN_ASSERTION_ACCEPTED_FOR_C6_REVIEW'
    : externalAssertion.asserted === true
      ? 'EXTERNAL_TOKEN_ASSERTION_REJECTED_FAIL_CLOSED'
      : 'EXTERNAL_TOKEN_ASSERTION_INSUFFICIENT_EVIDENCE';
  const assertionDraftStatus = checklist.C6?.passed === true
    ? 'DRAFT_ASSERTION_ACCEPTED_NOT_EXECUTED'
    : externalAssertion.asserted === true
      ? 'DRAFT_ASSERTION_PENDING_CONTRACT_REVIEW'
      : 'DRAFT_ASSERTION_NOT_RECORDED';
  const assertionDraftSource = checklist.C6?.passed === true || externalAssertion.asserted === true
    ? 'operator_assertion_or_handoff_not_yet_recorded'
    : 'not recorded';
  const assertionDraftContractVerdict = checklist.C6?.passed === true
    ? 'accepted'
    : externalAssertion.asserted === true
      ? 'rejected_or_insufficient'
      : 'insufficient';
  const issuanceDraftDecision = allowedGovernanceOutput === 'AUTO_REUSE_CM0601_LINE_ONLY'
    ? 'AUTO_REUSED_CM0601_LINE_ISSUED_NOT_EXECUTED'
    : 'AUTO_REUSED_CM0601_LINE_NOT_ISSUED';
  const routingDraftDecision = allowedGovernanceOutput === 'AUTO_REUSE_CM0601_LINE_ONLY'
    ? 'CM0605_ROUTED_AUTO_REUSE_CM0601_LINE_ONLY'
    : allowedGovernanceOutput === 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW'
      ? 'CM0605_ROUTED_ESCALATE_FOR_FUTURE_WIDENING_REVIEW'
      : 'CM0605_ROUTED_NO_AUTO_APPROVAL_ISSUED';

  return {
    cm0611AssertionRecord: {
      draftAvailable: true,
      draftUsableNow: checklist.C6?.passed !== true,
      templateRef: CM0611_ASSERTION_RECORD_TEMPLATE_REF,
      contractRef: CM0610_ASSERTION_CONTRACT_REF,
      status: assertionDraftStatus,
      decision: assertionDraftDecision,
      date: externalAssertion.assertedAt || '<fill>',
      assertionSource: assertionDraftSource,
      assertionClass: externalAssertion.assertionClass || '<fill>',
      assertedCurrentSessionOnly: externalAssertion.assertedCurrentSessionOnly === true,
      assertedIndependentOfPacket: externalAssertion.assertedIndependentOfPacket === true,
      assertedNoBindingRequested: externalAssertion.assertedNoBindingRequested === true,
      assertedNoPersistenceRequested: externalAssertion.assertedNoPersistenceRequested === true,
      assertedScopeStillCm0601Only: externalAssertion.assertedScopeStillCm0601Only === true,
      assertedNoStartupHealthWriteRecallRequested:
        externalAssertion.assertedNoStartupHealthWriteRecallRequested === true,
      assertedAt: externalAssertion.assertedAt || '<fill>',
      contractVerdict: assertionDraftContractVerdict,
      nextAllowedUse: checklist.C6?.passed === true
        ? 'support CM-0608/C6=yes only'
        : 'fill or refine CM-0611 record before CM-0610/CM-0608 review',
      unit: EXPECTED_UNIT,
      outOfScopeActionsExecuted: 'none'
    },
    cm0614Issuance: {
      draftAvailable: true,
      draftUsableNow: allowedGovernanceOutput === 'AUTO_REUSE_CM0601_LINE_ONLY',
      templateRef: CM0614_ISSUANCE_RECORD_TEMPLATE_REF,
      status: 'DRAFT_NOT_ISSUED',
      decision: issuanceDraftDecision,
      targetBaseline: EXPECTED_TARGET_BASELINE,
      issuanceRoute: 'CM-0602 -> CM-0608 -> CM-0601',
      checklistResult: checklistPassed ? 'pass' : 'fail_closed',
      checklistFailureIds: Object.entries(checklist)
        .filter(([, item]) => item?.passed !== true)
        .map(([id]) => id),
      checklistEvidenceSource: CM0608_PREFLIGHT_CHECKLIST_REF,
      externalAssertionRecordRef: CM0611_ASSERTION_RECORD_TEMPLATE_REF,
      assertionContractRef: CM0610_ASSERTION_CONTRACT_REF,
      assertionContractResult: checklist?.C6?.passed === true ? 'accepted' : 'not_accepted',
      issuedApprovalText: allowedGovernanceOutput === 'AUTO_REUSE_CM0601_LINE_ONLY'
        ? CM0601_EXACT_APPROVAL_LINE
        : 'not issued',
      issuedBy: allowedGovernanceOutput === 'AUTO_REUSE_CM0601_LINE_ONLY'
        ? 'auto-rule-preview-only'
        : 'not issued',
      executionStarted: false,
      outOfScopeActionsExecuted: 'none'
    },
    cm0615RoutingOutcome: {
      draftAvailable: true,
      draftUsableNow: allowedGovernanceOutput !== 'NO_AUTO_APPROVAL_ISSUED',
      templateRef: CM0615_ROUTING_OUTCOME_TEMPLATE_REF,
      status: 'DRAFT_ROUTING_NOT_RECORDED',
      decision: routingDraftDecision,
      targetBaseline: EXPECTED_TARGET_BASELINE,
      routingSource: CM0605_DECISION_TABLE_REF,
      routingOutcome: allowedGovernanceOutput,
      preRoutingEvidenceRefs: [
        CM0614_ISSUANCE_RECORD_TEMPLATE_REF,
        CM0609_EXECUTION_EVIDENCE_TEMPLATE_REF
      ],
      tokenPresenceResult: allowedGovernanceOutput === 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW'
        ? 'token_present'
        : 'token_missing_or_unaccepted',
      wideningGateSatisfied: 'not reviewed',
      wideningAdopted: false,
      nextBoundary: allowedGovernanceOutput === 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW'
        ? CM0604_WIDENING_GATE_REF
        : EXPECTED_OPERATOR_STATE,
      outOfScopeActionsExecuted: 'none'
    },
    cm0616WideningReview: {
      draftAvailable: true,
      draftUsableNow: allowedGovernanceOutput === 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW',
      templateRef: CM0616_WIDENING_REVIEW_OUTCOME_TEMPLATE_REF,
      status: 'DRAFT_REVIEW_NOT_RECORDED',
      decision: 'WIDENING_REVIEW_NOT_READY',
      targetBaseline: EXPECTED_TARGET_BASELINE,
      reviewSource: CM0604_WIDENING_GATE_REF,
      routingOutcomeRecordRef: CM0615_ROUTING_OUTCOME_TEMPLATE_REF,
      cm0604Satisfied: 'not_reviewed',
      cm0606BridgeActivated: false,
      proceedToCm0607AdoptionRecord: false,
      nextBoundary: CM0604_WIDENING_GATE_REF,
      outOfScopeActionsExecuted: 'none'
    }
  };
}

function formatYesNo(value) {
  return value === true ? 'yes' : 'no';
}

function buildAssertionInputTraceMarkdown(trace = null) {
  const summary = formatAssertionRecordInputTraceSummary(trace);
  const sourceFormat = normalizeString(trace?.sourceFormat) || 'none';
  const sourceFileName = normalizeString(trace?.sourceFileName) || 'none';
  const sourceWorkspaceRelativePath = normalizeString(trace?.sourceWorkspaceRelativePath) || 'none';
  const sourceArtifactRef = normalizeString(trace?.sourceArtifactRef) || 'none';
  const assertionAcceptedForC6 = formatYesNo(trace?.assertionAcceptedForC6 === true);

  return [
    '## Assertion Input Trace',
    '',
    `- summary: \`${summary}\``,
    `- source format: \`${sourceFormat}\``,
    `- source file: \`${sourceFileName}\``,
    `- source workspace-relative path: \`${sourceWorkspaceRelativePath}\``,
    `- source artifact ref: \`${sourceArtifactRef}\``,
    `- accepted for \`CM-0608/C6\`: \`${assertionAcceptedForC6}\``
  ].join('\n');
}

function buildCommandPreviewMarkdown(commandPreviewBundle = null) {
  if (!isPlainObject(commandPreviewBundle) || commandPreviewBundle.previewAvailable !== true) {
    return '';
  }

  const helperCommand = normalizeString(commandPreviewBundle.helperCommand) || 'none';
  const governanceReportCommand = normalizeString(commandPreviewBundle.governanceReportCommand) || 'none';
  const dashboardCommand = normalizeString(commandPreviewBundle.dashboardCommand) || 'none';
  const httpObserveCommand = normalizeString(commandPreviewBundle.httpObserveCommand) || 'none';
  const resolvedAssertionRecordPathMode =
    normalizeString(commandPreviewBundle.resolvedAssertionRecordPathMode) || 'placeholder_only';
  const resolvedAssertionRecordPath =
    normalizeString(commandPreviewBundle.resolvedAssertionRecordPath) || 'none';
  const resolvedLatestReboundOutcomeOverride =
    normalizeString(commandPreviewBundle.resolvedLatestReboundOutcomeOverride) || 'none';

  return [
    '## Command Preview',
    '',
    `- helper review command: \`${helperCommand}\``,
    `- governance-report command: \`${governanceReportCommand}\``,
    `- dashboard command: \`${dashboardCommand}\``,
    `- http-observe command: \`${httpObserveCommand}\``,
    `- resolved assertion record path mode: \`${resolvedAssertionRecordPathMode}\``,
    `- resolved assertion record path: \`${resolvedAssertionRecordPath}\``,
    `- resolved latest rebound outcome override: \`${resolvedLatestReboundOutcomeOverride}\``
  ].join('\n');
}

function appendCommandPreviewMarkdown(markdown = '', commandPreviewBundle = null) {
  const baseMarkdown = normalizeString(markdown);
  const commandPreviewMarkdown = buildCommandPreviewMarkdown(commandPreviewBundle);
  if (!commandPreviewMarkdown) {
    return baseMarkdown;
  }
  return [baseMarkdown, '', commandPreviewMarkdown].filter(Boolean).join('\n');
}

function renderCm0611AssertionRecordDraft(
  draft = {},
  { assertionRecordInputTrace = null, commandPreviewBundle = null } = {}
) {
  const markdown = [
    `Status: ${draft.status || '<fill>'}`,
    `Decision: ${draft.decision || '<fill>'}`,
    'Date: <fill>',
    `Assertion source: ${draft.assertionSource || '<fill>'}`,
    `assertionClass: ${draft.assertionClass || '<fill>'}`,
    `assertedCurrentSessionOnly: ${formatYesNo(draft.assertedCurrentSessionOnly)}`,
    `assertedIndependentOfPacket: ${formatYesNo(draft.assertedIndependentOfPacket)}`,
    `assertedNoBindingRequested: ${formatYesNo(draft.assertedNoBindingRequested)}`,
    `assertedNoPersistenceRequested: ${formatYesNo(draft.assertedNoPersistenceRequested)}`,
    `assertedScopeStillCm0601Only: ${formatYesNo(draft.assertedScopeStillCm0601Only)}`,
    `assertedNoStartupHealthWriteRecallRequested: ${formatYesNo(draft.assertedNoStartupHealthWriteRecallRequested)}`,
    `assertedAt: ${draft.assertedAt || '<fill>'}`,
    `Contract verdict: ${draft.contractVerdict || '<fill>'}`,
    `Next allowed use: ${draft.nextAllowedUse || '<fill>'}`,
    '',
    '## Assertion Summary',
    '',
    '- Claimed change: `token material independently entered the current session`',
    `- Intended next action still limited to \`CM-0601\`: \`${formatYesNo(draft.assertedScopeStillCm0601Only)}\``,
    '',
    '## CM-0610 Field Check',
    '',
    `- accepted assertion class: \`${draft.assertionClass || '<fill>'}\``,
    `- current-session-only meaning present: \`${formatYesNo(draft.assertedCurrentSessionOnly)}\``,
    `- independent-of-packet meaning present: \`${formatYesNo(draft.assertedIndependentOfPacket)}\``,
    `- no binding requested: \`${formatYesNo(draft.assertedNoBindingRequested)}\``,
    `- no persistence requested: \`${formatYesNo(draft.assertedNoPersistenceRequested)}\``,
    `- no widening to \`CM-0595\` or runtime mutation: \`${formatYesNo(draft.assertedScopeStillCm0601Only)}\``,
    '',
    '## Verdict',
    '',
    draft.contractVerdict === 'accepted'
      ? '- If accepted: this record may be used only to support `CM-0608/C6=yes`.'
      : '- If rejected or insufficient: keep `CM-0608/C6=no`.',
    '',
    buildAssertionInputTraceMarkdown(assertionRecordInputTrace),
    '',
    '## Still Forbidden',
    '',
    '- no token binding',
    '- no token print',
    '- no token persistence',
    '- no `start:http:ensure`',
    '- no `/health` probe',
    '- no `record_memory`',
    '- no `search_memory`',
    '- no marker search',
    '- no `.jsonl` read',
    '- no provider call',
    '- no config or `.env` edit',
    '- no watchdog/startup persistence',
    '- no public MCP expansion',
    '- no durable write',
    '- no readiness claim'
  ].join('\n');

  return appendCommandPreviewMarkdown(markdown, commandPreviewBundle);
}

function renderCm0614IssuanceDraft(
  draft = {},
  { assertionRecordInputTrace = null, commandPreviewBundle = null } = {}
) {
  const failureIds = normalizeStringArray(draft.checklistFailureIds);
  const markdown = [
    `Status: ${draft.status || '<fill>'}`,
    `Decision: ${draft.decision || '<fill>'}`,
    'Date: <fill>',
    `Target baseline: ${draft.targetBaseline || '<fill>'}`,
    `Issuance route: ${draft.issuanceRoute || '<fill>'}`,
    `Checklist result: ${draft.checklistResult || '<fill>'}`,
    `Checklist evidence source: ${draft.checklistEvidenceSource || '<fill>'}`,
    `External assertion record: ${draft.externalAssertionRecordRef || '<fill>'}`,
    `Assertion contract result: ${draft.assertionContractResult || '<fill>'}`,
    `Issued approval text: ${draft.issuedApprovalText || '<fill>'}`,
    `Issued by: ${draft.issuedBy || '<fill>'}`,
    `Execution started: ${formatYesNo(draft.executionStarted)}`,
    `Out-of-scope actions executed: ${draft.outOfScopeActionsExecuted || 'none'}`,
    '',
    '## Pre-issuance snapshot',
    '',
    `- \`${EXPECTED_CONTROLLING_MAP}\` remained the controlling map.`,
    `- Operator-facing state remained \`${EXPECTED_OPERATOR_STATE}\`.`,
    `- Same-baseline endpoint/startup evidence still pointed to \`${EXPECTED_ENDPOINT_STARTUP_EVIDENCE_ID}\`.`,
    '- Latest controlling rebound evidence before issuance was `<fill prior rebound record>`.',
    '',
    '## Checklist pass record',
    '',
    `- \`CM-0608\` result: \`${draft.checklistResult || '<fill>'}\`${failureIds.length > 0 ? ` (failures: ${failureIds.join(', ')})` : ''}`,
    `- \`CM-0610\` assertion contract result: \`${draft.assertionContractResult || '<fill>'}\``,
    `- external assertion record: \`${draft.externalAssertionRecordRef || '<fill>'}\``,
    '- governance outcome class before issuance: `AUTO_REUSE_CM0601_LINE_ONLY`',
    '',
    '## Issued approval text',
    '',
    draft.issuedApprovalText || 'not issued',
    '',
    buildAssertionInputTraceMarkdown(assertionRecordInputTrace),
    '',
    '## Execution boundary after issuance',
    '',
    '- Issuance alone did not start `CM-0601` execution.',
    `- A later execution record, if any, must use \`${CM0609_EXECUTION_EVIDENCE_TEMPLATE_REF}\`.`,
    '',
    '## Forbidden actions not run',
    '',
    '- no `record_memory`',
    '- no `search_memory`',
    '- no marker search',
    '- no token binding',
    '- no `start:http:ensure`',
    '- no `/health` probe',
    '- no `observe:http`',
    '- no `.jsonl` read',
    '- no provider call',
    '- no config or `.env` edit',
    '- no watchdog/startup persistence change',
    '- no public MCP expansion',
    '- no durable write',
    '- no readiness claim',
    '',
    '## Result and next boundary',
    '',
    `- Current result: \`${draft.decision || '<fill>'}\``,
    `- If no issuance happened, keep \`${EXPECTED_OPERATOR_STATE}\`.`,
    `- If issuance happened, keep \`${EXPECTED_OPERATOR_STATE}\` until a later execution record exists.`,
    '- Even after issuance, `CM-0595` remains out of scope unless later routed through `CM-0605` and future widening governance.'
  ].join('\n');

  return appendCommandPreviewMarkdown(markdown, commandPreviewBundle);
}

function renderCm0615RoutingOutcomeDraft(
  draft = {},
  { assertionRecordInputTrace = null, commandPreviewBundle = null } = {}
) {
  const markdown = [
    `Status: ${draft.status || '<fill>'}`,
    `Decision: ${draft.decision || '<fill>'}`,
    'Date: <fill>',
    `Target baseline: ${draft.targetBaseline || '<fill>'}`,
    `Routing source: ${draft.routingSource || '<fill>'}`,
    'Routing case: <fill case number from CM-0605>',
    `Routing outcome: ${draft.routingOutcome || '<fill>'}`,
    `Pre-routing evidence: ${(draft.preRoutingEvidenceRefs || []).join(', ') || '<fill>'}`,
    `Token presence result: ${draft.tokenPresenceResult || '<fill>'}`,
    `Widening gate satisfied: ${draft.wideningGateSatisfied || '<fill>'}`,
    `Widening adopted: ${formatYesNo(draft.wideningAdopted)}`,
    `Next boundary: ${draft.nextBoundary || '<fill>'}`,
    `Out-of-scope actions executed: ${draft.outOfScopeActionsExecuted || 'none'}`,
    '',
    '## Routing snapshot',
    '',
    `- \`${EXPECTED_CONTROLLING_MAP}\` remained the controlling map.`,
    `- Operator-facing state remained \`${EXPECTED_OPERATOR_STATE}\`.`,
    `- Routing used \`${CM0605_DECISION_TABLE_REF}\`.`,
    '- Latest rebound chain evidence before routing was `<fill>`.',
    '',
    '## Decision-table case record',
    '',
    '- `CM-0605` case selected: `<fill>`',
    '- token assertion state: `<fill>`',
    `- token presence state: \`${draft.tokenPresenceResult || '<fill>'}\``,
    `- widening gate state: \`${draft.wideningGateSatisfied || '<fill>'}\``,
    `- widening adoption state: \`${formatYesNo(draft.wideningAdopted)}\``,
    '',
    '## Routing outcome',
    '',
    `- \`CM-0605\` outcome: \`${draft.routingOutcome || '<fill>'}\``,
    '- If outcome is `NO_AUTO_APPROVAL_ISSUED`, the chain stays blocked.',
    '- If outcome is `AUTO_REUSE_CM0601_LINE_ONLY`, the chain still remains at the rebound-only ceiling.',
    '- If outcome is `ESCALATE_FOR_FUTURE_WIDENING_REVIEW`, the chain may discuss `CM-0604` / `CM-0606` / `CM-0607`, but not jump to `CM-0595`.',
    '',
    buildAssertionInputTraceMarkdown(assertionRecordInputTrace),
    '',
    '## Blocked or escalated next boundary',
    '',
    `- blocked path: remain \`${EXPECTED_OPERATOR_STATE}\``,
    '- escalated path: use `CM-0604`, `CM-0606`, and `CM-0607`',
    '',
    '## Forbidden actions not run',
    '',
    '- no `record_memory`',
    '- no `search_memory`',
    '- no marker search',
    '- no token binding',
    '- no `start:http:ensure`',
    '- no `/health` probe',
    '- no `observe:http`',
    '- no `.jsonl` read',
    '- no provider call',
    '- no config or `.env` edit',
    '- no watchdog/startup persistence change',
    '- no public MCP expansion',
    '- no durable write',
    '- no readiness claim',
    '',
    '## Result and controlling state',
    '',
    `- Current result: \`${draft.decision || '<fill>'}\``,
    `- Controlling state: \`${EXPECTED_OPERATOR_STATE}\``,
    '- `CM-0595` remains out of scope unless later governance explicitly widens to it.'
  ].join('\n');

  return appendCommandPreviewMarkdown(markdown, commandPreviewBundle);
}

function renderCm0616WideningReviewDraft(
  draft = {},
  { assertionRecordInputTrace = null, commandPreviewBundle = null } = {}
) {
  const markdown = [
    `Status: ${draft.status || '<fill>'}`,
    `Decision: ${draft.decision || '<fill>'}`,
    'Date: <fill>',
    `Target baseline: ${draft.targetBaseline || '<fill>'}`,
    `Review source: ${draft.reviewSource || '<fill>'}`,
    `Routing outcome record: ${draft.routingOutcomeRecordRef || '<fill>'}`,
    `CM-0604 satisfied: ${draft.cm0604Satisfied || '<fill>'}`,
    `CM-0606 bridge activated: ${formatYesNo(draft.cm0606BridgeActivated)}`,
    `Proceed to CM-0607 adoption record: ${formatYesNo(draft.proceedToCm0607AdoptionRecord)}`,
    `Next boundary: ${draft.nextBoundary || '<fill>'}`,
    `Out-of-scope actions executed: ${draft.outOfScopeActionsExecuted || 'none'}`,
    '',
    '## Review snapshot',
    '',
    `- \`${EXPECTED_CONTROLLING_MAP}\` remained the controlling map.`,
    `- Operator-facing state remained \`${EXPECTED_OPERATOR_STATE}\`.`,
    '- Widening review was entered only after a prior `CM-0615` routed outcome of `ESCALATE_FOR_FUTURE_WIDENING_REVIEW`.',
    '',
    '## CM-0604 gate review',
    '',
    `- \`CM-0604\` satisfied: \`${draft.cm0604Satisfied || '<fill>'}\``,
    '- justification: `<fill>`',
    '- same-baseline token-present evidence referenced: `<fill>`',
    `- same-baseline endpoint/startup evidence referenced: \`${EXPECTED_ENDPOINT_STARTUP_EVIDENCE_ID}\``,
    '',
    '## CM-0606 bridge state',
    '',
    `- \`CM-0606\` bridge activated: \`${formatYesNo(draft.cm0606BridgeActivated)}\``,
    '- if not activated, widening adoption remains not granted',
    '- if activated, a later `CM-0607` adoption record may be considered',
    '',
    buildAssertionInputTraceMarkdown(assertionRecordInputTrace),
    '',
    '## Review outcome',
    '',
    `- review outcome: \`${draft.decision || '<fill>'}\``,
    '- if `WIDENING_REVIEW_NOT_READY`, stay blocked and do not open `CM-0607`',
    '- if `WIDENING_REVIEW_PASSED_ADOPTION_NOT_GRANTED`, stay blocked and do not widen',
    '- if `WIDENING_REVIEW_PASSED_PROCEED_TO_CM0607`, only the adoption-record stage may proceed next',
    '',
    '## Forbidden actions not run',
    '',
    '- no `record_memory`',
    '- no `search_memory`',
    '- no marker search',
    '- no second write',
    '- no token binding',
    '- no `start:http:ensure`',
    '- no `/health` probe',
    '- no `observe:http`',
    '- no `.jsonl` read',
    '- no provider call',
    '- no config or `.env` edit',
    '- no watchdog/startup persistence change',
    '- no public MCP expansion',
    '- no durable write',
    '- no readiness claim',
    '',
    '## Result and next boundary',
    '',
    `- Current result: \`${draft.decision || '<fill>'}\``,
    `- Controlling state: \`${EXPECTED_OPERATOR_STATE}\``,
    '- `CM-0595` remains out of scope unless a later explicit `CM-0607` adoption record grants widening.'
  ].join('\n');

  return appendCommandPreviewMarkdown(markdown, commandPreviewBundle);
}

function buildRenderedArtifactTextSurface({
  assertionRecordInputTrace = null,
  allowedGovernanceOutput = 'NO_AUTO_APPROVAL_ISSUED',
  recordDrafts = null,
  operatorActionPlan = null,
  commandPreviewBundle = null
} = {}) {
  const safeDrafts = isPlainObject(recordDrafts) ? recordDrafts : {};
  const drafts = {
    cm0611AssertionRecord: {
      templateRef: CM0611_ASSERTION_RECORD_TEMPLATE_REF,
      draftAvailable: safeDrafts.cm0611AssertionRecord?.draftAvailable === true,
      draftUsableNow: safeDrafts.cm0611AssertionRecord?.draftUsableNow === true,
      markdown: renderCm0611AssertionRecordDraft(
        safeDrafts.cm0611AssertionRecord || {},
        { assertionRecordInputTrace, commandPreviewBundle }
      )
    },
    cm0614Issuance: {
      templateRef: CM0614_ISSUANCE_RECORD_TEMPLATE_REF,
      draftAvailable: safeDrafts.cm0614Issuance?.draftAvailable === true,
      draftUsableNow: safeDrafts.cm0614Issuance?.draftUsableNow === true,
      markdown: renderCm0614IssuanceDraft(
        safeDrafts.cm0614Issuance || {},
        { assertionRecordInputTrace, commandPreviewBundle }
      )
    },
    cm0615RoutingOutcome: {
      templateRef: CM0615_ROUTING_OUTCOME_TEMPLATE_REF,
      draftAvailable: safeDrafts.cm0615RoutingOutcome?.draftAvailable === true,
      draftUsableNow: safeDrafts.cm0615RoutingOutcome?.draftUsableNow === true,
      markdown: renderCm0615RoutingOutcomeDraft(
        safeDrafts.cm0615RoutingOutcome || {},
        { assertionRecordInputTrace, commandPreviewBundle }
      )
    },
    cm0616WideningReview: {
      templateRef: CM0616_WIDENING_REVIEW_OUTCOME_TEMPLATE_REF,
      draftAvailable: safeDrafts.cm0616WideningReview?.draftAvailable === true,
      draftUsableNow: safeDrafts.cm0616WideningReview?.draftUsableNow === true,
      markdown: renderCm0616WideningReviewDraft(
        safeDrafts.cm0616WideningReview || {},
        { assertionRecordInputTrace, commandPreviewBundle }
      )
    }
  };

  let selectedDraftId = 'cm0611AssertionRecord';
  if (allowedGovernanceOutput === 'AUTO_REUSE_CM0601_LINE_ONLY') {
    selectedDraftId = 'cm0614Issuance';
  } else if (allowedGovernanceOutput === 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW') {
    selectedDraftId = 'cm0616WideningReview';
  } else if (operatorActionPlan?.currentStage === 'await_cm0610_contract_acceptance') {
    selectedDraftId = 'cm0611AssertionRecord';
  }

  const selected = drafts[selectedDraftId];
  return {
    previewAvailable: true,
    previewUsableNow: selected?.draftUsableNow === true,
    currentStage: operatorActionPlan?.currentStage || 'keep_rc_not_ready_blocked',
    selectedDraftId,
    selectedTemplateRef: selected?.templateRef || '',
    selectedDraftUsableNow: selected?.draftUsableNow === true,
    selectedDraftMarkdown: selected?.markdown || '',
    textDrafts: drafts
  };
}

function formatAssertionRecordInputTraceSummary(trace = null) {
  if (!isPlainObject(trace) || trace.traceAvailable !== true) {
    return 'default_fixture_only';
  }
  const sourceFormat = normalizeString(trace.sourceFormat) || 'unknown';
  const sourceFileName = normalizeString(trace.sourceFileName) || 'unknown';
  const assertionAcceptedForC6 = trace.assertionAcceptedForC6 === true ? 'yes' : 'no';
  return `${sourceFormat}:${sourceFileName}:c6Accepted=${assertionAcceptedForC6}`;
}

function resolveCommandPreviewValue(command = '', assertionRecordInputTrace = null) {
  const normalizedCommand = normalizeString(command);
  if (!normalizedCommand) {
    return '';
  }
  const workspaceRelativePath = normalizeString(assertionRecordInputTrace?.sourceWorkspaceRelativePath);
  if (!workspaceRelativePath) {
    return normalizedCommand;
  }
  return normalizedCommand.replaceAll(ASSERTION_RECORD_PATH_PLACEHOLDER, workspaceRelativePath);
}

function appendLatestReboundOutcomeOverride(command = '', assertionRecordInputTrace = null) {
  const normalizedCommand = normalizeString(command);
  if (!normalizedCommand) {
    return '';
  }
  const latestReboundOutcomeOverride = normalizeString(
    assertionRecordInputTrace?.usedLatestReboundOutcomeOverride === true
      ? assertionRecordInputTrace?.latestReboundOutcomeOverride
      : ''
  );
  if (!latestReboundOutcomeOverride) {
    return normalizedCommand;
  }
  return `${normalizedCommand} --auto-auth-latest-rebound-outcome-class ${latestReboundOutcomeOverride}`;
}

function buildArtifactBundleDraft({
  assertionRecordInputTrace = null,
  assertionRecordPreview = null,
  allowedGovernanceOutput = 'NO_AUTO_APPROVAL_ISSUED',
  approvalLinePreview = null,
  issuanceRecordPreview = null,
  routingOutcomePreview = null,
  wideningReviewPreview = null,
  recordDrafts = null,
  renderedArtifactTextSurface = null,
  operatorActionPlan = null
} = {}) {
  const currentStage = operatorActionPlan?.currentStage || 'keep_rc_not_ready_blocked';
  const currentStageReason = operatorActionPlan?.currentStageReason || 'The current chain remains fail-closed.';
  const nextStepRef = operatorActionPlan?.nextStepRef || '';
  const nextStepRefs = cloneArray(operatorActionPlan?.nextStepRefs);
  const orderedSequenceRefs = cloneArray(operatorActionPlan?.orderedSequenceRefs);
  const wideningPathRefs = cloneArray(operatorActionPlan?.wideningPathRefs);

  let bundleKind = 'fail_closed_sequence_only';
  let bundleUsableNow = false;
  let selectedArtifacts = {
    assertionRecordTemplateRef: CM0611_ASSERTION_RECORD_TEMPLATE_REF,
    assertionContractRef: CM0610_ASSERTION_CONTRACT_REF,
    operatorSequenceRef: CM0612_OPERATOR_SEQUENCE_REF
  };

  if (currentStage === 'await_cm0611_assertion_record') {
    bundleKind = 'assertion_record_only';
    bundleUsableNow = true;
    selectedArtifacts = {
      assertionRecordInputTrace,
      assertionRecordPreview,
      assertionRecordDraft: recordDrafts?.cm0611AssertionRecord || null,
      renderedAssertionRecordDraft: renderedArtifactTextSurface?.textDrafts?.cm0611AssertionRecord || null,
      assertionRecordTemplateRef: CM0611_ASSERTION_RECORD_TEMPLATE_REF,
      assertionContractRef: CM0610_ASSERTION_CONTRACT_REF,
      nextStepRef
    };
  } else if (currentStage === 'await_cm0610_contract_acceptance') {
    bundleKind = 'assertion_contract_only';
    bundleUsableNow = true;
    selectedArtifacts = {
      assertionRecordInputTrace,
      assertionRecordPreview,
      assertionRecordDraft: recordDrafts?.cm0611AssertionRecord || null,
      renderedAssertionRecordDraft: renderedArtifactTextSurface?.textDrafts?.cm0611AssertionRecord || null,
      assertionRecordTemplateRef: CM0611_ASSERTION_RECORD_TEMPLATE_REF,
      assertionContractRef: CM0610_ASSERTION_CONTRACT_REF,
      nextStepRef
    };
  } else if (allowedGovernanceOutput === 'AUTO_REUSE_CM0601_LINE_ONLY') {
    bundleKind = 'cm0601_reuse_ready_bundle';
    bundleUsableNow = true;
    selectedArtifacts = {
      assertionRecordInputTrace,
      approvalLinePreview,
      issuanceRecordPreview,
      issuanceRecordDraft: recordDrafts?.cm0614Issuance || null,
      renderedIssuanceRecordDraft: renderedArtifactTextSurface?.textDrafts?.cm0614Issuance || null,
      executionEvidenceTemplateRef: CM0609_EXECUTION_EVIDENCE_TEMPLATE_REF,
      routingOutcomePreview,
      routingOutcomeDraft: recordDrafts?.cm0615RoutingOutcome || null,
      renderedRoutingOutcomeDraft: renderedArtifactTextSurface?.textDrafts?.cm0615RoutingOutcome || null
    };
  } else if (allowedGovernanceOutput === 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW') {
    bundleKind = 'widening_review_ready_bundle';
    bundleUsableNow = true;
    selectedArtifacts = {
      assertionRecordInputTrace,
      routingOutcomePreview,
      routingOutcomeDraft: recordDrafts?.cm0615RoutingOutcome || null,
      renderedRoutingOutcomeDraft: renderedArtifactTextSurface?.textDrafts?.cm0615RoutingOutcome || null,
      wideningReviewPreview,
      wideningReviewDraft: recordDrafts?.cm0616WideningReview || null,
      renderedWideningReviewDraft: renderedArtifactTextSurface?.textDrafts?.cm0616WideningReview || null,
      wideningGateRef: CM0604_WIDENING_GATE_REF,
      wideningAdoptionBridgeRef: CM0606_WIDENING_ADOPTION_BRIDGE_REF,
      wideningAdoptionRecordTemplateRef: CM0607_WIDENING_ADOPTION_RECORD_TEMPLATE_REF,
      futureWriteBoundaryRef: CM0595_FUTURE_WRITE_BOUNDARY_REF
    };
  }

  return {
    bundleAvailable: true,
    bundleUsableNow,
    bundleMode: 'governance_only_read_only',
    bundleKind,
    currentStage,
    currentStageReason,
    nextStepRef,
    nextStepRefs,
    orderedSequenceRefs,
    wideningPathRefs,
    selectedArtifacts
  };
}

function buildCommandPreviewBundle({
  assertionRecordInputTrace = null,
  allowedGovernanceOutput = 'NO_AUTO_APPROVAL_ISSUED',
  operatorActionPlan = null
} = {}) {
  const currentStage = operatorActionPlan?.currentStage || 'keep_rc_not_ready_blocked';
  const nextStepRef = operatorActionPlan?.nextStepRef || '';
  const nextStepRefs = cloneArray(operatorActionPlan?.nextStepRefs);
  const orderedSequenceRefs = cloneArray(operatorActionPlan?.orderedSequenceRefs);
  const wideningPathRefs = cloneArray(operatorActionPlan?.wideningPathRefs);

  let bundleKind = 'fail_closed_command_bundle';
  let primaryCommandId = 'helper_assertion_record_review';
  let primaryCommand = HELPER_ASSERTION_REVIEW_COMMAND;
  let previewUsableNow = true;

  if (currentStage === 'await_cm0611_assertion_record') {
    bundleKind = 'assertion_record_command_bundle';
  } else if (currentStage === 'await_cm0610_contract_acceptance') {
    bundleKind = 'assertion_contract_command_bundle';
  } else if (allowedGovernanceOutput === 'AUTO_REUSE_CM0601_LINE_ONLY') {
    bundleKind = 'cm0601_reuse_review_command_bundle';
    primaryCommandId = 'governance_report_assertion_record_review';
    primaryCommand = GOVERNANCE_REPORT_ASSERTION_REVIEW_COMMAND;
  } else if (allowedGovernanceOutput === 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW') {
    bundleKind = 'widening_review_review_command_bundle';
    primaryCommandId = 'governance_report_assertion_record_review';
    primaryCommand = GOVERNANCE_REPORT_ASSERTION_REVIEW_COMMAND;
  } else if (currentStage === 'keep_rc_not_ready_blocked') {
    previewUsableNow = false;
  }

  const resolvedAssertionRecordPath = normalizeString(assertionRecordInputTrace?.sourceWorkspaceRelativePath);
  const resolvedAssertionRecordPathMode = resolvedAssertionRecordPath
    ? 'workspace_relative'
    : 'placeholder_only';
  const resolvedLatestReboundOutcomeOverride = normalizeString(
    assertionRecordInputTrace?.usedLatestReboundOutcomeOverride === true
      ? assertionRecordInputTrace?.latestReboundOutcomeOverride
      : ''
  );
  const helperCommand = appendLatestReboundOutcomeOverride(resolveCommandPreviewValue(
    HELPER_ASSERTION_REVIEW_COMMAND,
    assertionRecordInputTrace
  ), assertionRecordInputTrace);
  const governanceReportCommand = appendLatestReboundOutcomeOverride(resolveCommandPreviewValue(
    GOVERNANCE_REPORT_ASSERTION_REVIEW_COMMAND,
    assertionRecordInputTrace
  ), assertionRecordInputTrace);
  const dashboardCommand = appendLatestReboundOutcomeOverride(resolveCommandPreviewValue(
    DASHBOARD_ASSERTION_REVIEW_COMMAND,
    assertionRecordInputTrace
  ), assertionRecordInputTrace);
  const httpObserveCommand = appendLatestReboundOutcomeOverride(resolveCommandPreviewValue(
    HTTP_OBSERVE_ASSERTION_REVIEW_COMMAND,
    assertionRecordInputTrace
  ), assertionRecordInputTrace);
  const resolvedPrimaryCommand = appendLatestReboundOutcomeOverride(resolveCommandPreviewValue(
    primaryCommand,
    assertionRecordInputTrace
  ), assertionRecordInputTrace);

  return {
    previewAvailable: true,
    previewUsableNow,
    bundleKind,
    primaryCommandId,
    primaryCommand: resolvedPrimaryCommand,
    assertionRecordPathPlaceholder: ASSERTION_RECORD_PATH_PLACEHOLDER,
    resolvedAssertionRecordPathMode,
    resolvedAssertionRecordPath,
    resolvedLatestReboundOutcomeOverride,
    helperCommand,
    governanceReportCommand,
    dashboardCommand,
    httpObserveCommand,
    nextStepRef,
    nextStepRefs,
    orderedSequenceRefs,
    wideningPathRefs
  };
}

function buildOperatorPacketDraft({
  assertionRecordInputTrace = null,
  assertionRecordPreview = null,
  allowedGovernanceOutput = 'NO_AUTO_APPROVAL_ISSUED',
  artifactBundleDraft = null,
  commandPreviewBundle = null,
  approvalLinePreview = null,
  issuanceRecordPreview = null,
  routingOutcomePreview = null,
  wideningReviewPreview = null,
  recordDrafts = null,
  renderedArtifactTextSurface = null,
  operatorActionPlan = null
} = {}) {
  const currentStage = operatorActionPlan?.currentStage || 'keep_rc_not_ready_blocked';
  const currentStageReason = operatorActionPlan?.currentStageReason || 'The current chain remains fail-closed.';
  const nextStepRef = operatorActionPlan?.nextStepRef || '';
  const nextStepRefs = cloneArray(operatorActionPlan?.nextStepRefs);
  const orderedSequenceRefs = cloneArray(operatorActionPlan?.orderedSequenceRefs);
  const wideningPathRefs = cloneArray(operatorActionPlan?.wideningPathRefs);

  let packetKind = 'fail_closed_operator_packet';
  let packetUsableNow = false;
  let selectedPayload = {
    artifactBundleDraft,
    commandPreviewBundle,
    operatorSequenceRef: CM0612_OPERATOR_SEQUENCE_REF
  };

  if (currentStage === 'await_cm0611_assertion_record') {
    packetKind = 'assertion_record_operator_packet';
    packetUsableNow = true;
    selectedPayload = {
      artifactBundleDraft,
      commandPreviewBundle,
      assertionRecordInputTrace,
      assertionRecordPreview,
      assertionRecordDraft: recordDrafts?.cm0611AssertionRecord || null,
      renderedAssertionRecordDraft: renderedArtifactTextSurface?.textDrafts?.cm0611AssertionRecord || null,
      assertionRecordTemplateRef: CM0611_ASSERTION_RECORD_TEMPLATE_REF,
      assertionContractRef: CM0610_ASSERTION_CONTRACT_REF,
      nextStepRef
    };
  } else if (currentStage === 'await_cm0610_contract_acceptance') {
    packetKind = 'assertion_contract_operator_packet';
    packetUsableNow = true;
    selectedPayload = {
      artifactBundleDraft,
      commandPreviewBundle,
      assertionRecordInputTrace,
      assertionRecordPreview,
      assertionRecordDraft: recordDrafts?.cm0611AssertionRecord || null,
      renderedAssertionRecordDraft: renderedArtifactTextSurface?.textDrafts?.cm0611AssertionRecord || null,
      assertionRecordTemplateRef: CM0611_ASSERTION_RECORD_TEMPLATE_REF,
      assertionContractRef: CM0610_ASSERTION_CONTRACT_REF,
      nextStepRef
    };
  } else if (allowedGovernanceOutput === 'AUTO_REUSE_CM0601_LINE_ONLY') {
    packetKind = 'cm0601_reuse_operator_packet';
    packetUsableNow = true;
    selectedPayload = {
      artifactBundleDraft,
      commandPreviewBundle,
      assertionRecordInputTrace,
      approvalLinePreview,
      issuanceRecordPreview,
      routingOutcomePreview,
      issuanceRecordDraft: recordDrafts?.cm0614Issuance || null,
      routingOutcomeDraft: recordDrafts?.cm0615RoutingOutcome || null,
      renderedIssuanceRecordDraft: renderedArtifactTextSurface?.textDrafts?.cm0614Issuance || null,
      renderedRoutingOutcomeDraft: renderedArtifactTextSurface?.textDrafts?.cm0615RoutingOutcome || null
    };
  } else if (allowedGovernanceOutput === 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW') {
    packetKind = 'widening_review_operator_packet';
    packetUsableNow = true;
    selectedPayload = {
      artifactBundleDraft,
      commandPreviewBundle,
      assertionRecordInputTrace,
      routingOutcomePreview,
      wideningReviewPreview,
      routingOutcomeDraft: recordDrafts?.cm0615RoutingOutcome || null,
      wideningReviewDraft: recordDrafts?.cm0616WideningReview || null,
      renderedRoutingOutcomeDraft: renderedArtifactTextSurface?.textDrafts?.cm0615RoutingOutcome || null,
      renderedWideningReviewDraft: renderedArtifactTextSurface?.textDrafts?.cm0616WideningReview || null,
      futureWriteBoundaryRef: CM0595_FUTURE_WRITE_BOUNDARY_REF
    };
  }

  return {
    packetAvailable: true,
    packetUsableNow,
    packetMode: 'governance_only_read_only',
    packetKind,
    currentStage,
    currentStageReason,
    allowedGovernanceOutput,
    decision: EXPECTED_OPERATOR_STATE,
    nextStepRef,
    nextStepRefs,
    orderedSequenceRefs,
    wideningPathRefs,
    selectedPayload
  };
}

function buildRenderedOperatorPacketTextSurface({
  assertionRecordInputTrace = null,
  allowedGovernanceOutput = 'NO_AUTO_APPROVAL_ISSUED',
  approvalLinePreview = null,
  commandPreviewBundle = null,
  operatorPacketDraft = null,
  renderedArtifactTextSurface = null,
  operatorActionPlan = null
} = {}) {
  const currentStage = operatorActionPlan?.currentStage || 'keep_rc_not_ready_blocked';
  const currentStageReason = operatorActionPlan?.currentStageReason || 'The current chain remains fail-closed.';
  const nextStepRef = operatorActionPlan?.nextStepRef || 'none';
  const selectedDraftId = renderedArtifactTextSurface?.selectedDraftId || 'unknown';
  const selectedDraftMarkdown = renderedArtifactTextSurface?.selectedDraftMarkdown || 'not available';
  const packetKind = operatorPacketDraft?.packetKind || 'unknown';
  const packetUsableNow = operatorPacketDraft?.packetUsableNow === true;
  const primaryCommand = commandPreviewBundle?.primaryCommand || 'none';
  const primaryCommandId = commandPreviewBundle?.primaryCommandId || 'none';
  const helperCommand = commandPreviewBundle?.helperCommand || HELPER_ASSERTION_REVIEW_COMMAND;
  const governanceReportCommand =
    commandPreviewBundle?.governanceReportCommand || GOVERNANCE_REPORT_ASSERTION_REVIEW_COMMAND;
  const dashboardCommand =
    commandPreviewBundle?.dashboardCommand || DASHBOARD_ASSERTION_REVIEW_COMMAND;
  const httpObserveCommand =
    commandPreviewBundle?.httpObserveCommand || HTTP_OBSERVE_ASSERTION_REVIEW_COMMAND;
  const resolvedAssertionRecordPathMode =
    commandPreviewBundle?.resolvedAssertionRecordPathMode || 'placeholder_only';
  const resolvedAssertionRecordPath =
    normalizeString(commandPreviewBundle?.resolvedAssertionRecordPath) || 'none';
  const resolvedLatestReboundOutcomeOverride =
    normalizeString(commandPreviewBundle?.resolvedLatestReboundOutcomeOverride) || 'none';
  const inputTraceSummary = formatAssertionRecordInputTraceSummary(assertionRecordInputTrace);
  const exactApprovalLine = normalizeString(approvalLinePreview?.exactApprovalLine) || 'not available';
  const wideningPathRefs = normalizeStringArray(operatorActionPlan?.wideningPathRefs);

  const lines = [
    `Status: ${EXPECTED_OPERATOR_STATE}`,
    `Packet kind: ${packetKind}`,
    `Allowed governance output: ${allowedGovernanceOutput}`,
    `Packet usable now: ${formatYesNo(packetUsableNow)}`,
    `Current stage: ${currentStage}`,
    `Current stage reason: ${currentStageReason}`,
    `Next step ref: ${nextStepRef}`,
    `Primary command id: ${primaryCommandId}`,
    `Primary command: ${primaryCommand}`,
    `Resolved assertion record path mode: ${resolvedAssertionRecordPathMode}`,
    `Resolved assertion record path: ${resolvedAssertionRecordPath}`,
    `Resolved latest rebound outcome override: ${resolvedLatestReboundOutcomeOverride}`,
    `Assertion input trace: ${inputTraceSummary}`,
    `Selected draft id: ${selectedDraftId}`,
    '',
    '## Current Packet Summary',
    '',
    `- controlling map: \`${EXPECTED_CONTROLLING_MAP}\``,
    `- operator-facing state: \`${EXPECTED_OPERATOR_STATE}\``,
    `- allowed governance output: \`${allowedGovernanceOutput}\``,
    `- current stage: \`${currentStage}\``,
    `- next step ref: \`${nextStepRef}\``,
    '',
    '## Command Preview',
    '',
    `- resolved assertion record path mode: \`${resolvedAssertionRecordPathMode}\``,
    `- resolved assertion record path: \`${resolvedAssertionRecordPath}\``,
    `- resolved latest rebound outcome override: \`${resolvedLatestReboundOutcomeOverride}\``,
    `- helper review command: \`${helperCommand}\``,
    `- governance-report command: \`${governanceReportCommand}\``,
    `- dashboard command: \`${dashboardCommand}\``,
    `- http-observe command: \`${httpObserveCommand}\``,
    '',
    '## Selected Draft',
    '',
    selectedDraftMarkdown,
    '',
    '## Exact Approval Line Preview',
    '',
    `- preview usable now: \`${formatYesNo(approvalLinePreview?.previewUsableNow === true)}\``,
    `- source ref: \`${approvalLinePreview?.sourceRef || CM0601_APPROVAL_LINE_SOURCE_REF}\``,
    '',
    exactApprovalLine,
    '',
    '## Widening Path Refs',
    '',
    wideningPathRefs.length > 0
      ? wideningPathRefs.map(ref => `- \`${ref}\``).join('\n')
      : '- none',
    '',
    '## Safety Boundary',
    '',
    '- no `record_memory`',
    '- no `search_memory`',
    '- no marker search',
    '- no token binding',
    '- no `start:http:ensure`',
    '- no `/health` probe',
    '- no `observe:http`',
    '- no `.jsonl` read',
    '- no provider call',
    '- no config or `.env` edit',
    '- no watchdog/startup persistence',
    '- no public MCP expansion',
    '- no durable write',
    '- no readiness claim'
  ];

  return {
    previewAvailable: true,
    previewUsableNow: packetUsableNow,
    packetKind,
    currentStage,
    nextStepRef,
    selectedDraftId,
    assertionInputTraceSummary: inputTraceSummary,
    markdown: lines.join('\n')
  };
}

function buildRenderedOperatorBriefTextSurface({
  artifactBundleDraft = null,
  commandPreviewBundle = null,
  operatorPacketDraft = null,
  renderedArtifactTextSurface = null,
  renderedOperatorPacketTextSurface = null,
  operatorActionPlan = null,
  assertionRecordInputTrace = null
} = {}) {
  const bundleKind = normalizeString(artifactBundleDraft?.bundleKind) || 'unknown';
  const packetKind = normalizeString(operatorPacketDraft?.packetKind) || 'unknown';
  const currentStage = normalizeString(operatorActionPlan?.currentStage) || 'keep_rc_not_ready_blocked';
  const nextStepRef = normalizeString(operatorActionPlan?.nextStepRef) || 'none';
  const selectedDraftId = normalizeString(renderedArtifactTextSurface?.selectedDraftId) || 'unknown';
  const primaryCommandId = normalizeString(commandPreviewBundle?.primaryCommandId) || 'none';
  const assertionInputTraceSummary = formatAssertionRecordInputTraceSummary(assertionRecordInputTrace);
  const packetMarkdown = normalizeString(renderedOperatorPacketTextSurface?.markdown) || 'not available';
  const draftMarkdown = normalizeString(renderedArtifactTextSurface?.selectedDraftMarkdown) || 'not available';
  const briefKind = `${bundleKind}__${packetKind}`;

  return {
    previewAvailable: true,
    previewUsableNow: renderedArtifactTextSurface?.previewAvailable === true
      && renderedOperatorPacketTextSurface?.previewAvailable === true,
    briefKind,
    currentStage,
    nextStepRef,
    bundleKind,
    packetKind,
    selectedDraftId,
    primaryCommandId,
    assertionInputTraceSummary,
    markdown: [
      `Status: ${EXPECTED_OPERATOR_STATE}`,
      `Brief kind: ${briefKind}`,
      `Current stage: ${currentStage}`,
      `Next step ref: ${nextStepRef}`,
      `Bundle kind: ${bundleKind}`,
      `Packet kind: ${packetKind}`,
      `Selected draft id: ${selectedDraftId}`,
      `Primary command id: ${primaryCommandId}`,
      `Assertion input trace: ${assertionInputTraceSummary}`,
      '',
      '## Current Operator Packet',
      '',
      packetMarkdown,
      '',
      '## Selected Artifact Draft',
      '',
      draftMarkdown
    ].join('\n')
  };
}

function normalizeExternalAssertion(assertion = {}) {
  const safeAssertion = isPlainObject(assertion) ? assertion : {};

  return {
    asserted: normalizeBoolean(safeAssertion.asserted),
    assertionClass: normalizeString(safeAssertion.assertionClass),
    assertedCurrentSessionOnly: normalizeBoolean(safeAssertion.assertedCurrentSessionOnly),
    assertedIndependentOfPacket: normalizeBoolean(safeAssertion.assertedIndependentOfPacket),
    assertedNoBindingRequested: normalizeBoolean(safeAssertion.assertedNoBindingRequested),
    assertedNoPersistenceRequested: normalizeBoolean(safeAssertion.assertedNoPersistenceRequested),
    assertedScopeStillCm0601Only: normalizeBoolean(safeAssertion.assertedScopeStillCm0601Only),
    assertedNoStartupHealthWriteRecallRequested: normalizeBoolean(
      safeAssertion.assertedNoStartupHealthWriteRecallRequested
    ),
    assertedAt: normalizeString(safeAssertion.assertedAt)
  };
}

function buildAssertionRecordPreview({ operatorActionPlan = null } = {}) {
  const currentStage = operatorActionPlan?.currentStage || 'keep_rc_not_ready_blocked';
  return {
    previewAvailable: true,
    previewUsableNow: currentStage === 'await_cm0611_assertion_record'
      || currentStage === 'await_cm0610_contract_acceptance',
    templateRef: CM0611_ASSERTION_RECORD_TEMPLATE_REF,
    contractRef: CM0610_ASSERTION_CONTRACT_REF,
    appliesOnlyTo: EXPECTED_UNIT,
    acceptedAssertionClasses: [...ACCEPTED_ASSERTION_CLASSES],
    allowedDecisionValues: [...CM0611_ALLOWED_DECISION_VALUES],
    requiredHeaderFields: [...CM0611_REQUIRED_HEADER_FIELDS],
    requiredSectionTitles: [...CM0611_REQUIRED_SECTION_TITLES],
    requiredBooleanFields: [
      'assertedCurrentSessionOnly',
      'assertedIndependentOfPacket',
      'assertedNoBindingRequested',
      'assertedNoPersistenceRequested',
      'assertedScopeStillCm0601Only',
      'assertedNoStartupHealthWriteRecallRequested'
    ],
    nextContractRef: CM0610_ASSERTION_CONTRACT_REF,
    nextChecklistRef: CM0608_PREFLIGHT_CHECKLIST_REF,
    operatorSequenceRef: CM0612_OPERATOR_SEQUENCE_REF,
    outOfScopeActionsExecuted: 'none'
  };
}

function normalizeAuthorizedWritePathAutoAuthorizationPreflightInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};

  return {
    schemaVersion: normalizeString(safeInput.schemaVersion),
    mode: normalizeString(safeInput.mode),
    controllingMap: normalizeString(safeInput.controllingMap),
    operatorFacingState: normalizeString(safeInput.operatorFacingState),
    targetBaseline: normalizeString(safeInput.targetBaseline),
    reboundBaselineRecorded: normalizeBoolean(safeInput.reboundBaselineRecorded),
    sameBaselineEndpointStartupEvidenceAvailable: normalizeBoolean(
      safeInput.sameBaselineEndpointStartupEvidenceAvailable
    ),
    endpointStartupEvidenceId: normalizeString(safeInput.endpointStartupEvidenceId),
    latestReboundEvidenceAvailable: normalizeBoolean(safeInput.latestReboundEvidenceAvailable),
    latestReboundEvidenceEquivalentOrLater: normalizeBoolean(
      safeInput.latestReboundEvidenceEquivalentOrLater
    ),
    latestReboundEvidenceId: normalizeString(safeInput.latestReboundEvidenceId),
    latestReboundOutcomeClass: normalizeString(safeInput.latestReboundOutcomeClass),
    contradictoryWritePathDrift: normalizeBoolean(safeInput.contradictoryWritePathDrift),
    externalAssertion: normalizeExternalAssertion(safeInput.externalAssertion),
    intendedAutomaticOutput: normalizeString(safeInput.intendedAutomaticOutput),
    stillOutOfScopeActions: normalizeStringArray(safeInput.stillOutOfScopeActions)
  };
}

function evaluateAuthorizedWritePathAutoAuthorizationPreflight(input = {}, options = {}) {
  const safeOptions = isPlainObject(options) ? options : {};
  const assertionRecordInputTrace = isPlainObject(safeOptions.assertionRecordInputTrace)
    ? safeOptions.assertionRecordInputTrace
    : null;
  const normalized = normalizeAuthorizedWritePathAutoAuthorizationPreflightInput(input);
  const malformedInput = !isPlainObject(input);
  const invalidSchema = normalized.schemaVersion !== EXPECTED_SCHEMA_VERSION;
  const invalidMode = normalized.mode !== EXPECTED_MODE;
  const unsupportedOutcomeClass =
    normalized.latestReboundOutcomeClass &&
    !ALLOWED_LATEST_REBOUND_OUTCOME_CLASSES.includes(normalized.latestReboundOutcomeClass);

  const checklist = {
    C1: {
      question: 'Does docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md still control the mainline?',
      passed: normalized.controllingMap === EXPECTED_CONTROLLING_MAP
    },
    C2: {
      question: 'Is the operator-facing controlling state still RC_NOT_READY_BLOCKED?',
      passed: normalized.operatorFacingState === EXPECTED_OPERATOR_STATE
    },
    C3: {
      question: 'Is the target baseline still current or explicitly rebound in docs/board?',
      passed: normalized.targetBaseline === EXPECTED_TARGET_BASELINE ||
        (Boolean(normalized.targetBaseline) && normalized.reboundBaselineRecorded === true)
    },
    C4: {
      question: 'Does same-baseline endpoint/startup evidence still exist through CM-0592?',
      passed: normalized.sameBaselineEndpointStartupEvidenceAvailable === true &&
        normalized.endpointStartupEvidenceId === EXPECTED_ENDPOINT_STARTUP_EVIDENCE_ID
    },
    C5: {
      question: 'Is the latest controlling rebound evidence still CM-0603 or later equivalent with no contradictory write-path drift?',
      passed: normalized.latestReboundEvidenceAvailable === true &&
        normalized.latestReboundEvidenceEquivalentOrLater === true &&
        Boolean(normalized.latestReboundEvidenceId) &&
        normalized.contradictoryWritePathDrift === false &&
        normalized.latestReboundOutcomeClass.length > 0 &&
        unsupportedOutcomeClass === false
    },
    C6: {
      question: 'Has an external token-availability change been explicitly asserted and accepted by CM-0610?',
      passed: normalized.externalAssertion.asserted === true &&
        ACCEPTED_ASSERTION_CLASSES.includes(normalized.externalAssertion.assertionClass) &&
        normalized.externalAssertion.assertedCurrentSessionOnly === true &&
        normalized.externalAssertion.assertedIndependentOfPacket === true &&
        normalized.externalAssertion.assertedNoBindingRequested === true &&
        normalized.externalAssertion.assertedNoPersistenceRequested === true &&
        normalized.externalAssertion.assertedScopeStillCm0601Only === true &&
        normalized.externalAssertion.assertedNoStartupHealthWriteRecallRequested === true &&
        Boolean(normalized.externalAssertion.assertedAt)
    },
    C7: {
      question: 'Is the intended automatic outcome still limited to reusing the exact CM-0601 approval line only?',
      passed: normalized.intendedAutomaticOutput === 'AUTO_REUSE_CM0601_LINE_ONLY'
    },
    C8: {
      question: 'Are CM-0595, write validation, provider/config/startup persistence, public MCP expansion, durable write, and readiness claims all still out of scope?',
      passed: hasSubset(uniqueValues(normalized.stillOutOfScopeActions), REQUIRED_STILL_OUT_OF_SCOPE_ACTIONS)
    }
  };

  const checklistFailures = Object.entries(checklist)
    .filter(([, item]) => item.passed !== true)
    .map(([id]) => id);
  const checklistPassed = checklistFailures.length === 0;

  let allowedGovernanceOutput = 'NO_AUTO_APPROVAL_ISSUED';
  if (checklistPassed) {
    if (normalized.latestReboundOutcomeClass === 'token_present') {
      allowedGovernanceOutput = 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW';
    } else if (
      normalized.latestReboundOutcomeClass === 'token_missing' ||
      normalized.latestReboundOutcomeClass === 'stale_for_current_token_state'
    ) {
      allowedGovernanceOutput = 'AUTO_REUSE_CM0601_LINE_ONLY';
    }
  }

  const failClosedReasons = [];
  if (malformedInput) failClosedReasons.push('malformed_input');
  if (invalidSchema) failClosedReasons.push('schema_version_mismatch');
  if (invalidMode) failClosedReasons.push('mode_mismatch');
  if (unsupportedOutcomeClass) failClosedReasons.push('unsupported_latest_rebound_outcome_class');
  if (checklist.C1.passed !== true) failClosedReasons.push('controlling_map_drift');
  if (checklist.C2.passed !== true) failClosedReasons.push('operator_state_drift');
  if (checklist.C3.passed !== true) failClosedReasons.push('baseline_not_current_or_rebound');
  if (checklist.C4.passed !== true) failClosedReasons.push('same_baseline_endpoint_startup_evidence_missing');
  if (checklist.C5.passed !== true) failClosedReasons.push('latest_rebound_evidence_not_controlling');
  if (checklist.C6.passed !== true) failClosedReasons.push('external_token_assertion_not_accepted');
  if (checklist.C7.passed !== true) failClosedReasons.push('automatic_outcome_scope_too_broad');
  if (checklist.C8.passed !== true) failClosedReasons.push('required_out_of_scope_actions_not_preserved');

  const status = allowedGovernanceOutput === 'AUTO_REUSE_CM0601_LINE_ONLY'
    ? 'auto_reuse_cm0601_line_only'
    : allowedGovernanceOutput === 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW'
      ? 'escalate_for_future_widening_review'
      : 'blocked_fail_closed';

  const operatorActionPlan = buildOperatorActionPlan({
    normalized,
    checklist,
    allowedGovernanceOutput
  });
  const assertionRecordPreview = buildAssertionRecordPreview({
    operatorActionPlan
  });
  const approvalLinePreview = {
    previewAvailable: true,
    previewUsableNow: allowedGovernanceOutput === 'AUTO_REUSE_CM0601_LINE_ONLY',
    exactApprovalLine: CM0601_EXACT_APPROVAL_LINE,
    sourceRef: CM0601_APPROVAL_LINE_SOURCE_REF,
    issuanceRecordTemplateRef: CM0614_ISSUANCE_RECORD_TEMPLATE_REF,
    executionEvidenceTemplateRef: CM0609_EXECUTION_EVIDENCE_TEMPLATE_REF,
    operatorSequenceRef: CM0612_OPERATOR_SEQUENCE_REF,
    routingOutcomeTemplateRef: CM0615_ROUTING_OUTCOME_TEMPLATE_REF
  };
  const issuanceRecordPreview = buildIssuanceRecordPreview(allowedGovernanceOutput);
  const routingOutcomePreview = buildRoutingOutcomePreview(allowedGovernanceOutput);
  const wideningReviewPreview = buildWideningReviewPreview(allowedGovernanceOutput);
  const recordDrafts = buildRecordDrafts({
    checklistPassed,
    checklist,
    normalized,
    allowedGovernanceOutput
  });
  const commandPreviewBundle = buildCommandPreviewBundle({
    assertionRecordInputTrace,
    allowedGovernanceOutput,
    operatorActionPlan
  });
  const renderedArtifactTextSurface = buildRenderedArtifactTextSurface({
    assertionRecordInputTrace,
    allowedGovernanceOutput,
    recordDrafts,
    operatorActionPlan,
    commandPreviewBundle
  });
  const artifactBundleDraft = buildArtifactBundleDraft({
    assertionRecordInputTrace,
    assertionRecordPreview,
    allowedGovernanceOutput,
    approvalLinePreview,
    issuanceRecordPreview,
    routingOutcomePreview,
    wideningReviewPreview,
    recordDrafts,
    renderedArtifactTextSurface,
    operatorActionPlan
  });
  const operatorPacketDraft = buildOperatorPacketDraft({
    assertionRecordInputTrace,
    assertionRecordPreview,
    allowedGovernanceOutput,
    artifactBundleDraft,
    commandPreviewBundle,
    approvalLinePreview,
    issuanceRecordPreview,
    routingOutcomePreview,
    wideningReviewPreview,
    recordDrafts,
    renderedArtifactTextSurface,
    operatorActionPlan
  });
  const renderedOperatorPacketTextSurface = buildRenderedOperatorPacketTextSurface({
    assertionRecordInputTrace,
    allowedGovernanceOutput,
    approvalLinePreview,
    commandPreviewBundle,
    operatorPacketDraft,
    renderedArtifactTextSurface,
    operatorActionPlan
  });
  const renderedOperatorBriefTextSurface = buildRenderedOperatorBriefTextSurface({
    artifactBundleDraft,
    commandPreviewBundle,
    operatorPacketDraft,
    renderedArtifactTextSurface,
    renderedOperatorPacketTextSurface,
    operatorActionPlan,
    assertionRecordInputTrace
  });

  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    sourceMode: 'explicit_input',
    status,
    decision: EXPECTED_OPERATOR_STATE,
    allowedGovernanceOutput,
    assertionRecordPreview,
    approvalLinePreview,
    issuanceRecordPreview,
    routingOutcomePreview,
    wideningReviewPreview,
    recordDrafts,
    renderedArtifactTextSurface,
    renderedOperatorPacketTextSurface,
    renderedOperatorBriefTextSurface,
    operatorActionPlan,
    artifactBundleDraft,
    commandPreviewBundle,
    operatorPacketDraft,
    checklistPassed,
    checklist,
    checklistFailures,
    exactCm0601LineReusable: allowedGovernanceOutput === 'AUTO_REUSE_CM0601_LINE_ONLY',
    exactCm0601LineSourceRef: CM0601_APPROVAL_LINE_SOURCE_REF,
    canAutoAuthorizeCm0595: false,
    canAutoAuthorizeRecordMemory: false,
    canExecuteRuntimeNow: false,
    externalAssertionAccepted: checklist.C6.passed,
    failClosedReasons: uniqueValues(failClosedReasons),
    nextStep: allowedGovernanceOutput === 'AUTO_REUSE_CM0601_LINE_ONLY'
      ? 'reuse_exact_cm0601_approval_line_from_docs'
      : allowedGovernanceOutput === 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW'
        ? 'route_into_cm0604_widening_review_without_cm0595_auto_authorization'
        : 'keep_rc_not_ready_blocked_and_issue_no_auto_approval',
    safety: {
      readsFiles: false,
      scansDirectories: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      readsRealMemory: false,
      scansRuntimeStores: false,
      writesDurableState: false,
      expandsPublicMcp: false,
      remoteWrites: false,
      rawSensitiveOutputExposed: false
    },
    readiness: {
      cm0601LineReuseReady: allowedGovernanceOutput === 'AUTO_REUSE_CM0601_LINE_ONLY',
      wideningReviewEscalationReady: allowedGovernanceOutput === 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW',
      cm0595AutoAuthorizationReady: false,
      runtimeReady: false,
      rcReady: false
    }
  };
}

module.exports = {
  ACCEPTED_ASSERTION_CLASSES,
  ALLOWED_GOVERNANCE_OUTPUTS,
  EXPECTED_CONTROLLING_MAP,
  EXPECTED_MODE,
  EXPECTED_OPERATOR_STATE,
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_TARGET_BASELINE,
  CM0601_APPROVAL_LINE_SOURCE_REF,
  CM0601_EXACT_APPROVAL_LINE,
  CM0605_DECISION_TABLE_REF,
  CM0604_WIDENING_GATE_REF,
  CM0606_WIDENING_ADOPTION_BRIDGE_REF,
  CM0607_WIDENING_ADOPTION_RECORD_TEMPLATE_REF,
  CM0608_PREFLIGHT_CHECKLIST_REF,
  CM0609_EXECUTION_EVIDENCE_TEMPLATE_REF,
  CM0610_ASSERTION_CONTRACT_REF,
  CM0611_ASSERTION_RECORD_TEMPLATE_REF,
  CM0612_OPERATOR_SEQUENCE_REF,
  CM0614_ISSUANCE_RECORD_TEMPLATE_REF,
  CM0615_ROUTING_OUTCOME_TEMPLATE_REF,
  CM0616_WIDENING_REVIEW_OUTCOME_TEMPLATE_REF,
  ASSERTION_RECORD_PATH_PLACEHOLDER,
  HELPER_ASSERTION_REVIEW_COMMAND,
  GOVERNANCE_REPORT_ASSERTION_REVIEW_COMMAND,
  DASHBOARD_ASSERTION_REVIEW_COMMAND,
  HTTP_OBSERVE_ASSERTION_REVIEW_COMMAND,
  buildAssertionRecordPreview,
  buildIssuanceRecordPreview,
  buildArtifactBundleDraft,
  buildCommandPreviewBundle,
  buildOperatorPacketDraft,
  buildRenderedOperatorPacketTextSurface,
  buildRecordDrafts,
  buildRenderedArtifactTextSurface,
  buildRoutingOutcomePreview,
  buildWideningReviewPreview,
  REQUIRED_STILL_OUT_OF_SCOPE_ACTIONS,
  buildOperatorActionPlan,
  evaluateAuthorizedWritePathAutoAuthorizationPreflight,
  normalizeAuthorizedWritePathAutoAuthorizationPreflightInput
};
