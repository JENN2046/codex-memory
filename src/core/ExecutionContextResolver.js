class ExecutionContextResolver {
  constructor(config) {
    this.config = config;
  }

  resolve(requestContext = {}, payload = {}) {
    const inlineContext = requestContext.executionContext && typeof requestContext.executionContext === 'object'
      ? requestContext.executionContext
      : null;
    const payloadContext = payload.__executionContext && typeof payload.__executionContext === 'object'
      ? payload.__executionContext
      : null;

    const context = inlineContext || payloadContext || {};
    return {
      agentAlias: this.normalizeString(context.agentAlias) || null,
      agentId: this.normalizeString(context.agentId) || this.config.defaultAgentId,
      requestSource: this.normalizeString(context.requestSource) || this.config.defaultRequestSource
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
