'use strict';

const { isSafeReferenceName } = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'VcpToolBoxExactApprovedLiveInspectionExecutionBoundary';
const CONTRACT_MODE = 'fixture_exact_approved_live_inspection_execution_boundary_only';
const OPERATOR_DECISION = 'prepare_exact_approved_live_inspection_execution_boundary_no_runtime';

const BOUNDARY_DECISIONS = Object.freeze({
  PREPARED_FOR_EXACT_APPROVED_EXECUTION: 'prepared_for_exact_approved_execution',
  BLOCKED_NEEDS_EXACT_APPROVAL: 'blocked_needs_exact_approval',
  NEEDS_PLAN_ADJUSTMENT: 'needs_plan_adjustment'
});

const REQUIRED_ALIGNMENT_FIELDS = Object.freeze([
  'master_reference_or_id',
  'stage_reference_or_id',
  'version_reference_or_id',
  'projectFinalGoalServed',
  'priorReceiptContractStatus',
  'exactApprovalBinding',
  'executionEnvelope',
  'projectFinalGoalReview'
]);

const ACCEPTED_RECEIPT_CONTRACT_STATUSES = Object.freeze([
  'CM1704_RECEIPT_CONTRACT_PASSED',
  'CM-1704_RECEIPT_CONTRACT_PASSED',
  'RECEIPT_CONTRACT_PASSED',
  'PASSED'
]);

const ACCEPTED_PROJECT_FINAL_GOAL_ANSWERS = Object.freeze([
  'serves_project_final_goal',
  'still_serves_project_final_goal',
  'yes'
]);

const ALLOWED_FUTURE_RUNTIME_ACTIONS = Object.freeze([
  'target_presence_probe',
  'runtime_handshake_probe',
  'target_specific_no_memory_inspection'
]);

const MAX_RUNTIME_CALLS = 3;
const MAX_RUNTIME_PROBE_MINUTES = 10;
const MAX_TARGET_SPECIFIC_RUNTIME_INSPECTIONS = 1;

const ZERO_COUNTERS = Object.freeze({
  runtimeCalls: 0,
  targetSpecificRuntimeInspections: 0,
  liveVcpToolBoxCalls: 0,
  memoryReads: 0,
  memoryWrites: 0,
  durableMemoryWrites: 0,
  providerApiCalls: 0,
  publicMcpExpansions: 0,
  startupWatchdogConfigMutations: 0,
  configEnvReads: 0,
  envFileReads: 0,
  secretReads: 0,
  rawRuntimeResponsesRead: 0,
  rawMemoryReads: 0,
  rawProviderResponsesRead: 0,
  approvalLinesIssued: 0,
  approvalLinesConsumed: 0,
  readinessClaims: 0,
  cutoverClaims: 0,
  pushes: 0,
  pullRequests: 0,
  releases: 0,
  deploys: 0
});

const FIELD_CATEGORY_BY_NORMALIZED_NAME = Object.freeze({
  path: 'locator_endpoint_or_path',
  filepath: 'locator_endpoint_or_path',
  absolutepath: 'locator_endpoint_or_path',
  targetpath: 'locator_endpoint_or_path',
  endpoint: 'locator_endpoint_or_path',
  url: 'locator_endpoint_or_path',
  baseurl: 'locator_endpoint_or_path',
  locatorvalue: 'locator_endpoint_or_path',
  port: 'locator_endpoint_or_path',
  host: 'locator_endpoint_or_path',

  env: 'secret_config_private_state',
  envfile: 'secret_config_private_state',
  configenv: 'secret_config_private_state',
  configenvpath: 'secret_config_private_state',
  privatestate: 'secret_config_private_state',
  privateruntimestate: 'secret_config_private_state',
  credential: 'secret_config_private_state',
  credentials: 'secret_config_private_state',
  cookie: 'secret_config_private_state',
  token: 'secret_config_private_state',
  bearertoken: 'secret_config_private_state',
  apikey: 'secret_config_private_state',
  providerapikey: 'secret_config_private_state',
  secret: 'secret_config_private_state',
  sharedsecret: 'secret_config_private_state',
  password: 'secret_config_private_state',

  exactapprovalline: 'approval_line_or_private_approval_material',
  approvalline: 'approval_line_or_private_approval_material',
  approvallinevalue: 'approval_line_or_private_approval_material',
  approvaltoken: 'approval_line_or_private_approval_material',
  approvaltokenvalue: 'approval_line_or_private_approval_material',
  approvalphrase: 'approval_line_or_private_approval_material',

  rawruntimeresponse: 'raw_memory_or_runtime_output',
  runtimeresponse: 'raw_memory_or_runtime_output',
  rawruntimeoutput: 'raw_memory_or_runtime_output',
  rawmemory: 'raw_memory_or_runtime_output',
  rawmemorycontent: 'raw_memory_or_runtime_output',
  rawdailynote: 'raw_memory_or_runtime_output',
  rawraginjectedcontext: 'raw_memory_or_runtime_output',
  rawvectorrows: 'raw_memory_or_runtime_output',
  rawprompt: 'raw_memory_or_runtime_output',
  rawconversation: 'raw_memory_or_runtime_output',
  sqlitecontent: 'raw_memory_or_runtime_output',
  jsonlcontent: 'raw_memory_or_runtime_output',
  cachecontent: 'raw_memory_or_runtime_output',

  providerresponse: 'provider_response',
  rawproviderresponse: 'provider_response',

  commit: 'commit_branch_or_expiry_value',
  commithash: 'commit_branch_or_expiry_value',
  branch: 'commit_branch_or_expiry_value',
  branchname: 'commit_branch_or_expiry_value',
  expiry: 'commit_branch_or_expiry_value',
  expiresat: 'commit_branch_or_expiry_value'
});

const SAFE_CONTROL_KEYS = new Set([
  'allowedruntimeactions',
  'approvalbindingpresent',
  'approvallinepresent',
  'approvallinevalueomitted',
  'approvalpacketid',
  'executionapprovaldraftid',
  'receiptcontractid',
  'referencedapprovalpacketid',
  'referencedexecutionapprovaldraftid',
  'referencedreceiptcontractid',
  'maxruntimecalls',
  'maxruntimeprobeminutes',
  'maxtargetspecificruntimeinspections',
  'memorybudget',
  'providerbudget',
  'writebudget'
]);

const FORBIDDEN_TRUE_FLAGS = Object.freeze([
  'runtimeAlreadyExecuted',
  'liveInspectionAlreadyExecuted',
  'targetDiscoveryAlreadyExecuted',
  'pathValuesIncluded',
  'endpointValuesIncluded',
  'tokenValuesIncluded',
  'secretValuesIncluded',
  'approvalLineValuesIncluded',
  'rawRuntimeOutputIncluded',
  'rawMemoryIncluded',
  'providerResponsesIncluded',
  'runtimeAuthorizationExpanded',
  'memoryReadAllowed',
  'memoryWriteAllowed',
  'providerApiAllowed',
  'publicMcpExpanded',
  'startupWatchdogConfigMutationAllowed',
  'readinessClaimed',
  'cutoverClaimed',
  'releaseClaimed',
  'deployClaimed',
  'pushPerformed',
  'pullRequestCreated',
  'completeV8Claimed'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeKey(value) {
  return String(value || '').replace(/[-_\s]/g, '').toLowerCase();
}

function safeReferenceOrNull(value) {
  return isSafeReferenceName(value) ? value : null;
}

function firstSafeReference(values) {
  for (const value of values) {
    const safe = safeReferenceOrNull(value);
    if (safe) return safe;
  }
  return null;
}

function hasPresentValue(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function getNested(input, path) {
  return path.reduce((current, key) => (
    isPlainObject(current) ? current[key] : undefined
  ), input);
}

function hasAnyPresent(input, paths) {
  return paths.some(path => hasPresentValue(getNested(input, path)));
}

function collectUnsafeFieldCategories(value) {
  const categories = new Set();
  let unsafeFieldCount = 0;

  function visit(nested) {
    if (Array.isArray(nested)) {
      for (const item of nested) visit(item);
      return;
    }
    if (!isPlainObject(nested)) return;

    for (const [key, child] of Object.entries(nested)) {
      const normalized = normalizeKey(key);
      if (SAFE_CONTROL_KEYS.has(normalized)) {
        visit(child);
        continue;
      }
      const category = FIELD_CATEGORY_BY_NORMALIZED_NAME[normalized];
      if (category) {
        categories.add(category);
        unsafeFieldCount += 1;
        continue;
      }
      visit(child);
    }
  }

  visit(value);
  return {
    unsafeFieldCount,
    unsafeFieldCategories: [...categories].sort()
  };
}

function collectForbiddenTrueFlags(input) {
  const found = new Set();

  function visit(nested) {
    if (Array.isArray(nested)) {
      for (const item of nested) visit(item);
      return;
    }
    if (!isPlainObject(nested)) return;

    for (const [key, child] of Object.entries(nested)) {
      if (FORBIDDEN_TRUE_FLAGS.includes(key) && child === true) {
        found.add(key);
      }
      visit(child);
    }
  }

  visit(input);
  return [...found].sort();
}

function numericCounter(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function collectCounters(input) {
  const counters = isPlainObject(input.counters) ? input.counters : {};
  return Object.fromEntries(
    Object.keys(ZERO_COUNTERS).map(key => [key, numericCounter(counters[key])])
  );
}

function counterViolations(counters) {
  return Object.entries(ZERO_COUNTERS)
    .filter(([key, expected]) => counters[key] !== expected)
    .map(([key]) => key);
}

function exactApprovalBinding(input) {
  const approval = isPlainObject(input.exactApprovalBinding) ? input.exactApprovalBinding : {};
  const approvalLinePresent = approval.approvalLinePresent === true ||
    input.approvalLinePresent === true;
  const approvalLineValueOmitted = approval.approvalLineValueOmitted === true ||
    input.approvalLineValueOmitted === true;
  return {
    present: approval.present === true || approval.approvalBindingPresent === true ||
      input.exactApprovalBindingPresent === true,
    approvalPacketId: firstSafeReference([
      approval.approvalPacketId,
      approval.referencedApprovalPacketId,
      input.approvalPacketId
    ]),
    executionApprovalDraftId: firstSafeReference([
      approval.executionApprovalDraftId,
      approval.referencedExecutionApprovalDraftId,
      input.executionApprovalDraftId
    ]),
    receiptContractId: firstSafeReference([
      approval.receiptContractId,
      approval.referencedReceiptContractId,
      input.receiptContractId
    ]),
    approvalLinePresent,
    approvalLineValueOmitted,
    valueExposed: approvalLinePresent && !approvalLineValueOmitted
  };
}

function priorReceiptContractPassed(input) {
  const statuses = [
    input.priorReceiptContractStatus,
    getNested(input, ['priorReceiptContract', 'status']),
    getNested(input, ['cm1704', 'status'])
  ];
  return statuses.some(status => ACCEPTED_RECEIPT_CONTRACT_STATUSES.includes(status));
}

function projectFinalGoalAnswer(input) {
  return input.projectFinalGoalReviewAnswer ||
    getNested(input, ['review', 'projectFinalGoalAnswer']) ||
    getNested(input, ['closeoutReview', 'projectFinalGoalAnswer']) ||
    null;
}

function normalizedRuntimeActions(input) {
  const envelope = isPlainObject(input.executionEnvelope) ? input.executionEnvelope : {};
  const actions = Array.isArray(envelope.allowedRuntimeActions)
    ? envelope.allowedRuntimeActions
    : [];
  return actions.filter(action => typeof action === 'string');
}

function executionEnvelope(input) {
  const envelope = isPlainObject(input.executionEnvelope) ? input.executionEnvelope : {};
  const allowedRuntimeActions = normalizedRuntimeActions(input);
  const actionSet = new Set(allowedRuntimeActions);
  const unknownActions = allowedRuntimeActions
    .filter(action => !ALLOWED_FUTURE_RUNTIME_ACTIONS.includes(action))
    .sort();
  const missingActions = ALLOWED_FUTURE_RUNTIME_ACTIONS
    .filter(action => !actionSet.has(action));

  return {
    allowedRuntimeActions,
    unknownActions,
    missingActions,
    maxRuntimeCalls: numericCounter(envelope.maxRuntimeCalls),
    maxRuntimeProbeMinutes: numericCounter(envelope.maxRuntimeProbeMinutes),
    maxTargetSpecificRuntimeInspections: numericCounter(envelope.maxTargetSpecificRuntimeInspections),
    memoryBudget: numericCounter(envelope.memoryBudget),
    providerBudget: numericCounter(envelope.providerBudget),
    writeBudget: numericCounter(envelope.writeBudget)
  };
}

function envelopeViolations(envelope) {
  const violations = [];
  if (envelope.unknownActions.length > 0) violations.push('allowedRuntimeActions');
  if (envelope.missingActions.length > 0) violations.push('requiredRuntimeActions');
  if (envelope.maxRuntimeCalls < 1 || envelope.maxRuntimeCalls > MAX_RUNTIME_CALLS) {
    violations.push('maxRuntimeCalls');
  }
  if (envelope.maxRuntimeProbeMinutes < 1 || envelope.maxRuntimeProbeMinutes > MAX_RUNTIME_PROBE_MINUTES) {
    violations.push('maxRuntimeProbeMinutes');
  }
  if (envelope.maxTargetSpecificRuntimeInspections !== MAX_TARGET_SPECIFIC_RUNTIME_INSPECTIONS) {
    violations.push('maxTargetSpecificRuntimeInspections');
  }
  if (envelope.memoryBudget !== 0) violations.push('memoryBudget');
  if (envelope.providerBudget !== 0) violations.push('providerBudget');
  if (envelope.writeBudget !== 0) violations.push('writeBudget');
  return violations;
}

function alignmentStatus(input) {
  const masterPresent = hasAnyPresent(input, [
    ['masterTaskbookReference'],
    ['masterTaskbookId'],
    ['master', 'reference'],
    ['master', 'id']
  ]);
  const stagePresent = hasAnyPresent(input, [
    ['stageReference'],
    ['stageId'],
    ['stage', 'reference'],
    ['stage', 'id']
  ]);
  const versionPresent = hasAnyPresent(input, [
    ['versionReference'],
    ['versionId'],
    ['version', 'reference'],
    ['version', 'id']
  ]);
  const projectFinalGoalServed = input.projectFinalGoalServed === true ||
    getNested(input, ['review', 'projectFinalGoalServed']) === true ||
    getNested(input, ['alignment', 'projectFinalGoalServed']) === true;
  const receiptPassed = priorReceiptContractPassed(input);
  const approval = exactApprovalBinding(input);
  const approvalReady = approval.present &&
    Boolean(approval.approvalPacketId) &&
    Boolean(approval.executionApprovalDraftId) &&
    Boolean(approval.receiptContractId) &&
    approval.approvalLinePresent &&
    approval.approvalLineValueOmitted &&
    !approval.valueExposed;
  const envelope = executionEnvelope(input);
  const envelopeReady = envelopeViolations(envelope).length === 0;
  const projectFinalGoalReviewReady = ACCEPTED_PROJECT_FINAL_GOAL_ANSWERS.includes(projectFinalGoalAnswer(input));

  return {
    masterPresent,
    stagePresent,
    versionPresent,
    projectFinalGoalServed,
    priorReceiptContractPassed: receiptPassed,
    exactApprovalBindingPresent: approvalReady,
    executionEnvelopeReady: envelopeReady,
    projectFinalGoalReviewReady,
    missingAlignmentFields: [
      masterPresent ? null : 'master_reference_or_id',
      stagePresent ? null : 'stage_reference_or_id',
      versionPresent ? null : 'version_reference_or_id',
      projectFinalGoalServed ? null : 'projectFinalGoalServed',
      receiptPassed ? null : 'priorReceiptContractStatus',
      approvalReady ? null : 'exactApprovalBinding',
      envelopeReady ? null : 'executionEnvelope',
      projectFinalGoalReviewReady ? null : 'projectFinalGoalReview'
    ].filter(Boolean)
  };
}

function baseResult(input, decision, reasonCode, details = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const alignment = alignmentStatus(safeInput);
  const approval = exactApprovalBinding(safeInput);
  const envelope = executionEnvelope(safeInput);
  const counters = collectCounters(safeInput);

  return {
    accepted: decision === BOUNDARY_DECISIONS.PREPARED_FOR_EXACT_APPROVED_EXECUTION,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    operatorDecision: OPERATOR_DECISION,
    decision,
    reasonCode,
    boundaryStatus: decision === BOUNDARY_DECISIONS.PREPARED_FOR_EXACT_APPROVED_EXECUTION
      ? 'prepared_no_runtime_execution'
      : 'not_prepared',
    lowDisclosure: true,
    alignment: {
      masterPresent: alignment.masterPresent,
      stagePresent: alignment.stagePresent,
      versionPresent: alignment.versionPresent,
      projectFinalGoalServed: alignment.projectFinalGoalServed,
      priorReceiptContractPassed: alignment.priorReceiptContractPassed,
      exactApprovalBindingPresent: alignment.exactApprovalBindingPresent,
      executionEnvelopeReady: alignment.executionEnvelopeReady,
      projectFinalGoalReviewReady: alignment.projectFinalGoalReviewReady,
      missingAlignmentFields: alignment.missingAlignmentFields
    },
    exactApprovalBinding: {
      present: approval.present,
      approvalPacketId: approval.approvalPacketId,
      executionApprovalDraftId: approval.executionApprovalDraftId,
      receiptContractId: approval.receiptContractId,
      approvalLinePresent: approval.approvalLinePresent,
      approvalLineValueOmitted: approval.approvalLineValueOmitted,
      approvalLineValueIncluded: false
    },
    executionEnvelope: {
      allowedRuntimeActions: envelope.allowedRuntimeActions.filter(action => ALLOWED_FUTURE_RUNTIME_ACTIONS.includes(action)),
      maxRuntimeCalls: envelope.maxRuntimeCalls,
      maxRuntimeProbeMinutes: envelope.maxRuntimeProbeMinutes,
      maxTargetSpecificRuntimeInspections: envelope.maxTargetSpecificRuntimeInspections,
      memoryBudget: envelope.memoryBudget,
      providerBudget: envelope.providerBudget,
      writeBudget: envelope.writeBudget
    },
    allowedFutureRuntimeActions: [...ALLOWED_FUTURE_RUNTIME_ACTIONS],
    envelopeViolations: details.envelopeViolations || [],
    counterViolations: details.counterViolations || [],
    localSafeCounters: counters,
    unsafeFieldCount: details.unsafeFieldCount || 0,
    unsafeFieldCategories: details.unsafeFieldCategories || [],
    forbiddenTrueFlags: details.forbiddenTrueFlags || [],
    outputPolicy: {
      lowDisclosureOnly: true,
      pathValuesIncluded: false,
      endpointValuesIncluded: false,
      tokenValuesIncluded: false,
      secretValuesIncluded: false,
      approvalLineValuesIncluded: false,
      rawRuntimeOutputIncluded: false,
      rawMemoryIncluded: false,
      providerResponsesIncluded: false
    },
    runtimeAlreadyExecuted: false,
    liveInspectionAlreadyExecuted: false,
    targetDiscoveryAlreadyExecuted: false,
    readinessClaimed: false,
    completeV8Claimed: false,
    review: {
      projectFinalGoalServed: alignment.projectFinalGoalServed,
      projectFinalGoalAnswer: ACCEPTED_PROJECT_FINAL_GOAL_ANSWERS.includes(projectFinalGoalAnswer(safeInput))
        ? projectFinalGoalAnswer(safeInput)
        : null
    }
  };
}

function buildVcpToolBoxExactApprovedLiveInspectionExecutionBoundary(input = {}) {
  if (!isPlainObject(input)) {
    return baseResult({}, BOUNDARY_DECISIONS.NEEDS_PLAN_ADJUSTMENT, 'input_not_plain_object');
  }

  const unsafeFields = collectUnsafeFieldCategories(input);
  if (unsafeFields.unsafeFieldCount > 0) {
    return baseResult(input, BOUNDARY_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL, 'unsafe_sensitive_or_raw_fields_present', {
      unsafeFieldCount: unsafeFields.unsafeFieldCount,
      unsafeFieldCategories: unsafeFields.unsafeFieldCategories
    });
  }

  const forbiddenTrueFlags = collectForbiddenTrueFlags(input);
  if (forbiddenTrueFlags.length > 0) {
    return baseResult(input, BOUNDARY_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL, 'forbidden_execution_or_expansion_flag_present', {
      forbiddenTrueFlags
    });
  }

  const alignment = alignmentStatus(input);
  if (!alignment.masterPresent || !alignment.stagePresent || !alignment.versionPresent ||
    !alignment.projectFinalGoalServed || !alignment.priorReceiptContractPassed ||
    !alignment.projectFinalGoalReviewReady) {
    return baseResult(input, BOUNDARY_DECISIONS.NEEDS_PLAN_ADJUSTMENT, 'alignment_receipt_or_review_missing');
  }

  if (!alignment.exactApprovalBindingPresent) {
    return baseResult(input, BOUNDARY_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL, 'exact_approval_binding_missing_or_unsafe');
  }

  const envelope = executionEnvelope(input);
  const envelopeProblems = envelopeViolations(envelope);
  if (envelopeProblems.length > 0) {
    return baseResult(input, BOUNDARY_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL, 'execution_envelope_expanded_or_incomplete', {
      envelopeViolations: envelopeProblems
    });
  }

  const counters = collectCounters(input);
  const counterProblems = counterViolations(counters);
  if (counterProblems.length > 0) {
    return baseResult(input, BOUNDARY_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL, 'pre_execution_counter_violation', {
      counterViolations: counterProblems
    });
  }

  return baseResult(input, BOUNDARY_DECISIONS.PREPARED_FOR_EXACT_APPROVED_EXECUTION, 'execution_boundary_prepared_no_runtime');
}

module.exports = {
  ACCEPTED_PROJECT_FINAL_GOAL_ANSWERS,
  ACCEPTED_RECEIPT_CONTRACT_STATUSES,
  ALLOWED_FUTURE_RUNTIME_ACTIONS,
  BOUNDARY_DECISIONS,
  CONTRACT_MODE,
  CONTRACT_NAME,
  MAX_RUNTIME_CALLS,
  MAX_RUNTIME_PROBE_MINUTES,
  MAX_TARGET_SPECIFIC_RUNTIME_INSPECTIONS,
  OPERATOR_DECISION,
  REQUIRED_ALIGNMENT_FIELDS,
  ZERO_COUNTERS,
  buildVcpToolBoxExactApprovedLiveInspectionExecutionBoundary
};
