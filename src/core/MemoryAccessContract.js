'use strict';

const GOVERNED_NATIVE_WRITE_CLIENTS = Object.freeze([
  'Codex',
  'Claude'
]);

const GOVERNED_NATIVE_READ_CLIENTS = Object.freeze([
  ...GOVERNED_NATIVE_WRITE_CLIENTS,
  'chatgpt_web'
]);

// Compatibility name for existing bounded-write policy consumers. New read
// paths must use GOVERNED_NATIVE_READ_CLIENTS explicitly so adding a read-only
// channel can never silently expand native write eligibility.
const GOVERNED_NATIVE_CLIENTS = GOVERNED_NATIVE_WRITE_CLIENTS;

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
  return canonicalGovernedNativeWriteClient(value);
}

function canonicalClientFromList(value, clients) {
  const normalized = normalizeString(value).toLowerCase();
  for (const client of clients) {
    if (normalized === client.toLowerCase()) {
      return client;
    }
  }
  return null;
}

function canonicalGovernedNativeReadClient(value) {
  return canonicalClientFromList(value, GOVERNED_NATIVE_READ_CLIENTS);
}

function canonicalGovernedNativeWriteClient(value) {
  return canonicalClientFromList(value, GOVERNED_NATIVE_WRITE_CLIENTS);
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
  GOVERNED_NATIVE_READ_CLIENTS,
  GOVERNED_NATIVE_VISIBILITIES,
  GOVERNED_NATIVE_WRITE_CLIENTS,
  LEGACY_COMPATIBILITY_CLIENT_ID_VALUES,
  PUBLIC_MEMORY_CLIENT_ID_VALUES,
  PUBLIC_MEMORY_VISIBILITY_VALUES,
  canonicalGovernedNativeClient,
  canonicalGovernedNativeReadClient,
  canonicalGovernedNativeWriteClient,
  canonicalMemoryVisibility,
  canonicalPublicMemoryClientId,
  isLegacyCompatibilityClientId
};
