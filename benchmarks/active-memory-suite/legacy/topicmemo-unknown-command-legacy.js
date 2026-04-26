#!/usr/bin/env node

process.stderr.write(`${JSON.stringify({
  status: 'error',
  error: '[TopicMemo] 未知的指令: Search，支持的指令: ListTopics, GetTopicContent',
  result: null,
  meta: {
    command: 'Search',
    maid: 'Keke',
    topicId: '',
    toolName: 'TopicMemo',
    tool_name: 'TopicMemo',
    code: 'unknown-command'
  }
})}\n`);
process.exit(1);
