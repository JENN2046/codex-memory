'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  GOVERNED_RUNTIME_IDENTITY_TRANSITION_FAILURE_REGISTRY,
  GOVERNED_RUNTIME_IDENTITY_TRANSITION_NON_TERMINAL_STAGES,
  GOVERNED_RUNTIME_IDENTITY_TRANSITION_PROTOCOL,
  appendRuntimeIdentityTransitionStage,
  canonicalJson,
  createGovernedRuntimeIdentityTransitionProtocol,
  createRuntimeIdentityTransitionRequest,
  createRuntimeIdentityTransitionTerminal,
  digestObject,
  runtimeIdentityTransitionAuthorityContextDigest,
  runtimeIdentityTransitionRequestDigest,
  transitionFailureRegistryEntry,
  validateGovernedRuntimeIdentityTransitionProtocol,
  validateRuntimeIdentityTransitionReceipt,
  validateRuntimeIdentityTransitionRequest,
  validateRuntimeIdentityTransitionTerminal
} = require('../../packages/chatgpt-r4-contracts');
const {
  LEGACY_CONTROLLER_BINDING_MODEL,
  STABLE_CONTROLLER_BINDING_MODEL,
  createAuthorityProofReplayStore,
  createGovernedRuntimeIdentityStateStore,
  createGovernedRuntimeIdentityTransitionCoordinator,
  createTransitionRecordStore,
  stableControllerBinding,
  validateGovernedRuntimeIdentityState
} = require('../../src/runtime/governed-runtime-identity-transition');
const {
  createGovernedRuntimeIdentityTransitionObserver
} = require('../../src/runtime/governed-runtime-identity-transition-observer');

const NOW = new Date('2026-08-01T00:00:00.000Z');
const SAFE_STOP_DIGEST = digestObject('safe-stop-runtime-A');
const AUTHORITY_ID = `grauth_${'A'.repeat(24)}`;
const AUTHORITY_LINEAGE = digestObject('stable-authority-lineage');

function protocolVersions(suffix = 'a') {
  return {
    edge_response: `v2-${suffix}`,
    governed_read_attempt: 1,
    runtime_identity_transition: 1
  };
}

function legacyRuntime(suffix = 'a') {
  return {
    identity_digest: digestObject(`legacy-profile-record-${suffix}`),
    source_head: suffix.repeat(40).slice(0, 40),
    manifest_schema: 1,
    manifest_digest: digestObject(`manifest-${suffix}`),
    profile_schema: 6,
    endpoint_identity: 'canonical_client',
    protocol_versions: protocolVersions(suffix),
    lineage_digest: digestObject(`runtime-lineage-${suffix}`)
  };
}

function toRuntime(suffix = 'b') {
  return {
    source_head: suffix.repeat(40).slice(0, 40),
    manifest_schema: 1,
    manifest_digest: digestObject(`manifest-${suffix}`),
    profile_schema: 6,
    endpoint_identity: 'canonical_client',
    protocol_versions: protocolVersions(suffix),
    candidate_tree_digest: digestObject(`candidate-tree-${suffix}`)
  };
}

function initialState({
  acceptedRuntime = legacyRuntime('a'),
  lifecycle = null,
  controllerClientDigest = digestObject('legacy-controller-client'),
  migrationConsumed = false
} = {}) {
  const selectedLifecycle = lifecycle || {
    lifecycle_state: 'stopped',
    held_stopped: true,
    safe_stop_receipt_digest: SAFE_STOP_DIGEST,
    running_component_count: 0
  };
  return {
    schema_version: 1,
    store_version: 0,
    accepted_runtime: acceptedRuntime,
    lifecycle: selectedLifecycle,
    controller_binding: {
      model: LEGACY_CONTROLLER_BINDING_MODEL,
      current_controller_client_identity_digest: controllerClientDigest,
      accepted_runtime_identity_digest: acceptedRuntime.identity_digest,
      accepted_runtime_source_head: acceptedRuntime.source_head,
      accepted_runtime_manifest_digest: acceptedRuntime.manifest_digest
    },
    legacy_migration: {
      consumed: migrationConsumed,
      evidence_digest: null
    },
    last_transition: null
  };
}

function legacyEvidence(state, target = toRuntime('b')) {
  return {
    safe_stop_receipt_digest: state.lifecycle.safe_stop_receipt_digest,
    accepted_runtime_identity_digest: state.accepted_runtime.identity_digest,
    accepted_runtime_lineage_digest: state.accepted_runtime.lineage_digest,
    accepted_runtime_manifest_digest: state.accepted_runtime.manifest_digest,
    current_controller_client_identity_digest:
      state.controller_binding.current_controller_client_identity_digest,
    candidate_manifest_digest: target.manifest_digest
  };
}

function requestFor(state, {
  suffix = 'A',
  transitionRef = `grit_${suffix.repeat(32)}`,
  target = toRuntime('b'),
  fromRuntime = state.accepted_runtime,
  safeStopDigest = state.lifecycle.safe_stop_receipt_digest,
  authorityId = AUTHORITY_ID,
  authorityLineage = AUTHORITY_LINEAGE,
  proofDigest = digestObject(`authority-proof-${suffix}`),
  legacy = legacyEvidence(state, target),
  now = NOW,
  ttlSeconds = 120
} = {}) {
  return createRuntimeIdentityTransitionRequest({
    transitionRef,
    authority: {
      authority_id: authorityId,
      authority_lineage_digest: authorityLineage,
      authority_proof_digest: proofDigest
    },
    fromRuntime,
    toRuntime: target,
    preconditions: {
      lifecycle_state: 'stopped',
      held_stopped: true,
      safe_stop_receipt_digest: safeStopDigest,
      running_component_count: 0
    },
    nonce: `nonce_${suffix.repeat(24)}`,
    now,
    ttlSeconds,
    legacyTransitionEvidence: legacy
  });
}

function authorityVerifier({ authority, authority_context_digest: context }) {
  return {
    verified: authority.authority_id === AUTHORITY_ID,
    authority_id: authority.authority_id,
    authority_lineage_digest: AUTHORITY_LINEAGE,
    authority_context_digest: context,
    authority_proof_digest: authority.authority_proof_digest
  };
}

function manifestVerifier({ to_runtime: target }) {
  return {
    verified: true,
    complete: true,
    scope_clean: true,
    source_head: target.source_head,
    manifest_schema: target.manifest_schema,
    manifest_digest: target.manifest_digest,
    candidate_tree_digest: target.candidate_tree_digest,
    protocol_versions: structuredClone(target.protocol_versions)
  };
}

function harness({
  state = initialState(),
  authority = authorityVerifier,
  manifest = manifestVerifier,
  clock = () => NOW,
  store = null,
  proofStore = null,
  recordStore = null,
  observer = null
} = {}) {
  const selectedStore = store || createGovernedRuntimeIdentityStateStore(state);
  const selectedProofStore = proofStore || createAuthorityProofReplayStore();
  const selectedRecordStore = recordStore || createTransitionRecordStore();
  const selectedObserver = observer ||
    createGovernedRuntimeIdentityTransitionObserver();
  const coordinator = createGovernedRuntimeIdentityTransitionCoordinator({
    store: selectedStore,
    authorityProofReplayStore: selectedProofStore,
    transitionRecordStore: selectedRecordStore,
    authorityVerifier: authority,
    candidateManifestVerifier: manifest,
    clock,
    eventSink: selectedObserver.observe
  });
  return {
    coordinator,
    observer: selectedObserver,
    proofStore: selectedProofStore,
    recordStore: selectedRecordStore,
    store: selectedStore,
    state
  };
}

function prepareAndCommit(options = {}) {
  const value = harness(options);
  const request = requestFor(value.state, options.request || {});
  const prepared = value.coordinator.preview(request);
  assert.equal(prepared.status, 'prepared');
  const committed = value.coordinator.commit(prepared.preview);
  return { ...value, committed, prepared, request };
}

function replayObserverPrelude(observer, result) {
  observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_accepted',
    request: result.request
  });
  for (const receipt of result.committed.protocol.receipts) {
    observer.observe({
      component: 'governed_runtime_identity_transition_coordinator',
      event: 'transition_receipt_appended',
      transition_ref: result.request.transition_ref,
      receipt
    });
  }
}

test('v1 request canonical digest binds every nested field and separates authority from runtime source', () => {
  const state = initialState();
  const request = requestFor(state);
  validateRuntimeIdentityTransitionRequest(request);
  assert.equal(request.protocol, GOVERNED_RUNTIME_IDENTITY_TRANSITION_PROTOCOL);
  assert.notEqual(
    request.authority.authority_lineage_digest,
    request.from_runtime.manifest_digest
  );
  const digest = runtimeIdentityTransitionRequestDigest(request);
  for (const mutate of [
    value => { value.authority.authority_id = `grauth_${'Z'.repeat(24)}`; },
    value => { value.from_runtime.identity_digest = digestObject('drift'); },
    value => { value.to_runtime.manifest_digest = digestObject('drift'); },
    value => { value.preconditions.safe_stop_receipt_digest = digestObject('old'); },
    value => { value.request.nonce = `nonce_${'Z'.repeat(24)}`; }
  ]) {
    const changed = structuredClone(request);
    mutate(changed);
    assert.notEqual(runtimeIdentityTransitionRequestDigest(changed), digest);
  }
  assert.match(
    runtimeIdentityTransitionAuthorityContextDigest(request),
    /^sha256:[a-f0-9]{64}$/u
  );
});

test('failure registry is unique, closed, and contains every required canonical reason', () => {
  const required = [
    'authority_unverified',
    'authority_lineage_mismatch',
    'safe_stop_receipt_invalid',
    'runtime_not_stopped',
    'runtime_not_held',
    'from_identity_changed',
    'from_manifest_changed',
    'candidate_manifest_invalid',
    'candidate_manifest_scope_dirty',
    'profile_schema_mismatch',
    'endpoint_identity_mismatch',
    'protocol_binding_invalid',
    'transition_expired',
    'transition_replayed',
    'transition_cas_lost',
    'post_identity_mismatch',
    'partial_transition_detected'
  ];
  assert.deepEqual(
    required.filter(code => !Object.hasOwn(
      GOVERNED_RUNTIME_IDENTITY_TRANSITION_FAILURE_REGISTRY,
      code
    )),
    []
  );
  for (const code of required) {
    assert.equal(transitionFailureRegistryEntry(code).category.length > 0, true);
  }
  assert.throws(
    () => transitionFailureRegistryEntry('constructor'),
    { code: 'transition_reason_unknown' }
  );
});

test('successful legacy migration performs one atomic CAS and leaves runtime stopped', () => {
  const result = prepareAndCommit();
  assert.equal(result.committed.status, 'terminal_success');
  validateGovernedRuntimeIdentityTransitionProtocol(result.committed.protocol);
  const snapshot = result.store.snapshot();
  validateGovernedRuntimeIdentityState(snapshot);
  assert.equal(snapshot.store_version, 1);
  assert.equal(snapshot.controller_binding.model, STABLE_CONTROLLER_BINDING_MODEL);
  assert.equal(
    snapshot.controller_binding.accepted_runtime_identity_digest,
    snapshot.accepted_runtime.identity_digest
  );
  assert.equal(snapshot.legacy_migration.consumed, true);
  assert.deepEqual(
    snapshot.last_transition.protocol,
    result.committed.protocol
  );
  assert.equal(snapshot.lifecycle.lifecycle_state, 'stopped');
  assert.equal(snapshot.lifecycle.held_stopped, true);
  assert.equal(snapshot.lifecycle.running_component_count, 0);
  assert.deepEqual(
    Object.values(snapshot.last_transition.side_effects),
    [false, false, false, false, false, false]
  );
  assert.equal(result.observer.snapshot().atomic_commits_verified, 1);
  assert.equal(result.observer.snapshot().terminal_successes, 1);
  assert.deepEqual(
    result.observer.reconcile(result.request.transition_ref),
    result.committed.protocol
  );
});

test('persisted stable authority IDs use the canonical request format', () => {
  const result = prepareAndCommit();
  const state = structuredClone(result.store.snapshot());
  state.controller_binding.authority_id = '';
  assert.throws(
    () => validateGovernedRuntimeIdentityState(state),
    { code: 'transition_store_controller_binding_invalid' }
  );
});

test('persisted legacy migration consumption requires an evidence digest exactly once', () => {
  for (const legacyMigration of [
    { consumed: true, evidence_digest: null },
    { consumed: false, evidence_digest: digestObject('orphan-migration-evidence') }
  ]) {
    const state = initialState();
    state.legacy_migration = legacyMigration;
    assert.throws(
      () => validateGovernedRuntimeIdentityState(state),
      { code: 'transition_store_migration_invalid' }
    );
  }
});

test('runtime protocol bindings reject non-positive numeric versions', () => {
  const state = initialState();
  for (const runtimeKey of ['from_runtime', 'to_runtime']) {
    for (const version of [-1, 0]) {
      const request = structuredClone(requestFor(state));
      request[runtimeKey].protocol_versions.governed_read_attempt = version;
      assert.throws(
        () => validateRuntimeIdentityTransitionRequest(request),
        {
          code: runtimeKey === 'from_runtime'
            ? 'transition_runtime_identity_invalid'
            : 'transition_to_runtime_invalid'
        }
      );
    }
  }
});

test('persisted last transition is bound to the accepted runtime and binding', () => {
  const first = prepareAndCommit();
  const other = prepareAndCommit({
    request: {
      suffix: 'C',
      target: toRuntime('c'),
      proofDigest: digestObject('unrelated-last-transition-proof-C')
    }
  });
  const state = structuredClone(first.store.snapshot());
  state.last_transition.protocol = other.committed.protocol;
  state.last_transition.transition_ref_digest = digestObject(
    other.request.transition_ref
  );
  state.last_transition.protocol_digest = digestObject(
    other.committed.protocol
  );
  state.last_transition.terminal_digest =
    other.committed.protocol.terminal.terminal_digest;
  assert.throws(
    () => validateGovernedRuntimeIdentityState(state),
    { code: 'transition_store_last_transition_invalid' }
  );

  const failureRequest = requestFor(initialState(), {
    suffix: 'H',
    proofDigest: digestObject('failure-last-transition-proof-H')
  });
  const failureTerminal = createRuntimeIdentityTransitionTerminal({
    request: failureRequest,
    receipts: [],
    outcome: 'failure',
    reasonCode: 'transition_replayed',
    runtimeStopped: true
  });
  const failureProtocol = createGovernedRuntimeIdentityTransitionProtocol({
    request: failureRequest,
    receipts: [],
    terminal: failureTerminal
  });
  state.last_transition.protocol = failureProtocol;
  state.last_transition.transition_ref_digest = digestObject(
    failureRequest.transition_ref
  );
  state.last_transition.protocol_digest = digestObject(failureProtocol);
  state.last_transition.terminal_digest = failureTerminal.terminal_digest;
  assert.throws(
    () => validateGovernedRuntimeIdentityState(state),
    { code: 'transition_store_last_transition_invalid' }
  );
});

test('persisted transition binds the current stop receipt and legacy evidence', () => {
  const result = prepareAndCommit();
  const wrongStop = structuredClone(result.store.snapshot());
  wrongStop.lifecycle.safe_stop_receipt_digest =
    digestObject('unrelated-restored-safe-stop');
  assert.throws(
    () => validateGovernedRuntimeIdentityState(wrongStop),
    { code: 'transition_store_last_transition_invalid' }
  );

  const wrongMigration = structuredClone(result.store.snapshot());
  wrongMigration.legacy_migration.evidence_digest =
    digestObject('wrong-retained-legacy-evidence');
  assert.throws(
    () => validateGovernedRuntimeIdentityState(wrongMigration),
    { code: 'transition_store_last_transition_invalid' }
  );
});

test('1. receipts from different transition requests cannot be spliced', () => {
  const state = initialState();
  const a = requestFor(state, { suffix: 'A' });
  const b = requestFor(state, {
    suffix: 'B',
    proofDigest: digestObject('proof-B')
  });
  const createdA = appendRuntimeIdentityTransitionStage(
    { request: a, receipts: [] },
    { stage: 'CREATED', evidenceDigest: digestObject('created-A') }
  ).receipts[0];
  assert.throws(
    () => validateRuntimeIdentityTransitionReceipt(createdA, {
      request: b,
      receipts: []
    }),
    { code: 'transition_receipt_contract_invalid' }
  );
});

test('2. different runtime lineages cannot be mixed', () => {
  const state = initialState();
  const changed = {
    ...state.accepted_runtime,
    lineage_digest: digestObject('other-lineage'),
    identity_digest: digestObject('other-identity')
  };
  const run = harness({ state });
  const outcome = run.coordinator.preview(requestFor(state, {
    fromRuntime: changed,
    legacy: {
      ...legacyEvidence(state),
      accepted_runtime_identity_digest: changed.identity_digest,
      accepted_runtime_lineage_digest: changed.lineage_digest
    }
  }));
  assert.equal(outcome.status, 'terminal_failure');
  assert.equal(outcome.protocol.terminal.reason_code, 'from_identity_changed');
});

test('3. a safe-stop receipt from another runtime is rejected', () => {
  const state = initialState();
  const run = harness({ state });
  const outcome = run.coordinator.preview(requestFor(state, {
    safeStopDigest: digestObject('safe-stop-other-runtime')
  }));
  assert.equal(outcome.protocol.terminal.reason_code, 'safe_stop_receipt_invalid');
});

test('4. a running runtime rejects transition before candidate verification', () => {
  const state = initialState({
    lifecycle: {
      lifecycle_state: 'running',
      held_stopped: false,
      safe_stop_receipt_digest: SAFE_STOP_DIGEST,
      running_component_count: 1
    }
  });
  let manifestCalls = 0;
  const run = harness({
    state,
    manifest(input) {
      manifestCalls += 1;
      return manifestVerifier(input);
    }
  });
  const outcome = run.coordinator.preview(requestFor(state));
  assert.equal(outcome.protocol.terminal.reason_code, 'runtime_not_stopped');
  assert.equal(manifestCalls, 0);
});

test('4a. stopped lifecycle with running components is not reported stopped', () => {
  const state = initialState({
    lifecycle: {
      lifecycle_state: 'stopped',
      held_stopped: true,
      safe_stop_receipt_digest: SAFE_STOP_DIGEST,
      running_component_count: 1
    }
  });
  const run = harness({ state });
  const outcome = run.coordinator.preview(requestFor(state));
  assert.equal(outcome.protocol.terminal.reason_code, 'runtime_not_stopped');
  assert.equal(outcome.protocol.terminal.runtime_stopped, false);
});

test('5. drift in any from-runtime digest is rejected', () => {
  for (const field of [
    'identity_digest',
    'manifest_digest',
    'lineage_digest'
  ]) {
    const state = initialState();
    const changed = {
      ...state.accepted_runtime,
      [field]: digestObject(`changed-${field}`)
    };
    const run = harness({ state });
    const outcome = run.coordinator.preview(requestFor(state, {
      suffix: field[0].toUpperCase(),
      proofDigest: digestObject(`proof-${field}`),
      fromRuntime: changed,
      legacy: {
        ...legacyEvidence(state),
        accepted_runtime_identity_digest: changed.identity_digest,
        accepted_runtime_lineage_digest: changed.lineage_digest,
        accepted_runtime_manifest_digest: changed.manifest_digest
      }
    }));
    assert.equal(outcome.status, 'terminal_failure');
    assert.match(
      outcome.protocol.terminal.reason_code,
      /^from_(?:identity|manifest)_changed$/u
    );
  }
});

test('6. candidate content evidence that does not reproduce its digest is rejected', () => {
  const state = initialState();
  const run = harness({
    state,
    manifest(input) {
      return {
        ...manifestVerifier(input),
        manifest_digest: digestObject('different-content')
      };
    }
  });
  const outcome = run.coordinator.preview(requestFor(state));
  assert.equal(outcome.protocol.terminal.reason_code, 'candidate_manifest_invalid');
});

test('6a. malformed candidate verifier output becomes a canonical failure', () => {
  const state = initialState();
  const run = harness({
    state,
    manifest(input) {
      const verification = manifestVerifier(input);
      delete verification.protocol_versions;
      return verification;
    }
  });
  const outcome = run.coordinator.preview(requestFor(state));
  assert.equal(outcome.status, 'terminal_failure');
  assert.equal(outcome.protocol.terminal.reason_code, 'candidate_manifest_invalid');
});

test('6b. malformed candidate revalidation is a canonical failure without CAS', () => {
  const state = initialState();
  let calls = 0;
  const run = harness({
    state,
    manifest(input) {
      calls += 1;
      const verification = manifestVerifier(input);
      if (calls === 2) delete verification.protocol_versions;
      return verification;
    }
  });
  const prepared = run.coordinator.preview(requestFor(state));
  assert.equal(prepared.status, 'prepared');
  const outcome = run.coordinator.commit(prepared.preview);
  assert.equal(outcome.status, 'terminal_failure');
  assert.equal(outcome.protocol.terminal.reason_code, 'transition_cas_lost');
  assert.equal(run.store.snapshot().store_version, 0);
});

test('6c. candidate evidence is allowlist-normalized before receipt hashing', () => {
  const state = initialState();
  const run = harness({
    state,
    manifest({ to_runtime: target }) {
      const result = {
        ...manifestVerifier({ to_runtime: target }),
        ignored_undefined: undefined
      };
      result.ignored_cycle = result;
      return result;
    }
  });
  const prepared = run.coordinator.preview(requestFor(state));
  assert.equal(prepared.status, 'prepared');
  assert.equal(
    prepared.preview.receipts.some(receipt =>
      receipt.stage === 'CANDIDATE_MANIFEST_VERIFIED' &&
      receipt.evidence_status === 'verified'
    ),
    true
  );
});

test('7. dirty candidate manifest scope is rejected', () => {
  const state = initialState();
  const run = harness({
    state,
    manifest(input) {
      return { ...manifestVerifier(input), scope_clean: false };
    }
  });
  const outcome = run.coordinator.preview(requestFor(state));
  assert.equal(
    outcome.protocol.terminal.reason_code,
    'candidate_manifest_scope_dirty'
  );
});

test('8. controller checkout identity cannot automatically become authority', () => {
  const state = initialState();
  const checkoutDigest = state.controller_binding
    .current_controller_client_identity_digest;
  const run = harness({
    state,
    authority({ authority, authority_context_digest: context }) {
      return {
        verified: false,
        authority_id: authority.authority_id,
        authority_lineage_digest: checkoutDigest,
        authority_context_digest: context,
        authority_proof_digest: authority.authority_proof_digest
      };
    }
  });
  const outcome = run.coordinator.preview(requestFor(state));
  assert.equal(outcome.protocol.terminal.reason_code, 'authority_unverified');
});

test('8a. authority evidence is allowlist-normalized before proof consumption', () => {
  const state = initialState();
  const run = harness({
    state,
    authority(input) {
      const verification = authorityVerifier(input);
      verification.undefined_extra = undefined;
      verification.circular_extra = verification;
      return verification;
    }
  });
  const prepared = run.coordinator.preview(requestFor(state));
  assert.equal(prepared.status, 'prepared');
  assert.equal(run.proofStore.snapshot().length, 1);
  assert.equal(
    run.coordinator.commit(prepared.preview).status,
    'terminal_success'
  );
});

test('9. candidate source cannot approve itself', () => {
  const state = initialState();
  const target = toRuntime('b');
  const run = harness({
    state,
    authority({ authority, authority_context_digest: context }) {
      return {
        verified: true,
        authority_id: authority.authority_id,
        authority_lineage_digest: target.manifest_digest,
        authority_context_digest: context,
        authority_proof_digest: authority.authority_proof_digest
      };
    }
  });
  const outcome = run.coordinator.preview(requestFor(state));
  assert.equal(
    outcome.protocol.terminal.reason_code,
    'authority_lineage_mismatch'
  );
});

test('10. authority proof cannot replay across transition refs', () => {
  const state = initialState();
  const run = harness({ state });
  const proof = digestObject('one-proof');
  const first = run.coordinator.preview(requestFor(state, {
    suffix: 'A', proofDigest: proof
  }));
  assert.equal(first.status, 'prepared');
  const second = run.coordinator.preview(requestFor(state, {
    suffix: 'B', proofDigest: proof
  }));
  assert.equal(second.protocol.terminal.reason_code, 'transition_replayed');
});

test('10a. authority proof replay remains rejected after coordinator recreation', () => {
  const state = initialState();
  const first = harness({ state });
  const proof = digestObject('durable-one-proof');
  const prepared = first.coordinator.preview(requestFor(state, {
    suffix: 'A', proofDigest: proof
  }));
  assert.equal(prepared.status, 'prepared');

  const rebuilt = harness({
    state,
    store: first.store,
    proofStore: first.proofStore
  });
  const replay = rebuilt.coordinator.preview(requestFor(state, {
    suffix: 'B', proofDigest: proof
  }));
  assert.equal(replay.status, 'terminal_failure');
  assert.equal(replay.protocol.terminal.reason_code, 'transition_replayed');
  assert.equal(first.proofStore.snapshot().length, 1);
});

test('10a1. consumed authority proof markers do not exhaust at 4096 entries', () => {
  const proofStore = createAuthorityProofReplayStore();
  for (let index = 0; index < 4097; index += 1) {
    assert.equal(proofStore.consume({
      authority_proof_digest: digestObject(`durable-proof-${index}`),
      authority_context_digest: digestObject(`durable-context-${index}`),
      transition_ref: `grit_${index.toString(36).padStart(32, 'A')}`
    }), true);
  }
  const snapshot = proofStore.snapshot();
  assert.equal(snapshot.length, 4097);
  const rebuilt = createAuthorityProofReplayStore(snapshot);
  assert.equal(rebuilt.consume(snapshot[0]), false);
  assert.equal(rebuilt.snapshot().length, 4097);
});

test('10b. same-ref replay cannot overwrite prepared or successful authority records', () => {
  const state = initialState();
  const run = harness({ state });
  const request = requestFor(state);
  const prepared = run.coordinator.preview(request);
  assert.equal(prepared.status, 'prepared');

  const preparedReplay = run.coordinator.preview(request);
  assert.equal(preparedReplay.protocol.terminal.reason_code, 'transition_replayed');
  const committed = run.coordinator.commit(prepared.preview);
  assert.equal(committed.status, 'terminal_success');

  const authoritative = run.coordinator.protocol(request.transition_ref);
  const terminalDigest = authoritative.terminal.terminal_digest;
  const successfulReplay = run.coordinator.preview(request);
  assert.equal(successfulReplay.protocol.terminal.reason_code, 'transition_replayed');
  assert.equal(
    run.coordinator.protocol(request.transition_ref).terminal.terminal_digest,
    terminalDigest
  );
  assert.equal(
    run.store.snapshot().last_transition.terminal_digest,
    terminalDigest
  );
});

test('10c. transition ref replay remains rejected after coordinator recreation', () => {
  const first = prepareAndCommit();
  const state = first.store.snapshot();
  const rebuilt = harness({
    state,
    store: first.store,
    proofStore: first.proofStore,
    recordStore: first.recordStore
  });
  const replay = rebuilt.coordinator.preview(requestFor(state, {
    suffix: 'R',
    transitionRef: first.request.transition_ref,
    target: toRuntime('c'),
    fromRuntime: state.accepted_runtime,
    proofDigest: digestObject('fresh-proof-for-old-ref'),
    legacy: null
  }));
  assert.equal(replay.status, 'terminal_failure');
  assert.equal(replay.protocol.terminal.reason_code, 'transition_replayed');
  assert.deepEqual(
    rebuilt.coordinator.protocol(first.request.transition_ref),
    first.committed.protocol
  );
});

test('10c1. archived terminals preserve replay markers without consuming admission capacity', () => {
  const state = initialState();
  const recordStore = createTransitionRecordStore([], {
    maxActiveReservations: 1
  });
  const firstRequest = requestFor(state);
  const firstDigest = runtimeIdentityTransitionRequestDigest(firstRequest);
  const firstTerminal = createRuntimeIdentityTransitionTerminal({
    request: firstRequest,
    receipts: [],
    outcome: 'failure',
    reasonCode: 'transition_replayed',
    runtimeStopped: true
  });
  const firstProtocol = createGovernedRuntimeIdentityTransitionProtocol({
    request: firstRequest,
    receipts: [],
    terminal: firstTerminal
  });
  assert.equal(recordStore.reserve({
    transition_ref: firstRequest.transition_ref,
    request_digest: firstDigest
  }), true);
  assert.equal(recordStore.finalize({
    transition_ref: firstRequest.transition_ref,
    request_digest: firstDigest,
    protocol: firstProtocol
  }), true);

  const secondRequest = requestFor(state, {
    suffix: 'B',
    proofDigest: digestObject('archive-capacity-proof-B')
  });
  assert.equal(recordStore.reserve({
    transition_ref: secondRequest.transition_ref,
    request_digest: runtimeIdentityTransitionRequestDigest(secondRequest)
  }), true);
  assert.equal(recordStore.reserve({
    transition_ref: firstRequest.transition_ref,
    request_digest: firstDigest
  }), false);
  assert.equal(recordStore.get(firstRequest.transition_ref).status, 'terminal');
});

test('10d. coordinator recovers a reserved ref index from atomic state protocol', () => {
  const first = prepareAndCommit();
  const state = first.store.snapshot();
  const recordStore = createTransitionRecordStore([{
    transition_ref: first.request.transition_ref,
    request_digest: runtimeIdentityTransitionRequestDigest(first.request),
    status: 'reserved',
    protocol: null
  }]);
  const rebuiltStore = createGovernedRuntimeIdentityStateStore(state);
  const rebuilt = harness({ state, store: rebuiltStore, recordStore });
  assert.deepEqual(
    recordStore.get(first.request.transition_ref).protocol,
    first.committed.protocol
  );
  assert.deepEqual(
    rebuilt.coordinator.protocol(first.request.transition_ref),
    first.committed.protocol
  );
});

test('10e. a failed terminal-index write is recovered before the next transition', () => {
  const state = initialState();
  const durableRecords = createTransitionRecordStore();
  let failNextSuccessFinalization = true;
  const recordStore = {
    reserve: durableRecords.reserve,
    get: durableRecords.get,
    snapshot: durableRecords.snapshot,
    finalize(input) {
      if (failNextSuccessFinalization &&
          input.protocol.terminal.outcome === 'success') {
        failNextSuccessFinalization = false;
        throw new Error('synthetic-finalize-crash');
      }
      return durableRecords.finalize(input);
    }
  };
  const run = harness({ state, recordStore });
  const firstRequest = requestFor(state);
  const firstPrepared = run.coordinator.preview(firstRequest);
  assert.throws(
    () => run.coordinator.commit(firstPrepared.preview),
    { code: 'transition_record_store_recovery_failed' }
  );
  const afterFirstCas = run.store.snapshot();
  assert.equal(afterFirstCas.store_version, 1);
  assert.equal(
    durableRecords.get(firstRequest.transition_ref).status,
    'reserved'
  );

  const secondRequest = requestFor(afterFirstCas, {
    suffix: 'B',
    target: toRuntime('c'),
    fromRuntime: afterFirstCas.accepted_runtime,
    proofDigest: digestObject('proof-after-finalize-recovery'),
    legacy: null
  });
  const secondPrepared = run.coordinator.preview(secondRequest);
  assert.equal(secondPrepared.status, 'prepared');
  assert.equal(
    durableRecords.get(firstRequest.transition_ref).status,
    'terminal'
  );
  assert.deepEqual(
    durableRecords.get(firstRequest.transition_ref).protocol,
    afterFirstCas.last_transition.protocol
  );
  assert.equal(
    run.coordinator.commit(secondPrepared.preview).status,
    'terminal_success'
  );
});

test('11. a late candidate after terminal cannot overwrite accepted state', () => {
  const result = prepareAndCommit();
  const after = result.store.snapshot();
  assert.throws(
    () => result.coordinator.commit(result.prepared.preview),
    { code: 'transition_preview_context_invalid' }
  );
  assert.deepEqual(result.store.snapshot(), after);
});

test('12. CAS competition has exactly one winner', () => {
  const state = initialState();
  const run = harness({ state });
  const first = run.coordinator.preview(requestFor(state, {
    suffix: 'A', proofDigest: digestObject('proof-A')
  }));
  const second = run.coordinator.preview(requestFor(state, {
    suffix: 'B', proofDigest: digestObject('proof-B')
  }));
  assert.equal(first.status, 'prepared');
  assert.equal(second.status, 'prepared');
  const winner = run.coordinator.commit(first.preview);
  const loser = run.coordinator.commit(second.preview);
  assert.equal(winner.status, 'terminal_success');
  assert.equal(loser.status, 'terminal_failure');
  assert.equal(loser.protocol.terminal.reason_code, 'transition_cas_lost');
  assert.equal(run.store.snapshot().store_version, 1);
});

test('13. partial state write is marked fatal and never reported as success', () => {
  const state = initialState();
  let current = structuredClone(state);
  const faultyStore = {
    snapshot() { return structuredClone(current); },
    compareAndSwap(expectedVersion, candidate) {
      assert.equal(expectedVersion, 0);
      current = {
        ...current,
        store_version: candidate.store_version,
        accepted_runtime: candidate.accepted_runtime
      };
      throw new Error('synthetic-post-write-fault');
    }
  };
  const run = harness({ state, store: faultyStore });
  const prepared = run.coordinator.preview(requestFor(state));
  const outcome = run.coordinator.commit(prepared.preview);
  assert.equal(outcome.status, 'terminal_failure');
  assert.equal(
    outcome.protocol.terminal.reason_code,
    'partial_transition_detected'
  );
  assert.equal(outcome.protocol.terminal.fatal_inconsistency, true);
});

test('13a. a committed CAS with a lost acknowledgement remains success', () => {
  const state = initialState();
  let current = structuredClone(state);
  const lostAckStore = {
    snapshot() { return structuredClone(current); },
    compareAndSwap(expectedVersion, candidate) {
      assert.equal(expectedVersion, 0);
      current = structuredClone(candidate);
      throw new Error('synthetic-acknowledgement-loss');
    }
  };
  const run = harness({ state, store: lostAckStore });
  const request = requestFor(state);
  const prepared = run.coordinator.preview(request);
  const outcome = run.coordinator.commit(prepared.preview);
  assert.equal(outcome.status, 'terminal_success');
  assert.equal(run.store.snapshot().store_version, 1);
  assert.equal(run.recordStore.get(request.transition_ref).status, 'terminal');
  assert.equal(run.observer.snapshot().terminal_successes, 1);
  assert.deepEqual(
    run.coordinator.protocol(request.transition_ref),
    outcome.protocol
  );
});

test('13b. a transient snapshot fault after successful CAS recovers success', () => {
  const state = initialState();
  let current = structuredClone(state);
  let failPostCommitSnapshot = false;
  const readbackFaultStore = {
    snapshot() {
      if (failPostCommitSnapshot) {
        failPostCommitSnapshot = false;
        throw new Error('synthetic-post-commit-readback-fault');
      }
      return structuredClone(current);
    },
    compareAndSwap(expectedVersion, candidate) {
      assert.equal(expectedVersion, current.store_version);
      current = structuredClone(candidate);
      failPostCommitSnapshot = true;
      return true;
    }
  };
  const run = harness({ state, store: readbackFaultStore });
  const request = requestFor(state);
  const prepared = run.coordinator.preview(request);
  const outcome = run.coordinator.commit(prepared.preview);
  assert.equal(outcome.status, 'terminal_success');
  assert.equal(run.store.snapshot().store_version, 1);
  assert.equal(run.recordStore.get(request.transition_ref).status, 'terminal');
  assert.deepEqual(run.coordinator.protocol(request.transition_ref), outcome.protocol);
});

test('13b1. retry recovers committed success after repeated readback faults', () => {
  const state = initialState();
  let current = structuredClone(state);
  let postCommitReadFailures = 0;
  const readbackFaultStore = {
    snapshot() {
      if (postCommitReadFailures > 0) {
        postCommitReadFailures -= 1;
        throw new Error('synthetic-repeated-post-commit-readback-fault');
      }
      return structuredClone(current);
    },
    compareAndSwap(expectedVersion, candidate) {
      assert.equal(expectedVersion, current.store_version);
      current = structuredClone(candidate);
      postCommitReadFailures = 2;
      return true;
    }
  };
  const run = harness({ state, store: readbackFaultStore });
  const request = requestFor(state);
  const prepared = run.coordinator.preview(request);
  assert.throws(
    () => run.coordinator.commit(prepared.preview),
    { code: 'transition_post_commit_state_recovery_failed' }
  );
  const recovered = run.coordinator.commit(prepared.preview);
  assert.equal(recovered.status, 'terminal_success');
  assert.equal(run.store.snapshot().store_version, 1);
  assert.equal(run.recordStore.get(request.transition_ref).status, 'terminal');
  assert.deepEqual(run.coordinator.protocol(request.transition_ref), recovered.protocol);
});

test('13c. finalized protocols remain queryable after local record release', () => {
  const result = prepareAndCommit();
  assert.deepEqual(
    result.coordinator.protocol(result.request.transition_ref),
    result.committed.protocol
  );
  assert.deepEqual(result.coordinator.reportCoordinatorLoss(), {
    active_transitions_lost: 0,
    terminals_fabricated: 0
  });
  assert.deepEqual(
    result.coordinator.protocol(result.request.transition_ref),
    result.committed.protocol
  );
});

test('14. transition success preserves stopped and held lifecycle exactly', () => {
  const result = prepareAndCommit();
  assert.deepEqual(
    result.store.snapshot().lifecycle,
    initialState().lifecycle
  );
  assert.equal(result.committed.protocol.terminal.runtime_stopped, true);
});

test('15. transition has no resolver, provider, search, or memory capability', () => {
  const result = prepareAndCommit();
  const effects = result.store.snapshot().last_transition.side_effects;
  assert.deepEqual(effects, {
    runtime_started: false,
    repository_changed: false,
    resolver_called: false,
    search_called: false,
    provider_called: false,
    memory_called: false
  });
});

test('16. transition contract and coordinator expose no repository checkout mutation', () => {
  const runtime = require('../../src/runtime/governed-runtime-identity-transition');
  for (const forbidden of [
    'checkout', 'pull', 'reset', 'start', 'restart', 'rebindSource'
  ]) {
    assert.equal(Object.hasOwn(runtime, forbidden), false);
  }
});

test('17. Observer independently reconstructs the exact terminal', () => {
  const result = prepareAndCommit();
  const rebuilt = result.observer.reconcile(result.request.transition_ref);
  validateRuntimeIdentityTransitionTerminal(rebuilt.terminal, {
    request: rebuilt.request,
    receipts: rebuilt.receipts
  });
  assert.equal(
    rebuilt.terminal.terminal_digest,
    result.committed.protocol.terminal.terminal_digest
  );
});

test('17a. Observer rejects a self-consistent commit not derived from its request', () => {
  const result = prepareAndCommit();
  const observer = createGovernedRuntimeIdentityTransitionObserver();
  observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_accepted',
    request: result.request
  });
  for (const receipt of result.committed.protocol.receipts) {
    observer.observe({
      component: 'governed_runtime_identity_transition_coordinator',
      event: 'transition_receipt_appended',
      transition_ref: result.request.transition_ref,
      receipt
    });
  }
  const forgedRuntime = {
    ...structuredClone(result.committed.accepted_runtime),
    identity_digest: digestObject('forged-but-shaped-runtime')
  };
  const forgedBinding = stableControllerBinding(result.request, forgedRuntime);
  const forgedTerminal = createRuntimeIdentityTransitionTerminal({
    request: result.request,
    receipts: result.committed.protocol.receipts,
    outcome: 'success',
    newRuntimeIdentityDigest: forgedRuntime.identity_digest,
    controllerBindingDigest: forgedBinding.binding_digest,
    runtimeStopped: true
  });
  const forgedProtocol = createGovernedRuntimeIdentityTransitionProtocol({
    request: result.request,
    receipts: result.committed.protocol.receipts,
    terminal: forgedTerminal
  });
  assert.equal(observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_atomic_commit',
    transition_ref: result.request.transition_ref,
    protocol: forgedProtocol,
    accepted_runtime: forgedRuntime,
    controller_binding: forgedBinding,
    store_version: 1,
    state_digest: result.committed.state_digest,
    state_projection: result.store.snapshot()
  }), false);
  assert.equal(observer.snapshot().atomic_commits_verified, 0);
  assert.equal(observer.snapshot().protocol_violations, 1);
});

test('17b. Observer binds the final terminal to the verified atomic commit', () => {
  const result = prepareAndCommit();
  const observer = createGovernedRuntimeIdentityTransitionObserver();
  observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_accepted',
    request: result.request
  });
  for (const receipt of result.committed.protocol.receipts) {
    observer.observe({
      component: 'governed_runtime_identity_transition_coordinator',
      event: 'transition_receipt_appended',
      transition_ref: result.request.transition_ref,
      receipt
    });
  }
  assert.equal(observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_atomic_commit',
    transition_ref: result.request.transition_ref,
    protocol: result.committed.protocol,
    accepted_runtime: result.committed.accepted_runtime,
    controller_binding: result.committed.controller_binding,
    store_version: 1,
    state_digest: result.committed.state_digest,
    state_projection: result.store.snapshot()
  }), true);
  const conflictingTerminal = createRuntimeIdentityTransitionTerminal({
    request: result.request,
    receipts: result.committed.protocol.receipts,
    outcome: 'failure',
    reasonCode: 'transition_replayed',
    runtimeStopped: true
  });
  assert.equal(observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_terminal_committed',
    transition_ref: result.request.transition_ref,
    terminal: conflictingTerminal
  }), false);
  assert.equal(observer.snapshot().terminal_successes, 0);
  assert.equal(observer.snapshot().terminal_failures, 0);
  assert.equal(observer.snapshot().protocol_violations, 1);
});

test('17c. Observer rejects a non-canonical atomic state digest', () => {
  const result = prepareAndCommit();
  const observer = createGovernedRuntimeIdentityTransitionObserver();
  observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_accepted',
    request: result.request
  });
  for (const receipt of result.committed.protocol.receipts) {
    observer.observe({
      component: 'governed_runtime_identity_transition_coordinator',
      event: 'transition_receipt_appended',
      transition_ref: result.request.transition_ref,
      receipt
    });
  }
  assert.equal(observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_atomic_commit',
    transition_ref: result.request.transition_ref,
    protocol: result.committed.protocol,
    accepted_runtime: result.committed.accepted_runtime,
    controller_binding: result.committed.controller_binding,
    store_version: 1,
    state_digest: 'not-a-digest',
    state_projection: result.store.snapshot()
  }), false);
  assert.equal(observer.snapshot().atomic_commits_verified, 0);
  assert.equal(observer.snapshot().protocol_violations, 1);
});

test('17d. Observer recomputes a shaped atomic state digest', () => {
  const result = prepareAndCommit();
  const observer = createGovernedRuntimeIdentityTransitionObserver();
  observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_accepted',
    request: result.request
  });
  for (const receipt of result.committed.protocol.receipts) {
    observer.observe({
      component: 'governed_runtime_identity_transition_coordinator',
      event: 'transition_receipt_appended',
      transition_ref: result.request.transition_ref,
      receipt
    });
  }
  assert.equal(observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_atomic_commit',
    transition_ref: result.request.transition_ref,
    protocol: result.committed.protocol,
    accepted_runtime: result.committed.accepted_runtime,
    controller_binding: result.committed.controller_binding,
    store_version: 1,
    state_digest: digestObject('different-validly-shaped-state'),
    state_projection: result.store.snapshot()
  }), false);
  assert.equal(observer.snapshot().atomic_commits_verified, 0);
  assert.equal(observer.snapshot().protocol_violations, 1);
});

test('17e. Observer rotates terminal history without exhausting active capacity', () => {
  const state = initialState();
  const observer = createGovernedRuntimeIdentityTransitionObserver({
    maxRetainedTransitions: 2
  });
  let earliestRequest;
  let latestRequest;
  for (let index = 0; index < 5; index += 1) {
    const transitionRef = `grit_${index.toString(36).padStart(32, '0')}`;
    const request = requestFor(state, {
      transitionRef,
      proofDigest: digestObject(`retained-proof-${index}`)
    });
    const terminal = createRuntimeIdentityTransitionTerminal({
      request,
      receipts: [],
      outcome: 'failure',
      reasonCode: 'transition_replayed',
      runtimeStopped: true
    });
    assert.equal(observer.observe({
      component: 'governed_runtime_identity_transition_coordinator',
      event: 'transition_accepted',
      request
    }), true);
    assert.equal(observer.observe({
      component: 'governed_runtime_identity_transition_coordinator',
      event: 'transition_terminal_committed',
      transition_ref: transitionRef,
      terminal
    }), true);
    earliestRequest ||= request;
    latestRequest = request;
  }
  const snapshot = observer.snapshot();
  assert.equal(snapshot.transitions_accepted, 5);
  assert.equal(snapshot.terminal_failures, 5);
  assert.equal(snapshot.active_transitions, 0);
  assert.equal(snapshot.retained_terminals, 2);
  assert.equal(snapshot.terminal_replay_markers, 5);
  assert.equal(observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_accepted',
    request: earliestRequest
  }), false);
  assert.equal(observer.snapshot().transitions_accepted, 5);
  assert.equal(
    observer.reconcile(latestRequest.transition_ref).terminal.reason_code,
    'transition_replayed'
  );
  const rebuilt = createGovernedRuntimeIdentityTransitionObserver({
    initialTerminalReplayMarkers: observer.replayMarkers()
  });
  assert.equal(rebuilt.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_accepted',
    request: earliestRequest
  }), false);
});

test('17f. Observer binds atomic state to the request safe-stop receipt', () => {
  const result = prepareAndCommit();
  const observer = createGovernedRuntimeIdentityTransitionObserver();
  replayObserverPrelude(observer, result);
  const projection = structuredClone(result.store.snapshot());
  projection.lifecycle.safe_stop_receipt_digest =
    digestObject('different-safe-stop-receipt');
  assert.equal(observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_atomic_commit',
    transition_ref: result.request.transition_ref,
    protocol: result.committed.protocol,
    accepted_runtime: result.committed.accepted_runtime,
    controller_binding: result.committed.controller_binding,
    store_version: projection.store_version,
    state_digest: digestObject(projection),
    state_projection: projection
  }), false);
  assert.equal(observer.snapshot().atomic_commits_verified, 0);
  assert.equal(observer.snapshot().protocol_violations, 1);
});

test('17g. Observer verifies one-shot legacy migration consumption', () => {
  const result = prepareAndCommit();
  const observer = createGovernedRuntimeIdentityTransitionObserver();
  replayObserverPrelude(observer, result);
  const projection = structuredClone(result.store.snapshot());
  projection.legacy_migration = {
    consumed: false,
    evidence_digest: null
  };
  assert.equal(observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_atomic_commit',
    transition_ref: result.request.transition_ref,
    protocol: result.committed.protocol,
    accepted_runtime: result.committed.accepted_runtime,
    controller_binding: result.committed.controller_binding,
    store_version: projection.store_version,
    state_digest: digestObject(projection),
    state_projection: projection
  }), false);
  assert.equal(observer.snapshot().atomic_commits_verified, 0);
  assert.equal(observer.snapshot().protocol_violations, 1);
});

test('17h. Observer rejects a fork that reuses an authoritative store version', () => {
  const first = prepareAndCommit();
  const second = prepareAndCommit({
    request: {
      suffix: 'B',
      target: toRuntime('c'),
      proofDigest: digestObject('fork-proof-B')
    }
  });
  const observer = createGovernedRuntimeIdentityTransitionObserver();
  replayObserverPrelude(observer, first);
  assert.equal(observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_atomic_commit',
    transition_ref: first.request.transition_ref,
    protocol: first.committed.protocol,
    accepted_runtime: first.committed.accepted_runtime,
    controller_binding: first.committed.controller_binding,
    store_version: 1,
    state_digest: first.committed.state_digest,
    state_projection: first.store.snapshot()
  }), true);
  assert.equal(observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_terminal_committed',
    transition_ref: first.request.transition_ref,
    terminal: first.committed.protocol.terminal
  }), true);

  replayObserverPrelude(observer, second);
  assert.equal(observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_atomic_commit',
    transition_ref: second.request.transition_ref,
    protocol: second.committed.protocol,
    accepted_runtime: second.committed.accepted_runtime,
    controller_binding: second.committed.controller_binding,
    store_version: 1,
    previous_state_digest: first.committed.state_digest,
    state_digest: second.committed.state_digest,
    state_projection: second.store.snapshot()
  }), false);
  assert.equal(observer.snapshot().atomic_commits_verified, 1);
  assert.equal(observer.snapshot().last_authoritative_store_version, 1);
});

test('17i. Observer rejects a monotonic version whose from identity is stale', () => {
  const first = prepareAndCommit();
  const staleBranch = prepareAndCommit({
    request: {
      suffix: 'C',
      target: toRuntime('d'),
      proofDigest: digestObject('stale-from-proof-C')
    }
  });
  const observer = createGovernedRuntimeIdentityTransitionObserver();
  replayObserverPrelude(observer, first);
  assert.equal(observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_atomic_commit',
    transition_ref: first.request.transition_ref,
    protocol: first.committed.protocol,
    accepted_runtime: first.committed.accepted_runtime,
    controller_binding: first.committed.controller_binding,
    store_version: 1,
    state_digest: first.committed.state_digest,
    state_projection: first.store.snapshot()
  }), true);
  assert.equal(observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_terminal_committed',
    transition_ref: first.request.transition_ref,
    terminal: first.committed.protocol.terminal
  }), true);

  replayObserverPrelude(observer, staleBranch);
  const forgedVersionProjection = {
    ...structuredClone(staleBranch.store.snapshot()),
    store_version: 2
  };
  assert.equal(observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_atomic_commit',
    transition_ref: staleBranch.request.transition_ref,
    protocol: staleBranch.committed.protocol,
    accepted_runtime: staleBranch.committed.accepted_runtime,
    controller_binding: staleBranch.committed.controller_binding,
    store_version: 2,
    previous_state_digest: first.committed.state_digest,
    state_digest: digestObject(forgedVersionProjection),
    state_projection: forgedVersionProjection
  }), false);
  assert.equal(observer.snapshot().atomic_commits_verified, 1);
  assert.equal(observer.snapshot().protocol_violations, 1);
});

test('17j. Observer accepts one exact monotonic atomic state sequence', () => {
  const run = harness();
  const firstRequest = requestFor(run.state);
  const firstPrepared = run.coordinator.preview(firstRequest);
  const first = run.coordinator.commit(firstPrepared.preview);
  assert.equal(first.status, 'terminal_success');

  const afterFirst = run.store.snapshot();
  const secondRequest = requestFor(afterFirst, {
    suffix: 'D',
    target: toRuntime('d'),
    fromRuntime: afterFirst.accepted_runtime,
    proofDigest: digestObject('monotonic-proof-D'),
    legacy: null
  });
  const secondPrepared = run.coordinator.preview(secondRequest);
  assert.equal(secondPrepared.status, 'prepared');
  assert.equal(
    run.coordinator.commit(secondPrepared.preview).status,
    'terminal_success'
  );
  assert.equal(run.observer.snapshot().atomic_commits_verified, 2);
  assert.equal(run.observer.snapshot().last_authoritative_store_version, 2);
  assert.equal(
    run.observer.snapshot().last_accepted_runtime_identity_digest,
    run.store.snapshot().accepted_runtime.identity_digest
  );
});

test('17k. Observer rejects rollback of a consumed legacy migration marker', () => {
  const first = prepareAndCommit();
  const afterFirst = first.store.snapshot();
  const second = prepareAndCommit({
    state: afterFirst,
    request: {
      suffix: 'E',
      target: toRuntime('e'),
      fromRuntime: afterFirst.accepted_runtime,
      proofDigest: digestObject('legacy-continuity-proof-E'),
      legacy: null
    }
  });
  const observer = createGovernedRuntimeIdentityTransitionObserver();
  replayObserverPrelude(observer, first);
  assert.equal(observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_atomic_commit',
    transition_ref: first.request.transition_ref,
    protocol: first.committed.protocol,
    accepted_runtime: first.committed.accepted_runtime,
    controller_binding: first.committed.controller_binding,
    store_version: 1,
    state_digest: first.committed.state_digest,
    state_projection: first.store.snapshot()
  }), true);
  assert.equal(observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_terminal_committed',
    transition_ref: first.request.transition_ref,
    terminal: first.committed.protocol.terminal
  }), true);

  replayObserverPrelude(observer, second);
  const rollbackProjection = structuredClone(second.store.snapshot());
  rollbackProjection.legacy_migration = {
    consumed: false,
    evidence_digest: null
  };
  assert.equal(observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_atomic_commit',
    transition_ref: second.request.transition_ref,
    protocol: second.committed.protocol,
    accepted_runtime: second.committed.accepted_runtime,
    controller_binding: second.committed.controller_binding,
    store_version: 2,
    previous_state_digest: first.committed.state_digest,
    state_digest: digestObject(rollbackProjection),
    state_projection: rollbackProjection
  }), false);
  assert.equal(observer.snapshot().atomic_commits_verified, 1);
  assert.equal(observer.snapshot().protocol_violations, 1);
});

test('17l. rebuilt Observer restores the authoritative commit chain anchor', () => {
  const first = prepareAndCommit();
  const afterFirst = first.store.snapshot();
  const rebuilt = createGovernedRuntimeIdentityTransitionObserver({
    initialAuthoritativeState: afterFirst
  });
  const fork = prepareAndCommit({
    request: {
      suffix: 'F',
      target: toRuntime('f'),
      proofDigest: digestObject('rebuild-fork-proof-F')
    }
  });
  replayObserverPrelude(rebuilt, fork);
  assert.equal(rebuilt.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_atomic_commit',
    transition_ref: fork.request.transition_ref,
    protocol: fork.committed.protocol,
    accepted_runtime: fork.committed.accepted_runtime,
    controller_binding: fork.committed.controller_binding,
    store_version: 1,
    previous_state_digest: first.committed.state_digest,
    state_digest: fork.committed.state_digest,
    state_projection: fork.store.snapshot()
  }), false);
  assert.equal(rebuilt.snapshot().atomic_commits_verified, 0);
  assert.equal(rebuilt.snapshot().last_authoritative_store_version, 1);

  const legitimate = prepareAndCommit({
    state: afterFirst,
    request: {
      suffix: 'G',
      target: toRuntime('d'),
      fromRuntime: afterFirst.accepted_runtime,
      proofDigest: digestObject('rebuild-monotonic-proof-G'),
      legacy: null
    }
  });
  replayObserverPrelude(rebuilt, legitimate);
  assert.equal(rebuilt.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_atomic_commit',
    transition_ref: legitimate.request.transition_ref,
    protocol: legitimate.committed.protocol,
    accepted_runtime: legitimate.committed.accepted_runtime,
    controller_binding: legitimate.committed.controller_binding,
    store_version: 2,
    previous_state_digest: first.committed.state_digest,
    state_digest: legitimate.committed.state_digest,
    state_projection: legitimate.store.snapshot()
  }), true);
  assert.equal(rebuilt.snapshot().atomic_commits_verified, 1);
  assert.equal(rebuilt.snapshot().last_authoritative_store_version, 2);
});

test('17m. Observer rejects stable authority rotation on a later commit', () => {
  const first = prepareAndCommit();
  const afterFirst = first.store.snapshot();
  const otherAuthorityId = `grauth_${'Z'.repeat(24)}`;
  const otherAuthorityLineage = digestObject('observer-other-authority-lineage');
  const branchState = structuredClone(afterFirst);
  branchState.last_transition = null;
  const requestOptions = {
    suffix: 'J',
    target: toRuntime('c'),
    fromRuntime: branchState.accepted_runtime,
    authorityId: otherAuthorityId,
    authorityLineage: otherAuthorityLineage,
    proofDigest: digestObject('observer-other-authority-proof-J'),
    legacy: null
  };
  const bindingRequest = requestFor(branchState, requestOptions);
  branchState.controller_binding = stableControllerBinding(
    bindingRequest,
    branchState.accepted_runtime
  );
  const branch = harness({
    state: branchState,
    authority({ authority, authority_context_digest: context }) {
      return {
        verified: true,
        authority_id: authority.authority_id,
        authority_lineage_digest: authority.authority_lineage_digest,
        authority_context_digest: context,
        authority_proof_digest: authority.authority_proof_digest
      };
    }
  });
  const branchRequest = requestFor(branchState, requestOptions);
  const branchPrepared = branch.coordinator.preview(branchRequest);
  assert.equal(branchPrepared.status, 'prepared');
  const branchCommitted = branch.coordinator.commit(branchPrepared.preview);
  assert.equal(branchCommitted.status, 'terminal_success');

  const observer = createGovernedRuntimeIdentityTransitionObserver({
    initialAuthoritativeState: afterFirst
  });
  const branchResult = {
    request: branchRequest,
    committed: branchCommitted
  };
  replayObserverPrelude(observer, branchResult);
  assert.equal(observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_atomic_commit',
    transition_ref: branchRequest.transition_ref,
    protocol: branchCommitted.protocol,
    accepted_runtime: branchCommitted.accepted_runtime,
    controller_binding: branchCommitted.controller_binding,
    store_version: 2,
    previous_state_digest: first.committed.state_digest,
    state_digest: branchCommitted.state_digest,
    state_projection: branch.store.snapshot()
  }), false);
  assert.equal(observer.snapshot().atomic_commits_verified, 0);
  assert.equal(observer.snapshot().last_authoritative_store_version, 1);
});

test('17n. Observer anchors the first commit to an authoritative version-zero state', () => {
  const result = prepareAndCommit();
  const initialDigest = digestObject(result.state);
  const atomicEvent = {
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_atomic_commit',
    transition_ref: result.request.transition_ref,
    protocol: result.committed.protocol,
    accepted_runtime: result.committed.accepted_runtime,
    controller_binding: result.committed.controller_binding,
    store_version: 1,
    state_digest: result.committed.state_digest,
    state_projection: result.store.snapshot()
  };

  const forged = createGovernedRuntimeIdentityTransitionObserver({
    initialAuthoritativeState: result.state
  });
  assert.equal(forged.snapshot().last_authoritative_store_version, 0);
  replayObserverPrelude(forged, result);
  assert.equal(forged.observe({
    ...atomicEvent,
    previous_state_digest: digestObject('forged-version-zero-state')
  }), false);
  assert.equal(forged.snapshot().atomic_commits_verified, 0);

  const anchored = createGovernedRuntimeIdentityTransitionObserver({
    initialAuthoritativeState: result.state
  });
  replayObserverPrelude(anchored, result);
  assert.equal(anchored.observe({
    ...atomicEvent,
    previous_state_digest: initialDigest
  }), true);
  assert.equal(anchored.snapshot().atomic_commits_verified, 1);
  assert.equal(anchored.snapshot().last_authoritative_store_version, 1);
});

test('18. terminal missing records a violation and fabricates no failure terminal', () => {
  const state = initialState();
  const run = harness({ state });
  const request = requestFor(state);
  assert.equal(run.coordinator.preview(request).status, 'prepared');
  assert.deepEqual(run.coordinator.reportCoordinatorLoss(), {
    active_transitions_lost: 1,
    terminals_fabricated: 0
  });
  const snapshot = run.observer.snapshot();
  assert.equal(snapshot.terminals_missing, 1);
  assert.equal(snapshot.terminals_fabricated, 0);
  assert.equal(snapshot.last_violation_code, 'terminal_missing');
  assert.throws(
    () => run.observer.reconcile(request.transition_ref),
    { code: 'transition_terminal_missing' }
  );
});

test('18a. coordinator loss reports durable reservations after recreation', () => {
  const state = initialState();
  const request = requestFor(state);
  const recordStore = createTransitionRecordStore([{
    transition_ref: request.transition_ref,
    request_digest: runtimeIdentityTransitionRequestDigest(request),
    status: 'reserved',
    protocol: null
  }]);
  const events = [];
  const run = harness({
    state,
    recordStore,
    observer: {
      observe(event) {
        events.push(event);
        return true;
      }
    }
  });
  assert.deepEqual(run.coordinator.reportCoordinatorLoss(), {
    active_transitions_lost: 1,
    terminals_fabricated: 0
  });
  assert.equal(events.length, 1);
  assert.equal(events[0].event, 'transition_terminal_missing');
  assert.equal(events[0].transition_ref, request.transition_ref);
  assert.equal(recordStore.get(request.transition_ref).status, 'reserved');
});

test('19. unknown authority evidence remains unknown in receipt and terminal', () => {
  const state = initialState();
  const run = harness({
    state,
    authority() { throw new Error('synthetic-authority-outage'); }
  });
  const outcome = run.coordinator.preview(requestFor(state));
  const failed = outcome.protocol.receipts.at(-1);
  assert.equal(failed.evidence_status, 'unknown');
  assert.equal(failed.evidence_digest, null);
  assert.equal(outcome.protocol.terminal.evidence_complete, false);
  assert.deepEqual(
    outcome.protocol.terminal.unknown_evidence_stages,
    ['AUTHORITY_VERIFIED']
  );
});

test('20. legacy migration is one-shot and a later request cannot reuse it', () => {
  const first = prepareAndCommit();
  const state = first.store.snapshot();
  const secondTarget = toRuntime('c');
  const secondRequest = requestFor(state, {
    suffix: 'C',
    target: secondTarget,
    fromRuntime: state.accepted_runtime,
    proofDigest: digestObject('proof-C'),
    legacy: {
      ...legacyEvidence(initialState(), secondTarget),
      accepted_runtime_identity_digest: state.accepted_runtime.identity_digest,
      accepted_runtime_lineage_digest: state.accepted_runtime.lineage_digest,
      accepted_runtime_manifest_digest: state.accepted_runtime.manifest_digest
    }
  });
  const outcome = first.coordinator.preview(secondRequest);
  assert.equal(outcome.status, 'terminal_failure');
  assert.equal(outcome.protocol.terminal.reason_code, 'from_identity_changed');
  assert.equal(first.store.snapshot().store_version, 1);
});

test('stable controller authority cannot be replaced by an ordinary transition', () => {
  const first = prepareAndCommit();
  const state = first.store.snapshot();
  const otherAuthorityId = `grauth_${'Z'.repeat(24)}`;
  const otherLineage = digestObject('other-stable-authority-lineage');
  const run = harness({
    state,
    store: first.store,
    proofStore: first.proofStore,
    recordStore: first.recordStore,
    authority({ authority, authority_context_digest: context }) {
      return {
        verified: true,
        authority_id: authority.authority_id,
        authority_lineage_digest: authority.authority_lineage_digest,
        authority_context_digest: context,
        authority_proof_digest: authority.authority_proof_digest
      };
    }
  });
  const outcome = run.coordinator.preview(requestFor(state, {
    suffix: 'Z',
    target: toRuntime('c'),
    fromRuntime: state.accepted_runtime,
    authorityId: otherAuthorityId,
    authorityLineage: otherLineage,
    proofDigest: digestObject('other-authority-proof'),
    legacy: null
  }));
  assert.equal(outcome.status, 'terminal_failure');
  assert.equal(
    outcome.protocol.terminal.reason_code,
    'authority_lineage_mismatch'
  );
  assert.equal(
    run.store.snapshot().controller_binding.authority_id,
    AUTHORITY_ID
  );
});

test('profile and endpoint drift have distinct canonical failures', () => {
  for (const [field, changed, reason] of [
    ['profile_schema', 7, 'profile_schema_mismatch'],
    ['endpoint_identity', 'legacy_rollback', 'endpoint_identity_mismatch']
  ]) {
    const state = initialState();
    const fromRuntime = { ...state.accepted_runtime, [field]: changed };
    const run = harness({ state });
    const outcome = run.coordinator.preview(requestFor(state, {
      suffix: field === 'profile_schema' ? 'P' : 'E',
      proofDigest: digestObject(`proof-${field}`),
      fromRuntime,
      legacy: {
        ...legacyEvidence(state),
        accepted_runtime_identity_digest: fromRuntime.identity_digest
      }
    }));
    assert.equal(outcome.protocol.terminal.reason_code, reason);
  }
});

test('expired transition is canonical terminal failure without store mutation', () => {
  const state = initialState();
  const run = harness({
    state,
    clock: () => new Date(NOW.getTime() + 121_000)
  });
  const outcome = run.coordinator.preview(requestFor(state));
  assert.equal(outcome.protocol.terminal.reason_code, 'transition_expired');
  assert.deepEqual(run.store.snapshot(), state);
  assert.deepEqual(run.recordStore.snapshot(), []);
});

test('expired previews cannot exhaust transition record admission capacity', () => {
  const state = initialState();
  const recordStore = createTransitionRecordStore();
  const run = harness({
    state,
    recordStore,
    clock: () => new Date(NOW.getTime() + 121_000)
  });
  for (let index = 0; index < 4097; index += 1) {
    const outcome = run.coordinator.preview(requestFor(state, {
      transitionRef: `grit_expired_${index.toString(36).padStart(24, '0')}`,
      proofDigest: digestObject(`expired-capacity-proof-${index}`)
    }));
    assert.equal(outcome.protocol.terminal.reason_code, 'transition_expired');
  }
  assert.deepEqual(recordStore.snapshot(), []);
});

test('receipt stage order is exact and bounded through post verification', () => {
  const result = prepareAndCommit();
  assert.deepEqual(
    result.committed.protocol.receipts.map(receipt => receipt.stage),
    GOVERNED_RUNTIME_IDENTITY_TRANSITION_NON_TERMINAL_STAGES
  );
  assert.equal(
    result.committed.protocol.receipts.every((receipt, index, receipts) =>
      index === 0 || receipt.previous_digest === receipts[index - 1].receipt_digest
    ),
    true
  );
});
