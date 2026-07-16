'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  buildConfigOverrides,
  buildReadContext,
  buildWriteContext,
  collectOperationAcceptanceBlockers,
  operationAccepted,
  parseArgs,
  runGovernedVcpNativeAcceptance,
  validateGovernedVcpNativeAcceptanceEvidenceArtifact
} = require('../src/cli/governed-vcp-native-acceptance');

const cliPath = path.join('src', 'cli', 'governed-vcp-native-acceptance.js');
const workspaceRoot = path.resolve(__dirname, '..');

test('acceptance CLI binds Claude identity without changing the public MCP surface', () => {
  const options = parseArgs([
    '--client-id', 'claude',
    '--project-id', 'codex-memory',
    '--workspace-id', 'agents-os',
    '--visibility', 'private'
  ], {});
  const config = buildConfigOverrides(options);
  const context = buildReadContext(options);
  const writeContext = buildWriteContext('record_memory', options);

  assert.equal(options.clientId, 'Claude');
  assert.equal(options.writeContent, 'Low-disclosure governed native bridge acceptance probe.');
  assert.equal(options.writeContent.includes('Codex'), false);
  assert.equal(config.allowedAgentAlias, 'Claude');
  assert.equal(config.defaultClientId, 'Claude');
  assert.equal(context.executionContext.agentAlias, 'Claude');
  assert.equal(context.executionContext.clientId, 'Claude');
  assert.equal(context.executionContext.visibility, 'private');
  assert.equal(writeContext.exactApprovalResult.allowedScope.client_id, 'Claude');
});

test('acceptance CLI rejects unsupported client identities instead of falling back to Codex', () => {
  assert.throws(
    () => parseArgs(['--client-id', 'claud'], {}),
    /invalid_client_id/
  );
  assert.throws(
    () => parseArgs(['--client-id'], {}),
    /invalid_client_id/
  );
  assert.throws(
    () => parseArgs([], { CODEX_MEMORY_CLIENT_ID: 'claud' }),
    /invalid_client_id/
  );
  assert.equal(
    parseArgs(['--client-id', 'Codex'], { CODEX_MEMORY_CLIENT_ID: 'claud' }).clientId,
    'Codex'
  );
  assert.throws(
    () => buildConfigOverrides({ clientId: 'claud' }),
    /invalid_client_id/
  );

  const result = runCli(['--json', '--client-id', 'claud']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /invalid_client_id/);
  assert.equal(result.stdout, '');
});

function runCli(args = []) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: workspaceRoot,
    encoding: 'utf8',
    timeout: 30000
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function testNativeToolDescriptor(name) {
  return {
    name,
    inputSchema: {
      type: 'object',
      _meta: {
        governanceMetadataPath: 'params._meta.codexMemoryGovernance',
        lowDisclosure: true
      }
    },
    _meta: {
      lowDisclosure: true,
      rawOutputAllowed: false,
      readinessClaimed: false
    }
  };
}

function testNativeRuntimeReceipt(publicToolName = 'search_memory', overrides = {}) {
  const write = [
    'record_memory',
    'tombstone_memory',
    'supersede_memory'
  ].includes(publicToolName);
  return {
    nativeRuntimeCalled: true,
    nativeRuntimeInitialized: true,
    providerApiCalled: false,
    memoryReadPerformed: !write,
    memoryWritePerformed: write,
    durableWritePerformed: write,
    durableWriteScope: write ? 'primary_memory_write' : null,
    isolatedRuntimeStoreUsed: false,
    primaryMemoryStoreWritePerformed: write,
    derivedIndexWritePerformed: false,
    rawRuntimeOutputDisclosed: false,
    rawMemoryContentDisclosed: false,
    runtimeLocatorDisclosed: false,
    tokenMaterialDisclosed: false,
    readinessClaimed: false,
    ...overrides
  };
}

function testJsonRpcToolResult(body, structuredContent = { ok: true }, metaOverrides = {}) {
  const publicToolName = body.params?._meta?.codexMemoryGovernance?.invocationProfile?.toolName ||
    'search_memory';
  return {
    jsonrpc: '2.0',
    id: body.id,
    result: {
      structuredContent,
      _meta: {
        codexMemoryNativeRuntimeReceipt: testNativeRuntimeReceipt(publicToolName),
        ...metaOverrides
      }
    }
  };
}

async function withJsonRpcServer(handler, options = {}) {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    const rawBody = await readBody(req);
    const parsedBody = JSON.parse(rawBody);
    requests.push({
      method: req.method,
      headers: req.headers,
      body: parsedBody
    });
    if (parsedBody.method === 'initialize') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        id: parsedBody.id,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: 'codex-memory-governed-vcp-toolbox-native-shim',
            version: '0.0.0'
          },
          capabilities: {
            tools: {
              listChanged: false
            }
          },
          _meta: {
            governanceMetadataPath: 'params._meta.codexMemoryGovernance',
            lowDisclosure: true,
            endpointDisclosed: false,
            tokenMaterialDisclosed: false,
            readinessClaimed: false
          }
        }
      }));
      return;
    }
    if (parsedBody.method === 'tools/list') {
      const toolNames = options.toolNames || [
        'knowledge_base.search',
        'knowledge_base.record',
        'knowledge_base.write',
        'knowledge_base.tombstone',
        'knowledge_base.supersede'
      ];
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        id: parsedBody.id,
        result: {
          tools: toolNames.map(testNativeToolDescriptor),
          _meta: {
            governanceMetadataPath: 'params._meta.codexMemoryGovernance',
            lowDisclosure: true,
            endpointDisclosed: false,
            tokenMaterialDisclosed: false,
            readinessClaimed: false
          }
        }
      }));
      return;
    }
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

function minimalAcceptedReadOperation() {
  return {
    toolName: 'search_memory',
    accepted: true,
    delegated: true,
    access: {
      runtimeCalled: true,
      vcpToolBoxCalled: true,
      mcpToolCalled: true,
      memoryReadPerformed: true,
      memoryWritePerformed: false,
      localMemoryFallbackUsed: false,
      rawOutputReturned: false,
      tokenMaterialReturned: false
    },
    receipt: {
      runtimeTargetBound: true,
      clientIdentityBound: true,
      scopeBoundaryBound: true,
      visibilityBound: true,
      invocationProfileBound: true,
      readAllowed: true,
      writeAllowed: false,
      writeRequiresExactApproval: false,
      outputDisclosureBudgetBound: true,
      rawOutputAllowed: false,
      auditReceiptLowDisclosureBound: true,
      nativeInvocation: {
        statusClass: 'success',
        requestIdCategory: 'generated_bridge_request_id',
        jsonRpcResponseIdMatched: true,
        governanceMetadataSent: true,
        governanceMetadataPath: 'params._meta.codexMemoryGovernance',
        jsonRpcErrorPresent: false,
        nativeRuntimeReceiptPresent: true,
        nativeRuntimeCalled: true,
        nativeRuntimeInitialized: true,
        nativeProviderApiCalled: false,
        nativeMemoryReadPerformed: true,
        nativeMemoryWritePerformed: false,
        nativeDurableWritePerformed: false,
        nativeDurableWriteScope: null,
        nativeIsolatedRuntimeStoreUsed: false,
        nativePrimaryMemoryStoreWritePerformed: false,
        nativeDerivedIndexWritePerformed: false,
        nativeRawRuntimeOutputDisclosed: false,
        nativeRawMemoryContentDisclosed: false,
        nativeRuntimeLocatorDisclosed: false,
        nativeRuntimeTokenMaterialDisclosed: false,
        nativeRuntimeReadinessClaimed: false
      },
      localAuditReceipt: {
        appended: true,
        lowDisclosure: true
      },
      rollbackPostureBound: true,
      rollbackPlanBound: false,
      rollbackRequired: false,
      rollbackDisposition: 'no_runtime_write_to_rollback',
      rollbackFollowupRequired: false,
      rollbackApplyPolicy: 'not_applicable',
      rollbackApplyAttempted: false,
      rollbackAutoApplyAllowed: false,
      rollbackRawPlanDisclosed: false,
      rollbackRawPlanPersisted: false,
      localMemoryPrimaryRuntime: false,
      localMemoryFallbackUsed: false,
      localMemoryResultReturned: false,
      localMemoryResultCanBeMistakenForVcpNative: false,
      localMemoryRawContentDisclosed: false
    }
  };
}

function minimalAcceptedEvidenceArtifact() {
  return {
    schemaVersion: 'codex_memory_governed_vcp_native_acceptance_evidence_v1',
    artifactKind: 'low_disclosure_governed_vcp_native_acceptance',
    accepted: true,
    status: 'accepted',
    summary: {
      accepted: true,
      status: 'accepted',
      primaryRuntime: 'VCPToolBox native memory',
      accessPath: 'governed MCP tools',
      selectedOperationKeys: ['read'],
      readinessClaimed: false,
      acceptanceBlockers: { count: 0 },
      governanceEvidenceMatrix: Object.fromEntries([
        'client_id',
        'scope',
        'visibility',
        'runtime_target',
        'invocation_profile',
        'read_write_authority',
        'output_disclosure_budget',
        'audit_receipt',
        'rollback_posture'
      ].map(key => [key, {
        covered: true,
        lowDisclosure: true,
        rawValueDisclosed: false,
        endpointDisclosed: false,
        tokenMaterialDisclosed: false
      }])),
      localMemoryAuxiliaryEvidence: {
        primaryRuntime: false,
        fallbackUsed: false,
        localMemoryPrimaryRuntime: false,
        localMemoryResultCanBeMistakenForVcpNative: false,
        localMemoryRawContentDisclosed: false,
        rawLocalMemoryDisclosed: false,
        localFilesystemPathDisclosed: false,
        lowDisclosure: true
      },
      nativeMcpTargetPreflightEvidence: {
        included: true,
        lowDisclosure: true,
        initializeAttempted: true,
        initializeAccepted: true,
        toolsListAttempted: true,
        toolsListAccepted: true,
        toolsCapabilityListed: true,
        governanceMetadataPathBound: true,
        readNativeToolPresent: true,
        recordNativeToolPresent: false,
        writeAliasNativeToolPresent: false,
        tombstoneNativeToolPresent: false,
        supersedeNativeToolPresent: false,
        requiredNativeToolsPresent: true,
        unexpectedNativeToolsPresent: false,
        writeToolsExpected: false,
        writeSuiteExpected: false,
        writeToolsExposed: false,
        reasonCode: null,
        targetRuntimeCategory: 'VCPToolBox native memory',
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
      },
      nativeRuntimePreconditionEvidence: {
        included: true,
        lowDisclosure: true,
        nativeRuntimePreconditionsSatisfied: true,
        nativeJsonRpcErrorObserved: false,
        nativeRuntimeCallFailed: false,
        reasonCodes: [],
        operatorActionCategory: null,
        runtimeCalled: true,
        vcpToolBoxCalled: true,
        mcpToolCalled: true,
        governanceMetadataSent: true,
        governanceMetadataPathBound: true,
        nativeRuntimeReceiptBound: true,
        nativeRuntimeCalledFromReceipt: true,
        nativeRuntimeInitializedFromReceipt: true,
        nativeProviderApiCalledFromReceipt: false,
        nativeMemoryReadPerformedFromReceipt: true,
        nativeMemoryWritePerformedFromReceipt: false,
        nativeDurableWritePerformedFromReceipt: false,
        readNativeIsolatedDerivedIndexWritePerformedFromReceipt: false,
        readNativeNonIsolatedDurableWritePerformedFromReceipt: false,
        nativePrimaryMemoryStoreWritePerformedFromReceipt: false,
        nativeRawRuntimeOutputDisclosed: false,
        nativeRawMemoryContentDisclosed: false,
        nativeRuntimeLocatorDisclosed: false,
        nativeRuntimeTokenMaterialDisclosed: false,
        nativeRuntimeReadinessClaimed: false,
        rollbackPostureBound: true,
        rollbackRequired: false,
        rollbackFollowupRequired: false,
        rollbackApplyAttempted: false,
        rollbackAutoApplyAllowed: false,
        rollbackRawPlanDisclosed: false,
        rollbackRawPlanPersisted: false,
        rollbackDispositions: ['no_runtime_write_to_rollback'],
        rollbackOperatorActionCategory: null,
        operatorFollowupPacket: {
          included: false,
          packetKind: null,
          lowDisclosure: true,
          actionCategory: null,
          reasonCodes: [],
          targetRuntimeCategory: null,
          operatorReviewRequired: false,
          bridgeConfigEnvReadAllowed: false,
          bridgeProviderApiCallAllowed: false,
          bridgeRuntimeMutationAllowed: false,
          bridgeRollbackApplyAllowed: false,
          bridgeMayClaimReadiness: false,
          exactApprovalRequiredForRuntimeChange: false,
          requiredEvidenceCategory: null,
          endpointDisclosed: false,
          tokenMaterialDisclosed: false,
          rawErrorDisclosed: false,
          rawConfigDisclosed: false,
          readinessClaimed: false
        },
        rawErrorDisclosed: false,
        rawResponseBodyDisclosed: false,
        endpointDisclosed: false,
        tokenMaterialDisclosed: false,
        configEnvRead: false,
        providerApiCalledByAcceptance: false,
        readinessClaimed: false
      }
    },
    config: {
      governedMcpVcpNativeRuntimeTarget: { accepted: true },
      governedMcpVcpNativeHttpMcpTarget: { accepted: true }
    },
    operations: {
      read: minimalAcceptedReadOperation()
    },
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

// Native-read acceptance resumes only after diary_allowlist_v1 supplies the
// trusted scope-filtering proof. Gate 0 intentionally makes these paths unreachable.
test.skip('governed VCP native acceptance CLI runs read and write through full governed bridge without disclosure', async () => {
  const secretToken = 'SECRET_TOKEN_SHOULD_NOT_APPEAR';
  const server = await withJsonRpcServer(async (req, res, body) => {
    assert.equal(req.headers.authorization, `Bearer ${secretToken}`);
    assert.equal(body.method, 'tools/call');
    assert.equal(body.params._meta.codexMemoryGovernance.governanceTransport.metadataPath, 'params._meta.codexMemoryGovernance');
    const publicToolName = body.params._meta.codexMemoryGovernance.invocationProfile.toolName;

    if (publicToolName === 'search_memory' && !body.params.arguments.governed_bridge) {
      assert.equal(body.params.name, 'knowledge_base.search');
      assert.equal(body.params._meta.codexMemoryGovernance.readWriteAuthority.readAllowed, true);
      assert.equal(body.params._meta.codexMemoryGovernance.readWriteAuthority.writeAllowed, false);
    } else if (publicToolName === 'search_memory') {
      assert.equal(body.params.name, 'knowledge_base.search');
      assert.equal(body.params._meta.codexMemoryGovernance.readWriteAuthority.readAllowed, true);
      assert.equal(body.params._meta.codexMemoryGovernance.readWriteAuthority.writeAllowed, false);
      assert.equal(body.params.arguments.governed_bridge.client_id, 'Codex');
      assert.equal(body.params.arguments.governed_bridge.runtime_target.primary_runtime, 'VCPToolBox native memory');
    } else if (publicToolName === 'record_memory') {
      assert.equal(body.params.name, 'knowledge_base.record');
      assert.equal(body.params._meta.codexMemoryGovernance.readWriteAuthority.writeAllowed, true);
      assert.equal(body.params._meta.codexMemoryGovernance.exactApprovalResult.allowedAction, 'live_bridge_record_memory_proof');
      assert.equal(body.params._meta.codexMemoryGovernance.exactApprovalResult.rollbackPlanMatched, true);
      assert.equal(body.params._meta.codexMemoryGovernance.rollbackPosture.rollback_plan_ref, 'cm-governed-write-rollback-plan');
      assert.equal(body.params.arguments.governed_bridge.invocation_profile, 'governed_bounded_write');
      assert.equal(body.params.arguments.governed_bridge.rollback_plan_reference_safe, true);
    } else {
      assert.fail(`unexpected public tool ${publicToolName}`);
    }

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(testJsonRpcToolResult(body)));
  });
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-native-acceptance-'));
  const evidenceOutputPath = path.join(tempBasePath, 'evidence', 'governed-native-acceptance.json');

  try {
    const result = await runGovernedVcpNativeAcceptance({
      includeWrite: true,
      endpoint: server.url,
      bearerToken: secretToken,
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      toolNameByAction: JSON.stringify({
        search_memory: 'knowledge_base.search',
        record_memory: 'knowledge_base.record'
      }),
      projectBasePath: tempBasePath,
      dataDir: path.join(tempBasePath, 'data'),
      logsDir: path.join(tempBasePath, 'logs'),
      projectId: 'codex-memory',
      workspaceId: 'workspace-alpha',
      scopeId: 'scope-alpha',
      visibility: 'shared',
      query: 'acceptance read',
      writeTitle: 'acceptance write',
      writeContent: 'acceptance write body',
      writeEvidence: 'acceptance evidence',
      evidenceOutputPath
    });
    const serialized = JSON.stringify(result);
    const artifact = JSON.parse(await fs.readFile(evidenceOutputPath, 'utf8'));
    const serializedArtifact = JSON.stringify(artifact);

    assert.equal(result.accepted, true);
    assert.equal(result.status, 'accepted');
    assert.equal(result.summary.governedDimensions.clientId, true);
    assert.equal(result.summary.governedDimensions.scope, true);
    assert.equal(result.summary.governedDimensions.visibility, true);
    assert.equal(result.summary.governedDimensions.scopeVisibility, true);
    assert.equal(result.summary.governedDimensions.runtimeTarget, true);
    assert.equal(result.summary.governedDimensions.invocationProfile, true);
    assert.equal(result.summary.governedDimensions.readWriteAuthority, true);
    assert.equal(result.summary.governedDimensions.outputDisclosureBudget, true);
    assert.equal(result.summary.governedDimensions.auditReceipt, true);
    assert.equal(result.summary.governedDimensions.rollbackPosture, true);
    assert.deepEqual(Object.keys(result.summary.governanceEvidenceMatrix).sort(), [
      'audit_receipt',
      'client_id',
      'invocation_profile',
      'output_disclosure_budget',
      'read_write_authority',
      'rollback_posture',
      'runtime_target',
      'scope',
      'visibility'
    ]);
    for (const evidence of Object.values(result.summary.governanceEvidenceMatrix)) {
      assert.equal(evidence.covered, true);
      assert.equal(evidence.lowDisclosure, true);
      assert.equal(evidence.rawValueDisclosed, false);
      assert.equal(evidence.endpointDisclosed, false);
      assert.equal(evidence.tokenMaterialDisclosed, false);
      assert.equal(Array.isArray(evidence.evidenceFields), true);
    }
    assert.equal(result.summary.localMemoryRole.primaryRuntime, false);
    assert.equal(result.summary.localMemoryRole.fallbackUsed, false);
    assert.equal(result.summary.localMemoryAuxiliaryEvidence.primaryRuntime, false);
    assert.deepEqual(result.summary.localMemoryAuxiliaryEvidence.allowedAuxiliaryRoles, [
      'fallback',
      'audit',
      'validation fixture',
      'compatibility',
      'offline continuity'
    ]);
    assert.deepEqual(result.summary.localMemoryAuxiliaryEvidence.activeAuxiliaryRoles, ['audit']);
    assert.equal(result.summary.localMemoryAuxiliaryEvidence.fallbackUsed, false);
    assert.equal(result.summary.localMemoryAuxiliaryEvidence.auditReceiptOnly, true);
    assert.equal(result.summary.localMemoryAuxiliaryEvidence.localMemoryPrimaryRuntime, false);
    assert.equal(result.summary.localMemoryAuxiliaryEvidence.localMemoryResultReturned, false);
    assert.equal(result.summary.localMemoryAuxiliaryEvidence.localMemoryResultCanBeMistakenForVcpNative, false);
    assert.equal(result.summary.localMemoryAuxiliaryEvidence.localMemoryRawContentDisclosed, false);
    assert.equal(result.summary.localMemoryAuxiliaryEvidence.rawLocalMemoryDisclosed, false);
    assert.equal(result.summary.localMemoryAuxiliaryEvidence.localFilesystemPathDisclosed, false);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.lowDisclosure, true);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.nativeRuntimePreconditionsSatisfied, true);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.nativeJsonRpcErrorObserved, false);
    assert.deepEqual(result.summary.nativeRuntimePreconditionEvidence.reasonCodes, []);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.rawErrorDisclosed, false);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.configEnvRead, false);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.providerApiCalledByAcceptance, false);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.rollbackPostureBound, true);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.rollbackRequired, false);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.rollbackFollowupRequired, false);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.rollbackApplyAttempted, false);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.rollbackAutoApplyAllowed, false);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.rollbackRawPlanDisclosed, false);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.rollbackRawPlanPersisted, false);
    assert.deepEqual(result.summary.nativeRuntimePreconditionEvidence.rollbackDispositions, [
      'no_rollback_required',
      'no_runtime_write_to_rollback'
    ]);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.operatorFollowupPacket.included, false);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.operatorFollowupPacket.lowDisclosure, true);
    assert.equal(
      result.summary.nativeRuntimePreconditionEvidence.operatorFollowupPacket.bridgeConfigEnvReadAllowed,
      false
    );
    assert.equal(
      result.summary.nativeRuntimePreconditionEvidence.operatorFollowupPacket.bridgeProviderApiCallAllowed,
      false
    );
    assert.equal(
      result.summary.nativeRuntimePreconditionEvidence.operatorFollowupPacket.bridgeRuntimeMutationAllowed,
      false
    );
    assert.equal(
      result.summary.nativeRuntimePreconditionEvidence.operatorFollowupPacket.bridgeMayClaimReadiness,
      false
    );
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.readinessClaimed, false);
    assert.equal(result.summary.nativeMcpTargetPreflightEvidence.lowDisclosure, true);
    assert.equal(result.summary.nativeMcpTargetPreflightEvidence.initializeAccepted, true);
    assert.equal(result.summary.nativeMcpTargetPreflightEvidence.toolsListAccepted, true);
    assert.equal(result.summary.nativeMcpTargetPreflightEvidence.toolsCapabilityListed, true);
    assert.equal(result.summary.nativeMcpTargetPreflightEvidence.governanceMetadataPathBound, true);
    assert.equal(result.summary.nativeMcpTargetPreflightEvidence.readNativeToolPresent, true);
    assert.equal(result.summary.nativeMcpTargetPreflightEvidence.requiredNativeToolsPresent, true);
    assert.equal(result.summary.nativeMcpTargetPreflightEvidence.writeToolsExpected, true);
    assert.equal(result.summary.nativeMcpTargetPreflightEvidence.writeToolsExposed, true);
    assert.equal(result.summary.nativeMcpTargetPreflightEvidence.rawToolNamesDisclosed, false);
    assert.equal(result.summary.nativeMcpTargetPreflightEvidence.rawToolSchemaDisclosed, false);
    assert.equal(result.summary.nativeMcpTargetPreflightEvidence.rawResponseBodyDisclosed, false);
    assert.equal(result.summary.nativeMcpTargetPreflightEvidence.endpointDisclosed, false);
    assert.equal(result.summary.nativeMcpTargetPreflightEvidence.tokenMaterialDisclosed, false);
    assert.equal(result.summary.nativeMcpTargetPreflightEvidence.nativeRuntimeCalled, false);
    assert.equal(result.summary.nativeMcpTargetPreflightEvidence.readinessClaimed, false);
    assert.equal(result.summary.acceptanceBlockers.count, 0);
    assert.deepEqual(result.summary.acceptanceBlockers.all, []);
    assert.equal(result.operations.read.access.memoryReadPerformed, true);
    assert.equal(result.operations.read.access.memoryWritePerformed, false);
    assert.equal(result.operations.write.access.memoryReadPerformed, false);
    assert.equal(result.operations.write.access.memoryWritePerformed, true);
    assert.equal(result.operations.read.receipt.nativeInvocation.toolName, 'search_memory');
    assert.equal(result.operations.write.receipt.nativeInvocation.toolName, 'record_memory');
    assert.equal(result.operations.write.receipt.rollbackPlanBound, true);
    assert.equal(result.operations.write.receipt.rollbackRequired, false);
    assert.equal(result.operations.write.receipt.rollbackDisposition, 'no_rollback_required');
    assert.equal(result.operations.write.receipt.rollbackFollowupRequired, false);
    assert.equal(result.operations.write.receipt.rollbackApplyPolicy, 'not_applicable');
    assert.equal(result.operations.write.receipt.rollbackApplyAttempted, false);
    assert.equal(result.operations.write.receipt.rollbackAutoApplyAllowed, false);
    assert.equal(result.operations.write.receipt.rollbackRawPlanDisclosed, false);
    assert.equal(result.operations.write.receipt.rollbackRawPlanPersisted, false);
    assert.equal(result.summary.writeRollbackEvidence.included, true);
    assert.equal(result.summary.writeRollbackEvidence.lowDisclosure, true);
    assert.equal(result.summary.writeRollbackEvidence.rollbackPlanBound, true);
    assert.equal(result.summary.writeRollbackEvidence.rollbackRequired, false);
    assert.equal(result.summary.writeRollbackEvidence.rollbackApplyPolicy, 'not_applicable');
    assert.equal(result.summary.writeRollbackEvidence.rollbackPlanReferenceDisclosed, false);
    assert.equal(result.summary.writeRollbackEvidence.rawRollbackPlanReturned, false);
    assert.equal(result.operations.read.receipt.localAuditReceipt.appended, true);
    assert.equal(result.operations.write.receipt.localAuditReceipt.appended, true);
    assert.equal(result.evidenceArtifact.requested, true);
    assert.equal(result.evidenceArtifact.written, true);
    assert.equal(result.evidenceArtifact.outputPathDisclosed, false);
    assert.equal(artifact.schemaVersion, 'codex_memory_governed_vcp_native_acceptance_evidence_v1');
    assert.equal(artifact.accepted, true);
    assert.deepEqual(validateGovernedVcpNativeAcceptanceEvidenceArtifact(artifact), {
      valid: true,
      status: 'valid_low_disclosure_evidence',
      blockers: [],
      acceptedEvidence: true,
      lowDisclosure: true,
      readinessClaimed: false
    });
    assert.equal(artifact.summary.governedDimensions.auditReceipt, true);
    assert.equal(artifact.summary.governedDimensions.rollbackPosture, true);
    assert.equal(artifact.summary.governanceEvidenceMatrix.client_id.covered, true);
    assert.equal(artifact.summary.governanceEvidenceMatrix.client_id.rawValueDisclosed, false);
    assert.equal(artifact.summary.localMemoryAuxiliaryEvidence.primaryRuntime, false);
    assert.deepEqual(artifact.summary.localMemoryAuxiliaryEvidence.activeAuxiliaryRoles, ['audit']);
    assert.equal(artifact.summary.nativeMcpTargetPreflightEvidence.initializeAccepted, true);
    assert.equal(artifact.summary.nativeMcpTargetPreflightEvidence.toolsListAccepted, true);
    assert.equal(artifact.summary.nativeMcpTargetPreflightEvidence.endpointDisclosed, false);
    assert.equal(artifact.summary.nativeRuntimePreconditionEvidence.nativeRuntimePreconditionsSatisfied, true);
    assert.equal(artifact.summary.nativeRuntimePreconditionEvidence.rawErrorDisclosed, false);
    assert.equal(artifact.disclosure.outputPathDisclosed, false);
    assert.equal(serialized.includes(server.url), false);
    assert.equal(serialized.includes(secretToken), false);
    assert.equal(serialized.includes(evidenceOutputPath), false);
    assert.equal(serializedArtifact.includes(server.url), false);
    assert.equal(serializedArtifact.includes(secretToken), false);
    assert.equal(serializedArtifact.includes(evidenceOutputPath), false);
    assert.equal(result.config.httpMcpTarget.endpointDisclosed, false);
    assert.equal(result.config.httpMcpTarget.tokenMaterialDisclosed, false);
    assert.equal(server.requests.filter(request => request.body.method === 'tools/call').length, 2);
  } finally {
    await server.close();
  }
});

test.skip('governed VCP native acceptance CLI rejects search-shaped read-suite acceptance maps', async () => {
  const server = await withJsonRpcServer(async (req, res, body) => {
    assert.equal(body.method, 'tools/call');
    assert.ok(['knowledge_base.search', 'memory_overview', 'audit_memory'].includes(body.params.name));
    assert.equal(body.params._meta.codexMemoryGovernance.governanceTransport.metadataPath, 'params._meta.codexMemoryGovernance');
    assert.equal(body.params._meta.codexMemoryGovernance.readWriteAuthority.readAllowed, true);
    assert.equal(body.params._meta.codexMemoryGovernance.readWriteAuthority.writeAllowed, false);

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(testJsonRpcToolResult(body)));
  });
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-native-read-suite-'));
  const evidenceOutputPath = path.join(tempBasePath, 'evidence', 'governed-native-read-suite.json');

  try {
    const result = await runGovernedVcpNativeAcceptance({
      includeReadSuite: true,
      endpoint: server.url,
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      projectBasePath: tempBasePath,
      dataDir: path.join(tempBasePath, 'data'),
      logsDir: path.join(tempBasePath, 'logs'),
      projectId: 'codex-memory',
      workspaceId: 'workspace-alpha',
      scopeId: 'scope-alpha',
      visibility: 'shared',
      query: 'acceptance read suite',
      toolNameByAction: JSON.stringify({
        search_memory: 'knowledge_base.search',
        memory_overview: 'knowledge_base.search',
        audit_memory: 'knowledge_base.search'
      }),
      evidenceOutputPath
    });
    const serialized = JSON.stringify(result);
    const artifact = JSON.parse(await fs.readFile(evidenceOutputPath, 'utf8'));
    const publicToolNames = server.requests
      .filter(request => request.body.method === 'tools/call')
      .map(request =>
      request.body.params._meta.codexMemoryGovernance.invocationProfile.toolName
    );
    const nativeToolNames = server.requests
      .filter(request => request.body.method === 'tools/call')
      .map(request => request.body.params.name);

    assert.equal(result.accepted, false);
    assert.equal(result.status, 'not_accepted');
    assert.deepEqual(result.summary.selectedOperations, [
      'search_memory',
      'memory_overview',
      'audit_memory'
    ]);
    assert.deepEqual(result.summary.selectedOperationKeys, [
      'read',
      'memoryOverview',
      'audit'
    ]);
    assert.ok(result.summary.acceptanceBlockers.all.includes('native_mcp_required_tool_missing'));
    assert.equal(result.summary.nativeMcpTargetPreflightEvidence.initializeAccepted, true);
    assert.equal(result.summary.nativeMcpTargetPreflightEvidence.toolsListAccepted, true);
    assert.equal(result.summary.nativeMcpTargetPreflightEvidence.requiredNativeToolsPresent, false);
    assert.equal(result.operations.memoryOverview.access.memoryReadPerformed, true);
    assert.equal(result.operations.audit.access.memoryReadPerformed, true);
    assert.deepEqual(nativeToolNames, [
      'knowledge_base.search',
      'knowledge_base.search',
      'knowledge_base.search'
    ]);
    assert.equal(publicToolNames.includes('search_memory'), true);
    assert.equal(publicToolNames.includes('memory_overview'), true);
    assert.equal(publicToolNames.includes('audit_memory'), true);
    assert.ok(artifact.summary.acceptanceBlockers.all.includes('native_mcp_required_tool_missing'));
    assert.equal(serialized.includes(server.url), false);
    assert.equal(JSON.stringify(artifact).includes(server.url), false);
  } finally {
    await server.close();
  }
});

test.skip('governed VCP native acceptance CLI can prove read suite with default shape-compatible native tools', async () => {
  const server = await withJsonRpcServer(async (req, res, body) => {
    assert.equal(body.method, 'tools/call');
    assert.ok(['knowledge_base.search', 'memory_overview', 'audit_memory'].includes(body.params.name));
    assert.equal(body.params._meta.codexMemoryGovernance.governanceTransport.metadataPath, 'params._meta.codexMemoryGovernance');
    assert.equal(body.params._meta.codexMemoryGovernance.readWriteAuthority.readAllowed, true);
    assert.equal(body.params._meta.codexMemoryGovernance.readWriteAuthority.writeAllowed, false);

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(testJsonRpcToolResult(body)));
  }, {
    toolNames: [
      'knowledge_base.search',
      'memory_overview',
      'audit_memory'
    ]
  });
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-native-read-suite-'));
  const evidenceOutputPath = path.join(tempBasePath, 'evidence', 'governed-native-read-suite.json');

  try {
    const result = await runGovernedVcpNativeAcceptance({
      includeReadSuite: true,
      endpoint: server.url,
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      projectBasePath: tempBasePath,
      dataDir: path.join(tempBasePath, 'data'),
      logsDir: path.join(tempBasePath, 'logs'),
      projectId: 'codex-memory',
      workspaceId: 'workspace-alpha',
      scopeId: 'scope-alpha',
      visibility: 'shared',
      query: 'acceptance read suite',
      evidenceOutputPath
    });
    const artifact = JSON.parse(await fs.readFile(evidenceOutputPath, 'utf8'));
    const nativeToolNames = server.requests
      .filter(request => request.body.method === 'tools/call')
      .map(request => request.body.params.name);

    assert.equal(result.accepted, true);
    assert.equal(result.status, 'accepted');
    assert.deepEqual(result.summary.selectedOperations, [
      'search_memory',
      'memory_overview',
      'audit_memory'
    ]);
    assert.equal(result.summary.acceptanceBlockers.count, 0);
    assert.equal(result.summary.nativeMcpTargetPreflightEvidence.requiredNativeToolsPresent, true);
    assert.deepEqual(nativeToolNames, ['knowledge_base.search', 'memory_overview', 'audit_memory']);
    assert.equal(artifact.summary.acceptanceBlockers.count, 0);
    assert.equal(JSON.stringify(result).includes(server.url), false);
    assert.equal(JSON.stringify(artifact).includes(server.url), false);
  } finally {
    await server.close();
  }
});

test.skip('governed VCP native acceptance allows isolated derived-index writes during native read', async () => {
  const server = await withJsonRpcServer(async (req, res, body) => {
    assert.equal(body.method, 'tools/call');
    assert.equal(body.params.name, 'knowledge_base.search');
    const publicToolName = body.params._meta.codexMemoryGovernance.invocationProfile.toolName;
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(testJsonRpcToolResult(body, { ok: true, results: [] }, {
      codexMemoryNativeRuntimeReceipt: testNativeRuntimeReceipt(publicToolName, {
        durableWritePerformed: true,
        durableWriteScope: 'isolated_derived_index',
        isolatedRuntimeStoreUsed: true,
        primaryMemoryStoreWritePerformed: false,
        derivedIndexWritePerformed: true
      })
    })));
  });
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-native-isolated-read-'));

  try {
    const result = await runGovernedVcpNativeAcceptance({
      endpoint: server.url,
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      projectBasePath: tempBasePath,
      dataDir: path.join(tempBasePath, 'data'),
      logsDir: path.join(tempBasePath, 'logs'),
      projectId: 'codex-memory',
      workspaceId: 'workspace-alpha',
      scopeId: 'scope-alpha',
      visibility: 'shared',
      query: 'acceptance isolated native read'
    });

    assert.equal(result.accepted, true);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.nativeDurableWritePerformedFromReceipt, true);
    assert.equal(
      result.summary.nativeRuntimePreconditionEvidence.readNativeIsolatedDerivedIndexWritePerformedFromReceipt,
      true
    );
    assert.equal(
      result.summary.nativeRuntimePreconditionEvidence.readNativeNonIsolatedDurableWritePerformedFromReceipt,
      false
    );
    assert.equal(
      result.summary.nativeRuntimePreconditionEvidence.nativePrimaryMemoryStoreWritePerformedFromReceipt,
      false
    );
    assert.equal(result.summary.acceptanceBlockers.count, 0);
    assert.equal(JSON.stringify(result).includes(server.url), false);
  } finally {
    await server.close();
  }
});

test.skip('governed VCP native acceptance reports whitelisted native JSON-RPC error reasons without raw disclosure', async () => {
  const rawErrorMessage = 'RAW_NATIVE_JSONRPC_FAILURE_SHOULD_NOT_ECHO';
  const rawUnsafeDetail = 'PRIVATE_NATIVE_JSONRPC_DETAIL_SHOULD_NOT_ECHO';
  const server = await withJsonRpcServer(async (req, res, body) => {
    assert.equal(body.method, 'tools/call');
    assert.equal(body.params.name, 'knowledge_base.search');

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      id: body.id,
      error: {
        code: -32000,
        message: rawErrorMessage,
        data: {
          reasonCode: 'native_runtime_call_failed',
          detail: rawUnsafeDetail
        }
      }
    }));
  });
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-native-jsonrpc-failure-'));
  const evidenceOutputPath = path.join(tempBasePath, 'evidence', 'governed-native-jsonrpc-failure.json');

  try {
    const result = await runGovernedVcpNativeAcceptance({
      endpoint: server.url,
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      projectBasePath: tempBasePath,
      dataDir: path.join(tempBasePath, 'data'),
      logsDir: path.join(tempBasePath, 'logs'),
      projectId: 'codex-memory',
      workspaceId: 'workspace-alpha',
      scopeId: 'scope-alpha',
      visibility: 'shared',
      query: 'acceptance read jsonrpc failure',
      evidenceOutputPath
    });
    const artifact = JSON.parse(await fs.readFile(evidenceOutputPath, 'utf8'));
    const serialized = JSON.stringify(result);
    const serializedArtifact = JSON.stringify(artifact);

    assert.equal(result.accepted, false);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.lowDisclosure, true);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.nativeRuntimePreconditionsSatisfied, false);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.nativeJsonRpcErrorObserved, true);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.nativeRuntimeCallFailed, true);
    assert.deepEqual(result.summary.nativeRuntimePreconditionEvidence.reasonCodes, [
      'native_runtime_call_failed'
    ]);
    assert.equal(
      result.summary.nativeRuntimePreconditionEvidence.operatorActionCategory,
      'native_runtime_precondition_check_required'
    );
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.rawErrorDisclosed, false);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.rawResponseBodyDisclosed, false);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.endpointDisclosed, false);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.tokenMaterialDisclosed, false);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.configEnvRead, false);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.providerApiCalledByAcceptance, false);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.rollbackPostureBound, true);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.rollbackRequired, false);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.rollbackFollowupRequired, false);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.rollbackApplyAttempted, false);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.rollbackAutoApplyAllowed, false);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.rollbackRawPlanDisclosed, false);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.rollbackRawPlanPersisted, false);
    assert.deepEqual(result.summary.nativeRuntimePreconditionEvidence.rollbackDispositions, [
      'no_runtime_write_to_rollback'
    ]);
    assert.equal(
      result.summary.nativeRuntimePreconditionEvidence.rollbackOperatorActionCategory,
      'operator_runtime_precondition_followup_required'
    );
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.operatorFollowupPacket.included, true);
    assert.equal(
      result.summary.nativeRuntimePreconditionEvidence.operatorFollowupPacket.packetKind,
      'native_runtime_precondition_followup'
    );
    assert.equal(
      result.summary.nativeRuntimePreconditionEvidence.operatorFollowupPacket.actionCategory,
      'native_runtime_precondition_check_required'
    );
    assert.deepEqual(result.summary.nativeRuntimePreconditionEvidence.operatorFollowupPacket.reasonCodes, [
      'native_runtime_call_failed'
    ]);
    assert.equal(
      result.summary.nativeRuntimePreconditionEvidence.operatorFollowupPacket.targetRuntimeCategory,
      'VCPToolBox native memory'
    );
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.operatorFollowupPacket.operatorReviewRequired, true);
    assert.equal(
      result.summary.nativeRuntimePreconditionEvidence.operatorFollowupPacket.bridgeConfigEnvReadAllowed,
      false
    );
    assert.equal(
      result.summary.nativeRuntimePreconditionEvidence.operatorFollowupPacket.bridgeProviderApiCallAllowed,
      false
    );
    assert.equal(
      result.summary.nativeRuntimePreconditionEvidence.operatorFollowupPacket.bridgeRuntimeMutationAllowed,
      false
    );
    assert.equal(
      result.summary.nativeRuntimePreconditionEvidence.operatorFollowupPacket.bridgeRollbackApplyAllowed,
      false
    );
    assert.equal(
      result.summary.nativeRuntimePreconditionEvidence.operatorFollowupPacket.bridgeMayClaimReadiness,
      false
    );
    assert.equal(
      result.summary.nativeRuntimePreconditionEvidence.operatorFollowupPacket.exactApprovalRequiredForRuntimeChange,
      true
    );
    assert.equal(
      result.summary.nativeRuntimePreconditionEvidence.operatorFollowupPacket.requiredEvidenceCategory,
      'fresh_governed_native_acceptance_after_operator_runtime_precondition_change'
    );
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.operatorFollowupPacket.rawConfigDisclosed, false);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.operatorFollowupPacket.rawErrorDisclosed, false);
    assert.equal(result.summary.nativeRuntimePreconditionEvidence.readinessClaimed, false);
    assert.equal(result.operations.read.receipt.nativeInvocation.jsonRpcErrorPresent, true);
    assert.equal(
      result.operations.read.receipt.nativeInvocation.jsonRpcErrorReasonCode,
      'native_runtime_call_failed'
    );
    assert.equal(
      artifact.operations.read.receipt.nativeInvocation.jsonRpcErrorReasonCode,
      'native_runtime_call_failed'
    );
    assert.deepEqual(artifact.summary.nativeRuntimePreconditionEvidence.reasonCodes, [
      'native_runtime_call_failed'
    ]);
    assert.deepEqual(artifact.summary.nativeRuntimePreconditionEvidence.operatorFollowupPacket.reasonCodes, [
      'native_runtime_call_failed'
    ]);
    assert.equal(artifact.summary.nativeRuntimePreconditionEvidence.rawErrorDisclosed, false);
    assert.equal(result.summary.acceptanceBlockers.all.includes('read_native_json_rpc_error_present'), true);
    assert.equal(
      result.summary.acceptanceBlockers.all.includes(
        'read_native_json_rpc_error_reason_native_runtime_call_failed'
      ),
      true
    );
    assert.equal(
      artifact.summary.acceptanceBlockers.all.includes(
        'read_native_json_rpc_error_reason_native_runtime_call_failed'
      ),
      true
    );
    assert.equal(serialized.includes(server.url), false);
    assert.equal(serialized.includes(rawErrorMessage), false);
    assert.equal(serialized.includes(rawUnsafeDetail), false);
    assert.equal(serializedArtifact.includes(server.url), false);
    assert.equal(serializedArtifact.includes(rawErrorMessage), false);
    assert.equal(serializedArtifact.includes(rawUnsafeDetail), false);
  } finally {
    await server.close();
  }
});

test.skip('governed VCP native acceptance CLI can prove the governed lifecycle write suite', async () => {
  const server = await withJsonRpcServer(async (req, res, body) => {
    const governance = body.params._meta.codexMemoryGovernance;
    const publicToolName = governance.invocationProfile.toolName;
    const expectedNativeNames = {
      search_memory: 'knowledge_base.search',
      record_memory: 'knowledge_base.record',
      tombstone_memory: 'knowledge_base.tombstone',
      supersede_memory: 'knowledge_base.supersede'
    };
    const expectedActions = {
      record_memory: 'live_bridge_record_memory_proof',
      tombstone_memory: 'live_bridge_tombstone_memory_proof',
      supersede_memory: 'live_bridge_supersede_memory_proof'
    };

    assert.equal(body.method, 'tools/call');
    assert.equal(body.params.name, expectedNativeNames[publicToolName]);
    assert.equal(governance.governanceTransport.metadataPath, 'params._meta.codexMemoryGovernance');
    if (publicToolName === 'search_memory') {
      assert.equal(governance.readWriteAuthority.readAllowed, true);
      assert.equal(governance.readWriteAuthority.writeAllowed, false);
    } else {
      assert.equal(governance.readWriteAuthority.readAllowed, false);
      assert.equal(governance.readWriteAuthority.writeAllowed, true);
      assert.equal(governance.exactApprovalResult.allowedAction, expectedActions[publicToolName]);
      assert.equal(governance.exactApprovalResult.rollbackPlanMatched, true);
      assert.equal(body.params.arguments.governed_bridge.invocation_tool_name, publicToolName);
      assert.equal(body.params.arguments.governed_bridge.write_allowed, true);
    }

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(testJsonRpcToolResult(body)));
  });
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-native-write-suite-'));
  const evidenceOutputPath = path.join(tempBasePath, 'evidence', 'governed-native-write-suite.json');

  try {
    const result = await runGovernedVcpNativeAcceptance({
      includeWriteSuite: true,
      endpoint: server.url,
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      projectBasePath: tempBasePath,
      dataDir: path.join(tempBasePath, 'data'),
      logsDir: path.join(tempBasePath, 'logs'),
      projectId: 'codex-memory',
      workspaceId: 'workspace-alpha',
      scopeId: 'scope-alpha',
      visibility: 'shared',
      query: 'acceptance write suite',
      writeTitle: 'acceptance write suite',
      writeContent: 'acceptance write body',
      writeEvidence: 'acceptance write evidence',
      evidenceOutputPath
    });
    const artifact = JSON.parse(await fs.readFile(evidenceOutputPath, 'utf8'));
    const publicToolNames = server.requests
      .filter(request => request.body.method === 'tools/call')
      .map(request =>
      request.body.params._meta.codexMemoryGovernance.invocationProfile.toolName
    );

    assert.equal(result.accepted, true);
    assert.equal(result.summary.nativeMcpTargetPreflightEvidence.writeToolsExpected, true);
    assert.equal(result.summary.nativeMcpTargetPreflightEvidence.writeSuiteExpected, true);
    assert.equal(result.summary.nativeMcpTargetPreflightEvidence.requiredNativeToolsPresent, true);
    assert.deepEqual(result.summary.selectedOperationKeys, [
      'read',
      'write',
      'tombstone',
      'supersede'
    ]);
    assert.equal(publicToolNames.includes('search_memory'), true);
    assert.equal(publicToolNames.includes('record_memory'), true);
    assert.equal(publicToolNames.includes('tombstone_memory'), true);
    assert.equal(publicToolNames.includes('supersede_memory'), true);
    assert.equal(result.operations.write.access.memoryWritePerformed, true);
    assert.equal(result.operations.tombstone.access.memoryWritePerformed, true);
    assert.equal(result.operations.supersede.access.memoryWritePerformed, true);
    assert.equal(result.operations.tombstone.receipt.nativeInvocation.toolName, 'tombstone_memory');
    assert.equal(result.operations.supersede.receipt.nativeInvocation.toolName, 'supersede_memory');
    assert.deepEqual(result.summary.writeRollbackEvidence.operationKeys, [
      'write',
      'tombstone',
      'supersede'
    ]);
    assert.equal(result.summary.writeRollbackEvidence.operations.tombstone.rollbackPlanBound, true);
    assert.equal(result.summary.writeRollbackEvidence.operations.supersede.rollbackPlanBound, true);
    assert.equal(validateGovernedVcpNativeAcceptanceEvidenceArtifact(artifact).valid, true);
    assert.equal(JSON.stringify(artifact).includes(server.url), false);
    assert.equal(JSON.stringify(result).includes(evidenceOutputPath), false);
  } finally {
    await server.close();
  }
});

test('governed VCP native acceptance blocks acceptance when MCP tool surface is incomplete', async () => {
  const server = await withJsonRpcServer(async (req, res, body) => {
    assert.equal(body.method, 'tools/call');
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(testJsonRpcToolResult(body)));
  }, {
    toolNames: ['knowledge_base.search']
  });
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-native-incomplete-surface-'));

  try {
    const result = await runGovernedVcpNativeAcceptance({
      includeWrite: true,
      endpoint: server.url,
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      projectBasePath: tempBasePath,
      dataDir: path.join(tempBasePath, 'data'),
      logsDir: path.join(tempBasePath, 'logs'),
      projectId: 'codex-memory',
      workspaceId: 'workspace-alpha',
      scopeId: 'scope-alpha',
      visibility: 'private',
      query: 'acceptance incomplete mcp surface',
      writeTitle: 'acceptance write',
      writeContent: 'acceptance write body',
      writeEvidence: 'acceptance evidence'
    });

    assert.equal(result.accepted, false);
    assert.equal(result.summary.nativeMcpTargetPreflightEvidence.initializeAccepted, true);
    assert.equal(result.summary.nativeMcpTargetPreflightEvidence.toolsListAccepted, true);
    assert.equal(result.summary.nativeMcpTargetPreflightEvidence.readNativeToolPresent, true);
    assert.equal(result.summary.nativeMcpTargetPreflightEvidence.requiredNativeToolsPresent, false);
    assert.equal(
      result.summary.acceptanceBlockers.nativeMcpTargetPreflight.includes('native_mcp_required_tool_missing'),
      true
    );
    assert.equal(
      result.summary.acceptanceBlockers.all.includes('native_mcp_preflight_reason_native_mcp_required_tool_missing'),
      true
    );
    assert.equal(JSON.stringify(result).includes(server.url), false);
  } finally {
    await server.close();
  }
});

test('governed VCP native acceptance evidence verifier rejects disclosure and missing coverage', async () => {
  const validArtifact = minimalAcceptedEvidenceArtifact();

  assert.equal(validateGovernedVcpNativeAcceptanceEvidenceArtifact(validArtifact).valid, true);

  const oldCombinedScopeVisibilityArtifact = {
    ...validArtifact,
    summary: {
      ...validArtifact.summary,
      governanceEvidenceMatrix: {
        ...Object.fromEntries(Object.entries(validArtifact.summary.governanceEvidenceMatrix)
          .filter(([key]) => key !== 'scope' && key !== 'visibility')),
        scope_visibility: {
          covered: true,
          lowDisclosure: true,
          rawValueDisclosed: false,
          endpointDisclosed: false,
          tokenMaterialDisclosed: false
        }
      }
    }
  };
  const oldCombinedResult = validateGovernedVcpNativeAcceptanceEvidenceArtifact(
    oldCombinedScopeVisibilityArtifact
  );
  assert.equal(oldCombinedResult.valid, false);
  assert.ok(oldCombinedResult.blockers.includes('governanceEvidenceMatrix.scope_required'));
  assert.ok(oldCombinedResult.blockers.includes('governanceEvidenceMatrix.visibility_required'));

  const summaryOnlyArtifact = {
    ...validArtifact,
    operations: {}
  };
  const summaryOnlyResult = validateGovernedVcpNativeAcceptanceEvidenceArtifact(summaryOnlyArtifact);
  assert.equal(summaryOnlyResult.valid, false);
  assert.ok(summaryOnlyResult.blockers.includes('operations.read_required'));

  const missingNativeMcpPreflightArtifact = {
    ...validArtifact,
    summary: {
      ...validArtifact.summary,
      nativeMcpTargetPreflightEvidence: undefined
    }
  };
  const missingNativeMcpPreflightResult = validateGovernedVcpNativeAcceptanceEvidenceArtifact(
    missingNativeMcpPreflightArtifact
  );
  assert.equal(missingNativeMcpPreflightResult.valid, false);
  assert.ok(missingNativeMcpPreflightResult.blockers.includes('nativeMcpTargetPreflightEvidence_required'));

  const missingNativeReceiptArtifact = {
    ...validArtifact,
    operations: {
      read: {
        ...validArtifact.operations.read,
        receipt: {
          ...validArtifact.operations.read.receipt,
          nativeInvocation: {
            ...validArtifact.operations.read.receipt.nativeInvocation,
            statusClass: 'not_available',
            jsonRpcResponseIdMatched: false
          }
        }
      }
    }
  };
  const missingNativeReceiptResult = validateGovernedVcpNativeAcceptanceEvidenceArtifact(
    missingNativeReceiptArtifact
  );
  assert.equal(missingNativeReceiptResult.valid, false);
  assert.ok(missingNativeReceiptResult.blockers.includes(
    'operations.read.native_invocation_status_not_success'
  ));
  assert.ok(missingNativeReceiptResult.blockers.includes(
    'operations.read.native_invocation_response_id_not_matched'
  ));

  const invalidArtifact = {
    ...validArtifact,
    disclosure: {
      ...validArtifact.disclosure,
      endpointDisclosed: true
    },
    summary: {
      ...validArtifact.summary,
      governanceEvidenceMatrix: {
        ...validArtifact.summary.governanceEvidenceMatrix,
        client_id: {
          ...validArtifact.summary.governanceEvidenceMatrix.client_id,
          covered: false,
          rawValueDisclosed: true
        }
      }
    }
  };
  const result = validateGovernedVcpNativeAcceptanceEvidenceArtifact(invalidArtifact);

  assert.equal(result.valid, false);
  assert.ok(result.blockers.includes('disclosure.endpointDisclosed_must_be_false'));
  assert.ok(result.blockers.includes('client_id.covered_must_be_true'));
  assert.ok(result.blockers.includes('client_id.rawValueDisclosed_must_be_false'));

  const unsafeReasonArtifact = {
    ...validArtifact,
    summary: {
      ...validArtifact.summary,
      nativeRuntimePreconditionEvidence: {
        ...validArtifact.summary.nativeRuntimePreconditionEvidence,
        reasonCodes: ['https://PRIVATE_REASON_SHOULD_NOT_BE_ACCEPTED']
      }
    }
  };
  const unsafeReasonResult = validateGovernedVcpNativeAcceptanceEvidenceArtifact(unsafeReasonArtifact);
  assert.equal(unsafeReasonResult.valid, false);
  assert.ok(unsafeReasonResult.blockers.includes(
    'nativeRuntimePreconditionEvidence.reasonCodes_contains_unapproved_value'
  ));

  const unsafeRollbackDispositionArtifact = {
    ...validArtifact,
    summary: {
      ...validArtifact.summary,
      nativeRuntimePreconditionEvidence: {
        ...validArtifact.summary.nativeRuntimePreconditionEvidence,
        rollbackDispositions: ['https://PRIVATE_ROLLBACK_DISPOSITION_SHOULD_NOT_BE_ACCEPTED']
      }
    }
  };
  const unsafeRollbackDispositionResult = validateGovernedVcpNativeAcceptanceEvidenceArtifact(
    unsafeRollbackDispositionArtifact
  );
  assert.equal(unsafeRollbackDispositionResult.valid, false);
  assert.ok(unsafeRollbackDispositionResult.blockers.includes(
    'nativeRuntimePreconditionEvidence.rollbackDispositions_contains_unapproved_value'
  ));

  const unsafeFollowupReasonArtifact = {
    ...validArtifact,
    summary: {
      ...validArtifact.summary,
      nativeRuntimePreconditionEvidence: {
        ...validArtifact.summary.nativeRuntimePreconditionEvidence,
        operatorFollowupPacket: {
          ...validArtifact.summary.nativeRuntimePreconditionEvidence.operatorFollowupPacket,
          reasonCodes: ['https://PRIVATE_FOLLOWUP_REASON_SHOULD_NOT_BE_ACCEPTED']
        }
      }
    }
  };
  const unsafeFollowupReasonResult = validateGovernedVcpNativeAcceptanceEvidenceArtifact(
    unsafeFollowupReasonArtifact
  );
  assert.equal(unsafeFollowupReasonResult.valid, false);
  assert.ok(unsafeFollowupReasonResult.blockers.includes(
    'nativeRuntimePreconditionEvidence.operatorFollowupPacket.reasonCodes_contains_unapproved_value'
  ));
});

test('governed VCP native acceptance CLI verifies evidence artifacts offline without path disclosure', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-native-verify-'));
  const validPath = path.join(tempBasePath, 'valid-evidence.json');
  const invalidPath = path.join(tempBasePath, 'invalid-evidence.json');
  const validArtifact = minimalAcceptedEvidenceArtifact();
  await fs.writeFile(validPath, JSON.stringify(validArtifact), 'utf8');
  await fs.writeFile(invalidPath, JSON.stringify({
    ...validArtifact,
    disclosure: {
      ...validArtifact.disclosure,
      tokenMaterialDisclosed: true
    }
  }), 'utf8');

  const validResult = runCli(['--json', '--verify-evidence', validPath]);
  assert.equal(validResult.status, 0, validResult.stderr);
  const validReport = JSON.parse(validResult.stdout);
  assert.equal(validReport.valid, true);
  assert.equal(validReport.evidencePathDisclosed, false);
  assert.equal(validResult.stdout.includes(validPath), false);

  const invalidResult = runCli(['--json', '--verify-evidence', invalidPath]);
  assert.equal(invalidResult.status, 2, invalidResult.stderr);
  const invalidReport = JSON.parse(invalidResult.stdout);
  assert.equal(invalidReport.valid, false);
  assert.ok(invalidReport.blockers.includes('disclosure.tokenMaterialDisclosed_must_be_false'));
  assert.equal(invalidReport.evidencePathDisclosed, false);
  assert.equal(invalidResult.stdout.includes(invalidPath), false);
});

test('governed VCP native acceptance requires concrete read and write side-effect evidence', () => {
  const baseOperation = {
    accepted: true,
    delegated: true,
    access: {
      runtimeCalled: true,
      vcpToolBoxCalled: true,
      mcpToolCalled: true,
      memoryReadPerformed: true,
      memoryWritePerformed: false,
      localMemoryFallbackUsed: false
    },
    receipt: {
      runtimeTargetBound: true,
      clientIdentityBound: true,
      scopeBoundaryBound: true,
      visibilityBound: true,
      invocationProfileBound: true,
      readAllowed: true,
      writeAllowed: false,
      writeRequiresExactApproval: false,
      outputDisclosureBudgetBound: true,
      rawOutputAllowed: false,
      auditReceiptLowDisclosureBound: true,
      nativeInvocation: {
        statusClass: 'success',
        requestIdCategory: 'generated_bridge_request_id',
        jsonRpcResponseIdMatched: true,
        governanceMetadataSent: true,
        governanceMetadataPath: 'params._meta.codexMemoryGovernance',
        jsonRpcErrorPresent: false,
        nativeRuntimeReceiptPresent: true,
        nativeRuntimeCalled: true,
        nativeRuntimeInitialized: true,
        nativeProviderApiCalled: false,
        nativeMemoryReadPerformed: true,
        nativeMemoryWritePerformed: false,
        nativeDurableWritePerformed: false,
        nativeDurableWriteScope: null,
        nativeIsolatedRuntimeStoreUsed: false,
        nativePrimaryMemoryStoreWritePerformed: false,
        nativeDerivedIndexWritePerformed: false,
        nativeRawRuntimeOutputDisclosed: false,
        nativeRawMemoryContentDisclosed: false,
        nativeRuntimeLocatorDisclosed: false,
        nativeRuntimeTokenMaterialDisclosed: false,
        nativeRuntimeReadinessClaimed: false
      },
      localAuditReceipt: {
        appended: true
      },
      rollbackPostureBound: true,
      rollbackPlanBound: true,
      rollbackRequired: false,
      rollbackDisposition: 'no_rollback_required',
      rollbackFollowupRequired: false,
      rollbackApplyPolicy: 'not_applicable',
      rollbackApplyAttempted: false,
      rollbackAutoApplyAllowed: false,
      rollbackRawPlanDisclosed: false,
      rollbackRawPlanPersisted: false,
      localMemoryPrimaryRuntime: false,
      localMemoryFallbackUsed: false,
      localMemoryResultReturned: false,
      localMemoryResultCanBeMistakenForVcpNative: false,
      localMemoryRawContentDisclosed: false
    }
  };

  assert.equal(operationAccepted({ ...baseOperation, toolName: 'search_memory' }), true);
  assert.deepEqual(collectOperationAcceptanceBlockers({
    ...baseOperation,
    toolName: 'search_memory'
  }), []);
  assert.equal(operationAccepted({
    ...baseOperation,
    toolName: 'search_memory',
    access: {
      ...baseOperation.access,
      memoryReadPerformed: false
    }
  }), false);
  assert.deepEqual(collectOperationAcceptanceBlockers({
    ...baseOperation,
    toolName: 'search_memory',
    access: {
      ...baseOperation.access,
      memoryReadPerformed: false
    }
  }), ['native_memory_read_not_performed']);
  assert.deepEqual(collectOperationAcceptanceBlockers({
    ...baseOperation,
    toolName: 'search_memory',
    receipt: {
      ...baseOperation.receipt,
      nativeInvocation: {
        ...baseOperation.receipt.nativeInvocation,
        nativeDurableWritePerformed: true
      }
    }
  }), ['read_native_runtime_durable_write_not_isolated']);
  assert.deepEqual(collectOperationAcceptanceBlockers({
    ...baseOperation,
    toolName: 'search_memory',
    receipt: {
      ...baseOperation.receipt,
      nativeInvocation: {
        ...baseOperation.receipt.nativeInvocation,
        nativeDurableWritePerformed: true,
        nativeDurableWriteScope: 'isolated_derived_index',
        nativeIsolatedRuntimeStoreUsed: true,
        nativePrimaryMemoryStoreWritePerformed: false,
        nativeDerivedIndexWritePerformed: true
      }
    }
  }), []);
  assert.equal(operationAccepted({
    ...baseOperation,
    toolName: 'record_memory',
    access: {
      ...baseOperation.access,
      memoryReadPerformed: false,
      memoryWritePerformed: true
    },
    receipt: {
      ...baseOperation.receipt,
      readAllowed: false,
      writeAllowed: true,
      writeRequiresExactApproval: true,
      nativeInvocation: {
        ...baseOperation.receipt.nativeInvocation,
        nativeMemoryReadPerformed: false,
        nativeMemoryWritePerformed: true,
        nativeDurableWritePerformed: true,
        nativeDurableWriteScope: 'primary_memory_write',
        nativePrimaryMemoryStoreWritePerformed: true
      }
    }
  }), true);
  assert.equal(operationAccepted({
    ...baseOperation,
    toolName: 'record_memory',
    access: {
      ...baseOperation.access,
      memoryWritePerformed: false
    },
    receipt: {
      ...baseOperation.receipt,
      readAllowed: false,
      writeAllowed: true,
      writeRequiresExactApproval: true,
      nativeInvocation: {
        ...baseOperation.receipt.nativeInvocation,
        nativeMemoryReadPerformed: false,
        nativeMemoryWritePerformed: true,
        nativeDurableWritePerformed: true,
        nativeDurableWriteScope: 'primary_memory_write',
        nativePrimaryMemoryStoreWritePerformed: true
      }
    }
  }), false);
  assert.deepEqual(collectOperationAcceptanceBlockers({
    ...baseOperation,
    toolName: 'record_memory',
    access: {
      ...baseOperation.access,
      memoryWritePerformed: false
    },
    receipt: {
      ...baseOperation.receipt,
      readAllowed: false,
      writeAllowed: true,
      writeRequiresExactApproval: true,
      nativeInvocation: {
        ...baseOperation.receipt.nativeInvocation,
        nativeMemoryReadPerformed: false,
        nativeMemoryWritePerformed: true,
        nativeDurableWritePerformed: true,
        nativeDurableWriteScope: 'primary_memory_write',
        nativePrimaryMemoryStoreWritePerformed: true
      }
    }
  }), ['native_memory_write_not_performed']);
  assert.deepEqual(collectOperationAcceptanceBlockers({
    ...baseOperation,
    toolName: 'record_memory',
    receipt: {
      ...baseOperation.receipt,
      readAllowed: false,
      writeAllowed: true,
      writeRequiresExactApproval: true,
      rollbackApplyPolicy: 'manual_governed_followup_required',
      rollbackRequired: true,
      rollbackRawPlanDisclosed: true,
      nativeInvocation: {
        ...baseOperation.receipt.nativeInvocation,
        nativeMemoryReadPerformed: false,
        nativeMemoryWritePerformed: true,
        nativeDurableWritePerformed: true,
        nativeDurableWriteScope: 'primary_memory_write',
        nativePrimaryMemoryStoreWritePerformed: true
      }
    },
    access: {
      ...baseOperation.access,
      memoryReadPerformed: false,
      memoryWritePerformed: true
    }
  }), [
    'write_rollback_required',
    'write_rollback_apply_policy_not_clear',
    'write_rollback_raw_plan_disclosed'
  ]);
  assert.deepEqual(collectOperationAcceptanceBlockers({
    ...baseOperation,
    toolName: 'search_memory',
    receipt: {
      ...baseOperation.receipt,
      visibilityBound: false,
      invocationProfileBound: false,
      readAllowed: false,
      nativeInvocation: {
        ...baseOperation.receipt.nativeInvocation,
        statusClass: 'transport_error',
        requestIdCategory: 'raw_request_id',
        jsonRpcResponseIdMatched: false
      }
    }
  }), [
    'read_authority_not_allowed',
    'visibility_not_bound',
    'invocation_profile_not_bound',
    'native_invocation_status_not_success',
    'native_invocation_request_id_not_bound',
    'native_invocation_response_id_not_matched'
  ]);
  assert.deepEqual(collectOperationAcceptanceBlockers({
    ...baseOperation,
    accepted: false,
    toolName: 'search_memory',
    access: {
      ...baseOperation.access,
      memoryReadPerformed: false
    },
    receipt: {
      ...baseOperation.receipt,
      nativeInvocation: {
        ...baseOperation.receipt.nativeInvocation,
        statusClass: 'client_error',
        jsonRpcErrorPresent: true,
        jsonRpcErrorReasonCode: 'native_runtime_call_failed'
      }
    }
  }), [
    'native_memory_read_not_performed',
    'operation_not_accepted',
    'native_invocation_status_not_success',
    'native_json_rpc_error_present',
    'native_json_rpc_error_reason_native_runtime_call_failed'
  ]);
  assert.deepEqual(collectOperationAcceptanceBlockers({
    ...baseOperation,
    accepted: false,
    toolName: 'search_memory',
    access: {
      ...baseOperation.access,
      memoryReadPerformed: false
    },
    receipt: {
      ...baseOperation.receipt,
      nativeInvocation: {
        ...baseOperation.receipt.nativeInvocation,
        statusClass: 'client_error',
        jsonRpcErrorPresent: true,
        jsonRpcErrorReasonCode: 'https://PRIVATE_REASON_SHOULD_NOT_ECHO'
      }
    }
  }), [
    'native_memory_read_not_performed',
    'operation_not_accepted',
    'native_invocation_status_not_success',
    'native_json_rpc_error_present'
  ]);
  assert.deepEqual(collectOperationAcceptanceBlockers({
    ...baseOperation,
    toolName: 'search_memory',
    receipt: {
      ...baseOperation.receipt,
      localMemoryPrimaryRuntime: true,
      localMemoryResultCanBeMistakenForVcpNative: true,
      localMemoryRawContentDisclosed: true
    }
  }), [
    'local_memory_marked_primary_runtime',
    'local_memory_result_can_be_mistaken_for_native',
    'local_memory_raw_content_disclosed'
  ]);
});

test('governed VCP native acceptance CLI fails closed when target is not configured', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-native-acceptance-missing-'));
  const evidenceOutputPath = path.join(tempBasePath, 'evidence', 'missing-target.json');
  const result = await runGovernedVcpNativeAcceptance({
    endpoint: '',
    bearerToken: '',
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    projectBasePath: tempBasePath,
    dataDir: path.join(tempBasePath, 'data'),
    logsDir: path.join(tempBasePath, 'logs'),
    evidenceOutputPath
  });
  const artifact = JSON.parse(await fs.readFile(evidenceOutputPath, 'utf8'));
  const verification = validateGovernedVcpNativeAcceptanceEvidenceArtifact(artifact);

  assert.equal(result.accepted, false);
  assert.equal(result.status, 'native_target_not_accepted');
  assert.equal(result.config.httpMcpTarget.accepted, false);
  assert.equal(result.config.httpMcpTarget.endpointDisclosed, false);
  assert.equal(result.config.httpMcpTarget.tokenMaterialDisclosed, false);
  assert.deepEqual(result.summary.selectedOperationKeys, []);
  assert.equal(result.summary.governanceEvidenceMatrix.client_id.lowDisclosure, true);
  assert.equal(result.summary.nativeRuntimePreconditionEvidence.included, false);
  assert.equal(result.summary.nativeRuntimePreconditionEvidence.lowDisclosure, true);
  assert.equal(result.summary.nativeRuntimePreconditionEvidence.rawErrorDisclosed, false);
  assert.equal(result.summary.nativeRuntimePreconditionEvidence.rollbackApplyAttempted, false);
  assert.equal(result.summary.nativeRuntimePreconditionEvidence.rollbackAutoApplyAllowed, false);
  assert.deepEqual(result.summary.nativeRuntimePreconditionEvidence.rollbackDispositions, []);
  assert.equal(result.summary.nativeRuntimePreconditionEvidence.operatorFollowupPacket.included, false);
  assert.equal(result.summary.nativeRuntimePreconditionEvidence.operatorFollowupPacket.lowDisclosure, true);
  assert.equal(
    result.summary.nativeRuntimePreconditionEvidence.operatorFollowupPacket.bridgeConfigEnvReadAllowed,
    false
  );
  assert.equal(result.summary.localMemoryAuxiliaryEvidence.primaryRuntime, false);
  assert.equal(result.summary.acceptanceBlockers.count, 2);
  assert.deepEqual(result.summary.acceptanceBlockers.config, [
    'native_http_mcp_target_not_accepted',
    'no_operations_selected'
  ]);
  assert.deepEqual(result.operations, {});
  assert.equal(verification.valid, true, verification.blockers.join(', '));
  assert.equal(artifact.accepted, false);
  assert.equal(JSON.stringify(artifact).includes(evidenceOutputPath), false);
});
