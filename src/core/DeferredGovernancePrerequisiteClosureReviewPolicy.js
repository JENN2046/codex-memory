const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'deferred-governance-prerequisite-closure-review-policy-v1';
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

const REQUIRED_PREREQUISITE_EVIDENCE = Object.freeze([
  'no_hard_delete_policy',
  'scope_pollution_read_policy',
  'candidate_cache_invalidation_policy',
  'exact_execution_approval_policy',
  'approved_context_gate_policy',
  'bounded_runtime_prep_policy',
  'internal_service_surface_policy',
  'internal_runtime_entry_surface_policy',
  'append_only_audit_plan_policy',
  'shadow_projection_policy',
  'changed_memory_ids_policy',
  'governance_revision_policy',
  'runtime_readiness_review_policy'
]);

const REQUIRED_CLOSURE_INPUTS = Object.freeze([
  'family',
  'evidenceRefs',
  'validationRefs',
  'blockingRefs',
  'dirtyBaselineState',
  'publicMcpTools',
  'reviewedAt'
]);

const REQUIRED_CLOSURE_OUTPUTS = Object.freeze([
  'prerequisiteClosureDecision',
  'acceptedEvidenceRefs',
  'missingEvidenceRefs',
  'unexpectedEvidenceRefs',
  'blockedRuntimeActions',
  'nextSafeStep',
  'readinessClaimAllowed'
]);

const REQUIRED_CLOSURE_FLAGS = Object.freeze([
  'allPrerequisitesAccountedFor',
  'exactFamilySetRequired',
  'exactValidationRefsRequired',
  'publicMcpFrozen',
  'runtimeApplyBlocked',
  'dirtyBaselineBlocksLiveProof',
  'readinessClaimBlocked',
  'noProviderRequired',
  'noConfigMutation',
  'noRemoteWrite'
]);

const DENIED_RUNTIME_ACTIONS = Object.freeze([
  'runtimeApply',
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

const REQUIRED_FAMILY_CLOSURE_SURFACES = Object.freeze({
  memory_exclude: Object.freeze({
    action: 'scope_suppression_prerequisite_closure_review',
    closureState: 'prerequisites_closed_for_review_not_runtime_ready',
    requestSource: 'internal-memory-exclude-runtime-entry',
    contextFlag: 'internalMemoryExcludeRuntimeEntry'
  }),
  memory_forget: Object.freeze({
    action: 'governed_forget_prerequisite_closure_review',
    closureState: 'prerequisites_closed_for_review_not_runtime_ready',
    requestSource: 'internal-memory-forget-runtime-entry',
    contextFlag: 'internalMemoryForgetRuntimeEntry'
  })
});

const NO_SIDE_EFFECT_FLAGS = Object.freeze([
  'noRuntimeApply',
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
  return REQUIRED_FAMILY_CLOSURE_SURFACES[family] || {
    action: '',
    closureState: '',
    requestSource: '',
    contextFlag: ''
  };
}

function normalizeFamilyClosure(plan = {}) {
  const safePlan = isPlainObject(plan) ? plan : {};

  return {
    family: normalizeString(safePlan.family),
    action: normalizeString(safePlan.action),
    closureState: normalizeString(safePlan.closureState),
    requestSource: normalizeString(safePlan.requestSource),
    contextFlag: normalizeString(safePlan.contextFlag),
    requiredClosureInputs: normalizeStringArray(safePlan.requiredClosureInputs),
    requiredClosureOutputs: normalizeStringArray(safePlan.requiredClosureOutputs),
    closureFlags: normalizeStringArray(safePlan.closureFlags),
    evidenceRefs: normalizeStringArray(safePlan.evidenceRefs),
    validationRefs: normalizeStringArray(safePlan.validationRefs),
    deniedRuntimeActions: normalizeStringArray(safePlan.deniedRuntimeActions),
    allPrerequisitesAccountedFor: normalizeBoolean(safePlan.allPrerequisitesAccountedFor),
    exactFamilySetRequired: normalizeBoolean(safePlan.exactFamilySetRequired),
    exactValidationRefsRequired: normalizeBoolean(safePlan.exactValidationRefsRequired),
    publicMcpFrozen: normalizeBoolean(safePlan.publicMcpFrozen),
    runtimeApplyBlocked: normalizeBoolean(safePlan.runtimeApplyBlocked),
    dirtyBaselineBlocksLiveProof: normalizeBoolean(safePlan.dirtyBaselineBlocksLiveProof),
    readinessClaimBlocked: normalizeBoolean(safePlan.readinessClaimBlocked),
    noProviderRequired: normalizeBoolean(safePlan.noProviderRequired),
    noConfigMutation: normalizeBoolean(safePlan.noConfigMutation),
    noRemoteWrite: normalizeBoolean(safePlan.noRemoteWrite),
    publicMcpTool: normalizeBoolean(safePlan.publicMcpTool),
    executionApproved: normalizeBoolean(safePlan.executionApproved),
    runtimeIntegrated: normalizeBoolean(safePlan.runtimeIntegrated),
    runtimeApplied: normalizeBoolean(safePlan.runtimeApplied),
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
    runtimeApplied: normalizeBoolean(safePolicy.runtimeApplied),
    serviceStarted: normalizeBoolean(safePolicy.serviceStarted),
    liveProofExecuted: normalizeBoolean(safePolicy.liveProofExecuted),
    readinessClaimed: normalizeBoolean(safePolicy.readinessClaimed),
    publicToolsFrozen: normalizeBoolean(safePolicy.publicToolsFrozen),
    publicTools: normalizeStringArray(safePolicy.publicTools),
    familyClosures: Array.isArray(safePolicy.familyClosures)
      ? safePolicy.familyClosures.map(normalizeFamilyClosure)
      : [],
    safety: normalizeSafety(safePolicy.safety)
  };
}

function familyClosureAccepted(plan) {
  const requiredSurface = requiredSurfaceForFamily(plan.family);

  return GOVERNANCE_FAMILIES.includes(plan.family) &&
    plan.action === requiredSurface.action &&
    plan.closureState === requiredSurface.closureState &&
    plan.requestSource === requiredSurface.requestSource &&
    plan.contextFlag === requiredSurface.contextFlag &&
    hasExactSet(plan.requiredClosureInputs, REQUIRED_CLOSURE_INPUTS) &&
    hasExactSet(plan.requiredClosureOutputs, REQUIRED_CLOSURE_OUTPUTS) &&
    hasExactSet(plan.closureFlags, REQUIRED_CLOSURE_FLAGS) &&
    hasExactSet(plan.evidenceRefs, REQUIRED_PREREQUISITE_EVIDENCE) &&
    hasExactSet(plan.validationRefs, REQUIRED_PREREQUISITE_EVIDENCE) &&
    hasExactSet(plan.deniedRuntimeActions, DENIED_RUNTIME_ACTIONS) &&
    plan.allPrerequisitesAccountedFor === true &&
    plan.exactFamilySetRequired === true &&
    plan.exactValidationRefsRequired === true &&
    plan.publicMcpFrozen === true &&
    plan.runtimeApplyBlocked === true &&
    plan.dirtyBaselineBlocksLiveProof === true &&
    plan.readinessClaimBlocked === true &&
    plan.noProviderRequired === true &&
    plan.noConfigMutation === true &&
    plan.noRemoteWrite === true &&
    plan.publicMcpTool === false &&
    plan.executionApproved === false &&
    plan.runtimeIntegrated === false &&
    plan.runtimeApplied === false &&
    plan.serviceStarted === false &&
    plan.liveProofExecuted === false &&
    plan.mutatesDurableState === false &&
    plan.providerCalls === 0 &&
    plan.readinessClaimed === false;
}

function summarizeDeferredGovernancePrerequisiteClosureReviewPolicy(policy = {}) {
  const normalized = normalizePolicy(policy);
  const familyIds = normalized.familyClosures.map(item => item.family).filter(Boolean);
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
    normalized.runtimeApplied === false &&
    normalized.serviceStarted === false &&
    normalized.liveProofExecuted === false &&
    normalized.readinessClaimed === false;
  const safetyClear =
    NO_SIDE_EFFECT_FLAGS.every(flag => normalized.safety[flag] === true) &&
    normalized.safety.rawSecretExposed === false &&
    normalized.safety.rawWorkspaceIdExposed === false &&
    normalized.safety.rawPrivateMemoryExposed === false;
  const familyReports = normalized.familyClosures.map(item => {
    const requiredSurface = requiredSurfaceForFamily(item.family);
    return {
      family: item.family,
      accepted: familyClosureAccepted(item),
      requiredAction: requiredSurface.action,
      action: item.action,
      requiredClosureState: requiredSurface.closureState,
      closureState: item.closureState,
      requiredRequestSource: requiredSurface.requestSource,
      requestSource: item.requestSource,
      requiredContextFlag: requiredSurface.contextFlag,
      contextFlag: item.contextFlag,
      missingClosureInputs: REQUIRED_CLOSURE_INPUTS
        .filter(input => !item.requiredClosureInputs.includes(input)),
      unexpectedClosureInputs: item.requiredClosureInputs
        .filter(input => !REQUIRED_CLOSURE_INPUTS.includes(input)),
      missingClosureOutputs: REQUIRED_CLOSURE_OUTPUTS
        .filter(output => !item.requiredClosureOutputs.includes(output)),
      unexpectedClosureOutputs: item.requiredClosureOutputs
        .filter(output => !REQUIRED_CLOSURE_OUTPUTS.includes(output)),
      missingClosureFlags: REQUIRED_CLOSURE_FLAGS
        .filter(flag => !item.closureFlags.includes(flag)),
      unexpectedClosureFlags: item.closureFlags
        .filter(flag => !REQUIRED_CLOSURE_FLAGS.includes(flag)),
      missingEvidenceRefs: REQUIRED_PREREQUISITE_EVIDENCE
        .filter(ref => !item.evidenceRefs.includes(ref)),
      unexpectedEvidenceRefs: item.evidenceRefs
        .filter(ref => !REQUIRED_PREREQUISITE_EVIDENCE.includes(ref)),
      missingValidationRefs: REQUIRED_PREREQUISITE_EVIDENCE
        .filter(ref => !item.validationRefs.includes(ref)),
      missingDeniedRuntimeActions: DENIED_RUNTIME_ACTIONS
        .filter(action => !item.deniedRuntimeActions.includes(action)),
      allPrerequisitesAccountedFor: item.allPrerequisitesAccountedFor,
      runtimeApplyBlocked: item.runtimeApplyBlocked,
      dirtyBaselineBlocksLiveProof: item.dirtyBaselineBlocksLiveProof,
      readinessClaimBlocked: item.readinessClaimBlocked,
      runtimeApplied: false,
      runtimeIntegrated: false,
      serviceStarted: false,
      liveProofExecuted: false,
      readinessClaimed: false
    };
  });
  const prerequisiteClosureReviewAccepted =
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
    prerequisiteClosureReviewAccepted,
    prerequisitesAccountedFor: prerequisiteClosureReviewAccepted,
    runtimeReady: false,
    executionApproved: false,
    runtimeApplied: false,
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
    requiredPrerequisiteEvidence: REQUIRED_PREREQUISITE_EVIDENCE,
    requiredClosureInputs: REQUIRED_CLOSURE_INPUTS,
    requiredClosureOutputs: REQUIRED_CLOSURE_OUTPUTS,
    requiredClosureFlags: REQUIRED_CLOSURE_FLAGS,
    deniedRuntimeActions: DENIED_RUNTIME_ACTIONS,
    requiredFamilyClosureSurfaces: REQUIRED_FAMILY_CLOSURE_SURFACES,
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
  REQUIRED_CLOSURE_FLAGS,
  REQUIRED_CLOSURE_INPUTS,
  REQUIRED_CLOSURE_OUTPUTS,
  REQUIRED_FAMILY_CLOSURE_SURFACES,
  REQUIRED_PREREQUISITE_EVIDENCE,
  normalizePolicy,
  summarizeDeferredGovernancePrerequisiteClosureReviewPolicy
};
