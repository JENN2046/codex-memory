'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateCm2094Phase8FrozenExecutionManifest } = require('../src/core/Cm2094Phase8FrozenExecutionManifestContract');
const { exactAllowlist } = require('../src/cli/phase8-frozen-one-shot-executor');
const { sha256Canonical } = require('../src/core/Phase8OneShotNativeWriteExecutionGate');

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'near-model-memory-plan-pack', 'phase8_frozen_execution_manifest.json'), 'utf8'));

test('CM-2094 execution manifest is exact, self-hashed, non-executable, and zero-effect', () => {
  const result = evaluateCm2094Phase8FrozenExecutionManifest(manifest);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.finalReleaseReviewMayBegin, true);
  assert.equal(result.phase8NativeWriteAuthorizationGranted, false);
  assert.equal(result.nativeWriteMayExecute, false);
  assert.equal(result.nonceMayBeClaimed, false);
});

test('CM-2094 execution manifest reconstructs the frozen context, allowlist, root, and scope hashes', () => {
  const context = {
    ...manifest.contextStatic,
    runtimeSourceCommit: manifest.runtimeSourceCommit,
    runtimeSourceTree: manifest.runtimeSourceTree,
    payloadSourceCommit: manifest.payloadSourceCommit,
    payloadBlobOid: manifest.payloadBlobOid,
    payloadBytes: manifest.payloadBytes,
    payloadFileSha256: manifest.payloadFileSha256,
    payloadCanonicalSha256: manifest.payloadCanonicalSha256,
    durableRecordBytes: manifest.durableRecordBytes,
    durableRecordSha256: manifest.durableRecordSha256,
    innerNativeTransport: 'local_http_transport',
    targetReferenceName: manifest.runtimeTarget.targetReferenceName,
    targetKind: manifest.runtimeTarget.targetKind,
    sourceAuthority: 'bridge_runtime_or_static_config',
    writeEnabledShimRequired: true,
    nativeWriteDelegationMode: 'primary',
    innerHttpTargetAccepted: true,
    innerHttpTargetConfigured: true,
    innerHttpAuthConfigured: true,
    innerRecordMemoryToolName: 'knowledge_base.record',
    authorizationRegistryReference: manifest.registryIdentity.authorizationRegistryReference,
    authorizationRegistryStorageRole: manifest.registryIdentity.registryStorageRole,
    authorizationRegistryReinitializationAllowed: false,
    authorizationRegistryDeletionAllowed: false,
    authorizationRegistryRootReference: manifest.registryRootIdentity.registryRootReference,
    authorizationRegistryRootIdentitySha256: manifest.registryRootIdentitySha256,
    authorizationRegistryRootReinitializationAllowed: false,
    authorizationRegistryRootReplacementAllowed: false,
    authorizationRegistryRootRole: 'git_common_dir_governance_state'
  };
  const sortedScope = Object.fromEntries(Object.keys(manifest.allowedScope).sort().map(key => [key, manifest.allowedScope[key]]));
  const scopeHash = crypto.createHash('sha256').update(JSON.stringify(sortedScope)).digest('hex');
  assert.equal(sha256Canonical(context), manifest.contextCanonicalSha256);
  assert.equal(sha256Canonical(exactAllowlist()), manifest.allowlistCanonicalSha256);
  assert.equal(sha256Canonical(manifest.registryRootIdentity), manifest.registryRootIdentitySha256);
  assert.equal(scopeHash, manifest.expectedScopeFingerprint);
});

test('CM-2094 execution manifest fails closed on premature authority or nonzero effects', () => {
  for (const drift of [
    { phase8NativeWriteAuthorizationGranted: true },
    { nativeWriteMayExecuteBeforeFinalRelease: true },
    { bootstrapAuthorizationReplayAllowed: true },
    { executionCounters: { ...manifest.executionCounters, authorizationClaims: 1 } },
    { manifestPayloadSha256: '0'.repeat(64) }
  ]) {
    const result = evaluateCm2094Phase8FrozenExecutionManifest({ ...manifest, ...drift });
    assert.equal(result.accepted, false);
    assert.equal(result.nativeWriteMayExecute, false);
    assert.equal(result.nonceMayBeClaimed, false);
  }
});
