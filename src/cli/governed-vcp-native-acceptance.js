#!/usr/bin/env node
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../app');
const { createConfig } = require('../config/createConfig');
const {
  REQUIRED_PRIMARY_RUNTIME
} = require('../core/CurrentProductGoalContract');
const {
  getGovernedMcpVcpNativeHttpMcpTargetPrivateConfig
} = require('../core/GovernedMcpVcpNativeHttpMcpTargetConfig');

const DEFAULT_TARGET_REFERENCE_NAME = 'operator-vcp-toolbox-service-ref';
const DEFAULT_PROJECT_ID = 'codex-memory';
const DEFAULT_WORKSPACE_ID = 'workspace-alpha';
const DEFAULT_VISIBILITY = 'private';
const DEFAULT_ROLLBACK_PLAN_REF = 'cm-governed-write-rollback-plan';
const GOVERNANCE_METADATA_PATH = 'params._meta.codexMemoryGovernance';
const MCP_PREFLIGHT_NATIVE_TOOL_NAMES = Object.freeze([
  'knowledge_base.search',
  'knowledge_base.record',
  'knowledge_base.write',
  'knowledge_base.tombstone',
  'knowledge_base.supersede'
]);
const ACCEPTANCE_OPERATION_KEYS = Object.freeze([
  'read',
  'memoryOverview',
  'audit',
  'write',
  'tombstone',
  'supersede'
]);
const READ_ACCEPTANCE_TOOLS = Object.freeze([
  'search_memory',
  'memory_overview',
  'audit_memory'
]);
const WRITE_ACCEPTANCE_TOOLS = Object.freeze([
  'record_memory',
  'tombstone_memory',
  'supersede_memory'
]);
const WRITE_TOOL_EXACT_APPROVAL_ACTIONS = Object.freeze({
  record_memory: 'live_bridge_record_memory_proof',
  tombstone_memory: 'live_bridge_tombstone_memory_proof',
  supersede_memory: 'live_bridge_supersede_memory_proof'
});
const ALLOWED_NATIVE_JSON_RPC_ERROR_REASON_CODES = Object.freeze([
  'invalid_governance_metadata',
  'native_mutation_tool_unavailable',
  'native_runtime_call_failed',
  'native_tool_public_binding_mismatch',
  'native_write_disabled',
  'unsupported_native_tool'
]);

function parseArgs(argv = [], env = process.env) {
  const options = {
    json: false,
    includeWrite: false,
    includeWriteSuite: false,
    includeReadSuite: false,
    endpoint: env.CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_ENDPOINT || '',
    bearerToken: env.CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_TOKEN || '',
    targetReferenceName:
      env.CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_TARGET_REFERENCE_NAME ||
      env.CODEX_MEMORY_VCP_NATIVE_TARGET_REFERENCE_NAME ||
      DEFAULT_TARGET_REFERENCE_NAME,
    toolNameByAction: env.CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_TOOL_NAME_BY_ACTION || '',
    timeoutMs: env.CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_TIMEOUT_MS || '',
    projectBasePath: env.CODEX_MEMORY_BASE_PATH || '',
    dataDir: env.CODEX_MEMORY_DATA_DIR || '',
    logsDir: env.CODEX_MEMORY_LOGS_DIR || '',
    projectId: env.CODEX_MEMORY_PROJECT_ID || DEFAULT_PROJECT_ID,
    workspaceId: env.CODEX_MEMORY_WORKSPACE_ID || DEFAULT_WORKSPACE_ID,
    scopeId: env.CODEX_MEMORY_SCOPE_ID || '',
    visibility: env.CODEX_MEMORY_VISIBILITY || DEFAULT_VISIBILITY,
    query: 'codex memory governed native acceptance probe',
    limit: 1,
    writeTitle: 'codex-memory governed native acceptance probe',
    writeContent: 'Low-disclosure governed native bridge acceptance probe from Codex.',
    writeEvidence: 'Acceptance command explicitly requested governed native record_memory delegation.',
    tombstoneMemoryId: 'codex-memory-governed-native-acceptance-record-ref',
    supersedeOldMemoryId: 'codex-memory-governed-native-acceptance-old-ref',
    supersedeNewMemoryId: 'codex-memory-governed-native-acceptance-new-ref',
    rollbackPlanRef: DEFAULT_ROLLBACK_PLAN_REF,
    evidenceOutputPath: '',
    verifyEvidencePath: ''
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--include-write') {
      options.includeWrite = true;
      continue;
    }
    if (token === '--include-write-suite') {
      options.includeWrite = true;
      options.includeWriteSuite = true;
      continue;
    }
    if (token === '--include-read-suite') {
      options.includeReadSuite = true;
      continue;
    }
    if (token === '--endpoint') {
      options.endpoint = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--token-env') {
      const envKey = argv[index + 1] || '';
      options.bearerToken = envKey ? env[envKey] || '' : '';
      index += 1;
      continue;
    }
    if (token === '--target-ref') {
      options.targetReferenceName = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--tool-map-json') {
      options.toolNameByAction = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--timeout-ms') {
      options.timeoutMs = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--base-path') {
      options.projectBasePath = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--data-dir') {
      options.dataDir = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--logs-dir') {
      options.logsDir = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--project-id') {
      options.projectId = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--workspace-id') {
      options.workspaceId = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--scope-id') {
      options.scopeId = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--visibility') {
      options.visibility = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--query') {
      options.query = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--limit') {
      options.limit = normalizePositiveInteger(argv[index + 1], options.limit);
      index += 1;
      continue;
    }
    if (token === '--write-title') {
      options.writeTitle = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--write-content') {
      options.writeContent = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--write-evidence') {
      options.writeEvidence = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--tombstone-memory-id') {
      options.tombstoneMemoryId = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--supersede-old-memory-id') {
      options.supersedeOldMemoryId = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--supersede-new-memory-id') {
      options.supersedeNewMemoryId = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--rollback-plan-ref') {
      options.rollbackPlanRef = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--evidence-output') {
      options.evidenceOutputPath = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--verify-evidence') {
      options.verifyEvidencePath = argv[index + 1] || '';
      index += 1;
    }
  }

  return options;
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function optionalOverride(value) {
  return value === undefined || value === null || value === '' ? undefined : value;
}

function defaultToolNameByAction(options = {}) {
  return {
    search_memory: 'knowledge_base.search',
    ...(options.includeReadSuite ? {
      memory_overview: 'knowledge_base.search',
      audit_memory: 'knowledge_base.search'
    } : {}),
    ...((options.includeWrite || options.includeWriteSuite) ? {
      record_memory: 'knowledge_base.record'
    } : {}),
    ...(options.includeWriteSuite ? {
      tombstone_memory: 'knowledge_base.tombstone',
      supersede_memory: 'knowledge_base.supersede'
    } : {})
  };
}

function buildConfigOverrides(options = {}) {
  const toolNameByAction = optionalOverride(options.toolNameByAction) ||
    JSON.stringify(defaultToolNameByAction(options));
  return {
    projectBasePath: optionalOverride(options.projectBasePath),
    dataDir: optionalOverride(options.dataDir),
    logsDir: optionalOverride(options.logsDir),
    allowedAgentAlias: 'Codex',
    defaultAgentId: 'codex-governed-native-acceptance',
    defaultRequestSource: 'governed-vcp-native-acceptance',
    defaultProjectId: options.projectId,
    defaultWorkspaceId: options.workspaceId,
    defaultScopeId: options.scopeId,
    defaultClientId: 'Codex',
    defaultVisibility: options.visibility,
    governedMcpVcpNativeBridgeGateMode: 'strict',
    governedMcpVcpNativeReadDelegationMode: 'primary',
    governedMcpVcpNativeWriteDelegationMode:
      (options.includeWrite || options.includeWriteSuite) ? 'primary' : 'off',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: options.targetReferenceName,
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeHttpMcpTarget: {
      targetReferenceName: options.targetReferenceName,
      endpoint: options.endpoint,
      bearerToken: options.bearerToken,
      ...(toolNameByAction ? { mcpToolNameByAction: toolNameByAction } : {}),
      requestTimeoutMs: optionalOverride(options.timeoutMs)
    }
  };
}

function buildReadContext(options = {}) {
  return {
    executionContext: {
      agentAlias: 'Codex',
      agentId: 'codex-governed-native-acceptance',
      clientId: 'codex',
      projectId: options.projectId,
      workspaceId: options.workspaceId,
      scopeId: options.scopeId,
      visibility: options.visibility,
      requestSource: 'governed-vcp-native-acceptance'
    }
  };
}

function buildWriteContext(toolName = 'record_memory', options = {}) {
  const scope = {
    project_id: options.projectId,
    workspace_id: options.workspaceId,
    client_id: 'Codex',
    visibility: options.visibility,
    ...(options.scopeId ? { scope_id: options.scopeId } : {})
  };
  return {
    ...buildReadContext(options),
    exactApprovalResult: {
      accepted: true,
      allowedAction: WRITE_TOOL_EXACT_APPROVAL_ACTIONS[toolName],
      allowedScope: scope,
      runtimeTarget: {
        targetReferenceName: options.targetReferenceName,
        targetKind: 'mcp_server',
        primaryRuntime: REQUIRED_PRIMARY_RUNTIME
      },
      rollbackPlanRef: options.rollbackPlanRef
    },
    rollbackPosture: {
      mode: 'bounded_rollback_plan',
      rollback_plan_ref: options.rollbackPlanRef
    }
  };
}

function buildReadArgs(options = {}) {
  return {
    query: options.query,
    target: 'both',
    limit: normalizePositiveInteger(options.limit, 1),
    include_content: false
  };
}

function buildReadSuiteArgs(toolName, options = {}) {
  if (toolName === 'memory_overview') {
    return {
      limit: normalizePositiveInteger(options.limit, 1)
    };
  }
  if (toolName === 'audit_memory') {
    return {
      audit_family: 'governance',
      window: normalizePositiveInteger(options.limit, 1),
      include_raw: false
    };
  }
  return buildReadArgs(options);
}

function buildWriteArgs(toolName = 'record_memory', options = {}) {
  if (toolName === 'tombstone_memory') {
    return {
      memory_id: options.tombstoneMemoryId,
      reason: 'Governed native tombstone acceptance probe.',
      evidence: options.writeEvidence,
      tombstone_reason: 'governed_native_acceptance_probe',
      actor_client_id: 'Codex',
      request_source: 'governed-vcp-native-acceptance',
      confirm: true,
      dry_run: false
    };
  }
  if (toolName === 'supersede_memory') {
    return {
      old_memory_id: options.supersedeOldMemoryId,
      new_memory_id: options.supersedeNewMemoryId,
      reason: 'Governed native supersede acceptance probe.',
      evidence: options.writeEvidence,
      supersedes_link: options.supersedeOldMemoryId,
      superseded_by_link: options.supersedeNewMemoryId,
      actor_client_id: 'Codex',
      request_source: 'governed-vcp-native-acceptance',
      confirm: true,
      dry_run: false
    };
  }
  return {
    target: 'knowledge',
    title: options.writeTitle,
    content: options.writeContent,
    evidence: options.writeEvidence,
    validated: true,
    reusable: false,
    sensitivity: 'internal'
  };
}

function projectOperationResult(toolName, result = {}) {
  const receipt = result && typeof result === 'object' ? result.receipt || {} : {};
  const access = result && typeof result === 'object' ? result.access || {} : {};
  const nativeInvocationReceipt = receipt.nativeInvocationReceipt || {};
  const nativeRuntimeReceipt = nativeInvocationReceipt.nativeRuntimeReceipt || {};
  const localAuditReceipt = receipt.localAuditReceipt || {};
  return {
    toolName,
    status: result.status || 'unknown',
    accepted: result.accepted === true,
    primaryRuntime: receipt.primaryRuntime || result.summary?.primaryRuntime || null,
    delegated: result.summary?.delegated === true,
    access: {
      runtimeCalled: access.runtimeCalled === true,
      vcpToolBoxCalled: access.vcpToolBoxCalled === true,
      mcpToolCalled: access.mcpToolCalled === true,
      memoryReadPerformed: access.memoryReadPerformed === true,
      memoryWritePerformed: access.memoryWritePerformed === true,
      localMemoryFallbackUsed: access.localMemoryFallbackUsed === true,
      lowDisclosure: access.lowDisclosure === true,
      rawOutputReturned: access.rawOutputReturned === true,
      tokenMaterialReturned: access.tokenMaterialReturned === true
    },
    receipt: {
      targetReferenceName: receipt.targetReferenceName || null,
      toolName: receipt.toolName || null,
      invocationProfile: receipt.invocationProfile || null,
      invocationProfileBound: receipt.invocationProfileBound === true,
      runtimeTargetBound: receipt.runtimeTargetBound === true,
      clientIdentityBound: receipt.clientIdentityBound === true,
      scopeBoundaryBound: receipt.scopeBoundaryBound === true,
      visibilityBound: receipt.visibilityBound === true,
      readAllowed: receipt.readAllowed === true,
      writeAllowed: receipt.writeAllowed === true,
      writeRequiresExactApproval: receipt.writeRequiresExactApproval === true,
      exactApprovalActionMatched: receipt.exactApprovalActionMatched === true,
      exactApprovalScopeMatched: receipt.exactApprovalScopeMatched === true,
      exactApprovalRuntimeTargetMatched: receipt.exactApprovalRuntimeTargetMatched === true,
      exactApprovalRollbackPlanMatched: receipt.exactApprovalRollbackPlanMatched === true,
      outputDisclosureBudgetBound: receipt.outputDisclosureBudgetBound === true,
      rawOutputAllowed: receipt.rawOutputAllowed === true,
      auditReceiptRequired: receipt.auditReceiptRequired === true,
      auditReceiptLowDisclosureBound: receipt.auditReceiptLowDisclosureBound === true,
      rollbackPosture: receipt.rollbackPosture || null,
      rollbackPostureBound: receipt.rollbackPostureBound === true,
      rollbackPlanBound: receipt.rollbackPlanBound === true,
      rollbackRequired: receipt.rollbackRequired === true,
      rollbackReasonCode: receipt.rollbackReasonCode || null,
      rollbackDisposition: receipt.rollbackDisposition || null,
      rollbackFollowupRequired: receipt.rollbackFollowupRequired === true,
      rollbackApplyPolicy: receipt.rollbackApplyPolicy || null,
      rollbackApplyAttempted: receipt.rollbackApplyAttempted === true,
      rollbackAutoApplyAllowed: receipt.rollbackAutoApplyAllowed === true,
      rollbackRawPlanDisclosed: receipt.rollbackRawPlanDisclosed === true,
      rollbackRawPlanPersisted: receipt.rollbackRawPlanPersisted === true,
      statusClass: receipt.statusClass || null,
      responseShapeCategory: receipt.responseShapeCategory || null,
      topLevelKindCategory: receipt.topLevelKindCategory || null,
      nativeInvocation: {
        toolName: nativeInvocationReceipt.toolName || null,
        statusClass: nativeInvocationReceipt.statusClass || null,
        requestIdCategory: nativeInvocationReceipt.requestIdCategory || null,
        jsonRpcResponseIdMatched: nativeInvocationReceipt.jsonRpcResponseIdMatched === true,
        governanceMetadataSent: nativeInvocationReceipt.governanceMetadataSent === true,
        governanceMetadataPath: nativeInvocationReceipt.governanceMetadataPath || null,
        jsonRpcErrorPresent: nativeInvocationReceipt.jsonRpcErrorPresent === true,
        jsonRpcErrorReasonCode: nativeInvocationReceipt.jsonRpcErrorReasonCode || null,
        nativeRuntimeReceiptPresent: nativeRuntimeReceipt.present === true,
        nativeRuntimeCalled: nativeRuntimeReceipt.nativeRuntimeCalled === true,
        nativeRuntimeInitialized: nativeRuntimeReceipt.nativeRuntimeInitialized === true,
        nativeProviderApiCalled: nativeRuntimeReceipt.providerApiCalled === true,
        nativeMemoryReadPerformed: nativeRuntimeReceipt.memoryReadPerformed === true,
        nativeMemoryWritePerformed: nativeRuntimeReceipt.memoryWritePerformed === true,
        nativeDurableWritePerformed: nativeRuntimeReceipt.durableWritePerformed === true,
        nativeDurableWriteScope: nativeRuntimeReceipt.durableWriteScope || null,
        nativeIsolatedRuntimeStoreUsed: nativeRuntimeReceipt.isolatedRuntimeStoreUsed === true,
        nativePrimaryMemoryStoreWritePerformed: nativeRuntimeReceipt.primaryMemoryStoreWritePerformed === true,
        nativeDerivedIndexWritePerformed: nativeRuntimeReceipt.derivedIndexWritePerformed === true,
        nativeRawRuntimeOutputDisclosed: nativeRuntimeReceipt.rawRuntimeOutputDisclosed === true,
        nativeRawMemoryContentDisclosed: nativeRuntimeReceipt.rawMemoryContentDisclosed === true,
        nativeRuntimeLocatorDisclosed: nativeRuntimeReceipt.runtimeLocatorDisclosed === true,
        nativeRuntimeTokenMaterialDisclosed: nativeRuntimeReceipt.tokenMaterialDisclosed === true,
        nativeRuntimeReadinessClaimed: nativeRuntimeReceipt.readinessClaimed === true
      },
      localAuditReceipt: {
        appended: localAuditReceipt.appended === true,
        status: localAuditReceipt.status || null,
        eventType: localAuditReceipt.eventType || null,
        lowDisclosure: localAuditReceipt.lowDisclosure === true
      },
      localMemoryRole: receipt.localMemoryRole || null,
      localMemoryPrimaryRuntime: receipt.localMemoryPrimaryRuntime === true,
      localMemoryFallbackUsed: receipt.localMemoryFallbackUsed === true,
      localMemoryResultReturned: receipt.localMemoryResultReturned === true,
      localMemoryResultCanBeMistakenForVcpNative: receipt.localMemoryResultCanBeMistakenForVcpNative === true,
      localMemoryRawContentDisclosed: receipt.localMemoryRawContentDisclosed === true,
      rawRequestBodyPersisted: receipt.rawRequestBodyPersisted === true,
      rawResponseBodyPersisted: receipt.rawResponseBodyPersisted === true,
      tokenMaterialDisclosed: receipt.tokenMaterialDisclosed === true,
      readinessClaimed: receipt.readinessClaimed === true
    },
    readinessClaimed: result.readinessClaimed === true
  };
}

function readDurableWriteIsolated(nativeInvocation = {}) {
  if (nativeInvocation.nativeDurableWritePerformed !== true) return true;
  return nativeInvocation.nativeDurableWriteScope === 'isolated_derived_index' &&
    nativeInvocation.nativeIsolatedRuntimeStoreUsed === true &&
    nativeInvocation.nativeDerivedIndexWritePerformed === true &&
    nativeInvocation.nativePrimaryMemoryStoreWritePerformed !== true &&
    nativeInvocation.nativeMemoryWritePerformed !== true;
}

function collectOperationAcceptanceBlockers(operation = {}) {
  if (!operation || typeof operation !== 'object') {
    return ['operation_missing'];
  }

  const access = operation.access || {};
  const receipt = operation.receipt || {};
  const nativeInvocation = receipt.nativeInvocation || {};
  const localAuditReceipt = receipt.localAuditReceipt || {};
  const blockers = [];
  const writeOperation = WRITE_ACCEPTANCE_TOOLS.includes(operation.toolName);
  const readOperation = READ_ACCEPTANCE_TOOLS.includes(operation.toolName);

  if (writeOperation) {
    if (access.memoryWritePerformed !== true) blockers.push('native_memory_write_not_performed');
    if (nativeInvocation.nativeMemoryWritePerformed !== true) blockers.push('native_runtime_memory_write_not_performed');
    if (receipt.writeAllowed !== true) blockers.push('write_authority_not_allowed');
    if (receipt.writeRequiresExactApproval !== true) blockers.push('write_exact_approval_not_required');
    if (receipt.rollbackPlanBound !== true) blockers.push('write_rollback_plan_not_bound');
    if (receipt.rollbackPostureBound !== true) blockers.push('write_rollback_posture_not_bound');
    if (receipt.rollbackDisposition !== 'no_rollback_required') blockers.push('write_rollback_disposition_not_clear');
    if (receipt.rollbackRequired === true) blockers.push('write_rollback_required');
    if (receipt.rollbackFollowupRequired === true) blockers.push('write_rollback_followup_required');
    if (receipt.rollbackApplyPolicy !== 'not_applicable') blockers.push('write_rollback_apply_policy_not_clear');
    if (receipt.rollbackApplyAttempted === true) blockers.push('write_rollback_apply_attempted');
    if (receipt.rollbackAutoApplyAllowed === true) blockers.push('write_rollback_auto_apply_allowed');
    if (receipt.rollbackRawPlanDisclosed === true) blockers.push('write_rollback_raw_plan_disclosed');
    if (receipt.rollbackRawPlanPersisted === true) blockers.push('write_rollback_raw_plan_persisted');
  } else if (readOperation) {
    if (access.memoryReadPerformed !== true) blockers.push('native_memory_read_not_performed');
    if (nativeInvocation.nativeMemoryReadPerformed !== true) blockers.push('native_runtime_memory_read_not_performed');
    if (nativeInvocation.nativeMemoryWritePerformed === true) blockers.push('read_native_runtime_memory_write_performed');
    if (readDurableWriteIsolated(nativeInvocation) !== true) {
      blockers.push('read_native_runtime_durable_write_not_isolated');
    }
    if (receipt.readAllowed !== true) blockers.push('read_authority_not_allowed');
    if (receipt.writeAllowed === true) blockers.push('read_operation_write_authority_allowed');
  } else {
    blockers.push('unsupported_operation_tool');
  }
  if (operation.accepted !== true) blockers.push('operation_not_accepted');
  if (operation.delegated !== true) blockers.push('delegation_not_confirmed');
  if (access.runtimeCalled !== true) blockers.push('runtime_not_called');
  if (access.vcpToolBoxCalled !== true) blockers.push('vcp_toolbox_not_called');
  if (access.mcpToolCalled !== true) blockers.push('mcp_tool_not_called');
  if (access.localMemoryFallbackUsed === true) blockers.push('local_memory_fallback_used');
  if (receipt.localMemoryPrimaryRuntime === true) blockers.push('local_memory_marked_primary_runtime');
  if (receipt.localMemoryResultCanBeMistakenForVcpNative === true) {
    blockers.push('local_memory_result_can_be_mistaken_for_native');
  }
  if (receipt.localMemoryRawContentDisclosed === true) blockers.push('local_memory_raw_content_disclosed');
  if (receipt.runtimeTargetBound !== true) blockers.push('runtime_target_not_bound');
  if (receipt.clientIdentityBound !== true) blockers.push('client_identity_not_bound');
  if (receipt.scopeBoundaryBound !== true) blockers.push('scope_boundary_not_bound');
  if (receipt.visibilityBound !== true) blockers.push('visibility_not_bound');
  if (receipt.invocationProfileBound !== true) blockers.push('invocation_profile_not_bound');
  if (receipt.outputDisclosureBudgetBound !== true) blockers.push('output_disclosure_budget_not_bound');
  if (receipt.rawOutputAllowed === true) blockers.push('raw_output_allowed');
  if (access.rawOutputReturned === true) blockers.push('raw_output_returned');
  if (access.tokenMaterialReturned === true) blockers.push('token_material_returned');
  if (receipt.auditReceiptLowDisclosureBound !== true) blockers.push('audit_receipt_low_disclosure_not_bound');
  if (nativeInvocation.statusClass !== 'success') blockers.push('native_invocation_status_not_success');
  if (nativeInvocation.requestIdCategory !== 'generated_bridge_request_id') {
    blockers.push('native_invocation_request_id_not_bound');
  }
  if (nativeInvocation.jsonRpcResponseIdMatched !== true) {
    blockers.push('native_invocation_response_id_not_matched');
  }
  if (nativeInvocation.governanceMetadataSent !== true) blockers.push('native_governance_metadata_not_sent');
  if (nativeInvocation.governanceMetadataPath !== 'params._meta.codexMemoryGovernance') {
    blockers.push('native_governance_metadata_path_unbound');
  }
  if (nativeInvocation.jsonRpcErrorPresent === true) {
    blockers.push('native_json_rpc_error_present');
    const jsonRpcErrorReasonCode = safeNativeJsonRpcErrorReasonCode(
      nativeInvocation.jsonRpcErrorReasonCode
    );
    if (jsonRpcErrorReasonCode) {
      blockers.push(`native_json_rpc_error_reason_${jsonRpcErrorReasonCode}`);
    }
  }
  if (nativeInvocation.nativeRuntimeReceiptPresent !== true) {
    blockers.push('native_runtime_receipt_not_present');
  }
  if (nativeInvocation.nativeRuntimeCalled !== true) blockers.push('native_runtime_receipt_runtime_not_called');
  if (nativeInvocation.nativeRawRuntimeOutputDisclosed === true) {
    blockers.push('native_runtime_raw_output_disclosed');
  }
  if (nativeInvocation.nativeRawMemoryContentDisclosed === true) {
    blockers.push('native_runtime_raw_memory_content_disclosed');
  }
  if (nativeInvocation.nativeRuntimeLocatorDisclosed === true) {
    blockers.push('native_runtime_locator_disclosed');
  }
  if (nativeInvocation.nativeRuntimeTokenMaterialDisclosed === true) {
    blockers.push('native_runtime_token_material_disclosed');
  }
  if (nativeInvocation.nativeRuntimeReadinessClaimed === true) {
    blockers.push('native_runtime_readiness_claimed');
  }
  if (localAuditReceipt.appended !== true) blockers.push('local_audit_receipt_not_appended');
  return blockers;
}

function operationAccepted(operation = {}) {
  return collectOperationAcceptanceBlockers(operation).length === 0;
}

function collectConfigAcceptanceBlockers(config = {}, selectedOperations = []) {
  const blockers = [];
  const runtimeTargetAccepted = config.governedMcpVcpNativeRuntimeTarget?.accepted === true ||
    config.runtimeTarget?.accepted === true;
  const httpMcpTargetAccepted = config.governedMcpVcpNativeHttpMcpTarget?.accepted === true ||
    config.httpMcpTarget?.accepted === true;
  if (runtimeTargetAccepted !== true) {
    blockers.push('native_runtime_target_not_accepted');
  }
  if (httpMcpTargetAccepted !== true) {
    blockers.push('native_http_mcp_target_not_accepted');
  }
  if (selectedOperations.length === 0) blockers.push('no_operations_selected');
  return blockers;
}

function collectNativeMcpTargetPreflightBlockers(preflight = {}) {
  const blockers = [];
  if (!isPlainObject(preflight) || preflight.included !== true) {
    blockers.push('native_mcp_target_preflight_not_included');
    return blockers;
  }
  if (preflight.lowDisclosure !== true) blockers.push('native_mcp_target_preflight_not_low_disclosure');
  if (preflight.initializeAttempted !== true) blockers.push('native_mcp_initialize_not_attempted');
  if (preflight.initializeAccepted !== true) blockers.push('native_mcp_initialize_not_accepted');
  if (preflight.toolsListAttempted !== true) blockers.push('native_mcp_tools_list_not_attempted');
  if (preflight.toolsListAccepted !== true) blockers.push('native_mcp_tools_list_not_accepted');
  if (preflight.toolsCapabilityListed !== true) blockers.push('native_mcp_tools_capability_not_listed');
  if (preflight.governanceMetadataPathBound !== true) {
    blockers.push('native_mcp_governance_metadata_path_unbound');
  }
  if (preflight.readNativeToolPresent !== true) blockers.push('native_mcp_read_tool_missing');
  if (preflight.requiredNativeToolsPresent !== true) blockers.push('native_mcp_required_tool_missing');
  if (preflight.unexpectedNativeToolsPresent === true) blockers.push('native_mcp_unexpected_tool_present');
  if (preflight.rawToolNamesDisclosed === true) blockers.push('native_mcp_raw_tool_names_disclosed');
  if (preflight.rawToolSchemaDisclosed === true) blockers.push('native_mcp_raw_tool_schema_disclosed');
  if (preflight.rawResponseBodyDisclosed === true) blockers.push('native_mcp_raw_response_body_disclosed');
  if (preflight.endpointDisclosed === true) blockers.push('native_mcp_endpoint_disclosed');
  if (preflight.tokenMaterialDisclosed === true) blockers.push('native_mcp_token_material_disclosed');
  if (preflight.configEnvRead === true) blockers.push('native_mcp_config_env_read');
  if (preflight.providerApiCalledByAcceptance === true) {
    blockers.push('native_mcp_provider_api_called_by_acceptance');
  }
  if (preflight.nativeRuntimeCalled === true) blockers.push('native_mcp_preflight_called_native_runtime');
  if (preflight.readinessClaimed === true) blockers.push('native_mcp_preflight_readiness_claimed');
  if (typeof preflight.reasonCode === 'string' && preflight.reasonCode) {
    blockers.push(`native_mcp_preflight_reason_${preflight.reasonCode}`);
  }
  return blockers;
}

function collectAcceptedArtifactOperationEvidenceBlockers(artifact = {}, summary = {}) {
  if (artifact.accepted !== true) return [];
  const blockers = [];
  const keys = Array.isArray(summary.selectedOperationKeys)
    ? summary.selectedOperationKeys
    : null;
  if (!keys || keys.length === 0) {
    blockers.push('summary.selectedOperationKeys_required');
    return blockers;
  }
  if (keys.some(key => !ACCEPTANCE_OPERATION_KEYS.includes(key))) {
    blockers.push('summary.selectedOperationKeys_contains_invalid_operation_key');
    return blockers;
  }
  if (!isPlainObject(artifact.operations)) {
    blockers.push('operations_required');
    return blockers;
  }

  const selectedOperations = [];
  for (const key of keys) {
    const operation = artifact.operations[key];
    if (!isPlainObject(operation)) {
      blockers.push(`operations.${key}_required`);
      continue;
    }
    selectedOperations.push(operation);
    blockers.push(...collectOperationAcceptanceBlockers(operation)
      .map(blocker => `operations.${key}.${blocker}`));
  }
  blockers.push(...collectConfigAcceptanceBlockers(artifact.config || {}, selectedOperations)
    .map(blocker => `config.${blocker}`));
  blockers.push(...collectNativeMcpTargetPreflightBlockers(summary.nativeMcpTargetPreflightEvidence)
    .map(blocker => `nativeMcpTargetPreflightEvidence.${blocker}`));
  return blockers;
}

function operationEntriesForAcceptance(operations = {}, includeReadSuite = false, includeWrite = false) {
  return [
    ['read', operations.read],
    ...(includeReadSuite ? [
      ['memoryOverview', operations.memoryOverview],
      ['audit', operations.audit]
    ] : []),
    ...(includeWrite ? [['write', operations.write]] : []),
    ...(operations.tombstone ? [['tombstone', operations.tombstone]] : []),
    ...(operations.supersede ? [['supersede', operations.supersede]] : [])
  ];
}

function buildWriteRollbackEvidence(operation = null, operations = {}) {
  const receipt = operation?.receipt || {};
  const writeOperations = Object.fromEntries(
    Object.entries({
      write: operations.write,
      tombstone: operations.tombstone,
      supersede: operations.supersede
    })
      .filter(([, candidate]) => candidate)
      .map(([key, candidate]) => [key, {
        toolName: candidate.toolName,
        lowDisclosure: true,
        rollbackPosture: candidate.receipt?.rollbackPosture || null,
        rollbackPostureBound: candidate.receipt?.rollbackPostureBound === true,
        rollbackPlanBound: candidate.receipt?.rollbackPlanBound === true,
        rollbackRequired: candidate.receipt?.rollbackRequired === true,
        rollbackApplyPolicy: candidate.receipt?.rollbackApplyPolicy || null,
        rollbackApplyAttempted: candidate.receipt?.rollbackApplyAttempted === true,
        rollbackAutoApplyAllowed: candidate.receipt?.rollbackAutoApplyAllowed === true,
        rollbackRawPlanDisclosed: candidate.receipt?.rollbackRawPlanDisclosed === true,
        rollbackRawPlanPersisted: candidate.receipt?.rollbackRawPlanPersisted === true,
        rollbackPlanReferenceDisclosed: false,
        rawRollbackPlanReturned: false
      }])
  );
  return {
    included: Boolean(operation),
    lowDisclosure: true,
    operationKeys: Object.keys(writeOperations),
    operations: writeOperations,
    rollbackPosture: receipt.rollbackPosture || null,
    rollbackPostureBound: receipt.rollbackPostureBound === true,
    rollbackPlanBound: receipt.rollbackPlanBound === true,
    rollbackRequired: receipt.rollbackRequired === true,
    rollbackReasonCode: receipt.rollbackReasonCode || null,
    rollbackDisposition: receipt.rollbackDisposition || null,
    rollbackFollowupRequired: receipt.rollbackFollowupRequired === true,
    rollbackApplyPolicy: receipt.rollbackApplyPolicy || null,
    rollbackApplyAttempted: receipt.rollbackApplyAttempted === true,
    rollbackAutoApplyAllowed: receipt.rollbackAutoApplyAllowed === true,
    rollbackRawPlanDisclosed: receipt.rollbackRawPlanDisclosed === true,
    rollbackRawPlanPersisted: receipt.rollbackRawPlanPersisted === true,
    rollbackPlanReferenceDisclosed: false,
    rawRollbackPlanReturned: false
  };
}

function dimensionEvidence({ dimension, label, covered, evidenceFields }) {
  return {
    dimension,
    label,
    covered: covered === true,
    evidenceFields,
    lowDisclosure: true,
    rawValueDisclosed: false,
    endpointDisclosed: false,
    tokenMaterialDisclosed: false
  };
}

function buildGovernanceEvidenceMatrix(selectedOperations = []) {
  const all = predicate => selectedOperations.length > 0 && selectedOperations.every(predicate);
  return {
    client_id: dimensionEvidence({
      dimension: 'client_id',
      label: 'who is accessing',
      covered: all(operation => operation.receipt.clientIdentityBound === true),
      evidenceFields: ['receipt.clientIdentityBound']
    }),
    scope: dimensionEvidence({
      dimension: 'scope',
      label: 'what scope is accessed',
      covered: all(operation => operation.receipt.scopeBoundaryBound === true),
      evidenceFields: ['receipt.scopeBoundaryBound']
    }),
    visibility: dimensionEvidence({
      dimension: 'visibility',
      label: 'what visibility boundary is accessed',
      covered: all(operation => operation.receipt.visibilityBound === true),
      evidenceFields: ['receipt.visibilityBound']
    }),
    runtime_target: dimensionEvidence({
      dimension: 'runtime target',
      label: 'which runtime is accessed',
      covered: all(operation =>
        operation.receipt.runtimeTargetBound === true &&
        operation.access.runtimeCalled === true &&
        operation.access.vcpToolBoxCalled === true),
      evidenceFields: [
        'receipt.runtimeTargetBound',
        'access.runtimeCalled',
        'access.vcpToolBoxCalled'
      ]
    }),
    invocation_profile: dimensionEvidence({
      dimension: 'invocation profile',
      label: 'which invocation profile is used',
      covered: all(operation => operation.receipt.invocationProfileBound === true),
      evidenceFields: ['receipt.invocationProfileBound']
    }),
    read_write_authority: dimensionEvidence({
      dimension: 'read/write authority',
      label: 'whether read or write is authorized',
      covered: all(operation => operation.receipt.readAllowed === true || operation.receipt.writeAllowed === true),
      evidenceFields: ['receipt.readAllowed', 'receipt.writeAllowed', 'receipt.writeRequiresExactApproval']
    }),
    output_disclosure_budget: dimensionEvidence({
      dimension: 'output disclosure budget',
      label: 'how much output can be disclosed',
      covered: all(operation =>
        operation.receipt.outputDisclosureBudgetBound === true &&
        operation.receipt.rawOutputAllowed === false &&
        operation.access.rawOutputReturned === false),
      evidenceFields: [
        'receipt.outputDisclosureBudgetBound',
        'receipt.rawOutputAllowed',
        'access.rawOutputReturned'
      ]
    }),
    audit_receipt: dimensionEvidence({
      dimension: 'audit receipt',
      label: 'how evidence is recorded',
      covered: all(operation =>
        operation.receipt.auditReceiptRequired === true &&
        operation.receipt.auditReceiptLowDisclosureBound === true &&
        operation.receipt.localAuditReceipt.appended === true),
      evidenceFields: [
        'receipt.auditReceiptRequired',
        'receipt.auditReceiptLowDisclosureBound',
        'receipt.localAuditReceipt.appended'
      ]
    }),
    rollback_posture: dimensionEvidence({
      dimension: 'rollback posture',
      label: 'how failure rollback is handled',
      covered: all(operation => operation.receipt.rollbackPostureBound === true),
      evidenceFields: [
        'receipt.rollbackPostureBound',
        'receipt.rollbackApplyAttempted',
        'receipt.rollbackAutoApplyAllowed',
        'receipt.rollbackRawPlanDisclosed'
      ]
    })
  };
}

function buildLocalMemoryAuxiliaryEvidence(selectedOperations = []) {
  const all = predicate => selectedOperations.length > 0 && selectedOperations.every(predicate);
  const auditReceiptOnly = all(operation =>
    operation.receipt.localAuditReceipt.appended === true &&
    operation.receipt.localAuditReceipt.lowDisclosure === true
  );
  return {
    primaryRuntime: false,
    primaryRuntimeEvidence: 'VCPToolBox native memory',
    allowedAuxiliaryRoles: [
      'fallback',
      'audit',
      'validation fixture',
      'compatibility',
      'offline continuity'
    ],
    activeAuxiliaryRoles: auditReceiptOnly ? ['audit'] : [],
    fallbackUsed: selectedOperations.some(operation =>
      operation.access.localMemoryFallbackUsed === true ||
      operation.receipt.localMemoryFallbackUsed === true
    ),
    auditReceiptOnly,
    localMemoryPrimaryRuntime: selectedOperations.some(operation =>
      operation.receipt.localMemoryPrimaryRuntime === true
    ),
    localMemoryResultReturned: selectedOperations.some(operation =>
      operation.receipt.localMemoryResultReturned === true
    ),
    localMemoryResultCanBeMistakenForVcpNative: selectedOperations.some(operation =>
      operation.receipt.localMemoryResultCanBeMistakenForVcpNative === true
    ),
    localMemoryRawContentDisclosed: selectedOperations.some(operation =>
      operation.receipt.localMemoryRawContentDisclosed === true
    ),
    lowDisclosure: true,
    rawLocalMemoryDisclosed: false,
    localFilesystemPathDisclosed: false
  };
}

function safeNativeJsonRpcErrorReasonCode(value) {
  return typeof value === 'string' &&
    ALLOWED_NATIVE_JSON_RPC_ERROR_REASON_CODES.includes(value)
    ? value
    : null;
}

function safeRollbackDisposition(value) {
  return [
    'no_rollback_required',
    'no_runtime_write_to_rollback',
    'rollback_required_not_applied'
  ].includes(value)
    ? value
    : null;
}

function buildNativeMcpTargetPreflightEvidence({
  included = false,
  initializeAttempted = false,
  initializeAccepted = false,
  toolsListAttempted = false,
  toolsListAccepted = false,
  toolsCapabilityListed = false,
  governanceMetadataPathBound = false,
  readNativeToolPresent = false,
  recordNativeToolPresent = false,
  writeAliasNativeToolPresent = false,
  tombstoneNativeToolPresent = false,
  supersedeNativeToolPresent = false,
  requiredNativeToolsPresent = false,
  unexpectedNativeToolsPresent = false,
  writeToolsExpected = false,
  writeSuiteExpected = false,
  writeToolsExposed = false,
  reasonCode = null
} = {}) {
  return {
    included: included === true,
    lowDisclosure: true,
    initializeAttempted: initializeAttempted === true,
    initializeAccepted: initializeAccepted === true,
    toolsListAttempted: toolsListAttempted === true,
    toolsListAccepted: toolsListAccepted === true,
    toolsCapabilityListed: toolsCapabilityListed === true,
    governanceMetadataPathBound: governanceMetadataPathBound === true,
    readNativeToolPresent: readNativeToolPresent === true,
    recordNativeToolPresent: recordNativeToolPresent === true,
    writeAliasNativeToolPresent: writeAliasNativeToolPresent === true,
    tombstoneNativeToolPresent: tombstoneNativeToolPresent === true,
    supersedeNativeToolPresent: supersedeNativeToolPresent === true,
    requiredNativeToolsPresent: requiredNativeToolsPresent === true,
    unexpectedNativeToolsPresent: unexpectedNativeToolsPresent === true,
    writeToolsExpected: writeToolsExpected === true,
    writeSuiteExpected: writeSuiteExpected === true,
    writeToolsExposed: writeToolsExposed === true,
    reasonCode: typeof reasonCode === 'string' ? reasonCode : null,
    targetRuntimeCategory: REQUIRED_PRIMARY_RUNTIME,
    accessPath: 'governed MCP tools',
    rawToolNamesDisclosed: false,
    rawToolSchemaDisclosed: false,
    rawResponseBodyDisclosed: false,
    endpointDisclosed: false,
    tokenMaterialDisclosed: false,
    configEnvRead: false,
    providerApiCalledByAcceptance: false,
    nativeRuntimeCalled: false,
    readinessClaimed: false
  };
}

function expectedNativeMcpTools({ includeWrite = false, includeWriteSuite = false } = {}) {
  return [
    'knowledge_base.search',
    ...(includeWrite ? ['knowledge_base.record'] : []),
    ...(includeWriteSuite ? [
      'knowledge_base.tombstone',
      'knowledge_base.supersede'
    ] : [])
  ];
}

async function postNativeMcpJsonRpc(privateConfig = {}, method, params = {}, id = '') {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), privateConfig.requestTimeoutMs || 3000);
  try {
    const headers = {
      'content-type': 'application/json'
    };
    if (privateConfig.bearerToken) {
      headers.authorization = `Bearer ${privateConfig.bearerToken}`;
    }
    const response = await fetch(privateConfig.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      return {
        ok: false,
        reasonCode: 'native_mcp_preflight_http_error',
        response: null
      };
    }
    let json;
    try {
      json = await response.json();
    } catch {
      return {
        ok: false,
        reasonCode: 'native_mcp_preflight_invalid_json',
        response: null
      };
    }
    if (json?.jsonrpc !== '2.0' || json.id !== id || json.error) {
      return {
        ok: false,
        reasonCode: 'native_mcp_preflight_json_rpc_error',
        response: json
      };
    }
    return {
      ok: true,
      response: json
    };
  } catch {
    return {
      ok: false,
      reasonCode: 'native_mcp_preflight_transport_error',
      response: null
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function runNativeMcpTargetPreflight({
  privateConfig,
  includeWrite = false,
  includeWriteSuite = false
} = {}) {
  if (!privateConfig || typeof privateConfig.endpoint !== 'string' || !privateConfig.endpoint) {
    return buildNativeMcpTargetPreflightEvidence({
      included: false,
      writeToolsExpected: includeWrite,
      writeSuiteExpected: includeWriteSuite,
      reasonCode: 'native_mcp_preflight_not_configured'
    });
  }

  const initialize = await postNativeMcpJsonRpc(
    privateConfig,
    'initialize',
    {},
    'codex-memory-native-preflight-initialize'
  );
  if (initialize.ok !== true) {
    return buildNativeMcpTargetPreflightEvidence({
      included: true,
      initializeAttempted: true,
      writeToolsExpected: includeWrite,
      writeSuiteExpected: includeWriteSuite,
      reasonCode: initialize.reasonCode || 'native_mcp_initialize_not_accepted'
    });
  }

  const initializeResult = initialize.response?.result || {};
  const initializeMeta = initializeResult._meta || {};
  const toolsCapabilityListed = isPlainObject(initializeResult.capabilities?.tools);
  const initializeGovernancePathBound =
    initializeMeta.governanceMetadataPath === GOVERNANCE_METADATA_PATH;
  const toolsList = await postNativeMcpJsonRpc(
    privateConfig,
    'tools/list',
    {},
    'codex-memory-native-preflight-tools-list'
  );
  if (toolsList.ok !== true) {
    return buildNativeMcpTargetPreflightEvidence({
      included: true,
      initializeAttempted: true,
      initializeAccepted: true,
      toolsCapabilityListed,
      governanceMetadataPathBound: initializeGovernancePathBound,
      toolsListAttempted: true,
      writeToolsExpected: includeWrite,
      writeSuiteExpected: includeWriteSuite,
      reasonCode: toolsList.reasonCode || 'native_mcp_tools_list_not_accepted'
    });
  }

  const toolsListResult = toolsList.response?.result || {};
  const tools = Array.isArray(toolsListResult.tools) ? toolsListResult.tools : [];
  const toolNames = new Set(
    tools.map(tool => (typeof tool?.name === 'string' ? tool.name : '')).filter(Boolean)
  );
  const unexpectedNativeToolsPresent = [...toolNames].some(name =>
    !MCP_PREFLIGHT_NATIVE_TOOL_NAMES.includes(name)
  );
  const readNativeToolPresent = toolNames.has('knowledge_base.search');
  const recordNativeToolPresent = toolNames.has('knowledge_base.record');
  const writeAliasNativeToolPresent = toolNames.has('knowledge_base.write');
  const tombstoneNativeToolPresent = toolNames.has('knowledge_base.tombstone');
  const supersedeNativeToolPresent = toolNames.has('knowledge_base.supersede');
  const requiredNativeToolsPresent = expectedNativeMcpTools({ includeWrite, includeWriteSuite })
    .every(name => toolNames.has(name));
  const writeToolsExposed = [
    recordNativeToolPresent,
    writeAliasNativeToolPresent,
    tombstoneNativeToolPresent,
    supersedeNativeToolPresent
  ].some(Boolean);
  const toolsListGovernancePathBound =
    toolsListResult._meta?.governanceMetadataPath === GOVERNANCE_METADATA_PATH ||
    tools
      .filter(tool => expectedNativeMcpTools({ includeWrite, includeWriteSuite }).includes(tool.name))
      .every(tool => tool?.inputSchema?._meta?.governanceMetadataPath === GOVERNANCE_METADATA_PATH);
  const governanceMetadataPathBound = initializeGovernancePathBound && toolsListGovernancePathBound;
  const reasonCode =
    toolsCapabilityListed !== true
      ? 'native_mcp_initialize_tools_capability_missing'
      : governanceMetadataPathBound !== true
        ? 'native_mcp_governance_metadata_path_unbound'
        : requiredNativeToolsPresent !== true
          ? 'native_mcp_required_tool_missing'
          : unexpectedNativeToolsPresent === true
            ? 'native_mcp_unexpected_tool_present'
            : null;

  return buildNativeMcpTargetPreflightEvidence({
    included: true,
    initializeAttempted: true,
    initializeAccepted: true,
    toolsListAttempted: true,
    toolsListAccepted: true,
    toolsCapabilityListed,
    governanceMetadataPathBound,
    readNativeToolPresent,
    recordNativeToolPresent,
    writeAliasNativeToolPresent,
    tombstoneNativeToolPresent,
    supersedeNativeToolPresent,
    requiredNativeToolsPresent,
    unexpectedNativeToolsPresent,
    writeToolsExpected: includeWrite,
    writeSuiteExpected: includeWriteSuite,
    writeToolsExposed,
    reasonCode
  });
}

function buildNativeRuntimeOperatorFollowupPacket({
  nativeJsonRpcErrorObserved,
  nativeRuntimeCallFailed,
  reasonCodes
} = {}) {
  const included = nativeRuntimeCallFailed === true || nativeJsonRpcErrorObserved === true;
  return {
    included,
    packetKind: included ? 'native_runtime_precondition_followup' : null,
    lowDisclosure: true,
    actionCategory: nativeRuntimeCallFailed === true
      ? 'native_runtime_precondition_check_required'
      : nativeJsonRpcErrorObserved === true
        ? 'native_json_rpc_error_review_required'
        : null,
    reasonCodes: Array.isArray(reasonCodes) ? reasonCodes.filter(safeNativeJsonRpcErrorReasonCode) : [],
    targetRuntimeCategory: included ? REQUIRED_PRIMARY_RUNTIME : null,
    operatorReviewRequired: included,
    bridgeConfigEnvReadAllowed: false,
    bridgeProviderApiCallAllowed: false,
    bridgeRuntimeMutationAllowed: false,
    bridgeRollbackApplyAllowed: false,
    bridgeMayClaimReadiness: false,
    exactApprovalRequiredForRuntimeChange: included,
    requiredEvidenceCategory: included
      ? 'fresh_governed_native_acceptance_after_operator_runtime_precondition_change'
      : null,
    endpointDisclosed: false,
    tokenMaterialDisclosed: false,
    rawErrorDisclosed: false,
    rawConfigDisclosed: false,
    readinessClaimed: false
  };
}

function buildNativeRuntimePreconditionEvidence(selectedOperations = []) {
  const observedReasons = selectedOperations
    .map(operation => operation.receipt?.nativeInvocation?.jsonRpcErrorReasonCode)
    .map(safeNativeJsonRpcErrorReasonCode)
    .filter(Boolean);
  const reasonCodes = [...new Set(observedReasons)].sort();
  const rollbackDispositions = [...new Set(selectedOperations
    .map(operation => safeRollbackDisposition(operation.receipt?.rollbackDisposition))
    .filter(Boolean))].sort();
  const nativeJsonRpcErrorObserved = selectedOperations.some(operation =>
    operation.receipt?.nativeInvocation?.jsonRpcErrorPresent === true
  );
  const nativeRuntimeCallFailed = reasonCodes.includes('native_runtime_call_failed');
  const allNativeInvocationsSucceeded = selectedOperations.length > 0 &&
    selectedOperations.every(operation =>
      operation.receipt?.nativeInvocation?.statusClass === 'success' &&
      operation.receipt?.nativeInvocation?.jsonRpcErrorPresent === false &&
      operation.receipt?.nativeInvocation?.jsonRpcResponseIdMatched === true
    );
  const operatorFollowupPacket = buildNativeRuntimeOperatorFollowupPacket({
    nativeJsonRpcErrorObserved,
    nativeRuntimeCallFailed,
    reasonCodes
  });

  return {
    included: selectedOperations.length > 0,
    lowDisclosure: true,
    nativeRuntimePreconditionsSatisfied: allNativeInvocationsSucceeded,
    nativeJsonRpcErrorObserved,
    nativeRuntimeCallFailed,
    reasonCodes,
    operatorActionCategory: nativeRuntimeCallFailed
      ? 'native_runtime_precondition_check_required'
      : nativeJsonRpcErrorObserved
        ? 'native_json_rpc_error_review_required'
        : null,
    runtimeCalled: selectedOperations.some(operation => operation.access.runtimeCalled === true),
    vcpToolBoxCalled: selectedOperations.some(operation => operation.access.vcpToolBoxCalled === true),
    mcpToolCalled: selectedOperations.some(operation => operation.access.mcpToolCalled === true),
    governanceMetadataSent: selectedOperations.every(operation =>
      operation.receipt?.nativeInvocation?.governanceMetadataSent === true
    ),
    governanceMetadataPathBound: selectedOperations.every(operation =>
      operation.receipt?.nativeInvocation?.governanceMetadataPath === 'params._meta.codexMemoryGovernance'
    ),
    nativeRuntimeReceiptBound: selectedOperations.length > 0 &&
      selectedOperations.every(operation =>
        operation.receipt?.nativeInvocation?.nativeRuntimeReceiptPresent === true
      ),
    nativeRuntimeCalledFromReceipt: selectedOperations.some(operation =>
      operation.receipt?.nativeInvocation?.nativeRuntimeCalled === true
    ),
    nativeRuntimeInitializedFromReceipt: selectedOperations.some(operation =>
      operation.receipt?.nativeInvocation?.nativeRuntimeInitialized === true
    ),
    nativeProviderApiCalledFromReceipt: selectedOperations.some(operation =>
      operation.receipt?.nativeInvocation?.nativeProviderApiCalled === true
    ),
    nativeMemoryReadPerformedFromReceipt: selectedOperations.some(operation =>
      operation.receipt?.nativeInvocation?.nativeMemoryReadPerformed === true
    ),
    nativeMemoryWritePerformedFromReceipt: selectedOperations.some(operation =>
      operation.receipt?.nativeInvocation?.nativeMemoryWritePerformed === true
    ),
    nativeDurableWritePerformedFromReceipt: selectedOperations.some(operation =>
      operation.receipt?.nativeInvocation?.nativeDurableWritePerformed === true
    ),
    readNativeIsolatedDerivedIndexWritePerformedFromReceipt: selectedOperations.some(operation =>
      READ_ACCEPTANCE_TOOLS.includes(operation.toolName) &&
      operation.receipt?.nativeInvocation?.nativeDurableWriteScope === 'isolated_derived_index' &&
      operation.receipt?.nativeInvocation?.nativeIsolatedRuntimeStoreUsed === true &&
      operation.receipt?.nativeInvocation?.nativeDerivedIndexWritePerformed === true
    ),
    readNativeNonIsolatedDurableWritePerformedFromReceipt: selectedOperations.some(operation =>
      READ_ACCEPTANCE_TOOLS.includes(operation.toolName) &&
      readDurableWriteIsolated(operation.receipt?.nativeInvocation || {}) !== true
    ),
    nativePrimaryMemoryStoreWritePerformedFromReceipt: selectedOperations.some(operation =>
      operation.receipt?.nativeInvocation?.nativePrimaryMemoryStoreWritePerformed === true
    ),
    nativeRawRuntimeOutputDisclosed: selectedOperations.some(operation =>
      operation.receipt?.nativeInvocation?.nativeRawRuntimeOutputDisclosed === true
    ),
    nativeRawMemoryContentDisclosed: selectedOperations.some(operation =>
      operation.receipt?.nativeInvocation?.nativeRawMemoryContentDisclosed === true
    ),
    nativeRuntimeLocatorDisclosed: selectedOperations.some(operation =>
      operation.receipt?.nativeInvocation?.nativeRuntimeLocatorDisclosed === true
    ),
    nativeRuntimeTokenMaterialDisclosed: selectedOperations.some(operation =>
      operation.receipt?.nativeInvocation?.nativeRuntimeTokenMaterialDisclosed === true
    ),
    nativeRuntimeReadinessClaimed: selectedOperations.some(operation =>
      operation.receipt?.nativeInvocation?.nativeRuntimeReadinessClaimed === true
    ),
    rollbackPostureBound: selectedOperations.length > 0 &&
      selectedOperations.every(operation => operation.receipt?.rollbackPostureBound === true),
    rollbackRequired: selectedOperations.some(operation => operation.receipt?.rollbackRequired === true),
    rollbackFollowupRequired: selectedOperations.some(operation =>
      operation.receipt?.rollbackFollowupRequired === true
    ),
    rollbackApplyAttempted: selectedOperations.some(operation => operation.receipt?.rollbackApplyAttempted === true),
    rollbackAutoApplyAllowed: selectedOperations.some(operation =>
      operation.receipt?.rollbackAutoApplyAllowed === true
    ),
    rollbackRawPlanDisclosed: selectedOperations.some(operation =>
      operation.receipt?.rollbackRawPlanDisclosed === true
    ),
    rollbackRawPlanPersisted: selectedOperations.some(operation =>
      operation.receipt?.rollbackRawPlanPersisted === true
    ),
    rollbackDispositions,
    rollbackOperatorActionCategory: nativeRuntimeCallFailed
      ? 'operator_runtime_precondition_followup_required'
      : null,
    operatorFollowupPacket,
    rawErrorDisclosed: false,
    rawResponseBodyDisclosed: false,
    endpointDisclosed: false,
    tokenMaterialDisclosed: false,
    configEnvRead: false,
    providerApiCalledByAcceptance: false,
    readinessClaimed: false
  };
}

function buildSummary({ config, operations, includeReadSuite, includeWrite, nativeMcpTargetPreflightEvidence }) {
  const operationEntries = operationEntriesForAcceptance(
    operations,
    includeReadSuite,
    includeWrite
  );
  const selectedOperations = operationEntries.map(([, operation]) => operation).filter(Boolean);
  const operationBlockers = Object.fromEntries(operationEntries.map(([operationName, operation]) => [
    operationName,
    operation ? collectOperationAcceptanceBlockers(operation) : ['operation_missing']
  ]));
  const configBlockers = collectConfigAcceptanceBlockers(config, selectedOperations);
  const nativeMcpTargetPreflightBlockers = collectNativeMcpTargetPreflightBlockers(
    nativeMcpTargetPreflightEvidence
  );
  const allBlockers = [
    ...configBlockers,
    ...nativeMcpTargetPreflightBlockers,
    ...Object.entries(operationBlockers).flatMap(([operationName, blockers]) =>
      blockers.map(blocker => `${operationName}_${blocker}`)
    )
  ];
  const accepted = allBlockers.length === 0;

  return {
    accepted,
    status: accepted ? 'accepted' : 'not_accepted',
    primaryRuntime: REQUIRED_PRIMARY_RUNTIME,
    accessPath: 'governed MCP tools',
    selectedOperations: selectedOperations.map(operation => operation.toolName),
    selectedOperationKeys: operationEntries.map(([operationName]) => operationName),
    governedDimensions: {
      clientId: selectedOperations.every(operation => operation.receipt.clientIdentityBound === true),
      scope: selectedOperations.every(operation => operation.receipt.scopeBoundaryBound === true),
      visibility: selectedOperations.every(operation => operation.receipt.visibilityBound === true),
      scopeVisibility: selectedOperations.every(operation =>
        operation.receipt.scopeBoundaryBound === true && operation.receipt.visibilityBound === true),
      runtimeTarget: selectedOperations.every(operation => operation.receipt.runtimeTargetBound === true),
      invocationProfile: selectedOperations.every(operation => operation.receipt.invocationProfileBound === true),
      readWriteAuthority: selectedOperations.every(operation =>
        operation.receipt.readAllowed === true || operation.receipt.writeAllowed === true),
      outputDisclosureBudget: selectedOperations.every(operation =>
        operation.receipt.outputDisclosureBudgetBound === true && operation.receipt.rawOutputAllowed === false),
      auditReceipt: selectedOperations.every(operation =>
        operation.receipt.auditReceiptRequired === true &&
        operation.receipt.auditReceiptLowDisclosureBound === true &&
        operation.receipt.localAuditReceipt.appended === true),
      rollbackPosture: selectedOperations.every(operation => operation.receipt.rollbackPostureBound === true)
    },
    governanceEvidenceMatrix: buildGovernanceEvidenceMatrix(selectedOperations),
    nativeMcpTargetPreflightEvidence,
    nativeRuntimePreconditionEvidence: buildNativeRuntimePreconditionEvidence(selectedOperations),
    localMemoryRole: {
      primaryRuntime: false,
      fallbackUsed: selectedOperations.some(operation => operation.access.localMemoryFallbackUsed === true),
      auditReceiptOnly: true
    },
    localMemoryAuxiliaryEvidence: buildLocalMemoryAuxiliaryEvidence(selectedOperations),
    acceptanceBlockers: {
      count: allBlockers.length,
      config: configBlockers,
      nativeMcpTargetPreflight: nativeMcpTargetPreflightBlockers,
      operations: operationBlockers,
      all: allBlockers
    },
    writeRollbackEvidence: includeWrite
      ? buildWriteRollbackEvidence(operations.write, operations)
      : { included: false, lowDisclosure: true },
    readinessClaimed: false
  };
}

function buildNoOperationSummary(status, configBlockers = []) {
  const selectedOperations = [];
  return {
    accepted: false,
    status,
    primaryRuntime: REQUIRED_PRIMARY_RUNTIME,
    accessPath: 'governed MCP tools',
    selectedOperations: [],
    selectedOperationKeys: [],
    governedDimensions: {
      clientId: false,
      scope: false,
      visibility: false,
      scopeVisibility: false,
      runtimeTarget: false,
      invocationProfile: false,
      readWriteAuthority: false,
      outputDisclosureBudget: false,
      auditReceipt: false,
      rollbackPosture: false
    },
    governanceEvidenceMatrix: buildGovernanceEvidenceMatrix(selectedOperations),
    nativeMcpTargetPreflightEvidence: buildNativeMcpTargetPreflightEvidence({
      included: false,
      reasonCode: 'native_mcp_preflight_not_configured'
    }),
    nativeRuntimePreconditionEvidence: buildNativeRuntimePreconditionEvidence(selectedOperations),
    localMemoryRole: {
      primaryRuntime: false,
      fallbackUsed: false,
      auditReceiptOnly: false
    },
    localMemoryAuxiliaryEvidence: buildLocalMemoryAuxiliaryEvidence(selectedOperations),
    acceptanceBlockers: {
      count: configBlockers.length,
      config: configBlockers,
      nativeMcpTargetPreflight: [],
      operations: {},
      all: configBlockers
    },
    writeRollbackEvidence: { included: false, lowDisclosure: true },
    readinessClaimed: false
  };
}

function buildEvidenceArtifact(result = {}) {
  return {
    schemaVersion: 'codex_memory_governed_vcp_native_acceptance_evidence_v1',
    artifactKind: 'low_disclosure_governed_vcp_native_acceptance',
    accepted: result.accepted === true,
    status: result.status || 'unknown',
    summary: result.summary || null,
    config: result.config || null,
    operations: result.operations || {},
    disclosure: {
      endpointDisclosed: false,
      tokenMaterialDisclosed: false,
      rawRequestBodyDisclosed: false,
      rawResponseBodyDisclosed: false,
      rawMemoryDisclosed: false,
      rawAuditDisclosed: false,
      outputPathDisclosed: false
    },
    readinessClaimed: false
  };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireFalse(blockers, source, pathName) {
  const value = pathName.split('.').reduce((current, key) =>
    isPlainObject(current) ? current[key] : undefined, source);
  if (value !== false) blockers.push(`${pathName}_must_be_false`);
}

function requireTrue(blockers, source, pathName) {
  const value = pathName.split('.').reduce((current, key) =>
    isPlainObject(current) ? current[key] : undefined, source);
  if (value !== true) blockers.push(`${pathName}_must_be_true`);
}

function requireExact(blockers, source, pathName, expected) {
  const value = pathName.split('.').reduce((current, key) =>
    isPlainObject(current) ? current[key] : undefined, source);
  if (value !== expected) blockers.push(`${pathName}_must_equal_${String(expected)}`);
}

function validateGovernedVcpNativeAcceptanceEvidenceArtifact(artifact = {}) {
  const blockers = [];
  if (!isPlainObject(artifact)) {
    return {
      valid: false,
      status: 'invalid',
      blockers: ['artifact_not_plain_object'],
      lowDisclosure: false,
      readinessClaimed: false
    };
  }

  requireExact(blockers, artifact, 'schemaVersion', 'codex_memory_governed_vcp_native_acceptance_evidence_v1');
  requireExact(blockers, artifact, 'artifactKind', 'low_disclosure_governed_vcp_native_acceptance');
  requireFalse(blockers, artifact, 'readinessClaimed');

  for (const disclosureFlag of [
    'endpointDisclosed',
    'tokenMaterialDisclosed',
    'rawRequestBodyDisclosed',
    'rawResponseBodyDisclosed',
    'rawMemoryDisclosed',
    'rawAuditDisclosed',
    'outputPathDisclosed'
  ]) {
    requireFalse(blockers, artifact, `disclosure.${disclosureFlag}`);
  }

  const summary = artifact.summary;
  if (!isPlainObject(summary)) {
    blockers.push('summary_required');
  } else {
    requireExact(blockers, summary, 'primaryRuntime', REQUIRED_PRIMARY_RUNTIME);
    requireExact(blockers, summary, 'accessPath', 'governed MCP tools');
    requireFalse(blockers, summary, 'readinessClaimed');

    const matrix = summary.governanceEvidenceMatrix || {};
    for (const key of [
      'client_id',
      'scope',
      'visibility',
      'runtime_target',
      'invocation_profile',
      'read_write_authority',
      'output_disclosure_budget',
      'audit_receipt',
      'rollback_posture'
    ]) {
      if (!isPlainObject(matrix[key])) {
        blockers.push(`governanceEvidenceMatrix.${key}_required`);
        continue;
      }
      requireTrue(blockers, matrix, `${key}.lowDisclosure`);
      requireFalse(blockers, matrix, `${key}.rawValueDisclosed`);
      requireFalse(blockers, matrix, `${key}.endpointDisclosed`);
      requireFalse(blockers, matrix, `${key}.tokenMaterialDisclosed`);
      if (artifact.accepted === true) requireTrue(blockers, matrix, `${key}.covered`);
    }

    const local = summary.localMemoryAuxiliaryEvidence || {};
    if (!isPlainObject(local)) {
      blockers.push('localMemoryAuxiliaryEvidence_required');
    } else {
      requireFalse(blockers, local, 'primaryRuntime');
      requireFalse(blockers, local, 'fallbackUsed');
      requireFalse(blockers, local, 'localMemoryPrimaryRuntime');
      requireFalse(blockers, local, 'localMemoryResultCanBeMistakenForVcpNative');
      requireFalse(blockers, local, 'localMemoryRawContentDisclosed');
      requireFalse(blockers, local, 'rawLocalMemoryDisclosed');
      requireFalse(blockers, local, 'localFilesystemPathDisclosed');
      requireTrue(blockers, local, 'lowDisclosure');
    }

    const nativeMcpTargetPreflight = summary.nativeMcpTargetPreflightEvidence;
    if (!isPlainObject(nativeMcpTargetPreflight)) {
      blockers.push('nativeMcpTargetPreflightEvidence_required');
    } else {
      requireTrue(blockers, nativeMcpTargetPreflight, 'lowDisclosure');
      requireFalse(blockers, nativeMcpTargetPreflight, 'rawToolNamesDisclosed');
      requireFalse(blockers, nativeMcpTargetPreflight, 'rawToolSchemaDisclosed');
      requireFalse(blockers, nativeMcpTargetPreflight, 'rawResponseBodyDisclosed');
      requireFalse(blockers, nativeMcpTargetPreflight, 'endpointDisclosed');
      requireFalse(blockers, nativeMcpTargetPreflight, 'tokenMaterialDisclosed');
      requireFalse(blockers, nativeMcpTargetPreflight, 'configEnvRead');
      requireFalse(blockers, nativeMcpTargetPreflight, 'providerApiCalledByAcceptance');
      requireFalse(blockers, nativeMcpTargetPreflight, 'nativeRuntimeCalled');
      requireFalse(blockers, nativeMcpTargetPreflight, 'readinessClaimed');
      requireExact(blockers, nativeMcpTargetPreflight, 'targetRuntimeCategory', REQUIRED_PRIMARY_RUNTIME);
      requireExact(blockers, nativeMcpTargetPreflight, 'accessPath', 'governed MCP tools');
      if (artifact.accepted === true) {
        requireTrue(blockers, nativeMcpTargetPreflight, 'included');
        requireTrue(blockers, nativeMcpTargetPreflight, 'initializeAttempted');
        requireTrue(blockers, nativeMcpTargetPreflight, 'initializeAccepted');
        requireTrue(blockers, nativeMcpTargetPreflight, 'toolsListAttempted');
        requireTrue(blockers, nativeMcpTargetPreflight, 'toolsListAccepted');
        requireTrue(blockers, nativeMcpTargetPreflight, 'toolsCapabilityListed');
        requireTrue(blockers, nativeMcpTargetPreflight, 'governanceMetadataPathBound');
        requireTrue(blockers, nativeMcpTargetPreflight, 'readNativeToolPresent');
        requireTrue(blockers, nativeMcpTargetPreflight, 'requiredNativeToolsPresent');
        requireFalse(blockers, nativeMcpTargetPreflight, 'unexpectedNativeToolsPresent');
        requireExact(blockers, nativeMcpTargetPreflight, 'reasonCode', null);
      }
    }

    const nativeRuntimePrecondition = summary.nativeRuntimePreconditionEvidence || {};
    if (!isPlainObject(nativeRuntimePrecondition)) {
      blockers.push('nativeRuntimePreconditionEvidence_required');
    } else {
      requireTrue(blockers, nativeRuntimePrecondition, 'lowDisclosure');
      requireFalse(blockers, nativeRuntimePrecondition, 'rawErrorDisclosed');
      requireFalse(blockers, nativeRuntimePrecondition, 'rawResponseBodyDisclosed');
      requireFalse(blockers, nativeRuntimePrecondition, 'endpointDisclosed');
      requireFalse(blockers, nativeRuntimePrecondition, 'tokenMaterialDisclosed');
      requireFalse(blockers, nativeRuntimePrecondition, 'configEnvRead');
      requireFalse(blockers, nativeRuntimePrecondition, 'providerApiCalledByAcceptance');
      requireFalse(blockers, nativeRuntimePrecondition, 'readinessClaimed');
      requireFalse(blockers, nativeRuntimePrecondition, 'nativeRawRuntimeOutputDisclosed');
      requireFalse(blockers, nativeRuntimePrecondition, 'nativeRawMemoryContentDisclosed');
      requireFalse(blockers, nativeRuntimePrecondition, 'nativeRuntimeLocatorDisclosed');
      requireFalse(blockers, nativeRuntimePrecondition, 'nativeRuntimeTokenMaterialDisclosed');
      requireFalse(blockers, nativeRuntimePrecondition, 'nativeRuntimeReadinessClaimed');
      requireFalse(blockers, nativeRuntimePrecondition, 'rollbackApplyAttempted');
      requireFalse(blockers, nativeRuntimePrecondition, 'rollbackAutoApplyAllowed');
      requireFalse(blockers, nativeRuntimePrecondition, 'rollbackRawPlanDisclosed');
      requireFalse(blockers, nativeRuntimePrecondition, 'rollbackRawPlanPersisted');
      const operatorFollowupPacket = nativeRuntimePrecondition.operatorFollowupPacket || {};
      if (!isPlainObject(operatorFollowupPacket)) {
        blockers.push('nativeRuntimePreconditionEvidence.operatorFollowupPacket_required');
      } else {
        requireTrue(blockers, operatorFollowupPacket, 'lowDisclosure');
        requireFalse(blockers, operatorFollowupPacket, 'bridgeConfigEnvReadAllowed');
        requireFalse(blockers, operatorFollowupPacket, 'bridgeProviderApiCallAllowed');
        requireFalse(blockers, operatorFollowupPacket, 'bridgeRuntimeMutationAllowed');
        requireFalse(blockers, operatorFollowupPacket, 'bridgeRollbackApplyAllowed');
        requireFalse(blockers, operatorFollowupPacket, 'bridgeMayClaimReadiness');
        requireFalse(blockers, operatorFollowupPacket, 'endpointDisclosed');
        requireFalse(blockers, operatorFollowupPacket, 'tokenMaterialDisclosed');
        requireFalse(blockers, operatorFollowupPacket, 'rawErrorDisclosed');
        requireFalse(blockers, operatorFollowupPacket, 'rawConfigDisclosed');
        requireFalse(blockers, operatorFollowupPacket, 'readinessClaimed');
        if (Array.isArray(operatorFollowupPacket.reasonCodes)) {
          for (const reasonCode of operatorFollowupPacket.reasonCodes) {
            if (!ALLOWED_NATIVE_JSON_RPC_ERROR_REASON_CODES.includes(reasonCode)) {
              blockers.push('nativeRuntimePreconditionEvidence.operatorFollowupPacket.reasonCodes_contains_unapproved_value');
            }
          }
        } else {
          blockers.push('nativeRuntimePreconditionEvidence.operatorFollowupPacket.reasonCodes_required');
        }
      }
      if (artifact.accepted === true) {
        requireTrue(blockers, nativeRuntimePrecondition, 'nativeRuntimePreconditionsSatisfied');
        requireFalse(blockers, nativeRuntimePrecondition, 'nativeJsonRpcErrorObserved');
        requireFalse(blockers, nativeRuntimePrecondition, 'nativeRuntimeCallFailed');
        requireTrue(blockers, nativeRuntimePrecondition, 'nativeRuntimeReceiptBound');
        requireTrue(blockers, nativeRuntimePrecondition, 'nativeRuntimeCalledFromReceipt');
        requireFalse(blockers, nativeRuntimePrecondition, 'readNativeNonIsolatedDurableWritePerformedFromReceipt');
        requireFalse(blockers, nativeRuntimePrecondition, 'rollbackRequired');
        requireFalse(blockers, nativeRuntimePrecondition, 'rollbackFollowupRequired');
        requireFalse(blockers, operatorFollowupPacket, 'included');
        requireFalse(blockers, operatorFollowupPacket, 'operatorReviewRequired');
        requireFalse(blockers, operatorFollowupPacket, 'exactApprovalRequiredForRuntimeChange');
      }
      if (Array.isArray(nativeRuntimePrecondition.reasonCodes)) {
        for (const reasonCode of nativeRuntimePrecondition.reasonCodes) {
          if (!ALLOWED_NATIVE_JSON_RPC_ERROR_REASON_CODES.includes(reasonCode)) {
            blockers.push('nativeRuntimePreconditionEvidence.reasonCodes_contains_unapproved_value');
          }
        }
      } else {
        blockers.push('nativeRuntimePreconditionEvidence.reasonCodes_required');
      }
      if (Array.isArray(nativeRuntimePrecondition.rollbackDispositions)) {
        for (const disposition of nativeRuntimePrecondition.rollbackDispositions) {
          if (!safeRollbackDisposition(disposition)) {
            blockers.push('nativeRuntimePreconditionEvidence.rollbackDispositions_contains_unapproved_value');
          }
        }
      } else {
        blockers.push('nativeRuntimePreconditionEvidence.rollbackDispositions_required');
      }
    }

    if (artifact.accepted === true) {
      requireExact(blockers, summary, 'status', 'accepted');
      requireExact(blockers, summary, 'acceptanceBlockers.count', 0);
      blockers.push(...collectAcceptedArtifactOperationEvidenceBlockers(artifact, summary));
    }
  }

  const valid = blockers.length === 0;
  return {
    valid,
    status: valid ? 'valid_low_disclosure_evidence' : 'invalid',
    blockers,
    acceptedEvidence: artifact.accepted === true,
    lowDisclosure: valid,
    readinessClaimed: false
  };
}

async function verifyGovernedVcpNativeAcceptanceEvidenceFile(evidencePath = '') {
  if (typeof evidencePath !== 'string' || !evidencePath.trim()) {
    return {
      valid: false,
      status: 'invalid',
      blockers: ['verify_evidence_path_required'],
      lowDisclosure: true,
      evidencePathDisclosed: false,
      readinessClaimed: false
    };
  }
  let artifact;
  try {
    artifact = JSON.parse(await fs.readFile(path.resolve(evidencePath), 'utf8'));
  } catch {
    return {
      valid: false,
      status: 'invalid',
      blockers: ['verify_evidence_read_or_parse_failed'],
      lowDisclosure: true,
      evidencePathDisclosed: false,
      readinessClaimed: false
    };
  }
  return {
    ...validateGovernedVcpNativeAcceptanceEvidenceArtifact(artifact),
    evidencePathDisclosed: false
  };
}

async function writeEvidenceArtifact(result = {}, evidenceOutputPath = '') {
  if (typeof evidenceOutputPath !== 'string' || !evidenceOutputPath.trim()) {
    return {
      requested: false,
      written: false,
      status: 'not_requested',
      outputPathDisclosed: false
    };
  }

  const resolvedPath = path.resolve(evidenceOutputPath);
  const artifact = buildEvidenceArtifact(result);
  const tmpPath = `${resolvedPath}.${process.pid}.${Date.now()}.tmp`;
  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  await fs.writeFile(tmpPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  await fs.rename(tmpPath, resolvedPath);
  return {
    requested: true,
    written: true,
    status: 'written',
    schemaVersion: artifact.schemaVersion,
    artifactKind: artifact.artifactKind,
    outputPathDisclosed: false
  };
}

async function runGovernedVcpNativeAcceptance(rawOptions = {}) {
  const options = {
    ...parseArgs([], process.env),
    ...rawOptions
  };
  if (options.includeWriteSuite) options.includeWrite = true;
  const configOverrides = buildConfigOverrides(options);
  const config = createConfig(configOverrides);
  const configProjection = {
    bridgeGateMode: config.governedMcpVcpNativeBridgeGateMode,
    readDelegationMode: config.governedMcpVcpNativeReadDelegationMode,
    writeDelegationMode: config.governedMcpVcpNativeWriteDelegationMode,
    runtimeTarget: config.governedMcpVcpNativeRuntimeTarget,
    httpMcpTarget: config.governedMcpVcpNativeHttpMcpTarget,
    warnings: config.governedMcpVcpNativeBridgeConfigWarnings,
    endpointDisclosed: false,
    tokenMaterialDisclosed: false
  };

  if (
    config.governedMcpVcpNativeRuntimeTarget.accepted !== true ||
    config.governedMcpVcpNativeHttpMcpTarget.accepted !== true
  ) {
    const configBlockers = collectConfigAcceptanceBlockers(config, []);
    const summary = buildNoOperationSummary('native_target_not_accepted', configBlockers);
    const rejectedResult = {
      accepted: false,
      status: 'native_target_not_accepted',
      config: configProjection,
      operations: {},
      summary,
      readinessClaimed: false
    };
    rejectedResult.evidenceArtifact = await writeEvidenceArtifact(
      rejectedResult,
      options.evidenceOutputPath
    );
    return rejectedResult;
  }

  const app = createCodexMemoryApplication(configOverrides);
  const nativeMcpTargetPreflightEvidence = await runNativeMcpTargetPreflight({
    privateConfig: getGovernedMcpVcpNativeHttpMcpTargetPrivateConfig(config),
    includeWrite: options.includeWrite,
    includeWriteSuite: options.includeWriteSuite
  });
  const operations = {};
  try {
    await app.initialize();
    operations.read = projectOperationResult(
      'search_memory',
      await app.callTool('search_memory', buildReadArgs(options), buildReadContext(options))
    );
    if (options.includeReadSuite) {
      operations.memoryOverview = projectOperationResult(
        'memory_overview',
        await app.callTool(
          'memory_overview',
          buildReadSuiteArgs('memory_overview', options),
          buildReadContext(options)
        )
      );
      operations.audit = projectOperationResult(
        'audit_memory',
        await app.callTool(
          'audit_memory',
          buildReadSuiteArgs('audit_memory', options),
          buildReadContext(options)
        )
      );
    }
    if (options.includeWrite) {
      operations.write = projectOperationResult(
        'record_memory',
        await app.callTool(
          'record_memory',
          buildWriteArgs('record_memory', options),
          buildWriteContext('record_memory', options)
        )
      );
    }
    if (options.includeWriteSuite) {
      operations.tombstone = projectOperationResult(
        'tombstone_memory',
        await app.callTool(
          'tombstone_memory',
          buildWriteArgs('tombstone_memory', options),
          buildWriteContext('tombstone_memory', options)
        )
      );
      operations.supersede = projectOperationResult(
        'supersede_memory',
        await app.callTool(
          'supersede_memory',
          buildWriteArgs('supersede_memory', options),
          buildWriteContext('supersede_memory', options)
        )
      );
    }
  } finally {
    if (typeof app.close === 'function') {
      await app.close();
    }
  }

  const summary = buildSummary({
    config,
    operations,
    includeReadSuite: options.includeReadSuite,
    includeWrite: options.includeWrite,
    nativeMcpTargetPreflightEvidence
  });
  const result = {
    accepted: summary.accepted,
    status: summary.status,
    config: configProjection,
    operations,
    summary,
    readinessClaimed: false
  };
  result.evidenceArtifact = await writeEvidenceArtifact(result, options.evidenceOutputPath);
  return result;
}

function renderText(result) {
  const lines = [
    `status: ${result.status}`,
    `accepted: ${result.accepted === true}`,
    `primary_runtime: ${REQUIRED_PRIMARY_RUNTIME}`,
    `access_path: governed MCP tools`
  ];
  for (const operation of Object.values(result.operations || {})) {
    lines.push(
      `${operation.toolName}: accepted=${operation.accepted === true} delegated=${operation.delegated === true} audit=${operation.receipt.localAuditReceipt.status || 'missing'} rollback=${operation.receipt.rollbackPosture || 'missing'}`
    );
  }
  lines.push('endpoint_disclosed: false');
  lines.push('token_material_disclosed: false');
  if (result.evidenceArtifact?.requested === true) {
    lines.push(`evidence_artifact: ${result.evidenceArtifact.status}`);
    lines.push('evidence_output_path_disclosed: false');
  }
  const blockers = result.summary?.acceptanceBlockers?.all || [];
  if (blockers.length > 0) {
    lines.push(`acceptance_blockers: ${blockers.join(',')}`);
  }
  lines.push('readiness_claimed: false');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2), process.env);
  if (options.verifyEvidencePath) {
    const verification = await verifyGovernedVcpNativeAcceptanceEvidenceFile(options.verifyEvidencePath);
    if (options.json) {
      process.stdout.write(`${JSON.stringify(verification, null, 2)}\n`);
    } else {
      process.stdout.write([
        `status: ${verification.status}`,
        `valid: ${verification.valid === true}`,
        `blockers: ${(verification.blockers || []).join(',') || 'none'}`,
        'evidence_path_disclosed: false',
        'readiness_claimed: false'
      ].join('\n') + '\n');
    }
    if (verification.valid !== true) {
      process.exitCode = 2;
    }
    return;
  }
  const result = await runGovernedVcpNativeAcceptance(options);
  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(renderText(result));
  }
  if (result.accepted !== true) {
    process.exitCode = 2;
  }
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`${error && error.message ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  buildConfigOverrides,
  buildEvidenceArtifact,
  buildReadContext,
  buildWriteContext,
  collectConfigAcceptanceBlockers,
  collectOperationAcceptanceBlockers,
  operationAccepted,
  parseArgs,
  projectOperationResult,
  runGovernedVcpNativeAcceptance,
  validateGovernedVcpNativeAcceptanceEvidenceArtifact,
  verifyGovernedVcpNativeAcceptanceEvidenceFile,
  writeEvidenceArtifact
};
