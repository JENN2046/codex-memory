'use strict';

const crypto = require('node:crypto');
const { isSafeReferenceName } = require('./VcpToolBoxSafeReference');
const {
  CHATGPT_WEB_CHANNEL_ID,
  CHATGPT_WEB_CLIENT_ID
} = require('./constants');
const {
  digestLayeredSourceTruthValue
} = require('./ChatGptWebLayeredSourceTruthReceipt');

const ALLOWED_VISIBILITIES = Object.freeze(['project', 'workspace']);
const FORBIDDEN_AUTHORITY_FIELDS = Object.freeze([
  'exactApprovalResult',
  'nativeWriteAllowed',
  'writeAllowed',
  'writePolicy'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function contextClientId(requestContext = {}) {
  const executionContext = isPlainObject(requestContext.executionContext)
    ? requestContext.executionContext
    : {};
  return stringValue(executionContext.clientId ?? executionContext.client_id);
}

function isChatGptWebPrincipalRequest(requestContext = {}) {
  return stringValue(requestContext.channelIdentity ?? requestContext.channel_identity) ===
      CHATGPT_WEB_CHANNEL_ID ||
    contextClientId(requestContext) === CHATGPT_WEB_CLIENT_ID;
}

function scopeFingerprint(executionContext) {
  const source = {
    clientId: stringValue(executionContext.clientId ?? executionContext.client_id),
    projectId: stringValue(executionContext.projectId ?? executionContext.project_id),
    scopeId: stringValue(executionContext.scopeId ?? executionContext.scope_id),
    visibility: stringValue(executionContext.visibility),
    workspaceId: stringValue(executionContext.workspaceId ?? executionContext.workspace_id)
  };
  return `sha256:${crypto.createHash('sha256')
    .update(JSON.stringify(source), 'utf8')
    .digest('hex')}`;
}

function buildReceipt({ accepted, blockers, executionContext = {} }) {
  const receipt = {
    schemaVersion: 'chatgpt_web_read_only_principal_receipt_v1',
    contractId: 'C3',
    accepted,
    decision: accepted ? 'read_only_principal_bound' : 'read_only_principal_rejected',
    channelIdentityBound: accepted,
    serverTrustedContextBound: accepted,
    completeFixedScopeBound: accepted,
    scopeFingerprintBound: accepted,
    scopeFingerprint: accepted ? scopeFingerprint(executionContext) : null,
    visibilityCeiling: [...ALLOWED_VISIBILITIES],
    readAllowed: accepted,
    writeAllowed: false,
    writeEligible: false,
    privateVisibilityAllowed: false,
    sharedVisibilityAllowed: false,
    localFallbackAllowed: false,
    rawScopeReturned: false,
    rawIdentityReturned: false,
    blockers: [...blockers]
  };
  return Object.freeze({
    ...receipt,
    principalReceiptDigest: digestLayeredSourceTruthValue(receipt)
  });
}

function validateChatGptWebReadOnlyPrincipal(requestContext = {}) {
  const blockers = [];
  const executionContext = isPlainObject(requestContext.executionContext)
    ? requestContext.executionContext
    : {};
  const trusted = isPlainObject(requestContext.trustedExecutionContext)
    ? requestContext.trustedExecutionContext
    : {};
  const trustedExecutionContext = isPlainObject(trusted.executionContext)
    ? trusted.executionContext
    : {};
  const channelIdentity = stringValue(
    requestContext.channelIdentity ?? requestContext.channel_identity
  );
  const clientId = contextClientId(requestContext);
  const agentAlias = stringValue(executionContext.agentAlias ?? executionContext.agent_alias);
  const requestSource = stringValue(executionContext.requestSource ?? executionContext.request_source);
  const projectId = stringValue(executionContext.projectId ?? executionContext.project_id);
  const workspaceId = stringValue(executionContext.workspaceId ?? executionContext.workspace_id);
  const scopeId = stringValue(executionContext.scopeId ?? executionContext.scope_id);
  const visibility = stringValue(executionContext.visibility).toLowerCase();

  if (channelIdentity !== CHATGPT_WEB_CHANNEL_ID) blockers.push('channel_identity_not_bound');
  if (clientId !== CHATGPT_WEB_CLIENT_ID || agentAlias !== CHATGPT_WEB_CLIENT_ID) {
    blockers.push('read_only_client_identity_not_bound');
  }
  if (requestSource !== 'chatgpt_web_mcp') blockers.push('request_source_not_bound');
  if (trusted.accepted !== true) blockers.push('server_trusted_context_not_accepted');
  if (!ALLOWED_VISIBILITIES.includes(visibility)) blockers.push('visibility_ceiling_exceeded');
  if (![projectId, workspaceId, scopeId].every(isSafeReferenceName)) {
    blockers.push('complete_fixed_scope_not_bound');
  }
  for (const field of FORBIDDEN_AUTHORITY_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(requestContext, field)) {
      blockers.push('write_authority_field_forbidden');
      break;
    }
  }

  const trustedFieldsMatch = [
    ['agentAlias', agentAlias],
    ['clientId', clientId],
    ['projectId', projectId],
    ['workspaceId', workspaceId],
    ['scopeId', scopeId],
    ['visibility', visibility]
  ].every(([field, expected]) => stringValue(trustedExecutionContext[field]) === expected);
  if (!trustedFieldsMatch) blockers.push('trusted_context_scope_mismatch');

  const accepted = blockers.length === 0;
  return {
    accepted,
    reasonCode: accepted ? null : 'chatgpt_web_read_only_principal_rejected',
    receipt: buildReceipt({ accepted, blockers, executionContext })
  };
}

module.exports = {
  CHATGPT_WEB_READ_ONLY_VISIBILITIES: ALLOWED_VISIBILITIES,
  isChatGptWebPrincipalRequest,
  validateChatGptWebReadOnlyPrincipal
};
