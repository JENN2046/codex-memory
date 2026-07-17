'use strict';

const crypto = require('node:crypto');

const {
  validateGovernedMcpNativeBridgeReceiptCoversCurrentProductGoal,
  validateGovernedMcpReadFallbackReceiptCoversLocalMemoryRole
} = require('./CurrentProductGoalContract');
const { isSafeReferenceName } = require('./VcpToolBoxSafeReference');
const {
  GOVERNED_NATIVE_CLIENTS,
  GOVERNED_NATIVE_VISIBILITIES,
  canonicalGovernedNativeClient
} = require('./MemoryAccessContract');

const BRIDGE_RECEIPT_EVENT_TYPE = 'governed_mcp_vcp_native_bridge_receipt';
const READ_FALLBACK_RECEIPT_EVENT_TYPE = 'governed_mcp_vcp_native_read_fallback_receipt';
const PROJECTION_SCHEMA_VERSION = 'governed_native_bridge_audit_memory_projection_v1';
const READ_FALLBACK_PROJECTION_SCHEMA_VERSION =
  'governed_native_read_fallback_audit_memory_projection_v1';

const BRIDGE_TOOL_NAMES = Object.freeze([
  'record_memory',
  'tombstone_memory',
  'supersede_memory',
  'search_memory',
  'memory_overview',
  'audit_memory'
]);
const SCOPE_FIELD_NAMES = Object.freeze([
  'client_id',
  'project_id',
  'scope_id',
  'visibility',
  'workspace_id'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function safeEnum(value, allowed) {
  return allowed.includes(value) ? value : null;
}

function safeBridgeToolName(value) {
  return safeEnum(value, BRIDGE_TOOL_NAMES);
}

function safeDelegationDirection(value) {
  return safeEnum(value, ['read', 'write']);
}

function safeBridgeClientId(value) {
  return safeEnum(value, GOVERNED_NATIVE_CLIENTS);
}

function safeBridgeVisibility(value) {
  return safeEnum(value, GOVERNED_NATIVE_VISIBILITIES);
}

function safeBridgeInvocationProfile(value) {
  return safeEnum(value, ['governed_read_only', 'governed_bounded_write']);
}

function safeBridgeWritePolicy(value) {
  return safeEnum(value, ['read_only', 'exact_approval']);
}

function safeBridgeRuntimeTargetKind(value) {
  return safeEnum(value, ['mcp_server', 'vcp_toolbox_native_memory']);
}

function safeBridgeRuntimeTargetSourceAuthority(value) {
  return safeEnum(value, [
    'bridge_runtime_or_static_config',
    'trusted_execution_context',
    'unaccepted'
  ]);
}

function safeBridgeDisclosureLevel(value) {
  return safeEnum(value, ['none', 'receipt_only', 'metadata', 'shape_only', 'summary', 'structured']);
}

function safeBridgeTransportCategory(value) {
  return safeEnum(value, [
    'local_http_transport',
    'in_process_test_double',
    'none',
    'unknown_transport'
  ]);
}

function safeBridgeMcpMethod(value) {
  return safeEnum(value, ['tools/call', 'tools/list', 'initialize', 'unknown']);
}

function safeBridgeJsonRpcErrorReasonCode(value) {
  return safeEnum(value, [
    'invalid_governance_metadata',
    'diary_scope_authorization_rejected',
    'diary_scope_mapping_binding_mismatch',
    'diary_scope_mapping_missing',
    'native_mutation_tool_unavailable',
    'native_provider_embedding_failed',
    'native_runtime_initialization_failed',
    'native_runtime_call_failed',
    'native_diary_search_failed',
    'native_result_scope_postcheck_failed',
    'native_tool_public_binding_mismatch',
    'native_write_disabled',
    'unsupported_native_tool'
  ]);
}

function safeBridgeFailureCategory(value) {
  return safeEnum(value, [
    'timeout',
    'transport_unavailable',
    'http_client_error',
    'http_server_error',
    'invalid_response',
    'response_id_mismatch',
    'governance_rejected',
    'scope_authorization_rejected',
    'scope_binding_rejected',
    'provider_embedding_failed',
    'native_runtime_initialization_failed',
    'native_scoped_search_failed',
    'result_scope_postcheck_failed',
    'native_runtime_failed'
  ]);
}

function safeBridgeGovernanceMetadataPath(value) {
  return value === 'params._meta.codexMemoryGovernance'
    ? 'params._meta.codexMemoryGovernance'
    : null;
}

function safeBridgeStatusClass(value) {
  return safeEnum(value, [
    'success',
    'not_available',
    'not_consumed',
    'rejected',
    'transport_error',
    'client_error',
    'server_error',
    'runtime_error',
    'invalid_response',
    'output_budget_exceeded',
    'native_invocation_receipt_unbound',
    'audit_receipt_not_appended',
    'fallback_audit_receipt_not_appended',
    'not_attempted',
    'unknown'
  ]);
}

function safeBridgeReasonCode(value) {
  return safeEnum(value, [
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
}

function safeBridgeHttpStatusClass(value) {
  return safeEnum(value, ['success', 'client_error', 'server_error', 'transport_error', 'not_http', 'unknown']);
}

function safeBridgeResponseShapeCategory(value) {
  return safeEnum(value, [
    'array_item_count_bucket_only',
    'array_top_level_kind_only',
    'object_top_level_kind_only_no_field_names',
    'null_top_level_kind_only',
    'primitive_top_level_kind_only',
    'unknown_shape',
    'not_consumed'
  ]);
}

function safeBridgeTopLevelKindCategory(value) {
  return safeEnum(value, [
    'array',
    'object',
    'null',
    'string',
    'number',
    'boolean',
    'unknown',
    'not_consumed'
  ]);
}

function safeBridgeItemCountBucket(value) {
  return safeEnum(value, [
    'zero',
    'one',
    'bounded_many',
    'over_budget_many',
    'not_applicable',
    'object_not_counted',
    'not_consumed'
  ]);
}

function safeBridgeByteCountBucket(value) {
  return safeEnum(value, [
    'zero',
    'bounded',
    'over_budget',
    'not_consumed'
  ]);
}

function safeBridgeAuditReceiptStatus(value) {
  return safeEnum(value, ['appended', 'not_appended']);
}

function safeBridgeExactApprovalAction(value) {
  return safeEnum(value, [
    'live_bridge_record_memory_proof',
    'live_bridge_tombstone_memory_proof',
    'live_bridge_supersede_memory_proof'
  ]);
}

function safeBridgeRollbackPosture(value) {
  return safeEnum(value, [
    'not_applicable',
    'no_runtime_write',
    'no_runtime_state_to_rollback',
    'read_only_no_write',
    'bounded_rollback_plan',
    'mutation_cleanup_plan'
  ]);
}

function safeBridgeRollbackDisposition(value) {
  return safeEnum(value, [
    'no_rollback_required',
    'no_runtime_write_to_rollback',
    'rollback_required_not_applied'
  ]);
}

function safeBridgeRollbackApplyPolicy(value) {
  return safeEnum(value, ['not_applicable', 'manual_governed_followup_required']);
}

function safeBridgeRollbackReasonCode(value) {
  return safeEnum(value, [
    'write_post_commit_output_budget_exceeded',
    'write_post_commit_native_invocation_receipt_unbound',
    'write_post_commit_audit_receipt_not_appended'
  ]);
}

function safeBoolean(value) {
  return value === true;
}

function boundedInteger(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max ? value : null;
}

function safeFieldNames(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter(item => typeof item === 'string')
    .filter(item => SCOPE_FIELD_NAMES.includes(item)))]
    .sort();
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

function buildRequestedScopeAuditFilter(scope = {}) {
  if (!isPlainObject(scope)) return null;
  const suppliedGovernedKeys = Object.keys(scope)
    .filter(key => SCOPE_FIELD_NAMES.includes(key));
  if (suppliedGovernedKeys.length === 0) return null;

  const normalizedScope = {};
  for (const key of ['project_id', 'scope_id', 'workspace_id']) {
    if (!Object.prototype.hasOwnProperty.call(scope, key)) continue;
    if (typeof scope[key] !== 'string' || !isSafeReferenceName(scope[key])) {
      return { matchNone: true };
    }
    normalizedScope[key] = scope[key];
  }
  if (Object.prototype.hasOwnProperty.call(scope, 'client_id')) {
    const clientId = canonicalGovernedNativeClient(scope.client_id);
    if (!clientId) return { matchNone: true };
    normalizedScope.client_id = clientId;
  }
  if (Object.prototype.hasOwnProperty.call(scope, 'visibility')) {
    const visibility = safeBridgeVisibility(scope.visibility);
    if (!visibility) return { matchNone: true };
    normalizedScope.visibility = visibility;
  }

  const stableScope = stableObject(normalizedScope);
  const scopeKeys = Object.keys(stableScope)
    .filter(key => SCOPE_FIELD_NAMES.includes(key));
  if (scopeKeys.length === 0) return { matchNone: true };
  const fingerprintSource = scopeKeys.reduce((output, key) => {
    output[key] = stableScope[key];
    return output;
  }, {});

  return {
    clientId: GOVERNED_NATIVE_CLIENTS.includes(stableScope.client_id)
      ? stableScope.client_id
      : null,
    visibility: safeBridgeVisibility(stableScope.visibility),
    scopeFieldNames: scopeKeys,
    scopeIdentifierFieldNames: scopeKeys
      .filter(key => ['project_id', 'scope_id', 'workspace_id'].includes(key)),
    scopeFingerprint: sha256Hex(JSON.stringify(fingerprintSource))
  };
}

function scopeFilterMatchesEntry(filter, entry) {
  if (!filter) return true;
  if (filter.matchNone === true) return false;
  if (!isPlainObject(entry)) return false;
  if (filter.clientId !== null && entry.clientId !== filter.clientId) return false;
  if (filter.visibility !== null && entry.visibility !== filter.visibility) return false;
  if (entry.scopePresent !== true) return false;
  if (entry.rawScopePersisted !== false) return false;
  if (typeof entry.scopeFingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(entry.scopeFingerprint)) {
    return false;
  }
  if (
    JSON.stringify(safeFieldNames(entry.scopeFieldNames)) !==
    JSON.stringify(safeFieldNames(filter.scopeFieldNames))
  ) {
    return false;
  }
  if (
    JSON.stringify(safeFieldNames(entry.scopeIdentifierFieldNames)) !==
    JSON.stringify(safeFieldNames(filter.scopeIdentifierFieldNames))
  ) {
    return false;
  }
  return entry.scopeFingerprint === filter.scopeFingerprint;
}

function safeReference(value) {
  return isSafeReferenceName(value) ? value : null;
}

function safePrimaryRuntime(value) {
  return value === 'VCPToolBox native memory' ? 'VCPToolBox native memory' : null;
}

function projectGovernedNativeBridgeAuditReceipt(entry = {}) {
  if (!isPlainObject(entry) || entry.eventType !== BRIDGE_RECEIPT_EVENT_TYPE) return null;

  return {
    schemaVersion: PROJECTION_SCHEMA_VERSION,
    eventType: BRIDGE_RECEIPT_EVENT_TYPE,
    toolName: safeBridgeToolName(entry.toolName),
    primaryRuntime: safePrimaryRuntime(entry.primaryRuntime),
    delegationDirection: safeDelegationDirection(entry.delegationDirection),
    clientId: safeBridgeClientId(entry.clientId),
    visibility: safeBridgeVisibility(entry.visibility),
    scopePresent: safeBoolean(entry.scopePresent),
    scopeIdentifierPresent: safeBoolean(entry.scopeIdentifierPresent),
    scopeFingerprintPresent: typeof entry.scopeFingerprint === 'string' && /^[a-f0-9]{64}$/.test(entry.scopeFingerprint),
    scopeFieldNames: safeFieldNames(entry.scopeFieldNames),
    scopeIdentifierFieldNames: safeFieldNames(entry.scopeIdentifierFieldNames),
    rawScopePersisted: false,
    rawScopeValueReturned: false,
    clientIdentitySource: entry.clientIdentitySource === 'trusted_execution_context_or_transport'
      ? 'trusted_execution_context_or_transport'
      : null,
    clientIdentityBound: safeBoolean(entry.clientIdentityBound),
    clientIdentityToolArgumentsMayOverride: false,
    clientIdentityGovernanceMetadataMayOverride: false,
    scopeBoundarySource: entry.scopeBoundarySource === 'trusted_execution_context_or_transport'
      ? 'trusted_execution_context_or_transport'
      : null,
    scopeBoundaryBound: safeBoolean(entry.scopeBoundaryBound),
    scopeToolArgumentsMayOverride: false,
    scopeGovernanceMetadataMayOverride: false,
    visibilityBound: safeBoolean(entry.visibilityBound),
    trustedExecutionContextSupplied: safeBoolean(entry.trustedExecutionContextSupplied),
    trustedExecutionContextAccepted: safeBoolean(entry.trustedExecutionContextAccepted),
    trustedExecutionContextScopeMatched: safeBoolean(entry.trustedExecutionContextScopeMatched),
    invocationProfile: safeBridgeInvocationProfile(entry.invocationProfile),
    invocationProfileSource: entry.invocationProfileSource === 'bridge_tool_binding'
      ? 'bridge_tool_binding'
      : null,
    invocationProfileBound: safeBoolean(entry.invocationProfileBound),
    invocationProfileToolArgumentsMayOverride: false,
    invocationProfileGovernanceMetadataMayOverride: false,
    readAllowed: safeBoolean(entry.readAllowed),
    writeAllowed: safeBoolean(entry.writeAllowed),
    writePolicy: safeBridgeWritePolicy(entry.writePolicy),
    readWriteAuthoritySource: entry.readWriteAuthoritySource === 'bridge_tool_binding'
      ? 'bridge_tool_binding'
      : null,
    readWriteAuthorityBound: safeBoolean(entry.readWriteAuthorityBound),
    mixedReadWriteAllowed: false,
    unboundedWriteAllowed: false,
    writeRequiresExactApproval: safeBoolean(entry.writeRequiresExactApproval),
    exactApprovalAction: safeBridgeExactApprovalAction(entry.exactApprovalAction),
    exactApprovalActionMatched: safeBoolean(entry.exactApprovalActionMatched),
    exactApprovalDecisionReference: safeReference(entry.exactApprovalDecisionReference),
    exactApprovalClaimBindingHash: typeof entry.exactApprovalClaimBindingHash === 'string' &&
      /^[a-f0-9]{64}$/.test(entry.exactApprovalClaimBindingHash)
      ? entry.exactApprovalClaimBindingHash
      : null,
    exactApprovalScopeMatched: safeBoolean(entry.exactApprovalScopeMatched),
    exactApprovalRuntimeTargetMatched: safeBoolean(entry.exactApprovalRuntimeTargetMatched),
    exactApprovalRollbackPlanMatched: safeBoolean(entry.exactApprovalRollbackPlanMatched),
    exactApprovalScopeReferencesSafe: safeBoolean(entry.exactApprovalScopeReferencesSafe),
    exactApprovalScopeVisibilityAccepted: safeBoolean(entry.exactApprovalScopeVisibilityAccepted),
    exactApprovalRuntimeTargetReferenceSafe: safeBoolean(entry.exactApprovalRuntimeTargetReferenceSafe),
    exactApprovalRuntimeTargetKindAccepted: safeBoolean(entry.exactApprovalRuntimeTargetKindAccepted),
    exactApprovalRuntimeTargetPrimaryRuntimeAccepted: safeBoolean(
      entry.exactApprovalRuntimeTargetPrimaryRuntimeAccepted
    ),
    exactApprovalRollbackPlanReferencePresent: safeBoolean(entry.exactApprovalRollbackPlanReferencePresent),
    exactApprovalRollbackPlanReferenceSafe: safeBoolean(entry.exactApprovalRollbackPlanReferenceSafe),
    exactApprovalForbiddenFieldCount: boundedInteger(entry.exactApprovalForbiddenFieldCount, 0, 50),
    runtimeTargetKind: safeBridgeRuntimeTargetKind(entry.runtimeTargetKind),
    runtimeTargetSourceAuthority: safeBridgeRuntimeTargetSourceAuthority(entry.runtimeTargetSourceAuthority),
    runtimeTargetBound: safeBoolean(entry.runtimeTargetBound),
    runtimeTargetToolArgumentsMayOverride: false,
    runtimeTargetGovernanceMetadataMayOverride: false,
    targetReferenceName: safeReference(entry.targetReferenceName),
    disclosureLevel: safeBridgeDisclosureLevel(entry.disclosureLevel),
    outputDisclosureBudgetSource: entry.outputDisclosureBudgetSource === 'bridge_gate_normalized_governance'
      ? 'bridge_gate_normalized_governance'
      : null,
    outputDisclosureBudgetBound: safeBoolean(entry.outputDisclosureBudgetBound),
    outputDisclosureBudgetToolArgumentsMayOverride: false,
    outputDisclosureBudgetGovernanceMetadataMayOverride: false,
    disclosureMaxItems: boundedInteger(entry.disclosureMaxItems, 0, 5),
    disclosureMaxBytes: boundedInteger(entry.disclosureMaxBytes, 0, 4096),
    disclosureForbiddenFieldCount: boundedInteger(entry.disclosureForbiddenFieldCount, 0, 50),
    rawOutputAllowed: false,
    auditReceiptRequired: safeBoolean(entry.auditReceiptRequired),
    auditReceiptSource: entry.auditReceiptSource === 'bridge_gate_normalized_governance'
      ? 'bridge_gate_normalized_governance'
      : null,
    auditReceiptLowDisclosure: safeBoolean(entry.auditReceiptLowDisclosure),
    auditReceiptLowDisclosureBound: safeBoolean(entry.auditReceiptLowDisclosureBound),
    auditReceiptToolArgumentsMayOverride: false,
    auditReceiptGovernanceMetadataMayOverride: false,
    bridgeReceiptLowDisclosure: safeBoolean(entry.bridgeReceiptLowDisclosure),
    localMemoryRole: entry.localMemoryRole === 'not_used' ? 'not_used' : null,
    localMemorySourceRuntime: null,
    localMemoryPrimaryRuntime: false,
    localMemoryFallbackUsed: false,
    localMemoryResultReturned: false,
    localMemoryResultCanBeMistakenForVcpNative: false,
    localMemoryRawContentDisclosed: false,
    auditReceiptReferencePresent: safeBoolean(entry.auditReceiptReferencePresent),
    auditReceiptReferenceSafe: safeBoolean(entry.auditReceiptReferenceSafe),
    auditReceiptReferenceName: safeReference(entry.auditReceiptReferenceName),
    auditReceiptForbiddenFieldCount: boundedInteger(entry.auditReceiptForbiddenFieldCount, 0, 50),
    rollbackPosture: safeBridgeRollbackPosture(entry.rollbackPosture),
    rollbackPostureSource: entry.rollbackPostureSource === 'bridge_gate_normalized_governance'
      ? 'bridge_gate_normalized_governance'
      : null,
    rollbackPostureForbiddenFieldCount: boundedInteger(entry.rollbackPostureForbiddenFieldCount, 0, 50),
    rollbackPlanReferencePresent: safeBoolean(entry.rollbackPlanReferencePresent),
    rollbackPlanReferenceSafe: safeBoolean(entry.rollbackPlanReferenceSafe),
    rollbackWritePostureBound: safeBoolean(entry.rollbackWritePostureBound),
    rollbackReadPostureBound: safeBoolean(entry.rollbackReadPostureBound),
    rollbackPostureBound: safeBoolean(entry.rollbackPostureBound),
    rollbackPostureToolArgumentsMayOverride: false,
    rollbackPostureGovernanceMetadataMayOverride: false,
    rollbackPlanBound: safeBoolean(entry.rollbackPlanBound),
    rollbackPlanShapeOnly: safeBoolean(entry.rollbackPlanShapeOnly),
    rollbackRequired: safeBoolean(entry.rollbackRequired),
    rollbackReasonCode: safeBridgeRollbackReasonCode(entry.rollbackReasonCode),
    rollbackDisposition: safeBridgeRollbackDisposition(entry.rollbackDisposition),
    rollbackFollowupRequired: safeBoolean(entry.rollbackFollowupRequired),
    rollbackApplyPolicy: safeBridgeRollbackApplyPolicy(entry.rollbackApplyPolicy),
    rollbackApplyAttempted: safeBoolean(entry.rollbackApplyAttempted),
    rollbackAutoApplyAllowed: safeBoolean(entry.rollbackAutoApplyAllowed),
    rollbackRawPlanDisclosed: false,
    rollbackRawPlanPersisted: false,
    responseShapeCategory: safeBridgeResponseShapeCategory(entry.responseShapeCategory),
    topLevelKindCategory: safeBridgeTopLevelKindCategory(entry.topLevelKindCategory),
    itemCountBucket: safeBridgeItemCountBucket(entry.itemCountBucket),
    byteCountBucket: safeBridgeByteCountBucket(entry.byteCountBucket),
    outputBudgetExceeded: safeBoolean(entry.outputBudgetExceeded),
    delegationStatusClass: safeBridgeStatusClass(entry.statusClass),
    delegationReasonCode: safeBridgeReasonCode(entry.reasonCode),
    transportCategory: safeBridgeTransportCategory(entry.transportCategory || entry.nativeTransportCategory),
    mcpMethod: safeBridgeMcpMethod(entry.mcpMethod || entry.nativeMcpMethod),
    nativeInvocationToolName: safeBridgeToolName(entry.nativeInvocationToolName || entry.nativeToolName),
    nativeInvocationRequestIdCategory:
      entry.nativeInvocationRequestIdCategory === 'generated_bridge_request_id'
        ? 'generated_bridge_request_id'
        : null,
    nativeInvocationJsonRpcResponseIdMatched: safeBoolean(entry.nativeInvocationJsonRpcResponseIdMatched),
    nativeInvocationStatusClass: safeBridgeStatusClass(entry.nativeInvocationStatusClass),
    nativeInvocationHttpStatusClass: safeBridgeHttpStatusClass(entry.nativeInvocationHttpStatusClass),
    nativeInvocationJsonRpcErrorPresent: safeBoolean(entry.nativeInvocationJsonRpcErrorPresent),
    nativeInvocationJsonRpcErrorReasonCode:
      safeBridgeJsonRpcErrorReasonCode(entry.nativeInvocationJsonRpcErrorReasonCode),
    nativeInvocationFailureCategory:
      safeBridgeFailureCategory(entry.nativeInvocationFailureCategory),
    nativeInvocationResponseShapeCategory: safeBridgeResponseShapeCategory(entry.nativeInvocationResponseShapeCategory),
    nativeInvocationAttempted: safeBoolean(entry.nativeInvocationAttempted),
    nativeMcpToolInvocationAttempted: safeBoolean(entry.nativeMcpToolInvocationAttempted),
    nativeInvocationReceiptBindingMatched: safeBoolean(entry.nativeInvocationReceiptBindingMatched),
    nativeInvocationGovernanceMetadataPath:
      safeBridgeGovernanceMetadataPath(entry.nativeInvocationGovernanceMetadataPath),
    nativeInvocationGovernanceMetadataSent: safeBoolean(entry.nativeInvocationGovernanceMetadataSent),
    nativeInvocationGovernanceMetadataRawValueDisclosed:
      safeBoolean(entry.nativeInvocationGovernanceMetadataRawValueDisclosed),
    memoryReadPerformed: safeBoolean(entry.memoryReadPerformed),
    memoryWritePerformed: safeBoolean(entry.memoryWritePerformed),
    rawRequestBodyPersisted: false,
    rawResponseBodyPersisted: false,
    memoryContentDisclosed: false,
    tokenMaterialDisclosed: false,
    endpointDisclosed: false,
    readinessClaimed: false
  };
}

function projectGovernedNativeBridgeAuditReceiptDecision(entry = {}) {
  const receipt = projectGovernedNativeBridgeAuditReceipt(entry);
  if (!receipt) return null;
  const coverage = validateGovernedMcpNativeBridgeReceiptCoversCurrentProductGoal(receipt);
  if (coverage.accepted !== true) return null;

  return {
    auditFamily: 'governance',
    decision: 'visible',
    reasonCode: 'governed_native_bridge_audit_receipt',
    lifecyclePolicy: 'bridge_receipt_retained_low_disclosure',
    scopePolicy: receipt.scopePresent
      ? 'scope_recorded_without_raw_identifier_disclosure'
      : 'scope_absent',
    governedNativeBridgeReceipt: receipt
  };
}

function projectGovernedNativeReadFallbackAuditReceipt(entry = {}) {
  if (!isPlainObject(entry) || entry.eventType !== READ_FALLBACK_RECEIPT_EVENT_TYPE) return null;

  return {
    schemaVersion: READ_FALLBACK_PROJECTION_SCHEMA_VERSION,
    eventType: READ_FALLBACK_RECEIPT_EVENT_TYPE,
    toolName: safeBridgeToolName(entry.toolName),
    delegationDirection: entry.delegationDirection === 'read' ? 'read' : null,
    clientId: safeBridgeClientId(entry.clientId),
    visibility: safeBridgeVisibility(entry.visibility),
    scopePresent: safeBoolean(entry.scopePresent),
    scopeIdentifierPresent: safeBoolean(entry.scopeIdentifierPresent),
    scopeFingerprintPresent: typeof entry.scopeFingerprint === 'string' && /^[a-f0-9]{64}$/.test(entry.scopeFingerprint),
    scopeFieldNames: safeFieldNames(entry.scopeFieldNames),
    scopeIdentifierFieldNames: safeFieldNames(entry.scopeIdentifierFieldNames),
    rawScopePersisted: false,
    primaryRuntime: safePrimaryRuntime(entry.primaryRuntime),
    localMemoryRole: entry.localMemoryRole === 'fallback' ? 'fallback' : null,
    localMemorySourceRuntime: entry.localMemorySourceRuntime === 'codex_memory_local_fallback'
      ? 'codex_memory_local_fallback'
      : null,
    localMemoryFallbackAuthorized: safeBoolean(entry.localMemoryFallbackAuthorized),
    localMemoryFallbackUsed: safeBoolean(entry.localMemoryFallbackUsed),
    localMemoryFallbackReadPerformed: safeBoolean(entry.localMemoryFallbackReadPerformed),
    localMemoryFallbackReturned: safeBoolean(entry.localMemoryFallbackReturned),
    fallbackReasonCode: safeBridgeReasonCode(entry.fallbackReasonCode),
    fallbackRequiresAuditReceipt: safeBoolean(entry.fallbackRequiresAuditReceipt),
    fallbackAfterAuditReceiptAppended: safeBoolean(entry.fallbackAfterAuditReceiptAppended),
    bridgeAuditReceiptStatus: safeBridgeAuditReceiptStatus(entry.bridgeAuditReceiptStatus),
    bridgeAuditReceiptAppended: safeBoolean(entry.bridgeAuditReceiptAppended),
    nativeRuntimeCalled: safeBoolean(entry.nativeRuntimeCalled),
    nativeMcpToolCalled: safeBoolean(entry.nativeMcpToolCalled),
    nativeInvocationAttempted: safeBoolean(entry.nativeInvocationAttempted),
    nativeMcpToolInvocationAttempted: safeBoolean(entry.nativeMcpToolInvocationAttempted),
    nativeMemoryReadPerformed: safeBoolean(entry.nativeMemoryReadPerformed),
    nativeStatusClass: safeBridgeStatusClass(entry.nativeStatusClass),
    nativeResponseShapeCategory: safeBridgeResponseShapeCategory(entry.nativeResponseShapeCategory),
    nativeTopLevelKindCategory: safeBridgeTopLevelKindCategory(entry.nativeTopLevelKindCategory),
    nativeItemCountBucket: safeBridgeItemCountBucket(entry.nativeItemCountBucket),
    nativeByteCountBucket: safeBridgeByteCountBucket(entry.nativeByteCountBucket),
    vcpNativeResult: false,
    resultCanBeMistakenForVcpNative: false,
    lowDisclosure: safeBoolean(entry.lowDisclosure),
    fallbackReceiptLowDisclosure: safeBoolean(entry.fallbackReceiptLowDisclosure),
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

function projectGovernedNativeReadFallbackAuditReceiptDecision(entry = {}) {
  const receipt = projectGovernedNativeReadFallbackAuditReceipt(entry);
  if (!receipt) return null;
  const coverage = validateGovernedMcpReadFallbackReceiptCoversLocalMemoryRole(receipt);
  if (coverage.accepted !== true) return null;

  return {
    auditFamily: 'governance',
    decision: 'visible',
    reasonCode: 'governed_native_read_fallback_audit_receipt',
    lifecyclePolicy: 'local_fallback_receipt_retained_low_disclosure',
    scopePolicy: 'fallback_authorized_by_bridge_receipt_without_raw_memory_disclosure',
    governedNativeReadFallbackReceipt: receipt
  };
}

function projectGovernedNativeAuditDecision(entry = {}) {
  return projectGovernedNativeBridgeAuditReceiptDecision(entry) ||
    projectGovernedNativeReadFallbackAuditReceiptDecision(entry);
}

function buildGovernedNativeBridgeAuditMemoryDecisionProvider({ auditLogStore } = {}) {
  return async ({ auditFamily, window, scope } = {}) => {
    if (!['governance', 'all'].includes(auditFamily)) return [];
    if (!auditLogStore || typeof auditLogStore.readRecentWriteAudit !== 'function') return [];
    const boundedWindow = Number.isInteger(window) && window > 0 && window <= 200 ? window : 50;
    const scopeFilter = buildRequestedScopeAuditFilter(scope);
    const readWindow = scopeFilter ? 200 : boundedWindow;
    const entries = await auditLogStore.readRecentWriteAudit(readWindow);
    if (!Array.isArray(entries)) return [];
    return entries
      .filter(entry => scopeFilterMatchesEntry(scopeFilter, entry))
      .map(entry => {
        const decision = projectGovernedNativeAuditDecision(entry);
        if (scopeFilter && decision?.governedNativeBridgeReceipt) {
          decision.governedNativeBridgeReceipt.scopeFingerprintMatched = true;
        }
        if (scopeFilter && decision?.governedNativeReadFallbackReceipt) {
          decision.governedNativeReadFallbackReceipt.scopeFingerprintMatched = true;
        }
        return decision;
      })
      .filter(Boolean)
      .slice(0, boundedWindow);
  };
}

module.exports = {
  BRIDGE_RECEIPT_EVENT_TYPE,
  READ_FALLBACK_RECEIPT_EVENT_TYPE,
  PROJECTION_SCHEMA_VERSION,
  READ_FALLBACK_PROJECTION_SCHEMA_VERSION,
  buildRequestedScopeAuditFilter,
  buildGovernedNativeBridgeAuditMemoryDecisionProvider,
  projectGovernedNativeAuditDecision,
  projectGovernedNativeBridgeAuditReceipt,
  projectGovernedNativeBridgeAuditReceiptDecision,
  projectGovernedNativeReadFallbackAuditReceipt,
  projectGovernedNativeReadFallbackAuditReceiptDecision
};
