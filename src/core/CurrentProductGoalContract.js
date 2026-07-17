'use strict';

const {
  GOVERNED_NATIVE_CLIENTS,
  GOVERNED_NATIVE_VISIBILITIES
} = require('./MemoryAccessContract');

const CONTRACT_NAME = 'CurrentProductGoalContract';
const CONTRACT_VERSION = 'current_product_goal_v1';

const REQUIRED_PRIMARY_RUNTIME = 'VCPToolBox native memory';
const REQUIRED_PRIMARY_VALUE = 'governance, not memory intelligence';
const REQUIRED_ACCESS_PATH = 'governed MCP tools';

const REQUIRED_CLIENTS = GOVERNED_NATIVE_CLIENTS;

const REQUIRED_GOVERNED_DIMENSIONS = Object.freeze([
  'client_id',
  'scope',
  'visibility',
  'runtime target',
  'invocation profile',
  'read/write authority',
  'output disclosure budget',
  'audit receipt',
  'rollback posture'
]);

const REQUIRED_LOCAL_MEMORY_ROLE = Object.freeze([
  'fallback',
  'audit',
  'validation fixture',
  'compatibility',
  'offline continuity'
]);

const REQUIRED_NATIVE_BRIDGE_TOOLS = Object.freeze([
  'search_memory',
  'memory_overview',
  'audit_memory',
  'record_memory',
  'tombstone_memory',
  'supersede_memory'
]);

const REQUIRED_NATIVE_BRIDGE_READ_TOOLS = Object.freeze([
  'search_memory',
  'memory_overview',
  'audit_memory'
]);

const REQUIRED_NATIVE_BRIDGE_WRITE_TOOLS = Object.freeze([
  'record_memory',
  'tombstone_memory',
  'supersede_memory'
]);

const REQUIRED_NATIVE_BRIDGE_WRITE_EXACT_APPROVAL_ACTIONS = Object.freeze({
  record_memory: 'live_bridge_record_memory_proof',
  tombstone_memory: 'live_bridge_tombstone_memory_proof',
  supersede_memory: 'live_bridge_supersede_memory_proof'
});

const REQUIRED_WRITE_POST_COMMIT_ROLLBACK_REASON_CODES = Object.freeze({
  output_budget_exceeded: 'write_post_commit_output_budget_exceeded',
  native_invocation_receipt_unbound: 'write_post_commit_native_invocation_receipt_unbound',
  audit_receipt_not_appended: 'write_post_commit_audit_receipt_not_appended'
});

const REQUIRED_BRIDGE_GATE_REQUEST_DIMENSIONS = Object.freeze([
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

const REQUIRED_NATIVE_BRIDGE_AUDIT_EVIDENCE_FIELDS = Object.freeze([
  'clientId',
  'visibility',
  'scopeFieldNames',
  'scopeIdentifierFieldNames',
  'scopeFingerprintPresent',
  'trustedExecutionContextBooleans',
  'runtimeTargetBinding',
  'invocationProfile',
  'readWriteAuthority',
  'outputBudgetBuckets',
  'rawOutputPolicy',
  'auditReceiptReference',
  'auditReceiptLowDisclosureBooleans',
  'exactApprovalSafetyBooleans',
  'delegationStatusClass',
  'delegationReasonCode',
  'nativeInvocationReceiptBindingMatched',
  'nativeInvocationGovernanceMetadataBinding',
  'nativeInvocationJsonRpcRequestIdCategory',
  'nativeInvocationJsonRpcResponseIdMatched',
  'nativeInvocationJsonRpcErrorPresent',
  'nativeInvocationJsonRpcErrorReasonCode',
  'nativeInvocationFailureCategory',
  'rollbackEvidence',
  'rollbackPlanSafetyBooleans',
  'rollbackReasonCode',
  'nativeInvocationShapeBuckets'
]);

const REQUIRED_NATIVE_BRIDGE_COMMON_AUDIT_EVIDENCE_FIELDS =
  REQUIRED_NATIVE_BRIDGE_AUDIT_EVIDENCE_FIELDS.filter(field =>
    !['exactApprovalSafetyBooleans', 'rollbackReasonCode'].includes(field)
  );

const SIDE_EFFECT_COUNTERS = Object.freeze([
  'vcpToolBoxCalls',
  'mcpToolCalls',
  'memoryReads',
  'memoryWrites',
  'providerApiCalls',
  'publicMcpExpansions',
  'readinessClaims'
]);

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeList(value) {
  return Array.isArray(value)
    ? value.map(item => normalizeString(item)).filter(Boolean)
    : [];
}

function sameExactList(actual, expected) {
  if (actual.length !== expected.length) return false;
  return expected.every((item, index) => actual[index] === item);
}

function collectListBlockers(field, actual, expected) {
  const blockers = [];
  if (!sameExactList(actual, expected)) {
    blockers.push(`${field}_must_match_current_product_goal_exact_order`);
  }
  return blockers;
}

function validateZeroCounters(counters = {}) {
  const blockers = [];
  const normalized = {};
  for (const field of SIDE_EFFECT_COUNTERS) {
    const value = Number(counters[field] || 0);
    normalized[field] = Number.isFinite(value) ? value : 0;
    if (normalized[field] !== 0) blockers.push(`${field}_must_be_zero`);
  }
  return { blockers, normalized };
}

function validateCurrentProductGoalContract(input = {}) {
  const productGoal = input.product_goal || input.productGoal || {};
  const counters = validateZeroCounters(input.counters || {});
  const blockers = [...counters.blockers];

  const primaryRuntime = normalizeString(productGoal.primary_runtime || productGoal.primaryRuntime);
  const primaryValue = normalizeString(productGoal.primary_value || productGoal.primaryValue);
  const accessPath = normalizeString(productGoal.access_path || productGoal.accessPath);
  const clients = normalizeList(productGoal.clients);
  const governedDimensions = normalizeList(productGoal.governed_dimensions || productGoal.governedDimensions);
  const localMemoryRole = normalizeList(productGoal.local_memory_role || productGoal.localMemoryRole);

  if (primaryRuntime !== REQUIRED_PRIMARY_RUNTIME) blockers.push('primary_runtime_must_be_vcp_toolbox_native_memory');
  if (primaryValue !== REQUIRED_PRIMARY_VALUE) blockers.push('primary_value_must_be_governance_not_memory_intelligence');
  if (accessPath !== REQUIRED_ACCESS_PATH) blockers.push('access_path_must_be_governed_mcp_tools');
  blockers.push(...collectListBlockers('clients', clients, REQUIRED_CLIENTS));
  blockers.push(...collectListBlockers('governed_dimensions', governedDimensions, REQUIRED_GOVERNED_DIMENSIONS));
  blockers.push(...collectListBlockers('local_memory_role', localMemoryRole, REQUIRED_LOCAL_MEMORY_ROLE));

  const accepted = blockers.length === 0;
  return {
    contractName: CONTRACT_NAME,
    contractVersion: CONTRACT_VERSION,
    accepted,
    decision: accepted
      ? 'current_product_goal_accepted'
      : 'current_product_goal_rejected_fail_closed',
    blockers,
    normalizedProductGoal: {
      primary_runtime: primaryRuntime || null,
      primary_value: primaryValue || null,
      clients,
      access_path: accessPath || null,
      governed_dimensions: governedDimensions,
      local_memory_role: localMemoryRole
    },
    requiredProductGoal: {
      primary_runtime: REQUIRED_PRIMARY_RUNTIME,
      primary_value: REQUIRED_PRIMARY_VALUE,
      clients: [...REQUIRED_CLIENTS],
      access_path: REQUIRED_ACCESS_PATH,
      governed_dimensions: [...REQUIRED_GOVERNED_DIMENSIONS],
      local_memory_role: [...REQUIRED_LOCAL_MEMORY_ROLE]
    },
    counters: counters.normalized,
    runtimeCalled: false,
    vcpToolBoxCalled: false,
    mcpToolCalled: false,
    memoryReadPerformed: false,
    memoryWritePerformed: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    readinessClaimed: false
  };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function valueAtPath(source, path) {
  return path.split('.').reduce((current, key) => {
    if (!isPlainObject(current)) return undefined;
    return current[key];
  }, source);
}

function requireEqual(blockers, metadata, path, expected) {
  if (valueAtPath(metadata, path) !== expected) blockers.push(`${path}_must_equal_${String(expected)}`);
}

function requireOneOf(blockers, metadata, path, expected, blockerName = null) {
  if (!expected.includes(valueAtPath(metadata, path))) {
    blockers.push(blockerName || `${path}_must_match_current_product_goal_value`);
  }
}

function requireArrayExact(blockers, metadata, path, expected) {
  const actual = valueAtPath(metadata, path);
  if (!Array.isArray(actual) || !sameExactList(actual, expected)) {
    blockers.push(`${path}_must_match_current_product_goal_exact_order`);
  }
}

function requireArrayIncludes(blockers, metadata, path, expected) {
  const actual = valueAtPath(metadata, path);
  if (!Array.isArray(actual)) {
    blockers.push(`${path}_must_be_array`);
    return;
  }
  for (const item of expected) {
    if (!actual.includes(item)) {
      blockers.push(`${path}_must_include_${item}`);
    }
  }
}

function requireIntegerInRange(blockers, metadata, path, min, max) {
  const actual = valueAtPath(metadata, path);
  if (!Number.isInteger(actual) || actual < min || actual > max) {
    blockers.push(`${path}_must_be_integer_between_${min}_and_${max}`);
  }
}

function requireNonEmptyString(blockers, metadata, path) {
  const actual = valueAtPath(metadata, path);
  if (typeof actual !== 'string' || actual.trim() === '') {
    blockers.push(`${path}_must_be_non_empty_string`);
  }
}

function validateWritePostCommitRollbackEvidence(blockers, item, statusClass) {
  const expectedReasonCode = REQUIRED_WRITE_POST_COMMIT_ROLLBACK_REASON_CODES[statusClass];
  if (!expectedReasonCode) {
    if (statusClass === 'success') {
      requireEqual(blockers, item, 'rollbackRequired', false);
      requireEqual(blockers, item, 'rollbackDisposition', 'no_rollback_required');
      requireEqual(blockers, item, 'rollbackFollowupRequired', false);
      requireEqual(blockers, item, 'rollbackApplyPolicy', 'not_applicable');
    }
    return;
  }

  requireEqual(blockers, item, 'rollbackRequired', true);
  requireEqual(blockers, item, 'rollbackReasonCode', expectedReasonCode);
  requireEqual(blockers, item, 'rollbackDisposition', 'rollback_required_not_applied');
  requireEqual(blockers, item, 'rollbackFollowupRequired', true);
  requireEqual(blockers, item, 'rollbackApplyPolicy', 'manual_governed_followup_required');
  requireEqual(blockers, item, 'rollbackApplyAttempted', false);
  requireEqual(blockers, item, 'rollbackAutoApplyAllowed', false);
}

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined) return value;
  }
  return undefined;
}

function requireNativeInvocationExecutionBound(blockers, item, toolName) {
  const nestedReceipt = isPlainObject(item.nativeInvocationReceipt)
    ? item.nativeInvocationReceipt
    : {};
  const bindingMatched = firstDefined(
    item.nativeInvocationReceiptBindingMatched,
    nestedReceipt.invocationBindingMatched
  );
  const transportCategory = normalizeString(firstDefined(
    item.nativeTransportCategory,
    item.nativeInvocationTransportCategory,
    item.transportCategory,
    nestedReceipt.transportCategory
  ));
  const mcpMethod = normalizeString(firstDefined(
    item.nativeMcpMethod,
    item.nativeInvocationMcpMethod,
    item.mcpMethod,
    nestedReceipt.mcpMethod
  ));
  const nativeToolName = normalizeString(firstDefined(
    item.nativeToolName,
    item.nativeInvocationToolName,
    nestedReceipt.toolName
  ));
  const requestIdCategory = normalizeString(firstDefined(
    item.nativeInvocationRequestIdCategory,
    nestedReceipt.requestIdCategory
  ));
  const jsonRpcResponseIdMatched = firstDefined(
    item.nativeInvocationJsonRpcResponseIdMatched,
    nestedReceipt.jsonRpcResponseIdMatched
  );
  const nativeStatusClass = normalizeString(firstDefined(
    item.nativeInvocationStatusClass,
    nestedReceipt.statusClass
  ));
  const nativeHttpStatusClass = normalizeString(firstDefined(
    item.nativeInvocationHttpStatusClass,
    nestedReceipt.httpStatusClass
  ));
  const jsonRpcErrorPresent = firstDefined(
    item.nativeInvocationJsonRpcErrorPresent,
    nestedReceipt.jsonRpcErrorPresent
  );

  if (bindingMatched !== true) blockers.push('native_invocation_receipt_binding_must_match');
  if (transportCategory !== 'local_http_transport') {
    blockers.push('native_invocation_transport_category_must_be_local_http_transport');
  }
  if (mcpMethod !== 'tools/call') blockers.push('native_invocation_mcp_method_must_be_tools_call');
  if (nativeToolName !== toolName) blockers.push('native_invocation_tool_name_must_match_bridge_tool');
  if (requestIdCategory !== 'generated_bridge_request_id') {
    blockers.push('native_invocation_request_id_category_must_be_generated_bridge_request_id');
  }
  if (jsonRpcResponseIdMatched !== true) {
    blockers.push('native_invocation_json_rpc_response_id_must_match');
  }
  if (nativeStatusClass !== 'success') blockers.push('native_invocation_status_class_must_be_success');
  if (nativeHttpStatusClass !== 'success') blockers.push('native_invocation_http_status_class_must_be_success');
  if (jsonRpcErrorPresent !== false) blockers.push('native_invocation_json_rpc_error_present_must_equal_false');
}

function validateGovernedMcpMetadataCoversCurrentProductGoal(metadata = {}, options = {}) {
  const blockers = [];
  const meta = isPlainObject(metadata) ? metadata : {};
  const requireRuntimeTargetBound = options.requireRuntimeTargetBound === true;

  requireEqual(blockers, meta, 'productGoal.primaryRuntime', REQUIRED_PRIMARY_RUNTIME);
  requireEqual(blockers, meta, 'productGoal.primaryValue', REQUIRED_PRIMARY_VALUE);
  requireEqual(blockers, meta, 'productGoal.accessPath', REQUIRED_ACCESS_PATH);
  requireArrayExact(blockers, meta, 'productGoal.clients', REQUIRED_CLIENTS);
  requireArrayExact(blockers, meta, 'productGoal.governedDimensions', REQUIRED_GOVERNED_DIMENSIONS);

  requireEqual(blockers, meta, 'nativeBridge.eligible', true);
  requireEqual(blockers, meta, 'nativeBridge.localMemoryRuntimePosture.primaryRuntime', REQUIRED_PRIMARY_RUNTIME);
  requireEqual(blockers, meta, 'nativeBridge.localMemoryRuntimePosture.localMemoryPrimaryRuntime', false);
  requireEqual(blockers, meta, 'nativeBridge.localMemoryRuntimePosture.auditEvidenceAllowed', true);
  requireEqual(blockers, meta, 'nativeBridge.localMemoryRuntimePosture.validationFixtureAllowed', true);
  requireEqual(blockers, meta, 'nativeBridge.localMemoryRuntimePosture.compatibilityAllowed', true);
  requireEqual(blockers, meta, 'nativeBridge.localMemoryRuntimePosture.offlineContinuityAllowed', true);
  requireEqual(blockers, meta, 'nativeBridge.localMemoryRuntimePosture.rawFallbackMayBeMistakenForNative', false);
  requireArrayExact(blockers, meta, 'nativeBridge.localMemoryRole', REQUIRED_LOCAL_MEMORY_ROLE);
  const nativeBridgeDirection = valueAtPath(meta, 'nativeBridge.direction');
  if (!['read', 'write'].includes(nativeBridgeDirection)) {
    blockers.push('nativeBridge.direction_must_be_read_or_write_for_current_product_goal');
  }

  requireArrayExact(blockers, meta, 'clientIdentity.allowedClientIds', REQUIRED_CLIENTS);
  requireEqual(blockers, meta, 'clientIdentity.source', 'trusted_execution_context_or_transport');
  requireEqual(blockers, meta, 'clientIdentity.toolArgumentsMayOverride', false);
  requireEqual(blockers, meta, 'clientIdentity.governanceMetadataMayOverrideTransportContext', false);

  requireEqual(blockers, meta, 'scopeBoundary.source', 'trusted_execution_context_or_transport');
  requireArrayExact(blockers, meta, 'scopeBoundary.requiredFieldNames', [
    'project_id',
    'scope_id',
    'workspace_id',
    'client_id',
    'visibility'
  ]);
  requireArrayExact(
    blockers,
    meta,
    'scopeBoundary.acceptedVisibility',
    GOVERNED_NATIVE_VISIBILITIES
  );
  requireEqual(blockers, meta, 'scopeBoundary.toolArgumentsMayOverride', false);
  requireEqual(blockers, meta, 'scopeBoundary.governanceMetadataMayOverrideTransportContext', false);
  requireEqual(blockers, meta, 'scopeBoundary.rawScopeValueReturned', false);

  requireEqual(blockers, meta, 'runtimeTarget.primaryRuntime', REQUIRED_PRIMARY_RUNTIME);
  requireEqual(blockers, meta, 'runtimeTarget.source', 'bridge_runtime_or_static_config');
  if (requireRuntimeTargetBound) {
    requireEqual(blockers, meta, 'runtimeTarget.bound', true);
    requireEqual(blockers, meta, 'runtimeTarget.configured', true);
  } else if (typeof valueAtPath(meta, 'runtimeTarget.bound') !== 'boolean') {
    blockers.push('runtimeTarget.bound_must_be_boolean');
  }
  requireEqual(blockers, meta, 'runtimeTarget.sourceAuthority', 'bridge_runtime_or_static_config');
  requireEqual(blockers, meta, 'runtimeTarget.toolArgumentsMayOverride', false);
  requireEqual(blockers, meta, 'runtimeTarget.governanceMetadataMayOverride', false);
  requireEqual(blockers, meta, 'runtimeTarget.locatorDisclosed', false);
  requireEqual(blockers, meta, 'runtimeTarget.endpointDisclosed', false);
  requireEqual(blockers, meta, 'runtimeTarget.tokenMaterialDisclosed', false);

  requireEqual(blockers, meta, 'invocationProfile.source', 'bridge_tool_binding');
  requireEqual(blockers, meta, 'invocationProfile.transport', 'mcp');
  if (nativeBridgeDirection === 'read') {
    requireEqual(blockers, meta, 'invocationProfile.profile', 'governed_read_only');
    requireEqual(blockers, meta, 'readWriteAuthority.readAllowed', true);
    requireEqual(blockers, meta, 'readWriteAuthority.writeAllowed', false);
    requireEqual(blockers, meta, 'readWriteAuthority.writeRequiresExactApproval', false);
  }
  if (nativeBridgeDirection === 'write') {
    requireEqual(blockers, meta, 'invocationProfile.profile', 'governed_bounded_write');
    requireEqual(blockers, meta, 'readWriteAuthority.readAllowed', false);
    requireEqual(blockers, meta, 'readWriteAuthority.writeAllowed', true);
    requireEqual(blockers, meta, 'readWriteAuthority.writeRequiresExactApproval', true);
    requireEqual(blockers, meta, 'readWriteAuthority.writePolicy', 'exact_approval');
  }
  requireEqual(blockers, meta, 'invocationProfile.profileMustMatchToolDirection', true);
  requireArrayExact(blockers, meta, 'invocationProfile.acceptedProfiles', [
    'governed_read_only',
    'governed_bounded_write'
  ]);
  requireEqual(blockers, meta, 'invocationProfile.toolArgumentsMayOverride', false);
  requireEqual(blockers, meta, 'invocationProfile.governanceMetadataMayOverride', false);
  requireEqual(blockers, meta, 'invocationProfile.locatorOrSecretMaterialAllowed', false);
  requireEqual(blockers, meta, 'invocationProfile.adapterRevalidatesProfile', true);

  requireEqual(blockers, meta, 'readWriteAuthority.source', 'bridge_tool_binding');
  requireEqual(blockers, meta, 'readWriteAuthority.mixedReadWriteAllowed', false);
  requireEqual(blockers, meta, 'readWriteAuthority.unboundedWriteAllowed', false);
  requireEqual(blockers, meta, 'readWriteAuthority.toolArgumentsMayOverride', false);
  requireEqual(blockers, meta, 'readWriteAuthority.governanceMetadataMayOverride', false);
  requireEqual(blockers, meta, 'readWriteAuthority.adapterRevalidatesAuthority', true);

  requireEqual(blockers, meta, 'outputDisclosureBudget.source', 'bridge_gate_normalized_governance');
  requireEqual(blockers, meta, 'outputDisclosureBudget.bound', true);
  requireEqual(blockers, meta, 'outputDisclosureBudget.lowDisclosureRequired', true);
  requireEqual(blockers, meta, 'outputDisclosureBudget.rawOutputAllowed', false);
  requireEqual(blockers, meta, 'outputDisclosureBudget.toolArgumentsMayOverride', false);
  requireEqual(blockers, meta, 'outputDisclosureBudget.toolArgumentsMayIncreaseBudget', false);
  requireEqual(blockers, meta, 'outputDisclosureBudget.toolArgumentsMayRequestRawOutput', false);
  requireEqual(blockers, meta, 'outputDisclosureBudget.governanceMetadataMayOverride', false);
  requireEqual(blockers, meta, 'outputDisclosureBudget.locatorOrSecretMaterialAllowed', false);
  requireEqual(blockers, meta, 'outputDisclosureBudget.overBudgetFallbackToRawOutput', false);

  requireEqual(blockers, meta, 'auditReceipt.source', 'bridge_gate_normalized_governance');
  requireEqual(blockers, meta, 'auditReceipt.required', true);
  requireEqual(blockers, meta, 'auditReceipt.lowDisclosure', true);
  requireEqual(blockers, meta, 'auditReceipt.lowDisclosureBound', true);
  requireEqual(blockers, meta, 'auditReceipt.toolArgumentsMayOverride', false);
  requireEqual(blockers, meta, 'auditReceipt.governanceMetadataMayOverride', false);
  requireEqual(blockers, meta, 'auditReceipt.recordsTrustedExecutionContextBooleans', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsDelegationStatusReason', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsNativeInvocationReceiptBinding', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsNativeInvocationGovernanceMetadataBinding', true);
  requireArrayIncludes(
    blockers,
    meta,
    'auditReceipt.recordedEvidenceFields',
    nativeBridgeDirection === 'write'
      ? REQUIRED_NATIVE_BRIDGE_AUDIT_EVIDENCE_FIELDS
      : REQUIRED_NATIVE_BRIDGE_COMMON_AUDIT_EVIDENCE_FIELDS
  );
  requireEqual(blockers, meta, 'auditReceipt.recordsScopeFingerprint', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsScopeFieldNames', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsScopeIdentifierFieldNames', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsOutputBudgetBuckets', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsRawOutputPolicy', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsAuditReceiptLowDisclosureBooleans', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsRollbackEvidence', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsRollbackPlanSafetyBooleans', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsNativeInvocationShapeBuckets', true);
  requireEqual(blockers, meta, 'auditReceipt.rawScopePersisted', false);
  requireEqual(blockers, meta, 'auditReceipt.rawRequestBodyPersisted', false);
  requireEqual(blockers, meta, 'auditReceipt.rawResponseBodyPersisted', false);
  requireEqual(blockers, meta, 'auditReceipt.rawNativePayloadPersisted', false);
  requireEqual(blockers, meta, 'auditReceipt.rawPayloadPersisted', false);

  requireEqual(blockers, meta, 'rollbackPosture.source', 'bridge_gate_normalized_governance');
  requireEqual(blockers, meta, 'rollbackPosture.bound', true);
  requireEqual(blockers, meta, 'rollbackPosture.defaultReadPosture', 'no_runtime_state_to_rollback');
  requireArrayExact(blockers, meta, 'rollbackPosture.acceptedReadPostures', [
    'no_runtime_state_to_rollback',
    'read_only_no_write'
  ]);
  requireArrayExact(blockers, meta, 'rollbackPosture.acceptedWritePostures', [
    'bounded_rollback_plan',
    'mutation_cleanup_plan'
  ]);
  requireEqual(blockers, meta, 'rollbackPosture.readRollbackPlanReferenceAllowed', false);
  requireEqual(blockers, meta, 'rollbackPosture.readRollbackDisposition', 'no_runtime_write_to_rollback');
  if (nativeBridgeDirection === 'read') {
    requireEqual(blockers, meta, 'rollbackPosture.writeRollbackPlanReferenceRequired', false);
    requireEqual(blockers, meta, 'rollbackPosture.writeRollbackPlanReferenceSafeRequired', false);
    requireEqual(blockers, meta, 'rollbackPosture.writeRollbackPlanBoundRequired', false);
    requireEqual(blockers, meta, 'rollbackPosture.writeRollbackPlanShapeOnlyRequired', false);
    requireEqual(blockers, meta, 'rollbackPosture.writeRollbackApplyRequiresGovernedFollowup', false);
  }
  if (nativeBridgeDirection === 'write') {
    requireEqual(blockers, meta, 'rollbackPosture.writeRollbackPlanReferenceRequired', true);
    requireEqual(blockers, meta, 'rollbackPosture.writeRollbackPlanReferenceSafeRequired', true);
    requireEqual(blockers, meta, 'rollbackPosture.writeRollbackPlanBoundRequired', true);
    requireEqual(blockers, meta, 'rollbackPosture.writeRollbackPlanShapeOnlyRequired', true);
    requireEqual(blockers, meta, 'rollbackPosture.writeRollbackApplyRequiresGovernedFollowup', true);
  }
  requireEqual(blockers, meta, 'rollbackPosture.toolArgumentsMayOverride', false);
  requireEqual(blockers, meta, 'rollbackPosture.governanceMetadataMayOverride', false);
  requireEqual(blockers, meta, 'rollbackPosture.automaticRollbackAppliedByBridge', false);
  requireEqual(blockers, meta, 'rollbackPosture.rollbackApplyAttemptedByBridge', false);

  const accepted = blockers.length === 0;
  return {
    contractName: CONTRACT_NAME,
    contractVersion: `${CONTRACT_VERSION}_governed_mcp_metadata_coverage`,
    accepted,
    decision: accepted
      ? 'governed_mcp_metadata_covers_current_product_goal'
      : 'governed_mcp_metadata_missing_current_product_goal_coverage',
    blockers,
    requiredGovernedDimensions: [...REQUIRED_GOVERNED_DIMENSIONS],
    runtimeTargetBoundRequired: requireRuntimeTargetBound,
    runtimeCalled: false,
    vcpToolBoxCalled: false,
    mcpToolCalled: false,
    memoryReadPerformed: false,
    memoryWritePerformed: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    readinessClaimed: false
  };
}

function getGovernedBridgeMetadataFromTool(tool = {}) {
  return isPlainObject(tool) &&
    isPlainObject(tool._meta) &&
    isPlainObject(tool._meta.codexMemoryGovernedBridge)
    ? tool._meta.codexMemoryGovernedBridge
    : null;
}

function validateGovernedMcpToolsListCoversCurrentProductGoal(tools = [], options = {}) {
  const blockers = [];
  const toolList = Array.isArray(tools) ? tools : [];
  const toolsByName = new Map();
  const duplicateToolNames = new Set();

  for (const tool of toolList) {
    const name = normalizeString(tool?.name);
    if (!name) {
      blockers.push('tool_name_must_be_present');
      continue;
    }
    if (toolsByName.has(name)) duplicateToolNames.add(name);
    toolsByName.set(name, tool);
  }

  for (const duplicateName of duplicateToolNames) {
    blockers.push(`tool_${duplicateName}_must_not_be_duplicated`);
  }

  const coverageByTool = {};
  for (const toolName of REQUIRED_NATIVE_BRIDGE_TOOLS) {
    const tool = toolsByName.get(toolName);
    if (!tool) {
      blockers.push(`native_bridge_tool_${toolName}_must_be_listed`);
      continue;
    }

    const metadata = getGovernedBridgeMetadataFromTool(tool);
    if (!metadata) {
      blockers.push(`native_bridge_tool_${toolName}_must_have_governed_metadata`);
      continue;
    }

    const coverage = validateGovernedMcpMetadataCoversCurrentProductGoal(metadata, options);
    coverageByTool[toolName] = coverage;
    for (const blocker of coverage.blockers) {
      blockers.push(`native_bridge_tool_${toolName}.${blocker}`);
    }
  }

  for (const tool of toolList) {
    const name = normalizeString(tool?.name);
    const metadata = getGovernedBridgeMetadataFromTool(tool);
    if (!metadata || REQUIRED_NATIVE_BRIDGE_TOOLS.includes(name)) continue;
    if (metadata.nativeBridge?.eligible === true) {
      blockers.push(`non_current_goal_tool_${name}_must_not_be_native_bridge_eligible`);
    }
  }

  const accepted = blockers.length === 0;
  return {
    contractName: CONTRACT_NAME,
    contractVersion: `${CONTRACT_VERSION}_governed_mcp_tools_list_coverage`,
    accepted,
    decision: accepted
      ? 'governed_mcp_tools_list_covers_current_product_goal'
      : 'governed_mcp_tools_list_missing_current_product_goal_coverage',
    blockers,
    requiredNativeBridgeTools: [...REQUIRED_NATIVE_BRIDGE_TOOLS],
    receivedToolNames: [...toolsByName.keys()],
    coverageByTool,
    runtimeTargetBoundRequired: options.requireRuntimeTargetBound === true,
    runtimeCalled: false,
    vcpToolBoxCalled: false,
    mcpToolCalled: false,
    memoryReadPerformed: false,
    memoryWritePerformed: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    readinessClaimed: false
  };
}

function validateGovernedMcpServerMetadataCoversCurrentProductGoal(metadata = {}, options = {}) {
  const blockers = [];
  const meta = isPlainObject(metadata) ? metadata : {};
  const requireRuntimeTargetBound = options.requireRuntimeTargetBound === true;

  requireEqual(blockers, meta, 'schemaVersion', 'codex_memory_governed_bridge_server_meta_v1');
  requireEqual(blockers, meta, 'productGoal.primaryRuntime', REQUIRED_PRIMARY_RUNTIME);
  requireEqual(blockers, meta, 'productGoal.primaryValue', REQUIRED_PRIMARY_VALUE);
  requireEqual(blockers, meta, 'productGoal.accessPath', REQUIRED_ACCESS_PATH);
  requireArrayExact(blockers, meta, 'productGoal.clients', REQUIRED_CLIENTS);
  requireArrayExact(blockers, meta, 'productGoal.governedDimensions', REQUIRED_GOVERNED_DIMENSIONS);
  requireArrayExact(blockers, meta, 'productGoal.localMemoryRole', REQUIRED_LOCAL_MEMORY_ROLE);

  requireEqual(blockers, meta, 'nativeBridge.primaryRuntime', REQUIRED_PRIMARY_RUNTIME);
  requireEqual(blockers, meta, 'nativeBridge.primaryValue', REQUIRED_PRIMARY_VALUE);
  requireEqual(blockers, meta, 'nativeBridge.accessPath', REQUIRED_ACCESS_PATH);
  requireArrayExact(blockers, meta, 'nativeBridge.eligibleTools.read', REQUIRED_NATIVE_BRIDGE_READ_TOOLS);
  requireArrayExact(blockers, meta, 'nativeBridge.eligibleTools.write', REQUIRED_NATIVE_BRIDGE_WRITE_TOOLS);
  requireArrayExact(blockers, meta, 'nativeBridge.localMemoryRole', REQUIRED_LOCAL_MEMORY_ROLE);
  requireEqual(blockers, meta, 'nativeBridge.readinessClaimed', false);

  requireEqual(blockers, meta, 'runtimeTarget.primaryRuntime', REQUIRED_PRIMARY_RUNTIME);
  requireEqual(blockers, meta, 'runtimeTarget.toolArgumentsMayOverride', false);
  requireEqual(blockers, meta, 'runtimeTarget.governanceMetadataMayOverride', false);
  requireEqual(blockers, meta, 'runtimeTarget.locatorDisclosed', false);
  requireEqual(blockers, meta, 'runtimeTarget.endpointDisclosed', false);
  requireEqual(blockers, meta, 'runtimeTarget.tokenMaterialDisclosed', false);
  if (requireRuntimeTargetBound) {
    requireEqual(blockers, meta, 'runtimeTarget.bound', true);
    requireEqual(blockers, meta, 'runtimeTarget.configured', true);
    requireEqual(blockers, meta, 'runtimeTarget.targetKind', 'mcp_server');
    requireEqual(blockers, meta, 'runtimeTarget.sourceAuthority', 'bridge_runtime_or_static_config');
    requireNonEmptyString(blockers, meta, 'runtimeTarget.targetReferenceName');
  } else if (typeof valueAtPath(meta, 'runtimeTarget.bound') !== 'boolean') {
    blockers.push('runtimeTarget.bound_must_be_boolean');
  }

  requireArrayExact(blockers, meta, 'clientIdentity.allowedClientIds', REQUIRED_CLIENTS);
  requireEqual(blockers, meta, 'clientIdentity.source', 'trusted_execution_context_or_transport');
  requireEqual(blockers, meta, 'clientIdentity.toolArgumentsMayOverride', false);
  requireEqual(blockers, meta, 'clientIdentity.governanceMetadataMayOverrideTransportContext', false);

  requireEqual(blockers, meta, 'scopeBoundary.source', 'trusted_execution_context_or_transport');
  requireArrayExact(blockers, meta, 'scopeBoundary.requiredFieldNames', [
    'project_id',
    'scope_id',
    'workspace_id',
    'client_id',
    'visibility'
  ]);
  requireArrayExact(
    blockers,
    meta,
    'scopeBoundary.acceptedVisibility',
    GOVERNED_NATIVE_VISIBILITIES
  );
  requireEqual(blockers, meta, 'scopeBoundary.toolArgumentsMayOverride', false);
  requireEqual(blockers, meta, 'scopeBoundary.governanceMetadataMayOverrideTransportContext', false);
  requireEqual(blockers, meta, 'scopeBoundary.rawScopeValueReturned', false);

  requireEqual(blockers, meta, 'invocationProfile.source', 'bridge_tool_binding');
  requireEqual(blockers, meta, 'invocationProfile.transport', 'mcp');
  requireArrayExact(blockers, meta, 'invocationProfile.acceptedProfiles', [
    'governed_read_only',
    'governed_bounded_write'
  ]);
  requireEqual(blockers, meta, 'invocationProfile.readProfile', 'governed_read_only');
  requireEqual(blockers, meta, 'invocationProfile.writeProfile', 'governed_bounded_write');
  requireArrayExact(blockers, meta, 'invocationProfile.readTools', REQUIRED_NATIVE_BRIDGE_READ_TOOLS);
  requireArrayExact(blockers, meta, 'invocationProfile.writeTools', REQUIRED_NATIVE_BRIDGE_WRITE_TOOLS);
  requireEqual(blockers, meta, 'invocationProfile.profileMustMatchToolDirection', true);
  requireEqual(blockers, meta, 'invocationProfile.toolArgumentsMayOverride', false);
  requireEqual(blockers, meta, 'invocationProfile.governanceMetadataMayOverride', false);
  requireEqual(blockers, meta, 'invocationProfile.locatorOrSecretMaterialAllowed', false);
  requireEqual(blockers, meta, 'invocationProfile.adapterRevalidatesProfile', true);
  requireEqual(
    blockers,
    meta,
    'invocationProfile.unsupportedInvocationMetadataPosture',
    'fail_closed_without_partial_request_context'
  );

  requireEqual(blockers, meta, 'readWriteAuthority.source', 'bridge_tool_binding');
  requireArrayExact(blockers, meta, 'readWriteAuthority.readTools', REQUIRED_NATIVE_BRIDGE_READ_TOOLS);
  requireArrayExact(blockers, meta, 'readWriteAuthority.writeTools', REQUIRED_NATIVE_BRIDGE_WRITE_TOOLS);
  requireEqual(blockers, meta, 'readWriteAuthority.writePolicyForWriteTools', 'exact_approval');
  requireEqual(blockers, meta, 'readWriteAuthority.writeRequiresExactApproval', true);
  requireEqual(blockers, meta, 'readWriteAuthority.mixedReadWriteAllowed', false);
  requireEqual(blockers, meta, 'readWriteAuthority.unboundedWriteAllowed', false);
  requireEqual(blockers, meta, 'readWriteAuthority.toolArgumentsMayOverride', false);
  requireEqual(blockers, meta, 'readWriteAuthority.governanceMetadataMayOverride', false);
  requireEqual(blockers, meta, 'readWriteAuthority.adapterRevalidatesAuthority', true);
  requireEqual(
    blockers,
    meta,
    'readWriteAuthority.unsupportedAuthorityMetadataPosture',
    'fail_closed_without_partial_request_context'
  );

  requireEqual(blockers, meta, 'governanceTransport.metadataPath', 'params._meta.codexMemoryGovernance');
  requireEqual(blockers, meta, 'governanceTransport.toolArgumentsMayCarryGovernance', false);
  requireArrayExact(blockers, meta, 'governanceTransport.requiredForNativeDelegation', [
    'trustedExecutionContext',
    'auditReceipt',
    'outputDisclosureBudget',
    'rollbackPosture'
  ]);
  requireEqual(blockers, meta, 'governanceTransport.trustedExecutionContextMustMatchTransportContext', true);
  requireEqual(blockers, meta, 'governanceTransport.transportContextFieldsOverrideGovernanceMetadata', true);
  requireEqual(blockers, meta, 'governanceTransport.writeRequiresExactApproval', true);
  requireEqual(
    blockers,
    meta,
    'governanceTransport.unsafeGovernanceMetadataPosture',
    'fail_closed_without_partial_request_context'
  );

  requireEqual(blockers, meta, 'outputDisclosureBudget.source', 'bridge_gate_normalized_governance');
  requireEqual(blockers, meta, 'outputDisclosureBudget.bound', true);
  requireEqual(blockers, meta, 'outputDisclosureBudget.metadataPath', 'params._meta.codexMemoryGovernance.outputDisclosureBudget');
  requireArrayExact(blockers, meta, 'outputDisclosureBudget.acceptedLevels', [
    'none',
    'receipt_only',
    'metadata',
    'shape_only',
    'summary',
    'structured'
  ]);
  requireEqual(blockers, meta, 'outputDisclosureBudget.defaultLevel', 'summary');
  requireEqual(blockers, meta, 'outputDisclosureBudget.lowDisclosureRequired', true);
  requireEqual(blockers, meta, 'outputDisclosureBudget.rawOutputAllowed', false);
  requireEqual(blockers, meta, 'outputDisclosureBudget.toolArgumentsMayOverride', false);
  requireIntegerInRange(blockers, meta, 'outputDisclosureBudget.maxItems', 0, 5);
  requireIntegerInRange(blockers, meta, 'outputDisclosureBudget.maxBytes', 0, 4096);
  requireEqual(blockers, meta, 'outputDisclosureBudget.toolArgumentsMayIncreaseBudget', false);
  requireEqual(blockers, meta, 'outputDisclosureBudget.toolArgumentsMayRequestRawOutput', false);
  requireEqual(blockers, meta, 'outputDisclosureBudget.governanceMetadataMaySupplyBudget', true);
  requireEqual(blockers, meta, 'outputDisclosureBudget.governanceMetadataMayOverride', false);
  requireEqual(blockers, meta, 'outputDisclosureBudget.locatorOrSecretMaterialAllowed', false);
  requireEqual(blockers, meta, 'outputDisclosureBudget.overBudgetPosture', 'fail_closed_without_raw_output');
  requireEqual(blockers, meta, 'outputDisclosureBudget.overBudgetFallbackToRawOutput', false);

  requireEqual(blockers, meta, 'auditReceipt.source', 'bridge_gate_normalized_governance');
  requireEqual(blockers, meta, 'auditReceipt.requiredForNativeDelegation', true);
  requireEqual(blockers, meta, 'auditReceipt.lowDisclosure', true);
  requireEqual(blockers, meta, 'auditReceipt.lowDisclosureBound', true);
  requireEqual(blockers, meta, 'auditReceipt.metadataPath', 'params._meta.codexMemoryGovernance.auditReceipt');
  requireEqual(blockers, meta, 'auditReceipt.toolArgumentsMayOverride', false);
  requireEqual(blockers, meta, 'auditReceipt.governanceMetadataMayOverride', false);
  requireEqual(blockers, meta, 'auditReceipt.localReceiptEventType', 'governed_mcp_vcp_native_bridge_receipt');
  requireEqual(blockers, meta, 'auditReceipt.localFallbackReceiptEventType', 'governed_mcp_vcp_native_read_fallback_receipt');
  requireEqual(blockers, meta, 'auditReceipt.recordsTrustedExecutionContextBooleans', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsExactApprovalSafetyBooleans', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsDelegationStatusReason', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsNativeInvocationReceiptBinding', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsNativeInvocationGovernanceMetadataBinding', true);
  requireArrayIncludes(
    blockers,
    meta,
    'auditReceipt.recordedEvidenceFields',
    REQUIRED_NATIVE_BRIDGE_AUDIT_EVIDENCE_FIELDS
  );
  requireEqual(blockers, meta, 'auditReceipt.recordsScopeFingerprint', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsScopeFieldNames', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsScopeIdentifierFieldNames', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsOutputBudgetBuckets', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsRawOutputPolicy', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsAuditReceiptLowDisclosureBooleans', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsRollbackEvidence', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsRollbackPlanSafetyBooleans', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsRollbackReasonCode', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsNativeInvocationShapeBuckets', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsLocalFallbackRole', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsLocalFallbackSourceRuntime', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsLocalFallbackAuthorization', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsLocalFallbackAuditReceiptStatus', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsLocalFallbackNativeReadFailureBuckets', true);
  requireEqual(blockers, meta, 'auditReceipt.recordsLocalFallbackNativeResultBoundary', true);
  requireEqual(blockers, meta, 'auditReceipt.rawScopePersisted', false);
  requireEqual(blockers, meta, 'auditReceipt.rawRequestBodyPersisted', false);
  requireEqual(blockers, meta, 'auditReceipt.rawResponseBodyPersisted', false);
  requireEqual(blockers, meta, 'auditReceipt.rawNativePayloadPersisted', false);
  requireEqual(blockers, meta, 'auditReceipt.rawPayloadPersisted', false);

  requireEqual(blockers, meta, 'rollbackPosture.source', 'bridge_gate_normalized_governance');
  requireEqual(blockers, meta, 'rollbackPosture.bound', true);
  requireEqual(blockers, meta, 'rollbackPosture.metadataPath', 'params._meta.codexMemoryGovernance.rollbackPosture');
  requireEqual(blockers, meta, 'rollbackPosture.defaultReadPosture', 'no_runtime_state_to_rollback');
  requireArrayExact(blockers, meta, 'rollbackPosture.acceptedReadPostures', [
    'no_runtime_state_to_rollback',
    'read_only_no_write'
  ]);
  requireArrayExact(blockers, meta, 'rollbackPosture.acceptedWritePostures', [
    'bounded_rollback_plan',
    'mutation_cleanup_plan'
  ]);
  requireEqual(blockers, meta, 'rollbackPosture.readRollbackPlanReferenceAllowed', false);
  requireEqual(blockers, meta, 'rollbackPosture.readRollbackDisposition', 'no_runtime_write_to_rollback');
  requireEqual(blockers, meta, 'rollbackPosture.writeRollbackPlanReferenceRequired', true);
  requireEqual(blockers, meta, 'rollbackPosture.writeRollbackPlanReferenceSafeRequired', true);
  requireEqual(blockers, meta, 'rollbackPosture.writeRollbackPlanBoundRequired', true);
  requireEqual(blockers, meta, 'rollbackPosture.writeRollbackPlanShapeOnlyRequired', true);
  requireEqual(blockers, meta, 'rollbackPosture.writeRollbackApplyRequiresGovernedFollowup', true);
  requireEqual(blockers, meta, 'rollbackPosture.toolArgumentsMayOverride', false);
  requireEqual(blockers, meta, 'rollbackPosture.governanceMetadataMayOverride', false);
  requireEqual(blockers, meta, 'rollbackPosture.automaticRollbackAppliedByBridge', false);
  requireEqual(blockers, meta, 'rollbackPosture.postCommitFailureDisposition', 'rollback_required_not_applied');
  requireEqual(blockers, meta, 'rollbackPosture.postCommitFailureApplyPolicy', 'manual_governed_followup_required');
  requireArrayExact(
    blockers,
    meta,
    'rollbackPosture.postCommitFailureReasonCodes',
    Object.values(REQUIRED_WRITE_POST_COMMIT_ROLLBACK_REASON_CODES)
  );
  requireEqual(blockers, meta, 'rollbackPosture.rollbackApplyAttemptedByBridge', false);

  requireEqual(blockers, meta, 'disclosure.serverHandshakeLowDisclosure', true);
  requireEqual(blockers, meta, 'disclosure.rawMemoryReturned', false);
  requireEqual(blockers, meta, 'disclosure.tokenMaterialReturned', false);
  requireEqual(blockers, meta, 'disclosure.endpointReturned', false);
  requireEqual(blockers, meta, 'disclosure.locatorReturned', false);

  const accepted = blockers.length === 0;
  return {
    contractName: CONTRACT_NAME,
    contractVersion: `${CONTRACT_VERSION}_governed_mcp_server_metadata_coverage`,
    accepted,
    decision: accepted
      ? 'governed_mcp_server_metadata_covers_current_product_goal'
      : 'governed_mcp_server_metadata_missing_current_product_goal_coverage',
    blockers,
    requiredGovernedDimensions: [...REQUIRED_GOVERNED_DIMENSIONS],
    requiredNativeBridgeTools: [...REQUIRED_NATIVE_BRIDGE_TOOLS],
    requiredLocalMemoryRole: [...REQUIRED_LOCAL_MEMORY_ROLE],
    runtimeTargetBoundRequired: requireRuntimeTargetBound,
    runtimeCalled: false,
    vcpToolBoxCalled: false,
    mcpToolCalled: false,
    memoryReadPerformed: false,
    memoryWritePerformed: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    readinessClaimed: false
  };
}

function validateGovernedMcpBridgeGateResultCoversCurrentProductGoal(gateResult = {}) {
  const blockers = [];
  const result = isPlainObject(gateResult) ? gateResult : {};
  const request = isPlainObject(result.normalizedBridgeRequest)
    ? result.normalizedBridgeRequest
    : {};
  const toolName = normalizeString(request.mcp_tool_name);
  const readTool = REQUIRED_NATIVE_BRIDGE_READ_TOOLS.includes(toolName);
  const writeTool = REQUIRED_NATIVE_BRIDGE_WRITE_TOOLS.includes(toolName);

  requireEqual(blockers, result, 'accepted', true);
  requireEqual(blockers, result, 'productGoalAccepted', true);
  requireArrayExact(
    blockers,
    result,
    'requiredRequestDimensions',
    REQUIRED_BRIDGE_GATE_REQUEST_DIMENSIONS
  );
  requireEqual(blockers, result, 'normalizedProductGoal.primary_runtime', REQUIRED_PRIMARY_RUNTIME);
  requireEqual(blockers, result, 'normalizedProductGoal.primary_value', REQUIRED_PRIMARY_VALUE);
  requireEqual(blockers, result, 'normalizedProductGoal.access_path', REQUIRED_ACCESS_PATH);
  requireArrayExact(blockers, result, 'normalizedProductGoal.clients', REQUIRED_CLIENTS);
  requireArrayExact(
    blockers,
    result,
    'normalizedProductGoal.governed_dimensions',
    REQUIRED_GOVERNED_DIMENSIONS
  );
  requireArrayExact(
    blockers,
    result,
    'normalizedProductGoal.local_memory_role',
    REQUIRED_LOCAL_MEMORY_ROLE
  );

  if (!REQUIRED_NATIVE_BRIDGE_TOOLS.includes(toolName)) {
    blockers.push('normalizedBridgeRequest.mcp_tool_name_must_be_current_product_goal_native_bridge_tool');
  }

  requireOneOf(
    blockers,
    request,
    'client_id',
    REQUIRED_CLIENTS,
    'normalizedBridgeRequest.client_id_must_be_governed_native_client'
  );
  requireEqual(blockers, request, 'access_path', REQUIRED_ACCESS_PATH);
  requireEqual(blockers, request, 'scope_identifier_present', true);
  requireEqual(blockers, request, 'scope_identifier_safe', true);
  requireEqual(blockers, request, 'scope.client_id', valueAtPath(request, 'client_id'));
  requireEqual(blockers, request, 'scope.visibility', valueAtPath(request, 'visibility'));
  if (!GOVERNED_NATIVE_VISIBILITIES.includes(valueAtPath(request, 'visibility'))) {
    blockers.push('normalizedBridgeRequest.visibility_must_be_governed_visibility');
  }
  if (request.trusted_execution_context_supplied === true) {
    requireEqual(blockers, request, 'trusted_execution_context_accepted', true);
    requireEqual(blockers, request, 'trusted_execution_context_scope_matched', true);
  }

  requireEqual(blockers, request, 'runtime_target', REQUIRED_PRIMARY_RUNTIME);
  requireNonEmptyString(blockers, request, 'runtime_target_reference_name');
  requireEqual(blockers, request, 'runtime_target_kind', 'mcp_server');
  requireEqual(blockers, request, 'runtime_target_source_authority', 'bridge_runtime_or_static_config');
  requireEqual(blockers, request, 'runtime_target_configured', true);
  requireEqual(blockers, request, 'runtime_target_forbidden_field_count', 0);

  requireEqual(blockers, request, 'transport', 'mcp');
  requireEqual(blockers, request, 'invocation_profile_forbidden_field_count', 0);
  requireEqual(blockers, request, 'read_write_authority_forbidden_field_count', 0);
  if (readTool) {
    requireEqual(blockers, request, 'invocation_profile', 'governed_read_only');
    requireEqual(blockers, request, 'read_allowed', true);
    requireEqual(blockers, request, 'write_allowed', false);
    requireEqual(blockers, request, 'write_policy', null);
  }
  if (writeTool) {
    requireEqual(blockers, request, 'invocation_profile', 'governed_bounded_write');
    requireEqual(blockers, request, 'read_allowed', false);
    requireEqual(blockers, request, 'write_allowed', true);
    requireEqual(blockers, request, 'write_policy', 'exact_approval');
    requireNonEmptyString(blockers, request, 'exact_approval_action');
    requireEqual(blockers, request, 'exact_approval_action_matched', true);
    requireEqual(blockers, request, 'exact_approval_scope_matched', true);
    requireEqual(blockers, request, 'exact_approval_runtime_target_matched', true);
    requireEqual(blockers, request, 'exact_approval_rollback_plan_matched', true);
    requireEqual(blockers, request, 'exact_approval_scope_references_safe', true);
    requireEqual(blockers, request, 'exact_approval_scope_visibility_accepted', true);
    requireEqual(blockers, request, 'exact_approval_runtime_target_reference_safe', true);
    requireEqual(blockers, request, 'exact_approval_runtime_target_kind_accepted', true);
    requireEqual(blockers, request, 'exact_approval_runtime_target_primary_runtime_accepted', true);
    requireEqual(blockers, request, 'exact_approval_rollback_plan_reference_present', true);
    requireEqual(blockers, request, 'exact_approval_rollback_plan_reference_safe', true);
    requireEqual(blockers, request, 'exact_approval_forbidden_field_count', 0);
  }

  if (!['none', 'receipt_only', 'metadata', 'shape_only', 'summary', 'structured'].includes(
    valueAtPath(request, 'disclosure_level')
  )) {
    blockers.push('normalizedBridgeRequest.disclosure_level_must_be_allowed_low_disclosure_level');
  }
  requireIntegerInRange(blockers, request, 'disclosure_max_items', 0, 5);
  requireIntegerInRange(blockers, request, 'disclosure_max_bytes', 0, 4096);
  requireEqual(blockers, request, 'disclosure_forbidden_field_count', 0);
  requireEqual(blockers, request, 'raw_output_allowed', false);

  requireEqual(blockers, request, 'audit_receipt_required', true);
  requireEqual(blockers, request, 'audit_receipt_low_disclosure', true);
  requireEqual(blockers, request, 'audit_receipt_reference_present', true);
  requireEqual(blockers, request, 'audit_receipt_reference_safe', true);
  requireNonEmptyString(blockers, request, 'audit_receipt_reference_name');
  requireEqual(blockers, request, 'audit_receipt_forbidden_field_count', 0);

  requireEqual(blockers, request, 'rollback_posture_forbidden_field_count', 0);
  if (readTool) {
    if (!['no_runtime_state_to_rollback', 'read_only_no_write'].includes(
      valueAtPath(request, 'rollback_posture')
    )) {
      blockers.push('normalizedBridgeRequest.rollback_posture_must_be_read_only_posture');
    }
    requireEqual(blockers, request, 'rollback_plan_reference_present', false);
    requireEqual(blockers, request, 'rollback_plan_reference_name', null);
  }
  if (writeTool) {
    if (!['bounded_rollback_plan', 'mutation_cleanup_plan'].includes(
      valueAtPath(request, 'rollback_posture')
    )) {
      blockers.push('normalizedBridgeRequest.rollback_posture_must_be_governed_write_posture');
    }
    requireEqual(blockers, request, 'rollback_plan_reference_present', true);
    requireEqual(blockers, request, 'rollback_plan_reference_safe', true);
    requireNonEmptyString(blockers, request, 'rollback_plan_reference_name');
  }

  requireEqual(blockers, result, 'runtimeCalled', false);
  requireEqual(blockers, result, 'vcpToolBoxCalled', false);
  requireEqual(blockers, result, 'mcpToolCalled', false);
  requireEqual(blockers, result, 'memoryReadPerformed', false);
  requireEqual(blockers, result, 'memoryWritePerformed', false);
  requireEqual(blockers, result, 'localMemoryReadPerformed', false);
  requireEqual(blockers, result, 'localMemoryWritePerformed', false);
  requireEqual(blockers, result, 'auditWritePerformed', false);
  requireEqual(blockers, result, 'rollbackApplied', false);
  requireEqual(blockers, result, 'providerApiCalled', false);
  requireEqual(blockers, result, 'publicMcpExpanded', false);
  requireEqual(blockers, result, 'readinessClaimed', false);

  const accepted = blockers.length === 0;
  return {
    contractName: CONTRACT_NAME,
    contractVersion: `${CONTRACT_VERSION}_governed_mcp_bridge_gate_result_coverage`,
    accepted,
    decision: accepted
      ? 'governed_mcp_bridge_gate_result_covers_current_product_goal'
      : 'governed_mcp_bridge_gate_result_missing_current_product_goal_coverage',
    blockers,
    toolName: toolName || null,
    direction: readTool ? 'read' : writeTool ? 'write' : 'unknown',
    requiredRequestDimensions: [...REQUIRED_BRIDGE_GATE_REQUEST_DIMENSIONS],
    requiredGovernedDimensions: [...REQUIRED_GOVERNED_DIMENSIONS],
    requiredLocalMemoryRole: [...REQUIRED_LOCAL_MEMORY_ROLE],
    runtimeCalled: false,
    vcpToolBoxCalled: false,
    mcpToolCalled: false,
    memoryReadPerformed: false,
    memoryWritePerformed: false,
    providerApiCalled: false,
    readinessClaimed: false
  };
}

function validateGovernedMcpNativeDelegatedArgumentsCoversCurrentProductGoal(
  delegatedArguments = {},
  options = {}
) {
  const blockers = [];
  const args = isPlainObject(delegatedArguments) ? delegatedArguments : {};
  const bridge = isPlainObject(args.governed_bridge) ? args.governed_bridge : {};
  const optionToolName = normalizeString(options.toolName);
  const toolName = optionToolName || normalizeString(bridge.invocation_tool_name);
  const readTool = REQUIRED_NATIVE_BRIDGE_READ_TOOLS.includes(toolName);
  const writeTool = REQUIRED_NATIVE_BRIDGE_WRITE_TOOLS.includes(toolName);

  if (!isPlainObject(args.governed_bridge)) {
    blockers.push('governed_bridge_must_be_present');
  }
  if (!REQUIRED_NATIVE_BRIDGE_TOOLS.includes(toolName)) {
    blockers.push('invocation_tool_name_must_be_current_product_goal_native_bridge_tool');
  }

  requireEqual(blockers, bridge, 'primary_runtime', REQUIRED_PRIMARY_RUNTIME);
  requireEqual(blockers, bridge, 'access_path', REQUIRED_ACCESS_PATH);
  requireEqual(blockers, bridge, 'runtime_target.primary_runtime', REQUIRED_PRIMARY_RUNTIME);
  requireNonEmptyString(blockers, bridge, 'runtime_target.target_reference_name');
  requireEqual(blockers, bridge, 'runtime_target.target_kind', 'mcp_server');
  requireEqual(blockers, bridge, 'runtime_target.source_authority', 'bridge_runtime_or_static_config');
  requireEqual(blockers, bridge, 'runtime_target.forbidden_field_count', 0);
  requireEqual(blockers, bridge, 'runtime_target.bound', true);
  requireEqual(blockers, bridge, 'runtime_target.tool_arguments_may_override', false);
  requireEqual(blockers, bridge, 'runtime_target.governance_metadata_may_override', false);
  requireEqual(blockers, bridge, 'runtime_target.locator_included', false);
  requireEqual(blockers, bridge, 'runtime_target.endpoint_included', false);
  requireEqual(blockers, bridge, 'runtime_target.token_material_included', false);
  requireEqual(blockers, bridge, 'runtime_target.locator_disclosed', false);
  requireEqual(blockers, bridge, 'runtime_target.endpoint_disclosed', false);
  requireEqual(blockers, bridge, 'runtime_target.token_material_disclosed', false);

  requireOneOf(
    blockers,
    bridge,
    'client_id',
    REQUIRED_CLIENTS,
    'governed_bridge.client_id_must_be_governed_native_client'
  );
  requireEqual(blockers, bridge, 'scope_present', true);
  requireEqual(blockers, bridge, 'scope_identifier_present', true);
  requireEqual(blockers, bridge, 'scope_identifier_safe', true);
  requireEqual(blockers, bridge, 'scope.client_id', valueAtPath(bridge, 'client_id'));
  requireEqual(blockers, bridge, 'scope.visibility', valueAtPath(bridge, 'visibility'));
  if (!GOVERNED_NATIVE_VISIBILITIES.includes(valueAtPath(bridge, 'visibility'))) {
    blockers.push('governed_bridge.visibility_must_be_governed_visibility');
  }
  if (!Array.isArray(bridge.scope_field_names) || !bridge.scope_field_names.includes('client_id') ||
      !bridge.scope_field_names.includes('visibility')) {
    blockers.push('scope_field_names_must_include_client_id_and_visibility');
  }
  if (!Array.isArray(bridge.scope_identifier_field_names) ||
      bridge.scope_identifier_field_names.length === 0) {
    blockers.push('scope_identifier_field_names_must_include_identifier');
  }
  requireNonEmptyString(blockers, bridge, 'scope_fingerprint');
  requireEqual(blockers, bridge, 'raw_scope_persisted', false);
  requireEqual(blockers, bridge, 'raw_scope_value_returned', false);

  requireEqual(blockers, bridge, 'local_memory_role', 'not_used');
  requireEqual(blockers, bridge, 'local_memory_source_runtime', null);
  requireEqual(blockers, bridge, 'local_memory_primary_runtime', false);
  requireEqual(blockers, bridge, 'local_memory_fallback_used', false);
  requireEqual(blockers, bridge, 'local_memory_result_returned', false);
  requireEqual(blockers, bridge, 'local_memory_result_can_be_mistaken_for_vcp_native', false);
  requireEqual(blockers, bridge, 'local_memory_raw_content_disclosed', false);

  requireEqual(blockers, bridge, 'client_identity_source', 'trusted_execution_context_or_transport');
  requireEqual(blockers, bridge, 'client_identity_bound', true);
  requireEqual(blockers, bridge, 'client_identity_tool_arguments_may_override', false);
  requireEqual(blockers, bridge, 'client_identity_governance_metadata_may_override', false);
  requireEqual(blockers, bridge, 'scope_boundary_source', 'trusted_execution_context_or_transport');
  requireEqual(blockers, bridge, 'scope_boundary_bound', true);
  requireEqual(blockers, bridge, 'scope_tool_arguments_may_override', false);
  requireEqual(blockers, bridge, 'scope_governance_metadata_may_override', false);
  requireEqual(blockers, bridge, 'visibility_bound', true);
  if (bridge.trusted_execution_context_supplied === true) {
    requireEqual(blockers, bridge, 'trusted_execution_context_accepted', true);
    requireEqual(blockers, bridge, 'trusted_execution_context_scope_matched', true);
  }

  requireEqual(blockers, bridge, 'invocation_profile_source', 'bridge_tool_binding');
  requireEqual(blockers, bridge, 'invocation_profile_bound', true);
  requireEqual(blockers, bridge, 'invocation_profile_tool_arguments_may_override', false);
  requireEqual(blockers, bridge, 'invocation_profile_governance_metadata_may_override', false);
  requireEqual(blockers, bridge, 'invocation_transport', 'mcp');
  requireEqual(blockers, bridge, 'invocation_tool_name', toolName || null);
  requireEqual(blockers, bridge, 'invocation_profile_tool_match', true);
  requireEqual(blockers, bridge, 'invocation_profile_forbidden_field_count', 0);

  requireEqual(blockers, bridge, 'read_write_authority_source', 'bridge_tool_binding');
  requireEqual(blockers, bridge, 'read_write_authority_forbidden_field_count', 0);
  requireEqual(blockers, bridge, 'read_write_authority_bound', true);
  requireEqual(blockers, bridge, 'mixed_read_write_allowed', false);
  requireEqual(blockers, bridge, 'unbounded_write_allowed', false);

  if (readTool) {
    requireEqual(blockers, bridge, 'invocation_profile', 'governed_read_only');
    requireEqual(blockers, bridge, 'read_allowed', true);
    requireEqual(blockers, bridge, 'write_allowed', false);
    requireEqual(blockers, bridge, 'write_requires_exact_approval', false);
  }
  if (writeTool) {
    requireEqual(blockers, bridge, 'invocation_profile', 'governed_bounded_write');
    requireEqual(blockers, bridge, 'read_allowed', false);
    requireEqual(blockers, bridge, 'write_allowed', true);
    requireEqual(blockers, bridge, 'write_policy', 'exact_approval');
    requireEqual(blockers, bridge, 'write_requires_exact_approval', true);
    requireEqual(
      blockers,
      bridge,
      'exact_approval_action',
      REQUIRED_NATIVE_BRIDGE_WRITE_EXACT_APPROVAL_ACTIONS[toolName]
    );
    requireEqual(blockers, bridge, 'exact_approval_action_matched', true);
    requireEqual(blockers, bridge, 'exact_approval_scope_matched', true);
    requireEqual(blockers, bridge, 'exact_approval_runtime_target_matched', true);
    requireEqual(blockers, bridge, 'exact_approval_rollback_plan_matched', true);
    requireEqual(blockers, bridge, 'exact_approval_forbidden_field_count', 0);
  }

  if (!['none', 'receipt_only', 'metadata', 'shape_only', 'summary', 'structured'].includes(
    valueAtPath(bridge, 'disclosure_level')
  )) {
    blockers.push('governed_bridge.disclosure_level_must_be_allowed_low_disclosure_level');
  }
  requireEqual(blockers, bridge, 'raw_output_allowed', false);
  requireEqual(blockers, bridge, 'output_disclosure_budget_source', 'bridge_gate_normalized_governance');
  requireIntegerInRange(blockers, bridge, 'disclosure_max_items', 0, 5);
  requireIntegerInRange(blockers, bridge, 'disclosure_max_bytes', 0, 4096);
  requireEqual(blockers, bridge, 'disclosure_forbidden_field_count', 0);
  requireEqual(blockers, bridge, 'output_disclosure_budget_bound', true);
  requireEqual(blockers, bridge, 'output_disclosure_budget_tool_arguments_may_override', false);
  requireEqual(blockers, bridge, 'output_disclosure_budget_governance_metadata_may_override', false);
  requireEqual(blockers, bridge, 'over_budget_fallback_to_raw_output', false);
  requireEqual(blockers, bridge, 'raw_response_body_disclosed', false);

  requireEqual(blockers, bridge, 'audit_receipt_required', true);
  requireEqual(blockers, bridge, 'audit_receipt_low_disclosure', true);
  requireEqual(blockers, bridge, 'audit_receipt_source', 'bridge_gate_normalized_governance');
  requireEqual(blockers, bridge, 'audit_receipt_reference_present', true);
  requireNonEmptyString(blockers, bridge, 'audit_receipt_reference_name');
  requireEqual(blockers, bridge, 'audit_receipt_forbidden_field_count', 0);
  requireEqual(blockers, bridge, 'audit_receipt_event_type', 'governed_mcp_vcp_native_bridge_receipt');
  requireEqual(blockers, bridge, 'audit_receipt_append_required', true);
  requireEqual(blockers, bridge, 'audit_receipt_low_disclosure_bound', true);
  requireEqual(blockers, bridge, 'audit_receipt_tool_arguments_may_override', false);
  requireEqual(blockers, bridge, 'audit_receipt_governance_metadata_may_override', false);
  requireEqual(blockers, bridge, 'audit_raw_request_body_persisted', false);
  requireEqual(blockers, bridge, 'audit_raw_response_body_persisted', false);

  requireEqual(blockers, bridge, 'rollback_posture_source', 'bridge_gate_normalized_governance');
  requireEqual(blockers, bridge, 'rollback_posture_forbidden_field_count', 0);
  requireEqual(blockers, bridge, 'rollback_posture_bound', true);
  requireEqual(blockers, bridge, 'rollback_posture_tool_arguments_may_override', false);
  requireEqual(blockers, bridge, 'rollback_posture_governance_metadata_may_override', false);
  requireEqual(blockers, bridge, 'rollback_auto_apply_allowed', false);
  requireEqual(blockers, bridge, 'rollback_raw_plan_disclosed', false);
  requireEqual(blockers, bridge, 'rollback_raw_plan_persisted', false);
  if (readTool) {
    if (!['no_runtime_state_to_rollback', 'read_only_no_write'].includes(
      valueAtPath(bridge, 'rollback_posture')
    )) {
      blockers.push('governed_bridge.rollback_posture_must_be_read_only_posture');
    }
    requireEqual(blockers, bridge, 'rollback_plan_reference_present', false);
    requireEqual(blockers, bridge, 'rollback_plan_shape_only', false);
    requireEqual(blockers, bridge, 'rollback_apply_requires_governed_followup', false);
  }
  if (writeTool) {
    if (!['bounded_rollback_plan', 'mutation_cleanup_plan'].includes(
      valueAtPath(bridge, 'rollback_posture')
    )) {
      blockers.push('governed_bridge.rollback_posture_must_be_governed_write_posture');
    }
    requireEqual(blockers, bridge, 'rollback_plan_reference_present', true);
    requireEqual(blockers, bridge, 'rollback_plan_reference_safe', true);
    requireNonEmptyString(blockers, bridge, 'rollback_plan_reference_name');
    requireEqual(blockers, bridge, 'rollback_plan_shape_only', true);
    requireEqual(blockers, bridge, 'rollback_apply_requires_governed_followup', true);
  }
  requireEqual(blockers, bridge, 'low_disclosure', true);

  if (toolName === 'search_memory') requireEqual(blockers, args, 'include_content', false);
  if (toolName === 'audit_memory') requireEqual(blockers, args, 'include_raw', false);

  const accepted = blockers.length === 0;
  return {
    contractName: CONTRACT_NAME,
    contractVersion: `${CONTRACT_VERSION}_governed_mcp_native_delegated_arguments_coverage`,
    accepted,
    decision: accepted
      ? 'governed_mcp_native_delegated_arguments_cover_current_product_goal'
      : 'governed_mcp_native_delegated_arguments_missing_current_product_goal_coverage',
    blockers,
    toolName: toolName || null,
    direction: readTool ? 'read' : writeTool ? 'write' : 'unknown',
    requiredGovernedDimensions: [...REQUIRED_GOVERNED_DIMENSIONS],
    requiredLocalMemoryRole: [...REQUIRED_LOCAL_MEMORY_ROLE],
    vcpNativeResult: false,
    resultCanBeMistakenForVcpNative: false,
    readinessClaimed: false
  };
}

function validateGovernedMcpNativeGovernanceMetadataCoversCurrentProductGoal(
  governanceMetadata = {},
  options = {}
) {
  const blockers = [];
  const metadata = isPlainObject(governanceMetadata) ? governanceMetadata : {};
  const optionToolName = normalizeString(options.toolName);
  const toolName = optionToolName || normalizeString(valueAtPath(metadata, 'invocationProfile.toolName'));
  const readTool = REQUIRED_NATIVE_BRIDGE_READ_TOOLS.includes(toolName);
  const writeTool = REQUIRED_NATIVE_BRIDGE_WRITE_TOOLS.includes(toolName);

  if (!isPlainObject(governanceMetadata)) {
    blockers.push('governance_metadata_must_be_present');
  }
  if (!REQUIRED_NATIVE_BRIDGE_TOOLS.includes(toolName)) {
    blockers.push('invocationProfile.toolName_must_be_current_product_goal_native_bridge_tool');
  }

  requireEqual(
    blockers,
    metadata,
    'schemaVersion',
    'codex_memory_governed_native_bridge_call_governance_v1'
  );

  requireEqual(blockers, metadata, 'trustedExecutionContext.accepted', true);
  requireEqual(blockers, metadata, 'trustedExecutionContext.source', 'trusted_execution_context_or_transport');
  requireOneOf(
    blockers,
    metadata,
    'trustedExecutionContext.executionContext.agentAlias',
    REQUIRED_CLIENTS,
    'trustedExecutionContext.executionContext.agentAlias_must_be_governed_native_client'
  );
  requireEqual(
    blockers,
    metadata,
    'trustedExecutionContext.executionContext.clientId',
    valueAtPath(metadata, 'trustedExecutionContext.executionContext.agentAlias')
  );
  if (!GOVERNED_NATIVE_VISIBILITIES.includes(
    valueAtPath(metadata, 'trustedExecutionContext.executionContext.visibility')
  )) {
    blockers.push('trustedExecutionContext.executionContext.visibility_must_be_governed_visibility');
  }
  const projectId = valueAtPath(metadata, 'trustedExecutionContext.executionContext.projectId');
  const scopeId = valueAtPath(metadata, 'trustedExecutionContext.executionContext.scopeId');
  const workspaceId = valueAtPath(metadata, 'trustedExecutionContext.executionContext.workspaceId');
  if (!projectId && !scopeId && !workspaceId) {
    blockers.push('trustedExecutionContext.executionContext_must_include_scope_identifier');
  }

  requireEqual(blockers, metadata, 'runtimeTarget.primaryRuntime', REQUIRED_PRIMARY_RUNTIME);
  requireNonEmptyString(blockers, metadata, 'runtimeTarget.targetReferenceName');
  requireEqual(blockers, metadata, 'runtimeTarget.targetKind', 'mcp_server');
  requireEqual(blockers, metadata, 'runtimeTarget.sourceAuthority', 'bridge_runtime_or_static_config');
  requireEqual(blockers, metadata, 'runtimeTarget.bound', true);
  requireEqual(blockers, metadata, 'runtimeTarget.toolArgumentsMayOverride', false);
  requireEqual(blockers, metadata, 'runtimeTarget.governanceMetadataMayOverride', false);

  requireEqual(blockers, metadata, 'invocationProfile.source', 'bridge_tool_binding');
  requireEqual(blockers, metadata, 'invocationProfile.transport', 'mcp');
  requireEqual(blockers, metadata, 'invocationProfile.toolName', toolName || null);
  requireEqual(blockers, metadata, 'invocationProfile.bound', true);
  requireEqual(blockers, metadata, 'invocationProfile.toolArgumentsMayOverride', false);
  requireEqual(blockers, metadata, 'invocationProfile.governanceMetadataMayOverride', false);

  requireEqual(blockers, metadata, 'readWriteAuthority.source', 'bridge_tool_binding');
  requireEqual(blockers, metadata, 'readWriteAuthority.bound', true);
  requireEqual(blockers, metadata, 'readWriteAuthority.mixedReadWriteAllowed', false);
  requireEqual(blockers, metadata, 'readWriteAuthority.unboundedWriteAllowed', false);
  requireEqual(blockers, metadata, 'readWriteAuthority.toolArgumentsMayOverride', false);
  requireEqual(blockers, metadata, 'readWriteAuthority.governanceMetadataMayOverride', false);
  if (readTool) {
    requireEqual(blockers, metadata, 'invocationProfile.profile', 'governed_read_only');
    requireEqual(blockers, metadata, 'readWriteAuthority.readAllowed', true);
    requireEqual(blockers, metadata, 'readWriteAuthority.writeAllowed', false);
    requireEqual(blockers, metadata, 'readWriteAuthority.writeRequiresExactApproval', false);
  }
  if (writeTool) {
    requireEqual(blockers, metadata, 'invocationProfile.profile', 'governed_bounded_write');
    requireEqual(blockers, metadata, 'readWriteAuthority.readAllowed', false);
    requireEqual(blockers, metadata, 'readWriteAuthority.writeAllowed', true);
    requireEqual(blockers, metadata, 'readWriteAuthority.writePolicy', 'exact_approval');
    requireEqual(blockers, metadata, 'readWriteAuthority.writeRequiresExactApproval', true);
    requireEqual(blockers, metadata, 'exactApprovalResult.accepted', true);
    requireEqual(
      blockers,
      metadata,
      'exactApprovalResult.allowedAction',
      REQUIRED_NATIVE_BRIDGE_WRITE_EXACT_APPROVAL_ACTIONS[toolName]
    );
    requireEqual(blockers, metadata, 'exactApprovalResult.scopeMatched', true);
    requireEqual(blockers, metadata, 'exactApprovalResult.runtimeTargetMatched', true);
    requireEqual(blockers, metadata, 'exactApprovalResult.rollbackPlanMatched', true);
    requireNonEmptyString(blockers, metadata, 'exactApprovalResult.rollbackPlanRef');
    requireEqual(blockers, metadata, 'exactApprovalResult.runtimeTarget.primaryRuntime', REQUIRED_PRIMARY_RUNTIME);
    requireNonEmptyString(blockers, metadata, 'exactApprovalResult.runtimeTarget.targetReferenceName');
    requireEqual(blockers, metadata, 'exactApprovalResult.runtimeTarget.targetKind', 'mcp_server');
  }

  if (!['none', 'receipt_only', 'metadata', 'shape_only', 'summary', 'structured'].includes(
    valueAtPath(metadata, 'outputDisclosureBudget.level')
  )) {
    blockers.push('outputDisclosureBudget.level_must_be_allowed_low_disclosure_level');
  }
  requireEqual(blockers, metadata, 'outputDisclosureBudget.lowDisclosure', true);
  requireEqual(blockers, metadata, 'outputDisclosureBudget.rawOutput', false);
  requireIntegerInRange(blockers, metadata, 'outputDisclosureBudget.maxItems', 0, 5);
  requireIntegerInRange(blockers, metadata, 'outputDisclosureBudget.maxBytes', 0, 4096);
  requireEqual(blockers, metadata, 'outputDisclosureBudget.source', 'bridge_gate_normalized_governance');
  requireEqual(blockers, metadata, 'outputDisclosureBudget.bound', true);
  requireEqual(blockers, metadata, 'outputDisclosureBudget.toolArgumentsMayOverride', false);
  requireEqual(blockers, metadata, 'outputDisclosureBudget.governanceMetadataMayOverride', false);

  requireNonEmptyString(blockers, metadata, 'auditReceipt.receipt_id');
  requireEqual(blockers, metadata, 'auditReceipt.required', true);
  requireEqual(blockers, metadata, 'auditReceipt.lowDisclosure', true);
  requireEqual(blockers, metadata, 'auditReceipt.source', 'bridge_gate_normalized_governance');
  requireEqual(blockers, metadata, 'auditReceipt.toolArgumentsMayOverride', false);
  requireEqual(blockers, metadata, 'auditReceipt.governanceMetadataMayOverride', false);

  requireEqual(blockers, metadata, 'rollbackPosture.source', 'bridge_gate_normalized_governance');
  requireEqual(blockers, metadata, 'rollbackPosture.bound', true);
  requireEqual(blockers, metadata, 'rollbackPosture.toolArgumentsMayOverride', false);
  requireEqual(blockers, metadata, 'rollbackPosture.governanceMetadataMayOverride', false);
  requireEqual(blockers, metadata, 'rollbackPosture.automaticRollbackAppliedByBridge', false);
  if (readTool) {
    if (!['no_runtime_state_to_rollback', 'read_only_no_write'].includes(
      valueAtPath(metadata, 'rollbackPosture.mode')
    )) {
      blockers.push('rollbackPosture.mode_must_be_read_only_posture');
    }
  }
  if (writeTool) {
    if (!['bounded_rollback_plan', 'mutation_cleanup_plan'].includes(
      valueAtPath(metadata, 'rollbackPosture.mode')
    )) {
      blockers.push('rollbackPosture.mode_must_be_governed_write_posture');
    }
    requireNonEmptyString(blockers, metadata, 'rollbackPosture.rollback_plan_ref');
    requireEqual(blockers, metadata, 'rollbackPosture.applyRequiresGovernedFollowup', true);
  }

  requireEqual(blockers, metadata, 'governanceTransport.metadataPath', 'params._meta.codexMemoryGovernance');
  requireEqual(blockers, metadata, 'governanceTransport.toolArgumentsMayCarryGovernance', false);
  requireEqual(blockers, metadata, 'governanceTransport.trustedExecutionContextMustMatchTransportContext', true);
  requireEqual(blockers, metadata, 'governanceTransport.transportContextFieldsOverrideGovernanceMetadata', true);
  requireEqual(blockers, metadata, 'lowDisclosure', true);
  requireEqual(blockers, metadata, 'readinessClaimed', false);

  const accepted = blockers.length === 0;
  return {
    contractName: CONTRACT_NAME,
    contractVersion: `${CONTRACT_VERSION}_governed_mcp_native_governance_metadata_coverage`,
    accepted,
    decision: accepted
      ? 'governed_mcp_native_governance_metadata_covers_current_product_goal'
      : 'governed_mcp_native_governance_metadata_missing_current_product_goal_coverage',
    blockers,
    toolName: toolName || null,
    direction: readTool ? 'read' : writeTool ? 'write' : 'unknown',
    requiredGovernedDimensions: [...REQUIRED_GOVERNED_DIMENSIONS],
    requiredLocalMemoryRole: [...REQUIRED_LOCAL_MEMORY_ROLE],
    metadataPath: 'params._meta.codexMemoryGovernance',
    readinessClaimed: false
  };
}

function validateGovernedMcpOverviewStatusCoversCurrentProductGoal(status = {}) {
  const blockers = [];
  const overviewStatus = isPlainObject(status) ? status : {};
  const latest = isPlainObject(overviewStatus.latest) ? overviewStatus.latest : {};
  const toolName = normalizeString(latest.toolName);
  const readTool = REQUIRED_NATIVE_BRIDGE_READ_TOOLS.includes(toolName);
  const writeTool = REQUIRED_NATIVE_BRIDGE_WRITE_TOOLS.includes(toolName);

  requireEqual(blockers, overviewStatus, 'schemaVersion', 'governed_native_bridge_observation_status_v1');
  requireEqual(blockers, overviewStatus, 'available', true);
  requireEqual(blockers, overviewStatus, 'endpointDisclosed', false);
  requireEqual(blockers, overviewStatus, 'tokenMaterialDisclosed', false);
  requireEqual(blockers, overviewStatus, 'rawRequestBodyDisclosed', false);
  requireEqual(blockers, overviewStatus, 'rawResponseBodyDisclosed', false);
  requireEqual(blockers, overviewStatus, 'rawMemoryReturned', false);
  requireEqual(blockers, overviewStatus, 'readinessClaimed', false);
  if (!isPlainObject(overviewStatus.latest)) {
    blockers.push('latest_governed_native_bridge_observation_must_be_present');
  }

  requireEqual(blockers, latest, 'schemaVersion', 'governed_native_bridge_observation_summary_v1');
  requireEqual(blockers, latest, 'gateAccepted', true);
  requireEqual(blockers, latest, 'accessPath', REQUIRED_ACCESS_PATH);
  if (!REQUIRED_NATIVE_BRIDGE_TOOLS.includes(toolName)) {
    blockers.push('latest.toolName_must_be_current_product_goal_native_bridge_tool');
  }
  requireOneOf(
    blockers,
    latest,
    'clientId',
    REQUIRED_CLIENTS,
    'latest.clientId_must_be_governed_native_client'
  );
  if (!GOVERNED_NATIVE_VISIBILITIES.includes(valueAtPath(latest, 'visibility'))) {
    blockers.push('latest.visibility_must_be_governed_visibility');
  }
  requireEqual(blockers, latest, 'scopePresent', true);
  requireEqual(blockers, latest, 'scopeIdentifierPresent', true);
  requireEqual(blockers, latest, 'scopeIdentifierSafe', true);
  requireEqual(blockers, latest, 'scopeFingerprintPresent', true);
  requireEqual(blockers, latest, 'rawScopePersisted', false);
  requireEqual(blockers, latest, 'rawScopeValueReturned', false);
  if (!Array.isArray(latest.scopeFieldNames) || !latest.scopeFieldNames.includes('client_id') ||
      !latest.scopeFieldNames.includes('visibility')) {
    blockers.push('latest.scopeFieldNames_must_include_client_id_and_visibility');
  }
  if (!Array.isArray(latest.scopeIdentifierFieldNames) ||
      latest.scopeIdentifierFieldNames.length === 0) {
    blockers.push('latest.scopeIdentifierFieldNames_must_include_identifier');
  }

  requireEqual(blockers, latest, 'clientIdentitySource', 'trusted_execution_context_or_transport');
  requireEqual(blockers, latest, 'clientIdentityBound', true);
  requireEqual(blockers, latest, 'clientIdentityToolArgumentsMayOverride', false);
  requireEqual(blockers, latest, 'clientIdentityGovernanceMetadataMayOverride', false);
  requireEqual(blockers, latest, 'scopeBoundarySource', 'trusted_execution_context_or_transport');
  requireEqual(blockers, latest, 'scopeBoundaryBound', true);
  requireEqual(blockers, latest, 'scopeToolArgumentsMayOverride', false);
  requireEqual(blockers, latest, 'scopeGovernanceMetadataMayOverride', false);
  requireEqual(blockers, latest, 'visibilityBound', true);
  if (latest.trustedExecutionContextSupplied === true) {
    requireEqual(blockers, latest, 'trustedExecutionContextAccepted', true);
    requireEqual(blockers, latest, 'trustedExecutionContextScopeMatched', true);
  }

  requireEqual(blockers, latest, 'primaryRuntime', REQUIRED_PRIMARY_RUNTIME);
  requireEqual(blockers, latest, 'runtimeTargetConfigured', true);
  requireEqual(blockers, latest, 'runtimeTargetKind', 'mcp_server');
  requireEqual(blockers, latest, 'runtimeTargetSourceAuthority', 'bridge_runtime_or_static_config');
  requireEqual(blockers, latest, 'runtimeTargetForbiddenFieldCount', 0);
  requireEqual(blockers, latest, 'runtimeTargetBound', true);
  requireEqual(blockers, latest, 'runtimeTargetToolArgumentsMayOverride', false);
  requireEqual(blockers, latest, 'runtimeTargetGovernanceMetadataMayOverride', false);
  requireNonEmptyString(blockers, latest, 'targetReferenceName');
  requireEqual(blockers, latest, 'runtimeTargetLocatorDisclosed', false);
  requireEqual(blockers, latest, 'runtimeTargetEndpointDisclosed', false);
  requireEqual(blockers, latest, 'runtimeTargetTokenMaterialDisclosed', false);

  requireEqual(blockers, latest, 'invocationProfileSource', 'bridge_tool_binding');
  requireEqual(blockers, latest, 'invocationProfileBound', true);
  requireEqual(blockers, latest, 'invocationProfileToolArgumentsMayOverride', false);
  requireEqual(blockers, latest, 'invocationProfileGovernanceMetadataMayOverride', false);
  requireEqual(blockers, latest, 'invocationProfileForbiddenFieldCount', 0);
  requireEqual(blockers, latest, 'readWriteAuthoritySource', 'bridge_tool_binding');
  requireEqual(blockers, latest, 'readWriteAuthorityBound', true);
  requireEqual(blockers, latest, 'readWriteAuthorityForbiddenFieldCount', 0);
  requireEqual(blockers, latest, 'mixedReadWriteAllowed', false);
  requireEqual(blockers, latest, 'unboundedWriteAllowed', false);
  if (readTool) {
    requireEqual(blockers, latest, 'invocationProfile', 'governed_read_only');
    requireEqual(blockers, latest, 'readAllowed', true);
    requireEqual(blockers, latest, 'writeAllowed', false);
    requireEqual(blockers, latest, 'writeRequiresExactApproval', false);
  }
  if (writeTool) {
    requireEqual(blockers, latest, 'invocationProfile', 'governed_bounded_write');
    requireEqual(blockers, latest, 'readAllowed', false);
    requireEqual(blockers, latest, 'writeAllowed', true);
    requireEqual(blockers, latest, 'writeRequiresExactApproval', true);
    requireEqual(
      blockers,
      latest,
      'exactApprovalAction',
      REQUIRED_NATIVE_BRIDGE_WRITE_EXACT_APPROVAL_ACTIONS[toolName]
    );
    requireEqual(blockers, latest, 'exactApprovalActionMatched', true);
    requireEqual(blockers, latest, 'exactApprovalScopeMatched', true);
    requireEqual(blockers, latest, 'exactApprovalRuntimeTargetMatched', true);
    requireEqual(blockers, latest, 'exactApprovalRollbackPlanMatched', true);
    requireEqual(blockers, latest, 'exactApprovalForbiddenFieldCount', 0);
  }

  requireEqual(blockers, latest, 'outputDisclosureBudgetSource', 'bridge_gate_normalized_governance');
  requireEqual(blockers, latest, 'outputDisclosureBudgetBound', true);
  requireEqual(blockers, latest, 'outputDisclosureBudgetToolArgumentsMayOverride', false);
  requireEqual(blockers, latest, 'outputDisclosureBudgetGovernanceMetadataMayOverride', false);
  requireIntegerInRange(blockers, latest, 'disclosureMaxItems', 0, 5);
  requireIntegerInRange(blockers, latest, 'disclosureMaxBytes', 0, 4096);
  requireEqual(blockers, latest, 'disclosureForbiddenFieldCount', 0);
  requireEqual(blockers, latest, 'rawOutputAllowed', false);

  requireEqual(blockers, latest, 'auditReceiptSource', 'bridge_gate_normalized_governance');
  requireEqual(blockers, latest, 'auditReceiptLowDisclosure', true);
  requireEqual(blockers, latest, 'auditReceiptLowDisclosureBound', true);
  requireEqual(blockers, latest, 'auditReceiptToolArgumentsMayOverride', false);
  requireEqual(blockers, latest, 'auditReceiptGovernanceMetadataMayOverride', false);
  requireEqual(blockers, latest, 'auditReceiptReferencePresent', true);
  requireEqual(blockers, latest, 'auditReceiptReferenceSafe', true);
  requireNonEmptyString(blockers, latest, 'auditReceiptReferenceName');
  requireEqual(blockers, latest, 'auditReceiptForbiddenFieldCount', 0);
  const nativeDelegationAttempted = latest.readDelegationAttempted === true ||
    latest.writeDelegationAttempted === true;
  const delegationStatusClass = valueAtPath(latest, 'delegationStatusClass');
  if (nativeDelegationAttempted) {
    requireEqual(blockers, latest, 'bridgeAuditReceiptRequired', true);
    if (delegationStatusClass === 'audit_receipt_not_appended') {
      requireEqual(blockers, latest, 'bridgeAuditReceiptAppended', false);
      requireEqual(blockers, latest, 'bridgeAuditReceiptStatus', 'not_appended');
    } else {
      requireEqual(blockers, latest, 'bridgeAuditReceiptAppended', true);
      requireEqual(blockers, latest, 'bridgeAuditReceiptStatus', 'appended');
      requireEqual(blockers, latest, 'bridgeReceiptLowDisclosure', true);
    }
  }

  requireEqual(blockers, latest, 'localMemoryRole', 'not_used');
  requireEqual(blockers, latest, 'localMemorySourceRuntime', null);
  requireEqual(blockers, latest, 'localMemoryPrimaryRuntime', false);
  requireEqual(blockers, latest, 'localMemoryFallbackUsed', false);
  requireEqual(blockers, latest, 'localMemoryResultReturned', false);
  requireEqual(blockers, latest, 'localMemoryResultCanBeMistakenForVcpNative', false);
  requireEqual(blockers, latest, 'localMemoryRawContentDisclosed', false);
  requireEqual(blockers, latest, 'endpointDisclosed', false);
  requireEqual(blockers, latest, 'tokenMaterialDisclosed', false);
  requireEqual(blockers, latest, 'rawRequestBodyDisclosed', false);
  requireEqual(blockers, latest, 'rawResponseBodyDisclosed', false);
  requireEqual(blockers, latest, 'rawMemoryReturned', false);
  if (latest.nativeInvocationReceiptBindingMatched === true) {
    requireEqual(blockers, latest, 'nativeInvocationGovernanceMetadataSent', true);
    requireEqual(
      blockers,
      latest,
      'nativeInvocationGovernanceMetadataPath',
      'params._meta.codexMemoryGovernance'
    );
    requireEqual(blockers, latest, 'nativeInvocationGovernanceMetadataRawValueDisclosed', false);
  }
  if (nativeDelegationAttempted &&
      ['success', 'output_budget_exceeded', 'audit_receipt_not_appended'].includes(delegationStatusClass)) {
    requireNativeInvocationExecutionBound(blockers, latest, toolName);
  }
  requireEqual(blockers, latest, 'readinessClaimed', false);

  requireEqual(blockers, latest, 'rollbackPostureSource', 'bridge_gate_normalized_governance');
  requireEqual(blockers, latest, 'rollbackPostureForbiddenFieldCount', 0);
  requireEqual(blockers, latest, 'rollbackPostureBound', true);
  requireEqual(blockers, latest, 'rollbackPostureToolArgumentsMayOverride', false);
  requireEqual(blockers, latest, 'rollbackPostureGovernanceMetadataMayOverride', false);
  requireEqual(blockers, latest, 'rollbackApplyAttempted', false);
  requireEqual(blockers, latest, 'rollbackAutoApplyAllowed', false);
  requireEqual(blockers, latest, 'rollbackRawPlanDisclosed', false);
  requireEqual(blockers, latest, 'rollbackRawPlanPersisted', false);
  if (readTool) {
    if (!['no_runtime_state_to_rollback', 'read_only_no_write'].includes(
      valueAtPath(latest, 'rollbackPosture')
    )) {
      blockers.push('latest.rollbackPosture_must_be_read_only_posture');
    }
    requireEqual(blockers, latest, 'rollbackPlanReferencePresent', false);
    requireEqual(blockers, latest, 'rollbackPlanShapeOnly', false);
  }
  if (writeTool) {
    if (!['bounded_rollback_plan', 'mutation_cleanup_plan'].includes(
      valueAtPath(latest, 'rollbackPosture')
    )) {
      blockers.push('latest.rollbackPosture_must_be_governed_write_posture');
    }
    requireEqual(blockers, latest, 'rollbackPlanReferencePresent', true);
    requireEqual(blockers, latest, 'rollbackPlanReferenceSafe', true);
    requireEqual(blockers, latest, 'rollbackPlanBound', true);
    requireEqual(blockers, latest, 'rollbackPlanShapeOnly', true);
    validateWritePostCommitRollbackEvidence(
      blockers,
      latest,
      valueAtPath(latest, 'delegationStatusClass')
    );
  }

  const accepted = blockers.length === 0;
  return {
    contractName: CONTRACT_NAME,
    contractVersion: `${CONTRACT_VERSION}_governed_mcp_overview_status_coverage`,
    accepted,
    decision: accepted
      ? 'governed_mcp_overview_status_covers_current_product_goal'
      : 'governed_mcp_overview_status_missing_current_product_goal_coverage',
    blockers,
    toolName: toolName || null,
    direction: readTool ? 'read' : writeTool ? 'write' : 'unknown',
    requiredGovernedDimensions: [...REQUIRED_GOVERNED_DIMENSIONS],
    requiredLocalMemoryRole: [...REQUIRED_LOCAL_MEMORY_ROLE],
    readinessClaimed: false
  };
}

function validateGovernedMcpNativeBridgeReceiptCoversCurrentProductGoal(receipt = {}) {
  const blockers = [];
  const item = isPlainObject(receipt) ? receipt : {};
  const toolName = normalizeString(item.toolName);
  const readTool = REQUIRED_NATIVE_BRIDGE_READ_TOOLS.includes(toolName);
  const writeTool = REQUIRED_NATIVE_BRIDGE_WRITE_TOOLS.includes(toolName);

  if (!REQUIRED_NATIVE_BRIDGE_TOOLS.includes(toolName)) {
    blockers.push('toolName_must_be_current_product_goal_native_bridge_tool');
  }
  requireEqual(blockers, item, 'primaryRuntime', REQUIRED_PRIMARY_RUNTIME);
  requireEqual(blockers, item, 'clientIdentitySource', 'trusted_execution_context_or_transport');
  requireEqual(blockers, item, 'clientIdentityBound', true);
  requireEqual(blockers, item, 'clientIdentityToolArgumentsMayOverride', false);
  requireEqual(blockers, item, 'clientIdentityGovernanceMetadataMayOverride', false);

  requireEqual(blockers, item, 'scopeBoundarySource', 'trusted_execution_context_or_transport');
  requireEqual(blockers, item, 'scopeBoundaryBound', true);
  requireEqual(blockers, item, 'scopeToolArgumentsMayOverride', false);
  requireEqual(blockers, item, 'scopeGovernanceMetadataMayOverride', false);
  requireEqual(blockers, item, 'visibilityBound', true);
  requireEqual(blockers, item, 'rawScopeValueReturned', false);

  requireEqual(blockers, item, 'runtimeTargetBound', true);
  requireEqual(blockers, item, 'runtimeTargetToolArgumentsMayOverride', false);
  requireEqual(blockers, item, 'runtimeTargetGovernanceMetadataMayOverride', false);

  requireEqual(blockers, item, 'invocationProfileSource', 'bridge_tool_binding');
  requireEqual(blockers, item, 'invocationProfileBound', true);
  requireEqual(blockers, item, 'invocationProfileToolArgumentsMayOverride', false);
  requireEqual(blockers, item, 'invocationProfileGovernanceMetadataMayOverride', false);

  if (readTool) {
    requireEqual(blockers, item, 'invocationProfile', 'governed_read_only');
    requireEqual(blockers, item, 'readAllowed', true);
    requireEqual(blockers, item, 'writeAllowed', false);
    requireEqual(blockers, item, 'writeRequiresExactApproval', false);
  }
  if (writeTool) {
    requireEqual(blockers, item, 'invocationProfile', 'governed_bounded_write');
    requireEqual(blockers, item, 'readAllowed', false);
    requireEqual(blockers, item, 'writeAllowed', true);
    requireEqual(blockers, item, 'writeRequiresExactApproval', true);
    requireEqual(blockers, item, 'writePolicy', 'exact_approval');
    requireEqual(
      blockers,
      item,
      'exactApprovalAction',
      REQUIRED_NATIVE_BRIDGE_WRITE_EXACT_APPROVAL_ACTIONS[toolName]
    );
    requireEqual(blockers, item, 'exactApprovalActionMatched', true);
    requireEqual(blockers, item, 'exactApprovalScopeMatched', true);
    requireEqual(blockers, item, 'exactApprovalRuntimeTargetMatched', true);
    requireEqual(blockers, item, 'exactApprovalRollbackPlanMatched', true);
  }

  requireEqual(blockers, item, 'readWriteAuthoritySource', 'bridge_tool_binding');
  requireEqual(blockers, item, 'readWriteAuthorityBound', true);
  requireEqual(blockers, item, 'mixedReadWriteAllowed', false);
  requireEqual(blockers, item, 'unboundedWriteAllowed', false);

  requireEqual(blockers, item, 'outputDisclosureBudgetSource', 'bridge_gate_normalized_governance');
  requireEqual(blockers, item, 'outputDisclosureBudgetBound', true);
  requireEqual(blockers, item, 'outputDisclosureBudgetToolArgumentsMayOverride', false);
  requireEqual(blockers, item, 'outputDisclosureBudgetGovernanceMetadataMayOverride', false);
  requireEqual(blockers, item, 'rawOutputAllowed', false);

  requireEqual(blockers, item, 'auditReceiptSource', 'bridge_gate_normalized_governance');
  requireEqual(blockers, item, 'auditReceiptLowDisclosureBound', true);
  requireEqual(blockers, item, 'auditReceiptToolArgumentsMayOverride', false);
  requireEqual(blockers, item, 'auditReceiptGovernanceMetadataMayOverride', false);

  requireEqual(blockers, item, 'rollbackPostureSource', 'bridge_gate_normalized_governance');
  requireEqual(blockers, item, 'rollbackPostureBound', true);
  requireEqual(blockers, item, 'rollbackPostureToolArgumentsMayOverride', false);
  requireEqual(blockers, item, 'rollbackPostureGovernanceMetadataMayOverride', false);
  requireEqual(blockers, item, 'rollbackApplyAttempted', false);
  requireEqual(blockers, item, 'rollbackAutoApplyAllowed', false);
  requireEqual(blockers, item, 'rollbackRawPlanDisclosed', false);
  requireEqual(blockers, item, 'rollbackRawPlanPersisted', false);
  if (readTool) {
    if (!['no_runtime_state_to_rollback', 'read_only_no_write'].includes(
      valueAtPath(item, 'rollbackPosture')
    )) {
      blockers.push('rollbackPosture_must_be_read_only_posture');
    }
    requireEqual(blockers, item, 'rollbackPlanReferencePresent', false);
    requireEqual(blockers, item, 'rollbackPlanBound', false);
    requireEqual(blockers, item, 'rollbackPlanShapeOnly', false);
    requireEqual(blockers, item, 'rollbackRequired', false);
    requireEqual(blockers, item, 'rollbackReasonCode', null);
    requireEqual(blockers, item, 'rollbackDisposition', 'no_runtime_write_to_rollback');
    requireEqual(blockers, item, 'rollbackFollowupRequired', false);
    requireEqual(blockers, item, 'rollbackApplyPolicy', 'not_applicable');
  }
  if (writeTool) {
    if (!['bounded_rollback_plan', 'mutation_cleanup_plan'].includes(
      valueAtPath(item, 'rollbackPosture')
    )) {
      blockers.push('rollbackPosture_must_be_governed_write_posture');
    }
    requireEqual(blockers, item, 'rollbackPlanReferencePresent', true);
    requireEqual(blockers, item, 'rollbackPlanReferenceSafe', true);
    requireEqual(blockers, item, 'rollbackPlanBound', true);
    requireEqual(blockers, item, 'rollbackPlanShapeOnly', true);
    validateWritePostCommitRollbackEvidence(
      blockers,
      item,
      valueAtPath(item, 'statusClass')
    );
  }

  requireEqual(blockers, item, 'localMemoryRole', 'not_used');
  requireEqual(blockers, item, 'localMemorySourceRuntime', null);
  requireEqual(blockers, item, 'localMemoryPrimaryRuntime', false);
  requireEqual(blockers, item, 'localMemoryFallbackUsed', false);
  requireEqual(blockers, item, 'localMemoryResultReturned', false);
  requireEqual(blockers, item, 'localMemoryResultCanBeMistakenForVcpNative', false);
  requireEqual(blockers, item, 'localMemoryRawContentDisclosed', false);

  requireEqual(blockers, item, 'rawRequestBodyPersisted', false);
  requireEqual(blockers, item, 'rawResponseBodyPersisted', false);
  requireEqual(blockers, item, 'tokenMaterialDisclosed', false);
  const nativeInvocationReceiptPresent = isPlainObject(item.nativeInvocationReceipt) ||
    item.nativeInvocationAttempted === true ||
    item.nativeMcpToolInvocationAttempted === true ||
    item.nativeInvocationReceiptBindingMatched === true ||
    item.nativeInvocationGovernanceMetadataSent === true ||
    normalizeString(item.nativeInvocationGovernanceMetadataPath) !== '' ||
    item.nativeInvocationGovernanceMetadataRawValueDisclosed === true;
  if (nativeInvocationReceiptPresent) {
    const governanceMetadataSent = item.nativeInvocationGovernanceMetadataSent === true ||
      valueAtPath(item, 'nativeInvocationReceipt.governanceMetadataSent') === true;
    const governanceMetadataPath = normalizeString(item.nativeInvocationGovernanceMetadataPath) ||
      normalizeString(valueAtPath(item, 'nativeInvocationReceipt.governanceMetadataPath'));
    const governanceMetadataRawValueDisclosed =
      item.nativeInvocationGovernanceMetadataRawValueDisclosed === true ||
      valueAtPath(item, 'nativeInvocationReceipt.governanceMetadataRawValueDisclosed') === true;
    if (governanceMetadataSent !== true) {
      blockers.push('native_invocation_governance_metadata_must_be_sent');
    }
    if (governanceMetadataPath !== 'params._meta.codexMemoryGovernance') {
      blockers.push('native_invocation_governance_metadata_path_must_be_params_meta');
    }
    if (governanceMetadataRawValueDisclosed !== false) {
      blockers.push('native_invocation_governance_metadata_raw_value_must_not_be_disclosed');
    }
  }
  const bridgeReceiptStatusClass = firstDefined(
    valueAtPath(item, 'statusClass'),
    valueAtPath(item, 'delegationStatusClass')
  );
  if (['success', 'output_budget_exceeded', 'audit_receipt_not_appended'].includes(bridgeReceiptStatusClass)) {
    requireNativeInvocationExecutionBound(blockers, item, toolName);
  }
  requireEqual(blockers, item, 'readinessClaimed', false);

  const accepted = blockers.length === 0;
  return {
    contractName: CONTRACT_NAME,
    contractVersion: `${CONTRACT_VERSION}_governed_mcp_native_bridge_receipt_coverage`,
    accepted,
    decision: accepted
      ? 'governed_mcp_native_bridge_receipt_covers_current_product_goal'
      : 'governed_mcp_native_bridge_receipt_missing_current_product_goal_coverage',
    blockers,
    toolName: toolName || null,
    direction: readTool ? 'read' : writeTool ? 'write' : 'unknown',
    requiredGovernedDimensions: [...REQUIRED_GOVERNED_DIMENSIONS],
    requiredLocalMemoryRole: [...REQUIRED_LOCAL_MEMORY_ROLE]
  };
}

function validateGovernedMcpReadFallbackReceiptCoversLocalMemoryRole(receipt = {}) {
  const blockers = [];
  const item = isPlainObject(receipt) ? receipt : {};
  const toolName = normalizeString(item.toolName);
  const fallbackReasonCode = normalizeString(item.fallbackReasonCode);
  const nativeStatusClass = normalizeString(item.nativeStatusClass);
  const allowedFallbackReasonCodes = [
    'native_read_delegation_transport_error',
    'native_read_delegation_client_error',
    'native_read_delegation_server_error'
  ];
  const expectedNativeStatusClass = fallbackReasonCode.startsWith('native_read_delegation_')
    ? fallbackReasonCode.slice('native_read_delegation_'.length)
    : '';

  if (!REQUIRED_NATIVE_BRIDGE_READ_TOOLS.includes(toolName)) {
    blockers.push('toolName_must_be_current_product_goal_native_read_bridge_tool');
  }
  requireEqual(blockers, item, 'primaryRuntime', REQUIRED_PRIMARY_RUNTIME);
  requireEqual(blockers, item, 'delegationDirection', 'read');
  requireEqual(blockers, item, 'localMemoryRole', 'fallback');
  requireEqual(blockers, item, 'localMemorySourceRuntime', 'codex_memory_local_fallback');
  requireEqual(blockers, item, 'localMemoryFallbackAuthorized', true);
  if (!allowedFallbackReasonCodes.includes(fallbackReasonCode)) {
    blockers.push('fallbackReasonCode_must_be_governed_native_read_failure');
  }
  if (nativeStatusClass !== expectedNativeStatusClass) {
    blockers.push('nativeStatusClass_must_match_fallbackReasonCode');
  }
  requireEqual(blockers, item, 'fallbackRequiresAuditReceipt', true);
  requireEqual(blockers, item, 'fallbackAfterAuditReceiptAppended', true);
  requireEqual(blockers, item, 'bridgeAuditReceiptStatus', 'appended');
  requireEqual(blockers, item, 'bridgeAuditReceiptAppended', true);
  requireEqual(blockers, item, 'nativeRuntimeCalled', true);
  requireEqual(blockers, item, 'nativeMcpToolCalled', true);
  requireEqual(blockers, item, 'nativeInvocationAttempted', true);
  requireEqual(blockers, item, 'nativeMcpToolInvocationAttempted', true);
  requireEqual(blockers, item, 'nativeMemoryReadPerformed', false);
  requireEqual(blockers, item, 'vcpNativeResult', false);
  requireEqual(blockers, item, 'resultCanBeMistakenForVcpNative', false);
  requireEqual(blockers, item, 'lowDisclosure', true);
  requireEqual(blockers, item, 'fallbackReceiptLowDisclosure', true);
  requireEqual(blockers, item, 'rawScopePersisted', false);
  requireEqual(blockers, item, 'rawNativeOutputReturned', false);
  requireEqual(blockers, item, 'rawNativeMemoryReturned', false);
  requireEqual(blockers, item, 'rawFallbackMemoryPersisted', false);
  requireEqual(blockers, item, 'rawFallbackMemoryReturned', false);
  requireEqual(blockers, item, 'tokenMaterialDisclosed', false);
  requireEqual(blockers, item, 'endpointDisclosed', false);
  requireEqual(blockers, item, 'memoryContentDisclosed', false);
  requireEqual(blockers, item, 'memoryIdsDisclosed', false);
  requireEqual(blockers, item, 'nativeFieldNamesDisclosed', false);
  requireEqual(blockers, item, 'readinessClaimed', false);

  const accepted = blockers.length === 0;
  return {
    contractName: CONTRACT_NAME,
    contractVersion: `${CONTRACT_VERSION}_governed_mcp_read_fallback_receipt_coverage`,
    accepted,
    decision: accepted
      ? 'governed_mcp_read_fallback_receipt_covers_local_memory_auxiliary_role'
      : 'governed_mcp_read_fallback_receipt_missing_local_memory_auxiliary_role_coverage',
    blockers,
    toolName: toolName || null,
    requiredLocalMemoryRole: [...REQUIRED_LOCAL_MEMORY_ROLE],
    vcpNativeResult: false,
    resultCanBeMistakenForVcpNative: false,
    readinessClaimed: false
  };
}

function validateGovernedMcpReadFallbackToolResultCoversLocalMemoryRole(result = {}) {
  const blockers = [];
  const item = isPlainObject(result) ? result : {};
  const access = isPlainObject(item.access) ? item.access : {};
  const fallback = isPlainObject(item.governedNativeReadFallback)
    ? item.governedNativeReadFallback
    : {};
  const localFallbackAuditReceipt = isPlainObject(fallback.localFallbackAuditReceipt)
    ? fallback.localFallbackAuditReceipt
    : {};
  const allowedFallbackReasonCodes = [
    'native_read_delegation_transport_error',
    'native_read_delegation_client_error',
    'native_read_delegation_server_error'
  ];
  const fallbackReasonCode = normalizeString(fallback.reasonCode);
  const accessFallbackReasonCode = normalizeString(access.localMemoryFallbackReasonCode);
  const nativeStatusClass = normalizeString(fallback.nativeStatusClass);
  const expectedNativeStatusClass = fallbackReasonCode.startsWith('native_read_delegation_')
    ? fallbackReasonCode.slice('native_read_delegation_'.length)
    : '';

  requireEqual(blockers, access, 'primaryRuntime', REQUIRED_PRIMARY_RUNTIME);
  requireEqual(blockers, access, 'localMemoryRole', 'fallback');
  requireEqual(blockers, access, 'localMemorySourceRuntime', 'codex_memory_local_fallback');
  requireEqual(blockers, access, 'localMemoryFallbackAttempted', true);
  requireEqual(blockers, access, 'localMemoryFallbackUsed', true);
  requireEqual(blockers, access, 'localMemoryFallbackReadPerformed', true);
  requireEqual(blockers, access, 'localMemoryFallbackReturned', true);
  requireNonEmptyString(blockers, access, 'localMemoryFallbackReasonCode');
  if (accessFallbackReasonCode !== fallbackReasonCode) {
    blockers.push('access.localMemoryFallbackReasonCode_must_match_fallback.reasonCode');
  }
  requireEqual(blockers, access, 'vcpNativeResult', false);
  requireEqual(blockers, access, 'resultCanBeMistakenForVcpNative', false);
  requireEqual(blockers, access, 'fallbackRequiresAuditReceipt', true);
  requireEqual(blockers, access, 'fallbackAfterAuditReceiptAppended', true);
  requireEqual(blockers, access, 'localFallbackAuditReceiptStatus', 'appended');
  requireEqual(blockers, access, 'lowDisclosure', true);
  requireEqual(blockers, access, 'rawOutputReturned', false);
  requireEqual(blockers, access, 'rawMemoryReturned', false);
  requireEqual(blockers, access, 'rawNativeOutputReturned', false);
  requireEqual(blockers, access, 'rawNativeMemoryReturned', false);
  requireEqual(blockers, access, 'tokenMaterialReturned', false);
  requireEqual(blockers, access, 'endpointReturned', false);
  requireEqual(blockers, access, 'readinessClaimed', false);

  if (!isPlainObject(item.governedNativeReadFallback)) {
    blockers.push('governedNativeReadFallback_must_be_present');
  }
  requireEqual(blockers, fallback, 'used', true);
  requireEqual(blockers, fallback, 'primaryRuntime', REQUIRED_PRIMARY_RUNTIME);
  requireEqual(blockers, fallback, 'localMemoryRole', 'fallback');
  requireEqual(blockers, fallback, 'localMemorySourceRuntime', 'codex_memory_local_fallback');
  requireEqual(blockers, fallback, 'localMemoryFallbackAttempted', true);
  requireEqual(blockers, fallback, 'localMemoryFallbackReadPerformed', true);
  requireEqual(blockers, fallback, 'localMemoryFallbackReturned', true);
  requireNonEmptyString(blockers, fallback, 'reasonCode');
  if (!allowedFallbackReasonCodes.includes(fallbackReasonCode)) {
    blockers.push('governedNativeReadFallback.reasonCode_must_be_governed_native_read_failure');
  }
  requireEqual(blockers, fallback, 'fallbackRequiresAuditReceipt', true);
  requireEqual(blockers, fallback, 'fallbackAfterAuditReceiptAppended', true);
  requireEqual(blockers, fallback, 'vcpNativeResult', false);
  requireEqual(blockers, fallback, 'resultCanBeMistakenForVcpNative', false);
  requireEqual(blockers, fallback, 'nativeRuntimeCalled', true);
  requireEqual(blockers, fallback, 'nativeMcpToolCalled', true);
  requireEqual(blockers, fallback, 'nativeInvocationAttempted', true);
  requireEqual(blockers, fallback, 'nativeMcpToolInvocationAttempted', true);
  if (nativeStatusClass !== expectedNativeStatusClass) {
    blockers.push('governedNativeReadFallback.nativeStatusClass_must_match_reasonCode');
  }
  requireEqual(blockers, fallback, 'nativeMemoryReadPerformed', false);
  requireEqual(blockers, fallback, 'rawNativeOutputReturned', false);
  requireEqual(blockers, fallback, 'rawNativeMemoryReturned', false);
  requireEqual(blockers, fallback, 'tokenMaterialReturned', false);
  requireEqual(blockers, fallback, 'endpointReturned', false);
  requireEqual(blockers, fallback, 'readinessClaimed', false);

  if (!isPlainObject(fallback.localFallbackAuditReceipt)) {
    blockers.push('governedNativeReadFallback.localFallbackAuditReceipt_must_be_present');
  }
  requireEqual(blockers, localFallbackAuditReceipt, 'appended', true);
  requireEqual(blockers, localFallbackAuditReceipt, 'status', 'appended');
  requireEqual(blockers, localFallbackAuditReceipt, 'authorized', true);
  requireEqual(blockers, localFallbackAuditReceipt, 'lowDisclosure', true);
  requireEqual(blockers, localFallbackAuditReceipt, 'rawPayloadPersisted', false);
  requireEqual(blockers, localFallbackAuditReceipt, 'tokenMaterialPersisted', false);

  if (isPlainObject(item.governedNativeBridge)) {
    const bridgeStatusCoverage =
      validateGovernedMcpOverviewStatusCoversCurrentProductGoal(item.governedNativeBridge);
    for (const blocker of bridgeStatusCoverage.blockers) {
      blockers.push(`governedNativeBridge.${blocker}`);
    }
  }

  const accepted = blockers.length === 0;
  return {
    contractName: CONTRACT_NAME,
    contractVersion: `${CONTRACT_VERSION}_governed_mcp_read_fallback_tool_result_coverage`,
    accepted,
    decision: accepted
      ? 'governed_mcp_read_fallback_tool_result_covers_local_memory_auxiliary_role'
      : 'governed_mcp_read_fallback_tool_result_missing_local_memory_auxiliary_role_coverage',
    blockers,
    requiredLocalMemoryRole: [...REQUIRED_LOCAL_MEMORY_ROLE],
    vcpNativeResult: false,
    resultCanBeMistakenForVcpNative: false,
    readinessClaimed: false
  };
}

function validateGovernedMcpAuditMemoryBridgeFindingCoversCurrentProductGoal(finding = {}) {
  const blockers = [];
  const item = isPlainObject(finding) ? finding : {};
  const receipt = isPlainObject(item.governedNativeBridgeReceipt)
    ? item.governedNativeBridgeReceipt
    : null;

  requireEqual(blockers, item, 'auditFamily', 'governance');
  requireEqual(blockers, item, 'decision', 'visible');
  requireEqual(blockers, item, 'reasonCode', 'governed_native_bridge_audit_receipt');
  requireEqual(blockers, item, 'lifecyclePolicy', 'bridge_receipt_retained_low_disclosure');
  if (!receipt) {
    blockers.push('governedNativeBridgeReceipt_must_be_present');
  } else {
    requireEqual(
      blockers,
      item,
      'governedNativeBridgeReceipt.schemaVersion',
      'governed_native_bridge_audit_memory_projection_v1'
    );
    const receiptCoverage = validateGovernedMcpNativeBridgeReceiptCoversCurrentProductGoal(receipt);
    for (const blocker of receiptCoverage.blockers) {
      blockers.push(`governedNativeBridgeReceipt.${blocker}`);
    }
  }

  const accepted = blockers.length === 0;
  return {
    contractName: CONTRACT_NAME,
    contractVersion: `${CONTRACT_VERSION}_audit_memory_bridge_finding_coverage`,
    accepted,
    decision: accepted
      ? 'audit_memory_bridge_finding_covers_current_product_goal'
      : 'audit_memory_bridge_finding_missing_current_product_goal_coverage',
    blockers,
    requiredGovernedDimensions: [...REQUIRED_GOVERNED_DIMENSIONS],
    requiredLocalMemoryRole: [...REQUIRED_LOCAL_MEMORY_ROLE],
    readinessClaimed: false
  };
}

function validateGovernedMcpAuditMemoryReadFallbackFindingCoversLocalMemoryRole(finding = {}) {
  const blockers = [];
  const item = isPlainObject(finding) ? finding : {};
  const receipt = isPlainObject(item.governedNativeReadFallbackReceipt)
    ? item.governedNativeReadFallbackReceipt
    : null;

  requireEqual(blockers, item, 'auditFamily', 'governance');
  requireEqual(blockers, item, 'decision', 'visible');
  requireEqual(blockers, item, 'reasonCode', 'governed_native_read_fallback_audit_receipt');
  requireEqual(blockers, item, 'lifecyclePolicy', 'local_fallback_receipt_retained_low_disclosure');
  if (!receipt) {
    blockers.push('governedNativeReadFallbackReceipt_must_be_present');
  } else {
    requireEqual(
      blockers,
      item,
      'governedNativeReadFallbackReceipt.schemaVersion',
      'governed_native_read_fallback_audit_memory_projection_v1'
    );
    const receiptCoverage = validateGovernedMcpReadFallbackReceiptCoversLocalMemoryRole(receipt);
    for (const blocker of receiptCoverage.blockers) {
      blockers.push(`governedNativeReadFallbackReceipt.${blocker}`);
    }
  }

  const accepted = blockers.length === 0;
  return {
    contractName: CONTRACT_NAME,
    contractVersion: `${CONTRACT_VERSION}_audit_memory_read_fallback_finding_coverage`,
    accepted,
    decision: accepted
      ? 'audit_memory_read_fallback_finding_covers_local_memory_auxiliary_role'
      : 'audit_memory_read_fallback_finding_missing_local_memory_auxiliary_role_coverage',
    blockers,
    requiredLocalMemoryRole: [...REQUIRED_LOCAL_MEMORY_ROLE],
    vcpNativeResult: false,
    resultCanBeMistakenForVcpNative: false,
    readinessClaimed: false
  };
}

module.exports = {
  CONTRACT_NAME,
  CONTRACT_VERSION,
  REQUIRED_ACCESS_PATH,
  REQUIRED_CLIENTS,
  REQUIRED_GOVERNED_DIMENSIONS,
  REQUIRED_LOCAL_MEMORY_ROLE,
  REQUIRED_BRIDGE_GATE_REQUEST_DIMENSIONS,
  REQUIRED_NATIVE_BRIDGE_TOOLS,
  REQUIRED_NATIVE_BRIDGE_READ_TOOLS,
  REQUIRED_NATIVE_BRIDGE_WRITE_TOOLS,
  REQUIRED_NATIVE_BRIDGE_WRITE_EXACT_APPROVAL_ACTIONS,
  REQUIRED_PRIMARY_RUNTIME,
  REQUIRED_PRIMARY_VALUE,
  SIDE_EFFECT_COUNTERS,
  validateGovernedMcpBridgeGateResultCoversCurrentProductGoal,
  validateGovernedMcpMetadataCoversCurrentProductGoal,
  validateGovernedMcpAuditMemoryBridgeFindingCoversCurrentProductGoal,
  validateGovernedMcpAuditMemoryReadFallbackFindingCoversLocalMemoryRole,
  validateGovernedMcpNativeDelegatedArgumentsCoversCurrentProductGoal,
  validateGovernedMcpNativeGovernanceMetadataCoversCurrentProductGoal,
  validateGovernedMcpNativeBridgeReceiptCoversCurrentProductGoal,
  validateGovernedMcpOverviewStatusCoversCurrentProductGoal,
  validateGovernedMcpReadFallbackReceiptCoversLocalMemoryRole,
  validateGovernedMcpReadFallbackToolResultCoversLocalMemoryRole,
  validateGovernedMcpServerMetadataCoversCurrentProductGoal,
  validateGovernedMcpToolsListCoversCurrentProductGoal,
  validateCurrentProductGoalContract
};
