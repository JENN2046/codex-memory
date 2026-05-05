# Phase E / P1-3 Error Semantics Suite Expansion 09

更新时间：2026-05-05

## 本轮新增

- 标准 active-memory suite 新增 `TopicMemo GetTopicContent topicId alias` 错误样本：
  - case：`topicmemo-gettopiccontent-missing-topic-topicid-alias`
  - input：`benchmarks/active-memory-suite/inputs/topicmemo-gettopiccontent-missing-topic-topicid-alias.json`
  - legacy：`benchmarks/active-memory-suite/legacy/standard-legacy-runner.js`
- compare / rollback harness 的标准 suite 计数断言已同步到 `37` 个 case。

## 这轮补的 donor 边界

这条样本收的是 `TopicMemo` 内容取回错误路径上的 alias 组合：

- 输入只提供 camelCase `topicId`
- 不显式提供 `command`
- 当前实现需要自动推断为 `GetTopicContent`
- 错误输出需要继续稳定对齐 donor 风格字段：
  - `code=topic-not-found`
  - `toolName=TopicMemo`
  - `tool_name=TopicMemo`
  - `command=GetTopicContent`
  - `topicId=topic_unknown`
  - `historyStatus=topic-not-found`
  - `error` 文案一致

## 当前基线

- `node --test .\tests\compare-vcp-active-memory-cli.test.js`
  - `14/14`
- `node --test .\tests\rollback-active-memory-cli.test.js`
  - `11/11`
- `npm test`
  - `123/123`
- `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match`
  - `matchedCaseCount = 37`
  - `extendedMismatchCountTotal = 0`
- `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready`
  - `readyCaseCount = 37`
  - `extendedMismatchCountTotal = 0`
- `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category topic-state --json --require-match`
  - `matchedCaseCount = 5`
  - `extendedMismatchCountTotal = 0`
- `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category topic-state --json --require-ready`
  - `readyCaseCount = 5`
  - `extendedMismatchCountTotal = 0`
- `npm run gate:mainline`
  - `status: ok`
  - health `200`
  - compare `37/37 matched`
  - rollback `37/37 rollback-ready`
- `git diff --check`
  - passed

## 未执行

- `npm run gate:mainline:strict`

未执行原因：本轮没有改运行时代码，只把已有 `TopicMemo` 错误语义推进到标准 suite 和 harness 计数断言；已用全量 `npm test`、compare / rollback 全量与分类基线、日常主线 gate 覆盖主要风险，strict gate 留给更广运行时或 MCP 契约改动。

## 结果

标准 suite 当前已扩到 `37` 个 case。

P1-3 现在多了一条 `topicId` alias 错误路径守门样本，能持续证明 `code / error / toolName / tool_name / command / topicId / historyStatus` 在 `topic-not-found` 路径上仍与 legacy 对照匹配。
