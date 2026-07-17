'use strict';

const {
  CHATGPT_WEB_CHANNEL_ID,
  CHATGPT_WEB_CLIENT_ID,
  CHATGPT_WEB_MCP_ENDPOINT_BASE,
  CHATGPT_WEB_UDS_TRANSPORT
} = require('./constants');
const { isSafeReferenceName } = require('./VcpToolBoxSafeReference');

const CHATGPT_WEB_PROFILE_IDS = Object.freeze({
  OFF: 'off',
  TRANSPORT_PROBE_V0: 'chatgpt_web_transport_probe_v0',
  READ_ONLY_V1: 'chatgpt_web_read_only_v1',
  CONTEXT_V2: 'chatgpt_web_context_v2'
});

const CHATGPT_WEB_ALLOWED_VISIBILITIES = Object.freeze([
  'project',
  'workspace'
]);

const CHATGPT_WEB_ENDPOINT_VERSION_BY_PROFILE_ID = Object.freeze({
  [CHATGPT_WEB_PROFILE_IDS.TRANSPORT_PROBE_V0]: 'v0',
  [CHATGPT_WEB_PROFILE_IDS.READ_ONLY_V1]: 'v1',
  [CHATGPT_WEB_PROFILE_IDS.CONTEXT_V2]: 'v2'
});

const CHATGPT_WEB_PROFILE_DEFINITIONS = Object.freeze({
  [CHATGPT_WEB_PROFILE_IDS.TRANSPORT_PROBE_V0]: Object.freeze({
    profileId: CHATGPT_WEB_PROFILE_IDS.TRANSPORT_PROBE_V0,
    toolCeiling: Object.freeze(['memory_overview']),
    scopeMode: 'server_fixed',
    memoryReadAllowed: false,
    vcpNativeReadAllowed: false,
    localFallbackAllowed: false,
    durableWriteAllowed: false,
    prepareMemoryContextCompositeGateRequired: false
  }),
  [CHATGPT_WEB_PROFILE_IDS.READ_ONLY_V1]: Object.freeze({
    profileId: CHATGPT_WEB_PROFILE_IDS.READ_ONLY_V1,
    toolCeiling: Object.freeze([
      'memory_overview',
      'search_memory',
      'audit_memory'
    ]),
    scopeMode: 'server_fixed',
    memoryReadAllowed: true,
    vcpNativeReadAllowed: true,
    localFallbackAllowed: false,
    durableWriteAllowed: false,
    prepareMemoryContextCompositeGateRequired: false
  }),
  [CHATGPT_WEB_PROFILE_IDS.CONTEXT_V2]: Object.freeze({
    profileId: CHATGPT_WEB_PROFILE_IDS.CONTEXT_V2,
    toolCeiling: Object.freeze([
      'memory_overview',
      'search_memory',
      'audit_memory',
      'prepare_memory_context'
    ]),
    scopeMode: 'server_fixed_or_approved_alias',
    memoryReadAllowed: true,
    vcpNativeReadAllowed: true,
    localFallbackAllowed: false,
    durableWriteAllowed: false,
    prepareMemoryContextCompositeGateRequired: true
  })
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeChatGptWebProfileId(value) {
  const normalized = normalizeString(value).toLowerCase();
  return Object.prototype.hasOwnProperty.call(CHATGPT_WEB_PROFILE_DEFINITIONS, normalized)
    ? normalized
    : CHATGPT_WEB_PROFILE_IDS.OFF;
}

function getChatGptWebEndpointVersion(profileId) {
  const normalized = normalizeChatGptWebProfileId(profileId);
  return CHATGPT_WEB_ENDPOINT_VERSION_BY_PROFILE_ID[normalized] || null;
}

function getChatGptWebEndpointPath(profileId) {
  const version = getChatGptWebEndpointVersion(profileId);
  return version ? `${CHATGPT_WEB_MCP_ENDPOINT_BASE}/${version}` : null;
}

function normalizeServerFixedScope(scope = {}) {
  const source = isPlainObject(scope) ? scope : {};
  const projectId = normalizeString(source.projectId ?? source.project_id);
  const workspaceId = normalizeString(source.workspaceId ?? source.workspace_id);
  const scopeId = normalizeString(source.scopeId ?? source.scope_id);
  const visibility = normalizeString(source.visibility ?? source.visibility_policy).toLowerCase();
  const scopeConfigured = isSafeReferenceName(projectId) &&
    isSafeReferenceName(workspaceId) &&
    isSafeReferenceName(scopeId) &&
    CHATGPT_WEB_ALLOWED_VISIBILITIES.includes(visibility);

  return Object.freeze({
    projectId: scopeConfigured ? projectId : null,
    workspaceId: scopeConfigured ? workspaceId : null,
    scopeId: scopeConfigured ? scopeId : null,
    clientId: CHATGPT_WEB_CLIENT_ID,
    visibility: scopeConfigured ? visibility : null,
    configured: scopeConfigured
  });
}

function buildChatGptWebProfileConfig({
  profileId = CHATGPT_WEB_PROFILE_IDS.OFF,
  enabled = false,
  serverFixedScope = {}
} = {}) {
  const requestedProfileId = normalizeString(profileId).toLowerCase();
  const normalizedProfileId = normalizeChatGptWebProfileId(profileId);
  const definition = CHATGPT_WEB_PROFILE_DEFINITIONS[normalizedProfileId] || null;
  const fixedScope = normalizeServerFixedScope(serverFixedScope);
  const activationRequested = enabled === true;
  const scopeConfigured = fixedScope.configured === true;
  const profileConfigured = definition !== null;
  const active = activationRequested && profileConfigured && scopeConfigured;
  const pendingCompositeToolNames = definition?.prepareMemoryContextCompositeGateRequired === true
    ? ['prepare_memory_context']
    : [];
  const exposedToolNames = definition
    ? definition.toolCeiling.filter(toolName => !pendingCompositeToolNames.includes(toolName))
    : [];
  const activationError = active
    ? null
    : !profileConfigured
      ? 'chatgpt_web_profile_disabled'
      : !scopeConfigured
        ? 'scope_trusted_context_missing'
        : 'chatgpt_web_profile_disabled';

  return Object.freeze({
    profileId: profileConfigured ? normalizedProfileId : CHATGPT_WEB_PROFILE_IDS.OFF,
    requestedProfileId: requestedProfileId || CHATGPT_WEB_PROFILE_IDS.OFF,
    enabled: active,
    activationRequested,
    activationError,
    channelIdentity: CHATGPT_WEB_CHANNEL_ID,
    toolCeiling: Object.freeze(definition ? [...definition.toolCeiling] : []),
    exposedToolNames: Object.freeze(exposedToolNames),
    pendingCompositeToolNames: Object.freeze(pendingCompositeToolNames),
    prepareMemoryContextExposure: false,
    scopeMode: definition?.scopeMode || 'off',
    serverFixedScope: fixedScope,
    scopeConfigured,
    memoryReadAllowed: definition?.memoryReadAllowed === true,
    vcpNativeReadAllowed: definition?.vcpNativeReadAllowed === true,
    localFallbackAllowed: false,
    durableWriteAllowed: false,
    approvedAliasSupported: false,
    runtimeInvocationAllowed: false,
    runtimeInvocationStatus: 'not_bound',
    providerApiCallsAllowed: false,
    externalNetworkCallsAllowed: false
  });
}

function buildChatGptWebEndpointProfileConfig(config = {}, profileId) {
  const configuredProfile = isPlainObject(config.chatgptWebProfile)
    ? config.chatgptWebProfile
    : buildChatGptWebProfileConfig();
  const udsConfig = isPlainObject(config.chatgptWebUds)
    ? config.chatgptWebUds
    : {};
  const normalizedProfileId = normalizeChatGptWebProfileId(profileId);
  const endpointEnabled = udsConfig.enabled === true &&
    Array.isArray(udsConfig.enabledProfileIds) &&
    udsConfig.enabledProfileIds.includes(normalizedProfileId);
  const activationRequested = configuredProfile.activationRequested === true ||
    configuredProfile.enabled === true;

  return buildChatGptWebProfileConfig({
    profileId: normalizedProfileId,
    enabled: activationRequested && endpointEnabled,
    serverFixedScope: configuredProfile.serverFixedScope
  });
}

function getChatGptWebProfileForRequest(config = {}, requestContext = {}) {
  const channelIdentity = normalizeString(
    isPlainObject(requestContext)
      ? requestContext.channelIdentity ?? requestContext.channel_identity
      : ''
  ).toLowerCase();
  if (channelIdentity !== CHATGPT_WEB_CHANNEL_ID) {
    return {
      isChatGptWebRequest: false,
      accepted: true,
      profile: null,
      reasonCode: null
    };
  }

  const endpointProfileId = normalizeChatGptWebProfileId(
    isPlainObject(requestContext)
      ? requestContext.chatgptWebEndpointProfileId
      : CHATGPT_WEB_PROFILE_IDS.OFF
  );
  const isTrustedUdsEndpoint = isPlainObject(requestContext) &&
    requestContext.chatgptWebTransport === CHATGPT_WEB_UDS_TRANSPORT &&
    endpointProfileId !== CHATGPT_WEB_PROFILE_IDS.OFF;
  const configuredProfile = isPlainObject(config.chatgptWebProfile)
    ? config.chatgptWebProfile
    : buildChatGptWebProfileConfig();
  const profile = isTrustedUdsEndpoint
    ? buildChatGptWebEndpointProfileConfig(config, endpointProfileId)
    : buildChatGptWebProfileConfig({
        profileId: configuredProfile.profileId,
        enabled: configuredProfile.activationRequested === true || configuredProfile.enabled === true,
        serverFixedScope: configuredProfile.serverFixedScope
      });
  const accepted = profile.enabled === true &&
    profile.channelIdentity === CHATGPT_WEB_CHANNEL_ID &&
    profile.scopeConfigured === true &&
    Array.isArray(profile.exposedToolNames);

  return {
    isChatGptWebRequest: true,
    accepted,
    profile: accepted ? profile : null,
    reasonCode: accepted
      ? null
      : typeof profile.activationError === 'string' && profile.activationError
        ? profile.activationError
        : 'chatgpt_web_profile_disabled'
  };
}

module.exports = {
  CHATGPT_WEB_ALLOWED_VISIBILITIES,
  CHATGPT_WEB_ENDPOINT_VERSION_BY_PROFILE_ID,
  CHATGPT_WEB_PROFILE_DEFINITIONS,
  CHATGPT_WEB_PROFILE_IDS,
  buildChatGptWebEndpointProfileConfig,
  buildChatGptWebProfileConfig,
  getChatGptWebEndpointPath,
  getChatGptWebEndpointVersion,
  getChatGptWebProfileForRequest,
  normalizeChatGptWebProfileId,
  normalizeServerFixedScope
};
