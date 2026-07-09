'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const {
  buildGovernedMcpVcpNativeReadFallbackLocalAuditReceipt,
  prepareGovernedMcpVcpNativeReadFallbackAuditReceipt,
  createCodexMemoryApplication
} = require('../src/app');
const {
  buildGovernedMcpVcpNativeBridgeGateInput
} = require('../src/core/GovernedMcpVcpNativeBridgeRequestProjection');
const {
  validateGovernedMcpVcpNativeBridgeGate
} = require('../src/core/GovernedMcpVcpNativeBridgeGate');
const {
  validateGovernedMcpBridgeGateResultCoversCurrentProductGoal,
  validateGovernedMcpNativeDelegatedArgumentsCoversCurrentProductGoal,
  validateGovernedMcpNativeGovernanceMetadataCoversCurrentProductGoal,
  validateGovernedMcpNativeBridgeReceiptCoversCurrentProductGoal,
  validateGovernedMcpOverviewStatusCoversCurrentProductGoal,
  validateGovernedMcpReadFallbackReceiptCoversLocalMemoryRole,
  validateGovernedMcpReadFallbackToolResultCoversLocalMemoryRole
} = require('../src/core/CurrentProductGoalContract');

function trustedRuntimeTargetConfig(overrides = {}) {
  return {
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    targetKind: 'mcp_server',
    ...overrides
  };
}

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
    receipt: nativeInvocationReceiptForPayload(payload)
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

function governedNativeTransportErrorForPayload(payload, message) {
  const error = new Error(message);
  error.statusClass = 'transport_error';
  error.lowDisclosureReceipt = nativeInvocationReceiptForPayload(payload, {
    statusClass: 'transport_error',
    httpStatusClass: 'transport_error',
    jsonRpcErrorPresent: true,
    responseShapeCategory: 'not_consumed',
    topLevelKindCategory: 'not_consumed'
  });
  return error;
}

async function withTempApp(overrides, handler) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-governed-bridge-app-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data'),
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'workspace-alpha',
    governedMcpVcpNativeRuntimeTarget: trustedRuntimeTargetConfig(),
    ...receiptAwareNativeCallerOverrides(overrides)
  });

  await app.initialize();
  try {
    await handler(app);
  } finally {
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
}

test('fallback local audit receipt status requires both accepted and appended evidence', () => {
  const receipt = buildGovernedMcpVcpNativeReadFallbackLocalAuditReceipt({
    eventType: 'governed_mcp_vcp_native_read_fallback_receipt',
    accepted: true,
    appended: false,
    reasonCode: 'read_fallback_audit_receipt_append_failed'
  });

  assert.equal(receipt.appended, false);
  assert.equal(receipt.status, 'not_appended');
  assert.equal(receipt.authorized, false);
  assert.equal(receipt.reasonCode, 'read_fallback_audit_receipt_append_failed');
  assert.equal(receipt.lowDisclosure, true);
  assert.equal(receipt.rawPayloadPersisted, false);
  assert.equal(receipt.tokenMaterialPersisted, false);
});

test('fallback audit preparation rejects accepted receipt that was not appended', async () => {
  const result = await prepareGovernedMcpVcpNativeReadFallbackAuditReceipt(
    {
      reasonCode: 'native_read_delegation_transport_error',
      localMemoryRole: 'fallback',
      localMemorySourceRuntime: 'codex_memory_local_fallback',
      fallbackRequiresAuditReceipt: true,
      fallbackAfterAuditReceiptAppended: true,
      nativeInvocationAttempted: true,
      nativeMcpToolInvocationAttempted: true
    },
    {
      toolName: 'search_memory',
      recordFallbackAuditReceipt: async () => ({
        eventType: 'governed_mcp_vcp_native_read_fallback_receipt',
        accepted: true,
        appended: false,
        reasonCode: 'read_fallback_audit_receipt_append_failed'
      })
    }
  );

  assert.equal(result.accepted, false);
  assert.equal(result.localFallbackAuditReceipt.appended, false);
  assert.equal(result.localFallbackAuditReceipt.status, 'not_appended');
  assert.equal(result.rejectedToolResult.status, 'GOVERNED_MCP_VCP_NATIVE_READ_FALLBACK_REJECTED');
  assert.equal(result.rejectedToolResult.access.localMemoryFallbackUsed, false);
  assert.equal(result.rejectedToolResult.access.localMemoryFallbackReadPerformed, false);
  assert.equal(result.rejectedToolResult.access.localMemoryFallbackReturned, false);
  assert.equal(result.rejectedToolResult.receipt.auditReceiptRequiredButNotAppended, true);
});

test('fallback audit preparation rejects appended receipt that does not authorize local fallback', async () => {
  const result = await prepareGovernedMcpVcpNativeReadFallbackAuditReceipt(
    {
      reasonCode: 'native_read_delegation_transport_error',
      localMemoryRole: 'fallback',
      localMemorySourceRuntime: 'codex_memory_local_fallback',
      fallbackRequiresAuditReceipt: true,
      fallbackAfterAuditReceiptAppended: true,
      nativeInvocationAttempted: true,
      nativeMcpToolInvocationAttempted: true,
      nativeMemoryReadPerformed: false,
      nativeStatusClass: 'transport_error'
    },
    {
      toolName: 'search_memory',
      recordFallbackAuditReceipt: async () => ({
        eventType: 'governed_mcp_vcp_native_read_fallback_receipt',
        accepted: true,
        appended: true,
        localMemoryFallbackAuthorized: false,
        reasonCode: null
      })
    }
  );

  assert.equal(result.accepted, false);
  assert.equal(result.localFallbackAuditReceipt.appended, true);
  assert.equal(result.localFallbackAuditReceipt.status, 'appended');
  assert.equal(result.localFallbackAuditReceipt.authorized, false);
  assert.equal(result.rejectedToolResult.status, 'GOVERNED_MCP_VCP_NATIVE_READ_FALLBACK_REJECTED');
  assert.equal(result.rejectedToolResult.reasonCode, 'required_read_fallback_audit_receipt_not_authorized');
  assert.equal(result.rejectedToolResult.access.localMemoryFallbackUsed, false);
  assert.equal(result.rejectedToolResult.access.localMemoryFallbackReadPerformed, false);
  assert.equal(result.rejectedToolResult.access.localFallbackAuditReceiptStatus, 'appended');
  assert.equal(result.rejectedToolResult.access.localFallbackAuditReceiptAuthorized, false);
  assert.equal(result.rejectedToolResult.receipt.auditReceiptRequiredButNotAppended, false);
  assert.equal(result.rejectedToolResult.receipt.auditReceiptAppendedButNotAuthorized, true);
  assert.equal(result.rejectedToolResult.receipt.statusClass, 'fallback_audit_receipt_not_authorized');
});

function codexContext(overrides = {}) {
  return {
    executionContext: {
      agentAlias: 'Codex',
      agentId: 'codex-desktop',
      clientId: 'codex',
      projectId: 'codex-memory',
      workspaceId: 'workspace-alpha',
      visibility: 'private',
      requestSource: 'governed-mcp-vcp-native-bridge-app-integration',
      ...(overrides.executionContext || {})
    },
    ...(overrides.requestContext || {})
  };
}

function exactWriteApprovalResult(overrides = {}) {
  return {
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
    ...overrides
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function withJsonRpcServer(handler) {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    const rawBody = await readBody(req);
    const parsedBody = JSON.parse(rawBody);
    requests.push({
      method: req.method,
      headers: req.headers,
      body: parsedBody
    });
    await handler(req, res, parsedBody);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });

  const address = server.address();
  return {
    requests,
    url: `http://127.0.0.1:${address.port}/mcp/vcp-native`,
    close: () => new Promise((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    })
  };
}

test('projection turns app call context into a governed VCPToolBox-native bridge gate input', () => {
  const input = buildGovernedMcpVcpNativeBridgeGateInput({
    toolName: 'audit_memory',
    args: {},
    requestContext: codexContext(),
    config: {
      allowedAgentAlias: 'Codex',
      defaultProjectId: 'codex-memory',
      defaultWorkspaceId: 'workspace-alpha',
      governedMcpVcpNativeRuntimeTarget: {
        accepted: true,
        sourceAuthority: 'bridge_runtime_or_static_config',
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        targetKind: 'mcp_server'
      }
    }
  });
  const result = validateGovernedMcpVcpNativeBridgeGate(input);
  const coverage = validateGovernedMcpBridgeGateResultCoversCurrentProductGoal(result);

  assert.equal(result.accepted, true);
  assert.equal(coverage.accepted, true, coverage.blockers.join(', '));
  assert.equal(coverage.direction, 'read');
  assert.equal(result.normalizedBridgeRequest.client_id, 'Codex');
  assert.equal(input.trusted_execution_context.accepted, true);
  assert.equal(input.trusted_execution_context.executionContext.agentAlias, 'Codex');
  assert.equal(result.normalizedBridgeRequest.trusted_execution_context_supplied, true);
  assert.equal(result.normalizedBridgeRequest.trusted_execution_context_scope_matched, true);
  assert.equal(result.normalizedBridgeRequest.visibility, 'private');
  assert.equal(result.normalizedBridgeRequest.runtime_target, 'VCPToolBox native memory');
  assert.equal(result.normalizedBridgeRequest.runtime_target_reference_name, 'operator-vcp-toolbox-service-ref');
  assert.equal(result.normalizedBridgeRequest.runtime_target_kind, 'mcp_server');
  assert.equal(result.normalizedBridgeRequest.invocation_profile, 'governed_read_only');
  assert.equal(result.normalizedBridgeRequest.mcp_tool_name, 'audit_memory');
  assert.equal(result.normalizedBridgeRequest.audit_receipt_reference_present, true);
  assert.equal(result.vcpToolBoxCalled, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(result.memoryWritePerformed, false);
});

test('projection and gate bind every native bridge tool to its governed access matrix', () => {
  const scope = {
    project_id: 'codex-memory',
    scope_id: 'scope-alpha',
    workspace_id: 'workspace-alpha',
    client_id: 'Codex',
    visibility: 'private'
  };
  const runtimeTarget = {
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    targetKind: 'mcp_server',
    primaryRuntime: 'VCPToolBox native memory'
  };
  const toolMatrix = [
    {
      toolName: 'search_memory',
      profile: 'governed_read_only',
      readAllowed: true,
      writeAllowed: false,
      rollbackPosture: 'no_runtime_state_to_rollback',
      args: { query: 'needle', include_content: false }
    },
    {
      toolName: 'memory_overview',
      profile: 'governed_read_only',
      readAllowed: true,
      writeAllowed: false,
      rollbackPosture: 'no_runtime_state_to_rollback',
      args: {}
    },
    {
      toolName: 'audit_memory',
      profile: 'governed_read_only',
      readAllowed: true,
      writeAllowed: false,
      rollbackPosture: 'no_runtime_state_to_rollback',
      args: { include_raw: false }
    },
    {
      toolName: 'record_memory',
      profile: 'governed_bounded_write',
      readAllowed: false,
      writeAllowed: true,
      rollbackPosture: 'bounded_rollback_plan',
      exactApprovalAction: 'live_bridge_record_memory_proof',
      args: {}
    },
    {
      toolName: 'tombstone_memory',
      profile: 'governed_bounded_write',
      readAllowed: false,
      writeAllowed: true,
      rollbackPosture: 'bounded_rollback_plan',
      exactApprovalAction: 'live_bridge_tombstone_memory_proof',
      args: {}
    },
    {
      toolName: 'supersede_memory',
      profile: 'governed_bounded_write',
      readAllowed: false,
      writeAllowed: true,
      rollbackPosture: 'bounded_rollback_plan',
      exactApprovalAction: 'live_bridge_supersede_memory_proof',
      args: {}
    }
  ];

  for (const item of toolMatrix) {
    const requestContext = item.writeAllowed
      ? codexContext({
        executionContext: {
          scopeId: 'scope-alpha'
        },
        requestContext: {
          exactApprovalResult: exactWriteApprovalResult({
            allowedAction: item.exactApprovalAction,
            allowedScope: scope,
            runtimeTarget
          }),
          rollbackPosture: {
            mode: item.rollbackPosture,
            rollback_plan_ref: 'cm-governed-write-rollback-plan'
          }
        }
      })
      : codexContext({
        executionContext: {
          scopeId: 'scope-alpha'
        }
      });
    const input = buildGovernedMcpVcpNativeBridgeGateInput({
      toolName: item.toolName,
      args: item.args,
      requestContext,
      config: {
        allowedAgentAlias: 'Codex',
        defaultProjectId: 'codex-memory',
        defaultWorkspaceId: 'workspace-alpha',
        governedMcpVcpNativeRuntimeTarget: trustedRuntimeTargetConfig({
          accepted: true,
          sourceAuthority: 'bridge_runtime_or_static_config'
        })
      }
    });
    const result = validateGovernedMcpVcpNativeBridgeGate(input);
    const coverage = validateGovernedMcpBridgeGateResultCoversCurrentProductGoal(result);

    assert.equal(result.accepted, true, item.toolName);
    assert.equal(coverage.accepted, true, `${item.toolName}: ${coverage.blockers.join(', ')}`);
    assert.equal(coverage.direction, item.writeAllowed ? 'write' : 'read', item.toolName);
    assert.equal(result.normalizedBridgeRequest.runtime_target, 'VCPToolBox native memory', item.toolName);
    assert.equal(result.normalizedBridgeRequest.runtime_target_reference_name, 'operator-vcp-toolbox-service-ref', item.toolName);
    assert.equal(result.normalizedBridgeRequest.runtime_target_kind, 'mcp_server', item.toolName);
    assert.equal(result.normalizedBridgeRequest.invocation_profile, item.profile, item.toolName);
    assert.equal(result.normalizedBridgeRequest.mcp_tool_name, item.toolName, item.toolName);
    assert.equal(result.normalizedBridgeRequest.read_allowed, item.readAllowed, item.toolName);
    assert.equal(result.normalizedBridgeRequest.write_allowed, item.writeAllowed, item.toolName);
    assert.equal(result.normalizedBridgeRequest.write_policy, item.writeAllowed ? 'exact_approval' : null, item.toolName);
    assert.equal(result.normalizedBridgeRequest.rollback_posture, item.rollbackPosture, item.toolName);
    assert.equal(result.normalizedBridgeRequest.audit_receipt_required, true, item.toolName);
    assert.equal(result.normalizedBridgeRequest.audit_receipt_low_disclosure, true, item.toolName);
    assert.equal(result.normalizedBridgeRequest.raw_output_allowed, false, item.toolName);
    assert.deepEqual(result.normalizedBridgeRequest.scope, scope, item.toolName);
    if (item.writeAllowed) {
      assert.equal(result.normalizedBridgeRequest.exact_approval_action, item.exactApprovalAction, item.toolName);
      assert.equal(result.normalizedBridgeRequest.exact_approval_action_matched, true, item.toolName);
      assert.equal(result.normalizedBridgeRequest.exact_approval_scope_matched, true, item.toolName);
      assert.equal(result.normalizedBridgeRequest.exact_approval_runtime_target_matched, true, item.toolName);
      assert.equal(result.normalizedBridgeRequest.exact_approval_rollback_plan_matched, true, item.toolName);
      assert.equal(result.normalizedBridgeRequest.rollback_plan_reference_present, true, item.toolName);
      assert.equal(result.normalizedBridgeRequest.rollback_plan_reference_safe, true, item.toolName);
    } else {
      assert.equal(result.normalizedBridgeRequest.exact_approval_action, null, item.toolName);
      assert.equal(result.normalizedBridgeRequest.rollback_plan_reference_present, false, item.toolName);
    }
  }
});

test('projection does not let tool arguments authorize governed bridge scope', () => {
  const input = buildGovernedMcpVcpNativeBridgeGateInput({
    toolName: 'search_memory',
    args: {
      query: 'needle',
      scope: {
        project_id: 'attacker-project',
        scope_id: 'attacker-scope',
        workspace_id: 'attacker-workspace',
        client_id: 'codex',
        visibility: 'private'
      },
      project_id: 'attacker-project',
      scope_id: 'attacker-scope',
      workspace_id: 'attacker-workspace',
      client_id: 'codex',
      visibility: 'private'
    },
    requestContext: codexContext({
      executionContext: {
        scopeId: 'scope-alpha'
      }
    }),
    config: {
      allowedAgentAlias: 'Codex',
      defaultProjectId: 'codex-memory',
      defaultWorkspaceId: 'workspace-alpha',
      governedMcpVcpNativeRuntimeTarget: {
        accepted: true,
        sourceAuthority: 'bridge_runtime_or_static_config',
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        targetKind: 'mcp_server'
      }
    }
  });
  const result = validateGovernedMcpVcpNativeBridgeGate(input);
  const serialized = JSON.stringify(input) + JSON.stringify(result);

  assert.equal(result.accepted, true);
  assert.deepEqual(result.normalizedBridgeRequest.scope, {
    scope_id: 'scope-alpha',
    project_id: 'codex-memory',
    workspace_id: 'workspace-alpha',
    client_id: 'Codex',
    visibility: 'private'
  });
  assert.equal(result.normalizedBridgeRequest.trusted_execution_context_scope_matched, true);
  assert.equal(serialized.includes('attacker-project'), false);
  assert.equal(serialized.includes('attacker-scope'), false);
  assert.equal(serialized.includes('attacker-workspace'), false);
});

test('projection does not let tool arguments authorize governed output disclosure budget', () => {
  const input = buildGovernedMcpVcpNativeBridgeGateInput({
    toolName: 'search_memory',
    args: {
      query: 'needle',
      include_content: true,
      includeContent: true,
      limit: 99,
      raw_output: true,
      outputDisclosureBudget: {
        level: 'structured',
        rawOutput: true,
        maxItems: 99
      }
    },
    requestContext: codexContext(),
    config: {
      allowedAgentAlias: 'Codex',
      governedMcpVcpNativeRuntimeTarget: {
        accepted: true,
        sourceAuthority: 'bridge_runtime_or_static_config',
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        targetKind: 'mcp_server'
      }
    }
  });
  const result = validateGovernedMcpVcpNativeBridgeGate(input);

  assert.equal(input.bridge_request.output_disclosure_budget.level, 'summary');
  assert.equal(input.bridge_request.output_disclosure_budget.low_disclosure, true);
  assert.equal(input.bridge_request.output_disclosure_budget.raw_output, false);
  assert.equal(input.bridge_request.output_disclosure_budget.max_items, 5);
  assert.equal(input.bridge_request.output_disclosure_budget.max_bytes, 4096);
  assert.equal(result.accepted, true);
  assert.equal(result.normalizedBridgeRequest.raw_output_allowed, false);
  assert.equal(result.normalizedBridgeRequest.disclosure_level, 'summary');
  assert.equal(result.normalizedBridgeRequest.disclosure_max_items, 5);
});

test('audit_memory exposes governed native bridge audit receipts as bounded governance findings', async () => {
  const rawPrivateValues = [
    'RAW_SCOPE_PROJECT_SHOULD_NOT_LEAK',
    'PRIVATE_NATIVE_ENDPOINT_SHOULD_NOT_LEAK',
    'PRIVATE_NATIVE_TOKEN_SHOULD_NOT_LEAK',
    'RAW_NATIVE_REQUEST_SHOULD_NOT_LEAK',
    'RAW_NATIVE_RESPONSE_SHOULD_NOT_LEAK',
    'RAW_MEMORY_CONTENT_SHOULD_NOT_LEAK'
  ];

  await withTempApp({}, async app => {
    await app.stores.auditLogStore.appendWriteAudit({
      eventType: 'governed_mcp_vcp_native_bridge_receipt',
      toolName: 'record_memory',
      delegationDirection: 'write',
      clientId: 'Codex',
      visibility: 'private',
      scopePresent: true,
      scopeIdentifierPresent: true,
      scopeFingerprint: 'b'.repeat(64),
      scopeFieldNames: ['project_id', 'workspace_id', 'client_id', 'visibility'],
      scopeIdentifierFieldNames: ['project_id', 'workspace_id'],
      rawScopePersisted: false,
      primaryRuntime: 'VCPToolBox native memory',
      clientIdentitySource: 'trusted_execution_context_or_transport',
      clientIdentityBound: true,
      scopeBoundarySource: 'trusted_execution_context_or_transport',
      scopeBoundaryBound: true,
      visibilityBound: true,
      trustedExecutionContextSupplied: true,
      trustedExecutionContextAccepted: true,
      trustedExecutionContextScopeMatched: true,
      invocationProfile: 'governed_bounded_write',
      invocationProfileSource: 'bridge_tool_binding',
      invocationProfileBound: true,
      readAllowed: false,
      writeAllowed: true,
      writePolicy: 'exact_approval',
      writeRequiresExactApproval: true,
      readWriteAuthoritySource: 'bridge_tool_binding',
      readWriteAuthorityBound: true,
      exactApprovalAction: 'live_bridge_record_memory_proof',
      exactApprovalActionMatched: true,
      exactApprovalScopeMatched: true,
      exactApprovalRuntimeTargetMatched: true,
      exactApprovalRollbackPlanMatched: true,
      exactApprovalScopeReferencesSafe: true,
      exactApprovalScopeVisibilityAccepted: true,
      exactApprovalRuntimeTargetReferenceSafe: true,
      exactApprovalRuntimeTargetKindAccepted: true,
      exactApprovalRuntimeTargetPrimaryRuntimeAccepted: true,
      exactApprovalRollbackPlanReferencePresent: true,
      exactApprovalRollbackPlanReferenceSafe: true,
      exactApprovalForbiddenFieldCount: 0,
      runtimeTargetKind: 'mcp_server',
      runtimeTargetSourceAuthority: 'bridge_runtime_or_static_config',
      runtimeTargetBound: true,
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      disclosureLevel: 'summary',
      outputDisclosureBudgetSource: 'bridge_gate_normalized_governance',
      outputDisclosureBudgetBound: true,
      disclosureMaxItems: 5,
      disclosureMaxBytes: 4096,
      disclosureForbiddenFieldCount: 0,
      rawOutputAllowed: false,
      auditReceiptRequired: true,
      auditReceiptSource: 'bridge_gate_normalized_governance',
      auditReceiptLowDisclosure: true,
      auditReceiptLowDisclosureBound: true,
      bridgeReceiptLowDisclosure: true,
      localMemoryRole: 'not_used',
      auditReceiptReferenceName: 'governed-mcp-record_memory-receipt',
      auditReceiptReferencePresent: true,
      auditReceiptReferenceSafe: true,
      auditReceiptForbiddenFieldCount: 0,
      rollbackPosture: 'bounded_rollback_plan',
      rollbackPostureSource: 'bridge_gate_normalized_governance',
      rollbackPostureForbiddenFieldCount: 0,
      rollbackPlanReferencePresent: true,
      rollbackPlanReferenceSafe: true,
      rollbackWritePostureBound: true,
      rollbackPostureBound: true,
      rollbackPlanBound: true,
      rollbackPlanShapeOnly: true,
      rollbackRequired: false,
      rollbackDisposition: 'no_rollback_required',
      rollbackFollowupRequired: false,
      rollbackApplyPolicy: 'not_applicable',
      rollbackApplyAttempted: false,
      rollbackAutoApplyAllowed: false,
      rollbackRawPlanDisclosed: false,
      rollbackRawPlanPersisted: false,
      transportCategory: 'local_http_transport',
      mcpMethod: 'tools/call',
      nativeInvocationToolName: 'record_memory',
      nativeInvocationStatusClass: 'success',
      nativeInvocationHttpStatusClass: 'success',
      nativeInvocationResponseShapeCategory: 'object_top_level_kind_only_no_field_names',
      nativeInvocationAttempted: true,
      nativeMcpToolInvocationAttempted: true,
      nativeInvocationReceiptBindingMatched: true,
      nativeInvocationGovernanceMetadataPath: 'params._meta.codexMemoryGovernance',
      nativeInvocationGovernanceMetadataSent: true,
      nativeInvocationGovernanceMetadataRawValueDisclosed: false,
      nativeInvocationRequestIdCategory: 'generated_bridge_request_id',
      nativeInvocationJsonRpcResponseIdMatched: true,
      nativeInvocationJsonRpcErrorPresent: false,
      nativeInvocationJsonRpcErrorReasonCode: null,
      memoryReadPerformed: false,
      memoryWritePerformed: true,
      rawRequestBodyPersisted: false,
      rawResponseBodyPersisted: false,
      project_id: rawPrivateValues[0],
      endpoint: rawPrivateValues[1],
      bearerToken: rawPrivateValues[2],
      rawRequestBody: rawPrivateValues[3],
      rawResponseBody: rawPrivateValues[4],
      content: rawPrivateValues[5]
    });

    const report = await app.callTool('audit_memory', {
      audit_family: 'governance',
      window: 5,
      include_raw: false
    }, codexContext());
    const bridgeFinding = report.findings.find(finding =>
      finding.reasonCode === 'governed_native_bridge_audit_receipt'
    );
    const receipt = bridgeFinding.governedNativeBridgeReceipt;
    const serializedReport = JSON.stringify(report);

    assert.equal(report.status, 'AUDIT_MEMORY_READONLY_BOUNDED_ACCEPTED_NOT_PUBLIC');
    assert.equal(report.access.rawAuditReturned, false);
    assert.equal(report.access.rawMemoryReturned, false);
    assert.equal(report.policy.governedNativeBridgeAuditReceiptProjection, true);
    assert.equal(report.policy.rawAuditScanPerformed, false);
    assert.equal(bridgeFinding.auditFamily, 'governance');
    assert.equal(bridgeFinding.decision, 'visible');
    assert.equal(receipt.clientId, 'Codex');
    assert.equal(receipt.visibility, 'private');
    assert.equal(receipt.scopeFingerprintPresent, true);
    assert.deepEqual(receipt.scopeIdentifierFieldNames, ['project_id', 'workspace_id']);
    assert.equal(receipt.rawScopePersisted, false);
    assert.equal(receipt.invocationProfile, 'governed_bounded_write');
    assert.equal(receipt.writeAllowed, true);
    assert.equal(receipt.writePolicy, 'exact_approval');
    assert.equal(receipt.targetReferenceName, 'operator-vcp-toolbox-service-ref');
    assert.equal(receipt.auditReceiptReferenceName, 'governed-mcp-record_memory-receipt');
    assert.equal(receipt.rollbackPlanBound, true);
    assert.equal(receipt.nativeInvocationAttempted, true);
    assert.equal(receipt.nativeMcpToolInvocationAttempted, true);
    assert.equal(receipt.memoryWritePerformed, true);
    assert.equal(receipt.rawRequestBodyPersisted, false);
    assert.equal(receipt.rawResponseBodyPersisted, false);
    assert.equal(receipt.memoryContentDisclosed, false);
    assert.equal(receipt.tokenMaterialDisclosed, false);
    assert.equal(receipt.endpointDisclosed, false);
    assert.equal(receipt.readinessClaimed, false);
    for (const value of rawPrivateValues) {
      assert.equal(serializedReport.includes(value), false, value);
    }
  });
});

test('projection sanitizes unsafe config defaults before bridge gate input', () => {
  const input = buildGovernedMcpVcpNativeBridgeGateInput({
    toolName: 'search_memory',
    args: {
      query: 'needle'
    },
    requestContext: {
      executionContext: {
        agentAlias: 'Codex',
        clientId: 'codex'
      }
    },
    config: {
      allowedAgentAlias: 'Codex',
      defaultProjectId: 'https://PRIVATE_DEFAULT_PROJECT_SHOULD_NOT_ECHO',
      defaultWorkspaceId: 'file:///PRIVATE_DEFAULT_WORKSPACE_SHOULD_NOT_ECHO',
      defaultVisibility: 'https://PRIVATE_DEFAULT_VISIBILITY_SHOULD_NOT_ECHO',
      governedMcpVcpNativeRuntimeTarget: {
        accepted: true,
        sourceAuthority: 'https://PRIVATE_SOURCE_AUTHORITY_SHOULD_NOT_ECHO',
        targetReferenceName: 'http://PRIVATE_RUNTIME_TARGET_SHOULD_NOT_ECHO',
        targetKind: 'PRIVATE_KIND_SHOULD_NOT_ECHO'
      }
    }
  });
  const result = validateGovernedMcpVcpNativeBridgeGate(input);
  const serialized = JSON.stringify({ input, result });

  assert.equal(result.accepted, false);
  assert.equal(input.bridge_request.scope.project_id, '');
  assert.equal(input.bridge_request.scope.workspace_id, '');
  assert.equal(input.bridge_request.scope.visibility, '');
  assert.equal(input.bridge_request.runtime_target.target_reference_name, null);
  assert.equal(input.bridge_request.runtime_target.target_kind, null);
  assert.equal(input.bridge_request.runtime_target.source_authority, null);
  assert.equal(input.trusted_execution_context.executionContext.projectId, undefined);
  assert.equal(input.trusted_execution_context.executionContext.workspaceId, undefined);
  assert.equal(input.trusted_execution_context.executionContext.visibility, undefined);
  assert.equal(serialized.includes('PRIVATE_DEFAULT_PROJECT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_DEFAULT_WORKSPACE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_DEFAULT_VISIBILITY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_RUNTIME_TARGET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_KIND_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_SOURCE_AUTHORITY_SHOULD_NOT_ECHO'), false);
});

test('projection sanitizes unsafe transport and config client ids before bridge gate input', () => {
  const privateStrings = [
    'https://PRIVATE_TRANSPORT_CLIENT_ID_SHOULD_NOT_ECHO',
    'file:///PRIVATE_DEFAULT_CLIENT_ID_SHOULD_NOT_ECHO'
  ];
  const input = buildGovernedMcpVcpNativeBridgeGateInput({
    toolName: 'search_memory',
    args: {
      query: 'needle'
    },
    requestContext: {
      executionContext: {
        agentAlias: 'Codex',
        clientId: privateStrings[0],
        projectId: 'codex-memory',
        workspaceId: 'workspace-alpha',
        visibility: 'private'
      }
    },
    config: {
      allowedAgentAlias: 'Codex',
      defaultClientId: privateStrings[1],
      governedMcpVcpNativeRuntimeTarget: {
        accepted: true,
        sourceAuthority: 'bridge_runtime_or_static_config',
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        targetKind: 'mcp_server'
      }
    }
  });
  const result = validateGovernedMcpVcpNativeBridgeGate(input);
  const serialized = JSON.stringify({ input, result });

  assert.equal(result.accepted, false);
  assert.equal(input.bridge_request.client_id, 'Codex');
  assert.equal(input.bridge_request.scope.client_id, 'invalid-client-id');
  assert.ok(result.blockers.includes('scope_client_id_must_match_client_id'));
  for (const privateString of privateStrings) {
    assert.equal(serialized.includes(privateString), false);
  }
});

test('projection sanitizes unsafe tool name before bridge gate input', () => {
  const privateToolName = 'https://PRIVATE_TOOL_NAME_SHOULD_NOT_ECHO';
  const input = buildGovernedMcpVcpNativeBridgeGateInput({
    toolName: privateToolName,
    args: {
      query: 'needle'
    },
    requestContext: codexContext(),
    config: {
      allowedAgentAlias: 'Codex',
      defaultProjectId: 'codex-memory',
      defaultWorkspaceId: 'workspace-alpha',
      governedMcpVcpNativeRuntimeTarget: {
        accepted: true,
        sourceAuthority: 'bridge_runtime_or_static_config',
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        targetKind: 'mcp_server'
      }
    }
  });
  const result = validateGovernedMcpVcpNativeBridgeGate(input);
  const serialized = JSON.stringify({ input, result });

  assert.equal(result.accepted, false);
  assert.equal(input.bridge_request.invocation_profile.tool_name, 'invalid-mcp-tool');
  assert.equal(input.bridge_request.output_disclosure_budget.tool_name, 'invalid-mcp-tool');
  assert.equal(input.bridge_request.audit_receipt.receipt_plan_id, 'governed-mcp-invalid-mcp-tool-receipt');
  assert.ok(result.blockers.includes('invocation_profile_must_be_governed_mcp_tool_profile'));
  assert.equal(serialized.includes('PRIVATE_TOOL_NAME_SHOULD_NOT_ECHO'), false);
});

test('projection sanitizes unsafe direct governance context before bridge gate input', () => {
  const privateStrings = [
    'https://PRIVATE_DISCLOSURE_LEVEL_SHOULD_NOT_ECHO',
    'https://PRIVATE_DISCLOSURE_LOW_SHOULD_NOT_ECHO',
    'https://PRIVATE_DISCLOSURE_RAW_SHOULD_NOT_ECHO',
    'https://PRIVATE_DISCLOSURE_ITEMS_SHOULD_NOT_ECHO',
    'https://PRIVATE_AUDIT_RECEIPT_SHOULD_NOT_ECHO',
    'https://PRIVATE_ROLLBACK_MODE_SHOULD_NOT_ECHO',
    'https://PRIVATE_ROLLBACK_PLAN_SHOULD_NOT_ECHO',
    'https://PRIVATE_APPROVAL_ACTION_SHOULD_NOT_ECHO',
    'https://PRIVATE_APPROVAL_PROJECT_SHOULD_NOT_ECHO',
    'https://PRIVATE_APPROVAL_WORKSPACE_SHOULD_NOT_ECHO',
    'https://PRIVATE_APPROVAL_CLIENT_SHOULD_NOT_ECHO',
    'https://PRIVATE_APPROVAL_VISIBILITY_SHOULD_NOT_ECHO',
    'https://PRIVATE_APPROVAL_RUNTIME_REF_SHOULD_NOT_ECHO',
    'https://PRIVATE_APPROVAL_RUNTIME_KIND_SHOULD_NOT_ECHO',
    'https://PRIVATE_APPROVAL_PRIMARY_RUNTIME_SHOULD_NOT_ECHO',
    'https://PRIVATE_APPROVAL_ROLLBACK_REF_SHOULD_NOT_ECHO'
  ];
  const input = buildGovernedMcpVcpNativeBridgeGateInput({
    toolName: 'record_memory',
    args: {
      target: 'knowledge',
      title: 'Governed write',
      content: 'write body'
    },
    requestContext: {
      executionContext: {
        agentAlias: 'Codex',
        clientId: 'codex',
        projectId: 'codex-memory',
        workspaceId: 'workspace-alpha',
        visibility: 'private'
      },
      outputDisclosureBudget: {
        level: privateStrings[0],
        lowDisclosure: privateStrings[1],
        rawOutput: privateStrings[2],
        maxItems: privateStrings[3],
        maxBytes: 4096
      },
      auditReceipt: {
        receipt_id: privateStrings[4]
      },
      rollbackPosture: {
        mode: privateStrings[5],
        rollback_plan_ref: privateStrings[6]
      },
      exactApprovalResult: {
        accepted: true,
        allowedAction: privateStrings[7],
        allowedScope: {
          project_id: privateStrings[8],
          workspace_id: privateStrings[9],
          client_id: privateStrings[10],
          visibility: privateStrings[11]
        },
        runtimeTarget: {
          targetReferenceName: privateStrings[12],
          targetKind: privateStrings[13],
          primaryRuntime: privateStrings[14]
        },
        rollbackPlanRef: privateStrings[15]
      }
    },
    config: {
      allowedAgentAlias: 'Codex',
      governedMcpVcpNativeRuntimeTarget: {
        accepted: true,
        sourceAuthority: 'bridge_runtime_or_static_config',
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        targetKind: 'mcp_server'
      }
    }
  });
  const result = validateGovernedMcpVcpNativeBridgeGate(input);
  const serialized = JSON.stringify({ input, result });

  assert.equal(result.accepted, false);
  assert.equal(input.bridge_request.output_disclosure_budget.level, 'invalid_disclosure_level');
  assert.equal(input.bridge_request.output_disclosure_budget.low_disclosure, false);
  assert.equal(input.bridge_request.output_disclosure_budget.raw_output, true);
  assert.equal(input.bridge_request.output_disclosure_budget.max_items, 6);
  assert.equal(input.bridge_request.audit_receipt.receipt_plan_id, '');
  assert.equal(input.bridge_request.rollback_posture.mode, 'invalid_rollback_posture');
  assert.equal(input.bridge_request.rollback_posture.rollback_plan_ref, '');
  assert.equal(input.exact_approval_result.allowedAction, 'invalid_exact_approval_action');
  assert.deepEqual(input.exact_approval_result.allowedScope, {});
  assert.deepEqual(input.exact_approval_result.runtimeTarget, {
    primaryRuntime: 'invalid_primary_runtime'
  });
  assert.equal(input.exact_approval_result.rollbackPlanRef, '');
  for (const privateString of privateStrings) {
    assert.equal(serialized.includes(privateString), false);
  }
});

test('projection rejects direct governance context with locator or secret key variants', () => {
  const privateStrings = [
    'DIRECT_DISCLOSURE_TOKEN_SHOULD_NOT_ECHO',
    'DIRECT_AUDIT_AUTH_SHOULD_NOT_ECHO',
    'DIRECT_ROLLBACK_ENDPOINT_SHOULD_NOT_ECHO',
    'DIRECT_APPROVAL_SECRET_SHOULD_NOT_ECHO',
    'DIRECT_APPROVAL_RUNTIME_ENDPOINT_SHOULD_NOT_ECHO',
    'DIRECT_TRUSTED_AUTH_SHOULD_NOT_ECHO'
  ];
  const input = buildGovernedMcpVcpNativeBridgeGateInput({
    toolName: 'record_memory',
    args: {
      target: 'knowledge',
      title: 'Governed write',
      content: 'write body'
    },
    requestContext: codexContext({
      requestContext: {
        outputDisclosureBudget: {
          level: 'metadata',
          lowDisclosure: true,
          rawOutput: false,
          maxItems: 2,
          maxBytes: 512,
          token: privateStrings[0]
        },
        auditReceipt: {
          receipt_id: 'cm-governed-write-receipt',
          authorizationHeader: privateStrings[1]
        },
        rollbackPosture: {
          mode: 'bounded_rollback_plan',
          rollback_plan_ref: 'cm-governed-write-rollback-plan',
          endpointUrl: privateStrings[2]
        },
        exactApprovalResult: exactWriteApprovalResult({
          approvalSecret: privateStrings[3],
          runtimeTarget: {
            targetReferenceName: 'operator-vcp-toolbox-service-ref',
            targetKind: 'mcp_server',
            primaryRuntime: 'VCPToolBox native memory',
            endpointUrl: privateStrings[4]
          }
        }),
        trustedExecutionContext: {
          accepted: true,
          executionContext: {
            agentAlias: 'Codex',
            projectId: 'codex-memory',
            workspaceId: 'workspace-alpha',
            visibility: 'private',
            authorizationHeader: privateStrings[5]
          }
        }
      }
    }),
    config: {
      allowedAgentAlias: 'Codex',
      governedMcpVcpNativeRuntimeTarget: {
        accepted: true,
        sourceAuthority: 'bridge_runtime_or_static_config',
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        targetKind: 'mcp_server'
      }
    }
  });
  const result = validateGovernedMcpVcpNativeBridgeGate(input);
  const serialized = JSON.stringify({ input, result });

  assert.equal(result.accepted, false);
  assert.equal(input.bridge_request.output_disclosure_budget.level, 'invalid_disclosure_level');
  assert.equal(input.bridge_request.output_disclosure_budget.low_disclosure, false);
  assert.equal(input.bridge_request.output_disclosure_budget.raw_output, true);
  assert.equal(input.bridge_request.output_disclosure_budget.max_items, 6);
  assert.equal(input.bridge_request.output_disclosure_budget.max_bytes, 4097);
  assert.equal(input.bridge_request.audit_receipt.receipt_plan_id, '');
  assert.equal(input.bridge_request.rollback_posture.mode, 'invalid_rollback_posture');
  assert.equal(input.bridge_request.rollback_posture.rollback_plan_ref, '');
  assert.equal(input.exact_approval_result.accepted, false);
  assert.equal(input.exact_approval_result.allowedAction, 'invalid_exact_approval_action');
  assert.deepEqual(input.exact_approval_result.allowedScope, {});
  assert.deepEqual(input.exact_approval_result.runtimeTarget, {});
  assert.equal(input.trusted_execution_context.accepted, false);
  assert.deepEqual(input.trusted_execution_context.executionContext, {});
  assert.ok(result.blockers.includes('output_disclosure_budget_must_be_low_disclosure_and_bounded'));
  assert.ok(result.blockers.includes('audit_receipt_must_be_required_low_disclosure_and_referenced'));
  assert.ok(result.blockers.includes('rollback_posture_must_match_read_write_authority'));
  assert.ok(result.blockers.includes('write_authority_requires_accepted_exact_approval'));
  assert.ok(result.blockers.includes('trusted_execution_context_must_be_accepted_when_supplied'));
  for (const privateString of privateStrings) {
    assert.equal(serialized.includes(privateString), false);
  }
});

test('projection rejects malformed direct output disclosure budget instead of using defaults', () => {
  const privateBudget = 'https://PRIVATE_DIRECT_DISCLOSURE_BUDGET_SHOULD_NOT_ECHO';
  const input = buildGovernedMcpVcpNativeBridgeGateInput({
    toolName: 'search_memory',
    args: {
      query: 'needle',
      limit: 1
    },
    requestContext: codexContext({
      requestContext: {
        outputDisclosureBudget: privateBudget
      }
    }),
    config: {
      allowedAgentAlias: 'Codex',
      governedMcpVcpNativeRuntimeTarget: {
        accepted: true,
        sourceAuthority: 'bridge_runtime_or_static_config',
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        targetKind: 'mcp_server'
      }
    }
  });
  const result = validateGovernedMcpVcpNativeBridgeGate(input);
  const serialized = JSON.stringify({ input, result });

  assert.equal(input.bridge_request.output_disclosure_budget.level, 'invalid_disclosure_level');
  assert.equal(input.bridge_request.output_disclosure_budget.low_disclosure, false);
  assert.equal(input.bridge_request.output_disclosure_budget.raw_output, true);
  assert.equal(input.bridge_request.output_disclosure_budget.max_items, 6);
  assert.equal(input.bridge_request.output_disclosure_budget.max_bytes, 4097);
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('output_disclosure_budget_must_be_low_disclosure_and_bounded'));
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(serialized.includes('PRIVATE_DIRECT_DISCLOSURE_BUDGET_SHOULD_NOT_ECHO'), false);
});

test('projection rejects malformed direct audit receipt instead of using default receipt', () => {
  const privateReceipt = 'https://PRIVATE_DIRECT_AUDIT_RECEIPT_SHOULD_NOT_ECHO';
  const input = buildGovernedMcpVcpNativeBridgeGateInput({
    toolName: 'search_memory',
    args: {
      query: 'needle'
    },
    requestContext: codexContext({
      requestContext: {
        auditReceipt: privateReceipt
      }
    }),
    config: {
      allowedAgentAlias: 'Codex',
      governedMcpVcpNativeRuntimeTarget: {
        accepted: true,
        sourceAuthority: 'bridge_runtime_or_static_config',
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        targetKind: 'mcp_server'
      }
    }
  });
  const result = validateGovernedMcpVcpNativeBridgeGate(input);
  const serialized = JSON.stringify({ input, result });

  assert.equal(input.bridge_request.audit_receipt.required, true);
  assert.equal(input.bridge_request.audit_receipt.low_disclosure, true);
  assert.equal(input.bridge_request.audit_receipt.receipt_plan_id, '');
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('audit_receipt_must_be_required_low_disclosure_and_referenced'));
  assert.equal(result.normalizedBridgeRequest.audit_receipt_reference_present, false);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(serialized.includes('governed-mcp-search_memory-receipt'), false);
  assert.equal(serialized.includes('PRIVATE_DIRECT_AUDIT_RECEIPT_SHOULD_NOT_ECHO'), false);
});

test('projection rejects malformed direct rollback posture instead of using default posture', () => {
  const privatePosture = 'https://PRIVATE_DIRECT_ROLLBACK_POSTURE_SHOULD_NOT_ECHO';
  const input = buildGovernedMcpVcpNativeBridgeGateInput({
    toolName: 'search_memory',
    args: {
      query: 'needle'
    },
    requestContext: codexContext({
      requestContext: {
        rollbackPosture: privatePosture
      }
    }),
    config: {
      allowedAgentAlias: 'Codex',
      governedMcpVcpNativeRuntimeTarget: {
        accepted: true,
        sourceAuthority: 'bridge_runtime_or_static_config',
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        targetKind: 'mcp_server'
      }
    }
  });
  const result = validateGovernedMcpVcpNativeBridgeGate(input);
  const serialized = JSON.stringify({ input, result });

  assert.equal(input.bridge_request.rollback_posture.mode, 'invalid_rollback_posture');
  assert.equal(input.bridge_request.rollback_posture.rollback_plan_ref, '');
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('rollback_posture_must_match_read_write_authority'));
  assert.equal(result.normalizedBridgeRequest.rollback_posture, null);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(serialized.includes('no_runtime_state_to_rollback'), false);
  assert.equal(serialized.includes('PRIVATE_DIRECT_ROLLBACK_POSTURE_SHOULD_NOT_ECHO'), false);
});

test('projection rejects malformed supplied trusted context instead of binding transport context', () => {
  const privateTrustedContext = 'https://PRIVATE_DIRECT_TRUSTED_CONTEXT_SHOULD_NOT_ECHO';
  const input = buildGovernedMcpVcpNativeBridgeGateInput({
    toolName: 'search_memory',
    args: {
      query: 'needle'
    },
    requestContext: codexContext({
      requestContext: {
        trustedExecutionContext: privateTrustedContext
      }
    }),
    config: {
      allowedAgentAlias: 'Codex',
      governedMcpVcpNativeRuntimeTarget: {
        accepted: true,
        sourceAuthority: 'bridge_runtime_or_static_config',
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        targetKind: 'mcp_server'
      }
    }
  });
  const result = validateGovernedMcpVcpNativeBridgeGate(input);
  const serialized = JSON.stringify({ input, result });

  assert.equal(input.trusted_execution_context.accepted, false);
  assert.deepEqual(input.trusted_execution_context.executionContext, {});
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('trusted_execution_context_must_be_accepted_when_supplied'));
  assert.ok(result.blockers.includes('trusted_execution_context_agent_alias_must_match_client_id'));
  assert.equal(result.normalizedBridgeRequest.trusted_execution_context_supplied, true);
  assert.equal(result.normalizedBridgeRequest.trusted_execution_context_accepted, false);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(serialized.includes('PRIVATE_DIRECT_TRUSTED_CONTEXT_SHOULD_NOT_ECHO'), false);
});

test('projection rejects malformed exact approval runtime target without echoing supplied value', () => {
  const privateRuntimeTarget = 'https://PRIVATE_MALFORMED_APPROVAL_RUNTIME_TARGET_SHOULD_NOT_ECHO';
  const input = buildGovernedMcpVcpNativeBridgeGateInput({
    toolName: 'record_memory',
    args: {
      target: 'knowledge',
      title: 'Governed write',
      content: 'write body'
    },
    requestContext: codexContext({
      requestContext: {
        rollbackPosture: {
          mode: 'bounded_rollback_plan',
          rollback_plan_ref: 'cm-governed-write-rollback-plan'
        },
        exactApprovalResult: exactWriteApprovalResult({
          runtimeTarget: privateRuntimeTarget
        })
      }
    }),
    config: {
      allowedAgentAlias: 'Codex',
      governedMcpVcpNativeRuntimeTarget: {
        accepted: true,
        sourceAuthority: 'bridge_runtime_or_static_config',
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        targetKind: 'mcp_server'
      }
    }
  });
  const result = validateGovernedMcpVcpNativeBridgeGate(input);
  const serialized = JSON.stringify({ input, result });

  assert.equal(input.exact_approval_result.accepted, false);
  assert.deepEqual(input.exact_approval_result.runtimeTarget, {
    primaryRuntime: 'invalid_primary_runtime'
  });
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('write_authority_requires_accepted_exact_approval'));
  assert.ok(result.blockers.includes('write_authority_exact_approval_runtime_target_must_match_bridge_target'));
  assert.equal(result.normalizedBridgeRequest.exact_approval_runtime_target_matched, false);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(serialized.includes('PRIVATE_MALFORMED_APPROVAL_RUNTIME_TARGET_SHOULD_NOT_ECHO'), false);
});

test('projection rejects malformed exact approval scope without echoing supplied value', () => {
  const privateScope = 'https://PRIVATE_MALFORMED_APPROVAL_SCOPE_SHOULD_NOT_ECHO';
  const input = buildGovernedMcpVcpNativeBridgeGateInput({
    toolName: 'record_memory',
    args: {
      target: 'knowledge',
      title: 'Governed write',
      content: 'write body'
    },
    requestContext: codexContext({
      requestContext: {
        rollbackPosture: {
          mode: 'bounded_rollback_plan',
          rollback_plan_ref: 'cm-governed-write-rollback-plan'
        },
        exactApprovalResult: exactWriteApprovalResult({
          allowedScope: privateScope
        })
      }
    }),
    config: {
      allowedAgentAlias: 'Codex',
      governedMcpVcpNativeRuntimeTarget: {
        accepted: true,
        sourceAuthority: 'bridge_runtime_or_static_config',
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        targetKind: 'mcp_server'
      }
    }
  });
  const result = validateGovernedMcpVcpNativeBridgeGate(input);
  const serialized = JSON.stringify({ input, result });

  assert.equal(input.exact_approval_result.accepted, false);
  assert.deepEqual(input.exact_approval_result.allowedScope, {});
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('write_authority_requires_accepted_exact_approval'));
  assert.ok(result.blockers.includes('write_authority_exact_approval_scope_must_match_bridge_scope'));
  assert.equal(result.normalizedBridgeRequest.exact_approval_scope_matched, false);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(serialized.includes('PRIVATE_MALFORMED_APPROVAL_SCOPE_SHOULD_NOT_ECHO'), false);
});

test('projection rejects malformed exact approval rollback plan without echoing supplied value', () => {
  const input = buildGovernedMcpVcpNativeBridgeGateInput({
    toolName: 'record_memory',
    args: {
      target: 'knowledge',
      title: 'Governed write',
      content: 'write body'
    },
    requestContext: codexContext({
      requestContext: {
        rollbackPosture: {
          mode: 'bounded_rollback_plan',
          rollback_plan_ref: 'cm-governed-write-rollback-plan'
        },
        exactApprovalResult: exactWriteApprovalResult({
          rollbackPlanRef: ['PRIVATE_MALFORMED_APPROVAL_ROLLBACK_PLAN_SHOULD_NOT_ECHO']
        })
      }
    }),
    config: {
      allowedAgentAlias: 'Codex',
      governedMcpVcpNativeRuntimeTarget: {
        accepted: true,
        sourceAuthority: 'bridge_runtime_or_static_config',
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        targetKind: 'mcp_server'
      }
    }
  });
  const result = validateGovernedMcpVcpNativeBridgeGate(input);
  const serialized = JSON.stringify({ input, result });

  assert.equal(input.exact_approval_result.accepted, false);
  assert.equal(input.exact_approval_result.rollbackPlanRef, undefined);
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('write_authority_requires_accepted_exact_approval'));
  assert.ok(result.blockers.includes(
    'write_authority_exact_approval_rollback_plan_must_match_bridge_rollback_posture'
  ));
  assert.equal(result.normalizedBridgeRequest.exact_approval_rollback_plan_matched, false);
  assert.equal(result.normalizedBridgeRequest.exact_approval_rollback_plan_reference_present, false);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(serialized.includes('PRIVATE_MALFORMED_APPROVAL_ROLLBACK_PLAN_SHOULD_NOT_ECHO'), false);
});

test('projection sanitizes unsafe supplied trusted context before bridge gate input', () => {
  const privateStrings = [
    'https://PRIVATE_TRUSTED_AGENT_SHOULD_NOT_ECHO',
    'https://PRIVATE_TRUSTED_PROJECT_SHOULD_NOT_ECHO',
    'file:///PRIVATE_TRUSTED_WORKSPACE_SHOULD_NOT_ECHO',
    'https://PRIVATE_TRUSTED_VISIBILITY_SHOULD_NOT_ECHO',
    'https://PRIVATE_TRUSTED_EXTRA_FIELD_SHOULD_NOT_ECHO'
  ];
  const input = buildGovernedMcpVcpNativeBridgeGateInput({
    toolName: 'search_memory',
    args: {
      query: 'needle'
    },
    requestContext: {
      executionContext: {
        agentAlias: 'Codex',
        clientId: 'codex',
        projectId: 'codex-memory',
        workspaceId: 'workspace-alpha',
        visibility: 'private'
      },
      trustedExecutionContext: {
        accepted: true,
        private_extra: privateStrings[4],
        executionContext: {
          agentAlias: privateStrings[0],
          projectId: privateStrings[1],
          workspaceId: privateStrings[2],
          visibility: privateStrings[3]
        }
      }
    },
    config: {
      allowedAgentAlias: 'Codex',
      governedMcpVcpNativeRuntimeTarget: {
        accepted: true,
        sourceAuthority: 'bridge_runtime_or_static_config',
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        targetKind: 'mcp_server'
      }
    }
  });
  const result = validateGovernedMcpVcpNativeBridgeGate(input);
  const serialized = JSON.stringify({ input, result });

  assert.equal(result.accepted, false);
  assert.deepEqual(input.trusted_execution_context.executionContext, {
    agentAlias: 'invalid-trusted-agent',
    clientId: 'Codex',
    projectId: 'invalid-trusted-project',
    workspaceId: 'invalid-trusted-workspace',
    visibility: 'invalid_visibility'
  });
  assert.equal(input.trusted_execution_context.private_extra, undefined);
  assert.ok(result.blockers.includes('trusted_execution_context_agent_alias_must_match_client_id'));
  assert.ok(result.blockers.includes('trusted_execution_context_visibility_must_be_private_project_or_workspace'));
  assert.ok(result.blockers.includes('scope_must_match_trusted_execution_context'));
  for (const privateString of privateStrings) {
    assert.equal(serialized.includes(privateString), false);
  }
});

test('projection rejects trusted context client identity drift before gate invocation', () => {
  const rawTrustedClient = 'claude-private-client-should-not-echo';
  const input = buildGovernedMcpVcpNativeBridgeGateInput({
    toolName: 'search_memory',
    args: {
      query: 'needle'
    },
    requestContext: {
      executionContext: {
        agentAlias: 'Codex',
        clientId: 'codex',
        projectId: 'codex-memory',
        workspaceId: 'workspace-alpha',
        visibility: 'private'
      },
      trustedExecutionContext: {
        accepted: true,
        executionContext: {
          agentAlias: 'Codex',
          clientId: rawTrustedClient
        }
      }
    },
    config: {
      allowedAgentAlias: 'Codex',
      governedMcpVcpNativeRuntimeTarget: {
        accepted: true,
        sourceAuthority: 'bridge_runtime_or_static_config',
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        targetKind: 'mcp_server'
      }
    }
  });
  const result = validateGovernedMcpVcpNativeBridgeGate(input);
  const serialized = JSON.stringify({ input, result });

  assert.equal(result.accepted, false);
  assert.equal(input.trusted_execution_context.executionContext.agentAlias, 'Codex');
  assert.equal(input.trusted_execution_context.executionContext.clientId, 'invalid-trusted-client');
  assert.ok(result.blockers.includes('scope_must_match_trusted_execution_context'));
  assert.equal(result.normalizedBridgeRequest.trusted_execution_context_scope_matched, false);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.mcpToolCalled, false);
  assert.equal(serialized.includes(rawTrustedClient), false);
});

test('projection binds sparse supplied trusted context to execution scope before gate', () => {
  const input = buildGovernedMcpVcpNativeBridgeGateInput({
    toolName: 'search_memory',
    args: {
      query: 'needle'
    },
    requestContext: {
      executionContext: {
        agentAlias: 'Codex',
        clientId: 'codex',
        projectId: 'codex-memory',
        workspaceId: 'workspace-alpha',
        visibility: 'private'
      },
      trustedExecutionContext: {
        accepted: true,
        executionContext: {
          agentAlias: 'Codex'
        }
      }
    },
    config: {
      allowedAgentAlias: 'Codex',
      defaultProjectId: 'other-project',
      defaultWorkspaceId: 'other-workspace',
      defaultVisibility: 'workspace',
      governedMcpVcpNativeRuntimeTarget: {
        accepted: true,
        sourceAuthority: 'bridge_runtime_or_static_config',
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        targetKind: 'mcp_server'
      }
    }
  });
  const result = validateGovernedMcpVcpNativeBridgeGate(input);
  const serialized = JSON.stringify(input) + JSON.stringify(result);

  assert.equal(result.accepted, true);
  assert.deepEqual(input.trusted_execution_context.executionContext, {
    agentAlias: 'Codex',
    clientId: 'Codex',
    projectId: 'codex-memory',
    workspaceId: 'workspace-alpha',
    visibility: 'private'
  });
  assert.deepEqual(result.normalizedBridgeRequest.scope, {
    project_id: 'codex-memory',
    workspace_id: 'workspace-alpha',
    client_id: 'Codex',
    visibility: 'private'
  });
  assert.equal(result.normalizedBridgeRequest.trusted_execution_context_scope_matched, true);
  assert.equal(serialized.includes('other-project'), false);
  assert.equal(serialized.includes('other-workspace'), false);
});

test('projection rejects args-only scope when no transport or configured scope exists', () => {
  const input = buildGovernedMcpVcpNativeBridgeGateInput({
    toolName: 'search_memory',
    args: {
      query: 'needle',
      scope: {
        project_id: 'args-only-project',
        workspace_id: 'args-only-workspace',
        client_id: 'Codex',
        visibility: 'private'
      }
    },
    requestContext: {
      executionContext: {
        agentAlias: 'Codex',
        clientId: 'codex'
      }
    },
    config: {
      allowedAgentAlias: 'Codex',
      governedMcpVcpNativeRuntimeTarget: {
        accepted: true,
        sourceAuthority: 'bridge_runtime_or_static_config',
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        targetKind: 'mcp_server'
      }
    }
  });
  const result = validateGovernedMcpVcpNativeBridgeGate(input);
  const serialized = JSON.stringify(input) + JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('scope_identifier_required'));
  assert.equal(result.normalizedBridgeRequest.scope_identifier_present, false);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.mcpToolCalled, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(serialized.includes('args-only-project'), false);
  assert.equal(serialized.includes('args-only-workspace'), false);
});

test('observe mode records governed bridge gate receipt on real app.callTool path', async () => {
  const observations = [];
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation)
  }, async app => {
    const result = await app.callTool('audit_memory', {}, codexContext());
    const overview = await app.callTool('memory_overview', {}, codexContext({
      requestContext: {
        authenticatedBoundedOverview: true
      }
    }));
    const overviewCoverage =
      validateGovernedMcpOverviewStatusCoversCurrentProductGoal(overview.governedNativeBridge);

    assert.equal(result.access.rawMemoryReturned, false);
    assert.equal(overview.access.mode, 'authenticated_bounded_overview');
    assert.equal(overviewCoverage.accepted, true, overviewCoverage.blockers.join(', '));
    assert.equal(overviewCoverage.direction, 'read');
    assert.equal(overview.governedNativeBridge.latest.toolName, 'memory_overview');
    assert.equal(observations.length, 2);
    assert.equal(observations[0].toolName, 'audit_memory');
    assert.equal(observations[0].mode, 'observe');
    assert.equal(observations[0].gateResult.accepted, true);
    assert.equal(observations[0].gateResult.normalizedBridgeRequest.client_id, 'Codex');
    assert.equal(observations[0].gateResult.normalizedBridgeRequest.runtime_target, 'VCPToolBox native memory');
    assert.equal(
      observations[0].gateResult.normalizedBridgeRequest.runtime_target_reference_name,
      'operator-vcp-toolbox-service-ref'
    );
    assert.equal(observations[0].gateResult.runtimeCalled, false);
    assert.equal(observations[0].gateResult.mcpToolCalled, false);
    assert.equal(observations[0].readOnlyProbeResult.accepted, true);
    assert.equal(
      observations[0].readOnlyProbeResult.receipt.targetReferenceName,
      'operator-vcp-toolbox-service-ref'
    );
    assert.equal(observations[0].readOnlyProbeResult.receipt.statusCategory, 'not_executed');
    assert.equal(observations[0].readOnlyProbeResult.runtimeExecuted, false);
    assert.equal(observations[0].readOnlyProbeResult.memoryWritten, false);
    assert.equal(observations[0].readShapeProbeTargetResolverResult.accepted, false);
    assert.equal(
      observations[0].readShapeProbeTargetResolverResult.reasonCode,
      'no_registered_invoker_for_governed_runtime_target_reference'
    );
    assert.equal(observations[0].readShapeProbeExecutionResult, null);
  });
});

test('no-token memory_overview bypasses governed native bridge work', async () => {
  const observations = [];
  let readShapeProbeCalls = 0;
  let readDelegationCalls = 0;
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
    governedMcpVcpNativeReadShapeProbeInvoker: async () => {
      readShapeProbeCalls += 1;
      throw new Error('no-token memory_overview must not run native read-shape probe');
    },
    governedMcpVcpNativeReadDelegationToolCaller: async () => {
      readDelegationCalls += 1;
      throw new Error('no-token memory_overview must not run native read delegation');
    }
  }, async app => {
    const result = await app.callTool('memory_overview', {
      auditWindow: 10,
      limit: 5
    }, codexContext({
      requestContext: {
        noTokenReadOnly: true,
        outputDisclosureBudget: {
          level: 'summary',
          lowDisclosure: true,
          rawOutput: false,
          maxItems: 5,
          maxBytes: 4096
        },
        auditReceipt: {
          receipt_id: 'cm-app-no-token-overview-receipt'
        },
        rollbackPosture: {
          mode: 'read_only_no_write'
        }
      }
    }));

    assert.equal(result.access.mode, 'public_selected_overview');
    assert.equal(result.access.selectedProjection, true);
    assert.equal(observations.length, 0);
    assert.equal(readShapeProbeCalls, 0);
    assert.equal(readDelegationCalls, 0);
    assert.equal(result.governedNativeBridge, undefined);
  });
});

test('observe mode can run one injected governed VCP native read-shape probe without raw disclosure', async () => {
  const observations = [];
  let invocations = 0;
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
    governedMcpVcpNativeReadShapeProbeInvoker: async ({ targetReferenceName, component, action, requestBody }) => {
      invocations += 1;
      assert.equal(targetReferenceName, 'operator-vcp-toolbox-service-ref');
      assert.equal(component, 'KnowledgeBaseManager');
      assert.equal(action, 'knowledge_base.search');
      assert.equal(requestBody.max_results, 1);
      return [{ privateFieldNameShouldNotEcho: 'RAW_PRIVATE_VALUE_SHOULD_NOT_ECHO' }];
    }
  }, async app => {
    const result = await app.callTool('audit_memory', {}, codexContext());
    const serializedObservation = JSON.stringify(observations[0]);

    assert.equal(result.access.rawMemoryReturned, false);
    assert.equal(invocations, 1);
    assert.equal(observations.length, 1);
    assert.equal(observations[0].gateResult.accepted, true);
    assert.equal(observations[0].readOnlyProbeResult.accepted, true);
    assert.equal(observations[0].readShapeProbeTargetResolverResult.accepted, true);
    assert.equal(observations[0].readShapeProbeTargetResolverResult.targetResolved, true);
    assert.equal(observations[0].readShapeProbeExecutionResult.accepted, true);
    assert.equal(observations[0].readShapeProbeExecutionResult.runtimeExecuted, true);
    assert.equal(observations[0].readShapeProbeExecutionResult.liveVcpToolBoxCalled, false);
    assert.equal(observations[0].readShapeProbeExecutionResult.memoryWritten, false);
    assert.equal(
      observations[0].readShapeProbeExecutionResult.readShapeProbeExecutionResult.receipt.statusClass,
      'success'
    );
    assert.equal(
      observations[0].readShapeProbeExecutionResult.readShapeProbeExecutionResult.receipt.responseShapeCategory,
      'array_item_count_bucket_only'
    );
    assert.equal(serializedObservation.includes('privateFieldNameShouldNotEcho'), false);
    assert.equal(serializedObservation.includes('RAW_PRIVATE_VALUE_SHOULD_NOT_ECHO'), false);
  });
});

test('observe mode resolves governed VCP native target from registered safe reference invoker', async () => {
  const observations = [];
  let invocations = 0;
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
    governedMcpVcpNativeReadShapeProbeInvokerRegistry: {
      'operator-vcp-toolbox-service-ref': {
        invokeComponentAction: async ({ targetReferenceName, component, action, requestBody }) => {
          invocations += 1;
          assert.equal(targetReferenceName, 'operator-vcp-toolbox-service-ref');
          assert.equal(component, 'KnowledgeBaseManager');
          assert.equal(action, 'knowledge_base.search');
          assert.equal(requestBody.max_results, 1);
          return [];
        },
        transportCategory: 'local_http_transport',
        targetKind: 'mcp_server'
      }
    }
  }, async app => {
    await app.callTool('audit_memory', {}, codexContext());

    assert.equal(invocations, 1);
    assert.equal(observations.length, 1);
    assert.equal(observations[0].readShapeProbeTargetResolverResult.accepted, true);
    assert.equal(observations[0].readShapeProbeTargetResolverResult.transportCategory, 'local_http_transport');
    assert.equal(observations[0].readShapeProbeTargetResolverResult.invokeComponentAction, undefined);
    assert.equal(observations[0].readShapeProbeExecutionResult.accepted, true);
    assert.equal(observations[0].readShapeProbeExecutionResult.networkCalled, true);
    assert.equal(observations[0].readShapeProbeExecutionResult.memoryWritten, false);
  });
});

test('observe mode can run one governed HTTP MCP tools/call probe without exposing endpoint token or raw response', async () => {
  const observations = [];
  const secretToken = 'SECRET_TOKEN_SHOULD_NOT_ECHO';
  const rawPrivateValue = 'RAW_PRIVATE_VALUE_SHOULD_NOT_ECHO';
  const server = await withJsonRpcServer(async (req, res, body) => {
    assert.equal(body.method, 'tools/call');
    assert.equal(body.params.name, 'knowledge_base.search');
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      id: body.id,
      result: {
        structuredContent: [{
          privateFieldNameShouldNotEcho: rawPrivateValue
        }]
      }
    }));
  });

  try {
    await withTempApp({
      governedMcpVcpNativeBridgeGateMode: 'observe',
      governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
      governedMcpVcpNativeReadShapeProbeHttpMcpTarget: {
        endpoint: server.url,
        bearerToken: secretToken,
        mcpToolName: 'knowledge_base.search',
        requestTimeoutMs: 1000
      }
    }, async app => {
      await app.callTool('audit_memory', {}, codexContext());
      const serializedObservation = JSON.stringify(observations[0]);

      assert.equal(server.requests.length, 1);
      assert.equal(server.requests[0].method, 'POST');
      assert.equal(server.requests[0].headers.authorization, `Bearer ${secretToken}`);
      assert.equal(server.requests[0].body.method, 'tools/call');
      assert.equal(server.requests[0].body.params.name, 'knowledge_base.search');
      assert.equal(server.requests[0].body.params.arguments.max_results, 1);
      const governanceMetadataCoverage =
        validateGovernedMcpNativeGovernanceMetadataCoversCurrentProductGoal(
          server.requests[0].body.params._meta.codexMemoryGovernance,
          { toolName: 'audit_memory' }
        );
      assert.equal(
        server.requests[0].body.params._meta.codexMemoryGovernance.governanceTransport.metadataPath,
        'params._meta.codexMemoryGovernance'
      );
      assert.equal(
        governanceMetadataCoverage.accepted,
        true,
        governanceMetadataCoverage.blockers.join(', ')
      );
      assert.equal(observations.length, 1);
      assert.equal(observations[0].readShapeProbeTargetResolverResult.accepted, true);
      assert.equal(observations[0].readShapeProbeTargetResolverResult.transportCategory, 'local_http_transport');
      assert.equal(observations[0].readShapeProbeExecutionResult.accepted, true);
      assert.equal(observations[0].readShapeProbeExecutionResult.networkCalled, true);
      assert.equal(
        observations[0].readShapeProbeExecutionResult.readShapeProbeExecutionResult.receipt.responseShapeCategory,
        'array_item_count_bucket_only'
      );
      assert.equal(serializedObservation.includes(server.url), false);
      assert.equal(serializedObservation.includes(secretToken), false);
      assert.equal(serializedObservation.includes('privateFieldNameShouldNotEcho'), false);
      assert.equal(serializedObservation.includes(rawPrivateValue), false);
      assert.equal(serializedObservation.includes('initialize'), false);
    });
  } finally {
    await server.close();
  }
});

test('WSL NewAPI runtime profile routes read tools to configured governed native HTTP MCP target', async () => {
  const observations = [];
  const secretToken = 'PROFILE_SECRET_TOKEN_SHOULD_NOT_ECHO';
  const rawNativeValue = 'PROFILE_RAW_NATIVE_VALUE_SHOULD_NOT_ECHO';
  const server = await withJsonRpcServer(async (req, res, body) => {
    assert.equal(body.method, 'tools/call');
    assert.equal(body.params.name, 'knowledge_base.search');
    assert.ok([
      'neutral route read shape probe',
      'profile proof query'
    ].includes(body.params.arguments.query));
    assert.equal(body.params._meta.codexMemoryGovernance.runtimeTarget.targetReferenceName, 'operator-vcp-toolbox-service-ref');
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      id: body.id,
      result: {
        structuredContent: {
          results: [],
          rawNativeValue
        },
        _meta: {
          codexMemoryNativeRuntimeReceipt: {
            present: true,
            nativeRuntimeCalled: true,
            nativeRuntimeInitialized: true,
            providerApiCalled: true,
            memoryReadPerformed: true,
            memoryWritePerformed: false,
            durableWritePerformed: false,
            durableWriteScope: null,
            isolatedRuntimeStoreUsed: false,
            primaryMemoryStoreWritePerformed: false,
            derivedIndexWritePerformed: false,
            rawRuntimeOutputDisclosed: false,
            rawMemoryContentDisclosed: false,
            runtimeLocatorDisclosed: false,
            tokenMaterialDisclosed: false,
            readinessClaimed: false
          }
        }
      }
    }));
  });

  try {
    await withTempApp({
      governedMcpVcpNativeRuntimeProfile: 'wsl-newapi-prod',
      governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
      governedMcpVcpNativeHttpMcpTarget: {
        endpoint: server.url,
        bearerToken: secretToken,
        requestTimeoutMs: 1000
      }
    }, async app => {
      const serializedConfig = JSON.stringify(app.config);
      const result = await app.callTool('search_memory', {
        query: 'profile proof query',
        limit: 1
      }, codexContext({
        executionContext: {
          scopeId: 'scope-alpha'
        }
      }));
      const serializedResult = JSON.stringify(result);
      const serializedObservation = JSON.stringify(observations[0]);

      assert.equal(app.config.governedMcpVcpNativeRuntimeProfile.profileName, 'wsl-newapi-prod');
      assert.equal(app.config.governedMcpVcpNativeReadDelegationMode, 'primary_with_local_fallback');
      assert.equal(app.config.governedMcpVcpNativeWriteDelegationMode, 'off');
      assert.equal(server.requests.length, 2);
      assert.equal(server.requests[0].headers.authorization, `Bearer ${secretToken}`);
      assert.equal(server.requests[1].headers.authorization, `Bearer ${secretToken}`);
      assert.equal(server.requests[1].body.params.arguments.query, 'profile proof query');
      assert.equal(result.status, 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATED');
      assert.equal(result.access.primaryRuntime, 'VCPToolBox native memory');
      assert.equal(result.access.memoryReadPerformed, true);
      assert.equal(result.access.localMemoryFallbackUsed, false);
      assert.equal(result.receipt.nativeInvocationReceipt.nativeRuntimeReceipt.providerApiCalled, true);
      assert.equal(observations[0].readDelegationResult.accepted, true);
      assert.equal(serializedConfig.includes(server.url), false);
      assert.equal(serializedConfig.includes(secretToken), false);
      assert.equal(serializedResult.includes(server.url), false);
      assert.equal(serializedResult.includes(secretToken), false);
      assert.equal(serializedResult.includes(rawNativeValue), false);
      assert.equal(serializedObservation.includes(server.url), false);
      assert.equal(serializedObservation.includes(secretToken), false);
      assert.equal(serializedObservation.includes(rawNativeValue), false);
    });
  } finally {
    await server.close();
  }
});

test('observe mode builds governed HTTP MCP probe invoker from trusted config private target', async () => {
  const observations = [];
  const secretToken = 'SECRET_TOKEN_FROM_CONFIG_SHOULD_NOT_ECHO';
  const rawPrivateValue = 'RAW_PRIVATE_VALUE_FROM_CONFIG_SHOULD_NOT_ECHO';
  const server = await withJsonRpcServer(async (req, res, body) => {
    assert.equal(body.method, 'tools/call');
    assert.equal(body.params.name, 'knowledge_base.search');
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      id: body.id,
      result: {
        structuredContent: {
          privateFieldNameShouldNotEcho: rawPrivateValue
        }
      }
    }));
  });

  try {
    await withTempApp({
      governedMcpVcpNativeBridgeGateMode: 'observe',
      governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
      governedMcpVcpNativeHttpMcpTarget: {
        endpoint: server.url,
        bearerToken: secretToken,
        mcpToolName: 'knowledge_base.search',
        requestTimeoutMs: 1000
      }
    }, async app => {
      const serializedConfig = JSON.stringify(app.config);

      await app.callTool('audit_memory', {}, codexContext());
      const serializedObservation = JSON.stringify(observations[0]);

      assert.equal(server.requests.length, 1);
      assert.equal(server.requests[0].headers.authorization, `Bearer ${secretToken}`);
      const governanceMetadataCoverage =
        validateGovernedMcpNativeGovernanceMetadataCoversCurrentProductGoal(
          server.requests[0].body.params._meta.codexMemoryGovernance,
          { toolName: 'audit_memory' }
        );
      assert.equal(
        server.requests[0].body.params._meta.codexMemoryGovernance.governanceTransport.metadataPath,
        'params._meta.codexMemoryGovernance'
      );
      assert.equal(
        governanceMetadataCoverage.accepted,
        true,
        governanceMetadataCoverage.blockers.join(', ')
      );
      assert.equal(observations[0].readShapeProbeTargetResolverResult.accepted, true);
      assert.equal(observations[0].readShapeProbeExecutionResult.accepted, true);
      assert.equal(
        observations[0].readShapeProbeExecutionResult.readShapeProbeExecutionResult.receipt.responseShapeCategory,
        'object_top_level_kind_only_no_field_names'
      );
      assert.equal(serializedConfig.includes(server.url), false);
      assert.equal(serializedConfig.includes(secretToken), false);
      assert.equal(serializedObservation.includes(server.url), false);
      assert.equal(serializedObservation.includes(secretToken), false);
      assert.equal(serializedObservation.includes('privateFieldNameShouldNotEcho'), false);
      assert.equal(serializedObservation.includes(rawPrivateValue), false);
    });
  } finally {
    await server.close();
  }
});

test('primary read delegation returns governed VCP native low-disclosure result instead of local memory output', async () => {
  const observations = [];
  const secretToken = 'SECRET_TOKEN_FOR_PRIMARY_DELEGATION_SHOULD_NOT_ECHO';
  const rawPrivateValue = 'RAW_NATIVE_MEMORY_CONTENT_SHOULD_NOT_ECHO';
  const server = await withJsonRpcServer(async (req, res, body) => {
    assert.equal(body.method, 'tools/call');
    if (body.params.arguments?.governed_bridge) {
      assert.equal(body.params.name, 'knowledge_base.search');
      const delegatedCoverage =
        validateGovernedMcpNativeDelegatedArgumentsCoversCurrentProductGoal(body.params.arguments, {
          toolName: 'search_memory'
        });

      assert.equal(delegatedCoverage.accepted, true, delegatedCoverage.blockers.join(', '));
      assert.equal(delegatedCoverage.direction, 'read');
      assert.equal(body.params.arguments.query, 'native delegated search');
      assert.equal(body.params.arguments.include_content, false);
      assert.equal(body.params.arguments.limit, 5);
      assert.deepEqual(body.params.arguments.scope, {
        project_id: 'codex-memory',
        workspace_id: 'workspace-alpha',
        scope_id: 'scope-alpha',
        client_id: 'Codex',
        visibility: 'private'
      });
      assert.equal(body.params.arguments.governed_bridge.primary_runtime, 'VCPToolBox native memory');
      assert.deepEqual(body.params.arguments.governed_bridge.runtime_target, {
        primary_runtime: 'VCPToolBox native memory',
        target_reference_name: 'operator-vcp-toolbox-service-ref',
        target_kind: 'mcp_server',
        source_authority: 'bridge_runtime_or_static_config',
        forbidden_field_count: 0,
        bound: true,
        tool_arguments_may_override: false,
        governance_metadata_may_override: false,
        locator_included: false,
        endpoint_included: false,
        token_material_included: false,
        locator_disclosed: false,
        endpoint_disclosed: false,
        token_material_disclosed: false
      });
      assert.equal(body.params.arguments.governed_bridge.client_id, 'Codex');
      assert.equal(body.params.arguments.governed_bridge.invocation_profile_source, 'bridge_tool_binding');
      assert.equal(body.params.arguments.governed_bridge.invocation_profile_bound, true);
      assert.equal(body.params.arguments.governed_bridge.invocation_profile_tool_arguments_may_override, false);
      assert.equal(
        body.params.arguments.governed_bridge.invocation_profile_governance_metadata_may_override,
        false
      );
      assert.equal(body.params.arguments.governed_bridge.read_allowed, true);
      assert.equal(body.params.arguments.governed_bridge.write_allowed, false);
      assert.equal(body.params.arguments.governed_bridge.read_write_authority_source, 'bridge_tool_binding');
      assert.equal(body.params.arguments.governed_bridge.read_write_authority_bound, true);
      assert.equal(body.params.arguments.governed_bridge.mixed_read_write_allowed, false);
      assert.equal(body.params.arguments.governed_bridge.unbounded_write_allowed, false);
      assert.equal(body.params.arguments.governed_bridge.write_requires_exact_approval, false);
      assert.equal(body.params.arguments.governed_bridge.raw_output_allowed, false);
      assert.equal(body.params.arguments.governed_bridge.disclosure_max_items, 5);
      assert.equal(body.params.arguments.governed_bridge.disclosure_max_bytes, 4096);
      assert.equal(body.params.arguments.governed_bridge.output_disclosure_budget_bound, true);
      assert.equal(body.params.arguments.governed_bridge.over_budget_fallback_to_raw_output, false);
      assert.equal(body.params.arguments.governed_bridge.raw_response_body_disclosed, false);
      assert.equal(body.params.arguments.governed_bridge.audit_receipt_required, true);
      assert.equal(body.params.arguments.governed_bridge.audit_receipt_low_disclosure, true);
      assert.equal(body.params.arguments.governed_bridge.audit_receipt_reference_present, true);
      assert.equal(
        body.params.arguments.governed_bridge.audit_receipt_event_type,
        'governed_mcp_vcp_native_bridge_receipt'
      );
      assert.equal(body.params.arguments.governed_bridge.audit_receipt_append_required, true);
      assert.equal(body.params.arguments.governed_bridge.audit_receipt_low_disclosure_bound, true);
      assert.equal(body.params.arguments.governed_bridge.audit_raw_request_body_persisted, false);
      assert.equal(body.params.arguments.governed_bridge.audit_raw_response_body_persisted, false);
      assert.equal(
        body.params.arguments.governed_bridge.audit_receipt_reference_name,
        'governed-mcp-search_memory-receipt'
      );
      assert.equal(body.params.arguments.governed_bridge.rollback_plan_reference_present, false);
      assert.equal(body.params.arguments.governed_bridge.low_disclosure, true);
      assert.equal(JSON.stringify(body.params.arguments.governed_bridge).includes('native delegated search'), false);
      assert.equal(JSON.stringify(body.params.arguments.governed_bridge).includes(server.url), false);
      assert.equal(JSON.stringify(body.params.arguments.governed_bridge).includes(secretToken), false);
    } else {
      assert.equal(body.params.name, 'knowledge_base.search');
      assert.equal(body.params.arguments.max_results, 1);
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      id: body.id,
      result: {
        structuredContent: {
          results: [{
            memoryId: 'RAW_MEMORY_ID_SHOULD_NOT_ECHO',
            content: rawPrivateValue
          }]
        }
      }
    }));
  });

  try {
    await withTempApp({
      governedMcpVcpNativeBridgeGateMode: 'observe',
      governedMcpVcpNativeReadDelegationMode: 'primary',
      governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
      governedMcpVcpNativeHttpMcpTarget: {
        endpoint: server.url,
        bearerToken: secretToken,
        mcpToolName: 'knowledge_base.search',
        requestTimeoutMs: 1000
      }
    }, async app => {
      const result = await app.callTool('search_memory', {
        query: 'native delegated search',
        target: 'both',
        limit: 10,
        include_content: false,
        scope: {
          project_id: 'codex-memory',
          scope_id: 'scope-alpha',
          workspace_id: 'workspace-alpha',
          client_id: 'codex',
          visibility: 'private'
        }
      }, codexContext({
        executionContext: {
          scopeId: 'scope-alpha'
        }
      }));
      const auditEntries = await app.stores.auditLogStore.readRecentWriteAudit(10);
      const bridgeReceipt = auditEntries.find(entry =>
        entry.eventType === 'governed_mcp_vcp_native_bridge_receipt' &&
        entry.toolName === 'search_memory'
      );
      const serializedResult = JSON.stringify(result);
      const serializedObservation = JSON.stringify(observations[0]);
      const serializedAudit = JSON.stringify(auditEntries);

      assert.equal(server.requests.length, 2);
      assert.equal(server.requests[0].headers.authorization, `Bearer ${secretToken}`);
      assert.equal(server.requests[1].headers.authorization, `Bearer ${secretToken}`);
      assert.equal(server.requests[0].body.params.name, 'knowledge_base.search');
      assert.equal(server.requests[1].body.params.name, 'knowledge_base.search');
      assert.equal(result.status, 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATED');
      assert.equal(result.access.primaryRuntime, 'VCPToolBox native memory');
      assert.equal(result.access.localMemoryRole, 'not_used');
      assert.equal(result.access.rawMemoryReturned, false);
      assert.equal(
        server.requests[1].body.params.arguments.governed_bridge.access_path,
        'governed MCP tools'
      );
      assert.equal(server.requests[1].body.params.arguments.governed_bridge.scope_present, true);
      assert.equal(server.requests[1].body.params.arguments.governed_bridge.scope_identifier_present, true);
      assert.equal(server.requests[1].body.params.arguments.governed_bridge.scope_identifier_safe, true);
      assert.deepEqual(server.requests[1].body.params.arguments.governed_bridge.scope_field_names, [
        'client_id',
        'project_id',
        'scope_id',
        'visibility',
        'workspace_id'
      ]);
      assert.deepEqual(server.requests[1].body.params.arguments.governed_bridge.scope_identifier_field_names, [
        'project_id',
        'scope_id',
        'workspace_id'
      ]);
      assert.equal(
        server.requests[1].body.params.arguments.governed_bridge.scope_fingerprint,
        'f34c14c55b2f97e90cee55b0ad91abeff0941991b895e0ca64e3d9248b98c3d8'
      );
      assert.equal(server.requests[1].body.params.arguments.governed_bridge.raw_scope_persisted, false);
      assert.equal(server.requests[1].body.params.arguments.governed_bridge.invocation_transport, 'mcp');
      assert.equal(server.requests[1].body.params.arguments.governed_bridge.invocation_tool_name, 'search_memory');
      assert.equal(server.requests[1].body.params.arguments.governed_bridge.invocation_profile_tool_match, true);
      assert.equal(
        server.requests[1].body.params._meta.codexMemoryGovernance.schemaVersion,
        'codex_memory_governed_native_bridge_call_governance_v1'
      );
      assert.equal(
        server.requests[1].body.params._meta.codexMemoryGovernance.governanceTransport.metadataPath,
        'params._meta.codexMemoryGovernance'
      );
      assert.equal(
        server.requests[1].body.params._meta.codexMemoryGovernance.invocationProfile.profile,
        'governed_read_only'
      );
      assert.equal(
        server.requests[1].body.params._meta.codexMemoryGovernance.invocationProfile.toolName,
        'search_memory'
      );
      assert.equal(server.requests[1].body.params._meta.codexMemoryGovernance.readWriteAuthority.readAllowed, true);
      assert.equal(server.requests[1].body.params._meta.codexMemoryGovernance.readWriteAuthority.writeAllowed, false);
      assert.equal(server.requests[1].body.params._meta.codexMemoryGovernance.outputDisclosureBudget.rawOutput, false);
      assert.equal(
        server.requests[1].body.params._meta.codexMemoryGovernance.auditReceipt.receipt_id,
        server.requests[1].body.params.arguments.governed_bridge.audit_receipt_reference_name
      );
      assert.equal(
        server.requests[1].body.params._meta.codexMemoryGovernance.runtimeTarget.targetReferenceName,
        'operator-vcp-toolbox-service-ref'
      );
      assert.equal(result.receipt.itemCountBucket, 'one');
      assert.equal(result.receipt.nativeInvocationReceipt.transportCategory, 'local_http_transport');
      assert.equal(result.receipt.nativeInvocationReceipt.mcpMethod, 'tools/call');
      assert.equal(result.receipt.nativeInvocationReceipt.toolName, 'search_memory');
      assert.equal(result.receipt.nativeInvocationReceipt.invocationBindingMatched, true);
      assert.equal(result.receipt.nativeInvocationReceipt.governanceMetadataSent, true);
      assert.equal(
        result.receipt.nativeInvocationReceipt.governanceMetadataPath,
        'params._meta.codexMemoryGovernance'
      );
      assert.equal(result.receipt.nativeInvocationReceipt.statusClass, 'success');
      assert.equal(result.receipt.nativeInvocationReceipt.httpStatusClass, 'success');
      assert.equal(result.receipt.nativeInvocationReceipt.rawResponseBodyDisclosed, false);
      assert.equal(result.receipt.localAuditReceipt.status, 'appended');
      assert.equal(bridgeReceipt.delegationDirection, 'read');
      assert.equal(bridgeReceipt.clientId, 'Codex');
      assert.equal(bridgeReceipt.visibility, 'private');
      assert.equal(bridgeReceipt.scopePresent, true);
      assert.equal(bridgeReceipt.scopeIdentifierPresent, true);
      assert.deepEqual(bridgeReceipt.scopeFieldNames, [
        'client_id',
        'project_id',
        'scope_id',
        'visibility',
        'workspace_id'
      ]);
      assert.deepEqual(bridgeReceipt.scopeIdentifierFieldNames, [
        'project_id',
        'scope_id',
        'workspace_id'
      ]);
      assert.match(bridgeReceipt.scopeFingerprint, /^[a-f0-9]{64}$/);
      assert.equal(bridgeReceipt.rawScopePersisted, false);
      assert.equal(bridgeReceipt.trustedExecutionContextSupplied, true);
      assert.equal(bridgeReceipt.trustedExecutionContextAccepted, true);
      assert.equal(bridgeReceipt.trustedExecutionContextScopeMatched, true);
      assert.equal(bridgeReceipt.readAllowed, true);
      assert.equal(bridgeReceipt.writeAllowed, false);
      assert.equal(bridgeReceipt.readWriteAuthoritySource, 'bridge_tool_binding');
      assert.equal(bridgeReceipt.readWriteAuthorityBound, true);
      assert.equal(bridgeReceipt.mixedReadWriteAllowed, false);
      assert.equal(bridgeReceipt.unboundedWriteAllowed, false);
      assert.equal(bridgeReceipt.writeRequiresExactApproval, false);
      assert.equal(bridgeReceipt.targetReferenceName, 'operator-vcp-toolbox-service-ref');
      assert.equal(bridgeReceipt.runtimeTargetKind, 'mcp_server');
      assert.equal(bridgeReceipt.runtimeTargetSourceAuthority, 'bridge_runtime_or_static_config');
      assert.equal(bridgeReceipt.disclosureLevel, 'summary');
      assert.equal(bridgeReceipt.disclosureMaxItems, 5);
      assert.equal(bridgeReceipt.disclosureMaxBytes, 4096);
      assert.equal(bridgeReceipt.auditReceiptReferenceName, 'governed-mcp-search_memory-receipt');
      assert.equal(bridgeReceipt.nativeTransportCategory, 'local_http_transport');
      assert.equal(bridgeReceipt.nativeMcpMethod, 'tools/call');
      assert.equal(bridgeReceipt.nativeToolName, 'search_memory');
      assert.equal(bridgeReceipt.nativeInvocationStatusClass, 'success');
      assert.equal(bridgeReceipt.nativeInvocationHttpStatusClass, 'success');
      assert.equal(bridgeReceipt.rawResponseBodyPersisted, false);
      assert.equal(bridgeReceipt.memoryContentDisclosed, false);
      assert.equal(observations[0].readDelegationResult.accepted, true);
      assert.equal(observations[0].bridgeAuditReceiptResult.accepted, true);
      assert.equal(serializedResult.includes(server.url), false);
      assert.equal(serializedResult.includes(secretToken), false);
      assert.equal(serializedResult.includes('RAW_MEMORY_ID_SHOULD_NOT_ECHO'), false);
      assert.equal(serializedResult.includes(rawPrivateValue), false);
      assert.equal(serializedObservation.includes(server.url), false);
      assert.equal(serializedObservation.includes(secretToken), false);
      assert.equal(serializedObservation.includes(rawPrivateValue), false);
      assert.equal(serializedAudit.includes(server.url), false);
      assert.equal(serializedAudit.includes(secretToken), false);
      assert.equal(serializedAudit.includes('scope-alpha'), false);
      assert.equal(JSON.stringify(bridgeReceipt).includes('codex-memory'), false);
      assert.equal(JSON.stringify(bridgeReceipt).includes('workspace-alpha'), false);
      assert.equal(serializedAudit.includes('RAW_MEMORY_ID_SHOULD_NOT_ECHO'), false);
      assert.equal(serializedAudit.includes(rawPrivateValue), false);
    });
  } finally {
    await server.close();
  }
});

test('primary memory_overview read delegation carries canonical bridge scope to native MCP', async () => {
  let nativeCall = null;
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary',
    governedMcpVcpNativeReadDelegationToolCaller: async payload => {
      nativeCall = payload;
      return {
        summary: {
          count: 0
        }
      };
    }
  }, async app => {
    const result = await app.callTool('memory_overview', {
      limit: 9,
      auditWindow: 9
    }, codexContext());
    const serialized = JSON.stringify(result);

    assert.equal(result.status, 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATED');
    assert.equal(nativeCall.toolName, 'memory_overview');
    assert.deepEqual(nativeCall.arguments.scope, {
      project_id: 'codex-memory',
      workspace_id: 'workspace-alpha',
      client_id: 'Codex',
      visibility: 'private'
    });
    assert.deepEqual(nativeCall.arguments.governed_bridge.scope, {
      project_id: 'codex-memory',
      workspace_id: 'workspace-alpha',
      client_id: 'Codex',
      visibility: 'private'
    });
    assert.equal(nativeCall.arguments.governed_bridge.local_memory_role, 'not_used');
    assert.equal(nativeCall.arguments.governed_bridge.local_memory_source_runtime, null);
    assert.equal(nativeCall.arguments.governed_bridge.local_memory_primary_runtime, false);
    assert.equal(nativeCall.arguments.governed_bridge.local_memory_fallback_used, false);
    assert.equal(nativeCall.arguments.governed_bridge.local_memory_result_returned, false);
    assert.equal(nativeCall.arguments.governed_bridge.local_memory_result_can_be_mistaken_for_vcp_native, false);
    assert.equal(nativeCall.arguments.governed_bridge.local_memory_raw_content_disclosed, false);
    assert.equal(nativeCall.arguments.governed_bridge.trusted_execution_context_supplied, true);
    assert.equal(nativeCall.arguments.governed_bridge.trusted_execution_context_accepted, true);
    assert.equal(nativeCall.arguments.governed_bridge.trusted_execution_context_scope_matched, true);
    assert.equal(nativeCall.arguments.governed_bridge.invocation_profile, 'governed_read_only');
    assert.equal(nativeCall.arguments.governed_bridge.rollback_posture, 'no_runtime_state_to_rollback');
    assert.equal(nativeCall.arguments.governed_bridge.rollback_posture_bound, true);
    assert.equal(nativeCall.arguments.governed_bridge.rollback_plan_reference_present, false);
    assert.equal(nativeCall.arguments.governed_bridge.rollback_plan_shape_only, false);
    assert.equal(nativeCall.arguments.governed_bridge.rollback_auto_apply_allowed, false);
    assert.equal(nativeCall.arguments.governed_bridge.rollback_raw_plan_disclosed, false);
    assert.equal(nativeCall.arguments.governed_bridge.rollback_raw_plan_persisted, false);
    assert.equal(nativeCall.arguments.limit, 5);
    assert.equal(nativeCall.arguments.auditWindow, 5);
    assert.equal(serialized.includes('workspace-alpha'), false);
    assert.equal(serialized.includes('codex-memory'), false);
  });
});

test('primary read delegation binds every governed read tool on the real app path', async () => {
  const readCases = [
    {
      toolName: 'search_memory',
      args: {
        query: 'native delegated read family search',
        target: 'both',
        limit: 9,
        include_content: false
      },
      localCounterName: 'search',
      nativeValue: {
        results: [{
          memoryId: 'RAW_SEARCH_MEMORY_ID_SHOULD_NOT_ECHO',
          content: 'RAW_SEARCH_CONTENT_SHOULD_NOT_ECHO'
        }]
      }
    },
    {
      toolName: 'memory_overview',
      args: {
        auditWindow: 9,
        limit: 9
      },
      localCounterName: 'overview',
      nativeValue: {
        summary: {
          count: 1,
          rawDetail: 'RAW_OVERVIEW_DETAIL_SHOULD_NOT_ECHO'
        }
      }
    },
    {
      toolName: 'audit_memory',
      args: {
        audit_family: 'governance',
        window: 9,
        include_raw: false
      },
      localCounterName: 'audit',
      nativeValue: {
        findings: [{
          reasonCode: 'native_audit_finding',
          rawAudit: 'RAW_AUDIT_DETAIL_SHOULD_NOT_ECHO'
        }]
      }
    }
  ];

  for (const readCase of readCases) {
    const observations = [];
    let nativePayload = null;
    await withTempApp({
      governedMcpVcpNativeBridgeGateMode: 'observe',
      governedMcpVcpNativeReadDelegationMode: 'primary',
      governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
      governedMcpVcpNativeReadDelegationToolCaller: async payload => {
        nativePayload = payload;
        return readCase.nativeValue;
      }
    }, async app => {
      const localReads = {
        search: 0,
        overview: 0,
        audit: 0
      };
      app.services.passiveRecallService.search = async () => {
        localReads.search += 1;
        return { results: [{ content: 'LOCAL_SEARCH_CONTENT_SHOULD_NOT_ECHO' }] };
      };
      app.services.overviewService.getOverview = async () => {
        localReads.overview += 1;
        return { access: { mode: 'local_overview_should_not_run' } };
      };
      app.services.auditMemoryReadonlyService.run = async () => {
        localReads.audit += 1;
        return { access: { mode: 'local_audit_should_not_run' }, findings: [] };
      };

      const result = await app.callTool(readCase.toolName, readCase.args, codexContext({
        executionContext: {
          scopeId: 'scope-alpha'
        }
      }));
      const auditEntries = await app.stores.auditLogStore.readRecentWriteAudit(10);
      const bridgeReceipt = auditEntries.find(entry =>
        entry.eventType === 'governed_mcp_vcp_native_bridge_receipt' &&
        entry.toolName === readCase.toolName
      );
      const delegatedCoverage =
        validateGovernedMcpNativeDelegatedArgumentsCoversCurrentProductGoal(nativePayload.arguments, {
          toolName: readCase.toolName
        });
      const bridgeReceiptCoverage =
        validateGovernedMcpNativeBridgeReceiptCoversCurrentProductGoal(bridgeReceipt);
      const overviewStatus = app.services.governedNativeBridgeObservationStore.getStatus();
      const overviewCoverage =
        validateGovernedMcpOverviewStatusCoversCurrentProductGoal(overviewStatus);
      const serializedResult = JSON.stringify(result);
      const serializedObservation = JSON.stringify(observations[0]);
      const serializedAudit = JSON.stringify(auditEntries);

      assert.equal(localReads[readCase.localCounterName], 0, readCase.toolName);
      assert.equal(nativePayload.toolName, readCase.toolName, readCase.toolName);
      assert.equal(delegatedCoverage.accepted, true, delegatedCoverage.blockers.join(', '));
      assert.equal(delegatedCoverage.direction, 'read', readCase.toolName);
      assert.equal(nativePayload.arguments.governed_bridge.invocation_tool_name, readCase.toolName);
      assert.equal(nativePayload.arguments.governed_bridge.invocation_profile, 'governed_read_only');
      assert.equal(nativePayload.arguments.governed_bridge.read_allowed, true);
      assert.equal(nativePayload.arguments.governed_bridge.write_allowed, false);
      assert.equal(nativePayload.arguments.governed_bridge.write_requires_exact_approval, false);
      assert.equal(nativePayload.arguments.governed_bridge.local_memory_role, 'not_used');
      assert.equal(nativePayload.arguments.governed_bridge.local_memory_fallback_used, false);
      assert.equal(nativePayload.arguments.governed_bridge.raw_response_body_disclosed, false);
      assert.deepEqual(nativePayload.arguments.scope, {
        project_id: 'codex-memory',
        scope_id: 'scope-alpha',
        workspace_id: 'workspace-alpha',
        client_id: 'Codex',
        visibility: 'private'
      });
      if (readCase.toolName === 'search_memory') {
        assert.equal(nativePayload.arguments.include_content, false);
        assert.equal(nativePayload.arguments.limit, 5);
      }
      if (readCase.toolName === 'memory_overview') {
        assert.equal(nativePayload.arguments.auditWindow, 5);
        assert.equal(nativePayload.arguments.limit, 5);
      }
      if (readCase.toolName === 'audit_memory') {
        assert.equal(nativePayload.arguments.include_raw, false);
        assert.equal(nativePayload.arguments.window, 5);
      }
      assert.equal(result.status, 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATED', readCase.toolName);
      assert.equal(result.access.primaryRuntime, 'VCPToolBox native memory', readCase.toolName);
      assert.equal(result.access.localMemoryRole, 'not_used', readCase.toolName);
      assert.equal(result.access.localMemoryFallbackUsed, false, readCase.toolName);
      assert.equal(result.receipt.toolName, readCase.toolName, readCase.toolName);
      assert.equal(result.receipt.localAuditReceipt.status, 'appended', readCase.toolName);
      assert.equal(bridgeReceiptCoverage.accepted, true, bridgeReceiptCoverage.blockers.join(', '));
      assert.equal(bridgeReceiptCoverage.direction, 'read', readCase.toolName);
      assert.equal(bridgeReceipt.toolName, readCase.toolName, readCase.toolName);
      assert.equal(bridgeReceipt.gateMcpToolName, readCase.toolName, readCase.toolName);
      assert.equal(bridgeReceipt.toolNameMatchesGate, true, readCase.toolName);
      assert.equal(bridgeReceipt.localMemoryRole, 'not_used', readCase.toolName);
      assert.equal(bridgeReceipt.localMemoryFallbackUsed, false, readCase.toolName);
      assert.equal(bridgeReceipt.rollbackPosture, 'no_runtime_state_to_rollback', readCase.toolName);
      assert.equal(bridgeReceipt.rollbackDisposition, 'no_runtime_write_to_rollback', readCase.toolName);
      assert.equal(overviewCoverage.accepted, true, overviewCoverage.blockers.join(', '));
      assert.equal(overviewCoverage.direction, 'read', readCase.toolName);
      assert.equal(overviewStatus.latest.toolName, readCase.toolName, readCase.toolName);
      assert.equal(observations[0].readDelegationResult.accepted, true, readCase.toolName);
      assert.equal(observations[0].bridgeAuditReceiptResult.accepted, true, readCase.toolName);
      assert.equal(serializedResult.includes('LOCAL_SEARCH_CONTENT_SHOULD_NOT_ECHO'), false, readCase.toolName);
      assert.equal(serializedResult.includes('RAW_SEARCH_MEMORY_ID_SHOULD_NOT_ECHO'), false, readCase.toolName);
      assert.equal(serializedResult.includes('RAW_SEARCH_CONTENT_SHOULD_NOT_ECHO'), false, readCase.toolName);
      assert.equal(serializedResult.includes('RAW_OVERVIEW_DETAIL_SHOULD_NOT_ECHO'), false, readCase.toolName);
      assert.equal(serializedResult.includes('RAW_AUDIT_DETAIL_SHOULD_NOT_ECHO'), false, readCase.toolName);
      assert.equal(serializedObservation.includes('LOCAL_SEARCH_CONTENT_SHOULD_NOT_ECHO'), false, readCase.toolName);
      assert.equal(serializedObservation.includes('RAW_SEARCH_CONTENT_SHOULD_NOT_ECHO'), false, readCase.toolName);
      assert.equal(serializedObservation.includes('RAW_OVERVIEW_DETAIL_SHOULD_NOT_ECHO'), false, readCase.toolName);
      assert.equal(serializedObservation.includes('RAW_AUDIT_DETAIL_SHOULD_NOT_ECHO'), false, readCase.toolName);
      assert.equal(serializedAudit.includes('RAW_SEARCH_CONTENT_SHOULD_NOT_ECHO'), false, readCase.toolName);
      assert.equal(serializedAudit.includes('RAW_OVERVIEW_DETAIL_SHOULD_NOT_ECHO'), false, readCase.toolName);
      assert.equal(serializedAudit.includes('RAW_AUDIT_DETAIL_SHOULD_NOT_ECHO'), false, readCase.toolName);
    });
  }
});

test('primary read delegation ignores cross-client payload scope and uses canonical scope', async () => {
  const observations = [];
  let nativePayload = null;
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
    governedMcpVcpNativeReadDelegationToolCaller: async payload => {
      nativePayload = payload;
      return { results: [] };
    }
  }, async app => {
    let localSearchCalls = 0;
    app.services.passiveRecallService.search = async () => {
      localSearchCalls += 1;
      return { results: [{ content: 'LOCAL_CROSS_CLIENT_CONTENT_SHOULD_NOT_ECHO' }] };
    };

    const result = await app.callTool('search_memory', {
      query: 'cross-client payload scope must not authorize',
      target: 'both',
      limit: 3,
      include_content: false,
      scope: {
        project_id: 'codex-memory',
        workspace_id: 'workspace-alpha',
        client_id: 'other-client',
        visibility: 'private'
      }
    }, codexContext());
    const serializedResult = JSON.stringify(result);
    const serializedObservation = JSON.stringify(observations[0]);

    assert.equal(localSearchCalls, 0);
    assert.equal(result.status, 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATED');
    assert.equal(result.access.runtimeCalled, true);
    assert.equal(result.access.mcpToolCalled, true);
    assert.equal(observations[0].gateResult.accepted, true);
    assert.equal(observations[0].readDelegationResult.accepted, true);
    assert.deepEqual(nativePayload.arguments.scope, {
      project_id: 'codex-memory',
      workspace_id: 'workspace-alpha',
      client_id: 'Codex',
      visibility: 'private'
    });
    assert.deepEqual(nativePayload.arguments.governed_bridge.scope, nativePayload.arguments.scope);
    assert.equal(serializedResult.includes('LOCAL_CROSS_CLIENT_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedObservation.includes('LOCAL_CROSS_CLIENT_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(JSON.stringify(nativePayload).includes('other-client'), false);
  });
});

test('primary read delegation ignores unsafe payload scope and does not forward it', async () => {
  const observations = [];
  let nativePayload = null;
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
    governedMcpVcpNativeReadDelegationToolCaller: async payload => {
      nativePayload = payload;
      return { results: [] };
    }
  }, async app => {
    let localSearchCalls = 0;
    app.services.passiveRecallService.search = async () => {
      localSearchCalls += 1;
      return { results: [{ content: 'LOCAL_UNSAFE_SCOPE_CONTENT_SHOULD_NOT_ECHO' }] };
    };

    const result = await app.callTool('search_memory', {
      query: 'unsafe payload scope must not be forwarded',
      target: 'both',
      limit: 3,
      include_content: false,
      scope: {
        project_id: 'https://private.example/project?token=SECRET_SCOPE_SHOULD_NOT_ECHO',
        workspace_id: 'workspace-alpha',
        visibility: 'private'
      }
    }, codexContext());
    const serializedResult = JSON.stringify(result);
    const serializedObservation = JSON.stringify(observations[0]);

    assert.equal(localSearchCalls, 0);
    assert.equal(result.status, 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATED');
    assert.equal(result.access.runtimeCalled, true);
    assert.equal(result.access.mcpToolCalled, true);
    assert.equal(observations[0].gateResult.accepted, true);
    assert.equal(observations[0].readDelegationResult.accepted, true);
    assert.deepEqual(nativePayload.arguments.scope, {
      project_id: 'codex-memory',
      workspace_id: 'workspace-alpha',
      client_id: 'Codex',
      visibility: 'private'
    });
    assert.equal(serializedResult.includes('LOCAL_UNSAFE_SCOPE_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('SECRET_SCOPE_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedObservation.includes('LOCAL_UNSAFE_SCOPE_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedObservation.includes('SECRET_SCOPE_SHOULD_NOT_ECHO'), false);
    assert.equal(JSON.stringify(nativePayload).includes('SECRET_SCOPE_SHOULD_NOT_ECHO'), false);
  });
});

test('primary read delegation ignores safe payload scope drift from trusted execution context', async () => {
  const observations = [];
  let nativePayload = null;
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
    governedMcpVcpNativeReadDelegationToolCaller: async payload => {
      nativePayload = payload;
      return { results: [] };
    }
  }, async app => {
    let localSearchCalls = 0;
    app.services.passiveRecallService.search = async () => {
      localSearchCalls += 1;
      return { results: [{ content: 'LOCAL_SCOPE_DRIFT_CONTENT_SHOULD_NOT_ECHO' }] };
    };

    const result = await app.callTool('search_memory', {
      query: 'payload scope drift must not authorize',
      target: 'both',
      limit: 3,
      include_content: false,
      scope: {
        project_id: 'other-project',
        workspace_id: 'workspace-alpha',
        visibility: 'private'
      }
    }, codexContext());
    const serializedResult = JSON.stringify(result);
    const serializedObservation = JSON.stringify(observations[0]);

    assert.equal(localSearchCalls, 0);
    assert.equal(result.status, 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATED');
    assert.equal(result.access.runtimeCalled, true);
    assert.equal(result.access.mcpToolCalled, true);
    assert.equal(observations[0].gateResult.accepted, true);
    assert.equal(observations[0].readDelegationResult.accepted, true);
    assert.equal(observations[0].gateResult.normalizedBridgeRequest.trusted_execution_context_scope_matched, true);
    assert.deepEqual(nativePayload.arguments.scope, {
      project_id: 'codex-memory',
      workspace_id: 'workspace-alpha',
      client_id: 'Codex',
      visibility: 'private'
    });
    assert.equal(serializedResult.includes('LOCAL_SCOPE_DRIFT_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('other-project'), false);
    assert.equal(serializedObservation.includes('LOCAL_SCOPE_DRIFT_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedObservation.includes('other-project'), false);
    assert.equal(JSON.stringify(nativePayload).includes('other-project'), false);
  });
});

test('primary read delegation rejects successful native read when required audit receipt cannot be appended', async () => {
  const observations = [];
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
    governedMcpVcpNativeReadDelegationToolCaller: async payload => {
      assert.equal(payload.toolName, 'search_memory');
      return {
        results: [{
          content: 'RAW_NATIVE_READ_CONTENT_SHOULD_NOT_ECHO'
        }]
      };
    }
  }, async app => {
    app.stores.auditLogStore.appendWriteAudit = async () => {
      throw new Error('PRIVATE_AUDIT_APPEND_FAILURE_SHOULD_NOT_ECHO');
    };

    const result = await app.callTool('search_memory', {
      query: 'audit receipt must append',
      target: 'both',
      limit: 1,
      include_content: false,
      scope: {
        project_id: 'codex-memory',
        workspace_id: 'workspace-alpha',
        client_id: 'codex',
        visibility: 'private'
      }
    }, codexContext());
    const serializedResult = JSON.stringify(result);
    const serializedObservation = JSON.stringify(observations[0]);

    assert.equal(result.status, 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATION_REJECTED');
    assert.equal(result.reasonCode, 'required_bridge_audit_receipt_not_appended');
    assert.equal(result.access.runtimeCalled, true);
    assert.equal(result.access.memoryReadPerformed, true);
    assert.equal(result.access.localMemoryFallbackEligible, false);
    assert.equal(result.access.auditReceiptRequiredButNotAppended, true);
    assert.equal(result.access.delegationStatusClass, 'audit_receipt_not_appended');
    assert.equal(result.access.delegationReasonCode, 'required_bridge_audit_receipt_not_appended');
    assert.equal(result.access.rollbackRequired, false);
    assert.equal(result.access.rollbackFollowupRequired, false);
    assert.equal(result.receipt.statusClass, 'audit_receipt_not_appended');
    assert.equal(result.receipt.auditReceiptRequiredButNotAppended, true);
    assert.equal(result.receipt.localAuditReceipt.status, 'not_appended');
    assert.equal(observations[0].readDelegationResult.accepted, false);
    assert.equal(observations[0].bridgeAuditReceiptResult.accepted, false);
    assert.equal(observations[0].bridgeAuditReceiptResult.reasonCode, 'audit_receipt_append_failed');
    assert.equal(serializedResult.includes('RAW_NATIVE_READ_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedObservation.includes('RAW_NATIVE_READ_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedObservation.includes('PRIVATE_AUDIT_APPEND_FAILURE_SHOULD_NOT_ECHO'), false);
  });
});

test('primary_with_local_fallback uses local read path when governed native read delegation fails', async () => {
  const observations = [];
  let nativeCalls = 0;
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary_with_local_fallback',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
    governedMcpVcpNativeReadDelegationToolCaller: async payload => {
      nativeCalls += 1;
      throw governedNativeTransportErrorForPayload(payload, 'PRIVATE_NATIVE_FAILURE_SHOULD_NOT_ECHO');
    }
  }, async app => {
    const result = await app.callTool('audit_memory', {}, codexContext());
    const auditEntries = await app.stores.auditLogStore.readRecentWriteAudit(10);
    const fallbackReceipt = auditEntries.find(entry =>
      entry.eventType === 'governed_mcp_vcp_native_read_fallback_receipt' &&
      entry.toolName === 'audit_memory'
    );
    const serializedResult = JSON.stringify(result);
    const serializedObservation = JSON.stringify(observations[0]);
    const serializedAudit = JSON.stringify(auditEntries);

    assert.equal(nativeCalls, 1);
    assert.equal(result.access.mode, 'audit_memory_readonly_bounded');
    assert.equal(result.access.primaryRuntime, 'VCPToolBox native memory');
    assert.equal(result.access.localMemoryRole, 'fallback');
    assert.equal(result.access.localMemorySourceRuntime, 'codex_memory_local_fallback');
    assert.equal(result.access.localMemoryFallbackAttempted, true);
    assert.equal(result.access.localMemoryFallbackUsed, true);
    assert.equal(result.access.localMemoryFallbackReadPerformed, true);
    assert.equal(result.access.localMemoryFallbackReturned, true);
    assert.equal(result.access.localMemoryFallbackReasonCode, 'native_read_delegation_transport_error');
    assert.equal(result.access.vcpNativeResult, false);
    assert.equal(result.access.resultCanBeMistakenForVcpNative, false);
    assert.equal(result.access.fallbackRequiresAuditReceipt, true);
    assert.equal(result.access.fallbackAfterAuditReceiptAppended, true);
    assert.equal(result.access.localFallbackAuditReceiptStatus, 'appended');
    assert.equal(result.access.nativeInvocationAttempted, true);
    assert.equal(result.access.nativeMcpToolInvocationAttempted, true);
    assert.equal(result.access.rawMemoryReturned, false);
    assert.equal(result.governedNativeReadFallback.used, true);
    assert.equal(result.governedNativeReadFallback.localMemoryFallbackAttempted, true);
    assert.equal(result.governedNativeReadFallback.localMemoryFallbackReadPerformed, true);
    assert.equal(result.governedNativeReadFallback.localMemoryFallbackReturned, true);
    assert.equal(result.governedNativeReadFallback.localMemoryRole, 'fallback');
    assert.equal(result.governedNativeReadFallback.localMemorySourceRuntime, 'codex_memory_local_fallback');
    assert.equal(result.governedNativeReadFallback.reasonCode, 'native_read_delegation_transport_error');
    assert.equal(result.governedNativeReadFallback.primaryRuntime, 'VCPToolBox native memory');
    assert.equal(result.governedNativeReadFallback.auditReceiptStatus, 'appended');
    assert.equal(result.governedNativeReadFallback.nativeRuntimeCalled, true);
    assert.equal(result.governedNativeReadFallback.nativeMcpToolCalled, true);
    assert.equal(result.governedNativeReadFallback.nativeInvocationAttempted, true);
    assert.equal(result.governedNativeReadFallback.nativeMcpToolInvocationAttempted, true);
    assert.equal(result.governedNativeReadFallback.nativeMemoryReadPerformed, false);
    assert.equal(result.governedNativeReadFallback.fallbackRequiresAuditReceipt, true);
    assert.equal(result.governedNativeReadFallback.fallbackAfterAuditReceiptAppended, true);
    assert.equal(result.governedNativeReadFallback.vcpNativeResult, false);
    assert.equal(result.governedNativeReadFallback.resultCanBeMistakenForVcpNative, false);
    assert.equal(result.governedNativeReadFallback.localFallbackAuditReceipt.status, 'appended');
    assert.equal(result.governedNativeReadFallback.rawNativeOutputReturned, false);
    assert.equal(result.governedNativeReadFallback.readinessClaimed, false);
    const fallbackResultCoverage =
      validateGovernedMcpReadFallbackToolResultCoversLocalMemoryRole(result);
    assert.equal(fallbackResultCoverage.accepted, true, fallbackResultCoverage.blockers.join(', '));
    assert.equal(fallbackResultCoverage.vcpNativeResult, false);
    assert.equal(fallbackResultCoverage.resultCanBeMistakenForVcpNative, false);
    assert.equal(fallbackResultCoverage.readinessClaimed, false);
    assert.equal(fallbackReceipt.eventType, 'governed_mcp_vcp_native_read_fallback_receipt');
    assert.equal(fallbackReceipt.localMemoryRole, 'fallback');
    assert.equal(fallbackReceipt.localMemorySourceRuntime, 'codex_memory_local_fallback');
    assert.equal(fallbackReceipt.localMemoryFallbackAuthorized, true);
    assert.equal(fallbackReceipt.localMemoryFallbackUsed, false);
    assert.equal(fallbackReceipt.localMemoryFallbackReadPerformed, false);
    assert.equal(fallbackReceipt.localMemoryFallbackReturned, false);
    assert.equal(fallbackReceipt.fallbackAfterAuditReceiptAppended, true);
    assert.equal(fallbackReceipt.nativeRuntimeCalled, true);
    assert.equal(fallbackReceipt.nativeMcpToolCalled, true);
    assert.equal(fallbackReceipt.nativeInvocationAttempted, true);
    assert.equal(fallbackReceipt.nativeMcpToolInvocationAttempted, true);
    assert.equal(fallbackReceipt.nativeMemoryReadPerformed, false);
    assert.equal(fallbackReceipt.vcpNativeResult, false);
    assert.equal(fallbackReceipt.resultCanBeMistakenForVcpNative, false);
    assert.equal(fallbackReceipt.rawFallbackMemoryPersisted, false);
    assert.equal(fallbackReceipt.memoryContentDisclosed, false);
    const fallbackCoverage =
      validateGovernedMcpReadFallbackReceiptCoversLocalMemoryRole(fallbackReceipt);
    assert.equal(fallbackCoverage.accepted, true, fallbackCoverage.blockers.join(', '));
    assert.equal(fallbackCoverage.vcpNativeResult, false);
    assert.equal(fallbackCoverage.resultCanBeMistakenForVcpNative, false);
    assert.equal(fallbackCoverage.readinessClaimed, false);
    assert.equal(observations[0].readDelegationResult.accepted, false);
    assert.equal(
      observations[0].readDelegationResult.reasonCode,
      'native_read_delegation_transport_error'
    );
    assert.equal(observations[0].readDelegationResult.runtimeCalled, true);
    assert.equal(observations[0].readDelegationResult.mcpToolCalled, true);
    assert.equal(observations[0].readDelegationResult.memoryReadPerformed, false);
    assert.equal(observations[0].readDelegationResult.localMemoryFallbackEligible, true);
    assert.equal(serializedResult.includes('PRIVATE_NATIVE_FAILURE_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedObservation.includes('PRIVATE_NATIVE_FAILURE_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedAudit.includes('PRIVATE_NATIVE_FAILURE_SHOULD_NOT_ECHO'), false);
  });
});

test('primary_with_local_fallback clamps local search fallback to governed disclosure budget and scope', async () => {
  const observations = [];
  let nativeCalls = 0;
  let localSearchInput = null;
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary_with_local_fallback',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
    governedMcpVcpNativeReadDelegationToolCaller: async payload => {
      nativeCalls += 1;
      throw governedNativeTransportErrorForPayload(payload, 'PRIVATE_NATIVE_FAILURE_SHOULD_NOT_ECHO');
    }
  }, async app => {
    app.services.passiveRecallService.search = async input => {
      localSearchInput = input;
      return [
        {
          memoryId: 'local-fallback-scope-match',
          score: 0.81
        },
        {
          memoryId: 'local-fallback-scope-mismatch',
          score: 0.62
        }
      ];
    };
    app.stores.shadowStore.getRecordsScopeMap = async memoryIds => {
      assert.deepEqual(memoryIds.sort(), [
        'local-fallback-scope-match',
        'local-fallback-scope-mismatch'
      ]);
      return new Map([
        ['local-fallback-scope-match', {
          scopeId: 'scope-alpha',
          projectId: 'codex-memory',
          workspaceId: 'workspace-alpha',
          clientId: 'Codex',
          visibility: 'private'
        }],
        ['local-fallback-scope-mismatch', {
          scopeId: 'scope-beta',
          projectId: 'codex-memory',
          workspaceId: 'workspace-alpha',
          clientId: 'Codex',
          visibility: 'private'
        }]
      ]);
    };

    const result = await app.callTool('search_memory', {
      query: 'fallback should stay governed',
      target: 'both',
      limit: 10,
      include_content: false,
      scope: {
        project_id: 'codex-memory',
        workspace_id: 'workspace-alpha',
        client_id: 'codex',
        visibility: 'private'
      }
    }, codexContext({
      executionContext: {
        scopeId: 'scope-alpha'
      }
    }));
    const serializedResult = JSON.stringify(result);
    const serializedObservation = JSON.stringify(observations[0]);

    assert.equal(nativeCalls, 1);
    assert.equal(localSearchInput.limit, 5);
    assert.equal(localSearchInput.includeContent, false);
    assert.deepEqual(localSearchInput.candidateFilters, {
      scopeId: 'scope-alpha',
      projectId: 'codex-memory',
      workspaceId: 'workspace-alpha',
      clientId: 'Codex',
      visibility: ['private']
    });
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].score, 0.81);
    assert.equal(result.access.localMemoryFallbackUsed, true);
    assert.equal(result.access.localMemoryFallbackReadPerformed, true);
    assert.equal(result.access.localFallbackAuditReceiptStatus, 'appended');
    assert.equal(serializedResult.includes('PRIVATE_NATIVE_FAILURE_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedObservation.includes('PRIVATE_NATIVE_FAILURE_SHOULD_NOT_ECHO'), false);
  });
});

test('primary_with_local_fallback returns empty local search fallback for zero-item disclosure budget', async () => {
  let nativeCalls = 0;
  let localSearchCalled = false;
  const observations = [];
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary_with_local_fallback',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
    governedMcpVcpNativeReadDelegationToolCaller: async payload => {
      nativeCalls += 1;
      throw governedNativeTransportErrorForPayload(payload, 'PRIVATE_NATIVE_FAILURE_SHOULD_NOT_ECHO');
    }
  }, async app => {
    app.services.passiveRecallService.search = async () => {
      localSearchCalled = true;
      return [{
        memoryId: 'LOCAL_FALLBACK_ITEM_SHOULD_NOT_RETURN',
        content: 'LOCAL_FALLBACK_CONTENT_SHOULD_NOT_RETURN'
      }];
    };

    const result = await app.callTool('search_memory', {
      query: 'zero disclosure budget should return no fallback items',
      target: 'both',
      limit: 10,
      include_content: false,
      scope: {
        project_id: 'codex-memory',
        workspace_id: 'workspace-alpha',
        client_id: 'codex',
        visibility: 'private'
      }
    }, codexContext({
      requestContext: {
        outputDisclosureBudget: {
          level: 'summary',
          lowDisclosure: true,
          rawOutput: false,
          maxItems: 0,
          maxBytes: 4096
        }
      }
    }));
    const serialized = JSON.stringify({ result, observations });

    assert.equal(nativeCalls, 1);
    assert.equal(localSearchCalled, false);
    assert.deepEqual(result.results, []);
    assert.equal(result.access.localMemoryFallbackAttempted, true);
    assert.equal(result.access.localMemoryFallbackUsed, true);
    assert.equal(result.access.localMemoryFallbackReadPerformed, false);
    assert.equal(result.access.localMemoryFallbackReturned, true);
    assert.equal(result.access.localFallbackAuditReceiptStatus, 'appended');
    assert.equal(result.governedNativeReadFallback.localMemoryFallbackReadPerformed, false);
    assert.equal(observations[0].gateResult.normalizedBridgeRequest.disclosure_max_items, 0);
    assert.equal(serialized.includes('LOCAL_FALLBACK_ITEM_SHOULD_NOT_RETURN'), false);
    assert.equal(serialized.includes('LOCAL_FALLBACK_CONTENT_SHOULD_NOT_RETURN'), false);
    assert.equal(serialized.includes('PRIVATE_NATIVE_FAILURE_SHOULD_NOT_ECHO'), false);
  });
});

test('primary_with_local_fallback sanitizes forged fallback scope before local read', async () => {
  let nativeCalls = 0;
  let localSearchInput = null;
  const observations = [];
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary_with_local_fallback',
    governedMcpVcpNativeBridgeGateObserver: observation => {
      observations.push(observation);
      observation.gateResult.normalizedBridgeRequest.scope = {
        project_id: 'https://PRIVATE_FALLBACK_PROJECT_SHOULD_NOT_ECHO',
        workspace_id: 'workspace-alpha',
        scope_id: 'file:///PRIVATE_FALLBACK_SCOPE_SHOULD_NOT_ECHO',
        client_id: 'PRIVATE_FALLBACK_CLIENT_SHOULD_NOT_ECHO',
        visibility: 'PRIVATE_FALLBACK_VISIBILITY_SHOULD_NOT_ECHO'
      };
    },
    governedMcpVcpNativeReadDelegationToolCaller: async payload => {
      nativeCalls += 1;
      throw governedNativeTransportErrorForPayload(payload, 'PRIVATE_NATIVE_FAILURE_SHOULD_NOT_ECHO');
    }
  }, async app => {
    app.services.passiveRecallService.search = async input => {
      localSearchInput = input;
      return [];
    };

    const result = await app.callTool('search_memory', {
      query: 'fallback forged scope should stay bounded',
      target: 'both',
      limit: 10,
      include_content: false
    }, codexContext());
    const serialized = JSON.stringify({ result, localSearchInput });

    assert.equal(nativeCalls, 1);
    assert.deepEqual(localSearchInput.candidateFilters, {
      workspaceId: 'workspace-alpha'
    });
    assert.equal(result.access.localMemoryFallbackUsed, true);
    assert.equal(serialized.includes('PRIVATE_FALLBACK_PROJECT_SHOULD_NOT_ECHO'), false);
    assert.equal(serialized.includes('PRIVATE_FALLBACK_SCOPE_SHOULD_NOT_ECHO'), false);
    assert.equal(serialized.includes('PRIVATE_FALLBACK_CLIENT_SHOULD_NOT_ECHO'), false);
    assert.equal(serialized.includes('PRIVATE_FALLBACK_VISIBILITY_SHOULD_NOT_ECHO'), false);
    assert.equal(serialized.includes('PRIVATE_NATIVE_FAILURE_SHOULD_NOT_ECHO'), false);
  });
});

test('primary_with_local_fallback sanitizes local audit fallback raw flag and window', async () => {
  const observations = [];
  let localAuditArgs = null;
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary_with_local_fallback',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
    governedMcpVcpNativeReadDelegationToolCaller: async payload => {
      throw governedNativeTransportErrorForPayload(payload, 'PRIVATE_NATIVE_FAILURE_SHOULD_NOT_ECHO');
    }
  }, async app => {
    const originalAuditRun = app.services.auditMemoryReadonlyService.run.bind(
      app.services.auditMemoryReadonlyService
    );
    app.services.auditMemoryReadonlyService.run = async args => {
      localAuditArgs = args;
      return originalAuditRun(args);
    };

    const result = await app.callTool('audit_memory', {
      audit_family: 'write',
      window: 200,
      include_raw: true,
      scope: {
        project_id: 'codex-memory',
        workspace_id: 'workspace-alpha',
        client_id: 'codex',
        visibility: 'private'
      }
    }, codexContext());
    const serializedResult = JSON.stringify(result);
    const serializedObservation = JSON.stringify(observations[0]);

    assert.equal(localAuditArgs.audit_family, 'write');
    assert.equal(localAuditArgs.window, 5);
    assert.equal(localAuditArgs.include_raw, false);
    assert.deepEqual(localAuditArgs.scope, {
      project_id: 'codex-memory',
      workspace_id: 'workspace-alpha',
      client_id: 'Codex',
      visibility: 'private'
    });
    assert.equal(result.access.localMemoryFallbackUsed, true);
    assert.equal(result.access.localMemoryFallbackReadPerformed, true);
    assert.equal(result.access.localFallbackAuditReceiptStatus, 'appended');
    assert.equal(serializedResult.includes('PRIVATE_NATIVE_FAILURE_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedObservation.includes('PRIVATE_NATIVE_FAILURE_SHOULD_NOT_ECHO'), false);
  });
});

test('primary_with_local_fallback returns empty local audit fallback for zero-item disclosure budget', async () => {
  let nativeCalls = 0;
  let localAuditCalled = false;
  const observations = [];
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary_with_local_fallback',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
    governedMcpVcpNativeReadDelegationToolCaller: async payload => {
      nativeCalls += 1;
      throw governedNativeTransportErrorForPayload(payload, 'PRIVATE_NATIVE_FAILURE_SHOULD_NOT_ECHO');
    }
  }, async app => {
    app.services.auditMemoryReadonlyService.run = async () => {
      localAuditCalled = true;
      return {
        findings: [{
          auditFamily: 'governance',
          decision: 'visible',
          reasonCode: 'LOCAL_AUDIT_FINDING_SHOULD_NOT_RETURN',
          lifecyclePolicy: 'LOCAL_AUDIT_POLICY_SHOULD_NOT_RETURN',
          scopePolicy: 'LOCAL_AUDIT_SCOPE_SHOULD_NOT_RETURN',
          redacted: true
        }]
      };
    };

    const result = await app.callTool('audit_memory', {
      audit_family: 'governance',
      window: 10,
      include_raw: false,
      scope: {
        project_id: 'codex-memory',
        workspace_id: 'workspace-alpha',
        client_id: 'codex',
        visibility: 'private'
      }
    }, codexContext({
      requestContext: {
        outputDisclosureBudget: {
          level: 'summary',
          lowDisclosure: true,
          rawOutput: false,
          maxItems: 0,
          maxBytes: 4096
        }
      }
    }));
    const serialized = JSON.stringify({ result, observations });

    assert.equal(nativeCalls, 1);
    assert.equal(localAuditCalled, false);
    assert.equal(result.status, 'AUDIT_MEMORY_READONLY_BOUNDED_ACCEPTED_NOT_PUBLIC');
    assert.deepEqual(result.findings, []);
    assert.equal(result.summary.requestedFamily, 'governance');
    assert.equal(result.summary.window, 0);
    assert.equal(result.access.localMemoryFallbackAttempted, true);
    assert.equal(result.access.localMemoryFallbackUsed, true);
    assert.equal(result.access.localMemoryFallbackReadPerformed, false);
    assert.equal(result.access.localMemoryFallbackReturned, true);
    assert.equal(result.access.localFallbackAuditReceiptStatus, 'appended');
    assert.equal(result.governedNativeReadFallback.localMemoryFallbackReadPerformed, false);
    assert.equal(observations[0].gateResult.normalizedBridgeRequest.disclosure_max_items, 0);
    assert.equal(serialized.includes('LOCAL_AUDIT_FINDING_SHOULD_NOT_RETURN'), false);
    assert.equal(serialized.includes('LOCAL_AUDIT_POLICY_SHOULD_NOT_RETURN'), false);
    assert.equal(serialized.includes('LOCAL_AUDIT_SCOPE_SHOULD_NOT_RETURN'), false);
    assert.equal(serialized.includes('PRIVATE_NATIVE_FAILURE_SHOULD_NOT_ECHO'), false);
  });
});

test('primary_with_local_fallback strips raw local fallback result fields at projection boundary', async () => {
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary_with_local_fallback',
    governedMcpVcpNativeReadDelegationToolCaller: async payload => {
      throw governedNativeTransportErrorForPayload(payload, 'PRIVATE_NATIVE_FAILURE_SHOULD_NOT_ECHO');
    }
  }, async app => {
    app.services.auditMemoryReadonlyService.run = async () => ({
      access: {
        rawOutputReturned: true,
        rawMemoryReturned: true,
        rawAuditReturned: true,
        pathsReturned: true,
        recentAuditReturned: true,
        tokenMaterialReturned: true,
        memoryContentReturned: true,
        memoryIdsReturned: true
      },
      content: 'RAW_LOCAL_CONTENT_SHOULD_NOT_ECHO',
      rawMemory: 'RAW_LOCAL_MEMORY_SHOULD_NOT_ECHO',
      rawOutput: 'RAW_LOCAL_OUTPUT_SHOULD_NOT_ECHO',
      rawAudit: 'RAW_LOCAL_AUDIT_SHOULD_NOT_ECHO',
      paths: ['/PRIVATE_LOCAL_PATH_SHOULD_NOT_ECHO'],
      recentAudit: ['PRIVATE_AUDIT_ROW_SHOULD_NOT_ECHO'],
      recentFiles: ['PRIVATE_FILE_SHOULD_NOT_ECHO'],
      memoryLinks: ['PRIVATE_MEMORY_LINK_SHOULD_NOT_ECHO'],
      tokenMaterial: 'PRIVATE_TOKEN_SHOULD_NOT_ECHO',
      endpoint: 'https://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
      locator: 'PRIVATE_LOCATOR_SHOULD_NOT_ECHO',
      api_key: 'PRIVATE_API_KEY_SHOULD_NOT_ECHO',
      'Bearer-Token': 'PRIVATE_BEARER_TOKEN_SHOULD_NOT_ECHO',
      openaiApiKey: 'PRIVATE_OPENAI_API_KEY_SHOULD_NOT_ECHO',
      absolutePath: '/PRIVATE_ABSOLUTE_PATH_SHOULD_NOT_ECHO',
      fileSystemPath: '/PRIVATE_FILESYSTEM_PATH_SHOULD_NOT_ECHO',
      URL: 'https://PRIVATE_URL_SHOULD_NOT_ECHO',
      endpointUrl: 'https://PRIVATE_ENDPOINT_URL_SHOULD_NOT_ECHO',
      rawResponseBody: 'PRIVATE_RAW_RESPONSE_BODY_SHOULD_NOT_ECHO',
      results: [{
        memoryId: 'PRIVATE_MEMORY_ID_SHOULD_NOT_ECHO',
        title: 'PRIVATE_TITLE_SHOULD_NOT_ECHO',
        snippet: 'PRIVATE_SNIPPET_SHOULD_NOT_ECHO',
        content: 'PRIVATE_RESULT_CONTENT_SHOULD_NOT_ECHO',
        path: '/PRIVATE_RESULT_PATH_SHOULD_NOT_ECHO',
        score: 0.7,
        counters: {
          contentHitCount: 1,
          rawContent: 'PRIVATE_NESTED_RAW_CONTENT_SHOULD_NOT_ECHO',
          token: 'PRIVATE_NESTED_TOKEN_SHOULD_NOT_ECHO',
          provider_api_key: 'PRIVATE_NESTED_PROVIDER_KEY_SHOULD_NOT_ECHO',
          Authorization: 'PRIVATE_NESTED_AUTHORIZATION_SHOULD_NOT_ECHO',
          credentialValue: 'PRIVATE_NESTED_CREDENTIAL_SHOULD_NOT_ECHO',
          secretValue: 'PRIVATE_NESTED_SECRET_SHOULD_NOT_ECHO',
          authToken: 'PRIVATE_NESTED_AUTH_TOKEN_SHOULD_NOT_ECHO',
          publicCount: 2
        }
      }]
    });

    const result = await app.callTool('audit_memory', {}, codexContext());
    const serializedResult = JSON.stringify(result);

    assert.equal(result.access.localMemoryFallbackUsed, true);
    assert.equal(result.access.rawOutputReturned, false);
    assert.equal(result.access.rawMemoryReturned, false);
    assert.equal(result.access.rawAuditReturned, false);
    assert.equal(result.access.pathsReturned, false);
    assert.equal(result.access.recentAuditReturned, false);
    assert.equal(result.access.tokenMaterialReturned, false);
    assert.equal(result.access.memoryContentReturned, false);
    assert.equal(result.access.memoryIdsReturned, false);
    assert.equal(result.content, undefined);
    assert.equal(result.rawMemory, undefined);
    assert.equal(result.rawOutput, undefined);
    assert.equal(result.rawAudit, undefined);
    assert.equal(result.paths, undefined);
    assert.equal(result.recentAudit, undefined);
    assert.equal(result.recentFiles, undefined);
    assert.equal(result.memoryLinks, undefined);
    assert.equal(result.tokenMaterial, undefined);
    assert.equal(result.endpoint, undefined);
    assert.equal(result.locator, undefined);
    assert.equal(result.api_key, undefined);
    assert.equal(result['Bearer-Token'], undefined);
    assert.equal(result.openaiApiKey, undefined);
    assert.equal(result.absolutePath, undefined);
    assert.equal(result.fileSystemPath, undefined);
    assert.equal(result.URL, undefined);
    assert.equal(result.endpointUrl, undefined);
    assert.equal(result.rawResponseBody, undefined);
    assert.equal(result.results[0].memoryId, undefined);
    assert.equal(result.results[0].title, undefined);
    assert.equal(result.results[0].snippet, undefined);
    assert.equal(result.results[0].content, undefined);
    assert.equal(result.results[0].path, undefined);
    assert.equal(result.results[0].score, 0.7);
    assert.equal(result.results[0].counters.contentHitCount, 1);
    assert.equal(result.results[0].counters.rawContent, undefined);
    assert.equal(result.results[0].counters.token, undefined);
    assert.equal(result.results[0].counters.provider_api_key, undefined);
    assert.equal(result.results[0].counters.Authorization, undefined);
    assert.equal(result.results[0].counters.credentialValue, undefined);
    assert.equal(result.results[0].counters.secretValue, undefined);
    assert.equal(result.results[0].counters.authToken, undefined);
    assert.equal(result.results[0].counters.publicCount, 2);
    assert.equal(serializedResult.includes('RAW_LOCAL_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('RAW_LOCAL_MEMORY_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('PRIVATE_LOCAL_PATH_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('PRIVATE_TOKEN_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('PRIVATE_MEMORY_ID_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('PRIVATE_RESULT_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('PRIVATE_NESTED_TOKEN_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('PRIVATE_API_KEY_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('PRIVATE_BEARER_TOKEN_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('PRIVATE_OPENAI_API_KEY_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('PRIVATE_FILESYSTEM_PATH_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('PRIVATE_ENDPOINT_URL_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('PRIVATE_RAW_RESPONSE_BODY_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('PRIVATE_NESTED_PROVIDER_KEY_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('PRIVATE_NESTED_AUTHORIZATION_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('PRIVATE_NESTED_CREDENTIAL_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('PRIVATE_NESTED_SECRET_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('PRIVATE_NESTED_AUTH_TOKEN_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('PRIVATE_NATIVE_FAILURE_SHOULD_NOT_ECHO'), false);
  });
});

test('primary_with_local_fallback uses bounded local memory_overview projection only', async () => {
  const observations = [];
  let nativeCalls = 0;
  let fullOverviewCalls = 0;
  let boundedOverviewCalls = 0;
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary_with_local_fallback',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
    governedMcpVcpNativeReadDelegationToolCaller: async payload => {
      nativeCalls += 1;
      throw governedNativeTransportErrorForPayload(payload, 'PRIVATE_NATIVE_OVERVIEW_FAILURE_SHOULD_NOT_ECHO');
    }
  }, async app => {
    const originalBoundedOverview = app.services.overviewService.getAuthenticatedBoundedOverview.bind(
      app.services.overviewService
    );
    app.services.overviewService.getOverview = async () => {
      fullOverviewCalls += 1;
      throw new Error('full local overview must not run for governed fallback');
    };
    app.services.overviewService.getAuthenticatedBoundedOverview = async (...args) => {
      boundedOverviewCalls += 1;
      return originalBoundedOverview(...args);
    };

    const result = await app.callTool('memory_overview', {
      auditWindow: 200,
      limit: 200,
      scope: {
        project_id: 'codex-memory',
        workspace_id: 'workspace-alpha',
        client_id: 'codex',
        visibility: 'private'
      }
    }, codexContext());
    const serializedResult = JSON.stringify(result);
    const serializedObservation = JSON.stringify(observations[0]);

    assert.equal(nativeCalls, 1);
    assert.equal(fullOverviewCalls, 0);
    assert.equal(boundedOverviewCalls, 1);
    assert.equal(result.access.mode, 'authenticated_bounded_overview');
    assert.equal(result.access.primaryRuntime, 'VCPToolBox native memory');
    assert.equal(result.access.localMemoryRole, 'fallback');
    assert.equal(result.access.localMemoryFallbackUsed, true);
    assert.equal(result.access.localMemoryFallbackReadPerformed, true);
    assert.equal(result.access.localFallbackAuditReceiptStatus, 'appended');
    assert.equal(result.access.pathsReturned, false);
    assert.equal(result.access.recentAuditReturned, false);
    assert.equal(result.access.recentFilesReturned, false);
    assert.equal(result.access.memoryLinksReturned, false);
    assert.equal(result.paths, undefined);
    assert.equal(result.recentAudit, undefined);
    assert.equal(result.recentFiles, undefined);
    assert.equal(result.memoryLinks, undefined);
    assert.equal(result.governedNativeReadFallback.reasonCode, 'native_read_delegation_transport_error');
    assert.equal(result.governedNativeReadFallback.localFallbackAuditReceipt.status, 'appended');
    const fallbackResultCoverage =
      validateGovernedMcpReadFallbackToolResultCoversLocalMemoryRole(result);
    assert.equal(fallbackResultCoverage.accepted, true, fallbackResultCoverage.blockers.join(', '));
    assert.equal(fallbackResultCoverage.vcpNativeResult, false);
    assert.equal(fallbackResultCoverage.resultCanBeMistakenForVcpNative, false);
    assert.equal(fallbackResultCoverage.readinessClaimed, false);
    assert.equal(observations[0].readDelegationResult.accepted, false);
    assert.equal(observations[0].bridgeAuditReceiptResult.accepted, true);
    assert.equal(serializedResult.includes('PRIVATE_NATIVE_OVERVIEW_FAILURE_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('workspace-alpha'), false);
    assert.equal(serializedResult.includes('codex-memory'), false);
    assert.equal(serializedObservation.includes('PRIVATE_NATIVE_OVERVIEW_FAILURE_SHOULD_NOT_ECHO'), false);
  });
});

test('primary_with_local_fallback rejects local fallback when fallback audit receipt cannot be appended', async () => {
  const observations = [];
  let nativeCalls = 0;
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary_with_local_fallback',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
    governedMcpVcpNativeReadDelegationToolCaller: async payload => {
      nativeCalls += 1;
      throw governedNativeTransportErrorForPayload(payload, 'PRIVATE_NATIVE_FAILURE_SHOULD_NOT_ECHO');
    }
  }, async app => {
    let localAuditCalls = 0;
    const originalAuditRun = app.services.auditMemoryReadonlyService.run.bind(
      app.services.auditMemoryReadonlyService
    );
    app.services.auditMemoryReadonlyService.run = async (...runArgs) => {
      localAuditCalls += 1;
      return originalAuditRun(...runArgs);
    };

    const originalAppend = app.stores.auditLogStore.appendWriteAudit.bind(app.stores.auditLogStore);
    app.stores.auditLogStore.appendWriteAudit = async entry => {
      if (entry.eventType === 'governed_mcp_vcp_native_read_fallback_receipt') {
        throw new Error('PRIVATE_FALLBACK_AUDIT_FAILURE_SHOULD_NOT_ECHO');
      }
      return originalAppend(entry);
    };

    const result = await app.callTool('audit_memory', {}, codexContext());
    const auditEntries = await app.stores.auditLogStore.readRecentWriteAudit(10);
    const fallbackReceipt = auditEntries.find(entry =>
      entry.eventType === 'governed_mcp_vcp_native_read_fallback_receipt' &&
      entry.toolName === 'audit_memory'
    );
    const serializedResult = JSON.stringify(result);
    const serializedObservation = JSON.stringify(observations[0]);
    const serializedAudit = JSON.stringify(auditEntries);

    assert.equal(nativeCalls, 1);
    assert.equal(localAuditCalls, 0);
    assert.equal(result.accepted, false);
    assert.equal(result.status, 'GOVERNED_MCP_VCP_NATIVE_READ_FALLBACK_REJECTED');
    assert.equal(result.reasonCode, 'required_read_fallback_audit_receipt_not_appended');
    assert.equal(result.access.mode, 'governed_mcp_vcp_native_primary_read_local_fallback');
    assert.equal(result.access.localMemoryFallbackAttempted, true);
    assert.equal(result.access.localMemoryFallbackUsed, false);
    assert.equal(result.access.localMemoryFallbackReadPerformed, false);
    assert.equal(result.access.localMemoryFallbackReturned, false);
    assert.equal(result.access.localMemoryFallbackReasonCode, 'native_read_delegation_transport_error');
    assert.equal(result.access.localFallbackAuditReceiptStatus, 'not_appended');
    assert.equal(result.access.fallbackRequiresAuditReceipt, true);
    assert.equal(result.access.fallbackAfterAuditReceiptAppended, true);
    assert.equal(result.access.vcpNativeResult, false);
    assert.equal(result.access.resultCanBeMistakenForVcpNative, false);
    assert.equal(result.access.rawMemoryReturned, false);
    assert.equal(result.governedNativeReadFallback.used, false);
    assert.equal(result.governedNativeReadFallback.localMemoryFallbackAttempted, true);
    assert.equal(result.governedNativeReadFallback.localMemoryFallbackReadPerformed, false);
    assert.equal(result.governedNativeReadFallback.localMemoryFallbackReturned, false);
    assert.equal(result.governedNativeReadFallback.localMemoryRole, 'fallback');
    assert.equal(result.governedNativeReadFallback.localMemorySourceRuntime, 'codex_memory_local_fallback');
    assert.equal(result.governedNativeReadFallback.localFallbackAuditReceipt.status, 'not_appended');
    assert.equal(
      result.governedNativeReadFallback.localFallbackAuditReceipt.reasonCode,
      'read_fallback_audit_receipt_append_failed'
    );
    assert.equal(result.receipt.auditReceiptRequiredButNotAppended, true);
    assert.equal(result.receipt.statusClass, 'fallback_audit_receipt_not_appended');
    assert.equal(result.receipt.localFallbackAuditReceipt.status, 'not_appended');
    assert.equal(fallbackReceipt, undefined);
    assert.equal(observations[0].readDelegationResult.accepted, false);
    assert.equal(observations[0].bridgeAuditReceiptResult.accepted, true);
    assert.equal(serializedResult.includes('PRIVATE_NATIVE_FAILURE_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('PRIVATE_FALLBACK_AUDIT_FAILURE_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedObservation.includes('PRIVATE_NATIVE_FAILURE_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedObservation.includes('PRIVATE_FALLBACK_AUDIT_FAILURE_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedAudit.includes('PRIVATE_NATIVE_FAILURE_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedAudit.includes('PRIVATE_FALLBACK_AUDIT_FAILURE_SHOULD_NOT_ECHO'), false);
  });
});

test('primary_with_local_fallback rejects over-budget native read without local fallback', async () => {
  const observations = [];
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary_with_local_fallback',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
    governedMcpVcpNativeReadDelegationToolCaller: async payload => {
      assert.equal(payload.toolName, 'search_memory');
      assert.equal(payload.arguments.limit, 5);
      return {
        results: [
          { content: 'RAW_NATIVE_CONTENT_1_SHOULD_NOT_ECHO' },
          { content: 'RAW_NATIVE_CONTENT_2_SHOULD_NOT_ECHO' },
          { content: 'RAW_NATIVE_CONTENT_3_SHOULD_NOT_ECHO' },
          { content: 'RAW_NATIVE_CONTENT_4_SHOULD_NOT_ECHO' },
          { content: 'RAW_NATIVE_CONTENT_5_SHOULD_NOT_ECHO' },
          { content: 'RAW_NATIVE_CONTENT_6_SHOULD_NOT_ECHO' }
        ]
      };
    }
  }, async app => {
    let localSearchCalls = 0;
    app.services.passiveRecallService.search = async () => {
      localSearchCalls += 1;
      return { results: [{ content: 'LOCAL_FALLBACK_CONTENT_SHOULD_NOT_ECHO' }] };
    };

    const result = await app.callTool('search_memory', {
      query: 'over budget native response',
      target: 'both',
      limit: 10,
      include_content: false,
      scope: {
        project_id: 'codex-memory',
        workspace_id: 'workspace-alpha',
        client_id: 'codex',
        visibility: 'private'
      }
    }, codexContext());
    const serializedResult = JSON.stringify(result);
    const serializedObservation = JSON.stringify(observations[0]);

    assert.equal(localSearchCalls, 0);
    assert.equal(result.status, 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATION_REJECTED');
    assert.equal(result.reasonCode, 'native_read_delegation_output_budget_exceeded');
    assert.equal(result.access.runtimeCalled, true);
    assert.equal(result.access.memoryReadPerformed, true);
    assert.equal(result.access.localMemoryFallbackEligible, false);
    assert.equal(observations[0].readDelegationResult.accepted, false);
    assert.equal(observations[0].readDelegationResult.receipt.outputBudgetExceeded, true);
    assert.equal(serializedResult.includes('RAW_NATIVE_CONTENT_1_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('LOCAL_FALLBACK_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedObservation.includes('RAW_NATIVE_CONTENT_6_SHOULD_NOT_ECHO'), false);
  });
});

test('primary read delegation ignores raw-output tool argument before native read', async () => {
  const observations = [];
  let nativePayload = null;
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
    governedMcpVcpNativeReadDelegationToolCaller: async payload => {
      nativePayload = payload;
      return [];
    }
  }, async app => {
    let localSearchCalls = 0;
    app.services.passiveRecallService.search = async () => {
      localSearchCalls += 1;
      return { results: [{ content: 'LOCAL_RAW_CONTENT_SHOULD_NOT_ECHO' }] };
    };

    const result = await app.callTool('search_memory', {
      query: 'raw output tool argument must not authorize disclosure',
      target: 'both',
      limit: 3,
      include_content: true,
      scope: {
        project_id: 'codex-memory',
        workspace_id: 'workspace-alpha',
        client_id: 'codex',
        visibility: 'private'
      }
    }, codexContext());
    const serializedResult = JSON.stringify(result);
    const serializedObservation = JSON.stringify(observations[0]);

    assert.equal(localSearchCalls, 0);
    assert.equal(result.status, 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATED');
    assert.equal(result.access.runtimeCalled, true);
    assert.equal(observations[0].gateResult.accepted, true);
    assert.equal(observations[0].readDelegationResult.accepted, true);
    assert.equal(nativePayload.arguments.include_content, false);
    assert.equal(nativePayload.arguments.limit, 3);
    assert.equal(nativePayload.arguments.governed_bridge.raw_output_allowed, false);
    assert.equal(nativePayload.arguments.governed_bridge.disclosure_level, 'summary');
    assert.equal(nativePayload.arguments.governed_bridge.disclosure_max_items, 5);
    assert.equal(serializedResult.includes('LOCAL_RAW_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedObservation.includes('LOCAL_RAW_CONTENT_SHOULD_NOT_ECHO'), false);
  });
});

test('primary_with_local_fallback does not fallback when governed read gate rejects', async () => {
  const observations = [];
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary_with_local_fallback',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
    governedMcpVcpNativeReadDelegationToolCaller: async () => {
      throw new Error('native should not be called after gate rejection');
    }
  }, async app => {
    let localAuditCalls = 0;
    const originalAuditRun = app.services.auditMemoryReadonlyService.run.bind(
      app.services.auditMemoryReadonlyService
    );
    app.services.auditMemoryReadonlyService.run = async (...args) => {
      localAuditCalls += 1;
      return originalAuditRun(...args);
    };

    const result = await app.callTool('audit_memory', {
      scope: {
        project_id: 'codex-memory',
        workspace_id: 'workspace-alpha',
        client_id: 'codex',
        visibility: 'private'
      }
    }, codexContext({
      requestContext: {
        outputDisclosureBudget: {
          level: 'structured',
          lowDisclosure: false,
          rawOutput: true,
          maxItems: 5,
          maxBytes: 4096
        }
      }
    }));

    assert.equal(localAuditCalls, 0);
    assert.equal(result.decision, 'rejected');
    assert.equal(result.reasonCode, 'governed_mcp_vcp_native_bridge_gate_rejected');
    assert.equal(result.access.memoryReadPerformed, false);
    assert.equal(observations[0].gateResult.accepted, false);
    assert.equal(observations[0].readDelegationResult, null);
    assert.ok(observations[0].gateResult.blockers.includes(
      'output_disclosure_budget_must_be_low_disclosure_and_bounded'
    ));
  });
});

test('primary write delegation sends record_memory to governed native MCP and skips local write', async () => {
  const observations = [];
  const secretToken = 'SECRET_TOKEN_FOR_PRIMARY_WRITE_SHOULD_NOT_ECHO';
  const rawWriteContent = 'RAW_WRITE_CONTENT_SHOULD_NOT_ECHO';
  const rawNativeValue = 'RAW_NATIVE_WRITE_RESPONSE_SHOULD_NOT_ECHO';
  const server = await withJsonRpcServer(async (req, res, body) => {
    assert.equal(body.method, 'tools/call');
    assert.equal(body.params.name, 'knowledge_base.record');
    const delegatedCoverage =
      validateGovernedMcpNativeDelegatedArgumentsCoversCurrentProductGoal(body.params.arguments, {
        toolName: 'record_memory'
      });

    assert.equal(delegatedCoverage.accepted, true, delegatedCoverage.blockers.join(', '));
    assert.equal(delegatedCoverage.direction, 'write');
    assert.equal(body.params.arguments.content, rawWriteContent);
    assert.equal(body.params.arguments.governed_bridge.primary_runtime, 'VCPToolBox native memory');
    assert.deepEqual(body.params.arguments.governed_bridge.runtime_target, {
      primary_runtime: 'VCPToolBox native memory',
      target_reference_name: 'operator-vcp-toolbox-service-ref',
      target_kind: 'mcp_server',
      source_authority: 'bridge_runtime_or_static_config',
      forbidden_field_count: 0,
      bound: true,
      tool_arguments_may_override: false,
      governance_metadata_may_override: false,
      locator_included: false,
      endpoint_included: false,
      token_material_included: false,
      locator_disclosed: false,
      endpoint_disclosed: false,
      token_material_disclosed: false
    });
    assert.equal(body.params.arguments.governed_bridge.read_allowed, false);
    assert.equal(body.params.arguments.governed_bridge.write_allowed, true);
    assert.equal(body.params.arguments.governed_bridge.write_policy, 'exact_approval');
    assert.equal(body.params.arguments.governed_bridge.read_write_authority_source, 'bridge_tool_binding');
    assert.equal(body.params.arguments.governed_bridge.read_write_authority_bound, true);
    assert.equal(body.params.arguments.governed_bridge.mixed_read_write_allowed, false);
    assert.equal(body.params.arguments.governed_bridge.unbounded_write_allowed, false);
    assert.equal(body.params.arguments.governed_bridge.write_requires_exact_approval, true);
    assert.equal(
      body.params.arguments.governed_bridge.exact_approval_action,
      'live_bridge_record_memory_proof'
    );
    assert.equal(body.params.arguments.governed_bridge.exact_approval_scope_matched, true);
    assert.equal(body.params.arguments.governed_bridge.exact_approval_runtime_target_matched, true);
    assert.equal(body.params.arguments.governed_bridge.exact_approval_rollback_plan_matched, true);
    assert.equal(body.params.arguments.governed_bridge.raw_output_allowed, false);
    assert.equal(body.params.arguments.governed_bridge.disclosure_level, 'summary');
    assert.equal(body.params.arguments.governed_bridge.disclosure_max_items, 5);
    assert.equal(body.params.arguments.governed_bridge.disclosure_max_bytes, 4096);
    assert.equal(body.params.arguments.governed_bridge.output_disclosure_budget_bound, true);
    assert.equal(body.params.arguments.governed_bridge.over_budget_fallback_to_raw_output, false);
    assert.equal(body.params.arguments.governed_bridge.raw_response_body_disclosed, false);
    assert.equal(body.params.arguments.governed_bridge.audit_receipt_required, true);
    assert.equal(body.params.arguments.governed_bridge.audit_receipt_low_disclosure, true);
    assert.equal(body.params.arguments.governed_bridge.audit_receipt_reference_present, true);
    assert.equal(
      body.params.arguments.governed_bridge.audit_receipt_event_type,
      'governed_mcp_vcp_native_bridge_receipt'
    );
    assert.equal(body.params.arguments.governed_bridge.audit_receipt_append_required, true);
    assert.equal(body.params.arguments.governed_bridge.audit_receipt_low_disclosure_bound, true);
    assert.equal(body.params.arguments.governed_bridge.audit_raw_request_body_persisted, false);
    assert.equal(body.params.arguments.governed_bridge.audit_raw_response_body_persisted, false);
    assert.equal(
      body.params.arguments.governed_bridge.audit_receipt_reference_name,
      'governed-mcp-record_memory-receipt'
    );
    assert.equal(
      body.params.arguments.governed_bridge.rollback_plan_reference_name,
      'cm-governed-write-rollback-plan'
    );
    assert.equal(body.params.arguments.governed_bridge.rollback_plan_reference_present, true);
    assert.equal(body.params.arguments.governed_bridge.rollback_plan_reference_safe, true);
    assert.equal(body.params.arguments.governed_bridge.rollback_posture_bound, true);
    assert.equal(body.params.arguments.governed_bridge.rollback_plan_shape_only, true);
    assert.equal(body.params.arguments.governed_bridge.rollback_auto_apply_allowed, false);
    assert.equal(body.params.arguments.governed_bridge.rollback_apply_requires_governed_followup, true);
    assert.equal(body.params.arguments.governed_bridge.rollback_raw_plan_disclosed, false);
    assert.equal(body.params.arguments.governed_bridge.rollback_raw_plan_persisted, false);
    assert.equal(body.params.arguments.governed_bridge.low_disclosure, true);
    assert.equal(body.params.arguments.governed_bridge.access_path, 'governed MCP tools');
    assert.equal(JSON.stringify(body.params.arguments.governed_bridge).includes(rawWriteContent), false);
    assert.equal(JSON.stringify(body.params.arguments.governed_bridge).includes(server.url), false);
    assert.equal(JSON.stringify(body.params.arguments.governed_bridge).includes(secretToken), false);
    assert.deepEqual(body.params.arguments.scope, {
      project_id: 'codex-memory',
      scope_id: 'scope-alpha',
      workspace_id: 'workspace-alpha',
      client_id: 'Codex',
      visibility: 'private'
    });
    assert.deepEqual(body.params.arguments.governed_bridge.scope, body.params.arguments.scope);
    assert.equal(body.params.arguments.governed_bridge.local_memory_role, 'not_used');
    assert.equal(body.params.arguments.governed_bridge.local_memory_source_runtime, null);
    assert.equal(body.params.arguments.governed_bridge.local_memory_primary_runtime, false);
    assert.equal(body.params.arguments.governed_bridge.local_memory_fallback_used, false);
    assert.equal(body.params.arguments.governed_bridge.local_memory_result_returned, false);
    assert.equal(body.params.arguments.governed_bridge.local_memory_result_can_be_mistaken_for_vcp_native, false);
    assert.equal(body.params.arguments.governed_bridge.local_memory_raw_content_disclosed, false);
    assert.equal(body.params.arguments.governed_bridge.scope_present, true);
    assert.equal(body.params.arguments.governed_bridge.scope_identifier_present, true);
    assert.equal(body.params.arguments.governed_bridge.scope_identifier_safe, true);
    assert.deepEqual(body.params.arguments.governed_bridge.scope_field_names, [
      'client_id',
      'project_id',
      'scope_id',
      'visibility',
      'workspace_id'
    ]);
    assert.deepEqual(body.params.arguments.governed_bridge.scope_identifier_field_names, [
      'project_id',
      'scope_id',
      'workspace_id'
    ]);
    assert.equal(
      body.params.arguments.governed_bridge.scope_fingerprint,
      'f34c14c55b2f97e90cee55b0ad91abeff0941991b895e0ca64e3d9248b98c3d8'
    );
    assert.equal(body.params.arguments.governed_bridge.raw_scope_persisted, false);
    assert.equal(body.params.arguments.governed_bridge.trusted_execution_context_supplied, true);
    assert.equal(body.params.arguments.governed_bridge.trusted_execution_context_accepted, true);
    assert.equal(body.params.arguments.governed_bridge.trusted_execution_context_scope_matched, true);
    assert.equal(body.params.arguments.governed_bridge.invocation_profile_source, 'bridge_tool_binding');
    assert.equal(body.params.arguments.governed_bridge.invocation_profile_bound, true);
    assert.equal(body.params.arguments.governed_bridge.invocation_profile_tool_arguments_may_override, false);
    assert.equal(
      body.params.arguments.governed_bridge.invocation_profile_governance_metadata_may_override,
      false
    );
    assert.equal(body.params.arguments.governed_bridge.invocation_transport, 'mcp');
    assert.equal(body.params.arguments.governed_bridge.invocation_tool_name, 'record_memory');
    assert.equal(body.params.arguments.governed_bridge.invocation_profile_tool_match, true);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      id: body.id,
      result: {
        structuredContent: {
          memory_id: 'RAW_MEMORY_ID_SHOULD_NOT_ECHO',
          content: rawNativeValue
        }
      }
    }));
  });

  try {
    await withTempApp({
      governedMcpVcpNativeBridgeGateMode: 'observe',
      governedMcpVcpNativeWriteDelegationMode: 'primary',
      governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
      governedMcpVcpNativeHttpMcpTarget: {
        endpoint: server.url,
        bearerToken: secretToken,
        mcpToolNameByAction: {
          record_memory: 'knowledge_base.record'
        },
        requestTimeoutMs: 1000
      }
    }, async app => {
      let localWrites = 0;
      app.services.writeService.record = async () => {
        localWrites += 1;
        return { success: true };
      };

      const result = await app.callTool('record_memory', {
        target: 'knowledge',
        title: 'Governed native write',
        content: rawWriteContent,
        evidence: 'exact approval recorded',
        validated: true,
        reusable: true,
        sensitivity: 'none'
      }, codexContext({
        executionContext: {
          scopeId: 'scope-alpha'
        },
        requestContext: {
          exactApprovalResult: exactWriteApprovalResult({
            allowedScope: {
              project_id: 'codex-memory',
              scope_id: 'scope-alpha',
              workspace_id: 'workspace-alpha',
              client_id: 'Codex',
              visibility: 'private'
            }
          }),
          rollbackPosture: {
            mode: 'bounded_rollback_plan',
            rollback_plan_ref: 'cm-governed-write-rollback-plan'
          }
        }
      }));
      const auditEntries = await app.stores.auditLogStore.readRecentWriteAudit(10);
      const bridgeReceipt = auditEntries.find(entry =>
        entry.eventType === 'governed_mcp_vcp_native_bridge_receipt' &&
        entry.toolName === 'record_memory'
      );
      const serializedResult = JSON.stringify(result);
      const serializedObservation = JSON.stringify(observations[0]);
      const serializedAudit = JSON.stringify(auditEntries);
      const overviewStatus = app.services.governedNativeBridgeObservationStore.getStatus();
      const overviewCoverage =
        validateGovernedMcpOverviewStatusCoversCurrentProductGoal(overviewStatus);

      assert.equal(server.requests.length, 1);
      assert.equal(overviewCoverage.accepted, true, overviewCoverage.blockers.join(', '));
      assert.equal(overviewCoverage.direction, 'write');
      assert.equal(overviewStatus.latest.toolName, 'record_memory');
      assert.equal(server.requests[0].headers.authorization, `Bearer ${secretToken}`);
      assert.equal(server.requests[0].body.params.name, 'knowledge_base.record');
      assert.equal(localWrites, 0);
      assert.equal(result.status, 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATED');
      assert.equal(result.access.primaryRuntime, 'VCPToolBox native memory');
      assert.equal(result.access.memoryWritePerformed, true);
      assert.equal(result.access.localMemoryFallbackUsed, false);
      assert.equal(result.receipt.nativeInvocationReceipt.transportCategory, 'local_http_transport');
      assert.equal(result.receipt.nativeInvocationReceipt.mcpMethod, 'tools/call');
      assert.equal(result.receipt.nativeInvocationReceipt.toolName, 'record_memory');
      assert.equal(result.receipt.nativeInvocationReceipt.invocationBindingMatched, true);
      assert.equal(result.receipt.nativeInvocationReceipt.statusClass, 'success');
      assert.equal(result.receipt.nativeInvocationReceipt.httpStatusClass, 'success');
      assert.equal(result.receipt.nativeInvocationReceipt.rawRequestBodyDisclosed, false);
      assert.equal(result.receipt.localAuditReceipt.status, 'appended');
      assert.equal(bridgeReceipt.delegationDirection, 'write');
      assert.equal(bridgeReceipt.scopePresent, true);
      assert.equal(bridgeReceipt.scopeIdentifierPresent, true);
      assert.deepEqual(bridgeReceipt.scopeFieldNames, [
        'client_id',
        'project_id',
        'scope_id',
        'visibility',
        'workspace_id'
      ]);
      assert.deepEqual(bridgeReceipt.scopeIdentifierFieldNames, [
        'project_id',
        'scope_id',
        'workspace_id'
      ]);
      assert.equal(bridgeReceipt.rawScopePersisted, false);
      assert.equal(bridgeReceipt.trustedExecutionContextSupplied, true);
      assert.equal(bridgeReceipt.trustedExecutionContextAccepted, true);
      assert.equal(bridgeReceipt.trustedExecutionContextScopeMatched, true);
      assert.equal(bridgeReceipt.writeAllowed, true);
      assert.equal(bridgeReceipt.writePolicy, 'exact_approval');
      assert.equal(bridgeReceipt.readWriteAuthoritySource, 'bridge_tool_binding');
      assert.equal(bridgeReceipt.readWriteAuthorityBound, true);
      assert.equal(bridgeReceipt.mixedReadWriteAllowed, false);
      assert.equal(bridgeReceipt.unboundedWriteAllowed, false);
      assert.equal(bridgeReceipt.writeRequiresExactApproval, true);
      assert.equal(bridgeReceipt.exactApprovalAction, 'live_bridge_record_memory_proof');
      assert.equal(bridgeReceipt.exactApprovalActionMatched, true);
      assert.equal(bridgeReceipt.exactApprovalScopeMatched, true);
      assert.equal(bridgeReceipt.exactApprovalRuntimeTargetMatched, true);
      assert.equal(bridgeReceipt.exactApprovalRollbackPlanMatched, true);
      assert.equal(bridgeReceipt.exactApprovalScopeReferencesSafe, true);
      assert.equal(bridgeReceipt.exactApprovalScopeVisibilityAccepted, true);
      assert.equal(bridgeReceipt.exactApprovalRuntimeTargetReferenceSafe, true);
      assert.equal(bridgeReceipt.exactApprovalRuntimeTargetKindAccepted, true);
      assert.equal(bridgeReceipt.exactApprovalRuntimeTargetPrimaryRuntimeAccepted, true);
      assert.equal(bridgeReceipt.exactApprovalRollbackPlanReferencePresent, true);
      assert.equal(bridgeReceipt.exactApprovalRollbackPlanReferenceSafe, true);
      assert.equal(bridgeReceipt.exactApprovalForbiddenFieldCount, 0);
      assert.equal(bridgeReceipt.targetReferenceName, 'operator-vcp-toolbox-service-ref');
      assert.equal(bridgeReceipt.runtimeTargetKind, 'mcp_server');
      assert.equal(bridgeReceipt.runtimeTargetSourceAuthority, 'bridge_runtime_or_static_config');
      assert.equal(bridgeReceipt.disclosureLevel, 'summary');
      assert.equal(bridgeReceipt.disclosureMaxItems, 5);
      assert.equal(bridgeReceipt.disclosureMaxBytes, 4096);
      assert.equal(bridgeReceipt.auditReceiptReferenceName, 'governed-mcp-record_memory-receipt');
      assert.equal(bridgeReceipt.localMemoryRole, 'not_used');
      assert.equal(bridgeReceipt.localMemorySourceRuntime, null);
      assert.equal(bridgeReceipt.localMemoryPrimaryRuntime, false);
      assert.equal(bridgeReceipt.localMemoryFallbackUsed, false);
      assert.equal(bridgeReceipt.localMemoryResultReturned, false);
      assert.equal(bridgeReceipt.localMemoryResultCanBeMistakenForVcpNative, false);
      assert.equal(bridgeReceipt.localMemoryRawContentDisclosed, false);
      assert.equal(bridgeReceipt.rollbackPosture, 'bounded_rollback_plan');
      assert.equal(bridgeReceipt.rollbackPlanReferenceName, 'cm-governed-write-rollback-plan');
      assert.equal(bridgeReceipt.rollbackPlanBound, true);
      assert.equal(bridgeReceipt.rollbackPostureBound, true);
      assert.equal(bridgeReceipt.rollbackPlanShapeOnly, true);
      assert.equal(bridgeReceipt.rollbackRequired, false);
      assert.equal(bridgeReceipt.rollbackDisposition, 'no_rollback_required');
      assert.equal(bridgeReceipt.rollbackFollowupRequired, false);
      assert.equal(bridgeReceipt.rollbackApplyPolicy, 'not_applicable');
      assert.equal(bridgeReceipt.rollbackApplyAttempted, false);
      assert.equal(bridgeReceipt.rollbackAutoApplyAllowed, false);
      assert.equal(bridgeReceipt.rollbackRawPlanDisclosed, false);
      assert.equal(bridgeReceipt.rollbackRawPlanPersisted, false);
      assert.equal(bridgeReceipt.nativeTransportCategory, 'local_http_transport');
      assert.equal(bridgeReceipt.nativeMcpMethod, 'tools/call');
      assert.equal(bridgeReceipt.nativeToolName, 'record_memory');
      assert.equal(bridgeReceipt.nativeInvocationStatusClass, 'success');
      assert.equal(bridgeReceipt.nativeInvocationHttpStatusClass, 'success');
      assert.equal(bridgeReceipt.rawRequestBodyPersisted, false);
      assert.equal(bridgeReceipt.memoryContentDisclosed, false);
      assert.equal(observations[0].writeDelegationResult.accepted, true);
      assert.equal(observations[0].bridgeAuditReceiptResult.accepted, true);
      assert.equal(serializedResult.includes(server.url), false);
      assert.equal(serializedResult.includes(secretToken), false);
      assert.equal(serializedAudit.includes('scope-alpha'), false);
      assert.equal(serializedResult.includes(rawWriteContent), false);
      assert.equal(serializedResult.includes(rawNativeValue), false);
      assert.equal(serializedObservation.includes(server.url), false);
      assert.equal(serializedObservation.includes(secretToken), false);
      assert.equal(serializedObservation.includes(rawWriteContent), false);
      assert.equal(serializedObservation.includes(rawNativeValue), false);
      assert.equal(serializedAudit.includes(server.url), false);
      assert.equal(serializedAudit.includes(secretToken), false);
      assert.equal(serializedAudit.includes(rawWriteContent), false);
      assert.equal(serializedAudit.includes(rawNativeValue), false);
    });
  } finally {
    await server.close();
  }
});

test('primary write delegation binds every governed write tool on the real app path', async () => {
  const writeCases = [
    {
      toolName: 'record_memory',
      exactApprovalAction: 'live_bridge_record_memory_proof',
      args: {
        target: 'knowledge',
        title: 'Governed native record proof',
        content: 'RAW_RECORD_CONTENT_SHOULD_NOT_ECHO',
        evidence: 'exact approval recorded',
        validated: true,
        reusable: true,
        sensitivity: 'none'
      },
      localCounterName: 'record'
    },
    {
      toolName: 'tombstone_memory',
      exactApprovalAction: 'live_bridge_tombstone_memory_proof',
      args: {
        memory_id: 'memory-to-tombstone',
        reason: 'governed native tombstone proof',
        evidence: 'exact approval recorded',
        tombstone_reason: 'duplicate',
        actor_client_id: 'Codex',
        request_source: 'governed-mcp-vcp-native-bridge-app-integration',
        confirm: true,
        dry_run: false
      },
      localCounterName: 'tombstone'
    },
    {
      toolName: 'supersede_memory',
      exactApprovalAction: 'live_bridge_supersede_memory_proof',
      args: {
        old_memory_id: 'old-memory-id',
        new_memory_id: 'new-memory-id',
        reason: 'governed native supersede proof',
        evidence: 'exact approval recorded',
        supersedes_link: 'old-memory-id',
        superseded_by_link: 'new-memory-id',
        actor_client_id: 'Codex',
        request_source: 'governed-mcp-vcp-native-bridge-app-integration',
        confirm: true,
        dry_run: false
      },
      localCounterName: 'supersede'
    }
  ];

  for (const writeCase of writeCases) {
    const observations = [];
    const secretToken = `SECRET_TOKEN_FOR_${writeCase.toolName}_SHOULD_NOT_ECHO`;
    const rawNativeValue = `RAW_NATIVE_${writeCase.toolName}_RESPONSE_SHOULD_NOT_ECHO`;
    const server = await withJsonRpcServer(async (req, res, body) => {
      assert.equal(body.method, 'tools/call');
      assert.equal(body.params.name, writeCase.toolName);
      const delegatedCoverage =
        validateGovernedMcpNativeDelegatedArgumentsCoversCurrentProductGoal(body.params.arguments, {
          toolName: writeCase.toolName
        });

      assert.equal(delegatedCoverage.accepted, true, delegatedCoverage.blockers.join(', '));
      assert.equal(delegatedCoverage.direction, 'write');
      assert.equal(body.params.arguments.governed_bridge.invocation_tool_name, writeCase.toolName);
      assert.equal(
        body.params.arguments.governed_bridge.exact_approval_action,
        writeCase.exactApprovalAction
      );
      assert.equal(body.params.arguments.governed_bridge.exact_approval_action_matched, true);
      assert.equal(body.params.arguments.governed_bridge.exact_approval_scope_matched, true);
      assert.equal(body.params.arguments.governed_bridge.exact_approval_runtime_target_matched, true);
      assert.equal(body.params.arguments.governed_bridge.exact_approval_rollback_plan_matched, true);
      assert.equal(body.params.arguments.governed_bridge.local_memory_role, 'not_used');
      assert.equal(body.params.arguments.governed_bridge.local_memory_fallback_used, false);
      assert.equal(body.params.arguments.governed_bridge.raw_response_body_disclosed, false);
      assert.equal(
        body.params._meta.codexMemoryGovernance.schemaVersion,
        'codex_memory_governed_native_bridge_call_governance_v1'
      );
      assert.equal(
        body.params._meta.codexMemoryGovernance.governanceTransport.metadataPath,
        'params._meta.codexMemoryGovernance'
      );
      assert.equal(body.params._meta.codexMemoryGovernance.invocationProfile.profile, 'governed_bounded_write');
      assert.equal(body.params._meta.codexMemoryGovernance.invocationProfile.toolName, writeCase.toolName);
      assert.equal(body.params._meta.codexMemoryGovernance.readWriteAuthority.writeRequiresExactApproval, true);
      assert.equal(body.params._meta.codexMemoryGovernance.exactApprovalResult.allowedAction, writeCase.exactApprovalAction);
      assert.equal(body.params._meta.codexMemoryGovernance.exactApprovalResult.scopeMatched, true);
      assert.equal(body.params._meta.codexMemoryGovernance.exactApprovalResult.runtimeTargetMatched, true);
      assert.equal(body.params._meta.codexMemoryGovernance.exactApprovalResult.rollbackPlanMatched, true);
      assert.equal(
        body.params._meta.codexMemoryGovernance.exactApprovalResult.rollbackPlanRef,
        'cm-governed-write-rollback-plan'
      );
      assert.equal(body.params._meta.codexMemoryGovernance.outputDisclosureBudget.rawOutput, false);
      assert.equal(
        body.params._meta.codexMemoryGovernance.auditReceipt.receipt_id,
        body.params.arguments.governed_bridge.audit_receipt_reference_name
      );
      assert.equal(body.params._meta.codexMemoryGovernance.rollbackPosture.mode, 'bounded_rollback_plan');
      assert.equal(
        body.params._meta.codexMemoryGovernance.rollbackPosture.rollback_plan_ref,
        'cm-governed-write-rollback-plan'
      );
      assert.equal(
        body.params._meta.codexMemoryGovernance.runtimeTarget.targetReferenceName,
        'operator-vcp-toolbox-service-ref'
      );
      assert.equal(JSON.stringify(body.params.arguments.governed_bridge).includes(secretToken), false);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          structuredContent: {
            status: 'ok',
            rawNativeValue
          }
        }
      }));
    });

    try {
      await withTempApp({
        governedMcpVcpNativeBridgeGateMode: 'observe',
        governedMcpVcpNativeWriteDelegationMode: 'primary',
        governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
        governedMcpVcpNativeHttpMcpTarget: {
          endpoint: server.url,
          bearerToken: secretToken,
          requestTimeoutMs: 1000
        }
      }, async app => {
        const localWrites = {
          record: 0,
          tombstone: 0,
          supersede: 0
        };
        app.services.writeService.record = async () => {
          localWrites.record += 1;
          return { success: true };
        };
        app.services.tombstoneMemoryService.tombstone = async () => {
          localWrites.tombstone += 1;
          return { success: true };
        };
        app.services.supersedeMemoryService.supersede = async () => {
          localWrites.supersede += 1;
          return { success: true };
        };

        const result = await app.callTool(writeCase.toolName, writeCase.args, codexContext({
          executionContext: {
            scopeId: 'scope-alpha'
          },
          requestContext: {
            exactApprovalResult: exactWriteApprovalResult({
              allowedAction: writeCase.exactApprovalAction,
              allowedScope: {
                project_id: 'codex-memory',
                scope_id: 'scope-alpha',
                workspace_id: 'workspace-alpha',
                client_id: 'Codex',
                visibility: 'private'
              }
            }),
            rollbackPosture: {
              mode: 'bounded_rollback_plan',
              rollback_plan_ref: 'cm-governed-write-rollback-plan'
            }
          }
        }));
        const auditEntries = await app.stores.auditLogStore.readRecentWriteAudit(10);
        const bridgeReceipt = auditEntries.find(entry =>
          entry.eventType === 'governed_mcp_vcp_native_bridge_receipt' &&
          entry.toolName === writeCase.toolName
        );
        const bridgeReceiptCoverage =
          validateGovernedMcpNativeBridgeReceiptCoversCurrentProductGoal(bridgeReceipt);
        const overviewStatus = app.services.governedNativeBridgeObservationStore.getStatus();
        const overviewCoverage =
          validateGovernedMcpOverviewStatusCoversCurrentProductGoal(overviewStatus);
        const serializedResult = JSON.stringify(result);
        const serializedObservation = JSON.stringify(observations[0]);
        const serializedAudit = JSON.stringify(auditEntries);

        assert.equal(server.requests.length, 1, writeCase.toolName);
        assert.equal(server.requests[0].headers.authorization, `Bearer ${secretToken}`);
        assert.equal(server.requests[0].body.params.name, writeCase.toolName);
        assert.equal(localWrites[writeCase.localCounterName], 0, writeCase.toolName);
        assert.equal(result.status, 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATED', writeCase.toolName);
        assert.equal(result.access.primaryRuntime, 'VCPToolBox native memory', writeCase.toolName);
        assert.equal(result.access.memoryWritePerformed, true, writeCase.toolName);
        assert.equal(result.access.localMemoryFallbackUsed, false, writeCase.toolName);
        assert.equal(result.receipt.toolName, writeCase.toolName, writeCase.toolName);
        assert.equal(result.receipt.exactApprovalAction, writeCase.exactApprovalAction, writeCase.toolName);
        assert.equal(result.receipt.nativeInvocationReceipt.toolName, writeCase.toolName, writeCase.toolName);
        assert.equal(result.receipt.nativeInvocationReceipt.governanceMetadataSent, true, writeCase.toolName);
        assert.equal(
          result.receipt.nativeInvocationReceipt.governanceMetadataPath,
          'params._meta.codexMemoryGovernance',
          writeCase.toolName
        );
        assert.equal(result.receipt.localAuditReceipt.status, 'appended', writeCase.toolName);
        assert.equal(bridgeReceiptCoverage.accepted, true, bridgeReceiptCoverage.blockers.join(', '));
        assert.equal(bridgeReceiptCoverage.direction, 'write', writeCase.toolName);
        assert.equal(bridgeReceipt.exactApprovalAction, writeCase.exactApprovalAction, writeCase.toolName);
        assert.equal(bridgeReceipt.nativeToolName, writeCase.toolName, writeCase.toolName);
        assert.equal(bridgeReceipt.localMemoryRole, 'not_used', writeCase.toolName);
        assert.equal(bridgeReceipt.localMemoryFallbackUsed, false, writeCase.toolName);
        assert.equal(bridgeReceipt.rollbackPosture, 'bounded_rollback_plan', writeCase.toolName);
        assert.equal(bridgeReceipt.rollbackPlanBound, true, writeCase.toolName);
        assert.equal(bridgeReceipt.rollbackDisposition, 'no_rollback_required', writeCase.toolName);
        assert.equal(overviewCoverage.accepted, true, overviewCoverage.blockers.join(', '));
        assert.equal(overviewCoverage.direction, 'write', writeCase.toolName);
        assert.equal(overviewStatus.latest.toolName, writeCase.toolName, writeCase.toolName);
        assert.equal(overviewStatus.latest.exactApprovalAction, writeCase.exactApprovalAction, writeCase.toolName);
        assert.equal(observations[0].writeDelegationResult.accepted, true, writeCase.toolName);
        assert.equal(observations[0].bridgeAuditReceiptResult.accepted, true, writeCase.toolName);
        assert.equal(serializedResult.includes(server.url), false, writeCase.toolName);
        assert.equal(serializedResult.includes(secretToken), false, writeCase.toolName);
        assert.equal(serializedResult.includes(rawNativeValue), false, writeCase.toolName);
        assert.equal(serializedObservation.includes(server.url), false, writeCase.toolName);
        assert.equal(serializedObservation.includes(secretToken), false, writeCase.toolName);
        assert.equal(serializedObservation.includes(rawNativeValue), false, writeCase.toolName);
        assert.equal(serializedAudit.includes(server.url), false, writeCase.toolName);
        assert.equal(serializedAudit.includes(secretToken), false, writeCase.toolName);
        assert.equal(serializedAudit.includes(rawNativeValue), false, writeCase.toolName);
      });
    } finally {
      await server.close();
    }
  }
});

test('primary write delegation rejects over-budget native response without local write fallback', async () => {
  const observations = [];
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
    governedMcpVcpNativeWriteDelegationToolCaller: async payload => {
      assert.equal(payload.toolName, 'record_memory');
      assert.equal(payload.arguments.governed_bridge.write_policy, 'exact_approval');
      assert.equal(payload.arguments.governed_bridge.exact_approval_action, 'live_bridge_record_memory_proof');
      assert.equal(payload.arguments.governed_bridge.exact_approval_scope_matched, true);
      assert.equal(payload.arguments.governed_bridge.exact_approval_runtime_target_matched, true);
      assert.equal(payload.arguments.governed_bridge.exact_approval_rollback_plan_matched, true);
      return {
        memory_id: 'RAW_NATIVE_WRITE_ID_SHOULD_NOT_ECHO',
        content: 'RAW_NATIVE_WRITE_RESPONSE_SHOULD_NOT_ECHO_'.repeat(200)
      };
    }
  }, async app => {
    let localWrites = 0;
    app.services.writeService.record = async () => {
      localWrites += 1;
      return { success: true };
    };

    const result = await app.callTool('record_memory', {
      target: 'knowledge',
      title: 'Over budget native write response',
      content: 'RAW_WRITE_CONTENT_SHOULD_NOT_ECHO',
      evidence: 'exact approval recorded',
      validated: true,
      reusable: true,
      sensitivity: 'none'
    }, codexContext({
      requestContext: {
        exactApprovalResult: exactWriteApprovalResult(),
        rollbackPosture: {
          mode: 'bounded_rollback_plan',
          rollback_plan_ref: 'cm-governed-write-rollback-plan'
        }
      }
    }));
    const auditEntries = await app.stores.auditLogStore.readRecentWriteAudit(10);
    const bridgeReceipt = auditEntries.find(entry =>
      entry.eventType === 'governed_mcp_vcp_native_bridge_receipt' &&
      entry.toolName === 'record_memory'
    );
    const serializedResult = JSON.stringify(result);
    const serializedObservation = JSON.stringify(observations[0]);
    const serializedAudit = JSON.stringify(auditEntries);
    const bridgeReceiptCoverage =
      validateGovernedMcpNativeBridgeReceiptCoversCurrentProductGoal(bridgeReceipt);
    const overviewStatus = app.services.governedNativeBridgeObservationStore.getStatus();
    const overviewCoverage =
      validateGovernedMcpOverviewStatusCoversCurrentProductGoal(overviewStatus);

    assert.equal(localWrites, 0);
    assert.equal(bridgeReceiptCoverage.accepted, true, bridgeReceiptCoverage.blockers.join(', '));
    assert.equal(bridgeReceiptCoverage.direction, 'write');
    assert.equal(overviewCoverage.accepted, true, overviewCoverage.blockers.join(', '));
    assert.equal(overviewCoverage.direction, 'write');
    assert.equal(overviewStatus.latest.rollbackRequired, true);
    assert.equal(overviewStatus.latest.rollbackReasonCode, 'write_post_commit_output_budget_exceeded');
    assert.equal(overviewStatus.latest.rollbackDisposition, 'rollback_required_not_applied');
    assert.equal(overviewStatus.latest.rollbackFollowupRequired, true);
    assert.equal(result.status, 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATION_REJECTED');
    assert.equal(result.reasonCode, 'native_write_delegation_output_budget_exceeded');
    assert.equal(result.access.runtimeCalled, true);
    assert.equal(result.access.memoryWritePerformed, true);
    assert.equal(result.access.localMemoryFallbackEligible, false);
    assert.equal(result.receipt.outputBudgetExceeded, true);
    assert.equal(result.receipt.byteCountBucket, 'over_budget');
    assert.equal(result.receipt.rollbackRequired, true);
    assert.equal(result.receipt.rollbackReasonCode, 'write_post_commit_output_budget_exceeded');
    assert.equal(result.receipt.rollbackPlanReferencePresent, true);
    assert.equal(result.receipt.rollbackPlanBound, true);
    assert.equal(result.receipt.rollbackDisposition, 'rollback_required_not_applied');
    assert.equal(result.receipt.rollbackFollowupRequired, true);
    assert.equal(result.receipt.rollbackApplyPolicy, 'manual_governed_followup_required');
    assert.equal(result.receipt.rollbackApplyAttempted, false);
    assert.equal(result.receipt.rollbackAutoApplyAllowed, false);
    assert.equal(observations[0].writeDelegationResult.accepted, false);
    assert.equal(observations[0].writeDelegationResult.receipt.outputBudgetExceeded, true);
    assert.equal(bridgeReceipt.delegationAccepted, false);
    assert.equal(bridgeReceipt.memoryWritePerformed, true);
    assert.equal(bridgeReceipt.statusClass, 'output_budget_exceeded');
    assert.equal(bridgeReceipt.outputBudgetExceeded, true);
    assert.equal(bridgeReceipt.byteCountBucket, 'over_budget');
    assert.equal(bridgeReceipt.runtimeTargetKind, 'mcp_server');
    assert.equal(bridgeReceipt.runtimeTargetSourceAuthority, 'bridge_runtime_or_static_config');
    assert.equal(bridgeReceipt.disclosureMaxItems, 5);
    assert.equal(bridgeReceipt.disclosureMaxBytes, 4096);
    assert.equal(bridgeReceipt.auditReceiptReferenceName, 'governed-mcp-record_memory-receipt');
    assert.equal(bridgeReceipt.rollbackRequired, true);
    assert.equal(bridgeReceipt.rollbackPlanReferenceName, 'cm-governed-write-rollback-plan');
    assert.equal(bridgeReceipt.rollbackReasonCode, 'write_post_commit_output_budget_exceeded');
    assert.equal(bridgeReceipt.rollbackPlanBound, true);
    assert.equal(bridgeReceipt.rollbackDisposition, 'rollback_required_not_applied');
    assert.equal(bridgeReceipt.rollbackFollowupRequired, true);
    assert.equal(bridgeReceipt.rollbackApplyPolicy, 'manual_governed_followup_required');
    assert.equal(bridgeReceipt.rollbackApplyAttempted, false);
    assert.equal(bridgeReceipt.rollbackAutoApplyAllowed, false);
    assert.equal(serializedResult.includes('RAW_WRITE_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('RAW_NATIVE_WRITE_ID_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('RAW_NATIVE_WRITE_RESPONSE_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedObservation.includes('RAW_NATIVE_WRITE_RESPONSE_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedAudit.includes('RAW_NATIVE_WRITE_RESPONSE_SHOULD_NOT_ECHO'), false);
  });
});

test('primary write delegation rejects successful native write when required audit receipt cannot be appended', async () => {
  const observations = [];
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
    governedMcpVcpNativeWriteDelegationToolCaller: async payload => {
      assert.equal(payload.toolName, 'record_memory');
      assert.equal(payload.arguments.governed_bridge.audit_receipt_required, true);
      return {
        memory_id: 'RAW_NATIVE_WRITE_ID_SHOULD_NOT_ECHO',
        content: 'RAW_NATIVE_WRITE_CONTENT_SHOULD_NOT_ECHO'
      };
    }
  }, async app => {
    let localWrites = 0;
    app.services.writeService.record = async () => {
      localWrites += 1;
      return { success: true };
    };
    app.stores.auditLogStore.appendWriteAudit = async () => {
      throw new Error('PRIVATE_WRITE_AUDIT_APPEND_FAILURE_SHOULD_NOT_ECHO');
    };

    const result = await app.callTool('record_memory', {
      target: 'knowledge',
      title: 'Audit receipt required write',
      content: 'RAW_WRITE_CONTENT_SHOULD_NOT_ECHO',
      evidence: 'exact approval recorded',
      validated: true,
      reusable: true,
      sensitivity: 'none'
    }, codexContext({
      requestContext: {
        exactApprovalResult: exactWriteApprovalResult(),
        rollbackPosture: {
          mode: 'bounded_rollback_plan',
          rollback_plan_ref: 'cm-governed-write-rollback-plan'
        }
      }
    }));
    const serializedResult = JSON.stringify(result);
    const serializedObservation = JSON.stringify(observations[0]);

    assert.equal(localWrites, 0);
    assert.equal(result.status, 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATION_REJECTED');
    assert.equal(result.reasonCode, 'required_bridge_audit_receipt_not_appended');
    assert.equal(result.access.runtimeCalled, true);
    assert.equal(result.access.memoryWritePerformed, true);
    assert.equal(result.access.localMemoryFallbackEligible, false);
    assert.equal(result.access.auditReceiptRequiredButNotAppended, true);
    assert.equal(result.access.delegationStatusClass, 'audit_receipt_not_appended');
    assert.equal(result.access.delegationReasonCode, 'required_bridge_audit_receipt_not_appended');
    assert.equal(result.access.rollbackRequired, true);
    assert.equal(result.access.rollbackReasonCode, 'write_post_commit_audit_receipt_not_appended');
    assert.equal(result.access.rollbackDisposition, 'rollback_required_not_applied');
    assert.equal(result.access.rollbackFollowupRequired, true);
    assert.equal(result.access.rollbackApplyPolicy, 'manual_governed_followup_required');
    assert.equal(result.access.rollbackApplyAttempted, false);
    assert.equal(result.access.rollbackAutoApplyAllowed, false);
    assert.equal(result.receipt.statusClass, 'audit_receipt_not_appended');
    assert.equal(result.receipt.auditReceiptRequiredButNotAppended, true);
    assert.equal(result.receipt.localAuditReceipt.status, 'not_appended');
    assert.equal(result.receipt.rollbackRequired, true);
    assert.equal(result.receipt.rollbackReasonCode, 'write_post_commit_audit_receipt_not_appended');
    assert.equal(result.receipt.rollbackPlanReferencePresent, true);
    assert.equal(result.receipt.rollbackPlanBound, true);
    assert.equal(result.receipt.rollbackDisposition, 'rollback_required_not_applied');
    assert.equal(result.receipt.rollbackFollowupRequired, true);
    assert.equal(result.receipt.rollbackApplyPolicy, 'manual_governed_followup_required');
    assert.equal(result.receipt.rollbackApplyAttempted, false);
    assert.equal(result.receipt.rollbackAutoApplyAllowed, false);
    assert.equal(observations[0].writeDelegationResult.accepted, false);
    assert.equal(observations[0].bridgeAuditReceiptResult.accepted, false);
    assert.equal(observations[0].bridgeAuditReceiptResult.reasonCode, 'audit_receipt_append_failed');
    assert.equal(serializedResult.includes('RAW_WRITE_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('RAW_NATIVE_WRITE_ID_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('RAW_NATIVE_WRITE_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedObservation.includes('RAW_NATIVE_WRITE_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedObservation.includes('PRIVATE_WRITE_AUDIT_APPEND_FAILURE_SHOULD_NOT_ECHO'), false);
  });
});

test('primary write delegation ignores cross-client payload scope even with exact approval', async () => {
  const observations = [];
  let nativePayload = null;
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
    governedMcpVcpNativeWriteDelegationToolCaller: async payload => {
      nativePayload = payload;
      return { status: 'ok' };
    }
  }, async app => {
    let localWrites = 0;
    app.services.writeService.record = async () => {
      localWrites += 1;
      return { success: true };
    };

    const result = await app.callTool('record_memory', {
      target: 'knowledge',
      title: 'Rejected cross-client write',
      content: 'RAW_CROSS_CLIENT_WRITE_CONTENT_SHOULD_NOT_ECHO',
      evidence: 'exact approval exists but scope is invalid',
      validated: true,
      reusable: true,
      sensitivity: 'none',
      scope: {
        project_id: 'codex-memory',
        workspace_id: 'workspace-alpha',
        client_id: 'other-client',
        visibility: 'private'
      }
    }, codexContext({
      requestContext: {
        exactApprovalResult: exactWriteApprovalResult(),
        rollbackPosture: {
          mode: 'bounded_rollback_plan',
          rollback_plan_ref: 'cm-governed-write-rollback-plan'
        }
      }
    }));
    const serializedResult = JSON.stringify(result);
    const serializedObservation = JSON.stringify(observations[0]);

    assert.equal(localWrites, 0);
    assert.equal(result.status, 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATED');
    assert.equal(result.access.memoryWritePerformed, true);
    assert.equal(observations[0].gateResult.accepted, true);
    assert.equal(observations[0].writeDelegationResult.accepted, true);
    assert.deepEqual(nativePayload.arguments.scope, {
      project_id: 'codex-memory',
      workspace_id: 'workspace-alpha',
      client_id: 'Codex',
      visibility: 'private'
    });
    assert.deepEqual(nativePayload.arguments.governed_bridge.scope, nativePayload.arguments.scope);
    assert.equal(serializedResult.includes('RAW_CROSS_CLIENT_WRITE_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedObservation.includes('RAW_CROSS_CLIENT_WRITE_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(JSON.stringify(nativePayload.arguments.scope).includes('other-client'), false);
    assert.equal(JSON.stringify(nativePayload.arguments.governed_bridge).includes('other-client'), false);
  });
});

test('primary write delegation strips unsafe payload scope even with exact approval', async () => {
  const observations = [];
  let nativePayload = null;
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
    governedMcpVcpNativeWriteDelegationToolCaller: async payload => {
      nativePayload = payload;
      return { status: 'ok' };
    }
  }, async app => {
    let localWrites = 0;
    app.services.writeService.record = async () => {
      localWrites += 1;
      return { success: true };
    };

    const result = await app.callTool('record_memory', {
      target: 'knowledge',
      title: 'Rejected unsafe scope write',
      content: 'RAW_UNSAFE_SCOPE_WRITE_CONTENT_SHOULD_NOT_ECHO',
      evidence: 'exact approval exists but scope identifier is unsafe',
      validated: true,
      reusable: true,
      sensitivity: 'none',
      scope: {
        project_id: 'https://private.example/project?token=SECRET_WRITE_SCOPE_SHOULD_NOT_ECHO',
        workspace_id: 'workspace-alpha',
        visibility: 'private'
      }
    }, codexContext({
      requestContext: {
        exactApprovalResult: exactWriteApprovalResult(),
        rollbackPosture: {
          mode: 'bounded_rollback_plan',
          rollback_plan_ref: 'cm-governed-write-rollback-plan'
        }
      }
    }));
    const serializedResult = JSON.stringify(result);
    const serializedObservation = JSON.stringify(observations[0]);

    assert.equal(localWrites, 0);
    assert.equal(result.status, 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATED');
    assert.equal(result.access.memoryWritePerformed, true);
    assert.equal(observations[0].gateResult.accepted, true);
    assert.equal(observations[0].writeDelegationResult.accepted, true);
    assert.deepEqual(nativePayload.arguments.scope, {
      project_id: 'codex-memory',
      workspace_id: 'workspace-alpha',
      client_id: 'Codex',
      visibility: 'private'
    });
    assert.equal(serializedResult.includes('RAW_UNSAFE_SCOPE_WRITE_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('SECRET_WRITE_SCOPE_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedObservation.includes('RAW_UNSAFE_SCOPE_WRITE_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedObservation.includes('SECRET_WRITE_SCOPE_SHOULD_NOT_ECHO'), false);
    assert.equal(JSON.stringify(nativePayload).includes('SECRET_WRITE_SCOPE_SHOULD_NOT_ECHO'), false);
  });
});

test('primary write delegation rejects exact approval scope drift from canonical transport scope', async () => {
  const observations = [];
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
    governedMcpVcpNativeWriteDelegationToolCaller: async () => {
      throw new Error('native should not be called after trusted write scope mismatch');
    }
  }, async app => {
    let localWrites = 0;
    app.services.writeService.record = async () => {
      localWrites += 1;
      return { success: true };
    };

    const result = await app.callTool('record_memory', {
      target: 'knowledge',
      title: 'Rejected scope drift write',
      content: 'RAW_SCOPE_DRIFT_WRITE_CONTENT_SHOULD_NOT_ECHO',
      evidence: 'exact approval matches payload scope but trusted context does not',
      validated: true,
      reusable: true,
      sensitivity: 'none',
      scope: {
        project_id: 'other-project',
        workspace_id: 'workspace-alpha',
        visibility: 'private'
      }
    }, codexContext({
      requestContext: {
        exactApprovalResult: exactWriteApprovalResult({
          allowedScope: {
            project_id: 'other-project',
            workspace_id: 'workspace-alpha',
            client_id: 'Codex',
            visibility: 'private'
          }
        }),
        rollbackPosture: {
          mode: 'bounded_rollback_plan',
          rollback_plan_ref: 'cm-governed-write-rollback-plan'
        }
      }
    }));
    const serializedResult = JSON.stringify(result);
    const serializedObservation = JSON.stringify(observations[0]);

    assert.equal(localWrites, 0);
    assert.equal(result.decision, 'rejected');
    assert.equal(result.reasonCode, 'governed_mcp_vcp_native_bridge_gate_rejected');
    assert.equal(result.access.memoryWritePerformed, false);
    assert.equal(observations[0].gateResult.accepted, false);
    assert.equal(observations[0].writeDelegationResult, null);
    assert.ok(observations[0].gateResult.blockers.includes('write_authority_exact_approval_scope_must_match_bridge_scope'));
    assert.equal(observations[0].gateResult.normalizedBridgeRequest.exact_approval_scope_matched, false);
    assert.equal(observations[0].gateResult.normalizedBridgeRequest.trusted_execution_context_scope_matched, true);
    assert.equal(observations[0].gateResult.normalizedBridgeRequest.scope, null);
    assert.equal(serializedResult.includes('RAW_SCOPE_DRIFT_WRITE_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('other-project'), false);
    assert.equal(serializedObservation.includes('RAW_SCOPE_DRIFT_WRITE_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedObservation.includes('other-project'), false);
  });
});

test('primary write delegation rejects unsafe direct exact approval before native or local write', async () => {
  const observations = [];
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
    governedMcpVcpNativeWriteDelegationToolCaller: async () => {
      throw new Error('native should not be called after unsafe direct exact approval');
    }
  }, async app => {
    let localWrites = 0;
    app.services.writeService.record = async () => {
      localWrites += 1;
      return { success: true };
    };

    const result = await app.callTool('record_memory', {
      target: 'knowledge',
      title: 'Rejected unsafe exact approval write',
      content: 'RAW_UNSAFE_EXACT_APPROVAL_WRITE_CONTENT_SHOULD_NOT_ECHO',
      evidence: 'direct requestContext exact approval must not bypass MCP metadata parser safety',
      validated: true,
      reusable: true,
      sensitivity: 'none'
    }, codexContext({
      requestContext: {
        exactApprovalResult: exactWriteApprovalResult({
          allowedScope: {
            project_id: 'http://PRIVATE_DIRECT_APPROVAL_SCOPE_SHOULD_NOT_ECHO',
            workspace_id: 'workspace-alpha',
            client_id: 'Codex',
            visibility: 'public'
          },
          runtimeTarget: {
            targetReferenceName: 'http://PRIVATE_DIRECT_APPROVAL_TARGET_SHOULD_NOT_ECHO',
            targetKind: 'service_url',
            primaryRuntime: 'codex-memory local runtime SHOULD_NOT_ECHO'
          },
          rollbackPlanRef: 'https://PRIVATE_DIRECT_APPROVAL_ROLLBACK_SHOULD_NOT_ECHO'
        }),
        rollbackPosture: {
          mode: 'bounded_rollback_plan',
          rollback_plan_ref: 'cm-governed-write-rollback-plan'
        }
      }
    }));
    const serializedResult = JSON.stringify(result);
    const serializedObservation = JSON.stringify(observations[0]);

    assert.equal(localWrites, 0);
    assert.equal(result.decision, 'rejected');
    assert.equal(result.reasonCode, 'governed_mcp_vcp_native_bridge_gate_rejected');
    assert.equal(result.access.memoryWritePerformed, false);
    assert.equal(observations[0].gateResult.accepted, false);
    assert.equal(observations[0].writeDelegationResult, null);
    assert.ok(observations[0].gateResult.blockers.includes(
      'write_authority_exact_approval_scope_must_match_bridge_scope'
    ));
    assert.ok(observations[0].gateResult.blockers.includes(
      'write_authority_exact_approval_runtime_target_reference_must_be_safe'
    ));
    assert.ok(observations[0].gateResult.blockers.includes(
      'write_authority_exact_approval_runtime_target_kind_must_be_mcp_server'
    ));
    assert.ok(observations[0].gateResult.blockers.includes(
      'write_authority_exact_approval_rollback_plan_must_match_bridge_rollback_posture'
    ));
    assert.equal(observations[0].gateResult.normalizedBridgeRequest.exact_approval_scope_matched, false);
    assert.equal(observations[0].gateResult.normalizedBridgeRequest.exact_approval_scope_references_safe, true);
    assert.equal(observations[0].gateResult.normalizedBridgeRequest.exact_approval_scope_visibility_accepted, false);
    assert.equal(observations[0].gateResult.normalizedBridgeRequest.exact_approval_runtime_target_reference_safe, false);
    assert.equal(observations[0].gateResult.normalizedBridgeRequest.exact_approval_runtime_target_kind_accepted, false);
    assert.equal(observations[0].gateResult.normalizedBridgeRequest.exact_approval_runtime_target_primary_runtime_accepted, false);
    assert.equal(observations[0].gateResult.normalizedBridgeRequest.exact_approval_rollback_plan_matched, false);
    assert.equal(observations[0].gateResult.normalizedBridgeRequest.exact_approval_rollback_plan_reference_present, false);
    assert.equal(serializedResult.includes('RAW_UNSAFE_EXACT_APPROVAL_WRITE_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('PRIVATE_DIRECT_APPROVAL_SCOPE_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('PRIVATE_DIRECT_APPROVAL_TARGET_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedResult.includes('PRIVATE_DIRECT_APPROVAL_ROLLBACK_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedObservation.includes('RAW_UNSAFE_EXACT_APPROVAL_WRITE_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedObservation.includes('PRIVATE_DIRECT_APPROVAL_SCOPE_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedObservation.includes('PRIVATE_DIRECT_APPROVAL_TARGET_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedObservation.includes('PRIVATE_DIRECT_APPROVAL_ROLLBACK_SHOULD_NOT_ECHO'), false);
  });
});

test('primary write delegation rejects without exact approval and does not fallback to local write', async () => {
  const observations = [];
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
    governedMcpVcpNativeWriteDelegationToolCaller: async () => {
      throw new Error('native should not be called without gate acceptance');
    }
  }, async app => {
    let localWrites = 0;
    app.services.writeService.record = async () => {
      localWrites += 1;
      return { success: true };
    };

    const result = await app.callTool('record_memory', {
      target: 'knowledge',
      title: 'Rejected write',
      content: 'RAW_REJECTED_CONTENT_SHOULD_NOT_ECHO',
      evidence: 'missing exact approval',
      validated: true,
      reusable: true,
      sensitivity: 'none'
    }, codexContext());
    const serializedObservation = JSON.stringify(observations[0]);

    assert.equal(localWrites, 0);
    assert.equal(result.decision, 'rejected');
    assert.equal(result.reasonCode, 'governed_mcp_vcp_native_bridge_gate_rejected');
    assert.equal(result.access.memoryWritePerformed, false);
    assert.equal(observations[0].gateResult.accepted, false);
    assert.equal(observations[0].writeDelegationResult, null);
    assert.ok(observations[0].gateResult.blockers.includes('write_authority_requires_accepted_exact_approval'));
    assert.ok(observations[0].gateResult.blockers.includes(
      'write_authority_exact_approval_action_must_match_mcp_tool'
    ));
    assert.equal(serializedObservation.includes('RAW_REJECTED_CONTENT_SHOULD_NOT_ECHO'), false);
  });
});

test('primary write delegation failure returns low-disclosure rejection and skips local write', async () => {
  const observations = [];
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
    governedMcpVcpNativeWriteDelegationToolCaller: async payload => {
      throw governedNativeTransportErrorForPayload(payload, 'PRIVATE_NATIVE_WRITE_FAILURE_SHOULD_NOT_ECHO');
    }
  }, async app => {
    let localWrites = 0;
    app.services.writeService.record = async () => {
      localWrites += 1;
      return { success: true };
    };

    const result = await app.callTool('record_memory', {
      target: 'knowledge',
      title: 'Native failure write',
      content: 'RAW_FAILED_WRITE_CONTENT_SHOULD_NOT_ECHO',
      evidence: 'exact approval recorded',
      validated: true,
      reusable: true,
      sensitivity: 'none'
    }, codexContext({
      requestContext: {
        exactApprovalResult: exactWriteApprovalResult(),
        rollbackPosture: {
          mode: 'bounded_rollback_plan',
          rollback_plan_ref: 'cm-governed-write-rollback-plan'
        }
      }
    }));
    const serializedResult = JSON.stringify(result);
    const serializedObservation = JSON.stringify(observations[0]);

    assert.equal(localWrites, 0);
    assert.equal(result.status, 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATION_REJECTED');
    assert.equal(result.reasonCode, 'native_write_delegation_transport_error');
    assert.equal(result.access.memoryWritePerformed, false);
    assert.equal(result.access.localMemoryFallbackEligible, false);
    assert.equal(observations[0].writeDelegationResult.accepted, false);
    assert.equal(serializedResult.includes('RAW_FAILED_WRITE_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedObservation.includes('PRIVATE_NATIVE_WRITE_FAILURE_SHOULD_NOT_ECHO'), false);
  });
});

test('observe mode rejects unsafe registered target invoker metadata without executing it', async () => {
  const observations = [];
  let invocations = 0;
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
    governedMcpVcpNativeReadShapeProbeInvokerRegistry: {
      'operator-vcp-toolbox-service-ref': {
        invokeComponentAction: async () => {
          invocations += 1;
          return [];
        },
        endpoint: 'PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
        bearerToken: 'SECRET_TOKEN_SHOULD_NOT_ECHO'
      }
    }
  }, async app => {
    await app.callTool('audit_memory', {}, codexContext());
    const serializedObservation = JSON.stringify(observations[0]);

    assert.equal(invocations, 0);
    assert.equal(observations[0].readShapeProbeTargetResolverResult.accepted, false);
    assert.equal(
      observations[0].readShapeProbeTargetResolverResult.reasonCode,
      'registered_invoker_contains_forbidden_locator_or_secret_fields'
    );
    assert.equal(observations[0].readShapeProbeExecutionResult, null);
    assert.equal(serializedObservation.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedObservation.includes('SECRET_TOKEN_SHOULD_NOT_ECHO'), false);
  });
});

test('tool args cannot define or replace the governed runtime target authority', async () => {
  const observations = [];
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation)
  }, async app => {
    await app.callTool('audit_memory', {
      runtime_target: {
        target_reference_name: 'payload-target-should-not-win',
        endpoint: 'http://payload-endpoint-should-not-echo'
      },
      endpoint: 'http://payload-endpoint-should-not-echo'
    }, codexContext());

    assert.equal(observations.length, 1);
    assert.equal(observations[0].gateResult.accepted, true);
    assert.equal(observations[0].readOnlyProbeResult.accepted, true);
    assert.equal(
      observations[0].gateResult.normalizedBridgeRequest.runtime_target_reference_name,
      'operator-vcp-toolbox-service-ref'
    );
    assert.equal(
      JSON.stringify(observations[0].gateResult).includes('payload-endpoint-should-not-echo'),
      false
    );
    assert.equal(
      JSON.stringify(observations[0].gateResult).includes('payload-target-should-not-win'),
      false
    );
    assert.equal(observations[0].readShapeProbeExecutionResult, null);
  });
});

test('strict mode rejects an ungoverned raw-output search before recall runtime executes', async () => {
  const observations = [];
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'strict',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation)
  }, async app => {
    let searchRuntimeCalls = 0;
    const originalSearch = app.services.passiveRecallService.search.bind(app.services.passiveRecallService);
    app.services.passiveRecallService.search = async (...args) => {
      searchRuntimeCalls += 1;
      return originalSearch(...args);
    };

    const result = await app.callTool('search_memory', {
      query: 'governed bridge strict raw output probe',
      target: 'both',
      limit: 3,
      scope: {
        project_id: 'codex-memory',
        workspace_id: 'workspace-alpha',
        client_id: 'codex',
        visibility: 'private'
      }
    }, codexContext({
      requestContext: {
        outputDisclosureBudget: {
          level: 'structured',
          lowDisclosure: false,
          rawOutput: true,
          maxItems: 5,
          maxBytes: 4096
        }
      }
    }));
    const overviewStatus = app.services.governedNativeBridgeObservationStore.getStatus();

    assert.equal(result.decision, 'rejected');
    assert.equal(result.reasonCode, 'governed_mcp_vcp_native_bridge_gate_rejected');
    assert.equal(result.access.runtimeCalled, false);
    assert.equal(result.access.memoryReadPerformed, false);
    assert.equal(result.access.rawOutputReturned, false);
    assert.equal(searchRuntimeCalls, 0);
    assert.equal(observations.length, 1);
    assert.equal(observations[0].mode, 'strict');
    assert.equal(observations[0].gateResult.accepted, false);
    assert.equal(observations[0].readOnlyProbeResult, null);
    assert.equal(observations[0].readShapeProbeExecutionResult, null);
    assert.ok(observations[0].gateResult.blockers.includes(
      'output_disclosure_budget_must_be_low_disclosure_and_bounded'
    ));
    assert.equal(overviewStatus.observationCount, 0);
    assert.equal(overviewStatus.latest, null);
    assert.equal(overviewStatus.rawMemoryReturned, false);
    assert.equal(overviewStatus.readinessClaimed, false);
  });
});

test('observe mode keeps validate_memory on local validation fixture path outside native bridge', async () => {
  const observations = [];
  let probeCalls = 0;
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary',
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
    governedMcpVcpNativeReadShapeProbeInvoker: async () => {
      probeCalls += 1;
      return { status: 'SHOULD_NOT_RUN' };
    },
    governedMcpVcpNativeReadDelegationToolCaller: async () => {
      throw new Error('validate_memory must not use native read delegation');
    },
    governedMcpVcpNativeWriteDelegationToolCaller: async () => {
      throw new Error('validate_memory must not use native write delegation');
    }
  }, async app => {
    const result = await app.callTool('validate_memory', {
      memoryId: 'local-validation-fixture-memory-id',
      decision: 'reject'
    }, codexContext());

    assert.equal(result.tool, 'validate_memory');
    assert.equal(result.decision, 'rejected');
    assert.equal(result.dryRun, true);
    assert.equal(result.access.mode, 'controlled_mutation_public_bounded');
    assert.equal(result.policy.durableMutationPerformed, false);
    assert.equal(probeCalls, 0);
    assert.deepEqual(observations, []);
  });
});

test('read delegation configured with bridge gate off rejects instead of silently using local memory', async () => {
  const observations = [];
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'off',
    governedMcpVcpNativeReadDelegationMode: 'primary',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation)
  }, async app => {
    let localReads = 0;
    app.services.auditMemoryReadonlyService.run = async () => {
      localReads += 1;
      return { access: { rawMemoryReturned: false } };
    };

    const result = await app.callTool('audit_memory', {}, codexContext());

    assert.equal(result.decision, 'rejected');
    assert.equal(result.reasonCode, 'governed_mcp_vcp_native_bridge_gate_rejected');
    assert.equal(result.access.runtimeCalled, false);
    assert.equal(result.access.memoryReadPerformed, false);
    assert.equal(result.gate.code, 'governed_mcp_vcp_native_delegation_requires_bridge_gate');
    assert.ok(result.gate.blockers.includes('native_delegation_requires_bridge_gate_mode_not_off'));
    assert.equal(localReads, 0);
    assert.deepEqual(observations, []);
  });
});

test('write delegation configured with bridge gate off rejects instead of silently using local memory', async () => {
  const observations = [];
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'off',
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation)
  }, async app => {
    let localWrites = 0;
    app.services.writeService.record = async () => {
      localWrites += 1;
      return { success: true };
    };

    const result = await app.callTool('record_memory', {
      target: 'knowledge',
      title: 'Should not write locally',
      content: 'RAW_CONTENT_SHOULD_NOT_WRITE',
      evidence: 'gate off mismatch',
      validated: true,
      reusable: true,
      sensitivity: 'none'
    }, codexContext({
      requestContext: {
        exactApprovalResult: exactWriteApprovalResult(),
        rollbackPosture: {
          mode: 'bounded_rollback_plan',
          rollback_plan_ref: 'cm-governed-write-rollback-plan'
        }
      }
    }));

    assert.equal(result.decision, 'rejected');
    assert.equal(result.reasonCode, 'governed_mcp_vcp_native_bridge_gate_rejected');
    assert.equal(result.access.runtimeCalled, false);
    assert.equal(result.access.memoryWritePerformed, false);
    assert.equal(result.gate.code, 'governed_mcp_vcp_native_delegation_requires_bridge_gate');
    assert.equal(result.gate.direction, 'write');
    assert.equal(localWrites, 0);
    assert.deepEqual(observations, []);
  });
});

test('governed write gate does not fall back to local write when native write delegation is off', async () => {
  const observations = [];
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeWriteDelegationMode: 'off',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation)
  }, async app => {
    let localWrites = 0;
    app.services.writeService.record = async () => {
      localWrites += 1;
      return { success: true };
    };

    const result = await app.callTool('record_memory', {
      target: 'knowledge',
      title: 'Should require native write delegation',
      content: 'RAW_LOCAL_WRITE_SHOULD_NOT_HAPPEN',
      evidence: 'exact approval is present but delegation is disabled',
      validated: true,
      reusable: true,
      sensitivity: 'none'
    }, codexContext({
      requestContext: {
        exactApprovalResult: exactWriteApprovalResult(),
        rollbackPosture: {
          mode: 'bounded_rollback_plan',
          rollback_plan_ref: 'cm-governed-write-rollback-plan'
        }
      }
    }));
    const serialized = JSON.stringify(result) + JSON.stringify(observations);

    assert.equal(result.decision, 'rejected');
    assert.equal(result.reasonCode, 'governed_mcp_vcp_native_bridge_gate_rejected');
    assert.equal(result.access.runtimeCalled, false);
    assert.equal(result.access.memoryWritePerformed, false);
    assert.equal(result.gate.code, 'governed_mcp_vcp_native_write_delegation_required');
    assert.equal(result.gate.direction, 'write');
    assert.equal(localWrites, 0);
    assert.equal(observations.length, 1);
    assert.equal(observations[0].gateResult.accepted, true);
    assert.equal(observations[0].writeDelegationResult, null);
    assert.equal(serialized.includes('RAW_LOCAL_WRITE_SHOULD_NOT_HAPPEN'), false);
  });
});

test('off mode does not run the governed bridge gate observer', async () => {
  const observations = [];
  await withTempApp({
    governedMcpVcpNativeBridgeGateMode: 'off',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation)
  }, async app => {
    const result = await app.callTool('audit_memory', {}, codexContext());

    assert.equal(result.access.rawMemoryReturned, false);
    assert.deepEqual(observations, []);
  });
});
