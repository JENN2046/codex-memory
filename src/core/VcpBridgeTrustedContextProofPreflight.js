'use strict';

const crypto = require('node:crypto');

const {
  REQUIRED_FIELDS
} = require('./VcpBridgeTrustedExecutionContext');

const PROOF_TYPE = 'vcp_bridge_trusted_context_static_allowlist_fixture';
const SOURCE_AUTHORITY = 'bridge_signed_static_allowlist_fixture';
const SIGNED_CONTEXT_FIELDS = Object.freeze([
  'issuedAt',
  'expiresAt',
  'nonce',
  'bridgeInstanceId',
  'contextHash',
  'signaturePresent',
  'signatureVerified'
]);
const FORBIDDEN_SECRET_KEYS = Object.freeze([
  'privateKey',
  'signingKey',
  'secret',
  'bearerToken',
  'tokenMaterial',
  'apiKey',
  'password'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function stableSortObject(value) {
  if (Array.isArray(value)) {
    return value.map(stableSortObject);
  }
  if (isPlainObject(value)) {
    return Object.keys(value).sort().reduce((sorted, key) => {
      sorted[key] = stableSortObject(value[key]);
      return sorted;
    }, {});
  }
  return value;
}

function hashJson(value) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(stableSortObject(value)))
    .digest('hex');
}

function buildVcpBridgeTrustedContextHash({ executionContext, bridgeAllowlist }) {
  return hashJson({
    executionContext,
    bridgeAllowlist
  });
}

function lowDisclosure(reason, missingFields = [], mismatchedFields = []) {
  return {
    reason,
    code: 'vcp_bridge_trusted_context_proof_rejected',
    lowDisclosure: true,
    missingFields,
    mismatchedFields
  };
}

function rejected(reason, { missingFields = [], mismatchedFields = [] } = {}) {
  return {
    accepted: false,
    adapterConsumable: false,
    fixtureOnly: true,
    proofType: PROOF_TYPE,
    signedContextMetadata: {},
    lowDisclosureRejection: lowDisclosure(reason, missingFields, mismatchedFields),
    missingFields,
    mismatchedFields,
    sourceAuthority: SOURCE_AUTHORITY,
    payloadAuthorityUsed: false,
    privateKeyAccepted: false,
    bearerTokenAccepted: false,
    publicMcpExpanded: false,
    recordMemoryCalled: false,
    providerApiCalled: false,
    signatureVerified: false
  };
}

function hasForbiddenSecretKey(value) {
  if (Array.isArray(value)) {
    return value.some(hasForbiddenSecretKey);
  }
  if (!isPlainObject(value)) {
    return false;
  }
  return Object.entries(value).some(([key, nested]) => (
    FORBIDDEN_SECRET_KEYS.includes(key) || hasForbiddenSecretKey(nested)
  ));
}

function hasPayloadAuthorityInput(input) {
  return (
    'toolPayload' in input ||
    'publicToolArgs' in input ||
    'promptContext' in input ||
    'prompt' in input ||
    'payloadExecutionContext' in input
  );
}

function normalizeTimestamp(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hasCompleteProofAllowlist(allowlist) {
  return isPlainObject(allowlist) && REQUIRED_FIELDS.every(field => {
    const plural = `${field}s`;
    const allowedPlural = `allowed${field[0].toUpperCase()}${field.slice(1)}s`;
    return Array.isArray(allowlist[field]) ||
      Array.isArray(allowlist[plural]) ||
      Array.isArray(allowlist[allowedPlural]) ||
      typeof allowlist[field] === 'string' ||
      typeof allowlist[plural] === 'string' ||
      typeof allowlist[allowedPlural] === 'string';
  });
}

function projectSignedContextMetadata(signedContext) {
  return {
    issuedAt: normalizeString(signedContext.issuedAt),
    expiresAt: normalizeString(signedContext.expiresAt),
    noncePresent: Boolean(normalizeString(signedContext.nonce)),
    bridgeInstanceIdPresent: Boolean(normalizeString(signedContext.bridgeInstanceId)),
    contextHashPresent: Boolean(normalizeString(signedContext.contextHash)),
    signaturePresent: signedContext.signaturePresent === true,
    signatureVerified: false
  };
}

function buildVcpBridgeTrustedContextProofPreflight(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object');
  }

  if (hasPayloadAuthorityInput(input)) {
    return rejected('payload_authority_not_allowed');
  }

  if (hasForbiddenSecretKey(input)) {
    return rejected('secret_material_not_allowed');
  }

  const {
    proofPacket,
    adapterResult,
    bridgeAllowlist,
    now = new Date()
  } = input;

  if (!isPlainObject(proofPacket)) {
    return rejected('proof_packet_not_plain_object');
  }
  if (proofPacket.proofType !== PROOF_TYPE || proofPacket.fixtureOnly !== true) {
    return rejected('proof_packet_not_fixture_only');
  }
  if (!hasCompleteProofAllowlist(proofPacket.staticAllowlist ?? bridgeAllowlist)) {
    return rejected('static_allowlist_missing');
  }
  if (!isPlainObject(proofPacket.signedContext)) {
    return rejected('signed_context_missing');
  }

  const signedContext = proofPacket.signedContext;
  const missingFields = SIGNED_CONTEXT_FIELDS.filter(field => {
    if (field === 'signaturePresent') return signedContext[field] !== true;
    if (field === 'signatureVerified') return signedContext[field] !== false;
    return !normalizeString(signedContext[field]);
  });
  if (missingFields.length > 0) {
    return rejected('signed_context_incomplete', { missingFields });
  }

  if (!isPlainObject(adapterResult) || adapterResult.accepted !== true) {
    return rejected('adapter_result_not_accepted');
  }

  const issuedAt = normalizeTimestamp(signedContext.issuedAt);
  const expiresAt = normalizeTimestamp(signedContext.expiresAt);
  const nowDate = normalizeTimestamp(now);
  if (!issuedAt || !expiresAt || !nowDate || issuedAt > expiresAt) {
    return rejected('signed_context_time_invalid');
  }
  if (expiresAt <= nowDate) {
    return rejected('signed_context_expired');
  }

  const expectedHash = buildVcpBridgeTrustedContextHash({
    executionContext: adapterResult.executionContext,
    bridgeAllowlist: proofPacket.staticAllowlist ?? bridgeAllowlist
  });
  if (signedContext.contextHash !== expectedHash) {
    return rejected('context_hash_mismatch', { mismatchedFields: ['contextHash'] });
  }

  return {
    accepted: true,
    adapterConsumable: true,
    fixtureOnly: true,
    proofType: PROOF_TYPE,
    signedContextMetadata: projectSignedContextMetadata(signedContext),
    lowDisclosureRejection: null,
    missingFields: [],
    mismatchedFields: [],
    sourceAuthority: SOURCE_AUTHORITY,
    payloadAuthorityUsed: false,
    privateKeyAccepted: false,
    bearerTokenAccepted: false,
    publicMcpExpanded: false,
    recordMemoryCalled: false,
    providerApiCalled: false,
    signatureVerified: false
  };
}

module.exports = {
  PROOF_TYPE,
  SIGNED_CONTEXT_FIELDS,
  buildVcpBridgeTrustedContextHash,
  buildVcpBridgeTrustedContextProofPreflight
};
