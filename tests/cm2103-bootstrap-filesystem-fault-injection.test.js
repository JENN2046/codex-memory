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
  Cm2103IdentityBoundStoreBootstrapRegistry,
  REGISTRY_IDENTITY
} = require('../src/core/Cm2103IdentityBoundStoreBootstrapRegistry');
const {
  executeCm2103BootstrapFilesystem
} = require('../src/core/Cm2103IdentityBoundStoreBootstrapEngine');
const { buildCm2103BootstrapReceipt } = require('../src/cli/cm2103-identity-bound-store-bootstrap');
const { evaluateCm2103BootstrapReceipt } = require('../src/core/Cm2103IdentityBoundStoreBootstrapReceiptContract');

const receiptPacket = Object.freeze({
  foundationDecisionReference: 'CM-2102-TEST',
  foundationDecisionSourceCommit: '1'.repeat(40),
  foundationDecisionBlobOid: '2'.repeat(40),
  foundationDecisionSha256: '3'.repeat(64),
  bootstrapRequestSourceCommit: '4'.repeat(40),
  bootstrapRequestBlobOid: '5'.repeat(40),
  bootstrapRequestSha256: '6'.repeat(64),
  implementationCommit: '7'.repeat(40),
  implementationTree: '8'.repeat(40),
  action: 'initialize_identity_bound_synthetic_store',
  lifecycleReference: 'phase8-identity-bound-rollback-lifecycle-001',
  storeReference: 'phase8-identity-bound-synthetic-rollback-store-001',
  storeInstanceId: 'phase8-identity-bound-synthetic-rollback-store-instance-001',
  storeRole: 'phase8_identity_bound_synthetic_rollback_store',
  storeRootBindingSha256: '0a7ceb6cf658d517de2a3eb30ee09195dbeb9d46800f42ac87edf7f7cb11dd94',
  governanceRootIdentity: { registryRootReference: 'codex-memory-phase8-governance-root' },
  governanceRootIdentitySha256: '240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0',
  authorizationRegistryIdentity: { authorizationRegistryReference: 'cm2103-identity-bound-store-bootstrap-registry-001' },
  nonce: 'cm2102-identity-bound-store-bootstrap-001',
  receiptId: 'cm2102-identity-bound-store-bootstrap-receipt-001'
});

function evaluateExecutionReceipt(execution) {
  const receipt = buildCm2103BootstrapReceipt({
    packet: receiptPacket,
    observedDecision: {
      decision: { decisionReference: 'CM-2103-TEST-BOOTSTRAP' },
      sourceCommit: '9'.repeat(40),
      blobOid: 'a'.repeat(40),
      sha256: 'b'.repeat(64)
    },
    executionPacketCommit: 'c'.repeat(40),
    executionPacketBlobOid: 'd'.repeat(40),
    executionPacketBytes: Buffer.from('packet'),
    bindingHash: 'a'.repeat(64),
    claim: execution.claim,
    outcomeStage: execution.outcomeStage
  });
  const expectedBinding = {
    decisionReference: receipt.decisionReference,
    decisionSourceCommit: receipt.decisionSourceCommit,
    decisionBlobOid: receipt.decisionBlobOid,
    decisionSha256: receipt.decisionSha256,
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
  return { receipt, contract: evaluateCm2103BootstrapReceipt({ receipt, expectedBinding }) };
}

function ioError(code = 'EIO') {
  const error = new Error(`synthetic_${code}`);
  error.code = code;
  return error;
}

function createFaultFilesystem({ storeRoot, fault }) {
  const fired = new Set();
  const identityPath = path.join(storeRoot, IDENTITY_FILENAME);
  function enabled(name) {
    return fault === name ||
      (fault === 'claim_terminal_double_failure' && ['claim_after_success', 'rename_claim_terminal'].includes(name));
  }
  function once(name) {
    if (!fired.has(name) && enabled(name)) {
      fired.add(name);
      return true;
    }
    return false;
  }
  return {
    access: (...args) => fs.access(...args),
    lstat: (...args) => fs.lstat(...args),
    readdir: (...args) => fs.readdir(...args),
    async mkdir(target, options) {
      if (target === storeRoot && once('mkdir_after_success')) {
        await fs.mkdir(target, options);
        throw ioError();
      }
      return fs.mkdir(target, options);
    },
    async writeFile(target, data, options) {
      const basename = path.basename(target);
      const claimEnvelope = /^\.cm2103-bootstrap-claim-[a-f0-9]{64}\.json$/.test(basename);
      if (claimEnvelope && once('claim_before_write')) throw ioError();
      if (claimEnvelope && once('claim_after_success')) {
        await fs.writeFile(target, data, options);
        throw ioError();
      }
      if (target === identityPath && once('identity_after_success')) {
        await fs.writeFile(target, data, options);
        throw ioError();
      }
      return fs.writeFile(target, data, options);
    },
    async readFile(target, options) {
      if (target === identityPath && once('readback_failure')) throw ioError();
      return fs.readFile(target, options);
    },
    async rename(source, target) {
      if (fault?.startsWith('rename_') || fault === 'claim_terminal_double_failure') {
        const attempted = JSON.parse(await fs.readFile(source, 'utf8'));
        const targetState = fault === 'rename_directory_state'
          ? 'STORE_DIRECTORY_CREATED'
          : fault === 'rename_identity_state'
            ? 'IDENTITY_CREATED'
            : fault === 'rename_success_state'
              ? 'CONSUMED_SUCCESS'
              : fault === 'claim_terminal_double_failure'
                ? 'CLAIM_REGISTRY_AMBIGUOUS'
              : null;
        const faultName = fault === 'claim_terminal_double_failure' ? 'rename_claim_terminal' : fault;
        if (attempted.state === targetState && once(faultName)) throw ioError();
      }
      return fs.rename(source, target);
    },
    faultTriggered: () => fired.size > 0,
    faultCount: () => fired.size
  };
}

async function createFixture(t, fault = null) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cm2103-r1-fixture-'));
  const authorizationRegistryRoot = path.join(root, 'existing-governance-registry-root');
  const storeRoot = path.join(root, 'synthetic-target-store');
  await fs.mkdir(authorizationRegistryRoot);
  await fs.writeFile(
    path.join(authorizationRegistryRoot, '.phase8-registry-root-identity.json'),
    GOVERNANCE_ROOT_IDENTITY_BYTES,
    { flag: 'wx' }
  );
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const filesystem = createFaultFilesystem({ storeRoot, fault });
  const registry = new Cm2103IdentityBoundStoreBootstrapRegistry({
    authorizationRegistryRoot,
    filesystem
  });
  return { root, authorizationRegistryRoot, storeRoot, filesystem, registry };
}

async function executeFixture(fixture, suffix = '001') {
  return executeCm2103BootstrapFilesystem({
    registry: fixture.registry,
    storeRoot: fixture.storeRoot,
    nonce: `cm2103-r1-test-nonce-${suffix}`,
    receiptId: `cm2103-r1-test-receipt-${suffix}`,
    bindingHash: 'a'.repeat(64),
    filesystem: fixture.filesystem,
    identityBytes: expectedIdentityBytes()
  });
}

async function assertClaimCannotReplay(fixture, suffix = '001') {
  const preflight = await fixture.registry.preflightUnused({
    nonce: `cm2103-r1-test-nonce-${suffix}`,
    receiptId: `cm2103-r1-test-receipt-${suffix}`
  });
  assert.equal(preflight.accepted, false);
  assert.equal(preflight.unused, false);
}

test('CM-2103 R1 isolated filesystem success uses one claim envelope and no action registry directory', async t => {
  const fixture = await createFixture(t);
  const result = await executeFixture(fixture);
  assert.equal(result.accepted, true);
  assert.equal(result.state, 'CONSUMED_SUCCESS');
  assert.equal(result.outcomeStage, 'identity_bound_store_bootstrap_completed');
  assert.equal(result.claim.storeDirectoryCreated, true);
  assert.equal(result.claim.identityCreated, true);
  assert.equal(result.claim.identityReadbackMatched, true);
  assert.equal(result.claim.governanceRegistryDirectoryCreates, 0);
  assert.equal(result.claim.governanceRegistryIdentityWrites, 0);
  assert.equal(result.claim.authorizationMarkerWrites, 0);
  assert.equal(result.claim.claimEnvelopeCreates, 1);
  assert.equal(result.claim.claimStateWrites, 7);
  assert.equal(result.claim.terminalStateDurablyRecorded, true);
  const entries = await fs.readdir(fixture.authorizationRegistryRoot, { withFileTypes: true });
  assert.equal(entries.filter(entry => entry.isDirectory()).length, 0);
  assert.equal(entries.filter(entry => /^nonce-|^receipt-/.test(entry.name)).length, 0);
  assert.equal(entries.filter(entry => entry.name.startsWith('.cm2103-bootstrap-claim-') && entry.name.endsWith('.json')).length, 1);
  assert.deepEqual(await fs.readFile(path.join(fixture.storeRoot, IDENTITY_FILENAME)), expectedIdentityBytes());
  const evaluated = evaluateExecutionReceipt(result);
  assert.equal(evaluated.contract.shapeAccepted, true, evaluated.contract.blockers.join(', '));
  assert.equal(evaluated.contract.acceptedAsBootstrapEvidence, true);
  await assertClaimCannotReplay(fixture);
});

test('CM-2103 R1 existing store remains UNCLAIMED without reading identity or writing claim', async t => {
  const fixture = await createFixture(t);
  await fs.mkdir(fixture.storeRoot);
  const result = await executeFixture(fixture);
  assert.equal(result.state, 'UNCLAIMED');
  assert.equal(result.authorizationConsumed, false);
  assert.equal(result.receiptRequired, false);
  const entries = await fs.readdir(fixture.authorizationRegistryRoot);
  assert.deepEqual(entries, ['.phase8-registry-root-identity.json']);
});

test('CM-2103 R1 atomic claim distinguishes no-create from persisted acknowledgement ambiguity', async t => {
  await t.test('claim write fails before creation and leaves no partial marker set', async t => {
    const fixture = await createFixture(t, 'claim_before_write');
    const result = await executeFixture(fixture, 'claim-before');
    assert.equal(result.state, 'UNCLAIMED');
    assert.equal(result.authorizationConsumed, false);
    assert.equal(result.receiptRequired, false);
    assert.equal(fixture.filesystem.faultTriggered(), true);
    const entries = await fs.readdir(fixture.authorizationRegistryRoot);
    assert.deepEqual(entries, ['.phase8-registry-root-identity.json']);
  });
  await t.test('claim persisted then acknowledgement lost produces durable reconciliation state', async t => {
    const fixture = await createFixture(t, 'claim_after_success');
    const result = await executeFixture(fixture, 'claim-after');
    assert.equal(result.state, 'CLAIM_REGISTRY_AMBIGUOUS');
    assert.equal(result.outcomeStage, 'claim_envelope_persisted_but_acknowledgement_ambiguous');
    assert.equal(result.receiptRequired, true);
    assert.equal(result.claim.storeDirectoryCreated, false);
    assert.equal(result.claim.identityCreated, false);
    assert.equal(result.claim.terminalStateDurablyRecorded, true);
    assert.equal(await fs.access(fixture.storeRoot).then(() => true, () => false), false);
    const evaluated = evaluateExecutionReceipt(result);
    assert.equal(evaluated.contract.shapeAccepted, true, evaluated.contract.blockers.join(', '));
    assert.equal(evaluated.contract.acceptedAsReconciliationEvidence, true);
    await assertClaimCannotReplay(fixture, 'claim-after');
  });
  await t.test('claim acknowledgement and terminal persistence both fail but receipt remains reconstructable', async t => {
    const fixture = await createFixture(t, 'claim_terminal_double_failure');
    const result = await executeFixture(fixture, 'claim-double');
    assert.equal(result.state, 'CLAIM_REGISTRY_AMBIGUOUS');
    assert.equal(result.outcomeStage, 'claim_envelope_terminal_state_persistence_failed');
    assert.equal(result.claim.claimEnvelopeCreates, 1);
    assert.equal(result.claim.terminalStateDurablyRecorded, false);
    assert.equal(fixture.filesystem.faultCount(), 2);
    const evaluated = evaluateExecutionReceipt(result);
    assert.equal(evaluated.contract.shapeAccepted, true, evaluated.contract.blockers.join(', '));
    assert.equal(evaluated.contract.acceptedAsReconciliationEvidence, true);
    await assertClaimCannotReplay(fixture, 'claim-double');
  });
});

test('CM-2103 R1 fault receipts preserve true false null effects and prohibit replay', async t => {
  const cases = [
    {
      fault: 'mkdir_after_success',
      state: 'CONSUMED_AMBIGUOUS',
      stage: 'directory_create_acknowledgement_ambiguous',
      directoryCreated: null,
      identityCreated: false,
      identityFileExists: false
    },
    {
      fault: 'identity_after_success',
      state: 'CONSUMED_PARTIAL_BOOTSTRAP',
      stage: 'identity_write_acknowledgement_ambiguous',
      directoryCreated: true,
      identityCreated: null,
      identityFileExists: true
    },
    {
      fault: 'readback_failure',
      state: 'CONSUMED_AMBIGUOUS',
      stage: 'identity_readback_failed',
      directoryCreated: true,
      identityCreated: true,
      identityFileExists: true,
      readbackMatched: null
    },
    {
      fault: 'rename_directory_state',
      state: 'CONSUMED_AMBIGUOUS',
      stage: 'directory_state_persistence_failed',
      directoryCreated: true,
      identityCreated: false,
      identityFileExists: false
    },
    {
      fault: 'rename_identity_state',
      state: 'CONSUMED_AMBIGUOUS',
      stage: 'identity_state_persistence_failed',
      directoryCreated: true,
      identityCreated: true,
      identityFileExists: true
    },
    {
      fault: 'rename_success_state',
      state: 'CONSUMED_AMBIGUOUS',
      stage: 'success_state_persistence_failed',
      directoryCreated: true,
      identityCreated: true,
      identityFileExists: true,
      readbackMatched: true
    }
  ];
  for (const [index, item] of cases.entries()) {
    await t.test(item.fault, async t => {
      const fixture = await createFixture(t, item.fault);
      const suffix = String(index + 1);
      const result = await executeFixture(fixture, suffix);
      assert.equal(result.accepted, false);
      assert.equal(result.state, item.state);
      assert.equal(result.outcomeStage, item.stage);
      assert.equal(result.claim.storeDirectoryCreated, item.directoryCreated);
      assert.equal(result.claim.identityCreated, item.identityCreated);
      if ('readbackMatched' in item) assert.equal(result.claim.identityReadbackMatched, item.readbackMatched);
      assert.equal(result.authorizationReplayAllowed, false);
      assert.equal(result.automaticRetryPerformed, false);
      assert.equal(result.automaticCleanupPerformed, false);
      assert.equal(fixture.filesystem.faultTriggered(), true);
      const identityExists = await fs.access(path.join(fixture.storeRoot, IDENTITY_FILENAME)).then(() => true, () => false);
      assert.equal(identityExists, item.identityFileExists);
      const evaluated = evaluateExecutionReceipt(result);
      assert.equal(evaluated.contract.shapeAccepted, true, `${item.fault}: ${evaluated.contract.blockers.join(', ')}`);
      assert.equal(evaluated.contract.acceptedAsReconciliationEvidence, true);
      await assertClaimCannotReplay(fixture, suffix);
      const replay = await executeFixture(fixture, suffix);
      assert.equal(replay.accepted, false);
      assert.equal(replay.authorizationConsumed, true);
      assert.equal(replay.outcomeStage, 'authorization_already_claimed_stop');
      assert.equal(replay.state, result.state);
    });
  }
});

test('CM-2103 R1 logical registry binding explicitly records zero registry directory identity and marker writes', () => {
  assert.equal(REGISTRY_IDENTITY.claimStorageModel, 'single_atomic_claim_envelope_in_existing_governance_root');
  assert.equal(REGISTRY_IDENTITY.registryDirectoryCreatedByClaim, false);
  assert.equal(REGISTRY_IDENTITY.registryIdentityWrittenByClaim, false);
});
