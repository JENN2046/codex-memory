const {
  FAMILY_SURFACES,
  PUBLIC_MCP_TOOLS,
  DeferredGovernanceMutationPlanningService
} = require('./DeferredGovernanceMutationPlanningService');
const {
  EXPECTED_SCHEMA_VERSION: APPLY_PLAN_PREVIEW_SCHEMA_VERSION,
  planDeferredGovernanceBoundedApplyPlanPreview
} = require('./DeferredGovernanceBoundedApplyPlanPreview');
const { buildInternalRuntimeEntryPayload } = require('./InternalRuntimeEntryGate');
const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const ENTRY_NAMES = Object.freeze({
  memory_exclude: 'executeInternalMemoryExclude',
  memory_forget: 'executeInternalMemoryForget'
});

const APPLY_PLAN_PREVIEW_ENTRY_NAMES = Object.freeze({
  memory_exclude: 'previewInternalMemoryExcludeApplyPlan',
  memory_forget: 'previewInternalMemoryForgetApplyPlan'
});

const SHARED_GATE_REQUIRED_STRING_FIELDS = Object.freeze([
  { name: 'approval_id', keys: ['approval_id', 'approvalId'] },
  { name: 'reason', keys: ['reason'] },
  { name: 'evidence_summary', keys: ['evidence_summary', 'evidenceSummary', 'evidence'] },
  { name: 'audit_correlation_id', keys: ['audit_correlation_id', 'auditCorrelationId', 'correlation_id', 'correlationId'] }
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? redactSensitiveFragments(value.trim()) : '';
}

function normalizeStringArray(values) {
  if (Array.isArray(values)) {
    return [...new Set(values.map(normalizeString).filter(Boolean))];
  }
  const singleValue = normalizeString(values);
  return singleValue ? [singleValue] : [];
}

function firstStringArrayValue(...values) {
  for (const value of values) {
    const normalized = normalizeStringArray(value);
    if (normalized.length > 0) return normalized;
  }
  return [];
}

function firstStringValue(source, keys = []) {
  for (const key of keys) {
    const value = normalizeString(source[key]);
    if (value) return value;
  }
  return '';
}

function normalizeScopeTuple(args = {}, executionContext = {}) {
  const rawScope = isPlainObject(args.scopeTuple)
    ? args.scopeTuple
    : isPlainObject(args.scope_tuple)
      ? args.scope_tuple
      : {};
  const scope = {};

  for (const [outputKey, inputKeys] of Object.entries({
    projectId: ['projectId', 'project_id'],
    workspaceId: ['workspaceId', 'workspace_id'],
    clientId: ['clientId', 'client_id'],
    taskId: ['taskId', 'task_id'],
    conversationId: ['conversationId', 'conversation_id'],
    visibility: ['visibility', 'visibility_policy']
  })) {
    const value = firstStringValue(rawScope, inputKeys) || firstStringValue(args, inputKeys) || firstStringValue(executionContext, inputKeys);
    if (!value) continue;
    scope[outputKey] = /^(projectId|workspaceId|clientId|taskId|conversationId)$/.test(outputKey)
      ? '<redacted>'
      : value;
  }

  return scope;
}

function pickPlainObject(...values) {
  for (const value of values) {
    if (isPlainObject(value)) {
      return value;
    }
  }
  return {};
}

function normalizeRuntimeSurfaceCapabilities(args = {}, requestContext = {}) {
  const safeArgs = isPlainObject(args) ? args : {};
  const executionContext = isPlainObject(requestContext.executionContext)
    ? requestContext.executionContext
    : {};

  return pickPlainObject(
    safeArgs.runtimeSurfaceCapabilities,
    safeArgs.runtime_surface_capabilities,
    requestContext.runtimeSurfaceCapabilities,
    requestContext.runtime_surface_capabilities,
    executionContext.runtimeSurfaceCapabilities,
    executionContext.runtime_surface_capabilities
  );
}

function buildSharedInternalGate({ args = {}, requestContext = {}, family, enabled = false }) {
  const surface = FAMILY_SURFACES[family];
  if (!surface) {
    return {
      ok: false,
      reason: 'unsupported deferred governance runtime entry family.',
      payload: {
        request_source: '',
        dry_run: true,
        actor_client_id: ''
      }
    };
  }

  return buildInternalRuntimeEntryPayload(args, requestContext, {
    enabled,
    requestSource: surface.requestSource,
    contextFlag: surface.contextFlag,
    entryLabel: family,
    requiredStringFields: SHARED_GATE_REQUIRED_STRING_FIELDS
  });
}

function normalizeEntryPayload(args = {}, requestContext = {}, family, sharedGatePayload = null) {
  const safeArgs = isPlainObject(args) ? args : {};
  const executionContext = isPlainObject(requestContext.executionContext)
    ? requestContext.executionContext
    : {};
  const surface = FAMILY_SURFACES[family] || {};
  const gatePayload = isPlainObject(sharedGatePayload)
    ? sharedGatePayload
    : buildSharedInternalGate({
      args: safeArgs,
      requestContext,
      family,
      enabled: true
    }).payload;

  return {
    targetMemoryIds: firstStringArrayValue(
      safeArgs.targetMemoryIds,
      safeArgs.target_memory_ids,
      safeArgs.memory_ids,
      safeArgs.memoryIds,
      safeArgs.memory_id,
      safeArgs.memoryId
    ),
    scopeTuple: normalizeScopeTuple(safeArgs, executionContext),
    actorClientId: normalizeString(gatePayload.actor_client_id) ||
      firstStringValue(safeArgs, ['actorClientId', 'actor_client_id']) ||
      firstStringValue(executionContext, ['clientId', 'client_id', 'actorClientId', 'actor_client_id']),
    approvalId: normalizeString(gatePayload.approval_id) ||
      firstStringValue(safeArgs, ['approvalId', 'approval_id']),
    requestSource: normalizeString(gatePayload.request_source) ||
      firstStringValue(executionContext, ['requestSource', 'request_source']) ||
      firstStringValue(safeArgs, ['requestSource', 'request_source']) ||
      surface.requestSource ||
      '',
    contextFlag: surface.contextFlag || '',
    reason: normalizeString(gatePayload.reason) || firstStringValue(safeArgs, ['reason']),
    evidenceSummary: normalizeString(gatePayload.evidence_summary) ||
      firstStringValue(safeArgs, ['evidenceSummary', 'evidence_summary', 'evidence']),
    auditCorrelationId: normalizeString(gatePayload.audit_correlation_id) ||
      firstStringValue(safeArgs, ['auditCorrelationId', 'audit_correlation_id', 'correlationId', 'correlation_id']),
    dryRun: gatePayload.dry_run !== false && safeArgs.dryRun !== false && safeArgs.dry_run !== false,
    ...(gatePayload.confirm === true || safeArgs.confirm === true ? { confirm: true } : {})
  };
}

function buildRejectedEntryResult({ family, reason, payload = {}, dryRun = true, entryName = null }) {
  return {
    success: false,
    decision: 'rejected',
    family,
    entryName: entryName || ENTRY_NAMES[family] || null,
    serviceName: FAMILY_SURFACES[family]?.serviceName || null,
    serviceMethod: FAMILY_SURFACES[family]?.serviceMethod || null,
    dryRun,
    mutated: false,
    runtimeEntryMounted: false,
    runtimeApplyBlocked: true,
    runtimeIntegrated: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    targetMemoryIds: normalizeStringArray(payload.targetMemoryIds),
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

class DeferredGovernanceRuntimeEntryAdapter {
  constructor({
    planningService = new DeferredGovernanceMutationPlanningService(),
    memoryExcludeEnabled = false,
    memoryForgetEnabled = false,
    memoryExcludeApplyPlanPreviewEnabled = false,
    memoryForgetApplyPlanPreviewEnabled = false
  } = {}) {
    this.planningService = planningService;
    this.memoryExcludeEnabled = memoryExcludeEnabled;
    this.memoryForgetEnabled = memoryForgetEnabled;
    this.memoryExcludeApplyPlanPreviewEnabled = memoryExcludeApplyPlanPreviewEnabled;
    this.memoryForgetApplyPlanPreviewEnabled = memoryForgetApplyPlanPreviewEnabled;
  }

  executeInternalMemoryExclude(args = {}, requestContext = {}) {
    return this.executeFamilyEntry('memory_exclude', args, requestContext, {
      enabled: this.memoryExcludeEnabled,
      serviceMethod: 'planMemoryExclude'
    });
  }

  executeInternalMemoryForget(args = {}, requestContext = {}) {
    return this.executeFamilyEntry('memory_forget', args, requestContext, {
      enabled: this.memoryForgetEnabled,
      serviceMethod: 'planMemoryForget'
    });
  }

  previewInternalMemoryExcludeApplyPlan(args = {}, requestContext = {}) {
    return this.executeFamilyApplyPlanPreview('memory_exclude', args, requestContext, {
      enabled: this.memoryExcludeApplyPlanPreviewEnabled
    });
  }

  previewInternalMemoryForgetApplyPlan(args = {}, requestContext = {}) {
    return this.executeFamilyApplyPlanPreview('memory_forget', args, requestContext, {
      enabled: this.memoryForgetApplyPlanPreviewEnabled
    });
  }

  executeFamilyEntry(family, args, requestContext, { enabled, serviceMethod }) {
    const gateResult = buildSharedInternalGate({ args, requestContext, family, enabled });
    const payload = normalizeEntryPayload(args, requestContext, family, gateResult.payload);
    if (!gateResult.ok) {
      return buildRejectedEntryResult({
        family,
        payload,
        dryRun: payload.dryRun,
        reason: gateResult.reason
      });
    }

    const result = this.planningService[serviceMethod](payload);
    return {
      ...result,
      entryName: ENTRY_NAMES[family],
      runtimeEntryMounted: false,
      runtimeEntryCandidate: true,
      runtimeApplyBlocked: true,
      publicMcpExpanded: false,
      readinessClaimed: false
    };
  }

  executeFamilyApplyPlanPreview(family, args, requestContext, { enabled }) {
    const gateResult = buildSharedInternalGate({ args, requestContext, family, enabled });
    const payload = normalizeEntryPayload(args, requestContext, family, gateResult.payload);
    const entryName = APPLY_PLAN_PREVIEW_ENTRY_NAMES[family] || null;
    if (!gateResult.ok) {
      return {
        ...buildRejectedEntryResult({
          family,
          payload,
          dryRun: payload.dryRun,
          reason: gateResult.reason,
          entryName
        }),
        applyPlanPreviewCandidate: true
      };
    }

    const safeArgs = isPlainObject(args) ? args : {};
    const result = planDeferredGovernanceBoundedApplyPlanPreview({
      schemaVersion: APPLY_PLAN_PREVIEW_SCHEMA_VERSION,
      family,
      dryRunPayload: payload,
      runtimeSurfaceCapabilities: normalizeRuntimeSurfaceCapabilities(args, requestContext),
      plannedAt: firstStringValue(safeArgs, ['plannedAt', 'planned_at']) || '<planned>',
      previewOnly: safeArgs.previewOnly !== false && safeArgs.preview_only !== false,
      publicMcpExpanded: safeArgs.publicMcpExpanded === true || safeArgs.public_mcp_expanded === true,
      callToolWidened: safeArgs.callToolWidened === true || safeArgs.call_tool_widened === true,
      runtimeApplyRequested: safeArgs.runtimeApplyRequested === true || safeArgs.runtime_apply_requested === true,
      readinessClaimed: safeArgs.readinessClaimed === true || safeArgs.readiness_claimed === true
    });

    return {
      ...result,
      success: result.acceptedForApplyPlanPreview === true,
      entryName,
      runtimeEntryMounted: false,
      applyPlanPreviewCandidate: true,
      runtimeApplyBlocked: true,
      publicMcpExpanded: false,
      readinessClaimed: false
    };
  }
}

module.exports = {
  APPLY_PLAN_PREVIEW_ENTRY_NAMES,
  ENTRY_NAMES,
  DeferredGovernanceRuntimeEntryAdapter,
  buildSharedInternalGate,
  buildRejectedEntryResult,
  normalizeEntryPayload,
  normalizeRuntimeSurfaceCapabilities
};
