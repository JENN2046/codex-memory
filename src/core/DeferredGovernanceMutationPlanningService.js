const { formatSecretRejectionReason, scanMemoryWritePayload } = require('./SecretScanner');
const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');
const { ToolArgumentValidationError, validateArgumentsAgainstSchema } = require('./ToolArgumentValidator');

const PUBLIC_MCP_TOOLS = Object.freeze([
  'record_memory',
  'search_memory',
  'memory_overview',
  'audit_memory'
]);

const GOVERNANCE_FAMILIES = Object.freeze([
  'memory_exclude',
  'memory_forget'
]);

const FAMILY_SURFACES = Object.freeze({
  memory_exclude: Object.freeze({
    serviceName: 'MemoryExcludeGovernanceService',
    serviceMethod: 'planMemoryExclude',
    requestSource: 'internal-memory-exclude-runtime-entry',
    contextFlag: 'internalMemoryExcludeRuntimeEntry',
    action: 'scope_suppression_projection',
    projectionStates: Object.freeze(['excluded', 'scope_suppressed']),
    revisionReason: 'excluded_scope_suppression_revision',
    readPolicySuppression: 'exclude_from_normal_recall_and_candidate_generation'
  }),
  memory_forget: Object.freeze({
    serviceName: 'MemoryForgetGovernanceService',
    serviceMethod: 'planMemoryForget',
    requestSource: 'internal-memory-forget-runtime-entry',
    contextFlag: 'internalMemoryForgetRuntimeEntry',
    action: 'governed_forget_suppression_projection',
    projectionStates: Object.freeze(['forgotten', 'governance_suppressed']),
    revisionReason: 'forgotten_governance_suppression_revision',
    readPolicySuppression: 'forget_from_normal_recall_and_candidate_generation'
  })
});

const DEFERRED_GOVERNANCE_MUTATION_PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'targetMemoryIds',
    'scopeTuple',
    'actorClientId',
    'approvalId',
    'requestSource',
    'contextFlag',
    'reason',
    'evidenceSummary',
    'auditCorrelationId'
  ],
  properties: {
    targetMemoryIds: {
      type: 'array',
      items: { type: 'string' }
    },
    scopeTuple: {
      type: 'object',
      additionalProperties: false,
      properties: {
        projectId: { type: 'string' },
        workspaceId: { type: 'string' },
        clientId: { type: 'string' },
        taskId: { type: 'string' },
        conversationId: { type: 'string' },
        visibility: { type: 'string' }
      }
    },
    actorClientId: { type: 'string' },
    approvalId: { type: 'string' },
    requestSource: { type: 'string' },
    contextFlag: { type: 'string' },
    reason: { type: 'string' },
    evidenceSummary: { type: 'string' },
    auditCorrelationId: { type: 'string' },
    dryRun: { type: 'boolean' },
    confirm: { type: 'boolean' }
  }
};

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? redactSensitiveFragments(value.trim()) : '';
}

function normalizeStringArray(values) {
  return Array.isArray(values)
    ? [...new Set(values.map(normalizeString).filter(Boolean))]
    : [];
}

function normalizeScopeTuple(scopeTuple = {}) {
  if (!isPlainObject(scopeTuple)) {
    return {};
  }

  const normalized = {};
  for (const key of ['projectId', 'workspaceId', 'clientId', 'taskId', 'conversationId', 'visibility']) {
    const value = normalizeString(scopeTuple[key]);
    if (!value) continue;
    normalized[key] = /^(projectId|workspaceId|clientId|taskId|conversationId)$/.test(key)
      ? '<redacted>'
      : value;
  }
  return normalized;
}

function normalizePayload(payload = {}) {
  const safePayload = isPlainObject(payload) ? payload : {};
  return {
    targetMemoryIds: normalizeStringArray(safePayload.targetMemoryIds),
    scopeTuple: normalizeScopeTuple(safePayload.scopeTuple),
    actorClientId: normalizeString(safePayload.actorClientId),
    approvalId: normalizeString(safePayload.approvalId),
    requestSource: normalizeString(safePayload.requestSource),
    contextFlag: normalizeString(safePayload.contextFlag),
    reason: normalizeString(safePayload.reason),
    evidenceSummary: normalizeString(safePayload.evidenceSummary),
    auditCorrelationId: normalizeString(safePayload.auditCorrelationId),
    dryRun: safePayload.dryRun !== false,
    confirm: safePayload.confirm === true
  };
}

function requiredSurfaceForFamily(family) {
  return FAMILY_SURFACES[family] || null;
}

function buildRejectedResult({ family, payload = {}, reason, dryRun = true }) {
  const surface = requiredSurfaceForFamily(family) || {};
  const normalized = normalizePayload(payload);

  return {
    success: false,
    decision: 'rejected',
    family,
    serviceName: surface.serviceName || null,
    serviceMethod: surface.serviceMethod || null,
    dryRun,
    mutated: false,
    runtimeApplyBlocked: true,
    runtimeIntegrated: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    targetMemoryIds: normalized.targetMemoryIds,
    reason,
    blockingFindings: [reason],
    safety: {
      noSideEffects: true,
      readsFiles: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      mutatesDurableState: false,
      scansRealMemory: false,
      durableAuditWritten: false,
      durableProjectionApplied: false
    },
    publicMcpTools: {
      frozen: true,
      tools: PUBLIC_MCP_TOOLS
    }
  };
}

function validateSurface(family, normalizedPayload) {
  const surface = requiredSurfaceForFamily(family);
  if (!surface) {
    return 'unsupported deferred governance family.';
  }
  if (normalizedPayload.requestSource !== surface.requestSource) {
    return `${family} requires requestSource=${surface.requestSource}.`;
  }
  if (normalizedPayload.contextFlag !== surface.contextFlag) {
    return `${family} requires contextFlag=${surface.contextFlag}.`;
  }
  return null;
}

function validateNormalizedPayload(family, normalizedPayload) {
  if (!GOVERNANCE_FAMILIES.includes(family)) {
    return 'unsupported deferred governance family.';
  }
  if (normalizedPayload.targetMemoryIds.length === 0) {
    return 'targetMemoryIds must contain at least one memory id.';
  }
  if (Object.keys(normalizedPayload.scopeTuple).length === 0) {
    return 'scopeTuple must contain at least one scoped value.';
  }
  for (const field of ['actorClientId', 'approvalId', 'reason', 'evidenceSummary', 'auditCorrelationId']) {
    if (!normalizedPayload[field]) {
      return `${field} is required.`;
    }
  }
  if (normalizedPayload.dryRun !== true || normalizedPayload.confirm === true) {
    return 'runtime apply is blocked for deferred governance planning; only dryRun=true without confirm is accepted.';
  }
  return validateSurface(family, normalizedPayload);
}

function buildAuditPreview({ family, normalizedPayload }) {
  const surface = requiredSurfaceForFamily(family);
  return {
    appendOnlyRequired: true,
    durableAuditWritten: false,
    auditCorrelationId: normalizedPayload.auditCorrelationId,
    phases: [
      {
        phase: 'pending',
        eventType: family,
        mutationApplied: false,
        correlationId: normalizedPayload.auditCorrelationId
      },
      {
        phase: 'committed',
        eventType: family,
        mutationApplied: true,
        correlationId: normalizedPayload.auditCorrelationId
      },
      {
        phase: 'cancelled',
        eventType: family,
        mutationApplied: false,
        correlationId: normalizedPayload.auditCorrelationId
      }
    ],
    eventShape: {
      toolName: surface.serviceName,
      action: surface.action,
      actorClientId: normalizedPayload.actorClientId,
      requestSource: normalizedPayload.requestSource,
      reason: normalizedPayload.reason,
      evidenceSummary: normalizedPayload.evidenceSummary,
      redactionApplied: true
    }
  };
}

function buildDryRunPlan({ family, payload }) {
  let normalizedPayload = payload;

  try {
    validateArgumentsAgainstSchema(DEFERRED_GOVERNANCE_MUTATION_PLAN_SCHEMA, payload);
  } catch (error) {
    if (error instanceof ToolArgumentValidationError) {
      return buildRejectedResult({
        family,
        payload,
        dryRun: payload?.dryRun !== false,
        reason: error.message
      });
    }
    throw error;
  }

  const secretScan = scanMemoryWritePayload({
    title: family,
    content: payload.reason,
    evidence: payload.evidenceSummary,
    tags: payload.targetMemoryIds
  });
  if (!secretScan.ok) {
    return buildRejectedResult({
      family,
      payload,
      reason: formatSecretRejectionReason(secretScan)
    });
  }

  normalizedPayload = normalizePayload(payload);

  const validationFinding = validateNormalizedPayload(family, normalizedPayload);
  if (validationFinding) {
    return buildRejectedResult({
      family,
      payload: normalizedPayload,
      dryRun: normalizedPayload.dryRun,
      reason: validationFinding
    });
  }

  const surface = requiredSurfaceForFamily(family);
  const changedMemoryIds = [...normalizedPayload.targetMemoryIds];

  return {
    success: true,
    decision: 'dry-run',
    family,
    serviceName: surface.serviceName,
    serviceMethod: surface.serviceMethod,
    internalOnly: true,
    defaultDisabled: true,
    dryRun: true,
    mutated: false,
    runtimeApplyBlocked: true,
    executionApproved: false,
    runtimeIntegrated: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    targetMemoryIds: normalizedPayload.targetMemoryIds,
    changedMemoryIds,
    scopeTuple: normalizedPayload.scopeTuple,
    approval: {
      approvalId: normalizedPayload.approvalId,
      exactExecutionApprovalRequired: true,
      executionApprovalConsumed: false
    },
    surface: {
      requestSource: surface.requestSource,
      contextFlag: surface.contextFlag,
      action: surface.action,
      projectionStates: [...surface.projectionStates]
    },
    suppressionProjectionPreview: {
      shadowProjectionRequired: true,
      durableProjectionApplied: false,
      targetMemoryIds: normalizedPayload.targetMemoryIds,
      projectedStates: [...surface.projectionStates],
      scopeTuple: normalizedPayload.scopeTuple
    },
    appendOnlyAuditPreview: buildAuditPreview({ family, normalizedPayload }),
    governanceRevision: {
      required: true,
      emitted: false,
      reason: surface.revisionReason,
      targetMemoryIds: changedMemoryIds
    },
    candidateCacheInvalidation: {
      required: true,
      applied: false,
      invalidationScope: 'target_memory_ids_only',
      targetMemoryIds: changedMemoryIds
    },
    readPolicySuppression: {
      required: true,
      applied: false,
      policy: surface.readPolicySuppression,
      normalRecallBlocked: true,
      candidateGenerationBlocked: true,
      cacheHitProjectionBlocked: true
    },
    rollbackOrCleanupPlan: {
      required: true,
      available: true,
      path: 'discard_dry_run_preview_or_recompute_from_current_shadow_record_before_apply'
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
      rawSecretExposed: false,
      rawWorkspaceIdExposed: false,
      rawPrivateMemoryExposed: false
    },
    publicMcpTools: {
      frozen: true,
      tools: PUBLIC_MCP_TOOLS
    },
    nextStep: 'Keep this candidate unmounted and dry-run-only until a separately validated internal runtime apply slice exists.'
  };
}

class DeferredGovernanceMutationPlanningService {
  planMemoryExclude(payload = {}) {
    return buildDryRunPlan({ family: 'memory_exclude', payload });
  }

  planMemoryForget(payload = {}) {
    return buildDryRunPlan({ family: 'memory_forget', payload });
  }
}

module.exports = {
  DEFERRED_GOVERNANCE_MUTATION_PLAN_SCHEMA,
  FAMILY_SURFACES,
  GOVERNANCE_FAMILIES,
  PUBLIC_MCP_TOOLS,
  DeferredGovernanceMutationPlanningService,
  buildDryRunPlan,
  normalizePayload
};
