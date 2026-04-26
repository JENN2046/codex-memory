#!/usr/bin/env node

process.stderr.write(`${JSON.stringify({
  status: 'error',
  error: '[DeepMemo] 关键词均被屏蔽，无有效搜索词。',
  result: null,
  meta: {
    toolName: 'DeepMemo',
    tool_name: 'DeepMemo',
    code: 'all-keywords-blocked',
    command: 'Search',
    maid: 'Keke',
    maidName: 'Keke',
    keyword: 'DeepMemo TopicMemo recall audit',
    rawKeyword: 'DeepMemo TopicMemo recall audit',
    raw_keyword: 'DeepMemo TopicMemo recall audit',
    query: 'DeepMemo TopicMemo recall audit',
    rawQuery: 'DeepMemo TopicMemo recall audit',
    raw_query: 'DeepMemo TopicMemo recall audit',
    blockedKeywords: ['deepmemo', 'topicmemo', 'recall', 'audit'],
    blockedKeywordCount: 4,
    blocked_keyword_count: 4,
    effectiveKeywords: [],
    effectiveKeywordCount: 0,
    effective_keyword_count: 0,
    effectiveKeywordText: '',
    effective_keyword_text: ''
  }
})}\n`);
process.exit(1);
