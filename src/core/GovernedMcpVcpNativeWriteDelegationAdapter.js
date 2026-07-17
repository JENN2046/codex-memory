'use strict';

const crypto = require('node:crypto');

const {
  REQUIRED_ACCESS_PATH,
  REQUIRED_PRIMARY_RUNTIME
} = require('./CurrentProductGoalContract');
const {
  SOURCE_AUTHORITY
} = require('./GovernedMcpVcpNativeRuntimeTargetConfig');
const {
  isSafeReferenceName
} = require('./VcpToolBoxSafeReference');
const {
  GOVERNED_NATIVE_CLIENTS,
  GOVERNED_NATIVE_VISIBILITIES,
  canonicalGovernedNativeClient
} = require('./MemoryAccessContract');

const CONTRACT_NAME = 'GovernedMcpVcpNativeWriteDelegationAdapter';
const CONTRACT_MODE = 'governed_mcp_vcp_native_primary_write_low_disclosure_delegation';
const DELEGATABLE_WRITE_TOOLS = Object.freeze([
  'record_memory',
  'tombstone_memory',
  'supersede_memory'
]);
const WRITE_TOOL_EXACT_APPROVAL_ACTIONS = Object.freeze({
  record_memory: 'live_bridge_record_memory_proof',
  tombstone_memory: 'live_bridge_tombstone_memory_proof',
  supersede_memory: 'live_bridge_supersede_memory_proof'
});
const ALLOWED_VISIBILITIES = GOVERNED_NATIVE_VISIBILITIES;
const ALLOWED_DISCLOSURE_LEVELS = Object.freeze([
  'none',
  'receipt_only',
  'metadata',
  'shape_only',
  'summary',
  'structured'
]);
const ALLOWED_WRITE_INVOCATION_PROFILES = Object.freeze([
  'governed_bounded_write'
]);
const ALLOWED_WRITE_ROLLBACK_POSTURES = Object.freeze([
  'bounded_rollback_plan',
  'mutation_cleanup_plan'
]);
const ALLOWED_TRANSPORT_CATEGORIES = Object.freeze([
  'local_http_transport'
]);
const ALLOWED_REQUEST_ID_CATEGORIES = Object.freeze([
  'generated_bridge_request_id'
]);
const GOVERNED_CONTEXT_SOURCE = 'trusted_execution_context_or_transport';
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
const ALLOWED_ERROR_STATUS_CLASSES = Object.freeze([
  'transport_error',
  'client_error',
  'server_error'
]);
const ALLOWED_HTTP_STATUS_CLASSES = Object.freeze([
  'success',
  'client_error',
  'server_error',
  'transport_error'
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
const ALLOWED_JSON_RPC_ERROR_REASON_CODES = Object.freeze([
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
const ALLOWED_FAILURE_CATEGORIES = Object.freeze([
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
const SCOPE_IDENTIFIER_FIELDS = Object.freeze([
  'project_id',
  'workspace_id',
  'scope_id'
]);
const ALLOWED_SCOPE_FIELD_NAMES = Object.freeze([
  'client_id',
  'project_id',
  'scope_id',
  'visibility',
  'workspace_id'
]);
const WRITE_ARGUMENT_STRING_BOUNDS = Object.freeze({
  record_memory: Object.freeze({
    title: 200,
    content: 20000,
    evidence: 8000,
    sensitivity: 80
  }),
  tombstone_memory: Object.freeze({
    memory_id: 200,
    reason: 1000,
    evidence: 4000,
    tombstone_reason: 1000,
    actor_client_id: 200,
    request_source: 200
  }),
  supersede_memory: Object.freeze({
    old_memory_id: 200,
    new_memory_id: 200,
    reason: 1000,
    evidence: 4000,
    supersedes_link: 200,
    superseded_by_link: 200,
    actor_client_id: 200,
    request_source: 200
  })
});
const WRITE_ARGUMENT_REQUIRED_FIELDS = Object.freeze({
  record_memory: Object.freeze([
    'target',
    'title',
    'content',
    'evidence',
    'validated',
    'reusable',
    'sensitivity'
  ]),
  tombstone_memory: Object.freeze([
    'memory_id',
    'reason',
    'evidence',
    'tombstone_reason',
    'actor_client_id',
    'request_source'
  ]),
  supersede_memory: Object.freeze([
    'old_memory_id',
    'new_memory_id',
    'reason',
    'evidence',
    'supersedes_link',
    'superseded_by_link',
    'actor_client_id',
    'request_source'
  ])
});
const WRITE_ARGUMENT_BOOLEAN_FIELDS = Object.freeze({
  record_memory: Object.freeze([
    'validated',
    'reusable'
  ]),
  tombstone_memory: Object.freeze([
    'dry_run',
    'confirm'
  ]),
  supersede_memory: Object.freeze([
    'dry_run',
    'confirm'
  ])
});
const WRITE_ARGUMENT_TARGETS = Object.freeze([
  'process',
  'knowledge'
]);
const WRITE_ARGUMENT_TAG_MAX_LENGTH = 80;
const WRITE_ARGUMENT_TAG_MAX_ITEMS = 30;
const GOVERNANCE_METADATA_SCHEMA_VERSION = 'codex_memory_governed_native_bridge_call_governance_v1';

const FORBIDDEN_ARGUMENT_KEY_NORMAL_FORMS = new Set([
  'accesstoken',
  'authorization',
  'absolutepath',
  'apikey',
  'baseurl',
  'bearer',
  'bearer_token',
  'bearertoken',
  'configenv',
  'configenvpath',
  'credential',
  'credentials',
  'endpoint',
  'env',
  'clientid',
  'host',
  'locator',
  'locatorvalue',
  'password',
  'path',
  'projectid',
  'privatekey',
  'providerapikey',
  'refreshtoken',
  'runtimeendpoint',
  'runtimetarget',
  'runtimeurl',
  'scope',
  'scopeid',
  'secret',
  'secrets',
  'token',
  'url',
  'visibility',
  'workspaceid'
]);
const FORBIDDEN_ARGUMENT_KEY_CONTAINS = Object.freeze([
  'apikey',
  'accesstoken',
  'authorization',
  'bearertoken',
  'credential',
  'endpoint',
  'locator',
  'privatekey',
  'rawrequestbody',
  'rawresponsebody',
  'refreshtoken',
  'runtimetarget',
  'secret'
]);
const FORBIDDEN_ARGUMENT_KEY_SUFFIXES = Object.freeze([
  'path',
  'token',
  'url'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function safeEnum(value, allowedValues, fallback = null) {
  return typeof value === 'string' && allowedValues.includes(value) ? value : fallback;
}

function safeBridgeClientId(value) {
  return canonicalGovernedNativeClient(value);
}

function safeVisibility(value) {
  return safeEnum(value, ALLOWED_VISIBILITIES);
}

function safeExactApprovalDecisionReference(value) {
  return isSafeReferenceName(value) ? value : null;
}

function safeExactApprovalClaimBindingHash(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value) ? value : null;
}

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function isIntegerInRange(value, min, max) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max;
}

function nonNegativeIntegerOrNull(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function disclosureMaxItemsFromGate(gateResult) {
  const request = isPlainObject(gateResult?.normalizedBridgeRequest)
    ? gateResult.normalizedBridgeRequest
    : {};
  return clampInt(request.disclosure_max_items, 5, 0, 5);
}

function disclosureMaxBytesFromGate(gateResult) {
  const request = isPlainObject(gateResult?.normalizedBridgeRequest)
    ? gateResult.normalizedBridgeRequest
    : {};
  return clampInt(request.disclosure_max_bytes, 4096, 0, 4096);
}

function serializedByteLength(value) {
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) return 0;
    return Buffer.byteLength(serialized, 'utf8');
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function topLevelKindCategory(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  const kind = typeof value;
  if (kind === 'object') return 'object';
  if (kind === 'string') return 'string';
  if (kind === 'number') return 'number';
  if (kind === 'boolean') return 'boolean';
  return 'unknown';
}

function responseShapeCategory(value) {
  const kind = topLevelKindCategory(value);
  if (kind === 'array') return 'array_top_level_kind_only';
  if (kind === 'object') return 'object_top_level_kind_only_no_field_names';
  if (kind === 'null') return 'null_top_level_kind_only';
  if (['string', 'number', 'boolean'].includes(kind)) return 'primitive_top_level_kind_only';
  return 'unknown_shape';
}

function itemCount(value) {
  if (Array.isArray(value)) return value.length;
  if (!isPlainObject(value)) return null;
  for (const key of ['results', 'items', 'findings', 'memories', 'records']) {
    if (Array.isArray(value[key])) return value[key].length;
  }
  return null;
}

function itemCountBucket(value) {
  const count = itemCount(value);
  if (count === null) return isPlainObject(value) ? 'object_not_counted' : 'not_applicable';
  if (count === 0) return 'zero';
  if (count === 1) return 'one';
  if (count <= 5) return 'bounded_many';
  return 'over_budget_many';
}

function byteCountBucket(value, gateResult) {
  const count = serializedByteLength(value);
  if (count === 0) return 'zero';
  if (!Number.isFinite(count)) return 'over_budget';
  return count > disclosureMaxBytesFromGate(gateResult) ? 'over_budget' : 'bounded';
}

function outputBudgetExceeded(value, gateResult) {
  const count = itemCount(value);
  if (count !== null && count > disclosureMaxItemsFromGate(gateResult)) return true;
  return serializedByteLength(value) > disclosureMaxBytesFromGate(gateResult);
}

function statusClassFromError(error) {
  if (error && typeof error.statusClass === 'string') {
    return safeEnum(error.statusClass, ALLOWED_ERROR_STATUS_CLASSES, 'transport_error');
  }
  const status = Number(error?.status || error?.statusCode || error?.httpStatus);
  if (Number.isInteger(status) && status >= 400 && status < 500) return 'client_error';
  if (Number.isInteger(status) && status >= 500 && status < 600) return 'server_error';
  return 'transport_error';
}

function lowDisclosureProjection({ toolName = null, gateResult = {} } = {}) {
  const request = isPlainObject(gateResult.normalizedBridgeRequest)
    ? gateResult.normalizedBridgeRequest
    : {};
  return {
    toolName: DELEGATABLE_WRITE_TOOLS.includes(toolName) ? toolName : null,
    targetReferenceName: isSafeReferenceName(request.runtime_target_reference_name)
      ? request.runtime_target_reference_name
      : null,
    invocationProfile: safeEnum(request.invocation_profile, ALLOWED_WRITE_INVOCATION_PROFILES),
    exactApprovalForbiddenFieldCount: nonNegativeIntegerOrNull(request.exact_approval_forbidden_field_count),
    disclosureLevel: safeEnum(request.disclosure_level, ALLOWED_DISCLOSURE_LEVELS),
    rollbackPosture: safeEnum(request.rollback_posture, ALLOWED_WRITE_ROLLBACK_POSTURES),
    rollbackPlanReferencePresent: request.rollback_plan_reference_present === true
  };
}

function rejected(reasonCode, input = {}, details = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    invalidFields: details.invalidFields || [],
    delegatedResult: null,
    receipt: null,
    runtimeCalled: false,
    vcpToolBoxCalled: false,
    mcpToolCalled: false,
    memoryWritePerformed: false,
    localMemoryFallbackEligible: false,
    localMemoryFallbackUsed: false,
    rawRequestBodyDisclosed: false,
    rawResponseBodyDisclosed: false,
    tokenMaterialDisclosed: false,
    memoryContentDisclosed: false,
    rollbackApplied: false,
    readinessClaimed: false
  };
}

function invalidScopeIdentifierFields(scope) {
  if (!isPlainObject(scope)) return ['gateResult.normalizedBridgeRequest.scope'];
  const presentIdentifierFields = SCOPE_IDENTIFIER_FIELDS.filter(field => {
    const value = scope[field];
    return typeof value === 'string' && value.trim().length > 0;
  });
  const invalidFields = presentIdentifierFields
    .filter(field => !isSafeReferenceName(scope[field]))
    .map(field => `gateResult.normalizedBridgeRequest.scope.${field}`);
  if (presentIdentifierFields.length === 0) {
    invalidFields.push('gateResult.normalizedBridgeRequest.scope_identifier_present');
  }
  return invalidFields;
}

function invalidWriteStringField(args, field, maxLength) {
  if (!Object.prototype.hasOwnProperty.call(args, field)) return null;
  const value = args[field];
  if (typeof value !== 'string' || value.length < 1 || value.length > maxLength) {
    return `args.${field}`;
  }
  return null;
}

function invalidWriteTagsField(args) {
  if (!Object.prototype.hasOwnProperty.call(args, 'tags')) return null;
  const value = args.tags;
  if (typeof value === 'string') {
    return value.length <= WRITE_ARGUMENT_TAG_MAX_LENGTH ? null : 'args.tags';
  }
  if (Array.isArray(value)) {
    if (value.length > WRITE_ARGUMENT_TAG_MAX_ITEMS) return 'args.tags';
    return value.every(item => typeof item === 'string' && item.length <= WRITE_ARGUMENT_TAG_MAX_LENGTH)
      ? null
      : 'args.tags';
  }
  return 'args.tags';
}

function invalidWriteBooleanField(args, field) {
  if (!Object.prototype.hasOwnProperty.call(args, field)) return null;
  return typeof args[field] === 'boolean' ? null : `args.${field}`;
}

function invalidNativeControlledMutationConfirmFields(toolName, args = {}) {
  const invalidFields = [];
  if (toolName !== 'tombstone_memory' && toolName !== 'supersede_memory') return invalidFields;
  if (args.dry_run !== false) invalidFields.push('args.dry_run');
  if (args.confirm !== true) invalidFields.push('args.confirm');
  return invalidFields;
}

function invalidWriteArgumentFields(toolName, args = {}) {
  const invalidFields = [];
  if (!DELEGATABLE_WRITE_TOOLS.includes(toolName)) return invalidFields;
  if (!isPlainObject(args)) {
    invalidFields.push('args');
    return invalidFields;
  }

  for (const field of WRITE_ARGUMENT_REQUIRED_FIELDS[toolName] || []) {
    if (!Object.prototype.hasOwnProperty.call(args, field)) invalidFields.push(`args.${field}`);
  }
  const stringBounds = WRITE_ARGUMENT_STRING_BOUNDS[toolName] || {};
  for (const [field, maxLength] of Object.entries(stringBounds)) {
    const invalidField = invalidWriteStringField(args, field, maxLength);
    if (invalidField) invalidFields.push(invalidField);
  }
  for (const field of WRITE_ARGUMENT_BOOLEAN_FIELDS[toolName] || []) {
    const invalidField = invalidWriteBooleanField(args, field);
    if (invalidField) invalidFields.push(invalidField);
  }
  if (
    toolName === 'record_memory' &&
    Object.prototype.hasOwnProperty.call(args, 'target') &&
    !WRITE_ARGUMENT_TARGETS.includes(args.target)
  ) {
    invalidFields.push('args.target');
  }
  if (toolName === 'record_memory') {
    const invalidTagsField = invalidWriteTagsField(args);
    if (invalidTagsField) invalidFields.push(invalidTagsField);
  }
  invalidFields.push(...invalidNativeControlledMutationConfirmFields(toolName, args));
  return invalidFields;
}

function invalidFieldsForDelegation({ toolName, args = {}, gateResult, callMcpTool }) {
  const invalidFields = [];
  if (!DELEGATABLE_WRITE_TOOLS.includes(toolName)) invalidFields.push('toolName');
  invalidFields.push(...invalidWriteArgumentFields(toolName, args));
  if (!isPlainObject(gateResult) || gateResult.accepted !== true) invalidFields.push('gateResult.accepted');
  const request = isPlainObject(gateResult?.normalizedBridgeRequest)
    ? gateResult.normalizedBridgeRequest
    : {};
  if (request.mcp_tool_name !== toolName) {
    invalidFields.push('gateResult.normalizedBridgeRequest.mcp_tool_name');
  }
  if (request.access_path !== REQUIRED_ACCESS_PATH) {
    invalidFields.push('gateResult.normalizedBridgeRequest.access_path');
  }
  const scope = isPlainObject(request.scope) ? request.scope : {};
  if (!GOVERNED_NATIVE_CLIENTS.includes(request.client_id)) invalidFields.push('gateResult.normalizedBridgeRequest.client_id');
  if (!isPlainObject(request.scope)) invalidFields.push('gateResult.normalizedBridgeRequest.scope');
  if (
    !GOVERNED_NATIVE_CLIENTS.includes(scope.client_id) ||
    scope.client_id !== request.client_id
  ) {
    invalidFields.push('gateResult.normalizedBridgeRequest.scope.client_id');
  }
  if (!ALLOWED_VISIBILITIES.includes(request.visibility)) {
    invalidFields.push('gateResult.normalizedBridgeRequest.visibility');
  }
  if (
    !ALLOWED_VISIBILITIES.includes(scope.visibility) ||
    scope.visibility !== request.visibility
  ) {
    invalidFields.push('gateResult.normalizedBridgeRequest.scope.visibility');
  }
  if (request.scope_identifier_present !== true) {
    invalidFields.push('gateResult.normalizedBridgeRequest.scope_identifier_present');
  }
  invalidFields.push(...invalidScopeIdentifierFields(scope));
  if (request.trusted_execution_context_supplied !== true) {
    invalidFields.push('gateResult.normalizedBridgeRequest.trusted_execution_context_supplied');
  }
  if (request.trusted_execution_context_accepted !== true) {
    invalidFields.push('gateResult.normalizedBridgeRequest.trusted_execution_context_accepted');
  }
  if (request.trusted_execution_context_scope_matched !== true) {
    invalidFields.push('gateResult.normalizedBridgeRequest.trusted_execution_context_scope_matched');
  }
  if (request.read_allowed !== false) invalidFields.push('gateResult.normalizedBridgeRequest.read_allowed');
  if (request.write_allowed !== true) invalidFields.push('gateResult.normalizedBridgeRequest.write_allowed');
  if (request.write_policy !== 'exact_approval') invalidFields.push('gateResult.normalizedBridgeRequest.write_policy');
  if (request.exact_approval_action !== WRITE_TOOL_EXACT_APPROVAL_ACTIONS[toolName]) {
    invalidFields.push('gateResult.normalizedBridgeRequest.exact_approval_action');
  }
  if (request.exact_approval_action_matched !== true) {
    invalidFields.push('gateResult.normalizedBridgeRequest.exact_approval_action_matched');
  }
  if (request.exact_approval_scope_matched !== true) {
    invalidFields.push('gateResult.normalizedBridgeRequest.exact_approval_scope_matched');
  }
  if (request.exact_approval_runtime_target_matched !== true) {
    invalidFields.push('gateResult.normalizedBridgeRequest.exact_approval_runtime_target_matched');
  }
  if (request.exact_approval_rollback_plan_matched !== true) {
    invalidFields.push('gateResult.normalizedBridgeRequest.exact_approval_rollback_plan_matched');
  }
  if (request.exact_approval_scope_references_safe !== true) {
    invalidFields.push('gateResult.normalizedBridgeRequest.exact_approval_scope_references_safe');
  }
  if (request.exact_approval_scope_visibility_accepted !== true) {
    invalidFields.push('gateResult.normalizedBridgeRequest.exact_approval_scope_visibility_accepted');
  }
  if (request.exact_approval_runtime_target_reference_safe !== true) {
    invalidFields.push('gateResult.normalizedBridgeRequest.exact_approval_runtime_target_reference_safe');
  }
  if (request.exact_approval_runtime_target_kind_accepted !== true) {
    invalidFields.push('gateResult.normalizedBridgeRequest.exact_approval_runtime_target_kind_accepted');
  }
  if (request.exact_approval_runtime_target_primary_runtime_accepted !== true) {
    invalidFields.push('gateResult.normalizedBridgeRequest.exact_approval_runtime_target_primary_runtime_accepted');
  }
  if (request.exact_approval_rollback_plan_reference_present !== true) {
    invalidFields.push('gateResult.normalizedBridgeRequest.exact_approval_rollback_plan_reference_present');
  }
  if (request.exact_approval_rollback_plan_reference_safe !== true) {
    invalidFields.push('gateResult.normalizedBridgeRequest.exact_approval_rollback_plan_reference_safe');
  }
  if (request.exact_approval_forbidden_field_count !== 0) {
    invalidFields.push('gateResult.normalizedBridgeRequest.exact_approval_forbidden_field_count');
  }
  if (request.invocation_profile !== 'governed_bounded_write') {
    invalidFields.push('gateResult.normalizedBridgeRequest.invocation_profile');
  }
  if (request.invocation_profile_forbidden_field_count !== 0) {
    invalidFields.push('gateResult.normalizedBridgeRequest.invocation_profile_forbidden_field_count');
  }
  if (request.read_write_authority_forbidden_field_count !== 0) {
    invalidFields.push('gateResult.normalizedBridgeRequest.read_write_authority_forbidden_field_count');
  }
  if (request.raw_output_allowed !== false) invalidFields.push('gateResult.normalizedBridgeRequest.raw_output_allowed');
  if (!ALLOWED_DISCLOSURE_LEVELS.includes(request.disclosure_level)) {
    invalidFields.push('gateResult.normalizedBridgeRequest.disclosure_level');
  }
  if (!isIntegerInRange(request.disclosure_max_items, 0, 5)) {
    invalidFields.push('gateResult.normalizedBridgeRequest.disclosure_max_items');
  }
  if (!isIntegerInRange(request.disclosure_max_bytes, 0, 4096)) {
    invalidFields.push('gateResult.normalizedBridgeRequest.disclosure_max_bytes');
  }
  if (request.disclosure_forbidden_field_count !== 0) {
    invalidFields.push('gateResult.normalizedBridgeRequest.disclosure_forbidden_field_count');
  }
  if (request.audit_receipt_required !== true) {
    invalidFields.push('gateResult.normalizedBridgeRequest.audit_receipt_required');
  }
  if (request.audit_receipt_low_disclosure !== true) {
    invalidFields.push('gateResult.normalizedBridgeRequest.audit_receipt_low_disclosure');
  }
  if (request.audit_receipt_reference_present !== true) {
    invalidFields.push('gateResult.normalizedBridgeRequest.audit_receipt_reference_present');
  }
  if (!isSafeReferenceName(request.audit_receipt_reference_name)) {
    invalidFields.push('gateResult.normalizedBridgeRequest.audit_receipt_reference_name');
  }
  if (request.audit_receipt_forbidden_field_count !== 0) {
    invalidFields.push('gateResult.normalizedBridgeRequest.audit_receipt_forbidden_field_count');
  }
  if (!ALLOWED_WRITE_ROLLBACK_POSTURES.includes(request.rollback_posture)) {
    invalidFields.push('gateResult.normalizedBridgeRequest.rollback_posture');
  }
  if (request.rollback_plan_reference_present !== true) {
    invalidFields.push('gateResult.normalizedBridgeRequest.rollback_plan_reference_present');
  }
  if (request.rollback_plan_reference_safe !== true) {
    invalidFields.push('gateResult.normalizedBridgeRequest.rollback_plan_reference_safe');
  }
  if (!isSafeReferenceName(request.rollback_plan_reference_name)) {
    invalidFields.push('gateResult.normalizedBridgeRequest.rollback_plan_reference_name');
  }
  if (request.rollback_posture_forbidden_field_count !== 0) {
    invalidFields.push('gateResult.normalizedBridgeRequest.rollback_posture_forbidden_field_count');
  }
  if (!isSafeReferenceName(request.runtime_target_reference_name)) {
    invalidFields.push('gateResult.normalizedBridgeRequest.runtime_target_reference_name');
  }
  if (request.runtime_target !== REQUIRED_PRIMARY_RUNTIME) {
    invalidFields.push('gateResult.normalizedBridgeRequest.runtime_target');
  }
  if (request.runtime_target_kind !== 'mcp_server') {
    invalidFields.push('gateResult.normalizedBridgeRequest.runtime_target_kind');
  }
  if (request.runtime_target_source_authority !== SOURCE_AUTHORITY) {
    invalidFields.push('gateResult.normalizedBridgeRequest.runtime_target_source_authority');
  }
  if (request.runtime_target_configured !== true) {
    invalidFields.push('gateResult.normalizedBridgeRequest.runtime_target_configured');
  }
  if (request.runtime_target_forbidden_field_count !== 0) {
    invalidFields.push('gateResult.normalizedBridgeRequest.runtime_target_forbidden_field_count');
  }
  if (typeof callMcpTool !== 'function') {
    invalidFields.push('callMcpTool');
  } else if (!getCallMcpToolWithReceipt(callMcpTool)) {
    invalidFields.push('callMcpTool.callWithReceipt');
  }
  return invalidFields;
}

function getCallMcpToolWithReceipt(callMcpTool) {
  if (typeof callMcpTool?.callWithReceipt === 'function') {
    return callMcpTool.callWithReceipt;
  }
  if (typeof callMcpTool?.callToolWithReceipt === 'function') {
    return callMcpTool.callToolWithReceipt;
  }
  return null;
}

async function callNativeTool({ callMcpTool, payload }) {
  const callWithReceipt = getCallMcpToolWithReceipt(callMcpTool);
  if (callWithReceipt) {
    const result = await callWithReceipt(payload);
    return {
      nativeValue: result?.value,
      nativeInvocationReceipt: isPlainObject(result?.receipt) ? result.receipt : null
    };
  }

  const error = new Error('native_invocation_receipt_required');
  error.statusClass = 'client_error';
  throw error;
}

function lowDisclosureNativeInvocationReceipt(value, expected = {}) {
  if (!isPlainObject(value)) return null;
  const targetReferenceName = isSafeReferenceName(value.targetReferenceName) &&
    value.targetReferenceName === expected.targetReferenceName
    ? value.targetReferenceName
    : null;
  const toolName = DELEGATABLE_WRITE_TOOLS.includes(value.toolName) &&
    value.toolName === expected.toolName
    ? value.toolName
    : null;
  const invocationBindingMatched = targetReferenceName !== null && toolName !== null;
  const nativeRuntimeReceipt = isPlainObject(value.nativeRuntimeReceipt)
    ? value.nativeRuntimeReceipt
    : {};
  return {
    invocationBindingMatched,
    targetReferenceName,
    targetKind: invocationBindingMatched && value.targetKind === 'mcp_server' ? 'mcp_server' : null,
    transportCategory: invocationBindingMatched
      ? safeEnum(value.transportCategory, ALLOWED_TRANSPORT_CATEGORIES)
      : null,
    mcpMethod: invocationBindingMatched && value.mcpMethod === 'tools/call' ? 'tools/call' : null,
    toolName,
    requestIdCategory: invocationBindingMatched
      ? safeEnum(value.requestIdCategory, ALLOWED_REQUEST_ID_CATEGORIES)
      : null,
    jsonRpcResponseIdMatched: invocationBindingMatched && value.jsonRpcResponseIdMatched === true,
    governanceMetadataPath: value.governanceMetadataPath === 'params._meta.codexMemoryGovernance'
      ? 'params._meta.codexMemoryGovernance'
      : null,
    governanceMetadataSent: value.governanceMetadataSent === true,
    statusClass: invocationBindingMatched ? safeEnum(value.statusClass, ALLOWED_STATUS_CLASSES) : null,
    httpStatusClass: invocationBindingMatched ? safeEnum(value.httpStatusClass, ALLOWED_HTTP_STATUS_CLASSES) : null,
    jsonRpcErrorPresent: invocationBindingMatched && value.jsonRpcErrorPresent === true,
    jsonRpcErrorReasonCode: invocationBindingMatched
      ? safeEnum(value.jsonRpcErrorReasonCode, ALLOWED_JSON_RPC_ERROR_REASON_CODES)
      : null,
    failureCategory: invocationBindingMatched
      ? safeEnum(value.failureCategory, ALLOWED_FAILURE_CATEGORIES)
      : null,
    responseShapeCategory: invocationBindingMatched
      ? safeEnum(value.responseShapeCategory, ALLOWED_RESPONSE_SHAPE_CATEGORIES)
      : null,
    topLevelKindCategory: invocationBindingMatched
      ? safeEnum(value.topLevelKindCategory, ALLOWED_TOP_LEVEL_KIND_CATEGORIES)
      : null,
    endpointDisclosed: false,
    tokenMaterialDisclosed: false,
    rawRequestBodyDisclosed: false,
    rawResponseBodyDisclosed: false,
    rawRequestBodyPersisted: false,
    rawResponseBodyPersisted: false,
    rawResponseBodyPrinted: false,
    governanceMetadataRawValueDisclosed: value.governanceMetadataRawValueDisclosed === true,
    nativeRuntimeReceipt: {
      present: nativeRuntimeReceipt.present === true,
      nativeRuntimeCalled: nativeRuntimeReceipt.nativeRuntimeCalled === true,
      nativeRuntimeInitialized: nativeRuntimeReceipt.nativeRuntimeInitialized === true,
      providerApiCalled: nativeRuntimeReceipt.providerApiCalled === true,
      memoryReadPerformed: nativeRuntimeReceipt.memoryReadPerformed === true,
      memoryWritePerformed: nativeRuntimeReceipt.memoryWritePerformed === true,
      durableWritePerformed: nativeRuntimeReceipt.durableWritePerformed === true,
      durableWriteScope: [
        'isolated_derived_index',
        'native_runtime_store',
        'primary_memory_write',
        'primary_memory_mutation_marker'
      ].includes(nativeRuntimeReceipt.durableWriteScope)
        ? nativeRuntimeReceipt.durableWriteScope
        : null,
      isolatedRuntimeStoreUsed: nativeRuntimeReceipt.isolatedRuntimeStoreUsed === true,
      primaryMemoryStoreWritePerformed: nativeRuntimeReceipt.primaryMemoryStoreWritePerformed === true,
      derivedIndexWritePerformed: nativeRuntimeReceipt.derivedIndexWritePerformed === true,
      rawRuntimeOutputDisclosed: nativeRuntimeReceipt.rawRuntimeOutputDisclosed === true,
      rawMemoryContentDisclosed: nativeRuntimeReceipt.rawMemoryContentDisclosed === true,
      runtimeLocatorDisclosed: nativeRuntimeReceipt.runtimeLocatorDisclosed === true,
      tokenMaterialDisclosed: nativeRuntimeReceipt.tokenMaterialDisclosed === true,
      memoryIntelligenceOwner: nativeRuntimeReceipt.memoryIntelligenceOwner === 'VCPToolBox'
        ? 'VCPToolBox'
        : null,
      ownerRuntimeComponent: nativeRuntimeReceipt.ownerRuntimeComponent === 'DailyNote'
        ? 'DailyNote'
        : null,
      ownerRuntimeCommunication: nativeRuntimeReceipt.ownerRuntimeCommunication === 'stdio'
        ? 'stdio'
        : null,
      ownerRuntimeSourceCommitMatched: nativeRuntimeReceipt.ownerRuntimeSourceCommitMatched === true,
      ownerRuntimeSourceTreeMatched: nativeRuntimeReceipt.ownerRuntimeSourceTreeMatched === true,
      ownerRuntimePluginBlobMatched: nativeRuntimeReceipt.ownerRuntimePluginBlobMatched === true,
      ownerRuntimeManifestBlobMatched: nativeRuntimeReceipt.ownerRuntimeManifestBlobMatched === true,
      stableStoreIdentityMatched: nativeRuntimeReceipt.stableStoreIdentityMatched === true,
      durableBytes: Number.isInteger(nativeRuntimeReceipt.durableBytes) && nativeRuntimeReceipt.durableBytes > 0
        ? nativeRuntimeReceipt.durableBytes
        : null,
      durableSha256: /^[a-f0-9]{64}$/.test(nativeRuntimeReceipt.durableSha256 || '')
        ? nativeRuntimeReceipt.durableSha256
        : null,
      readinessClaimed: nativeRuntimeReceipt.readinessClaimed === true
    },
    readinessClaimed: false
  };
}

function nativeInvocationReceiptGovernanceMetadataBound(receipt) {
  return isPlainObject(receipt) &&
    receipt.governanceMetadataSent === true &&
    receipt.governanceMetadataPath === 'params._meta.codexMemoryGovernance' &&
    receipt.governanceMetadataRawValueDisclosed === false;
}

function nativeInvocationReceiptExecutionBound(receipt) {
  return isPlainObject(receipt) &&
    receipt.invocationBindingMatched === true &&
    receipt.targetKind === 'mcp_server' &&
    receipt.transportCategory === 'local_http_transport' &&
    receipt.mcpMethod === 'tools/call' &&
    receipt.requestIdCategory === 'generated_bridge_request_id' &&
    receipt.jsonRpcResponseIdMatched === true &&
    receipt.statusClass === 'success' &&
    receipt.httpStatusClass === 'success' &&
    receipt.jsonRpcErrorPresent === false &&
    receipt.nativeRuntimeReceipt?.memoryWritePerformed === true &&
    receipt.nativeRuntimeReceipt?.durableWritePerformed === true;
}

function normalizedNativeWriteArgumentKey(key) {
  return typeof key === 'string'
    ? key.toLowerCase().replace(/[^a-z0-9]/g, '')
    : '';
}

function isForbiddenNativeWriteArgumentKey(key) {
  const normalizedKey = normalizedNativeWriteArgumentKey(key);
  return FORBIDDEN_ARGUMENT_KEY_NORMAL_FORMS.has(normalizedKey) ||
    FORBIDDEN_ARGUMENT_KEY_CONTAINS.some(pattern => normalizedKey.includes(pattern)) ||
    FORBIDDEN_ARGUMENT_KEY_SUFFIXES.some(suffix => normalizedKey.endsWith(suffix));
}

function sanitizeNativeWriteArguments(value, depth = 0) {
  if (depth > 6) return null;
  if (Array.isArray(value)) {
    return value.map(item => sanitizeNativeWriteArguments(item, depth + 1));
  }
  if (!isPlainObject(value)) {
    if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'undefined') return null;
    return value;
  }

  const output = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (isForbiddenNativeWriteArgumentKey(key)) continue;
    output[key] = sanitizeNativeWriteArguments(nestedValue, depth + 1);
  }
  return output;
}

function buildRuntimeTargetEnvelope(request = {}) {
  const runtimeTargetForbiddenFieldCount = request.runtime_target_forbidden_field_count === 0 ? 0 : null;
  const runtimeTargetBound = request.runtime_target === REQUIRED_PRIMARY_RUNTIME &&
    request.runtime_target_configured === true &&
    request.runtime_target_kind === 'mcp_server' &&
    request.runtime_target_source_authority === SOURCE_AUTHORITY &&
    runtimeTargetForbiddenFieldCount === 0 &&
    isSafeReferenceName(request.runtime_target_reference_name);
  return {
    primary_runtime: REQUIRED_PRIMARY_RUNTIME,
    target_reference_name: runtimeTargetForbiddenFieldCount === 0 &&
      isSafeReferenceName(request.runtime_target_reference_name)
      ? request.runtime_target_reference_name
      : null,
    target_kind: request.runtime_target_kind === 'mcp_server' ? 'mcp_server' : null,
    source_authority: request.runtime_target_source_authority === SOURCE_AUTHORITY ? SOURCE_AUTHORITY : null,
    forbidden_field_count: runtimeTargetForbiddenFieldCount,
    bound: runtimeTargetBound,
    tool_arguments_may_override: false,
    governance_metadata_may_override: false,
    locator_included: false,
    endpoint_included: false,
    token_material_included: false,
    locator_disclosed: false,
    endpoint_disclosed: false,
    token_material_disclosed: false
  };
}

function exactApprovalActionForDelegatedTool(toolName, request = {}) {
  const expectedAction = WRITE_TOOL_EXACT_APPROVAL_ACTIONS[toolName];
  if (!expectedAction) return null;
  if (request.mcp_tool_name !== toolName) return null;
  if (request.exact_approval_action !== expectedAction) return null;
  if (request.exact_approval_action_matched !== true) return null;
  return expectedAction;
}

function sanitizeScope(scope) {
  if (!isPlainObject(scope)) return undefined;
  const output = {};
  for (const key of ['project_id', 'workspace_id', 'scope_id']) {
    if (typeof scope[key] === 'string' && isSafeReferenceName(scope[key])) output[key] = scope[key];
  }
  if (GOVERNED_NATIVE_CLIENTS.includes(scope.client_id)) output.client_id = scope.client_id;
  if (ALLOWED_VISIBILITIES.includes(scope.visibility)) output.visibility = scope.visibility;
  if (scope.strict === true || scope.strict === false) output.strict = scope.strict;
  return Object.keys(output).length > 0 ? output : undefined;
}

function scopeFieldNames(scope) {
  if (!isPlainObject(scope)) return [];
  return Object.keys(scope)
    .filter(field => ALLOWED_SCOPE_FIELD_NAMES.includes(field))
    .sort();
}

function scopeIdentifierFieldNames(scope) {
  return scopeFieldNames(scope)
    .filter(field => SCOPE_IDENTIFIER_FIELDS.includes(field));
}

function scopeFingerprint(scope) {
  const fields = scopeFieldNames(scope);
  if (fields.length === 0) return null;
  const source = fields.reduce((output, field) => {
    output[field] = scope[field];
    return output;
  }, {});
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(source), 'utf8')
    .digest('hex');
}

function rollbackPostureBound(request = {}) {
  return ALLOWED_WRITE_ROLLBACK_POSTURES.includes(request.rollback_posture) &&
    request.rollback_posture_forbidden_field_count === 0 &&
    request.rollback_plan_reference_present === true &&
    request.rollback_plan_reference_safe === true &&
    isSafeReferenceName(request.rollback_plan_reference_name) &&
    request.exact_approval_rollback_plan_matched === true;
}

function scopeBoundaryBound(request = {}, canonicalScopeFieldNames = []) {
  return request.scope_present === true &&
    request.scope_identifier_present === true &&
    request.scope_identifier_safe === true &&
    canonicalScopeFieldNames.includes('client_id') &&
    canonicalScopeFieldNames.includes('visibility') &&
    ALLOWED_VISIBILITIES.includes(request.visibility);
}

function invocationProfileBound(request = {}, toolName = request.mcp_tool_name) {
  return request.invocation_profile_forbidden_field_count === 0 &&
    request.transport === 'mcp' &&
    request.invocation_profile === 'governed_bounded_write' &&
    DELEGATABLE_WRITE_TOOLS.includes(toolName);
}

function buildDelegatedArguments(toolName, args = {}, gateResult = {}) {
  const delegated = sanitizeNativeWriteArguments(isPlainObject(args) ? args : {});
  const request = isPlainObject(gateResult.normalizedBridgeRequest)
    ? gateResult.normalizedBridgeRequest
    : {};
  const canonicalScope = sanitizeScope(request.scope);
  const canonicalScopeFieldNames = scopeFieldNames(canonicalScope);
  const canonicalScopeIdentifierFieldNames = scopeIdentifierFieldNames(canonicalScope);
  if (canonicalScope) delegated.scope = canonicalScope;

  delegated.governed_bridge = {
    primary_runtime: REQUIRED_PRIMARY_RUNTIME,
    access_path: request.access_path === REQUIRED_ACCESS_PATH ? REQUIRED_ACCESS_PATH : null,
    runtime_target: buildRuntimeTargetEnvelope(request),
    client_id: safeBridgeClientId(request.client_id),
    scope: canonicalScope || null,
    scope_present: request.scope_present === true && canonicalScopeFieldNames.length > 0,
    scope_identifier_present: request.scope_identifier_present === true &&
      canonicalScopeIdentifierFieldNames.length > 0,
    scope_identifier_safe: request.scope_identifier_safe === true,
    scope_field_names: canonicalScopeFieldNames,
    scope_identifier_field_names: canonicalScopeIdentifierFieldNames,
    scope_fingerprint: scopeFingerprint(canonicalScope),
    raw_scope_persisted: false,
    raw_scope_value_returned: false,
    local_memory_role: 'not_used',
    local_memory_source_runtime: null,
    local_memory_primary_runtime: false,
    local_memory_fallback_used: false,
    local_memory_result_returned: false,
    local_memory_result_can_be_mistaken_for_vcp_native: false,
    local_memory_raw_content_disclosed: false,
    visibility: safeVisibility(request.visibility),
    client_identity_source: GOVERNED_CONTEXT_SOURCE,
    client_identity_bound: GOVERNED_NATIVE_CLIENTS.includes(request.client_id),
    client_identity_tool_arguments_may_override: false,
    client_identity_governance_metadata_may_override: false,
    scope_boundary_source: GOVERNED_CONTEXT_SOURCE,
    scope_boundary_bound: scopeBoundaryBound(request, canonicalScopeFieldNames),
    scope_tool_arguments_may_override: false,
    scope_governance_metadata_may_override: false,
    visibility_bound: ALLOWED_VISIBILITIES.includes(request.visibility),
    trusted_execution_context_supplied: request.trusted_execution_context_supplied === true,
    trusted_execution_context_accepted: request.trusted_execution_context_accepted === true,
    trusted_execution_context_scope_matched: request.trusted_execution_context_scope_matched === true,
    invocation_profile: safeEnum(request.invocation_profile, ALLOWED_WRITE_INVOCATION_PROFILES),
    invocation_profile_source: 'bridge_tool_binding',
    invocation_profile_bound: invocationProfileBound(request),
    invocation_profile_tool_arguments_may_override: false,
    invocation_profile_governance_metadata_may_override: false,
    invocation_transport: request.transport === 'mcp' ? 'mcp' : null,
    invocation_tool_name: DELEGATABLE_WRITE_TOOLS.includes(request.mcp_tool_name)
      ? request.mcp_tool_name
      : null,
    invocation_profile_tool_match: DELEGATABLE_WRITE_TOOLS.includes(request.mcp_tool_name) &&
      request.invocation_profile === 'governed_bounded_write',
    invocation_profile_forbidden_field_count: request.invocation_profile_forbidden_field_count === 0 ? 0 : null,
    read_allowed: false,
    write_allowed: request.write_allowed === true,
    write_policy: request.write_policy === 'exact_approval' ? 'exact_approval' : null,
    read_write_authority_source: request.read_write_authority_forbidden_field_count === 0
      ? 'bridge_tool_binding'
      : null,
    read_write_authority_forbidden_field_count: request.read_write_authority_forbidden_field_count === 0 ? 0 : null,
    read_write_authority_bound: request.read_write_authority_forbidden_field_count === 0 &&
      request.read_allowed === false &&
      request.write_allowed === true &&
      request.write_policy === 'exact_approval',
    mixed_read_write_allowed: false,
    unbounded_write_allowed: false,
    write_requires_exact_approval: true,
    exact_approval_action: exactApprovalActionForDelegatedTool(toolName, request),
    exact_approval_decision_reference:
      safeExactApprovalDecisionReference(request.exact_approval_decision_reference),
    exact_approval_claim_binding_hash:
      safeExactApprovalClaimBindingHash(request.exact_approval_claim_binding_hash),
    exact_approval_action_matched: request.exact_approval_action_matched === true,
    exact_approval_scope_matched: request.exact_approval_scope_matched === true,
    exact_approval_runtime_target_matched: request.exact_approval_runtime_target_matched === true,
    exact_approval_rollback_plan_matched: request.exact_approval_rollback_plan_matched === true,
    exact_approval_forbidden_field_count: request.exact_approval_forbidden_field_count === 0 ? 0 : null,
    raw_output_allowed: false,
    disclosure_level: safeEnum(request.disclosure_level, ALLOWED_DISCLOSURE_LEVELS),
    output_disclosure_budget_source: 'bridge_gate_normalized_governance',
    disclosure_max_items: disclosureMaxItemsFromGate(gateResult),
    disclosure_max_bytes: disclosureMaxBytesFromGate(gateResult),
    disclosure_forbidden_field_count: request.disclosure_forbidden_field_count === 0 ? 0 : null,
    output_disclosure_budget_bound: request.raw_output_allowed === false &&
      ALLOWED_DISCLOSURE_LEVELS.includes(request.disclosure_level) &&
      isIntegerInRange(request.disclosure_max_items, 0, 5) &&
      isIntegerInRange(request.disclosure_max_bytes, 0, 4096) &&
      request.disclosure_forbidden_field_count === 0,
    output_disclosure_budget_tool_arguments_may_override: false,
    output_disclosure_budget_governance_metadata_may_override: false,
    over_budget_fallback_to_raw_output: false,
    raw_response_body_disclosed: false,
    rollback_posture: safeEnum(request.rollback_posture, ALLOWED_WRITE_ROLLBACK_POSTURES),
    rollback_posture_source: 'bridge_gate_normalized_governance',
    rollback_posture_forbidden_field_count: request.rollback_posture_forbidden_field_count === 0 ? 0 : null,
    rollback_plan_reference_present: request.rollback_plan_reference_present === true,
    rollback_plan_reference_safe: request.rollback_plan_reference_safe === true,
    rollback_plan_reference_name: isSafeReferenceName(request.rollback_plan_reference_name)
      ? request.rollback_plan_reference_name
      : null,
    rollback_posture_bound: rollbackPostureBound(request),
    rollback_posture_tool_arguments_may_override: false,
    rollback_posture_governance_metadata_may_override: false,
    rollback_plan_shape_only: true,
    rollback_auto_apply_allowed: false,
    rollback_apply_requires_governed_followup: true,
    rollback_raw_plan_disclosed: false,
    rollback_raw_plan_persisted: false,
    audit_receipt_required: request.audit_receipt_required === true,
    audit_receipt_low_disclosure: request.audit_receipt_low_disclosure === true,
    audit_receipt_source: 'bridge_gate_normalized_governance',
    audit_receipt_reference_present: request.audit_receipt_reference_present === true,
    audit_receipt_reference_name: isSafeReferenceName(request.audit_receipt_reference_name)
      ? request.audit_receipt_reference_name
      : null,
    audit_receipt_forbidden_field_count: request.audit_receipt_forbidden_field_count === 0 ? 0 : null,
    audit_receipt_event_type: 'governed_mcp_vcp_native_bridge_receipt',
    audit_receipt_append_required: true,
    audit_receipt_low_disclosure_bound: request.audit_receipt_required === true &&
      request.audit_receipt_low_disclosure === true &&
      request.audit_receipt_reference_present === true &&
      isSafeReferenceName(request.audit_receipt_reference_name) &&
      request.audit_receipt_forbidden_field_count === 0,
    audit_receipt_tool_arguments_may_override: false,
    audit_receipt_governance_metadata_may_override: false,
    audit_raw_request_body_persisted: false,
    audit_raw_response_body_persisted: false,
    low_disclosure: true
  };

  return delegated;
}

function buildMcpGovernanceMetadata(toolName, gateResult = {}) {
  const request = isPlainObject(gateResult.normalizedBridgeRequest)
    ? gateResult.normalizedBridgeRequest
    : {};
  const canonicalScope = sanitizeScope(request.scope);
  const runtimeTarget = {
    primaryRuntime: REQUIRED_PRIMARY_RUNTIME,
    targetReferenceName: isSafeReferenceName(request.runtime_target_reference_name)
      ? request.runtime_target_reference_name
      : null,
    targetKind: request.runtime_target_kind === 'mcp_server' ? 'mcp_server' : null,
    sourceAuthority: request.runtime_target_source_authority === SOURCE_AUTHORITY ? SOURCE_AUTHORITY : null,
    bound: request.runtime_target === REQUIRED_PRIMARY_RUNTIME &&
      request.runtime_target_configured === true &&
      request.runtime_target_kind === 'mcp_server' &&
      request.runtime_target_source_authority === SOURCE_AUTHORITY &&
      request.runtime_target_forbidden_field_count === 0,
    toolArgumentsMayOverride: false,
    governanceMetadataMayOverride: false
  };
  const rollbackPlanRef = isSafeReferenceName(request.rollback_plan_reference_name)
    ? request.rollback_plan_reference_name
    : null;
  const approvalDecisionReference =
    safeExactApprovalDecisionReference(request.exact_approval_decision_reference);
  const claimBindingHash =
    safeExactApprovalClaimBindingHash(request.exact_approval_claim_binding_hash);
  return {
    schemaVersion: GOVERNANCE_METADATA_SCHEMA_VERSION,
    trustedExecutionContext: {
      accepted: request.trusted_execution_context_accepted === true,
      source: GOVERNED_CONTEXT_SOURCE,
      executionContext: {
        agentAlias: safeBridgeClientId(request.client_id),
        clientId: safeBridgeClientId(request.client_id),
        projectId: canonicalScope?.project_id || null,
        scopeId: canonicalScope?.scope_id || null,
        workspaceId: canonicalScope?.workspace_id || null,
        visibility: safeVisibility(request.visibility)
      }
    },
    runtimeTarget,
    invocationProfile: {
      profile: 'governed_bounded_write',
      source: 'bridge_tool_binding',
      transport: 'mcp',
      toolName: DELEGATABLE_WRITE_TOOLS.includes(toolName) ? toolName : null,
      bound: invocationProfileBound(request, toolName),
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false
    },
    readWriteAuthority: {
      readAllowed: false,
      writeAllowed: true,
      writePolicy: 'exact_approval',
      source: 'bridge_tool_binding',
      bound: request.read_write_authority_forbidden_field_count === 0 &&
        request.read_allowed === false &&
        request.write_allowed === true &&
        request.write_policy === 'exact_approval',
      mixedReadWriteAllowed: false,
      unboundedWriteAllowed: false,
      writeRequiresExactApproval: true,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false
    },
    exactApprovalResult: {
      accepted: true,
      allowedAction: exactApprovalActionForDelegatedTool(toolName, request),
      ...(approvalDecisionReference ? { approvalDecisionReference } : {}),
      ...(claimBindingHash ? { claimBindingHash } : {}),
      allowedScope: canonicalScope || null,
      runtimeTarget: {
        primaryRuntime: runtimeTarget.primaryRuntime,
        targetReferenceName: runtimeTarget.targetReferenceName,
        targetKind: runtimeTarget.targetKind
      },
      rollbackPlanRef,
      actionMatched: request.exact_approval_action_matched === true,
      scopeMatched: request.exact_approval_scope_matched === true,
      runtimeTargetMatched: request.exact_approval_runtime_target_matched === true,
      rollbackPlanMatched: request.exact_approval_rollback_plan_matched === true
    },
    outputDisclosureBudget: {
      level: safeEnum(request.disclosure_level, ALLOWED_DISCLOSURE_LEVELS),
      lowDisclosure: true,
      rawOutput: false,
      maxItems: disclosureMaxItemsFromGate(gateResult),
      maxBytes: disclosureMaxBytesFromGate(gateResult),
      source: 'bridge_gate_normalized_governance',
      bound: request.raw_output_allowed === false &&
        ALLOWED_DISCLOSURE_LEVELS.includes(request.disclosure_level) &&
        isIntegerInRange(request.disclosure_max_items, 0, 5) &&
        isIntegerInRange(request.disclosure_max_bytes, 0, 4096) &&
        request.disclosure_forbidden_field_count === 0,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false
    },
    auditReceipt: {
      receipt_id: isSafeReferenceName(request.audit_receipt_reference_name)
        ? request.audit_receipt_reference_name
        : null,
      required: request.audit_receipt_required === true,
      lowDisclosure: request.audit_receipt_low_disclosure === true,
      source: 'bridge_gate_normalized_governance',
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false
    },
    rollbackPosture: {
      mode: safeEnum(request.rollback_posture, ALLOWED_WRITE_ROLLBACK_POSTURES),
      rollback_plan_ref: rollbackPlanRef,
      source: 'bridge_gate_normalized_governance',
      bound: rollbackPostureBound(request),
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false,
      automaticRollbackAppliedByBridge: false,
      applyRequiresGovernedFollowup: true
    },
    governanceTransport: {
      metadataPath: 'params._meta.codexMemoryGovernance',
      toolArgumentsMayCarryGovernance: false,
      trustedExecutionContextMustMatchTransportContext: true,
      transportContextFieldsOverrideGovernanceMetadata: true
    },
    lowDisclosure: true,
    readinessClaimed: false
  };
}

function buildAccess({ statusClass }) {
  const called = statusClass === 'success';
  return {
    mode: 'governed_mcp_vcp_native_bounded_write',
    selectedProjection: true,
    selectedProjectionVersion: 1,
    primaryRuntime: REQUIRED_PRIMARY_RUNTIME,
    localMemoryRole: 'not_used',
    lowDisclosure: true,
    rawOutputReturned: false,
    rawMemoryReturned: false,
    rawAuditReturned: false,
    filesystemPathsReturned: false,
    tokenMaterialReturned: false,
    providerPayloadReturned: false,
    memoryContentReturned: false,
    memoryIdsReturned: false,
    titlesReturned: false,
    snippetsReturned: false,
    runtimeCalled: called,
    vcpToolBoxCalled: called,
    mcpToolCalled: called,
    memoryWritePerformed: called,
    localMemoryFallbackEligible: false,
    localMemoryFallbackUsed: false
  };
}

function writePostCommitFailureForStatus(statusClass) {
  return statusClass === 'output_budget_exceeded' ||
    statusClass === 'native_invocation_receipt_unbound' ||
    statusClass === 'audit_receipt_not_appended';
}

function rollbackDispositionForStatus(statusClass) {
  if (writePostCommitFailureForStatus(statusClass)) return 'rollback_required_not_applied';
  if (statusClass === 'success') return 'no_rollback_required';
  return 'no_runtime_write_to_rollback';
}

function rollbackApplyPolicyForStatus(statusClass) {
  return writePostCommitFailureForStatus(statusClass)
    ? 'manual_governed_followup_required'
    : 'not_applicable';
}

function buildReceipt({ toolName, targetReferenceName, gateResult, statusClass, nativeValue, nativeInvocationReceipt }) {
  const request = gateResult.normalizedBridgeRequest;
  const attempted = statusClass !== 'not_consumed';
  const canonicalScope = sanitizeScope(request.scope);
  const canonicalScopeFieldNames = scopeFieldNames(canonicalScope);
  const writePostCommitFailure = writePostCommitFailureForStatus(statusClass);
  const rollbackPlanReferenceName = isSafeReferenceName(request.rollback_plan_reference_name)
    ? request.rollback_plan_reference_name
    : null;
  const rollbackPlanBound = request.rollback_plan_reference_present === true &&
    request.rollback_plan_reference_safe === true &&
    rollbackPlanReferenceName !== null;
  return {
    targetReferenceName,
    toolName,
    primaryRuntime: REQUIRED_PRIMARY_RUNTIME,
    nativeInvocationAttempted: attempted,
    nativeMcpToolInvocationAttempted: attempted,
    invocationProfile: request.invocation_profile,
    invocationProfileSource: 'bridge_tool_binding',
    invocationProfileBound: invocationProfileBound(request, toolName),
    invocationProfileToolArgumentsMayOverride: false,
    invocationProfileGovernanceMetadataMayOverride: false,
    runtimeTargetBound: request.runtime_target === REQUIRED_PRIMARY_RUNTIME &&
      request.runtime_target_configured === true &&
      request.runtime_target_kind === 'mcp_server' &&
      request.runtime_target_source_authority === SOURCE_AUTHORITY &&
      request.runtime_target_forbidden_field_count === 0 &&
      isSafeReferenceName(request.runtime_target_reference_name),
    runtimeTargetToolArgumentsMayOverride: false,
    runtimeTargetGovernanceMetadataMayOverride: false,
    clientIdentitySource: GOVERNED_CONTEXT_SOURCE,
    clientIdentityBound: GOVERNED_NATIVE_CLIENTS.includes(request.client_id),
    clientIdentityToolArgumentsMayOverride: false,
    clientIdentityGovernanceMetadataMayOverride: false,
    scopeBoundarySource: GOVERNED_CONTEXT_SOURCE,
    scopeBoundaryBound: scopeBoundaryBound(request, canonicalScopeFieldNames),
    scopeToolArgumentsMayOverride: false,
    scopeGovernanceMetadataMayOverride: false,
    visibilityBound: ALLOWED_VISIBILITIES.includes(request.visibility),
    rawScopeValueReturned: false,
    readAllowed: false,
    writeAllowed: true,
    writePolicy: request.write_policy,
    readWriteAuthoritySource: 'bridge_tool_binding',
    readWriteAuthorityForbiddenFieldCount: request.read_write_authority_forbidden_field_count === 0 ? 0 : null,
    readWriteAuthorityBound: request.read_write_authority_forbidden_field_count === 0 &&
      request.read_allowed === false &&
      request.write_allowed === true &&
      request.write_policy === 'exact_approval',
    mixedReadWriteAllowed: false,
    unboundedWriteAllowed: false,
    writeRequiresExactApproval: true,
    exactApprovalAction: request.exact_approval_action || null,
    exactApprovalDecisionReference:
      safeExactApprovalDecisionReference(request.exact_approval_decision_reference),
    exactApprovalClaimBindingHash:
      safeExactApprovalClaimBindingHash(request.exact_approval_claim_binding_hash),
    exactApprovalActionMatched: request.exact_approval_action_matched === true,
    exactApprovalScopeMatched: request.exact_approval_scope_matched === true,
    exactApprovalRuntimeTargetMatched: request.exact_approval_runtime_target_matched === true,
    exactApprovalRollbackPlanMatched: request.exact_approval_rollback_plan_matched === true,
    exactApprovalForbiddenFieldCount: nonNegativeIntegerOrNull(request.exact_approval_forbidden_field_count) ?? 0,
    disclosureLevel: request.disclosure_level,
    outputDisclosureBudgetSource: 'bridge_gate_normalized_governance',
    outputDisclosureBudgetBound: request.raw_output_allowed === false &&
      ALLOWED_DISCLOSURE_LEVELS.includes(request.disclosure_level) &&
      isIntegerInRange(request.disclosure_max_items, 0, 5) &&
      isIntegerInRange(request.disclosure_max_bytes, 0, 4096) &&
      request.disclosure_forbidden_field_count === 0,
    outputDisclosureBudgetToolArgumentsMayOverride: false,
    outputDisclosureBudgetGovernanceMetadataMayOverride: false,
    rawOutputAllowed: false,
    auditReceiptRequired: request.audit_receipt_required === true,
    auditReceiptSource: 'bridge_gate_normalized_governance',
    auditReceiptLowDisclosureBound: request.audit_receipt_required === true &&
      request.audit_receipt_low_disclosure === true &&
      request.audit_receipt_reference_present === true &&
      isSafeReferenceName(request.audit_receipt_reference_name) &&
      request.audit_receipt_forbidden_field_count === 0,
    auditReceiptToolArgumentsMayOverride: false,
    auditReceiptGovernanceMetadataMayOverride: false,
    auditReceiptReferencePresent: request.audit_receipt_reference_present === true,
    localMemoryRole: 'not_used',
    localMemorySourceRuntime: null,
    localMemoryPrimaryRuntime: false,
    localMemoryFallbackUsed: false,
    localMemoryResultReturned: false,
    localMemoryResultCanBeMistakenForVcpNative: false,
    localMemoryRawContentDisclosed: false,
    rollbackPosture: request.rollback_posture,
    rollbackPostureSource: 'bridge_gate_normalized_governance',
    rollbackPlanReferencePresent: request.rollback_plan_reference_present === true,
    rollbackPlanReferenceSafe: request.rollback_plan_reference_safe === true,
    rollbackPlanReferenceName,
    rollbackPlanBound,
    rollbackPostureBound: rollbackPlanBound,
    rollbackPostureToolArgumentsMayOverride: false,
    rollbackPostureGovernanceMetadataMayOverride: false,
    rollbackPlanShapeOnly: rollbackPlanBound,
    rollbackRequired: writePostCommitFailure,
    rollbackReasonCode: writePostCommitFailure ? `write_post_commit_${statusClass}` : null,
    rollbackDisposition: rollbackDispositionForStatus(statusClass),
    rollbackFollowupRequired: writePostCommitFailure,
    rollbackApplyPolicy: rollbackApplyPolicyForStatus(statusClass),
    rollbackApplyAttempted: false,
    rollbackAutoApplyAllowed: false,
    rollbackRawPlanDisclosed: false,
    rollbackRawPlanPersisted: false,
    statusClass,
    responseShapeCategory: statusClass === 'success' ? responseShapeCategory(nativeValue) : 'not_consumed',
    topLevelKindCategory: statusClass === 'success' ? topLevelKindCategory(nativeValue) : 'not_consumed',
    itemCountBucket: statusClass === 'success' ? itemCountBucket(nativeValue) : 'not_consumed',
    byteCountBucket: statusClass === 'success' ? byteCountBucket(nativeValue, gateResult) : 'not_consumed',
    outputBudgetExceeded: statusClass === 'output_budget_exceeded',
    fieldNameDisclosurePolicy: 'no_native_field_names_or_memory_payload_disclosed',
    rawRequestBodyPersisted: false,
    rawResponseBodyPersisted: false,
    rawResponseBodyPrinted: false,
    tokenMaterialDisclosed: false,
    memoryContentDisclosed: false,
    rollbackApplied: false,
    readinessClaimed: false,
    nativeInvocationReceipt: lowDisclosureNativeInvocationReceipt(nativeInvocationReceipt, {
      targetReferenceName,
      toolName
    })
  };
}

async function executeGovernedMcpVcpNativeWriteDelegation(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object', input, { invalidFields: ['input'] });
  }

  const invalidFields = invalidFieldsForDelegation(input);
  if (invalidFields.length > 0) {
    return rejected('invalid_governed_native_write_delegation_boundary', input, { invalidFields });
  }

  const { toolName, args = {}, gateResult, callMcpTool } = input;
  const request = gateResult.normalizedBridgeRequest;
  const targetReferenceName = request.runtime_target_reference_name;
  const delegatedArguments = buildDelegatedArguments(toolName, args, gateResult);
  let nativeValue = null;
  let nativeInvocationReceipt = null;

  try {
    const nativeCall = await callNativeTool({
      callMcpTool,
      payload: {
        targetReferenceName,
        toolName,
        arguments: delegatedArguments,
        governanceMeta: buildMcpGovernanceMetadata(toolName, gateResult)
      }
    });
    nativeValue = nativeCall.nativeValue;
    nativeInvocationReceipt = nativeCall.nativeInvocationReceipt;
  } catch (error) {
    const statusClass = statusClassFromError(error);
    return {
      ...rejected(`native_write_delegation_${statusClass}`, input),
      receipt: buildReceipt({
        toolName,
        targetReferenceName,
        gateResult,
        statusClass,
        nativeValue: null,
        nativeInvocationReceipt: error?.lowDisclosureReceipt
      }),
      runtimeCalled: true,
      vcpToolBoxCalled: true,
      mcpToolCalled: true,
      memoryWritePerformed: false,
      localMemoryFallbackEligible: false,
      rollbackApplied: false
    };
  }

  const receipt = buildReceipt({
    toolName,
    targetReferenceName,
    gateResult,
    statusClass: 'success',
    nativeValue,
    nativeInvocationReceipt
  });

  if (
    !nativeInvocationReceipt ||
    nativeInvocationReceiptExecutionBound(receipt.nativeInvocationReceipt) !== true ||
    nativeInvocationReceiptGovernanceMetadataBound(receipt.nativeInvocationReceipt) !== true
  ) {
    return {
      ...rejected('native_write_delegation_native_invocation_receipt_unbound', input),
      receipt: {
        ...receipt,
        statusClass: 'native_invocation_receipt_unbound',
        outputBudgetExceeded: false,
        rollbackRequired: true,
        rollbackReasonCode: 'write_post_commit_native_invocation_receipt_unbound',
        rollbackDisposition: 'rollback_required_not_applied',
        rollbackFollowupRequired: true,
        rollbackApplyPolicy: 'manual_governed_followup_required',
        rollbackApplyAttempted: false,
        rollbackAutoApplyAllowed: false
      },
      runtimeCalled: true,
      vcpToolBoxCalled: true,
      mcpToolCalled: true,
      memoryWritePerformed: true,
      localMemoryFallbackEligible: false,
      rollbackApplied: false
    };
  }

  if (outputBudgetExceeded(nativeValue, gateResult)) {
    return {
      ...rejected('native_write_delegation_output_budget_exceeded', input),
      receipt: {
        ...receipt,
        statusClass: 'output_budget_exceeded',
        outputBudgetExceeded: true,
        itemCountBucket: itemCountBucket(nativeValue),
        byteCountBucket: byteCountBucket(nativeValue, gateResult),
        rollbackRequired: true,
        rollbackReasonCode: 'write_post_commit_output_budget_exceeded',
        rollbackDisposition: 'rollback_required_not_applied',
        rollbackFollowupRequired: true,
        rollbackApplyPolicy: 'manual_governed_followup_required',
        rollbackApplyAttempted: false,
        rollbackAutoApplyAllowed: false
      },
      runtimeCalled: true,
      vcpToolBoxCalled: true,
      mcpToolCalled: true,
      memoryWritePerformed: true,
      localMemoryFallbackEligible: false,
      rollbackApplied: false
    };
  }

  return {
    accepted: true,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode: null,
    lowDisclosure: true,
    lowDisclosureProjection: lowDisclosureProjection(input),
    invalidFields: [],
    delegatedResult: {
      status: 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATED',
      accepted: true,
      toolName,
      access: buildAccess({ statusClass: 'success' }),
      summary: {
        primaryRuntime: REQUIRED_PRIMARY_RUNTIME,
        delegated: true,
        writeApplied: true,
        responseShapeCategory: receipt.responseShapeCategory,
        topLevelKindCategory: receipt.topLevelKindCategory
      },
      receipt,
      readinessClaimed: false
    },
    receipt,
    runtimeCalled: true,
    vcpToolBoxCalled: true,
    mcpToolCalled: true,
    memoryWritePerformed: true,
    localMemoryFallbackEligible: false,
    localMemoryFallbackUsed: false,
    rawRequestBodyDisclosed: false,
    rawResponseBodyDisclosed: false,
    tokenMaterialDisclosed: false,
    memoryContentDisclosed: false,
    rollbackApplied: false,
    readinessClaimed: false
  };
}

module.exports = {
  CONTRACT_MODE,
  CONTRACT_NAME,
  DELEGATABLE_WRITE_TOOLS,
  buildDelegatedArguments,
  executeGovernedMcpVcpNativeWriteDelegation
};
