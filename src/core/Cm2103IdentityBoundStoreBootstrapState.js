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
  TERMINAL_STATES,
  TRANSITIONS,
  summarizeCm2103BootstrapState,
  transitionCm2103BootstrapState
};
