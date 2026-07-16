const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const {
  CodexMemoryMcpServer,
  buildGovernedMcpEffectiveRequestContext,
  buildGovernedMcpServerMetadata,
  buildGovernedMcpToolMetadata,
  buildGovernedMcpRequestContextFromParams,
  getPublicToolDefinitions
} = require('../src/adapters/codex-mcp/server');
const {
  validateGovernedMcpMetadataCoversCurrentProductGoal,
  validateGovernedMcpServerMetadataCoversCurrentProductGoal,
  validateGovernedMcpToolsListCoversCurrentProductGoal
} = require('../src/core/CurrentProductGoalContract');

function nativeInvocationReceiptForPayload(payload, overrides = {}) {
  return {
    targetReferenceName: payload.targetReferenceName,
    targetKind: 'mcp_server',
    transportCategory: 'local_http_transport',
    mcpMethod: 'tools/call',
    toolName: payload.toolName,
    requestIdCategory: 'generated_bridge_request_id',
    jsonRpcResponseIdMatched: true,
    governanceMetadataPath: 'params._meta.codexMemoryGovernance',
    governanceMetadataSent: true,
    governanceMetadataRawValueDisclosed: false,
    statusClass: 'success',
    httpStatusClass: 'success',
    jsonRpcErrorPresent: false,
    responseShapeCategory: 'object_top_level_kind_only_no_field_names',
    topLevelKindCategory: 'object',
    rawRequestBodyDisclosed: false,
    rawResponseBodyDisclosed: false,
    readinessClaimed: false,
    ...overrides
  };
}

function receiptAwareNativeToolCaller(caller) {
  if (typeof caller !== 'function' || typeof caller.callWithReceipt === 'function') return caller;
  const wrapped = async payload => caller(payload);
  Object.assign(wrapped, caller);
  wrapped.callWithReceipt = async payload => ({
    value: await caller(payload),
    receipt: nativeInvocationReceiptForPayload(payload, {
      ...(payload.toolName === 'record_memory' ||
      payload.toolName === 'tombstone_memory' ||
      payload.toolName === 'supersede_memory'
        ? {
            nativeRuntimeReceipt: {
              memoryWritePerformed: true,
              durableWritePerformed: true
            }
          }
        : {})
    })
  });
  return wrapped;
}

function receiptAwareNativeCallerOverrides(overrides = {}) {
  const wrapped = { ...overrides };
  if (Object.prototype.hasOwnProperty.call(overrides, 'governedMcpVcpNativeReadDelegationToolCaller')) {
    wrapped.governedMcpVcpNativeReadDelegationToolCaller = receiptAwareNativeToolCaller(
      overrides.governedMcpVcpNativeReadDelegationToolCaller
    );
  }
  if (Object.prototype.hasOwnProperty.call(overrides, 'governedMcpVcpNativeWriteDelegationToolCaller')) {
    wrapped.governedMcpVcpNativeWriteDelegationToolCaller = receiptAwareNativeToolCaller(
      overrides.governedMcpVcpNativeWriteDelegationToolCaller
    );
  }
  return wrapped;
}

async function withApp(handler, appOverrides = {}) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-test-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data'),
    ...receiptAwareNativeCallerOverrides(appOverrides)
  });

  await app.initialize();

  try {
    await handler({ app, tempBasePath });
  } finally {
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
}

test('codex-memory MCP should initialize a session and expose expected server info', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const result = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {}
    });

    assert.ok(result.sessionId);
    assert.equal(result.response.result.protocolVersion, '2025-06-18');
    assert.equal(result.response.result.serverInfo.name, 'vcp_codex_memory');
    assert.match(result.response.result.instructions, /read-only plus proposal-only by default/);
    assert.match(result.response.result.instructions, /params\._meta\.codexMemoryGovernance/);
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.productGoal.primaryRuntime,
      'VCPToolBox native memory'
    );
    const coverage = validateGovernedMcpServerMetadataCoversCurrentProductGoal(
      result.response.result._meta.codexMemoryGovernedBridge
    );

    assert.equal(coverage.accepted, true, coverage.blockers.join(', '));
    assert.equal(coverage.runtimeTargetBoundRequired, false);
    assert.equal(coverage.vcpToolBoxCalled, false);
    assert.equal(coverage.mcpToolCalled, false);
    assert.equal(coverage.memoryReadPerformed, false);
    assert.equal(coverage.memoryWritePerformed, false);
    assert.equal(coverage.readinessClaimed, false);
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.productGoal.primaryValue,
      'governance, not memory intelligence'
    );
    assert.deepEqual(
      result.response.result._meta.codexMemoryGovernedBridge.nativeBridge.eligibleTools.read,
      ['search_memory', 'memory_overview', 'audit_memory']
    );
    assert.deepEqual(
      result.response.result._meta.codexMemoryGovernedBridge.nativeBridge.eligibleTools.write,
      ['record_memory', 'tombstone_memory', 'supersede_memory']
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.governanceTransport.metadataPath,
      'params._meta.codexMemoryGovernance'
    );
    assert.deepEqual(
      result.response.result._meta.codexMemoryGovernedBridge.clientIdentity.allowedClientIds,
      ['Codex', 'Claude']
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.clientIdentity.toolArgumentsMayOverride,
      false
    );
    assert.deepEqual(
      result.response.result._meta.codexMemoryGovernedBridge.scopeBoundary.requiredFieldNames,
      ['project_id', 'scope_id', 'workspace_id', 'client_id', 'visibility']
    );
    assert.deepEqual(
      result.response.result._meta.codexMemoryGovernedBridge.scopeBoundary.acceptedVisibility,
      ['private', 'workspace', 'project', 'shared']
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.scopeBoundary.rawScopeValueReturned,
      false
    );
    assert.deepEqual(
      result.response.result._meta.codexMemoryGovernedBridge.readWriteAuthority.readTools,
      ['search_memory', 'memory_overview', 'audit_memory']
    );
    assert.deepEqual(
      result.response.result._meta.codexMemoryGovernedBridge.readWriteAuthority.writeTools,
      ['record_memory', 'tombstone_memory', 'supersede_memory']
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.readWriteAuthority.writePolicyForWriteTools,
      'exact_approval'
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.readWriteAuthority.mixedReadWriteAllowed,
      false
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.readWriteAuthority.unboundedWriteAllowed,
      false
    );
    assert.deepEqual(
      result.response.result._meta.codexMemoryGovernedBridge.invocationProfile.acceptedProfiles,
      ['governed_read_only', 'governed_bounded_write']
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.invocationProfile.readProfile,
      'governed_read_only'
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.invocationProfile.writeProfile,
      'governed_bounded_write'
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.invocationProfile.profileMustMatchToolDirection,
      true
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.invocationProfile.locatorOrSecretMaterialAllowed,
      false
    );
    assert.deepEqual(
      result.response.result._meta.codexMemoryGovernedBridge.outputDisclosureBudget.acceptedLevels,
      ['none', 'receipt_only', 'metadata', 'shape_only', 'summary', 'structured']
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.outputDisclosureBudget.source,
      'bridge_gate_normalized_governance'
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.outputDisclosureBudget.bound,
      true
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.outputDisclosureBudget.defaultLevel,
      'summary'
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.outputDisclosureBudget.lowDisclosureRequired,
      true
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.outputDisclosureBudget.rawOutputAllowed,
      false
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.outputDisclosureBudget.toolArgumentsMayOverride,
      false
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.outputDisclosureBudget
        .governanceMetadataMayOverride,
      false
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.outputDisclosureBudget.overBudgetFallbackToRawOutput,
      false
    );
    assert.deepEqual(
      result.response.result._meta.codexMemoryGovernedBridge.rollbackPosture.acceptedReadPostures,
      ['no_runtime_state_to_rollback', 'read_only_no_write']
    );
    assert.deepEqual(
      result.response.result._meta.codexMemoryGovernedBridge.rollbackPosture.acceptedWritePostures,
      ['bounded_rollback_plan', 'mutation_cleanup_plan']
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.rollbackPosture
        .readRollbackPlanReferenceAllowed,
      false
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.rollbackPosture.readRollbackDisposition,
      'no_runtime_write_to_rollback'
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.rollbackPosture
        .writeRollbackPlanReferenceRequired,
      true
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.rollbackPosture
        .writeRollbackPlanReferenceSafeRequired,
      true
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.rollbackPosture.writeRollbackPlanBoundRequired,
      true
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.rollbackPosture
        .writeRollbackPlanShapeOnlyRequired,
      true
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.rollbackPosture.automaticRollbackAppliedByBridge,
      false
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.rollbackPosture.source,
      'bridge_gate_normalized_governance'
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.rollbackPosture.bound,
      true
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.rollbackPosture.toolArgumentsMayOverride,
      false
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.rollbackPosture.governanceMetadataMayOverride,
      false
    );
    assert.deepEqual(
      result.response.result._meta.codexMemoryGovernedBridge.governanceTransport.requiredForNativeDelegation,
      ['trustedExecutionContext', 'auditReceipt', 'outputDisclosureBudget', 'rollbackPosture']
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.auditReceipt.requiredForNativeDelegation,
      true
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.auditReceipt.source,
      'bridge_gate_normalized_governance'
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.auditReceipt.lowDisclosureBound,
      true
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.auditReceipt.toolArgumentsMayOverride,
      false
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.auditReceipt.governanceMetadataMayOverride,
      false
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.auditReceipt.localReceiptEventType,
      'governed_mcp_vcp_native_bridge_receipt'
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.auditReceipt.localFallbackReceiptEventType,
      'governed_mcp_vcp_native_read_fallback_receipt'
    );
    assert.deepEqual(
      result.response.result._meta.codexMemoryGovernedBridge.auditReceipt.recordedEvidenceFields,
      [
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
      ]
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.auditReceipt.rawScopePersisted,
      false
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.auditReceipt.rawRequestBodyPersisted,
      false
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.auditReceipt.rawResponseBodyPersisted,
      false
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.governanceTransport
        .trustedExecutionContextMustMatchTransportContext,
      true
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.governanceTransport
        .transportContextFieldsOverrideGovernanceMetadata,
      true
    );
    assert.equal(
      result.response.result._meta.codexMemoryGovernedBridge.disclosure.serverHandshakeLowDisclosure,
      true
    );
  });
});

test('MCP initialize governed bridge metadata stays low-disclosure', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const result = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {}
    });
    const meta = result.response.result._meta.codexMemoryGovernedBridge;
    const serialized = JSON.stringify(result.response.result);

    assert.equal(meta.nativeBridge.gateMode, 'observe');
    assert.equal(meta.runtimeTarget.configured, true);
    assert.equal(meta.runtimeTarget.targetReferenceName, 'operator-vcp-toolbox-service-ref');
    assert.equal(meta.runtimeTarget.endpointDisclosed, false);
    assert.equal(meta.runtimeTarget.tokenMaterialDisclosed, false);
    assert.equal(meta.runtimeTarget.locatorDisclosed, false);
    assert.equal(meta.disclosure.endpointReturned, false);
    assert.equal(meta.disclosure.tokenMaterialReturned, false);
    assert.equal(meta.disclosure.locatorReturned, false);
    assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
    assert.equal(serialized.includes('SECRET_TOKEN_SHOULD_NOT_ECHO'), false);
  }, {
    mcpPublicToolSurface: 'full',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary',
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeRuntimeTarget: {
      accepted: true,
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server',
      sourceAuthority: 'env'
    },
    governedMcpVcpNativeHttpMcpTarget: {
      endpoint: 'http://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO.invalid/mcp',
      bearerToken: 'SECRET_TOKEN_SHOULD_NOT_ECHO'
    }
  });
});

test('MCP initialize governed bridge metadata sanitizes unsafe runtime target config defensively', async () => {
  const server = new CodexMemoryMcpServer({
    app: {
      config: {
        serverVersion: 'test',
        governedMcpVcpNativeRuntimeTarget: {
          accepted: true,
          targetReferenceName: 'http://PRIVATE_RUNTIME_ENDPOINT_SHOULD_NOT_ECHO.invalid/mcp',
          targetKind: 'PRIVATE_KIND_SHOULD_NOT_ECHO',
          sourceAuthority: 'SECRET_SOURCE_SHOULD_NOT_ECHO'
        }
      }
    }
  });
  const result = await server.handleJsonRpc({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {}
  });
  const runtimeTarget = result.response.result._meta.codexMemoryGovernedBridge.runtimeTarget;
  const serialized = JSON.stringify(result.response.result);

  assert.equal(runtimeTarget.configured, false);
  assert.equal(runtimeTarget.source, null);
  assert.equal(runtimeTarget.bound, false);
  assert.equal(runtimeTarget.targetReferenceName, null);
  assert.equal(runtimeTarget.targetKind, null);
  assert.equal(runtimeTarget.sourceAuthority, null);
  assert.equal(runtimeTarget.toolArgumentsMayOverride, false);
  assert.equal(runtimeTarget.governanceMetadataMayOverride, false);
  assert.equal(runtimeTarget.endpointDisclosed, false);
  assert.equal(runtimeTarget.tokenMaterialDisclosed, false);
  assert.equal(runtimeTarget.locatorDisclosed, false);
  assert.equal(serialized.includes('PRIVATE_RUNTIME_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_KIND_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_SOURCE_SHOULD_NOT_ECHO'), false);
});

test('governed native bridge server metadata helper summarizes product goal without readiness claim', () => {
  const meta = buildGovernedMcpServerMetadata({});
  const coverage = validateGovernedMcpServerMetadataCoversCurrentProductGoal(meta);

  assert.equal(meta.schemaVersion, 'codex_memory_governed_bridge_server_meta_v1');
  assert.equal(coverage.accepted, true, coverage.blockers.join(', '));
  assert.equal(coverage.runtimeTargetBoundRequired, false);
  assert.deepEqual(coverage.requiredNativeBridgeTools, [
    'search_memory',
    'memory_overview',
    'audit_memory',
    'record_memory',
    'tombstone_memory',
    'supersede_memory'
  ]);
  assert.equal(coverage.readinessClaimed, false);
  assert.equal(meta.productGoal.primaryRuntime, 'VCPToolBox native memory');
  assert.equal(meta.productGoal.primaryValue, 'governance, not memory intelligence');
  assert.equal(meta.nativeBridge.accessPath, 'governed MCP tools');
  assert.equal(meta.nativeBridge.readinessClaimed, false);
  assert.equal(meta.runtimeTarget.primaryRuntime, 'VCPToolBox native memory');
  assert.equal(meta.runtimeTarget.source, null);
  assert.equal(meta.runtimeTarget.bound, false);
  assert.equal(meta.runtimeTarget.configured, false);
  assert.equal(meta.runtimeTarget.toolArgumentsMayOverride, false);
  assert.equal(meta.runtimeTarget.governanceMetadataMayOverride, false);
  assert.equal(meta.runtimeTarget.endpointDisclosed, false);
  assert.equal(meta.runtimeTarget.tokenMaterialDisclosed, false);
  assert.deepEqual(meta.clientIdentity.allowedClientIds, ['Codex', 'Claude']);
  assert.equal(meta.clientIdentity.governanceMetadataMayOverrideTransportContext, false);
  assert.deepEqual(
    meta.scopeBoundary.requiredFieldNames,
    ['project_id', 'scope_id', 'workspace_id', 'client_id', 'visibility']
  );
  assert.deepEqual(meta.scopeBoundary.acceptedVisibility, ['private', 'workspace', 'project', 'shared']);
  assert.equal(meta.scopeBoundary.toolArgumentsMayOverride, false);
  assert.deepEqual(meta.readWriteAuthority.readTools, ['search_memory', 'memory_overview', 'audit_memory']);
  assert.deepEqual(meta.readWriteAuthority.writeTools, ['record_memory', 'tombstone_memory', 'supersede_memory']);
  assert.equal(meta.readWriteAuthority.writePolicyForWriteTools, 'exact_approval');
  assert.equal(meta.readWriteAuthority.writeRequiresExactApproval, true);
  assert.equal(meta.readWriteAuthority.mixedReadWriteAllowed, false);
  assert.equal(meta.readWriteAuthority.unboundedWriteAllowed, false);
  assert.equal(meta.readWriteAuthority.governanceMetadataMayOverride, false);
  assert.deepEqual(meta.invocationProfile.acceptedProfiles, [
    'governed_read_only',
    'governed_bounded_write'
  ]);
  assert.equal(meta.invocationProfile.transport, 'mcp');
  assert.equal(meta.invocationProfile.readProfile, 'governed_read_only');
  assert.equal(meta.invocationProfile.writeProfile, 'governed_bounded_write');
  assert.deepEqual(meta.invocationProfile.readTools, ['search_memory', 'memory_overview', 'audit_memory']);
  assert.deepEqual(meta.invocationProfile.writeTools, ['record_memory', 'tombstone_memory', 'supersede_memory']);
  assert.equal(meta.invocationProfile.profileMustMatchToolDirection, true);
  assert.equal(meta.invocationProfile.toolArgumentsMayOverride, false);
  assert.equal(meta.invocationProfile.governanceMetadataMayOverride, false);
  assert.equal(meta.invocationProfile.locatorOrSecretMaterialAllowed, false);
  assert.deepEqual(meta.outputDisclosureBudget.acceptedLevels, [
    'none',
    'receipt_only',
    'metadata',
    'shape_only',
    'summary',
    'structured'
  ]);
  assert.equal(meta.outputDisclosureBudget.defaultLevel, 'summary');
  assert.equal(meta.outputDisclosureBudget.lowDisclosureRequired, true);
  assert.equal(meta.outputDisclosureBudget.rawOutputAllowed, false);
  assert.equal(meta.outputDisclosureBudget.maxItems, 5);
  assert.equal(meta.outputDisclosureBudget.maxBytes, 4096);
  assert.equal(meta.outputDisclosureBudget.toolArgumentsMayIncreaseBudget, false);
  assert.equal(meta.outputDisclosureBudget.toolArgumentsMayRequestRawOutput, false);
  assert.equal(meta.outputDisclosureBudget.governanceMetadataMaySupplyBudget, true);
  assert.equal(meta.outputDisclosureBudget.locatorOrSecretMaterialAllowed, false);
  assert.equal(meta.outputDisclosureBudget.overBudgetFallbackToRawOutput, false);
  assert.equal(meta.governanceTransport.toolArgumentsMayCarryGovernance, false);
  assert.equal(meta.governanceTransport.writeRequiresExactApproval, true);
  assert.equal(meta.auditReceipt.requiredForNativeDelegation, true);
  assert.equal(meta.auditReceipt.lowDisclosure, true);
  assert.equal(meta.auditReceipt.localReceiptEventType, 'governed_mcp_vcp_native_bridge_receipt');
  assert.equal(meta.auditReceipt.localFallbackReceiptEventType, 'governed_mcp_vcp_native_read_fallback_receipt');
  assert.ok(meta.auditReceipt.recordedEvidenceFields.includes('scopeFingerprintPresent'));
  assert.ok(meta.auditReceipt.recordedEvidenceFields.includes('exactApprovalSafetyBooleans'));
  assert.ok(meta.auditReceipt.recordedEvidenceFields.includes('delegationStatusClass'));
  assert.ok(meta.auditReceipt.recordedEvidenceFields.includes('delegationReasonCode'));
  assert.ok(meta.auditReceipt.recordedEvidenceFields.includes('nativeInvocationReceiptBindingMatched'));
  assert.ok(meta.auditReceipt.recordedEvidenceFields.includes('nativeInvocationGovernanceMetadataBinding'));
  assert.ok(meta.auditReceipt.recordedEvidenceFields.includes('nativeInvocationJsonRpcRequestIdCategory'));
  assert.ok(meta.auditReceipt.recordedEvidenceFields.includes('nativeInvocationJsonRpcResponseIdMatched'));
  assert.ok(meta.auditReceipt.recordedEvidenceFields.includes('nativeInvocationJsonRpcErrorPresent'));
  assert.ok(meta.auditReceipt.recordedEvidenceFields.includes('nativeInvocationJsonRpcErrorReasonCode'));
  assert.ok(meta.auditReceipt.recordedEvidenceFields.includes('rollbackReasonCode'));
  assert.ok(meta.auditReceipt.recordedEvidenceFields.includes('nativeInvocationShapeBuckets'));
  assert.equal(meta.auditReceipt.recordsDelegationStatusReason, true);
  assert.equal(meta.auditReceipt.recordsNativeInvocationReceiptBinding, true);
  assert.equal(meta.auditReceipt.recordsNativeInvocationGovernanceMetadataBinding, true);
  assert.equal(meta.auditReceipt.recordsRollbackReasonCode, true);
  assert.equal(meta.auditReceipt.recordsNativeInvocationShapeBuckets, true);
  assert.equal(meta.auditReceipt.rawScopePersisted, false);
  assert.equal(meta.auditReceipt.rawRequestBodyPersisted, false);
  assert.equal(meta.auditReceipt.rawResponseBodyPersisted, false);
  assert.equal(meta.auditReceipt.rawNativePayloadPersisted, false);
  assert.equal(meta.rollbackPosture.defaultReadPosture, 'no_runtime_state_to_rollback');
  assert.deepEqual(meta.rollbackPosture.acceptedReadPostures, [
    'no_runtime_state_to_rollback',
    'read_only_no_write'
  ]);
  assert.deepEqual(meta.rollbackPosture.acceptedWritePostures, [
    'bounded_rollback_plan',
    'mutation_cleanup_plan'
  ]);
  assert.equal(meta.rollbackPosture.readRollbackPlanReferenceAllowed, false);
  assert.equal(meta.rollbackPosture.readRollbackDisposition, 'no_runtime_write_to_rollback');
  assert.deepEqual(meta.rollbackPosture.postCommitFailureReasonCodes, [
    'write_post_commit_output_budget_exceeded',
    'write_post_commit_native_invocation_receipt_unbound',
    'write_post_commit_audit_receipt_not_appended'
  ]);
  assert.equal(meta.rollbackPosture.writeRollbackPlanReferenceRequired, true);
  assert.equal(meta.rollbackPosture.writeRollbackPlanReferenceSafeRequired, true);
  assert.equal(meta.rollbackPosture.writeRollbackPlanBoundRequired, true);
  assert.equal(meta.rollbackPosture.writeRollbackPlanShapeOnlyRequired, true);
  assert.equal(meta.rollbackPosture.writeRollbackApplyRequiresGovernedFollowup, true);
  assert.equal(meta.rollbackPosture.automaticRollbackAppliedByBridge, false);
  assert.equal(meta.disclosure.serverHandshakeLowDisclosure, true);
});

test('governed native bridge tool metadata sanitizes unsafe runtime target config defensively', () => {
  const meta = buildGovernedMcpToolMetadata('search_memory', {
    governedMcpVcpNativeRuntimeTarget: {
      accepted: true,
      targetReferenceName: 'http://PRIVATE_RUNTIME_ENDPOINT_SHOULD_NOT_ECHO.invalid/mcp',
      targetKind: 'PRIVATE_KIND_SHOULD_NOT_ECHO',
      sourceAuthority: 'SECRET_SOURCE_SHOULD_NOT_ECHO'
    }
  });
  const serialized = JSON.stringify(meta);

  assert.equal(meta.runtimeTarget.configured, false);
  assert.equal(meta.runtimeTarget.source, null);
  assert.equal(meta.runtimeTarget.bound, false);
  assert.equal(meta.runtimeTarget.targetReferenceName, null);
  assert.equal(meta.runtimeTarget.targetKind, null);
  assert.equal(meta.runtimeTarget.sourceAuthority, null);
  assert.equal(meta.runtimeTarget.toolArgumentsMayOverride, false);
  assert.equal(meta.runtimeTarget.governanceMetadataMayOverride, false);
  assert.equal(meta.runtimeTarget.endpointDisclosed, false);
  assert.equal(meta.runtimeTarget.tokenMaterialDisclosed, false);
  assert.equal(meta.runtimeTarget.locatorDisclosed, false);
  assert.equal(serialized.includes('PRIVATE_RUNTIME_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_KIND_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_SOURCE_SHOULD_NOT_ECHO'), false);
});

test('codex-memory MCP defaults to read-only plus proposal-only public surface', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const list = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    });
    assert.deepEqual(
      list.response.result.tools.map(tool => tool.name).sort(),
      ['audit_memory', 'memory_overview', 'prepare_memory_context', 'propose_memory_delta', 'search_memory']
    );
    const prepareMemoryContext = list.response.result.tools.find(tool =>
      tool.name === 'prepare_memory_context'
    );
    assert.ok(prepareMemoryContext.inputSchema.properties.task.properties.scope_id);

    const contextPackage = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'prepare_memory_context',
        arguments: {
          task: {
            title: 'Default read-only context smoke',
            user_request: 'Build a task-start memory package without mutation.',
            project_id: 'codex-memory',
            scope_id: 'scope-default-smoke',
            client_id: 'codex',
            visibility: 'project'
          },
          options: {
            max_items: 2,
            max_bytes: 6000
          }
        }
      }
    });

    assert.equal(contextPackage.response.result.isError, false);
    assert.equal(
      contextPackage.response.result.structuredContent.access.mode,
      'prepare_memory_context_readonly'
    );
    assert.equal(
      contextPackage.response.result.structuredContent.access.durableMutationPerformed,
      false
    );

    const proposal = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'propose_memory_delta',
        arguments: {
          task_id: 'CM-2011',
          task: {
            title: 'Default proposal-only delta smoke',
            project_id: 'codex-memory',
            client_id: 'codex',
            visibility: 'project'
          },
          evidence_refs: ['tests/mcp-contract.test.js'],
          candidates: [{
            target: 'process',
            intent: 'propose_memory_delta is exposed as proposal-only by default.',
            evidence_refs: ['default MCP surface contract test'],
            tags: ['proposal-only']
          }]
        }
      }
    });

    assert.equal(proposal.response.result.isError, false);
    assert.equal(
      proposal.response.result.structuredContent.status,
      'PROPOSE_MEMORY_DELTA_ACCEPTED'
    );
    assert.equal(
      proposal.response.result.structuredContent.access.memoryWritten,
      false
    );
    assert.equal(
      proposal.response.result.structuredContent.commit_contract.public_mcp_registered,
      false
    );

    const hiddenWrite = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'process',
          title: 'Hidden write',
          content: 'This write must not pass through the default MCP surface.',
          evidence: 'default surface contract test',
          validated: true,
          reusable: false,
          sensitivity: 'none'
        }
      }
    });
    assert.equal(hiddenWrite.response.error.code, -32001);
    assert.equal(hiddenWrite.response.error.data.code, 'mcp_tool_not_exposed');
  });
});

test('MCP prepare_memory_context returns isError when primary native recall is unavailable', async () => {
  const nativeCaller = async () => {
    throw new Error('SYNTHETIC_PRIVATE_NATIVE_FAILURE_MUST_NOT_ECHO');
  };

  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const executionContext = {
      agentAlias: 'Codex',
      agentId: 'codex-desktop',
      clientId: 'codex',
      projectId: 'codex-memory',
      workspaceId: 'workspace-alpha',
      visibility: 'private',
      requestSource: 'mcp-native-unavailable-test'
    };
    const result = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'prepare_memory_context',
        arguments: {
          task: {
            title: 'Unavailable native task-start context',
            user_request: 'Fail closed without an accepted native read.',
            project_id: 'codex-memory',
            workspace_id: 'workspace-alpha',
            client_id: 'codex',
            visibility: 'private'
          },
          options: {
            max_items: 1,
            max_bytes: 4000
          }
        }
      }
    }, { executionContext });
    const payload = result.response.result.structuredContent;
    const serialized = JSON.stringify(result.response.result);

    assert.equal(result.response.result.isError, true);
    assert.equal(payload.status, 'PREPARE_MEMORY_CONTEXT_RECALL_REJECTED');
    assert.equal(payload.accepted, false);
    assert.equal(payload.decision, 'rejected');
    assert.equal(payload.reasonCode, 'vcp_native_recall_unavailable');
    assert.equal(payload.access.sourceRuntime, 'vcp_native_unavailable');
    assert.equal(payload.access.nativeRecallAccepted, false);
    assert.equal(payload.access.localMemoryFallbackUsed, false);
    assert.equal(payload.access.rawMemoryReturned, false);
    assert.equal(payload.memory_context_package, undefined);
    assert.equal(serialized.includes('SYNTHETIC_PRIVATE_NATIVE_FAILURE_MUST_NOT_ECHO'), false);
  }, {
    governedMcpVcpNativeRuntimeProfile: 'wsl-newapi-prod',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary',
    governedMcpVcpNativeReadDelegationToolCaller: nativeCaller
  });
});

test('prepare_memory_context preserves useful low-disclosure metadata without raw candidate fields', async () => {
  await withApp(async ({ app }) => {
    let searchOptions = null;
    app.services.passiveRecallService.search = async options => {
      searchOptions = options;
      return [
        {
          target: 'process',
          score: 0.9,
          matchedTags: ['blocker-policy', 'governance'],
          sourceKinds: ['synthetic-metadata'],
          updatedAt: new Date().toISOString(),
          title: 'private raw title must not escape',
          snippet: 'private raw snippet must not escape',
          text: 'private raw text must not escape',
          content: 'private raw content must not escape',
          sourceFile: 'private/source.md',
          memoryId: 'private-memory-id'
        },
        {
          target: 'process',
          score: 0.8,
          coreTags: ['decision-approved'],
          sourceKinds: ['synthetic-metadata'],
          updatedAt: new Date().toISOString(),
          title: 'second private title 8675309'
        }
      ];
    };

    const result = await app.callTool('prepare_memory_context', {
      task: {
        title: 'Metadata-only context package',
        user_request: 'Use bounded recall without raw memory fields.'
      },
      options: {
        max_items: 2,
        max_bytes: 6000
      }
    });
    const serialized = JSON.stringify(result);

    assert.equal(searchOptions.readOnly, true);
    assert.equal(searchOptions.noRawContentRead, true);
    assert.equal(searchOptions.includeContent, false);
    assert.equal(result.access.rawMemoryReturned, false);
    assert.equal(result.memory_context_package.blockers.length, 1);
    assert.equal(result.memory_context_package.blockers[0].freshness, 'recent');
    assert.match(result.memory_context_package.blockers[0].statement, /blocker-policy/);
    assert.equal(result.memory_context_package.recent_decisions.length, 1);
    assert.match(result.memory_context_package.recent_decisions[0].statement, /decision-approved/);
    assert.doesNotMatch(serialized, /"matchedTags"|"coreTags"|"createdAt"|"updatedAt"/);
    assert.doesNotMatch(serialized, /private raw title|second private title|private raw snippet|private raw text|private raw content|private\/source|private-memory-id/);
  });
});

test('prepare_memory_context preserves title-only recall semantics through the real metadata projection', async () => {
  await withApp(async ({ app }) => {
    app.services.passiveRecallService.search = async () => [
      {
        target: 'process',
        score: 0.9,
        titleHitCount: 1,
        sourceKinds: ['synthetic-metadata'],
        updatedAt: new Date().toISOString(),
        title: 'Blocker: private transport detail must not escape'
      },
      {
        target: 'process',
        score: 0.8,
        titleHitCount: 1,
        sourceKinds: ['synthetic-metadata'],
        updatedAt: new Date().toISOString(),
        title: 'Decision: private approval detail 8675309'
      }
    ];

    const result = await app.callTool('prepare_memory_context', {
      task: {
        title: 'Projected context semantics',
        user_request: 'Preserve low-disclosure blocker and decision signals.'
      },
      options: {
        max_items: 2,
        max_bytes: 6000
      }
    });
    const serialized = JSON.stringify(result);

    assert.equal(result.memory_context_package.blockers.length, 1);
    assert.match(result.memory_context_package.blockers[0].statement, /blocker signal/i);
    assert.equal(result.memory_context_package.blockers[0].freshness, 'recent');
    assert.deepEqual(result.memory_context_package.blockers[0].reason_codes, ['title_match']);
    assert.equal(result.memory_context_package.recent_decisions.length, 1);
    assert.match(result.memory_context_package.recent_decisions[0].statement, /decision signal/i);
    assert.equal(result.memory_context_package.recent_decisions[0].freshness, 'recent');
    assert.deepEqual(result.memory_context_package.recent_decisions[0].reason_codes, ['title_match']);
    assert.doesNotMatch(serialized, /private transport detail|private approval detail/);
    assert.doesNotMatch(serialized, /"title"|"snippet"|"text"|"content"/);
  });
});

test('prepare_memory_context forwards scope_id into the real app recall boundary', async () => {
  await withApp(async ({ app }) => {
    let searchOptions = null;
    app.services.passiveRecallService.search = async options => {
      searchOptions = options;
      return [];
    };

    const result = await app.callTool('prepare_memory_context', {
      task: {
        title: 'Scope-isolated context package',
        project_id: 'codex-memory',
        scope_id: 'scope-metadata-only',
        workspace_id: 'workspace-alpha',
        client_id: 'codex',
        visibility: 'project'
      },
      options: {
        max_items: 2,
        max_bytes: 6000
      }
    });

    assert.equal(result.accepted, true);
    assert.equal(searchOptions.candidateFilters.scopeId, 'scope-metadata-only');
    assert.equal(searchOptions.auditContext.scope.scopeIdPresent, true);
    assert.equal(searchOptions.auditContext.scope.scopeStrict, true);
  });
});

test('hardened MCP surface ignores explicit public tool names defensively', async () => {
  const config = {
    securityProfile: 'hardened',
    mcpPublicToolSurface: 'full',
    mcpPublicToolNames: ['record_memory', 'validate_memory'],
    exposeControlledMutationMcpTools: true,
    exposeWriteMcpTools: true
  };
  assert.deepEqual(
    getPublicToolDefinitions(config).map(tool => tool.name).sort(),
    ['audit_memory', 'memory_overview', 'prepare_memory_context', 'propose_memory_delta', 'search_memory']
  );

  const server = new CodexMemoryMcpServer({
    app: {
      config,
      callTool: async () => {
        throw new Error('hidden tool must not reach app handler');
      }
    }
  });
  const hiddenWrite = await server.handleJsonRpc({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'record_memory',
      arguments: {
        target: 'process',
        title: 'Hidden write',
        content: 'This write must not pass through a hardened MCP surface.',
        evidence: 'hardened explicit tool list regression',
        validated: true,
        reusable: false,
        sensitivity: 'none'
      }
    }
  });

  assert.equal(hiddenWrite.response.error.code, -32001);
  assert.equal(hiddenWrite.response.error.data.code, 'mcp_tool_not_exposed');
});

test('codex-memory MCP full surface can execute record/search/overview', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const requestContext = {
      executionContext: {
        agentAlias: 'Codex',
        agentId: 'codex-desktop',
        requestSource: 'codex-memory-test'
      }
    };

    const list = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    }, requestContext);
    assert.equal(list.response.result.tools.length, 9);

    const recordProcess = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'process',
          title: 'Checkpoint',
          content: 'Type: checkpoint\nrisk: keep dual write stable',
          evidence: 'observed during migration',
          validated: true,
          reusable: false,
          tags: ['checkpoint', 'migration'],
          sensitivity: 'none'
        }
      }
    }, requestContext);
    assert.equal(recordProcess.response.result.structuredContent.decision, 'accepted');
    assert.equal(recordProcess.response.result.structuredContent.agentAlias, 'Codex');

    const recordKnowledge = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'knowledge',
          title: 'Recall contract',
          content: 'Validated knowledge about MCP response compatibility.',
          evidence: 'covered by contract tests',
          validated: true,
          reusable: true,
          tags: ['mcp', 'contract'],
          sensitivity: 'none'
        }
      }
    }, requestContext);
    assert.equal(recordKnowledge.response.result.structuredContent.decision, 'accepted');

    const search = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'migration contract checkpoint',
          target: 'both',
          limit: 5,
          include_content: true
        }
      }
    }, requestContext);

    assert.equal(search.response.result.structuredContent.results.length, 2);
    assert.deepEqual(
      search.response.result.structuredContent.results.map(result => result.target).sort(),
      ['knowledge', 'process']
    );

    const overview = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'memory_overview',
        arguments: {
          auditWindow: 200,
          limit: 10
        }
      }
    }, requestContext);

    assert.ok(overview.response.result.structuredContent.paths.auditLogPath.endsWith('codex-memory-bridge.jsonl'));
    assert.equal(overview.response.result.isError, false);
    assert.equal(overview.response.result.structuredContent.shadowSync.available, true);
  }, {
    mcpPublicToolSurface: 'full'
  });
});

test('MCP schema contract should expose scope fields in record_memory', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const list = await server.handleJsonRpc({
      jsonrpc: '2.0', id: 1, method: 'tools/list', params: {}
    });
    const tools = list.response.result.tools;
    assert.deepEqual(tools.map(tool => tool.name).sort(), ['audit_memory', 'memory_overview', 'prepare_memory_context', 'propose_memory_delta', 'record_memory', 'search_memory', 'supersede_memory', 'tombstone_memory', 'validate_memory']);
    const recordMemory = tools.find(t => t.name === 'record_memory');
    assert.ok(recordMemory);
    const schema = recordMemory.inputSchema;
    assert.equal(schema.additionalProperties, false);
    assert.ok(schema.properties.project_id);
    assert.ok(schema.properties.workspace_id);
    assert.ok(schema.properties.client_id);
    assert.ok(schema.properties.visibility);
    for (const field of ['project_id', 'workspace_id', 'client_id', 'visibility', 'task_id', 'conversation_id', 'retention_policy']) {
      assert.equal(schema.properties[field].maxLength, 200, `${field} should have maxLength 200`);
    }
    assert.deepEqual(schema.properties.client_id.enum, ['codex', 'claude', 'manual']);
    assert.deepEqual(schema.properties.visibility.enum, ['private', 'workspace', 'project', 'shared']);
    assert.ok(schema.properties.task_id);
    assert.ok(schema.properties.conversation_id);
    assert.ok(schema.properties.retention_policy);
  }, {
    mcpPublicToolSurface: 'full'
  });
});

test('MCP schema contract should describe memory_overview bounded HTTP projections', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const list = await server.handleJsonRpc({
      jsonrpc: '2.0', id: 1, method: 'tools/list', params: {}
    });
    const tools = list.response.result.tools;
    const memoryOverview = tools.find(t => t.name === 'memory_overview');
    assert.ok(memoryOverview);
    assert.match(memoryOverview.description, /HTTP no-token calls return only a selected low-disclosure overview projection/);
    assert.match(memoryOverview.description, /bearer-token HTTP calls return a bounded low-disclosure overview projection by default/);
    assert.equal(memoryOverview.inputSchema.additionalProperties, false);
  });
});

test('MCP schema contract should expose exact audit_memory scope fields for governed receipt filtering', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const list = await server.handleJsonRpc({
      jsonrpc: '2.0', id: 1, method: 'tools/list', params: {}
    });
    const auditMemory = list.response.result.tools.find(tool => tool.name === 'audit_memory');
    assert.ok(auditMemory);
    const schema = auditMemory.inputSchema;
    assert.equal(schema.additionalProperties, false);
    assert.ok(schema.properties.scope);
    const scopeSchema = schema.properties.scope;
    assert.equal(scopeSchema.additionalProperties, false);
    assert.ok(scopeSchema.properties.project_id);
    assert.ok(scopeSchema.properties.scope_id);
    assert.ok(scopeSchema.properties.workspace_id);
    assert.ok(scopeSchema.properties.workspace_id_present);
    assert.ok(scopeSchema.properties.client_id);
    assert.ok(scopeSchema.properties.visibility);
  });
});

test('MCP tools/list exposes governed native bridge metadata without locator disclosure', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const list = await server.handleJsonRpc({
      jsonrpc: '2.0', id: 1, method: 'tools/list', params: {}
    });
    const tools = list.response.result.tools;
    const searchMemory = tools.find(t => t.name === 'search_memory');
    const recordMemory = tools.find(t => t.name === 'record_memory');
    const validateMemory = tools.find(t => t.name === 'validate_memory');
    const serialized = JSON.stringify(list.response);

    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.nativeBridge.eligible, true);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.nativeBridge.direction, 'read');
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.nativeBridge.invocationProfile, 'governed_read_only');
    assert.deepEqual(
      searchMemory._meta.codexMemoryGovernedBridge.clientIdentity.allowedClientIds,
      ['Codex', 'Claude']
    );
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.clientIdentity.toolArgumentsMayOverride, false);
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.clientIdentity
        .governanceMetadataMayOverrideTransportContext,
      false
    );
    assert.deepEqual(
      searchMemory._meta.codexMemoryGovernedBridge.scopeBoundary.requiredFieldNames,
      ['project_id', 'scope_id', 'workspace_id', 'client_id', 'visibility']
    );
    assert.deepEqual(
      searchMemory._meta.codexMemoryGovernedBridge.scopeBoundary.acceptedVisibility,
      ['private', 'workspace', 'project', 'shared']
    );
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.scopeBoundary.toolArgumentsMayOverride, false);
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.scopeBoundary
        .governanceMetadataMayOverrideTransportContext,
      false
    );
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.scopeBoundary.rawScopeValueReturned, false);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.readWriteAuthority.source, 'bridge_tool_binding');
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.readWriteAuthority.readAllowed, true);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.readWriteAuthority.writeAllowed, false);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.readWriteAuthority.writePolicy, null);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.readWriteAuthority.mixedReadWriteAllowed, false);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.readWriteAuthority.unboundedWriteAllowed, false);
    assert.equal(recordMemory._meta.codexMemoryGovernedBridge.readWriteAuthority.source, 'bridge_tool_binding');
    assert.equal(recordMemory._meta.codexMemoryGovernedBridge.readWriteAuthority.readAllowed, false);
    assert.equal(recordMemory._meta.codexMemoryGovernedBridge.readWriteAuthority.writeAllowed, true);
    assert.equal(recordMemory._meta.codexMemoryGovernedBridge.readWriteAuthority.writePolicy, 'exact_approval');
    assert.equal(recordMemory._meta.codexMemoryGovernedBridge.readWriteAuthority.writeRequiresExactApproval, true);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.invocationProfile.source, 'bridge_tool_binding');
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.invocationProfile.transport, 'mcp');
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.invocationProfile.profile, 'governed_read_only');
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.invocationProfile.toolName, 'search_memory');
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.invocationProfile.profileMustMatchToolDirection,
      true
    );
    assert.equal(recordMemory._meta.codexMemoryGovernedBridge.invocationProfile.profile, 'governed_bounded_write');
    assert.equal(recordMemory._meta.codexMemoryGovernedBridge.invocationProfile.toolName, 'record_memory');
    assert.equal(recordMemory._meta.codexMemoryGovernedBridge.invocationProfile.locatorOrSecretMaterialAllowed, false);
    assert.deepEqual(searchMemory._meta.codexMemoryGovernedBridge.outputDisclosureBudget.acceptedLevels, [
      'none',
      'receipt_only',
      'metadata',
      'shape_only',
      'summary',
      'structured'
    ]);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.outputDisclosureBudget.defaultLevel, 'summary');
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.outputDisclosureBudget.maxItems, 5);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.outputDisclosureBudget.maxBytes, 4096);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.outputDisclosureBudget.toolArgumentsMayIncreaseBudget, false);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.outputDisclosureBudget.toolArgumentsMayRequestRawOutput, false);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.outputDisclosureBudget.overBudgetFallbackToRawOutput, false);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.localFallbackReceiptEventType, 'governed_mcp_vcp_native_read_fallback_receipt');
    assert.equal(recordMemory._meta.codexMemoryGovernedBridge.auditReceipt.localFallbackReceiptEventType, null);
    assert.deepEqual(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.localFallbackRecordedEvidenceFields, [
      'localMemoryRole',
      'localMemorySourceRuntime',
      'localMemoryFallbackAuthorization',
      'localMemoryFallbackAuditReceiptStatus',
      'nativeReadFailureBuckets',
      'vcpNativeResultBoundary',
      'resultCanBeMistakenForVcpNative'
    ]);
    assert.deepEqual(recordMemory._meta.codexMemoryGovernedBridge.auditReceipt.localFallbackRecordedEvidenceFields, []);
    assert.deepEqual(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordedEvidenceFields, [
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
      'nativeInvocationShapeBuckets'
    ]);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsScopeFingerprint, true);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsScopeFieldNames, true);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsOutputBudgetBuckets, true);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsRawOutputPolicy, true);
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsAuditReceiptLowDisclosureBooleans,
      true
    );
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsDelegationStatusReason, true);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsNativeInvocationReceiptBinding, true);
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.auditReceipt
        .recordsNativeInvocationGovernanceMetadataBinding,
      true
    );
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsRollbackPlanSafetyBooleans, true);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsRollbackReasonCode, false);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsNativeInvocationShapeBuckets, true);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsLocalFallbackRole, true);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsLocalFallbackSourceRuntime, true);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsLocalFallbackAuthorization, true);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsLocalFallbackAuditReceiptStatus, true);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsLocalFallbackNativeReadFailureBuckets, true);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsLocalFallbackNativeResultBoundary, true);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.rawScopePersisted, false);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.rawRequestBodyPersisted, false);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.rawResponseBodyPersisted, false);
    assert.deepEqual(
      searchMemory._meta.codexMemoryGovernedBridge.nativeBridge.localMemoryRole,
      ['fallback', 'audit', 'validation fixture', 'compatibility', 'offline continuity']
    );
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.nativeBridge.localMemoryRuntimePosture
        .primaryRuntime,
      'VCPToolBox native memory'
    );
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.nativeBridge.localMemoryRuntimePosture
        .localMemoryPrimaryRuntime,
      false
    );
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.nativeBridge.localMemoryRuntimePosture
        .fallbackAllowed,
      true
    );
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.nativeBridge.localMemoryRuntimePosture
        .rawFallbackMayBeMistakenForNative,
      false
    );
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.outputDisclosureBudget.maxItems, 5);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.outputDisclosureBudget.maxBytes, 4096);
    assert.equal(recordMemory._meta.codexMemoryGovernedBridge.nativeBridge.direction, 'write');
    assert.equal(recordMemory._meta.codexMemoryGovernedBridge.nativeBridge.exactApprovalRequired, true);
    assert.deepEqual(
      recordMemory._meta.codexMemoryGovernedBridge.nativeBridge.localMemoryRole,
      ['fallback', 'audit', 'validation fixture', 'compatibility', 'offline continuity']
    );
    assert.equal(
      recordMemory._meta.codexMemoryGovernedBridge.nativeBridge.localMemoryRuntimePosture
        .fallbackAllowed,
      false
    );
    assert.equal(
      recordMemory._meta.codexMemoryGovernedBridge.nativeBridge.localMemoryRuntimePosture
        .fallbackAllowedForWrite,
      false
    );
    assert.equal(
      recordMemory._meta.codexMemoryGovernedBridge.nativeBridge.localMemoryRuntimePosture
        .auditEvidenceAllowed,
      true
    );
    assert.deepEqual(recordMemory._meta.codexMemoryGovernedBridge.nativeBridge.configurationWarnings, []);
    assert.equal(
      recordMemory._meta.codexMemoryGovernedBridge.nativeBridge.exactApprovalAction,
      'live_bridge_record_memory_proof'
    );
    assert.deepEqual(
      recordMemory._meta.codexMemoryGovernedBridge.nativeBridge.exactApprovalBindingRequired,
      ['action', 'scope', 'runtimeTarget', 'rollbackPlan']
    );
    assert.equal(recordMemory._meta.codexMemoryGovernedBridge.rollbackPosture.requiredForWrite, true);
    assert.deepEqual(searchMemory._meta.codexMemoryGovernedBridge.rollbackPosture.acceptedReadPostures, [
      'no_runtime_state_to_rollback',
      'read_only_no_write'
    ]);
    assert.deepEqual(recordMemory._meta.codexMemoryGovernedBridge.rollbackPosture.acceptedWritePostures, [
      'bounded_rollback_plan',
      'mutation_cleanup_plan'
    ]);
    assert.equal(
      recordMemory._meta.codexMemoryGovernedBridge.governanceTransport.metadataPath,
      'params._meta.codexMemoryGovernance'
    );
    assert.deepEqual(
      recordMemory._meta.codexMemoryGovernedBridge.governanceTransport.acceptedMetadataFields,
      [
        'exactApprovalResult',
        'rollbackPosture',
        'auditReceipt',
        'trustedExecutionContext',
        'outputDisclosureBudget'
      ]
    );
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.governanceTransport
        .trustedExecutionContextRequiredForNativeDelegation,
      true
    );
    assert.deepEqual(
      searchMemory._meta.codexMemoryGovernedBridge.governanceTransport.trustedExecutionContextBindingRequired,
      ['clientId', 'scope', 'visibility']
    );
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.governanceTransport
        .trustedExecutionContextMustMatchTransportContext,
      true
    );
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.governanceTransport
        .transportContextFieldsOverrideGovernanceMetadata,
      true
    );
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.governanceTransport
        .unsafeGovernanceMetadataPosture,
      'fail_closed_without_partial_request_context'
    );
    assert.deepEqual(
      searchMemory._meta.codexMemoryGovernedBridge.adapterRevalidation.requiredGateBooleans,
      [
        'trusted_execution_context_supplied',
        'trusted_execution_context_accepted',
        'trusted_execution_context_scope_matched'
      ]
    );
    assert.deepEqual(
      recordMemory._meta.codexMemoryGovernedBridge.adapterRevalidation.exactApprovalSafetyBooleans,
      [
        'exact_approval_scope_references_safe',
        'exact_approval_scope_visibility_accepted',
        'exact_approval_runtime_target_reference_safe',
        'exact_approval_runtime_target_kind_accepted',
        'exact_approval_runtime_target_primary_runtime_accepted',
        'exact_approval_rollback_plan_reference_present',
        'exact_approval_rollback_plan_reference_safe'
      ]
    );
    assert.equal(recordMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsTrustedExecutionContextBooleans, true);
    assert.equal(recordMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsExactApprovalSafetyBooleans, true);
    assert.equal(recordMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsRollbackReasonCode, true);
    assert.equal(
      recordMemory._meta.codexMemoryGovernedBridge.rollbackPosture.postCommitFailureDisposition,
      'rollback_required_not_applied'
    );
    assert.equal(
      recordMemory._meta.codexMemoryGovernedBridge.rollbackPosture.postCommitFailureApplyPolicy,
      'manual_governed_followup_required'
    );
    assert.deepEqual(recordMemory._meta.codexMemoryGovernedBridge.rollbackPosture.postCommitFailureReasonCodes, [
      'write_post_commit_output_budget_exceeded',
      'write_post_commit_native_invocation_receipt_unbound',
      'write_post_commit_audit_receipt_not_appended'
    ]);
    assert.equal(recordMemory._meta.codexMemoryGovernedBridge.rollbackPosture.rollbackApplyAttemptedByBridge, false);
    assert.equal(validateMemory._meta.codexMemoryGovernedBridge.nativeBridge.eligible, false);
    assert.equal(validateMemory._meta.codexMemoryGovernedBridge.nativeBridge.direction, 'none');
    assert.deepEqual(validateMemory._meta.codexMemoryGovernedBridge.scopeBoundary.requiredFieldNames, []);
    assert.deepEqual(validateMemory._meta.codexMemoryGovernedBridge.scopeBoundary.acceptedVisibility, []);
    assert.equal(
      validateMemory._meta.codexMemoryGovernedBridge.governanceTransport
        .trustedExecutionContextRequiredForNativeDelegation,
      false
    );
    assert.deepEqual(validateMemory._meta.codexMemoryGovernedBridge.adapterRevalidation.requiredGateBooleans, []);
    assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
    assert.equal(serialized.includes('SECRET_TOKEN_SHOULD_NOT_ECHO'), false);
  }, {
    mcpPublicToolSurface: 'full',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary',
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeHttpMcpTarget: {
      endpoint: 'http://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO.invalid/mcp',
      bearerToken: 'SECRET_TOKEN_SHOULD_NOT_ECHO'
    }
  });
});

test('MCP tools/list binds each native bridge tool to the public governed access matrix', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const list = await server.handleJsonRpc({
      jsonrpc: '2.0', id: 1, method: 'tools/list', params: {}
    });
    const toolsByName = new Map(list.response.result.tools.map(tool => [tool.name, tool]));
    const matrix = [
      {
        toolName: 'search_memory',
        direction: 'read',
        invocationProfile: 'governed_read_only',
        readAllowed: true,
        writeAllowed: false,
        exactApprovalRequired: false,
        exactApprovalAction: null,
        fallbackAllowed: true,
        requiredForWrite: false,
        postCommitFailureDisposition: 'not_applicable'
      },
      {
        toolName: 'memory_overview',
        direction: 'read',
        invocationProfile: 'governed_read_only',
        readAllowed: true,
        writeAllowed: false,
        exactApprovalRequired: false,
        exactApprovalAction: null,
        fallbackAllowed: true,
        requiredForWrite: false,
        postCommitFailureDisposition: 'not_applicable'
      },
      {
        toolName: 'audit_memory',
        direction: 'read',
        invocationProfile: 'governed_read_only',
        readAllowed: true,
        writeAllowed: false,
        exactApprovalRequired: false,
        exactApprovalAction: null,
        fallbackAllowed: true,
        requiredForWrite: false,
        postCommitFailureDisposition: 'not_applicable'
      },
      {
        toolName: 'record_memory',
        direction: 'write',
        invocationProfile: 'governed_bounded_write',
        readAllowed: false,
        writeAllowed: true,
        exactApprovalRequired: true,
        exactApprovalAction: 'live_bridge_record_memory_proof',
        fallbackAllowed: false,
        requiredForWrite: true,
        postCommitFailureDisposition: 'rollback_required_not_applied'
      },
      {
        toolName: 'tombstone_memory',
        direction: 'write',
        invocationProfile: 'governed_bounded_write',
        readAllowed: false,
        writeAllowed: true,
        exactApprovalRequired: true,
        exactApprovalAction: 'live_bridge_tombstone_memory_proof',
        fallbackAllowed: false,
        requiredForWrite: true,
        postCommitFailureDisposition: 'rollback_required_not_applied'
      },
      {
        toolName: 'supersede_memory',
        direction: 'write',
        invocationProfile: 'governed_bounded_write',
        readAllowed: false,
        writeAllowed: true,
        exactApprovalRequired: true,
        exactApprovalAction: 'live_bridge_supersede_memory_proof',
        fallbackAllowed: false,
        requiredForWrite: true,
        postCommitFailureDisposition: 'rollback_required_not_applied'
      }
    ];

    for (const expected of matrix) {
      const meta = toolsByName.get(expected.toolName)._meta.codexMemoryGovernedBridge;
      assert.equal(meta.nativeBridge.eligible, true, expected.toolName);
      assert.equal(meta.nativeBridge.direction, expected.direction, expected.toolName);
      assert.equal(meta.nativeBridge.invocationProfile, expected.invocationProfile, expected.toolName);
      assert.equal(meta.nativeBridge.readAllowed, expected.readAllowed, expected.toolName);
      assert.equal(meta.nativeBridge.writeAllowed, expected.writeAllowed, expected.toolName);
      assert.equal(meta.nativeBridge.exactApprovalRequired, expected.exactApprovalRequired, expected.toolName);
      assert.equal(meta.nativeBridge.exactApprovalAction, expected.exactApprovalAction, expected.toolName);
      assert.deepEqual(meta.clientIdentity.allowedClientIds, ['Codex', 'Claude'], expected.toolName);
      assert.equal(meta.clientIdentity.source, 'trusted_execution_context_or_transport', expected.toolName);
      assert.equal(meta.clientIdentity.toolArgumentsMayOverride, false, expected.toolName);
      assert.equal(
        meta.clientIdentity.governanceMetadataMayOverrideTransportContext,
        false,
        expected.toolName
      );
      assert.equal(meta.scopeBoundary.source, 'trusted_execution_context_or_transport', expected.toolName);
      assert.deepEqual(
        meta.scopeBoundary.requiredFieldNames,
        ['project_id', 'scope_id', 'workspace_id', 'client_id', 'visibility'],
        expected.toolName
      );
      assert.deepEqual(
        meta.scopeBoundary.acceptedVisibility,
        ['private', 'workspace', 'project', 'shared'],
        expected.toolName
      );
      assert.equal(meta.scopeBoundary.toolArgumentsMayOverride, false, expected.toolName);
      assert.equal(
        meta.scopeBoundary.governanceMetadataMayOverrideTransportContext,
        false,
        expected.toolName
      );
      assert.equal(meta.scopeBoundary.rawScopeValueReturned, false, expected.toolName);
      assert.equal(meta.runtimeTarget.primaryRuntime, 'VCPToolBox native memory', expected.toolName);
      assert.equal(meta.runtimeTarget.source, 'bridge_runtime_or_static_config', expected.toolName);
      assert.equal(meta.runtimeTarget.bound, true, expected.toolName);
      assert.equal(meta.runtimeTarget.configured, true, expected.toolName);
      assert.equal(meta.runtimeTarget.targetReferenceName, 'operator-vcp-toolbox-service-ref', expected.toolName);
      assert.equal(meta.runtimeTarget.targetKind, 'mcp_server', expected.toolName);
      assert.equal(meta.runtimeTarget.sourceAuthority, 'bridge_runtime_or_static_config', expected.toolName);
      assert.equal(meta.runtimeTarget.toolArgumentsMayOverride, false, expected.toolName);
      assert.equal(meta.runtimeTarget.governanceMetadataMayOverride, false, expected.toolName);
      assert.equal(meta.runtimeTarget.endpointDisclosed, false, expected.toolName);
      assert.equal(meta.runtimeTarget.tokenMaterialDisclosed, false, expected.toolName);
      assert.equal(meta.governanceTransport.toolArgumentsMayCarryGovernance, false, expected.toolName);
      assert.equal(meta.invocationProfile.source, 'bridge_tool_binding', expected.toolName);
      assert.equal(meta.invocationProfile.transport, 'mcp', expected.toolName);
      assert.equal(meta.invocationProfile.profile, expected.invocationProfile, expected.toolName);
      assert.equal(meta.invocationProfile.toolName, expected.toolName, expected.toolName);
      assert.deepEqual(
        meta.invocationProfile.acceptedProfiles,
        ['governed_read_only', 'governed_bounded_write'],
        expected.toolName
      );
      assert.equal(meta.invocationProfile.profileMustMatchToolDirection, true, expected.toolName);
      assert.equal(meta.invocationProfile.toolArgumentsMayOverride, false, expected.toolName);
      assert.equal(meta.invocationProfile.governanceMetadataMayOverride, false, expected.toolName);
      assert.equal(meta.invocationProfile.locatorOrSecretMaterialAllowed, false, expected.toolName);
      assert.equal(meta.invocationProfile.adapterRevalidatesProfile, true, expected.toolName);
      assert.equal(meta.readWriteAuthority.source, 'bridge_tool_binding', expected.toolName);
      assert.equal(meta.readWriteAuthority.readAllowed, expected.readAllowed, expected.toolName);
      assert.equal(meta.readWriteAuthority.writeAllowed, expected.writeAllowed, expected.toolName);
      assert.equal(
        meta.readWriteAuthority.writePolicy,
        expected.writeAllowed ? 'exact_approval' : null,
        expected.toolName
      );
      assert.equal(meta.readWriteAuthority.writeRequiresExactApproval, expected.writeAllowed, expected.toolName);
      assert.equal(meta.readWriteAuthority.mixedReadWriteAllowed, false, expected.toolName);
      assert.equal(meta.readWriteAuthority.unboundedWriteAllowed, false, expected.toolName);
      assert.equal(meta.readWriteAuthority.toolArgumentsMayOverride, false, expected.toolName);
      assert.equal(meta.readWriteAuthority.governanceMetadataMayOverride, false, expected.toolName);
      assert.equal(meta.readWriteAuthority.adapterRevalidatesAuthority, true, expected.toolName);
      assert.deepEqual(
        meta.governanceTransport.trustedExecutionContextBindingRequired,
        ['clientId', 'scope', 'visibility'],
        expected.toolName
      );
      assert.equal(meta.outputDisclosureBudget.lowDisclosureRequired, true, expected.toolName);
      assert.equal(meta.outputDisclosureBudget.rawOutputAllowed, false, expected.toolName);
      assert.equal(
        meta.outputDisclosureBudget.source,
        'bridge_gate_normalized_governance',
        expected.toolName
      );
      assert.equal(meta.outputDisclosureBudget.bound, true, expected.toolName);
      assert.deepEqual(
        meta.outputDisclosureBudget.acceptedLevels,
        ['none', 'receipt_only', 'metadata', 'shape_only', 'summary', 'structured'],
        expected.toolName
      );
      assert.equal(meta.outputDisclosureBudget.defaultLevel, 'summary', expected.toolName);
      assert.equal(meta.outputDisclosureBudget.maxItems, 5, expected.toolName);
      assert.equal(meta.outputDisclosureBudget.maxBytes, 4096, expected.toolName);
      assert.equal(meta.outputDisclosureBudget.toolArgumentsMayOverride, false, expected.toolName);
      assert.equal(meta.outputDisclosureBudget.toolArgumentsMayIncreaseBudget, false, expected.toolName);
      assert.equal(meta.outputDisclosureBudget.toolArgumentsMayRequestRawOutput, false, expected.toolName);
      assert.equal(meta.outputDisclosureBudget.governanceMetadataMaySupplyBudget, true, expected.toolName);
      assert.equal(meta.outputDisclosureBudget.governanceMetadataMayOverride, false, expected.toolName);
      assert.equal(meta.outputDisclosureBudget.locatorOrSecretMaterialAllowed, false, expected.toolName);
      assert.equal(meta.outputDisclosureBudget.overBudgetPosture, 'fail_closed_without_raw_output', expected.toolName);
      assert.equal(meta.outputDisclosureBudget.overBudgetFallbackToRawOutput, false, expected.toolName);
      assert.equal(meta.auditReceipt.source, 'bridge_gate_normalized_governance', expected.toolName);
      assert.equal(meta.auditReceipt.required, true, expected.toolName);
      assert.equal(meta.auditReceipt.lowDisclosure, true, expected.toolName);
      assert.equal(meta.auditReceipt.lowDisclosureBound, true, expected.toolName);
      assert.equal(meta.auditReceipt.toolArgumentsMayOverride, false, expected.toolName);
      assert.equal(meta.auditReceipt.governanceMetadataMayOverride, false, expected.toolName);
      assert.equal(
        meta.auditReceipt.localFallbackReceiptEventType,
        expected.fallbackAllowed ? 'governed_mcp_vcp_native_read_fallback_receipt' : null,
        expected.toolName
      );
      assert.equal(
        meta.auditReceipt.localFallbackRecordedEvidenceFields.includes('localMemoryRole'),
        expected.fallbackAllowed,
        expected.toolName
      );
      assert.equal(
        meta.auditReceipt.localFallbackRecordedEvidenceFields.includes('vcpNativeResultBoundary'),
        expected.fallbackAllowed,
        expected.toolName
      );
      assert.equal(meta.auditReceipt.recordsScopeFingerprint, true, expected.toolName);
      assert.equal(meta.auditReceipt.recordsScopeFieldNames, true, expected.toolName);
      assert.equal(meta.auditReceipt.recordsScopeIdentifierFieldNames, true, expected.toolName);
      assert.equal(meta.auditReceipt.recordsOutputBudgetBuckets, true, expected.toolName);
      assert.equal(meta.auditReceipt.recordsRawOutputPolicy, true, expected.toolName);
      assert.equal(meta.auditReceipt.recordsAuditReceiptLowDisclosureBooleans, true, expected.toolName);
      assert.equal(meta.auditReceipt.recordsRollbackEvidence, true, expected.toolName);
      assert.equal(meta.auditReceipt.recordsRollbackPlanSafetyBooleans, true, expected.toolName);
      assert.equal(meta.auditReceipt.recordsDelegationStatusReason, true, expected.toolName);
      assert.equal(meta.auditReceipt.recordsNativeInvocationReceiptBinding, true, expected.toolName);
      assert.equal(
        meta.auditReceipt.recordsNativeInvocationGovernanceMetadataBinding,
        true,
        expected.toolName
      );
      assert.equal(meta.auditReceipt.recordsRollbackReasonCode, expected.writeAllowed, expected.toolName);
      assert.equal(meta.auditReceipt.recordsNativeInvocationShapeBuckets, true, expected.toolName);
      assert.equal(meta.auditReceipt.recordsLocalFallbackRole, expected.fallbackAllowed, expected.toolName);
      assert.equal(meta.auditReceipt.recordsLocalFallbackSourceRuntime, expected.fallbackAllowed, expected.toolName);
      assert.equal(meta.auditReceipt.recordsLocalFallbackAuthorization, expected.fallbackAllowed, expected.toolName);
      assert.equal(meta.auditReceipt.recordsLocalFallbackAuditReceiptStatus, expected.fallbackAllowed, expected.toolName);
      assert.equal(meta.auditReceipt.recordsLocalFallbackNativeReadFailureBuckets, expected.fallbackAllowed, expected.toolName);
      assert.equal(meta.auditReceipt.recordsLocalFallbackNativeResultBoundary, expected.fallbackAllowed, expected.toolName);
      assert.equal(
        meta.auditReceipt.recordedEvidenceFields.includes('exactApprovalSafetyBooleans'),
        expected.writeAllowed,
        expected.toolName
      );
      assert.equal(
        meta.auditReceipt.recordedEvidenceFields.includes('rollbackReasonCode'),
        expected.writeAllowed,
        expected.toolName
      );
      assert.equal(
        meta.auditReceipt.recordedEvidenceFields.includes('delegationStatusClass'),
        true,
        expected.toolName
      );
      assert.equal(
        meta.auditReceipt.recordedEvidenceFields.includes('rawOutputPolicy'),
        true,
        expected.toolName
      );
      assert.equal(
        meta.auditReceipt.recordedEvidenceFields.includes('auditReceiptLowDisclosureBooleans'),
        true,
        expected.toolName
      );
      assert.equal(
        meta.auditReceipt.recordedEvidenceFields.includes('rollbackPlanSafetyBooleans'),
        true,
        expected.toolName
      );
      assert.equal(
        meta.auditReceipt.recordedEvidenceFields.includes('nativeInvocationReceiptBindingMatched'),
        true,
        expected.toolName
      );
      assert.equal(
        meta.auditReceipt.recordedEvidenceFields.includes('nativeInvocationGovernanceMetadataBinding'),
        true,
        expected.toolName
      );
      assert.equal(
        meta.auditReceipt.recordedEvidenceFields.includes('nativeInvocationJsonRpcRequestIdCategory'),
        true,
        expected.toolName
      );
      assert.equal(
        meta.auditReceipt.recordedEvidenceFields.includes('nativeInvocationJsonRpcResponseIdMatched'),
        true,
        expected.toolName
      );
      assert.equal(
        meta.auditReceipt.recordedEvidenceFields.includes('nativeInvocationJsonRpcErrorPresent'),
        true,
        expected.toolName
      );
      assert.equal(
        meta.auditReceipt.recordedEvidenceFields.includes('nativeInvocationJsonRpcErrorReasonCode'),
        true,
        expected.toolName
      );
      assert.equal(meta.auditReceipt.rawScopePersisted, false, expected.toolName);
      assert.equal(meta.auditReceipt.rawRequestBodyPersisted, false, expected.toolName);
      assert.equal(meta.auditReceipt.rawResponseBodyPersisted, false, expected.toolName);
      assert.equal(meta.auditReceipt.rawNativePayloadPersisted, false, expected.toolName);
      assert.equal(meta.auditReceipt.rawPayloadPersisted, false, expected.toolName);
      assert.equal(meta.rollbackPosture.source, 'bridge_gate_normalized_governance', expected.toolName);
      assert.equal(meta.rollbackPosture.bound, true, expected.toolName);
      assert.equal(meta.rollbackPosture.requiredForWrite, expected.requiredForWrite, expected.toolName);
      assert.equal(meta.rollbackPosture.defaultReadPosture, 'no_runtime_state_to_rollback', expected.toolName);
      assert.equal(meta.rollbackPosture.toolArgumentsMayOverride, false, expected.toolName);
      assert.equal(meta.rollbackPosture.governanceMetadataMayOverride, false, expected.toolName);
      assert.deepEqual(
        meta.rollbackPosture.acceptedReadPostures,
        ['no_runtime_state_to_rollback', 'read_only_no_write'],
        expected.toolName
      );
      assert.deepEqual(
        meta.rollbackPosture.acceptedWritePostures,
        ['bounded_rollback_plan', 'mutation_cleanup_plan'],
        expected.toolName
      );
      assert.equal(meta.rollbackPosture.readRollbackPlanReferenceAllowed, false, expected.toolName);
      assert.equal(
        meta.rollbackPosture.readRollbackDisposition,
        'no_runtime_write_to_rollback',
        expected.toolName
      );
      assert.equal(
        meta.rollbackPosture.writeRollbackPlanReferenceRequired,
        expected.writeAllowed,
        expected.toolName
      );
      assert.equal(
        meta.rollbackPosture.writeRollbackPlanReferenceSafeRequired,
        expected.writeAllowed,
        expected.toolName
      );
      assert.equal(
        meta.rollbackPosture.writeRollbackPlanBoundRequired,
        expected.writeAllowed,
        expected.toolName
      );
      assert.equal(
        meta.rollbackPosture.writeRollbackPlanShapeOnlyRequired,
        expected.writeAllowed,
        expected.toolName
      );
      assert.equal(
        meta.rollbackPosture.writeRollbackApplyRequiresGovernedFollowup,
        expected.writeAllowed,
        expected.toolName
      );
      assert.equal(
        meta.rollbackPosture.postCommitFailureDisposition,
        expected.postCommitFailureDisposition,
        expected.toolName
      );
      assert.deepEqual(
        meta.rollbackPosture.postCommitFailureReasonCodes,
        expected.writeAllowed
          ? [
              'write_post_commit_output_budget_exceeded',
              'write_post_commit_native_invocation_receipt_unbound',
              'write_post_commit_audit_receipt_not_appended'
            ]
          : [],
        expected.toolName
      );
      assert.equal(meta.nativeBridge.localMemoryRuntimePosture.primaryRuntime, 'VCPToolBox native memory');
      assert.equal(meta.nativeBridge.localMemoryRuntimePosture.localMemoryPrimaryRuntime, false);
      assert.equal(meta.nativeBridge.localMemoryRuntimePosture.fallbackAllowed, expected.fallbackAllowed);
      assert.equal(meta.nativeBridge.localMemoryRuntimePosture.fallbackAllowedForWrite, false);
      assert.equal(meta.nativeBridge.localMemoryRuntimePosture.rawFallbackMayBeMistakenForNative, false);
      assert.equal(meta.disclosure.rawMemoryReturned, false, expected.toolName);
      assert.equal(meta.disclosure.tokenMaterialReturned, false, expected.toolName);
      assert.equal(meta.disclosure.endpointReturned, false, expected.toolName);
    }
  }, {
    mcpPublicToolSurface: 'full',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary_with_local_fallback',
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeRuntimeTarget: {
      accepted: true,
      sourceAuthority: 'bridge_runtime_or_static_config',
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    }
  });
});

test('MCP native bridge tool metadata covers every current product-goal governance dimension', () => {
  const nativeBridgeTools = [
    'search_memory',
    'memory_overview',
    'audit_memory',
    'record_memory',
    'tombstone_memory',
    'supersede_memory'
  ];
  const config = {
    governedMcpVcpNativeRuntimeTarget: {
      accepted: true,
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server',
      sourceAuthority: 'bridge_runtime_or_static_config'
    }
  };

  for (const toolName of nativeBridgeTools) {
    const meta = buildGovernedMcpToolMetadata(toolName, config);
    const coverage = validateGovernedMcpMetadataCoversCurrentProductGoal(meta, {
      requireRuntimeTargetBound: true
    });

    assert.equal(coverage.accepted, true, `${toolName}: ${coverage.blockers.join(', ')}`);
    assert.deepEqual(coverage.requiredGovernedDimensions, [
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
    assert.equal(coverage.runtimeTargetBoundRequired, true);
    assert.equal(coverage.vcpToolBoxCalled, false);
    assert.equal(coverage.mcpToolCalled, false);
    assert.equal(coverage.memoryReadPerformed, false);
    assert.equal(coverage.memoryWritePerformed, false);
    assert.equal(coverage.readinessClaimed, false);
  }
});

test('MCP native bridge metadata coverage rejects missing governance metadata evidence field', () => {
  const toolMeta = buildGovernedMcpToolMetadata('search_memory', {
    governedMcpVcpNativeRuntimeTarget: {
      accepted: true,
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server',
      sourceAuthority: 'bridge_runtime_or_static_config'
    }
  });
  const driftedToolMeta = JSON.parse(JSON.stringify(toolMeta));
  driftedToolMeta.auditReceipt.recordedEvidenceFields =
    driftedToolMeta.auditReceipt.recordedEvidenceFields.filter(field =>
      field !== 'nativeInvocationGovernanceMetadataBinding'
    );

  const toolCoverage = validateGovernedMcpMetadataCoversCurrentProductGoal(driftedToolMeta, {
    requireRuntimeTargetBound: true
  });

  assert.equal(toolCoverage.accepted, false);
  assert.ok(
    toolCoverage.blockers.includes(
      'auditReceipt.recordedEvidenceFields_must_include_nativeInvocationGovernanceMetadataBinding'
    )
  );

  const serverMeta = buildGovernedMcpServerMetadata({
    governedMcpVcpNativeRuntimeTarget: {
      accepted: true,
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server',
      sourceAuthority: 'bridge_runtime_or_static_config'
    }
  });
  const driftedServerMeta = JSON.parse(JSON.stringify(serverMeta));
  driftedServerMeta.auditReceipt.recordedEvidenceFields =
    driftedServerMeta.auditReceipt.recordedEvidenceFields.filter(field =>
      field !== 'nativeInvocationGovernanceMetadataBinding'
    );
  const serverCoverage = validateGovernedMcpServerMetadataCoversCurrentProductGoal(driftedServerMeta, {
    requireRuntimeTargetBound: true
  });

  assert.equal(serverCoverage.accepted, false);
  assert.ok(
    serverCoverage.blockers.includes(
      'auditReceipt.recordedEvidenceFields_must_include_nativeInvocationGovernanceMetadataBinding'
    )
  );
});

test('MCP native bridge metadata coverage rejects rollback posture declaration drift', () => {
  const config = {
    governedMcpVcpNativeRuntimeTarget: {
      accepted: true,
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server',
      sourceAuthority: 'bridge_runtime_or_static_config'
    }
  };

  const readMeta = buildGovernedMcpToolMetadata('search_memory', config);
  const driftedReadMeta = JSON.parse(JSON.stringify(readMeta));
  driftedReadMeta.rollbackPosture.readRollbackPlanReferenceAllowed = true;
  const readCoverage = validateGovernedMcpMetadataCoversCurrentProductGoal(driftedReadMeta, {
    requireRuntimeTargetBound: true
  });

  assert.equal(readCoverage.accepted, false);
  assert.ok(
    readCoverage.blockers.includes('rollbackPosture.readRollbackPlanReferenceAllowed_must_equal_false')
  );

  const writeMeta = buildGovernedMcpToolMetadata('record_memory', config);
  const driftedWriteMeta = JSON.parse(JSON.stringify(writeMeta));
  delete driftedWriteMeta.rollbackPosture.writeRollbackPlanShapeOnlyRequired;
  const writeCoverage = validateGovernedMcpMetadataCoversCurrentProductGoal(driftedWriteMeta, {
    requireRuntimeTargetBound: true
  });

  assert.equal(writeCoverage.accepted, false);
  assert.ok(
    writeCoverage.blockers.includes('rollbackPosture.writeRollbackPlanShapeOnlyRequired_must_equal_true')
  );

  const serverMeta = buildGovernedMcpServerMetadata(config);
  const driftedServerMeta = JSON.parse(JSON.stringify(serverMeta));
  driftedServerMeta.rollbackPosture.writeRollbackPlanBoundRequired = false;
  const serverCoverage = validateGovernedMcpServerMetadataCoversCurrentProductGoal(driftedServerMeta, {
    requireRuntimeTargetBound: true
  });

  assert.equal(serverCoverage.accepted, false);
  assert.ok(
    serverCoverage.blockers.includes('rollbackPosture.writeRollbackPlanBoundRequired_must_equal_true')
  );
});

test('MCP tools/list covers current product-goal native bridge tool surface', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const list = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    });
    const coverage = validateGovernedMcpToolsListCoversCurrentProductGoal(
      list.response.result.tools,
      { requireRuntimeTargetBound: true }
    );

    assert.equal(coverage.accepted, true, coverage.blockers.join(', '));
    assert.deepEqual(coverage.requiredNativeBridgeTools, [
      'search_memory',
      'memory_overview',
      'audit_memory',
      'record_memory',
      'tombstone_memory',
      'supersede_memory'
    ]);
    assert.equal(coverage.receivedToolNames.includes('validate_memory'), true);
    assert.equal(coverage.runtimeTargetBoundRequired, true);
    assert.equal(coverage.vcpToolBoxCalled, false);
    assert.equal(coverage.mcpToolCalled, false);
    assert.equal(coverage.memoryReadPerformed, false);
    assert.equal(coverage.memoryWritePerformed, false);
    assert.equal(coverage.readinessClaimed, false);
  }, {
    mcpPublicToolSurface: 'full',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    }
  });
});

test('MCP metadata coverage validator rejects local compatibility tools as native bridge coverage', () => {
  const meta = buildGovernedMcpToolMetadata('validate_memory', {});
  const coverage = validateGovernedMcpMetadataCoversCurrentProductGoal(meta, {
    requireRuntimeTargetBound: true
  });

  assert.equal(coverage.accepted, false);
  assert.ok(coverage.blockers.includes('nativeBridge.eligible_must_equal_true'));
  assert.ok(coverage.blockers.includes('nativeBridge.direction_must_be_read_or_write_for_current_product_goal'));
  assert.equal(coverage.vcpToolBoxCalled, false);
  assert.equal(coverage.mcpToolCalled, false);
  assert.equal(coverage.readinessClaimed, false);
});

test('governed native bridge metadata helper marks non-bridge tools as local compatibility', () => {
  const meta = buildGovernedMcpToolMetadata('validate_memory', {});

  assert.equal(meta.nativeBridge.eligible, false);
  assert.equal(meta.nativeBridge.direction, 'none');
  assert.equal(meta.nativeBridge.exactApprovalAction, null);
  assert.deepEqual(meta.nativeBridge.exactApprovalBindingRequired, []);
  assert.deepEqual(meta.nativeBridge.localMemoryRole, ['compatibility']);
  assert.equal(meta.nativeBridge.localMemoryRuntimePosture.primaryRuntime, 'codex_memory_local');
  assert.equal(meta.nativeBridge.localMemoryRuntimePosture.localMemoryPrimaryRuntime, true);
  assert.equal(meta.nativeBridge.localMemoryRuntimePosture.compatibilityAllowed, true);
  assert.equal(meta.nativeBridge.localMemoryRuntimePosture.fallbackAllowed, false);
  assert.equal(meta.readWriteAuthority.source, 'local_compatibility_tool_binding');
  assert.equal(meta.readWriteAuthority.readAllowed, false);
  assert.equal(meta.readWriteAuthority.writeAllowed, false);
  assert.equal(meta.readWriteAuthority.writePolicy, null);
  assert.equal(meta.readWriteAuthority.writeRequiresExactApproval, false);
  assert.equal(meta.readWriteAuthority.adapterRevalidatesAuthority, false);
  assert.equal(meta.invocationProfile.source, 'local_compatibility_tool_binding');
  assert.equal(meta.invocationProfile.transport, null);
  assert.equal(meta.invocationProfile.profile, 'local_or_compatibility_tool');
  assert.equal(meta.invocationProfile.toolName, 'validate_memory');
  assert.deepEqual(meta.invocationProfile.acceptedProfiles, []);
  assert.equal(meta.invocationProfile.profileMustMatchToolDirection, false);
  assert.equal(meta.invocationProfile.adapterRevalidatesProfile, false);
  assert.equal(meta.runtimeTarget.source, null);
  assert.equal(meta.runtimeTarget.bound, false);
  assert.equal(meta.runtimeTarget.configured, false);
  assert.equal(meta.runtimeTarget.toolArgumentsMayOverride, false);
  assert.equal(meta.runtimeTarget.governanceMetadataMayOverride, false);
  assert.deepEqual(meta.outputDisclosureBudget.acceptedLevels, []);
  assert.equal(meta.outputDisclosureBudget.defaultLevel, null);
  assert.equal(meta.outputDisclosureBudget.source, 'local_compatibility_governance');
  assert.equal(meta.outputDisclosureBudget.bound, false);
  assert.equal(meta.outputDisclosureBudget.toolArgumentsMayOverride, false);
  assert.equal(meta.outputDisclosureBudget.governanceMetadataMaySupplyBudget, false);
  assert.equal(meta.outputDisclosureBudget.governanceMetadataMayOverride, false);
  assert.equal(meta.auditReceipt.source, 'local_compatibility_governance');
  assert.equal(meta.auditReceipt.required, false);
  assert.equal(meta.auditReceipt.lowDisclosureBound, false);
  assert.equal(meta.auditReceipt.toolArgumentsMayOverride, false);
  assert.equal(meta.auditReceipt.governanceMetadataMayOverride, false);
  assert.deepEqual(meta.auditReceipt.recordedEvidenceFields, []);
  assert.equal(meta.auditReceipt.localFallbackReceiptEventType, null);
  assert.equal(meta.auditReceipt.recordsScopeFingerprint, false);
  assert.equal(meta.auditReceipt.rawScopePersisted, false);
  assert.equal(meta.rollbackPosture.source, 'local_compatibility_governance');
  assert.equal(meta.rollbackPosture.bound, false);
  assert.equal(meta.rollbackPosture.toolArgumentsMayOverride, false);
  assert.equal(meta.rollbackPosture.governanceMetadataMayOverride, false);
  assert.equal(meta.readinessClaimed, undefined);
  assert.equal(meta.nativeBridge.readinessClaimed, false);
});

test('governed native bridge metadata helper exposes low-disclosure config warnings only', () => {
  const meta = buildGovernedMcpToolMetadata('search_memory', {
    governedMcpVcpNativeBridgeConfigWarnings: [
      {
        code: 'native_read_delegation_requires_bridge_gate',
        effect: 'read_delegation_fail_closed',
        lowDisclosure: true,
        endpoint: 'PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
        token: 'SECRET_TOKEN_SHOULD_NOT_ECHO'
      },
      {
        code: 'native_read_delegation_requires_accepted_native_target',
        effect: 'read_delegation_fail_closed',
        lowDisclosure: true,
        endpoint: 'PRIVATE_NATIVE_TARGET_SHOULD_NOT_ECHO',
        token: 'SECRET_NATIVE_TARGET_TOKEN_SHOULD_NOT_ECHO'
      },
      {
        code: 'PRIVATE_WARNING_CODE_SHOULD_NOT_ECHO',
        effect: 'SECRET_WARNING_EFFECT_SHOULD_NOT_ECHO',
        lowDisclosure: true
      }
    ]
  });
  const serialized = JSON.stringify(meta);

  assert.deepEqual(meta.nativeBridge.configurationWarnings, [
    {
      code: 'native_read_delegation_requires_bridge_gate',
      effect: 'read_delegation_fail_closed',
      lowDisclosure: true
    },
    {
      code: 'native_read_delegation_requires_accepted_native_target',
      effect: 'read_delegation_fail_closed',
      lowDisclosure: true
    },
    {
      code: 'unknown_governed_native_bridge_warning',
      effect: null,
      lowDisclosure: true
    }
  ]);
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_NATIVE_TARGET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_NATIVE_TARGET_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_WARNING_CODE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_WARNING_EFFECT_SHOULD_NOT_ECHO'), false);
});

test('MCP runtime schema validation should reject unknown fields with -32602', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const result = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 10,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'process',
          title: 'Checkpoint',
          content: 'Type: checkpoint\nrisk: schema validation',
          evidence: 'contract test',
          validated: true,
          reusable: false,
          sensitivity: 'none',
          unexpected_field: true
        }
      }
    });

    assert.equal(result.response.error.code, -32602);
    assert.match(result.response.error.data, /unexpected_field/);
  }, {
    mcpPublicToolSurface: 'full'
  });
});

test('MCP runtime schema validation should reject enum mismatch with -32602', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const result = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 11,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'process',
          title: 'Checkpoint',
          content: 'Type: checkpoint\nrisk: schema validation',
          evidence: 'contract test',
          validated: true,
          reusable: false,
          sensitivity: 'none',
          client_id: 'unknown-client'
        }
      }
    });

    assert.equal(result.response.error.code, -32602);
    assert.match(result.response.error.data, /client_id/);
  }, {
    mcpPublicToolSurface: 'full'
  });
});

test('MCP runtime schema validation should reject invalid scope with -32602', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const result = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 12,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'checkpoint',
          scope: {
            visibility: ['private', 'invalid-visibility']
          }
        }
      }
    });

    assert.equal(result.response.error.code, -32602);
    assert.match(result.response.error.data, /visibility/);
  });
});

test('MCP runtime schema validation rejects invalid proposal task_id patterns before normalization', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const result = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 13,
      method: 'tools/call',
      params: {
        name: 'propose_memory_delta',
        arguments: {
          task_id: 'BAD',
          candidates: [{
            target: 'process',
            intent: 'This proposal must not be attributed to a default task.'
          }]
        }
      }
    });

    assert.equal(result.response.error.code, -32602);
    assert.match(result.response.error.data, /task_id/);
  });
});

test('MCP governed metadata parser projects only approved request context fields', () => {
  const result = buildGovernedMcpRequestContextFromParams({
    _meta: {
      codexMemoryGovernance: {
        exactApprovalResult: {
          accepted: true,
          allowedAction: 'live_bridge_record_memory_proof',
          allowedScope: {
            scope_id: 'scope-alpha',
            project_id: 'codex-memory',
            workspace_id: 'workspace-alpha',
            client_id: 'Codex',
            visibility: 'private'
          },
          runtimeTarget: {
            targetReferenceName: 'operator-vcp-toolbox-service-ref',
            targetKind: 'mcp_server',
            primaryRuntime: 'VCPToolBox native memory'
          },
          rollbackPosture: {
            rollback_plan_ref: 'cm-governed-write-rollback-plan'
          },
          approvalDecisionReference: 'CM-TEST-EXACT-APPROVAL-001',
          claimBindingHash: 'a'.repeat(64)
        },
        rollbackPosture: {
          mode: 'bounded_rollback_plan',
          rollback_plan_ref: 'cm-governed-write-rollback-plan'
        },
        auditReceipt: {
          receipt_id: 'cm-governed-write-receipt'
        },
        outputDisclosureBudget: {
          level: 'metadata',
          lowDisclosure: true,
          rawOutput: false,
          maxItems: 2,
          maxBytes: 512
        },
        trustedExecutionContext: {
          accepted: true,
          executionContext: {
            agentAlias: 'Codex',
            agentId: 'codex-desktop',
            requestSource: 'mcp-contract-test',
            scopeId: 'scope-alpha',
            privateField: 'RAW_PRIVATE_VALUE_SHOULD_NOT_COPY'
          }
        }
      }
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, true);
  assert.equal(result.requestContext.exactApprovalResult.accepted, true);
  assert.equal(result.requestContext.exactApprovalResult.allowedAction, 'live_bridge_record_memory_proof');
  assert.deepEqual(result.requestContext.exactApprovalResult.allowedScope, {
    scope_id: 'scope-alpha',
    project_id: 'codex-memory',
    workspace_id: 'workspace-alpha',
    client_id: 'Codex',
    visibility: 'private'
  });
  assert.deepEqual(result.requestContext.exactApprovalResult.runtimeTarget, {
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    targetKind: 'mcp_server',
    primaryRuntime: 'VCPToolBox native memory'
  });
  assert.equal(result.requestContext.exactApprovalResult.rollbackPlanRef, 'cm-governed-write-rollback-plan');
  assert.equal(result.requestContext.exactApprovalResult.approvalDecisionReference, 'CM-TEST-EXACT-APPROVAL-001');
  assert.equal(result.requestContext.exactApprovalResult.claimBindingHash, 'a'.repeat(64));
  assert.equal(result.requestContext.rollbackPosture.rollback_plan_ref, 'cm-governed-write-rollback-plan');
  assert.equal(result.requestContext.auditReceipt.receipt_id, 'cm-governed-write-receipt');
  assert.deepEqual(result.requestContext.outputDisclosureBudget, {
    level: 'metadata',
    low_disclosure: true,
    raw_output: false,
    max_items: 2,
    max_bytes: 512
  });
  assert.equal(result.requestContext.trustedExecutionContext.executionContext.agentAlias, 'Codex');
  assert.equal(result.requestContext.trustedExecutionContext.executionContext.scopeId, 'scope-alpha');
  assert.equal(serialized.includes('RAW_PRIVATE_VALUE_SHOULD_NOT_COPY'), false);
});

test('MCP governed metadata parser rejects invalid exact approval receipt bindings', () => {
  const result = buildGovernedMcpRequestContextFromParams({
    _meta: {
      codexMemoryGovernance: {
        exactApprovalResult: {
          accepted: true,
          approvalDecisionReference: 'https://PRIVATE_APPROVAL_REFERENCE_SHOULD_NOT_COPY',
          claimBindingHash: 'NOT-A-LOWERCASE-SHA256'
        }
      }
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.deepEqual(result.invalidFields, [
    'exactApprovalResult.approvalDecisionReference',
    'exactApprovalResult.claimBindingHash'
  ]);
  assert.deepEqual(result.requestContext, {});
  assert.equal(serialized.includes('PRIVATE_APPROVAL_REFERENCE_SHOULD_NOT_COPY'), false);
  assert.equal(serialized.includes('NOT-A-LOWERCASE-SHA256'), false);
});

test('MCP governed metadata parser rejects unsafe output disclosure budget without partial context', () => {
  const result = buildGovernedMcpRequestContextFromParams({
    _meta: {
      codexMemoryGovernance: {
        outputDisclosureBudget: {
          level: 'https://PRIVATE_DISCLOSURE_LEVEL_SHOULD_NOT_COPY',
          lowDisclosure: 'yes',
          rawOutput: true,
          maxItems: 50,
          maxBytes: 65536,
          token: 'SECRET_DISCLOSURE_TOKEN_SHOULD_NOT_COPY'
        }
      }
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.deepEqual(result.invalidFields, [
    'outputDisclosureBudget.forbiddenField',
    'outputDisclosureBudget.level',
    'outputDisclosureBudget.lowDisclosure',
    'outputDisclosureBudget.maxItems',
    'outputDisclosureBudget.maxBytes'
  ]);
  assert.deepEqual(result.requestContext, {});
  assert.equal(serialized.includes('PRIVATE_DISCLOSURE_LEVEL_SHOULD_NOT_COPY'), false);
  assert.equal(serialized.includes('SECRET_DISCLOSURE_TOKEN_SHOULD_NOT_COPY'), false);
});

test('MCP governed metadata parser treats full output aliases as raw output budget aliases', () => {
  const result = buildGovernedMcpRequestContextFromParams({
    _meta: {
      codexMemoryGovernance: {
        outputDisclosureBudget: {
          level: 'summary',
          low_disclosure: true,
          fullOutput: false,
          max_items: 5,
          max_bytes: 4096
        }
      }
    }
  });

  assert.equal(result.accepted, true);
  assert.deepEqual(result.requestContext.outputDisclosureBudget, {
    level: 'summary',
    low_disclosure: true,
    raw_output: false,
    max_items: 5,
    max_bytes: 4096
  });
});

test('MCP governed metadata parser rejects unsupported top-level governance fields without key disclosure', () => {
  const result = buildGovernedMcpRequestContextFromParams({
    _meta: {
      codexMemoryGovernance: {
        exactApprovalResult: {
          accepted: true
        },
        runtimeTarget: {
          endpoint: 'PRIVATE_RUNTIME_ENDPOINT_SHOULD_NOT_COPY'
        },
        scope: {
          project_id: 'PRIVATE_PROJECT_SHOULD_NOT_COPY'
        },
        clientId: 'Codex',
        secretTopLevelTokenSHOULD_NOT_COPY: 'SECRET_TOP_LEVEL_VALUE_SHOULD_NOT_COPY'
      }
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.deepEqual(result.invalidFields, [
    'codexMemoryGovernance.runtimeTarget',
    'codexMemoryGovernance.scope',
    'codexMemoryGovernance.clientId',
    'codexMemoryGovernance.unsupportedField'
  ]);
  assert.deepEqual(result.requestContext, {});
  assert.equal(serialized.includes('PRIVATE_RUNTIME_ENDPOINT_SHOULD_NOT_COPY'), false);
  assert.equal(serialized.includes('PRIVATE_PROJECT_SHOULD_NOT_COPY'), false);
  assert.equal(serialized.includes('SECRET_TOP_LEVEL_VALUE_SHOULD_NOT_COPY'), false);
  assert.equal(serialized.includes('secretTopLevelTokenSHOULD_NOT_COPY'), false);
});

test('MCP governed metadata parser rejects unsafe governed safe-reference fields', () => {
  const result = buildGovernedMcpRequestContextFromParams({
    _meta: {
      codexMemoryGovernance: {
        exactApprovalResult: {
          accepted: true,
          runtimeTarget: {
            targetReferenceName: 'http://PRIVATE_RUNTIME_ENDPOINT_SHOULD_NOT_COPY'
          },
          rollbackPlanRef: 'C:\\PRIVATE\\ROLLBACK\\PLAN_SHOULD_NOT_COPY'
        },
        rollbackPosture: {
          mode: 'bounded_rollback_plan',
          rollback_plan_ref: 'http://PRIVATE_ROLLBACK_ENDPOINT_SHOULD_NOT_COPY',
          token: 'SECRET_ROLLBACK_TOKEN_SHOULD_NOT_COPY'
        },
        auditReceipt: {
          receipt_id: 'secret-receipt-token-SHOULD_NOT_COPY'
        }
      }
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.deepEqual(result.invalidFields, [
    'exactApprovalResult.rollbackPlanRef',
    'exactApprovalResult.runtimeTarget.targetReferenceName',
    'rollbackPosture.forbiddenField',
    'rollbackPosture.rollback_plan_ref',
    'auditReceipt.receipt_id'
  ]);
  assert.deepEqual(result.requestContext, {});
  assert.equal(serialized.includes('PRIVATE_RUNTIME_ENDPOINT_SHOULD_NOT_COPY'), false);
  assert.equal(serialized.includes('PLAN_SHOULD_NOT_COPY'), false);
  assert.equal(serialized.includes('PRIVATE_ROLLBACK_ENDPOINT_SHOULD_NOT_COPY'), false);
  assert.equal(serialized.includes('SECRET_ROLLBACK_TOKEN_SHOULD_NOT_COPY'), false);
  assert.equal(serialized.includes('SHOULD_NOT_COPY'), false);
});

test('MCP governed metadata parser rejects runtime target locator material nested in exact approval', () => {
  const result = buildGovernedMcpRequestContextFromParams({
    _meta: {
      codexMemoryGovernance: {
        exactApprovalResult: {
          accepted: true,
          runtimeTarget: {
            targetReferenceName: 'operator-vcp-toolbox-service-ref',
            targetKind: 'mcp_server',
            primaryRuntime: 'VCPToolBox native memory',
            endpointUrl: 'http://PRIVATE_APPROVAL_ENDPOINT_SHOULD_NOT_COPY',
            authorizationHeader: 'Bearer PRIVATE_APPROVAL_AUTH_SHOULD_NOT_COPY'
          }
        }
      }
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.deepEqual(result.invalidFields, [
    'exactApprovalResult.runtimeTarget.forbiddenField'
  ]);
  assert.deepEqual(result.requestContext, {});
  assert.equal(serialized.includes('PRIVATE_APPROVAL_ENDPOINT_SHOULD_NOT_COPY'), false);
  assert.equal(serialized.includes('PRIVATE_APPROVAL_AUTH_SHOULD_NOT_COPY'), false);
});

test('MCP governed metadata parser rejects malformed exact approval runtime target', () => {
  const result = buildGovernedMcpRequestContextFromParams({
    _meta: {
      codexMemoryGovernance: {
        exactApprovalResult: {
          accepted: true,
          allowedAction: 'live_bridge_record_memory_proof',
          allowedScope: {
            project_id: 'codex-memory',
            workspace_id: 'workspace-alpha',
            client_id: 'Codex',
            visibility: 'private'
          },
          runtimeTarget: 'https://PRIVATE_APPROVAL_RUNTIME_TARGET_SHOULD_NOT_COPY',
          rollbackPlanRef: 'cm-governed-write-rollback-plan'
        }
      }
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.deepEqual(result.invalidFields, [
    'exactApprovalResult.runtimeTarget'
  ]);
  assert.deepEqual(result.requestContext, {});
  assert.equal(serialized.includes('PRIVATE_APPROVAL_RUNTIME_TARGET_SHOULD_NOT_COPY'), false);
});

test('MCP governed metadata parser rejects malformed exact approval scope', () => {
  const result = buildGovernedMcpRequestContextFromParams({
    _meta: {
      codexMemoryGovernance: {
        exactApprovalResult: {
          accepted: true,
          allowedAction: 'live_bridge_record_memory_proof',
          allowedScope: 'https://PRIVATE_APPROVAL_SCOPE_SHOULD_NOT_COPY',
          runtimeTarget: {
            targetReferenceName: 'operator-vcp-toolbox-service-ref',
            targetKind: 'mcp_server',
            primaryRuntime: 'VCPToolBox native memory'
          },
          rollbackPlanRef: 'cm-governed-write-rollback-plan'
        }
      }
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.deepEqual(result.invalidFields, [
    'exactApprovalResult.allowedScope'
  ]);
  assert.deepEqual(result.requestContext, {});
  assert.equal(serialized.includes('PRIVATE_APPROVAL_SCOPE_SHOULD_NOT_COPY'), false);
});

test('MCP governed metadata parser rejects malformed exact approval rollback plan reference', () => {
  const result = buildGovernedMcpRequestContextFromParams({
    _meta: {
      codexMemoryGovernance: {
        exactApprovalResult: {
          accepted: true,
          allowedAction: 'live_bridge_record_memory_proof',
          allowedScope: {
            project_id: 'codex-memory',
            workspace_id: 'workspace-alpha',
            client_id: 'Codex',
            visibility: 'private'
          },
          runtimeTarget: {
            targetReferenceName: 'operator-vcp-toolbox-service-ref',
            targetKind: 'mcp_server',
            primaryRuntime: 'VCPToolBox native memory'
          },
          rollbackPlanRef: ['PRIVATE_APPROVAL_ROLLBACK_PLAN_SHOULD_NOT_COPY']
        }
      }
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.deepEqual(result.invalidFields, [
    'exactApprovalResult.rollbackPlanRef'
  ]);
  assert.deepEqual(result.requestContext, {});
  assert.equal(serialized.includes('PRIVATE_APPROVAL_ROLLBACK_PLAN_SHOULD_NOT_COPY'), false);
});

test('MCP governed metadata parser rejects locator and secret fields in governance objects', () => {
  const result = buildGovernedMcpRequestContextFromParams({
    _meta: {
      codexMemoryGovernance: {
        exactApprovalResult: {
          accepted: true,
          allowedAction: 'live_bridge_record_memory_proof',
          allowedScope: {
            project_id: 'codex-memory',
            workspace_id: 'workspace-alpha',
            client_id: 'Codex',
            visibility: 'private',
            rawScopeSecret: 'RAW_SCOPE_SECRET_SHOULD_NOT_COPY'
          },
          runtimeTarget: {
            targetReferenceName: 'operator-vcp-toolbox-service-ref',
            targetKind: 'mcp_server',
            primaryRuntime: 'VCPToolBox native memory'
          },
          rollbackPosture: {
            rollback_plan_ref: 'cm-governed-write-rollback-plan',
            endpoint: 'PRIVATE_APPROVAL_ROLLBACK_ENDPOINT_SHOULD_NOT_COPY'
          },
          endpoint: 'PRIVATE_APPROVAL_ENDPOINT_SHOULD_NOT_COPY'
        },
        rollbackPosture: {
          mode: 'bounded_rollback_plan',
          rollback_plan_ref: 'cm-governed-write-rollback-plan',
          token: 'SECRET_ROLLBACK_TOKEN_SHOULD_NOT_COPY'
        },
        auditReceipt: {
          receipt_id: 'cm-governed-write-receipt',
          authorizationHeader: 'Bearer PRIVATE_RECEIPT_AUTH_SHOULD_NOT_COPY'
        },
        outputDisclosureBudget: {
          level: 'metadata',
          lowDisclosure: true,
          rawOutput: false,
          maxItems: 2,
          maxBytes: 512,
          endpoint: 'PRIVATE_DISCLOSURE_ENDPOINT_SHOULD_NOT_COPY'
        },
        trustedExecutionContext: {
          accepted: true,
          executionContext: {
            agentAlias: 'Codex',
            agentId: 'codex-desktop',
            requestSource: 'mcp-contract-test',
            authorizationHeader: 'Bearer PRIVATE_CONTEXT_AUTH_SHOULD_NOT_COPY'
          }
        }
      }
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.deepEqual(result.invalidFields, [
    'exactApprovalResult.forbiddenField',
    'rollbackPosture.forbiddenField',
    'auditReceipt.forbiddenField',
    'outputDisclosureBudget.forbiddenField',
    'trustedExecutionContext.forbiddenField'
  ]);
  assert.deepEqual(result.requestContext, {});
  assert.equal(serialized.includes('RAW_SCOPE_SECRET_SHOULD_NOT_COPY'), false);
  assert.equal(serialized.includes('PRIVATE_APPROVAL_ENDPOINT_SHOULD_NOT_COPY'), false);
  assert.equal(serialized.includes('PRIVATE_APPROVAL_ROLLBACK_ENDPOINT_SHOULD_NOT_COPY'), false);
  assert.equal(serialized.includes('SECRET_ROLLBACK_TOKEN_SHOULD_NOT_COPY'), false);
  assert.equal(serialized.includes('PRIVATE_RECEIPT_AUTH_SHOULD_NOT_COPY'), false);
  assert.equal(serialized.includes('PRIVATE_DISCLOSURE_ENDPOINT_SHOULD_NOT_COPY'), false);
  assert.equal(serialized.includes('PRIVATE_CONTEXT_AUTH_SHOULD_NOT_COPY'), false);
});

test('MCP governed metadata parser rejects unsafe free-string governance fields', () => {
  const result = buildGovernedMcpRequestContextFromParams({
    _meta: {
      codexMemoryGovernance: {
        exactApprovalResult: {
          accepted: true,
          allowedAction: 'https://PRIVATE_ACTION_SHOULD_NOT_COPY',
          runtimeTarget: {
            targetReferenceName: 'operator-vcp-toolbox-service-ref',
            targetKind: 'service_url',
            primaryRuntime: 'codex-memory local runtime SHOULD_NOT_COPY'
          },
          approvalId: 'secret-approval-token-SHOULD_NOT_COPY',
          approvedAt: 'https://PRIVATE_APPROVAL_TIME_SHOULD_NOT_COPY'
        },
        rollbackPosture: {
          mode: 'https://PRIVATE_ROLLBACK_MODE_SHOULD_NOT_COPY',
          rollback_plan_ref: 'cm-governed-write-rollback-plan'
        }
      }
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.deepEqual(result.invalidFields, [
    'exactApprovalResult.allowedAction',
    'exactApprovalResult.runtimeTarget.targetKind',
    'exactApprovalResult.runtimeTarget.primaryRuntime',
    'exactApprovalResult.approvalId',
    'exactApprovalResult.approvedAt',
    'rollbackPosture.mode'
  ]);
  assert.deepEqual(result.requestContext, {});
  assert.equal(serialized.includes('PRIVATE_ACTION_SHOULD_NOT_COPY'), false);
  assert.equal(serialized.includes('SHOULD_NOT_COPY'), false);
  assert.equal(serialized.includes('PRIVATE_ROLLBACK_MODE_SHOULD_NOT_COPY'), false);
});

test('MCP governed metadata parser rejects unsafe scope and trusted context identity fields', () => {
  const result = buildGovernedMcpRequestContextFromParams({
    _meta: {
      codexMemoryGovernance: {
        exactApprovalResult: {
          accepted: true,
          allowedScope: {
            scope_id: 'file:///PRIVATE_SCOPE_SHOULD_NOT_COPY',
            project_id: 'http://PRIVATE_PROJECT_ENDPOINT_SHOULD_NOT_COPY',
            workspace_id: '/private/workspace/path/SHOULD_NOT_COPY',
            client_id: 'secret-client-token-SHOULD_NOT_COPY',
            visibility: 'public'
          }
        },
        trustedExecutionContext: {
          accepted: true,
          executionContext: {
            agentAlias: 'Codex',
            agentId: 'codex-desktop',
            clientId: 'token-client-SHOULD_NOT_COPY',
            projectId: 'codex-memory',
            workspaceId: 'C:\\PRIVATE\\WORKSPACE_SHOULD_NOT_COPY',
            scopeId: '/PRIVATE/SCOPE_SHOULD_NOT_COPY',
            visibility: 'private'
          }
        }
      }
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.deepEqual(result.invalidFields, [
    'exactApprovalResult.allowedScope.scope_id',
    'exactApprovalResult.allowedScope.project_id',
    'exactApprovalResult.allowedScope.workspace_id',
    'exactApprovalResult.allowedScope.client_id',
    'exactApprovalResult.allowedScope.visibility',
    'trustedExecutionContext.executionContext.clientId',
    'trustedExecutionContext.executionContext.workspaceId',
    'trustedExecutionContext.executionContext.scopeId'
  ]);
  assert.deepEqual(result.requestContext, {});
  assert.equal(serialized.includes('PRIVATE_PROJECT_ENDPOINT_SHOULD_NOT_COPY'), false);
  assert.equal(serialized.includes('WORKSPACE_SHOULD_NOT_COPY'), false);
  assert.equal(serialized.includes('SHOULD_NOT_COPY'), false);
});

test('MCP governed metadata parser accepts shared visibility from trusted governance metadata', () => {
  const result = buildGovernedMcpRequestContextFromParams({
    _meta: {
      codexMemoryGovernance: {
        exactApprovalResult: {
          accepted: true,
          allowedScope: {
            project_id: 'codex-memory',
            workspace_id: 'workspace-alpha',
            client_id: 'Codex',
            visibility: 'shared'
          }
        },
        trustedExecutionContext: {
          accepted: true,
          executionContext: {
            agentAlias: 'Codex',
            projectId: 'codex-memory',
            workspaceId: 'workspace-alpha',
            visibility: 'shared'
          }
        }
      }
    }
  });

  assert.equal(result.accepted, true);
  assert.deepEqual(result.invalidFields, []);
  assert.equal(
    result.requestContext.exactApprovalResult.allowedScope.visibility,
    'shared'
  );
  assert.equal(
    result.requestContext.trustedExecutionContext.executionContext.visibility,
    'shared'
  );
});

test('MCP governed request context merge rejects trusted context drift from transport context', () => {
  const result = buildGovernedMcpEffectiveRequestContext({
    executionContext: {
      agentAlias: 'Codex',
      agentId: 'codex-desktop',
      requestSource: 'mcp-contract-test',
      clientId: 'codex',
      projectId: 'codex-memory',
      scopeId: 'scope-beta',
      workspaceId: 'workspace-beta',
      visibility: 'private'
    }
  }, {
    trustedExecutionContext: {
      accepted: true,
      executionContext: {
        agentAlias: 'Codex',
        agentId: 'codex-desktop',
        requestSource: 'mcp-contract-test',
        clientId: 'Codex',
        projectId: 'codex-memory',
        scopeId: 'scope-alpha',
        workspaceId: 'workspace-alpha',
        visibility: 'private'
      }
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.deepEqual(result.invalidFields, [
    'trustedExecutionContext.executionContext.scopeId',
    'trustedExecutionContext.executionContext.workspaceId'
  ]);
  assert.deepEqual(result.requestContext, {});
  assert.equal(serialized.includes('workspace-alpha'), false);
  assert.equal(serialized.includes('workspace-beta'), false);
  assert.equal(serialized.includes('scope-alpha'), false);
  assert.equal(serialized.includes('scope-beta'), false);
});

test('MCP governed request context merge binds missing trusted context fields to transport context', () => {
  const result = buildGovernedMcpEffectiveRequestContext({
    executionContext: {
      agentAlias: 'Codex',
      agentId: 'codex-desktop',
      requestSource: 'mcp-contract-test',
      clientId: 'codex',
      projectId: 'codex-memory',
      scopeId: 'scope-beta',
      workspaceId: 'workspace-beta',
      visibility: 'private'
    }
  }, {
    trustedExecutionContext: {
      accepted: true,
      executionContext: {
        agentAlias: 'Codex'
      }
    }
  });

  assert.equal(result.accepted, true);
  assert.deepEqual(result.requestContext.trustedExecutionContext.executionContext, {
    agentAlias: 'Codex',
    agentId: 'codex-desktop',
    requestSource: 'mcp-contract-test',
    clientId: 'codex',
    projectId: 'codex-memory',
    scopeId: 'scope-beta',
    workspaceId: 'workspace-beta',
    visibility: 'private'
  });
});

test('MCP tools/call can carry governed metadata to primary native write delegation', async () => {
  let nativeCall = null;
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    let localWrites = 0;
    app.services.writeService.record = async () => {
      localWrites += 1;
      return { success: true };
    };

    const result = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 20,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'knowledge',
          title: 'Governed metadata write',
          content: 'RAW_MCP_GOVERNED_WRITE_CONTENT_SHOULD_NOT_ECHO',
          evidence: 'exact approval supplied through MCP metadata',
          validated: true,
          reusable: true,
          sensitivity: 'none'
        },
        _meta: {
          codexMemoryGovernance: {
            exactApprovalResult: {
              accepted: true,
              allowedAction: 'live_bridge_record_memory_proof',
              allowedScope: {
                project_id: 'codex-memory',
                workspace_id: 'workspace-alpha',
                client_id: 'Codex',
                visibility: 'private'
              },
              runtimeTarget: {
                targetReferenceName: 'operator-vcp-toolbox-service-ref',
                targetKind: 'mcp_server',
                primaryRuntime: 'VCPToolBox native memory'
              },
              rollbackPlanRef: 'cm-governed-write-rollback-plan',
              approvalDecisionReference: 'CM-TEST-MCP-PHASE8-APPROVAL-001',
              claimBindingHash: 'b'.repeat(64)
            },
            rollbackPosture: {
              mode: 'bounded_rollback_plan',
              rollback_plan_ref: 'cm-governed-write-rollback-plan'
            },
            auditReceipt: {
              receipt_id: 'cm-governed-write-receipt'
            },
            outputDisclosureBudget: {
              level: 'metadata',
              lowDisclosure: true,
              rawOutput: false,
              maxItems: 2,
              maxBytes: 512
            }
          }
        }
      }
    }, {
      executionContext: {
        agentAlias: 'Codex',
        agentId: 'codex-desktop',
        clientId: 'codex',
        projectId: 'codex-memory',
        workspaceId: 'workspace-alpha',
        visibility: 'private',
        requestSource: 'mcp-contract-test'
      }
    });
    const payload = result.response.result.structuredContent;
    const serializedResponse = JSON.stringify(result.response);
    const auditEntries = await app.stores.auditLogStore.readRecentWriteAudit();
    const bridgeAuditEntry = auditEntries.find(entry =>
      entry.eventType === 'governed_mcp_vcp_native_bridge_receipt'
    );

    assert.equal(localWrites, 0);
    assert.equal(nativeCall.toolName, 'record_memory');
    assert.equal(nativeCall.arguments.content, 'RAW_MCP_GOVERNED_WRITE_CONTENT_SHOULD_NOT_ECHO');
    assert.equal(nativeCall.arguments.governed_bridge.exact_approval_action, 'live_bridge_record_memory_proof');
    assert.equal(nativeCall.arguments.governed_bridge.exact_approval_scope_matched, true);
    assert.equal(nativeCall.arguments.governed_bridge.exact_approval_runtime_target_matched, true);
    assert.equal(nativeCall.arguments.governed_bridge.exact_approval_rollback_plan_matched, true);
    assert.equal(nativeCall.arguments.governed_bridge.exact_approval_decision_reference, 'CM-TEST-MCP-PHASE8-APPROVAL-001');
    assert.equal(nativeCall.arguments.governed_bridge.exact_approval_claim_binding_hash, 'b'.repeat(64));
    assert.equal(
      nativeCall.governanceMeta.exactApprovalResult.approvalDecisionReference,
      'CM-TEST-MCP-PHASE8-APPROVAL-001'
    );
    assert.equal(nativeCall.governanceMeta.exactApprovalResult.claimBindingHash, 'b'.repeat(64));
    assert.equal(bridgeAuditEntry.exactApprovalDecisionReference, 'CM-TEST-MCP-PHASE8-APPROVAL-001');
    assert.equal(bridgeAuditEntry.exactApprovalClaimBindingHash, 'b'.repeat(64));
    assert.equal(nativeCall.arguments.governed_bridge.disclosure_level, 'metadata');
    assert.equal(nativeCall.arguments.governed_bridge.disclosure_max_items, 2);
    assert.equal(nativeCall.arguments.governed_bridge.disclosure_max_bytes, 512);
    assert.equal(payload.status, 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATED');
    assert.equal(payload.access.primaryRuntime, 'VCPToolBox native memory');
    assert.equal(payload.access.localMemoryFallbackUsed, false);
    assert.equal(serializedResponse.includes('RAW_MCP_GOVERNED_WRITE_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResponse.includes('RAW_NATIVE_VALUE_SHOULD_NOT_ECHO'), false);
  }, {
    mcpPublicToolSurface: 'full',
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'workspace-alpha',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeWriteDelegationToolCaller: async call => {
      nativeCall = call;
      return {
        memory_id: 'RAW_NATIVE_ID_SHOULD_NOT_ECHO',
        content: 'RAW_NATIVE_VALUE_SHOULD_NOT_ECHO'
      };
    }
  });
});

test('MCP tools/call rejects malformed governed metadata without echoing raw values', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const result = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 21,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'knowledge',
          title: 'Rejected governed metadata',
          content: 'RAW_REJECTED_METADATA_CONTENT_SHOULD_NOT_ECHO',
          evidence: 'malformed exact approval metadata',
          validated: true,
          reusable: true,
          sensitivity: 'none'
        },
        _meta: {
          codexMemoryGovernance: {
            exactApprovalResult: {
              accepted: 'true',
              token: 'SECRET_TOKEN_SHOULD_NOT_ECHO'
            }
          }
        }
      }
    });
    const serializedResponse = JSON.stringify(result.response);

    assert.equal(result.response.error.code, -32602);
    assert.equal(result.response.error.data.code, 'invalid_governed_mcp_metadata');
    assert.deepEqual(result.response.error.data.invalidFields, ['exactApprovalResult.accepted']);
    assert.equal(serializedResponse.includes('RAW_REJECTED_METADATA_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResponse.includes('SECRET_TOKEN_SHOULD_NOT_ECHO'), false);
  }, {
    mcpPublicToolSurface: 'full'
  });
});

test('MCP tools/call rejects unsupported governed metadata top-level fields before tool execution', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    let toolCalls = 0;
    const originalCallTool = app.callTool.bind(app);
    app.callTool = async (...callArgs) => {
      toolCalls += 1;
      return originalCallTool(...callArgs);
    };

    const result = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 23,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'RAW_QUERY_SHOULD_NOT_ECHO',
          scope: {
            project_id: 'codex-memory',
            workspace_id: 'workspace-alpha',
            client_id: 'codex',
            visibility: 'private'
          }
        },
        _meta: {
          codexMemoryGovernance: {
            trustedExecutionContext: {
              accepted: true,
              executionContext: {
                agentAlias: 'Codex',
                projectId: 'codex-memory',
                workspaceId: 'workspace-alpha',
                visibility: 'private'
              }
            },
            runtimeTarget: {
              endpoint: 'PRIVATE_RUNTIME_ENDPOINT_SHOULD_NOT_ECHO'
            },
            secretTopLevelKeySHOULD_NOT_ECHO: 'SECRET_TOP_LEVEL_VALUE_SHOULD_NOT_ECHO'
          }
        }
      }
    });
    const serializedResponse = JSON.stringify(result.response);

    assert.equal(result.response.error.code, -32602);
    assert.equal(result.response.error.data.code, 'invalid_governed_mcp_metadata');
    assert.deepEqual(result.response.error.data.invalidFields, [
      'codexMemoryGovernance.runtimeTarget',
      'codexMemoryGovernance.unsupportedField'
    ]);
    assert.equal(toolCalls, 0);
    assert.equal(serializedResponse.includes('RAW_QUERY_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResponse.includes('PRIVATE_RUNTIME_ENDPOINT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResponse.includes('SECRET_TOP_LEVEL_VALUE_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResponse.includes('secretTopLevelKeySHOULD_NOT_ECHO'), false);
  });
});

test('MCP tools/call rejects trusted context metadata drift from transport context before tool execution', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    let toolCalls = 0;
    const originalCallTool = app.callTool.bind(app);
    app.callTool = async (...callArgs) => {
      toolCalls += 1;
      return originalCallTool(...callArgs);
    };

    const result = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 24,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'RAW_QUERY_SHOULD_NOT_ECHO',
          scope: {
            project_id: 'codex-memory',
            workspace_id: 'workspace-alpha',
            client_id: 'codex',
            visibility: 'private'
          }
        },
        _meta: {
          codexMemoryGovernance: {
            trustedExecutionContext: {
              accepted: true,
              executionContext: {
                agentAlias: 'Codex',
                agentId: 'codex-desktop',
                requestSource: 'mcp-contract-test',
                clientId: 'codex',
                projectId: 'codex-memory',
                workspaceId: 'workspace-alpha',
                visibility: 'private'
              }
            }
          }
        }
      }
    }, {
      executionContext: {
        agentAlias: 'Codex',
        agentId: 'codex-desktop',
        requestSource: 'mcp-contract-test',
        clientId: 'codex',
        projectId: 'codex-memory',
        scopeId: 'scope-beta',
        workspaceId: 'workspace-beta',
        visibility: 'private'
      }
    });
    const serializedResponse = JSON.stringify(result.response);

    assert.equal(result.response.error.code, -32602);
    assert.equal(result.response.error.data.code, 'invalid_governed_mcp_metadata');
    assert.deepEqual(result.response.error.data.invalidFields, [
      'trustedExecutionContext.executionContext.workspaceId'
    ]);
    assert.equal(toolCalls, 0);
    assert.equal(serializedResponse.includes('RAW_QUERY_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResponse.includes('workspace-alpha'), false);
    assert.equal(serializedResponse.includes('workspace-beta'), false);
  });
});

test('MCP tools/call binds sparse trusted context metadata to transport scope before bridge gate', async () => {
  let nativeCalls = 0;
  let nativePayload = null;
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });

    const result = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 25,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'RAW_QUERY_SHOULD_NOT_ECHO',
          scope: {
            project_id: 'codex-memory',
            workspace_id: 'workspace-alpha',
            client_id: 'codex',
            visibility: 'private'
          }
        },
        _meta: {
          codexMemoryGovernance: {
            trustedExecutionContext: {
              accepted: true,
              executionContext: {
                agentAlias: 'Codex'
              }
            },
            auditReceipt: {
              receipt_id: 'cm-governed-read-receipt'
            },
            outputDisclosureBudget: {
              level: 'summary',
              lowDisclosure: true,
              rawOutput: false,
              maxItems: 2,
              maxBytes: 512
            }
          }
        }
      }
    }, {
      executionContext: {
        agentAlias: 'Codex',
        agentId: 'codex-desktop',
        requestSource: 'mcp-contract-test',
        clientId: 'codex',
        projectId: 'codex-memory',
        scopeId: 'scope-beta',
        workspaceId: 'workspace-beta',
        visibility: 'private'
      }
    });
    const payload = result.response.result.structuredContent;
    const serializedResponse = JSON.stringify(result.response);

    assert.equal(payload.status, 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATED');
    assert.equal(nativeCalls, 1);
    assert.deepEqual(nativePayload.arguments.scope, {
      scope_id: 'scope-beta',
      project_id: 'codex-memory',
      workspace_id: 'workspace-beta',
      client_id: 'Codex',
      visibility: 'private'
    });
    assert.deepEqual(nativePayload.arguments.governed_bridge.scope, nativePayload.arguments.scope);
    assert.equal(serializedResponse.includes('RAW_QUERY_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResponse.includes('workspace-alpha'), false);
    assert.equal(serializedResponse.includes('workspace-beta'), false);
  }, {
    mcpPublicToolSurface: 'full',
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'workspace-beta',
    governedMcpVcpNativeBridgeGateMode: 'strict',
    governedMcpVcpNativeReadDelegationMode: 'primary',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeReadDelegationToolCaller: async payload => {
      nativeCalls += 1;
      nativePayload = payload;
      return [];
    }
  });
});

test('MCP tools/call rejects unsafe rollback posture reference without echoing it', async () => {
  let nativeCalls = 0;
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    let localWrites = 0;
    app.services.writeService.record = async () => {
      localWrites += 1;
      return { success: true };
    };

    const result = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 22,
      method: 'tools/call',
      params: {
        name: 'record_memory',
        arguments: {
          target: 'knowledge',
          title: 'Unsafe rollback reference',
          content: 'RAW_UNSAFE_ROLLBACK_CONTENT_SHOULD_NOT_ECHO',
          evidence: 'unsafe rollback metadata must fail closed',
          validated: true,
          reusable: true,
          sensitivity: 'none'
        },
        _meta: {
          codexMemoryGovernance: {
            exactApprovalResult: {
              accepted: true,
              allowedAction: 'live_bridge_record_memory_proof',
              allowedScope: {
                project_id: 'codex-memory',
                workspace_id: 'workspace-alpha',
                client_id: 'Codex',
                visibility: 'private'
              },
              runtimeTarget: {
                targetReferenceName: 'operator-vcp-toolbox-service-ref',
                targetKind: 'mcp_server',
                primaryRuntime: 'VCPToolBox native memory'
              },
              rollbackPlanRef: 'cm-governed-write-rollback-plan'
            },
            rollbackPosture: {
              mode: 'bounded_rollback_plan',
              rollback_plan_ref: 'http://PRIVATE_ROLLBACK_ENDPOINT_SHOULD_NOT_ECHO',
              token: 'SECRET_ROLLBACK_TOKEN_SHOULD_NOT_ECHO'
            },
            auditReceipt: {
              receipt_id: 'cm-governed-write-receipt'
            }
          }
        }
      }
    }, {
      executionContext: {
        agentAlias: 'Codex',
        agentId: 'codex-desktop',
        clientId: 'codex',
        projectId: 'codex-memory',
        workspaceId: 'workspace-alpha',
        visibility: 'private',
        requestSource: 'mcp-contract-test'
      }
    });
    const serializedResponse = JSON.stringify(result.response);

    assert.equal(result.response.error.code, -32602);
    assert.equal(result.response.error.data.code, 'invalid_governed_mcp_metadata');
    assert.deepEqual(result.response.error.data.invalidFields, [
      'rollbackPosture.forbiddenField',
      'rollbackPosture.rollback_plan_ref'
    ]);
    assert.equal(localWrites, 0);
    assert.equal(nativeCalls, 0);
    assert.equal(serializedResponse.includes('RAW_UNSAFE_ROLLBACK_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResponse.includes('PRIVATE_ROLLBACK_ENDPOINT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResponse.includes('SECRET_ROLLBACK_TOKEN_SHOULD_NOT_ECHO'), false);
  }, {
    mcpPublicToolSurface: 'full',
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'workspace-alpha',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeWriteDelegationToolCaller: async () => {
      nativeCalls += 1;
      return {};
    }
  });
});

test('MCP search_memory timeout should return sanitized JSON-RPC error', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const secretQuery = 'timeout query with SHOULD_NOT_LEAK_0560';
    app.services.passiveRecallService.search = async () => new Promise(() => {});

    const startedAt = Date.now();
    const result = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 13,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: secretQuery,
          target: 'process',
          limit: 1
        }
      }
    });
    const elapsedMs = Date.now() - startedAt;
    const serialized = JSON.stringify(result.response);

    assert.equal(result.response.jsonrpc, '2.0');
    assert.equal(result.response.id, 13);
    assert.equal(result.response.error.code, -32002);
    assert.equal(result.response.error.message, 'Search memory timeout');
    assert.equal(result.response.error.data.code, 'SEARCH_MEMORY_TIMEOUT');
    assert.equal(result.response.error.data.reason, 'search_memory exceeded the configured timeout.');
    assert.equal(result.response.error.data.timeoutMs, 5);
    assert.ok(elapsedMs < 1000);
    assert.doesNotMatch(serialized, /SHOULD_NOT_LEAK_0560/);
  }, { searchMemoryTimeoutMs: 5 });
});

test('MCP search_memory timeout should abort before post-timeout read-policy audit summary', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    let receivedSignal = false;
    let readPolicySummaryCount = 0;

    app.services.passiveRecallService.search = async ({ signal }) => {
      receivedSignal = !!signal;
      return new Promise(resolve => {
        signal.addEventListener('abort', () => {
          setTimeout(() => resolve([]), 10);
        }, { once: true });
      });
    };
    app.recall.recallAuditService.recordReadPolicySummary = async () => {
      readPolicySummaryCount += 1;
    };

    const result = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 14,
      method: 'tools/call',
      params: {
        name: 'search_memory',
        arguments: {
          query: 'timeout abort audit boundary SHOULD_NOT_LEAK_0561',
          target: 'process',
          limit: 1
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 50));
    const serialized = JSON.stringify(result.response);

    assert.equal(receivedSignal, true);
    assert.equal(readPolicySummaryCount, 0);
    assert.equal(result.response.error.code, -32002);
    assert.equal(result.response.error.data.code, 'SEARCH_MEMORY_TIMEOUT');
    assert.doesNotMatch(serialized, /SHOULD_NOT_LEAK_0561/);
  }, {
    enableLifecycleReadPolicy: true,
    searchMemoryTimeoutMs: 5
  });
});

test('MCP prepare_memory_context recall uses the configured search timeout and abort signal', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    let receivedSignal = false;
    let overviewCalls = 0;
    let auditCalls = 0;

    app.services.passiveRecallService.search = async ({ signal }) => {
      receivedSignal = !!signal;
      return new Promise(resolve => {
        signal.addEventListener('abort', () => {
          setTimeout(() => resolve([]), 10);
        }, { once: true });
      });
    };
    app.services.overviewService.getAuthenticatedBoundedOverview = async () => {
      overviewCalls += 1;
      return {};
    };
    app.services.auditMemoryReadonlyService.run = async () => {
      auditCalls += 1;
      return {};
    };

    const startedAt = Date.now();
    const result = await server.handleJsonRpc({
      jsonrpc: '2.0',
      id: 15,
      method: 'tools/call',
      params: {
        name: 'prepare_memory_context',
        arguments: {
          task: {
            title: 'Timeout context package',
            user_request: 'Recall must not pin the MCP session SHOULD_NOT_LEAK_0562.'
          }
        }
      }
    });
    const elapsedMs = Date.now() - startedAt;
    await new Promise(resolve => setTimeout(resolve, 50));
    const serialized = JSON.stringify(result.response);

    assert.equal(receivedSignal, true);
    assert.equal(overviewCalls, 0);
    assert.equal(auditCalls, 0);
    assert.equal(result.response.error.code, -32002);
    assert.equal(result.response.error.message, 'Search memory timeout');
    assert.equal(result.response.error.data.code, 'SEARCH_MEMORY_TIMEOUT');
    assert.equal(result.response.error.data.timeoutMs, 5);
    assert.ok(elapsedMs < 1000);
    assert.doesNotMatch(serialized, /SHOULD_NOT_LEAK_0562/);
  }, { searchMemoryTimeoutMs: 5 });
});

test('MCP schema contract should expose scope in search_memory', async () => {
  await withApp(async ({ app }) => {
    const server = new CodexMemoryMcpServer({ app });
    const list = await server.handleJsonRpc({
      jsonrpc: '2.0', id: 1, method: 'tools/list', params: {}
    });
    const tools = list.response.result.tools;
    const searchMemory = tools.find(t => t.name === 'search_memory');
    assert.ok(searchMemory);
    const schema = searchMemory.inputSchema;
    assert.equal(schema.additionalProperties, false);
    assert.ok(schema.properties.scope);
    const scopeSchema = schema.properties.scope;
    assert.equal(scopeSchema.additionalProperties, false);
    assert.ok(scopeSchema.properties.project_id);
    assert.ok(scopeSchema.properties.workspace_id);
    assert.ok(scopeSchema.properties.client_id);
    assert.ok(scopeSchema.properties.visibility);
    assert.ok(Array.isArray(scopeSchema.properties.visibility.oneOf));
    assert.deepEqual(scopeSchema.properties.visibility.oneOf.map(option => option.type), ['string', 'array']);
    assert.equal(scopeSchema.properties.visibility.oneOf[1].items.type, 'string');
    assert.deepEqual(scopeSchema.properties.client_id.enum, ['codex', 'claude', 'manual']);
    assert.deepEqual(scopeSchema.properties.visibility.oneOf[0].enum, ['private', 'workspace', 'project', 'shared']);
    assert.deepEqual(scopeSchema.properties.visibility.oneOf[1].items.enum, ['private', 'workspace', 'project', 'shared']);
    assert.ok(scopeSchema.properties.strict);
  });
});
