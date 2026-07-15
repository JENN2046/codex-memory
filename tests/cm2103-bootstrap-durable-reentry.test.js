'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  IDENTITY_FILENAME,
  expectedIdentityBytes
} = require('../src/core/Cm2102IdentityBoundRollbackLifecycleFoundation');
const {
  GOVERNANCE_ROOT_IDENTITY_BYTES
} = require('../src/core/Cm2103IdentityBoundStoreGovernance');
const {
  NONTERMINAL_REENTRY
} = require('../src/core/Cm2103IdentityBoundStoreBootstrapState');
const {
  Cm2103IdentityBoundStoreBootstrapRegistry
} = require('../src/core/Cm2103IdentityBoundStoreBootstrapRegistry');
const {
  executeCm2103BootstrapFilesystem
} = require('../src/core/Cm2103IdentityBoundStoreBootstrapEngine');
const {
  buildCm2103BootstrapReceipt
} = require('../src/cli/cm2103-identity-bound-store-bootstrap');
const {
  evaluateCm2103BootstrapReceipt
} = require('../src/core/Cm2103IdentityBoundStoreBootstrapReceiptContract');

const BINDING_HASH = 'a'.repeat(64);
const receiptPacket = Object.freeze({
  foundationDecisionReference: 'CM-2102-TEST',
  foundationDecisionSourceCommit: '1'.repeat(40),
  foundationDecisionBlobOid: '2'.repeat(40),
  foundationDecisionSha256: '3'.repeat(64),
  bootstrapRequestCommit: '4'.repeat(40),
  bootstrapRequestBlobOid: '5'.repeat(40),
  bootstrapRequestSha256: '6'.repeat(64),
  gateImplementationCommit: '7'.repeat(40),
  gateImplementationTree: '8'.repeat(40),
  action: 'initialize_identity_bound_synthetic_store',
  lifecycleReference: 'phase8-identity-bound-rollback-lifecycle-001',
  storeReference: 'phase8-identity-bound-synthetic-rollback-store-001',
  storeInstanceId: 'phase8-identity-bound-synthetic-rollback-store-instance-001',
  storeRole: 'phase8_identity_bound_synthetic_rollback_store',
  storeRootBindingSha256: '0a7ceb6cf658d517de2a3eb30ee09195dbeb9d46800f42ac87edf7f7cb11dd94',
  governanceRootIdentityReference: 'codex-memory-phase8-governance-root',
  governanceRootIdentitySha256: '240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0',
  authorizationRegistryReference: 'cm2103-identity-bound-store-bootstrap-registry-001',
  nonce: 'cm2103-r2-reentry-nonce',
  receiptId: 'cm2103-r2-reentry-receipt'
});

function receiptFor(execution) {
  const receipt = buildCm2103BootstrapReceipt({
    packet: receiptPacket,
    observedContentDecision: {
      decision: { decisionReference: 'CM-2104-TEST-CONTENT' },
      sourceCommit: '9'.repeat(40),
      blobOid: 'a'.repeat(40),
      sha256: 'b'.repeat(64)
    },
    observedFinalReleaseDecision: {
      decision: { decisionReference: 'CM-2104-TEST-FINAL-RELEASE' },
      sourceCommit: 'e'.repeat(40),
      blobOid: 'f'.repeat(40),
      sha256: '0'.repeat(64)
    },
    executionPacketCommit: 'c'.repeat(40),
    executionPacketBlobOid: 'd'.repeat(40),
    executionPacketBytes: Buffer.from('packet-r2'),
    bindingHash: BINDING_HASH,
    claim: execution.claim,
    outcomeStage: execution.outcomeStage
  });
  const expectedBinding = {
    authorizationContentDecisionReference: receipt.authorizationContentDecisionReference,
    authorizationContentDecisionSourceCommit: receipt.authorizationContentDecisionSourceCommit,
    authorizationContentDecisionBlobOid: receipt.authorizationContentDecisionBlobOid,
    authorizationContentDecisionSha256: receipt.authorizationContentDecisionSha256,
    finalExecutionReleaseDecisionReference: receipt.finalExecutionReleaseDecisionReference,
    finalExecutionReleaseDecisionSourceCommit: receipt.finalExecutionReleaseDecisionSourceCommit,
    finalExecutionReleaseDecisionBlobOid: receipt.finalExecutionReleaseDecisionBlobOid,
    finalExecutionReleaseDecisionSha256: receipt.finalExecutionReleaseDecisionSha256,
    executionPacketCommit: receipt.executionPacketCommit,
    executionPacketBlobOid: receipt.executionPacketBlobOid,
    executionPacketSha256: receipt.executionPacketSha256,
    foundationDecisionReference: receipt.foundationDecisionReference,
    foundationDecisionSourceCommit: receipt.foundationDecisionSourceCommit,
    foundationDecisionBlobOid: receipt.foundationDecisionBlobOid,
    foundationDecisionSha256: receipt.foundationDecisionSha256,
    bootstrapRequestCommit: receipt.bootstrapRequestCommit,
    bootstrapRequestBlobOid: receipt.bootstrapRequestBlobOid,
    bootstrapRequestSha256: receipt.bootstrapRequestSha256,
    implementationCommit: receipt.implementationCommit,
    implementationTree: receipt.implementationTree,
    bindingHash: receipt.bindingHash,
    nonce: receipt.nonce,
    receiptId: receipt.receiptId
  };
  return {
    receipt,
    contract: evaluateCm2103BootstrapReceipt({ receipt, expectedBinding })
  };
}

async function fixture(t, suffix) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), `cm2103-r2-${suffix}-`));
  const authorizationRegistryRoot = path.join(root, 'existing-governance-registry-root');
  const storeRoot = path.join(root, 'synthetic-target-store');
  await fs.mkdir(authorizationRegistryRoot);
  await fs.writeFile(
    path.join(authorizationRegistryRoot, '.phase8-registry-root-identity.json'),
    GOVERNANCE_ROOT_IDENTITY_BYTES,
    { flag: 'wx' }
  );
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return {
    root,
    authorizationRegistryRoot,
    storeRoot,
    nonce: `cm2103-r2-${suffix}-nonce`,
    receiptId: `cm2103-r2-${suffix}-receipt`
  };
}

function noStoreReentryFilesystem(storeRoot) {
  const counts = {
    targetStoreLstat: 0,
    targetStoreMkdir: 0,
    targetStoreWrite: 0,
    targetStoreRead: 0,
    rename: 0
  };
  const api = {
    access: (...args) => fs.access(...args),
    async lstat(target, ...args) {
      if (target === storeRoot) {
        counts.targetStoreLstat += 1;
        throw new Error('cm2103_r2_reentry_must_not_lstat_target_store');
      }
      return fs.lstat(target, ...args);
    },
    async mkdir(target) {
      if (target === storeRoot) counts.targetStoreMkdir += 1;
      throw new Error('cm2103_r2_reentry_must_not_mkdir_target_store');
    },
    async writeFile(target) {
      if (String(target).startsWith(storeRoot)) counts.targetStoreWrite += 1;
      throw new Error('cm2103_r2_reentry_must_not_write');
    },
    async readFile(target, options) {
      if (String(target).startsWith(storeRoot)) {
        counts.targetStoreRead += 1;
        throw new Error('cm2103_r2_reentry_must_not_read_target_store');
      }
      return fs.readFile(target, options);
    },
    async rename() {
      counts.rename += 1;
      throw new Error('cm2103_r2_reentry_must_not_rename');
    }
  };
  return { api, counts };
}

async function execute({ target, registry, filesystem = fs }) {
  return executeCm2103BootstrapFilesystem({
    registry,
    storeRoot: target.storeRoot,
    nonce: target.nonce,
    receiptId: target.receiptId,
    bindingHash: BINDING_HASH,
    filesystem,
    identityBytes: expectedIdentityBytes()
  });
}

async function createClaimAtState(target, sourceState) {
  const registry = new Cm2103IdentityBoundStoreBootstrapRegistry({
    authorizationRegistryRoot: target.authorizationRegistryRoot
  });
  const claimed = await registry.claim({
    nonce: target.nonce,
    receiptId: target.receiptId,
    bindingHash: BINDING_HASH
  });
  let claim = claimed.claim;
  if (sourceState === 'CLAIMED') return claim;
  claim = await registry.transition(claim.claimId, 'CONSUME_DIRECTORY_CREATE', {
    directoryCreateAttempts: 1,
    directoryCreates: null,
    storeDirectoryCreated: null
  });
  if (sourceState === 'STORE_DIRECTORY_CREATE_CONSUMED') return claim;
  claim = await registry.transition(claim.claimId, 'DIRECTORY_CREATED', {
    directoryCreateAttempts: 1,
    directoryCreates: 1,
    storeDirectoryCreated: true
  });
  if (sourceState === 'STORE_DIRECTORY_CREATED') return claim;
  claim = await registry.transition(claim.claimId, 'CONSUME_IDENTITY_WRITE', {
    identityWriteAttempts: 1,
    identityWrites: null,
    identityWriteAttempted: true,
    identityCreated: null,
    identityBytes: null,
    identitySha256: null
  });
  if (sourceState === 'IDENTITY_WRITE_CONSUMED') return claim;
  claim = await registry.transition(claim.claimId, 'IDENTITY_CREATED', {
    identityWriteAttempts: 1,
    identityWrites: 1,
    identityWriteAttempted: true,
    identityCreated: true,
    identityBytes: 633,
    identitySha256: '017307c9a1cb3e216895934b9c2aae8fa5773b909afebe87d3f91bc0a5736f57'
  });
  if (sourceState === 'IDENTITY_CREATED') return claim;
  claim = await registry.transition(claim.claimId, 'CONSUME_READBACK', {
    identityReadbackAttempts: 1,
    identityReadbackVerifications: 0,
    identityReadbackMatched: null
  });
  if (sourceState === 'IDENTITY_READBACK_CONSUMED') return claim;
  throw new Error('unknown_test_state');
}

function assertNoReentryStoreEffects(guard, result) {
  assert.deepEqual(guard.counts, {
    targetStoreLstat: 0,
    targetStoreMkdir: 0,
    targetStoreWrite: 0,
    targetStoreRead: 0,
    rename: 0
  });
  assert.equal(result.nativeActions, 0);
  assert.equal(result.automaticRetryPerformed, false);
  assert.equal(result.automaticCleanupPerformed, false);
}

test('CM-2103 R2 persistence-unknown preserves governance filesystem effect as null', async t => {
  const target = await fixture(t, 'persistence-unknown');
  const claimPattern = /^\.cm2103-bootstrap-claim-[a-f0-9]{64}\.json$/;
  const filesystem = {
    access: (...args) => fs.access(...args),
    lstat: (...args) => fs.lstat(...args),
    mkdir: (...args) => fs.mkdir(...args),
    rename: (...args) => fs.rename(...args),
    async writeFile(file, data, options) {
      if (claimPattern.test(path.basename(file))) {
        const error = new Error('synthetic_claim_write_unknown');
        error.code = 'EIO';
        throw error;
      }
      return fs.writeFile(file, data, options);
    },
    async readFile(file, options) {
      if (claimPattern.test(path.basename(file))) {
        const error = new Error('synthetic_claim_read_unknown');
        error.code = 'EIO';
        throw error;
      }
      return fs.readFile(file, options);
    }
  };
  const registry = new Cm2103IdentityBoundStoreBootstrapRegistry({
    authorizationRegistryRoot: target.authorizationRegistryRoot,
    filesystem
  });
  const result = await execute({ target, registry, filesystem });
  assert.equal(result.state, 'CLAIM_REGISTRY_AMBIGUOUS');
  assert.equal(result.outcomeStage, 'claim_envelope_persistence_unknown');
  assert.equal(result.claim.claimEnvelopePresent, null);
  assert.equal(result.claim.claimEnvelopeBindingVerified, false);
  assert.equal(result.claim.governanceFilesystemEffectAttempted, true);
  assert.equal(result.claim.governanceFilesystemEffectsPresent, null);
  const evaluated = receiptFor(result);
  assert.equal(evaluated.receipt.governanceFilesystemEffectsPresent, null);
  assert.equal(evaluated.contract.shapeAccepted, true, evaluated.contract.blockers.join(', '));
  assert.equal(evaluated.contract.acceptedAsReconciliationEvidence, true);
  const drift = {
    ...evaluated.receipt,
    governanceFilesystemEffectsPresent: true
  };
  const driftResult = evaluateCm2103BootstrapReceipt({
    receipt: drift,
    expectedBinding: {
      decisionReference: drift.decisionReference,
      decisionSourceCommit: drift.decisionSourceCommit,
      decisionBlobOid: drift.decisionBlobOid,
      decisionSha256: drift.decisionSha256,
      executionPacketCommit: drift.executionPacketCommit,
      executionPacketBlobOid: drift.executionPacketBlobOid,
      executionPacketSha256: drift.executionPacketSha256,
      foundationDecisionReference: drift.foundationDecisionReference,
      foundationDecisionSourceCommit: drift.foundationDecisionSourceCommit,
      foundationDecisionBlobOid: drift.foundationDecisionBlobOid,
      foundationDecisionSha256: drift.foundationDecisionSha256,
      bootstrapRequestCommit: drift.bootstrapRequestCommit,
      bootstrapRequestBlobOid: drift.bootstrapRequestBlobOid,
      bootstrapRequestSha256: drift.bootstrapRequestSha256,
      implementationCommit: drift.implementationCommit,
      implementationTree: drift.implementationTree,
      bindingHash: drift.bindingHash,
      nonce: drift.nonce,
      receiptId: drift.receiptId
    }
  });
  assert.equal(driftResult.shapeAccepted, false);
});

test('CM-2103 transition rejects a replaced persisted claim envelope', async t => {
  const target = await fixture(t, 'transition-envelope-drift');
  const registry = new Cm2103IdentityBoundStoreBootstrapRegistry({
    authorizationRegistryRoot: target.authorizationRegistryRoot
  });
  const claimed = await registry.claim({
    nonce: target.nonce,
    receiptId: target.receiptId,
    bindingHash: BINDING_HASH
  });
  const claimPath = registry.claimPathFromId(claimed.claim.claimId);
  await fs.writeFile(claimPath, JSON.stringify({ ...claimed.claim, bindingHash: 'f'.repeat(64) }));
  await assert.rejects(
    registry.transition(claimed.claim.claimId, 'CONSUME_DIRECTORY_CREATE', {
      directoryCreateAttempts: 1,
      directoryCreates: null,
      storeDirectoryCreated: null
    }),
    /cm2103_bootstrap_claim_envelope_changed_before_transition/
  );
  assert.equal((await registry.readClaim(claimed.claim.claimId)).state, 'CLAIMED');
});

test('CM-2103 concurrent transitions consume one persisted state exactly once', async t => {
  const target = await fixture(t, 'transition-concurrency');
  const registry = new Cm2103IdentityBoundStoreBootstrapRegistry({
    authorizationRegistryRoot: target.authorizationRegistryRoot
  });
  const claimed = await registry.claim({
    nonce: target.nonce,
    receiptId: target.receiptId,
    bindingHash: BINDING_HASH
  });
  const effects = {
    directoryCreateAttempts: 1,
    directoryCreates: null,
    storeDirectoryCreated: null
  };
  const attempts = await Promise.allSettled([
    registry.transition(claimed.claim.claimId, 'CONSUME_DIRECTORY_CREATE', effects),
    registry.transition(claimed.claim.claimId, 'CONSUME_DIRECTORY_CREATE', effects)
  ]);
  assert.equal(attempts.filter(item => item.status === 'fulfilled').length, 1);
  assert.equal(attempts.filter(item => item.status === 'rejected').length, 1);
  assert.equal((await registry.readClaim(claimed.claim.claimId)).state, 'STORE_DIRECTORY_CREATE_CONSUMED');
});

test('CM-2103 R2 new process projects every durable nonterminal claim without target-store access', async t => {
  for (const [sourceState, expected] of Object.entries(NONTERMINAL_REENTRY)) {
    await t.test(sourceState, async t => {
      const target = await fixture(t, sourceState.toLowerCase());
      await createClaimAtState(target, sourceState);
      const guard = noStoreReentryFilesystem(target.storeRoot);
      const newRegistry = new Cm2103IdentityBoundStoreBootstrapRegistry({
        authorizationRegistryRoot: target.authorizationRegistryRoot,
        filesystem: guard.api
      });
      const result = await execute({ target, registry: newRegistry, filesystem: guard.api });
      assert.equal(result.state, expected.effectiveState);
      assert.equal(result.outcomeStage, expected.outcomeStage);
      assert.equal(result.receiptRequired, true);
      assert.equal(result.claim.reentryProjection, true);
      assert.equal(result.claim.reentrySourceState, sourceState);
      assert.equal(result.claim.terminalStateDurablyRecorded, false);
      assertNoReentryStoreEffects(guard, result);
      const evaluated = receiptFor(result);
      assert.equal(evaluated.contract.shapeAccepted, true, evaluated.contract.blockers.join(', '));
      assert.equal(evaluated.contract.acceptedAsReconciliationEvidence, true);
      assert.equal(evaluated.receipt.receiptReconstructedFromExistingEnvelope, true);
    });
  }
});

test('CM-2103 R2 corrupt existing envelope yields low-disclosure ambiguous reconciliation evidence', async t => {
  const target = await fixture(t, 'corrupt');
  const registryForPath = new Cm2103IdentityBoundStoreBootstrapRegistry({
    authorizationRegistryRoot: target.authorizationRegistryRoot
  });
  const claimPath = registryForPath.envelopePath({
    nonce: target.nonce,
    receiptId: target.receiptId
  }).claimPath;
  await fs.writeFile(claimPath, '{"schemaVersion":2,"raw":"forbidden-corrupt-fixture"', { flag: 'wx' });
  const guard = noStoreReentryFilesystem(target.storeRoot);
  const newRegistry = new Cm2103IdentityBoundStoreBootstrapRegistry({
    authorizationRegistryRoot: target.authorizationRegistryRoot,
    filesystem: guard.api
  });
  const result = await execute({ target, registry: newRegistry, filesystem: guard.api });
  assert.equal(result.state, 'CLAIM_REGISTRY_AMBIGUOUS');
  assert.equal(result.outcomeStage, 'reentry_existing_claim_unreadable_or_corrupt');
  assert.equal(result.claim.claimEnvelopePresent, true);
  assert.equal(result.claim.claimEnvelopeBindingVerified, false);
  assert.equal(result.claim.storeDirectoryCreated, null);
  assert.equal(result.claim.identityWriteAttempted, null);
  assert.equal(result.claim.identityCreated, null);
  assert.equal(result.claim.terminalStateDurablyRecorded, false);
  assert.equal(JSON.stringify(result).includes('forbidden-corrupt-fixture'), false);
  assertNoReentryStoreEffects(guard, result);
  const evaluated = receiptFor(result);
  assert.equal(evaluated.contract.shapeAccepted, true, evaluated.contract.blockers.join(', '));
  assert.equal(evaluated.contract.acceptedAsReconciliationEvidence, true);
});

test('CM-2103 R2 rejects persisted claims whose consumed flag drifted false', async t => {
  for (const sourceState of ['CLAIMED', 'CONSUMED_SUCCESS']) {
    await t.test(sourceState, async t => {
      const target = await fixture(t, `consumed-false-${sourceState.toLowerCase()}`);
      const firstRegistry = new Cm2103IdentityBoundStoreBootstrapRegistry({
        authorizationRegistryRoot: target.authorizationRegistryRoot
      });
      if (sourceState === 'CLAIMED') {
        await firstRegistry.claim({
          nonce: target.nonce,
          receiptId: target.receiptId,
          bindingHash: BINDING_HASH
        });
      } else {
        const first = await execute({ target, registry: firstRegistry });
        assert.equal(first.state, 'CONSUMED_SUCCESS');
      }
      const claimPath = firstRegistry.envelopePath({
        nonce: target.nonce,
        receiptId: target.receiptId
      }).claimPath;
      const drifted = JSON.parse(await fs.readFile(claimPath, 'utf8'));
      drifted.authorizationConsumed = false;
      await fs.writeFile(claimPath, JSON.stringify(drifted));

      const guard = noStoreReentryFilesystem(target.storeRoot);
      const reentryRegistry = new Cm2103IdentityBoundStoreBootstrapRegistry({
        authorizationRegistryRoot: target.authorizationRegistryRoot,
        filesystem: guard.api
      });
      const result = await execute({ target, registry: reentryRegistry, filesystem: guard.api });
      assert.equal(result.state, 'CLAIM_REGISTRY_AMBIGUOUS');
      assert.equal(result.claim.claimEnvelopeBindingVerified, false);
      assert.equal(result.claim.reentrySourceState, null);
      assertNoReentryStoreEffects(guard, result);
      const evaluated = receiptFor(result);
      assert.equal(evaluated.contract.shapeAccepted, true, evaluated.contract.blockers.join(', '));
      assert.equal(evaluated.contract.acceptedAsReconciliationEvidence, true);
      assert.throws(() => buildCm2103BootstrapReceipt({
        packet: receiptPacket,
        observedContentDecision: { decision: { decisionReference: 'x' } },
        observedFinalReleaseDecision: { decision: { decisionReference: 'y' } },
        executionPacketBytes: Buffer.from('packet'),
        claim: drifted
      }), /cm2103_bootstrap_receipt_claim_not_consumed/);
    });
  }
});

test('CM-2103 R2 unreadable existing envelope preserves presence without reading target store', async t => {
  const target = await fixture(t, 'unreadable');
  await createClaimAtState(target, 'CLAIMED');
  const guard = noStoreReentryFilesystem(target.storeRoot);
  const originalReadFile = guard.api.readFile;
  guard.api.readFile = async (file, options) => {
    if (/\.cm2103-bootstrap-claim-[a-f0-9]{64}\.json$/.test(String(file))) {
      const error = new Error('synthetic_existing_claim_unreadable');
      error.code = 'EIO';
      throw error;
    }
    return originalReadFile(file, options);
  };
  const newRegistry = new Cm2103IdentityBoundStoreBootstrapRegistry({
    authorizationRegistryRoot: target.authorizationRegistryRoot,
    filesystem: guard.api
  });
  const result = await execute({ target, registry: newRegistry, filesystem: guard.api });
  assert.equal(result.state, 'CLAIM_REGISTRY_AMBIGUOUS');
  assert.equal(result.outcomeStage, 'reentry_existing_claim_unreadable_or_corrupt');
  assert.equal(result.claim.claimEnvelopePresent, true);
  assert.equal(result.claim.claimEnvelopeBindingVerified, false);
  assert.equal(result.claim.governanceFilesystemEffectsPresent, true);
  assertNoReentryStoreEffects(guard, result);
  const evaluated = receiptFor(result);
  assert.equal(evaluated.contract.shapeAccepted, true, evaluated.contract.blockers.join(', '));
  assert.equal(evaluated.contract.acceptedAsReconciliationEvidence, true);
});

test('CM-2103 R2 reconstructs a persisted CLAIM_REGISTRY_AMBIGUOUS receipt', async t => {
  const target = await fixture(t, 'terminal-claim-ambiguous');
  const firstRegistry = new Cm2103IdentityBoundStoreBootstrapRegistry({
    authorizationRegistryRoot: target.authorizationRegistryRoot
  });
  const claimed = await firstRegistry.claim({
    nonce: target.nonce,
    receiptId: target.receiptId,
    bindingHash: BINDING_HASH
  });
  await firstRegistry.transition(claimed.claim.claimId, 'CLAIM_AMBIGUOUS');
  const guard = noStoreReentryFilesystem(target.storeRoot);
  const newRegistry = new Cm2103IdentityBoundStoreBootstrapRegistry({
    authorizationRegistryRoot: target.authorizationRegistryRoot,
    filesystem: guard.api
  });
  const reentry = await execute({ target, registry: newRegistry, filesystem: guard.api });
  assert.equal(reentry.state, 'CLAIM_REGISTRY_AMBIGUOUS');
  assert.equal(reentry.outcomeStage, 'reentry_existing_claim_registry_ambiguous');
  assert.equal(reentry.claim.reentrySourceState, 'CLAIM_REGISTRY_AMBIGUOUS');
  assert.equal(reentry.claim.terminalStateDurablyRecorded, true);
  assertNoReentryStoreEffects(guard, reentry);
  const evaluated = receiptFor(reentry);
  assert.equal(evaluated.contract.shapeAccepted, true, evaluated.contract.blockers.join(', '));
  assert.equal(evaluated.contract.acceptedAsReconciliationEvidence, true);
});

test('CM-2103 R2 reconstructs a persisted success receipt without replaying bootstrap', async t => {
  const target = await fixture(t, 'terminal-success');
  const firstRegistry = new Cm2103IdentityBoundStoreBootstrapRegistry({
    authorizationRegistryRoot: target.authorizationRegistryRoot
  });
  const first = await execute({ target, registry: firstRegistry });
  assert.equal(first.state, 'CONSUMED_SUCCESS');

  const guard = noStoreReentryFilesystem(target.storeRoot);
  const newRegistry = new Cm2103IdentityBoundStoreBootstrapRegistry({
    authorizationRegistryRoot: target.authorizationRegistryRoot,
    filesystem: guard.api
  });
  const reentry = await execute({ target, registry: newRegistry, filesystem: guard.api });
  assert.equal(reentry.accepted, false);
  assert.equal(reentry.state, 'CONSUMED_SUCCESS');
  assert.equal(reentry.outcomeStage, 'reentry_existing_consumed_success');
  assert.equal(reentry.claim.reentrySourceState, 'CONSUMED_SUCCESS');
  assert.equal(reentry.claim.terminalStateDurablyRecorded, true);
  assertNoReentryStoreEffects(guard, reentry);
  const evaluated = receiptFor(reentry);
  assert.equal(evaluated.contract.shapeAccepted, true, evaluated.contract.blockers.join(', '));
  assert.equal(evaluated.contract.acceptedAsBootstrapEvidence, true);
  assert.equal(evaluated.receipt.receiptReconstructedFromExistingEnvelope, true);
});
