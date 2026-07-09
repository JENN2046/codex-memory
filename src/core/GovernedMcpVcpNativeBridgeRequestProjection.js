'use strict';

const {
  REQUIRED_ACCESS_PATH,
  REQUIRED_CLIENTS,
  REQUIRED_GOVERNED_DIMENSIONS,
  REQUIRED_LOCAL_MEMORY_ROLE,
  REQUIRED_PRIMARY_RUNTIME,
  REQUIRED_PRIMARY_VALUE
} = require('./CurrentProductGoalContract');
const {
  SOURCE_AUTHORITY
} = require('./GovernedMcpVcpNativeRuntimeTargetConfig');
const {
  TARGET_KINDS
} = require('./VcpToolBoxFullCapabilityBridgePlan');
const {
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');

const READ_ONLY_TOOL_NAMES = Object.freeze([
  'search_memory',
  'memory_overview',
  'audit_memory'
]);

const MUTATION_TOOL_NAMES = Object.freeze([
  'record_memory',
  'tombstone_memory',
  'supersede_memory'
]);

const NATIVE_BRIDGE_TOOL_NAMES = Object.freeze([
  ...READ_ONLY_TOOL_NAMES,
  ...MUTATION_TOOL_NAMES
]);

const ALLOWED_VISIBILITIES = Object.freeze([
  'private',
  'project',
  'workspace'
]);

const ALLOWED_DISCLOSURE_LEVELS = Object.freeze([
  'none',
  'receipt_only',
  'metadata',
  'shape_only',
  'summary',
  'structured'
]);

const ALLOWED_WRITE_ROLLBACK_POSTURES = Object.freeze([
  'bounded_rollback_plan',
  'mutation_cleanup_plan'
]);

const ALLOWED_READ_ROLLBACK_POSTURES = Object.freeze([
  'no_runtime_state_to_rollback',
  'read_only_no_write'
]);

const GOVERNED_CONTEXT_FORBIDDEN_KEY_NORMAL_FORMS = new Set([
  'absolutepath',
  'apikey',
  'authorization',
  'authorizationheader',
  'baseurl',
  'bearer',
  'bearertoken',
  'configenv',
  'configenvpath',
  'credential',
  'credentials',
  'endpoint',
  'env',
  'locator',
  'locatorvalue',
  'password',
  'path',
  'privatekey',
  'providerapikey',
  'runtimeendpoint',
  'runtimeurl',
  'secret',
  'secrets',
  'token',
  'url'
]);

const GOVERNED_CONTEXT_FORBIDDEN_KEY_CONTAINS = Object.freeze([
  'apikey',
  'authorization',
  'bearertoken',
  'credential',
  'endpoint',
  'locator',
  'privatekey',
  'secret'
]);

const GOVERNED_CONTEXT_FORBIDDEN_KEY_SUFFIXES = Object.freeze([
  'path',
  'token',
  'url'
]);

const GOVERNED_CONTEXT_NEGATIVE_EVIDENCE_KEYS = new Set([
  'configenvread',
  'endpointincluded',
  'locatorvalueincluded',
  'tokenmaterialincluded'
]);

const GOVERNED_CONTEXT_EXACT_APPROVAL_RUNTIME_TARGET_KEYS = new Set([
  'runtimeTarget',
  'runtime_target',
  'allowedRuntimeTarget',
  'allowed_runtime_target',
  'approvedRuntimeTarget',
  'approved_runtime_target'
].map(normalizeGovernedContextKey));

const WRITE_TOOL_EXACT_APPROVAL_ACTIONS = Object.freeze({
  record_memory: 'live_bridge_record_memory_proof',
  tombstone_memory: 'live_bridge_tombstone_memory_proof',
  supersede_memory: 'live_bridge_supersede_memory_proof'
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeGovernedContextKey(key) {
  return typeof key === 'string'
    ? key.toLowerCase().replace(/[^a-z0-9]/g, '')
    : '';
}

function isForbiddenGovernedContextLocatorOrSecretKey(key, value) {
  const normalizedKey = normalizeGovernedContextKey(key);
  if (GOVERNED_CONTEXT_NEGATIVE_EVIDENCE_KEYS.has(normalizedKey) && value === false) {
    return false;
  }
  return GOVERNED_CONTEXT_FORBIDDEN_KEY_NORMAL_FORMS.has(normalizedKey) ||
    GOVERNED_CONTEXT_FORBIDDEN_KEY_CONTAINS.some(pattern => normalizedKey.includes(pattern)) ||
    GOVERNED_CONTEXT_FORBIDDEN_KEY_SUFFIXES.some(suffix => normalizedKey.endsWith(suffix));
}

function hasForbiddenGovernedContextLocatorOrSecretField(value, options = {}) {
  if (Array.isArray(value)) {
    return value.some(item => hasForbiddenGovernedContextLocatorOrSecretField(item, options));
  }
  if (!isPlainObject(value)) return false;
  const ignoredRootKeys = options.ignoredRootKeys instanceof Set ? options.ignoredRootKeys : null;
  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = normalizeGovernedContextKey(key);
    if (ignoredRootKeys?.has(normalizedKey)) continue;
    if (isForbiddenGovernedContextLocatorOrSecretKey(key, nestedValue)) return true;
    if (hasForbiddenGovernedContextLocatorOrSecretField(nestedValue)) return true;
  }
  return false;
}

function firstString(...values) {
  for (const value of values) {
    const normalized = normalizeString(value);
    if (normalized) return normalized;
  }
  return '';
}

function safeReferenceOrNull(value) {
  const normalized = normalizeString(value);
  return isSafeReferenceName(normalized) ? normalized : null;
}

function safeReferenceOrEmpty(value) {
  return safeReferenceOrNull(value) || '';
}

function allowedVisibilityOrEmpty(value) {
  const normalized = normalizeString(value).toLowerCase();
  return ALLOWED_VISIBILITIES.includes(normalized) ? normalized : '';
}

function projectedTrustedReferenceField(value, fallback, invalidReferenceName) {
  const supplied = normalizeString(value);
  if (supplied) return safeReferenceOrNull(supplied) || invalidReferenceName;
  return fallback || null;
}

function projectedTrustedVisibilityField(value, fallback) {
  const supplied = normalizeString(value);
  if (supplied) return allowedVisibilityOrEmpty(supplied) || 'invalid_visibility';
  return fallback || null;
}

function projectedTrustedClientIdField(value, fallback) {
  const supplied = normalizeString(value);
  if (supplied) return isCodexReference(supplied) ? 'Codex' : 'invalid-trusted-client';
  return fallback || null;
}

function allowedEnumOrNull(value, allowedValues) {
  const normalized = normalizeString(value);
  return allowedValues.includes(normalized) ? normalized : null;
}

function governedBoolean(value, fallback = false) {
  if (value === true || value === false) return value;
  return fallback;
}

function governedIntegerOrInvalid(value, min, max, defaultValue, invalidValue) {
  if (value === undefined) return defaultValue;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return invalidValue;
  return parsed;
}

function projectedToolName(value) {
  const normalized = normalizeString(value);
  return NATIVE_BRIDGE_TOOL_NAMES.includes(normalized)
    ? normalized
    : 'invalid-mcp-tool';
}

function isCodexReference(value) {
  const normalized = normalizeString(value);
  return isSafeReferenceName(normalized) && /^codex(?:$|[._-])/i.test(normalized);
}

function inferGovernedClientId({ config = {}, requestContext = {} } = {}) {
  const executionContext = isPlainObject(requestContext.executionContext)
    ? requestContext.executionContext
    : {};
  const candidates = [
    executionContext.clientId,
    executionContext.client_id,
    executionContext.agentAlias,
    executionContext.agentId,
    config.defaultClientId,
    config.allowedAgentAlias
  ];

  for (const candidate of candidates) {
    if (isCodexReference(candidate)) return 'Codex';
  }

  return null;
}

function projectedScopeClientId(requestContext = {}, config = {}) {
  const executionContext = isPlainObject(requestContext.executionContext)
    ? requestContext.executionContext
    : {};
  const suppliedClientId = firstString(
    executionContext.clientId,
    executionContext.client_id,
    config.defaultClientId
  );
  if (suppliedClientId) {
    return isCodexReference(suppliedClientId) ? 'Codex' : 'invalid-client-id';
  }
  return inferGovernedClientId({ config, requestContext }) || '';
}

function buildCurrentProductGoal() {
  return {
    primary_runtime: REQUIRED_PRIMARY_RUNTIME,
    primary_value: REQUIRED_PRIMARY_VALUE,
    clients: [...REQUIRED_CLIENTS],
    access_path: REQUIRED_ACCESS_PATH,
    governed_dimensions: [...REQUIRED_GOVERNED_DIMENSIONS],
    local_memory_role: [...REQUIRED_LOCAL_MEMORY_ROLE]
  };
}

function buildScopeProjection(args = {}, requestContext = {}, config = {}) {
  const executionContext = isPlainObject(requestContext.executionContext)
    ? requestContext.executionContext
    : {};

  return {
    scope_id: safeReferenceOrEmpty(firstString(
      executionContext.scopeId,
      executionContext.scope_id,
      config.defaultScopeId
    )),
    project_id: safeReferenceOrEmpty(firstString(
      executionContext.projectId,
      executionContext.project_id,
      config.defaultProjectId
    )),
    workspace_id: safeReferenceOrEmpty(firstString(
      executionContext.workspaceId,
      executionContext.workspace_id,
      config.defaultWorkspaceId
    )),
    client_id: projectedScopeClientId(requestContext, config),
    visibility: allowedVisibilityOrEmpty(firstString(
      executionContext.visibility,
      executionContext.visibility_policy,
      config.defaultVisibility
    ))
  };
}

function buildTrustedExecutionContextProjection(requestContext = {}, config = {}) {
  const executionContext = isPlainObject(requestContext.executionContext)
    ? requestContext.executionContext
    : {};
  const agentAlias = inferGovernedClientId({ config, requestContext });
  const clientId = projectedScopeClientId(requestContext, config);
  const projectId = safeReferenceOrNull(firstString(
    executionContext.projectId,
    executionContext.project_id,
    config.defaultProjectId
  ));
  const workspaceId = safeReferenceOrNull(firstString(
    executionContext.workspaceId,
    executionContext.workspace_id,
    config.defaultWorkspaceId
  ));
  const scopeId = safeReferenceOrNull(firstString(
    executionContext.scopeId,
    executionContext.scope_id,
    config.defaultScopeId
  ));
  const visibility = firstString(
    executionContext.visibility,
    executionContext.visibility_policy,
    config.defaultVisibility
  );
  const acceptedVisibility = allowedVisibilityOrEmpty(visibility);

  if (
    Object.prototype.hasOwnProperty.call(requestContext, 'trustedExecutionContext') &&
    !isPlainObject(requestContext.trustedExecutionContext)
  ) {
    return {
      accepted: false,
      executionContext: {}
    };
  }

  if (isPlainObject(requestContext.trustedExecutionContext)) {
    const trustedContext = requestContext.trustedExecutionContext;
    if (hasForbiddenGovernedContextLocatorOrSecretField(trustedContext)) {
      return {
        accepted: false,
        executionContext: {}
      };
    }
    const trustedExecutionContext = isPlainObject(trustedContext.executionContext)
      ? trustedContext.executionContext
      : {};
    const trustedAgentAlias = projectedTrustedReferenceField(
      firstString(trustedExecutionContext.agentAlias, trustedExecutionContext.agent_alias),
      agentAlias,
      'invalid-trusted-agent'
    );
    const trustedClientId = projectedTrustedClientIdField(
      firstString(trustedExecutionContext.clientId, trustedExecutionContext.client_id),
      clientId
    );
    const trustedProjectId = projectedTrustedReferenceField(
      firstString(trustedExecutionContext.projectId, trustedExecutionContext.project_id),
      projectId,
      'invalid-trusted-project'
    );
    const trustedWorkspaceId = projectedTrustedReferenceField(
      firstString(trustedExecutionContext.workspaceId, trustedExecutionContext.workspace_id),
      workspaceId,
      'invalid-trusted-workspace'
    );
    const trustedScopeId = projectedTrustedReferenceField(
      firstString(trustedExecutionContext.scopeId, trustedExecutionContext.scope_id),
      scopeId,
      'invalid-trusted-scope'
    );
    const trustedVisibility = projectedTrustedVisibilityField(
      firstString(trustedExecutionContext.visibility, trustedExecutionContext.visibility_policy),
      acceptedVisibility
    );
    return {
      accepted: trustedContext.accepted === true,
      executionContext: {
        ...(trustedAgentAlias ? { agentAlias: trustedAgentAlias } : {}),
        ...(trustedClientId ? { clientId: trustedClientId } : {}),
        ...(trustedProjectId ? { projectId: trustedProjectId } : {}),
        ...(trustedWorkspaceId ? { workspaceId: trustedWorkspaceId } : {}),
        ...(trustedScopeId ? { scopeId: trustedScopeId } : {}),
        ...(trustedVisibility ? { visibility: trustedVisibility } : {})
      }
    };
  }

  return {
    accepted: agentAlias === 'Codex',
    executionContext: {
      ...(agentAlias ? {
        agentAlias
      } : {}),
      ...(clientId ? {
        clientId
      } : {}),
      ...(projectId ? {
        projectId
      } : {}),
      ...(workspaceId ? {
        workspaceId
      } : {}),
      ...(scopeId ? {
        scopeId
      } : {}),
      ...(acceptedVisibility ? {
        visibility: acceptedVisibility
      } : {})
    }
  };
}

function outputDisclosureBudgetForTool(toolName, args = {}, requestContext = {}) {
  if (
    Object.prototype.hasOwnProperty.call(requestContext, 'outputDisclosureBudget') &&
    !isPlainObject(requestContext.outputDisclosureBudget)
  ) {
    return {
      level: 'invalid_disclosure_level',
      low_disclosure: false,
      raw_output: true,
      max_items: 6,
      max_bytes: 4097,
      tool_name: toolName
    };
  }

  if (isPlainObject(requestContext.outputDisclosureBudget)) {
    const budget = requestContext.outputDisclosureBudget;
    if (hasForbiddenGovernedContextLocatorOrSecretField(budget)) {
      return {
        level: 'invalid_disclosure_level',
        low_disclosure: false,
        raw_output: true,
        max_items: 6,
        max_bytes: 4097,
        tool_name: toolName
      };
    }
    const level = allowedEnumOrNull(
      firstString(budget.level, budget.disclosure_level, budget.disclosureLevel),
      ALLOWED_DISCLOSURE_LEVELS
    );
    const rawOutput = budget.raw_output ?? budget.rawOutput ?? budget.raw_body ?? budget.rawBody ?? budget.full_output ?? budget.fullOutput;
    return {
      level: level || 'invalid_disclosure_level',
      low_disclosure: governedBoolean(budget.low_disclosure ?? budget.lowDisclosure, false),
      raw_output: governedBoolean(rawOutput, true),
      max_items: governedIntegerOrInvalid(budget.max_items ?? budget.maxItems, 0, 5, 5, 6),
      max_bytes: governedIntegerOrInvalid(budget.max_bytes ?? budget.maxBytes, 0, 4096, 4096, 4097),
      tool_name: toolName
    };
  }

  return {
    level: 'summary',
    low_disclosure: true,
    raw_output: false,
    max_items: 5,
    max_bytes: 4096,
    tool_name: toolName
  };
}

function readWriteAuthorityForTool(toolName, requestContext = {}) {
  if (MUTATION_TOOL_NAMES.includes(toolName)) {
    return {
      read: false,
      write: true,
      write_policy: requestContext.exactApprovalResult?.accepted === true
        ? 'exact_approval'
        : 'separate_exact_approval_required',
      unbounded_write: false
    };
  }

  return {
    read: true,
    write: false
  };
}

function invocationProfileForTool(toolName) {
  return {
    transport: 'mcp',
    profile: MUTATION_TOOL_NAMES.includes(toolName)
      ? 'governed_bounded_write'
      : 'governed_read_only',
    tool_name: toolName
  };
}

function rollbackPostureForTool(toolName, requestContext = {}) {
  if (
    Object.prototype.hasOwnProperty.call(requestContext, 'rollbackPosture') &&
    !isPlainObject(requestContext.rollbackPosture)
  ) {
    return {
      mode: 'invalid_rollback_posture',
      rollback_plan_ref: ''
    };
  }

  if (MUTATION_TOOL_NAMES.includes(toolName)) {
    const posture = isPlainObject(requestContext.rollbackPosture)
      ? requestContext.rollbackPosture
      : {};
    if (hasForbiddenGovernedContextLocatorOrSecretField(posture)) {
      return {
        mode: 'invalid_rollback_posture',
        rollback_plan_ref: ''
      };
    }
    const suppliedMode = firstString(posture.mode, posture.posture);
    const mode = allowedEnumOrNull(suppliedMode, ALLOWED_WRITE_ROLLBACK_POSTURES);
    const suppliedPlanRef = firstString(
      posture.rollback_plan_ref,
      posture.rollbackPlanRef,
      posture.plan_ref,
      posture.planRef
    );
    return {
      mode: mode || (suppliedMode ? 'invalid_rollback_posture' : 'bounded_rollback_plan'),
      rollback_plan_ref: suppliedPlanRef
        ? safeReferenceOrEmpty(suppliedPlanRef)
        : ''
    };
  }

  const posture = isPlainObject(requestContext.rollbackPosture)
    ? requestContext.rollbackPosture
    : {};
  if (hasForbiddenGovernedContextLocatorOrSecretField(posture)) {
    return {
      mode: 'invalid_rollback_posture'
    };
  }
  const suppliedMode = firstString(posture.mode, posture.posture, posture.rollback_posture);
  const suppliedPlanRef = firstString(
    posture.rollback_plan_ref,
    posture.rollbackPlanRef,
    posture.plan_ref,
    posture.planRef
  );
  if (suppliedPlanRef) {
    return {
      mode: 'invalid_rollback_posture',
      rollback_plan_ref: safeReferenceOrEmpty(suppliedPlanRef)
    };
  }

  return {
    mode: allowedEnumOrNull(suppliedMode, ALLOWED_READ_ROLLBACK_POSTURES) ||
      (suppliedMode ? 'invalid_rollback_posture' : 'no_runtime_state_to_rollback')
  };
}

function auditReceiptForTool(toolName, requestContext = {}) {
  if (
    Object.prototype.hasOwnProperty.call(requestContext, 'auditReceipt') &&
    !isPlainObject(requestContext.auditReceipt)
  ) {
    return {
      required: true,
      low_disclosure: true,
      receipt_plan_id: ''
    };
  }

  const receipt = isPlainObject(requestContext.auditReceipt)
    ? requestContext.auditReceipt
    : {};
  if (hasForbiddenGovernedContextLocatorOrSecretField(receipt)) {
    return {
      required: true,
      low_disclosure: true,
      receipt_plan_id: ''
    };
  }
  const suppliedReceiptRef = firstString(
    receipt.receipt_plan_id,
    receipt.receiptPlanId,
    receipt.receipt_id,
    receipt.receiptId,
    receipt.correlation_id,
    receipt.correlationId
  );

  return {
    required: true,
    low_disclosure: true,
    receipt_plan_id: suppliedReceiptRef
      ? safeReferenceOrEmpty(suppliedReceiptRef)
      : `governed-mcp-${toolName}-receipt`
  };
}

function exactApprovalScopeProjection(scope = {}) {
  const visibility = allowedVisibilityOrEmpty(scope.visibility);
  return {
    ...(safeReferenceOrNull(firstString(scope.scope_id, scope.scopeId)) ? {
      scope_id: safeReferenceOrNull(firstString(scope.scope_id, scope.scopeId))
    } : {}),
    ...(safeReferenceOrNull(firstString(scope.project_id, scope.projectId)) ? {
      project_id: safeReferenceOrNull(firstString(scope.project_id, scope.projectId))
    } : {}),
    ...(safeReferenceOrNull(firstString(scope.workspace_id, scope.workspaceId)) ? {
      workspace_id: safeReferenceOrNull(firstString(scope.workspace_id, scope.workspaceId))
    } : {}),
    ...(safeReferenceOrNull(firstString(scope.client_id, scope.clientId)) ? {
      client_id: safeReferenceOrNull(firstString(scope.client_id, scope.clientId))
    } : {}),
    ...(visibility ? { visibility } : {})
  };
}

function exactApprovalRuntimeTargetProjection(runtimeTarget = {}) {
  const targetReferenceName = safeReferenceOrNull(firstString(
    runtimeTarget.target_reference_name,
    runtimeTarget.targetReferenceName,
    runtimeTarget.reference_name,
    runtimeTarget.referenceName
  ));
  const targetKind = firstString(runtimeTarget.target_kind, runtimeTarget.targetKind);
  const primaryRuntime = firstString(
    runtimeTarget.target,
    runtimeTarget.target_name,
    runtimeTarget.targetName,
    runtimeTarget.primaryRuntime,
    runtimeTarget.primary_runtime
  );
  return {
    ...(targetReferenceName ? { targetReferenceName } : {}),
    ...(targetKind === 'mcp_server' ? { targetKind } : {}),
    ...(primaryRuntime
      ? { primaryRuntime: primaryRuntime === REQUIRED_PRIMARY_RUNTIME ? primaryRuntime : 'invalid_primary_runtime' }
      : {})
  };
}

function exactApprovalResultForTool(toolName, requestContext = {}) {
  const approval = isPlainObject(requestContext.exactApprovalResult)
    ? requestContext.exactApprovalResult
    : null;
  if (!approval) return undefined;
  const approvalHasForbiddenField = hasForbiddenGovernedContextLocatorOrSecretField(approval, {
    ignoredRootKeys: GOVERNED_CONTEXT_EXACT_APPROVAL_RUNTIME_TARGET_KEYS
  });

  const action = firstString(
    approval.allowedAction,
    approval.allowed_action,
    approval.action,
    approval.approvedAction,
    approval.approved_action
  );
  const expectedAction = WRITE_TOOL_EXACT_APPROVAL_ACTIONS[toolName];
  const approvalScope = approval.allowedScope ||
    approval.allowed_scope ||
    approval.approvedScope ||
    approval.approved_scope ||
    approval.scope ||
    {};
  const approvalScopeSupplied = [
    approval.allowedScope,
    approval.allowed_scope,
    approval.approvedScope,
    approval.approved_scope,
    approval.scope
  ].some(value => value !== undefined);
  const approvalScopeMalformed = approvalScopeSupplied && !isPlainObject(approvalScope);
  const runtimeTarget = approval.runtimeTarget ||
    approval.runtime_target ||
    approval.allowedRuntimeTarget ||
    approval.allowed_runtime_target ||
    approval.approvedRuntimeTarget ||
    approval.approved_runtime_target ||
    {};
  const runtimeTargetSupplied = [
    approval.runtimeTarget,
    approval.runtime_target,
    approval.allowedRuntimeTarget,
    approval.allowed_runtime_target,
    approval.approvedRuntimeTarget,
    approval.approved_runtime_target
  ].some(value => value !== undefined);
  const runtimeTargetMalformed = runtimeTargetSupplied && !isPlainObject(runtimeTarget);
  const runtimeTargetHasForbiddenField = hasForbiddenGovernedContextLocatorOrSecretField(runtimeTarget);
  const rollbackPosture = isPlainObject(approval.rollbackPosture)
    ? approval.rollbackPosture
    : isPlainObject(approval.rollback_posture)
      ? approval.rollback_posture
      : {};
  const rollbackPlanRefCandidates = [
    approval.allowedRollbackPlanRef,
    approval.allowed_rollback_plan_ref,
    approval.approvedRollbackPlanRef,
    approval.approved_rollback_plan_ref,
    approval.rollbackPlanRef,
    approval.rollback_plan_ref,
    rollbackPosture.rollbackPlanRef,
    rollbackPosture.rollback_plan_ref,
    rollbackPosture.planRef,
    rollbackPosture.plan_ref
  ];
  const rollbackPlanRef = firstString(...rollbackPlanRefCandidates);
  const rollbackPlanRefMalformed = rollbackPlanRefCandidates.some(value =>
    value !== undefined && typeof value !== 'string'
  );
  const rollbackPlanRefUnsafe = rollbackPlanRef !== '' && !isSafeReferenceName(rollbackPlanRef);

  return {
    accepted: approval.accepted === true &&
      !approvalHasForbiddenField &&
      !approvalScopeMalformed &&
      !runtimeTargetHasForbiddenField &&
      !runtimeTargetMalformed &&
      !rollbackPlanRefMalformed &&
      !rollbackPlanRefUnsafe,
    allowedAction: !approvalHasForbiddenField && expectedAction && action === expectedAction
      ? action
      : 'invalid_exact_approval_action',
    allowedScope: approvalHasForbiddenField || approvalScopeMalformed
      ? {}
      : exactApprovalScopeProjection(approvalScope),
    runtimeTarget: runtimeTargetHasForbiddenField
      ? {}
      : runtimeTargetMalformed
        ? { primaryRuntime: 'invalid_primary_runtime' }
        : exactApprovalRuntimeTargetProjection(runtimeTarget),
    ...(!approvalHasForbiddenField && !rollbackPlanRefMalformed && rollbackPlanRef ? {
      rollbackPlanRef: rollbackPlanRefUnsafe ? '' : rollbackPlanRef
    } : {})
  };
}

function buildRuntimeTargetProjection(config = {}) {
  const configuredTarget = isPlainObject(config.governedMcpVcpNativeRuntimeTarget)
    ? config.governedMcpVcpNativeRuntimeTarget
    : {};

  return {
    kind: 'vcp_toolbox_native_memory',
    target_name: REQUIRED_PRIMARY_RUNTIME,
    target_reference_name: safeReferenceOrNull(configuredTarget.targetReferenceName),
    target_kind: TARGET_KINDS.includes(configuredTarget.targetKind) ? configuredTarget.targetKind : null,
    configured: configuredTarget.accepted === true,
    source_authority: configuredTarget.sourceAuthority === SOURCE_AUTHORITY ? SOURCE_AUTHORITY : null,
    locator_value_included: false,
    endpoint_included: false,
    token_material_included: false,
    config_env_read: false
  };
}

function buildGovernedMcpVcpNativeBridgeGateInput({
  toolName,
  args = {},
  requestContext = {},
  config = {}
} = {}) {
  const mcpToolName = projectedToolName(toolName);
  const exactApprovalResult = exactApprovalResultForTool(mcpToolName, requestContext);
  return {
    product_goal: buildCurrentProductGoal(),
    bridge_request: {
      client_id: inferGovernedClientId({ config, requestContext }),
      scope: buildScopeProjection(args, requestContext, config),
      runtime_target: buildRuntimeTargetProjection(config),
      invocation_profile: invocationProfileForTool(mcpToolName),
      read_write_authority: readWriteAuthorityForTool(mcpToolName, requestContext),
      output_disclosure_budget: outputDisclosureBudgetForTool(mcpToolName, args, requestContext),
      audit_receipt: auditReceiptForTool(mcpToolName, requestContext),
      rollback_posture: rollbackPostureForTool(mcpToolName, requestContext)
    },
    exact_approval_result: exactApprovalResult,
    trusted_execution_context: buildTrustedExecutionContextProjection(requestContext, config),
    counters: {
      vcpToolBoxCalls: 0,
      mcpToolCalls: 0,
      runtimeInvocations: 0,
      memoryReads: 0,
      memoryWrites: 0,
      localMemoryReads: 0,
      localMemoryWrites: 0,
      auditWrites: 0,
      rollbackApplies: 0,
      providerApiCalls: 0,
      publicMcpExpansions: 0,
      readinessClaims: 0
    }
  };
}

module.exports = {
  MUTATION_TOOL_NAMES,
  READ_ONLY_TOOL_NAMES,
  buildCurrentProductGoal,
  buildGovernedMcpVcpNativeBridgeGateInput,
  buildRuntimeTargetProjection,
  inferGovernedClientId
};
