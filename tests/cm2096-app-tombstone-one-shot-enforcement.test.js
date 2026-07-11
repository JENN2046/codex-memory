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
    governedMcpVcpNativeWriteDelegationMode: 'primary'
  });
  const result = await app.callTool('tombstone_memory', args, {
    cm2096TombstoneAuthorizationAssertion: { invalid: true }
  });
  assert.equal(result.reasonCode, 'cm2096_tombstone_one_shot_authorization_claim_invalid');
  assert.equal(result.localFallbackWritePerformed, false);
  await app.close();
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
