'use strict';

const {
  CHATGPT_WEB_CHANNEL_ID,
  CHATGPT_WEB_CLIENT_ID
} = require('./constants');

const CHATGPT_WEB_TRUSTED_SCOPE_FIELD_NAMES = Object.freeze([
  'project_id',
  'projectId',
  'workspace_id',
  'workspaceId',
  'scope_id',
  'scopeId',
  'client_id',
  'clientId',
  'visibility',
  'visibility_policy',
  'visibilityPolicy'
]);

const CHATGPT_WEB_SCHEMA_HIDDEN_FIELD_NAMES = Object.freeze([
  ...CHATGPT_WEB_TRUSTED_SCOPE_FIELD_NAMES,
  'scope',
  'channel_identity',
  'channelIdentity',
  'chatgpt_web_profile_id',
  'chatgptWebProfileId',
  'trusted_execution_context',
  'trustedExecutionContext'
]);

const CHATGPT_WEB_IDENTITY_OVERRIDE_FIELD_NAMES = new Set([
  'clientid',
  'channelidentity',
  'chatgptwebprofileid',
  'trustedexecutioncontext'
]);
const CHATGPT_WEB_SCOPE_OVERRIDE_FIELD_NAMES = new Set([
  'projectid',
  'workspaceid',
  'scopeid',
  'visibility',
  'visibilitypolicy',
  'scope'
]);
const CHATGPT_WEB_SCHEMA_HIDDEN_FIELD_NAME_SET = new Set(
  CHATGPT_WEB_SCHEMA_HIDDEN_FIELD_NAMES.map(normalizeFieldName)
);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeFieldName(value) {
  return typeof value === 'string'
    ? value.replaceAll('_', '').trim().toLowerCase()
    : '';
}

function classifyChatGptWebOverrideField(fieldName) {
  const normalized = normalizeFieldName(fieldName);
  if (CHATGPT_WEB_IDENTITY_OVERRIDE_FIELD_NAMES.has(normalized)) {
    return 'identity_client_override_attempt';
  }
  if (CHATGPT_WEB_SCOPE_OVERRIDE_FIELD_NAMES.has(normalized)) {
    return 'scope_escalation_attempt';
  }
  return null;
}

function findChatGptWebModelOverride(value, depth = 0) {
  if (depth > 12 || value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const result = findChatGptWebModelOverride(item, depth + 1);
      if (result) return result;
    }
    return null;
  }
  if (!isPlainObject(value)) return null;

  let scopeOverride = null;
  for (const [key, nestedValue] of Object.entries(value)) {
    const override = classifyChatGptWebOverrideField(key);
    if (override === 'identity_client_override_attempt') return override;
    if (override && !scopeOverride) scopeOverride = override;

    const nestedOverride = findChatGptWebModelOverride(nestedValue, depth + 1);
    if (nestedOverride === 'identity_client_override_attempt') return nestedOverride;
    if (nestedOverride && !scopeOverride) scopeOverride = nestedOverride;
  }
  return scopeOverride;
}

function findChatGptWebModelOverrideInParams(params = {}) {
  if (!isPlainObject(params)) return null;
  const argumentOverride = findChatGptWebModelOverride(params.arguments || {});
  if (argumentOverride) return argumentOverride;
  return findChatGptWebModelOverride(params._meta || {});
}

function buildChatGptWebTrustedExecutionContext(profile = {}) {
  const fixedScope = isPlainObject(profile.serverFixedScope)
    ? profile.serverFixedScope
    : {};
  const scopeConfigured = profile.enabled === true &&
    fixedScope.configured === true &&
    typeof fixedScope.projectId === 'string' &&
    typeof fixedScope.workspaceId === 'string' &&
    typeof fixedScope.scopeId === 'string' &&
    typeof fixedScope.visibility === 'string';
  if (!scopeConfigured) {
    return {
      accepted: false,
      reasonCode: 'scope_trusted_context_missing'
    };
  }

  const executionContext = Object.freeze({
    agentAlias: CHATGPT_WEB_CHANNEL_ID,
    agentId: CHATGPT_WEB_CHANNEL_ID,
    requestSource: 'chatgpt_web_mcp',
    projectId: fixedScope.projectId,
    workspaceId: fixedScope.workspaceId,
    scopeId: fixedScope.scopeId,
    clientId: CHATGPT_WEB_CLIENT_ID,
    visibility: fixedScope.visibility
  });

  return {
    accepted: true,
    requestContext: Object.freeze({
      channelIdentity: CHATGPT_WEB_CHANNEL_ID,
      chatgptWebProfileId: profile.profileId,
      executionContext,
      trustedExecutionContext: Object.freeze({
        accepted: true,
        executionContext
      })
    })
  };
}

function projectChatGptWebSchema(value) {
  if (Array.isArray(value)) {
    return value.map(item => projectChatGptWebSchema(item));
  }
  if (!isPlainObject(value)) return value;

  const projected = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (key === 'properties' && isPlainObject(nestedValue)) {
      const properties = {};
      for (const [propertyName, propertySchema] of Object.entries(nestedValue)) {
        if (CHATGPT_WEB_SCHEMA_HIDDEN_FIELD_NAME_SET.has(normalizeFieldName(propertyName))) {
          continue;
        }
        properties[propertyName] = projectChatGptWebSchema(propertySchema);
      }
      projected.properties = properties;
      continue;
    }
    if (key === 'required' && Array.isArray(nestedValue)) {
      projected.required = nestedValue.filter(propertyName =>
        !CHATGPT_WEB_SCHEMA_HIDDEN_FIELD_NAME_SET.has(normalizeFieldName(propertyName))
      );
      continue;
    }
    projected[key] = projectChatGptWebSchema(nestedValue);
  }
  return projected;
}

function projectChatGptWebToolDefinition(toolDefinition = {}) {
  return {
    ...toolDefinition,
    inputSchema: projectChatGptWebSchema(toolDefinition.inputSchema || {})
  };
}

function getChatGptWebScopeValuesForRedaction(profile = {}) {
  const fixedScope = isPlainObject(profile.serverFixedScope)
    ? profile.serverFixedScope
    : {};
  return [
    fixedScope.projectId,
    fixedScope.workspaceId,
    fixedScope.scopeId
  ].filter(value => typeof value === 'string' && value.length >= 4);
}

function redactChatGptWebScopeValues(value, profile = {}) {
  if (typeof value !== 'string') return value;
  return getChatGptWebScopeValuesForRedaction(profile)
    .reduce((redacted, scopeValue) => redacted.split(scopeValue).join('<redacted>'), value);
}

function projectChatGptWebOutputValue(value, profile = {}) {
  if (Array.isArray(value)) {
    return value.map(item => projectChatGptWebOutputValue(item, profile));
  }
  if (!isPlainObject(value)) return redactChatGptWebScopeValues(value, profile);

  const projected = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (CHATGPT_WEB_SCHEMA_HIDDEN_FIELD_NAME_SET.has(normalizeFieldName(key))) {
      continue;
    }
    projected[key] = projectChatGptWebOutputValue(nestedValue, profile);
  }
  return projected;
}

function projectChatGptWebGovernedMetadata(metadata = {}, profile = {}) {
  const auditReceipt = isPlainObject(metadata.auditReceipt)
    ? metadata.auditReceipt
    : {};
  const governanceTransport = isPlainObject(metadata.governanceTransport)
    ? metadata.governanceTransport
    : {};
  const nativeBridge = isPlainObject(metadata.nativeBridge)
    ? metadata.nativeBridge
    : {};
  const nativeRuntimePosture = isPlainObject(nativeBridge.localMemoryRuntimePosture)
    ? nativeBridge.localMemoryRuntimePosture
    : {};

  return {
    ...metadata,
    productGoal: {
      ...metadata.productGoal,
      clients: [CHATGPT_WEB_CHANNEL_ID],
      governedDimensions: [
        'server-fixed scope',
        'runtime target',
        'invocation profile',
        'read/write authority',
        'output disclosure budget',
        'audit receipt',
        'rollback posture'
      ]
    },
    nativeBridge: {
      ...nativeBridge,
      localMemoryRuntimePosture: {
        ...nativeRuntimePosture,
        fallbackAllowed: false,
        fallbackAllowedForWrite: false,
        compatibilityAllowed: false,
        offlineContinuityAllowed: false
      }
    },
    clientIdentity: {
      source: 'server_profile',
      serverProfileBound: true,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverrideTransportContext: false,
      rawIdentityValueReturned: false
    },
    scopeBoundary: {
      source: 'server_profile',
      scopeMode: profile.scopeMode || 'server_fixed',
      serverProfileBound: true,
      scopeConfigured: profile.scopeConfigured === true,
      toolArgumentsMayOverride: false,
      governanceMetadataMayOverrideTransportContext: false,
      rawScopeValueReturned: false,
      rawScopeFieldNamesReturned: false
    },
    governanceTransport: {
      ...governanceTransport,
      acceptedMetadataFields: Array.isArray(governanceTransport.acceptedMetadataFields)
        ? governanceTransport.acceptedMetadataFields.filter(fieldName => fieldName !== 'trustedExecutionContext')
        : [],
      trustedExecutionContextRequiredForNativeDelegation: false,
      trustedExecutionContextBindingRequired: [],
      trustedExecutionContextMustMatchTransportContext: false,
      transportContextFieldsOverrideGovernanceMetadata: true,
      adapterRevalidatesTrustedExecutionContext: true,
      serverInjectsTrustedExecutionContext: true
    },
    auditReceipt: {
      ...auditReceipt,
      recordedEvidenceFields: Array.isArray(auditReceipt.recordedEvidenceFields)
        ? auditReceipt.recordedEvidenceFields.filter(fieldName => ![
            'clientId',
            'visibility',
            'scopeFieldNames',
            'scopeIdentifierFieldNames'
          ].includes(fieldName))
        : [],
      recordsScopeFieldNames: false,
      recordsScopeIdentifierFieldNames: false
    },
    chatgptWebProfile: {
      channelIdentity: CHATGPT_WEB_CHANNEL_ID,
      profileId: profile.profileId || 'off',
      toolCeiling: Array.isArray(profile.toolCeiling) ? [...profile.toolCeiling] : [],
      exposedToolNames: Array.isArray(profile.exposedToolNames) ? [...profile.exposedToolNames] : [],
      scopeMode: profile.scopeMode || 'off',
      serverFixedScopeBound: profile.scopeConfigured === true,
      serverFixedScopeValuesReturned: false,
      modelOverridesRejected: true,
      localFallbackAllowed: false,
      durableWriteAllowed: false,
      prepareMemoryContextExposure: profile.prepareMemoryContextExposure === true,
      runtimeInvocationAllowed: profile.runtimeInvocationAllowed === true,
      runtimeInvocationStatus: profile.runtimeInvocationStatus || 'not_bound'
    }
  };
}

function buildChatGptWebProfileErrorData(reasonCode) {
  const code = typeof reasonCode === 'string' && reasonCode
    ? reasonCode
    : 'chatgpt_web_profile_rejected';
  return {
    code,
    status: 'rejected',
    lowDisclosure: true,
    rawScopeValueReturned: false,
    rawIdentityValueReturned: false
  };
}

module.exports = {
  CHATGPT_WEB_SCHEMA_HIDDEN_FIELD_NAMES,
  CHATGPT_WEB_TRUSTED_SCOPE_FIELD_NAMES,
  buildChatGptWebProfileErrorData,
  buildChatGptWebTrustedExecutionContext,
  findChatGptWebModelOverrideInParams,
  projectChatGptWebGovernedMetadata,
  projectChatGptWebOutputValue,
  projectChatGptWebSchema,
  projectChatGptWebToolDefinition
};
