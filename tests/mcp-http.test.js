const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const {
  createStreamableHttpServer,
  SESSION_HEADER,
  PUBLIC_REQUEST_BLOCKED,
  buildPolicyGateSummary,
  createSessionHardeningConfig,
  getHttpAuthWarning
} = require('../src/adapters/codex-mcp/http');
const {
  validateGovernedMcpToolsListCoversCurrentProductGoal
} = require('../src/core/CurrentProductGoalContract');

const NO_TOKEN_OVERVIEW_KEYS = [
  'access',
  'activeMemoryHealth',
  'adapterStatus',
  'cacheHealth',
  'indexHealth',
  'recall',
  'runtimePosture',
  'shadowSync',
  'summary'
];

const AUTHENTICATED_BOUNDED_OVERVIEW_KEYS = [
  ...NO_TOKEN_OVERVIEW_KEYS,
  'governedNativeBridge'
].sort();

const NO_TOKEN_OVERVIEW_ACCESS_KEYS = [
  'detailFieldsReturned',
  'embeddingFingerprintReturned',
  'memoryLinksReturned',
  'mode',
  'pathsReturned',
  'publicAccess',
  'recallRecentReturned',
  'recentAuditReturned',
  'recentFilesReturned',
  'selectedProjection',
  'selectedProjectionVersion'
];

const HEALTH_ACCESS_KEYS = [
  'bearerTokenRequiredForMcpTools',
  'embeddingFingerprintReturned',
  'filesystemPathsReturned',
  'mode',
  'rawMemoryFieldsReturned',
  'rawStoreFieldsReturned',
  'runtimeDetailLevel',
  'selectedProjection',
  'selectedProjectionVersion',
  'tokenMaterialReturned'
];

const LOW_DISCLOSURE_HEALTH_KEYS = [
  'auth',
  'name',
  'ok',
  'path',
  'protocol',
  'runtimeFreshness',
  'version'
];

const RUNTIME_FRESHNESS_KEYS = [
  'algorithm',
  'sourceFileCount',
  'sourceFingerprint',
  'startedAt'
];

const RECORD_MEMORY_PRINCIPAL_SCOPE_POLICY = {
  allowedAgentAlias: 'Codex',
  allowedAgentIds: ['codex-desktop'],
  allowedRequestSources: ['codex-memory-mcp'],
  allowedProjectIds: ['codex-memory'],
  allowedWorkspaceIds: ['workspace-alpha'],
  allowedClientIds: ['codex']
};

function governedNativeCodexContext(requestContext = {}) {
  return {
    executionContext: {
      agentAlias: 'Codex',
      agentId: 'codex-desktop',
      clientId: 'codex',
      projectId: 'codex-memory',
      workspaceId: 'workspace-alpha',
      visibility: 'private',
      requestSource: 'codex-memory-mcp'
    },
    ...requestContext
  };
}

const RECORD_MEMORY_STRICT_AUTH_ENV_KEYS = [
  'CODEX_MEMORY_AGENT_ALIAS',
  'CODEX_MEMORY_AGENT_ID',
  'CODEX_MEMORY_REQUEST_SOURCE',
  'CODEX_MEMORY_PROJECT_ID',
  'CODEX_MEMORY_WORKSPACE_ID',
  'CODEX_MEMORY_CLIENT_ID',
  'CODEX_MEMORY_RECORD_MEMORY_AUTH_MODE',
  'CODEX_MEMORY_RECORD_MEMORY_ALLOWED_AGENT_ALIAS',
  'CODEX_MEMORY_RECORD_MEMORY_ALLOWED_AGENT_IDS',
  'CODEX_MEMORY_RECORD_MEMORY_ALLOWED_REQUEST_SOURCES',
  'CODEX_MEMORY_RECORD_MEMORY_ALLOWED_PROJECT_IDS',
  'CODEX_MEMORY_RECORD_MEMORY_ALLOWED_WORKSPACE_IDS',
  'CODEX_MEMORY_RECORD_MEMORY_ALLOWED_CLIENT_IDS'
];

async function withRecordMemoryStrictAuthEnv(values, handler) {
  const previous = new Map(RECORD_MEMORY_STRICT_AUTH_ENV_KEYS.map(key => [key, process.env[key]]));
  for (const key of RECORD_MEMORY_STRICT_AUTH_ENV_KEYS) {
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }

  try {
    await handler();
  } finally {
    for (const key of RECORD_MEMORY_STRICT_AUTH_ENV_KEYS) {
      const value = previous.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

async function withHttpServer(handler, serverOptions = {}, appOverrides = {}) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data'),
    httpPort: 0,
    allowExternalProvider: false,
    ...receiptAwareNativeCallerOverrides(appOverrides)
  });

  await app.initialize();
  const httpServer = createStreamableHttpServer({
    app,
    host: '127.0.0.1',
    port: 0,
    mcpPath: '/mcp/codex-memory',
    ...serverOptions
  });

  const address = await httpServer.listen();

  try {
    await handler({ app, address, httpServer });
  } finally {
    await httpServer.close();
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
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

test('HTTP MCP should initialize and return a session header', async () => {
  await withHttpServer(async ({ address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: {
            name: 'codex-memory-http-test',
            version: '1.0'
          }
        }
      })
    });

    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.ok(response.headers.get(SESSION_HEADER));
    assert.equal(payload.result.serverInfo.name, 'vcp_codex_memory');
    assert.equal(payload.result.protocolVersion, '2025-03-26');
    assert.equal(
      payload.result._meta.codexMemoryGovernedBridge.productGoal.primaryRuntime,
      'VCPToolBox native memory'
    );
    assert.equal(
      payload.result._meta.codexMemoryGovernedBridge.nativeBridge.accessPath,
      'governed MCP tools'
    );
    assert.equal(
      payload.result._meta.codexMemoryGovernedBridge.governanceTransport.metadataPath,
      'params._meta.codexMemoryGovernance'
    );
    assert.equal(
      payload.result._meta.codexMemoryGovernedBridge.disclosure.serverHandshakeLowDisclosure,
      true
    );
  });
});

test('HTTP MCP should expose health and tools/list', async () => {
  await withHttpServer(async ({ app, address }) => {
    assert.equal(app.services.memoryWriteReconcileWorker.isRunning(), false);

    const health = await fetch(address.url.replace('/mcp/codex-memory', '/health'));
    const healthPayload = await health.json();
    assert.equal(health.status, 200);
    assert.equal(healthPayload.ok, true);
    assert.deepEqual(Object.keys(healthPayload).sort(), LOW_DISCLOSURE_HEALTH_KEYS);
    assert.deepEqual(Object.keys(healthPayload.auth).sort(), ['required']);
    assert.deepEqual(Object.keys(healthPayload.runtimeFreshness).sort(), RUNTIME_FRESHNESS_KEYS);
    assert.equal(healthPayload.auth.required, false);
    const serializedHealth = JSON.stringify(healthPayload);
    assert.doesNotMatch(serializedHealth, /test-token/i);
    assert.doesNotMatch(serializedHealth, /loopback host without a bearer token/i);
    assert.equal(healthPayload.access, undefined);
    assert.equal(healthPayload.sessionHardening, undefined);
    assert.equal(healthPayload.policyGates, undefined);
    assert.equal(healthPayload.runtime, undefined);
    assert.doesNotMatch(serializedHealth, /"embeddingProfile"\s*:/);
    assert.doesNotMatch(serializedHealth, /memoryId/i);
    assert.doesNotMatch(serializedHealth, /auditLogPath/i);
    assert.doesNotMatch(serializedHealth, /processDiaryPath/i);
    assert.doesNotMatch(serializedHealth, /knowledgeDiaryPath/i);
    assert.doesNotMatch(serializedHealth, /candidateCachePath/i);
    assert.equal(app.services.memoryWriteReconcileWorker.isRunning(), false);

    const tools = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      })
    });
    const payload = await tools.json();
    assert.equal(payload.result.tools.length, 7);
    const searchMemory = payload.result.tools.find(tool => tool.name === 'search_memory');
    const recordMemory = payload.result.tools.find(tool => tool.name === 'record_memory');
    const auditMemory = payload.result.tools.find(tool => tool.name === 'audit_memory');
    const validateMemory = payload.result.tools.find(tool => tool.name === 'validate_memory');
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.nativeBridge.direction, 'read');
    assert.deepEqual(searchMemory._meta.codexMemoryGovernedBridge.clientIdentity.allowedClientIds, ['Codex']);
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
      ['private', 'project', 'workspace']
    );
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.scopeBoundary.toolArgumentsMayOverride, false);
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.scopeBoundary
        .governanceMetadataMayOverrideTransportContext,
      false
    );
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.scopeBoundary.rawScopeValueReturned, false);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.runtimeTarget.primaryRuntime, 'VCPToolBox native memory');
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.runtimeTarget.source, 'bridge_runtime_or_static_config');
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.runtimeTarget.bound, false);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.runtimeTarget.configured, false);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.runtimeTarget.targetReferenceName, null);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.runtimeTarget.targetKind, 'mcp_server');
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.runtimeTarget.sourceAuthority, 'bridge_runtime_or_static_config');
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.runtimeTarget.toolArgumentsMayOverride, false);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.runtimeTarget.governanceMetadataMayOverride, false);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.runtimeTarget.endpointDisclosed, false);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.runtimeTarget.tokenMaterialDisclosed, false);
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
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.invocationProfile.profileMustMatchToolDirection, true);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.invocationProfile.locatorOrSecretMaterialAllowed, false);
    assert.equal(recordMemory._meta.codexMemoryGovernedBridge.invocationProfile.profile, 'governed_bounded_write');
    assert.equal(recordMemory._meta.codexMemoryGovernedBridge.invocationProfile.toolName, 'record_memory');
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.outputDisclosureBudget.source,
      'bridge_gate_normalized_governance'
    );
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.outputDisclosureBudget.bound, true);
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
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.outputDisclosureBudget.toolArgumentsMayOverride, false);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.outputDisclosureBudget.toolArgumentsMayIncreaseBudget, false);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.outputDisclosureBudget.toolArgumentsMayRequestRawOutput, false);
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.outputDisclosureBudget.governanceMetadataMayOverride,
      false
    );
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.outputDisclosureBudget.overBudgetFallbackToRawOutput, false);
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.source,
      'bridge_gate_normalized_governance'
    );
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.lowDisclosureBound, true);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.toolArgumentsMayOverride, false);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.governanceMetadataMayOverride, false);
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
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsScopeFingerprint, true);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsScopeFieldNames, true);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsOutputBudgetBuckets, true);
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.auditReceipt
        .recordsNativeInvocationGovernanceMetadataBinding,
      true
    );
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordedEvidenceFields
        .includes('nativeInvocationGovernanceMetadataBinding'),
      true
    );
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordedEvidenceFields
        .includes('nativeInvocationJsonRpcRequestIdCategory'),
      true
    );
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordedEvidenceFields
        .includes('nativeInvocationJsonRpcResponseIdMatched'),
      true
    );
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordedEvidenceFields
        .includes('nativeInvocationJsonRpcErrorPresent'),
      true
    );
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordedEvidenceFields
        .includes('nativeInvocationJsonRpcErrorReasonCode'),
      true
    );
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsLocalFallbackRole, true);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsLocalFallbackSourceRuntime, true);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsLocalFallbackAuthorization, true);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsLocalFallbackAuditReceiptStatus, true);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsLocalFallbackNativeReadFailureBuckets, true);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsLocalFallbackNativeResultBoundary, true);
    assert.equal(recordMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsLocalFallbackRole, false);
    assert.equal(recordMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsLocalFallbackSourceRuntime, false);
    assert.equal(recordMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsLocalFallbackAuthorization, false);
    assert.equal(recordMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsLocalFallbackAuditReceiptStatus, false);
    assert.equal(recordMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsLocalFallbackNativeReadFailureBuckets, false);
    assert.equal(recordMemory._meta.codexMemoryGovernedBridge.auditReceipt.recordsLocalFallbackNativeResultBoundary, false);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.rawScopePersisted, false);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.rawRequestBodyPersisted, false);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.rawResponseBodyPersisted, false);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.auditReceipt.rawNativePayloadPersisted, false);
    assert.deepEqual(searchMemory._meta.codexMemoryGovernedBridge.rollbackPosture.acceptedReadPostures, [
      'no_runtime_state_to_rollback',
      'read_only_no_write'
    ]);
    assert.deepEqual(recordMemory._meta.codexMemoryGovernedBridge.rollbackPosture.acceptedWritePostures, [
      'bounded_rollback_plan',
      'mutation_cleanup_plan'
    ]);
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.rollbackPosture.source,
      'bridge_gate_normalized_governance'
    );
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.rollbackPosture.bound, true);
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.rollbackPosture.readRollbackPlanReferenceAllowed,
      false
    );
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.rollbackPosture.readRollbackDisposition,
      'no_runtime_write_to_rollback'
    );
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.rollbackPosture.writeRollbackPlanReferenceRequired,
      false
    );
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.rollbackPosture.writeRollbackPlanShapeOnlyRequired,
      false
    );
    assert.equal(
      recordMemory._meta.codexMemoryGovernedBridge.rollbackPosture.writeRollbackPlanReferenceRequired,
      true
    );
    assert.equal(
      recordMemory._meta.codexMemoryGovernedBridge.rollbackPosture.writeRollbackPlanReferenceSafeRequired,
      true
    );
    assert.equal(
      recordMemory._meta.codexMemoryGovernedBridge.rollbackPosture.writeRollbackPlanBoundRequired,
      true
    );
    assert.equal(
      recordMemory._meta.codexMemoryGovernedBridge.rollbackPosture.writeRollbackPlanShapeOnlyRequired,
      true
    );
    assert.equal(
      recordMemory._meta.codexMemoryGovernedBridge.rollbackPosture.writeRollbackApplyRequiresGovernedFollowup,
      true
    );
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.rollbackPosture.toolArgumentsMayOverride, false);
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.rollbackPosture.governanceMetadataMayOverride, false);
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
        .auditEvidenceAllowed,
      true
    );
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.nativeBridge.localMemoryRuntimePosture
        .validationFixtureAllowed,
      true
    );
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.nativeBridge.localMemoryRuntimePosture
        .compatibilityAllowed,
      true
    );
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.nativeBridge.localMemoryRuntimePosture
        .offlineContinuityAllowed,
      true
    );
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.nativeBridge.localMemoryRuntimePosture
        .rawFallbackMayBeMistakenForNative,
      false
    );
    assert.equal(searchMemory._meta.codexMemoryGovernedBridge.governanceTransport.metadataPath, 'params._meta.codexMemoryGovernance');
    assert.equal(
      searchMemory._meta.codexMemoryGovernedBridge.governanceTransport
        .trustedExecutionContextRequiredForNativeDelegation,
      true
    );
    assert.deepEqual(
      searchMemory._meta.codexMemoryGovernedBridge.adapterRevalidation.requiredGateBooleans,
      [
        'trusted_execution_context_supplied',
        'trusted_execution_context_accepted',
        'trusted_execution_context_scope_matched'
      ]
    );
    assert.equal(
      recordMemory._meta.codexMemoryGovernedBridge.rollbackPosture.postCommitFailureDisposition,
      'rollback_required_not_applied'
    );
    assert.equal(
      recordMemory._meta.codexMemoryGovernedBridge.rollbackPosture.postCommitFailureApplyPolicy,
      'manual_governed_followup_required'
    );
    assert.deepEqual(
      recordMemory._meta.codexMemoryGovernedBridge.nativeBridge.localMemoryRole,
      ['fallback', 'audit', 'validation fixture', 'compatibility', 'offline continuity']
    );
    assert.equal(
      recordMemory._meta.codexMemoryGovernedBridge.nativeBridge.localMemoryRuntimePosture
        .primaryRuntime,
      'VCPToolBox native memory'
    );
    assert.equal(
      recordMemory._meta.codexMemoryGovernedBridge.nativeBridge.localMemoryRuntimePosture
        .localMemoryPrimaryRuntime,
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
    assert.equal(
      recordMemory._meta.codexMemoryGovernedBridge.nativeBridge.localMemoryRuntimePosture
        .offlineContinuityAllowed,
      true
    );
    assert.equal(
      recordMemory._meta.codexMemoryGovernedBridge.nativeBridge.localMemoryRuntimePosture
        .rawFallbackMayBeMistakenForNative,
      false
    );
    assert.ok(auditMemory.inputSchema.properties.scope.properties.scope_id);
    assert.equal(validateMemory._meta.codexMemoryGovernedBridge.nativeBridge.eligible, false);
    assert.equal(validateMemory._meta.codexMemoryGovernedBridge.nativeBridge.direction, 'none');
    assert.deepEqual(validateMemory._meta.codexMemoryGovernedBridge.scopeBoundary.requiredFieldNames, []);
    assert.deepEqual(validateMemory._meta.codexMemoryGovernedBridge.scopeBoundary.acceptedVisibility, []);
    assert.equal(
      validateMemory._meta.codexMemoryGovernedBridge.nativeBridge.invocationProfile,
      'local_or_compatibility_tool'
    );
    assert.deepEqual(
      validateMemory._meta.codexMemoryGovernedBridge.nativeBridge.localMemoryRole,
      ['compatibility']
    );
    assert.equal(
      validateMemory._meta.codexMemoryGovernedBridge.nativeBridge.localMemoryRuntimePosture
        .primaryRuntime,
      'codex_memory_local'
    );
    assert.equal(
      validateMemory._meta.codexMemoryGovernedBridge.nativeBridge.localMemoryRuntimePosture
        .localMemoryPrimaryRuntime,
      true
    );
    assert.equal(
      validateMemory._meta.codexMemoryGovernedBridge.nativeBridge.localMemoryRuntimePosture
        .compatibilityAllowed,
      true
    );
    assert.equal(
      validateMemory._meta.codexMemoryGovernedBridge.nativeBridge.localMemoryRuntimePosture
        .fallbackAllowed,
      false
    );
    assert.equal(validateMemory._meta.codexMemoryGovernedBridge.auditReceipt.required, false);
  });
});

test('HTTP MCP tools/list exposes bound runtime target only after safe runtime target config', async () => {
  await withHttpServer(async ({ address }) => {
    const tools = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      })
    });
    const payload = await tools.json();
    const searchMemory = payload.result.tools.find(tool => tool.name === 'search_memory');
    const runtimeTarget = searchMemory._meta.codexMemoryGovernedBridge.runtimeTarget;
    const serialized = JSON.stringify(runtimeTarget);

    assert.equal(runtimeTarget.primaryRuntime, 'VCPToolBox native memory');
    assert.equal(runtimeTarget.source, 'bridge_runtime_or_static_config');
    assert.equal(runtimeTarget.bound, true);
    assert.equal(runtimeTarget.configured, true);
    assert.equal(runtimeTarget.targetReferenceName, 'operator-vcp-toolbox-service-ref');
    assert.equal(runtimeTarget.targetKind, 'mcp_server');
    assert.equal(runtimeTarget.sourceAuthority, 'bridge_runtime_or_static_config');
    assert.equal(runtimeTarget.toolArgumentsMayOverride, false);
    assert.equal(runtimeTarget.governanceMetadataMayOverride, false);
    assert.equal(runtimeTarget.locatorDisclosed, false);
    assert.equal(runtimeTarget.endpointDisclosed, false);
    assert.equal(runtimeTarget.tokenMaterialDisclosed, false);
    assert.equal(serialized.includes('http://'), false);
  }, {}, {
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    }
  });
});

test('HTTP MCP tools/list covers current product-goal native bridge tool surface', async () => {
  await withHttpServer(async ({ address }) => {
    const tools = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      })
    });
    const payload = await tools.json();
    const coverage = validateGovernedMcpToolsListCoversCurrentProductGoal(
      payload.result.tools,
      { requireRuntimeTargetBound: true }
    );

    assert.equal(tools.status, 200);
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
  }, {}, {
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    }
  });
});

test('HTTP MCP bearer-configured no-token health remains low disclosure', async () => {
  await withHttpServer(async ({ address }) => {
    const health = await fetch(address.url.replace('/mcp/codex-memory', '/health'));
    const healthPayload = await health.json();
    const serializedHealth = JSON.stringify(healthPayload);

    assert.equal(health.status, 200);
    assert.equal(healthPayload.ok, true);
    assert.deepEqual(Object.keys(healthPayload).sort(), LOW_DISCLOSURE_HEALTH_KEYS);
    assert.deepEqual(Object.keys(healthPayload.auth).sort(), ['required']);
    assert.deepEqual(Object.keys(healthPayload.runtimeFreshness).sort(), RUNTIME_FRESHNESS_KEYS);
    assert.equal(healthPayload.auth.required, true);
    assert.equal(healthPayload.access, undefined);
    assert.equal(healthPayload.sessionHardening, undefined);
    assert.equal(healthPayload.policyGates, undefined);
    assert.equal(healthPayload.runtime, undefined);
    assert.doesNotMatch(serializedHealth, /test-token/i);
    assert.doesNotMatch(serializedHealth, /"embeddingProfile"\s*:/);
    assert.doesNotMatch(serializedHealth, /memoryId/i);
    assert.doesNotMatch(serializedHealth, /auditLogPath/i);
    assert.doesNotMatch(serializedHealth, /processDiaryPath/i);
    assert.doesNotMatch(serializedHealth, /knowledgeDiaryPath/i);
    assert.doesNotMatch(serializedHealth, /candidateCachePath/i);
  }, { bearerToken: 'test-token' });
});

test('HTTP MCP no-token loopback warning is explicit and non-loopback remains fail closed', () => {
  const warning = getHttpAuthWarning({ host: '127.0.0.1', bearerToken: '' });

  assert.match(warning, /loopback/i);
  assert.match(warning, /CODEX_MEMORY_HTTP_TOKEN/);
  assert.match(warning, /local development only/i);
  assert.match(warning, /Do not expose this listener beyond this machine/i);
  assert.doesNotMatch(warning, /ready/i);
  assert.doesNotMatch(warning, /safe for production/i);
  assert.equal(getHttpAuthWarning({ host: '127.0.0.1', bearerToken: 'test-token' }), null);
  assert.throws(
    () => getHttpAuthWarning({ host: '0.0.0.0', bearerToken: '' }),
    /CODEX_MEMORY_HTTP_TOKEN is required/
  );
});

test('HTTP MCP policy gate summary is bounded and omits provider, path, and token material', () => {
  const summary = buildPolicyGateSummary({
    config: {
      securityProfile: 'hardened',
      enableSoftReadPolicy: true,
      enableLifecycleReadPolicy: false,
      enableWritePreflight: true,
      allowExternalProvider: false,
      embeddingUrl: 'https://provider.example.test/v1/embeddings',
      embeddingModel: 'private-model',
      httpLogPath: 'C:\\Users\\admin\\.env',
      bearerToken: 'test-token',
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
    }
  });
  const serialized = JSON.stringify(summary);

  assert.deepEqual(Object.keys(summary).sort(), [
    'externalProviderAllowed',
    'governedNativeBridgeWarnings',
    'lifecycleReadPolicyEnabled',
    'securityProfile',
    'softReadPolicyEnabled',
    'writePreflightEnabled'
  ]);
  assert.deepEqual(summary, {
    securityProfile: 'hardened',
    softReadPolicyEnabled: true,
    lifecycleReadPolicyEnabled: false,
    writePreflightEnabled: true,
    externalProviderAllowed: false,
    governedNativeBridgeWarnings: [
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
    ]
  });
  assert.doesNotMatch(serialized, /provider\.example/i);
  assert.doesNotMatch(serialized, /private-model/i);
  assert.doesNotMatch(serialized, /C:\\Users/i);
  assert.doesNotMatch(serialized, /test-token/i);
  assert.doesNotMatch(serialized, /PRIVATE_ENDPOINT_SHOULD_NOT_ECHO/i);
  assert.doesNotMatch(serialized, /SECRET_TOKEN_SHOULD_NOT_ECHO/i);
  assert.doesNotMatch(serialized, /PRIVATE_NATIVE_TARGET_SHOULD_NOT_ECHO/i);
  assert.doesNotMatch(serialized, /SECRET_NATIVE_TARGET_TOKEN_SHOULD_NOT_ECHO/i);
  assert.doesNotMatch(serialized, /PRIVATE_WARNING_CODE_SHOULD_NOT_ECHO/i);
  assert.doesNotMatch(serialized, /SECRET_WARNING_EFFECT_SHOULD_NOT_ECHO/i);
});

test('HTTP MCP bearer health returns full bounded payload with valid token only', async () => {
  await withHttpServer(async ({ app, address }) => {
    const health = await fetch(address.url.replace('/mcp/codex-memory', '/health'), {
      headers: {
        Authorization: 'Bearer test-token'
      }
    });
    const healthPayload = await health.json();
    const serializedHealth = JSON.stringify(healthPayload);

    assert.equal(health.status, 200);
    assert.equal(healthPayload.ok, true);
    assert.deepEqual(Object.keys(healthPayload.access).sort(), HEALTH_ACCESS_KEYS);
    assert.equal(healthPayload.access.mode, 'health_full');
    assert.equal(healthPayload.access.selectedProjection, false);
    assert.equal(healthPayload.access.selectedProjectionVersion, 1);
    assert.equal(healthPayload.access.bearerTokenRequiredForMcpTools, true);
    assert.equal(healthPayload.access.tokenMaterialReturned, false);
    assert.equal(healthPayload.access.filesystemPathsReturned, false);
    assert.equal(healthPayload.access.rawStoreFieldsReturned, false);
    assert.equal(healthPayload.access.rawMemoryFieldsReturned, false);
    assert.equal(healthPayload.access.embeddingFingerprintReturned, false);
    assert.equal(healthPayload.access.runtimeDetailLevel, 'bounded');
    assert.equal(healthPayload.auth.required, true);
    assert.equal(healthPayload.auth.warning, null);
    assert.deepEqual(Object.keys(healthPayload.policyGates).sort(), [
      'externalProviderAllowed',
      'governedNativeBridgeWarnings',
      'lifecycleReadPolicyEnabled',
      'securityProfile',
      'softReadPolicyEnabled',
      'writePreflightEnabled'
    ]);
    assert.equal(healthPayload.policyGates.securityProfile, 'hardened');
    assert.equal(healthPayload.policyGates.softReadPolicyEnabled, true);
    assert.equal(healthPayload.policyGates.lifecycleReadPolicyEnabled, false);
    assert.equal(healthPayload.policyGates.writePreflightEnabled, true);
    assert.equal(healthPayload.policyGates.externalProviderAllowed, false);
    assert.deepEqual(healthPayload.policyGates.governedNativeBridgeWarnings, []);
    assert.deepEqual(Object.keys(healthPayload.runtime).sort(), [
      'governedNativeBridge',
      'writeReconcileWorker'
    ]);
    assert.equal(healthPayload.runtime.governedNativeBridge.available, true);
    assert.equal(healthPayload.runtime.governedNativeBridge.observationCount, 0);
    assert.equal(healthPayload.runtime.governedNativeBridge.latest, null);
    assert.equal(healthPayload.runtime.governedNativeBridge.readinessClaimed, false);
    assert.deepEqual(Object.keys(healthPayload.runtime.writeReconcileWorker).sort(), [
      'available',
      'dryRun',
      'intervalMs',
      'lastResultSummary',
      'limit',
      'maxRuns',
      'runCount',
      'running',
      'tickInFlight',
      'timerScheduled'
    ]);
    assert.equal(healthPayload.runtime.writeReconcileWorker.available, true);
    assert.equal(healthPayload.runtime.writeReconcileWorker.running, false);
    assert.equal(healthPayload.runtime.writeReconcileWorker.timerScheduled, false);
    assert.equal(healthPayload.runtime.writeReconcileWorker.tickInFlight, false);
    assert.equal(healthPayload.runtime.writeReconcileWorker.runCount, 0);
    assert.equal(healthPayload.runtime.writeReconcileWorker.lastResultSummary, null);
    assert.equal(app.services.memoryWriteReconcileWorker.isRunning(), false);
    assert.doesNotMatch(serializedHealth, /test-token/i);
    assert.doesNotMatch(serializedHealth, /example\.invalid/i);
    assert.doesNotMatch(serializedHealth, /memoryId/i);
    assert.doesNotMatch(serializedHealth, /auditLogPath/i);
  }, { bearerToken: 'test-token' }, {
    securityProfile: 'hardened',
    enableLifecycleReadPolicy: false,
    enableWritePreflight: true,
    allowExternalProvider: false,
    embeddingUrl: 'http://example.invalid',
    embeddingModel: 'private-model'
  });
});

test('HTTP MCP bearer health exposes latest governed native bridge probe summary only', async () => {
  const rawPrivateValue = 'RAW_NATIVE_PROBE_VALUE_SHOULD_NOT_ECHO';

  await withHttpServer(async ({ app, address }) => {
    await app.callTool('audit_memory', {}, governedNativeCodexContext());

    const health = await fetch(address.url.replace('/mcp/codex-memory', '/health'), {
      headers: {
        Authorization: 'Bearer test-token'
      }
    });
    const payload = await health.json();
    const nativeBridge = payload.runtime.governedNativeBridge;
    const serialized = JSON.stringify(payload);

    assert.equal(health.status, 200);
    assert.equal(nativeBridge.available, true);
    assert.equal(nativeBridge.observationCount, 1);
    assert.equal(nativeBridge.latest.toolName, 'audit_memory');
    assert.equal(nativeBridge.latest.mode, 'observe');
    assert.equal(nativeBridge.latest.gateAccepted, true);
    assert.equal(nativeBridge.latest.clientId, 'Codex');
    assert.equal(nativeBridge.latest.visibility, 'private');
    assert.equal(nativeBridge.latest.scopePresent, true);
    assert.equal(nativeBridge.latest.scopeIdentifierPresent, true);
    assert.equal(nativeBridge.latest.scopeIdentifierSafe, true);
    assert.deepEqual(nativeBridge.latest.scopeFieldNames, [
      'client_id',
      'project_id',
      'visibility',
      'workspace_id'
    ]);
    assert.deepEqual(nativeBridge.latest.scopeIdentifierFieldNames, [
      'project_id',
      'workspace_id'
    ]);
    assert.equal(nativeBridge.latest.scopeFingerprintPresent, true);
    assert.equal(nativeBridge.latest.rawScopePersisted, false);
    assert.equal(nativeBridge.latest.rawScopeValueReturned, false);
    assert.equal(nativeBridge.latest.clientIdentitySource, 'trusted_execution_context_or_transport');
    assert.equal(nativeBridge.latest.clientIdentityBound, true);
    assert.equal(nativeBridge.latest.clientIdentityToolArgumentsMayOverride, false);
    assert.equal(nativeBridge.latest.clientIdentityGovernanceMetadataMayOverride, false);
    assert.equal(nativeBridge.latest.scopeBoundarySource, 'trusted_execution_context_or_transport');
    assert.equal(nativeBridge.latest.scopeBoundaryBound, true);
    assert.equal(nativeBridge.latest.scopeToolArgumentsMayOverride, false);
    assert.equal(nativeBridge.latest.scopeGovernanceMetadataMayOverride, false);
    assert.equal(nativeBridge.latest.visibilityBound, true);
    assert.equal(nativeBridge.latest.accessPath, 'governed MCP tools');
    assert.equal(nativeBridge.latest.readOnlyProbeAccepted, true);
    assert.equal(nativeBridge.latest.readShapeProbeTargetResolverAccepted, true);
    assert.equal(nativeBridge.latest.readShapeProbeExecuted, true);
    assert.equal(nativeBridge.latest.primaryRuntime, 'VCPToolBox native memory');
    assert.equal(nativeBridge.latest.runtimeTargetConfigured, true);
    assert.equal(nativeBridge.latest.runtimeTargetKind, 'mcp_server');
    assert.equal(nativeBridge.latest.runtimeTargetSourceAuthority, 'bridge_runtime_or_static_config');
    assert.equal(nativeBridge.latest.runtimeTargetForbiddenFieldCount, 0);
    assert.equal(nativeBridge.latest.runtimeTargetBound, true);
    assert.equal(nativeBridge.latest.runtimeTargetToolArgumentsMayOverride, false);
    assert.equal(nativeBridge.latest.runtimeTargetGovernanceMetadataMayOverride, false);
    assert.equal(nativeBridge.latest.targetReferenceName, 'operator-vcp-toolbox-service-ref');
    assert.equal(nativeBridge.latest.runtimeTargetLocatorDisclosed, false);
    assert.equal(nativeBridge.latest.runtimeTargetEndpointDisclosed, false);
    assert.equal(nativeBridge.latest.runtimeTargetTokenMaterialDisclosed, false);
    assert.equal(nativeBridge.latest.invocationProfile, 'governed_read_only');
    assert.equal(nativeBridge.latest.invocationProfileSource, 'bridge_tool_binding');
    assert.equal(nativeBridge.latest.invocationProfileBound, true);
    assert.equal(nativeBridge.latest.invocationProfileToolArgumentsMayOverride, false);
    assert.equal(nativeBridge.latest.invocationProfileGovernanceMetadataMayOverride, false);
    assert.equal(nativeBridge.latest.invocationProfileForbiddenFieldCount, 0);
    assert.equal(nativeBridge.latest.readAllowed, true);
    assert.equal(nativeBridge.latest.writeAllowed, false);
    assert.equal(nativeBridge.latest.readWriteAuthoritySource, 'bridge_tool_binding');
    assert.equal(nativeBridge.latest.readWriteAuthorityBound, true);
    assert.equal(nativeBridge.latest.mixedReadWriteAllowed, false);
    assert.equal(nativeBridge.latest.unboundedWriteAllowed, false);
    assert.equal(nativeBridge.latest.writeRequiresExactApproval, false);
    assert.equal(nativeBridge.latest.readWriteAuthorityForbiddenFieldCount, 0);
    assert.equal(nativeBridge.latest.transportCategory, 'local_direct_component_action_invoker');
    assert.equal(nativeBridge.latest.statusClass, 'success');
    assert.equal(nativeBridge.latest.responseShapeCategory, 'array_item_count_bucket_only');
    assert.equal(nativeBridge.latest.runtimeExecuted, true);
    assert.equal(nativeBridge.latest.networkCalled, false);
    assert.equal(nativeBridge.latest.memoryWritePerformed, false);
    assert.equal(nativeBridge.latest.rawResponseBodyDisclosed, false);
    assert.equal(nativeBridge.latest.readinessClaimed, false);
    assert.equal(nativeBridge.readinessClaimed, false);
    assert.equal(serialized.includes(rawPrivateValue), false);
  }, { bearerToken: 'test-token' }, {
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'workspace-alpha',
    defaultClientId: 'codex',
    defaultVisibility: 'private',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeReadShapeProbeInvoker: async () => [
      {
        privateFieldNameShouldNotEcho: rawPrivateValue
      }
    ]
  });
});

test('HTTP MCP bearer health binds latest governed native read delegation receipt evidence', async () => {
  const rawPrivateValue = 'RAW_NATIVE_DELEGATION_VALUE_SHOULD_NOT_ECHO';
  const readDelegationToolCaller = async payload => [{
    privateFieldNameShouldNotEcho: rawPrivateValue,
    query: payload.arguments?.query
  }];
  readDelegationToolCaller.callWithReceipt = async payload => ({
    value: [{
      privateFieldNameShouldNotEcho: rawPrivateValue,
      query: payload.arguments?.query
    }],
    receipt: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server',
      transportCategory: 'local_http_transport',
      mcpMethod: 'tools/call',
      toolName: 'search_memory',
      requestIdCategory: 'generated_bridge_request_id',
      jsonRpcResponseIdMatched: true,
      governanceMetadataPath: 'params._meta.codexMemoryGovernance',
      governanceMetadataSent: true,
      governanceMetadataRawValueDisclosed: false,
      statusClass: 'success',
      httpStatusClass: 'success',
      jsonRpcErrorPresent: false,
      responseShapeCategory: 'array_top_level_kind_only',
      topLevelKindCategory: 'array',
      rawRequestBodyDisclosed: false,
      rawResponseBodyDisclosed: false,
      readinessClaimed: false
    }
  });

  await withHttpServer(async ({ app, address }) => {
    const result = await app.callTool(
      'search_memory',
      { query: 'governed native delegation health evidence' },
      governedNativeCodexContext()
    );
    const health = await fetch(address.url.replace('/mcp/codex-memory', '/health'), {
      headers: {
        Authorization: 'Bearer test-token'
      }
    });
    const payload = await health.json();
    const nativeBridge = payload.runtime.governedNativeBridge;
    const serialized = JSON.stringify(payload);

    assert.equal(result.status, 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATED');
    assert.equal(health.status, 200);
    assert.equal(nativeBridge.observationCount, 1);
    assert.equal(nativeBridge.latest.toolName, 'search_memory');
    assert.equal(nativeBridge.latest.clientId, 'Codex');
    assert.equal(nativeBridge.latest.visibility, 'private');
    assert.equal(nativeBridge.latest.scopePresent, true);
    assert.equal(nativeBridge.latest.scopeIdentifierPresent, true);
    assert.equal(nativeBridge.latest.scopeIdentifierSafe, true);
    assert.deepEqual(nativeBridge.latest.scopeFieldNames, [
      'client_id',
      'project_id',
      'visibility',
      'workspace_id'
    ]);
    assert.deepEqual(nativeBridge.latest.scopeIdentifierFieldNames, [
      'project_id',
      'workspace_id'
    ]);
    assert.equal(nativeBridge.latest.scopeFingerprintPresent, true);
    assert.equal(nativeBridge.latest.rawScopePersisted, false);
    assert.equal(nativeBridge.latest.trustedExecutionContextSupplied, true);
    assert.equal(nativeBridge.latest.trustedExecutionContextAccepted, true);
    assert.equal(nativeBridge.latest.trustedExecutionContextScopeMatched, true);
    assert.equal(nativeBridge.latest.accessPath, 'governed MCP tools');
    assert.equal(nativeBridge.latest.primaryRuntime, 'VCPToolBox native memory');
    assert.equal(nativeBridge.latest.runtimeTargetConfigured, true);
    assert.equal(nativeBridge.latest.runtimeTargetKind, 'mcp_server');
    assert.equal(nativeBridge.latest.runtimeTargetSourceAuthority, 'bridge_runtime_or_static_config');
    assert.equal(nativeBridge.latest.runtimeTargetForbiddenFieldCount, 0);
    assert.equal(nativeBridge.latest.targetReferenceName, 'operator-vcp-toolbox-service-ref');
    assert.equal(nativeBridge.latest.runtimeTargetLocatorDisclosed, false);
    assert.equal(nativeBridge.latest.runtimeTargetEndpointDisclosed, false);
    assert.equal(nativeBridge.latest.runtimeTargetTokenMaterialDisclosed, false);
    assert.equal(nativeBridge.latest.invocationProfile, 'governed_read_only');
    assert.equal(nativeBridge.latest.invocationProfileForbiddenFieldCount, 0);
    assert.equal(nativeBridge.latest.readAllowed, true);
    assert.equal(nativeBridge.latest.writeAllowed, false);
    assert.equal(nativeBridge.latest.readWriteAuthorityForbiddenFieldCount, 0);
    assert.equal(nativeBridge.latest.disclosureLevel, 'summary');
    assert.equal(nativeBridge.latest.outputDisclosureBudgetSource, 'bridge_gate_normalized_governance');
    assert.equal(nativeBridge.latest.outputDisclosureBudgetBound, true);
    assert.equal(nativeBridge.latest.outputDisclosureBudgetToolArgumentsMayOverride, false);
    assert.equal(nativeBridge.latest.outputDisclosureBudgetGovernanceMetadataMayOverride, false);
    assert.equal(nativeBridge.latest.disclosureMaxItems, 5);
    assert.equal(nativeBridge.latest.disclosureMaxBytes, 4096);
    assert.equal(nativeBridge.latest.disclosureForbiddenFieldCount, 0);
    assert.equal(nativeBridge.latest.rawOutputAllowed, false);
    assert.equal(nativeBridge.latest.delegationDirection, 'read');
    assert.equal(nativeBridge.latest.readDelegationAttempted, true);
    assert.equal(nativeBridge.latest.readDelegationAccepted, true);
    assert.equal(nativeBridge.latest.delegationStatusClass, 'success');
    assert.equal(nativeBridge.latest.delegationReasonCode, null);
    assert.equal(nativeBridge.latest.bridgeAuditReceiptAppended, true);
    assert.equal(nativeBridge.latest.bridgeAuditReceiptStatus, 'appended');
    assert.equal(nativeBridge.latest.bridgeAuditReceiptRequired, true);
    assert.equal(nativeBridge.latest.auditReceiptSource, 'bridge_gate_normalized_governance');
    assert.equal(nativeBridge.latest.auditReceiptLowDisclosure, true);
    assert.equal(nativeBridge.latest.auditReceiptLowDisclosureBound, true);
    assert.equal(nativeBridge.latest.auditReceiptToolArgumentsMayOverride, false);
    assert.equal(nativeBridge.latest.auditReceiptGovernanceMetadataMayOverride, false);
    assert.equal(nativeBridge.latest.bridgeReceiptLowDisclosure, true);
    assert.equal(nativeBridge.latest.auditReceiptReferencePresent, true);
    assert.equal(nativeBridge.latest.auditReceiptReferenceSafe, true);
    assert.equal(nativeBridge.latest.auditReceiptReferenceName, 'governed-mcp-search_memory-receipt');
    assert.equal(nativeBridge.latest.auditReceiptForbiddenFieldCount, 0);
    assert.equal(nativeBridge.latest.nativeInvocationAttempted, true);
    assert.equal(nativeBridge.latest.nativeMcpToolInvocationAttempted, true);
    assert.equal(nativeBridge.latest.nativeInvocationReceiptBindingMatched, true);
    assert.equal(nativeBridge.latest.nativeInvocationGovernanceMetadataSent, true);
    assert.equal(
      nativeBridge.latest.nativeInvocationGovernanceMetadataPath,
      'params._meta.codexMemoryGovernance'
    );
    assert.equal(nativeBridge.latest.nativeInvocationGovernanceMetadataRawValueDisclosed, false);
    assert.equal(nativeBridge.latest.nativeInvocationToolName, 'search_memory');
    assert.equal(nativeBridge.latest.nativeInvocationTransportCategory, 'local_http_transport');
    assert.equal(nativeBridge.latest.nativeInvocationMcpMethod, 'tools/call');
    assert.equal(nativeBridge.latest.nativeInvocationStatusClass, 'success');
    assert.equal(nativeBridge.latest.nativeInvocationHttpStatusClass, 'success');
    assert.equal(nativeBridge.latest.nativeInvocationResponseShapeCategory, 'array_top_level_kind_only');
    assert.equal(nativeBridge.latest.memoryReadPerformed, true);
    assert.equal(nativeBridge.latest.memoryWritePerformed, false);
    assert.equal(nativeBridge.latest.rollbackPosture, 'no_runtime_state_to_rollback');
    assert.equal(nativeBridge.latest.rollbackPostureSource, 'bridge_gate_normalized_governance');
    assert.equal(nativeBridge.latest.rollbackPostureForbiddenFieldCount, 0);
    assert.equal(nativeBridge.latest.rollbackPlanReferencePresent, false);
    assert.equal(nativeBridge.latest.rollbackPlanReferenceSafe, false);
    assert.equal(nativeBridge.latest.rollbackPlanBound, false);
    assert.equal(nativeBridge.latest.rollbackPostureToolArgumentsMayOverride, false);
    assert.equal(nativeBridge.latest.rollbackPostureGovernanceMetadataMayOverride, false);
    assert.equal(nativeBridge.latest.rawResponseBodyDisclosed, false);
    assert.equal(nativeBridge.latest.readinessClaimed, false);
    assert.equal(serialized.includes(rawPrivateValue), false);
  }, { bearerToken: 'test-token' }, {
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'workspace-alpha',
    defaultClientId: 'codex',
    defaultVisibility: 'private',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeReadDelegationToolCaller: readDelegationToolCaller
  });
});

test('HTTP MCP bearer health exposes unbound native read delegation reason', async () => {
  const rawPrivateValue = 'RAW_HEALTH_UNBOUND_NATIVE_READ_VALUE_SHOULD_NOT_ECHO';
  const readDelegationToolCaller = async () => {
    throw new Error('callWithReceipt path should be used for governed read health evidence');
  };
  readDelegationToolCaller.callWithReceipt = async payload => ({
    value: [{
      privateFieldNameShouldNotEcho: rawPrivateValue,
      query: payload.arguments?.query
    }],
    receipt: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server',
      transportCategory: 'local_http_transport',
      mcpMethod: 'tools/call',
      toolName: 'audit_memory',
      requestIdCategory: 'generated_bridge_request_id',
      jsonRpcResponseIdMatched: true,
      governanceMetadataPath: 'params._meta.codexMemoryGovernance',
      governanceMetadataSent: true,
      governanceMetadataRawValueDisclosed: false,
      statusClass: 'success',
      httpStatusClass: 'success',
      jsonRpcErrorPresent: false,
      responseShapeCategory: 'array_top_level_kind_only',
      topLevelKindCategory: 'array',
      rawRequestBodyDisclosed: false,
      rawResponseBodyDisclosed: false,
      readinessClaimed: false
    }
  });

  await withHttpServer(async ({ app, address }) => {
    const result = await app.callTool(
      'search_memory',
      { query: 'governed native unbound read health evidence' },
      governedNativeCodexContext()
    );
    const health = await fetch(address.url.replace('/mcp/codex-memory', '/health'), {
      headers: {
        Authorization: 'Bearer test-token'
      }
    });
    const payload = await health.json();
    const nativeBridge = payload.runtime.governedNativeBridge;
    const serialized = JSON.stringify(payload);

    assert.equal(result.status, 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATION_REJECTED');
    assert.equal(result.reasonCode, 'native_read_delegation_native_invocation_receipt_unbound');
    assert.equal(result.access.memoryReadPerformed, true);
    assert.equal(result.access.localMemoryFallbackEligible, false);
    assert.equal(health.status, 200);
    assert.equal(nativeBridge.observationCount, 1);
    assert.equal(nativeBridge.latest.toolName, 'search_memory');
    assert.equal(nativeBridge.latest.clientId, 'Codex');
    assert.equal(nativeBridge.latest.visibility, 'private');
    assert.equal(nativeBridge.latest.invocationProfile, 'governed_read_only');
    assert.equal(nativeBridge.latest.readAllowed, true);
    assert.equal(nativeBridge.latest.writeAllowed, false);
    assert.equal(nativeBridge.latest.readWriteAuthoritySource, 'bridge_tool_binding');
    assert.equal(nativeBridge.latest.readWriteAuthorityBound, true);
    assert.equal(nativeBridge.latest.mixedReadWriteAllowed, false);
    assert.equal(nativeBridge.latest.unboundedWriteAllowed, false);
    assert.equal(nativeBridge.latest.writeRequiresExactApproval, false);
    assert.equal(nativeBridge.latest.delegationDirection, 'read');
    assert.equal(nativeBridge.latest.readDelegationAttempted, true);
    assert.equal(nativeBridge.latest.readDelegationAccepted, false);
    assert.equal(nativeBridge.latest.delegationStatusClass, 'native_invocation_receipt_unbound');
    assert.equal(
      nativeBridge.latest.delegationReasonCode,
      'native_read_delegation_native_invocation_receipt_unbound'
    );
    assert.equal(nativeBridge.latest.nativeInvocationAttempted, true);
    assert.equal(nativeBridge.latest.nativeMcpToolInvocationAttempted, true);
    assert.equal(nativeBridge.latest.nativeInvocationReceiptBindingMatched, false);
    assert.equal(nativeBridge.latest.nativeInvocationGovernanceMetadataSent, true);
    assert.equal(
      nativeBridge.latest.nativeInvocationGovernanceMetadataPath,
      'params._meta.codexMemoryGovernance'
    );
    assert.equal(nativeBridge.latest.nativeInvocationGovernanceMetadataRawValueDisclosed, false);
    assert.equal(nativeBridge.latest.nativeInvocationToolName, null);
    assert.equal(nativeBridge.latest.memoryReadPerformed, true);
    assert.equal(nativeBridge.latest.memoryWritePerformed, false);
    assert.equal(nativeBridge.latest.localMemoryFallbackUsed, false);
    assert.equal(nativeBridge.latest.rawResponseBodyDisclosed, false);
    assert.equal(nativeBridge.latest.readinessClaimed, false);
    assert.equal(serialized.includes(rawPrivateValue), false);
  }, { bearerToken: 'test-token' }, {
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'workspace-alpha',
    defaultClientId: 'codex',
    defaultVisibility: 'private',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeReadDelegationToolCaller: readDelegationToolCaller
  });
});

test('HTTP MCP bearer health binds latest governed native write exact approval and rollback evidence', async () => {
  const rawWriteContent = 'RAW_WRITE_DELEGATION_CONTENT_SHOULD_NOT_ECHO';
  const rawNativeValue = 'RAW_NATIVE_WRITE_DELEGATION_VALUE_SHOULD_NOT_ECHO';
  const writeDelegationToolCaller = async payload => ({
    memory_id: 'RAW_NATIVE_MEMORY_ID_SHOULD_NOT_ECHO',
    content: rawNativeValue,
    title: payload.arguments?.title
  });
  writeDelegationToolCaller.callWithReceipt = async payload => ({
    value: {
      memory_id: 'RAW_NATIVE_MEMORY_ID_SHOULD_NOT_ECHO',
      content: rawNativeValue,
      title: payload.arguments?.title
    },
    receipt: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server',
      transportCategory: 'local_http_transport',
      mcpMethod: 'tools/call',
      toolName: 'record_memory',
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
      readinessClaimed: false
    }
  });

  await withHttpServer(async ({ app, address }) => {
    let localWrites = 0;
    app.services.writeService.record = async () => {
      localWrites += 1;
      return { success: true };
    };

    const result = await app.callTool(
      'record_memory',
      {
        target: 'knowledge',
        title: 'Governed native write health evidence',
        content: rawWriteContent,
        evidence: 'exact approval and rollback evidence should be visible only as buckets',
        validated: true,
        reusable: true,
        sensitivity: 'none'
      },
      governedNativeCodexContext({
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
          rollbackPlanRef: 'cm-health-write-rollback-plan'
        },
        rollbackPosture: {
          mode: 'bounded_rollback_plan',
          rollback_plan_ref: 'cm-health-write-rollback-plan'
        }
      })
    );
    const health = await fetch(address.url.replace('/mcp/codex-memory', '/health'), {
      headers: {
        Authorization: 'Bearer test-token'
      }
    });
    const payload = await health.json();
    const nativeBridge = payload.runtime.governedNativeBridge;
    const serialized = JSON.stringify(payload);

    assert.equal(localWrites, 0);
    assert.equal(result.status, 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATED');
    assert.equal(health.status, 200);
    assert.equal(nativeBridge.observationCount, 1);
    assert.equal(nativeBridge.latest.toolName, 'record_memory');
    assert.equal(nativeBridge.latest.clientId, 'Codex');
    assert.equal(nativeBridge.latest.visibility, 'private');
    assert.equal(nativeBridge.latest.scopePresent, true);
    assert.equal(nativeBridge.latest.scopeIdentifierPresent, true);
    assert.equal(nativeBridge.latest.scopeIdentifierSafe, true);
    assert.deepEqual(nativeBridge.latest.scopeFieldNames, [
      'client_id',
      'project_id',
      'visibility',
      'workspace_id'
    ]);
    assert.deepEqual(nativeBridge.latest.scopeIdentifierFieldNames, [
      'project_id',
      'workspace_id'
    ]);
    assert.equal(nativeBridge.latest.scopeFingerprintPresent, true);
    assert.equal(nativeBridge.latest.rawScopePersisted, false);
    assert.equal(nativeBridge.latest.trustedExecutionContextSupplied, true);
    assert.equal(nativeBridge.latest.trustedExecutionContextAccepted, true);
    assert.equal(nativeBridge.latest.trustedExecutionContextScopeMatched, true);
    assert.equal(nativeBridge.latest.accessPath, 'governed MCP tools');
    assert.equal(nativeBridge.latest.primaryRuntime, 'VCPToolBox native memory');
    assert.equal(nativeBridge.latest.runtimeTargetConfigured, true);
    assert.equal(nativeBridge.latest.runtimeTargetKind, 'mcp_server');
    assert.equal(nativeBridge.latest.runtimeTargetSourceAuthority, 'bridge_runtime_or_static_config');
    assert.equal(nativeBridge.latest.runtimeTargetForbiddenFieldCount, 0);
    assert.equal(nativeBridge.latest.targetReferenceName, 'operator-vcp-toolbox-service-ref');
    assert.equal(nativeBridge.latest.runtimeTargetLocatorDisclosed, false);
    assert.equal(nativeBridge.latest.runtimeTargetEndpointDisclosed, false);
    assert.equal(nativeBridge.latest.runtimeTargetTokenMaterialDisclosed, false);
    assert.equal(nativeBridge.latest.invocationProfile, 'governed_bounded_write');
    assert.equal(nativeBridge.latest.invocationProfileForbiddenFieldCount, 0);
    assert.equal(nativeBridge.latest.readAllowed, false);
    assert.equal(nativeBridge.latest.writeAllowed, true);
    assert.equal(nativeBridge.latest.readWriteAuthoritySource, 'bridge_tool_binding');
    assert.equal(nativeBridge.latest.readWriteAuthorityBound, true);
    assert.equal(nativeBridge.latest.mixedReadWriteAllowed, false);
    assert.equal(nativeBridge.latest.unboundedWriteAllowed, false);
    assert.equal(nativeBridge.latest.writeRequiresExactApproval, true);
    assert.equal(nativeBridge.latest.readWriteAuthorityForbiddenFieldCount, 0);
    assert.equal(nativeBridge.latest.disclosureLevel, 'summary');
    assert.equal(nativeBridge.latest.disclosureMaxItems, 5);
    assert.equal(nativeBridge.latest.disclosureMaxBytes, 4096);
    assert.equal(nativeBridge.latest.disclosureForbiddenFieldCount, 0);
    assert.equal(nativeBridge.latest.rawOutputAllowed, false);
    assert.equal(nativeBridge.latest.delegationDirection, 'write');
    assert.equal(nativeBridge.latest.writeDelegationAttempted, true);
    assert.equal(nativeBridge.latest.writeDelegationAccepted, true);
    assert.equal(nativeBridge.latest.delegationStatusClass, 'success');
    assert.equal(nativeBridge.latest.delegationReasonCode, null);
    assert.equal(nativeBridge.latest.bridgeAuditReceiptAppended, true);
    assert.equal(nativeBridge.latest.bridgeAuditReceiptRequired, true);
    assert.equal(nativeBridge.latest.auditReceiptLowDisclosure, true);
    assert.equal(nativeBridge.latest.bridgeReceiptLowDisclosure, true);
    assert.equal(nativeBridge.latest.auditReceiptReferencePresent, true);
    assert.equal(nativeBridge.latest.auditReceiptReferenceSafe, true);
    assert.equal(nativeBridge.latest.auditReceiptReferenceName, 'governed-mcp-record_memory-receipt');
    assert.equal(nativeBridge.latest.auditReceiptForbiddenFieldCount, 0);
    assert.equal(nativeBridge.latest.nativeInvocationReceiptBindingMatched, true);
    assert.equal(nativeBridge.latest.nativeInvocationGovernanceMetadataSent, true);
    assert.equal(
      nativeBridge.latest.nativeInvocationGovernanceMetadataPath,
      'params._meta.codexMemoryGovernance'
    );
    assert.equal(nativeBridge.latest.nativeInvocationGovernanceMetadataRawValueDisclosed, false);
    assert.equal(nativeBridge.latest.nativeInvocationToolName, 'record_memory');
    assert.equal(nativeBridge.latest.nativeInvocationStatusClass, 'success');
    assert.equal(nativeBridge.latest.nativeInvocationHttpStatusClass, 'success');
    assert.equal(nativeBridge.latest.nativeInvocationResponseShapeCategory, 'object_top_level_kind_only_no_field_names');
    assert.equal(nativeBridge.latest.memoryWritePerformed, true);
    assert.equal(nativeBridge.latest.writePolicy, 'exact_approval');
    assert.equal(nativeBridge.latest.exactApprovalAction, 'live_bridge_record_memory_proof');
    assert.equal(nativeBridge.latest.exactApprovalActionMatched, true);
    assert.equal(nativeBridge.latest.exactApprovalScopeMatched, true);
    assert.equal(nativeBridge.latest.exactApprovalRuntimeTargetMatched, true);
    assert.equal(nativeBridge.latest.exactApprovalRollbackPlanMatched, true);
    assert.equal(nativeBridge.latest.exactApprovalForbiddenFieldCount, 0);
    assert.equal(nativeBridge.latest.rollbackPosture, 'bounded_rollback_plan');
    assert.equal(nativeBridge.latest.rollbackPostureForbiddenFieldCount, 0);
    assert.equal(nativeBridge.latest.rollbackPlanReferencePresent, true);
    assert.equal(nativeBridge.latest.rollbackPlanReferenceSafe, true);
    assert.equal(nativeBridge.latest.rollbackPlanBound, true);
    assert.equal(nativeBridge.latest.rollbackPostureBound, true);
    assert.equal(nativeBridge.latest.rollbackPlanShapeOnly, true);
    assert.equal(nativeBridge.latest.rollbackRequired, false);
    assert.equal(nativeBridge.latest.rollbackReasonCode, null);
    assert.equal(nativeBridge.latest.rollbackDisposition, 'no_rollback_required');
    assert.equal(nativeBridge.latest.rollbackFollowupRequired, false);
    assert.equal(nativeBridge.latest.rollbackApplyPolicy, 'not_applicable');
    assert.equal(nativeBridge.latest.rollbackApplyAttempted, false);
    assert.equal(nativeBridge.latest.rollbackAutoApplyAllowed, false);
    assert.equal(nativeBridge.latest.rollbackRawPlanDisclosed, false);
    assert.equal(nativeBridge.latest.rollbackRawPlanPersisted, false);
    assert.equal(nativeBridge.latest.localMemoryRole, 'not_used');
    assert.equal(nativeBridge.latest.localMemorySourceRuntime, null);
    assert.equal(nativeBridge.latest.localMemoryPrimaryRuntime, false);
    assert.equal(nativeBridge.latest.localMemoryFallbackUsed, false);
    assert.equal(nativeBridge.latest.localMemoryResultReturned, false);
    assert.equal(nativeBridge.latest.localMemoryResultCanBeMistakenForVcpNative, false);
    assert.equal(nativeBridge.latest.localMemoryRawContentDisclosed, false);
    assert.equal(nativeBridge.latest.rawRequestBodyDisclosed, false);
    assert.equal(nativeBridge.latest.rawResponseBodyDisclosed, false);
    assert.equal(nativeBridge.latest.readinessClaimed, false);
    assert.equal(serialized.includes(rawWriteContent), false);
    assert.equal(serialized.includes(rawNativeValue), false);
    assert.equal(serialized.includes('RAW_NATIVE_MEMORY_ID_SHOULD_NOT_ECHO'), false);
    assert.equal(serialized.includes('cm-health-write-rollback-plan'), false);
  }, { bearerToken: 'test-token' }, {
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'workspace-alpha',
    defaultClientId: 'codex',
    defaultVisibility: 'private',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeWriteDelegationToolCaller: writeDelegationToolCaller
  });
});

test('HTTP MCP bearer health exposes unbound native write rollback reason', async () => {
  const rawWriteContent = 'RAW_HEALTH_UNBOUND_WRITE_CONTENT_SHOULD_NOT_ECHO';
  const rawNativeValue = 'RAW_HEALTH_UNBOUND_WRITE_NATIVE_VALUE_SHOULD_NOT_ECHO';
  const rawNativeMemoryId = 'RAW_HEALTH_UNBOUND_WRITE_NATIVE_ID_SHOULD_NOT_ECHO';
  const rollbackPlanRef = 'cm-health-unbound-write-rollback-plan';
  const writeDelegationToolCaller = async () => {
    throw new Error('callWithReceipt path should be used for governed write health evidence');
  };
  writeDelegationToolCaller.callWithReceipt = async payload => ({
    value: {
      memory_id: rawNativeMemoryId,
      content: rawNativeValue,
      title: payload.arguments?.title
    },
    receipt: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server',
      transportCategory: 'local_http_transport',
      mcpMethod: 'tools/call',
      toolName: 'tombstone_memory',
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
      readinessClaimed: false
    }
  });

  await withHttpServer(async ({ app, address }) => {
    let localWrites = 0;
    app.services.writeService.record = async () => {
      localWrites += 1;
      return { success: true };
    };

    const result = await app.callTool(
      'record_memory',
      {
        target: 'knowledge',
        title: 'Governed native unbound write health evidence',
        content: rawWriteContent,
        evidence: 'unbound native write receipt should require governed rollback evidence',
        validated: true,
        reusable: true,
        sensitivity: 'none'
      },
      governedNativeCodexContext({
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
          rollbackPlanRef
        },
        rollbackPosture: {
          mode: 'bounded_rollback_plan',
          rollback_plan_ref: rollbackPlanRef
        }
      })
    );
    const health = await fetch(address.url.replace('/mcp/codex-memory', '/health'), {
      headers: {
        Authorization: 'Bearer test-token'
      }
    });
    const payload = await health.json();
    const nativeBridge = payload.runtime.governedNativeBridge;
    const serialized = JSON.stringify(payload);

    assert.equal(localWrites, 0);
    assert.equal(result.status, 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATION_REJECTED');
    assert.equal(result.reasonCode, 'native_write_delegation_native_invocation_receipt_unbound');
    assert.equal(result.access.memoryWritePerformed, true);
    assert.equal(result.receipt.rollbackRequired, true);
    assert.equal(result.receipt.rollbackReasonCode, 'write_post_commit_native_invocation_receipt_unbound');
    assert.equal(health.status, 200);
    assert.equal(nativeBridge.observationCount, 1);
    assert.equal(nativeBridge.latest.toolName, 'record_memory');
    assert.equal(nativeBridge.latest.clientId, 'Codex');
    assert.equal(nativeBridge.latest.visibility, 'private');
    assert.equal(nativeBridge.latest.invocationProfile, 'governed_bounded_write');
    assert.equal(nativeBridge.latest.readAllowed, false);
    assert.equal(nativeBridge.latest.writeAllowed, true);
    assert.equal(nativeBridge.latest.delegationDirection, 'write');
    assert.equal(nativeBridge.latest.writeDelegationAttempted, true);
    assert.equal(nativeBridge.latest.writeDelegationAccepted, false);
    assert.equal(nativeBridge.latest.delegationStatusClass, 'native_invocation_receipt_unbound');
    assert.equal(
      nativeBridge.latest.delegationReasonCode,
      'native_write_delegation_native_invocation_receipt_unbound'
    );
    assert.equal(nativeBridge.latest.nativeInvocationAttempted, true);
    assert.equal(nativeBridge.latest.nativeMcpToolInvocationAttempted, true);
    assert.equal(nativeBridge.latest.nativeInvocationReceiptBindingMatched, false);
    assert.equal(nativeBridge.latest.nativeInvocationGovernanceMetadataSent, true);
    assert.equal(
      nativeBridge.latest.nativeInvocationGovernanceMetadataPath,
      'params._meta.codexMemoryGovernance'
    );
    assert.equal(nativeBridge.latest.nativeInvocationGovernanceMetadataRawValueDisclosed, false);
    assert.equal(nativeBridge.latest.nativeInvocationToolName, null);
    assert.equal(nativeBridge.latest.memoryWritePerformed, true);
    assert.equal(nativeBridge.latest.rollbackPosture, 'bounded_rollback_plan');
    assert.equal(nativeBridge.latest.rollbackPlanBound, true);
    assert.equal(nativeBridge.latest.rollbackRequired, true);
    assert.equal(
      nativeBridge.latest.rollbackReasonCode,
      'write_post_commit_native_invocation_receipt_unbound'
    );
    assert.equal(nativeBridge.latest.rollbackDisposition, 'rollback_required_not_applied');
    assert.equal(nativeBridge.latest.rollbackFollowupRequired, true);
    assert.equal(nativeBridge.latest.rollbackApplyPolicy, 'manual_governed_followup_required');
    assert.equal(nativeBridge.latest.rollbackApplyAttempted, false);
    assert.equal(nativeBridge.latest.rawRequestBodyDisclosed, false);
    assert.equal(nativeBridge.latest.rawResponseBodyDisclosed, false);
    assert.equal(nativeBridge.latest.readinessClaimed, false);
    assert.equal(serialized.includes(rawWriteContent), false);
    assert.equal(serialized.includes(rawNativeValue), false);
    assert.equal(serialized.includes(rawNativeMemoryId), false);
    assert.equal(serialized.includes(rollbackPlanRef), false);
  }, { bearerToken: 'test-token' }, {
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'workspace-alpha',
    defaultClientId: 'codex',
    defaultVisibility: 'private',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeWriteDelegationToolCaller: writeDelegationToolCaller
  });
});

test('HTTP MCP bearer-configured health rejects invalid token before full payload', async () => {
  await withHttpServer(async ({ address }) => {
    const health = await fetch(address.url.replace('/mcp/codex-memory', '/health'), {
      headers: {
        Authorization: 'Bearer wrong-token'
      }
    });
    const healthPayload = await health.json();

    assert.equal(health.status, 401);
    assert.equal(healthPayload.error, 'Unauthorized');
    assert.equal(healthPayload.runtime, undefined);
    assert.equal(healthPayload.sessionHardening, undefined);
    assert.equal(healthPayload.policyGates, undefined);
    assert.equal(healthPayload.access, undefined);
  }, { bearerToken: 'test-token' });
});

test('HTTP MCP bearer health exposes low-disclosure governed native bridge config warnings', async () => {
  await withHttpServer(async ({ address }) => {
    const health = await fetch(address.url.replace('/mcp/codex-memory', '/health'), {
      headers: {
        Authorization: 'Bearer expected-token'
      }
    });
    const healthPayload = await health.json();
    const serialized = JSON.stringify(healthPayload);

    assert.equal(health.status, 200);
    assert.deepEqual(healthPayload.policyGates.governedNativeBridgeWarnings, [
      {
        code: 'native_read_delegation_requires_bridge_gate',
        effect: 'read_delegation_fail_closed',
        lowDisclosure: true
      },
      {
        code: 'native_read_delegation_requires_accepted_native_target',
        effect: 'read_delegation_fail_closed',
        lowDisclosure: true
      }
    ]);
    assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
    assert.equal(serialized.includes('SECRET_TOKEN_SHOULD_NOT_ECHO'), false);
  }, { bearerToken: 'expected-token' }, {
    governedMcpVcpNativeBridgeGateMode: 'off',
    governedMcpVcpNativeReadDelegationMode: 'primary',
    governedMcpVcpNativeHttpMcpTarget: {
      endpoint: 'http://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
      bearerToken: 'SECRET_TOKEN_SHOULD_NOT_ECHO'
    }
  });
});

test('HTTP MCP health exposes bounded runtime freshness metadata', async () => {
  await withHttpServer(async ({ address }) => {
    const health = await fetch(address.url.replace('/mcp/codex-memory', '/health'));
    const healthPayload = await health.json();
    const serializedHealth = JSON.stringify(healthPayload);

    assert.equal(health.status, 200);
    assert.deepEqual(Object.keys(healthPayload.runtimeFreshness).sort(), RUNTIME_FRESHNESS_KEYS);
    assert.equal(healthPayload.runtimeFreshness.algorithm, 'sha256');
    assert.equal(healthPayload.runtimeFreshness.sourceFingerprint, 'abc123');
    assert.equal(healthPayload.runtimeFreshness.sourceFileCount, 7);
    assert.equal(healthPayload.runtimeFreshness.startedAt, '2026-06-09T00:00:00.000Z');
    assert.doesNotMatch(serializedHealth, /Bearer\s+/i);
    assert.doesNotMatch(serializedHealth, /Authorization/i);
    assert.doesNotMatch(serializedHealth, /memoryId/i);
    assert.doesNotMatch(serializedHealth, /auditLogPath/i);
  }, {
    runtimeFreshness: {
      algorithm: 'sha256',
      sourceFingerprint: 'abc123',
      sourceFileCount: 7,
      startedAt: '2026-06-09T00:00:00.000Z'
    }
  });
});

test('HTTP MCP health should sanitize write reconcile worker last result summary with allowlist', async () => {
  await withHttpServer(async ({ app, address }) => {
    const originalGetStatus = app.services.memoryWriteReconcileWorker.getStatus;
    app.services.memoryWriteReconcileWorker.getStatus = () => ({
      available: true,
      running: false,
      timerScheduled: false,
      tickInFlight: false,
      runCount: '7',
      intervalMs: '1000',
      limit: '3',
      dryRun: false,
      maxRuns: '9',
      lastResultSummary: {
        success: false,
        decision: 'completed_with_failures',
        workerDecision: 'run_once_completed',
        dryRun: false,
        limit: 3,
        scannedTaskCount: 2,
        replayedCount: 1,
        wouldReplayCount: 0,
        clearedCount: 1,
        failedCount: 1,
        skippedCount: 0,
        hasError: true,
        memoryId: 'codex-process-cm1068-raw-memory-id',
        results: [{ memoryId: 'codex-process-cm1068-nested-memory-id' }],
        error: 'cm1068 raw internal error'
      }
    });

    try {
      const health = await fetch(address.url.replace('/mcp/codex-memory', '/health'), {
        headers: {
          Authorization: 'Bearer test-token'
        }
      });
      const payload = await health.json();
      const worker = payload.runtime.writeReconcileWorker;

      assert.equal(health.status, 200);
      assert.equal(worker.runCount, 7);
      assert.equal(worker.intervalMs, 1000);
      assert.equal(worker.limit, 3);
      assert.equal(worker.maxRuns, 9);
      assert.deepEqual(Object.keys(worker.lastResultSummary).sort(), [
        'clearedCount',
        'decision',
        'dryRun',
        'failedCount',
        'hasError',
        'limit',
        'replayedCount',
        'scannedTaskCount',
        'skippedCount',
        'success',
        'workerDecision',
        'wouldReplayCount'
      ]);
      assert.equal(worker.lastResultSummary.failedCount, 1);
      assert.equal(worker.lastResultSummary.hasError, true);
      assert.equal(JSON.stringify(worker).includes('memoryId'), false);
      assert.equal(JSON.stringify(worker).includes('raw internal error'), false);
    } finally {
      app.services.memoryWriteReconcileWorker.getStatus = originalGetStatus;
    }
  }, { bearerToken: 'test-token' });
});

test('HTTP MCP should reject browser-origin no-token POST writes', async () => {
  await withHttpServer(async ({ address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://example.invalid',
        'Sec-Fetch-Site': 'cross-site'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/list',
        params: {}
      })
    });
    const payload = await response.json();

    assert.equal(response.status, 403);
    assert.equal(payload.error, 'Forbidden');
    assert.equal(payload.status, 'rejected');
    assert.equal(payload.reason, 'blocked');
    const serialized = JSON.stringify(payload);
    assert.doesNotMatch(serialized, /bearer/i);
    assert.doesNotMatch(serialized, /token/i);
    assert.doesNotMatch(serialized, /origin/i);
    assert.doesNotMatch(serialized, /client/i);
  });
});

test('HTTP MCP should reject no-token simple POST content types', async () => {
  await withHttpServer(async ({ address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/list',
        params: {}
      })
    });
    const payload = await response.json();

    assert.equal(response.status, 403);
    assert.equal(payload.error, 'Forbidden');
    assert.equal(payload.status, 'rejected');
    assert.equal(payload.reason, 'blocked');
    const serialized = JSON.stringify(payload);
    assert.doesNotMatch(serialized, /application\/json/i);
    assert.doesNotMatch(serialized, /content-type/i);
    assert.doesNotMatch(serialized, /raw/i);
    assert.doesNotMatch(serialized, /api/i);
  });
});

test('HTTP MCP should fail fast when non-loopback host has no bearer token', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-auth-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data')
  });

  try {
    assert.throws(() => createStreamableHttpServer({
      app,
      host: '0.0.0.0',
      port: 0,
      mcpPath: '/mcp/codex-memory',
      bearerToken: ''
    }), /CODEX_MEMORY_HTTP_TOKEN is required/);
  } finally {
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('HTTP MCP should allow non-loopback host when bearer token is configured', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-auth-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data')
  });

  try {
    const httpServer = createStreamableHttpServer({
      app,
      host: '0.0.0.0',
      port: 0,
      mcpPath: '/mcp/codex-memory',
      bearerToken: 'test-token'
    });
    assert.equal(httpServer.authWarning, null);
  } finally {
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('HTTP MCP should reject no-token mutation tool calls', async () => {
  await withHttpServer(async ({ address }) => {
    const mutationCalls = [
      {
        name: 'record_memory',
        arguments: {
          target: 'process',
          title: 'HTTP no-token mutation',
          content: 'Type: checkpoint\nblocked no-token mutation',
          evidence: 'http no-token mutation contract test',
          validated: true,
          reusable: false,
          sensitivity: 'none'
        }
      },
      {
        name: 'validate_memory',
        arguments: {
          memoryId: 'future-public-mutation-tool',
          decision: 'reject'
        }
      }
    ];

    for (const [index, params] of mutationCalls.entries()) {
      const response = await fetch(address.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 5 + index,
          method: 'tools/call',
          params
        })
      });
      const payload = await response.json();

      assert.equal(response.status, 403);
      assert.equal(payload.jsonrpc, '2.0');
      assert.equal(payload.id, 5 + index);
      assert.equal(payload.error.code, -32001);
      assert.equal(payload.error.message, 'Forbidden');
      assert.equal(payload.error.data.code, PUBLIC_REQUEST_BLOCKED);
      assert.equal(payload.error.data.status, 'rejected');
      assert.equal(payload.error.data.reason, 'blocked');
    }

    const responseWithoutId = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: mutationCalls[0]
      })
    });
    const payloadWithoutId = await responseWithoutId.json();

    assert.equal(responseWithoutId.status, 403);
    assert.equal(payloadWithoutId.jsonrpc, '2.0');
    assert.equal(payloadWithoutId.id, null);
    assert.equal(payloadWithoutId.error.code, -32001);
    assert.equal(payloadWithoutId.error.message, 'Forbidden');
    assert.equal(payloadWithoutId.error.data.code, PUBLIC_REQUEST_BLOCKED);
    assert.equal(payloadWithoutId.error.data.status, 'rejected');
    assert.equal(payloadWithoutId.error.data.reason, 'blocked');
  });
});

test('HTTP MCP bearer validate_memory stays on local validation fixture outside native bridge', async () => {
  const rawMemoryId = 'RAW_HTTP_VALIDATE_MEMORY_ID_SHOULD_NOT_ECHO';
  let nativeReads = 0;
  let nativeWrites = 0;
  const observations = [];

  await withHttpServer(async ({ address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 19,
        method: 'tools/call',
        params: {
          name: 'validate_memory',
          arguments: {
            memory_id: rawMemoryId,
            reason: 'validate memory dry-run must remain local validation fixture',
            evidence: 'HTTP MCP validate_memory should not enter VCPToolBox native bridge',
            actor_client_id: 'codex',
            request_source: 'codex-memory-mcp',
            dry_run: true
          }
        }
      })
    });
    const payload = await response.json();
    const result = payload.result.structuredContent;
    const serializedPayload = JSON.stringify(payload);

    assert.equal(response.status, 200);
    assert.equal(payload.result.isError, true);
    assert.equal(result.tool, 'validate_memory');
    assert.equal(result.decision, 'rejected');
    assert.equal(result.reasonCode, 'public_dry_run_low_disclosure');
    assert.equal(result.dryRun, true);
    assert.equal(result.mutated, false);
    assert.equal(result.access.mode, 'controlled_mutation_public_bounded');
    assert.equal(result.policy.durableMutationPerformed, false);
    assert.equal(result.confirmGate.confirmedMutationAllowed, false);
    assert.equal(nativeReads, 0);
    assert.equal(nativeWrites, 0);
    assert.deepEqual(observations, []);
    assert.equal(serializedPayload.includes(rawMemoryId), false);
  }, { bearerToken: 'test-token' }, {
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'workspace-alpha',
    defaultClientId: 'codex',
    defaultVisibility: 'private',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary',
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeBridgeGateObserver: observation => observations.push(observation),
    governedMcpVcpNativeReadDelegationToolCaller: async () => {
      nativeReads += 1;
      throw new Error('validate_memory must not call native read delegation');
    },
    governedMcpVcpNativeWriteDelegationToolCaller: async () => {
      nativeWrites += 1;
      throw new Error('validate_memory must not call native write delegation');
    }
  });
});

test('HTTP MCP bearer tools/call accepts governed metadata for native write delegation', async () => {
  let nativeCall = null;
  await withHttpServer(async ({ app, address }) => {
    let localWrites = 0;
    app.services.writeService.record = async () => {
      localWrites += 1;
      return { success: true };
    };

    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 70,
        method: 'tools/call',
        params: {
          name: 'record_memory',
          arguments: {
            target: 'knowledge',
            title: 'HTTP governed native write',
            content: 'RAW_HTTP_GOVERNED_WRITE_CONTENT_SHOULD_NOT_ECHO',
            evidence: 'HTTP MCP metadata carried exact approval',
            validated: true,
            reusable: true,
            sensitivity: 'none',
            project_id: 'codex-memory',
            workspace_id: 'workspace-alpha',
            client_id: 'codex',
            visibility: 'private'
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
                rollbackPlanRef: 'cm-http-governed-write-rollback-plan'
              },
              rollbackPosture: {
                mode: 'bounded_rollback_plan',
                rollback_plan_ref: 'cm-http-governed-write-rollback-plan'
              },
              auditReceipt: {
                receipt_id: 'cm-http-governed-write-receipt'
              }
            }
          }
        }
      })
    });
    const payload = await response.json();
    const result = payload.result.structuredContent;
    const serializedPayload = JSON.stringify(payload);

    assert.equal(response.status, 200);
    assert.equal(localWrites, 0);
    assert.ok(nativeCall, JSON.stringify(result));
    assert.equal(nativeCall.toolName, 'record_memory');
    assert.equal(nativeCall.arguments.content, 'RAW_HTTP_GOVERNED_WRITE_CONTENT_SHOULD_NOT_ECHO');
    assert.equal(nativeCall.arguments.project_id, undefined);
    assert.equal(nativeCall.arguments.workspace_id, undefined);
    assert.equal(nativeCall.arguments.client_id, undefined);
    assert.equal(nativeCall.arguments.visibility, undefined);
    assert.deepEqual(nativeCall.arguments.scope, {
      project_id: 'codex-memory',
      workspace_id: 'workspace-alpha',
      client_id: 'Codex',
      visibility: 'private'
    });
    assert.equal(nativeCall.arguments.governed_bridge.primary_runtime, 'VCPToolBox native memory');
    assert.deepEqual(nativeCall.arguments.governed_bridge.runtime_target, {
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
    assert.equal(nativeCall.arguments.governed_bridge.client_id, 'Codex');
    assert.equal(nativeCall.arguments.governed_bridge.access_path, 'governed MCP tools');
    assert.equal(nativeCall.arguments.governed_bridge.visibility, 'private');
    assert.deepEqual(nativeCall.arguments.governed_bridge.scope, nativeCall.arguments.scope);
    assert.equal(nativeCall.arguments.governed_bridge.scope_present, true);
    assert.equal(nativeCall.arguments.governed_bridge.scope_identifier_present, true);
    assert.equal(nativeCall.arguments.governed_bridge.scope_identifier_safe, true);
    assert.deepEqual(nativeCall.arguments.governed_bridge.scope_field_names, [
      'client_id',
      'project_id',
      'visibility',
      'workspace_id'
    ]);
    assert.deepEqual(nativeCall.arguments.governed_bridge.scope_identifier_field_names, [
      'project_id',
      'workspace_id'
    ]);
    assert.equal(
      nativeCall.arguments.governed_bridge.scope_fingerprint,
      '5f3544ce179efd0c3fd67066999029fa567975577f7f446f78fe9e2e04f34bc1'
    );
    assert.equal(nativeCall.arguments.governed_bridge.raw_scope_persisted, false);
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
    assert.equal(nativeCall.arguments.governed_bridge.invocation_profile, 'governed_bounded_write');
    assert.equal(nativeCall.arguments.governed_bridge.invocation_profile_source, 'bridge_tool_binding');
    assert.equal(nativeCall.arguments.governed_bridge.invocation_profile_bound, true);
    assert.equal(nativeCall.arguments.governed_bridge.invocation_profile_tool_arguments_may_override, false);
    assert.equal(nativeCall.arguments.governed_bridge.invocation_profile_governance_metadata_may_override, false);
    assert.equal(nativeCall.arguments.governed_bridge.invocation_transport, 'mcp');
    assert.equal(nativeCall.arguments.governed_bridge.invocation_tool_name, 'record_memory');
    assert.equal(nativeCall.arguments.governed_bridge.invocation_profile_tool_match, true);
    assert.equal(nativeCall.arguments.governed_bridge.invocation_profile_forbidden_field_count, 0);
    assert.equal(nativeCall.arguments.governed_bridge.read_allowed, false);
    assert.equal(nativeCall.arguments.governed_bridge.write_allowed, true);
    assert.equal(nativeCall.arguments.governed_bridge.write_policy, 'exact_approval');
    assert.equal(nativeCall.arguments.governed_bridge.read_write_authority_source, 'bridge_tool_binding');
    assert.equal(nativeCall.arguments.governed_bridge.read_write_authority_bound, true);
    assert.equal(nativeCall.arguments.governed_bridge.mixed_read_write_allowed, false);
    assert.equal(nativeCall.arguments.governed_bridge.unbounded_write_allowed, false);
    assert.equal(nativeCall.arguments.governed_bridge.write_requires_exact_approval, true);
    assert.equal(nativeCall.arguments.governed_bridge.read_write_authority_forbidden_field_count, 0);
    assert.equal(nativeCall.arguments.governed_bridge.exact_approval_action, 'live_bridge_record_memory_proof');
    assert.equal(nativeCall.arguments.governed_bridge.exact_approval_scope_matched, true);
    assert.equal(nativeCall.arguments.governed_bridge.exact_approval_runtime_target_matched, true);
    assert.equal(nativeCall.arguments.governed_bridge.exact_approval_rollback_plan_matched, true);
    assert.equal(nativeCall.arguments.governed_bridge.exact_approval_forbidden_field_count, 0);
    assert.equal(nativeCall.arguments.governed_bridge.raw_output_allowed, false);
    assert.equal(nativeCall.arguments.governed_bridge.disclosure_level, 'summary');
    assert.equal(nativeCall.arguments.governed_bridge.disclosure_max_items, 5);
    assert.equal(nativeCall.arguments.governed_bridge.disclosure_max_bytes, 4096);
    assert.equal(nativeCall.arguments.governed_bridge.disclosure_forbidden_field_count, 0);
    assert.equal(nativeCall.arguments.governed_bridge.output_disclosure_budget_bound, true);
    assert.equal(nativeCall.arguments.governed_bridge.over_budget_fallback_to_raw_output, false);
    assert.equal(nativeCall.arguments.governed_bridge.raw_response_body_disclosed, false);
    assert.equal(nativeCall.arguments.governed_bridge.audit_receipt_required, true);
    assert.equal(nativeCall.arguments.governed_bridge.audit_receipt_low_disclosure, true);
    assert.equal(nativeCall.arguments.governed_bridge.audit_receipt_reference_present, true);
    assert.equal(
      nativeCall.arguments.governed_bridge.audit_receipt_event_type,
      'governed_mcp_vcp_native_bridge_receipt'
    );
    assert.equal(nativeCall.arguments.governed_bridge.audit_receipt_append_required, true);
    assert.equal(nativeCall.arguments.governed_bridge.audit_receipt_low_disclosure_bound, true);
    assert.equal(nativeCall.arguments.governed_bridge.audit_raw_request_body_persisted, false);
    assert.equal(nativeCall.arguments.governed_bridge.audit_raw_response_body_persisted, false);
    assert.equal(
      nativeCall.arguments.governed_bridge.audit_receipt_reference_name,
      'cm-http-governed-write-receipt'
    );
    assert.equal(nativeCall.arguments.governed_bridge.audit_receipt_forbidden_field_count, 0);
    assert.equal(nativeCall.arguments.governed_bridge.rollback_posture, 'bounded_rollback_plan');
    assert.equal(nativeCall.arguments.governed_bridge.rollback_plan_reference_present, true);
    assert.equal(nativeCall.arguments.governed_bridge.rollback_plan_reference_safe, true);
    assert.equal(
      nativeCall.arguments.governed_bridge.rollback_plan_reference_name,
      'cm-http-governed-write-rollback-plan'
    );
    assert.equal(nativeCall.arguments.governed_bridge.rollback_posture_forbidden_field_count, 0);
    assert.equal(nativeCall.arguments.governed_bridge.rollback_posture_bound, true);
    assert.equal(nativeCall.arguments.governed_bridge.rollback_plan_shape_only, true);
    assert.equal(nativeCall.arguments.governed_bridge.rollback_auto_apply_allowed, false);
    assert.equal(nativeCall.arguments.governed_bridge.rollback_apply_requires_governed_followup, true);
    assert.equal(nativeCall.arguments.governed_bridge.rollback_raw_plan_disclosed, false);
    assert.equal(nativeCall.arguments.governed_bridge.rollback_raw_plan_persisted, false);
    assert.equal(nativeCall.arguments.governed_bridge.low_disclosure, true);
    assert.equal(result.status, 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATED');
    assert.equal(result.access.primaryRuntime, 'VCPToolBox native memory');
    assert.equal(result.access.localMemoryFallbackUsed, false);
    assert.equal(serializedPayload.includes('RAW_HTTP_GOVERNED_WRITE_CONTENT_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedPayload.includes('RAW_NATIVE_HTTP_WRITE_VALUE_SHOULD_NOT_ECHO'), false);
  }, { bearerToken: 'test-token' }, {
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'workspace-alpha',
    defaultClientId: 'codex',
    defaultVisibility: 'private',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeWriteDelegationToolCaller: async call => {
      nativeCall = call;
      return {
        memory_id: 'RAW_NATIVE_HTTP_WRITE_ID_SHOULD_NOT_ECHO',
        content: 'RAW_NATIVE_HTTP_WRITE_VALUE_SHOULD_NOT_ECHO'
      };
    }
  });
});

test('HTTP MCP bearer tools/call rejects write rollback plan mismatch before native write', async () => {
  const rawWriteContent = 'RAW_HTTP_ROLLBACK_MISMATCH_WRITE_CONTENT_SHOULD_NOT_ECHO';
  const approvedRollbackPlanRef = 'cm-http-approved-write-rollback-plan';
  const suppliedRollbackPlanRef = 'cm-http-supplied-write-rollback-plan';
  let nativeWrites = 0;

  await withHttpServer(async ({ app, address }) => {
    let localWrites = 0;
    app.services.writeService.record = async () => {
      localWrites += 1;
      return { success: true };
    };

    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 71,
        method: 'tools/call',
        params: {
          name: 'record_memory',
          arguments: {
            target: 'knowledge',
            title: 'HTTP rollback mismatch write',
            content: rawWriteContent,
            evidence: 'rollback posture must match exact approval before native write',
            validated: true,
            reusable: true,
            sensitivity: 'none',
            project_id: 'codex-memory',
            workspace_id: 'workspace-alpha',
            client_id: 'codex',
            visibility: 'private'
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
                rollbackPlanRef: approvedRollbackPlanRef
              },
              rollbackPosture: {
                mode: 'bounded_rollback_plan',
                rollback_plan_ref: suppliedRollbackPlanRef
              },
              auditReceipt: {
                receipt_id: 'cm-http-rollback-mismatch-write-receipt'
              },
              outputDisclosureBudget: {
                level: 'summary',
                low_disclosure: true,
                full_output: false,
                max_items: 5,
                max_bytes: 4096
              }
            }
          }
        }
      })
    });
    const payload = await response.json();
    const result = payload.result.structuredContent;
    const serializedPayload = JSON.stringify(payload);

    assert.equal(response.status, 200);
    assert.equal(payload.result.isError, true);
    assert.equal(result.decision, 'rejected');
    assert.equal(result.reasonCode, 'governed_mcp_vcp_native_bridge_gate_rejected');
    assert.equal(result.access.runtimeCalled, false);
    assert.equal(result.access.memoryWritePerformed, false);
    assert.equal(result.access.rawOutputReturned, false);
    assert.ok(result.gate.blockers.includes(
      'write_authority_exact_approval_rollback_plan_must_match_bridge_rollback_posture'
    ));
    assert.equal(nativeWrites, 0);
    assert.equal(localWrites, 0);
    assert.equal(serializedPayload.includes(rawWriteContent), false);
    assert.equal(serializedPayload.includes(approvedRollbackPlanRef), false);
    assert.equal(serializedPayload.includes(suppliedRollbackPlanRef), false);
  }, { bearerToken: 'test-token' }, {
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'workspace-alpha',
    defaultClientId: 'codex',
    defaultVisibility: 'private',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeWriteDelegationToolCaller: async () => {
      nativeWrites += 1;
      throw new Error('native write should not be called for rollback mismatch');
    }
  });
});

test('HTTP MCP bearer tools/call marks rollback required when write audit receipt append fails after native write', async () => {
  const rawWriteContent = 'RAW_HTTP_AUDIT_APPEND_FAILURE_WRITE_CONTENT_SHOULD_NOT_ECHO';
  const rawNativeMemoryId = 'RAW_HTTP_AUDIT_APPEND_FAILURE_NATIVE_ID_SHOULD_NOT_ECHO';
  const rawNativeContent = 'RAW_HTTP_AUDIT_APPEND_FAILURE_NATIVE_CONTENT_SHOULD_NOT_ECHO';
  const rawAuditAppendFailure = 'PRIVATE_HTTP_WRITE_AUDIT_APPEND_FAILURE_SHOULD_NOT_ECHO';
  const rollbackPlanRef = 'cm-http-audit-append-failure-rollback-plan';
  let nativeWrites = 0;

  await withHttpServer(async ({ app, address }) => {
    let localWrites = 0;
    app.services.writeService.record = async () => {
      localWrites += 1;
      return { success: true };
    };
    app.stores.auditLogStore.appendWriteAudit = async () => {
      throw new Error(rawAuditAppendFailure);
    };

    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 72,
        method: 'tools/call',
        params: {
          name: 'record_memory',
          arguments: {
            target: 'knowledge',
            title: 'HTTP write audit append failure',
            content: rawWriteContent,
            evidence: 'native write must require governed rollback when audit receipt is missing',
            validated: true,
            reusable: true,
            sensitivity: 'none',
            project_id: 'codex-memory',
            workspace_id: 'workspace-alpha',
            client_id: 'codex',
            visibility: 'private'
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
                rollbackPlanRef
              },
              rollbackPosture: {
                mode: 'bounded_rollback_plan',
                rollback_plan_ref: rollbackPlanRef
              },
              auditReceipt: {
                receipt_id: 'cm-http-audit-append-failure-write-receipt'
              },
              outputDisclosureBudget: {
                level: 'summary',
                low_disclosure: true,
                raw_output: false,
                max_items: 5,
                max_bytes: 4096
              }
            }
          }
        }
      })
    });
    const payload = await response.json();
    const result = payload.result.structuredContent;
    const serializedPayload = JSON.stringify(payload);

    assert.equal(response.status, 200);
    assert.equal(payload.result.isError, true);
    assert.equal(nativeWrites, 1);
    assert.equal(localWrites, 0);
    assert.equal(result.status, 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATION_REJECTED');
    assert.equal(result.reasonCode, 'required_bridge_audit_receipt_not_appended');
    assert.equal(result.access.runtimeCalled, true);
    assert.equal(result.access.memoryWritePerformed, true);
    assert.equal(result.access.localMemoryFallbackEligible, false);
    assert.equal(result.access.localMemoryFallbackUsed, false);
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
    assert.equal(serializedPayload.includes(rawWriteContent), false);
    assert.equal(serializedPayload.includes(rawNativeMemoryId), false);
    assert.equal(serializedPayload.includes(rawNativeContent), false);
    assert.equal(serializedPayload.includes(rawAuditAppendFailure), false);
    assert.equal(serializedPayload.includes(rollbackPlanRef), false);
  }, { bearerToken: 'test-token' }, {
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'workspace-alpha',
    defaultClientId: 'codex',
    defaultVisibility: 'private',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeWriteDelegationToolCaller: async payload => {
      nativeWrites += 1;
      assert.equal(payload.toolName, 'record_memory');
      assert.equal(payload.arguments.governed_bridge.audit_receipt_required, true);
      return {
        memory_id: rawNativeMemoryId,
        content: rawNativeContent
      };
    }
  });
});

test('HTTP MCP bearer tools/call rejects governed metadata runtime target override before native read', async () => {
  const rawQuery = 'RAW_HTTP_GOVERNED_METADATA_RUNTIME_TARGET_QUERY_SHOULD_NOT_ECHO';
  const rawEndpoint = 'https://PRIVATE_HTTP_GOVERNED_METADATA_RUNTIME_TARGET_SHOULD_NOT_ECHO';
  const rawSecret = 'SECRET_HTTP_GOVERNED_METADATA_TOP_LEVEL_SHOULD_NOT_ECHO';
  let nativeReads = 0;

  await withHttpServer(async ({ address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 71,
        method: 'tools/call',
        params: {
          name: 'search_memory',
          arguments: {
            query: rawQuery,
            target: 'both',
            limit: 3,
            include_content: false
          },
          _meta: {
            codexMemoryGovernance: {
              runtimeTarget: {
                endpoint: rawEndpoint,
                token: rawSecret
              },
              secretTopLevelKeySHOULD_NOT_ECHO: rawSecret,
              auditReceipt: {
                receipt_id: 'cm-http-invalid-runtime-target-override'
              },
              outputDisclosureBudget: {
                level: 'summary',
                low_disclosure: true,
                raw_output: false,
                max_items: 3,
                max_bytes: 4096
              },
              rollbackPosture: {
                mode: 'read_only_no_write'
              }
            }
          }
        }
      })
    });
    const payload = await response.json();
    const serializedPayload = JSON.stringify(payload);

    assert.equal(response.status, 200);
    assert.equal(payload.error.code, -32602);
    assert.equal(payload.error.data.code, 'invalid_governed_mcp_metadata');
    assert.deepEqual(payload.error.data.invalidFields, [
      'codexMemoryGovernance.runtimeTarget',
      'codexMemoryGovernance.unsupportedField'
    ]);
    assert.equal(nativeReads, 0);
    assert.equal(serializedPayload.includes(rawQuery), false);
    assert.equal(serializedPayload.includes(rawEndpoint), false);
    assert.equal(serializedPayload.includes(rawSecret), false);
    assert.equal(serializedPayload.includes('secretTopLevelKeySHOULD_NOT_ECHO'), false);
  }, { bearerToken: 'test-token' }, {
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'workspace-alpha',
    defaultClientId: 'codex',
    defaultVisibility: 'private',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeReadDelegationToolCaller: async () => {
      nativeReads += 1;
      throw new Error('native read should not be called for invalid governed metadata');
    }
  });
});

test('HTTP MCP bearer tools/call rejects invocation and authority override before native read', async () => {
  const rawQuery = 'RAW_HTTP_INVOCATION_AUTHORITY_OVERRIDE_QUERY_SHOULD_NOT_ECHO';
  const spoofedInvocationProfile = 'governed_bounded_write';
  const spoofedAuthority = 'unbounded_write';
  let nativeReads = 0;

  await withHttpServer(async ({ address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 72,
        method: 'tools/call',
        params: {
          name: 'search_memory',
          arguments: {
            query: rawQuery,
            target: 'both',
            limit: 3,
            include_content: false
          },
          _meta: {
            codexMemoryGovernance: {
              invocationProfile: {
                profile: spoofedInvocationProfile,
                transport: 'mcp',
                tool_name: 'record_memory'
              },
              readWriteAuthority: {
                read: true,
                write: true,
                authority: spoofedAuthority
              },
              auditReceipt: {
                receipt_id: 'cm-http-invalid-invocation-authority-override'
              },
              outputDisclosureBudget: {
                level: 'summary',
                low_disclosure: true,
                raw_output: false,
                max_items: 3,
                max_bytes: 4096
              },
              rollbackPosture: {
                mode: 'read_only_no_write'
              }
            }
          }
        }
      })
    });
    const payload = await response.json();
    const serializedPayload = JSON.stringify(payload);

    assert.equal(response.status, 200);
    assert.equal(payload.error.code, -32602);
    assert.equal(payload.error.data.code, 'invalid_governed_mcp_metadata');
    assert.deepEqual(payload.error.data.invalidFields, [
      'codexMemoryGovernance.invocationProfile',
      'codexMemoryGovernance.readWriteAuthority'
    ]);
    assert.equal(nativeReads, 0);
    assert.equal(serializedPayload.includes(rawQuery), false);
    assert.equal(serializedPayload.includes(spoofedInvocationProfile), false);
    assert.equal(serializedPayload.includes(spoofedAuthority), false);
  }, { bearerToken: 'test-token' }, {
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'workspace-alpha',
    defaultClientId: 'codex',
    defaultVisibility: 'private',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeReadDelegationToolCaller: async () => {
      nativeReads += 1;
      throw new Error('native read should not be called for spoofed invocation profile or authority');
    }
  });
});

test('HTTP MCP bearer tools/call rejects client scope visibility and access path override before native read', async () => {
  const rawQuery = 'RAW_HTTP_CLIENT_SCOPE_OVERRIDE_QUERY_SHOULD_NOT_ECHO';
  const spoofedClientId = 'claude';
  const spoofedProjectId = 'project-beta';
  const spoofedWorkspaceId = 'workspace-beta';
  const spoofedVisibility = 'workspace';
  const spoofedAccessPath = 'direct-native-runtime';
  let nativeReads = 0;

  await withHttpServer(async ({ address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 73,
        method: 'tools/call',
        params: {
          name: 'search_memory',
          arguments: {
            query: rawQuery,
            target: 'both',
            limit: 3,
            include_content: false
          },
          _meta: {
            codexMemoryGovernance: {
              clientId: spoofedClientId,
              scope: {
                project_id: spoofedProjectId,
                workspace_id: spoofedWorkspaceId,
                client_id: spoofedClientId,
                visibility: spoofedVisibility
              },
              visibility: spoofedVisibility,
              accessPath: spoofedAccessPath,
              auditReceipt: {
                receipt_id: 'cm-http-invalid-client-scope-override'
              },
              outputDisclosureBudget: {
                level: 'summary',
                low_disclosure: true,
                raw_output: false,
                max_items: 3,
                max_bytes: 4096
              },
              rollbackPosture: {
                mode: 'read_only_no_write'
              }
            }
          }
        }
      })
    });
    const payload = await response.json();
    const serializedPayload = JSON.stringify(payload);

    assert.equal(response.status, 200);
    assert.equal(payload.error.code, -32602);
    assert.equal(payload.error.data.code, 'invalid_governed_mcp_metadata');
    assert.deepEqual(payload.error.data.invalidFields, [
      'codexMemoryGovernance.clientId',
      'codexMemoryGovernance.scope',
      'codexMemoryGovernance.visibility',
      'codexMemoryGovernance.accessPath'
    ]);
    assert.equal(nativeReads, 0);
    assert.equal(serializedPayload.includes(rawQuery), false);
    assert.equal(serializedPayload.includes(spoofedClientId), false);
    assert.equal(serializedPayload.includes(spoofedProjectId), false);
    assert.equal(serializedPayload.includes(spoofedWorkspaceId), false);
    assert.equal(serializedPayload.includes(`"${spoofedVisibility}"`), false);
    assert.equal(serializedPayload.includes(spoofedAccessPath), false);
  }, { bearerToken: 'test-token' }, {
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'workspace-alpha',
    defaultClientId: 'codex',
    defaultVisibility: 'private',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeReadDelegationToolCaller: async () => {
      nativeReads += 1;
      throw new Error('native read should not be called for spoofed client scope or access path');
    }
  });
});

test('HTTP MCP bearer tools/call rejects unsafe audit receipt metadata before native read', async () => {
  const rawQuery = 'RAW_HTTP_UNSAFE_AUDIT_RECEIPT_QUERY_SHOULD_NOT_ECHO';
  const unsafeReceiptId = 'secret-receipt-token-SHOULD_NOT_ECHO';
  const rawEndpoint = 'https://PRIVATE_HTTP_AUDIT_RECEIPT_ENDPOINT_SHOULD_NOT_ECHO';
  const rawSecret = 'SECRET_HTTP_AUDIT_RECEIPT_TOKEN_SHOULD_NOT_ECHO';
  let nativeReads = 0;

  await withHttpServer(async ({ address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 74,
        method: 'tools/call',
        params: {
          name: 'search_memory',
          arguments: {
            query: rawQuery,
            target: 'both',
            limit: 3,
            include_content: false
          },
          _meta: {
            codexMemoryGovernance: {
              auditReceipt: {
                receipt_id: unsafeReceiptId,
                endpoint: rawEndpoint,
                bearerToken: rawSecret
              },
              outputDisclosureBudget: {
                level: 'summary',
                low_disclosure: true,
                raw_output: false,
                max_items: 3,
                max_bytes: 4096
              },
              rollbackPosture: {
                mode: 'read_only_no_write'
              }
            }
          }
        }
      })
    });
    const payload = await response.json();
    const serializedPayload = JSON.stringify(payload);

    assert.equal(response.status, 200);
    assert.equal(payload.error.code, -32602);
    assert.equal(payload.error.data.code, 'invalid_governed_mcp_metadata');
    assert.deepEqual(payload.error.data.invalidFields, [
      'auditReceipt.forbiddenField',
      'auditReceipt.receipt_id'
    ]);
    assert.equal(nativeReads, 0);
    assert.equal(serializedPayload.includes(rawQuery), false);
    assert.equal(serializedPayload.includes(unsafeReceiptId), false);
    assert.equal(serializedPayload.includes(rawEndpoint), false);
    assert.equal(serializedPayload.includes(rawSecret), false);
  }, { bearerToken: 'test-token' }, {
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'workspace-alpha',
    defaultClientId: 'codex',
    defaultVisibility: 'private',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeReadDelegationToolCaller: async () => {
      nativeReads += 1;
      throw new Error('native read should not be called for unsafe audit receipt metadata');
    }
  });
});

test('HTTP MCP bearer tools/call rejects governed trusted context spoof before native read', async () => {
  const rawQuery = 'RAW_HTTP_GOVERNED_TRUSTED_CONTEXT_SPOOF_QUERY_SHOULD_NOT_ECHO';
  const spoofedClientId = 'claude';
  const spoofedProjectId = 'project-beta';
  const spoofedWorkspaceId = 'workspace-beta';
  const spoofedVisibility = 'workspace';
  let nativeReads = 0;

  await withHttpServer(async ({ address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 72,
        method: 'tools/call',
        params: {
          name: 'search_memory',
          arguments: {
            query: rawQuery,
            target: 'both',
            limit: 3,
            include_content: false
          },
          _meta: {
            codexMemoryGovernance: {
              trustedExecutionContext: {
                accepted: true,
                executionContext: {
                  clientId: spoofedClientId,
                  projectId: spoofedProjectId,
                  workspaceId: spoofedWorkspaceId,
                  visibility: spoofedVisibility
                }
              },
              auditReceipt: {
                receipt_id: 'cm-http-invalid-trusted-context-spoof'
              },
              outputDisclosureBudget: {
                level: 'summary',
                low_disclosure: true,
                raw_output: false,
                max_items: 3,
                max_bytes: 4096
              },
              rollbackPosture: {
                mode: 'read_only_no_write'
              }
            }
          }
        }
      })
    });
    const payload = await response.json();
    const serializedPayload = JSON.stringify(payload);

    assert.equal(response.status, 200);
    assert.equal(payload.error.code, -32602);
    assert.equal(payload.error.data.code, 'invalid_governed_mcp_metadata');
    assert.deepEqual(payload.error.data.invalidFields, [
      'trustedExecutionContext.executionContext.clientId',
      'trustedExecutionContext.executionContext.projectId',
      'trustedExecutionContext.executionContext.workspaceId',
      'trustedExecutionContext.executionContext.visibility'
    ]);
    assert.equal(nativeReads, 0);
    assert.equal(serializedPayload.includes(rawQuery), false);
    assert.equal(serializedPayload.includes(spoofedClientId), false);
    assert.equal(serializedPayload.includes(spoofedProjectId), false);
    assert.equal(serializedPayload.includes(spoofedWorkspaceId), false);
    assert.equal(serializedPayload.includes(`"${spoofedVisibility}"`), false);
  }, { bearerToken: 'test-token' }, {
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'workspace-alpha',
    defaultClientId: 'codex',
    defaultVisibility: 'private',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeReadDelegationToolCaller: async () => {
      nativeReads += 1;
      throw new Error('native read should not be called for spoofed trusted context');
    }
  });
});

test('HTTP MCP bearer tools/call rejects raw output disclosure budget before native read', async () => {
  const rawQuery = 'RAW_HTTP_GOVERNED_RAW_OUTPUT_BUDGET_QUERY_SHOULD_NOT_ECHO';
  let nativeReads = 0;

  await withHttpServer(async ({ app, address }) => {
    let localSearchCalls = 0;
    app.services.passiveRecallService.search = async () => {
      localSearchCalls += 1;
      return {
        results: [{
          content: 'RAW_LOCAL_SEARCH_CONTENT_SHOULD_NOT_ECHO'
        }]
      };
    };

    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 73,
        method: 'tools/call',
        params: {
          name: 'search_memory',
          arguments: {
            query: rawQuery,
            target: 'both',
            limit: 3,
            include_content: false
          },
          _meta: {
            codexMemoryGovernance: {
              auditReceipt: {
                receipt_id: 'cm-http-invalid-raw-output-budget'
              },
              outputDisclosureBudget: {
                level: 'structured',
                low_disclosure: false,
                raw_output: true,
                max_items: 3,
                max_bytes: 4096
              },
              rollbackPosture: {
                mode: 'read_only_no_write'
              }
            }
          }
        }
      })
    });
    const payload = await response.json();
    const result = payload.result.structuredContent;
    const serializedPayload = JSON.stringify(payload);

    assert.equal(response.status, 200);
    assert.equal(payload.result.isError, true);
    assert.equal(result.decision, 'rejected');
    assert.equal(result.reasonCode, 'governed_mcp_vcp_native_bridge_gate_rejected');
    assert.equal(result.access.runtimeCalled, false);
    assert.equal(result.access.memoryReadPerformed, false);
    assert.equal(result.access.rawOutputReturned, false);
    assert.ok(result.gate.blockers.includes(
      'output_disclosure_budget_must_be_low_disclosure_and_bounded'
    ));
    assert.equal(nativeReads, 0);
    assert.equal(localSearchCalls, 0);
    assert.equal(serializedPayload.includes(rawQuery), false);
    assert.equal(serializedPayload.includes('RAW_LOCAL_SEARCH_CONTENT_SHOULD_NOT_ECHO'), false);
  }, { bearerToken: 'test-token' }, {
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'workspace-alpha',
    defaultClientId: 'codex',
    defaultVisibility: 'private',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeReadDelegationToolCaller: async () => {
      nativeReads += 1;
      throw new Error('native read should not be called for raw output budget');
    }
  });
});

test('HTTP MCP bearer tools/call rejects read rollback plan reference before native read', async () => {
  const rawQuery = 'RAW_HTTP_READ_ROLLBACK_PLAN_QUERY_SHOULD_NOT_ECHO';
  const rollbackPlanRef = 'cm-http-read-rollback-plan-should-not-bind';
  let nativeReads = 0;

  await withHttpServer(async ({ app, address }) => {
    let localSearchCalls = 0;
    app.services.passiveRecallService.search = async () => {
      localSearchCalls += 1;
      return {
        results: [{
          content: 'RAW_LOCAL_READ_FALLBACK_CONTENT_SHOULD_NOT_ECHO'
        }]
      };
    };

    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 731,
        method: 'tools/call',
        params: {
          name: 'search_memory',
          arguments: {
            query: rawQuery,
            target: 'both',
            limit: 3,
            include_content: false
          },
          _meta: {
            codexMemoryGovernance: {
              auditReceipt: {
                receipt_id: 'cm-http-read-rollback-plan-rejection-receipt'
              },
              outputDisclosureBudget: {
                level: 'summary',
                low_disclosure: true,
                raw_output: false,
                max_items: 3,
                max_bytes: 4096
              },
              rollbackPosture: {
                mode: 'read_only_no_write',
                rollback_plan_ref: rollbackPlanRef
              }
            }
          }
        }
      })
    });
    const payload = await response.json();
    const result = payload.result.structuredContent;
    const serializedPayload = JSON.stringify(payload);

    assert.equal(response.status, 200);
    assert.equal(payload.result.isError, true);
    assert.equal(result.decision, 'rejected');
    assert.equal(result.reasonCode, 'governed_mcp_vcp_native_bridge_gate_rejected');
    assert.equal(result.access.runtimeCalled, false);
    assert.equal(result.access.memoryReadPerformed, false);
    assert.equal(result.access.localMemoryFallbackUsed, false);
    assert.equal(result.access.rawOutputReturned, false);
    assert.ok(result.gate.blockers.includes(
      'read_only_rollback_posture_must_not_include_plan_reference'
    ));
    assert.equal(nativeReads, 0);
    assert.equal(localSearchCalls, 0);
    assert.equal(serializedPayload.includes(rawQuery), false);
    assert.equal(serializedPayload.includes(rollbackPlanRef), false);
    assert.equal(serializedPayload.includes('RAW_LOCAL_READ_FALLBACK_CONTENT_SHOULD_NOT_ECHO'), false);
  }, { bearerToken: 'test-token' }, {
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'workspace-alpha',
    defaultClientId: 'codex',
    defaultVisibility: 'private',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary_with_local_fallback',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeReadDelegationToolCaller: async () => {
      nativeReads += 1;
      throw new Error('native read should not be called for read rollback plan reference');
    }
  });
});

test('HTTP MCP bearer audit_memory returns governed native bridge receipt from prior delegated write', async () => {
  const rawWriteContent = 'RAW_HTTP_AUDIT_WRITE_CONTENT_SHOULD_NOT_ECHO';
  const rawNativeValue = 'RAW_HTTP_AUDIT_NATIVE_VALUE_SHOULD_NOT_ECHO';
  const rawNativeMemoryId = 'RAW_HTTP_AUDIT_NATIVE_MEMORY_ID_SHOULD_NOT_ECHO';
  const rollbackPlanRef = 'cm-http-audit-write-rollback-plan';
  const writeDelegationToolCaller = async payload => ({
    memory_id: rawNativeMemoryId,
    content: rawNativeValue,
    title: payload.arguments?.title
  });
  writeDelegationToolCaller.callWithReceipt = async payload => ({
    value: {
      memory_id: rawNativeMemoryId,
      content: rawNativeValue,
      title: payload.arguments?.title
    },
    receipt: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server',
      transportCategory: 'local_http_transport',
      mcpMethod: 'tools/call',
      toolName: 'record_memory',
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
      readinessClaimed: false
    }
  });

  await withHttpServer(async ({ app, address }) => {
    let localWrites = 0;
    app.services.writeService.record = async () => {
      localWrites += 1;
      return { success: true };
    };

    const writeResponse = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 71,
        method: 'tools/call',
        params: {
          name: 'record_memory',
          arguments: {
            target: 'knowledge',
            title: 'HTTP governed native write audit receipt',
            content: rawWriteContent,
            evidence: 'HTTP MCP delegated write should leave a bridge receipt for audit_memory',
            validated: true,
            reusable: true,
            sensitivity: 'none',
            project_id: 'codex-memory',
            workspace_id: 'workspace-alpha',
            client_id: 'codex',
            visibility: 'private'
          },
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
                rollbackPlanRef
              },
              rollbackPosture: {
                mode: 'bounded_rollback_plan',
                rollback_plan_ref: rollbackPlanRef
              },
              auditReceipt: {
                receipt_id: 'cm-http-audit-write-receipt'
              }
            }
          }
        }
      })
    });
    const writePayload = await writeResponse.json();
    const writeResult = writePayload.result.structuredContent;

    const auditResponse = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 72,
        method: 'tools/call',
        params: {
          name: 'audit_memory',
          arguments: {
            audit_family: 'governance',
            window: 5,
            include_raw: false
          }
        }
      })
    });
    const auditPayload = await auditResponse.json();
    const auditResult = auditPayload.result.structuredContent;
    const bridgeFinding = auditResult.findings.find(finding =>
      finding.reasonCode === 'governed_native_bridge_audit_receipt' &&
      finding.governedNativeBridgeReceipt?.toolName === 'record_memory'
    );
    assert.ok(bridgeFinding, JSON.stringify(auditResult.findings));
    const receipt = bridgeFinding.governedNativeBridgeReceipt;
    const serializedAuditPayload = JSON.stringify(auditPayload);

    assert.equal(writeResponse.status, 200);
    assert.equal(localWrites, 0);
    assert.equal(writeResult.status, 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATED');
    assert.equal(auditResponse.status, 200);
    assert.equal(auditPayload.result.isError, false);
    assert.equal(auditResult.status, 'AUDIT_MEMORY_READONLY_BOUNDED_ACCEPTED_NOT_PUBLIC');
    assert.equal(auditResult.access.mode, 'audit_memory_readonly_bounded');
    assert.equal(auditResult.access.rawAuditReturned, false);
    assert.equal(auditResult.access.rawMemoryReturned, false);
    assert.equal(auditResult.access.tokenMaterialReturned, false);
    assert.equal(auditResult.policy.governedNativeBridgeAuditReceiptProjection, true);
    assert.notEqual(auditResult.policy.rawAuditScanPerformed, true);
    assert.equal(bridgeFinding.auditFamily, 'governance');
    assert.equal(bridgeFinding.decision, 'visible');
    assert.equal(receipt.toolName, 'record_memory');
    assert.equal(receipt.delegationDirection, 'write');
    assert.equal(receipt.clientId, 'Codex');
    assert.equal(receipt.visibility, 'private');
    assert.equal(receipt.scopePresent, true);
    assert.equal(receipt.scopeIdentifierPresent, true);
    assert.equal(receipt.scopeFingerprintPresent, true);
    assert.deepEqual(receipt.scopeFieldNames, [
      'client_id',
      'project_id',
      'scope_id',
      'visibility',
      'workspace_id'
    ]);
    assert.deepEqual(receipt.scopeIdentifierFieldNames, [
      'project_id',
      'scope_id',
      'workspace_id'
    ]);
    assert.equal(receipt.trustedExecutionContextSupplied, true);
    assert.equal(receipt.trustedExecutionContextAccepted, true);
    assert.equal(receipt.trustedExecutionContextScopeMatched, true);
    assert.equal(receipt.invocationProfile, 'governed_bounded_write');
    assert.equal(receipt.invocationProfileSource, 'bridge_tool_binding');
    assert.equal(receipt.invocationProfileBound, true);
    assert.equal(receipt.invocationProfileToolArgumentsMayOverride, false);
    assert.equal(receipt.invocationProfileGovernanceMetadataMayOverride, false);
    assert.equal(receipt.readAllowed, false);
    assert.equal(receipt.writeAllowed, true);
    assert.equal(receipt.writePolicy, 'exact_approval');
    assert.equal(receipt.readWriteAuthoritySource, 'bridge_tool_binding');
    assert.equal(receipt.readWriteAuthorityBound, true);
    assert.equal(receipt.mixedReadWriteAllowed, false);
    assert.equal(receipt.unboundedWriteAllowed, false);
    assert.equal(receipt.writeRequiresExactApproval, true);
    assert.equal(receipt.exactApprovalAction, 'live_bridge_record_memory_proof');
    assert.equal(receipt.exactApprovalActionMatched, true);
    assert.equal(receipt.exactApprovalScopeMatched, true);
    assert.equal(receipt.exactApprovalRuntimeTargetMatched, true);
    assert.equal(receipt.exactApprovalRollbackPlanMatched, true);
    assert.equal(receipt.exactApprovalScopeReferencesSafe, true);
    assert.equal(receipt.exactApprovalScopeVisibilityAccepted, true);
    assert.equal(receipt.exactApprovalRuntimeTargetReferenceSafe, true);
    assert.equal(receipt.exactApprovalRuntimeTargetKindAccepted, true);
    assert.equal(receipt.exactApprovalRuntimeTargetPrimaryRuntimeAccepted, true);
    assert.equal(receipt.exactApprovalRollbackPlanReferencePresent, true);
    assert.equal(receipt.exactApprovalRollbackPlanReferenceSafe, true);
    assert.equal(receipt.runtimeTargetKind, 'mcp_server');
    assert.equal(receipt.runtimeTargetSourceAuthority, 'bridge_runtime_or_static_config');
    assert.equal(receipt.runtimeTargetBound, true);
    assert.equal(receipt.runtimeTargetToolArgumentsMayOverride, false);
    assert.equal(receipt.runtimeTargetGovernanceMetadataMayOverride, false);
    assert.equal(receipt.targetReferenceName, 'operator-vcp-toolbox-service-ref');
    assert.equal(receipt.disclosureLevel, 'summary');
    assert.equal(receipt.outputDisclosureBudgetSource, 'bridge_gate_normalized_governance');
    assert.equal(receipt.outputDisclosureBudgetBound, true);
    assert.equal(receipt.outputDisclosureBudgetToolArgumentsMayOverride, false);
    assert.equal(receipt.outputDisclosureBudgetGovernanceMetadataMayOverride, false);
    assert.equal(receipt.disclosureMaxItems, 5);
    assert.equal(receipt.disclosureMaxBytes, 4096);
    assert.equal(receipt.rawOutputAllowed, false);
    assert.equal(receipt.auditReceiptRequired, true);
    assert.equal(receipt.auditReceiptSource, 'bridge_gate_normalized_governance');
    assert.equal(receipt.auditReceiptLowDisclosure, true);
    assert.equal(receipt.auditReceiptLowDisclosureBound, true);
    assert.equal(receipt.auditReceiptToolArgumentsMayOverride, false);
    assert.equal(receipt.auditReceiptGovernanceMetadataMayOverride, false);
    assert.equal(receipt.bridgeReceiptLowDisclosure, true);
    assert.equal(receipt.localMemoryRole, 'not_used');
    assert.equal(receipt.localMemorySourceRuntime, null);
    assert.equal(receipt.localMemoryPrimaryRuntime, false);
    assert.equal(receipt.localMemoryFallbackUsed, false);
    assert.equal(receipt.localMemoryResultReturned, false);
    assert.equal(receipt.localMemoryResultCanBeMistakenForVcpNative, false);
    assert.equal(receipt.localMemoryRawContentDisclosed, false);
    assert.equal(receipt.auditReceiptReferencePresent, true);
    assert.equal(receipt.auditReceiptReferenceSafe, true);
    assert.equal(receipt.auditReceiptReferenceName, 'cm-http-audit-write-receipt');
    assert.equal(receipt.rollbackPosture, 'bounded_rollback_plan');
    assert.equal(receipt.rollbackPlanReferencePresent, true);
    assert.equal(receipt.rollbackPlanReferenceSafe, true);
    assert.equal(receipt.rollbackWritePostureBound, true);
    assert.equal(receipt.rollbackPostureBound, true);
    assert.equal(receipt.rollbackPlanBound, true);
    assert.equal(receipt.rollbackPlanShapeOnly, true);
    assert.equal(receipt.rollbackRequired, false);
    assert.equal(receipt.rollbackDisposition, 'no_rollback_required');
    assert.equal(receipt.rollbackApplyPolicy, 'not_applicable');
    assert.equal(receipt.rollbackApplyAttempted, false);
    assert.equal(receipt.rollbackAutoApplyAllowed, false);
    assert.equal(receipt.rollbackRawPlanDisclosed, false);
    assert.equal(receipt.rollbackRawPlanPersisted, false);
    assert.equal(receipt.transportCategory, 'local_http_transport');
    assert.equal(receipt.mcpMethod, 'tools/call');
    assert.equal(receipt.nativeInvocationToolName, 'record_memory');
    assert.equal(receipt.nativeInvocationStatusClass, 'success');
    assert.equal(receipt.nativeInvocationHttpStatusClass, 'success');
    assert.equal(receipt.nativeInvocationResponseShapeCategory, 'object_top_level_kind_only_no_field_names');
    assert.equal(receipt.nativeInvocationAttempted, true);
    assert.equal(receipt.nativeMcpToolInvocationAttempted, true);
    assert.equal(receipt.nativeInvocationReceiptBindingMatched, true);
    assert.equal(receipt.nativeInvocationGovernanceMetadataSent, true);
    assert.equal(receipt.nativeInvocationGovernanceMetadataPath, 'params._meta.codexMemoryGovernance');
    assert.equal(receipt.nativeInvocationGovernanceMetadataRawValueDisclosed, false);
    assert.equal(receipt.memoryWritePerformed, true);
    assert.equal(receipt.rawScopePersisted, false);
    assert.equal(receipt.rawScopeValueReturned, false);
    assert.equal(receipt.clientIdentitySource, 'trusted_execution_context_or_transport');
    assert.equal(receipt.clientIdentityBound, true);
    assert.equal(receipt.clientIdentityToolArgumentsMayOverride, false);
    assert.equal(receipt.clientIdentityGovernanceMetadataMayOverride, false);
    assert.equal(receipt.scopeBoundarySource, 'trusted_execution_context_or_transport');
    assert.equal(receipt.scopeBoundaryBound, true);
    assert.equal(receipt.scopeToolArgumentsMayOverride, false);
    assert.equal(receipt.scopeGovernanceMetadataMayOverride, false);
    assert.equal(receipt.visibilityBound, true);
    assert.equal(receipt.rawRequestBodyPersisted, false);
    assert.equal(receipt.rawResponseBodyPersisted, false);
    assert.equal(receipt.memoryContentDisclosed, false);
    assert.equal(receipt.tokenMaterialDisclosed, false);
    assert.equal(receipt.endpointDisclosed, false);
    assert.equal(receipt.readinessClaimed, false);

    const matchingScopedAuditResponse = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 721,
        method: 'tools/call',
        params: {
          name: 'audit_memory',
          arguments: {
            audit_family: 'governance',
            window: 5,
            scope: {
              scope_id: 'scope-alpha',
              project_id: 'codex-memory',
              workspace_id: 'workspace-alpha',
              client_id: 'codex',
              visibility: 'private'
            },
            include_raw: false
          }
        }
      })
    });
    const matchingScopedAuditPayload = await matchingScopedAuditResponse.json();
    const matchingScopedAuditResult = matchingScopedAuditPayload.result.structuredContent;
    const matchingScopedBridgeFinding = matchingScopedAuditResult.findings.find(finding =>
      finding.reasonCode === 'governed_native_bridge_audit_receipt' &&
      finding.governedNativeBridgeReceipt?.auditReceiptReferenceName ===
        'cm-http-audit-write-receipt'
    );
    assert.ok(matchingScopedBridgeFinding, JSON.stringify(matchingScopedAuditResult.findings));

    const mismatchedScopedAuditResponse = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 722,
        method: 'tools/call',
        params: {
          name: 'audit_memory',
          arguments: {
            audit_family: 'governance',
            window: 5,
            scope: {
              scope_id: 'scope-alpha',
              project_id: 'other-project',
              workspace_id: 'workspace-alpha',
              client_id: 'codex',
              visibility: 'private'
            },
            include_raw: false
          }
        }
      })
    });
    const mismatchedScopedAuditPayload = await mismatchedScopedAuditResponse.json();
    const mismatchedScopedAuditResult = mismatchedScopedAuditPayload.result.structuredContent;
    const mismatchedScopedSerialized = JSON.stringify(mismatchedScopedAuditPayload);

    const crossClientScopedAuditResponse = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 723,
        method: 'tools/call',
        params: {
          name: 'audit_memory',
          arguments: {
            audit_family: 'governance',
            window: 5,
            scope: {
              scope_id: 'scope-alpha',
              project_id: 'codex-memory',
              workspace_id: 'workspace-alpha',
              client_id: 'claude',
              visibility: 'private'
            },
            include_raw: false
          }
        }
      })
    });
    const crossClientScopedAuditPayload = await crossClientScopedAuditResponse.json();
    const crossClientScopedAuditResult = crossClientScopedAuditPayload.result.structuredContent;
    const crossClientScopedSerialized = JSON.stringify(crossClientScopedAuditPayload);

    const mismatchedVisibilityAuditResponse = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 724,
        method: 'tools/call',
        params: {
          name: 'audit_memory',
          arguments: {
            audit_family: 'governance',
            window: 5,
            scope: {
              scope_id: 'scope-alpha',
              project_id: 'codex-memory',
              workspace_id: 'workspace-alpha',
              client_id: 'codex',
              visibility: 'workspace'
            },
            include_raw: false
          }
        }
      })
    });
    const mismatchedVisibilityAuditPayload = await mismatchedVisibilityAuditResponse.json();
    const mismatchedVisibilityAuditResult = mismatchedVisibilityAuditPayload.result.structuredContent;
    const mismatchedVisibilitySerialized = JSON.stringify(mismatchedVisibilityAuditPayload);

    const mismatchedWorkspaceAuditResponse = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 725,
        method: 'tools/call',
        params: {
          name: 'audit_memory',
          arguments: {
            audit_family: 'governance',
            window: 5,
            scope: {
              scope_id: 'scope-alpha',
              project_id: 'codex-memory',
              workspace_id: 'other-workspace',
              client_id: 'codex',
              visibility: 'private'
            },
            include_raw: false
          }
        }
      })
    });
    const mismatchedWorkspaceAuditPayload = await mismatchedWorkspaceAuditResponse.json();
    const mismatchedWorkspaceAuditResult = mismatchedWorkspaceAuditPayload.result.structuredContent;
    const mismatchedWorkspaceSerialized = JSON.stringify(mismatchedWorkspaceAuditPayload);

    const mismatchedScopeIdAuditResponse = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 726,
        method: 'tools/call',
        params: {
          name: 'audit_memory',
          arguments: {
            audit_family: 'governance',
            window: 5,
            scope: {
              scope_id: 'scope-beta',
              project_id: 'codex-memory',
              workspace_id: 'workspace-alpha',
              client_id: 'codex',
              visibility: 'private'
            },
            include_raw: false
          }
        }
      })
    });
    const mismatchedScopeIdAuditPayload = await mismatchedScopeIdAuditResponse.json();
    const mismatchedScopeIdAuditResult = mismatchedScopeIdAuditPayload.result.structuredContent;
    const mismatchedScopeIdSerialized = JSON.stringify(mismatchedScopeIdAuditPayload);

    assert.equal(matchingScopedAuditResponse.status, 200);
    assert.equal(matchingScopedAuditPayload.result.isError, false);
    assert.equal(
      matchingScopedBridgeFinding.governedNativeBridgeReceipt.scopeFingerprintPresent,
      true
    );
    assert.equal(mismatchedScopedAuditResponse.status, 200);
    assert.equal(mismatchedScopedAuditPayload.result.isError, false);
    assert.equal(
      mismatchedScopedAuditResult.findings.some(finding =>
        finding.governedNativeBridgeReceipt?.auditReceiptReferenceName ===
          'cm-http-audit-write-receipt'
      ),
      false
    );
    assert.equal(mismatchedScopedSerialized.includes('cm-http-audit-write-receipt'), false);
    assert.equal(mismatchedScopedSerialized.includes('other-project'), false);
    assert.equal(crossClientScopedAuditResponse.status, 200);
    assert.equal(crossClientScopedAuditPayload.result.isError, false);
    assert.equal(
      crossClientScopedAuditResult.findings.some(finding =>
        finding.governedNativeBridgeReceipt?.auditReceiptReferenceName ===
          'cm-http-audit-write-receipt'
      ),
      false
    );
    assert.equal(crossClientScopedSerialized.includes('cm-http-audit-write-receipt'), false);
    assert.equal(crossClientScopedSerialized.includes('claude'), false);
    assert.equal(mismatchedVisibilityAuditResponse.status, 200);
    assert.equal(mismatchedVisibilityAuditPayload.result.isError, false);
    assert.equal(
      mismatchedVisibilityAuditResult.findings.some(finding =>
        finding.governedNativeBridgeReceipt?.auditReceiptReferenceName ===
          'cm-http-audit-write-receipt'
      ),
      false
    );
    assert.equal(mismatchedVisibilitySerialized.includes('cm-http-audit-write-receipt'), false);
    assert.equal(mismatchedVisibilitySerialized.includes('"workspace"'), false);
    assert.equal(mismatchedWorkspaceAuditResponse.status, 200);
    assert.equal(mismatchedWorkspaceAuditPayload.result.isError, false);
    assert.equal(
      mismatchedWorkspaceAuditResult.findings.some(finding =>
        finding.governedNativeBridgeReceipt?.auditReceiptReferenceName ===
          'cm-http-audit-write-receipt'
      ),
      false
    );
    assert.equal(mismatchedWorkspaceSerialized.includes('cm-http-audit-write-receipt'), false);
    assert.equal(mismatchedWorkspaceSerialized.includes('other-workspace'), false);
    assert.equal(mismatchedScopeIdAuditResponse.status, 200);
    assert.equal(mismatchedScopeIdAuditPayload.result.isError, false);
    assert.equal(
      mismatchedScopeIdAuditResult.findings.some(finding =>
        finding.governedNativeBridgeReceipt?.auditReceiptReferenceName ===
          'cm-http-audit-write-receipt'
      ),
      false
    );
    assert.equal(mismatchedScopeIdSerialized.includes('cm-http-audit-write-receipt'), false);
    assert.equal(mismatchedScopeIdSerialized.includes('scope-beta'), false);
    assert.equal(serializedAuditPayload.includes(rawWriteContent), false);
    assert.equal(serializedAuditPayload.includes(rawNativeValue), false);
    assert.equal(serializedAuditPayload.includes(rawNativeMemoryId), false);
    assert.equal(serializedAuditPayload.includes(rollbackPlanRef), false);
  }, { bearerToken: 'test-token' }, {
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'workspace-alpha',
    defaultScopeId: 'scope-alpha',
    defaultClientId: 'codex',
    defaultVisibility: 'private',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeWriteDelegationToolCaller: writeDelegationToolCaller
  });
});

test('HTTP MCP bearer audit_memory exposes unbound native write receipt rollback evidence', async () => {
  const rawWriteContent = 'RAW_HTTP_UNBOUND_RECEIPT_WRITE_CONTENT_SHOULD_NOT_ECHO';
  const rawNativeValue = 'RAW_HTTP_UNBOUND_RECEIPT_NATIVE_VALUE_SHOULD_NOT_ECHO';
  const rawNativeMemoryId = 'RAW_HTTP_UNBOUND_RECEIPT_NATIVE_ID_SHOULD_NOT_ECHO';
  const rollbackPlanRef = 'cm-http-unbound-native-receipt-rollback-plan';
  let nativeWrites = 0;
  const writeDelegationToolCaller = async () => {
    throw new Error('callWithReceipt path should be used for governed native write');
  };
  writeDelegationToolCaller.callWithReceipt = async payload => {
    nativeWrites += 1;
    assert.equal(payload.toolName, 'record_memory');
    return {
      value: {
        memory_id: rawNativeMemoryId,
        content: rawNativeValue,
        title: payload.arguments?.title
      },
      receipt: {
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        targetKind: 'mcp_server',
        transportCategory: 'local_http_transport',
        mcpMethod: 'tools/call',
        toolName: 'tombstone_memory',
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
        readinessClaimed: false
      }
    };
  };

  await withHttpServer(async ({ app, address }) => {
    let localWrites = 0;
    app.services.writeService.record = async () => {
      localWrites += 1;
      return { success: true };
    };

    const writeResponse = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 729,
        method: 'tools/call',
        params: {
          name: 'record_memory',
          arguments: {
            target: 'knowledge',
            title: 'HTTP unbound native write receipt',
            content: rawWriteContent,
            evidence: 'native write receipt must bind delegated tool before success can be trusted',
            validated: true,
            reusable: true,
            sensitivity: 'none',
            project_id: 'codex-memory',
            workspace_id: 'workspace-alpha',
            client_id: 'codex',
            visibility: 'private'
          },
          _meta: {
            codexMemoryGovernance: {
              exactApprovalResult: {
                accepted: true,
                allowedAction: 'live_bridge_record_memory_proof',
                allowedScope: {
                  scope_id: 'scope-unbound',
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
                rollbackPlanRef
              },
              rollbackPosture: {
                mode: 'bounded_rollback_plan',
                rollback_plan_ref: rollbackPlanRef
              },
              auditReceipt: {
                receipt_id: 'cm-http-unbound-native-receipt'
              }
            }
          }
        }
      })
    });
    const writePayload = await writeResponse.json();
    const writeResult = writePayload.result.structuredContent;

    const auditResponse = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 730,
        method: 'tools/call',
        params: {
          name: 'audit_memory',
          arguments: {
            audit_family: 'governance',
            window: 5,
            scope: {
              scope_id: 'scope-unbound',
              project_id: 'codex-memory',
              workspace_id: 'workspace-alpha',
              client_id: 'codex',
              visibility: 'private'
            },
            include_raw: false
          }
        }
      })
    });
    const auditPayload = await auditResponse.json();
    const auditResult = auditPayload.result.structuredContent;
    const bridgeFinding = auditResult.findings.find(finding =>
      finding.reasonCode === 'governed_native_bridge_audit_receipt' &&
      finding.governedNativeBridgeReceipt?.auditReceiptReferenceName ===
        'cm-http-unbound-native-receipt'
    );
    assert.ok(bridgeFinding, JSON.stringify(auditResult.findings));
    const receipt = bridgeFinding.governedNativeBridgeReceipt;
    const serialized = JSON.stringify({ writePayload, auditPayload });

    assert.equal(writeResponse.status, 200);
    assert.equal(writePayload.result.isError, true);
    assert.equal(nativeWrites, 1);
    assert.equal(localWrites, 0);
    assert.equal(writeResult.status, 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATION_REJECTED');
    assert.equal(writeResult.reasonCode, 'native_write_delegation_native_invocation_receipt_unbound');
    assert.equal(writeResult.access.runtimeCalled, true);
    assert.equal(writeResult.access.memoryWritePerformed, true);
    assert.equal(writeResult.receipt.statusClass, 'native_invocation_receipt_unbound');
    assert.equal(writeResult.receipt.nativeInvocationReceipt.invocationBindingMatched, false);
    assert.equal(writeResult.receipt.rollbackRequired, true);
    assert.equal(
      writeResult.receipt.rollbackReasonCode,
      'write_post_commit_native_invocation_receipt_unbound'
    );
    assert.equal(writeResult.receipt.rollbackDisposition, 'rollback_required_not_applied');
    assert.equal(writeResult.receipt.rollbackFollowupRequired, true);
    assert.equal(writeResult.receipt.rollbackApplyPolicy, 'manual_governed_followup_required');
    assert.equal(writeResult.receipt.rollbackApplyAttempted, false);
    assert.equal(writeResult.receipt.rollbackAutoApplyAllowed, false);

    assert.equal(auditResponse.status, 200);
    assert.equal(auditPayload.result.isError, false);
    assert.equal(auditResult.policy.governedNativeBridgeAuditReceiptProjection, true);
    assert.equal(receipt.toolName, 'record_memory');
    assert.equal(receipt.delegationDirection, 'write');
    assert.equal(receipt.clientId, 'Codex');
    assert.equal(receipt.visibility, 'private');
    assert.equal(receipt.scopeFingerprintPresent, true);
    assert.equal(receipt.delegationStatusClass, 'native_invocation_receipt_unbound');
    assert.equal(receipt.delegationReasonCode, 'native_write_delegation_native_invocation_receipt_unbound');
    assert.equal(receipt.nativeInvocationReceiptBindingMatched, false);
    assert.equal(receipt.nativeInvocationAttempted, true);
    assert.equal(receipt.nativeMcpToolInvocationAttempted, true);
    assert.equal(receipt.memoryWritePerformed, true);
    assert.equal(receipt.rollbackRequired, true);
    assert.equal(receipt.rollbackReasonCode, 'write_post_commit_native_invocation_receipt_unbound');
    assert.equal(receipt.rollbackDisposition, 'rollback_required_not_applied');
    assert.equal(receipt.rollbackFollowupRequired, true);
    assert.equal(receipt.rollbackApplyPolicy, 'manual_governed_followup_required');
    assert.equal(receipt.rollbackApplyAttempted, false);
    assert.equal(receipt.rollbackAutoApplyAllowed, false);
    assert.equal(receipt.rawRequestBodyPersisted, false);
    assert.equal(receipt.rawResponseBodyPersisted, false);
    assert.equal(receipt.memoryContentDisclosed, false);
    assert.equal(receipt.tokenMaterialDisclosed, false);
    assert.equal(receipt.endpointDisclosed, false);
    assert.equal(serialized.includes(rawWriteContent), false);
    assert.equal(serialized.includes(rawNativeValue), false);
    assert.equal(serialized.includes(rawNativeMemoryId), false);
    assert.equal(serialized.includes(rollbackPlanRef), false);
    assert.equal(serialized.includes('scope-unbound'), false);
  }, { bearerToken: 'test-token' }, {
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'workspace-alpha',
    defaultScopeId: 'scope-unbound',
    defaultClientId: 'codex',
    defaultVisibility: 'private',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeWriteDelegationToolCaller: writeDelegationToolCaller
  });
});

test('HTTP MCP bearer audit_memory exposes governed native write output budget buckets', async () => {
  const rawWriteContent = 'RAW_HTTP_AUDIT_OVER_BUDGET_WRITE_CONTENT_SHOULD_NOT_ECHO';
  const rawNativeValue = 'RAW_HTTP_AUDIT_OVER_BUDGET_NATIVE_VALUE_SHOULD_NOT_ECHO_'.repeat(8);
  const rawNativeMemoryId = 'RAW_HTTP_AUDIT_OVER_BUDGET_NATIVE_ID_SHOULD_NOT_ECHO';
  const rollbackPlanRef = 'cm-http-audit-over-budget-write-rollback-plan';
  const writeDelegationToolCaller = async payload => ({
    memory_id: rawNativeMemoryId,
    content: rawNativeValue,
    title: payload.arguments?.title
  });
  writeDelegationToolCaller.callWithReceipt = async payload => ({
    value: {
      memory_id: rawNativeMemoryId,
      content: rawNativeValue,
      title: payload.arguments?.title
    },
    receipt: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server',
      transportCategory: 'local_http_transport',
      mcpMethod: 'tools/call',
      toolName: 'record_memory',
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
      readinessClaimed: false
    }
  });

  await withHttpServer(async ({ app, address }) => {
    let localWrites = 0;
    app.services.writeService.record = async () => {
      localWrites += 1;
      return { success: true };
    };

    const writeResponse = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 77,
        method: 'tools/call',
        params: {
          name: 'record_memory',
          arguments: {
            target: 'knowledge',
            title: 'HTTP governed native write over budget audit receipt',
            content: rawWriteContent,
            evidence: 'HTTP MCP over-budget delegated write should leave audit buckets',
            validated: true,
            reusable: true,
            sensitivity: 'none',
            project_id: 'codex-memory',
            workspace_id: 'workspace-alpha',
            client_id: 'codex',
            visibility: 'private'
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
                rollbackPlanRef
              },
              rollbackPosture: {
                mode: 'bounded_rollback_plan',
                rollback_plan_ref: rollbackPlanRef
              },
              auditReceipt: {
                receipt_id: 'cm-http-audit-over-budget-write-receipt'
              },
              outputDisclosureBudget: {
                level: 'summary',
                low_disclosure: true,
                raw_output: false,
                max_items: 5,
                max_bytes: 64
              }
            }
          }
        }
      })
    });
    const writePayload = await writeResponse.json();
    const writeResult = writePayload.result.structuredContent;

    const auditResponse = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 78,
        method: 'tools/call',
        params: {
          name: 'audit_memory',
          arguments: {
            audit_family: 'governance',
            window: 5,
            include_raw: false
          }
        }
      })
    });
    const auditPayload = await auditResponse.json();
    const auditResult = auditPayload.result.structuredContent;
    const bridgeFinding = auditResult.findings.find(finding =>
      finding.reasonCode === 'governed_native_bridge_audit_receipt' &&
      finding.governedNativeBridgeReceipt?.toolName === 'record_memory'
    );
    assert.ok(bridgeFinding, JSON.stringify(auditResult.findings));
    const receipt = bridgeFinding.governedNativeBridgeReceipt;
    const serializedAuditPayload = JSON.stringify(auditPayload);

    assert.equal(writeResponse.status, 200);
    assert.equal(writePayload.result.isError, true);
    assert.equal(localWrites, 0);
    assert.equal(writeResult.status, 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATION_REJECTED');
    assert.equal(writeResult.reasonCode, 'native_write_delegation_output_budget_exceeded');
    assert.equal(writeResult.access.memoryWritePerformed, true);
    assert.equal(writeResult.receipt.outputBudgetExceeded, true);
    assert.equal(writeResult.receipt.byteCountBucket, 'over_budget');
    assert.equal(auditResponse.status, 200);
    assert.equal(auditPayload.result.isError, false);
    assert.equal(receipt.delegationStatusClass, 'output_budget_exceeded');
    assert.equal(receipt.delegationReasonCode, 'native_write_delegation_output_budget_exceeded');
    assert.equal(receipt.responseShapeCategory, 'object_top_level_kind_only_no_field_names');
    assert.equal(receipt.topLevelKindCategory, 'object');
    assert.equal(receipt.itemCountBucket, 'object_not_counted');
    assert.equal(receipt.byteCountBucket, 'over_budget');
    assert.equal(receipt.outputBudgetExceeded, true);
    assert.equal(receipt.disclosureMaxBytes, 64);
    assert.equal(receipt.rollbackRequired, true);
    assert.equal(receipt.rollbackReasonCode, 'write_post_commit_output_budget_exceeded');
    assert.equal(receipt.rollbackDisposition, 'rollback_required_not_applied');
    assert.equal(receipt.rollbackFollowupRequired, true);
    assert.equal(receipt.rollbackApplyPolicy, 'manual_governed_followup_required');
    assert.equal(receipt.rollbackApplyAttempted, false);
    assert.equal(receipt.rollbackAutoApplyAllowed, false);
    assert.equal(receipt.rawResponseBodyPersisted, false);
    assert.equal(receipt.memoryContentDisclosed, false);
    assert.equal(serializedAuditPayload.includes(rawWriteContent), false);
    assert.equal(serializedAuditPayload.includes(rawNativeValue), false);
    assert.equal(serializedAuditPayload.includes(rawNativeMemoryId), false);
    assert.equal(serializedAuditPayload.includes(rollbackPlanRef), false);
  }, { bearerToken: 'test-token' }, {
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'workspace-alpha',
    defaultClientId: 'codex',
    defaultVisibility: 'private',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeWriteDelegationToolCaller: writeDelegationToolCaller
  });
});

test('HTTP MCP bearer audit_memory returns governed native bridge receipt from prior delegated read', async () => {
  const rawQuery = 'http governed native read audit receipt';
  const rawNativeValue = 'RAW_HTTP_AUDIT_NATIVE_READ_VALUE_SHOULD_NOT_ECHO';
  const rawNativeMemoryId = 'RAW_HTTP_AUDIT_NATIVE_READ_MEMORY_ID_SHOULD_NOT_ECHO';
  const rawAuditNativeFailure = 'RAW_HTTP_AUDIT_NATIVE_FAILURE_SHOULD_NOT_ECHO';
  let nativeReadCall = null;
  const readDelegationToolCaller = async payload => {
    if (payload.toolName === 'audit_memory') {
      const error = new Error(rawAuditNativeFailure);
      error.statusClass = 'transport_error';
      error.lowDisclosureReceipt = nativeInvocationReceiptForPayload(payload, {
        statusClass: 'transport_error',
        httpStatusClass: 'transport_error',
        jsonRpcErrorPresent: true,
        responseShapeCategory: 'not_consumed',
        topLevelKindCategory: 'not_consumed'
      });
      throw error;
    }
    return {
      results: [{
        memoryId: rawNativeMemoryId,
        content: rawNativeValue,
        query: payload.arguments?.query
      }]
    };
  };
  readDelegationToolCaller.callWithReceipt = async payload => {
    if (payload.toolName === 'audit_memory') {
      const error = new Error(rawAuditNativeFailure);
      error.statusClass = 'transport_error';
      error.lowDisclosureReceipt = nativeInvocationReceiptForPayload(payload, {
        statusClass: 'transport_error',
        httpStatusClass: 'transport_error',
        jsonRpcErrorPresent: true,
        responseShapeCategory: 'not_consumed',
        topLevelKindCategory: 'not_consumed'
      });
      throw error;
    }
    nativeReadCall = payload;
    return {
      value: {
        results: [{
          memoryId: rawNativeMemoryId,
          content: rawNativeValue,
          query: payload.arguments?.query
        }]
      },
      receipt: {
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        targetKind: 'mcp_server',
        transportCategory: 'local_http_transport',
        mcpMethod: 'tools/call',
        toolName: 'search_memory',
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
        readinessClaimed: false
      }
    };
  };

  await withHttpServer(async ({ address }) => {
    const readResponse = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 73,
        method: 'tools/call',
        params: {
          name: 'search_memory',
          arguments: {
            query: rawQuery,
            target: 'both',
            limit: 10,
            include_content: false
          },
          _meta: {
            codexMemoryGovernance: {
              rollbackPosture: {
                mode: 'read_only_no_write'
              },
              auditReceipt: {
                receipt_id: 'cm-http-audit-read-receipt'
              },
              outputDisclosureBudget: {
                level: 'summary',
                low_disclosure: true,
                full_output: false,
                max_items: 5,
                max_bytes: 4096
              }
            }
          }
        }
      })
    });
    const readPayload = await readResponse.json();
    assert.ok(readPayload.result, JSON.stringify(readPayload));
    const readResult = readPayload.result.structuredContent;

    const auditResponse = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 74,
        method: 'tools/call',
        params: {
          name: 'audit_memory',
          arguments: {
            audit_family: 'governance',
            window: 5,
            include_raw: false
          }
        }
      })
    });
    const auditPayload = await auditResponse.json();
    const auditResult = auditPayload.result.structuredContent;
    const bridgeFinding = auditResult.findings.find(finding =>
      finding.reasonCode === 'governed_native_bridge_audit_receipt' &&
      finding.governedNativeBridgeReceipt?.toolName === 'search_memory'
    );
    assert.ok(bridgeFinding, JSON.stringify(auditResult.findings));
    const receipt = bridgeFinding.governedNativeBridgeReceipt;
    const serializedReadPayload = JSON.stringify(readPayload);
    const serializedAuditPayload = JSON.stringify(auditPayload);

    assert.equal(readResponse.status, 200);
    assert.equal(readResult.status, 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATED');
    assert.equal(
      readResult.receipt.nativeInvocationReceipt.governanceMetadataPath,
      'params._meta.codexMemoryGovernance',
      JSON.stringify(readResult.receipt, null, 2)
    );
    assert.equal(readResult.access.primaryRuntime, 'VCPToolBox native memory');
    assert.equal(readResult.access.localMemoryRole, 'not_used');
    assert.equal(readResult.access.localMemoryFallbackUsed, false);
    assert.equal(readResult.access.rawMemoryReturned, false);
    assert.ok(nativeReadCall, JSON.stringify(readResult));
    assert.equal(nativeReadCall.toolName, 'search_memory');
    assert.equal(nativeReadCall.arguments.query, rawQuery);
    assert.equal(nativeReadCall.arguments.limit, 5);
    assert.equal(nativeReadCall.arguments.include_content, false);
    assert.deepEqual(nativeReadCall.arguments.scope, {
      project_id: 'codex-memory',
      workspace_id: 'workspace-alpha',
      client_id: 'Codex',
      visibility: 'private'
    });
    assert.equal(nativeReadCall.arguments.governed_bridge.primary_runtime, 'VCPToolBox native memory');
    assert.deepEqual(nativeReadCall.arguments.governed_bridge.runtime_target, {
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
    assert.equal(nativeReadCall.arguments.governed_bridge.client_id, 'Codex');
    assert.equal(nativeReadCall.arguments.governed_bridge.access_path, 'governed MCP tools');
    assert.equal(nativeReadCall.arguments.governed_bridge.visibility, 'private');
    assert.deepEqual(nativeReadCall.arguments.governed_bridge.scope, nativeReadCall.arguments.scope);
    assert.equal(nativeReadCall.arguments.governed_bridge.scope_present, true);
    assert.equal(nativeReadCall.arguments.governed_bridge.scope_identifier_present, true);
    assert.equal(nativeReadCall.arguments.governed_bridge.scope_identifier_safe, true);
    assert.deepEqual(nativeReadCall.arguments.governed_bridge.scope_field_names, [
      'client_id',
      'project_id',
      'visibility',
      'workspace_id'
    ]);
    assert.deepEqual(nativeReadCall.arguments.governed_bridge.scope_identifier_field_names, [
      'project_id',
      'workspace_id'
    ]);
    assert.equal(
      nativeReadCall.arguments.governed_bridge.scope_fingerprint,
      '5f3544ce179efd0c3fd67066999029fa567975577f7f446f78fe9e2e04f34bc1'
    );
    assert.equal(nativeReadCall.arguments.governed_bridge.raw_scope_persisted, false);
    assert.equal(nativeReadCall.arguments.governed_bridge.local_memory_role, 'not_used');
    assert.equal(nativeReadCall.arguments.governed_bridge.local_memory_source_runtime, null);
    assert.equal(nativeReadCall.arguments.governed_bridge.local_memory_primary_runtime, false);
    assert.equal(nativeReadCall.arguments.governed_bridge.local_memory_fallback_used, false);
    assert.equal(nativeReadCall.arguments.governed_bridge.local_memory_result_returned, false);
    assert.equal(nativeReadCall.arguments.governed_bridge.local_memory_result_can_be_mistaken_for_vcp_native, false);
    assert.equal(nativeReadCall.arguments.governed_bridge.local_memory_raw_content_disclosed, false);
    assert.equal(nativeReadCall.arguments.governed_bridge.trusted_execution_context_supplied, true);
    assert.equal(nativeReadCall.arguments.governed_bridge.trusted_execution_context_accepted, true);
    assert.equal(nativeReadCall.arguments.governed_bridge.trusted_execution_context_scope_matched, true);
    assert.equal(nativeReadCall.arguments.governed_bridge.invocation_profile, 'governed_read_only');
    assert.equal(nativeReadCall.arguments.governed_bridge.invocation_profile_source, 'bridge_tool_binding');
    assert.equal(nativeReadCall.arguments.governed_bridge.invocation_profile_bound, true);
    assert.equal(nativeReadCall.arguments.governed_bridge.invocation_profile_tool_arguments_may_override, false);
    assert.equal(nativeReadCall.arguments.governed_bridge.invocation_profile_governance_metadata_may_override, false);
    assert.equal(nativeReadCall.arguments.governed_bridge.invocation_transport, 'mcp');
    assert.equal(nativeReadCall.arguments.governed_bridge.invocation_tool_name, 'search_memory');
    assert.equal(nativeReadCall.arguments.governed_bridge.invocation_profile_tool_match, true);
    assert.equal(nativeReadCall.arguments.governed_bridge.invocation_profile_forbidden_field_count, 0);
    assert.equal(nativeReadCall.arguments.governed_bridge.read_allowed, true);
    assert.equal(nativeReadCall.arguments.governed_bridge.write_allowed, false);
    assert.equal(nativeReadCall.arguments.governed_bridge.read_write_authority_source, 'bridge_tool_binding');
    assert.equal(nativeReadCall.arguments.governed_bridge.read_write_authority_bound, true);
    assert.equal(nativeReadCall.arguments.governed_bridge.mixed_read_write_allowed, false);
    assert.equal(nativeReadCall.arguments.governed_bridge.unbounded_write_allowed, false);
    assert.equal(nativeReadCall.arguments.governed_bridge.write_requires_exact_approval, false);
    assert.equal(nativeReadCall.arguments.governed_bridge.read_write_authority_forbidden_field_count, 0);
    assert.equal(nativeReadCall.arguments.governed_bridge.raw_output_allowed, false);
    assert.equal(nativeReadCall.arguments.governed_bridge.disclosure_level, 'summary');
    assert.equal(nativeReadCall.arguments.governed_bridge.disclosure_max_items, 5);
    assert.equal(nativeReadCall.arguments.governed_bridge.disclosure_max_bytes, 4096);
    assert.equal(nativeReadCall.arguments.governed_bridge.disclosure_forbidden_field_count, 0);
    assert.equal(nativeReadCall.arguments.governed_bridge.output_disclosure_budget_bound, true);
    assert.equal(nativeReadCall.arguments.governed_bridge.over_budget_fallback_to_raw_output, false);
    assert.equal(nativeReadCall.arguments.governed_bridge.raw_response_body_disclosed, false);
    assert.equal(nativeReadCall.arguments.governed_bridge.audit_receipt_required, true);
    assert.equal(nativeReadCall.arguments.governed_bridge.audit_receipt_low_disclosure, true);
    assert.equal(nativeReadCall.arguments.governed_bridge.audit_receipt_reference_present, true);
    assert.equal(
      nativeReadCall.arguments.governed_bridge.audit_receipt_event_type,
      'governed_mcp_vcp_native_bridge_receipt'
    );
    assert.equal(nativeReadCall.arguments.governed_bridge.audit_receipt_append_required, true);
    assert.equal(nativeReadCall.arguments.governed_bridge.audit_receipt_low_disclosure_bound, true);
    assert.equal(nativeReadCall.arguments.governed_bridge.audit_raw_request_body_persisted, false);
    assert.equal(nativeReadCall.arguments.governed_bridge.audit_raw_response_body_persisted, false);
    assert.equal(
      nativeReadCall.arguments.governed_bridge.audit_receipt_reference_name,
      'cm-http-audit-read-receipt'
    );
    assert.equal(nativeReadCall.arguments.governed_bridge.audit_receipt_forbidden_field_count, 0);
    assert.equal(nativeReadCall.arguments.governed_bridge.rollback_posture, 'read_only_no_write');
    assert.equal(nativeReadCall.arguments.governed_bridge.rollback_plan_reference_present, false);
    assert.equal(nativeReadCall.arguments.governed_bridge.rollback_posture_forbidden_field_count, 0);
    assert.equal(nativeReadCall.arguments.governed_bridge.rollback_posture_bound, true);
    assert.equal(nativeReadCall.arguments.governed_bridge.rollback_plan_shape_only, false);
    assert.equal(nativeReadCall.arguments.governed_bridge.rollback_auto_apply_allowed, false);
    assert.equal(nativeReadCall.arguments.governed_bridge.rollback_apply_requires_governed_followup, false);
    assert.equal(nativeReadCall.arguments.governed_bridge.rollback_raw_plan_disclosed, false);
    assert.equal(nativeReadCall.arguments.governed_bridge.rollback_raw_plan_persisted, false);
    assert.equal(nativeReadCall.arguments.governed_bridge.low_disclosure, true);
    assert.equal(JSON.stringify(nativeReadCall.arguments.governed_bridge).includes(rawQuery), false);
    assert.equal(auditResponse.status, 200);
    assert.equal(auditPayload.result.isError, false);
    assert.equal(auditResult.status, 'AUDIT_MEMORY_READONLY_BOUNDED_ACCEPTED_NOT_PUBLIC');
    assert.equal(auditResult.access.localMemoryFallbackUsed, true);
    assert.equal(auditResult.access.localMemoryRole, 'fallback');
    assert.equal(auditResult.access.rawAuditReturned, false);
    assert.equal(auditResult.access.rawMemoryReturned, false);
    assert.equal(auditResult.access.tokenMaterialReturned, false);
    assert.equal(auditResult.policy.governedNativeBridgeAuditReceiptProjection, true);
    assert.notEqual(auditResult.policy.rawAuditScanPerformed, true);
    assert.equal(bridgeFinding.auditFamily, 'governance');
    assert.equal(bridgeFinding.decision, 'visible');
    assert.equal(receipt.toolName, 'search_memory');
    assert.equal(receipt.delegationDirection, 'read');
    assert.equal(receipt.clientId, 'Codex');
    assert.equal(receipt.visibility, 'private');
    assert.equal(receipt.scopePresent, true);
    assert.equal(receipt.scopeIdentifierPresent, true);
    assert.equal(receipt.scopeFingerprintPresent, true);
    assert.deepEqual(receipt.scopeFieldNames, [
      'client_id',
      'project_id',
      'visibility',
      'workspace_id'
    ]);
    assert.equal(receipt.trustedExecutionContextSupplied, true);
    assert.equal(receipt.trustedExecutionContextAccepted, true);
    assert.equal(receipt.trustedExecutionContextScopeMatched, true);
    assert.equal(receipt.invocationProfile, 'governed_read_only');
    assert.equal(receipt.invocationProfileSource, 'bridge_tool_binding');
    assert.equal(receipt.invocationProfileBound, true);
    assert.equal(receipt.invocationProfileToolArgumentsMayOverride, false);
    assert.equal(receipt.invocationProfileGovernanceMetadataMayOverride, false);
    assert.equal(receipt.readAllowed, true);
    assert.equal(receipt.writeAllowed, false);
    assert.equal(receipt.writePolicy, null);
    assert.equal(receipt.readWriteAuthoritySource, 'bridge_tool_binding');
    assert.equal(receipt.readWriteAuthorityBound, true);
    assert.equal(receipt.mixedReadWriteAllowed, false);
    assert.equal(receipt.unboundedWriteAllowed, false);
    assert.equal(receipt.writeRequiresExactApproval, false);
    assert.equal(receipt.runtimeTargetKind, 'mcp_server');
    assert.equal(receipt.runtimeTargetSourceAuthority, 'bridge_runtime_or_static_config');
    assert.equal(receipt.runtimeTargetBound, true);
    assert.equal(receipt.runtimeTargetToolArgumentsMayOverride, false);
    assert.equal(receipt.runtimeTargetGovernanceMetadataMayOverride, false);
    assert.equal(receipt.targetReferenceName, 'operator-vcp-toolbox-service-ref');
    assert.equal(receipt.disclosureLevel, 'summary');
    assert.equal(receipt.outputDisclosureBudgetSource, 'bridge_gate_normalized_governance');
    assert.equal(receipt.outputDisclosureBudgetBound, true);
    assert.equal(receipt.outputDisclosureBudgetToolArgumentsMayOverride, false);
    assert.equal(receipt.outputDisclosureBudgetGovernanceMetadataMayOverride, false);
    assert.equal(receipt.disclosureMaxItems, 5);
    assert.equal(receipt.disclosureMaxBytes, 4096);
    assert.equal(receipt.rawOutputAllowed, false);
    assert.equal(receipt.auditReceiptRequired, true);
    assert.equal(receipt.auditReceiptSource, 'bridge_gate_normalized_governance');
    assert.equal(receipt.auditReceiptLowDisclosure, true);
    assert.equal(receipt.auditReceiptLowDisclosureBound, true);
    assert.equal(receipt.auditReceiptToolArgumentsMayOverride, false);
    assert.equal(receipt.auditReceiptGovernanceMetadataMayOverride, false);
    assert.equal(receipt.bridgeReceiptLowDisclosure, true);
    assert.equal(receipt.auditReceiptReferencePresent, true);
    assert.equal(receipt.auditReceiptReferenceSafe, true);
    assert.equal(receipt.responseShapeCategory, 'object_top_level_kind_only_no_field_names');
    assert.equal(receipt.topLevelKindCategory, 'object');
    assert.equal(receipt.itemCountBucket, 'one');
    assert.equal(receipt.byteCountBucket, 'bounded');
    assert.equal(receipt.outputBudgetExceeded, false);
    assert.equal(receipt.auditReceiptReferenceName, 'cm-http-audit-read-receipt');
    assert.equal(receipt.rollbackPosture, 'read_only_no_write');
    assert.equal(receipt.rollbackPostureSource, 'bridge_gate_normalized_governance');
    assert.equal(receipt.rollbackPlanReferencePresent, false);
    assert.equal(receipt.rollbackPlanReferenceSafe, false);
    assert.equal(receipt.rollbackWritePostureBound, false);
    assert.equal(receipt.rollbackReadPostureBound, true);
    assert.equal(receipt.rollbackPostureBound, true);
    assert.equal(receipt.rollbackPostureToolArgumentsMayOverride, false);
    assert.equal(receipt.rollbackPostureGovernanceMetadataMayOverride, false);
    assert.equal(receipt.rollbackPlanBound, false);
    assert.equal(receipt.rollbackPlanShapeOnly, false);
    assert.equal(receipt.rollbackRequired, false);
    assert.equal(receipt.rollbackRawPlanDisclosed, false);
    assert.equal(receipt.rollbackRawPlanPersisted, false);
    assert.equal(receipt.transportCategory, 'local_http_transport');
    assert.equal(receipt.mcpMethod, 'tools/call');
    assert.equal(receipt.nativeInvocationToolName, 'search_memory');
    assert.equal(receipt.nativeInvocationStatusClass, 'success');
    assert.equal(receipt.nativeInvocationHttpStatusClass, 'success');
    assert.equal(receipt.nativeInvocationResponseShapeCategory, 'object_top_level_kind_only_no_field_names');
    assert.equal(receipt.nativeInvocationAttempted, true);
    assert.equal(receipt.nativeMcpToolInvocationAttempted, true);
    assert.equal(receipt.nativeInvocationReceiptBindingMatched, true);
    assert.equal(receipt.nativeInvocationGovernanceMetadataSent, true);
    assert.equal(receipt.nativeInvocationGovernanceMetadataPath, 'params._meta.codexMemoryGovernance');
    assert.equal(receipt.nativeInvocationGovernanceMetadataRawValueDisclosed, false);
    assert.equal(receipt.memoryReadPerformed, true);
    assert.equal(receipt.memoryWritePerformed, false);
    assert.equal(receipt.rawScopePersisted, false);
    assert.equal(receipt.rawScopeValueReturned, false);
    assert.equal(receipt.clientIdentitySource, 'trusted_execution_context_or_transport');
    assert.equal(receipt.clientIdentityBound, true);
    assert.equal(receipt.clientIdentityToolArgumentsMayOverride, false);
    assert.equal(receipt.clientIdentityGovernanceMetadataMayOverride, false);
    assert.equal(receipt.scopeBoundarySource, 'trusted_execution_context_or_transport');
    assert.equal(receipt.scopeBoundaryBound, true);
    assert.equal(receipt.scopeToolArgumentsMayOverride, false);
    assert.equal(receipt.scopeGovernanceMetadataMayOverride, false);
    assert.equal(receipt.visibilityBound, true);
    assert.equal(receipt.rawRequestBodyPersisted, false);
    assert.equal(receipt.rawResponseBodyPersisted, false);
    assert.equal(receipt.memoryContentDisclosed, false);
    assert.equal(receipt.tokenMaterialDisclosed, false);
    assert.equal(receipt.endpointDisclosed, false);
    assert.equal(receipt.readinessClaimed, false);
    assert.equal(serializedReadPayload.includes(rawNativeValue), false);
    assert.equal(serializedReadPayload.includes(rawNativeMemoryId), false);
    assert.equal(serializedAuditPayload.includes(rawQuery), false);
    assert.equal(serializedAuditPayload.includes(rawNativeValue), false);
    assert.equal(serializedAuditPayload.includes(rawNativeMemoryId), false);
    assert.equal(serializedAuditPayload.includes(rawAuditNativeFailure), false);
  }, { bearerToken: 'test-token' }, {
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'workspace-alpha',
    defaultClientId: 'codex',
    defaultVisibility: 'private',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary_with_local_fallback',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeReadDelegationToolCaller: readDelegationToolCaller
  });
});

test('HTTP MCP bearer audit_memory exposes unbound native read receipt without local fallback', async () => {
  const rawQuery = 'http unbound native read receipt audit';
  const rawNativeValue = 'RAW_HTTP_UNBOUND_READ_RECEIPT_NATIVE_VALUE_SHOULD_NOT_ECHO';
  const rawNativeMemoryId = 'RAW_HTTP_UNBOUND_READ_RECEIPT_NATIVE_ID_SHOULD_NOT_ECHO';
  const rawAuditNativeFailure = 'RAW_HTTP_UNBOUND_READ_AUDIT_NATIVE_FAILURE_SHOULD_NOT_ECHO';
  let nativeReads = 0;
  const readDelegationToolCaller = async payload => {
    if (payload.toolName === 'audit_memory') {
      const error = new Error(rawAuditNativeFailure);
      error.statusClass = 'transport_error';
      error.lowDisclosureReceipt = nativeInvocationReceiptForPayload(payload, {
        statusClass: 'transport_error',
        httpStatusClass: 'transport_error',
        jsonRpcErrorPresent: true,
        responseShapeCategory: 'not_consumed',
        topLevelKindCategory: 'not_consumed'
      });
      throw error;
    }
    throw new Error(`callWithReceipt path should be used for ${payload.toolName}`);
  };
  readDelegationToolCaller.callWithReceipt = async payload => {
    if (payload.toolName === 'audit_memory') {
      const error = new Error(rawAuditNativeFailure);
      error.statusClass = 'transport_error';
      error.lowDisclosureReceipt = nativeInvocationReceiptForPayload(payload, {
        statusClass: 'transport_error',
        httpStatusClass: 'transport_error',
        jsonRpcErrorPresent: true,
        responseShapeCategory: 'not_consumed',
        topLevelKindCategory: 'not_consumed'
      });
      throw error;
    }
    nativeReads += 1;
    assert.equal(payload.toolName, 'search_memory');
    return {
      value: {
        results: [{
          memoryId: rawNativeMemoryId,
          content: rawNativeValue,
          query: payload.arguments?.query
        }]
      },
      receipt: {
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        targetKind: 'mcp_server',
        transportCategory: 'local_http_transport',
        mcpMethod: 'tools/call',
        toolName: 'audit_memory',
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
        readinessClaimed: false
      }
    };
  };

  await withHttpServer(async ({ app, address }) => {
    let localSearchCalls = 0;
    app.services.passiveRecallService.search = async () => {
      localSearchCalls += 1;
      return { results: [{ content: 'LOCAL_UNBOUND_READ_FALLBACK_SHOULD_NOT_ECHO' }] };
    };

    const readResponse = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 731,
        method: 'tools/call',
        params: {
          name: 'search_memory',
          arguments: {
            query: rawQuery,
            target: 'both',
            limit: 10,
            include_content: false
          },
          _meta: {
            codexMemoryGovernance: {
              rollbackPosture: {
                mode: 'read_only_no_write'
              },
              auditReceipt: {
                receipt_id: 'cm-http-unbound-native-read-receipt'
              },
              outputDisclosureBudget: {
                level: 'summary',
                low_disclosure: true,
                raw_output: false,
                max_items: 5,
                max_bytes: 4096
              }
            }
          }
        }
      })
    });
    const readPayload = await readResponse.json();
    assert.ok(readPayload.result, JSON.stringify(readPayload));
    const readResult = readPayload.result.structuredContent;

    const auditResponse = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 732,
        method: 'tools/call',
        params: {
          name: 'audit_memory',
          arguments: {
            audit_family: 'governance',
            window: 5,
            include_raw: false
          }
        }
      })
    });
    const auditPayload = await auditResponse.json();
    const auditResult = auditPayload.result.structuredContent;
    const bridgeFinding = auditResult.findings.find(finding =>
      finding.reasonCode === 'governed_native_bridge_audit_receipt' &&
      finding.governedNativeBridgeReceipt?.auditReceiptReferenceName ===
        'cm-http-unbound-native-read-receipt'
    );
    assert.ok(bridgeFinding, JSON.stringify(auditResult.findings));
    const receipt = bridgeFinding.governedNativeBridgeReceipt;
    const serialized = JSON.stringify({ readPayload, auditPayload });

    assert.equal(readResponse.status, 200);
    assert.equal(readPayload.result.isError, true);
    assert.equal(nativeReads, 1);
    assert.equal(localSearchCalls, 0);
    assert.equal(readResult.status, 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATION_REJECTED');
    assert.equal(readResult.reasonCode, 'native_read_delegation_native_invocation_receipt_unbound');
    assert.equal(readResult.access.runtimeCalled, true);
    assert.equal(readResult.access.memoryReadPerformed, true);
    assert.equal(readResult.access.localMemoryFallbackEligible, false);
    assert.equal(readResult.access.localMemoryFallbackUsed, false);
    assert.equal(readResult.receipt.statusClass, 'native_invocation_receipt_unbound');
    assert.equal(readResult.receipt.nativeInvocationReceipt.invocationBindingMatched, false);
    assert.equal(readResult.receipt.outputBudgetExceeded, false);

    assert.equal(auditResponse.status, 200);
    assert.equal(auditPayload.result.isError, false);
    assert.equal(auditResult.policy.governedNativeBridgeAuditReceiptProjection, true);
    assert.equal(receipt.toolName, 'search_memory');
    assert.equal(receipt.delegationDirection, 'read');
    assert.equal(receipt.clientId, 'Codex');
    assert.equal(receipt.visibility, 'private');
    assert.equal(receipt.readAllowed, true);
    assert.equal(receipt.writeAllowed, false);
    assert.equal(receipt.delegationStatusClass, 'native_invocation_receipt_unbound');
    assert.equal(receipt.delegationReasonCode, 'native_read_delegation_native_invocation_receipt_unbound');
    assert.equal(receipt.nativeInvocationReceiptBindingMatched, false);
    assert.equal(receipt.nativeInvocationToolName, null);
    assert.equal(receipt.nativeInvocationAttempted, true);
    assert.equal(receipt.nativeMcpToolInvocationAttempted, true);
    assert.equal(receipt.memoryReadPerformed, true);
    assert.equal(receipt.memoryWritePerformed, false);
    assert.equal(receipt.outputBudgetExceeded, false);
    assert.equal(receipt.rollbackRequired, false);
    assert.equal(receipt.rawRequestBodyPersisted, false);
    assert.equal(receipt.rawResponseBodyPersisted, false);
    assert.equal(receipt.memoryContentDisclosed, false);
    assert.equal(receipt.tokenMaterialDisclosed, false);
    assert.equal(receipt.endpointDisclosed, false);
    assert.equal(serialized.includes(rawQuery), false);
    assert.equal(serialized.includes(rawNativeValue), false);
    assert.equal(serialized.includes(rawNativeMemoryId), false);
    assert.equal(serialized.includes(rawAuditNativeFailure), false);
    assert.equal(serialized.includes('LOCAL_UNBOUND_READ_FALLBACK_SHOULD_NOT_ECHO'), false);
  }, { bearerToken: 'test-token' }, {
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'workspace-alpha',
    defaultClientId: 'codex',
    defaultVisibility: 'private',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary_with_local_fallback',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeReadDelegationToolCaller: readDelegationToolCaller
  });
});

test('HTTP MCP bearer audit_memory exposes governed native read output budget buckets', async () => {
  const rawQuery = 'http governed native read over budget audit receipt';
  const rawNativeContentPrefix = 'RAW_HTTP_AUDIT_READ_OVER_BUDGET_NATIVE_CONTENT_SHOULD_NOT_ECHO_';
  const rawAuditNativeFailure = 'RAW_HTTP_AUDIT_READ_OVER_BUDGET_NATIVE_FAILURE_SHOULD_NOT_ECHO';
  const readDelegationToolCaller = async payload => {
    if (payload.toolName === 'audit_memory') {
      const error = new Error(rawAuditNativeFailure);
      error.statusClass = 'transport_error';
      error.lowDisclosureReceipt = nativeInvocationReceiptForPayload(payload, {
        statusClass: 'transport_error',
        httpStatusClass: 'transport_error',
        jsonRpcErrorPresent: true,
        responseShapeCategory: 'not_consumed',
        topLevelKindCategory: 'not_consumed'
      });
      throw error;
    }
    return {
      results: Array.from({ length: 6 }, (_, index) => ({
        memoryId: `raw-native-read-over-budget-${index}`,
        content: `${rawNativeContentPrefix}${index}`,
        query: payload.arguments?.query
      }))
    };
  };
  readDelegationToolCaller.callWithReceipt = async payload => {
    if (payload.toolName === 'audit_memory') {
      const error = new Error(rawAuditNativeFailure);
      error.statusClass = 'transport_error';
      error.lowDisclosureReceipt = nativeInvocationReceiptForPayload(payload, {
        statusClass: 'transport_error',
        httpStatusClass: 'transport_error',
        jsonRpcErrorPresent: true,
        responseShapeCategory: 'not_consumed',
        topLevelKindCategory: 'not_consumed'
      });
      throw error;
    }
    return {
      value: {
        results: Array.from({ length: 6 }, (_, index) => ({
          memoryId: `raw-native-read-over-budget-${index}`,
          content: `${rawNativeContentPrefix}${index}`,
          query: payload.arguments?.query
        }))
      },
      receipt: {
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        targetKind: 'mcp_server',
        transportCategory: 'local_http_transport',
        mcpMethod: 'tools/call',
        toolName: 'search_memory',
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
        readinessClaimed: false
      }
    };
  };

  await withHttpServer(async ({ app, address }) => {
    let localSearchCalls = 0;
    app.services.passiveRecallService.search = async () => {
      localSearchCalls += 1;
      return { results: [{ content: 'LOCAL_READ_FALLBACK_SHOULD_NOT_ECHO' }] };
    };

    const readResponse = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 79,
        method: 'tools/call',
        params: {
          name: 'search_memory',
          arguments: {
            query: rawQuery,
            target: 'both',
            limit: 10,
            include_content: false
          },
          _meta: {
            codexMemoryGovernance: {
              rollbackPosture: {
                mode: 'read_only_no_write'
              },
              auditReceipt: {
                receipt_id: 'cm-http-audit-read-over-budget-receipt'
              },
              outputDisclosureBudget: {
                level: 'summary',
                low_disclosure: true,
                raw_output: false,
                max_items: 5,
                max_bytes: 4096
              }
            }
          }
        }
      })
    });
    const readPayload = await readResponse.json();
    assert.ok(readPayload.result, JSON.stringify(readPayload));
    const readResult = readPayload.result.structuredContent;

    const auditResponse = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 80,
        method: 'tools/call',
        params: {
          name: 'audit_memory',
          arguments: {
            audit_family: 'governance',
            window: 5,
            include_raw: false
          }
        }
      })
    });
    const auditPayload = await auditResponse.json();
    const auditResult = auditPayload.result.structuredContent;
    const bridgeFinding = auditResult.findings.find(finding =>
      finding.reasonCode === 'governed_native_bridge_audit_receipt' &&
      finding.governedNativeBridgeReceipt?.toolName === 'search_memory'
    );
    assert.ok(bridgeFinding, JSON.stringify(auditResult.findings));
    const receipt = bridgeFinding.governedNativeBridgeReceipt;
    const serializedReadPayload = JSON.stringify(readPayload);
    const serializedAuditPayload = JSON.stringify(auditPayload);

    assert.equal(readResponse.status, 200);
    assert.equal(readPayload.result.isError, true);
    assert.equal(localSearchCalls, 0);
    assert.equal(readResult.status, 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATION_REJECTED');
    assert.equal(readResult.reasonCode, 'native_read_delegation_output_budget_exceeded');
    assert.equal(readResult.access.memoryReadPerformed, true);
    assert.equal(readResult.access.localMemoryFallbackEligible, false);
    assert.equal(readResult.receipt.outputBudgetExceeded, true);
    assert.equal(readResult.receipt.itemCountBucket, 'over_budget_many');
    assert.equal(auditResponse.status, 200);
    assert.equal(auditPayload.result.isError, false);
    assert.equal(receipt.delegationDirection, 'read');
    assert.equal(receipt.delegationStatusClass, 'output_budget_exceeded');
    assert.equal(receipt.delegationReasonCode, 'native_read_delegation_output_budget_exceeded');
    assert.equal(receipt.responseShapeCategory, 'object_top_level_kind_only_no_field_names');
    assert.equal(receipt.topLevelKindCategory, 'object');
    assert.equal(receipt.itemCountBucket, 'over_budget_many');
    assert.equal(receipt.byteCountBucket, 'bounded');
    assert.equal(receipt.outputBudgetExceeded, true);
    assert.equal(receipt.disclosureMaxItems, 5);
    assert.equal(receipt.memoryReadPerformed, true);
    assert.equal(receipt.memoryWritePerformed, false);
    assert.equal(receipt.rawResponseBodyPersisted, false);
    assert.equal(receipt.memoryContentDisclosed, false);
    assert.equal(receipt.rollbackRequired, false);
    assert.equal(serializedReadPayload.includes(rawQuery), false);
    assert.equal(serializedReadPayload.includes(rawNativeContentPrefix), false);
    assert.equal(serializedReadPayload.includes('LOCAL_READ_FALLBACK_SHOULD_NOT_ECHO'), false);
    assert.equal(serializedAuditPayload.includes(rawQuery), false);
    assert.equal(serializedAuditPayload.includes(rawNativeContentPrefix), false);
    assert.equal(serializedAuditPayload.includes(rawAuditNativeFailure), false);
  }, { bearerToken: 'test-token' }, {
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'workspace-alpha',
    defaultClientId: 'codex',
    defaultVisibility: 'private',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary_with_local_fallback',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeReadDelegationToolCaller: readDelegationToolCaller
  });
});

test('HTTP MCP bearer search_memory uses audited local fallback after native read failure', async () => {
  const rawNativeFailure = 'PRIVATE_HTTP_NATIVE_SEARCH_FAILURE_SHOULD_NOT_ECHO';
  let nativeReads = 0;
  let localSearchInput = null;

  await withHttpServer(async ({ app, address }) => {
    app.services.passiveRecallService.search = async input => {
      localSearchInput = input;
      return [];
    };

    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 75,
        method: 'tools/call',
        params: {
          name: 'search_memory',
          arguments: {
            query: 'http governed local fallback',
            target: 'both',
            limit: 10,
            include_content: false
          },
          _meta: {
            codexMemoryGovernance: {
              rollbackPosture: {
                mode: 'read_only_no_write'
              },
              auditReceipt: {
                receipt_id: 'cm-http-search-local-fallback-receipt'
              },
              outputDisclosureBudget: {
                level: 'summary',
                low_disclosure: true,
                raw_output: false,
                max_items: 5,
                max_bytes: 4096
              }
            }
          }
        }
      })
    });
    const payload = await response.json();
    const result = payload.result.structuredContent;
    const serializedPayload = JSON.stringify(payload);

    assert.equal(response.status, 200);
    assert.equal(payload.result.isError, false);
    assert.equal(nativeReads, 1);
    assert.equal(localSearchInput.limit, 5);
    assert.equal(localSearchInput.includeContent, false);
    assert.deepEqual(localSearchInput.candidateFilters, {
      projectId: 'codex-memory',
      workspaceId: 'workspace-alpha',
      clientId: 'Codex',
      visibility: ['private']
    });
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
    assert.equal(result.access.rawOutputReturned, false);
    assert.equal(result.access.rawMemoryReturned, false);
    assert.equal(result.access.rawNativeOutputReturned, false);
    assert.equal(result.access.tokenMaterialReturned, false);
    assert.equal(result.governedNativeReadFallback.localMemoryRole, 'fallback');
    assert.equal(result.governedNativeReadFallback.primaryRuntime, 'VCPToolBox native memory');
    assert.equal(result.governedNativeReadFallback.nativeInvocationAttempted, true);
    assert.equal(result.governedNativeReadFallback.nativeMcpToolInvocationAttempted, true);
    assert.equal(result.governedNativeReadFallback.nativeMemoryReadPerformed, false);
    assert.equal(result.governedNativeReadFallback.vcpNativeResult, false);
    assert.equal(result.governedNativeReadFallback.resultCanBeMistakenForVcpNative, false);
    assert.equal(result.governedNativeReadFallback.localFallbackAuditReceipt.status, 'appended');
    assert.equal(result.governedNativeReadFallback.readinessClaimed, false);
    assert.equal(serializedPayload.includes(rawNativeFailure), false);

    const auditResponse = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 76,
        method: 'tools/call',
        params: {
          name: 'audit_memory',
          arguments: {
            audit_family: 'governance',
            window: 10,
            include_raw: false
          }
        }
      })
    });
    const auditPayload = await auditResponse.json();
    const auditResult = auditPayload.result.structuredContent;
    const fallbackFinding = auditResult.findings.find(finding =>
      finding.reasonCode === 'governed_native_read_fallback_audit_receipt' &&
      finding.governedNativeReadFallbackReceipt?.toolName === 'search_memory'
    );
    assert.ok(fallbackFinding, JSON.stringify(auditResult.findings));
    const fallbackReceipt = fallbackFinding.governedNativeReadFallbackReceipt;
    const serializedAuditPayload = JSON.stringify(auditPayload);

    assert.equal(auditResponse.status, 200);
    assert.equal(auditPayload.result.isError, false);
    assert.equal(nativeReads, 2);
    assert.equal(auditResult.status, 'AUDIT_MEMORY_READONLY_BOUNDED_ACCEPTED_NOT_PUBLIC');
    assert.equal(auditResult.policy.governedNativeBridgeAuditReceiptProjection, true);
    assert.equal(fallbackReceipt.primaryRuntime, 'VCPToolBox native memory');
    assert.equal(fallbackReceipt.localMemoryRole, 'fallback');
    assert.equal(fallbackReceipt.localMemorySourceRuntime, 'codex_memory_local_fallback');
    assert.equal(fallbackReceipt.clientId, 'Codex');
    assert.equal(fallbackReceipt.visibility, 'private');
    assert.equal(fallbackReceipt.scopePresent, true);
    assert.equal(fallbackReceipt.scopeIdentifierPresent, true);
    assert.equal(fallbackReceipt.scopeFingerprintPresent, true);
    assert.deepEqual(fallbackReceipt.scopeFieldNames, [
      'client_id',
      'project_id',
      'visibility',
      'workspace_id'
    ]);
    assert.deepEqual(fallbackReceipt.scopeIdentifierFieldNames, ['project_id', 'workspace_id']);
    assert.equal(fallbackReceipt.rawScopePersisted, false);
    assert.equal(fallbackReceipt.localMemoryFallbackAuthorized, true);
    assert.equal(fallbackReceipt.localMemoryFallbackUsed, false);
    assert.equal(fallbackReceipt.fallbackReasonCode, 'native_read_delegation_transport_error');
    assert.equal(fallbackReceipt.fallbackRequiresAuditReceipt, true);
    assert.equal(fallbackReceipt.fallbackAfterAuditReceiptAppended, true);
    assert.equal(fallbackReceipt.bridgeAuditReceiptStatus, 'appended');
    assert.equal(fallbackReceipt.nativeInvocationAttempted, true);
    assert.equal(fallbackReceipt.nativeMcpToolInvocationAttempted, true);
    assert.equal(fallbackReceipt.nativeMemoryReadPerformed, false);
    assert.equal(fallbackReceipt.vcpNativeResult, false);
    assert.equal(fallbackReceipt.resultCanBeMistakenForVcpNative, false);
    assert.equal(fallbackReceipt.memoryContentDisclosed, false);
    assert.equal(fallbackReceipt.tokenMaterialDisclosed, false);
    assert.equal(fallbackReceipt.endpointDisclosed, false);
    assert.equal(fallbackReceipt.readinessClaimed, false);
    assert.equal(serializedAuditPayload.includes(rawNativeFailure), false);
  }, { bearerToken: 'test-token' }, {
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'workspace-alpha',
    defaultClientId: 'codex',
    defaultVisibility: 'private',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeReadDelegationMode: 'primary_with_local_fallback',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeReadDelegationToolCaller: async payload => {
      nativeReads += 1;
      const error = new Error(rawNativeFailure);
      error.statusClass = 'transport_error';
      error.lowDisclosureReceipt = nativeInvocationReceiptForPayload(payload, {
        statusClass: 'transport_error',
        httpStatusClass: 'transport_error',
        jsonRpcErrorPresent: true,
        responseShapeCategory: 'not_consumed',
        topLevelKindCategory: 'not_consumed'
      });
      throw error;
    }
  });
});

test('HTTP MCP no-token search_memory should be rejected', async () => {
  await withHttpServer(async ({ app, address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: {
          name: 'search_memory',
          arguments: {
            query: 'no-token search',
            target: 'process',
            limit: 3,
            include_content: false
          }
        }
      })
    });
    const payload = await response.json();

    assert.equal(response.status, 403);
    assert.equal(payload.jsonrpc, '2.0');
    assert.equal(payload.id, 7);
    assert.equal(payload.error.code, -32001);
    assert.equal(payload.error.data.code, PUBLIC_REQUEST_BLOCKED);
    assert.equal(payload.error.data.status, 'rejected');
    assert.equal(payload.error.data.reason, 'blocked');
  });
});

test('HTTP MCP no-token search_memory should not call external embedding when cache is disabled', async () => {
  await withHttpServer(async ({ address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: {
          name: 'search_memory',
          arguments: {
            query: 'no-token search blocked',
            target: 'process',
            limit: 3,
            include_content: false
          }
        }
      })
    });
    const payload = await response.json();

    assert.equal(response.status, 403);
    assert.equal(payload.error.code, -32001);
    assert.equal(payload.error.data.code, PUBLIC_REQUEST_BLOCKED);
  }, {}, { enableEmbeddingCache: false });
});

test('HTTP MCP no-token search_memory should not call external rerank provider', async () => {
  await withHttpServer(async ({ address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 9,
        method: 'tools/call',
        params: {
          name: 'search_memory',
          arguments: {
            query: 'no-token search blocked',
            target: 'process',
            limit: 3,
            include_content: false
          }
        }
      })
    });
    const payload = await response.json();

    assert.equal(response.status, 403);
    assert.equal(payload.error.code, -32001);
    assert.equal(payload.error.data.code, PUBLIC_REQUEST_BLOCKED);
  });
});

test('HTTP MCP no-token search_memory should reject include_content raw reads', async () => {
  await withHttpServer(async ({ address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 10,
        method: 'tools/call',
        params: {
          name: 'search_memory',
          arguments: {
            query: 'no-token raw content read should be rejected',
            target: 'process',
            limit: 3,
            include_content: true
          }
        }
      })
    });
    const payload = await response.json();

    assert.equal(response.status, 403);
    assert.equal(payload.jsonrpc, '2.0');
    assert.equal(payload.id, 10);
    assert.equal(payload.error.code, -32001);
    assert.equal(payload.error.message, 'Forbidden');
    assert.equal(payload.error.data.code, PUBLIC_REQUEST_BLOCKED);
    assert.equal(payload.error.data.status, 'rejected');
    assert.equal(payload.error.data.reason, 'blocked');
  });
});

test('HTTP MCP no-token memory_overview should return selected safe overview without full overview execution', async () => {
  await withHttpServer(async ({ app, address }) => {
    const originalGetOverview = app.services.overviewService.getOverview;
    app.services.overviewService.getOverview = async () => {
      throw new Error('no-token memory_overview must use selected overview projection');
    };

    try {
      const response = await fetch(address.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 11,
          method: 'tools/call',
          params: {
            name: 'memory_overview',
            arguments: {
              limit: 3
            }
          }
        })
      });
      const payload = await response.json();
      const overview = payload.result.structuredContent;
      const serialized = JSON.stringify(overview);

      assert.equal(response.status, 200);
      assert.equal(payload.jsonrpc, '2.0');
      assert.equal(payload.id, 11);
      assert.equal(payload.result.isError, false);
      assert.equal(overview.access.mode, 'public_selected_overview');
      assert.equal(overview.access.selectedProjection, true);
      assert.equal(overview.access.selectedProjectionVersion, 2);
      assert.deepEqual(Object.keys(overview).sort(), NO_TOKEN_OVERVIEW_KEYS);
      assert.deepEqual(Object.keys(overview.access).sort(), NO_TOKEN_OVERVIEW_ACCESS_KEYS);
      assert.equal(overview.access.publicAccess, 'blocked');
      assert.equal(overview.access.pathsReturned, false);
      assert.equal(overview.access.embeddingFingerprintReturned, false);
      assert.equal(overview.access.recentAuditReturned, false);
      assert.equal(overview.access.recentFilesReturned, false);
      assert.equal(overview.access.memoryLinksReturned, false);
      assert.equal(overview.access.recallRecentReturned, false);
      assert.equal(overview.access.detailFieldsReturned, false);
      assert.equal(overview.summary.latestAcceptedAt, undefined);
      assert.equal(overview.summary.latestRejectedAt, undefined);
      assert.equal(overview.shadowSync.available, true);
      assert.doesNotMatch(serialized, /bearer/i);
      assert.doesNotMatch(serialized, /token/i);
      assert.doesNotMatch(serialized, /raw/i);
      assert.doesNotMatch(serialized, /lifecycle/i);
      assert.doesNotMatch(serialized, /mutation/i);
      assert.doesNotMatch(serialized, /provider/i);
      assert.doesNotMatch(serialized, /api/i);
      assert.doesNotMatch(serialized, /client/i);
      assert.doesNotMatch(serialized, /"paths"\s*:/);
      assert.doesNotMatch(serialized, /"latestAcceptedAt"\s*:/);
      assert.doesNotMatch(serialized, /"latestRejectedAt"\s*:/);
      assert.doesNotMatch(serialized, /"recentAudit"\s*:/);
      assert.doesNotMatch(serialized, /"recentFiles"\s*:/);
      assert.doesNotMatch(serialized, /"memoryLinks"\s*:/);
      assert.doesNotMatch(serialized, /"recent"\s*:/);
      assert.doesNotMatch(serialized, /"memoryId"\s*:/);
      assert.doesNotMatch(serialized, /"title"\s*:/);
      assert.doesNotMatch(serialized, /"filePath"\s*:/);
      assert.doesNotMatch(serialized, /"sourceFile"\s*:/);
      assert.doesNotMatch(serialized, /"embeddingFingerprint"\s*:/);
    } finally {
      app.services.overviewService.getOverview = originalGetOverview;
    }
  });
});

test('HTTP MCP bearer-configured missing-token tools/call should keep no-token contract', async () => {
  await withHttpServer(async ({ app, address }) => {
    const originalGetOverview = app.services.overviewService.getOverview;
    app.services.overviewService.getOverview = async () => {
      throw new Error('missing-token memory_overview must use selected overview projection');
    };

    try {
      const overviewResponse = await fetch(address.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 111,
          method: 'tools/call',
          params: {
            name: 'memory_overview',
            arguments: {}
          }
        })
      });
      const overviewPayload = await overviewResponse.json();
      const overview = overviewPayload.result.structuredContent;

      assert.equal(overviewResponse.status, 200);
      assert.equal(overviewPayload.result.isError, false);
      assert.equal(overview.access.mode, 'public_selected_overview');
      assert.equal(overview.access.selectedProjection, true);
      assert.equal(overview.access.selectedProjectionVersion, 2);
      assert.doesNotMatch(JSON.stringify(overview), /bearer|token|raw|lifecycle|mutation|provider|api|client/i);

      const recordResponse = await fetch(address.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 112,
          method: 'tools/call',
          params: {
            name: 'record_memory',
            arguments: {
              target: 'process',
              title: 'missing-token blocked mutation',
              content: 'blocked',
              evidence: 'missing-token regression',
              validated: true,
              reusable: false,
              sensitivity: 'none'
            }
          }
        })
      });
      const recordPayload = await recordResponse.json();

      assert.equal(recordResponse.status, 403);
      assert.equal(recordPayload.error.data.code, PUBLIC_REQUEST_BLOCKED);
      assert.doesNotMatch(JSON.stringify(recordPayload), /bearer|token|raw|lifecycle|mutation|provider|api|client/i);

      const searchResponse = await fetch(address.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 113,
          method: 'tools/call',
          params: {
            name: 'search_memory',
            arguments: {
              query: 'missing-token blocked search',
              target: 'process',
              limit: 3
            }
          }
        })
      });
      const searchPayload = await searchResponse.json();

      assert.equal(searchResponse.status, 403);
      assert.equal(searchPayload.error.data.code, PUBLIC_REQUEST_BLOCKED);
      assert.doesNotMatch(JSON.stringify(searchPayload), /bearer|token|raw|lifecycle|mutation|provider|api|client/i);
    } finally {
      app.services.overviewService.getOverview = originalGetOverview;
    }
  }, { bearerToken: 'test-token' });
});

test('HTTP MCP should execute authenticated memory_overview through bounded projection by default', async () => {
  await withHttpServer(async ({ address }) => {
    const initResponse = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {}
      })
    });
    const sessionId = initResponse.headers.get(SESSION_HEADER);
    assert.ok(sessionId);

    const overview = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
        [SESSION_HEADER]: sessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 12,
        method: 'tools/call',
        params: {
          name: 'memory_overview',
          arguments: {
            limit: 3
          }
        }
      })
    });
    const payload = await overview.json();
    const structured = payload.result.structuredContent;
    const serialized = JSON.stringify(structured);

    assert.equal(overview.status, 200);
    assert.equal(payload.jsonrpc, '2.0');
    assert.equal(payload.id, 12);
    assert.equal(payload.result.isError, false);
    assert.equal(structured.access.mode, 'authenticated_bounded_overview');
    assert.equal(structured.access.selectedProjection, true);
    assert.equal(structured.access.selectedProjectionVersion, 2);
    assert.equal(structured.access.publicAccess, 'bounded');
    assert.equal(structured.access.pathsReturned, false);
    assert.equal(structured.access.embeddingFingerprintReturned, false);
    assert.equal(structured.access.recentAuditReturned, false);
    assert.equal(structured.access.recentFilesReturned, false);
    assert.equal(structured.access.memoryLinksReturned, false);
    assert.equal(structured.access.recallRecentReturned, false);
    assert.equal(structured.access.detailFieldsReturned, false);
    assert.deepEqual(Object.keys(structured).sort(), AUTHENTICATED_BOUNDED_OVERVIEW_KEYS);
    assert.deepEqual(Object.keys(structured.access).sort(), NO_TOKEN_OVERVIEW_ACCESS_KEYS);
    assert.equal(structured.governedNativeBridge.available, true);
    assert.equal(structured.governedNativeBridge.observationCount, 0);
    assert.equal(structured.governedNativeBridge.latest, null);
    assert.equal(structured.governedNativeBridge.readinessClaimed, false);
    assert.equal(structured.shadowSync.available, true);
    assert.equal(structured.paths, undefined);
    assert.equal(structured.recentAudit, undefined);
    assert.equal(structured.memoryLinks, undefined);
    assert.equal(structured.recentFiles, undefined);
    assert.equal(structured.embeddingProfile, undefined);
    assert.doesNotMatch(serialized, /test-token/i);
    assert.doesNotMatch(serialized, /"paths"\s*:/);
    assert.doesNotMatch(serialized, /"recentAudit"\s*:/);
    assert.doesNotMatch(serialized, /"recentFiles"\s*:/);
    assert.doesNotMatch(serialized, /"memoryLinks"\s*:/);
    assert.doesNotMatch(serialized, /"recent"\s*:/);
    assert.doesNotMatch(serialized, /"memoryId"\s*:/);
    assert.doesNotMatch(serialized, /"title"\s*:/);
    assert.doesNotMatch(serialized, /"filePath"\s*:/);
    assert.doesNotMatch(serialized, /"sourceFile"\s*:/);
    assert.doesNotMatch(serialized, /"embeddingFingerprint"\s*:/);
    assert.doesNotMatch(serialized, /"auditLogPath"\s*:/);
    assert.doesNotMatch(serialized, /"providerEndpoint"\s*:/);
    assert.doesNotMatch(serialized, /Authorization/i);
    assert.doesNotMatch(serialized, /Bearer\s+/i);
  }, { bearerToken: 'test-token' });
});

test('HTTP MCP authenticated memory_overview returns governed native bridge observability', async () => {
  const rawPrivateValue = 'RAW_OVERVIEW_NATIVE_PROBE_VALUE_SHOULD_NOT_ECHO';

  await withHttpServer(async ({ address }) => {
    const overview = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 21,
        method: 'tools/call',
        params: {
          name: 'memory_overview',
          arguments: {
            limit: 3
          }
        }
      })
    });
    const payload = await overview.json();
    const structured = payload.result.structuredContent;
    const nativeBridge = structured.governedNativeBridge;
    const serialized = JSON.stringify(structured);

    assert.equal(overview.status, 200);
    assert.equal(payload.result.isError, false);
    assert.equal(structured.access.mode, 'authenticated_bounded_overview');
    assert.equal(nativeBridge.available, true);
    assert.equal(nativeBridge.observationCount, 1);
    assert.equal(nativeBridge.latest.toolName, 'memory_overview');
    assert.equal(nativeBridge.latest.clientId, 'Codex');
    assert.equal(nativeBridge.latest.visibility, 'private');
    assert.equal(nativeBridge.latest.scopePresent, true);
    assert.equal(nativeBridge.latest.scopeIdentifierPresent, true);
    assert.equal(nativeBridge.latest.scopeIdentifierSafe, true);
    assert.deepEqual(nativeBridge.latest.scopeFieldNames, [
      'client_id',
      'project_id',
      'visibility',
      'workspace_id'
    ]);
    assert.deepEqual(nativeBridge.latest.scopeIdentifierFieldNames, [
      'project_id',
      'workspace_id'
    ]);
    assert.equal(nativeBridge.latest.scopeFingerprintPresent, true);
    assert.equal(nativeBridge.latest.rawScopePersisted, false);
    assert.equal(nativeBridge.latest.accessPath, 'governed MCP tools');
    assert.equal(nativeBridge.latest.primaryRuntime, 'VCPToolBox native memory');
    assert.equal(nativeBridge.latest.runtimeTargetConfigured, true);
    assert.equal(nativeBridge.latest.runtimeTargetKind, 'mcp_server');
    assert.equal(nativeBridge.latest.runtimeTargetSourceAuthority, 'bridge_runtime_or_static_config');
    assert.equal(nativeBridge.latest.runtimeTargetForbiddenFieldCount, 0);
    assert.equal(nativeBridge.latest.targetReferenceName, 'operator-vcp-toolbox-service-ref');
    assert.equal(nativeBridge.latest.runtimeTargetLocatorDisclosed, false);
    assert.equal(nativeBridge.latest.runtimeTargetEndpointDisclosed, false);
    assert.equal(nativeBridge.latest.runtimeTargetTokenMaterialDisclosed, false);
    assert.equal(nativeBridge.latest.invocationProfile, 'governed_read_only');
    assert.equal(nativeBridge.latest.invocationProfileForbiddenFieldCount, 0);
    assert.equal(nativeBridge.latest.readAllowed, true);
    assert.equal(nativeBridge.latest.writeAllowed, false);
    assert.equal(nativeBridge.latest.readWriteAuthorityForbiddenFieldCount, 0);
    assert.equal(nativeBridge.latest.disclosureLevel, 'summary');
    assert.equal(nativeBridge.latest.disclosureForbiddenFieldCount, 0);
    assert.equal(nativeBridge.latest.auditReceiptLowDisclosure, true);
    assert.equal(nativeBridge.latest.auditReceiptReferencePresent, true);
    assert.equal(nativeBridge.latest.auditReceiptReferenceSafe, true);
    assert.equal(nativeBridge.latest.auditReceiptReferenceName, 'governed-mcp-memory_overview-receipt');
    assert.equal(nativeBridge.latest.auditReceiptForbiddenFieldCount, 0);
    assert.equal(nativeBridge.latest.rollbackPosture, 'no_runtime_state_to_rollback');
    assert.equal(nativeBridge.latest.rollbackPostureForbiddenFieldCount, 0);
    assert.equal(nativeBridge.latest.rollbackPlanReferencePresent, false);
    assert.equal(nativeBridge.latest.rollbackPlanReferenceSafe, false);
    assert.equal(nativeBridge.latest.readShapeProbeExecuted, true);
    assert.equal(nativeBridge.latest.responseShapeCategory, 'object_top_level_kind_only_no_field_names');
    assert.equal(nativeBridge.latest.rawResponseBodyDisclosed, false);
    assert.equal(nativeBridge.latest.readinessClaimed, false);
    assert.equal(serialized.includes(rawPrivateValue), false);
  }, { bearerToken: 'test-token' }, {
    defaultProjectId: 'codex-memory',
    defaultWorkspaceId: 'workspace-alpha',
    defaultClientId: 'codex',
    defaultVisibility: 'private',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeReadShapeProbeInvoker: async () => ({
      privateFieldNameShouldNotEcho: rawPrivateValue
    })
  });
});

test('HTTP MCP should execute record_memory through authorized tools/call', async () => {
  await withHttpServer(async ({ address }) => {
    const initResponse = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {}
      })
    });
    const sessionId = initResponse.headers.get(SESSION_HEADER);
    assert.ok(sessionId);

    const record = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
        [SESSION_HEADER]: sessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'record_memory',
          arguments: {
            target: 'process',
            title: 'HTTP checkpoint',
            content: 'Type: checkpoint\nvia http server',
            evidence: 'http contract test',
            validated: true,
            reusable: false,
            sensitivity: 'none'
          }
        }
      })
    });
    const payload = await record.json();
    assert.equal(record.status, 200);
    assert.equal(payload.result.structuredContent.decision, 'accepted');
    assert.equal(payload.result.structuredContent.agentAlias, 'Codex');
  }, { bearerToken: 'test-token' });
});

test('CM1642 HTTP MCP strict principal scope uses trusted base context and accepts match', async () => {
  await withHttpServer(async ({ address }) => {
    const initResponse = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {}
      })
    });
    const sessionId = initResponse.headers.get(SESSION_HEADER);
    assert.ok(sessionId);

    const record = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
        [SESSION_HEADER]: sessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'record_memory',
          arguments: {
            target: 'process',
            title: 'HTTP strict principal scope accepted',
            content: 'Type: checkpoint\nvia http strict context test',
            evidence: 'CM-1642 http strict matching regression',
            validated: true,
            reusable: false,
            sensitivity: 'none'
          }
        }
      })
    });
    const payload = await record.json();

    assert.equal(record.status, 200);
    assert.equal(payload.result.structuredContent.decision, 'accepted');
    assert.equal(payload.result.structuredContent.principalScopeAuthorization, undefined);
  }, {
    bearerToken: 'test-token',
    baseRequestContext: {
      executionContext: {
        projectId: 'codex-memory',
        workspaceId: 'workspace-alpha',
        clientId: 'codex'
      }
    }
  }, {
    recordMemoryPrincipalScopeAuthorization: {
      mode: 'strict',
      policy: RECORD_MEMORY_PRINCIPAL_SCOPE_POLICY
    }
  });
});

test('CM1642 HTTP MCP strict principal scope does not trust payload scope as principal source', async () => {
  await withHttpServer(async ({ address }) => {
    const initResponse = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {}
      })
    });
    const sessionId = initResponse.headers.get(SESSION_HEADER);
    assert.ok(sessionId);

    const record = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
        [SESSION_HEADER]: sessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'record_memory',
          arguments: {
            target: 'process',
            title: 'HTTP strict payload scope rejected',
            content: 'Type: checkpoint\npayload scope must not authorize principal scope',
            evidence: 'CM-1642 http payload scope negative regression',
            validated: true,
            reusable: false,
            sensitivity: 'none',
            project_id: 'codex-memory',
            workspace_id: 'workspace-alpha',
            client_id: 'codex'
          }
        }
      })
    });
    const payload = await record.json();
    const serialized = JSON.stringify(payload);

    assert.equal(record.status, 200);
    assert.equal(payload.result.structuredContent.decision, 'rejected');
    assert.deepEqual(payload.result.structuredContent.principalScopeAuthorization.missingRequiredContextFields, [
      'projectId',
      'workspaceId',
      'clientId'
    ]);
    assert.doesNotMatch(serialized, /workspace-alpha/);
    assert.doesNotMatch(serialized, /client_id/);
    assert.doesNotMatch(serialized, /project_id/);
  }, {
    bearerToken: 'test-token'
  }, {
    recordMemoryPrincipalScopeAuthorization: {
      mode: 'strict',
      policy: RECORD_MEMORY_PRINCIPAL_SCOPE_POLICY
    }
  });
});

test('CM1656 HTTP MCP production-candidate strict auth accepts trusted env context', async () => {
  await withRecordMemoryStrictAuthEnv({
    CODEX_MEMORY_AGENT_ALIAS: 'Codex',
    CODEX_MEMORY_AGENT_ID: 'codex-desktop',
    CODEX_MEMORY_REQUEST_SOURCE: 'codex-memory-mcp',
    CODEX_MEMORY_PROJECT_ID: 'codex-memory',
    CODEX_MEMORY_WORKSPACE_ID: 'workspace-alpha',
    CODEX_MEMORY_CLIENT_ID: 'codex',
    CODEX_MEMORY_RECORD_MEMORY_AUTH_MODE: 'strict',
    CODEX_MEMORY_RECORD_MEMORY_ALLOWED_AGENT_ALIAS: 'Codex',
    CODEX_MEMORY_RECORD_MEMORY_ALLOWED_AGENT_IDS: 'codex-desktop',
    CODEX_MEMORY_RECORD_MEMORY_ALLOWED_REQUEST_SOURCES: 'codex-memory-mcp',
    CODEX_MEMORY_RECORD_MEMORY_ALLOWED_PROJECT_IDS: 'codex-memory',
    CODEX_MEMORY_RECORD_MEMORY_ALLOWED_WORKSPACE_IDS: 'workspace-alpha',
    CODEX_MEMORY_RECORD_MEMORY_ALLOWED_CLIENT_IDS: 'codex'
  }, async () => {
    await withHttpServer(async ({ app, address }) => {
      assert.equal(app.config.recordMemoryPrincipalScopeAuthorization.mode, 'strict');
      assert.equal(app.services.writeService.recordMemoryPrincipalScopeAuthorizationStrictMode, true);

      const initResponse = await fetch(address.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {}
        })
      });
      const sessionId = initResponse.headers.get(SESSION_HEADER);
      assert.ok(sessionId);

      const record = await fetch(address.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
          [SESSION_HEADER]: sessionId
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'record_memory',
            arguments: {
              target: 'process',
              title: 'HTTP env strict principal scope accepted',
              content: 'Type: checkpoint\nrisk: trusted env strict auth should accept matching runtime context',
              evidence: 'CM-1656 http env strict production-candidate regression',
              validated: true,
              reusable: false,
              sensitivity: 'none'
            }
          }
        })
      });
      const payload = await record.json();

      assert.equal(record.status, 200);
      assert.equal(payload.result.structuredContent.decision, 'accepted');
      assert.equal(payload.result.structuredContent.principalScopeAuthorization, undefined);
    }, {
      bearerToken: 'test-token'
    });
  });
});

test('CM1656 HTTP MCP production-candidate strict auth rejects trusted env mismatch despite payload scope', async () => {
  await withRecordMemoryStrictAuthEnv({
    CODEX_MEMORY_AGENT_ALIAS: 'Codex',
    CODEX_MEMORY_AGENT_ID: 'codex-desktop',
    CODEX_MEMORY_REQUEST_SOURCE: 'codex-memory-mcp',
    CODEX_MEMORY_PROJECT_ID: 'codex-memory',
    CODEX_MEMORY_WORKSPACE_ID: 'workspace-beta',
    CODEX_MEMORY_CLIENT_ID: 'claude',
    CODEX_MEMORY_RECORD_MEMORY_AUTH_MODE: 'strict',
    CODEX_MEMORY_RECORD_MEMORY_ALLOWED_AGENT_ALIAS: 'Codex',
    CODEX_MEMORY_RECORD_MEMORY_ALLOWED_AGENT_IDS: 'codex-desktop',
    CODEX_MEMORY_RECORD_MEMORY_ALLOWED_REQUEST_SOURCES: 'codex-memory-mcp',
    CODEX_MEMORY_RECORD_MEMORY_ALLOWED_PROJECT_IDS: 'codex-memory',
    CODEX_MEMORY_RECORD_MEMORY_ALLOWED_WORKSPACE_IDS: 'workspace-alpha',
    CODEX_MEMORY_RECORD_MEMORY_ALLOWED_CLIENT_IDS: 'codex'
  }, async () => {
    await withHttpServer(async ({ app, address }) => {
      assert.equal(app.config.recordMemoryPrincipalScopeAuthorization.mode, 'strict');
      assert.equal(app.services.writeService.recordMemoryPrincipalScopeAuthorizationStrictMode, true);

      const initResponse = await fetch(address.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {}
        })
      });
      const sessionId = initResponse.headers.get(SESSION_HEADER);
      assert.ok(sessionId);

      const record = await fetch(address.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
          [SESSION_HEADER]: sessionId
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'record_memory',
            arguments: {
              target: 'process',
              title: 'HTTP env strict payload scope rejected',
              content: 'Type: checkpoint\nrisk: payload scope must not override trusted env strict auth',
              evidence: 'CM-1656 http env strict payload-spoof rejection regression',
              validated: true,
              reusable: false,
              sensitivity: 'none',
              project_id: 'codex-memory',
              workspace_id: 'workspace-alpha',
              client_id: 'codex'
            }
          }
        })
      });
      const payload = await record.json();
      const serialized = JSON.stringify(payload);

      assert.equal(record.status, 200);
      assert.equal(payload.result.structuredContent.decision, 'rejected');
      assert.deepEqual(payload.result.structuredContent.principalScopeAuthorization.mismatchedFields, [
        'workspaceId',
        'clientId'
      ]);
      assert.doesNotMatch(serialized, /workspace-beta/);
      assert.doesNotMatch(serialized, /workspace-alpha/);
      assert.doesNotMatch(serialized, /claude/);
      assert.doesNotMatch(serialized, /client_id/);
      assert.doesNotMatch(serialized, /workspace_id/);
    }, {
      bearerToken: 'test-token'
    });
  });
});

test('CM1658 HTTP MCP observe-only complete policy records mismatch without rejecting', async () => {
  await withRecordMemoryStrictAuthEnv({
    CODEX_MEMORY_AGENT_ALIAS: 'Codex',
    CODEX_MEMORY_AGENT_ID: 'codex-desktop',
    CODEX_MEMORY_REQUEST_SOURCE: 'codex-memory-mcp',
    CODEX_MEMORY_PROJECT_ID: 'codex-memory',
    CODEX_MEMORY_WORKSPACE_ID: 'workspace-beta',
    CODEX_MEMORY_CLIENT_ID: 'claude',
    CODEX_MEMORY_RECORD_MEMORY_AUTH_MODE: 'observe',
    CODEX_MEMORY_RECORD_MEMORY_ALLOWED_AGENT_ALIAS: 'Codex',
    CODEX_MEMORY_RECORD_MEMORY_ALLOWED_AGENT_IDS: 'codex-desktop',
    CODEX_MEMORY_RECORD_MEMORY_ALLOWED_REQUEST_SOURCES: 'codex-memory-mcp',
    CODEX_MEMORY_RECORD_MEMORY_ALLOWED_PROJECT_IDS: 'codex-memory',
    CODEX_MEMORY_RECORD_MEMORY_ALLOWED_WORKSPACE_IDS: 'workspace-alpha',
    CODEX_MEMORY_RECORD_MEMORY_ALLOWED_CLIENT_IDS: 'codex'
  }, async () => {
    await withHttpServer(async ({ app, address }) => {
      assert.equal(app.config.recordMemoryPrincipalScopeAuthorization.mode, 'observe');
      assert.equal(app.services.writeService.recordMemoryPrincipalScopeAuthorizationStrictMode, false);

      const initResponse = await fetch(address.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {}
        })
      });
      const sessionId = initResponse.headers.get(SESSION_HEADER);
      assert.ok(sessionId);

      const record = await fetch(address.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
          [SESSION_HEADER]: sessionId
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'record_memory',
            arguments: {
              target: 'process',
              title: 'HTTP env observe-only principal scope mismatch accepted',
              content: 'Type: checkpoint\nrisk: observe mode should not reject trusted context mismatch',
              evidence: 'CM-1658 http env observe-only stage 1 regression',
              validated: true,
              reusable: false,
              sensitivity: 'none',
              project_id: 'codex-memory',
              workspace_id: 'workspace-alpha',
              client_id: 'codex'
            }
          }
        })
      });
      const payload = await record.json();
      const serialized = JSON.stringify(payload);

      assert.equal(record.status, 200);
      assert.equal(payload.result.structuredContent.decision, 'accepted');
      assert.equal(payload.result.structuredContent.principalScopeAuthorization, undefined);
      assert.doesNotMatch(serialized, /workspace-beta/);
      assert.doesNotMatch(serialized, /claude/);
      assert.doesNotMatch(serialized, /principalScopeAuthorization/);
    }, {
      bearerToken: 'test-token'
    });
  });
});

test('HTTP MCP session hardening should expose invalid env fallback warnings', async () => {
  const hardening = createSessionHardeningConfig({
    CODEX_MEMORY_HTTP_SESSION_TTL_MS: 'not-a-number',
    CODEX_MEMORY_HTTP_SESSION_IDLE_TTL_MS: '-1',
    CODEX_MEMORY_HTTP_MAX_SESSIONS: '999',
    CODEX_MEMORY_HTTP_MAX_STREAMS_PER_SESSION: '0',
    CODEX_MEMORY_HTTP_SESSION_CLEANUP_INTERVAL_MS: '1'
  });

  assert.equal(hardening.absoluteTtlMs, 30 * 60 * 1000);
  assert.equal(hardening.idleTtlMs, 10 * 60 * 1000);
  assert.equal(hardening.maxSessions, 64);
  assert.equal(hardening.maxStreamsPerSession, 8);
  assert.equal(hardening.cleanupIntervalMs, 60 * 1000);
  assert.deepEqual(hardening.warnings.map(warning => warning.key), [
    'CODEX_MEMORY_HTTP_SESSION_TTL_MS',
    'CODEX_MEMORY_HTTP_SESSION_IDLE_TTL_MS',
    'CODEX_MEMORY_HTTP_MAX_SESSIONS',
    'CODEX_MEMORY_HTTP_MAX_STREAMS_PER_SESSION',
    'CODEX_MEMORY_HTTP_SESSION_CLEANUP_INTERVAL_MS'
  ]);
  assert.equal(hardening.warnings.some(warning => Object.hasOwn(warning, 'raw')), false);
});

test('HTTP MCP session hardening should reject max sessions plus one with 429', async () => {
  await withHttpServer(async ({ address }) => {
    const first = await fetch(address.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })
    });
    assert.equal(first.status, 200);
    assert.ok(first.headers.get(SESSION_HEADER));

    const second = await fetch(address.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'initialize', params: {} })
    });
    const payload = await second.json();
    assert.equal(second.status, 429);
    assert.equal(payload.error, 'session_limit_exceeded');
    assert.equal(payload.code, 'HTTP_SESSION_LIMIT_EXCEEDED');
    assert.equal(payload.meta.limitType, 'sessions');
    assert.equal(payload.meta.limit, 1);
    assert.equal(JSON.stringify(payload).includes('Bearer'), false);
  }, {
    sessionHardeningEnv: {
      CODEX_MEMORY_HTTP_MAX_SESSIONS: '1',
      CODEX_MEMORY_HTTP_SESSION_CLEANUP_INTERVAL_MS: '10000'
    }
  });
});

test('HTTP MCP session hardening cleanup after expiry should allow new sessions', async () => {
  let currentTime = 0;
  await withHttpServer(async ({ address, httpServer }) => {
    const first = await fetch(address.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })
    });
    assert.equal(first.status, 200);

    currentTime = 6 * 60 * 1000;
    httpServer.cleanupExpiredSessions();

    const second = await fetch(address.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'initialize', params: {} })
    });
    assert.equal(second.status, 200);
    assert.ok(second.headers.get(SESSION_HEADER));
  }, {
    sessionClock: () => currentTime,
    sessionHardeningEnv: {
      CODEX_MEMORY_HTTP_MAX_SESSIONS: '1',
      CODEX_MEMORY_HTTP_SESSION_TTL_MS: String(5 * 60 * 1000),
      CODEX_MEMORY_HTTP_SESSION_IDLE_TTL_MS: String(2 * 60 * 1000),
      CODEX_MEMORY_HTTP_SESSION_CLEANUP_INTERVAL_MS: '10000'
    }
  });
});

test('HTTP MCP session hardening should reject max streams plus one and allow after close', async () => {
  await withHttpServer(async ({ address }) => {
    const first = await fetch(address.url);
    assert.equal(first.status, 200);
    const sessionId = first.headers.get(SESSION_HEADER);
    assert.ok(sessionId);

    const second = await fetch(address.url, { headers: { [SESSION_HEADER]: sessionId } });
    const payload = await second.json();
    assert.equal(second.status, 429);
    assert.equal(payload.error, 'session_stream_limit_exceeded');
    assert.equal(payload.code, 'HTTP_SESSION_STREAM_LIMIT_EXCEEDED');
    assert.equal(payload.meta.limitType, 'streams_per_session');
    assert.equal(payload.meta.limit, 1);

    first.body.cancel();
    await new Promise(resolve => setTimeout(resolve, 10));

    const third = await fetch(address.url, { headers: { [SESSION_HEADER]: sessionId } });
    assert.equal(third.status, 200);
    third.body.cancel();
  }, {
    sessionHardeningEnv: {
      CODEX_MEMORY_HTTP_MAX_STREAMS_PER_SESSION: '1',
      CODEX_MEMORY_HTTP_SESSION_CLEANUP_INTERVAL_MS: '10000'
    }
  });
});

test('HTTP MCP session hardening should expose sanitized warning metadata on health', async () => {
  await withHttpServer(async ({ address }) => {
    const health = await fetch(address.url.replace('/mcp/codex-memory', '/health'), {
      headers: {
        Authorization: 'Bearer test-token'
      }
    });
    const payload = await health.json();
    assert.equal(health.status, 200);
    assert.equal(payload.sessionHardening.maxSessions, 64);
    assert.equal(payload.sessionHardening.warnings[0].key, 'CODEX_MEMORY_HTTP_MAX_SESSIONS');
    assert.equal(Object.hasOwn(payload.sessionHardening.warnings[0], 'raw'), false);
  }, {
    bearerToken: 'test-token',
    sessionHardeningEnv: {
      CODEX_MEMORY_HTTP_MAX_SESSIONS: '999'
    }
  });
});
