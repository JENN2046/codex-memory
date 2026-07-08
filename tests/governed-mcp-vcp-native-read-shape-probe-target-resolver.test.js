'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  validateGovernedMcpVcpNativeBridgeGate
} = require('../src/core/GovernedMcpVcpNativeBridgeGate');
const {
  REQUIRED_ACCESS_PATH,
  REQUIRED_CLIENTS,
  REQUIRED_GOVERNED_DIMENSIONS,
  REQUIRED_LOCAL_MEMORY_ROLE,
  REQUIRED_PRIMARY_RUNTIME,
  REQUIRED_PRIMARY_VALUE
} = require('../src/core/CurrentProductGoalContract');
const {
  SOURCE_AUTHORITY
} = require('../src/core/GovernedMcpVcpNativeRuntimeTargetConfig');
const {
  normalizeInvokerRegistry,
  resolveGovernedMcpVcpNativeReadShapeProbeTarget
} = require('../src/core/GovernedMcpVcpNativeReadShapeProbeTargetResolver');

function gateResult(overrides = {}) {
  return validateGovernedMcpVcpNativeBridgeGate({
    product_goal: {
      primary_runtime: REQUIRED_PRIMARY_RUNTIME,
      primary_value: REQUIRED_PRIMARY_VALUE,
      clients: [...REQUIRED_CLIENTS],
      access_path: REQUIRED_ACCESS_PATH,
      governed_dimensions: [...REQUIRED_GOVERNED_DIMENSIONS],
      local_memory_role: [...REQUIRED_LOCAL_MEMORY_ROLE]
    },
    bridge_request: {
      client_id: 'Codex',
      scope: {
        project_id: 'codex-memory',
        workspace_id: 'workspace-alpha',
        visibility: 'private'
      },
      runtime_target: {
        kind: 'vcp_toolbox_native_memory',
        target_name: 'VCPToolBox native memory',
        target_reference_name: 'operator-vcp-toolbox-service-ref',
        target_kind: 'mcp_server',
        configured: true,
        source_authority: SOURCE_AUTHORITY
      },
      invocation_profile: {
        transport: 'mcp',
        profile: 'governed_read_only',
        tool_name: 'search_memory'
      },
      read_write_authority: {
        read: true,
        write: false
      },
      output_disclosure_budget: {
        level: 'summary',
        low_disclosure: true,
        raw_output: false,
        max_items: 5,
        max_bytes: 2048
      },
      audit_receipt: {
        required: true,
        low_disclosure: true,
        receipt_plan_id: 'cm-governed-readonly-receipt'
      },
      rollback_posture: {
        mode: 'no_runtime_state_to_rollback'
      },
      ...(overrides.bridge_request || {})
    },
    counters: {},
    ...(overrides.extra || {})
  });
}

function config(overrides = {}) {
  return {
    governedMcpVcpNativeRuntimeTarget: {
      accepted: true,
      sourceAuthority: SOURCE_AUTHORITY,
      targetReferenceName: 'operator-vcp-toolbox-service-ref',
      targetKind: 'mcp_server'
    },
    ...overrides
  };
}

test('normalizes safe invoker registry entries without exposing function material', () => {
  const registry = normalizeInvokerRegistry(new Map([
    ['operator-vcp-toolbox-service-ref', async () => []]
  ]));
  const serialized = JSON.stringify(registry);

  assert.equal(registry.accepted, true);
  assert.equal(registry.entries.length, 1);
  assert.equal(registry.entries[0].referenceName, 'operator-vcp-toolbox-service-ref');
  assert.equal(typeof registry.entries[0].invokeComponentAction, 'function');
  assert.equal(serialized.includes('invokeComponentAction'), false);
});

test('resolves a governed target reference to a registered low-disclosure invoker', async () => {
  const result = resolveGovernedMcpVcpNativeReadShapeProbeTarget({
    gateResult: gateResult(),
    config: config(),
    invokerRegistry: {
      'operator-vcp-toolbox-service-ref': {
        invokeComponentAction: async ({ targetReferenceName }) => {
          assert.equal(targetReferenceName, 'operator-vcp-toolbox-service-ref');
          return [];
        },
        transportCategory: 'local_http_transport',
        targetKind: 'mcp_server'
      }
    }
  });

  assert.equal(result.accepted, true);
  assert.equal(result.targetResolved, true);
  assert.equal(result.transportCategory, 'local_http_transport');
  assert.equal(result.locatorPreflight.accepted, true);
  assert.equal(result.locatorPreflight.acceptedTargets[0].referenceName, 'operator-vcp-toolbox-service-ref');
  assert.equal(result.locatorPreflight.acceptedTargets[0].locatorValueIncluded, false);
  assert.equal(result.rawLocatorDisclosed, false);
  assert.deepEqual(await result.invokeComponentAction({
    targetReferenceName: 'operator-vcp-toolbox-service-ref'
  }), []);
});

test('does not resolve when no invoker is registered for the governed target reference', () => {
  const result = resolveGovernedMcpVcpNativeReadShapeProbeTarget({
    gateResult: gateResult(),
    config: config(),
    invokerRegistry: {}
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'no_registered_invoker_for_governed_runtime_target_reference');
  assert.equal(result.locatorPreflight.accepted, true);
  assert.equal(result.locatorPreflight.noTargetFound, true);
  assert.equal(result.invokeComponentAction, null);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.memoryWritten, false);
});

test('rejects forbidden locator and secret fields in registered invoker entries without echoing values', () => {
  const result = resolveGovernedMcpVcpNativeReadShapeProbeTarget({
    gateResult: gateResult(),
    config: config(),
    invokerRegistry: {
      'operator-vcp-toolbox-service-ref': {
        invokeComponentAction: async () => [],
        endpoint: 'PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
        bearerToken: 'SECRET_TOKEN_SHOULD_NOT_ECHO'
      }
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'registered_invoker_contains_forbidden_locator_or_secret_fields');
  assert.ok(result.forbiddenFields.includes('registry[0].entry.endpoint'));
  assert.ok(result.forbiddenFields.includes('registry[0].entry.bearerToken'));
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SECRET_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(result.invokeComponentAction, null);
});

test('rejects target reference drift between gate and bridge config', () => {
  const result = resolveGovernedMcpVcpNativeReadShapeProbeTarget({
    gateResult: gateResult(),
    config: config({
      governedMcpVcpNativeRuntimeTarget: {
        accepted: true,
        sourceAuthority: SOURCE_AUTHORITY,
        targetReferenceName: 'different-vcp-toolbox-ref',
        targetKind: 'mcp_server'
      }
    }),
    invokerRegistry: {
      'operator-vcp-toolbox-service-ref': async () => []
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_governed_read_shape_probe_target_resolution_boundary');
  assert.ok(result.invalidFields.includes('config.governedMcpVcpNativeRuntimeTarget.targetReferenceName'));
  assert.equal(result.runtimeCalled, false);
});

test('rejects target resolution when runtime target forbidden field evidence survived gate', () => {
  const gate = gateResult();
  gate.normalizedBridgeRequest.runtime_target_forbidden_field_count = 2;
  gate.normalizedBridgeRequest.runtime_target_forbidden_field_path =
    'runtimeTarget.endpointUrl.PRIVATE_ENDPOINT_SHOULD_NOT_ECHO';

  const result = resolveGovernedMcpVcpNativeReadShapeProbeTarget({
    gateResult: gate,
    config: config(),
    invokerRegistry: {
      'operator-vcp-toolbox-service-ref': async () => {
        throw new Error('should_not_resolve');
      }
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_governed_read_shape_probe_target_resolution_boundary');
  assert.ok(result.invalidFields.includes(
    'gateResult.normalizedBridgeRequest.runtime_target_forbidden_field_count'
  ));
  assert.equal(result.invokeComponentAction, null);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.networkCalled, false);
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
});
