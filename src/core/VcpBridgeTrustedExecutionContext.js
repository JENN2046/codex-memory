'use strict';

const REQUIRED_FIELDS = Object.freeze([
  'agentAlias',
  'agentId',
  'requestSource',
  'projectId',
  'workspaceId',
  'clientId'
]);

const BRIDGE_OWNED_REQUEST_SOURCE = 'vcp-bridge';
const SOURCE_AUTHORITY = 'bridge_runtime_or_static_config';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function firstNonEmptyString(...values) {
  for (const value of values) {
    const normalized = normalizeString(value);
    if (normalized) return normalized;
  }
  return '';
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map(normalizeString).filter(Boolean))];
  }
  if (typeof value === 'string') {
    return [...new Set(value.split(/[,\|]/).map(normalizeString).filter(Boolean))];
  }
  return [];
}

function buildAllowlist(bridgeAllowlist) {
  if (!isPlainObject(bridgeAllowlist)) return null;
  return {
    agentAlias: normalizeList(bridgeAllowlist.agentAlias ?? bridgeAllowlist.allowedAgentAlias),
    agentId: normalizeList(bridgeAllowlist.agentIds ?? bridgeAllowlist.allowedAgentIds),
    requestSource: normalizeList(bridgeAllowlist.requestSources ?? bridgeAllowlist.allowedRequestSources),
    projectId: normalizeList(bridgeAllowlist.projectIds ?? bridgeAllowlist.allowedProjectIds),
    workspaceId: normalizeList(bridgeAllowlist.workspaceIds ?? bridgeAllowlist.allowedWorkspaceIds),
    clientId: normalizeList(bridgeAllowlist.clientIds ?? bridgeAllowlist.allowedClientIds)
  };
}

function hasCompleteAllowlist(allowlist) {
  return Boolean(allowlist) && REQUIRED_FIELDS.every(field => allowlist[field].length > 0);
}

function lowDisclosure(reason, missingFields = [], mismatchedFields = []) {
  return {
    reason,
    code: 'vcp_bridge_trusted_context_rejected',
    lowDisclosure: true,
    missingFields,
    mismatchedFields
  };
}

function rejected(reason, { missingFields = [], mismatchedFields = [] } = {}) {
  return {
    accepted: false,
    executionContext: {},
    lowDisclosureRejection: lowDisclosure(reason, missingFields, mismatchedFields),
    missingFields,
    mismatchedFields,
    sourceAuthority: SOURCE_AUTHORITY,
    payloadAuthorityUsed: false,
    publicMcpExpanded: false,
    recordMemoryCalled: false,
    providerApiCalled: false
  };
}

function buildCandidateContext(bridgeRuntimeContext, bridgeStaticConfig) {
  return {
    agentAlias: firstNonEmptyString(bridgeRuntimeContext.agentAlias, bridgeStaticConfig.agentAlias),
    agentId: firstNonEmptyString(bridgeRuntimeContext.agentId, bridgeStaticConfig.agentId),
    requestSource: firstNonEmptyString(
      bridgeRuntimeContext.requestSource,
      bridgeStaticConfig.requestSource,
      BRIDGE_OWNED_REQUEST_SOURCE
    ),
    projectId: firstNonEmptyString(bridgeRuntimeContext.projectId, bridgeStaticConfig.projectId),
    workspaceId: firstNonEmptyString(bridgeRuntimeContext.workspaceId, bridgeStaticConfig.workspaceId),
    clientId: firstNonEmptyString(bridgeRuntimeContext.clientId, bridgeStaticConfig.clientId)
  };
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

function buildVcpBridgeTrustedExecutionContext(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object');
  }

  if (hasPayloadAuthorityInput(input)) {
    return rejected('payload_authority_not_allowed');
  }

  const {
    bridgeRuntimeContext,
    bridgeStaticConfig = {},
    bridgeAllowlist
  } = input;

  if (!isPlainObject(bridgeRuntimeContext)) {
    return rejected('bridge_runtime_context_not_plain_object');
  }
  if (!isPlainObject(bridgeStaticConfig)) {
    return rejected('bridge_static_config_not_plain_object');
  }

  const effectiveAllowlist = bridgeAllowlist ?? bridgeStaticConfig.bridgeAllowlist;
  const allowlist = buildAllowlist(effectiveAllowlist);
  if (!hasCompleteAllowlist(allowlist)) {
    return rejected('bridge_allowlist_incomplete');
  }

  const executionContext = buildCandidateContext(bridgeRuntimeContext, bridgeStaticConfig);
  const missingFields = REQUIRED_FIELDS.filter(field => !executionContext[field]);
  if (missingFields.length > 0) {
    return rejected('missing_required_fields', { missingFields });
  }

  if (executionContext.requestSource !== BRIDGE_OWNED_REQUEST_SOURCE) {
    return rejected('request_source_not_bridge_owned', {
      mismatchedFields: ['requestSource']
    });
  }

  const mismatchedFields = REQUIRED_FIELDS.filter(field => !allowlist[field].includes(executionContext[field]));
  if (mismatchedFields.length > 0) {
    return rejected('allowlist_mismatch', { mismatchedFields });
  }

  return {
    accepted: true,
    executionContext,
    lowDisclosureRejection: null,
    missingFields: [],
    mismatchedFields: [],
    sourceAuthority: SOURCE_AUTHORITY,
    payloadAuthorityUsed: false,
    publicMcpExpanded: false,
    recordMemoryCalled: false,
    providerApiCalled: false
  };
}

module.exports = {
  BRIDGE_OWNED_REQUEST_SOURCE,
  REQUIRED_FIELDS,
  buildVcpBridgeTrustedExecutionContext
};
