'use strict';

const GOVERNED_NATIVE_CLIENTS = Object.freeze([
  'Codex',
  'Claude'
]);

const PUBLIC_MEMORY_CLIENT_ID_VALUES = Object.freeze([
  'codex',
  'claude',
  'manual'
]);

const LEGACY_COMPATIBILITY_CLIENT_ID_VALUES = Object.freeze([
  'omc'
]);

const PUBLIC_MEMORY_VISIBILITY_VALUES = Object.freeze([
  'private',
  'workspace',
  'project',
  'shared'
]);

const GOVERNED_NATIVE_VISIBILITIES = PUBLIC_MEMORY_VISIBILITY_VALUES;

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function canonicalGovernedNativeClient(value) {
  const normalized = normalizeString(value).toLowerCase();
  for (const client of GOVERNED_NATIVE_CLIENTS) {
    if (normalized === client.toLowerCase()) {
      return client;
    }
  }
  return null;
}

function canonicalPublicMemoryClientId(value) {
  const normalized = normalizeString(value).toLowerCase();
  return PUBLIC_MEMORY_CLIENT_ID_VALUES.includes(normalized) ? normalized : null;
}

function isLegacyCompatibilityClientId(value) {
  return LEGACY_COMPATIBILITY_CLIENT_ID_VALUES.includes(
    normalizeString(value).toLowerCase()
  );
}

function canonicalMemoryVisibility(value) {
  const normalized = normalizeString(value).toLowerCase();
  return PUBLIC_MEMORY_VISIBILITY_VALUES.includes(normalized) ? normalized : null;
}

module.exports = {
  GOVERNED_NATIVE_CLIENTS,
  GOVERNED_NATIVE_VISIBILITIES,
  LEGACY_COMPATIBILITY_CLIENT_ID_VALUES,
  PUBLIC_MEMORY_CLIENT_ID_VALUES,
  PUBLIC_MEMORY_VISIBILITY_VALUES,
  canonicalGovernedNativeClient,
  canonicalMemoryVisibility,
  canonicalPublicMemoryClientId,
  isLegacyCompatibilityClientId
};
