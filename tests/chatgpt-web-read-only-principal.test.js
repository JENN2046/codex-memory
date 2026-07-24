'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildChatGptWebTrustedExecutionContext
} = require('../src/core/ChatGptWebTrustedExecutionContext');
const {
  buildChatGptWebProfileConfig,
  CHATGPT_WEB_PROFILE_IDS
} = require('../src/core/ChatGptWebProfile');
const {
  validateChatGptWebReadOnlyPrincipal
} = require('../src/core/ChatGptWebReadOnlyPrincipalContract');
const { GovernedReadFacade } = require('../src/core/GovernedReadFacade');
const { createCodexMemoryApplication } = require('../src/app');

function trustedRequestContext(visibility = 'project') {
  const profile = buildChatGptWebProfileConfig({
    profileId: CHATGPT_WEB_PROFILE_IDS.READ_ONLY_V1,
    enabled: true,
    serverFixedScope: {
      projectId: 'synthetic-project',
      workspaceId: 'synthetic-workspace',
      scopeId: 'synthetic-scope',
      visibility
    }
  });
  const result = buildChatGptWebTrustedExecutionContext(profile);
  assert.equal(result.accepted, true);
  return result.requestContext;
}

test('C3 binds chatgpt_web to a low-disclosure project/workspace read-only principal receipt', () => {
  for (const visibility of ['project', 'workspace']) {
    const result = validateChatGptWebReadOnlyPrincipal(trustedRequestContext(visibility));
    const serialized = JSON.stringify(result.receipt);

    assert.equal(result.accepted, true);
    assert.equal(result.receipt.readAllowed, true);
    assert.equal(result.receipt.writeAllowed, false);
    assert.equal(result.receipt.writeEligible, false);
    assert.equal(result.receipt.privateVisibilityAllowed, false);
    assert.equal(result.receipt.sharedVisibilityAllowed, false);
    assert.match(result.receipt.scopeFingerprint, /^sha256:[a-f0-9]{64}$/);
    assert.match(result.receipt.principalReceiptDigest, /^sha256:[a-f0-9]{64}$/);
    assert.equal(serialized.includes('synthetic-project'), false);
    assert.equal(serialized.includes('synthetic-workspace'), false);
    assert.equal(serialized.includes('synthetic-scope'), false);
  }
});

test('C3 rejects visibility escalation, trusted-scope drift, and write-authority injection', () => {
  const validVisibilityContext = trustedRequestContext('project');
  const visibilityEscalation = {
    ...validVisibilityContext,
    executionContext: {
      ...validVisibilityContext.executionContext,
      visibility: 'private'
    }
  };
  assert.equal(validateChatGptWebReadOnlyPrincipal(visibilityEscalation).accepted, false);

  const validTrustedContext = trustedRequestContext();
  const trustedDrift = {
    ...validTrustedContext,
    trustedExecutionContext: {
      accepted: true,
      executionContext: {
        ...validTrustedContext.trustedExecutionContext.executionContext,
        projectId: 'another-project'
      }
    }
  };
  assert.equal(validateChatGptWebReadOnlyPrincipal(trustedDrift).accepted, false);

  const writeInjection = {
    ...trustedRequestContext(),
    exactApprovalResult: { accepted: true }
  };
  const writeResult = validateChatGptWebReadOnlyPrincipal(writeInjection);
  assert.equal(writeResult.accepted, false);
  assert.equal(writeResult.receipt.writeAllowed, false);
  assert.ok(writeResult.receipt.blockers.includes('write_authority_field_forbidden'));
});

test('M4 facade rejects a forged chatgpt_web principal before every native/governance subcall', async () => {
  let calls = 0;
  const facade = new GovernedReadFacade({
    nativeRecall: async () => { calls += 1; return {}; },
    governanceOverview: async () => { calls += 1; return {}; },
    governanceAudit: async () => { calls += 1; return {}; },
    clock: () => '2026-07-17T00:00:00.000Z'
  });
  const forged = {
    ...trustedRequestContext(),
    trustedExecutionContext: { accepted: false, executionContext: {} }
  };

  const result = await facade.read({ requestContext: forged });
  assert.equal(result.status, 'unavailable');
  assert.equal(result.reason, 'VCP_READ_ONLY_PRINCIPAL_REJECTED');
  assert.equal(result.principalScopeReceipt.accepted, false);
  assert.equal(result.sourceTruthReceipt.subReceiptCount, 0);
  assert.equal(calls, 0);
});

test('M4 facade binds the accepted principal receipt into the composite digest chain', async () => {
  const times = ['2026-07-17T00:00:00.000Z', '2026-07-17T00:00:00.050Z'];
  const facade = new GovernedReadFacade({
    nativeRecall: async () => ({
      status: 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATED', accepted: true, results: []
    }),
    governanceOverview: async () => ({ status: 'success' }),
    governanceAudit: async () => ({ status: 'success' }),
    clock: () => times.shift()
  });

  const result = await facade.read({ requestContext: trustedRequestContext() });
  assert.equal(result.status, 'success');
  assert.equal(result.principalScopeReceipt.accepted, true);
  assert.equal(result.sourceTruthReceipt.subReceiptCount, 4);
  assert.match(result.aggregateReceiptDigest, /^sha256:[a-f0-9]{64}$/);
});

test('application blocks chatgpt_web before local fallback when strict primary delegation is absent', async () => {
  const app = createCodexMemoryApplication({
    governedMcpVcpNativeBridgeGateMode: 'off',
    governedMcpVcpNativeReadDelegationMode: 'primary_with_local_fallback'
  });
  const result = await app.callTool(
    'search_memory',
    { query: 'synthetic fallback must not run' },
    trustedRequestContext()
  );

  assert.equal(result.decision, 'rejected');
  assert.equal(result.access.runtimeCalled, false);
  assert.equal(result.access.memoryReadPerformed, false);
  assert.equal(result.access.localMemoryFallbackAttempted, false);
  assert.equal(result.access.localMemoryFallbackUsed, false);
  assert.equal(result.access.localMemoryFallbackReadPerformed, false);
});
