const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'deferred-governance-runtime-readiness-review-policy-v1';
const EXPECTED_VERSION = 'v1';

const GOVERNANCE_FAMILIES = Object.freeze([
  'memory_exclude',
  'memory_forget'
]);

const PUBLIC_MCP_TOOLS = Object.freeze([
  'record_memory',
  'search_memory',
  'memory_overview',
  'audit_memory'
]);

const REQUIRED_RUNTIME_REVIEW_INPUTS = Object.freeze([
  'internalRuntimeEntrySurfaceRef',
  'internalServiceSurfaceRef',
  'exactExecutionApprovalRef',
  'approvedContextGateRef',
  'boundedRuntimePrepRef',
  'appendOnlyAuditPlanRef',
  'shadowProjectionRef',
  'changedMemoryIdsRef',
  'governanceRevisionRef',
  'candidateCacheInvalidationRef',
  'readSuppressionPolicyRef',
  'rollbackOrCleanupRef',
  'noHardDeletePolicyRef',
  'publicMcpFreezeRef',
  'validationEvidenceRef'
]);

const REQUIRED_RUNTIME_REVIEW_OUTPUTS = Object.freeze([
  'runtimeReviewDecision',
  'requiredEvidenceRefs',
  'missingEvidenceRefs',
  'blockingFindings',
  'allowedNextStep',
  'deniedActions',
  'dirtyBaselineBlockers',
  'readinessClaimAllowed'
]);

const REQUIRED_RUNTIME_REVIEW_FLAGS = Object.freeze([
  'allPrerequisitePoliciesRequired',
  'exactFamilySurfaceRequired',
  'dryRunBeforeApplyRequired',
  'explicitApprovalRequired',
  'auditProjectionChangedIdsRevisionRequired',
  'candidateCacheReadSuppressionRequired',
  'rollbackOrCleanupRequired',
  'dirtyBaselineBlocksLiveProof',
  'publicMcpFrozen',
  'readinessClaimBlocked'
]);

const REQUIRED_FAMILY_RUNTIME_REVIEW_SURFACES = Object.freeze({
  memory_exclude: Object.freeze({
    action: 'scope_suppression_runtime_readiness_review',
    reviewReason: 'excluded_scope_suppression_runtime_review',
    decisionState: 'not_runtime_ready',
    requestSource: 'internal-memory-exclude-runtime-entry',
    contextFlag: 'internalMemoryExcludeRuntimeEntry'
  }),
  memory_forget: Object.freeze({
    action: 'governed_forget_runtime_readiness_review',
    reviewReason: 'forgotten_governance_suppression_runtime_review',
    decisionState: 'not_runtime_ready',
    requestSource: 'internal-memory-forget-runtime-entry',
    contextFlag: 'internalMemoryForgetRuntimeEntry'
  })
});

const DENIED_RUNTIME_ACTIONS = Object.freeze([
  'runtimeIntegration',
  'serviceStart',
  'liveRecallProof',
  'liveWriteProof',
  'durableMemoryWrite',
  'durableAuditWrite',
  'candidateCacheClear',
  'providerCall',
  'publicMcpExpansion',
  'configMutation',
  'readinessClaim'
]);

const NO_SIDE_EFFECT_FLAGS = Object.freeze([
  'noRuntimeIntegration',
  'noServiceStart',
  'noRuntimeProbe',
  'noLiveMemoryProof',
  'noDurableAuditWrite',
  'noDurableMemoryWrite',
  'noCandidateCacheClear',
  'noPublicMcpExpansion',
  'noProviderCall',
  'noConfigMutation',
  'noPackageChange',
  'noRemoteWrite',
  'noReadinessClaim'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? redactSensitiveFragments(value.trim()) : '';
}

function normalizeStringArray(values) {
  return Array.isArray(values)
    ? values.map(normalizeString).filter(Boolean)
    : [];
}

function normalizeBoolean(value) {
  return value === true;
}

function normalizeInteger(value) {
  return Number.isInteger(value) ? value : 0;
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function hasEveryValue(values, requiredValues) {
  return requiredValues.every(value => values.includes(value));
}

function hasExactSet(values, requiredValues) {
  return values.length === requiredValues.length &&
    uniqueValues(values).length === values.length &&
    hasEveryValue(values, requiredValues);
}

function requiredSurfaceForFamily(family) {
  return REQUIRED_FAMILY_RUNTIME_REVIEW_SURFACES[family] || {
    action: '',
    reviewReason: '',
    decisionState: '',
    requestSource: '',
    contextFlag: ''
  };
}

function normalizeFamilyReview(plan = {}) {
  const safePlan = isPlainObject(plan) ? plan : {};

  return {
    family: normalizeString(safePlan.family),
    action: normalizeString(safePlan.action),
    reviewReason: normalizeString(safePlan.reviewReason),
    decisionState: normalizeString(safePlan.decisionState),
    requestSource: normalizeString(safePlan.requestSource),
    contextFlag: normalizeString(safePlan.contextFlag),
    requiredRuntimeReviewInputs: normalizeStringArray(safePlan.requiredRuntimeReviewInputs),
    requiredRuntimeReviewOutputs: normalizeStringArray(safePlan.requiredRuntimeReviewOutputs),
    runtimeReviewFlags: normalizeStringArray(safePlan.runtimeReviewFlags),
    deniedRuntimeActions: normalizeStringArray(safePlan.deniedRuntimeActions),
    allPrerequisitePoliciesRequired: normalizeBoolean(safePlan.allPrerequisitePoliciesRequired),
    exactFamilySurfaceRequired: normalizeBoolean(safePlan.exactFamilySurfaceRequired),
    dryRunBeforeApplyRequired: normalizeBoolean(safePlan.dryRunBeforeApplyRequired),
    explicitApprovalRequired: normalizeBoolean(safePlan.explicitApprovalRequired),
    auditProjectionChangedIdsRevisionRequired: normalizeBoolean(safePlan.auditProjectionChangedIdsRevisionRequired),
    candidateCacheReadSuppressionRequired: normalizeBoolean(safePlan.candidateCacheReadSuppressionRequired),
    rollbackOrCleanupRequired: normalizeBoolean(safePlan.rollbackOrCleanupRequired),
    dirtyBaselineBlocksLiveProof: normalizeBoolean(safePlan.dirtyBaselineBlocksLiveProof),
    publicMcpTool: normalizeBoolean(safePlan.publicMcpTool),
    executionApproved: normalizeBoolean(safePlan.executionApproved),
    runtimeIntegrated: normalizeBoolean(safePlan.runtimeIntegrated),
    serviceStarted: normalizeBoolean(safePlan.serviceStarted),
    liveProofExecuted: normalizeBoolean(safePlan.liveProofExecuted),
    mutatesDurableState: normalizeBoolean(safePlan.mutatesDurableState),
    providerCalls: normalizeInteger(safePlan.providerCalls),
    readinessClaimed: normalizeBoolean(safePlan.readinessClaimed)
  };
}

function normalizeSafety(safety = {}) {
  const safeSafety = isPlainObject(safety) ? safety : {};
  const normalized = {};

  for (const flag of NO_SIDE_EFFECT_FLAGS) {
    normalized[flag] = normalizeBoolean(safeSafety[flag]);
  }

  normalized.rawSecretExposed = normalizeBoolean(safeSafety.rawSecretExposed);
  normalized.rawWorkspaceIdExposed = normalizeBoolean(safeSafety.rawWorkspaceIdExposed);
  normalized.rawPrivateMemoryExposed = normalizeBoolean(safeSafety.rawPrivateMemoryExposed);

  return normalized;
}

function normalizePolicy(policy = {}) {
  const safePolicy = isPlainObject(policy) ? policy : {};

  return {
    schemaVersion: normalizeString(safePolicy.schemaVersion),
    version: normalizeString(safePolicy.version),
    sourceMode: normalizeString(safePolicy.sourceMode),
    reviewOnly: normalizeBoolean(safePolicy.reviewOnly),
    internalOnly: normalizeBoolean(safePolicy.internalOnly),
    publicMcpExpanded: normalizeBoolean(safePolicy.publicMcpExpanded),
    executionApproved: normalizeBoolean(safePolicy.executionApproved),
    runtimeIntegrated: normalizeBoolean(safePolicy.runtimeIntegrated),
    serviceStarted: normalizeBoolean(safePolicy.serviceStarted),
    liveProofExecuted: normalizeBoolean(safePolicy.liveProofExecuted),
    readinessClaimed: normalizeBoolean(safePolicy.readinessClaimed),
    publicToolsFrozen: normalizeBoolean(safePolicy.publicToolsFrozen),
    publicTools: normalizeStringArray(safePolicy.publicTools),
    familyReviews: Array.isArray(safePolicy.familyReviews)
      ? safePolicy.familyReviews.map(normalizeFamilyReview)
      : [],
    safety: normalizeSafety(safePolicy.safety)
  };
}

function familyReviewAccepted(plan) {
  const requiredSurface = requiredSurfaceForFamily(plan.family);

  return GOVERNANCE_FAMILIES.includes(plan.family) &&
    plan.action === requiredSurface.action &&
    plan.reviewReason === requiredSurface.reviewReason &&
    plan.decisionState === requiredSurface.decisionState &&
    plan.requestSource === requiredSurface.requestSource &&
    plan.contextFlag === requiredSurface.contextFlag &&
    hasExactSet(plan.requiredRuntimeReviewInputs, REQUIRED_RUNTIME_REVIEW_INPUTS) &&
    hasExactSet(plan.requiredRuntimeReviewOutputs, REQUIRED_RUNTIME_REVIEW_OUTPUTS) &&
    hasExactSet(plan.runtimeReviewFlags, REQUIRED_RUNTIME_REVIEW_FLAGS) &&
    hasExactSet(plan.deniedRuntimeActions, DENIED_RUNTIME_ACTIONS) &&
    plan.allPrerequisitePoliciesRequired === true &&
    plan.exactFamilySurfaceRequired === true &&
    plan.dryRunBeforeApplyRequired === true &&
    plan.explicitApprovalRequired === true &&
    plan.auditProjectionChangedIdsRevisionRequired === true &&
    plan.candidateCacheReadSuppressionRequired === true &&
    plan.rollbackOrCleanupRequired === true &&
    plan.dirtyBaselineBlocksLiveProof === true &&
    plan.publicMcpTool === false &&
    plan.executionApproved === false &&
    plan.runtimeIntegrated === false &&
    plan.serviceStarted === false &&
    plan.liveProofExecuted === false &&
    plan.mutatesDurableState === false &&
    plan.providerCalls === 0 &&
    plan.readinessClaimed === false;
}

function summarizeDeferredGovernanceRuntimeReadinessReviewPolicy(policy = {}) {
  const normalized = normalizePolicy(policy);
  const familyIds = normalized.familyReviews.map(item => item.family).filter(Boolean);
  const schemaSafe = normalized.schemaVersion === EXPECTED_SCHEMA_VERSION;
  const versionSafe = normalized.version === EXPECTED_VERSION;
  const sourceSafe = normalized.sourceMode === 'explicit_input';
  const familySetExact = hasExactSet(familyIds, GOVERNANCE_FAMILIES);
  const publicMcpFrozen = normalized.publicToolsFrozen === true &&
    hasExactSet(normalized.publicTools, PUBLIC_MCP_TOOLS);
  const noGlobalExecution =
    normalized.reviewOnly === true &&
    normalized.internalOnly === true &&
    normalized.publicMcpExpanded === false &&
    normalized.executionApproved === false &&
    normalized.runtimeIntegrated === false &&
    normalized.serviceStarted === false &&
    normalized.liveProofExecuted === false &&
    normalized.readinessClaimed === false;
  const safetyClear =
    NO_SIDE_EFFECT_FLAGS.every(flag => normalized.safety[flag] === true) &&
    normalized.safety.rawSecretExposed === false &&
    normalized.safety.rawWorkspaceIdExposed === false &&
    normalized.safety.rawPrivateMemoryExposed === false;
  const familyReports = normalized.familyReviews.map(item => {
    const requiredSurface = requiredSurfaceForFamily(item.family);
    return {
      family: item.family,
      accepted: familyReviewAccepted(item),
      requiredAction: requiredSurface.action,
      action: item.action,
      requiredReviewReason: requiredSurface.reviewReason,
      reviewReason: item.reviewReason,
      requiredDecisionState: requiredSurface.decisionState,
      decisionState: item.decisionState,
      requiredRequestSource: requiredSurface.requestSource,
      requestSource: item.requestSource,
      requiredContextFlag: requiredSurface.contextFlag,
      contextFlag: item.contextFlag,
      missingRuntimeReviewInputs: REQUIRED_RUNTIME_REVIEW_INPUTS
        .filter(input => !item.requiredRuntimeReviewInputs.includes(input)),
      unexpectedRuntimeReviewInputs: item.requiredRuntimeReviewInputs
        .filter(input => !REQUIRED_RUNTIME_REVIEW_INPUTS.includes(input)),
      missingRuntimeReviewOutputs: REQUIRED_RUNTIME_REVIEW_OUTPUTS
        .filter(output => !item.requiredRuntimeReviewOutputs.includes(output)),
      unexpectedRuntimeReviewOutputs: item.requiredRuntimeReviewOutputs
        .filter(output => !REQUIRED_RUNTIME_REVIEW_OUTPUTS.includes(output)),
      missingRuntimeReviewFlags: REQUIRED_RUNTIME_REVIEW_FLAGS
        .filter(flag => !item.runtimeReviewFlags.includes(flag)),
      unexpectedRuntimeReviewFlags: item.runtimeReviewFlags
        .filter(flag => !REQUIRED_RUNTIME_REVIEW_FLAGS.includes(flag)),
      missingDeniedRuntimeActions: DENIED_RUNTIME_ACTIONS
        .filter(action => !item.deniedRuntimeActions.includes(action)),
      unexpectedDeniedRuntimeActions: item.deniedRuntimeActions
        .filter(action => !DENIED_RUNTIME_ACTIONS.includes(action)),
      allPrerequisitePoliciesRequired: item.allPrerequisitePoliciesRequired,
      explicitApprovalRequired: item.explicitApprovalRequired,
      dirtyBaselineBlocksLiveProof: item.dirtyBaselineBlocksLiveProof,
      runtimeIntegrated: false,
      serviceStarted: false,
      liveProofExecuted: false,
      readinessClaimed: false
    };
  });
  const runtimeReadinessReviewPolicyAccepted =
    schemaSafe &&
    versionSafe &&
    sourceSafe &&
    familySetExact &&
    publicMcpFrozen &&
    noGlobalExecution &&
    safetyClear &&
    familyReports.every(report => report.accepted);

  return {
    sourceMode: normalized.sourceMode || 'explicit_input',
    schemaVersion: normalized.schemaVersion,
    version: normalized.version,
    runtimeReadinessReviewPolicyAccepted,
    runtimeReady: false,
    executionApproved: false,
    runtimeIntegrated: false,
    serviceStarted: false,
    liveProofExecuted: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    publicMcpTools: {
      frozen: publicMcpFrozen,
      tools: normalized.publicTools
    },
    governedFamilies: {
      exact: familySetExact,
      required: GOVERNANCE_FAMILIES,
      present: familyIds,
      missing: GOVERNANCE_FAMILIES.filter(family => !familyIds.includes(family)),
      unexpected: familyIds.filter(family => !GOVERNANCE_FAMILIES.includes(family))
    },
    requiredRuntimeReviewInputs: REQUIRED_RUNTIME_REVIEW_INPUTS,
    requiredRuntimeReviewOutputs: REQUIRED_RUNTIME_REVIEW_OUTPUTS,
    requiredRuntimeReviewFlags: REQUIRED_RUNTIME_REVIEW_FLAGS,
    deniedRuntimeActions: DENIED_RUNTIME_ACTIONS,
    requiredFamilyRuntimeReviewSurfaces: REQUIRED_FAMILY_RUNTIME_REVIEW_SURFACES,
    familyReports,
    safety: {
      noSideEffects: safetyClear,
      readsFiles: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      mutatesDurableState: false,
      scansRealMemory: false,
      rawSecretExposed: normalized.safety.rawSecretExposed,
      rawWorkspaceIdExposed: normalized.safety.rawWorkspaceIdExposed,
      rawPrivateMemoryExposed: normalized.safety.rawPrivateMemoryExposed
    }
  };
}

module.exports = {
  DENIED_RUNTIME_ACTIONS,
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  GOVERNANCE_FAMILIES,
  NO_SIDE_EFFECT_FLAGS,
  PUBLIC_MCP_TOOLS,
  REQUIRED_FAMILY_RUNTIME_REVIEW_SURFACES,
  REQUIRED_RUNTIME_REVIEW_FLAGS,
  REQUIRED_RUNTIME_REVIEW_INPUTS,
  REQUIRED_RUNTIME_REVIEW_OUTPUTS,
  normalizePolicy,
  summarizeDeferredGovernanceRuntimeReadinessReviewPolicy
};
