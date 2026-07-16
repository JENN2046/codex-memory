'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  GATE_SEQUENCE,
  IDENTITY_CANONICAL_BYTES,
  IDENTITY_CANONICAL_SHA256,
  IDENTITY_FILE_BYTES,
  IDENTITY_FILE_SHA256,
  IDENTITY_FILENAME,
  IDENTITY_TEMPLATE_PATH,
  ROUTE_DECISION,
  STORE_IDENTITY,
  STORE_ROOT_BINDING,
  STORE_ROOT_BINDING_CANONICAL_BYTES,
  STORE_ROOT_BINDING_CANONICAL_SHA256,
  STORE_ROOT_DERIVATION,
  evaluateCm2102LifecycleFoundation,
  sha256Canonical
} = require('../src/core/Cm2102IdentityBoundRollbackLifecycleFoundation');

const identityBytes = fs.readFileSync(path.join(__dirname, '..', IDENTITY_TEMPLATE_PATH));

function buildPacket() {
  const packet = {
    schemaVersion: 1,
    taskId: 'CM-2102',
    foundationType: 'phase8_identity_bound_synthetic_rollback_lifecycle_foundation_non_executing',
    routeDecisionReference: ROUTE_DECISION.reference,
    routeDecisionSourceCommit: ROUTE_DECISION.sourceCommit,
    routeDecisionSourceTree: ROUTE_DECISION.sourceTree,
    routeDecisionPath: ROUTE_DECISION.path,
    routeDecisionBlobOid: ROUTE_DECISION.blobOid,
    routeDecisionBytes: ROUTE_DECISION.bytes,
    routeDecisionSha256: ROUTE_DECISION.sha256,
    routeDecisionPayloadSha256: ROUTE_DECISION.payloadSha256,
    implementationCommit: 'a'.repeat(40),
    implementationTree: 'b'.repeat(40),
    foundationContractPath: 'src/core/Cm2102IdentityBoundRollbackLifecycleFoundation.js',
    emptyStorePreflightContractPath: 'src/core/Cm2102IdentityBoundEmptyStorePreflightContract.js',
    bootstrapRequestPath: 'docs/near-model-memory-plan-pack/phase8_identity_bound_store_bootstrap_authorization_request_cm2102.json',
    lifecycleReference: STORE_IDENTITY.lifecycleReference,
    storeReference: STORE_IDENTITY.storeReference,
    storeInstanceId: STORE_IDENTITY.storeInstanceId,
    storeRole: STORE_IDENTITY.storeRole,
    storeIdentityTemplatePath: IDENTITY_TEMPLATE_PATH,
    storeIdentityTemplateBlobOid: 'c'.repeat(40),
    storeIdentityTemplateFileBytes: IDENTITY_FILE_BYTES,
    storeIdentityTemplateFileSha256: IDENTITY_FILE_SHA256,
    storeIdentityCanonicalBytes: IDENTITY_CANONICAL_BYTES,
    storeIdentityCanonicalSha256: IDENTITY_CANONICAL_SHA256,
    storeIdentityRuntimeFilename: IDENTITY_FILENAME,
    storeRootDerivation: STORE_ROOT_DERIVATION,
    storeRootBinding: STORE_ROOT_BINDING,
    storeRootBindingCanonicalBytes: STORE_ROOT_BINDING_CANONICAL_BYTES,
    storeRootBindingCanonicalSha256: STORE_ROOT_BINDING_CANONICAL_SHA256,
    gateSequence: GATE_SEQUENCE,
    cm2094ReuseBoundary: {
      authorizationDecision: false,
      nonce: false,
      receiptId: false,
      registryClaim: false,
      recordTarget: false,
      executionPacket: false
    },
    routeBSelected: true,
    syntheticOnly: true,
    identityPresentBeforeFirstNativeWriteRequired: true,
    identityReplacementAllowed: false,
    identityReinitializationAllowed: false,
    physicalDeleteAllowed: false,
    bootstrapRequestPrepared: true,
    emptyStorePreflightContractImplemented: true,
    futureWritePacketDesignMayBegin: true,
    storeIdentityCreated: false,
    bootstrapAuthorized: false,
    bootstrapExecuted: false,
    emptyStorePreflightAuthorized: false,
    emptyStorePreflightExecuted: false,
    recordMemoryAuthorized: false,
    recordMemoryExecuted: false,
    tombstoneMemoryAuthorized: false,
    tombstoneMemoryExecuted: false,
    verifyAuthorized: false,
    verifyExecuted: false,
    nonceClaimed: false,
    nativeReads: 0,
    nativeWrites: 0,
    rollbackOrCompensationOperations: 0,
    rollbackDrillPassed: false,
    failureRecoveryProofPassed: false,
    phase8Completed: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  };
  packet.foundationPayloadSha256 = sha256Canonical(packet);
  return packet;
}

test('CM-2102 accepts the non-executing identity-bound lifecycle foundation', () => {
  const result = evaluateCm2102LifecycleFoundation({ packet: buildPacket(), identityTemplateBytes: identityBytes });
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.foundationPrepared, true);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.storeIdentityCreated, false);
  assert.equal(result.preflightExecuted, false);
  assert.equal(result.nativeActions, 0);
  assert.equal(result.rollbackDrillPassed, false);
  assert.equal(result.phase8Completed, false);
});

test('CM-2102 frozen foundation packet matches the implementation and identity template', () => {
  const packet = JSON.parse(fs.readFileSync(path.join(
    __dirname,
    '..',
    'docs',
    'near-model-memory-plan-pack',
    'phase8_identity_bound_rollback_lifecycle_foundation_cm2102.json'
  ), 'utf8'));
  const result = evaluateCm2102LifecycleFoundation({ packet, identityTemplateBytes: identityBytes });
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.nativeActions, 0);
});

test('CM-2102 foundation fails closed on identity, order, reuse, authority, action, or schema drift', () => {
  const cases = [
    packet => ({ ...packet, unexpectedCapability: true }),
    packet => ({ ...packet, storeIdentityCreated: true }),
    packet => ({ ...packet, recordMemoryAuthorized: true }),
    packet => ({ ...packet, gateSequence: [...packet.gateSequence].reverse() }),
    packet => ({ ...packet, cm2094ReuseBoundary: { ...packet.cm2094ReuseBoundary, nonce: true } }),
    packet => ({ ...packet, storeRootDerivation: { ...packet.storeRootDerivation, environmentPathOverrideAllowed: true } }),
    packet => ({ ...packet, storeRootBinding: { ...packet.storeRootBinding, storeReference: 'clone-store' } }),
    packet => ({ ...packet, foundationPayloadSha256: '0'.repeat(64) })
  ];
  for (const mutate of cases) {
    const packet = mutate(buildPacket());
    if (packet.foundationPayloadSha256 !== '0'.repeat(64)) {
      const { foundationPayloadSha256, ...payload } = packet;
      packet.foundationPayloadSha256 = sha256Canonical(payload);
    }
    const result = evaluateCm2102LifecycleFoundation({ packet, identityTemplateBytes: identityBytes });
    assert.equal(result.accepted, false, JSON.stringify(packet));
    assert.equal(result.executionAuthorized, false);
    assert.equal(result.storeIdentityCreated, false);
  }
});

test('CM-2102 foundation rejects altered identity bytes without reading or creating a store', () => {
  const changed = Buffer.concat([identityBytes, Buffer.from(' ')]);
  const result = evaluateCm2102LifecycleFoundation({ packet: buildPacket(), identityTemplateBytes: changed });
  assert.equal(result.accepted, false);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.nativeActions, 0);
});
