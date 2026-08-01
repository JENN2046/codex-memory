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
    state_digest: digestObject('forged-state')
  }), false);
  assert.equal(observer.snapshot().atomic_commits_verified, 0);
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
  assert.throws(
    () => run.observer.reconcile(request.transition_ref),
    { code: 'transition_terminal_missing' }
  );
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
