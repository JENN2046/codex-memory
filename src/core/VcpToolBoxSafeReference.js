'use strict';

const SAFE_REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

const UNSAFE_REFERENCE_VALUE_PATTERNS = Object.freeze([
  /https?:\/\//i,
  /[A-Za-z]:[\\/]/,
  /\\\\/,
  /\//,
  /\\/,
  /\bconfig\.env\b/i,
  /\.env\b/i,
  /\bbearer\b/i,
  /\btoken\b/i,
  /\bsecret\b/i,
  /\bapi[_-]?key\b/i,
  /\bprivate[_-]?key\b/i,
  /\bpassword\b/i
]);

function hasUnsafeReferenceValue(value) {
  if (typeof value !== 'string') return true;
  return UNSAFE_REFERENCE_VALUE_PATTERNS.some(pattern => pattern.test(value));
}

function isSafeReferenceName(value) {
  return typeof value === 'string' &&
    SAFE_REFERENCE_PATTERN.test(value) &&
    !hasUnsafeReferenceValue(value);
}

function isSafeOperatorIntent(value) {
  return typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= 160 &&
    !hasUnsafeReferenceValue(value);
}

module.exports = {
  SAFE_REFERENCE_PATTERN,
  UNSAFE_REFERENCE_VALUE_PATTERNS,
  hasUnsafeReferenceValue,
  isSafeOperatorIntent,
  isSafeReferenceName
};
