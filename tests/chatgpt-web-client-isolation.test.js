'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createConfig } = require('../src/config/createConfig');
const {
  CodexMemoryMcpServer,
  formatToolResult
} = require('../src/adapters/codex-mcp/server');
const {
  buildChatGptWebTrustedExecutionContext
} = require('../src/core/ChatGptWebTrustedExecutionContext');

const CHATGPT_WEB_CONTEXT = Object.freeze({
  channelIdentity: 'chatgpt_web'
});
const ALL_PUBLIC_TOOL_NAMES = Object.freeze([
  'audit_memory',
  'memory_overview',
  'prepare_memory_context',
  'propose_memory_delta',
  'record_memory',
  'search_memory',
  'supersede_memory',
  'tombstone_memory',
  'validate_memory'
]);
const HIDDEN_SCOPE_FIELD_NAMES = new Set([
  'project_id',
  'projectId',
  'workspace_id',
  'workspaceId',
  'scope_id',
  'scopeId',
  'client_id',
  'clientId',
  'visibility',
  'visibility_policy',
  'visibilityPolicy'
]);

function createChatGptWebConfig(profileId, overrides = {}) {
  return createConfig({
    chatgptWebProfileId: profileId,
    chatgptWebProfileEnabled: true,
    chatgptWebProjectId: 'synthetic-project',
    chatgptWebWorkspaceId: 'synthetic-workspace',
    chatgptWebScopeId: 'synthetic-scope',
    chatgptWebVisibility: 'project',
    mcpPublicToolSurface: 'full',
    mcpPublicToolNames: ALL_PUBLIC_TOOL_NAMES,
    exposeControlledMutationMcpTools: true,
    exposeWriteMcpTools: true,
    ...overrides
  });
}

function createFakeApp(config, payload = { decision: 'accepted' }) {
  const calls = [];
  return {
    calls,
    app: {
      config,
      async callTool(toolName, args, requestContext) {
        calls.push({ toolName, args, requestContext });
        return payload;
      }
    }
  };
}

function findHiddenScopeFields(value, path = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findHiddenScopeFields(item, `${path}[${index}]`));
  }
  if (!value || typeof value !== 'object') {
    return [];
  }

  const fields = [];
  for (const [key, nestedValue] of Object.entries(value)) {
    const nestedPath = path ? `${path}.${key}` : key;
    if (HIDDEN_SCOPE_FIELD_NAMES.has(key)) fields.push(nestedPath);
    if (typeof nestedValue === 'string' && HIDDEN_SCOPE_FIELD_NAMES.has(nestedValue)) {
      fields.push(nestedPath);
    }
    fields.push(...findHiddenScopeFields(nestedValue, nestedPath));
  }
  return fields;
}

async function listTools(server) {
  return server.handleJsonRpc({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  }, CHATGPT_WEB_CONTEXT);
}

test('ChatGPT web profile stays disabled by default and fails closed without a complete server scope', async () => {
  const disabledConfig = createConfig({
    chatgptWebProfileId: 'off',
    chatgptWebProfileEnabled: false
  });
  assert.equal(disabledConfig.chatgptWebProfile.enabled, false);
  assert.equal(disabledConfig.chatgptWebProfile.profileId, 'off');

  const incompleteConfig = createChatGptWebConfig('chatgpt_web_read_only_v1', {
    chatgptWebScopeId: 'unsafe/scope'
  });
  assert.equal(incompleteConfig.chatgptWebProfile.enabled, false);
  assert.equal(
    incompleteConfig.chatgptWebProfile.activationError,
    'scope_trusted_context_missing'
  );

  const { app, calls } = createFakeApp(incompleteConfig);
  const server = new CodexMemoryMcpServer({ app });
  const result = await listTools(server);

  assert.equal(result.response.error.code, -32001);
  assert.equal(result.response.error.data.code, 'scope_trusted_context_missing');
  assert.equal(calls.length, 0);
});

test('ChatGPT web v0, v1, and v2 ceilings remain narrower than every local public-tool setting', async () => {
  const cases = [
    {
      profileId: 'chatgpt_web_transport_probe_v0',
      expectedTools: ['memory_overview']
    },
    {
      profileId: 'chatgpt_web_read_only_v1',
      expectedTools: ['audit_memory', 'memory_overview', 'search_memory']
    },
    {
      profileId: 'chatgpt_web_context_v2',
      expectedTools: ['audit_memory', 'memory_overview', 'search_memory']
    }
  ];

  for (const profileCase of cases) {
    const config = createChatGptWebConfig(profileCase.profileId);
    const { app } = createFakeApp(config);
    const server = new CodexMemoryMcpServer({ app });
    const result = await listTools(server);

    assert.deepEqual(
      result.response.result.tools.map(tool => tool.name).sort(),
      profileCase.expectedTools
    );
  }

  const v2Config = createChatGptWebConfig('chatgpt_web_context_v2');
  assert.deepEqual(v2Config.chatgptWebProfile.toolCeiling, [
    'memory_overview',
    'search_memory',
    'audit_memory',
    'prepare_memory_context'
  ]);
  assert.equal(v2Config.chatgptWebProfile.prepareMemoryContextExposure, false);
  assert.deepEqual(v2Config.chatgptWebProfile.pendingCompositeToolNames, [
    'prepare_memory_context'
  ]);

  const tamperedConfig = createChatGptWebConfig('chatgpt_web_read_only_v1');
  tamperedConfig.chatgptWebProfile = {
    ...tamperedConfig.chatgptWebProfile,
    exposedToolNames: ['record_memory', 'prepare_memory_context'],
    prepareMemoryContextExposure: true
  };
  const { app: tamperedApp } = createFakeApp(tamperedConfig);
  const tamperedServer = new CodexMemoryMcpServer({ app: tamperedApp });
  const tamperedList = await listTools(tamperedServer);
  assert.deepEqual(
    tamperedList.response.result.tools.map(tool => tool.name).sort(),
    ['audit_memory', 'memory_overview', 'search_memory']
  );
});

test('ChatGPT web projects schemas and metadata without raw server-fixed scope fields', async () => {
  const config = createChatGptWebConfig('chatgpt_web_read_only_v1');
  const { app } = createFakeApp(config);
  const server = new CodexMemoryMcpServer({ app });
  const initialization = await server.handleJsonRpc({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {}
  }, CHATGPT_WEB_CONTEXT);
  const list = await listTools(server);
  const publicShape = {
    initialization: initialization.response.result,
    tools: list.response.result.tools
  };

  assert.deepEqual(findHiddenScopeFields(publicShape), []);
  assert.match(initialization.response.result.instructions, /server profile/);
  assert.equal(
    initialization.response.result._meta.codexMemoryGovernedBridge
      .chatgptWebProfile.serverFixedScopeValuesReturned,
    false
  );
});

test('ChatGPT web builds a server-fixed context, strips it from output, and blocks runtime invocation', async () => {
  const config = createChatGptWebConfig('chatgpt_web_read_only_v1');
  const syntheticScopeMarker = 'SYNTHETIC_SCOPE_MARKER';
  const payload = {
    decision: 'accepted',
    projectId: syntheticScopeMarker,
    workspaceId: syntheticScopeMarker,
    scopeId: syntheticScopeMarker,
    clientId: 'chatgpt_web',
    visibility: 'project',
    summary: 'synthetic-project synthetic-workspace synthetic-scope',
    payload: { status: 'synthetic' }
  };
  const { app, calls } = createFakeApp(config, payload);
  const server = new CodexMemoryMcpServer({ app });
  const trustedContext = buildChatGptWebTrustedExecutionContext(config.chatgptWebProfile);
  assert.equal(trustedContext.accepted, true);
  assert.deepEqual(trustedContext.requestContext.executionContext, {
    agentAlias: 'chatgpt_web',
    agentId: 'chatgpt_web',
    requestSource: 'chatgpt_web_mcp',
    projectId: 'synthetic-project',
    workspaceId: 'synthetic-workspace',
    scopeId: 'synthetic-scope',
    clientId: 'chatgpt_web',
    visibility: 'project'
  });

  const projectedResult = formatToolResult(payload, false, config.chatgptWebProfile);
  assert.equal(JSON.stringify(projectedResult).includes(syntheticScopeMarker), false);
  assert.equal(JSON.stringify(projectedResult).includes('synthetic-project'), false);
  assert.equal(JSON.stringify(projectedResult).includes('synthetic-workspace'), false);
  assert.equal(JSON.stringify(projectedResult).includes('synthetic-scope'), false);
  assert.deepEqual(findHiddenScopeFields(projectedResult.structuredContent), []);

  const runtimeResult = await server.handleJsonRpc({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'search_memory',
      arguments: {
        query: 'synthetic M1 contract query'
      }
    }
  }, {
    ...CHATGPT_WEB_CONTEXT,
    executionContext: {
      projectId: 'untrusted-transport-project',
      clientId: 'codex'
    }
  });

  assert.equal(runtimeResult.response.error.code, -32001);
  assert.equal(runtimeResult.response.error.data.code, 'chatgpt_web_runtime_not_bound');
  assert.equal(calls.length, 0);
});

test('ChatGPT web rejects model-supplied identity or scope overrides before the application is called', async () => {
  const config = createChatGptWebConfig('chatgpt_web_read_only_v1');
  const { app, calls } = createFakeApp(config);
  const server = new CodexMemoryMcpServer({ app });

  const clientOverride = await server.handleJsonRpc({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'search_memory',
      arguments: {
        query: 'synthetic cross-client attempt',
        scope: {
          client_id: 'codex',
          visibility: 'private'
        }
      }
    }
  }, CHATGPT_WEB_CONTEXT);
  assert.equal(clientOverride.response.error.code, -32602);
  assert.equal(clientOverride.response.error.data.code, 'identity_client_override_attempt');

  const metadataOverride = await server.handleJsonRpc({
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'search_memory',
      arguments: { query: 'synthetic metadata attempt' },
      _meta: {
        codexMemoryGovernance: {
          trustedExecutionContext: {
            executionContext: {
              clientId: 'codex'
            }
          }
        }
      }
    }
  }, CHATGPT_WEB_CONTEXT);
  assert.equal(metadataOverride.response.error.code, -32602);
  assert.equal(metadataOverride.response.error.data.code, 'identity_client_override_attempt');
  assert.equal(calls.length, 0);
});

test('ChatGPT web v2 keeps prepare_memory_context hidden until M4 and never calls the app for it', async () => {
  const config = createChatGptWebConfig('chatgpt_web_context_v2');
  const { app, calls } = createFakeApp(config);
  const server = new CodexMemoryMcpServer({ app });
  const result = await server.handleJsonRpc({
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: {
      name: 'prepare_memory_context',
      arguments: {}
    }
  }, CHATGPT_WEB_CONTEXT);

  assert.equal(result.response.error.code, -32001);
  assert.equal(result.response.error.data.code, 'mcp_tool_not_exposed');
  assert.equal(calls.length, 0);
});
