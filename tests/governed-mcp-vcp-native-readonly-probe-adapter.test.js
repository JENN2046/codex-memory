'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  validateGovernedMcpVcpNativeBridgeGate
} = require('../src/core/GovernedMcpVcpNativeBridgeGate');
const {
  buildDisposableBoundaryContractInput,
  buildGovernedMcpVcpNativeReadOnlyProbeAdapter,
  buildReadShapeProbeExecutorInput,
  buildReadShapeProbeGovernanceMetadata,
  executeGovernedMcpVcpNativeReadShapeProbe
} = require('../src/core/GovernedMcpVcpNativeReadOnlyProbeAdapter');
const {
  REQUIRED_ACCESS_PATH,
  REQUIRED_CLIENTS,
  REQUIRED_GOVERNED_DIMENSIONS,
  REQUIRED_LOCAL_MEMORY_ROLE,
  REQUIRED_PRIMARY_RUNTIME,
  REQUIRED_PRIMARY_VALUE,
  validateGovernedMcpNativeGovernanceMetadataCoversCurrentProductGoal
} = require('../src/core/CurrentProductGoalContract');
const {
  SOURCE_AUTHORITY
} = require('../src/core/GovernedMcpVcpNativeRuntimeTargetConfig');

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

test('builds a VCP native read-only no-write probe receipt from accepted governed gate', () => {
  const result = buildGovernedMcpVcpNativeReadOnlyProbeAdapter({
    toolName: 'search_memory',
    gateResult: gateResult()
  });

  assert.equal(result.accepted, true);
  assert.equal(result.receipt.targetReferenceName, 'operator-vcp-toolbox-service-ref');
  assert.equal(result.receipt.profile, 'observe-lite');
  assert.equal(result.receipt.component, 'KnowledgeBaseManager');
  assert.equal(result.receipt.action, 'knowledge_base.search');
  assert.equal(result.receipt.statusCategory, 'not_executed');
  assert.equal(result.receipt.normalizedResultStatus, 'not_executed');
  assert.deepEqual(result.receipt.shapeKeys, ['items', 'status']);
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.networkCalled, false);
  assert.equal(result.memoryReadPerformed, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.receiptWritten, false);
  assert.equal(result.publicMcpExpanded, false);
});

test('rejects write tools and unaccepted gate results before receipt construction', () => {
  const writeResult = buildGovernedMcpVcpNativeReadOnlyProbeAdapter({
    toolName: 'record_memory',
    gateResult: gateResult({
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
        rollback_posture: {
          mode: 'bounded_rollback_plan',
          rollback_plan_ref: 'rollback-plan-ref'
        }
      },
      extra: {
        exact_approval_result: {
          accepted: true
        }
      }
    })
  });
  const rejectedGate = buildGovernedMcpVcpNativeReadOnlyProbeAdapter({
    toolName: 'search_memory',
    gateResult: {
      accepted: false
    }
  });

  assert.equal(writeResult.accepted, false);
  assert.ok(writeResult.invalidFields.includes('toolName'));
  assert.ok(writeResult.invalidFields.includes('gateResult.normalizedBridgeRequest.read_allowed'));
  assert.equal(writeResult.runtimeExecuted, false);
  assert.equal(rejectedGate.accepted, false);
  assert.ok(rejectedGate.invalidFields.includes('gateResult.accepted'));
});

test('rejects unsafe or raw-output gate projection without leaking private values', () => {
  const unsafeGate = gateResult({
    bridge_request: {
      runtime_target: {
        kind: 'vcp_toolbox_native_memory',
        target_name: 'VCPToolBox native memory',
        target_reference_name: 'http://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO',
        target_kind: 'mcp_server',
        configured: true,
        source_authority: SOURCE_AUTHORITY
      },
      output_disclosure_budget: {
        level: 'structured',
        low_disclosure: false,
        raw_output: true
      }
    }
  });
  const result = buildGovernedMcpVcpNativeReadOnlyProbeAdapter({
    toolName: 'search_memory',
    gateResult: unsafeGate
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.ok(result.invalidFields.includes('gateResult.accepted'));
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.networkCalled, false);
});

test('rejects probe with low-disclosure projection that drops unsafe forged governance strings', () => {
  const acceptedGate = gateResult();
  acceptedGate.normalizedBridgeRequest.invocation_profile = 'https://PRIVATE_PROFILE_SHOULD_NOT_ECHO';
  acceptedGate.normalizedBridgeRequest.disclosure_level = 'https://PRIVATE_DISCLOSURE_SHOULD_NOT_ECHO';

  const result = buildGovernedMcpVcpNativeReadOnlyProbeAdapter({
    toolName: 'search_memory',
    gateResult: acceptedGate
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_governed_readonly_probe_boundary');
  assert.equal(result.lowDisclosureProjection.invocationProfile, null);
  assert.equal(result.lowDisclosureProjection.disclosureLevel, null);
  assert.equal(result.runtimeExecuted, false);
  assert.equal(serialized.includes('PRIVATE_PROFILE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('PRIVATE_DISCLOSURE_SHOULD_NOT_ECHO'), false);
});

test('rejects probe when runtime target forbidden field evidence survived gate', async () => {
  const acceptedGate = gateResult();
  acceptedGate.normalizedBridgeRequest.runtime_target_forbidden_field_count = 2;
  acceptedGate.normalizedBridgeRequest.runtime_target_forbidden_field_path =
    'runtimeTarget.endpointUrl.PRIVATE_ENDPOINT_SHOULD_NOT_ECHO';

  const receiptResult = buildGovernedMcpVcpNativeReadOnlyProbeAdapter({
    toolName: 'search_memory',
    gateResult: acceptedGate
  });
  const executionResult = await executeGovernedMcpVcpNativeReadShapeProbe({
    toolName: 'search_memory',
    gateResult: acceptedGate,
    invokeComponentAction: async () => {
      throw new Error('should_not_execute');
    }
  });
  const serialized = JSON.stringify({ receiptResult, executionResult });

  assert.equal(receiptResult.accepted, false);
  assert.equal(receiptResult.reasonCode, 'invalid_governed_readonly_probe_boundary');
  assert.ok(receiptResult.invalidFields.includes(
    'gateResult.normalizedBridgeRequest.runtime_target_forbidden_field_count'
  ));
  assert.equal(receiptResult.lowDisclosureProjection.runtimeTargetForbiddenFieldCount, 2);
  assert.equal(receiptResult.runtimeExecuted, false);
  assert.equal(receiptResult.networkCalled, false);
  assert.equal(executionResult.accepted, false);
  assert.equal(executionResult.reasonCode, 'invalid_governed_read_shape_probe_execution_boundary');
  assert.ok(executionResult.invalidFields.includes(
    'gateResult.normalizedBridgeRequest.runtime_target_forbidden_field_count'
  ));
  assert.equal(executionResult.runtimeExecuted, false);
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
});

test('builds executor input for a governed disposable read-shape probe without raw material', () => {
  const acceptedGate = gateResult();
  const boundary = buildDisposableBoundaryContractInput({
    toolName: 'search_memory',
    gateResult: acceptedGate
  });
  const executorInput = buildReadShapeProbeExecutorInput({
    toolName: 'search_memory',
    gateResult: acceptedGate,
    invokeComponentAction: async () => []
  });
  const governanceMetadataCoverage =
    validateGovernedMcpNativeGovernanceMetadataCoversCurrentProductGoal(
      executorInput.governanceMeta,
      { toolName: 'search_memory' }
    );
  const serialized = JSON.stringify(executorInput);

  assert.equal(boundary.taskId, 'CM-1963');
  assert.equal(boundary.targetReferenceName, 'operator-vcp-toolbox-service-ref');
  assert.equal(boundary.resolverTransportBoundary.transportMayGenerateMinimalRequestBodyInMemory, true);
  assert.equal(boundary.resolverTransportBoundary.resolverMayReadTargetFiles, false);
  assert.equal(boundary.rawDiagnosticPolicy.rawDiagnosticAuthority, false);
  assert.equal(boundary.executionPermissions.memoryWriteAllowed, false);
  assert.equal(executorInput.taskId, 'CM-1964');
  assert.equal(executorInput.targetReferenceName, 'operator-vcp-toolbox-service-ref');
  assert.equal(executorInput.governanceMeta.governanceTransport.metadataPath, 'params._meta.codexMemoryGovernance');
  assert.equal(executorInput.governanceMeta.invocationProfile.toolName, 'search_memory');
  assert.equal(governanceMetadataCoverage.accepted, true, governanceMetadataCoverage.blockers.join(', '));
  assert.equal(governanceMetadataCoverage.direction, 'read');
  assert.equal(executorInput.invokeComponentAction instanceof Function, true);
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_TOKEN_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('requestBody'), true);
});

test('exported probe input builders drop unsafe target references before direct executor use', () => {
  const acceptedGate = gateResult();
  acceptedGate.normalizedBridgeRequest.runtime_target_reference_name =
    'http://PRIVATE_ENDPOINT_SHOULD_NOT_ECHO';
  acceptedGate.normalizedBridgeRequest.runtime_target_forbidden_field_count = 2;
  acceptedGate.normalizedBridgeRequest.runtime_target_forbidden_field_path =
    'runtimeTarget.endpointUrl.RAW_TOKEN_SHOULD_NOT_ECHO';

  const boundary = buildDisposableBoundaryContractInput({
    toolName: 'search_memory',
    gateResult: acceptedGate
  });
  const executorInput = buildReadShapeProbeExecutorInput({
    toolName: 'search_memory',
    gateResult: acceptedGate,
    invokeComponentAction: async () => []
  });
  const serialized = JSON.stringify({ boundary, executorInput });

  assert.equal(boundary.targetReferenceName, null);
  assert.equal(boundary.resolverTransportBoundary.targetReferenceName, null);
  assert.equal(executorInput.targetReferenceName, null);
  assert.equal(executorInput.boundaryContractInput.targetReferenceName, null);
  assert.equal(executorInput.governanceMeta.runtimeTarget.targetReferenceName, null);
  assert.equal(serialized.includes('PRIVATE_ENDPOINT_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('RAW_TOKEN_SHOULD_NOT_ECHO'), false);
});

test('executes a governed read-shape probe through injected component invoker with low-disclosure receipt', async () => {
  const result = await executeGovernedMcpVcpNativeReadShapeProbe({
    toolName: 'search_memory',
    gateResult: gateResult(),
    invokeComponentAction: async ({
      targetReferenceName,
      component,
      action,
      requestBody,
      governanceMeta,
      maxResultCount
    }) => {
      const governanceMetadataCoverage =
        validateGovernedMcpNativeGovernanceMetadataCoversCurrentProductGoal(governanceMeta, {
          toolName: 'search_memory'
        });

      assert.equal(targetReferenceName, 'operator-vcp-toolbox-service-ref');
      assert.equal(component, 'KnowledgeBaseManager');
      assert.equal(action, 'knowledge_base.search');
      assert.equal(requestBody.max_results, 1);
      assert.equal(governanceMeta.governanceTransport.metadataPath, 'params._meta.codexMemoryGovernance');
      assert.equal(governanceMetadataCoverage.accepted, true, governanceMetadataCoverage.blockers.join(', '));
      assert.equal(maxResultCount, 1);
      return [{ rawSecretFieldThatMustNotEcho: 'RAW_RESPONSE_SHOULD_NOT_ECHO' }];
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, true);
  assert.equal(result.runtimeExecuted, true);
  assert.equal(result.liveVcpToolBoxCalled, false);
  assert.equal(result.networkCalled, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.readShapeProbeExecutionResult.receipt.statusClass, 'success');
  assert.equal(result.readShapeProbeExecutionResult.receipt.responseShapeCategory, 'array_item_count_bucket_only');
  assert.equal(result.readShapeProbeExecutionResult.receipt.itemCountBucket, 'one');
  assert.equal(result.readShapeProbeExecutionResult.receipt.governanceMetadataSent, true);
  assert.equal(
    result.readShapeProbeExecutionResult.receipt.governanceMetadataPath,
    'params._meta.codexMemoryGovernance'
  );
  assert.equal(result.readShapeProbeExecutionResult.receipt.governanceMetadataRawValueDisclosed, false);
  assert.equal(result.readShapeProbeExecutionResult.receipt.rawResponseBodyPersisted, false);
  assert.equal(serialized.includes('rawSecretFieldThatMustNotEcho'), false);
  assert.equal(serialized.includes('RAW_RESPONSE_SHOULD_NOT_ECHO'), false);
});

test('rejects governed read-shape execution when probe governance metadata no longer covers product goal', async () => {
  const acceptedGate = gateResult();
  acceptedGate.normalizedBridgeRequest.disclosure_forbidden_field_count = 1;

  const metadata = buildReadShapeProbeGovernanceMetadata({
    toolName: 'search_memory',
    gateResult: acceptedGate
  });
  const metadataCoverage =
    validateGovernedMcpNativeGovernanceMetadataCoversCurrentProductGoal(metadata, {
      toolName: 'search_memory'
    });
  const result = await executeGovernedMcpVcpNativeReadShapeProbe({
    toolName: 'search_memory',
    gateResult: acceptedGate,
    invokeComponentAction: async () => {
      throw new Error('should_not_execute_with_unbound_governance_metadata');
    }
  });

  assert.equal(metadataCoverage.accepted, false);
  assert.ok(metadataCoverage.blockers.includes('outputDisclosureBudget.bound_must_equal_true'));
  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_governed_read_shape_probe_execution_boundary');
  assert.ok(result.invalidFields.includes('governanceMeta'));
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.networkCalled, false);
});

test('rejects governed read-shape execution without an explicit invoker', async () => {
  const result = await executeGovernedMcpVcpNativeReadShapeProbe({
    toolName: 'search_memory',
    gateResult: gateResult()
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_governed_read_shape_probe_execution_boundary');
  assert.ok(result.invalidFields.includes('invokeComponentAction'));
  assert.equal(result.runtimeExecuted, false);
  assert.equal(result.memoryWritten, false);
});
