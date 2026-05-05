# Phase E / P1 TopicMemo GetTopicContent agent-not-found suite closure

## 背景

`TopicMemo` 的 `agent-not-found` 之前已经有一条标准 suite case，但那条 case 走的是 `ListTopics` 路径。

`GetTopicContent` 路径上的 `agent-not-found` 虽然已经有 CLI 单测覆盖，还没有真正进入标准 active-memory suite 和 compare / rollback 门禁。

## 这次收口

- `benchmarks/active-memory-suite/inputs/topicmemo-agent-not-found-gettopiccontent.json`
  - 新增 `GetTopicContent` 的 `agent-not-found` 输入样例
- `benchmarks/active-memory-suite/standard-suite.json`
  - 新增 `topicmemo-agent-not-found-gettopiccontent`
- `benchmarks/active-memory-suite/legacy/standard-legacy-runner.js`
  - 当输入里显式带有 `topic_id/topicId` 时，legacy runner 现在会先推断为 `GetTopicContent`
- `tests/compare-vcp-active-memory-cli.test.js`
  - 更新标准 suite 总数和相关过滤计数，覆盖新的 `TopicMemo` error case
- `tests/rollback-active-memory-cli.test.js`
  - 更新 rollback readiness 对应计数，覆盖新的 `TopicMemo` error case

## 验证

- `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match`
  - `matchedCaseCount=35`
  - `extendedMismatchCountTotal=0`
- `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready`
  - `readyCaseCount=35`
  - `extendedMismatchCountTotal=0`
- `node --test .\tests\compare-vcp-active-memory-cli.test.js`
  - `14/14`
- `node --test .\tests\rollback-active-memory-cli.test.js`
  - `11/11`

## 结果

- `TopicMemo GetTopicContent -> agent-not-found` 现在也已经进入标准 suite 和 compare / rollback 门禁
- legacy 对照脚本与当前 CLI 的命令推断路径重新对齐，不再把这条 case 误判成 `ListTopics`
- 这次收口只扩大了标准集和对照门禁，没有改动生产运行态逻辑
