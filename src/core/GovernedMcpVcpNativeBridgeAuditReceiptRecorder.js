'use strict';

const crypto = require('node:crypto');

const {
  REQUIRED_PRIMARY_RUNTIME,
  validateGovernedMcpNativeBridgeReceiptCoversCurrentProductGoal,
  validateGovernedMcpReadFallbackReceiptCoversLocalMemoryRole
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
const {
  GOVERNED_NATIVE_CLIENTS,
  GOVERNED_NATIVE_VISIBILITIES
} = require('./MemoryAccessContract');

const CONTRACT_NAME = 'GovernedMcpVcpNativeBridgeAuditReceiptRecorder';
const READ_DELEGATION_CONTRACT_NAME = 'GovernedMcpVcpNativeReadDelegationAdapter';
const READ_DELEGATION_CONTRACT_MODE = 'governed_mcp_vcp_native_primary_read_low_disclosure_delegation';
const WRITE_DELEGATION_CONTRACT_NAME = 'GovernedMcpVcpNativeWriteDelegationAdapter';
const WRITE_DELEGATION_CONTRACT_MODE = 'governed_mcp_vcp_native_primary_write_low_disclosure_delegation';
const EVENT_TYPE = 'governed_mcp_vcp_native_bridge_receipt';
const READ_FALLBACK_EVENT_TYPE = 'governed_mcp_vcp_native_read_fallback_receipt';
const REQUIRED_ACCESS_PATH = 'governed MCP tools';
const GOVERNED_BRIDGE_TOOL_NAMES = Object.freeze([
  'search_memory',
  'memory_overview',
  'audit_memory',
  'record_memory',
  'tombstone_memory',
  'supersede_memory'
]);
const GOVERNED_CONTEXT_SOURCE = 'trusted_execution_context_or_transport';
const ALLOWED_SCOPE_FIELD_NAMES = Object.freeze([
  'client_id',
  'project_id',
  'scope_id',
  'visibility',
  'workspace_id'
]);
const ALLOWED_VISIBILITIES = GOVERNED_NATIVE_VISIBILITIES;
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
const ALLOWED_ROLLBACK_POSTURES = Object.freeze([
  'no_runtime_state_to_rollback',
  'read_only_no_write',
  'bounded_rollback_plan',
  'mutation_cleanup_plan'
]);
const ALLOWED_EXACT_APPROVAL_ACTIONS = Object.freeze([
  'live_bridge_record_memory_proof',
  'live_bridge_tombstone_memory_proof',
  'live_bridge_supersede_memory_proof'
]);
const ALLOWED_STATUS_CLASSES = Object.freeze([
  'success',
  'not_available',
  'not_consumed',
  'transport_error',
  'client_error',
  'server_error',
  'output_budget_exceeded',
  'native_invocation_receipt_unbound',
  'audit_receipt_not_appended',
  'fallback_audit_receipt_not_appended'
]);
const ALLOWED_REASON_CODES = Object.freeze([
  'invalid_governed_native_read_delegation_boundary',
  'invalid_governed_native_write_delegation_boundary',
  'native_read_delegation_transport_error',
  'native_read_delegation_client_error',
  'native_read_delegation_server_error',
  'native_read_delegation_output_budget_exceeded',
  'native_read_delegation_native_invocation_receipt_unbound',
  'native_write_delegation_transport_error',
  'native_write_delegation_client_error',
  'native_write_delegation_server_error',
  'native_write_delegation_output_budget_exceeded',
  'native_write_delegation_native_invocation_receipt_unbound',
  'required_bridge_audit_receipt_not_appended',
  'required_read_fallback_audit_receipt_not_appended'
]);
const ALLOWED_ROLLBACK_REASON_CODES = Object.freeze([
  'write_post_commit_output_budget_exceeded',
  'write_post_commit_native_invocation_receipt_unbound',
  'write_post_commit_audit_receipt_not_appended'
]);
const ALLOWED_ROLLBACK_DISPOSITIONS = Object.freeze([
  'no_rollback_required',
  'no_runtime_write_to_rollback',
  'rollback_required_not_applied'
]);
const ALLOWED_ROLLBACK_APPLY_POLICIES = Object.freeze([
  'not_applicable',
  'manual_governed_followup_required'
]);
const ALLOWED_TRANSPORT_CATEGORIES = Object.freeze([
  'local_http_transport'
]);
const ALLOWED_NATIVE_MCP_METHODS = Object.freeze([
  'tools/call'
]);
const ALLOWED_HTTP_STATUS_CLASSES = Object.freeze([
  'success',
  'client_error',
  'server_error',
  'transport_error'
]);
const ALLOWED_JSON_RPC_ERROR_REASON_CODES = Object.freeze([
  'invalid_governance_metadata',
  'native_mutation_tool_unavailable',
  'native_runtime_call_failed',
  'native_tool_public_binding_mismatch',
  'native_write_disabled',
  'unsupported_native_tool'
]);
const ALLOWED_RESPONSE_SHAPE_CATEGORIES = Object.freeze([
  'array_item_count_bucket_only',
  'array_top_level_kind_only',
  'object_top_level_kind_only_no_field_names',
  'null_top_level_kind_only',
  'primitive_top_level_kind_only',
  'unknown_shape',
  'not_consumed'
]);
const ALLOWED_TOP_LEVEL_KIND_CATEGORIES = Object.freeze([
  'array',
  'object',
  'null',
  'string',
  'number',
  'boolean',
  'unknown',
  'not_consumed'
]);
const ALLOWED_ITEM_COUNT_BUCKETS = Object.freeze([
  'zero',
  'one',
  'bounded_many',
  'over_budget_many',
  'object_not_counted',
  'not_applicable',
  'not_consumed'
]);
const ALLOWED_BYTE_COUNT_BUCKETS = Object.freeze([
  'zero',
  'bounded',
  'over_budget',
  'not_consumed'
]);
const ALLOWED_AUDIT_RECEIPT_STATUSES = Object.freeze([
  'appended',
  'not_appended'
]);
const MAX_DISCLOSURE_ITEMS = 5;
const MAX_DISCLOSURE_BYTES = 4096;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function safeString(value, fallback = null) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function safeEnum(value, allowedValues, fallback = null) {
  const normalized = safeString(value);
  return allowedValues.includes(normalized) ? normalized : fallback;
}

function normalizeBoolean(value) {
  return value === true;
}

function normalizeInteger(value, fallback = null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function normalizeIntegerInRange(value, min, max, fallback = null) {
  const parsed = normalizeInteger(value);
  return parsed !== null && parsed >= min && parsed <= max ? parsed : fallback;
}

function normalizeNonNegativeInteger(value, fallback = 0) {
  const parsed = normalizeInteger(value);
  return parsed !== null && parsed >= 0 ? parsed : fallback;
}

function safeGovernedBridgeToolName(value) {
  const normalized = safeString(value);
  return GOVERNED_BRIDGE_TOOL_NAMES.includes(normalized) ? normalized : null;
}

function safeNativeInvocationToolName(value, actualToolName, gateMcpToolName) {
  const normalized = safeGovernedBridgeToolName(value);
  return normalized !== null && normalized === actualToolName && normalized === gateMcpToolName
    ? normalized
    : null;
}

function stableObject(value) {
  if (!isPlainObject(value)) return {};
  return Object.keys(value)
    .sort()
    .reduce((output, key) => {
      const nested = value[key];
      if (nested === undefined || typeof nested === 'function' || typeof nested === 'symbol') return output;
      output[key] = nested;
      return output;
    }, {});
}

function sha256Hex(value) {
  return crypto
    .createHash('sha256')
    .update(String(value), 'utf8')
    .digest('hex');
}

function buildScopeAuditProjection(request = {}) {
  const scope = isPlainObject(request.scope) ? stableObject(request.scope) : {};
  const scopeKeys = Object.keys(scope).filter(key => ALLOWED_SCOPE_FIELD_NAMES.includes(key));
  const identifierKeys = scopeKeys.filter(key => ['project_id', 'scope_id', 'workspace_id'].includes(key));
  const scopeFingerprintSource = scopeKeys.reduce((output, key) => {
    output[key] = scope[key];
    return output;
  }, {});
  return {
    clientId: GOVERNED_NATIVE_CLIENTS.includes(request.client_id) ? request.client_id : null,
    visibility: safeEnum(request.visibility || scope.visibility, ALLOWED_VISIBILITIES),
    scopePresent: scopeKeys.length > 0,
    scopeIdentifierPresent: identifierKeys.length > 0,
    scopeFieldNames: scopeKeys,
    scopeIdentifierFieldNames: identifierKeys,
    scopeFingerprint: scopeKeys.length > 0
      ? sha256Hex(JSON.stringify(scopeFingerprintSource))
      : null,
    rawScopePersisted: false,
    rawScopeValueReturned: false,
    clientIdentitySource: GOVERNED_CONTEXT_SOURCE,
    clientIdentityBound: GOVERNED_NATIVE_CLIENTS.includes(request.client_id),
    clientIdentityToolArgumentsMayOverride: false,
    clientIdentityGovernanceMetadataMayOverride: false,
    scopeBoundarySource: GOVERNED_CONTEXT_SOURCE,
    scopeBoundaryBound: scopeKeys.length > 0 &&
      identifierKeys.length > 0 &&
      request.scope_identifier_safe !== false &&
      scopeKeys.includes('client_id') &&
      scopeKeys.includes('visibility') &&
      ALLOWED_VISIBILITIES.includes(request.visibility || scope.visibility),
    scopeToolArgumentsMayOverride: false,
    scopeGovernanceMetadataMayOverride: false,
    visibilityBound: ALLOWED_VISIBILITIES.includes(request.visibility || scope.visibility)
  };
}

function safeScopeFieldNames(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter(item => typeof item === 'string')
    .filter(item => ALLOWED_SCOPE_FIELD_NAMES.includes(item)))]
    .sort();
}

function safeScopeIdentifierFieldNames(value) {
  return safeScopeFieldNames(value)
    .filter(item => ['project_id', 'scope_id', 'workspace_id'].includes(item));
}

function safeScopeFingerprint(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value) ? value : null;
}

function chooseDelegationResult({ readDelegationResult = null, writeDelegationResult = null } = {}) {
  if (writeDelegationResult) {
    return {
      direction: 'write',
      delegationResult: writeDelegationResult
    };
  }
  if (readDelegationResult) {
    return {
      direction: 'read',
      delegationResult: readDelegationResult
    };
  }
  return {
    direction: null,
    delegationResult: null
  };
}

function delegationContractMatchesDirection(direction, delegationResult = {}) {
  if (direction === 'read') {
    return delegationResult.contractName === READ_DELEGATION_CONTRACT_NAME &&
      delegationResult.contractMode === READ_DELEGATION_CONTRACT_MODE;
  }
  if (direction === 'write') {
    return delegationResult.contractName === WRITE_DELEGATION_CONTRACT_NAME &&
      delegationResult.contractMode === WRITE_DELEGATION_CONTRACT_MODE;
  }
  return false;
}

function receiptMatchesActualInvocation({ receipt = {}, actualToolName = null, targetReferenceName = null } = {}) {
  return actualToolName !== null &&
    targetReferenceName !== null &&
    receipt.toolName === actualToolName &&
    receipt.targetReferenceName === targetReferenceName &&
    receipt.primaryRuntime === REQUIRED_PRIMARY_RUNTIME;
}

function expectedReasonCodeForStatus(direction, statusClass) {
  if (!direction) return null;
  if (statusClass === 'success') return null;
  if (statusClass === 'output_budget_exceeded') {
    return `native_${direction}_delegation_output_budget_exceeded`;
  }
  if (statusClass === 'native_invocation_receipt_unbound') {
    return `native_${direction}_delegation_native_invocation_receipt_unbound`;
  }
  if (['transport_error', 'client_error', 'server_error'].includes(statusClass)) {
    return `native_${direction}_delegation_${statusClass}`;
  }
  if (statusClass === 'audit_receipt_not_appended') {
    return 'required_bridge_audit_receipt_not_appended';
  }
  return null;
}

function buildExecutionEvidenceProjection({
  direction = null,
  gateAccepted = false,
  toolNameMatchesGate = false,
  targetReferenceName = null,
  actualToolName = null,
  delegationResult = {},
  receipt = {}
} = {}) {
  const statusClass = safeEnum(
    receipt.statusClass,
    ALLOWED_STATUS_CLASSES,
    delegationResult?.accepted === true ? 'success' : 'not_available'
  );
  const reasonCode = safeEnum(delegationResult?.reasonCode, ALLOWED_REASON_CODES);
  const expectedReasonCode = expectedReasonCodeForStatus(direction, statusClass);
  const reasonCodeMatchesStatus = expectedReasonCode === null
    ? reasonCode === null
    : reasonCode === expectedReasonCode;
  const contractMatched = delegationContractMatchesDirection(direction, delegationResult);
  const receiptMatched = receiptMatchesActualInvocation({
    receipt,
    actualToolName,
    targetReferenceName
  });
  const callBindingMatched = gateAccepted === true &&
    toolNameMatchesGate === true &&
    contractMatched &&
    receiptMatched &&
    reasonCodeMatchesStatus;
  const acceptedMatched = callBindingMatched &&
    delegationResult?.accepted === true &&
    statusClass === 'success';
  const attemptedMatched = callBindingMatched &&
    (
      acceptedMatched ||
      [
        'transport_error',
        'client_error',
        'server_error',
        'output_budget_exceeded',
        'native_invocation_receipt_unbound',
        'audit_receipt_not_appended'
      ].includes(statusClass)
    );
  const performedMatched = callBindingMatched &&
    [
      'success',
      'output_budget_exceeded',
      'native_invocation_receipt_unbound',
      'audit_receipt_not_appended'
    ].includes(statusClass);
  const fallbackEligibleMatched = direction === 'read' &&
    attemptedMatched &&
    ['transport_error', 'client_error', 'server_error'].includes(statusClass) &&
    normalizeBoolean(delegationResult?.localMemoryFallbackEligible) &&
    !normalizeBoolean(delegationResult?.memoryReadPerformed);

  return {
    delegationContractMatched: contractMatched,
    delegationReceiptMatchedActualInvocation: receiptMatched,
    delegationStatusReasonMatched: reasonCodeMatchesStatus,
    delegationAccepted: acceptedMatched,
    statusClass,
    reasonCode,
    nativeInvocationAttempted: attemptedMatched && normalizeBoolean(receipt.nativeInvocationAttempted),
    nativeMcpToolInvocationAttempted: attemptedMatched &&
      normalizeBoolean(receipt.nativeMcpToolInvocationAttempted),
    runtimeCalled: attemptedMatched && normalizeBoolean(delegationResult?.runtimeCalled),
    vcpToolBoxCalled: attemptedMatched && normalizeBoolean(delegationResult?.vcpToolBoxCalled),
    mcpToolCalled: attemptedMatched && normalizeBoolean(delegationResult?.mcpToolCalled),
    memoryReadPerformed: direction === 'read' &&
      performedMatched &&
      normalizeBoolean(delegationResult?.memoryReadPerformed),
    memoryWritePerformed: direction === 'write' &&
      performedMatched &&
      normalizeBoolean(delegationResult?.memoryWritePerformed),
    localMemoryFallbackEligible: fallbackEligibleMatched,
    localMemoryFallbackUsed: false
  };
}

function buildRollbackEvidenceProjection({ request = {}, receipt = {}, direction = null, executionEvidence = {} } = {}) {
  const rollbackPosture = safeEnum(request.rollback_posture, ALLOWED_ROLLBACK_POSTURES);
  const rollbackPostureForbiddenFieldCount = normalizeNonNegativeInteger(
    request.rollback_posture_forbidden_field_count,
    0
  );
  const writeRollbackPostureBound = [
    'bounded_rollback_plan',
    'mutation_cleanup_plan'
  ].includes(rollbackPosture);
  const rollbackPlanReferencePresent = normalizeBoolean(request.rollback_plan_reference_present);
  const readRollbackPostureBound = direction === 'read' &&
    [
      'no_runtime_state_to_rollback',
      'read_only_no_write'
    ].includes(rollbackPosture) &&
    rollbackPostureForbiddenFieldCount === 0 &&
    rollbackPlanReferencePresent === false;
  const rollbackPlanReferenceSafe = normalizeBoolean(request.rollback_plan_reference_safe) &&
    rollbackPostureForbiddenFieldCount === 0 &&
    isSafeReferenceName(request.rollback_plan_reference_name);
  const rollbackPlanReferenceName = rollbackPostureForbiddenFieldCount === 0 &&
    isSafeReferenceName(request.rollback_plan_reference_name)
    ? request.rollback_plan_reference_name
    : null;
  const rollbackPlanBound = rollbackPlanReferencePresent &&
    writeRollbackPostureBound &&
    rollbackPlanReferenceSafe &&
    rollbackPlanReferenceName !== null;
  const rollbackPostureBound = readRollbackPostureBound ||
    (rollbackPlanBound && normalizeBoolean(request.exact_approval_rollback_plan_matched));
  const postCommitFailure = direction === 'write' &&
    executionEvidence.memoryWritePerformed === true &&
    [
      'output_budget_exceeded',
      'native_invocation_receipt_unbound',
      'audit_receipt_not_appended'
    ].includes(executionEvidence.statusClass);
  const successfulWrite = direction === 'write' &&
    executionEvidence.memoryWritePerformed === true &&
    executionEvidence.statusClass === 'success';
  const rollbackReasonCode = postCommitFailure
    ? safeEnum(receipt.rollbackReasonCode, ALLOWED_ROLLBACK_REASON_CODES)
    : null;
  const expectedRollbackReasonCode = postCommitFailure
    ? `write_post_commit_${executionEvidence.statusClass}`
    : null;
  const rollbackReasonMatched = expectedRollbackReasonCode === null ||
    rollbackReasonCode === expectedRollbackReasonCode;
  const rollbackRequired = postCommitFailure && rollbackPlanBound && rollbackReasonMatched;

  return {
    rollbackPlanReferencePresent,
    rollbackPlanReferenceSafe,
    rollbackPlanReferenceName,
    writeRollbackPostureBound,
    readRollbackPostureBound,
    rollbackPostureBound,
    rollbackPlanBound,
    rollbackPlanShapeOnly: rollbackPlanBound,
    rollbackRequired,
    rollbackReasonCode: rollbackRequired ? rollbackReasonCode : null,
    rollbackDisposition: rollbackRequired
      ? 'rollback_required_not_applied'
      : (successfulWrite ? 'no_rollback_required' : 'no_runtime_write_to_rollback'),
    rollbackFollowupRequired: rollbackRequired,
    rollbackApplyPolicy: rollbackRequired ? 'manual_governed_followup_required' : 'not_applicable',
    rollbackApplyAttempted: false,
    rollbackAutoApplyAllowed: false,
    rollbackRawPlanDisclosed: false,
    rollbackRawPlanPersisted: false
  };
}

function buildLowDisclosureReceiptAuditEntry(input = {}) {
  const gateResult = isPlainObject(input.gateResult) ? input.gateResult : {};
  const request = isPlainObject(gateResult.normalizedBridgeRequest)
    ? gateResult.normalizedBridgeRequest
    : {};
  const { direction, delegationResult } = chooseDelegationResult(input);
  const receipt = isPlainObject(delegationResult?.receipt)
    ? delegationResult.receipt
    : isPlainObject(delegationResult?.delegatedResult?.receipt)
      ? delegationResult.delegatedResult.receipt
      : {};
  const nativeInvocationReceipt = isPlainObject(receipt.nativeInvocationReceipt)
    ? receipt.nativeInvocationReceipt
    : {};
  const nativeRuntimeReceipt = isPlainObject(nativeInvocationReceipt.nativeRuntimeReceipt)
    ? nativeInvocationReceipt.nativeRuntimeReceipt
    : {};

  const scopeAudit = buildScopeAuditProjection(request);
  const actualToolName = safeGovernedBridgeToolName(input.toolName);
  const runtimeTargetForbiddenFieldCount = normalizeNonNegativeInteger(
    request.runtime_target_forbidden_field_count,
    0
  );
  const runtimeTargetUntainted = runtimeTargetForbiddenFieldCount === 0;
  const targetReferenceName = runtimeTargetUntainted &&
    isSafeReferenceName(request.runtime_target_reference_name)
    ? request.runtime_target_reference_name
    : null;
  const invocationProfileForbiddenFieldCount = normalizeNonNegativeInteger(
    request.invocation_profile_forbidden_field_count,
    0
  );
  const readWriteAuthorityForbiddenFieldCount = normalizeNonNegativeInteger(
    request.read_write_authority_forbidden_field_count,
    0
  );
  const gateMcpToolName = invocationProfileForbiddenFieldCount === 0
    ? safeGovernedBridgeToolName(request.mcp_tool_name)
    : null;
  const toolNameMatchesGate = gateMcpToolName !== null && gateMcpToolName === actualToolName;
  const executionEvidence = buildExecutionEvidenceProjection({
    direction,
    gateAccepted: gateResult.accepted === true,
    toolNameMatchesGate,
    targetReferenceName,
    actualToolName,
    delegationResult,
    receipt
  });
  const rollbackEvidence = buildRollbackEvidenceProjection({
    request,
    receipt,
    direction,
    executionEvidence
  });
  const disclosureForbiddenFieldCount = normalizeNonNegativeInteger(
    request.disclosure_forbidden_field_count,
    0
  );
  const auditReceiptForbiddenFieldCount = normalizeNonNegativeInteger(
    request.audit_receipt_forbidden_field_count,
    0
  );
  const rollbackPostureForbiddenFieldCount = normalizeNonNegativeInteger(
    request.rollback_posture_forbidden_field_count,
    0
  );
  const exactApprovalForbiddenFieldCount = normalizeNonNegativeInteger(
    request.exact_approval_forbidden_field_count,
    0
  );
  const exactApprovalUntainted = exactApprovalForbiddenFieldCount === 0;
  const runtimeTargetBound = runtimeTargetUntainted &&
    request.runtime_target === REQUIRED_PRIMARY_RUNTIME &&
    normalizeBoolean(request.runtime_target_configured) &&
    request.runtime_target_kind === 'mcp_server' &&
    request.runtime_target_source_authority === SOURCE_AUTHORITY &&
    isSafeReferenceName(request.runtime_target_reference_name);
  const invocationProfile = invocationProfileForbiddenFieldCount === 0
    ? safeEnum(request.invocation_profile, ALLOWED_INVOCATION_PROFILES)
    : null;
  const invocationProfileBound = invocationProfileForbiddenFieldCount === 0 &&
    request.transport === 'mcp' &&
    invocationProfile !== null &&
    GOVERNED_BRIDGE_TOOL_NAMES.includes(request.mcp_tool_name) &&
    (
      (invocationProfile === 'governed_read_only' && normalizeBoolean(request.write_allowed) !== true) ||
      (invocationProfile === 'governed_bounded_write' && normalizeBoolean(request.write_allowed) === true)
    );
  const readAllowed = readWriteAuthorityForbiddenFieldCount === 0 &&
    normalizeBoolean(request.read_allowed);
  const writeAllowed = readWriteAuthorityForbiddenFieldCount === 0 &&
    normalizeBoolean(request.write_allowed);
  const readWriteAuthorityBound = readWriteAuthorityForbiddenFieldCount === 0 &&
    (
      (readAllowed === true && writeAllowed === false && request.write_policy == null) ||
      (readAllowed === false && writeAllowed === true && request.write_policy === 'exact_approval')
    );
  const nativeInvocationEvidenceAccepted = executionEvidence.nativeInvocationAttempted === true;
  const nativeMcpInvocationEvidenceAccepted = executionEvidence.nativeMcpToolInvocationAttempted === true;

  return {
    timestamp: new Date().toISOString(),
    eventType: EVENT_TYPE,
    contractName: CONTRACT_NAME,
    primaryRuntime: REQUIRED_PRIMARY_RUNTIME,
    delegationDirection: direction,
    toolName: actualToolName,
    accessPath: request.access_path === REQUIRED_ACCESS_PATH ? REQUIRED_ACCESS_PATH : null,
    gateMcpToolName,
    toolNameMatchesGate,
    clientId: scopeAudit.clientId,
    visibility: scopeAudit.visibility,
    scopePresent: scopeAudit.scopePresent,
    scopeIdentifierPresent: scopeAudit.scopeIdentifierPresent,
    scopeFieldNames: scopeAudit.scopeFieldNames,
    scopeIdentifierFieldNames: scopeAudit.scopeIdentifierFieldNames,
    scopeFingerprint: scopeAudit.scopeFingerprint,
    rawScopePersisted: scopeAudit.rawScopePersisted,
    rawScopeValueReturned: scopeAudit.rawScopeValueReturned,
    clientIdentitySource: scopeAudit.clientIdentitySource,
    clientIdentityBound: scopeAudit.clientIdentityBound,
    clientIdentityToolArgumentsMayOverride: scopeAudit.clientIdentityToolArgumentsMayOverride,
    clientIdentityGovernanceMetadataMayOverride: scopeAudit.clientIdentityGovernanceMetadataMayOverride,
    scopeBoundarySource: scopeAudit.scopeBoundarySource,
    scopeBoundaryBound: scopeAudit.scopeBoundaryBound,
    scopeToolArgumentsMayOverride: scopeAudit.scopeToolArgumentsMayOverride,
    scopeGovernanceMetadataMayOverride: scopeAudit.scopeGovernanceMetadataMayOverride,
    visibilityBound: scopeAudit.visibilityBound,
    trustedExecutionContextSupplied: normalizeBoolean(request.trusted_execution_context_supplied),
    trustedExecutionContextAccepted: normalizeBoolean(request.trusted_execution_context_accepted),
    trustedExecutionContextScopeMatched: normalizeBoolean(request.trusted_execution_context_scope_matched),
    targetReferenceName,
    runtimeTargetKind: runtimeTargetUntainted ? safeEnum(request.runtime_target_kind, TARGET_KINDS) : null,
    runtimeTargetSourceAuthority: runtimeTargetUntainted && request.runtime_target_source_authority === SOURCE_AUTHORITY
      ? SOURCE_AUTHORITY
      : null,
    runtimeTargetConfigured: runtimeTargetUntainted && normalizeBoolean(request.runtime_target_configured),
    runtimeTargetForbiddenFieldCount,
    runtimeTargetBound,
    runtimeTargetToolArgumentsMayOverride: false,
    runtimeTargetGovernanceMetadataMayOverride: false,
    invocationProfile,
    invocationProfileSource: invocationProfileForbiddenFieldCount === 0 ? 'bridge_tool_binding' : null,
    invocationProfileBound,
    invocationProfileToolArgumentsMayOverride: false,
    invocationProfileGovernanceMetadataMayOverride: false,
    invocationProfileForbiddenFieldCount,
    readAllowed,
    writeAllowed,
    writePolicy: readWriteAuthorityForbiddenFieldCount === 0 &&
      request.write_policy === 'exact_approval' ? 'exact_approval' : null,
    readWriteAuthoritySource: readWriteAuthorityForbiddenFieldCount === 0 ? 'bridge_tool_binding' : null,
    readWriteAuthorityBound,
    mixedReadWriteAllowed: false,
    unboundedWriteAllowed: false,
    writeRequiresExactApproval: writeAllowed === true,
    readWriteAuthorityForbiddenFieldCount,
    exactApprovalAction: exactApprovalUntainted
      ? safeEnum(request.exact_approval_action, ALLOWED_EXACT_APPROVAL_ACTIONS)
      : null,
    exactApprovalActionMatched: exactApprovalUntainted &&
      normalizeBoolean(request.exact_approval_action_matched),
    exactApprovalDecisionReference: exactApprovalUntainted &&
      isSafeReferenceName(request.exact_approval_decision_reference)
      ? request.exact_approval_decision_reference
      : null,
    exactApprovalClaimBindingHash: exactApprovalUntainted &&
      typeof request.exact_approval_claim_binding_hash === 'string' &&
      /^[a-f0-9]{64}$/.test(request.exact_approval_claim_binding_hash)
      ? request.exact_approval_claim_binding_hash
      : null,
    exactApprovalScopeMatched: exactApprovalUntainted &&
      normalizeBoolean(request.exact_approval_scope_matched),
    exactApprovalRuntimeTargetMatched: exactApprovalUntainted &&
      normalizeBoolean(request.exact_approval_runtime_target_matched),
    exactApprovalRollbackPlanMatched: exactApprovalUntainted &&
      normalizeBoolean(request.exact_approval_rollback_plan_matched),
    exactApprovalScopeReferencesSafe: exactApprovalUntainted &&
      normalizeBoolean(request.exact_approval_scope_references_safe),
    exactApprovalScopeVisibilityAccepted: exactApprovalUntainted &&
      normalizeBoolean(request.exact_approval_scope_visibility_accepted),
    exactApprovalRuntimeTargetReferenceSafe: exactApprovalUntainted &&
      normalizeBoolean(request.exact_approval_runtime_target_reference_safe),
    exactApprovalRuntimeTargetKindAccepted: exactApprovalUntainted &&
      normalizeBoolean(request.exact_approval_runtime_target_kind_accepted),
    exactApprovalRuntimeTargetPrimaryRuntimeAccepted: exactApprovalUntainted &&
      normalizeBoolean(
        request.exact_approval_runtime_target_primary_runtime_accepted
      ),
    exactApprovalRollbackPlanReferencePresent: exactApprovalUntainted &&
      normalizeBoolean(
        request.exact_approval_rollback_plan_reference_present
      ),
    exactApprovalRollbackPlanReferenceSafe: exactApprovalUntainted &&
      normalizeBoolean(request.exact_approval_rollback_plan_reference_safe),
    exactApprovalForbiddenFieldCount,
    disclosureLevel: safeEnum(request.disclosure_level, ALLOWED_DISCLOSURE_LEVELS),
    outputDisclosureBudgetSource: 'bridge_gate_normalized_governance',
    outputDisclosureBudgetBound: disclosureForbiddenFieldCount === 0 &&
      normalizeBoolean(request.raw_output_allowed) === false &&
      safeEnum(request.disclosure_level, ALLOWED_DISCLOSURE_LEVELS) !== null &&
      normalizeIntegerInRange(request.disclosure_max_items, 0, MAX_DISCLOSURE_ITEMS) !== null &&
      normalizeIntegerInRange(request.disclosure_max_bytes, 0, MAX_DISCLOSURE_BYTES) !== null,
    outputDisclosureBudgetToolArgumentsMayOverride: false,
    outputDisclosureBudgetGovernanceMetadataMayOverride: false,
    disclosureMaxItems: normalizeIntegerInRange(request.disclosure_max_items, 0, MAX_DISCLOSURE_ITEMS),
    disclosureMaxBytes: normalizeIntegerInRange(request.disclosure_max_bytes, 0, MAX_DISCLOSURE_BYTES),
    disclosureForbiddenFieldCount,
    rawOutputAllowed: false,
    auditReceiptRequired: normalizeBoolean(request.audit_receipt_required),
    auditReceiptSource: 'bridge_gate_normalized_governance',
    auditReceiptLowDisclosure: normalizeBoolean(request.audit_receipt_low_disclosure),
    auditReceiptLowDisclosureBound: auditReceiptForbiddenFieldCount === 0 &&
      normalizeBoolean(request.audit_receipt_required) &&
      normalizeBoolean(request.audit_receipt_low_disclosure) &&
      normalizeBoolean(request.audit_receipt_reference_present) &&
      normalizeBoolean(request.audit_receipt_reference_safe) &&
      isSafeReferenceName(request.audit_receipt_reference_name),
    auditReceiptToolArgumentsMayOverride: false,
    auditReceiptGovernanceMetadataMayOverride: false,
    bridgeReceiptLowDisclosure: true,
    localMemoryRole: 'not_used',
    localMemorySourceRuntime: null,
    localMemoryPrimaryRuntime: false,
    localMemoryFallbackUsed: false,
    localMemoryResultReturned: false,
    localMemoryResultCanBeMistakenForVcpNative: false,
    localMemoryRawContentDisclosed: false,
    auditReceiptReferencePresent: normalizeBoolean(request.audit_receipt_reference_present),
    auditReceiptReferenceSafe: normalizeBoolean(request.audit_receipt_reference_safe) &&
      auditReceiptForbiddenFieldCount === 0 &&
      isSafeReferenceName(request.audit_receipt_reference_name),
    auditReceiptReferenceName: auditReceiptForbiddenFieldCount === 0 &&
      isSafeReferenceName(request.audit_receipt_reference_name)
      ? request.audit_receipt_reference_name
      : null,
    auditReceiptForbiddenFieldCount,
    rollbackPosture: safeEnum(request.rollback_posture, ALLOWED_ROLLBACK_POSTURES),
    rollbackPostureSource: 'bridge_gate_normalized_governance',
    rollbackPostureForbiddenFieldCount,
    rollbackPlanReferencePresent: rollbackEvidence.rollbackPlanReferencePresent,
    rollbackPlanReferenceSafe: rollbackEvidence.rollbackPlanReferenceSafe,
    rollbackPlanReferenceName: rollbackEvidence.rollbackPlanReferenceName,
    rollbackWritePostureBound: rollbackEvidence.writeRollbackPostureBound,
    rollbackReadPostureBound: rollbackEvidence.readRollbackPostureBound,
    rollbackPostureBound: rollbackEvidence.rollbackPostureBound,
    rollbackPostureToolArgumentsMayOverride: false,
    rollbackPostureGovernanceMetadataMayOverride: false,
    rollbackRequired: rollbackEvidence.rollbackRequired,
    rollbackReasonCode: rollbackEvidence.rollbackReasonCode,
    rollbackPlanBound: rollbackEvidence.rollbackPlanBound,
    rollbackPlanShapeOnly: rollbackEvidence.rollbackPlanShapeOnly,
    rollbackDisposition: rollbackEvidence.rollbackDisposition,
    rollbackFollowupRequired: rollbackEvidence.rollbackFollowupRequired,
    rollbackApplyPolicy: rollbackEvidence.rollbackApplyPolicy,
    rollbackApplyAttempted: rollbackEvidence.rollbackApplyAttempted,
    rollbackAutoApplyAllowed: rollbackEvidence.rollbackAutoApplyAllowed,
    rollbackRawPlanDisclosed: rollbackEvidence.rollbackRawPlanDisclosed,
    rollbackRawPlanPersisted: rollbackEvidence.rollbackRawPlanPersisted,
    gateAccepted: gateResult.accepted === true,
    delegationContractMatched: executionEvidence.delegationContractMatched,
    delegationReceiptMatchedActualInvocation: executionEvidence.delegationReceiptMatchedActualInvocation,
    delegationStatusReasonMatched: executionEvidence.delegationStatusReasonMatched,
    delegationAccepted: executionEvidence.delegationAccepted,
    reasonCode: executionEvidence.reasonCode,
    statusClass: executionEvidence.statusClass,
    responseShapeCategory: nativeInvocationEvidenceAccepted
      ? safeEnum(receipt.responseShapeCategory, ALLOWED_RESPONSE_SHAPE_CATEGORIES)
      : null,
    topLevelKindCategory: nativeInvocationEvidenceAccepted
      ? safeEnum(receipt.topLevelKindCategory, ALLOWED_TOP_LEVEL_KIND_CATEGORIES)
      : null,
    itemCountBucket: nativeInvocationEvidenceAccepted
      ? safeEnum(receipt.itemCountBucket, ALLOWED_ITEM_COUNT_BUCKETS)
      : null,
    byteCountBucket: nativeInvocationEvidenceAccepted
      ? safeEnum(receipt.byteCountBucket, ALLOWED_BYTE_COUNT_BUCKETS)
      : null,
    outputBudgetExceeded: nativeInvocationEvidenceAccepted &&
      normalizeBoolean(receipt.outputBudgetExceeded),
    nativeInvocationAttempted: executionEvidence.nativeInvocationAttempted,
    nativeMcpToolInvocationAttempted: executionEvidence.nativeMcpToolInvocationAttempted,
    nativeInvocationReceiptBindingMatched: nativeInvocationEvidenceAccepted &&
      normalizeBoolean(nativeInvocationReceipt.invocationBindingMatched),
    nativeTransportCategory: nativeInvocationEvidenceAccepted
      ? safeEnum(nativeInvocationReceipt.transportCategory, ALLOWED_TRANSPORT_CATEGORIES)
      : null,
    nativeMcpMethod: nativeMcpInvocationEvidenceAccepted
      ? safeEnum(nativeInvocationReceipt.mcpMethod, ALLOWED_NATIVE_MCP_METHODS)
      : null,
    nativeToolName: nativeMcpInvocationEvidenceAccepted
      ? safeNativeInvocationToolName(
        nativeInvocationReceipt.toolName,
        actualToolName,
        gateMcpToolName
      )
      : null,
    nativeInvocationRequestIdCategory: nativeInvocationEvidenceAccepted &&
      safeString(nativeInvocationReceipt.requestIdCategory) === 'generated_bridge_request_id'
      ? 'generated_bridge_request_id'
      : null,
    nativeInvocationJsonRpcResponseIdMatched: nativeInvocationEvidenceAccepted &&
      normalizeBoolean(nativeInvocationReceipt.jsonRpcResponseIdMatched),
    nativeInvocationGovernanceMetadataPath: nativeInvocationEvidenceAccepted &&
      safeString(nativeInvocationReceipt.governanceMetadataPath) === 'params._meta.codexMemoryGovernance'
      ? 'params._meta.codexMemoryGovernance'
      : null,
    nativeInvocationGovernanceMetadataSent: nativeInvocationEvidenceAccepted &&
      normalizeBoolean(nativeInvocationReceipt.governanceMetadataSent),
    nativeInvocationGovernanceMetadataRawValueDisclosed: nativeInvocationEvidenceAccepted &&
      normalizeBoolean(nativeInvocationReceipt.governanceMetadataRawValueDisclosed),
    nativeInvocationStatusClass: nativeInvocationEvidenceAccepted
      ? safeEnum(nativeInvocationReceipt.statusClass, ALLOWED_STATUS_CLASSES)
      : null,
    nativeInvocationHttpStatusClass: nativeInvocationEvidenceAccepted
      ? safeEnum(nativeInvocationReceipt.httpStatusClass, ALLOWED_HTTP_STATUS_CLASSES)
      : null,
    nativeInvocationJsonRpcErrorPresent: nativeInvocationEvidenceAccepted &&
      normalizeBoolean(nativeInvocationReceipt.jsonRpcErrorPresent),
    nativeInvocationJsonRpcErrorReasonCode: nativeInvocationEvidenceAccepted
      ? safeEnum(nativeInvocationReceipt.jsonRpcErrorReasonCode, ALLOWED_JSON_RPC_ERROR_REASON_CODES)
      : null,
    nativeInvocationResponseShapeCategory: nativeInvocationEvidenceAccepted
      ? safeEnum(nativeInvocationReceipt.responseShapeCategory, ALLOWED_RESPONSE_SHAPE_CATEGORIES)
      : null,
    nativeInvocationTopLevelKindCategory: nativeInvocationEvidenceAccepted
      ? safeEnum(nativeInvocationReceipt.topLevelKindCategory, ALLOWED_TOP_LEVEL_KIND_CATEGORIES)
      : null,
    authorizationResolvedBeforeProvider: nativeInvocationEvidenceAccepted &&
      normalizeBoolean(nativeRuntimeReceipt.authorizationResolvedBeforeProvider),
    diaryAllowlistEnforcedBeforeIndexLoad: nativeInvocationEvidenceAccepted &&
      normalizeBoolean(nativeRuntimeReceipt.diaryAllowlistEnforcedBeforeIndexLoad),
    diaryAllowlistEnforcedBeforeVectorSearch: nativeInvocationEvidenceAccepted &&
      normalizeBoolean(nativeRuntimeReceipt.diaryAllowlistEnforcedBeforeVectorSearch),
    resultScopePostcheckPassed: nativeInvocationEvidenceAccepted &&
      normalizeBoolean(nativeRuntimeReceipt.resultScopePostcheckPassed),
    unscopedNativeSearchUsed: nativeInvocationEvidenceAccepted &&
      normalizeBoolean(nativeRuntimeReceipt.unscopedNativeSearchUsed),
    mappingReferenceBound: nativeInvocationEvidenceAccepted &&
      normalizeBoolean(nativeRuntimeReceipt.mappingReferenceBound),
    mappingDigestBound: nativeInvocationEvidenceAccepted &&
      normalizeBoolean(nativeRuntimeReceipt.mappingDigestBound),
    allowedDiaryCount: nativeInvocationEvidenceAccepted &&
      Number.isInteger(nativeRuntimeReceipt.allowedDiaryCount) &&
      nativeRuntimeReceipt.allowedDiaryCount >= 1 && nativeRuntimeReceipt.allowedDiaryCount <= 8
      ? nativeRuntimeReceipt.allowedDiaryCount
      : 0,
    rawDiaryNamesReturned: false,
    scopeIdAccepted: nativeInvocationEvidenceAccepted && normalizeBoolean(nativeRuntimeReceipt.scopeIdAccepted),
    scopeIdAudited: nativeInvocationEvidenceAccepted && normalizeBoolean(nativeRuntimeReceipt.scopeIdAudited),
    scopeIdFingerprintBound: nativeInvocationEvidenceAccepted &&
      normalizeBoolean(nativeRuntimeReceipt.scopeIdFingerprintBound),
    scopeIdAffectsDiaryAcl: false,
    scopeIdEnforcementClaimed: false,
    omittedPartitionCategories: Array.isArray(nativeRuntimeReceipt.omittedPartitionCategories)
      ? nativeRuntimeReceipt.omittedPartitionCategories.filter(value =>
          ['project_shared', 'workspace_shared'].includes(value)
        )
      : [],
    localMemoryFallbackEligible: executionEvidence.localMemoryFallbackEligible,
    localMemoryFallbackUsed: executionEvidence.localMemoryFallbackUsed,
    runtimeCalled: executionEvidence.runtimeCalled,
    vcpToolBoxCalled: executionEvidence.vcpToolBoxCalled,
    mcpToolCalled: executionEvidence.mcpToolCalled,
    memoryReadPerformed: executionEvidence.memoryReadPerformed,
    memoryWritePerformed: executionEvidence.memoryWritePerformed,
    rawRequestBodyPersisted: false,
    rawResponseBodyPersisted: false,
    rawResponseBodyPrinted: false,
    rawRequestBodyDisclosed: false,
    rawResponseBodyDisclosed: false,
    tokenMaterialDisclosed: false,
    endpointDisclosed: false,
    locatorDisclosed: false,
    memoryContentDisclosed: false,
    memoryIdsDisclosed: false,
    nativeFieldNamesDisclosed: false,
    fieldNameDisclosurePolicy: 'no_native_field_names_or_memory_payload_disclosed',
    rollbackApplied: false,
    readinessClaimed: false
  };
}

async function recordGovernedMcpVcpNativeBridgeAuditReceipt(input = {}) {
  const auditLogStore = input.auditLogStore;
  if (!auditLogStore || typeof auditLogStore.appendWriteAudit !== 'function') {
    return {
      accepted: false,
      reasonCode: 'audit_log_store_unavailable',
      eventType: EVENT_TYPE,
      appended: false,
      lowDisclosure: true,
      rawPayloadPersisted: false,
      tokenMaterialPersisted: false,
      readinessClaimed: false
    };
  }

  const entry = buildLowDisclosureReceiptAuditEntry(input);
  const coverage = validateGovernedMcpNativeBridgeReceiptCoversCurrentProductGoal(entry);
  if (coverage.accepted !== true) {
    return {
      accepted: false,
      reasonCode: 'audit_receipt_current_product_goal_coverage_missing',
      eventType: EVENT_TYPE,
      appended: false,
      lowDisclosure: true,
      currentProductGoalCoverageAccepted: false,
      currentProductGoalCoverageBlockerCount: Array.isArray(coverage.blockers)
        ? coverage.blockers.length
        : null,
      rawPayloadPersisted: false,
      tokenMaterialPersisted: false,
      readinessClaimed: false
    };
  }

  try {
    await auditLogStore.appendWriteAudit(entry);
  } catch {
    return {
      accepted: false,
      reasonCode: 'audit_receipt_append_failed',
      eventType: EVENT_TYPE,
      appended: false,
      lowDisclosure: true,
      rawPayloadPersisted: false,
      tokenMaterialPersisted: false,
      readinessClaimed: false
    };
  }

  return {
    accepted: true,
    reasonCode: null,
    eventType: EVENT_TYPE,
    appended: true,
    lowDisclosure: true,
    targetReferenceName: entry.targetReferenceName,
    toolName: entry.toolName,
    delegationDirection: entry.delegationDirection,
    statusClass: entry.statusClass,
    rawPayloadPersisted: false,
    tokenMaterialPersisted: false,
    readinessClaimed: false
  };
}

function buildLowDisclosureReadFallbackAuditEntry(input = {}) {
  const fallbackContext = isPlainObject(input.fallbackContext) ? input.fallbackContext : {};
  const scopeFieldNames = safeScopeFieldNames(fallbackContext.scopeFieldNames);
  const scopeIdentifierFieldNames = safeScopeIdentifierFieldNames(
    fallbackContext.scopeIdentifierFieldNames
  );
  const scopePresent = normalizeBoolean(fallbackContext.scopePresent) &&
    scopeFieldNames.length > 0;
  const scopeIdentifierPresent = scopePresent &&
    normalizeBoolean(fallbackContext.scopeIdentifierPresent) &&
    scopeIdentifierFieldNames.length > 0;
  const fallbackReasonCode = safeEnum(fallbackContext.reasonCode, ALLOWED_REASON_CODES);
  const nativeStatusClass = safeEnum(fallbackContext.nativeStatusClass, ALLOWED_STATUS_CLASSES);
  const fallbackNativeReadFailureMatched = [
    'transport_error',
    'client_error',
    'server_error'
  ].includes(nativeStatusClass) &&
    fallbackReasonCode === `native_read_delegation_${nativeStatusClass}` &&
    !normalizeBoolean(fallbackContext.nativeMemoryReadPerformed);
  const bridgeAuditReceiptStatus = safeEnum(
    fallbackContext.auditReceiptStatus,
    ALLOWED_AUDIT_RECEIPT_STATUSES
  );
  const bridgeAuditReceiptAppended = bridgeAuditReceiptStatus === 'appended';
  const fallbackRequiresAuditReceipt = fallbackContext.fallbackRequiresAuditReceipt === true;
  const fallbackAfterAuditReceiptAppended = fallbackRequiresAuditReceipt &&
    bridgeAuditReceiptAppended &&
    fallbackContext.fallbackAfterAuditReceiptAppended === true;
  return {
    timestamp: new Date().toISOString(),
    eventType: READ_FALLBACK_EVENT_TYPE,
    contractName: CONTRACT_NAME,
    primaryRuntime: REQUIRED_PRIMARY_RUNTIME,
    delegationDirection: 'read',
    toolName: safeGovernedBridgeToolName(input.toolName),
    clientId: GOVERNED_NATIVE_CLIENTS.includes(fallbackContext.clientId)
      ? fallbackContext.clientId
      : null,
    visibility: safeEnum(fallbackContext.visibility, ALLOWED_VISIBILITIES),
    scopePresent,
    scopeIdentifierPresent,
    scopeFieldNames,
    scopeIdentifierFieldNames,
    scopeFingerprint: scopePresent ? safeScopeFingerprint(fallbackContext.scopeFingerprint) : null,
    rawScopePersisted: false,
    localMemoryRole: 'fallback',
    localMemorySourceRuntime: 'codex_memory_local_fallback',
    localMemoryFallbackAuthorized: fallbackContext.used === true &&
      fallbackAfterAuditReceiptAppended &&
      fallbackNativeReadFailureMatched,
    localMemoryFallbackUsed: false,
    localMemoryFallbackReadPerformed: false,
    localMemoryFallbackReturned: false,
    fallbackReasonCode,
    fallbackRequiresAuditReceipt,
    fallbackAfterAuditReceiptAppended,
    bridgeAuditReceiptStatus,
    bridgeAuditReceiptAppended,
    nativeRuntimeCalled: fallbackNativeReadFailureMatched && normalizeBoolean(fallbackContext.nativeRuntimeCalled),
    nativeMcpToolCalled: fallbackNativeReadFailureMatched && normalizeBoolean(fallbackContext.nativeMcpToolCalled),
    nativeInvocationAttempted: fallbackNativeReadFailureMatched &&
      normalizeBoolean(fallbackContext.nativeInvocationAttempted),
    nativeMcpToolInvocationAttempted: fallbackNativeReadFailureMatched &&
      normalizeBoolean(fallbackContext.nativeMcpToolInvocationAttempted),
    nativeMemoryReadPerformed: false,
    nativeStatusClass: fallbackNativeReadFailureMatched ? nativeStatusClass : null,
    nativeResponseShapeCategory: fallbackNativeReadFailureMatched
      ? safeEnum(
        fallbackContext.nativeResponseShapeCategory,
        ALLOWED_RESPONSE_SHAPE_CATEGORIES
      )
      : null,
    nativeTopLevelKindCategory: fallbackNativeReadFailureMatched
      ? safeEnum(
        fallbackContext.nativeTopLevelKindCategory,
        ALLOWED_TOP_LEVEL_KIND_CATEGORIES
      )
      : null,
    nativeItemCountBucket: fallbackNativeReadFailureMatched
      ? safeEnum(fallbackContext.nativeItemCountBucket, ALLOWED_ITEM_COUNT_BUCKETS)
      : null,
    nativeByteCountBucket: fallbackNativeReadFailureMatched
      ? safeEnum(fallbackContext.nativeByteCountBucket, ALLOWED_BYTE_COUNT_BUCKETS)
      : null,
    vcpNativeResult: false,
    resultCanBeMistakenForVcpNative: false,
    lowDisclosure: true,
    fallbackReceiptLowDisclosure: true,
    rawNativeOutputReturned: false,
    rawNativeMemoryReturned: false,
    rawFallbackMemoryPersisted: false,
    rawFallbackMemoryReturned: false,
    tokenMaterialDisclosed: false,
    endpointDisclosed: false,
    memoryContentDisclosed: false,
    memoryIdsDisclosed: false,
    nativeFieldNamesDisclosed: false,
    readinessClaimed: false
  };
}

async function recordGovernedMcpVcpNativeReadFallbackAuditReceipt(input = {}) {
  const auditLogStore = input.auditLogStore;
  if (!auditLogStore || typeof auditLogStore.appendWriteAudit !== 'function') {
    return {
      accepted: false,
      reasonCode: 'audit_log_store_unavailable',
      eventType: READ_FALLBACK_EVENT_TYPE,
      appended: false,
      lowDisclosure: true,
      rawPayloadPersisted: false,
      tokenMaterialPersisted: false,
      readinessClaimed: false
    };
  }

  const entry = buildLowDisclosureReadFallbackAuditEntry(input);
  const coverage = validateGovernedMcpReadFallbackReceiptCoversLocalMemoryRole(entry);
  if (coverage.accepted !== true) {
    return {
      accepted: false,
      reasonCode: 'read_fallback_audit_receipt_local_memory_role_coverage_missing',
      eventType: READ_FALLBACK_EVENT_TYPE,
      appended: false,
      lowDisclosure: true,
      localMemoryRoleCoverageAccepted: false,
      localMemoryRoleCoverageBlockerCount: Array.isArray(coverage.blockers)
        ? coverage.blockers.length
        : null,
      rawPayloadPersisted: false,
      tokenMaterialPersisted: false,
      readinessClaimed: false
    };
  }

  try {
    await auditLogStore.appendWriteAudit(entry);
  } catch {
    return {
      accepted: false,
      reasonCode: 'read_fallback_audit_receipt_append_failed',
      eventType: READ_FALLBACK_EVENT_TYPE,
      appended: false,
      lowDisclosure: true,
      rawPayloadPersisted: false,
      tokenMaterialPersisted: false,
      readinessClaimed: false
    };
  }

  return {
    accepted: true,
    reasonCode: null,
    eventType: READ_FALLBACK_EVENT_TYPE,
    appended: true,
    lowDisclosure: true,
    toolName: entry.toolName,
    fallbackReasonCode: entry.fallbackReasonCode,
    localMemoryFallbackAuthorized: entry.localMemoryFallbackAuthorized === true,
    rawPayloadPersisted: false,
    tokenMaterialPersisted: false,
    readinessClaimed: false
  };
}

function attachBridgeAuditReceiptStatus(delegationResult, auditReceiptResult) {
  if (!delegationResult || !auditReceiptResult) return delegationResult;
  const appended = auditReceiptResult.accepted === true && auditReceiptResult.appended === true;
  const status = {
    eventType: EVENT_TYPE,
    appended,
    status: appended ? 'appended' : 'not_appended',
    reasonCode: auditReceiptResult.reasonCode || null,
    lowDisclosure: true,
    rawPayloadPersisted: false,
    tokenMaterialPersisted: false
  };

  if (isPlainObject(delegationResult.receipt)) {
    delegationResult.receipt.localAuditReceipt = status;
  }
  if (isPlainObject(delegationResult.delegatedResult?.receipt)) {
    delegationResult.delegatedResult.receipt.localAuditReceipt = status;
  }
  return delegationResult;
}

module.exports = {
  CONTRACT_NAME,
  EVENT_TYPE,
  READ_FALLBACK_EVENT_TYPE,
  attachBridgeAuditReceiptStatus,
  buildLowDisclosureReadFallbackAuditEntry,
  buildLowDisclosureReceiptAuditEntry,
  recordGovernedMcpVcpNativeBridgeAuditReceipt,
  recordGovernedMcpVcpNativeReadFallbackAuditReceipt
};
