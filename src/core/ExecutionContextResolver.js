class ExecutionContextResolver {
  constructor(config) {
    this.config = config;
  }

  resolve(requestContext = {}) {
    const inlineContext = requestContext.executionContext && typeof requestContext.executionContext === 'object'
      ? requestContext.executionContext
      : null;

    const context = inlineContext || {};
    return {
      agentAlias: this.normalizeString(context.agentAlias) || null,
      agentId: this.normalizeString(context.agentId) || this.config.defaultAgentId,
      requestSource: this.normalizeString(context.requestSource) || this.config.defaultRequestSource,
      userId: this.firstNormalizedString(context.userId, context.user_id) || null,
      projectId: this.firstNormalizedString(context.projectId, context.project_id) || null,
      scopeId: this.firstNormalizedString(context.scopeId, context.scope_id) || null,
      workspaceId: this.firstNormalizedString(context.workspaceId, context.workspace_id) || null,
      clientId: this.firstNormalizedString(context.clientId, context.client_id) || null,
      taskId: this.firstNormalizedString(context.taskId, context.task_id) || null,
      conversationId: this.firstNormalizedString(context.conversationId, context.conversation_id) || null,
      folder: this.normalizeString(context.folder) || null,
      visibility: this.firstNormalizedString(context.visibility, context.visibility_policy) || null,
      retentionPolicy: this.firstNormalizedString(context.retentionPolicy, context.retention_policy) || null
    };
  }

  isWritableByCodex(executionContext) {
    return this.normalizeString(executionContext.agentAlias) === this.config.allowedAgentAlias;
  }

  normalizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  firstNormalizedString(...values) {
    for (const value of values) {
      const normalized = this.normalizeString(value);
      if (normalized) {
        return normalized;
      }
    }
    return '';
  }
}

module.exports = {
  ExecutionContextResolver
};
