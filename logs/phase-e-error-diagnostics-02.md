# Phase E / P1 TopicMemo empty-history and history-read-error

## 背景

`TopicMemo` 的错误语义已经覆盖了 `agent-not-found`、`topic-not-found` 和 `missing-history`，但 `empty-history` 与 `history-read-error` 还没有稳定的回归。

## 这次收口

- `src/cli/topicmemo.js`
  - 保持 `historyStatus` 写入错误 meta 的路径不变
- `tests/vcp-active-memory-cli.test.js`
  - 新增 `empty-history` 成功态回归
  - 新增 `history-read-error` 错误态回归

## 验证

- `node --test .\tests\vcp-active-memory-cli.test.js`
  - `9/9`

## 结果

- `empty-history` 在 `--full` 下会稳定暴露 `meta.historyStatus`
- `history-read-error` 会稳定暴露 `meta.historyStatus`
- `TopicMemo` 的错误语义收口继续向 donor 手感靠近，但顶层错误包络保持不变
