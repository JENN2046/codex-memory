# Phase E Standard Suite Expansion 08

更新时间：2026-05-05

## 本轮新增

- 标准 active-memory suite 新增 `TopicMemo GetTopicContent` 的 `agentId + topicId` alias 成功样本：
  - case：`topicmemo-gettopiccontent-mika-agentid-alias`
  - input：`benchmarks/active-memory-suite/inputs/topicmemo-gettopiccontent-mika-agentid-alias.json`
  - legacy：`benchmarks/active-memory-suite/legacy/standard-legacy-runner.js`
- compare / rollback harness 的标准 suite 计数断言已同步到 `36` 个 case。

## 这轮补的 donor 边界

这条样本收的是 `TopicMemo` 内容取回路径上的多 agent alias 组合：

- `maid` 使用别名：`Mi`
- `agentId` 指向真实 agent：`maid-mika`
- `topicId` 使用 camelCase alias
- `command` 显式为 `GetTopicContent`

目标是确认 `ListTopics` 已覆盖的 `agentId` alias，不只在列表路径成立，也在具体话题内容取回路径稳定成立。

## 当前基线

- `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match`
  - `matchedCaseCount = 36`
  - `extendedMismatchCountTotal = 0`
- `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready`
  - `readyCaseCount = 36`
  - `extendedMismatchCountTotal = 0`
- `node --test .\tests\compare-vcp-active-memory-cli.test.js`
  - `14/14`
- `node --test .\tests\rollback-active-memory-cli.test.js`
  - `11/11`
- `npm run gate:mainline`
  - `status: ok`
  - health `200`
  - compare `36/36 matched`
  - rollback `36/36 rollback-ready`

## 未执行

- `npm test`
- `npm run gate:mainline:strict`

未执行原因：本轮没有触达运行时代码，已用标准 suite compare / rollback、harness 定向回归和日常主线 gate 覆盖主要风险；全量与 strict gate 留给更广运行时改动。

## 结果

标准 suite 当前已扩到 `36` 个 case。

本轮不改运行时代码，只把已经存在的 TopicMemo alias 行为推进到仓库标准 suite、compare harness、rollback harness 和日常主线 gate 里。
