'use strict';

const {
  GOVERNED_RUNTIME_IDENTITY_AUTHORITY_ID_PATTERN,
  GOVERNED_RUNTIME_IDENTITY_TRANSITION_PROTOCOL,
  GOVERNED_RUNTIME_IDENTITY_TRANSITION_SCHEMA_VERSION,
  appendRuntimeIdentityTransitionStage,
  canonicalJson,
  createGovernedRuntimeIdentityTransitionProtocol,
  createRuntimeIdentityTransitionPreview,
  createRuntimeIdentityTransitionTerminal,
  createTransitionRuntimeIdentity,
  deepFreeze,
  digestObject,
  isPlainObject,
  reject,
  runtimeIdentityTransitionAuthorityContextDigest,
  runtimeIdentityTransitionRequestDigest,
  validateGovernedRuntimeIdentityTransitionProtocol,
  validateRuntimeIdentity,
  validateRuntimeIdentityTransitionPreview,
  validateRuntimeIdentityTransitionReceipt,
  validateRuntimeIdentityTransitionRequest,
  validateRuntimeIdentityTransitionTerminal,
  validateToRuntime
} = require('../../packages/chatgpt-r4-contracts');

const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const EVENT_NAME_PATTERN = /^[a-z][a-z0-9_]{0,79}$/u;
const TRANSITION_REF_PATTERN = /^grit_[A-Za-z0-9_-]{24,96}$/u;
const AUTHORITY_PROOF_REPLAY_LIMIT = 4096;
const DEFAULT_ACTIVE_TRANSITION_LIMIT = 256;
const STORE_SCHEMA_VERSION = 1;
const LEGACY_CONTROLLER_BINDING_MODEL = 'legacy_source_coupled';
const STABLE_CONTROLLER_BINDING_MODEL = 'stable_controller_authority.v1';
const OBSERVER_ATTEMPT_OUTCOMES = Object.freeze([
  'never_attempted',
  'observer_acknowledged',
  'observer_negative_ack',
  'delivery_exception'
]);

const LIFECYCLE_KEYS = Object.freeze([
  'lifecycle_state',
  'held_stopped',
  'safe_stop_receipt_digest',
  'running_component_count'
]);
const LEGACY_BINDING_KEYS = Object.freeze([
  'model',
  'current_controller_client_identity_digest',
  'accepted_runtime_identity_digest',
  'accepted_runtime_source_head',
  'accepted_runtime_manifest_digest'
]);
const STABLE_BINDING_KEYS = Object.freeze([
  'model',
  'authority_id',
  'authority_lineage_digest',
  'accepted_runtime_identity_digest',
  'accepted_runtime_source_head',
  'accepted_runtime_manifest_digest',
  'binding_digest'
]);
const MIGRATION_KEYS = Object.freeze([
  'consumed',
  'evidence_digest'
]);
const LAST_TRANSITION_KEYS = Object.freeze([
  'previous_state_digest',
  'transition_ref_digest',
  'protocol_digest',
  'terminal_digest',
  'protocol',
  'side_effects'
]);
const SIDE_EFFECT_KEYS = Object.freeze([
  'runtime_started',
  'repository_changed',
  'resolver_called',
  'search_called',
  'provider_called',
  'memory_called'
]);
const STORE_STATE_KEYS = Object.freeze([
  'schema_version',
  'store_version',
  'accepted_runtime',
  'lifecycle',
  'controller_binding',
  'legacy_migration',
  'last_transition'
]);

function exactKeys(value, keys) {
  return Boolean(
    isPlainObject(value) &&
    Object.keys(value).sort().join('\0') === [...keys].sort().join('\0')
  );
}

function assertDigest(value, code) {
  if (typeof value !== 'string' || !DIGEST_PATTERN.test(value)) reject(code);
}

function validateLifecycle(value) {
  if (!exactKeys(value, LIFECYCLE_KEYS) ||
      !['stopped', 'running'].includes(value.lifecycle_state) ||
      typeof value.held_stopped !== 'boolean' ||
      !Number.isSafeInteger(value.running_component_count) ||
      value.running_component_count < 0) {
    reject('transition_store_lifecycle_invalid');
  }
  assertDigest(
    value.safe_stop_receipt_digest,
    'transition_store_lifecycle_invalid'
  );
  return value;
}

function validateControllerBinding(value) {
  if (value?.model === LEGACY_CONTROLLER_BINDING_MODEL) {
    if (!exactKeys(value, LEGACY_BINDING_KEYS)) {
      reject('transition_store_controller_binding_invalid');
    }
    for (const key of [
      'current_controller_client_identity_digest',
      'accepted_runtime_identity_digest',
      'accepted_runtime_manifest_digest'
    ]) {
      assertDigest(value[key], 'transition_store_controller_binding_invalid');
    }
    if (!/^[a-f0-9]{40}$/u.test(value.accepted_runtime_source_head || '')) {
      reject('transition_store_controller_binding_invalid');
    }
    return value;
  }
  if (value?.model !== STABLE_CONTROLLER_BINDING_MODEL ||
      !exactKeys(value, STABLE_BINDING_KEYS) ||
      !GOVERNED_RUNTIME_IDENTITY_AUTHORITY_ID_PATTERN.test(
        value.authority_id || ''
      )) {
    reject('transition_store_controller_binding_invalid');
  }
  for (const key of [
    'authority_lineage_digest',
    'accepted_runtime_identity_digest',
    'accepted_runtime_manifest_digest',
    'binding_digest'
  ]) {
    assertDigest(value[key], 'transition_store_controller_binding_invalid');
  }
  if (!/^[a-f0-9]{40}$/u.test(value.accepted_runtime_source_head || '')) {
    reject('transition_store_controller_binding_invalid');
  }
  const { binding_digest: ignored, ...base } = value;
  if (value.binding_digest !== digestObject(base)) {
    reject('transition_store_controller_binding_invalid');
  }
  return value;
}

function validateSideEffects(value) {
  if (!exactKeys(value, SIDE_EFFECT_KEYS) ||
      Object.values(value).some(item => item !== false)) {
    reject('transition_store_side_effects_invalid');
  }
  return value;
}

function validateGovernedRuntimeIdentityState(value) {
  if (!exactKeys(value, STORE_STATE_KEYS) ||
      value.schema_version !== STORE_SCHEMA_VERSION ||
      !Number.isSafeInteger(value.store_version) || value.store_version < 0) {
    reject('transition_store_state_invalid');
  }
  validateRuntimeIdentity(value.accepted_runtime);
  validateLifecycle(value.lifecycle);
  validateControllerBinding(value.controller_binding);
  if (!exactKeys(value.legacy_migration, MIGRATION_KEYS) ||
      typeof value.legacy_migration.consumed !== 'boolean' ||
      (value.legacy_migration.evidence_digest !== null &&
        !DIGEST_PATTERN.test(value.legacy_migration.evidence_digest)) ||
      value.legacy_migration.consumed !==
        (value.legacy_migration.evidence_digest !== null)) {
    reject('transition_store_migration_invalid');
  }
  if (value.last_transition !== null) {
    if (value.store_version < 1 ||
        !exactKeys(value.last_transition, LAST_TRANSITION_KEYS)) {
      reject('transition_store_last_transition_invalid');
    }
    for (const key of [
      'previous_state_digest',
      'transition_ref_digest',
      'protocol_digest',
      'terminal_digest'
    ]) {
      assertDigest(value.last_transition[key], 'transition_store_last_transition_invalid');
    }
    validateGovernedRuntimeIdentityTransitionProtocol(
      value.last_transition.protocol
    );
    const lastProtocol = value.last_transition.protocol;
    const derivedRuntime = createTransitionRuntimeIdentity({
      fromRuntime: lastProtocol.request.from_runtime,
      toRuntime: lastProtocol.request.to_runtime,
      transitionRef: lastProtocol.request.transition_ref
    });
    const derivedBinding = stableControllerBinding(
      lastProtocol.request,
      derivedRuntime
    );
    if (value.last_transition.protocol_digest !==
          digestObject(value.last_transition.protocol) ||
        value.last_transition.terminal_digest !==
          value.last_transition.protocol.terminal.terminal_digest ||
        value.last_transition.transition_ref_digest !==
          digestObject(
            value.last_transition.protocol.request.transition_ref
          ) ||
        lastProtocol.terminal.outcome !== 'success' ||
        lastProtocol.request.preconditions.safe_stop_receipt_digest !==
          value.lifecycle.safe_stop_receipt_digest ||
        (lastProtocol.request.legacy_transition_evidence !== null &&
          value.legacy_migration.evidence_digest !== digestObject(
            lastProtocol.request.legacy_transition_evidence
          )) ||
        canonicalJson(derivedRuntime) !==
          canonicalJson(value.accepted_runtime) ||
        canonicalJson(derivedBinding) !==
          canonicalJson(value.controller_binding) ||
        lastProtocol.terminal.new_runtime_identity_digest !==
          value.accepted_runtime.identity_digest ||
        lastProtocol.terminal.controller_binding_digest !==
          value.controller_binding.binding_digest) {
      reject('transition_store_last_transition_invalid');
    }
    validateSideEffects(value.last_transition.side_effects);
  }
  if (value.controller_binding.accepted_runtime_identity_digest !==
        value.accepted_runtime.identity_digest ||
      value.controller_binding.accepted_runtime_source_head !==
        value.accepted_runtime.source_head ||
      value.controller_binding.accepted_runtime_manifest_digest !==
        value.accepted_runtime.manifest_digest) {
    reject('transition_store_binding_runtime_mismatch');
  }
  if (value.controller_binding.model === STABLE_CONTROLLER_BINDING_MODEL &&
      value.last_transition === null) {
    reject('transition_store_last_transition_invalid');
  }
  if (value.controller_binding.model === LEGACY_CONTROLLER_BINDING_MODEL &&
      value.legacy_migration.consumed) {
    reject('transition_store_migration_invalid');
  }
  return value;
}

function createGovernedRuntimeIdentityStateStore(initialState) {
  validateGovernedRuntimeIdentityState(initialState);
  let state = structuredClone(initialState);

  function snapshot() {
    return deepFreeze(structuredClone(state));
  }

  function compareAndSwap(expectedVersion, candidateState) {
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
      reject('transition_store_cas_version_invalid');
    }
    validateGovernedRuntimeIdentityState(candidateState);
    if (candidateState.store_version !== expectedVersion + 1) {
      reject('transition_store_cas_candidate_invalid');
    }
    if (state.store_version !== expectedVersion) return false;
    let expectedCandidate;
    try {
      expectedCandidate = successfulTransitionState(
        state,
        candidateState.last_transition.protocol
      );
    } catch {
      reject('transition_store_cas_candidate_invalid');
    }
    if (canonicalJson(candidateState) !== canonicalJson(expectedCandidate)) {
      reject('transition_store_cas_candidate_invalid');
    }
    state = structuredClone(candidateState);
    return true;
  }

  return Object.freeze({ compareAndSwap, snapshot });
}

function createAuthorityProofReplayStore(initialEntries = []) {
  if (!Array.isArray(initialEntries)) {
    reject('transition_authority_proof_store_invalid');
  }
  const consumed = new Map();
  for (const entry of initialEntries) {
    if (!exactKeys(entry, [
      'authority_proof_digest',
      'authority_context_digest',
      'transition_ref'
    ])) {
      reject('transition_authority_proof_store_invalid');
    }
    assertDigest(
      entry.authority_proof_digest,
      'transition_authority_proof_store_invalid'
    );
    assertDigest(
      entry.authority_context_digest,
      'transition_authority_proof_store_invalid'
    );
    if (!TRANSITION_REF_PATTERN.test(entry.transition_ref || '') ||
        consumed.has(entry.authority_proof_digest)) {
      reject('transition_authority_proof_store_invalid');
    }
    consumed.set(
      entry.authority_proof_digest,
      structuredClone(entry)
    );
  }

  function consume(entry) {
    if (!exactKeys(entry, [
      'authority_proof_digest',
      'authority_context_digest',
      'transition_ref'
    ])) {
      reject('transition_authority_proof_store_invalid');
    }
    assertDigest(
      entry.authority_proof_digest,
      'transition_authority_proof_store_invalid'
    );
    assertDigest(
      entry.authority_context_digest,
      'transition_authority_proof_store_invalid'
    );
    if (!TRANSITION_REF_PATTERN.test(entry.transition_ref || '')) {
      reject('transition_authority_proof_store_invalid');
    }
    if (consumed.has(entry.authority_proof_digest)) return false;
    consumed.set(
      entry.authority_proof_digest,
      deepFreeze(structuredClone(entry))
    );
    return true;
  }

  function snapshot() {
    return deepFreeze(
      [...consumed.values()].map(entry => structuredClone(entry))
    );
  }

  return Object.freeze({ consume, snapshot });
}

function createTransitionRecordStore(initialRecords = [], {
  maxActiveReservations = DEFAULT_ACTIVE_TRANSITION_LIMIT
} = {}) {
  if (!Array.isArray(initialRecords) ||
      !Number.isInteger(maxActiveReservations) ||
      maxActiveReservations < 1 ||
      maxActiveReservations > AUTHORITY_PROOF_REPLAY_LIMIT) {
    reject('transition_record_store_invalid');
  }
  // Active reservations are bounded admission state. Completed protocols move
  // to a separate durable archive so replay protection survives compaction
  // without terminal history permanently consuming admission capacity.
  const activeRecords = new Map();
  const terminalArchive = new Map();
  const initialObserverSequences = new Set();
  let nextObserverSequence = 0;

  function isAllocatableObserverSequence(value) {
    return Number.isSafeInteger(value) &&
      value >= 0 && value < Number.MAX_SAFE_INTEGER;
  }

  function validateObserverEvents(value, transitionRef, disposition) {
    if (!Array.isArray(value)) reject('transition_record_store_invalid');
    let previousSequence = -1;
    const digests = new Set();
    for (const entry of value) {
      if (!exactKeys(entry, [
        'sequence',
        'event_digest',
        'envelope',
        'durable_disposition',
        'attempt_metadata'
      ]) ||
          !isAllocatableObserverSequence(entry.sequence) ||
          entry.sequence <= previousSequence ||
          entry.durable_disposition !== disposition ||
          !exactKeys(entry.attempt_metadata, [
            'attempt_count', 'last_attempt_outcome'
          ]) ||
          !Number.isSafeInteger(entry.attempt_metadata.attempt_count) ||
          entry.attempt_metadata.attempt_count < 0 ||
          !OBSERVER_ATTEMPT_OUTCOMES.includes(
            entry.attempt_metadata.last_attempt_outcome
          ) ||
          ((entry.attempt_metadata.attempt_count === 0) !==
            (entry.attempt_metadata.last_attempt_outcome ===
              'never_attempted')) ||
          !isPlainObject(entry.envelope) ||
          entry.envelope.component !==
            'governed_runtime_identity_transition_coordinator' ||
          !EVENT_NAME_PATTERN.test(entry.envelope.event || '') ||
          entry.envelope.transition_ref !== transitionRef ||
          digestObject(entry.envelope) !== entry.event_digest ||
          digests.has(entry.event_digest) ||
          (disposition === 'acknowledged' &&
            (entry.attempt_metadata.attempt_count < 1 ||
              entry.attempt_metadata.last_attempt_outcome !==
                'observer_acknowledged')) ||
          (disposition === 'rejected_before_observation' &&
            (entry.attempt_metadata.attempt_count < 1 ||
              entry.attempt_metadata.last_attempt_outcome !==
                'observer_negative_ack'))) {
        reject('transition_record_store_invalid');
      }
      assertDigest(entry.event_digest, 'transition_record_store_invalid');
      digests.add(entry.event_digest);
      previousSequence = entry.sequence;
    }
  }

  function pendingObserverEntry(entry) {
    return {
      ...structuredClone(entry),
      durable_disposition: 'pending'
    };
  }

  function normalizeLegacyObserverEntry(entry, disposition) {
    if (!exactKeys(entry, ['sequence', 'event_digest', 'envelope'])) {
      return structuredClone(entry);
    }
    return {
      ...structuredClone(entry),
      durable_disposition: disposition,
      attempt_metadata: disposition === 'acknowledged'
        ? {
          attempt_count: 1,
          last_attempt_outcome: 'observer_acknowledged'
        }
        : { attempt_count: 0, last_attempt_outcome: 'never_attempted' }
    };
  }

  function validateObserverEventStream(record) {
    const entries = [
      ...record.observer_acknowledged_events,
      ...record.observer_outbox
    ].sort((left, right) => left.sequence - right.sequence);
    let request = null;
    const receipts = [];
    let previewSeen = false;
    let preview = null;
    let atomicSeen = false;
    let atomicProtocol = null;
    let atomicStoreVersion = null;
    let atomicPreviousStateDigest = null;
    let atomicTerminal = null;
    let terminalSeen = false;
    let terminalMissing = false;
    let terminal = null;
    for (const entry of entries) {
      const envelope = entry.envelope;
      if (envelope.event === 'transition_accepted') {
        if (!exactKeys(envelope, [
          'component', 'event', 'transition_ref', 'request'
        ]) || request !== null || terminalSeen) {
          reject('transition_record_store_invalid');
        }
        validateRuntimeIdentityTransitionRequest(envelope.request);
        if (envelope.request.transition_ref !== record.transition_ref ||
            runtimeIdentityTransitionRequestDigest(envelope.request) !==
              record.request_digest) {
          reject('transition_record_store_invalid');
        }
        request = envelope.request;
      } else if (envelope.event === 'transition_receipt_appended') {
        if (!exactKeys(envelope, [
          'component', 'event', 'transition_ref', 'receipt'
        ]) || request === null || terminalSeen) {
          reject('transition_record_store_invalid');
        }
        validateRuntimeIdentityTransitionReceipt(envelope.receipt, {
          request,
          receipts
        });
        receipts.push(envelope.receipt);
      } else if (envelope.event === 'transition_preview_formed') {
        if (!exactKeys(envelope, [
          'component',
          'event',
          'transition_ref',
          'preview'
        ]) || request === null || previewSeen || atomicSeen || terminalSeen) {
          reject('transition_record_store_invalid');
        }
        validateRuntimeIdentityTransitionPreview(envelope.preview);
        if (canonicalJson(envelope.preview.request) !== canonicalJson(request) ||
            canonicalJson(envelope.preview.receipts) !==
              canonicalJson(receipts)) {
          reject('transition_record_store_invalid');
        }
        previewSeen = true;
        preview = envelope.preview;
      } else if (envelope.event === 'transition_atomic_commit') {
        if (!exactKeys(envelope, [
          'component',
          'event',
          'transition_ref',
          'protocol',
          'accepted_runtime',
          'controller_binding',
          'store_version',
          'previous_state_digest',
          'state_digest',
          'state_projection'
        ]) || request === null || !previewSeen || atomicSeen || terminalSeen ||
            !Number.isSafeInteger(envelope.store_version) ||
            envelope.store_version < 1) {
          reject('transition_record_store_invalid');
        }
        validateGovernedRuntimeIdentityTransitionProtocol(envelope.protocol);
        validateRuntimeIdentity(envelope.accepted_runtime);
        validateControllerBinding(envelope.controller_binding);
        validateGovernedRuntimeIdentityState(envelope.state_projection);
        assertDigest(
          envelope.previous_state_digest,
          'transition_record_store_invalid'
        );
        assertDigest(envelope.state_digest, 'transition_record_store_invalid');
        const expectedRuntime = createTransitionRuntimeIdentity({
          fromRuntime: request.from_runtime,
          toRuntime: request.to_runtime,
          transitionRef: request.transition_ref
        });
        const expectedBinding = stableControllerBinding(
          request,
          expectedRuntime
        );
        if (envelope.transition_ref !== record.transition_ref ||
            canonicalJson(envelope.protocol.request) !==
              canonicalJson(request) ||
            canonicalJson(envelope.protocol.receipts) !==
              canonicalJson(receipts) ||
            envelope.protocol.terminal.outcome !== 'success' ||
            canonicalJson(envelope.accepted_runtime) !==
              canonicalJson(expectedRuntime) ||
            canonicalJson(envelope.controller_binding) !==
              canonicalJson(expectedBinding) ||
            envelope.store_version !== envelope.state_projection.store_version ||
            envelope.previous_state_digest !==
              envelope.state_projection.last_transition
                ?.previous_state_digest ||
            envelope.state_digest !== digestObject(envelope.state_projection) ||
            canonicalJson(envelope.accepted_runtime) !== canonicalJson(
              envelope.state_projection.accepted_runtime
            ) ||
            canonicalJson(envelope.controller_binding) !== canonicalJson(
              envelope.state_projection.controller_binding
            ) ||
            canonicalJson(envelope.protocol) !== canonicalJson(
              envelope.state_projection.last_transition?.protocol
            )) {
          reject('transition_record_store_invalid');
        }
        atomicSeen = true;
        atomicProtocol = envelope.protocol;
        atomicStoreVersion = envelope.store_version;
        atomicPreviousStateDigest = envelope.previous_state_digest;
        atomicTerminal = envelope.protocol.terminal;
      } else if (envelope.event === 'transition_terminal_committed') {
        if (!exactKeys(envelope, [
          'component', 'event', 'transition_ref', 'terminal'
        ]) || request === null || terminalSeen) {
          reject('transition_record_store_invalid');
        }
        validateRuntimeIdentityTransitionTerminal(envelope.terminal, {
          request,
          receipts
        });
        if ((envelope.terminal.outcome === 'success') !== atomicSeen ||
            (atomicSeen && canonicalJson(envelope.terminal) !== canonicalJson(
              atomicTerminal
            ))) {
          reject('transition_record_store_invalid');
        }
        terminalSeen = true;
        terminal = envelope.terminal;
      } else if (envelope.event === 'transition_terminal_missing') {
        if (!exactKeys(envelope, [
          'component', 'event', 'transition_ref'
        ]) || request === null || atomicSeen || terminalSeen) {
          reject('transition_record_store_invalid');
        }
        terminalSeen = true;
        terminalMissing = true;
      } else {
        reject('transition_record_store_invalid');
      }
    }
    return {
      entry_count: entries.length,
      request,
      receipts,
      preview,
      atomic_protocol: atomicProtocol,
      atomic_store_version: atomicStoreVersion,
      atomic_previous_state_digest: atomicPreviousStateDigest,
      terminal_missing: terminalMissing,
      terminal
    };
  }

  function validateRecord(record) {
    if (!exactKeys(record, [
      'transition_ref',
      'request_digest',
      'owner_digest',
      'status',
      'protocol',
      'observer_outbox',
      'observer_acknowledged_events',
      'observer_rejected_events',
      'previous_state_digest'
    ]) ||
        !TRANSITION_REF_PATTERN.test(record.transition_ref || '') ||
        !['reserved', 'lost', 'terminal'].includes(record.status)) {
      reject('transition_record_store_invalid');
    }
    validateObserverEvents(
      record.observer_outbox, record.transition_ref, 'pending'
    );
    validateObserverEvents(
      record.observer_acknowledged_events,
      record.transition_ref,
      'acknowledged'
    );
    validateObserverEvents(
      record.observer_rejected_events,
      record.transition_ref,
      'rejected_before_observation'
    );
    const deliverySequence = [
      ...record.observer_acknowledged_events,
      ...record.observer_outbox,
      ...record.observer_rejected_events
    ];
    if (new Set(deliverySequence.map(entry => entry.sequence)).size !==
          deliverySequence.length ||
        new Set(deliverySequence.map(entry => entry.event_digest)).size !==
          deliverySequence.length ||
        record.observer_acknowledged_events.some(acknowledged =>
          record.observer_outbox.some(pending =>
            acknowledged.sequence >= pending.sequence
          ))) {
      reject('transition_record_store_invalid');
    }
    if (record.observer_rejected_events.length > 1 ||
        (record.observer_rejected_events.length === 1 &&
          (!exactKeys(record.observer_rejected_events[0].envelope, [
            'component', 'event', 'transition_ref', 'request'
          ]) || record.observer_rejected_events[0].envelope.event !==
              'transition_accepted' ||
            record.observer_acknowledged_events.length !== 0 ||
            record.observer_outbox.length !== 0))) {
      reject('transition_record_store_invalid');
    }
    const observerStream = validateObserverEventStream(record);
    assertDigest(record.request_digest, 'transition_record_store_invalid');
    assertDigest(record.owner_digest, 'transition_record_store_invalid');
    const rejectedRequest =
      record.observer_rejected_events[0]?.envelope.request || null;
    if ((observerStream.request === null && rejectedRequest === null) ||
        (observerStream.request !== null && rejectedRequest !== null) ||
        runtimeIdentityTransitionRequestDigest(
          observerStream.request || rejectedRequest
        ) !== record.request_digest) {
      reject('transition_record_store_invalid');
    }
    if ((record.previous_state_digest !== null &&
          !DIGEST_PATTERN.test(record.previous_state_digest))) {
      reject('transition_record_store_invalid');
    }
    if (record.status === 'reserved' || record.status === 'lost') {
      if (record.protocol !== null) reject('transition_record_store_invalid');
      if (record.status === 'lost') {
        if (record.observer_outbox.length !== 0 ||
            record.observer_rejected_events.length !== 0 ||
            !observerStream.terminal_missing ||
            observerStream.atomic_protocol !== null ||
            observerStream.terminal !== null) {
          reject('transition_record_store_invalid');
        }
      } else if (observerStream.atomic_protocol !== null ||
          observerStream.terminal !== null ||
          (observerStream.terminal_missing &&
            !record.observer_outbox.some(entry =>
              entry.envelope.event === 'transition_terminal_missing'
            ))) {
        reject('transition_record_store_invalid');
      }
    } else {
      validateGovernedRuntimeIdentityTransitionProtocol(record.protocol);
      if (record.protocol.request.transition_ref !== record.transition_ref ||
          runtimeIdentityTransitionRequestDigest(record.protocol.request) !==
            record.request_digest ||
          observerStream.terminal_missing ||
          (record.observer_rejected_events.length > 0 &&
            record.protocol.terminal.outcome !== 'failure') ||
          (record.protocol.terminal.outcome === 'success' &&
            (record.previous_state_digest === null ||
              observerStream.entry_count === 0 ||
              observerStream.preview === null ||
              observerStream.atomic_protocol === null ||
              observerStream.terminal === null))) {
        reject('transition_record_store_invalid');
      }
      // A non-empty durable event stream and its archived protocol are one
      // governance record, not independently valid artifacts. Binding the
      // reconstructed protocol and commit anchor here prevents a success
      // Observer stream from being spliced onto a failure archive (or the
      // inverse) by a recovery/custom persistence adapter.
      if (observerStream.entry_count > 0) {
        const archivedReceiptPrefix = record.protocol.receipts.slice(
          0,
          observerStream.receipts.length
        );
        if (observerStream.request === null ||
            canonicalJson(observerStream.request) !==
              canonicalJson(record.protocol.request) ||
            canonicalJson(observerStream.receipts) !==
              canonicalJson(archivedReceiptPrefix)) {
          reject('transition_record_store_invalid');
        }
        if ((observerStream.terminal !== null &&
              (observerStream.receipts.length !==
                record.protocol.receipts.length ||
                canonicalJson(observerStream.terminal) !==
                  canonicalJson(record.protocol.terminal))) ||
            (observerStream.atomic_protocol !== null &&
              canonicalJson(observerStream.atomic_protocol) !==
                canonicalJson(record.protocol)) ||
            (observerStream.atomic_previous_state_digest !== null &&
              observerStream.atomic_previous_state_digest !==
                record.previous_state_digest) ||
            (observerStream.preview !== null &&
              observerStream.atomic_protocol !== null &&
              observerStream.preview.expected_store_version + 1 !==
                observerStream.atomic_store_version)) {
          reject('transition_record_store_invalid');
        }
      }
    }
    return record;
  }

  for (const record of initialRecords) {
    const legacyRecord = exactKeys(record, [
      'transition_ref', 'request_digest', 'owner_digest', 'status', 'protocol'
    ]);
    const preAnchorOutboxRecord = exactKeys(record, [
      'transition_ref',
      'request_digest',
      'owner_digest',
      'status',
      'protocol',
      'observer_outbox'
    ]);
    const legacyDeliveredRecord = Object.hasOwn(
      record || {}, 'observer_delivered_events'
    ) && !Object.hasOwn(record || {}, 'observer_acknowledged_events') &&
      !Object.hasOwn(record || {}, 'observer_rejected_events');
    const normalized = legacyRecord || preAnchorOutboxRecord ||
      legacyDeliveredRecord
      ? {
        ...structuredClone(record),
        observer_outbox: (preAnchorOutboxRecord || legacyDeliveredRecord)
          ? (record.observer_outbox || []).map(entry =>
            normalizeLegacyObserverEntry(entry, 'pending')
          )
          : [],
        observer_acknowledged_events: legacyDeliveredRecord
          ? (record.observer_delivered_events || []).map(entry =>
            normalizeLegacyObserverEntry(entry, 'acknowledged')
          )
          : [],
        observer_rejected_events: [],
        previous_state_digest: legacyDeliveredRecord
          ? record.previous_state_digest
          : null
      }
      : structuredClone(record);
    delete normalized.observer_delivered_events;
    validateRecord(normalized);
    for (const entry of [
      ...normalized.observer_acknowledged_events,
      ...normalized.observer_outbox,
      ...normalized.observer_rejected_events
    ]) {
      if (initialObserverSequences.has(entry.sequence)) {
        reject('transition_record_store_invalid');
      }
      initialObserverSequences.add(entry.sequence);
      nextObserverSequence = Math.max(
        nextObserverSequence,
        entry.sequence + 1
      );
    }
    if (activeRecords.has(normalized.transition_ref) ||
        terminalArchive.has(normalized.transition_ref)) {
      reject('transition_record_store_invalid');
    }
    const target = normalized.status === 'reserved'
      ? activeRecords
      : terminalArchive;
    target.set(normalized.transition_ref, normalized);
  }
  if (activeRecords.size > maxActiveReservations) {
    reject('transition_record_store_invalid');
  }

  function createObserverOutboxEntry(ref, envelope, sequence) {
    if (!isPlainObject(envelope) ||
        envelope.component !==
          'governed_runtime_identity_transition_coordinator' ||
        !EVENT_NAME_PATTERN.test(envelope.event || '') ||
        envelope.transition_ref !== ref) {
      reject('transition_record_store_context_mismatch');
    }
    if (!isAllocatableObserverSequence(sequence)) {
      reject('transition_record_store_invalid');
    }
    const stored = structuredClone(envelope);
    return {
      sequence,
      event_digest: digestObject(stored),
      envelope: stored,
      durable_disposition: 'pending',
      attempt_metadata: {
        attempt_count: 0,
        last_attempt_outcome: 'never_attempted'
      }
    };
  }

  function reserve({
    transition_ref: ref,
    request_digest: requestDigest,
    owner_digest: ownerDigest,
    acceptance_event: acceptanceEvent
  } = {}) {
    if (!TRANSITION_REF_PATTERN.test(ref || '')) {
      reject('transition_record_store_invalid');
    }
    assertDigest(requestDigest, 'transition_record_store_invalid');
    assertDigest(ownerDigest, 'transition_record_store_invalid');
    if (activeRecords.has(ref) || terminalArchive.has(ref)) return false;
    if (activeRecords.size >= maxActiveReservations) {
      reject('transition_record_store_capacity_exceeded');
    }
    if (!isAllocatableObserverSequence(nextObserverSequence)) {
      reject('transition_record_store_invalid');
    }
    const acceptanceEntry = createObserverOutboxEntry(
      ref,
      acceptanceEvent,
      nextObserverSequence
    );
    const reservation = {
      transition_ref: ref,
      request_digest: requestDigest,
      owner_digest: ownerDigest,
      status: 'reserved',
      protocol: null,
      observer_outbox: [acceptanceEntry],
      observer_acknowledged_events: [],
      observer_rejected_events: [],
      previous_state_digest: null
    };
    validateRecord(reservation);
    activeRecords.set(ref, reservation);
    nextObserverSequence = acceptanceEntry.sequence + 1;
    return true;
  }

  function finalize({
    transition_ref: ref,
    request_digest: requestDigest,
    protocol,
    observer_events: observerEvents = []
  } = {}) {
    validateGovernedRuntimeIdentityTransitionProtocol(protocol);
    const current = activeRecords.get(ref) || terminalArchive.get(ref);
    if (!current || current.request_digest !== requestDigest ||
        protocol.request.transition_ref !== ref ||
        runtimeIdentityTransitionRequestDigest(protocol.request) !==
          requestDigest) {
      reject('transition_record_store_context_mismatch');
    }
    if (!Array.isArray(observerEvents)) {
      reject('transition_record_store_context_mismatch');
    }
    if (current.status === 'lost') {
      reject('transition_record_store_context_mismatch');
    }
    if (current.status === 'terminal') {
      return canonicalJson(current.protocol) === canonicalJson(protocol);
    }
    const candidate = structuredClone(current);
    let candidateNextObserverSequence = nextObserverSequence;
    for (const envelope of observerEvents) {
      const entry = createObserverOutboxEntry(
        ref,
        envelope,
        candidateNextObserverSequence
      );
      candidate.observer_outbox.push(entry);
      candidateNextObserverSequence = entry.sequence + 1;
    }
    const terminal = {
      transition_ref: ref,
      request_digest: requestDigest,
      owner_digest: current.owner_digest,
      status: 'terminal',
      protocol: structuredClone(protocol),
      observer_outbox: structuredClone(candidate.observer_outbox),
      observer_acknowledged_events: structuredClone(
        candidate.observer_acknowledged_events
      ),
      observer_rejected_events: structuredClone(
        candidate.observer_rejected_events
      ),
      previous_state_digest: current.previous_state_digest
    };
    validateRecord(terminal);
    activeRecords.delete(ref);
    terminalArchive.set(ref, terminal);
    nextObserverSequence = candidateNextObserverSequence;
    return true;
  }

  function get(ref) {
    if (!TRANSITION_REF_PATTERN.test(ref || '')) {
      reject('transition_record_store_invalid');
    }
    const record = activeRecords.get(ref) || terminalArchive.get(ref);
    return record ? deepFreeze(structuredClone(record)) : null;
  }

  function snapshot() {
    return deepFreeze(
      [...activeRecords.values(), ...terminalArchive.values()]
        .map(record => structuredClone(record))
    );
  }

  function enqueueObserverEvent({ transition_ref: ref, envelope } = {}) {
    const current = activeRecords.get(ref) || terminalArchive.get(ref);
    if (!current) {
      reject('transition_record_store_context_mismatch');
    }
    const nextEntry = createObserverOutboxEntry(
      ref,
      envelope,
      nextObserverSequence
    );
    const candidate = structuredClone(current);
    candidate.observer_outbox.push(structuredClone(nextEntry));
    validateRecord(candidate);
    current.observer_outbox.push(nextEntry);
    nextObserverSequence = nextEntry.sequence + 1;
    return true;
  }

  function pendingObserverEvents() {
    return deepFreeze(
      [...activeRecords.values(), ...terminalArchive.values()]
        .flatMap(record => record.observer_outbox.map(entry => ({
          transition_ref: record.transition_ref,
          ...structuredClone(entry)
        })))
        .sort((left, right) => left.sequence - right.sequence)
    );
  }

  function ackObserverEvent({ transition_ref: ref, event_digest: digest } = {}) {
    const current = activeRecords.get(ref) || terminalArchive.get(ref);
    const first = current?.observer_outbox?.[0];
    if (!first || first.event_digest !== digest) {
      if (current?.observer_acknowledged_events.some(
        acknowledged => acknowledged.event_digest === digest
      )) {
        return true;
      }
      reject('transition_record_store_context_mismatch');
    }
    if (first.attempt_metadata.last_attempt_outcome !==
        'observer_acknowledged') {
      reject('transition_record_store_context_mismatch');
    }
    const candidate = structuredClone(current);
    const acknowledged = candidate.observer_outbox.shift();
    acknowledged.durable_disposition = 'acknowledged';
    candidate.observer_acknowledged_events.push(acknowledged);
    if (first.envelope.event === 'transition_terminal_missing' &&
        candidate.status === 'reserved' &&
        candidate.observer_outbox.length === 0) {
      candidate.status = 'lost';
    }
    validateRecord(candidate);
    if (candidate.status === 'lost') {
      activeRecords.delete(ref);
      terminalArchive.set(ref, candidate);
    } else if (activeRecords.has(ref)) {
      activeRecords.set(ref, candidate);
    } else {
      terminalArchive.set(ref, candidate);
    }
    return true;
  }

  function recordObserverAttempt({
    transition_ref: ref,
    event_digest: digest,
    outcome
  } = {}) {
    if (!OBSERVER_ATTEMPT_OUTCOMES.includes(outcome) ||
        outcome === 'never_attempted') {
      reject('transition_record_store_context_mismatch');
    }
    const current = activeRecords.get(ref) || terminalArchive.get(ref);
    const first = current?.observer_outbox?.[0];
    if ((!first || first.event_digest !== digest) &&
        outcome === 'observer_acknowledged' &&
        current?.observer_acknowledged_events.some(
          acknowledged => acknowledged.event_digest === digest
        )) {
      return true;
    }
    if (!first || first.event_digest !== digest ||
        first.attempt_metadata.attempt_count >= Number.MAX_SAFE_INTEGER) {
      reject('transition_record_store_context_mismatch');
    }
    const candidate = structuredClone(current);
    candidate.observer_outbox[0].attempt_metadata = {
      attempt_count: first.attempt_metadata.attempt_count + 1,
      last_attempt_outcome: outcome
    };
    validateRecord(candidate);
    if (activeRecords.has(ref)) activeRecords.set(ref, candidate);
    else terminalArchive.set(ref, candidate);
    return true;
  }

  function rejectObserverEvent({ transition_ref: ref, event_digest: digest } = {}) {
    const current = activeRecords.get(ref) || terminalArchive.get(ref);
    const first = current?.observer_outbox?.[0];
    if (!first || first.event_digest !== digest ||
        first.envelope.event !== 'transition_accepted' ||
        first.attempt_metadata.last_attempt_outcome !==
          'observer_negative_ack') {
      reject('transition_record_store_context_mismatch');
    }
    const candidate = structuredClone(current);
    const rejectedEvent = candidate.observer_outbox.shift();
    rejectedEvent.durable_disposition = 'rejected_before_observation';
    candidate.observer_rejected_events.push(rejectedEvent);
    validateRecord(candidate);
    if (activeRecords.has(ref)) activeRecords.set(ref, candidate);
    else terminalArchive.set(ref, candidate);
    return true;
  }

  function restoreObserverDeliveryPrefixes() {
    let restored = 0;
    for (const record of [
      ...activeRecords.values(),
      ...terminalArchive.values()
    ]) {
      if (record.status === 'lost' ||
          record.observer_acknowledged_events.length === 0) {
        continue;
      }
      restored += record.observer_acknowledged_events.length;
      record.observer_outbox = [
        ...record.observer_acknowledged_events.map(pendingObserverEntry),
        ...record.observer_outbox
      ].sort((left, right) => left.sequence - right.sequence);
      record.observer_acknowledged_events = [];
      validateRecord(record);
    }
    return restored;
  }

  function setCommitContext({
    transition_ref: ref,
    previous_state_digest: previousStateDigest
  } = {}) {
    const current = activeRecords.get(ref);
    assertDigest(
      previousStateDigest,
      'transition_record_store_context_mismatch'
    );
    if (!current || current.status !== 'reserved' ||
        (current.previous_state_digest !== null &&
          current.previous_state_digest !== previousStateDigest)) {
      reject('transition_record_store_context_mismatch');
    }
    current.previous_state_digest = previousStateDigest;
    return true;
  }

  return Object.freeze({
    ackObserverEvent,
    enqueueObserverEvent,
    finalize,
    get,
    pendingObserverEvents,
    recordObserverAttempt,
    rejectObserverEvent,
    reserve,
    restoreObserverDeliveryPrefixes,
    setCommitContext,
    snapshot
  });
}

function stableControllerBinding(request, acceptedRuntime) {
  const base = {
    model: STABLE_CONTROLLER_BINDING_MODEL,
    authority_id: request.authority.authority_id,
    authority_lineage_digest: request.authority.authority_lineage_digest,
    accepted_runtime_identity_digest: acceptedRuntime.identity_digest,
    accepted_runtime_source_head: acceptedRuntime.source_head,
    accepted_runtime_manifest_digest: acceptedRuntime.manifest_digest
  };
  const binding = {
    ...base,
    binding_digest: digestObject(base)
  };
  validateControllerBinding(binding);
  return deepFreeze(binding);
}

function stableAuthorityMatches(state, request) {
  return state.controller_binding.model !== STABLE_CONTROLLER_BINDING_MODEL ||
    (state.controller_binding.authority_id === request.authority.authority_id &&
      state.controller_binding.authority_lineage_digest ===
        request.authority.authority_lineage_digest);
}

function lifecycleMatchesRequest(lifecycle, request) {
  return lifecycle.lifecycle_state === 'stopped' &&
    lifecycle.held_stopped === true &&
    lifecycle.running_component_count === 0 &&
    lifecycle.safe_stop_receipt_digest ===
      request.preconditions.safe_stop_receipt_digest;
}

function runtimeStoppedStatus(lifecycle) {
  if (!isPlainObject(lifecycle) ||
      !Number.isSafeInteger(lifecycle.running_component_count)) {
    return null;
  }
  return lifecycle.lifecycle_state === 'stopped' &&
    lifecycle.running_component_count === 0;
}

function successfulTransitionState(previousState, protocol) {
  validateGovernedRuntimeIdentityState(previousState);
  validateGovernedRuntimeIdentityTransitionProtocol(protocol);
  const request = protocol.request;
  if (protocol.terminal.outcome !== 'success' ||
      canonicalJson(request.from_runtime) !==
        canonicalJson(previousState.accepted_runtime) ||
      !lifecycleMatchesRequest(previousState.lifecycle, request) ||
      !stableAuthorityMatches(previousState, request) ||
      (previousState.controller_binding.model ===
        LEGACY_CONTROLLER_BINDING_MODEL
        ? !legacyEvidenceMatches(previousState, request)
        : request.legacy_transition_evidence !== null)) {
    reject('transition_store_last_transition_invalid');
  }
  const acceptedRuntime = createTransitionRuntimeIdentity({
    fromRuntime: previousState.accepted_runtime,
    toRuntime: request.to_runtime,
    transitionRef: request.transition_ref
  });
  const controllerBinding = stableControllerBinding(request, acceptedRuntime);
  const nextState = {
    schema_version: STORE_SCHEMA_VERSION,
    store_version: previousState.store_version + 1,
    accepted_runtime: structuredClone(acceptedRuntime),
    lifecycle: structuredClone(previousState.lifecycle),
    controller_binding: structuredClone(controllerBinding),
    legacy_migration: {
      consumed: previousState.controller_binding.model ===
        LEGACY_CONTROLLER_BINDING_MODEL
        ? true
        : previousState.legacy_migration.consumed,
      evidence_digest: previousState.controller_binding.model ===
        LEGACY_CONTROLLER_BINDING_MODEL
        ? digestObject(request.legacy_transition_evidence)
        : previousState.legacy_migration.evidence_digest
    },
    last_transition: {
      previous_state_digest: digestObject(previousState),
      transition_ref_digest: digestObject(request.transition_ref),
      protocol_digest: digestObject(protocol),
      terminal_digest: protocol.terminal.terminal_digest,
      protocol: structuredClone(protocol),
      side_effects: {
        runtime_started: false,
        repository_changed: false,
        resolver_called: false,
        search_called: false,
        provider_called: false,
        memory_called: false
      }
    }
  };
  validateGovernedRuntimeIdentityState(nextState);
  return nextState;
}

function durableSuccessorChainMatches(startState, targetState, records) {
  try {
    validateGovernedRuntimeIdentityState(startState);
    validateGovernedRuntimeIdentityState(targetState);
    if (!Array.isArray(records) ||
        targetState.store_version <= startState.store_version) {
      return false;
    }
    const successorsByPreviousDigest = new Map();
    function addSuccessor(previousStateDigest, protocol) {
      const candidates = successorsByPreviousDigest.get(
        previousStateDigest
      ) || [];
      if (!candidates.some(candidate =>
        canonicalJson(candidate.protocol) === canonicalJson(protocol)
      )) {
        candidates.push({ protocol });
      }
      successorsByPreviousDigest.set(previousStateDigest, candidates);
    }
    for (const record of records) {
      if (record.status !== 'terminal' ||
          record.protocol?.terminal.outcome !== 'success' ||
          !DIGEST_PATTERN.test(record.previous_state_digest || '')) {
        continue;
      }
      addSuccessor(record.previous_state_digest, record.protocol);
    }
    // The atomic target is authoritative and retains its complete canonical
    // last-transition protocol. Use that final edge when its secondary record
    // is still reserved after a crash between CAS and archive finalization.
    // An already archived identical edge is deduplicated; a conflicting edge
    // from the same predecessor remains an ambiguous fork and fails closed.
    if (targetState.last_transition !== null) {
      addSuccessor(
        targetState.last_transition.previous_state_digest,
        targetState.last_transition.protocol
      );
    }
    let cursor = structuredClone(startState);
    while (cursor.store_version < targetState.store_version) {
      const candidates = successorsByPreviousDigest.get(digestObject(cursor));
      if (!candidates || candidates.length !== 1) return false;
      cursor = successfulTransitionState(cursor, candidates[0].protocol);
    }
    return canonicalJson(cursor) === canonicalJson(targetState);
  } catch {
    return false;
  }
}

function fromRuntimeFailure(state, request) {
  const accepted = state.accepted_runtime;
  const from = request.from_runtime;
  if (accepted.profile_schema !== from.profile_schema) {
    return 'profile_schema_mismatch';
  }
  if (accepted.endpoint_identity !== from.endpoint_identity) {
    return 'endpoint_identity_mismatch';
  }
  if (accepted.manifest_digest !== from.manifest_digest ||
      accepted.source_head !== from.source_head) {
    return 'from_manifest_changed';
  }
  if (canonicalJson(accepted) !== canonicalJson(from)) {
    return 'from_identity_changed';
  }
  return null;
}

function legacyEvidenceMatches(state, request) {
  const evidence = request.legacy_transition_evidence;
  const binding = state.controller_binding;
  return evidence !== null &&
    state.legacy_migration.consumed === false &&
    evidence.safe_stop_receipt_digest ===
      state.lifecycle.safe_stop_receipt_digest &&
    evidence.accepted_runtime_identity_digest ===
      state.accepted_runtime.identity_digest &&
    evidence.accepted_runtime_lineage_digest ===
      state.accepted_runtime.lineage_digest &&
    evidence.accepted_runtime_manifest_digest ===
      state.accepted_runtime.manifest_digest &&
    evidence.current_controller_client_identity_digest ===
      binding.current_controller_client_identity_digest &&
    evidence.candidate_manifest_digest ===
      request.to_runtime.manifest_digest;
}

function candidateVerificationFailure(verification, request) {
  if (!isPlainObject(verification) || verification.verified !== true ||
      verification.complete !== true ||
      verification.source_head !== request.to_runtime.source_head ||
      verification.manifest_schema !== request.to_runtime.manifest_schema ||
      verification.manifest_digest !== request.to_runtime.manifest_digest ||
      verification.candidate_tree_digest !==
        request.to_runtime.candidate_tree_digest ||
      !isPlainObject(verification.protocol_versions)) {
    return 'candidate_manifest_invalid';
  }
  if (verification.scope_clean !== true) {
    return 'candidate_manifest_scope_dirty';
  }
  if (canonicalJson(verification.protocol_versions) !==
      canonicalJson(request.to_runtime.protocol_versions)) {
    return 'protocol_binding_invalid';
  }
  return null;
}

function normalizeCandidateVerification(verification) {
  if (!isPlainObject(verification)) return null;
  try {
    const normalized = {
      verified: verification.verified,
      complete: verification.complete,
      scope_clean: verification.scope_clean,
      source_head: verification.source_head,
      manifest_schema: verification.manifest_schema,
      manifest_digest: verification.manifest_digest,
      candidate_tree_digest: verification.candidate_tree_digest,
      protocol_versions: verification.protocol_versions
    };
    return JSON.parse(canonicalJson(normalized));
  } catch {
    return null;
  }
}

function commitCandidateRevalidationFailure(verification, request) {
  if (!isPlainObject(verification) ||
      typeof verification.verified !== 'boolean' ||
      typeof verification.complete !== 'boolean' ||
      typeof verification.scope_clean !== 'boolean' ||
      typeof verification.source_head !== 'string' ||
      !Number.isSafeInteger(verification.manifest_schema) ||
      typeof verification.manifest_digest !== 'string' ||
      typeof verification.candidate_tree_digest !== 'string' ||
      !isPlainObject(verification.protocol_versions)) {
    return 'candidate_revalidation_unavailable';
  }
  try {
    validateToRuntime({
      source_head: verification.source_head,
      manifest_schema: verification.manifest_schema,
      manifest_digest: verification.manifest_digest,
      profile_schema: request.to_runtime.profile_schema,
      endpoint_identity: request.to_runtime.endpoint_identity,
      protocol_versions: verification.protocol_versions,
      candidate_tree_digest: verification.candidate_tree_digest
    });
  } catch {
    return 'candidate_revalidation_unavailable';
  }
  if (verification.verified !== true || verification.complete !== true ||
      verification.source_head !== request.to_runtime.source_head ||
      verification.manifest_schema !== request.to_runtime.manifest_schema ||
      verification.manifest_digest !== request.to_runtime.manifest_digest ||
      verification.candidate_tree_digest !==
        request.to_runtime.candidate_tree_digest) {
    return 'candidate_manifest_changed_after_preview';
  }
  if (verification.scope_clean !== true) {
    return 'candidate_scope_changed_after_preview';
  }
  if (canonicalJson(verification.protocol_versions) !==
      canonicalJson(request.to_runtime.protocol_versions)) {
    return 'candidate_protocol_binding_changed_after_preview';
  }
  return null;
}

function createGovernedRuntimeIdentityTransitionCoordinator({
  store,
  authorityProofReplayStore,
  transitionRecordStore,
  coordinatorOwnerDigest,
  authorityVerifier,
  candidateManifestVerifier,
  clock = () => new Date(),
  eventSink,
  eventSinkMode = null
} = {}) {
  if (!store || typeof store.snapshot !== 'function' ||
      typeof store.compareAndSwap !== 'function') {
    reject('transition_coordinator_store_invalid');
  }
  if (!authorityProofReplayStore ||
      typeof authorityProofReplayStore.consume !== 'function') {
    reject('transition_coordinator_authority_proof_store_invalid');
  }
  assertDigest(
    coordinatorOwnerDigest,
    'transition_coordinator_owner_invalid'
  );
  if (!transitionRecordStore ||
      typeof transitionRecordStore.reserve !== 'function' ||
      typeof transitionRecordStore.finalize !== 'function' ||
      typeof transitionRecordStore.get !== 'function' ||
      typeof transitionRecordStore.enqueueObserverEvent !== 'function' ||
      typeof transitionRecordStore.pendingObserverEvents !== 'function' ||
      typeof transitionRecordStore.ackObserverEvent !== 'function' ||
      typeof transitionRecordStore.recordObserverAttempt !== 'function' ||
      typeof transitionRecordStore.rejectObserverEvent !== 'function' ||
      typeof transitionRecordStore.restoreObserverDeliveryPrefixes !==
        'function' ||
      typeof transitionRecordStore.setCommitContext !== 'function' ||
      typeof transitionRecordStore.snapshot !== 'function') {
    reject('transition_coordinator_record_store_invalid');
  }
  if (typeof authorityVerifier !== 'function') {
    reject('transition_coordinator_authority_verifier_invalid');
  }
  if (typeof candidateManifestVerifier !== 'function') {
    reject('transition_coordinator_manifest_verifier_invalid');
  }
  if (typeof clock !== 'function') reject('transition_coordinator_clock_invalid');
  if (eventSink !== undefined && typeof eventSink !== 'function') {
    reject('transition_coordinator_event_sink_invalid');
  }
  if (eventSink !== undefined &&
      (eventSinkMode !== 'synchronous_ack.v1' ||
        eventSink.constructor?.name === 'AsyncFunction')) {
    reject('transition_coordinator_event_sink_invalid');
  }

  const records = new Map();
  let eventDispatchDepth = 0;

  function recoverLastTransitionRecord() {
    const recoveryState = store.snapshot();
    validateGovernedRuntimeIdentityState(recoveryState);
    if (recoveryState.last_transition === null) return;
    const recoveryProtocol = recoveryState.last_transition.protocol;
    const recoveryRequest = recoveryProtocol.request;
    const recoveryRef = recoveryRequest.transition_ref;
    let recoveryRecord = transitionRecordStore.get(recoveryRef);
    if (recoveryRecord === null) {
      const reserved = transitionRecordStore.reserve({
        transition_ref: recoveryRef,
        request_digest:
          runtimeIdentityTransitionRequestDigest(recoveryRequest),
        owner_digest: coordinatorOwnerDigest,
        acceptance_event: observerEnvelope('transition_accepted', {
          request: recoveryRequest
        })
      });
      if (reserved !== true && reserved !== false) {
        reject('transition_record_store_recovery_failed');
      }
      recoveryRecord = transitionRecordStore.get(recoveryRef);
      if (recoveryRecord === null ||
          recoveryRecord.request_digest !==
            runtimeIdentityTransitionRequestDigest(recoveryRequest)) {
        reject('transition_record_store_recovery_failed');
      }
    }
    const recoveryPreviousStateDigest =
      recoveryState.last_transition.previous_state_digest;
    if (recoveryRecord.status === 'reserved') {
      if (recoveryRecord.previous_state_digest === null) {
        try {
          transitionRecordStore.setCommitContext({
            transition_ref: recoveryRef,
            previous_state_digest: recoveryPreviousStateDigest
          });
        } catch {
          const racedRecord = transitionRecordStore.get(recoveryRef);
          if (racedRecord?.status !== 'terminal' ||
              racedRecord.previous_state_digest !==
                recoveryPreviousStateDigest ||
              canonicalJson(racedRecord.protocol) !==
                canonicalJson(recoveryProtocol)) {
            reject('transition_record_store_recovery_failed');
          }
          recoveryRecord = racedRecord;
        }
        if (recoveryRecord.status !== 'terminal') {
          recoveryRecord = transitionRecordStore.get(recoveryRef);
        }
      }
    }
    if (recoveryRecord.previous_state_digest !==
        recoveryPreviousStateDigest) {
      reject('transition_record_store_recovery_failed');
    }
    const localRecord = records.get(recoveryRef);
    let recoveryEvents = [];
    if (localRecord?.status === 'prepared' &&
        (canonicalJson(localRecord.preview?.request) !==
          canonicalJson(recoveryRequest) ||
          localRecord.previous_state_digest !==
            recoveryRecord.previous_state_digest)) {
      reject('transition_record_store_recovery_failed');
    }
    if (recoveryRecord.previous_state_digest !== null) {
      const preparedReceiptIndex = recoveryProtocol.receipts.findIndex(
        receipt => receipt.stage === 'TRANSITION_PREPARED'
      );
      const preparedReceipts = recoveryProtocol.receipts.slice(
        0,
        preparedReceiptIndex + 1
      );
      const recoveryPreview = createRuntimeIdentityTransitionPreview({
        request: recoveryRequest,
        receipts: preparedReceipts,
        expectedStoreVersion: recoveryState.store_version - 1
      });
      const expectedEvents = [
        observerEnvelope('transition_accepted', {
          request: recoveryRequest
        }),
        ...preparedReceipts.map(receipt =>
          observerEnvelope('transition_receipt_appended', {
            transition_ref: recoveryRef,
            receipt
          })),
        observerEnvelope('transition_preview_formed', {
          transition_ref: recoveryRef,
          preview: recoveryPreview
        }),
        ...recoveryProtocol.receipts.slice(preparedReceiptIndex + 1)
          .map(receipt => observerEnvelope('transition_receipt_appended', {
            transition_ref: recoveryRef,
            receipt
          })),
        observerEnvelope('transition_atomic_commit', {
          transition_ref: recoveryRef,
          protocol: recoveryProtocol,
          accepted_runtime: recoveryState.accepted_runtime,
          controller_binding: recoveryState.controller_binding,
          store_version: recoveryState.store_version,
          previous_state_digest: recoveryRecord.previous_state_digest,
          state_digest: digestObject(recoveryState),
          state_projection: recoveryState
        }),
        observerEnvelope('transition_terminal_committed', {
          transition_ref: recoveryRef,
          terminal: recoveryProtocol.terminal
        })
      ];
      const knownEvents = [
        ...recoveryRecord.observer_acknowledged_events.map(
          entry => entry.envelope
        ),
        ...recoveryRecord.observer_outbox.map(entry => entry.envelope)
      ];
      recoveryEvents = expectedEvents.filter(
        envelope => !knownEvents.some(
          known => canonicalJson(known) === canonicalJson(envelope)
        )
      );
      if (recoveryEvents.some(
        envelope => envelope.event === 'transition_atomic_commit'
      ) && !DIGEST_PATTERN.test(recoveryRecord.previous_state_digest)) {
        reject('transition_record_store_recovery_failed');
      }
    }
    if (recoveryRecord.status === 'reserved') {
      let recovered;
      try {
        recovered = transitionRecordStore.finalize({
          transition_ref: recoveryRef,
          request_digest:
            runtimeIdentityTransitionRequestDigest(recoveryRequest),
          protocol: recoveryProtocol,
          observer_events: recoveryEvents
        });
      } catch {
        reject('transition_record_store_recovery_failed');
      }
      if (recovered !== true) {
        reject('transition_record_store_recovery_failed');
      }
    } else if (canonicalJson(recoveryRecord.protocol) !==
        canonicalJson(recoveryProtocol)) {
      reject('transition_record_store_recovery_failed');
    }
    if (localRecord?.status === 'prepared') {
      flushPendingObserverEvents();
      if (transitionRecordStore.pendingObserverEvents().some(
        event => event.transition_ref === recoveryRef
      )) {
        localRecord.status = 'terminal_delivery_pending';
        localRecord.preview = null;
        localRecord.protocol = recoveryProtocol;
      } else {
        records.delete(recoveryRef);
      }
    }
  }
  transitionRecordStore.restoreObserverDeliveryPrefixes();
  recoverLastTransitionRecord();
  flushPendingObserverEvents();

  function nowMs() {
    const value = clock();
    const milliseconds = value instanceof Date
      ? value.getTime()
      : new Date(value).getTime();
    if (!Number.isFinite(milliseconds)) reject('transition_coordinator_clock_invalid');
    return milliseconds;
  }

  function deliverObserverEvent(envelope) {
    let outcome;
    try {
      outcome = eventSink(envelope);
    } catch {
      return Object.freeze({ status: 'delivery_exception' });
    }
    if (outcome && typeof outcome.then === 'function') {
      Promise.resolve(outcome).catch(() => {});
      return Object.freeze({ status: 'delivery_exception' });
    }
    return Object.freeze({
      status: outcome === false
        ? 'observer_negative_ack'
        : 'observer_acknowledged'
    });
  }

  function releaseDeliveredTerminalRecords() {
    const pendingRefs = new Set(
      transitionRecordStore.pendingObserverEvents()
        .map(event => event.transition_ref)
    );
    for (const [transitionRef, record] of records) {
      if (record.status === 'terminal_delivery_pending' &&
          !pendingRefs.has(transitionRef)) {
        records.delete(transitionRef);
      }
    }
  }

  function flushPendingObserverEvents() {
    if (!eventSink) return Object.freeze({ status: 'complete' });
    eventDispatchDepth += 1;
    try {
      while (true) {
        const pending = transitionRecordStore.pendingObserverEvents();
        if (pending.length === 0) break;
        const next = pending[0];
        const delivery = deliverObserverEvent(next.envelope);
        try {
          transitionRecordStore.recordObserverAttempt({
            transition_ref: next.transition_ref,
            event_digest: next.event_digest,
            outcome: delivery.status
          });
        } catch {
          return Object.freeze({
            status: 'delivery_exception',
            transition_ref: next.transition_ref,
            event_digest: next.event_digest,
            event: next.envelope.event
          });
        }
        if (delivery.status !== 'observer_acknowledged') {
          return Object.freeze({
            ...delivery,
            transition_ref: next.transition_ref,
            event_digest: next.event_digest,
            event: next.envelope.event
          });
        }
        try {
          transitionRecordStore.ackObserverEvent({
            transition_ref: next.transition_ref,
            event_digest: next.event_digest
          });
        } catch {
          try {
            transitionRecordStore.recordObserverAttempt({
              transition_ref: next.transition_ref,
              event_digest: next.event_digest,
              outcome: 'delivery_exception'
            });
          } catch {}
          return Object.freeze({
            status: 'delivery_exception',
            transition_ref: next.transition_ref,
            event_digest: next.event_digest,
            event: next.envelope.event
          });
        }
      }
      releaseDeliveredTerminalRecords();
      return Object.freeze({ status: 'complete' });
    } finally {
      eventDispatchDepth -= 1;
    }
  }

  function observerEnvelope(event, payload = {}) {
    const transitionRef = payload.transition_ref ||
      payload.request?.transition_ref || payload.receipt?.transition_ref;
    return Object.freeze({
      component: 'governed_runtime_identity_transition_coordinator',
      event,
      transition_ref: transitionRef,
      ...structuredClone(payload)
    });
  }

  function emit(event, payload = {}) {
    const envelope = observerEnvelope(event, payload);
    transitionRecordStore.enqueueObserverEvent({
      transition_ref: envelope.transition_ref,
      envelope
    });
    if (!eventSink) return Object.freeze({ status: 'complete' });
    return flushPendingObserverEvents();
  }

  function guard(operation) {
    return (...args) => {
      if (eventDispatchDepth > 0) {
        reject('transition_coordinator_reentrant_mutation');
      }
      return operation(...args);
    };
  }

  function emitReceipt(receipt) {
    emit('transition_receipt_appended', {
      transition_ref: receipt.transition_ref,
      receipt
    });
  }

  function append(workingSet, stage, evidence, options = {}) {
    const next = appendRuntimeIdentityTransitionStage(workingSet, {
      stage,
      outcome: options.outcome || 'completed',
      evidenceStatus: options.evidenceStatus || 'verified',
      evidenceDigest: options.evidenceStatus === 'unknown'
        ? null
        : digestObject(evidence),
      reasonCode: options.reasonCode || null
    });
    if (options.emitEvent !== false) emitReceipt(next.receipts.at(-1));
    return next;
  }

  function terminalFailure(
    request,
    receipts,
    reasonCode,
    {
      runtimeStopped = null,
      storeRecord = true,
      emitTerminal = true
    } = {}
  ) {
    const terminal = createRuntimeIdentityTransitionTerminal({
      request,
      receipts,
      outcome: 'failure',
      reasonCode,
      runtimeStopped
    });
    const protocol = createGovernedRuntimeIdentityTransitionProtocol({
      request,
      receipts,
      terminal
    });
    const terminalEnvelope = emitTerminal
      ? observerEnvelope('transition_terminal_committed', {
        transition_ref: request.transition_ref,
        terminal
      })
      : null;
    if (storeRecord) {
      const finalized = transitionRecordStore.finalize({
        transition_ref: request.transition_ref,
        request_digest: runtimeIdentityTransitionRequestDigest(request),
        protocol,
        observer_events: terminalEnvelope ? [terminalEnvelope] : []
      });
      if (finalized !== true) {
        reject('transition_record_store_context_mismatch');
      }
      records.set(request.transition_ref, {
        status: 'terminal_delivery_pending',
        preview: null,
        protocol
      });
    }
    if (storeRecord) {
      flushPendingObserverEvents();
    } else if (emitTerminal) {
      emit('transition_terminal_committed', {
        transition_ref: request.transition_ref,
        terminal
      });
    }
    if (storeRecord && !transitionRecordStore.pendingObserverEvents().some(
      event => event.transition_ref === request.transition_ref
    )) {
      records.delete(request.transition_ref);
    }
    return deepFreeze({ status: 'terminal_failure', protocol });
  }

  function failedStage(workingSet, stage, reasonCode, evidence, {
    evidenceStatus = 'verified',
    runtimeStopped = null
  } = {}) {
    const failed = append(workingSet, stage, evidence, {
      outcome: 'failed',
      evidenceStatus,
      reasonCode
    });
    return terminalFailure(
      failed.request,
      failed.receipts,
      reasonCode,
      { runtimeStopped }
    );
  }

  function preview(request) {
    validateRuntimeIdentityTransitionRequest(request);
    // The atomic state is authoritative. Repair its secondary terminal index
    // before accepting another request so a later CAS cannot overwrite the
    // only crash-recovery anchor for the previous transition.
    recoverLastTransitionRecord();
    const currentMs = nowMs();
    const requestDigest = runtimeIdentityTransitionRequestDigest(request);
    if (Date.parse(request.request.created_at) > currentMs ||
        Date.parse(request.request.expires_at) <= currentMs) {
      return terminalFailure(request, [], 'transition_expired', {
        storeRecord: false,
        emitTerminal: false
      });
    }
    let persistedRecord;
    try {
      persistedRecord = transitionRecordStore.get(request.transition_ref);
    } catch {
      return terminalFailure(
        request,
        [],
        'transition_record_store_unavailable',
        { storeRecord: false, emitTerminal: false }
      );
    }
    if (records.has(request.transition_ref) || persistedRecord !== null) {
      return terminalFailure(request, [], 'transition_replayed', {
        storeRecord: false,
        emitTerminal: false
      });
    }
    const acceptanceEnvelope = observerEnvelope(
      'transition_accepted',
      { request }
    );
    let refReserved;
    try {
      refReserved = transitionRecordStore.reserve({
        transition_ref: request.transition_ref,
        request_digest: requestDigest,
        owner_digest: coordinatorOwnerDigest,
        acceptance_event: acceptanceEnvelope
      });
    } catch {
      return terminalFailure(request, [], 'transition_record_store_unavailable', {
        storeRecord: false,
        emitTerminal: false
      });
    }
    if (refReserved !== true) {
      return terminalFailure(request, [], 'transition_replayed', {
        storeRecord: false,
        emitTerminal: false
      });
    }
    const acceptanceDelivery = eventSink
      ? flushPendingObserverEvents()
      : { status: 'complete' };
    if (acceptanceDelivery.status !== 'complete') {
      const explicitlyRejected =
        acceptanceDelivery.status === 'observer_negative_ack' &&
        acceptanceDelivery.transition_ref === request.transition_ref &&
        acceptanceDelivery.event === 'transition_accepted';
      if (explicitlyRejected) {
        try {
          transitionRecordStore.rejectObserverEvent({
            transition_ref: request.transition_ref,
            event_digest: acceptanceDelivery.event_digest
          });
        } catch {
          return terminalFailure(
            request,
            [],
            'transition_record_store_unavailable',
            { runtimeStopped: null }
          );
        }
      }
      return terminalFailure(
        request,
        [],
        'transition_record_store_unavailable',
        {
          runtimeStopped: null,
          emitTerminal: !explicitlyRejected
        }
      );
    }
    let initial;
    try {
      initial = store.snapshot();
      validateGovernedRuntimeIdentityState(initial);
    } catch {
      return terminalFailure(
        request,
        [],
        'transition_record_store_unavailable',
        { runtimeStopped: null }
      );
    }
    let workingSet = { request, receipts: [] };
    workingSet = append(workingSet, 'CREATED', {
      request_digest: runtimeIdentityTransitionRequestDigest(request)
    });

    const authorityContextDigest =
      runtimeIdentityTransitionAuthorityContextDigest(request);
    let authority;
    let authorityUnavailable = false;
    try {
      authority = authorityVerifier({
        authority: structuredClone(request.authority),
        authority_context_digest: authorityContextDigest,
        request_digest: runtimeIdentityTransitionRequestDigest(request),
        transition_ref: request.transition_ref
      });
    } catch {
      authorityUnavailable = true;
    }
    if (authorityUnavailable) {
      return failedStage(
        workingSet,
        'AUTHORITY_VERIFIED',
        'authority_unverified',
        null,
        { evidenceStatus: 'unknown' }
      );
    }
    let authorityEvidence;
    let authorityStatus;
    try {
      if (!isPlainObject(authority)) throw new TypeError('invalid authority');
      authorityStatus = authority.status;
      if (authorityStatus !== 'unknown') {
        authorityEvidence = {
          verified: authority.verified,
          authority_id: authority.authority_id,
          authority_lineage_digest: authority.authority_lineage_digest,
          authority_context_digest: authority.authority_context_digest,
          authority_proof_digest: authority.authority_proof_digest
        };
        // Canonicalize the allowlisted projection before consuming the proof.
        digestObject(authorityEvidence);
      }
    } catch {
      return failedStage(
        workingSet,
        'AUTHORITY_VERIFIED',
        'authority_unverified',
        { authority_output_canonical: false }
      );
    }
    if (authorityStatus === 'unknown') {
      return failedStage(
        workingSet,
        'AUTHORITY_VERIFIED',
        'authority_unverified',
        null,
        { evidenceStatus: 'unknown' }
      );
    }
    if (authorityEvidence.verified !== true ||
        authorityEvidence.authority_id !== request.authority.authority_id) {
      return failedStage(
        workingSet,
        'AUTHORITY_VERIFIED',
        'authority_unverified',
        authorityEvidence
      );
    }
    if (authorityEvidence.authority_lineage_digest !==
        request.authority.authority_lineage_digest ||
        authorityEvidence.authority_context_digest !== authorityContextDigest ||
        authorityEvidence.authority_proof_digest !==
          request.authority.authority_proof_digest) {
      return failedStage(
        workingSet,
        'AUTHORITY_VERIFIED',
        'authority_lineage_mismatch',
        authorityEvidence
      );
    }
    if (!stableAuthorityMatches(initial, request)) {
      return failedStage(
        workingSet,
        'AUTHORITY_VERIFIED',
        'authority_lineage_mismatch',
        {
          authority_id_match: false,
          authority_lineage_match: false
        }
      );
    }
    let proofConsumed;
    try {
      proofConsumed = authorityProofReplayStore.consume({
        authority_proof_digest:
          request.authority.authority_proof_digest,
        authority_context_digest: authorityContextDigest,
        transition_ref: request.transition_ref
      });
    } catch {
      return failedStage(
        workingSet,
        'AUTHORITY_VERIFIED',
        'authority_unverified',
        null,
        { evidenceStatus: 'unknown' }
      );
    }
    if (proofConsumed === false) {
      return terminalFailure(
        request,
        workingSet.receipts,
        'transition_replayed'
      );
    }
    if (proofConsumed !== true) {
      return failedStage(
        workingSet,
        'AUTHORITY_VERIFIED',
        'authority_unverified',
        null,
        { evidenceStatus: 'unknown' }
      );
    }
    workingSet = append(workingSet, 'AUTHORITY_VERIFIED', authorityEvidence);

    let lifecycleReason = null;
    if (initial.lifecycle.lifecycle_state !== 'stopped' ||
        initial.lifecycle.running_component_count !== 0) {
      lifecycleReason = 'runtime_not_stopped';
    } else if (initial.lifecycle.held_stopped !== true) {
      lifecycleReason = 'runtime_not_held';
    } else if (initial.lifecycle.safe_stop_receipt_digest !==
        request.preconditions.safe_stop_receipt_digest) {
      lifecycleReason = 'safe_stop_receipt_invalid';
    }
    if (lifecycleReason) {
      return failedStage(
        workingSet,
        'SAFE_STOP_VERIFIED',
        lifecycleReason,
        initial.lifecycle,
        { runtimeStopped: runtimeStoppedStatus(initial.lifecycle) }
      );
    }
    workingSet = append(
      workingSet,
      'SAFE_STOP_VERIFIED',
      initial.lifecycle
    );

    const fromFailure = fromRuntimeFailure(initial, request);
    if (fromFailure) {
      return failedStage(
        workingSet,
        'FROM_IDENTITY_VERIFIED',
        fromFailure,
        {
          accepted_identity_digest:
            initial.accepted_runtime.identity_digest,
          accepted_manifest_digest:
            initial.accepted_runtime.manifest_digest
        },
        { runtimeStopped: true }
      );
    }
    if (initial.controller_binding.model === LEGACY_CONTROLLER_BINDING_MODEL) {
      if (!legacyEvidenceMatches(initial, request)) {
        return failedStage(
          workingSet,
          'FROM_IDENTITY_VERIFIED',
          initial.legacy_migration.consumed
            ? 'from_identity_changed'
            : 'from_identity_changed',
          { legacy_evidence_match: false },
          { runtimeStopped: true }
        );
      }
    } else if (request.legacy_transition_evidence !== null) {
      return failedStage(
        workingSet,
        'FROM_IDENTITY_VERIFIED',
        'from_identity_changed',
        { unexpected_legacy_evidence: true },
        { runtimeStopped: true }
      );
    }
    workingSet = append(workingSet, 'FROM_IDENTITY_VERIFIED', {
      accepted_runtime_identity_digest:
        initial.accepted_runtime.identity_digest,
      controller_binding_model: initial.controller_binding.model,
      legacy_migration_consumed: initial.legacy_migration.consumed
    });

    let candidate;
    try {
      candidate = normalizeCandidateVerification(candidateManifestVerifier({
        to_runtime: structuredClone(request.to_runtime),
        transition_ref: request.transition_ref,
        request_digest: runtimeIdentityTransitionRequestDigest(request)
      }));
    } catch {
      candidate = null;
    }
    const candidateFailure = candidateVerificationFailure(candidate, request);
    if (candidateFailure) {
      return failedStage(
        workingSet,
        'CANDIDATE_MANIFEST_VERIFIED',
        candidateFailure,
        candidate || { verified: false },
        { runtimeStopped: true }
      );
    }
    workingSet = append(
      workingSet,
      'CANDIDATE_MANIFEST_VERIFIED',
      candidate
    );
    workingSet = append(workingSet, 'TRANSITION_PREPARED', {
      request_digest: runtimeIdentityTransitionRequestDigest(request),
      expected_store_version: initial.store_version,
      candidate_manifest_digest: request.to_runtime.manifest_digest
    });
    const formed = createRuntimeIdentityTransitionPreview({
      request,
      receipts: workingSet.receipts,
      expectedStoreVersion: initial.store_version
    });
    records.set(request.transition_ref, {
      status: 'prepared',
      preview: formed,
      protocol: null,
      previous_state: null,
      previous_state_digest: null
    });
    emit('transition_preview_formed', {
      transition_ref: request.transition_ref,
      preview: formed
    });
    return deepFreeze({ status: 'prepared', preview: formed });
  }

  function casFailure(previewValue, reasonCode, evidence, options = {}) {
    let workingSet = {
      request: previewValue.request,
      receipts: previewValue.receipts
    };
    workingSet = append(
      workingSet,
      'TRANSITION_COMMITTED',
      evidence,
      {
        outcome: 'failed',
        evidenceStatus: options.evidenceStatus || 'verified',
        reasonCode
      }
    );
    return terminalFailure(
      previewValue.request,
      workingSet.receipts,
      reasonCode,
      {
        runtimeStopped: options.runtimeStopped ?? null
      }
    );
  }

  function commit(previewValue) {
    validateRuntimeIdentityTransitionPreview(previewValue);
    const record = records.get(previewValue.request.transition_ref);
    if (!record || record.status !== 'prepared' ||
        canonicalJson(record.preview) !== canonicalJson(previewValue)) {
      reject('transition_preview_context_invalid');
    }
    recoverLastTransitionRecord();
    const recoveredRecord = transitionRecordStore.get(
      previewValue.request.transition_ref
    );
    if (recoveredRecord?.status === 'terminal') {
      const recoveredState = store.snapshot();
      validateGovernedRuntimeIdentityState(recoveredState);
      let committedState = null;
      if (canonicalJson(recoveredState.last_transition?.protocol) ===
          canonicalJson(recoveredRecord.protocol)) {
        committedState = recoveredState;
      } else if (record.previous_state !== null &&
          digestObject(record.previous_state) ===
            recoveredRecord.previous_state_digest) {
        try {
          const candidateCommittedState = successfulTransitionState(
            record.previous_state,
            recoveredRecord.protocol
          );
          if (durableSuccessorChainMatches(
            candidateCommittedState,
            recoveredState,
            transitionRecordStore.snapshot()
          )) {
            committedState = candidateCommittedState;
          }
        } catch {}
      }
      if (recoveredRecord.protocol.terminal.outcome !== 'success' ||
          canonicalJson(recoveredRecord.protocol.request) !==
            canonicalJson(previewValue.request) ||
          committedState === null) {
        reject('transition_preview_context_invalid');
      }
      records.delete(previewValue.request.transition_ref);
      return deepFreeze({
        status: 'terminal_success',
        protocol: recoveredRecord.protocol,
        accepted_runtime: committedState.accepted_runtime,
        controller_binding: committedState.controller_binding,
        state_digest: digestObject(committedState)
      });
    }
    if (Date.parse(previewValue.request.request.expires_at) <= nowMs()) {
      return terminalFailure(
        previewValue.request,
        previewValue.receipts,
        'transition_expired',
        { runtimeStopped: null }
      );
    }
    const before = store.snapshot();
    validateGovernedRuntimeIdentityState(before);
    if (before.store_version !== previewValue.expected_store_version ||
        fromRuntimeFailure(before, previewValue.request) ||
        !stableAuthorityMatches(before, previewValue.request) ||
        !lifecycleMatchesRequest(before.lifecycle, previewValue.request)) {
      return casFailure(
        previewValue,
        'transition_cas_lost',
        {
          expected_store_version: previewValue.expected_store_version,
          observed_store_version: before.store_version
        },
        { runtimeStopped: runtimeStoppedStatus(before.lifecycle) }
      );
    }
    let candidate;
    try {
      candidate = normalizeCandidateVerification(candidateManifestVerifier({
        to_runtime: structuredClone(previewValue.request.to_runtime),
        transition_ref: previewValue.request.transition_ref,
        request_digest: previewValue.request_digest
      }));
    } catch {
      candidate = null;
    }
    const candidateFailure = commitCandidateRevalidationFailure(
      candidate,
      previewValue.request
    );
    if (candidateFailure) {
      return casFailure(
        previewValue,
        candidateFailure,
        candidateFailure === 'candidate_revalidation_unavailable'
          ? null
          : {
            candidate_revalidation: false,
            candidate_failure_reason: candidateFailure
          },
        {
          evidenceStatus: candidateFailure ===
            'candidate_revalidation_unavailable' ? 'unknown' : 'verified',
          runtimeStopped: true
        }
      );
    }

    const newRuntime = createTransitionRuntimeIdentity({
      fromRuntime: before.accepted_runtime,
      toRuntime: previewValue.request.to_runtime,
      transitionRef: previewValue.request.transition_ref
    });
    const controllerBinding = stableControllerBinding(
      previewValue.request,
      newRuntime
    );
    let workingSet = {
      request: previewValue.request,
      receipts: previewValue.receipts
    };
    workingSet = append(workingSet, 'TRANSITION_COMMITTED', {
      new_runtime_identity_digest: newRuntime.identity_digest,
      controller_binding_digest: controllerBinding.binding_digest,
      expected_store_version: before.store_version
    }, { emitEvent: false });
    workingSet = append(workingSet, 'POST_IDENTITY_VERIFIED', {
      new_runtime_identity_digest: newRuntime.identity_digest,
      controller_binding_digest: controllerBinding.binding_digest,
      lifecycle_state: before.lifecycle.lifecycle_state,
      held_stopped: before.lifecycle.held_stopped,
      running_component_count: before.lifecycle.running_component_count
    }, { emitEvent: false });
    const terminal = createRuntimeIdentityTransitionTerminal({
      request: previewValue.request,
      receipts: workingSet.receipts,
      outcome: 'success',
      newRuntimeIdentityDigest: newRuntime.identity_digest,
      controllerBindingDigest: controllerBinding.binding_digest,
      runtimeStopped: true
    });
    const protocol = createGovernedRuntimeIdentityTransitionProtocol({
      request: previewValue.request,
      receipts: workingSet.receipts,
      terminal
    });
    const nextState = successfulTransitionState(before, protocol);
    if (Date.parse(previewValue.request.request.expires_at) <= nowMs()) {
      return terminalFailure(
        previewValue.request,
        previewValue.receipts,
        'transition_expired',
        { runtimeStopped: true }
      );
    }
    record.previous_state = structuredClone(before);
    record.previous_state_digest = digestObject(before);
    transitionRecordStore.setCommitContext({
      transition_ref: previewValue.request.transition_ref,
      previous_state_digest: record.previous_state_digest
    });
    if (Date.parse(previewValue.request.request.expires_at) <= nowMs()) {
      return terminalFailure(
        previewValue.request,
        previewValue.receipts,
        'transition_expired',
        { runtimeStopped: true }
      );
    }

    let swapped;
    try {
      swapped = store.compareAndSwap(before.store_version, nextState);
    } catch {
      let afterFailure = null;
      try { afterFailure = store.snapshot(); } catch {}
      const committedDespiteLostAck = afterFailure &&
        (canonicalJson(afterFailure) === canonicalJson(nextState) ||
          durableSuccessorChainMatches(
            nextState,
            afterFailure,
            transitionRecordStore.snapshot()
          ));
      if (committedDespiteLostAck) {
        swapped = true;
      } else {
        const unchanged = afterFailure &&
          canonicalJson(afterFailure) === canonicalJson(before);
        return casFailure(
          previewValue,
          unchanged ? 'transition_cas_lost' : 'partial_transition_detected',
          unchanged
            ? { cas_exception_before_mutation: true }
            : { atomic_state_consistent: false },
          {
            evidenceStatus: afterFailure ? 'verified' : 'unknown',
            runtimeStopped: runtimeStoppedStatus(afterFailure?.lifecycle)
          }
        );
      }
    }
    if (swapped !== true) {
      return casFailure(
        previewValue,
        'transition_cas_lost',
        { compare_and_swap_won: false },
        { runtimeStopped: true }
      );
    }
    let after;
    try {
      after = store.snapshot();
    } catch {
      // A true CAS result is authoritative. Retry the readback so a transient
      // post-commit read failure cannot be converted into a contradictory
      // failure terminal. If the store stays unavailable, preserve the
      // prepared local record and durable atomic state for the retry recovery
      // path above.
      try {
        after = store.snapshot();
      } catch {
        reject('transition_post_commit_state_recovery_failed');
      }
    }
    const postMatches = canonicalJson(after) === canonicalJson(nextState) &&
      after.lifecycle.lifecycle_state === 'stopped' &&
      after.lifecycle.held_stopped === true &&
      after.lifecycle.running_component_count === 0 &&
      after.accepted_runtime.identity_digest === newRuntime.identity_digest &&
      after.controller_binding.accepted_runtime_identity_digest ===
        newRuntime.identity_digest;
    if (!postMatches) {
      const durableCommit = transitionRecordStore.get(
        previewValue.request.transition_ref
      );
      const legalSuccessor = durableSuccessorChainMatches(
        nextState,
        after,
        transitionRecordStore.snapshot()
      );
      if (durableCommit?.status === 'terminal' &&
          durableCommit.protocol.terminal.outcome === 'success' &&
          canonicalJson(durableCommit.protocol) === canonicalJson(protocol) &&
          legalSuccessor) {
        flushPendingObserverEvents();
        records.delete(previewValue.request.transition_ref);
        return deepFreeze({
          status: 'terminal_success',
          protocol: durableCommit.protocol,
          accepted_runtime: newRuntime,
          controller_binding: controllerBinding,
          state_digest: digestObject(nextState)
        });
      }
      return casFailure(
        previewValue,
        'partial_transition_detected',
        { atomic_state_consistent: false },
        {
          runtimeStopped: runtimeStoppedStatus(after.lifecycle)
        }
      );
    }
    let finalized;
    const observerEvents = [
      ...workingSet.receipts.slice(previewValue.receipts.length)
        .map(receipt => observerEnvelope('transition_receipt_appended', {
          transition_ref: previewValue.request.transition_ref,
          receipt
        })),
      observerEnvelope('transition_atomic_commit', {
        transition_ref: previewValue.request.transition_ref,
        protocol,
        accepted_runtime: newRuntime,
        controller_binding: controllerBinding,
        store_version: after.store_version,
        previous_state_digest: digestObject(before),
        state_digest: digestObject(after),
        state_projection: after
      }),
      observerEnvelope('transition_terminal_committed', {
        transition_ref: previewValue.request.transition_ref,
        terminal
      })
    ];
    try {
      finalized = transitionRecordStore.finalize({
        transition_ref: previewValue.request.transition_ref,
        request_digest: previewValue.request_digest,
        protocol,
        observer_events: observerEvents
      });
    } catch {
      reject('transition_record_store_recovery_failed');
    }
    if (finalized !== true) reject('transition_record_store_recovery_failed');
    record.status = 'terminal_delivery_pending';
    record.protocol = protocol;
    record.preview = null;
    flushPendingObserverEvents();
    if (!transitionRecordStore.pendingObserverEvents().some(
      event => event.transition_ref === previewValue.request.transition_ref
    )) {
      records.delete(previewValue.request.transition_ref);
    }
    return deepFreeze({
      status: 'terminal_success',
      protocol,
      accepted_runtime: newRuntime,
      controller_binding: controllerBinding,
      state_digest: digestObject(after)
    });
  }

  function reportCoordinatorLoss() {
    // A failed post-CAS readback can leave this owner's record reserved even
    // though the authoritative state already proves success. Recover that
    // terminal before classifying any reservation as coordinator loss; if the
    // state cannot be read or reconciled, fail closed without emitting a
    // contradictory missing-terminal event.
    recoverLastTransitionRecord();
    flushPendingObserverEvents();
    const pendingMissingRefs = new Set(
      transitionRecordStore.pendingObserverEvents()
        .filter(entry =>
          entry.envelope.event === 'transition_terminal_missing'
        )
        .map(entry => entry.transition_ref)
    );
    const missingRefs = new Set();
    for (const record of transitionRecordStore.snapshot()) {
      if (record.status === 'reserved' &&
          record.owner_digest === coordinatorOwnerDigest &&
          !pendingMissingRefs.has(record.transition_ref)) {
        missingRefs.add(record.transition_ref);
      }
    }
    for (const transitionRef of missingRefs) {
      emit('transition_terminal_missing', { transition_ref: transitionRef });
    }
    for (const [transitionRef, record] of records) {
      if (record.status === 'prepared' ||
          !transitionRecordStore.pendingObserverEvents().some(
            event => event.transition_ref === transitionRef
          )) {
        records.delete(transitionRef);
      }
    }
    return Object.freeze({
      active_transitions_lost: missingRefs.size,
      terminals_fabricated: 0
    });
  }

  function protocol(transitionRef) {
    if (eventDispatchDepth === 0) flushPendingObserverEvents();
    const record = records.get(transitionRef);
    const persisted = transitionRecordStore.get(transitionRef);
    let selected = record?.protocol || persisted?.protocol || null;
    if (selected === null) {
      const stateProtocol = store.snapshot().last_transition?.protocol;
      selected = stateProtocol?.request?.transition_ref === transitionRef
        ? stateProtocol
        : null;
    }
    if (!selected) reject('transition_terminal_missing');
    validateGovernedRuntimeIdentityTransitionProtocol(selected);
    return selected;
  }

  return Object.freeze({
    commit: guard(commit),
    preview: guard(preview),
    protocol,
    reportCoordinatorLoss: guard(reportCoordinatorLoss)
  });
}

module.exports = {
  DEFAULT_ACTIVE_TRANSITION_LIMIT,
  LEGACY_CONTROLLER_BINDING_MODEL,
  STABLE_CONTROLLER_BINDING_MODEL,
  STORE_SCHEMA_VERSION,
  createAuthorityProofReplayStore,
  createGovernedRuntimeIdentityStateStore,
  createGovernedRuntimeIdentityTransitionCoordinator,
  createTransitionRecordStore,
  stableControllerBinding,
  validateControllerBinding,
  validateGovernedRuntimeIdentityState
};
