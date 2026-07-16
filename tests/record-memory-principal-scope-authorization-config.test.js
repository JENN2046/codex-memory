'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createConfig } = require('../src/config/createConfig');
const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  buildRecordMemoryPrincipalScopeAuthorizationRuntime,
  normalizeRecordMemoryPrincipalScopeAuthorizationConfig
} = require('../src/core/RecordMemoryPrincipalScopeAuthorizationConfig');
const {
  buildRecordMemoryTrustedExecutionContext
} = require('../src/core/RecordMemoryTrustedExecutionContext');

const AUTH_ENV_KEYS = [
  'CODEX_MEMORY_RECORD_MEMORY_AUTH_MODE',
  'CODEX_MEMORY_RECORD_MEMORY_ALLOWED_AGENT_ALIAS',
  'CODEX_MEMORY_RECORD_MEMORY_ALLOWED_AGENT_IDS',
  'CODEX_MEMORY_RECORD_MEMORY_ALLOWED_REQUEST_SOURCES',
  'CODEX_MEMORY_RECORD_MEMORY_ALLOWED_PROJECT_IDS',
  'CODEX_MEMORY_RECORD_MEMORY_ALLOWED_WORKSPACE_IDS',
  'CODEX_MEMORY_RECORD_MEMORY_ALLOWED_CLIENT_IDS',
  'CODEX_MEMORY_PROJECT_ID',
  'CODEX_MEMORY_WORKSPACE_ID',
  'CODEX_MEMORY_CLIENT_ID'
];

async function withEnv(values, handler) {
  const previous = new Map(AUTH_ENV_KEYS.map(key => [key, process.env[key]]));
  for (const key of AUTH_ENV_KEYS) {
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }

  try {
    await handler();
  } finally {
    for (const key of AUTH_ENV_KEYS) {
      const value = previous.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

const policy = {
  allowedAgentAlias: 'Codex',
  allowedAgentIds: ['codex-desktop', 'codex-desktop'],
  allowedRequestSources: 'codex-memory-mcp|codex-memory-mcp',
  allowedProjectIds: ['codex-memory'],
  allowedWorkspaceIds: 'workspace-alpha, workspace-alpha',
  allowedClientIds: ['codex']
};

test('CM1640 defaults record_memory principal scope authorization config to off', () => {
  const config = normalizeRecordMemoryPrincipalScopeAuthorizationConfig();
  const runtime = buildRecordMemoryPrincipalScopeAuthorizationRuntime();

  assert.equal(config.mode, 'off');
  assert.equal(config.enabled, false);
  assert.equal(config.defaultOff, true);
  assert.equal(config.strictMode, false);
  assert.equal(config.currentRuntimeAuthorizationChanged, false);
  assert.equal(config.publicMcpExpanded, false);
  assert.deepEqual(config.policy.allowedAgentIds, []);
  assert.equal(runtime.preflight, null);
  assert.equal(runtime.policy, null);
  assert.equal(runtime.strictMode, false);
});

test('CM1640 normalizes observe policy without strict enforcement', () => {
  const config = normalizeRecordMemoryPrincipalScopeAuthorizationConfig({
    mode: 'observe',
    policy
  });
  const runtime = buildRecordMemoryPrincipalScopeAuthorizationRuntime(config);

  assert.equal(config.mode, 'observe');
  assert.equal(config.enabled, true);
  assert.equal(config.observeOnly, true);
  assert.equal(config.strictMode, false);
  assert.equal(config.requiredPolicyPresent, true);
  assert.deepEqual(config.policy.allowedAgentIds, ['codex-desktop']);
  assert.deepEqual(config.policy.allowedRequestSources, ['codex-memory-mcp']);
  assert.deepEqual(config.policy.allowedWorkspaceIds, ['workspace-alpha']);
  assert.equal(typeof runtime.preflight, 'function');
  assert.deepEqual(runtime.policy, config.policy);
  assert.equal(runtime.strictMode, false);
});

test('CM1640 normalizes strict policy from flat config shape', () => {
  const config = normalizeRecordMemoryPrincipalScopeAuthorizationConfig({
    mode: 'strict',
    ...policy
  });
  const runtime = buildRecordMemoryPrincipalScopeAuthorizationRuntime(config);

  assert.equal(config.mode, 'strict');
  assert.equal(config.enabled, true);
  assert.equal(config.observeOnly, false);
  assert.equal(config.strictMode, true);
  assert.equal(config.requiredPolicyPresent, true);
  assert.equal(config.lowDisclosureRejection, true);
  assert.equal(typeof runtime.preflight, 'function');
  assert.equal(runtime.strictMode, true);
});

test('CM1640 invalid mode fails closed to off instead of accidental enforcement', () => {
  const config = normalizeRecordMemoryPrincipalScopeAuthorizationConfig({
    mode: 'production',
    policy
  });
  const runtime = buildRecordMemoryPrincipalScopeAuthorizationRuntime(config);

  assert.equal(config.mode, 'off');
  assert.equal(config.enabled, false);
  assert.equal(config.defaultOff, true);
  assert.equal(config.strictMode, false);
  assert.equal(runtime.preflight, null);
  assert.equal(runtime.policy, null);
  assert.equal(runtime.strictMode, false);
});

test('CM1642 strict mode with incomplete policy stays off', () => {
  const config = normalizeRecordMemoryPrincipalScopeAuthorizationConfig({
    mode: 'strict',
    policy: {
      allowedAgentAlias: 'Codex',
      allowedAgentIds: ['codex-desktop']
    }
  });
  const runtime = buildRecordMemoryPrincipalScopeAuthorizationRuntime(config);

  assert.equal(config.requestedMode, 'strict');
  assert.equal(config.mode, 'off');
  assert.equal(config.enabled, false);
  assert.equal(config.requiredPolicyPresent, false);
  assert.equal(config.disabledReason, 'incomplete_policy');
  assert.equal(runtime.preflight, null);
  assert.equal(runtime.policy, null);
  assert.equal(runtime.strictMode, false);
});

test('CM1642 env config exposes strict policy only when complete', async () => {
  await withEnv({
    CODEX_MEMORY_RECORD_MEMORY_AUTH_MODE: 'strict',
    CODEX_MEMORY_RECORD_MEMORY_ALLOWED_AGENT_ALIAS: 'Codex',
    CODEX_MEMORY_RECORD_MEMORY_ALLOWED_AGENT_IDS: 'codex-desktop',
    CODEX_MEMORY_RECORD_MEMORY_ALLOWED_REQUEST_SOURCES: 'codex-memory-mcp',
    CODEX_MEMORY_RECORD_MEMORY_ALLOWED_PROJECT_IDS: 'codex-memory',
    CODEX_MEMORY_RECORD_MEMORY_ALLOWED_WORKSPACE_IDS: 'workspace-alpha',
    CODEX_MEMORY_RECORD_MEMORY_ALLOWED_CLIENT_IDS: 'codex'
  }, async () => {
    const config = createConfig({ projectBasePath: process.cwd() });

    assert.equal(config.recordMemoryPrincipalScopeAuthorization.mode, 'strict');
    assert.equal(config.recordMemoryPrincipalScopeAuthorization.strictMode, true);
    assert.equal(config.recordMemoryPrincipalScopeAuthorization.requiredPolicyPresent, true);
    assert.deepEqual(
      config.recordMemoryPrincipalScopeAuthorization.policy.allowedWorkspaceIds,
      ['workspace-alpha']
    );
  });
});

test('CM1642 env mode without complete policy remains default-off', async () => {
  await withEnv({
    CODEX_MEMORY_RECORD_MEMORY_AUTH_MODE: 'strict',
    CODEX_MEMORY_RECORD_MEMORY_ALLOWED_AGENT_ALIAS: 'Codex'
  }, async () => {
    const config = createConfig({ projectBasePath: process.cwd() });

    assert.equal(config.recordMemoryPrincipalScopeAuthorization.requestedMode, 'strict');
    assert.equal(config.recordMemoryPrincipalScopeAuthorization.mode, 'off');
    assert.equal(config.recordMemoryPrincipalScopeAuthorization.enabled, false);
    assert.equal(config.recordMemoryPrincipalScopeAuthorization.disabledReason, 'incomplete_policy');
  });
});

test('CM1642 profile config can expose observe policy while defaulting off without it', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-cm1642-profile-'));
  const profilePath = path.join(tempBasePath, 'rag-profile.json');

  try {
    await fs.writeFile(profilePath, JSON.stringify({
      default: {
        recordMemoryPrincipalScopeAuthorization: {
          mode: 'observe',
          policy
        }
      }
    }));

    const config = createConfig({
      projectBasePath: tempBasePath,
      ragParamsPath: profilePath
    });

    assert.equal(config.recordMemoryPrincipalScopeAuthorization.mode, 'observe');
    assert.equal(config.recordMemoryPrincipalScopeAuthorization.observeOnly, true);
    assert.equal(config.recordMemoryPrincipalScopeAuthorization.strictMode, false);
    assert.equal(config.recordMemoryPrincipalScopeAuthorization.requiredPolicyPresent, true);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('CM1642 trusted execution context uses env/base/config sources only', async () => {
  await withEnv({
    CODEX_MEMORY_PROJECT_ID: 'codex-memory-env',
    CODEX_MEMORY_WORKSPACE_ID: 'workspace-env',
    CODEX_MEMORY_CLIENT_ID: 'codex-env',
    CODEX_MEMORY_VISIBILITY: 'workspace'
  }, async () => {
    const context = buildRecordMemoryTrustedExecutionContext({
      config: {
        allowedAgentAlias: 'Codex',
        defaultAgentId: 'codex-desktop',
        defaultRequestSource: 'codex-memory-mcp',
        defaultProjectId: 'codex-memory-config',
        defaultWorkspaceId: 'workspace-config',
        defaultClientId: 'codex-config',
        defaultVisibility: 'project'
      },
      baseRequestContext: {
        executionContext: {
          projectId: 'codex-memory-base',
          workspaceId: 'workspace-base',
          clientId: 'codex-base',
          visibility: 'private'
        }
      }
    });

    assert.deepEqual(context, {
      agentAlias: 'Codex',
      agentId: 'codex-desktop',
      requestSource: 'codex-memory-mcp',
      projectId: 'codex-memory-env',
      workspaceId: 'workspace-env',
      clientId: 'codex-env',
      visibility: 'workspace'
    });
  });
});

test('CM1642 public MCP surface remains seven tools', () => {
  assert.deepEqual(TOOL_DEFINITIONS.map(tool => tool.name).sort(), [
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
});
