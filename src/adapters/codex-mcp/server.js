const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const {
  DEFAULT_PROTOCOL_VERSION,
  SERVER_NAME,
  SUPPORTED_PROTOCOL_VERSIONS,
  TOOL_DEFINITIONS
} = require('../../core/constants');
const {
  REQUIRED_ACCESS_PATH,
  REQUIRED_CLIENTS,
  REQUIRED_GOVERNED_DIMENSIONS,
  REQUIRED_LOCAL_MEMORY_ROLE,
  REQUIRED_PRIMARY_RUNTIME,
  REQUIRED_PRIMARY_VALUE
} = require('../../core/CurrentProductGoalContract');
const {
  SOURCE_AUTHORITY
} = require('../../core/GovernedMcpVcpNativeRuntimeTargetConfig');
const {
  projectGovernedMcpVcpNativeBridgeConfigWarnings
} = require('../../core/GovernedMcpVcpNativeBridgeConfigWarningProjection');
const {
  ToolArgumentValidationError,
  validateToolArguments
} = require('../../core/ToolArgumentValidator');
const { redactSensitiveFragments } = require('../../core/SensitiveFragmentRedaction');
const { isSafeReferenceName } = require('../../core/VcpToolBoxSafeReference');

function jsonRpcSuccess(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function jsonRpcError(id, code, message, data) {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data })
    }
  };
}

const GOVERNED_MCP_OUTPUT_PRIVATE_REFERENCE_FIELD_NAMES = new Set([
  'rollbackPlanReferenceName',
  'rollback_plan_reference_name',
  'rollbackPlanRef',
  'rollback_plan_ref',
  'allowedRollbackPlanRef',
  'allowed_rollback_plan_ref',
  'approvedRollbackPlanRef',
  'approved_rollback_plan_ref'
]);

function projectGovernedMcpOutputValue(value) {
  if (Array.isArray(value)) {
    return value.map(item => projectGovernedMcpOutputValue(item));
  }
  if (!isPlainObject(value)) {
    return value;
  }

  const projected = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (GOVERNED_MCP_OUTPUT_PRIVATE_REFERENCE_FIELD_NAMES.has(key)) continue;
    projected[key] = projectGovernedMcpOutputValue(nestedValue);
  }
  return projected;
}

function formatToolResult(payload, isError = false) {
  const projectedPayload = projectGovernedMcpOutputValue(payload);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(projectedPayload, null, 2)
      }
    ],
    structuredContent: projectedPayload,
    isError
  };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function buildLowDisclosureRuntimeTargetMetadata(config = {}) {
  const runtimeTarget = isPlainObject(config.governedMcpVcpNativeRuntimeTarget)
    ? config.governedMcpVcpNativeRuntimeTarget
    : {};
  const targetReferenceName = typeof runtimeTarget.targetReferenceName === 'string' &&
    isSafeReferenceName(runtimeTarget.targetReferenceName)
    ? runtimeTarget.targetReferenceName
    : null;
  const targetKind = GOVERNED_METADATA_RUNTIME_TARGET_KINDS.includes(runtimeTarget.targetKind)
    ? runtimeTarget.targetKind
    : null;
  const sourceAuthority = runtimeTarget.sourceAuthority === SOURCE_AUTHORITY
    ? SOURCE_AUTHORITY
    : null;
  const configured = runtimeTarget.accepted === true &&
    targetReferenceName !== null &&
    targetKind !== null;

  return {
    primaryRuntime: REQUIRED_PRIMARY_RUNTIME,
    source: sourceAuthority,
    bound: configured,
    configured,
    targetReferenceName,
    targetKind,
    sourceAuthority,
    toolArgumentsMayOverride: false,
    governanceMetadataMayOverride: false,
    locatorDisclosed: false,
    endpointDisclosed: false,
    tokenMaterialDisclosed: false
  };
}

const GOVERNED_NATIVE_READ_TOOLS = new Set([
  'search_memory',
  'memory_overview',
  'audit_memory'
]);

const GOVERNED_NATIVE_WRITE_TOOLS = new Set([
  'record_memory',
  'tombstone_memory',
  'supersede_memory'
]);
const DEFAULT_PUBLIC_MCP_READ_TOOLS = Object.freeze([
  'search_memory',
  'memory_overview',
  'audit_memory',
  'prepare_memory_context',
  'propose_memory_delta'
]);
const CONTROLLED_MUTATION_MCP_TOOLS = Object.freeze([
  'validate_memory',
  'tombstone_memory',
  'supersede_memory'
]);
const WRITE_MCP_TOOLS = Object.freeze([
  'record_memory'
]);

const GOVERNED_NATIVE_WRITE_APPROVAL_ACTIONS = Object.freeze({
  record_memory: 'live_bridge_record_memory_proof',
  tombstone_memory: 'live_bridge_tombstone_memory_proof',
  supersede_memory: 'live_bridge_supersede_memory_proof'
});
const GOVERNED_NATIVE_WRITE_APPROVAL_ACTION_VALUES = Object.freeze(
  Object.values(GOVERNED_NATIVE_WRITE_APPROVAL_ACTIONS)
);
const GOVERNED_METADATA_RUNTIME_TARGET_KINDS = Object.freeze([
  'mcp_server'
]);
const GOVERNED_METADATA_PRIMARY_RUNTIMES = Object.freeze([
  REQUIRED_PRIMARY_RUNTIME
]);
const GOVERNED_METADATA_INVOCATION_PROFILES = Object.freeze([
  'governed_read_only',
  'governed_bounded_write'
]);
const GOVERNED_METADATA_DISCLOSURE_LEVELS = Object.freeze([
  'none',
  'receipt_only',
  'metadata',
  'shape_only',
  'summary',
  'structured'
]);
const GOVERNED_METADATA_ROLLBACK_POSTURES = Object.freeze([
  'no_runtime_state_to_rollback',
  'read_only_no_write',
  'bounded_rollback_plan',
  'mutation_cleanup_plan'
]);
const GOVERNED_METADATA_READ_ROLLBACK_POSTURES = Object.freeze([
  'no_runtime_state_to_rollback',
  'read_only_no_write'
]);
const GOVERNED_METADATA_WRITE_ROLLBACK_POSTURES = Object.freeze([
  'bounded_rollback_plan',
  'mutation_cleanup_plan'
]);
const GOVERNED_NATIVE_BRIDGE_ROLLBACK_REASON_CODES = Object.freeze([
  'write_post_commit_output_budget_exceeded',
  'write_post_commit_native_invocation_receipt_unbound',
  'write_post_commit_audit_receipt_not_appended'
]);
const GOVERNED_NATIVE_BRIDGE_AUDIT_EVIDENCE_FIELDS = Object.freeze([
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
  'rollbackEvidence',
  'rollbackPlanSafetyBooleans',
  'rollbackReasonCode',
  'nativeInvocationShapeBuckets'
]);
const GOVERNED_NATIVE_BRIDGE_WRITE_ONLY_AUDIT_EVIDENCE_FIELDS = new Set([
  'exactApprovalSafetyBooleans',
  'rollbackReasonCode'
]);
const GOVERNED_NATIVE_READ_FALLBACK_AUDIT_EVIDENCE_FIELDS = Object.freeze([
  'localMemoryRole',
  'localMemorySourceRuntime',
  'localMemoryFallbackAuthorization',
  'localMemoryFallbackAuditReceiptStatus',
  'nativeReadFailureBuckets',
  'vcpNativeResultBoundary',
  'resultCanBeMistakenForVcpNative'
]);
const GOVERNED_METADATA_ACCEPTED_FIELD_NAMES = Object.freeze([
  'exactApprovalResult',
  'exact_approval_result',
  'rollbackPosture',
  'rollback_posture',
  'auditReceipt',
  'audit_receipt',
  'trustedExecutionContext',
  'trusted_execution_context',
  'outputDisclosureBudget',
  'output_disclosure_budget'
]);
const GOVERNED_METADATA_REJECTED_FIELD_PROJECTIONS = Object.freeze({
  clientId: 'codexMemoryGovernance.clientId',
  client_id: 'codexMemoryGovernance.client_id',
  scope: 'codexMemoryGovernance.scope',
  visibility: 'codexMemoryGovernance.visibility',
  runtimeTarget: 'codexMemoryGovernance.runtimeTarget',
  runtime_target: 'codexMemoryGovernance.runtime_target',
  invocationProfile: 'codexMemoryGovernance.invocationProfile',
  invocation_profile: 'codexMemoryGovernance.invocation_profile',
  readWriteAuthority: 'codexMemoryGovernance.readWriteAuthority',
  read_write_authority: 'codexMemoryGovernance.read_write_authority',
  accessPath: 'codexMemoryGovernance.accessPath',
  access_path: 'codexMemoryGovernance.access_path'
});
const GOVERNED_METADATA_FORBIDDEN_KEY_NORMAL_FORMS = new Set([
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
const GOVERNED_METADATA_FORBIDDEN_KEY_CONTAINS = Object.freeze([
  'apikey',
  'authorization',
  'bearertoken',
  'credential',
  'endpoint',
  'locator',
  'privatekey',
  'secret'
]);
const GOVERNED_METADATA_FORBIDDEN_KEY_SUFFIXES = Object.freeze([
  'path',
  'token',
  'url'
]);

function buildGovernedNativeBridgeToolAuditEvidenceFields(nativeBridgeEligible, nativeWrite) {
  if (!nativeBridgeEligible) return [];
  if (nativeWrite) return [...GOVERNED_NATIVE_BRIDGE_AUDIT_EVIDENCE_FIELDS];
  return GOVERNED_NATIVE_BRIDGE_AUDIT_EVIDENCE_FIELDS.filter(
    field => !GOVERNED_NATIVE_BRIDGE_WRITE_ONLY_AUDIT_EVIDENCE_FIELDS.has(field)
  );
}

const GOVERNED_METADATA_NEGATIVE_EVIDENCE_KEYS = new Set([
  'configenvread',
  'endpointincluded',
  'locatorvalueincluded',
  'tokenmaterialincluded'
]);
const GOVERNED_METADATA_EXACT_APPROVAL_RUNTIME_TARGET_KEYS = new Set([
  'runtimeTarget',
  'runtime_target',
  'allowedRuntimeTarget',
  'allowed_runtime_target',
  'approvedRuntimeTarget',
  'approved_runtime_target'
].map(normalizeGovernedMetadataKey));

function buildGovernedMcpToolMetadata(toolName, config = {}) {
  const nativeRead = GOVERNED_NATIVE_READ_TOOLS.has(toolName);
  const nativeWrite = GOVERNED_NATIVE_WRITE_TOOLS.has(toolName);
  const nativeBridgeEligible = nativeRead || nativeWrite;

  return {
    schemaVersion: 'codex_memory_governed_bridge_tool_meta_v1',
    productGoal: {
      primaryRuntime: REQUIRED_PRIMARY_RUNTIME,
      primaryValue: REQUIRED_PRIMARY_VALUE,
      accessPath: REQUIRED_ACCESS_PATH,
      clients: [...REQUIRED_CLIENTS],
      governedDimensions: [...REQUIRED_GOVERNED_DIMENSIONS],
      localMemoryRole: [...REQUIRED_LOCAL_MEMORY_ROLE]
    },
    nativeBridge: {
      eligible: nativeBridgeEligible,
      direction: nativeRead ? 'read' : nativeWrite ? 'write' : 'none',
      gateMode: config.governedMcpVcpNativeBridgeGateMode || 'off',
      readDelegationMode: nativeRead ? config.governedMcpVcpNativeReadDelegationMode || 'off' : 'not_applicable',
      writeDelegationMode: nativeWrite ? config.governedMcpVcpNativeWriteDelegationMode || 'off' : 'not_applicable',
      invocationProfile: nativeRead
        ? 'governed_read_only'
        : nativeWrite
          ? 'governed_bounded_write'
          : 'local_or_compatibility_tool',
      readAllowed: nativeRead,
      writeAllowed: nativeWrite,
      exactApprovalRequired: nativeWrite,
      exactApprovalAction: nativeWrite
        ? GOVERNED_NATIVE_WRITE_APPROVAL_ACTIONS[toolName]
        : null,
      exactApprovalBindingRequired: nativeWrite
        ? ['action', 'scope', 'runtimeTarget', 'rollbackPlan']
        : [],
      localMemoryRole: nativeBridgeEligible
        ? [...REQUIRED_LOCAL_MEMORY_ROLE]
        : ['compatibility'],
      localMemoryRuntimePosture: nativeBridgeEligible
        ? {
            primaryRuntime: REQUIRED_PRIMARY_RUNTIME,
            primaryRuntimeAuthoritative: true,
            localMemoryPrimaryRuntime: false,
            fallbackAllowed: nativeRead,
            fallbackAllowedForWrite: false,
            auditEvidenceAllowed: true,
            validationFixtureAllowed: true,
            compatibilityAllowed: true,
            offlineContinuityAllowed: true,
            rawFallbackMayBeMistakenForNative: false
          }
        : {
            primaryRuntime: 'codex_memory_local',
            primaryRuntimeAuthoritative: true,
            localMemoryPrimaryRuntime: true,
            fallbackAllowed: false,
            fallbackAllowedForWrite: false,
            auditEvidenceAllowed: false,
            validationFixtureAllowed: false,
            compatibilityAllowed: true,
            offlineContinuityAllowed: false,
            rawFallbackMayBeMistakenForNative: false
          },
      configurationWarnings: projectGovernedMcpVcpNativeBridgeConfigWarnings(
        config.governedMcpVcpNativeBridgeConfigWarnings
      ),
      readinessClaimed: false
    },
    runtimeTarget: buildLowDisclosureRuntimeTargetMetadata(config),
    clientIdentity: {
      allowedClientIds: [...REQUIRED_CLIENTS],
      source: nativeBridgeEligible
        ? 'trusted_execution_context_or_transport'
        : 'local_compatibility_context',
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverrideTransportContext: false
    },
    scopeBoundary: {
      source: nativeBridgeEligible
        ? 'trusted_execution_context_or_transport'
        : 'local_compatibility_context',
      requiredFieldNames: nativeBridgeEligible
        ? ['project_id', 'scope_id', 'workspace_id', 'client_id', 'visibility']
        : [],
      acceptedVisibility: nativeBridgeEligible
        ? ['private', 'project', 'workspace']
        : [],
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverrideTransportContext: false,
      rawScopeValueReturned: false
    },
    invocationProfile: {
      source: nativeBridgeEligible
        ? 'bridge_tool_binding'
        : 'local_compatibility_tool_binding',
      transport: nativeBridgeEligible ? 'mcp' : null,
      profile: nativeRead
        ? 'governed_read_only'
        : nativeWrite
          ? 'governed_bounded_write'
          : 'local_or_compatibility_tool',
      toolName,
      profileMustMatchToolDirection: nativeBridgeEligible,
      acceptedProfiles: nativeBridgeEligible
        ? [...GOVERNED_METADATA_INVOCATION_PROFILES]
        : [],
      readProfile: nativeRead ? 'governed_read_only' : null,
      writeProfile: nativeWrite ? 'governed_bounded_write' : null,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false,
      locatorOrSecretMaterialAllowed: false,
      adapterRevalidatesProfile: nativeBridgeEligible
    },
    readWriteAuthority: {
      source: nativeBridgeEligible
        ? 'bridge_tool_binding'
        : 'local_compatibility_tool_binding',
      readAllowed: nativeRead,
      writeAllowed: nativeWrite,
      writePolicy: nativeWrite ? 'exact_approval' : null,
      writeRequiresExactApproval: nativeWrite,
      mixedReadWriteAllowed: false,
      unboundedWriteAllowed: false,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false,
      adapterRevalidatesAuthority: nativeBridgeEligible
    },
    governanceTransport: {
      metadataPath: 'params._meta.codexMemoryGovernance',
      toolArgumentsMayCarryGovernance: false,
      acceptedMetadataFields: [
        'exactApprovalResult',
        'rollbackPosture',
        'auditReceipt',
        'trustedExecutionContext',
        'outputDisclosureBudget'
      ],
      trustedExecutionContextRequiredForNativeDelegation: nativeBridgeEligible,
      trustedExecutionContextBindingRequired: nativeBridgeEligible
        ? ['clientId', 'scope', 'visibility']
        : [],
      trustedExecutionContextMustMatchTransportContext: nativeBridgeEligible,
      transportContextFieldsOverrideGovernanceMetadata: nativeBridgeEligible,
      adapterRevalidatesTrustedExecutionContext: nativeBridgeEligible,
      unsafeGovernanceMetadataPosture: 'fail_closed_without_partial_request_context'
    },
    outputDisclosureBudget: {
      source: nativeBridgeEligible
        ? 'bridge_gate_normalized_governance'
        : 'local_compatibility_governance',
      bound: nativeBridgeEligible,
      metadataPath: 'params._meta.codexMemoryGovernance.outputDisclosureBudget',
      acceptedLevels: nativeBridgeEligible
        ? [...GOVERNED_METADATA_DISCLOSURE_LEVELS]
        : [],
      defaultLevel: nativeBridgeEligible ? 'summary' : null,
      lowDisclosureRequired: true,
      rawOutputAllowed: false,
      toolArgumentsMayOverride: false,
      maxItems: 5,
      maxBytes: 4096,
      toolArgumentsMayIncreaseBudget: false,
      toolArgumentsMayRequestRawOutput: false,
      governanceMetadataMaySupplyBudget: nativeBridgeEligible,
      governanceMetadataMayOverride: false,
      locatorOrSecretMaterialAllowed: false,
      overBudgetPosture: 'fail_closed_without_raw_output',
      overBudgetFallbackToRawOutput: false
    },
    auditReceipt: {
      source: nativeBridgeEligible
        ? 'bridge_gate_normalized_governance'
        : 'local_compatibility_governance',
      required: nativeBridgeEligible,
      lowDisclosure: true,
      lowDisclosureBound: nativeBridgeEligible,
      metadataPath: 'params._meta.codexMemoryGovernance.auditReceipt',
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false,
      localReceiptEventType: 'governed_mcp_vcp_native_bridge_receipt',
      localFallbackReceiptEventType: nativeRead
        ? 'governed_mcp_vcp_native_read_fallback_receipt'
        : null,
      localFallbackRecordedEvidenceFields: nativeRead
        ? [...GOVERNED_NATIVE_READ_FALLBACK_AUDIT_EVIDENCE_FIELDS]
        : [],
      recordedEvidenceFields: buildGovernedNativeBridgeToolAuditEvidenceFields(
        nativeBridgeEligible,
        nativeWrite
      ),
      recordsTrustedExecutionContextBooleans: nativeBridgeEligible,
      recordsExactApprovalSafetyBooleans: nativeWrite,
      recordsDelegationStatusReason: nativeBridgeEligible,
      recordsNativeInvocationReceiptBinding: nativeBridgeEligible,
      recordsNativeInvocationGovernanceMetadataBinding: nativeBridgeEligible,
      recordsScopeFingerprint: nativeBridgeEligible,
      recordsScopeFieldNames: nativeBridgeEligible,
      recordsScopeIdentifierFieldNames: nativeBridgeEligible,
      recordsOutputBudgetBuckets: nativeBridgeEligible,
      recordsRawOutputPolicy: nativeBridgeEligible,
      recordsAuditReceiptLowDisclosureBooleans: nativeBridgeEligible,
      recordsRollbackEvidence: nativeBridgeEligible,
      recordsRollbackPlanSafetyBooleans: nativeBridgeEligible,
      recordsRollbackReasonCode: nativeWrite,
      recordsNativeInvocationShapeBuckets: nativeBridgeEligible,
      recordsLocalFallbackRole: nativeRead,
      recordsLocalFallbackSourceRuntime: nativeRead,
      recordsLocalFallbackAuthorization: nativeRead,
      recordsLocalFallbackAuditReceiptStatus: nativeRead,
      recordsLocalFallbackNativeReadFailureBuckets: nativeRead,
      recordsLocalFallbackNativeResultBoundary: nativeRead,
      rawScopePersisted: false,
      rawRequestBodyPersisted: false,
      rawResponseBodyPersisted: false,
      rawNativePayloadPersisted: false,
      rawPayloadPersisted: false
    },
    rollbackPosture: {
      source: nativeBridgeEligible
        ? 'bridge_gate_normalized_governance'
        : 'local_compatibility_governance',
      bound: nativeBridgeEligible,
      requiredForWrite: nativeWrite,
      metadataPath: 'params._meta.codexMemoryGovernance.rollbackPosture',
      defaultReadPosture: 'no_runtime_state_to_rollback',
      acceptedReadPostures: [...GOVERNED_METADATA_READ_ROLLBACK_POSTURES],
      acceptedWritePostures: [...GOVERNED_METADATA_WRITE_ROLLBACK_POSTURES],
      readRollbackPlanReferenceAllowed: false,
      readRollbackDisposition: 'no_runtime_write_to_rollback',
      writeRollbackPlanReferenceRequired: nativeWrite,
      writeRollbackPlanReferenceSafeRequired: nativeWrite,
      writeRollbackPlanBoundRequired: nativeWrite,
      writeRollbackPlanShapeOnlyRequired: nativeWrite,
      writeRollbackApplyRequiresGovernedFollowup: nativeWrite,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false,
      automaticRollbackAppliedByBridge: false,
      postCommitFailureDisposition: nativeWrite ? 'rollback_required_not_applied' : 'not_applicable',
      postCommitFailureApplyPolicy: nativeWrite ? 'manual_governed_followup_required' : 'not_applicable',
      postCommitFailureReasonCodes: nativeWrite
        ? [...GOVERNED_NATIVE_BRIDGE_ROLLBACK_REASON_CODES]
        : [],
      rollbackApplyAttemptedByBridge: false
    },
    adapterRevalidation: {
      enabledForNativeDelegation: nativeBridgeEligible,
      requiredGateBooleans: nativeBridgeEligible
        ? [
            'trusted_execution_context_supplied',
            'trusted_execution_context_accepted',
            'trusted_execution_context_scope_matched'
          ]
        : [],
      exactApprovalSafetyBooleans: nativeWrite
        ? [
            'exact_approval_scope_references_safe',
            'exact_approval_scope_visibility_accepted',
            'exact_approval_runtime_target_reference_safe',
            'exact_approval_runtime_target_kind_accepted',
            'exact_approval_runtime_target_primary_runtime_accepted',
            'exact_approval_rollback_plan_reference_present',
            'exact_approval_rollback_plan_reference_safe'
          ]
        : []
    },
    disclosure: {
      rawMemoryReturned: false,
      tokenMaterialReturned: false,
      endpointReturned: false,
      nativeFieldNamesReturned: false
    }
  };
}

function normalizePublicToolNameSet(values = []) {
  return new Set(
    (Array.isArray(values) ? values : [])
      .map(value => String(value || '').trim())
      .filter(Boolean)
  );
}

function getPublicToolNameSet(config = {}) {
  if (String(config.securityProfile || '').trim().toLowerCase() === 'hardened') {
    return new Set(DEFAULT_PUBLIC_MCP_READ_TOOLS);
  }

  const explicitTools = normalizePublicToolNameSet(config.mcpPublicToolNames);
  if (explicitTools.size > 0) {
    return explicitTools;
  }

  const toolNames = new Set(DEFAULT_PUBLIC_MCP_READ_TOOLS);
  const surface = String(config.mcpPublicToolSurface || 'read_only').trim().toLowerCase();
  if (
    config.exposeControlledMutationMcpTools === true ||
    surface === 'controlled_mutation' ||
    surface === 'full'
  ) {
    for (const toolName of CONTROLLED_MUTATION_MCP_TOOLS) {
      toolNames.add(toolName);
    }
  }
  if (
    config.exposeWriteMcpTools === true ||
    surface === 'write' ||
    surface === 'full'
  ) {
    for (const toolName of WRITE_MCP_TOOLS) {
      toolNames.add(toolName);
    }
  }
  return toolNames;
}

function getPublicToolDefinitions(config = {}) {
  const publicToolNames = getPublicToolNameSet(config);
  return TOOL_DEFINITIONS.filter(tool => publicToolNames.has(tool.name));
}

function isPublicMcpToolExposed(toolName, config = {}) {
  return getPublicToolNameSet(config).has(toolName);
}

function buildMcpToolNotExposedErrorData(toolName) {
  return {
    code: 'mcp_tool_not_exposed',
    status: 'rejected',
    reason: 'tool_not_in_current_mcp_surface',
    toolName: typeof toolName === 'string' ? toolName : 'unknown',
    lowDisclosure: true
  };
}

function buildInstructions(config = {}) {
  const exposedTools = getPublicToolDefinitions(config).map(tool => tool.name);
  const exposesOnlyReadTools = exposedTools.every(toolName => DEFAULT_PUBLIC_MCP_READ_TOOLS.includes(toolName));
  if (exposesOnlyReadTools) {
    return 'Current MCP surface is read-only plus proposal-only by default. Use prepare_memory_context at task start, propose_memory_delta for proposal-only task-end memory deltas, search_memory for bounded recall, memory_overview for bridge observability, and audit_memory for readonly bounded audit explanations. Governed native-memory calls carry trusted execution context and disclosure budget through params._meta.codexMemoryGovernance, never through tool arguments. Controlled mutation or write tools are hidden and adapter-blocked unless an operator profile explicitly exposes them.';
  }
  return 'Use exposed tools according to the configured MCP surface. Governed native-memory calls carry exact approval, rollback posture, audit receipt, and trusted execution context through params._meta.codexMemoryGovernance, never through tool arguments. Hidden tools are adapter-blocked even if the core application still supports them internally.';
}

function buildGovernedMcpServerMetadata(config = {}) {
  return {
    schemaVersion: 'codex_memory_governed_bridge_server_meta_v1',
    productGoal: {
      primaryRuntime: REQUIRED_PRIMARY_RUNTIME,
      primaryValue: REQUIRED_PRIMARY_VALUE,
      accessPath: REQUIRED_ACCESS_PATH,
      clients: [...REQUIRED_CLIENTS],
      governedDimensions: [...REQUIRED_GOVERNED_DIMENSIONS],
      localMemoryRole: [...REQUIRED_LOCAL_MEMORY_ROLE]
    },
    nativeBridge: {
      primaryRuntime: REQUIRED_PRIMARY_RUNTIME,
      primaryValue: REQUIRED_PRIMARY_VALUE,
      accessPath: REQUIRED_ACCESS_PATH,
      eligibleTools: {
        read: [...GOVERNED_NATIVE_READ_TOOLS],
        write: [...GOVERNED_NATIVE_WRITE_TOOLS]
      },
      gateMode: config.governedMcpVcpNativeBridgeGateMode || 'off',
      readDelegationMode: config.governedMcpVcpNativeReadDelegationMode || 'off',
      writeDelegationMode: config.governedMcpVcpNativeWriteDelegationMode || 'off',
      localMemoryRole: [...REQUIRED_LOCAL_MEMORY_ROLE],
      readinessClaimed: false
    },
    runtimeTarget: buildLowDisclosureRuntimeTargetMetadata(config),
    clientIdentity: {
      allowedClientIds: [...REQUIRED_CLIENTS],
      source: 'trusted_execution_context_or_transport',
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverrideTransportContext: false
    },
    scopeBoundary: {
      source: 'trusted_execution_context_or_transport',
      requiredFieldNames: ['project_id', 'scope_id', 'workspace_id', 'client_id', 'visibility'],
      acceptedVisibility: ['private', 'project', 'workspace'],
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverrideTransportContext: false,
      rawScopeValueReturned: false
    },
    invocationProfile: {
      source: 'bridge_tool_binding',
      transport: 'mcp',
      acceptedProfiles: [...GOVERNED_METADATA_INVOCATION_PROFILES],
      readProfile: 'governed_read_only',
      writeProfile: 'governed_bounded_write',
      readTools: [...GOVERNED_NATIVE_READ_TOOLS],
      writeTools: [...GOVERNED_NATIVE_WRITE_TOOLS],
      profileMustMatchToolDirection: true,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false,
      locatorOrSecretMaterialAllowed: false,
      adapterRevalidatesProfile: true,
      unsupportedInvocationMetadataPosture: 'fail_closed_without_partial_request_context'
    },
    readWriteAuthority: {
      source: 'bridge_tool_binding',
      readTools: [...GOVERNED_NATIVE_READ_TOOLS],
      writeTools: [...GOVERNED_NATIVE_WRITE_TOOLS],
      writePolicyForWriteTools: 'exact_approval',
      writeRequiresExactApproval: true,
      mixedReadWriteAllowed: false,
      unboundedWriteAllowed: false,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false,
      adapterRevalidatesAuthority: true,
      unsupportedAuthorityMetadataPosture: 'fail_closed_without_partial_request_context'
    },
    governanceTransport: {
      metadataPath: 'params._meta.codexMemoryGovernance',
      toolArgumentsMayCarryGovernance: false,
      requiredForNativeDelegation: [
        'trustedExecutionContext',
        'auditReceipt',
        'outputDisclosureBudget',
        'rollbackPosture'
      ],
      trustedExecutionContextMustMatchTransportContext: true,
      transportContextFieldsOverrideGovernanceMetadata: true,
      writeRequiresExactApproval: true,
      unsafeGovernanceMetadataPosture: 'fail_closed_without_partial_request_context'
    },
    outputDisclosureBudget: {
      source: 'bridge_gate_normalized_governance',
      bound: true,
      metadataPath: 'params._meta.codexMemoryGovernance.outputDisclosureBudget',
      acceptedLevels: [...GOVERNED_METADATA_DISCLOSURE_LEVELS],
      defaultLevel: 'summary',
      lowDisclosureRequired: true,
      rawOutputAllowed: false,
      toolArgumentsMayOverride: false,
      maxItems: 5,
      maxBytes: 4096,
      toolArgumentsMayIncreaseBudget: false,
      toolArgumentsMayRequestRawOutput: false,
      governanceMetadataMaySupplyBudget: true,
      governanceMetadataMayOverride: false,
      locatorOrSecretMaterialAllowed: false,
      overBudgetPosture: 'fail_closed_without_raw_output',
      overBudgetFallbackToRawOutput: false
    },
    auditReceipt: {
      source: 'bridge_gate_normalized_governance',
      requiredForNativeDelegation: true,
      lowDisclosure: true,
      lowDisclosureBound: true,
      metadataPath: 'params._meta.codexMemoryGovernance.auditReceipt',
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false,
      localReceiptEventType: 'governed_mcp_vcp_native_bridge_receipt',
      localFallbackReceiptEventType: 'governed_mcp_vcp_native_read_fallback_receipt',
      localFallbackRecordedEvidenceFields: [...GOVERNED_NATIVE_READ_FALLBACK_AUDIT_EVIDENCE_FIELDS],
      recordedEvidenceFields: [...GOVERNED_NATIVE_BRIDGE_AUDIT_EVIDENCE_FIELDS],
      recordsTrustedExecutionContextBooleans: true,
      recordsExactApprovalSafetyBooleans: true,
      recordsDelegationStatusReason: true,
      recordsNativeInvocationReceiptBinding: true,
      recordsNativeInvocationGovernanceMetadataBinding: true,
      recordsScopeFingerprint: true,
      recordsScopeFieldNames: true,
      recordsScopeIdentifierFieldNames: true,
      recordsOutputBudgetBuckets: true,
      recordsRawOutputPolicy: true,
      recordsAuditReceiptLowDisclosureBooleans: true,
      recordsRollbackEvidence: true,
      recordsRollbackPlanSafetyBooleans: true,
      recordsRollbackReasonCode: true,
      recordsNativeInvocationShapeBuckets: true,
      recordsLocalFallbackRole: true,
      recordsLocalFallbackSourceRuntime: true,
      recordsLocalFallbackAuthorization: true,
      recordsLocalFallbackAuditReceiptStatus: true,
      recordsLocalFallbackNativeReadFailureBuckets: true,
      recordsLocalFallbackNativeResultBoundary: true,
      rawScopePersisted: false,
      rawRequestBodyPersisted: false,
      rawResponseBodyPersisted: false,
      rawNativePayloadPersisted: false,
      rawPayloadPersisted: false
    },
    rollbackPosture: {
      source: 'bridge_gate_normalized_governance',
      bound: true,
      metadataPath: 'params._meta.codexMemoryGovernance.rollbackPosture',
      defaultReadPosture: 'no_runtime_state_to_rollback',
      acceptedReadPostures: [...GOVERNED_METADATA_READ_ROLLBACK_POSTURES],
      acceptedWritePostures: [...GOVERNED_METADATA_WRITE_ROLLBACK_POSTURES],
      readRollbackPlanReferenceAllowed: false,
      readRollbackDisposition: 'no_runtime_write_to_rollback',
      writeRollbackPlanReferenceRequired: true,
      writeRollbackPlanReferenceSafeRequired: true,
      writeRollbackPlanBoundRequired: true,
      writeRollbackPlanShapeOnlyRequired: true,
      writeRollbackApplyRequiresGovernedFollowup: true,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false,
      automaticRollbackAppliedByBridge: false,
      postCommitFailureDisposition: 'rollback_required_not_applied',
      postCommitFailureApplyPolicy: 'manual_governed_followup_required',
      postCommitFailureReasonCodes: [...GOVERNED_NATIVE_BRIDGE_ROLLBACK_REASON_CODES],
      rollbackApplyAttemptedByBridge: false
    },
    disclosure: {
      serverHandshakeLowDisclosure: true,
      rawMemoryReturned: false,
      tokenMaterialReturned: false,
      endpointReturned: false,
      locatorReturned: false
    }
  };
}

function buildToolDefinitionForList(toolDefinition, config = {}) {
  return {
    ...toolDefinition,
    _meta: {
      ...(isPlainObject(toolDefinition._meta) ? toolDefinition._meta : {}),
      codexMemoryGovernedBridge: buildGovernedMcpToolMetadata(toolDefinition.name, config)
    }
  };
}

function pickReferenceCandidate(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value !== 'string') continue;
    const normalized = value.trim();
    if (normalized) return normalized;
  }
  return undefined;
}

function pickSafeReferenceString(source, keys, invalidFields, fieldName) {
  const value = pickReferenceCandidate(source, keys);
  if (value === undefined) return undefined;
  if (isSafeReferenceName(value)) return value;
  if (Array.isArray(invalidFields) && fieldName) invalidFields.push(fieldName);
  return undefined;
}

function pickGovernedEnumString(source, keys, allowedValues, invalidFields, fieldName) {
  const value = pickReferenceCandidate(source, keys);
  if (value === undefined) return undefined;
  if (allowedValues.includes(value)) return value;
  if (Array.isArray(invalidFields) && fieldName) invalidFields.push(fieldName);
  return undefined;
}

function pickGovernedVisibilityString(source, keys, invalidFields, fieldName) {
  const value = pickReferenceCandidate(source, keys);
  if (value === undefined) return undefined;
  if (['private', 'project', 'workspace'].includes(value)) return value;
  if (Array.isArray(invalidFields) && fieldName) invalidFields.push(fieldName);
  return undefined;
}

function normalizeGovernedMcpBoolean(value, invalidFields, fieldName) {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') {
    invalidFields.push(fieldName);
    return undefined;
  }
  return value;
}

function normalizeGovernedMcpString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeGovernedMetadataKey(key) {
  return typeof key === 'string'
    ? key.toLowerCase().replace(/[^a-z0-9]/g, '')
    : '';
}

function isForbiddenGovernedMetadataLocatorOrSecretKey(key, value) {
  const normalizedKey = normalizeGovernedMetadataKey(key);
  if (GOVERNED_METADATA_NEGATIVE_EVIDENCE_KEYS.has(normalizedKey) && value === false) {
    return false;
  }
  return GOVERNED_METADATA_FORBIDDEN_KEY_NORMAL_FORMS.has(normalizedKey) ||
    GOVERNED_METADATA_FORBIDDEN_KEY_CONTAINS.some(pattern => normalizedKey.includes(pattern)) ||
    GOVERNED_METADATA_FORBIDDEN_KEY_SUFFIXES.some(suffix => normalizedKey.endsWith(suffix));
}

function hasForbiddenGovernedMetadataLocatorOrSecretField(value, options = {}) {
  if (Array.isArray(value)) {
    return value.some(item => hasForbiddenGovernedMetadataLocatorOrSecretField(item, options));
  }
  if (!isPlainObject(value)) return false;
  const ignoredRootKeys = options.ignoredRootKeys instanceof Set ? options.ignoredRootKeys : null;
  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = normalizeGovernedMetadataKey(key);
    if (ignoredRootKeys?.has(normalizedKey)) continue;
    if (isForbiddenGovernedMetadataLocatorOrSecretKey(key, nestedValue)) return true;
    if (hasForbiddenGovernedMetadataLocatorOrSecretField(nestedValue)) return true;
  }
  return false;
}

function firstGovernedMcpString(source, keys) {
  if (!isPlainObject(source)) return '';
  for (const key of keys) {
    const normalized = normalizeGovernedMcpString(source[key]);
    if (normalized) return normalized;
  }
  return '';
}

function normalizeExactApprovalResult(value, invalidFields) {
  if (value === undefined) return undefined;
  if (!isPlainObject(value)) {
    invalidFields.push('exactApprovalResult');
    return undefined;
  }

  const accepted = normalizeGovernedMcpBoolean(
    value.accepted,
    invalidFields,
    'exactApprovalResult.accepted'
  );
  if (accepted === undefined) return undefined;

  const scope = isPlainObject(value.allowedScope)
    ? value.allowedScope
    : isPlainObject(value.allowed_scope)
      ? value.allowed_scope
      : isPlainObject(value.approvedScope)
        ? value.approvedScope
        : isPlainObject(value.approved_scope)
          ? value.approved_scope
          : isPlainObject(value.scope)
            ? value.scope
            : null;
  const scopeAliases = [
    value.allowedScope,
    value.allowed_scope,
    value.approvedScope,
    value.approved_scope,
    value.scope
  ];
  if (scopeAliases.some(candidate => candidate !== undefined && !isPlainObject(candidate))) {
    invalidFields.push('exactApprovalResult.allowedScope');
  }
  const runtimeTarget = isPlainObject(value.runtimeTarget)
    ? value.runtimeTarget
    : isPlainObject(value.runtime_target)
      ? value.runtime_target
      : isPlainObject(value.allowedRuntimeTarget)
        ? value.allowedRuntimeTarget
        : isPlainObject(value.allowed_runtime_target)
          ? value.allowed_runtime_target
          : isPlainObject(value.approvedRuntimeTarget)
            ? value.approvedRuntimeTarget
            : isPlainObject(value.approved_runtime_target)
              ? value.approved_runtime_target
              : null;
  const runtimeTargetAliases = [
    value.runtimeTarget,
    value.runtime_target,
    value.allowedRuntimeTarget,
    value.allowed_runtime_target,
    value.approvedRuntimeTarget,
    value.approved_runtime_target
  ];
  if (runtimeTargetAliases.some(candidate => candidate !== undefined && !isPlainObject(candidate))) {
    invalidFields.push('exactApprovalResult.runtimeTarget');
  }
  if (hasForbiddenGovernedMetadataLocatorOrSecretField(value, {
    ignoredRootKeys: GOVERNED_METADATA_EXACT_APPROVAL_RUNTIME_TARGET_KEYS
  })) {
    invalidFields.push('exactApprovalResult.forbiddenField');
  }
  if (hasForbiddenGovernedMetadataLocatorOrSecretField(runtimeTarget)) {
    invalidFields.push('exactApprovalResult.runtimeTarget.forbiddenField');
  }
  const rollbackPosture = isPlainObject(value.rollbackPosture)
    ? value.rollbackPosture
    : isPlainObject(value.rollback_posture)
      ? value.rollback_posture
      : {};
  const scopeId = pickSafeReferenceString(
    scope,
    ['scope_id', 'scopeId'],
    invalidFields,
    'exactApprovalResult.allowedScope.scope_id'
  );
  const projectId = pickSafeReferenceString(
    scope,
    ['project_id', 'projectId'],
    invalidFields,
    'exactApprovalResult.allowedScope.project_id'
  );
  const workspaceId = pickSafeReferenceString(
    scope,
    ['workspace_id', 'workspaceId'],
    invalidFields,
    'exactApprovalResult.allowedScope.workspace_id'
  );
  const clientId = pickSafeReferenceString(
    scope,
    ['client_id', 'clientId'],
    invalidFields,
    'exactApprovalResult.allowedScope.client_id'
  );
  const scopeVisibility = pickGovernedVisibilityString(
    scope,
    ['visibility'],
    invalidFields,
    'exactApprovalResult.allowedScope.visibility'
  );
  const directRollbackPlanRefAliases = [
    value.allowedRollbackPlanRef,
    value.allowed_rollback_plan_ref,
    value.approvedRollbackPlanRef,
    value.approved_rollback_plan_ref,
    value.rollbackPlanRef,
    value.rollback_plan_ref
  ];
  if (directRollbackPlanRefAliases.some(candidate => candidate !== undefined && typeof candidate !== 'string')) {
    invalidFields.push('exactApprovalResult.rollbackPlanRef');
  }
  const rollbackPosturePlanRefAliases = [
    rollbackPosture.rollback_plan_ref,
    rollbackPosture.rollbackPlanRef,
    rollbackPosture.plan_ref,
    rollbackPosture.planRef
  ];
  if (rollbackPosturePlanRefAliases.some(candidate => candidate !== undefined && typeof candidate !== 'string')) {
    invalidFields.push('exactApprovalResult.rollbackPosture.rollback_plan_ref');
  }
  const rollbackPlanRef = pickSafeReferenceString(value, [
    'allowedRollbackPlanRef',
    'allowed_rollback_plan_ref',
    'approvedRollbackPlanRef',
    'approved_rollback_plan_ref',
    'rollbackPlanRef',
    'rollback_plan_ref'
  ], invalidFields, 'exactApprovalResult.rollbackPlanRef') || pickSafeReferenceString(rollbackPosture, [
    'rollback_plan_ref',
    'rollbackPlanRef',
    'plan_ref',
    'planRef'
  ], invalidFields, 'exactApprovalResult.rollbackPosture.rollback_plan_ref');
  const runtimeTargetReferenceName = pickSafeReferenceString(runtimeTarget, [
    'target_reference_name',
    'targetReferenceName',
    'reference_name',
    'referenceName'
  ], invalidFields, 'exactApprovalResult.runtimeTarget.targetReferenceName');
  const allowedAction = pickGovernedEnumString(
    value,
    ['allowedAction', 'allowed_action'],
    GOVERNED_NATIVE_WRITE_APPROVAL_ACTION_VALUES,
    invalidFields,
    'exactApprovalResult.allowedAction'
  );
  const runtimeTargetKind = pickGovernedEnumString(
    runtimeTarget,
    ['target_kind', 'targetKind'],
    GOVERNED_METADATA_RUNTIME_TARGET_KINDS,
    invalidFields,
    'exactApprovalResult.runtimeTarget.targetKind'
  );
  const primaryRuntime = pickGovernedEnumString(
    runtimeTarget,
    ['target', 'target_name', 'targetName', 'primaryRuntime', 'primary_runtime'],
    GOVERNED_METADATA_PRIMARY_RUNTIMES,
    invalidFields,
    'exactApprovalResult.runtimeTarget.primaryRuntime'
  );
  const approvalId = pickSafeReferenceString(
    value,
    ['approvalId', 'approval_id', 'id'],
    invalidFields,
    'exactApprovalResult.approvalId'
  );
  const approvedAt = pickSafeReferenceString(
    value,
    ['approvedAt', 'approved_at'],
    invalidFields,
    'exactApprovalResult.approvedAt'
  );

  return {
    accepted,
    ...(allowedAction ? {
      allowedAction
    } : {}),
    ...(scope ? {
      allowedScope: {
        ...(scopeId ? {
          scope_id: scopeId
        } : {}),
        ...(projectId ? {
          project_id: projectId
        } : {}),
        ...(workspaceId ? {
          workspace_id: workspaceId
        } : {}),
        ...(clientId ? {
          client_id: clientId
        } : {}),
        ...(scopeVisibility ? {
          visibility: scopeVisibility
        } : {})
      }
    } : {}),
    ...(runtimeTarget ? {
      runtimeTarget: {
        ...(runtimeTargetReferenceName ? {
          targetReferenceName: runtimeTargetReferenceName
        } : {}),
        ...(runtimeTargetKind ? {
          targetKind: runtimeTargetKind
        } : {}),
        ...(primaryRuntime ? {
          primaryRuntime
        } : {})
      }
    } : {}),
    ...(rollbackPlanRef ? {
      rollbackPlanRef
    } : {}),
    ...(approvalId ? {
      approvalId
    } : {}),
    ...(approvedAt ? {
      approvedAt
    } : {})
  };
}

function normalizeRollbackPosture(value, invalidFields) {
  if (value === undefined) return undefined;
  if (!isPlainObject(value)) {
    invalidFields.push('rollbackPosture');
    return undefined;
  }
  if (hasForbiddenGovernedMetadataLocatorOrSecretField(value)) {
    invalidFields.push('rollbackPosture.forbiddenField');
  }
  const rollbackPlanRef = pickSafeReferenceString(
    value,
    ['rollback_plan_ref', 'rollbackPlanRef', 'plan_ref', 'planRef'],
    invalidFields,
    'rollbackPosture.rollback_plan_ref'
  );
  const mode = pickGovernedEnumString(
    value,
    ['mode', 'posture', 'rollback_posture'],
    GOVERNED_METADATA_ROLLBACK_POSTURES,
    invalidFields,
    'rollbackPosture.mode'
  );

  return {
    ...(mode ? {
      mode
    } : {}),
    ...(rollbackPlanRef ? {
      rollback_plan_ref: rollbackPlanRef
    } : {})
  };
}

function normalizeAuditReceipt(value, invalidFields) {
  if (value === undefined) return undefined;
  if (!isPlainObject(value)) {
    invalidFields.push('auditReceipt');
    return undefined;
  }
  if (hasForbiddenGovernedMetadataLocatorOrSecretField(value)) {
    invalidFields.push('auditReceipt.forbiddenField');
  }
  const receiptId = pickSafeReferenceString(
    value,
    ['receipt_id', 'receiptId', 'receipt_plan_id', 'receiptPlanId', 'correlation_id', 'correlationId'],
    invalidFields,
    'auditReceipt.receipt_id'
  );

  return {
    ...(receiptId ? {
      receipt_id: receiptId
    } : {})
  };
}

function normalizeGovernedMcpInteger(value, min, max, invalidFields, fieldName) {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    invalidFields.push(fieldName);
    return undefined;
  }
  return parsed;
}

function normalizeOutputDisclosureBudget(value, invalidFields) {
  if (value === undefined) return undefined;
  if (!isPlainObject(value)) {
    invalidFields.push('outputDisclosureBudget');
    return undefined;
  }
  if (hasForbiddenGovernedMetadataLocatorOrSecretField(value)) {
    invalidFields.push('outputDisclosureBudget.forbiddenField');
  }

  const level = pickGovernedEnumString(
    value,
    ['level', 'disclosure_level', 'disclosureLevel'],
    GOVERNED_METADATA_DISCLOSURE_LEVELS,
    invalidFields,
    'outputDisclosureBudget.level'
  );
  const lowDisclosure = normalizeGovernedMcpBoolean(
    value.low_disclosure ?? value.lowDisclosure,
    invalidFields,
    'outputDisclosureBudget.lowDisclosure'
  );
  const rawOutput = normalizeGovernedMcpBoolean(
    value.raw_output ??
      value.rawOutput ??
      value.raw_body ??
      value.rawBody ??
      value.full_output ??
      value.fullOutput,
    invalidFields,
    'outputDisclosureBudget.rawOutput'
  );
  const maxItems = normalizeGovernedMcpInteger(
    value.max_items ?? value.maxItems,
    0,
    5,
    invalidFields,
    'outputDisclosureBudget.maxItems'
  );
  const maxBytes = normalizeGovernedMcpInteger(
    value.max_bytes ?? value.maxBytes,
    0,
    4096,
    invalidFields,
    'outputDisclosureBudget.maxBytes'
  );

  return {
    ...(level ? {
      level
    } : {}),
    ...(lowDisclosure !== undefined ? {
      low_disclosure: lowDisclosure
    } : {}),
    ...(rawOutput !== undefined ? {
      raw_output: rawOutput
    } : {}),
    ...(maxItems !== undefined ? {
      max_items: maxItems
    } : {}),
    ...(maxBytes !== undefined ? {
      max_bytes: maxBytes
    } : {})
  };
}

function normalizeTrustedExecutionContext(value, invalidFields) {
  if (value === undefined) return undefined;
  if (!isPlainObject(value)) {
    invalidFields.push('trustedExecutionContext');
    return undefined;
  }
  const accepted = normalizeGovernedMcpBoolean(
    value.accepted,
    invalidFields,
    'trustedExecutionContext.accepted'
  );
  if (accepted === undefined) return undefined;

  const sourceContext = isPlainObject(value.executionContext) ? value.executionContext : {};
  if (hasForbiddenGovernedMetadataLocatorOrSecretField(value)) {
    invalidFields.push('trustedExecutionContext.forbiddenField');
  }
  const agentAlias = pickSafeReferenceString(
    sourceContext,
    ['agentAlias', 'agent_alias'],
    invalidFields,
    'trustedExecutionContext.executionContext.agentAlias'
  );
  const agentId = pickSafeReferenceString(
    sourceContext,
    ['agentId', 'agent_id'],
    invalidFields,
    'trustedExecutionContext.executionContext.agentId'
  );
  const requestSource = pickSafeReferenceString(
    sourceContext,
    ['requestSource', 'request_source'],
    invalidFields,
    'trustedExecutionContext.executionContext.requestSource'
  );
  const clientId = pickSafeReferenceString(
    sourceContext,
    ['clientId', 'client_id'],
    invalidFields,
    'trustedExecutionContext.executionContext.clientId'
  );
  const projectId = pickSafeReferenceString(
    sourceContext,
    ['projectId', 'project_id'],
    invalidFields,
    'trustedExecutionContext.executionContext.projectId'
  );
  const workspaceId = pickSafeReferenceString(
    sourceContext,
    ['workspaceId', 'workspace_id'],
    invalidFields,
    'trustedExecutionContext.executionContext.workspaceId'
  );
  const scopeId = pickSafeReferenceString(
    sourceContext,
    ['scopeId', 'scope_id'],
    invalidFields,
    'trustedExecutionContext.executionContext.scopeId'
  );
  const visibility = pickGovernedVisibilityString(
    sourceContext,
    ['visibility'],
    invalidFields,
    'trustedExecutionContext.executionContext.visibility'
  );

  return {
    accepted,
    executionContext: {
      ...(agentAlias ? {
        agentAlias
      } : {}),
      ...(agentId ? {
        agentId
      } : {}),
      ...(requestSource ? {
        requestSource
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
      ...(visibility ? {
        visibility
      } : {})
    }
  };
}

function collectUnsupportedGovernedMetadataFields(governanceMeta) {
  if (!isPlainObject(governanceMeta)) return [];
  const accepted = new Set(GOVERNED_METADATA_ACCEPTED_FIELD_NAMES);
  const invalidFields = new Set();

  for (const key of Object.keys(governanceMeta)) {
    if (accepted.has(key)) continue;
    invalidFields.add(
      GOVERNED_METADATA_REJECTED_FIELD_PROJECTIONS[key] ||
        'codexMemoryGovernance.unsupportedField'
    );
  }

  return [...invalidFields];
}

const TRUSTED_CONTEXT_TRANSPORT_FIELD_ALIASES = Object.freeze({
  agentAlias: ['agentAlias', 'agent_alias'],
  agentId: ['agentId', 'agent_id'],
  requestSource: ['requestSource', 'request_source'],
  clientId: ['clientId', 'client_id'],
  projectId: ['projectId', 'project_id'],
  scopeId: ['scopeId', 'scope_id'],
  workspaceId: ['workspaceId', 'workspace_id'],
  visibility: ['visibility', 'visibility_policy']
});

function trustedContextFieldMatches(fieldName, metadataValue, transportValue) {
  if (fieldName === 'clientId' || fieldName === 'visibility') {
    return metadataValue.toLowerCase() === transportValue.toLowerCase();
  }
  return metadataValue === transportValue;
}

function collectTrustedContextTransportDriftFields(governedRequestContext = {}, requestContext = {}) {
  const trustedContext = isPlainObject(governedRequestContext.trustedExecutionContext)
    ? governedRequestContext.trustedExecutionContext
    : null;
  const metadataExecutionContext = isPlainObject(trustedContext?.executionContext)
    ? trustedContext.executionContext
    : null;
  const transportExecutionContext = isPlainObject(requestContext.executionContext)
    ? requestContext.executionContext
    : null;
  if (!metadataExecutionContext || !transportExecutionContext) return [];

  const invalidFields = [];
  for (const [fieldName, aliases] of Object.entries(TRUSTED_CONTEXT_TRANSPORT_FIELD_ALIASES)) {
    const metadataValue = firstGovernedMcpString(metadataExecutionContext, aliases);
    const transportValue = firstGovernedMcpString(transportExecutionContext, aliases);
    if (!metadataValue || !transportValue) continue;
    if (!trustedContextFieldMatches(fieldName, metadataValue, transportValue)) {
      invalidFields.push(`trustedExecutionContext.executionContext.${fieldName}`);
    }
  }
  return invalidFields;
}

function transportExecutionContextProjection(requestContext = {}) {
  const transportExecutionContext = isPlainObject(requestContext.executionContext)
    ? requestContext.executionContext
    : null;
  if (!transportExecutionContext) return {};

  const output = {};
  for (const [fieldName, aliases] of Object.entries(TRUSTED_CONTEXT_TRANSPORT_FIELD_ALIASES)) {
    const value = firstGovernedMcpString(transportExecutionContext, aliases);
    if (value) output[fieldName] = value;
  }
  return output;
}

function bindGovernedTrustedExecutionContextToTransport(governedRequestContext = {}, requestContext = {}) {
  const trustedContext = isPlainObject(governedRequestContext.trustedExecutionContext)
    ? governedRequestContext.trustedExecutionContext
    : null;
  const transportProjection = transportExecutionContextProjection(requestContext);
  if (!trustedContext || Object.keys(transportProjection).length === 0) {
    return governedRequestContext;
  }

  const metadataExecutionContext = isPlainObject(trustedContext.executionContext)
    ? trustedContext.executionContext
    : {};

  return {
    ...governedRequestContext,
    trustedExecutionContext: {
      ...trustedContext,
      executionContext: {
        ...metadataExecutionContext,
        ...transportProjection
      }
    }
  };
}

function buildGovernedMcpRequestContextFromParams(params = {}) {
  const meta = isPlainObject(params?._meta) ? params._meta : {};
  const governanceMeta = isPlainObject(meta.codexMemoryGovernance)
    ? meta.codexMemoryGovernance
    : isPlainObject(meta.codex_memory_governance)
      ? meta.codex_memory_governance
      : null;
  if (!governanceMeta) {
    return {
      accepted: true,
      requestContext: {},
      invalidFields: []
    };
  }

  const invalidFields = collectUnsupportedGovernedMetadataFields(governanceMeta);
  const requestContext = {};
  const exactApprovalResult = normalizeExactApprovalResult(
    governanceMeta.exactApprovalResult ?? governanceMeta.exact_approval_result,
    invalidFields
  );
  const rollbackPosture = normalizeRollbackPosture(
    governanceMeta.rollbackPosture ?? governanceMeta.rollback_posture,
    invalidFields
  );
  const auditReceipt = normalizeAuditReceipt(
    governanceMeta.auditReceipt ?? governanceMeta.audit_receipt,
    invalidFields
  );
  const outputDisclosureBudget = normalizeOutputDisclosureBudget(
    governanceMeta.outputDisclosureBudget ?? governanceMeta.output_disclosure_budget,
    invalidFields
  );
  const trustedExecutionContext = normalizeTrustedExecutionContext(
    governanceMeta.trustedExecutionContext ?? governanceMeta.trusted_execution_context,
    invalidFields
  );

  if (invalidFields.length > 0) {
    return {
      accepted: false,
      requestContext: {},
      invalidFields
    };
  }

  if (exactApprovalResult) requestContext.exactApprovalResult = exactApprovalResult;
  if (rollbackPosture) requestContext.rollbackPosture = rollbackPosture;
  if (auditReceipt) requestContext.auditReceipt = auditReceipt;
  if (outputDisclosureBudget) requestContext.outputDisclosureBudget = outputDisclosureBudget;
  if (trustedExecutionContext) requestContext.trustedExecutionContext = trustedExecutionContext;

  return {
    accepted: true,
    requestContext,
    invalidFields
  };
}

function buildGovernedMcpEffectiveRequestContext(requestContext = {}, governedRequestContext = {}) {
  const invalidFields = collectTrustedContextTransportDriftFields(governedRequestContext, requestContext);
  if (invalidFields.length > 0) {
    return {
      accepted: false,
      requestContext: {},
      invalidFields
    };
  }
  const transportBoundGovernedRequestContext = bindGovernedTrustedExecutionContextToTransport(
    governedRequestContext,
    requestContext
  );

  return {
    accepted: true,
    requestContext: {
      ...requestContext,
      ...transportBoundGovernedRequestContext
    },
    invalidFields: []
  };
}

function appendToolErrorLog(app, toolName, error) {
  const logPath = app?.config?.httpLogPath;
  if (!logPath) return;

  const message = redactSensitiveFragments(error?.stack || error?.message || String(error));
  const line = `[${new Date().toISOString()}] ERROR tool ${toolName} failed: ${message}\n`;
  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, line, 'utf8');
  } catch {
    // Keep JSON-RPC error handling independent from diagnostics.
  }
}

function redactJsonRpcErrorDataValue(value, key = '') {
  if (Array.isArray(value)) {
    return value.map(item => redactJsonRpcErrorDataValue(item));
  }
  if (isPlainObject(value)) {
    const redacted = {};
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      redacted[nestedKey] = redactJsonRpcErrorDataValue(nestedValue, nestedKey);
    }
    return redacted;
  }
  if (typeof value === 'string') {
    if (isForbiddenGovernedMetadataLocatorOrSecretKey(key, value)) {
      return '<redacted>';
    }
    return redactSensitiveFragments(value);
  }
  if (isForbiddenGovernedMetadataLocatorOrSecretKey(key, value)) {
    return '<redacted>';
  }
  return value;
}

function negotiateProtocolVersion(requestedVersion) {
  if (typeof requestedVersion === 'string' && SUPPORTED_PROTOCOL_VERSIONS.has(requestedVersion)) {
    return requestedVersion;
  }
  return DEFAULT_PROTOCOL_VERSION;
}

class CodexMemoryMcpServer {
  constructor({ app }) {
    this.app = app;
    this.sessions = new Map();
  }

  createSession(existingId = null) {
    const sessionId = existingId || crypto.randomUUID();
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {});
    }
    return sessionId;
  }

  _handleInternalError(id, toolName, error, code = -32603, message = 'Internal error') {
    const requestId = `cm-${crypto.randomUUID().slice(0, 8)}`;
    appendToolErrorLog(this.app, toolName || 'unknown', error);

    const data = { requestId };
    if (error?.jsonRpcData && typeof error.jsonRpcData === 'object' && !Array.isArray(error.jsonRpcData)) {
      for (const [key, value] of Object.entries(error.jsonRpcData)) {
        data[key] = redactJsonRpcErrorDataValue(value, key);
      }
    }

    return {
      response: jsonRpcError(id, code, message, data)
    };
  }

  async handleJsonRpc(body, requestContext = {}) {
    const { id = null, method, params = {} } = body || {};

    if (typeof method !== 'string' || !method.trim()) {
      return { response: jsonRpcError(id, -32600, 'Invalid Request', 'method must be a non-empty string') };
    }

    if (method === 'initialize') {
      const sessionId = this.createSession(requestContext.sessionId || null);
      const protocolVersion = negotiateProtocolVersion(params?.protocolVersion);
      return {
        sessionId,
        response: jsonRpcSuccess(id, {
          protocolVersion,
          capabilities: {
            tools: { listChanged: true },
            resources: { subscribe: false, listChanged: true }
          },
          serverInfo: {
            name: SERVER_NAME,
            version: this.app.config.serverVersion
          },
          _meta: {
            codexMemoryGovernedBridge: buildGovernedMcpServerMetadata(this.app.config)
          },
          instructions: buildInstructions(this.app.config)
        })
      };
    }

    if (method === 'notifications/initialized') {
      return { notification: true };
    }

    if (method === 'ping') {
      return { response: jsonRpcSuccess(id, {}) };
    }

    if (method === 'tools/list') {
      return {
        response: jsonRpcSuccess(id, {
          tools: getPublicToolDefinitions(this.app.config)
            .map(tool => buildToolDefinitionForList(tool, this.app.config))
        })
      };
    }

    if (method === 'resources/list') {
      return {
        response: jsonRpcSuccess(id, {
          resources: []
        })
      };
    }

    if (method === 'resources/templates/list') {
      return {
        response: jsonRpcSuccess(id, {
          resourceTemplates: []
        })
      };
    }

    if (method === 'tools/call') {
      if (!params?.name || typeof params.name !== 'string') {
        return { response: jsonRpcError(id, -32602, 'Invalid params', 'tools/call requires a tool name') };
      }

      if (!isPublicMcpToolExposed(params.name, this.app.config)) {
        return {
          response: jsonRpcError(id, -32001, 'Forbidden', buildMcpToolNotExposedErrorData(params.name))
        };
      }

      const args = params.arguments || {};
      if (!args || typeof args !== 'object' || Array.isArray(args)) {
        return { response: jsonRpcError(id, -32602, 'Invalid params', 'tools/call arguments must be an object') };
      }

      try {
        validateToolArguments(params.name, args);
        const governedRequestContext = buildGovernedMcpRequestContextFromParams(params);
        if (governedRequestContext.accepted !== true) {
          return {
            response: jsonRpcError(id, -32602, 'Invalid params', {
              code: 'invalid_governed_mcp_metadata',
              invalidFields: governedRequestContext.invalidFields
            })
          };
        }
        const effectiveRequestContext = buildGovernedMcpEffectiveRequestContext(
          requestContext,
          governedRequestContext.requestContext
        );
        if (effectiveRequestContext.accepted !== true) {
          return {
            response: jsonRpcError(id, -32602, 'Invalid params', {
              code: 'invalid_governed_mcp_metadata',
              invalidFields: effectiveRequestContext.invalidFields
            })
          };
        }
        const payload = await this.app.callTool(params.name, args, effectiveRequestContext.requestContext);
        const isError = payload?.decision === 'rejected';
        return {
          response: jsonRpcSuccess(id, formatToolResult(payload, isError))
        };
      } catch (error) {
        if (error instanceof ToolArgumentValidationError) {
          return {
            response: jsonRpcError(id, -32602, 'Invalid params', error.message)
          };
        }
        if (Number.isInteger(error?.jsonRpcCode)) {
          return this._handleInternalError(id, params.name, error, error.jsonRpcCode, error.jsonRpcMessage || 'Tool error');
        }
        return this._handleInternalError(id, params.name, error);
      }
    }

    return { response: jsonRpcError(id, -32601, 'Method not found', method) };
  }
}

module.exports = {
  CodexMemoryMcpServer,
  buildGovernedMcpServerMetadata,
  buildGovernedMcpEffectiveRequestContext,
  buildMcpToolNotExposedErrorData,
  buildGovernedMcpToolMetadata,
  buildGovernedMcpRequestContextFromParams,
  buildToolDefinitionForList,
  formatToolResult,
  getPublicToolDefinitions,
  isPublicMcpToolExposed,
  jsonRpcError,
  jsonRpcSuccess
};
