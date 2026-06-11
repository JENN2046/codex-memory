'use strict';

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
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

function maybeSet(output, key, value) {
  const normalized = normalizeString(value);
  if (normalized) {
    output[key] = normalized;
  }
}

function buildRecordMemoryTrustedExecutionContext({
  config = {},
  baseRequestContext = {},
  env = process.env
} = {}) {
  const base = isPlainObject(baseRequestContext.executionContext)
    ? baseRequestContext.executionContext
    : {};
  const context = {
    agentAlias: firstNonEmptyString(
      env.CODEX_MEMORY_AGENT_ALIAS,
      base.agentAlias,
      config.allowedAgentAlias,
      'Codex'
    ),
    agentId: firstNonEmptyString(
      env.CODEX_MEMORY_AGENT_ID,
      base.agentId,
      base.agent_id,
      config.defaultAgentId
    ),
    requestSource: firstNonEmptyString(
      env.CODEX_MEMORY_REQUEST_SOURCE,
      base.requestSource,
      base.request_source,
      config.defaultRequestSource
    )
  };

  maybeSet(context, 'projectId', firstNonEmptyString(
    env.CODEX_MEMORY_PROJECT_ID,
    base.projectId,
    base.project_id,
    config.defaultProjectId
  ));
  maybeSet(context, 'workspaceId', firstNonEmptyString(
    env.CODEX_MEMORY_WORKSPACE_ID,
    base.workspaceId,
    base.workspace_id,
    config.defaultWorkspaceId
  ));
  maybeSet(context, 'clientId', firstNonEmptyString(
    env.CODEX_MEMORY_CLIENT_ID,
    base.clientId,
    base.client_id,
    config.defaultClientId
  ));

  return context;
}

module.exports = {
  buildRecordMemoryTrustedExecutionContext
};
