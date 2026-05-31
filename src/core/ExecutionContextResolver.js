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
      userId: this.normalizeString(context.userId || context.user_id) || null,
      projectId: this.normalizeString(context.projectId || context.project_id) || null,
      workspaceId: this.normalizeString(context.workspaceId || context.workspace_id) || null,
      clientId: this.normalizeString(context.clientId || context.client_id) || null,
      taskId: this.normalizeString(context.taskId || context.task_id) || null,
      conversationId: this.normalizeString(context.conversationId || context.conversation_id) || null,
      folder: this.normalizeString(context.folder) || null,
      visibility: this.normalizeString(context.visibility) || null,
      retentionPolicy: this.normalizeString(context.retentionPolicy || context.retention_policy) || null
    };
  }

  isWritableByCodex(executionContext) {
    return this.normalizeString(executionContext.agentAlias) === this.config.allowedAgentAlias;
  }

  normalizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
  }
}

module.exports = {
  ExecutionContextResolver
};
