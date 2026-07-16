'use strict';

const {
  REQUIRED_ACCESS_PATH,
  REQUIRED_CLIENTS,
  REQUIRED_PRIMARY_RUNTIME,
  validateCurrentProductGoalContract
} = require('./CurrentProductGoalContract');
const {
  TARGET_KINDS
} = require('./VcpToolBoxFullCapabilityBridgePlan');
const {
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');
const {
  SOURCE_AUTHORITY
} = require('./GovernedMcpVcpNativeRuntimeTargetConfig');
const { TOOL_DEFINITIONS } = require('./constants');

const CONTRACT_NAME = 'GovernedMcpVcpNativeBridgeGate';
const CONTRACT_VERSION = 'governed_mcp_vcp_native_bridge_gate_v1';

const REQUIRED_REQUEST_DIMENSIONS = Object.freeze([
  'client_id',
  'scope',
  'visibility',
  'runtime_target',
  'invocation_profile',
  'read_write_authority',
  'output_disclosure_budget',
  'audit_receipt',
  'rollback_posture'
]);

const ALLOWED_VISIBILITIES = Object.freeze([
  'private',
  'project',
  'workspace'
]);

const ALLOWED_INVOCATION_PROFILES = Object.freeze([
  'governed_read_only',
  'governed_bounded_write'
]);

const ALLOWED_DISCLOSURE_LEVELS = Object.freeze([
  'none',
  'receipt_only',
  'metadata',
  'shape_only',
  'summary',
  'structured'
]);

const READ_TOOLS = Object.freeze([
  'search_memory',
  'memory_overview',
  'audit_memory'
]);

const WRITE_TOOLS = Object.freeze([
  'record_memory',
  'tombstone_memory',
  'supersede_memory'
]);

const WRITE_TOOL_EXACT_APPROVAL_ACTIONS = Object.freeze({
  record_memory: 'live_bridge_record_memory_proof',
  tombstone_memory: 'live_bridge_tombstone_memory_proof',
  supersede_memory: 'live_bridge_supersede_memory_proof'
});

const ZERO_SIDE_EFFECT_COUNTERS = Object.freeze([
  'vcpToolBoxCalls',
  'mcpToolCalls',
  'runtimeInvocations',
  'memoryReads',
  'memoryWrites',
  'localMemoryReads',
  'localMemoryWrites',
  'auditWrites',
  'rollbackApplies',
  'providerApiCalls',
  'publicMcpExpansions',
  'readinessClaims'
]);

const FORBIDDEN_RUNTIME_TARGET_FIELDS = Object.freeze([
  'authorization',
  'authorizationHeader',
  'endpoint',
  'url',
  'baseUrl',
  'runtimeEndpoint',
  'runtimeUrl',
  'locatorValue',
  'path',
  'absolutePath',
  'configEnv',
  'configEnvPath',
  'env',
  'token',
  'bearerToken',
  'apiKey',
  'providerApiKey',
  'secret',
  'secrets',
  'credential',
  'credentials',
  'password',
  'privateKey'
]);
const FORBIDDEN_RUNTIME_TARGET_KEY_NORMAL_FORMS = new Set([
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
const FORBIDDEN_RUNTIME_TARGET_KEY_CONTAINS = Object.freeze([
  'apikey',
  'authorization',
  'bearertoken',
  'credential',
  'endpoint',
  'locator',
  'privatekey',
  'secret'
]);
const FORBIDDEN_RUNTIME_TARGET_KEY_SUFFIXES = Object.freeze([
  'path',
  'token',
  'url'
]);
const RUNTIME_TARGET_NEGATIVE_EVIDENCE_KEYS = new Set([
  'configenvread',
  'endpointincluded',
  'locatorvalueincluded',
  'tokenmaterialincluded'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeBoolean(value) {
  if (value === true || value === false) return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
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

function numberOrZero(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getAlias(value, snakeKey, camelKey) {
  if (!isPlainObject(value)) return undefined;
  return value[snakeKey] ?? value[camelKey];
}

function lowDisclosure(reason, blockers = []) {
  return {
    reason,
    code: 'governed_mcp_vcp_native_bridge_gate_rejected',
    lowDisclosure: true,
    blockers
  };
}

function normalizedRuntimeTargetKey(key) {
  return typeof key === 'string'
    ? key.toLowerCase().replace(/[^a-z0-9]/g, '')
    : '';
}

function isForbiddenRuntimeTargetFieldKey(key, value) {
  const normalizedKey = normalizedRuntimeTargetKey(key);
  if (RUNTIME_TARGET_NEGATIVE_EVIDENCE_KEYS.has(normalizedKey) && value === false) {
    return false;
  }
  return FORBIDDEN_RUNTIME_TARGET_FIELDS.includes(key) ||
    FORBIDDEN_RUNTIME_TARGET_KEY_NORMAL_FORMS.has(normalizedKey) ||
    FORBIDDEN_RUNTIME_TARGET_KEY_CONTAINS.some(pattern => normalizedKey.includes(pattern)) ||
    FORBIDDEN_RUNTIME_TARGET_KEY_SUFFIXES.some(suffix => normalizedKey.endsWith(suffix));
}

function collectForbiddenRuntimeTargetFields(value, prefix = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectForbiddenRuntimeTargetFields(item, `${prefix}[${index}]`));
  }
  if (!isPlainObject(value)) return [];

  const found = [];
  for (const [key, nested] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isForbiddenRuntimeTargetFieldKey(key, nested)) {
      found.push(path);
      continue;
    }
    found.push(...collectForbiddenRuntimeTargetFields(nested, path));
  }
  return found;
}

function normalizeRuntimeTarget(runtimeTarget) {
  if (!isPlainObject(runtimeTarget)) {
    return {
      accepted: false,
      normalized: null,
      targetReferenceName: null,
      targetKind: null,
      sourceAuthority: null,
      forbiddenFields: []
    };
  }

  const target = firstString(
    runtimeTarget.target,
    runtimeTarget.target_name,
    runtimeTarget.targetName,
    runtimeTarget.name
  );
  const kind = firstString(runtimeTarget.kind, runtimeTarget.type, runtimeTarget.runtime);
  const targetReferenceName = firstString(
    runtimeTarget.target_reference_name,
    runtimeTarget.targetReferenceName,
    runtimeTarget.reference_name,
    runtimeTarget.referenceName
  );
  const targetKind = firstString(
    runtimeTarget.target_kind,
    runtimeTarget.targetKind
  );
  const sourceAuthority = firstString(
    runtimeTarget.source_authority,
    runtimeTarget.sourceAuthority
  );
  const configured = normalizeBoolean(runtimeTarget.configured);
  const forbiddenFields = collectForbiddenRuntimeTargetFields(runtimeTarget);
  const nativeRuntime = target === REQUIRED_PRIMARY_RUNTIME || kind === 'vcp_toolbox_native_memory';
  const accepted = nativeRuntime &&
    configured &&
    isSafeReferenceName(targetReferenceName) &&
    TARGET_KINDS.includes(targetKind) &&
    sourceAuthority === SOURCE_AUTHORITY &&
    forbiddenFields.length === 0;

  return {
    accepted,
    normalized: nativeRuntime ? REQUIRED_PRIMARY_RUNTIME : null,
    targetReferenceName: isSafeReferenceName(targetReferenceName) ? targetReferenceName : null,
    targetKind: TARGET_KINDS.includes(targetKind) ? targetKind : null,
    sourceAuthority: sourceAuthority === SOURCE_AUTHORITY ? sourceAuthority : null,
    configured,
    forbiddenFields
  };
}

function normalizeScope(scope, request, clientId) {
  if (!isPlainObject(scope)) {
    return {
      accepted: false,
      visibility: null,
      hasIdentifier: false,
      clientMatches: false,
      normalized: null
    };
  }

  const projectId = firstString(scope.project_id, scope.projectId);
  const workspaceId = firstString(scope.workspace_id, scope.workspaceId);
  const scopeId = firstString(scope.scope_id, scope.scopeId);
  const suppliedClientId = firstString(scope.client_id, scope.clientId);
  const visibility = firstString(scope.visibility, request.visibility).toLowerCase();
  const identifiers = [scopeId, projectId, workspaceId].filter(Boolean);
  const hasIdentifier = identifiers.length > 0;
  const identifiersSafe = identifiers.every(isSafeReferenceName);
  const clientMatches = !suppliedClientId ||
    suppliedClientId.toLowerCase() === String(clientId || '').toLowerCase();
  const acceptedVisibility = ALLOWED_VISIBILITIES.includes(visibility) ? visibility : null;
  const accepted = hasIdentifier && identifiersSafe && acceptedVisibility !== null && clientMatches;

  return {
    accepted,
    visibility: acceptedVisibility,
    hasIdentifier,
    identifiersSafe,
    clientMatches,
    normalized: accepted
      ? {
        ...(scopeId ? { scope_id: scopeId } : {}),
        ...(projectId ? { project_id: projectId } : {}),
        ...(workspaceId ? { workspace_id: workspaceId } : {}),
        client_id: clientId,
        visibility: acceptedVisibility
      }
      : null
  };
}

function normalizeTrustedExecutionContext(trustedContextResult, clientId) {
  if (trustedContextResult === undefined) {
    return {
      supplied: false,
      accepted: true,
      agentAliasMatches: true,
      referencesSafe: true,
      visibilityAccepted: true,
      scope: null
    };
  }

  if (!isPlainObject(trustedContextResult)) {
    return {
      supplied: true,
      accepted: false,
      agentAliasMatches: false,
      referencesSafe: false,
      visibilityAccepted: false,
      scope: null
    };
  }

  const executionContext = isPlainObject(trustedContextResult.executionContext)
    ? trustedContextResult.executionContext
    : {};
  const agentAlias = firstString(executionContext.agentAlias, executionContext.agent_alias);
  const trustedClientId = firstString(executionContext.clientId, executionContext.client_id);
  const projectId = firstString(executionContext.projectId, executionContext.project_id);
  const workspaceId = firstString(executionContext.workspaceId, executionContext.workspace_id);
  const scopeId = firstString(executionContext.scopeId, executionContext.scope_id);
  const visibility = firstString(executionContext.visibility, executionContext.visibility_policy).toLowerCase();
  const referenceValues = [agentAlias, trustedClientId, projectId, workspaceId, scopeId].filter(Boolean);
  const referencesSafe = referenceValues.every(isSafeReferenceName);
  const visibilityAccepted = !visibility || ALLOWED_VISIBILITIES.includes(visibility);
  const agentAliasMatches = agentAlias === String(clientId || '');

  return {
    supplied: true,
    accepted: trustedContextResult.accepted === true,
    agentAliasMatches,
    referencesSafe,
    visibilityAccepted,
    scope: {
      ...(projectId && isSafeReferenceName(projectId) ? {
        project_id: projectId
      } : {}),
      ...(workspaceId && isSafeReferenceName(workspaceId) ? {
        workspace_id: workspaceId
      } : {}),
      ...(scopeId && isSafeReferenceName(scopeId) ? {
        scope_id: scopeId
      } : {}),
      ...(trustedClientId && isSafeReferenceName(trustedClientId) ? {
        client_id: trustedClientId
      } : {}),
      ...(visibilityAccepted && visibility ? {
        visibility
      } : {})
    }
  };
}

function scopeMatchesTrustedExecutionContext(scope, trustedExecutionContext) {
  if (!trustedExecutionContext.supplied) return true;
  if (!scope.normalized || !trustedExecutionContext.scope) return false;
  for (const key of ['project_id', 'scope_id', 'workspace_id', 'client_id', 'visibility']) {
    if (!trustedExecutionContext.scope[key]) continue;
    if (
      key === 'client_id' &&
      trustedExecutionContext.scope[key].toLowerCase() === String(scope.normalized[key] || '').toLowerCase()
    ) {
      continue;
    }
    if (trustedExecutionContext.scope[key] !== scope.normalized[key]) {
      return false;
    }
  }
  return true;
}

function normalizeInvocationProfile(invocationProfile) {
  if (!isPlainObject(invocationProfile)) {
    return {
      accepted: false,
      profile: null,
      toolName: null,
      transport: null,
      forbiddenFields: []
    };
  }

  const forbiddenFields = collectForbiddenRuntimeTargetFields(invocationProfile);
  const profile = firstString(
    invocationProfile.profile,
    invocationProfile.name,
    invocationProfile.invocation_profile,
    invocationProfile.invocationProfile
  );
  const transport = firstString(invocationProfile.transport, invocationProfile.access_path, invocationProfile.accessPath);
  const toolName = firstString(invocationProfile.tool_name, invocationProfile.toolName, invocationProfile.mcpToolName);
  const publicToolNames = TOOL_DEFINITIONS.map(tool => tool.name);
  const profileMatchesTool =
    (profile === 'governed_read_only' && READ_TOOLS.includes(toolName)) ||
    (profile === 'governed_bounded_write' && WRITE_TOOLS.includes(toolName));

  return {
    accepted: ALLOWED_INVOCATION_PROFILES.includes(profile) &&
      transport === 'mcp' &&
      publicToolNames.includes(toolName) &&
      profileMatchesTool &&
      forbiddenFields.length === 0,
    profile: ALLOWED_INVOCATION_PROFILES.includes(profile) ? profile : null,
    toolName: publicToolNames.includes(toolName) ? toolName : null,
    transport: transport === 'mcp' ? transport : null,
    profileMatchesTool,
    forbiddenFields
  };
}

function normalizeAuthority(authority, invocationProfile) {
  if (!isPlainObject(authority)) {
    return {
      accepted: false,
      readAllowed: false,
      writeAllowed: false,
      writeRequiresExactApproval: false,
      forbiddenFields: []
    };
  }

  const forbiddenFields = collectForbiddenRuntimeTargetFields(authority);
  const readAllowed = normalizeBoolean(authority.read ?? authority.read_allowed ?? authority.readAllowed);
  const writeAllowed = normalizeBoolean(authority.write ?? authority.write_allowed ?? authority.writeAllowed);
  const writePolicy = firstString(authority.write_policy, authority.writePolicy);
  const unboundedWrite = normalizeBoolean(
    authority.unbounded_write ??
      authority.unboundedWrite ??
      authority.unbounded_record_memory_write ??
      authority.unboundedRecordMemoryWrite
  );
  const toolName = invocationProfile.toolName;
  const readToolAllowed = !toolName || READ_TOOLS.includes(toolName);
  const writeToolAllowed = !toolName || WRITE_TOOLS.includes(toolName);

  const accepted = (readAllowed && !writeAllowed && readToolAllowed) ||
    (!readAllowed && writeAllowed && writeToolAllowed && writePolicy === 'exact_approval' && !unboundedWrite);

  return {
    accepted: accepted && forbiddenFields.length === 0,
    readAllowed,
    writeAllowed,
    writeRequiresExactApproval: writeAllowed,
    writePolicy,
    unboundedWrite,
    readToolAllowed,
    writeToolAllowed,
    forbiddenFields
  };
}

function normalizeDisclosureBudget(budget) {
  if (!isPlainObject(budget)) {
    return {
      accepted: false,
      level: null,
      rawOutputAllowed: true,
      forbiddenFields: []
    };
  }

  const forbiddenFields = collectForbiddenRuntimeTargetFields(budget);
  const level = firstString(budget.level, budget.disclosure_level, budget.disclosureLevel);
  const rawOutputAllowed = normalizeBoolean(
    budget.raw_output ??
      budget.rawOutput ??
      budget.raw_body ??
      budget.rawBody ??
      budget.full_output ??
      budget.fullOutput
  );
  const lowDisclosure = normalizeBoolean(budget.low_disclosure ?? budget.lowDisclosure);
  const maxItems = budget.max_items ?? budget.maxItems;
  const maxBytes = budget.max_bytes ?? budget.maxBytes;
  const itemBudgetOk = maxItems === undefined || (Number.isInteger(Number(maxItems)) && Number(maxItems) >= 0 && Number(maxItems) <= 5);
  const byteBudgetOk = maxBytes === undefined || (Number.isInteger(Number(maxBytes)) && Number(maxBytes) >= 0 && Number(maxBytes) <= 4096);
  const normalizedMaxItems = maxItems === undefined ? 5 : Number(maxItems);
  const normalizedMaxBytes = maxBytes === undefined ? 4096 : Number(maxBytes);

  return {
    accepted: lowDisclosure &&
      ALLOWED_DISCLOSURE_LEVELS.includes(level) &&
      !rawOutputAllowed &&
      itemBudgetOk &&
      byteBudgetOk &&
      forbiddenFields.length === 0,
    level: ALLOWED_DISCLOSURE_LEVELS.includes(level) ? level : null,
    rawOutputAllowed,
    lowDisclosure,
    itemBudgetOk,
    byteBudgetOk,
    maxItems: itemBudgetOk ? normalizedMaxItems : null,
    maxBytes: byteBudgetOk ? normalizedMaxBytes : null,
    forbiddenFields
  };
}

function normalizeAuditReceipt(auditReceipt) {
  if (!isPlainObject(auditReceipt)) {
    return {
      accepted: false,
      required: false,
      lowDisclosure: false,
      receiptReferencePresent: false,
      forbiddenFields: []
    };
  }

  const forbiddenFields = collectForbiddenRuntimeTargetFields(auditReceipt);
  const required = normalizeBoolean(auditReceipt.required);
  const lowDisclosure = normalizeBoolean(auditReceipt.low_disclosure ?? auditReceipt.lowDisclosure);
  const receiptReference = firstString(
    auditReceipt.receipt_id,
    auditReceipt.receiptId,
    auditReceipt.receipt_plan_id,
    auditReceipt.receiptPlanId,
    auditReceipt.correlation_id,
    auditReceipt.correlationId
  );
  const receiptReferencePresent = Boolean(receiptReference);
  const receiptReferenceSafe = isSafeReferenceName(receiptReference);

  return {
    accepted: required &&
      lowDisclosure &&
      receiptReferencePresent &&
      receiptReferenceSafe &&
      forbiddenFields.length === 0,
    required,
    lowDisclosure,
    receiptReferencePresent,
    receiptReferenceSafe,
    receiptReferenceName: receiptReferenceSafe ? receiptReference : null,
    forbiddenFields
  };
}

function normalizeRollbackPosture(rollbackPosture, authority) {
  if (!isPlainObject(rollbackPosture)) {
    return {
      accepted: false,
      mode: null,
      planReferencePresent: false,
      planReferenceSafe: false,
      planReferenceName: null,
      forbiddenFields: []
    };
  }

  const forbiddenFields = collectForbiddenRuntimeTargetFields(rollbackPosture);
  const mode = firstString(rollbackPosture.mode, rollbackPosture.posture, rollbackPosture.rollback_posture);
  const planReference = firstString(
    rollbackPosture.plan_ref,
    rollbackPosture.planRef,
    rollbackPosture.rollback_plan_ref,
    rollbackPosture.rollbackPlanRef
  );
  const planReferencePresent = Boolean(planReference);
  const planReferenceSafe = isSafeReferenceName(planReference);

  if (authority.writeAllowed) {
    return {
      accepted: ['bounded_rollback_plan', 'mutation_cleanup_plan'].includes(mode) &&
        planReferencePresent &&
        planReferenceSafe &&
        forbiddenFields.length === 0,
      mode: ['bounded_rollback_plan', 'mutation_cleanup_plan'].includes(mode) ? mode : null,
      planReferencePresent,
      planReferenceSafe,
      planReferenceName: planReferenceSafe ? planReference : null,
      forbiddenFields
    };
  }

  return {
    accepted: ['no_runtime_state_to_rollback', 'read_only_no_write'].includes(mode) &&
      !planReferencePresent &&
      forbiddenFields.length === 0,
    mode: ['no_runtime_state_to_rollback', 'read_only_no_write'].includes(mode) ? mode : null,
    planReferencePresent,
    planReferenceSafe,
    planReferenceName: null,
    forbiddenFields
  };
}

function normalizeApprovalScope(scope) {
  if (!isPlainObject(scope)) {
    return {
      normalized: null,
      referenceFieldsSafe: false,
      visibilityAccepted: false
    };
  }
  const scopeId = firstString(scope.scope_id, scope.scopeId);
  const projectId = firstString(scope.project_id, scope.projectId);
  const workspaceId = firstString(scope.workspace_id, scope.workspaceId);
  const clientId = firstString(scope.client_id, scope.clientId);
  const visibility = firstString(scope.visibility).toLowerCase();
  const referenceFields = [scopeId, projectId, workspaceId, clientId].filter(Boolean);
  const referenceFieldsSafe = referenceFields.every(isSafeReferenceName);
  const visibilityAccepted = ALLOWED_VISIBILITIES.includes(visibility);
  const normalized = {
    ...(scopeId && isSafeReferenceName(scopeId) ? {
      scope_id: scopeId
    } : {}),
    ...(projectId && isSafeReferenceName(projectId) ? {
      project_id: projectId
    } : {}),
    ...(workspaceId && isSafeReferenceName(workspaceId) ? {
      workspace_id: workspaceId
    } : {}),
    ...(clientId && isSafeReferenceName(clientId) ? {
      client_id: clientId
    } : {}),
    ...(visibilityAccepted ? {
      visibility
    } : {})
  };
  return {
    normalized: Object.keys(normalized).length > 0 ? normalized : null,
    referenceFieldsSafe,
    visibilityAccepted
  };
}

function scopeMatchesApproval(requestScope, approvalScope) {
  if (!isPlainObject(requestScope) || !isPlainObject(approvalScope)) return false;
  for (const [key, value] of Object.entries(requestScope)) {
    if (approvalScope[key] !== value) return false;
  }
  return true;
}

function normalizeApprovalRuntimeTarget(runtimeTarget) {
  if (!isPlainObject(runtimeTarget)) {
    return {
      normalized: null,
      targetReferenceSafe: false,
      targetKindAccepted: false,
      primaryRuntimeAccepted: false
    };
  }
  const targetReferenceName = firstString(
    runtimeTarget.target_reference_name,
    runtimeTarget.targetReferenceName,
    runtimeTarget.reference_name,
    runtimeTarget.referenceName
  );
  const targetKind = firstString(
    runtimeTarget.target_kind,
    runtimeTarget.targetKind
  );
  const primaryRuntime = firstString(
    runtimeTarget.target,
    runtimeTarget.target_name,
    runtimeTarget.targetName,
    runtimeTarget.primaryRuntime,
    runtimeTarget.primary_runtime
  );
  const targetReferenceSafe = isSafeReferenceName(targetReferenceName);
  const targetKindAccepted = targetKind === 'mcp_server';
  const primaryRuntimeAccepted = primaryRuntime === REQUIRED_PRIMARY_RUNTIME;

  return {
    normalized: {
      ...(targetReferenceSafe ? {
        targetReferenceName
      } : {}),
      ...(targetKindAccepted ? {
        targetKind
      } : {}),
      ...(primaryRuntimeAccepted ? {
        primaryRuntime
      } : {})
    },
    targetReferenceSafe,
    targetKindAccepted,
    primaryRuntimeAccepted
  };
}

function runtimeTargetMatchesApproval(runtimeTarget, approvalRuntimeTarget) {
  if (!runtimeTarget?.targetReferenceName || !runtimeTarget?.targetKind || !isPlainObject(approvalRuntimeTarget)) {
    return false;
  }
  return approvalRuntimeTarget.targetReferenceName === runtimeTarget.targetReferenceName &&
    approvalRuntimeTarget.targetKind === runtimeTarget.targetKind &&
    approvalRuntimeTarget.primaryRuntime === REQUIRED_PRIMARY_RUNTIME;
}

function normalizeApprovalRollbackPlanRef(exactApprovalResult) {
  if (!isPlainObject(exactApprovalResult)) {
    return {
      planReferencePresent: false,
      planReferenceSafe: false,
      planReferenceName: null
    };
  }
  const rollbackPosture = isPlainObject(exactApprovalResult.rollbackPosture)
    ? exactApprovalResult.rollbackPosture
    : isPlainObject(exactApprovalResult.rollback_posture)
      ? exactApprovalResult.rollback_posture
      : {};
  const candidate = firstString(
    exactApprovalResult.allowedRollbackPlanRef,
    exactApprovalResult.allowed_rollback_plan_ref,
    exactApprovalResult.approvedRollbackPlanRef,
    exactApprovalResult.approved_rollback_plan_ref,
    exactApprovalResult.rollbackPlanRef,
    exactApprovalResult.rollback_plan_ref,
    rollbackPosture.rollbackPlanRef,
    rollbackPosture.rollback_plan_ref,
    rollbackPosture.planRef,
    rollbackPosture.plan_ref
  );
  const planReferencePresent = Boolean(candidate);
  const planReferenceSafe = isSafeReferenceName(candidate);
  return {
    planReferencePresent,
    planReferenceSafe,
    planReferenceName: planReferenceSafe ? candidate : null
  };
}

function rollbackPlanMatchesApproval(rollbackPosture, approvalRollbackPlanRef) {
  if (!rollbackPosture?.planReferenceName || !approvalRollbackPlanRef) return false;
  return rollbackPosture.planReferenceName === approvalRollbackPlanRef;
}

function normalizeExactApproval(exactApprovalResult, invocationProfile, scope, runtimeTarget, rollbackPosture) {
  if (!isPlainObject(exactApprovalResult)) {
    return {
      accepted: false,
      action: null,
      expectedAction: WRITE_TOOL_EXACT_APPROVAL_ACTIONS[invocationProfile.toolName] || null,
      actionMatches: false,
      scopeMatches: false,
      runtimeTargetMatches: false,
      rollbackPlanMatches: false,
      scopeReferenceFieldsSafe: false,
      scopeVisibilityAccepted: false,
      runtimeTargetReferenceSafe: false,
      runtimeTargetKindAccepted: false,
      runtimeTargetPrimaryRuntimeAccepted: false,
      rollbackPlanReferencePresent: false,
      rollbackPlanReferenceSafe: false,
      forbiddenFieldCount: 0
    };
  }

  const action = firstString(
    exactApprovalResult.allowedAction,
    exactApprovalResult.allowed_action,
    exactApprovalResult.action,
    exactApprovalResult.approvedAction,
    exactApprovalResult.approved_action
  );
  const expectedAction = WRITE_TOOL_EXACT_APPROVAL_ACTIONS[invocationProfile.toolName] || null;
  const approvalScope = normalizeApprovalScope(
    exactApprovalResult.allowedScope ||
      exactApprovalResult.allowed_scope ||
      exactApprovalResult.approvedScope ||
      exactApprovalResult.approved_scope ||
      exactApprovalResult.scope
  );
  const approvalRuntimeTarget = normalizeApprovalRuntimeTarget(
    exactApprovalResult.runtimeTarget ||
      exactApprovalResult.runtime_target ||
      exactApprovalResult.allowedRuntimeTarget ||
      exactApprovalResult.allowed_runtime_target ||
      exactApprovalResult.approvedRuntimeTarget ||
      exactApprovalResult.approved_runtime_target
  );
  const approvalRollbackPlanRef = normalizeApprovalRollbackPlanRef(exactApprovalResult);
  const approvalDecisionReference = firstString(
    exactApprovalResult.approvalDecisionReference,
    exactApprovalResult.approval_decision_reference
  );
  const claimBindingHash = firstString(
    exactApprovalResult.claimBindingHash,
    exactApprovalResult.claim_binding_hash
  );
  const forbiddenFields = collectForbiddenRuntimeTargetFields(exactApprovalResult);

  return {
    accepted: exactApprovalResult.accepted === true && forbiddenFields.length === 0,
    action: expectedAction && action === expectedAction ? action : null,
    expectedAction,
    actionMatches: Boolean(expectedAction && action === expectedAction),
    scopeMatches: scopeMatchesApproval(scope.normalized, approvalScope.normalized),
    runtimeTargetMatches: runtimeTargetMatchesApproval(runtimeTarget, approvalRuntimeTarget.normalized),
    rollbackPlanMatches: rollbackPlanMatchesApproval(rollbackPosture, approvalRollbackPlanRef.planReferenceName),
    scopeReferenceFieldsSafe: approvalScope.referenceFieldsSafe,
    scopeVisibilityAccepted: approvalScope.visibilityAccepted,
    runtimeTargetReferenceSafe: approvalRuntimeTarget.targetReferenceSafe,
    runtimeTargetKindAccepted: approvalRuntimeTarget.targetKindAccepted,
    runtimeTargetPrimaryRuntimeAccepted: approvalRuntimeTarget.primaryRuntimeAccepted,
    rollbackPlanReferencePresent: approvalRollbackPlanRef.planReferencePresent,
    rollbackPlanReferenceSafe: approvalRollbackPlanRef.planReferenceSafe,
    approvalDecisionReference: isSafeReferenceName(approvalDecisionReference)
      ? approvalDecisionReference
      : null,
    claimBindingHash: /^[a-f0-9]{64}$/.test(claimBindingHash) ? claimBindingHash : null,
    forbiddenFieldCount: forbiddenFields.length
  };
}

function validateZeroSideEffects(counters = {}) {
  const normalized = {};
  const blockers = [];

  for (const field of ZERO_SIDE_EFFECT_COUNTERS) {
    normalized[field] = numberOrZero(counters[field]);
    if (normalized[field] !== 0) blockers.push(`${field}_must_be_zero_before_bridge_gate`);
  }

  return { normalized, blockers };
}

function validateGovernedMcpVcpNativeBridgeGate(input = {}) {
  const blockers = [];

  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', ['input_must_be_plain_object']);
  }

  const counters = validateZeroSideEffects(input.counters || {});
  blockers.push(...counters.blockers);

  const productGoalResult = validateCurrentProductGoalContract({
    product_goal: input.product_goal || input.productGoal,
    counters: input.counters || {}
  });
  if (!productGoalResult.accepted) {
    blockers.push('current_product_goal_must_be_accepted');
    blockers.push(...productGoalResult.blockers);
  }

  const request = input.bridge_request || input.bridgeRequest || {};
  if (!isPlainObject(request)) {
    blockers.push('bridge_request_must_be_plain_object');
  }

  const effectiveRequest = isPlainObject(request) ? request : {};
  const clientId = firstString(getAlias(effectiveRequest, 'client_id', 'clientId'));
  if (!REQUIRED_CLIENTS.includes(clientId)) blockers.push('client_id_must_be_codex');

  const scope = normalizeScope(effectiveRequest.scope, effectiveRequest, clientId);
  const trustedExecutionContext = normalizeTrustedExecutionContext(
    input.trusted_execution_context || input.trustedExecutionContext,
    clientId
  );
  const trustedScopeMatches = scopeMatchesTrustedExecutionContext(scope, trustedExecutionContext);
  if (trustedExecutionContext.supplied) {
    if (!trustedExecutionContext.accepted) blockers.push('trusted_execution_context_must_be_accepted_when_supplied');
    if (!trustedExecutionContext.agentAliasMatches) blockers.push('trusted_execution_context_agent_alias_must_match_client_id');
    if (!trustedExecutionContext.referencesSafe) blockers.push('trusted_execution_context_references_must_be_safe');
    if (!trustedExecutionContext.visibilityAccepted) blockers.push('trusted_execution_context_visibility_must_be_private_project_or_workspace');
    if (!trustedScopeMatches) blockers.push('scope_must_match_trusted_execution_context');
  }
  if (!scope.accepted) {
    if (!isPlainObject(effectiveRequest.scope)) blockers.push('scope_must_be_plain_object');
    if (!scope.hasIdentifier) blockers.push('scope_identifier_required');
    if (scope.hasIdentifier && !scope.identifiersSafe) blockers.push('scope_identifier_must_be_safe_reference');
    if (!scope.visibility) blockers.push('visibility_must_be_private_project_or_workspace');
    if (!scope.clientMatches) blockers.push('scope_client_id_must_match_client_id');
  }

  const runtimeTarget = normalizeRuntimeTarget(getAlias(effectiveRequest, 'runtime_target', 'runtimeTarget'));
  if (!runtimeTarget.accepted) {
    blockers.push('runtime_target_must_be_vcp_toolbox_native_memory');
    if (!runtimeTarget.configured) blockers.push('runtime_target_reference_must_be_configured_by_bridge');
    if (!runtimeTarget.targetReferenceName) blockers.push('runtime_target_reference_must_be_safe_reference');
    if (!runtimeTarget.targetKind) blockers.push('runtime_target_kind_must_be_supported_vcp_target_kind');
    if (!runtimeTarget.sourceAuthority) blockers.push('runtime_target_source_authority_must_be_bridge_config');
    if (runtimeTarget.forbiddenFields.length > 0) blockers.push('runtime_target_must_not_include_locator_or_secret_material');
  }

  const invocationProfile = normalizeInvocationProfile(getAlias(effectiveRequest, 'invocation_profile', 'invocationProfile'));
  if (!invocationProfile.accepted) blockers.push('invocation_profile_must_be_governed_mcp_tool_profile');
  if (invocationProfile.profile && invocationProfile.toolName && !invocationProfile.profileMatchesTool) {
    blockers.push('invocation_profile_must_match_mcp_tool_direction');
  }
  if (invocationProfile.forbiddenFields.length > 0) {
    blockers.push('invocation_profile_must_not_include_locator_or_secret_material');
  }

  const authority = normalizeAuthority(
    getAlias(effectiveRequest, 'read_write_authority', 'readWriteAuthority'),
    invocationProfile
  );
  if (!authority.accepted) {
    blockers.push('read_write_authority_must_match_invocation_profile');
    if (authority.unboundedWrite) blockers.push('unbounded_write_not_allowed');
  }
  if (authority.forbiddenFields.length > 0) {
    blockers.push('read_write_authority_must_not_include_locator_or_secret_material');
  }

  const disclosureBudget = normalizeDisclosureBudget(
    getAlias(effectiveRequest, 'output_disclosure_budget', 'outputDisclosureBudget')
  );
  if (!disclosureBudget.accepted) {
    blockers.push('output_disclosure_budget_must_be_low_disclosure_and_bounded');
  }
  if (disclosureBudget.forbiddenFields.length > 0) {
    blockers.push('output_disclosure_budget_must_not_include_locator_or_secret_material');
  }

  const auditReceipt = normalizeAuditReceipt(getAlias(effectiveRequest, 'audit_receipt', 'auditReceipt'));
  if (!auditReceipt.accepted) blockers.push('audit_receipt_must_be_required_low_disclosure_and_referenced');
  if (auditReceipt.receiptReferencePresent && !auditReceipt.receiptReferenceSafe) {
    blockers.push('audit_receipt_reference_must_be_safe_reference');
  }
  if (auditReceipt.forbiddenFields.length > 0) {
    blockers.push('audit_receipt_must_not_include_locator_or_secret_material');
  }

  const rollbackPosture = normalizeRollbackPosture(
    getAlias(effectiveRequest, 'rollback_posture', 'rollbackPosture'),
    authority
  );
  if (!rollbackPosture.accepted) blockers.push('rollback_posture_must_match_read_write_authority');
  if (!authority.writeAllowed && rollbackPosture.planReferencePresent) {
    blockers.push('read_only_rollback_posture_must_not_include_plan_reference');
  }
  if (rollbackPosture.planReferencePresent && !rollbackPosture.planReferenceSafe) {
    blockers.push('rollback_plan_reference_must_be_safe_reference');
  }
  if (rollbackPosture.forbiddenFields.length > 0) {
    blockers.push('rollback_posture_must_not_include_locator_or_secret_material');
  }

  const exactApprovalResult = input.exact_approval_result || input.exactApprovalResult;
  const exactApproval = normalizeExactApproval(
    exactApprovalResult,
    invocationProfile,
    scope,
    runtimeTarget,
    rollbackPosture
  );
  if (authority.writeAllowed) {
    if (!exactApproval.accepted) {
      blockers.push('write_authority_requires_accepted_exact_approval');
    }
    if (exactApproval.forbiddenFieldCount > 0) {
      blockers.push('write_authority_exact_approval_must_not_include_locator_or_secret_material');
    }
    if (!exactApproval.actionMatches) {
      blockers.push('write_authority_exact_approval_action_must_match_mcp_tool');
    }
    if (!exactApproval.scopeMatches) {
      blockers.push('write_authority_exact_approval_scope_must_match_bridge_scope');
    }
    if (!exactApproval.runtimeTargetMatches) {
      blockers.push('write_authority_exact_approval_runtime_target_must_match_bridge_target');
    }
    if (!exactApproval.rollbackPlanMatches) {
      blockers.push('write_authority_exact_approval_rollback_plan_must_match_bridge_rollback_posture');
    }
    if (!auditReceipt.accepted || !rollbackPosture.accepted || !disclosureBudget.accepted) {
      blockers.push('write_authority_requires_audit_disclosure_and_rollback_controls');
    }
    if (isPlainObject(exactApprovalResult)) {
      if (!exactApproval.scopeReferenceFieldsSafe) {
        blockers.push('write_authority_exact_approval_scope_references_must_be_safe');
      }
      if (!exactApproval.scopeVisibilityAccepted) {
        blockers.push('write_authority_exact_approval_scope_visibility_must_be_private_project_or_workspace');
      }
      if (!exactApproval.runtimeTargetReferenceSafe) {
        blockers.push('write_authority_exact_approval_runtime_target_reference_must_be_safe');
      }
      if (!exactApproval.runtimeTargetKindAccepted) {
        blockers.push('write_authority_exact_approval_runtime_target_kind_must_be_mcp_server');
      }
      if (!exactApproval.runtimeTargetPrimaryRuntimeAccepted) {
        blockers.push('write_authority_exact_approval_runtime_target_must_be_vcp_toolbox_native_memory');
      }
      if (exactApproval.rollbackPlanReferencePresent && !exactApproval.rollbackPlanReferenceSafe) {
        blockers.push('write_authority_exact_approval_rollback_plan_reference_must_be_safe');
      }
    }
  }

  const accepted = blockers.length === 0;
  return {
    contractName: CONTRACT_NAME,
    contractVersion: CONTRACT_VERSION,
    accepted,
    decision: accepted
      ? 'governed_mcp_vcp_native_bridge_gate_accepted'
      : 'governed_mcp_vcp_native_bridge_gate_rejected_fail_closed',
    lowDisclosureRejection: accepted ? null : lowDisclosure('bridge_request_not_governed', blockers),
    requiredRequestDimensions: [...REQUIRED_REQUEST_DIMENSIONS],
    blockers,
    normalizedProductGoal: productGoalResult.normalizedProductGoal,
    normalizedBridgeRequest: {
      client_id: clientId === 'Codex' ? clientId : null,
      trusted_execution_context_supplied: trustedExecutionContext.supplied,
      trusted_execution_context_accepted: trustedExecutionContext.accepted,
      trusted_execution_context_scope_matched: trustedScopeMatches,
      scope_present: isPlainObject(effectiveRequest.scope),
      scope_identifier_present: scope.hasIdentifier,
      scope_identifier_safe: scope.identifiersSafe === true,
      scope: accepted ? scope.normalized : null,
      visibility: scope.visibility,
      runtime_target: runtimeTarget.normalized,
      runtime_target_reference_name: runtimeTarget.targetReferenceName,
      runtime_target_kind: runtimeTarget.targetKind,
      runtime_target_source_authority: runtimeTarget.sourceAuthority,
      runtime_target_configured: runtimeTarget.configured,
      runtime_target_forbidden_field_count: runtimeTarget.forbiddenFields.length,
      access_path: REQUIRED_ACCESS_PATH,
      invocation_profile: invocationProfile.profile,
      mcp_tool_name: invocationProfile.toolName,
      transport: invocationProfile.transport,
      invocation_profile_forbidden_field_count: invocationProfile.forbiddenFields.length,
      read_allowed: authority.readAllowed,
      write_allowed: authority.writeAllowed,
      write_policy: authority.writePolicy === 'exact_approval' ? authority.writePolicy : null,
      read_write_authority_forbidden_field_count: authority.forbiddenFields.length,
      exact_approval_action: exactApproval.action,
      exact_approval_action_matched: authority.writeAllowed ? exactApproval.actionMatches : false,
      exact_approval_scope_matched: authority.writeAllowed ? exactApproval.scopeMatches : false,
      exact_approval_runtime_target_matched: authority.writeAllowed ? exactApproval.runtimeTargetMatches : false,
      exact_approval_rollback_plan_matched: authority.writeAllowed ? exactApproval.rollbackPlanMatches : false,
      exact_approval_scope_references_safe: authority.writeAllowed ? exactApproval.scopeReferenceFieldsSafe : false,
      exact_approval_scope_visibility_accepted: authority.writeAllowed ? exactApproval.scopeVisibilityAccepted : false,
      exact_approval_runtime_target_reference_safe: authority.writeAllowed ? exactApproval.runtimeTargetReferenceSafe : false,
      exact_approval_runtime_target_kind_accepted: authority.writeAllowed ? exactApproval.runtimeTargetKindAccepted : false,
      exact_approval_runtime_target_primary_runtime_accepted: authority.writeAllowed ? exactApproval.runtimeTargetPrimaryRuntimeAccepted : false,
      exact_approval_rollback_plan_reference_present: authority.writeAllowed ? exactApproval.rollbackPlanReferencePresent : false,
      exact_approval_rollback_plan_reference_safe: authority.writeAllowed ? exactApproval.rollbackPlanReferenceSafe : false,
      exact_approval_forbidden_field_count: authority.writeAllowed ? exactApproval.forbiddenFieldCount : 0,
      exact_approval_decision_reference: authority.writeAllowed ? exactApproval.approvalDecisionReference : null,
      exact_approval_claim_binding_hash: authority.writeAllowed ? exactApproval.claimBindingHash : null,
      disclosure_level: disclosureBudget.level,
      disclosure_max_items: disclosureBudget.maxItems,
      disclosure_max_bytes: disclosureBudget.maxBytes,
      disclosure_forbidden_field_count: disclosureBudget.forbiddenFields.length,
      raw_output_allowed: disclosureBudget.rawOutputAllowed,
      audit_receipt_required: auditReceipt.required,
      audit_receipt_low_disclosure: auditReceipt.lowDisclosure,
      audit_receipt_reference_present: auditReceipt.receiptReferencePresent,
      audit_receipt_reference_safe: auditReceipt.receiptReferenceSafe === true,
      audit_receipt_reference_name: auditReceipt.receiptReferenceName,
      audit_receipt_forbidden_field_count: auditReceipt.forbiddenFields.length,
      rollback_posture: rollbackPosture.mode,
      rollback_plan_reference_present: rollbackPosture.planReferencePresent,
      rollback_plan_reference_safe: rollbackPosture.planReferenceSafe,
      rollback_plan_reference_name: rollbackPosture.planReferenceName,
      rollback_posture_forbidden_field_count: rollbackPosture.forbiddenFields.length
    },
    counters: counters.normalized,
    productGoalAccepted: productGoalResult.accepted,
    publicMcpExpanded: false,
    runtimeCalled: false,
    vcpToolBoxCalled: false,
    mcpToolCalled: false,
    memoryReadPerformed: false,
    memoryWritePerformed: false,
    localMemoryReadPerformed: false,
    localMemoryWritePerformed: false,
    auditWritePerformed: false,
    rollbackApplied: false,
    providerApiCalled: false,
    readinessClaimed: false
  };
}

function rejected(reason, blockers) {
  return {
    contractName: CONTRACT_NAME,
    contractVersion: CONTRACT_VERSION,
    accepted: false,
    decision: 'governed_mcp_vcp_native_bridge_gate_rejected_fail_closed',
    lowDisclosureRejection: lowDisclosure(reason, blockers),
    requiredRequestDimensions: [...REQUIRED_REQUEST_DIMENSIONS],
    blockers,
    normalizedProductGoal: null,
    normalizedBridgeRequest: {},
    counters: {},
    productGoalAccepted: false,
    publicMcpExpanded: false,
    runtimeCalled: false,
    vcpToolBoxCalled: false,
    mcpToolCalled: false,
    memoryReadPerformed: false,
    memoryWritePerformed: false,
    localMemoryReadPerformed: false,
    localMemoryWritePerformed: false,
    auditWritePerformed: false,
    rollbackApplied: false,
    providerApiCalled: false,
    readinessClaimed: false
  };
}

module.exports = {
  ALLOWED_DISCLOSURE_LEVELS,
  ALLOWED_INVOCATION_PROFILES,
  ALLOWED_VISIBILITIES,
  CONTRACT_NAME,
  CONTRACT_VERSION,
  READ_TOOLS,
  REQUIRED_REQUEST_DIMENSIONS,
  WRITE_TOOLS,
  ZERO_SIDE_EFFECT_COUNTERS,
  validateGovernedMcpVcpNativeBridgeGate
};
