'use strict';

const {
  deepFreeze,
  isPlainObject
} = require('./canonical');
const { reject } = require('./errors');

const GOVERNED_SAFE_CODE_PATTERN = /^[a-z][a-z0-9_]{0,79}$/u;

function assertGovernedSafeCode(
  value,
  code = 'governed_failure_reason_invalid'
) {
  if (typeof value !== 'string' ||
      !GOVERNED_SAFE_CODE_PATTERN.test(value)) {
    reject(code);
  }
  return value;
}

function defineGovernedFailureRegistry(
  entries,
  {
    validateEntry,
    invalidRegistryCode = 'governed_failure_registry_invalid'
  } = {}
) {
  if (!isPlainObject(entries) || Object.keys(entries).length === 0 ||
      (validateEntry !== undefined && typeof validateEntry !== 'function')) {
    reject(invalidRegistryCode);
  }
  for (const [reasonCode, entry] of Object.entries(entries)) {
    assertGovernedSafeCode(reasonCode, invalidRegistryCode);
    if (!isPlainObject(entry)) reject(invalidRegistryCode);
    if (validateEntry) validateEntry(entry, reasonCode);
  }
  return deepFreeze(entries);
}

function governedFailureRegistryEntry(
  registry,
  reasonCode,
  {
    invalidReasonCode = 'governed_failure_reason_invalid',
    unknownReasonCode = 'governed_failure_reason_unknown'
  } = {}
) {
  if (!isPlainObject(registry)) reject(unknownReasonCode);
  assertGovernedSafeCode(reasonCode, invalidReasonCode);
  if (!Object.hasOwn(registry, reasonCode)) reject(unknownReasonCode);
  return registry[reasonCode];
}

module.exports = {
  GOVERNED_SAFE_CODE_PATTERN,
  assertGovernedSafeCode,
  defineGovernedFailureRegistry,
  governedFailureRegistryEntry
};
