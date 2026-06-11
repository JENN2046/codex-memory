'use strict';

const ACTIONS = Object.freeze({
  DESIGN_ONLY: 'design_only',
  FIXTURE_ONLY: 'fixture_only',
  LOCAL_DRY_RUN: 'local_dry_run',
  LIVE_BRIDGE_PROBE_NO_WRITE: 'live_bridge_probe_no_write',
  LIVE_BRIDGE_RECORD_MEMORY_PROOF: 'live_bridge_record_memory_proof'
});

const APPROVAL_TOKENS = Object.freeze({
  FIXTURE: 'APPROVE_VCP_BRIDGE_FIXTURE_ONLY_PROOF_PREFLIGHT',
  LOCAL_DRY_RUN: 'APPROVE_VCP_BRIDGE_LOCAL_DRY_RUN_NO_WRITE',
  LIVE_NO_WRITE: 'APPROVE_VCP_BRIDGE_LIVE_PROBE_NO_WRITE',
  LIVE_RECORD_MEMORY_PROOF: 'APPROVE_VCP_BRIDGE_LIVE_RECORD_MEMORY_PROOF_EXACT'
});

const FORBIDDEN_ACTIONS = Object.freeze([
  'production_strict_default_enable',
  'release_cutover_ready_claim',
  'public_mcp_expansion',
  'raw_scan',
  'broad_scan',
  'confirmed_mutation',
  'persistent_tag_write',
  'provider_api',
  'bearer_token_material',
  'unbounded_record_memory_write'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeTimestamp(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function lowDisclosure(reason, missingFields = [], mismatchedFields = []) {
  return {
    reason,
    code: 'vcp_bridge_exact_approval_rejected',
    lowDisclosure: true,
    missingFields,
    mismatchedFields
  };
}

function rejected(reason, { allowedAction = null, missingFields = [], mismatchedFields = [] } = {}) {
  return {
    accepted: false,
    allowedAction,
    approvalConsumable: false,
    lowDisclosureRejection: lowDisclosure(reason, missingFields, mismatchedFields),
    missingFields,
    mismatchedFields,
    exactApprovalTokenName: null,
    forbiddenActions: FORBIDDEN_ACTIONS,
    productionStrictDefaultEnabled: false,
    releaseCutoverReadyClaimed: false,
    publicMcpExpanded: false,
    rawScanAllowed: false,
    broadScanAllowed: false,
    confirmedMutationAllowed: false,
    persistentTagWriteAllowed: false,
    providerApiAllowed: false,
    bearerTokenMaterialAccepted: false,
    unboundedRecordMemoryWriteAllowed: false,
    recordMemoryCalled: false
  };
}

function tokenForAction(action) {
  if (action === ACTIONS.DESIGN_ONLY || action === ACTIONS.FIXTURE_ONLY) {
    return APPROVAL_TOKENS.FIXTURE;
  }
  if (action === ACTIONS.LOCAL_DRY_RUN) {
    return APPROVAL_TOKENS.LOCAL_DRY_RUN;
  }
  if (action === ACTIONS.LIVE_BRIDGE_PROBE_NO_WRITE) {
    return APPROVAL_TOKENS.LIVE_NO_WRITE;
  }
  if (action === ACTIONS.LIVE_BRIDGE_RECORD_MEMORY_PROOF) {
    return APPROVAL_TOKENS.LIVE_RECORD_MEMORY_PROOF;
  }
  return null;
}

function buildVcpBridgeExactApprovalGate(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object');
  }

  const {
    approvalPacket,
    requestedAction = ACTIONS.DESIGN_ONLY,
    expectedContextHash,
    expectedAllowlistHash,
    now = new Date()
  } = input;

  if (requestedAction === 'production_strict_default_enable') {
    return rejected('production_strict_default_never_enabled_by_gate', { allowedAction: requestedAction });
  }
  if (!Object.values(ACTIONS).includes(requestedAction)) {
    return rejected('unknown_action', { allowedAction: requestedAction });
  }
  if (!isPlainObject(approvalPacket)) {
    return rejected('approval_packet_not_plain_object', { allowedAction: requestedAction });
  }

  const missingFields = [
    'token',
    'operatorIntentScope',
    'allowedAction',
    'expiresAt',
    'nonce',
    'receiptId',
    'expectedContextHash',
    'expectedAllowlistHash'
  ].filter(field => !normalizeString(approvalPacket[field]));
  if (missingFields.length > 0) {
    return rejected('approval_packet_incomplete', { allowedAction: requestedAction, missingFields });
  }

  if (approvalPacket.allowedAction !== requestedAction) {
    return rejected('approval_action_mismatch', {
      allowedAction: requestedAction,
      mismatchedFields: ['allowedAction']
    });
  }

  const expectedToken = tokenForAction(requestedAction);
  if (approvalPacket.token !== expectedToken) {
    return rejected('approval_token_mismatch', {
      allowedAction: requestedAction,
      mismatchedFields: ['token']
    });
  }

  const expiresAt = normalizeTimestamp(approvalPacket.expiresAt);
  const nowDate = normalizeTimestamp(now);
  if (!expiresAt || !nowDate || expiresAt <= nowDate) {
    return rejected('approval_expired', { allowedAction: requestedAction });
  }

  const mismatchedFields = [];
  if (normalizeString(approvalPacket.expectedContextHash) !== normalizeString(expectedContextHash)) {
    mismatchedFields.push('expectedContextHash');
  }
  if (normalizeString(approvalPacket.expectedAllowlistHash) !== normalizeString(expectedAllowlistHash)) {
    mismatchedFields.push('expectedAllowlistHash');
  }
  if (mismatchedFields.length > 0) {
    return rejected('approval_hash_mismatch', { allowedAction: requestedAction, mismatchedFields });
  }

  return {
    accepted: true,
    allowedAction: requestedAction,
    approvalConsumable: true,
    lowDisclosureRejection: null,
    missingFields: [],
    mismatchedFields: [],
    exactApprovalTokenName: expectedToken,
    operatorIntentScope: normalizeString(approvalPacket.operatorIntentScope),
    noncePresent: true,
    receiptIdPresent: true,
    expiresAt: normalizeString(approvalPacket.expiresAt),
    forbiddenActions: FORBIDDEN_ACTIONS,
    productionStrictDefaultEnabled: false,
    releaseCutoverReadyClaimed: false,
    publicMcpExpanded: false,
    rawScanAllowed: false,
    broadScanAllowed: false,
    confirmedMutationAllowed: false,
    persistentTagWriteAllowed: false,
    providerApiAllowed: false,
    bearerTokenMaterialAccepted: false,
    unboundedRecordMemoryWriteAllowed: false,
    recordMemoryCalled: false
  };
}

module.exports = {
  ACTIONS,
  APPROVAL_TOKENS,
  FORBIDDEN_ACTIONS,
  buildVcpBridgeExactApprovalGate
};
