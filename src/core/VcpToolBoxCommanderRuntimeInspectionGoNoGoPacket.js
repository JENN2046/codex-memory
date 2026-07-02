'use strict';

const { isSafeReferenceName } = require('./VcpToolBoxSafeReference');

const CONTRACT_NAME = 'VcpToolBoxCommanderRuntimeInspectionGoNoGoPacket';
const CONTRACT_MODE = 'fixture_commander_go_no_go_packet_only';
const OPERATOR_DECISION = 'commander_route_vcptoolbox_next_step_without_runtime_execution';

const DECISIONS = Object.freeze({
  CONTINUE_LOCAL_SAFE: 'continue_local_safe',
  BLOCKED_NEEDS_EXACT_APPROVAL: 'blocked_needs_exact_approval',
  NEEDS_PLAN_ADJUSTMENT: 'needs_plan_adjustment'
});

const REQUIRED_ALIGNMENT_FIELDS = Object.freeze([
  'master_reference_or_id',
  'stage_reference_or_id',
  'version_reference_or_id',
  'projectFinalGoalServed',
  'priorBoundaryReviewStatus'
]);

const SAFE_BOUNDARY_REVIEW_STATUSES = Object.freeze([
  'CM1701_BOUNDARY_REVIEW_PASSED',
  'CM-1701_BOUNDARY_REVIEW_PASSED',
  'REVIEW_ACCEPTED_DOCS_ONLY',
  'PASSED'
]);

const LOCAL_SAFE_NEXT_ACTION_KINDS = Object.freeze([
  'docs',
  'fixture',
  'source_contract',
  'test',
  'low_disclosure_packet_hardening'
]);

const FORBIDDEN_NEXT_ACTION_FLAGS = Object.freeze([
  'targetSpecificRuntimeInspectionRequested',
  'liveVcpToolBoxCallRequested',
  'secretConfigPrivateStateAccessRequested',
  'rawMemoryOrRuntimeOutputRequested',
  'durableMemoryWriteRequested',
  'providerApiCallRequested',
  'publicMcpExpansionRequested',
  'startupWatchdogConfigMutationRequested',
  'readinessCutoverReleaseDeployPushRequested',
  'unboundedBudgetRequested',
  'approvalLineIssueOrConsumeRequested',
  'completeV8ClaimRequested'
]);

const ZERO_COUNTERS = Object.freeze({
  runtimeCalls: 0,
  targetSpecificRuntimeInspections: 0,
  liveVcpToolBoxCalls: 0,
  memoryReads: 0,
  memoryWrites: 0,
  durableMemoryWrites: 0,
  providerApiCalls: 0,
  publicMcpExpansions: 0,
  configEnvReads: 0,
  envFileReads: 0,
  secretReads: 0,
  rawRuntimeResponsesRead: 0,
  rawMemoryReads: 0,
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
  locatorvalue: 'locator_endpoint_or_path',
  path: 'locator_endpoint_or_path',
  filepath: 'locator_endpoint_or_path',
  absolutepath: 'locator_endpoint_or_path',
  targetpath: 'locator_endpoint_or_path',
  endpoint: 'locator_endpoint_or_path',
  url: 'locator_endpoint_or_path',
  baseurl: 'locator_endpoint_or_path',

  env: 'secret_config_private_state',
  envfile: 'secret_config_private_state',
  configenv: 'secret_config_private_state',
  configenvpath: 'secret_config_private_state',
  privatestate: 'secret_config_private_state',
  privateruntimestate: 'secret_config_private_state',
  credentials: 'secret_config_private_state',
  credential: 'secret_config_private_state',
  cookie: 'secret_config_private_state',
  token: 'secret_config_private_state',
  bearertoken: 'secret_config_private_state',
  apikey: 'secret_config_private_state',
  providerapikey: 'secret_config_private_state',
  sharedsecret: 'secret_config_private_state',
  privatekey: 'secret_config_private_state',
  password: 'secret_config_private_state',

  exactapprovalline: 'approval_line_or_private_approval_material',
  approvalline: 'approval_line_or_private_approval_material',
  approvalphrase: 'approval_line_or_private_approval_material',
  approvaltext: 'approval_line_or_private_approval_material',
  approvaltoken: 'approval_line_or_private_approval_material',
  approvaltokenvalue: 'approval_line_or_private_approval_material',
  exactapprovaltoken: 'approval_line_or_private_approval_material',

  targetcommit: 'commit_branch_or_expiry_value',
  origincommit: 'commit_branch_or_expiry_value',
  headcommit: 'commit_branch_or_expiry_value',
  commithash: 'commit_branch_or_expiry_value',
  commit: 'commit_branch_or_expiry_value',
  branch: 'commit_branch_or_expiry_value',
  branchname: 'commit_branch_or_expiry_value',
  expiry: 'commit_branch_or_expiry_value',
  expiryvalue: 'commit_branch_or_expiry_value',
  expiresat: 'commit_branch_or_expiry_value',
  expiresatvalue: 'commit_branch_or_expiry_value',

  rawtargetvalue: 'raw_memory_or_runtime_output',
  rawruntimeresponse: 'raw_memory_or_runtime_output',
  runtimeresponse: 'raw_memory_or_runtime_output',
  rawmemory: 'raw_memory_or_runtime_output',
  rawmemorycontent: 'raw_memory_or_runtime_output',
  rawdailynote: 'raw_memory_or_runtime_output',
  rawdailynotecontent: 'raw_memory_or_runtime_output',
  dailynotecontent: 'raw_memory_or_runtime_output',
  rawraginjectedcontext: 'raw_memory_or_runtime_output',
  ragcontext: 'raw_memory_or_runtime_output',
  rawvectorrows: 'raw_memory_or_runtime_output',
  vectorrows: 'raw_memory_or_runtime_output',
  rawprompt: 'raw_memory_or_runtime_output',
  promptcontent: 'raw_memory_or_runtime_output',
  rawconversation: 'raw_memory_or_runtime_output',
  sqlitecontent: 'raw_memory_or_runtime_output',
  jsonlcontent: 'raw_memory_or_runtime_output',
  cachecontent: 'raw_memory_or_runtime_output',
  providerresponse: 'provider_response',
  rawproviderresponse: 'provider_response'
});

const FORBIDDEN_FLAG_ALIASES = Object.freeze({
  targetSpecificRuntimeInspectionRequested: [
    'targetSpecificRuntimeInspectionRequested',
    'targetSpecificRuntimeInspection',
    'runtimeInspectionRequested'
  ],
  liveVcpToolBoxCallRequested: [
    'liveVcpToolBoxCallRequested',
    'liveVcpToolBoxCall',
    'vcpToolBoxCallRequested'
  ],
  secretConfigPrivateStateAccessRequested: [
    'secretConfigPrivateStateAccessRequested',
    'secretAccessRequested',
    'configAccessRequested',
    'privateStateAccessRequested'
  ],
  rawMemoryOrRuntimeOutputRequested: [
    'rawMemoryOrRuntimeOutputRequested',
    'rawMemoryRequested',
    'rawRuntimeOutputRequested'
  ],
  durableMemoryWriteRequested: [
    'durableMemoryWriteRequested',
    'memoryWriteRequested',
    'vcpWriteRequested'
  ],
  providerApiCallRequested: [
    'providerApiCallRequested',
    'providerCallRequested',
    'apiCallRequested'
  ],
  publicMcpExpansionRequested: [
    'publicMcpExpansionRequested',
    'mcpExpansionRequested'
  ],
  startupWatchdogConfigMutationRequested: [
    'startupWatchdogConfigMutationRequested',
    'startupMutationRequested',
    'watchdogMutationRequested',
    'configMutationRequested'
  ],
  readinessCutoverReleaseDeployPushRequested: [
    'readinessCutoverReleaseDeployPushRequested',
    'readinessClaimRequested',
    'cutoverRequested',
    'releaseRequested',
    'deployRequested',
    'pushRequested',
    'prRequested'
  ],
  unboundedBudgetRequested: [
    'unboundedBudgetRequested',
    'unboundedBudget'
  ],
  approvalLineIssueOrConsumeRequested: [
    'approvalLineIssueOrConsumeRequested',
    'approvalLineIssueRequested',
    'approvalLineConsumeRequested'
  ],
  completeV8ClaimRequested: [
    'completeV8ClaimRequested',
    'completeV8Requested'
  ]
});

const UNSAFE_FIELD_CONTROL_KEYS = new Set(
  Object.values(FORBIDDEN_FLAG_ALIASES)
    .flat()
    .map(normalizeKey)
);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeKey(value) {
  return String(value || '').replace(/[-_\s]/g, '').toLowerCase();
}

function safeReferenceOrNull(value) {
  return isSafeReferenceName(value) ? value : null;
}

function safeStatusOrNull(value) {
  return isSafeReferenceName(value) ? value : null;
}

function hasPresentValue(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function firstSafeReference(values) {
  for (const value of values) {
    const safe = safeReferenceOrNull(value);
    if (safe) return safe;
  }
  return null;
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
      if (UNSAFE_FIELD_CONTROL_KEYS.has(normalized)) {
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

function actionKind(input) {
  const nextAction = isPlainObject(input.requestedNextAction) ? input.requestedNextAction : {};
  return nextAction.actionKind || nextAction.kind || nextAction.type || input.nextActionKind || null;
}

function actionId(input) {
  const nextAction = isPlainObject(input.requestedNextAction) ? input.requestedNextAction : {};
  return firstSafeReference([nextAction.actionId, nextAction.id, input.nextActionId]);
}

function inferForbiddenFlagsFromActionKind(kind) {
  if (typeof kind !== 'string') return [];
  const normalized = normalizeKey(kind);
  const flags = [];
  if (normalized.includes('targetspecificruntimeinspection') ||
    normalized === 'runtimeinspection') {
    flags.push('targetSpecificRuntimeInspectionRequested');
  }
  if (normalized.includes('livevcptoolbox') || normalized.includes('vcptoolboxcall')) {
    flags.push('liveVcpToolBoxCallRequested');
  }
  if (normalized.includes('secret') || normalized.includes('privatestate')) {
    flags.push('secretConfigPrivateStateAccessRequested');
  }
  if (normalized.includes('rawmemory') || normalized.includes('rawruntime')) {
    flags.push('rawMemoryOrRuntimeOutputRequested');
  }
  if (normalized.includes('durablememorywrite') || normalized.includes('vcpwrite')) {
    flags.push('durableMemoryWriteRequested');
  }
  if (normalized.includes('provider') || normalized.includes('apicall')) {
    flags.push('providerApiCallRequested');
  }
  if (normalized.includes('publicmcp')) {
    flags.push('publicMcpExpansionRequested');
  }
  if (normalized.includes('startup') || normalized.includes('watchdog') ||
    normalized.includes('configmutation')) {
    flags.push('startupWatchdogConfigMutationRequested');
  }
  if (normalized.includes('readiness') || normalized.includes('cutover') ||
    normalized.includes('release') || normalized.includes('deploy') ||
    normalized === 'push' || normalized === 'pr') {
    flags.push('readinessCutoverReleaseDeployPushRequested');
  }
  if (normalized.includes('approvalline')) {
    flags.push('approvalLineIssueOrConsumeRequested');
  }
  if (normalized.includes('completev8')) {
    flags.push('completeV8ClaimRequested');
  }
  return flags;
}

function budgetRequestsUnbounded(input) {
  const nextAction = isPlainObject(input.requestedNextAction) ? input.requestedNextAction : {};
  const budget = isPlainObject(nextAction.budget) ? nextAction.budget : input.budget;
  if (!isPlainObject(budget)) return false;
  return budget.unbounded === true ||
    budget.unboundedBudget === true ||
    Object.values(budget).some(value => value === 'unbounded' || value === 'uncapped');
}

function collectForbiddenNextActionFlags(input) {
  const found = new Set(inferForbiddenFlagsFromActionKind(actionKind(input)));

  const containers = [
    input.nextActionFlags,
    input.forbiddenNextActionFlags,
    isPlainObject(input.requestedNextAction) ? input.requestedNextAction.flags : null,
    isPlainObject(input.requestedNextAction) ? input.requestedNextAction.forbiddenFlags : null,
    isPlainObject(input.requestedNextAction) ? input.requestedNextAction : null
  ].filter(isPlainObject);

  for (const container of containers) {
    for (const [flag, aliases] of Object.entries(FORBIDDEN_FLAG_ALIASES)) {
      if (aliases.some(alias => container[alias] === true)) {
        found.add(flag);
      }
    }
  }
  if (budgetRequestsUnbounded(input)) found.add('unboundedBudgetRequested');
  return [...found].sort();
}

function hasSafeBoundaryReviewStatus(input) {
  const statuses = [
    input.priorBoundaryReviewStatus,
    input.cm1701BoundaryReviewStatus,
    getNested(input, ['priorBoundaryReview', 'status']),
    getNested(input, ['cm1701', 'status'])
  ];

  const evidencePackets = Array.isArray(input.evidencePackets) ? input.evidencePackets : [];
  for (const packet of evidencePackets) {
    if (!isPlainObject(packet)) continue;
    const id = packet.evidenceId || packet.versionId || packet.taskId || packet.id;
    if (id === 'CM-1701' || id === 'CM1701') {
      statuses.push(packet.status, packet.reviewStatus, packet.decision);
    }
  }

  return statuses.some(status => SAFE_BOUNDARY_REVIEW_STATUSES.includes(status));
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
    ['stage', 'id'],
    ['stage', 'stageId']
  ]);
  const versionPresent = hasAnyPresent(input, [
    ['versionReference'],
    ['versionId'],
    ['version', 'reference'],
    ['version', 'id'],
    ['version', 'versionId']
  ]);
  const projectFinalGoalServed = input.projectFinalGoalServed === true ||
    getNested(input, ['alignment', 'projectFinalGoalServed']) === true;
  const priorBoundaryReviewPassed = hasSafeBoundaryReviewStatus(input);

  return {
    masterPresent,
    stagePresent,
    versionPresent,
    projectFinalGoalServed,
    priorBoundaryReviewPassed,
    missingAlignmentFields: [
      masterPresent ? null : 'master_reference_or_id',
      stagePresent ? null : 'stage_reference_or_id',
      versionPresent ? null : 'version_reference_or_id',
      projectFinalGoalServed ? null : 'projectFinalGoalServed',
      priorBoundaryReviewPassed ? null : 'priorBoundaryReviewStatus'
    ].filter(Boolean)
  };
}

function sanitizeEvidencePacket(packet) {
  if (!isPlainObject(packet)) return null;
  const evidenceId = firstSafeReference([
    packet.evidenceId,
    packet.versionId,
    packet.taskId,
    packet.packetId,
    packet.id
  ]);
  const status = safeStatusOrNull(packet.status || packet.reviewStatus || packet.decision);
  if (!evidenceId && !status) return null;
  return { evidenceId, status };
}

function lowDisclosureEvidence(input) {
  const packets = Array.isArray(input.evidencePackets) ? input.evidencePackets : [];
  return packets
    .map(sanitizeEvidencePacket)
    .filter(Boolean)
    .slice(0, 8);
}

function lowDisclosureProjection(input) {
  const kind = actionKind(input);
  return {
    masterId: firstSafeReference([
      input.masterTaskbookId,
      getNested(input, ['master', 'id'])
    ]),
    stageId: firstSafeReference([
      input.stageId,
      getNested(input, ['stage', 'id']),
      getNested(input, ['stage', 'stageId'])
    ]),
    versionId: firstSafeReference([
      input.versionId,
      getNested(input, ['version', 'id']),
      getNested(input, ['version', 'versionId'])
    ]),
    priorVersionId: firstSafeReference([
      input.priorVersionId,
      getNested(input, ['priorVersion', 'id'])
    ]),
    requestedNextActionId: actionId(input),
    requestedNextActionKind: LOCAL_SAFE_NEXT_ACTION_KINDS.includes(kind) ? kind : null,
    evidence: lowDisclosureEvidence(input)
  };
}

function baseResult(input, decision, reasonCode, details = {}) {
  const alignment = isPlainObject(input) ? alignmentStatus(input) : {
    masterPresent: false,
    stagePresent: false,
    versionPresent: false,
    projectFinalGoalServed: false,
    priorBoundaryReviewPassed: false,
    missingAlignmentFields: [...REQUIRED_ALIGNMENT_FIELDS]
  };

  return {
    accepted: decision === DECISIONS.CONTINUE_LOCAL_SAFE,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    operatorDecision: OPERATOR_DECISION,
    decision,
    reasonCode,
    lowDisclosure: true,
    lowDisclosureProjection: isPlainObject(input) ? lowDisclosureProjection(input) : lowDisclosureProjection({}),
    alignment: {
      masterPresent: alignment.masterPresent,
      stagePresent: alignment.stagePresent,
      versionPresent: alignment.versionPresent,
      projectFinalGoalServed: alignment.projectFinalGoalServed,
      priorBoundaryReviewPassed: alignment.priorBoundaryReviewPassed,
      missingAlignmentFields: alignment.missingAlignmentFields
    },
    unsafeFieldCount: details.unsafeFieldCount || 0,
    unsafeFieldCategories: details.unsafeFieldCategories || [],
    forbiddenNextActionFlags: details.forbiddenNextActionFlags || [],
    localSafeNextActionKinds: [...LOCAL_SAFE_NEXT_ACTION_KINDS],
    outputPolicy: {
      lowDisclosureOnly: true,
      pathValuesIncluded: false,
      endpointValuesIncluded: false,
      tokenValuesIncluded: false,
      approvalLineValuesIncluded: false,
      commitBranchExpiryValuesIncluded: false,
      rawRuntimeOutputIncluded: false,
      rawMemoryIncluded: false,
      providerResponsesIncluded: false
    },
    localSafeCounters: { ...ZERO_COUNTERS },
    exactApprovalLineIssued: false,
    approvalLineConsumed: false,
    runtimeCallsMade: false,
    targetSpecificRuntimeInspectionExecuted: false,
    liveVcpToolBoxCalled: false,
    configEnvRead: false,
    envFileRead: false,
    rawMemoryRead: false,
    memoryWritten: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    cutoverClaimed: false,
    releaseClaimed: false,
    deployClaimed: false,
    pushPerformed: false,
    pullRequestCreated: false,
    completeV8Claimed: false
  };
}

function buildVcpToolBoxCommanderRuntimeInspectionGoNoGoPacket(input = {}) {
  if (!isPlainObject(input)) {
    return baseResult({}, DECISIONS.NEEDS_PLAN_ADJUSTMENT, 'input_not_plain_object');
  }

  const unsafeFields = collectUnsafeFieldCategories(input);
  if (unsafeFields.unsafeFieldCount > 0) {
    return baseResult(input, DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL, 'unsafe_sensitive_or_raw_fields_present', {
      unsafeFieldCount: unsafeFields.unsafeFieldCount,
      unsafeFieldCategories: unsafeFields.unsafeFieldCategories
    });
  }

  const forbiddenNextActionFlags = collectForbiddenNextActionFlags(input);
  if (forbiddenNextActionFlags.length > 0) {
    return baseResult(input, DECISIONS.BLOCKED_NEEDS_EXACT_APPROVAL, 'forbidden_next_action_requested', {
      forbiddenNextActionFlags
    });
  }

  const alignment = alignmentStatus(input);
  if (alignment.missingAlignmentFields.length > 0) {
    const reasonCode = alignment.priorBoundaryReviewPassed
      ? 'alignment_missing_or_ambiguous'
      : 'prior_boundary_review_not_passed_or_missing';
    return baseResult(input, DECISIONS.NEEDS_PLAN_ADJUSTMENT, reasonCode);
  }

  const kind = actionKind(input);
  if (!LOCAL_SAFE_NEXT_ACTION_KINDS.includes(kind)) {
    return baseResult(input, DECISIONS.NEEDS_PLAN_ADJUSTMENT, 'next_action_not_local_safe_or_ambiguous');
  }

  return baseResult(input, DECISIONS.CONTINUE_LOCAL_SAFE, 'local_safe_next_step');
}

module.exports = {
  CONTRACT_MODE,
  CONTRACT_NAME,
  DECISIONS,
  FORBIDDEN_NEXT_ACTION_FLAGS,
  LOCAL_SAFE_NEXT_ACTION_KINDS,
  OPERATOR_DECISION,
  REQUIRED_ALIGNMENT_FIELDS,
  SAFE_BOUNDARY_REVIEW_STATUSES,
  ZERO_COUNTERS,
  buildVcpToolBoxCommanderRuntimeInspectionGoNoGoPacket
};
