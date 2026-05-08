#!/usr/bin/env node
process.stderr.write(`${JSON.stringify({
  status: 'error',
  error: "[TopicMemo] 请求中缺少 'maid' 参数。",
  result: null,
  meta: {
    command: 'GetTopicContent',
    maid: '',
    topicId: '测试话题',
    toolName: 'TopicMemo',
    tool_name: 'TopicMemo',
    code: 'missing-maid'
  }
})}\n`);
process.exit(1);
