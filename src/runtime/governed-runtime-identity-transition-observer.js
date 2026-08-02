'use strict';

const {
  GOVERNED_RUNTIME_IDENTITY_TRANSITION_REF_PATTERN,
  canonicalJson,
  createGovernedRuntimeIdentityTransitionProtocol,
  createRuntimeIdentityTransitionPreview,
  createRuntimeIdentityTransitionTerminal,
  createTransitionRuntimeIdentity,
  digestObject,
  reject,
  validateGovernedRuntimeIdentityTransitionProtocol,
  validateRuntimeIdentity,
  validateRuntimeIdentityTransitionPreview,
  validateRuntimeIdentityTransitionReceipt,
  validateRuntimeIdentityTransitionRequest,
  validateRuntimeIdentityTransitionTerminal
} = require('../../packages/chatgpt-r4-contracts');
const {
  stableControllerBinding,
  validateControllerBinding,
  validateGovernedRuntimeIdentityState
} = require('./governed-runtime-identity-transition');

const SAFE_CODE = /^[a-z][a-z0-9_]{0,79}$/u;
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;

function createGovernedRuntimeIdentityTransitionObserver({
  maxRetainedTransitions = 256,
  initialTerminalReplayMarkers = [],
  initialAuthoritativeState = null
} = {}) {
  if (!Number.isInteger(maxRetainedTransitions) ||
      maxRetainedTransitions < 1 || maxRetainedTransitions > 4096 ||
      !Array.isArray(initialTerminalReplayMarkers)) {
    reject('transition_observer_capacity_invalid');
  }
  const transitions = new Map();
  const terminalHistory = new Map();
  const terminalReplayMarkers = new Set();
  const acknowledgedEventDigests = new Set();
  for (const transitionRef of initialTerminalReplayMarkers) {
    if (!GOVERNED_RUNTIME_IDENTITY_TRANSITION_REF_PATTERN.test(
      transitionRef || ''
    ) || terminalReplayMarkers.has(transitionRef)) {
      reject('transition_observer_replay_markers_invalid');
    }
    terminalReplayMarkers.add(transitionRef);
  }
  let lastAuthoritativeCommit = null;
  let initialAuthoritativeAnchor = null;
  let historicalReplayCommit = null;
  const historicalReplayRefs = [];
  if (initialAuthoritativeState !== null) {
    validateGovernedRuntimeIdentityState(initialAuthoritativeState);
    lastAuthoritativeCommit = {
      accepted_runtime: structuredClone(
        initialAuthoritativeState.accepted_runtime
      ),
      controller_binding: structuredClone(
        initialAuthoritativeState.controller_binding
      ),
      lifecycle: structuredClone(initialAuthoritativeState.lifecycle),
      legacy_migration: structuredClone(
        initialAuthoritativeState.legacy_migration
      ),
      store_version: initialAuthoritativeState.store_version,
      state_digest: digestObject(initialAuthoritativeState)
    };
    initialAuthoritativeAnchor = {
      ...structuredClone(lastAuthoritativeCommit),
      previous_state_digest:
        initialAuthoritativeState.last_transition?.previous_state_digest ??
          null,
      from_runtime: structuredClone(
        initialAuthoritativeState.last_transition?.protocol?.request
          ?.from_runtime ?? null
      )
    };
    const lastTransitionRef =
      initialAuthoritativeState.last_transition?.protocol?.request
        ?.transition_ref;
    if (lastTransitionRef) {
      terminalReplayMarkers.add(lastTransitionRef);
      const protocol = initialAuthoritativeState.last_transition.protocol;
      const preparedReceiptIndex = protocol.receipts.findIndex(
        receipt => receipt.stage === 'TRANSITION_PREPARED'
      );
      const preparedReceipts = protocol.receipts.slice(
        0,
        preparedReceiptIndex + 1
      );
      const preview = createRuntimeIdentityTransitionPreview({
        request: protocol.request,
        receipts: preparedReceipts,
        expectedStoreVersion: initialAuthoritativeState.store_version - 1
      });
      const canonicalEvents = [
        {
          component: 'governed_runtime_identity_transition_coordinator',
          event: 'transition_accepted',
          transition_ref: lastTransitionRef,
          request: structuredClone(protocol.request)
        },
        ...preparedReceipts.map(receipt => ({
          component: 'governed_runtime_identity_transition_coordinator',
          event: 'transition_receipt_appended',
          transition_ref: lastTransitionRef,
          receipt: structuredClone(receipt)
        })),
        {
          component: 'governed_runtime_identity_transition_coordinator',
          event: 'transition_preview_formed',
          transition_ref: lastTransitionRef,
          preview: structuredClone(preview)
        },
        ...protocol.receipts.slice(preparedReceiptIndex + 1).map(receipt => ({
          component: 'governed_runtime_identity_transition_coordinator',
          event: 'transition_receipt_appended',
          transition_ref: lastTransitionRef,
          receipt: structuredClone(receipt)
        })),
        {
          component: 'governed_runtime_identity_transition_coordinator',
          event: 'transition_atomic_commit',
          transition_ref: lastTransitionRef,
          protocol: structuredClone(protocol),
          accepted_runtime: structuredClone(
            initialAuthoritativeState.accepted_runtime
          ),
          controller_binding: structuredClone(
            initialAuthoritativeState.controller_binding
          ),
          store_version: initialAuthoritativeState.store_version,
          previous_state_digest:
            initialAuthoritativeState.last_transition.previous_state_digest,
          state_digest: digestObject(initialAuthoritativeState),
          state_projection: structuredClone(initialAuthoritativeState)
        },
        {
          component: 'governed_runtime_identity_transition_coordinator',
          event: 'transition_terminal_committed',
          transition_ref: lastTransitionRef,
          terminal: structuredClone(protocol.terminal)
        }
      ];
      for (const event of canonicalEvents) {
        acknowledgedEventDigests.add(digestObject(event));
      }
    }
  }
  const counters = {
    transitions_accepted: 0,
    receipts_accepted: 0,
    atomic_commits_verified: 0,
    terminal_successes: 0,
    terminal_failures: 0,
    terminals_missing: 0,
    protocol_violations: 0,
    fatal_inconsistencies: 0,
    unknown_evidence_receipts: 0
  };
  let lastViolationCode = null;

  function violation(code) {
    counters.protocol_violations += 1;
    lastViolationCode = typeof code === 'string' && SAFE_CODE.test(code)
      ? code
      : 'transition_observer_protocol_invalid';
    return false;
  }

  function retainTerminal(transitionRef, record) {
    transitions.delete(transitionRef);
    terminalReplayMarkers.add(transitionRef);
    terminalHistory.set(transitionRef, record);
    while (terminalHistory.size > maxRetainedTransitions) {
      terminalHistory.delete(terminalHistory.keys().next().value);
    }
  }

  function retainVerifiedTerminal(transitionRef, record) {
    if (record.terminal.outcome === 'success') {
      counters.terminal_successes += 1;
    } else {
      counters.terminal_failures += 1;
    }
    if (record.terminal.fatal_inconsistency) {
      counters.fatal_inconsistencies += 1;
    }
    retainTerminal(transitionRef, record);
  }

  function observeOnce(event) {
    if (!event || typeof event !== 'object' || Array.isArray(event) ||
        event.component !==
          'governed_runtime_identity_transition_coordinator') {
      return false;
    }
    try {
      if (event.event === 'transition_accepted') {
        validateRuntimeIdentityTransitionRequest(event.request);
        if (transitions.has(event.request.transition_ref) ||
            terminalReplayMarkers.has(event.request.transition_ref)) {
          return violation('transition_observer_duplicate_accept');
        }
        if (transitions.size >= maxRetainedTransitions) {
          return violation('transition_observer_capacity_exceeded');
        }
        transitions.set(event.request.transition_ref, {
          request: structuredClone(event.request),
          receipts: [],
          terminal: null,
          atomic_commit: null,
          atomic_verified: false,
          historical_replay: false,
          missing: false
        });
        counters.transitions_accepted += 1;
        return true;
      }
      if (event.event === 'transition_receipt_appended') {
        const record = transitions.get(event.transition_ref);
        if (!record || record.terminal || record.missing) {
          return violation('transition_observer_receipt_without_active_transition');
        }
        validateRuntimeIdentityTransitionReceipt(event.receipt, {
          request: record.request,
          receipts: record.receipts
        });
        record.receipts.push(structuredClone(event.receipt));
        counters.receipts_accepted += 1;
        if (event.receipt.evidence_status === 'unknown') {
          counters.unknown_evidence_receipts += 1;
        }
        return true;
      }
      if (event.event === 'transition_atomic_commit') {
        const record = transitions.get(event.transition_ref);
        if (!record || record.terminal || record.missing ||
            record.atomic_commit) {
          return violation('transition_observer_atomic_commit_invalid');
        }
        validateGovernedRuntimeIdentityTransitionProtocol(event.protocol);
        validateRuntimeIdentity(event.accepted_runtime);
        validateControllerBinding(event.controller_binding);
        validateGovernedRuntimeIdentityState(event.state_projection);
        const derivedRuntime = createTransitionRuntimeIdentity({
          fromRuntime: record.request.from_runtime,
          toRuntime: record.request.to_runtime,
          transitionRef: record.request.transition_ref
        });
        const derivedBinding = stableControllerBinding(
          record.request,
          derivedRuntime
        );
        const historicalReplay = initialAuthoritativeAnchor !== null &&
          event.store_version < initialAuthoritativeAnchor.store_version;
        const chainAnchor = historicalReplay
          ? historicalReplayCommit
          : lastAuthoritativeCommit;
        const closesHistoricalPrefix = historicalReplay &&
          event.store_version ===
            initialAuthoritativeAnchor.store_version - 1;
        if (event.protocol.terminal.outcome !== 'success' ||
            canonicalJson(event.protocol.request) !==
              canonicalJson(record.request) ||
            canonicalJson(event.protocol.receipts) !==
              canonicalJson(record.receipts) ||
            canonicalJson(event.accepted_runtime) !==
              canonicalJson(derivedRuntime) ||
            canonicalJson(event.controller_binding) !==
              canonicalJson(derivedBinding) ||
            event.protocol.terminal.new_runtime_identity_digest !==
              event.accepted_runtime.identity_digest ||
            event.protocol.terminal.controller_binding_digest !==
              event.controller_binding.binding_digest ||
            event.controller_binding.accepted_runtime_identity_digest !==
              event.accepted_runtime.identity_digest ||
            !Number.isSafeInteger(event.store_version) ||
            event.store_version < 1 ||
            (chainAnchor !== null &&
              (event.store_version !==
                chainAnchor.store_version + 1 ||
                event.previous_state_digest !==
                  chainAnchor.state_digest ||
                canonicalJson(record.request.from_runtime) !== canonicalJson(
                  chainAnchor.accepted_runtime
                ) ||
                canonicalJson(event.state_projection.lifecycle) !==
                  canonicalJson(chainAnchor.lifecycle) ||
                (chainAnchor.controller_binding.model ===
                  'stable_controller_authority.v1' &&
                  (record.request.authority.authority_id !==
                    chainAnchor.controller_binding.authority_id ||
                    record.request.authority.authority_lineage_digest !==
                      chainAnchor.controller_binding
                        .authority_lineage_digest)))) ||
            (historicalReplay &&
              (canonicalJson(event.state_projection.lifecycle) !==
                canonicalJson(initialAuthoritativeAnchor.lifecycle) ||
                canonicalJson(event.state_projection.legacy_migration) !==
                  canonicalJson(
                    initialAuthoritativeAnchor.legacy_migration
                  ) ||
                (initialAuthoritativeAnchor.controller_binding.model ===
                  'stable_controller_authority.v1' &&
                  (event.controller_binding.authority_id !==
                    initialAuthoritativeAnchor.controller_binding.authority_id ||
                    event.controller_binding.authority_lineage_digest !==
                      initialAuthoritativeAnchor.controller_binding
                        .authority_lineage_digest)) ||
                (closesHistoricalPrefix &&
                  (event.state_digest !==
                    initialAuthoritativeAnchor.previous_state_digest ||
                    canonicalJson(event.accepted_runtime) !== canonicalJson(
                      initialAuthoritativeAnchor.from_runtime
                    ))))) ||
            event.state_projection.store_version !== event.store_version ||
            canonicalJson(event.state_projection.accepted_runtime) !==
              canonicalJson(event.accepted_runtime) ||
            canonicalJson(event.state_projection.controller_binding) !==
              canonicalJson(event.controller_binding) ||
            canonicalJson(event.state_projection.last_transition?.protocol) !==
              canonicalJson(event.protocol) ||
            event.state_projection.last_transition?.previous_state_digest !==
              event.previous_state_digest ||
            event.state_projection.lifecycle.lifecycle_state !== 'stopped' ||
            event.state_projection.lifecycle.held_stopped !== true ||
            event.state_projection.lifecycle.running_component_count !== 0 ||
            event.state_projection.lifecycle.safe_stop_receipt_digest !==
              record.request.preconditions.safe_stop_receipt_digest ||
            (record.request.legacy_transition_evidence !== null &&
              (event.state_projection.legacy_migration.consumed !== true ||
                event.state_projection.legacy_migration.evidence_digest !==
                  digestObject(
                    record.request.legacy_transition_evidence
                  ))) ||
            (chainAnchor !== null &&
              record.request.legacy_transition_evidence === null &&
              canonicalJson(event.state_projection.legacy_migration) !==
                canonicalJson(chainAnchor.legacy_migration)) ||
            !DIGEST_PATTERN.test(event.state_digest || '') ||
            digestObject(event.state_projection) !== event.state_digest) {
          return violation('transition_observer_atomic_commit_invalid');
        }
        record.atomic_commit = {
          accepted_runtime: structuredClone(event.accepted_runtime),
          controller_binding: structuredClone(event.controller_binding),
          lifecycle: structuredClone(event.state_projection.lifecycle),
          protocol: structuredClone(event.protocol),
          store_version: event.store_version,
          state_digest: event.state_digest
        };
        record.historical_replay = historicalReplay;
        const verifiedCommit = {
          accepted_runtime: structuredClone(event.accepted_runtime),
          controller_binding: structuredClone(event.controller_binding),
          lifecycle: structuredClone(event.state_projection.lifecycle),
          legacy_migration: structuredClone(
            event.state_projection.legacy_migration
          ),
          store_version: event.store_version,
          state_digest: event.state_digest
        };
        if (historicalReplay) {
          historicalReplayCommit = verifiedCommit;
          historicalReplayRefs.push(event.transition_ref);
          if (closesHistoricalPrefix) {
            for (const transitionRef of historicalReplayRefs) {
              const historicalRecord = transitions.get(transitionRef);
              if (!historicalRecord || historicalRecord.atomic_verified) {
                continue;
              }
              historicalRecord.atomic_verified = true;
              counters.atomic_commits_verified += 1;
              if (historicalRecord.terminal) {
                retainVerifiedTerminal(transitionRef, historicalRecord);
              }
            }
          }
        } else {
          lastAuthoritativeCommit = verifiedCommit;
          record.atomic_verified = true;
          counters.atomic_commits_verified += 1;
        }
        return true;
      }
      if (event.event === 'transition_terminal_committed') {
        const record = transitions.get(event.transition_ref);
        if (!record || record.terminal || record.missing) {
          return violation('transition_observer_terminal_without_active_transition');
        }
        validateRuntimeIdentityTransitionTerminal(event.terminal, {
          request: record.request,
          receipts: record.receipts
        });
        const independentlyDerived = createRuntimeIdentityTransitionTerminal({
          request: record.request,
          receipts: record.receipts,
          outcome: event.terminal.outcome,
          reasonCode: event.terminal.reason_code,
          newRuntimeIdentityDigest:
            event.terminal.new_runtime_identity_digest,
          controllerBindingDigest:
            event.terminal.controller_binding_digest,
          runtimeStopped: event.terminal.runtime_stopped
        });
        if (canonicalJson(independentlyDerived) !==
            canonicalJson(event.terminal) ||
            (event.terminal.outcome === 'success' && !record.atomic_commit) ||
            (record.atomic_commit &&
              (event.terminal.outcome !== 'success' ||
                canonicalJson(event.terminal) !== canonicalJson(
                  record.atomic_commit.protocol.terminal
                )))) {
          return violation('transition_observer_terminal_reconciliation_invalid');
        }
        record.terminal = structuredClone(event.terminal);
        if (record.historical_replay && !record.atomic_verified) {
          return true;
        }
        retainVerifiedTerminal(event.transition_ref, record);
        return true;
      }
      if (event.event === 'transition_terminal_missing') {
        const record = transitions.get(event.transition_ref);
        if (!record || record.terminal || record.missing) {
          return violation('transition_observer_terminal_missing_invalid');
        }
        record.missing = true;
        counters.terminals_missing += 1;
        retainTerminal(event.transition_ref, record);
        violation('terminal_missing');
        return true;
      }
      if (event.event === 'transition_preview_formed') {
        const record = transitions.get(event.transition_ref);
        if (!record || record.terminal || record.missing) {
          return violation('transition_observer_preview_invalid');
        }
        validateRuntimeIdentityTransitionPreview(event.preview);
        if (canonicalJson(event.preview.request) !==
              canonicalJson(record.request) ||
            canonicalJson(event.preview.receipts) !==
              canonicalJson(record.receipts)) {
          return violation('transition_observer_preview_invalid');
        }
        return true;
      }
      return false;
    } catch (error) {
      return violation(error?.code);
    }
  }

  function observe(event) {
    let eventDigest;
    try {
      eventDigest = digestObject(event);
    } catch {
      return false;
    }
    if (acknowledgedEventDigests.has(eventDigest)) return true;
    const accepted = observeOnce(event);
    if (accepted === true) acknowledgedEventDigests.add(eventDigest);
    return accepted;
  }

  function reconcile(transitionRef) {
    const record = transitions.get(transitionRef) ||
      terminalHistory.get(transitionRef);
    if (!record || record.missing || !record.terminal ||
        (record.historical_replay && !record.atomic_verified)) {
      reject('transition_terminal_missing');
    }
    const protocol = createGovernedRuntimeIdentityTransitionProtocol({
      request: record.request,
      receipts: record.receipts,
      terminal: record.terminal
    });
    validateGovernedRuntimeIdentityTransitionProtocol(protocol);
    return protocol;
  }

  function snapshot() {
    return Object.freeze({
      schema_version: 1,
      component: 'governed_runtime_identity_transition_observer',
      ...counters,
      active_transitions: transitions.size,
      retained_terminals: terminalHistory.size,
      terminal_replay_markers: terminalReplayMarkers.size,
      last_authoritative_store_version:
        lastAuthoritativeCommit?.store_version ?? null,
      last_authoritative_state_digest:
        lastAuthoritativeCommit?.state_digest ?? null,
      last_accepted_runtime_identity_digest:
        lastAuthoritativeCommit?.accepted_runtime.identity_digest ?? null,
      last_violation_code: lastViolationCode,
      terminals_fabricated: 0,
      runtime_started: false,
      repository_changed: false,
      resolver_called: false,
      search_called: false,
      provider_called: false,
      memory_called: false,
      raw_paths_retained: false,
      secret_values_retained: false
    });
  }

  function replayMarkers() {
    return Object.freeze([...terminalReplayMarkers]);
  }

  return Object.freeze({ observe, reconcile, replayMarkers, snapshot });
}

module.exports = {
  createGovernedRuntimeIdentityTransitionObserver
};
