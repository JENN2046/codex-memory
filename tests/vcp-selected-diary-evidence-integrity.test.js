'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  CAPABILITY,
  buildVcpSelectedDiarySourceIdentity,
  verifyVcpSelectedDiarySourceIdentity
} = require('../src/core/VcpSelectedDiarySourceIdentity');
const {
  runSyntheticVcpSelectedDiaryConformance
} = require('../src/core/SyntheticVcpSelectedDiaryConformance');
const {
  digest,
  generateGovernedNativeReadProofArtifact,
  verifyGovernedNativeReadProofArtifact
} = require('../src/core/GovernedNativeReadProofArtifact');

const COMMIT = '1'.repeat(40);
const TREE = '2'.repeat(40);
const SOURCE = Object.freeze({
  blobOid: '3'.repeat(40),
  bytes: 321,
  sha256: '4'.repeat(64)
});

function sourceFixture() {
  const manifest = buildVcpSelectedDiarySourceIdentity({ commit: COMMIT, tree: TREE, source: SOURCE });
  const resolver = {
    resolveCommit: () => ({ commit: COMMIT, tree: TREE }),
    resolveGitFile: () => SOURCE
  };
  return { manifest, resolver };
}

test('VCP source identity binds exact commit, tree, blob, bytes, hash, and selected-diary capability', () => {
  const fixture = sourceFixture();
  const result = verifyVcpSelectedDiarySourceIdentity(fixture.manifest, fixture.resolver);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.selectedDiaryCapabilityBound, true);
  assert.equal(result.runtimeConformanceProven, false);
  assert.deepEqual(fixture.manifest.capability, CAPABILITY);

  for (const mutate of [
    value => { value.commit = 'a'.repeat(40); },
    value => { value.tree = 'b'.repeat(40); },
    value => { value.blobOid = 'c'.repeat(40); },
    value => { value.bytes += 1; },
    value => { value.sha256 = 'd'.repeat(64); },
    value => { value.capability.globalSearchAccepted = true; }
  ]) {
    const forged = structuredClone(fixture.manifest);
    mutate(forged);
    assert.equal(verifyVcpSelectedDiarySourceIdentity(forged, fixture.resolver).accepted, false);
  }
});

test('synthetic VCP conformance covers single/multi diary and never loads unauthorized index', async () => {
  const fixture = sourceFixture();
  const identity = verifyVcpSelectedDiarySourceIdentity(fixture.manifest, fixture.resolver);
  const result = await runSyntheticVcpSelectedDiaryConformance({
    sourceIdentity: identity,
    async createManager({ isolatedRoot, isolatedStoreRoot, syntheticDiaryLabels, recordIndexLoad }) {
      const rows = new Map(syntheticDiaryLabels.map(label => [label, [{ diaryName: label, score: 1 }]]));
      assert.ok(isolatedStoreRoot.startsWith(isolatedRoot));
      return {
        evidence: {
          isolatedRootBound: true,
          isolatedStoreRoot,
          sourceIdentityDigest: identity.identityDigest,
          existingInputsRead: false,
          providerConfigured: false,
          publicServiceStarted: false
        },
        manager: {
          async search(allowedLabels, _vector, limit, threshold, tags) {
            assert.equal(arguments.length, 5);
            assert.equal(threshold, 0);
            assert.deepEqual(tags, []);
            const output = [];
            for (const label of allowedLabels) {
              recordIndexLoad(label);
              output.push(...rows.get(label));
            }
            return output.slice(0, limit);
          }
        }
      };
    }
  });
  assert.equal(result.accepted, true);
  assert.equal(result.singleDiaryPassed, true);
  assert.equal(result.multiDiaryPassed, true);
  assert.equal(result.unauthorizedIndexNotLoaded, true);
  assert.equal(result.globalSearchCalls, 0);
  assert.equal(result.providerCalls, 0);
  assert.equal(result.existingStoreRead, false);
});

function receiptChain({ derivedIndexWrite = false } = {}) {
  const native = {
    authorization_resolved_before_provider: true,
    diary_allowlist_enforced_before_index_load: true,
    diary_allowlist_enforced_before_vector_search: true,
    result_scope_postcheck_passed: true,
    unscoped_native_search_used: false,
    mapping_reference_bound: true,
    mapping_digest_bound: true,
    allowed_diary_count: 1,
    raw_diary_names_returned: false
  };
  const bridge = { accepted: true, native_receipt_digest: digest(native) };
  const context = {
    bridge_receipt_digest: digest(bridge),
    primary_memory_write_performed: false,
    derived_index_write_performed: derivedIndexWrite,
    other_durable_mutation_performed: false
  };
  return { native, bridge, context };
}

test('proof artifact derives counters from invoker events and detects duplicate runs', async () => {
  const artifact = await generateGovernedNativeReadProofArtifact({
    sourceIdentityDigest: 'a'.repeat(64),
    async invoke(events) {
      events.providerCall();
      events.nativeSearch({ scoped: true });
      events.derivedIndexWrite();
      return { receipts: receiptChain({ derivedIndexWrite: true }) };
    }
  });
  assert.equal(artifact.accepted, true, artifact.blockers.join(', '));
  assert.deepEqual(artifact.counters, {
    invocations: 1,
    providerCalls: 1,
    nativeSearchCalls: 1,
    unscopedNativeSearchCalls: 0,
    localFallbackUses: 0,
    primaryMemoryWrites: 0,
    derivedIndexWrites: 1,
    otherDurableMutations: 0
  });
  assert.equal(artifact.universallyNonReplayable, false);
  assert.equal(Object.isFrozen(artifact), true);
  assert.equal(Object.isFrozen(artifact.counters), true);

  const seenRunIds = new Set();
  assert.equal(verifyGovernedNativeReadProofArtifact(artifact, { seenRunIds }).accepted, true);
  const replay = verifyGovernedNativeReadProofArtifact(artifact, { seenRunIds });
  assert.equal(replay.accepted, false);
  assert.ok(replay.blockers.includes('duplicate_run_id'));
});

test('proof artifact rejects caller counters, forged receipt chain, and unscoped search', async () => {
  await assert.rejects(() => generateGovernedNativeReadProofArtifact({
    sourceIdentityDigest: 'a'.repeat(64),
    invoke: async () => ({ counters: { providerCalls: 0 }, receipts: receiptChain() })
  }), /caller_supplied_counters_forbidden/);

  const artifact = await generateGovernedNativeReadProofArtifact({
    sourceIdentityDigest: 'a'.repeat(64),
    async invoke(events) {
      events.nativeSearch({ scoped: false });
      const receipts = receiptChain();
      receipts.bridge.native_receipt_digest = '0'.repeat(64);
      return { receipts };
    }
  });
  assert.equal(artifact.accepted, false);
  assert.ok(artifact.blockers.includes('bridge.native_receipt_binding'));
  assert.ok(artifact.blockers.includes('unscoped_native_search_observed'));
});
