class ActiveRecallService {
  constructor({ chatHistoryIndexStore }) {
    this.chatHistoryIndexStore = chatHistoryIndexStore;
  }

  async ensureIndexed({ allowAutoBackfill = true } = {}) {
    const health = await this.chatHistoryIndexStore.getHealth();
    if (!allowAutoBackfill) {
      return health;
    }

    const rootPath = this.chatHistoryIndexStore.config.activeMemoryRootPath || health.importedFrom || '';
    if (!rootPath) {
      return health;
    }

    await this.chatHistoryIndexStore.syncFromVchat({
      rootPath,
      force: health.status === 'empty'
    });
    return this.chatHistoryIndexStore.getHealth();
  }

  async rebuildFromVchat({ rootPath } = {}) {
    return this.chatHistoryIndexStore.rebuildFromVchat(rootPath);
  }

  async syncFromVchat({ rootPath, force = false } = {}) {
    return this.chatHistoryIndexStore.syncFromVchat({
      rootPath,
      force
    });
  }

  async search({
    query,
    limit = 5,
    maidName = '',
    agentId = '',
    topicId = '',
    currentTopicId = '',
    windowSize = 3,
    includeContent = true,
    excludeLatestTopic = true,
    allowAutoBackfill = true,
    blockedKeywords = []
  } = {}) {
    await this.ensureIndexed({ allowAutoBackfill });
    const agent = await this.chatHistoryIndexStore.getAgent({ maidName, agentId });
    if (!agent) {
      return {
        results: [],
        agent: null,
        agentStatus: 'agent-not-found',
        adapterStatus: 'phase-c-active-recall'
      };
    }

    const results = await this.chatHistoryIndexStore.search({
      query,
      limit,
      maidName,
      agentId,
      topicId,
      currentTopicId,
      windowSize,
      includeContent,
      excludeLatestTopic,
      blockedKeywords
    });

    return {
      results,
      agent,
      agentStatus: 'ready',
      adapterStatus: 'phase-c-active-recall'
    };
  }

  async listTopics({ maidName = '', agentId = '', allowAutoBackfill = true } = {}) {
    await this.ensureIndexed({ allowAutoBackfill });
    const agent = await this.chatHistoryIndexStore.getAgent({ maidName, agentId });
    if (!agent) {
      return {
        topics: [],
        agent: null,
        agentStatus: 'agent-not-found',
        adapterStatus: 'phase-c-active-recall'
      };
    }

    const topics = await this.chatHistoryIndexStore.listTopics({ maidName, agentId });
    return {
      topics,
      agent,
      agentStatus: 'ready',
      adapterStatus: 'phase-c-active-recall'
    };
  }

  async getTopicContent({ topicId, maidName = '', agentId = '', includeMessages = true, allowAutoBackfill = true } = {}) {
    await this.ensureIndexed({ allowAutoBackfill });
    const inspection = await this.chatHistoryIndexStore.inspectTopic({
      topicId,
      maidName,
      agentId,
      includeMessages
    });

    return {
      agent: inspection.agent,
      topic: inspection.topic,
      topicStatus: inspection.topicStatus,
      errorMessage: inspection.errorMessage || null,
      adapterStatus: 'phase-c-active-recall'
    };
  }
}

module.exports = {
  ActiveRecallService
};
