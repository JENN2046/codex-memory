# Phase E / P1 TopicMemo topic_id routing

## 背景

`TopicMemo` 的错误语义诊断已经开始收口，但之前 `topic_id` 在未显式写 `command` 时，路由还没有稳定推断成 `GetTopicContent`。

## 这次收口

- `src/adapters/vcp-active-memory/index.js`
  - `execute()` 现在会把 `topicId/topic_id/TopicId` 识别成 `GetTopicContent`
- `src/cli/topicmemo.js`
  - `meta` 诊断继续沿用 `command / maid / topicId`
- `tests/vcp-active-memory-cli.test.js`
  - `topic-not-found`
  - `missing-history`
  - `agent-not-found`

## 验证

- `node --test .\tests\vcp-active-memory-cli.test.js`
  - `7/7`

## 结果

`TopicMemo` 现在在 `topic_id` 入口上的默认行为与错误诊断更一致了：

- 无显式 `command` 且提供 `topic_id` 时，会按 `GetTopicContent` 处理
- `topic-not-found` / `missing-history` 现在可以稳定落到对应错误 meta
- 现有 `ListTopics` 默认分支保持不变
