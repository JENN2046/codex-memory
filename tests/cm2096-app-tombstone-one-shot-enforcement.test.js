'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createCodexMemoryApplication } = require('../src/app');

const args = {
  memory_id: 'vcp-kb-4f863f52455147c6',
  reason: 'CM-2096 append-only rollback drill for CM-2094 synthetic proof record',
  evidence: 'safe synthetic proof evidence',
  tombstone_reason: 'synthetic_proof_record_rollback_drill',
  actor_client_id: 'Codex',
  request_source: 'cm2096-frozen-rollback-v3',
  dry_run: false,
  confirm: true
};

function nativeRouteOverrides() {
  return {
    governedMcpVcpNativeReadDelegationMode: 'off',
    governedMcpVcpNativeRuntimeTarget: {
      targetReferenceName: 'cm2096-vcptoolbox-native-memory-target',
      targetKind: 'mcp_server'
    },
    governedMcpVcpNativeHttpMcpTarget: {
      endpoint: 'http://127.0.0.1:3096',
      bearerToken: 'fixture-only-token',
      mcpToolNameByAction: {
        tombstone_memory: 'knowledge_base.tombstone'
      }
    }
  };
}

function exactTombstoneApprovalResult() {
  return {
    accepted: true,
    allowedAction: 'live_bridge_tombstone_memory_proof',
    allowedScope: {
      project_id: 'codex-memory',
      workspace_id: 'codex-memory-phase8-proof',
      scope_id: 'cm2089-phase8-native-write-proof-001',
      client_id: 'Codex',
      visibility: 'project'
    },
    runtimeTarget: {
      primaryRuntime: 'VCPToolBox native memory',
      targetReferenceName: 'cm2096-vcptoolbox-native-memory-target',
      targetKind: 'mcp_server'
    },
    rollbackPlanRef: 'cm2096-append-only-logical-tombstone-rollback-drill',
    approvalDecisionReference: 'CM-2096-ER-FUTURE-TOMBSTONE-EXECUTION-DECISION',
    claimBindingHash: 'a'.repeat(64)
  };
}

function matchingRequestContext(assertion) {
  return {
    executionContext: {
      agentAlias: 'Codex',
      agentId: 'cm2096-fixture-test',
      clientId: 'codex',
      projectId: 'codex-memory',
      workspaceId: 'codex-memory-phase8-proof',
      scopeId: 'cm2089-phase8-native-write-proof-001',
      visibility: 'project',
      requestSource: 'cm2096-fixture-test'
    },
    cm2096TombstoneAuthorizationAssertion: assertion,
    auditReceipt: { receiptId: 'cm2096-tombstone-drill-receipt-001' },
    rollbackPosture: {
      mode: 'mutation_cleanup_plan',
      rollbackPlanRef: 'cm2096-append-only-logical-tombstone-rollback-drill'
    }
  };
}

test('CM-2096 app path rejects caller-supplied exact approval before any tombstone path', async () => {
  const app = createCodexMemoryApplication({
    cm2096TombstoneOneShotEnforcementEnabled: true,
    cm2096TombstoneAuthorizationAssertionVerifier: async () => ({ accepted: true }),
    governedMcpVcpNativeWriteDelegationMode: 'primary'
  });
  const result = await app.callTool('tombstone_memory', args, {
    exactApprovalResult: { accepted: true },
    cm2096TombstoneAuthorizationAssertion: { caller: 'forged' }
  });
  assert.equal(result.reasonCode, 'cm2096_tombstone_one_shot_authorization_required');
  assert.equal(result.nativeWritePerformed, false);
  await app.close();
});

test('CM-2096 app path rejects invalid assertion and never falls back locally', async () => {
  const app = createCodexMemoryApplication({
    cm2096TombstoneOneShotEnforcementEnabled: true,
    cm2096TombstoneAuthorizationAssertionVerifier: async () => ({ accepted: false }),
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeBridgeGateMode: 'observe',
    ...nativeRouteOverrides()
  });
  const result = await app.callTool('tombstone_memory', args, {
    cm2096TombstoneAuthorizationAssertion: { invalid: true }
  });
  assert.equal(result.reasonCode, 'cm2096_tombstone_one_shot_authorization_claim_invalid');
  assert.equal(result.localFallbackWritePerformed, false);
  await app.close();
});

test('CM-2096 app path rejects an unusable native route before consuming the assertion', async () => {
  for (const routeOverrides of [
    {
      governedMcpVcpNativeRuntimeTarget: {},
      governedMcpVcpNativeHttpMcpTarget: {
        endpoint: 'http://127.0.0.1:3096',
        bearerToken: 'fixture-only-token',
        mcpToolNameByAction: { tombstone_memory: 'knowledge_base.tombstone' }
      }
    },
    {
      governedMcpVcpNativeRuntimeTarget: {
        targetReferenceName: 'cm2096-vcptoolbox-native-memory-target',
        targetKind: 'mcp_server'
      },
      governedMcpVcpNativeHttpMcpTarget: {}
    }
  ]) {
    let assertionVerifierCalls = 0;
    const app = createCodexMemoryApplication({
      cm2096TombstoneOneShotEnforcementEnabled: true,
      cm2096TombstoneAuthorizationAssertionVerifier: async () => {
        assertionVerifierCalls += 1;
        return { accepted: true, exactApprovalResult: {} };
      },
      governedMcpVcpNativeWriteDelegationMode: 'primary',
      governedMcpVcpNativeReadDelegationMode: 'off',
      governedMcpVcpNativeBridgeGateMode: 'observe',
      ...routeOverrides
    });
    const result = await app.callTool('tombstone_memory', args, {
      cm2096TombstoneAuthorizationAssertion: { opaque: true }
    });
    assert.equal(result.decision, 'rejected');
    assert.equal(assertionVerifierCalls, 0);
    assert.equal(result.reasonCode, 'cm2096_tombstone_one_shot_authorization_required');
    assert.equal(result.nativeWritePerformed, false);
    assert.equal(result.localFallbackWritePerformed, false);
    await app.close();
  }
});

test('CM-2096 app path rejects drifted bridge approval context before consuming the assertion', async () => {
  for (const driftRequestContext of [
    requestContext => {
      requestContext.executionContext.scopeId = 'drifted-scope';
    },
    requestContext => {
      requestContext.rollbackPosture.rollbackPlanRef = 'drifted-rollback-plan';
    }
  ]) {
    let assertionVerifierCalls = 0;
    const exactApprovalResult = exactTombstoneApprovalResult();
    const assertion = { exactApprovalResult };
    const app = createCodexMemoryApplication({
      cm2096TombstoneOneShotEnforcementEnabled: true,
      cm2096TombstoneAuthorizationAssertionVerifier: async () => {
        assertionVerifierCalls += 1;
        return { accepted: true, exactApprovalResult };
      },
      governedMcpVcpNativeWriteDelegationMode: 'primary',
      governedMcpVcpNativeBridgeGateMode: 'observe',
      ...nativeRouteOverrides()
    });
    const requestContext = matchingRequestContext(assertion);
    driftRequestContext(requestContext);

    const result = await app.callTool('tombstone_memory', args, requestContext);

    assert.equal(result.decision, 'rejected');
    assert.equal(assertionVerifierCalls, 0);
    assert.equal(result.reasonCode, 'cm2096_tombstone_one_shot_authorization_required');
    assert.equal(result.nativeWritePerformed, false);
    assert.equal(result.localFallbackWritePerformed, false);
    await app.close();
  }
});

test('CM-2096 app path requires primary native delegation mode', async () => {
  const app = createCodexMemoryApplication({
    cm2096TombstoneOneShotEnforcementEnabled: true,
    cm2096TombstoneAuthorizationAssertionVerifier: async () => ({ accepted: true, exactApprovalResult: {} }),
    governedMcpVcpNativeWriteDelegationMode: 'off'
  });
  const result = await app.callTool('tombstone_memory', args, {
    cm2096TombstoneAuthorizationAssertion: { opaque: true }
  });
  assert.equal(result.reasonCode, 'cm2096_tombstone_one_shot_authorization_required');
  assert.equal(result.localFallbackWritePerformed, false);
  await app.close();
});

test('CM-2096 app path rejects a disabled bridge gate before consuming the assertion', async () => {
  let assertionVerifierCalls = 0;
  const app = createCodexMemoryApplication({
    cm2096TombstoneOneShotEnforcementEnabled: true,
    cm2096TombstoneAuthorizationAssertionVerifier: async () => {
      assertionVerifierCalls += 1;
      return { accepted: true, exactApprovalResult: {} };
    },
    governedMcpVcpNativeWriteDelegationMode: 'primary',
    governedMcpVcpNativeBridgeGateMode: 'off'
  });
  const result = await app.callTool('tombstone_memory', args, {
    cm2096TombstoneAuthorizationAssertion: { opaque: true }
  });
  assert.equal(result.decision, 'rejected');
  assert.equal(assertionVerifierCalls, 0);
  assert.equal(result.reasonCode, 'cm2096_tombstone_one_shot_authorization_required');
  assert.equal(result.nativeWritePerformed, false);
  assert.equal(result.localFallbackWritePerformed, false);
  await app.close();
});
