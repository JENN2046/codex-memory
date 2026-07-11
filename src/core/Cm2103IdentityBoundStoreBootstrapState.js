'use strict';

const TERMINAL_STATES = Object.freeze([
  'CONSUMED_SUCCESS',
  'CONSUMED_PARTIAL_BOOTSTRAP',
  'CONSUMED_AMBIGUOUS'
]);

const TRANSITIONS = Object.freeze({
  UNCLAIMED: Object.freeze({ CLAIM: 'CLAIMED' }),
  CLAIMED: Object.freeze({ CONSUME_DIRECTORY_CREATE: 'STORE_DIRECTORY_CREATE_CONSUMED' }),
  STORE_DIRECTORY_CREATE_CONSUMED: Object.freeze({
    DIRECTORY_CREATED: 'STORE_DIRECTORY_CREATED',
    DIRECTORY_CREATE_AMBIGUOUS: 'CONSUMED_AMBIGUOUS'
  }),
  STORE_DIRECTORY_CREATED: Object.freeze({
    CONSUME_IDENTITY_WRITE: 'IDENTITY_WRITE_CONSUMED',
    PARTIAL: 'CONSUMED_PARTIAL_BOOTSTRAP'
  }),
  IDENTITY_WRITE_CONSUMED: Object.freeze({
    IDENTITY_CREATED: 'IDENTITY_CREATED',
    PARTIAL: 'CONSUMED_PARTIAL_BOOTSTRAP',
    AMBIGUOUS: 'CONSUMED_AMBIGUOUS'
  }),
  IDENTITY_CREATED: Object.freeze({
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
  const authorizationConsumed = state !== 'UNCLAIMED';
  const directoryCreateAttempted = !['UNCLAIMED', 'CLAIMED'].includes(state);
  const directoryCreatedKnown = [
    'STORE_DIRECTORY_CREATED',
    'IDENTITY_WRITE_CONSUMED',
    'IDENTITY_CREATED',
    'CONSUMED_SUCCESS',
    'CONSUMED_PARTIAL_BOOTSTRAP'
  ].includes(state);
  const identityWriteAttemptedKnown = [
    'IDENTITY_WRITE_CONSUMED',
    'IDENTITY_CREATED',
    'CONSUMED_SUCCESS',
    'CONSUMED_PARTIAL_BOOTSTRAP'
  ].includes(state);
  const identityCreatedKnown = ['IDENTITY_CREATED', 'CONSUMED_SUCCESS'].includes(state);
  const ambiguous = state === 'CONSUMED_AMBIGUOUS';
  return {
    state,
    terminal: TERMINAL_STATES.includes(state),
    authorizationConsumed,
    authorizationReplayAllowed: false,
    directoryCreateAttempted,
    directoryCreated: ambiguous ? null : directoryCreatedKnown,
    identityWriteAttempted: ambiguous ? null : identityWriteAttemptedKnown,
    identityCreated: ambiguous ? null : identityCreatedKnown,
    identityReadbackVerified: state === 'CONSUMED_SUCCESS',
    automaticRetryAllowed: false,
    automaticCleanupAllowed: false,
    reconciliationRequired: state === 'CONSUMED_PARTIAL_BOOTSTRAP' || state === 'CONSUMED_AMBIGUOUS'
  };
}

module.exports = {
  TERMINAL_STATES,
  TRANSITIONS,
  summarizeCm2103BootstrapState,
  transitionCm2103BootstrapState
};
