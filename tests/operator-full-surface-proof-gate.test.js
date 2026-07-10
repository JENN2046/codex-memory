'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createConfig } = require('../src/config/createConfig');
const {
  getPublicToolDefinitions
} = require('../src/adapters/codex-mcp/server');
const {
  DEFAULT_PUBLIC_PROPOSAL_ONLY_TOOLS,
  OPERATOR_FULL_SURFACE_TOOLS,
  evaluateOperatorFullSurfaceProof
} = require('../src/core/OperatorFullSurfaceProofGate');

const ENV_KEYS = [
  'CODEX_MEMORY_SECURITY_PROFILE',
  'CODEX_MEMORY_MCP_PUBLIC_TOOL_SURFACE',
  'CODEX_MEMORY_EXPOSE_CONTROLLED_MUTATION_TOOLS',
  'CODEX_MEMORY_EXPOSE_WRITE_TOOLS',
  'CODEX_MEMORY_MCP_PUBLIC_TOOLS'
];

function withEnv(envVars, fn) {
  const restore = {};
  for (const key of ENV_KEYS) {
    restore[key] = process.env[key];
    if (Object.prototype.hasOwnProperty.call(envVars, key)) {
      process.env[key] = envVars[key];
    } else {
      delete process.env[key];
    }
  }

  try {
    return fn();
  } finally {
    for (const key of ENV_KEYS) {
      if (restore[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = restore[key];
      }
    }
  }
}

function sorted(values) {
  return [...values].sort();
}

function acceptedProof() {
  return {
    explicitEnvConfiguration: true,
    operatorIntentConfirmed: true,
    exactApprovalRequired: true,
    auditReceiptRequired: true,
    rollbackPostureRequired: true,
    noApprovalDurableMutationBlocked: true,
    defaultSurfaceUnchanged: true,
    hardenedRegressionCovered: true
  };
}

test('CM2012 accepts explicit env operator full surface without commit_memory_delta', () => {
  withEnv({
    CODEX_MEMORY_MCP_PUBLIC_TOOL_SURFACE: 'full',
    CODEX_MEMORY_EXPOSE_CONTROLLED_MUTATION_TOOLS: '1',
    CODEX_MEMORY_EXPOSE_WRITE_TOOLS: '1'
  }, () => {
    const config = createConfig();
    const publicToolNames = getPublicToolDefinitions(config).map(tool => tool.name);
    const result = evaluateOperatorFullSurfaceProof({
      config,
      publicToolNames,
      proof: acceptedProof()
    });

    assert.equal(result.accepted, true, result.blockers.join(', '));
    assert.deepEqual(
      sorted(publicToolNames),
      sorted([...DEFAULT_PUBLIC_PROPOSAL_ONLY_TOOLS, ...OPERATOR_FULL_SURFACE_TOOLS])
    );
    assert.equal(result.publicSurface.commitMemoryDeltaPublicRegistered, false);
    assert.equal(result.policy.nativeWriteProductionEnabled, false);
    assert.equal(result.policy.durableMutationPerformed, false);
    assert.equal(result.policy.providerApiCalled, false);
    assert.equal(result.policy.readinessClaimed, false);
    assert.equal(result.nextGate, 'native_write_production_proof_requires_separate_exact_approval');
  });
});

test('CM2012 default surface is not accepted as operator full surface', () => {
  withEnv({}, () => {
    const config = createConfig();
    const publicToolNames = getPublicToolDefinitions(config).map(tool => tool.name);
    const result = evaluateOperatorFullSurfaceProof({
      config,
      publicToolNames,
      proof: acceptedProof()
    });

    assert.equal(result.accepted, false);
    assert.ok(result.blockers.includes('explicit_operator_full_surface_config_missing'));
    for (const toolName of OPERATOR_FULL_SURFACE_TOOLS) {
      assert.ok(result.blockers.includes(`missing_operator_tool_${toolName}`));
    }
    assert.deepEqual(sorted(publicToolNames), sorted(DEFAULT_PUBLIC_PROPOSAL_ONLY_TOOLS));
  });
});

test('CM2012 hardened env cannot expose operator full surface', () => {
  withEnv({
    CODEX_MEMORY_SECURITY_PROFILE: 'hardened',
    CODEX_MEMORY_MCP_PUBLIC_TOOL_SURFACE: 'full',
    CODEX_MEMORY_EXPOSE_CONTROLLED_MUTATION_TOOLS: '1',
    CODEX_MEMORY_EXPOSE_WRITE_TOOLS: '1',
    CODEX_MEMORY_MCP_PUBLIC_TOOLS: 'record_memory,validate_memory,tombstone_memory,supersede_memory'
  }, () => {
    const config = createConfig();
    const publicToolNames = getPublicToolDefinitions(config).map(tool => tool.name);
    const result = evaluateOperatorFullSurfaceProof({
      config,
      publicToolNames,
      proof: acceptedProof()
    });

    assert.equal(config.securityProfile, 'hardened');
    assert.deepEqual(sorted(publicToolNames), sorted(DEFAULT_PUBLIC_PROPOSAL_ONLY_TOOLS));
    assert.equal(result.accepted, false);
    assert.ok(result.blockers.includes('hardened_profile_must_not_expose_operator_full_surface'));
    assert.ok(result.blockers.includes('explicit_operator_full_surface_config_missing'));
    assert.equal(result.policy.hardenedRejected, true);
  });
});

test('CM2012 rejects missing approval rollback audit proof fields', () => {
  const config = createConfig({
    mcpPublicToolSurface: 'full',
    exposeControlledMutationMcpTools: true,
    exposeWriteMcpTools: true
  });
  const publicToolNames = getPublicToolDefinitions(config).map(tool => tool.name);
  const result = evaluateOperatorFullSurfaceProof({
    config,
    publicToolNames,
    proof: {
      explicitEnvConfiguration: true,
      operatorIntentConfirmed: true,
      defaultSurfaceUnchanged: true,
      hardenedRegressionCovered: true
    }
  });

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('missing_exactApprovalRequired'));
  assert.ok(result.blockers.includes('missing_auditReceiptRequired'));
  assert.ok(result.blockers.includes('missing_rollbackPostureRequired'));
  assert.ok(result.blockers.includes('missing_noApprovalDurableMutationBlocked'));
});

test('CM2012 rejects commit_memory_delta in public operator surface', () => {
  const config = createConfig({
    mcpPublicToolSurface: 'full',
    exposeControlledMutationMcpTools: true,
    exposeWriteMcpTools: true
  });
  const publicToolNames = [
    ...getPublicToolDefinitions(config).map(tool => tool.name),
    'commit_memory_delta'
  ];
  const result = evaluateOperatorFullSurfaceProof({
    config,
    publicToolNames,
    proof: acceptedProof()
  });

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('forbidden_default_tool_commit_memory_delta'));
  assert.equal(result.publicSurface.commitMemoryDeltaPublicRegistered, true);
});
