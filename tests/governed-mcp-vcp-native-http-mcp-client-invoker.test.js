'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

const {
  createGovernedMcpVcpNativeHttpMcpToolCaller,
  createGovernedMcpVcpNativeHttpMcpClientInvoker,
  extractJsonRpcToolResultValue,
  GOVERNANCE_METADATA_PATH,
  GOVERNANCE_METADATA_SCHEMA_VERSION,
  normalizeHttpMcpRequestTimeoutMs,
  projectJsonRpcToolResultForReadShape
} = require('../src/core/GovernedMcpVcpNativeHttpMcpClientInvoker');

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

function validReadGovernanceMeta(overrides = {}) {
  return {
    schemaVersion: GOVERNANCE_METADATA_SCHEMA_VERSION,
    trustedExecutionContext: {
      accepted: true,
      source: 'trusted_execution_context_or_transport',
      executionContext: {
        agentAlias: 'Codex',
        clientId: 'Codex',
        projectId: 'codex-memory',
        scopeId: null,
        workspaceId: 'workspace-alpha',
        visibility: 'private'
      },
      ...(overrides.trustedExecutionContext || {})
    },
    runtimeTarget: {
      primaryRuntime: 'VCPToolBox native memory',
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server',
      sourceAuthority: 'bridge_runtime_or_static_config',
      bound: true,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false,
      ...(overrides.runtimeTarget || {})
    },
    invocationProfile: {
      profile: 'governed_read_only',
      source: 'bridge_tool_binding',
      transport: 'mcp',
      toolName: 'search_memory',
      bound: true,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false,
      ...(overrides.invocationProfile || {})
    },
    readWriteAuthority: {
      readAllowed: true,
      writeAllowed: false,
      source: 'bridge_tool_binding',
      bound: true,
      mixedReadWriteAllowed: false,
      unboundedWriteAllowed: false,
      writeRequiresExactApproval: false,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false,
      ...(overrides.readWriteAuthority || {})
    },
    outputDisclosureBudget: {
      level: 'summary',
      lowDisclosure: true,
      rawOutput: false,
      maxItems: 2,
      maxBytes: 512,
      source: 'bridge_gate_normalized_governance',
      bound: true,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false,
      ...(overrides.outputDisclosureBudget || {})
    },
    auditReceipt: {
      receipt_id: 'cm-governed-readonly-receipt',
      required: true,
      lowDisclosure: true,
      source: 'bridge_gate_normalized_governance',
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false,
      ...(overrides.auditReceipt || {})
    },
    rollbackPosture: {
      mode: 'no_runtime_state_to_rollback',
      source: 'bridge_gate_normalized_governance',
      bound: true,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverride: false,
      automaticRollbackAppliedByBridge: false,
      ...(overrides.rollbackPosture || {})
    },
    governanceTransport: {
      metadataPath: GOVERNANCE_METADATA_PATH,
      toolArgumentsMayCarryGovernance: false,
      trustedExecutionContextMustMatchTransportContext: true,
      transportContextFieldsOverrideGovernanceMetadata: true,
      ...(overrides.governanceTransport || {})
    },
    lowDisclosure: true,
    readinessClaimed: false,
    ...Object.fromEntries(
      Object.entries(overrides).filter(([key]) => ![
        'trustedExecutionContext',
        'runtimeTarget',
        'invocationProfile',
        'readWriteAuthority',
        'outputDisclosureBudget',
        'auditReceipt',
        'rollbackPosture',
        'governanceTransport'
      ].includes(key))
    )
  };
}

test('HTTP MCP invoker sends one tools/call and returns only a read-shape surrogate', async () => {
  const secretToken = 'SECRET_TOKEN_SHOULD_NOT_ECHO';
  const rawPrivateValue = 'RAW_PRIVATE_VALUE_SHOULD_NOT_ECHO';
  const server = await withJsonRpcServer(async (req, res, body) => {
    assert.equal(body.method, 'tools/call');
    assert.equal(body.params.name, 'knowledge_base.search');
    assert.equal(
      body.params._meta.codexMemoryGovernance.governanceTransport.metadataPath,
      GOVERNANCE_METADATA_PATH
    );
    assert.equal(
      body.params._meta.codexMemoryGovernance.invocationProfile.toolName,
      'search_memory'
    );
    assert.equal(body.params._meta.codexMemoryGovernance.readWriteAuthority.readAllowed, true);
    assert.equal(body.params._meta.codexMemoryGovernance.readWriteAuthority.writeAllowed, false);
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
    const result = createGovernedMcpVcpNativeHttpMcpClientInvoker({
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      endpoint: server.url,
      bearerToken: secretToken,
      mcpToolName: 'knowledge_base.search',
      requestTimeoutMs: 1000
    });
    const serializedFactoryResult = JSON.stringify(result);

    assert.equal(result.accepted, true);
    assert.equal(serializedFactoryResult.includes(server.url), false);
    assert.equal(serializedFactoryResult.includes(secretToken), false);

    const responseShape = await result.entry.invokeComponentAction({
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      component: 'KnowledgeBaseManager',
      action: 'knowledge_base.search',
      requestBody: {
        query: 'neutral route read shape probe',
        max_results: 1,
        search_all_knowledge_bases: false
      },
      governanceMeta: validReadGovernanceMeta()
    });

    assert.deepEqual(responseShape, [null]);
    assert.equal(JSON.stringify(responseShape).includes(rawPrivateValue), false);
    assert.equal(server.requests.length, 1);
    assert.equal(server.requests[0].method, 'POST');
    assert.equal(server.requests[0].headers.authorization, `Bearer ${secretToken}`);
    assert.equal(server.requests[0].body.method, 'tools/call');
    assert.equal(server.requests[0].body.params.arguments.max_results, 1);
  } finally {
    await server.close();
  }
});

test('HTTP MCP invoker rejects invalid raw locator config without echoing raw values', () => {
  const result = createGovernedMcpVcpNativeHttpMcpClientInvoker({
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    endpoint: 'file:///PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
    bearerToken: 'SECRET_TOKEN_SHOULD_NOT_ECHO',
    mcpToolName: 'knowledge_base.search'
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.ok(result.invalidFields.includes('endpoint'));
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_TOKEN_SHOULD_NOT_ECHO'), false);
});

test('HTTP MCP invoker rejects mismatched JSON-RPC response ids before read-shape projection', async () => {
  const rawWrongId = 'PRIVATE_PROBE_WRONG_JSONRPC_ID_SHOULD_NOT_ECHO';
  const rawPrivateValue = 'RAW_PRIVATE_PROBE_VALUE_SHOULD_NOT_ECHO';
  const server = await withJsonRpcServer(async (req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      id: rawWrongId,
      result: {
        structuredContent: [{
          privateFieldNameShouldNotEcho: rawPrivateValue
        }]
      }
    }));
  });

  try {
    const result = createGovernedMcpVcpNativeHttpMcpClientInvoker({
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      endpoint: server.url,
      mcpToolName: 'knowledge_base.search',
      requestTimeoutMs: 1000
    });

    await assert.rejects(
      () => result.entry.invokeComponentAction({
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        component: 'KnowledgeBaseManager',
        action: 'knowledge_base.search',
        requestBody: {},
        governanceMeta: validReadGovernanceMeta()
      }),
      error => {
        assert.equal(error.statusClass, 'transport_error');
        const serializedError = JSON.stringify(error);
        assert.equal(serializedError.includes(rawWrongId), false);
        assert.equal(serializedError.includes(rawPrivateValue), false);
        return true;
      }
    );
  } finally {
    await server.close();
  }
});

test('HTTP MCP invoker wraps external statusClass errors without echoing raw details', async () => {
  const result = createGovernedMcpVcpNativeHttpMcpClientInvoker({
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    endpoint: 'http://127.0.0.1:65535/mcp/vcp-native',
    mcpToolName: 'knowledge_base.search',
    requestTimeoutMs: 1000,
    fetchImpl: async () => {
      const error = new Error('PRIVATE_FETCH_ERROR_MESSAGE_SHOULD_NOT_ECHO');
      error.statusClass = 'https://PRIVATE_FETCH_STATUS_SHOULD_NOT_ECHO';
      throw error;
    }
  });

  await assert.rejects(
    () => result.entry.invokeComponentAction({
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      component: 'KnowledgeBaseManager',
      action: 'knowledge_base.search',
      requestBody: {},
      governanceMeta: validReadGovernanceMeta()
    }),
    error => {
      const serialized = JSON.stringify(error);
      assert.equal(error.statusClass, 'transport_error');
      assert.equal(error.message, 'http_mcp_tools_call_transport_error');
      assert.equal(serialized.includes('PRIVATE_FETCH_ERROR_MESSAGE_SHOULD_NOT_ECHO'), false);
      assert.equal(serialized.includes('PRIVATE_FETCH_STATUS_SHOULD_NOT_ECHO'), false);
      return true;
    }
  );
});

test('HTTP MCP invoker requires governed metadata before component-action request', async () => {
  let fetchCalls = 0;
  const result = createGovernedMcpVcpNativeHttpMcpClientInvoker({
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    endpoint: 'http://127.0.0.1:65535/mcp/vcp-native',
    mcpToolName: 'knowledge_base.search',
    requestTimeoutMs: 1000,
    fetchImpl: async () => {
      fetchCalls += 1;
      throw new Error('native request should not be sent without governance metadata');
    }
  });

  await assert.rejects(
    () => result.entry.invokeComponentAction({
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      component: 'KnowledgeBaseManager',
      action: 'knowledge_base.search',
      requestBody: {}
    }),
    error => {
      assert.equal(error.message, 'invalid_governance_metadata');
      assert.equal(error.statusClass, 'client_error');
      assert.deepEqual(error.invalidFields, ['governanceMeta']);
      return true;
    }
  );
  assert.equal(fetchCalls, 0);
});

test('HTTP MCP tool caller sends public tool name and keeps raw config out of factory result', async () => {
  const secretToken = 'SECRET_TOKEN_SHOULD_NOT_ECHO';
  const server = await withJsonRpcServer(async (req, res, body) => {
    assert.equal(body.method, 'tools/call');
    assert.equal(body.params.name, 'search_memory');
    assert.equal(body.params.arguments.include_content, false);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      id: body.id,
      result: {
        structuredContent: {
          results: [{ content: 'RAW_PRIVATE_VALUE_AVAILABLE_ONLY_IN_MEMORY' }]
        }
      }
    }));
  });

  try {
    const result = createGovernedMcpVcpNativeHttpMcpToolCaller({
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      endpoint: server.url,
      bearerToken: secretToken,
      requestTimeoutMs: 1000
    });
    const serializedFactoryResult = JSON.stringify(result);

    assert.equal(result.accepted, true);
    assert.equal(serializedFactoryResult.includes(server.url), false);
    assert.equal(serializedFactoryResult.includes(secretToken), false);

    const nativeValue = await result.callTool({
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      toolName: 'search_memory',
      arguments: {
        query: 'needle',
        include_content: false
      },
      governanceMeta: validReadGovernanceMeta()
    });

    assert.equal(nativeValue.results.length, 1);
    assert.equal(server.requests.length, 1);
    assert.equal(server.requests[0].headers.authorization, `Bearer ${secretToken}`);
  } finally {
    await server.close();
  }
});

test('HTTP MCP tool caller sends governed metadata through params _meta only', async () => {
  const secretToken = 'SECRET_TOKEN_SHOULD_NOT_ECHO';
  const rawPrivateValue = 'RAW_PRIVATE_VALUE_SHOULD_NOT_ECHO_IN_METADATA_TEST';
  const rawUnsafeGovernanceValue = 'PRIVATE_ENDPOINT_SHOULD_NOT_ECHO_IN_GOVERNANCE_META';
  const server = await withJsonRpcServer(async (req, res, body) => {
    assert.equal(body.method, 'tools/call');
    assert.equal(body.params.name, 'search_memory');
    assert.equal(body.params.arguments.include_content, false);
    assert.equal(body.params.arguments.governed_bridge.client_id, 'Codex');
    assert.equal(
      body.params._meta.codexMemoryGovernance.schemaVersion,
      GOVERNANCE_METADATA_SCHEMA_VERSION
    );
    assert.equal(
      body.params._meta.codexMemoryGovernance.governanceTransport.metadataPath,
      GOVERNANCE_METADATA_PATH
    );
    assert.equal(body.params._meta.codexMemoryGovernance.invocationProfile.profile, 'governed_read_only');
    assert.equal(body.params._meta.codexMemoryGovernance.readWriteAuthority.readAllowed, true);
    assert.equal(body.params._meta.codexMemoryGovernance.outputDisclosureBudget.rawOutput, false);
    assert.equal(body.params._meta.codexMemoryGovernance.auditReceipt.receipt_id, 'cm-governed-readonly-receipt');
    assert.equal(body.params._meta.codexMemoryGovernance.runtimeTarget.endpointUrl, undefined);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      id: body.id,
      result: {
        structuredContent: {
          results: [{ content: rawPrivateValue }]
        }
      }
    }));
  });

  try {
    const result = createGovernedMcpVcpNativeHttpMcpToolCaller({
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      endpoint: server.url,
      bearerToken: secretToken,
      requestTimeoutMs: 1000
    });
    const invocation = await result.callToolWithReceipt({
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      toolName: 'search_memory',
      arguments: {
        query: 'needle',
        include_content: false,
        governed_bridge: {
          client_id: 'Codex'
        }
      },
      governanceMeta: validReadGovernanceMeta({
        runtimeTarget: {
          primaryRuntime: 'VCPToolBox native memory',
          targetReferenceName: 'operator-vcp-toolbox-service-ref',
          targetKind: 'mcp_server',
          sourceAuthority: 'bridge_runtime_or_static_config',
          bound: true,
          toolArgumentsMayOverride: false,
          governanceMetadataMayOverride: false,
          endpointUrl: rawUnsafeGovernanceValue
        }
      })
    });
    const serializedRequest = JSON.stringify(server.requests[0].body);
    const serializedReceipt = JSON.stringify(invocation.receipt);

    assert.equal(invocation.receipt.governanceMetadataSent, true);
    assert.equal(invocation.receipt.governanceMetadataPath, GOVERNANCE_METADATA_PATH);
    assert.equal(invocation.receipt.governanceMetadataRawValueDisclosed, false);
    assert.equal(serializedRequest.includes(rawUnsafeGovernanceValue), false);
    assert.equal(serializedReceipt.includes(rawUnsafeGovernanceValue), false);
    assert.equal(serializedReceipt.includes(secretToken), false);
    assert.equal(serializedReceipt.includes(rawPrivateValue), false);
  } finally {
    await server.close();
  }
});

test('HTTP MCP tool caller projects native runtime receipt without raw disclosure', async () => {
  const rawPrivateValue = 'RAW_PRIVATE_NATIVE_VALUE_SHOULD_NOT_ECHO_IN_RUNTIME_RECEIPT_TEST';
  const server = await withJsonRpcServer(async (req, res, body) => {
    assert.equal(body.method, 'tools/call');
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      id: body.id,
      result: {
        structuredContent: {
          results: [{ content: rawPrivateValue }]
        },
        _meta: {
          codexMemoryNativeRuntimeReceipt: {
            nativeRuntimeCalled: true,
            nativeRuntimeInitialized: true,
            providerApiCalled: true,
            memoryReadPerformed: true,
            memoryWritePerformed: false,
            durableWritePerformed: false,
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
    const result = createGovernedMcpVcpNativeHttpMcpToolCaller({
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      endpoint: server.url,
      requestTimeoutMs: 1000
    });
    const invocation = await result.callToolWithReceipt({
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      toolName: 'search_memory',
      arguments: {
        query: 'needle',
        include_content: false
      },
      governanceMeta: validReadGovernanceMeta()
    });
    const runtimeReceipt = invocation.receipt.nativeRuntimeReceipt;
    const serializedReceipt = JSON.stringify(invocation.receipt);

    assert.equal(runtimeReceipt.present, true);
    assert.equal(runtimeReceipt.nativeRuntimeCalled, true);
    assert.equal(runtimeReceipt.nativeRuntimeInitialized, true);
    assert.equal(runtimeReceipt.providerApiCalled, true);
    assert.equal(runtimeReceipt.memoryReadPerformed, true);
    assert.equal(runtimeReceipt.memoryWritePerformed, false);
    assert.equal(runtimeReceipt.durableWritePerformed, false);
    assert.equal(runtimeReceipt.rawRuntimeOutputDisclosed, false);
    assert.equal(runtimeReceipt.rawMemoryContentDisclosed, false);
    assert.equal(runtimeReceipt.runtimeLocatorDisclosed, false);
    assert.equal(runtimeReceipt.tokenMaterialDisclosed, false);
    assert.equal(runtimeReceipt.readinessClaimed, false);
    assert.equal(serializedReceipt.includes(rawPrivateValue), false);
    assert.equal(serializedReceipt.includes(server.url), false);
  } finally {
    await server.close();
  }
});

test('HTTP MCP tool caller rejects invalid governed metadata before native request', async () => {
  const server = await withJsonRpcServer(async () => {
    throw new Error('native request should not be sent with invalid governance metadata');
  });

  try {
    const result = createGovernedMcpVcpNativeHttpMcpToolCaller({
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      endpoint: server.url,
      requestTimeoutMs: 1000
    });

    await assert.rejects(
      () => result.callToolWithReceipt({
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        toolName: 'search_memory',
        arguments: {
          query: 'needle',
          include_content: false
        },
        governanceMeta: validReadGovernanceMeta({
          outputDisclosureBudget: {
            rawOutput: true
          }
        })
      }),
      error => {
        assert.equal(error.message, 'invalid_governance_metadata');
        assert.equal(error.statusClass, 'client_error');
        assert.deepEqual(error.invalidFields, ['governanceMeta']);
        assert.equal(error.lowDisclosureReceipt.governanceMetadataSent, false);
        assert.equal(error.lowDisclosureReceipt.jsonRpcErrorReasonCode, 'invalid_governance_metadata');
        assert.equal(error.lowDisclosureReceipt.failureCategory, 'governance_rejected');
        assert.equal(error.lowDisclosureReceipt.governanceMetadataRawValueDisclosed, false);
        return true;
      }
    );
    assert.equal(server.requests.length, 0);
  } finally {
    await server.close();
  }
});

test('HTTP MCP tool caller requires governed metadata before native request', async () => {
  const server = await withJsonRpcServer(async () => {
    throw new Error('native request should not be sent without governance metadata');
  });

  try {
    const result = createGovernedMcpVcpNativeHttpMcpToolCaller({
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      endpoint: server.url,
      requestTimeoutMs: 1000
    });

    await assert.rejects(
      () => result.callToolWithReceipt({
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        toolName: 'search_memory',
        arguments: {
          query: 'needle',
          include_content: false
        }
      }),
      error => {
        assert.equal(error.message, 'invalid_governance_metadata');
        assert.equal(error.statusClass, 'client_error');
        assert.deepEqual(error.invalidFields, ['governanceMeta']);
        assert.equal(error.lowDisclosureReceipt.governanceMetadataSent, false);
        assert.equal(error.lowDisclosureReceipt.jsonRpcErrorReasonCode, 'invalid_governance_metadata');
        assert.equal(error.lowDisclosureReceipt.failureCategory, 'governance_rejected');
        assert.equal(error.lowDisclosureReceipt.governanceMetadataRawValueDisclosed, false);
        return true;
      }
    );
    assert.equal(server.requests.length, 0);
  } finally {
    await server.close();
  }
});

test('HTTP MCP tool caller can return a low-disclosure invocation receipt', async () => {
  const secretToken = 'SECRET_TOKEN_SHOULD_NOT_ECHO_IN_RECEIPT';
  const rawPrivateValue = 'RAW_PRIVATE_VALUE_SHOULD_NOT_ECHO_IN_RECEIPT';
  const server = await withJsonRpcServer(async (req, res, body) => {
    assert.equal(body.method, 'tools/call');
    assert.equal(body.params.name, 'search_memory');
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      id: body.id,
      result: {
        structuredContent: {
          results: [{ content: rawPrivateValue }]
        }
      }
    }));
  });

  try {
    const result = createGovernedMcpVcpNativeHttpMcpToolCaller({
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      endpoint: server.url,
      bearerToken: secretToken,
      requestTimeoutMs: 1000
    });

    const invocation = await result.callToolWithReceipt({
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      toolName: 'search_memory',
      arguments: {
        query: 'needle',
        include_content: false
      },
      governanceMeta: validReadGovernanceMeta()
    });
    const serializedReceipt = JSON.stringify(invocation.receipt);

    assert.equal(invocation.value.results[0].content, rawPrivateValue);
    assert.equal(invocation.receipt.transportCategory, 'local_http_transport');
    assert.equal(invocation.receipt.mcpMethod, 'tools/call');
    assert.equal(invocation.receipt.toolName, 'search_memory');
    assert.equal(invocation.receipt.requestIdCategory, 'generated_bridge_request_id');
    assert.equal(invocation.receipt.jsonRpcResponseIdMatched, true);
    assert.equal(invocation.receipt.statusClass, 'success');
    assert.equal(invocation.receipt.httpStatusClass, 'success');
    assert.equal(invocation.receipt.responseShapeCategory, 'object_top_level_kind_only_no_field_names');
    assert.equal(invocation.receipt.endpointDisclosed, false);
    assert.equal(invocation.receipt.tokenMaterialDisclosed, false);
    assert.equal(invocation.receipt.rawResponseBodyDisclosed, false);
    assert.equal(serializedReceipt.includes(server.url), false);
    assert.equal(serializedReceipt.includes(secretToken), false);
    assert.equal(serializedReceipt.includes(rawPrivateValue), false);
  } finally {
    await server.close();
  }
});

test('HTTP MCP tool caller maps public governed tool to native MCP tool without changing receipt binding', async () => {
  const server = await withJsonRpcServer(async (req, res, body) => {
    assert.equal(body.method, 'tools/call');
    assert.equal(body.params.name, 'knowledge_base.search');
    assert.equal(
      body.params._meta.codexMemoryGovernance.invocationProfile.toolName,
      'search_memory'
    );
    assert.equal(body.params._meta.codexMemoryGovernance.readWriteAuthority.readAllowed, true);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      id: body.id,
      result: {
        structuredContent: {
          results: []
        }
      }
    }));
  });

  try {
    const result = createGovernedMcpVcpNativeHttpMcpToolCaller({
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      endpoint: server.url,
      requestTimeoutMs: 1000,
      mcpToolName: 'knowledge_base.default',
      mcpToolNameByAction: {
        search_memory: 'knowledge_base.search'
      }
    });

    const invocation = await result.callToolWithReceipt({
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      toolName: 'search_memory',
      arguments: {
        query: 'needle',
        include_content: false
      },
      governanceMeta: validReadGovernanceMeta()
    });

    assert.equal(server.requests.length, 1);
    assert.equal(server.requests[0].body.params.name, 'knowledge_base.search');
    assert.equal(invocation.receipt.toolName, 'search_memory');
    assert.equal(invocation.receipt.invocationBindingMatched, undefined);
    assert.equal(invocation.receipt.jsonRpcResponseIdMatched, true);
    assert.equal(invocation.receipt.governanceMetadataPath, GOVERNANCE_METADATA_PATH);
    assert.equal(invocation.receipt.governanceMetadataSent, true);
  } finally {
    await server.close();
  }
});

test('HTTP MCP tool caller rejects unmapped actions when an action map is configured', async () => {
  let fetchCalls = 0;
  const result = createGovernedMcpVcpNativeHttpMcpToolCaller({
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    endpoint: 'http://127.0.0.1:65535/mcp/vcp-native',
    requestTimeoutMs: 1000,
    fetchImpl: async () => {
      fetchCalls += 1;
      throw new Error('network must not be called for unmapped actions');
    },
    mcpToolName: 'knowledge_base.search',
    mcpToolNameByAction: {
      search_memory: 'knowledge_base.search'
    }
  });

  await assert.rejects(
    result.callToolWithReceipt({
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      toolName: 'memory_overview',
      arguments: {},
      governanceMeta: validReadGovernanceMeta({
        invocationProfile: {
          toolName: 'memory_overview'
        }
      })
    }),
    error => {
      assert.equal(error.governedMcpVcpNativeHttpMcpStatusError, true);
      assert.equal(error.message, 'invalid_native_mcp_tool_mapping');
      assert.equal(error.statusClass, 'client_error');
      assert.equal(error.lowDisclosureReceipt.toolName, 'memory_overview');
      return true;
    }
  );
  assert.equal(fetchCalls, 0);
});

test('HTTP MCP tool caller uses configured single native MCP tool name', async () => {
  const server = await withJsonRpcServer(async (req, res, body) => {
    assert.equal(body.method, 'tools/call');
    assert.equal(body.params.name, 'knowledge_base.search');
    assert.equal(
      body.params._meta.codexMemoryGovernance.invocationProfile.toolName,
      'search_memory'
    );
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      id: body.id,
      result: {
        structuredContent: {
          results: []
        }
      }
    }));
  });

  try {
    const result = createGovernedMcpVcpNativeHttpMcpToolCaller({
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      endpoint: server.url,
      requestTimeoutMs: 1000,
      mcpToolName: 'knowledge_base.search'
    });

    const invocation = await result.callToolWithReceipt({
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      toolName: 'search_memory',
      arguments: {
        query: 'needle',
        include_content: false
      },
      governanceMeta: validReadGovernanceMeta()
    });

    assert.equal(server.requests.length, 1);
    assert.equal(server.requests[0].body.params.name, 'knowledge_base.search');
    assert.equal(invocation.receipt.toolName, 'search_memory');
    assert.equal(invocation.receipt.jsonRpcResponseIdMatched, true);
    assert.equal(invocation.receipt.governanceMetadataSent, true);
  } finally {
    await server.close();
  }
});

test('HTTP MCP tool caller rejects payload target drift before network dispatch', async () => {
  let fetchCalls = 0;
  const result = createGovernedMcpVcpNativeHttpMcpToolCaller({
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    endpoint: 'http://127.0.0.1:65535/mcp/vcp-native',
    requestTimeoutMs: 1000,
    fetchImpl: async () => {
      fetchCalls += 1;
      throw new Error('fetch should not run for target drift');
    }
  });

  await assert.rejects(
    () => result.callToolWithReceipt({
      targetReferenceName: 'other-vcp-toolbox-service-ref',
      toolName: 'search_memory',
      arguments: {}
    }),
    error => {
      const serializedReceipt = JSON.stringify(error.lowDisclosureReceipt);
      assert.equal(error.message, 'target_reference_mismatch');
      assert.equal(error.statusClass, 'client_error');
      assert.equal(error.lowDisclosureReceipt.targetReferenceName, 'operator-vcp-toolbox-service-ref');
      assert.equal(error.lowDisclosureReceipt.toolName, 'search_memory');
      assert.equal(error.lowDisclosureReceipt.statusClass, 'client_error');
      assert.equal(error.lowDisclosureReceipt.responseShapeCategory, 'not_consumed');
      assert.equal(serializedReceipt.includes('other-vcp-toolbox-service-ref'), false);
      return true;
    }
  );

  assert.equal(fetchCalls, 0);
});

test('HTTP MCP tool caller attaches low-disclosure receipt to JSON-RPC errors', async () => {
  const rawErrorMessage = 'RAW_JSONRPC_ERROR_SHOULD_NOT_ECHO';
  const server = await withJsonRpcServer(async (req, res, body) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      id: body.id,
      error: {
        code: -32000,
        message: rawErrorMessage,
        data: {
          reasonCode: 'native_runtime_call_failed',
          rawDetail: 'PRIVATE_JSONRPC_DETAIL_SHOULD_NOT_ECHO'
        }
      }
    }));
  });

  try {
    const result = createGovernedMcpVcpNativeHttpMcpToolCaller({
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      endpoint: server.url,
      requestTimeoutMs: 1000
    });

    await assert.rejects(
      () => result.callToolWithReceipt({
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        toolName: 'search_memory',
        arguments: {},
        governanceMeta: validReadGovernanceMeta()
      }),
      error => {
        const serializedReceipt = JSON.stringify(error.lowDisclosureReceipt);
        assert.equal(error.statusClass, 'client_error');
        assert.equal(error.lowDisclosureReceipt.jsonRpcResponseIdMatched, true);
        assert.equal(error.lowDisclosureReceipt.jsonRpcErrorPresent, true);
        assert.equal(error.lowDisclosureReceipt.jsonRpcErrorReasonCode, 'native_runtime_call_failed');
        assert.equal(error.lowDisclosureReceipt.failureCategory, 'native_runtime_failed');
        assert.equal(error.lowDisclosureReceipt.rawResponseBodyDisclosed, false);
        assert.equal(serializedReceipt.includes(rawErrorMessage), false);
        assert.equal(serializedReceipt.includes('PRIVATE_JSONRPC_DETAIL_SHOULD_NOT_ECHO'), false);
        return true;
      }
    );
  } finally {
    await server.close();
  }
});

test('HTTP MCP tool caller classifies provider embedding failure without raw error disclosure', async () => {
  const rawErrorMessage = 'RAW_PROVIDER_ERROR_SHOULD_NOT_ECHO';
  const server = await withJsonRpcServer(async (req, res, body) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      id: body.id,
      error: {
        code: -32000,
        message: rawErrorMessage,
        data: {
          reasonCode: 'native_provider_embedding_failed',
          rawDetail: 'PRIVATE_PROVIDER_DETAIL_SHOULD_NOT_ECHO'
        }
      }
    }));
  });

  try {
    const result = createGovernedMcpVcpNativeHttpMcpToolCaller({
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      endpoint: server.url,
      requestTimeoutMs: 1000
    });
    await assert.rejects(
      () => result.callToolWithReceipt({
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        toolName: 'search_memory',
        arguments: {},
        governanceMeta: validReadGovernanceMeta()
      }),
      error => {
        const serialized = JSON.stringify(error.lowDisclosureReceipt);
        assert.equal(error.lowDisclosureReceipt.jsonRpcErrorReasonCode, 'native_provider_embedding_failed');
        assert.equal(error.lowDisclosureReceipt.failureCategory, 'provider_embedding_failed');
        assert.equal(serialized.includes(rawErrorMessage), false);
        assert.equal(serialized.includes('PRIVATE_PROVIDER_DETAIL_SHOULD_NOT_ECHO'), false);
        return true;
      }
    );
  } finally {
    await server.close();
  }
});

test('HTTP MCP tool caller drops unsafe JSON-RPC error reason codes', async () => {
  const rawErrorMessage = 'RAW_JSONRPC_UNSAFE_REASON_ERROR_SHOULD_NOT_ECHO';
  const rawUnsafeReasonCode = 'https://PRIVATE_JSONRPC_REASON_SHOULD_NOT_ECHO';
  const server = await withJsonRpcServer(async (req, res, body) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      id: body.id,
      error: {
        code: -32000,
        message: rawErrorMessage,
        data: {
          reasonCode: rawUnsafeReasonCode
        }
      }
    }));
  });

  try {
    const result = createGovernedMcpVcpNativeHttpMcpToolCaller({
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      endpoint: server.url,
      requestTimeoutMs: 1000
    });

    await assert.rejects(
      () => result.callToolWithReceipt({
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        toolName: 'search_memory',
        arguments: {},
        governanceMeta: validReadGovernanceMeta()
      }),
      error => {
        const serializedReceipt = JSON.stringify(error.lowDisclosureReceipt);
        assert.equal(error.statusClass, 'client_error');
        assert.equal(error.lowDisclosureReceipt.jsonRpcErrorPresent, true);
        assert.equal(error.lowDisclosureReceipt.jsonRpcErrorReasonCode, null);
        assert.equal(error.lowDisclosureReceipt.failureCategory, 'native_runtime_failed');
        assert.equal(serializedReceipt.includes(rawErrorMessage), false);
        assert.equal(serializedReceipt.includes(rawUnsafeReasonCode), false);
        return true;
      }
    );
  } finally {
    await server.close();
  }
});

test('HTTP MCP tool caller rejects mismatched JSON-RPC response ids with low-disclosure receipt', async () => {
  const rawWrongId = 'PRIVATE_WRONG_JSONRPC_ID_SHOULD_NOT_ECHO';
  const server = await withJsonRpcServer(async (req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      id: rawWrongId,
      result: {
        structuredContent: {
          content: 'RAW_PRIVATE_VALUE_SHOULD_NOT_ECHO'
        }
      }
    }));
  });

  try {
    const result = createGovernedMcpVcpNativeHttpMcpToolCaller({
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      endpoint: server.url,
      requestTimeoutMs: 1000
    });

    await assert.rejects(
      () => result.callToolWithReceipt({
        targetReferenceName: 'operator-vcp-toolbox-service-ref',
        toolName: 'search_memory',
        arguments: {},
        governanceMeta: validReadGovernanceMeta()
      }),
      error => {
        const serializedReceipt = JSON.stringify(error.lowDisclosureReceipt);
        assert.equal(error.statusClass, 'transport_error');
        assert.equal(error.lowDisclosureReceipt.statusClass, 'transport_error');
        assert.equal(error.lowDisclosureReceipt.httpStatusClass, 'success');
        assert.equal(error.lowDisclosureReceipt.requestIdCategory, 'generated_bridge_request_id');
        assert.equal(error.lowDisclosureReceipt.jsonRpcResponseIdMatched, false);
        assert.equal(error.lowDisclosureReceipt.jsonRpcErrorPresent, false);
        assert.equal(error.lowDisclosureReceipt.rawResponseBodyDisclosed, false);
        assert.equal(serializedReceipt.includes(rawWrongId), false);
        assert.equal(serializedReceipt.includes('RAW_PRIVATE_VALUE_SHOULD_NOT_ECHO'), false);
        return true;
      }
    );
  } finally {
    await server.close();
  }
});

test('HTTP MCP tool caller does not echo unsafe tool names in low-disclosure error receipts', async () => {
  const result = createGovernedMcpVcpNativeHttpMcpToolCaller({
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    endpoint: 'http://127.0.0.1:65535/mcp/vcp-native',
    requestTimeoutMs: 1000,
    fetchImpl: async () => {
      throw new Error('fetch should not run for invalid tool names');
    }
  });

  await assert.rejects(
    () => result.callToolWithReceipt({
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      toolName: 'https://PRIVATE_TOOL_NAME_SHOULD_NOT_ECHO',
      arguments: {}
    }),
    error => {
      const serializedReceipt = JSON.stringify(error.lowDisclosureReceipt);
      assert.equal(error.statusClass, 'client_error');
      assert.equal(error.lowDisclosureReceipt.statusClass, 'client_error');
      assert.equal(error.lowDisclosureReceipt.toolName, null);
      assert.equal(error.lowDisclosureReceipt.transportCategory, 'local_http_transport');
      assert.equal(error.lowDisclosureReceipt.requestIdCategory, 'generated_bridge_request_id');
      assert.equal(error.lowDisclosureReceipt.responseShapeCategory, 'not_consumed');
      assert.equal(error.lowDisclosureReceipt.topLevelKindCategory, 'not_consumed');
      assert.equal(serializedReceipt.includes('PRIVATE_TOOL_NAME_SHOULD_NOT_ECHO'), false);
      return true;
    }
  );
});

test('HTTP MCP tool caller rejects safe but unauthorized tool names before network dispatch', async () => {
  let fetchCalls = 0;
  const result = createGovernedMcpVcpNativeHttpMcpToolCaller({
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    endpoint: 'http://127.0.0.1:65535/mcp/vcp-native',
    requestTimeoutMs: 1000,
    fetchImpl: async () => {
      fetchCalls += 1;
      throw new Error('fetch should not run for unauthorized tool names');
    }
  });

  await assert.rejects(
    () => result.callToolWithReceipt({
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      toolName: 'delete_all_memory',
      arguments: {}
    }),
    error => {
      const serializedReceipt = JSON.stringify(error.lowDisclosureReceipt);
      assert.equal(error.statusClass, 'client_error');
      assert.equal(error.lowDisclosureReceipt.statusClass, 'client_error');
      assert.equal(error.lowDisclosureReceipt.toolName, null);
      assert.equal(error.lowDisclosureReceipt.transportCategory, 'local_http_transport');
      assert.equal(error.lowDisclosureReceipt.responseShapeCategory, 'not_consumed');
      assert.equal(serializedReceipt.includes('delete_all_memory'), false);
      return true;
    }
  );

  assert.equal(fetchCalls, 0);
});

test('HTTP MCP tool caller wraps external statusClass errors with low-disclosure receipt', async () => {
  const result = createGovernedMcpVcpNativeHttpMcpToolCaller({
    targetReferenceName: 'operator-vcp-toolbox-service-ref',
    endpoint: 'http://127.0.0.1:65535/mcp/vcp-native',
    requestTimeoutMs: 1000,
    fetchImpl: async () => {
      const error = new Error('PRIVATE_TOOL_FETCH_ERROR_MESSAGE_SHOULD_NOT_ECHO');
      error.statusClass = 'https://PRIVATE_TOOL_FETCH_STATUS_SHOULD_NOT_ECHO';
      throw error;
    }
  });

  await assert.rejects(
    () => result.callToolWithReceipt({
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      toolName: 'search_memory',
      arguments: {},
      governanceMeta: validReadGovernanceMeta()
    }),
    error => {
      const serialized = JSON.stringify(error);
      const serializedReceipt = JSON.stringify(error.lowDisclosureReceipt);
      assert.equal(error.statusClass, 'transport_error');
      assert.equal(error.message, 'http_mcp_tools_call_transport_error');
      assert.equal(error.lowDisclosureReceipt.statusClass, 'transport_error');
      assert.equal(error.lowDisclosureReceipt.failureCategory, 'transport_unavailable');
      assert.equal(error.lowDisclosureReceipt.toolName, 'search_memory');
      assert.equal(error.lowDisclosureReceipt.rawResponseBodyDisclosed, false);
      assert.equal(serialized.includes('PRIVATE_TOOL_FETCH_ERROR_MESSAGE_SHOULD_NOT_ECHO'), false);
      assert.equal(serialized.includes('PRIVATE_TOOL_FETCH_STATUS_SHOULD_NOT_ECHO'), false);
      assert.equal(serializedReceipt.includes('PRIVATE_TOOL_FETCH_ERROR_MESSAGE_SHOULD_NOT_ECHO'), false);
      assert.equal(serializedReceipt.includes('PRIVATE_TOOL_FETCH_STATUS_SHOULD_NOT_ECHO'), false);
      return true;
    }
  );
});

test('JSON-RPC tool result projection strips object field names and primitive values', () => {
  assert.deepEqual(projectJsonRpcToolResultForReadShape({
    result: {
      structuredContent: {
        privateFieldNameShouldNotEcho: 'RAW_PRIVATE_VALUE_SHOULD_NOT_ECHO'
      }
    }
  }), {});
  assert.deepEqual(projectJsonRpcToolResultForReadShape({
    result: {
      content: [{
        type: 'text',
        text: JSON.stringify([{ privateFieldNameShouldNotEcho: 'RAW_PRIVATE_VALUE_SHOULD_NOT_ECHO' }])
      }]
    }
  }), [null]);
  assert.equal(projectJsonRpcToolResultForReadShape({
    result: {
      structuredContent: 'RAW_PRIVATE_VALUE_SHOULD_NOT_ECHO'
    }
  }), '');
});

test('JSON-RPC tool result extraction supports structuredContent and text content', () => {
  assert.deepEqual(extractJsonRpcToolResultValue({
    result: {
      structuredContent: { ok: true }
    }
  }), { ok: true });
  assert.deepEqual(extractJsonRpcToolResultValue({
    result: {
      content: [{
        type: 'text',
        text: '{"ok":true}'
      }]
    }
  }), { ok: true });
});

test('HTTP MCP timeout policy accepts bounded production-provider proof timeouts', () => {
  assert.equal(normalizeHttpMcpRequestTimeoutMs('180000'), 180000);
  assert.equal(normalizeHttpMcpRequestTimeoutMs(300000), 300000);
  assert.equal(normalizeHttpMcpRequestTimeoutMs(300001), 3000);
  assert.equal(normalizeHttpMcpRequestTimeoutMs('not-a-timeout'), 3000);
});
