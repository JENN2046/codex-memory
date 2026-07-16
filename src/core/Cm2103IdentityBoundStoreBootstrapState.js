'use strict';

const TERMINAL_STATES = Object.freeze([
  'CLAIM_REGISTRY_AMBIGUOUS',
  'CONSUMED_SUCCESS',
  'CONSUMED_PARTIAL_BOOTSTRAP',
  'CONSUMED_AMBIGUOUS'
]);

const TRANSITIONS = Object.freeze({
  UNCLAIMED: Object.freeze({ CLAIM: 'CLAIMED', CLAIM_AMBIGUOUS: 'CLAIM_REGISTRY_AMBIGUOUS' }),
  CLAIMED: Object.freeze({
    CLAIM_AMBIGUOUS: 'CLAIM_REGISTRY_AMBIGUOUS',
    CONSUME_DIRECTORY_CREATE: 'STORE_DIRECTORY_CREATE_CONSUMED'
  }),
  STORE_DIRECTORY_CREATE_CONSUMED: Object.freeze({
    DIRECTORY_CREATED: 'STORE_DIRECTORY_CREATED',
    DIRECTORY_CREATE_AMBIGUOUS: 'CONSUMED_AMBIGUOUS'
  }),
  STORE_DIRECTORY_CREATED: Object.freeze({
    CONSUME_IDENTITY_WRITE: 'IDENTITY_WRITE_CONSUMED',
    PARTIAL: 'CONSUMED_PARTIAL_BOOTSTRAP',
    AMBIGUOUS: 'CONSUMED_AMBIGUOUS'
  }),
  IDENTITY_WRITE_CONSUMED: Object.freeze({
    IDENTITY_CREATED: 'IDENTITY_CREATED',
    PARTIAL: 'CONSUMED_PARTIAL_BOOTSTRAP',
    AMBIGUOUS: 'CONSUMED_AMBIGUOUS'
  }),
  IDENTITY_CREATED: Object.freeze({
    CONSUME_READBACK: 'IDENTITY_READBACK_CONSUMED',
    PARTIAL: 'CONSUMED_PARTIAL_BOOTSTRAP',
    AMBIGUOUS: 'CONSUMED_AMBIGUOUS'
  }),
  IDENTITY_READBACK_CONSUMED: Object.freeze({
    READBACK_VERIFIED: 'CONSUMED_SUCCESS',
    PARTIAL: 'CONSUMED_PARTIAL_BOOTSTRAP',
    AMBIGUOUS: 'CONSUMED_AMBIGUOUS'
  })
});

const CLAIM_EFFECT_FIELDS = Object.freeze([
  'directoryCreateAttempts',
  'directoryCreates',
  'storeDirectoryCreated',
  'identityWriteAttempts',
  'identityWrites',
  'identityWriteAttempted',
  'identityCreated',
  'identityBytes',
  'identitySha256',
  'identityReadbackAttempts',
  'identityReadbackVerifications',
  'identityReadbackMatched'
]);

const IDENTITY_BYTES = 633;
const IDENTITY_SHA256 = '017307c9a1cb3e216895934b9c2aae8fa5773b909afebe87d3f91bc0a5736f57';

const ORIGINAL_OUTCOME_STATES = Object.freeze({
  identity_bound_store_bootstrap_completed: 'CONSUMED_SUCCESS',
  claim_envelope_persisted_but_acknowledgement_ambiguous: 'CLAIM_REGISTRY_AMBIGUOUS',
  claim_envelope_terminal_state_persistence_failed: 'CLAIM_REGISTRY_AMBIGUOUS',
  claim_envelope_persistence_unknown: 'CLAIM_REGISTRY_AMBIGUOUS',
  directory_attempt_state_persistence_failed: 'CLAIM_REGISTRY_AMBIGUOUS',
  directory_create_acknowledgement_ambiguous: 'CONSUMED_AMBIGUOUS',
  directory_state_persistence_failed: 'CONSUMED_AMBIGUOUS',
  identity_attempt_state_persistence_failed: 'CONSUMED_PARTIAL_BOOTSTRAP',
  identity_write_acknowledgement_ambiguous: 'CONSUMED_PARTIAL_BOOTSTRAP',
  identity_state_persistence_failed: 'CONSUMED_AMBIGUOUS',
  readback_attempt_state_persistence_failed: 'CONSUMED_AMBIGUOUS',
  identity_readback_failed: 'CONSUMED_AMBIGUOUS',
  identity_readback_mismatch: 'CONSUMED_PARTIAL_BOOTSTRAP',
  success_state_persistence_failed: 'CONSUMED_AMBIGUOUS'
});

const ORIGINAL_OUTCOME_EFFECTS = Object.freeze({
  identity_bound_store_bootstrap_completed: Object.freeze({
    directoryCreateAttempts: 1, directoryCreates: 1, storeDirectoryCreated: true,
    identityWriteAttempts: 1, identityWrites: 1, identityWriteAttempted: true,
    identityCreated: true, identityBytes: IDENTITY_BYTES, identitySha256: IDENTITY_SHA256,
    identityReadbackAttempts: 1, identityReadbackVerifications: 1, identityReadbackMatched: true
  }),
  claim_envelope_persisted_but_acknowledgement_ambiguous: Object.freeze({
    directoryCreateAttempts: 0, directoryCreates: 0, storeDirectoryCreated: false,
    identityWriteAttempts: 0, identityWrites: 0, identityWriteAttempted: false,
    identityCreated: false, identityBytes: 0, identitySha256: null,
    identityReadbackAttempts: 0, identityReadbackVerifications: 0, identityReadbackMatched: false
  }),
  claim_envelope_terminal_state_persistence_failed: Object.freeze({
    directoryCreateAttempts: 0, directoryCreates: 0, storeDirectoryCreated: false,
    identityWriteAttempts: 0, identityWrites: 0, identityWriteAttempted: false,
    identityCreated: false, identityBytes: 0, identitySha256: null,
    identityReadbackAttempts: 0, identityReadbackVerifications: 0, identityReadbackMatched: false
  }),
  claim_envelope_persistence_unknown: Object.freeze({
    directoryCreateAttempts: 0, directoryCreates: 0, storeDirectoryCreated: false,
    identityWriteAttempts: 0, identityWrites: 0, identityWriteAttempted: false,
    identityCreated: false, identityBytes: 0, identitySha256: null,
    identityReadbackAttempts: 0, identityReadbackVerifications: 0, identityReadbackMatched: false
  }),
  directory_attempt_state_persistence_failed: Object.freeze({
    directoryCreateAttempts: 0, directoryCreates: 0, storeDirectoryCreated: false,
    identityWriteAttempts: 0, identityWrites: 0, identityWriteAttempted: false,
    identityCreated: false, identityBytes: 0, identitySha256: null,
    identityReadbackAttempts: 0, identityReadbackVerifications: 0, identityReadbackMatched: false
  }),
  directory_create_acknowledgement_ambiguous: Object.freeze({
    directoryCreateAttempts: 1, directoryCreates: null, storeDirectoryCreated: null,
    identityWriteAttempts: 0, identityWrites: 0, identityWriteAttempted: false,
    identityCreated: false, identityBytes: 0, identitySha256: null,
    identityReadbackAttempts: 0, identityReadbackVerifications: 0, identityReadbackMatched: false
  }),
  directory_state_persistence_failed: Object.freeze({
    directoryCreateAttempts: 1, directoryCreates: 1, storeDirectoryCreated: true,
    identityWriteAttempts: 0, identityWrites: 0, identityWriteAttempted: false,
    identityCreated: false, identityBytes: 0, identitySha256: null,
    identityReadbackAttempts: 0, identityReadbackVerifications: 0, identityReadbackMatched: false
  }),
  identity_attempt_state_persistence_failed: Object.freeze({
    directoryCreateAttempts: 1, directoryCreates: 1, storeDirectoryCreated: true,
    identityWriteAttempts: 0, identityWrites: 0, identityWriteAttempted: false,
    identityCreated: false, identityBytes: 0, identitySha256: null,
    identityReadbackAttempts: 0, identityReadbackVerifications: 0, identityReadbackMatched: false
  }),
  identity_write_acknowledgement_ambiguous: Object.freeze({
    directoryCreateAttempts: 1, directoryCreates: 1, storeDirectoryCreated: true,
    identityWriteAttempts: 1, identityWrites: null, identityWriteAttempted: true,
    identityCreated: null, identityBytes: null, identitySha256: null,
    identityReadbackAttempts: 0, identityReadbackVerifications: 0, identityReadbackMatched: false
  }),
  identity_state_persistence_failed: Object.freeze({
    directoryCreateAttempts: 1, directoryCreates: 1, storeDirectoryCreated: true,
    identityWriteAttempts: 1, identityWrites: 1, identityWriteAttempted: true,
    identityCreated: true, identityBytes: IDENTITY_BYTES, identitySha256: IDENTITY_SHA256,
    identityReadbackAttempts: 0, identityReadbackVerifications: 0, identityReadbackMatched: false
  }),
  readback_attempt_state_persistence_failed: Object.freeze({
    directoryCreateAttempts: 1, directoryCreates: 1, storeDirectoryCreated: true,
    identityWriteAttempts: 1, identityWrites: 1, identityWriteAttempted: true,
    identityCreated: true, identityBytes: IDENTITY_BYTES, identitySha256: IDENTITY_SHA256,
    identityReadbackAttempts: 0, identityReadbackVerifications: 0, identityReadbackMatched: false
  }),
  identity_readback_failed: Object.freeze({
    directoryCreateAttempts: 1, directoryCreates: 1, storeDirectoryCreated: true,
    identityWriteAttempts: 1, identityWrites: 1, identityWriteAttempted: true,
    identityCreated: true, identityBytes: IDENTITY_BYTES, identitySha256: IDENTITY_SHA256,
    identityReadbackAttempts: 1, identityReadbackVerifications: 0, identityReadbackMatched: null
  }),
  identity_readback_mismatch: Object.freeze({
    directoryCreateAttempts: 1, directoryCreates: 1, storeDirectoryCreated: true,
    identityWriteAttempts: 1, identityWrites: 1, identityWriteAttempted: true,
    identityCreated: true, identityBytes: null, identitySha256: null,
    identityReadbackAttempts: 1, identityReadbackVerifications: 1, identityReadbackMatched: false
  }),
  success_state_persistence_failed: Object.freeze({
    directoryCreateAttempts: 1, directoryCreates: 1, storeDirectoryCreated: true,
    identityWriteAttempts: 1, identityWrites: 1, identityWriteAttempted: true,
    identityCreated: true, identityBytes: IDENTITY_BYTES, identitySha256: IDENTITY_SHA256,
    identityReadbackAttempts: 1, identityReadbackVerifications: 1, identityReadbackMatched: true
  })
});

const NONTERMINAL_REENTRY = Object.freeze({
  CLAIMED: Object.freeze({
    effectiveState: 'CLAIM_REGISTRY_AMBIGUOUS',
    outcomeStage: 'reentry_nonterminal_claimed',
    effects: ORIGINAL_OUTCOME_EFFECTS.claim_envelope_persisted_but_acknowledgement_ambiguous
  }),
  STORE_DIRECTORY_CREATE_CONSUMED: Object.freeze({
    effectiveState: 'CONSUMED_AMBIGUOUS',
    outcomeStage: 'reentry_nonterminal_store_directory_create_consumed',
    effects: ORIGINAL_OUTCOME_EFFECTS.directory_create_acknowledgement_ambiguous
  }),
  STORE_DIRECTORY_CREATED: Object.freeze({
    effectiveState: 'CONSUMED_PARTIAL_BOOTSTRAP',
    outcomeStage: 'reentry_nonterminal_store_directory_created',
    effects: ORIGINAL_OUTCOME_EFFECTS.directory_state_persistence_failed
  }),
  IDENTITY_WRITE_CONSUMED: Object.freeze({
    effectiveState: 'CONSUMED_PARTIAL_BOOTSTRAP',
    outcomeStage: 'reentry_nonterminal_identity_write_consumed',
    effects: ORIGINAL_OUTCOME_EFFECTS.identity_write_acknowledgement_ambiguous
  }),
  IDENTITY_CREATED: Object.freeze({
    effectiveState: 'CONSUMED_AMBIGUOUS',
    outcomeStage: 'reentry_nonterminal_identity_created',
    effects: ORIGINAL_OUTCOME_EFFECTS.identity_state_persistence_failed
  }),
  IDENTITY_READBACK_CONSUMED: Object.freeze({
    effectiveState: 'CONSUMED_AMBIGUOUS',
    outcomeStage: 'reentry_nonterminal_identity_readback_consumed',
    effects: ORIGINAL_OUTCOME_EFFECTS.identity_readback_failed
  })
});

const TERMINAL_REENTRY_OUTCOMES = Object.freeze({
  CLAIM_REGISTRY_AMBIGUOUS: 'reentry_existing_claim_registry_ambiguous',
  CONSUMED_SUCCESS: 'reentry_existing_consumed_success',
  CONSUMED_PARTIAL_BOOTSTRAP: 'reentry_existing_consumed_partial_bootstrap',
  CONSUMED_AMBIGUOUS: 'reentry_existing_consumed_ambiguous'
});

function effectsMatch(value, expected) {
  return CLAIM_EFFECT_FIELDS.every(field => value?.[field] === expected[field]);
}

function validOriginalTerminalEffects(value) {
  return Object.entries(ORIGINAL_OUTCOME_STATES).some(([stage, state]) =>
    state === value?.state && effectsMatch(value, ORIGINAL_OUTCOME_EFFECTS[stage]));
}

function transitionCm2103BootstrapState(state, event) {
  if (TERMINAL_STATES.includes(state)) throw new Error('cm2103_terminal_state_cannot_transition');
  const next = TRANSITIONS[state]?.[event];
  if (!next) throw new Error('cm2103_invalid_bootstrap_state_transition');
  return next;
}

function summarizeCm2103BootstrapState(state) {
  if (state === 'UNCLAIMED') return {
    state,
    terminal: false,
    authorizationConsumed: false,
    authorizationReplayAllowed: false,
    directoryCreateAttempted: false,
    directoryCreated: false,
    identityWriteAttempted: false,
    identityCreated: false,
    identityReadbackAttempted: false,
    identityReadbackVerified: false,
    automaticRetryAllowed: false,
    automaticCleanupAllowed: false,
    reconciliationRequired: false
  };
  if (state === 'CLAIM_REGISTRY_AMBIGUOUS') return {
    state,
    terminal: true,
    authorizationConsumed: true,
    authorizationReplayAllowed: false,
    directoryCreateAttempted: false,
    directoryCreated: false,
    identityWriteAttempted: false,
    identityCreated: false,
    identityReadbackAttempted: false,
    identityReadbackVerified: false,
    automaticRetryAllowed: false,
    automaticCleanupAllowed: false,
    reconciliationRequired: true
  };
  const genericAmbiguous = state === 'CONSUMED_AMBIGUOUS';
  const partial = state === 'CONSUMED_PARTIAL_BOOTSTRAP';
  return {
    state,
    terminal: TERMINAL_STATES.includes(state),
    authorizationConsumed: true,
    authorizationReplayAllowed: false,
    directoryCreateAttempted: !['CLAIMED'].includes(state),
    directoryCreated: genericAmbiguous ? null : !['CLAIMED', 'STORE_DIRECTORY_CREATE_CONSUMED'].includes(state),
    identityWriteAttempted: genericAmbiguous || partial
      ? null
      : ['IDENTITY_WRITE_CONSUMED', 'IDENTITY_CREATED', 'IDENTITY_READBACK_CONSUMED', 'CONSUMED_SUCCESS'].includes(state),
    identityCreated: genericAmbiguous || partial
      ? null
      : ['IDENTITY_CREATED', 'IDENTITY_READBACK_CONSUMED', 'CONSUMED_SUCCESS'].includes(state),
    identityReadbackAttempted: genericAmbiguous || partial
      ? null
      : ['IDENTITY_READBACK_CONSUMED', 'CONSUMED_SUCCESS'].includes(state),
    identityReadbackVerified: state === 'CONSUMED_SUCCESS',
    automaticRetryAllowed: false,
    automaticCleanupAllowed: false,
    reconciliationRequired: partial || genericAmbiguous
  };
}

module.exports = {
  CLAIM_EFFECT_FIELDS,
  NONTERMINAL_REENTRY,
  ORIGINAL_OUTCOME_EFFECTS,
  ORIGINAL_OUTCOME_STATES,
  TERMINAL_REENTRY_OUTCOMES,
  TERMINAL_STATES,
  TRANSITIONS,
  effectsMatch,
  summarizeCm2103BootstrapState,
  transitionCm2103BootstrapState,
  validOriginalTerminalEffects
};
