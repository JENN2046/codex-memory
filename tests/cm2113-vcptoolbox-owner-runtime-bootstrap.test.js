'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildRuntimeIdentity,
  buildStoreIdentity,
  canonicalBytes,
  executeCm2113OwnerRuntimeBootstrap
} = require('../src/core/Cm2113VcpToolBoxOwnerRuntimeBootstrap');
const { sha256 } = require('../src/core/VcpToolBoxDailyNoteOwnerRuntimeAdapter');
const { decisionAccepted } = require('../src/cli/cm2113-vcptoolbox-owner-runtime-bootstrap');

const DECISION_PATH = path.join(__dirname, '../docs/near-model-memory-plan-pack/phase8_vcptoolbox_owner_runtime_bootstrap_decision_cm2113.json');

async function setup() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cm2113-bootstrap-'));
  const governanceRoot = path.join(root, 'governance');
  const authorizationRegistryRoot = path.join(governanceRoot, 'phase8-one-shot-authorization-registries');
  await fs.mkdir(governanceRoot);
  await fs.mkdir(authorizationRegistryRoot);
  const governanceIdentityBytes = Buffer.from('{"registryRootReference":"cm2113-test"}');
  await fs.writeFile(path.join(authorizationRegistryRoot, '.phase8-registry-root-identity.json'), governanceIdentityBytes);
  const pluginBytes = Buffer.from('plugin-source');
  const manifestBytes = Buffer.from('{"name":"DailyNote"}');
  const preloadBytes = Buffer.from('preload-source');
  const binding = {
    runtimeSourceCommit: '1'.repeat(40),
    runtimeSourceTree: '2'.repeat(40),
    pluginBlobOid: '3'.repeat(40),
    manifestBlobOid: '4'.repeat(40),
    pluginSha256: sha256(pluginBytes),
    manifestSha256: sha256(manifestBytes),
    preloadSha256: sha256(preloadBytes),
    dependencyLockBlobOid: '5'.repeat(40),
    dependencyLockSha256: '6'.repeat(64),
    dotenvVersion: '16.6.1',
    dotenvPackageSha256: '8'.repeat(64),
    dotenvMainSha256: '7'.repeat(64),
    lifecycleReference: 'cm2113-lifecycle',
    storeReference: 'cm2113-store',
    storeInstanceId: 'cm2113-store-instance'
  };
  const expected = {
    governanceRootIdentitySha256: sha256(governanceIdentityBytes),
    runtimeIdentitySha256: sha256(canonicalBytes(buildRuntimeIdentity(binding))),
    storeIdentitySha256: sha256(canonicalBytes(buildStoreIdentity(binding)))
  };
  return { root, governanceRoot, authorizationRegistryRoot, governanceIdentityBytes, pluginBytes, manifestBytes, preloadBytes, binding, expected };
}

test('CM-2113 bootstrap materializes exact owner runtime and stable empty store before native write', async t => {
  const fixture = await setup();
  t.after(() => fs.rm(fixture.root, { recursive: true, force: true }));
  const receipt = await executeCm2113OwnerRuntimeBootstrap({
    governanceRoot: fixture.governanceRoot,
    authorizationRegistryRoot: fixture.authorizationRegistryRoot,
    governanceRootIdentityBytes: fixture.governanceIdentityBytes,
    ownerSource: { pluginBytes: fixture.pluginBytes, manifestBytes: fixture.manifestBytes },
    preloadBytes: fixture.preloadBytes,
    binding: fixture.binding,
    expected: fixture.expected,
    authorization: { authorized: true, useCount: 1, replayAllowed: false }
  });
  assert.equal(receipt.result, 'PASS');
  assert.equal(receipt.finalState, 'CONSUMED_SUCCESS');
  assert.equal(receipt.identityPresentBeforeFirstNativeWrite, true);
  assert.equal(receipt.markdownCount, 0);
  assert.equal(receipt.nativeWrites, 0);
  assert.equal(receipt.recordMemoryCalls, 0);
  assert.equal(receipt.rawPathDisclosed, false);
  assert.equal(receipt.runtimeIdentitySha256, fixture.expected.runtimeIdentitySha256);
  assert.equal(receipt.storeIdentitySha256, fixture.expected.storeIdentitySha256);
});

test('CM-2113 bootstrap is exclusive and fails before effects on authority or source drift', async t => {
  const fixture = await setup();
  t.after(() => fs.rm(fixture.root, { recursive: true, force: true }));
  const base = {
    governanceRoot: fixture.governanceRoot,
    authorizationRegistryRoot: fixture.authorizationRegistryRoot,
    governanceRootIdentityBytes: fixture.governanceIdentityBytes,
    ownerSource: { pluginBytes: fixture.pluginBytes, manifestBytes: fixture.manifestBytes },
    preloadBytes: fixture.preloadBytes,
    binding: fixture.binding,
    expected: fixture.expected,
    authorization: { authorized: true, useCount: 1, replayAllowed: false }
  };
  await assert.rejects(executeCm2113OwnerRuntimeBootstrap({ ...base, authorization: { authorized: false } }), /authorization_required/);
  await assert.rejects(executeCm2113OwnerRuntimeBootstrap({ ...base, ownerSource: { ...base.ownerSource, pluginBytes: Buffer.from('drift') } }), /source_binding_mismatch/);
  await executeCm2113OwnerRuntimeBootstrap(base);
  await assert.rejects(executeCm2113OwnerRuntimeBootstrap(base), /root_already_exists/);
});

test('CM-2113 bootstrap decision rejects rehashed nested authority fields', () => {
  const decision = JSON.parse(require('node:fs').readFileSync(DECISION_PATH, 'utf8'));
  const now = new Date('2026-07-12T12:00:00+08:00');
  assert.equal(decisionAccepted(decision, now), true);
  for (const mutate of [
    value => { value.implementation.productionReady = true; },
    value => { value.ownerRuntime.productionReady = true; }
  ]) {
    const candidate = structuredClone(decision);
    mutate(candidate);
    assert.equal(decisionAccepted(candidate, now), false);
  }
});
