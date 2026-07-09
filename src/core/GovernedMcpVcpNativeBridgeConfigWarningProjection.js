'use strict';

const ALLOWED_GOVERNED_NATIVE_BRIDGE_WARNING_CODES = Object.freeze([
  'native_read_delegation_requires_bridge_gate',
  'native_write_delegation_requires_bridge_gate',
  'native_read_delegation_requires_accepted_native_target',
  'native_write_delegation_requires_accepted_native_target'
]);

const ALLOWED_GOVERNED_NATIVE_BRIDGE_WARNING_EFFECTS = Object.freeze([
  'read_delegation_fail_closed',
  'write_delegation_fail_closed'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function safeEnum(value, allowedValues, fallback = null) {
  return typeof value === 'string' && allowedValues.includes(value) ? value : fallback;
}

function projectGovernedMcpVcpNativeBridgeConfigWarnings(warnings) {
  if (!Array.isArray(warnings)) return [];

  return warnings
    .filter(isPlainObject)
    .map(warning => ({
      code: safeEnum(
        warning.code,
        ALLOWED_GOVERNED_NATIVE_BRIDGE_WARNING_CODES,
        'unknown_governed_native_bridge_warning'
      ),
      effect: safeEnum(warning.effect, ALLOWED_GOVERNED_NATIVE_BRIDGE_WARNING_EFFECTS),
      lowDisclosure: warning.lowDisclosure === true
    }));
}

module.exports = {
  ALLOWED_GOVERNED_NATIVE_BRIDGE_WARNING_CODES,
  ALLOWED_GOVERNED_NATIVE_BRIDGE_WARNING_EFFECTS,
  projectGovernedMcpVcpNativeBridgeConfigWarnings
};
