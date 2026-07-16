'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  REQUIRED_ACCESS_PATH,
  REQUIRED_CLIENTS,
  REQUIRED_GOVERNED_DIMENSIONS,
  REQUIRED_LOCAL_MEMORY_ROLE,
  REQUIRED_PRIMARY_RUNTIME,
  REQUIRED_PRIMARY_VALUE,
  validateGovernedMcpBridgeGateResultCoversCurrentProductGoal
} = require('../src/core/CurrentProductGoalContract');
const {
  REQUIRED_REQUEST_DIMENSIONS,
  validateGovernedMcpVcpNativeBridgeGate
} = require('../src/core/GovernedMcpVcpNativeBridgeGate');
const {
  SOURCE_AUTHORITY
} = require('../src/core/GovernedMcpVcpNativeRuntimeTargetConfig');

function currentGoal(overrides = {}) {
  return {
    primary_runtime: REQUIRED_PRIMARY_RUNTIME,
    primary_value: REQUIRED_PRIMARY_VALUE,
    clients: [...REQUIRED_CLIENTS],
    access_path: REQUIRED_ACCESS_PATH,
    governed_dimensions: [...REQUIRED_GOVERNED_DIMENSIONS],
    local_memory_role: [...REQUIRED_LOCAL_MEMORY_ROLE],
    ...overrides
  };
}

function trustedRuntimeTarget(overrides = {}) {
  return {
    kind: 'vcp_toolbox_native_memory',
    target_name: 'VCPToolBox native memory',
    target_reference_name: 'operator-vcp-toolbox-service-ref',
    target_kind: 'mcp_server',
    configured: true,
    source_authority: SOURCE_AUTHORITY,
    locator_value_included: false,
    endpoint_included: false,
    token_material_included: false,
    config_env_read: false,
    ...overrides
  };
}

function readOnlyBridgeRequest(overrides = {}) {
  return {
    client_id: 'Codex',
    scope: {
      project_id: 'codex-memory',
      workspace_id: 'workspace-alpha',
      visibility: 'private'
    },
    runtime_target: trustedRuntimeTarget(),
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
    ...overrides
  };
}

function gateInput(overrides = {}) {
  return {
    product_goal: currentGoal(overrides.product_goal || {}),
    bridge_request: readOnlyBridgeRequest(overrides.bridge_request || {}),
    counters: {
      ...(overrides.counters || {})
    },
    ...(overrides.extra || {})
  };
}

function exactWriteApproval(overrides = {}) {
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

test('accepts Codex governed MCP read-only access to VCPToolBox native memory', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput());
  const coverage = validateGovernedMcpBridgeGateResultCoversCurrentProductGoal(result);

  assert.equal(result.accepted, true);
  assert.equal(coverage.accepted, true, coverage.blockers.join(', '));
  assert.equal(coverage.direction, 'read');
  assert.equal(result.decision, 'governed_mcp_vcp_native_bridge_gate_accepted');
  assert.deepEqual(result.requiredRequestDimensions, REQUIRED_REQUEST_DIMENSIONS);
  assert.equal(result.productGoalAccepted, true);
  assert.equal(result.normalizedBridgeRequest.client_id, 'Codex');
  assert.deepEqual(result.normalizedBridgeRequest.scope, {
    project_id: 'codex-memory',
    workspace_id: 'workspace-alpha',
    client_id: 'Codex',
    visibility: 'private'
  });
  assert.equal(result.normalizedBridgeRequest.visibility, 'private');
  assert.equal(result.normalizedBridgeRequest.runtime_target, 'VCPToolBox native memory');
  assert.equal(result.normalizedBridgeRequest.runtime_target_reference_name, 'operator-vcp-toolbox-service-ref');
  assert.equal(result.normalizedBridgeRequest.runtime_target_kind, 'mcp_server');
  assert.equal(result.normalizedBridgeRequest.runtime_target_source_authority, SOURCE_AUTHORITY);
  assert.equal(result.normalizedBridgeRequest.access_path, 'governed MCP tools');
  assert.equal(result.normalizedBridgeRequest.invocation_profile, 'governed_read_only');
  assert.equal(result.normalizedBridgeRequest.mcp_tool_name, 'search_memory');
  assert.equal(result.normalizedBridgeRequest.invocation_profile_forbidden_field_count, 0);
  assert.equal(result.normalizedBridgeRequest.read_allowed, true);
  assert.equal(result.normalizedBridgeRequest.write_allowed, false);
  assert.equal(result.normalizedBridgeRequest.read_write_authority_forbidden_field_count, 0);
  assert.equal(result.normalizedBridgeRequest.raw_output_allowed, false);
  assert.equal(result.normalizedBridgeRequest.disclosure_max_items, 5);
  assert.equal(result.normalizedBridgeRequest.disclosure_max_bytes, 2048);
  assert.equal(result.normalizedBridgeRequest.disclosure_forbidden_field_count, 0);
  assert.equal(result.normalizedBridgeRequest.audit_receipt_reference_present, true);
  assert.equal(result.normalizedBridgeRequest.audit_receipt_reference_safe, true);
  assert.equal(result.normalizedBridgeRequest.audit_receipt_reference_name, 'cm-governed-readonly-receipt');
  assert.equal(result.normalizedBridgeRequest.audit_receipt_forbidden_field_count, 0);
  assert.equal(result.normalizedBridgeRequest.rollback_posture, 'no_runtime_state_to_rollback');
  assert.equal(result.normalizedBridgeRequest.rollback_posture_forbidden_field_count, 0);
  assert.equal(result.vcpToolBoxCalled, false);
  assert.equal(result.mcpToolCalled, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(result.localMemoryReadPerformed, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.readinessClaimed, false);
});

test('accepts the frozen governed visibility contract and rejects public visibility', () => {
  for (const visibility of ['private', 'workspace', 'project', 'shared']) {
    const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
      bridge_request: {
        scope: {
          project_id: 'codex-memory',
          workspace_id: 'workspace-alpha',
          visibility
        }
      }
    }));

    assert.equal(result.accepted, true, visibility);
    assert.equal(result.normalizedBridgeRequest.visibility, visibility);
  }

  const rejected = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      scope: {
        project_id: 'codex-memory',
        workspace_id: 'workspace-alpha',
        visibility: 'public'
      }
    }
  }));

  assert.equal(rejected.accepted, false);
  assert.ok(rejected.blockers.includes('visibility_must_be_governed_visibility'));
  assert.equal(rejected.normalizedBridgeRequest.visibility, null);
  assert.equal(rejected.memoryReadPerformed, false);
});

test('rejects scope client_id that does not match the governed client identity', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      scope: {
        project_id: 'codex-memory',
        workspace_id: 'workspace-alpha',
        client_id: 'other-client',
        visibility: 'private'
      }
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('scope_client_id_must_match_client_id'));
  assert.equal(result.normalizedBridgeRequest.scope, null);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(JSON.stringify(result).includes('other-client'), false);
});

test('rejects unsafe scope identifiers before native bridge invocation', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      scope: {
        project_id: 'https://private.example/project?token=SECRET_SCOPE_SHOULD_NOT_ECHO',
        workspace_id: 'workspace-alpha',
        visibility: 'private'
      }
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('scope_identifier_must_be_safe_reference'));
  assert.equal(result.normalizedBridgeRequest.scope_identifier_present, true);
  assert.equal(result.normalizedBridgeRequest.scope_identifier_safe, false);
  assert.equal(result.normalizedBridgeRequest.scope, null);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.mcpToolCalled, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(serialized.includes('SECRET_SCOPE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('private.example'), false);
});

test('rejects scope that drifts from trusted execution context', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      scope: {
        project_id: 'other-project',
        workspace_id: 'workspace-alpha',
        visibility: 'private'
      }
    },
    extra: {
      trusted_execution_context: {
        accepted: true,
        executionContext: {
          agentAlias: 'Codex',
          projectId: 'codex-memory',
          workspaceId: 'workspace-alpha',
          visibility: 'private'
        }
      }
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('scope_must_match_trusted_execution_context'));
  assert.equal(result.normalizedBridgeRequest.trusted_execution_context_supplied, true);
  assert.equal(result.normalizedBridgeRequest.trusted_execution_context_accepted, true);
  assert.equal(result.normalizedBridgeRequest.trusted_execution_context_scope_matched, false);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.mcpToolCalled, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(serialized.includes('other-project'), false);
  assert.equal(serialized.includes('codex-memory'), false);
});

test('accepts Claude as a governed native client in the frozen product goal', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      client_id: 'Claude'
    }
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.normalizedBridgeRequest.client_id, 'Claude');
  assert.equal(result.normalizedBridgeRequest.scope.client_id, 'Claude');
  assert.equal(result.vcpToolBoxCalled, false);
});

test('rejects clients outside the frozen governed native client contract', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      client_id: 'Manual'
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('client_id_must_be_governed_native_client'));
  assert.equal(result.normalizedBridgeRequest.client_id, null);
  assert.equal(result.vcpToolBoxCalled, false);
});

test('rejects missing governed dimensions before any runtime or MCP invocation', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate({
    product_goal: currentGoal(),
    bridge_request: {
      client_id: 'Codex',
      scope: {
        visibility: 'public'
      },
      runtime_target: {
        kind: 'vcp_toolbox_native_memory'
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
        level: 'raw',
        low_disclosure: false,
        raw_output: true
      },
      audit_receipt: {
        required: true,
        low_disclosure: true
      },
      rollback_posture: {
        mode: 'no_runtime_state_to_rollback'
      }
    }
  });

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('scope_identifier_required'));
  assert.ok(result.blockers.includes('visibility_must_be_governed_visibility'));
  assert.ok(result.blockers.includes('runtime_target_reference_must_be_configured_by_bridge'));
  assert.ok(result.blockers.includes('output_disclosure_budget_must_be_low_disclosure_and_bounded'));
  assert.ok(result.blockers.includes('audit_receipt_must_be_required_low_disclosure_and_referenced'));
  assert.equal(result.lowDisclosureRejection.lowDisclosure, true);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.mcpToolCalled, false);
});

test('rejects unsafe audit receipt reference before native bridge invocation', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      audit_receipt: {
        required: true,
        low_disclosure: true,
        receipt_plan_id: 'https://private.example/receipt?token=SECRET_SHOULD_NOT_ECHO'
      }
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('audit_receipt_reference_must_be_safe_reference'));
  assert.equal(result.normalizedBridgeRequest.audit_receipt_reference_present, true);
  assert.equal(result.normalizedBridgeRequest.audit_receipt_reference_safe, false);
  assert.equal(result.normalizedBridgeRequest.audit_receipt_reference_name, null);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.mcpToolCalled, false);
  assert.equal(serialized.includes('SECRET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('private.example'), false);
});

test('rejects disclosure budget carrying locator or secret material without echoing values', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      output_disclosure_budget: {
        level: 'summary',
        low_disclosure: true,
        raw_output: false,
        max_items: 5,
        max_bytes: 2048,
        endpoint: 'https://private.example/disclosure',
        bearerToken: 'SECRET_DISCLOSURE_SHOULD_NOT_ECHO'
      }
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('output_disclosure_budget_must_not_include_locator_or_secret_material'));
  assert.equal(result.normalizedBridgeRequest.disclosure_forbidden_field_count, 2);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.mcpToolCalled, false);
  assert.equal(serialized.includes('SECRET_DISCLOSURE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('private.example'), false);
});

test('rejects audit receipt carrying locator or secret material without echoing values', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      audit_receipt: {
        required: true,
        low_disclosure: true,
        receipt_plan_id: 'cm-governed-readonly-receipt',
        storageEndpoint: 'https://private.example/audit',
        apiKey: 'SECRET_AUDIT_SHOULD_NOT_ECHO'
      }
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('audit_receipt_must_not_include_locator_or_secret_material'));
  assert.equal(result.normalizedBridgeRequest.audit_receipt_reference_name, 'cm-governed-readonly-receipt');
  assert.equal(result.normalizedBridgeRequest.audit_receipt_forbidden_field_count, 2);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.mcpToolCalled, false);
  assert.equal(serialized.includes('SECRET_AUDIT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('private.example'), false);
});

test('rejects read-only rollback plan references before native bridge invocation', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      rollback_posture: {
        mode: 'no_runtime_state_to_rollback',
        rollback_plan_ref: 'https://PRIVATE_READ_ROLLBACK_ENDPOINT_SHOULD_NOT_ECHO'
      }
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('rollback_posture_must_match_read_write_authority'));
  assert.ok(result.blockers.includes('read_only_rollback_posture_must_not_include_plan_reference'));
  assert.ok(result.blockers.includes('rollback_plan_reference_must_be_safe_reference'));
  assert.equal(result.normalizedBridgeRequest.rollback_plan_reference_present, true);
  assert.equal(result.normalizedBridgeRequest.rollback_plan_reference_safe, false);
  assert.equal(result.normalizedBridgeRequest.rollback_plan_reference_name, null);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.mcpToolCalled, false);
  assert.equal(serialized.includes('PRIVATE_READ_ROLLBACK_ENDPOINT_SHOULD_NOT_ECHO'), false);
});

test('rejects rollback posture carrying locator or secret material without echoing values', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      rollback_posture: {
        mode: 'no_runtime_state_to_rollback',
        rollbackEndpoint: 'https://private.example/rollback',
        credential: 'SECRET_ROLLBACK_SHOULD_NOT_ECHO'
      }
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('rollback_posture_must_not_include_locator_or_secret_material'));
  assert.equal(result.normalizedBridgeRequest.rollback_posture_forbidden_field_count, 2);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.mcpToolCalled, false);
  assert.equal(serialized.includes('SECRET_ROLLBACK_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('private.example'), false);
});

test('rejects making local codex-memory storage the bridge runtime target', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    product_goal: {
      primary_runtime: 'codex-memory local memory',
      primary_value: 'memory intelligence'
    },
    bridge_request: {
      runtime_target: trustedRuntimeTarget({
        kind: 'local_memory',
        target_name: 'codex-memory local memory'
      })
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('primary_runtime_must_be_vcp_toolbox_native_memory'));
  assert.ok(result.blockers.includes('primary_value_must_be_governance_not_memory_intelligence'));
  assert.ok(result.blockers.includes('runtime_target_must_be_vcp_toolbox_native_memory'));
  assert.equal(result.localMemoryReadPerformed, false);
  assert.equal(result.localMemoryWritePerformed, false);
});

test('rejects runtime target supplied with payload locator or non-bridge authority', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      runtime_target: trustedRuntimeTarget({
        target_reference_name: 'http://private-target-should-not-echo',
        source_authority: 'tool_payload',
        endpoint: 'http://private-target-should-not-echo',
        token: 'SHOULD_NOT_ECHO'
      })
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('runtime_target_reference_must_be_safe_reference'));
  assert.ok(result.blockers.includes('runtime_target_source_authority_must_be_bridge_config'));
  assert.ok(result.blockers.includes('runtime_target_must_not_include_locator_or_secret_material'));
  assert.equal(result.normalizedBridgeRequest.runtime_target_reference_name, null);
  assert.equal(result.normalizedBridgeRequest.runtime_target_forbidden_field_count, 2);
  assert.equal(JSON.stringify(result).includes('private-target-should-not-echo'), false);
  assert.equal(JSON.stringify(result).includes('SHOULD_NOT_ECHO'), false);
});

test('rejects runtime target supplied with locator or secret key variants', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      runtime_target: trustedRuntimeTarget({
        endpointUrl: 'http://PRIVATE_ENDPOINT_VARIANT_SHOULD_NOT_ECHO',
        'Bearer-Token': 'PRIVATE_BEARER_VARIANT_SHOULD_NOT_ECHO',
        nested: {
          configEnvPath: '/PRIVATE/CONFIG/PATH/SHOULD_NOT_ECHO'
        }
      })
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('runtime_target_must_not_include_locator_or_secret_material'));
  assert.equal(result.normalizedBridgeRequest.runtime_target_forbidden_field_count, 3);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.mcpToolCalled, false);
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_VARIANT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_BEARER_VARIANT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE/CONFIG/PATH'), false);
});

test('rejects runtime target supplied with authorization header variants', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      runtime_target: trustedRuntimeTarget({
        authorizationHeader: 'Bearer PRIVATE_AUTHORIZATION_HEADER_SHOULD_NOT_ECHO',
        nested: {
          httpAuthorization: 'PRIVATE_HTTP_AUTHORIZATION_SHOULD_NOT_ECHO'
        }
      })
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('runtime_target_must_not_include_locator_or_secret_material'));
  assert.equal(result.normalizedBridgeRequest.runtime_target_forbidden_field_count, 2);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.mcpToolCalled, false);
  assert.equal(serialized.includes('PRIVATE_AUTHORIZATION_HEADER_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_HTTP_AUTHORIZATION_SHOULD_NOT_ECHO'), false);
});

test('rejects write authority without exact approval and rollback posture', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      invocation_profile: {
        transport: 'mcp',
        profile: 'governed_bounded_write',
        tool_name: 'record_memory'
      },
      read_write_authority: {
        read: false,
        write: true,
        write_policy: 'operator_intent',
        unbounded_write: true
      },
      rollback_posture: {
        mode: 'no_runtime_state_to_rollback'
      }
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('read_write_authority_must_match_invocation_profile'));
  assert.ok(result.blockers.includes('unbounded_write_not_allowed'));
  assert.ok(result.blockers.includes('write_authority_requires_accepted_exact_approval'));
  assert.ok(result.blockers.includes('write_authority_exact_approval_action_must_match_mcp_tool'));
  assert.ok(result.blockers.includes('rollback_posture_must_match_read_write_authority'));
  assert.equal(result.memoryWritePerformed, false);
});

test('rejects read/write authority that drifts from the MCP tool direction', () => {
  const readToolWithWriteAuthority = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      invocation_profile: {
        transport: 'mcp',
        profile: 'governed_read_only',
        tool_name: 'search_memory'
      },
      read_write_authority: {
        read: false,
        write: true,
        write_policy: 'exact_approval',
        unbounded_write: false
      }
    }
  }));

  assert.equal(readToolWithWriteAuthority.accepted, false);
  assert.ok(readToolWithWriteAuthority.blockers.includes('read_write_authority_must_match_invocation_profile'));
  assert.equal(readToolWithWriteAuthority.normalizedBridgeRequest.read_allowed, false);
  assert.equal(readToolWithWriteAuthority.normalizedBridgeRequest.write_allowed, true);
  assert.equal(readToolWithWriteAuthority.memoryReadPerformed, false);
  assert.equal(readToolWithWriteAuthority.memoryWritePerformed, false);

  const writeToolWithReadAuthority = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      invocation_profile: {
        transport: 'mcp',
        profile: 'governed_bounded_write',
        tool_name: 'record_memory'
      },
      read_write_authority: {
        read: true,
        write: false
      },
      rollback_posture: {
        mode: 'read_only_no_write'
      }
    }
  }));

  assert.equal(writeToolWithReadAuthority.accepted, false);
  assert.ok(writeToolWithReadAuthority.blockers.includes('read_write_authority_must_match_invocation_profile'));
  assert.equal(writeToolWithReadAuthority.normalizedBridgeRequest.read_allowed, true);
  assert.equal(writeToolWithReadAuthority.normalizedBridgeRequest.write_allowed, false);
  assert.equal(writeToolWithReadAuthority.memoryReadPerformed, false);
  assert.equal(writeToolWithReadAuthority.memoryWritePerformed, false);
});

test('rejects mixed read and write authority before exact approval can authorize a mutation', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      invocation_profile: {
        transport: 'mcp',
        profile: 'governed_bounded_write',
        tool_name: 'record_memory'
      },
      read_write_authority: {
        read: true,
        write: true,
        write_policy: 'exact_approval',
        unbounded_write: false
      },
      output_disclosure_budget: {
        level: 'receipt_only',
        low_disclosure: true,
        raw_output: false,
        max_items: 0,
        max_bytes: 1024
      },
      audit_receipt: {
        required: true,
        low_disclosure: true,
        receipt_id: 'cm-governed-write-receipt'
      },
      rollback_posture: {
        mode: 'bounded_rollback_plan',
        rollback_plan_ref: 'cm-governed-write-rollback-plan'
      }
    },
    extra: {
      exact_approval_result: exactWriteApproval()
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('read_write_authority_must_match_invocation_profile'));
  assert.equal(result.normalizedBridgeRequest.read_allowed, true);
  assert.equal(result.normalizedBridgeRequest.write_allowed, true);
  assert.equal(result.normalizedBridgeRequest.exact_approval_action_matched, true);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(result.memoryWritePerformed, false);
});

test('rejects invocation profile that does not match the MCP tool direction', () => {
  const readWithWriteProfile = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      invocation_profile: {
        transport: 'mcp',
        profile: 'governed_bounded_write',
        tool_name: 'search_memory'
      }
    }
  }));

  assert.equal(readWithWriteProfile.accepted, false);
  assert.ok(readWithWriteProfile.blockers.includes('invocation_profile_must_be_governed_mcp_tool_profile'));
  assert.ok(readWithWriteProfile.blockers.includes('invocation_profile_must_match_mcp_tool_direction'));
  assert.equal(readWithWriteProfile.runtimeCalled, false);
  assert.equal(readWithWriteProfile.memoryReadPerformed, false);

  const writeWithReadProfile = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      invocation_profile: {
        transport: 'mcp',
        profile: 'governed_read_only',
        tool_name: 'record_memory'
      },
      read_write_authority: {
        read: false,
        write: true,
        write_policy: 'exact_approval',
        unbounded_write: false
      },
      rollback_posture: {
        mode: 'bounded_rollback_plan',
        rollback_plan_ref: 'cm-governed-write-rollback-plan'
      }
    },
    extra: {
      exact_approval_result: exactWriteApproval()
    }
  }));

  assert.equal(writeWithReadProfile.accepted, false);
  assert.ok(writeWithReadProfile.blockers.includes('invocation_profile_must_be_governed_mcp_tool_profile'));
  assert.ok(writeWithReadProfile.blockers.includes('invocation_profile_must_match_mcp_tool_direction'));
  assert.equal(writeWithReadProfile.runtimeCalled, false);
  assert.equal(writeWithReadProfile.memoryWritePerformed, false);
});

test('rejects invocation profile carrying locator or secret material without echoing values', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      invocation_profile: {
        transport: 'mcp',
        profile: 'governed_read_only',
        tool_name: 'search_memory',
        endpoint: 'https://private.example/profile',
        token: 'SECRET_PROFILE_SHOULD_NOT_ECHO'
      }
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('invocation_profile_must_not_include_locator_or_secret_material'));
  assert.equal(result.normalizedBridgeRequest.invocation_profile_forbidden_field_count, 2);
  assert.equal(result.normalizedBridgeRequest.invocation_profile, 'governed_read_only');
  assert.equal(result.normalizedBridgeRequest.mcp_tool_name, 'search_memory');
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.mcpToolCalled, false);
  assert.equal(serialized.includes('SECRET_PROFILE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('private.example'), false);
});

test('rejects read write authority carrying locator or secret material without echoing values', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      read_write_authority: {
        read: true,
        write: false,
        credential: 'SECRET_AUTHORITY_SHOULD_NOT_ECHO',
        authorityEndpoint: 'https://private.example/authority'
      }
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('read_write_authority_must_not_include_locator_or_secret_material'));
  assert.equal(result.normalizedBridgeRequest.read_write_authority_forbidden_field_count, 2);
  assert.equal(result.normalizedBridgeRequest.read_allowed, true);
  assert.equal(result.normalizedBridgeRequest.write_allowed, false);
  assert.equal(result.runtimeCalled, false);
  assert.equal(result.mcpToolCalled, false);
  assert.equal(serialized.includes('SECRET_AUTHORITY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('private.example'), false);
});

test('accepts bounded write shape only with exact approval, audit receipt, and rollback plan reference', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      invocation_profile: {
        transport: 'mcp',
        profile: 'governed_bounded_write',
        tool_name: 'record_memory'
      },
      read_write_authority: {
        read: false,
        write: true,
        write_policy: 'exact_approval'
      },
      output_disclosure_budget: {
        level: 'receipt_only',
        low_disclosure: true,
        raw_output: false,
        max_items: 0,
        max_bytes: 1024
      },
      audit_receipt: {
        required: true,
        low_disclosure: true,
        receipt_id: 'cm-governed-write-receipt'
      },
      rollback_posture: {
        mode: 'bounded_rollback_plan',
        rollback_plan_ref: 'cm-governed-write-rollback-plan'
      }
    },
    extra: {
      exact_approval_result: exactWriteApproval()
    }
  }));
  const coverage = validateGovernedMcpBridgeGateResultCoversCurrentProductGoal(result);

  assert.equal(result.accepted, true);
  assert.equal(coverage.accepted, true, coverage.blockers.join(', '));
  assert.equal(coverage.direction, 'write');
  assert.equal(result.normalizedBridgeRequest.write_allowed, true);
  assert.equal(result.normalizedBridgeRequest.write_policy, 'exact_approval');
  assert.equal(result.normalizedBridgeRequest.exact_approval_action, 'live_bridge_record_memory_proof');
  assert.equal(result.normalizedBridgeRequest.exact_approval_action_matched, true);
  assert.equal(result.normalizedBridgeRequest.exact_approval_scope_matched, true);
  assert.equal(result.normalizedBridgeRequest.exact_approval_runtime_target_matched, true);
  assert.equal(result.normalizedBridgeRequest.exact_approval_rollback_plan_matched, true);
  assert.equal(result.normalizedBridgeRequest.disclosure_level, 'receipt_only');
  assert.equal(result.normalizedBridgeRequest.audit_receipt_reference_name, 'cm-governed-write-receipt');
  assert.equal(result.normalizedBridgeRequest.rollback_posture, 'bounded_rollback_plan');
  assert.equal(result.normalizedBridgeRequest.rollback_plan_reference_present, true);
  assert.equal(result.normalizedBridgeRequest.rollback_plan_reference_safe, true);
  assert.equal(result.normalizedBridgeRequest.rollback_plan_reference_name, 'cm-governed-write-rollback-plan');
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(result.auditWritePerformed, false);
  assert.equal(result.rollbackApplied, false);
});

test('current product goal coverage rejects accepted gate result missing audit receipt evidence', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput());
  const tampered = {
    ...result,
    normalizedBridgeRequest: {
      ...result.normalizedBridgeRequest,
      audit_receipt_reference_present: false,
      audit_receipt_reference_safe: false,
      audit_receipt_reference_name: null
    }
  };
  const coverage = validateGovernedMcpBridgeGateResultCoversCurrentProductGoal(tampered);

  assert.equal(result.accepted, true);
  assert.equal(coverage.accepted, false);
  assert.ok(coverage.blockers.includes('audit_receipt_reference_present_must_equal_true'));
  assert.ok(coverage.blockers.includes('audit_receipt_reference_safe_must_equal_true'));
  assert.ok(coverage.blockers.includes('audit_receipt_reference_name_must_be_non_empty_string'));
  assert.equal(coverage.runtimeCalled, false);
  assert.equal(coverage.readinessClaimed, false);
});

test('rejects exact approval carrying locator or secret key variants', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      invocation_profile: {
        transport: 'mcp',
        profile: 'governed_bounded_write',
        tool_name: 'record_memory'
      },
      read_write_authority: {
        read: false,
        write: true,
        write_policy: 'exact_approval'
      },
      output_disclosure_budget: {
        level: 'receipt_only',
        low_disclosure: true,
        raw_output: false,
        max_items: 0,
        max_bytes: 1024
      },
      audit_receipt: {
        required: true,
        low_disclosure: true,
        receipt_id: 'cm-governed-write-receipt'
      },
      rollback_posture: {
        mode: 'bounded_rollback_plan',
        rollback_plan_ref: 'cm-governed-write-rollback-plan'
      }
    },
    extra: {
      exact_approval_result: exactWriteApproval({
        approvalSecret: 'PRIVATE_APPROVAL_SECRET_SHOULD_NOT_ECHO',
        runtimeTarget: {
          targetReferenceName: 'operator-vcp-toolbox-service-ref',
          targetKind: 'mcp_server',
          primaryRuntime: 'VCPToolBox native memory',
          endpointUrl: 'PRIVATE_APPROVAL_ENDPOINT_SHOULD_NOT_ECHO',
          nested: {
            configEnvPath: 'PRIVATE_APPROVAL_CONFIG_ENV_SHOULD_NOT_ECHO'
          }
        }
      })
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('write_authority_requires_accepted_exact_approval'));
  assert.ok(result.blockers.includes('write_authority_exact_approval_must_not_include_locator_or_secret_material'));
  assert.equal(result.normalizedBridgeRequest.exact_approval_forbidden_field_count, 3);
  assert.equal(result.normalizedBridgeRequest.exact_approval_action_matched, true);
  assert.equal(result.normalizedBridgeRequest.exact_approval_scope_matched, true);
  assert.equal(result.normalizedBridgeRequest.exact_approval_runtime_target_matched, true);
  assert.equal(result.normalizedBridgeRequest.exact_approval_rollback_plan_matched, true);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(result.auditWritePerformed, false);
  assert.equal(serialized.includes('PRIVATE_APPROVAL_SECRET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_APPROVAL_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_APPROVAL_CONFIG_ENV_SHOULD_NOT_ECHO'), false);
});

test('rejects exact approval action reuse across native write tools', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      invocation_profile: {
        transport: 'mcp',
        profile: 'governed_bounded_write',
        tool_name: 'tombstone_memory'
      },
      read_write_authority: {
        read: false,
        write: true,
        write_policy: 'exact_approval'
      },
      output_disclosure_budget: {
        level: 'receipt_only',
        low_disclosure: true,
        raw_output: false,
        max_items: 0,
        max_bytes: 1024
      },
      audit_receipt: {
        required: true,
        low_disclosure: true,
        receipt_id: 'cm-governed-write-receipt'
      },
      rollback_posture: {
        mode: 'bounded_rollback_plan',
        rollback_plan_ref: 'cm-governed-write-rollback-plan'
      }
    },
    extra: {
      exact_approval_result: exactWriteApproval({
        allowedAction: 'live_bridge_record_memory_proof'
      })
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('write_authority_exact_approval_action_must_match_mcp_tool'));
  assert.equal(result.normalizedBridgeRequest.mcp_tool_name, 'tombstone_memory');
  assert.equal(result.normalizedBridgeRequest.exact_approval_action, null);
  assert.equal(result.normalizedBridgeRequest.exact_approval_action_matched, false);
  assert.equal(result.normalizedBridgeRequest.exact_approval_rollback_plan_matched, true);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(serialized.includes('live_bridge_record_memory_proof'), false);
});

test('rejects exact approval scope mismatch without echoing the approved scope value', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      invocation_profile: {
        transport: 'mcp',
        profile: 'governed_bounded_write',
        tool_name: 'record_memory'
      },
      read_write_authority: {
        read: false,
        write: true,
        write_policy: 'exact_approval'
      },
      output_disclosure_budget: {
        level: 'receipt_only',
        low_disclosure: true,
        raw_output: false,
        max_items: 0,
        max_bytes: 1024
      },
      audit_receipt: {
        required: true,
        low_disclosure: true,
        receipt_id: 'cm-governed-write-receipt'
      },
      rollback_posture: {
        mode: 'bounded_rollback_plan',
        rollback_plan_ref: 'cm-governed-write-rollback-plan'
      }
    },
    extra: {
      exact_approval_result: exactWriteApproval({
        allowedScope: {
          project_id: 'other-project-should-not-echo',
          workspace_id: 'workspace-alpha',
          client_id: 'Codex',
          visibility: 'private'
        }
      })
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('write_authority_exact_approval_scope_must_match_bridge_scope'));
  assert.equal(result.normalizedBridgeRequest.exact_approval_action_matched, true);
  assert.equal(result.normalizedBridgeRequest.exact_approval_scope_matched, false);
  assert.equal(result.normalizedBridgeRequest.exact_approval_runtime_target_matched, true);
  assert.equal(result.normalizedBridgeRequest.exact_approval_rollback_plan_matched, true);
  assert.equal(serialized.includes('other-project-should-not-echo'), false);
});

test('rejects unsafe exact approval governance fields without echoing them', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      invocation_profile: {
        transport: 'mcp',
        profile: 'governed_bounded_write',
        tool_name: 'record_memory'
      },
      read_write_authority: {
        read: false,
        write: true,
        write_policy: 'exact_approval'
      },
      output_disclosure_budget: {
        level: 'receipt_only',
        low_disclosure: true,
        raw_output: false,
        max_items: 0,
        max_bytes: 1024
      },
      audit_receipt: {
        required: true,
        low_disclosure: true,
        receipt_id: 'cm-governed-write-receipt'
      },
      rollback_posture: {
        mode: 'bounded_rollback_plan',
        rollback_plan_ref: 'cm-governed-write-rollback-plan'
      }
    },
    extra: {
      exact_approval_result: exactWriteApproval({
        allowedScope: {
          project_id: 'http://PRIVATE_APPROVAL_SCOPE_SHOULD_NOT_ECHO',
          workspace_id: 'workspace-alpha',
          client_id: 'Codex',
          visibility: 'public'
        },
        runtimeTarget: {
          targetReferenceName: 'http://PRIVATE_APPROVAL_TARGET_SHOULD_NOT_ECHO',
          targetKind: 'service_url',
          primaryRuntime: 'codex-memory local runtime SHOULD_NOT_ECHO'
        },
        rollbackPlanRef: 'https://PRIVATE_APPROVAL_ROLLBACK_SHOULD_NOT_ECHO'
      })
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('write_authority_exact_approval_scope_references_must_be_safe'));
  assert.ok(result.blockers.includes('write_authority_exact_approval_scope_visibility_must_be_governed_visibility'));
  assert.ok(result.blockers.includes('write_authority_exact_approval_runtime_target_reference_must_be_safe'));
  assert.ok(result.blockers.includes('write_authority_exact_approval_runtime_target_kind_must_be_mcp_server'));
  assert.ok(result.blockers.includes('write_authority_exact_approval_runtime_target_must_be_vcp_toolbox_native_memory'));
  assert.ok(result.blockers.includes('write_authority_exact_approval_rollback_plan_reference_must_be_safe'));
  assert.equal(result.normalizedBridgeRequest.exact_approval_scope_references_safe, false);
  assert.equal(result.normalizedBridgeRequest.exact_approval_scope_visibility_accepted, false);
  assert.equal(result.normalizedBridgeRequest.exact_approval_runtime_target_reference_safe, false);
  assert.equal(result.normalizedBridgeRequest.exact_approval_runtime_target_kind_accepted, false);
  assert.equal(result.normalizedBridgeRequest.exact_approval_runtime_target_primary_runtime_accepted, false);
  assert.equal(result.normalizedBridgeRequest.exact_approval_rollback_plan_reference_safe, false);
  assert.equal(result.memoryWritePerformed, false);
  assert.equal(serialized.includes('PRIVATE_APPROVAL_SCOPE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_APPROVAL_TARGET_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_APPROVAL_ROLLBACK_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SHOULD_NOT_ECHO'), false);
});

test('rejects exact approval runtime target mismatch without echoing private target values', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      invocation_profile: {
        transport: 'mcp',
        profile: 'governed_bounded_write',
        tool_name: 'record_memory'
      },
      read_write_authority: {
        read: false,
        write: true,
        write_policy: 'exact_approval'
      },
      output_disclosure_budget: {
        level: 'receipt_only',
        low_disclosure: true,
        raw_output: false,
        max_items: 0,
        max_bytes: 1024
      },
      audit_receipt: {
        required: true,
        low_disclosure: true,
        receipt_id: 'cm-governed-write-receipt'
      },
      rollback_posture: {
        mode: 'bounded_rollback_plan',
        rollback_plan_ref: 'cm-governed-write-rollback-plan'
      }
    },
    extra: {
      exact_approval_result: exactWriteApproval({
        runtimeTarget: {
          targetReferenceName: 'other-target-should-not-echo',
          targetKind: 'mcp_server',
          primaryRuntime: 'VCPToolBox native memory'
        }
      })
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('write_authority_exact_approval_runtime_target_must_match_bridge_target'));
  assert.equal(result.normalizedBridgeRequest.exact_approval_action_matched, true);
  assert.equal(result.normalizedBridgeRequest.exact_approval_scope_matched, true);
  assert.equal(result.normalizedBridgeRequest.exact_approval_runtime_target_matched, false);
  assert.equal(result.normalizedBridgeRequest.exact_approval_rollback_plan_matched, true);
  assert.equal(serialized.includes('other-target-should-not-echo'), false);
});

test('rejects exact approval runtime target that omits the primary runtime binding', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      invocation_profile: {
        transport: 'mcp',
        profile: 'governed_bounded_write',
        tool_name: 'record_memory'
      },
      read_write_authority: {
        read: false,
        write: true,
        write_policy: 'exact_approval'
      },
      output_disclosure_budget: {
        level: 'receipt_only',
        low_disclosure: true,
        raw_output: false,
        max_items: 0,
        max_bytes: 1024
      },
      audit_receipt: {
        required: true,
        low_disclosure: true,
        receipt_id: 'cm-governed-write-receipt'
      },
      rollback_posture: {
        mode: 'bounded_rollback_plan',
        rollback_plan_ref: 'cm-governed-write-rollback-plan'
      }
    },
    extra: {
      exact_approval_result: exactWriteApproval({
        runtimeTarget: {
          targetReferenceName: 'operator-vcp-toolbox-service-ref',
          targetKind: 'mcp_server'
        }
      })
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('write_authority_exact_approval_runtime_target_must_match_bridge_target'));
  assert.ok(result.blockers.includes('write_authority_exact_approval_runtime_target_must_be_vcp_toolbox_native_memory'));
  assert.equal(result.normalizedBridgeRequest.exact_approval_runtime_target_matched, false);
  assert.equal(result.normalizedBridgeRequest.exact_approval_runtime_target_primary_runtime_accepted, false);
  assert.equal(result.memoryWritePerformed, false);
});

test('rejects exact approval rollback plan mismatch without echoing approved plan value', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      invocation_profile: {
        transport: 'mcp',
        profile: 'governed_bounded_write',
        tool_name: 'record_memory'
      },
      read_write_authority: {
        read: false,
        write: true,
        write_policy: 'exact_approval'
      },
      output_disclosure_budget: {
        level: 'receipt_only',
        low_disclosure: true,
        raw_output: false,
        max_items: 0,
        max_bytes: 1024
      },
      audit_receipt: {
        required: true,
        low_disclosure: true,
        receipt_id: 'cm-governed-write-receipt'
      },
      rollback_posture: {
        mode: 'bounded_rollback_plan',
        rollback_plan_ref: 'cm-governed-write-rollback-plan'
      }
    },
    extra: {
      exact_approval_result: exactWriteApproval({
        rollbackPlanRef: 'other-rollback-plan-should-not-echo'
      })
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('write_authority_exact_approval_rollback_plan_must_match_bridge_rollback_posture'));
  assert.equal(result.normalizedBridgeRequest.exact_approval_action_matched, true);
  assert.equal(result.normalizedBridgeRequest.exact_approval_scope_matched, true);
  assert.equal(result.normalizedBridgeRequest.exact_approval_runtime_target_matched, true);
  assert.equal(result.normalizedBridgeRequest.exact_approval_rollback_plan_matched, false);
  assert.equal(serialized.includes('other-rollback-plan-should-not-echo'), false);
});

test('rejects bridge gate evidence with nonzero side-effect counters', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    counters: {
      vcpToolBoxCalls: 1,
      mcpToolCalls: 1,
      memoryReads: 1,
      localMemoryWrites: 1,
      readinessClaims: 1
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('vcpToolBoxCalls_must_be_zero_before_bridge_gate'));
  assert.ok(result.blockers.includes('mcpToolCalls_must_be_zero_before_bridge_gate'));
  assert.ok(result.blockers.includes('memoryReads_must_be_zero_before_bridge_gate'));
  assert.ok(result.blockers.includes('localMemoryWrites_must_be_zero_before_bridge_gate'));
  assert.ok(result.blockers.includes('readinessClaims_must_be_zero_before_bridge_gate'));
  assert.equal(result.vcpToolBoxCalled, false);
  assert.equal(result.mcpToolCalled, false);
});

test('rejects read-only profile when paired with a write MCP tool', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      invocation_profile: {
        transport: 'mcp',
        profile: 'governed_read_only',
        tool_name: 'record_memory'
      }
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('read_write_authority_must_match_invocation_profile'));
  assert.equal(result.normalizedBridgeRequest.mcp_tool_name, 'record_memory');
  assert.equal(result.memoryWritePerformed, false);
});

test('rejects validate_memory as a VCPToolBox native read bridge tool', () => {
  const result = validateGovernedMcpVcpNativeBridgeGate(gateInput({
    bridge_request: {
      invocation_profile: {
        transport: 'mcp',
        profile: 'governed_read_only',
        tool_name: 'validate_memory'
      }
    }
  }));

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('read_write_authority_must_match_invocation_profile'));
  assert.equal(result.normalizedBridgeRequest.mcp_tool_name, 'validate_memory');
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(result.vcpToolBoxCalled, false);
});
