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
  createRuntimeIdentityTransitionPreview,
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
const COORDINATOR_OWNER = digestObject('coordinator-owner-default');

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

function acceptanceEvent(request) {
  return {
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_accepted',
    transition_ref: request.transition_ref,
    request
  };
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
  observer = null,
  ownerDigest = COORDINATOR_OWNER
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
    coordinatorOwnerDigest: ownerDigest,
    authorityVerifier: authority,
    candidateManifestVerifier: manifest,
    clock,
    eventSink: selectedObserver.observe,
    eventSinkMode: 'synchronous_ack.v1'
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
  const preparedReceiptIndex = result.committed.protocol.receipts.findIndex(
    receipt => receipt.stage === 'TRANSITION_PREPARED'
  );
  observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_accepted',
    transition_ref: result.request.transition_ref,
    request: result.request
  });
  for (const receipt of result.committed.protocol.receipts.slice(
    0,
    preparedReceiptIndex + 1
  )) {
    observer.observe({
      component: 'governed_runtime_identity_transition_coordinator',
      event: 'transition_receipt_appended',
      transition_ref: result.request.transition_ref,
      receipt
    });
  }
  observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_preview_formed',
    transition_ref: result.request.transition_ref,
    preview: result.prepared.preview
  });
  for (const receipt of result.committed.protocol.receipts.slice(
    preparedReceiptIndex + 1
  )) {
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

test('a stable controller binding requires its canonical last transition', () => {
  const result = prepareAndCommit();
  const state = structuredClone(result.store.snapshot());
  state.last_transition = null;
  assert.throws(
    () => validateGovernedRuntimeIdentityState(state),
    { code: 'transition_store_last_transition_invalid' }
  );
});

test('a persisted success terminal requires its previous-state digest', () => {
  const result = prepareAndCommit();
  const record = structuredClone(result.recordStore.snapshot()[0]);
  assert.equal(record.protocol.terminal.outcome, 'success');
  record.previous_state_digest = null;
  assert.throws(
    () => createTransitionRecordStore([record]),
    { code: 'transition_record_store_invalid' }
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

test('state CAS derives its candidate from the exact current authority state', () => {
  const stateA = initialState();
  const storeA = createGovernedRuntimeIdentityStateStore(stateA);
  const stateB = initialState({ acceptedRuntime: legacyRuntime('d') });
  const branchB = prepareAndCommit({
    state: stateB,
    request: { target: toRuntime('e') }
  });

  assert.throws(
    () => storeA.compareAndSwap(0, branchB.store.snapshot()),
    { code: 'transition_store_cas_candidate_invalid' }
  );
  assert.deepEqual(storeA.snapshot(), stateA);
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
    request_digest: firstDigest,
    owner_digest: COORDINATOR_OWNER,
    acceptance_event: acceptanceEvent(firstRequest)
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
    request_digest: runtimeIdentityTransitionRequestDigest(secondRequest),
    owner_digest: COORDINATOR_OWNER,
    acceptance_event: acceptanceEvent(secondRequest)
  }), true);
  assert.equal(recordStore.reserve({
    transition_ref: firstRequest.transition_ref,
    request_digest: firstDigest,
    owner_digest: COORDINATOR_OWNER,
    acceptance_event: acceptanceEvent(firstRequest)
  }), false);
  assert.equal(recordStore.get(firstRequest.transition_ref).status, 'terminal');
});

test('10c2. default record admission matches Observer active capacity', () => {
  const recordStore = createTransitionRecordStore();
  const state = initialState();
  for (let index = 0; index < 256; index += 1) {
    const request = requestFor(state, {
      transitionRef: `grit_${index.toString(36).padStart(32, 'A')}`,
      proofDigest: digestObject(`capacity-request-${index}`)
    });
    assert.equal(recordStore.reserve({
      transition_ref: request.transition_ref,
      request_digest: runtimeIdentityTransitionRequestDigest(request),
      owner_digest: COORDINATOR_OWNER,
      acceptance_event: acceptanceEvent(request)
    }), true);
  }
  const overflowRequest = requestFor(state, {
    transitionRef: `grit_${'Z'.repeat(32)}`,
    proofDigest: digestObject('capacity-request-overflow')
  });
  assert.throws(
    () => recordStore.reserve({
      transition_ref: overflowRequest.transition_ref,
      request_digest: runtimeIdentityTransitionRequestDigest(overflowRequest),
      owner_digest: COORDINATOR_OWNER,
      acceptance_event: acceptanceEvent(overflowRequest)
    }),
    { code: 'transition_record_store_capacity_exceeded' }
  );
});

test('10d. coordinator recovers a reserved ref index from atomic state protocol', () => {
  const first = prepareAndCommit();
  const state = first.store.snapshot();
  const recordStore = createTransitionRecordStore();
  assert.equal(recordStore.reserve({
    transition_ref: first.request.transition_ref,
    request_digest: runtimeIdentityTransitionRequestDigest(first.request),
    owner_digest: COORDINATOR_OWNER,
    acceptance_event: acceptanceEvent(first.request)
  }), true);
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

test('10d1. concurrent recovery accepts the matching reservation winner', () => {
  const first = prepareAndCommit();
  const state = first.store.snapshot();
  const durableRecords = createTransitionRecordStore();
  let initialRead = true;
  const racingRecords = {
    ...durableRecords,
    get(ref) {
      if (initialRead) {
        initialRead = false;
        return null;
      }
      return durableRecords.get(ref);
    },
    reserve(input) {
      assert.equal(durableRecords.reserve(input), true);
      return false;
    }
  };
  const rebuiltStore = createGovernedRuntimeIdentityStateStore(state);
  const rebuilt = harness({
    state,
    store: rebuiltStore,
    recordStore: racingRecords
  });
  assert.deepEqual(
    durableRecords.get(first.request.transition_ref).protocol,
    first.committed.protocol
  );
  assert.deepEqual(
    rebuilt.coordinator.protocol(first.request.transition_ref),
    first.committed.protocol
  );
});

test('10d1a. recovery rereads a terminal after commit-context race loss', () => {
  const first = prepareAndCommit();
  const state = first.store.snapshot();
  const firstRecord = first.recordStore.get(first.request.transition_ref);
  const canonicalEvents = [
    ...firstRecord.observer_delivered_events,
    ...firstRecord.observer_outbox
  ].map(entry => entry.envelope)
    .filter(envelope => envelope.event !== 'transition_accepted');
  const durableRecords = createTransitionRecordStore();
  let raceContextWrite = true;
  const racingRecords = {
    ...durableRecords,
    setCommitContext(input) {
      if (!raceContextWrite) return durableRecords.setCommitContext(input);
      raceContextWrite = false;
      durableRecords.setCommitContext(input);
      durableRecords.finalize({
        transition_ref: first.request.transition_ref,
        request_digest: runtimeIdentityTransitionRequestDigest(first.request),
        protocol: first.committed.protocol,
        observer_events: canonicalEvents
      });
      throw new Error('synthetic-context-write-race-loss');
    }
  };
  const rebuiltStore = createGovernedRuntimeIdentityStateStore(state);
  const rebuilt = harness({
    state,
    store: rebuiltStore,
    recordStore: racingRecords
  });

  assert.equal(
    durableRecords.get(first.request.transition_ref).status,
    'terminal'
  );
  assert.deepEqual(
    rebuilt.coordinator.protocol(first.request.transition_ref),
    first.committed.protocol
  );
});

test('10d2. terminal recovery finalization is event-idempotent', () => {
  const result = prepareAndCommit();
  const before = result.recordStore.get(result.request.transition_ref);
  const observerEvents = [
    ...before.observer_delivered_events,
    ...before.observer_outbox
  ].map(entry => entry.envelope);
  const pendingBefore = result.recordStore.pendingObserverEvents().length;
  assert.equal(result.recordStore.finalize({
    transition_ref: result.request.transition_ref,
    request_digest: runtimeIdentityTransitionRequestDigest(result.request),
    protocol: result.committed.protocol,
    observer_events: observerEvents
  }), true);
  assert.equal(
    result.recordStore.pendingObserverEvents().length,
    pendingBefore
  );
});

test('10e. a failed terminal-index write is recovered before the next transition', () => {
  const state = initialState();
  const durableRecords = createTransitionRecordStore();
  let failNextSuccessFinalization = true;
  const recordStore = {
    ackObserverEvent: durableRecords.ackObserverEvent,
    discardObserverEvent: durableRecords.discardObserverEvent,
    enqueueObserverEvent: durableRecords.enqueueObserverEvent,
    pendingObserverEvents: durableRecords.pendingObserverEvents,
    restoreObserverDeliveryPrefixes:
      durableRecords.restoreObserverDeliveryPrefixes,
    setCommitContext: durableRecords.setCommitContext,
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
  assert.equal(run.observer.snapshot().terminal_successes, 1);
  assert.equal(run.observer.snapshot().atomic_commits_verified, 1);
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

test('13a1. lost CAS acknowledgement tolerates a legal successor', () => {
  const state = initialState();
  const recordStore = createTransitionRecordStore();
  const observer = { observe() { return true; } };
  let current = structuredClone(state);
  let commitSuccessorBeforeReadback = false;
  const store = {
    snapshot() {
      if (commitSuccessorBeforeReadback) {
        commitSuccessorBeforeReadback = false;
        const successorState = structuredClone(current);
        const successor = harness({
          state: successorState,
          store,
          recordStore,
          observer
        });
        const successorRequest = requestFor(successorState, {
          suffix: 'V',
          target: toRuntime('c'),
          proofDigest: digestObject('lost-ack-successor-proof'),
          legacy: null
        });
        const successorPreview = successor.coordinator.preview(successorRequest);
        assert.equal(successorPreview.status, 'prepared');
        assert.equal(
          successor.coordinator.commit(successorPreview.preview).status,
          'terminal_success'
        );
      }
      return structuredClone(current);
    },
    compareAndSwap(expectedVersion, candidate) {
      if (expectedVersion !== current.store_version) return false;
      current = structuredClone(candidate);
      if (expectedVersion === 0) {
        commitSuccessorBeforeReadback = true;
        throw new Error('synthetic-acknowledgement-loss-before-successor');
      }
      return true;
    }
  };
  const first = harness({ state, store, recordStore, observer });
  const request = requestFor(state);
  const prepared = first.coordinator.preview(request);
  const committed = first.coordinator.commit(prepared.preview);
  assert.equal(committed.status, 'terminal_success');
  assert.equal(committed.accepted_runtime.source_head, toRuntime('b').source_head);
  assert.equal(current.store_version, 2);
  assert.equal(current.accepted_runtime.source_head, toRuntime('c').source_head);
});

test('13a2. authoritative target closes an unfinalized successor chain', () => {
  const state = initialState();
  const durableRecords = createTransitionRecordStore();
  let failSuccessFinalizationRef = null;
  const recordStore = {
    ...durableRecords,
    finalize(input) {
      if (input.transition_ref === failSuccessFinalizationRef &&
          input.protocol.terminal.outcome === 'success') {
        throw new Error('synthetic-successor-finalization-failure');
      }
      return durableRecords.finalize(input);
    }
  };
  const observer = { observe() { return true; } };
  let current = structuredClone(state);
  let commitUnfinalizedSuccessorBeforeReadback = false;
  let successorRef = null;
  const store = {
    snapshot() {
      if (commitUnfinalizedSuccessorBeforeReadback) {
        commitUnfinalizedSuccessorBeforeReadback = false;
        const successorState = structuredClone(current);
        const successor = harness({
          state: successorState,
          store,
          recordStore,
          observer
        });
        const successorRequest = requestFor(successorState, {
          suffix: 'W',
          target: toRuntime('c'),
          proofDigest: digestObject('unfinalized-successor-proof'),
          legacy: null
        });
        successorRef = successorRequest.transition_ref;
        const successorPreview = successor.coordinator.preview(
          successorRequest
        );
        assert.equal(successorPreview.status, 'prepared');
        failSuccessFinalizationRef = successorRef;
        assert.throws(
          () => successor.coordinator.commit(successorPreview.preview),
          { code: 'transition_record_store_recovery_failed' }
        );
        failSuccessFinalizationRef = null;
      }
      return structuredClone(current);
    },
    compareAndSwap(expectedVersion, candidate) {
      if (expectedVersion !== current.store_version) return false;
      current = structuredClone(candidate);
      if (expectedVersion === 0) {
        commitUnfinalizedSuccessorBeforeReadback = true;
        throw new Error('synthetic-ack-loss-before-unfinalized-successor');
      }
      return true;
    }
  };
  const first = harness({ state, store, recordStore, observer });
  const request = requestFor(state);
  const prepared = first.coordinator.preview(request);
  const committed = first.coordinator.commit(prepared.preview);

  assert.equal(committed.status, 'terminal_success');
  assert.equal(current.store_version, 2);
  assert.equal(current.accepted_runtime.source_head, toRuntime('c').source_head);
  assert.equal(durableRecords.get(successorRef).status, 'reserved');
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
  assert.equal(run.observer.snapshot().active_transitions, 0);
  assert.equal(run.observer.snapshot().atomic_commits_verified, 1);
  assert.equal(run.observer.snapshot().terminal_successes, 1);
});

test('13b1a. loss audit recovers success before reporting missing', () => {
  const state = initialState();
  let current = structuredClone(state);
  let postCommitReadFailures = 0;
  const store = {
    snapshot() {
      if (postCommitReadFailures > 0) {
        postCommitReadFailures -= 1;
        throw new Error('synthetic-loss-audit-readback-fault');
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
  const run = harness({ state, store });
  const request = requestFor(state);
  const prepared = run.coordinator.preview(request);
  assert.throws(
    () => run.coordinator.commit(prepared.preview),
    { code: 'transition_post_commit_state_recovery_failed' }
  );

  assert.deepEqual(run.coordinator.reportCoordinatorLoss(), {
    active_transitions_lost: 0,
    terminals_fabricated: 0
  });
  assert.equal(run.recordStore.get(request.transition_ref).status, 'terminal');
  assert.equal(run.observer.snapshot().terminals_missing, 0);
  assert.equal(run.observer.snapshot().terminal_successes, 1);
});

test('13b1b. retry recovers its success after a later legal commit', () => {
  const state = initialState();
  const recordStore = createTransitionRecordStore();
  let current = structuredClone(state);
  let postCommitReadFailures = 0;
  const store = {
    snapshot() {
      if (postCommitReadFailures > 0) {
        postCommitReadFailures -= 1;
        throw new Error('synthetic-repeated-post-commit-readback-fault');
      }
      return structuredClone(current);
    },
    compareAndSwap(expectedVersion, candidate) {
      if (expectedVersion !== current.store_version) return false;
      current = structuredClone(candidate);
      if (expectedVersion === 0) postCommitReadFailures = 2;
      return true;
    }
  };
  const first = harness({ state, store, recordStore });
  const request = requestFor(state);
  const prepared = first.coordinator.preview(request);
  assert.throws(
    () => first.coordinator.commit(prepared.preview),
    { code: 'transition_post_commit_state_recovery_failed' }
  );

  const successorState = structuredClone(current);
  const successor = harness({
    state: successorState,
    store,
    recordStore,
    observer: first.observer
  });
  const successorRequest = requestFor(successorState, {
    suffix: 'U',
    target: toRuntime('c'),
    proofDigest: digestObject('post-recovery-successor-proof'),
    legacy: null
  });
  const successorPreview = successor.coordinator.preview(successorRequest);
  assert.equal(
    successor.coordinator.commit(successorPreview.preview).status,
    'terminal_success'
  );
  const recovered = first.coordinator.commit(prepared.preview);
  assert.equal(recovered.status, 'terminal_success');
  assert.equal(recovered.accepted_runtime.source_head, toRuntime('b').source_head);
  assert.equal(current.store_version, 2);
  assert.equal(current.accepted_runtime.source_head, toRuntime('c').source_head);
});

test('13b2. reconstruction replays post-CAS events from a reserved record', () => {
  const state = initialState();
  const durableRecords = createTransitionRecordStore();
  let failSuccessFinalization = true;
  const failingRecords = {
    ...durableRecords,
    finalize(input) {
      if (failSuccessFinalization &&
          input.protocol.terminal.outcome === 'success') {
        failSuccessFinalization = false;
        throw new Error('synthetic-post-cas-process-exit');
      }
      return durableRecords.finalize(input);
    }
  };
  const observer = createGovernedRuntimeIdentityTransitionObserver({
    initialAuthoritativeState: state
  });
  const first = harness({ state, recordStore: failingRecords, observer });
  const request = requestFor(state);
  const prepared = first.coordinator.preview(request);
  assert.throws(
    () => first.coordinator.commit(prepared.preview),
    { code: 'transition_record_store_recovery_failed' }
  );
  assert.equal(observer.snapshot().active_transitions, 1);
  const committedState = first.store.snapshot();
  assert.equal(committedState.store_version, 1);

  const rebuiltRecords = createTransitionRecordStore(durableRecords.snapshot());
  harness({
    state: committedState,
    store: createGovernedRuntimeIdentityStateStore(committedState),
    recordStore: rebuiltRecords,
    observer
  });
  assert.equal(rebuiltRecords.pendingObserverEvents().length, 0);
  assert.equal(observer.snapshot().active_transitions, 0);
  assert.equal(observer.snapshot().atomic_commits_verified, 1);
  assert.equal(observer.snapshot().terminal_successes, 1);
});

test('13b3. a durable success survives an arbitrary legal successor chain', () => {
  const state = initialState();
  const recordStore = createTransitionRecordStore();
  const observer = { observe() { return true; } };
  let current = structuredClone(state);
  let advanceBeforeReadback = false;
  const interleavedStore = {
    snapshot() {
      if (advanceBeforeReadback) {
        advanceBeforeReadback = false;
        const successorState = structuredClone(current);
        const successor = harness({
          state: successorState,
          store: interleavedStore,
          recordStore,
          observer
        });
        const successorRequest = requestFor(successorState, {
          suffix: 'S',
          target: toRuntime('c'),
          proofDigest: digestObject('interleaved-successor-proof'),
          legacy: null
        });
        const successorPreview = successor.coordinator.preview(successorRequest);
        assert.equal(successorPreview.status, 'prepared');
        assert.equal(
          successor.coordinator.commit(successorPreview.preview).status,
          'terminal_success'
        );
        const secondSuccessorState = structuredClone(current);
        const secondSuccessor = harness({
          state: secondSuccessorState,
          store: interleavedStore,
          recordStore,
          observer
        });
        const secondSuccessorRequest = requestFor(secondSuccessorState, {
          suffix: 'T',
          target: toRuntime('d'),
          proofDigest: digestObject('interleaved-second-successor-proof'),
          legacy: null
        });
        const secondSuccessorPreview = secondSuccessor.coordinator.preview(
          secondSuccessorRequest
        );
        assert.equal(secondSuccessorPreview.status, 'prepared');
        assert.equal(
          secondSuccessor.coordinator.commit(
            secondSuccessorPreview.preview
          ).status,
          'terminal_success'
        );
      }
      return structuredClone(current);
    },
    compareAndSwap(expectedVersion, candidate) {
      if (current.store_version !== expectedVersion) return false;
      current = structuredClone(candidate);
      if (expectedVersion === 0) advanceBeforeReadback = true;
      return true;
    }
  };
  const first = harness({
    state,
    store: interleavedStore,
    recordStore,
    observer
  });
  const request = requestFor(state);
  const prepared = first.coordinator.preview(request);
  const committed = first.coordinator.commit(prepared.preview);

  assert.equal(committed.status, 'terminal_success');
  assert.equal(committed.accepted_runtime.source_head, toRuntime('b').source_head);
  assert.equal(current.store_version, 3);
  assert.equal(current.accepted_runtime.source_head, toRuntime('d').source_head);
  assert.equal(recordStore.get(request.transition_ref).status, 'terminal');
  assert.equal(
    recordStore.get(request.transition_ref).protocol.terminal.outcome,
    'success'
  );
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

test('13d. failed Observer delivery is replayed before local terminal release', () => {
  const state = initialState();
  const observer = createGovernedRuntimeIdentityTransitionObserver({
    initialAuthoritativeState: state
  });
  let failTerminalOnce = true;
  const transportObserver = {
    observe(event) {
      if (failTerminalOnce && event.event === 'transition_terminal_committed') {
        failTerminalOnce = false;
        return false;
      }
      return observer.observe(event);
    }
  };
  const run = harness({ state, observer: transportObserver });
  const request = requestFor(state);
  const prepared = run.coordinator.preview(request);
  const committed = run.coordinator.commit(prepared.preview);
  assert.equal(committed.status, 'terminal_success');
  assert.equal(observer.snapshot().active_transitions, 1);
  assert.deepEqual(run.coordinator.protocol(request.transition_ref), committed.protocol);
  assert.equal(observer.snapshot().active_transitions, 0);
  assert.equal(observer.snapshot().terminal_successes, 1);
  assert.equal(observer.snapshot().protocol_violations, 0);
});

test('13d1. persisted Observer outbox survives coordinator reconstruction', () => {
  const state = initialState();
  const recordStore = createTransitionRecordStore();
  const observer = createGovernedRuntimeIdentityTransitionObserver({
    initialAuthoritativeState: state
  });
  const first = harness({
    state,
    recordStore,
    observer: {
      observe(event) {
        if (event.event === 'transition_terminal_committed') return false;
        return observer.observe(event);
      }
    }
  });
  const request = requestFor(state);
  const prepared = first.coordinator.preview(request);
  const committed = first.coordinator.commit(prepared.preview);
  assert.equal(committed.status, 'terminal_success');
  assert.equal(recordStore.pendingObserverEvents().length > 0, true);
  assert.equal(observer.snapshot().active_transitions, 1);

  const rebuiltRecords = createTransitionRecordStore(recordStore.snapshot());
  const rebuilt = harness({
    state: first.store.snapshot(),
    recordStore: rebuiltRecords,
    observer
  });
  assert.equal(rebuiltRecords.pendingObserverEvents().length, 0);
  assert.equal(observer.snapshot().active_transitions, 0);
  assert.equal(observer.snapshot().atomic_commits_verified, 1);
  assert.equal(observer.snapshot().terminal_successes, 1);
  assert.deepEqual(
    rebuilt.coordinator.protocol(request.transition_ref),
    committed.protocol
  );
});

test('13d2. rejected admission cannot head-block an existing terminal', () => {
  const state = initialState();
  const observer = createGovernedRuntimeIdentityTransitionObserver({
    maxRetainedTransitions: 1,
    initialAuthoritativeState: state
  });
  const run = harness({ state, observer });
  const firstRequest = requestFor(state, {
    suffix: 'A', proofDigest: digestObject('capacity-first-proof')
  });
  const firstPrepared = run.coordinator.preview(firstRequest);
  assert.equal(firstPrepared.status, 'prepared');

  const rejected = run.coordinator.preview(requestFor(state, {
    suffix: 'B', proofDigest: digestObject('capacity-rejected-proof')
  }));
  assert.equal(rejected.status, 'terminal_failure');
  assert.equal(
    rejected.protocol.terminal.reason_code,
    'transition_record_store_unavailable'
  );
  assert.equal(run.recordStore.pendingObserverEvents().length, 0);

  const committed = run.coordinator.commit(firstPrepared.preview);
  assert.equal(committed.status, 'terminal_success');
  assert.equal(observer.snapshot().active_transitions, 0);
  assert.equal(observer.snapshot().terminal_successes, 1);
});

test('13d3. asynchronous Observer sinks are never acknowledged synchronously', async () => {
  const state = initialState();
  const run = harness({
    state,
    observer: { observe() { return Promise.resolve(true); } }
  });
  assert.throws(
    () => run.coordinator.preview(requestFor(state)),
    { code: 'transition_observer_async_ack_invalid' }
  );
  assert.equal(run.recordStore.pendingObserverEvents().length, 1);
  await Promise.resolve();

  const observer = createGovernedRuntimeIdentityTransitionObserver({
    initialAuthoritativeState: state
  });
  const rebuiltRecords = createTransitionRecordStore(
    run.recordStore.snapshot()
  );
  const rebuilt = harness({ state, recordStore: rebuiltRecords, observer });
  assert.deepEqual(rebuilt.coordinator.reportCoordinatorLoss(), {
    active_transitions_lost: 1,
    terminals_fabricated: 0
  });
  assert.equal(rebuiltRecords.pendingObserverEvents().length, 0);
  assert.equal(observer.snapshot().active_transitions, 0);
});

test('13d3a. Observer redelivery is idempotent after durable ack failure', () => {
  const state = initialState();
  const recordStore = createTransitionRecordStore();
  const observer = createGovernedRuntimeIdentityTransitionObserver({
    initialAuthoritativeState: state
  });
  let failAckOnce = true;
  const unreliableRecords = {
    ...recordStore,
    ackObserverEvent(input) {
      if (failAckOnce) {
        failAckOnce = false;
        throw new Error('synthetic-durable-ack-failure');
      }
      return recordStore.ackObserverEvent(input);
    }
  };
  const first = harness({
    state,
    recordStore: unreliableRecords,
    observer
  });
  const request = requestFor(state);
  assert.throws(
    () => first.coordinator.preview(request),
    /synthetic-durable-ack-failure/u
  );
  assert.equal(observer.snapshot().transitions_accepted, 1);
  assert.equal(recordStore.pendingObserverEvents().length, 1);

  const rebuilt = harness({ state, recordStore, observer });
  assert.equal(recordStore.pendingObserverEvents().length, 0);
  assert.equal(observer.snapshot().transitions_accepted, 1);
  assert.equal(observer.snapshot().protocol_violations, 0);
  assert.deepEqual(rebuilt.coordinator.reportCoordinatorLoss(), {
    active_transitions_lost: 1,
    terminals_fabricated: 0
  });
  assert.equal(recordStore.get(request.transition_ref).status, 'lost');
});

test('13d3a1. rebuilt Observer acknowledges an exact failed-terminal replay', () => {
  const state = initialState({
    lifecycle: {
      lifecycle_state: 'running',
      held_stopped: false,
      safe_stop_receipt_digest: SAFE_STOP_DIGEST,
      running_component_count: 1
    }
  });
  const recordStore = createTransitionRecordStore();
  const observer = createGovernedRuntimeIdentityTransitionObserver({
    initialAuthoritativeState: state
  });
  let failTerminalAck = true;
  const unreliableRecords = {
    ...recordStore,
    ackObserverEvent(input) {
      const pending = recordStore.pendingObserverEvents()[0];
      if (failTerminalAck &&
          pending?.envelope.event === 'transition_terminal_committed') {
        failTerminalAck = false;
        throw new Error('synthetic-failed-terminal-ack-failure');
      }
      return recordStore.ackObserverEvent(input);
    }
  };
  const first = harness({
    state,
    recordStore: unreliableRecords,
    observer
  });
  assert.throws(
    () => first.coordinator.preview(requestFor(state)),
    /synthetic-failed-terminal-ack-failure/u
  );
  assert.equal(recordStore.pendingObserverEvents().length, 1);
  assert.equal(observer.snapshot().terminal_failures, 1);

  const rebuiltRecords = createTransitionRecordStore(recordStore.snapshot());
  const rebuiltObserver = createGovernedRuntimeIdentityTransitionObserver({
    initialAuthoritativeState: state,
    initialTerminalReplayMarkers: observer.replayMarkers()
  });
  harness({
    state,
    recordStore: rebuiltRecords,
    observer: rebuiltObserver
  });
  assert.equal(rebuiltRecords.pendingObserverEvents().length, 0);
  assert.equal(rebuiltObserver.snapshot().protocol_violations, 0);
});

test('13d3b. delivered-event ledgers require canonical full envelopes', () => {
  const state = initialState();
  const request = requestFor(state);
  const envelope = {
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_accepted',
    transition_ref: request.transition_ref,
    request
  };
  const base = {
    transition_ref: request.transition_ref,
    request_digest: runtimeIdentityTransitionRequestDigest(request),
    owner_digest: COORDINATOR_OWNER,
    status: 'reserved',
    protocol: null,
    observer_outbox: [],
    previous_state_digest: null
  };
  assert.throws(
    () => createTransitionRecordStore([{
      ...base,
      observer_delivered_digests: [digestObject(envelope)]
    }]),
    { code: 'transition_record_store_invalid' }
  );
  assert.throws(
    () => createTransitionRecordStore([{
      ...base,
      observer_delivered_events: [{
        sequence: 0,
        event_digest: digestObject(envelope),
        envelope: { ...envelope, event: 'transition_preview_formed' }
      }]
    }]),
    { code: 'transition_record_store_invalid' }
  );
  const unknownEnvelope = {
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_unknown_future_event',
    transition_ref: request.transition_ref
  };
  assert.throws(
    () => createTransitionRecordStore([{
      ...base,
      observer_delivered_events: [],
      observer_outbox: [{
        sequence: 0,
        event_digest: digestObject(unknownEnvelope),
        envelope: unknownEnvelope
      }]
    }]),
    { code: 'transition_record_store_invalid' }
  );
  const secondRequest = requestFor(state, {
    suffix: 'B',
    proofDigest: digestObject('global-observer-sequence-proof-B')
  });
  const secondEnvelope = {
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_accepted',
    transition_ref: secondRequest.transition_ref,
    request: secondRequest
  };
  assert.throws(
    () => createTransitionRecordStore([{
      ...base,
      observer_delivered_events: [{
        sequence: 0,
        event_digest: digestObject(envelope),
        envelope
      }]
    }, {
      ...base,
      transition_ref: secondRequest.transition_ref,
      request_digest: runtimeIdentityTransitionRequestDigest(secondRequest),
      observer_delivered_events: [{
        sequence: 0,
        event_digest: digestObject(secondEnvelope),
        envelope: secondEnvelope
      }]
    }]),
    { code: 'transition_record_store_invalid' }
  );
});

test('13d3b1. archived protocols cannot be spliced from Observer event streams', () => {
  const result = prepareAndCommit();
  const record = structuredClone(
    result.recordStore.get(result.request.transition_ref)
  );
  const failureTerminal = createRuntimeIdentityTransitionTerminal({
    request: result.request,
    receipts: [],
    outcome: 'failure',
    reasonCode: 'transition_replayed',
    runtimeStopped: true
  });
  record.protocol = createGovernedRuntimeIdentityTransitionProtocol({
    request: result.request,
    receipts: [],
    terminal: failureTerminal
  });

  assert.throws(
    () => createTransitionRecordStore([record]),
    { code: 'transition_record_store_invalid' }
  );
});

test('13d3b2. archived commit anchors match the atomic Observer event', () => {
  const result = prepareAndCommit();
  const record = structuredClone(
    result.recordStore.get(result.request.transition_ref)
  );
  record.previous_state_digest = digestObject('spliced-previous-state');

  assert.throws(
    () => createTransitionRecordStore([record]),
    { code: 'transition_record_store_invalid' }
  );
});

test('13d3b3. successful archives require a complete Observer event chain', () => {
  const result = prepareAndCommit();
  const record = structuredClone(
    result.recordStore.get(result.request.transition_ref)
  );
  record.observer_delivered_events = [];
  record.observer_outbox = [];

  assert.throws(
    () => createTransitionRecordStore([record]),
    { code: 'transition_record_store_invalid' }
  );
});

test('13d3c. a fresh Observer receives the delivered prefix before pending events', () => {
  const state = initialState();
  const recordStore = createTransitionRecordStore();
  const firstObserver = createGovernedRuntimeIdentityTransitionObserver({
    initialAuthoritativeState: state
  });
  let acknowledgements = 0;
  const unreliableRecords = {
    ...recordStore,
    ackObserverEvent(input) {
      acknowledgements += 1;
      if (acknowledgements === 2) {
        throw new Error('synthetic-second-durable-ack-failure');
      }
      return recordStore.ackObserverEvent(input);
    }
  };
  const first = harness({
    state,
    recordStore: unreliableRecords,
    observer: firstObserver
  });
  assert.throws(
    () => first.coordinator.preview(requestFor(state)),
    /synthetic-second-durable-ack-failure/u
  );
  const persisted = recordStore.snapshot()[0];
  assert.equal(persisted.observer_delivered_events.length, 1);
  assert.equal(persisted.observer_outbox.length, 1);

  const freshObserver = createGovernedRuntimeIdentityTransitionObserver({
    initialAuthoritativeState: state
  });
  const rebuilt = harness({ state, recordStore, observer: freshObserver });
  assert.equal(recordStore.pendingObserverEvents().length, 0);
  assert.equal(freshObserver.snapshot().transitions_accepted, 1);
  assert.equal(freshObserver.snapshot().receipts_accepted, 1);
  assert.equal(freshObserver.snapshot().protocol_violations, 0);
  assert.deepEqual(rebuilt.coordinator.reportCoordinatorLoss(), {
    active_transitions_lost: 1,
    terminals_fabricated: 0
  });
  assert.equal(recordStore.get(requestFor(state).transition_ref).status, 'lost');
});

test('13d3c1. active delivery prefixes recover even with an empty outbox', () => {
  const state = initialState();
  const recordStore = createTransitionRecordStore();
  const first = harness({ state, recordStore });
  const request = requestFor(state);
  assert.equal(first.coordinator.preview(request).status, 'prepared');
  const persisted = recordStore.snapshot()[0];
  assert.equal(persisted.status, 'reserved');
  assert.equal(persisted.observer_outbox.length, 0);
  assert.equal(persisted.observer_delivered_events.length > 0, true);

  const freshObserver = createGovernedRuntimeIdentityTransitionObserver({
    initialAuthoritativeState: state
  });
  const rebuilt = harness({ state, recordStore, observer: freshObserver });
  assert.equal(recordStore.pendingObserverEvents().length, 0);
  assert.equal(freshObserver.snapshot().active_transitions, 1);
  assert.equal(freshObserver.snapshot().protocol_violations, 0);
  assert.deepEqual(rebuilt.coordinator.reportCoordinatorLoss(), {
    active_transitions_lost: 1,
    terminals_fabricated: 0
  });
  assert.equal(recordStore.get(request.transition_ref).status, 'lost');
  assert.equal(freshObserver.snapshot().terminals_missing, 1);
});

test('13d3d. a coordinator without a sink persists the complete event stream', () => {
  const state = initialState();
  const store = createGovernedRuntimeIdentityStateStore(state);
  const recordStore = createTransitionRecordStore();
  const coordinator = createGovernedRuntimeIdentityTransitionCoordinator({
    store,
    authorityProofReplayStore: createAuthorityProofReplayStore(),
    transitionRecordStore: recordStore,
    coordinatorOwnerDigest: COORDINATOR_OWNER,
    authorityVerifier,
    candidateManifestVerifier: manifestVerifier,
    clock: () => NOW
  });
  const request = requestFor(state);
  const prepared = coordinator.preview(request);
  assert.equal(prepared.status, 'prepared');
  assert.equal(coordinator.commit(prepared.preview).status, 'terminal_success');
  const pending = recordStore.pendingObserverEvents();
  assert.equal(pending.length > 0, true);
  assert.equal(pending[0].envelope.event, 'transition_accepted');

  const observer = createGovernedRuntimeIdentityTransitionObserver({
    initialAuthoritativeState: state
  });
  harness({ state, store, recordStore, observer });
  assert.equal(recordStore.pendingObserverEvents().length, 0);
  assert.equal(observer.snapshot().transitions_accepted, 1);
  assert.equal(observer.snapshot().atomic_commits_verified, 1);
  assert.equal(observer.snapshot().terminal_successes, 1);
  assert.equal(observer.snapshot().protocol_violations, 0);
});

test('13d3e. current authoritative state acknowledges its pending commit events', () => {
  const state = initialState();
  const store = createGovernedRuntimeIdentityStateStore(state);
  const recordStore = createTransitionRecordStore();
  const coordinator = createGovernedRuntimeIdentityTransitionCoordinator({
    store,
    authorityProofReplayStore: createAuthorityProofReplayStore(),
    transitionRecordStore: recordStore,
    coordinatorOwnerDigest: COORDINATOR_OWNER,
    authorityVerifier,
    candidateManifestVerifier: manifestVerifier,
    clock: () => NOW
  });
  const request = requestFor(state);
  const prepared = coordinator.preview(request);
  assert.equal(coordinator.commit(prepared.preview).status, 'terminal_success');
  assert.equal(recordStore.pendingObserverEvents().length > 0, true);
  const current = store.snapshot();
  const observer = createGovernedRuntimeIdentityTransitionObserver({
    initialAuthoritativeState: current
  });
  harness({ state: current, store, recordStore, observer });
  assert.equal(recordStore.pendingObserverEvents().length, 0);
  assert.equal(observer.snapshot().last_authoritative_store_version, 1);
  assert.equal(observer.snapshot().protocol_violations, 0);
});

test('13d3f. current state anchors an offline historical commit backlog', () => {
  const state = initialState();
  const store = createGovernedRuntimeIdentityStateStore(state);
  const recordStore = createTransitionRecordStore();
  const coordinator = createGovernedRuntimeIdentityTransitionCoordinator({
    store,
    authorityProofReplayStore: createAuthorityProofReplayStore(),
    transitionRecordStore: recordStore,
    coordinatorOwnerDigest: COORDINATOR_OWNER,
    authorityVerifier,
    candidateManifestVerifier: manifestVerifier,
    clock: () => NOW
  });
  let current = state;
  for (const [index, suffix] of ['L', 'M', 'N', 'O'].entries()) {
    const target = toRuntime(['b', 'c', 'd', 'e'][index]);
    const request = requestFor(current, {
      suffix,
      target,
      fromRuntime: current.accepted_runtime,
      proofDigest: digestObject(`offline-backlog-proof-${suffix}`),
      legacy: index === 0
        ? legacyEvidence(current, target)
        : null
    });
    const prepared = coordinator.preview(request);
    assert.equal(prepared.status, 'prepared');
    assert.equal(coordinator.commit(prepared.preview).status, 'terminal_success');
    current = store.snapshot();
  }
  assert.equal(current.store_version, 4);
  assert.equal(recordStore.pendingObserverEvents().length > 0, true);

  const provisionalObserver = createGovernedRuntimeIdentityTransitionObserver({
    initialAuthoritativeState: current,
    maxRetainedTransitions: 2
  });
  const firstHistoricalRecord = recordStore.snapshot()
    .find(record => record.protocol?.request.from_runtime.identity_digest ===
      state.accepted_runtime.identity_digest);
  for (const entry of firstHistoricalRecord.observer_outbox) {
    assert.equal(provisionalObserver.observe(entry.envelope), true);
  }
  assert.equal(provisionalObserver.snapshot().atomic_commits_verified, 0);
  assert.equal(provisionalObserver.snapshot().terminal_successes, 0);
  assert.equal(provisionalObserver.snapshot().active_transitions, 0);
  assert.equal(
    provisionalObserver.snapshot().provisional_historical_transitions,
    1
  );
  assert.throws(
    () => provisionalObserver.reconcile(
      firstHistoricalRecord.transition_ref
    ),
    { code: 'transition_terminal_missing' }
  );

  const observer = createGovernedRuntimeIdentityTransitionObserver({
    initialAuthoritativeState: current,
    maxRetainedTransitions: 2
  });
  harness({ state: current, store, recordStore, observer });
  const snapshot = observer.snapshot();
  assert.equal(recordStore.pendingObserverEvents().length, 0);
  assert.equal(snapshot.atomic_commits_verified, 3);
  assert.equal(snapshot.terminal_successes, 3);
  assert.equal(snapshot.last_authoritative_store_version, 4);
  assert.equal(snapshot.provisional_historical_transitions, 0);
  assert.equal(snapshot.protocol_violations, 0);
});

test('13d3f1. an unclosed historical prefix retains only bounded records', () => {
  const state = initialState();
  const store = createGovernedRuntimeIdentityStateStore(state);
  const recordStore = createTransitionRecordStore();
  const coordinator = createGovernedRuntimeIdentityTransitionCoordinator({
    store,
    authorityProofReplayStore: createAuthorityProofReplayStore(),
    transitionRecordStore: recordStore,
    coordinatorOwnerDigest: COORDINATOR_OWNER,
    authorityVerifier,
    candidateManifestVerifier: manifestVerifier,
    clock: () => NOW
  });
  let current = state;
  for (const [index, suffix] of ['P', 'Q', 'R', 'S', 'T'].entries()) {
    const target = toRuntime(['b', 'c', 'd', 'e', 'f'][index]);
    const request = requestFor(current, {
      suffix,
      target,
      fromRuntime: current.accepted_runtime,
      proofDigest: digestObject(`bounded-history-proof-${suffix}`),
      legacy: index === 0
        ? legacyEvidence(current, target)
        : null
    });
    const prepared = coordinator.preview(request);
    assert.equal(prepared.status, 'prepared');
    assert.equal(coordinator.commit(prepared.preview).status, 'terminal_success');
    current = store.snapshot();
  }

  const observer = createGovernedRuntimeIdentityTransitionObserver({
    initialAuthoritativeState: current,
    maxRetainedTransitions: 2
  });
  const historicalRecords = recordStore.snapshot().filter(record =>
    record.protocol?.request.transition_ref !==
      current.last_transition.protocol.request.transition_ref
  );
  for (const record of historicalRecords.slice(0, 3)) {
    for (const entry of record.observer_outbox) {
      assert.equal(observer.observe(entry.envelope), true);
    }
  }
  const snapshot = observer.snapshot();
  assert.equal(snapshot.atomic_commits_verified, 0);
  assert.equal(snapshot.terminal_successes, 0);
  assert.equal(snapshot.active_transitions, 0);
  assert.equal(snapshot.provisional_historical_transitions, 2);
  assert.equal(snapshot.terminal_replay_markers, 4);
  assert.equal(observer.replayMarkers().length, 4);
  assert.equal(snapshot.protocol_violations, 0);
});

test('13d4. initial state read fault terminalizes the durable reservation', () => {
  const state = initialState();
  const innerStore = createGovernedRuntimeIdentityStateStore(state);
  let snapshotCalls = 0;
  const readFaultStore = {
    snapshot() {
      snapshotCalls += 1;
      if (snapshotCalls === 3) throw new Error('synthetic-initial-read-fault');
      return innerStore.snapshot();
    },
    compareAndSwap: innerStore.compareAndSwap
  };
  const run = harness({ state, store: readFaultStore });
  const request = requestFor(state);
  const outcome = run.coordinator.preview(request);
  assert.equal(outcome.status, 'terminal_failure');
  assert.equal(
    outcome.protocol.terminal.reason_code,
    'transition_record_store_unavailable'
  );
  assert.equal(run.recordStore.get(request.transition_ref).status, 'terminal');
  assert.equal(
    run.recordStore.snapshot().filter(record => record.status === 'reserved').length,
    0
  );
  assert.equal(run.observer.snapshot().active_transitions, 0);
  assert.equal(run.observer.snapshot().terminal_failures, 1);
});

test('13d5. protocol lookup during Observer dispatch does not reenter outbox flush', () => {
  const state = initialState();
  const observer = createGovernedRuntimeIdentityTransitionObserver({
    initialAuthoritativeState: state
  });
  let coordinator;
  let callbackProtocol = null;
  const run = harness({
    state,
    observer: {
      observe(event) {
        const accepted = observer.observe(event);
        if (event.event === 'transition_terminal_committed') {
          callbackProtocol = coordinator.protocol(event.transition_ref);
        }
        return accepted;
      }
    }
  });
  coordinator = run.coordinator;
  const request = requestFor(state);
  const prepared = coordinator.preview(request);
  const committed = coordinator.commit(prepared.preview);
  assert.equal(committed.status, 'terminal_success');
  assert.deepEqual(callbackProtocol, committed.protocol);
  assert.equal(run.recordStore.pendingObserverEvents().length, 0);
  assert.equal(observer.snapshot().terminal_successes, 1);
});

test('13d6. shared-store duplicate acknowledgements are idempotent', () => {
  const state = initialState();
  const store = createGovernedRuntimeIdentityStateStore(state);
  const recordStore = createTransitionRecordStore();
  const observer = createGovernedRuntimeIdentityTransitionObserver({
    initialAuthoritativeState: state
  });
  let secondCoordinator;
  let enteredSecondCoordinator = false;
  let nestedLookupCode = null;
  const transport = {
    observe(event) {
      const accepted = observer.observe(event);
      if (!enteredSecondCoordinator) {
        enteredSecondCoordinator = true;
        try {
          secondCoordinator.protocol(event.transition_ref);
        } catch (error) {
          nestedLookupCode = error.code;
        }
      }
      return accepted;
    }
  };
  const first = harness({ state, store, recordStore, observer: transport });
  const second = harness({ state, store, recordStore, observer: transport });
  secondCoordinator = second.coordinator;
  const request = requestFor(state);
  const prepared = first.coordinator.preview(request);
  const committed = first.coordinator.commit(prepared.preview);
  assert.equal(committed.status, 'terminal_success');
  assert.equal(nestedLookupCode, 'transition_terminal_missing');
  assert.equal(recordStore.pendingObserverEvents().length, 0);
  assert.equal(observer.snapshot().terminal_successes, 1);
  assert.equal(observer.snapshot().protocol_violations, 0);
});

test('13e. archived protocol lookup does not require identity-state readback', () => {
  const result = prepareAndCommit();
  let stateReadsDenied = true;
  const archiveOnlyStore = {
    snapshot() {
      if (stateReadsDenied) throw new Error('synthetic-state-read-denied');
      return result.store.snapshot();
    },
    compareAndSwap() {
      throw new Error('unexpected-cas');
    }
  };
  stateReadsDenied = false;
  const rebuilt = harness({
    state: result.store.snapshot(),
    store: archiveOnlyStore,
    recordStore: result.recordStore
  });
  stateReadsDenied = true;
  assert.deepEqual(
    rebuilt.coordinator.protocol(result.request.transition_ref),
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

test('17a0. Observer binds acceptance routing ref to the request ref', () => {
  const state = initialState();
  const request = requestFor(state);
  const observer = createGovernedRuntimeIdentityTransitionObserver();
  assert.equal(observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_accepted',
    transition_ref: `grit_${'Z'.repeat(32)}`,
    request
  }), false);
  assert.equal(observer.snapshot().active_transitions, 0);
  assert.equal(observer.snapshot().protocol_violations, 1);
  assert.equal(
    observer.snapshot().last_violation_code,
    'transition_observer_accept_ref_mismatch'
  );
});

test('17a01. Observer rejects null before replay-marker lookup', () => {
  const observer = createGovernedRuntimeIdentityTransitionObserver();
  assert.equal(observer.observe(null), false);
  assert.equal(observer.observe([]), false);
  assert.equal(observer.snapshot().protocol_violations, 0);
});

test('17a. Observer rejects a self-consistent commit not derived from its request', () => {
  const result = prepareAndCommit();
  const observer = createGovernedRuntimeIdentityTransitionObserver();
  observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_accepted',
    transition_ref: result.request.transition_ref,
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
  replayObserverPrelude(observer, result);
  assert.equal(observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_atomic_commit',
    transition_ref: result.request.transition_ref,
    protocol: result.committed.protocol,
    accepted_runtime: result.committed.accepted_runtime,
    controller_binding: result.committed.controller_binding,
    store_version: 1,
    previous_state_digest: digestObject(result.state),
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
    transition_ref: result.request.transition_ref,
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
    transition_ref: result.request.transition_ref,
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
      transition_ref: request.transition_ref,
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
    transition_ref: earliestRequest.transition_ref,
    request: earliestRequest
  }), true);
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
    transition_ref: earliestRequest.transition_ref,
    request: earliestRequest
  }), true);
  const conflictingReplay = structuredClone(earliestRequest);
  conflictingReplay.request.nonce = `nonce_${'Z'.repeat(24)}`;
  assert.equal(rebuilt.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_accepted',
    transition_ref: conflictingReplay.transition_ref,
    request: conflictingReplay
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

test('17f1. Observer binds projected and event previous-state digests', () => {
  const result = prepareAndCommit();
  const observer = createGovernedRuntimeIdentityTransitionObserver({
    initialAuthoritativeState: result.state
  });
  replayObserverPrelude(observer, result);
  const projection = structuredClone(result.store.snapshot());
  projection.last_transition.previous_state_digest =
    digestObject('forged-projected-previous-state');
  assert.equal(observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_atomic_commit',
    transition_ref: result.request.transition_ref,
    protocol: result.committed.protocol,
    accepted_runtime: result.committed.accepted_runtime,
    controller_binding: result.committed.controller_binding,
    store_version: projection.store_version,
    previous_state_digest: digestObject(result.state),
    state_digest: digestObject(projection),
    state_projection: projection
  }), false);
  assert.equal(observer.snapshot().atomic_commits_verified, 0);
  assert.equal(observer.snapshot().protocol_violations, 1);
});

test('17f2. Observer requires one preview bound to the atomic store version', () => {
  const result = prepareAndCommit();
  const atomicEvent = {
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_atomic_commit',
    transition_ref: result.request.transition_ref,
    protocol: result.committed.protocol,
    accepted_runtime: result.committed.accepted_runtime,
    controller_binding: result.committed.controller_binding,
    store_version: 1,
    previous_state_digest: digestObject(result.state),
    state_digest: result.committed.state_digest,
    state_projection: result.store.snapshot()
  };
  const withoutPreview = createGovernedRuntimeIdentityTransitionObserver();
  withoutPreview.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_accepted',
    transition_ref: result.request.transition_ref,
    request: result.request
  });
  for (const receipt of result.committed.protocol.receipts) {
    withoutPreview.observe({
      component: 'governed_runtime_identity_transition_coordinator',
      event: 'transition_receipt_appended',
      transition_ref: result.request.transition_ref,
      receipt
    });
  }
  assert.equal(withoutPreview.observe(atomicEvent), false);
  assert.equal(withoutPreview.snapshot().atomic_commits_verified, 0);

  const wrongVersion = createGovernedRuntimeIdentityTransitionObserver();
  const preparedIndex = result.committed.protocol.receipts.findIndex(
    receipt => receipt.stage === 'TRANSITION_PREPARED'
  );
  const preparedReceipts = result.committed.protocol.receipts.slice(
    0,
    preparedIndex + 1
  );
  assert.equal(wrongVersion.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_accepted',
    transition_ref: result.request.transition_ref,
    request: result.request
  }), true);
  for (const receipt of preparedReceipts) {
    assert.equal(wrongVersion.observe({
      component: 'governed_runtime_identity_transition_coordinator',
      event: 'transition_receipt_appended',
      transition_ref: result.request.transition_ref,
      receipt
    }), true);
  }
  const forgedPreview = createRuntimeIdentityTransitionPreview({
    request: result.request,
    receipts: preparedReceipts,
    expectedStoreVersion: 7
  });
  assert.equal(wrongVersion.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_preview_formed',
    transition_ref: result.request.transition_ref,
    preview: forgedPreview
  }), true);
  for (const receipt of result.committed.protocol.receipts.slice(
    preparedIndex + 1
  )) {
    assert.equal(wrongVersion.observe({
      component: 'governed_runtime_identity_transition_coordinator',
      event: 'transition_receipt_appended',
      transition_ref: result.request.transition_ref,
      receipt
    }), true);
  }
  assert.equal(wrongVersion.observe(atomicEvent), false);
  assert.equal(wrongVersion.snapshot().atomic_commits_verified, 0);
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
    previous_state_digest: digestObject(first.state),
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
    previous_state_digest: digestObject(first.state),
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
    previous_state_digest: digestObject(first.state),
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
  const rotatedBaseline = prepareAndCommit({
    authority({ authority, authority_context_digest: context }) {
      return {
        verified: true,
        authority_id: authority.authority_id,
        authority_lineage_digest: authority.authority_lineage_digest,
        authority_context_digest: context,
        authority_proof_digest: authority.authority_proof_digest
      };
    },
    request: {
      authorityId: otherAuthorityId,
      authorityLineage: otherAuthorityLineage
    }
  });
  const branchState = rotatedBaseline.store.snapshot();
  const requestOptions = {
    suffix: 'J',
    target: toRuntime('c'),
    fromRuntime: branchState.accepted_runtime,
    authorityId: otherAuthorityId,
    authorityLineage: otherAuthorityLineage,
    proofDigest: digestObject('observer-other-authority-proof-J'),
    legacy: null
  };
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
    committed: branchCommitted,
    prepared: branchPrepared
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

test('17o. Observer rejects lifecycle receipt replacement across commits', () => {
  const first = prepareAndCommit();
  const replacementReceipt = digestObject('replacement-safe-stop-receipt');
  const replacementInitial = initialState({
    lifecycle: {
      lifecycle_state: 'stopped',
      held_stopped: true,
      safe_stop_receipt_digest: replacementReceipt,
      running_component_count: 0
    }
  });
  const replacementBaseline = prepareAndCommit({ state: replacementInitial });
  const branchState = replacementBaseline.store.snapshot();
  const branch = prepareAndCommit({
    state: branchState,
    request: {
      suffix: 'K',
      target: toRuntime('c'),
      fromRuntime: branchState.accepted_runtime,
      safeStopDigest: branchState.lifecycle.safe_stop_receipt_digest,
      proofDigest: digestObject('replacement-stop-proof-K'),
      legacy: null
    }
  });

  const observer = createGovernedRuntimeIdentityTransitionObserver({
    initialAuthoritativeState: first.state
  });
  replayObserverPrelude(observer, first);
  assert.equal(observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_atomic_commit',
    transition_ref: first.request.transition_ref,
    protocol: first.committed.protocol,
    accepted_runtime: first.committed.accepted_runtime,
    controller_binding: first.committed.controller_binding,
    store_version: 1,
    previous_state_digest: digestObject(first.state),
    state_digest: first.committed.state_digest,
    state_projection: first.store.snapshot()
  }), true);
  assert.equal(observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_terminal_committed',
    transition_ref: first.request.transition_ref,
    terminal: first.committed.protocol.terminal
  }), true);

  replayObserverPrelude(observer, branch);
  assert.equal(observer.observe({
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_atomic_commit',
    transition_ref: branch.request.transition_ref,
    protocol: branch.committed.protocol,
    accepted_runtime: branch.committed.accepted_runtime,
    controller_binding: branch.committed.controller_binding,
    store_version: 2,
    previous_state_digest: first.committed.state_digest,
    state_digest: branch.committed.state_digest,
    state_projection: branch.store.snapshot()
  }), false);
  assert.equal(observer.snapshot().atomic_commits_verified, 1);
  assert.equal(observer.snapshot().protocol_violations, 1);
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
  assert.equal(run.recordStore.pendingObserverEvents().length, 0);
  assert.throws(
    () => run.observer.reconcile(request.transition_ref),
    { code: 'transition_terminal_missing' }
  );
});

test('18a. coordinator loss reports durable reservations after recreation', () => {
  const state = initialState();
  const request = requestFor(state);
  const acceptedEnvelope = {
    component: 'governed_runtime_identity_transition_coordinator',
    event: 'transition_accepted',
    transition_ref: request.transition_ref,
    request
  };
  const recordStore = createTransitionRecordStore([{
    transition_ref: request.transition_ref,
    request_digest: runtimeIdentityTransitionRequestDigest(request),
    owner_digest: COORDINATOR_OWNER,
    status: 'reserved',
    protocol: null,
    observer_outbox: [],
    observer_delivered_events: [{
      sequence: 0,
      event_digest: digestObject(acceptedEnvelope),
      envelope: acceptedEnvelope
    }],
    previous_state_digest: null
  }], { maxActiveReservations: 1 });
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
  assert.equal(events.length, 2);
  assert.equal(events[0].event, 'transition_accepted');
  assert.equal(events[1].event, 'transition_terminal_missing');
  assert.equal(events[1].transition_ref, request.transition_ref);
  assert.equal(recordStore.get(request.transition_ref).status, 'lost');
  assert.deepEqual(run.coordinator.reportCoordinatorLoss(), {
    active_transitions_lost: 0,
    terminals_fabricated: 0
  });
  assert.equal(events.length, 2);

  const rebuiltRecords = createTransitionRecordStore(recordStore.snapshot());
  const rebuiltEvents = [];
  const rebuilt = harness({
    state,
    recordStore: rebuiltRecords,
    observer: {
      observe(event) {
        rebuiltEvents.push(event);
        return true;
      }
    }
  });
  assert.deepEqual(rebuilt.coordinator.reportCoordinatorLoss(), {
    active_transitions_lost: 0,
    terminals_fabricated: 0
  });
  assert.deepEqual(rebuiltEvents, []);
  assert.equal(
    rebuiltRecords.get(request.transition_ref).status,
    'lost'
  );
  const nextRequest = requestFor(state, {
    suffix: 'B',
    proofDigest: digestObject('post-loss-capacity-proof')
  });
  assert.equal(recordStore.reserve({
    transition_ref: nextRequest.transition_ref,
    request_digest: runtimeIdentityTransitionRequestDigest(nextRequest),
    owner_digest: COORDINATOR_OWNER,
    acceptance_event: acceptanceEvent(nextRequest)
  }), true);
});

test('18a0. reservation atomically persists its acceptance before a crash', () => {
  const state = initialState();
  const durableRecords = createTransitionRecordStore();
  let crashAfterReserve = true;
  const crashingRecords = {
    ...durableRecords,
    reserve(input) {
      const reserved = durableRecords.reserve(input);
      if (crashAfterReserve) {
        crashAfterReserve = false;
        throw new Error('synthetic-crash-after-reservation');
      }
      return reserved;
    }
  };
  const first = harness({ state, recordStore: crashingRecords });
  const request = requestFor(state);
  const failed = first.coordinator.preview(request);
  assert.equal(failed.status, 'terminal_failure');
  assert.equal(
    failed.protocol.terminal.reason_code,
    'transition_record_store_unavailable'
  );
  const persisted = durableRecords.get(request.transition_ref);
  assert.equal(persisted.status, 'reserved');
  assert.equal(persisted.observer_outbox.length, 1);
  assert.equal(persisted.observer_outbox[0].envelope.event,
    'transition_accepted');

  const observer = createGovernedRuntimeIdentityTransitionObserver();
  const rebuilt = harness({ state, recordStore: durableRecords, observer });
  assert.deepEqual(rebuilt.coordinator.reportCoordinatorLoss(), {
    active_transitions_lost: 1,
    terminals_fabricated: 0
  });
  assert.equal(durableRecords.pendingObserverEvents().length, 0);
  assert.equal(durableRecords.get(request.transition_ref).status, 'lost');
  assert.equal(observer.snapshot().transitions_accepted, 1);
  assert.equal(observer.snapshot().terminals_missing, 1);
  assert.equal(observer.snapshot().last_violation_code, 'terminal_missing');
});

test('18a1. loss reporting cannot terminate another coordinator owner', () => {
  const state = initialState();
  const store = createGovernedRuntimeIdentityStateStore(state);
  const recordStore = createTransitionRecordStore();
  const observer = { observe() { return true; } };
  const coordinatorA = harness({
    state,
    store,
    recordStore,
    observer,
    ownerDigest: digestObject('coordinator-owner-A')
  });
  const requestA = requestFor(state, {
    suffix: 'A',
    proofDigest: digestObject('owner-A-proof')
  });
  const previewA = coordinatorA.coordinator.preview(requestA);
  assert.equal(previewA.status, 'prepared');

  const coordinatorB = harness({
    state,
    store,
    recordStore,
    observer,
    ownerDigest: digestObject('coordinator-owner-B')
  });
  const requestB = requestFor(state, {
    suffix: 'B',
    proofDigest: digestObject('owner-B-proof')
  });
  assert.equal(coordinatorB.coordinator.preview(requestB).status, 'prepared');
  assert.deepEqual(coordinatorB.coordinator.reportCoordinatorLoss(), {
    active_transitions_lost: 1,
    terminals_fabricated: 0
  });
  assert.equal(recordStore.get(requestB.transition_ref).status, 'lost');
  assert.equal(recordStore.get(requestA.transition_ref).status, 'reserved');
  assert.equal(
    coordinatorA.coordinator.commit(previewA.preview).status,
    'terminal_success'
  );
});

test('18b. an unacknowledged missing event is queued only once', () => {
  const state = initialState();
  const observer = createGovernedRuntimeIdentityTransitionObserver({
    initialAuthoritativeState: state
  });
  let acknowledgeMissing = false;
  const run = harness({
    state,
    observer: {
      observe(event) {
        if (event.event === 'transition_terminal_missing' &&
            !acknowledgeMissing) {
          return false;
        }
        return observer.observe(event);
      }
    }
  });
  const request = requestFor(state);
  assert.equal(run.coordinator.preview(request).status, 'prepared');
  assert.deepEqual(run.coordinator.reportCoordinatorLoss(), {
    active_transitions_lost: 1,
    terminals_fabricated: 0
  });
  assert.equal(run.recordStore.pendingObserverEvents().length, 1);
  assert.deepEqual(run.coordinator.reportCoordinatorLoss(), {
    active_transitions_lost: 0,
    terminals_fabricated: 0
  });
  assert.equal(run.recordStore.pendingObserverEvents().length, 1);

  acknowledgeMissing = true;
  assert.deepEqual(run.coordinator.reportCoordinatorLoss(), {
    active_transitions_lost: 0,
    terminals_fabricated: 0
  });
  assert.equal(run.recordStore.pendingObserverEvents().length, 0);
  assert.equal(run.recordStore.get(request.transition_ref).status, 'lost');
  assert.equal(observer.snapshot().terminals_missing, 1);
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

test('candidate revalidation cannot carry an expired request into CAS', () => {
  const state = initialState();
  let currentTime = NOW;
  let manifestCalls = 0;
  const run = harness({
    state,
    clock: () => currentTime,
    manifest(input) {
      manifestCalls += 1;
      if (manifestCalls === 2) {
        currentTime = new Date(NOW.getTime() + 121_000);
      }
      return manifestVerifier(input);
    }
  });
  const prepared = run.coordinator.preview(requestFor(state));
  assert.equal(prepared.status, 'prepared');
  const outcome = run.coordinator.commit(prepared.preview);
  assert.equal(outcome.status, 'terminal_failure');
  assert.equal(outcome.protocol.terminal.reason_code, 'transition_expired');
  assert.equal(run.store.snapshot().store_version, 0);
  assert.equal(manifestCalls, 2);
});

test('commit-context persistence cannot carry an expired request into CAS', () => {
  const state = initialState();
  const recordStore = createTransitionRecordStore();
  let currentTime = NOW;
  let contextWrites = 0;
  const slowRecords = {
    ...recordStore,
    setCommitContext(input) {
      contextWrites += 1;
      const written = recordStore.setCommitContext(input);
      currentTime = new Date(NOW.getTime() + 121_000);
      return written;
    }
  };
  const run = harness({
    state,
    recordStore: slowRecords,
    clock: () => currentTime
  });
  const prepared = run.coordinator.preview(requestFor(state));
  const outcome = run.coordinator.commit(prepared.preview);
  assert.equal(outcome.status, 'terminal_failure');
  assert.equal(outcome.protocol.terminal.reason_code, 'transition_expired');
  assert.equal(run.store.snapshot().store_version, 0);
  assert.equal(contextWrites, 1);
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
