'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  createGovernedMcpVcpNativeVcpToolBoxMcpShimServer,
  createVcpToolBoxNativeMemoryAdapter
} = require('../src/core/GovernedMcpVcpNativeVcpToolBoxMcpShim');
const {
  GOVERNANCE_METADATA_SCHEMA_VERSION
} = require('../src/core/GovernedMcpVcpNativeHttpMcpClientInvoker');
const {
  runGovernedVcpNativeAcceptance
} = require('../src/cli/governed-vcp-native-acceptance');
const {
  parseArgs
} = require('../src/cli/vcp-toolbox-native-mcp-shim');
const { validateMapping } = require('../src/core/DiaryScopeMapping');

const SYNTHETIC_DIARY_SCOPE_MAPPING = Object.freeze({
  schemaVersion: 1,
  mappingReference: 'jenn-vcp-diary-scope-v1',
  defaultPolicy: 'deny',
  entries: [{
    partitionReference: 'synthetic-codex-private-v1',
    diaryName: 'SYNTHETIC_CODEX_PRIVATE',
    classification: 'client_private',
    clientId: 'Codex',
    projectId: null,
    workspaceId: null,
    readProfiles: ['exact_visibility', 'task_start_context'],
    writeEligible: true
  }]
});
const SYNTHETIC_MAPPING_BINDING = validateMapping(SYNTHETIC_DIARY_SCOPE_MAPPING);

test('native read initializes the selected-diary runtime before provider and scoped search', async () => {
  const calls = [];
  const adapter = createVcpToolBoxNativeMemoryAdapter({
    knowledgeBaseManager: {
      async initialize() {
        calls.push('initialize');
      },
      async search(diaryNames) {
        calls.push(['search', diaryNames]);
        return [{ fullPath: 'SYNTHETIC_CODEX_PRIVATE/bootstrap.md', score: 0.9 }];
      }
    },
    embeddingUtils: {
      async getEmbeddingsBatch() {
        calls.push('embedding');
        return [[0.1, 0.2]];
      }
    }
  });

  const result = await adapter.search({ query: 'governed read', limit: 1 }, {
    authorization: {
      accepted: true,
      allowedDiaryNames: ['SYNTHETIC_CODEX_PRIVATE'],
      allowedDiaryCount: 1,
      mappingReference: SYNTHETIC_MAPPING_BINDING.mappingReference,
      mappingDigest: SYNTHETIC_MAPPING_BINDING.mappingDigest
    }
  });

  assert.deepEqual(calls, [
    'initialize',
    'embedding',
    ['search', ['SYNTHETIC_CODEX_PRIVATE']]
  ]);
  assert.equal(result._nativeRuntimeReceipt.nativeRuntimeInitialized, true);
  assert.equal(result._nativeRuntimeReceipt.derivedIndexWritePerformed, false);
  assert.equal(result._nativeRuntimeReceipt.durableWritePerformed, false);
  assert.equal(result._nativeRuntimeReceipt.unscopedNativeSearchUsed, false);
});

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function postJson(url, body) {
  const target = new URL(url);
  const serialized = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: target.hostname,
      port: target.port,
      path: target.pathname,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(serialized)
      }
    }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    req.write(serialized);
    req.end();
  });
}

async function withShimServer(options = {}) {
  const calls = [];
  const server = createGovernedMcpVcpNativeVcpToolBoxMcpShimServer({
    enableWrite: true,
    diaryScopeMapping: SYNTHETIC_DIARY_SCOPE_MAPPING,
    adapter: {
      async search(args) {
        calls.push({ tool: 'search', args });
        return { results: [{ sourceFilePresent: true, scorePresent: true, tagCountBucket: 'zero' }] };
      },
      async record(args) {
        calls.push({ tool: 'record', args });
        return { recorded: true, memory_id_ref: 'vcp-kb-test', raw_path_disclosed: false };
      },
      async tombstone(args) {
        calls.push({ tool: 'tombstone', args });
        return { recorded: true, memory_id_ref: 'vcp-kb-tombstone-test', raw_path_disclosed: false };
      },
      async supersede(args) {
        calls.push({ tool: 'supersede', args });
        return { recorded: true, memory_id_ref: 'vcp-kb-supersede-test', raw_path_disclosed: false };
      }
    },
    ...options
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
    calls,
    url: `http://127.0.0.1:${address.port}/mcp/vcp-native`,
    authorizationProjection: () => server.getLowDisclosureAuthorizationProjection(),
    close: () => new Promise((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    })
  };
}

test('VCPToolBox native MCP shim can require an exact in-process bearer without disclosing it', async t => {
  const shim = await withShimServer({ expectedBearerToken: 'cm2113-synthetic-transport-token' });
  t.after(() => shim.close());
  const body = { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} };
  const rejected = await fetch(shim.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  assert.equal(rejected.status, 401);
  const accepted = await fetch(shim.url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer cm2113-synthetic-transport-token'
    },
    body: JSON.stringify(body)
  });
  assert.equal(accepted.status, 200);
  assert.equal((await accepted.json()).result.serverInfo.name, 'codex-memory-governed-vcp-toolbox-native-shim');
  assert.deepEqual(shim.authorizationProjection(), {
    authorizationRequired: true,
    authorizedRequestCount: 1,
    rejectedAuthorizationCount: 1,
    tokenMaterialDisclosed: false
  });
});

test('VCPToolBox native MCP shim CLI accepts isolated knowledge-base store path without disclosing it', () => {
  const options = parseArgs([
    '--vcp-root',
    '/PRIVATE/VCPToolBox',
    '--kb-root',
    '/PRIVATE/VCPToolBox/dailynote',
    '--kb-store',
    '/PRIVATE/codex-memory-isolated-vector-store',
    '--diary-scope-mapping',
    '/PRIVATE/codex-memory-diary-scope-mapping.json',
    '--enable-write'
  ], {});

  assert.equal(options.vcpToolBoxRoot, '/PRIVATE/VCPToolBox');
  assert.equal(options.knowledgeBaseRootPath, '/PRIVATE/VCPToolBox/dailynote');
  assert.equal(options.knowledgeBaseStorePath, '/PRIVATE/codex-memory-isolated-vector-store');
  assert.equal(options.diaryScopeMappingPath, '/PRIVATE/codex-memory-diary-scope-mapping.json');
  assert.equal(options.enableWrite, true);
});

function governanceMeta(toolName = 'search_memory') {
  const exactApprovalActions = {
    record_memory: 'live_bridge_record_memory_proof',
    tombstone_memory: 'live_bridge_tombstone_memory_proof',
    supersede_memory: 'live_bridge_supersede_memory_proof'
  };
  const write = Object.prototype.hasOwnProperty.call(exactApprovalActions, toolName);
  return {
    schemaVersion: GOVERNANCE_METADATA_SCHEMA_VERSION,
    scopeEnforcement: {
      mode: 'diary_allowlist_v1',
      expectedMappingReference: SYNTHETIC_MAPPING_BINDING.mappingReference,
      expectedMappingDigest: SYNTHETIC_MAPPING_BINDING.mappingDigest,
      recallProfile: 'exact_visibility',
      bound: true,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false,
      scopeIdAffectsDiaryAcl: false,
      scopeIdEnforcementClaimed: false
    },
    trustedExecutionContext: {
      accepted: true,
      source: 'trusted_execution_context_or_transport',
      executionContext: {
        agentAlias: 'Codex',
        clientId: 'Codex',
        projectId: 'codex-memory',
        scopeId: 'scope-alpha',
        workspaceId: 'workspace-alpha',
        visibility: 'private'
      }
    },
    runtimeTarget: {
      primaryRuntime: 'VCPToolBox native memory',
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server',
      sourceAuthority: 'bridge_runtime_or_static_config',
      bound: true,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false
    },
    invocationProfile: {
      profile: write ? 'governed_bounded_write' : 'governed_read_only',
      source: 'bridge_tool_binding',
      transport: 'mcp',
      toolName,
      bound: true,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false
    },
    readWriteAuthority: {
      readAllowed: !write,
      writeAllowed: write,
      ...(write ? { writePolicy: 'exact_approval' } : {}),
      source: 'bridge_tool_binding',
      bound: true,
      mixedReadWriteAllowed: false,
      unboundedWriteAllowed: false,
      writeRequiresExactApproval: write,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false
    },
    ...(write ? {
      exactApprovalResult: {
        accepted: true,
        allowedAction: exactApprovalActions[toolName],
        allowedScope: {
          project_id: 'codex-memory',
          scope_id: 'scope-alpha',
          workspace_id: 'workspace-alpha',
          client_id: 'Codex',
          visibility: 'private'
        },
        runtimeTarget: {
          primaryRuntime: 'VCPToolBox native memory',
          targetReferenceName: 'operator-vcp-toolbox-service-ref',
          targetKind: 'mcp_server'
        },
        rollbackPlanRef: 'cm-governed-write-rollback-plan',
        actionMatched: true,
        scopeMatched: true,
        runtimeTargetMatched: true,
        rollbackPlanMatched: true
      }
    } : {}),
    outputDisclosureBudget: {
      level: 'summary',
      lowDisclosure: true,
      rawOutput: false,
      maxItems: 1,
      maxBytes: 512,
      source: 'bridge_gate_normalized_governance',
      bound: true,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false
    },
    auditReceipt: {
      receipt_id: write ? 'cm-governed-write-receipt' : 'cm-governed-readonly-receipt',
      required: true,
      lowDisclosure: true,
      source: 'bridge_gate_normalized_governance',
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false
    },
    rollbackPosture: write
      ? {
          mode: 'bounded_rollback_plan',
          rollback_plan_ref: 'cm-governed-write-rollback-plan',
          source: 'bridge_gate_normalized_governance',
          bound: true,
          toolArgumentsMayOverride: false,
          governanceMetadataMayOverride: false,
          automaticRollbackAppliedByBridge: false,
          applyRequiresGovernedFollowup: true
        }
      : {
          mode: 'no_runtime_state_to_rollback',
          source: 'bridge_gate_normalized_governance',
          bound: true,
          toolArgumentsMayOverride: false,
          governanceMetadataMayOverride: false,
          automaticRollbackAppliedByBridge: false
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

test('VCPToolBox native MCP shim supports initialize without runtime or locator disclosure', async () => {
  const shim = await withShimServer();
  try {
    const result = await postJson(shim.url, {
      jsonrpc: '2.0',
      id: 'native-shim-initialize',
      method: 'initialize',
      params: {}
    });
    const serialized = JSON.stringify(result);

    assert.equal(result.error, undefined);
    assert.equal(result.result.serverInfo.name, 'codex-memory-governed-vcp-toolbox-native-shim');
    assert.equal(result.result.capabilities.tools.listChanged, false);
    assert.equal(result.result._meta.primaryRuntime, 'VCPToolBox native memory');
    assert.equal(result.result._meta.accessPath, 'governed MCP tools');
    assert.equal(result.result._meta.governanceMetadataPath, 'params._meta.codexMemoryGovernance');
    assert.equal(result.result._meta.writeEnabled, true);
    assert.equal(result.result._meta.lowDisclosure, true);
    assert.equal(result.result._meta.endpointDisclosed, false);
    assert.equal(result.result._meta.tokenMaterialDisclosed, false);
    assert.equal(result.result._meta.locatorDisclosed, false);
    assert.equal(result.result._meta.configEnvRead, false);
    assert.equal(result.result._meta.providerApiCalled, false);
    assert.equal(result.result._meta.nativeRuntimeCalled, false);
    assert.equal(result.result._meta.readinessClaimed, false);
    assert.equal(serialized.includes(shim.url), false);
    assert.equal(serialized.includes('SECRET'), false);
    assert.equal(serialized.includes('config.env'), false);
    assert.equal(shim.calls.length, 0);
  } finally {
    await shim.close();
  }
});

test('VCPToolBox native MCP shim tools/list exposes only low-disclosure governed tool surfaces', async () => {
  const readOnlyShim = await withShimServer({ enableWrite: false });
  try {
    const result = await postJson(readOnlyShim.url, {
      jsonrpc: '2.0',
      id: 'native-shim-readonly-tools',
      method: 'tools/list',
      params: {}
    });
    const toolNames = result.result.tools.map(tool => tool.name);
    const serialized = JSON.stringify(result);

    assert.deepEqual(toolNames, ['knowledge_base.search', 'memory_overview', 'audit_memory']);
    assert.equal(result.result._meta.writeEnabled, false);
    assert.equal(result.result.tools[0]._meta.readAllowed, true);
    assert.equal(result.result.tools[0]._meta.writeAllowed, false);
    assert.deepEqual(result.result.tools[0]._meta.publicToolNames, ['search_memory']);
    assert.deepEqual(result.result.tools[1]._meta.publicToolNames, ['memory_overview']);
    assert.deepEqual(result.result.tools[2]._meta.publicToolNames, ['audit_memory']);
    for (const tool of result.result.tools) {
      assert.equal(
        tool.inputSchema._meta.governanceMetadataPath,
        'params._meta.codexMemoryGovernance'
      );
      assert.equal(tool.inputSchema._meta.toolArgumentsMayCarryGovernance, false);
      assert.equal(tool.inputSchema._meta.rawOutputAllowed, false);
      assert.equal(tool._meta.readAllowed, true, tool.name);
      assert.equal(tool._meta.writeAllowed, false, tool.name);
    }
    assert.equal(result.result._meta.endpointDisclosed, false);
    assert.equal(result.result._meta.tokenMaterialDisclosed, false);
    assert.equal(result.result._meta.nativeRuntimeCalled, false);
    assert.equal(serialized.includes(readOnlyShim.url), false);
    assert.equal(serialized.includes('config.env'), false);
    assert.equal(readOnlyShim.calls.length, 0);
  } finally {
    await readOnlyShim.close();
  }

  const writeShim = await withShimServer({ enableWrite: true });
  try {
    const result = await postJson(writeShim.url, {
      jsonrpc: '2.0',
      id: 'native-shim-write-tools',
      method: 'tools/list',
      params: {}
    });
    const toolNames = result.result.tools.map(tool => tool.name);

    assert.deepEqual(toolNames, [
      'knowledge_base.search',
      'memory_overview',
      'audit_memory',
      'knowledge_base.record',
      'knowledge_base.write',
      'knowledge_base.tombstone',
      'knowledge_base.supersede'
    ]);
    assert.equal(result.result._meta.writeEnabled, true);
    for (const tool of result.result.tools.slice(3)) {
      assert.equal(tool._meta.writeAllowed, true, tool.name);
      assert.equal(tool._meta.exactApprovalRequired, true, tool.name);
      assert.equal(tool._meta.rawOutputAllowed, false, tool.name);
      assert.equal(tool.inputSchema._meta.codexMemoryGovernanceRequired, true, tool.name);
    }
    assert.equal(writeShim.calls.length, 0);
  } finally {
    await writeShim.close();
  }
});

test('VCPToolBox native MCP shim rejects tools/call without governed metadata', async () => {
  const shim = await withShimServer();
  try {
    const result = await postJson(shim.url, {
      jsonrpc: '2.0',
      id: 'missing-governance',
      method: 'tools/call',
      params: {
        name: 'knowledge_base.search',
        arguments: { query: 'needle' }
      }
    });

    assert.equal(result.error.code, -32602);
    assert.equal(result.error.data.reasonCode, 'invalid_governance_metadata');
    assert.equal(result.error.data.rawRequestBodyDisclosed, false);
    assert.equal(shim.calls.length, 0);
  } finally {
    await shim.close();
  }
});

test('VCPToolBox native MCP shim rejects missing and mismatched mapping before native execution', async () => {
  for (const scenario of ['missing', 'mismatch']) {
    let nativeCalls = 0;
    const shim = await withShimServer({
      ...(scenario === 'missing' ? { diaryScopeMapping: undefined } : {}),
      adapter: {
        async search() {
          nativeCalls += 1;
          return { results: [] };
        }
      }
    });
    try {
      const metadata = governanceMeta('search_memory');
      if (scenario === 'mismatch') {
        metadata.scopeEnforcement.expectedMappingDigest = `sha256:${'b'.repeat(64)}`;
      }
      const result = await postJson(shim.url, {
        jsonrpc: '2.0',
        id: `mapping-${scenario}`,
        method: 'tools/call',
        params: {
          name: 'knowledge_base.search',
          arguments: { query: 'synthetic' },
          _meta: { codexMemoryGovernance: metadata }
        }
      });
      assert.equal(result.error.code, -32602);
      assert.equal(
        result.error.data.reasonCode,
        scenario === 'missing'
          ? 'diary_scope_mapping_missing'
          : 'diary_scope_mapping_binding_mismatch'
      );
      assert.equal(nativeCalls, 0);
    } finally {
      await shim.close();
    }
  }
});

test('VCPToolBox native MCP shim fails closed when native read cannot produce a result', async () => {
  let called = false;
  const shim = await withShimServer({
    adapter: {
      async search() {
        called = true;
        throw new Error('native query vector unavailable');
      },
      async record() {
        throw new Error('not used');
      }
    }
  });
  try {
    const result = await postJson(shim.url, {
      jsonrpc: '2.0',
      id: 'native-read-fails',
      method: 'tools/call',
      params: {
        name: 'knowledge_base.search',
        arguments: { query: 'needle' },
        _meta: {
          codexMemoryGovernance: governanceMeta('search_memory')
        }
      }
    });

    assert.equal(called, true);
    assert.equal(result.error.code, -32000);
    assert.equal(result.error.data.reasonCode, 'native_runtime_call_failed');
    assert.equal(result.error.data.lowDisclosure, true);
    assert.equal(result.error.data.rawErrorDisclosed, false);
  } finally {
    await shim.close();
  }
});

test('VCPToolBox native MCP shim binds governed read tools to shape-compatible native actions', async () => {
  const calls = [];
  const shim = await withShimServer({
    adapter: {
      async search(args, context) {
        calls.push({ args, context });
        return { results: [] };
      },
      async overview(args, context) {
        calls.push({ args, context });
        return { overview: { status: 'available' } };
      },
      async audit(args, context) {
        calls.push({ args, context });
        return { audit: { status: 'available' } };
      },
      async record() {
        throw new Error('not used');
      }
    }
  });
  try {
    for (const publicToolName of ['memory_overview', 'audit_memory']) {
      const nativeToolName = publicToolName;
      const result = await postJson(shim.url, {
        jsonrpc: '2.0',
        id: publicToolName,
        method: 'tools/call',
        params: {
          name: nativeToolName,
          arguments: { query: 'bounded read' },
          _meta: {
            codexMemoryGovernance: governanceMeta(publicToolName)
          }
        }
      });

      assert.equal(result.error, undefined, publicToolName);
      assert.equal(Object.keys(result.result.structuredContent)[0], publicToolName === 'memory_overview'
        ? 'overview'
        : 'audit');
    }

    assert.deepEqual(calls.map(call => call.context.publicToolName), [
      'memory_overview',
      'audit_memory'
    ]);
    assert.deepEqual(calls.map(call => call.args.governed_bridge.native_tool_name), [
      'memory_overview',
      'audit_memory'
    ]);
  } finally {
    await shim.close();
  }
});

test('VCPToolBox native MCP shim rejects search-shaped overview and audit drift', async () => {
  const shim = await withShimServer();
  try {
    for (const publicToolName of ['memory_overview', 'audit_memory']) {
      const result = await postJson(shim.url, {
        jsonrpc: '2.0',
        id: `${publicToolName}-search-drift`,
        method: 'tools/call',
        params: {
          name: 'knowledge_base.search',
          arguments: { query: 'bounded read' },
          _meta: {
            codexMemoryGovernance: governanceMeta(publicToolName)
          }
        }
      });

      assert.equal(result.error.code, -32602);
      assert.equal(result.error.data.reasonCode, 'native_tool_public_binding_mismatch');
      assert.equal(result.error.data.lowDisclosure, true);
    }
    assert.equal(shim.calls.length, 0);
  } finally {
    await shim.close();
  }
});

test('VCPToolBox native MCP shim rejects public tool and native action drift', async () => {
  const shim = await withShimServer();
  try {
    const result = await postJson(shim.url, {
      jsonrpc: '2.0',
      id: 'tool-drift',
      method: 'tools/call',
      params: {
        name: 'knowledge_base.search',
        arguments: { query: 'needle' },
        _meta: {
          codexMemoryGovernance: governanceMeta('record_memory')
        }
      }
    });

    assert.equal(result.error.code, -32602);
    assert.equal(result.error.data.reasonCode, 'native_tool_public_binding_mismatch');
    assert.equal(result.error.data.rawRequestBodyDisclosed, false);
    assert.equal(shim.calls.length, 0);
  } finally {
    await shim.close();
  }
});

test('VCPToolBox native MCP shim rebuilds read governance arguments from metadata', async () => {
  const calls = [];
  const shim = await withShimServer({
    adapter: {
      async search(args) {
        calls.push(args);
        return { results: [] };
      },
      async record() {
        throw new Error('not used');
      }
    }
  });
  try {
    const result = await postJson(shim.url, {
      jsonrpc: '2.0',
      id: 'read-argument-governance-forgery',
      method: 'tools/call',
      params: {
        name: 'knowledge_base.search',
        arguments: {
          query: 'needle',
          scope: {
            client_id: 'Mallory',
            visibility: 'workspace',
            project_id: 'evil-project'
          },
          governed_bridge: {
            client_id: 'Mallory',
            read_allowed: false,
            write_allowed: true
          },
          diaryName: 'FORGED_DIARY',
          allowedDiaryNames: ['FORGED_DIARY'],
          mappingReference: 'forged-reference',
          mappingDigest: `sha256:${'b'.repeat(64)}`,
          scopeEnforcementMode: 'forged-mode',
          filters: {
            keep: 'business-filter',
            runtimeTarget: { endpoint: 'http://private-target.invalid' }
          }
        },
        _meta: {
          codexMemoryGovernance: governanceMeta('search_memory')
        }
      }
    });

    assert.equal(result.error, undefined);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].query, 'needle');
    assert.equal(calls[0].diaryName, undefined);
    assert.equal(calls[0].allowedDiaryNames, undefined);
    assert.equal(calls[0].mappingReference, undefined);
    assert.equal(calls[0].mappingDigest, undefined);
    assert.equal(calls[0].scopeEnforcementMode, undefined);
    assert.deepEqual(calls[0].filters, { keep: 'business-filter' });
    assert.equal(calls[0].scope.client_id, 'Codex');
    assert.equal(calls[0].scope.visibility, 'private');
    assert.equal(calls[0].scope.project_id, 'codex-memory');
    assert.equal(calls[0].governed_bridge.client_id, 'Codex');
    assert.equal(calls[0].governed_bridge.invocation_tool_name, 'search_memory');
    assert.equal(calls[0].governed_bridge.native_tool_name, 'knowledge_base.search');
    assert.equal(calls[0].governed_bridge.read_allowed, true);
    assert.equal(calls[0].governed_bridge.write_allowed, false);
    assert.equal(calls[0].governed_bridge.tool_arguments_may_override_governance, false);
  } finally {
    await shim.close();
  }
});

test('VCPToolBox native MCP shim rebuilds write governance arguments from metadata', async () => {
  const calls = [];
  const shim = await withShimServer({
    adapter: {
      async search() {
        throw new Error('not used');
      },
      async record(args) {
        calls.push(args);
        return { recorded: true, memory_id_ref: 'vcp-kb-test', raw_path_disclosed: false };
      }
    }
  });
  try {
    const result = await postJson(shim.url, {
      jsonrpc: '2.0',
      id: 'write-argument-governance-forgery',
      method: 'tools/call',
      params: {
        name: 'knowledge_base.record',
        arguments: {
          title: 'bounded write',
          content: 'body',
          evidence: 'evidence',
          scope: { client_id: 'Mallory', visibility: 'workspace' },
          governed_bridge: { write_allowed: false },
          exactApprovalResult: { token: 'SHOULD_NOT_REACH_NATIVE_ADAPTER' }
        },
        _meta: {
          codexMemoryGovernance: governanceMeta('record_memory')
        }
      }
    });

    assert.equal(result.error, undefined);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].title, 'bounded write');
    assert.equal(calls[0].content, 'body');
    assert.equal(calls[0].evidence, 'evidence');
    assert.equal(Object.prototype.hasOwnProperty.call(calls[0], 'exactApprovalResult'), false);
    assert.equal(calls[0].scope.client_id, 'Codex');
    assert.equal(calls[0].scope.visibility, 'private');
    assert.equal(calls[0].governed_bridge.client_id, 'Codex');
    assert.equal(calls[0].governed_bridge.invocation_tool_name, 'record_memory');
    assert.equal(calls[0].governed_bridge.native_tool_name, 'knowledge_base.record');
    assert.equal(calls[0].governed_bridge.read_allowed, false);
    assert.equal(calls[0].governed_bridge.write_allowed, true);
    assert.equal(calls[0].governed_bridge.tool_arguments_may_override_governance, false);
  } finally {
    await shim.close();
  }
});

test('VCPToolBox native MCP shim binds lifecycle write tools to native mutation markers', async () => {
  const calls = [];
  const shim = await withShimServer({
    adapter: {
      async search() {
        throw new Error('not used');
      },
      async record() {
        throw new Error('not used');
      },
      async tombstone(args, context) {
        calls.push({ tool: 'tombstone', args, context });
        return {
          recorded: true,
          memory_id_ref: 'vcp-kb-tombstone-test',
          write_shape: 'markdown_dailynote_mutation_marker',
          raw_path_disclosed: false
        };
      },
      async supersede(args, context) {
        calls.push({ tool: 'supersede', args, context });
        return {
          recorded: true,
          memory_id_ref: 'vcp-kb-supersede-test',
          write_shape: 'markdown_dailynote_mutation_marker',
          raw_path_disclosed: false
        };
      }
    }
  });
  try {
    const tombstoneResult = await postJson(shim.url, {
      jsonrpc: '2.0',
      id: 'tombstone-native-marker',
      method: 'tools/call',
      params: {
        name: 'knowledge_base.tombstone',
        arguments: {
          memory_id: 'memory-alpha',
          reason: 'bounded cleanup',
          evidence: 'operator approved lifecycle mutation',
          governed_bridge: { client_id: 'Mallory' }
        },
        _meta: {
          codexMemoryGovernance: governanceMeta('tombstone_memory')
        }
      }
    });
    const supersedeResult = await postJson(shim.url, {
      jsonrpc: '2.0',
      id: 'supersede-native-marker',
      method: 'tools/call',
      params: {
        name: 'knowledge_base.supersede',
        arguments: {
          old_memory_id: 'memory-alpha',
          new_memory_id: 'memory-beta',
          reason: 'bounded replacement',
          evidence: 'operator approved supersession',
          scope: { client_id: 'Mallory', visibility: 'workspace' }
        },
        _meta: {
          codexMemoryGovernance: governanceMeta('supersede_memory')
        }
      }
    });

    assert.equal(tombstoneResult.error, undefined);
    assert.equal(supersedeResult.error, undefined);
    assert.deepEqual(calls.map(call => call.context.publicToolName), [
      'tombstone_memory',
      'supersede_memory'
    ]);
    assert.equal(calls[0].args.memory_id, 'memory-alpha');
    assert.equal(calls[0].args.governed_bridge.invocation_tool_name, 'tombstone_memory');
    assert.equal(calls[0].args.governed_bridge.native_tool_name, 'knowledge_base.tombstone');
    assert.equal(calls[0].args.governed_bridge.client_id, 'Codex');
    assert.equal(calls[0].args.governed_bridge.write_allowed, true);
    assert.equal(calls[1].args.old_memory_id, 'memory-alpha');
    assert.equal(calls[1].args.scope.client_id, 'Codex');
    assert.equal(calls[1].args.scope.visibility, 'private');
    assert.equal(calls[1].args.governed_bridge.invocation_tool_name, 'supersede_memory');
    assert.equal(calls[1].args.governed_bridge.native_tool_name, 'knowledge_base.supersede');
    assert.equal(calls[1].args.governed_bridge.write_allowed, true);
  } finally {
    await shim.close();
  }
});

test('VCPToolBox native MCP shim rejects lifecycle writes when native write is disabled', async () => {
  const shim = await withShimServer({ enableWrite: false });
  try {
    const result = await postJson(shim.url, {
      jsonrpc: '2.0',
      id: 'disabled-tombstone',
      method: 'tools/call',
      params: {
        name: 'knowledge_base.tombstone',
        arguments: { memory_id: 'memory-alpha', reason: 'cleanup', evidence: 'approval' },
        _meta: {
          codexMemoryGovernance: governanceMeta('tombstone_memory')
        }
      }
    });

    assert.equal(result.error.code, -32602);
    assert.equal(result.error.data.reasonCode, 'native_write_disabled');
    assert.equal(result.error.data.lowDisclosure, true);
    assert.equal(shim.calls.length, 0);
  } finally {
    await shim.close();
  }
});

// Pending diary_allowlist_v1: native-read acceptance must remain fail closed.
test.skip('acceptance CLI can use VCPToolBox native MCP shim as governed native target', async () => {
  const shim = await withShimServer();
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-vcp-shim-test-'));
  try {
    const result = await runGovernedVcpNativeAcceptance({
      includeWrite: true,
      endpoint: shim.url,
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
      writeEvidence: 'acceptance evidence'
    });

    assert.equal(result.accepted, true);
    assert.equal(result.summary.governedDimensions.runtimeTarget, true);
    assert.equal(result.summary.governedDimensions.auditReceipt, true);
    assert.equal(result.summary.governedDimensions.rollbackPosture, true);
    assert.equal(result.operations.read.access.memoryReadPerformed, true);
    assert.equal(result.operations.read.access.memoryWritePerformed, false);
    assert.equal(result.operations.write.access.memoryReadPerformed, false);
    assert.equal(result.operations.write.access.memoryWritePerformed, true);
    assert.equal(result.operations.read.receipt.nativeInvocation.toolName, 'search_memory');
    assert.equal(result.operations.write.receipt.nativeInvocation.toolName, 'record_memory');
    assert.equal(shim.calls.some(call => call.tool === 'search'), true);
    assert.equal(shim.calls.some(call => call.tool === 'record'), true);
  } finally {
    await shim.close();
  }
});
