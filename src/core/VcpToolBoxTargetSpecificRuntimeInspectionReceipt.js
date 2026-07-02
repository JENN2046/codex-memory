'use strict';

const { isSafeReferenceName } = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'VcpToolBoxTargetSpecificRuntimeInspectionReceipt';
const CONTRACT_MODE = 'fixture_target_specific_runtime_inspection_receipt_only';
const OPERATOR_DECISION = 'review_exact_approved_target_specific_runtime_inspection_receipt';

const RECEIPT_DECISIONS = Object.freeze({
  ACCEPTED_FOR_REVIEW: 'accepted_for_review',
  BLOCKED_NEEDS_EXACT_APPROVAL: 'blocked_needs_exact_approval',
  NEEDS_PLAN_ADJUSTMENT: 'needs_plan_adjustment'
});

const REQUIRED_ALIGNMENT_FIELDS = Object.freeze([
  'master_reference_or_id',
  'stage_reference_or_id',
  'version_reference_or_id',
  'projectFinalGoalServed',
  'referencedCommanderDecision',
  'exactApprovalBinding'
]);

const ACCEPTED_COMMANDER_DECISIONS = Object.freeze([
  'blocked_needs_exact_approval',
  'exact_approval_bound',
  'approved_exact_runtime_inspection'
]);

const ACCEPTED_PROJECT_FINAL_GOAL_ANSWERS = Object.freeze([
  'serves_project_final_goal',
  'still_serves_project_final_goal',
  'yes'
]);

const MAX_RUNTIME_CALLS = 3;
const MAX_TARGET_SPECIFIC_RUNTIME_INSPECTIONS = 1;

const ZERO_SIDE_EFFECT_COUNTERS = Object.freeze({
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
  'approvallinepresent',
  'approvallinevalueomitted',
  'approvalbindingpresent',
  'approvalpacketid',
  'executionapprovaldraftid',
  'referencedapprovalpacketid',
  'referencedexecutionapprovaldraftid'
]);

const FORBIDDEN_TRUE_FLAGS = Object.freeze([
  'pathValuesIncluded',
  'endpointValuesIncluded',
  'tokenValuesIncluded',
  'secretValuesIncluded',
  'approvalLineValuesIncluded',
  'rawRuntimeOutputIncluded',
  'rawMemoryIncluded',
  'providerResponsesIncluded',
  'readinessClaimed',
  'cutoverClaimed',
  'releaseClaimed',
  'deployClaimed',
  'pushPerformed',
  'pullRequestCreated',
  'completeV8Claimed',
  'runtimeAuthorizationExpanded',
  'publicMcpExpanded',
  'memoryWritten',
  'providerApiCalled'
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
  return {
    runtimeCalls: numericCounter(counters.runtimeCalls),
    targetSpecificRuntimeInspections: numericCounter(counters.targetSpecificRuntimeInspections),
    liveVcpToolBoxCalls: numericCounter(counters.liveVcpToolBoxCalls),
    memoryReads: numericCounter(counters.memoryReads),
    memoryWrites: numericCounter(counters.memoryWrites),
    durableMemoryWrites: numericCounter(counters.durableMemoryWrites),
    providerApiCalls: numericCounter(counters.providerApiCalls),
    publicMcpExpansions: numericCounter(counters.publicMcpExpansions),
    startupWatchdogConfigMutations: numericCounter(counters.startupWatchdogConfigMutations),
    configEnvReads: numericCounter(counters.configEnvReads),
    envFileReads: numericCounter(counters.envFileReads),
    secretReads: numericCounter(counters.secretReads),
    rawRuntimeResponsesRead: numericCounter(counters.rawRuntimeResponsesRead),
    rawMemoryReads: numericCounter(counters.rawMemoryReads),
    rawProviderResponsesRead: numericCounter(counters.rawProviderResponsesRead),
    approvalLinesIssued: numericCounter(counters.approvalLinesIssued),
    approvalLinesConsumed: numericCounter(counters.approvalLinesConsumed),
    readinessClaims: numericCounter(counters.readinessClaims),
    cutoverClaims: numericCounter(counters.cutoverClaims),
    pushes: numericCounter(counters.pushes),
    pullRequests: numericCounter(counters.pullRequests),
    releases: numericCounter(counters.releases),
    deploys: numericCounter(counters.deploys)
  };
}

function counterViolations(counters) {
  const violations = [];
  if (counters.runtimeCalls < 1 || counters.runtimeCalls > MAX_RUNTIME_CALLS) {
    violations.push('runtimeCalls');
  }
  if (counters.targetSpecificRuntimeInspections !== MAX_TARGET_SPECIFIC_RUNTIME_INSPECTIONS) {
    violations.push('targetSpecificRuntimeInspections');
  }
  if (counters.liveVcpToolBoxCalls < 1 || counters.liveVcpToolBoxCalls > MAX_RUNTIME_CALLS) {
    violations.push('liveVcpToolBoxCalls');
  }
  for (const [key, expected] of Object.entries(ZERO_SIDE_EFFECT_COUNTERS)) {
    if (counters[key] !== expected) violations.push(key);
  }
  return violations;
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
    approvalLinePresent,
    approvalLineValueOmitted,
    valueExposed: approvalLinePresent && !approvalLineValueOmitted
  };
}

function commanderDecision(input) {
  return input.referencedCommanderDecision ||
    getNested(input, ['commander', 'decision']) ||
    getNested(input, ['referencedCommanderPacket', 'decision']) ||
    null;
}

function projectFinalGoalAnswer(input) {
  return input.projectFinalGoalReviewAnswer ||
    getNested(input, ['review', 'projectFinalGoalAnswer']) ||
    getNested(input, ['closeoutReview', 'projectFinalGoalAnswer']) ||
    null;
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
  const referencedCommanderDecision = ACCEPTED_COMMANDER_DECISIONS.includes(commanderDecision(input));
  const approval = exactApprovalBinding(input);
  const approvalBindingReady = approval.present &&
    Boolean(approval.approvalPacketId) &&
    Boolean(approval.executionApprovalDraftId) &&
    approval.approvalLinePresent &&
    approval.approvalLineValueOmitted &&
    !approval.valueExposed;

  return {
    masterPresent,
    stagePresent,
    versionPresent,
    projectFinalGoalServed,
    referencedCommanderDecision,
    exactApprovalBindingPresent: approvalBindingReady,
    missingAlignmentFields: [
      masterPresent ? null : 'master_reference_or_id',
      stagePresent ? null : 'stage_reference_or_id',
      versionPresent ? null : 'version_reference_or_id',
      projectFinalGoalServed ? null : 'projectFinalGoalServed',
      referencedCommanderDecision ? null : 'referencedCommanderDecision',
      approvalBindingReady ? null : 'exactApprovalBinding'
    ].filter(Boolean)
  };
}

function inspectionEvidence(input) {
  const evidence = isPlainObject(input.inspectionEvidence) ? input.inspectionEvidence : {};
  return {
    targetAlias: firstSafeReference([
      evidence.targetAlias,
      input.targetAlias,
      getNested(input, ['target', 'alias'])
    ]),
    runtimeProfileAlias: firstSafeReference([
      evidence.runtimeProfileAlias,
      input.runtimeProfileAlias,
      getNested(input, ['runtimeProfile', 'alias'])
    ]),
    inspectionKind: evidence.inspectionKind === 'target_specific_runtime_inspection'
      ? 'target_specific_runtime_inspection'
      : null,
    resultCategory: safeReferenceOrNull(evidence.resultCategory || input.resultCategory)
  };
}

function baseResult(input, decision, reasonCode, details = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const alignment = alignmentStatus(safeInput);
  const approval = exactApprovalBinding(safeInput);
  const evidence = inspectionEvidence(safeInput);
  const counters = collectCounters(safeInput);

  return {
    accepted: decision === RECEIPT_DECISIONS.ACCEPTED_FOR_REVIEW,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    operatorDecision: OPERATOR_DECISION,
    decision,
    reasonCode,
    receiptReviewStatus: decision === RECEIPT_DECISIONS.ACCEPTED_FOR_REVIEW
      ? 'reviewable_not_ready'
      : 'not_accepted',
    lowDisclosure: true,
    alignment: {
      masterPresent: alignment.masterPresent,
      stagePresent: alignment.stagePresent,
      versionPresent: alignment.versionPresent,
      projectFinalGoalServed: alignment.projectFinalGoalServed,
      referencedCommanderDecision: alignment.referencedCommanderDecision,
      exactApprovalBindingPresent: alignment.exactApprovalBindingPresent,
      missingAlignmentFields: alignment.missingAlignmentFields
    },
    exactApprovalBinding: {
      present: approval.present,
      approvalPacketId: approval.approvalPacketId,
      executionApprovalDraftId: approval.executionApprovalDraftId,
      approvalLinePresent: approval.approvalLinePresent,
      approvalLineValueOmitted: approval.approvalLineValueOmitted,
      approvalLineValueIncluded: false
    },
    inspectionEvidence: evidence,
    runtimeBudget: {
      runtimeCalls: counters.runtimeCalls,
      targetSpecificRuntimeInspections: counters.targetSpecificRuntimeInspections,
      liveVcpToolBoxCalls: counters.liveVcpToolBoxCalls,
      maxRuntimeCalls: MAX_RUNTIME_CALLS,
      maxTargetSpecificRuntimeInspections: MAX_TARGET_SPECIFIC_RUNTIME_INSPECTIONS
    },
    sideEffectCounters: Object.fromEntries(
      Object.keys(ZERO_SIDE_EFFECT_COUNTERS).map(key => [key, counters[key]])
    ),
    counterViolations: details.counterViolations || [],
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
    review: {
      projectFinalGoalServed: alignment.projectFinalGoalServed,
      projectFinalGoalAnswer: ACCEPTED_PROJECT_FINAL_GOAL_ANSWERS.includes(projectFinalGoalAnswer(safeInput))
        ? projectFinalGoalAnswer(safeInput)
        : null,
      readinessClaimed: false,
      completeV8Claimed: false
    },
    readinessClaimed: false,
    completeV8Claimed: false
  };
}

function buildVcpToolBoxTargetSpecificRuntimeInspectionReceipt(input = {}) {
  if (!isPlainObject(input)) {
    return baseResult({}, RECEIPT_DECISIONS.NEEDS_PLAN_ADJUSTMENT, 'input_not_plain_object');
  }

  const unsafeFields = collectUnsafeFieldCategories(input);
  if (unsafeFields.unsafeFieldCount > 0) {
    return baseResult(input, RECEIPT_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL, 'unsafe_sensitive_or_raw_fields_present', {
      unsafeFieldCount: unsafeFields.unsafeFieldCount,
      unsafeFieldCategories: unsafeFields.unsafeFieldCategories
    });
  }

  const forbiddenTrueFlags = collectForbiddenTrueFlags(input);
  if (forbiddenTrueFlags.length > 0) {
    return baseResult(input, RECEIPT_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL, 'forbidden_output_or_expansion_flag_present', {
      forbiddenTrueFlags
    });
  }

  const alignment = alignmentStatus(input);
  if (alignment.missingAlignmentFields.length > 0) {
    return baseResult(input, RECEIPT_DECISIONS.NEEDS_PLAN_ADJUSTMENT, 'alignment_or_exact_approval_binding_missing');
  }

  const counters = collectCounters(input);
  const violations = counterViolations(counters);
  if (violations.length > 0) {
    return baseResult(input, RECEIPT_DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL, 'runtime_budget_or_side_effect_counter_violation', {
      counterViolations: violations
    });
  }

  const evidence = inspectionEvidence(input);
  if (!evidence.targetAlias || !evidence.runtimeProfileAlias ||
    evidence.inspectionKind !== 'target_specific_runtime_inspection' ||
    !evidence.resultCategory) {
    return baseResult(input, RECEIPT_DECISIONS.NEEDS_PLAN_ADJUSTMENT, 'inspection_evidence_missing_or_ambiguous');
  }

  if (!ACCEPTED_PROJECT_FINAL_GOAL_ANSWERS.includes(projectFinalGoalAnswer(input))) {
    return baseResult(input, RECEIPT_DECISIONS.NEEDS_PLAN_ADJUSTMENT, 'project_final_goal_review_uncertain');
  }

  return baseResult(input, RECEIPT_DECISIONS.ACCEPTED_FOR_REVIEW, 'receipt_reviewable_not_ready');
}

module.exports = {
  ACCEPTED_COMMANDER_DECISIONS,
  ACCEPTED_PROJECT_FINAL_GOAL_ANSWERS,
  CONTRACT_MODE,
  CONTRACT_NAME,
  MAX_RUNTIME_CALLS,
  MAX_TARGET_SPECIFIC_RUNTIME_INSPECTIONS,
  OPERATOR_DECISION,
  RECEIPT_DECISIONS,
  REQUIRED_ALIGNMENT_FIELDS,
  ZERO_SIDE_EFFECT_COUNTERS,
  buildVcpToolBoxTargetSpecificRuntimeInspectionReceipt
};
