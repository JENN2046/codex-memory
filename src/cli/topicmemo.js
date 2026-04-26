#!/usr/bin/env node
const { runActiveMemoryCli } = require('./active-memory-cli-common');

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && !value.trim()) continue;
    return value;
  }
  return undefined;
}

function inferTopicMemoCommand(parsedInput = {}) {
  const explicit = firstNonEmpty(parsedInput?.command, parsedInput?.Command, '');
  if (typeof explicit === 'string' && explicit.trim()) {
    return explicit.trim();
  }

  const hasTopicId = !!firstNonEmpty(parsedInput?.topicId, parsedInput?.topic_id, parsedInput?.TopicId, '');
  const hasKeyword = !!firstNonEmpty(parsedInput?.keyword, parsedInput?.query, '');
  if (hasTopicId) return 'GetTopicContent';
  if (!hasKeyword) return 'ListTopics';
  return 'Search';
}

function buildTopicMemoErrorMeta({ options, rawInput, parsedInput, error, parseFailed }) {
  if (parseFailed) {
    return {
      inputSource: options?.inputFile ? 'file' : 'stdin',
      rawInputPreview: String(rawInput || '').trim().replace(/\s+/g, ' ').slice(0, 120)
    };
  }

  const command = inferTopicMemoCommand(parsedInput);
  const maid = firstNonEmpty(parsedInput?.maid, parsedInput?.maidName, '');
  const agentId = firstNonEmpty(parsedInput?.agentId, null);
  const topicId = firstNonEmpty(parsedInput?.topicId, parsedInput?.topic_id, parsedInput?.TopicId, '');
  const meta = {
    command,
    maid: typeof maid === 'string' ? maid : '',
    agentId,
    topicId: typeof topicId === 'string' ? topicId : ''
  };

  if (['topic-not-found', 'missing-history', 'history-read-error'].includes(String(error?.code || ''))) {
    meta.historyStatus = String(error.code);
  }

  return meta;
}

runActiveMemoryCli({
  toolName: 'TopicMemo',
  argv: process.argv.slice(2),
  execute: async (app, input) => app.adapters.vcpActiveMemoryAdapter.execute(input),
  buildErrorMeta: buildTopicMemoErrorMeta
});
