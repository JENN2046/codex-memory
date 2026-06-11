'use strict';

const {
  summarizeRecordMemoryPrincipalScopeAuthorizationPreflight
} = require('./RecordMemoryPrincipalScopeAuthorizationPreflight');

const RECORD_MEMORY_PRINCIPAL_SCOPE_AUTHORIZATION_MODES = Object.freeze([
  'off',
  'observe',
  'strict'
]);

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map(item => normalizeString(item)).filter(Boolean))];
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  return [...new Set(value
    .split(/[,|，]/)
    .map(item => item.trim())
    .filter(Boolean))];
}

function normalizeMode(value) {
  const normalized = normalizeString(value).toLowerCase();
  return RECORD_MEMORY_PRINCIPAL_SCOPE_AUTHORIZATION_MODES.includes(normalized)
    ? normalized
    : 'off';
}

function normalizeRecordMemoryPrincipalScopeAuthorizationConfig(input = {}) {
  const source = isPlainObject(input) ? input : {};
  const requestedMode = normalizeMode(source.mode);
  const policySource = isPlainObject(source.policy) ? source.policy : source;
  const policy = Object.freeze({
    allowedAgentAlias: normalizeString(policySource.allowedAgentAlias),
    allowedAgentIds: normalizeStringArray(policySource.allowedAgentIds),
    allowedRequestSources: normalizeStringArray(policySource.allowedRequestSources),
    allowedProjectIds: normalizeStringArray(policySource.allowedProjectIds),
    allowedWorkspaceIds: normalizeStringArray(policySource.allowedWorkspaceIds),
    allowedClientIds: normalizeStringArray(policySource.allowedClientIds)
  });
  const requiredPolicyPresent = Boolean(policy.allowedAgentAlias) &&
    policy.allowedAgentIds.length > 0 &&
    policy.allowedRequestSources.length > 0 &&
    policy.allowedProjectIds.length > 0 &&
    policy.allowedWorkspaceIds.length > 0 &&
    policy.allowedClientIds.length > 0;
  const mode = requestedMode === 'off' || requiredPolicyPresent !== true
    ? 'off'
    : requestedMode;

  return Object.freeze({
    mode,
    requestedMode,
    enabled: mode !== 'off',
    observeOnly: mode === 'observe',
    strictMode: mode === 'strict',
    lowDisclosureRejection: source.lowDisclosureRejection !== false,
    policy,
    requiredPolicyPresent,
    configComplete: requiredPolicyPresent,
    disabledReason: requestedMode !== 'off' && requiredPolicyPresent !== true
      ? 'incomplete_policy'
      : null,
    defaultOff: mode === 'off',
    currentRuntimeAuthorizationChanged: false,
    publicMcpExpanded: false
  });
}

function buildRecordMemoryPrincipalScopeAuthorizationRuntime(input = {}) {
  const config = normalizeRecordMemoryPrincipalScopeAuthorizationConfig(input);

  return Object.freeze({
    config,
    preflight: config.enabled
      ? summarizeRecordMemoryPrincipalScopeAuthorizationPreflight
      : null,
    policy: config.enabled ? config.policy : null,
    strictMode: config.strictMode
  });
}

module.exports = {
  RECORD_MEMORY_PRINCIPAL_SCOPE_AUTHORIZATION_MODES,
  buildRecordMemoryPrincipalScopeAuthorizationRuntime,
  normalizeRecordMemoryPrincipalScopeAuthorizationConfig
};
