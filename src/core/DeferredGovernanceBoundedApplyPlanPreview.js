const crypto = require('node:crypto');

const {
  FAMILY_SURFACES,
  GOVERNANCE_FAMILIES,
  PUBLIC_MCP_TOOLS,
  buildDryRunPlan
} = require('./DeferredGovernanceMutationPlanningService');
const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_SCHEMA_VERSION = 'deferred-governance-bounded-apply-plan-preview-v1';

const REQUIRED_RUNTIME_SURFACE_CAPABILITIES = Object.freeze([
  'suppressionProjectionPreviewAvailable',
  'appendOnlyAuditPreviewAvailable',
  'governanceRevisionPreviewAvailable',
  'changedMemoryIdsPreviewAvailable',
  'candidateCacheInvalidationPreviewAvailable',
  'readPolicySuppressionPreviewAvailable',
  'rollbackCleanupPreviewAvailable'
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
  return [...new Set(Array.isArray(values) ? values : [])];
}

function hasExactSet(values, requiredValues) {
  const unique = uniqueValues(values);
  return unique.length === requiredValues.length && requiredValues.every(value => unique.includes(value));
}

function normalizeStringArray(values) {
  return Array.isArray(values)
    ? uniqueValues(values.map(normalizeString).filter(Boolean))
    : [];
}

function normalizeRedactedValue(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeRedactedValue);
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, normalizeRedactedValue(child)])
    );
  }
  if (typeof value === 'string') {
    return normalizeString(value);
  }
  return value;
}

function normalizeRuntimeSurfaceCapabilities(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  return {
    suppressionProjectionPreviewAvailable: normalizeBoolean(safeInput.suppressionProjectionPreviewAvailable),
    appendOnlyAuditPreviewAvailable: normalizeBoolean(safeInput.appendOnlyAuditPreviewAvailable),
    governanceRevisionPreviewAvailable: normalizeBoolean(safeInput.governanceRevisionPreviewAvailable),
    changedMemoryIdsPreviewAvailable: normalizeBoolean(safeInput.changedMemoryIdsPreviewAvailable),
    candidateCacheInvalidationPreviewAvailable: normalizeBoolean(safeInput.candidateCacheInvalidationPreviewAvailable),
    readPolicySuppressionPreviewAvailable: normalizeBoolean(safeInput.readPolicySuppressionPreviewAvailable),
    rollbackCleanupPreviewAvailable: normalizeBoolean(safeInput.rollbackCleanupPreviewAvailable),
    publicToolsFrozen: normalizeBoolean(safeInput.publicToolsFrozen),
    publicTools: normalizeStringArray(safeInput.publicTools)
  };
}

function buildMissingCapabilityIds(capabilities) {
  const missing = REQUIRED_RUNTIME_SURFACE_CAPABILITIES
    .filter(name => capabilities[name] !== true)
    .map(name => `${name}_missing`);

  if (capabilities.publicToolsFrozen !== true || !hasExactSet(capabilities.publicTools, PUBLIC_MCP_TOOLS)) {
    missing.push('public_mcp_freeze_evidence_missing');
  }

  return missing;
}

function buildStablePreviewId(prefix, payload) {
  const digest = crypto.createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex')
    .slice(0, 16);
  return `${prefix}:${digest}`;
}

function normalizeInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  return {
    schemaVersion: normalizeString(safeInput.schemaVersion),
    family: normalizeString(safeInput.family),
    dryRunPayload: isPlainObject(safeInput.dryRunPayload)
      ? normalizeRedactedValue(safeInput.dryRunPayload)
      : {},
    runtimeSurfaceCapabilities: normalizeRuntimeSurfaceCapabilities(safeInput.runtimeSurfaceCapabilities),
    plannedAt: normalizeString(safeInput.plannedAt) || '<planned>',
    previewOnly: normalizeBoolean(safeInput.previewOnly),
    publicMcpExpanded: normalizeBoolean(safeInput.publicMcpExpanded),
    callToolWidened: normalizeBoolean(safeInput.callToolWidened),
    runtimeApplyRequested: normalizeBoolean(safeInput.runtimeApplyRequested),
    readinessClaimed: normalizeBoolean(safeInput.readinessClaimed)
  };
}

function planDeferredGovernanceBoundedApplyPlanPreview(input = {}) {
  const rawInput = isPlainObject(input) ? input : {};
  const rawDryRunPayload = isPlainObject(rawInput.dryRunPayload) ? rawInput.dryRunPayload : {};
  const normalized = normalizeInput(input);
  const dryRunPlan = buildDryRunPlan({
    family: normalized.family,
    payload: rawDryRunPayload
  });
  const surface = FAMILY_SURFACES[normalized.family] || null;
  const missingCapabilities = buildMissingCapabilityIds(normalized.runtimeSurfaceCapabilities);
  const blockingFindings = [];

  if (normalized.schemaVersion !== EXPECTED_SCHEMA_VERSION) {
    blockingFindings.push('schema_version_mismatch');
  }
  if (!GOVERNANCE_FAMILIES.includes(normalized.family)) {
    blockingFindings.push('unsupported_deferred_governance_family');
  }
  if (normalized.previewOnly !== true) {
    blockingFindings.push('preview_only_flag_required');
  }
  if (normalized.publicMcpExpanded === true) {
    blockingFindings.push('public_mcp_expansion_blocked');
  }
  if (normalized.callToolWidened === true) {
    blockingFindings.push('call_tool_widening_blocked');
  }
  if (normalized.runtimeApplyRequested === true || rawDryRunPayload.dryRun === false || rawDryRunPayload.confirm === true) {
    blockingFindings.push('runtime_apply_blocked');
  }
  if (normalized.readinessClaimed === true) {
    blockingFindings.push('readiness_claim_blocked');
  }
  if (dryRunPlan.success !== true) {
    blockingFindings.push('dry_run_plan_not_accepted');
  }
  blockingFindings.push(...missingCapabilities);

  const acceptedForApplyPlanPreview = blockingFindings.length === 0;
  const changedMemoryIds = Array.isArray(dryRunPlan.changedMemoryIds) ? [...dryRunPlan.changedMemoryIds] : [];
  const previewId = buildStablePreviewId('deferred-governance-apply-preview', {
    family: normalized.family,
    targetMemoryIds: dryRunPlan.targetMemoryIds || [],
    changedMemoryIds,
    plannedAt: normalized.plannedAt
  });

  return {
    sourceMode: 'explicit_input',
    schemaVersion: normalized.schemaVersion,
    expectedSchemaVersion: EXPECTED_SCHEMA_VERSION,
    acceptedForApplyPlanPreview,
    decision: acceptedForApplyPlanPreview
      ? 'BOUNDED_INTERNAL_APPLY_PLAN_PREVIEW_READY_NOT_APPROVED'
      : 'NOT_READY_BLOCKED',
    previewId,
    family: normalized.family,
    serviceName: surface?.serviceName || dryRunPlan.serviceName || null,
    serviceMethod: surface?.serviceMethod || dryRunPlan.serviceMethod || null,
    previewOnly: normalized.previewOnly,
    executionApproved: false,
    runtimeApplyBlocked: true,
    runtimeIntegrated: false,
    mutated: false,
    durableAuditWritten: false,
    durableProjectionApplied: false,
    candidateCacheCleared: false,
    providerCalled: false,
    publicMcpExpanded: false,
    callToolWidened: false,
    readinessClaimed: false,
    plannedAt: normalized.plannedAt,
    dryRunPlan: {
      accepted: dryRunPlan.success === true,
      decision: dryRunPlan.decision,
      reason: dryRunPlan.reason || '',
      targetMemoryIds: dryRunPlan.targetMemoryIds || [],
      changedMemoryIds,
      surface: dryRunPlan.surface || null,
      blockingFindings: dryRunPlan.blockingFindings || []
    },
    runtimeSurface: {
      capabilities: normalized.runtimeSurfaceCapabilities,
      missingCapabilities
    },
    applyPlanPreview: acceptedForApplyPlanPreview ? {
      steps: [
        'verify_approved_internal_context',
        'append_pending_audit_preview',
        'apply_shadow_suppression_projection_blocked',
        'emit_governance_revision_preview',
        'invalidate_target_candidate_cache_preview',
        'activate_read_policy_suppression_preview',
        'append_committed_or_cancelled_audit_preview'
      ],
      targetMemoryIds: dryRunPlan.targetMemoryIds || [],
      changedMemoryIds,
      auditPreview: dryRunPlan.appendOnlyAuditPreview,
      projectionPreview: dryRunPlan.suppressionProjectionPreview,
      governanceRevisionPreview: dryRunPlan.governanceRevision,
      candidateCacheInvalidationPreview: dryRunPlan.candidateCacheInvalidation,
      readPolicySuppressionPreview: dryRunPlan.readPolicySuppression,
      rollbackOrCleanupPlan: dryRunPlan.rollbackOrCleanupPlan
    } : null,
    blockers: {
      blockingFindings,
      dryRunAccepted: dryRunPlan.success === true,
      missingCapabilities
    },
    publicMcpTools: {
      frozen: normalized.runtimeSurfaceCapabilities.publicToolsFrozen === true &&
        hasExactSet(normalized.runtimeSurfaceCapabilities.publicTools, PUBLIC_MCP_TOOLS),
      tools: normalized.runtimeSurfaceCapabilities.publicTools,
      required: PUBLIC_MCP_TOOLS
    },
    safety: {
      noSideEffects: true,
      readsFiles: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      mutatesDurableState: false,
      scansRealMemory: false,
      durableAuditWritten: false,
      durableProjectionApplied: false,
      candidateCacheCleared: false,
      rawSecretExposed: false,
      rawPrivateMemoryExposed: false
    },
    nextStep: acceptedForApplyPlanPreview
      ? 'Keep this as preview-only evidence until a separately approved durable apply slice exists.'
      : 'Repair explicit preview inputs or runtime-surface evidence; do not execute durable governance apply.'
  };
}

module.exports = {
  EXPECTED_SCHEMA_VERSION,
  REQUIRED_RUNTIME_SURFACE_CAPABILITIES,
  normalizeDeferredGovernanceBoundedApplyPlanPreviewInput: normalizeInput,
  normalizeRuntimeSurfaceCapabilities,
  planDeferredGovernanceBoundedApplyPlanPreview
};
